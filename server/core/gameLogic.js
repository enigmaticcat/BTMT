const { MOVES, AUGMENTS, MATRIX } = require('./constants');

function getResultDescription(p1Move, p2Move, p1Result) {
    if (p1Move === p2Move) {
        const m = MOVES[p1Move];
        if (p1Move === 'nap') return 'Cả hai nạp đạn! +1 đạn mỗi người.';
        if (m.cost > 0) return `Hòa Hủy Diệt! Cả hai mất ${m.cost} đạn.`;
        return 'Hòa! Không ai bị ảnh hưởng.';
    }

    const m1 = MOVES[p1Move], m2 = MOVES[p2Move];

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

    p1.bullets -= m1.cost;
    p2.bullets -= m2.cost;

    const p1Result = MATRIX[p1Move][p2Move];
    const p2Result = MATRIX[p2Move][p1Move];

    if (p1Result === 'lose') {
        if (p1Move === 'min' && p2Move !== 'zombie' && p2Move !== 'magic_hand') {
            p1.lives -= 1;
        } else {
            p1.lives -= 1;
        }
    }
    if (p2Result === 'lose') {
        if (p2Move === 'min' && p1Move !== 'zombie' && p1Move !== 'magic_hand') {
            p2.lives -= 1;
        } else {
            p2.lives -= 1;
        }
    }

    if (p1Move === 'nap') {
        let gain = 1;
        if (p1.napStreak >= 1) gain = 2;
        p1.bullets += gain;
        p1.napStreak += 1;
    } else {
        p1.napStreak = 0;
    }

    if (p2Move === 'nap') {
        let gain = 1;
        if (p2.napStreak >= 1) gain = 2;
        p2.bullets += gain;
        p2.napStreak += 1;
    } else {
        p2.napStreak = 0;
    }

    p1.cooldown = (p1.napStreak >= 2);
    p2.cooldown = (p2.napStreak >= 2);

    if (p1.augment === 'long_game' && room.gameState.turn === 10) p1.lives += 2;
    if (p2.augment === 'long_game' && room.gameState.turn === 10) p2.lives += 2;

    if (p1.augment === 'bullet_start' && p1.bulletStartTurn && room.gameState.turn === p1.bulletStartTurn + 3) p1.bullets += 3;
    if (p2.augment === 'bullet_start' && p2.bulletStartTurn && room.gameState.turn === p2.bulletStartTurn + 3) p2.bullets += 3;

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
        p1: { lives: 3, bullets: 0, napStreak: 0, cooldown: false, timeBank: 15.0, augment: null, bulletStartTurn: null },
        p2: { lives: 3, bullets: 0, napStreak: 0, cooldown: false, timeBank: 15.0, augment: null, bulletStartTurn: null },
        turn: 1,
        turnStartedAt: null,
        firstToMove: null,
        history: [],
        moves: { p1: null, p2: null },
        gameOver: false,
        timer: null,
        augmentPhaseEnded: false,
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

function getRandomAugments() {
    const keys = Object.keys(AUGMENTS);
    const shuffled = keys.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(k => AUGMENTS[k]);
}

function applyAugment(player, augmentId, currTurn) {
    player.augment = augmentId;
    switch (augmentId) {
        case 'extra_life':
            player.lives += 1;
            break;
        case 'weak_opponent':
            // Handled in applyOpponentAugmentEffect
            break;
        case 'bullet_start':
            player.bullets += 1;
            player.lives -= 1;
            player.bulletStartTurn = currTurn;
            break;
    }
}

function applyOpponentAugmentEffect(p1, p2) {
    if (p1.augment === 'weak_opponent') p2.lives = Math.min(p2.lives, 2);
    if (p2.augment === 'weak_opponent') p1.lives = Math.min(p1.lives, 2);
}

module.exports = {
    getResultDescription,
    resolveTurn,
    createGameState,
    getAvailableMoves,
    getRandomAugments,
    applyAugment,
    applyOpponentAugmentEffect
};