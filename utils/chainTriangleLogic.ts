import { Peg, Triangle, RubberBand } from '../types';

// Generate the 37 pegs (hex grid of radius 3)
export function generateTriggleBoard(): Peg[] {
  const pegs: Peg[] = [];
  const mapRadius = 3;

  for (let q = -mapRadius; q <= mapRadius; q++) {
    const r1 = Math.max(-mapRadius, -q - mapRadius);
    const r2 = Math.min(mapRadius, -q + mapRadius);
    for (let r = r1; r <= r2; r++) {
      pegs.push({ q, r, s: -q - r });
    }
  }

  return pegs;
}

// Get standard string ID for an edge between two pegs
export function getEdgeId(p1: Peg, p2: Peg): string {
  // Sort pegs so edge ID is consistent regardless of order
  const p1Str = `${p1.q},${p1.r},${p1.s}`;
  const p2Str = `${p2.q},${p2.r},${p2.s}`;
  return p1Str < p2Str ? `${p1Str}|${p2Str}` : `${p2Str}|${p1Str}`;
}

// Peg distance in hex grid
export function hexDistance(a: Peg, b: Peg): number {
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

// Linear interpolation between two values
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexRound(q: number, r: number, s: number): Peg {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

// Returns the 4 pegs if the distance is 3 and they form a straight line
// Wait, we need to verify all middle pegs exist on board too.
// Since board is convex, if start and end are on board, middle points are on board.
export function getLineOfPegs(a: Peg, b: Peg): Peg[] | null {
  const dist = hexDistance(a, b);
  if (dist !== 3) return null; // A valid chain triangle rubber band is exactly 3 long (4 pegs)

  // Must be a straight line along one of the three primary axes
  if (a.q !== b.q && a.r !== b.r && a.s !== b.s) return null;

  const pegs: Peg[] = [];
  for (let i = 0; i <= dist; i++) {
    const t = i / dist;
    const q = lerp(a.q, b.q, t);
    const r = lerp(a.r, b.r, t);
    const s = lerp(a.s, b.s, t);
    pegs.push(hexRound(q, r, s));
  }
  return pegs;
}

// Check if 4 pegs form a valid collinear line
export function isValidRubberBand(pegs: Peg[]): boolean {
  if (pegs.length !== 4) return false;

  // Sorting pegs makes it easier to verify they are in a contiguous line
  const sorted = [...pegs].sort((a, b) => {
    if (a.q !== b.q) return a.q - b.q;
    if (a.r !== b.r) return a.r - b.r;
    return a.s - b.s;
  });

  // Verify they form a straight line with distance 1 between adjacent nodes
  for (let i = 0; i < 3; i++) {
    if (hexDistance(sorted[i], sorted[i + 1]) !== 1) return false;
  }

  // To ensure they are collinear, the total distance from start to end must be 3
  if (hexDistance(sorted[0], sorted[3]) !== 3) return false;

  return true;
}

export function generateAllTriangles(pegs: Peg[]): Triangle[] {
  const triangles: Triangle[] = [];
  const pegSet = new Set(pegs.map(p => `${p.q},${p.r},${p.s}`));

  pegs.forEach(p => {
    // Type 1 (Up triangles): (q, r), (q+1, r), (q, r+1)
    const t1p2 = { q: p.q + 1, r: p.r,     s: -(p.q + 1) - p.r };
    const t1p3 = { q: p.q,     r: p.r + 1, s: -p.q - (p.r + 1) };

    if (pegSet.has(`${t1p2.q},${t1p2.r},${t1p2.s}`) && pegSet.has(`${t1p3.q},${t1p3.r},${t1p3.s}`)) {
      triangles.push({
        id: `T1:${p.q},${p.r}`,
        pegs: [p, t1p2, t1p3],
        edges: [getEdgeId(p, t1p2), getEdgeId(t1p2, t1p3), getEdgeId(t1p3, p)],
        ownerId: null
      });
    }

    // Type 2 (Down triangles): (q, r), (q+1, r), (q+1, r-1)
    const t2p2 = { q: p.q + 1, r: p.r,     s: -(p.q + 1) - p.r };
    const t2p3 = { q: p.q + 1, r: p.r - 1, s: -(p.q + 1) - (p.r - 1) };

    if (pegSet.has(`${t2p2.q},${t2p2.r},${t2p2.s}`) && pegSet.has(`${t2p3.q},${t2p3.r},${t2p3.s}`)) {
      triangles.push({
        id: `T2:${p.q},${p.r}`,
        pegs: [p, t2p2, t2p3],
        edges: [getEdgeId(p, t2p2), getEdgeId(t2p2, t2p3), getEdgeId(t2p3, p)],
        ownerId: null
      });
    }
  });

  return triangles;
}

export function getEdgesFromPegs(pegs: Peg[]): string[] {
  if (!isValidRubberBand(pegs)) return [];

  const sorted = [...pegs].sort((a, b) => {
    if (a.q !== b.q) return a.q - b.q;
    if (a.r !== b.r) return a.r - b.r;
    return a.s - b.s;
  });

  return [
    getEdgeId(sorted[0], sorted[1]),
    getEdgeId(sorted[1], sorted[2]),
    getEdgeId(sorted[2], sorted[3])
  ];
}

export function hasValidChainTriangleMoves(chainState: any): boolean {
  if (!chainState) return false;
  const pegs = generateTriggleBoard();
  const existingRubberBandIds = new Set(chainState.rubberBands.map((rb: any) => rb.id));

  for (let i = 0; i < pegs.length; i++) {
    for (let j = i + 1; j < pegs.length; j++) {
      const line = getLineOfPegs(pegs[i], pegs[j]);
      if (line) {
        const rubberBandId = getEdgeId(line[0], line[3]);
        if (!existingRubberBandIds.has(rubberBandId)) {
          return true; // Found at least one valid move
        }
      }
    }
  }
  return false;
}

// AI Logic for Chain Triangle
export function getBestChainTriangleMoveForAI(gameState: any, playerId: number, difficulty: string): { p1: Peg, p2: Peg, line: Peg[] } | null {
  const chainState = gameState.chainTriangleState;
  if (!chainState) return null;

  const pegs = generateTriggleBoard();
  const allPossibleMoves: { p1: Peg, p2: Peg, line: Peg[], edges: string[], score: number, giveAway: number }[] = [];

  const existingRubberBandIds = new Set(chainState.rubberBands.map((rb: any) => rb.id));
  const coveredEdges = new Set<string>();
  chainState.rubberBands.forEach((rb: any) => { rb.edges.forEach((e: string) => coveredEdges.add(e)) });

  // Generate all valid moves
  for (let i = 0; i < pegs.length; i++) {
    for (let j = i + 1; j < pegs.length; j++) {
      const line = getLineOfPegs(pegs[i], pegs[j]);
      if (line) {
        const rubberBandId = getEdgeId(line[0], line[3]);
        if (!existingRubberBandIds.has(rubberBandId)) {
          allPossibleMoves.push({
            p1: pegs[i],
            p2: pegs[j],
            line,
            edges: getEdgesFromPegs(line),
            score: 0,
            giveAway: 0
          });
        }
      }
    }
  }

  if (allPossibleMoves.length === 0) return null;

  // Evaluate each move
  allPossibleMoves.forEach(move => {
    const projectedEdges = new Set(coveredEdges);
    move.edges.forEach(e => projectedEdges.add(e));

    let trianglesCompleted = 0;
    
    chainState.triangles.forEach((tri: any) => {
      if (tri.ownerId === null) {
        const currentlyCovered = tri.edges.filter((e: string) => coveredEdges.has(e)).length;
        const projectedCovered = tri.edges.filter((e: string) => projectedEdges.has(e)).length;

        if (projectedCovered === 3 && currentlyCovered < 3) {
          trianglesCompleted++;
        }
      }
    });

    move.score = trianglesCompleted;

    // Simulate opponent's next turn to see if we gave away a triangle
    if (move.score === 0) { // Only care about giveaways if we don't complete a triangle (since completing gives us another turn anyway!)
      chainState.triangles.forEach((tri: any) => {
        if (tri.ownerId === null) {
          const projectedCovered = tri.edges.filter((e: string) => projectedEdges.has(e)).length;
          if (projectedCovered === 2) {
            move.giveAway++; // We left a triangle with 2 edges done, opponent can claim it!
          }
        }
      });
    }
  });

  // Sort moves
  // Greedily pick moves that complete triangles
  const winningMoves = allPossibleMoves.filter(m => m.score > 0);
  if (winningMoves.length > 0) {
    // Pick the one that completes the most triangles, or random
    winningMoves.sort((a, b) => b.score - a.score);
    const bestScore = winningMoves[0].score;
    const bestMoves = winningMoves.filter(m => m.score === bestScore);
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  // Otherwise, filter out moves that give away triangles
  const safeMoves = allPossibleMoves.filter(m => m.giveAway === 0);
  
  let candidates = safeMoves.length > 0 ? safeMoves : allPossibleMoves;

  if (difficulty === 'facile' && winningMoves.length === 0) {
      if (Math.random() < 0.4) {
          candidates = allPossibleMoves;
      }
  } else if (difficulty === 'normale' && winningMoves.length === 0) {
      if (Math.random() < 0.15) {
          candidates = allPossibleMoves;
      }
  } else if ((difficulty === 'difficile' || difficulty === 'estrema') && safeMoves.length === 0) {
      // Forced to give away. Minimize the number of triangles given away!
      allPossibleMoves.sort((a, b) => a.giveAway - b.giveAway);
      const minGiveAway = allPossibleMoves[0].giveAway;
      candidates = allPossibleMoves.filter(m => m.giveAway === minGiveAway);
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}
