
import { Point, PlayerId, Wall, GameState, AIAction, Player, Difficulty } from '../types';
import { GRID_SIZE } from '../constants';
import { getReachableCells, getWallOptions, calculateTerritory, serializeWall, hasWall, getWallBetween, removeWall, getNeighbors, isValidCell, isValidFugaWall, getAbalonePossibleMoves, getAbaloneUV, AbaloneMove } from './gameLogic';

const getDistancesMap = (start: Point, walls: Wall[], theme: any): number[][] => {
  // Using 'any' for theme temporarily to match import, or properly GameState['boardTheme']
  const dists = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(Infinity));
  const queue: { r: number, c: number, d: number }[] = [{ r: start.r, c: start.c, d: 0 }];
  dists[start.r][start.c] = 0;

  while (queue.length > 0) {
    const { r, c, d } = queue.shift()!;
    const neighbors = getNeighbors(r, c, theme);
    
    for (const [nr, nc] of neighbors) {
      if (isValidCell(nr, nc, theme)) {
        if (!hasWall(walls, r, c, nr, nc)) {
          if (dists[nr][nc] === Infinity) {
            dists[nr][nc] = d + 1;
            queue.push({ r: nr, c: nc, d: d + 1 });
          }
        }
      }
    }
  }
  return dists;
};

// --- FAST QUORIDOR (CORSA) BITMASK & ALPHA-BETA ENGINE FOR 'ESTREMA' (DIFFICILE) ---
const CORSA_WALL_VALUES = [0, 780, 1500, 2160, 2780, 3380, 3960, 4520, 5060, 5580, 6080];
const corsaBfsQueue = new Int16Array(81);

interface CorsaPathAnalysis {
  dist: Int16Array;
  shortestDist: number;
  optimalExits: number;
  mustBacktrack: boolean;
  corridorBranches: number;
}

const buildCorsaEdgesMask = (walls: Wall[]): Uint8Array => {
  const edges = new Uint8Array(81);
  for (let i = 0; i < walls.length; i++) {
    const id = walls[i].id;
    const sep = id.indexOf('|');
    if (sep === -1) continue;
    const c1Idx = id.indexOf(',');
    const c2Idx = id.indexOf(',', sep + 1);
    const r1 = parseInt(id.slice(0, c1Idx), 10);
    const c1 = parseInt(id.slice(c1Idx + 1, sep), 10);
    const r2 = parseInt(id.slice(sep + 1, c2Idx), 10);
    const c2 = parseInt(id.slice(c2Idx + 1), 10);
    if (r1 < 0 || r1 >= 9 || c1 < 0 || c1 >= 9 || r2 < 0 || r2 >= 9 || c2 < 0 || c2 >= 9) continue;
    if (r1 !== r2) {
      const minR = r1 < r2 ? r1 : r2;
      edges[minR * 9 + c1] |= 2; // South blocked
      edges[(minR + 1) * 9 + c1] |= 1; // North blocked
    } else if (c1 !== c2) {
      const minC = c1 < c2 ? c1 : c2;
      edges[r1 * 9 + minC] |= 8; // East blocked
      edges[r1 * 9 + minC + 1] |= 4; // West blocked
    }
  }
  return edges;
};

const canPlaceCorsaWallFast = (edges: Uint8Array, r: number, c: number, isHoriz: boolean): boolean => {
  const idx = r * 9 + c;
  if (isHoriz) {
    if ((edges[idx] & 2) !== 0 || (edges[idx + 1] & 2) !== 0) return false;
    if ((edges[idx] & 8) !== 0 && (edges[idx + 9] & 8) !== 0) return false;
    return true;
  } else {
    if ((edges[idx] & 8) !== 0 || (edges[idx + 9] & 8) !== 0) return false;
    if ((edges[idx] & 2) !== 0 && (edges[idx + 1] & 2) !== 0) return false;
    return true;
  }
};

const applyCorsaWallFast = (edges: Uint8Array, r: number, c: number, isHoriz: boolean): void => {
  const idx = r * 9 + c;
  if (isHoriz) {
    edges[idx] |= 2;
    edges[idx + 9] |= 1;
    edges[idx + 1] |= 2;
    edges[idx + 10] |= 1;
  } else {
    edges[idx] |= 8;
    edges[idx + 1] |= 4;
    edges[idx + 9] |= 8;
    edges[idx + 10] |= 4;
  }
};

const removeCorsaWallFast = (edges: Uint8Array, r: number, c: number, isHoriz: boolean): void => {
  const idx = r * 9 + c;
  if (isHoriz) {
    edges[idx] &= ~2;
    edges[idx + 9] &= ~1;
    edges[idx + 1] &= ~2;
    edges[idx + 10] &= ~1;
  } else {
    edges[idx] &= ~8;
    edges[idx + 1] &= ~4;
    edges[idx + 9] &= ~8;
    edges[idx + 10] &= ~4;
  }
};

const computeCorsaShortestDistFast = (posIdx: number, playerId: PlayerId, edges: Uint8Array): number => {
  const r0 = Math.floor(posIdx / 9);
  const c0 = posIdx % 9;
  if ((playerId === 1 && r0 === 0) || (playerId === 2 && r0 === 8) || (playerId === 3 && c0 === 8) || (playerId === 4 && c0 === 0)) {
    return 0;
  }
  const visited = new Uint8Array(81);
  const dists = new Int16Array(81);
  let head = 0;
  let tail = 0;
  corsaBfsQueue[tail++] = posIdx;
  visited[posIdx] = 1;
  dists[posIdx] = 0;

  while (head < tail) {
    const curr = corsaBfsQueue[head++];
    const d = dists[curr] + 1;
    const cr = Math.floor(curr / 9);
    const cc = curr % 9;
    const e = edges[curr];

    // North
    if (cr > 0 && (e & 1) === 0) {
      const next = curr - 9;
      if (!visited[next]) {
        if (playerId === 1 && cr - 1 === 0) return d;
        visited[next] = 1;
        dists[next] = d;
        corsaBfsQueue[tail++] = next;
      }
    }
    // South
    if (cr < 8 && (e & 2) === 0) {
      const next = curr + 9;
      if (!visited[next]) {
        if (playerId === 2 && cr + 1 === 8) return d;
        visited[next] = 1;
        dists[next] = d;
        corsaBfsQueue[tail++] = next;
      }
    }
    // West
    if (cc > 0 && (e & 4) === 0) {
      const next = curr - 1;
      if (!visited[next]) {
        if (playerId === 4 && cc - 1 === 0) return d;
        visited[next] = 1;
        dists[next] = d;
        corsaBfsQueue[tail++] = next;
      }
    }
    // East
    if (cc < 8 && (e & 8) === 0) {
      const next = curr + 1;
      if (!visited[next]) {
        if (playerId === 3 && cc + 1 === 8) return d;
        visited[next] = 1;
        dists[next] = d;
        corsaBfsQueue[tail++] = next;
      }
    }
  }
  return 999;
};

const analyzeCorsaPlayerPath = (posIdx: number, playerId: PlayerId, edges: Uint8Array): CorsaPathAnalysis => {
  const dist = new Int16Array(81);
  dist.fill(999);
  let head = 0;
  let tail = 0;

  for (let i = 0; i < 9; i++) {
    const gIdx = playerId === 1 ? i : playerId === 2 ? 72 + i : playerId === 3 ? i * 9 + 8 : i * 9;
    dist[gIdx] = 0;
    corsaBfsQueue[tail++] = gIdx;
  }

  while (head < tail) {
    const curr = corsaBfsQueue[head++];
    const d = dist[curr] + 1;
    const cr = Math.floor(curr / 9);
    const cc = curr % 9;
    const e = edges[curr];

    if (cr > 0 && (e & 1) === 0 && dist[curr - 9] === 999) {
      dist[curr - 9] = d;
      corsaBfsQueue[tail++] = curr - 9;
    }
    if (cr < 8 && (e & 2) === 0 && dist[curr + 9] === 999) {
      dist[curr + 9] = d;
      corsaBfsQueue[tail++] = curr + 9;
    }
    if (cc > 0 && (e & 4) === 0 && dist[curr - 1] === 999) {
      dist[curr - 1] = d;
      corsaBfsQueue[tail++] = curr - 1;
    }
    if (cc < 8 && (e & 8) === 0 && dist[curr + 1] === 999) {
      dist[curr + 1] = d;
      corsaBfsQueue[tail++] = curr + 1;
    }
  }

  const shortestDist = dist[posIdx];
  if (shortestDist === 0 || shortestDist >= 999) {
    return { dist, shortestDist, optimalExits: 0, mustBacktrack: false, corridorBranches: 0 };
  }

  const pr = Math.floor(posIdx / 9);
  const pc = posIdx % 9;
  const pe = edges[posIdx];
  let optimalExits = 0;
  let hasForwardOrSideExit = false;

  const checkExit = (nIdx: number, dr: number, dc: number) => {
    if (dist[nIdx] === shortestDist - 1) {
      optimalExits++;
      const isBackward =
        (playerId === 1 && dr > 0) ||
        (playerId === 2 && dr < 0) ||
        (playerId === 3 && dc < 0) ||
        (playerId === 4 && dc > 0);
      if (!isBackward) hasForwardOrSideExit = true;
    }
  };

  if (pr > 0 && (pe & 1) === 0) checkExit(posIdx - 9, -1, 0);
  if (pr < 8 && (pe & 2) === 0) checkExit(posIdx + 9, 1, 0);
  if (pc > 0 && (pe & 4) === 0) checkExit(posIdx - 1, 0, -1);
  if (pc < 8 && (pe & 8) === 0) checkExit(posIdx + 1, 0, 1);

  const mustBacktrack = optimalExits > 0 && !hasForwardOrSideExit;

  // Trace up to 3 steps along shortest paths to measure corridor width/branching
  let corridorBranches = 0;
  const seen = new Uint8Array(81);
  let fHead = 0;
  let fTail = 0;
  corsaBfsQueue[fTail++] = posIdx;
  seen[posIdx] = 1;

  while (fHead < fTail) {
    const u = corsaBfsQueue[fHead++];
    const rem = dist[u];
    const depthUsed = shortestDist - rem;
    if (depthUsed >= 3 || rem === 0) continue;
    const ur = Math.floor(u / 9);
    const uc = u % 9;
    const ue = edges[u];

    if (ur > 0 && (ue & 1) === 0 && dist[u - 9] === rem - 1 && !seen[u - 9]) {
      seen[u - 9] = 1;
      corridorBranches++;
      corsaBfsQueue[fTail++] = u - 9;
    }
    if (ur < 8 && (ue & 2) === 0 && dist[u + 9] === rem - 1 && !seen[u + 9]) {
      seen[u + 9] = 1;
      corridorBranches++;
      corsaBfsQueue[fTail++] = u + 9;
    }
    if (uc > 0 && (ue & 4) === 0 && dist[u - 1] === rem - 1 && !seen[u - 1]) {
      seen[u - 1] = 1;
      corridorBranches++;
      corsaBfsQueue[fTail++] = u - 1;
    }
    if (uc < 8 && (ue & 8) === 0 && dist[u + 1] === rem - 1 && !seen[u + 1]) {
      seen[u + 1] = 1;
      corridorBranches++;
      corsaBfsQueue[fTail++] = u + 1;
    }
  }

  return { dist, shortestDist, optimalExits, mustBacktrack, corridorBranches };
};

const getFastCorsaPawnMoves = (posIdx: number, allPositions: number[], myPlayerIndex: number, edges: Uint8Array): number[] => {
  const moves: number[] = [];
  const r = Math.floor(posIdx / 9);
  const c = posIdx % 9;
  const e = edges[posIdx];

  const isOccupied = (cellIdx: number): boolean => {
    for (let i = 0; i < allPositions.length; i++) {
      if (i !== myPlayerIndex && allPositions[i] === cellIdx) return true;
    }
    return false;
  };

  // Directions: [dr, dc, bit]
  const dirs: [number, number, number][] = [
    [-1, 0, 1],
    [1, 0, 2],
    [0, -1, 4],
    [0, 1, 8],
  ];

  for (let d = 0; d < 4; d++) {
    const [dr, dc, bit] = dirs[d];
    if ((e & bit) !== 0) continue;
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) continue;
    const nIdx = nr * 9 + nc;

    if (!isOccupied(nIdx)) {
      moves.push(nIdx);
    } else {
      // Occupied by opponent pawn: check straight jump first
      const ne = edges[nIdx];
      const jr = nr + dr;
      const jc = nc + dc;
      if (jr >= 0 && jr < 9 && jc >= 0 && jc < 9 && (ne & bit) === 0 && !isOccupied(jr * 9 + jc)) {
        moves.push(jr * 9 + jc);
      } else {
        // Blocked behind opponent pawn: check diagonal jumps
        const diagDirs: [number, number, number][] =
          dr !== 0
            ? [
                [0, -1, 4],
                [0, 1, 8],
              ]
            : [
                [-1, 0, 1],
                [1, 0, 2],
              ];
        for (let k = 0; k < 2; k++) {
          const [ddr, ddc, dBit] = diagDirs[k];
          if ((ne & dBit) !== 0) continue;
          const diagR = nr + ddr;
          const diagC = nc + ddc;
          if (diagR >= 0 && diagR < 9 && diagC >= 0 && diagC < 9) {
            const diagIdx = diagR * 9 + diagC;
            if (!isOccupied(diagIdx)) {
              moves.push(diagIdx);
            }
          }
        }
      }
    }
  }
  return moves;
};

export const evaluateBoardState = (gameState: GameState, walls: Wall[], playerId: PlayerId, opponents_deprecated: Player[], difficulty: Difficulty): number => {
  const opponents = gameState.players.filter(p => p.id !== playerId);
  const theme = gameState.boardTheme;
  const myPlayer = gameState.players.find(p => p.id === playerId)!;

  if (gameState.gameMode === 'corsa') {
     let score = 0;
     const myDistMaps = myPlayer.positions.map(pos => getDistancesMap(pos, walls, theme));
     
     let myShortest = Infinity;
     for (let i=0; i<9; i++) {
        const goalP = playerId === 1 ? {r:0,c:i} : playerId === 2 ? {r:8,c:i} : playerId === 3 ? {r:i,c:8} : {r:i,c:0};
        if (myDistMaps[0] && myDistMaps[0][goalP.r]) {
           myShortest = Math.min(myShortest, myDistMaps[0][goalP.r][goalP.c]);
        }
     }
     
     let oppAvgShortest = 0;
     let oppMinShortest = Infinity;
     opponents.forEach(opp => {
        const oppDistMaps = opp.positions.map(pos => getDistancesMap(pos, walls, theme));
        let oppShortest = Infinity;
        for (let i=0; i<9; i++) {
          const goalP = opp.id === 1 ? {r:0,c:i} : opp.id === 2 ? {r:8,c:i} : opp.id === 3 ? {r:i,c:8} : {r:i,c:0};
          if (oppDistMaps[0] && oppDistMaps[0][goalP.r]) {
             oppShortest = Math.min(oppShortest, oppDistMaps[0][goalP.r][goalP.c]);
          }
        }
        oppAvgShortest += oppShortest;
        oppMinShortest = Math.min(oppMinShortest, oppShortest);
     });

     // Se chiudiamo completamente un giocatore (distanza Infinity), invalidiamo questa mossa in Corsa perché il regolamento originale di Quoridor lo vieta
     if (myShortest === Infinity || oppAvgShortest === Infinity) {
         return -9999999;
     }

     if (difficulty === 'estrema') {
        // Potenziato per il nuovo livello "Difficile" (estrema)
        if (myShortest === 0) return 1000000;
        if (oppMinShortest === 0) return -1000000;
        const adv = oppMinShortest - myShortest;
        score += adv * 1000;
        const myWalls = Math.min(10, Math.max(0, myPlayer.wallsLeft || 0));
        const oppWalls = Math.min(10, Math.max(0, opponents[0]?.wallsLeft || 0));
        score += (CORSA_WALL_VALUES[myWalls] - CORSA_WALL_VALUES[oppWalls]);
        if (oppMinShortest <= 2 && adv <= 0) score -= (3 - oppMinShortest) * 800;
        const cDist = Math.abs(myPlayer.positions[0].c - 4);
        score -= (cDist * 10);
     } else {
        // Livello "Medio" (difficile) usa l'ex-Difficile (estrema); Livello "Semplice" (normale) usa l'ex-Medio (difficile)
        const isExEstrema = difficulty === 'difficile';
        const adv = oppMinShortest - myShortest;
        
        score -= myShortest * 2000;
        
        if (myShortest === 0) score += 1000000;
        if (oppMinShortest === 0) score -= 1000000;
        
        if (adv < 0) {
            score += adv * 5000;
        } else {
            score += adv * (isExEstrema ? 500 : 350);
        }
        
        const wallValue = isExEstrema ? 200 : 100;
        score += (myPlayer.wallsLeft || 0) * wallValue;

        const cDist = Math.abs(myPlayer.positions[0].c - 4);
        score -= (cDist * 10);
     }

     return score;
  }

  const territory = calculateTerritory(walls, gameState.players, theme);
  
  const SCORE_WEIGHT = difficulty === 'estrema' ? 300 : difficulty === 'difficile' ? 150 : 80;
  const MOBILITY_WEIGHT = difficulty === 'estrema' ? 50 : difficulty === 'difficile' ? 25 : 10;
  const OPPONENT_RESTRICTION_WEIGHT = difficulty === 'estrema' ? 100 : difficulty === 'difficile' ? 40 : 15;
  const CENTER_WEIGHT = difficulty === 'estrema' ? 25 : difficulty === 'difficile' ? 12 : 5;

  let score = territory.scores[playerId] * SCORE_WEIGHT;
  
  if (difficulty === 'estrema' || difficulty === 'difficile') {
      opponents.forEach(opp => {
          score -= territory.scores[opp.id] * SCORE_WEIGHT * (difficulty === 'estrema' ? 2.0 : 1.2);
      });
  }
  
  if (territory.enclosed[playerId]) {
     // Adjust for map size variance (Standard 49, Ziggurat 49, but total potential differs in bounding box)
     // Since valid cells is always approx 49, this ratio holds.
     const areaRatio = territory.scores[playerId] / 49; 
     if (areaRatio < 0.40) {
        score -= 50000; 
     } else if (areaRatio > 0.60) {
        score += 15000;
     }
  }

  const myDistMaps = myPlayer.positions.map(pos => getDistancesMap(pos, walls, theme));
  const oppDistMaps = opponents.flatMap(opp => opp.positions.map(pos => getDistancesMap(pos, walls, theme)));

  let myControl = 0;
  let oppControl = 0;
  let mobility = 0;

  myPlayer.positions.forEach(pos => {
      mobility += getReachableCells(pos, walls, gameState.players, 3, theme, gameState.gameMode).length;
  });

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!isValidCell(r, c, theme)) continue;
      if (territory.territoryMap[`${r},${c}`]) continue;

      let myMinDist = Infinity;
      for (const map of myDistMaps) if (map[r][c] < myMinDist) myMinDist = map[r][c];

      let oppMinDist = Infinity;
      for (const map of oppDistMaps) if (map[r][c] < oppMinDist) oppMinDist = map[r][c];

      if (myMinDist < oppMinDist && myMinDist !== Infinity) {
        const centrality = 1 - (Math.abs(r - 3) + Math.abs(c - 3)) / 6;
        myControl += 2 + (centrality * CENTER_WEIGHT);
        myControl += (15 / (myMinDist + 1));
      } else if (oppMinDist < myMinDist && oppMinDist !== Infinity) {
        oppControl += 2;
      }
    }
  }
  
  score += (myControl * 8);
  score -= (oppControl * OPPONENT_RESTRICTION_WEIGHT);
  score += (mobility * MOBILITY_WEIGHT);

  return score;
};

export const getBestAbaloneMoveForAI = (gameState: GameState, playerId: PlayerId, difficulty: Difficulty = 'normale'): (AIAction & {abaloneIndices: number[], du: number, dv: number, isPush?: boolean}) | null => {
  const theme = gameState.boardTheme;
  const currentPlayer = gameState.players.find(p => p.id === playerId)!;
  const opponents = gameState.players.filter(p => p.id !== playerId);
  
  // Try to find all valid combinations of 1, 2, or 3 adjacent collinear pieces
  const allValidSets: number[][] = [];
  
  const addIfValid = (indices: number[]) => {
      // Just check if we can get moves from this set
      const moves = getAbalonePossibleMoves(currentPlayer, indices, gameState.players, theme);
      if (moves.length > 0) {
          allValidSets.push(indices);
      }
  };

  // 1-piece sets
  for(let i=0; i<currentPlayer.positions.length; i++) {
      addIfValid([i]);
  }
  
  // 2-piece sets (must be adjacent)
  for(let i=0; i<currentPlayer.positions.length; i++) {
      for(let j=i+1; j<currentPlayer.positions.length; j++) {
          const neighbors = getNeighbors(currentPlayer.positions[i].r, currentPlayer.positions[i].c, theme);
          if (neighbors.some(([r,c]) => r === currentPlayer.positions[j].r && c === currentPlayer.positions[j].c)) {
              addIfValid([i, j]);
          }
      }
  }
  // 3-piece sets (collinear, adjacent)
  for (let i=0; i<currentPlayer.positions.length; i++) {
      for (let j=0; j<currentPlayer.positions.length; j++) {
          if (i === j) continue;
          for (let k=0; k<currentPlayer.positions.length; k++) {
              if (i === k || j === k) continue;
              // Check collinearity
              const uv1 = getAbaloneUV(currentPlayer.positions[i]);
              const uv2 = getAbaloneUV(currentPlayer.positions[j]);
              const uv3 = getAbaloneUV(currentPlayer.positions[k]);
              
              const du1 = uv2.u - uv1.u;
              const dv1 = uv2.v - uv1.v;
              const du2 = uv3.u - uv2.u;
              const dv2 = uv3.v - uv2.v;
              
              // Only valid if they form a contiguous line of 3
              if (du1 === du2 && dv1 === dv2) {
                  // verify neighbors
                  const neigh1 = getNeighbors(currentPlayer.positions[i].r, currentPlayer.positions[i].c, theme);
                  if (neigh1.some(([r,c]) => r === currentPlayer.positions[j].r && c === currentPlayer.positions[j].c)) {
                      const neigh2 = getNeighbors(currentPlayer.positions[j].r, currentPlayer.positions[j].c, theme);
                      if (neigh2.some(([r,c]) => r === currentPlayer.positions[k].r && c === currentPlayer.positions[k].c)) {
                          const indices = [i, j, k].sort();
                          // make sure no duplicates added
                          if (!allValidSets.some(set => set.length === 3 && set[0] === indices[0] && set[1] === indices[1] && set[2] === indices[2])) {
                              addIfValid(indices);
                          }
                      }
                  }
              }
          }
      }
  }

  type ActionEval = {
      indices: number[];
      move: AbaloneMove;
      score: number;
  };
  const evaluated: ActionEval[] = [];

  const getDistFromCenter = (p: Point) => {
      const uv = getAbaloneUV(p);
      return (Math.abs(uv.u) + Math.abs(uv.v) + Math.abs(uv.u - uv.v)) / 2;
  };

  allValidSets.forEach(indices => {
      const moves = getAbalonePossibleMoves(currentPlayer, indices, gameState.players, theme);
      moves.forEach(move => {
          let score = 0;
          const isHard = difficulty === 'difficile' || difficulty === 'estrema';
          
          if (move.isPush) {
              score += 1000;
              if (!isValidCell(move.r, move.c, theme)) {
                  score += 100000; // PUSH OFF THE BOARD!
              } else if (isHard) {
                  // In difficult mode, pushing opponents closer to edge is highly rewarded
                  const oppPoint = {r: move.r, c: move.c};
                  const dist = getDistFromCenter(oppPoint);
                  score += dist * 200; // They are pushed to `dist` from center. If dist=4 (edge), they get 800 extra points
              }
          }

          const movePts = indices.map(idx => currentPlayer.positions[idx]);
          
          // Centrality & Edge avoidance
          movePts.forEach(p => {
              // Position AFTER move
              const newUV = getAbaloneUV(p);
              newUV.u += move.du!;
              newUV.v += move.dv!;
              const newDistToCenter = (Math.abs(newUV.u) + Math.abs(newUV.v) + Math.abs(newUV.u - newUV.v)) / 2;
              
              if (isHard) {
                  score -= newDistToCenter * 30;
                  // Extremely penalize moving to the edge (radius 4) unless pushing out
                  if (newDistToCenter >= 4 && (!move.isPush || isValidCell(move.r, move.c, theme))) {
                      score -= 500;
                  }
              } else {
                  score -= newDistToCenter * 10;
              }
          });
          
          // Grouping logic for Hard/Extreme
          if (isHard && indices.length > 1) {
              // Moving 2 or 3 pieces together is generally better than 1 piece (to maintain phalanx)
              score += indices.length * 50;
          }
          if (isHard && !move.isPush) {
             // In hard mode, try to move such that we form lines that CAN push
             // This can be complex, so we just add a small random bonus to non-pushes that move towards center
          }

          evaluated.push({ indices, move, score: score + Math.random() * 10 });
      });
  });

  if (evaluated.length === 0) return null;
  evaluated.sort((a,b) => b.score - a.score);
  
  const best = evaluated[0];
  return {
      pieceIdx: best.indices[0],
      movePos: { r: best.move.r, c: best.move.c },
      wallTarget: null,
      abaloneIndices: best.indices,
      du: best.move.du!,
      dv: best.move.dv!,
      isPush: best.move.isPush
  };
};

export const getBestAmazonsMoveForAI = (gameState: GameState, playerId: PlayerId, difficulty: Difficulty): AIAction | null => {
  const theme = gameState.boardTheme;
  const myPlayer = gameState.players.find(p => p.id === playerId)!;
  const oppPlayer = gameState.players.find(p => p.id !== playerId)!;

  const validDirs = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];

  const burntCells = new Set(gameState.walls.filter(w => !w.id.includes('|')).map(w => w.id));

  const initialOccupied = new Set<string>();
  burntCells.forEach(b => initialOccupied.add(b));
  gameState.players.forEach(p => p.positions.forEach(pos => initialOccupied.add(`${pos.r},${pos.c}`)));

  const bSize = theme === 'amazons-10' ? 10 : (theme === 'amazons-8' ? 8 : 6);

  interface AmazonMove {
    pieceIdx: number;
    r: number;
    c: number;
    arrowR: number;
    arrowC: number;
    score: number;
  }

  const getReachable = (r: number, c: number, localOccupied: Set<string>): [number, number][] => {
    const res: [number, number][] = [];
    validDirs.forEach(([dr, dc]) => {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < bSize && nc >= 0 && nc < bSize) {
        if (localOccupied.has(`${nr},${nc}`)) break;
        res.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
    });
    return res;
  };

  const evaluateState = (myPos: [number, number][], oppPos: [number, number][], localOccupied: Set<string>): number => {
      const myDists = Array(bSize).fill(null).map(() => Array(bSize).fill(Infinity));
      const oppDists = Array(bSize).fill(null).map(() => Array(bSize).fill(Infinity));
      
      const myQueue: {r: number, c: number}[] = [];
      const oppQueue: {r: number, c: number}[] = [];

      myPos.forEach(p => { myDists[p[0]][p[1]] = 0; myQueue.push({r: p[0], c: p[1]}); });
      oppPos.forEach(p => { oppDists[p[0]][p[1]] = 0; oppQueue.push({r: p[0], c: p[1]}); });

      const runQueenBFS = (queue: {r: number, c: number}[], dists: number[][]) => {
          let head = 0;
          while (head < queue.length) {
              const {r, c} = queue[head++];
              const d = dists[r][c];
              
              validDirs.forEach(([dr, dc]) => {
                  let nr = r + dr;
                  let nc = c + dc;
                  while (nr >= 0 && nr < bSize && nc >= 0 && nc < bSize) {
                      if (localOccupied.has(`${nr},${nc}`)) break;
                      if (dists[nr][nc] > d + 1) {
                          dists[nr][nc] = d + 1;
                          queue.push({r: nr, c: nc});
                      }
                      nr += dr;
                      nc += dc;
                  }
              });
          }
      };

      runQueenBFS(myQueue, myDists);
      runQueenBFS(oppQueue, oppDists);

      let myTerritory = 0;
      let oppTerritory = 0;
      let myTotalDist = 0;
      let oppTotalDist = 0;

      for (let r = 0; r < bSize; r++) {
          for (let c = 0; c < bSize; c++) {
              if (!localOccupied.has(`${r},${c}`)) {
                  if (myDists[r][c] < oppDists[r][c]) {
                      myTerritory += 1;
                      myTotalDist += myDists[r][c];
                  } else if (oppDists[r][c] < myDists[r][c]) {
                      oppTerritory += 1;
                      oppTotalDist += oppDists[r][c];
                  } else if (myDists[r][c] !== Infinity) {
                      myTerritory += 0.5;
                      oppTerritory += 0.5;
                  }
              }
          }
      }

      let score = (myTerritory - oppTerritory) * 100;
      if (difficulty === 'estrema') score += (oppTotalDist - myTotalDist) * 0.1;
      return score;
  };

  const evaluateStateSemplice = (myPos: [number, number][], oppPos: [number, number][], localOccupied: Set<string>): number => {
    let myMobility = 0;
    myPos.forEach(p => {
      myMobility += getReachable(p[0], p[1], localOccupied).length;
    });
    return myMobility * 10 + Math.random() * 10;
  };

  const allMoves: AmazonMove[] = [];
  
  myPlayer.positions.forEach((startPos, pieceIdx) => {
     const reachableMoves = getReachable(startPos.r, startPos.c, initialOccupied);
     
     let sampleMoves = reachableMoves;
     if (difficulty !== 'estrema' && sampleMoves.length > 15) {
         sampleMoves = sampleMoves.sort(() => Math.random() - 0.5).slice(0, 15);
     } else if (difficulty === 'estrema' && sampleMoves.length > 25) {
         sampleMoves.sort((a,b) => {
             const distA = Math.abs(a[0] - bSize/2) + Math.abs(a[1] - bSize/2);
             const distB = Math.abs(b[0] - bSize/2) + Math.abs(b[1] - bSize/2);
             return distA - distB;
         });
         sampleMoves = sampleMoves.slice(0, 25);
     }
     
     const myBasePos = myPlayer.positions.map((p, i) => [p.r, p.c]);
     const oppBasePos = oppPlayer.positions.map(p => [p.r, p.c]);

     sampleMoves.forEach(([qr, qc]) => {
         const moveOccupied = new Set(initialOccupied);
         moveOccupied.delete(`${startPos.r},${startPos.c}`);
         moveOccupied.add(`${qr},${qc}`);

         const myPosObj = myBasePos.map((p, i) => i === pieceIdx ? [qr, qc] : p);
         const potentialArrows = getReachable(qr, qc, moveOccupied);
         
         let sampleArrows = potentialArrows;
         if (difficulty === 'normale' && sampleArrows.length > 3) sampleArrows = sampleArrows.sort(() => Math.random() - 0.5).slice(0, 3);
         else if (difficulty === 'difficile' && sampleArrows.length > 8) sampleArrows = sampleArrows.sort(() => Math.random() - 0.5).slice(0, 8);
         else if (difficulty === 'estrema' && sampleArrows.length > 20) {
             sampleArrows.sort((a,b) => {
                 let distOppA = Infinity;
                 let distOppB = Infinity;
                 oppBasePos.forEach(op => {
                     distOppA = Math.min(distOppA, Math.abs(a[0]-op[0]) + Math.abs(a[1]-op[1]));
                     distOppB = Math.min(distOppB, Math.abs(b[0]-op[0]) + Math.abs(b[1]-op[1]));
                 });
                 return distOppA - distOppB;
             });
             sampleArrows = sampleArrows.slice(0, 20);
         }

         sampleArrows.forEach(([ar, ac]) => {
            moveOccupied.add(`${ar},${ac}`);
            
            let score = 0;
            if (difficulty === 'normale') {
               score = evaluateStateSemplice(myPosObj as [number,number][], oppBasePos as [number,number][], moveOccupied);
            } else {
               score = evaluateState(myPosObj as [number,number][], oppBasePos as [number,number][], moveOccupied);
               score += Math.random() * 0.1;
            }

            allMoves.push({ pieceIdx, r: qr, c: qc, arrowR: ar, arrowC: ac, score });
            
            moveOccupied.delete(`${ar},${ac}`);
         });
     });
  });

  if (allMoves.length === 0) return null;

  allMoves.sort((a,b) => b.score - a.score);
  const best = allMoves[0];

  return {
    pieceIdx: best.pieceIdx,
    movePos: { r: best.r, c: best.c },
    wallTarget: { r: best.arrowR, c: best.arrowC }
  };
};

interface CorsaCandidateWall {
  r: number;
  c: number;
  isHoriz: boolean;
  priority: number;
  netDelta: number;
}

const getBestCorsaExtremeMoveForAI = (gameState: GameState, aiPlayerId: PlayerId): AIAction | null => {
  const players = gameState.players;
  const aiIdx = players.findIndex(p => p.id === aiPlayerId);
  if (aiIdx === -1 || players[aiIdx].positions.length === 0) return null;

  const startPos = players[aiIdx].positions[0];
  const edges = buildCorsaEdgesMask(gameState.walls);
  const playerIds = players.map(p => p.id);
  const positions = players.map(p => (p.positions.length > 0 ? p.positions[0].r * 9 + p.positions[0].c : 40));
  const wallsLeft = players.map(p => p.wallsLeft || 0);
  const numPlayers = players.length;

  // Identify primary opponent (closest to their goal by true shortest path)
  let primaryOppIdx = (aiIdx + 1) % numPlayers;
  let bestOppDist = 999;
  for (let i = 0; i < numPlayers; i++) {
    if (i === aiIdx) continue;
    const d = computeCorsaShortestDistFast(positions[i], playerIds[i], edges);
    if (d < bestOppDist) {
      bestOppDist = d;
      primaryOppIdx = i;
    }
  }

  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const TIME_LIMIT_MS = 110;
  let timeAborted = false;
  let nodeCount = 0;

  const allPlayersHavePath = (skipIdx1: number, skipIdx2: number): boolean => {
    for (let i = 0; i < numPlayers; i++) {
      if (i === skipIdx1 || i === skipIdx2) continue;
      if (computeCorsaShortestDistFast(positions[i], playerIds[i], edges) >= 999) return false;
    }
    return true;
  };

  const evaluateState = (turnIdx: number, ply: number): number => {
    const myAnalysis = analyzeCorsaPlayerPath(positions[aiIdx], aiPlayerId, edges);
    if (myAnalysis.shortestDist >= 999) return -9999999;
    if (myAnalysis.shortestDist === 0) return 1000000 - ply * 1000;

    // In multiplayer (>2), consider the closest opponent
    let targetOppIdx = primaryOppIdx;
    let oppAnalysis = analyzeCorsaPlayerPath(positions[targetOppIdx], playerIds[targetOppIdx], edges);
    if (oppAnalysis.shortestDist >= 999) return -9999999;

    if (numPlayers > 2) {
      for (let i = 0; i < numPlayers; i++) {
        if (i === aiIdx || i === primaryOppIdx) continue;
        const alt = analyzeCorsaPlayerPath(positions[i], playerIds[i], edges);
        if (alt.shortestDist >= 999) return -9999999;
        if (alt.shortestDist < oppAnalysis.shortestDist) {
          oppAnalysis = alt;
          targetOppIdx = i;
        }
      }
    }

    if (oppAnalysis.shortestDist === 0) return -1000000 + ply * 1000;

    // Effective distance accounting for immediate pawn jumps or face-to-face blocks
    let myEffDist = myAnalysis.shortestDist;
    let oppEffDist = oppAnalysis.shortestDist;

    const myPawnMoves = getFastCorsaPawnMoves(positions[aiIdx], positions, aiIdx, edges);
    if (myPawnMoves.length > 0) {
      let bestMoveDist = 999;
      for (let i = 0; i < myPawnMoves.length; i++) {
        const d = myAnalysis.dist[myPawnMoves[i]];
        if (d < bestMoveDist) bestMoveDist = d;
      }
      if (bestMoveDist < 999) {
        if (turnIdx === aiIdx && bestMoveDist + 1 < myEffDist) {
          myEffDist = bestMoveDist + 1; // Immediate forward jump available on our turn!
        } else if (bestMoveDist + 1 > myEffDist) {
          myEffDist = bestMoveDist + 1; // Blocked by opponent pawn directly in front
        }
      }
    }

    const oppPawnMoves = getFastCorsaPawnMoves(positions[targetOppIdx], positions, targetOppIdx, edges);
    if (oppPawnMoves.length > 0) {
      let bestOppMoveDist = 999;
      for (let i = 0; i < oppPawnMoves.length; i++) {
        const d = oppAnalysis.dist[oppPawnMoves[i]];
        if (d < bestOppMoveDist) bestOppMoveDist = d;
      }
      if (bestOppMoveDist < 999) {
        if (turnIdx === targetOppIdx && bestOppMoveDist + 1 < oppEffDist) {
          oppEffDist = bestOppMoveDist + 1; // Opponent has an immediate forward jump on their turn!
        } else if (bestOppMoveDist + 1 > oppEffDist) {
          oppEffDist = bestOppMoveDist + 1;
        }
      }
    }

    const isMyTurn = turnIdx === aiIdx;
    const tempoBonus = isMyTurn ? 520 : -520;
    const raceDiff = oppEffDist - myEffDist;

    let score = raceDiff * 1000 + tempoBonus;

    // Critical endgame urgency: if opponent is about to reach goal and is ahead in tempo
    const oppWinningRace = oppEffDist < myEffDist || (oppEffDist === myEffDist && !isMyTurn);
    const myWinningRace = myEffDist < oppEffDist || (myEffDist === oppEffDist && isMyTurn);

    if (oppWinningRace) {
      if (oppEffDist === 1) score -= 2200;
      else if (oppEffDist === 2) score -= 1050;
      else if (oppEffDist === 3) score -= 420;
    } else if (myWinningRace) {
      if (myEffDist === 1) score += 2200;
      else if (myEffDist === 2) score += 1050;
      else if (myEffDist === 3) score += 420;
    }

    // Wall resource conservation vs tactical expenditure
    const myW = Math.min(10, Math.max(0, wallsLeft[aiIdx]));
    const oppW = Math.min(10, Math.max(0, wallsLeft[targetOppIdx]));
    let myWallWeight = 1.0;
    if (oppWinningRace && oppEffDist <= 3) {
      myWallWeight = 0.5; // Discount wall cost when stopping an imminent opponent win
    } else if (oppW === 0 && myWinningRace) {
      myWallWeight = 0.35; // Opponent has no walls left and we lead the race
    }
    score += CORSA_WALL_VALUES[myW] * myWallWeight - CORSA_WALL_VALUES[oppW];

    // Corridor & "Hood" (back-wall) trap heuristics
    if (oppAnalysis.mustBacktrack) {
      score += myW > 0 ? 310 : 140;
    }
    if (myAnalysis.mustBacktrack) {
      score -= oppW > 0 ? 340 : 160;
    }

    score += (myAnalysis.optimalExits - oppAnalysis.optimalExits) * 65;
    score += (myAnalysis.corridorBranches - oppAnalysis.corridorBranches) * 28;

    // Positional progress and center control tie-breakers
    const myR = Math.floor(positions[aiIdx] / 9);
    const myC = positions[aiIdx] % 9;
    const rawProgress =
      aiPlayerId === 1 ? 8 - myR : aiPlayerId === 2 ? myR : aiPlayerId === 3 ? myC : 8 - myC;
    score += rawProgress * 18;
    score -= Math.abs(myC - 4) * 8;

    return score;
  };

  // Pre-scan at root for dangerous opponent trap walls against AI so we can prioritize anti-trap walls
  const dangerousOppWallIntersections = new Uint8Array(64);
  if (wallsLeft[primaryOppIdx] > 0) {
    const baseMyDist = computeCorsaShortestDistFast(positions[aiIdx], aiPlayerId, edges);
    const baseOppDist = computeCorsaShortestDistFast(positions[primaryOppIdx], playerIds[primaryOppIdx], edges);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        for (let orient = 0; orient < 2; orient++) {
          const isHoriz = orient === 0;
          if (!canPlaceCorsaWallFast(edges, r, c, isHoriz)) continue;
          applyCorsaWallFast(edges, r, c, isHoriz);
          const newMyDist = computeCorsaShortestDistFast(positions[aiIdx], aiPlayerId, edges);
          const newOppDist = computeCorsaShortestDistFast(positions[primaryOppIdx], playerIds[primaryOppIdx], edges);
          removeCorsaWallFast(edges, r, c, isHoriz);
          if (newMyDist < 999 && newOppDist < 999) {
            const dmgToMe = (newMyDist - baseMyDist) - (newOppDist - baseOppDist);
            if (dmgToMe >= 2) {
              dangerousOppWallIntersections[r * 8 + c] = Math.max(
                dangerousOppWallIntersections[r * 8 + c],
                Math.min(10, dmgToMe)
              );
            }
          }
        }
      }
    }
  }

  const computeDistancesFromCell = (startIdx: number): Int16Array => {
    const dArr = new Int16Array(81);
    dArr.fill(999);
    let h = 0;
    let t = 0;
    dArr[startIdx] = 0;
    corsaBfsQueue[t++] = startIdx;
    while (h < t) {
      const curr = corsaBfsQueue[h++];
      const nd = dArr[curr] + 1;
      const cr = Math.floor(curr / 9);
      const cc = curr % 9;
      const e = edges[curr];
      if (cr > 0 && (e & 1) === 0 && dArr[curr - 9] === 999) {
        dArr[curr - 9] = nd;
        corsaBfsQueue[t++] = curr - 9;
      }
      if (cr < 8 && (e & 2) === 0 && dArr[curr + 9] === 999) {
        dArr[curr + 9] = nd;
        corsaBfsQueue[t++] = curr + 9;
      }
      if (cc > 0 && (e & 4) === 0 && dArr[curr - 1] === 999) {
        dArr[curr - 1] = nd;
        corsaBfsQueue[t++] = curr - 1;
      }
      if (cc < 8 && (e & 8) === 0 && dArr[curr + 1] === 999) {
        dArr[curr + 1] = nd;
        corsaBfsQueue[t++] = curr + 1;
      }
    }
    return dArr;
  };

  const generateCandidateWalls = (
    moverIdx: number,
    targetIdx: number,
    maxWalls: number,
    isRoot: boolean
  ): CorsaCandidateWall[] => {
    if (wallsLeft[moverIdx] <= 0) return [];
    const moverId = playerIds[moverIdx];
    const targetId = playerIds[targetIdx];
    const moverPos = positions[moverIdx];
    const targetPos = positions[targetIdx];

    const baseMover = analyzeCorsaPlayerPath(moverPos, moverId, edges);
    const baseTarget = analyzeCorsaPlayerPath(targetPos, targetId, edges);
    if (baseMover.shortestDist >= 999 || baseTarget.shortestDist >= 999) return [];

    const distFromTarget = computeDistancesFromCell(targetPos);
    const distFromMover = computeDistancesFromCell(moverPos);
    const targetNearPathMask = new Uint8Array(81);
    const moverShortestPathMask = new Uint8Array(81);
    const targetMaxLen = baseTarget.shortestDist + (isRoot ? 1 : 0);

    for (let idx = 0; idx < 81; idx++) {
      if (distFromTarget[idx] + baseTarget.dist[idx] <= targetMaxLen) {
        targetNearPathMask[idx] = 1;
      }
      if (distFromMover[idx] + baseMover.dist[idx] === baseMover.shortestDist) {
        moverShortestPathMask[idx] = 1;
      }
    }

    const candidates: CorsaCandidateWall[] = [];
    const tr = Math.floor(targetPos / 9);
    const tc = targetPos % 9;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = r * 9 + c;
        const antiTrapDmg = isRoot && moverIdx === aiIdx ? dangerousOppWallIntersections[r * 8 + c] : 0;
        const touchesTargetPath =
          targetNearPathMask[idx] === 1 ||
          targetNearPathMask[idx + 1] === 1 ||
          targetNearPathMask[idx + 9] === 1 ||
          targetNearPathMask[idx + 10] === 1;

        if (!touchesTargetPath && antiTrapDmg < 2) continue;

        const touchesMoverPath =
          moverShortestPathMask[idx] === 1 ||
          moverShortestPathMask[idx + 1] === 1 ||
          moverShortestPathMask[idx + 9] === 1 ||
          moverShortestPathMask[idx + 10] === 1;

        for (let orient = 0; orient < 2; orient++) {
          const isHoriz = orient === 0;
          if (!canPlaceCorsaWallFast(edges, r, c, isHoriz)) continue;

          applyCorsaWallFast(edges, r, c, isHoriz);
          const newTargetDist = touchesTargetPath
            ? computeCorsaShortestDistFast(targetPos, targetId, edges)
            : baseTarget.shortestDist;
          if (newTargetDist >= 999) {
            removeCorsaWallFast(edges, r, c, isHoriz);
            continue;
          }
          const newMoverDist = touchesMoverPath
            ? computeCorsaShortestDistFast(moverPos, moverId, edges)
            : baseMover.shortestDist;
          if (newMoverDist >= 999 || !allPlayersHavePath(moverIdx, targetIdx)) {
            removeCorsaWallFast(edges, r, c, isHoriz);
            continue;
          }

          const oppDelta = newTargetDist - baseTarget.shortestDist;
          const myDelta = newMoverDist - baseMover.shortestDist;
          const netDelta = oppDelta - myDelta;

          const antiTrapBonus = antiTrapDmg >= 2 ? antiTrapDmg * 220 : 0;

          if (netDelta < 0 && antiTrapBonus === 0) {
            removeCorsaWallFast(edges, r, c, isHoriz);
            continue;
          }

          let tacticalBonus = antiTrapBonus;
          let narrowsCorridor = false;

          if (oppDelta >= 0 && touchesTargetPath && (isRoot || netDelta >= 1)) {
            const newTargetAnalysis = analyzeCorsaPlayerPath(targetPos, targetId, edges);
            if (newTargetAnalysis.mustBacktrack && !baseTarget.mustBacktrack) {
              tacticalBonus += 360;
              narrowsCorridor = true;
            }
            if (newTargetAnalysis.optimalExits < baseTarget.optimalExits) {
              tacticalBonus += (baseTarget.optimalExits - newTargetAnalysis.optimalExits) * 140;
              if (newTargetAnalysis.optimalExits === 1) tacticalBonus += 90;
              narrowsCorridor = true;
            }
            if (newTargetAnalysis.corridorBranches < baseTarget.corridorBranches) {
              tacticalBonus += (baseTarget.corridorBranches - newTargetAnalysis.corridorBranches) * 35;
              narrowsCorridor = true;
            }
          }

          removeCorsaWallFast(edges, r, c, isHoriz);

          if (netDelta >= 1 || (netDelta === 0 && (narrowsCorridor || antiTrapBonus > 0))) {
            const distToTarget = Math.abs(r - tr) + Math.abs(c - tc);
            const proximityBonus = Math.max(0, 12 - distToTarget) * 8;
            const priority = netDelta * 1000 + tacticalBonus + proximityBonus;
            candidates.push({ r, c, isHoriz, priority, netDelta });
          }
        }
      }
    }

    candidates.sort((a, b) => b.priority - a.priority);
    return candidates.slice(0, maxWalls);
  };

  const alphaBeta = (
    depth: number,
    alpha: number,
    beta: number,
    turnIdx: number,
    ply: number
  ): number => {
    nodeCount++;
    if ((nodeCount & 31) === 0) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - startTime > TIME_LIMIT_MS) {
        timeAborted = true;
      }
    }

    const myDistNow = computeCorsaShortestDistFast(positions[aiIdx], aiPlayerId, edges);
    if (myDistNow === 0) return 1000000 - ply * 1000;
    const oppDistNow = computeCorsaShortestDistFast(positions[primaryOppIdx], playerIds[primaryOppIdx], edges);
    if (oppDistNow === 0) return -1000000 + ply * 1000;

    if (depth <= 0 || timeAborted) {
      return evaluateState(turnIdx, ply);
    }

    const isMaximizing = turnIdx === aiIdx;
    const nextTurnIdx = isMaximizing ? primaryOppIdx : aiIdx;
    const moverPos = positions[turnIdx];
    const moverId = playerIds[turnIdx];
    const moverAnalysis = analyzeCorsaPlayerPath(moverPos, moverId, edges);

    // 1. Generate and order legal pawn moves (best shortest-path moves first)
    const pawnMoves = getFastCorsaPawnMoves(moverPos, positions, turnIdx, edges);
    pawnMoves.sort((a, b) => {
      const da = moverAnalysis.dist[a];
      const db = moverAnalysis.dist[b];
      if (da !== db) return da - db;
      return Math.abs((a % 9) - 4) - Math.abs((b % 9) - 4);
    });

    // At deeper plies, only expand the top 2-3 pawn moves (those that advance or sidestep)
    const maxPawnMoves = ply === 1 ? 4 : 2;
    const orderedPawnMoves = pawnMoves.slice(0, maxPawnMoves);

    // 2. Generate top tactical wall placements
    const maxWalls = ply === 1 ? 8 : 4;
    const candidateWalls = generateCandidateWalls(
      turnIdx,
      isMaximizing ? primaryOppIdx : aiIdx,
      maxWalls,
      false
    );

    if (isMaximizing) {
      let value = -Infinity;

      // If opponent is about to win (dist <= 2), try high-impact walls BEFORE pawn moves for faster beta cutoffs
      const wallsFirst = oppDistNow <= 2 && candidateWalls.length > 0 && candidateWalls[0].netDelta >= 1;

      const runPawnMoves = () => {
        for (let i = 0; i < orderedPawnMoves.length; i++) {
          const mIdx = orderedPawnMoves[i];
          positions[turnIdx] = mIdx;
          const childVal = alphaBeta(depth - 1, alpha, beta, nextTurnIdx, ply + 1);
          positions[turnIdx] = moverPos;
          if (childVal > value) value = childVal;
          if (value > alpha) alpha = value;
          if (alpha >= beta || timeAborted) return;
        }
      };

      const runWalls = () => {
        for (let i = 0; i < candidateWalls.length; i++) {
          const w = candidateWalls[i];
          applyCorsaWallFast(edges, w.r, w.c, w.isHoriz);
          wallsLeft[turnIdx]--;
          const childVal = alphaBeta(depth - 1, alpha, beta, nextTurnIdx, ply + 1);
          wallsLeft[turnIdx]++;
          removeCorsaWallFast(edges, w.r, w.c, w.isHoriz);
          if (childVal > value) value = childVal;
          if (value > alpha) alpha = value;
          if (alpha >= beta || timeAborted) return;
        }
      };

      if (wallsFirst) {
        runWalls();
        if (alpha < beta && !timeAborted) runPawnMoves();
      } else {
        runPawnMoves();
        if (alpha < beta && !timeAborted) runWalls();
      }

      return value === -Infinity ? evaluateState(turnIdx, ply) : value;
    } else {
      let value = Infinity;

      const wallsFirst = myDistNow <= 2 && candidateWalls.length > 0 && candidateWalls[0].netDelta >= 1;

      const runPawnMoves = () => {
        for (let i = 0; i < orderedPawnMoves.length; i++) {
          const mIdx = orderedPawnMoves[i];
          positions[turnIdx] = mIdx;
          const childVal = alphaBeta(depth - 1, alpha, beta, nextTurnIdx, ply + 1);
          positions[turnIdx] = moverPos;
          if (childVal < value) value = childVal;
          if (value < beta) beta = value;
          if (alpha >= beta || timeAborted) return;
        }
      };

      const runWalls = () => {
        for (let i = 0; i < candidateWalls.length; i++) {
          const w = candidateWalls[i];
          applyCorsaWallFast(edges, w.r, w.c, w.isHoriz);
          wallsLeft[turnIdx]--;
          const childVal = alphaBeta(depth - 1, alpha, beta, nextTurnIdx, ply + 1);
          wallsLeft[turnIdx]++;
          removeCorsaWallFast(edges, w.r, w.c, w.isHoriz);
          if (childVal < value) value = childVal;
          if (value < beta) beta = value;
          if (alpha >= beta || timeAborted) return;
        }
      };

      if (wallsFirst) {
        runWalls();
        if (alpha < beta && !timeAborted) runPawnMoves();
      } else {
        runPawnMoves();
        if (alpha < beta && !timeAborted) runWalls();
      }

      return value === Infinity ? evaluateState(turnIdx, ply) : value;
    }
  };

  // --- ROOT ACTION GENERATION & SELECTION ---
  const myRootPos = positions[aiIdx];
  const myRootAnalysis = analyzeCorsaPlayerPath(myRootPos, aiPlayerId, edges);
  const rootPawnMoves = getFastCorsaPawnMoves(myRootPos, positions, aiIdx, edges);

  // Immediate winning pawn move check
  for (let i = 0; i < rootPawnMoves.length; i++) {
    const mIdx = rootPawnMoves[i];
    if (myRootAnalysis.dist[mIdx] === 0) {
      return {
        pieceIdx: 0,
        movePos: { r: Math.floor(mIdx / 9), c: mIdx % 9 },
        wallTarget: null,
      };
    }
  }

  rootPawnMoves.sort((a, b) => {
    const da = myRootAnalysis.dist[a];
    const db = myRootAnalysis.dist[b];
    if (da !== db) return da - db;
    return Math.abs((a % 9) - 4) - Math.abs((b % 9) - 4);
  });

  const rawRootWalls = generateCandidateWalls(aiIdx, primaryOppIdx, 16, true);
  // Filter with isValidFugaWall at root to guarantee 100% compatibility with App.tsx execution
  const rootWalls: CorsaCandidateWall[] = [];
  for (let i = 0; i < rawRootWalls.length; i++) {
    const w = rawRootWalls[i];
    const orientation: 'h' | 'v' = w.isHoriz ? 'h' : 'v';
    if (isValidFugaWall({ r: w.r, c: w.c, orientation }, gameState.walls, gameState.players, 'corsa')) {
      rootWalls.push(w);
      if (rootWalls.length >= 12) break;
    }
  }

  // Determine search depth (3 ply standard = AI -> Opp -> AI; 4 ply in critical endgame/close combat)
  const pawnsClose =
    Math.abs(Math.floor(myRootPos / 9) - Math.floor(positions[primaryOppIdx] / 9)) +
      Math.abs((myRootPos % 9) - (positions[primaryOppIdx] % 9)) <=
    2;
  const searchDepth = bestOppDist <= 3 || myRootAnalysis.shortestDist <= 3 || pawnsClose ? 3 : 2; // Note: root is ply 0, so child call with depth=2 searches 3 total plies, depth=3 searches 4 total plies

  let bestScore = -Infinity;
  let bestAction: AIAction | null = null;
  let alpha = -Infinity;
  const beta = Infinity;

  // Evaluate root pawn moves
  for (let i = 0; i < rootPawnMoves.length; i++) {
    const mIdx = rootPawnMoves[i];
    positions[aiIdx] = mIdx;
    const score = alphaBeta(searchDepth, alpha, beta, primaryOppIdx, 1);
    positions[aiIdx] = myRootPos;

    if (score > bestScore || !bestAction) {
      bestScore = score;
      bestAction = {
        pieceIdx: 0,
        movePos: { r: Math.floor(mIdx / 9), c: mIdx % 9 },
        wallTarget: null,
      };
    }
    if (bestScore > alpha) alpha = bestScore;
  }

  // Evaluate root wall placements
  for (let i = 0; i < rootWalls.length; i++) {
    if (timeAborted && i >= 4) break;
    const w = rootWalls[i];
    applyCorsaWallFast(edges, w.r, w.c, w.isHoriz);
    wallsLeft[aiIdx]--;
    const score = alphaBeta(searchDepth, alpha, beta, primaryOppIdx, 1);
    wallsLeft[aiIdx]++;
    removeCorsaWallFast(edges, w.r, w.c, w.isHoriz);

    // Require a small margin (+25) over best pawn move so AI doesn't spend a wall on a pure tie
    if (score > bestScore + 25 || !bestAction) {
      bestScore = score;
      bestAction = {
        pieceIdx: 0,
        movePos: startPos,
        wallTarget: null,
        fugaWallTarget: {
          r: w.r,
          c: w.c,
          orientation: w.isHoriz ? 'h' : 'v',
        },
      };
      if (bestScore > alpha) alpha = bestScore;
    }
  }

  return bestAction;
};

export const getBestMoveForAI = (gameState: GameState, playerId: PlayerId): AIAction | null => {
  // Per Quoridor ('corsa') a livello "Difficile" (estrema), usa il nuovo motore Alpha-Beta dedicato
  if (gameState.gameMode === 'corsa' && gameState.difficulty === 'estrema') {
    const extremeAction = getBestCorsaExtremeMoveForAI(gameState, playerId);
    if (extremeAction) return extremeAction;
  }

  const theme = gameState.boardTheme;
  const currentPlayer = gameState.players.find(p => p.id === playerId)!;
  const opponents = gameState.players.filter(p => p.id !== playerId);
  const territory = calculateTerritory(gameState.walls, gameState.players, theme);
  
  const piecesStatus = currentPlayer.positions.map(pos => territory.territoryMap[`${pos.r},${pos.c}`] === playerId);
  const hasAnyFreePiece = piecesStatus.some(isEnclosed => !isEnclosed);
  const allEnclosed = piecesStatus.every(isEnclosed => isEnclosed);

  const actions: { action: AIAction, score: number, tempWalls: Wall[], simulatedPlayers: Player[] }[] = [];

  currentPlayer.positions.forEach((startPos, pieceIdx) => {
    if (hasAnyFreePiece && piecesStatus[pieceIdx] && !allEnclosed) return;

    const moves = getReachableCells(startPos, gameState.walls, gameState.players, theme.startsWith('amazons') ? Infinity : 2, theme, gameState.gameMode);
    if (!theme.startsWith('amazons') && gameState.gameMode !== 'corsa' && !moves.some(m => m.r === startPos.r && m.c === startPos.c)) moves.push(startPos);

    if (gameState.gameMode === 'corsa') {
       // In corsa mode, action is EITHER move OR wall
       // Evaluate moves (with no walls attached)
       moves.forEach(movePos => {
           const simulatedPlayers = gameState.players.map(p => {
               if (p.id === playerId) {
                   const newPos = [...p.positions];
                   newPos[pieceIdx] = movePos;
                   return { ...p, positions: newPos };
               }
               return p;
           });
           const simulatedGameState = { ...gameState, players: simulatedPlayers };
           const score = evaluateBoardState(simulatedGameState, gameState.walls, playerId, opponents, gameState.difficulty);
           actions.push({ action: { pieceIdx, movePos, wallTarget: null }, score, tempWalls: gameState.walls, simulatedPlayers });
       });

       // Evaluate wall placements (with no move attached)
       if ((currentPlayer.wallsLeft || 0) > 0) {
           // Sia "Semplice" (normale = ex-Medio) sia "Medio" (difficile = ex-Difficile) usano il calcolo della distanza reale
           const closestOpponents = opponents.map(opp => {
               let minPath = Infinity;
               opp.positions.forEach(pos => {
                   const maps = getDistancesMap(pos, gameState.walls, theme);
                   for (let i=0; i<9; i++) {
                       const goalP = opp.id === 1 ? {r:0,c:i} : opp.id === 2 ? {r:8,c:i} : opp.id === 3 ? {r:i,c:8} : {r:i,c:0};
                       if (maps[goalP.r]) minPath = Math.min(minPath, maps[goalP.r][goalP.c]);
                   }
               });
               return { opp, pathLen: minPath };
           }).sort((a, b) => a.pathLen - b.pathLen).map(x => x.opp);

           // Evaluate ALL Fuga Fuga walls
           const validSampleWalls: { r: number, c: number, orientation: 'h'|'v' }[] = [];
           
           for (let r = 0; r < 8; r++) {
               for (let c = 0; c < 8; c++) {
                   if (isValidFugaWall({r, c, orientation: 'h'}, gameState.walls, gameState.players, theme)) {
                       validSampleWalls.push({r, c, orientation: 'h'});
                   }
                   if (isValidFugaWall({r, c, orientation: 'v'}, gameState.walls, gameState.players, theme)) {
                       validSampleWalls.push({r, c, orientation: 'v'});
                   }
               }
           }
           
           validSampleWalls.forEach(wallTarget => {
               const { r, c, orientation } = wallTarget;
               let w1Id, w2Id;
               if (orientation === 'h') {
                 w1Id = serializeWall(r, c, r+1, c);
                 w2Id = serializeWall(r, c+1, r+1, c+1);
               } else {
                 w1Id = serializeWall(r, c, r, c+1);
                 w2Id = serializeWall(r+1, c, r+1, c+1);
               }
               const tempWalls = [...gameState.walls, { id: w1Id, ownerId: playerId }, { id: w2Id, ownerId: playerId }];
               const simulatedPlayers = gameState.players.map(p => p.id === playerId ? { ...p, wallsLeft: (p.wallsLeft || 0) - 1 } : p);
               const simulatedGameState = { ...gameState, players: simulatedPlayers };
               const score = evaluateBoardState(simulatedGameState, tempWalls, playerId, opponents, gameState.difficulty);
               
               // Pass movePos as startPos representing returning "no move"
               actions.push({ action: { pieceIdx, movePos: startPos, wallTarget: null, fugaWallTarget: wallTarget }, score, tempWalls, simulatedPlayers });
           });
       }
    } else {
      moves.forEach(movePos => {
        const isTurnZero = gameState.turnCount === 0;

        const simulatedPlayers = gameState.players.map(p => {
            if (p.id === playerId) {
                const newPos = [...p.positions];
                newPos[pieceIdx] = movePos;
                return { ...p, positions: newPos };
            }
            return p;
        });

        const wallOptions = (isTurnZero && !theme.startsWith('amazons')) ? [null] : getWallOptions(movePos, gameState.walls, theme, simulatedPlayers, gameState.gameMode);
        
        wallOptions.forEach(wallTarget => {
          let tempWalls = [...gameState.walls];
          if (wallTarget && !theme.startsWith('amazons')) {
              const tempWallId = serializeWall(movePos.r, movePos.c, wallTarget.r, wallTarget.c);
              tempWalls.push({ id: tempWallId, ownerId: playerId });
          } else if (wallTarget && theme.startsWith('amazons')) {
              tempWalls.push({ id: `${wallTarget.r},${wallTarget.c}`, ownerId: playerId });
          }

          const simulatedGameState = { ...gameState, players: simulatedPlayers };

          const score = evaluateBoardState(simulatedGameState, tempWalls, playerId, opponents, gameState.difficulty);
          actions.push({ action: { pieceIdx, movePos, wallTarget }, score, tempWalls, simulatedPlayers });
        });
      });
    }
  });

  if (actions.length === 0) return null;

  actions.sort((a, b) => b.score - a.score);

  const isNormale = gameState.difficulty === 'normale';
  const isEstrema = gameState.difficulty === 'estrema';
  // Per Quoridor ('corsa'): "Medio" (difficile) usa i parametri dell'ex-Difficile (estrema), "Semplice" (normale) usa i parametri dell'ex-Medio (difficile)
  const isCorsaExEstrema = gameState.gameMode === 'corsa' && gameState.difficulty === 'difficile';
  let TOP_N = isEstrema ? 16 : (gameState.boardTheme.startsWith('amazons') ? 4 : 10);
  if (isNormale) TOP_N = 2; // Introduce minimal lookahead for Semplice
  if (gameState.gameMode === 'corsa') {
    TOP_N = isCorsaExEstrema ? 20 : 12;
  }
  
  const topActions = actions.slice(0, TOP_N);
  
  let bestMinimaxScore = -Infinity;
  let bestAction: AIAction | null = null;

  const nextPlayer = opponents[0]; // Assume 1v1 or prioritize first opponent

  for (const { action, score, tempWalls, simulatedPlayers } of topActions) {
    let minScoreForUs = Infinity;
    let hasOpponentMoves = false;
    
    // Quick exit if AI is winning immediately
    if (score > 900000) {
       return action;
    }

    const oppTerritory = calculateTerritory(tempWalls, simulatedPlayers, theme);
    const oppPiecesStatus = nextPlayer.positions.map(pos => oppTerritory.territoryMap[`${pos.r},${pos.c}`] === nextPlayer.id);
    const oppHasAnyFreePiece = oppPiecesStatus.some(isEnclosed => !isEnclosed);
    const oppAllEnclosed = oppPiecesStatus.every(isEnclosed => isEnclosed);

    let oppEvalsCount = 0;
    let MAX_OPP_EVALS = isEstrema ? (theme.startsWith('amazons') ? 400 : 800) : (theme.startsWith('amazons') ? 80 : 300);
    if (isNormale) MAX_OPP_EVALS = theme.startsWith('amazons') ? 10 : 30; // Very fast evaluation for Semplice
    if (gameState.gameMode === 'corsa') {
      MAX_OPP_EVALS = isCorsaExEstrema ? 800 : 300;
    }

    // To prevent freezing, we shuffle pieces and moves and break early once MAX_OPP_EVALS is reached
    const pieceIndices = nextPlayer.positions.map((_, i) => i).sort(() => Math.random() - 0.5);

    for (const oppPieceIdx of pieceIndices) {
      if (oppEvalsCount >= MAX_OPP_EVALS) break;
      const oppStartPos = nextPlayer.positions[oppPieceIdx];
      if (oppHasAnyFreePiece && oppPiecesStatus[oppPieceIdx] && !oppAllEnclosed) continue;

      let oppMoves = getReachableCells(oppStartPos, tempWalls, simulatedPlayers, theme.startsWith('amazons') ? Infinity : 2, theme, gameState.gameMode);
      if (!theme.startsWith('amazons') && gameState.gameMode !== 'corsa' && !oppMoves.some(m => m.r === oppStartPos.r && m.c === oppStartPos.c)) oppMoves.push(oppStartPos);

      // Sort opponent moves to try to find good ones early, or just shuffle
      oppMoves = oppMoves.sort(() => Math.random() - 0.5);

      for (const oppMovePos of oppMoves) {
        if (oppEvalsCount >= MAX_OPP_EVALS) break;
        const oppSimulatedPlayers = simulatedPlayers.map(p => {
            if (p.id === nextPlayer.id) {
                const newPos = [...p.positions];
                newPos[oppPieceIdx] = oppMovePos;
                return { ...p, positions: newPos };
            }
            return p;
        });

        if (gameState.gameMode === 'corsa') {
            hasOpponentMoves = true;
            const oppSimulatedGameStateMove = { ...gameState, players: oppSimulatedPlayers };
            const scoreAfterOpponentMove = evaluateBoardState(oppSimulatedGameStateMove, tempWalls, playerId, opponents, gameState.difficulty);
            if (scoreAfterOpponentMove < minScoreForUs) minScoreForUs = scoreAfterOpponentMove;
            oppEvalsCount++;

            const oppWallsLeft = nextPlayer.wallsLeft || 0;
            if (oppWallsLeft > 0 && oppEvalsCount < MAX_OPP_EVALS) {
                const myPlayer = simulatedPlayers.find(p => p.id === playerId);
                const startPos = (myPlayer && myPlayer.positions.length > 0) ? myPlayer.positions[0] : { r: 4, c: 4 };
                const validOppSampleWalls: { r: number, c: number, orientation: 'h'|'v', dist: number }[] = [];
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        const dist = Math.abs(r - startPos.r) + Math.abs(c - startPos.c);
                        // Per migliorare le performance nel minimax, filtriamo i muri troppo lontani (tranne alcuni random per variazione)
                        if (dist > 4 && Math.random() > (isCorsaExEstrema ? 0.4 : 0.2)) continue;
                        
                        if (isValidFugaWall({r, c, orientation: 'h'}, tempWalls, oppSimulatedPlayers, theme)) validOppSampleWalls.push({r, c, orientation: 'h', dist});
                        if (isValidFugaWall({r, c, orientation: 'v'}, tempWalls, oppSimulatedPlayers, theme)) validOppSampleWalls.push({r, c, orientation: 'v', dist});
                    }
                }
                
                validOppSampleWalls.sort((a,b) => a.dist - b.dist);
                const bestOppWalls = validOppSampleWalls.slice(0, isCorsaExEstrema ? 16 : 8);

                for (const wallTarget of bestOppWalls) {
                    if (oppEvalsCount >= MAX_OPP_EVALS) break;
                    const { r, c, orientation } = wallTarget;
                    let w1Id, w2Id;
                    if (orientation === 'h') {
                      w1Id = serializeWall(r, c, r+1, c);
                      w2Id = serializeWall(r, c+1, r+1, c+1);
                    } else {
                      w1Id = serializeWall(r, c, r, c+1);
                      w2Id = serializeWall(r+1, c, r+1, c+1);
                    }
                    const oppTempWalls = [...tempWalls, { id: w1Id, ownerId: nextPlayer.id }, { id: w2Id, ownerId: nextPlayer.id }];
                    const oppSimulatedPlayersWithWall = simulatedPlayers.map(p => p.id === nextPlayer.id ? { ...p, wallsLeft: oppWallsLeft - 1 } : p);
                    const scoreAfterOpponentWall = evaluateBoardState({ ...gameState, players: oppSimulatedPlayersWithWall }, oppTempWalls, playerId, opponents, gameState.difficulty);
                    if (scoreAfterOpponentWall < minScoreForUs) minScoreForUs = scoreAfterOpponentWall;
                    oppEvalsCount++;
                }
            }
        } else {
            let oppWallOptions = getWallOptions(oppMovePos, tempWalls, theme, oppSimulatedPlayers, gameState.gameMode);
            
            if (oppWallOptions.length === 0) {
                hasOpponentMoves = true;
                const oppSimulatedGameState = { ...gameState, players: oppSimulatedPlayers };
                const scoreAfterOpponent = evaluateBoardState(oppSimulatedGameState, tempWalls, playerId, opponents, gameState.difficulty);
                if (scoreAfterOpponent < minScoreForUs) minScoreForUs = scoreAfterOpponent;
                oppEvalsCount++;
                continue;
            }

            if (oppWallOptions.length > 5) {
                 oppWallOptions = oppWallOptions.sort(() => Math.random() - 0.5).slice(0, isEstrema ? 20 : 8);
            }

            for (const oppWallTarget of oppWallOptions) {
              if (oppEvalsCount >= MAX_OPP_EVALS) break;
              hasOpponentMoves = true;
              let oppTempWalls = [...tempWalls];
              if (!theme.startsWith('amazons')) {
                  const oppTempWallId = serializeWall(oppMovePos.r, oppMovePos.c, oppWallTarget.r, oppWallTarget.c);
                  oppTempWalls.push({ id: oppTempWallId, ownerId: nextPlayer.id });
              } else {
                  oppTempWalls.push({ id: `${oppWallTarget.r},${oppWallTarget.c}`, ownerId: nextPlayer.id });
              }

              const oppSimulatedGameState = { ...gameState, players: oppSimulatedPlayers };
              const scoreAfterOpponent = evaluateBoardState(oppSimulatedGameState, oppTempWalls, playerId, opponents, gameState.difficulty);
              if (scoreAfterOpponent < minScoreForUs) minScoreForUs = scoreAfterOpponent;
              oppEvalsCount++;
            }
        }
      }
    }

    if (!hasOpponentMoves) {
      minScoreForUs = score;
    }

    if (minScoreForUs > bestMinimaxScore) {
      bestMinimaxScore = minScoreForUs;
      bestAction = action;
    }
  }

  return bestAction || actions[0].action;
};

export const getBestWallForAI = (gameState: GameState, playerId: PlayerId): Point | null => {
  if (gameState.selectedPieceIndex === null) return null;
  const theme = gameState.boardTheme;
  const currentPlayer = gameState.players.find(p => p.id === playerId)!;
  const currentPos = currentPlayer.positions[gameState.selectedPieceIndex];
  const opponents = gameState.players.filter(p => p.id !== playerId);

  let bestScore = -Infinity;
  let bestWall: Point | null = null;
  const wallOptions = getWallOptions(currentPos, gameState.walls, theme, [], gameState.gameMode);
  
  wallOptions.forEach(wallTarget => {
    const tempWallId = serializeWall(currentPos.r, currentPos.c, wallTarget.r, wallTarget.c);
    const tempWalls = [...gameState.walls, { id: tempWallId, ownerId: playerId }];
    const score = evaluateBoardState(gameState, tempWalls, playerId, opponents, gameState.difficulty);
    if (score > bestScore) {
      bestScore = score;
      bestWall = wallTarget;
    }
  });

  return bestWall || (wallOptions.length > 0 ? wallOptions[0] : null);
};

export const getBestSetupForAI = (gameState: GameState): Point => {
    const theme = gameState.boardTheme;
    const difficulty = gameState.difficulty;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (theme === 'hex') {
        const myPosSet = new Set<string>();
        const oppPosSet = new Set<string>();
        gameState.players.forEach(p => {
            p.positions.forEach(pos => {
                if (p.id === currentPlayer.id) myPosSet.add(`${pos.r},${pos.c}`);
                else oppPosSet.add(`${pos.r},${pos.c}`);
            });
        });

        const isP1 = currentPlayer.id === 1;

        const computeHexDist = (mySet: Set<string>, oppSet: Set<string>, checkP1: boolean): number => {
            const dist = new Int16Array(121);
            dist.fill(1000);
            
            const pools: number[][] = Array.from({length: 121}, () => []);
            
            for (let idx = 0; idx < 11; idx++) {
                const r = checkP1 ? idx : 0;
                const c = checkP1 ? 0 : idx;
                const key = `${r},${c}`;
                if (oppSet.has(key)) continue;
                const d = mySet.has(key) ? 0 : 1;
                const flatIdx = r * 11 + c;
                dist[flatIdx] = d;
                pools[d].push(flatIdx);
            }

            for (let d = 0; d < pools.length; d++) {
                const q = pools[d];
                if (!q) continue;
                for (let i = 0; i < q.length; i++) {
                    const flatIdx = q[i];
                    if (dist[flatIdx] < d) continue;
                    
                    const r = Math.floor(flatIdx / 11);
                    const c = flatIdx % 11;
                    
                    if (checkP1 && c === 10) return d;
                    if (!checkP1 && r === 10) return d;

                    const nrArr = [r - 1, r, r + 1, r + 1, r, r - 1];
                    const ncArr = [c, c - 1, c - 1, c, c + 1, c + 1];
                    
                    for (let j = 0; j < 6; j++) {
                        const nr = nrArr[j];
                        const nc = ncArr[j];
                        if (nr >= 0 && nc >= 0 && nr < 11 && nc < 11) {
                            const nKey = `${nr},${nc}`;
                            if (oppSet.has(nKey)) continue;
                            const nd = d + (mySet.has(nKey) ? 0 : 1);
                            const nFlat = nr * 11 + nc;
                            if (nd < dist[nFlat]) {
                                dist[nFlat] = nd;
                                pools[nd].push(nFlat);
                            }
                        }
                    }
                }
            }
            return 1000;
        };

        const getHexShortestPath = (mySet: Set<string>, oppSet: Set<string>, checkP1: boolean): Set<number> => {
            const dist = new Int16Array(121);
            dist.fill(1000);
            const parent = new Int16Array(121);
            parent.fill(-1);
            const pools: number[][] = Array.from({length: 121}, () => []);
            
            for (let idx = 0; idx < 11; idx++) {
                const r = checkP1 ? idx : 0;
                const c = checkP1 ? 0 : idx;
                const key = `${r},${c}`;
                if (oppSet.has(key)) continue;
                const d = mySet.has(key) ? 0 : 1;
                const flatIdx = r * 11 + c;
                dist[flatIdx] = d;
                pools[d].push(flatIdx);
            }

            let endIdx = -1;

            for (let d = 0; d < pools.length; d++) {
                const q = pools[d];
                if (!q) continue;
                for (let i = 0; i < q.length; i++) {
                    const flatIdx = q[i];
                    if (dist[flatIdx] < d) continue;
                    
                    const r = Math.floor(flatIdx / 11);
                    const c = flatIdx % 11;
                    
                    if (checkP1 && c === 10) { endIdx = flatIdx; break; }
                    if (!checkP1 && r === 10) { endIdx = flatIdx; break; }

                    const nrArr = [r - 1, r, r + 1, r + 1, r, r - 1];
                    const ncArr = [c, c - 1, c - 1, c, c + 1, c + 1];
                    
                    for (let j = 0; j < 6; j++) {
                        const nr = nrArr[j];
                        const nc = ncArr[j];
                        if (nr >= 0 && nc >= 0 && nr < 11 && nc < 11) {
                            const nKey = `${nr},${nc}`;
                            if (oppSet.has(nKey)) continue;
                            const nd = d + (mySet.has(nKey) ? 0 : 1);
                            const nFlat = nr * 11 + nc;
                            if (nd < dist[nFlat]) {
                                dist[nFlat] = nd;
                                parent[nFlat] = flatIdx;
                                pools[nd].push(nFlat);
                            }
                        }
                    }
                }
                if (endIdx !== -1) break;
            }

            const path = new Set<number>();
            let curr = endIdx;
            while (curr !== -1) {
                path.add(curr);
                curr = parent[curr];
            }
            return path;
        };

        const evaluateMove = (myDist: number, oppDist: number, r: number, c: number, baselineMy: number, baselineOpp: number, diff: Difficulty, isMyPath: boolean, isOppPath: boolean): number => {
            const savesGame = (baselineOpp === 1 && oppDist > 1);
            let score = 0;
            if (savesGame) score += 10000;
            
            if (diff !== 'normale') {
               if (baselineOpp === 2 && oppDist > 2) score += 500;
               if (baselineOpp === 3 && oppDist > 3 && diff === 'estrema') score += 200;
            }

            const distToCenter = Math.abs(r - 5) + Math.abs(c - 5);
            
            let attackWeight = 100;
            let defenseWeight = 100;
            
            if (diff === 'estrema') {
                if (baselineMy <= baselineOpp) { attackWeight = 150; defenseWeight = 120; }
                else { defenseWeight = 160; attackWeight = 100; }
            } else if (diff === 'difficile') {
                if (baselineMy < baselineOpp) { attackWeight = 130; defenseWeight = 110; }
                else { defenseWeight = 140; attackWeight = 110; }
            } else {
                if (baselineOpp <= 3) { defenseWeight = 120; attackWeight = 80; }
            }
            
            score += -myDist * attackWeight + oppDist * defenseWeight;
            score += (10 - distToCenter) * 2;
            
            // Grand bonus if we block their shortest path or advance our own
            if (diff !== 'normale') {
               if (isOppPath) score += 250; // Highly value blocking opponent's current path!
               if (isMyPath) score += 100;  // Also value completing our shortest path
            }

            if (diff === 'normale') score += Math.random() * 5;
            else if (diff === 'difficile') score += Math.random() * 1;
            else score += Math.random() * 0.1; // tiny random for breaking equal scores

            return score;
        };

        let baselineMyDist = computeHexDist(myPosSet, oppPosSet, isP1);
        let baselineOppDist = computeHexDist(oppPosSet, myPosSet, !isP1);
        
        const myShortestPath = getHexShortestPath(myPosSet, oppPosSet, isP1);
        const oppShortestPath = getHexShortestPath(oppPosSet, myPosSet, !isP1);

        interface HexCandidate { r: number, c: number, score: number, myDist: number, oppDist: number }
        const candidates: HexCandidate[] = [];

        for (let r = 0; r < 11; r++) {
            for (let c = 0; c < 11; c++) {
                const key = `${r},${c}`;
                if (myPosSet.has(key) || oppPosSet.has(key)) continue;

                myPosSet.add(key);
                const myDist = computeHexDist(myPosSet, oppPosSet, isP1);
                myPosSet.delete(key);

                oppPosSet.add(key);
                const oppDist = computeHexDist(oppPosSet, myPosSet, !isP1);
                oppPosSet.delete(key);

                if (myDist === 0) return { r, c }; // Immediate win

                const flatIdx = r * 11 + c;
                const isMyPath = myShortestPath.has(flatIdx);
                const isOppPath = oppShortestPath.has(flatIdx);

                let score = evaluateMove(myDist, oppDist, r, c, baselineMyDist, baselineOppDist, difficulty, isMyPath, isOppPath);
                candidates.push({ r, c, score, myDist, oppDist });
            }
        }

        candidates.sort((a, b) => b.score - a.score);
        
        if (candidates.length === 0) return { r: 5, c: 5 };

        let topN = 3; // 'normale'
        if (difficulty === 'estrema') topN = 12;
        else if (difficulty === 'difficile') topN = 6;

        let bestMinimaxScore = -Infinity;
        let bestMinimaxPos: Point | null = null;

        for (let i = 0; i < Math.min(topN, candidates.length); i++) {
            const cand = candidates[i];
            if (candidates[0].score >= 9000 && cand.score < 9000) continue; // Only evaluate game-savers if any

            const candKey = `${cand.r},${cand.c}`;
            myPosSet.add(candKey);
            
            let minScoreAfterOpp = Infinity;
            
            for (let oppR = 0; oppR < 11; oppR++) {
                for (let oppC = 0; oppC < 11; oppC++) {
                    const oppKey = `${oppR},${oppC}`;
                    if (myPosSet.has(oppKey) || oppPosSet.has(oppKey)) continue;

                    oppPosSet.add(oppKey);
                    
                    const postOppMyDist = computeHexDist(myPosSet, oppPosSet, isP1);
                    const postOppOppDist = computeHexDist(oppPosSet, myPosSet, !isP1);
                    
                    if (postOppOppDist === 0) {
                        minScoreAfterOpp = -1000000;
                        oppPosSet.delete(oppKey);
                        break;
                    }
                    
                    const flatIdxC = cand.r * 11 + cand.c;
                    const isMyPathC = myShortestPath.has(flatIdxC);
                    const isOppPathC = oppShortestPath.has(flatIdxC);

                    let boardScore = evaluateMove(postOppMyDist, postOppOppDist, cand.r, cand.c, baselineMyDist, postOppOppDist, difficulty, isMyPathC, isOppPathC);
                    
                    if (boardScore < minScoreAfterOpp) minScoreAfterOpp = boardScore;

                    oppPosSet.delete(oppKey);
                }
                if (minScoreAfterOpp === -1000000) break;
            }
            
            myPosSet.delete(candKey);
            
            if (minScoreAfterOpp > bestMinimaxScore) {
                bestMinimaxScore = minScoreAfterOpp;
                bestMinimaxPos = { r: cand.r, c: cand.c };
            }
        }
        
        return bestMinimaxPos || { r: candidates[0].r, c: candidates[0].c };
    }

    let bestPos: Point | null = null;
    let bestScore = -Infinity;

    let centerR = 3;
    let centerC = 3;
    if (theme === 'hourglass') { centerR = 4; centerC = 3; }
    else if (theme === 'bridge') { centerR = 3.5; centerC = 3.5; }
    else if (theme === 'hammer') { centerR = 5; centerC = 3; }
    else if (theme === 'arena') { centerR = 4; centerC = 4; }
    else if (theme === 'desert') { centerR = 4; centerC = 4.5; }
    else if (theme === 'pente') { centerR = 7; centerC = 7; }

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!isValidCell(r, c, theme)) continue;

            const isOccupied = gameState.players.some(p => p.positions.some(pos => pos.r === r && pos.c === c));
            if (isOccupied) continue;

            if (bestPos === null) {
                bestPos = { r, c };
            }

            let minOppDist = Infinity;
            let minOwnDist = Infinity;

            gameState.players.forEach(p => {
                const isOwn = p.id === currentPlayer.id;
                p.positions.forEach(pos => {
                    const dist = Math.abs(pos.r - r) + Math.abs(pos.c - c);
                    if (isOwn) {
                        if (dist < minOwnDist) minOwnDist = dist;
                    } else {
                        if (dist < minOppDist) minOppDist = dist;
                    }
                });
            });

            const distToCenter = Math.abs(r - centerR) + Math.abs(c - centerC);
            let score = 0;

            if (difficulty === 'normale') {
                score = -(distToCenter * 2);
                if (minOppDist < 2) score -= 50;
                score += Math.random() * 10;
            } else if (difficulty === 'difficile') {
                score = -(distToCenter * 3);
                if (minOppDist < 2) score -= 100;
                if (minOppDist >= 3 && minOppDist <= 5) score += 30;
                if (minOwnDist < 3) score -= 50;
            } else {
                // 'estrema' (Dango)
                score -= distToCenter * 5;
                
                if (minOppDist < 2) score -= 200;
                if (minOppDist === 2 || minOppDist === 3) score += 50;
                
                if (minOwnDist < 3) score -= 150;
                if (minOwnDist >= 4) score += 40;

                let validNeighbors = 0;
                const neighbors = getNeighbors(r, c, theme);
                for (const [nr, nc] of neighbors) {
                    if (isValidCell(nr, nc, theme)) validNeighbors++;
                }
                score += validNeighbors * 10;
                
                score += Math.random() * 5;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestPos = { r, c };
            }
        }
    }
    return bestPos || { r: 0, c: 0 };
};

export interface BreakAction {
  pieceIdx: number;
  r: number;
  c: number;
  side: 'top' | 'bottom' | 'left' | 'right' | 'hex'; 
}

export const getBestBreakForAI = (gameState: GameState, playerId: PlayerId): BreakAction | null => {
  const theme = gameState.boardTheme;
  const currentPlayer = gameState.players.find(p => p.id === playerId)!;
  if (!currentPlayer.hasWallbreaker) return null;

  const opponents = gameState.players.filter(p => p.id !== playerId);
  const currentTerritory = calculateTerritory(gameState.walls, gameState.players, theme);
  
  let bestScore = -Infinity;
  let bestBreak: BreakAction | null = null;

  currentPlayer.positions.forEach((p, pieceIdx) => {
    const neighborsPoints = getNeighbors(p.r, p.c, theme);
    
    neighborsPoints.forEach(([nr, nc]) => {
      if (isValidCell(nr, nc, theme)) {
        if (getWallBetween(gameState.walls, p.r, p.c, nr, nc)) {
          const tempWalls = removeWall(gameState.walls, p.r, p.c, nr, nc);
          const simulatedScore = evaluateBoardState(gameState, tempWalls, playerId, opponents, gameState.difficulty);
          
          const currentReachable = getReachableCells(p, gameState.walls, gameState.players, 4, theme, gameState.gameMode).length;
          const afterReachable = getReachableCells(p, tempWalls, gameState.players, 4, theme, gameState.gameMode).length;
          const expansionValue = (afterReachable - currentReachable) * 5000;

          // Approx grid size 49
          const isEnclosedInSmallArea = currentTerritory.enclosed[playerId] && currentTerritory.scores[playerId] < (49 / 2);
          const urgencyBonus = isEnclosedInSmallArea ? 2000000 : 0;

          const finalScore = simulatedScore + expansionValue + urgencyBonus;

          if (finalScore > bestScore) {
            bestScore = finalScore;
            // Note: side is generic here as break function handles coords directly in App
            bestBreak = { pieceIdx, r: p.r, c: p.c, side: 'top' }; // Side is placeholder, logic uses coords
          }
        }
      }
    });
  });

  return bestBreak;
};

export const getBestDomineeringMoveForAI = (gameState: GameState, playerId: PlayerId, difficulty: Difficulty): { r: number, c: number, r2: number, c2: number } | null => {
  const isV = playerId === 1;
  const oppId = playerId === 1 ? 2 : 1;
  const isOppV = oppId === 1;
  
  const occupied = new Set<string>();
  gameState.players.forEach(p => p.positions.forEach(pos => occupied.add(`${pos.r},${pos.c}`)));
  
  const getMoves = (isVertical: boolean, currentOccupied: Set<string>) => {
    const m: {r: number, c: number, r2: number, c2: number}[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const r2 = isVertical ? r + 1 : r;
        const c2 = isVertical ? c : c + 1;
        if (r2 < 8 && c2 < 8) {
          if (!currentOccupied.has(`${r},${c}`) && !currentOccupied.has(`${r2},${c2}`)) {
            m.push({r, c, r2, c2});
          }
        }
      }
    }
    return m;
  };

  const possibleMoves = getMoves(isV, occupied);
  if (possibleMoves.length === 0) return null;

  if (Math.random() < (difficulty === 'normale' ? 0.3 : difficulty === 'difficile' ? 0.1 : 0)) {
     return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  }

  let bestMove = possibleMoves[0];
  let bestScore = -Infinity;

  possibleMoves.forEach(move => {
    // Simulate move
    const newOccupied = new Set(occupied);
    newOccupied.add(`${move.r},${move.c}`);
    newOccupied.add(`${move.r2},${move.c2}`);
    
    let score = 0;
    
    const myNextMoves = getMoves(isV, newOccupied).length;
    const oppMoves = getMoves(isOppV, newOccupied).length;
    
    score = myNextMoves - oppMoves;

    // Aggiungiamo un po' di disturbo per evitare giocate identiche se i punteggi sono uguali
    score += Math.random() * 0.1;

    // Per livelli più difficili controlliamo anche se stacchiamo l'avversario
    if (difficulty === 'estrema' || difficulty === 'difficile') {
       if (oppMoves === 0) score += 1000; // Vincita
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  });

  return bestMove;
};

export const getBestOrbitoMoveForAI = (gameState: GameState, difficulty: Difficulty): { shift?: { pId: number, idx: number, dr: number, dc: number }, place: { r: number, c: number } } => {
    let workingPlayers = JSON.parse(JSON.stringify(gameState.players || []));
    const myId = gameState.currentPlayerIndex + 1;
    
    // Possibili Shifts
    const possibleShifts: {pId: number, idx: number, dr: number, dc: number}[] = [];
    workingPlayers.forEach((opp: Player) => {
        if (opp.id === myId) return;
        opp.positions.forEach((pos: any, idx: number) => {
            const neighbors = [
                {r: pos.r - 1, c: pos.c}, {r: pos.r + 1, c: pos.c},
                {r: pos.r, c: pos.c - 1}, {r: pos.r, c: pos.c + 1}
            ];
            neighbors.forEach(n => {
                if (n.r >= 0 && n.r < 4 && n.c >= 0 && n.c < 4) {
                    const isOccupied = workingPlayers.some((pl: Player) => pl.positions.some((pos2: any) => pos2.r === n.r && pos2.c === n.c));
                    if (!isOccupied) possibleShifts.push({pId: opp.id, idx, dr: n.r, dc: n.c});
                }
            });
        });
    });

    // Empty spots for placement
    const emptySpots: {r: number, c: number}[] = [];
    for (let i = 0; i < 16; i++) {
        const r = Math.floor(i / 4);
        const c = i % 4;
        if (!workingPlayers.some((pl: Player) => pl.positions.some((pos: any) => pos.r === r && pos.c === c))) {
            emptySpots.push({r, c});
        }
    }

    const isRandom = difficulty === 'normale' ? (Math.random() < 0.2) : (difficulty === 'difficile' ? (Math.random() < 0.05) : false);

    if (isRandom) {
        let shift;
        if (possibleShifts.length > 0 && Math.random() < 0.5) {
            shift = possibleShifts[Math.floor(Math.random() * possibleShifts.length)];
        }
        let place = {r:0, c:0};
        if (emptySpots.length > 0) place = emptySpots[Math.floor(Math.random() * emptySpots.length)];
        return { shift, place };
    }

    const checkWin = (players: Player[], pId: number) => {
        const p = players.find(x => x.id === pId);
        if(!p) return false;
        const grid = Array(4).fill(null).map(() => Array(4).fill(false));
        p.positions.forEach((pos: any) => {
            if (pos.r >= 0 && pos.r < 4 && pos.c >= 0 && pos.c < 4) grid[pos.r][pos.c] = true;
        });

        for (let r = 0; r < 4; r++) {
            if (grid[r][0] && grid[r][1] && grid[r][2] && grid[r][3]) return true;
        }
        for (let c = 0; c < 4; c++) {
            if (grid[0][c] && grid[1][c] && grid[2][c] && grid[3][c]) return true;
        }
        if (grid[0][0] && grid[1][1] && grid[2][2] && grid[3][3]) return true;
        if (grid[0][3] && grid[1][2] && grid[2][1] && grid[3][0]) return true;
        return false;
    };

    const rotateBoard = (players: Player[]) => {
        players.forEach((pl: Player) => {
            pl.positions.forEach((pos: any) => {
                const i = pos.r * 4 + pos.c;
                let nextI = i;
                if (i === 0) nextI = 4;
                else if (i === 4) nextI = 8;
                else if (i === 8) nextI = 12;
                else if (i === 12) nextI = 13;
                else if (i === 13) nextI = 14;
                else if (i === 14) nextI = 15;
                else if (i === 15) nextI = 11;
                else if (i === 11) nextI = 7;
                else if (i === 7) nextI = 3;
                else if (i === 3) nextI = 2;
                else if (i === 2) nextI = 1;
                else if (i === 1) nextI = 0;
                else if (i === 5) nextI = 9;
                else if (i === 9) nextI = 10;
                else if (i === 10) nextI = 6;
                else if (i === 6) nextI = 5;
                pos.r = Math.floor(nextI / 4);
                pos.c = nextI % 4;
            });
        });
    };

    let bestScore = -Infinity;
    let bestMoves: { shift?: any, place: any }[] = [];

    const evaluateGrid = (players: Player[], pId: number) => {
        let score = 0;
        const grid = Array(4).fill(null).map(() => Array(4).fill(0)); // 0: empty, 1: me, -1: opp
        players.forEach(pl => {
            pl.positions.forEach((pos: any) => {
                if (pos.r >= 0 && pos.r < 4 && pos.c >= 0 && pos.c < 4) {
                    grid[pos.r][pos.c] = pl.id === pId ? 1 : -1;
                }
            });
        });

        // Evaluate lines implicitly by favoring center and connectivity
        for(let r=0; r<4; r++) {
            for(let c=0; c<4; c++) {
                if(grid[r][c] === 1) {
                    if ((r === 1 || r === 2) && (c === 1 || c === 2)) score += 3; // Center
                    else score += 1;
                } else if(grid[r][c] === -1) {
                    if ((r === 1 || r === 2) && (c === 1 || c === 2)) score -= 3;
                    else score -= 1;
                }
            }
        }
        
        // Count aligned pieces
        const evaluateLine = (line: number[]) => {
            let myCount = line.filter(v => v === 1).length;
            let oppCount = line.filter(v => v === -1).length;
            if (myCount > 0 && oppCount === 0) {
                if (myCount === 2) score += 5;
                if (myCount === 3) score += 20;
            } else if (oppCount > 0 && myCount === 0) {
                if (oppCount === 2) score -= 5;
                if (oppCount === 3) score -= 30; // Block opponent 3 in a row heavily
            }
        };

        for(let r=0; r<4; r++) evaluateLine([grid[r][0], grid[r][1], grid[r][2], grid[r][3]]);
        for(let c=0; c<4; c++) evaluateLine([grid[0][c], grid[1][c], grid[2][c], grid[3][c]]);
        evaluateLine([grid[0][0], grid[1][1], grid[2][2], grid[3][3]]);
        evaluateLine([grid[0][3], grid[1][2], grid[2][1], grid[3][0]]);

        return score;
    };

    // Evaluate all moves
    // 1. Shifts: we can optionally shift
    const shiftsToConsider: any[] = [undefined, ...possibleShifts];
    
    for(const shift of shiftsToConsider) {
        for(const place of emptySpots) {
            // Apply Shift
            if (shift) {
                // If the shift target is exactly where we intend to place, skip because it's occupied!
                if(shift.dr === place.r && shift.dc === place.c) continue;
            }

            let simPlayers = JSON.parse(JSON.stringify(workingPlayers));
            
            if (shift) {
                const oppPlayer = simPlayers.find((pl: Player) => pl.id === shift.pId);
                if (oppPlayer && oppPlayer.positions[shift.idx]) {
                    oppPlayer.positions[shift.idx].r = shift.dr;
                    oppPlayer.positions[shift.idx].c = shift.dc;
                }
            }

            const me = simPlayers.find((pl: Player) => pl.id === myId);
            if(me) {
                me.positions.push({r: place.r, c: place.c, id: 'temp'});
            }

            rotateBoard(simPlayers);

            const iWin = checkWin(simPlayers, myId);
            const oppWin = simPlayers.filter((p: Player) => p.id !== myId).some((p: Player) => checkWin(simPlayers, p.id));

            let score = 0;
            if (iWin) {
                score = 10000;
            } else if (oppWin) {
                score = -10000; // Doing this results in losing
            } else {
                score = evaluateGrid(simPlayers, myId);
            }

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [{shift, place}];
            } else if (score === bestScore) {
                bestMoves.push({shift, place});
            }
        }
    }

    if (bestMoves.length > 0) {
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    return { place: emptySpots[0] };
};

export const getBestShobuMoveForAI = (gameState: GameState, playerId: PlayerId, difficulty: Difficulty): { passive: { pieceIdx: number, toR: number, toC: number, dr: number, dc: number, steps: number, boardColor: string }, active: { pieceIdx: number, toR: number, toC: number, pushOpponent?: { pId: PlayerId, pieceIdx: number, pushR: number, pushC: number, pushOff: boolean } } } | null => {
    const myPlayer = gameState.players.find(p => p.id === playerId);
    if (!myPlayer) return null;

    // AI is Player 2. Home boards are r < 4.
    const validPassivePieces = myPlayer.positions.map((pos, idx) => ({pos, idx})).filter(x => x.pos.r < 4);
    
    const allMoves: any[] = [];
    const occupiedByOthers = new Set<string>();
    gameState.players.forEach(p => {
        p.positions.forEach(pos => {
            occupiedByOthers.add(`${pos.r},${pos.c}`);
        });
    });

    const isOccupied = (r: number, c: number) => occupiedByOthers.has(`${r},${c}`);
    const isMyPiece = (r: number, c: number) => myPlayer.positions.some(p => p.r === r && p.c === c);
    const getOpponentPiece = (r: number, c: number) => {
        for (const p of gameState.players) {
            if (p.id !== playerId) {
                const idx = p.positions.findIndex(pos => pos.r === r && pos.c === c);
                if (idx !== -1) return { pId: p.id, pieceIdx: idx };
            }
        }
        return null;
    };

    const isValidShobuCell = (r: number, c: number) => {
        if (r < 0 || c < 0 || r > 8 || c > 8) return false;
        if (r === 4 || c === 4) return false;
        return true;
    };

    const dirs = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];

    validPassivePieces.forEach((passivePiece) => {
        dirs.forEach(([dr, dc]) => {
            for (let steps = 1; steps <= 2; steps++) {
                const toR = passivePiece.pos.r + dr * steps;
                const toC = passivePiece.pos.c + dc * steps;
                if (!isValidShobuCell(toR, toC)) break;
                if (isOccupied(toR, toC)) break; // Cannot jump or push on passive

                const pm = {
                    dr: toR - passivePiece.pos.r,
                    dc: toC - passivePiece.pos.c,
                    steps,
                    boardColor: passivePiece.pos.c < 4 ? 'dark' : 'light'
                };

                const targetBoardColor = pm.boardColor === 'dark' ? 'light' : 'dark';
                const validActivePieces = myPlayer.positions.map((pos, idx) => ({pos, idx})).filter(x => {
                    const cColor = x.pos.c < 4 ? 'dark' : 'light';
                    return cColor === targetBoardColor;
                });

                validActivePieces.forEach(activePiece => {
                    let validActive = true;
                    let pushInfo = null;

                    for (let i = 1; i <= pm.steps; i++) {
                        const nr = activePiece.pos.r + Math.sign(pm.dr) * i;
                        const nc = activePiece.pos.c + Math.sign(pm.dc) * i;
                        if (!isValidShobuCell(nr, nc)) { validActive = false; break; }
                        
                        if (i < pm.steps && isOccupied(nr, nc)) { validActive = false; break; }
                        if (i === pm.steps) {
                            if (isMyPiece(nr, nc)) {
                                validActive = false; break;
                            }
                            const opp = getOpponentPiece(nr, nc);
                            if (opp) {
                                const pushR = nr + Math.sign(pm.dr);
                                const pushC = nc + Math.sign(pm.dc);
                                if (isValidShobuCell(pushR, pushC)) {
                                    if (isOccupied(pushR, pushC)) validActive = false;
                                    else pushInfo = { ...opp, pushR, pushC, pushOff: false };
                                } else {
                                    pushInfo = { ...opp, pushR, pushC, pushOff: true };
                                }
                            }
                        }
                    }

                    if (validActive) {
                        allMoves.push({
                            passive: { pieceIdx: passivePiece.idx, toR, toC, dr: pm.dr, dc: pm.dc, steps: pm.steps, boardColor: pm.boardColor },
                            active: { pieceIdx: activePiece.idx, toR: activePiece.pos.r + pm.dr, toC: activePiece.pos.c + pm.dc, pushOpponent: pushInfo }
                        });
                    }
                });
            }
        });
    });

    if (allMoves.length === 0) return null;

    const pushingOff = allMoves.filter(m => m.active.pushOpponent?.pushOff);
    if (pushingOff.length > 0) return pushingOff[Math.floor(Math.random() * pushingOff.length)];

    if (difficulty === 'normale') {
        const pushing = allMoves.filter(m => m.active.pushOpponent);
        if (pushing.length > 0 && Math.random() > 0.3) return pushing[Math.floor(Math.random() * pushing.length)];
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    const scoreMove = (m: any) => {
        let score = 0;
        if (m.active.pushOpponent) {
            score += 50; 
            if (m.active.pushOpponent.pushR === 0 || m.active.pushOpponent.pushR === 3 || m.active.pushOpponent.pushR === 5 || m.active.pushOpponent.pushR === 8 ||
                m.active.pushOpponent.pushC === 0 || m.active.pushOpponent.pushC === 3 || m.active.pushOpponent.pushC === 5 || m.active.pushOpponent.pushC === 8) {
                score += 10;
            }
        }
        
        const edgePenalty = (r: number, c: number) => {
            if (r === 0 || r === 3 || r === 5 || r === 8 || c === 0 || c === 3 || c === 5 || c === 8) return -5;
            return 0; 
        };
        score += edgePenalty(m.passive.toR, m.passive.toC);
        score += edgePenalty(m.active.toR, m.active.toC);

        if (difficulty === 'estrema') {
           const centerBonus = (r: number, c: number) => {
               const br = r < 4 ? 1.5 : 6.5;
               const bc = c < 4 ? 1.5 : 6.5;
               const dist = Math.abs(r - br) + Math.abs(c - bc);
               return 4 - dist;
           }
           score += centerBonus(m.passive.toR, m.passive.toC);
           score += centerBonus(m.active.toR, m.active.toC);
        }

        score += Math.random() * 2;
        return score;
    };

    allMoves.sort((a, b) => scoreMove(b) - scoreMove(a));
    return allMoves[0];
};
