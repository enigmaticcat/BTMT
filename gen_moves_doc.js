const { MOVES, AUGMENTS, MATRIX } = require('./server/core/constants');
const {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, HeadingLevel, AlignmentType, WidthType,
    BorderStyle, ShadingType, convertInchesToTwip,
} = require('docx');
const fs = require('fs');
const path = require('path');

const GROUP_COLORS = {
    'yellow':  'B88600',
    'blue':    '0070C0',
    'red':     'C00000',
    'special': '7030A0',
};

const GROUP_LABELS = {
    'yellow':  'Vàng — Tích Lũy',
    'blue':    'Xanh — Kỹ Thuật',
    'red':     'Đỏ — Tấn Công',
    'special': 'Đặc Biệt',
};

function shading(fill) {
    return { type: ShadingType.CLEAR, color: 'auto', fill };
}

function headerCell(text, fill = '2F4F4F') {
    return new TableCell({
        shading: shading(fill),
        children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
        })],
    });
}

function dataCell(text, fill, color = '000000', bold = false, size = 18, align = AlignmentType.LEFT) {
    return new TableCell({
        shading: shading(fill || 'FFFFFF'),
        children: [new Paragraph({
            alignment: align,
            children: [new TextRun({ text: String(text), color, bold, size })],
        })],
    });
}

function buildSummaryTable() {
    const headers = ['Tên', 'Nhóm', 'Cost', 'Damage', 'Mô Tả Ngắn'];
    const rows = [
        new TableRow({
            children: headers.map(h => headerCell(h)),
            tableHeader: true,
        }),
        ...Object.values(MOVES).map(m => {
            const gc = GROUP_COLORS[m.group] || '000000';
            const gl = GROUP_LABELS[m.group] || m.group;
            return new TableRow({
                children: [
                    dataCell(`${m.emoji} ${m.name}`, 'F9F9F9', '000000', true),
                    dataCell(gl, 'F9F9F9', gc, true),
                    dataCell(m.cost === 0 ? 'Free' : `${m.cost} đạn`, 'F9F9F9'),
                    dataCell(m.damage > 0 ? String(m.damage) : '—', 'F9F9F9', m.damage > 0 ? 'C00000' : '888888', m.damage > 0),
                    dataCell(m.desc || '—', 'F9F9F9', '333333', false, 16),
                ],
            });
        }),
    ];

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
        borders: {
            top:           { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            bottom:        { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            left:          { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            right:         { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            insideH:       { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            insideV:       { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        },
    });
}

function buildMatrix() {
    const ids = Object.keys(MOVES);
    const names = ids.map(id => `${MOVES[id].emoji}${MOVES[id].name.slice(0, 5)}`);

    const RESULT_FILL = { win: 'C6EFCE', lose: 'FFC7CE', draw: 'FFEB9C' };
    const RESULT_COLOR = { win: '276221', lose: '9C0006', draw: '7D5A00' };
    const RESULT_LABEL = { win: 'W', lose: 'L', draw: 'D' };

    const headerRow = new TableRow({
        children: [
            headerCell('P1 \\ P2'),
            ...names.map(n => headerCell(n)),
        ],
        tableHeader: true,
    });

    const dataRows = ids.map(p1 =>
        new TableRow({
            children: [
                headerCell(`${MOVES[p1].emoji}${MOVES[p1].name.slice(0, 5)}`),
                ...ids.map(p2 => {
                    const r = MATRIX[p1][p2];
                    return dataCell(
                        RESULT_LABEL[r] || r,
                        RESULT_FILL[r] || 'FFFFFF',
                        RESULT_COLOR[r] || '000000',
                        true, 16, AlignmentType.CENTER
                    );
                }),
            ],
        })
    );

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
        borders: {
            top:     { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            bottom:  { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            left:    { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            right:   { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            insideH: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            insideV: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        },
    });
}

function buildMoveDetail(m) {
    const gc = GROUP_COLORS[m.group] || '000000';
    const gl = GROUP_LABELS[m.group] || m.group;

    const allIds = Object.keys(MOVES);
    const wins  = allIds.filter(id => MATRIX[m.id]?.[id] === 'win').map(id => `${MOVES[id].emoji} ${MOVES[id].name}`);
    const loses = allIds.filter(id => MATRIX[m.id]?.[id] === 'lose').map(id => `${MOVES[id].emoji} ${MOVES[id].name}`);
    const draws = allIds.filter(id => MATRIX[m.id]?.[id] === 'draw').map(id => `${MOVES[id].emoji} ${MOVES[id].name}`);

    // Extract special effect from onWin/onDraw descriptions in constants
    const specialNotes = {
        kip:        'Khi thắng: phản 80% damage đối thủ + đối thủ mất số đạn đã bỏ ra.',
        khien:      'Hòa vs Đỏ (trừ Móc): nhận 40% damage + được +1 đạn lượt sau.',
        moc:        'Khi thắng: ăn cắp 1 đạn từ đối thủ.',
        shotgun:    'Khi thắng: đối thủ mất thêm 1 đạn.',
        zombie:     'Khi thắng: Stun đối thủ — chỉ dùng nước 0 đạn lượt sau.',
        sieu_khien: 'Hòa vs nước cost ≥ 2: hoàn lại 1 đạn.',
        magic_hand: 'Khi thắng: Lock đối thủ — không dùng nước đắt nhất lượt sau.',
        min:        'Khi thua: chỉ tự nhận 25 HP thay vì damage bình thường của đối thủ.',
        nap:        'Nạp liên tiếp lần 2+: nhận +2 đạn. Sau 2 lần liên tiếp bị cooldown 1 lượt.',
    };

    const paragraphs = [
        new Paragraph({
            children: [
                new TextRun({ text: `${m.emoji}  ${m.name}`, bold: true, size: 28, color: gc }),
                new TextRun({ text: `  —  ${gl}`, bold: false, size: 20, color: gc }),
            ],
            spacing: { before: 240, after: 60 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Chi phí: ', bold: true, size: 20 }),
                new TextRun({ text: m.cost === 0 ? 'Miễn phí' : `${m.cost} đạn`, size: 20 }),
                new TextRun({ text: '   |   Damage: ', bold: true, size: 20 }),
                new TextRun({ text: m.damage > 0 ? String(m.damage) : '0', size: 20, color: m.damage > 0 ? 'C00000' : '888888' }),
            ],
            spacing: { after: 40 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Mô tả: ', bold: true, size: 20 }),
                new TextRun({ text: m.desc || '—', size: 20 }),
            ],
            spacing: { after: 40 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '✅ Thắng: ', bold: true, size: 20, color: '276221' }),
                new TextRun({ text: wins.length ? wins.join(', ') : '—', size: 20 }),
            ],
            spacing: { after: 20 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '❌ Thua: ', bold: true, size: 20, color: '9C0006' }),
                new TextRun({ text: loses.length ? loses.join(', ') : '—', size: 20 }),
            ],
            spacing: { after: 20 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: '🤝 Hòa: ', bold: true, size: 20, color: '7D5A00' }),
                new TextRun({ text: draws.length ? draws.join(', ') : '—', size: 20 }),
            ],
            spacing: { after: 20 },
        }),
    ];

    if (specialNotes[m.id]) {
        paragraphs.push(new Paragraph({
            children: [
                new TextRun({ text: '⭐ Hiệu Ứng Đặc Biệt: ', bold: true, size: 20, color: '7030A0' }),
                new TextRun({ text: specialNotes[m.id], size: 20 }),
            ],
            spacing: { after: 40 },
        }));
    }

    paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '─'.repeat(55), color: 'CCCCCC', size: 16 })],
        spacing: { after: 40 },
    }));

    return paragraphs;
}

async function main() {
    const moveDetails = Object.values(MOVES).flatMap(m => buildMoveDetail(m));

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top:    convertInchesToTwip(0.8),
                        bottom: convertInchesToTwip(0.8),
                        left:   convertInchesToTwip(1.0),
                        right:  convertInchesToTwip(1.0),
                    },
                },
            },
            children: [
                new Paragraph({
                    text: 'MIND CLASH — Danh Sách Quân',
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Thông tin chi tiết ${Object.keys(MOVES).length} nước đi`, color: '707070', size: 22 })],
                    spacing: { after: 300 },
                }),

                new Paragraph({ text: 'Tổng Quan', heading: HeadingLevel.HEADING_1, spacing: { after: 120 } }),
                buildSummaryTable(),

                new Paragraph({ text: '', spacing: { after: 300 } }),
                new Paragraph({ text: 'Chi Tiết Từng Quân', heading: HeadingLevel.HEADING_1, spacing: { after: 120 } }),
                ...moveDetails,

                new Paragraph({ text: '', spacing: { after: 300 } }),
                new Paragraph({ text: 'Ma Trận Kết Quả (P1 vs P2)', heading: HeadingLevel.HEADING_1, spacing: { after: 60 } }),
                new Paragraph({
                    children: [new TextRun({ text: 'W = Thắng  |  L = Thua  |  D = Hòa', italics: true, color: '707070', size: 18 })],
                    spacing: { after: 120 },
                }),
                buildMatrix(),
            ],
        }],
    });

    const outPath = path.join(__dirname, '..', 'mind_clash_moves.docx');
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outPath, buffer);
    console.log(`✅ Saved: ${outPath}`);
}

main().catch(console.error);
