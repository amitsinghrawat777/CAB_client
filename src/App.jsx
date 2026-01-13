import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./App.css";

// Server URL: Use environment variable or fallback
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

function App() {
  const socketRef = useRef(null);
  
  // Connection & Room State
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState("");
  const [gamePhase, setGamePhase] = useState("lobby"); // lobby | setup | playing | gameover
  const [status, setStatus] = useState("Enter a Room ID to start");
  
  // Game State
  const [secret, setSecret] = useState("");
  const [secretLocked, setSecretLocked] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [guess, setGuess] = useState("");
  const [gameResult, setGameResult] = useState(null); // { winner, isWinner }
  
  // Notebook Logs
  const [defenseLog, setDefenseLog] = useState([]); // Opponent's guesses on me
  const [attackLog, setAttackLog] = useState([]);   // My guesses on opponent

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io.connect(SERVER_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
    });

    socket.on("role_assigned", (r) => {
      setRole(r);
      if (r === "Player 1") {
        setStatus("Waiting for opponent to join...");
      }
    });
    
    socket.on("game_ready", () => {
      setGamePhase("setup");
      setStatus("🎮 Game Start! Set your 4-digit secret code.");
    });
    
    socket.on("opponent_set_secret", () => {
      setOpponentReady(true);
    });

    socket.on("both_ready", () => {
      setGamePhase("playing");
      setStatus("🔥 Both players ready! Start guessing!");
    });

    socket.on("guess_result", (data) => {
      setAttackLog((prev) => [data, ...prev]);
    });

    socket.on("opponent_guessed", (data) => {
      setDefenseLog((prev) => [data, ...prev]);
    });

    socket.on("game_over", (data) => {
      setGamePhase("gameover");
      setGameResult({
        winner: data.winner,
        isWinner: data.winner === role,
        opponentCode: data.opponentCode,
        winningGuess: data.winningGuess
      });
    });

    socket.on("room_full", () => {
      alert("This room is full! Try another room.");
      setJoined(false);
    });

    socket.on("opponent_disconnected", () => {
      setStatus("⚠️ Opponent disconnected!");
      setGamePhase("lobby");
    });

    return () => {
      socket.disconnect();
    };
  }, [role]);

  // Validate input: 4 unique digits
  const validateCode = (code) => {
    if (!/^\d{4}$/.test(code)) return { valid: false, error: "Must be exactly 4 digits" };
    const uniqueDigits = new Set(code.split(""));
    if (uniqueDigits.size !== 4) return { valid: false, error: "All 4 digits must be unique" };
    return { valid: true };
  };

  const joinRoom = () => {
    if (room.trim() === "") return alert("Please enter a Room ID");
    socketRef.current.emit("join_room", room.trim());
    setJoined(true);
  };

  const lockSecret = () => {
    const validation = validateCode(secret);
    if (!validation.valid) return alert(validation.error);
    
    socketRef.current.emit("set_secret", { room, code: secret, role });
    setSecretLocked(true);
    setStatus(opponentReady ? "🔥 Both ready! Start guessing!" : "✅ Code Locked. Waiting for opponent...");
  };

  const sendGuess = () => {
    const validation = validateCode(guess);
    if (!validation.valid) return alert(validation.error);
    
    socketRef.current.emit("send_guess", { room, guess, role });
    setGuess("");
  };

  const handleKeyPress = (e, action) => {
    if (e.key === "Enter") action();
  };

  const playAgain = () => {
    window.location.reload();
  };

  // ==================== RENDER SCREENS ====================

  // LOBBY SCREEN
  if (!joined) {
    return (
      <div className="App lobby">
        <div className="logo">
          <span className="cow">🐄</span>
          <span className="bull">🐂</span>
        </div>
        <h1>Cows & Bulls</h1>
        <p className="subtitle">Real-Time Multiplayer</p>
        
        <div className="join-form">
          <input 
            placeholder="Enter Room ID (e.g. Matrix)" 
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, joinRoom)}
          />
          <button onClick={joinRoom} className="btn-primary">Join Game</button>
        </div>
        
        <div className="rules">
          <h3>How to Play</h3>
          <p>1. Both players set a secret 4-digit code (unique digits)</p>
          <p>2. Take turns guessing your opponent's code</p>
          <p>3. <strong>+N</strong> = N digits exist (Cows)</p>
          <p>4. <strong>-N</strong> = N digits in correct position (Bulls)</p>
          <p>5. First to get <strong>-4</strong> wins!</p>
        </div>
      </div>
    );
  }

  // GAME OVER SCREEN
  if (gamePhase === "gameover" && gameResult) {
    return (
      <div className="App gameover">
        <div className={`result-banner ${gameResult.isWinner ? "winner" : "loser"}`}>
          <h1>{gameResult.isWinner ? "🎉 YOU WON! 🎉" : "💀 YOU LOST 💀"}</h1>
          <p>{gameResult.isWinner ? "Congratulations!" : "Better luck next time!"}</p>
        </div>
        
        <div className="game-summary">
          <div className="summary-item">
            <span className="label">Your Secret:</span>
            <span className="code">{secret}</span>
          </div>
          <div className="summary-item">
            <span className="label">Opponent's Secret:</span>
            <span className="code">{gameResult.opponentCode}</span>
          </div>
          <div className="summary-item">
            <span className="label">Winning Guess:</span>
            <span className="code highlight">{gameResult.winningGuess}</span>
          </div>
          <div className="summary-item">
            <span className="label">Your Attempts:</span>
            <span className="count">{attackLog.length}</span>
          </div>
        </div>
        
        <button onClick={playAgain} className="btn-primary">Play Again</button>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="App game">
      <div className="header">
        <div className="room-info">
          <span className="room-label">Room:</span>
          <span className="room-id">{room}</span>
        </div>
        <div className="role-badge" data-role={role}>
          {role}
        </div>
        <p className="status">{status}</p>
      </div>

      {/* SECRET CODE SECTION */}
      <div className="secret-section">
        {!secretLocked ? (
          <div className="secret-input">
            <input 
              type="text"
              maxLength={4}
              placeholder="Your 4-digit code" 
              value={secret}
              onChange={(e) => setSecret(e.target.value.replace(/\D/g, ""))}
              onKeyPress={(e) => handleKeyPress(e, lockSecret)}
              disabled={gamePhase !== "setup"}
            />
            <button 
              onClick={lockSecret} 
              className="btn-lock"
              disabled={gamePhase !== "setup"}
            >
              🔒 Lock Code
            </button>
          </div>
        ) : (
          <div className="secret-locked">
            <span className="secret-display">{secret.split("").join(" ")}</span>
            <span className="lock-icon">🔒</span>
          </div>
        )}
        
        {/* Opponent Ready Indicator */}
        <div className={`opponent-status ${opponentReady ? "ready" : ""}`}>
          {opponentReady ? "✅ Opponent Ready" : "⏳ Waiting for opponent..."}
        </div>
      </div>

      {/* NOTEBOOK SPLIT VIEW */}
      <div className="notebook">
        {/* LEFT: DEFENSE */}
        <div className="column defense">
          <div className="column-header">
            <h3>🛡️ DEFENSE</h3>
            <span className="column-subtitle">Opponent's guesses on your code</span>
          </div>
          <div className="logs">
            {defenseLog.length === 0 ? (
              <div className="empty-log">No guesses yet...</div>
            ) : (
              defenseLog.map((log, i) => (
                <div key={i} className="log-row defense-row">
                  <span className="attempt-num">#{defenseLog.length - i}</span>
                  <span className="guess-code">{log.guess}</span>
                  <div className="score">
                    <span className="cows">+{log.plus}</span>
                    <span className="bulls">-{log.minus}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DIVIDER */}
        <div className="notebook-divider"></div>

        {/* RIGHT: ATTACK */}
        <div className="column attack">
          <div className="column-header">
            <h3>⚔️ ATTACK</h3>
            <span className="column-subtitle">Your guesses on opponent's code</span>
          </div>
          
          <div className="input-area">
            <input 
              value={guess} 
              maxLength={4}
              onChange={(e) => setGuess(e.target.value.replace(/\D/g, ""))} 
              onKeyPress={(e) => handleKeyPress(e, sendGuess)}
              placeholder="Enter guess..." 
              disabled={gamePhase !== "playing"}
            />
            <button 
              onClick={sendGuess} 
              className="btn-guess"
              disabled={gamePhase !== "playing"}
            >
              Guess!
            </button>
          </div>
          
          <div className="logs">
            {attackLog.length === 0 ? (
              <div className="empty-log">Make your first guess!</div>
            ) : (
              attackLog.map((log, i) => (
                <div key={i} className="log-row attack-row">
                  <span className="attempt-num">#{attackLog.length - i}</span>
                  <span className="guess-code">{log.guess}</span>
                  <div className="score">
                    <span className="cows">+{log.plus}</span>
                    <span className="bulls">-{log.minus}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;