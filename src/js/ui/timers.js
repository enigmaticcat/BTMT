import { gameState, updateGameState } from '../state/index.js';

export function startClientTimers() {
    if (gameState.turnTimer) clearInterval(gameState.turnTimer);

    updateGameState({
        myMoveSelected: false,
        oppMoveSelected: false,
        myTurnStart: Date.now()
    });

    let initialMyTime = gameState.myTimeBank;
    let initialOppTime = gameState.oppTimeBank;

    document.getElementById('your-time').textContent = initialMyTime.toFixed(1);
    document.getElementById('opponent-time').textContent = initialOppTime.toFixed(1);

    const turnTimer = setInterval(() => {
        const elapsed = (Date.now() - gameState.myTurnStart) / 1000;

        if (!gameState.myMoveSelected && !gameState.gameActive) return;

        if (!gameState.myMoveSelected) {
            let t = initialMyTime - elapsed;
            if (t < 0) t = 0;
            const el = document.getElementById('your-time');
            if (el) {
                el.textContent = t.toFixed(1);
                if (t <= 5.0) el.parentElement.classList.add('timer-urgent');
                else el.parentElement.classList.remove('timer-urgent');
            }
        }

        if (!gameState.oppMoveSelected) {
            let t = initialOppTime - elapsed;
            if (t < 0) t = 0;
            const el = document.getElementById('opponent-time');
            if (el) {
                el.textContent = t.toFixed(1);
                if (t <= 5.0) el.parentElement.classList.add('timer-urgent');
                else el.parentElement.classList.remove('timer-urgent');
            }
        }
    }, 100);

    updateGameState({ turnTimer });
}

export function stopClientTimers() {
    if (gameState.turnTimer) clearInterval(gameState.turnTimer);
    updateGameState({
        myMoveSelected: true,
        oppMoveSelected: true
    });
}
