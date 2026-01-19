const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

app.use(cors());
app.get("/", (req, res) => res.json({ status: "ok" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ==========================================
// 🧠 GLOBAL STATE
// ==========================================
const rooms = {};        // 1v1 Duel Rooms
const battleRooms = {};  // Battle Royale Rooms
const socketToRoom = {}; // Fast Lookup { socketId: { roomCode, type } }
const timers = {};       // Duel Timers
const battleTimers = {}; // Battle Timers
const reconnectTimers = {}; // Grace period timers

// ==========================================
// 🛠️ HELPERS
// ==========================================
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function generateDigitCode() {
  const digits = "0123456789".split("");
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, 4).join("");
}

function computeCowsBulls(secret, guess) {
  let bulls = 0, cows = 0;
  const sArr = secret.split('');
  const gArr = guess.split('');
  
  // Bulls (Correct Position)
  for (let i = 0; i < 4; i++) {
    if (gArr[i] === sArr[i]) {
      bulls++;
      sArr[i] = null;
      gArr[i] = null;
    }
  }
  // Cows (Wrong Position)
  for (let i = 0; i < 4; i++) {
    if (gArr[i] !== null && sArr.includes(gArr[i])) {
      cows++;
      sArr[sArr.indexOf(gArr[i])] = null;
    }
  }
  return { bulls, cows };
}

function sortLeaderboard(players) {
  return [...players].sort((a, b) => {
    if (b.best_score !== a.best_score) return b.best_score - a.best_score;
    return a.moves - b.moves;
  });
}

// ==========================================
// 🔌 SOCKET LOGIC
// ==========================================
io.on("connection", (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  // --- ⚔️ DUEL MODE (1v1) ---

  socket.on("create_room", ({ mode }) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      mode: mode || "standard",
      p1: socket.id,
      p2: null,
      p1Secret: null,
      p2Secret: null,
      timeRemaining: mode === "blitz" ? 300 : null,
      gamePhase: "waiting",
      chat: [],
      rematchRequests: []
    };
    
    socketToRoom[socket.id] = { roomCode, type: "duel" };
    socket.join(roomCode);
    socket.emit("room_created", { roomCode, role: "Player 1", mode });
  });

  socket.on("join_room", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit("join_error", { message: "Room not found" });
    if (room.p2) return socket.emit("join_error", { message: "Room full" });

    room.p2 = socket.id;
    room.gamePhase = "setup";
    socketToRoom[socket.id] = { roomCode, type: "duel" };
    socket.join(roomCode);

    socket.emit("room_joined", { roomCode, role: "Player 2", mode: room.mode });
    io.to(room.p1).emit("opponent_joined", { role: "Player 2" });
    io.to(roomCode).emit("game_phase", { phase: "setup" });
  });

  // RESTORED: Rejoin Logic
  socket.on("rejoin_room", ({ roomCode, role }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit("rejoin_failed", { error: "Room expired" });

    // Update socket ID
    if (role === "Player 1") room.p1 = socket.id;
    else room.p2 = socket.id;

    socketToRoom[socket.id] = { roomCode, type: "duel" };
    socket.join(roomCode);

    // Cancel cleanup timer if exists
    if (reconnectTimers[roomCode]) {
      clearTimeout(reconnectTimers[roomCode]);
      delete reconnectTimers[roomCode];
    }

    socket.emit("rejoin_success", {
      phase: room.gamePhase,
      opponentReady: role === "Player 1" ? !!room.p2Secret : !!room.p1Secret,
      timeRemaining: room.timeRemaining
    });
    socket.to(roomCode).emit("opponent_reconnected");
  });

  socket.on("set_secret", ({ roomCode, code, role }) => {
    const room = rooms[roomCode];
    if (!room) return;
    
    if (role === "Player 1") room.p1Secret = code;
    else room.p2Secret = code;

    socket.to(roomCode).emit("opponent_ready");

    if (room.p1Secret && room.p2Secret) {
      room.gamePhase = "playing";
      io.to(roomCode).emit("game_phase", { phase: "playing" });
      if (room.mode === "blitz") startDuelTimer(roomCode);
    }
  });

  socket.on("send_guess", ({ roomCode, guess, role }) => {
    const room = rooms[roomCode];
    if (!room || room.gamePhase !== "playing") return;

    const secret = role === "Player 1" ? room.p2Secret : room.p1Secret;
    if (!secret) return;

    const { bulls, cows } = computeCowsBulls(secret, guess);
    const result = { guess, found: cows + bulls, locked: bulls };

    socket.emit("guess_result", result);
    socket.to(roomCode).emit("opponent_guessed", result);

    if (bulls === 4) {
      stopDuelTimer(roomCode);
      io.to(roomCode).emit("game_over", { 
        winner: role, 
        p1Secret: room.p1Secret, 
        p2Secret: room.p2Secret,
        reason: "cracked"
      });
      room.gamePhase = "gameover";
    }
  });

  // RESTORED: Chat
  socket.on("chat_message", ({ roomCode, message, sender }) => {
    if (rooms[roomCode]) {
      io.to(roomCode).emit("chat_message", { sender, message });
    }
  });

  // RESTORED: Leave Room
  socket.on("leave_room", ({ roomCode }) => {
    handleDuelDisconnect(roomCode, socket.id, true); // True = immediate cleanup
  });

  socket.on("rematch_request", ({ room }) => { // Frontend sends 'room', not 'roomCode'
    const roomData = rooms[room];
    if (!roomData) return;

    if (roomData.gamePhase !== "gameover") return;
    roomData.rematchRequests = roomData.rematchRequests || [];

    if (!roomData.rematchRequests.includes(socket.id)) {
      roomData.rematchRequests.push(socket.id);
    }

    const bothRequested = roomData.p1 && roomData.p2 &&
      roomData.rematchRequests.includes(roomData.p1) &&
      roomData.rematchRequests.includes(roomData.p2);

    if (bothRequested) {
      stopDuelTimer(room);
      roomData.p1Secret = null;
      roomData.p2Secret = null;
      roomData.gamePhase = "setup";
      roomData.timeRemaining = roomData.mode === "blitz" ? 300 : null;
      roomData.rematchRequests = [];
      io.to(room).emit("rematch_accepted");
      io.to(room).emit("game_phase", { phase: "setup" });
    } else {
      socket.to(room).emit("rematch_requested");
    }
  });

  // --- 🌍 BATTLE ROYALE ---
  // (This matches your BattleRoyale.jsx perfectly)
  
  socket.on("battle_create", (data) => {
    const { name, mode, maxPlayers, eSport } = data || {};
    const roomCode = generateRoomCode();
    battleRooms[roomCode] = {
      code: roomCode,
      host: socket.id,
      secret: null,
      started: false,
      mode: mode || "normal",
      maxPlayers: parseInt(maxPlayers) || 100,
      players: [],
      eSport: !!eSport,
      timeRemaining: mode === "blitz" ? 300 : null,
    };
    if (!eSport) {
      battleRooms[roomCode].players.push({ id: socket.id, name: name || "Host", moves: 0, best_score: 0, history: [] });
    }
    socketToRoom[socket.id] = { roomCode, type: "battle" };
    socket.join(roomCode);
    socket.emit("battle_created", {
      roomCode,
      host: true,
      players: battleRooms[roomCode].players,
      started: battleRooms[roomCode].started,
      mode: battleRooms[roomCode].mode,
      maxPlayers: battleRooms[roomCode].maxPlayers,
      eSport: battleRooms[roomCode].eSport,
    });
  });

  socket.on("battle_join", ({ roomCode, name }) => {
    const room = battleRooms[roomCode];
    if (!room) return socket.emit("battle_error", { message: "Room not found" });
    if (room.started) return socket.emit("battle_error", { message: "Game started" });
    if (room.players.length >= room.maxPlayers) return socket.emit("battle_error", { message: "Room full" });
    
    room.players.push({ id: socket.id, name: name || `Player ${room.players.length+1}`, moves: 0, best_score: 0, history: [] });
    socketToRoom[socket.id] = { roomCode, type: "battle" };
    socket.join(roomCode);
    
    socket.emit("battle_joined", {
      roomCode,
      host: room.host === socket.id,
      players: sortLeaderboard(room.players),
      started: room.started,
      mode: room.mode,
      maxPlayers: room.maxPlayers,
      eSport: room.eSport,
    });
    io.to(roomCode).emit("battle_leaderboard", sortLeaderboard(room.players));
  });

  socket.on("battle_start", ({ roomCode }) => {
    const room = battleRooms[roomCode];
    if (room && room.host === socket.id) {
      room.secret = generateDigitCode();
      room.started = true;
      io.to(roomCode).emit("battle_started", { mode: room.mode, timeRemaining: room.timeRemaining, eSport: room.eSport });
      if (room.mode === "blitz") startBattleTimer(roomCode);
    }
  });

  socket.on("battle_guess", ({ roomCode, guess }) => {
    const room = battleRooms[roomCode];
    if (!room || !room.started) return;
    
    if (room.eSport && room.host === socket.id) {
      return socket.emit("battle_error", { message: "Host spectates in eSport mode" });
    }
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const { bulls, cows } = computeCowsBulls(room.secret, guess);
    const score = (bulls * 10) + cows;
    
    player.moves++;
    if (score > player.best_score) player.best_score = score;

    const attempt = { guess, bulls, cows, score, moves: player.moves, ts: Date.now() };
    player.history = player.history || [];
    player.history.unshift(attempt);
    if (player.history.length > 50) player.history.pop();

    socket.emit("battle_guess_result", { guess, bulls, cows, score, moves: player.moves });
    io.to(roomCode).emit("battle_leaderboard", sortLeaderboard(room.players));

    if (bulls === 4) {
      stopBattleTimer(roomCode);
      io.to(roomCode).emit("battle_game_over", { winner: player.name, secret: room.secret });
      delete battleRooms[roomCode];
    }
  });

  socket.on("battle_history_request", ({ roomCode, playerId }) => {
    const room = battleRooms[roomCode];
    if (!room) return socket.emit("battle_error", { message: "Room not found" });
    if (!room.eSport) return socket.emit("battle_error", { message: "History available only in eSport rooms" });
    if (room.host !== socket.id) return socket.emit("battle_error", { message: "Only host can view history" });

    const target = room.players.find(p => p.id === playerId);
    if (!target) return socket.emit("battle_error", { message: "Player not found" });

    socket.emit("battle_player_history", {
      playerId,
      name: target.name,
      history: target.history || [],
    });
  });

  // --- 🔌 CLEANUP ---

  socket.on("disconnect", () => {
    const record = socketToRoom[socket.id];
    if (!record) return;
    
    delete socketToRoom[socket.id];
    const { roomCode, type } = record;

    if (type === "duel") handleDuelDisconnect(roomCode, socket.id);
    else if (type === "battle") handleBattleDisconnect(roomCode, socket.id);
  });

  function handleDuelDisconnect(roomCode, socketId, immediate = false) {
    const room = rooms[roomCode];
    if (!room) return;

    const role = room.p1 === socketId ? "Player 1" : "Player 2";
    
    if (immediate) {
      io.to(roomCode).emit("opponent_left");
      delete rooms[roomCode];
    } else {
      socket.to(roomCode).emit("opponent_disconnected_temp", { role });
      
      // 30s Grace Period
      reconnectTimers[roomCode] = setTimeout(() => {
        io.to(roomCode).emit("opponent_disconnected");
        delete rooms[roomCode];
      }, 30000);
    }
  }

  function handleBattleDisconnect(roomCode, socketId) {
    const room = battleRooms[roomCode];
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== socketId);
    if (room.players.length === 0 && !room.eSport) {
        stopBattleTimer(roomCode);
        delete battleRooms[roomCode];
    } else {
        if (room.host === socketId && room.players.length > 0) {
            room.host = room.players[0].id;
            io.to(roomCode).emit("battle_host_changed", { host: room.host });
        }
        io.to(roomCode).emit("battle_leaderboard", sortLeaderboard(room.players));
    }
  }

  function startDuelTimer(roomCode) {
    if(timers[roomCode]) clearInterval(timers[roomCode]);
    timers[roomCode] = setInterval(() => {
        if(!rooms[roomCode]) return clearInterval(timers[roomCode]);
        rooms[roomCode].timeRemaining--;
        io.to(roomCode).emit("timer_update", { timeRemaining: rooms[roomCode].timeRemaining });
        if(rooms[roomCode].timeRemaining <= 0) {
            clearInterval(timers[roomCode]);
            io.to(roomCode).emit("game_over", { reason: "timeout", winner: null });
        }
    }, 1000);
  }

  function startBattleTimer(roomCode) {
    if(battleTimers[roomCode]) clearInterval(battleTimers[roomCode]);
    battleTimers[roomCode] = setInterval(() => {
        if(!battleRooms[roomCode]) return clearInterval(battleTimers[roomCode]);
        battleRooms[roomCode].timeRemaining--;
        io.to(roomCode).emit("battle_timer", { timeRemaining: battleRooms[roomCode].timeRemaining });
        if(battleRooms[roomCode].timeRemaining <= 0) {
            clearInterval(battleTimers[roomCode]);
            io.to(roomCode).emit("battle_game_over", { reason: "timeout", winner: null, secret: battleRooms[roomCode].secret });
            delete battleRooms[roomCode];
        }
    }, 1000);
  }

  function stopDuelTimer(roomCode) { if(timers[roomCode]) { clearInterval(timers[roomCode]); delete timers[roomCode]; }}
  function stopBattleTimer(roomCode) { if(battleTimers[roomCode]) { clearInterval(battleTimers[roomCode]); delete battleTimers[roomCode]; }}
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
