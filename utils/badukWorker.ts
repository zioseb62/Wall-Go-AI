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
            // Do not destroy root here, we might just be syncing state.
            // Wait, if it's a completely new game, boardData will be mostly empty.
            let sum = 0;
            for(let i=0; i<data.boardData.length; i++) sum += data.boardData[i];
            if (sum === 0) ai.root = null; // actually new game
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

        if (currentBoard.consecutive_passes > 0) {
            const size = currentBoard.size;
            const players = [
                { id: 1, positions: [] as any[] },
                { id: 2, positions: [] as any[] }
            ];
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const v = currentBoard.board[r * size + c];
                    if (v === 1) players[0].positions.push({r, c});
                    if (v === 2) players[1].positions.push({r, c});
                }
            }
            const theme = size === 19 ? 'baduk-19' : (size === 13 ? 'baduk-13' : 'baduk-9');
            const terr = calculateTerritory([], players as any, theme as any);
            const score1 = (terr.scores[1] || 0) + players[0].positions.length;
            const score2 = (terr.scores[2] || 0) + players[1].positions.length + ai.komi;
            
            const myScore = currentColor === 1 ? score1 : score2;
            const oppScore = currentColor === 1 ? score2 : score1;
            
            if (myScore > oppScore) {
                move = null;
                shouldSearch = false;
            }
        }

        if (shouldSearch) {
            move = ai.get_move(currentBoard, currentColor, data.timeBudget);
            if (currentBoard.consecutive_passes > 0 && move !== null && ai._last_stats && ai._last_stats.children && ai._last_stats.children.length > 0) {
                const bestQStr = ai._last_stats.children[0][2];
                if (bestQStr) {
                    const bestQ = parseFloat(bestQStr);
                    if (bestQ < 0.10) {
                        move = null; // Concede
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
