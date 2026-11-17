import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Language, PlayerId } from '../types';
import {
  PylosCoord,
  PylosLevel,
  PylosState,
  PYLOS_LEVEL_SIZES,
  getFreeSpheres,
  getValidPlacementSlots,
  getValidRaiseDestinations,
  sameCoord,
} from '../utils/pylosLogic';

export type PylosBoardStyle = 'neon' | 'classic';

interface PylosBoardProps {
  pylosState: PylosState;
  currentPlayerId: PlayerId;
  onPlaceSphere: (to: PylosCoord) => void;
  onRaiseSphere: (from: PylosCoord, to: PylosCoord) => void;
  onRecoverSphere: (coord: PylosCoord) => void;
  onFinishRecovery: () => void;
  isUserTurn: boolean;
  isAIThinking: boolean;
  player1Name: string;
  player2Name: string;
  language: Language;
  boardStyle?: PylosBoardStyle;
}

const DARK_PALETTE = {
  highlight: '#684a3d',
  lit: '#382017',
  mid: '#1d0e09',
  dark: '#0e0502',
  coreShadow: '#040100',
  rimStroke: '#382218',
};

const LIGHT_PALETTE = {
  highlight: '#fcf4e3',
  lit: '#ead1a3',
  mid: '#c9a369',
  dark: '#947039',
  coreShadow: '#5b3f19',
  rimStroke: '#8d6c3a',
};

const NEON_RED_PALETTE = {
  highlight: '#fecaca',
  lit: '#f87171',
  mid: '#ef4444',
  dark: '#991b1b',
  coreShadow: '#450a0a',
  rimStroke: '#fca5a5',
};

const NEON_BLUE_PALETTE = {
  highlight: '#dbeafe',
  lit: '#60a5fa',
  mid: '#3b82f6',
  dark: '#1d4ed8',
  coreShadow: '#172554',
  rimStroke: '#93c5fd',
};

const PylosSphereSharedDefs: React.FC<{ prefix: string; boardStyle?: PylosBoardStyle }> = ({
  prefix,
  boardStyle = 'classic',
}) => {
  const isNeon = boardStyle === 'neon';
  const p1 = isNeon ? NEON_BLUE_PALETTE : LIGHT_PALETTE;
  const p2 = isNeon ? NEON_RED_PALETTE : DARK_PALETTE;
  return (
    <>
      <radialGradient id={`${prefix}-light`} cx="35%" cy="30%" r="72%" fx="28%" fy="23%">
        <stop offset="0%" stopColor={p1.highlight} />
        <stop offset="26%" stopColor={p1.lit} />
        <stop offset="58%" stopColor={p1.mid} />
        <stop offset="86%" stopColor={p1.dark} />
        <stop offset="100%" stopColor={p1.coreShadow} />
      </radialGradient>
      <radialGradient id={`${prefix}-dark`} cx="34%" cy="29%" r="72%" fx="27%" fy="23%">
        <stop offset="0%" stopColor={p2.highlight} />
        <stop offset="24%" stopColor={p2.lit} />
        <stop offset="56%" stopColor={p2.mid} />
        <stop offset="86%" stopColor={p2.dark} />
        <stop offset="100%" stopColor={p2.coreShadow} />
      </radialGradient>
      <radialGradient id={`${prefix}-bounce-light`} cx="76%" cy="78%" r="54%">
        <stop offset="0%" stopColor={isNeon ? 'rgba(147, 197, 253, 0.34)' : 'rgba(255, 232, 188, 0.24)'} />
        <stop offset="52%" stopColor={isNeon ? 'rgba(59, 130, 246, 0.14)' : 'rgba(220, 180, 120, 0.08)'} />
        <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
      </radialGradient>
      <radialGradient id={`${prefix}-bounce-dark`} cx="76%" cy="78%" r="54%">
        <stop offset="0%" stopColor={isNeon ? 'rgba(252, 165, 165, 0.32)' : 'rgba(108, 66, 46, 0.26)'} />
        <stop offset="55%" stopColor={isNeon ? 'rgba(239, 68, 68, 0.12)' : 'rgba(62, 36, 24, 0.08)'} />
        <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
      </radialGradient>
      <radialGradient id={`${prefix}-spec-light`} cx="31%" cy="27%" r="34%">
        <stop offset="0%" stopColor={isNeon ? 'rgba(255, 255, 255, 0.68)' : 'rgba(255, 253, 246, 0.46)'} />
        <stop offset="46%" stopColor={isNeon ? 'rgba(219, 234, 254, 0.24)' : 'rgba(255, 250, 235, 0.16)'} />
        <stop offset="100%" stopColor="rgba(255, 250, 235, 0)" />
      </radialGradient>
      <radialGradient id={`${prefix}-spec-dark`} cx="30%" cy="27%" r="34%">
        <stop offset="0%" stopColor={isNeon ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 248, 242, 0.62)'} />
        <stop offset="40%" stopColor={isNeon ? 'rgba(254, 202, 202, 0.26)' : 'rgba(214, 182, 165, 0.20)'} />
        <stop offset="100%" stopColor="rgba(214, 182, 165, 0)" />
      </radialGradient>
    </>
  );
};

export const PylosBoard: React.FC<PylosBoardProps> = ({
  pylosState,
  currentPlayerId,
  onPlaceSphere,
  onRaiseSphere,
  onRecoverSphere,
  onFinishRecovery,
  isUserTurn,
  isAIThinking,
  player1Name,
  player2Name,
  language,
  boardStyle = 'classic',
}) => {
  const isNeon = boardStyle === 'neon';
  // Orbital 3D camera controls matching QuartoBoard
  const [boardYaw, setBoardYaw] = useState<number>(-Math.PI / 4);
  const [boardPitch, setBoardPitch] = useState<number>(0.64);
  const [isDragging3D, setIsDragging3D] = useState<boolean>(false);
  const [selectedRaiseFrom, setSelectedRaiseFrom] = useState<PylosCoord | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<PylosCoord | null>(null);
  const [winDropProgress, setWinDropProgress] = useState<number>(1);
  const [selectLiftProgress, setSelectLiftProgress] = useState<number>(0);
  const [activeAnim, setActiveAnim] = useState<{
    kind: 'place' | 'raise';
    from?: PylosCoord;
    to: PylosCoord;
    progress: number;
    isWinningApex: boolean;
  } | null>(null);

  const lastAnimMoveRef = useRef<PylosState['lastMove']>(pylosState.lastMove);
  const hasMountedRef = useRef<boolean>(false);

  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    lastX: number;
    lastY: number;
    totalDist: number;
    wasDragged: boolean;
  }>({
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    totalDist: 0,
    wasDragged: false,
  });

  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
    };
  }, []);

  // Clear local selection whenever phase, turn, or state changes
  useEffect(() => {
    setSelectedRaiseFrom(null);
    setHoveredCoord(null);
  }, [currentPlayerId, pylosState.phase, pylosState.reserve[1], pylosState.reserve[2]]);

  // Smooth lift animation when selecting an owned sphere on the board to raise/move
  useEffect(() => {
    if (!selectedRaiseFrom) {
      setSelectLiftProgress(0);
      return;
    }
    setSelectLiftProgress(0);
    let rafId = 0;
    const startTime = performance.now();
    const durationMs = 210;
    const tick = (now: number) => {
      const linear = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - linear, 3);
      setSelectLiftProgress(eased);
      if (linear < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [selectedRaiseFrom]);

  // Smooth drop-from-above (place) and parabolic lift-and-drop (raise) animations
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      lastAnimMoveRef.current = pylosState.lastMove;
      return;
    }

    const move = pylosState.lastMove;
    if (!move || move === lastAnimMoveRef.current) return;
    lastAnimMoveRef.current = move;

    if ((move.type === 'place' || move.type === 'raise') && move.to) {
      const toCoord = move.to;
      const isWinningApex =
        !!pylosState.winner &&
        pylosState.winReason === 'apex' &&
        toCoord.level === 3;

      const kind = move.type;
      const fromCoord = move.from;
      const durationMs = isWinningApex ? 1550 : kind === 'raise' ? 460 : 380;

      if (isWinningApex) setWinDropProgress(0);
      setActiveAnim({
        kind,
        from: fromCoord,
        to: toCoord,
        progress: 0,
        isWinningApex,
      });

      let rafId = 0;
      const startTime = performance.now();
      const tick = (now: number) => {
        const linear = Math.min(1, (now - startTime) / durationMs);
        if (isWinningApex) {
          setWinDropProgress(1 - Math.pow(1 - linear, 3));
        }
        if (linear < 1) {
          setActiveAnim({
            kind,
            from: fromCoord,
            to: toCoord,
            progress: linear,
            isWinningApex,
          });
          rafId = requestAnimationFrame(tick);
        } else {
          setActiveAnim(null);
          if (isWinningApex) setWinDropProgress(1);
        }
      };
      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }
  }, [pylosState.lastMove, pylosState.winner, pylosState.winReason]);

  const canActMove =
    isUserTurn &&
    !isAIThinking &&
    !pylosState.winner &&
    pylosState.phase === 'move';

  const canActRecover =
    isUserTurn &&
    !isAIThinking &&
    !pylosState.winner &&
    pylosState.phase === 'recover';

  const validPlacementSlots = useMemo(() => {
    if (!canActMove || pylosState.reserve[currentPlayerId] <= 0) return [];
    return getValidPlacementSlots(pylosState.levels);
  }, [canActMove, pylosState.levels, pylosState.reserve, currentPlayerId]);

  const freeOwnedSpheres = useMemo(() => {
    if (!canActMove && !canActRecover) return [];
    return getFreeSpheres(pylosState.levels, currentPlayerId);
  }, [canActMove, canActRecover, pylosState.levels, currentPlayerId]);

  // Precompute which free owned spheres actually have a higher valid destination
  const raisableOwnedSpheres = useMemo(() => {
    if (!canActMove) return [];
    return freeOwnedSpheres.filter(
      (c) => getValidRaiseDestinations(pylosState.levels, c).length > 0
    );
  }, [canActMove, freeOwnedSpheres, pylosState.levels]);

  const validRaiseDestinations = useMemo(() => {
    if (!canActMove || !selectedRaiseFrom) return [];
    return getValidRaiseDestinations(pylosState.levels, selectedRaiseFrom);
  }, [canActMove, selectedRaiseFrom, pylosState.levels]);

  // Dynamic 3D perspective projection matching QuartoBoard width/proportions
  const SVG_WIDTH = 460;
  const TARGET_BOARD_WIDTH = 456;

  const { boardGeometry, slotsByLevel, allSlots, getPyramid3DPoint } = useMemo(() => {
    const B = 2.28;
    const R = 0.30;
    const arcSteps = 8;
    const cosA = Math.cos(boardYaw);
    const sinA = Math.sin(boardYaw);
    const perspK = 0.074;

    const projectRaw = (dc: number, dr: number) => {
      const rdc = dc * cosA - dr * sinA;
      const rdr = dc * sinA + dr * cosA;
      const camX = rdc - rdr;
      const depth = rdc + rdr;
      const perspScale = 1 / (1 - depth * perspK);
      const rx = camX * perspScale;
      const ry = depth * boardPitch * perspScale;
      return { rx, ry, depth, perspScale };
    };

    const corners3D = [
      { cx: -B + R, cy: -B + R, startAngle: Math.PI, endAngle: 1.5 * Math.PI },
      { cx: B - R, cy: -B + R, startAngle: 1.5 * Math.PI, endAngle: 2 * Math.PI },
      { cx: B - R, cy: B - R, startAngle: 0, endAngle: 0.5 * Math.PI },
      { cx: -B + R, cy: B - R, startAngle: 0.5 * Math.PI, endAngle: Math.PI },
    ];

    const rawPerimeter: { rx: number; ry: number; depth: number; perspScale: number }[] = [];
    corners3D.forEach((corner) => {
      for (let s = 0; s <= arcSteps; s++) {
        const angle = corner.startAngle + ((corner.endAngle - corner.startAngle) * s) / arcSteps;
        const dc = corner.cx + R * Math.cos(angle);
        const dr = corner.cy + R * Math.sin(angle);
        rawPerimeter.push(projectRaw(dc, dr));
      }
    });

    let minRx = Infinity;
    let maxRx = -Infinity;
    let minRy = Infinity;
    let maxRy = -Infinity;
    for (const pt of rawPerimeter) {
      if (pt.rx < minRx) minRx = pt.rx;
      if (pt.rx > maxRx) maxRx = pt.rx;
      if (pt.ry < minRy) minRy = pt.ry;
      if (pt.ry > maxRy) maxRy = pt.ry;
    }

    const rawSpanX = Math.max(0.001, maxRx - minRx);
    const rawCenterX = (minRx + maxRx) * 0.5;
    const autoStep = TARGET_BOARD_WIDTH / rawSpanX;
    // Extra topPad accommodates the 3D 4-tier pyramid rising cleanly above the mahogany base
    const topPad = Math.round(96 + (1 - boardPitch) * 84);
    const bottomPad = 24;

    const projectBoardCoord = (dc: number, dr: number) => {
      const p = projectRaw(dc, dr);
      const x = SVG_WIDTH * 0.5 + (p.rx - rawCenterX) * autoStep;
      const y = topPad + (p.ry - minRy) * autoStep;
      const scale = p.perspScale * (autoStep / 55);
      return { x, y, depth: p.depth, scale, perspScale: p.perspScale };
    };

    // Exact 3D pyramid layer coordinates:
    // Grid spacing in 3D is sqrt(2) * autoStep -> horizontal diagonal offset to 2x2 center is 1.0 * autoStep.
    // With sphere radius R = 0.655 * autoStep (2R = 1.310), Pythagorean layer step is sqrt(1.310^2 - 1.0^2) = 0.846;
    // 0.825 nests each upper sphere tightly into the 4-sphere saddle below with zero air gap.
    const verticalTiltCos = Math.sqrt(Math.max(0.22, 1 - boardPitch * boardPitch));
    const sphereRadiusAtScale1 = 0.655 * autoStep;
    const LEVEL_Z_STEP = 0.825;

    const pyramidPoint = (level: PylosLevel, r: number, c: number) => {
      const dc = c + level * 0.5 - 1.5;
      const dr = r + level * 0.5 - 1.5;
      const basePt = projectBoardCoord(dc, dr);
      const radius = sphereRadiusAtScale1 * basePt.perspScale;
      const z3d = level * LEVEL_Z_STEP;
      const baseSeatRiseY = 0.50 * radius * verticalTiltCos;
      const riseY = baseSeatRiseY + z3d * autoStep * basePt.perspScale * verticalTiltCos;
      const viewZ = basePt.depth * verticalTiltCos + z3d * boardPitch;
      return {
        x: basePt.x,
        baseY: basePt.y,
        y: basePt.y - riseY,
        depth: basePt.depth,
        viewZ,
        scale: basePt.scale,
        perspScale: basePt.perspScale,
        radius,
      };
    };

    type PylosSlotGeo = {
      level: PylosLevel;
      r: number;
      c: number;
      x: number;
      baseY: number;
      y: number;
      depth: number;
      viewZ: number;
      scale: number;
      radius: number;
    };

    const byLevel: PylosSlotGeo[][] = [[], [], [], []];
    const allSlots: PylosSlotGeo[] = [];

    for (let level = 0 as PylosLevel; level <= 3; level = (level + 1) as PylosLevel) {
      const size = PYLOS_LEVEL_SIZES[level];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const pt = pyramidPoint(level, r, c);
          const slotObj: PylosSlotGeo = {
            level,
            r,
            c,
            x: pt.x,
            baseY: pt.baseY,
            y: pt.y,
            depth: pt.depth,
            viewZ: pt.viewZ,
            scale: pt.scale,
            radius: pt.radius,
          };
          byLevel[level].push(slotObj);
          allSlots.push(slotObj);
        }
      }
      byLevel[level].sort((a, b) => a.depth - b.depth || a.x - b.x);
    }

    const perimeterPts = rawPerimeter.map((p) => ({
      x: SVG_WIDTH * 0.5 + (p.rx - rawCenterX) * autoStep,
      y: topPad + (p.ry - minRy) * autoStep,
      depth: p.depth,
      scale: p.perspScale * (autoStep / 55),
    }));

    const topSlabPath =
      perimeterPts
        .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
        .join(' ') + ' Z';

    const baseThickness = 15 * (0.72 + 0.28 * (1 - boardPitch));

    const sideWalls = perimeterPts.map((curr, i) => {
      const next = perimeterPts[(i + 1) % perimeterPts.length];
      const currBotY = curr.y + baseThickness * curr.scale;
      const nextBotY = next.y + baseThickness * next.scale;
      const midX = (curr.x + next.x) * 0.5;
      const midY = (curr.y + next.y) * 0.5;
      const isLeftLit = midX <= SVG_WIDTH * 0.5;
      const path = `M ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} L ${next.x.toFixed(1)} ${next.y.toFixed(1)} L ${next.x.toFixed(1)} ${nextBotY.toFixed(1)} L ${curr.x.toFixed(1)} ${currBotY.toFixed(1)} Z`;
      return {
        key: i,
        path,
        midY,
        isLeftLit,
        fill: isLeftLit ? 'url(#pylos-wood-side-left)' : 'url(#pylos-wood-side-right)',
      };
    });
    sideWalls.sort((a, b) => a.midY - b.midY);

    const insetB = 1.98;
    const insetCorners = [
      projectBoardCoord(-insetB, -insetB),
      projectBoardCoord(insetB, -insetB),
      projectBoardCoord(insetB, insetB),
      projectBoardCoord(-insetB, insetB),
    ];
    const innerFramePath =
      insetCorners
        .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
        .join(' ') + ' Z';

    const grainRows = [-1.35, -0.7, 0.0, 0.7, 1.35];
    const grainPaths = grainRows.map((v, idx) => {
      const pL = projectBoardCoord(-B * 0.88, v);
      const pM = projectBoardCoord(0, v + (idx % 2 === 0 ? -0.18 : 0.18));
      const pR = projectBoardCoord(B * 0.88, v);
      return `M ${pL.x.toFixed(1)} ${pL.y.toFixed(1)} Q ${pM.x.toFixed(1)} ${pM.y.toFixed(1)} ${pR.x.toFixed(1)} ${pR.y.toFixed(1)}`;
    });

    const svgHeight = Math.round(topPad + (maxRy - minRy) * autoStep + bottomPad);

    return {
      boardGeometry: {
        topSlabPath,
        sideWalls,
        innerFramePath,
        grainPaths,
        thickness: baseThickness,
        svgHeight,
      },
      slotsByLevel: byLevel,
      allSlots,
      getPyramid3DPoint: pyramidPoint,
    };
  }, [boardYaw, boardPitch]);

  const SOCKET_RING_RX = 34.2;
  const SOCKET_BOWL_RX = 32.4;
  const socketRy = SOCKET_RING_RX * boardPitch;
  const socketInnerRy = SOCKET_BOWL_RX * boardPitch;

  const isTriggeredCell = (coord: PylosCoord) =>
    pylosState.triggeredCells?.some((c) => sameCoord(c, coord)) ?? false;

  const isRaisable = (coord: PylosCoord) =>
    raisableOwnedSpheres.some((c) => sameCoord(c, coord));

  const isRecoverable = (coord: PylosCoord) =>
    canActRecover && freeOwnedSpheres.some((c) => sameCoord(c, coord));

  const isValidPlaceTarget = (coord: PylosCoord) =>
    !selectedRaiseFrom && validPlacementSlots.some((c) => sameCoord(c, coord));

  const isValidRaiseTarget = (coord: PylosCoord) =>
    !!selectedRaiseFrom && validRaiseDestinations.some((c) => sameCoord(c, coord));

  const handleSlotTap = (coord: PylosCoord) => {
    if (dragStateRef.current.wasDragged) return;
    const occupant = pylosState.levels[coord.level][coord.r][coord.c];

    if (canActRecover) {
      if (isRecoverable(coord)) {
        onRecoverSphere(coord);
      }
      return;
    }

    if (!canActMove) return;

    // If a sphere is selected for raising:
    if (selectedRaiseFrom) {
      if (sameCoord(selectedRaiseFrom, coord)) {
        setSelectedRaiseFrom(null);
        return;
      }
      if (isValidRaiseTarget(coord)) {
        onRaiseSphere(selectedRaiseFrom, coord);
        setSelectedRaiseFrom(null);
        return;
      }
      // Tapped another raisable owned sphere -> switch selection
      if (occupant === currentPlayerId && isRaisable(coord)) {
        setSelectedRaiseFrom(coord);
        return;
      }
      // Tapped elsewhere -> deselect
      setSelectedRaiseFrom(null);
      return;
    }

    // No raise sphere selected yet:
    if (occupant === currentPlayerId && isRaisable(coord)) {
      setSelectedRaiseFrom(coord);
      return;
    }

    if (occupant === null && isValidPlaceTarget(coord)) {
      onPlaceSphere(coord);
    }
  };

  const renderSlotHoverTarget = (coord: PylosCoord) => {
    const canHover =
      (canActRecover && isRecoverable(coord)) ||
      (canActMove &&
        (isValidRaiseTarget(coord) ||
          isValidPlaceTarget(coord) ||
          isRaisable(coord)));
    return canHover;
  };

  const renderReserveSpheres = (playerId: PlayerId, count: number) => {
    const maxSpheres = 15;
    const isLight = playerId === 1;
    const fillId = isLight ? 'url(#pylos-tray-light)' : 'url(#pylos-tray-dark)';
    const specId = isLight ? 'url(#pylos-tray-spec-light)' : 'url(#pylos-tray-spec-dark)';
    const strokeCol = isNeon
      ? (isLight ? '#93c5fd' : '#fca5a5')
      : (isLight ? '#c5a56f' : '#57392c');

    return (
      <div className="flex flex-wrap gap-1 justify-center items-center py-0.5">
        {Array.from({ length: maxSpheres }, (_, idx) => {
          const present = idx < count;
          return (
            <svg key={idx} viewBox="-12 -12 24 24" className="w-4 h-4 sm:w-4.5 sm:h-4.5 overflow-visible">
              <circle
                cx={0}
                cy={1}
                r={9.5}
                fill={isNeon ? '#080e1c' : '#180a04'}
                stroke={isNeon ? '#334155' : '#492718'}
                strokeWidth={0.9}
              />
              {present && (
                <>
                  <circle
                    cx={0.5}
                    cy={1.2}
                    r={8.4}
                    fill="rgba(0,0,0,0.48)"
                  />
                  <circle
                    cx={0}
                    cy={-0.5}
                    r={8.8}
                    fill={fillId}
                    stroke={strokeCol}
                    strokeWidth={0.6}
                  />
                  <circle cx={0} cy={-0.5} r={8.8} fill={specId} className="pointer-events-none" />
                </>
              )}
            </svg>
          );
        })}
      </div>
    );
  };

  const activeTurnName = currentPlayerId === 1 ? player1Name : player2Name;

  const bonusLabel =
    pylosState.triggeredReason === 'both'
      ? language === 'it'
        ? 'QUADRATO 2×2 + LINEA!'
        : '2×2 SQUARE + LINE!'
      : pylosState.triggeredReason === 'line'
        ? language === 'it'
          ? 'LINEA COMPLETATA!'
          : 'LINE COMPLETED!'
        : language === 'it'
          ? 'QUADRATO 2×2!'
          : '2×2 SQUARE!';

  const totalOnBoard = useMemo(() => {
    let n = 0;
    for (let l = 0; l < 4; l++) {
      for (const row of pylosState.levels[l]) {
        for (const cell of row) {
          if (cell !== null) n++;
        }
      }
    }
    return n;
  }, [pylosState.levels]);

  return (
    <div
      className={`w-full h-full flex flex-col items-center ${
        pylosState.winner ? 'justify-start pt-0' : 'justify-between pt-0 pb-0.5'
      } select-none overflow-hidden gap-0.5`}
    >
      {/* Shared SVG defs for mini-spheres in HUD & Tray */}
      <svg className="w-0 h-0 absolute pointer-events-none" aria-hidden="true">
        <defs>
          <PylosSphereSharedDefs prefix="pylos-tray" boardStyle={boardStyle} />
        </defs>
      </svg>

      {/* TOP BAR: Players Reserve Counters + Turn/Phase Guidance (Quarto Style) */}
      <div className="w-full shrink-0">
        <div
          className={`relative border rounded-2xl px-3 py-1.5 shadow-xl flex flex-col gap-1.5 ${
            isNeon
              ? 'bg-gradient-to-r from-slate-900/95 via-slate-950/95 to-slate-900/95 border-yellow-200/40'
              : 'bg-gradient-to-r from-amber-950/85 via-stone-900/95 to-amber-950/85 border-amber-500/35'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Player 1 (Light Maple / Wall Go Neon Blue) */}
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded-xl border transition-all min-w-0 flex-1 ${
                !pylosState.winner && currentPlayerId === 1
                  ? isNeon
                    ? 'bg-blue-500/15 border-blue-400/75 shadow-[0_0_14px_rgba(59,130,246,0.28)]'
                    : 'bg-amber-500/15 border-amber-300/70 shadow-[0_0_14px_rgba(251,191,36,0.22)]'
                  : isNeon
                    ? 'bg-slate-950/60 border-slate-700/50 opacity-75'
                    : 'bg-stone-950/60 border-stone-700/50 opacity-75'
              }`}
            >
              <svg viewBox="-14 -14 28 28" className="w-7 h-7 shrink-0">
                <circle
                  cx={0}
                  cy={0}
                  r={11.5}
                  fill="url(#pylos-tray-light)"
                  stroke={isNeon ? '#93c5fd' : '#fff6e0'}
                  strokeWidth={0.9}
                />
              </svg>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className={`text-[10px] font-black uppercase truncate ${isNeon ? 'text-blue-200' : 'text-amber-100'}`}>
                  {player1Name}
                </span>
                <span className={`text-xs font-black ${isNeon ? 'text-blue-400' : 'text-amber-300'}`}>
                  {pylosState.reserve[1]}{' '}
                  <span className={`text-[9px] font-bold uppercase ${isNeon ? 'text-blue-200/70' : 'text-amber-200/70'}`}>
                    {language === 'it' ? 'sfere' : 'spheres'}
                  </span>
                </span>
              </div>
            </div>

            {/* Center Pyramid Counter / Variant Tag */}
            <div className="flex flex-col items-center justify-center shrink-0 px-1.5">
              <span className={`text-[10px] font-black tracking-wider ${isNeon ? 'text-yellow-200' : 'text-amber-400'}`}>
                {totalOnBoard}/30
              </span>
              {pylosState.lineVariant && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 whitespace-nowrap">
                  {language === 'it' ? 'Linea 4/3' : '4/3 Line'}
                </span>
              )}
            </div>

            {/* Player 2 (Dark Espresso Walnut / Wall Go Ruby Red) */}
            <div
              className={`flex items-center justify-end gap-2 px-2 py-1 rounded-xl border transition-all min-w-0 flex-1 ${
                !pylosState.winner && currentPlayerId === 2
                  ? isNeon
                    ? 'bg-red-500/15 border-red-400/75 shadow-[0_0_14px_rgba(239,68,68,0.28)]'
                    : 'bg-amber-900/30 border-amber-500/60 shadow-[0_0_14px_rgba(180,105,55,0.22)]'
                  : isNeon
                    ? 'bg-slate-950/60 border-slate-700/50 opacity-75'
                    : 'bg-stone-950/60 border-stone-700/50 opacity-75'
              }`}
            >
              <div className="flex flex-col items-end min-w-0 leading-tight">
                <span className={`text-[10px] font-black uppercase truncate ${isNeon ? 'text-red-200' : 'text-stone-100'}`}>
                  {player2Name}
                </span>
                <span className={`text-xs font-black ${isNeon ? 'text-red-400' : 'text-amber-300/90'}`}>
                  {pylosState.reserve[2]}{' '}
                  <span className={`text-[9px] font-bold uppercase ${isNeon ? 'text-red-200/70' : 'text-stone-300/75'}`}>
                    {language === 'it' ? 'sfere' : 'spheres'}
                  </span>
                </span>
              </div>
              <svg viewBox="-14 -14 28 28" className="w-7 h-7 shrink-0">
                <circle
                  cx={0}
                  cy={0}
                  r={11.5}
                  fill="url(#pylos-tray-dark)"
                  stroke={isNeon ? '#fca5a5' : '#6e4b3c'}
                  strokeWidth={0.85}
                />
                <circle cx={0} cy={0} r={11.5} fill="url(#pylos-tray-spec-dark)" className="pointer-events-none" />
              </svg>
            </div>
          </div>

          {/* Turn & Action Guidance */}
          <div className="flex items-center justify-between gap-2 px-1">
            {pylosState.winner ? (
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 mx-auto text-center">
                {pylosState.winReason === 'apex'
                  ? winDropProgress < 0.92
                    ? language === 'it'
                      ? '🎬 Cima della piramide al rallentatore...'
                      : '🎬 Slow-motion pyramid apex...'
                    : language === 'it'
                      ? '🏆 PIRAMIDE COMPLETATA!'
                      : '🏆 PYRAMID COMPLETED!'
                  : language === 'it'
                    ? '🏆 RISERVA AVVERSARIA ESAURITA!'
                    : '🏆 OPPONENT OUT OF SPHERES!'}
              </span>
            ) : pylosState.phase === 'recover' ? (
              <div className="w-full flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    ✨ {bonusLabel}
                  </span>
                  <span className={`text-[11px] font-bold truncate ${isNeon ? 'text-slate-100' : 'text-amber-100'}`}>
                    {isUserTurn && !isAIThinking
                      ? language === 'it'
                        ? `Tocca 1 o 2 tue sfere libere (${pylosState.recoverCount}/2)`
                        : `Tap 1 or 2 free spheres (${pylosState.recoverCount}/2)`
                      : language === 'it'
                        ? `${activeTurnName} sta recuperando le sfere...`
                        : `${activeTurnName} is recovering spheres...`}
                  </span>
                </div>
                {canActRecover && (
                  <button
                    type="button"
                    onClick={onFinishRecovery}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider shadow-lg active:scale-95 transition-all border border-emerald-300/40"
                  >
                    {pylosState.recoverCount > 0
                      ? language === 'it'
                        ? `Conferma (${pylosState.recoverCount})`
                        : `Confirm (${pylosState.recoverCount})`
                      : language === 'it'
                        ? 'Salta'
                        : 'Skip'}
                  </button>
                )}
              </div>
            ) : selectedRaiseFrom ? (
              <div className="w-full flex items-center justify-between gap-2">
                <span className={`text-[11px] font-bold truncate ${isNeon ? 'text-yellow-200' : 'text-amber-300'}`}>
                  {language === 'it'
                    ? '⬆️ Scegli un alloggiamento su un livello più alto'
                    : '⬆️ Choose a valid slot on a higher level'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRaiseFrom(null)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase border active:scale-95 ${
                    isNeon
                      ? 'bg-slate-800 hover:bg-slate-700 text-sky-200 border-blue-400/35'
                      : 'bg-stone-800 hover:bg-stone-700 text-amber-200 border-amber-500/30'
                  }`}
                >
                  {language === 'it' ? 'Annulla' : 'Cancel'}
                </button>
              </div>
            ) : (
              <span className={`text-[11px] font-semibold text-center w-full truncate ${isNeon ? 'text-slate-200/90' : 'text-amber-100/90'}`}>
                {canActMove
                  ? language === 'it'
                    ? 'Tocca una casella per posare dalla riserva, o una tua sfera libera per alzarla'
                    : 'Tap a socket to place from reserve, or a free own sphere to raise it'
                  : language === 'it'
                    ? `🤖 ${activeTurnName} sta valutando la mossa...`
                    : `🤖 ${activeTurnName} is thinking...`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CENTER: 3D MAHOGANY CARVED BOARD + STACKING WOODEN PYRAMID (Interactive Touch/Mouse 3D Orbit) */}
      <div
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;

          dragCleanupRef.current?.();
          dragStateRef.current = {
            active: true,
            pointerId: e.pointerId,
            lastX: e.clientX,
            lastY: e.clientY,
            totalDist: 0,
            wasDragged: false,
          };

          const pointerId = e.pointerId;

          const finishDrag = (cancelled = false) => {
            dragCleanupRef.current?.();
            dragCleanupRef.current = null;
            dragStateRef.current.active = false;
            dragStateRef.current.pointerId = null;
            setIsDragging3D(false);
            if (cancelled) {
              dragStateRef.current.wasDragged = false;
            } else {
              window.setTimeout(() => {
                dragStateRef.current.wasDragged = false;
              }, 60);
            }
          };

          const handleWindowPointerMove = (moveEv: PointerEvent) => {
            if (!dragStateRef.current.active || moveEv.pointerId !== pointerId) return;
            if (moveEv.pointerType === 'mouse' && (moveEv.buttons & 1) === 0) {
              finishDrag(false);
              return;
            }

            const dx = moveEv.clientX - dragStateRef.current.lastX;
            const dy = moveEv.clientY - dragStateRef.current.lastY;
            dragStateRef.current.lastX = moveEv.clientX;
            dragStateRef.current.lastY = moveEv.clientY;
            dragStateRef.current.totalDist += Math.hypot(dx, dy);

            if (dragStateRef.current.totalDist > 5) {
              if (!dragStateRef.current.wasDragged) {
                dragStateRef.current.wasDragged = true;
                setIsDragging3D(true);
                setHoveredCoord(null);
              }
              setBoardYaw((prev) => prev - dx * 0.011);
              setBoardPitch((prev) => Math.max(0.24, Math.min(0.86, prev + dy * 0.0036)));
            }
          };

          const handleWindowPointerUp = (upEv: PointerEvent) => {
            if (upEv.pointerId !== pointerId) return;
            finishDrag(false);
          };

          const handleWindowPointerCancel = (cancelEv: PointerEvent) => {
            if (cancelEv.pointerId !== pointerId) return;
            finishDrag(true);
          };

          const handleWindowBlur = () => {
            finishDrag(true);
          };

          window.addEventListener('pointermove', handleWindowPointerMove);
          window.addEventListener('pointerup', handleWindowPointerUp);
          window.addEventListener('pointercancel', handleWindowPointerCancel);
          window.addEventListener('blur', handleWindowBlur);

          dragCleanupRef.current = () => {
            window.removeEventListener('pointermove', handleWindowPointerMove);
            window.removeEventListener('pointerup', handleWindowPointerUp);
            window.removeEventListener('pointercancel', handleWindowPointerCancel);
            window.removeEventListener('blur', handleWindowBlur);
          };
        }}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (dragStateRef.current.wasDragged) {
            e.preventDefault();
            e.stopPropagation();
            dragStateRef.current.wasDragged = false;
          }
        }}
        style={{ touchAction: 'none' }}
        className={`relative w-full flex-1 min-h-0 flex items-center justify-center select-none ${
          isDragging3D ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <svg
          viewBox={`0 0 460 ${boardGeometry.svgHeight}`}
          className="w-full h-full max-h-full overflow-visible select-none"
          preserveAspectRatio="xMidYMid meet"
          onDragStart={(e) => e.preventDefault()}
        >
          <defs>
            <PylosSphereSharedDefs prefix="pylos3d" boardStyle={boardStyle} />
            <clipPath id="pylos3d-unit-clip">
              <circle cx={0} cy={0} r={1} />
            </clipPath>
            <clipPath id="pylos-board-slab-clip">
              <path d={boardGeometry.topSlabPath} />
            </clipPath>

            {slotsByLevel[0].map((slot) => {
              const rxBowl = SOCKET_BOWL_RX * slot.scale;
              const ryBowl = socketInnerRy * slot.scale;
              const halfWidthAtBase = Math.sqrt(
                Math.max(0, slot.radius * slot.radius - (slot.baseY - slot.y) * (slot.baseY - slot.y))
              );
              const rxClip = Math.max(rxBowl, halfWidthAtBase + 0.6 * slot.scale);
              const clipPad = slot.radius * 2.2;
              const seatPath = `M ${(slot.x - clipPad).toFixed(1)} ${(slot.baseY - clipPad).toFixed(1)} L ${(slot.x + clipPad).toFixed(1)} ${(slot.baseY - clipPad).toFixed(1)} L ${(slot.x + clipPad).toFixed(1)} ${slot.baseY.toFixed(1)} L ${(slot.x + rxClip).toFixed(1)} ${slot.baseY.toFixed(1)} A ${rxClip.toFixed(1)} ${ryBowl.toFixed(1)} 0 0 1 ${(slot.x - rxClip).toFixed(1)} ${slot.baseY.toFixed(1)} L ${(slot.x - clipPad).toFixed(1)} ${slot.baseY.toFixed(1)} Z`;
              return (
                <clipPath key={`seat-clip-${slot.r}-${slot.c}`} id={`pylos3d-seat-${slot.r}-${slot.c}`}>
                  <path d={seatPath} />
                </clipPath>
              );
            })}

            <filter id="pylos3d-board-shadow-blur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.4" />
            </filter>
            <filter id="pylos3d-cast-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
            <filter id="pylos3d-saddle-soft" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>

            <linearGradient id="pylos-wood-top" x1="12%" y1="6%" x2="88%" y2="94%">
              <stop offset="0%" stopColor="#7a4730" />
              <stop offset="34%" stopColor="#683823" />
              <stop offset="72%" stopColor="#532a19" />
              <stop offset="100%" stopColor="#3c1d10" />
            </linearGradient>

            <linearGradient id="pylos-neon-top" x1="12%" y1="6%" x2="88%" y2="94%">
              <stop offset="0%" stopColor="#263449" />
              <stop offset="34%" stopColor="#1e293b" />
              <stop offset="72%" stopColor="#162032" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="pylos-wood-side-left" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5b311e" />
              <stop offset="100%" stopColor="#391b0e" />
            </linearGradient>
            <linearGradient id="pylos-wood-side-right" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#401f11" />
              <stop offset="100%" stopColor="#230e06" />
            </linearGradient>

            <linearGradient id="pylos-neon-side-left" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="pylos-neon-side-right" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <linearGradient id="pylos-socket-recess" x1="16%" y1="12%" x2="86%" y2="90%">
              <stop offset="0%" stopColor="#120502" />
              <stop offset="48%" stopColor="#2c1208" />
              <stop offset="100%" stopColor="#69341d" />
            </linearGradient>

            <linearGradient id="pylos-neon-socket-recess" x1="16%" y1="12%" x2="86%" y2="90%">
              <stop offset="0%" stopColor="#060b16" />
              <stop offset="48%" stopColor="#111c30" />
              <stop offset="100%" stopColor="#273854" />
            </linearGradient>

            <linearGradient id="pylos-inlay-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#efe2ca" />
              <stop offset="50%" stopColor="#d8c5a1" />
              <stop offset="100%" stopColor="#b9a079" />
            </linearGradient>

            <linearGradient id="pylos-neon-inlay-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            <radialGradient id="pylos-cast-grad" cx="44%" cy="48%" r="54%">
              <stop offset="0%" stopColor="rgba(8, 2, 0, 0.62)" />
              <stop offset="42%" stopColor="rgba(8, 2, 0, 0.40)" />
              <stop offset="72%" stopColor="rgba(10, 3, 0, 0.16)" />
              <stop offset="100%" stopColor="rgba(10, 3, 0, 0)" />
            </radialGradient>

            <radialGradient id="pylos-pocket-ao" cx="50%" cy="54%" r="50%">
              <stop offset="0%" stopColor="rgba(5, 1, 0, 0.80)" />
              <stop offset="68%" stopColor="rgba(6, 2, 0, 0.40)" />
              <stop offset="100%" stopColor="rgba(6, 2, 0, 0)" />
            </radialGradient>

            <radialGradient id="pylos-saddle-ao" cx="46%" cy="48%" r="54%">
              <stop offset="0%" stopColor="rgba(6, 1, 0, 0.50)" />
              <stop offset="56%" stopColor="rgba(8, 2, 0, 0.22)" />
              <stop offset="100%" stopColor="rgba(8, 2, 0, 0)" />
            </radialGradient>
          </defs>

          {/* Ambient Floor Shadow under the 3D Board */}
          <path
            d={boardGeometry.topSlabPath}
            fill="rgba(0, 0, 0, 0.58)"
            filter="url(#pylos3d-board-shadow-blur)"
            transform={`translate(0, ${boardGeometry.thickness + 10})`}
          />

          {/* 3D Board Extruded Side Walls */}
          {boardGeometry.sideWalls.map((wall) => (
            <path
              key={`wall-${wall.key}`}
              d={wall.path}
              fill={
                isNeon
                  ? ((wall as any).isLeftLit ? 'url(#pylos-neon-side-left)' : 'url(#pylos-neon-side-right)')
                  : wall.fill
              }
            />
          ))}

          {/* 3D Board Top Slab (Warm Walnut or Wall Go Neon) */}
          <path
            d={boardGeometry.topSlabPath}
            fill={isNeon ? 'url(#pylos-neon-top)' : 'url(#pylos-wood-top)'}
            stroke={isNeon ? '#fef08a' : '#965e42'}
            strokeWidth={isNeon ? 2 : 1.4}
          />

          {/* Subtle Carved Perspective Inner Border */}
          <path
            d={boardGeometry.innerFramePath}
            fill="none"
            stroke={isNeon ? '#ca8a04' : '#240f06'}
            strokeOpacity={isNeon ? 0.55 : 0.32}
            strokeWidth={1.1}
            strokeLinejoin="round"
            className="pointer-events-none"
          />

          {/* Subtle Matte Wood Grain or Wall Go Neon Accent */}
          <g
            stroke={isNeon ? 'rgba(255, 255, 255, 0.16)' : '#220d05'}
            strokeOpacity={isNeon ? 0.32 : 0.16}
            strokeWidth={1.1}
            fill="none"
            className="pointer-events-none"
          >
            {boardGeometry.grainPaths.map((d, idx) => (
              <path key={`grain-${idx}`} d={d} />
            ))}
          </g>

          {/* Level 0 Carved Recessed Sockets with Inlaid Rings (4x4) */}
          {slotsByLevel[0].map((slot) => {
            const coord: PylosCoord = { level: 0, r: slot.r, c: slot.c };
            const occupant = pylosState.levels[0][slot.r][slot.c];
            const isHovered = sameCoord(hoveredCoord, coord);
            const validPlace = occupant === null && isValidPlaceTarget(coord);
            const isBonus = isTriggeredCell(coord);

            return (
              <g
                key={`socket-0-${slot.r}-${slot.c}`}
                onClick={() => handleSlotTap(coord)}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse' && !dragStateRef.current.active && renderSlotHoverTarget(coord)) {
                    setHoveredCoord(coord);
                  }
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === 'mouse' && sameCoord(hoveredCoord, coord)) {
                    setHoveredCoord(null);
                  }
                }}
                className={renderSlotHoverTarget(coord) && !isDragging3D ? 'cursor-pointer' : ''}
              >
                {/* Signature Cream-Ivory / Neon Inlaid Bevel Ring */}
                <ellipse
                  cx={slot.x}
                  cy={slot.baseY}
                  rx={SOCKET_RING_RX * slot.scale}
                  ry={socketRy * slot.scale}
                  fill={isNeon ? 'url(#pylos-neon-socket-recess)' : 'url(#pylos-socket-recess)'}
                  stroke={
                    isBonus
                      ? '#34d399'
                      : isHovered && validPlace
                        ? '#fde047'
                        : isNeon
                          ? 'url(#pylos-neon-inlay-ring)'
                          : 'url(#pylos-inlay-ring)'
                  }
                  strokeWidth={isBonus || (isHovered && validPlace) ? 2.5 * slot.scale : 2.2 * slot.scale}
                />
                {/* Recessed Concave Cavity */}
                <ellipse
                  cx={slot.x}
                  cy={slot.baseY + 0.5 * slot.scale}
                  rx={SOCKET_BOWL_RX * slot.scale}
                  ry={socketInnerRy * slot.scale}
                  fill={
                    isHovered && validPlace
                      ? 'rgba(250, 204, 21, 0.16)'
                      : isNeon
                        ? 'url(#pylos-neon-socket-recess)'
                        : 'url(#pylos-socket-recess)'
                  }
                  stroke={isNeon ? '#060b16' : '#120502'}
                  strokeOpacity={0.78}
                  strokeWidth={0.9 * slot.scale}
                />
              </g>
            );
          })}

          {/* Dedicated Board Cast-Shadow Pass (Congruent with Upper-Left Key Light -> Bottom-Right Shadow) */}
          <g clipPath="url(#pylos-board-slab-clip)" className="pointer-events-none">
            {slotsByLevel[0].map((slot) => {
              const coord: PylosCoord = { level: 0, r: slot.r, c: slot.c };
              const occupant = pylosState.levels[0][slot.r][slot.c];
              const isSelected = sameCoord(selectedRaiseFrom, coord);
              const isDropTarget =
                activeAnim?.kind === 'place' && sameCoord(activeAnim.to, coord);
              const isDepartingFrom =
                activeAnim?.kind === 'raise' &&
                activeAnim.from &&
                sameCoord(activeAnim.from, coord);

              if (occupant === null && !isDepartingFrom) return null;

              let heightRatio = 0;
              let shadowOpacity = 1;
              if (isDepartingFrom && activeAnim) {
                heightRatio = Math.min(1, 0.25 + activeAnim.progress * 0.9);
                shadowOpacity = Math.max(0, 1 - activeAnim.progress * 2.6);
              } else if (isDropTarget && activeAnim) {
                const eased = 1 - Math.pow(1 - activeAnim.progress, 3);
                heightRatio = 1 - eased;
                shadowOpacity = 0.24 + 0.76 * eased;
              } else if (isSelected) {
                heightRatio = 0.22 * selectLiftProgress;
                shadowOpacity = 1 - 0.38 * selectLiftProgress;
              }

              if (shadowOpacity <= 0.01) return null;
              const shadowScale = 1 - heightRatio * 0.28;
              const shiftX = (17.5 + heightRatio * 14) * slot.scale;
              const shiftY = (9.5 + heightRatio * 10) * slot.scale;

              return (
                <g key={`cast-0-${slot.r}-${slot.c}`} opacity={shadowOpacity}>
                  {/* Congruent studio penumbra shadow cast toward bottom-right */}
                  <g transform={`translate(${slot.x + shiftX}, ${slot.baseY + shiftY}) rotate(27)`}>
                    <ellipse
                      cx={0}
                      cy={0}
                      rx={slot.radius * 1.14 * shadowScale}
                      ry={slot.radius * 0.70 * Math.max(0.84, boardPitch * 1.32) * shadowScale}
                      fill="url(#pylos-cast-grad)"
                      filter="url(#pylos3d-cast-soft)"
                    />
                  </g>
                  {/* Contact ambient occlusion deep inside the concave socket */}
                  {heightRatio < 0.5 && (
                    <ellipse
                      cx={slot.x + 1.8 * slot.scale}
                      cy={slot.baseY + 1.2 * slot.scale}
                      rx={SOCKET_BOWL_RX * 1.0 * slot.scale}
                      ry={socketInnerRy * 1.0 * slot.scale}
                      fill="url(#pylos-pocket-ao)"
                      opacity={Math.max(0, 1 - heightRatio * 2.2)}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Render All Occupied 3D Spheres Using True Camera-Depth Painter's Sort + Fluid Drop/Arc Animations */}
          <g>
            {[...allSlots]
              .filter((slot) => pylosState.levels[slot.level][slot.r][slot.c] !== null)
              .sort((a, b) => {
                const aCoord = { level: a.level, r: a.r, c: a.c };
                const bCoord = { level: b.level, r: b.r, c: b.c };
                const aSel = sameCoord(selectedRaiseFrom, aCoord) ? 0.8 : 0;
                const bSel = sameCoord(selectedRaiseFrom, bCoord) ? 0.8 : 0;
                const aAnim =
                  activeAnim && sameCoord(activeAnim.to, aCoord) ? 3.5 : 0;
                const bAnim =
                  activeAnim && sameCoord(activeAnim.to, bCoord) ? 3.5 : 0;
                return (
                  (a.viewZ + aSel + aAnim) - (b.viewZ + bSel + bAnim) ||
                  a.level - b.level ||
                  a.x - b.x
                );
              })
              .map((slot) => {
                const { level } = slot;
                const coord: PylosCoord = { level, r: slot.r, c: slot.c };
                const occupant = pylosState.levels[level][slot.r][slot.c]!;
                const isSelected = sameCoord(selectedRaiseFrom, coord);
                const isHovered = sameCoord(hoveredCoord, coord);
                const canRecover = isRecoverable(coord);
                const canRaise = occupant === currentPlayerId && isRaisable(coord);
                const isBonus = isTriggeredCell(coord);
                const isLast = sameCoord(pylosState.lastMove?.to, coord);
                const isWinningApex =
                  level === 3 &&
                  pylosState.winner &&
                  pylosState.winReason === 'apex';

                const isAnimatingThisTo =
                  !!activeAnim && sameCoord(activeAnim.to, coord);

                let drawX = slot.x;
                let drawY = slot.y;
                let drawRadius = slot.radius;
                let animProgress = 1;

                if (isAnimatingThisTo && activeAnim) {
                  const linear = activeAnim.progress;
                  animProgress = linear;
                  if (activeAnim.kind === 'place') {
                    const eased = 1 - Math.pow(1 - linear, 3);
                    const dropDist = activeAnim.isWinningApex
                      ? 175 * slot.scale
                      : 112 * slot.scale;
                    drawY = slot.y - dropDist * (1 - eased);
                  } else if (activeAnim.kind === 'raise' && activeAnim.from) {
                    const fromPt = getPyramid3DPoint(
                      activeAnim.from.level,
                      activeAnim.from.r,
                      activeAnim.from.c
                    );
                    const easeInOut =
                      linear < 0.5
                        ? 4 * linear * linear * linear
                        : 1 - Math.pow(-2 * linear + 2, 3) / 2;
                    const startY = fromPt.y - 16 * fromPt.scale;
                    const arcLift =
                      66 * slot.scale * Math.sin(Math.PI * Math.pow(linear, 0.85));
                    drawX = fromPt.x + (slot.x - fromPt.x) * easeInOut;
                    drawY = startY + (slot.y - startY) * easeInOut - arcLift;
                    drawRadius = fromPt.radius + (slot.radius - fromPt.radius) * easeInOut;
                  }
                } else if (isSelected) {
                  drawY = slot.y - 24 * slot.scale * selectLiftProgress;
                }

                const isSettled = !isAnimatingThisTo && (!isSelected || selectLiftProgress < 0.08);
                const isSeatedInSocket = level === 0 && isSettled;
                const shadowOpacity = isAnimatingThisTo
                  ? Math.pow(animProgress, 1.8)
                  : isSelected
                    ? 1 - 0.45 * selectLiftProgress
                    : 1;

                const rxRing = SOCKET_RING_RX * slot.scale;
                const ryRing = socketRy * slot.scale;
                const rxBowl = SOCKET_BOWL_RX * slot.scale;
                const ryBowl = socketInnerRy * slot.scale;
                const arcCos = Math.cos((24 * Math.PI) / 180);
                const arcSin = Math.sin((24 * Math.PI) / 180);

                return (
                  <g
                    key={`sphere-${level}-${slot.r}-${slot.c}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSlotTap(coord);
                    }}
                    onPointerEnter={(e) => {
                      if (
                        e.pointerType === 'mouse' &&
                        !dragStateRef.current.active &&
                        renderSlotHoverTarget(coord)
                      ) {
                        setHoveredCoord(coord);
                      }
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === 'mouse' && sameCoord(hoveredCoord, coord)) {
                        setHoveredCoord(null);
                      }
                    }}
                    className={renderSlotHoverTarget(coord) && !isDragging3D ? 'cursor-pointer' : ''}
                  >
                    {/* Slow-motion apex vertical guide */}
                    {isWinningApex && isAnimatingThisTo && animProgress < 0.96 && (
                      <line
                        x1={slot.x}
                        y1={slot.y}
                        x2={drawX}
                        y2={drawY}
                        stroke="#fde047"
                        strokeWidth={2.2}
                        strokeDasharray="5 4"
                        strokeOpacity={0.75}
                      />
                    )}

                    {/* Congruent upper-tier directional saddle shadow toward bottom-right */}
                    {level > 0 && (
                      <g
                        transform={`translate(${slot.x + slot.radius * 0.24}, ${slot.y + slot.radius * 0.54}) rotate(26)`}
                        opacity={shadowOpacity}
                        className="pointer-events-none"
                      >
                        <ellipse
                          cx={0}
                          cy={0}
                          rx={slot.radius * 0.78}
                          ry={slot.radius * 0.34}
                          fill="url(#pylos-saddle-ao)"
                          filter="url(#pylos3d-saddle-soft)"
                        />
                      </g>
                    )}

                    {/* Selection / Recoverable / Winning Halo Behind/Around Sphere */}
                    {(isSelected || canRecover || isBonus || isWinningApex) && (
                      <circle
                        cx={drawX}
                        cy={drawY}
                        r={drawRadius + 4.2 * slot.scale}
                        fill="none"
                        stroke={
                          isWinningApex
                            ? '#34d399'
                            : isSelected
                              ? '#facc15'
                              : canRecover
                                ? isHovered
                                  ? '#34d399'
                                  : '#4ade80'
                                : '#fbbf24'
                        }
                        strokeWidth={isSelected || isWinningApex ? 3.2 : 2.2}
                      />
                    )}

                    {/* Photorealistic 3D Turned Wooden Sphere (Clipped to concave bowl when seated at Level 0) */}
                    <g clipPath={isSeatedInSocket ? `url(#pylos3d-seat-${slot.r}-${slot.c})` : undefined}>
                      <g
                        transform={`translate(${drawX}, ${drawY}) scale(${drawRadius})`}
                        clipPath="url(#pylos3d-unit-clip)"
                      >
                        <circle
                          cx={0}
                          cy={0}
                          r={1}
                          fill={occupant === 1 ? 'url(#pylos3d-light)' : 'url(#pylos3d-dark)'}
                        />
                        {/* Concentric lathe-turned wood / subtle neon sheen contour rings */}
                        <g
                          fill="none"
                          stroke={
                            isNeon
                              ? (occupant === 1 ? '#bfdbfe' : '#fecaca')
                              : (occupant === 1 ? '#876330' : '#734b38')
                          }
                          opacity={isNeon ? 0.08 : (occupant === 1 ? 0.16 : 0.12)}
                        >
                          <ellipse cx={-0.14} cy={-0.22} rx={0.26} ry={0.17} transform="rotate(-14 -0.14 -0.22)" strokeWidth={0.025} />
                          <ellipse cx={-0.11} cy={-0.17} rx={0.46} ry={0.30} transform="rotate(-14 -0.11 -0.17)" strokeWidth={0.022} />
                          <ellipse cx={-0.07} cy={-0.11} rx={0.68} ry={0.45} transform="rotate(-14 -0.07 -0.11)" strokeWidth={0.024} />
                          <ellipse cx={-0.03} cy={-0.03} rx={0.90} ry={0.60} transform="rotate(-14 -0.03 -0.03)" strokeWidth={0.024} />
                          <ellipse cx={0.03} cy={0.12} rx={1.12} ry={0.75} transform="rotate(-14 0.03 0.12)" strokeWidth={0.022} />
                        </g>
                        {/* Warm underside bounce rim light */}
                        <circle
                          cx={0}
                          cy={0}
                          r={1}
                          fill={occupant === 1 ? 'url(#pylos3d-bounce-light)' : 'url(#pylos3d-bounce-dark)'}
                        />
                        {/* Soft studio specular highlight */}
                        <circle
                          cx={0}
                          cy={0}
                          r={1}
                          fill={occupant === 1 ? 'url(#pylos3d-spec-light)' : 'url(#pylos3d-spec-dark)'}
                        />
                        {/* Crisp inner studio lamp gleam */}
                        <ellipse
                          cx={-0.31}
                          cy={-0.35}
                          rx={0.13}
                          ry={0.09}
                          transform="rotate(-28 -0.31 -0.35)"
                          fill="#fffcf6"
                          opacity={occupant === 1 ? 0.44 : 0.56}
                        />
                      </g>

                      {/* Natural Edge Separation / Interactive Outline */}
                      <circle
                        cx={drawX}
                        cy={drawY}
                        r={drawRadius}
                        fill="none"
                        stroke={
                          isSelected
                            ? '#fef08a'
                            : canRecover
                              ? '#86efac'
                              : isLast && !isAnimatingThisTo
                                ? '#38bdf8'
                                : isNeon
                                  ? (occupant === 1 ? NEON_BLUE_PALETTE.rimStroke : NEON_RED_PALETTE.rimStroke)
                                  : occupant === 1
                                    ? LIGHT_PALETTE.rimStroke
                                    : DARK_PALETTE.rimStroke
                        }
                        strokeOpacity={isSelected || canRecover || (isLast && !isAnimatingThisTo) ? 1 : (isNeon ? 0.48 : 0.35)}
                        strokeWidth={isSelected || canRecover || (isLast && !isAnimatingThisTo) ? 2 : 0.55}
                        className="pointer-events-none"
                      />
                    </g>

                    {/* Front Concave Socket Lip Wrapping Over Seated Sphere Base */}
                    {isSeatedInSocket && (
                      <g className="pointer-events-none">
                        <path
                          d={`M ${(slot.x + rxBowl * arcCos).toFixed(1)} ${(slot.baseY + ryBowl * arcSin).toFixed(1)} A ${rxBowl.toFixed(1)} ${ryBowl.toFixed(1)} 0 0 1 ${(slot.x - rxBowl * arcCos).toFixed(1)} ${(slot.baseY + ryBowl * arcSin).toFixed(1)}`}
                          fill="none"
                          stroke={isNeon ? '#060b16' : '#120502'}
                          strokeOpacity={0.72}
                          strokeWidth={1.1 * slot.scale}
                          strokeLinecap="round"
                        />
                        <path
                          d={`M ${(slot.x + rxRing * arcCos).toFixed(1)} ${(slot.baseY + ryRing * arcSin).toFixed(1)} A ${rxRing.toFixed(1)} ${ryRing.toFixed(1)} 0 0 1 ${(slot.x - rxRing * arcCos).toFixed(1)} ${(slot.baseY + ryRing * arcSin).toFixed(1)}`}
                          fill="none"
                          stroke={
                            isBonus
                              ? '#34d399'
                              : isNeon
                                ? 'url(#pylos-neon-inlay-ring)'
                                : 'url(#pylos-inlay-ring)'
                          }
                          strokeWidth={2.0 * slot.scale}
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {/* Subtle Up-Arrow Affordance on Hover for Raisable Spheres */}
                    {canRaise && !selectedRaiseFrom && isHovered && (
                      <text
                        x={drawX}
                        y={drawY + 5 * slot.scale}
                        textAnchor="middle"
                        className="fill-amber-200 font-black text-[18px] pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                      >
                        ▲
                      </text>
                    )}
                  </g>
                );
              })}
          </g>

          {/* Interactive Empty Upper-Tier Pockets & Hover Ghost Spheres */}
          <g>
            {allSlots.map((slot) => {
              const { level } = slot;
              const coord: PylosCoord = { level, r: slot.r, c: slot.c };
              const occupant = pylosState.levels[level][slot.r][slot.c];
              if (occupant !== null) return null;

              const validPlace = isValidPlaceTarget(coord);
              const validRaiseDest = isValidRaiseTarget(coord);
              const isTargetUpper = level > 0 && (validPlace || validRaiseDest);
              const isHovered = sameCoord(hoveredCoord, coord);
              if (!isTargetUpper && !isHovered) return null;

              const ghostFill =
                currentPlayerId === 1 ? 'url(#pylos3d-light)' : 'url(#pylos3d-dark)';

              return (
                <g
                  key={`target-${level}-${slot.r}-${slot.c}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlotTap(coord);
                  }}
                  onPointerEnter={(e) => {
                    if (
                      e.pointerType === 'mouse' &&
                      !dragStateRef.current.active &&
                      renderSlotHoverTarget(coord)
                    ) {
                      setHoveredCoord(coord);
                    }
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === 'mouse' && sameCoord(hoveredCoord, coord)) {
                      setHoveredCoord(null);
                    }
                  }}
                  className={renderSlotHoverTarget(coord) && !isDragging3D ? 'cursor-pointer' : ''}
                >
                  {isTargetUpper && (
                    <g>
                      <ellipse
                        cx={slot.x}
                        cy={slot.y + 8 * slot.scale}
                        rx={slot.radius * 0.62}
                        ry={slot.radius * 0.62 * boardPitch}
                        fill={
                          validRaiseDest
                            ? 'rgba(52, 211, 153, 0.24)'
                            : isHovered
                              ? 'rgba(250, 204, 21, 0.32)'
                              : 'rgba(250, 204, 21, 0.14)'
                        }
                        stroke={validRaiseDest ? '#34d399' : '#fde047'}
                        strokeWidth={isHovered ? 2.4 : 1.6}
                        strokeDasharray={validRaiseDest ? undefined : '4 3'}
                      />
                      <circle
                        cx={slot.x}
                        cy={slot.y}
                        r={slot.radius * 0.24}
                        fill={validRaiseDest ? 'rgba(52, 211, 153, 0.62)' : 'rgba(253, 224, 71, 0.45)'}
                      />
                    </g>
                  )}

                  {isHovered && (validPlace || validRaiseDest) && (
                    <circle
                      cx={slot.x}
                      cy={slot.y}
                      r={slot.radius}
                      fill={ghostFill}
                      opacity={0.55}
                      stroke={validRaiseDest ? '#34d399' : '#fde047'}
                      strokeWidth={1.8}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* BOTTOM: QUARTO-STYLE CARVED WOODEN / NEON RESERVE TRAYS */}
      {!pylosState.winner && (
        <div className="w-full shrink-0">
          <div
            className={`rounded-2xl p-2 border shadow-2xl ${
              isNeon
                ? 'bg-gradient-to-b from-slate-900/95 to-slate-950 border-yellow-200/40'
                : 'bg-gradient-to-b from-stone-900/95 to-stone-950 border-amber-500/35'
            }`}
          >
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`rounded-xl px-2 py-1 border flex flex-col items-center ${
                  isNeon ? 'bg-slate-900/80 border-blue-400/30' : 'bg-stone-900/75 border-amber-400/20'
                }`}
              >
                <span className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${isNeon ? 'text-blue-200/90' : 'text-amber-200/80'}`}>
                  {isNeon
                    ? language === 'it'
                      ? 'Riserva Blu'
                      : 'Blue Reserve'
                    : language === 'it'
                      ? 'Riserva Chiare'
                      : 'Light Reserve'}{' '}
                  ({pylosState.reserve[1]}/15)
                </span>
                {renderReserveSpheres(1, pylosState.reserve[1])}
              </div>
              <div
                className={`rounded-xl px-2 py-1 border flex flex-col items-center ${
                  isNeon ? 'bg-slate-900/80 border-red-400/30' : 'bg-stone-900/75 border-amber-700/35'
                }`}
              >
                <span className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${isNeon ? 'text-red-200/90' : 'text-stone-300/85'}`}>
                  {isNeon
                    ? language === 'it'
                      ? 'Riserva Rosse'
                      : 'Red Reserve'
                    : language === 'it'
                      ? 'Riserva Scure'
                      : 'Dark Reserve'}{' '}
                  ({pylosState.reserve[2]}/15)
                </span>
                {renderReserveSpheres(2, pylosState.reserve[2])}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PylosBoard;
