import React, { useState, useEffect } from "react";

function MainMenu({ onNavigate }) {
  const [glitchText, setGlitchText] = useState("PROTOCOL 4");
  const [showSubtitle, setShowSubtitle] = useState(false);

  useEffect(() => {
    // Glitch effect on title
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?0123456789";
    let iterations = 0;
    const maxIterations = 10;
    
    const interval = setInterval(() => {
      if (iterations < maxIterations) {
        setGlitchText(
          "PROTOCOL 4".split("").map((char, i) => {
            if (i < iterations) return "PROTOCOL 4"[i];
            return glitchChars[Math.floor(Math.random() * glitchChars.length)];
          }).join("")
        );
        iterations++;
      } else {
        clearInterval(interval);
        setGlitchText("PROTOCOL 4");
        setShowSubtitle(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden max-[480px]:items-start max-[480px]:p-6">
      {/* Animated background grid */}
      <div 
        className="absolute inset-0 animate-[gridMove_20s_linear_infinite]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      ></div>
      
      {/* Scanlines effect */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)'
        }}
      ></div>

      {/* Main content */}
      <div className="relative z-[5] flex flex-col items-center p-10 max-w-[500px] w-full max-[480px]:p-6 max-[480px]:max-w-[420px] min-[768px]:max-[1199px]:max-w-[550px] min-[768px]:max-[1199px]:p-[50px] min-[1200px]:max-w-[700px] min-[1200px]:p-20 min-[1600px]:max-w-[800px] min-[1600px]:p-[100px] max-[500px]:landscape:p-5">
        {/* Logo/Title */}
        <div className="text-center mb-[50px] min-[1200px]:mb-20 max-[500px]:landscape:mb-5">
          <div className="font-mono text-[2rem] text-br-accent mb-[15px] [text-shadow:0_0_20px_rgba(0,255,136,0.5)] max-[480px]:text-2xl max-[380px]:text-[1.2rem] min-[1200px]:text-5xl min-[1600px]:text-[3.5rem] max-[500px]:landscape:hidden">
            <span className="text-[#0088ff]">[</span>
            <span className="animate-[pulse_2s_ease-in-out_infinite]">P4</span>
            <span className="text-[#0088ff]">]</span>
          </div>
          <h1 
            className="font-mono text-[3.5rem] font-bold text-br-accent m-0 tracking-[8px] [text-shadow:0_0_10px_rgba(0,255,136,0.8),0_0_20px_rgba(0,255,136,0.6),0_0_40px_rgba(0,255,136,0.4)] relative before:content-[attr(data-text)] before:absolute before:top-0 before:left-0 before:w-full before:h-full before:text-[#ff0080] before:animate-[glitch-1_2s_infinite_linear_alternate-reverse] before:[clip-path:polygon(0_0,100%_0,100%_35%,0_35%)] after:content-[attr(data-text)] after:absolute after:top-0 after:left-0 after:w-full after:h-full after:text-[#0088ff] after:animate-[glitch-2_3s_infinite_linear_alternate-reverse] after:[clip-path:polygon(0_65%,100%_65%,100%_100%,0_100%)] max-[480px]:text-[2.2rem] max-[480px]:tracking-[4px] max-[380px]:text-[1.8rem] max-[380px]:tracking-[3px] min-[768px]:max-[1199px]:text-[3.2rem] min-[768px]:max-[1199px]:tracking-[6px] min-[1200px]:text-[5rem] min-[1200px]:tracking-[14px] min-[1600px]:text-[6rem] min-[1600px]:tracking-[18px] max-[500px]:landscape:text-[2rem]"
            data-text={glitchText}
          >
            {glitchText}
          </h1>
          <p className={`font-mono text-[1.1rem] text-[#0088ff] mt-[15px] transition-all duration-500 max-[480px]:text-[0.9rem] min-[1200px]:text-[1.4rem] min-[1200px]:mt-[25px] min-[1600px]:text-[1.6rem] max-[500px]:landscape:hidden ${showSubtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[10px]'}`}>
            &gt; DECODE THE SEQUENCE_
          </p>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col gap-5 w-full mb-10 min-[1200px]:gap-[25px] max-[500px]:landscape:flex-row max-[500px]:landscape:gap-[15px]">
          <button 
            className="group flex items-center gap-[15px] px-[25px] py-5 bg-[rgba(0,255,136,0.05)] border-2 border-[rgba(0,255,136,0.3)] rounded-lg cursor-pointer transition-all duration-300 text-left relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(0,255,136,0.1),transparent)] before:transition-[left_0.5s_ease] hover:bg-[rgba(0,255,136,0.1)] hover:border-br-accent hover:translate-x-[5px] hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] hover:before:left-full max-[480px]:px-[18px] max-[480px]:py-[15px] max-[480px]:gap-3 max-[380px]:px-[14px] max-[380px]:py-3 min-[768px]:max-[1199px]:px-7 min-[768px]:max-[1199px]:py-[22px] min-[1200px]:px-10 min-[1200px]:py-[30px] min-[1200px]:rounded-2xl min-[1200px]:bg-[rgba(10,10,20,0.8)] min-[1200px]:border-[rgba(0,255,136,0.2)] min-[1200px]:hover:translate-x-3 min-[1200px]:hover:scale-[1.03] min-[1200px]:hover:shadow-[0_0_40px_rgba(0,255,136,0.2)] min-[1600px]:px-[50px] min-[1600px]:py-[35px] max-[500px]:landscape:flex-1 max-[500px]:landscape:px-5 max-[500px]:landscape:py-[15px] [touch-screen]:min-h-[70px] active:[touch-screen]:scale-[0.98] active:[touch-screen]:bg-[rgba(0,255,136,0.15)]"
            onClick={() => onNavigate("lobby")}
          >
            <span className="text-[2rem] w-[50px] text-center max-[480px]:text-2xl max-[480px]:w-10 max-[380px]:w-[35px] max-[380px]:text-[1.3rem] min-[1200px]:text-5xl min-[1200px]:w-20 min-[1600px]:text-[3.5rem] min-[1600px]:w-[90px]">⚡</span>
            <span className="flex-1 flex flex-col gap-1">
              <span className="font-mono text-[1.2rem] font-bold text-br-accent tracking-[2px] max-[480px]:text-base max-[380px]:text-[0.9rem] max-[380px]:tracking-[1px] min-[1200px]:text-[1.6rem] min-[1200px]:tracking-[5px] min-[1600px]:text-[1.8rem]">ONLINE PvP</span>
              <span className="text-[0.85rem] text-white/50 max-[380px]:text-[0.7rem] min-[1200px]:text-base min-[1200px]:mt-2 min-[1600px]:text-[1.1rem]">Challenge opponents worldwide</span>
            </span>
            <span className="text-2xl text-white/30 transition-all duration-300 group-hover:text-br-accent group-hover:translate-x-[5px]">→</span>
          </button>

          <button 
            className="group flex items-center gap-[15px] px-[25px] py-5 bg-[rgba(0,136,255,0.05)] border-2 border-[rgba(0,136,255,0.3)] rounded-lg cursor-pointer transition-all duration-300 text-left relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(0,255,136,0.1),transparent)] before:transition-[left_0.5s_ease] hover:bg-[rgba(0,136,255,0.1)] hover:border-[#0088ff] hover:translate-x-[5px] hover:shadow-[0_0_30px_rgba(0,136,255,0.3)] hover:before:left-full max-[480px]:px-[18px] max-[480px]:py-[15px] max-[480px]:gap-3 max-[380px]:px-[14px] max-[380px]:py-3 min-[768px]:max-[1199px]:px-7 min-[768px]:max-[1199px]:py-[22px] min-[1200px]:px-10 min-[1200px]:py-[30px] min-[1200px]:rounded-2xl min-[1200px]:bg-[rgba(10,10,20,0.8)] min-[1200px]:border-[rgba(0,255,136,0.2)] min-[1200px]:hover:translate-x-3 min-[1200px]:hover:scale-[1.03] min-[1200px]:hover:shadow-[0_0_40px_rgba(0,255,136,0.2)] min-[1600px]:px-[50px] min-[1600px]:py-[35px] max-[500px]:landscape:flex-1 max-[500px]:landscape:px-5 max-[500px]:landscape:py-[15px] [touch-screen]:min-h-[70px] active:[touch-screen]:scale-[0.98] active:[touch-screen]:bg-[rgba(0,255,136,0.15)]"
            onClick={() => onNavigate("offline")}
          >
            <span className="text-[2rem] w-[50px] text-center max-[480px]:text-2xl max-[480px]:w-10 max-[380px]:w-[35px] max-[380px]:text-[1.3rem] min-[1200px]:text-5xl min-[1200px]:w-20 min-[1600px]:text-[3.5rem] min-[1600px]:w-[90px]">🔐</span>
            <span className="flex-1 flex flex-col gap-1">
              <span className="font-mono text-[1.2rem] font-bold text-[#0088ff] tracking-[2px] max-[480px]:text-base max-[380px]:text-[0.9rem] max-[380px]:tracking-[1px] min-[1200px]:text-[1.6rem] min-[1200px]:tracking-[5px] min-[1600px]:text-[1.8rem]">OFFLINE PROTOCOL</span>
              <span className="text-[0.85rem] text-white/50 max-[380px]:text-[0.7rem] min-[1200px]:text-base min-[1200px]:mt-2 min-[1600px]:text-[1.1rem]">Pass & Play local match</span>
            </span>
            <span className="text-2xl text-white/30 transition-all duration-300 group-hover:text-[#0088ff] group-hover:translate-x-[5px]">→</span>
          </button>

          <button 
            className="group flex items-center gap-[15px] px-[25px] py-5 bg-[rgba(255,160,0,0.08)] border-2 border-[rgba(255,160,0,0.4)] rounded-lg cursor-pointer transition-all duration-300 text-left relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(0,255,136,0.1),transparent)] before:transition-[left_0.5s_ease] hover:bg-[rgba(255,160,0,0.14)] hover:border-[#ffa000] hover:translate-x-[5px] hover:shadow-[0_0_30px_rgba(255,160,0,0.28)] hover:before:left-full max-[480px]:px-[18px] max-[480px]:py-[15px] max-[480px]:gap-3 max-[380px]:px-[14px] max-[380px]:py-3 min-[768px]:max-[1199px]:px-7 min-[768px]:max-[1199px]:py-[22px] min-[1200px]:px-10 min-[1200px]:py-[30px] min-[1200px]:rounded-2xl min-[1200px]:bg-[rgba(10,10,20,0.8)] min-[1200px]:border-[rgba(0,255,136,0.2)] min-[1200px]:hover:translate-x-3 min-[1200px]:hover:scale-[1.03] min-[1200px]:hover:shadow-[0_0_40px_rgba(0,255,136,0.2)] min-[1600px]:px-[50px] min-[1600px]:py-[35px] max-[500px]:landscape:flex-1 max-[500px]:landscape:px-5 max-[500px]:landscape:py-[15px] [touch-screen]:min-h-[70px] active:[touch-screen]:scale-[0.98] active:[touch-screen]:bg-[rgba(0,255,136,0.15)]"
            onClick={() => onNavigate("battle")}
          >
            <span className="text-[2rem] w-[50px] text-center max-[480px]:text-2xl max-[480px]:w-10 max-[380px]:w-[35px] max-[380px]:text-[1.3rem] min-[1200px]:text-5xl min-[1200px]:w-20 min-[1600px]:text-[3.5rem] min-[1600px]:w-[90px]">👾</span>
            <span className="flex-1 flex flex-col gap-1">
              <span className="font-mono text-[1.2rem] font-bold text-br-accent tracking-[2px] max-[480px]:text-base max-[380px]:text-[0.9rem] max-[380px]:tracking-[1px] min-[1200px]:text-[1.6rem] min-[1200px]:tracking-[5px] min-[1600px]:text-[1.8rem]">BATTLE ROYALE</span>
              <span className="text-[0.85rem] text-white/50 max-[380px]:text-[0.7rem] min-[1200px]:text-base min-[1200px]:mt-2 min-[1600px]:text-[1.1rem]">Up to 100 players, one code</span>
            </span>
            <span className="text-2xl text-white/30 transition-all duration-300 group-hover:text-br-accent group-hover:translate-x-[5px]">→</span>
          </button>
        </div>

        {/* Game rules */}
        <div className="w-full bg-black/50 border border-[rgba(0,255,136,0.2)] rounded-lg p-5 mb-[30px] max-[480px]:p-[15px] max-[380px]:p-3 min-[1200px]:mt-[70px] min-[1200px]:p-[35px] min-[1200px]:rounded-[20px] min-[1200px]:max-w-[600px] max-[500px]:landscape:hidden">
          <div className="font-mono text-[0.9rem] text-br-accent mb-[15px] flex gap-[10px] min-[1200px]:text-[1.1rem]">
            <span className="animate-[blink_1s_step-end_infinite]">&gt;</span>
            <span>MISSION BRIEFING</span>
          </div>
          <div className="font-mono text-[0.85rem] text-white/70 leading-[1.8] max-[480px]:text-[0.8rem] min-[1200px]:text-base min-[1200px]:leading-[2]">
            <p className="my-[5px]"><span className="text-br-accent font-bold">OBJECTIVE:</span> Crack the 4-digit code before your opponent</p>
            <p className="my-[5px]"><span className="text-br-accent font-bold">+N</span> = N digits exist in the code (FOUND)</p>
            <p className="my-[5px]"><span className="text-br-accent font-bold">-N</span> = N digits in correct position (LOCKED)</p>
            <p className="my-[5px]"><span className="text-br-accent font-bold">-4</span> = CODE CRACKED - VICTORY</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-[15px] font-mono text-[0.8rem] text-white/40 max-[480px]:flex-wrap max-[480px]:gap-2 max-[480px]:justify-center">
          <span>v4.0.0</span>
          <span className="text-white/20">|</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-br-accent rounded-full animate-[statusPulse_2s_ease-in-out_infinite]"></span>
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(50px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes glitch-1 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(2px, -2px); }
          60% { transform: translate(-2px, -2px); }
          80% { transform: translate(2px, 2px); }
        }
        @keyframes glitch-2 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(2px, -2px); }
          40% { transform: translate(-2px, 2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(-2px, -2px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes statusPulse {
          0%, 100% { 
            box-shadow: 0 0 5px rgba(0, 255, 136, 0.5);
            opacity: 1;
          }
          50% { 
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.8);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

export default MainMenu;
