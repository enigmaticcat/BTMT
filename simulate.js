// ============================================================
// SIMULATE 20 GAMES: Smart Player vs AI Hard
// Uses the same game engine from server.js
// ============================================================

// --- GAME ENGINE (copied from server.js) ---
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
    magic_hand: { id: 'magic_hand', name: 'Bàn Tay Ma', cost: 5, group: 'special', emoji: '✋' },
};

const MATRIX = {
    nap: { nap: 'draw', min: 'win', kip: 'draw', khien: 'draw', sung: 'lose', moc: 'lose', keo: 'draw', shotgun: 'lose', zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    min: { nap: 'lose', min: 'draw', kip: 'lose', khien: 'lose', sung: 'lose', moc: 'lose', keo: 'lose', shotgun: 'lose', zombie: 'win', sieu_khien: 'lose', magic_hand: 'win' },
    kip: { nap: 'draw', min: 'win', kip: 'draw', khien: 'draw', sung: 'win', moc: 'draw', keo: 'draw', shotgun: 'win', zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    khien: { nap: 'draw', min: 'win', kip: 'draw', khien: 'draw', sung: 'draw', moc: 'lose', keo: 'draw', shotgun: 'draw', zombie: 'draw', sieu_khien: 'draw', magic_hand: 'lose' },
    sung: { nap: 'win', min: 'win', kip: 'lose', khien: 'draw', sung: 'draw', moc: 'win', keo: 'draw', shotgun: 'lose', zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    moc: { nap: 'win', min: 'win', kip: 'draw', khien: 'win', sung: 'lose', moc: 'draw', keo: 'draw', shotgun: 'lose', zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    keo: { nap: 'draw', min: 'win', kip: 'draw', khien: 'draw', sung: 'draw', moc: 'draw', keo: 'draw', shotgun: 'win', zombie: 'win', sieu_khien: 'draw', magic_hand: 'lose' },
    shotgun: { nap: 'win', min: 'win', kip: 'lose', khien: 'draw', sung: 'win', moc: 'win', keo: 'lose', shotgun: 'draw', zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    zombie: { nap: 'win', min: 'lose', kip: 'win', khien: 'draw', sung: 'win', moc: 'win', keo: 'lose', shotgun: 'win', zombie: 'draw', sieu_khien: 'draw', magic_hand: 'lose' },
    sieu_khien: { nap: 'draw', min: 'win', kip: 'draw', khien: 'draw', sung: 'draw', moc: 'draw', keo: 'draw', shotgun: 'draw', zombie: 'draw', sieu_khien: 'draw', magic_hand: 'draw' },
    magic_hand: { nap: 'win', min: 'lose', kip: 'win', khien: 'win', sung: 'win', moc: 'win', keo: 'win', shotgun: 'win', zombie: 'win', sieu_khien: 'draw', magic_hand: 'draw' },
};

// --- AI LOGIC (copied from server.js) ---
function chooseAIMove(difficulty, aiState, playerState, history) {
    const available = [];
    for (const [id, move] of Object.entries(MOVES)) {
        const canAfford = aiState.bullets >= move.cost;
        const notCooldown = !(id === 'nap' && aiState.cooldown);
        if (canAfford && notCooldown) available.push(id);
    }
    if (available.length === 0) return 'nap';

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
        const playerNaps = lastMoves.filter(h => h.p1Move === 'nap').length;
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

    if (difficulty === 'easy') return pick(available);
    if (difficulty === 'normal') return Math.random() < 0.5 ? smartMove() : pick(available);
    return smartMove(); // hard
}

// --- SMART PLAYER (simulates a decent human player) ---
function choosePlayerMove(playerState, aiState, history) {
    const available = [];
    for (const [id, move] of Object.entries(MOVES)) {
        const canAfford = playerState.bullets >= move.cost;
        const notCooldown = !(id === 'nap' && playerState.cooldown);
        if (canAfford && notCooldown) available.push(id);
    }
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pb = playerState.bullets;
    const ab = aiState.bullets;

    // Strategy: mix of smart + some randomness (70% smart, 30% random)
    if (Math.random() < 0.3) return pick(available);

    // If no bullets, usually nap but sometimes use free moves
    if (pb === 0) {
        if (ab === 0 && Math.random() < 0.2) return 'min'; // gamble: if AI also naps, min kills
        return Math.random() < 0.8 ? 'nap' : pick(['khien', 'kip', 'min']);
    }

    // If AI has 0 bullets (likely napping), attack
    if (ab === 0) {
        const attacks = available.filter(m => ['sung', 'moc', 'shotgun'].includes(m));
        if (attacks.length > 0) return pick(attacks);
    }

    // If have lots of bullets, use big moves
    if (pb >= 3) {
        const bigMoves = available.filter(m => ['zombie', 'shotgun', 'sieu_khien'].includes(m));
        if (bigMoves.length > 0 && Math.random() < 0.5) return pick(bigMoves);
    }

    // Otherwise mix attack and defense
    if (pb >= 1) {
        const options = available.filter(m => ['sung', 'khien', 'kip', 'moc', 'keo'].includes(m));
        if (options.length > 0) return pick(options);
    }

    return pick(available);
}

// --- GAME SIMULATION ---
function simulateGame(gameId) {
    const p1 = { lives: 3, bullets: 0, napStreak: 0, cooldown: false }; // Player
    const p2 = { lives: 3, bullets: 0, napStreak: 0, cooldown: false }; // AI
    const history = [];
    const turns = [];
    let turn = 1;

    while (p1.lives > 0 && p2.lives > 0 && turn <= 50) {
        const p1Move = choosePlayerMove(p1, p2, history);
        const p2Move = chooseAIMove('hard', p2, p1, history);

        const m1 = MOVES[p1Move], m2 = MOVES[p2Move];
        p1.bullets -= m1.cost;
        p2.bullets -= m2.cost;

        const p1Result = MATRIX[p1Move][p2Move];
        const p2Result = MATRIX[p2Move][p1Move];

        if (p1Result === 'lose') p1.lives -= 1;
        if (p2Result === 'lose') p2.lives -= 1;

        if (p1Move === 'nap') {
            let gain = p1.napStreak >= 1 ? 2 : 1;
            p1.bullets += gain;
            p1.napStreak += 1;
        } else { p1.napStreak = 0; }

        if (p2Move === 'nap') {
            let gain = p2.napStreak >= 1 ? 2 : 1;
            p2.bullets += gain;
            p2.napStreak += 1;
        } else { p2.napStreak = 0; }

        p1.cooldown = p1.napStreak >= 2;
        p2.cooldown = p2.napStreak >= 2;

        const turnData = { turn, p1Move, p2Move, p1Result, p2Result, p1Lives: p1.lives, p2Lives: p2.lives, p1Bullets: p1.bullets, p2Bullets: p2.bullets };
        turns.push(turnData);
        history.push(turnData);
        turn++;
    }

    const winner = p1.lives <= 0 ? 'AI' : (p2.lives <= 0 ? 'Player' : 'Draw (timeout)');
    return { gameId, turns, winner, totalTurns: turn - 1 };
}

// --- RUN 20 GAMES ---
console.log('='.repeat(70));
console.log('  MIND CLASH SIMULATION: Smart Player vs AI Hard (20 games)');
console.log('='.repeat(70));

const results = { Player: 0, AI: 0, 'Draw (timeout)': 0 };
const allGames = [];
const aiMoveCounts = {};
const playerMoveCounts = {};

for (let i = 1; i <= 20; i++) {
    const game = simulateGame(i);
    allGames.push(game);
    results[game.winner]++;

    // Count moves
    game.turns.forEach(t => {
        aiMoveCounts[t.p2Move] = (aiMoveCounts[t.p2Move] || 0) + 1;
        playerMoveCounts[t.p1Move] = (playerMoveCounts[t.p1Move] || 0) + 1;
    });
}

// --- DETAILED LOG: show 3 sample games ---
console.log('\n📋 SAMPLE GAMES (showing 3 full games):\n');
for (const game of allGames.slice(0, 3)) {
    console.log(`\n--- Game #${game.gameId} (${game.totalTurns} turns) → Winner: ${game.winner} ---`);
    console.log('Turn | Player          | AI              | P.Result | P♥ P💰 | AI♥ AI💰');
    console.log('-----|-----------------|-----------------|----------|--------|--------');
    game.turns.forEach(t => {
        const pm = MOVES[t.p1Move], am = MOVES[t.p2Move];
        console.log(
            `  ${String(t.turn).padStart(2)}  | ${(pm.emoji + ' ' + pm.name).padEnd(15)} | ${(am.emoji + ' ' + am.name).padEnd(15)} | ${t.p1Result.padEnd(8)} |  ${t.p1Lives}  ${String(t.p1Bullets).padStart(2)}  |  ${t.p2Lives}  ${String(t.p2Bullets).padStart(2)}`
        );
    });
}

// --- SUMMARY ---
console.log('\n' + '='.repeat(70));
console.log('  RESULTS SUMMARY');
console.log('='.repeat(70));
console.log(`\n🏆 Player wins: ${results.Player}/20 (${(results.Player / 20 * 100).toFixed(0)}%)`);
console.log(`🤖 AI wins:     ${results.AI}/20 (${(results.AI / 20 * 100).toFixed(0)}%)`);
console.log(`🤝 Draws:       ${results['Draw (timeout)']}/20`);

// Game lengths
const lengths = allGames.map(g => g.totalTurns);
console.log(`\n📊 Game length: avg ${(lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1)} turns, min ${Math.min(...lengths)}, max ${Math.max(...lengths)}`);

// AI Move distribution
console.log('\n🤖 AI Move Distribution:');
const totalAIMoves = Object.values(aiMoveCounts).reduce((a, b) => a + b, 0);
const sortedAI = Object.entries(aiMoveCounts).sort((a, b) => b[1] - a[1]);
sortedAI.forEach(([move, count]) => {
    const pct = (count / totalAIMoves * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / totalAIMoves * 30));
    console.log(`  ${MOVES[move].emoji} ${MOVES[move].name.padEnd(12)} ${String(count).padStart(3)}x (${pct.padStart(5)}%) ${bar}`);
});

// Player Move distribution
console.log('\n🎮 Player Move Distribution:');
const totalPMoves = Object.values(playerMoveCounts).reduce((a, b) => a + b, 0);
const sortedP = Object.entries(playerMoveCounts).sort((a, b) => b[1] - a[1]);
sortedP.forEach(([move, count]) => {
    const pct = (count / totalPMoves * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / totalPMoves * 30));
    console.log(`  ${MOVES[move].emoji} ${MOVES[move].name.padEnd(12)} ${String(count).padStart(3)}x (${pct.padStart(5)}%) ${bar}`);
});

// Analyze AI weaknesses
console.log('\n' + '='.repeat(70));
console.log('  AI BEHAVIOR ANALYSIS');
console.log('='.repeat(70));

// Check if AI naps too much
const aiNapPct = ((aiMoveCounts['nap'] || 0) / totalAIMoves * 100);
console.log(`\n⚠️  AI nạp đạn ${aiNapPct.toFixed(1)}% thời gian ${aiNapPct > 40 ? '→ QUÁ NHIỀU! Dễ bị trừng phạt' : aiNapPct > 25 ? '→ Hơi nhiều' : '→ OK'}`);

// Check if AI uses variety
const uniqueAIMoves = Object.keys(aiMoveCounts).length;
console.log(`⚠️  AI sử dụng ${uniqueAIMoves}/11 chiêu ${uniqueAIMoves < 6 ? '→ THIẾU ĐA DẠNG!' : '→ OK'}`);

// Check AI attack/defense ratio
const aiAttacks = (aiMoveCounts['sung'] || 0) + (aiMoveCounts['moc'] || 0) + (aiMoveCounts['shotgun'] || 0) + (aiMoveCounts['zombie'] || 0) + (aiMoveCounts['magic_hand'] || 0);
const aiDefense = (aiMoveCounts['khien'] || 0) + (aiMoveCounts['sieu_khien'] || 0) + (aiMoveCounts['kip'] || 0) + (aiMoveCounts['keo'] || 0);
console.log(`⚠️  AI tấn công/phòng thủ: ${aiAttacks}/${aiDefense} ${aiAttacks > aiDefense * 3 ? '→ QUÁ HUNG HĂN' : aiDefense > aiAttacks * 2 ? '→ QUÁ THỦ' : '→ CÂN BẰNG'}`);

// Per-game summary
console.log('\n📋 All 20 games:');
allGames.forEach(g => {
    const icon = g.winner === 'Player' ? '🏆' : g.winner === 'AI' ? '🤖' : '🤝';
    console.log(`  Game ${String(g.gameId).padStart(2)}: ${icon} ${g.winner.padEnd(16)} (${g.totalTurns} turns)`);
});
