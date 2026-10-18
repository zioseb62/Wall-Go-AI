import { YinshPoint, YinshState, PlayerId } from '../types';

export const getYinshValidPoints = (): YinshPoint[] => {
  const points: YinshPoint[] = [];
  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) {
      const s = -q - r;
      const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
      if (dist <= 5) {
        if (!(dist === 5 && (q === 0 || r === 0 || s === 0))) {
          points.push({ q, r });
        }
      }
    }
  }
  return points;
};

export const createInitialYinshState = (): YinshState => {
  return {
    rings: [],
    markers: {},
    phase: 'place_ring',
    selectedRing: null,
    activeRows: [],
    ringsWon: { 1: 0, 2: 0, 3: 0, 4: 0 },
    winner: null,
  };
};

// Check if points are colinear and return the direction step
export const getDirection = (p1: YinshPoint, p2: YinshPoint) => {
  const dq = p2.q - p1.q;
  const dr = p2.r - p1.r;
  const ds = (-p2.q - p2.r) - (-p1.q - p1.r);
  
  if (dq === 0 && dr !== 0) return { dq: 0, dr: Math.sign(dr) };
  if (dr === 0 && dq !== 0) return { dq: Math.sign(dq), dr: 0 };
  if (ds === 0 && dq !== 0) return { dq: Math.sign(dq), dr: -Math.sign(dq) };
  
  return null; // Not colinear on hex grid
};

// Get all valid moves for a ring at `from`
export const getValidYinshMoves = (state: YinshState, from: YinshPoint): YinshPoint[] => {
  const validPoints = getYinshValidPoints();
  const validPointsSet = new Set(validPoints.map(p => `${p.q},${p.r}`));
  const ringsSet = new Set(state.rings.map(r => `${r.q},${r.r}`));
  
  const moves: YinshPoint[] = [];
  const directions = [
    { dq: 1, dr: 0 }, { dq: -1, dr: 0 },
    { dq: 0, dr: 1 }, { dq: 0, dr: -1 },
    { dq: 1, dr: -1 }, { dq: -1, dr: 1 }
  ];
  
  directions.forEach(dir => {
    let current = { q: from.q + dir.dq, r: from.r + dir.dr };
    let jumpedMarkers = false;
    
    while (validPointsSet.has(`${current.q},${current.r}`)) {
      const pKey = `${current.q},${current.r}`;
      
      // Stop if a ring is in the way
      if (ringsSet.has(pKey)) {
        break;
      }
      
      // If there is a marker here
      if (state.markers[pKey]) {
        jumpedMarkers = true;
      } else {
        // Empty space
        moves.push({ ...current });
        
        // If we jumped over markers, we MUST stop at the FIRST empty space. We cannot continue.
        if (jumpedMarkers) {
          break;
        }
      }
      current = { q: current.q + dir.dq, r: current.r + dir.dr };
    }
  });
  
  return moves;
};

export const performYinshMove = (state: YinshState, from: YinshPoint, to: YinshPoint, playerId: PlayerId): YinshState => {
  const newState: YinshState = {
    ...state,
    rings: state.rings.map(r => r.q === from.q && r.r === from.r ? { ...r, q: to.q, r: to.r } : r),
    markers: { ...state.markers }, // Copy markers
    lastMove: { from, to, timestamp: Date.now() }
  };
  
  // A marker is left behind at the ring's starting point
  newState.markers[`${from.q},${from.r}`] = playerId;
  
  const dir = getDirection(from, to);
  if (!dir) return newState; // Fallback, shouldn't happen for valid moves

  // Flip jumped markers
  let curr = { q: from.q + dir.dq, r: from.r + dir.dr };
  while (curr.q !== to.q || curr.r !== to.r) {
    const key = `${curr.q},${curr.r}`;
    if (newState.markers[key]) {
      // Flip marker
      newState.markers[key] = newState.markers[key] === 1 ? 2 : 1;
    }
    curr.q += dir.dq;
    curr.r += dir.dr;
  }
  
  return newState;
};

export const checkYinshLines = (state: YinshState): { points: YinshPoint[]; playerId: PlayerId }[] => {
  const lines: { points: YinshPoint[]; playerId: PlayerId }[] = [];
  const validPoints = getYinshValidPoints();
  const checked = new Set<string>();

  const directions = [
    { dq: 1, dr: 0 },
    { dq: 0, dr: 1 },
    { dq: 1, dr: -1 }
  ];

  directions.forEach(dir => {
    validPoints.forEach(p => {
      const startKey = `${p.q},${p.r}`;
      const color = state.markers[startKey];
      if (!color) return;

      let count = 1;
      let curr = { q: p.q + dir.dq, r: p.r + dir.dr };
      const currentLine = [p];

      while (true) {
        const key = `${curr.q},${curr.r}`;
        if (state.markers[key] === color) {
          count++;
          currentLine.push({ ...curr });
          curr = { q: curr.q + dir.dq, r: curr.r + dir.dr };
        } else {
          break;
        }
      }

      if (count >= 5) {
        // If it's a line of exactly 5, or larger? Rules: "align 5 markers". If line is 6, the player chooses which 5 to remove.
        // Let's just return sequences of exactly 5. If it's 6, there are 2 overlapping sequences of 5.
        // For simplicity, we can extract all contiguous sequences of exactly 5.
        for (let i = 0; i <= currentLine.length - 5; i++) {
          const slice = currentLine.slice(i, i + 5);
          const sliceKey = slice.map(pt => `${pt.q},${pt.r}`).join('|');
          if (!checked.has(sliceKey)) {
            checked.add(sliceKey);
            lines.push({ points: slice, playerId: color });
          }
        }
      }
    });
  });

  return lines;
};

export const getBestYinshMoveForAI = (state: YinshState, playerId: PlayerId, difficulty: 'facile' | 'normale' | 'difficile' | 'estrema' | 'maestro' = 'facile'): { action: 'place_ring' | 'place_marker' | 'move_ring' | 'remove_markers' | 'remove_ring', pt?: YinshPoint, from?: YinshPoint, to?: YinshPoint, row?: YinshPoint[] } | null => {
  const validPoints = getYinshValidPoints();

  if (state.phase === 'place_ring') {
    const emptyPoints = validPoints.filter(p => !state.rings.some(r => r.q === p.q && r.r === p.r));
    if (emptyPoints.length === 0) return null;
    
    if (difficulty === 'facile') {
      return { action: 'place_ring', pt: emptyPoints[Math.floor(Math.random() * emptyPoints.length)] };
    } else if (difficulty === 'normale') {
       emptyPoints.sort((a, b) => {
         const distA = Math.max(Math.abs(a.q), Math.abs(a.r), Math.abs(-a.q - a.r));
         const distB = Math.max(Math.abs(b.q), Math.abs(b.r), Math.abs(-b.q - b.r));
         return distA - distB;
       });
       const topChoice = emptyPoints.slice(0, 3);
       return { action: 'place_ring', pt: topChoice[Math.floor(Math.random() * topChoice.length)] };
    } else {
       const myRings = state.rings.filter(r => r.playerId === playerId);
       let bestPt: YinshPoint | null = null;
       let bestObj = -Infinity;

       for (const pt of emptyPoints) {
          const distFromCenter = Math.max(Math.abs(pt.q), Math.abs(pt.r), Math.abs(-pt.q - pt.r));
          let minDistToMine = Infinity;
          for (const myR of myRings) {
             const d = Math.max(Math.abs(pt.q - myR.q), Math.abs(pt.r - myR.r), Math.abs((-pt.q - pt.r) - (-myR.q - myR.r)));
             if (d < minDistToMine) minDistToMine = d;
          }
          
          let spacingBonus = 0;
          if (minDistToMine !== Infinity) {
             if (minDistToMine === 1) spacingBonus = -2;
             else if (minDistToMine === 2) spacingBonus = 2;
             else if (minDistToMine === 3) spacingBonus = 1;
             else spacingBonus = -0.5;
          }
          
          let obj = -distFromCenter + spacingBonus;
          obj += Math.random() * 0.1;
          
          if (obj > bestObj) {
            bestObj = obj;
            bestPt = pt;
          }
       }
       return { action: 'place_ring', pt: bestPt || emptyPoints[0] };
    }
  }

  if (state.phase === 'place_marker') {
    const myRings = state.rings.filter(r => r.playerId === playerId);
    if (myRings.length === 0) return null;
    
    const ringsWithMoves = myRings.map(r => ({ ring: r, moves: getValidYinshMoves(state, r) })).filter(rm => rm.moves.length > 0);
    if (ringsWithMoves.length === 0) return null;
    
    if (difficulty === 'facile') {
      // Facile: mostly random, but slightly biased towards flipping pieces
      const chosen = ringsWithMoves[Math.floor(Math.random() * ringsWithMoves.length)];
      const to = chosen.moves[Math.floor(Math.random() * chosen.moves.length)];
      return { action: 'place_marker', from: chosen.ring, to };
    } else {
      const oppId = playerId === 1 ? 2 : 1;
      const evaluateState = (st: YinshState) => {
        let sc = 0;
        let myM = 0; let oppM = 0;
        Object.values(st.markers).forEach(v => { if (v === playerId) myM++; else if (v === oppId) oppM++; });
        sc += (myM - oppM) * 2;
        const lines = checkYinshLines(st);
        const myL = lines.filter(l => l.playerId === playerId).length;
        const oppL = lines.filter(l => l.playerId === oppId).length;
        sc += myL * 1000;
        sc -= oppL * 1000;
        return sc;
      };

      let bestMove: {from: YinshPoint, to: YinshPoint} | null = null;
      let bestScore = -Infinity;
      
      for (const {ring, moves} of ringsWithMoves) {
        for (const move of moves) {
          const testState = performYinshMove(state, ring, move, playerId);
          let score = evaluateState(testState);
          
          if (difficulty === 'estrema') {
            // Minimax Depth 2 (Opponent's best response)
            let minOppScore = Infinity;
            const oppRings = testState.rings.filter(r => r.playerId === oppId);
            const oppRingsWithMoves = oppRings.map(r => ({ ring: r, moves: getValidYinshMoves(testState, r) })).filter(rm => rm.moves.length > 0);
            
            // To save time, we only evaluate a sample or all if it's fast. 5 rings * 10 moves = 50. 
            for (const oppRm of oppRingsWithMoves) {
              for (const oppMove of oppRm.moves) {
                const oppTestState = performYinshMove(testState, oppRm.ring, oppMove, oppId);
                const oppScore = evaluateState(oppTestState);
                if (oppScore < minOppScore) minOppScore = oppScore;
              }
            }
            if (minOppScore !== Infinity) {
              score = minOppScore;
            }
          }

          if (difficulty === 'difficile' || difficulty === 'estrema') {
             // add small weight to center control for the ring's final position
             const dist = Math.max(Math.abs(move.q), Math.abs(move.r), Math.abs(-move.q - move.r));
             score -= dist * 0.5;
             // reward having more rings close to center
             const myCenterRings = testState.rings.filter(r => r.playerId === playerId).reduce((acc, r) => acc - Math.max(Math.abs(r.q), Math.abs(r.r), Math.abs(-r.q - r.r)), 0);
             score += myCenterRings * 0.2;
          }
          
          // Small random factor to break ties
          score += Math.random() * 0.1;

          if (score > bestScore) {
            bestScore = score;
            bestMove = { from: ring, to: move };
          }
        }
      }
      
      if (bestMove) {
        return { action: 'place_marker', from: bestMove.from, to: bestMove.to };
      }
      const chosen = ringsWithMoves[0];
      return { action: 'place_marker', from: chosen.ring, to: chosen.moves[0] };
    }
  }

  if (state.phase === 'remove_markers') {
    const myRows = state.activeRows.filter(r => r.playerId === playerId);
    if (myRows.length > 0) {
      return { action: 'remove_markers', row: myRows[0].points };
    }
  }

  if (state.phase === 'remove_ring') {
    const myRings = state.rings.filter(r => r.playerId === playerId);
    if (myRings.length > 0) {
      if (difficulty !== 'facile') {
         myRings.sort((a, b) => {
           const distA = Math.max(Math.abs(a.q), Math.abs(a.r), Math.abs(-a.q - a.r));
           const distB = Math.max(Math.abs(b.q), Math.abs(b.r), Math.abs(-b.q - b.r));
           return distB - distA; // Remove the one furthest from center
         });
      }
      return { action: 'remove_ring', pt: myRings[0] };
    }
  }

  return null;
};



