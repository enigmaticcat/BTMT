export const MOVES = {
    nap: { id: 'nap', name: 'Nạp Đạn', cost: 0, group: 'yellow', emoji: '🔋', desc: '+1 đạn (combo: +2)' },
    min: { id: 'min', name: 'Mìn', cost: 0, group: 'yellow', emoji: '💣', desc: 'Giết Zombie/M.Hand. Sai = tự chết' },
    kip: { id: 'kip', name: 'Kíp', cost: 0, group: 'blue', emoji: '🧨', desc: 'Phản Súng & Shotgun' },
    khien: { id: 'khien', name: 'Khiên', cost: 0, group: 'blue', emoji: '🛡️', desc: 'Chặn Đỏ trừ Móc' },
    sung: { id: 'sung', name: 'Súng', cost: 1, group: 'red', emoji: '🔫', desc: 'Tấn công cơ bản' },
    moc: { id: 'moc', name: 'Móc', cost: 1, group: 'red', emoji: '🪝', desc: 'Phá Khiên' },
    keo: { id: 'keo', name: 'Kéo', cost: 1, group: 'blue', emoji: '✂️', desc: 'Giết Shotgun & Zombie' },
    shotgun: { id: 'shotgun', name: 'Shotgun', cost: 2, group: 'red', emoji: '🔥', desc: 'Tấn công mạnh' },
    zombie: { id: 'zombie', name: 'Zombie', cost: 3, group: 'red', emoji: '🧟', desc: 'Càn quét trừ Khiên/Kéo/Mìn' },
    sieu_khien: { id: 'sieu_khien', name: 'Siêu Khiên', cost: 2, group: 'special', emoji: '⚡', desc: 'Chặn mọi tấn công' },
    magic_hand: { id: 'magic_hand', name: 'Ma Thuật', cost: 5, group: 'special', emoji: '✋', desc: 'Thắng tất cả trừ Mìn' },
};

export const DIFF_LABELS = { easy: '😊 Dễ', normal: '😈 Thường', hard: '💀 Khó' };
