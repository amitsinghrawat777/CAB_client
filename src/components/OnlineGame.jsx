import React, { useState, useEffect, useRef } from "react";

// SessionStorage key for game state (cleared when tab is closed)
const GAME_STATE_KEY = "protocol4_gameState";

function OnlineGame({ socket, gameData, onBack }) {
  // If we somehow render without game data (e.g., storage cleared), return to menu safely
  useEffect(() => {
    if (!gameData) {
      onBack();
    }
  }, [gameData, onBack]);

  if (!gameData) {
    return null;
  }

  const { roomCode, role, gameMode, timeLimit } = gameData;

  const gameOverTimerRef = useRef(null);
  
  // Load saved state from sessionStorage
  const getSavedState = () => {
    try {
      const saved = sessionStorage.getItem(GAME_STATE_KEY);
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
  const lastSystemRef = useRef({ type: null, at: 0 });
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  const pushSystemMessage = (message) => {
    setChatMessages((prev) => [...prev, { sender: "SYSTEM", message }]);
  };

  const pushSystemMessageOnce = (type, message, cooldownMs = 4000) => {
    const now = Date.now();
    const { type: lastType, at } = lastSystemRef.current;
    if (lastType === type && now - at < cooldownMs) return;
    lastSystemRef.current = { type, at: now };
    pushSystemMessage(message);
  };

  const showToast = (message, duration = 1800) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast("");
      toastTimerRef.current = null;
    }, duration);
  };
  
  // Game result
  const [gameResult, setGameResult] = useState(savedState?.gameResult || null);

  // Save state to sessionStorage whenever important state changes
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
    sessionStorage.setItem(GAME_STATE_KEY, JSON.stringify(stateToSave));
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
      // Clear saved state and go back to menu silently
      sessionStorage.removeItem(GAME_STATE_KEY);
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
        isWinner: data.winner === role,
        rematchRequested: false,
        rematchOffer: false
      });
      // Clear saved state on game over
      sessionStorage.removeItem(GAME_STATE_KEY);
    });

    socket.on("chat_message", (data) => {
      setChatMessages((prev) => [...prev, data]);
    });

    // Opponent temporarily disconnected - may reconnect
    socket.on("opponent_disconnected_temp", () => {
      pushSystemMessageOnce("disconnect_temp", "⚠️ Opponent disconnected. Waiting 30s for reconnection...");
    });

    // Opponent reconnected
    socket.on("opponent_reconnected", () => {
      pushSystemMessageOnce("reconnected", "✅ Opponent reconnected!");
    });

    socket.on("rematch_requested", () => {
      setGameResult((prev) => ({
        ...prev,
        rematchOffer: true,
        rematchRequested: false
      }));
    });

    socket.on("rematch_accepted", () => {
      // Reset client state for new match
      setPhase("setup");
      setSecret("");
      setSecretLocked(false);
      setOpponentReady(false);
      setAttackLog([]);
      setDefenseLog([]);
      setGuess("");
      setChatMessages([]);
      setChatOpen(false);
      setGameResult(null);
      setTimeLeft(gameMode === "blitz" ? 300 : timeLimit || 300);
      sessionStorage.removeItem(GAME_STATE_KEY);
      clearGameOverTimer();
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
      sessionStorage.removeItem(GAME_STATE_KEY);
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
      sessionStorage.removeItem(GAME_STATE_KEY);
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
      socket.off("rematch_requested");
      socket.off("rematch_accepted");
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
    if (!validation.valid) {
      pushSystemMessage(validation.error);
      return;
    }
    
    console.log("Locking secret:", secret, "for room:", roomCode, "role:", role);
    socket.emit("set_secret", { roomCode, code: secret, role });
    setSecretLocked(true);
  };

  const sendGuess = () => {
    const validation = validateCode(guess);
    if (!validation.valid) {
      pushSystemMessage(validation.error);
      return;
    }
    
    socket.emit("send_guess", { roomCode, guess, role });
    setGuess("");
  };

  const sendChat = () => {
    if (chatInput.trim() === "") return;
    socket.emit("chat_message", { roomCode, message: chatInput, sender: role });
    setChatInput("");
  };

  const clearGameOverTimer = () => {
    if (gameOverTimerRef.current) {
      clearTimeout(gameOverTimerRef.current);
      gameOverTimerRef.current = null;
    }
  };

  const requestRematch = () => {
    clearGameOverTimer();
    socket.emit("rematch_request", { room: roomCode });
    setGameResult((prev) => ({ ...prev, rematchRequested: true, rematchOffer: false }));
  };

  const acceptRematch = () => {
    clearGameOverTimer();
    socket.emit("rematch_request", { room: roomCode });
    setGameResult((prev) => ({ ...prev, rematchRequested: true, rematchOffer: false }));
  };

  const declineRematch = () => {
    clearGameOverTimer();
    socket.emit("leave_room", { roomCode });
    sessionStorage.removeItem(GAME_STATE_KEY);
    onBack();
  };

  const exitGame = () => {
    if (window.confirm("Are you sure you want to exit? This will forfeit the game.")) {
      socket.emit("leave_room", { roomCode });
      sessionStorage.removeItem(GAME_STATE_KEY);
      onBack();
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Auto-return to menu 5s after game over unless rematch is in progress
  useEffect(() => {
    if (phase === "gameover") {
      clearGameOverTimer();
      gameOverTimerRef.current = setTimeout(() => {
        sessionStorage.removeItem(GAME_STATE_KEY);
        onBack();
      }, 5000);
    }
    return () => clearGameOverTimer();
  }, [phase, onBack]);

  // ==================== SETUP PHASE ====================
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-br-bg flex flex-col">
        <div className="flex flex-col md:flex-row md:justify-between items-center px-3 md:px-6 py-3 md:py-4 bg-black/50 border-b border-br-accent/20 gap-2 md:gap-0">
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-start">
            <button className="w-8 h-8 md:w-9 md:h-9 bg-br-hot/10 border border-br-hot/30 rounded-md text-br-hot text-lg md:text-xl font-bold cursor-pointer transition-all duration-200 hover:bg-br-hot/20 hover:border-br-hot hover:shadow-[0_0_15px_rgba(255,0,128,0.3)] hover:scale-105 flex items-center justify-center" onClick={exitGame} title="Exit Game">
              ✕
            </button>
            <span className="font-['Courier_New',monospace] text-xs md:text-sm text-white/60 px-2 md:px-3 py-1 md:py-1.5 bg-white/5 rounded">ROOM: {roomCode}</span>
            <span className="font-['Courier_New',monospace] text-xs text-br-info px-2 md:px-2.5 py-1 border border-br-info/30 rounded">{gameMode.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className={`font-['Courier_New',monospace] text-xs md:text-sm font-bold px-2 md:px-3.5 py-1 md:py-1.5 rounded border ${role === "Player 1" ? "bg-gradient-to-br from-br-accent/20 to-br-accent/10 text-br-accent border-br-accent/30" : "bg-gradient-to-br from-br-info/20 to-br-info/10 text-br-info border-br-info/30"}`}>{role.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-10 py-6 md:py-10">
          <h2 className="font-['Courier_New',monospace] text-lg md:text-2xl text-br-accent mb-6 md:mb-10 [text-shadow:0_0_20px_rgba(0,255,136,0.5)]">&gt; SET YOUR SECRET CODE_</h2>
          
          {!secretLocked ? (
            <div className="flex flex-col items-center gap-4 md:gap-6">
              <div className="flex gap-2 md:gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="w-14 h-16 md:w-20 md:h-24 bg-black/80 border-[2px] md:border-[3px] border-br-accent/60 rounded-[10px] text-br-accent font-['Courier_New',monospace] text-4xl md:text-5xl font-bold text-center outline-none transition-all duration-300 shadow-[0_0_20px_rgba(0,255,136,0.35)] [caret-color:#00ff88] leading-none p-0 focus:border-br-accent focus:bg-black/90 focus:shadow-[0_0_35px_rgba(0,255,136,0.5)] focus:scale-105"
                    value={secret[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d?$/.test(val)) {
                        if (val && secret.includes(val) && secret[i] !== val) {
                          showToast("No duplicate digits allowed");
                          return;
                        }
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
              <button className="px-6 md:px-10 py-3 md:py-4 bg-gradient-to-br from-br-accent/20 to-br-accent/10 border-2 border-br-accent rounded-lg text-br-accent font-['Courier_New',monospace] text-base md:text-lg font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-br-accent/30 hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] disabled:opacity-50 disabled:cursor-not-allowed" onClick={lockSecret} disabled={secret.length !== 4}>
                🔒 LOCK CODE
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2 md:gap-3">
                {secret.split("").map((d, i) => (
                  <span key={i} className="w-12 h-14 md:w-16 md:h-20 flex items-center justify-center bg-br-accent/10 border-2 border-br-accent rounded-lg text-br-accent font-['Courier_New',monospace] text-3xl md:text-4xl font-bold [text-shadow:0_0_10px_rgba(0,255,136,0.5)]">{d}</span>
                ))}
              </div>
              <span className="font-['Courier_New',monospace] text-sm md:text-base text-br-accent">✓ CODE LOCKED</span>
            </div>
          )}

          <div className="mt-6 md:mt-10 font-['Courier_New',monospace] text-sm md:text-base">
            {opponentReady ? (
              <span className="text-br-accent">✓ OPPONENT READY</span>
            ) : (
              <span className="text-white/50 flex items-center gap-2.5">
                <span className="flex gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:bg-white/50 before:rounded-full before:animate-[dotBlink_1.4s_ease-in-out_infinite] after:content-[''] after:w-1.5 after:h-1.5 after:bg-white/50 after:rounded-full after:animate-[dotBlink_1.4s_ease-in-out_infinite_0.2s]"></span>
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
    const showOffer = gameResult.rematchOffer;
    const waiting = gameResult.rematchRequested && !gameResult.rematchOffer;
    
    return (
      <div className="min-h-screen bg-br-bg flex flex-col justify-center items-center px-4">
        <div className={`text-center px-6 md:px-12 py-8 md:py-12 rounded-2xl max-w-[720px] w-full mx-auto ${isWinner ? "bg-gradient-to-br from-br-accent/10 to-br-accent/5 border-2 border-br-accent/30" : "bg-gradient-to-br from-br-hot/10 to-br-hot/5 border-2 border-br-hot/30"}`}>
          <div className="text-4xl md:text-6xl mb-4 md:mb-5">
            {gameResult.reason === "disconnect" ? "⚡" : isWinner ? "🏆" : "💀"}
          </div>
          <h1 className={`font-['Courier_New',monospace] text-xl md:text-3xl m-0 mb-2 md:mb-2.5 tracking-[2px] md:tracking-[3px] ${isWinner ? "text-br-accent [text-shadow:0_0_20px_rgba(0,255,136,0.5)]" : "text-br-hot [text-shadow:0_0_20px_rgba(255,0,128,0.5)]"}`}>
            {gameResult.reason === "disconnect" 
              ? "OPPONENT DISCONNECTED" 
              : isWinner 
                ? "CODE CRACKED!" 
                : "COMPROMISED!"}
          </h1>
          <p className="text-sm md:text-base text-white/60 mb-6 md:mb-8">
            {gameResult.reason === "disconnect"
              ? "Victory by default"
              : isWinner
                ? "You broke their encryption"
                : "Your code was decrypted"}
          </p>

          <div className="bg-black/30 rounded-lg p-4 md:p-5 mb-6 md:mb-8">
            <div className="flex justify-between py-2 md:py-2.5 border-b border-white/10">
              <span className="font-['Courier_New',monospace] text-xs md:text-sm text-white/50">YOUR CODE:</span>
              <span className="font-['Courier_New',monospace] text-sm md:text-base font-bold text-br-info tracking-[2px] md:tracking-[3px]">{secret}</span>
            </div>
            <div className="flex justify-between py-2 md:py-2.5 border-b border-white/10 bg-gradient-to-r from-br-hot/10 to-br-info/10 my-2 md:my-2.5 -mx-2 md:-mx-2.5 px-3 md:px-4 rounded-lg border border-br-hot/30">
              <span className="font-['Courier_New',monospace] text-xs md:text-sm text-white/50">OPPONENT CODE:</span>
              <span className="font-['Courier_New',monospace] text-lg md:text-xl font-bold text-br-hot tracking-[2px] md:tracking-[3px] [text-shadow:0_0_10px_rgba(255,0,128,0.5)] animate-[codeReveal_0.5s_ease-out]">{gameResult.opponentCode || "????"}</span>
            </div>
            {gameResult.winningGuess && (
              <div className="flex justify-between py-2 md:py-2.5 border-b border-white/10">
                <span className="font-['Courier_New',monospace] text-xs md:text-sm text-white/50">WINNING GUESS:</span>
                <span className="font-['Courier_New',monospace] text-sm md:text-base font-bold text-br-accent tracking-[2px] md:tracking-[3px]">{gameResult.winningGuess}</span>
              </div>
            )}
            <div className="flex justify-between py-2 md:py-2.5">
              <span className="font-['Courier_New',monospace] text-xs md:text-sm text-white/50">YOUR ATTEMPTS:</span>
              <span className="font-['Courier_New',monospace] text-sm md:text-base font-bold text-br-info tracking-[2px] md:tracking-[3px]">{attackLog.length}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:gap-3">
            {showOffer ? (
              <div className="flex flex-col gap-2 md:gap-2.5 bg-black/35 border border-br-accent/25 rounded-[10px] p-3 md:p-3.5 text-white/85 text-sm md:text-base">
                <span>Opponent wants a rematch</span>
                <div className="flex gap-2 md:gap-2.5 justify-center">
                  <button className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-br from-br-accent/20 to-br-accent/10 border-2 border-br-accent rounded-lg text-br-accent font-['Courier_New',monospace] text-sm md:text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-br-accent/30" onClick={acceptRematch}>⚡ Accept</button>
                  <button className="px-4 md:px-6 py-2.5 md:py-3 bg-transparent border border-white/30 rounded-md text-white/60 font-['Courier_New',monospace] text-xs md:text-sm cursor-pointer transition-all duration-300 hover:border-white/50 hover:text-white" onClick={declineRematch}>Decline</button>
                </div>
              </div>
            ) : waiting ? (
              <span className="font-['Courier_New',monospace] text-xs md:text-sm text-white/50 py-3 md:py-4">Waiting for opponent...</span>
            ) : (
              <button className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-br from-br-accent/20 to-br-accent/10 border-2 border-br-accent rounded-lg text-br-accent font-['Courier_New',monospace] text-sm md:text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-br-accent/30" onClick={requestRematch}>
                ⚡ REMATCH
              </button>
            )}
            <button className="px-4 md:px-6 py-2.5 md:py-3 bg-transparent border border-white/30 rounded-md text-white/60 font-['Courier_New',monospace] text-xs md:text-sm cursor-pointer transition-all duration-300 hover:border-white/50 hover:text-white" onClick={() => { clearGameOverTimer(); onBack(); }}>
              EXIT TO MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== PLAYING PHASE ====================
  return (
    <div className="min-h-screen h-screen bg-br-bg flex flex-col online-shell">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between items-center px-3 md:px-6 py-3 md:py-4 bg-black/50 border-b border-br-accent/20 gap-2 md:gap-0 online-header">
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-start">
          <button className="w-8 h-8 md:w-9 md:h-9 bg-br-hot/10 border border-br-hot/30 rounded-md text-br-hot text-lg md:text-xl font-bold cursor-pointer transition-all duration-200 hover:bg-br-hot/20 hover:border-br-hot hover:shadow-[0_0_15px_rgba(255,0,128,0.3)] hover:scale-105 flex items-center justify-center" onClick={exitGame} title="Exit Game">
            ✕
          </button>
          <span className="font-['Courier_New',monospace] text-xs md:text-sm text-white/60 px-2 md:px-3 py-1 md:py-1.5 bg-white/5 rounded">ROOM: {roomCode}</span>
          {gameMode === "blitz" && (
            <span className={`font-['Courier_New',monospace] text-base md:text-lg font-bold px-2 md:px-3.5 py-1 md:py-1.5 rounded border ${timeLeft < 60 ? "text-br-hot bg-br-hot/10 border-br-hot/30 animate-[timerPulse_1s_ease-in-out_infinite]" : "text-br-accent bg-br-accent/10 border-br-accent/30"}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
          <span className={`font-['Courier_New',monospace] text-xs md:text-sm font-bold px-2 md:px-3.5 py-1 md:py-1.5 rounded border md:hidden ${role === "Player 1" ? "bg-gradient-to-br from-br-accent/20 to-br-accent/10 text-br-accent border-br-accent/30" : "bg-gradient-to-br from-br-info/20 to-br-info/10 text-br-info border-br-info/30"}`}>{role === "Player 1" ? "P1" : "P2"}</span>
        </div>
        <div className="hidden md:block">
          <span className="font-['Courier_New',monospace] text-sm text-white/60">
            MY CODE: <span className="text-br-accent font-bold tracking-[4px]">{secret}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <span className="font-['Courier_New',monospace] text-xs md:text-sm text-white/60 md:hidden">
            MY CODE: <span className="text-br-accent font-bold tracking-[2px] md:tracking-[4px]">{secret}</span>
          </span>
          <span className={`hidden md:inline font-['Courier_New',monospace] text-sm font-bold px-3.5 py-1.5 rounded border ${role === "Player 1" ? "bg-gradient-to-br from-br-accent/20 to-br-accent/10 text-br-accent border-br-accent/30" : "bg-gradient-to-br from-br-info/20 to-br-info/10 text-br-info border-br-info/30"}`}>{role.toUpperCase()}</span>
          <button 
            className={`bg-white/5 border px-2 md:px-3.5 py-1.5 md:py-2 rounded cursor-pointer transition-all duration-300 relative text-sm md:text-base ${chatOpen ? "bg-br-accent/10 border-br-accent text-br-accent" : "border-white/20 text-white/70 hover:bg-br-accent/10 hover:border-br-accent hover:text-br-accent"}`}
            onClick={() => setChatOpen(!chatOpen)}
          >
            💬 {chatMessages.length > 0 && <span className="absolute -top-1.5 -right-1.5 bg-br-hot text-white text-xs px-1.5 py-0.5 rounded-[10px]">{chatMessages.length}</span>}
          </button>
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col md:flex-row p-2 md:p-5 gap-2 md:gap-5 overflow-hidden online-layout">
        {/* Notebook */}
        <div className="flex-1 flex flex-col md:flex-row bg-gradient-to-b from-[#121218] to-[#0d0d12] rounded-xl border border-white/10 overflow-hidden online-board">
          {/* Defense Column */}
          <div className="flex-1 flex flex-col p-2 md:p-5 overflow-hidden bg-gradient-to-br from-br-info/[0.03] to-transparent online-column">
            <div className="text-center mb-2 md:mb-4 pb-2 md:pb-4 border-b border-white/10">
              <h3 className="font-['Courier_New',monospace] text-sm md:text-xl text-br-info my-0 mb-1">🛡️ DEFENSE</h3>
              <span className="text-xs text-white/40">Opponent's attacks</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1 md:p-2.5 bg-black/30 rounded-lg">
              {defenseLog.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/30 font-['Courier_New',monospace] italic text-xs md:text-base">No attacks yet...</div>
              ) : (
                defenseLog.map((log, i) => (
                  <div key={i} className="flex items-center px-2 md:px-4 py-2 md:py-3 mb-1 md:mb-2 rounded-md animate-[slideIn_0.3s_ease] bg-br-info/10 border-l-[3px] border-br-info">
                    <span className="font-['Courier_New',monospace] text-xs text-white/40 mr-1 md:mr-3 min-w-[20px] md:min-w-[25px]">#{defenseLog.length - i}</span>
                    <span className="font-['Courier_New',monospace] text-base md:text-xl font-bold tracking-[3px] md:tracking-[5px] flex-1 text-white">{log.guess}</span>
                    <div className="flex gap-1 md:gap-2.5">
                      <span className="font-['Courier_New',monospace] font-bold text-sm md:text-base text-yellow-400">+{log.found}</span>
                      <span className="font-['Courier_New',monospace] font-bold text-sm md:text-base text-br-hot">-{log.locked}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px md:h-auto md:w-px bg-white/10 relative online-divider">
            <div className="hidden md:block absolute top-[20%] bottom-[20%] left-0 w-px bg-gradient-to-b from-transparent via-br-accent/50 to-transparent"></div>
          </div>

          {/* Attack Column */}
          <div className="flex-1 flex flex-col p-2 md:p-5 overflow-hidden bg-gradient-to-bl from-transparent to-br-accent/[0.03] online-column">
            <div className="text-center mb-2 md:mb-4 pb-2 md:pb-4 border-b border-white/10">
              <h3 className="font-['Courier_New',monospace] text-sm md:text-xl text-br-accent my-0 mb-1">⚔️ ATTACK</h3>
              <span className="text-xs text-white/40">Your attempts</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 mb-2 md:mb-5 w-full">
              <div className="flex gap-1.5 md:gap-2.5 flex-1 justify-center w-full">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="flex-1 max-w-[60px] md:max-w-[85px] min-w-0 h-[60px] md:h-[90px] bg-black/80 border-[2px] md:border-[3px] border-br-accent/60 rounded-lg text-br-accent font-['Courier_New',monospace] text-3xl md:text-[2.5rem] font-bold text-center outline-none transition-all duration-300 shadow-[0_0_20px_rgba(0,255,136,0.35)] [caret-color:#00ff88] leading-none p-0 focus:border-br-accent focus:bg-black/90 focus:shadow-[0_0_30px_rgba(0,255,136,0.5)] focus:scale-105"
                    value={guess[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d?$/.test(val)) {
                        if (val && guess.includes(val) && guess[i] !== val) {
                          showToast("No duplicate digits allowed");
                          return;
                        }
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
              <button className="w-full md:w-auto px-4 md:px-5 py-3 md:py-4 bg-gradient-to-br from-br-accent/20 to-br-accent/10 border-2 border-br-accent rounded-md text-br-accent font-['Courier_New',monospace] text-sm md:text-[0.95rem] font-bold cursor-pointer transition-all duration-300 whitespace-nowrap md:min-w-[140px] hover:bg-br-accent/30 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 disabled:cursor-not-allowed" onClick={sendGuess} disabled={guess.length !== 4}>
                DECODE →
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-1 md:p-2.5 bg-black/30 rounded-lg">
              {attackLog.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/30 font-['Courier_New',monospace] italic text-xs md:text-base">Make your first guess!</div>
              ) : (
                attackLog.map((log, i) => (
                  <div key={i} className="flex items-center px-2 md:px-4 py-2 md:py-3 mb-1 md:mb-2 rounded-md animate-[slideIn_0.3s_ease] bg-br-accent/10 border-l-[3px] border-br-accent">
                    <span className="font-['Courier_New',monospace] text-xs text-white/40 mr-1 md:mr-3 min-w-[20px] md:min-w-[25px]">#{attackLog.length - i}</span>
                    <span className="font-['Courier_New',monospace] text-base md:text-xl font-bold tracking-[3px] md:tracking-[5px] flex-1 text-white">{log.guess}</span>
                    <div className="flex gap-1 md:gap-2.5">
                      <span className="font-['Courier_New',monospace] font-bold text-sm md:text-base text-yellow-400">+{log.found}</span>
                      <span className="font-['Courier_New',monospace] font-bold text-sm md:text-base text-br-hot">-{log.locked}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        {chatOpen && (
          <div className="absolute md:relative bottom-0 left-0 right-0 md:w-[300px] h-[50vh] md:h-auto bg-black/95 md:bg-black/50 border-t md:border border-white/10 md:rounded-xl flex flex-col z-50 online-chat">
            <div className="flex justify-between items-center px-4 py-3 md:py-4 border-b border-white/10 font-['Courier_New',monospace] text-xs md:text-sm text-br-accent">
              <span>💬 COMMS</span>
              <button className="bg-none border-none text-white/50 text-xl cursor-pointer hover:text-br-hot" onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 md:py-4 flex flex-col gap-2 md:gap-2.5" ref={chatRef}>
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`max-w-[85%] px-2.5 md:px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm ${
                    msg.sender === "SYSTEM" 
                      ? "self-center bg-orange-500/10 border border-orange-500/30 max-w-[95%] text-center text-xs text-orange-500" 
                      : msg.sender === role 
                        ? "self-end bg-br-accent/10 border border-br-accent/30" 
                        : "self-start bg-br-info/10 border border-br-info/30"
                  }`}
                >
                  {msg.sender !== "SYSTEM" && (
                    <span className="block font-['Courier_New',monospace] text-xs text-white/50 mb-1">{msg.sender === role ? "You" : "Opponent"}</span>
                  )}
                  <span className="text-white/90">{msg.message}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-3 md:px-4 py-3 md:py-4 border-t border-white/10">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendChat()}
                placeholder="Type message..."
                className="flex-1 bg-white/5 border border-white/20 rounded-md px-2.5 md:px-3 py-2 md:py-2.5 text-white text-xs md:text-sm outline-none focus:border-br-accent"
              />
              <button className="bg-br-accent border-none rounded-md text-br-bg px-3 md:px-4 py-2 md:py-2.5 font-bold cursor-pointer text-sm md:text-base" onClick={sendChat}>→</button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 px-4 py-2 bg-black/80 border border-br-hot/40 text-white text-sm rounded-md shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
          {toast}
        </div>
      )}
    </div>
  );
}

export default OnlineGame;
