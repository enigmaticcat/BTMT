import { socket } from '../network/socket.js';
import { gameState, updateGameState } from '../state/index.js';
import { showScreen } from './screens.js';

export function setupLobbyEvents() {
    const btnCreate = document.getElementById('btn-create');
    if (btnCreate) {
        btnCreate.addEventListener('click', () => {
            socket.emit('create-room', (response) => {
                if (response.success) {
                    updateGameState({ myRole: response.role });
                    document.getElementById('room-code').textContent = response.code;
                    showScreen('screen-waiting');
                }
            });
        });
    }

    const btnJoin = document.getElementById('btn-join');
    const inputCode = document.getElementById('input-code');
    if (btnJoin && inputCode) {
        btnJoin.addEventListener('click', () => {
            const code = inputCode.value.trim();
            if (code.length !== 4) {
                document.getElementById('lobby-error').textContent = 'Mã phòng phải có 4 ký tự!';
                return;
            }
            socket.emit('join-room', code, (response) => {
                if (response.success) {
                    updateGameState({ myRole: response.role });
                } else {
                    document.getElementById('lobby-error').textContent = response.error;
                }
            });
        });

        inputCode.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            document.getElementById('lobby-error').textContent = '';
        });
    }

    const btnCopy = document.getElementById('btn-copy');
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            const code = document.getElementById('room-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                btnCopy.textContent = '✅ Đã sao chép!';
                setTimeout(() => { btnCopy.textContent = '📋 Sao chép'; }, 2000);
            });
        });
    }

    // AI Mode Lobby
    document.getElementById('btn-ai')?.addEventListener('click', () => {
        const diffPanel = document.getElementById('ai-difficulty');
        diffPanel.classList.toggle('hidden');
    });

    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateGameState({ aiDifficulty: btn.dataset.diff });
        });
    });

    document.getElementById('btn-start-ai')?.addEventListener('click', () => {
        socket.emit('start-ai-game', gameState.aiDifficulty, (response) => {
            if (response.success) {
                updateGameState({
                    myRole: response.role,
                    isAIGame: true
                });
            }
        });
    });

    // Rematch and return to lobby
    document.getElementById('btn-rematch')?.addEventListener('click', () => {
        socket.emit('rematch');
        if (!gameState.isAIGame) {
            document.getElementById('rematch-status').textContent = '⏳ Đang chờ đối thủ đồng ý...';
        }
    });

    document.getElementById('btn-lobby')?.addEventListener('click', () => {
        location.reload();
    });

}

export function renderAugmentCards(augments) {
    const container = document.getElementById('augment-cards');
    if (!container) return;
    container.innerHTML = '';
    augments.forEach(aug => {
        const card = document.createElement('div');
        card.className = 'augment-card';
        card.dataset.augmentId = aug.id;
        card.innerHTML = `
            <div class="augment-emoji">${aug.emoji}</div>
            <div class="augment-name">${aug.name}</div>
            <div class="augment-desc">${aug.desc}</div>
        `;
        card.addEventListener('click', () => selectAugment(aug.id));
        container.appendChild(card);
    });
}

export function selectAugment(augmentId) {
    updateGameState({ selectedAugment: augmentId });
    document.querySelectorAll('.augment-card').forEach(card => {
        card.classList.remove('selected');
    });
    const targetCard = document.querySelector(`[data-augment-id="${augmentId}"]`);
    if (targetCard) targetCard.classList.add('selected');
    socket.emit('select-augment', augmentId);
}
