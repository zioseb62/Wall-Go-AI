import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GameState, PlayerId, Point, OnitamaCardName, Language } from '../types';
import { ONITAMA_CARDS } from '../onitama';

const ONITAMA_CARD_NAMES_I18N: Record<Language, Record<string, string>> = {
  it: { tiger: "Tigre", crab: "Granchio", monkey: "Scimmia", crane: "Gru", dragon: "Drago", elephant: "Elefante", mantis: "Mantide", boar: "Cinghiale", frog: "Rana", goose: "Oca", horse: "Cavallo", eel: "Anguilla", rooster: "Gallo", ox: "Bue", cobra: "Cobra", rabbit: "Coniglio" },
  en: { tiger: "Tiger", crab: "Crab", monkey: "Monkey", crane: "Crane", dragon: "Dragon", elephant: "Elephant", mantis: "Mantis", boar: "Boar", frog: "Frog", goose: "Goose", horse: "Horse", eel: "Eel", rooster: "Rooster", ox: "Ox", cobra: "Cobra", rabbit: "Rabbit" },
  fr: { tiger: "Tigre", crab: "Crabe", monkey: "Singe", crane: "Grue", dragon: "Dragon", elephant: "Éléphant", mantis: "Mante", boar: "Sanglier", frog: "Grenouille", goose: "Oie", horse: "Cheval", eel: "Anguille", rooster: "Coq", ox: "Bœuf", cobra: "Cobra", rabbit: "Lapin" },
  es: { tiger: "Tigre", crab: "Cangrejo", monkey: "Mono", crane: "Grulla", dragon: "Dragón", elephant: "Elefante", mantis: "Mantis", boar: "Jabalí", frog: "Rana", goose: "Ganso", horse: "Caballo", eel: "Anguila", rooster: "Gallo", ox: "Buey", cobra: "Cobra", rabbit: "Conejo" },
  de: { tiger: "Tiger", crab: "Krabbe", monkey: "Affe", crane: "Kranich", dragon: "Drache", elephant: "Elefant", mantis: "Gottesanbeterin", boar: "Wildschwein", frog: "Frosch", goose: "Gans", horse: "Pferd", eel: "Aal", rooster: "Hahn", ox: "Ochse", cobra: "Kobra", rabbit: "Hase" }
};

const NEXT_CARD_LABEL_I18N: Record<Language, string> = {
  it: "Prossima carta movimento",
  en: "Next movement card",
  fr: "Prochaine carte mouvement",
  es: "Próxima carta de movimiento",
  de: "Nächste Bewegungskarte",
};

interface OnitamaBoardProps {
  gameState: GameState;
  onMove: (p: Point & { 
    onitamaMove?: { 
      from: Point; 
      to: Point; 
      card: OnitamaCardName;
    } 
  }) => void;
  viewerId?: PlayerId;
  previewMode?: boolean;
  theme?: string;
  language?: Language;
}

export default function OnitamaBoard({ gameState, onMove, viewerId, previewMode, theme = "onitama-dark", language = "en" }: OnitamaBoardProps) {
  const [hintContainer, setHintContainer] = useState<HTMLElement | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Point | null>(null);
  const [selectedCard, setSelectedCard] = useState<OnitamaCardName | null>(null);

  // Interactive 3D Board state (default 34° tilt and -10° rotation at startup, max tilt 38°)
  const DEFAULT_ONITAMA_TILT_X = 34;
  const DEFAULT_ONITAMA_ROTATE_Z = -10;
  const [tiltX, setTiltX] = useState<number>(DEFAULT_ONITAMA_TILT_X);
  const [rotateZ, setRotateZ] = useState<number>(DEFAULT_ONITAMA_ROTATE_Z);
  const [isDragging3D, setIsDragging3D] = useState<boolean>(false);
  const wasMatchEndedRef = useRef<boolean>(false);
  const dragRef = useRef<{
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

  useEffect(() => {
    setHintContainer(document.getElementById("bottom-action-buttons"));
  }, []);

  useEffect(() => {
    const isEnded = Boolean(gameState.winner || gameState.onitamaState?.winner || gameState.status === "ended");
    if (isEnded) {
      wasMatchEndedRef.current = true;
      setTiltX(0);
      setRotateZ(0);
      setIsDragging3D(false);
      dragRef.current.active = false;
    } else if (wasMatchEndedRef.current) {
      wasMatchEndedRef.current = false;
      setTiltX(DEFAULT_ONITAMA_TILT_X);
      setRotateZ(DEFAULT_ONITAMA_ROTATE_Z);
    }
  }, [gameState.winner, gameState.onitamaState?.winner, gameState.status]);

  const onitamaState = gameState.onitamaState;
  if (!onitamaState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const canInteract = gameState.status === "playing" && !gameState.winner && !onitamaState.winner && !currentPlayer.isAI;
  const boardSize = 5;

  const is3D = tiltX > 1 && !gameState.winner && !onitamaState.winner && gameState.status !== "ended" && !previewMode;
  const radZ = (rotateZ * Math.PI) / 180;
  const radX = (tiltX * Math.PI) / 180;
  const cosZ = Math.cos(radZ);
  const sinZ = Math.sin(radZ);
  const sinX = Math.sin(radX);
  const rho = 0.20;
  let minProjX = Infinity;
  let maxProjX = -Infinity;
  for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
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
  const tiltRad = (tiltX * Math.PI) / 180;
  const invCosTilt = is3D ? 1 / Math.max(0.75, Math.cos(tiltRad)) : 1;
  const sphereLiftPct = is3D ? Math.min(18, (tiltX / 38) * 16) : 0;
  const tiltFactor = Math.min(1, Math.max(0.76, tiltX / 32));
  const shadowAngleDeg = -13 - rotateZ;

  const handleCardSelect = (card: OnitamaCardName, ownerId: PlayerId) => {
    if (!canInteract || ownerId !== currentPlayer.id) return;
    if (selectedCard === card) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  const handleSquareClick = (r: number, c: number) => {
    if (dragRef.current.wasDragged) return;
    if (!canInteract) return;

    const isOurPiece = currentPlayer.positions.find(p => p.r === r && p.c === c);
    if (isOurPiece) {
      if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
        setSelectedPiece(null);
      } else {
        setSelectedPiece({ r, c });
      }
      return;
    }

    if (selectedPiece && selectedCard) {
      const cardDef = ONITAMA_CARDS[selectedCard];
      const sign = currentPlayer.id === 1 ? 1 : -1;

      let isValid = false;
      for (const m of cardDef.moves) {
        const moveR = selectedPiece.r + m.dr * sign;
        const moveC = selectedPiece.c + m.dc * sign;
        if (moveR === r && moveC === c) {
          isValid = true;
          break;
        }
      }

      if (isValid) {
        onMove({
          r,
          c,
          onitamaMove: {
            from: selectedPiece,
            to: { r, c },
            card: selectedCard,
          },
        });
        setSelectedPiece(null);
        setSelectedCard(null);
      }
    }
  };

  const getValidMoveSquares = () => {
    if (!selectedPiece || !selectedCard) return [];
    const cardDef = ONITAMA_CARDS[selectedCard];
    const sign = currentPlayer.id === 1 ? 1 : -1;
    const moves: Point[] = [];

    for (const m of cardDef.moves) {
      const nr = selectedPiece.r + m.dr * sign;
      const nc = selectedPiece.c + m.dc * sign;
      if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
        if (!currentPlayer.positions.find(p => p.r === nr && p.c === nc)) {
          moves.push({ r: nr, c: nc });
        }
      }
    }
    return moves;
  };

  const validMoves = getValidMoveSquares();

  const renderCard = (cardName: OnitamaCardName, ownerId?: PlayerId | "neutral", forPlayerId?: PlayerId) => {
    const cardDef = ONITAMA_CARDS[cardName];
    const isNeutral = ownerId === "neutral";
    const isSelected = !isNeutral && selectedCard === cardName && ownerId === currentPlayer.id;
    const colorClass = cardDef.color === 'red' ? 'text-red-400' : cardDef.color === 'blue' ? 'text-blue-400' : 'text-slate-400';
    const isOpponentPerspective = isNeutral ? forPlayerId === 2 : ownerId === 2;

    if (isNeutral) {
      return (
        <div
          key={`neutral-${cardName}`}
          className="relative w-[108px] sm:w-[132px] h-[94px] sm:h-[118px] bg-slate-900/95 rounded-xl px-1.5 py-1 sm:p-2 flex flex-col items-center justify-between border-2 border-amber-400/75 shadow-[0_0_18px_rgba(251,191,36,0.2)] shrink-0"
        >
          <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-tight text-amber-300 text-center leading-tight px-0.5">
            {NEXT_CARD_LABEL_I18N[language] || NEXT_CARD_LABEL_I18N.it}
          </span>
          <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider ${colorClass} leading-none`}>
            {ONITAMA_CARD_NAMES_I18N[language]?.[cardName] || cardName}
          </span>
          <div className={`grid grid-cols-5 gap-[1px] w-[44px] h-[44px] sm:w-[54px] sm:h-[54px] ${isOpponentPerspective ? 'rotate-180' : ''}`}>
            {Array.from({ length: 25 }).map((_, i) => {
              const cr = Math.floor(i / 5);
              const cc = i % 5;
              const dr = cr - 2;
              const dc = cc - 2;
              const isCenter = dr === 0 && dc === 0;
              const isMove = cardDef.moves.some(m => m.dr === dr && m.dc === dc);
              return (
                <div
                  key={i}
                  className={`w-full h-full rounded-[1px] ${
                    isCenter
                      ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]'
                      : isMove
                        ? cardDef.color === 'red'
                          ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.9)]'
                          : 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]'
                        : 'bg-slate-600/50'
                  }`}
                />
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div
        key={cardName}
        onClick={() => ownerId && handleCardSelect(cardName, ownerId as PlayerId)}
        className={`relative w-[84px] sm:w-[104px] h-[94px] sm:h-[118px] bg-slate-800 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-between border-[2px] transition-all shadow-lg shrink-0 ${
          ownerId === currentPlayer.id && !previewMode && canInteract ? 'cursor-pointer hover:border-slate-400' : ''
        } ${
          isSelected ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.8)] scale-105 z-10' : 'border-slate-600'
        }`}
      >
        <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${colorClass} leading-none mt-0.5`}>
          {ONITAMA_CARD_NAMES_I18N[language]?.[cardName] || cardName}
        </span>
        <div className={`grid grid-cols-5 gap-[1px] w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] mb-0.5 ${isOpponentPerspective ? 'rotate-180' : ''}`}>
          {Array.from({ length: 25 }).map((_, i) => {
            const cr = Math.floor(i / 5);
            const cc = i % 5;
            const dr = cr - 2;
            const dc = cc - 2;
            const isCenter = dr === 0 && dc === 0;
            const isMove = cardDef.moves.some(m => m.dr === dr && m.dc === dc);
            return (
              <div
                key={i}
                className={`w-full h-full rounded-[1px] ${
                  isCenter
                    ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]'
                    : isMove
                      ? cardDef.color === 'red'
                        ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.9)]'
                        : 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]'
                      : 'bg-slate-600/50'
                }`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-[800px] h-full flex flex-col items-center justify-between gap-1 sm:gap-2 px-0 py-0.5 mt-0 select-none">
      {/* Floating 2D Reset Button when 3D view is active */}
      {is3D && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTiltX(0);
            setRotateZ(0);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-[260] px-3 py-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-amber-400/70 text-amber-300 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,0,0,0.85)] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          title="Torna alla vista 2D"
        >
          <span>🔄</span>
          <span>2D</span>
        </button>
      )}

      {/* P2 Cards (Top) + Next Movement Card if it is Player 2's turn */}
      <div className="w-full flex flex-row items-center justify-center gap-2 sm:gap-3 shrink-0 mt-0.5">
        {onitamaState.player2Cards.map(c => renderCard(c, 2))}
        {!previewMode && currentPlayer.id === 2 && renderCard(onitamaState.neutralCard, "neutral", 2)}
      </div>

      {/* Center 5x5 Board with Interactive 3D Tilt & Rotation */}
      <div
        className="flex-1 min-h-0 w-full flex items-center justify-center relative py-0.5"
        style={{ containerType: "size" }}
      >
        <div
          onPointerDown={(e) => {
            if (!gameState.winner && !previewMode && e.isPrimary) {
              dragRef.current = {
                active: true,
                lastX: e.clientX,
                lastY: e.clientY,
                totalDist: 0,
                wasDragged: false,
              };
            }
          }}
          onPointerUp={() => {
            if (dragRef.current.active) {
              dragRef.current.active = false;
              setIsDragging3D(false);
              setTimeout(() => {
                dragRef.current.wasDragged = false;
              }, 50);
            }
          }}
          onPointerCancel={() => {
            dragRef.current.active = false;
            dragRef.current.wasDragged = false;
            setIsDragging3D(false);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse" && dragRef.current.active) {
              dragRef.current.active = false;
              setIsDragging3D(false);
              setTimeout(() => {
                dragRef.current.wasDragged = false;
              }, 50);
            }
          }}
          onPointerMove={(e) => {
            if (dragRef.current.active && !gameState.winner && !previewMode && e.isPrimary) {
              const dx = e.clientX - dragRef.current.lastX;
              const dy = e.clientY - dragRef.current.lastY;
              dragRef.current.lastX = e.clientX;
              dragRef.current.lastY = e.clientY;
              dragRef.current.totalDist += Math.hypot(dx, dy);

              if (dragRef.current.totalDist > 6) {
                if (!dragRef.current.wasDragged) {
                  dragRef.current.wasDragged = true;
                  setIsDragging3D(true);
                }
                setRotateZ((prev) => prev - dx * 0.48);
                setTiltX((prev) => {
                  const baseTilt = prev < 10 ? 34 : prev;
                  const nextTilt = Math.max(0, Math.min(38, baseTilt - dy * 0.32));
                  return nextTilt < 5 && dy > 2 ? 0 : nextTilt;
                });
              }
            }
          }}
          className={`relative w-full aspect-square bg-slate-800/90 p-1.5 sm:p-2.5 rounded-2xl shadow-2xl border-[2px] sm:border-[3px] ${
            is3D ? "border-[#fef08a]" : "border-slate-700"
          } flex-shrink-0 touch-none ${
            isDragging3D ? "transition-none cursor-grabbing" : "transition-all duration-300 ease-in-out cursor-grab"
          }`}
          style={{
            width: is3D ? "min(100cqw, calc(100cqh / 0.90), 550px)" : "min(100cqw, 100cqh, 550px)",
            height: is3D ? "min(100cqw, calc(100cqh / 0.90), 550px)" : "min(100cqw, 100cqh, 550px)",
            aspectRatio: "1 / 1",
            ...(is3D
              ? {
                  transform: `translateX(${shiftXPct.toFixed(2)}%) perspective(950px) scale(${dynamic3DScale.toFixed(3)}) rotateX(${tiltX.toFixed(1)}deg) rotateZ(${rotateZ.toFixed(1)}deg)`,
                  transformOrigin: "center center",
                  transformStyle: "preserve-3d",
                }
              : {}),
          }}
        >
          {/* 3D Extruded Board Base Thickness */}
          {is3D && (
            <>
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  backgroundColor: "#1e293b",
                  border: "2px solid #ca8a04",
                  transform: "translateZ(-7px)",
                  boxShadow: "inset 0 0 18px rgba(0,0,0,0.75)",
                }}
              />
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  backgroundColor: "#0f172a",
                  border: "2px solid #854d0e",
                  transform: "translateZ(-14px)",
                  boxShadow: "0 26px 45px rgba(0,0,0,0.88)",
                }}
              />
            </>
          )}

          {/* Shared SVG Gradient Definitions for Onitama 3D Sphere Shadows */}
          {is3D && (
            <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
              <defs>
                <radialGradient id="onitama-sphere-ao" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(2, 4, 10, 0.90)" />
                  <stop offset="62%" stopColor="rgba(2, 4, 10, 0.58)" />
                  <stop offset="100%" stopColor="rgba(2, 4, 10, 0)" />
                </radialGradient>
                <radialGradient id="onitama-sphere-cast" cx="50%" cy="50%" r="50%" fx="22%" fy="50%">
                  <stop offset="0%" stopColor="rgba(2, 4, 12, 0.90)" />
                  <stop offset="38%" stopColor="rgba(2, 4, 12, 0.74)" />
                  <stop offset="68%" stopColor="rgba(2, 4, 12, 0.45)" />
                  <stop offset="88%" stopColor="rgba(2, 4, 12, 0.18)" />
                  <stop offset="100%" stopColor="rgba(2, 4, 12, 0)" />
                </radialGradient>
              </defs>
            </svg>
          )}

          <div
            className="w-full h-full grid grid-cols-5 grid-rows-5 gap-1 sm:gap-1.5 bg-slate-900 p-1 sm:p-1.5 rounded-xl relative"
            style={{ transformStyle: is3D ? "preserve-3d" : undefined }}
          >
            {Array.from({ length: boardSize * boardSize }).map((_, i) => {
              const r = Math.floor(i / boardSize);
              const c = i % boardSize;
              const isP1Temple = r === 4 && c === 2;
              const isP2Temple = r === 0 && c === 2;
              const isValidMove = validMoves.some(m => m.r === r && m.c === c);

              let piecePlayer: any = null;
              let isMaster = false;
              let pieceIsSelected = false;
              let pieceId: string | undefined;

              for (const p of gameState.players) {
                const idx = p.positions.findIndex(pos => pos.r === r && pos.c === c);
                if (idx !== -1) {
                  piecePlayer = p;
                  isMaster = idx === 0;
                  pieceId = p.positions[idx].id;
                  pieceIsSelected = selectedPiece?.r === r && selectedPiece?.c === c && p.id === currentPlayer.id;
                  break;
                }
              }

              const isClickableSquare =
                canInteract &&
                !isDragging3D &&
                (isValidMove || (piecePlayer && piecePlayer.id === currentPlayer.id));

              const pieceScale = pieceIsSelected ? 1.12 : 1;

              return (
                <div
                  key={i}
                  onClick={() => handleSquareClick(r, c)}
                  style={{
                    transform: is3D ? "translateZ(2px)" : undefined,
                    transformStyle: is3D ? "preserve-3d" : undefined,
                  }}
                  className={`relative w-full h-full aspect-square flex items-center justify-center rounded-md transition-all duration-150 ${
                    theme === 'onitama-light'
                      ? (r + c) % 2 === 0
                        ? 'bg-slate-300'
                        : 'bg-slate-400'
                      : (r + c) % 2 === 0
                        ? 'bg-slate-950'
                        : 'bg-slate-700'
                  } ${
                    is3D ? 'shadow-[inset_0_2px_6px_rgba(0,0,0,0.75)] border border-white/5' : ''
                  } ${
                    isClickableSquare ? 'cursor-pointer' : ''
                  } ${
                    isValidMove ? 'z-20 hover:scale-[1.03] hover:brightness-110' : ''
                  }`}
                >
                  {/* Temple markings */}
                  {isP1Temple && <div className="absolute inset-0 bg-blue-500/20 shadow-[inset_0_0_10px_rgba(59,130,246,0.5)] rounded-md pointer-events-none" />}
                  {isP2Temple && <div className="absolute inset-0 bg-red-500/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.5)] rounded-md pointer-events-none" />}

                  {isP1Temple && <div className="absolute top-1 right-1 w-2.5 h-2.5 text-[10px] text-blue-800 font-bold opacity-35 pointer-events-none">⛩️</div>}
                  {isP2Temple && <div className="absolute bottom-1 left-1 w-2.5 h-2.5 text-[10px] text-red-800 font-bold opacity-35 rotate-180 pointer-events-none">⛩️</div>}

                  {/* Saturated High-Visibility Valid Move Landing Target */}
                  {isValidMove && !piecePlayer && (
                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-cyan-400/55 border-2 border-cyan-300 ring-2 ring-cyan-400/80 shadow-[0_0_18px_rgba(6,182,212,0.95),inset_0_0_14px_rgba(6,182,212,0.8)] animate-pulse rounded-md">
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-cyan-200 border-2 border-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                    </div>
                  )}

                  {/* Saturated High-Visibility Capture Target */}
                  {isValidMove && piecePlayer && (
                    <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-red-600/60 border-2 border-red-300 ring-2 ring-red-400/80 shadow-[0_0_22px_rgba(239,68,68,1),inset_0_0_14px_rgba(239,68,68,0.85)] animate-pulse rounded-md">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-red-200 shadow-[0_0_10px_rgba(255,255,255,0.9)] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)]" />
                      </div>
                    </div>
                  )}

                  {/* Natural Elliptical Directional Cast Shadow in 3D */}
                  {is3D && piecePlayer && (
                    <div
                      className="absolute inset-1 pointer-events-none z-10"
                      style={{ transform: "translateZ(2px)" }}
                    >
                      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible pointer-events-none">
                        <g transform={`translate(50, 50) rotate(${shadowAngleDeg.toFixed(1)})`}>
                          <ellipse
                            cx={(48 * tiltFactor).toFixed(1)}
                            cy="0"
                            rx={(72 * tiltFactor).toFixed(1)}
                            ry="40"
                            fill="url(#onitama-sphere-cast)"
                          />
                          <ellipse
                            cx="7"
                            cy="0"
                            rx="39"
                            ry="34"
                            fill="url(#onitama-sphere-ao)"
                          />
                        </g>
                      </svg>
                    </div>
                  )}

                  {/* Piece */}
                  {piecePlayer && (
                    <div
                      key={pieceId}
                      className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                      style={{
                        transform: is3D
                          ? `translateZ(10px) rotateZ(${-rotateZ}deg) translateY(-${sphereLiftPct.toFixed(1)}%) scale(${pieceScale.toFixed(3)}, ${(pieceScale * invCosTilt).toFixed(3)})`
                          : pieceIsSelected
                            ? "scale(1.12)"
                            : undefined,
                      }}
                    >
                      <div
                        className="relative w-[82%] h-[82%] aspect-square rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          backgroundImage: is3D
                            ? `radial-gradient(circle at 26% 32%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 8%, rgba(255,255,255,0.12) 20%, transparent 36%), radial-gradient(circle at 30% 36%, ${piecePlayer.color} 0%, ${piecePlayer.color} 42%, color-mix(in srgb, ${piecePlayer.color} 58%, #000000) 74%, color-mix(in srgb, ${piecePlayer.color} 24%, #000000) 93%, color-mix(in srgb, ${piecePlayer.color} 36%, #000000) 100%)`
                            : pieceIsSelected
                              ? `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, ${piecePlayer.color} 50%, rgba(0,0,0,0.2) 100%)`
                              : `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 20%, transparent 50%), radial-gradient(circle at 50% 50%, ${piecePlayer.color} 0%, ${piecePlayer.color} 70%, rgba(0,0,0,0.4) 100%)`,
                          backgroundColor: piecePlayer.color,
                          boxShadow: pieceIsSelected
                            ? `0 0 25px ${piecePlayer.color}, inset 0 0 20px rgba(255,255,255,0.9), inset 0 0 5px ${piecePlayer.color}`
                            : is3D
                              ? "inset -5px -4px 10px rgba(0,0,0,0.55), inset 2px 2px 5px rgba(255,255,255,0.22)"
                              : "0 8px 16px rgba(0,0,0,0.5), inset -2px -2px 6px rgba(0,0,0,0.4)",
                          filter: pieceIsSelected ? "brightness(1.1)" : "none",
                        }}
                      >
                        {isMaster && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none drop-shadow-md">
                            <div className="relative w-1/2 h-1/2 border-[3px] border-black/90 rounded-full flex items-center justify-center bg-black/40 shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,1)]" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* P1 Cards (Bottom) + Next Movement Card if it is Player 1's turn */}
      <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 shrink-0 mb-0.5">
        {onitamaState.player1Cards.map(c => renderCard(c, 1))}
        {!previewMode && currentPlayer.id === 1 && renderCard(onitamaState.neutralCard, "neutral", 1)}
      </div>

      {/* Action Hint rendered via Portal */}
      {hintContainer && createPortal(
        canInteract ? (
          <div className="bg-slate-900 text-slate-300 text-xs sm:text-sm px-4 py-1.5 rounded-full font-bold tracking-wide shadow-inner border border-slate-700 w-full text-center">
            {!selectedPiece && !selectedCard && (language === "it" ? "Scegli pedina e carta movimento" : language === "fr" ? "Sélectionnez pion et carte" : language === "es" ? "Selecciona pieza y carta" : language === "de" ? "Figur und Karte wählen" : "Select a piece and a card")}
            {selectedPiece && !selectedCard && (language === "it" ? "Scegli una carta" : language === "fr" ? "Sélectionnez une carte" : language === "es" ? "Selecciona una carta" : language === "de" ? "Wählen Sie eine Karte" : "Select a card")}
            {!selectedPiece && selectedCard && (language === "it" ? "Scegli una pedina" : language === "fr" ? "Sélectionnez un pion" : language === "es" ? "Selecciona una pieza" : language === "de" ? "Wählen Sie eine Figur" : "Select a piece")}
            {selectedPiece && selectedCard && (language === "it" ? "Scegli dove muovere" : language === "fr" ? "Choisissez où bouger" : language === "es" ? "Elige dónde moverte" : language === "de" ? "Wählen Sie das Ziel" : "Choose where to move")}
          </div>
        ) : (
          <div className="bg-slate-900 text-slate-400 text-xs sm:text-sm px-4 py-1.5 rounded-full font-bold tracking-wide shadow-inner italic border border-slate-700 w-full text-center">
            {language === "it" ? "Attendi..." : language === "fr" ? "Veuillez patienter..." : language === "es" ? "Espera..." : language === "de" ? "Bitte warten..." : "Please wait..."}
          </div>
        ),
        hintContainer
      )}
    </div>
  );
}
