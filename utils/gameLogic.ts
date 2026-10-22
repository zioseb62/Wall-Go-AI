
import { Point, Player, PlayerId, Wall, BoardTheme, GameMode, Language } from '../types';
import { GRID_SIZE } from '../constants';

export const serializeWall = (r1: number, c1: number, r2: number, c2: number): string => {
  const p1 = `${r1},${c1}`;
  const p2 = `${r2},${c2}`;
  return [p1, p2].sort().join('|');
};

export const getWallBetween = (walls: Wall[], r1: number, c1: number, r2: number, c2: number): Wall | undefined => {
  const id = serializeWall(r1, c1, r2, c2);
  return walls.find(w => w.id === id);
};

export const hasWall = (walls: Wall[], r1: number, c1: number, r2: number, c2: number): boolean => {
  return !!getWallBetween(walls, r1, c1, r2, c2);
};

export const removeWall = (walls: Wall[], r1: number, c1: number, r2: number, c2: number): Wall[] => {
  const id = serializeWall(r1, c1, r2, c2);
  return walls.filter(w => w.id !== id);
};

export const isValidFugaWall = (preview: { r: number, c: number, orientation: 'h'|'v' }, walls: Wall[], players: Player[], theme: BoardTheme): boolean => {
  const { r, c, orientation } = preview;
  const boardSize = 9; // Quoridor is strictly 9x9
  if (r < 0 || c < 0 || r >= boardSize - 1 || c >= boardSize - 1) return false;

  let w1Id, w2Id;
  if (orientation === 'h') {
    w1Id = serializeWall(r, c, r+1, c);
    w2Id = serializeWall(r, c+1, r+1, c+1);
    // Check intersection with crossing vertical wall:
    // A vertical wall at (r, c) would have segments:
    // (r, c)-(r, c+1) AND (r+1, c)-(r+1, c+1)
    if (hasWall(walls, r, c, r, c+1) && hasWall(walls, r+1, c, r+1, c+1)) return false;
  } else {
    w1Id = serializeWall(r, c, r, c+1);
    w2Id = serializeWall(r+1, c, r+1, c+1);
    // Check intersection with crossing horizontal wall:
    if (hasWall(walls, r, c, r+1, c) && hasWall(walls, r, c+1, r+1, c+1)) return false;
  }

  if (walls.some(w => w.id === w1Id || w.id === w2Id)) return false;

  // Strict Quoridor rule: placing this wall must NEVER completely block any player from reaching their goal line
  const mockWalls = [...walls, { id: w1Id, ownerId: 1 as PlayerId }, { id: w2Id, ownerId: 1 as PlayerId }];
  for (const player of players) {
    if (player.positions.length > 0) {
      if (!hasPathToGoal(player.positions[0], player.id, mockWalls, players, 'corsa')) {
        return false;
      }
    }
  }

  return true;
};

// Funzione Cruciale: Definisce quali celle esistono in base alla mappa
export const isValidCell = (r: number, c: number, theme: BoardTheme): boolean => {
  if (r < 0 || c < 0) return false;

  if (theme.startsWith('abalone')) {
    if (r > 8) return false;
    const rowWidth = r <= 4 ? 5 + r : 5 + (8 - r);
    return c < rowWidth;
  } else if (theme === 'desert') {
    // ZIGGURAT MAP
    // 7 Righe totali (0-6)
    if (r > 6) return false;
    // La larghezza della riga aumenta progressivamente:
    // R0: 4 celle (0..3)
    // R1: 5 celle (0..4)
    // ...
    // R6: 10 celle (0..9)
    const rowWidth = 4 + r; 
    return c < rowWidth;
  } else if (theme === 'hourglass') {
    if (r > 8) return false;
    if (r === 0 || r === 8) return c >= 2 && c <= 4;
    if (r === 1 || r === 4 || r === 7) return c >= 1 && c <= 5;
    if (r === 2 || r === 3 || r === 5 || r === 6) return c >= 0 && c <= 6;
    return false;
  } else if (theme === 'bridge') {
    if (r > 7 || c > 7) return false;
    if (r < 2 || r > 5) {
      return c < 3 || c > 4;
    }
    return c < 8;
  } else if (theme === 'hammer') {
    if (r > 10 || c > 6) return false;
    if (r < 4) return true;
    return c >= 2 && c <= 4;
  } else if (theme === 'arena') {
    if (r > 8 || c > 8) return false;
    if (r === 4 && c === 4) return false;
    return true;
  } else if (theme === 'hex') {
    return r < 11 && c < 11;
  } else if (theme === 'pente') {
    return r < 15 && c < 15;
  } else if (theme === 'corsa') {
    return r < 9 && c < 9;
  } else if (theme === 'amazons-8') {
    return r < 8 && c < 8;
  } else if (theme === 'amazons-10') {
    return r < 10 && c < 10;
  } else if (theme === 'amazons-6') {
    return r < 6 && c < 6;
  } else if (theme === 'shobu' || theme === 'shobu-scacchiera') {
    if (r > 8 || c > 8) return false;
    if (r === 4 || c === 4) return false;
    return true;
  } else if (theme === 'baduk-9') {
    return r < 9 && c < 9;
  } else if (theme === 'baduk-13') {
    return r < 13 && c < 13;
  } else if (theme === 'baduk-19') {
    return r < 19 && c < 19;
  } else if (theme === 'domineering') {
    return r < 8 && c < 8;
  } else {
    // CLASSIC & ISLANDS (7x7 Box)
    // Usiamo solo il sottoinsieme 7x7 della griglia 10x10
    return r < 7 && c < 7;
  }
};

export const countValidCells = (theme: BoardTheme): number => {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (isValidCell(r, c, theme)) count++;
    }
  }
  return count;
};

export const getNeighbors = (r: number, c: number, theme: BoardTheme): number[][] => {
  const isHex = theme === 'islands' || theme === 'desert' || theme.startsWith('abalone') || theme === 'hex';
  
  if (!isHex) {
    // Square Grid: N, S, E, W
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
  } 
  
  if (theme.startsWith('abalone')) {
    const dirs = [];
    dirs.push([r, c - 1], [r, c + 1]); // Left, Right
    
    // Top neighbors
    if (r <= 4) {
      dirs.push([r - 1, c - 1], [r - 1, c]);
    } else {
      dirs.push([r - 1, c], [r - 1, c + 1]);
    }
    
    // Bottom neighbors
    if (r < 4) {
      dirs.push([r + 1, c], [r + 1, c + 1]);
    } else {
      dirs.push([r + 1, c - 1], [r + 1, c]);
    }
    
    return dirs;
  } else if (theme === 'desert') {
    // ZIGGURAT TOPOLOGY (Pyramid Stacking)
    // R0 (4): 0 1 2 3
    // R1 (5): 0 1 2 3 4
    // Un elemento (r,c) tocca (r+1, c) e (r+1, c+1) sotto di lui.
    // E tocca (r-1, c-1) e (r-1, c) sopra di lui.
    return [
      [r, c - 1], [r, c + 1],       // Sinistra, Destra
      [r - 1, c - 1], [r - 1, c],   // Alto-Sx, Alto-Dx
      [r + 1, c], [r + 1, c + 1]    // Basso-Sx, Basso-Dx
    ];
  } else if (theme === 'hex') {
    // RHOMBUS HEX (Axial coordinates)
    return [
      [r - 1, c], [r, c - 1], [r + 1, c - 1],
      [r + 1, c], [r, c + 1], [r - 1, c + 1]
    ];
  } else {
    // STANDARD HEX (Islands - Odd-R Offset)
    // Even rows (0, 2, 4...) shift right? Or specific offset logic.
    // Assuming Standard Odd-R for 7x7 box:
    const evenDirs = [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]];
    const oddDirs = [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]];
    return (r % 2 === 0) ? evenDirs : oddDirs;
  }
};

export const getReachableCells = (start: Point, walls: Wall[], players: Player[], maxDist: number, theme: BoardTheme, gameMode?: GameMode, shobuPassiveMove?: {r: number, c: number, dr: number, dc: number, steps: number, boardColor: string}): Point[] => {
  const occupiedByOthers = new Set<string>();
  const startKey = `${start.r},${start.c}`;
  players.forEach(p => {
    p.positions.forEach(pos => {
      const key = `${pos.r},${pos.c}`;
      if (key !== startKey) occupiedByOthers.add(key);
    });
  });

  if (theme.startsWith('amazons')) {
    const reachable: Point[] = [];
    const dirs = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    
    // In Amazons, we use walls to store burned cells as "r,c"
    const burntCells = new Set(walls.filter(w => !w.id.includes('|')).map(w => w.id));

    dirs.forEach(([dr, dc]) => {
      let nr = start.r + dr;
      let nc = start.c + dc;
      while (isValidCell(nr, nc, theme)) {
        const key = `${nr},${nc}`;
        if (occupiedByOthers.has(key) || burntCells.has(key)) break; // Blocked by piece or arrow
        reachable.push({ r: nr, c: nc });
        nr += dr;
        nc += dc;
      }
    });
    return reachable;
  }

  if (gameMode === 'shobu') {
    const reachable: Point[] = [];
    const dirs = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    
    // Find the player who owns the start piece
    const myPlayer = players.find(p => p.positions.some(pos => pos.r === start.r && pos.c === start.c));
    if (!myPlayer) return reachable;

    if (shobuPassiveMove) {
       // Active move: exactly match dr and dc
       const dr_step = Math.sign(shobuPassiveMove.dr);
       const dc_step = Math.sign(shobuPassiveMove.dc);
       const steps = Math.max(Math.abs(shobuPassiveMove.dr), Math.abs(shobuPassiveMove.dc));

       let valid = true;
       // Check path
       for (let i = 1; i <= steps; i++) {
         const nr = start.r + dr_step * i;
         const nc = start.c + dc_step * i;
         if (!isValidCell(nr, nc, theme)) { valid = false; break; }
         
         const key = `${nr},${nc}`;
         if (i < steps && occupiedByOthers.has(key)) { valid = false; break; } // Path must be empty
         
         if (i === steps) {
            // Destination
            if (myPlayer.positions.some(pos => pos.r === nr && pos.c === nc)) {
                valid = false; // Cannot push own piece
                break;
            }
            if (occupiedByOthers.has(key)) {
                // Opponent piece here. Can we push it?
                const pushR = nr + dr_step;
                const pushC = nc + dc_step;
                if (isValidCell(pushR, pushC, theme) && (occupiedByOthers.has(`${pushR},${pushC}`) || myPlayer.positions.some(p => p.r === pushR && p.c === pushC))) {
                   valid = false; // Cannot push 2 pieces or push into another piece
                   break;
                }
            }
         }
       }
       if (valid) {
          reachable.push({ r: start.r + shobuPassiveMove.dr, c: start.c + shobuPassiveMove.dc });
       }
    } else {
       // Passive move: 1 or 2 steps, cannot push ANY piece
       dirs.forEach(([dr, dc]) => {
         for (let steps = 1; steps <= 2; steps++) {
            const nr = start.r + dr * steps;
            const nc = start.c + dc * steps;
            if (!isValidCell(nr, nc, theme)) break;
            const key = `${nr},${nc}`;
            if (occupiedByOthers.has(key) || myPlayer.positions.some(pos => pos.r === nr && pos.c === nc)) break; // Cannot push or jump
            
            // Check if this passive move has a valid active move later!
            let hasActive = false;
            const passiveBoardColor = start.c < 4 ? 'dark' : 'light';
            const targetBoardColor = passiveBoardColor === 'dark' ? 'light' : 'dark';
            const validActivePieces = myPlayer.positions.filter(pos => (pos.c < 4 ? 'dark' : 'light') === targetBoardColor);
            const isValidShobuCell = (r: number, c: number) => r >= 0 && c >= 0 && r <= 8 && c <= 8 && r !== 4 && c !== 4;
            
            for (const activePiece of validActivePieces) {
                let validActive = true;
                for (let i = 1; i <= steps; i++) {
                   const toR = activePiece.r + dr * i;
                   const toC = activePiece.c + dc * i;
                   if (!isValidShobuCell(toR, toC)) { validActive = false; break; }
                   const toKey = `${toR},${toC}`;
                   const isOccupiedOther = occupiedByOthers.has(toKey);
                   const isOccupiedMine = myPlayer.positions.some(p => p.r === toR && p.c === toC);
                   
                   if (i < steps && (isOccupiedOther || isOccupiedMine)) { validActive = false; break; }
                   if (i === steps) {
                      if (isOccupiedMine) { validActive = false; break; }
                      if (isOccupiedOther) {
                         const pushR = toR + dr;
                         const pushC = toC + dc;
                         if (isValidShobuCell(pushR, pushC)) {
                            const pushOccupiedOther = occupiedByOthers.has(`${pushR},${pushC}`);
                            const pushOccupiedMine = myPlayer.positions.some(p => p.r === pushR && p.c === pushC);
                            if (pushOccupiedOther || pushOccupiedMine) { validActive = false; break; }
                         }
                      }
                   }
                }
                if (validActive) { hasActive = true; break; }
            }
            
            if (hasActive) {
               reachable.push({ r: nr, c: nc });
            }
         }
       });
    }
    return reachable;
  }

  if (gameMode === 'corsa') {
    const reachable: Point[] = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // N, S, E, W
    
    dirs.forEach(([dr, dc]) => {
      const nr = start.r + dr;
      const nc = start.c + dc;
      if (isValidCell(nr, nc, theme) && !hasWall(walls, start.r, start.c, nr, nc)) {
        const nKey = `${nr},${nc}`;
        if (!occupiedByOthers.has(nKey)) {
          // Empty cell, normal move
          reachable.push({ r: nr, c: nc });
        } else {
          // Occupied, check jump
          const jmpR = nr + dr;
          const jmpC = nc + dc;
          
          if (isValidCell(jmpR, jmpC, theme) && !hasWall(walls, nr, nc, jmpR, jmpC) && !occupiedByOthers.has(`${jmpR},${jmpC}`)) {
             // Jump over
             reachable.push({ r: jmpR, c: jmpC });
          } else {
             // Wall or border behind, can jump diagonally
             // Check orthogonal directions from (nr, nc) that are not the opposite of (dr, dc)
             const diagDirs = dr !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
             diagDirs.forEach(([ddr, ddc]) => {
               const diagR = nr + ddr;
               const diagC = nc + ddc;
               if (isValidCell(diagR, diagC, theme) && !hasWall(walls, nr, nc, diagR, diagC) && !occupiedByOthers.has(`${diagR},${diagC}`)) {
                 reachable.push({ r: diagR, c: diagC });
               }
             });
          }
        }
      }
    });
    return reachable;
  }

  const reachable: Point[] = [];
  const queue: { pos: Point; dist: number }[] = [{ pos: start, dist: 0 }];
  const visited = new Set<string>();
  visited.add(startKey);

  while (queue.length > 0) {
    const { pos, dist } = queue.shift()!;
    const posKey = `${pos.r},${pos.c}`;
    
    // Non possiamo terminare il movimento sopra un'altra pedina
    if (dist > 0 && !occupiedByOthers.has(posKey)) {
      reachable.push(pos);
    } else if (dist === 0) {
      reachable.push(pos); // La cella di partenza è mostrata ma generalmente non ci clicchi
    }

    if (dist >= maxDist) continue;

    const neighbors = getNeighbors(pos.r, pos.c, theme);

    for (const n of neighbors) {
      const nr = n[0], nc = n[1];
      if (isValidCell(nr, nc, theme)) {
        const nKey = `${nr},${nc}`;
        if (!hasWall(walls, pos.r, pos.c, nr, nc) && !occupiedByOthers.has(nKey)) {
          if (!visited.has(nKey)) {
            visited.add(nKey);
            queue.push({ pos: { r: nr, c: nc }, dist: dist + 1 });
          }
        }
      }
    }
  }
  return reachable;
};

export const findPath = (start: Point, end: Point, walls: Wall[], players: Player[], maxDist: number, theme: BoardTheme): Point[] | null => {
  if (start.r === end.r && start.c === end.c) return [start];
  
  const queue: { pos: Point; path: Point[] }[] = [{ pos: start, path: [start] }];
  const visited = new Set<string>();
  const startKey = `${start.r},${start.c}`;
  visited.add(startKey);

  const occupiedByOthers = new Set<string>();
  players.forEach(p => {
    p.positions.forEach(pos => {
      const key = `${pos.r},${pos.c}`;
      if (key !== startKey) occupiedByOthers.add(key);
    });
  });

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;

    if (pos.r === end.r && pos.c === end.c) return path;
    if (path.length - 1 >= maxDist) continue;

    const neighbors = getNeighbors(pos.r, pos.c, theme);

    for (const n of neighbors) {
      const nr = n[0], nc = n[1];
      if (isValidCell(nr, nc, theme)) {
        const nKey = `${nr},${nc}`;
        if (!hasWall(walls, pos.r, pos.c, nr, nc) && !occupiedByOthers.has(nKey)) {
          if (!visited.has(nKey)) {
            visited.add(nKey);
            queue.push({ pos: { r: nr, c: nc }, path: [...path, { r: nr, c: nc }] });
          }
        }
      }
    }
  }
  return null;
};

export const hasPathToGoal = (start: Point, playerId: PlayerId, walls: Wall[], allPlayers: Player[], theme: BoardTheme): boolean => {
  const queue: Point[] = [start];
  const visited = new Set<string>();
  visited.add(`${start.r},${start.c}`);

  // In Corsa (Quoridor) mode, players don't block pathfinding for winning checks
  // and the board is always 9x9.
  const effectiveTheme: BoardTheme = 'corsa';

  while (queue.length > 0) {
    const pos = queue.shift()!;
    
    // Check goal condition
    if (playerId === 1 && pos.r === 0) return true;
    if (playerId === 2 && pos.r === 8) return true;
    if (playerId === 3 && pos.c === 8) return true;
    if (playerId === 4 && pos.c === 0) return true;

    const neighbors = getNeighbors(pos.r, pos.c, effectiveTheme);

    for (const n of neighbors) {
      const nr = n[0], nc = n[1];
      if (isValidCell(nr, nc, effectiveTheme) && !hasWall(walls, pos.r, pos.c, nr, nc)) {
        const nKey = `${nr},${nc}`;
        if (!visited.has(nKey)) {
          visited.add(nKey);
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }
  return false;
};

export const canPhysicallyMove = (player: Player, walls: Wall[], allPlayers: Player[], theme: BoardTheme, gameMode?: GameMode): boolean => {
  if (theme === 'hex' || theme === 'orbito' || theme === 'abalone' || theme === 'pente' || theme === 'yinsh' || theme.startsWith('baduk') || gameMode === 'orbito' || gameMode === 'abalone' || gameMode === 'pente' || gameMode === 'yinsh' || gameMode === 'baduk') return true;
  if (theme === 'domineering') {
    const isV = player.id === 1; // ID 1 is vertical (first player), ID 2 is horizontal
    const occupied = new Set<string>();
    allPlayers.forEach(p => p.positions.forEach(pos => occupied.add(`${pos.r},${pos.c}`)));
    
    // Check if there is any empty cell and adjacent empty cell for this player's role
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const r2 = isV ? r + 1 : r;
        const c2 = isV ? c : c + 1;
        if (r2 < 8 && c2 < 8) {
          if (!occupied.has(`${r},${c}`) && !occupied.has(`${r2},${c2}`)) {
            return true;
          }
        }
      }
    }
    console.log(`[DOMINEERING] Player ${player.id} (isV=${isV}) cannot physically move. Occupied:`, occupied);
    return false;
  }

  if (gameMode === 'shobu') {
    const isOccupied = (r: number, c: number) => allPlayers.some(p => p.positions.some(pos => pos.r === r && pos.c === c));
    const isMyPiece = (r: number, c: number) => player.positions.some(pos => pos.r === r && pos.c === c);
    const isValidShobuCell = (r: number, c: number) => r >= 0 && c >= 0 && r <= 8 && c <= 8 && r !== 4 && c !== 4;
    
    let isP1 = player.id === 1; // home boards: r > 4 for P1, r < 4 for P2
    const validPassivePieces = player.positions.filter(pos => isP1 ? pos.r > 4 : pos.r < 4);
    const dirs = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    
    for (const passivePiece of validPassivePieces) {
      for (const d of dirs) {
        const dr = d[0], dc = d[1];
        for (let steps = 1; steps <= 2; steps++) {
          const toR = passivePiece.r + dr * steps;
          const toC = passivePiece.c + dc * steps;
          if (!isValidShobuCell(toR, toC)) break;
          if (isOccupied(toR, toC)) break;
          
          const boardColor = passivePiece.c < 4 ? 'dark' : 'light';
          const targetBoardColor = boardColor === 'dark' ? 'light' : 'dark';
          const validActivePieces = player.positions.filter(pos => (pos.c < 4 ? 'dark' : 'light') === targetBoardColor);
          
          for (const activePiece of validActivePieces) {
             let validActive = true;
             for (let i = 1; i <= steps; i++) {
                const nr = activePiece.r + dr * i;
                const nc = activePiece.c + dc * i;
                if (!isValidShobuCell(nr, nc)) { validActive = false; break; }
                if (i < steps && isOccupied(nr, nc)) { validActive = false; break; }
                 if (i === steps) {
                    if (isMyPiece(nr, nc)) { validActive = false; break; }
                    if (isOccupied(nr, nc)) {
                        const pushR = nr + dr;
                        const pushC = nc + dc;
                        if (isValidShobuCell(pushR, pushC) && isOccupied(pushR, pushC)) {
                            validActive = false; break;
                        }
                    }
                 }
             }
             if (validActive) return true;
          }
        }
      }
    }
    return false;
  }

  return player.positions.some(pos => {
    const reachable = getReachableCells(pos, walls, allPlayers, theme.startsWith('amazons') ? Infinity : 2, theme, gameMode, undefined);
    return (theme.startsWith('amazons') || theme === 'corsa') ? reachable.length > 0 : reachable.length > 1;
  });
};

export const canPlayerMove = (player: Player, walls: Wall[], allPlayers: Player[], theme: BoardTheme, gameMode?: GameMode): boolean => {
  if (player.hasWallbreaker) return true;
  return canPhysicallyMove(player, walls, allPlayers, theme, gameMode);
};

export const calculateTerritory = (
  walls: Wall[],
  players: Player[],
  theme: BoardTheme,
  deadStonesInput?: Set<string> | string[]
) => {
  const scores = {} as Record<PlayerId, number>;
  const enclosed = {} as Record<PlayerId, boolean>;
  const territoryMap: Record<string, PlayerId> = {};
  
  // Quoridor (corsa) is a race game, NOT a territory enclosure game.
  // There are no territories, no enclosures, and no territory coloring in Quoridor.
  if (theme === 'corsa') {
    return {
      scores: { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<PlayerId, number>,
      enclosed: { 1: false, 2: false, 3: false, 4: false } as Record<PlayerId, boolean>,
      territoryMap: {} as Record<string, PlayerId>,
      isSettled: false,
      hexWinner: null
    };
  }
  
  const deadStones = deadStonesInput instanceof Set 
    ? deadStonesInput 
    : new Set<string>(deadStonesInput || []);

  const boardVisited = new Set<string>();
  const playerScores: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const playerEnclosed: Record<PlayerId, boolean> = { 1: true, 2: true, 3: true, 4: true };
  let isSettled = true;

  const pieceOwnerMap = new Map<string, PlayerId>();
  players.forEach(p => {
    p.positions.forEach(pos => {
      const posKey = `${pos.r},${pos.c}`;
      if (!deadStones.has(posKey)) {
        pieceOwnerMap.set(posKey, p.id);
      }
    });
    playerScores[p.id] = 0;
    playerEnclosed[p.id] = true;
  });

  if (theme.startsWith('baduk')) {
    // Baduk standard Go territory calculation:
    // Empty intersections (and dead stone locations) surrounded completely by one player's live stones belong to that player.
    let bSize = 9;
    if (theme === 'baduk-13') bSize = 13;
    if (theme === 'baduk-19') bSize = 19;

    for (let r = 0; r < bSize; r++) {
      for (let c = 0; c < bSize; c++) {
        if (!isValidCell(r, c, theme)) continue;
        
        const startKey = `${r},${c}`;
        if (boardVisited.has(startKey) || pieceOwnerMap.has(startKey)) {
          if (pieceOwnerMap.has(startKey)) boardVisited.add(startKey);
          continue;
        }

        const regionCells = new Set<string>();
        const currentRegionArray: Point[] = [{ r, c }];
        regionCells.add(startKey);
        boardVisited.add(startKey);

        const touchingStones = new Map<PlayerId, Set<string>>();
        let head = 0;

        while (head < currentRegionArray.length) {
          const curr = currentRegionArray[head++];
          const neighbors = getNeighbors(curr.r, curr.c, theme);

          for (const n of neighbors) {
            const nr = n[0], nc = n[1];
            if (isValidCell(nr, nc, theme)) {
              const nKey = `${nr},${nc}`;
              const ownerId = pieceOwnerMap.get(nKey);
              if (ownerId !== undefined) {
                // Living stone adjacent to region
                if (!touchingStones.has(ownerId)) touchingStones.set(ownerId, new Set());
                touchingStones.get(ownerId)!.add(nKey);
              } else {
                // Empty cell or dead stone cell
                if (!regionCells.has(nKey)) {
                  regionCells.add(nKey);
                  boardVisited.add(nKey);
                  currentRegionArray.push({ r: nr, c: nc });
                }
              }
            }
          }
        }

        // Authentic Go rule: If the region touches living stones of ONLY ONE player (and at least 1), it is that player's territory
        if (touchingStones.size === 1) {
          const ownerId = Array.from(touchingStones.keys())[0];
          playerScores[ownerId] += regionCells.size;
          regionCells.forEach(cellKey => {
            territoryMap[cellKey] = ownerId;
          });
        }
      }
    }
  } else if (theme !== 'hex') {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!isValidCell(r, c, theme)) continue;

        const startKey = `${r},${c}`;
        if (boardVisited.has(startKey)) continue;

        const regionCells = new Set<string>();
        const currentRegionArray: Point[] = [{ r, c }];
        regionCells.add(startKey);
        boardVisited.add(startKey);

        const playersInRegion = new Set<PlayerId>();
        let head = 0;

        while (head < currentRegionArray.length) {
          const curr = currentRegionArray[head++];
          const currKey = `${curr.r},${curr.c}`;
          
          const ownerId = pieceOwnerMap.get(currKey);
          if (ownerId !== undefined) {
            playersInRegion.add(ownerId);
          }

          const neighbors = getNeighbors(curr.r, curr.c, theme);

          for (const n of neighbors) {
            const nr = n[0], nc = n[1];
            if (isValidCell(nr, nc, theme)) {
              if (!hasWall(walls, curr.r, curr.c, nr, nc)) {
                const nKey = `${nr},${nc}`;
                if (!regionCells.has(nKey)) {
                  regionCells.add(nKey);
                  boardVisited.add(nKey);
                  currentRegionArray.push({ r: nr, c: nc });
                }
              }
            }
          }
        }

        if (playersInRegion.size === 1) {
          const ownerId = Array.from(playersInRegion)[0];
          playerScores[ownerId] += regionCells.size;
          regionCells.forEach(cellKey => {
            territoryMap[cellKey] = ownerId;
          });
        } else if (playersInRegion.size > 1) {
          isSettled = false;
          playersInRegion.forEach(id => {
            playerEnclosed[id] = false;
          });
        }
      }
    }
  } else {
    isSettled = false;
    players.forEach(p => playerEnclosed[p.id] = false);
  }

  players.forEach(p => {
    scores[p.id] = playerScores[p.id];
    enclosed[p.id] = playerEnclosed[p.id];
  });

  // Hex Win logic overrides territory:
  // Player 1 (Blue) connects left (c=0) to right (c=10)
  // Player 2 (Red) connects top (r=0) to bottom (r=10)
  let hexWinner: PlayerId | null = null;
  if (theme === 'hex') {
    const checkWin = (playerId: PlayerId) => {
      const isP1 = playerId === 1;
      const queue: Point[] = [];
      const visited = new Set<string>();
      const playerPos = new Set<string>();
      
      const pData = players.find(p => p.id === playerId);
      if (!pData) return false;
      
      pData.positions.forEach(p => {
        playerPos.add(`${p.r},${p.c}`);
        if (isP1 && p.c === 0) {
          queue.push(p);
          visited.add(`${p.r},${p.c}`);
        }
        if (!isP1 && p.r === 0) {
          queue.push(p);
          visited.add(`${p.r},${p.c}`);
        }
      });
      
      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        if (isP1 && curr.c === 10) return true;
        if (!isP1 && curr.r === 10) return true;
        
        const neighbors = getNeighbors(curr.r, curr.c, theme);
        for (const n of neighbors) {
          const nr = n[0], nc = n[1];
          const key = `${nr},${nc}`;
          if (playerPos.has(key) && !visited.has(key)) {
            visited.add(key);
            queue.push({r: nr, c: nc});
          }
        }
      }
      return false;
    };
    
    if (checkWin(1)) hexWinner = 1;
    else if (checkWin(2)) hexWinner = 2;
  }

  return { scores, enclosed, territoryMap, isSettled, hexWinner };
};

export const getWallOptions = (pos: Point, walls: Wall[], theme: BoardTheme, players: Player[] = [], gameMode?: GameMode): Point[] => {
  if (theme.startsWith('amazons')) {
    const reachable = getReachableCells(pos, walls, players, Infinity, theme, gameMode);
    return reachable.filter(p => p.r !== pos.r || p.c !== pos.c);
  }

  const options: Point[] = [];
  const neighbors = getNeighbors(pos.r, pos.c, theme);

  for (const n of neighbors) {
    const nr = n[0], nc = n[1];
    if (isValidCell(nr, nc, theme)) {
      if (!hasWall(walls, pos.r, pos.c, nr, nc)) {
        options.push({ r: nr, c: nc });
      }
    }
  }
  return options;
};

export interface AbaloneMove extends Point {
  isPush?: boolean;
  isAbaloneMove?: boolean;
  du?: number;
  dv?: number;
}

export const getAbaloneUV = (p: Point) => {
  const wOffset = p.r <= 4 ? 4 + p.r : 12 - p.r;
  return { u: 2 * p.c - wOffset, v: p.r };
};

export const getAbalonePointFromUV = (u: number, v: number): Point => {
  const r = v;
  const wOffset = r <= 4 ? 4 + r : 12 - r;
  const c = Math.round((u + wOffset) / 2);
  return { r, c };
};

export const getAbalonePossibleMoves = (
  player: Player,
  selectedIndices: number[],
  players: Player[],
  theme: BoardTheme
): AbaloneMove[] => {
  if (selectedIndices.length === 0 || selectedIndices.length > 3) return [];
  const pts = selectedIndices.map(i => player.positions[i]);
  const moves: AbaloneMove[] = [];

  const OPPONENT_ID = players.filter(p => p.id !== player.id).map(p => p.id);
  const getPieceIdAt = (p: Point): PlayerId | null => {
      for (const pl of players) {
          if (pl.positions.some(pos => pos.r === p.r && pos.c === p.c)) return pl.id;
      }
      return null;
  };

  const uvPts = pts.map(p => getAbaloneUV(p));
  
  // Is it a line?
  let lineDir = null;
  if (pts.length > 1) {
    const du = uvPts[1].u - uvPts[0].u;
    const dv = uvPts[1].v - uvPts[0].v;
    lineDir = { du: Math.sign(du) * (dv === 0 ? 2 : 1), dv: Math.sign(dv) };
  }

  const DIRS = [
    {du: 2, dv: 0}, {du: -2, dv: 0}, 
    {du: 1, dv: 1}, {du: -1, dv: -1},
    {du: -1, dv: 1}, {du: 1, dv: -1}
  ];

  DIRS.forEach(dir => {
    const isInline = lineDir !== null && ((dir.du === lineDir.du && dir.dv === lineDir.dv) || (dir.du === -lineDir.du && dir.dv === -lineDir.dv));
    
    // Sort pieces so we find the "leading" piece in the direction of movement
    const sortedUv = [...uvPts].sort((a,b) => {
        return ((b.u * dir.du) + (b.v * dir.dv)) - ((a.u * dir.du) + (a.v * dir.dv));
    });
    
    // Broadside Move: Each piece moves independently to an empty adjacent spot
    if (!isInline && pts.length > 1) {
        let isValid = true;
        for (let i=0; i<uvPts.length; i++) {
            const nextUv = { u: uvPts[i].u + dir.du, v: uvPts[i].v + dir.dv };
            const nextPt = getAbalonePointFromUV(nextUv.u, nextUv.v);
            if (!isValidCell(nextPt.r, nextPt.c, theme)) { isValid = false; break; }
            const pid = getPieceIdAt(nextPt);
            // Must be empty (or one of the pieces we are moving, which can't be true since they move parallel)
            if (pid !== null) { isValid = false; break; }
        }
        if (isValid) {
            const farthestLeadUv = sortedUv[0];
            const targetPt = getAbalonePointFromUV(farthestLeadUv.u + dir.du, farthestLeadUv.v + dir.dv);
            moves.push({ r: targetPt.r, c: targetPt.c, isPush: false, isAbaloneMove: true, du: dir.du, dv: dir.dv });
        }
        return;
    }

    // Inline Move (or single piece move)
    let leadUv = sortedUv[0];
    let stepCount = 1;
    let pushCount = 0;
    while (true) {
        const nextUv = { u: leadUv.u + dir.du * stepCount, v: leadUv.v + dir.dv * stepCount };
        const nextPt = getAbalonePointFromUV(nextUv.u, nextUv.v);
        
        if (!isValidCell(nextPt.r, nextPt.c, theme)) {
            // Reached edge
            if (pushCount > 0 && pushCount < pts.length) {
                // We can push off the board!
                const targetPt = getAbalonePointFromUV(sortedUv[0].u + dir.du, sortedUv[0].v + dir.dv);
                moves.push({ r: targetPt.r, c: targetPt.c, isPush: true, isAbaloneMove: true, du: dir.du, dv: dir.dv });
            }
            break;
        }

        const pid = getPieceIdAt(nextPt);
        if (pid === null) {
            // Found empty space!
            if (pushCount < pts.length) {
                const targetPt = getAbalonePointFromUV(sortedUv[0].u + dir.du, sortedUv[0].v + dir.dv);
                moves.push({ r: targetPt.r, c: targetPt.c, isPush: pushCount > 0, isAbaloneMove: true, du: dir.du, dv: dir.dv });
            }
            break; 
        } else if (OPPONENT_ID.includes(pid)) {
            pushCount++;
            if (pushCount >= pts.length) break; // Not enough weight
            stepCount++;
        } else {
            // Found our own piece
            break;
        }
    }
  });

  return moves;
};

export const checkOrbitoWinner = (players: Player[]): PlayerId | null => {
    const GRID_SIZE = 4;
    const isWinner = (p: Player) => {
        const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
        p.positions.forEach(pos => {
            if (pos.r >= 0 && pos.r < 4 && pos.c >= 0 && pos.c < 4) {
               grid[pos.r][pos.c] = true;
            }
        });

        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][0] && grid[r][1] && grid[r][2] && grid[r][3]) return true;
        }
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[0][c] && grid[1][c] && grid[2][c] && grid[3][c]) return true;
        }
        if (grid[0][0] && grid[1][1] && grid[2][2] && grid[3][3]) return true;
        if (grid[0][3] && grid[1][2] && grid[2][1] && grid[3][0]) return true;

        return false;
    };

    let winners: PlayerId[] = [];
    for (const p of players) {
        if (isWinner(p)) winners.push(p.id);
    }
    
    if (winners.length === 1) return winners[0];
    if (winners.length > 1) return 'draw' as unknown as PlayerId;
    return null;
};

export const checkPenteWinner = (players: Player[]): { winnerId: PlayerId, line?: Point[] } | null => {
    for (const p of players) {
        if (p.penteCaptures && p.penteCaptures >= 10) return { winnerId: p.id };
        const posSet = new Set<string>();
        for (const pos of p.positions) posSet.add(`${pos.r},${pos.c}`);
        
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (const pos of p.positions) {
            for (const d of directions) {
                const dr = d[0], dc = d[1];
                let count = 1;
                let currentLine: Point[] = [{r: pos.r, c: pos.c}];
                for (let i = 1; i < 5; i++) {
                    if (posSet.has(`${pos.r + dr * i},${pos.c + dc * i}`)) {
                        count++;
                        currentLine.push({r: pos.r + dr * i, c: pos.c + dc * i});
                    } else {
                        break;
                    }
                }
                if (count >= 5) return { winnerId: p.id, line: currentLine };
            }
        }
    }
    return null;
};

export const getPenteThreatLines = (players: Player[]): Point[][] => {
    const threats: Point[][] = [];
    const GRID_SIZE = 15;

    const board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    players.forEach(p => {
        p.positions.forEach(pos => {
            if (pos.r >= 0 && pos.r < GRID_SIZE && pos.c >= 0 && pos.c < GRID_SIZE) {
                board[pos.r][pos.c] = p.id;
            }
        });
    });

    // Helper to extract a sliding window
    const extractWindow = (r: number, c: number, dr: number, dc: number, size: number) => {
        const window: {pt: Point, val: number}[] = [];
        for (let i = 0; i < size; i++) {
            const nr = r + dr * i;
            const nc = c + dc * i;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                window.push({ pt: {r: nr, c: nc}, val: board[nr][nc] });
            } else {
                return null; // out of bounds
            }
        }
        return window;
    };

    players.forEach(p => {
        // Collect points that belong to threats so we don't have duplicates
        // But since we want to return actual Point[] arrays to highlight the lines,
        // we'll just add the `p.id` pieces found in the threat windows.
        
        // We will scan all possible starting positions and directions.
        // Directions: right, down, down-right, down-left
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                for (const d of directions) {
                    const dr = d[0], dc = d[1];
                    
                    const w5 = extractWindow(r, c, dr, dc, 5);
                    // Check strictly contiguous pieces
                    // 4-threat: 4 contiguous and 1 open end (could be 0XXXX or XXXX0)
                    if (w5) {
                        const vals = w5.map(w => w.val);
                        const isMatch = (pattern: number[]) => pattern.every((v, i) => vals[i] === v);
                        if (isMatch([0, p.id, p.id, p.id, p.id]) || isMatch([p.id, p.id, p.id, p.id, 0])) {
                            threats.push(w5.filter(w => w.val === p.id).map(w => w.pt));
                        }
                        // Open 3: exactly 0 X X X 0
                        else if (isMatch([0, p.id, p.id, p.id, 0])) {
                            threats.push(w5.filter(w => w.val === p.id).map(w => w.pt));
                        }
                    }
                }
            }
        }
    });

    // Remove duplicates (same threat line from overlap)
    // We can do this by stringifying the points
    const uniqueThreats = Array.from(new Set(threats.map(t => JSON.stringify(t)))).map(t => JSON.parse(t) as Point[]);

    return uniqueThreats;
};

export const ALL_ABALONE_THEMES: BoardTheme[] = [
  "abalone",
  "abalone-daisy",
  "abalone-dutch",
  "abalone-domination",
  "abalone-infiltration",
  "abalone-wall",
];

export const getAbaloneLayoutName = (theme: BoardTheme | string | undefined, lang: Language): string => {
  const map: Record<string, Record<Language, string>> = {
    "abalone": {
      it: "Classica",
      en: "Classic",
      fr: "Classique",
      de: "Klassisch",
      es: "Clásica",
    },
    "abalone-daisy": {
      it: "Belgian Daisy",
      en: "Belgian Daisy",
      fr: "Marguerite Belge",
      de: "Belgische Gänseblümchen",
      es: "Margarita Belga",
    },
    "abalone-dutch": {
      it: "Dutch Daisy",
      en: "Dutch Daisy",
      fr: "Marguerite Hollandaise",
      de: "Holländische Gänseblümchen",
      es: "Margarita Holandesa",
    },
    "abalone-domination": {
      it: "Dominazione",
      en: "Domination",
      fr: "Domination",
      de: "Herrschaft",
      es: "Dominación",
    },
    "abalone-infiltration": {
      it: "Infiltrazione",
      en: "Infiltration",
      fr: "Infiltration",
      de: "Infiltration",
      es: "Infiltración",
    },
    "abalone-wall": {
      it: "Il Muro",
      en: "The Wall",
      fr: "Le Mur",
      de: "Die Mauer",
      es: "El Muro",
    },
  };
  const key = theme && map[theme] ? theme : "abalone";
  return map[key]?.[lang] || map[key]?.["it"] || "Classica";
};

export const getAbaloneStartingPositions = (theme?: BoardTheme | string): Record<number, Point[]> => {
  const startingPositions: Record<number, Point[]> = {};
  if (theme === "abalone-daisy") {
    startingPositions[1] = [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 },
      { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 8, c: 3 }, { r: 8, c: 4 }, { r: 7, c: 3 },
      { r: 7, c: 4 }, { r: 7, c: 5 }, { r: 6, c: 4 }, { r: 6, c: 5 },
    ];
    startingPositions[2] = [
      { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 1, c: 3 }, { r: 1, c: 4 }, { r: 1, c: 5 },
      { r: 2, c: 4 }, { r: 2, c: 5 }, { r: 8, c: 0 }, { r: 8, c: 1 }, { r: 7, c: 0 },
      { r: 7, c: 1 }, { r: 7, c: 2 }, { r: 6, c: 1 }, { r: 6, c: 2 },
    ];
  } else if (theme === "abalone-dutch") {
    startingPositions[1] = [
      { r: 8, c: 0 }, { r: 8, c: 1 }, { r: 7, c: 0 }, { r: 7, c: 2 }, { r: 6, c: 1 },
      { r: 6, c: 2 }, { r: 1, c: 1 }, { r: 2, c: 4 }, { r: 2, c: 5 }, { r: 1, c: 3 },
      { r: 1, c: 5 }, { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 7, c: 4 },
    ];
    startingPositions[2] = [
      { r: 7, c: 1 }, { r: 8, c: 3 }, { r: 8, c: 4 }, { r: 7, c: 3 }, { r: 7, c: 5 },
      { r: 6, c: 4 }, { r: 6, c: 5 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 1, c: 0 },
      { r: 1, c: 2 }, { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 4 },
    ];
  } else if (theme === "abalone-domination") {
    startingPositions[1] = [
      { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 3, c: 0 }, { r: 3, c: 1 },
      { r: 3, c: 2 }, { r: 3, c: 3 }, { r: 5, c: 4 }, { r: 5, c: 5 }, { r: 5, c: 6 },
      { r: 5, c: 7 }, { r: 6, c: 5 }, { r: 6, c: 6 }, { r: 7, c: 5 },
    ];
    startingPositions[2] = [
      { r: 1, c: 4 }, { r: 2, c: 4 }, { r: 2, c: 5 }, { r: 3, c: 5 }, { r: 3, c: 6 },
      { r: 3, c: 7 }, { r: 4, c: 5 }, { r: 4, c: 3 }, { r: 5, c: 0 }, { r: 5, c: 1 },
      { r: 5, c: 2 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 7, c: 1 },
    ];
  } else if (theme === "abalone-infiltration") {
    startingPositions[1] = [
      { r: 0, c: 2 }, { r: 2, c: 2 }, { r: 2, c: 4 }, { r: 5, c: 2 }, { r: 5, c: 5 },
      { r: 6, c: 1 }, { r: 6, c: 3 }, { r: 6, c: 5 }, { r: 7, c: 1 }, { r: 7, c: 2 },
      { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 8, c: 1 }, { r: 8, c: 3 },
    ];
    startingPositions[2] = [
      { r: 0, c: 1 }, { r: 0, c: 3 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 },
      { r: 1, c: 4 }, { r: 2, c: 1 }, { r: 2, c: 3 }, { r: 2, c: 5 }, { r: 3, c: 2 },
      { r: 3, c: 5 }, { r: 6, c: 2 }, { r: 6, c: 4 }, { r: 8, c: 2 },
    ];
  } else if (theme === "abalone-wall") {
    startingPositions[1] = [
      { r: 0, c: 2 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 },
      { r: 2, c: 5 }, { r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 },
      { r: 3, c: 4 }, { r: 3, c: 5 }, { r: 3, c: 6 }, { r: 3, c: 7 },
    ];
    startingPositions[2] = [
      { r: 5, c: 0 }, { r: 5, c: 1 }, { r: 5, c: 2 }, { r: 5, c: 3 }, { r: 5, c: 4 },
      { r: 5, c: 5 }, { r: 5, c: 6 }, { r: 5, c: 7 }, { r: 6, c: 1 }, { r: 6, c: 2 },
      { r: 6, c: 3 }, { r: 6, c: 4 }, { r: 6, c: 5 }, { r: 8, c: 2 },
    ];
  } else {
    // Default Classic ("abalone")
    startingPositions[1] = [
      { r: 8, c: 0 }, { r: 8, c: 1 }, { r: 8, c: 2 }, { r: 8, c: 3 }, { r: 8, c: 4 },
      { r: 7, c: 0 }, { r: 7, c: 1 }, { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 },
      { r: 6, c: 2 }, { r: 6, c: 3 }, { r: 6, c: 4 },
    ];
    startingPositions[2] = [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 },
      { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 4 }, { r: 1, c: 5 },
      { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 },
    ];
  }
  return startingPositions;
};
