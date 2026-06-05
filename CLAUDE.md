# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start the server (serves the game on http://localhost:3000)
npm start
# or
node server.js
```

There is no build step required for development — `index.html` loads `src/js/app.js` directly as an ES module. The `dist/` and `public/` directories are served as static fallbacks but aren't used in normal development. Vite is listed as a devDependency but has no configured build script.

There are no tests or linter scripts defined.

## Gameplay

Mind Clash là game đấu tâm lý 1v1 theo lượt, nơi cả hai người chơi **chọn nước đi đồng thời** (không ai biết đối thủ chọn gì) rồi kết quả được tiết lộ cùng lúc.

### Mục tiêu
Hạ đối thủ về 0 mạng. Mỗi người bắt đầu với **3 mạng** và **0 đạn**.

### Tài nguyên: Đạn
Đạn là tiền tệ duy nhất trong game. Các nước đi tốn đạn mới mạnh; không có đạn thì bị giới hạn chỉ dùng các nước miễn phí.

### 11 Nước Đi

**Nhóm Vàng — Tích Lũy** (miễn phí):
- 🔋 **Nạp Đạn** (`nap`) — Nhận +1 đạn. Nạp liên tiếp lần 2 trở đi nhận +2 đạn mỗi lần. Nhưng sau 2 lần nạp liên tiếp, bị **cooldown** (không nạp được lượt tiếp theo).
- 💣 **Mìn** (`min`) — Bẫy: thắng nếu đối thủ dùng Zombie hoặc Bàn Tay Ma Thuật, thua trong mọi trường hợp còn lại (kể cả Nạp Đạn). Rất rủi ro nếu đoán sai.

**Nhóm Xanh — Kỹ Thuật** (miễn phí):
- 🧨 **Kíp** (`kip`) — Phản Súng và Shotgun (thắng); thua Zombie.
- 🛡️ **Khiên** (`khien`) — Chặn tất cả nước Đỏ *trừ* Móc; thua Bàn Tay Ma Thuật.
- ✂️ **Kéo** (`keo`, tốn 1 đạn) — Tiêu diệt Shotgun và Zombie; hòa hầu hết nước còn lại.

**Nhóm Đỏ — Tấn Công** (tốn đạn):
- 🔫 **Súng** (`sung`, 1 đạn) — Tấn công cơ bản; thắng Nạp Đạn và Móc, thua Kíp và Shotgun.
- 🪝 **Móc** (`moc`, 1 đạn) — Phá Khiên; thắng Nạp Đạn và Khiên, thua Súng và Shotgun.
- 🔥 **Shotgun** (`shotgun`, 2 đạn) — Tấn công mạnh; thắng Súng, Nạp Đạn, Móc, thua Kíp và Kéo.
- 🧟 **Zombie** (`zombie`, 3 đạn) — Càn quét diện rộng; thắng Súng, Kíp, Shotgun, Nạp Đạn, thua Kéo và Mìn, hòa Khiên.

**Đặc Biệt**:
- ⚡ **Siêu Khiên** (`sieu_khien`, 2 đạn) — Chặn *mọi* tấn công kể cả Móc; chỉ thua Bàn Tay Ma Thuật, hòa Siêu Khiên. Phòng thủ tuyệt đối.
- ✋ **Bàn Tay Ma Thuật** (`magic_hand`, 5 đạn) — Thắng tất cả mọi nước *trừ* Mìn (thua) và Siêu Khiên (hòa). Cực kỳ đắt.

### Lõi Bổ Trợ (Augments)
Trước khi ván đấu bắt đầu, mỗi người chọn 1 trong 3 lõi được random, có hiệu lực suốt ván:
- ⚡ **Tăng Tốc** — Đối phương bắt đầu với chỉ 7.5s time bank.
- 🐢 **Giảm Tốc** — Bạn bắt đầu với 22.5s time bank (tốt hơn mặc định 15s).
- ❤️ **Thêm Mạng** — Bắt đầu với 4 mạng thay vì 3.
- 💔 **Yếu Đối Thủ** — Đối phương chỉ có 2 mạng.
- 💣 **Đạn Ngay** — Bắt đầu với 1 đạn nhưng mất 1 mạng (còn 2); sau 3 lượt nhận thêm 3 đạn.
- 🏆 **Bền Lâu** — Sau lượt thứ 10: nhận +2 mạng.

### Time Bank
Mỗi người có **15 giây** tích lũy dùng cho cả ván (không phải per-lượt). Thời gian trôi qua trong mỗi lượt bị trừ khỏi bank khi bạn submit nước đi. Người submit trước được cộng +1s; người submit sau được +0.5s. Nếu bank cạn kiệt trong một lượt, bạn mất 1 mạng và lượt đó bị bỏ qua.

### Kết Thúc Ván
Người còn mạng khi đối thủ về 0 thắng. Có thể hòa nếu cả hai cùng về 0 trong một lượt. Sau đó có thể chọn Đấu lại hoặc Về sảnh.

## Architecture

Mind Clash is a Vietnamese-language 1v1 simultaneous-action prediction card game. Two players secretly pick moves each turn; moves resolve simultaneously using a predefined outcome matrix.

### Server (Node.js + Socket.IO)

All game state lives server-side in an in-memory `rooms` Map. There is **no database**.

- **[server.js](server.js)** — Express HTTP server + Socket.IO setup. Serves static files, delegates all socket logic to `server/socket/events.js`.
- **[server/socket/events.js](server/socket/events.js)** — The primary socket handler (used by server.js). Also an older near-duplicate at `server/socket/index.js` that is not currently loaded. `events.js` handles: room creation/joining, augment selection, move selection, turn resolution, AI game mode, timeouts, rematch, disconnect, and WebRTC signaling relay.
- **[server/core/constants.js](server/core/constants.js)** — Defines `MOVES` (11 moves with bullet costs and color groups), `AUGMENTS` (6 augment options), and `MATRIX` (11×11 outcome lookup: `'win'`/`'lose'`/`'draw'`).
- **[server/core/gameLogic.js](server/core/gameLogic.js)** — `resolveTurn()` applies a turn using `MATRIX`, deducts bullet costs, updates lives, handles nap-streak mechanics (consecutive reloads grant +2 bullets and add a cooldown). Also exports `createGameState`, `getAvailableMoves`, `getRandomAugments`, `applyAugment`, `applyOpponentAugmentEffect`.
- **[server/core/aiLogic.js](server/core/aiLogic.js)** — `chooseAIMove(difficulty, aiState, playerState, history)` implements easy (random), normal (50% smart), and hard (fully smart) AI using heuristics based on bullet counts and recent move history.

### Game flow

1. Player creates or joins a room → both players enter **augment selection** (15s timer, 3 random options).
2. Once both augments are chosen, augment effects are applied to initial state and `game-start` is emitted.
3. Each turn: server starts a countdown timer polling every 100ms against each player's `timeBank`. Players emit `select-move`; server validates affordability and cooldown, deducts elapsed time from timeBank (with +1.0s bonus for moving first, +0.5s for second). When both moves are in, `resolveTurn()` runs and `turn-result` is emitted.
4. After 3.5s delay, `next-turn` is emitted and the timer restarts.
5. Timeout: if a player's `timeBank - elapsed ≤ 0`, they lose 1 life and the turn advances.

### Client (Vanilla JS ES Modules)

- **[src/js/app.js](src/js/app.js)** — Entry point. Wires all socket event listeners and delegates to UI/network modules.
- **[src/js/state/index.js](src/js/state/index.js)** — Single mutable `gameState` object shared across the frontend; updated via `updateGameState(patch)`.
- **[src/js/network/socket.js](src/js/network/socket.js)** — Exports a single shared `socket` instance (`io()` connecting back to the same origin).
- **[src/js/network/webrtc.js](src/js/network/webrtc.js)** — Peer-to-peer voice chat using WebRTC (STUN only, no TURN). The Socket.IO server relays SDP offer/answer and ICE candidates. Mic starts muted.
- **[src/js/ui/](src/js/ui/)** — `screens.js` (show/hide screens), `lobby.js` (room creation/joining, augment card rendering), `game.js` (move cards, stat updates, result reveal animation, history sidebar), `timers.js` (client-side countdown display only — authoritative timers are server-side).
- **[src/js/constants/index.js](src/js/constants/index.js)** — Client-side copy of move/augment metadata (display only).

### Key design notes

- **Duplicate socket handler**: `server/socket/events.js` (loaded by `server.js`) and `server/socket/index.js` implement nearly identical logic. The `index.js` file is not used; any changes to socket behavior should go in `events.js`.
- **Augment application**: Augment effects (lives, timeBank, bullets) are applied inline in `events.js` after both players select, not via the `applyAugment`/`applyOpponentAugmentEffect` helpers in `gameLogic.js`.
- **Nap streak mechanic**: Consecutive `nap` moves give +1 bullet on first use, +2 on second+, and set `cooldown = true` after 2+ consecutive naps, preventing immediate re-use.
- **Time bank**: Each player starts with 15s. Time is deducted when they submit a move (elapsed since turn start), so slow-play gradually erodes the bank across turns.
