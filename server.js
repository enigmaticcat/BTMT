const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// GAME ENGINE
// ============================================================

const MOVES = {
  nap: { id: 'nap', name: 'Nạp Đạn', cost: 0, group: 'yellow', emoji: '🔋' },
  min: { id: 'min', name: 'Mìn', cost: 0, group: 'yellow', emoji: '💣' },
  kip: { id: 'kip', name: 'Kíp', cost: 0, group: 'blue', emoji: '🧨' },
  khien: { id: 'khien', name: 'Khiên', cost: 0, group: 'blue', emoji: '🛡️' },
  sung: { id: 'sung', name: 'Súng', cost: 1, group: 'red', emoji: '🔫' },
  moc: { id: 'moc', name: 'Móc', cost: 1, group: 'red', emoji: '🪝' },
  keo: { id: 'keo', name: 'Kéo', cost: 1, group: 'blue', emoji: '✂️' },
  shotgun: { id: 'shotgun', name: 'Shotgun', cost: 2, group: 'red', emoji: '🔥' },
  zombie: { id: 'zombie', name: 'Zombie', cost: 3, group: 'red', emoji: '🧟' },
  sieu_khien: { id: 'sieu_khien', name: 'Siêu Khiên', cost: 2, group: 'special', emoji: '⚡' },
  magic_hand: { id: 'magic_hand', name: 'Bàn Tay Ma Thuật', cost: 5, group: 'special', emoji: '✋' },
};

// Matchup matrix: MATRIX[attacker][defender] = result for attacker
// 'win' = attacker wins, 'lose' = attacker loses, 'draw' = draw
const MATRIX = {
  nap: {
    nap: 'draw', min: 'win', kip: 'draw', khien: 'draw',
    sung: 'lose', moc: 'lose', keo: 'draw', shotgun: 'lose',
    zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose'
  },
  min: {
    nap: 'lose', min: 'draw', kip: 'lose', khien: 'lose',
    sung: 'lose', moc: 'lose', keo: 'lose', shotgun: 'lose',
    zombie: 'win', sieu_khien: 'lose', magic_hand: 'win'
  },
  kip: {
    nap: 'draw', min: 'win', kip: 'draw', khien: 'draw',
    sung: 'win', moc: 'draw', keo: 'draw', shotgun: 'win',
    zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose'
  },
  khien: {
    nap: 'draw', min: 'win', kip: 'draw', khien: 'draw',
    sung: 'draw', moc: 'lose', keo: 'draw', shotgun: 'draw',
    zombie: 'draw', sieu_khien: 'draw', magic_hand: 'lose'
  },
  sung: {
    nap: 'win', min: 'win', kip: 'lose', khien: 'draw',
    sung: 'draw', moc: 'win', keo: 'draw', shotgun: 'lose',
    zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose'
  },
  moc: {
    nap: 'win', min: 'win', kip: 'draw', khien: 'win',
    sung: 'lose', moc: 'draw', keo: 'draw', shotgun: 'lose',
    zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose'
  },
  keo: {
    nap: 'draw', min: 'win', kip: 'draw', khien: 'draw',
    sung: 'draw', moc: 'draw', keo: 'draw', shotgun: 'win',
    zombie: 'win', sieu_khien: 'draw', magic_hand: 'lose'
  },
  shotgun: {
    nap: 'win', min: 'win', kip: 'lose', khien: 'draw',
    sung: 'win', moc: 'win', keo: 'lose', shotgun: 'draw',
    zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose'
  },
  zombie: {
    nap: 'win', min: 'lose', kip: 'win', khien: 'draw',
    sung: 'win', moc: 'win', keo: 'lose', shotgun: 'win',
    zombie: 'draw', sieu_khien: 'draw', magic_hand: 'lose'
  },
  sieu_khien: {
    nap: 'draw', min: 'win', kip: 'draw', khien: 'draw',
    sung: 'draw', moc: 'draw', keo: 'draw', shotgun: 'draw',
    zombie: 'draw', sieu_khien: 'draw', magic_hand: 'draw'
  },
  magic_hand: {
    nap: 'win', min: 'lose', kip: 'win', khien: 'win',
    sung: 'win', moc: 'win', keo: 'win', shotgun: 'win',
    zombie: 'win', sieu_khien: 'draw', magic_hand: 'draw'
  },
};

// Result descriptions in Vietnamese
function getResultDescription(p1Move, p2Move, p1Result) {
  if (p1Move === p2Move) {
    const m = MOVES[p1Move];
    if (p1Move === 'nap') return 'Cả hai nạp đạn! +1 đạn mỗi người.';
    if (m.cost > 0) return `Hòa Hủy Diệt! Cả hai mất ${m.cost} đạn.`;
    return 'Hòa! Không ai bị ảnh hưởng.';
  }

  const m1 = MOVES[p1Move], m2 = MOVES[p2Move];

  // Special descriptions
  if (p1Move === 'min') {
    if (p1Result === 'win') return `💣 Mìn phát nổ! ${m2.name} bị hạ gục!`;
    return `💀 Mìn tự nổ! Đoán sai...`;
  }
  if (p2Move === 'min') {
    if (p1Result === 'lose') return `💣 Mìn phát nổ! ${m1.name} bị hạ gục!`;
    return `💀 Đối thủ đặt Mìn nhưng tự nổ!`;
  }
  if (p1Move === 'kip' && p1Result === 'win') return `🧨 Kíp nổ! ${m2.name} bị phản!`;
  if (p2Move === 'kip' && p1Result === 'lose') return `🧨 Kíp nổ! ${m1.name} bị phản!`;
  if (p1Move === 'keo' && p1Result === 'win') return `✂️ Kéo chặt ${m2.name}!`;
  if (p2Move === 'keo' && p1Result === 'lose') return `✂️ Kéo chặt ${m1.name}!`;
  if (p1Move === 'moc' && p1Result === 'win' && p2Move === 'khien') return `🪝 Móc phá Khiên!`;
  if (p2Move === 'moc' && p1Result === 'lose' && p1Move === 'khien') return `🪝 Móc phá Khiên!`;
  if (p1Move === 'magic_hand' && p1Result === 'win') return `✋ Bàn Tay Ma Thuật càn quét!`;
  if (p2Move === 'magic_hand' && p1Result === 'lose') return `✋ Bàn Tay Ma Thuật càn quét!`;
  if (p1Move === 'khien' && p1Result === 'draw') return `🛡️ Khiên chặn đòn tấn công!`;
  if (p1Move === 'sieu_khien' && p1Result === 'draw') return `⚡ Siêu Khiên chặn mọi thứ!`;
  if (p2Move === 'sieu_khien' && p1Result === 'draw') return `⚡ Siêu Khiên chặn mọi thứ!`;
  if (p1Move === 'nap' && p1Result === 'lose') return `${m2.emoji} ${m2.name} hạ gục lúc đang nạp đạn!`;
  if (p1Result === 'win') return `${m1.emoji} ${m1.name} thắng ${m2.name}!`;
  if (p1Result === 'lose') return `${m2.emoji} ${m2.name} thắng ${m1.name}!`;
  return 'Hòa!';
}

function resolveTurn(room) {
  const { p1, p2, moves } = room.gameState;
  const p1Move = moves.p1;
  const p2Move = moves.p2;
  const m1 = MOVES[p1Move];
  const m2 = MOVES[p2Move];

  // Deduct bullets immediately
  p1.bullets -= m1.cost;
  p2.bullets -= m2.cost;

  // Resolve matchup
  const p1Result = MATRIX[p1Move][p2Move];
  const p2Result = MATRIX[p2Move][p1Move];

  // Apply damage
  if (p1Result === 'lose') {
    // Check if it's min self-destruct
    if (p1Move === 'min' && p2Move !== 'zombie' && p2Move !== 'magic_hand') {
      p1.lives -= 1; // self-destruct
    } else {
      p1.lives -= 1;
    }
  }
  if (p2Result === 'lose') {
    if (p2Move === 'min' && p1Move !== 'zombie' && p1Move !== 'magic_hand') {
      p2.lives -= 1; // self-destruct
    } else {
      p2.lives -= 1;
    }
  }

  // Handle Nạp bullet gain
  if (p1Move === 'nap') {
    let gain = 1;
    if (p1.napStreak >= 1) gain = 2; // combo bonus
    p1.bullets += gain;
    p1.napStreak += 1;
  } else {
    p1.napStreak = 0;
  }

  if (p2Move === 'nap') {
    let gain = 1;
    if (p2.napStreak >= 1) gain = 2; // combo bonus
    p2.bullets += gain;
    p2.napStreak += 1;
  } else {
    p2.napStreak = 0;
  }

  // Handle cooldown: after 2 consecutive naps, set cooldown
  if (p1.napStreak >= 2) p1.cooldown = true;
  else p1.cooldown = false;

  if (p2.napStreak >= 2) p2.cooldown = true;
  else p2.cooldown = false;

  // Generate description from P1 perspective
  const descP1 = getResultDescription(p1Move, p2Move, p1Result);
  const descP2 = getResultDescription(p2Move, p1Move, p2Result);

  const turnResult = {
    turn: room.gameState.turn,
    p1Move, p2Move,
    p1Result, p2Result,
    descP1, descP2,
    p1State: { lives: p1.lives, bullets: p1.bullets, cooldown: p1.cooldown, napStreak: p1.napStreak },
    p2State: { lives: p2.lives, bullets: p2.bullets, cooldown: p2.cooldown, napStreak: p2.napStreak },
    gameOver: p1.lives <= 0 || p2.lives <= 0,
    winner: p1.lives <= 0 ? 'p2' : (p2.lives <= 0 ? 'p1' : null),
  };

  room.gameState.history.push(turnResult);
  room.gameState.turn += 1;
  room.gameState.moves = { p1: null, p2: null };

  if (turnResult.gameOver) {
    room.gameState.gameOver = true;
  }

  return turnResult;
}

function createGameState() {
  return {
    p1: { lives: 3, bullets: 0, napStreak: 0, cooldown: false, timeBank: 30.0 },
    p2: { lives: 3, bullets: 0, napStreak: 0, cooldown: false, timeBank: 30.0 },
    turn: 1,
    turnStartedAt: null,
    firstToMove: null,
    history: [],
    moves: { p1: null, p2: null },
    gameOver: false,
    timer: null,
  };
}

function getAvailableMoves(playerState) {
  const available = [];
  for (const [id, move] of Object.entries(MOVES)) {
    const canAfford = playerState.bullets >= move.cost;
    const notCooldown = !(id === 'nap' && playerState.cooldown);
    available.push({
      ...move,
      available: canAfford && notCooldown,
      reason: !canAfford ? 'Không đủ đạn' : (id === 'nap' && playerState.cooldown ? 'Cooldown' : ''),
    });
  }
  return available;
}

// ============================================================
// AI LOGIC
// ============================================================

function chooseAIMove(difficulty, aiState, playerState, history) {
  const available = [];
  for (const [id, move] of Object.entries(MOVES)) {
    const canAfford = aiState.bullets >= move.cost;
    const notCooldown = !(id === 'nap' && aiState.cooldown);
    if (canAfford && notCooldown) available.push(id);
  }

  if (available.length === 0) return 'nap';

  if (difficulty === 'easy') {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Helper: pick random from array
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Smart move selection for normal/hard
  function smartMove() {
    const pb = playerState.bullets;
    const ab = aiState.bullets;

    // If player has 0 bullets, they'll likely nap -> attack them
    if (pb === 0) {
      const attacks = available.filter(m => ['sung', 'moc', 'shotgun', 'zombie', 'magic_hand'].includes(m));
      if (attacks.length > 0) return pick(attacks);
    }

    // If AI has 0 bullets, must nap
    if (ab === 0) return 'nap';

    // If player has been napping a lot recently, punish
    const lastMoves = history.slice(-3);
    const playerNaps = lastMoves.filter(h => h.p2Move === 'nap' || h.p1Move === 'nap').length;
    if (playerNaps >= 2) {
      const attacks = available.filter(m => ['sung', 'moc', 'shotgun'].includes(m));
      if (attacks.length > 0) return pick(attacks);
    }

    // If player likely attacks (has bullets), defend
    if (pb >= 2) {
      const defenses = available.filter(m => ['khien', 'sieu_khien', 'kip', 'keo'].includes(m));
      if (defenses.length > 0 && Math.random() > 0.4) return pick(defenses);
    }

    // Balance: nap if low on bullets
    if (ab <= 1 && available.includes('nap')) {
      if (Math.random() > 0.3) return 'nap';
    }

    return pick(available);
  }

  if (difficulty === 'normal') {
    return Math.random() < 0.5 ? smartMove() : pick(available);
  }

  // Hard: heavily strategic
  if (difficulty === 'hard') {
    return smartMove();
  }

  return pick(available);
}

// ============================================================
// ROOM MANAGEMENT
// ============================================================

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

// ============================================================
// SOCKET HANDLING
// ============================================================

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  let currentRoom = null;
  let playerRole = null; // 'p1' or 'p2'

  socket.on('create-room', (callback) => {
    const code = generateRoomCode();
    const room = {
      code,
      players: { p1: socket.id, p2: null },
      gameState: createGameState(),
    };
    rooms.set(code, room);
    currentRoom = code;
    playerRole = 'p1';
    socket.join(code);
    callback({ success: true, code, role: 'p1' });
    console.log(`Room ${code} created by ${socket.id}`);
  });

  // AI GAME
  socket.on('start-ai-game', (difficulty, callback) => {
    const validDiffs = ['easy', 'normal', 'hard'];
    if (!validDiffs.includes(difficulty)) difficulty = 'normal';

    const code = 'AI_' + generateRoomCode();
    const room = {
      code,
      players: { p1: socket.id, p2: 'AI' },
      gameState: createGameState(),
      isAI: true,
      aiDifficulty: difficulty,
    };
    rooms.set(code, room);
    currentRoom = code;
    playerRole = 'p1';
    socket.join(code);

    const movesP1 = getAvailableMoves(room.gameState.p1);
    callback({ success: true, code, role: 'p1' });

    socket.emit('game-start', {
      role: 'p1',
      state: room.gameState.p1,
      opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank },
      moves: movesP1,
      turn: room.gameState.turn,
      isAI: true,
      aiDifficulty: difficulty,
    });
    startTurnTimer(room);
    console.log(`AI Room ${code} created (${difficulty}) by ${socket.id}`);
  });

  socket.on('join-room', (code, callback) => {
    code = code.toUpperCase();
    const room = rooms.get(code);
    if (!room) return callback({ success: false, error: 'Phòng không tồn tại!' });
    if (room.players.p2) return callback({ success: false, error: 'Phòng đã đầy!' });

    room.players.p2 = socket.id;
    currentRoom = code;
    playerRole = 'p2';
    socket.join(code);
    callback({ success: true, code, role: 'p2' });

    // Notify both players game is starting
    const movesP1 = getAvailableMoves(room.gameState.p1);
    const movesP2 = getAvailableMoves(room.gameState.p2);

    io.to(room.players.p1).emit('game-start', {
      role: 'p1',
      state: room.gameState.p1,
      opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank },
      moves: movesP1,
      turn: room.gameState.turn,
    });
    io.to(room.players.p2).emit('game-start', {
      role: 'p2',
      state: room.gameState.p2,
      opponentState: { lives: room.gameState.p1.lives, bullets: room.gameState.p1.bullets, timeBank: room.gameState.p1.timeBank },
      moves: movesP2,
      turn: room.gameState.turn,
    });
    startTurnTimer(room);
    console.log(`Room ${code}: Player 2 joined`);
  });

  socket.on('select-move', (moveId) => {
    if (!currentRoom || !playerRole) return;
    const room = rooms.get(currentRoom);
    if (!room || room.gameState.gameOver) return;

    const pState = room.gameState[playerRole];
    const move = MOVES[moveId];
    if (!move) return;
    if (pState.bullets < move.cost) return;
    if (moveId === 'nap' && pState.cooldown) return;

    const elapsed = (Date.now() - room.gameState.turnStartedAt) / 1000;
    room.gameState[playerRole].timeBank -= elapsed;
    if (room.gameState[playerRole].timeBank < 0) room.gameState[playerRole].timeBank = 0;

    room.gameState.moves[playerRole] = moveId;

    if (!room.gameState.firstToMove) {
      room.gameState.firstToMove = playerRole;
      room.gameState[playerRole].timeBank += 1.0;
    } else {
      room.gameState[playerRole].timeBank += 0.5;
    }

    // AI opponent: generate AI move after short delay
    if (room.isAI && playerRole === 'p1') {
      socket.emit('move-confirmed');
      const aiDelay = 600 + Math.random() * 600; // 600-1200ms
      setTimeout(() => {
        if (!room.gameState.moves.p1) return; // Check if already resolved

        const aiElapsed = (Date.now() - room.gameState.turnStartedAt) / 1000;
        room.gameState.p2.timeBank -= aiElapsed;
        if (room.gameState.p2.timeBank < 0) room.gameState.p2.timeBank = 0;

        if (!room.gameState.firstToMove) {
          room.gameState.firstToMove = 'p2';
          room.gameState.p2.timeBank += 1.0;
        } else {
          room.gameState.p2.timeBank += 0.5;
        }

        const aiMove = chooseAIMove(
          room.aiDifficulty,
          room.gameState.p2,
          room.gameState.p1,
          room.gameState.history
        );
        room.gameState.moves.p2 = aiMove;
        resolveAndSend(room, socket);
      }, aiDelay);
      return;
    }

    // PvP: Notify opponent that this player has selected
    const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
    const opponentSocketId = room.players[opponentRole];
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('opponent-ready');
    }
    socket.emit('move-confirmed');

    // If both have selected, resolve
    if (room.gameState.moves.p1 && room.gameState.moves.p2) {
      if (room.gameState.timer) { clearInterval(room.gameState.timer); room.gameState.timer = null; }
      resolveAndSend(room);
    }
  });

  function startTurnTimer(room) {
    if (room.gameState.timer) clearInterval(room.gameState.timer);
    if (room.gameState.gameOver) return;

    room.gameState.turnStartedAt = Date.now();
    room.gameState.firstToMove = null;

    room.gameState.timer = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - room.gameState.turnStartedAt) / 1000;

      let p1Timeout = false;
      let p2Timeout = false;

      if (!room.gameState.moves.p1) {
        if (room.gameState.p1.timeBank - elapsed <= 0) p1Timeout = true;
      }
      if (!room.gameState.moves.p2) {
        if (room.gameState.p2.timeBank - elapsed <= 0) p2Timeout = true;
      }

      if (p1Timeout || p2Timeout) {
        handleTimeout(room, p1Timeout, p2Timeout);
      }
    }, 100);
  }

  function handleTimeout(room, p1Timeout, p2Timeout) {
    if (room.gameState.timer) { clearInterval(room.gameState.timer); room.gameState.timer = null; }

    if (p1Timeout) room.gameState.p1.lives -= 1;
    if (p2Timeout) room.gameState.p2.lives -= 1;

    room.gameState.p1.timeBank = 30.0;
    room.gameState.p2.timeBank = 30.0;

    const p1Desc = p1Timeout && p2Timeout ? 'Cả hai đều hết thời gian! Mất 1 mạng.' : (p1Timeout ? 'Bạn đã hết thời gian và mất 1 mạng!' : 'Đối thủ đã hết thời gian!');
    const p2Desc = p1Timeout && p2Timeout ? 'Cả hai đều hết thời gian! Mất 1 mạng.' : (p2Timeout ? 'Bạn đã hết thời gian và mất 1 mạng!' : 'Đối thủ đã hết thời gian!');

    const turnResult = {
      turn: room.gameState.turn,
      p1Move: 'timeout',
      p2Move: 'timeout',
      p1Result: p1Timeout && p2Timeout ? 'lose' : (p1Timeout ? 'lose' : 'win'),
      p2Result: p2Timeout && p1Timeout ? 'lose' : (p2Timeout ? 'lose' : 'win'),
      descP1: p1Desc,
      descP2: p2Desc,
      p1State: { lives: room.gameState.p1.lives, bullets: room.gameState.p1.bullets, cooldown: room.gameState.p1.cooldown, napStreak: room.gameState.p1.napStreak, timeBank: room.gameState.p1.timeBank },
      p2State: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, cooldown: room.gameState.p2.cooldown, napStreak: room.gameState.p2.napStreak, timeBank: room.gameState.p2.timeBank },
      gameOver: room.gameState.p1.lives <= 0 || room.gameState.p2.lives <= 0,
      winner: room.gameState.p1.lives <= 0 && room.gameState.p2.lives <= 0 ? 'draw' : (room.gameState.p1.lives <= 0 ? 'p2' : (room.gameState.p2.lives <= 0 ? 'p1' : null))
    };

    room.gameState.history.push(turnResult);
    room.gameState.turn += 1;
    room.gameState.moves = { p1: null, p2: null };

    if (turnResult.gameOver) {
      room.gameState.gameOver = true;
    }

    emitTurnResult(room, turnResult);
  }

  function emitTurnResult(room, turnResult) {
    // Send result to P1
    io.to(room.players.p1).emit('turn-result', {
      yourMove: turnResult.p1Move,
      opponentMove: turnResult.p2Move,
      result: turnResult.p1Result,
      description: turnResult.descP1,
      yourState: turnResult.p1State,
      opponentState: turnResult.p2State,
      turn: turnResult.turn,
      gameOver: turnResult.gameOver,
      winner: turnResult.winner === 'p1' ? 'you' : (turnResult.winner === 'p2' ? 'opponent' : (turnResult.winner === 'draw' ? 'draw' : null)),
    });

    // Send result to P2
    if (room.players.p2 !== 'AI') {
      io.to(room.players.p2).emit('turn-result', {
        yourMove: turnResult.p2Move,
        opponentMove: turnResult.p1Move,
        result: turnResult.p2Result,
        description: turnResult.descP2,
        yourState: turnResult.p2State,
        opponentState: turnResult.p1State,
        turn: turnResult.turn,
        gameOver: turnResult.gameOver,
        winner: turnResult.winner === 'p2' ? 'you' : (turnResult.winner === 'p1' ? 'opponent' : (turnResult.winner === 'draw' ? 'draw' : null)),
      });
    }

    if (!turnResult.gameOver) {
      setTimeout(() => {
        sendNextTurn(room);
      }, 3500);
    }
  }

  function sendNextTurn(room) {
    if (room.gameState.gameOver) return;
    io.to(room.players.p1).emit('next-turn', {
      moves: getAvailableMoves(room.gameState.p1),
      state: room.gameState.p1,
      opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank },
      turn: room.gameState.turn,
    });
    if (room.players.p2 !== 'AI') {
      io.to(room.players.p2).emit('next-turn', {
        moves: getAvailableMoves(room.gameState.p2),
        state: room.gameState.p2,
        opponentState: { lives: room.gameState.p1.lives, bullets: room.gameState.p1.bullets, timeBank: room.gameState.p1.timeBank },
        turn: room.gameState.turn,
      });
    }
    startTurnTimer(room);
  }

  function resolveAndSend(room, aiSocket) {
    if (room.gameState.timer) { clearInterval(room.gameState.timer); room.gameState.timer = null; }
    if (!room.gameState.moves.p1 || !room.gameState.moves.p2) return;

    const result = resolveTurn(room);

    result.p1State.timeBank = room.gameState.p1.timeBank;
    result.p2State.timeBank = room.gameState.p2.timeBank;

    emitTurnResult(room, result);
  }

  socket.on('rematch', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    // AI rooms: instant rematch
    if (room.isAI) {
      if (room.gameState.timer) { clearTimeout(room.gameState.timer); room.gameState.timer = null; }
      room.gameState = createGameState();
      const movesP1 = getAvailableMoves(room.gameState.p1);
      socket.emit('game-start', {
        role: 'p1',
        state: room.gameState.p1,
        opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank },
        moves: movesP1,
        turn: room.gameState.turn,
        isAI: true,
        aiDifficulty: room.aiDifficulty,
      });
      startTurnTimer(room);
      return;
    }

    if (!room.rematchVotes) room.rematchVotes = new Set();
    room.rematchVotes.add(playerRole);

    const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
    const opponentSocketId = room.players[opponentRole];
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('rematch-requested');
    }

    if (room.rematchVotes.size >= 2) {
      if (room.gameState.timer) { clearTimeout(room.gameState.timer); room.gameState.timer = null; }
      room.gameState = createGameState();
      room.rematchVotes = new Set();

      const movesP1 = getAvailableMoves(room.gameState.p1);
      const movesP2 = getAvailableMoves(room.gameState.p2);

      io.to(room.players.p1).emit('game-start', {
        role: 'p1',
        state: room.gameState.p1,
        opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank },
        moves: movesP1,
        turn: room.gameState.turn,
      });
      io.to(room.players.p2).emit('game-start', {
        role: 'p2',
        state: room.gameState.p2,
        opponentState: { lives: room.gameState.p1.lives, bullets: room.gameState.p1.bullets, timeBank: room.gameState.p1.timeBank },
        moves: movesP2,
        turn: room.gameState.turn,
      });
      startTurnTimer(room);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
        const opponentSocketId = room.players[opponentRole];
        if (opponentSocketId) {
          io.to(opponentSocketId).emit('opponent-disconnected');
        }
        rooms.delete(currentRoom);
      }
    }
  });
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Mind Clash server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to play`);
});
