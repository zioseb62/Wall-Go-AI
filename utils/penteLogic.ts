import { GameState, PlayerId, Point, Difficulty } from '../types';

export const getBestPenteMoveForAI = (gameState: GameState, playerId: PlayerId, difficulty: Difficulty): Point => {
    const GRID_SIZE = 15;
    const opponentId = playerId === 1 ? 2 : 1;
    
    const board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    gameState.players.forEach(p => {
        const val = p.id === playerId ? 1 : 2;
        p.positions.forEach(pos => {
            board[pos.r][pos.c] = val;
        });
    });

    const isInside = (r: number, c: number) => r >= 0 && c >= 0 && r < GRID_SIZE && c < GRID_SIZE;

    const evaluateLine = (r: number, c: number, dr: number, dc: number, role: 1|2): number => {
        let count = 1;
        let blocked1 = false;
        let blocked2 = false;
        
        let i = 1;
        while(isInside(r + i*dr, c + i*dc)) {
            if (board[r + i*dr][c + i*dc] === role) { count++; i++; }
            else if (board[r + i*dr][c + i*dc] === 0) { break; }
            else { blocked1 = true; break; }
        }
        
        let j = 1;
        while(isInside(r - j*dr, c - j*dc)) {
            if (board[r - j*dr][c - j*dc] === role) { count++; j++; }
            else if (board[r - j*dr][c - j*dc] === 0) { break; }
            else { blocked2 = true; break; }
        }

        if (count >= 5) return 100000;
        if (count === 4) {
            if (!blocked1 && !blocked2) return 10000;
            if (!blocked1 || !blocked2) return 1000;
        }
        if (count === 3) {
            if (!blocked1 && !blocked2) return 1000;
            if (!blocked1 || !blocked2) return 100;
        }
        if (count === 2) {
            if (!blocked1 && !blocked2) return 50;
            if (!blocked1 || !blocked2) return 10;
        }
        return 0;
    };

    const isCapture = (r: number, c: number, role: 1|2) => {
        const opp = role === 1 ? 2 : 1;
        const dirs = [[1,0], [0,1], [1,1], [1,-1], [-1,0], [0,-1], [-1,-1], [-1,1]];
        let captures = 0;
        for (const [dr, dc] of dirs) {
            if (isInside(r+3*dr, c+3*dc) &&
                board[r+dr][c+dc] === opp &&
                board[r+2*dr][c+2*dc] === opp &&
                board[r+3*dr][c+3*dc] === role) {
                captures++;
            }
        }
        return captures;
    };

    const getVulnerability = (r: number, c: number) => {
        const dirs = [[1,0], [0,1], [1,1], [1,-1], [-1,0], [0,-1], [-1,-1], [-1,1]];
        let vuln = 0;
        for (const [dr, dc] of dirs) {
            if (isInside(r - dr, c - dc) && isInside(r + dr, c + dc) && isInside(r + 2*dr, c + 2*dc)) {
                if (board[r - dr][c - dc] === 2 && board[r + dr][c + dc] === 1 && board[r + 2*dr][c + 2*dc] === 0) {
                    vuln++;
                }
            }
        }
        return vuln;
    };

    let bestScore = -Infinity;
    let candidates: Point[] = [];

    const aiPlayer = gameState.players.find(p => p.id === playerId);
    const aiPiecesCount = aiPlayer?.positions.length || 0;

    if (aiPiecesCount === 0 && (difficulty === 'difficile' || difficulty === 'estrema')) {
        return {r: 7, c: 7};
    }

    let hasPieces = false;
    for (let r=0; r<GRID_SIZE; r++) {
        for (let c=0; c<GRID_SIZE; c++) {
            if (board[r][c] !== 0) hasPieces = true;
        }
    }
    if (!hasPieces) {
        return {r: 7, c: 7};
    }

    const searchRadius = difficulty === 'estrema' ? 2 : 2;

    for (let r=0; r<GRID_SIZE; r++) {
        for (let c=0; c<GRID_SIZE; c++) {
            if (board[r][c] !== 0) continue;

            if (aiPiecesCount === 1 && (difficulty === 'difficile' || difficulty === 'estrema')) {
                if (Math.max(Math.abs(r - 7), Math.abs(c - 7)) < 3) {
                    continue; // Must be at least 3 intersections away
                }
            } else {
                let near = false;
                for(let dr=-searchRadius; dr<=searchRadius; dr++) {
                    for(let dc=-searchRadius; dc<=searchRadius; dc++) {
                        if (isInside(r+dr, c+dc) && board[r+dr][c+dc] !== 0) near = true;
                    }
                }
                if (!near) continue;
            }

            let score = 0;
            const myPlayer = gameState.players.find(p => p.id === playerId);
            const myCaptures = myPlayer?.penteCaptures || 0;
            const oppPlayer = gameState.players.find(p => p.id === opponentId);
            const oppCaptures = oppPlayer?.penteCaptures || 0;

            let offScore = 0;
            let defScore = 0;

            const halfDirs = [[1,0], [0,1], [1,1], [1,-1]];
            for (const [dr, dc] of halfDirs) {
                offScore += evaluateLine(r, c, dr, dc, 1);
                defScore += evaluateLine(r, c, dr, dc, 2);
            }

            const caps = isCapture(r, c, 1);
            if (caps > 0) {
                offScore += caps * 1500;
                if ((myCaptures + caps * 2) >= 10) offScore += 100000;
            }

            const preventsCaps = isCapture(r, c, 2);
            if (preventsCaps > 0) {
                defScore += preventsCaps * 1500;
                if ((oppCaptures + preventsCaps * 2) >= 10) defScore += 100000;
            }

            defScore -= getVulnerability(r, c) * 300;

            if (difficulty === 'normale') {
                score = offScore * 1.0 + defScore * 0.9 + Math.random() * 10;
            } else if (difficulty === 'difficile') {
                score = offScore * 1.0 + defScore * 1.0 + Math.random() * 5;
            } else {
                score = offScore * 1.1 + defScore * 1.2 + Math.random() * 1;
            }

            if (score > bestScore) {
                bestScore = score;
                candidates = [{r, c}];
            } else if (score === bestScore) {
                candidates.push({r, c});
            }
        }
    }

    if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
    
    return {r: 7, c: 7};
};
