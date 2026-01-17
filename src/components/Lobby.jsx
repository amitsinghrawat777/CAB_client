import React, { useState, useEffect } from "react";

function Lobby({ socket, connected, onGameStart, onBack }) {
  const [mode, setMode] = useState("menu"); // menu | create | join
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [gameMode, setGameMode] = useState("standard"); // standard | blitz
  const [status, setStatus] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on("room_created", (data) => {
      console.log("Room created:", data);
      setRoomCode(data.roomCode);
      setIsWaiting(true);
      setStatus("Waiting for opponent to join...");
    });

    socket.on("room_joined", (data) => {
      console.log("Room joined:", data);
      setStatus("Joined! Starting game...");
      setTimeout(() => {
        onGameStart({
          roomCode: data.roomCode,
          role: data.role,
          gameMode: data.mode,
        });
      }, 1000);
    });

    socket.on("opponent_joined", (data) => {
      console.log("Opponent joined:", data);
      setStatus("Opponent joined! Starting game...");
      setTimeout(() => {
        onGameStart({
          roomCode: roomCode,
          role: "Player 1",
          gameMode: gameMode,
        });
      }, 1000);
    });

    socket.on("join_error", (data) => {
      console.log("Join error:", data);
      setStatus(data.message || "Failed to join room.");
    });

    return () => {
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("opponent_joined");
      socket.off("join_error");
    };
  }, [socket, roomCode, gameMode, onGameStart]);

  const createRoom = () => {
    console.log("createRoom called, socket:", socket, "connected:", connected);
    if (!socket || !connected) {
      setStatus("Connecting to server... Please wait.");
      return;
    }
    console.log("Emitting create_room with mode:", gameMode);
    setStatus("Generating room code...");
    socket.emit("create_room", { mode: gameMode });
  };

  const joinRoom = () => {
    if (!socket) {
      setStatus("Not connected to server. Please wait...");
      return;
    }
    if (inputCode.length !== 4) {
      setStatus("Enter a valid 4-character code");
      return;
    }
    socket.emit("join_room", { roomCode: inputCode.toUpperCase() });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cancelWaiting = () => {
    socket.emit("leave_room", { roomCode });
    setIsWaiting(false);
    setRoomCode("");
    setMode("menu");
    setStatus("");
  };

  // Menu selection
  if (mode === "menu") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-5 max-[480px]:items-start max-[480px]:p-3">
        <div className="max-w-[500px] w-full relative max-[480px]:max-w-full max-[480px]:pt-2 min-[1200px]:max-w-[700px] min-[1200px]:p-15 min-[1600px]:max-w-[800px] min-[1600px]:p-20 min-[768px]:max-[1199px]:max-w-[550px]">
          <button className="absolute -top-15 left-0 bg-transparent border-none text-white/50 font-['Courier_New',monospace] text-[0.9rem] cursor-pointer p-[10px_0] transition-colors duration-300 hover:text-br-accent max-[480px]:static max-[480px]:mb-3 min-[1200px]:-top-[90px] min-[1200px]:text-[1.1rem] min-[1200px]:p-[12px_25px] max-[500px]:max-h-[500px]:landscape:fixed max-[500px]:max-h-[500px]:landscape:top-[10px] max-[500px]:max-h-[500px]:landscape:left-[10px]" onClick={onBack}>
            ← BACK
          </button>
          
          <div className="text-center mb-10 min-[1200px]:mb-10 max-[500px]:max-h-[500px]:landscape:mb-5">
            <h1 className="font-['Courier_New',monospace] text-[2.5rem] text-br-accent m-0 tracking-[4px] [text-shadow:0_0_20px_rgba(0,255,136,0.5)] max-[480px]:text-[1.8rem] min-[1200px]:text-[3.5rem] min-[1200px]:tracking-[8px] min-[1600px]:text-[4rem] min-[1600px]:tracking-[10px] min-[768px]:max-[1199px]:text-[2.2rem] max-[380px]:text-[1.5rem] max-[380px]:tracking-[2px] max-[500px]:max-h-[500px]:landscape:text-[1.5rem]">ONLINE PvP</h1>
            <p className="font-['Courier_New',monospace] text-base text-[#0088ff] mt-[10px] min-[1200px]:text-[1.3rem] min-[1200px]:mt-5 min-[1600px]:text-[1.5rem]">&gt; SELECT OPERATION_</p>
          </div>

          <div className="flex flex-col gap-[15px] min-[1200px]:gap-[25px] max-[500px]:max-h-[500px]:landscape:flex-row max-[500px]:max-h-[500px]:landscape:gap-[15px]">
            <button 
              className="flex items-center gap-5 p-[25px] bg-br-accent/5 border-2 border-br-accent/30 rounded-lg cursor-pointer transition-all duration-300 text-left hover:bg-br-accent/10 hover:border-br-accent hover:translate-x-[5px] max-[480px]:p-4 min-[1200px]:p-10 min-[1200px]:rounded-2xl min-[1200px]:bg-[rgba(10,10,20,0.8)] min-[1200px]:hover:translate-x-3 min-[1200px]:hover:shadow-[0_0_40px_rgba(0,255,136,0.15)] min-[1600px]:p-[45px] min-[768px]:max-[1199px]:p-7 max-[380px]:p-[15px] max-[380px]:gap-[15px] max-[500px]:max-h-[500px]:landscape:flex-1 max-[500px]:max-h-[500px]:landscape:p-[15px] hover:touch:transform-none active:touch:scale-98"
              onClick={() => setMode("create")}
            >
              <span className="text-[2rem] text-br-accent font-['Courier_New',monospace] w-[50px] h-[50px] flex items-center justify-center border-2 border-br-accent/30 rounded-lg max-[480px]:w-10 max-[480px]:h-10 max-[480px]:text-2xl min-[1200px]:w-[70px] min-[1200px]:h-[70px] min-[1200px]:text-[2.8rem] min-[1200px]:rounded-[14px] min-[1600px]:w-20 min-[1600px]:h-20 min-[1600px]:text-5xl max-[380px]:w-[35px] max-[380px]:h-[35px] max-[380px]:text-[1.2rem]">+</span>
              <span className="flex flex-col gap-[5px]">
                <span className="font-['Courier_New',monospace] text-[1.2rem] font-bold text-br-accent tracking-[2px] max-[480px]:text-base min-[1200px]:text-[1.6rem] min-[1200px]:tracking-[4px] min-[1600px]:text-[1.8rem] max-[380px]:text-[0.9rem]">CREATE ROOM</span>
                <span className="text-[0.85rem] text-white/50 min-[1200px]:text-[1.1rem] max-[380px]:text-xs">Generate code & wait for challenger</span>
              </span>
            </button>

            <button 
              className="flex items-center gap-5 p-[25px] bg-br-accent/5 border-2 border-br-accent/30 rounded-lg cursor-pointer transition-all duration-300 text-left hover:bg-br-accent/10 hover:border-br-accent hover:translate-x-[5px] max-[480px]:p-4 min-[1200px]:p-10 min-[1200px]:rounded-2xl min-[1200px]:bg-[rgba(10,10,20,0.8)] min-[1200px]:hover:translate-x-3 min-[1200px]:hover:shadow-[0_0_40px_rgba(0,255,136,0.15)] min-[1600px]:p-[45px] min-[768px]:max-[1199px]:p-7 max-[380px]:p-[15px] max-[380px]:gap-[15px] max-[500px]:max-h-[500px]:landscape:flex-1 max-[500px]:max-h-[500px]:landscape:p-[15px] hover:touch:transform-none active:touch:scale-98"
              onClick={() => setMode("join")}
            >
              <span className="text-[2rem] text-br-accent font-['Courier_New',monospace] w-[50px] h-[50px] flex items-center justify-center border-2 border-br-accent/30 rounded-lg max-[480px]:w-10 max-[480px]:h-10 max-[480px]:text-2xl min-[1200px]:w-[70px] min-[1200px]:h-[70px] min-[1200px]:text-[2.8rem] min-[1200px]:rounded-[14px] min-[1600px]:w-20 min-[1600px]:h-20 min-[1600px]:text-5xl max-[380px]:w-[35px] max-[380px]:h-[35px] max-[380px]:text-[1.2rem]">→</span>
              <span className="flex flex-col gap-[5px]">
                <span className="font-['Courier_New',monospace] text-[1.2rem] font-bold text-br-accent tracking-[2px] max-[480px]:text-base min-[1200px]:text-[1.6rem] min-[1200px]:tracking-[4px] min-[1600px]:text-[1.8rem] max-[380px]:text-[0.9rem]">JOIN ROOM</span>
                <span className="text-[0.85rem] text-white/50 min-[1200px]:text-[1.1rem] max-[380px]:text-xs">Enter code to join existing room</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create room flow
  if (mode === "create") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-5 max-[480px]:items-start max-[480px]:p-3 max-[500px]:max-h-[500px]:landscape:p-[10px_20px] max-[500px]:max-h-[500px]:landscape:items-start">
        <div className="max-w-[500px] w-full relative max-[480px]:max-w-full max-[480px]:pt-2 min-[1200px]:max-w-[700px] min-[1200px]:p-15 min-[1600px]:max-w-[800px] min-[1600px]:p-20 min-[768px]:max-[1199px]:max-w-[550px] max-[500px]:max-h-[500px]:landscape:max-w-full">
          <button className="absolute -top-15 left-0 bg-transparent border-none text-white/50 font-['Courier_New',monospace] text-[0.9rem] cursor-pointer p-[10px_0] transition-colors duration-300 hover:text-br-accent max-[480px]:static max-[480px]:mb-3 min-[1200px]:-top-[90px] min-[1200px]:text-[1.1rem] min-[1200px]:p-[12px_25px] max-[500px]:max-h-[500px]:landscape:fixed max-[500px]:max-h-[500px]:landscape:top-[10px] max-[500px]:max-h-[500px]:landscape:left-[10px]" onClick={() => { setMode("menu"); setIsWaiting(false); setRoomCode(""); }}>
            ← BACK
          </button>

          {!isWaiting ? (
            <>
              <div className="text-center mb-10 min-[1200px]:mb-10 max-[500px]:max-h-[500px]:landscape:mb-5">
                <h1 className="font-['Courier_New',monospace] text-[2.5rem] text-br-accent m-0 tracking-[4px] [text-shadow:0_0_20px_rgba(0,255,136,0.5)] max-[480px]:text-[1.8rem] min-[1200px]:text-[3.5rem] min-[1200px]:tracking-[8px] min-[1600px]:text-[4rem] min-[1600px]:tracking-[10px] min-[768px]:max-[1199px]:text-[2.2rem] max-[380px]:text-[1.5rem] max-[380px]:tracking-[2px] max-[500px]:max-h-[500px]:landscape:text-[1.5rem]">CREATE ROOM</h1>
                <p className="font-['Courier_New',monospace] text-base text-[#0088ff] mt-[10px] min-[1200px]:text-[1.3rem] min-[1200px]:mt-5 min-[1600px]:text-[1.5rem]">&gt; SELECT GAME MODE_</p>
              </div>

              <div className="flex gap-[15px] mb-[30px] max-[480px]:flex-col max-[480px]:gap-3 min-[1200px]:gap-[30px] min-[1200px]:mb-[50px] max-[500px]:max-h-[500px]:landscape:flex-row max-[500px]:max-h-[500px]:landscape:mb-[15px]">
                <button 
                  className={`flex-1 p-[25px_20px] bg-white/[0.03] border-2 border-white/10 rounded-lg cursor-pointer transition-all duration-300 flex flex-col items-center gap-[10px] hover:bg-br-accent/5 hover:border-br-accent/30 max-[480px]:p-4 min-[1200px]:p-[40px_35px] min-[1200px]:rounded-2xl min-[1600px]:p-[45px_40px] max-[380px]:p-[18px_15px] max-[500px]:max-h-[500px]:landscape:p-[15px] ${gameMode === "standard" ? "bg-br-accent/10 border-br-accent shadow-[0_0_20px_rgba(0,255,136,0.2)] min-[1200px]:shadow-[0_0_40px_rgba(0,255,136,0.3)]" : ""}`}
                  onClick={() => setGameMode("standard")}
                >
                  <span className={`text-[2rem] ${gameMode === "standard" ? "text-br-accent" : "text-white/50"} min-[1200px]:text-5xl min-[1600px]:text-[3.5rem] max-[380px]:text-2xl`}>∞</span>
                  <span className={`font-['Courier_New',monospace] text-[1.1rem] font-bold tracking-[2px] ${gameMode === "standard" ? "text-br-accent" : "text-white/70"} min-[1200px]:text-[1.4rem] max-[380px]:text-base`}>STANDARD</span>
                  <span className="text-[0.8rem] text-white/40 min-[1200px]:text-base">Unlimited time</span>
                </button>

                <button 
                  className={`flex-1 p-[25px_20px] bg-white/[0.03] border-2 border-white/10 rounded-lg cursor-pointer transition-all duration-300 flex flex-col items-center gap-[10px] hover:bg-br-accent/5 hover:border-br-accent/30 max-[480px]:p-4 min-[1200px]:p-[40px_35px] min-[1200px]:rounded-2xl min-[1600px]:p-[45px_40px] max-[380px]:p-[18px_15px] max-[500px]:max-h-[500px]:landscape:p-[15px] ${gameMode === "blitz" ? "bg-br-accent/10 border-br-accent shadow-[0_0_20px_rgba(0,255,136,0.2)] min-[1200px]:shadow-[0_0_40px_rgba(0,255,136,0.3)]" : ""}`}
                  onClick={() => setGameMode("blitz")}
                >
                  <span className={`text-[2rem] ${gameMode === "blitz" ? "text-br-accent" : "text-white/50"} min-[1200px]:text-5xl min-[1600px]:text-[3.5rem] max-[380px]:text-2xl`}>⚡</span>
                  <span className={`font-['Courier_New',monospace] text-[1.1rem] font-bold tracking-[2px] ${gameMode === "blitz" ? "text-br-accent" : "text-white/70"} min-[1200px]:text-[1.4rem] max-[380px]:text-base`}>BLITZ</span>
                  <span className="text-[0.8rem] text-white/40 min-[1200px]:text-base">5 minute timer</span>
                </button>
              </div>

              <button className="w-full p-[18px] bg-[linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,255,136,0.1))] border-2 border-br-accent rounded-lg text-br-accent font-['Courier_New',monospace] text-[1.1rem] font-bold tracking-[3px] cursor-pointer transition-all duration-300 hover:bg-br-accent/30 hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] disabled:opacity-50 disabled:cursor-not-allowed min-[1200px]:p-[22px_60px] min-[1200px]:text-[1.2rem] min-[1200px]:rounded-xl max-[380px]:p-[14px_25px] max-[380px]:text-[0.9rem] hover:touch:transform-none active:touch:scale-98 hover:touch:min-h-[60px]" onClick={createRoom}>
                GENERATE ROOM CODE
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="text-center mb-10 min-[1200px]:mb-10 max-[500px]:max-h-[500px]:landscape:mb-5">
                <h1 className="font-['Courier_New',monospace] text-[2.5rem] text-br-accent m-0 tracking-[4px] [text-shadow:0_0_20px_rgba(0,255,136,0.5)] max-[480px]:text-[1.8rem] min-[1200px]:text-[3.5rem] min-[1200px]:tracking-[8px] min-[1600px]:text-[4rem] min-[1600px]:tracking-[10px] min-[768px]:max-[1199px]:text-[2.2rem] max-[380px]:text-[1.5rem] max-[380px]:tracking-[2px] max-[500px]:max-h-[500px]:landscape:text-[1.5rem]">ROOM CREATED</h1>
                <p className="font-['Courier_New',monospace] text-base text-[#0088ff] mt-[10px] min-[1200px]:text-[1.3rem] min-[1200px]:mt-5 min-[1600px]:text-[1.5rem]">&gt; SHARE THIS CODE_</p>
              </div>

              <div className="my-[30px] min-[1200px]:my-10">
                <span className="block font-['Courier_New',monospace] text-[0.9rem] text-white/50 mb-[15px]">ACCESS CODE:</span>
                <div className="flex justify-center gap-[10px] mb-[15px] min-[1200px]:gap-5 max-[500px]:max-h-[500px]:landscape:gap-2">
                  {roomCode.split("").map((char, i) => (
                    <span key={i} className="w-[60px] h-[70px] flex items-center justify-center bg-br-accent/10 border-2 border-br-accent rounded-lg font-['Courier_New',monospace] text-[2rem] font-bold text-br-accent [text-shadow:0_0_10px_rgba(0,255,136,0.5)] max-[480px]:w-[50px] max-[480px]:h-[60px] max-[480px]:text-[1.6rem] min-[1200px]:w-[90px] min-[1200px]:h-[110px] min-[1200px]:text-[3.5rem] min-[1200px]:rounded-[14px] min-[1600px]:w-[100px] min-[1600px]:h-[120px] min-[1600px]:text-[4rem] min-[768px]:max-[1199px]:w-[65px] min-[768px]:max-[1199px]:h-20 min-[768px]:max-[1199px]:text-[2.2rem] max-[380px]:w-[45px] max-[380px]:h-[55px] max-[380px]:text-[1.4rem] max-[500px]:max-h-[500px]:landscape:w-[50px] max-[500px]:max-h-[500px]:landscape:h-[60px] max-[500px]:max-h-[500px]:landscape:text-[1.8rem]">{char}</span>
                  ))}
                </div>
                <button className="p-[10px_25px] bg-transparent border border-br-accent/50 rounded text-br-accent font-['Courier_New',monospace] text-[0.9rem] cursor-pointer transition-all duration-300 hover:bg-br-accent/10" onClick={copyCode}>
                  {copied ? "✓ COPIED" : "COPY"}
                </button>
              </div>

              <div className="flex items-center justify-center gap-[15px] text-white/70 font-['Courier_New',monospace] text-[0.95rem] my-[25px]">
                <div className="w-5 h-5 border-2 border-br-accent/30 border-t-br-accent rounded-full animate-spin"></div>
                <span>{status}</span>
              </div>

              <div className="font-['Courier_New',monospace] text-[0.9rem] text-white/50 mb-[25px]">
                Mode: <span className="text-[#0088ff]">{gameMode.toUpperCase()}</span>
              </div>

              <button className="p-[12px_30px] bg-transparent border border-[rgba(255,0,128,0.5)] rounded text-[#ff0080] font-['Courier_New',monospace] text-[0.9rem] cursor-pointer transition-all duration-300 hover:bg-[rgba(255,0,128,0.1)] hover:border-[#ff0080]" onClick={cancelWaiting}>
                CANCEL
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Join room flow
  if (mode === "join") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-5 max-[480px]:items-start max-[480px]:p-3 max-[500px]:max-h-[500px]:landscape:p-[10px_20px] max-[500px]:max-h-[500px]:landscape:items-start">
        <div className="max-w-[500px] w-full relative max-[480px]:max-w-full max-[480px]:pt-2 min-[1200px]:max-w-[700px] min-[1200px]:p-15 min-[1600px]:max-w-[800px] min-[1600px]:p-20 min-[768px]:max-[1199px]:max-w-[550px] max-[500px]:max-h-[500px]:landscape:max-w-full">
          <button className="absolute -top-15 left-0 bg-transparent border-none text-white/50 font-['Courier_New',monospace] text-[0.9rem] cursor-pointer p-[10px_0] transition-colors duration-300 hover:text-br-accent max-[480px]:static max-[480px]:mb-3 min-[1200px]:-top-[90px] min-[1200px]:text-[1.1rem] min-[1200px]:p-[12px_25px] max-[500px]:max-h-[500px]:landscape:fixed max-[500px]:max-h-[500px]:landscape:top-[10px] max-[500px]:max-h-[500px]:landscape:left-[10px]" onClick={() => { setMode("menu"); setStatus(""); }}>
            ← BACK
          </button>

          <div className="text-center mb-10 min-[1200px]:mb-10 max-[500px]:max-h-[500px]:landscape:mb-5">
            <h1 className="font-['Courier_New',monospace] text-[2.5rem] text-br-accent m-0 tracking-[4px] [text-shadow:0_0_20px_rgba(0,255,136,0.5)] max-[480px]:text-[1.8rem] min-[1200px]:text-[3.5rem] min-[1200px]:tracking-[8px] min-[1600px]:text-[4rem] min-[1600px]:tracking-[10px] min-[768px]:max-[1199px]:text-[2.2rem] max-[380px]:text-[1.5rem] max-[380px]:tracking-[2px] max-[500px]:max-h-[500px]:landscape:text-[1.5rem]">JOIN ROOM</h1>
            <p className="font-['Courier_New',monospace] text-base text-[#0088ff] mt-[10px] min-[1200px]:text-[1.3rem] min-[1200px]:mt-5 min-[1600px]:text-[1.5rem]">&gt; ENTER ACCESS CODE_</p>
          </div>

          <div className="text-center">
            <div className="flex justify-center gap-3 mb-5 min-[1200px]:gap-5">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="w-[60px] h-[70px] bg-[rgba(0,136,255,0.05)] border-2 border-[rgba(0,136,255,0.3)] rounded-lg text-[#0088ff] font-['Courier_New',monospace] text-[2rem] font-bold text-center uppercase outline-none transition-all duration-300 focus:border-[#0088ff] focus:bg-[rgba(0,136,255,0.1)] focus:shadow-[0_0_20px_rgba(0,136,255,0.3)] max-[480px]:w-[50px] max-[480px]:h-[60px] max-[480px]:text-[1.6rem] min-[1200px]:w-[90px] min-[1200px]:h-[100px] min-[1200px]:text-[2.8rem] min-[1200px]:rounded-xl min-[1600px]:w-[100px] min-[1600px]:h-[110px] min-[1600px]:text-5xl min-[768px]:max-[1199px]:w-[65px] min-[768px]:max-[1199px]:h-20 min-[768px]:max-[1199px]:text-[2.2rem] max-[380px]:w-[45px] max-[380px]:h-[55px] max-[380px]:text-[1.4rem] hover:touch:min-h-[60px] touch:text-[1.8rem] touch:caret-[#0088ff]"
                  value={inputCode[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    if (/^[A-Z0-9]?$/.test(val)) {
                      const newCode = inputCode.split("");
                      newCode[i] = val;
                      setInputCode(newCode.join(""));
                      // Auto-focus next input
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
                      joinRoom();
                    }
                  }}
                />
              ))}
            </div>

            {status && <p className="font-['Courier_New',monospace] text-[0.9rem] text-[#ff0080] mb-5">{status}</p>}

            <button 
              className="w-full p-[18px] bg-[linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,255,136,0.1))] border-2 border-br-accent rounded-lg text-br-accent font-['Courier_New',monospace] text-[1.1rem] font-bold tracking-[3px] cursor-pointer transition-all duration-300 hover:bg-br-accent/30 hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] disabled:opacity-50 disabled:cursor-not-allowed min-[1200px]:p-[22px_60px] min-[1200px]:text-[1.2rem] min-[1200px]:rounded-xl max-[380px]:p-[14px_25px] max-[380px]:text-[0.9rem] hover:touch:transform-none active:touch:scale-98 hover:touch:min-h-[60px]"
              onClick={joinRoom}
              disabled={inputCode.length !== 4}
            >
              CONNECT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default Lobby;
