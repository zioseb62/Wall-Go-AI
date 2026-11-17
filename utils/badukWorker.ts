import { calculateTerritory } from "./gameLogic";
import { Board, MCTSEngine, BLACK, WHITE, other } from "./badukAdvancedMCTS";

let ai: MCTSEngine | null = null;
let currentBoard: Board | null = null;
let currentColor = BLACK;
let pondering = false;
let isCalculating = false;

self.onmessage = (e) => {
    const data = e.data;
    
    if (data.type === 'INIT') {
        const size = data.size;
        if (!ai || ai.board_size !== size) {
            ai = new MCTSEngine(size);
        } else {
            let sum = 0;
            let boardChanged = !currentBoard || currentBoard.size !== size || currentColor !== data.color;
            for (let i = 0; i < data.boardData.length; i++) {
                sum += data.boardData[i];
                if (!boardChanged && currentBoard && currentBoard.board[i] !== data.boardData[i]) {
                    boardChanged = true;
                }
            }
            if (sum === 0 || boardChanged) {
                ai.root = null;
            }
        }
        currentBoard = new Board(size);
        currentBoard.board = new Int8Array(data.boardData);
        if (data.koPoint) {
            currentBoard.ko_point = data.koPoint.r * size + data.koPoint.c;
        } else {
            currentBoard.ko_point = null;
        }
        currentBoard.to_move = data.color;
        if (data.consecutivePasses !== undefined) {
            currentBoard.consecutive_passes = data.consecutivePasses;
        }
        currentColor = data.color;
        pondering = false;
        
    } else if (data.type === 'HUMAN_MOVE') {
        if (!ai || !currentBoard) return;
        const move = data.move === -1 ? null : data.move;
        try {
            currentBoard.play(move, currentColor);
        } catch (err) {}
        ai.update_root(move);
        currentColor = other(currentColor);
        
        if (ai.board_size !== 19) {
            pondering = true;
            ponderLoop();
        }
        
    } else if (data.type === 'PONDER') {
        if (!ai || !currentBoard || ai.board_size === 19) return;
        pondering = true;
        ponderLoop();
        
    } else if (data.type === 'GET_MOVE') {
        pondering = false;
        if (!ai || !currentBoard) return;
        isCalculating = true;
        
        // Ensure tree is aligned
        if (ai.root && ai.root.color === currentColor) {
             ai.root = null;
        }

        let move: number | null = null;
        let shouldSearch = true;
        const stoneCount = currentBoard.stone_count();

        // Only consider passing immediately in response to an opponent pass if we are genuinely in the endgame
        if (currentBoard.consecutive_passes > 0 && stoneCount >= Math.floor(currentBoard.n * 0.45)) {
            const { black, white } = currentBoard.score();
            const myScore = currentColor === BLACK ? black : white;
            const oppScore = currentColor === BLACK ? white : black;
            
            if (myScore > oppScore + 1.5) {
                move = null;
                shouldSearch = false;
            }
        }

        if (shouldSearch) {
            move = ai.get_move(currentBoard, currentColor, data.timeBudget);
            if (
                currentBoard.consecutive_passes > 0 &&
                stoneCount >= Math.floor(currentBoard.n * 0.65) &&
                move !== null &&
                ai._last_stats &&
                ai._last_stats.children &&
                ai._last_stats.children.length > 0
            ) {
                const bestQStr = ai._last_stats.children[0][2];
                if (bestQStr) {
                    const bestQ = parseFloat(bestQStr);
                    if (bestQ < 0.02) {
                        move = null; // Concede only in hopeless late endgame after opponent pass
                    }
                }
            }
        }
        self.postMessage({ type: 'MOVE_RESULT', move, stats: ai._last_stats });
        
        if (move !== null) {
             try {
                 currentBoard.play(move, currentColor);
             } catch(err) {}
             ai.update_root(move);
        } else {
             ai.update_root(null);
        }
        currentColor = other(currentColor);
        
        isCalculating = false;
        if (ai && ai.board_size !== 19) {
            pondering = true;
            ponderLoop();
        }
        
    } else if (data.type === 'STOP') {
        pondering = false;
        isCalculating = false;
    }
};

function ponderLoop() {
    if (!pondering || !ai || !currentBoard || isCalculating) return;
    if (ai.board_size === 19) {
        pondering = false;
        return;
    }
    
    const start = Date.now();
    while (Date.now() - start < 15) {
        ai.ponder(currentBoard, currentColor, 1);
    }
    
    setTimeout(ponderLoop, 25);
}
