import { Board, MCTSEngine, BLACK, WHITE } from "./badukAdvancedMCTS";

let ai: MCTSEngine | null = null;
let currentBoard: Board | null = null;
let currentColor = BLACK;
let pondering = false;
let isCalculating = false;

self.onmessage = (e) => {
    const { type, size, boardData, koPoint, color, timeBudget, movePlayed } = e.data;
    
    if (type === 'INIT') {
        if (!ai || ai.board_size !== size) {
            ai = new MCTSEngine(size);
        }
        currentBoard = new Board(size);
        currentBoard.board = new Int8Array(boardData);
        if (koPoint) {
            currentBoard.ko_point = koPoint.r * size + koPoint.c;
        } else {
            currentBoard.ko_point = null;
        }
        currentBoard.to_move = color;
        currentColor = color;
        
        if (movePlayed !== undefined && movePlayed !== null) {
            ai.update_root(movePlayed);
        } else {
            ai.root = null;
        }
        pondering = false;
    } else if (type === 'PONDER') {
        if (!ai || !currentBoard) return;
        pondering = true;
        ponderLoop();
    } else if (type === 'GET_MOVE') {
        pondering = false;
        if (!ai || !currentBoard) return;
        isCalculating = true;
        
        const move = ai.get_move(currentBoard, currentColor, timeBudget);
        self.postMessage({ type: 'MOVE_RESULT', move, stats: ai._last_stats });
        
        if (move !== null) {
             try {
                 currentBoard.play(move, currentColor);
             } catch (e) {}
             currentColor = currentColor === BLACK ? WHITE : BLACK;
        }
        
        isCalculating = false;
    } else if (type === 'STOP') {
        pondering = false;
        isCalculating = false;
    }
};

function ponderLoop() {
    if (!pondering || !ai || !currentBoard || isCalculating) return;
    
    const start = Date.now();
    while (Date.now() - start < 30) {
        ai.ponder(currentBoard, currentColor, 10);
    }
    
    setTimeout(ponderLoop, 0);
}
