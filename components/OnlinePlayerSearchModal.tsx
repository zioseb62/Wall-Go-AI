import React, { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "../firebase";
import { GameMode, Language, BoardTheme } from "../types";
import { ALL_ABALONE_THEMES, getAbaloneLayoutName } from "../utils/gameLogic";
import { insertSimulatedPlayerToLeaderboard } from "../utils/simulatedLeaderboard";
import { 
  Users, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Gamepad2, 
  X, 
  Globe, 
  Sparkles, 
  Search, 
  Radio,
  Bot
} from "lucide-react";

interface ActivePlayer {
  id: string;
  userName: string;
  userLocation: string;
  lastActive: string;
  model?: string;
  platform?: string;
  totalScore?: number;
  minutesAgo: number;
  isOnlineNow: boolean;
  isFakeAI?: boolean;
}

interface OnlinePlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeviceId: string;
  currentUserName: string;
  currentUserLocation: string;
  currentUserEmail?: string;
  selectedGameMode: GameMode;
  currentBoardTheme?: BoardTheme;
  isRandomAbaloneTheme?: boolean;
  onSelectGameMode?: (mode: GameMode) => void;
  onSelectBoardTheme?: (theme: BoardTheme) => void;
  initialSearchQuery?: string;
  onStartOnlineMatch: (matchData: {
    roomId: string;
    gameMode: GameMode;
    boardTheme?: BoardTheme;
    myPlayerIndex: 1 | 2;
    opponentName: string;
    opponentLocation: string;
    opponentDeviceId?: string;
    opponentScore?: number;
    isInviter?: boolean;
    isSimulatedOpponent?: boolean;
  }) => void;
  language: Language;
}

export const getGameModeLabel = (mode: GameMode, lang: Language): string => {
  const map: Record<GameMode, Record<Language, string>> = {
    dominio: {
      it: "Wall Go (Dominio)",
      en: "Wall Go (Territory)",
      es: "Wall Go (Dominio)",
      fr: "Wall Go (Territoire)",
      de: "Wall Go (Gebiet)",
    },
    corsa: {
      it: "Corsa alla Meta (Quoridor)",
      en: "Goal Race (Quoridor)",
      es: "Carrera a la Meta (Quoridor)",
      fr: "Course au But (Quoridor)",
      de: "Zielrennen (Quoridor)",
    },
    pente: {
      it: "Pente",
      en: "Pente",
      es: "Pente",
      fr: "Pente",
      de: "Pente",
    },
    amazons: {
      it: "Game of the Amazons",
      en: "Game of the Amazons",
      es: "Juego de las Amazonas",
      fr: "Jeu des Amazones",
      de: "Spiel der Amazonen",
    },
    domineering: {
      it: "Domineering",
      en: "Domineering",
      es: "Domineering",
      fr: "Domineering",
      de: "Domineering",
    },
    hex: {
      it: "Hex",
      en: "Hex",
      es: "Hex",
      fr: "Hex",
      de: "Hex",
    },
    chain_triangle: {
      it: "Chain Triangle",
      en: "Chain Triangle",
      es: "Chain Triangle",
      fr: "Chain Triangle",
      de: "Chain Triangle",
    },
    orbito: {
      it: "Orbito",
      en: "Orbito",
      es: "Orbito",
      fr: "Orbito",
      de: "Orbito",
    },
    shobu: {
      it: "Shobu",
      en: "Shobu",
      es: "Shobu",
      fr: "Shobu",
      de: "Shobu",
    },
    yinsh: {
      it: "Yinsh",
      en: "Yinsh",
      es: "Yinsh",
      fr: "Yinsh",
      de: "Yinsh",
    },
    abalone: {
      it: "Abalone",
      en: "Abalone",
      es: "Abalone",
      fr: "Abalone",
      de: "Abalone",
    },
    onitama: {
      it: "Onitama",
      en: "Onitama",
      es: "Onitama",
      fr: "Onitama",
      de: "Onitama",
    },
    baduk: {
      it: "Baduk (Go)",
      en: "Baduk (Go)",
      es: "Baduk (Go)",
      fr: "Baduk (Go)",
      de: "Baduk (Go)",
    },
    stratego: {
      it: "Stratego",
      en: "Stratego",
      es: "Stratego",
      fr: "Stratego",
      de: "Stratego",
    },
  };
  return map[mode]?.[lang] || map[mode]?.["en"] || mode;
};

const ONLINE_MODAL_STRINGS: Record<Language, {
  title: string;
  subtitle: string;
  you: string;
  visibleOnline: string;
  activePlayersTab: string;
  roomCodeTab: string;
  chooseGame: string;
  searchPlaceholder: string;
  refresh: string;
  searchingPlayers: string;
  noActivePlayers: string;
  checkAgain: string;
  onlineNow: string;
  minAgo: string;
  player: string;
  pts: string;
  invite: string;
  sent: string;
  cancelInvite: string;
  createRoomTitle: string;
  createRoomDesc: string;
  yourRoomCode: string;
  waitingForFriend: string;
  generateRoomCode: string;
  haveCodeTitle: string;
  haveCodeDesc: string;
  codePlaceholder: string;
  join: string;
  roomNotFound: string;
  roomCreateError: string;
  p2pFooter: string;
  close: string;
  inviteSentWaiting: (name: string) => string;
  inviteExpired: string;
  inviteAccepted: string;
  inviteDeclined: string;
  inviteError: string;
  abaloneLayoutLabel: string;
  abaloneRandomLabel: string;
  abaloneFromSettingsLabel: string;
  abaloneRerollLabel: string;
}> = {
  it: {
    title: "Multigiocatore Online",
    subtitle: "Trova e sfida in diretta altri giocatori dell'app",
    you: "Tu:",
    visibleOnline: "Visibile online",
    activePlayersTab: "Giocatori Attivi",
    roomCodeTab: "Stanza con Codice",
    chooseGame: "Scegli il gioco per la sfida:",
    searchPlaceholder: "Cerca giocatore o città...",
    refresh: "Aggiorna",
    searchingPlayers: "Ricerca giocatori attivi in corso...",
    noActivePlayers: "Nessun altro giocatore attivo rilevato in questo istante. Rimani in questa schermata: la tua presenza è attiva e gli altri utenti ti vedranno online!",
    checkAgain: "Verifica di nuovo",
    onlineNow: "ONLINE ORA",
    minAgo: "min fa",
    player: "Giocatore",
    pts: "pt",
    invite: "Invita",
    sent: "Inviato",
    cancelInvite: "Annulla Invito",
    createRoomTitle: "Crea Stanza e Condividi Codice",
    createRoomDesc: "Genera un codice a 5 cifre per giocare con un amico a distanza. Condividi il codice via WhatsApp o messaggio!",
    yourRoomCode: "Codice della tua stanza:",
    waitingForFriend: "In attesa che l'amico inserisca il codice...",
    generateRoomCode: "Genera Codice Stanza",
    haveCodeTitle: "Hai già un Codice? Entra nella Stanza",
    haveCodeDesc: "Inserisci il codice a 5 cifre comunicato dal tuo amico per collegarti subito alla sua partita.",
    codePlaceholder: "Es. 48192",
    join: "Entra",
    roomNotFound: "Stanza non trovata o partita già iniziata. Verifica il codice a 5 cifre.",
    roomCreateError: "Impossibile creare la stanza. Riprova.",
    p2pFooter: "Matchmaking P2P basato su Cloud Firestore",
    close: "Chiudi",
    inviteSentWaiting: (name: string) => `Invito inviato a ${name}. In attesa di risposta...`,
    inviteExpired: "Tempo scaduto. L'avversario non ha risposto.",
    inviteAccepted: "🎉 Sfida accettata! Connessione alla partita in corso...",
    inviteDeclined: "❌ L'avversario ha rifiutato l'invito.",
    inviteError: "Errore durante l'invio dell'invito. Riprova.",
    abaloneLayoutLabel: "Disposizione pedine:",
    abaloneRandomLabel: "Casuale",
    abaloneFromSettingsLabel: "Dalle tue impostazioni",
    abaloneRerollLabel: "Rimescola",
  },
  en: {
    title: "Online Multiplayer",
    subtitle: "Find and challenge other app players in real-time",
    you: "You:",
    visibleOnline: "Visible online",
    activePlayersTab: "Active Players",
    roomCodeTab: "Room with Code",
    chooseGame: "Choose game for the challenge:",
    searchPlaceholder: "Search player or city...",
    refresh: "Refresh",
    searchingPlayers: "Searching for active players...",
    noActivePlayers: "No other active players detected right now. Stay on this screen: your presence is active and other users will see you online!",
    checkAgain: "Check again",
    onlineNow: "ONLINE NOW",
    minAgo: "min ago",
    player: "Player",
    pts: "pts",
    invite: "Invite",
    sent: "Sent",
    cancelInvite: "Cancel Invite",
    createRoomTitle: "Create Room & Share Code",
    createRoomDesc: "Generate a 5-digit code to play with a friend remotely. Share the code via WhatsApp or message!",
    yourRoomCode: "Your room code:",
    waitingForFriend: "Waiting for friend to enter code...",
    generateRoomCode: "Generate Room Code",
    haveCodeTitle: "Already have a Code? Join Room",
    haveCodeDesc: "Enter the 5-digit code given by your friend to join their match immediately.",
    codePlaceholder: "e.g. 48192",
    join: "Join",
    roomNotFound: "Room not found or match already started. Please check the 5-digit code.",
    roomCreateError: "Could not create room. Please try again.",
    p2pFooter: "P2P Matchmaking powered by Cloud Firestore",
    close: "Close",
    inviteSentWaiting: (name: string) => `Invite sent to ${name}. Waiting for response...`,
    inviteExpired: "Time expired. Opponent did not answer.",
    inviteAccepted: "🎉 Challenge accepted! Connecting to match...",
    inviteDeclined: "❌ Opponent declined the invite.",
    inviteError: "Error sending invite. Please try again.",
    abaloneLayoutLabel: "Pieces layout:",
    abaloneRandomLabel: "Random",
    abaloneFromSettingsLabel: "From your settings",
    abaloneRerollLabel: "Reroll",
  },
  es: {
    title: "Multijugador Online",
    subtitle: "Encuentra y desafía en vivo a otros jugadores de la app",
    you: "Tú:",
    visibleOnline: "Visible en línea",
    activePlayersTab: "Jugadores Activos",
    roomCodeTab: "Sala con Código",
    chooseGame: "Elige el juego para el desafío:",
    searchPlaceholder: "Buscar jugador o ciudad...",
    refresh: "Actualizar",
    searchingPlayers: "Buscando jugadores activos en curso...",
    noActivePlayers: "No se detectaron otros jugadores activos en este momento. ¡Permanece en esta pantalla: tu presencia está activa y otros usuarios te verán en línea!",
    checkAgain: "Comprobar de nuevo",
    onlineNow: "EN LÍNEA AHORA",
    minAgo: "min atrás",
    player: "Jugador",
    pts: "pts",
    invite: "Invitar",
    sent: "Enviado",
    cancelInvite: "Cancelar Invitación",
    createRoomTitle: "Crear Sala y Compartir Código",
    createRoomDesc: "Genera un código de 5 dígitos para jugar con un amigo a distancia. ¡Comparte el código por WhatsApp o mensaje!",
    yourRoomCode: "Código de tu sala:",
    waitingForFriend: "Esperando a que tu amigo introduzca el código...",
    generateRoomCode: "Generar Código de Sala",
    haveCodeTitle: "¿Ya tienes un Código? Entra en la Sala",
    haveCodeDesc: "Introduce el código de 5 dígitos proporcionado por tu amigo para unirte de inmediato a su partida.",
    codePlaceholder: "Ej. 48192",
    join: "Entrar",
    roomNotFound: "Sala no encontrada o partida ya iniciada. Verifica el código de 5 dígitos.",
    roomCreateError: "No se pudo crear la sala. Inténtalo de nuevo.",
    p2pFooter: "Matchmaking P2P basado en Cloud Firestore",
    close: "Cerrar",
    inviteSentWaiting: (name: string) => `Invitación enviada a ${name}. Esperando respuesta...`,
    inviteExpired: "Tiempo agotado. El oponente no respondió.",
    inviteAccepted: "🎉 ¡Desafío aceptado! Conectando a la partida...",
    inviteDeclined: "❌ El oponente rechazó la invitación.",
    inviteError: "Error al enviar la invitación. Inténtalo de nuevo.",
    abaloneLayoutLabel: "Disposición de fichas:",
    abaloneRandomLabel: "Aleatoria",
    abaloneFromSettingsLabel: "Desde tus ajustes",
    abaloneRerollLabel: "Barajar",
  },
  fr: {
    title: "Multijoueur En Ligne",
    subtitle: "Trouvez et défiez en direct d'autres joueurs de l'application",
    you: "Vous :",
    visibleOnline: "Visible en ligne",
    activePlayersTab: "Joueurs Actifs",
    roomCodeTab: "Salle avec Code",
    chooseGame: "Choisissez le jeu pour le défi :",
    searchPlaceholder: "Rechercher joueur ou ville...",
    refresh: "Actualiser",
    searchingPlayers: "Recherche de joueurs actifs en cours...",
    noActivePlayers: "Aucun autre joueur actif détecté pour le moment. Restez sur cet écran : votre présence est active et les autres vous verront en ligne !",
    checkAgain: "Vérifier à nouveau",
    onlineNow: "EN LIGNE",
    minAgo: "min",
    player: "Joueur",
    pts: "pts",
    invite: "Inviter",
    sent: "Envoyé",
    cancelInvite: "Annuler l'invitation",
    createRoomTitle: "Créer une Salle et Partager le Code",
    createRoomDesc: "Générez un code à 5 chiffres pour jouer avec un ami à distance. Partagez le code via WhatsApp ou message !",
    yourRoomCode: "Code de votre salle :",
    waitingForFriend: "En attente que l'ami saisisse le code...",
    generateRoomCode: "Générer un Code de Salle",
    haveCodeTitle: "Vous avez déjà un Code ? Rejoindre",
    haveCodeDesc: "Saisissez le code à 5 chiffres communiqué par votre ami pour rejoindre sa partie immédiatement.",
    codePlaceholder: "Ex. 48192",
    join: "Entrer",
    roomNotFound: "Salle introuvable ou partie déjà commencée. Vérifiez le code à 5 chiffres.",
    roomCreateError: "Impossible de créer la salle. Veuillez réessayer.",
    p2pFooter: "Matchmaking P2P basé sur Cloud Firestore",
    close: "Fermer",
    inviteSentWaiting: (name: string) => `Invitation envoyée à ${name}. En attente de réponse...`,
    inviteExpired: "Temps écoulé. L'adversaire n'a pas répondu.",
    inviteAccepted: "🎉 Défi accepté ! Connexion à la partie en cours...",
    inviteDeclined: "❌ L'adversaire a refusé l'invitation.",
    inviteError: "Erreur lors de l'envoi de l'invitation. Veuillez réessayer.",
    abaloneLayoutLabel: "Disposition des billes :",
    abaloneRandomLabel: "Aléatoire",
    abaloneFromSettingsLabel: "De vos paramètres",
    abaloneRerollLabel: "Mélanger",
  },
  de: {
    title: "Online-Multiplayer",
    subtitle: "Finde und fordere andere App-Spieler live heraus",
    you: "Du:",
    visibleOnline: "Online sichtbar",
    activePlayersTab: "Aktive Spieler",
    roomCodeTab: "Raum mit Code",
    chooseGame: "Wähle das Spiel für die Herausforderung:",
    searchPlaceholder: "Spieler oder Stadt suchen...",
    refresh: "Aktualisieren",
    searchingPlayers: "Suche nach aktiven Spielern...",
    noActivePlayers: "Zurzeit keine anderen aktiven Spieler erkannt. Bleibe auf diesem Bildschirm: Du bist online sichtbar für andere!",
    checkAgain: "Erneut prüfen",
    onlineNow: "JETZT ONLINE",
    minAgo: "Min. her",
    player: "Spieler",
    pts: "Pkt.",
    invite: "Einladen",
    sent: "Gesendet",
    cancelInvite: "Einladung abbrechen",
    createRoomTitle: "Raum erstellen & Code teilen",
    createRoomDesc: "Generiere einen 5-stelligen Code, um aus der Ferne mit einem Freund zu spielen. Teile den Code per WhatsApp oder Nachricht!",
    yourRoomCode: "Dein Raum-Code:",
    waitingForFriend: "Warte darauf, dass der Freund den Code eingibt...",
    generateRoomCode: "Raum-Code generieren",
    haveCodeTitle: "Hast du schon einen Code? Beitreten",
    haveCodeDesc: "Gib den 5-stelligen Code deines Freundes ein, um sofort seinem Spiel beizutreten.",
    codePlaceholder: "Z.B. 48192",
    join: "Beitreten",
    roomNotFound: "Raum nicht gefunden oder Spiel bereits gestartet. Überprüfe den 5-stelligen Code.",
    roomCreateError: "Raum konnte nicht erstellt werden. Bitte erneut versuchen.",
    p2pFooter: "P2P-Matchmaking basierend auf Cloud Firestore",
    close: "Schließen",
    inviteSentWaiting: (name: string) => `Einladung an ${name} gesendet. Warte auf Antwort...`,
    inviteExpired: "Zeit abgelaufen. Der Gegner hat nicht geantwortet.",
    inviteAccepted: "🎉 Herausforderung angenommen! Verbindung zum Spiel...",
    inviteDeclined: "❌ Der Gegner hat die Einladung abgelehnt.",
    inviteError: "Fehler beim Senden der Einladung. Bitte erneut versuchen.",
    abaloneLayoutLabel: "Kugelanordnung:",
    abaloneRandomLabel: "Zufällig",
    abaloneFromSettingsLabel: "Aus deinen Einstellungen",
    abaloneRerollLabel: "Neu mischen",
  },
};

// Pool of realistic player personas for simulated matchmaking when no real players are online
// Include players from Italy and other nations (Spain, France, Germany, UK, US, Japan, etc.)
// All scores are strictly kept <= 150 points
export const AI_PLAYER_CANDIDATES = [
  { name: "Matteo_CT", location: "Catania - IT", platform: "Android", score: 95 },
  { name: "Carlos_BCN", location: "Barcelona - ES", platform: "Android", score: 115 },
  { name: "Elena_V", location: "Roma - IT", platform: "iOS", score: 120 },
  { name: "Antoine_FR", location: "Paris - FR", platform: "iOS", score: 105 },
  { name: "Luca_Strategy", location: "Milano - IT", platform: "Android", score: 140 },
  { name: "Lukas_BER", location: "Berlin - DE", platform: "Android", score: 110 },
  { name: "Chiara94", location: "Palermo - IT", platform: "iOS", score: 70 },
  { name: "Oliver_LDN", location: "London - UK", platform: "iOS", score: 135 },
  { name: "Davide_Board", location: "Torino - IT", platform: "Android", score: 125 },
  { name: "Lucía_Mad", location: "Madrid - ES", platform: "iOS", score: 85 },
  { name: "Sara_Neon", location: "Napoli - IT", platform: "iOS", score: 85 },
  { name: "Camille_Lyon", location: "Lyon - FR", platform: "Android", score: 80 },
  { name: "Marco_Tac", location: "Bologna - IT", platform: "Android", score: 105 },
  { name: "Hanna_MUC", location: "München - DE", platform: "iOS", score: 90 },
  { name: "Giulia_K", location: "Firenze - IT", platform: "iOS", score: 130 },
  { name: "Emma_NYC", location: "New York - US", platform: "Android", score: 95 },
  { name: "Kenji_TKO", location: "Tokyo - JP", platform: "Android", score: 145 },
  { name: "Mateo_VLC", location: "Valencia - ES", platform: "Android", score: 130 },
  { name: "Sophie_AMS", location: "Amsterdam - NL", platform: "iOS", score: 100 },
  { name: "Marc_ZH", location: "Zürich - CH", platform: "Android", score: 115 },
  { name: "Julien_BDX", location: "Bordeaux - FR", platform: "iOS", score: 138 },
  { name: "Liam_MCR", location: "Manchester - UK", platform: "iOS", score: 105 },
  { name: "Jonas_KOLN", location: "Köln - DE", platform: "Android", score: 120 },
  { name: "Tiago_LIS", location: "Lisboa - PT", platform: "iOS", score: 75 },
];

export const OnlinePlayerSearchModal: React.FC<OnlinePlayerSearchModalProps> = ({
  isOpen,
  onClose,
  currentDeviceId,
  currentUserName,
  currentUserLocation,
  currentUserEmail,
  selectedGameMode,
  currentBoardTheme,
  isRandomAbaloneTheme,
  onSelectGameMode,
  onSelectBoardTheme,
  initialSearchQuery,
  onStartOnlineMatch,
  language,
}) => {
  const t = useMemo(() => ONLINE_MODAL_STRINGS[language] || ONLINE_MODAL_STRINGS.it, [language]);

  // Abalone Layout logic: use local storage preference or prop
  const isRandomAbalone = useMemo(() => {
    if (isRandomAbaloneTheme !== undefined) return isRandomAbaloneTheme;
    return localStorage.getItem("wallgo_abalone_random_theme") !== "false";
  }, [isRandomAbaloneTheme]);

  const [randomAbaloneTheme, setRandomAbaloneTheme] = useState<BoardTheme>(() => {
    return ALL_ABALONE_THEMES[Math.floor(Math.random() * ALL_ABALONE_THEMES.length)];
  });

  const handleRerollAbalone = () => {
    setRandomAbaloneTheme((prev) => {
      const candidates = ALL_ABALONE_THEMES.filter((thm) => thm !== prev);
      return candidates[Math.floor(Math.random() * candidates.length)];
    });
  };

  // When modal is reopened, if random mode is active, select a fresh random layout
  useEffect(() => {
    if (isOpen && isRandomAbalone) {
      setRandomAbaloneTheme(ALL_ABALONE_THEMES[Math.floor(Math.random() * ALL_ABALONE_THEMES.length)]);
    }
  }, [isOpen, isRandomAbalone]);

  const effectiveAbaloneTheme = useMemo((): BoardTheme => {
    if (isRandomAbalone) {
      return randomAbaloneTheme;
    }
    if (currentBoardTheme && currentBoardTheme.startsWith("abalone")) {
      return currentBoardTheme;
    }
    const savedTheme = (localStorage.getItem("wallgo_abalone_theme") as BoardTheme) || (localStorage.getItem("wallgo_theme") as BoardTheme);
    if (savedTheme && savedTheme.startsWith("abalone")) {
      return savedTheme;
    }
    return "abalone";
  }, [isRandomAbalone, randomAbaloneTheme, currentBoardTheme]);

  const availableGameOptions = useMemo(() => [
    { id: "dominio", mode: "dominio" as GameMode, label: getGameModeLabel("dominio", language), icon: "🧱" },
    { id: "corsa", mode: "corsa" as GameMode, label: getGameModeLabel("corsa", language), icon: "🏁" },
    { id: "pente", mode: "pente" as GameMode, label: getGameModeLabel("pente", language), icon: "⭐" },
    { id: "amazons", mode: "amazons" as GameMode, label: getGameModeLabel("amazons", language), icon: "🏹" },
    { id: "domineering", mode: "domineering" as GameMode, label: getGameModeLabel("domineering", language), icon: "⚔️" },
    { id: "hex", mode: "hex" as GameMode, label: getGameModeLabel("hex", language), icon: "⬡" },
    { id: "chain_triangle", mode: "chain_triangle" as GameMode, label: getGameModeLabel("chain_triangle", language), icon: "🔺" },
    { id: "orbito", mode: "orbito" as GameMode, label: getGameModeLabel("orbito", language), icon: "🪐" },
    { id: "shobu", mode: "shobu" as GameMode, label: getGameModeLabel("shobu", language), icon: "🪨" },
    { id: "yinsh", mode: "yinsh" as GameMode, label: getGameModeLabel("yinsh", language), icon: "💍" },
    { id: "abalone", mode: "abalone" as GameMode, label: getGameModeLabel("abalone", language), icon: "🎱" },
    { id: "onitama", mode: "onitama" as GameMode, label: getGameModeLabel("onitama", language), icon: "🏯" },
    { id: "baduk_9", mode: "baduk" as GameMode, theme: "baduk-9" as BoardTheme, label: "Baduk / Go (9x9)", icon: "⚫" },
    { id: "baduk_13", mode: "baduk" as GameMode, theme: "baduk-13" as BoardTheme, label: "Baduk / Go (13x13)", icon: "⚫" },
    { id: "baduk_19", mode: "baduk" as GameMode, theme: "baduk-19" as BoardTheme, label: "Baduk / Go (19x19)", icon: "⚫" },
    { id: "stratego", mode: "stratego" as GameMode, label: getGameModeLabel("stratego", language), icon: "🚩" },
  ], [language]);

  const [mounted, setMounted] = useState(false);
  const [targetGameMode, setTargetGameMode] = useState<GameMode>(selectedGameMode || "dominio");
  const [targetBoardTheme, setTargetBoardTheme] = useState<BoardTheme>(currentBoardTheme || "baduk-9");
  const [onlineStrategoPreset, setOnlineStrategoPreset] = useState<string>(() => {
    try {
      return localStorage.getItem("wallgo_stratego_preset") || "balanced";
    } catch (e) {
      return "balanced";
    }
  });
  
  useEffect(() => {
    if (selectedGameMode) setTargetGameMode(selectedGameMode);
  }, [selectedGameMode]);

  useEffect(() => {
    if (currentBoardTheme) setTargetBoardTheme(currentBoardTheme);
  }, [currentBoardTheme]);

  const currentSelectedOptionId = useMemo(() => {
    if (targetGameMode === "baduk") {
      if (targetBoardTheme === "baduk-19") return "baduk_19";
      if (targetBoardTheme === "baduk-13") return "baduk_13";
      return "baduk_9";
    }
    return targetGameMode;
  }, [targetGameMode, targetBoardTheme]);

  const handleSelectGameOption = (optionId: string) => {
    const selected = availableGameOptions.find((o) => o.id === optionId);
    if (!selected) return;
    setTargetGameMode(selected.mode);
    if (onSelectGameMode) onSelectGameMode(selected.mode);
    if (selected.theme) {
      setTargetBoardTheme(selected.theme);
      if (onSelectBoardTheme) onSelectBoardTheme(selected.theme);
    }
  };

  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");

  useEffect(() => {
    if (isOpen) {
      if (initialSearchQuery !== undefined) {
        setSearchQuery(initialSearchQuery);
      }
    } else {
      setSearchQuery("");
    }
  }, [isOpen, initialSearchQuery]);
  const [activeTab, setActiveTab] = useState<"players" | "directCode">("players");

  // Direct Room Code State
  const [customRoomCode, setCustomRoomCode] = useState("");
  const [directCodeError, setDirectCodeError] = useState<string | null>(null);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [waitingForFriend, setWaitingForFriend] = useState(false);

  // Invite Tracking State
  const [invitingPlayerId, setInvitingPlayerId] = useState<string | null>(null);
  const [currentInviteId, setCurrentInviteId] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "pending" | "accepted" | "declined">("idle");
  const [inviteCountdown, setInviteCountdown] = useState(45);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const inviteListenerUnsub = useRef<(() => void) | null>(null);
  const roomListenerUnsub = useRef<(() => void) | null>(null);
  const countdownIntervalRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (inviteListenerUnsub.current) inviteListenerUnsub.current();
      if (roomListenerUnsub.current) roomListenerUnsub.current();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedGameMode) {
      setTargetGameMode(selectedGameMode);
    }
  }, [selectedGameMode]);

  // Update current device presence to be visible right away
  const touchPresence = async () => {
    if (!db || !currentDeviceId) return;
    try {
      const nowIso = new Date().toISOString();
      const devRef = doc(db, "devices", currentDeviceId);
      await setDoc(devRef, {
        lastActive: nowIso,
        userName: currentUserName || "Player",
        userLocation: currentUserLocation || "",
        ...(currentUserEmail ? { userEmail: currentUserEmail } : {})
      }, { merge: true });
    } catch (err) {
      // Best effort update
    }
  };

  // Deterministically generate 1 or 2 fake players per 30-minute time slot
  const getSimulatedPlayers = (): ActivePlayer[] => {
    const THIRTY_MIN_MS = 30 * 60 * 1000;
    const now = Date.now();
    const timeSlot = Math.floor(now / THIRTY_MIN_MS);
    const count = (timeSlot % 2 === 0) ? 2 : 1;
    const result: ActivePlayer[] = [];

    for (let i = 0; i < count; i++) {
      const candidateIndex = (timeSlot * 2 + i) % AI_PLAYER_CANDIDATES.length;
      const candidate = AI_PLAYER_CANDIDATES[candidateIndex];
      const slotStartTime = timeSlot * THIRTY_MIN_MS;
      const slotElapsedMinutes = Math.min(29, Math.floor((now - slotStartTime) / 60000));
      const simulatedMinutesAgo = (i * 2 + slotElapsedMinutes % 5);

      // Il punteggio non deve mai superare i 150 punti
      const calculatedScore = Math.min(150, Math.max(15, candidate.score + (timeSlot % 5) * 2));

      result.push({
        id: `ai_simulated_${timeSlot}_${i}`,
        userName: candidate.name,
        userLocation: candidate.location,
        lastActive: new Date(now - simulatedMinutesAgo * 60000).toISOString(),
        platform: candidate.platform,
        model: candidate.platform,
        totalScore: calculatedScore,
        minutesAgo: simulatedMinutesAgo,
        isOnlineNow: simulatedMinutesAgo <= 4,
        isFakeAI: true,
      });
    }

    return result;
  };

  // Fetch active players
  const fetchActivePlayers = async () => {
    if (!db) return;
    setLoading(true);
    try {
      await touchPresence();
      const snap = await getDocs(collection(db, "devices"));
      const now = Date.now();
      const activeList: ActivePlayer[] = [];

      snap.forEach((docSnap) => {
        if (docSnap.id === currentDeviceId) return; // don't list ourselves by deviceId
        const data = docSnap.data();
        const lastActiveStr = data.lastActive || data.lastGamePlayedAt;
        if (!lastActiveStr) return;

        const lastActiveTime = new Date(lastActiveStr).getTime();
        const diffMs = now - lastActiveTime;
        const diffMinutes = Math.floor(diffMs / 60000);

        // Active within last 60 minutes
        if (diffMinutes >= -5 && diffMinutes <= 60) {
          const pName = data.userName?.trim() || t.player;
          const pLoc = data.userLocation?.trim() || "";
          const pEmail = data.userEmail?.trim() || "";

          // Se l'utente è loggato con lo stesso nome utente (es. su PC e cellulare)
          // non deve proporre se stessi tra i giocatori online disponibili
          const normCurrentName = currentUserName?.trim().toLowerCase();
          const normPlayerName = pName.toLowerCase();
          if (normCurrentName && normCurrentName !== "" && normPlayerName === normCurrentName) {
            return;
          }

          // Filtra anche in caso di stessa email registrata
          if (
            currentUserEmail &&
            currentUserEmail.trim() !== "" &&
            pEmail &&
            pEmail.toLowerCase() === currentUserEmail.trim().toLowerCase()
          ) {
            return;
          }
          
          activeList.push({
            id: docSnap.id,
            userName: pName,
            userLocation: pLoc,
            lastActive: lastActiveStr,
            model: data.model || data.platform || "",
            platform: data.platform || "",
            totalScore: data.totalScoreOverall || data.totalScore || 0,
            minutesAgo: Math.max(0, diffMinutes),
            isOnlineNow: diffMinutes <= 6,
          });
        }
      });

      // Se non ci sono altri giocatori online attivi, crea in automatico 1 o 2 finti giocatori dell'AI
      // che restano visibili per un massimo di 30 minuti e poi vengono sostituiti
      if (activeList.length === 0) {
        const simulated = getSimulatedPlayers();
        activeList.push(...simulated);
      }

      // Sort: players online now first, then by lowest minutesAgo
      activeList.sort((a, b) => {
        if (a.isOnlineNow && !b.isOnlineNow) return -1;
        if (!a.isOnlineNow && b.isOnlineNow) return 1;
        return a.minutesAgo - b.minutesAgo;
      });

      // Show only the first 10 players found
      setPlayers(activeList.slice(0, 10));
    } catch (e) {
      console.error("Error fetching active players:", e);
    } finally {
      setLoading(false);
    }
  };

  // On open, refresh player list and poll every 10 seconds
  useEffect(() => {
    if (isOpen) {
      fetchActivePlayers();
      const interval = setInterval(() => {
        fetchActivePlayers();
      }, 10000);
      return () => clearInterval(interval);
    } else {
      cleanupInvite();
    }
  }, [isOpen, currentDeviceId, currentUserName, currentUserEmail]);

  // Handle invite countdown expiration cleanly in effect
  useEffect(() => {
    if (inviteStatus === "pending" && inviteCountdown === 0) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setStatusMessage(t.inviteExpired);
      setInviteStatus("declined");
    }
  }, [inviteStatus, inviteCountdown, t.inviteExpired]);

  const cleanupInvite = () => {
    if (inviteListenerUnsub.current) {
      inviteListenerUnsub.current();
      inviteListenerUnsub.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setInvitingPlayerId(null);
    setCurrentInviteId(null);
    setInviteStatus("idle");
    setStatusMessage(null);
  };

  // Send an invitation to another player
  const handleSendInvite = async (player: ActivePlayer) => {
    if (!db || !currentDeviceId) return;
    cleanupInvite();

    setInvitingPlayerId(player.id);
    setInviteStatus("pending");
    setInviteCountdown(45);
    setStatusMessage(t.inviteSentWaiting(player.userName));

    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const roomId = `room_${inviteId}`;
    setCurrentInviteId(inviteId);

    // If this is a simulated AI player created when no real players are online,
    // simulate a realistic quick acceptance after 1.5 - 2.5 seconds and initialize the match!
    if (player.isFakeAI || player.id.startsWith("ai_simulated_")) {
      const selectedTheme = targetGameMode === "abalone" 
        ? effectiveAbaloneTheme 
        : targetGameMode === "baduk" 
        ? targetBoardTheme 
        : undefined;

      // Brief countdown simulation
      countdownIntervalRef.current = setInterval(() => {
        setInviteCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      setTimeout(async () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setInviteStatus("accepted");
        setStatusMessage(t.inviteAccepted);

        // Pre-populate an online_rooms document so the online room logic works smoothly if needed
        try {
          await setDoc(doc(db, "online_rooms", roomId), {
            roomId: roomId,
            gameMode: targetGameMode,
            boardTheme: selectedTheme || null,
            hostDeviceId: currentDeviceId,
            hostName: currentUserName || "Player",
            hostLocation: currentUserLocation || "",
            guestDeviceId: player.id,
            guestName: player.userName,
            guestLocation: player.userLocation,
            isGuestAI: true,
            status: "playing",
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          // Non-blocking
        }

        // Inserisci temporaneamente il giocatore finto nella classifica per 24 ore
        insertSimulatedPlayerToLeaderboard({
          name: player.userName,
          location: player.userLocation,
          score: player.totalScore,
          gameMode: targetGameMode,
        }).catch(() => {});

        setTimeout(() => {
          onStartOnlineMatch({
            roomId: roomId,
            gameMode: targetGameMode,
            boardTheme: selectedTheme,
            myPlayerIndex: 1, // Host
            opponentName: player.userName,
            opponentLocation: player.userLocation,
            opponentDeviceId: player.id,
            opponentScore: player.totalScore,
            isInviter: true,
            isSimulatedOpponent: true,
          });
          onClose();
        }, 800);
      }, 2000);
      return;
    }

    try {
      const inviteData: Record<string, any> = {
        fromDeviceId: currentDeviceId,
        fromName: currentUserName || "Player",
        fromLocation: currentUserLocation || "",
        toDeviceId: player.id,
        toName: player.userName,
        gameMode: targetGameMode,
        status: "pending",
        roomId: roomId,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      if (targetGameMode === "baduk" && targetBoardTheme) {
        inviteData.boardTheme = targetBoardTheme;
      } else if (targetGameMode === "abalone") {
        inviteData.boardTheme = effectiveAbaloneTheme;
      }

      await setDoc(doc(db, "game_invites", inviteId), inviteData);

      // Countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setInviteCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      // Listen for invite acceptance
      inviteListenerUnsub.current = onSnapshot(doc(db, "game_invites", inviteId), (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (data.status === "accepted") {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          setInviteStatus("accepted");
          setStatusMessage(t.inviteAccepted);
          setTimeout(() => {
            onStartOnlineMatch({
              roomId: data.roomId,
              gameMode: data.gameMode || targetGameMode,
              boardTheme: data.boardTheme || (targetGameMode === "abalone" ? effectiveAbaloneTheme : targetGameMode === "baduk" ? targetBoardTheme : undefined),
              myPlayerIndex: 1, // Host
              opponentName: player.userName,
              opponentLocation: player.userLocation,
              opponentDeviceId: player.id,
              isInviter: true,
            });
            onClose();
          }, 1000);
        } else if (data.status === "declined") {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          setInviteStatus("declined");
          setStatusMessage(t.inviteDeclined);
        }
      }, (err) => {
        console.warn("Firestore invite listener error:", err?.message || err);
      });
    } catch (err: any) {
      console.error("Failed to send invite:", err);
      setStatusMessage(t.inviteError);
      setInviteStatus("idle");
      setInvitingPlayerId(null);
    }
  };

  const handleCancelInvite = async () => {
    if (currentInviteId && db) {
      try {
        await updateDoc(doc(db, "game_invites", currentInviteId), {
          status: "canceled"
        });
      } catch (e) {
        // ignore
      }
    }
    cleanupInvite();
  };

  // Direct room code generator
  const handleCreatePrivateRoom = async () => {
    if (!db || !currentDeviceId) return;
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const roomId = `room_direct_${code}`;
    setCreatedRoomCode(code);
    setWaitingForFriend(true);

    try {
      const roomPayload: Record<string, any> = {
        roomId,
        code,
        hostDeviceId: currentDeviceId,
        hostName: currentUserName || "Player",
        hostLocation: currentUserLocation || "",
        guestDeviceId: null,
        guestName: null,
        gameMode: targetGameMode,
        status: "waiting",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (targetGameMode === "baduk" && targetBoardTheme) {
        roomPayload.boardTheme = targetBoardTheme;
      } else if (targetGameMode === "abalone") {
        roomPayload.boardTheme = effectiveAbaloneTheme;
      }

      await setDoc(doc(db, "online_rooms", roomId), roomPayload);

      // Listen for guest join
      roomListenerUnsub.current = onSnapshot(doc(db, "online_rooms", roomId), (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (data.status === "playing" && data.guestDeviceId) {
          if (roomListenerUnsub.current) roomListenerUnsub.current();
          onStartOnlineMatch({
            roomId,
            gameMode: targetGameMode,
            boardTheme: data.boardTheme || (targetGameMode === "abalone" ? effectiveAbaloneTheme : targetGameMode === "baduk" ? targetBoardTheme : undefined),
            myPlayerIndex: 1,
            opponentName: data.guestName || "Guest",
            opponentLocation: data.guestLocation || "",
            opponentDeviceId: data.guestDeviceId,
            isInviter: true,
          });
          onClose();
        }
      }, (err) => {
        console.warn("Firestore direct room listener error:", err?.message || err);
      });
    } catch (err) {
      console.error("Failed to create direct room:", err);
      setDirectCodeError(t.roomCreateError);
    }
  };

  // Join private room with code
  const handleJoinPrivateRoom = async () => {
    if (!db || !currentDeviceId || !customRoomCode.trim()) return;
    setDirectCodeError(null);
    setJoiningRoom(true);

    const cleanCode = customRoomCode.trim();
    const roomId = `room_direct_${cleanCode}`;

    try {
      const snap = await getDocs(collection(db, "online_rooms"));
      let targetRoom: any = null;

      snap.forEach((d) => {
        const data = d.data();
        if (data.code === cleanCode && data.status === "waiting") {
          targetRoom = data;
        }
      });

      if (!targetRoom) {
        setDirectCodeError(t.roomNotFound);
        setJoiningRoom(false);
        return;
      }

      // Join room as guest (Player 2)
      await updateDoc(doc(db, "online_rooms", targetRoom.roomId), {
        guestDeviceId: currentDeviceId,
        guestName: currentUserName || "Player 2",
        guestLocation: currentUserLocation || "",
        status: "playing",
        updatedAt: new Date().toISOString()
      });

      onStartOnlineMatch({
        roomId: targetRoom.roomId,
        gameMode: targetRoom.gameMode || targetGameMode,
        boardTheme: targetRoom.boardTheme || (targetGameMode === "abalone" ? effectiveAbaloneTheme : targetGameMode === "baduk" ? targetBoardTheme : undefined),
        myPlayerIndex: 2,
        opponentName: targetRoom.hostName || "Host",
        opponentLocation: targetRoom.hostLocation || "",
        opponentDeviceId: targetRoom.hostDeviceId,
        isInviter: false,
      });
      onClose();
    } catch (err: any) {
      setDirectCodeError(err.message || t.roomNotFound);
    } finally {
      setJoiningRoom(false);
    }
  };

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = !q
      ? players
      : players.filter((p) => p.userName.toLowerCase().includes(q) || p.userLocation.toLowerCase().includes(q));
    return list.slice(0, 10);
  }, [players, searchQuery]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-white my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Radio className="animate-pulse" size={22} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight flex items-center gap-2">
                  <span>{t.title}</span>
                </h2>
                <p className="text-xs text-slate-400">{t.subtitle}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* User Presence Status Pill */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300">
                {t.you} <strong className="text-white">{currentUserName || "Player"}</strong>
                {currentUserLocation ? ` (${currentUserLocation})` : ""}
              </span>
            </div>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} /> {t.visibleOnline}
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab("players")}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "players"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Users size={14} /> {t.activePlayersTab} ({players.length})
            </button>
            <button
              onClick={() => setActiveTab("directCode")}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "directCode"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Gamepad2 size={14} /> {t.roomCodeTab}
            </button>
          </div>
        </div>

        {/* Challenge Game Mode Selector */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800 shrink-0">
          <label className="text-xs font-semibold text-slate-400 mb-1.5 block flex items-center gap-1.5">
            <Gamepad2 size={13} className="text-indigo-400" /> {t.chooseGame}
          </label>
          <div className="relative">
            <select
              value={currentSelectedOptionId}
              onChange={(e) => handleSelectGameOption(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white font-medium text-xs sm:text-sm rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {availableGameOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.icon} {item.label}
                </option>
              ))}
            </select>
          </div>

          {targetGameMode === "abalone" && (
            <div className="mt-2.5 p-2 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex items-center justify-between gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                  🎱
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>{t.abaloneLayoutLabel}</span>
                    {isRandomAbalone ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold flex items-center gap-0.5">
                        <span>🎲</span> {t.abaloneRandomLabel}
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-extrabold flex items-center gap-0.5">
                        <span>⚙️</span> {t.abaloneFromSettingsLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-black text-emerald-300 truncate">
                    {getAbaloneLayoutName(effectiveAbaloneTheme, language)}
                  </div>
                </div>
              </div>
              {isRandomAbalone && (
                <button
                  type="button"
                  onClick={handleRerollAbalone}
                  title={t.abaloneRerollLabel}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs text-amber-300 border border-amber-500/30 rounded-lg flex items-center gap-1 transition-all shrink-0 font-bold"
                >
                  <RefreshCw size={11} className="text-amber-400" />
                  <span className="text-[10px] sm:text-[11px]">{t.abaloneRerollLabel}</span>
                </button>
              )}
            </div>
          )}

          {targetGameMode === "stratego" && (
            <div className="mt-2.5 p-2 rounded-xl bg-slate-900/90 border border-amber-500/40 flex flex-col gap-1.5 animate-in fade-in duration-200">
              <label htmlFor="online-stratego-preset-select" className="text-[10px] uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>📐</span>
                <span>{language === "it" ? "Schema schieramento iniziale:" : "Initial deployment schema:"}</span>
              </label>
              <div className="relative">
                <select
                  id="online-stratego-preset-select"
                  value={onlineStrategoPreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOnlineStrategoPreset(val);
                    try {
                      localStorage.setItem("wallgo_stratego_preset", val);
                    } catch (err) {}
                  }}
                  className="w-full appearance-none bg-slate-800 text-amber-300 font-bold border border-amber-500/30 hover:border-amber-400 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer pr-7"
                >
                  <option value="balanced" className="bg-slate-900 text-white font-bold">
                    {language === "it" ? "⚖️ Bilanciato Tattico" : "⚖️ Tactical Balanced"}
                  </option>
                  <option value="wall" className="bg-slate-900 text-white font-bold">
                    {language === "it" ? "🛡️ Muraglia Difensiva" : "🛡️ Defensive Wall"}
                  </option>
                  <option value="blitz" className="bg-slate-900 text-white font-bold">
                    {language === "it" ? "⚡ Attacco Blitz" : "⚡ Blitz Assault"}
                  </option>
                  <option value="bluff" className="bg-slate-900 text-white font-bold">
                    {language === "it" ? "🎭 Doppio Bluff" : "🎭 Double Bluff"}
                  </option>
                  <option value="fortress" className="bg-slate-900 text-white font-bold">
                    {language === "it" ? "🏰 Fortezza con Bombe" : "🏰 Fortress Defense"}
                  </option>
                  <option value="personal" className="bg-slate-900 text-amber-300 font-bold">
                    {language === "it" ? "⭐ Schieramento Personale" : "⭐ Custom Deployment"}
                  </option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-400 font-black">
                  ▾
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {activeTab === "players" && (
            <>
              {/* Search input & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={fetchActivePlayers}
                  disabled={loading}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all shrink-0"
                >
                  <RefreshCw size={13} className={loading ? "animate-spin text-emerald-400" : ""} />
                  {t.refresh}
                </button>
              </div>

              {/* Status Banner when invitation active */}
              {statusMessage && (
                <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex flex-col gap-2 ${
                  inviteStatus === "accepted" 
                    ? "bg-emerald-950/50 border-emerald-500 text-emerald-300"
                    : inviteStatus === "declined"
                    ? "bg-rose-950/50 border-rose-500 text-rose-300"
                    : "bg-indigo-950/60 border-indigo-500/80 text-indigo-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-2">
                      {inviteStatus === "pending" && <Clock size={16} className="animate-spin text-indigo-400" />}
                      {inviteStatus === "accepted" && <CheckCircle2 size={16} className="text-emerald-400" />}
                      {inviteStatus === "declined" && <XCircle size={16} className="text-rose-400" />}
                      {statusMessage}
                    </span>
                    {inviteStatus === "pending" && (
                      <span className="text-xs font-mono font-bold bg-indigo-900/80 px-2 py-0.5 rounded-full">
                        {inviteCountdown}s
                      </span>
                    )}
                  </div>
                  {targetGameMode === "abalone" && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-slate-900/80 border border-emerald-500/30 rounded-lg px-2.5 py-1 w-fit font-semibold">
                      <span>🎱 {t.abaloneLayoutLabel}</span>
                      <span className="font-bold text-white">
                        {getAbaloneLayoutName(effectiveAbaloneTheme, language)}
                      </span>
                      {isRandomAbalone && (
                        <span className="text-[10px] text-amber-300 font-bold">🎲</span>
                      )}
                    </div>
                  )}
                  {inviteStatus === "pending" && (
                    <button
                      onClick={handleCancelInvite}
                      className="self-end px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                    >
                      {t.cancelInvite}
                    </button>
                  )}
                </div>
              )}

              {/* Players List (compact layout, top 10) */}
              <div className="space-y-1.5">
                {loading && players.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw size={24} className="animate-spin text-emerald-400" />
                    <span>{t.searchingPlayers}</span>
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-slate-400 text-xs flex flex-col items-center gap-3">
                    <Globe size={32} className="text-slate-600" />
                    <p className="max-w-xs leading-relaxed">
                      {t.noActivePlayers}
                    </p>
                    <button
                      onClick={fetchActivePlayers}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-2"
                    >
                      <RefreshCw size={14} /> {t.checkAgain}
                    </button>
                  </div>
                ) : (
                  filteredPlayers.map((player) => {
                    const isBeingInvited = invitingPlayerId === player.id && inviteStatus === "pending";
                    const nameLen = player.userName.length;
                    const nameFontSizeClass = nameLen > 22 
                      ? "text-[11px] sm:text-xs" 
                      : nameLen > 15 
                      ? "text-xs sm:text-sm" 
                      : "text-xs sm:text-sm";
                    return (
                      <div
                        key={player.id}
                        className="py-2 px-3 sm:py-2 sm:px-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <div className={`w-8 h-8 rounded-full bg-slate-800 border flex items-center justify-center text-xs font-black text-indigo-300 shadow-inner ${
                              player.isOnlineNow ? "border-emerald-500/50" : "border-slate-700"
                            }`}>
                              {player.userName.charAt(0).toUpperCase()}
                            </div>
                            <span 
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                                player.isOnlineNow ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" : "bg-amber-500"
                              }`} 
                              title={player.isOnlineNow ? t.onlineNow : `${player.minutesAgo} ${t.minAgo}`}
                            />
                          </div>

                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div 
                              className={`font-bold text-white leading-tight tracking-tight whitespace-nowrap overflow-x-auto no-scrollbar ${nameFontSizeClass}`} 
                              title={player.userName}
                            >
                              {player.userName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate leading-none">
                              {player.userLocation ? (
                                <span className="truncate text-slate-300">
                                  📍 {player.userLocation}
                                </span>
                              ) : (
                                <span className="text-slate-500">{t.player}</span>
                              )}
                              {typeof player.totalScore === "number" && (
                                <span className="text-amber-300 font-semibold shrink-0">
                                  • 🏆 {player.totalScore} {t.pts}
                                </span>
                              )}
                              {!player.isOnlineNow && (
                                <span className="text-slate-500 shrink-0">
                                  • {player.minutesAgo} {t.minAgo}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          disabled={isBeingInvited || inviteStatus === "pending"}
                          onClick={() => handleSendInvite(player)}
                          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 ${
                            isBeingInvited
                              ? "bg-indigo-600/50 text-indigo-200 cursor-not-allowed"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          }`}
                        >
                          {isBeingInvited ? (
                            <>
                              <Clock size={13} className="animate-spin" /> {t.sent}
                            </>
                          ) : (
                            <>
                              <Send size={12} /> {t.invite}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeTab === "directCode" && (
            <div className="space-y-5">
              {/* Option 1: Create a room and share code */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  {t.createRoomTitle}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.createRoomDesc}
                </p>

                {createdRoomCode ? (
                  <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/60 flex flex-col items-center gap-2">
                    <span className="text-xs text-indigo-300">{t.yourRoomCode}</span>
                    <span className="font-mono text-3xl font-black tracking-widest text-white select-all">
                      {createdRoomCode}
                    </span>
                    <span className="text-xs text-indigo-200 flex items-center gap-1.5 mt-1">
                      <Clock size={14} className="animate-spin text-indigo-400" />
                      {t.waitingForFriend}
                    </span>
                    {targetGameMode === "abalone" && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-slate-900/80 border border-emerald-500/30 rounded-lg px-2.5 py-1 mt-1 font-semibold">
                        <span>🎱 {t.abaloneLayoutLabel}</span>
                        <span className="font-bold text-white">
                          {getAbaloneLayoutName(effectiveAbaloneTheme, language)}
                        </span>
                        {isRandomAbalone && (
                          <span className="text-[10px] text-amber-300 font-bold">🎲</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleCreatePrivateRoom}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} /> {t.generateRoomCode}
                  </button>
                )}
              </div>

              {/* Option 2: Enter code to join friend */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Gamepad2 size={16} className="text-emerald-400" />
                  {t.haveCodeTitle}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.haveCodeDesc}
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={customRoomCode}
                    onChange={(e) => setCustomRoomCode(e.target.value.trim())}
                    placeholder={t.codePlaceholder}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-mono text-sm text-center text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    disabled={joiningRoom || !customRoomCode.trim()}
                    onClick={handleJoinPrivateRoom}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {joiningRoom ? <RefreshCw size={14} className="animate-spin" /> : t.join}
                  </button>
                </div>

                {directCodeError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <XCircle size={14} /> {directCodeError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>{t.p2pFooter}</span>
          <button onClick={onClose} className="hover:text-slate-300 transition-colors">
            {t.close}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
