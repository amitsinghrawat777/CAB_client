import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const randomName = () => `Player-${Math.floor(Math.random() * 900 + 100)}`;
const COOKIE_KEY = "br_history";
const COOKIE_MAX_BYTES = 3800;
const isUniqueDigits = (val) => typeof val === "string" && val.length === 4 && new Set(val).size === 4 && /^\d{4}$/.test(val);

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
  const [eSport, setESport] = useState(false);
  const [view, setView] = useState("menu"); // menu | create | join | lobby | game
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const supabaseClient = useMemo(() => getSupabaseClient(), []);
  const inputRefs = useRef([]);
  const leaderboard = useMemo(() => players || [], [players]);

  useEffect(() => {
    if (!socket) return;
    setSocketId(socket.id);
    const handleConnect = () => setSocketId(socket.id);
    socket.on("connect", handleConnect);
    return () => socket.off("connect", handleConnect);
  }, [socket]);

  const writeHistoryCookie = useCallback((entry) => {
    try {
      const payload = { ...entry };
      payload.attempts = [...(entry.attempts || [])];
      let encoded = encodeURIComponent(JSON.stringify(payload));
      while (encoded.length > COOKIE_MAX_BYTES && payload.attempts.length > 0) {
        payload.attempts.pop();
        encoded = encodeURIComponent(JSON.stringify(payload));
      }
      document.cookie = `${COOKIE_KEY}=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (err) {
      console.error("Failed to write cookie", err);
    }
  }, []);

  const persistBattleHistory = useCallback(async (payload = {}) => {
    const attempts = [...(history || [])]
      .slice(0, 50)
      .reverse()
      .map((h) => ({ guess: h.guess, bulls: h.bulls, cows: h.cows, score: h.score, moves: h.moves }));

    const leaderboardSnapshot = (payload.leaderboard || leaderboard || []).map((p) => ({
      name: p.name,
      best_score: p.best_score,
      moves: p.moves,
    }));

    const entry = {
      roomCode: payload.roomCode || roomCode,
      mode,
      winner: payload.winner ?? null,
      secret: payload.secret ?? null,
      reason: payload.reason ?? null,
      playerName: name,
      attempts,
      leaderboard: leaderboardSnapshot,
      playersCount: leaderboardSnapshot.length || players.length || null,
      isHost,
      endedAt: new Date().toISOString(),
    };

    writeHistoryCookie(entry);

    if (!supabaseClient) return;

    try {
      const { error: supabaseError } = await supabaseClient.from("battle_history").insert({
        room_code: entry.roomCode,
        mode: entry.mode,
        winner: entry.winner,
        secret: entry.secret,
        reason: entry.reason,
        player_name: entry.playerName,
        attempts: entry.attempts,
        leaderboard: entry.leaderboard,
        players_count: entry.playersCount,
        is_host: entry.isHost,
        ended_at: entry.endedAt,
      });

      if (supabaseError) {
        throw supabaseError;
      }
    } catch (err) {
      console.error("Supabase save failed", err);
      setError("Saved locally; Supabase unavailable");
    }
  }, [history, leaderboard, roomCode, mode, name, players.length, isHost, supabaseClient, writeHistoryCookie]);

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
      setESport(!!data.eSport);
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
      setESport(!!data.eSport);
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
      if (payload.eSport !== undefined) setESport(!!payload.eSport);
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
          matches: data.bulls + data.cows,
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
      void persistBattleHistory(payload);
    };

    const handleError = (payload = {}) => {
      setError(payload.message || "Something went wrong");
    };

    const handleHostChanged = (payload = {}) => {
      const amHost = payload.host ? payload.host === (socket?.id || socketId) : !!payload.isHost;
      setIsHost(amHost);
      setStatus(amHost ? "You are host now." : "Waiting for host to start");
    };

    const handlePlayerHistory = (payload = {}) => {
      setSelectedPlayer({ id: payload.playerId, name: payload.name || "Unknown" });
      setSelectedHistory(payload.history || []);
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
    socket.on("battle_player_history", handlePlayerHistory);

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
      socket.off("battle_player_history", handlePlayerHistory);
    };
  }, [socket, socketId, persistBattleHistory]);

  const createRoom = () => {
    if (!socket) return;
    const safeMax = Math.min(200, Math.max(2, Number(maxPlayers) || 2));
    setMaxPlayers(safeMax);
    socket.emit("battle_create", { name, mode, maxPlayers: safeMax, eSport });
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
    if (!isUniqueDigits(guess)) {
      setError("Use 4 unique digits (no repeats)");
      return;
    }
    if (eSport && isHost) return; // host is spectator
    socket.emit("battle_guess", { roomCode, guess });
    setGuess("");
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  };

  const setDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    if (val && guess.includes(val) && guess[i] !== val) return; // prevent duplicate digits
    const next = guess.split("");
    next[i] = val;
    const joined = next.join("");
    setGuess(joined);
    if (val && i < 3 && inputRefs.current[i + 1]) {
      inputRefs.current[i + 1].focus();
    }
  };

  const myEntry = leaderboard.find((p) => p.name === name);

  const requestHistory = (playerId) => {
    if (!socket || !isHost || !eSport || !roomCode) return;
    socket.emit("battle_history_request", { roomCode, playerId });
  };

  const renderMenu = () => (
    <div className="max-w-[520px] mx-auto my-12 p-6 bg-br-card border border-br-accent/25 rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.35)] flex flex-col gap-3">
      <h2 className="text-2xl font-bold">Battle Royale</h2>
      <p className="text-br-dim -mt-1.5">Choose how you want to enter the arena.</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 my-2 mb-1">
        <button className="px-4 py-2.5 rounded-[10px] border border-br-accent/25 bg-gradient-to-br from-br-accent/[0.18] to-[rgba(0,136,255,0.1)] text-br-text cursor-pointer font-bold tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:border-br-accent" onClick={() => setView("create")}>Create Room</button>
        <button className="px-4 py-2.5 rounded-[10px] border border-br-accent/25 bg-gradient-to-br from-br-accent/[0.18] to-[rgba(0,136,255,0.1)] text-br-text cursor-pointer font-bold tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:border-br-accent" onClick={() => setView("join")}>Join Room</button>
      </div>
      <div className="flex flex-col gap-1.5">
        <label>Your Name</label>
        <input className="px-3 py-2.5 bg-black/45 border border-white/12 rounded-[10px] text-br-text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error && <div className="text-[#ffb3b3] text-sm">{error}</div>}
    </div>
  );

  const renderCreate = () => (
    <div className="max-w-[520px] mx-auto my-12 p-6 bg-br-card border border-br-accent/25 rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.35)] flex flex-col gap-3">
      <h3 className="text-xl font-bold">Create Room</h3>
      <label>Mode</label>
      <div className="flex gap-2.5 flex-wrap">
        <button className={`px-3.5 py-2.5 rounded-full border text-br-text cursor-pointer transition-all duration-200 ${mode === "normal" ? "border-br-accent bg-br-accent/15 shadow-[0_0_18px_rgba(0,255,136,0.2)]" : "border-white/20 bg-white/5"}`} onClick={() => setMode("normal")}>Normal</button>
        <button className={`px-3.5 py-2.5 rounded-full border text-br-text cursor-pointer transition-all duration-200 ${mode === "blitz" ? "border-br-accent bg-br-accent/15 shadow-[0_0_18px_rgba(0,255,136,0.2)]" : "border-white/20 bg-white/5"}`} onClick={() => setMode("blitz")}>Blitz (Timer)</button>
      </div>
      <label>Role</label>
      <div className="flex gap-2.5 flex-wrap">
        <button className={`px-3.5 py-2.5 rounded-full border text-br-text cursor-pointer transition-all duration-200 ${!eSport ? "border-br-accent bg-br-accent/15 shadow-[0_0_18px_rgba(0,255,136,0.2)]" : "border-white/20 bg-white/5"}`} onClick={() => setESport(false)}>Standard (Host plays)</button>
        <button className={`px-3.5 py-2.5 rounded-full border text-br-text cursor-pointer transition-all duration-200 ${eSport ? "border-br-accent bg-br-accent/15 shadow-[0_0_18px_rgba(0,255,136,0.2)]" : "border-white/20 bg-white/5"}`} onClick={() => setESport(true)}>E-sport (Host spectates)</button>
      </div>
      <label>Max Players (2-200)</label>
      <input
        className="px-3 py-2.5 bg-black/45 border border-white/12 rounded-[10px] text-br-text"
        type="number"
        min={2}
        max={200}
        value={maxPlayers}
        onChange={(e) => setMaxPlayers(Number(e.target.value))}
      />
      <button className="px-4 py-2.5 rounded-[10px] border border-br-accent/25 bg-gradient-to-br from-br-accent/[0.18] to-[rgba(0,136,255,0.1)] text-br-text cursor-pointer font-bold tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:border-br-accent" onClick={createRoom}>Create & Join</button>
      <button className="px-4 py-2.5 rounded-[10px] border border-white/20 bg-transparent text-br-text cursor-pointer font-bold tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:border-br-accent" onClick={() => setView("menu")}>Back</button>
      {error && <div className="text-[#ffb3b3] text-sm">{error}</div>}
    </div>
  );

  const renderJoin = () => (
    <div className="max-w-[520px] mx-auto my-12 p-6 bg-br-card border border-br-accent/25 rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.35)] flex flex-col gap-3">
      <h3 className="text-xl font-bold">Join Room</h3>
      <label>Room Code</label>
      <input
        className="px-3 py-2.5 bg-black/45 border border-white/12 rounded-[10px] text-br-text"
        type="text"
        maxLength={4}
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
      />
      <label>Your Name</label>
      <input className="px-3 py-2.5 bg-black/45 border border-white/12 rounded-[10px] text-br-text" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="px-4 py-2.5 rounded-[10px] border border-br-accent/25 bg-gradient-to-br from-br-accent/[0.18] to-[rgba(0,136,255,0.1)] text-br-text cursor-pointer font-bold tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:border-br-accent" onClick={joinRoom}>Join</button>
      <button className="px-4 py-2.5 rounded-[10px] border border-white/20 bg-transparent text-br-text cursor-pointer font-bold tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:border-br-accent" onClick={() => setView("menu")}>Back</button>
      {error && <div className="text-[#ffb3b3] text-sm">{error}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,136,0.06),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(0,136,255,0.05),transparent_30%),#0a0a0f] text-br-text font-jetbrains flex flex-col">
      {view === "menu" && renderMenu()}
      {view === "create" && renderCreate()}
      {view === "join" && renderJoin()}

      {view !== "menu" && view !== "create" && view !== "join" && (
        <>
          <header className="grid grid-cols-[1fr_auto] items-center gap-3 p-4 border-b border-white/8 bg-black/35 max-[480px]:grid-cols-1">
            <div className="flex items-center gap-3 flex-wrap max-[480px]:w-full">
              <div className="px-3.5 py-2.5 bg-br-card border border-br-accent/25 rounded-[10px] text-[0.95rem]">ROOM: {roomCode || "..."}</div>
              <div className="px-3.5 py-2.5 bg-br-card border border-br-accent/25 rounded-[10px] text-[0.95rem]">YOU: {name}</div>
              <div className="px-3.5 py-2.5 bg-br-card border border-br-accent/25 rounded-[10px] text-[0.95rem]">MODE: {mode.toUpperCase()}</div>
              {timeLeft !== null && <div className="px-3.5 py-2.5 bg-br-card border border-br-accent/25 rounded-[10px] text-[0.95rem]">⏱ {timeLeft}s</div>}
            </div>
            <div className="flex items-center gap-3 shrink-0 max-[480px]:w-full max-[480px]:justify-end">
              {isHost && !started && (
                <button className="px-4 py-2.5 rounded-[10px] border border-br-accent/25 bg-gradient-to-br from-br-accent/[0.18] to-[rgba(0,136,255,0.1)] text-br-text cursor-pointer font-bold tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:border-br-accent" onClick={startGame}>
                  Start Battle
                </button>
              )}
              <button className="px-4 py-2.5 rounded-[10px] border border-white/20 bg-transparent text-br-text cursor-pointer font-bold tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:border-br-accent" onClick={onBack}>Exit</button>
            </div>
          </header>

          <main className="grid grid-cols-1 gap-4 p-4 min-[900px]:grid-cols-[1.1fr_1fr] min-[900px]:items-start">
            <section className="bg-br-card border border-br-accent/25 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <div className="grid grid-cols-[70px_1fr_140px] px-3.5 py-3 items-center gap-2.5 bg-white/5 uppercase tracking-widest font-bold text-[0.8rem] text-br-dim max-[480px]:grid-cols-[60px_1fr_100px]">
                <span>Rank</span>
                <span>Player</span>
                <span>Score</span>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {leaderboard.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[70px_1fr_140px] px-3.5 py-3 items-center gap-2.5 border-t border-white/5 max-[480px]:grid-cols-[60px_1fr_100px] ${p.best_score > 30 ? "bg-br-hot/12 border-l-[3px] border-l-br-hot text-[#ffdce5]" : ""} ${p.name === name ? "bg-br-accent/[0.07] border-l-[3px] border-l-br-accent" : ""}`}
                    onClick={() => (isHost && eSport ? requestHistory(p.id) : null)}
                    style={{ cursor: isHost && eSport ? "pointer" : "default" }}
                  >
                    <span className="font-bold text-br-dim">{idx + 1}</span>
                    <span className="font-bold tracking-wider">{p.name}</span>
                    <span className="justify-self-end text-[0.95rem] text-br-info max-[480px]:text-[0.85rem]">{p.best_score} (moves {p.moves})</span>
                  </div>
                ))}
                {leaderboard.length === 0 && <div className="p-4 text-center text-br-dim">Waiting for players...</div>}
              </div>
            </section>

            <section className="bg-br-panel border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.3)]">
              <div className="text-br-dim text-[0.95rem]">{status}{eSport && isHost ? " | Spectating" : ""}</div>
              {gameOver && (
                <div className="bg-black/35 border border-white/12 rounded-[10px] p-3 text-br-text">
                  <div>Winner: {gameOver.winner}</div>
                  <div>Code: {gameOver.secret}</div>
                  {gameOver.reason === "timeout" && <div>Timer expired</div>}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5 items-center w-full min-[900px]:grid-cols-[auto_180px] max-[480px]:grid-cols-1">
                <div className="grid grid-cols-4 gap-3 max-w-[420px] w-full mx-auto max-[480px]:grid-cols-[repeat(4,minmax(72px,1fr))] max-[480px]:gap-4 max-[480px]:max-w-none">
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
                      disabled={!started || !!gameOver || (eSport && isHost)}
                      className="text-center text-[2.2rem] font-bold p-0 bg-black/80 border-[3px] border-br-accent/60 rounded-xl text-br-text transition-all duration-200 min-h-[75px] min-w-[75px] shadow-[0_0_20px_rgba(0,255,136,0.35)] caret-br-accent leading-none focus:outline-none focus:border-br-accent focus:shadow-[0_0_28px_rgba(0,255,136,0.5)] focus:bg-black/90 focus:scale-105 max-[480px]:text-[2.6rem] max-[480px]:border-[3px] max-[480px]:min-h-[85px] max-[480px]:min-w-[80px] max-[480px]:bg-black/[0.88] max-[480px]:shadow-[0_0_24px_rgba(0,255,136,0.5)] max-[480px]:focus:shadow-[0_0_32px_rgba(0,255,136,0.65)] max-[480px]:focus:scale-[1.03]"
                    />
                  ))}
                </div>
                <button
                  className="px-4 py-2.5 rounded-[10px] border border-br-accent/25 bg-gradient-to-br from-br-accent/[0.18] to-[rgba(0,136,255,0.1)] text-br-text cursor-pointer font-bold tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:border-br-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={submitGuess}
                  disabled={!started || guess.length !== 4 || !isUniqueDigits(guess) || !!gameOver || (eSport && isHost)}
                >
                  {eSport && isHost ? "Spectating" : "Submit Guess"}
                </button>
              </div>

              <div className="bg-black/40 border border-white/8 rounded-[10px] p-3 max-h-[260px] overflow-y-auto flex flex-col gap-2.5 min-[900px]:max-h-[320px]">
                <div className="font-bold text-br-dim">
                  {eSport && isHost
                    ? selectedPlayer
                      ? `${selectedPlayer.name}'s Attempts`
                      : "Select a player to view attempts"
                    : "Your Attempts"}
                </div>
                {(eSport && isHost ? selectedHistory : history).length === 0 && (
                  <div className="text-center text-br-dim">No attempts yet.</div>
                )}
                {(eSport && isHost ? selectedHistory : history).map((h) => (
                  <div key={h.ts} className="flex justify-between px-2.5 py-2 rounded-lg bg-br-accent/[0.06] border border-br-accent/20">
                    <span className="tracking-[0.12em] font-bold">{h.guess}</span>
                    <span className="text-br-info font-semibold">+{(h.matches ?? h.cows + h.bulls)} -{h.bulls} | {h.score}</span>
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
