import React, { useState, useMemo, useEffect } from 'react';
import { Language, PlayerId, Point } from '../types';
import { QuartoState, getQuartoPieceAttributes } from '../utils/quartoLogic';

export type QuartoBoardStyle = 'neon' | 'classic';

interface QuartoBoardProps {
  quartoState: QuartoState;
  onSelectPiece: (pieceId: number) => void;
  onPlacePiece: (r: number, c: number) => void;
  isUserTurn: boolean;
  isAIThinking: boolean;
  currentPlayerName: string;
  opponentPlayerName: string;
  language: Language;
  boardStyle?: QuartoBoardStyle;
}

/**
 * Renders a single 3D Quarto wooden piece centered at (cx, cy) on its base.
 * Faithfully reproduces the turned/carved wooden pieces from the classic Quarto board:
 * - Light maple wood vs Dark walnut/wenge wood
 * - Tall (with mid-height horizontal groove) vs Short (with upper-third horizontal groove)
 * - Cylindrical (round lathe-turned) vs Square prism (diamond isometric block with waist groove)
 * - Hollow top (deep 3D drilled cavity with inner wall shadow) vs Solid flat top
 */
const DARK_PALETTE = {
  bodyStops: [
    { offset: '0%', color: '#c95b1c' },
    { offset: '22%', color: '#e06f2b' },
    { offset: '52%', color: '#b04811' },
    { offset: '82%', color: '#7c2e07' },
    { offset: '100%', color: '#963b0c' },
  ],
  leftFaceTop: '#dc6b27',
  leftFaceBottom: '#b84d13',
  rightFaceTop: '#9c3d0c',
  rightFaceBottom: '#732906',
  topLight: '#ea7b36',
  topMid: '#c65819',
  topDark: '#9e3f0d',
  rimStroke: '#f59352',
  grooveShadow: '#4a1802',
  grooveHighlight: '#ee8543',
  holeDark: '#3d1302',
  holeMid: '#6e2807',
  holeLit: '#bd5216',
  holeFloor: '#290c01',
};

const LIGHT_PALETTE = {
  bodyStops: [
    { offset: '0%', color: '#e8ca96' },
    { offset: '24%', color: '#f9e5be' },
    { offset: '55%', color: '#dfb97c' },
    { offset: '84%', color: '#b58b4c' },
    { offset: '100%', color: '#c9a063' },
  ],
  leftFaceTop: '#f6dfb4',
  leftFaceBottom: '#dfc08a',
  rightFaceTop: '#cfa86b',
  rightFaceBottom: '#ab8144',
  topLight: '#fcf0d5',
  topMid: '#ecd09c',
  topDark: '#d4b075',
  rimStroke: '#fff6e0',
  grooveShadow: '#785626',
  grooveHighlight: '#fbe8c4',
  holeDark: '#5e4119',
  holeMid: '#8c6630',
  holeLit: '#d8b478',
  holeFloor: '#3d280c',
};

const NEON_RED_PALETTE = {
  bodyStops: [
    { offset: '0%', color: '#dc2626' },
    { offset: '22%', color: '#ef4444' },
    { offset: '52%', color: '#b91c1c' },
    { offset: '82%', color: '#7f1d1d' },
    { offset: '100%', color: '#991b1b' },
  ],
  leftFaceTop: '#f87171',
  leftFaceBottom: '#dc2626',
  rightFaceTop: '#b91c1c',
  rightFaceBottom: '#7f1d1d',
  topLight: '#fca5a5',
  topMid: '#ef4444',
  topDark: '#b91c1c',
  rimStroke: '#fecaca',
  grooveShadow: '#450a0a',
  grooveHighlight: '#fca5a5',
  holeDark: '#3f0707',
  holeMid: '#7f1d1d',
  holeLit: '#dc2626',
  holeFloor: '#240404',
};

const NEON_BLUE_PALETTE = {
  bodyStops: [
    { offset: '0%', color: '#2563eb' },
    { offset: '24%', color: '#60a5fa' },
    { offset: '55%', color: '#3b82f6' },
    { offset: '84%', color: '#1d4ed8' },
    { offset: '100%', color: '#1e40af' },
  ],
  leftFaceTop: '#60a5fa',
  leftFaceBottom: '#3b82f6',
  rightFaceTop: '#2563eb',
  rightFaceBottom: '#1e3a8a',
  topLight: '#bfdbfe',
  topMid: '#60a5fa',
  topDark: '#2563eb',
  rimStroke: '#dbeafe',
  grooveShadow: '#0f2557',
  grooveHighlight: '#93c5fd',
  holeDark: '#0b193d',
  holeMid: '#1e3a8a',
  holeLit: '#3b82f6',
  holeFloor: '#060e24',
};

const renderPaletteDefs = (gradId: string, palette: typeof DARK_PALETTE) => (
  <>
    <linearGradient id={`${gradId}-cyl`} x1="0%" y1="0%" x2="100%" y2="0%">
      {palette.bodyStops.map((s, idx) => (
        <stop key={idx} offset={s.offset} stopColor={s.color} />
      ))}
    </linearGradient>
    <linearGradient id={`${gradId}-sqL`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={palette.leftFaceTop} />
      <stop offset="100%" stopColor={palette.leftFaceBottom} />
    </linearGradient>
    <linearGradient id={`${gradId}-sqR`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={palette.rightFaceTop} />
      <stop offset="100%" stopColor={palette.rightFaceBottom} />
    </linearGradient>
    <linearGradient id={`${gradId}-top`} x1="15%" y1="15%" x2="85%" y2="85%">
      <stop offset="0%" stopColor={palette.topLight} />
      <stop offset="55%" stopColor={palette.topMid} />
      <stop offset="100%" stopColor={palette.topDark} />
    </linearGradient>
    <linearGradient id={`${gradId}-hole`} x1="15%" y1="15%" x2="90%" y2="90%">
      <stop offset="0%" stopColor={palette.holeDark} />
      <stop offset="45%" stopColor={palette.holeMid} />
      <stop offset="100%" stopColor={palette.holeLit} />
    </linearGradient>
  </>
);

export const QuartoPieceSharedDefs: React.FC<{ prefix: string; boardStyle?: QuartoBoardStyle }> = ({
  prefix,
  boardStyle = 'classic',
}) => {
  const isNeon = boardStyle === 'neon';
  return (
    <>
      {renderPaletteDefs(
        `${prefix}-${isNeon ? 'neon-' : ''}dark`,
        isNeon ? NEON_RED_PALETTE : DARK_PALETTE
      )}
      {renderPaletteDefs(
        `${prefix}-${isNeon ? 'neon-' : ''}light`,
        isNeon ? NEON_BLUE_PALETTE : LIGHT_PALETTE
      )}
    </>
  );
};

export const Quarto3DPiece: React.FC<{
  pieceId: number;
  cx: number;
  cy: number;
  scale?: number;
  opacity?: number;
  isGhost?: boolean;
  isHighlighted?: boolean;
  isWinning?: boolean;
  isLastPlaced?: boolean;
  dropOffsetY?: number;
  uidPrefix?: string;
  sharedDefsPrefix?: string;
  boardStyle?: QuartoBoardStyle;
}> = ({
  pieceId,
  cx,
  cy,
  scale = 1,
  opacity,
  isGhost = false,
  isHighlighted = false,
  isWinning = false,
  isLastPlaced = false,
  dropOffsetY = 0,
  uidPrefix = 'qp',
  sharedDefsPrefix,
  boardStyle = 'classic',
}) => {
  const attrs = getQuartoPieceAttributes(pieceId);
  const { isDark, isTall, isSquare, isHollow } = attrs;
  const isNeon = boardStyle === 'neon';

  // Dimensions in local piece space before scale
  const height = isTall ? 68 : 39;
  const rx = isSquare ? 21 : 19.5; // half-width
  const ry = isSquare ? 11.5 : 10.5; // perspective half-depth
  const grooveRatio = isTall ? 0.50 : 0.56; // height fraction where horizontal groove sits
  const grooveY = -height * grooveRatio;

  const palette = isNeon
    ? (isDark ? NEON_RED_PALETTE : NEON_BLUE_PALETTE)
    : (isDark ? DARK_PALETTE : LIGHT_PALETTE);
  const gradId = sharedDefsPrefix
    ? `${sharedDefsPrefix}-${isNeon ? 'neon-' : ''}${isDark ? 'dark' : 'light'}`
    : `${uidPrefix}-${isNeon ? 'neon-' : ''}p${pieceId}`;

  const isDropping = dropOffsetY < -1.5;
  const shadowScale = isDropping ? Math.max(0.35, 1 - Math.abs(dropOffsetY) / 260) : 1;
  const shadowOpacity = isDropping ? Math.max(0.15, 0.48 * shadowScale) : 0.48;
  const resolvedOpacity = typeof opacity === 'number' && Number.isFinite(opacity) ? opacity : isGhost ? 0.58 : 1;

  return (
    <g
      transform={`translate(${cx}, ${cy}) scale(${scale})`}
      opacity={resolvedOpacity}
    >
      {!sharedDefsPrefix && <defs>{renderPaletteDefs(gradId, palette)}</defs>}

      {/* Winning / Highlighted / Last-placed Ground Halo (stays on the board socket) */}
      {(isWinning || isHighlighted || isLastPlaced) && (
        <ellipse
          cx={0}
          cy={2}
          rx={rx + 6}
          ry={ry + 4}
          fill={
            isWinning
              ? 'rgba(16, 185, 129, 0.38)'
              : isHighlighted
                ? 'rgba(250, 204, 21, 0.32)'
                : 'rgba(56, 189, 248, 0.22)'
          }
          stroke={
            isWinning
              ? '#34d399'
              : isHighlighted
                ? '#facc15'
                : '#38bdf8'
          }
          strokeWidth={2}
        />
      )}

      {/* Vertical Slow-Motion Descent Guide Beam when piece is entering from the top */}
      {isDropping && (
        <g>
          <ellipse
            cx={0}
            cy={1}
            rx={rx + 9}
            ry={ry + 5}
            fill="rgba(250, 204, 21, 0.18)"
            stroke="#fde047"
            strokeWidth={1.8}
            strokeDasharray="4 3"
          />
          <line
            x1={0}
            y1={2}
            x2={0}
            y2={dropOffsetY}
            stroke="#fde047"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeOpacity={0.75}
          />
        </g>
      )}

      {/* Crisp Directional Cast Shadow (oriented Left-to-Right +X and slightly Bottom-to-Top -Y) */}
      {!isGhost && (
        <g transform={`rotate(-13)`}>
          <ellipse
            cx={(isTall ? 20 : 13) * shadowScale}
            cy={0}
            rx={rx * (isTall ? 1.55 : 1.28) * shadowScale}
            ry={ry * (isTall ? 0.90 : 0.86) * shadowScale}
            fill={`rgba(8, 3, 1, ${shadowOpacity})`}
          />
        </g>
      )}

      {/* Base Ambient Occlusion Ring inside Socket */}
      {!isGhost && !isDropping && (
        <ellipse
          cx={0}
          cy={1}
          rx={rx * 1.02}
          ry={ry * 1.02}
          fill="rgba(15, 6, 2, 0.55)"
        />
      )}

      {/* 3D Piece Body (translated vertically by dropOffsetY during slow-motion entry) */}
      <g transform={dropOffsetY ? `translate(0, ${dropOffsetY})` : undefined}>
      {!isSquare ? (
        /* ==================== CYLINDRICAL PIECE ==================== */
        <g>
          {/* Lower Cylinder Segment (Base to Groove) */}
          <path
            d={`
              M ${-rx} 0
              A ${rx} ${ry} 0 0 0 ${rx} 0
              L ${rx} ${grooveY + 2.2}
              A ${rx} ${ry} 0 0 1 ${-rx} ${grooveY + 2.2}
              Z
            `}
            fill={`url(#${gradId}-cyl)`}
          />

          {/* Carved Horizontal Lathe Groove (Indented Waist Ring) */}
          <path
            d={`
              M ${-rx} ${grooveY + 2.2}
              A ${rx} ${ry} 0 0 0 ${rx} ${grooveY + 2.2}
              L ${rx * 0.91} ${grooveY}
              L ${rx} ${grooveY - 2.2}
              A ${rx} ${ry} 0 0 1 ${-rx} ${grooveY - 2.2}
              L ${-rx * 0.91} ${grooveY}
              Z
            `}
            fill={palette.grooveShadow}
          />
          {/* Groove Lower Sunlit Bevel Lip */}
          <path
            d={`
              M ${-rx * 0.96} ${grooveY + 1.8}
              A ${rx * 0.96} ${ry * 0.96} 0 0 0 ${rx * 0.96} ${grooveY + 1.8}
            `}
            fill="none"
            stroke={palette.grooveHighlight}
            strokeWidth={1.1}
            strokeOpacity={0.65}
          />

          {/* Upper Cylinder Segment (Groove to Top) */}
          <path
            d={`
              M ${-rx} ${grooveY - 1.8}
              A ${rx} ${ry} 0 0 0 ${rx} ${grooveY - 1.8}
              L ${rx} ${-height}
              A ${rx} ${ry} 0 0 1 ${-rx} ${-height}
              Z
            `}
            fill={`url(#${gradId}-cyl)`}
          />

          {/* Subtle Vertical Wood Grain & Specular Sheen on Cylinder */}
          <path
            d={`
              M ${-rx * 0.45} ${-height + ry * 0.8}
              L ${-rx * 0.45} ${ry * 0.8}
            `}
            stroke={palette.rimStroke}
            strokeWidth={2.2}
            strokeOpacity={isDark ? 0.14 : 0.28}
            strokeLinecap="round"
          />

          {/* Top Elliptical Face */}
          <ellipse
            cx={0}
            cy={-height}
            rx={rx}
            ry={ry}
            fill={`url(#${gradId}-top)`}
            stroke={palette.rimStroke}
            strokeWidth={0.9}
            strokeOpacity={0.55}
          />

          {/* If Hollow: 3D Drilled Cylindrical Cavity on Top */}
          {isHollow && (
            <g>
              {/* Outer Chamfer Lip of Hole */}
              <ellipse
                cx={0}
                cy={-height}
                rx={rx * 0.56}
                ry={ry * 0.56}
                fill={`url(#${gradId}-hole)`}
                stroke={palette.grooveHighlight}
                strokeWidth={0.8}
                strokeOpacity={0.6}
              />
              {/* Deep Shadow Floor inside Cavity */}
              <ellipse
                cx={0.8}
                cy={-height + 1.6}
                rx={rx * 0.44}
                ry={ry * 0.38}
                fill={palette.holeFloor}
                opacity={0.78}
              />
            </g>
          )}
        </g>
      ) : (
        /* ==================== SQUARE PRISM PIECE ==================== */
        <g>
          {/*
            In isometric 3D projection:
            - Left corner: (-rx, 0)
            - Front/Bottom corner: (0, +ry)
            - Right corner: (+rx, 0)
            - Back/Top corner: (0, -ry)
          */}

          {/* LOWER SEGMENT (Base to Waist Groove) */}
          {/* Left Front Face (Lower) */}
          <polygon
            points={`
              ${-rx},0
              0,${ry}
              0,${grooveY + ry + 2.2}
              ${-rx},${grooveY + 2.2}
            `}
            fill={`url(#${gradId}-sqL)`}
          />
          {/* Right Front Face (Lower) */}
          <polygon
            points={`
              0,${ry}
              ${rx},0
              ${rx},${grooveY + 2.2}
              0,${grooveY + ry + 2.2}
            `}
            fill={`url(#${gradId}-sqR)`}
          />

          {/* CARVED HORIZONTAL WAIST GROOVE (Indented 3D Notch) */}
          {/* Left Groove Indentation */}
          <polygon
            points={`
              ${-rx},${grooveY + 2.2}
              0,${grooveY + ry + 2.2}
              0,${grooveY + ry - 2.2}
              ${-rx * 0.90},${grooveY}
              ${-rx},${grooveY - 2.2}
            `}
            fill={palette.grooveShadow}
          />
          {/* Right Groove Indentation */}
          <polygon
            points={`
              0,${grooveY + ry + 2.2}
              ${rx},${grooveY + 2.2}
              ${rx},${grooveY - 2.2}
              ${rx * 0.90},${grooveY}
              0,${grooveY + ry - 2.2}
            `}
            fill={palette.holeFloor}
          />
          {/* Groove Lower Bevel Highlight Line */}
          <polyline
            points={`${-rx},${grooveY + 2.2} 0,${grooveY + ry + 2.2} ${rx},${grooveY + 2.2}`}
            fill="none"
            stroke={palette.grooveHighlight}
            strokeWidth={1.1}
            strokeOpacity={0.65}
          />

          {/* UPPER SEGMENT (Waist Groove to Top) */}
          {/* Left Front Face (Upper) */}
          <polygon
            points={`
              ${-rx},${grooveY - 1.8}
              0,${grooveY + ry - 1.8}
              0,${-height + ry}
              ${-rx},${-height}
            `}
            fill={`url(#${gradId}-sqL)`}
          />
          {/* Right Front Face (Upper) */}
          <polygon
            points={`
              0,${grooveY + ry - 1.8}
              ${rx},${grooveY - 1.8}
              ${rx},${-height}
              0,${-height + ry}
            `}
            fill={`url(#${gradId}-sqR)`}
          />

          {/* Front Vertical Chamfer Edge Highlight */}
          <line
            x1={0}
            y1={-height + ry}
            x2={0}
            y2={ry}
            stroke={palette.rimStroke}
            strokeWidth={1.1}
            strokeOpacity={isDark ? 0.28 : 0.48}
          />

          {/* Top Diamond Face */}
          <polygon
            points={`
              0,${-height - ry}
              ${rx},${-height}
              0,${-height + ry}
              ${-rx},${-height}
            `}
            fill={`url(#${gradId}-top)`}
            stroke={palette.rimStroke}
            strokeWidth={0.9}
            strokeLinejoin="round"
            strokeOpacity={0.6}
          />

          {/* If Hollow: 3D Drilled Cylindrical Cavity in the Square Top */}
          {isHollow && (
            <g>
              <ellipse
                cx={0}
                cy={-height}
                rx={rx * 0.48}
                ry={ry * 0.50}
                fill={`url(#${gradId}-hole)`}
                stroke={palette.grooveHighlight}
                strokeWidth={0.8}
                strokeOpacity={0.65}
              />
              <ellipse
                cx={0.7}
                cy={-height + 1.4}
                rx={rx * 0.37}
                ry={ry * 0.34}
                fill={palette.holeFloor}
                opacity={0.8}
              />
            </g>
          )}
        </g>
      )}
      </g>
    </g>
  );
};

const QuartoBoard: React.FC<QuartoBoardProps> = ({
  quartoState,
  onSelectPiece,
  onPlacePiece,
  isUserTurn,
  isAIThinking,
  currentPlayerName,
  opponentPlayerName,
  language,
  boardStyle = 'classic',
}) => {
  const isNeon = boardStyle === 'neon';
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  // Continuous 3D camera orientation controlled via mouse or touch drag
  // Default -Math.PI / 4 aligns the 4x4 board facing the viewer in 3D perspective (narrower at top, wider at bottom)
  const [boardYaw, setBoardYaw] = useState<number>(-Math.PI / 4);
  const [boardPitch, setBoardPitch] = useState<number>(0.48); // Vertical tilt ratio (0.34 = low angle, 0.64 = high top-down angle)
  const [isDragging3D, setIsDragging3D] = useState<boolean>(false);
  const dragStateRef = React.useRef<{
    active: boolean;
    pointerId: number;
    lastX: number;
    lastY: number;
    totalDist: number;
    wasDragged: boolean;
  }>({
    active: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    totalDist: 0,
    wasDragged: false,
  });

  const [winDropProgress, setWinDropProgress] = useState<number>(1);

  // Trigger a 2.4-second slow-motion descent from the top whenever a winning 4th piece is placed
  const winAnimKey =
    quartoState.winner && quartoState.winner !== 'draw' && quartoState.lastPlacedCell
      ? `${quartoState.winner}-${quartoState.lastPlacedCell.r}-${quartoState.lastPlacedCell.c}-${quartoState.lastPlacedCell.pieceId}`
      : null;

  useEffect(() => {
    if (!winAnimKey) {
      setWinDropProgress(1);
      return;
    }
    setWinDropProgress(0);
    let rafId = 0;
    const durationMs = 2400; // 2.4 seconds slow-motion descent
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
      // Smooth cubic ease-out so it enters steadily from the top and gently settles into the socket
      const eased = 1 - Math.pow(1 - t, 2.4);
      setWinDropProgress(eased);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [winAnimKey]);

  // Dynamic 3D Perspective Projection + Automatic Full-Width Normalization:
  // Ensures the 3D board's horizontal width ALWAYS equals 100% of the top/bottom boxes (x from 2 to 458 inside viewBox width 460),
  // automatically resizing as the user rotates (boardYaw) or tilts (boardPitch) the board.
  const SVG_WIDTH = 460;
  const TARGET_BOARD_WIDTH = 456;

  const { boardGeometry, sortedCells, getCell3DPoint } = useMemo(() => {
    const B = 2.28; // half-size of the wooden board in grid units
    const R = 0.30; // corner radius in 3D board units
    const arcSteps = 8;
    const cosA = Math.cos(boardYaw);
    const sinA = Math.sin(boardYaw);
    const perspK = 0.074;

    const projectRaw = (dc: number, dr: number) => {
      const rdc = dc * cosA - dr * sinA;
      const rdr = dc * sinA + dr * cosA;
      const camX = rdc - rdr;
      const depth = rdc + rdr; // negative = top (far from viewer), positive = bottom (near viewer)
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
    const topPad = 32;
    const bottomPad = 24;

    const projectBoardCoord = (dc: number, dr: number) => {
      const p = projectRaw(dc, dr);
      const x = SVG_WIDTH * 0.5 + (p.rx - rawCenterX) * autoStep;
      const y = topPad + (p.ry - minRy) * autoStep;
      const scale = p.perspScale * (autoStep / 55);
      return { x, y, depth: p.depth, scale };
    };

    const cell3DPoint = (r: number, c: number) => {
      const dr = r - 1.5;
      const dc = c - 1.5;
      return projectBoardCoord(dc, dr);
    };

    const cells: {
      r: number;
      c: number;
      x: number;
      y: number;
      depth: number;
      scale: number;
    }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const pt = cell3DPoint(r, c);
        cells.push({
          r,
          c,
          x: pt.x,
          y: pt.y,
          depth: pt.depth,
          scale: pt.scale,
        });
      }
    }
    cells.sort((a, b) => a.depth - b.depth || a.x - b.x);

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
        fill: isLeftLit ? 'url(#quarto-wood-side-left)' : 'url(#quarto-wood-side-right)',
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
      sortedCells: cells,
      getCell3DPoint: cell3DPoint,
    };
  }, [boardYaw, boardPitch]);

  const isWinningCell = (r: number, c: number) =>
    quartoState.winningLine?.some((p) => p.r === r && p.c === c) ?? false;

  const canPlaceNow =
    isUserTurn &&
    !isAIThinking &&
    !quartoState.winner &&
    quartoState.phase === 'place_piece' &&
    quartoState.selectedPiece !== null;

  const canSelectNow =
    isUserTurn &&
    !isAIThinking &&
    !quartoState.winner &&
    quartoState.phase === 'select_piece';

  // Format attributes of a piece for the UI badge
  const describePiece = (pieceId: number) => {
    const a = getQuartoPieceAttributes(pieceId);
    if (language === 'it') {
      return [
        isNeon ? (a.isDark ? 'Rosso' : 'Blu') : (a.isDark ? 'Scuro' : 'Chiaro'),
        a.isTall ? 'Alto' : 'Basso',
        a.isSquare ? 'Squadrato' : 'Cilindrico',
        a.isHollow ? 'Forato' : 'Pieno',
      ];
    }
    if (language === 'fr') {
      return [
        isNeon ? (a.isDark ? 'Rouge' : 'Bleu') : (a.isDark ? 'Foncé' : 'Clair'),
        a.isTall ? 'Grand' : 'Petit',
        a.isSquare ? 'Carré' : 'Rond',
        a.isHollow ? 'Creux' : 'Plein',
      ];
    }
    if (language === 'de') {
      return [
        isNeon ? (a.isDark ? 'Rot' : 'Blau') : (a.isDark ? 'Dunkel' : 'Hell'),
        a.isTall ? 'Groß' : 'Klein',
        a.isSquare ? 'Eckig' : 'Rund',
        a.isHollow ? 'Hohl' : 'Massiv',
      ];
    }
    if (language === 'es') {
      return [
        isNeon ? (a.isDark ? 'Roja' : 'Azul') : (a.isDark ? 'Oscura' : 'Clara'),
        a.isTall ? 'Alta' : 'Baja',
        a.isSquare ? 'Cuadrada' : 'Cilíndrica',
        a.isHollow ? 'Hueca' : 'Sólida',
      ];
    }
    return [
      isNeon ? (a.isDark ? 'Red' : 'Blue') : (a.isDark ? 'Dark' : 'Light'),
      a.isTall ? 'Tall' : 'Short',
      a.isSquare ? 'Square' : 'Round',
      a.isHollow ? 'Hollow' : 'Solid',
    ];
  };

  const pedestalPieceId =
    quartoState.selectedPiece !== null
      ? quartoState.selectedPiece
      : quartoState.winner && quartoState.lastPlacedCell
        ? quartoState.lastPlacedCell.pieceId
        : null;

  const socketRy = 27.5 * boardPitch;
  const socketInnerRy = 24.5 * boardPitch;

  return (
    <div
      className={`w-full h-full flex flex-col items-center ${
        quartoState.winner ? 'justify-start pt-0' : 'justify-between pt-0 pb-0.5'
      } select-none overflow-hidden gap-0.5`}
    >
      {/* TOP PEDESTAL BAR: Shows the piece currently handed over OR winning alignment */}
      <div className="w-full shrink-0">
        <div
          className={`relative rounded-2xl px-3 py-1.5 shadow-xl flex items-center justify-between gap-2 border ${
            isNeon
              ? 'bg-gradient-to-r from-slate-900/95 via-slate-950/95 to-slate-900/95 border-yellow-200/40'
              : 'bg-gradient-to-r from-amber-950/85 via-stone-900/95 to-amber-950/85 border-amber-500/35'
          }`}
        >
          {/* Active Piece 3D Mini-Pedestal */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0 shadow-inner border ${
                isNeon
                  ? 'bg-slate-950/95 border-blue-500/40'
                  : 'bg-stone-950/90 border-amber-500/30'
              }`}
            >
              <svg viewBox="-36 -82 72 96" className="w-full h-full overflow-visible">
                <defs>
                  <QuartoPieceSharedDefs prefix="qpedestal" boardStyle={boardStyle} />
                </defs>
                {/* Mini Wooden / Neon Pedestal Base */}
                <ellipse
                  cx={0}
                  cy={2}
                  rx={26}
                  ry={11}
                  fill={isNeon ? '#1e293b' : '#451a03'}
                  stroke={isNeon ? '#ca8a04' : '#92400e'}
                  strokeWidth={1.5}
                />
                <ellipse
                  cx={0}
                  cy={0}
                  rx={22}
                  ry={9}
                  fill={isNeon ? '#0f172a' : '#290f02'}
                  stroke={isNeon ? '#fef08a' : '#78350f'}
                  strokeWidth={1}
                />
                {pedestalPieceId !== null ? (
                  <Quarto3DPiece
                    pieceId={pedestalPieceId}
                    cx={0}
                    cy={0}
                    scale={0.95}
                    sharedDefsPrefix="qpedestal"
                    boardStyle={boardStyle}
                  />
                ) : (
                  <text
                    x={0}
                    y={-26}
                    textAnchor="middle"
                    className={`${isNeon ? 'fill-sky-400/55' : 'fill-amber-500/50'} font-black text-2xl`}
                  >
                    ?
                  </text>
                )}
              </svg>
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              {quartoState.winner && quartoState.winner !== 'draw' && quartoState.winningAttributes ? (
                <>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    {winDropProgress < 0.92
                      ? language === 'it'
                        ? '🎬 Mossa Vincente al Rallentatore...'
                        : language === 'fr'
                          ? '🎬 Coup Gagnant au Ralenti...'
                          : language === 'de'
                            ? '🎬 Gewinnzug in Zeitlupe...'
                            : language === 'es'
                              ? '🎬 Jugada Ganadora a Cámara Lenta...'
                              : '🎬 Slow-Motion Winning Move...'
                      : `🏆 QUARTO! ${
                          language === 'it'
                            ? 'Allineamento Vincente'
                            : language === 'fr'
                              ? 'Alignement Gagnant'
                              : language === 'de'
                                ? 'Gewinnreihe'
                                : language === 'es'
                                  ? 'Alineación Ganadora'
                                  : 'Winning Alignment'
                        }`}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white truncate">
                    {language === 'it'
                      ? '4 Pezzi '
                      : language === 'fr'
                        ? '4 Pièces '
                        : language === 'de'
                          ? '4 Figuren '
                          : language === 'es'
                            ? '4 Piezas '
                            : '4 Pieces '}
                    <span className="text-amber-300">
                      {quartoState.winningAttributes.join(' + ')}
                    </span>
                  </span>
                </>
              ) : quartoState.phase === 'place_piece' && quartoState.selectedPiece !== null ? (
                <>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    {isUserTurn
                      ? language === 'it'
                        ? 'Tocca una casella per piazzare:'
                        : language === 'fr'
                          ? 'Touchez une case pour placer :'
                          : language === 'de'
                            ? 'Tippe auf ein Feld zum Platzieren:'
                            : language === 'es'
                              ? 'Toca una casilla para colocar:'
                              : 'Tap a board socket to place:'
                      : language === 'it'
                        ? `${currentPlayerName} sta piazzando:`
                        : language === 'fr'
                          ? `${currentPlayerName} place :`
                          : language === 'de'
                            ? `${currentPlayerName} platziert:`
                            : language === 'es'
                              ? `${currentPlayerName} está colocando:`
                              : `${currentPlayerName} is placing:`}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {describePiece(quartoState.selectedPiece).map((tag, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded-md border text-[10px] font-extrabold leading-none ${
                          isNeon
                            ? 'bg-blue-500/15 border-blue-400/35 text-sky-200'
                            : 'bg-amber-500/15 border-amber-400/30 text-amber-200'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                    {isUserTurn
                      ? language === 'it'
                        ? `Scegli il pezzo da dare a ${opponentPlayerName}`
                        : language === 'fr'
                          ? `Choisissez la pièce à donner à ${opponentPlayerName}`
                          : language === 'de'
                            ? `Wähle die Figur für ${opponentPlayerName}`
                            : language === 'es'
                              ? `Elige la pieza para dar a ${opponentPlayerName}`
                              : `Choose a piece to give ${opponentPlayerName}`
                      : language === 'it'
                        ? `${currentPlayerName} sceglie un pezzo per te...`
                        : language === 'fr'
                          ? `${currentPlayerName} choisit une pièce pour vous...`
                          : language === 'de'
                            ? `${currentPlayerName} wählt eine Figur für dich...`
                            : language === 'es'
                              ? `${currentPlayerName} está eligiendo una pieza para ti...`
                              : `${currentPlayerName} is choosing a piece for you...`}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300 leading-tight mt-0.5">
                    {language === 'it'
                      ? 'Tocca uno dei pezzi disponibili nella riserva in basso'
                      : language === 'fr'
                        ? 'Touchez l’une des pièces disponibles dans la réserve ci-dessous'
                        : language === 'de'
                          ? 'Tippe unten im Vorrat auf eine verfügbare Figur'
                          : language === 'es'
                            ? 'Toca una de las piezas disponibles en la reserva inferior'
                            : 'Tap one of the available pieces in the reserve below'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: PHOTOREALISTIC 3D CARVED WOODEN 4x4 BOARD (Interactive Touch/Mouse 3D Orbit) */}
      <div
        onPointerDown={(e) => {
          dragStateRef.current = {
            active: true,
            pointerId: e.pointerId,
            lastX: e.clientX,
            lastY: e.clientY,
            totalDist: 0,
            wasDragged: false,
          };
        }}
        onPointerMove={(e) => {
          if (!dragStateRef.current.active) return;
          const dx = e.clientX - dragStateRef.current.lastX;
          const dy = e.clientY - dragStateRef.current.lastY;
          if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
          dragStateRef.current.lastX = e.clientX;
          dragStateRef.current.lastY = e.clientY;
          dragStateRef.current.totalDist += Math.hypot(dx, dy);

          if (dragStateRef.current.totalDist > 5) {
            if (!dragStateRef.current.wasDragged) {
              dragStateRef.current.wasDragged = true;
              setIsDragging3D(true);
              setHoveredCell(null);
            }
            setBoardYaw((prev) => prev - dx * 0.009);
            setBoardPitch((prev) => Math.max(0.34, Math.min(0.64, prev + dy * 0.0024)));
          }
        }}
        onPointerUp={() => {
          dragStateRef.current.active = false;
          setIsDragging3D(false);
          setTimeout(() => {
            dragStateRef.current.wasDragged = false;
          }, 40);
        }}
        onPointerCancel={() => {
          dragStateRef.current.active = false;
          dragStateRef.current.wasDragged = false;
          setIsDragging3D(false);
        }}
        onPointerLeave={() => {
          if (dragStateRef.current.active) {
            dragStateRef.current.active = false;
            setIsDragging3D(false);
            setTimeout(() => {
              dragStateRef.current.wasDragged = false;
            }, 40);
          }
        }}
        style={{ touchAction: 'none' }}
        className={`relative w-full flex-1 min-h-0 flex ${
          quartoState.winner ? 'items-start pt-2' : 'items-center'
        } justify-center ${
          isDragging3D ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <svg
          viewBox={`0 0 460 ${boardGeometry.svgHeight}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            <QuartoPieceSharedDefs prefix="qboard" boardStyle={boardStyle} />
            {/* Rich Mahogany / Walnut Board Top Surface Gradient */}
            <linearGradient id="quarto-wood-top" x1="10%" y1="5%" x2="90%" y2="95%">
              <stop offset="0%" stopColor="#8c4a27" />
              <stop offset="30%" stopColor="#73391c" />
              <stop offset="65%" stopColor="#5c2b14" />
              <stop offset="100%" stopColor="#431d0b" />
            </linearGradient>

            {/* Wall Go Neon Slate Board Top Surface Gradient */}
            <linearGradient id="quarto-neon-top" x1="10%" y1="5%" x2="90%" y2="95%">
              <stop offset="0%" stopColor="#263449" />
              <stop offset="32%" stopColor="#1e293b" />
              <stop offset="68%" stopColor="#162032" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Board 3D Side Thickness Gradient */}
            <linearGradient id="quarto-wood-side-left" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5e2c14" />
              <stop offset="100%" stopColor="#381708" />
            </linearGradient>
            <linearGradient id="quarto-wood-side-right" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3d1a09" />
              <stop offset="100%" stopColor="#210c03" />
            </linearGradient>

            <linearGradient id="quarto-neon-side-left" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="quarto-neon-side-right" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Carved Recessed Socket Gradient */}
            <linearGradient id="quarto-socket-recess" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2e1306" />
              <stop offset="45%" stopColor="#4f2410" />
              <stop offset="100%" stopColor="#7a3e20" />
            </linearGradient>
            <linearGradient id="quarto-neon-socket-recess" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#070c17" />
              <stop offset="48%" stopColor="#131f33" />
              <stop offset="100%" stopColor="#273852" />
            </linearGradient>

            {/* Directional Cast Shadow Gradient on the Board (Crisp, Long, Left-Bottom to Right-Top) */}
            <linearGradient id="quarto-piece-board-shadow" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="rgba(10, 3, 0, 0.72)" />
              <stop offset="68%" stopColor="rgba(10, 3, 0, 0.54)" />
              <stop offset="92%" stopColor="rgba(10, 3, 0, 0.28)" />
              <stop offset="100%" stopColor="rgba(10, 3, 0, 0.08)" />
            </linearGradient>
          </defs>

          {/* Ambient Floor Shadow under the 3D Board */}
          <path
            d={boardGeometry.topSlabPath}
            fill="rgba(0, 0, 0, 0.65)"
            transform={`translate(0, ${boardGeometry.thickness + 10})`}
          />

          {/* 3D Board Extruded Side Walls */}
          {boardGeometry.sideWalls.map((wall) => (
            <path
              key={`wall-${wall.key}`}
              d={wall.path}
              fill={
                isNeon
                  ? ((wall as any).isLeftLit ? 'url(#quarto-neon-side-left)' : 'url(#quarto-neon-side-right)')
                  : wall.fill
              }
            />
          ))}

          {/* 3D Board Top Slab with Rounded Corners (Mahogany or Wall Go Neon) */}
          <path
            d={boardGeometry.topSlabPath}
            fill={isNeon ? 'url(#quarto-neon-top)' : 'url(#quarto-wood-top)'}
            stroke={isNeon ? '#fef08a' : '#a35c37'}
            strokeWidth={isNeon ? 2 : 1.6}
          />

          {/* Decorative Inner Perspective Frame */}
          <path
            d={boardGeometry.innerFramePath}
            fill="none"
            stroke={isNeon ? '#ca8a04' : '#3b1808'}
            strokeOpacity={isNeon ? 0.55 : 0.38}
            strokeWidth={1.4}
            strokeLinejoin="round"
            className="pointer-events-none"
          />

          {/* Subtle Wood Grain or Neon Grid Lines across the Board Top */}
          <g
            stroke={isNeon ? 'rgba(255, 255, 255, 0.16)' : '#3b1808'}
            strokeOpacity={isNeon ? 0.35 : 0.22}
            strokeWidth={1.2}
            fill="none"
            className="pointer-events-none"
          >
            {boardGeometry.grainPaths.map((d, idx) => (
              <path key={`grain-${idx}`} d={d} />
            ))}
          </g>

          {/* Winning Line Glowing Beam on Board Surface (illuminates as the 4th piece lands) */}
          {quartoState.winningLine &&
            quartoState.winningLine.length === 4 &&
            winDropProgress >= 0.85 &&
            (() => {
              const pStart = getCell3DPoint(
                quartoState.winningLine[0].r,
                quartoState.winningLine[0].c
              );
              const pEnd = getCell3DPoint(
                quartoState.winningLine[3].r,
                quartoState.winningLine[3].c
              );
              const beamOpacity = Math.min(0.75, ((winDropProgress - 0.85) / 0.15) * 0.75);
              return (
                <line
                  x1={pStart.x}
                  y1={pStart.y}
                  x2={pEnd.x}
                  y2={pEnd.y}
                  stroke="#34d399"
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeOpacity={beamOpacity}
                />
              );
            })()}

          {/* 16 Recessed Circular Sockets Carved into the Board (Perspective-scaled) */}
          {sortedCells.map(({ r, c, x, y, scale }) => {
            const isOccupied = quartoState.board[r][c] !== null;
            const isHovered = hoveredCell?.r === r && hoveredCell?.c === c;
            const isWin = isWinningCell(r, c);
            const isLast =
              quartoState.lastPlacedCell?.r === r && quartoState.lastPlacedCell?.c === c;

            return (
              <g
                key={`socket-${r}-${c}`}
                onClick={() => {
                  if (dragStateRef.current.wasDragged) return;
                  if (canPlaceNow && !isOccupied) {
                    onPlacePiece(r, c);
                    setHoveredCell(null);
                  }
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse' && !dragStateRef.current.active && canPlaceNow && !isOccupied) {
                    setHoveredCell({ r, c });
                  }
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === 'mouse' && hoveredCell?.r === r && hoveredCell?.c === c) {
                    setHoveredCell(null);
                  }
                }}
                className={canPlaceNow && !isOccupied && !isDragging3D ? 'cursor-pointer' : ''}
              >
                {/* Carved Socket Outer Rim */}
                <ellipse
                  cx={x}
                  cy={y}
                  rx={26.5 * scale}
                  ry={socketRy * scale}
                  fill={isNeon ? 'url(#quarto-neon-socket-recess)' : 'url(#quarto-socket-recess)'}
                  stroke={
                    isWin
                      ? '#34d399'
                      : isHovered && canPlaceNow
                        ? '#facc15'
                        : isLast
                          ? '#38bdf8'
                          : isNeon
                            ? '#60a5fa'
                            : '#9e5631'
                  }
                  strokeWidth={isWin || (isHovered && canPlaceNow) ? 2.4 : 1.2}
                />
                {/* Socket Inner Recessed Floor */}
                <ellipse
                  cx={x}
                  cy={y + 0.8 * scale}
                  rx={23.6 * scale}
                  ry={socketInnerRy * scale}
                  fill={
                    isHovered && canPlaceNow
                      ? 'rgba(250, 204, 21, 0.22)'
                      : isNeon
                        ? '#1a273d'
                        : '#592912'
                  }
                />
                {/* Subtle Coordinate Dot when Empty & Placeable */}
                {!isOccupied && canPlaceNow && (
                  <ellipse
                    cx={x}
                    cy={y}
                    rx={4.5 * scale}
                    ry={4.5 * boardPitch * scale}
                    fill={isHovered ? '#fde047' : 'rgba(253, 224, 71, 0.35)'}
                  />
                )}
              </g>
            );
          })}

          {/* Board-Surface Directional Cast Shadows (Crisp, Long, Oriented Left-to-Right +X and Bottom-to-Top -Y) */}
          <g className="pointer-events-none">
            {sortedCells.map(({ r, c, x, y, scale }) => {
              const pieceId = quartoState.board[r][c];
              if (pieceId === null) return null;

              const attrs = getQuartoPieceAttributes(pieceId);
              const isWin = isWinningCell(r, c);
              const isLast =
                quartoState.lastPlacedCell?.r === r && quartoState.lastPlacedCell?.c === c;
              const isWinningFourthPiece =
                isLast &&
                isWin &&
                Boolean(quartoState.winner && quartoState.winner !== 'draw');
              const dropOffsetY = isWinningFourthPiece
                ? -195 * (1 - winDropProgress)
                : 0;
              const shadowScale =
                dropOffsetY < -1.5 ? Math.max(0.35, 1 - Math.abs(dropOffsetY) / 260) : 1;

              const shadowLen = (attrs.isTall ? 68 : 44) * shadowScale * scale;
              const baseHalfW = (attrs.isSquare ? 17 : 16) * shadowScale * scale;
              const tipHalfW = (attrs.isSquare ? 14 : 12.5) * shadowScale * scale;

              return (
                <g
                  key={`board-shadow-${r}-${c}`}
                  transform={`translate(${x}, ${y}) rotate(-13)`}
                  opacity={shadowScale}
                >
                  <path
                    d={`
                      M 0 ${-baseHalfW}
                      L ${shadowLen} ${-tipHalfW}
                      A ${tipHalfW} ${tipHalfW} 0 0 1 ${shadowLen} ${tipHalfW}
                      L 0 ${baseHalfW}
                      A ${baseHalfW * 0.7} ${baseHalfW} 0 0 1 0 ${-baseHalfW}
                      Z
                    `}
                    fill="url(#quarto-piece-board-shadow)"
                  />
                </g>
              );
            })}
          </g>

          {/* 3D Pieces Rendered in Strict Back-to-Front Depth Order (Painter's Algorithm) */}
          {sortedCells.map((cell) => {
            const { r, c, x, y, scale } = cell;
            const pieceId = quartoState.board[r][c];
            const isHovered =
              canPlaceNow &&
              pieceId === null &&
              hoveredCell?.r === r &&
              hoveredCell?.c === c;

            if (pieceId === null && !isHovered) return null;

            const activePieceId = pieceId !== null ? pieceId : quartoState.selectedPiece!;
            const isWin = isWinningCell(r, c);
            const isLast =
              quartoState.lastPlacedCell?.r === r && quartoState.lastPlacedCell?.c === c;

            const isWinningFourthPiece =
              isLast &&
              isWin &&
              Boolean(quartoState.winner && quartoState.winner !== 'draw');

            const dropOffsetY = isWinningFourthPiece
              ? -195 * (1 - winDropProgress)
              : 0;

            return (
              <g
                key={`piece3d-${r}-${c}`}
                className="pointer-events-none"
              >
                <Quarto3DPiece
                  pieceId={activePieceId}
                  cx={x}
                  cy={y}
                  scale={1.02 * scale}
                  isGhost={pieceId === null && isHovered}
                  isWinning={isWin && (!isWinningFourthPiece || winDropProgress >= 0.88)}
                  isLastPlaced={isLast}
                  dropOffsetY={dropOffsetY}
                  sharedDefsPrefix="qboard"
                  boardStyle={boardStyle}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* BOTTOM: 3D WOODEN / NEON RESERVE TRAY (16 PIECES) - Hidden when match has ended so the 3D board remains fully visible behind the victory banner */}
      {!quartoState.winner && (
        <div className="w-full shrink-0">
          <div
            className={`rounded-2xl p-2 border transition-all shadow-2xl ${
              isNeon
                ? canSelectNow
                  ? 'bg-gradient-to-b from-slate-900/95 to-slate-950 border-yellow-200/70 shadow-[0_0_20px_rgba(59,130,246,0.25)]'
                  : 'bg-slate-900/85 border-slate-700/70 opacity-90'
                : canSelectNow
                  ? 'bg-gradient-to-b from-stone-900/95 to-stone-950 border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.22)]'
                  : 'bg-stone-900/80 border-stone-700/70 opacity-90'
            }`}
          >
            <div className="flex items-center justify-between px-1 mb-1">
              <span className={`text-[10px] font-black uppercase tracking-wider ${isNeon ? 'text-sky-300/90' : 'text-amber-300/90'}`}>
                {language === 'it'
                  ? 'Riserva dei 16 Pezzi 3D'
                  : language === 'fr'
                    ? 'Réserve des 16 Pièces 3D'
                    : language === 'de'
                      ? 'Vorrat der 16 3D-Figuren'
                      : language === 'es'
                        ? 'Reserva de las 16 Piezas 3D'
                        : '16-Piece 3D Reserve'}{' '}
                ({quartoState.availablePieces.length}/16)
              </span>
              {canSelectNow && (
                <span className="text-[10px] font-bold text-emerald-400">
                  {language === 'it'
                    ? '👆 Tocca un pezzo per consegnarlo'
                    : language === 'fr'
                      ? '👆 Touchez une pièce pour la donner'
                      : language === 'de'
                        ? '👆 Tippe auf eine Figur zum Übergeben'
                        : language === 'es'
                          ? '👆 Toca una pieza para entregarla'
                          : '👆 Tap a piece to hand it over'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 16 }, (_, pieceId) => {
                const isAvailable = quartoState.availablePieces.includes(pieceId);
                const isCurrentlySelected = quartoState.selectedPiece === pieceId;

                return (
                  <button
                    key={pieceId}
                    type="button"
                    disabled={!canSelectNow || !isAvailable}
                    onClick={() => {
                      if (canSelectNow && isAvailable) {
                        onSelectPiece(pieceId);
                      }
                    }}
                    title={describePiece(pieceId).join(' · ')}
                    className={`relative h-14 sm:h-16 rounded-xl flex items-center justify-center transition-all ${
                      !isAvailable
                        ? isNeon
                          ? 'bg-slate-950/60 border border-slate-800/50 opacity-30 cursor-default'
                          : 'bg-stone-950/50 border border-stone-800/50 opacity-30 cursor-default'
                        : canSelectNow
                          ? isNeon
                            ? 'bg-slate-800/80 hover:bg-blue-900/40 border border-blue-500/35 hover:border-yellow-200 cursor-pointer active:scale-95 hover:-translate-y-0.5 shadow-md'
                            : 'bg-stone-800/80 hover:bg-amber-900/40 border border-amber-500/30 hover:border-amber-400 cursor-pointer active:scale-95 hover:-translate-y-0.5 shadow-md'
                          : isNeon
                            ? 'bg-slate-800/50 border border-slate-700/50 cursor-default'
                            : 'bg-stone-800/50 border border-stone-700/50 cursor-default'
                    }`}
                  >
                    <svg viewBox="-28 -78 56 90" className="w-full h-full overflow-visible">
                      {/* Recessed Tray Slot */}
                      <ellipse
                        cx={0}
                        cy={2}
                        rx={20}
                        ry={9}
                        fill={isNeon ? '#090f1c' : '#1c0d06'}
                        stroke={isNeon ? '#334155' : '#572c16'}
                        strokeWidth={1}
                      />
                      {isAvailable && (
                        <Quarto3DPiece
                          pieceId={pieceId}
                          cx={0}
                          cy={0}
                          scale={0.86}
                          uidPrefix={`tray-${pieceId}`}
                          boardStyle={boardStyle}
                        />
                      )}
                      {isCurrentlySelected && (
                        <text
                          x={0}
                          y={-22}
                          textAnchor="middle"
                          className="fill-amber-400 text-[16px] font-black"
                        >
                          ▲
                        </text>
                      )}
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuartoBoard;
