import React, { useState, useEffect, useRef } from "react";
import "./Lobby.css";

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
      <div className="lobby">
        <div className="lobby-container">
          <button className="back-btn" onClick={onBack}>
            ← BACK
          </button>
          
          <div className="lobby-header">
            <h1>ONLINE PvP</h1>
            <p className="subtitle">&gt; SELECT OPERATION_</p>
          </div>

          <div className="lobby-options">
            <button 
              className="lobby-option create-btn"
              onClick={() => setMode("create")}
            >
              <span className="option-icon">+</span>
              <span className="option-text">
                <span className="option-title">CREATE ROOM</span>
                <span className="option-desc">Generate code & wait for challenger</span>
              </span>
            </button>

            <button 
              className="lobby-option join-btn"
              onClick={() => setMode("join")}
            >
              <span className="option-icon">→</span>
              <span className="option-text">
                <span className="option-title">JOIN ROOM</span>
                <span className="option-desc">Enter code to join existing room</span>
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
      <div className="lobby">
        <div className="lobby-container">
          <button className="back-btn" onClick={() => { setMode("menu"); setIsWaiting(false); setRoomCode(""); }}>
            ← BACK
          </button>

          {!isWaiting ? (
            <>
              <div className="lobby-header">
                <h1>CREATE ROOM</h1>
                <p className="subtitle">&gt; SELECT GAME MODE_</p>
              </div>

              <div className="mode-selection">
                <button 
                  className={`mode-btn ${gameMode === "standard" ? "active" : ""}`}
                  onClick={() => setGameMode("standard")}
                >
                  <span className="mode-icon">∞</span>
                  <span className="mode-name">STANDARD</span>
                  <span className="mode-desc">Unlimited time</span>
                </button>

                <button 
                  className={`mode-btn ${gameMode === "blitz" ? "active" : ""}`}
                  onClick={() => setGameMode("blitz")}
                >
                  <span className="mode-icon">⚡</span>
                  <span className="mode-name">BLITZ</span>
                  <span className="mode-desc">5 minute timer</span>
                </button>
              </div>

              <button className="action-btn" onClick={createRoom}>
                GENERATE ROOM CODE
              </button>
            </>
          ) : (
            <div className="waiting-section">
              <div className="lobby-header">
                <h1>ROOM CREATED</h1>
                <p className="subtitle">&gt; SHARE THIS CODE_</p>
              </div>

              <div className="room-code-display">
                <span className="code-label">ACCESS CODE:</span>
                <div className="code-box">
                  {roomCode.split("").map((char, i) => (
                    <span key={i} className="code-char">{char}</span>
                  ))}
                </div>
                <button className="copy-btn" onClick={copyCode}>
                  {copied ? "✓ COPIED" : "COPY"}
                </button>
              </div>

              <div className="waiting-status">
                <div className="loader"></div>
                <span>{status}</span>
              </div>

              <div className="game-mode-badge">
                Mode: <span className="highlight">{gameMode.toUpperCase()}</span>
              </div>

              <button className="cancel-btn" onClick={cancelWaiting}>
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
      <div className="lobby">
        <div className="lobby-container">
          <button className="back-btn" onClick={() => { setMode("menu"); setStatus(""); }}>
            ← BACK
          </button>

          <div className="lobby-header">
            <h1>JOIN ROOM</h1>
            <p className="subtitle">&gt; ENTER ACCESS CODE_</p>
          </div>

          <div className="join-section">
            <div className="code-input-container">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="code-input"
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

            {status && <p className="status-message">{status}</p>}

            <button 
              className="action-btn" 
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
