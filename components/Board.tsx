
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Point, Player, TurnPhase, PlayerId, Wall, BoardTheme, GameMode } from '../types';
import { GRID_SIZE, PLAYER_COLORS } from '../constants';
import { getReachableCells, getWallBetween, getWallOptions, getNeighbors, isValidCell, getAbalonePossibleMoves, getPenteThreatLines } from '../utils/gameLogic';

interface PieceProps {
  player: Player;
  pos: Point;
  idx: number;
  isSelected: boolean;
  isClickable: boolean;
  isInvalidShobu?: boolean;
  onInvalidShobuClick?: () => void;
  isLockedByRule: boolean;
  onSelectPiece: (idx: number | null, isDragging?: boolean) => void;
  onMove: (pos: Point) => void;
  turnPhase: TurnPhase;
  hasPossibleMoves: boolean;
  isHex: boolean;
  getPosStyle: (p: Point) => React.CSSProperties;
  pieceWidthPerc: number;
  boardRatio: number;
  canStay: boolean;
  gameMode?: GameMode;
  onPointerEnterPiece?: (idx: number) => void;
  onPointerDownPiece?: (idx: number) => void;
  onSelectOpponentPiece?: (playerId: PlayerId, pieceIdx: number) => void;
  isWinningPiece?: boolean;
  isThreatPiece?: boolean;
  isShobuActiveValid?: boolean;
  onRevertMove?: () => void;
  badukStoneColor?: 'neon' | 'classic';
  startingPlayerIndex?: number;
  isDeadBadukStone?: boolean;
  onToggleDeadStone?: () => void;
  isOpponentLastMove?: boolean;
  isWallGo3D?: boolean;
  boardTiltX?: number;
  boardRotateZ?: number;
  wasBoardDraggedRef?: React.MutableRefObject<boolean>;
  animatedPosStyle?: React.CSSProperties;
  rollAngleDeg?: number;
  moveAngleBoardDeg?: number;
  isRolling3D?: boolean;
}

const Piece: React.FC<PieceProps> = ({ 
  player, pos, idx, isSelected, isClickable, isInvalidShobu, onInvalidShobuClick, isLockedByRule,
  onSelectPiece, onMove, turnPhase, hasPossibleMoves, isHex, getPosStyle, pieceWidthPerc, boardRatio, canStay,
  gameMode, onPointerEnterPiece, onPointerDownPiece, onSelectOpponentPiece, isWinningPiece, isThreatPiece, isShobuActiveValid, onRevertMove, badukStoneColor = "classic", startingPlayerIndex = 0,
  isDeadBadukStone, onToggleDeadStone, isOpponentLastMove, isWallGo3D = false, boardTiltX = 0, boardRotateZ = 0, wasBoardDraggedRef,
  animatedPosStyle, rollAngleDeg = 0, moveAngleBoardDeg = 0, isRolling3D = false
}) => {
  const prevPosRef = useRef<Point>(pos);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (prevPosRef.current.r !== pos.r || prevPosRef.current.c !== pos.c) {
      setIsMoving(true);
      prevPosRef.current = pos;
      const timer = setTimeout(() => setIsMoving(false), 300);
      return () => clearTimeout(timer);
    }
  }, [pos.r, pos.c]);

  const isActuallyLocked = !hasPossibleMoves && !player.hasWallbreaker && gameMode !== 'shobu' && gameMode !== 'domineering' && gameMode !== 'baduk';

  const derivedColor = (gameMode === 'baduk' && badukStoneColor === 'classic') 
    ? (player.id === (startingPlayerIndex === 0 ? 1 : 2) ? '#212121' : '#f8f9fa') 
    : player.color;

  const pieceScale = isWinningPiece
    ? 1.25
    : isSelected && gameMode !== 'abalone'
      ? 1.22
      : isOpponentLastMove
        ? 1.05
        : isDeadBadukStone
          ? 0.95
          : 1;

  const tiltRad = (boardTiltX * Math.PI) / 180;
  const invCosTilt = isWallGo3D ? 1 / Math.max(0.75, Math.cos(tiltRad)) : 1;
  const sphereLiftPct = isWallGo3D ? Math.min(18, (boardTiltX / 38) * 16) : 0;
  // Direction of rolling in the counter-rotated Piece screen coordinate system
  const rollDirScreenDeg = moveAngleBoardDeg + boardRotateZ;

  return (
    <div
      className={`
        absolute flex items-center justify-center touch-none select-none pointer-events-none
        ${isWallGo3D ? '' : '-translate-x-1/2 -translate-y-1/2 transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)'}
        ${pos.isNewAi ? 'animate-penteGrow' : ''}
        ${isWinningPiece ? `${isWallGo3D ? '' : 'scale-125'} z-[60] ring-4 ring-yellow-400 ${gameMode !== 'baduk' ? 'animate-pulse' : ''}` : (isThreatPiece ? `z-[55] ring-4 ring-orange-500 ${gameMode !== 'baduk' ? 'animate-threatPulse' : ''}` : (isSelected ? (gameMode === 'abalone' ? 'z-50' : `${isWallGo3D ? '' : 'scale-125'} z-50 ring-4 ring-white/40`) : (isOpponentLastMove ? `z-50 ${isWallGo3D ? '' : 'scale-105'}` : `z-40 ${isWallGo3D ? '' : 'scale-100'}`)))}
        ${isShobuActiveValid && !isSelected ? `ring-2 ring-emerald-400 ${gameMode !== 'baduk' ? 'animate-pulse' : ''}` : ''}
        ${isDeadBadukStone ? `opacity-35 grayscale saturate-0 ${isWallGo3D ? '' : 'scale-95'}` : (isActuallyLocked && !isSelected && !isWinningPiece && !isThreatPiece ? 'opacity-40 grayscale saturate-[0.2]' : 'opacity-100')}
        ${isMoving && !isWallGo3D ? 'brightness-150' : ''} 
        ${turnPhase === 'setup' && gameMode !== 'pente' && gameMode !== 'hex' && gameMode !== 'baduk' && gameMode !== 'domineering' && !isWallGo3D ? 'animate-pulse' : ''}
        ${isClickable && !isLockedByRule && !isWallGo3D ? 'active:scale-95' : ''}
      `}
      style={{
        ...(animatedPosStyle || getPosStyle(pos)),
        width: `${pieceWidthPerc}%`,
        height: `${pieceWidthPerc * boardRatio}%`, 
        borderRadius: '50%',
        transform: isWallGo3D
          ? `translate(-50%, -50%) translateZ(9px) rotateZ(${-boardRotateZ}deg) translateY(-${sphereLiftPct.toFixed(1)}%) scale(${pieceScale.toFixed(3)}, ${(pieceScale * invCosTilt).toFixed(3)})`
          : undefined,
        backgroundImage: isWallGo3D
          ? `radial-gradient(circle at 30% 36%, ${derivedColor} 0%, ${derivedColor} 42%, color-mix(in srgb, ${derivedColor} 58%, #000000) 74%, color-mix(in srgb, ${derivedColor} 24%, #000000) 93%, color-mix(in srgb, ${derivedColor} 36%, #000000) 100%)`
          : `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 20%, transparent 50%), radial-gradient(circle at 50% 50%, ${derivedColor} 0%, ${derivedColor} 70%, rgba(0,0,0,0.4) 100%)`,
        backgroundColor: derivedColor,
        boxShadow: isWinningPiece
          ? `0 0 50px ${derivedColor}, 0 0 20px yellow, inset -2px -2px 8px rgba(0,0,0,0.5)`
          : isThreatPiece
            ? `0 0 40px ${derivedColor}, 0 0 15px orange, inset -2px -2px 8px rgba(0,0,0,0.5)`
            : isSelected
              ? `0 0 35px ${derivedColor}, 0 0 15px white, inset -4px -4px 10px rgba(0,0,0,0.55)`
              : isWallGo3D
                ? `inset -5px -4px 10px rgba(0,0,0,0.55), inset 2px 2px 5px rgba(255,255,255,0.22)`
                : `0 10px 20px rgba(0,0,0,0.5), 0 0 12px ${derivedColor}44, inset -2px -2px 6px rgba(0,0,0,0.4)`,
        border: turnPhase === 'setup' && !isWallGo3D ? '2px solid white' : 'none'
      }}
    >
      {/* 3D Revolving Spherical Surface Bands + Fixed Specular Highlight for Realistic Rolling */}
      {isWallGo3D && (
        <>
          <svg
            viewBox="-50 -50 100 100"
            className="absolute inset-0 w-full h-full rounded-full overflow-hidden pointer-events-none z-[2]"
          >
            <g transform={`rotate(${rollDirScreenDeg.toFixed(1)})`}>
              {[0, 1, 2].map((k) => {
                const deg = ((((rollAngleDeg + k * 60) % 180) + 180) % 180) - 90;
                const theta = (deg * Math.PI) / 180;
                const sinT = Math.sin(theta);
                const cosT = Math.cos(theta);
                if (cosT <= 0.04) return null;
                const rx = Math.max(0.3, Math.abs(48.5 * sinT));
                const sweep = sinT >= 0 ? 1 : 0;
                const isBrightSeam = k === 0;
                return (
                  <g key={k}>
                    <path
                      d={`M 0 -48.5 A ${rx.toFixed(2)} 48.5 0 0 ${sweep} 0 48.5`}
                      fill="none"
                      stroke={isBrightSeam ? 'rgba(255,255,255,0.46)' : 'rgba(0,0,0,0.34)'}
                      strokeWidth={(isBrightSeam ? 4.2 * cosT : 3.2 * cosT).toFixed(2)}
                      strokeLinecap="round"
                      opacity={((isRolling3D ? 0.92 : 0.62) * Math.pow(cosT, 0.65)).toFixed(2)}
                    />
                    {isBrightSeam && (
                      <ellipse
                        cx={(34 * sinT).toFixed(2)}
                        cy="0"
                        rx={Math.max(1.2, 9.5 * cosT).toFixed(2)}
                        ry="16"
                        fill="rgba(255,255,255,0.22)"
                        opacity={(0.85 * cosT).toFixed(2)}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
          {/* Stationary 3D Specular Light Highlight & Ambient Rim Shading anchored to top-left room light */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none z-[3]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 26% 32%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 8%, rgba(255,255,255,0.12) 20%, transparent 36%)',
            }}
          />
        </>
      )}
      <svg 
        className="absolute inset-0 w-full h-full z-10 pointer-events-none" 
        viewBox="0 0 100 100"
      >
        <circle 
          cx="50" cy="50" r="50" 
          fill="transparent" 
          style={{ pointerEvents: (isClickable || isInvalidShobu || onToggleDeadStone) && !isLockedByRule ? 'auto' : 'none', cursor: (isClickable || onToggleDeadStone) && !isLockedByRule ? 'pointer' : (isInvalidShobu ? 'pointer' : 'default') }} 
          onPointerDown={(e) => {
            if (gameMode === 'abalone' && isClickable && !isLockedByRule) {
               try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
               e.stopPropagation();
               onPointerDownPiece?.(idx);
            }
          }}
          onPointerEnter={(e) => {
            if (gameMode === 'abalone' && isClickable && !isLockedByRule) {
               onPointerEnterPiece?.(idx);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (wasBoardDraggedRef?.current) return;
            if (onToggleDeadStone) {
              onToggleDeadStone();
              return;
            }
            if (gameMode === 'abalone') return;
            if (isInvalidShobu) {
              onInvalidShobuClick?.();
              return;
            }
            if (isClickable && !isLockedByRule) {
              if (turnPhase === 'walling' && (gameMode === 'dominio' || gameMode === 'amazons')) {
                onRevertMove?.();
                return;
              }
              if (isSelected) {
                if (canStay) onMove(pos);
              } else {
                onSelectPiece(idx);
              }
            }
          }}
        />
      </svg>
      {!isWallGo3D && (
        <div className="absolute top-[12%] left-[12%] w-[25%] h-[25%] bg-white/30 rounded-full blur-[1px] pointer-events-none" />
      )}
      {isShobuActiveValid && !isSelected && (
        <div className={`absolute -inset-[3px] rounded-full border-[2px] border-emerald-400 pointer-events-none z-20 shadow-[0_0_8px_rgba(52,211,153,0.6)] ${gameMode !== 'baduk' ? 'animate-pulse' : ''}`} />
      )}
      {turnPhase === 'moving' && isClickable && !isLockedByRule && !isSelected && !isShobuActiveValid && (
        <div className={`absolute -inset-1 rounded-full border border-white/30 opacity-20 pointer-events-none ${gameMode !== 'baduk' ? 'animate-ping' : ''}`} />
      )}
      {isOpponentLastMove && !isWinningPiece && (
        <>
          <div className="absolute -inset-1 sm:-inset-1.5 rounded-full border-2 border-amber-400 pointer-events-none z-30 shadow-[0_0_14px_rgba(251,191,36,1)] animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full border border-amber-300/90 bg-amber-400/25 flex items-center justify-center">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 border border-black/90 shadow-[0_0_6px_rgba(251,191,36,1)] ring-1 ring-white/90" />
            </div>
          </div>
        </>
      )}
      {isDeadBadukStone && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <span className="text-red-500 font-black text-sm sm:text-base leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">✕</span>
        </div>
      )}
      {isActuallyLocked && !isSelected && !isDeadBadukStone && <span className="text-[8px] opacity-60">🔒</span>}
      {!hasPossibleMoves && player.hasWallbreaker && !isSelected && <span className="text-[12px] drop-shadow-md">🔨</span>}
    </div>
  );
};

interface BoardProps {
  onRevertMove?: () => void;
  players: Player[];
  walls: Wall[];
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  onMove: (p: Point) => void;
  onPlaceWall: (nr: number, nc: number) => void;
  isAIThinking: boolean;
  onPlacePiece: (r: number, c: number) => void;
  onSelectPiece: (idx: number | null, isDragging?: boolean) => void;
  onSelectOpponentPiece?: (playerId: PlayerId, pieceIdx: number) => void;
  onShiftOpponentPiece?: (playerId: PlayerId, pieceIdx: number, targetR: number, targetC: number) => void;
  selectedPieceIndex: number | null;
  territoryMap: Record<string, PlayerId>;
  isWallBreakingMode?: boolean;
  onBreakWall?: (r: number, c: number, side: any) => void;
  winner?: PlayerId | 'draw' | null;
  suggestedMove?: Point;
  suggestedWall?: Point;
  theme: BoardTheme;
  status: 'setup' | 'playing' | 'ended' | 'scoring';
  orbitoPhase?: 'shift' | 'place' | 'button';
  orbitoActionState?: { playerId?: PlayerId; pieceIdx?: number };
  className?: string;
  style?: React.CSSProperties;
  corsaAction?: 'move' | 'wall';
  fugaWallPreview?: { r: number, c: number, orientation: 'h' | 'v' } | null;
  onPreviewFugaWall?: (r: number, c: number, orientation: 'h' | 'v') => void;
  gameMode?: GameMode;
  aiTrace?: { from: Point, to: Point } | null;
  abaloneSelectedIndices?: number[];
  pushedMarbles?: {id: string, color: string, r: number, c: number, t: number}[];
  penteDyingPieces?: {id: string, color: string, r: number, c: number, t: number}[];
  winningLine?: Point[];
  shobuState?: any;
  onInvalidShobuClick?: () => void;
  badukStoneColor?: 'neon' | 'classic';
  startingPlayerIndex?: number;
  badukDeadStones?: string[];
  onToggleBadukDeadStone?: (r: number, c: number) => void;
  isUserTurn?: boolean;
  penteLastOpponentMove?: Point | null;
}

const Board: React.FC<BoardProps> = ({ 
  onRevertMove, players, walls, currentPlayerIndex, turnPhase, onMove, onPlaceWall, 
  isAIThinking, onPlacePiece, onSelectPiece, onSelectOpponentPiece, onShiftOpponentPiece, selectedPieceIndex, territoryMap, 
  isWallBreakingMode, onBreakWall, winner, suggestedMove, suggestedWall, theme, status,
  orbitoPhase, orbitoActionState, className, style, corsaAction, fugaWallPreview, onPreviewFugaWall, gameMode, aiTrace, abaloneSelectedIndices, pushedMarbles, penteDyingPieces, winningLine, shobuState, onInvalidShobuClick, badukStoneColor = 'classic', startingPlayerIndex = 0,
  badukDeadStones = [], onToggleBadukDeadStone, isUserTurn, penteLastOpponentMove
}) => {
  const [isDraggingFugaWall, setIsDraggingFugaWall] = useState(false);
  const [isDraggingAbalone, setIsDraggingAbalone] = useState(false);
  const [hexZoomCell, setHexZoomCell] = useState<{r: number, c: number} | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
  const [hasPanned, setHasPanned] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Interactive 3D orientation state for Wall Go (gameMode === 'dominio'), Quoridor (gameMode === 'corsa'), Amazons (gameMode === 'amazons'), Domineering (gameMode === 'domineering'), Shobu (gameMode === 'shobu'), and Baduk 9x9 (theme === 'baduk-9')
  const isWallGoMode = gameMode === 'dominio' || gameMode === 'corsa' || gameMode === 'amazons' || gameMode === 'domineering' || gameMode === 'shobu' || (gameMode === 'baduk' && theme === 'baduk-9') || theme === 'corsa' || theme.startsWith('amazons') || theme === 'domineering' || theme === 'baduk-9' || theme === 'shobu' || theme === 'shobu-scacchiera' || (!gameMode && !theme.startsWith('baduk') && !theme.startsWith('abalone') && theme !== 'hex' && theme !== 'orbito' && theme !== 'pente');
  const DEFAULT_WALLGO_TILT_X = 34;
  const DEFAULT_WALLGO_ROTATE_Z = -10;
  const [wallGoTiltX, setWallGoTiltX] = useState<number>(() => (isWallGoMode ? DEFAULT_WALLGO_TILT_X : 0)); // 0 = flat 2D, >0 = 3D tilt angle in degrees (max 38°)
  const [wallGoRotateZ, setWallGoRotateZ] = useState<number>(() => (isWallGoMode ? DEFAULT_WALLGO_ROTATE_Z : 0)); // 360-degree azimuth rotation
  const [isDraggingWallGo3D, setIsDraggingWallGo3D] = useState<boolean>(false);
  const wasMatchEndedRef = useRef<boolean>(false);
  const wallGoDragRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
    totalDist: number;
    wasDragged: boolean;
  }>({
    active: false,
    lastX: 0,
    lastY: 0,
    totalDist: 0,
    wasDragged: false,
  });
  const wasBoardDraggedRef = useRef<boolean>(false);
  const isWallGo3D = isWallGoMode && wallGoTiltX > 1 && !winner && status !== 'ended' && status !== 'scoring';
  useEffect(() => {
    setWallGoTiltX(isWallGoMode ? DEFAULT_WALLGO_TILT_X : 0);
    setWallGoRotateZ(isWallGoMode ? DEFAULT_WALLGO_ROTATE_Z : 0);
    setIsDraggingWallGo3D(false);
    wallGoDragRef.current.active = false;
  }, [gameMode, theme, isWallGoMode]);
  useEffect(() => {
    const isEnded = Boolean(winner || status === 'ended' || status === 'scoring');
    if (isEnded) {
      wasMatchEndedRef.current = true;
      setWallGoTiltX(0);
      setWallGoRotateZ(0);
      setIsDraggingWallGo3D(false);
      wallGoDragRef.current.active = false;
    } else if (wasMatchEndedRef.current) {
      wasMatchEndedRef.current = false;
      if (isWallGoMode) {
        setWallGoTiltX(DEFAULT_WALLGO_TILT_X);
        setWallGoRotateZ(DEFAULT_WALLGO_ROTATE_Z);
      }
    }
  }, [winner, status, isWallGoMode]);
  useEffect(() => {
    if (hexZoomCell) {
      setPortalTarget(document.getElementById('bottom-action-buttons') || document.body);
    }
  }, [hexZoomCell]);

  const isHex = theme === 'islands' || theme === 'desert' || theme.startsWith('abalone') || theme === 'hex';

  const threatLines = React.useMemo(() => {
    if (gameMode === 'pente' && status === 'playing' && !winner) {
      return getPenteThreatLines(players);
    }
    return [];
  }, [players, gameMode, status, winner]);
  const currentPlayer = players[currentPlayerIndex];
  const isActuallyUserTurn =
    (isUserTurn !== undefined
      ? isUserTurn
      : (currentPlayer && !currentPlayer.isAI && !isAIThinking)) &&
    status === 'playing';

  useEffect(() => {
    if (!isActuallyUserTurn || winner) {
      setHexZoomCell(null);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isActuallyUserTurn, winner]);

  const currentUserStoneColor = React.useMemo(() => {
    if (gameMode === 'baduk' && badukStoneColor === 'classic') {
      return currentPlayer?.id === (startingPlayerIndex === 0 ? 1 : 2) ? '#212121' : '#f8f9fa';
    }
    return currentPlayer?.color || '#ffffff';
  }, [gameMode, badukStoneColor, currentPlayer, startingPlayerIndex]);

  const isFugaMove = gameMode === 'corsa' && corsaAction === 'move';
  const isFugaWall = gameMode === 'corsa' && corsaAction === 'wall';

  const possibleMoves = React.useMemo(() => {
    if (!isActuallyUserTurn || winner) return [];
    if (gameMode === 'orbito') {
      if (orbitoPhase === 'shift' && orbitoActionState?.playerId && orbitoActionState.pieceIdx !== undefined) {
        const oppPlayer = players.find(p => p.id === orbitoActionState.playerId);
        if (oppPlayer && oppPlayer.positions[orbitoActionState.pieceIdx]) {
           const pos = oppPlayer.positions[orbitoActionState.pieceIdx];
           // Orbito allows moving to orthoganal adjacent empty spots
           const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
           const moves: Point[] = [];
           dirs.forEach(([dr, dc]) => {
              const nr = pos.r + dr;
              const nc = pos.c + dc;
              if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
                 if (!players.some(p => p.positions.some(pPos => pPos.r === nr && pPos.c === nc))) {
                    moves.push({r: nr, c: nc});
                 }
              }
           });
           return moves;
        }
      }
      return []; // In place phase, click is handled separately
    }

    if (((turnPhase === 'moving' && selectedPieceIndex !== null && !isFugaWall && !isWallBreakingMode) || isFugaMove)) {
      if (gameMode === 'abalone' && abaloneSelectedIndices && abaloneSelectedIndices.length > 0) {
        return getAbalonePossibleMoves(currentPlayer, abaloneSelectedIndices, players, theme);
      }
      let cells = getReachableCells(currentPlayer.positions[selectedPieceIndex || 0], walls, players, theme.startsWith('amazons') ? Infinity : 2, theme, gameMode, shobuState?.passiveMove);
      // Removed manual filter because getReachableCells now handles it natively!
      return cells;
    }
    return [];
  }, [isActuallyUserTurn, turnPhase, selectedPieceIndex, isFugaWall, isWallBreakingMode, isFugaMove, gameMode, abaloneSelectedIndices, currentPlayer, players, theme, walls, orbitoPhase, orbitoActionState, winner, shobuState?.passiveMove]);

  const wallOptions = (isActuallyUserTurn && turnPhase === 'walling' && selectedPieceIndex !== null && !isFugaWall)
    ? getWallOptions(currentPlayer.positions[selectedPieceIndex!], walls, theme, players, gameMode)
    : [];

  // Configurazione Geometria Esagonale
  // Per Ziggurat/Islands, usiamo logica "Pointy Top".
  // Distanza Verticale (Row Spacing) = 0.75 * H_hex
  // Distanza Orizzontale (Col Spacing) = W_hex
  // Rapporto H_hex / W_hex per esagono regolare = 2 / sqrt(3) ~ 1.1547
  // Aspect Ratio Board = (TotalWidthUnits * W_hex) / (TotalHeightUnits * RowSpacing)
  
  const getBoardAspectRatio = () => {
    if (theme === 'corsa' || theme === 'shobu' || theme === 'shobu-scacchiera' || theme.startsWith('baduk')) return 1; // Square
    if (theme === 'neon') return 1; // 7x7 Square
    if (theme === 'hourglass') return 7 / 9; // 7x9 Square
    if (theme === 'bridge') return 1; // 8x8 Square
    if (theme === 'hammer') return 7 / 11; // 7x11 Square
    if (theme === 'arena') return 1; // 9x9 Square
    if (theme === 'domineering') return 1; // 8x8 Square
    if (theme === 'pente') return 1; // 15x15 Square
    if (theme.startsWith('amazons')) return 1;

    const HEX_RATIO = Math.sqrt(3) / 2; // ~0.866
    
    if (theme === 'hex') {
       const wUnits = 11.0;
       const hUnits = 16.0;
       return (wUnits * HEX_RATIO) / hUnits;
    }

    if (theme.startsWith('abalone')) {
       const wUnits = 9.0;
       const hUnits = 7.0;
       return (wUnits * HEX_RATIO) / hUnits;
    }

    if (theme === 'desert') {
       // Ziggurat: Max Width = 10 hexes. Height = 7 rows.
       const wUnits = 10.5;
       const hUnits = 5.5;
       return (wUnits * HEX_RATIO) / hUnits;
    }
    
    // Islands (7x7 Hex Standard)
    const wUnits = 7.5;
    const hUnits = 5.5;
    return (wUnits * HEX_RATIO) / hUnits;
  };

  const boardRatio = getBoardAspectRatio();

  // Calcolo posizioni dinamico basato sul tema
  const getPosStyle = (p: Point) => {
    if (theme === 'corsa' || theme === 'shobu' || theme === 'shobu-scacchiera') {
      return {
        top: `${((p.r + 0.5) / 9) * 100}%`,
        left: `${((p.c + 0.5) / 9) * 100}%`,
      };
    } else if (theme === 'neon') {
      return {
        top: `${((p.r + 0.5) / 7) * 100}%`,
        left: `${((p.c + 0.5) / 7) * 100}%`,
      };
    } else if (theme === 'hourglass') {
      return {
        top: `${((p.r + 0.5) / 9) * 100}%`,
        left: `${((p.c + 0.5) / 7) * 100}%`,
      };
    } else if (theme === 'bridge') {
      return {
        top: `${((p.r + 0.5) / 8) * 100}%`,
        left: `${((p.c + 0.5) / 8) * 100}%`,
      };
    } else if (theme === 'arena') {
      return {
        top: `${((p.r + 0.5) / 9) * 100}%`,
        left: `${((p.c + 0.5) / 9) * 100}%`,
      };
    } else if (theme === 'hammer') {
      return {
        top: `${((p.r + 0.5) / 11) * 100}%`,
        left: `${((p.c + 0.5) / 7) * 100}%`,
      };
    } else if (theme === 'amazons-8') {
      return {
        top: `${((p.r + 0.5) / 8) * 100}%`,
        left: `${((p.c + 0.5) / 8) * 100}%`,
      };
    } else if (theme === 'amazons-10') {
      return {
        top: `${((p.r + 0.5) / 10) * 100}%`,
        left: `${((p.c + 0.5) / 10) * 100}%`,
      };
    } else if (theme === 'pente') {
      return {
        top: `${((p.r + 0.5) / 15) * 100}%`,
        left: `${((p.c + 0.5) / 15) * 100}%`,
      };
    } else if (theme === 'amazons-6') {
      return {
        top: `${((p.r + 0.5) / 6) * 100}%`,
        left: `${((p.c + 0.5) / 6) * 100}%`,
      };
    } else if (theme === 'domineering') {
      return {
        top: `${((p.r + 0.5) / 8) * 100}%`,
        left: `${((p.c + 0.5) / 8) * 100}%`,
      };
    } else if (theme.startsWith('baduk')) {
      const size = theme === 'baduk-19' ? 19 : (theme === 'baduk-13' ? 13 : 9);
      return {
        top: `${((p.r + 0.5) / size) * 100}%`,
        left: `${((p.c + 0.5) / size) * 100}%`,
      };
    } else if (theme === 'hex') {
      const totalH = 16.0; 
      const cy = 0.5 + 0.75 * (p.r + p.c);
      const topPerc = (cy / totalH) * 100;

      const totalW = 11.0; 
      const cx = 5.5 + 0.5 * (p.r - p.c);
      const leftPerc = (cx / totalW) * 100;

      return { top: `${topPerc}%`, left: `${leftPerc}%` };
    } else if (theme.startsWith('abalone')) {
      const totalH = 7.0; // 9 rows (0 to 8): 0.5 + 8 * 0.75 + 0.5 = 7.0
      const cy = 0.5 + (p.r * 0.75);
      const topPerc = (cy / totalH) * 100;

      const totalW = 9.0;
      const rowLen = p.r <= 4 ? 5 + p.r : 5 + (8 - p.r);
      const offset = (totalW - rowLen) / 2;
      const cx = offset + p.c + 0.5;
      const leftPerc = (cx / totalW) * 100;

      return { top: `${topPerc}%`, left: `${leftPerc}%` };
    } else if (theme === 'desert') {
      const totalH = 5.5;
      const cy = 0.5 + (p.r * 0.75);
      const topPerc = (cy / totalH) * 100;

      const totalW = 10.5;
      const rowLen = 4 + p.r;
      const offset = (totalW - rowLen) / 2;
      const cx = offset + p.c + 0.5;
      const leftPerc = (cx / totalW) * 100;

      return { top: `${topPerc}%`, left: `${leftPerc}%` };
    } else {
      // ISLANDS
      const totalH = 5.5; 
      const totalW = 7.5;

      const isOddRow = p.r % 2 !== 0;
      const xOffset = isOddRow ? 0.5 : 0;
      const cx = p.c + xOffset + 0.5; 
      const cy = 0.5 + (p.r * 0.75);
      
      return {
        top: `${(cy / totalH) * 100}%`,
        left: `${(cx / totalW) * 100}%`,
      };
    }
  };

  // 60fps 3D Spherical Piece Rolling & 3D Wall Bottom-to-Top Rising Animation Trackers
  const [, setAnim3DTick] = useState(0);
  const pieceRollTracksRef = useRef<
    Record<
      string,
      {
        lastR: number;
        lastC: number;
        fromTop: number;
        fromLeft: number;
        curTop: number;
        curLeft: number;
        toTop: number;
        toLeft: number;
        startTime: number;
        duration: number;
        moveAngleBoardDeg: number;
        startRollDeg: number;
        targetRollDeg: number;
        curRollDeg: number;
        isRolling: boolean;
        wasContinuing: boolean;
      }
    >
  >({});
  const wallRiseTracksRef = useRef<
    Record<
      string,
      {
        startTime: number;
        duration: number;
        progress: number;
      }
    >
  >({});
  const wallsInitRef = useRef<boolean>(false);

  // Sync piece target positions & detect moves synchronously during render so the very first frame of a move starts interpolating smoothly without a 1-frame jump
  const activePieceKeys = new Set<string>();
  players.forEach((p) => {
    p.positions.forEach((pos, idx) => {
      const pieceKey = pos.id || `${p.id}-${idx}`;
      activePieceKeys.add(pieceKey);
      const targetStyle = getPosStyle(pos);
      const targetTop = parseFloat(String(targetStyle.top));
      const targetLeft = parseFloat(String(targetStyle.left));
      const existing = pieceRollTracksRef.current[pieceKey];
      if (!existing) {
        pieceRollTracksRef.current[pieceKey] = {
          lastR: pos.r,
          lastC: pos.c,
          fromTop: targetTop,
          fromLeft: targetLeft,
          curTop: targetTop,
          curLeft: targetLeft,
          toTop: targetTop,
          toLeft: targetLeft,
          startTime: 0,
          duration: 295,
          moveAngleBoardDeg: p.id === 1 ? 0 : 180,
          startRollDeg: (p.id * 45 + idx * 60) % 360,
          targetRollDeg: (p.id * 45 + idx * 60) % 360,
          curRollDeg: (p.id * 45 + idx * 60) % 360,
          isRolling: false,
          wasContinuing: false,
        };
      } else if (existing.lastR !== pos.r || existing.lastC !== pos.c) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const dTop = targetTop - existing.curTop;
        const dLeft = targetLeft - existing.curLeft;
        const distPerc = Math.hypot(dLeft * boardRatio, dTop);
        const angleDeg = Math.atan2(dTop, dLeft * boardRatio) * (180 / Math.PI);
        // ~240° of sphere rotation per cell traveled
        const deltaRollDeg = (distPerc / 14.2857) * 240;
        const wasContinuing = existing.isRolling && now - existing.startTime < existing.duration + 70;

        existing.lastR = pos.r;
        existing.lastC = pos.c;
        existing.fromTop = existing.curTop;
        existing.fromLeft = existing.curLeft;
        existing.toTop = targetTop;
        existing.toLeft = targetLeft;
        existing.startTime = now;
        existing.duration = 295;
        if (distPerc > 0.01) {
          existing.moveAngleBoardDeg = angleDeg;
        }
        existing.startRollDeg = existing.curRollDeg;
        existing.targetRollDeg = existing.curRollDeg + deltaRollDeg;
        existing.isRolling = true;
        existing.wasContinuing = wasContinuing;
      }
    });
  });
  Object.keys(pieceRollTracksRef.current).forEach((k) => {
    if (!activePieceKeys.has(k)) {
      delete pieceRollTracksRef.current[k];
    }
  });

  // Sync wall rising animations synchronously so newly placed walls start at progress = 0 (bottom) and rise to 1 (top)
  const currentWallIds = new Set<string>();
  walls.forEach((w) => {
    currentWallIds.add(w.id);
    if (!wallRiseTracksRef.current[w.id]) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const shouldAnimateRise = wallsInitRef.current && status === 'playing';
      wallRiseTracksRef.current[w.id] = {
        startTime: now,
        duration: 480,
        progress: shouldAnimateRise ? 0 : 1,
      };
    }
  });
  if (!wallsInitRef.current) {
    wallsInitRef.current = true;
  }
  Object.keys(wallRiseTracksRef.current).forEach((wId) => {
    if (!currentWallIds.has(wId)) {
      delete wallRiseTracksRef.current[wId];
    }
  });

  useEffect(() => {
    let rafId: number | null = null;
    const step = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      let hasActive = false;

      Object.values(pieceRollTracksRef.current).forEach((track) => {
        if (track.isRolling) {
          const rawT = Math.min(1, Math.max(0, (now - track.startTime) / track.duration));
          const easedT = track.wasContinuing
            ? 1 - Math.pow(1 - rawT, 1.5)
            : 0.5 - 0.5 * Math.cos(Math.PI * rawT);
          track.curTop = track.fromTop + (track.toTop - track.fromTop) * easedT;
          track.curLeft = track.fromLeft + (track.toLeft - track.fromLeft) * easedT;
          track.curRollDeg = track.startRollDeg + (track.targetRollDeg - track.startRollDeg) * easedT;
          if (rawT >= 1) {
            track.curTop = track.toTop;
            track.curLeft = track.toLeft;
            track.curRollDeg = track.targetRollDeg;
            track.isRolling = false;
            track.wasContinuing = false;
          } else {
            hasActive = true;
          }
        }
      });

      Object.values(wallRiseTracksRef.current).forEach((wTrack) => {
        if (wTrack.progress < 1) {
          const rawT = Math.min(1, Math.max(0, (now - wTrack.startTime) / wTrack.duration));
          // Smooth cubic ease-out rising from bottom (0) to top (1)
          wTrack.progress = 1 - Math.pow(1 - rawT, 3);
          if (rawT >= 1) {
            wTrack.progress = 1;
          } else {
            hasActive = true;
          }
        }
      });

      setAnim3DTick((v) => (v + 1) % 1000000);
      if (hasActive) {
        rafId = requestAnimationFrame(step);
      }
    };

    const anyRolling = Object.values(pieceRollTracksRef.current).some((t) => t.isRolling);
    const anyRising = Object.values(wallRiseTracksRef.current).some((w) => w.progress < 1);
    if (anyRolling || anyRising) {
      rafId = requestAnimationFrame(step);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [players, walls, boardRatio]);

  const renderWall = (w: Wall) => {
    if (!w.id.includes('|')) {
      // Burnt cell in Amazons is now rendered via getCellColor
      return null;
    }

    const [p1Str, p2Str] = w.id.split('|');
    const [r1, c1] = p1Str.split(',').map(Number);
    const [r2, c2] = p2Str.split(',').map(Number);
    
    if (!isValidCell(r1, c1, theme) || !isValidCell(r2, c2, theme)) return null;

    const s1 = getPosStyle({r: r1, c: c1});
    const s2 = getPosStyle({r: r2, c: c2});
    
    const t1 = parseFloat(s1.top);
    const l1 = parseFloat(s1.left);
    const t2 = parseFloat(s2.top);
    const l2 = parseFloat(s2.left);
    
    const midTop = (t1 + t2) / 2;
    const midLeft = (l1 + l2) / 2;
    
    const deltaY = t2 - t1;
    const deltaX = l2 - l1;
    
    const angle = Math.atan2(deltaY, deltaX * boardRatio) * (180 / Math.PI);
    const wallColor = PLAYER_COLORS[w.ownerId];
    // 24px max height at 38° max tilt, scaled by bottom-to-top riseProgress (0 -> 1)
    const riseProgress = wallRiseTracksRef.current[w.id]?.progress ?? 1;
    const fullWall3DHeightPx = isWallGo3D ? Math.round(24 * Math.min(1, Math.max(0.65, wallGoTiltX / 34))) : 0;
    const wall3DHeightPx = fullWall3DHeightPx * riseProgress;
    const baseZPx = isWallGo3D ? (2.5 * Math.min(1, riseProgress * 1.8)).toFixed(2) : '0';

    return (
      <div 
        key={w.id}
        className="absolute z-20 rounded-full pointer-events-none"
        style={{
          top: `${midTop}%`,
          left: `${midLeft}%`,
          width: isHex ? '6px' : isWallGo3D ? '8px' : '6px',
          height: `${wallHeightPerc}%`, 
          backgroundColor: wallColor,
          opacity: isWallGo3D ? Math.min(1, 0.25 + riseProgress * 0.75) : 1,
          transform: isWallGo3D
            ? `translate(-50%, -50%) rotate(${angle}deg) translateZ(${baseZPx}px)`
            : `translate(-50%, -50%) rotate(${angle}deg)`,
          transformStyle: isWallGo3D ? 'preserve-3d' : undefined,
          boxShadow: isHex 
            ? `0 0 5px ${wallColor}, inset 0 0 4px rgba(0,0,0,0.5)` 
            : isWallGo3D
              ? `0 0 6px ${wallColor}`
              : `0 0 10px ${wallColor}`,
          border: isHex ? '1px solid rgba(255,255,255,0.4)' : 'none',
          borderRadius: '3px'
        }}
      >
        {isWallGo3D && fullWall3DHeightPx > 0 && (
          <>
            {/* Sub-pixel dense parallel 3D Z-slices (14 layers) extruding from bottom (0px) to top (wall3DHeightPx) */}
            {[0.07, 0.14, 0.21, 0.28, 0.35, 0.42, 0.49, 0.56, 0.63, 0.70, 0.77, 0.84, 0.91, 0.96].map((ratio, layerIdx) => {
              const shadeAlpha = (1 - ratio) * 0.52;
              return (
                <div
                  key={layerIdx}
                  className="pointer-events-none"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(rgba(0,0,0,${shadeAlpha.toFixed(2)}), rgba(0,0,0,${shadeAlpha.toFixed(2)})), ${wallColor}`,
                    transform: `translateZ(${(wall3DHeightPx * ratio).toFixed(2)}px)`,
                    borderRadius: '3px',
                  }}
                />
              );
            })}
            {/* 3D Wall Glowing Top Ridge Cap rising from bottom (0px) to top (wall3DHeightPx) */}
            <div
              className="pointer-events-none"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: wallColor,
                transform: `translateZ(${wall3DHeightPx.toFixed(2)}px)`,
                borderRadius: '3px',
                border: '1.5px solid rgba(255,255,255,0.88)',
                boxShadow: `0 0 ${Math.round(4 + 6 * riseProgress)}px ${wallColor}`,
              }}
            />
          </>
        )}
      </div>
    );
  };

  const getCellColor = (r: number, c: number) => {
    if (theme.startsWith('amazons')) {
      const burntCell = walls.find(w => w.id === `${r},${c}`);
      if (burntCell) return `${PLAYER_COLORS[burntCell.ownerId as PlayerId]}60`; // Reduced intensity for burnt cells
    }
    
    if (theme === 'shobu' || theme === 'shobu-scacchiera') {
      const isDarkBoard = c < 4;
      if (theme === 'shobu-scacchiera') {
        const isCheckerDark = (r + c) % 2 === 1;
        if (isDarkBoard) {
          return isCheckerDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(51, 65, 85, 0.9)';
        } else {
          return isCheckerDark ? 'rgba(148, 163, 184, 0.8)' : 'rgba(241, 245, 249, 0.8)';
        }
      }
      return 'transparent'; // Background boards handle the color
    }

    if (theme === 'hex') {
      const occPlayer = players.find(p => p.positions.some(pos => pos.r === r && pos.c === c));
      if (occPlayer) return occPlayer.color || `${PLAYER_COLORS[occPlayer.id]}`; // Solid color for hex cells occupied by players
    }

    if (gameMode !== 'pente' && gameMode !== 'orbito' && gameMode !== 'abalone' && gameMode !== 'hex' && gameMode !== 'corsa') {
      const ownerId = territoryMap[`${r},${c}`];
      if (ownerId) return `${PLAYER_COLORS[ownerId]}80`;
    }
    
    if (theme.startsWith('abalone')) return 'rgba(0,0,0,0.6)';
    if (theme.startsWith('baduk')) return 'transparent'; // Let the background of boardBgClass shine through for the cells
    if (isWallGo3D) return 'rgba(255,255,255,0.16)';
    return 'rgba(255,255,255,0.08)';
  };

  const boardBgClass = theme.startsWith('baduk') ? 'bg-[#5f6368] border border-[#3c4043]' : 'bg-slate-800/60';

  // Dimensioni celle per griglia
  let hexWidthPerc: number, hexHeightPerc: number, pieceWidthPerc: number, wallHeightPerc: number;
  if (theme.startsWith('abalone')) {
     hexWidthPerc = (1 / 9.0) * 100 * 1.015;
     hexHeightPerc = (1 / 7.0) * 100 * 1.015;
     pieceWidthPerc = 9.0;
     wallHeightPerc = 8;
  } else if (theme === 'desert') {
     hexWidthPerc = (1 / 10.5) * 100 * 1.015;
     hexHeightPerc = (1 / 5.5) * 100 * 1.015; 
     pieceWidthPerc = 6.5;
     wallHeightPerc = 8;
  } else if (theme === 'islands') {
     hexWidthPerc = (1 / 7.5) * 100 * 1.015;
     hexHeightPerc = (1 / 5.5) * 100 * 1.015;
     pieceWidthPerc = 9.0;
     wallHeightPerc = 8;
  } else if (theme === 'hex') {
     hexWidthPerc = (1 / 11.0) * 100 * 1.02;
     hexHeightPerc = (1 / 16.0) * 100 * 1.02;
     pieceWidthPerc = 7.5;
     wallHeightPerc = 8;
  } else if (theme === 'hourglass') {
     hexWidthPerc = (1/7) * 100 * 0.92;
     hexHeightPerc = (1/9) * 100 * 0.92;
     pieceWidthPerc = 11.0;
     wallHeightPerc = 100 / 9;
  } else if (theme === 'bridge') {
     hexWidthPerc = (1/8) * 100 * 0.92;
     hexHeightPerc = (1/8) * 100 * 0.92;
     pieceWidthPerc = 10.0;
     wallHeightPerc = 100 / 8;
  } else if (theme === 'arena') {
     hexWidthPerc = (1/9) * 100 * 0.92;
     hexHeightPerc = (1/9) * 100 * 0.92;
     pieceWidthPerc = 9.0;
     wallHeightPerc = 100 / 9;
  } else if (theme === 'hammer') {
     hexWidthPerc = (1/7) * 100 * 0.92;
     hexHeightPerc = (1/11) * 100 * 0.92;
     pieceWidthPerc = 11.0;
     wallHeightPerc = 100 / 11;
  } else if (theme === 'corsa' || theme === 'shobu' || theme === 'shobu-scacchiera') {
     hexWidthPerc = (1/9) * 100 * 0.92;
     hexHeightPerc = (1/9) * 100 * 0.92;
     pieceWidthPerc = 9.0;
     wallHeightPerc = 100 / 9;
  } else if (theme === 'amazons-8' || theme === 'domineering') {
     hexWidthPerc = (1/8) * 100 * 0.92;
     hexHeightPerc = (1/8) * 100 * 0.92;
     pieceWidthPerc = 10.0;
     wallHeightPerc = 100 / 8;
  } else if (theme === 'amazons-10') {
     hexWidthPerc = (1/10) * 100 * 0.92;
     hexHeightPerc = (1/10) * 100 * 0.92;
     pieceWidthPerc = 8.0;
     wallHeightPerc = 100 / 10;
  } else if (theme === 'pente') {
     hexWidthPerc = (1/15) * 100 * 1.0;
     hexHeightPerc = (1/15) * 100 * 1.0;
     pieceWidthPerc = 5.8;
     wallHeightPerc = 100 / 15;
  } else if (theme === 'amazons-6') {
     hexWidthPerc = (1/6) * 100 * 0.92;
     hexHeightPerc = (1/6) * 100 * 0.92;
     pieceWidthPerc = 14.0;
     wallHeightPerc = 100 / 6;
  } else if (theme.startsWith('baduk')) {
     const sizeStr = theme.split('-')[1];
     const size = parseInt(sizeStr, 10) || 19;
     hexWidthPerc = (1/size) * 100 * 1.0;
     hexHeightPerc = (1/size) * 100 * 1.0;
     pieceWidthPerc = 0.95 * (100 / size); // 95% of cell width
     wallHeightPerc = 100 / size;
  } else {
     hexWidthPerc = (1/7) * 100 * 0.92;
     hexHeightPerc = (1/7) * 100 * 0.92;
     pieceWidthPerc = 11.0;
     wallHeightPerc = 100 / 7;
  }

  const isSelectedPieceEnclosed = selectedPieceIndex !== null && currentPlayer && currentPlayer.positions[selectedPieceIndex] &&
    territoryMap[`${currentPlayer.positions[selectedPieceIndex].r},${currentPlayer.positions[selectedPieceIndex].c}`] === currentPlayer.id;

  const renderAbaloneSelection = () => {
    if (gameMode !== 'abalone' || !abaloneSelectedIndices || abaloneSelectedIndices.length === 0) return null;
    if (!currentPlayer) return null;

    const pieces = abaloneSelectedIndices.map(i => currentPlayer.positions[i]).filter(Boolean);
    if (pieces.length === 0) return null;

    const getUCoords = (px: Point) => {
        const totalW = 9.0;
        let rowW = 5 + px.r;
        if (px.r > 4) rowW = 5 + (8 - px.r);
        const startX = (totalW - rowW) / 2;
        const cx = startX + 0.5 + px.c;
        const cy = 0.5 + px.r * 0.75;
        return { x: cx * (Math.sqrt(3)/2), y: cy };
    };

    const first = getUCoords(pieces[0]);
    const last = getUCoords(pieces[pieces.length - 1]);

    const mx = (first.x + last.x) / 2;
    const my = (first.y + last.y) / 2;

    const dx = last.x - first.x;
    const dy = last.y - first.y;

    const dist = Math.sqrt(dx*dx + dy*dy);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const pieceDiameter = 0.82; 
    const boxWidth = dist + pieceDiameter;
    const boxHeight = pieceDiameter;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[38] drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] opacity-90 transition-all duration-300" viewBox="0 0 7.7942286 7" preserveAspectRatio="none">
         <g transform={`translate(${mx}, ${my}) rotate(${angle})`}>
            <rect 
               x={-boxWidth/2} 
               y={-boxHeight/2} 
               width={boxWidth} 
               height={boxHeight} 
               rx={boxHeight/2} 
               fill="rgba(250, 204, 21, 0.15)" 
               stroke="#facc15" 
               strokeWidth="0.06" 
            />
         </g>
      </svg>
    );
  };

  const getZoomStyle = () => {
    if (winner) {
      if (winningLine && winningLine.length > 0) {
        // Calculate center of winning line
        const centerR = winningLine.reduce((acc: number, p: Point) => acc + p.r, 0) / winningLine.length;
        const centerC = winningLine.reduce((acc: number, p: Point) => acc + p.c, 0) / winningLine.length;
        const centerPointId = '';
        const mockPoint = { r: centerR, c: centerC, id: centerPointId };
        const posStyle = getPosStyle(mockPoint);
        
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const scaleValue = isMobile ? 2.5 : 1.6;
        return {
           transform: `scale(${scaleValue})`,
           transformOrigin: `${posStyle.left} ${posStyle.top}`
        };
      }
      return { transform: 'scale(0.82) translateY(1rem)', transformOrigin: 'center' };
    }
    
    if (hexZoomCell) {
      const posStyle = getPosStyle(hexZoomCell);
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      let scaleValue = isMobile ? 3.0 : 1.8;
      if (gameMode === 'baduk') {
        if (theme === 'baduk-19') {
          scaleValue = isMobile ? 3.2 : 2.2;
        } else if (theme === 'baduk-13') {
          scaleValue = isMobile ? 2.6 : 1.9;
        } else {
          scaleValue = isMobile ? 2.0 : 1.6;
        }
      }
      
      return {
          transform: `scale(${scaleValue}) translate(${panOffset.x / scaleValue}px, ${panOffset.y / scaleValue}px)`,
          transformOrigin: `${posStyle.left} ${posStyle.top}`
      };
    }

    if (isWallGo3D && !winner) {
      const radZ = (wallGoRotateZ * Math.PI) / 180;
      const radX = (wallGoTiltX * Math.PI) / 180;
      const cosZ = Math.cos(radZ);
      const sinZ = Math.sin(radZ);
      const sinX = Math.sin(radX);
      const h = 1 / boardRatio;
      const rho = 0.20;
      const corners: [number, number][] = [
        [-1, -h],
        [1, -h],
        [1, h],
        [-1, h],
      ];
      let minProjX = Infinity;
      let maxProjX = -Infinity;
      for (const [cx, cy] of corners) {
        const x1 = cx * cosZ - cy * sinZ;
        const y1 = cx * sinZ + cy * cosZ;
        const projX = x1 / Math.max(0.5, 1 - rho * y1 * sinX);
        if (projX < minProjX) minProjX = projX;
        if (projX > maxProjX) maxProjX = projX;
      }
      const halfSpanX = Math.max(0.5, (maxProjX - minProjX) * 0.5);
      const midProjX = (maxProjX + minProjX) * 0.5;
      const dynamic3DScale = 0.994 / halfSpanX;
      const shiftXPct = -midProjX * dynamic3DScale * 50;

      if (selectedPieceIndex !== null && isActuallyUserTurn && isWallBreakingMode && isSelectedPieceEnclosed) {
        const p = currentPlayer.positions[selectedPieceIndex];
        const posStyle = getPosStyle(p);
        return {
          transform: `translateX(${shiftXPct.toFixed(2)}%) perspective(950px) scale(${(dynamic3DScale * 1.25).toFixed(3)}) rotateX(${wallGoTiltX.toFixed(1)}deg) rotateZ(${wallGoRotateZ.toFixed(1)}deg)`,
          transformOrigin: `${posStyle.left} ${posStyle.top}`,
          transformStyle: 'preserve-3d' as const,
        };
      }

      return {
        transform: `translateX(${shiftXPct.toFixed(2)}%) perspective(950px) scale(${dynamic3DScale.toFixed(3)}) rotateX(${wallGoTiltX.toFixed(1)}deg) rotateZ(${wallGoRotateZ.toFixed(1)}deg)`,
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d' as const,
      };
    }

    if (selectedPieceIndex !== null && isActuallyUserTurn) {
      const p = currentPlayer.positions[selectedPieceIndex];
      const posStyle = getPosStyle(p);
      
      if (isWallBreakingMode && isSelectedPieceEnclosed) {
        // Affidiamoci principalmente alla larghezza della finestra per supportare bene anche l'emulatore del browser
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        // Zoom molto forte (2.2) su mobile, zoom leggero (1.2) su PC/Tablet
        const scaleValue = isHex ? (isMobile ? 2.2 : 1.2) : 1.2;
        
        return {
          transform: `scale(${scaleValue})`,
          transformOrigin: `${posStyle.left} ${posStyle.top}`
        };
      } else if (isHex && gameMode !== 'abalone' && gameMode !== 'hex') {
        // Zoom del 30% (1.30) quando il giocatore seleziona una pedina su scacchiera esagonale
        return {
          transform: `scale(1.30)`,
          transformOrigin: `${posStyle.left} ${posStyle.top}`
        };
      }
    }
    return { transform: 'scale(1)', transformOrigin: 'center' };
  };

  return (
    <>
    {isWallGo3D && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setWallGoTiltX(0);
          setWallGoRotateZ(0);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 z-[260] px-3 py-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-amber-400/70 text-amber-300 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,0,0,0.85)] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        title="Torna alla vista 2D"
      >
        <span>🔄</span>
        <span>2D</span>
      </button>
    )}
    <div 
      onPointerDown={(e) => {
        if (isWallGoMode && !(gameMode === 'corsa' && corsaAction === 'wall') && !winner && status !== 'ended' && status !== 'scoring' && e.isPrimary) {
          wallGoDragRef.current = {
            active: true,
            lastX: e.clientX,
            lastY: e.clientY,
            totalDist: 0,
            wasDragged: false,
          };
        }
        if (hexZoomCell && e.isPrimary) {
          setIsPanning(true);
          setLastPanPos({ x: e.clientX, y: e.clientY });
          setHasPanned(false);
        }
      }}
      onPointerUp={() => { 
        if (wallGoDragRef.current.active) {
          wallGoDragRef.current.active = false;
          setIsDraggingWallGo3D(false);
          setTimeout(() => {
            wallGoDragRef.current.wasDragged = false;
            wasBoardDraggedRef.current = false;
          }, 50);
        }
        setIsDraggingFugaWall(false); setIsDraggingAbalone(false); 
        setIsPanning(false);
        setTimeout(() => setHasPanned(false), 50);
      }}
      onPointerCancel={() => {
        wallGoDragRef.current.active = false;
        wallGoDragRef.current.wasDragged = false;
        wasBoardDraggedRef.current = false;
        setIsDraggingWallGo3D(false);
        setIsPanning(false);
        setHasPanned(false);
      }}
      onPointerLeave={(e) => { 
        if (e.pointerType === 'mouse') {
          setIsDraggingFugaWall(false); setIsDraggingAbalone(false); 
          if (wallGoDragRef.current.active) {
            wallGoDragRef.current.active = false;
            setIsDraggingWallGo3D(false);
            setTimeout(() => {
              wallGoDragRef.current.wasDragged = false;
              wasBoardDraggedRef.current = false;
            }, 50);
          }
        }
        setIsPanning(false);
      }}
      onPointerMove={(e) => {
        if (isWallGoMode && !(gameMode === 'corsa' && corsaAction === 'wall') && !isDraggingFugaWall && wallGoDragRef.current.active && !winner && status !== 'ended' && status !== 'scoring' && e.isPrimary) {
          const dx = e.clientX - wallGoDragRef.current.lastX;
          const dy = e.clientY - wallGoDragRef.current.lastY;
          wallGoDragRef.current.lastX = e.clientX;
          wallGoDragRef.current.lastY = e.clientY;
          wallGoDragRef.current.totalDist += Math.hypot(dx, dy);

          if (wallGoDragRef.current.totalDist > 6) {
            if (!wallGoDragRef.current.wasDragged) {
              wallGoDragRef.current.wasDragged = true;
              wasBoardDraggedRef.current = true;
              setIsDraggingWallGo3D(true);
              setHasPanned(true);
              setHexZoomCell(null);
            }
            setWallGoRotateZ((prev) => prev - dx * 0.48);
            setWallGoTiltX((prev) => {
              // Maximum 3D tilt capped at 38° as shown in the reference screenshot
              const baseTilt = prev < 10 ? 34 : prev;
              const nextTilt = Math.max(0, Math.min(38, baseTilt - dy * 0.32));
              return nextTilt < 5 && dy > 2 ? 0 : nextTilt;
            });
          }
          return;
        }
        if (isPanning && hexZoomCell && e.isPrimary) {
          const dx = e.clientX - lastPanPos.x;
          const dy = e.clientY - lastPanPos.y;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5 || hasPanned) {
            setHasPanned(true);
            setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastPanPos({ x: e.clientX, y: e.clientY });
          }
        }
      }}
      onClick={() => {
        if (hasPanned || wasBoardDraggedRef.current) return;
        if (gameMode === 'hex' || gameMode === 'pente' || gameMode === 'baduk') {
          setHexZoomCell(null);
          setPanOffset({ x: 0, y: 0 });
        }
      }}
      className={`relative p-0.5 shadow-[0_0_50px_rgba(0,0,0,0.7)] mx-auto select-none shrink-0 ${boardBgClass} ${className || ''} ${theme.startsWith('abalone') ? 'touch-none' : 'rounded-[1.5rem] border-[2px] border-[#fef08a]'} ${isWallGoMode || gameMode === 'hex' || gameMode === 'pente' || gameMode === 'baduk' ? 'touch-none' : ''} ${hasPanned || isPanning || isDraggingWallGo3D ? 'transition-none' : 'transition-all duration-300 ease-in-out'} ${isWallGoMode ? ((gameMode === 'corsa' && corsaAction === 'wall') || ((gameMode === 'dominio' || gameMode === 'amazons') && turnPhase === 'walling') ? 'cursor-pointer' : (isDraggingWallGo3D ? 'cursor-grabbing' : 'cursor-grab')) : ''}`} 
      style={{ 
        width: '100%',
        height: '100%',
        maxHeight: isWallGo3D ? `calc(100cqw / ${boardRatio})` : `min(100cqh, calc(100cqw / ${boardRatio}))`,
        maxWidth: isWallGo3D ? `min(100cqw, ${theme === 'desert' ? '1400px' : '550px'})` : `min(100cqw, calc(100cqh * ${boardRatio}), ${theme === 'desert' ? '1400px' : '550px'})`,
        clipPath: theme.startsWith('abalone') ? 'polygon(22% 0%, 78% 0%, 100% 50%, 78% 100%, 22% 100%, 0% 50%)' : 'none',
        aspectRatio: `${boardRatio}/1`,
        ...getZoomStyle(),
        ...style
      }}
    >
      {/* 3D Extruded Tabletop Base Slab & Ambient Floor Shadow when Wall Go 3D mode is active */}
      {isWallGo3D && (
        <>
          <div
            className="absolute inset-0 rounded-[1.5rem] pointer-events-none"
            style={{
              backgroundColor: '#1e293b',
              border: '2px solid #ca8a04',
              transform: 'translateZ(-7px)',
              boxShadow: 'inset 0 0 18px rgba(0,0,0,0.75)',
            }}
          />
          <div
            className="absolute inset-0 rounded-[1.5rem] pointer-events-none"
            style={{
              backgroundColor: '#0f172a',
              border: '2px solid #854d0e',
              transform: 'translateZ(-14px)',
              boxShadow: '0 26px 45px rgba(0,0,0,0.88)',
            }}
          />
        </>
      )}
      <div 
        className="relative w-full h-full"
        style={{ transformStyle: isWallGo3D ? 'preserve-3d' : undefined }}
        onPointerMove={(e) => {
          if (!isDraggingFugaWall || !onPreviewFugaWall || gameMode !== 'corsa' || corsaAction !== 'wall') return;
          // Su mobile onPointerEnter non parte durante il drag. Usiamo elementFromPoint
          const touch = e;
          const rawEl = document.elementFromPoint(touch.clientX, touch.clientY);
          const el = rawEl?.closest?.('[data-r]') || rawEl;
          if (el) {
             const rStr = el.getAttribute('data-r');
             const cStr = el.getAttribute('data-c');
             if (rStr !== null && cStr !== null) {
                const hoverR = Math.min(parseInt(rStr, 10), GRID_SIZE - 2);
                const hoverC = Math.min(parseInt(cStr, 10), GRID_SIZE - 2);
                onPreviewFugaWall(hoverR, hoverC, fugaWallPreview?.orientation || 'h');
             }
          }
        }}
      >
        {(theme === 'shobu' || theme === 'shobu-scacchiera') && (() => {
          const hlBL = gameMode === 'shobu' && isActuallyUserTurn && !winner && 
            (shobuState?.passiveMove ? shobuState.passiveMove.boardColor === 'light' : currentPlayer?.id === 1);
          const hlBR = gameMode === 'shobu' && isActuallyUserTurn && !winner && 
            (shobuState?.passiveMove ? shobuState.passiveMove.boardColor === 'dark' : currentPlayer?.id === 1);
          const hlTL = gameMode === 'shobu' && isActuallyUserTurn && !winner && 
            (shobuState?.passiveMove ? shobuState.passiveMove.boardColor === 'light' : currentPlayer?.id === 2);
          const hlTR = gameMode === 'shobu' && isActuallyUserTurn && !winner && 
            (shobuState?.passiveMove ? shobuState.passiveMove.boardColor === 'dark' : currentPlayer?.id === 2);

          return (
            <div className="absolute inset-0 pointer-events-none z-0">
              {/* Dark Board Top-Left */}
              <div
                className={`absolute top-[0%] left-[0%] w-[44.44%] h-[44.44%] ${theme === 'shobu' ? 'bg-[#a27448] border-[#6b2c2c]' : 'bg-[#334155] border-[#1e293b]'} border-[4px] rounded-tl-[2.2rem] rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${hlTL ? 'border-amber-300 animate-pulse z-10 shadow-[0_0_15px_rgba(252,211,77,0.6)]' : ''}`}
                style={
                  isWallGo3D && !hlTL
                    ? {
                        boxShadow:
                          theme === 'shobu'
                            ? '0 5px 0 #4a1e1e, 0 9px 18px rgba(0,0,0,0.65), inset 0 0 40px rgba(0,0,0,0.5)'
                            : '0 5px 0 #0f172a, 0 9px 18px rgba(0,0,0,0.65), inset 0 0 40px rgba(0,0,0,0.5)',
                      }
                    : undefined
                }
              />
              
              {/* Light Board Top-Right */}
              <div
                className={`absolute top-[0%] right-[0%] w-[44.44%] h-[44.44%] ${theme === 'shobu' ? 'bg-[#e8cda6] border-[#c4a476]' : 'bg-[#f1f5f9] border-[#cbd5e1]'} border-[4px] rounded-tr-[2.2rem] rounded-tl-xl rounded-bl-xl rounded-br-xl overflow-hidden transition-all duration-300 ${hlTR ? 'border-amber-400 animate-pulse z-10 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'shadow-[inset_0_0_40px_rgba(0,0,0,0.15)]'}`}
                style={
                  isWallGo3D && !hlTR
                    ? {
                        boxShadow:
                          theme === 'shobu'
                            ? '0 5px 0 #8c6d43, 0 9px 18px rgba(0,0,0,0.65), inset 0 0 40px rgba(0,0,0,0.18)'
                            : '0 5px 0 #64748b, 0 9px 18px rgba(0,0,0,0.65), inset 0 0 40px rgba(0,0,0,0.18)',
                      }
                    : undefined
                }
              >
                 <div className={`absolute inset-0 opacity-20 ${theme === 'shobu' ? 'bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(0,0,0,0.05)_20px,rgba(0,0,0,0.05)_40px)]' : ''}`} />
              </div>
              
              {/* Dark Board Bottom-Left */}
              <div
                className={`absolute bottom-[0%] left-[0%] w-[44.44%] h-[44.44%] ${theme === 'shobu' ? 'bg-[#a27448] border-[#6b2c2c]' : 'bg-[#334155] border-[#1e293b]'} border-[4px] rounded-bl-[2.2rem] rounded-tl-xl rounded-br-xl rounded-tr-xl shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${hlBL ? 'border-amber-300 animate-pulse z-10 shadow-[0_0_15px_rgba(252,211,77,0.6)]' : ''}`}
                style={
                  isWallGo3D && !hlBL
                    ? {
                        boxShadow:
                          theme === 'shobu'
                            ? '0 5px 0 #4a1e1e, 0 9px 18px rgba(0,0,0,0.65), inset 0 0 40px rgba(0,0,0,0.5)'
                            : '0 5px 0 #0f172a, 0 9px 18px rgba(0,0,0,0.65), inset 0 0 40px rgba(0,0,0,0.5)',
                      }
                    : undefined
                }
              />
              
              {/* Light Board Bottom-Right */}
              <div
                className={`absolute bottom-[0%] right-[0%] w-[44.44%] h-[44.44%] ${theme === 'shobu' ? 'bg-[#e8cda6] border-[#c4a476]' : 'bg-[#f1f5f9] border-[#cbd5e1]'} border-[4px] rounded-br-[2.2rem] rounded-tr-xl rounded-bl-xl rounded-tl-xl overflow-hidden transition-all duration-300 ${hlBR ? 'border-amber-400 animate-pulse z-10 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'shadow-[inset_0_0_40px_rgba(0,0,0,0.15)]'}`}
                style={
                  isWallGo3D && !hlBR
                    ? {
                        boxShadow:
                          theme === 'shobu'
                            ? '0 5px 0 #8c6d43, 0 9px 18px rgba(0,0,0,0.65), inset 0 0 40px rgba(0,0,0,0.18)'
                            : '0 5px 0 #64748b, 0 9px 18px rgba(0,0,0,0.65), inset 0 0 40px rgba(0,0,0,0.18)',
                      }
                    : undefined
                }
              >
                 <div className={`absolute inset-0 opacity-20 ${theme === 'shobu' ? 'bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(0,0,0,0.05)_20px,rgba(0,0,0,0.05)_40px)]' : ''}`} />
              </div>
            </div>
          );
        })()}
        {/* Grid Cells */}
        {Array.from({ length: GRID_SIZE }).map((_, r) => (
          Array.from({ length: GRID_SIZE }).map((_, c) => {
            if (!isValidCell(r, c, theme)) return null;

            const style = getPosStyle({r, c});
            const color = getCellColor(r, c);
            
            return (
              <div
                key={`${r}-${c}`}
                data-r={r}
                data-c={c}
                onPointerDown={(e) => {
                  if (gameMode === 'corsa' && corsaAction === 'wall' && onPreviewFugaWall && !winner && isActuallyUserTurn) {
                    setIsDraggingFugaWall(true);
                    const targetR = Math.min(r, GRID_SIZE - 2);
                    const targetC = Math.min(c, GRID_SIZE - 2);
                    onPreviewFugaWall(targetR, targetC, fugaWallPreview?.orientation || 'h');
                  }
                }}
                onPointerEnter={(e) => {
                  if (isDraggingFugaWall && gameMode === 'corsa' && corsaAction === 'wall' && onPreviewFugaWall && !winner && isActuallyUserTurn) {
                    const targetR = Math.min(r, GRID_SIZE - 2);
                    const targetC = Math.min(c, GRID_SIZE - 2);
                    onPreviewFugaWall(targetR, targetC, fugaWallPreview?.orientation || 'h');
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasPanned || wasBoardDraggedRef.current) return;
                  if (!isActuallyUserTurn || winner) return;

                  if (gameMode === 'hex' || gameMode === 'pente' || gameMode === 'baduk') {
                    const isOccupied = players.some(p => p.positions.some(pos => pos.r === r && pos.c === c));
                    if (isOccupied) return;

                    if (gameMode === 'baduk' && theme === 'baduk-9' && isWallGo3D) {
                      onPlacePiece(r, c);
                      setHexZoomCell(null);
                      return;
                    }

                    if (hexZoomCell?.r !== r || hexZoomCell?.c !== c) {
                      setHexZoomCell({ r, c });
                      setPanOffset({ x: 0, y: 0 });
                      return; // First click just zooms
                    }

                    // Second click on the same cell confirms and places the piece/stone
                    onPlacePiece(r, c);
                    setHexZoomCell(null);
                    return;
                  }

                  if (gameMode === 'domineering') {
                    onPlacePiece(r, c);
                    return;
                  }

                  if (gameMode === 'orbito') {
                    if (orbitoPhase === 'shift') {
                      if (possibleMoves.some(m => m.r === r && m.c === c)) {
                         if (orbitoActionState?.playerId && orbitoActionState.pieceIdx !== undefined) {
                            onShiftOpponentPiece?.(orbitoActionState.playerId, orbitoActionState.pieceIdx, r, c);
                         }
                      }
                      return;
                    } else if (orbitoPhase === 'place') {
                      const isOccupied = players.some(p => p.positions.some(pos => pos.r === r && pos.c === c));
                      if (!isOccupied) {
                         onPlacePiece(r, c);
                      }
                      return;
                    }
                  }

                  if (turnPhase === 'setup') {
                    const isOccupied = players.some(p => p.positions.some(pos => pos.r === r && pos.c === c));
                    if (!isOccupied) {
                       onPlacePiece(r, c);
                       setHexZoomCell(null);
                    }
                  }
                  else if (possibleMoves.some(m => m.r === r && m.c === c)) {
                      const matched = possibleMoves.find(m => m.r === r && m.c === c);
                      onMove(matched || { r, c });
                      setHexZoomCell(null);
                  }
                  else if ((gameMode === 'dominio' || gameMode === 'amazons') && wallOptions.some(w => w.r === r && w.c === c)) onPlaceWall(r, c);
                  else if (gameMode === 'corsa' && corsaAction === 'wall' && onPreviewFugaWall) {
                    const targetR = Math.min(r, GRID_SIZE - 2);
                    const targetC = Math.min(c, GRID_SIZE - 2);
                    // Cliccando sulla stessa casella ruota il muro (se non stavamo solo trascinando)
                    if (fugaWallPreview?.r === targetR && fugaWallPreview?.c === targetC) {
                      const nextOrientation = fugaWallPreview.orientation === 'h' ? 'v' : 'h';
                      onPreviewFugaWall(targetR, targetC, nextOrientation);
                    } else {
                      onPreviewFugaWall(targetR, targetC, fugaWallPreview?.orientation || 'h');
                    }
                  } else {
                    if (turnPhase === 'walling') return;
                    if (turnPhase === 'moving' && gameMode !== 'corsa') {
                      const pieceIndex = currentPlayer?.positions.findIndex(pos => pos.r === r && pos.c === c);
                      if (pieceIndex !== undefined && pieceIndex >= 0) {
                        onSelectPiece(pieceIndex);
                        return;
                      }
                    }
                    onSelectPiece(null);
                  }
                }}
                className={`absolute flex items-center justify-center transition-colors duration-200 ${isWallGoMode ? "overflow-visible before:content-[''] before:absolute before:-inset-[6%] hover:bg-white/25" : 'overflow-hidden active:scale-95 hover:brightness-125'} cursor-pointer z-10 touch-none`}
                style={{
                  ...style,
                  width: theme.startsWith('abalone') ? `${pieceWidthPerc}%` : `${hexWidthPerc}%`,
                  height: theme.startsWith('abalone') ? `${pieceWidthPerc * boardRatio}%` : `${hexHeightPerc}%`,
                  transform: isWallGo3D ? 'translate(-50%, -50%) translateZ(2px)' : 'translate(-50%, -50%)',
                  backgroundColor: color,
                  clipPath: (isHex && !theme.startsWith('abalone')) ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : (theme.startsWith('abalone') ? 'circle(50% at 50% 50%)' : 'none'),
                  borderRadius: (isHex && !theme.startsWith('abalone')) ? '0' : (theme.startsWith('abalone') ? '50%' : '6px'),
                  border: (theme.startsWith('abalone') || theme === 'pente' || theme.startsWith('baduk')) ? 'none' : (theme === 'shobu' ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.08)')
                }}
              >
                {gameMode === 'hex' && (() => {
                  const isRed = (r === 0 || r === 10);
                  const isBlue = (c === 0 || c === 10);
                  if (!isRed && !isBlue) return null;

                  const lines = [];
                  const strokeW = "8%"; // 4% visible due to clipPath
                  
                  if (r === 0) {
                    // Red Top-Left and Left
                    lines.push(<line key="tl" x1="0%" y1="25%" x2="50%" y2="0%" stroke={PLAYER_COLORS[2]} strokeWidth={strokeW} />);
                    lines.push(<line key="l" x1="0%" y1="25%" x2="0%" y2="75%" stroke={PLAYER_COLORS[2]} strokeWidth={strokeW} />);
                  }
                  if (r === 10) {
                    // Red Bottom-Right and Right
                    lines.push(<line key="br" x1="100%" y1="75%" x2="50%" y2="100%" stroke={PLAYER_COLORS[2]} strokeWidth={strokeW} />);
                    lines.push(<line key="r" x1="100%" y1="25%" x2="100%" y2="75%" stroke={PLAYER_COLORS[2]} strokeWidth={strokeW} />);
                  }
                  if (c === 0) {
                    // Blue Top-Right and Right
                    lines.push(<line key="tr" x1="50%" y1="0%" x2="100%" y2="25%" stroke={PLAYER_COLORS[1]} strokeWidth={strokeW} />);
                    if (r !== 10) { 
                      lines.push(<line key="r_b" x1="100%" y1="25%" x2="100%" y2="75%" stroke={PLAYER_COLORS[1]} strokeWidth={strokeW} />);
                    }
                  }
                  if (c === 10) {
                    // Blue Bottom-Left and Left
                    lines.push(<line key="bl" x1="50%" y1="100%" x2="0%" y2="75%" stroke={PLAYER_COLORS[1]} strokeWidth={strokeW} />);
                    if (r !== 0) { 
                      lines.push(<line key="l_b" x1="0%" y1="25%" x2="0%" y2="75%" stroke={PLAYER_COLORS[1]} strokeWidth={strokeW} />);
                    }
                  }

                  return (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                      {lines}
                    </svg>
                  );
                })()}
                {(theme === 'pente' || theme.startsWith('baduk')) && (() => {
                   const isBaduk = theme.startsWith('baduk');
                   const size = isBaduk ? (theme === 'baduk-19' ? 19 : (theme === 'baduk-13' ? 13 : 9)) : 15;
                   
                   let isHoshi = false;
                   if (theme === 'pente') {
                       isHoshi = ([3, 11].includes(r) && [3, 11].includes(c)) || (r === 7 && c === 7);
                   } else if (theme === 'baduk-19') {
                       isHoshi = ([3, 9, 15].includes(r) && [3, 9, 15].includes(c));
                   } else if (theme === 'baduk-13') {
                       isHoshi = ([3, 9].includes(r) && [3, 9].includes(c)) || (r === 6 && c === 6);
                   } else if (theme === 'baduk-9') {
                       isHoshi = ([2, 6].includes(r) && [2, 6].includes(c)) || (r === 4 && c === 4);
                   }
                   
                   return (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute top-1/2 h-[1px] ${isBaduk ? 'bg-[#3c4043]' : 'bg-white/[0.15]'} -translate-y-1/2 ${c === 0 ? 'left-1/2 right-0' : c === size - 1 ? 'left-0 right-1/2' : 'left-0 right-0'}`} />
                    <div className={`absolute left-1/2 w-[1px] ${isBaduk ? 'bg-[#3c4043]' : 'bg-white/[0.15]'} -translate-x-1/2 ${r === 0 ? 'top-1/2 bottom-0' : r === size - 1 ? 'top-0 bottom-1/2' : 'top-0 bottom-0'}`} />
                    {isHoshi && (
                      <div className={`absolute top-1/2 left-1/2 w-[15%] h-[15%] ${isBaduk ? 'bg-[#3c4043]' : 'bg-white/40'} rounded-full -translate-x-1/2 -translate-y-1/2`} />
                    )}
                    {isBaduk && (status === 'scoring' || status === 'ended') && territoryMap[`${r},${c}`] && (
                      <div 
                        className={`absolute top-1/2 left-1/2 w-[32%] h-[32%] -translate-x-1/2 -translate-y-1/2 rounded-[2px] shadow-sm z-20 pointer-events-none transition-all ${
                          territoryMap[`${r},${c}`] === (startingPlayerIndex === 0 ? 1 : 2)
                            ? 'bg-neutral-900 border border-neutral-600 ring-1 ring-neutral-400' 
                            : 'bg-neutral-100 border border-neutral-300 ring-1 ring-neutral-200'
                        }`} 
                      />
                    )}
                    {isBaduk && hexZoomCell?.r === r && hexZoomCell?.c === c && isActuallyUserTurn && (
                      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <div 
                          className="w-[90%] h-[90%] rounded-full shadow-2xl transition-all duration-200 animate-pulse border-2 flex items-center justify-center"
                          style={{
                            backgroundColor: currentUserStoneColor,
                            borderColor: currentUserStoneColor === '#212121' ? '#4ade80' : '#10b981',
                            opacity: 0.85,
                            boxShadow: `0 0 16px ${currentUserStoneColor === '#212121' ? 'rgba(74,222,128,0.7)' : 'rgba(16,185,129,0.7)'}, inset -2px -2px 6px rgba(0,0,0,0.4)`
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                        </div>
                        <div className="absolute -inset-1 rounded-full border border-emerald-400/80 animate-ping pointer-events-none opacity-40" />
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            );
          })
        ))}

        {(theme === 'shobu' || theme === 'shobu-scacchiera') && (
          <div
            className="absolute inset-0 pointer-events-none z-[15]"
            style={{ transform: isWallGo3D ? 'translateZ(3.5px)' : undefined }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_6px_rgba(0,0,0,0.8)]">
              <defs>
                <pattern id="rope-pattern" width="2" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
                  <rect width="2" height="4" fill="#c4a45a" />
                  <line x1="0" y1="0" x2="0" y2="4" stroke="#9a7b3c" strokeWidth="0.5" />
                  <line x1="1" y1="0" x2="1" y2="4" stroke="#7a5e27" strokeWidth="0.8" />
                </pattern>
                <pattern id="knot-pattern" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="2" height="2" fill="#c4a45a" />
                  <line x1="0" y1="0" x2="0" y2="2" stroke="#7a5e27" strokeWidth="0.8" />
                </pattern>
                <filter id="rope-shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="black" floodOpacity="0.8" />
                </filter>
                <filter id="inner-shadow">
                  <feOffset dx="0" dy="-0.6"/>
                  <feGaussianBlur stdDeviation="0.4" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood floodColor="black" floodOpacity="0.7" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                </filter>
              </defs>

              {/* Rope body - sags slightly in the middle */}
              <path 
                d="M 6,49.5 Q 50,54 94,49.5" 
                fill="none" 
                stroke="url(#rope-pattern)" 
                strokeWidth="3.5" 
                strokeLinecap="round"
                filter="url(#inner-shadow)"
              />
              
              {/* Left Knot */}
              <ellipse cx="6" cy="49.5" rx="1.8" ry="3.5" fill="url(#knot-pattern)" stroke="#4a3814" strokeWidth="0.3" filter="url(#rope-shadow)" />
              <ellipse cx="7.5" cy="49.5" rx="1.8" ry="3.2" fill="url(#knot-pattern)" stroke="#4a3814" strokeWidth="0.3" filter="url(#rope-shadow)" />
              
              {/* Fringes left */}
              <path d="
                M 5,47.5 Q 2,46.5 0.5,45.5 
                M 5,48.5 Q 1,48 0,47.5 
                M 5,49.5 Q 1,49.5 0,50 
                M 5,50.5 Q 1,51 0.5,52.5
                M 5.5,51.5 Q 2,52.5 1.5,54.5
              " fill="none" stroke="url(#rope-pattern)" strokeWidth="0.5" strokeLinecap="round" filter="url(#rope-shadow)" />

              {/* Right Knot */}
              <ellipse cx="94" cy="49.5" rx="1.8" ry="3.5" fill="url(#knot-pattern)" stroke="#4a3814" strokeWidth="0.3" filter="url(#rope-shadow)" />
              <ellipse cx="92.5" cy="49.5" rx="1.8" ry="3.2" fill="url(#knot-pattern)" stroke="#4a3814" strokeWidth="0.3" filter="url(#rope-shadow)" />

              {/* Fringes right */}
              <path d="
                M 95,47.5 Q 98,46.5 99.5,45.5 
                M 95,48.5 Q 99,48 100,47.5 
                M 95,49.5 Q 99,49.5 100,50 
                M 95,50.5 Q 99,51 99.5,52.5
                M 94.5,51.5 Q 98,52.5 98.5,54.5
              " fill="none" stroke="url(#rope-pattern)" strokeWidth="0.5" strokeLinecap="round" filter="url(#rope-shadow)" />
            </svg>
          </div>
        )}

        {fugaWallPreview && corsaAction === 'wall' && (() => {
          const { r, c, orientation } = fugaWallPreview;
          const cell1 = getPosStyle({r, c});
          
          // Entrambi gli orientamenti hanno il loro centro esattamente all'incrocio di 4 celle
          const topPerc = parseFloat(cell1.top) + hexHeightPerc/2;
          const leftPerc = parseFloat(cell1.left) + hexWidthPerc/2;
          
          return (
            <div 
              onPointerDown={(e) => {
                if (!winner && isActuallyUserTurn) {
                   setIsDraggingFugaWall(true);
                   e.stopPropagation();
                }
              }}
              onClick={(e) => {
                if (!winner && isActuallyUserTurn && onPreviewFugaWall && !isDraggingFugaWall) {
                   const nextOrientation = orientation === 'h' ? 'v' : 'h';
                   onPreviewFugaWall(r, c, nextOrientation);
                   e.stopPropagation();
                }
              }}
              className={`absolute z-[35] transition-all touch-none flex items-center justify-center ${isDraggingFugaWall ? 'pointer-events-none' : 'cursor-pointer animate-pulse hover:scale-105'}`}
              style={{
                top: `${topPerc}%`,
                left: `${leftPerc}%`,
                width: orientation === 'h' ? `${hexWidthPerc * 2}%` : '50px',
                height: orientation === 'h' ? '50px' : `${hexHeightPerc * 2}%`, 
                transform: isWallGo3D ? 'translate(-50%, -50%) translateZ(14px)' : 'translate(-50%, -50%)',
                transformStyle: isWallGo3D ? 'preserve-3d' : undefined,
                backgroundColor: 'transparent',
              }}
            >
               {/* Visual Bounding Box (Riquadro) to indicate it can be moved */}
               <div 
                  className={`absolute inset-0 rounded-xl transition-all duration-200 pointer-events-none border-[3px] border-dashed border-orange-400 bg-orange-500/20 ${isDraggingFugaWall ? 'scale-125' : 'scale-110'}`}
               />
               
               {/* Actual Wall Visual (with 3D extrusion when Quoridor 3D mode is active) */}
               <div 
                  className="relative rounded-full shadow-[0_0_15px_rgba(249,115,22,0.8)] pointer-events-none"
                  style={{
                     width: orientation === 'h' ? '100%' : '8px',
                     height: orientation === 'h' ? '8px' : '100%',
                     backgroundColor: isDraggingFugaWall ? 'rgba(249,115,22, 1)' : 'rgba(249,115,22, 0.8)',
                     transform: isWallGo3D ? 'translateZ(-11.5px)' : undefined,
                     transformStyle: isWallGo3D ? 'preserve-3d' : undefined,
                  }}
               >
                  {isWallGo3D && (() => {
                    const previewWallH = Math.round(24 * Math.min(1, Math.max(0.65, wallGoTiltX / 34)));
                    return (
                      <>
                        {[0.14, 0.28, 0.42, 0.56, 0.70, 0.84, 0.96].map((ratio, idx) => (
                          <div
                            key={idx}
                            className="pointer-events-none"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'rgba(249, 115, 22, 0.85)',
                              transform: `translateZ(${(previewWallH * ratio).toFixed(1)}px)`,
                              borderRadius: '3px',
                            }}
                          />
                        ))}
                        <div
                          className="pointer-events-none"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: '#f97316',
                            transform: `translateZ(${previewWallH}px)`,
                            borderRadius: '3px',
                            border: '1.5px solid rgba(255,255,255,0.9)',
                            boxShadow: '0 0 12px rgba(249,115,22,0.9)',
                          }}
                        />
                      </>
                    );
                  })()}
               </div>

               {/* Rotate Icon Button */}
               {!isDraggingFugaWall && onPreviewFugaWall && (
                  <button
                     className="absolute -top-4 -right-4 w-10 h-10 bg-blue-600 border border-blue-400 rounded-full shadow-lg shadow-blue-900/50 text-white flex items-center justify-center pointer-events-auto cursor-pointer active:scale-95 transition-transform z-40 touch-none"
                     onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (!winner && isActuallyUserTurn) {
                           const nextOrientation = orientation === 'h' ? 'v' : 'h';
                           onPreviewFugaWall(r, c, nextOrientation);
                        }
                     }}
                     onPointerDown={(e) => {
                        e.stopPropagation();
                     }}
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2v6h-6"></path>
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                     </svg>
                  </button>
               )}
            </div>
          );
        })()}

        {/* Natural Elliptical Directional Cast Shadows for Spherical Pieces and 3D Walls in Wall Go 3D */}
        {isWallGo3D && (() => {
          const tiltFactor = Math.min(1, Math.max(0.76, wallGoTiltX / 32));
          // Counter-rotate by -wallGoRotateZ so the shadow always points at -13° in screen space (Left-to-Right +X and slightly Bottom-to-Top -Y, identical to Quarto)
          const shadowAngleDeg = -13 - wallGoRotateZ;
          const shadowAngleRad = (shadowAngleDeg * Math.PI) / 180;
          const pieceRadiusSvg = (pieceWidthPerc * 10) * 0.5;

          // 20% shorter wall shadow to match the 20% lower walls
          const wallShadowLen = pieceRadiusSvg * 1.95 * tiltFactor;
          const sdx = Math.cos(shadowAngleRad) * wallShadowLen;
          const sdy = Math.sin(shadowAngleRad) * wallShadowLen;

          return (
            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none z-[18] overflow-visible"
              style={{ transform: 'translateZ(2.5px)', pointerEvents: 'none' }}
            >
              <defs>
                {/* Ambient occlusion contact shadow directly under the sphere's base */}
                <radialGradient id="wallgo-sphere-ao" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(2, 4, 10, 0.90)" />
                  <stop offset="62%" stopColor="rgba(2, 4, 10, 0.58)" />
                  <stop offset="100%" stopColor="rgba(2, 4, 10, 0)" />
                </radialGradient>
                {/* Natural elliptical cast shadow radial gradient (off-center focal point under the sphere fading smoothly to 0 at the ellipse boundary, needing no SVG filter) */}
                <radialGradient id="wallgo-sphere-cast" cx="50%" cy="50%" r="50%" fx="22%" fy="50%">
                  <stop offset="0%" stopColor="rgba(2, 4, 12, 0.90)" />
                  <stop offset="38%" stopColor="rgba(2, 4, 12, 0.74)" />
                  <stop offset="68%" stopColor="rgba(2, 4, 12, 0.45)" />
                  <stop offset="88%" stopColor="rgba(2, 4, 12, 0.18)" />
                  <stop offset="100%" stopColor="rgba(2, 4, 12, 0)" />
                </radialGradient>
              </defs>

              {/* Wall Directional Cast Shadows (with full wall thickness so horizontal walls cast a realistic band shadow) */}
              {walls.map((w) => {
                if (!w.id.includes('|')) return null;
                const [p1Str, p2Str] = w.id.split('|');
                const [r1, c1] = p1Str.split(',').map(Number);
                const [r2, c2] = p2Str.split(',').map(Number);
                if (!isValidCell(r1, c1, theme) || !isValidCell(r2, c2, theme)) return null;

                const s1 = getPosStyle({ r: r1, c: c1 });
                const s2 = getPosStyle({ r: r2, c: c2 });
                const t1 = parseFloat(s1.top as string);
                const l1 = parseFloat(s1.left as string);
                const t2 = parseFloat(s2.top as string);
                const l2 = parseFloat(s2.left as string);

                const mx = ((l1 + l2) * 0.5) * 10;
                const my = ((t1 + t2) * 0.5) * 10;
                const deltaY = t2 - t1;
                const deltaX = l2 - l1;
                const wallAngleRad = Math.atan2(deltaY, deltaX * boardRatio) + Math.PI / 2;
                const halfWallLen = (wallHeightPerc * 10) * 0.5;

                const ax = mx - Math.cos(wallAngleRad) * halfWallLen;
                const ay = my - Math.sin(wallAngleRad) * halfWallLen;
                const bx = mx + Math.cos(wallAngleRad) * halfWallLen;
                const by = my + Math.sin(wallAngleRad) * halfWallLen;

                const riseProgress = wallRiseTracksRef.current[w.id]?.progress ?? 1;
                const curSdx = sdx * riseProgress;
                const curSdy = sdy * riseProgress;

                return (
                  <g key={`wall-shadow-3d-${w.id}`} opacity={Math.min(1, riseProgress * 1.15).toFixed(2)}>
                    <polygon
                      points={`${ax.toFixed(1)},${ay.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} ${(bx + curSdx).toFixed(1)},${(by + curSdy).toFixed(1)} ${(ax + curSdx).toFixed(1)},${(ay + curSdy).toFixed(1)}`}
                      fill="rgba(2, 4, 12, 0.62)"
                      stroke="rgba(2, 4, 12, 0.42)"
                      strokeWidth="10"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}

              {/* Natural Elliptical Sphere Cast Shadows + Contact Ambient Occlusion gliding in sync with rolling 3D spheres */}
              {players.map((p) =>
                p.positions.map((pos, idx) => {
                  const pieceKey = pos.id || `${p.id}-${idx}`;
                  const track = pieceRollTracksRef.current[pieceKey];
                  const s = track ? { left: `${track.curLeft}%`, top: `${track.curTop}%` } : getPosStyle(pos);
                  const cx = parseFloat(s.left as string) * 10;
                  const cy = parseFloat(s.top as string) * 10;
                  return (
                    <g
                      key={`piece-shadow-3d-${pieceKey}`}
                      transform={`translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${shadowAngleDeg.toFixed(1)})`}
                    >
                      {/* Directional Elliptical Cast Shadow */}
                      <ellipse
                        cx={(pieceRadiusSvg * 0.96 * tiltFactor).toFixed(1)}
                        cy="0"
                        rx={(pieceRadiusSvg * 1.44 * tiltFactor).toFixed(1)}
                        ry={(pieceRadiusSvg * 0.80).toFixed(1)}
                        fill="url(#wallgo-sphere-cast)"
                      />
                      {/* Contact Ambient Occlusion directly under the sphere base */}
                      <ellipse
                        cx={(pieceRadiusSvg * 0.14).toFixed(1)}
                        cy="0"
                        rx={(pieceRadiusSvg * 0.78).toFixed(1)}
                        ry={(pieceRadiusSvg * 0.68).toFixed(1)}
                        fill="url(#wallgo-sphere-ao)"
                      />
                    </g>
                  );
                })
              )}
            </svg>
          );
        })()}

        {walls.map(w => renderWall(w))}

        {renderAbaloneSelection()}

        {players.map((p: Player) => p.positions.map((pos: Point, i: number) => {
          const isAbaloneSelected = gameMode === 'abalone' && abaloneSelectedIndices?.includes(i);
          const isInvalidShobuClick = gameMode === 'shobu' && isActuallyUserTurn && !winner && p.id === currentPlayer?.id && (
            (!shobuState?.passiveMove && ((p.id === 1 && pos.r < 4) || (p.id === 2 && pos.r > 4))) ||
            (shobuState?.passiveMove && ((shobuState.passiveMove.boardColor === 'dark' && pos.c < 4) || (shobuState.passiveMove.boardColor === 'light' && pos.c > 4)))
          );
          const isOpponentLastMove = gameMode === 'pente' && !!penteLastOpponentMove && penteLastOpponentMove.r === pos.r && penteLastOpponentMove.c === pos.c;
          const pieceKey = pos.id || `${p.id}-${i}`;
          const rollTrack = pieceRollTracksRef.current[pieceKey];

          return (
          <Piece 
            key={pieceKey}
            player={p} pos={pos} idx={i}
            isOpponentLastMove={isOpponentLastMove}
            startingPlayerIndex={startingPlayerIndex}
            isSelected={
              (p.id === currentPlayer?.id && (isAbaloneSelected || selectedPieceIndex === i || (gameMode==='corsa' && corsaAction==='move'))) ||
              (gameMode === 'orbito' && orbitoActionState?.playerId === p.id && orbitoActionState?.pieceIdx === i)
            }
            isClickable={!!(isActuallyUserTurn && !winner && (
              (p.id === currentPlayer?.id && turnPhase === 'moving' && gameMode !== 'corsa' && gameMode !== 'domineering' && !isInvalidShobuClick) || 
              (gameMode === 'orbito' && orbitoPhase === 'shift' && p.id !== currentPlayer?.id) ||
              (p.id === currentPlayer?.id && turnPhase === 'walling' && (gameMode === 'dominio' || gameMode === 'amazons') && selectedPieceIndex === i)
            ))}
            onRevertMove={onRevertMove}
            isInvalidShobu={isInvalidShobuClick}
            onInvalidShobuClick={() => {
              if (onInvalidShobuClick) onInvalidShobuClick();
            }}
            isLockedByRule={gameMode === 'shobu' && p.id === currentPlayer?.id && getReachableCells(pos, walls, players, 2, theme, gameMode, shobuState?.passiveMove).length === 0}
            isShobuActiveValid={!!(gameMode === 'shobu' && shobuState?.passiveMove && p.id === currentPlayer?.id && !isInvalidShobuClick && getReachableCells(pos, walls, players, 2, theme, gameMode, shobuState?.passiveMove).length > 0)}
            onSelectPiece={(selectedIdx, isDragging) => {
              if (gameMode === 'orbito' && p.id !== currentPlayer?.id) {
                onSelectOpponentPiece?.(p.id, i);
              } else {
                onSelectPiece(selectedIdx, isDragging);
              }
            }}
            onPointerDownPiece={(clickIdx) => {
              setIsDraggingAbalone(true);
              onSelectPiece(i, false);
            }}
            onPointerEnterPiece={(i) => {
              if (isDraggingAbalone) {
                if (!abaloneSelectedIndices?.includes(i)) {
                  onSelectPiece(i, true);
                }
              }
            }}
            onMove={onMove}
            turnPhase={turnPhase}
            hasPossibleMoves={gameMode === 'domineering' || gameMode === 'baduk' || (gameMode === 'abalone' && abaloneSelectedIndices && abaloneSelectedIndices.includes(i)) ? true : (p.id !== currentPlayer?.id ? true : (gameMode === 'dominio' ? (getReachableCells(pos, walls, players, 2, theme, gameMode).length > 1 || getWallOptions(pos, walls, theme, players, gameMode).length > 0) : getReachableCells(pos, walls, players, theme.startsWith('amazons') ? Infinity : 2, theme, gameMode, shobuState?.passiveMove).length > 0))}
            isHex={isHex}
            getPosStyle={getPosStyle}
            pieceWidthPerc={pieceWidthPerc}
            boardRatio={boardRatio}
            canStay={!gameMode?.startsWith('amazons') && gameMode !== 'shobu' && (gameMode !== 'dominio' || getWallOptions(pos, walls, theme, players, gameMode).length > 0)}
            gameMode={gameMode}
            badukStoneColor={badukStoneColor}
            isDeadBadukStone={gameMode === 'baduk' && (status === 'scoring' || status === 'ended') && badukDeadStones.includes(`${pos.r},${pos.c}`)}
            onToggleDeadStone={(gameMode === 'baduk' && status === 'scoring') ? () => onToggleBadukDeadStone?.(pos.r, pos.c) : undefined}
            isWinningPiece={winningLine?.some((pt: Point) => pt.r === pos.r && pt.c === pos.c)}
            isThreatPiece={threatLines?.some(line => line.some(pt => pt.r === pos.r && pt.c === pos.c))}
            isWallGo3D={isWallGo3D}
            boardTiltX={wallGoTiltX}
            boardRotateZ={wallGoRotateZ}
            wasBoardDraggedRef={wasBoardDraggedRef}
            animatedPosStyle={isWallGo3D && rollTrack ? { top: `${rollTrack.curTop}%`, left: `${rollTrack.curLeft}%` } : undefined}
            rollAngleDeg={rollTrack?.curRollDeg ?? 0}
            moveAngleBoardDeg={rollTrack?.moveAngleBoardDeg ?? 0}
            isRolling3D={rollTrack?.isRolling ?? false}
          />
        )}))}

        {pushedMarbles?.map(m => {
          const dx = m.r - 4;
          const dy = m.c - 4;
          const dirX = dx === 0 && dy === 0 ? 1 : dx;
          const dirY = dx === 0 && dy === 0 ? 1 : dy;
          const len = Math.sqrt(dirX*dirX + dirY*dirY);
          const pushX = (dirX/len) * 300;
          const pushY = (dirY/len) * 300;
          
          return (
          <div
            key={m.id}
            className="absolute rounded-full pointer-events-none z-50 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
            style={{
              ...getPosStyle({r: m.r, c: m.c}),
              width: `${pieceWidthPerc}%`,
              height: `${pieceWidthPerc * boardRatio}%`,
              backgroundImage: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 20%, transparent 50%), radial-gradient(circle at 50% 50%, ${m.color} 0%, ${m.color} 70%, rgba(0,0,0,0.4) 100%)`,
              backgroundColor: m.color,
              boxShadow: `0 20px 25px -5px ${m.color}80, 0 8px 10px -6px ${m.color}80`,
              ['--push-x' as string]: `${pushX}px`,
              ['--push-y' as string]: `${pushY}px`,
              animation: 'rollOffBoard 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
            }}
          >
            <div className="absolute inset-0 rounded-full border-2 border-white/30" />
            <style>{`
              @keyframes rollOffBoard {
                0% { transform: translate(-50%, -50%) scale(1) translate(0px, 0px) rotate(0deg); opacity: 1; filter: brightness(1) drop-shadow(0 0 10px ${m.color}); }
                70% { transform: translate(-50%, -50%) scale(0.6) translate(var(--push-x), var(--push-y)) rotate(720deg); opacity: 0.8; filter: brightness(0.8); }
                100% { transform: translate(-50%, -50%) scale(0) translate(calc(var(--push-x) * 1.5), calc(var(--push-y) * 1.5)) rotate(1080deg); opacity: 0; display: none; }
              }
            `}</style>
          </div>
        )})}

        {penteDyingPieces?.map(m => {
          return (
          <div
            key={`dying-${m.id}-${m.t}`}
            className="absolute rounded-full pointer-events-none z-50 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 animate-penteShrink"
            style={{
              ...getPosStyle({r: m.r, c: m.c}),
              width: `${pieceWidthPerc}%`,
              height: `${pieceWidthPerc * boardRatio}%`,
              backgroundImage: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 20%, transparent 50%), radial-gradient(circle at 50% 50%, ${m.color} 0%, ${m.color} 70%, rgba(0,0,0,0.4) 100%)`,
              backgroundColor: m.color,
              boxShadow: `0 10px 20px rgba(0,0,0,0.5), 0 0 12px ${m.color}44, inset -2px -2px 6px rgba(0,0,0,0.4)`
            }}
          >
            <div className="absolute inset-0 rounded-full border border-white/30" />
            <div className="absolute top-[12%] left-[12%] w-[25%] h-[25%] bg-white/30 rounded-full blur-[1px] pointer-events-none" />
          </div>
        )})}

        {!winner && possibleMoves.length > 0 && possibleMoves.map((m: any, idx) => {
          const getAbalonePushRotation = (du: number, dv: number) => {
            if (du === 2 && dv === 0) return 0;
            if (du === -2 && dv === 0) return 180;
            if (du === 1 && dv === -1) return -60;
            if (du === -1 && dv === -1) return -120;
            if (du === 1 && dv === 1) return 60;
            if (du === -1 && dv === 1) return 120;
            return 0;
          };
          const rotation = m.isAbaloneMove ? getAbalonePushRotation(m.du, m.dv) : 0;
          return (
          <div 
            key={`mv-${idx}`} 
            className={`absolute ${isWallGo3D ? '' : '-translate-x-1/2 -translate-y-1/2'} z-[100] ${m.isAbaloneMove || isWallGo3D ? 'cursor-pointer pointer-events-auto active:scale-95' : 'pointer-events-none'} flex items-center justify-center`} 
            style={{ 
              ...getPosStyle(m),
              width: `${pieceWidthPerc}%`,
              height: `${pieceWidthPerc * boardRatio}%`,
              transform: isWallGo3D ? 'translate(-50%, -50%) translateZ(14px)' : undefined,
              clipPath: m.isAbaloneMove ? 'circle(50% at 50% 50%)' : 'none'
            }} 
            onClick={(e) => {
              if ((m.isAbaloneMove || isWallGo3D) && isActuallyUserTurn && !winner && !wasBoardDraggedRef.current) {
                e.stopPropagation();
                onMove(m);
              }
            }}
          >
            {m.isPush ? (
              <div 
                className="w-full h-full flex items-center justify-center animate-pulse opacity-100 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] bg-red-500/30 rounded-full border border-red-400/50 hover:bg-red-500/50 transition-colors pointer-events-none"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <div className="w-full h-full absolute -z-10 rounded-full border-[3px] border-dashed border-red-500 animate-[spin_4s_linear_infinite] opacity-80 pointer-events-none" />
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-[60%] h-[60%] drop-shadow-md z-10 relative ml-1">
                   <path d="M4 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            ) : m.isAbaloneMove ? (
              <div 
                className="w-full h-full flex items-center justify-center animate-pulse opacity-90 drop-shadow-[0_0_12px_rgba(96,165,250,1)] bg-blue-400/30 rounded-full border border-blue-400/50 hover:bg-blue-400/50 transition-colors pointer-events-none"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <div className="absolute inset-0 bg-blue-400/10 rounded-full pointer-events-none" />
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-[60%] h-[60%] drop-shadow-md z-10 relative ml-1">
                  <path d="m13 17 5-5-5-5M6 17l5-5-5-5"/>
                </svg>
              </div>
            ) : (
              <div className="w-[20%] h-[20%] bg-blue-400 rounded-full border border-white shadow-[0_0_10px_#60a5fa] animate-pulse pointer-events-none" />
            )}
          </div>
        )})}

        {!winner && wallOptions.length > 0 && wallOptions.map((w, idx) => (
          <div
            key={`wl-${idx}`}
            onClick={(e) => {
              e.stopPropagation();
              if (wasBoardDraggedRef.current) return;
              if (isActuallyUserTurn && !winner) onPlaceWall(w.r, w.c);
            }}
            className={`absolute w-[11%] h-[11%] ${isWallGo3D ? '' : '-translate-x-1/2 -translate-y-1/2'} z-[100] pointer-events-auto cursor-pointer flex items-center justify-center`}
            style={{
              ...getPosStyle(w),
              transform: isWallGo3D ? 'translate(-50%, -50%) translateZ(14px)' : undefined,
            }}
          >
            <div className="w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-[0_0_15px_#34d399] animate-bounce pointer-events-none" />
          </div>
        ))}

        {/* Tactical Suggestions */}
        {!winner && suggestedMove && (
          <div
            className={`absolute w-[10%] h-[10%] ${isWallGo3D ? '' : '-translate-x-1/2 -translate-y-1/2'} z-[150] pointer-events-none flex items-center justify-center`}
            style={{
              ...getPosStyle(suggestedMove),
              transform: isWallGo3D ? 'translate(-50%, -50%) translateZ(14px)' : undefined,
            }}
          >
            <div className="w-4 h-4 bg-blue-400 rounded-full shadow-[0_0_15px_#60a5fa] animate-ping" />
            <div className="absolute w-2 h-2 bg-white rounded-full" />
          </div>
        )}

        {!winner && suggestedWall && (() => {
          const piecePos = suggestedMove || (selectedPieceIndex !== null ? currentPlayer.positions[selectedPieceIndex] : null);
          if (!piecePos) return null;
          
          const s1 = getPosStyle(piecePos);
          const s2 = getPosStyle(suggestedWall);
          const t1 = parseFloat(s1.top);
          const l1 = parseFloat(s1.left);
          const t2 = parseFloat(s2.top);
          const l2 = parseFloat(s2.left);
          const midTop = (t1 + t2) / 2;
          const midLeft = (l1 + l2) / 2;
          const angle = Math.atan2(t2 - t1, (l2 - l1) * boardRatio) * (180 / Math.PI);
          
          return (
            <div 
              className="absolute z-[150] rounded-full animate-pulse pointer-events-none"
              style={{
                top: `${midTop}%`,
                left: `${midLeft}%`,
                width: '8px',
                height: `${wallHeightPerc}%`, 
                backgroundColor: '#34d399',
                transform: isWallGo3D ? `translate(-50%, -50%) rotate(${angle}deg) translateZ(14px)` : `translate(-50%, -50%) rotate(${angle}deg)`,
                boxShadow: '0 0 20px #34d399, 0 0 10px white, 0 0 40px #34d399',
                border: '2px solid white'
              }}
            />
          );
        })()}

        {/* AI Trace for Amazons */}
        {aiTrace && (() => {
          const s1 = getPosStyle(aiTrace.from);
          const s2 = getPosStyle(aiTrace.to);
          const t1 = parseFloat(s1.top);
          const l1 = parseFloat(s1.left);
          const t2 = parseFloat(s2.top);
          const l2 = parseFloat(s2.left);
          
          const deltaY = t2 - t1;
          const deltaX = l2 - l1;
          const angle = Math.atan2(deltaY, deltaX * boardRatio) * (180 / Math.PI);
          
          // Calculate length using Pythagorean theorem, compensating for boardRatio
          const length = Math.sqrt(Math.pow(deltaX * boardRatio, 2) + Math.pow(deltaY, 2));
          const traceZ = isWallGo3D ? 'translateZ(6px) ' : '';

          return (
            <div 
              className="absolute z-[160] rounded-full pointer-events-none"
              style={{
                top: `${t1}%`,
                left: `${l1}%`,
                width: `${length}%`,
                height: '4px',
                backgroundColor: PLAYER_COLORS[players[currentPlayerIndex].id],
                transform: `${traceZ}rotate(${angle}deg)`,
                transformOrigin: '0 50%',
                boxShadow: `0 0 15px ${PLAYER_COLORS[players[currentPlayerIndex].id]}`,
                opacity: 0.8,
                animation: 'aiTraceAnim 0.6s ease-out forwards'
              }}
            >
              <style>{`
                @keyframes aiTraceAnim {
                  0% { opacity: 1; transform: ${traceZ}rotate(${angle}deg) scaleX(0); }
                  20% { opacity: 1; transform: ${traceZ}rotate(${angle}deg) scaleX(1); }
                  80% { opacity: 1; transform: ${traceZ}rotate(${angle}deg) scaleX(1); }
                  100% { opacity: 0; transform: ${traceZ}rotate(${angle}deg) scaleX(1); }
                }
              `}</style>
            </div>
          );
        })()}

        {/* Wall Breaker Overlay */}
        {isWallBreakingMode && isActuallyUserTurn && !winner && isSelectedPieceEnclosed && players[currentPlayerIndex].positions.map((p: Point, i: number) => {
          if (i !== selectedPieceIndex) return null;
          const neighbors = getNeighbors(p.r, p.c, theme);
          
          return neighbors.map(([nr, nc], idx) => {
            if (isValidCell(nr, nc, theme) && getWallBetween(walls, p.r, p.c, nr, nc)) {
                const s2 = getPosStyle({r: nr, c: nc});
                const stylePos = getPosStyle(p);
                const top = (parseFloat(stylePos.top) + parseFloat(s2.top)) / 2;
                const left = (parseFloat(stylePos.left) + parseFloat(s2.left)) / 2;

                return (
                    <div key={`break-${idx}`} onClick={() => onBreakWall?.(p.r, p.c, {nr, nc})} className={`absolute ${isHex ? 'w-3.5 h-3.5 text-[7px] border' : 'w-8 h-8 text-base border-2'} bg-red-600 rounded-full border-white shadow-xl flex items-center justify-center z-[120] cursor-pointer -translate-x-1/2 -translate-y-1/2 active:scale-90 transition-transform animate-pulse`}
                      style={{
                        top: `${top}%`,
                        left: `${left}%`,
                      }}
                    >🔨</div>
                );
            }
            return null;
          });
        })}
      </div>
      {hexZoomCell && portalTarget && createPortal(
        <button 
          onClick={(e) => { e.stopPropagation(); setHexZoomCell(null); setPanOffset({ x: 0, y: 0 }); }}
          className={portalTarget.id === 'bottom-action-buttons' 
            ? "flex-1 min-w-[110px] max-w-[150px] py-2.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl font-black text-[10px] uppercase tracking-tight active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5"
            : "bg-purple-600/90 text-white px-6 py-4 rounded-full font-black text-lg tracking-widest uppercase shadow-[0_0_30px_rgba(168,85,247,0.8)] border-2 border-purple-400 cursor-pointer flex items-center gap-3 active:scale-95"}
          style={portalTarget.id === 'bottom-action-buttons' ? {} : { position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999 }}
        >
          <span className={portalTarget.id === 'bottom-action-buttons' ? "text-sm" : "text-2xl"}>🔍</span> ZOOM OUT
        </button>,
        portalTarget
      )}
    </div>
    </>
  );
};

export default Board;
