export const gameState = {
    myRole: null,
    gameActive: false,
    selectedMove: null,
    historyOpen: false,
    turnHistory: [],
    isAIGame: false,
    aiDifficulty: 'normal',
    selectedAugment: null,

    turnTimer: null,
    myTimeBank: 15.0,
    oppTimeBank: 15.0,
    myTurnStart: 0,
    myMoveSelected: false,
    oppMoveSelected: false,
};

export function updateGameState(updates) {
    Object.assign(gameState, updates);
}
