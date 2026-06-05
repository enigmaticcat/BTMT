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

const AUGMENTS = {
    speed_up: { id: 'speed_up', name: 'Tăng Tốc', desc: 'Đối phương bắt đầu với 7.5s', emoji: '⚡' },
    slow_down: { id: 'slow_down', name: 'Giảm Tốc', desc: 'Bạn bắt đầu với 22.5s', emoji: '🐢' },
    extra_life: { id: 'extra_life', name: 'Thêm Mạng', desc: 'Bắt đầu với 4 mạng thay vì 3', emoji: '❤️' },
    weak_opponent: { id: 'weak_opponent', name: 'Yếu Đối Thủ', desc: 'Đối phương chỉ có 2 mạng', emoji: '💔' },
    bullet_start: { id: 'bullet_start', name: 'Đạn Ngay', desc: 'Bắt đầu 1 đạn, mất 1 mạng. Sau 3 turn nhận 3 đạn', emoji: '💣' },
    long_game: { id: 'long_game', name: 'Bền Lâu', desc: 'Sau 10 turn: +2 mạng', emoji: '🏆' },
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

module.exports = { MOVES, AUGMENTS, MATRIX };