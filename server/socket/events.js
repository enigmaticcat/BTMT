const { chooseAIMove } = require('../core/aiLogic');
const { MOVES, AUGMENTS } = require('../core/constants');
const {
    createGameState,
    getAvailableMoves,
    getRandomAugments,
    resolveTurn,
    applyAugmentEffects
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
            if (!room || room.gameState.augmentPhaseEnded) return;

            const augment = AUGMENTS[augmentId];
            if (!augment) return;

            room.gameState[playerRole].augment = augmentId;

            if (room.isAI && !room.gameState.p2.augment) {
                const aiAugments = Object.keys(AUGMENTS);
                const randomAug = aiAugments[Math.floor(Math.random() * aiAugments.length)];
                room.gameState.p2.augment = randomAug;
            }

            if (room.gameState.p1.augment && room.gameState.p2.augment) {
                room.gameState.augmentPhaseEnded = true;
                // The earlier gameLogic handled basic effects. Applying specific room enhancements here.
                if (room.gameState.p1.augment === 'speed_up') room.gameState.p2.timeBank = 7.5;
                if (room.gameState.p1.augment === 'slow_down') room.gameState.p1.timeBank = 22.5;
                if (room.gameState.p1.augment === 'extra_life') room.gameState.p1.lives = 4;
                if (room.gameState.p1.augment === 'weak_opponent') room.gameState.p2.lives = Math.min(room.gameState.p2.lives, 2);
                if (room.gameState.p1.augment === 'bullet_start') {
                    room.gameState.p1.bullets = 1;
                    room.gameState.p1.lives -= 1;
                    room.gameState.p1.bulletStartTurn = room.gameState.turn;
                }

                if (room.gameState.p2.augment === 'speed_up') room.gameState.p1.timeBank = 7.5;
                if (room.gameState.p2.augment === 'slow_down') room.gameState.p2.timeBank = 22.5;
                if (room.gameState.p2.augment === 'extra_life') room.gameState.p2.lives = 4;
                if (room.gameState.p2.augment === 'weak_opponent') room.gameState.p1.lives = Math.min(room.gameState.p1.lives, 2);
                if (room.gameState.p2.augment === 'bullet_start') {
                    room.gameState.p2.bullets = 1;
                    room.gameState.p2.lives -= 1;
                    room.gameState.p2.bulletStartTurn = room.gameState.turn;
                }


                const movesP1 = getAvailableMoves(room.gameState.p1);
                const movesP2 = getAvailableMoves(room.gameState.p2);

                if (room.isAI) {
                    socket.emit('game-start', {
                        role: 'p1',
                        state: room.gameState.p1,
                        opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank },
                        moves: movesP1,
                        turn: room.gameState.turn,
                        isAI: true,
                        aiDifficulty: room.aiDifficulty,
                        yourAugment: room.gameState.p1.augment,
                        opponentAugment: room.gameState.p2.augment,
                    });
                } else {
                    io.to(room.players.p1).emit('game-start', {
                        role: 'p1',
                        state: room.gameState.p1,
                        opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank },
                        moves: movesP1,
                        turn: room.gameState.turn,
                        yourAugment: room.gameState.p1.augment,
                        opponentAugment: room.gameState.p2.augment,
                    });
                    io.to(room.players.p2).emit('game-start', {
                        role: 'p2',
                        state: room.gameState.p2,
                        opponentState: { lives: room.gameState.p1.lives, bullets: room.gameState.p1.bullets, timeBank: room.gameState.p1.timeBank },
                        moves: movesP2,
                        turn: room.gameState.turn,
                        yourAugment: room.gameState.p2.augment,
                        opponentAugment: room.gameState.p1.augment,
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

            if (room.isAI && playerRole === 'p1') {
                socket.emit('move-confirmed');
                const aiDelay = 600 + Math.random() * 600;
                setTimeout(() => {
                    if (!room.gameState.moves.p1) return;

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

            room.gameState.p1.timeBank = 15.0;
            room.gameState.p2.timeBank = 15.0;

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
