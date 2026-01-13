import React, { useState } from "react";
import "./OfflineGame.css";

function OfflineGame({ onBack }) {
  // Game phases: p1_setup | p2_setup | p1_guess | p2_guess | gameover
  const [phase, setPhase] = useState("p1_setup");
  
  // Player secrets
  const [p1Secret, setP1Secret] = useState("");
  const [p2Secret, setP2Secret] = useState("");
  
  // Current input
  const [inputCode, setInputCode] = useState("");
  
  // Guess logs
  const [p1Log, setP1Log] = useState([]); // P1's guesses on P2's code
  const [p2Log, setP2Log] = useState([]); // P2's guesses on P1's code
  
  // Game result
  const [winner, setWinner] = useState(null);

  // Validate code: 4 unique digits
  const validateCode = (code) => {
    if (!/^\d{4}$/.test(code)) return { valid: false, error: "Must be exactly 4 digits" };
    const unique = new Set(code.split(""));
    if (unique.size !== 4) return { valid: false, error: "All digits must be unique" };
    return { valid: true };
  };

  // Calculate score
  const calculateScore = (guess, secret) => {
    let found = 0; // Digits that exist (cows)
    let locked = 0; // Correct position (bulls)
    
    for (let i = 0; i < 4; i++) {
      if (guess[i] === secret[i]) {
        locked++;
      } else if (secret.includes(guess[i])) {
        found++;
      }
    }
    
    return { found: found + locked, locked };
  };

  // Handle code submission
  const submitCode = () => {
    const validation = validateCode(inputCode);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    switch (phase) {
      case "p1_setup":
        setP1Secret(inputCode);
        setInputCode("");
        setPhase("transition_p2");
        break;
      case "p2_setup":
        setP2Secret(inputCode);
        setInputCode("");
        setPhase("transition_p1_guess");
        break;
      default:
        break;
    }
  };

  // Handle guess submission
  const submitGuess = () => {
    const validation = validateCode(inputCode);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    if (phase === "p1_guess") {
      const score = calculateScore(inputCode, p2Secret);
      setP1Log((prev) => [{ guess: inputCode, ...score }, ...prev]);
      setInputCode("");
      
      if (score.locked === 4) {
        setWinner("Player 1");
        setPhase("gameover");
      } else {
        setPhase("transition_p2_guess");
      }
    } else if (phase === "p2_guess") {
      const score = calculateScore(inputCode, p1Secret);
      setP2Log((prev) => [{ guess: inputCode, ...score }, ...prev]);
      setInputCode("");
      
      if (score.locked === 4) {
        setWinner("Player 2");
        setPhase("gameover");
      } else {
        setPhase("transition_p1_guess");
      }
    }
  };

  // Transition screens
  const handleTransition = (nextPhase) => {
    setInputCode("");
    setPhase(nextPhase);
  };

  // Play again
  const playAgain = () => {
    setPhase("p1_setup");
    setP1Secret("");
    setP2Secret("");
    setInputCode("");
    setP1Log([]);
    setP2Log([]);
    setWinner(null);
  };

  // Render transition screen
  const renderTransition = (nextPlayer, nextPhase) => (
    <div className="offline-game transition-screen">
      <div className="transition-content">
        <div className="transition-icon">👁️</div>
        <h2>PASS THE DEVICE</h2>
        <p>Hand the device to <span className="highlight">{nextPlayer}</span></p>
        <p className="warning">No peeking!</p>
        <button className="continue-btn" onClick={() => handleTransition(nextPhase)}>
          I'M {nextPlayer.toUpperCase()} - CONTINUE
        </button>
      </div>
    </div>
  );

  // ==================== SETUP PHASES ====================
  if (phase === "p1_setup" || phase === "p2_setup") {
    const player = phase === "p1_setup" ? "Player 1" : "Player 2";
    
    return (
      <div className="offline-game setup-screen">
        <button className="back-btn" onClick={onBack}>← BACK</button>
        
        <div className="setup-content">
          <div className="player-badge">{player.toUpperCase()}</div>
          <h2 className="setup-title">&gt; SET YOUR SECRET CODE_</h2>
          <p className="setup-desc">Enter 4 unique digits. Don't let your opponent see!</p>
          
          <div className="code-input-section">
            <div className="digit-inputs">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="digit-input"
                  value={inputCode[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d?$/.test(val)) {
                      const newCode = inputCode.split("");
                      newCode[i] = val;
                      setInputCode(newCode.join(""));
                      if (val && i < 3) {
                        const next = e.target.nextElementSibling;
                        if (next) next.focus();
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !inputCode[i] && i > 0) {
                      const prev = e.target.previousElementSibling;
                      if (prev) prev.focus();
                    }
                    if (e.key === "Enter" && inputCode.length === 4) {
                      submitCode();
                    }
                  }}
                />
              ))}
            </div>
            <button 
              className="submit-btn" 
              onClick={submitCode}
              disabled={inputCode.length !== 4}
            >
              🔒 LOCK CODE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== TRANSITIONS ====================
  if (phase === "transition_p2") {
    return renderTransition("Player 2", "p2_setup");
  }
  
  if (phase === "transition_p1_guess") {
    return renderTransition("Player 1", "p1_guess");
  }
  
  if (phase === "transition_p2_guess") {
    return renderTransition("Player 2", "p2_guess");
  }

  // ==================== GAME OVER ====================
  if (phase === "gameover") {
    return (
      <div className="offline-game gameover-screen">
        <div className={`result-container ${winner === "Player 1" ? "p1-win" : "p2-win"}`}>
          <div className="result-icon">🏆</div>
          <h1>{winner.toUpperCase()} WINS!</h1>
          <p className="result-subtitle">The code has been cracked!</p>
          
          <div className="final-codes">
            <div className="code-reveal">
              <span className="label">Player 1's Code:</span>
              <span className="code">{p1Secret}</span>
            </div>
            <div className="code-reveal">
              <span className="label">Player 2's Code:</span>
              <span className="code">{p2Secret}</span>
            </div>
          </div>
          
          <div className="stats-row">
            <div className="stat">
              <span className="stat-label">P1 Attempts</span>
              <span className="stat-value">{p1Log.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">P2 Attempts</span>
              <span className="stat-value">{p2Log.length}</span>
            </div>
          </div>
          
          <div className="result-actions">
            <button className="play-again-btn" onClick={playAgain}>
              ⚡ PLAY AGAIN
            </button>
            <button className="exit-btn" onClick={onBack}>
              EXIT TO MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== GUESSING PHASES ====================
  const currentPlayer = phase === "p1_guess" ? "Player 1" : "Player 2";
  const opponentSecret = phase === "p1_guess" ? p2Secret : p1Secret;
  const currentLog = phase === "p1_guess" ? p1Log : p2Log;
  
  return (
    <div className="offline-game guess-screen">
      <div className="game-header">
        <span className={`player-indicator ${phase === "p1_guess" ? "p1" : "p2"}`}>
          {currentPlayer.toUpperCase()}'S TURN
        </span>
      </div>
      
      <div className="guess-container">
        <h2 className="guess-title">&gt; CRACK THE CODE_</h2>
        
        <div className="guess-input-section">
          <div className="digit-inputs">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                type="text"
                maxLength={1}
                className="digit-input guess"
                value={inputCode[i] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d?$/.test(val)) {
                    const newCode = inputCode.split("");
                    newCode[i] = val;
                    setInputCode(newCode.join(""));
                    if (val && i < 3) {
                      const next = e.target.nextElementSibling;
                      if (next) next.focus();
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !inputCode[i] && i > 0) {
                    const prev = e.target.previousElementSibling;
                    if (prev) prev.focus();
                  }
                  if (e.key === "Enter" && inputCode.length === 4) {
                    submitGuess();
                  }
                }}
              />
            ))}
          </div>
          <button 
            className="guess-btn" 
            onClick={submitGuess}
            disabled={inputCode.length !== 4}
          >
            DECODE →
          </button>
        </div>
        
        <div className="guess-log">
          <h3>ATTEMPT HISTORY</h3>
          {currentLog.length === 0 ? (
            <div className="empty-log">Make your first guess!</div>
          ) : (
            <div className="log-entries">
              {currentLog.map((entry, i) => (
                <div key={i} className="log-entry">
                  <span className="entry-num">#{currentLog.length - i}</span>
                  <span className="entry-code">{entry.guess}</span>
                  <div className="entry-score">
                    <span className="found">+{entry.found}</span>
                    <span className="locked">-{entry.locked}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="legend">
          <span><span className="found">+N</span> = N digits found</span>
          <span><span className="locked">-N</span> = N in correct position</span>
        </div>
      </div>
    </div>
  );
}

export default OfflineGame;
