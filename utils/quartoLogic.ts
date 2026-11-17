import { Difficulty, PlayerId, Point } from '../types';

/**
 * Each of the 16 Quarto pieces is uniquely represented by an integer 0..15 (4 bits):
 * - Bit 0 (1): color  -> 0 = light (Chiaro), 1 = dark (Scuro)
 * - Bit 1 (2): height -> 0 = short (Basso),  1 = tall (Alto)
 * - Bit 2 (4): shape  -> 0 = round (Cilindrico), 1 = square (Parallelepipedo)
 * - Bit 3 (8): top    -> 0 = solid (Pieno),  1 = hollow (Forato)
 */
export interface QuartoPieceAttributes {
  id: number;
  isDark: boolean;   // false = Chiaro, true = Scuro
  isTall: boolean;   // false = Basso, true = Alto
  isSquare: boolean; // false = Cilindrico, true = Parallelepipedo
  isHollow: boolean; // false = Pieno, true = Forato
}

export interface QuartoState {
  /** 4x4 board containing piece IDs (0..15) or null if empty */
  board: (number | null)[][];
  /** Piece IDs (0..15) remaining in the reserve */
  availablePieces: number[];
  /** Piece ID currently handed to the active player to place on the board */
  selectedPiece: number | null;
  /**
   * 'select_piece': currentPlayer chooses a piece from availablePieces to hand to opponent
   * 'place_piece': currentPlayer places selectedPiece onto an empty cell of the 4x4 board
   */
  phase: 'select_piece' | 'place_piece';
  /** Winner PlayerId (1 | 2), 'draw', or null if ongoing */
  winner: PlayerId | 'draw' | null;
  /** Coordinates of the 4 winning cells if won */
  winningLine?: Point[];
  /** List of shared attribute keys that triggered the Quarto win */
  winningAttributes?: string[];
  /** Last placed cell coordinates for visual highlight & animation */
  lastPlacedCell?: { r: number; c: number; pieceId: number; playerId: PlayerId } | null;
  /** Who selected the current selectedPiece */
  selectedByPlayerId?: PlayerId | null;
}

export function getQuartoPieceAttributes(pieceId: number): QuartoPieceAttributes {
  return {
    id: pieceId,
    isDark: (pieceId & 1) !== 0,
    isTall: (pieceId & 2) !== 0,
    isSquare: (pieceId & 4) !== 0,
    isHollow: (pieceId & 8) !== 0,
  };
}

export function createInitialQuartoState(): QuartoState {
  return {
    board: [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ],
    availablePieces: Array.from({ length: 16 }, (_, i) => i),
    selectedPiece: null,
    phase: 'select_piece',
    winner: null,
    winningLine: undefined,
    winningAttributes: undefined,
    lastPlacedCell: null,
    selectedByPlayerId: null,
  };
}

/** All 10 possible winning lines of 4 cells on the 4x4 board */
export const QUARTO_LINES: Point[][] = [
  // 4 Rows
  [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
  [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }],
  [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }],
  [{ r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 }],
  // 4 Columns
  [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }],
  [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }, { r: 3, c: 1 }],
  [{ r: 0, c: 2 }, { r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }],
  [{ r: 0, c: 3 }, { r: 1, c: 3 }, { r: 2, c: 3 }, { r: 3, c: 3 }],
  // 2 Diagonals
  [{ r: 0, c: 0 }, { r: 1, c: 1 }, { r: 2, c: 2 }, { r: 3, c: 3 }],
  [{ r: 0, c: 3 }, { r: 1, c: 2 }, { r: 2, c: 1 }, { r: 3, c: 0 }],
];

/**
 * Returns the bitmask of shared attributes among 4 piece IDs (0..15).
 * Returns 0 if no attribute is shared.
 */
export function getSharedMask4(p0: number, p1: number, p2: number, p3: number): number {
  const allOnes = p0 & p1 & p2 & p3;
  const allZeros = (~p0 & ~p1 & ~p2 & ~p3) & 0x0f;
  return allOnes | allZeros;
}

/**
 * Returns human-readable attribute labels for a winning line of 4 pieces
 */
export function getSharedAttributeNames(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  lang: string = 'it'
): string[] {
  const allOnes = p0 & p1 & p2 & p3;
  const allZeros = (~p0 & ~p1 & ~p2 & ~p3) & 0x0f;
  const attrs: string[] = [];

  if (allZeros & 1) {
    attrs.push(
      lang === 'it' ? 'Chiari' : lang === 'fr' ? 'Clairs' : lang === 'de' ? 'Helle' : lang === 'es' ? 'Claras' : 'Light'
    );
  }
  if (allOnes & 1) {
    attrs.push(
      lang === 'it' ? 'Scuri' : lang === 'fr' ? 'Foncés' : lang === 'de' ? 'Dunkle' : lang === 'es' ? 'Oscuras' : 'Dark'
    );
  }
  if (allZeros & 2) {
    attrs.push(
      lang === 'it' ? 'Bassi' : lang === 'fr' ? 'Petits' : lang === 'de' ? 'Kleine' : lang === 'es' ? 'Bajas' : 'Short'
    );
  }
  if (allOnes & 2) {
    attrs.push(
      lang === 'it' ? 'Alti' : lang === 'fr' ? 'Grands' : lang === 'de' ? 'Große' : lang === 'es' ? 'Altas' : 'Tall'
    );
  }
  if (allZeros & 4) {
    attrs.push(
      lang === 'it' ? 'Cilindrici' : lang === 'fr' ? 'Ronds' : lang === 'de' ? 'Runde' : lang === 'es' ? 'Cilíndricas' : 'Round'
    );
  }
  if (allOnes & 4) {
    attrs.push(
      lang === 'it' ? 'Squadrati' : lang === 'fr' ? 'Carrés' : lang === 'de' ? 'Eckige' : lang === 'es' ? 'Cuadradas' : 'Square'
    );
  }
  if (allZeros & 8) {
    attrs.push(
      lang === 'it' ? 'Pieni' : lang === 'fr' ? 'Pleins' : lang === 'de' ? 'Massive' : lang === 'es' ? 'Sólidas' : 'Solid'
    );
  }
  if (allOnes & 8) {
    attrs.push(
      lang === 'it' ? 'Forati' : lang === 'fr' ? 'Creux' : lang === 'de' ? 'Hohle' : lang === 'es' ? 'Huecas' : 'Hollow'
    );
  }

  return attrs;
}

/**
 * Checks if the board currently has a winning line of 4 pieces with at least 1 shared attribute.
 */
export function checkQuartoWin(
  board: (number | null)[][],
  lang: string = 'it'
): { won: boolean; line?: Point[]; attributes?: string[] } {
  for (const line of QUARTO_LINES) {
    const p0 = board[line[0].r][line[0].c];
    const p1 = board[line[1].r][line[1].c];
    const p2 = board[line[2].r][line[2].c];
    const p3 = board[line[3].r][line[3].c];
    if (p0 !== null && p1 !== null && p2 !== null && p3 !== null) {
      if (getSharedMask4(p0, p1, p2, p3) !== 0) {
        return {
          won: true,
          line,
          attributes: getSharedAttributeNames(p0, p1, p2, p3, lang),
        };
      }
    }
  }
  return { won: false };
}

/**
 * Fast check if placing `pieceId` at `(r, c)` creates a Quarto along row `r`, col `c`, or diagonals.
 */
export function doesPlacementWin(
  board: (number | null)[][],
  r: number,
  c: number,
  pieceId: number
): boolean {
  // Check row r
  let rowFull = true;
  const rowPieces: number[] = [];
  for (let cc = 0; cc < 4; cc++) {
    const v = cc === c ? pieceId : board[r][cc];
    if (v === null) {
      rowFull = false;
      break;
    }
    rowPieces.push(v);
  }
  if (rowFull && getSharedMask4(rowPieces[0], rowPieces[1], rowPieces[2], rowPieces[3]) !== 0) {
    return true;
  }

  // Check col c
  let colFull = true;
  const colPieces: number[] = [];
  for (let rr = 0; rr < 4; rr++) {
    const v = rr === r ? pieceId : board[rr][c];
    if (v === null) {
      colFull = false;
      break;
    }
    colPieces.push(v);
  }
  if (colFull && getSharedMask4(colPieces[0], colPieces[1], colPieces[2], colPieces[3]) !== 0) {
    return true;
  }

  // Check main diagonal
  if (r === c) {
    let diagFull = true;
    const dPieces: number[] = [];
    for (let i = 0; i < 4; i++) {
      const v = i === r ? pieceId : board[i][i];
      if (v === null) {
        diagFull = false;
        break;
      }
      dPieces.push(v);
    }
    if (diagFull && getSharedMask4(dPieces[0], dPieces[1], dPieces[2], dPieces[3]) !== 0) {
      return true;
    }
  }

  // Check anti-diagonal
  if (r + c === 3) {
    let antiFull = true;
    const aPieces: number[] = [];
    for (let i = 0; i < 4; i++) {
      const v = i === r ? pieceId : board[i][3 - i];
      if (v === null) {
        antiFull = false;
        break;
      }
      aPieces.push(v);
    }
    if (antiFull && getSharedMask4(aPieces[0], aPieces[1], aPieces[2], aPieces[3]) !== 0) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if ANY empty cell on `board` would win immediately with `pieceId`.
 */
export function canPieceWinImmediately(board: (number | null)[][], pieceId: number): Point | null {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === null && doesPlacementWin(board, r, c, pieceId)) {
        return { r, c };
      }
    }
  }
  return null;
}

/**
 * Heuristic evaluation of a board position AFTER a placement, before selecting the next piece to give opponent.
 * Higher score is better for the player who is about to SELECT a piece to hand to the opponent.
 */
function evaluatePositionForSelector(
  board: (number | null)[][],
  availablePieces: number[]
): number {
  if (availablePieces.length === 0) return 0;

  // Count how many available pieces are "safe" (do NOT allow opponent to win immediately)
  let safePiecesCount = 0;
  const winningMaskByPiece = new Uint8Array(16);

  // Inspect all 10 lines for 3-in-a-row threats and 2-in-a-row setups
  let activeThreats = 0;
  let twoInRowLines = 0;

  for (const line of QUARTO_LINES) {
    let count = 0;
    let onesMask = 0x0f;
    let zerosMask = 0x0f;
    for (let i = 0; i < 4; i++) {
      const val = board[line[i].r][line[i].c];
      if (val !== null) {
        count++;
        onesMask &= val;
        zerosMask &= ~val & 0x0f;
      }
    }
    const shared = onesMask | zerosMask;
    if (shared === 0) continue;

    if (count === 3) {
      activeThreats++;
      for (const p of availablePieces) {
        if (((p & onesMask) | ((~p & 0x0f) & zerosMask)) !== 0) {
          winningMaskByPiece[p] = 1;
        }
      }
    } else if (count === 2) {
      twoInRowLines += countBits(shared);
    }
  }

  for (const p of availablePieces) {
    if (!winningMaskByPiece[p]) {
      safePiecesCount++;
    }
  }

  // If NO safe pieces exist, the selector is forced to hand a winning piece to the opponent!
  if (safePiecesCount === 0) {
    return -950;
  }

  // If safe pieces exist, having odd vs even safe pieces or creating multiple threats while keeping a safe piece is strong
  let score = 0;
  // Having only 1 or 3 safe pieces left can create parity traps
  if (safePiecesCount % 2 === 1) score += 18;
  score += activeThreats * 14;
  score += twoInRowLines * 4;

  return score;
}

function countBits(n: number): number {
  let c = 0;
  let v = n;
  while (v) {
    c += v & 1;
    v >>= 1;
  }
  return c;
}

/**
 * Combined turn step in Quarto:
 * Given `board`, `pieceToPlace`, and `availablePieces`, the active player:
 * 1. Places `pieceToPlace` at `(r, c)`.
 * 2. If that wins, score = +1000.
 * 3. Otherwise, chooses `nextPiece` from `availablePieces` to hand to opponent.
 *
 * We use Negamax with Alpha-Beta pruning over full turns (Place + Select).
 */
function negamaxQuarto(
  board: (number | null)[][],
  pieceToPlace: number,
  availablePieces: number[],
  depth: number,
  alpha: number,
  beta: number,
  startTime: number,
  timeLimitMs: number
): number {
  if (Date.now() - startTime > timeLimitMs) {
    return 0;
  }

  const emptyCells: Point[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === null) {
        // Immediate win check!
        if (doesPlacementWin(board, r, c, pieceToPlace)) {
          return 1000 + depth * 10;
        }
        emptyCells.push({ r, c });
      }
    }
  }

  if (emptyCells.length === 0) {
    return 0;
  }

  // If this is the very last cell on the board and it didn't win, it's a draw
  if (emptyCells.length === 1 || availablePieces.length === 0) {
    return 0;
  }

  if (depth <= 0 || Date.now() - startTime > timeLimitMs) {
    // Evaluate best placement statically (sample top central cells for speed)
    let bestStatic = -1000;
    const limit = Math.min(emptyCells.length, 6);
    for (let i = 0; i < limit; i++) {
      const cell = emptyCells[i];
      board[cell.r][cell.c] = pieceToPlace;
      const val = evaluatePositionForSelector(board, availablePieces);
      board[cell.r][cell.c] = null;
      if (val > bestStatic) bestStatic = val;
    }
    return bestStatic;
  }

  let bestScore = -Infinity;

  // Order cells: center cells first
  emptyCells.sort((a, b) => {
    const da = Math.abs(a.r - 1.5) + Math.abs(a.c - 1.5);
    const db = Math.abs(b.r - 1.5) + Math.abs(b.c - 1.5);
    return da - db;
  });

  for (const cell of emptyCells) {
    if (Date.now() - startTime > timeLimitMs) break;

    board[cell.r][cell.c] = pieceToPlace;

    // Filter availablePieces into those that don't give opponent an immediate 1-move win
    const safeNextPieces: number[] = [];
    for (const nextP of availablePieces) {
      if (!canPieceWinImmediately(board, nextP)) {
        safeNextPieces.push(nextP);
      }
    }

    if (safeNextPieces.length === 0) {
      // Every remaining piece lets the opponent win immediately on their turn!
      const forcedLossScore = -(1000 + (depth - 1) * 10);
      if (forcedLossScore > bestScore) bestScore = forcedLossScore;
    } else {
      // Try candidate pieces to hand to opponent (limit branching for mobile responsiveness)
      const candidates =
        safeNextPieces.length > 5
          ? safeNextPieces.slice(0, 5)
          : safeNextPieces;

      for (const nextP of candidates) {
        if (Date.now() - startTime > timeLimitMs) break;
        const nextAvail = availablePieces.filter((p) => p !== nextP);
        const score = -negamaxQuarto(
          board,
          nextP,
          nextAvail,
          depth - 1,
          -beta,
          -alpha,
          startTime,
          timeLimitMs
        );
        if (score > bestScore) bestScore = score;
        if (bestScore > alpha) alpha = bestScore;
        if (alpha >= beta) break;
      }
    }

    board[cell.r][cell.c] = null;
    if (alpha >= beta) break;
  }

  return bestScore === -Infinity ? 0 : bestScore;
}

/**
 * Computes the AI's action for Quarto based on current phase and difficulty:
 * - InSetup/Semplice ('facile' | 'normale'): light tactical check + randomness
 * - Medio ('difficile'): 1-2 ply tactical search, never hands immediate winning piece if avoidable
 * - Difficile ('estrema' | 'maestro'): deep Alpha-Beta Negamax search with endgame solver
 */
export function getBestQuartoMoveForAI(
  state: QuartoState,
  difficulty: Difficulty
): { type: 'place'; r: number; c: number } | { type: 'select'; pieceId: number } | null {
  const board = state.board.map((row) => [...row]);
  const available = [...state.availablePieces];

  const isSimple = difficulty === 'facile' || difficulty === 'normale';
  const isMedium = difficulty === 'difficile';

  if (state.phase === 'place_piece') {
    const pieceId = state.selectedPiece;
    if (pieceId === null) return null;

    const emptyCells: Point[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === null) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length === 0) return null;

    // 1. Check immediate winning move
    for (const cell of emptyCells) {
      if (doesPlacementWin(board, cell.r, cell.c, pieceId)) {
        // In simple mode, small chance to miss a non-obvious win if many pieces on board
        if (!isSimple || Math.random() < 0.85) {
          return { type: 'place', r: cell.r, c: cell.c };
        }
      }
    }

    // Opening shortcut: when 13+ cells are empty (at most 3 pieces on board), pick a varied cell immediately
    if (emptyCells.length >= 13) {
      const weighted = emptyCells.map((cell) => ({
        cell,
        key: Math.abs(cell.r - 1.5) + Math.abs(cell.c - 1.5) + Math.random() * 2.2,
      }));
      weighted.sort((a, b) => a.key - b.key);
      for (const item of weighted) {
        board[item.cell.r][item.cell.c] = pieceId;
        const hasSafe = available.some((p) => !canPieceWinImmediately(board, p));
        board[item.cell.r][item.cell.c] = null;
        if (hasSafe) {
          return { type: 'place', r: item.cell.r, c: item.cell.c };
        }
      }
      return { type: 'place', r: weighted[0].cell.r, c: weighted[0].cell.c };
    }

    // Simple mode: pick a cell that leaves at least one safe piece (75% of time), otherwise random
    if (isSimple) {
      const shuffled = [...emptyCells]
        .map((c) => ({ c, sortKey: Math.random() }))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((x) => x.c);
      for (const cell of shuffled) {
        board[cell.r][cell.c] = pieceId;
        const hasSafe = available.some((p) => !canPieceWinImmediately(board, p));
        board[cell.r][cell.c] = null;
        if (hasSafe && Math.random() < 0.75) {
          return { type: 'place', r: cell.r, c: cell.c };
        }
      }
      return { type: 'place', r: shuffled[0].r, c: shuffled[0].c };
    }

    // Medium & Hard mode: evaluate each cell using negamax
    const searchDepth = isMedium
      ? 1
      : emptyCells.length <= 6
        ? 4 // Solve endgame fast without blocking UI
        : emptyCells.length <= 9
          ? 2
          : 1;
    const startTime = Date.now();
    const timeLimitMs = isMedium ? 120 : 220;

    let bestCell = emptyCells[0];
    let bestVal = -Infinity;
    const scoredCells: { cell: Point; val: number }[] = [];

    // Sort with precomputed random keys (transitive comparator for V8 TimSort)
    const earlySpread = emptyCells.length >= 11 ? 1.5 : 0.35;
    const orderedCells = emptyCells
      .map((cell) => ({
        cell,
        sortKey: Math.abs(cell.r - 1.5) + Math.abs(cell.c - 1.5) + Math.random() * earlySpread,
      }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((x) => x.cell);

    for (const cell of orderedCells) {
      if (Date.now() - startTime > timeLimitMs && scoredCells.length > 0) break;

      board[cell.r][cell.c] = pieceId;

      const safeNextPieces = available.filter((p) => !canPieceWinImmediately(board, p));
      let cellBestVal = -Infinity;

      if (safeNextPieces.length === 0) {
        cellBestVal = -990;
      } else {
        const shuffledSafeNext = safeNextPieces
          .map((p) => ({ p, k: Math.random() }))
          .sort((a, b) => a.k - b.k)
          .map((x) => x.p);
        const candidates =
          shuffledSafeNext.length > 5
            ? shuffledSafeNext.slice(0, 5)
            : shuffledSafeNext;

        for (const nextP of candidates) {
          if (Date.now() - startTime > timeLimitMs && cellBestVal > -Infinity) break;
          const nextAvail = available.filter((p) => p !== nextP);
          const val = -negamaxQuarto(
            board,
            nextP,
            nextAvail,
            searchDepth - 1,
            -Infinity,
            Infinity,
            startTime,
            timeLimitMs
          );
          if (val > cellBestVal) cellBestVal = val;
        }
      }

      board[cell.r][cell.c] = null;
      scoredCells.push({ cell, val: cellBestVal });

      if (cellBestVal > bestVal) {
        bestVal = cellBestVal;
        bestCell = cell;
      }
    }

    if (scoredCells.length > 1 && bestVal > -500) {
      const margin = emptyCells.length >= 10 ? 6 : 1;
      const topCells = scoredCells.filter((sc) => bestVal - sc.val <= margin && sc.val > -500);
      if (topCells.length > 1) {
        const picked = topCells[Math.floor(Math.random() * topCells.length)].cell;
        return { type: 'place', r: picked.r, c: picked.c };
      }
    }

    return { type: 'place', r: bestCell.r, c: bestCell.c };
  } else {
    // phase === 'select_piece'
    if (available.length === 0) return null;

    // Filter pieces that do NOT give the opponent an immediate 1-move win
    const safePieces = available.filter((p) => !canPieceWinImmediately(board, p));

    if (safePieces.length === 0) {
      // Forced to hand a winning piece; pick a random available piece
      const pick = available[Math.floor(Math.random() * available.length)];
      return { type: 'select', pieceId: pick };
    }

    if (isSimple) {
      // Simple mode: 80% pick a random safe piece, 20% pick any random piece
      const pool = Math.random() < 0.8 ? safePieces : available;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return { type: 'select', pieceId: pick };
    }

    // Medium & Hard mode: pick the safe piece that minimizes the opponent's best response
    let emptyCount = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === null) emptyCount++;
      }
    }

    // Opening optimization: when 12+ cells are empty (<= 4 pieces on board), safePieces is already 1-move safe
    if (emptyCount >= 12) {
      const pick = safePieces[Math.floor(Math.random() * safePieces.length)];
      return { type: 'select', pieceId: pick };
    }

    const searchDepth = isMedium
      ? 1
      : emptyCount <= 6
        ? 4
        : emptyCount <= 9
          ? 2
          : 1;
    const startTime = Date.now();
    const timeLimitMs = isMedium ? 120 : 220;

    let bestPiece = safePieces[0];
    let bestScore = -Infinity;
    const scoredPieces: { pieceId: number; score: number }[] = [];

    const shuffledSafe = safePieces
      .map((p) => ({ p, k: Math.random() }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.p);

    for (const candidatePiece of shuffledSafe) {
      if (Date.now() - startTime > timeLimitMs && scoredPieces.length > 0) break;
      const nextAvail = available.filter((p) => p !== candidatePiece);
      const score = -negamaxQuarto(
        board,
        candidatePiece,
        nextAvail,
        searchDepth - 1,
        -Infinity,
        Infinity,
        startTime,
        timeLimitMs
      );
      scoredPieces.push({ pieceId: candidatePiece, score });

      if (score > bestScore) {
        bestScore = score;
        bestPiece = candidatePiece;
      }
    }

    if (scoredPieces.length > 1 && bestScore > -500) {
      const margin = emptyCount >= 10 ? 6 : 1;
      const topSafe = scoredPieces.filter((sp) => bestScore - sp.score <= margin && sp.score > -500);
      if (topSafe.length > 1) {
        return {
          type: 'select',
          pieceId: topSafe[Math.floor(Math.random() * topSafe.length)].pieceId,
        };
      }
    }

    return { type: 'select', pieceId: bestPiece };
  }
}
