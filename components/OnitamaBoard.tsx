import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Only capture it after mount
    setHintContainer(document.getElementById("bottom-action-buttons"));
  }, []);

  const onitamaState = gameState.onitamaState;
  const turnPhase = gameState.turnPhase;
  const isSetup = turnPhase === "setup";
  if (!onitamaState) return null;

  const [selectedPiece, setSelectedPiece] = React.useState<Point | null>(null);
  const [selectedCard, setSelectedCard] = React.useState<OnitamaCardName | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  // Determine if it's the viewing player's turn (in hotseat, viewerId might be undefined, so we check if the game is active)
  const canInteract = gameState.status === "playing" && !gameState.winner && !currentPlayer.isAI;

  // We rotate the board so that the current human player's pieces are at the bottom.
  // In hotseat, player 1 is blue (bottom), player 2 is red (top). 
  // We'll just render it strictly with P1 at bottom and P2 at top.
  const boardSize = 5;

  const handleCardSelect = (card: OnitamaCardName, ownerId: PlayerId) => {
    if (!canInteract || ownerId !== currentPlayer.id) return;
    if (selectedCard === card) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  const handleSquareClick = (r: number, c: number) => {
    if (!canInteract) return;

    // Check if clicked our own piece
    const isOurPiece = currentPlayer.positions.find(p => p.r === r && p.c === c);
    if (isOurPiece) {
      if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
         setSelectedPiece(null); // deselect
      } else {
         setSelectedPiece({r, c});
      }
      return;
    }

    // Check if it's a valid move
    if (selectedPiece && selectedCard) {
       // Validate move
       const cardDef = ONITAMA_CARDS[selectedCard];
       // Card moves are relative. For Player 1 (Bottom), forward is r - 1.
       // So a move {dr: -1, dc: 0} means r - 1.
       // For Player 2 (Top), forward is r + 1. So we invert dr and dc.
       const sign = currentPlayer.id === 1 ? 1 : -1;
       
       let isValid = false;
       for (const m of cardDef.moves) {
         const moveR = selectedPiece.r + (m.dr * sign);
         const moveC = selectedPiece.c + (m.dc * sign);
         if (moveR === r && moveC === c) {
           isValid = true;
           break;
         }
       }

       if (isValid) {
         onMove({
           r, c, 
           onitamaMove: {
             from: selectedPiece,
             to: { r, c },
             card: selectedCard
           }
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
      const nr = selectedPiece.r + (m.dr * sign);
      const nc = selectedPiece.c + (m.dc * sign);
      if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
        // Can't land on our own piece
        if (!currentPlayer.positions.find(p => p.r === nr && p.c === nc)) {
           moves.push({ r: nr, c: nc });
        }
      }
    }
    return moves;
  };

  const validMoves = getValidMoveSquares();

  const renderCard = (cardName: OnitamaCardName, ownerId?: PlayerId | "neutral") => {
    const cardDef = ONITAMA_CARDS[cardName];
    const isSelected = selectedCard === cardName;
    const colorClass = cardDef.color === 'red' ? 'text-red-400' : cardDef.color === 'blue' ? 'text-blue-400' : 'text-slate-400';
    
    // Reverse grid rendering for Player 2's cards? Actually, the game cards are usually shown from the perspective of the player holding them.
    // For hotseat, all cards are shown relative to Player 1's perspective, or we can rotate P2's cards 180 degrees.
    // Let's render the grid straight and if it's P2's card, rotate the grid 180deg visually.
    const isOpponent = ownerId === 2;

    return (
      <div 
        key={cardName}
        onClick={() => ownerId && ownerId !== "neutral" && handleCardSelect(cardName, ownerId as PlayerId)}
        className={`relative w-[18vw] h-[25vw] max-w-[80px] max-h-[112px] sm:w-24 sm:h-32 bg-slate-800 rounded-lg p-1 sm:p-2 flex flex-col items-center border-[2px] transition-all shadow-lg
          ${ownerId === currentPlayer.id && !previewMode ? 'cursor-pointer hover:border-slate-400' : ''}
          ${isSelected ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.8)] scale-105 z-10' : 'border-slate-600'}
        `}
      >
        <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${colorClass} mb-1 sm:mb-2`}>{ONITAMA_CARD_NAMES_I18N[language]?.[cardName] || cardName}</span>
        <div className={`grid grid-cols-5 gap-[1px] w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] ${isOpponent ? 'rotate-180' : ''}`}>
          {Array.from({length: 25}).map((_, i) => {
            const cr = Math.floor(i / 5);
            const cc = i % 5;
            // Center is (2,2)
            const dr = cr - 2;
            const dc = cc - 2;
            const isCenter = dr === 0 && dc === 0;
            const isMove = cardDef.moves.some(m => m.dr === dr && m.dc === dc);
            return (
              <div key={i} className={`
                w-full h-full rounded-[1px]
                ${isCenter ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]' : isMove ? (cardDef.color === 'red' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.9)]' : 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]') : 'bg-slate-600/50'}
              `} />
            );
          })}
        </div>
      </div>
    );
  };

  const renderPiece = (player: any, isMaster: boolean, isSelected: boolean, pieceId?: string) => {
    return (
      <div 
        key={pieceId}
        className={`
        relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300
        ${isSelected ? 'scale-[1.12] z-10' : ''}
      `}
      style={{
        backgroundImage: isSelected 
          ? `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, ${player.color} 50%, rgba(0,0,0,0.2) 100%)`
          : `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 20%, transparent 50%), radial-gradient(circle at 50% 50%, ${player.color} 0%, ${player.color} 70%, rgba(0,0,0,0.4) 100%)`,
        backgroundColor: player.color,
        boxShadow: isSelected 
          ? `0 0 25px ${player.color}, inset 0 0 20px rgba(255,255,255,0.9), inset 0 0 5px ${player.color}` 
          : `0 8px 16px rgba(0,0,0,0.5), inset -2px -2px 6px rgba(0,0,0,0.4)`,
        filter: isSelected ? 'brightness(1.1)' : 'none'
      }}>
        {isMaster && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none drop-shadow-md">
             {/* Crown circle */}
              <div className="relative w-1/2 h-1/2 border-[3px] border-black/90 rounded-full flex items-center justify-center bg-black/40 shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,1)]" />
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-[800px] h-full flex flex-col items-center justify-center gap-2 sm:gap-4 p-1 sm:p-2 mt-0">
      {/* P2 Cards (Top) */}
      <div className="flex gap-2 sm:gap-4 shrink-0 mt-4 sm:mt-0">
        {onitamaState.player2Cards.map(c => renderCard(c, 2))}
      </div>

      <div className="flex flex-row justify-between sm:justify-center items-center w-full px-0 sm:px-0 gap-1 sm:gap-8 max-w-[600px]">
        {/* Neutral Card (Left) */}
        {!previewMode && (
          <div className="flex-shrink-0 origin-left">
            {renderCard(onitamaState.neutralCard, "neutral")}
          </div>
        )}

        {/* Board */}
        <div className="relative bg-slate-800/80 p-1 sm:p-2 rounded-xl shadow-2xl border-2 sm:border-4 border-slate-700 flex-shrink-0 ml-auto sm:ml-0 origin-right">
          <div className="grid grid-cols-5 gap-0.5 sm:gap-1 bg-slate-900 p-0.5 sm:p-1 rounded-lg">
            {Array.from({length: boardSize * boardSize}).map((_, i) => {
              const r = Math.floor(i / boardSize);
              const c = i % boardSize;
              const isP1Temple = r === 4 && c === 2;
              const isP2Temple = r === 0 && c === 2;
              const isValidMove = validMoves.some(m => m.r === r && m.c === c);

              // Find piece at this square
              let piecePlayer: any = null;
              let isMaster = false;
              let pieceIsSelected = false;

              let pieceId: string | undefined;

              for (const p of gameState.players) {
                const idx = p.positions.findIndex(pos => pos.r === r && pos.c === c);
                if (idx !== -1) {
                  piecePlayer = p;
                  isMaster = (idx === 0);
                  pieceId = p.positions[idx].id;
                  pieceIsSelected = (selectedPiece?.r === r && selectedPiece?.c === c && p.id === currentPlayer.id);
                  break;
                }
              }

              return (
                <div 
                  key={i} 
                  onClick={() => handleSquareClick(r, c)}
                  className={`
                    relative w-[13vw] h-[13vw] max-w-[56px] max-h-[56px] sm:w-14 sm:h-14 flex items-center justify-center rounded-sm transition-all duration-150
                    ${theme === 'onitama-light' ? ((r + c) % 2 === 0 ? 'bg-slate-300' : 'bg-slate-400') : ((r + c) % 2 === 0 ? 'bg-black' : 'bg-slate-700')}
                    ${isValidMove ? 'cursor-pointer z-20 hover:scale-[1.03] hover:brightness-110' : ''}
                  `}
                >
                  {/* Temple markings */}
                  {isP1Temple && <div className="absolute inset-0 bg-blue-500/20 shadow-[inset_0_0_10px_rgba(59,130,246,0.5)]" />}
                  {isP2Temple && <div className="absolute inset-0 bg-red-500/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.5)]" />}
                  
                  {isP1Temple && <div className="absolute top-1 right-1 w-2 h-2 text-[10px] text-blue-800 font-bold opacity-30">⛩️</div>}
                  {isP2Temple && <div className="absolute bottom-1 left-1 w-2 h-2 text-[10px] text-red-800 font-bold opacity-30 rotate-180">⛩️</div>}

                  {/* Saturated High-Visibility Valid Move Landing Target */}
                  {isValidMove && !piecePlayer && (
                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-cyan-400/55 border-2 border-cyan-300 ring-2 ring-cyan-400/80 shadow-[0_0_18px_rgba(6,182,212,0.95),inset_0_0_14px_rgba(6,182,212,0.8)] animate-pulse rounded-sm">
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-cyan-200 border-2 border-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                    </div>
                  )}

                  {/* Saturated High-Visibility Capture Target */}
                  {isValidMove && piecePlayer && (
                    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-red-600/60 border-2 border-red-300 ring-2 ring-red-400/80 shadow-[0_0_22px_rgba(239,68,68,1),inset_0_0_14px_rgba(239,68,68,0.85)] animate-pulse rounded-sm">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-red-200 shadow-[0_0_10px_rgba(255,255,255,0.9)] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)]" />
                      </div>
                    </div>
                  )}

                  {/* Piece */}
                  <div className="absolute inset-1">
                     {piecePlayer && renderPiece(piecePlayer, isMaster, pieceIsSelected, pieceId)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* P1 Cards (Bottom) */}
      <div className="flex gap-2 sm:gap-4 mt-2 sm:mt-1">
        {onitamaState.player1Cards.map(c => renderCard(c, 1))}
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
