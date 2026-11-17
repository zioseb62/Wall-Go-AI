import { Difficulty, PlayerId } from '../types';

export type PylosLevel = 0 | 1 | 2 | 3;

export interface PylosCoord {
  level: PylosLevel;
  r: number;
  c: number;
}

export interface PylosState {
  // levels[0] = 4x4, levels[1] = 3x3, levels[2] = 2x2, levels[3] = 1x1
  levels: (PlayerId | null)[][][];
  reserve: {
    [key: number]: number;
    1: number;
    2: number;
  };
  phase: 'move' | 'recover';
  lineVariant: boolean;
  recoverCount: number; // 0, 1, or 2 spheres recovered so far in current recovery phase
  recoverPlayerId?: PlayerId;
  triggeredCells?: PylosCoord[];
  triggeredReason?: 'square' | 'line' | 'both';
  lastMove?: {
    type: 'place' | 'raise' | 'recover';
    from?: PylosCoord;
    to?: PylosCoord;
    recovered?: PylosCoord[];
    playerId: PlayerId;
  };
  winner?: PlayerId | null;
  winReason?: 'apex' | 'reserve_empty' | null;
}

export type PylosAIMove =
  | { type: 'place'; to: PylosCoord; recover: PylosCoord[] }
  | { type: 'raise'; from: PylosCoord; to: PylosCoord; recover: PylosCoord[] }
  | { type: 'recover_step'; coord: PylosCoord | null };

export const PYLOS_LEVEL_SIZES: Record<PylosLevel, number> = {
  0: 4,
  1: 3,
  2: 2,
  3: 1,
};

export const createInitialPylosState = (lineVariant: boolean = false): PylosState => ({
  levels: [
    Array.from({ length: 4 }, () => Array<PlayerId | null>(4).fill(null)),
    Array.from({ length: 3 }, () => Array<PlayerId | null>(3).fill(null)),
    Array.from({ length: 2 }, () => Array<PlayerId | null>(2).fill(null)),
    [[null]],
  ],
  reserve: { 1: 15, 2: 15 },
  phase: 'move',
  lineVariant,
  recoverCount: 0,
  winner: null,
  winReason: null,
});

export const cloneLevels = (levels: (PlayerId | null)[][][]): (PlayerId | null)[][][] =>
  levels.map((grid) => grid.map((row) => [...row]));

export const sameCoord = (a?: PylosCoord | null, b?: PylosCoord | null): boolean =>
  !!a && !!b && a.level === b.level && a.r === b.r && a.c === b.c;

export const isValidCoord = (coord: PylosCoord): boolean => {
  const size = PYLOS_LEVEL_SIZES[coord.level];
  return (
    size !== undefined &&
    coord.r >= 0 &&
    coord.r < size &&
    coord.c >= 0 &&
    coord.c < size
  );
};

/**
 * Checks whether (level, r, c) has 4 supporting spheres underneath (or is on level 0).
 */
export const isSlotSupported = (
  levels: (PlayerId | null)[][][],
  coord: PylosCoord
): boolean => {
  if (!isValidCoord(coord)) return false;
  if (coord.level === 0) return true;
  const below = levels[coord.level - 1];
  const { r, c } = coord;
  return (
    below[r][c] !== null &&
    below[r + 1][c] !== null &&
    below[r][c + 1] !== null &&
    below[r + 1][c + 1] !== null
  );
};

/**
 * Checks whether a sphere currently on the board is free (no sphere rests on top of it).
 */
export const isSphereFree = (
  levels: (PlayerId | null)[][][],
  coord: PylosCoord
): boolean => {
  if (!isValidCoord(coord)) return false;
  if (levels[coord.level][coord.r][coord.c] === null) return false;
  if (coord.level === 3) return false; // Apex ends the game immediately anyway
  const aboveLevel = (coord.level + 1) as PylosLevel;
  const aboveSize = PYLOS_LEVEL_SIZES[aboveLevel];
  const above = levels[aboveLevel];

  for (let dr = 0; dr <= 1; dr++) {
    for (let dc = 0; dc <= 1; dc++) {
      const ar = coord.r - dr;
      const ac = coord.c - dc;
      if (ar >= 0 && ar < aboveSize && ac >= 0 && ac < aboveSize) {
        if (above[ar][ac] !== null) return false;
      }
    }
  }
  return true;
};

export const getFreeSpheres = (
  levels: (PlayerId | null)[][][],
  playerId: PlayerId
): PylosCoord[] => {
  const res: PylosCoord[] = [];
  for (let level = 0 as PylosLevel; level <= 2; level = (level + 1) as PylosLevel) {
    const size = PYLOS_LEVEL_SIZES[level];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (levels[level][r][c] === playerId) {
          const coord: PylosCoord = { level, r, c };
          if (isSphereFree(levels, coord)) {
            res.push(coord);
          }
        }
      }
    }
  }
  return res;
};

export const getValidPlacementSlots = (
  levels: (PlayerId | null)[][][]
): PylosCoord[] => {
  const slots: PylosCoord[] = [];
  for (let level = 0 as PylosLevel; level <= 3; level = (level + 1) as PylosLevel) {
    const size = PYLOS_LEVEL_SIZES[level];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (levels[level][r][c] === null) {
          const coord: PylosCoord = { level, r, c };
          if (isSlotSupported(levels, coord)) {
            slots.push(coord);
          }
        }
      }
    }
  }
  return slots;
};

/**
 * Valid destinations when raising a free sphere from `from` to a strictly higher level.
 * Note: the sphere cannot be placed on a slot that depended on itself for support.
 */
export const getValidRaiseDestinations = (
  levels: (PlayerId | null)[][][],
  from: PylosCoord
): PylosCoord[] => {
  if (!isSphereFree(levels, from)) return [];
  const tempLevels = cloneLevels(levels);
  tempLevels[from.level][from.r][from.c] = null;

  const dests: PylosCoord[] = [];
  for (let level = (from.level + 1) as PylosLevel; level <= 3; level = (level + 1) as PylosLevel) {
    const size = PYLOS_LEVEL_SIZES[level];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (tempLevels[level][r][c] === null) {
          const coord: PylosCoord = { level, r, c };
          if (isSlotSupported(tempLevels, coord)) {
            dests.push(coord);
          }
        }
      }
    }
  }
  return dests;
};

/**
 * Detects whether placing/raising a sphere to `dest` formed a monochrome 2x2 square
 * or (when lineVariant is true) a row/column of 4 on level 0 or 3 on level 1.
 */
export const detectFormedBonus = (
  levels: (PlayerId | null)[][][],
  dest: PylosCoord,
  playerId: PlayerId,
  lineVariant: boolean
): {
  hasSquare: boolean;
  hasLine: boolean;
  triggeredCells: PylosCoord[];
  reason?: 'square' | 'line' | 'both';
} => {
  const size = PYLOS_LEVEL_SIZES[dest.level];
  const grid = levels[dest.level];
  const cellMap = new Map<string, PylosCoord>();
  const addCell = (c: PylosCoord) => {
    cellMap.set(`${c.level}-${c.r}-${c.c}`, c);
  };

  let hasSquare = false;
  if (dest.level <= 2) {
    for (let dr = -1; dr <= 0; dr++) {
      for (let dc = -1; dc <= 0; dc++) {
        const r0 = dest.r + dr;
        const c0 = dest.c + dc;
        if (r0 >= 0 && r0 + 1 < size && c0 >= 0 && c0 + 1 < size) {
          if (
            grid[r0][c0] === playerId &&
            grid[r0 + 1][c0] === playerId &&
            grid[r0][c0 + 1] === playerId &&
            grid[r0 + 1][c0 + 1] === playerId
          ) {
            hasSquare = true;
            addCell({ level: dest.level, r: r0, c: c0 });
            addCell({ level: dest.level, r: r0 + 1, c: c0 });
            addCell({ level: dest.level, r: r0, c: c0 + 1 });
            addCell({ level: dest.level, r: r0 + 1, c: c0 + 1 });
          }
        }
      }
    }
  }

  let hasLine = false;
  if (lineVariant && (dest.level === 0 || dest.level === 1)) {
    // Row check
    let fullRow = true;
    for (let c = 0; c < size; c++) {
      if (grid[dest.r][c] !== playerId) {
        fullRow = false;
        break;
      }
    }
    if (fullRow) {
      hasLine = true;
      for (let c = 0; c < size; c++) addCell({ level: dest.level, r: dest.r, c });
    }

    // Column check
    let fullCol = true;
    for (let r = 0; r < size; r++) {
      if (grid[r][dest.c] !== playerId) {
        fullCol = false;
        break;
      }
    }
    if (fullCol) {
      hasLine = true;
      for (let r = 0; r < size; r++) addCell({ level: dest.level, r, c: dest.c });
    }
  }

  const reason: 'square' | 'line' | 'both' | undefined =
    hasSquare && hasLine ? 'both' : hasSquare ? 'square' : hasLine ? 'line' : undefined;

  return {
    hasSquare,
    hasLine,
    triggeredCells: Array.from(cellMap.values()),
    reason,
  };
};

const checkTurnStartWinner = (
  state: PylosState,
  nextPlayerId: PlayerId
): { winner: PlayerId | null; winReason: 'apex' | 'reserve_empty' | null } => {
  if (state.levels[3][0][0] !== null) {
    return { winner: state.levels[3][0][0], winReason: 'apex' };
  }
  const oppId: PlayerId = nextPlayerId === 1 ? 2 : 1;
  // In Pylos, if the player whose turn starts has exhausted their reserve,
  // they cannot place anymore and the opponent automatically wins.
  // (Even if they could theoretically raise, rule says:
  // "chi esaurisce in anticipo la propria riserva non può più effettuare mosse:
  // l'avversario continuerà a posizionare le proprie sfere rimanenti fino a completare la piramide e vincere automaticamente.")
  if (state.reserve[nextPlayerId] <= 0) {
    return { winner: oppId, winReason: 'reserve_empty' };
  }
  return { winner: null, winReason: null };
};

export const applyPylosPlace = (
  state: PylosState,
  to: PylosCoord,
  playerId: PlayerId
): { nextState: PylosState; turnCompleted: boolean } | null => {
  if (state.phase !== 'move' || state.winner) return null;
  if (state.reserve[playerId] <= 0) return null;
  if (!isValidCoord(to) || state.levels[to.level][to.r][to.c] !== null) return null;
  if (!isSlotSupported(state.levels, to)) return null;

  const nextLevels = cloneLevels(state.levels);
  nextLevels[to.level][to.r][to.c] = playerId;

  const nextReserve = {
    ...state.reserve,
    [playerId]: state.reserve[playerId] - 1,
  };

  if (to.level === 3) {
    return {
      turnCompleted: true,
      nextState: {
        ...state,
        levels: nextLevels,
        reserve: nextReserve,
        phase: 'move',
        recoverCount: 0,
        recoverPlayerId: undefined,
        triggeredCells: [to],
        triggeredReason: undefined,
        lastMove: { type: 'place', to, playerId },
        winner: playerId,
        winReason: 'apex',
      },
    };
  }

  const bonus = detectFormedBonus(nextLevels, to, playerId, state.lineVariant);
  const freeOwned = getFreeSpheres(nextLevels, playerId);

  if ((bonus.hasSquare || bonus.hasLine) && freeOwned.length > 0) {
    return {
      turnCompleted: false,
      nextState: {
        ...state,
        levels: nextLevels,
        reserve: nextReserve,
        phase: 'recover',
        recoverCount: 0,
        recoverPlayerId: playerId,
        triggeredCells: bonus.triggeredCells,
        triggeredReason: bonus.reason,
        lastMove: { type: 'place', to, playerId },
        winner: null,
        winReason: null,
      },
    };
  }

  const nextPlayerId: PlayerId = playerId === 1 ? 2 : 1;
  const draftState: PylosState = {
    ...state,
    levels: nextLevels,
    reserve: nextReserve,
    phase: 'move',
    recoverCount: 0,
    recoverPlayerId: undefined,
    triggeredCells: undefined,
    triggeredReason: undefined,
    lastMove: { type: 'place', to, playerId },
  };
  const winCheck = checkTurnStartWinner(draftState, nextPlayerId);

  return {
    turnCompleted: true,
    nextState: {
      ...draftState,
      winner: winCheck.winner,
      winReason: winCheck.winReason,
    },
  };
};

export const applyPylosRaise = (
  state: PylosState,
  from: PylosCoord,
  to: PylosCoord,
  playerId: PlayerId
): { nextState: PylosState; turnCompleted: boolean } | null => {
  if (state.phase !== 'move' || state.winner) return null;
  if (!isValidCoord(from) || !isValidCoord(to)) return null;
  if (state.levels[from.level][from.r][from.c] !== playerId) return null;
  if (to.level <= from.level) return null;

  const validDests = getValidRaiseDestinations(state.levels, from);
  if (!validDests.some((d) => sameCoord(d, to))) return null;

  const nextLevels = cloneLevels(state.levels);
  nextLevels[from.level][from.r][from.c] = null;
  nextLevels[to.level][to.r][to.c] = playerId;

  if (to.level === 3) {
    return {
      turnCompleted: true,
      nextState: {
        ...state,
        levels: nextLevels,
        phase: 'move',
        recoverCount: 0,
        recoverPlayerId: undefined,
        triggeredCells: [to],
        triggeredReason: undefined,
        lastMove: { type: 'raise', from, to, playerId },
        winner: playerId,
        winReason: 'apex',
      },
    };
  }

  const bonus = detectFormedBonus(nextLevels, to, playerId, state.lineVariant);
  const freeOwned = getFreeSpheres(nextLevels, playerId);

  if ((bonus.hasSquare || bonus.hasLine) && freeOwned.length > 0) {
    return {
      turnCompleted: false,
      nextState: {
        ...state,
        levels: nextLevels,
        phase: 'recover',
        recoverCount: 0,
        recoverPlayerId: playerId,
        triggeredCells: bonus.triggeredCells,
        triggeredReason: bonus.reason,
        lastMove: { type: 'raise', from, to, playerId },
        winner: null,
        winReason: null,
      },
    };
  }

  const nextPlayerId: PlayerId = playerId === 1 ? 2 : 1;
  const draftState: PylosState = {
    ...state,
    levels: nextLevels,
    phase: 'move',
    recoverCount: 0,
    recoverPlayerId: undefined,
    triggeredCells: undefined,
    triggeredReason: undefined,
    lastMove: { type: 'raise', from, to, playerId },
  };
  const winCheck = checkTurnStartWinner(draftState, nextPlayerId);

  return {
    turnCompleted: true,
    nextState: {
      ...draftState,
      winner: winCheck.winner,
      winReason: winCheck.winReason,
    },
  };
};

export const applyPylosRecoverSphere = (
  state: PylosState,
  coord: PylosCoord,
  playerId: PlayerId
): { nextState: PylosState; turnCompleted: boolean } | null => {
  if (state.phase !== 'recover' || state.winner) return null;
  if (state.recoverCount >= 2) return null;
  if (!isValidCoord(coord)) return null;
  if (state.levels[coord.level][coord.r][coord.c] !== playerId) return null;
  if (!isSphereFree(state.levels, coord)) return null;

  const nextLevels = cloneLevels(state.levels);
  nextLevels[coord.level][coord.r][coord.c] = null;

  const nextReserve = {
    ...state.reserve,
    [playerId]: state.reserve[playerId] + 1,
  };
  const nextRecoverCount = state.recoverCount + 1;
  const prevRecovered = state.lastMove?.recovered || [];
  const nextRecovered = [...prevRecovered, coord];

  const remainingFree = getFreeSpheres(nextLevels, playerId);
  const autoComplete = nextRecoverCount >= 2 || remainingFree.length === 0;

  if (autoComplete) {
    const nextPlayerId: PlayerId = playerId === 1 ? 2 : 1;
    const draftState: PylosState = {
      ...state,
      levels: nextLevels,
      reserve: nextReserve,
      phase: 'move',
      recoverCount: 0,
      recoverPlayerId: undefined,
      triggeredCells: undefined,
      triggeredReason: undefined,
      lastMove: {
        type: 'recover',
        from: state.lastMove?.from,
        to: state.lastMove?.to,
        recovered: nextRecovered,
        playerId,
      },
    };
    const winCheck = checkTurnStartWinner(draftState, nextPlayerId);
    return {
      turnCompleted: true,
      nextState: {
        ...draftState,
        winner: winCheck.winner,
        winReason: winCheck.winReason,
      },
    };
  }

  return {
    turnCompleted: false,
    nextState: {
      ...state,
      levels: nextLevels,
      reserve: nextReserve,
      phase: 'recover',
      recoverCount: nextRecoverCount,
      recoverPlayerId: playerId,
      lastMove: {
        type: state.lastMove?.type || 'recover',
        from: state.lastMove?.from,
        to: state.lastMove?.to,
        recovered: nextRecovered,
        playerId,
      },
    },
  };
};

export const finishPylosRecovery = (
  state: PylosState,
  playerId: PlayerId
): PylosState => {
  if (state.phase !== 'recover') return state;
  const nextPlayerId: PlayerId = playerId === 1 ? 2 : 1;
  const draftState: PylosState = {
    ...state,
    phase: 'move',
    recoverCount: 0,
    recoverPlayerId: undefined,
    triggeredCells: undefined,
    triggeredReason: undefined,
  };
  const winCheck = checkTurnStartWinner(draftState, nextPlayerId);
  return {
    ...draftState,
    winner: winCheck.winner,
    winReason: winCheck.winReason,
  };
};

// ============================================================================
// AI ENGINE FOR PYLOS
// ============================================================================

const countPiecesOnBoard = (levels: (PlayerId | null)[][][]): number => {
  let count = 0;
  for (let l = 0; l < 4; l++) {
    for (let r = 0; r < levels[l].length; r++) {
      for (let c = 0; c < levels[l][r].length; c++) {
        if (levels[l][r][c] !== null) count++;
      }
    }
  }
  return count;
};

/**
 * Evaluates a Pylos state from the perspective of `perspectivePlayer` (+good, -bad),
 * assuming `nextTurnPlayer` is about to act.
 */
export const evaluatePylosState = (
  state: PylosState,
  perspectivePlayer: PlayerId,
  nextTurnPlayer: PlayerId
): number => {
  const opp: PlayerId = perspectivePlayer === 1 ? 2 : 1;

  if (state.winner === perspectivePlayer) return 100000;
  if (state.winner === opp) return -100000;

  if (state.reserve[nextTurnPlayer] <= 0) {
    return nextTurnPlayer === perspectivePlayer ? -90000 : 90000;
  }

  let score = 0;

  // 1. Reserve differential (key resource in Pylos)
  const reserveDiff = state.reserve[perspectivePlayer] - state.reserve[opp];
  score += reserveDiff * 240;

  // Low reserve danger penalty
  if (state.reserve[perspectivePlayer] <= 2) {
    score -= (3 - state.reserve[perspectivePlayer]) * 180;
  }
  if (state.reserve[opp] <= 2) {
    score += (3 - state.reserve[opp]) * 180;
  }

  // 2. Immediate apex availability for nextTurnPlayer (level 3 supported)
  if (state.levels[3][0][0] === null && isSlotSupported(state.levels, { level: 3, r: 0, c: 0 })) {
    if (nextTurnPlayer === perspectivePlayer) {
      score += 50000;
    } else {
      score -= 50000;
    }
  }

  // 3. Evaluate 2x2 squares & potential 2x2 threats across levels 0, 1, 2
  for (let level = 0 as PylosLevel; level <= 2; level = (level + 1) as PylosLevel) {
    const size = PYLOS_LEVEL_SIZES[level];
    const grid = state.levels[level];
    const levelMult = level === 0 ? 1.0 : level === 1 ? 1.25 : 1.4;

    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const vals = [grid[r][c], grid[r + 1][c], grid[r][c + 1], grid[r + 1][c + 1]];
        let mine = 0;
        let theirs = 0;
        let emptyCoord: PylosCoord | null = null;
        const coords: PylosCoord[] = [
          { level, r, c },
          { level, r: r + 1, c },
          { level, r, c: c + 1 },
          { level, r: r + 1, c: c + 1 },
        ];
        for (let k = 0; k < 4; k++) {
          if (vals[k] === perspectivePlayer) mine++;
          else if (vals[k] === opp) theirs++;
          else emptyCoord = coords[k];
        }

        if (mine === 4) {
          score += 35 * levelMult;
        } else if (mine === 3 && theirs === 0 && emptyCoord) {
          const supported = isSlotSupported(state.levels, emptyCoord);
          score += (supported ? 88 : 42) * levelMult;
        } else if (mine === 2 && theirs === 0) {
          score += 18 * levelMult;
        } else if (theirs === 3 && mine === 0 && emptyCoord) {
          const supported = isSlotSupported(state.levels, emptyCoord);
          // Huge danger if opponent can complete it on their turn!
          const threatMult = nextTurnPlayer === opp ? 1.5 : 0.95;
          score -= (supported ? 95 : 44) * levelMult * threatMult;
        } else if (theirs === 2 && mine === 0) {
          score -= 16 * levelMult;
        }
      }
    }
  }

  // 4. Line variant threats (4 in row/col on L0, 3 in row/col on L1)
  if (state.lineVariant) {
    for (const level of [0, 1] as PylosLevel[]) {
      const size = PYLOS_LEVEL_SIZES[level];
      const grid = state.levels[level];
      // Rows and Cols
      for (let idx = 0; idx < size; idx++) {
        for (const isRow of [true, false]) {
          let mine = 0;
          let theirs = 0;
          let emptySupported = 0;
          for (let k = 0; k < size; k++) {
            const rr = isRow ? idx : k;
            const cc = isRow ? k : idx;
            const v = grid[rr][cc];
            if (v === perspectivePlayer) mine++;
            else if (v === opp) theirs++;
            else if (isSlotSupported(state.levels, { level, r: rr, c: cc })) emptySupported++;
          }
          if (theirs === 0 && mine === size - 1 && emptySupported > 0) {
            score += 75;
          } else if (mine === 0 && theirs === size - 1 && emptySupported > 0) {
            score -= nextTurnPlayer === opp ? 115 : 70;
          } else if (theirs === 0 && mine === size - 2) {
            score += 20;
          } else if (mine === 0 && theirs === size - 2) {
            score -= 18;
          }
        }
      }
    }
  }

  // 5. Free spheres & height/center control
  let myFree = 0;
  let oppFree = 0;
  for (let level = 0 as PylosLevel; level <= 2; level = (level + 1) as PylosLevel) {
    const size = PYLOS_LEVEL_SIZES[level];
    const center = (size - 1) / 2;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const owner = state.levels[level][r][c];
        if (owner === null) continue;
        const distCenter = Math.abs(r - center) + Math.abs(c - center);
        const posVal = (level * 20) + Math.max(0, 8 - distCenter * 4);
        const free = isSphereFree(state.levels, { level, r, c });
        if (owner === perspectivePlayer) {
          score += posVal;
          if (free) {
            myFree++;
            score += 24;
          }
        } else {
          score -= posVal;
          if (free) {
            oppFree++;
            score -= 24;
          }
        }
      }
    }
  }
  score += (myFree - oppFree) * 12;

  return score;
};

interface FullTurnOutcome {
  move:
    | { type: 'place'; to: PylosCoord; recover: PylosCoord[] }
    | { type: 'raise'; from: PylosCoord; to: PylosCoord; recover: PylosCoord[] };
  stateAfter: PylosState;
  quickScore: number;
}

const scoreRecoveryCandidate = (
  levels: (PlayerId | null)[][][],
  coord: PylosCoord,
  playerId: PlayerId,
  oppId: PlayerId,
  lineVariant: boolean
): number => {
  // Higher score = BETTER to pick back (leave board stronger & break nothing critical)
  let s = 0;
  const size = PYLOS_LEVEL_SIZES[coord.level];
  const center = (size - 1) / 2;
  const distCenter = Math.abs(coord.r - center) + Math.abs(coord.c - center);
  // Prefer recovering edge/corner lower-level spheres over central/higher ones
  s += (2 - coord.level) * 20 + distCenter * 8;

  // Check if removing this sphere exposes an opponent 2x2 completion
  if (coord.level <= 2) {
    const grid = levels[coord.level];
    for (let dr = -1; dr <= 0; dr++) {
      for (let dc = -1; dc <= 0; dc++) {
        const r0 = coord.r + dr;
        const c0 = coord.c + dc;
        if (r0 >= 0 && r0 + 1 < size && c0 >= 0 && c0 + 1 < size) {
          let oppCnt = 0;
          let mineCnt = 0;
          for (let rr = r0; rr <= r0 + 1; rr++) {
            for (let cc = c0; cc <= c0 + 1; cc++) {
              if (rr === coord.r && cc === coord.c) continue;
              if (grid[rr][cc] === oppId) oppCnt++;
              else if (grid[rr][cc] === playerId) mineCnt++;
            }
          }
          // Blocking an opp 3-of-4 square? Do NOT recover!
          if (oppCnt === 3) s -= 260;
          // Breaking our own 3-of-4? Slight downside unless we immediately re-form next turn
          if (mineCnt === 3) s += 35; // actually keeping 3-of-4 ready to re-trigger on next turn can be a loop! Give slight bonus if it sets up 3-of-4 again!
        }
      }
    }
  }

  if (lineVariant && (coord.level === 0 || coord.level === 1)) {
    const grid = levels[coord.level];
    let oppRow = 0;
    let oppCol = 0;
    for (let k = 0; k < size; k++) {
      if (k !== coord.c && grid[coord.r][k] === oppId) oppRow++;
      if (k !== coord.r && grid[k][coord.c] === oppId) oppCol++;
    }
    if (oppRow === size - 1 || oppCol === size - 1) s -= 240;
  }

  return s;
};

const pickBestRecoveryCombination = (
  stateAfterMove: PylosState,
  playerId: PlayerId
): { state: PylosState; recovered: PylosCoord[] } => {
  const oppId: PlayerId = playerId === 1 ? 2 : 1;
  const free1 = getFreeSpheres(stateAfterMove.levels, playerId);
  if (free1.length === 0) {
    return { state: finishPylosRecovery(stateAfterMove, playerId), recovered: [] };
  }

  // Sort single recoveries cleanly
  const ranked1 = [...free1].sort(
    (a, b) =>
      scoreRecoveryCandidate(stateAfterMove.levels, b, playerId, oppId, stateAfterMove.lineVariant) -
      scoreRecoveryCandidate(stateAfterMove.levels, a, playerId, oppId, stateAfterMove.lineVariant)
  );

  // Almost always recovering 2 spheres is optimal (saves maximum reserve).
  // Still compare top 3 single vs top 2-sphere pairs so we don't accidentally drop an essential blocker.
  const candidatesToTry = ranked1.slice(0, 4);
  let bestState: PylosState = finishPylosRecovery(stateAfterMove, playerId);
  let bestRecovered: PylosCoord[] = [];
  let bestScore = evaluatePylosState(bestState, playerId, oppId);

  for (const c1 of candidatesToTry) {
    const res1 = applyPylosRecoverSphere(stateAfterMove, c1, playerId);
    if (!res1) continue;

    if (res1.turnCompleted) {
      const sc = evaluatePylosState(res1.nextState, playerId, oppId);
      if (sc > bestScore) {
        bestScore = sc;
        bestState = res1.nextState;
        bestRecovered = [c1];
      }
      continue;
    }

    // Consider stopping at 1 sphere
    const stopAt1 = finishPylosRecovery(res1.nextState, playerId);
    const sc1 = evaluatePylosState(stopAt1, playerId, oppId);
    if (sc1 > bestScore) {
      bestScore = sc1;
      bestState = stopAt1;
      bestRecovered = [c1];
    }

    // Now pick best 2nd sphere
    const free2 = getFreeSpheres(res1.nextState.levels, playerId);
    free2.sort(
      (a, b) =>
        scoreRecoveryCandidate(res1.nextState.levels, b, playerId, oppId, stateAfterMove.lineVariant) -
        scoreRecoveryCandidate(res1.nextState.levels, a, playerId, oppId, stateAfterMove.lineVariant)
    );
    for (const c2 of free2.slice(0, 3)) {
      const res2 = applyPylosRecoverSphere(res1.nextState, c2, playerId);
      if (!res2) continue;
      const sc2 = evaluatePylosState(res2.nextState, playerId, oppId);
      if (sc2 > bestScore) {
        bestScore = sc2;
        bestState = res2.nextState;
        bestRecovered = [c1, c2];
      }
    }
  }

  return { state: bestState, recovered: bestRecovered };
};

const generateAllTurnOutcomes = (
  state: PylosState,
  playerId: PlayerId
): FullTurnOutcome[] => {
  const oppId: PlayerId = playerId === 1 ? 2 : 1;
  const outcomes: FullTurnOutcome[] = [];

  // 1. Raises (usually strongest because no reserve cost!)
  const freeSpheres = getFreeSpheres(state.levels, playerId);
  for (const from of freeSpheres) {
    const dests = getValidRaiseDestinations(state.levels, from);
    for (const to of dests) {
      const res = applyPylosRaise(state, from, to, playerId);
      if (!res) continue;
      if (res.turnCompleted) {
        outcomes.push({
          move: { type: 'raise', from, to, recover: [] },
          stateAfter: res.nextState,
          quickScore: evaluatePylosState(res.nextState, playerId, oppId) + 30,
        });
      } else {
        const rec = pickBestRecoveryCombination(res.nextState, playerId);
        outcomes.push({
          move: { type: 'raise', from, to, recover: rec.recovered },
          stateAfter: rec.state,
          quickScore: evaluatePylosState(rec.state, playerId, oppId) + 50,
        });
      }
    }
  }

  // 2. Placements from reserve
  if (state.reserve[playerId] > 0) {
    const slots = getValidPlacementSlots(state.levels);
    for (const to of slots) {
      const res = applyPylosPlace(state, to, playerId);
      if (!res) continue;
      if (res.turnCompleted) {
        outcomes.push({
          move: { type: 'place', to, recover: [] },
          stateAfter: res.nextState,
          quickScore: evaluatePylosState(res.nextState, playerId, oppId),
        });
      } else {
        const rec = pickBestRecoveryCombination(res.nextState, playerId);
        outcomes.push({
          move: { type: 'place', to, recover: rec.recovered },
          stateAfter: rec.state,
          quickScore: evaluatePylosState(rec.state, playerId, oppId) + 25,
        });
      }
    }
  }

  outcomes.sort((a, b) => b.quickScore - a.quickScore);
  return outcomes;
};

const alphaBetaPylos = (
  state: PylosState,
  depth: number,
  alpha: number,
  beta: number,
  currentTurnPlayer: PlayerId,
  aiPlayerId: PlayerId,
  beamWidth: number
): number => {
  const oppId: PlayerId = aiPlayerId === 1 ? 2 : 1;
  if (state.winner === aiPlayerId) return 100000 + depth * 100;
  if (state.winner === oppId) return -100000 - depth * 100;
  if (state.reserve[currentTurnPlayer] <= 0) {
    return currentTurnPlayer === aiPlayerId ? -90000 - depth * 50 : 90000 + depth * 50;
  }
  if (depth <= 0) {
    return evaluatePylosState(state, aiPlayerId, currentTurnPlayer);
  }

  const outcomes = generateAllTurnOutcomes(state, currentTurnPlayer);
  if (outcomes.length === 0) {
    return currentTurnPlayer === aiPlayerId ? -90000 : 90000;
  }

  const branch = outcomes.slice(0, beamWidth);
  const nextTurnPlayer: PlayerId = currentTurnPlayer === 1 ? 2 : 1;
  const isMaximizing = currentTurnPlayer === aiPlayerId;

  if (isMaximizing) {
    let best = -Infinity;
    for (const o of branch) {
      const val = alphaBetaPylos(
        o.stateAfter,
        depth - 1,
        alpha,
        beta,
        nextTurnPlayer,
        aiPlayerId,
        beamWidth
      );
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const o of branch) {
      const val = alphaBetaPylos(
        o.stateAfter,
        depth - 1,
        alpha,
        beta,
        nextTurnPlayer,
        aiPlayerId,
        beamWidth
      );
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
};

export const getBestPylosMoveForAI = (
  state: PylosState,
  aiPlayerId: PlayerId,
  difficulty: Difficulty
): PylosAIMove | null => {
  const oppId: PlayerId = aiPlayerId === 1 ? 2 : 1;

  // Step-by-step recovery if phase is already 'recover'
  if (state.phase === 'recover') {
    const freeOwned = getFreeSpheres(state.levels, aiPlayerId);
    if (freeOwned.length === 0 || state.recoverCount >= 2) {
      return { type: 'recover_step', coord: null };
    }

    // Rank options: recover each free sphere vs finish now (if recoverCount >= 1 or finishing is somehow better)
    let bestCoord: PylosCoord | null = null;
    let bestVal = -Infinity;

    if (state.recoverCount >= 1) {
      const stopState = finishPylosRecovery(state, aiPlayerId);
      bestVal = evaluatePylosState(stopState, aiPlayerId, oppId);
      bestCoord = null;
    }

    for (const c of freeOwned) {
      const res = applyPylosRecoverSphere(state, c, aiPlayerId);
      if (!res) continue;
      let val: number;
      if (res.turnCompleted) {
        val = evaluatePylosState(res.nextState, aiPlayerId, oppId);
      } else {
        // Evaluate best possible next step (stop at 1 or recover 2nd)
        const stop1 = evaluatePylosState(
          finishPylosRecovery(res.nextState, aiPlayerId),
          aiPlayerId,
          oppId
        );
        const free2 = getFreeSpheres(res.nextState.levels, aiPlayerId);
        let best2 = -Infinity;
        for (const c2 of free2) {
          const res2 = applyPylosRecoverSphere(res.nextState, c2, aiPlayerId);
          if (res2) {
            const v2 = evaluatePylosState(res2.nextState, aiPlayerId, oppId);
            if (v2 > best2) best2 = v2;
          }
        }
        val = Math.max(stop1, best2);
      }
      if (val > bestVal) {
        bestVal = val;
        bestCoord = c;
      }
    }

    return { type: 'recover_step', coord: bestCoord };
  }

  // Move phase
  const outcomes = generateAllTurnOutcomes(state, aiPlayerId);
  if (outcomes.length === 0) return null;

  // Immediate win check
  const immediateWin = outcomes.find((o) => o.stateAfter.winner === aiPlayerId);
  if (immediateWin) {
    return immediateWin.move;
  }

  const piecesOnBoard = countPiecesOnBoard(state.levels);

  // Facile: pick randomly among top few moves with small mistake allowance
  if (difficulty === 'facile') {
    const pool = outcomes.slice(0, Math.min(4, outcomes.length));
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return chosen.move;
  }

  let depth = 1;
  let beamWidth = 10;
  if (difficulty === 'normale') {
    depth = 1;
    beamWidth = 10;
  } else if (difficulty === 'difficile') {
    depth = piecesOnBoard >= 18 ? 3 : 2;
    beamWidth = 12;
  } else if (difficulty === 'estrema') {
    depth = piecesOnBoard >= 18 ? 4 : 3;
    beamWidth = 13;
  } else if (difficulty === 'maestro') {
    depth = piecesOnBoard >= 16 ? 4 : 3;
    beamWidth = 15;
  }

  const candidates = outcomes.slice(0, beamWidth);
  let bestOutcome = candidates[0];
  let bestVal = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const cand of candidates) {
    const val = alphaBetaPylos(
      cand.stateAfter,
      depth,
      alpha,
      beta,
      oppId,
      aiPlayerId,
      beamWidth
    );
    // Tiny tie-breaker jitter only on 'normale'
    const scoreWithJitter =
      difficulty === 'normale' ? val + (Math.random() * 14 - 7) : val;
    if (scoreWithJitter > bestVal) {
      bestVal = scoreWithJitter;
      bestOutcome = cand;
    }
    if (val > alpha) alpha = val;
  }

  return bestOutcome.move;
};
