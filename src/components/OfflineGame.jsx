import React, { useState } from "react";

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
    <div className="min-h-screen bg-gradient-to-br from-br-bg to-[#0f0f1a] flex flex-col items-center justify-center p-5">
      <div className="text-center max-w-[400px] p-12 bg-black/50 border-2 border-br-hot/30 rounded-2xl max-[480px]:p-7 max-[480px]:px-5 max-[380px]:p-6 xl:p-12 xl:rounded-[20px]">
        <div className="text-6xl mb-5">👁️</div>
        <h2 className="font-['Courier_New',monospace] text-3xl text-br-hot mb-5 tracking-[3px] max-[480px]:text-2xl max-[380px]:text-xl xl:text-[2rem]">PASS THE DEVICE</h2>
        <p className="text-white/70 mb-2.5 xl:text-lg">Hand the device to <span className="text-br-accent font-bold">{nextPlayer}</span></p>
        <p className="text-br-hot italic mb-7 xl:text-lg">No peeking!</p>
        <button className="py-4 px-8 bg-gradient-to-br from-br-accent/20 to-br-accent/10 border-2 border-br-accent rounded-lg text-br-accent font-['Courier_New',monospace] text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-br-accent/30 hover:shadow-[0_0_30px_rgba(0,255,136,0.4)]" onClick={() => handleTransition(nextPhase)}>
          I'M {nextPlayer.toUpperCase()} - CONTINUE
        </button>
      </div>
    </div>
  );

  // ==================== SETUP PHASES ====================
  if (phase === "p1_setup" || phase === "p2_setup") {
    const player = phase === "p1_setup" ? "Player 1" : "Player 2";
    
    return (
      <div className="min-h-screen bg-br-bg flex flex-col items-center justify-center p-5 max-[480px]:items-stretch max-[480px]:p-3 xl:p-10 relative">
        <button className="absolute top-5 left-5 bg-transparent border-none text-white/50 font-['Courier_New',monospace] text-sm cursor-pointer p-2.5 hover:text-br-accent transition-colors" onClick={onBack}>← BACK</button>
        
        <div className="text-center max-w-[400px] xl:max-w-[550px]">
          <div className="inline-block font-['Courier_New',monospace] text-base font-bold text-br-info bg-br-info/10 border border-br-info/30 py-2 px-5 rounded-[20px] mb-7 tracking-[2px] max-[380px]:text-[0.85rem] max-[380px]:py-1.5 max-[380px]:px-4 xl:text-lg xl:py-2.5 xl:px-6 xl:mb-7">{player.toUpperCase()}</div>
          <h2 className="font-['Courier_New',monospace] text-[1.8rem] text-br-accent mb-4 shadow-[0_0_20px_rgba(0,255,136,0.5)] max-[480px]:text-[1.3rem] max-[380px]:text-[1.2rem] xl:text-[2.2rem]">&gt; SET YOUR SECRET CODE_</h2>
          <p className="text-white/60 mb-10 max-[380px]:text-[0.85rem] max-[380px]:mb-5 xl:text-lg xl:mb-10">Enter 4 unique digits. Don't let your opponent see!</p>
          
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-3 max-[380px]:gap-2 xl:gap-5">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="w-20 h-24 bg-black/80 border-[3px] border-br-accent/60 rounded-[10px] text-br-accent font-['Courier_New',monospace] text-5xl font-bold text-center outline-none transition-all duration-300 shadow-[0_0_20px_rgba(0,255,136,0.35)] caret-br-accent leading-none p-0 focus:border-br-accent focus:bg-black/90 focus:shadow-[0_0_35px_rgba(0,255,136,0.5)] focus:scale-105 max-[480px]:w-[55px] max-[480px]:h-[65px] max-[480px]:text-[2rem] max-[380px]:w-[50px] max-[380px]:h-[60px] max-[380px]:text-[1.8rem] min-[768px]:max-[1199px]:w-[70px] min-[768px]:max-[1199px]:h-[85px] min-[768px]:max-[1199px]:text-[2.3rem] xl:w-[85px] xl:h-[100px] xl:text-5xl xl:rounded-xl"
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
              className="py-4 px-10 bg-gradient-to-br from-br-accent/20 to-br-accent/10 border-2 border-br-accent rounded-lg text-br-accent font-['Courier_New',monospace] text-lg font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-br-accent/30 hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] disabled:opacity-50 disabled:cursor-not-allowed max-[380px]:py-3 max-[380px]:px-7 max-[380px]:text-[0.95rem] xl:py-5 xl:px-[60px] xl:text-xl xl:rounded-xl" 
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
      <div className="min-h-screen bg-gradient-to-br from-br-bg to-[#0f0f1a] flex flex-col items-center justify-center p-5">
        <div className={`text-center p-12 rounded-2xl max-w-[450px] w-full max-[480px]:p-7 max-[480px]:px-5 max-[380px]:p-6 xl:p-[60px] xl:rounded-[20px] ${winner === "Player 1" ? "bg-gradient-to-br from-br-accent/10 to-br-accent/5 border-2 border-br-accent/30" : "bg-gradient-to-br from-br-info/10 to-br-info/5 border-2 border-br-info/30"}`}>
          <div className="text-6xl mb-5">🏆</div>
          <h1 className={`font-['Courier_New',monospace] text-[2rem] m-0 mb-2.5 tracking-[3px] max-[480px]:text-2xl max-[380px]:text-[1.3rem] xl:text-[2.5rem] ${winner === "Player 1" ? "text-br-accent shadow-[0_0_20px_rgba(0,255,136,0.5)]" : "text-br-info shadow-[0_0_20px_rgba(0,136,255,0.5)]"}`}>{winner.toUpperCase()} WINS!</h1>
          <p className="text-base text-white/60 mb-7">The code has been cracked!</p>
          
          <div className="bg-black/30 rounded-lg p-5 mb-5">
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="font-['Courier_New',monospace] text-[0.85rem] text-white/50">Player 1's Code:</span>
              <span className="font-['Courier_New',monospace] text-xl font-bold text-br-accent tracking-[5px]">{p1Secret}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="font-['Courier_New',monospace] text-[0.85rem] text-white/50">Player 2's Code:</span>
              <span className="font-['Courier_New',monospace] text-xl font-bold text-br-accent tracking-[5px]">{p2Secret}</span>
            </div>
          </div>
          
          <div className="flex justify-center gap-10 mb-7 max-[480px]:gap-5 max-[380px]:gap-4 max-[380px]:flex-wrap xl:gap-10">
            <div className="text-center">
              <span className="block font-['Courier_New',monospace] text-xs text-white/50 mb-1 max-[380px]:text-[0.7rem]">P1 Attempts</span>
              <span className="font-['Courier_New',monospace] text-2xl font-bold text-[#facc15] max-[380px]:text-xl xl:text-[1.8rem]">{p1Log.length}</span>
            </div>
            <div className="text-center">
              <span className="block font-['Courier_New',monospace] text-xs text-white/50 mb-1 max-[380px]:text-[0.7rem]">P2 Attempts</span>
              <span className="font-['Courier_New',monospace] text-2xl font-bold text-[#facc15] max-[380px]:text-xl xl:text-[1.8rem]">{p2Log.length}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button className="py-4 px-8 bg-gradient-to-br from-br-accent/20 to-br-accent/10 border-2 border-br-accent rounded-lg text-br-accent font-['Courier_New',monospace] text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-br-accent/30 hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] xl:py-[18px] xl:px-10 xl:text-lg" onClick={playAgain}>
              ⚡ PLAY AGAIN
            </button>
            <button className="py-3 px-6 bg-transparent border border-white/30 rounded-md text-white/60 font-['Courier_New',monospace] text-sm cursor-pointer transition-all duration-300 hover:border-white/50 hover:text-white xl:py-[18px] xl:px-10 xl:text-lg" onClick={onBack}>
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
    <div className="min-h-screen bg-br-bg flex flex-col items-center justify-start pt-0 p-5">
      <div className="w-full p-5 text-center bg-black/50 border-b border-white/10 min-[768px]:max-[1199px]:p-5 xl:p-6">
        <span className={`font-['Courier_New',monospace] text-xl font-bold py-2.5 px-6 rounded-[20px] tracking-[3px] ${phase === "p1_guess" ? "bg-br-accent/10 text-br-accent border border-br-accent/30" : "bg-br-info/10 text-br-info border border-br-info/30"}`}>
          {currentPlayer.toUpperCase()}'S TURN
        </span>
      </div>
      
      <div className="flex-1 flex flex-col items-center py-7 px-5 max-w-[500px] w-full max-[480px]:py-5 max-[480px]:px-4 max-[380px]:py-4 max-[380px]:px-3 min-[768px]:max-[1199px]:max-w-[480px] min-[768px]:max-[1199px]:py-7 xl:py-10 xl:px-10">
        <h2 className="font-['Courier_New',monospace] text-2xl text-br-info mb-7 shadow-[0_0_20px_rgba(0,136,255,0.5)] max-[480px]:text-[1.3rem] max-[380px]:text-[1.2rem] min-[768px]:max-[1199px]:text-[1.8rem] xl:text-[2.2rem]">&gt; CRACK THE CODE_</h2>
        
        <div className="flex flex-col items-center gap-5 mb-7">
          <div className="flex gap-3 max-[380px]:gap-2 xl:gap-5">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className="w-20 h-24 bg-black/80 border-[3px] border-br-info/60 rounded-[10px] text-br-info font-['Courier_New',monospace] text-5xl font-bold text-center outline-none transition-all duration-300 shadow-[0_0_20px_rgba(0,136,255,0.35)] caret-br-info leading-none p-0 focus:border-br-info focus:bg-black/90 focus:shadow-[0_0_35px_rgba(0,136,255,0.5)] focus:scale-105 max-[480px]:w-[55px] max-[480px]:h-[65px] max-[480px]:text-[2rem] max-[380px]:w-[50px] max-[380px]:h-[60px] max-[380px]:text-[1.8rem] min-[768px]:max-[1199px]:w-[70px] min-[768px]:max-[1199px]:h-[85px] min-[768px]:max-[1199px]:text-[2.3rem] xl:w-[85px] xl:h-[100px] xl:text-5xl xl:rounded-xl"
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
            className="py-4 px-10 bg-gradient-to-br from-br-info/20 to-br-info/10 border-2 border-br-info rounded-lg text-br-info font-['Courier_New',monospace] text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-br-info/30 hover:shadow-[0_0_30px_rgba(0,136,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed xl:py-5 xl:px-[60px] xl:text-xl xl:rounded-xl" 
            onClick={submitGuess}
            disabled={inputCode.length !== 4}
          >
            DECODE →
          </button>
        </div>
        
        <div className="w-full flex-1 flex flex-col bg-black/30 rounded-xl p-5 mb-5">
          <h3 className="font-['Courier_New',monospace] text-sm text-white/50 mb-4 text-center tracking-[2px]">ATTEMPT HISTORY</h3>
          {currentLog.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/30 font-['Courier_New',monospace] italic">Make your first guess!</div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {currentLog.map((entry, i) => (
                <div key={i} className="flex items-center py-3 px-4 mb-2 bg-br-info/10 border-l-[3px] border-br-info rounded-md animate-slideIn max-[380px]:py-2.5 max-[380px]:px-3 xl:py-4 xl:px-5">
                  <span className="font-['Courier_New',monospace] text-xs text-white/40 mr-4 min-w-[25px]">#{currentLog.length - i}</span>
                  <span className="font-['Courier_New',monospace] text-[1.3rem] font-bold tracking-[5px] flex-1 text-white max-[380px]:text-[1.1rem] max-[380px]:tracking-[4px] xl:text-[1.4rem] xl:tracking-[10px]">{entry.guess}</span>
                  <div className="flex gap-2.5">
                    <span className="font-['Courier_New',monospace] font-bold text-base text-[#facc15] max-[380px]:text-xs xl:text-[0.95rem]">+{entry.found}</span>
                    <span className="font-['Courier_New',monospace] font-bold text-base text-br-hot max-[380px]:text-xs xl:text-[0.95rem]">-{entry.locked}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex gap-7 font-['Courier_New',monospace] text-xs text-white/50">
          <span><span className="font-['Courier_New',monospace] font-bold text-base text-[#facc15]">+N</span> = N digits found</span>
          <span><span className="font-['Courier_New',monospace] font-bold text-base text-br-hot">-N</span> = N in correct position</span>
        </div>
      </div>
    </div>
  );
}

export default OfflineGame;
