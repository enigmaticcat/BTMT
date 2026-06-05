const { MOVES, AUGMENTS } = require('../core/constants');
const { getResultDescription, resolveTurn, createGameState, getAvailableMoves, getRandomAugments, applyAugmentEffects } = require('../core/gameLogic');
const { chooseAIMove } = require('../core/aiLogic');

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

module.exports = function setupSocket(io) {
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
            io.to(room.players.p1).emit('augment-selection-start', { augments: randomAugments, timeLimit: 15 });
            io.to(room.players.p2).emit('augment-selection-start', { augments: randomAugments, timeLimit: 15 });
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
                room.gameState.p2.augment = aiAugments[Math.floor(Math.random() * aiAugments.length)];
            }

            if (room.gameState.p1.augment && room.gameState.p2.augment) {
                room.gameState.augmentPhaseEnded = true;

                const p1 = room.gameState.p1;
                const p2 = room.gameState.p2;
                if (p1.augment === 'speed_up') p2.timeBank = 7.5;
                if (p1.augment === 'slow_down') p1.timeBank = 22.5;
                if (p1.augment === 'extra_life') p1.lives = 4;
                if (p1.augment === 'weak_opponent') p2.lives = 2;
                if (p1.augment === 'bullet_start') { p1.bullets = 1; p1.lives = 2; p1.bulletStartTurn = room.gameState.turn; }

                if (p2.augment === 'speed_up') p1.timeBank = 7.5;
                if (p2.augment === 'slow_down') p2.timeBank = 22.5;
                if (p2.augment === 'extra_life') p2.lives = 4;
                if (p2.augment === 'weak_opponent') p1.lives = 2;
                if (p2.augment === 'bullet_start') { p2.bullets = 1; p2.lives = 2; p2.bulletStartTurn = room.gameState.turn; }

                const movesP1 = getAvailableMoves(room.gameState.p1);
                const movesP2 = getAvailableMoves(room.gameState.p2);

                if (room.isAI) {
                    socket.emit('game-start', {
                        role: 'p1',
                        state: p1,
                        opponentState: { lives: p2.lives, bullets: p2.bullets, timeBank: p2.timeBank },
                        moves: movesP1,
                        turn: room.gameState.turn,
                        isAI: true,
                        aiDifficulty: room.aiDifficulty,
                        yourAugment: p1.augment,
                        opponentAugment: p2.augment,
                    });
                } else {
                    io.to(room.players.p1).emit('game-start', {
                        role: 'p1', state: p1, opponentState: { lives: p2.lives, bullets: p2.bullets, timeBank: p2.timeBank },
                        moves: movesP1, turn: room.gameState.turn, yourAugment: p1.augment, opponentAugment: p2.augment,
                    });
                    io.to(room.players.p2).emit('game-start', {
                        role: 'p2', state: p2, opponentState: { lives: p1.lives, bullets: p1.bullets, timeBank: p1.timeBank },
                        moves: movesP2, turn: room.gameState.turn, yourAugment: p2.augment, opponentAugment: p1.augment,
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
            if (!move || pState.bullets < move.cost || (moveId === 'nap' && pState.cooldown)) return;

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
                setTimeout(() => {
                    if (!room.gameState.moves.p1) return;
                    const aiElapsed = (Date.now() - room.gameState.turnStartedAt) / 1000;
                    room.gameState.p2.timeBank -= aiElapsed;
                    if (room.gameState.p2.timeBank < 0) room.gameState.p2.timeBank = 0;

                    if (!room.gameState.firstToMove) { room.gameState.firstToMove = 'p2'; room.gameState.p2.timeBank += 1.0; }
                    else { room.gameState.p2.timeBank += 0.5; }

                    room.gameState.moves.p2 = chooseAIMove(room.aiDifficulty, room.gameState.p2, room.gameState.p1, room.gameState.history);
                    resolveAndSend(room);
                }, 600 + Math.random() * 600);
                return;
            }

            const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
            if (room.players[opponentRole]) io.to(room.players[opponentRole]).emit('opponent-ready');
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
                const elapsed = (Date.now() - room.gameState.turnStartedAt) / 1000;
                let p1Timeout = !room.gameState.moves.p1 && (room.gameState.p1.timeBank - elapsed <= 0);
                let p2Timeout = !room.gameState.moves.p2 && (room.gameState.p2.timeBank - elapsed <= 0);

                if (p1Timeout || p2Timeout) handleTimeout(room, p1Timeout, p2Timeout);
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
                turn: room.gameState.turn, p1Move: 'timeout', p2Move: 'timeout',
                p1Result: p1Timeout ? 'lose' : 'win', p2Result: p2Timeout ? 'lose' : 'win',
                descP1: p1Desc, descP2: p2Desc,
                p1State: room.gameState.p1, p2State: room.gameState.p2,
                gameOver: room.gameState.p1.lives <= 0 || room.gameState.p2.lives <= 0,
                winner: room.gameState.p1.lives <= 0 && room.gameState.p2.lives <= 0 ? 'draw' : (room.gameState.p1.lives <= 0 ? 'p2' : (room.gameState.p2.lives <= 0 ? 'p1' : null))
            };

            room.gameState.history.push(turnResult);
            room.gameState.turn += 1;
            room.gameState.moves = { p1: null, p2: null };
            if (turnResult.gameOver) room.gameState.gameOver = true;

            emitTurnResult(room, turnResult);
        }

        function emitTurnResult(room, turnResult) {
            io.to(room.players.p1).emit('turn-result', {
                yourMove: turnResult.p1Move, opponentMove: turnResult.p2Move, result: turnResult.p1Result,
                description: turnResult.descP1, yourState: turnResult.p1State, opponentState: turnResult.p2State,
                turn: turnResult.turn, gameOver: turnResult.gameOver,
                winner: turnResult.winner === 'p1' ? 'you' : (turnResult.winner === 'p2' ? 'opponent' : (turnResult.winner === 'draw' ? 'draw' : null)),
            });

            if (room.players.p2 !== 'AI') {
                io.to(room.players.p2).emit('turn-result', {
                    yourMove: turnResult.p2Move, opponentMove: turnResult.p1Move, result: turnResult.p2Result,
                    description: turnResult.descP2, yourState: turnResult.p2State, opponentState: turnResult.p1State,
                    turn: turnResult.turn, gameOver: turnResult.gameOver,
                    winner: turnResult.winner === 'p2' ? 'you' : (turnResult.winner === 'p1' ? 'opponent' : (turnResult.winner === 'draw' ? 'draw' : null)),
                });
            }

            if (!turnResult.gameOver) setTimeout(() => sendNextTurn(room), 3500);
        }

        function sendNextTurn(room) {
            if (room.gameState.gameOver) return;
            io.to(room.players.p1).emit('next-turn', {
                moves: getAvailableMoves(room.gameState.p1), state: room.gameState.p1,
                opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank }, turn: room.gameState.turn,
            });
            if (room.players.p2 !== 'AI') {
                io.to(room.players.p2).emit('next-turn', {
                    moves: getAvailableMoves(room.gameState.p2), state: room.gameState.p2,
                    opponentState: { lives: room.gameState.p1.lives, bullets: room.gameState.p1.bullets, timeBank: room.gameState.p1.timeBank }, turn: room.gameState.turn,
                });
            }
            startTurnTimer(room);
        }

        function resolveAndSend(room) {
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
                socket.emit('game-start', {
                    role: 'p1', state: room.gameState.p1, opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank },
                    moves: getAvailableMoves(room.gameState.p1), turn: room.gameState.turn, isAI: true, aiDifficulty: room.aiDifficulty,
                });
                startTurnTimer(room);
                return;
            }

            if (!room.rematchVotes) room.rematchVotes = new Set();
            room.rematchVotes.add(playerRole);

            const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
            if (room.players[opponentRole]) io.to(room.players[opponentRole]).emit('rematch-requested');

            if (room.rematchVotes.size >= 2) {
                if (room.gameState.timer) { clearTimeout(room.gameState.timer); room.gameState.timer = null; }
                room.gameState = createGameState();
                room.rematchVotes = new Set();
                io.to(room.players.p1).emit('game-start', { role: 'p1', state: room.gameState.p1, opponentState: { lives: room.gameState.p2.lives, bullets: room.gameState.p2.bullets, timeBank: room.gameState.p2.timeBank }, moves: getAvailableMoves(room.gameState.p1), turn: room.gameState.turn });
                io.to(room.players.p2).emit('game-start', { role: 'p2', state: room.gameState.p2, opponentState: { lives: room.gameState.p1.lives, bullets: room.gameState.p1.bullets, timeBank: room.gameState.p1.timeBank }, moves: getAvailableMoves(room.gameState.p2), turn: room.gameState.turn });
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
                    if (room.players[opponentRole]) io.to(room.players[opponentRole]).emit('opponent-disconnected');
                    rooms.delete(currentRoom);
                }
            }
        });

        ['webrtc-offer', 'webrtc-answer', 'webrtc-ice-candidate'].forEach(event => {
            socket.on(event, (data) => {
                if (!currentRoom) return;
                const room = rooms.get(currentRoom);
                if (!room) return;
                const oppRole = playerRole === 'p1' ? 'p2' : 'p1';
                if (room.players[oppRole]) io.to(room.players[oppRole]).emit(event, data);
            });
        });
    });
};
