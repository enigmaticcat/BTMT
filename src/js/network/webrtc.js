import { socket } from './socket.js';

let localStream = null;
let peerConnection = null;
export let isMicOn = false;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export async function initWebRTC(isInitiator) {
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
        const btn = document.getElementById('btn-toggle-mic');
        if (btn) {
            btn.textContent = '⚠️ Lỗi Mic';
            btn.disabled = true;
        }
    }
}

export function setupWebRTCSocketListeners() {
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
}

export function toggleMic() {
    if (!localStream) return;
    isMicOn = !isMicOn;
    localStream.getAudioTracks().forEach(track => track.enabled = isMicOn);
    updateMicBtnUI();
}

function updateMicBtnUI() {
    const btn = document.getElementById('btn-toggle-mic');
    if (!btn) return;

    if (isMicOn) {
        btn.textContent = '🔊 Đang Bật Mic';
        btn.classList.add('mic-active');
    } else {
        btn.textContent = '🎤 Bật Mic';
        btn.classList.remove('mic-active');
    }
}

export function cleanupVoiceChat() {
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
