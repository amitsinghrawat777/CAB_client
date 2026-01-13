import React, { useState, useEffect, useRef } from "react";
import "./OnlineGame.css";

// LocalStorage key for game state
const GAME_STATE_KEY = "protocol4_gameState";

function OnlineGame({ socket, gameData, onBack }) {
  const { roomCode, role, gameMode, timeLimit } = gameData;
  
  // Load saved state from localStorage
  const getSavedState = () => {
    try {
      const saved = localStorage.getItem(GAME_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if it's for the same room
        if (parsed.roomCode === roomCode) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error loading saved state:", e);
    }
    return null;
  };

  const savedState = getSavedState();
  
  // Game phases: setup | playing | gameover
  const [phase, setPhase] = useState(savedState?.phase || "setup");
  
  // Secret code
  const [secret, setSecret] = useState(savedState?.secret || "");
  const [secretLocked, setSecretLocked] = useState(savedState?.secretLocked || false);
  const [opponentReady, setOpponentReady] = useState(savedState?.opponentReady || false);
  
  // Guessing
  const [guess, setGuess] = useState("");
  const [attackLog, setAttackLog] = useState(savedState?.attackLog || []);
  const [defenseLog, setDefenseLog] = useState(savedState?.defenseLog || []);
  
  // Timer (for Blitz mode)
  const [timeLeft, setTimeLeft] = useState(savedState?.timeLeft || timeLimit || 300);
  
  // Chat
  const [chatMessages, setChatMessages] = useState(savedState?.chatMessages || []);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatRef = useRef(null);
  
  // Game result
  const [gameResult, setGameResult] = useState(savedState?.gameResult || null);

  // Save state to localStorage whenever important state changes
  useEffect(() => {
    const stateToSave = {
      roomCode,
      phase,
      secret,
      secretLocked,
      opponentReady,
      attackLog,
      defenseLog,
      timeLeft,
      chatMessages,
      gameResult,
    };
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(stateToSave));
  }, [roomCode, phase, secret, secretLocked, opponentReady, attackLog, defenseLog, timeLeft, chatMessages, gameResult]);

  // Rejoin room on reconnect
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log("Reconnected, rejoining room...");
      // Rejoin the room with saved state
      socket.emit("rejoin_room", {
        roomCode,
        role,
        secret: secretLocked ? secret : null,
        phase,
      });
    };

    // If already connected and we have saved state, rejoin
    if (socket.connected && savedState) {
      handleConnect();
    }

    socket.on("connect", handleConnect);

    // Handle rejoin response
    socket.on("rejoin_success", (data) => {
      console.log("Rejoin successful:", data);
      if (data.phase) setPhase(data.phase);
      if (data.opponentReady !== undefined) setOpponentReady(data.opponentReady);
      if (data.timeRemaining !== undefined) setTimeLeft(data.timeRemaining);
    });

    socket.on("rejoin_failed", (data) => {
      console.error("Rejoin failed:", data.error);
      // Clear saved state and go back to menu
      localStorage.removeItem(GAME_STATE_KEY);
      alert("Failed to rejoin game: " + data.error);
      onBack();
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("rejoin_success");
      socket.off("rejoin_failed");
    };
  }, [socket, roomCode, role, secret, secretLocked, phase, savedState, onBack]);

  useEffect(() => {
    if (!socket) return;

    socket.on("opponent_ready", () => {
      setOpponentReady(true);
    });

    socket.on("game_phase", (data) => {
      console.log("Game phase changed:", data.phase);
      if (data.phase === "playing") {
        setPhase("playing");
      }
    });

    socket.on("guess_result", (data) => {
      setAttackLog((prev) => [data, ...prev]);
    });

    socket.on("opponent_guessed", (data) => {
      setDefenseLog((prev) => [data, ...prev]);
    });

    socket.on("timer_update", (data) => {
      setTimeLeft(data.timeRemaining);
    });

    socket.on("game_over", (data) => {
      setPhase("gameover");
      // Compute opponent's code based on our role
      const opponentCode = role === "Player 1" ? data.p2Secret : data.p1Secret;
      setGameResult({
        ...data,
        opponentCode,
        isWinner: data.winner === role
      });
      // Clear saved state on game over
      localStorage.removeItem(GAME_STATE_KEY);
    });

    socket.on("chat_message", (data) => {
      setChatMessages((prev) => [...prev, data]);
    });

    // Opponent temporarily disconnected - may reconnect
    socket.on("opponent_disconnected_temp", () => {
      setChatMessages((prev) => [
        ...prev,
        { sender: "SYSTEM", message: "⚠️ Opponent disconnected. Waiting 30s for reconnection..." }
      ]);
    });

    // Opponent reconnected
    socket.on("opponent_reconnected", () => {
      setChatMessages((prev) => [
        ...prev,
        { sender: "SYSTEM", message: "✅ Opponent reconnected!" }
      ]);
    });

    // Opponent permanently disconnected
    socket.on("opponent_disconnected", () => {
      setGameResult({
        winner: role,
        reason: "disconnect",
        opponentCode: "????",
        winningGuess: null
      });
      setPhase("gameover");
      localStorage.removeItem(GAME_STATE_KEY);
    });

    // Opponent left intentionally
    socket.on("opponent_left", () => {
      setGameResult({
        winner: role,
        reason: "disconnect",
        opponentCode: "????",
        winningGuess: null
      });
      setPhase("gameover");
      localStorage.removeItem(GAME_STATE_KEY);
    });

    return () => {
      socket.off("opponent_ready");
      socket.off("game_phase");
      socket.off("guess_result");
      socket.off("opponent_guessed");
      socket.off("timer_update");
      socket.off("game_over");
      socket.off("chat_message");
      socket.off("opponent_disconnected_temp");
      socket.off("opponent_reconnected");
      socket.off("opponent_disconnected");
      socket.off("opponent_left");
    };
  }, [socket, role]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Validate code: 4 unique digits
  const validateCode = (code) => {
    if (!/^\d{4}$/.test(code)) return { valid: false, error: "Must be exactly 4 digits" };
    const unique = new Set(code.split(""));
    if (unique.size !== 4) return { valid: false, error: "All digits must be unique" };
    return { valid: true };
  };

  const lockSecret = () => {
    const validation = validateCode(secret);
    if (!validation.valid) return alert(validation.error);
    
    console.log("Locking secret:", secret, "for room:", roomCode, "role:", role);
    socket.emit("set_secret", { roomCode, code: secret, role });
    setSecretLocked(true);
  };

  const sendGuess = () => {
    const validation = validateCode(guess);
    if (!validation.valid) return alert(validation.error);
    
    socket.emit("send_guess", { roomCode, guess, role });
    setGuess("");
  };

  const sendChat = () => {
    if (chatInput.trim() === "") return;
    socket.emit("chat_message", { roomCode, message: chatInput, sender: role });
    setChatInput("");
  };

  const requestRematch = () => {
    socket.emit("rematch_request", { room: roomCode });
    setGameResult((prev) => ({ ...prev, rematchRequested: true }));
  };

  const exitGame = () => {
    if (window.confirm("Are you sure you want to exit? This will forfeit the game.")) {
      socket.emit("leave_room", { roomCode });
      localStorage.removeItem(GAME_STATE_KEY);
      onBack();
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ==================== SETUP PHASE ====================
  if (phase === "setup") {
    return (
      <div className="online-game setup-phase">
        <div className="game-header">
          <div className="header-left">
            <button className="exit-game-btn" onClick={exitGame} title="Exit Game">
              ✕
            </button>
            <span className="room-badge">ROOM: {roomCode}</span>
            <span className="mode-badge">{gameMode.toUpperCase()}</span>
          </div>
          <div className="header-right">
            <span className="role-badge" data-role={role}>{role.toUpperCase()}</span>
          </div>
        </div>

        <div className="setup-container">
          <h2 className="setup-title">&gt; SET YOUR SECRET CODE_</h2>
          
          {!secretLocked ? (
            <div className="secret-input-section">
              <div className="digit-inputs">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="digit-input"
                    value={secret[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d?$/.test(val)) {
                        const newSecret = secret.split("");
                        newSecret[i] = val;
                        setSecret(newSecret.join(""));
                        if (val && i < 3) {
                          const next = e.target.nextElementSibling;
                          if (next) next.focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !secret[i] && i > 0) {
                        const prev = e.target.previousElementSibling;
                        if (prev) prev.focus();
                      }
                      if (e.key === "Enter" && secret.length === 4) {
                        lockSecret();
                      }
                    }}
                  />
                ))}
              </div>
              <button className="lock-btn" onClick={lockSecret} disabled={secret.length !== 4}>
                🔒 LOCK CODE
              </button>
            </div>
          ) : (
            <div className="code-locked">
              <div className="locked-display">
                {secret.split("").map((d, i) => (
                  <span key={i} className="locked-digit">{d}</span>
                ))}
              </div>
              <span className="locked-label">✓ CODE LOCKED</span>
            </div>
          )}

          <div className="opponent-status">
            {opponentReady ? (
              <span className="ready">✓ OPPONENT READY</span>
            ) : (
              <span className="waiting">
                <span className="dot-loader"></span>
                WAITING FOR OPPONENT...
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== GAME OVER PHASE ====================
  if (phase === "gameover" && gameResult) {
    const isWinner = gameResult.winner === role;
    
    return (
      <div className="online-game gameover-phase">
        <div className={`result-container ${isWinner ? "winner" : "loser"}`}>
          <div className="result-icon">
            {gameResult.reason === "disconnect" ? "⚡" : isWinner ? "🏆" : "💀"}
          </div>
          <h1 className="result-title">
            {gameResult.reason === "disconnect" 
              ? "OPPONENT DISCONNECTED" 
              : isWinner 
                ? "CODE CRACKED!" 
                : "COMPROMISED!"}
          </h1>
          <p className="result-subtitle">
            {gameResult.reason === "disconnect"
              ? "Victory by default"
              : isWinner
                ? "You broke their encryption"
                : "Your code was decrypted"}
          </p>

          <div className="result-details">
            <div className="detail-row">
              <span className="detail-label">YOUR CODE:</span>
              <span className="detail-value">{secret}</span>
            </div>
            <div className="detail-row opponent-code">
              <span className="detail-label">OPPONENT CODE:</span>
              <span className="detail-value">{gameResult.opponentCode || "????"}</span>
            </div>
            {gameResult.winningGuess && (
              <div className="detail-row">
                <span className="detail-label">WINNING GUESS:</span>
                <span className="detail-value highlight">{gameResult.winningGuess}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">YOUR ATTEMPTS:</span>
              <span className="detail-value">{attackLog.length}</span>
            </div>
          </div>

          <div className="result-actions">
            {gameResult.rematchRequested ? (
              <span className="rematch-waiting">Waiting for opponent...</span>
            ) : (
              <button className="rematch-btn" onClick={requestRematch}>
                ⚡ REMATCH
              </button>
            )}
            <button className="exit-btn" onClick={onBack}>
              EXIT TO MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== PLAYING PHASE ====================
  return (
    <div className="online-game playing-phase">
      {/* Header */}
      <div className="game-header">
        <div className="header-left">
          <button className="exit-game-btn" onClick={exitGame} title="Exit Game">
            ✕
          </button>
          <span className="room-badge">ROOM: {roomCode}</span>
          {gameMode === "blitz" && (
            <span className={`timer ${timeLeft < 60 ? "warning" : ""}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
        </div>
        <div className="header-center">
          <span className="my-secret">
            MY CODE: <span className="secret-digits">{secret}</span>
          </span>
        </div>
        <div className="header-right">
          <span className="role-badge" data-role={role}>{role.toUpperCase()}</span>
          <button 
            className={`chat-toggle ${chatOpen ? "active" : ""}`}
            onClick={() => setChatOpen(!chatOpen)}
          >
            💬 {chatMessages.length > 0 && <span className="chat-badge">{chatMessages.length}</span>}
          </button>
        </div>
      </div>

      {/* Main game area */}
      <div className="game-area">
        {/* Notebook */}
        <div className="notebook">
          {/* Defense Column */}
          <div className="column defense">
            <div className="column-header">
              <h3>🛡️ DEFENSE</h3>
              <span className="column-desc">Opponent's attacks on your code</span>
            </div>
            <div className="log-container">
              {defenseLog.length === 0 ? (
                <div className="empty-log">No attacks yet...</div>
              ) : (
                defenseLog.map((log, i) => (
                  <div key={i} className="log-entry defense-entry">
                    <span className="entry-num">#{defenseLog.length - i}</span>
                    <span className="entry-code">{log.guess}</span>
                    <div className="entry-score">
                      <span className="found">+{log.found}</span>
                      <span className="locked">-{log.locked}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="notebook-divider">
            <div className="divider-line"></div>
          </div>

          {/* Attack Column */}
          <div className="column attack">
            <div className="column-header">
              <h3>⚔️ ATTACK</h3>
              <span className="column-desc">Your attempts on opponent's code</span>
            </div>
            
            <div className="guess-input-area">
              <div className="guess-inputs">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="guess-input"
                    value={guess[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d?$/.test(val)) {
                        const newGuess = guess.split("");
                        newGuess[i] = val;
                        setGuess(newGuess.join(""));
                        if (val && i < 3) {
                          const next = e.target.nextElementSibling;
                          if (next) next.focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !guess[i] && i > 0) {
                        const prev = e.target.previousElementSibling;
                        if (prev) prev.focus();
                      }
                      if (e.key === "Enter" && guess.length === 4) {
                        sendGuess();
                      }
                    }}
                  />
                ))}
              </div>
              <button className="guess-btn" onClick={sendGuess} disabled={guess.length !== 4}>
                DECODE →
              </button>
            </div>

            <div className="log-container">
              {attackLog.length === 0 ? (
                <div className="empty-log">Make your first guess!</div>
              ) : (
                attackLog.map((log, i) => (
                  <div key={i} className="log-entry attack-entry">
                    <span className="entry-num">#{attackLog.length - i}</span>
                    <span className="entry-code">{log.guess}</span>
                    <div className="entry-score">
                      <span className="found">+{log.found}</span>
                      <span className="locked">-{log.locked}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        {chatOpen && (
          <div className="chat-panel">
            <div className="chat-header">
              <span>💬 COMMS</span>
              <button className="chat-close" onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="chat-messages" ref={chatRef}>
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`chat-msg ${
                    msg.sender === "SYSTEM" 
                      ? "system" 
                      : msg.sender === role 
                        ? "mine" 
                        : "theirs"
                  }`}
                >
                  {msg.sender !== "SYSTEM" && (
                    <span className="msg-sender">{msg.sender === role ? "You" : "Opponent"}</span>
                  )}
                  <span className="msg-text">{msg.message}</span>
                </div>
              ))}
            </div>
            <div className="chat-input-area">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendChat()}
                placeholder="Type message..."
                className="chat-input"
              />
              <button className="chat-send" onClick={sendChat}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnlineGame;
