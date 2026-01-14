import React, { useEffect, useMemo, useRef, useState } from "react";
import "./BattleRoyale.css";

const randomName = () => `Player-${Math.floor(Math.random() * 900 + 100)}`;

function BattleRoyale({ socket, onBack }) {
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [guess, setGuess] = useState("");
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("Choose create or join");
  const [isHost, setIsHost] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState(() => randomName());
  const [gameOver, setGameOver] = useState(null);
  const [mode, setMode] = useState("normal");
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [view, setView] = useState("menu"); // menu | create | join | lobby | game
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!socket) return;
    setSocketId(socket.id);
    const handleConnect = () => setSocketId(socket.id);
    socket.on("connect", handleConnect);
    return () => socket.off("connect", handleConnect);
  }, [socket]);

  // Socket wiring
  useEffect(() => {
    if (!socket) return;

    const handleCreated = (data) => {
      setRoomCode(data.roomCode);
      setIsHost(true);
      setStarted(data.started);
      setPlayers(data.players || []);
      setMode(data.mode || "normal");
      setMaxPlayers(data.maxPlayers || 20);
      setView("lobby");
      setStatus("Lobby created. Wait for players, then start.");
      setError(null);
      setHistory([]);
      setGameOver(null);
      setTimeLeft(null);
      setGuess("");
    };

    const handleJoined = (data) => {
      setRoomCode(data.roomCode);
      setIsHost(data.host);
      setStarted(data.started);
      setPlayers(data.players || []);
      setMode(data.mode || "normal");
      setMaxPlayers(data.maxPlayers || 20);
      setView(data.started ? "game" : "lobby");
      setStatus(data.started ? "Battle started" : "Waiting for host to start");
      setError(null);
      setHistory([]);
      setGameOver(null);
      setTimeLeft(null);
      setGuess("");
    };

    const handleLeaderboard = (list) => {
      setPlayers(list || []);
    };

    const handleStarted = (payload = {}) => {
      setStarted(true);
      setView("game");
      setTimeLeft(payload.timeRemaining ?? null);
      setStatus("Battle started. Make your guess!");
      setHistory([]);
      setGameOver(null);
      setGuess("");
    };

    const handleTimer = (payload = {}) => {
      setTimeLeft(payload.timeRemaining ?? null);
    };

    const handleGuessResult = (data) => {
      setHistory((prev) => [
        {
          guess: data.guess,
          bulls: data.bulls,
          cows: data.cows,
          score: data.score,
          moves: data.moves,
          ts: Date.now(),
        },
        ...prev,
      ]);
    };

    const handleGameOver = (payload) => {
      setGameOver(payload);
      setStarted(false);
      setView("lobby");
      setStatus(`Winner: ${payload.winner ?? "N/A"} | Code: ${payload.secret}`);
      setTimeLeft(null);
    };

    const handleError = (payload = {}) => {
      setError(payload.message || "Something went wrong");
    };

    const handleHostChanged = (payload = {}) => {
      const amHost = payload.host ? payload.host === (socket?.id || socketId) : !!payload.isHost;
      setIsHost(amHost);
      setStatus(amHost ? "You are host now." : "Waiting for host to start");
    };

    socket.on("battle_created", handleCreated);
    socket.on("battle_joined", handleJoined);
    socket.on("battle_leaderboard", handleLeaderboard);
    socket.on("battle_started", handleStarted);
    socket.on("battle_timer", handleTimer);
    socket.on("battle_guess_result", handleGuessResult);
    socket.on("battle_game_over", handleGameOver);
    socket.on("battle_error", handleError);
    socket.on("battle_host_changed", handleHostChanged);

    return () => {
      socket.off("battle_created", handleCreated);
      socket.off("battle_joined", handleJoined);
      socket.off("battle_leaderboard", handleLeaderboard);
      socket.off("battle_started", handleStarted);
      socket.off("battle_timer", handleTimer);
      socket.off("battle_guess_result", handleGuessResult);
      socket.off("battle_game_over", handleGameOver);
      socket.off("battle_error", handleError);
      socket.off("battle_host_changed", handleHostChanged);
    };
  }, [socket, socketId]);

  const leaderboard = useMemo(() => players || [], [players]);

  const createRoom = () => {
    if (!socket) return;
    const safeMax = Math.min(200, Math.max(2, Number(maxPlayers) || 2));
    setMaxPlayers(safeMax);
    socket.emit("battle_create", { name, mode, maxPlayers: safeMax });
  };

  const joinRoom = () => {
    if (!socket || !joinCode) return;
    socket.emit("battle_join", { roomCode: joinCode, name });
  };

  const startGame = () => {
    if (socket && roomCode) {
      socket.emit("battle_start", { roomCode });
    }
  };

  const submitGuess = () => {
    if (!started || !roomCode || !guess || guess.length !== 4) return;
    socket.emit("battle_guess", { roomCode, guess });
    setGuess("");
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  };

  const setDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = guess.split("");
    next[i] = val;
    const joined = next.join("");
    setGuess(joined);
    if (val && i < 3 && inputRefs.current[i + 1]) {
      inputRefs.current[i + 1].focus();
    }
  };

  const myEntry = leaderboard.find((p) => p.name === name);

  const renderMenu = () => (
    <div className="br-card">
      <h2>Battle Royale</h2>
      <p className="br-sub">Choose how you want to enter the arena.</p>
      <div className="menu-actions">
        <button className="start-btn" onClick={() => setView("create")}>Create Room</button>
        <button className="start-btn" onClick={() => setView("join")}>Join Room</button>
      </div>
      <div className="name-field">
        <label>Your Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error && <div className="error-text">{error}</div>}
    </div>
  );

  const renderCreate = () => (
    <div className="br-card">
      <h3>Create Room</h3>
      <label>Mode</label>
      <div className="mode-choices">
        <button className={mode === "normal" ? "chip active" : "chip"} onClick={() => setMode("normal")}>Normal</button>
        <button className={mode === "blitz" ? "chip active" : "chip"} onClick={() => setMode("blitz")}>Blitz (Timer)</button>
      </div>
      <label>Max Players (2-200)</label>
      <input
        type="number"
        min={2}
        max={200}
        value={maxPlayers}
        onChange={(e) => setMaxPlayers(Number(e.target.value))}
      />
      <button className="start-btn" onClick={createRoom}>Create & Join</button>
      <button className="back-btn" onClick={() => setView("menu")}>Back</button>
      {error && <div className="error-text">{error}</div>}
    </div>
  );

  const renderJoin = () => (
    <div className="br-card">
      <h3>Join Room</h3>
      <label>Room Code</label>
      <input
        type="text"
        maxLength={4}
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
      />
      <label>Your Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button className="start-btn" onClick={joinRoom}>Join</button>
      <button className="back-btn" onClick={() => setView("menu")}>Back</button>
      {error && <div className="error-text">{error}</div>}
    </div>
  );

  return (
    <div className="battle-royale">
      {view === "menu" && renderMenu()}
      {view === "create" && renderCreate()}
      {view === "join" && renderJoin()}

      {view !== "menu" && view !== "create" && view !== "join" && (
        <>
          <header className="br-header">
            <div className="room-pill">ROOM: {roomCode || "..."}</div>
            <div className="player-pill">YOU: {name}</div>
            <div className="player-pill">MODE: {mode.toUpperCase()}</div>
            {timeLeft !== null && <div className="player-pill">⏱ {timeLeft}s</div>}
            {isHost && !started && (
              <button className="start-btn" onClick={startGame}>
                Start Battle
              </button>
            )}
            <button className="back-btn" onClick={onBack}>Exit</button>
          </header>

          <main className="br-main">
            <section className="leaderboard">
              <div className="lb-header">
                <span>Rank</span>
                <span>Player</span>
                <span>Score</span>
              </div>
              <div className="lb-body">
                {leaderboard.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`lb-row ${p.best_score > 30 ? "hot" : ""} ${p.name === name ? "me" : ""}`}
                  >
                    <span className="rank">{idx + 1}</span>
                    <span className="pname">{p.name}</span>
                    <span className="pscore">{p.best_score} (moves {p.moves})</span>
                  </div>
                ))}
                {leaderboard.length === 0 && <div className="lb-empty">Waiting for players...</div>}
              </div>
            </section>

            <section className="console">
              <div className="status">{status}</div>
              {gameOver && (
                <div className="gameover">
                  <div>Winner: {gameOver.winner}</div>
                  <div>Code: {gameOver.secret}</div>
                  {gameOver.reason === "timeout" && <div>Timer expired</div>}
                </div>
              )}

              <div className="guess-box">
                <div className="digits">
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      ref={(el) => (inputRefs.current[i] = el)}
                      value={guess[i] || ""}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !guess[i] && i > 0) {
                          inputRefs.current[i - 1]?.focus();
                        }
                        if (e.key === "Enter") {
                          submitGuess();
                        }
                      }}
                      disabled={!started || !!gameOver}
                      className="digit-input"
                    />
                  ))}
                </div>
                <button
                  className="guess-btn"
                  onClick={submitGuess}
                  disabled={!started || guess.length !== 4 || !!gameOver}
                >
                  Submit Guess
                </button>
              </div>

              <div className="history">
                <div className="history-title">Your Attempts</div>
                {history.length === 0 && <div className="history-empty">No attempts yet.</div>}
                {history.map((h) => (
                  <div key={h.ts} className="history-row">
                    <span className="h-guess">{h.guess}</span>
                    <span className="h-score">+{h.cows} -{h.bulls} | {h.score}</span>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </>
      )}
    </div>
  );
}

export default BattleRoyale;
