import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import "./App.css";

// CHANGE THIS URL WHEN DEPLOYING (Use "http://localhost:3001" for local dev)
const socket = io.connect("https://cab-server-5ic9.onrender.com"); 

function App() {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("Waiting for opponent...");
  
  // Game State
  const [secret, setSecret] = useState("");
  const [secretLocked, setSecretLocked] = useState(false);
  const [guess, setGuess] = useState("");
  
  // Notebook Logs
  const [defenseLog, setDefenseLog] = useState([]); // Opponent's guesses on me
  const [attackLog, setAttackLog] = useState([]);   // My guesses on opponent

  useEffect(() => {
    socket.on("role_assigned", (r) => setRole(r));
    
    socket.on("game_ready", () => setStatus("Game Start! Set your Secret Code."));
    
    socket.on("opponent_set_secret", () => {
        alert("Opponent has locked their code!");
    });

    socket.on("guess_result", (data) => {
        setAttackLog((prev) => [data, ...prev]);
    });

    socket.on("opponent_guessed", (data) => {
        setDefenseLog((prev) => [data, ...prev]);
    });

    socket.on("game_over", (data) => {
        alert(data.winner === role ? "YOU WON! 🎉" : "YOU LOST! 💀");
        window.location.reload();
    });

  }, [socket, role]);

  const joinRoom = () => {
    if (room !== "") {
      socket.emit("join_room", room);
      setJoined(true);
    }
  };

  const lockSecret = () => {
    if (secret.length !== 4) return alert("Must be 4 digits");
    socket.emit("set_secret", { room, code: secret, role });
    setSecretLocked(true);
    setStatus("Code Locked. Start Guessing!");
  };

  const sendGuess = () => {
    if (guess.length !== 4) return alert("Must be 4 digits");
    socket.emit("send_guess", { room, guess, role });
    setGuess("");
  };

  // RENDER SETUP SCREEN
  if (!joined) {
    return (
      <div className="App setup">
        <h1>Cows & Bulls Online</h1>
        <input placeholder="Room ID (e.g. room1)" onChange={(e) => setRoom(e.target.value)} />
        <button onClick={joinRoom}>Join Game</button>
      </div>
    );
  }

  // RENDER GAME SCREEN
  return (
    <div className="App game">
      <div className="header">
        <h2>Room: {room} | You are {role}</h2>
        <p>{status}</p>
      </div>

      {/* SECRET CODE SECTION */}
      {!secretLocked ? (
        <div className="secret-section">
          <input type="password" placeholder="Set Secret (4 digits)" onChange={(e) => setSecret(e.target.value)} />
          <button onClick={lockSecret}>Lock</button>
        </div>
      ) : (
        <div className="secret-display">My Secret: {secret}</div>
      )}

      {/* NOTEBOOK SPLIT VIEW */}
      <div className="notebook">
        {/* LEFT: DEFENSE */}
        <div className="column defense">
          <h3>MY NUMBER (Defense)</h3>
          <div className="logs">
            {defenseLog.map((log, i) => (
              <div key={i} className="log-row">
                <span>{log.guess}</span>
                <span className="score">+{log.plus} -{log.minus}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: ATTACK */}
        <div className="column attack">
          <h3>GUESSING (Attack)</h3>
          <div className="input-area">
            <input 
                value={guess} 
                onChange={(e) => setGuess(e.target.value)} 
                placeholder="Guess..." 
                disabled={!secretLocked}
            />
            <button onClick={sendGuess} disabled={!secretLocked}>Go</button>
          </div>
          <div className="logs">
            {attackLog.map((log, i) => (
              <div key={i} className="log-row">
                <span>{log.guess}</span>
                <span className="score">+{log.plus} -{log.minus}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;