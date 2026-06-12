// onWin(winner, loser, winMoveId, loseMoveId)  — called when this move wins
// onLose(loser, winner, loseMoveId, winMoveId) — called when this move loses
// onDraw(self, opp, myMoveId, oppMoveId)       — called for both sides on draw (each side calls its own)
// onUse(user, opp, myMoveId, oppMoveId, result) — called every turn regardless of result (for nap, etc.)

const MOVES = {
    nap: {
        id: 'nap', name: 'Nạp Đạn', cost: 0, damage: 0, group: 'yellow', emoji: '🔋',
        desc: 'Nhận +1 đạn. Nạp liên tiếp lần 2+ nhận +2. Sau 2 lần liên tiếp bị cooldown.',
        // nap gain is handled in resolveTurn (needs napStreak state) — onUse left null
        onWin: null, onLose: null, onDraw: null, onUse: null,
    },
    min: {
        id: 'min', name: 'Mìn', cost: 0, damage: 60, group: 'yellow', emoji: '💣',
        desc: 'Bẫy: thắng Zombie và Bàn Tay Ma Thuật. Thua trong mọi trường hợp còn lại.',
        // min self-damage on lose handled in resolveTurn
        onWin: null, onLose: null, onDraw: null, onUse: null,
    },
    kip: {
        id: 'kip', name: 'Kíp', cost: 0, damage: 0, group: 'blue', emoji: '🧨',
        desc: 'Phản Súng và Shotgun. Thua Zombie.',
        onWin: (winner, loser, winId, loseId) => {
            const loseMove = MOVES[loseId];
            const reflected = Math.round(loseMove.damage * 0.8);
            loser.hp -= reflected;
            loser.bullets = Math.max(0, loser.bullets - loseMove.cost);
        },
        onLose: null, onDraw: null, onUse: null,
    },
    khien: {
        id: 'khien', name: 'Khiên', cost: 0, damage: 0, group: 'blue', emoji: '🛡️',
        desc: 'Chặn tất cả nước Đỏ trừ Móc. Thua Bàn Tay Ma Thuật.',
        onWin: null,
        onLose: null,
        // Draw vs red (not moc): reduce incoming damage and grant +1 bullet
        onDraw: (self, opp, myId, oppId) => {
            const oppMove = MOVES[oppId];
            if (oppMove.group === 'red' && oppId !== 'moc') {
                const dmgTaken = Math.round(oppMove.damage * 0.4); // 60% reduction = take 40%
                self.hp -= dmgTaken;
                self.pendingBullet = (self.pendingBullet || 0) + 1;
            }
        },
        onUse: null,
    },
    keo: {
        id: 'keo', name: 'Kéo', cost: 1, damage: 10, group: 'blue', emoji: '✂️',
        desc: 'Tiêu diệt Shotgun và Zombie. Hòa hầu hết nước còn lại.',
        onWin: null, onLose: null, onDraw: null, onUse: null,
    },
    sung: {
        id: 'sung', name: 'Súng', cost: 1, damage: 20, group: 'red', emoji: '🔫',
        desc: 'Tấn công cơ bản. Thắng Nạp Đạn và Móc.',
        onWin: null, onLose: null, onDraw: null, onUse: null,
    },
    moc: {
        id: 'moc', name: 'Móc', cost: 1, damage: 15, group: 'red', emoji: '🪝',
        desc: 'Phá Khiên. Thắng Nạp Đạn và Khiên, thua Súng và Shotgun.',
        onWin: (winner, loser, winId, loseId) => {
            // Steal 1 bullet from loser
            if (loser.bullets > 0) {
                loser.bullets -= 1;
                winner.bullets += 1;
            }
        },
        onLose: null, onDraw: null, onUse: null,
    },
    shotgun: {
        id: 'shotgun', name: 'Shotgun', cost: 2, damage: 35, group: 'red', emoji: '🔥',
        desc: 'Tấn công mạnh. Thắng Súng, Nạp Đạn, Móc. Thua Kíp và Kéo.',
        onWin: (winner, loser, winId, loseId) => {
            // Loser loses 1 extra bullet
            loser.bullets = Math.max(0, loser.bullets - 1);
        },
        onLose: null, onDraw: null, onUse: null,
    },
    zombie: {
        id: 'zombie', name: 'Zombie', cost: 3, damage: 50, group: 'red', emoji: '🧟',
        desc: 'Càn quét diện rộng. Stun đối thủ (chỉ dùng nước 0 đạn lượt sau).',
        onWin: (winner, loser, winId, loseId) => {
            loser.debuff = 'stun';
        },
        onLose: null, onDraw: null, onUse: null,
    },
    sieu_khien: {
        id: 'sieu_khien', name: 'Siêu Khiên', cost: 2, damage: 0, group: 'special', emoji: '⚡',
        desc: 'Chặn mọi tấn công kể cả Móc. Chỉ thua Bàn Tay Ma Thuật, hòa Siêu Khiên.',
        onWin: null,
        onLose: null,
        // Draw: refund 1 bullet if opponent's move cost >= 2
        onDraw: (self, opp, myId, oppId) => {
            if (MOVES[oppId].cost >= 2) self.bullets += 1;
        },
        onUse: null,
    },
    magic_hand: {
        id: 'magic_hand', name: 'Bàn Tay Ma Thuật', cost: 5, damage: 70, group: 'special', emoji: '✋',
        desc: 'Thắng tất cả mọi nước trừ Mìn (thua) và Siêu Khiên (hòa). Cực kỳ đắt.',
        onWin: (winner, loser, winId, loseId) => {
            loser.debuff = 'lock';
        },
        onLose: null, onDraw: null, onUse: null,
    },
};

const AUGMENTS = {
    speed_up:     { id: 'speed_up',     name: 'Tăng Tốc',    desc: 'Đối phương bắt đầu với 7.5s',                        emoji: '⚡' },
    slow_down:    { id: 'slow_down',    name: 'Giảm Tốc',    desc: 'Bạn bắt đầu với 22.5s',                              emoji: '🐢' },
    extra_life:   { id: 'extra_life',   name: 'Thêm Máu',    desc: 'Bắt đầu với 410 HP thay vì 360',                     emoji: '❤️' },
    weak_opponent:{ id: 'weak_opponent',name: 'Yếu Đối Thủ', desc: 'Đối phương chỉ có 250 HP',                            emoji: '💔' },
    bullet_start: { id: 'bullet_start', name: 'Đạn Ngay',    desc: 'Bắt đầu 1 đạn, còn 290 HP. Sau 3 turn nhận 3 đạn',  emoji: '💣' },
    long_game:    { id: 'long_game',    name: 'Bền Lâu',     desc: 'Sau turn 7: +50 HP',                                  emoji: '🏆' },
};

const MATRIX = {
    nap:        { nap: 'draw', min: 'win',  kip: 'draw', khien: 'draw', keo: 'draw', sung: 'lose', moc: 'lose', shotgun: 'lose', zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    min:        { nap: 'lose', min: 'draw', kip: 'lose', khien: 'lose', keo: 'lose', sung: 'lose', moc: 'lose', shotgun: 'lose', zombie: 'win',  sieu_khien: 'lose', magic_hand: 'win'  },
    kip:        { nap: 'draw', min: 'win',  kip: 'draw', khien: 'draw', keo: 'draw', sung: 'win',  moc: 'draw', shotgun: 'win',  zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    khien:      { nap: 'draw', min: 'win',  kip: 'draw', khien: 'draw', keo: 'draw', sung: 'draw', moc: 'lose', shotgun: 'draw', zombie: 'draw', sieu_khien: 'draw', magic_hand: 'lose' },
    keo:        { nap: 'draw', min: 'win',  kip: 'draw', khien: 'draw', keo: 'draw', sung: 'draw', moc: 'draw', shotgun: 'win',  zombie: 'win',  sieu_khien: 'draw', magic_hand: 'lose' },
    sung:       { nap: 'win',  min: 'win',  kip: 'lose', khien: 'draw', keo: 'draw', sung: 'draw', moc: 'win',  shotgun: 'lose', zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    moc:        { nap: 'win',  min: 'win',  kip: 'draw', khien: 'win',  keo: 'draw', sung: 'lose', moc: 'draw', shotgun: 'lose', zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    shotgun:    { nap: 'win',  min: 'win',  kip: 'lose', khien: 'draw', keo: 'lose', sung: 'win',  moc: 'win',  shotgun: 'draw', zombie: 'lose', sieu_khien: 'draw', magic_hand: 'lose' },
    zombie:     { nap: 'win',  min: 'lose', kip: 'win',  khien: 'draw', keo: 'lose', sung: 'win',  moc: 'win',  shotgun: 'win',  zombie: 'draw', sieu_khien: 'draw', magic_hand: 'lose' },
    sieu_khien: { nap: 'draw', min: 'win',  kip: 'draw', khien: 'draw', keo: 'draw', sung: 'draw', moc: 'draw', shotgun: 'draw', zombie: 'draw', sieu_khien: 'draw', magic_hand: 'draw' },
    magic_hand: { nap: 'win',  min: 'lose', kip: 'win',  khien: 'win',  keo: 'win',  sung: 'win',  moc: 'win',  shotgun: 'win',  zombie: 'win',  sieu_khien: 'draw', magic_hand: 'draw' },
};

module.exports = { MOVES, AUGMENTS, MATRIX };
