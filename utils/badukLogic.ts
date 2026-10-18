import { Board, MCTSEngine, BLACK, WHITE } from "./badukAdvancedMCTS";
import { Player, GameState, Difficulty, Point, PlayerId, BoardTheme } from "../types";
import { calculateTerritory } from "./gameLogic";

// Helper: neighbors
export const getBadukNeighbors = (r: number, c: number) => [
    [r-1, c], [r+1, c], [r, c-1], [r, c+1]
];

// Helper: get player id at r,c
export const getBadukPlayerAt = (players: Player[], r: number, c: number) => {
    for (let i=0; i<players.length; i++) {
        if (players[i].positions.some(pos => pos.r === r && pos.c === c)) return i;
    }
    return -1;
};

// Find group of stones starting at (r,c) for a given player
export const findBadukGroupAndLiberties = (players: Player[], startR: number, startC: number, playerIdx: number, size: number) => {
    const group: {r: number, c: number}[] = [];
    const libertyPoints = new Set<string>();
    const visited = new Set<string>();
    const queue = [{r: startR, c: startC}];
    visited.add(`${startR},${startC}`);

    while (queue.length > 0) {
        const curr = queue.shift()!;
        group.push(curr);

        for (const [nr, nc] of getBadukNeighbors(curr.r, curr.c)) {
            if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
            const nKey = `${nr},${nc}`;
            if (visited.has(nKey)) continue;

            const occupant = getBadukPlayerAt(players, nr, nc);
            if (occupant === -1) {
                libertyPoints.add(nKey);
            } else if (occupant === playerIdx) {
                visited.add(nKey);
                queue.push({r: nr, c: nc});
            }
        }
    }
    return { group, liberties: libertyPoints.size, libertyPoints };
};

// Automatic dead stone detector for the reconciliation scoring phase
export const detectInitialBadukDeadStones = (players: Player[], size: number, theme: BoardTheme): string[] => {
    const deadStones = new Set<string>();
    
    // First, run standard territory calculation assuming all live
    const { territoryMap } = calculateTerritory([], players, theme);

    players.forEach((player, pIdx) => {
        const oppIdx = pIdx === 0 ? 1 : 0;
        const oppPlayerId = players[oppIdx].id;
        const checked = new Set<string>();

        player.positions.forEach(pos => {
            const key = `${pos.r},${pos.c}`;
            if (checked.has(key)) return;

            const { group, liberties, libertyPoints } = findBadukGroupAndLiberties(players, pos.r, pos.c, pIdx, size);
            group.forEach(g => checked.add(`${g.r},${g.c}`));

            // Condition 1: Group in atari (1 liberty) that cannot escape or gain liberties
            if (liberties === 1) {
                const libKey = Array.from(libertyPoints)[0];
                const [lr, lc] = libKey.split(',').map(Number);
                const escapeTest = performBadukMove(players, lr, lc, pIdx, size);
                if (!escapeTest.valid || (escapeTest.newPlayers && findBadukGroupAndLiberties(escapeTest.newPlayers, lr, lc, pIdx, size).liberties <= 1)) {
                    // Cannot escape from atari
                    group.forEach(g => deadStones.add(`${g.r},${g.c}`));
                    return;
                }
            }

            // Condition 2: Small group (<=4 stones) with <=2 liberties completely engulfed inside opponent's secure territory
            if (liberties <= 2 && group.length <= 4) {
                let insideOppTerritory = true;
                for (const lib of Array.from(libertyPoints)) {
                    if (territoryMap[lib] !== oppPlayerId) {
                        insideOppTerritory = false;
                        break;
                    }
                }
                if (insideOppTerritory) {
                    group.forEach(g => deadStones.add(`${g.r},${g.c}`));
                    return;
                }
            }
        });
    });

    return Array.from(deadStones);
};

// Toggle a stone group between alive and dead during scoring phase
export const toggleBadukDeadGroup = (players: Player[], r: number, c: number, currentDeadStones: string[], size: number): string[] => {
    const pIdx = getBadukPlayerAt(players, r, c);
    if (pIdx === -1) return currentDeadStones;

    const { group } = findBadukGroupAndLiberties(players, r, c, pIdx, size);
    const deadSet = new Set(currentDeadStones);

    const isGroupDead = group.some(g => deadSet.has(`${g.r},${g.c}`));

    if (isGroupDead) {
        // Unmark all stones in this group (mark alive)
        group.forEach(g => deadSet.delete(`${g.r},${g.c}`));
    } else {
        // Mark all stones in this group as dead
        group.forEach(g => deadSet.add(`${g.r},${g.c}`));
    }

    return Array.from(deadSet);
};

export const performBadukMove = (players: Player[], r: number, c: number, currentPlayerIndex: number, size: number, koPoint?: Point | null): { valid: boolean, newPlayers?: Player[], captured?: any[], newKoPoint?: Point | null } => {
  if (koPoint && koPoint.r === r && koPoint.c === c) return { valid: false }; // Ko violation
  
  const isOccupied = players.some(p => p.positions.some(pos => pos.r === r && pos.c === c));
  if (isOccupied) return { valid: false };

  const newPos = { r, c, id: `piece-${Math.random().toString(36).substr(2, 9)}` };
  
  // Create a deep copy of players with the new piece added
  const tempPlayers = players.map((p, idx) => 
    idx === currentPlayerIndex 
      ? { ...p, positions: [...p.positions, newPos] } 
      : { ...p, positions: [...p.positions] }
  );

  const capturedPieces: any[] = [];
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
  const maxSafeSize = size; 

  // 1. Check if any opponent stones are captured
  let opponentPositions = [...tempPlayers[opponentIndex].positions];
  const finalOpponentPositions: any[] = [];
  const checkedOpponents = new Set<string>();

  for (const pos of opponentPositions) {
      const posKey = `${pos.r},${pos.c}`;
      if (checkedOpponents.has(posKey)) continue;

      const { group, liberties } = findBadukGroupAndLiberties(tempPlayers, pos.r, pos.c, opponentIndex, maxSafeSize);
      group.forEach(g => checkedOpponents.add(`${g.r},${g.c}`));

      if (liberties === 0) {
          // Captured!
          group.forEach(g => {
             const origPiece = opponentPositions.find(op => op.r === g.r && op.c === g.c);
             if (origPiece) {
                capturedPieces.push({ ...origPiece, color: tempPlayers[opponentIndex].color, t: Date.now() });
             }
          });
      } else {
          // Keep these stones
          group.forEach(g => {
             const origPiece = opponentPositions.find(op => op.r === g.r && op.c === g.c);
             if (origPiece && !finalOpponentPositions.some(p => p.r === origPiece.r && p.c === origPiece.c)) {
                 finalOpponentPositions.push(origPiece);
             }
          });
      }
  }

  tempPlayers[opponentIndex].positions = finalOpponentPositions;

  // 2. Self check (Suicide rule)
  // If no opponent captured, check if the placed stone has 0 liberties.
  if (capturedPieces.length === 0) {
      const selfGroup = findBadukGroupAndLiberties(tempPlayers, r, c, currentPlayerIndex, maxSafeSize);
      if (selfGroup.liberties === 0) {
          return { valid: false }; // Suicide is illegal
      }
  }
  
  let newKoPoint: Point | null = null;
  if (capturedPieces.length === 1) {
      const selfGroup = findBadukGroupAndLiberties(tempPlayers, r, c, currentPlayerIndex, maxSafeSize);
      if (selfGroup.liberties === 1 && selfGroup.group.length === 1) {
          // It's a ko!
          newKoPoint = { r: capturedPieces[0].r, c: capturedPieces[0].c };
      }
  }

  return {
      valid: true,
      newPlayers: tempPlayers,
      captured: capturedPieces,
      newKoPoint
  };
};

const evaluateBadukMoveScore = (
    oldPlayers: Player[],
    newPlayers: Player[],
    r: number, c: number, size: number,
    playerIdx: number, oppIdx: number,
    territoryMap: Record<string, PlayerId>,
    myGroupsInAtari: { liberty: string, groupSize: number }[],
    difficulty: Difficulty,
    capturedCount: number
): number => {
    let score = Math.random() * 5; // trace of randomness avoids deterministic loops
    
    const selfGroup = findBadukGroupAndLiberties(newPlayers, r, c, playerIdx, size);

    if (capturedCount > 0) {
        score += capturedCount * 5000; // Capturing is extremely high priority
    }

    const moveKey = `${r},${c}`;
    
    // Saving our own stones from atari
    const savingSelf = myGroupsInAtari.find(g => g.liberty === moveKey);
    if (savingSelf) {
        if (selfGroup.liberties > 1 || capturedCount > 0) {
            score += savingSelf.groupSize * 5000;
        } else {
            score -= 3000; // Just puts more stones in atari
        }
    }
    
    // Or making a move that happens to capture the stones threatening us
    if (capturedCount > 0) {
         if (myGroupsInAtari.length > 0) {
              score += 2000; 
         }
    }

    // Check for self atari (Suicide rule already handled, but this means we place and have 1 liberty left)
    if (selfGroup.liberties === 1 && capturedCount === 0) {
        score -= 5000; // Strongly avoid self-atari
    } else if (selfGroup.liberties === 2) {
        score -= 100; // Careful with low liberties
    } else {
        score += selfGroup.liberties * 40; // More liberties is generally good
    }

    // Eye detection (avoid filling own true eyes)
    let myNeighbors = 0;
    let oppNeighbors = 0;
    let offBoard = 0;
    const neighbors = getBadukNeighbors(r, c);

    if (territoryMap[moveKey] === oldPlayers[oppIdx].id && capturedCount === 0) {
        score -= 15000; // Do not place pieces inside opponent's secure territory
    } else if (territoryMap[moveKey] === oldPlayers[playerIdx].id) {
        score -= 2000; // Do not place pieces inside our own secure territory unnecessarily
    }
    
    for (const [nr, nc] of neighbors) {
        if (nr < 0 || nc < 0 || nr >= size || nc >= size) {
            offBoard++;
        } else {
            const p = getBadukPlayerAt(oldPlayers, nr, nc);
            if (p === playerIdx) myNeighbors++;
            if (p === oppIdx) oppNeighbors++;
        }
    }
    
    if (myNeighbors + offBoard === 4) {
        let oppDiags = 0;
        const diagonals = [[r-1, c-1], [r-1, c+1], [r+1, c-1], [r+1, c+1]];
        for (const [dr, dc] of diagonals) {
            if (dr >= 0 && dc >= 0 && dr < size && dc < size) {
                if (getBadukPlayerAt(oldPlayers, dr, dc) === oppIdx) oppDiags++;
            }
        }
        const maxOppDiagsAllowed = offBoard > 0 ? 0 : 1;
        if (oppDiags <= maxOppDiagsAllowed && capturedCount === 0) {
            score -= 10000; // Don't fill true eyes!
        }
    }

    // Check if the move puts opponent in atari or reduces liberties
    let putOppInAtariScore = 0;
    let oppGroupsTouched = new Set<string>();
    for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nc >= 0 && nr < size && nc < size) {
            if (getBadukPlayerAt(newPlayers, nr, nc) === oppIdx) {
                const oppGroup = findBadukGroupAndLiberties(newPlayers, nr, nc, oppIdx, size);
                const oppGroupKey = oppGroup.group.map(p => `${p.r},${p.c}`).sort().join('|');
                if (!oppGroupsTouched.has(oppGroupKey)) {
                    oppGroupsTouched.add(oppGroupKey);
                    if (oppGroup.liberties === 1) {
                         putOppInAtariScore += oppGroup.group.length * 1500;
                    } else if (oppGroup.liberties === 2) {
                         putOppInAtariScore += oppGroup.group.length * 200; // Pressuring
                    } else if (oppGroup.liberties === 3) {
                         putOppInAtariScore += oppGroup.group.length * 30;
                    }
                }
            }
        }
    }
    score += putOppInAtariScore;

    // Distance based heuristics
    let minDistToSelf = 999;
    let minDistToOpp = 999;
    oldPlayers[playerIdx].positions.forEach(pos => {
        const dist = Math.abs(pos.r - r) + Math.abs(pos.c - c);
        if (dist < minDistToSelf) minDistToSelf = dist;
    });
    oldPlayers[oppIdx].positions.forEach(pos => {
        const dist = Math.abs(pos.r - r) + Math.abs(pos.c - c);
        if (dist < minDistToOpp) minDistToOpp = dist;
    });

    const edgeR = Math.min(r, size - 1 - r);
    const edgeC = Math.min(c, size - 1 - c);

    if (difficulty !== "normale") { 
        // Penalize first lines early-mid game (naive)
        if (edgeR === 0 || edgeC === 0) {
            score -= 200; 
        } else if (edgeR === 1 || edgeC === 1) {
            score -= 50; 
        }
        
        if (difficulty === "estrema" || difficulty === "difficile" || difficulty === "maestro") {
            // 3rd and 4th lines are highly preferred for territory and influence
            if (edgeR === 2 && edgeC >= 2) score += 80;
            if (edgeC === 2 && edgeR >= 2) score += 80;
            if (edgeR === 3 && edgeC >= 3) score += 60;
            if (edgeC === 3 && edgeR >= 3) score += 60;

            // Corners are crucial early on
            if ((edgeR === 2 || edgeR === 3) && (edgeC === 2 || edgeC === 3)) {
                score += 150;
            }
        }

        // Connecting and approaching
        if (minDistToSelf === 1) score += 120; // Solid connect
        if (minDistToSelf === 2) score += 100; // Jump
        if (minDistToSelf === 3) score += 40;

        if (minDistToOpp === 1) score += 80; // Attachment
        if (minDistToOpp === 2) score += 120; // Safe pressure
        
        // --- Extra Estrema / Maestro Logic inside score ---
        if (difficulty === "estrema" || difficulty === "maestro") {
            // Reward good shapes
            if (minDistToSelf === 2 && (Math.abs(oldPlayers[playerIdx].positions[0]?.r - r) === 1 || Math.abs(oldPlayers[playerIdx].positions[0]?.c - c) === 1)) {
                // Not a real check for knights move, but just an example of trying to find shape
            }
            // Check for empty triangle penalty (naive approximation)
             if (myNeighbors >= 2) {
                 score -= 30; // clumps
             }
        }
    } else {
        if (minDistToSelf === 1 || minDistToSelf === 2) score += 40;
        if (minDistToSelf === 3) score += 20;

        if (minDistToOpp === 2) score += 50; 
        if (minDistToOpp === 1) score += 10;
    }
    
    return score;
};

export const getBestBadukMoveForAI = (gameState: GameState, playerId: number, difficulty: Difficulty): {r: number, c: number} | null => {
    const myIndex = playerId - 1;
    const oppIndex = myIndex === 0 ? 1 : 0;
    const theme = gameState.boardTheme;
    let size = 9;
    if (theme === 'baduk-13') size = 13;
    if (theme === 'baduk-19') size = 19;

    // Instant standard opening moves on star points (hoshi) and komoku (3-4 points)
    const totalStones = (gameState.players[0]?.positions.length || 0) + (gameState.players[1]?.positions.length || 0);
    const maxOpeningStones = size === 19 ? 6 : (size === 13 ? 4 : 2);
    if (totalStones <= maxOpeningStones) {
        let starPoints: {r: number, c: number}[] = [];
        if (size === 19) {
            starPoints = [
                {r: 3, c: 15}, {r: 15, c: 15}, {r: 3, c: 3}, {r: 15, c: 3},
                {r: 2, c: 15}, {r: 3, c: 16}, {r: 15, c: 16}, {r: 16, c: 15},
                {r: 2, c: 3}, {r: 3, c: 2}, {r: 15, c: 2}, {r: 16, c: 3},
                {r: 3, c: 9}, {r: 15, c: 9}, {r: 9, c: 3}, {r: 9, c: 15},
                {r: 9, c: 9}
            ];
        } else if (size === 13) {
            starPoints = [
                {r: 3, c: 9}, {r: 9, c: 9}, {r: 3, c: 3}, {r: 9, c: 3},
                {r: 2, c: 9}, {r: 3, c: 10}, {r: 9, c: 10}, {r: 10, c: 9},
                {r: 2, c: 3}, {r: 3, c: 2}, {r: 9, c: 2}, {r: 10, c: 3},
                {r: 6, c: 6}
            ];
        } else {
            starPoints = [
                {r: 2, c: 6}, {r: 6, c: 6}, {r: 2, c: 2}, {r: 6, c: 2},
                {r: 4, c: 4}, {r: 2, c: 3}, {r: 3, c: 2}, {r: 5, c: 6}, {r: 6, c: 5}
            ];
        }

        const occupied = new Set<string>();
        gameState.players.forEach(pl => pl.positions.forEach(pos => occupied.add(`${pos.r},${pos.c}`)));

        // Try primary 4 corner star points first
        const emptyCorners = starPoints.slice(0, 4).filter(pt => !occupied.has(`${pt.r},${pt.c}`));
        if (emptyCorners.length > 0) {
            return emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
        }

        const emptyOthers = starPoints.slice(4).filter(pt => !occupied.has(`${pt.r},${pt.c}`));
        if (emptyOthers.length > 0) {
            return emptyOthers[Math.floor(Math.random() * emptyOthers.length)];
        }
    }
    
    // Analyze pre-move boarding state for Ataris
    const myGroupsInAtari: { liberty: string, groupSize: number }[] = [];
    const checkedSelfAtari = new Set<string>();
    gameState.players[myIndex].positions.forEach(pos => {
        const key = `${pos.r},${pos.c}`;
        if (checkedSelfAtari.has(key)) return;
        const info = findBadukGroupAndLiberties(gameState.players, pos.r, pos.c, myIndex, size);
        info.group.forEach(g => checkedSelfAtari.add(`${g.r},${g.c}`));
        if (info.liberties === 1) {
            const lArr = Array.from(info.libertyPoints);
            myGroupsInAtari.push({ liberty: lArr[0], groupSize: info.group.length });
        }
    });

    const oppGroupsInAtari: { liberty: string, groupSize: number }[] = [];
    const checkedOppAtari = new Set<string>();
    gameState.players[oppIndex].positions.forEach(pos => {
        const key = `${pos.r},${pos.c}`;
        if (checkedOppAtari.has(key)) return;
        const info = findBadukGroupAndLiberties(gameState.players, pos.r, pos.c, oppIndex, size);
        info.group.forEach(g => checkedOppAtari.add(`${g.r},${g.c}`));
        if (info.liberties === 1) {
            const lArr = Array.from(info.libertyPoints);
            oppGroupsInAtari.push({ liberty: lArr[0], groupSize: info.group.length });
        }
    });

    let validMoves: {r: number, c: number, score: number, newPlayers?: Player[]}[] = [];
    
    // Evaluate current territory so we don't play blindly inside opponent's secure territory
    const { territoryMap, scores: terrScores } = calculateTerritory(gameState.walls, gameState.players, theme);
    const oppPlayerId = gameState.players[oppIndex].id;
    let isLosing = false;

    if (gameState.consecutivePasses > 0) {
        const starterIdx = gameState.startingPlayerIndex || 0;
        const myScore = (terrScores[playerId as PlayerId] || 0) + gameState.players[myIndex].positions.length + (playerId !== gameState.players[starterIdx].id ? 7.5 : 0);
        const oppScore = (terrScores[oppPlayerId as PlayerId] || 0) + gameState.players[oppIndex].positions.length + (oppPlayerId !== gameState.players[starterIdx].id ? 7.5 : 0);
        if (myScore > oppScore) {
            return null; // The human passed and we are winning, pass to end the game!
        }
        isLosing = true;
    }

    for (let r=0; r<size; r++) {
        for (let c=0; c<size; c++) {
            const res = performBadukMove(gameState.players, r, c, myIndex, size, gameState.badukKoPoint);
            if (res.valid && res.newPlayers) {
                 let score = evaluateBadukMoveScore(
                     gameState.players, res.newPlayers, r, c, size,
                     myIndex, oppIndex, territoryMap, myGroupsInAtari,
                     difficulty, res.captured ? res.captured.length : 0
                 );
                 validMoves.push({r, c, score, newPlayers: res.newPlayers});
            }
        }
    }
    
    if (validMoves.length > 0) {
        validMoves.sort((a,b) => b.score - a.score);
        
        // --- NEW Advanced MCTS for Maestro, Estrema, Difficile ---
        if (difficulty === "maestro" || difficulty === "estrema" || difficulty === "difficile") {
            const board = new Board(size);
            const starterIdx = gameState.startingPlayerIndex || 0;
            
            gameState.players.forEach((player, i) => {
                const pColor = i === starterIdx ? BLACK : WHITE;
                player.positions.forEach(p => {
                    board.board[p.r * size + p.c] = pColor;
                });
            });
            
            if (gameState.badukKoPoint) {
                 board.ko_point = gameState.badukKoPoint.r * size + gameState.badukKoPoint.c;
            }
            
            const myColor = playerId === gameState.players[starterIdx].id ? BLACK : WHITE;
            board.to_move = myColor;
            
            const ai = new MCTSEngine(size); 
            const color = myColor;
            
            let searchTime = 1.0;
            if (difficulty === "maestro") searchTime = 3.5;
            else if (difficulty === "estrema") searchTime = 2.0;
            else if (difficulty === "difficile") searchTime = 0.5;
            
            const move = ai.get_move(board, color, searchTime); 
            
            if (isLosing && move !== null && ai._last_stats && ai._last_stats.children && ai._last_stats.children.length > 0) {
                 const bestQ = parseFloat(ai._last_stats.children[0][2]);
                 if (bestQ < 0.10) {
                     return null; // Concede, human passed and we are losing with no good moves
                 }
            }

            if (move !== null) {
                 let r = Math.floor(move / size);
                 let c = move % size;
                 const check = performBadukMove(gameState.players, r, c, myIndex, size, gameState.badukKoPoint);
                 if (check.valid) {
                      return {r, c};
                 }
            }
        }

        // --- 1-Ply Minimax for Normale (Old Difficile) ---
        if (difficulty === "normale") {
            const topN = 8;
            const topMoves = validMoves.slice(0, topN);
            
            for (let i = 0; i < topMoves.length; i++) {
                const myMove = topMoves[i];
                if (myMove.score <= -1000) continue;

                let bestOppScore = -Infinity;
                for (let or=0; or<size; or++) {
                    for (let oc=0; oc<size; oc++) {
                        const oppRes = performBadukMove(myMove.newPlayers!, or, oc, oppIndex, size, {r: myMove.r, c: myMove.c});
                        if (oppRes.valid && oppRes.newPlayers) {
                            const oppScore = evaluateBadukMoveScore(
                                myMove.newPlayers!, oppRes.newPlayers, or, oc, size,
                                oppIndex, myIndex, territoryMap, [], // simplified
                                "normale", oppRes.captured ? oppRes.captured.length : 0
                            );
                            if (oppScore > bestOppScore) bestOppScore = oppScore;
                        }
                    }
                }
                
                if (bestOppScore > -1000 && bestOppScore !== -Infinity) {
                    myMove.score -= (bestOppScore * 0.9);
                }
            }
            validMoves.sort((a,b) => b.score - a.score);
        }

        // Return logic
        if (isLosing && validMoves[0].score <= 0) {
            return null; // Concede
        }
        if (validMoves[0].score <= -2000) {
            return null; // Pass
        }
        
        if (difficulty === "normale") {
            const poolSize = Math.max(1, Math.min(3, validMoves.length)); // Top 3
            const pick = validMoves[Math.floor(Math.random() * poolSize)];
            return {r: pick.r, c: pick.c};
        } else if (difficulty === "facile") {
            const poolSize = Math.max(1, Math.min(5, validMoves.length)); // Top 5 for natural casual play
            const pick = validMoves[Math.floor(Math.random() * poolSize)];
            return {r: pick.r, c: pick.c};
        } else {
            return {r: validMoves[0].r, c: validMoves[0].c}; // Absolute best for Difficile/Estrema if MCTS fails
        }
    }
    
    return null; // Pass
};
