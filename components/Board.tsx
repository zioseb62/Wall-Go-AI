
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
}

const Piece: React.FC<PieceProps> = ({ 
  player, pos, idx, isSelected, isClickable, isInvalidShobu, onInvalidShobuClick, isLockedByRule,
  onSelectPiece, onMove, turnPhase, hasPossibleMoves, isHex, getPosStyle, pieceWidthPerc, boardRatio, canStay,
  gameMode, onPointerEnterPiece, onPointerDownPiece, onSelectOpponentPiece, isWinningPiece, isThreatPiece, isShobuActiveValid, onRevertMove, badukStoneColor = "classic", startingPlayerIndex = 0,
  isDeadBadukStone, onToggleDeadStone, isOpponentLastMove
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

  const isActuallyLocked = !hasPossibleMoves && !player.hasWallbreaker && gameMode !== 'shobu';

  const derivedColor = (gameMode === 'baduk' && badukStoneColor === 'classic') 
    ? (player.id === (startingPlayerIndex === 0 ? 1 : 2) ? '#212121' : '#f8f9fa') 
    : player.color;

  return (
    <div
      className={`
        absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 touch-none select-none pointer-events-none
        transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)
        ${pos.isNewAi ? 'animate-penteGrow' : ''}
        ${isWinningPiece ? `scale-125 z-[60] ring-4 ring-yellow-400 ${gameMode !== 'baduk' ? 'animate-pulse' : ''}` : (isThreatPiece ? `z-[55] ring-4 ring-orange-500 ${gameMode !== 'baduk' ? 'animate-threatPulse' : ''}` : (isSelected ? (gameMode === 'abalone' ? 'z-50' : 'scale-125 z-50 ring-4 ring-white/40') : (isOpponentLastMove ? 'z-50 scale-105' : 'z-40 scale-100')))}
        ${isShobuActiveValid && !isSelected ? `ring-2 ring-emerald-400 ${gameMode !== 'baduk' ? 'animate-pulse' : ''}` : ''}
        ${isDeadBadukStone ? 'opacity-35 grayscale saturate-0 scale-95' : (isActuallyLocked && !isSelected && !isWinningPiece && !isThreatPiece ? 'opacity-40 grayscale saturate-[0.2]' : 'opacity-100')}
        ${isMoving ? 'brightness-150' : ''} 
        ${turnPhase === 'setup' && gameMode !== 'pente' && gameMode !== 'hex' && gameMode !== 'baduk' ? 'animate-pulse' : ''}
        ${isClickable && !isLockedByRule ? 'active:scale-95' : ''}
      `}
      style={{
        ...getPosStyle(pos),
        width: `${pieceWidthPerc}%`,
        height: `${pieceWidthPerc * boardRatio}%`, 
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 20%, transparent 50%), radial-gradient(circle at 50% 50%, ${derivedColor} 0%, ${derivedColor} 70%, rgba(0,0,0,0.4) 100%)`,
        backgroundColor: derivedColor,
        boxShadow: isWinningPiece ? `0 0 50px ${derivedColor}, 0 0 20px yellow, inset -2px -2px 8px rgba(0,0,0,0.5)` : (isThreatPiece ? `0 0 40px ${derivedColor}, 0 0 15px orange, inset -2px -2px 8px rgba(0,0,0,0.5)` : (isSelected ? `0 0 35px ${derivedColor}, 0 0 15px white, inset -2px -2px 8px rgba(0,0,0,0.5)` : `0 10px 20px rgba(0,0,0,0.5), 0 0 12px ${derivedColor}44, inset -2px -2px 6px rgba(0,0,0,0.4)`)),
        border: turnPhase === 'setup' ? '2px solid white' : 'none'
      }}
    >
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
              if (turnPhase === 'walling' && gameMode === 'dominio') {
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
      <div className="absolute top-[12%] left-[12%] w-[25%] h-[25%] bg-white/30 rounded-full blur-[1px] pointer-events-none" />
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

    return (
      <div 
        key={w.id}
        className="absolute z-20 rounded-full"
        style={{
          top: `${midTop}%`,
          left: `${midLeft}%`,
          width: isHex ? '6px' : '6px',
          height: `${wallHeightPerc}%`, 
          backgroundColor: PLAYER_COLORS[w.ownerId],
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          boxShadow: isHex 
            ? `0 0 5px ${PLAYER_COLORS[w.ownerId]}, inset 0 0 4px rgba(0,0,0,0.5)` 
            : `0 0 10px ${PLAYER_COLORS[w.ownerId]}`,
          border: isHex ? '1px solid rgba(255,255,255,0.4)' : 'none',
          borderRadius: '2px'
        }}
      />
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
      const pId = players.find(p => p.positions.some(pos => pos.r === r && pos.c === c))?.id;
      if (pId) return `${PLAYER_COLORS[pId]}`; // Solid color for hex cells occupied by players
    }

    if (gameMode !== 'pente' && gameMode !== 'orbito' && gameMode !== 'abalone' && gameMode !== 'hex' && gameMode !== 'corsa') {
      const ownerId = territoryMap[`${r},${c}`];
      if (ownerId) return `${PLAYER_COLORS[ownerId]}80`;
    }
    
    if (theme.startsWith('abalone')) return 'rgba(0,0,0,0.6)';
    if (theme.startsWith('baduk')) return 'transparent'; // Let the background of boardBgClass shine through for the cells
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
    <div 
      onPointerDown={(e) => {
        if (hexZoomCell && e.isPrimary) {
          setIsPanning(true);
          setLastPanPos({ x: e.clientX, y: e.clientY });
          setHasPanned(false);
        }
      }}
      onPointerUp={() => { 
        setIsDraggingFugaWall(false); setIsDraggingAbalone(false); 
        setIsPanning(false);
        setTimeout(() => setHasPanned(false), 50);
      }}
      onPointerLeave={(e) => { 
        if (e.pointerType === 'mouse') {
          setIsDraggingFugaWall(false); setIsDraggingAbalone(false); 
        }
        setIsPanning(false);
      }}
      onPointerMove={(e) => {
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
        if (hasPanned) return;
        if (gameMode === 'hex' || gameMode === 'pente' || gameMode === 'baduk') {
          setHexZoomCell(null);
          setPanOffset({ x: 0, y: 0 });
        }
      }}
      className={`relative p-0.5 shadow-[0_0_50px_rgba(0,0,0,0.7)] mx-auto select-none shrink-0 ${boardBgClass} ${className || ''} ${theme.startsWith('abalone') ? 'touch-none' : 'rounded-[1.5rem] border-[2px] border-[#fef08a]'} ${gameMode === 'corsa' || gameMode === 'hex' || gameMode === 'pente' || gameMode === 'baduk' ? 'touch-none' : ''} ${hasPanned || isPanning ? 'transition-none' : 'transition-all duration-300 ease-in-out'}`} 
      style={{ 
        width: '100%',
        height: '100%',
        maxHeight: `min(100cqh, calc(100cqw / ${boardRatio}))`,
        maxWidth: `min(100cqw, calc(100cqh * ${boardRatio}), ${theme === 'desert' ? '1400px' : '550px'})`,
        clipPath: theme.startsWith('abalone') ? 'polygon(22% 0%, 78% 0%, 100% 50%, 78% 100%, 22% 100%, 0% 50%)' : 'none',
        aspectRatio: `${boardRatio}/1`,
        ...getZoomStyle(),
        ...style
      }}
    >
      <div 
        className="relative w-full h-full"
        onPointerMove={(e) => {
          if (!isDraggingFugaWall || !onPreviewFugaWall || gameMode !== 'corsa' || corsaAction !== 'wall') return;
          // Su mobile onPointerEnter non parte durante il drag. Usiamo elementFromPoint
          const touch = e;
          const el = document.elementFromPoint(touch.clientX, touch.clientY);
          if (el) {
             const rStr = el.getAttribute('data-r');
             const cStr = el.getAttribute('data-c');
             if (rStr !== null && cStr !== null) {
                const hoverR = parseInt(rStr, 10);
                const hoverC = parseInt(cStr, 10);
                if (hoverR < GRID_SIZE - 1 && hoverC < GRID_SIZE - 1) {
                   onPreviewFugaWall(hoverR, hoverC, fugaWallPreview?.orientation || 'h');
                }
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
              <div className={`absolute top-[0%] left-[0%] w-[44.44%] h-[44.44%] ${theme === 'shobu' ? 'bg-[#a27448] border-[#6b2c2c]' : 'bg-[#334155] border-[#1e293b]'} border-[4px] rounded-tl-[2.2rem] rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${hlTL ? 'border-amber-300 animate-pulse z-10 shadow-[0_0_15px_rgba(252,211,77,0.6)]' : ''}`} />
              
              {/* Light Board Top-Right */}
              <div className={`absolute top-[0%] right-[0%] w-[44.44%] h-[44.44%] ${theme === 'shobu' ? 'bg-[#e8cda6] border-[#c4a476]' : 'bg-[#f1f5f9] border-[#cbd5e1]'} border-[4px] rounded-tr-[2.2rem] rounded-tl-xl rounded-bl-xl rounded-br-xl overflow-hidden transition-all duration-300 ${hlTR ? 'border-amber-400 animate-pulse z-10 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'shadow-[inset_0_0_40px_rgba(0,0,0,0.15)]'}`}>
                 <div className={`absolute inset-0 opacity-20 ${theme === 'shobu' ? 'bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(0,0,0,0.05)_20px,rgba(0,0,0,0.05)_40px)]' : ''}`} />
              </div>
              
              {/* Dark Board Bottom-Left */}
              <div className={`absolute bottom-[0%] left-[0%] w-[44.44%] h-[44.44%] ${theme === 'shobu' ? 'bg-[#a27448] border-[#6b2c2c]' : 'bg-[#334155] border-[#1e293b]'} border-[4px] rounded-bl-[2.2rem] rounded-tl-xl rounded-br-xl rounded-tr-xl shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${hlBL ? 'border-amber-300 animate-pulse z-10 shadow-[0_0_15px_rgba(252,211,77,0.6)]' : ''}`} />
              
              {/* Light Board Bottom-Right */}
              <div className={`absolute bottom-[0%] right-[0%] w-[44.44%] h-[44.44%] ${theme === 'shobu' ? 'bg-[#e8cda6] border-[#c4a476]' : 'bg-[#f1f5f9] border-[#cbd5e1]'} border-[4px] rounded-br-[2.2rem] rounded-tr-xl rounded-bl-xl rounded-tl-xl overflow-hidden transition-all duration-300 ${hlBR ? 'border-amber-400 animate-pulse z-10 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'shadow-[inset_0_0_40px_rgba(0,0,0,0.15)]'}`}>
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
                    if (r < GRID_SIZE - 1 && c < GRID_SIZE - 1) {
                      onPreviewFugaWall(r, c, fugaWallPreview?.orientation || 'h');
                    }
                  }
                }}
                onPointerEnter={(e) => {
                  if (isDraggingFugaWall && gameMode === 'corsa' && corsaAction === 'wall' && onPreviewFugaWall && !winner && isActuallyUserTurn) {
                    if (r < GRID_SIZE - 1 && c < GRID_SIZE - 1) {
                      onPreviewFugaWall(r, c, fugaWallPreview?.orientation || 'h');
                    }
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasPanned) return;
                  if (!isActuallyUserTurn || winner) return;

                  if (gameMode === 'hex' || gameMode === 'pente' || gameMode === 'baduk') {
                    const isOccupied = players.some(p => p.positions.some(pos => pos.r === r && pos.c === c));
                    if (isOccupied) return;

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
                    // Cliccando sulla stessa casella ruota il muro (se non stavamo solo trascinando)
                    if (fugaWallPreview?.r === r && fugaWallPreview?.c === c) {
                      const nextOrientation = fugaWallPreview.orientation === 'h' ? 'v' : 'h';
                      if (r < GRID_SIZE - 1 && c < GRID_SIZE - 1) {
                        onPreviewFugaWall(r, c, nextOrientation);
                      }
                    } else {
                      onSelectPiece(null);
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
                className={`absolute flex items-center justify-center transition-all duration-500 overflow-hidden cursor-pointer active:scale-95 hover:brightness-125 z-10 touch-none`}
                style={{
                  ...style,
                  width: theme.startsWith('abalone') ? `${pieceWidthPerc}%` : `${hexWidthPerc}%`,
                  height: theme.startsWith('abalone') ? `${pieceWidthPerc * boardRatio}%` : `${hexHeightPerc}%`,
                  transform: 'translate(-50%, -50%)',
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
          <div className="absolute inset-0 pointer-events-none z-[15]">
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
              className={`absolute z-[35] transition-all touch-none flex items-center justify-center ${isDraggingFugaWall ? 'pointer-events-none' : 'cursor-grab animate-pulse hover:scale-105'}`}
              style={{
                top: `${topPerc}%`,
                left: `${leftPerc}%`,
                width: orientation === 'h' ? `${hexWidthPerc * 2}%` : '50px',
                height: orientation === 'h' ? '50px' : `${hexHeightPerc * 2}%`, 
                transform: `translate(-50%, -50%)`,
                backgroundColor: 'transparent',
              }}
            >
               {/* Visual Bounding Box (Riquadro) to indicate it can be moved */}
               <div 
                  className={`absolute inset-0 rounded-xl transition-all duration-200 pointer-events-none border-[3px] border-dashed border-orange-400 bg-orange-500/20 ${isDraggingFugaWall ? 'scale-125' : 'scale-110'}`}
               />
               
               {/* Actual Wall Visual */}
               <div 
                  className="rounded-full shadow-[0_0_15px_rgba(249,115,22,0.8)] pointer-events-none"
                  style={{
                     width: orientation === 'h' ? '100%' : '8px',
                     height: orientation === 'h' ? '8px' : '100%',
                     backgroundColor: isDraggingFugaWall ? 'rgba(249,115,22, 1)' : 'rgba(249,115,22, 0.8)',
                  }}
               />

               {/* Rotate Icon Button */}
               {!isDraggingFugaWall && onPreviewFugaWall && (
                  <button
                     className="absolute -top-4 -right-4 w-10 h-10 bg-blue-600 border border-blue-400 rounded-full shadow-lg shadow-blue-900/50 text-white flex items-center justify-center pointer-events-auto active:scale-95 transition-transform z-40 touch-none"
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

        {walls.map(w => renderWall(w))}

        {renderAbaloneSelection()}

        {players.map((p: Player) => p.positions.map((pos: Point, i: number) => {
          const isAbaloneSelected = gameMode === 'abalone' && abaloneSelectedIndices?.includes(i);
          const isInvalidShobuClick = gameMode === 'shobu' && isActuallyUserTurn && !winner && p.id === currentPlayer?.id && (
            (!shobuState?.passiveMove && ((p.id === 1 && pos.r < 4) || (p.id === 2 && pos.r > 4))) ||
            (shobuState?.passiveMove && ((shobuState.passiveMove.boardColor === 'dark' && pos.c < 4) || (shobuState.passiveMove.boardColor === 'light' && pos.c > 4)))
          );
          const isOpponentLastMove = gameMode === 'pente' && !!penteLastOpponentMove && penteLastOpponentMove.r === pos.r && penteLastOpponentMove.c === pos.c;

          return (
          <Piece 
            key={pos.id || `${p.id}-${i}`}
            player={p} pos={pos} idx={i}
            isOpponentLastMove={isOpponentLastMove}
            startingPlayerIndex={startingPlayerIndex}
            isSelected={
              (p.id === currentPlayer?.id && (isAbaloneSelected || selectedPieceIndex === i || (gameMode==='corsa' && corsaAction==='move'))) ||
              (gameMode === 'orbito' && orbitoActionState?.playerId === p.id && orbitoActionState?.pieceIdx === i)
            }
            isClickable={!!(isActuallyUserTurn && !winner && (
              (p.id === currentPlayer?.id && turnPhase === 'moving' && gameMode !== 'corsa' && !isInvalidShobuClick) || 
              (gameMode === 'orbito' && orbitoPhase === 'shift' && p.id !== currentPlayer?.id) ||
              (p.id === currentPlayer?.id && turnPhase === 'walling' && gameMode === 'dominio' && selectedPieceIndex === i)
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
            hasPossibleMoves={(gameMode === 'abalone' && abaloneSelectedIndices && abaloneSelectedIndices.includes(i)) ? true : (p.id !== currentPlayer?.id ? true : getReachableCells(pos, walls, players, theme.startsWith('amazons') ? Infinity : 2, theme, gameMode, shobuState?.passiveMove).length > 0)}
            isHex={isHex}
            getPosStyle={getPosStyle}
            pieceWidthPerc={pieceWidthPerc}
            boardRatio={boardRatio}
            canStay={!gameMode?.startsWith('amazons') && gameMode !== 'shobu'}
            gameMode={gameMode}
            badukStoneColor={badukStoneColor}
            isDeadBadukStone={gameMode === 'baduk' && (status === 'scoring' || status === 'ended') && badukDeadStones.includes(`${pos.r},${pos.c}`)}
            onToggleDeadStone={(gameMode === 'baduk' && status === 'scoring') ? () => onToggleBadukDeadStone?.(pos.r, pos.c) : undefined}
            isWinningPiece={winningLine?.some((pt: Point) => pt.r === pos.r && pt.c === pos.c)}
            isThreatPiece={threatLines?.some(line => line.some(pt => pt.r === pos.r && pt.c === pos.c))}
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
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 20%, transparent 50%), radial-gradient(circle at 50% 50%, ${m.color} 0%, ${m.color} 70%, rgba(0,0,0,0.4) 100%)`,
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
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 20%, transparent 50%), radial-gradient(circle at 50% 50%, ${m.color} 0%, ${m.color} 70%, rgba(0,0,0,0.4) 100%)`,
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
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-[100] ${m.isAbaloneMove ? 'cursor-pointer pointer-events-auto active:scale-95' : 'pointer-events-none'} flex items-center justify-center`} 
            style={{ 
              ...getPosStyle(m),
              width: `${pieceWidthPerc}%`,
              height: `${pieceWidthPerc * boardRatio}%`,
              clipPath: m.isAbaloneMove ? 'circle(50% at 50% 50%)' : 'none'
            }} 
            onClick={() => { if (m.isAbaloneMove && isActuallyUserTurn) onMove(m); }}
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
              <div className="w-[20%] h-[20%] bg-blue-400 rounded-full border border-white shadow-[0_0_10px_#60a5fa] animate-pulse" />
            )}
          </div>
        )})}

        {!winner && wallOptions.length > 0 && wallOptions.map((w, idx) => (
          <div key={`wl-${idx}`} className="absolute w-[11%] h-[11%] -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none flex items-center justify-center" style={getPosStyle(w)}>
            <div className="w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-[0_0_15px_#34d399] animate-bounce" />
          </div>
        ))}

        {/* Tactical Suggestions */}
        {!winner && suggestedMove && (
          <div className="absolute w-[10%] h-[10%] -translate-x-1/2 -translate-y-1/2 z-[150] pointer-events-none flex items-center justify-center" style={getPosStyle(suggestedMove)}>
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
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
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

          return (
            <div 
              className="absolute z-[160] rounded-full pointer-events-none"
              style={{
                top: `${t1}%`,
                left: `${l1}%`,
                width: `${length}%`,
                height: '4px',
                backgroundColor: PLAYER_COLORS[players[currentPlayerIndex].id],
                transform: `rotate(${angle}deg)`,
                transformOrigin: '0 50%',
                boxShadow: `0 0 15px ${PLAYER_COLORS[players[currentPlayerIndex].id]}`,
                opacity: 0.8,
                animation: 'aiTraceAnim 0.6s ease-out forwards'
              }}
            >
              <style>{`
                @keyframes aiTraceAnim {
                  0% { opacity: 1; transform: rotate(${angle}deg) scaleX(0); }
                  20% { opacity: 1; transform: rotate(${angle}deg) scaleX(1); }
                  80% { opacity: 1; transform: rotate(${angle}deg) scaleX(1); }
                  100% { opacity: 0; transform: rotate(${angle}deg) scaleX(1); }
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
  );
};

export default Board;
