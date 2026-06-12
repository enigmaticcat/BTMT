export const MOVES = {
    nap:        { id: 'nap',        name: 'Nạp Đạn',         cost: 0, damage: 0,  group: 'yellow',  emoji: '🔋', desc: '+1 đạn (combo: +2). Giữ đạn dù bị tấn công.' },
    min:        { id: 'min',        name: 'Mìn',              cost: 0, damage: 60, group: 'yellow',  emoji: '💣', desc: 'Trúng Zombie/M.Hand: -60 HP. Sai: tự nhận -25 HP.' },
    kip:        { id: 'kip',        name: 'Kíp',              cost: 0, damage: 0,  group: 'blue',    emoji: '🧨', desc: 'Phản Súng & Shotgun: 80% damage + đối thủ mất đạn.' },
    khien:      { id: 'khien',      name: 'Khiên',            cost: 0, damage: 0,  group: 'blue',    emoji: '🛡️', desc: 'Giảm 60% damage từ hệ Đỏ (trừ Móc). Đỡ được: +1 đạn.' },
    sung:       { id: 'sung',       name: 'Súng',             cost: 1, damage: 20, group: 'red',     emoji: '🔫', desc: '-20 HP. Tấn công cơ bản.' },
    moc:        { id: 'moc',        name: 'Móc',              cost: 1, damage: 15, group: 'red',     emoji: '🪝', desc: '-15 HP + cướp 1 đạn. Phá Khiên.' },
    keo:        { id: 'keo',        name: 'Kéo',              cost: 1, damage: 10, group: 'blue',    emoji: '✂️', desc: '-10 HP. Khắc chế Shotgun & Zombie.' },
    shotgun:    { id: 'shotgun',    name: 'Shotgun',          cost: 2, damage: 35, group: 'red',     emoji: '🔥', desc: '-35 HP + đối thủ mất 1 đạn.' },
    zombie:     { id: 'zombie',     name: 'Zombie',           cost: 3, damage: 50, group: 'red',     emoji: '🧟', desc: '-50 HP + đối thủ bị choáng 1 lượt.' },
    sieu_khien: { id: 'sieu_khien', name: 'Siêu Khiên',      cost: 2, damage: 0,  group: 'special', emoji: '⚡', desc: 'Chặn 100% mọi damage. Đỡ đòn ≥2đ: hoàn 1 đạn.' },
    magic_hand: { id: 'magic_hand', name: 'Bàn Tay Ma Thuật', cost: 5, damage: 70, group: 'special', emoji: '✋', desc: '-70 HP + khóa nước đắt nhất của đối thủ 1 lượt.' },
};

export const AUGMENTS = {
    speed_up:     { id: 'speed_up',     name: 'Tăng Tốc',    emoji: '⚡' },
    slow_down:    { id: 'slow_down',    name: 'Giảm Tốc',    emoji: '🐢' },
    extra_life:   { id: 'extra_life',   name: 'Thêm Máu',    emoji: '❤️' },
    weak_opponent:{ id: 'weak_opponent',name: 'Yếu Đối Thủ', emoji: '💔' },
    bullet_start: { id: 'bullet_start', name: 'Đạn Ngay',    emoji: '💣' },
    long_game:    { id: 'long_game',    name: 'Bền Lâu',     emoji: '🏆' },
};

export const DIFF_LABELS = { easy: '😊 Dễ', normal: '😈 Thường', hard: '💀 Khó' };
