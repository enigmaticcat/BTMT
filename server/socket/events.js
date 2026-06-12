const { chooseAIMove } = require('../core/aiLogic');
const { MOVES, AUGMENTS } = require('../core/constants');
const {
    createGameState,
    getAvailableMoves,
    getRandomAugments,
    resolveTurn,
    BASE_HP,
    TIMEOUT_DAMAGE,
} = require('../core/gameLogic');

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

function applyAugEffect(self, opp, augId, room, isMidGame = false) {
    if (!isMidGame) {
        // Initial augment phase — set absolute values
        switch (augId) {
            case 'speed_up':      opp.timeBank = Math.min(opp.timeBank, 7.5); break;
            case 'slow_down':     self.timeBank = Math.max(self.timeBank, 22.5); break;
            case 'extra_life':    self.hp = Math.max(self.hp, BASE_HP + 50); self.maxHp = Math.max(self.maxHp || BASE_HP, BASE_HP + 50); break;
            case 'weak_opponent': opp.hp = Math.min(opp.hp, 250); opp.maxHp = Math.min(opp.maxHp || BASE_HP, 250); break;
            case 'bullet_start':
                self.bullets = Math.max(self.bullets, 1);
                self.hp = Math.min(self.hp, BASE_HP - 70);
                self.maxHp = Math.min(self.maxHp || BASE_HP, BASE_HP - 70);
                self.bulletStartTurn = room.gameState.turn;
                break;
            case 'long_game': break;
        }
    } else {
        // Mid-game augment phase — additive effects on current state
        switch (augId) {
            case 'speed_up':      opp.timeBank = Math.max(0, opp.timeBank - 5); break;
            case 'slow_down':     self.timeBank += 5; break;
            case 'extra_life':    self.hp += 50; self.maxHp = (self.maxHp || BASE_HP) + 50; break;
            case 'weak_opponent': opp.hp = Math.max(1, opp.hp - 110); break;
            case 'bullet_start':  self.bullets += 2; break;
            case 'long_game':     self.hp += 50; break;
        }
    }
}

function handleSocketEvents(io) {
    io.on('connection', (socket) => {
        console.log(`Player connected: ${socket.id}`);
        let currentRoom = null;
        let playerRole = null;

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

            callback({ success: true, code, role: 'p1' });

            socket.emit('augment-selection-start', {
                augments: getRandomAugments(),
                timeLimit: 15,
            });
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

            const randomAugments = getRandomAugments();
            io.to(room.players.p1).emit('augment-selection-start', {
                augments: randomAugments,
                timeLimit: 15,
            });
            io.to(room.players.p2).emit('augment-selection-start', {
                augments: randomAugments,
                timeLimit: 15,
            });
            console.log(`Room ${code}: Player 2 joined`);
        });

        socket.on('select-augment', (augmentId) => {
            if (!currentRoom || !playerRole) return;
            const room = rooms.get(currentRoom);
            if (!room) return;

            const augment = AUGMENTS[augmentId];
            if (!augment) return;

            // Mid-game augment phase (after turn 10)
            if (room.gameState.midAugmentVotes && !room.gameState.midAugmentDone) {
                room.gameState.midAugmentVotes[playerRole] = augmentId;

                if (room.isAI && !room.gameState.midAugmentVotes.p2) {
                    const aiAugments = Object.keys(AUGMENTS);
                    room.gameState.midAugmentVotes.p2 = aiAugments[Math.floor(Math.random() * aiAugments.length)];
                }

                if (room.gameState.midAugmentVotes.p1 && room.gameState.midAugmentVotes.p2) {
                    room.gameState.midAugmentDone = true;
                    const p1 = room.gameState.p1;
                    const p2 = room.gameState.p2;
                    p1.augment = room.gameState.midAugmentVotes.p1;
                    p2.augment = room.gameState.midAugmentVotes.p2;
                    applyAugEffect(p1, p2, p1.augment, room, true);
                    applyAugEffect(p2, p1, p2.augment, room, true);
                    sendNextTurn(room);
                }
                return;
            }

            if (room.gameState.augmentPhaseEnded) return;

            room.gameState[playerRole].augment = augmentId;

            if (room.isAI && !room.gameState.p2.augment) {
                const aiAugments = Object.keys(AUGMENTS);
                const randomAug = aiAugments[Math.floor(Math.random() * aiAugments.length)];
                room.gameState.p2.augment = randomAug;
            }

            if (room.gameState.p1.augment && room.gameState.p2.augment) {
                room.gameState.augmentPhaseEnded = true;
                const p1 = room.gameState.p1;
                const p2 = room.gameState.p2;

                applyAugEffect(p1, p2, p1.augment, room);
                applyAugEffect(p2, p1, p2.augment, room);


                const movesP1 = getAvailableMoves(room.gameState.p1);
                const movesP2 = getAvailableMoves(room.gameState.p2);

                const oppStateP1 = { hp: p2.hp, maxHp: p2.maxHp, bullets: p2.bullets, timeBank: p2.timeBank };
                const oppStateP2 = { hp: p1.hp, maxHp: p1.maxHp, bullets: p1.bullets, timeBank: p1.timeBank };

                if (room.isAI) {
                    socket.emit('game-start', {
                        role: 'p1',
                        state: p1,
                        opponentState: oppStateP1,
                        moves: movesP1,
                        turn: room.gameState.turn,
                        isAI: true,
                        aiDifficulty: room.aiDifficulty,
                        yourAugment: p1.augment,
                        opponentAugment: p2.augment,
                    });
                } else {
                    io.to(room.players.p1).emit('game-start', {
                        role: 'p1',
                        state: p1,
                        opponentState: oppStateP1,
                        moves: movesP1,
                        turn: room.gameState.turn,
                        yourAugment: p1.augment,
                        opponentAugment: p2.augment,
                    });
                    io.to(room.players.p2).emit('game-start', {
                        role: 'p2',
                        state: p2,
                        opponentState: oppStateP2,
                        moves: movesP2,
                        turn: room.gameState.turn,
                        yourAugment: p2.augment,
                        opponentAugment: p1.augment,
                    });
                }
                startTurnTimer(room);
            }
        });

        socket.on('select-move', (moveId) => {
            if (!currentRoom || !playerRole) return;
            const room = rooms.get(currentRoom);
            if (!room || room.gameState.gameOver) return;

            const pState = room.gameState[playerRole];
            const move = MOVES[moveId];
            if (!move) return;

            // Respect freeMove: cost is 0 this turn
            const effectiveCost = pState.freeMove ? 0 : move.cost;
            if (pState.bullets < effectiveCost) return;
            if (moveId === 'nap' && pState.cooldown) return;

            // Debuff: stun — only 0-cost moves allowed
            if (pState.debuff === 'stun' && move.cost > 0) return;

            // Debuff: lock — most expensive affordable move (by effectiveCost) is blocked
            if (pState.debuff === 'lock') {
                const freeMove = pState.freeMove;
                let maxEffectiveCost = -1;
                for (const m of Object.values(MOVES)) {
                    const ec = freeMove ? 0 : m.cost;
                    if (pState.bullets >= ec && ec > maxEffectiveCost) maxEffectiveCost = ec;
                }
                const effectiveCost = freeMove ? 0 : move.cost;
                if (effectiveCost === maxEffectiveCost) return;
            }

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

            const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
            const opponentSocketId = room.players[opponentRole];
            if (opponentSocketId) {
                io.to(opponentSocketId).emit('opponent-ready');
            }
            socket.emit('move-confirmed');

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

            // AI moves independently at start of turn
            if (room.isAI && !room.gameState.gameOver) {
                const aiDelay = 800 + Math.random() * 1200;
                setTimeout(() => {
                    if (!rooms.has(room.code) || room.gameState.gameOver) return;
                    if (room.gameState.moves.p2) return; // already moved
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
                    if (room.gameState.moves.p1 && room.gameState.moves.p2) {
                        if (room.gameState.timer) { clearInterval(room.gameState.timer); room.gameState.timer = null; }
                        resolveAndSend(room);
                    }
                }, aiDelay);
            }

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
            if (p1Timeout) room.gameState.p1.hp = Math.max(0, room.gameState.p1.hp - TIMEOUT_DAMAGE);
            if (p2Timeout) room.gameState.p2.hp = Math.max(0, room.gameState.p2.hp - TIMEOUT_DAMAGE);
            room.gameState.p1.debuff = null;
            room.gameState.p2.debuff = null;
            room.gameState.p1.freeMove = false;
            room.gameState.p2.freeMove = false;
            room.gameState.p1.napStreak = 0;
            room.gameState.p2.napStreak = 0;
            room.gameState.p1.cooldown = false;
            room.gameState.p2.cooldown = false;

            const elapsed = (Date.now() - room.gameState.turnStartedAt) / 1000;
            if (!room.gameState.moves.p1) room.gameState.p1.timeBank = Math.max(0, room.gameState.p1.timeBank - elapsed);
            if (!room.gameState.moves.p2) room.gameState.p2.timeBank = Math.max(0, room.gameState.p2.timeBank - elapsed);

            const p1Desc = p1Timeout && p2Timeout ? `Cả hai hết thời gian! -${TIMEOUT_DAMAGE} HP.` : (p1Timeout ? `Hết thời gian! -${TIMEOUT_DAMAGE} HP.` : 'Đối thủ hết thời gian!');
            const p2Desc = p1Timeout && p2Timeout ? `Cả hai hết thời gian! -${TIMEOUT_DAMAGE} HP.` : (p2Timeout ? `Hết thời gian! -${TIMEOUT_DAMAGE} HP.` : 'Đối thủ hết thời gian!');

            const turnResult = {
                turn: room.gameState.turn,
                p1Move: 'timeout',
                p2Move: 'timeout',
                p1Result: p1Timeout ? 'lose' : 'win',
                p2Result: p2Timeout ? 'lose' : 'win',
                descP1: p1Desc,
                descP2: p2Desc,
                p1State: { hp: room.gameState.p1.hp, maxHp: room.gameState.p1.maxHp, bullets: room.gameState.p1.bullets, cooldown: room.gameState.p1.cooldown, napStreak: room.gameState.p1.napStreak, timeBank: room.gameState.p1.timeBank, debuff: room.gameState.p1.debuff, freeMove: room.gameState.p1.freeMove },
                p2State: { hp: room.gameState.p2.hp, maxHp: room.gameState.p2.maxHp, bullets: room.gameState.p2.bullets, cooldown: room.gameState.p2.cooldown, napStreak: room.gameState.p2.napStreak, timeBank: room.gameState.p2.timeBank, debuff: room.gameState.p2.debuff, freeMove: room.gameState.p2.freeMove },
                gameOver: room.gameState.p1.hp <= 0 || room.gameState.p2.hp <= 0,
                winner: room.gameState.p1.hp <= 0 && room.gameState.p2.hp <= 0 ? 'draw' : (room.gameState.p1.hp <= 0 ? 'p2' : (room.gameState.p2.hp <= 0 ? 'p1' : null))
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
                    // Trigger mid-game augment selection after turn 10
                    if (room.gameState.turn === 11 && !room.gameState.midAugmentDone) {
                        room.gameState.midAugmentVotes = { p1: null, p2: null };
                        const augments = getRandomAugments();
                        const augIds = augments.map(a => a.id);
                        io.to(room.players.p1).emit('augment-selection-start', { augments, timeLimit: 15 });
                        if (room.players.p2 !== 'AI') {
                            io.to(room.players.p2).emit('augment-selection-start', { augments, timeLimit: 15 });
                        } else {
                            room.gameState.midAugmentVotes.p2 = augIds[Math.floor(Math.random() * augIds.length)];
                        }
                        // Auto-random for players who don't choose in time
                        setTimeout(() => {
                            if (room.gameState.midAugmentDone) return;
                            const p1 = room.gameState.p1;
                            const p2 = room.gameState.p2;
                            if (!room.gameState.midAugmentVotes.p1)
                                room.gameState.midAugmentVotes.p1 = augIds[Math.floor(Math.random() * augIds.length)];
                            if (!room.gameState.midAugmentVotes.p2)
                                room.gameState.midAugmentVotes.p2 = augIds[Math.floor(Math.random() * augIds.length)];
                            room.gameState.midAugmentDone = true;
                            p1.augment = room.gameState.midAugmentVotes.p1;
                            p2.augment = room.gameState.midAugmentVotes.p2;
                            applyAugEffect(p1, p2, p1.augment, room, true);
                            applyAugEffect(p2, p1, p2.augment, room, true);
                            sendNextTurn(room);
                        }, 15500);
                    } else {
                        sendNextTurn(room);
                    }
                }, 3500);
            }
        }

        function sendNextTurn(room) {
            if (room.gameState.gameOver) return;
            const { p1, p2 } = room.gameState;
            p1.timeBank += 1.5;
            p2.timeBank += 1.5;
            io.to(room.players.p1).emit('next-turn', {
                moves: getAvailableMoves(p1),
                state: p1,
                opponentState: { hp: p2.hp, maxHp: p2.maxHp, bullets: p2.bullets, timeBank: p2.timeBank },
                turn: room.gameState.turn,
            });
            if (room.players.p2 !== 'AI') {
                io.to(room.players.p2).emit('next-turn', {
                    moves: getAvailableMoves(p2),
                    state: p2,
                    opponentState: { hp: p1.hp, maxHp: p1.maxHp, bullets: p1.bullets, timeBank: p1.timeBank },
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

            if (room.isAI) {
                if (room.gameState.timer) { clearTimeout(room.gameState.timer); room.gameState.timer = null; }
                room.gameState = createGameState();
                socket.emit('augment-selection-start', {
                    augments: getRandomAugments(),
                    timeLimit: 15,
                });
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

                const randomAugments = getRandomAugments();
                io.to(room.players.p1).emit('augment-selection-start', {
                    augments: randomAugments,
                    timeLimit: 15,
                });
                io.to(room.players.p2).emit('augment-selection-start', {
                    augments: randomAugments,
                    timeLimit: 15,
                });
            }
        });

        socket.on('disconnect', () => {
            console.log(`Player disconnected: ${socket.id}`);
            if (currentRoom) {
                const room = rooms.get(currentRoom);
                if (room) {
                    if (room.gameState.timer) clearInterval(room.gameState.timer);
                    const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
                    const opponentSocketId = room.players[opponentRole];
                    if (opponentSocketId) {
                        io.to(opponentSocketId).emit('opponent-disconnected');
                    }
                    rooms.delete(currentRoom);
                }
            }
        });

        socket.on('webrtc-offer', (data) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;
            const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
            const opponentSocketId = room.players[opponentRole];
            if (opponentSocketId) {
                io.to(opponentSocketId).emit('webrtc-offer', data);
            }
        });

        socket.on('webrtc-answer', (data) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;
            const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
            const opponentSocketId = room.players[opponentRole];
            if (opponentSocketId) {
                io.to(opponentSocketId).emit('webrtc-answer', data);
            }
        });

        socket.on('webrtc-ice-candidate', (data) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;
            const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
            const opponentSocketId = room.players[opponentRole];
            if (opponentSocketId) {
                io.to(opponentSocketId).emit('webrtc-ice-candidate', data);
            }
        });
    });
}

module.exports = handleSocketEvents;
