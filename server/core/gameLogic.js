const { MOVES, AUGMENTS, MATRIX } = require('./constants');

const BASE_HP = 360;
const TIMEOUT_DAMAGE = 70;
const MIN_SELF_DAMAGE = 25;
const KIP_REFLECT_RATIO = 0.8;

// Apply the outcome of a single side winning/losing/drawing.
// winner/loser are player state objects; winId/loseId are move IDs.
function applyOutcome(winner, loser, winId, loseId) {
    const winMove = MOVES[winId];

    // kip overrides normal damage entirely (handled in its onWin callback)
    if (winId !== 'kip') {
        loser.hp -= winMove.damage;
    }

    if (winMove.onWin) winMove.onWin(winner, loser, winId, loseId);

    const loseMove = MOVES[loseId];
    if (loseMove.onLose) loseMove.onLose(loser, winner, loseId, winId);
}

function resolveTurn(room) {
    const { p1, p2, moves } = room.gameState;
    const p1Move = moves.p1;
    const p2Move = moves.p2;

    // Deduct bullet costs (freeMove waives the cost)
    p1.bullets -= p1.freeMove ? 0 : MOVES[p1Move].cost;
    p2.bullets -= p2.freeMove ? 0 : MOVES[p2Move].cost;

    // Apply pending bullets from last turn's shield bonus
    if (p1.pendingBullet) { p1.bullets += p1.pendingBullet; p1.pendingBullet = 0; }
    if (p2.pendingBullet) { p2.bullets += p2.pendingBullet; p2.pendingBullet = 0; }

    // Clear debuffs and freeMove now that we've used them
    p1.debuff = null;
    p2.debuff = null;
    p1.freeMove = false;
    p2.freeMove = false;

    const p1Result = MATRIX[p1Move][p2Move];
    const p2Result = MATRIX[p2Move][p1Move];

    const p1HpBefore = p1.hp;
    const p2HpBefore = p2.hp;

    if (p1Result === 'draw') {
        // draw — each side calls its own onDraw
        if (MOVES[p1Move].onDraw) MOVES[p1Move].onDraw(p1, p2, p1Move, p2Move);
        if (MOVES[p2Move].onDraw) MOVES[p2Move].onDraw(p2, p1, p2Move, p1Move);
    } else {
        // win/lose: determine winner and loser, handle min self-damage
        const [winner, loser, winId, loseId] = p1Result === 'win'
            ? [p1, p2, p1Move, p2Move]
            : [p2, p1, p2Move, p1Move];

        if (loseId === 'min') {
            // min tự nổ: only self-damage, no normal attack applied
            loser.hp -= MIN_SELF_DAMAGE;
        } else {
            applyOutcome(winner, loser, winId, loseId);
        }
    }

    // Nap streak
    if (p1Move === 'nap') {
        const gain = p1.napStreak >= 1 ? 2 : 1;
        p1.bullets += gain;
        p1.napStreak += 1;
    } else {
        p1.napStreak = 0;
    }
    if (p2Move === 'nap') {
        const gain = p2.napStreak >= 1 ? 2 : 1;
        p2.bullets += gain;
        p2.napStreak += 1;
    } else {
        p2.napStreak = 0;
    }

    p1.cooldown = (p1.napStreak >= 2);
    p2.cooldown = (p2.napStreak >= 2);

    // Win/lose streaks
    if (p1Result === 'win') {
        p1.winStreak = (p1.winStreak || 0) + 1; p1.loseStreak = 0;
        p2.winStreak = 0; p2.loseStreak = (p2.loseStreak || 0) + 1;
    } else if (p1Result === 'lose') {
        p2.winStreak = (p2.winStreak || 0) + 1; p2.loseStreak = 0;
        p1.winStreak = 0; p1.loseStreak = (p1.loseStreak || 0) + 1;
    }

    // Combo: win 2 in a row → next move free
    if (p1.winStreak >= 2) { p1.freeMove = true; p1.winStreak = 0; }
    if (p2.winStreak >= 2) { p2.freeMove = true; p2.winStreak = 0; }

    // Comeback: lose 2 in a row → +1 bullet
    if (p1.loseStreak >= 2) { p1.bullets += 1; p1.loseStreak = 0; }
    if (p2.loseStreak >= 2) { p2.bullets += 1; p2.loseStreak = 0; }

    // Augment: long_game
    if (p1.augment === 'long_game' && room.gameState.turn === 7) p1.hp += 50;
    if (p2.augment === 'long_game' && room.gameState.turn === 7) p2.hp += 50;

    // Augment: bullet_start delayed reward
    if (p1.augment === 'bullet_start' && p1.bulletStartTurn && room.gameState.turn === p1.bulletStartTurn + 3) p1.bullets += 3;
    if (p2.augment === 'bullet_start' && p2.bulletStartTurn && room.gameState.turn === p2.bulletStartTurn + 3) p2.bullets += 3;

    // Clamp HP >= 0
    p1.hp = Math.max(0, p1.hp);
    p2.hp = Math.max(0, p2.hp);

    const p1Dmg = p1HpBefore - p1.hp;
    const p2Dmg = p2HpBefore - p2.hp;

    const descP1 = getResultDescription(p1Move, p2Move, p1Result, p1Dmg);
    const descP2 = getResultDescription(p2Move, p1Move, p2Result, p2Dmg);

    const turnResult = {
        turn: room.gameState.turn,
        p1Move, p2Move,
        p1Result, p2Result,
        descP1, descP2,
        p1State: { hp: p1.hp, maxHp: p1.maxHp, bullets: p1.bullets, cooldown: p1.cooldown, napStreak: p1.napStreak, debuff: p1.debuff, freeMove: p1.freeMove },
        p2State: { hp: p2.hp, maxHp: p2.maxHp, bullets: p2.bullets, cooldown: p2.cooldown, napStreak: p2.napStreak, debuff: p2.debuff, freeMove: p2.freeMove },
        gameOver: p1.hp <= 0 || p2.hp <= 0,
        winner: (p1.hp <= 0 && p2.hp <= 0) ? 'draw' : (p1.hp <= 0 ? 'p2' : (p2.hp <= 0 ? 'p1' : null)),
    };

    room.gameState.history.push(turnResult);
    room.gameState.turn += 1;
    room.gameState.moves = { p1: null, p2: null };

    if (turnResult.gameOver) room.gameState.gameOver = true;

    return turnResult;
}

function getResultDescription(myMove, oppMove, result, dmgTaken) {
    const m1 = MOVES[myMove];
    const m2 = MOVES[oppMove];
    const dmgStr = dmgTaken > 0 ? ` (-${dmgTaken} HP)` : '';

    if (myMove === oppMove) {
        if (myMove === 'nap') return 'Cả hai nạp đạn!';
        if (m1.cost > 0) return `Hòa Hủy Diệt! Cả hai mất ${m1.cost} đạn.`;
        return 'Hòa!';
    }

    if (myMove === 'min') {
        if (result === 'win') return `💣 Mìn phát nổ! ${m2.name} mất ${m2.damage} HP!`;
        return `💀 Mìn tự nổ! Tự nhận ${MIN_SELF_DAMAGE} HP.`;
    }
    if (oppMove === 'min') {
        if (result === 'lose') return `💣 Mìn phát nổ! Bạn mất ${m1.damage} HP!`;
        return `💀 Đối thủ đặt Mìn nhưng tự nổ!`;
    }
    if (myMove === 'kip' && result === 'win') {
        const reflected = Math.round(m2.damage * KIP_REFLECT_RATIO);
        return `🧨 Kíp phản! ${m2.name} nhận ${reflected} HP phản lại!`;
    }
    if (oppMove === 'kip' && result === 'lose') {
        const reflected = Math.round(m1.damage * KIP_REFLECT_RATIO);
        return `🧨 Kíp phản! Bạn nhận ${reflected} HP phản lại!`;
    }
    if (myMove === 'khien' && result === 'draw') return `🛡️ Khiên giảm sát thương!${dmgStr}`;
    if (myMove === 'sieu_khien' && result === 'draw') return `⚡ Siêu Khiên chặn hoàn toàn!`;
    if (oppMove === 'sieu_khien' && result === 'draw') return `⚡ Siêu Khiên chặn hoàn toàn!`;
    if (myMove === 'nap' && result === 'lose') return `${m2.emoji} Bị tấn công lúc nạp đạn!${dmgStr} (đạn vẫn được giữ)`;
    if (result === 'win') return `${m1.emoji} ${m1.name} trúng! Đối thủ mất ${m2.damage > 0 ? m2.damage : MOVES[myMove].damage} HP.`;
    if (result === 'lose') return `${m2.emoji} ${m2.name} trúng!${dmgStr}`;
    return 'Hòa!';
}

function createGameState() {
    return {
        p1: { hp: BASE_HP, maxHp: BASE_HP, bullets: 0, napStreak: 0, cooldown: false, timeBank: 15.0, augment: null, bulletStartTurn: null, winStreak: 0, loseStreak: 0, debuff: null, freeMove: false, pendingBullet: 0 },
        p2: { hp: BASE_HP, maxHp: BASE_HP, bullets: 0, napStreak: 0, cooldown: false, timeBank: 15.0, augment: null, bulletStartTurn: null, winStreak: 0, loseStreak: 0, debuff: null, freeMove: false, pendingBullet: 0 },
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
    const freeMove = playerState.freeMove;

    let maxEffectiveCost = -1;
    if (playerState.debuff === 'lock') {
        for (const move of Object.values(MOVES)) {
            const ec = freeMove ? 0 : move.cost;
            if (playerState.bullets >= ec && ec > maxEffectiveCost) maxEffectiveCost = ec;
        }
    }

    const available = [];
    for (const [id, move] of Object.entries(MOVES)) {
        const effectiveCost = freeMove ? 0 : move.cost;
        const canAfford = playerState.bullets >= effectiveCost;
        const notCooldown = !(id === 'nap' && playerState.cooldown);
        const notStunned = !(playerState.debuff === 'stun' && move.cost > 0);
        const notLocked = !(playerState.debuff === 'lock' && effectiveCost === maxEffectiveCost);

        const isAvailable = canAfford && notCooldown && notStunned && notLocked;
        let reason = '';
        if (!canAfford) reason = 'Không đủ đạn';
        else if (id === 'nap' && playerState.cooldown) reason = 'Cooldown';
        else if (!notStunned) reason = 'Đang choáng';
        else if (!notLocked) reason = 'Bị khóa';

        available.push({ ...move, available: isAvailable, reason, effectiveCost });
    }
    return available;
}

function getRandomAugments() {
    const keys = Object.keys(AUGMENTS);
    for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    return keys.slice(0, 3).map(k => AUGMENTS[k]);
}

module.exports = {
    getResultDescription,
    resolveTurn,
    createGameState,
    getAvailableMoves,
    getRandomAugments,
    BASE_HP,
    TIMEOUT_DAMAGE,
};
