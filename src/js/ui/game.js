import { MOVES, DIFF_LABELS } from '../constants/index.js';
import { gameState, updateGameState } from '../state/index.js';
import { socket } from '../network/socket.js';
import { showScreen } from './screens.js';
import { stopClientTimers } from './timers.js';

export function updateGameUI(myState, opponentState, moves, turn) {
    updateGameState({
        myTimeBank: myState.timeBank || 15.0,
        oppTimeBank: opponentState.timeBank || 15.0
    });

    document.getElementById('your-time').textContent = gameState.myTimeBank.toFixed(1);
    document.getElementById('opponent-time').textContent = gameState.oppTimeBank.toFixed(1);

    document.getElementById('turn-number').textContent = turn;

    renderHP('your-hp', 'your-hp-bar', myState.hp, myState.maxHp);
    renderHP('opponent-hp', 'opponent-hp-bar', opponentState.hp, opponentState.maxHp);

    document.getElementById('your-bullets').textContent = myState.bullets;
    document.getElementById('opponent-bullets').textContent = opponentState.bullets;

    // Status indicators
    const napInd = document.getElementById('nap-indicator');
    const badge = napInd.querySelector('.streak-badge');
    if (myState.debuff === 'stun') {
        napInd.style.display = 'block';
        badge.textContent = '💫 Choáng — Chỉ dùng nước 0 đạn';
        badge.style.color = 'var(--red)';
    } else if (myState.debuff === 'lock') {
        napInd.style.display = 'block';
        badge.textContent = '🔒 Bị khóa — Nước đắt nhất không dùng được';
        badge.style.color = 'var(--red)';
    } else if (myState.freeMove) {
        napInd.style.display = 'block';
        badge.textContent = '⚡ Combo! Lượt này 1 nước miễn phí';
        badge.style.color = 'var(--yellow)';
    } else if (myState.napStreak >= 1 && !myState.cooldown) {
        napInd.style.display = 'block';
        badge.textContent = '🔥 Combo Nạp sẵn sàng! (+2 đạn)';
        badge.style.color = '';
    } else if (myState.cooldown) {
        napInd.style.display = 'block';
        badge.textContent = '🔒 Cooldown — Không thể Nạp lượt này';
        badge.style.color = 'var(--red)';
    } else {
        napInd.style.display = 'none';
        badge.style.color = '';
    }

    if (moves) renderMoveCards(moves);
}

const BASE_HP = 360;

function renderHP(textId, barId, hp, maxHp) {
    const el = document.getElementById(textId);
    const bar = document.getElementById(barId);
    const wrap = bar ? bar.parentElement : null;
    const clamped = Math.max(0, hp);
    const base = maxHp || BASE_HP;
    if (el) el.textContent = clamped;
    if (bar && wrap) {
        // Scale wrap width relative to BASE_HP so bars are comparable
        const wrapScale = Math.min(2, base / BASE_HP); // cap at 2x width
        wrap.style.maxWidth = Math.round(160 * wrapScale) + 'px';
        const pct = Math.min(100, (clamped / base) * 100);
        bar.style.width = pct + '%';
        bar.className = 'hp-bar' + (pct <= 25 ? ' hp-critical' : pct <= 50 ? ' hp-low' : '');
    }
}

function renderMoveCards(moves) {
    const groups = { yellow: [], blue: [], red: [], special: [] };
    moves.forEach(m => {
        if (groups[m.group]) groups[m.group].push(m);
    });

    for (const [group, groupMoves] of Object.entries(groups)) {
        const container = document.getElementById(`cards-${group}`);
        if (!container) continue;
        container.innerHTML = '';
        groupMoves.forEach(m => {
            const card = document.createElement('div');
            card.className = `move-card${m.available ? '' : ' disabled'}`;
            card.dataset.group = m.group;
            card.dataset.moveId = m.id;
            card.innerHTML = `
        <div class="move-emoji">${m.emoji}</div>
        <div class="move-name">${m.name}</div>
        <div class="move-cost ${m.cost === 0 ? 'free' : ''}">${m.cost === 0 ? 'Free' : m.cost + '💰'}</div>
        ${m.reason === 'Cooldown' ? '<span class="cooldown-badge">🔒</span>' : ''}
      `;
            card.title = MOVES[m.id]?.desc || '';

            if (m.available) {
                card.addEventListener('click', () => selectMove(m.id));
            }
            container.appendChild(card);
        });
    }
}

export function selectMove(moveId) {
    if (!gameState.gameActive || gameState.selectedMove) return;
    updateGameState({
        selectedMove: moveId,
        myMoveSelected: true
    });
    socket.emit('select-move', moveId);
    showMoveSelection(false);
}

export function showMoveSelection(show) {
    const sel = document.getElementById('move-selection');
    if (!sel) return;
    if (show) {
        sel.classList.remove('hidden');
        // Remove any waiting overlay
        const overlay = document.querySelector('.waiting-overlay');
        if (overlay) overlay.remove();
    } else {
        sel.classList.add('hidden');
        // Show waiting overlay
        const overlay = document.createElement('div');
        overlay.className = 'waiting-overlay';
        if (gameState.isAIGame) {
            overlay.innerHTML = `
          <h2>✅ Chiêu đã chọn: ${MOVES[gameState.selectedMove]?.emoji} ${MOVES[gameState.selectedMove]?.name}</h2>
          <p>🤖 Máy đang suy nghĩ<span class="dots"></span></p>
        `;
        } else {
            overlay.innerHTML = `
          <h2>✅ Chiêu đã chọn: ${MOVES[gameState.selectedMove]?.emoji} ${MOVES[gameState.selectedMove]?.name}</h2>
          <p>Đang chờ đối thủ<span class="dots"></span></p>
        `;
        }
        document.getElementById('screen-game').appendChild(overlay);
    }
}

export function clearReveal() {
    const p1 = document.querySelector('#reveal-p1 .card-inner');
    const p2 = document.querySelector('#reveal-p2 .card-inner');
    if (p1) p1.classList.remove('flipped');
    if (p2) p2.classList.remove('flipped');

    const resultEl = document.getElementById('result-text');
    if (resultEl) {
        resultEl.textContent = '';
        resultEl.className = 'result-text';
    }
}

export function addHistoryItem(data) {
    const list = document.getElementById('history-list');
    if (!list) return;

    const yourMove = MOVES[data.yourMove];
    const oppMove = MOVES[data.opponentMove];
    const resultLabel = data.result === 'win' ? '🏆 Thắng' : data.result === 'lose' ? '💀 Thua' : '🤝 Hòa';
    const hpInfo = `❤️ ${data.yourState.hp} HP`;

    const item = document.createElement('div');
    item.className = 'history-item slide-in';
    item.innerHTML = `
    <div class="history-turn">Lượt ${data.turn}</div>
    <div class="history-moves">
      ${yourMove ? yourMove.emoji + ' ' + yourMove.name : '⏱️'} vs ${oppMove ? oppMove.emoji + ' ' + oppMove.name : '⏱️'}
    </div>
    <div class="history-result ${data.result}">${resultLabel} — ${hpInfo}</div>
  `;
    list.prepend(item);
}

export function showGameOver(isWinner) {
    updateGameState({ gameActive: false });

    const title = document.getElementById('gameover-title');
    const sub = document.getElementById('gameover-subtitle');

    if (isWinner) {
        title.textContent = '🏆 CHIẾN THẮNG!';
        title.className = 'gameover-title win';
        sub.textContent = gameState.isAIGame ? 'Bạn đã đánh bại Máy!' : 'Bạn đã đọc vị đối thủ xuất sắc!';
    } else if (isWinner === false) {
        title.textContent = '💀 THẤT BẠI';
        title.className = 'gameover-title lose';
        sub.textContent = gameState.isAIGame ? 'Máy đã thắng bạn...' : 'Đối thủ đã đọc vị bạn...';
    } else {
        title.textContent = '🤝 HÒA';
        title.className = 'gameover-title draw';
        sub.textContent = 'Trận chiến bất phân thắng bại!';
    }

    stopClientTimers();

    document.getElementById('rematch-status').textContent = '';
    showScreen('screen-gameover');
}
