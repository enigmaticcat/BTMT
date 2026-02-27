/* ============================================================
   MIND CLASH — Client App
   ============================================================ */

const socket = io();

// Move definitions (client-side, for rendering)
const MOVES = {
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

const DIFF_LABELS = { easy: '😊 Dễ', normal: '😈 Thường', hard: '💀 Khó' };

// State
let myRole = null;
let gameActive = false;
let selectedMove = null;
let historyOpen = false;
let turnHistory = [];
let isAIGame = false;
let aiDifficulty = 'normal';

let turnTimer = null;
let myTimeBank = 30.0;
let oppTimeBank = 30.0;
let myTurnStart = 0;
let myMoveSelected = false;
let oppMoveSelected = false;

// Voice Chat State
let localStream = null;
let peerConnection = null;
let isMicOn = false;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

function startClientTimers() {
    if (turnTimer) clearInterval(turnTimer);

    myMoveSelected = false;
    oppMoveSelected = false;

    myTurnStart = Date.now();
    let initialMyTime = myTimeBank;
    let initialOppTime = oppTimeBank;

    document.getElementById('your-time').textContent = initialMyTime.toFixed(1);
    document.getElementById('opponent-time').textContent = initialOppTime.toFixed(1);

    turnTimer = setInterval(() => {
        const elapsed = (Date.now() - myTurnStart) / 1000;

        if (!myMoveSelected && !gameActive) return;

        if (!myMoveSelected) {
            let t = initialMyTime - elapsed;
            if (t < 0) t = 0;
            const el = document.getElementById('your-time');
            el.textContent = t.toFixed(1);
            if (t <= 5.0) el.parentElement.classList.add('timer-urgent');
            else el.parentElement.classList.remove('timer-urgent');
        }

        if (!oppMoveSelected) {
            let t = initialOppTime - elapsed;
            if (t < 0) t = 0;
            const el = document.getElementById('opponent-time');
            el.textContent = t.toFixed(1);
            if (t <= 5.0) el.parentElement.classList.add('timer-urgent');
            else el.parentElement.classList.remove('timer-urgent');
        }
    }, 100);
}

function stopClientTimers() {
    if (turnTimer) clearInterval(turnTimer);
    myMoveSelected = true;
    oppMoveSelected = true;
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ============================================================
// LOBBY
// ============================================================

document.getElementById('btn-create').addEventListener('click', () => {
    socket.emit('create-room', (response) => {
        if (response.success) {
            myRole = response.role;
            document.getElementById('room-code').textContent = response.code;
            showScreen('screen-waiting');
        }
    });
});

document.getElementById('btn-join').addEventListener('click', () => {
    const code = document.getElementById('input-code').value.trim();
    if (code.length !== 4) {
        document.getElementById('lobby-error').textContent = 'Mã phòng phải có 4 ký tự!';
        return;
    }
    socket.emit('join-room', code, (response) => {
        if (response.success) {
            myRole = response.role;
        } else {
            document.getElementById('lobby-error').textContent = response.error;
        }
    });
});

document.getElementById('input-code').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
    document.getElementById('lobby-error').textContent = '';
});

document.getElementById('btn-copy').addEventListener('click', () => {
    const code = document.getElementById('room-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        document.getElementById('btn-copy').textContent = '✅ Đã sao chép!';
        setTimeout(() => { document.getElementById('btn-copy').textContent = '📋 Sao chép'; }, 2000);
    });
});

// ============================================================
// AI MODE — LOBBY
// ============================================================

document.getElementById('btn-ai').addEventListener('click', () => {
    const diffPanel = document.getElementById('ai-difficulty');
    diffPanel.classList.toggle('hidden');
});

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        aiDifficulty = btn.dataset.diff;
    });
});

document.getElementById('btn-start-ai').addEventListener('click', () => {
    socket.emit('start-ai-game', aiDifficulty, (response) => {
        if (response.success) {
            myRole = response.role;
            isAIGame = true;
        }
    });
});

// ============================================================
// GAME
// ============================================================

socket.on('game-start', (data) => {
    myRole = data.role;
    gameActive = true;
    selectedMove = null;
    turnHistory = [];

    if (data.isAI) {
        isAIGame = true;
        aiDifficulty = data.aiDifficulty || 'normal';
    }

    showScreen('screen-game');
    updateGameUI(data.state, data.opponentState, data.moves, data.turn);
    showMoveSelection(true);
    clearReveal();
    document.getElementById('history-list').innerHTML = '';

    // Update opponent label for AI
    const oppLabel = document.querySelector('.opponent-panel .player-label');
    if (isAIGame) {
        oppLabel.textContent = `🤖 Máy (${DIFF_LABELS[aiDifficulty] || 'Thường'})`;
        document.getElementById('opponent-status').textContent = '🤖 Sẵn sàng';
    } else {
        oppLabel.textContent = '🎯 Đối thủ';
        document.getElementById('opponent-status').textContent = 'Đang chọn chiêu...';
    }

    // Voice Setup
    if (!isAIGame) {
        document.getElementById('btn-toggle-mic').style.display = 'inline-block';
        if (myRole === 'p1') {
            initWebRTC(true);
        } else {
            initWebRTC(false);
        }
    } else {
        document.getElementById('btn-toggle-mic').style.display = 'none';
    }

    startClientTimers();
});

function updateGameUI(myState, opponentState, moves, turn) {
    // Sync time banks
    myTimeBank = myState.timeBank || 30.0;
    oppTimeBank = opponentState.timeBank || 30.0;

    document.getElementById('your-time').textContent = myTimeBank.toFixed(1);
    document.getElementById('opponent-time').textContent = oppTimeBank.toFixed(1);

    // Turn
    document.getElementById('turn-number').textContent = turn;

    // Lives
    renderLives('your-lives', myState.lives);
    renderLives('opponent-lives', opponentState.lives);

    // Bullets
    document.getElementById('your-bullets').textContent = myState.bullets;
    document.getElementById('opponent-bullets').textContent = opponentState.bullets;

    // Nạp indicator
    const napInd = document.getElementById('nap-indicator');
    if (myState.napStreak >= 1 && !myState.cooldown) {
        napInd.style.display = 'block';
        napInd.querySelector('.streak-badge').textContent = '🔥 Combo Nạp sẵn sàng! (+2 đạn)';
    } else if (myState.cooldown) {
        napInd.style.display = 'block';
        napInd.querySelector('.streak-badge').textContent = '🔒 Cooldown — Không thể Nạp lượt này';
        napInd.querySelector('.streak-badge').style.color = 'var(--red)';
    } else {
        napInd.style.display = 'none';
        napInd.querySelector('.streak-badge').style.color = '';
    }

    // Render move cards
    if (moves) renderMoveCards(moves);
}

function renderLives(elementId, count) {
    const el = document.getElementById(elementId);
    el.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const heart = document.createElement('span');
        heart.className = 'life' + (i >= count ? ' lost' : '');
        heart.textContent = '❤️';
        el.appendChild(heart);
    }
}

function renderMoveCards(moves) {
    const groups = { yellow: [], blue: [], red: [], special: [] };
    moves.forEach(m => {
        if (groups[m.group]) groups[m.group].push(m);
    });

    for (const [group, groupMoves] of Object.entries(groups)) {
        const container = document.getElementById(`cards-${group}`);
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

function selectMove(moveId) {
    if (!gameActive || selectedMove) return;
    selectedMove = moveId;
    myMoveSelected = true;
    socket.emit('select-move', moveId);
    showMoveSelection(false);
}

function showMoveSelection(show) {
    const sel = document.getElementById('move-selection');
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
        if (isAIGame) {
            overlay.innerHTML = `
          <h2>✅ Chiêu đã chọn: ${MOVES[selectedMove]?.emoji} ${MOVES[selectedMove]?.name}</h2>
          <p>🤖 Máy đang suy nghĩ<span class="dots"></span></p>
        `;
        } else {
            overlay.innerHTML = `
          <h2>✅ Chiêu đã chọn: ${MOVES[selectedMove]?.emoji} ${MOVES[selectedMove]?.name}</h2>
          <p>Đang chờ đối thủ<span class="dots"></span></p>
        `;
        }
        document.getElementById('screen-game').appendChild(overlay);
    }
}

socket.on('move-confirmed', () => {
    // Move was accepted by server
});

socket.on('opponent-ready', () => {
    oppMoveSelected = true;
    if (!isAIGame) {
        document.getElementById('opponent-status').textContent = '✅ Đối thủ đã chọn chiêu!';
    }
});

// ============================================================
// TURN RESULT & REVEAL
// ============================================================

socket.on('turn-result', (data) => {
    stopClientTimers();

    // Remove waiting overlay
    const overlay = document.querySelector('.waiting-overlay');
    if (overlay) overlay.remove();

    document.getElementById('opponent-status').textContent = '';

    // Set up reveal cards
    const yourMove = MOVES[data.yourMove];
    const oppMove = MOVES[data.opponentMove];

    const p1Back = document.getElementById('reveal-p1-back');
    const p2Back = document.getElementById('reveal-p2-back');

    // "You" is always on the left
    p1Back.innerHTML = `<span>${yourMove.emoji}</span><span class="card-back-name">${yourMove.name}</span>`;
    p1Back.dataset.group = yourMove.group;
    p2Back.innerHTML = `<span>${oppMove.emoji}</span><span class="card-back-name">${oppMove.name}</span>`;
    p2Back.dataset.group = oppMove.group;

    // Animate flip
    setTimeout(() => {
        document.querySelector('#reveal-p1 .card-inner').classList.add('flipped');
    }, 400);
    setTimeout(() => {
        document.querySelector('#reveal-p2 .card-inner').classList.add('flipped');
    }, 800);

    // Show result text
    setTimeout(() => {
        const resultEl = document.getElementById('result-text');
        resultEl.textContent = data.description;
        resultEl.className = 'result-text ' + data.result;

        // Flash damage if hit
        if (data.result === 'lose') {
            document.querySelector('.your-panel').classList.add('damage-flash');
            setTimeout(() => document.querySelector('.your-panel').classList.remove('damage-flash'), 800);
        } else if (data.result === 'win') {
            document.querySelector('.opponent-panel').classList.add('damage-flash');
            setTimeout(() => document.querySelector('.opponent-panel').classList.remove('damage-flash'), 800);
        }

        // Update stats
        updateGameUI(data.yourState, data.opponentState, null, data.turn);
    }, 1200);

    // Add to history
    turnHistory.push(data);
    addHistoryItem(data);

    // Game over check
    if (data.gameOver) {
        setTimeout(() => {
            showGameOver(data.winner === 'you');
        }, 2500);
    }
});

socket.on('next-turn', (data) => {
    selectedMove = null;
    gameActive = true;
    clearReveal();
    updateGameUI(data.state, data.opponentState, data.moves, data.turn);
    showMoveSelection(true);
    if (isAIGame) {
        document.getElementById('opponent-status').textContent = '🤖 Sẵn sàng';
    } else {
        document.getElementById('opponent-status').textContent = 'Đang chọn chiêu...';
    }

    startClientTimers();
});

function clearReveal() {
    document.querySelector('#reveal-p1 .card-inner').classList.remove('flipped');
    document.querySelector('#reveal-p2 .card-inner').classList.remove('flipped');
    document.getElementById('result-text').textContent = '';
    document.getElementById('result-text').className = 'result-text';
}

function addHistoryItem(data) {
    const list = document.getElementById('history-list');
    const yourMove = MOVES[data.yourMove];
    const oppMove = MOVES[data.opponentMove];

    const item = document.createElement('div');
    item.className = 'history-item slide-in';
    item.innerHTML = `
    <div class="history-turn">Lượt ${data.turn}</div>
    <div class="history-moves">
      Bạn: ${yourMove.emoji} ${yourMove.name} vs ${oppMove.emoji} ${oppMove.name}
    </div>
    <div class="history-result ${data.result}">${data.result === 'win' ? '🏆 Thắng' :
            data.result === 'lose' ? '💀 Thua' : '🤝 Hòa'
        }</div>
  `;
    list.prepend(item);
}

// ============================================================
// HISTORY PANEL
// ============================================================

document.getElementById('history-toggle').addEventListener('click', () => {
    historyOpen = !historyOpen;
    document.getElementById('history-panel').classList.toggle('open', historyOpen);
});

// ============================================================
// GAME OVER
// ============================================================

function showGameOver(isWinner) {
    gameActive = false;
    const title = document.getElementById('gameover-title');
    const sub = document.getElementById('gameover-subtitle');

    if (isWinner) {
        title.textContent = '🏆 CHIẾN THẮNG!';
        title.className = 'gameover-title win';
        sub.textContent = isAIGame ? 'Bạn đã đánh bại Máy!' : 'Bạn đã đọc vị đối thủ xuất sắc!';
    } else if (isWinner === false) {
        title.textContent = '💀 THẤT BẠI';
        title.className = 'gameover-title lose';
        sub.textContent = isAIGame ? 'Máy đã thắng bạn...' : 'Đối thủ đã đọc vị bạn...';
    } else {
        title.textContent = '🤝 HÒA';
        title.className = 'gameover-title draw';
        sub.textContent = 'Trận chiến bất phân thắng bại!';
    }

    stopClientTimers();

    document.getElementById('rematch-status').textContent = isAIGame ? '' : '';
    showScreen('screen-gameover');
}

document.getElementById('btn-rematch').addEventListener('click', () => {
    socket.emit('rematch');
    if (!isAIGame) {
        document.getElementById('rematch-status').textContent = '⏳ Đang chờ đối thủ đồng ý...';
    }
});

document.getElementById('btn-lobby').addEventListener('click', () => {
    location.reload();
});

socket.on('rematch-requested', () => {
    document.getElementById('rematch-status').textContent = '🔄 Đối thủ muốn đấu lại! Nhấn "Đấu lại" để bắt đầu.';
});

// ============================================================
// DISCONNECT HANDLING
// ============================================================

socket.on('opponent-disconnected', () => {
    if (isAIGame) return; // AI never disconnects
    gameActive = false;
    const overlay = document.querySelector('.waiting-overlay');
    if (overlay) overlay.remove();

    // Show disconnect message
    const disc = document.createElement('div');
    disc.className = 'waiting-overlay';
    disc.innerHTML = `
    <h2 style="color: var(--red)">⚠️ Đối thủ đã rời phòng</h2>
    <button class="btn btn-primary" onclick="location.reload()">🏠 Về sảnh</button>
  `;
    document.body.appendChild(disc);
});

socket.on('disconnect', () => {
    gameActive = false;
    cleanupVoiceChat();
});

// ============================================================
// VOICE CHAT (WebRTC)
// ============================================================

async function initWebRTC(isInitiator) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Start muted by default
        localStream.getAudioTracks().forEach(track => track.enabled = false);
        isMicOn = false;
        updateMicBtnUI();

        peerConnection = new RTCPeerConnection(configuration);

        // Add local stream to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle incoming streams
        peerConnection.ontrack = event => {
            const remoteAudio = document.getElementById('remote-audio');
            if (remoteAudio.srcObject !== event.streams[0]) {
                remoteAudio.srcObject = event.streams[0];
            }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('webrtc-ice-candidate', event.candidate);
            }
        };

        if (isInitiator) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('webrtc-offer', offer);
        }

    } catch (err) {
        console.error("Lỗi Microphone:", err);
        document.getElementById('btn-toggle-mic').textContent = '⚠️ Lỗi Mic';
        document.getElementById('btn-toggle-mic').disabled = true;
    }
}

socket.on('webrtc-offer', async (offer) => {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('webrtc-answer', answer);
});

socket.on('webrtc-answer', async (answer) => {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('webrtc-ice-candidate', async (candidate) => {
    if (!peerConnection) return;
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
        console.error('Lỗi addIceCandidate', e);
    }
});

document.getElementById('btn-toggle-mic').addEventListener('click', () => {
    if (!localStream) return;
    isMicOn = !isMicOn;
    localStream.getAudioTracks().forEach(track => track.enabled = isMicOn);
    updateMicBtnUI();
});

function updateMicBtnUI() {
    const btn = document.getElementById('btn-toggle-mic');
    if (isMicOn) {
        btn.textContent = '🔊 Đang Bật Mic';
        btn.classList.add('mic-active');
    } else {
        btn.textContent = '🎤 Bật Mic';
        btn.classList.remove('mic-active');
    }
}

function cleanupVoiceChat() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio) remoteAudio.srcObject = null;
}
