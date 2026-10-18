
import { GameState, Language, StrategyAdvice } from "../types";
import { Logger } from "../utils/logger";
import { getBestMoveForAI, getBestWallForAI, getBestSetupForAI } from "../utils/aiLogic";

// Definizioni di testo statiche multilingua per simulare il "ragionamento" dell'AI
const TEXT_TEMPLATES = {
  it: {
    setup: "Posiziona la tua pedina lontano dai bordi per massimizzare il controllo centrale.",
    moving: "Questa mossa ti permette di espandere il tuo territorio o bloccare l'avversario.",
    walling: "Piazza il muro qui per chiudere un'area o limitare i movimenti nemici.",
    trapped: "Sei bloccato! Usa il Wallbreaker se disponibile o passa il turno.",
    winning: "Ottima posizione! Chiudi il territorio per assicurarti i punti."
  },
  en: {
    setup: "Place your piece away from edges to maximize central control.",
    moving: "This move allows you to expand territory or block the opponent.",
    walling: "Place the wall here to close an area or limit enemy movement.",
    trapped: "You are trapped! Use Wallbreaker if available or pass turn.",
    winning: "Great position! Close the territory to secure points."
  },
  fr: {
    setup: "Placez votre pièce loin des bords pour maximiser le contrôle central.",
    moving: "Ce mouvement vous permet d'étendre votre territoire ou de bloquer l'adversaire.",
    walling: "Placez le mur ici pour fermer une zone ou limiter les mouvements ennemis.",
    trapped: "Vous êtes piégé! Utilisez Wallbreaker si disponible ou passez.",
    winning: "Excellente position! Fermez le territoire pour sécuriser les points."
  },
  de: {
    setup: "Platzieren Sie Ihre Figur weg von den Rändern.",
    moving: "Dieser Zug ermöglicht es Ihnen, Territorium zu erweitern.",
    walling: "Platzieren Sie die Wand hier, um einen Bereich zu schließen.",
    trapped: "Du bist gefangen! Benutze Wallbreaker oder passe.",
    winning: "Tolle Position! Schließe das Territorium."
  },
  es: {
    setup: "Coloca tu pieza lejos de los bordes para maximizar el control.",
    moving: "Este movimiento te permite expandir territorio o bloquear.",
    walling: "Coloca el muro aquí para cerrar un área.",
    trapped: "¡Estás atrapado! Usa Wallbreaker o pasa.",
    winning: "¡Gran posición! Cierra el territorio para asegurar puntos."
  }
};

/**
 * Servizio di strategia LOCALE.
 * Utilizza l'algoritmo Minimax/Euristico esistente (utils/aiLogic) per generare suggerimenti.
 * Non richiede connessione internet né chiavi API.
 */
export const getStrategyAdvice = async (gameState: GameState, language: Language = 'en'): Promise<StrategyAdvice> => {
  Logger.info("Calcolo Strategia Locale...", { phase: gameState.turnPhase });

  // Simuliamo un piccolo ritardo per dare l'impressione che l'AI stia "pensando"
  await new Promise(resolve => setTimeout(resolve, 600));

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const lang = TEXT_TEMPLATES[language] || TEXT_TEMPLATES['en'];

  try {
    if (gameState.turnPhase === 'setup') {
        const bestSetup = getBestSetupForAI(gameState);
        return {
            text: lang.setup,
            suggestedMove: bestSetup
        };
    }

    if (gameState.turnPhase === 'moving') {
        if (currentPlayer.isTrapped && !currentPlayer.hasWallbreaker) {
            return { text: lang.trapped };
        }

        const bestAction = getBestMoveForAI(gameState, currentPlayer.id);
        
        if (bestAction) {
            return {
                text: lang.moving,
                suggestedMove: bestAction.movePos,
                suggestedWall: bestAction.wallTarget || undefined
            };
        } else {
             // Caso raro: nessuna mossa trovata
             return { text: lang.trapped };
        }
    }

    if (gameState.turnPhase === 'walling') {
        const bestWall = getBestWallForAI(gameState, currentPlayer.id);
        if (bestWall) {
             return {
                text: lang.walling,
                suggestedWall: bestWall
             };
        }
    }

    // Fallback generico
    return { text: "Analisi tattica completata. Mantieni il controllo del centro." };

  } catch (error) {
    Logger.error("Errore calcolo strategia locale", error);
    return { text: "Errore nel calcolo tattico." };
  }
};
