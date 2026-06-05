const { MOVES } = require('./constants');

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

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    function smartMove() {
        const pb = playerState.bullets;
        const ab = aiState.bullets;

        if (pb === 0) {
            const attacks = available.filter(m => ['sung', 'moc', 'shotgun', 'zombie', 'magic_hand'].includes(m));
            if (attacks.length > 0) return pick(attacks);
        }

        if (ab === 0) return 'nap';

        const lastMoves = history.slice(-3);
        const playerNaps = lastMoves.filter(h => h.p2Move === 'nap' || h.p1Move === 'nap').length;
        if (playerNaps >= 2) {
            const attacks = available.filter(m => ['sung', 'moc', 'shotgun'].includes(m));
            if (attacks.length > 0) return pick(attacks);
        }

        if (pb >= 2) {
            const defenses = available.filter(m => ['khien', 'sieu_khien', 'kip', 'keo'].includes(m));
            if (defenses.length > 0 && Math.random() > 0.4) return pick(defenses);
        }

        if (ab <= 1 && available.includes('nap')) {
            if (Math.random() > 0.3) return 'nap';
        }

        return pick(available);
    }

    if (difficulty === 'normal') {
        return Math.random() < 0.5 ? smartMove() : pick(available);
    }

    if (difficulty === 'hard') {
        return smartMove();
    }

    return pick(available);
}

module.exports = { chooseAIMove };