import { socket } from './network/socket.js';
import { gameState, updateGameState } from './state/index.js';
import { setupLobbyEvents, renderAugmentCards, selectAugment } from './ui/lobby.js';
import { setupWebRTCSocketListeners, initWebRTC, toggleMic, cleanupVoiceChat } from './network/webrtc.js';
import { showScreen } from './ui/screens.js';
import { updateGameUI, clearReveal, showMoveSelection, showGameOver, addHistoryItem } from './ui/game.js';
import { startClientTimers, stopClientTimers } from './ui/timers.js';
import { MOVES, AUGMENTS, DIFF_LABELS } from './constants/index.js';

// Setup Lobby DOM events
setupLobbyEvents();

// History toggle/close
document.addEventListener('click', (e) => {
    if (e.target.closest('#history-toggle') || e.target.closest('#history-close')) {
        const nowOpen = e.target.closest('#history-close') ? false : !gameState.historyOpen;
        updateGameState({ historyOpen: nowOpen });
        document.getElementById('history-panel').classList.toggle('open', nowOpen);
    }
});

// Setup WebRTC and Voice toggle
setupWebRTCSocketListeners();
document.getElementById('btn-toggle-mic')?.addEventListener('click', toggleMic);

// ============================================================
// SOCKET EVENT LISTENERS
// ============================================================

socket.on('augment-selection-start', (data) => {
    showScreen('screen-augment');
    document.getElementById('augment-timer').textContent = data.timeLimit;
    renderAugmentCards(data.augments);

    let timeLeft = data.timeLimit;
    const timerInterval = setInterval(() => {
        timeLeft -= 1;
        const timerEl = document.getElementById('augment-timer');
        if (timerEl) timerEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (!gameState.selectedAugment) {
                const randomAug = data.augments[Math.floor(Math.random() * data.augments.length)];
                selectAugment(randomAug.id);
            }
        }
    }, 1000);
});

socket.on('game-start', (data) => {
    updateGameState({
        myRole: data.role,
        gameActive: true,
        selectedMove: null,
        turnHistory: []
    });

    if (data.isAI) {
        updateGameState({
            isAIGame: true,
            aiDifficulty: data.aiDifficulty || 'normal'
        });
    }

    showScreen('screen-game');

    if (data.yourAugment) {
        const your = document.querySelector('.your-panel');
        const aug = AUGMENTS[data.yourAugment];
        if (your) {
            const existing = your.querySelector('.augment-label');
            if (existing) existing.remove();
            const label = document.createElement('div');
            label.className = 'augment-label';
            label.innerHTML = `🧬 ${aug ? aug.emoji + ' ' + aug.name : data.yourAugment}`;
            your.appendChild(label);
        }
    }
    if (data.opponentAugment) {
        const opp = document.querySelector('.opponent-panel');
        const aug = AUGMENTS[data.opponentAugment];
        if (opp) {
            const existing = opp.querySelector('.augment-label');
            if (existing) existing.remove();
            const label = document.createElement('div');
            label.className = 'augment-label';
            label.innerHTML = `🧬 ${aug ? aug.emoji + ' ' + aug.name : data.opponentAugment}`;
            opp.appendChild(label);
        }
    }

    updateGameUI(data.state, data.opponentState, data.moves, data.turn);
    showMoveSelection(true);
    clearReveal();
    document.getElementById('history-list').innerHTML = '';

    const oppLabel = document.querySelector('.opponent-panel .player-label');
    const oppStatus = document.getElementById('opponent-status');
    if (gameState.isAIGame) {
        if (oppLabel) oppLabel.textContent = `🤖 Máy (${DIFF_LABELS[gameState.aiDifficulty] || 'Thường'})`;
        if (oppStatus) oppStatus.textContent = '🤖 Sẵn sàng';
    } else {
        if (oppLabel) oppLabel.textContent = '🎯 Đối thủ';
        if (oppStatus) oppStatus.textContent = 'Đang chọn chiêu...';
    }

    const micBtn = document.getElementById('btn-toggle-mic');
    if (!gameState.isAIGame) {
        if (micBtn) micBtn.style.display = 'inline-block';
        initWebRTC(gameState.myRole === 'p1');
    } else {
        if (micBtn) micBtn.style.display = 'none';
    }

    startClientTimers();
});

socket.on('move-confirmed', () => {
});

socket.on('opponent-ready', () => {
    updateGameState({ oppMoveSelected: true });
    if (!gameState.isAIGame) {
        document.getElementById('opponent-status').textContent = '✅ Đối thủ đã chọn chiêu!';
    }
});

socket.on('turn-result', (data) => {
    stopClientTimers();
    const overlay = document.querySelector('.waiting-overlay');
    if (overlay) overlay.remove();

    document.getElementById('opponent-status').textContent = '';

    const yourMove = MOVES[data.yourMove];
    const oppMove = MOVES[data.opponentMove];

    const p1Back = document.getElementById('reveal-p1-back');
    const p2Back = document.getElementById('reveal-p2-back');

    if (p1Back && yourMove) {
        p1Back.innerHTML = `<span>${yourMove.emoji}</span><span class="card-back-name">${yourMove.name}</span>`;
        p1Back.dataset.group = yourMove.group;
    } else if (p1Back) {
        p1Back.innerHTML = `<span>⏱️</span><span class="card-back-name">Hết Giờ</span>`;
        p1Back.dataset.group = 'timeout';
    }
    if (p2Back && oppMove) {
        p2Back.innerHTML = `<span>${oppMove.emoji}</span><span class="card-back-name">${oppMove.name}</span>`;
        p2Back.dataset.group = oppMove.group;
    } else if (p2Back) {
        p2Back.innerHTML = `<span>⏱️</span><span class="card-back-name">Hết Giờ</span>`;
        p2Back.dataset.group = 'timeout';
    }

    setTimeout(() => {
        const p1Inner = document.querySelector('#reveal-p1 .card-inner');
        if (p1Inner) p1Inner.classList.add('flipped');
    }, 400);
    setTimeout(() => {
        const p2Inner = document.querySelector('#reveal-p2 .card-inner');
        if (p2Inner) p2Inner.classList.add('flipped');
    }, 800);

    setTimeout(() => {
        const resultEl = document.getElementById('result-text');
        if (resultEl) {
            resultEl.textContent = data.description;
            resultEl.className = 'result-text ' + data.result;
        }

        if (data.result === 'lose') {
            const yourPanel = document.querySelector('.your-panel');
            yourPanel?.classList.add('damage-flash');
            if (data.yourState.hp <= 25) yourPanel?.classList.add('hp-critical-flash');
            setTimeout(() => {
                yourPanel?.classList.remove('damage-flash', 'hp-critical-flash');
            }, 800);
        } else if (data.result === 'win') {
            document.querySelector('.opponent-panel')?.classList.add('damage-flash');
            setTimeout(() => document.querySelector('.opponent-panel')?.classList.remove('damage-flash'), 800);
        }

        updateGameUI(data.yourState, data.opponentState, null, data.turn);
    }, 1200);

    gameState.turnHistory.push(data);
    addHistoryItem(data);

    if (data.gameOver) {
        setTimeout(() => {
            showGameOver(data.winner === 'you' ? true : data.winner === 'draw' ? null : false);
        }, 2500);
    }
});

socket.on('next-turn', (data) => {
    updateGameState({
        selectedMove: null,
        gameActive: true
    });

    showScreen('screen-game');
    clearReveal();
    updateGameUI(data.state, data.opponentState, data.moves, data.turn);
    showMoveSelection(true);

    const oppStatus = document.getElementById('opponent-status');
    if (oppStatus) {
        if (gameState.isAIGame) {
            oppStatus.textContent = '🤖 Sẵn sàng';
        } else {
            oppStatus.textContent = 'Đang chọn chiêu...';
        }
    }

    startClientTimers();
});

socket.on('rematch-requested', () => {
    document.getElementById('rematch-status').textContent = '🔄 Đối thủ muốn đấu lại! Nhấn "Đấu lại" để bắt đầu.';
});

socket.on('opponent-disconnected', () => {
    if (gameState.isAIGame) return;

    updateGameState({ gameActive: false });
    const overlay = document.querySelector('.waiting-overlay');
    if (overlay) overlay.remove();

    const disc = document.createElement('div');
    disc.className = 'waiting-overlay';
    disc.innerHTML = `
    <h2 style="color: var(--red)">⚠️ Đối thủ đã rời phòng</h2>
    <button class="btn btn-primary" onclick="location.reload()">🏠 Về sảnh</button>
  `;
    document.body.appendChild(disc);
});

socket.on('disconnect', () => {
    updateGameState({ gameActive: false });
    cleanupVoiceChat();
});
