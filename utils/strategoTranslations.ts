import { Language } from "../types";

export interface StrategoTranslations {
  // Top bar
  title: string;
  onlineVs: string;
  fullscreen: string;
  exitFullscreen: string;
  rulesTooltip: string;
  saveMatch: string;
  exit: string;
  gameSavedSuccess: string;
  abandonOnlineConfirm: string;

  // Setup phase
  setupTitle: string;
  waitingBothConfirm: string;
  tapSecondPieceToSwap: string;
  finishedSetupPrompt: string;
  selectPresetAria: string;
  choosePresetTitle: string;
  presetBalanced: string;
  presetDefensive: string;
  presetBlitz: string;
  presetBluff: string;
  presetFortress: string;
  presetCustom: string;
  saveCustomTooltip: string;
  save: string;
  waitingForOpponent: string;
  editArmy: string;
  opponentReady: string;
  tapHere: string;
  startBattle: string;

  // Bubble / Fumetto
  bubbleTitle: string;
  bubbleSwapTitle: string;
  bubbleSwapDesc: string;
  bubbleStartTitle: string;
  bubbleStartDesc: string;
  bubbleDontShowAgain: string;
  bubbleFooterHint: string;
  bubbleOk: string;

  // In-Game status
  yourTurn: string;
  aiTurn: string;
  aiThinking: string;
  selectPieceToMove: string;
  pieceSelectedMoves: string;
  surrender: string;
  surrenderConfirm: string;
  capturedPieces: string;
  you: string;
  ai: string;
  redArmy: string;
  blueArmy: string;

  // Combat Clash
  attack: string;
  defense: string;
  victory: string;
  defeat: string;
  defenseWon: string;
  repelled: string;
  doubleOut: string;
  rank: string;
  flag: string;
  bomb: string;

  // Game over
  triumphantVictory: string;
  defeatTitle: string;
  drawTitle: string;
  pointsEarned: string;
  matchScore: string;
  points: string;
  online1v1: string;
  level: string;
  moves: string;
  movesPlayed: string;
  time: string;
  timeTaken: string;
  newMatch: string;
  flagCapturedWin: string;
  flagCapturedLoss: string;
  noLegalMovesWin: string;
  noLegalMovesLoss: string;

  // Codex & Rules Modals
  pieceCodex: string;
  pieceCodexTitle: string;
  rulesTitle: string;
  usefulResources: string;
  historyTriviaBtn: string;
  closeBtn: string;
  piecesSwappedToast: string;
  customSetupSavedToast: string;
  setupAppliedToast: string;
}

export const STRATEGO_I18N: Record<Language, StrategoTranslations> = {
  it: {
    title: "STRATEGO",
    onlineVs: "ONLINE: vs",
    fullscreen: "Schermo intero",
    exitFullscreen: "Riduci schermo",
    rulesTooltip: "Regole & Guida (?)",
    saveMatch: "Salva",
    exit: "Esci",
    gameSavedSuccess: "Partita salvata con successo!",
    abandonOnlineConfirm: "Vuoi abbandonare la partita online? (Penalità: -2 punti)",

    setupTitle: "🛠️ Schieramento",
    waitingBothConfirm: "In attesa che entrambi confermiate lo schieramento...",
    tapSecondPieceToSwap: "Tocca la 2ª pedina per scambiare",
    finishedSetupPrompt: "👉 Finito il posizionamento? Premi 'Inizia Battaglia!' ⚔️",
    selectPresetAria: "Seleziona schema di schieramento",
    choosePresetTitle: "Scegli lo schema di schieramento pedine",
    presetBalanced: "⚖️ Bilanciato",
    presetDefensive: "🛡️ Difensivo",
    presetBlitz: "⚡ Blitz",
    presetBluff: "🎭 Inganno",
    presetFortress: "🏰 Fortezza",
    presetCustom: "⭐ Personale",
    saveCustomTooltip: "Salva questo schieramento attuale come 'Personale'",
    save: "Salva",
    waitingForOpponent: "In attesa di",
    editArmy: "Modifica",
    opponentReady: "è pronto!",
    tapHere: "PREMI QUI!",
    startBattle: "Inizia Battaglia!",

    bubbleTitle: "Schieramento & Avvio Battaglia",
    bubbleSwapTitle: "Scambio pedine:",
    bubbleSwapDesc: "seleziona 2 pedine del tuo esercito per scambiarle di posto sulla scacchiera.",
    bubbleStartTitle: "Inizia la sfida:",
    bubbleStartDesc: "finito il posizionamento, premi il tasto verde 'Inizia Battaglia!' in alto a destra per iniziare il gioco!",
    bubbleDontShowAgain: "Non mostrare più questo avviso",
    bubbleFooterHint: "Tocca OK o la ✕ per chiudere",
    bubbleOk: "OK",

    yourTurn: "Tuo Turno",
    aiTurn: "Turno IA",
    aiThinking: "L'IA sta elaborando la mossa strategica...",
    selectPieceToMove: "Seleziona una tua pedina da muovere",
    pieceSelectedMoves: "Mostrate caselle di movimento valide",
    surrender: "Resa",
    surrenderConfirm: "Sei sicuro di voler dichiarare la resa della partita?",
    capturedPieces: "Pedine Catturate",
    you: "TU",
    ai: "IA",
    redArmy: "Rosso",
    blueArmy: "Blu",

    attack: "Attacco",
    defense: "Difesa",
    victory: "Vittoria",
    defeat: "Sconfitta",
    defenseWon: "Difesa Vinta",
    repelled: "Respinto",
    doubleOut: "Doppia Fine",
    rank: "Grado",
    flag: "Bandiera",
    bomb: "Bomba",

    triumphantVictory: "VITTORIA TRIONFALE!",
    defeatTitle: "SCONFITTA!",
    drawTitle: "PAREGGIO!",
    pointsEarned: "Punti Guadagnati",
    matchScore: "Punteggio Partita",
    points: "Punti",
    online1v1: "Partita 1v1 Online",
    level: "Livello",
    moves: "Mosse",
    movesPlayed: "Mosse giocate",
    time: "Tempo",
    timeTaken: "Tempo impiegato",
    newMatch: "Nuova Sfida",
    flagCapturedWin: "Hai espugnato la Bandiera nemica! Vittoria Trionfale!",
    flagCapturedLoss: "La tua Bandiera è stata espugnata!",
    noLegalMovesWin: "L'avversario non ha più pezzi mobili disponibili!",
    noLegalMovesLoss: "Non hai più pezzi mobili per muovere!",

    pieceCodex: "Codex Pedine e Gradi",
    pieceCodexTitle: "Codex Ufficiale dei Ranghi Militari",
    rulesTitle: "Regolamento Ufficiale Stratego",
    usefulResources: "Risorse Utili (Link Esterni)",
    historyTriviaBtn: "STORIA / CURIOSITÀ",
    closeBtn: "CHIUDI",
    piecesSwappedToast: "Pedine scambiate! Premi 'Inizia Battaglia!' per iniziare",
    customSetupSavedToast: "Schieramento 'Personale' salvato con successo!",
    setupAppliedToast: "Schema applicato!",
  },

  es: {
    title: "STRATEGO",
    onlineVs: "EN LÍNEA: vs",
    fullscreen: "Pantalla completa",
    exitFullscreen: "Salir de pantalla completa",
    rulesTooltip: "Reglas y Guía (?)",
    saveMatch: "Guardar",
    exit: "Salir",
    gameSavedSuccess: "¡Partida guardada con éxito!",
    abandonOnlineConfirm: "¿Deseas abandonar la partida en línea? (Penalización: -2 puntos)",

    setupTitle: "🛠️ Despliegue",
    waitingBothConfirm: "Esperando que ambos jugadores confirmen el despliegue...",
    tapSecondPieceToSwap: "Toca la 2ª pieza para intercambiar",
    finishedSetupPrompt: "👉 ¿Listo el despliegue? Pulsa '¡Iniciar Batalla!' ⚔️",
    selectPresetAria: "Selecciona esquema de despliegue",
    choosePresetTitle: "Elige el esquema de despliegue de piezas",
    presetBalanced: "⚖️ Equilibrado",
    presetDefensive: "🛡️ Defensivo",
    presetBlitz: "⚡ Blitz",
    presetBluff: "🎭 Engaño",
    presetFortress: "🏰 Fortaleza",
    presetCustom: "⭐ Personalizado",
    saveCustomTooltip: "Guardar este despliegue como 'Personalizado'",
    save: "Guardar",
    waitingForOpponent: "Esperando a",
    editArmy: "Modificar",
    opponentReady: "¡está listo/a!",
    tapHere: "¡PULSA AQUÍ!",
    startBattle: "¡Iniciar Batalla!",

    bubbleTitle: "Despliegue y Comienzo de la Batalla",
    bubbleSwapTitle: "Intercambio de piezas:",
    bubbleSwapDesc: "selecciona 2 piezas de tu ejército para intercambiar sus posiciones en el tablero.",
    bubbleStartTitle: "Iniciar la batalla:",
    bubbleStartDesc: "una vez terminado el despliegue, pulsa el botón verde '¡Iniciar Batalla!' arriba a la derecha para empezar a jugar.",
    bubbleDontShowAgain: "No volver a mostrar este aviso",
    bubbleFooterHint: "Toca OK o la ✕ para cerrar",
    bubbleOk: "OK",

    yourTurn: "Tu Turno",
    aiTurn: "Turno IA",
    aiThinking: "La IA está calculando el movimiento estratégico...",
    selectPieceToMove: "Selecciona una pieza tuya para mover",
    pieceSelectedMoves: "Casillas de movimiento válidas mostradas",
    surrender: "Rendirse",
    surrenderConfirm: "¿Estás seguro de que deseas rendirte?",
    capturedPieces: "Piezas Capturadas",
    you: "TÚ",
    ai: "IA",
    redArmy: "Rojo",
    blueArmy: "Azul",

    attack: "Ataque",
    defense: "Defensa",
    victory: "Victoria",
    defeat: "Derrota",
    defenseWon: "Defensa Exitosa",
    repelled: "Rechazado",
    doubleOut: "Eliminación Mutua",
    rank: "Rango",
    flag: "Bandera",
    bomb: "Bomba",

    triumphantVictory: "¡VICTORIA TRIUNFAL!",
    defeatTitle: "¡DERROTA!",
    drawTitle: "¡EMPATE!",
    pointsEarned: "Puntos Ganados",
    matchScore: "Puntuación de la Partida",
    points: "Puntos",
    online1v1: "Partida 1v1 en Línea",
    level: "Nivel",
    moves: "Movimientos",
    movesPlayed: "Movimientos jugados",
    time: "Tiempo",
    timeTaken: "Tiempo transcurrido",
    newMatch: "Nueva Partida",
    flagCapturedWin: "¡Has capturado la Bandera enemiga! ¡Victoria Triunfal!",
    flagCapturedLoss: "¡Tu Bandera ha sido capturada!",
    noLegalMovesWin: "¡El rival no tiene piezas móviles disponibles!",
    noLegalMovesLoss: "¡No tienes piezas móviles para mover!",

    pieceCodex: "Códice de Piezas y Rangos",
    pieceCodexTitle: "Códice Oficial de Rangos Militares",
    rulesTitle: "Reglamento Oficial de Stratego",
    usefulResources: "Recursos Útiles (Enlaces Externos)",
    historyTriviaBtn: "HISTORIA / CURIOSIDADES",
    closeBtn: "CERRAR",
    piecesSwappedToast: "¡Piezas intercambiadas! Pulsa '¡Iniciar Batalla!' para comenzar",
    customSetupSavedToast: "¡Despliegue 'Personalizado' guardado con éxito!",
    setupAppliedToast: "¡Esquema aplicado!",
  },

  en: {
    title: "STRATEGO",
    onlineVs: "ONLINE: vs",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    rulesTooltip: "Game Rules (?)",
    saveMatch: "Save",
    exit: "Exit",
    gameSavedSuccess: "Game saved successfully!",
    abandonOnlineConfirm: "Do you want to abandon this online match? (Penalty: -2 points)",

    setupTitle: "🛠️ Setup",
    waitingBothConfirm: "Waiting for both players to confirm army setup...",
    tapSecondPieceToSwap: "Tap 2nd piece to swap",
    finishedSetupPrompt: "👉 Setup finished? Tap 'Start Battle!' ⚔️",
    selectPresetAria: "Select army deployment schema",
    choosePresetTitle: "Choose piece deployment schema",
    presetBalanced: "⚖️ Balanced",
    presetDefensive: "🛡️ Defensive",
    presetBlitz: "⚡ Blitz",
    presetBluff: "🎭 Bluff",
    presetFortress: "🏰 Fortress",
    presetCustom: "⭐ Custom",
    saveCustomTooltip: "Save current setup as 'Custom'",
    save: "Save",
    waitingForOpponent: "Waiting for",
    editArmy: "Edit",
    opponentReady: "is ready!",
    tapHere: "TAP HERE!",
    startBattle: "Start Battle!",

    bubbleTitle: "Deployment & Start Battle",
    bubbleSwapTitle: "Swap pieces:",
    bubbleSwapDesc: "select 2 pieces of your army to swap their positions on the board.",
    bubbleStartTitle: "Start battle:",
    bubbleStartDesc: "once finished, tap the top-right green 'Start Battle!' button to begin the game!",
    bubbleDontShowAgain: "Don't show this guide again",
    bubbleFooterHint: "Tap OK or ✕ to close",
    bubbleOk: "OK",

    yourTurn: "Your Turn",
    aiTurn: "AI Turn",
    aiThinking: "AI is calculating strategic move...",
    selectPieceToMove: "Select your piece to move",
    pieceSelectedMoves: "Valid movement spaces shown",
    surrender: "Surrender",
    surrenderConfirm: "Are you sure you want to forfeit this match?",
    capturedPieces: "Captured Pieces",
    you: "YOU",
    ai: "AI",
    redArmy: "Red",
    blueArmy: "Blue",

    attack: "Attack",
    defense: "Defense",
    victory: "Victory",
    defeat: "Defeat",
    defenseWon: "Defense Won",
    repelled: "Repelled",
    doubleOut: "Double Out",
    rank: "Rank",
    flag: "Flag",
    bomb: "Bomb",

    triumphantVictory: "TRIUMPHANT VICTORY!",
    defeatTitle: "DEFEAT!",
    drawTitle: "DRAW!",
    pointsEarned: "Points Earned",
    matchScore: "Match Score",
    points: "Pts",
    online1v1: "1v1 Online Match",
    level: "Level",
    moves: "Moves",
    movesPlayed: "Moves played",
    time: "Time",
    timeTaken: "Time taken",
    newMatch: "New Match",
    flagCapturedWin: "You captured the enemy Flag! Triumphant Victory!",
    flagCapturedLoss: "Your Flag was captured!",
    noLegalMovesWin: "Opponent has no legal movable pieces left!",
    noLegalMovesLoss: "You have no legal movable pieces left!",

    pieceCodex: "Piece & Rank Codex",
    pieceCodexTitle: "Official Military Rank Codex",
    rulesTitle: "Official Stratego Rules",
    usefulResources: "Useful Resources (External Links)",
    historyTriviaBtn: "HISTORY / TRIVIA",
    closeBtn: "CLOSE",
    piecesSwappedToast: "Pieces swapped! Tap 'Start Battle!' to begin",
    customSetupSavedToast: "'Custom' army setup saved successfully!",
    setupAppliedToast: "Setup applied!",
  },

  fr: {
    title: "STRATEGO",
    onlineVs: "EN LIGNE : vs",
    fullscreen: "Plein écran",
    exitFullscreen: "Quitter le plein écran",
    rulesTooltip: "Règles & Guide (?)",
    saveMatch: "Sauvegarder",
    exit: "Quitter",
    gameSavedSuccess: "Partie sauvegardée avec succès !",
    abandonOnlineConfirm: "Voulez-vous abandonner cette partie en ligne ? (Pénalité : -2 points)",

    setupTitle: "🛠️ Déploiement",
    waitingBothConfirm: "En attente de la confirmation des deux joueurs...",
    tapSecondPieceToSwap: "Touchez la 2e pièce pour échanger",
    finishedSetupPrompt: "👉 Déploiement terminé ? Appuyez sur 'Lancer la bataille !' ⚔️",
    selectPresetAria: "Sélectionnez le schéma de déploiement",
    choosePresetTitle: "Choisissez le schéma de déploiement",
    presetBalanced: "⚖️ Équilibré",
    presetDefensive: "🛡️ Défensif",
    presetBlitz: "⚡ Blitz",
    presetBluff: "🎭 Bluff",
    presetFortress: "🏰 Forteresse",
    presetCustom: "⭐ Personnalisé",
    saveCustomTooltip: "Enregistrer ce déploiement comme 'Personnalisé'",
    save: "Sauvegarder",
    waitingForOpponent: "En attente de",
    editArmy: "Modifier",
    opponentReady: "est prêt(e) !",
    tapHere: "APPUYEZ ICI !",
    startBattle: "Lancer la bataille !",

    bubbleTitle: "Déploiement et Début de la Bataille",
    bubbleSwapTitle: "Échange de pièces :",
    bubbleSwapDesc: "sélectionnez 2 pièces de votre armée pour échanger leurs positions sur le plateau.",
    bubbleStartTitle: "Lancer le combat :",
    bubbleStartDesc: "une fois terminé, appuyez sur le bouton vert 'Lancer la bataille !' en haut à droite pour commencer le jeu !",
    bubbleDontShowAgain: "Ne plus afficher ce guide",
    bubbleFooterHint: "Touchez OK ou ✕ pour fermer",
    bubbleOk: "OK",

    yourTurn: "Votre Tour",
    aiTurn: "Tour IA",
    aiThinking: "L'IA calcule le mouvement stratégique...",
    selectPieceToMove: "Sélectionnez une pièce à déplacer",
    pieceSelectedMoves: "Cases valides affichées",
    surrender: "Abandonner",
    surrenderConfirm: "Êtes-vous sûr de vouloir déclarer forfait ?",
    capturedPieces: "Pièces Capturées",
    you: "VOUS",
    ai: "IA",
    redArmy: "Rouge",
    blueArmy: "Bleu",

    attack: "Attaque",
    defense: "Défense",
    victory: "Victoire",
    defeat: "Défaite",
    defenseWon: "Défense Gagnée",
    repelled: "Repoussé",
    doubleOut: "Double Élimination",
    rank: "Rang",
    flag: "Drapeau",
    bomb: "Bombe",

    triumphantVictory: "VICTOIRE TRIOMPHALE !",
    defeatTitle: "DÉFAITE !",
    drawTitle: "ÉGALITÉ !",
    pointsEarned: "Points Gagnés",
    matchScore: "Score de la Partie",
    points: "Pts",
    online1v1: "Partie 1v1 en Ligne",
    level: "Niveau",
    moves: "Coups",
    movesPlayed: "Coups joués",
    time: "Temps",
    timeTaken: "Temps écoulé",
    newMatch: "Nouvelle Partie",
    flagCapturedWin: "Vous avez capturé le Drapeau ennemi ! Victoire Triomphale !",
    flagCapturedLoss: "Votre Drapeau a été capturé !",
    noLegalMovesWin: "L'adversaire n'a plus de coups légaux !",
    noLegalMovesLoss: "Vous n'avez plus de pièces mobiles !",

    pieceCodex: "Codex Pièces et Rangs",
    pieceCodexTitle: "Codex Officiel des Rangs Militaires",
    rulesTitle: "Règlement Officiel Stratego",
    usefulResources: "Ressources Utiles (Liens Externes)",
    historyTriviaBtn: "HISTOIRE / CURIOSITÉS",
    closeBtn: "FERMER",
    piecesSwappedToast: "Pièces échangées ! Appuyez sur 'Lancer la bataille !' pour commencer",
    customSetupSavedToast: "Déploiement 'Personnalisé' enregistré avec succès !",
    setupAppliedToast: "Schéma appliqué !",
  },

  de: {
    title: "STRATEGO",
    onlineVs: "ONLINE: vs",
    fullscreen: "Vollbild",
    exitFullscreen: "Vollbild beenden",
    rulesTooltip: "Spielregeln (?)",
    saveMatch: "Speichern",
    exit: "Beenden",
    gameSavedSuccess: "Spiel erfolgreich gespeichert!",
    abandonOnlineConfirm: "Möchten Sie dieses Online-Spiel aufgeben? (Strafe: -2 Punkte)",

    setupTitle: "🛠️ Aufstellung",
    waitingBothConfirm: "Warten, bis beide Spieler die Aufstellung bestätigen...",
    tapSecondPieceToSwap: "Tippen Sie die 2. Figur zum Tauschen an",
    finishedSetupPrompt: "👉 Aufstellung fertig? Tippen Sie auf 'Schlacht starten!' ⚔️",
    selectPresetAria: "Aufstellungsmuster auswählen",
    choosePresetTitle: "Figurenaufstellungsmuster wählen",
    presetBalanced: "⚖️ Ausgewogen",
    presetDefensive: "🛡️ Defensiv",
    presetBlitz: "⚡ Blitz",
    presetBluff: "🎭 Täuschung",
    presetFortress: "🏰 Festung",
    presetCustom: "⭐ Benutzerdefiniert",
    saveCustomTooltip: "Aktuelle Aufstellung als 'Benutzerdefiniert' speichern",
    save: "Speichern",
    waitingForOpponent: "Warten auf",
    editArmy: "Bearbeiten",
    opponentReady: "ist bereit!",
    tapHere: "HIER TIPPEN!",
    startBattle: "Schlacht starten!",

    bubbleTitle: "Aufstellung & Schlachtbeginn",
    bubbleSwapTitle: "Figuren tauschen:",
    bubbleSwapDesc: "wählen Sie 2 eigene Figuren aus, um ihre Positionen auf dem Brett zu tauschen.",
    bubbleStartTitle: "Schlacht starten:",
    bubbleStartDesc: "sobald fertig, tippen Sie oben rechts auf die grüne Schaltfläche 'Schlacht starten!', um das Spiel zu beginnen!",
    bubbleDontShowAgain: "Diese Anleitung nicht mehr anzeigen",
    bubbleFooterHint: "Tippen Sie auf OK oder ✕ zum Schließen",
    bubbleOk: "OK",

    yourTurn: "Ihr Zug",
    aiTurn: "KI-Zug",
    aiThinking: "KI berechnet strategischen Zug...",
    selectPieceToMove: "Wählen Sie eine eigene Figur zum Bewegen",
    pieceSelectedMoves: "Gültige Züge werden angezeigt",
    surrender: "Aufgeben",
    surrenderConfirm: "Möchten Sie diese Partie wirklich aufgeben?",
    capturedPieces: "Geschlagene Figuren",
    you: "DU",
    ai: "KI",
    redArmy: "Rot",
    blueArmy: "Blau",

    attack: "Angriff",
    defense: "Verteidigung",
    victory: "Sieg",
    defeat: "Niederlage",
    defenseWon: "Erfolgreich Verteidigt",
    repelled: "Abgewehrt",
    doubleOut: "Beidseitig Geschlagen",
    rank: "Rang",
    flag: "Fahne",
    bomb: "Bombe",

    triumphantVictory: "TRIUMPHALER SIEG!",
    defeatTitle: "NIEDERLAGE!",
    drawTitle: "UNENTSCHIEDEN!",
    pointsEarned: "Gewonnene Punkte",
    matchScore: "Spielwertung",
    points: "Pkt",
    online1v1: "1v1 Online-Partie",
    level: "Stufe",
    moves: "Züge",
    movesPlayed: "Gespielte Züge",
    time: "Zeit",
    timeTaken: "Benötigte Zeit",
    newMatch: "Neues Spiel",
    flagCapturedWin: "Sie haben die gegnerische Fahne erobert! Triumphal!",
    flagCapturedLoss: "Ihre Fahne wurde erobert!",
    noLegalMovesWin: "Der Gegner hat keine legalen Züge mehr!",
    noLegalMovesLoss: "Sie haben keine beweglichen Figuren mehr!",

    pieceCodex: "Figuren- & Rang-Kodex",
    pieceCodexTitle: "Offizieller Militärrang-Kodex",
    rulesTitle: "Offizielle Stratego-Regeln",
    usefulResources: "Nützliche Ressourcen (Externe Links)",
    historyTriviaBtn: "GESCHICHTE / KURIOSITÄTEN",
    closeBtn: "SCHLIESSEN",
    piecesSwappedToast: "Figuren getauscht! Tippen Sie auf 'Schlacht starten!', um zu beginnen",
    customSetupSavedToast: "Aufstellung 'Benutzerdefiniert' erfolgreich gespeichert!",
    setupAppliedToast: "Muster angewendet!",
  },
};

export const PIECE_NAMES: Record<string, Record<Language, string>> = {
  marshal: { it: "Maresciallo", es: "Mariscal", en: "Marshal", fr: "Maréchal", de: "Feldmarschall" },
  general: { it: "Generale", es: "General", en: "General", fr: "Général", de: "General" },
  colonel: { it: "Colonnello", es: "Coronel", en: "Colonel", fr: "Colonel", de: "Oberst" },
  major: { it: "Maggiore", es: "Comandante", en: "Major", fr: "Commandant", de: "Major" },
  captain: { it: "Capitano", es: "Capitán", en: "Captain", fr: "Capitaine", de: "Hauptmann" },
  lieutenant: { it: "Tenente", es: "Teniente", en: "Lieutenant", fr: "Lieutenant", de: "Leutnant" },
  sergeant: { it: "Sergente", es: "Sargento", en: "Sergeant", fr: "Sergent", de: "Feldwebel" },
  miner: { it: "Geniere", es: "Minador", en: "Miner", fr: "Démineur", de: "Mineur" },
  scout: { it: "Esploratore", es: "Explorador", en: "Scout", fr: "Éclaireur", de: "Späher" },
  spy: { it: "Spia", es: "Espía", en: "Spy", fr: "Espion", de: "Spion" },
  bomb: { it: "Bomba", es: "Bomba", en: "Bomb", fr: "Bombe", de: "Bombe" },
  flag: { it: "Bandiera", es: "Bandera", en: "Flag", fr: "Drapeau", de: "Fahne" },
};

export function getStrategoI18n(lang: Language | string): StrategoTranslations {
  return STRATEGO_I18N[lang as Language] || STRATEGO_I18N.en;
}

export function getPieceLocalizedName(type: string, lang: Language | string): string {
  const l = lang as Language;
  return PIECE_NAMES[type]?.[l] || PIECE_NAMES[type]?.en || type;
}
