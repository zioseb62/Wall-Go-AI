import React, { useState, useEffect, useCallback, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  PlayerId,
  Point,
  GameState,
  Wall,
  AIAction,
  Player,
  Difficulty,
  PlayerStats,
  Language,
  StrategyAdvice,
  BoardTheme,
  StartingPlayerPreference,
  GameMode,
  Peg,
  Triangle,
} from "./types";
import { PLAYER_COLORS, GRID_SIZE } from "./constants";
import {
  calculateTerritory,
  serializeWall,
  removeWall,
  canPlayerMove,
  canPhysicallyMove,
  getReachableCells,
  getWallOptions,
  getNeighbors,
  isValidCell,
  findPath,
  isValidFugaWall,
  getAbaloneUV,
  getAbalonePointFromUV,
  getAbalonePossibleMoves,
  checkOrbitoWinner,
  checkPenteWinner,
  getAbaloneStartingPositions,
  ALL_ABALONE_THEMES,
} from "./utils/gameLogic";
import {
  getBestMoveForAI,
  getBestAmazonsMoveForAI,
  getBestSetupForAI,
  getBestBreakForAI,
  getBestDomineeringMoveForAI,
  getBestAbaloneMoveForAI,
  getBestOrbitoMoveForAI,
  getBestShobuMoveForAI,
} from "./utils/aiLogic";
import { getBestPenteMoveForAI } from "./utils/penteLogic";
import { performBadukMove, getBestBadukMoveForAI, detectInitialBadukDeadStones, toggleBadukDeadGroup } from "./utils/badukLogic";
import Board from "./components/Board";
import { generateTriggleBoard, generateAllTriangles, getLineOfPegs, getEdgesFromPegs, getEdgeId, getBestChainTriangleMoveForAI, hasValidChainTriangleMoves } from "./utils/chainTriangleLogic";
import ChainTriangleBoard from "./components/ChainTriangleBoard";
import YinshBoard from "./components/YinshBoard";
import OnitamaBoard from "./components/OnitamaBoard";
import StrategoBoard, { StrategoDifficulty, StrategoStarter } from "./components/StrategoBoard";
import { historyData } from "./utils/historyData";
import { createInitialYinshState, getValidYinshMoves, performYinshMove, checkYinshLines, getBestYinshMoveForAI } from "./utils/yinshLogic";
import { createInitialOnitamaState, ONITAMA_CARDS, getBestOnitamaMoveForAI } from "./onitama";
import { getStrategyAdvice } from "./services/geminiService"; // Ora è locale, manteniamo il nome file per semplicità o potremmo rinominarlo
import { SoundManager } from "./utils/soundManager";
import { Confetti } from "./components/Confetti";
import { Fireworks } from "./components/Fireworks";
import { translations } from "./utils/translations";
import { Logo } from "./components/Logo";
import { getRandomQuote, Quote } from "./utils/quotes";
import { SplashScreen } from "./components/SplashScreen";
import { LeaderboardModal } from "./components/LeaderboardModal";
import { AdminStatsModal } from "./components/AdminStatsModal";
import { Logger } from "./utils/logger";
import { saveStorageItem, saveStorageItemsBatch, loadStorageItem, loadStorageItemsBatch, removeStorageItem, mergePlayerStats, getUserStatsKey } from "./utils/storage";
import { DailyMissionsState, generateDailyMissions, getTodayDateString } from "./utils/dailyMissions";
import { DailyMissionsModal } from "./components/DailyMissionsModal";
import { DesktopTriviaPanel } from "./components/DesktopTriviaPanel";
import { OnlinePlayerSearchModal, AI_PLAYER_CANDIDATES } from "./components/OnlinePlayerSearchModal";
import { insertSimulatedPlayerToLeaderboard, pruneExpiredSimulatedPlayers } from "./utils/simulatedLeaderboard";
import { PWAInstallButton } from "./components/PWAInstallButton";
import { IncomingInviteModal, IncomingInviteData } from "./components/IncomingInviteModal";
import { PostOnlineMatchModal } from "./components/PostOnlineMatchModal";
import { Radio, Maximize, Minimize, LogOut } from "lucide-react";

import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  increment,
  getDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  getCountFromServer,
  arrayUnion,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";


const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

import packageJson from "./package.json";

const APP_VERSION = packageJson.version;
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://ais-pre-nmt23mxb4hxlpx5nw7mzvm-26997898689.europe-west3.run.app";
const SUPPORT_EMAIL = "ziosebzioseb@gmail.com";
const DEVELOPER_NAME = "ZioSeb Studio";
const VIDEO_MODE = false; // Set to true for landscape video recording

const isVersionOlder = (v1: string, v2: string) => {
  const p1 = v1.split(".").map(Number);
  const p2 = v2.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((p1[i] || 0) < (p2[i] || 0)) return true;
    if ((p1[i] || 0) > (p2[i] || 0)) return false;
  }
  return false;
};

const calculatePointsSpent = (unlockedModes: string[] | undefined, userName: string, userLocation: string, freeUnlockedModes?: string[]): number => {
  if (!unlockedModes) return 0;
  if (userName === "ZioSeb" || (userName && userName.toLowerCase() === "zioseb")) return 0;
  
  const FREE_MODES = [
    "dominio", "pente", "amazons", "corsa", "domineering", 
    "abalone", "hex", "orbito", "chain_triangle", "yinsh", "baduk", "onitama", "shobu"
  ];
  
  let spent = 0;
  const uniqueUnlockedModes = Array.from(new Set(unlockedModes));
  uniqueUnlockedModes.forEach(m => {
    if (FREE_MODES.includes(m)) return;
    if (freeUnlockedModes && freeUnlockedModes.includes(m)) return; // Keep backwards compatibility just in case
    spent += 50;
  });
  return spent;
};

const DEFAULT_STATS: PlayerStats = {
  2: { wins: 0, losses: 0, hardWins: 0 },
  3: { wins: 0, losses: 0, hardWins: 0 },
  4: { wins: 0, losses: 0, hardWins: 0 },
  badges: [],
  totalScore: 0,
  totalShobuScore: 0,
  totalOnitamaScore: 0,
  unlockedModes: ["dominio", "baduk"],
  totalPenteScore: 0,
};

const BADGE_POINTS: Record<string, number> = {
  cervellone: 5,
  dominatore: 10,
  abalone_hard: 20,
  hex_hard: 20,
  orbito_hard: 20,
  maestro: 30,
  fuga_hard: 20,
  amazons_hard: 20,
  chain_triangle_medium: 10,
  chain_triangle_hard: 20,
  shobu_master: 15,
  yinsh_master: 20,
  onitama_hard: 20,
  baduk_extreme: 30,
  pente_extreme: 30,
  domineering_extreme: 30,
  stratego_master: 30,
};

const getStatKeyForMode = (mode: string): string => {
  if (mode === "stratego") return "strategoStats";
  if (mode === "onitama") return "onitamaStats";
  if (mode === "shobu") return "shobuStats";
  if (mode === "yinsh") return "yinshStats";
  if (mode === "chain_triangle") return "chainTriangleStats";
  if (mode === "pente") return "penteStats";
  if (mode === "orbito") return "orbitoStats";
  if (mode === "hex") return "hexStats";
  if (mode === "abalone") return "abaloneStats";
  if (mode === "domineering") return "domineeringStats";
  if (mode === "baduk") return "badukStats";
  if (mode === "corsa") return "corsaStats";
  if (mode === "amazons") return "amazonsStats";
  return "stats";
};

const getOnlineMatchWinPoints = (mode: GameMode | string, theme?: BoardTheme): number => {
  if (mode === "stratego") return 30;
  if (mode === "amazons") return 25;
  if (mode === "yinsh") return 30;
  if (mode === "baduk") {
    if (theme === "baduk-19") return 75;
    if (theme === "baduk-13") return 50;
    return 35;
  }
  if (mode === "orbito" || mode === "chain_triangle") return 10;
  if (mode === "pente" || mode === "hex") return 15;
  if (mode === "abalone" || mode === "onitama" || mode === "domineering" || mode === "shobu" || mode === "corsa" || mode === "dominio") return 20;
  return 20;
};

const applyModeScore = (currentStats: PlayerStats, mode: GameMode | string, delta: number): PlayerStats => {
  const updated = { ...currentStats };
  if (mode === "stratego") {
    updated.totalStrategoScore = Math.max(0, (updated.totalStrategoScore || 0) + delta);
  } else if (mode === "amazons") {
    updated.totalAmazonsScore = Math.max(0, (updated.totalAmazonsScore || 0) + delta);
  } else if (mode === "corsa") {
    updated.totalFugaScore = Math.max(0, (updated.totalFugaScore || 0) + delta);
  } else if (mode === "abalone") {
    updated.totalAbaloneScore = Math.max(0, (updated.totalAbaloneScore || 0) + delta);
  } else if (mode === "chain_triangle") {
    updated.totalChainTriangleScore = Math.max(0, (updated.totalChainTriangleScore || 0) + delta);
  } else if (mode === "orbito") {
    updated.totalOrbitoScore = Math.max(0, (updated.totalOrbitoScore || 0) + delta);
  } else if (mode === "pente") {
    updated.totalPenteScore = Math.max(0, (updated.totalPenteScore || 0) + delta);
  } else if (mode === "shobu") {
    updated.totalShobuScore = Math.max(0, (updated.totalShobuScore || 0) + delta);
  } else if (mode === "yinsh") {
    updated.totalYinshScore = Math.max(0, (updated.totalYinshScore || 0) + delta);
  } else if (mode === "onitama") {
    updated.totalOnitamaScore = Math.max(0, (updated.totalOnitamaScore || 0) + delta);
  } else if (mode === "baduk") {
    updated.totalBadukScore = Math.max(0, (updated.totalBadukScore || 0) + delta);
  } else if (mode === "domineering") {
    updated.totalDomineeringScore = Math.max(0, (updated.totalDomineeringScore || 0) + delta);
  } else if (mode === "hex") {
    updated.totalHexScore = Math.max(0, (updated.totalHexScore || 0) + delta);
  } else {
    // Wall Go (dominio)
    updated.totalScore = Math.max(0, (updated.totalScore || 0) + delta);
  }
  return updated;
};

const App: React.FC = () => {
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [logs, setLogs] = useState(Logger.getLogs());
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );

  const initialGameMode =
    (localStorage.getItem("wallgo_gamemode") as GameMode) || "dominio";
  const getInitialBoardTheme = (): BoardTheme => {
    const savedTheme = localStorage.getItem(
      "wallgo_theme",
    ) as BoardTheme | null;
    if (initialGameMode === "corsa") return "corsa";
    if (initialGameMode === "shobu") return savedTheme === "shobu-scacchiera" ? "shobu-scacchiera" : "shobu";
    if (initialGameMode === "hex") return "hex";
    if (initialGameMode === "orbito") return "orbito";
    if (initialGameMode === "pente") return "pente";
    if (initialGameMode === "chain_triangle") return "chain_triangle";
    if (initialGameMode === "abalone")
      return savedTheme && savedTheme.startsWith("abalone")
        ? savedTheme
        : "abalone";
    if (initialGameMode === "domineering") return "domineering";
    if (initialGameMode === "amazons")
      return savedTheme && savedTheme.startsWith("amazons")
        ? savedTheme
        : "amazons-6";
    if (initialGameMode === "onitama") return savedTheme === "onitama-light" ? "onitama-light" : "onitama-dark";
    if (initialGameMode === "baduk") return savedTheme && savedTheme.startsWith("baduk") ? savedTheme : "baduk-9";
    return savedTheme &&
      !savedTheme.startsWith("abalone") &&
      !savedTheme.startsWith("amazons") &&
      !savedTheme.startsWith("shobu") &&
      !savedTheme.startsWith("baduk") &&
      !savedTheme.startsWith("onitama") &&
      savedTheme !== "domineering" &&
      savedTheme !== "corsa" &&
      savedTheme !== "hex" &&
      savedTheme !== "orbito" &&
      savedTheme !== "pente" &&
      savedTheme !== "chain_triangle"
      ? savedTheme
      : "neon";
  };

  const [boardTheme, setBoardTheme] =
    useState<BoardTheme>(getInitialBoardTheme);
  const [badukStoneColor, setBadukStoneColor] = useState<"neon" | "classic">(() => {
    return (localStorage.getItem("wallgo_baduk_stone_color") as "neon" | "classic") || "classic";
  });
  const [isRandomAbaloneTheme, setIsRandomAbaloneTheme] = useState<boolean>(
    () => {
      return localStorage.getItem("wallgo_abalone_random_theme") !== "false";
    },
  );

  const [gameState, setGameState] = useState<GameState>({
    players: [],
    walls: [],
    currentPlayerIndex: 0,
    turnPhase: "setup",
    setupStep: 0,
    selectedPieceIndex: null,
    moveBackupPos: null,
    winner: null,
    status: "setup",
    history: [],
    territoryMap: {},
    difficulty: "normale",
    usedWallbreakerThisTurn: false,
    consecutivePasses: 0,
    lastPlacedPiece: null,
    lastMoveByPlayer: {},
    boardTheme: getInitialBoardTheme(),
    turnCount: 0,
  });

  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(
    initialGameMode === "abalone" ||
      initialGameMode === "domineering" ||
      initialGameMode === "amazons"
      ? 2
      : 2,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    () =>
      (localStorage.getItem(
        `wallGoDifficulty_${initialGameMode}`,
      ) as Difficulty) ||
      (localStorage.getItem("wallGoDifficulty") as Difficulty) ||
      "normale",
  );

  const [gameMode, setGameMode] = useState<GameMode>(initialGameMode);
  const [pcSelectedGame, setPcSelectedGame] = useState<string>(initialGameMode || "dominio");
  const [humanMovesInSession, setHumanMovesInSession] = useState(0);
  const [savedGamesVersion, setSavedGamesVersion] = useState<number>(0);

  useEffect(() => {
    if (gameMode) {
      setPcSelectedGame(gameMode);
    }
  }, [gameMode]);

  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);
  const [isOnlineExitConfirmOpen, setIsOnlineExitConfirmOpen] = useState(false);
  interface OnlineMatchSession {
    roomId: string;
    gameMode: GameMode;
    boardTheme?: BoardTheme;
    myPlayerIndex: 1 | 2;
    opponentName: string;
    opponentLocation?: string;
    opponentDeviceId?: string;
    opponentScore?: number;
    isInviter?: boolean;
    isSimulatedOpponent?: boolean;
  }
  const [onlineMatchSession, setOnlineMatchSession] = useState<OnlineMatchSession | null>(null);
  const [isOnlineSearchOpen, setIsOnlineSearchOpen] = useState(false);
  const [onlineSearchInitialQuery, setOnlineSearchInitialQuery] = useState("");
  const [showPostOnlineInviteModal, setShowPostOnlineInviteModal] = useState(false);
  const [hasShownPostOnlineInviteModal, setHasShownPostOnlineInviteModal] = useState(false);
  const [postOnlineInviteSession, setPostOnlineInviteSession] = useState<OnlineMatchSession | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<IncomingInviteData | null>(null);
  const previousOnlineTurnCount = useRef<number>(-1);
  const processedOnlineEndRoomsRef = useRef<Set<string>>(new Set());

  // Salvataggio e ripresa dedicati per partite multiplayer a Baduk/Go
  const [isBadukOnlineExitModalOpen, setIsBadukOnlineExitModalOpen] = useState(false);
  const [isSavingOnlineBaduk, setIsSavingOnlineBaduk] = useState(false);
  const [isResumeOnlineBadukModalOpen, setIsResumeOnlineBadukModalOpen] = useState(false);
  const [pendingResumeBadukSave, setPendingResumeBadukSave] = useState<any | null>(null);

  const getBadukPairKey = (name1: string, name2: string) => {
    const n1 = (name1 || "player1").trim().toLowerCase();
    const n2 = (name2 || "player2").trim().toLowerCase();
    return [n1, n2].sort().join("__vs__").replace(/[^a-z0-9_]/gi, "_");
  };

  const appStateRef = useRef({
    status: gameState.status,
    humanMoves: humanMovesInSession,
    isOnline: false,
    gameMode: gameState.gameMode || gameMode
  });


  
useEffect(() => {
    badukWorkerRef.current = new Worker(new URL('./utils/badukWorker.ts', import.meta.url), { type: 'module' });
    pruneExpiredSimulatedPlayers().catch(() => {});
    return () => {
       badukWorkerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (gameState.status === "playing" && appStateRef.current.status !== "playing") {
      setHumanMovesInSession(0);
    }
    appStateRef.current = {
      status: gameState.status,
      humanMoves: humanMovesInSession,
      isOnline: !!onlineMatchSession,
      gameMode: gameState.gameMode || gameMode
    };
  }, [gameState.status, humanMovesInSession, onlineMatchSession]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (appStateRef.current.isOnline) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    localStorage.setItem(`wallGoDifficulty_${gameMode}`, difficulty);
    localStorage.setItem("wallGoDifficulty", difficulty);
  }, [difficulty, gameMode]);
  const [hasSeenFugaRules, setHasSeenFugaRules] = useState(
    () => localStorage.getItem("hasSeenFugaRules") === "true",
  );
  const [hasSeenDomineeringRules, setHasSeenDomineeringRules] = useState(
    () => localStorage.getItem("hasSeenDomineeringRules") === "true",
  );
  const [hasSeenAbaloneRules, setHasSeenAbaloneRules] = useState(
    () => localStorage.getItem("hasSeenAbaloneRules") === "true",
  );
  const [hasSeenHexRules, setHasSeenHexRules] = useState(
    () => localStorage.getItem("hasSeenHexRules") === "true",
  );
  const [hasSeenOrbitoRules, setHasSeenOrbitoRules] = useState(
    () => localStorage.getItem("hasSeenOrbitoRules") === "true",
  );
  const [startingPreference, setStartingPreference] =
    useState<StartingPlayerPreference>("human");
  const [isStartingPreferenceEnabled, setIsStartingPreferenceEnabled] =
    useState(true);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [adviceObj, setAdviceObj] = useState<StrategyAdvice | null>(null);
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);
  const [aiTrace, setAiTrace] = useState<{ from: Point; to: Point } | null>(
    null,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "account">(
    "general",
  );
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState<GameMode | null>(null);
  const [isOrbitoRulesOpen, setIsOrbitoRulesOpen] = useState(false);
  const [isPenteRulesOpen, setIsPenteRulesOpen] = useState(false);
  const [isShobuRulesOpen, setIsShobuRulesOpen] = useState(false);
  const [isYinshRulesOpen, setIsYinshRulesOpen] = useState(false);
  const [isOnitamaRulesOpen, setIsOnitamaRulesOpen] = useState(false);
  const [isBadukRulesOpen, setIsBadukRulesOpen] = useState(false);
  const [isStrategoRulesOpen, setIsStrategoRulesOpen] = useState(false);
  const [strategoDifficulty, setStrategoDifficulty] = useState<StrategoDifficulty>("medium");
  const [strategoStarter, setStrategoStarter] = useState<"human" | "ai" | "random">("human");
  const [strategoPreset, setStrategoPreset] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("wallgo_stratego_preset");
        if (stored) return stored;
        if (localStorage.getItem("wallgo_stratego_personal_preset")) {
          return "personal";
        }
      }
    } catch (e) {}
    return "balanced";
  });
  const [hasSeenPenteRules, setHasSeenPenteRules] = useState(
    () => localStorage.getItem("hasSeenPenteRules") === "true",
  );
  const [hasSeenShobuRules, setHasSeenShobuRules] = useState(
    () => localStorage.getItem("hasSeenShobuRules") === "true"
  );
  const [hasSeenYinshRules, setHasSeenYinshRules] = useState(
    () => localStorage.getItem("hasSeenYinshRules") === "true"
  );
  const [hasSeenOnitamaRules, setHasSeenOnitamaRules] = useState(
    () => localStorage.getItem("hasSeenOnitamaRules") === "true"
  );


  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.screen && window.screen.orientation && typeof (window.screen.orientation as any).lock === "function") {
        (window.screen.orientation as any).lock("portrait").catch(() => {});
      }
    } catch (e) {}
  }, []);

  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [hasDismissedResumeModal, setHasDismissedResumeModal] = useState(false);
  const [pendingSavedGameInfo, setPendingSavedGameInfo] = useState<{ mode: GameMode; savedData: any } | null>(null);
  const [isResumedGame, setIsResumedGame] = useState(false);
  const [strategoSavedGame, setStrategoSavedGame] = useState<any | null>(null);

  useEffect(() => {
    // Il messaggio popup per riprendere la partita contro l'AI appare se c'è una partita salvata per il gioco selezionato o per l'ultimo salvataggio
    if (hasDismissedResumeModal || gameState.status !== "setup") {
      return;
    }

    let modeToCheck = gameMode;
    if (typeof window !== "undefined") {
      const lastSavedMode = localStorage.getItem("wallgo_last_saved_mode") as GameMode | null;
      if (lastSavedMode && localStorage.getItem(`wallgo_saved_game_${lastSavedMode}`)) {
        modeToCheck = lastSavedMode;
      } else if (!localStorage.getItem(`wallgo_saved_game_${gameMode}`) && localStorage.getItem("wallgo_saved_game_stratego")) {
        modeToCheck = "stratego";
      }
    }

    const savedString = typeof window !== "undefined" ? localStorage.getItem(`wallgo_saved_game_${modeToCheck}`) : null;

    if (savedString) {
      try {
        const saved = JSON.parse(savedString);
        setPendingSavedGameInfo({ mode: modeToCheck, savedData: saved });
        setIsResumeModalOpen(true);
      } catch (e) {
        setPendingSavedGameInfo(null);
        setIsResumeModalOpen(false);
      }
    } else {
      setPendingSavedGameInfo(null);
      setIsResumeModalOpen(false);
    }
  }, [gameMode, savedGamesVersion, gameState.status, hasDismissedResumeModal]);

  const [hasSeenBadukRules, setHasSeenBadukRules] = useState(
    () => localStorage.getItem("hasSeenBadukRules") === "true"
  );
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAdminStatsOpen, setIsAdminStatsOpen] = useState(false);
  const [userName, setUserName] = useState("Player");
  const [userLocation, setUserLocation] = useState("");
  const [userComment, setUserComment] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isTester, setIsTester] = useState(false);
  const isAdmin = (userName === "ZioSeb" && userLocation === "Sant'Alfio") || userEmail.toLowerCase() === "ziosebzioseb@gmail.com";
  const isStrategoAdmin = isAdmin ||
    userEmail.toLowerCase().includes("zioseb") ||
    userName.toLowerCase() === "zioseb" ||
    (typeof window !== "undefined" && (
      localStorage.getItem("userEmail")?.toLowerCase().includes("zioseb") ||
      localStorage.getItem("userName") === "ZioSeb" ||
      localStorage.getItem("wallgo_admin") === "true" ||
      window.location.search.includes("admin=true")
    ));

  const handleOpenStratego = useCallback(async () => {
    SoundManager.stopVictory();
    SoundManager.startBackgroundMusic();
    setGameMode("stratego");
    setPcSelectedGame("stratego");
    setSetupView("details");
    setGameState((prev) => ({ ...prev, status: "setup" }));

    // Check if there is a saved game for Stratego
    try {
      const localSaved = typeof window !== "undefined" ? localStorage.getItem("wallgo_saved_game_stratego") : null;
      const savedString = localSaved || (await loadStorageItem("wallgo_saved_game_stratego"));
      if (savedString) {
        const savedData = JSON.parse(savedString);
        setPendingSavedGameInfo({ mode: "stratego", savedData });
        setHasDismissedResumeModal(false);
        setIsResumeModalOpen(true);
      } else {
        setPendingSavedGameInfo(null);
        setIsResumeModalOpen(false);
      }
    } catch (e) {
      console.error("Error checking saved game for Stratego:", e);
      setPendingSavedGameInfo(null);
      setIsResumeModalOpen(false);
    }
  }, []);
  const [deviceId, setDeviceId] = useState("");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [stats, setStats] = useState<PlayerStats>(DEFAULT_STATS);
  const isModeUnlocked = useCallback((mode: string) => {
    if (isTester && userEmail.toLowerCase().includes("@gmail.com")) return true;
    return (stats.unlockedModes && stats.unlockedModes.includes(mode as GameMode)) || (stats.freeUnlockedModes && stats.freeUnlockedModes.includes(mode as GameMode));
  }, [isTester, userEmail, stats.unlockedModes, stats.freeUnlockedModes]);

  const [cloudScore, setCloudScore] = useState<number | null>(null);



  const [tempUserName, setTempUserName] = useState("");
  const [tempUserLocation, setTempUserLocation] = useState("");
  const [tempUserComment, setTempUserComment] = useState("");
  const [tempUserEmail, setTempUserEmail] = useState("");
  const [tempIsTester, setTempIsTester] = useState(false);
  const [profileState, setProfileState] = useState<"idle" | "checking" | "confirm_existing" | "suggest_new">("idle");
  const [profileSuggestion, setProfileSuggestion] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (isRegistrationOpen || isSettingsOpen) {
      setTempUserName(userName === "Player" ? "" : userName);
      setTempUserLocation(userLocation);
      setTempUserComment(userComment);
      setTempUserEmail(userEmail);
      setTempIsTester(isTester);
      setProfileState("idle");
      setProfileError(null);
    }
  }, [isRegistrationOpen, isSettingsOpen, userName, userLocation]);

  const validateProfile = async (
    targetName: string, 
    targetLocation: string,
    context: "registration" | "settings" = "settings"
  ) => {
    setProfileError(null);
    const trimmedName = targetName.trim();
    if (trimmedName.length < 2) {
      setProfileError(
        language === "it"
          ? "Il nome deve contenere almeno 2 caratteri."
          : "Name must be at least 2 characters.",
      );
      return false;
    }
    const lowerName = trimmedName.toLowerCase();
    if (
      lowerName.includes("http") ||
      lowerName.includes("www.") ||
      lowerName.includes(".com") ||
      lowerName.includes(".it")
    ) {
      setProfileError(
        language === "it"
          ? "Non sono ammessi indirizzi web."
          : "Web addresses are not allowed.",
      );
      return false;
    }
    const badWords = [
      "cazzo", "merda", "stronzo", "puttana", "troia",
      "porco", "bastardo", "dio", "madonna", "cristo",
    ];
    if (badWords.some((word) => new RegExp(`\\b${word}\\b`, "i").test(lowerName))) {
      setProfileError(
        language === "it"
          ? "Il nome contiene parole non consentite."
          : "Name contains disallowed words.",
      );
      return false;
    }

    setProfileState("checking");

    try {
      const q = query(collection(db, "devices"), where("userName", "==", trimmedName));
      const snap = await getDocs(q);
      
      let exactMatchFound = false;
      let differentLocationFound = false;
      let otherDeviceFound = false;

      snap.docs.forEach(d => {
         const data = d.data();
         if (d.id !== deviceId) {
             otherDeviceFound = true;
             const docLocation = (data.userLocation || "").trim();
             if (docLocation.toLowerCase() === targetLocation.trim().toLowerCase()) {
                 exactMatchFound = true;
             } else {
                 differentLocationFound = true;
             }
         }
      });

      // In SETTINGS: user cannot rename their profile to another existing device's username!
      if (context === "settings" && trimmedName.toLowerCase() !== userName.toLowerCase() && otherDeviceFound) {
          setProfileError(
            language === "it"
              ? "Questo nome utente è già in uso. Scegli un nome diverso."
              : "This username is already in use. Please choose a different name."
          );
          setProfileState("idle");
          return false;
      }
      
      if (context === "registration") {
        if (exactMatchFound) {
            setProfileState("confirm_existing");
            return false;
        }

        if (differentLocationFound) {
            setProfileState("suggest_new");
            setProfileSuggestion(`${trimmedName}${Math.floor(Math.random() * 1000)}`);
            return false;
        }
      } else {
        if (differentLocationFound) {
            setProfileState("suggest_new");
            setProfileSuggestion(`${trimmedName}${Math.floor(Math.random() * 1000)}`);
            return false;
        }
      }
      
      setProfileState("idle");
      return true;

    } catch(e) {
      console.error(e);
      setProfileError(language === "it" ? "Errore durante la verifica del profilo." : "Error verifying profile.");
      setProfileState("idle");
      return false;
    }
  };

  const syncUserDataToFirebase = async (
    targetDeviceId: string,
    targetUserName: string,
    targetUserLocation: string,
    targetStats: PlayerStats,
    targetUserComment = "",
    targetUserEmail = "",
    targetIsTester = false,
    oldUserName?: string,
    oldUserLocation?: string
  ) => {
    if (!targetDeviceId || !targetUserName || targetUserName === "Player") return;

    try {
      const now = new Date().toISOString();
      const deviceRef = doc(db, "devices", targetDeviceId);
      
      const info = { osVersion: "unknown", model: navigator.userAgent, platform: "web" };

      await setDoc(deviceRef, {
        userName: targetUserName,
        userLocation: targetUserLocation,
        userComment: targetUserComment,
        userEmail: targetUserEmail,
        isTester: targetIsTester,
        lastActive: now,
        osVersion: info.osVersion,
        model: info.model,
        platform: info.platform,
        totalScore: targetStats.totalScore || 0,
        totalFugaScore: targetStats.totalFugaScore || 0,
        totalAmazonsScore: targetStats.totalAmazonsScore || 0,
        totalDomineeringScore: targetStats.totalDomineeringScore || 0,
        totalAbaloneScore: targetStats.totalAbaloneScore || 0,
        totalHexScore: targetStats.totalHexScore || 0,
        totalChainTriangleScore: targetStats.totalChainTriangleScore || 0,
        totalPenteScore: targetStats.totalPenteScore || 0,
        totalShobuScore: targetStats.totalShobuScore || 0,
        totalYinshScore: targetStats.totalYinshScore || 0,
        totalOnitamaScore: targetStats.totalOnitamaScore || 0,
        totalOrbitoScore: targetStats.totalOrbitoScore || 0,
        totalBadukScore: targetStats.totalBadukScore || 0,
        totalOnlineMatches: targetStats.totalOnlineMatches || 0,
        unlockedModes: targetStats.unlockedModes || [],
        version: APP_VERSION
      }, { merge: true });

      // Clean up old leaderboard document on rename so old name is not orphaned with stale score
      if (oldUserName && oldUserName !== "Player" && oldUserName !== targetUserName) {
        try {
          const oldLoc = oldUserLocation !== undefined ? oldUserLocation : targetUserLocation;
          const oldSlug = oldLoc
            ? `${oldUserName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${oldLoc.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
            : oldUserName.toLowerCase().replace(/[^a-z0-9]/g, "_");
          const oldSlugPlain = oldUserName.toLowerCase().replace(/[^a-z0-9]/g, "_");
          await deleteDoc(doc(db, "leaderboard", oldSlug));
          if (oldSlugPlain !== oldSlug) {
            await deleteDoc(doc(db, "leaderboard", oldSlugPlain));
          }
        } catch (e) {
          console.warn("Could not clean up old leaderboard doc on rename:", e);
        }
      }

      const newSlug = targetUserLocation
        ? `${targetUserName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${targetUserLocation.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
        : targetUserName.toLowerCase().replace(/[^a-z0-9]/g, "_");

      const displayName = targetUserLocation ? `${targetUserName} (${targetUserLocation})` : targetUserName;

      const calcGamesObj = (obj: any) => {
        if (!obj) return 0;
        let sum = 0;
        Object.values(obj).forEach((val: any) => {
          if (typeof val === 'object' && val !== null) {
            sum += (val.wins || 0) + (val.losses || 0);
          } else if (typeof val === 'number') {
            sum += val;
          }
        });
        return sum;
      };

      const baseGames = calcGamesObj(targetStats[2]) + calcGamesObj(targetStats[3]) + calcGamesObj(targetStats[4]) + calcGamesObj(targetStats.stats);
      const corsaGames = calcGamesObj(targetStats.corsaStats);
      const amazonsGames = calcGamesObj(targetStats.amazonsStats);
      const domineeringGames = calcGamesObj(targetStats.domineeringStats);
      const abaloneGames = calcGamesObj(targetStats.abaloneStats);
      const hexGames = calcGamesObj(targetStats.hexStats);
      const chainTriangleGames = calcGamesObj(targetStats.chainTriangleStats);
      const penteGames = calcGamesObj(targetStats.penteStats);
      const shobuGames = calcGamesObj(targetStats.shobuStats);
      const yinshGames = calcGamesObj(targetStats.yinshStats);
      const onitamaGames = calcGamesObj(targetStats.onitamaStats);
      const orbitoGames = calcGamesObj(targetStats.orbitoStats);
      const badukGames = calcGamesObj(targetStats.badukStats);

      const totalGamesOverall = baseGames + corsaGames + amazonsGames + domineeringGames + abaloneGames + hexGames + chainTriangleGames + penteGames + shobuGames + yinshGames + onitamaGames + orbitoGames + badukGames;

      const pointsSpent = calculatePointsSpent(targetStats.unlockedModes || [], targetUserName, targetUserLocation, targetStats.freeUnlockedModes || []);

      const totalScoreOverall = Math.max(0,
        (targetStats.totalScore || 0) +
        (targetStats.totalFugaScore || 0) +
        (targetStats.totalAmazonsScore || 0) +
        (targetStats.totalDomineeringScore || 0) +
        (targetStats.totalAbaloneScore || 0) +
        (targetStats.totalHexScore || 0) +
        (targetStats.totalChainTriangleScore || 0) +
        (targetStats.totalPenteScore || 0) +
        (targetStats.totalShobuScore || 0) +
        (targetStats.totalYinshScore || 0) +
        (targetStats.totalOnitamaScore || 0) +
        (targetStats.totalOrbitoScore || 0) +
        (targetStats.totalBadukScore || 0) - pointsSpent
      );

      await setDoc(doc(db, "leaderboard", newSlug), {
        userName: displayName,
        totalScore: targetStats.totalScore || 0,
        totalFugaScore: targetStats.totalFugaScore || 0,
        totalAmazonsScore: targetStats.totalAmazonsScore || 0,
        totalDomineeringScore: targetStats.totalDomineeringScore || 0,
        totalAbaloneScore: targetStats.totalAbaloneScore || 0,
        totalHexScore: targetStats.totalHexScore || 0,
        totalChainTriangleScore: targetStats.totalChainTriangleScore || 0,
        totalPenteScore: targetStats.totalPenteScore || 0,
        totalShobuScore: targetStats.totalShobuScore || 0,
        totalYinshScore: targetStats.totalYinshScore || 0,
        totalOnitamaScore: targetStats.totalOnitamaScore || 0,
        totalOrbitoScore: targetStats.totalOrbitoScore || 0,
        totalBadukScore: targetStats.totalBadukScore || 0,
        totalScoreOverall: totalScoreOverall,
        totalGamesOverall: totalGamesOverall,
        totalGamesTarget: {
          generale: baseGames,
          corsa: corsaGames,
          amazons: amazonsGames,
          domineering: domineeringGames,
          abalone: abaloneGames,
          hex: hexGames,
          chain_triangle: chainTriangleGames,
          pente: penteGames,
          shobu: shobuGames,
          yinsh: yinshGames,
          onitama: onitamaGames,
          orbito: orbitoGames,
          baduk: badukGames,
        },
        lastActive: now,
      }, { merge: true });

    } catch (e) {
      console.error("Failed to sync user data to Firebase:", e);
    }
  };

  const saveConfirmedProfile = async (context: "registration" | "settings") => {
      const trimmedName = tempUserName.trim();
      const trimmedLocation = tempUserLocation.trim();
      const trimmedComment = tempUserComment.trim();
      const trimmedEmail = tempUserEmail.trim();
      
      const oldName = userName;
      const oldLocation = userLocation;
      const isNameChanging = oldName && oldName !== "Player" && oldName !== trimmedName;

      setUserName(trimmedName);
      setUserLocation(trimmedLocation);
      setUserComment(trimmedComment);
      setUserEmail(trimmedEmail);
      setIsTester(tempIsTester);
      setProfileState("idle");
      setProfileError(null);
      
      if (context === "registration") {
         setIsRegistrationOpen(false);
         if (!localStorage.getItem("wallgo_rules_seen")) {
            setIsRulesOpen(true);
            saveStorageItem("wallgo_rules_seen", "true");
         }
      } else {
         setIsSettingsOpen(false);
      }

      try {
        await saveStorageItemsBatch(
          ["wallgo_name", "wallgo_location", "wallgo_comment", "wallgo_email", "wallgo_tester", "wallgo_has_registered"],
          [trimmedName, trimmedLocation, trimmedComment, trimmedEmail, tempIsTester ? "true" : "false", "true"]
        );
      } catch (e) {
        console.error("Error saving profile to storage:", e);
      }

      let activeUserStats = stats;

      // STRICT SCORE ISOLATION:
      // If the username has changed, NEVER pass the previous user's stats to the new profile!
      if (isNameChanging) {
        // 1. Archive old user stats locally under the old user key
        try {
          const oldStatsKey = getUserStatsKey(oldName, oldLocation);
          await saveStorageItem(oldStatsKey, JSON.stringify(stats));
        } catch (e) {
          console.error("Error archiving old user stats:", e);
        }

        // 2. Check if local stats already exist for the new profile
        const newStatsKey = getUserStatsKey(trimmedName, trimmedLocation);
        let loadedNewStats: PlayerStats | null = null;
        try {
          const savedNewStr = await loadStorageItem(newStatsKey);
          if (savedNewStr && savedNewStr !== "undefined") {
            loadedNewStats = JSON.parse(savedNewStr);
          }
        } catch (e) {}

        // If not in local storage, check if this profile exists in Firestore devices
        if (!loadedNewStats) {
          try {
            const devQ = query(
              collection(db, "devices"),
              where("userName", "==", trimmedName)
            );
            const devSnap = await getDocs(devQ);
            devSnap.forEach(d => {
              const data = d.data();
              if ((data.userLocation || "").trim().toLowerCase() === trimmedLocation.trim().toLowerCase()) {
                loadedNewStats = {
                  2: data.stats?.[2] || { wins: 0, losses: 0 },
                  3: data.stats?.[3] || { wins: 0, losses: 0 },
                  4: data.stats?.[4] || { wins: 0, losses: 0 },
                  stats: data.stats || {},
                  totalScore: data.totalScore || 0,
                  totalFugaScore: data.totalFugaScore || 0,
                  totalAmazonsScore: data.totalAmazonsScore || 0,
                  totalDomineeringScore: data.totalDomineeringScore || 0,
                  totalAbaloneScore: data.totalAbaloneScore || 0,
                  totalHexScore: data.totalHexScore || 0,
                  totalChainTriangleScore: data.totalChainTriangleScore || 0,
                  totalPenteScore: data.totalPenteScore || 0,
                  totalShobuScore: data.totalShobuScore || 0,
                  totalYinshScore: data.totalYinshScore || 0,
                  totalOnitamaScore: data.totalOnitamaScore || 0,
                  totalOrbitoScore: data.totalOrbitoScore || 0,
                  totalBadukScore: data.totalBadukScore || 0,
                  totalOnlineMatches: data.totalOnlineMatches || 0,
                  unlockedModes: data.unlockedModes || ["dominio"],
                  freeUnlockedModes: data.freeUnlockedModes || ["dominio"],
                  badges: data.badges ? (Array.isArray(data.badges) ? data.badges : Object.entries(data.badges).map(([id, b]: any) => ({ id, ...b }))) : [],
                };
              }
            });
          } catch (e) {
            console.error("Error fetching new user profile data:", e);
          }
        }

        // If brand new username, initialize clean default stats
        if (!loadedNewStats) {
          loadedNewStats = {
            2: { wins: 0, losses: 0 },
            3: { wins: 0, losses: 0 },
            4: { wins: 0, losses: 0 },
            totalScore: 0,
            badges: [],
            unlockedModes: ["dominio"],
            freeUnlockedModes: ["dominio"],
          };
        }

        activeUserStats = loadedNewStats;
        setStats(activeUserStats);
        saveStorageItem("wallgo_stats", JSON.stringify(activeUserStats));
        saveStorageItem(newStatsKey, JSON.stringify(activeUserStats));
      }

      if (deviceId && trimmedName && trimmedName !== "Player") {
        syncUserDataToFirebase(deviceId, trimmedName, trimmedLocation, activeUserStats, trimmedComment, trimmedEmail, tempIsTester, oldName, oldLocation);
      }
  };

  const handleSaveProfile = async (context: "registration" | "settings") => {
      if (profileState === "confirm_existing") {
         await saveConfirmedProfile(context);
         return;
      }

      if (profileState === "suggest_new") {
         return;
      }

      const isValid = await validateProfile(tempUserName, tempUserLocation, context);
      if (isValid) {
         await saveConfirmedProfile(context);
      }
  };

  useEffect(() => {
    if (userName && userName !== "Player") {
      const fetchCloudScore = async () => {
        try {
          const slug = userLocation 
            ? `${userName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${userLocation.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
            : userName.toLowerCase().replace(/[^a-z0-9]/g, "_");
          const d = await getDoc(doc(db, "leaderboard", slug));
          if (d.exists() && d.data().totalScoreOverall !== undefined) {
            setCloudScore(d.data().totalScoreOverall);
          }
        } catch (e) {
          console.error("Failed to fetch cloud score:", e);
        }
      };
      fetchCloudScore();
    }
  }, [userName, isRegistrationOpen]);
  const [language, setLanguage] = useState<Language>(() => {
    const savedLang = localStorage.getItem("wallgo_lang");
    if (savedLang) return savedLang as Language;
    return "en";
  });
  const [musicVolume, setMusicVolume] = useState<number>(100);
  const [sfxVolume, setSfxVolume] = useState<number>(100);
  const [isStrategyEnabled, setIsStrategyEnabled] = useState(false); // Default OFF al primo avvio
  const [isWallBreakingMode, setIsWallBreakingMode] = useState(false);
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<{
    id: string;
    name: string;
    desc: string;
    icon: string;
    date?: string;
    isUnlocked: boolean;
    difficulty?: "normale" | "difficile" | "estrema";
  } | null>(null);
  const [difficultyToast, setDifficultyToast] = useState<string | null>(null);
  const difficultyToastTimeout = useRef<NodeJS.Timeout | null>(null);
  const [comingSoonToast, setComingSoonToast] = useState<string | null>(null);
  const comingSoonToastTimeout = useRef<NodeJS.Timeout | null>(null);
  const [shobuWarningToast, setShobuWarningToast] = useState<string | null>(null);
  const shobuWarningToastTimeout = useRef<NodeJS.Timeout | null>(null);
  const [aiPassToast, setAiPassToast] = useState<string | null>(null);
  const aiPassToastTimeout = useRef<NodeJS.Timeout | null>(null);
  const badukWorkerRef = useRef<Worker | null>(null);
  const [undoWindowActive, setUndoWindowActive] = useState(false);
  const [setupView, setSetupView] = useState<"grid" | "details">("grid");
  const [homePageSlide, setHomePageSlide] = useState<number>(0);
  const homeCarouselRef = useRef<HTMLDivElement | null>(null);
  const homeTouchStartX = useRef<number | null>(null);
  const homeTouchStartY = useRef<number | null>(null);

  const scrollToHomeSlide = (slideIndex: number) => {
    setHomePageSlide(slideIndex);
    if (homeCarouselRef.current) {
      const width = homeCarouselRef.current.clientWidth;
      homeCarouselRef.current.scrollTo({
        left: slideIndex * width,
        behavior: "smooth",
      });
    }
  };

  const handleHomeCarouselScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const width = target.clientWidth;
    if (width > 0) {
      const page = Math.round(target.scrollLeft / width);
      if (page !== homePageSlide) {
        setHomePageSlide(page);
      }
    }
  };

  const handleHomeTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    homeTouchStartX.current = e.touches[0].clientX;
    homeTouchStartY.current = e.touches[0].clientY;
  };

  const handleHomeTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (homeTouchStartX.current !== null && homeTouchStartY.current !== null) {
      const deltaX = e.changedTouches[0].clientX - homeTouchStartX.current;
      const deltaY = e.changedTouches[0].clientY - homeTouchStartY.current;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 35) {
        if (deltaX < 0) {
          // Swiped left -> scroll to Slide 1 (Chain Triangle)
          scrollToHomeSlide(1);
        } else {
          // Swiped right -> scroll to Slide 0 (13 Giochi)
          scrollToHomeSlide(0);
        }
      }
      homeTouchStartX.current = null;
      homeTouchStartY.current = null;
    }
  };

  useEffect(() => {
    if (gameState.status === "setup" && setupView === "details") {
      loadStorageItem(`wallgo_saved_game_${gameMode}`).then((res) => {
        if (res) {
          setSavedGamesVersion((v) => v + 1);
        }
      });
    }
  }, [gameMode, setupView, gameState.status]);
  const [unlockModalMode, setUnlockModalMode] = useState<GameMode | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [isExitAlertOpen, setIsExitAlertOpen] = useState(false);
  const [dailyMissions, setDailyMissions] = useState<DailyMissionsState | null>(null);
  const [isDailyMissionsOpen, setIsDailyMissionsOpen] = useState(false);

  const appStatusRef = useRef({
    status: gameState.status,
    setupView,
    isAnyModalOpen: isSettingsOpen || isRulesOpen || isHistoryOpen || isLeaderboardOpen || isRegistrationOpen || isAdminStatsOpen || isPrivacyOpen || isOrbitoRulesOpen || isPenteRulesOpen || isShobuRulesOpen || isYinshRulesOpen || isOnitamaRulesOpen || isBadukRulesOpen || isStrategoRulesOpen || unlockModalMode !== null || isDailyMissionsOpen
  });

  useEffect(() => {
    appStatusRef.current = {
      status: gameState.status,
      setupView,
      isAnyModalOpen: isSettingsOpen || isRulesOpen || isHistoryOpen || isLeaderboardOpen || isRegistrationOpen || isAdminStatsOpen || isPrivacyOpen || isOrbitoRulesOpen || isPenteRulesOpen || isShobuRulesOpen || isYinshRulesOpen || isOnitamaRulesOpen || isBadukRulesOpen || isStrategoRulesOpen || unlockModalMode !== null || isDailyMissionsOpen
    };
  }, [gameState.status, setupView, isSettingsOpen, isRulesOpen, isHistoryOpen, isLeaderboardOpen, isRegistrationOpen, isAdminStatsOpen, isPrivacyOpen, isOrbitoRulesOpen, isPenteRulesOpen, isShobuRulesOpen, isYinshRulesOpen, isOnitamaRulesOpen, isBadukRulesOpen, isStrategoRulesOpen, unlockModalMode, isDailyMissionsOpen]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      const doc = document as any;
      return !!(document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
    }
    return false;
  });

  const enterFullScreen = useCallback(async () => {
    try {
      const docEl = document.documentElement as any;
      const isAlreadyFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement);
      if (isAlreadyFs) return;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } catch (e) {
      // Ignored
    }
  }, []);

  const exitFullScreen = useCallback(async () => {
    try {
      const doc = document as any;
      const isFs = !!(document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      if (!isFs) return;
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (e) {
      // Ignored
    }
  }, []);

  const toggleFullScreen = useCallback(() => {
    const doc = document as any;
    const isFs = !!(document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
    if (isFs) {
      exitFullScreen();
    } else {
      enterFullScreen();
    }
  }, [enterFullScreen, exitFullScreen]);

  const hideMobileAddressBar = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        window.scrollTo(0, 1);
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 80);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const updateFs = () => {
      const doc = document as any;
      setIsFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
    };
    document.addEventListener("fullscreenchange", updateFs);
    document.addEventListener("webkitfullscreenchange", updateFs);
    document.addEventListener("mozfullscreenchange", updateFs);
    document.addEventListener("MSFullscreenChange", updateFs);
    return () => {
      document.removeEventListener("fullscreenchange", updateFs);
      document.removeEventListener("webkitfullscreenchange", updateFs);
      document.removeEventListener("mozfullscreenchange", updateFs);
      document.removeEventListener("MSFullscreenChange", updateFs);
    };
  }, []);

  // When a match starts or resumes (gameState.status === 'playing'), automatically attempt fullscreen & collapse browser bars
  useEffect(() => {
    if (gameState.status === "playing") {
      enterFullScreen();
      hideMobileAddressBar();

      // On mobile browsers where programmatic fullscreen requires a direct user touch gesture,
      // trigger it on the very first touch/click inside the playing game
      const onUserGesture = () => {
        enterFullScreen();
        hideMobileAddressBar();
      };
      window.addEventListener("touchstart", onUserGesture, { once: true, passive: true });
      window.addEventListener("click", onUserGesture, { once: true, passive: true });
      return () => {
        window.removeEventListener("touchstart", onUserGesture);
        window.removeEventListener("click", onUserGesture);
      };
    }
  }, [gameState.status, enterFullScreen, hideMobileAddressBar]);

  // Helper to check if a username is an auto-generated guest name or default placeholder
  const isInvalidOrGuestName = (str: string | null | undefined): boolean => {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    if (s === "" || s === "player" || s === "guest" || s === "anonymous" || s === "undefined" || s === "null" || s === "unknown") {
      return true;
    }
    if (s.startsWith("guest ") || s.startsWith("guest_") || /^guest[0-9a-z_-]+/i.test(s.trim())) {
      return true;
    }
    return false;
  };


  // Continuously ensure device and leaderboard documents in Firebase stay 100% aligned
  useEffect(() => {
    if (!userName || userName === "Player" || !deviceId) return;

    const timeout = setTimeout(() => {
      syncUserDataToFirebase(deviceId, userName, userLocation, stats, userComment, userEmail, isTester);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [userName, userLocation, deviceId, stats, userComment, userEmail, isTester]);

  // One-time retroactive credit removed to prevent global score inflation
  useEffect(() => {
    // Disabled
  }, []);

  const handleExitApp = async () => {
    setIsExitAlertOpen(false);
    try {
      if (Capacitor.isNativePlatform()) {
        await CapacitorApp.exitApp();
        return;
      }
    } catch (e) {
      console.warn("Capacitor App exit error:", e);
    }

    try {
      window.close();
    } catch (e) {}

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      if (typeof window !== "undefined" && !window.closed) {
        window.location.href = "about:blank";
      }
    } catch (e) {
      console.warn("Browser exit fallback error:", e);
    }
  };

  const modesScrollRef = useRef<HTMLDivElement>(null);

  const handleUnlockMode = async (mode: GameMode | null) => {
    if (!mode) return;
    const cost = mode === "shobu" && isAdmin ? 0 : 50;

    // Use current stats from state for the check
    const currentAbalone = stats.totalAbaloneScore || 0;
    const currentHex = stats.totalHexScore || 0;
    const currentFuga = stats.totalFugaScore || 0;
    const currentAmazons = stats.totalAmazonsScore || 0;
    const currentDomineering = stats.totalDomineeringScore || 0;
    const currentWallGo = stats.totalScore || 0;
    const currentOrbito = stats.totalOrbitoScore || 0;
    const currentPente = stats.totalPenteScore || 0;
    const currentShobu = stats.totalShobuScore || 0;
    const currentChainTriangle = stats.totalChainTriangleScore || 0;
    const currentYinsh = stats.totalYinshScore || 0;
    const currentOnitama = stats.totalOnitamaScore || 0;
    const currentBaduk = stats.totalBadukScore || 0;

    const pointsSpent = calculatePointsSpent(stats.unlockedModes, userName, userLocation, stats.freeUnlockedModes);
    const globalScore = Number(
      Math.max(
        0,
        currentAbalone + currentHex + currentFuga + currentAmazons + currentDomineering + currentWallGo + currentOrbito + currentPente + currentShobu + currentChainTriangle + currentYinsh + currentOnitama + currentBaduk - pointsSpent
      ).toFixed(1)
    );

    console.log(
      `Attempting to unlock ${mode}. Cost: ${cost}, Current Global Score: ${globalScore}`,
    );

    if (globalScore < cost) {
      alert(
        language === "it"
          ? `Punteggio insufficiente! Ti servono ${cost} punti (ne hai ${globalScore}). Guadagna punti giocando a Wall Go o agli altri mini-giochi.`
          : `Insufficient score! You need ${cost} points (you have ${globalScore}). Earn points playing Wall Go or other mini-games.`,
      );
      setUnlockModalMode(null);
      return;
    }

    if (!stats.unlockedModes?.includes(mode)) {
      const currentUnlocked = stats.unlockedModes || [];
      if (!currentUnlocked.includes(mode)) {
        const newUnlocked = [...currentUnlocked, mode] as GameMode[];
        const updated = {
          ...stats,
          unlockedModes: newUnlocked,
        };

        setStats(updated);
        setCloudScore(prev => prev !== null ? Math.max(0, prev - cost) : null);
        saveStorageItem("wallgo_stats", JSON.stringify(updated));

        if (sfxVolume > 0) SoundManager.playPlaceWall();

        // Update Firebase (non-blocking for UI)
        if (userName !== "Player") {
          (async () => {
            try {
              const leaderboardId = userLocation
                ? `${userName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${userLocation.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
                : userName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "unknown";
              const leaderRef = doc(db, "leaderboard", leaderboardId);

              const deviceRef = doc(db, "devices", deviceId);
              await setDoc(
                deviceRef,
                {
                  unlockedModes: newUnlocked,
                  lastActive: new Date().toISOString(),
                },
                { merge: true },
              );
              console.log(`Firebase sync success for unlock: ${mode}`);
            } catch (e) {
              console.error("Firebase update error on unlock:", e);
            }
          })();
        }
      }
    }

    setUnlockModalMode(null);
    handleGameModeChange(mode);
    setSetupView("details");
  };

  const handleUnlockGameWithoutCost = async (mode: GameMode | null) => {
    if (!mode) return;
    
    if (!stats.unlockedModes?.includes(mode) || !stats.freeUnlockedModes?.includes(mode)) {
      const currentUnlocked = stats.unlockedModes || [];
      const currentFreeUnlocked = stats.freeUnlockedModes || [];
      
      const newUnlocked = currentUnlocked.includes(mode) ? currentUnlocked : [...currentUnlocked, mode] as GameMode[];
      const newFreeUnlocked = currentFreeUnlocked.includes(mode) ? currentFreeUnlocked : [...currentFreeUnlocked, mode] as GameMode[];
      
      const updated = {
        ...stats,
        unlockedModes: newUnlocked,
        freeUnlockedModes: newFreeUnlocked,
      };

      setStats(updated);
      saveStorageItem("wallgo_stats", JSON.stringify(updated));

      if (sfxVolume > 0) SoundManager.playPlaceWall();

      if (userName !== "Player") {
        (async () => {
          try {
            const deviceRef = doc(db, "devices", deviceId);
            await setDoc(
              deviceRef,
              {
                unlockedModes: newUnlocked,
                freeUnlockedModes: newFreeUnlocked,
                lastActive: new Date().toISOString(),
              },
              { merge: true },
            );
            console.log(`Firebase sync success for FREE unlock: ${mode}`);
          } catch (e) {
            console.error("Firebase update error on FREE unlock:", e);
          }
        })();
      }
    }

    setUnlockModalMode(null);
    setIsHistoryOpen(false);
    handleGameModeChange(mode);
    setSetupView("details");
  };

  const handleGameModeChange = async (mode: GameMode) => {
    SoundManager.stopVictory();
    setGameMode(mode);
    
    // Controlla se è presente una partita salvata contro l'AI per questa specifica modalità
    try {
      const localSaved = typeof window !== "undefined" ? localStorage.getItem(`wallgo_saved_game_${mode}`) : null;
      const savedString = localSaved || (await loadStorageItem(`wallgo_saved_game_${mode}`));
      if (savedString) {
        const savedData = JSON.parse(savedString);
        setPendingSavedGameInfo({ mode, savedData });
        setHasDismissedResumeModal(false);
        setIsResumeModalOpen(true);
      } else {
        setPendingSavedGameInfo(null);
        setIsResumeModalOpen(false);
        setHasDismissedResumeModal(true);
      }
    } catch (e) {
      console.error("Error checking saved game for mode:", e);
      setPendingSavedGameInfo(null);
      setIsResumeModalOpen(false);
      setHasDismissedResumeModal(true);
    }
    
    // Check first-time rules
    if (mode === "orbito" && !hasSeenOrbitoRules) {
      setHasSeenOrbitoRules(true);
      localStorage.setItem("hasSeenOrbitoRules", "true");
      setIsOrbitoRulesOpen(true);
    }
    if (mode === "pente" && !hasSeenPenteRules) {
      setHasSeenPenteRules(true);
      localStorage.setItem("hasSeenPenteRules", "true");
      setIsPenteRulesOpen(true);
    }
    if (mode === "shobu" && !hasSeenShobuRules) {
      setHasSeenShobuRules(true);
      localStorage.setItem("hasSeenShobuRules", "true");
      setIsShobuRulesOpen(true);
    }
    if (mode === "yinsh" && !hasSeenYinshRules) {
      setHasSeenYinshRules(true);
      localStorage.setItem("hasSeenYinshRules", "true");
      setIsYinshRulesOpen(true);
    }
    if (mode === "onitama" && !hasSeenOnitamaRules) {
      setHasSeenOnitamaRules(true);
      localStorage.setItem("hasSeenOnitamaRules", "true");
      setIsOnitamaRulesOpen(true);
    }
    if (mode === "baduk" && !hasSeenBadukRules) {
      setHasSeenBadukRules(true);
      localStorage.setItem("hasSeenBadukRules", "true");
      setIsBadukRulesOpen(true);
    }
    if (mode === "corsa" && !hasSeenFugaRules) {
      setHasSeenFugaRules(true);
      localStorage.setItem("hasSeenFugaRules", "true");
      setIsRulesOpen(true);
    }
    if (mode === "domineering" && !hasSeenDomineeringRules) {
      setHasSeenDomineeringRules(true);
      localStorage.setItem("hasSeenDomineeringRules", "true");
      setIsRulesOpen(true);
    }
    if (mode === "abalone" && !hasSeenAbaloneRules) {
      setHasSeenAbaloneRules(true);
      localStorage.setItem("hasSeenAbaloneRules", "true");
      setIsRulesOpen(true);
    }
    if (mode === "hex" && !hasSeenHexRules) {
      setHasSeenHexRules(true);
      localStorage.setItem("hasSeenHexRules", "true");
      setIsRulesOpen(true);
    }

    // Set playerCount and theme defaults
    if (
      mode === "corsa" ||
      mode === "amazons" ||
      mode === "domineering" ||
      mode === "abalone" ||
      mode === "hex" ||
      mode === "orbito" ||
      mode === "pente"
    ) {
      if (playerCount > 2 || (mode === "corsa" && playerCount === 3))
        setPlayerCount(2);
    }
    if (mode === "dominio" || mode === "corsa") {
      if (
        boardTheme.startsWith("amazons") ||
        boardTheme === "domineering" ||
        boardTheme.startsWith("abalone") ||
        boardTheme === "hex" ||
        boardTheme === "orbito" ||
        boardTheme === "pente" ||
        boardTheme === "chain_triangle" ||
        boardTheme.startsWith("shobu") ||
        boardTheme.startsWith("onitama") ||
        boardTheme.startsWith("baduk")
      )
        setBoardTheme("neon");
    }
    if (mode === "amazons" && !boardTheme.startsWith("amazons"))
      setBoardTheme("amazons-6");
    if (mode === "domineering") setBoardTheme("domineering");
    if (mode === "abalone") setBoardTheme("abalone");
    if (mode === "pente") setBoardTheme("pente");
    if (mode === "hex") setPlayerCount(2);
    if (mode === "shobu") {
      const savedT = localStorage.getItem("wallgo_theme");
      setBoardTheme(savedT === "shobu-scacchiera" ? "shobu-scacchiera" : "shobu");
      setPlayerCount(2);
    }
    if (mode === "onitama") {
      const savedT = localStorage.getItem("wallgo_theme");
      setBoardTheme(savedT === "onitama-light" ? "onitama-light" : "onitama-dark");
      setPlayerCount(2);
    }
    if (mode === "baduk") {
      const savedT = localStorage.getItem("wallgo_theme") as BoardTheme | null;
      setBoardTheme(savedT && savedT.startsWith("baduk") ? savedT : "baduk-9");
      setPlayerCount(2);
    }

    const modeDifficulty =
      (localStorage.getItem(`wallGoDifficulty_${mode}`) as Difficulty) ||
      (localStorage.getItem("wallGoDifficulty") as Difficulty) ||
      "normale";
    setDifficulty(modeDifficulty);
    localStorage.setItem("wallgo_gamemode", mode);
  };

  const [isModesAutoScrolling, setIsModesAutoScrolling] = useState(true);
  const modesScrollDirection = useRef<1 | -1>(1);

  // Variabili per il drag manuale del pannello
  const [isDraggingModes, setIsDraggingModes] = useState(false);
  const modesDragStartX = useRef(0);
  const modesDragScrollLeft = useRef(0);
  const modesHasDragged = useRef(false);

  const [pushedMarbles, setPushedMarbles] = useState<
    { id: string; color: string; r: number; c: number; t: number }[]
  >([]);

  const [penteDyingPieces, setPenteDyingPieces] = useState<
    { id: string; color: string; r: number; c: number; t: number }[]
  >([]);

  // Forza il reset dell'auto-scrolling quando si entra in modalità setup
  useEffect(() => {
    if (gameState.status === "setup") {
      setIsModesAutoScrolling(true);
      modesScrollDirection.current = 1;
    }
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.status !== "setup" || !isModesAutoScrolling || isSplashActive)
      return;

    const container = modesScrollRef.current;
    if (!container) return;

    // Rimuovi snap durante lo scroll per evitare salti
    container.classList.remove("snap-x", "snap-mandatory");
    container.style.scrollSnapType = "none";

    let animationFrameId: number;
    let exactScrollLeft = container.scrollLeft;
    let lastTime = performance.now();

    const timeoutId = setTimeout(() => {
      lastTime = performance.now();
      const scroll = (time: number) => {
        if (!container) return;
        const delta = time - lastTime;
        lastTime = time;

        const maxScroll = container.scrollWidth - container.clientWidth;

        // Se c'è spazio per lo scroll
        if (maxScroll > 0) {
          const addAmount = delta * 0.03 * modesScrollDirection.current;
          const safeDelta = Math.min(Math.max(addAmount, -5), 5);

          exactScrollLeft += safeDelta;

          // Inversione se arrivo ai bordi
          if (exactScrollLeft >= maxScroll) {
            modesScrollDirection.current = -1;
            exactScrollLeft = maxScroll;
          } else if (exactScrollLeft <= 0) {
            modesScrollDirection.current = 1;
            exactScrollLeft = 0;
          }

          container.scrollLeft = exactScrollLeft;
        }

        animationFrameId = requestAnimationFrame(scroll);
      };

      animationFrameId = requestAnimationFrame(scroll);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
      if (container) {
        container.classList.add("snap-x", "snap-mandatory");
        container.style.scrollSnapType = "";
      }
    };
  }, [gameState.status, isModesAutoScrolling, isSplashActive]);

  const handleModeInteraction = (
    e: React.MouseEvent<HTMLButtonElement>,
    modeClicked: GameMode | "coming_soon",
  ) => {
    if (modeClicked === gameMode || modeClicked === "coming_soon") {
      setIsModesAutoScrolling(true);
      if (
        modesScrollDirection.current === -1 ||
        modesScrollDirection.current === 1
      ) {
        // Mantieni la direzione attuale
      } else {
        modesScrollDirection.current = 1;
      }
      return;
    }
    setIsModesAutoScrolling(false);
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };


  const handleComingSoon = () => {
    setComingSoonToast("Coming soon");
    if (comingSoonToastTimeout.current)
      clearTimeout(comingSoonToastTimeout.current);
    comingSoonToastTimeout.current = setTimeout(
      () => setComingSoonToast(null),
      3000,
    );
  };

  const handleInvalidShobuClick = () => {
    const msg = language === "it" ? "Fase Passiva: seleziona una pedina sulle plance del TUO lato!" : "Passive Phase: select a piece on YOUR side boards!";
    if (gameState.shobuState?.passiveMove) {
      const isDarkPrev = gameState.shobuState.passiveMove.boardColor === 'dark';
      setShobuWarningToast(language === "it" ? `Fase Attiva: usa una plancia di colore ${isDarkPrev ? 'CHIARO' : 'SCURO'}!` : `Active Phase: use a ${isDarkPrev ? 'LIGHT' : 'DARK'} board!`);
    } else {
      setShobuWarningToast(msg);
    }
    
    if (shobuWarningToastTimeout.current)
      clearTimeout(shobuWarningToastTimeout.current);
    shobuWarningToastTimeout.current = setTimeout(
      () => setShobuWarningToast(null),
      3000,
    );
  };

  const handleDifficultyClick = (d: Difficulty) => {
    setDifficulty(d);
    localStorage.setItem(`wallGoDifficulty_${gameState.gameMode}`, d);

    let msg = "";
    if (d === "normale") {
      msg =
        language === "it"
          ? "Normale: L'IA sta ancora imparando a camminare. Puoi farcela."
          : "Normal: The AI is still learning to walk. You can do this.";
    } else if (d === "difficile") {
      msg =
        language === "it"
          ? "Difficile: L'IA ha bevuto 3 caffè. Preparati a sudare."
          : "Hard: The AI drank 3 coffees. Prepare to sweat.";
    } else if (d === "estrema") {
      msg =
        language === "it"
          ? "Estrema: L'IA vede il codice di Matrix. Buona fortuna, ne avrai bisogno."
          : "Extreme: The AI sees the Matrix code. Good luck, you'll need it.";
    } else if (d === "maestro") {
      msg =
        language === "it"
          ? "Maestro: L'IA pondera a lungo ogni mossa come un antico Maestro di Go. Sperimentale e Lento."
          : "Master: The AI ponders every move like an ancient Go Master. Experimental and Slow.";
    }

    setDifficultyToast(msg);
    if (difficultyToastTimeout.current)
      clearTimeout(difficultyToastTimeout.current);
    difficultyToastTimeout.current = setTimeout(
      () => setDifficultyToast(null),
      3500,
    );
  };

  const [advicePos, setAdvicePos] = useState({ x: 0, y: 0 });
  const [isDraggingAdvice, setIsDraggingAdvice] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  const aiRunningRef = useRef<boolean>(false);
  const winEffectRef = useRef<"confetti" | "fireworks">("confetti");

  const t = translations[language];
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurnOnline =
    !onlineMatchSession ||
    gameState.currentPlayerIndex === (onlineMatchSession.myPlayerIndex - 1);
  const isUserTurn =
    currentPlayer &&
    !currentPlayer.isAI &&
    !isAIThinking &&
    gameState.status === "playing" &&
    isMyTurnOnline;

  const getPenteOpponentLastMove = (): Point | null => {
    if ((gameState.gameMode || gameMode) !== "pente") return null;

    // 1. In Online match:
    if (onlineMatchSession) {
      const oppId = (onlineMatchSession.myPlayerIndex === 1 ? 2 : 1) as PlayerId;
      const oppPlayer = gameState.players.find((p) => p.id === oppId);
      const oppMove = gameState.lastMoveByPlayer?.[oppId];
      if (oppMove && oppPlayer?.positions.some((pos) => pos.r === oppMove.r && pos.c === oppMove.c)) {
        return oppMove;
      }
      if (gameState.lastPlacedPiece && gameState.lastPlacedPiece.playerId === oppId) {
        if (oppPlayer?.positions.some((pos) => pos.r === gameState.lastPlacedPiece!.r && pos.c === gameState.lastPlacedPiece!.c)) {
          return { r: gameState.lastPlacedPiece.r, c: gameState.lastPlacedPiece.c };
        }
      }
      return null;
    }

    // 2. In Single Player vs AI:
    const humanPlayer = gameState.players.find((p) => !p.isAI);
    const aiPlayer = gameState.players.find((p) => p.isAI);
    if (humanPlayer && aiPlayer) {
      const oppMove = gameState.lastMoveByPlayer?.[aiPlayer.id];
      if (oppMove && aiPlayer.positions.some((pos) => pos.r === oppMove.r && pos.c === oppMove.c)) {
        return oppMove;
      }
      if (gameState.lastPlacedPiece && gameState.lastPlacedPiece.playerId === aiPlayer.id) {
        if (aiPlayer.positions.some((pos) => pos.r === gameState.lastPlacedPiece!.r && pos.c === gameState.lastPlacedPiece!.c)) {
          return { r: gameState.lastPlacedPiece.r, c: gameState.lastPlacedPiece.c };
        }
      }
      return null;
    }

    // 3. In Local 2-Player (pass and play)
    if (currentPlayer) {
      const otherPlayer = gameState.players.find((p) => p.id !== currentPlayer.id);
      if (otherPlayer) {
        const oppMove = gameState.lastMoveByPlayer?.[otherPlayer.id];
        if (oppMove && otherPlayer.positions.some((pos) => pos.r === oppMove.r && pos.c === oppMove.c)) {
          return oppMove;
        }
        if (gameState.lastPlacedPiece && gameState.lastPlacedPiece.playerId === otherPlayer.id) {
          if (otherPlayer.positions.some((pos) => pos.r === gameState.lastPlacedPiece!.r && pos.c === gameState.lastPlacedPiece!.c)) {
            return { r: gameState.lastPlacedPiece.r, c: gameState.lastPlacedPiece.c };
          }
        }
      }
    }

    return null;
  };

  const wallOptions =
    currentPlayer &&
    gameState.turnPhase === "walling" &&
    gameState.selectedPieceIndex !== null
      ? getWallOptions(
          currentPlayer.positions[gameState.selectedPieceIndex],
          gameState.walls,
          gameState.boardTheme,
          gameState.players,
          gameState.gameMode
        )
      : [];

  const isPlayerSuspended =
    isUserTurn &&
    (((gameState.gameMode === "dominio" || gameState.gameMode === "corsa") &&
      currentPlayer.isEnclosed &&
      !currentPlayer.hasWallbreaker) ||
      ((gameState.gameMode === "dominio" || gameState.gameMode === "corsa") &&
        gameState.turnPhase === "moving" &&
        !canPhysicallyMove(
          currentPlayer,
          gameState.walls,
          gameState.players,
          gameState.boardTheme,
        )) ||
      (gameState.gameMode === "dominio" &&
        gameState.turnPhase === "walling" &&
        wallOptions.length === 0 &&
        !gameState.moveBackupPos));

  const mustUseWallbreaker =
    isUserTurn &&
    gameState.gameMode === "dominio" &&
    currentPlayer.isEnclosed &&
    currentPlayer.hasWallbreaker &&
    !gameState.usedWallbreakerThisTurn;

  const isStrategyOpen = !!adviceObj || isAdviceLoading;

  const isSelectedPieceEnclosed =
    gameState.selectedPieceIndex !== null &&
    currentPlayer &&
    currentPlayer.positions[gameState.selectedPieceIndex] &&
    gameState.territoryMap[
      `${currentPlayer.positions[gameState.selectedPieceIndex].r},${currentPlayer.positions[gameState.selectedPieceIndex].c}`
    ] === currentPlayer.id;

  useEffect(() => {
    if (!isSelectedPieceEnclosed && isWallBreakingMode) {
      setIsWallBreakingMode(false);
    }
  }, [isSelectedPieceEnclosed, isWallBreakingMode]);

  useEffect(() => {
    // Web listener could be here
  }, []);

  useEffect(() => {
    setGameState((prev) => ({ ...prev, boardTheme }));
  }, [boardTheme]);

  useEffect(() => {
    if (!isSplashActive) {
      SoundManager.startBackgroundMusic(musicVolume);
      SoundManager.setMusicVolume(musicVolume);
      SoundManager.setSfxVolume(sfxVolume);
    }
  }, [isSplashActive]);

  useEffect(() => {
    SoundManager.setMusicVolume(musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    SoundManager.setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  const safePlaySound = useCallback((soundFn: () => void) => {
    if (sfxVolume > 0) {
      try {
        soundFn();
      } catch (e) {
        console.warn("Sound error ignored", e);
      }
    }
  }, [sfxVolume]);

  useEffect(() => {
    const unsub = Logger.subscribe((newLogs) => setLogs([...newLogs]));
    return () => unsub();
  }, []);

  useEffect(() => {
    setDailyQuote(getRandomQuote(language));
  }, [language]);

  useEffect(() => {
    let isMounted = true;

    const loadStatsAsync = async () => {
      try {
        const bridgeSaved = await loadStorageItem("wallgo_stats");
        const localSaved = localStorage.getItem("wallgo_stats");

        let parsedLocal: PlayerStats | null = null;
        let parsedBridge: PlayerStats | null = null;

        if (localSaved && localSaved !== "undefined") {
          try { parsedLocal = JSON.parse(localSaved); } catch (e) {}
        }
        if (bridgeSaved && bridgeSaved !== "undefined") {
          try { parsedBridge = JSON.parse(bridgeSaved); } catch (e) {}
        }

        const mergedStats = mergePlayerStats(parsedLocal, parsedBridge);
        if (!isMounted) return;

        if (mergedStats) {
          const parsedStats = mergedStats;
          let statsChanged = (parsedStats !== parsedLocal);

          // Score cleanup for Seb26 to remove all illicit scores from aborted/glitched games
          const currentStoredName = localStorage.getItem("wallgo_name") || "";
          if (currentStoredName === "Seb26" && localStorage.getItem("wallgo_seb26_fix_v3") !== "true") {
            parsedStats.totalScore = 2.0;
            parsedStats.totalFugaScore = 0;
            parsedStats.totalAmazonsScore = 0;
            parsedStats.totalDomineeringScore = 0;
            parsedStats.totalAbaloneScore = 0;
            parsedStats.totalHexScore = 0;
            parsedStats.totalChainTriangleScore = 0;
            parsedStats.totalPenteScore = 0;
            parsedStats.totalShobuScore = 0;
            parsedStats.totalYinshScore = 0;
            parsedStats.totalOnitamaScore = 0;
            parsedStats.totalOrbitoScore = 0;
            parsedStats.totalBadukScore = 0;
            parsedStats.badges = [];
            parsedStats.unlockedModes = ["dominio"];
            parsedStats.freeUnlockedModes = ["dominio"];
            statsChanged = true;
            localStorage.setItem("wallgo_seb26_fix_v3", "true");
          }

          // Score restoration for Mimmo (Misterbianco - CT) to restore his correct Wall Go points
          const currentStoredLocation = localStorage.getItem("wallgo_user_location") || "";
          if (
            (currentStoredName === "Mimmo" || currentStoredName.toLowerCase() === "mimmo") &&
            (currentStoredLocation.includes("Misterbianco") || !currentStoredLocation) &&
            localStorage.getItem("wallgo_mimmo_fix_v598") !== "true"
          ) {
            if ((parsedStats.totalScore || 0) < 598) {
              parsedStats.totalScore = 598.0;
              statsChanged = true;
            }
            localStorage.setItem("wallgo_mimmo_fix_v598", "true");
          }

          // Score cleanup for Mimmo539 to remove illicit scores from aborted games and global glitch
          if (currentStoredName === "Mimmo539" && localStorage.getItem("wallgo_mimmo539_fix_v1") !== "true") {
            parsedStats.totalScore = 18.0;
            parsedStats.totalFugaScore = 4.0;
            parsedStats.totalAmazonsScore = 2.0;
            parsedStats.totalDomineeringScore = 4.0;
            parsedStats.totalAbaloneScore = 0;
            parsedStats.totalHexScore = 0;
            parsedStats.totalChainTriangleScore = 0;
            parsedStats.totalPenteScore = 4.0;
            parsedStats.totalShobuScore = 0;
            parsedStats.totalYinshScore = 0;
            parsedStats.totalOnitamaScore = 0;
            parsedStats.totalOrbitoScore = 0;
            parsedStats.totalBadukScore = 0;
            parsedStats.badges = [];
            statsChanged = true;
            localStorage.setItem("wallgo_mimmo539_fix_v1", "true");
          }

          // Custom bug fix for the user's 50 points error
          if (localStorage.getItem("wallgo_chainTriangle_bugfix_50") !== "true") {
            localStorage.setItem("wallgo_chainTriangle_bugfix_50", "true");
          }
          if (localStorage.getItem("wallgo_chainTriangle_refund_50") !== "true") {
            localStorage.setItem("wallgo_chainTriangle_refund_50", "true");
          }
          if (localStorage.getItem("wallgo_manual_recalc_points") !== "true") {
            localStorage.setItem("wallgo_manual_recalc_points", "true");
          }

          if (localStorage.getItem("wallgo_recalc_v3") !== "true") {
            let estimatedScore = 0;
            
            const getWinsParams = (k: number) => {
              const wins = parsedStats[k]?.wins || 0;
              const hardWins = parsedStats[k]?.hardWins || 0;
              const diffWins = parsedStats[k]?.diffWins || 0;
              const estrWins = parsedStats[k]?.estrWins || 0;
              const normWins = Math.max(0, wins - hardWins);
              return (normWins * 2.0) + (hardWins * 4.0);
            };

            estimatedScore += getWinsParams(2);
            estimatedScore += getWinsParams(3) * 1.1;
            estimatedScore += getWinsParams(4) * 1.2;
            
            if (parsedStats.badges) {
              parsedStats.badges.forEach((b: any) => {
                const id = typeof b === 'string' ? b : b.id;
                const diff = typeof b === 'string' ? 'normale' : (b.difficulty || 'normale');
                let basePoints = 5;
                if (["abalone_hard", "hex_hard", "corsa_hard", "amazzoni_hard"].includes(id)) {
                  basePoints = 20;
                } else if (id === 'clessidra') {
                  basePoints = 15;
                } else if (id === 'dominatore') {
                  basePoints = 10;
                } else if (id === 'arena' || id === 'martello') {
                  basePoints = 15;
                }

                if (["abalone_hard", "hex_hard", "corsa_hard", "amazzoni_hard", "arena", "martello"].includes(id)) {
                   if (diff === 'estrema') estimatedScore += basePoints * 1.5;
                   else if (diff === 'maestro') estimatedScore += basePoints * 2;
                   else if (diff === 'difficile') estimatedScore += basePoints;
                   else estimatedScore += basePoints / 2;
                } else {
                   estimatedScore += basePoints;
                }
              });
            }

            if (estimatedScore > 0 || (parsedStats.totalScore || 0) < 0) {
              parsedStats.totalScore = Math.max(parsedStats.totalScore || 0, estimatedScore);
              statsChanged = true;
            }
            localStorage.setItem("wallgo_recalc_v3", "true");
          }

          if (localStorage.getItem("wallgo_recalc_v4") !== "true") {
            let estimatedScore = 0;
            
            const getWinsParams = (k: number) => {
              const wins = parsedStats[k]?.wins || 0;
              const hardWins = Math.max(0, (parsedStats[k]?.hardWins || 0));
              const losses = parsedStats[k]?.losses || 0;
              const diffWins = parsedStats[k]?.diffWins || 0;
              const estrWins = parsedStats[k]?.estrWins || 0;
              const normWins = Math.max(0, wins - hardWins - diffWins - estrWins);
              return (normWins * 2.0) + (hardWins * 4.0) + (diffWins * 4.0) + (estrWins * 6.0) - (losses * 1.0);
            };

            estimatedScore += getWinsParams(2);
            estimatedScore += getWinsParams(3) * 1.1; 
            estimatedScore += getWinsParams(4) * 1.2;
            
            if (parsedStats.badges) {
              parsedStats.badges.forEach((b: any) => {
                const id = typeof b === 'string' ? b : b.id;
                const diff = typeof b === 'string' ? 'normale' : (b.difficulty || 'normale');
                let basePoints = 5;
                if (["abalone_hard", "hex_hard", "corsa_hard", "amazzoni_hard"].includes(id)) {
                  basePoints = 20;
                } else if (id === 'clessidra') {
                  basePoints = 15;
                } else if (id === 'dominatore') {
                  basePoints = 10;
                } else if (id === 'arena' || id === 'martello') {
                  basePoints = 15;
                }

                if (["abalone_hard", "hex_hard", "corsa_hard", "amazzoni_hard", "arena", "martello"].includes(id)) {
                   if (diff === 'estrema') estimatedScore += basePoints * 1.5;
                   else if (diff === 'maestro') estimatedScore += basePoints * 2;
                   else if (diff === 'difficile') estimatedScore += basePoints;
                   else estimatedScore += basePoints / 2;
                } else {
                   estimatedScore += basePoints;
                }
              });
            }

            parsedStats.totalScore = Math.max(parsedStats.totalScore || 0, estimatedScore);
            statsChanged = true;
            localStorage.setItem("wallgo_recalc_v4", "true");
          }

          const savedVersion = localStorage.getItem("wallgo_version");
          if (!savedVersion || savedVersion < "2.9.0") {
            if (parsedStats.badges && parsedStats.badges.length > 0) {
              let pointsToSubtract = 0;
              parsedStats.badges.forEach((b: any) => {
                const id = typeof b === "string" ? b : b.id;
                const diff = typeof b === "string" ? "normale" : b.difficulty || "normale";

                if (id === "martello" || id === "arena") {
                  if (diff === "estrema") pointsToSubtract += 15 * 1.5;
                  else if (diff === "maestro") pointsToSubtract += 15 * 2;
                  else if (diff === "difficile") pointsToSubtract += 15;
                  else pointsToSubtract += 15 / 2;
                }
              });
              parsedStats.totalScore = (parsedStats.totalScore || 0) - pointsToSubtract;
              parsedStats.badges = parsedStats.badges.filter((b: any) => {
                const id = typeof b === "string" ? b : b.id;
                return id !== "martello" && id !== "arena";
              });
              statsChanged = true;
            }
          }

          if (!savedVersion || savedVersion < "2.8.1") {
            const oldNormal = {
              neon: 2, islands: 2.2, desert: 2.4, clessidra: 2.6, hourglass: 2.6, ponte: 2.8, bridge: 2.8, martello: 3.0, hammer: 3.0, arena: 3.2,
            };
            const oldHard = {
              neon: 3, islands: 3.4, desert: 3.8, clessidra: 4.2, hourglass: 4.2, ponte: 4.6, bridge: 4.6, martello: 5.0, hammer: 5.0, arena: 5.4,
            };

            let deduction = 0;
            if (parsedStats.normalWinsByTheme) {
              Object.entries(parsedStats.normalWinsByTheme).forEach(([theme, count]) => {
                const oldPts = oldNormal[theme as keyof typeof oldNormal] || 2;
                deduction += (count as number) * (oldPts - 1.5);
              });
            }
            if (parsedStats.hardWinsByTheme) {
              Object.entries(parsedStats.hardWinsByTheme).forEach(([theme, count]) => {
                const oldPts = oldHard[theme as keyof typeof oldHard] || 3;
                deduction += (count as number) * (oldPts - 2.5);
              });
            }
            const sumNormal = parsedStats.normalWinsByTheme ? Object.values(parsedStats.normalWinsByTheme).reduce((a: any, b: any) => a + b, 0) : 0;
            const sumHard = parsedStats.hardWinsByTheme ? Object.values(parsedStats.hardWinsByTheme).reduce((a: any, b: any) => a + b, 0) : 0;
            const extremeWins = Math.max(0, (parsedStats[2]?.wins || 0) - (sumHard as number) - (sumNormal as number));
            deduction += extremeWins * (12 - 7);

            const totalWins = (parsedStats[2]?.wins || 0) + (parsedStats[3]?.wins || 0) + (parsedStats[4]?.wins || 0);
            if (totalWins > 0) {
              const ratio = (parsedStats[2]?.wins || 0) / totalWins;
              deduction *= ratio;
            }

            parsedStats.totalScore = (parsedStats.totalScore || 0) - deduction;
            statsChanged = true;
          }

          if (!savedVersion || isVersionOlder(savedVersion, "2.9.2")) {
            if (parsedStats.badges) {
              const ponteBadge = parsedStats.badges.find((b: any) => (typeof b === "string" ? b : b.id) === "ponte");
              if (ponteBadge) {
                const diff = typeof ponteBadge === "string" ? "normale" : ponteBadge.difficulty || "normale";
                let pts = 15;
                if (diff === "estrema") pts *= 1.5;
                else if (diff === "maestro") pts *= 2;
                else if (diff === "difficile") pts *= 1;
                else pts /= 2;
                parsedStats.totalScore = (parsedStats.totalScore || 0) - pts;
                parsedStats.badges = parsedStats.badges.filter((b: any) => (typeof b === "string" ? b : b.id) !== "ponte");
                statsChanged = true;
              }
            }
            localStorage.setItem("wallgo_music_volume", "100");
            localStorage.setItem("wallgo_sfx_volume", "100");
          }

          if (!savedVersion || isVersionOlder(savedVersion, "2.18.2")) {
            if (parsedStats.badges) {
              ["ponte", "clessidra"].forEach(badgeToRemove => {
                const bToRem = parsedStats.badges?.find((b: any) => (typeof b === "string" ? b : b.id) === badgeToRemove);
                if (bToRem) {
                  const diff = typeof bToRem === "string" ? "normale" : bToRem.difficulty || "normale";
                  let pts = 15;
                  if (diff === "estrema") pts *= 1.5;
                  else if (diff === "maestro") pts *= 2;
                  else if (diff === "difficile") pts *= 1;
                  else pts /= 2;
                  parsedStats.totalScore = (parsedStats.totalScore || 0) - pts;
                  parsedStats.badges = parsedStats.badges?.filter((b: any) => (typeof b === "string" ? b : b.id) !== badgeToRemove);
                  statsChanged = true;
                }
              });
            }
          }
          localStorage.setItem("wallgo_version", APP_VERSION);

          if (parsedStats.badges) {
            const originalLen = parsedStats.badges.length;
            parsedStats.badges = parsedStats.badges.filter((b: any) => {
              const id = typeof b === "string" ? b : b.id;
              if (id === "leggenda") {
                const diff = typeof b === "string" ? "normale" : b.difficulty || "normale";
                let pts = 20;
                if (diff === "estrema") pts *= 1.5;
                else if (diff === "maestro") pts *= 2;
                else if (diff === "normale") pts /= 2;
                parsedStats.totalScore = (parsedStats.totalScore || 0) - pts;
                return false;
              }
              if ((id === "ponte" || id === "martello") && !b.difficulty) {
                return false;
              }
              return true;
            });
            if (parsedStats.badges.length !== originalLen) statsChanged = true;
          }

          if (parsedStats.totalScore === undefined) {
            let retroScore = 0;
            [2, 3, 4].forEach((k) => {
              const record = parsedStats[k as 2 | 3 | 4];
              if (record) {
                const wins = record.wins || 0;
                const losses = record.losses || 0;
                const hardWins = record.hardWins || 0;
                const normalWins = Math.max(0, wins - hardWins);
                const bonus = k === 3 ? 0.2 : k === 4 ? 0.4 : 0;
                retroScore += normalWins * (2 + bonus);
                retroScore += hardWins * (3 + bonus);
                retroScore -= losses;
              }
            });
            parsedStats.totalScore = retroScore;
            statsChanged = true;
          }

          if (!parsedStats.unlockedModes) {
            parsedStats.unlockedModes = ["dominio", "baduk"];
            statsChanged = true;
          } else {
            if (!parsedStats.unlockedModes.includes("dominio")) {
              parsedStats.unlockedModes.push("dominio");
              statsChanged = true;
            }
            if (!parsedStats.unlockedModes.includes("baduk")) {
              parsedStats.unlockedModes.push("baduk");
              statsChanged = true;
            }
            const originalLen = parsedStats.unlockedModes.length;
            parsedStats.unlockedModes = Array.from(new Set(parsedStats.unlockedModes));
            if (parsedStats.unlockedModes.length !== originalLen) statsChanged = true;
          }

          if (!parsedStats.freeUnlockedModes) {
            parsedStats.freeUnlockedModes = [];
            statsChanged = true;
          } else {
            const originalLen = parsedStats.freeUnlockedModes.length;
            parsedStats.freeUnlockedModes = Array.from(new Set(parsedStats.freeUnlockedModes));
            if (parsedStats.freeUnlockedModes.length !== originalLen) statsChanged = true;
          }

          // Always invoke saveStorageItem on startup so storage save is registered
          saveStorageItem("wallgo_stats", JSON.stringify(parsedStats));

          try {
            const ALL_SAVED_GAME_MODES: GameMode[] = [
              "dominio", "corsa", "amazons", "domineering", "hex", "pente", "orbito",
              "chain_triangle", "shobu", "yinsh", "abalone", "onitama", "baduk", "stratego"
            ];
            const saveKeys = [
              ...ALL_SAVED_GAME_MODES.map((m) => `wallgo_saved_game_${m}`),
              "wallgo_last_saved_mode",
            ];
            await loadStorageItemsBatch(saveKeys);
            if (isMounted) {
              setSavedGamesVersion((v) => v + 1);
            }
          } catch (err) {
            console.warn("Error loading saved games batch:", err);
          }

          if (isMounted) {
            setStats(parsedStats);
          }
        } else {
          saveStorageItem("wallgo_stats", JSON.stringify(DEFAULT_STATS));
          if (isMounted) setStats(DEFAULT_STATS);
        }
      } catch (e) {
        saveStorageItem("wallgo_stats", JSON.stringify(DEFAULT_STATS));
        if (isMounted) setStats(DEFAULT_STATS);
      }

      // Load profile & app settings
      try {
        const configKeys = [
          "wallgo_name",
          "wallgo_location",
          "wallgo_comment",
          "wallgo_email",
          "wallgo_tester",
          "wallgo_device_id",
          "wallgo_strategy_enabled",
          "wallgo_music_volume",
          "wallgo_sfx_volume",
          "wallgo_enableStartingPref",
          "wallgo_has_launched",
          "wallgo_has_registered",
        ];
        const configBatch = await loadStorageItemsBatch(configKeys);

        let savedName = configBatch["wallgo_name"] || localStorage.getItem("wallgo_name") || "";
        if (isInvalidOrGuestName(savedName)) {
          savedName = "";
        }
        
        const savedLocation = configBatch["wallgo_location"] || localStorage.getItem("wallgo_location") || "";
        const savedComment = configBatch["wallgo_comment"] || localStorage.getItem("wallgo_comment") || "";
        const savedEmail = configBatch["wallgo_email"] || localStorage.getItem("wallgo_email") || "";
        if (savedEmail && isMounted) setUserEmail(savedEmail);
        const savedTester = configBatch["wallgo_tester"] || localStorage.getItem("wallgo_tester");
        if (savedTester === "true" && isMounted) setIsTester(true);

        // Auto-restore ZioSeb for ziosebzioseb@gmail.com if savedName was corrupted
        if (!savedName && savedEmail === "ziosebzioseb@gmail.com") {
          savedName = "ZioSeb";
          saveStorageItem("wallgo_name", "ZioSeb");
        }

        if (savedName && isMounted) setUserName(savedName);
        const finalLocation = savedLocation || (savedEmail === "ziosebzioseb@gmail.com" ? "Sant'Alfio" : "");
        if (finalLocation && isMounted) setUserLocation(finalLocation);
        if (savedComment && isMounted) setUserComment(savedComment);

        let savedDeviceId = configBatch["wallgo_device_id"] || localStorage.getItem("wallgo_device_id") || "";
        if (!savedDeviceId) {
          savedDeviceId = generateUUID();
          saveStorageItem("wallgo_device_id", savedDeviceId);
        }
        if (isMounted) setDeviceId(savedDeviceId);

        const hasRegistered = configBatch["wallgo_has_registered"] === "true" || localStorage.getItem("wallgo_has_registered") === "true";

        if (!hasRegistered && (!savedName || savedName === "Player")) {
          if (isMounted) setIsRegistrationOpen(true);
        }

        const savedStrategy = configBatch["wallgo_strategy_enabled"] || localStorage.getItem("wallgo_strategy_enabled");
        if (savedStrategy !== null && isMounted) setIsStrategyEnabled(savedStrategy === "true");
        const dbVolM = configBatch["wallgo_music_volume"] || localStorage.getItem("wallgo_music_volume") || "100";
        if (isMounted) setMusicVolume(parseInt(dbVolM, 10));
        const dbVolS = configBatch["wallgo_sfx_volume"] || localStorage.getItem("wallgo_sfx_volume") || "100";
        if (isMounted) setSfxVolume(parseInt(dbVolS, 10));
        const savedStartingPref = configBatch["wallgo_enableStartingPref"] || localStorage.getItem("wallgo_enableStartingPref");
        if (savedStartingPref !== null && isMounted) {
          setIsStartingPreferenceEnabled(savedStartingPref === "true");
        }

        const hasLaunched = configBatch["wallgo_has_launched"] || localStorage.getItem("wallgo_has_launched");
        if (!hasLaunched) {
          saveStorageItem("wallgo_has_launched", "true");
          if (isMounted) setIsRulesOpen(true);
        }

        // Sync device activity with Firebase
        if (savedDeviceId) {
          try {
            const info = { osVersion: "unknown", model: navigator.userAgent, platform: "web" };
            await setDoc(
              doc(db, "devices", savedDeviceId),
              {
                osVersion: info.osVersion || "unknown",
                model: info.model || "unknown",
                platform: info.platform || "web",
                userName: savedName || "Player",
                userLocation: savedLocation || "",
                lastActive: new Date().toISOString(),
              },
              { merge: true },
            );

            if (savedName && savedName !== "Player") {
              const devicesQuery = query(
                collection(db, "devices"),
                where("userName", "==", savedName),
              );
              const devicesSnap = await getDocs(devicesQuery);

              if (!devicesSnap.empty) {
                let mostRecentData: any = null;
                let mostRecentTime = 0;
                const allBadges = new Map<string, any>();
                const allUnlockedModes = new Set<string>();
                const allFreeUnlockedModes = new Set<string>();

                let maxScore = 0;
                let maxFugaScore = 0;
                let maxAmazonsScore = 0;
                let maxDomineeringScore = 0;
                let maxAbaloneScore = 0;
                let maxHexScore = 0;
                let maxChainTriangleScore = 0;
                let maxOrbitoScore = 0;
                let maxPenteScore = 0;
                let maxShobuScore = 0;
                let maxYinshScore = 0;
                let maxOnitamaScore = 0;
                let maxBadukScore = 0;
                let maxOverallLeaderboardScore = 0;

                devicesSnap.forEach((d) => {
                  const data = d.data();
                  if ((data.userName || "").trim().toLowerCase() !== (savedName || "").trim().toLowerCase()) return;
                  const loc = data.userLocation || "";
                  const currentLoc = savedLocation || "";
                  if (loc && currentLoc && loc !== currentLoc) return;

                  if (typeof data.totalScore === "number") maxScore = Math.max(maxScore, data.totalScore);
                  if (typeof data.totalFugaScore === "number") maxFugaScore = Math.max(maxFugaScore, data.totalFugaScore);
                  if (typeof data.totalAmazonsScore === "number") maxAmazonsScore = Math.max(maxAmazonsScore, data.totalAmazonsScore);
                  if (typeof data.totalDomineeringScore === "number") maxDomineeringScore = Math.max(maxDomineeringScore, data.totalDomineeringScore);
                  if (typeof data.totalAbaloneScore === "number") maxAbaloneScore = Math.max(maxAbaloneScore, data.totalAbaloneScore);
                  if (typeof data.totalHexScore === "number") maxHexScore = Math.max(maxHexScore, data.totalHexScore);
                  if (typeof data.totalChainTriangleScore === "number") maxChainTriangleScore = Math.max(maxChainTriangleScore, data.totalChainTriangleScore);
                  if (typeof data.totalOrbitoScore === "number") maxOrbitoScore = Math.max(maxOrbitoScore, data.totalOrbitoScore);
                  if (typeof data.totalPenteScore === "number") maxPenteScore = Math.max(maxPenteScore, data.totalPenteScore);
                  if (typeof data.totalShobuScore === "number") maxShobuScore = Math.max(maxShobuScore, data.totalShobuScore);
                  if (typeof data.totalYinshScore === "number") maxYinshScore = Math.max(maxYinshScore, data.totalYinshScore);
                  if (typeof data.totalOnitamaScore === "number") maxOnitamaScore = Math.max(maxOnitamaScore, data.totalOnitamaScore);
                  if (typeof data.totalBadukScore === "number") maxBadukScore = Math.max(maxBadukScore, data.totalBadukScore);
                  if (typeof data.totalScoreOverall === "number") maxOverallLeaderboardScore = Math.max(maxOverallLeaderboardScore, data.totalScoreOverall);

                  const lastActiveStr = data.lastActive || data.lastGamePlayedAt;
                  const lastActiveTime = lastActiveStr
                    ? new Date(lastActiveStr).getTime()
                    : 0;
                  if (lastActiveTime > mostRecentTime) {
                    mostRecentTime = lastActiveTime;
                    mostRecentData = data;
                  }
                  if (data.unlockedModes && Array.isArray(data.unlockedModes)) {
                    data.unlockedModes.forEach((m: string) => allUnlockedModes.add(m));
                  }
                  if (data.freeUnlockedModes && Array.isArray(data.freeUnlockedModes)) {
                    data.freeUnlockedModes.forEach((m: string) => allFreeUnlockedModes.add(m));
                  }

                  if (data.badges) {
                    const badgeList = Array.isArray(data.badges)
                      ? data.badges
                      : Object.entries(data.badges).map(([key, val]) => {
                          return typeof val === "object" && val !== null
                            ? { id: key, ...val }
                            : { id: key, date: val, difficulty: "normale" };
                        });

                    badgeList.forEach((bData: any) => {
                      const id = typeof bData === "string" ? bData : bData.id;
                      const bDiff =
                        typeof bData === "object" && bData !== null
                          ? bData.difficulty || "normale"
                          : "normale";
                      const bDate =
                        typeof bData === "object" && bData !== null
                          ? bData.date
                          : new Date().toISOString();

                      const existing = allBadges.get(id);
                      if (!existing) {
                        allBadges.set(id, { id, date: bDate, difficulty: bDiff });
                      } else {
                        const diffValues = { normale: 1, difficile: 2, estrema: 3, maestro: 4 };
                        const currentVal =
                          diffValues[
                            existing.difficulty as keyof typeof diffValues
                          ] || 1;
                        const newVal =
                          diffValues[bDiff as keyof typeof diffValues] || 1;
                        if (newVal > currentVal) {
                          allBadges.set(id, { id, date: bDate, difficulty: bDiff });
                        }
                      }
                    });
                  }
                });

                // Also try fetching leaderboard entries for this user to ensure we recover the highest overall score
                try {
                  const lbSlugWithLoc = savedLocation
                    ? `${savedName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${savedLocation.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
                    : savedName.toLowerCase().replace(/[^a-z0-9]/g, "_");
                  const lbSlugPlain = savedName.toLowerCase().replace(/[^a-z0-9]/g, "_");
                  
                  const [lbDoc1, lbDoc2] = await Promise.all([
                    getDoc(doc(db, "leaderboard", lbSlugWithLoc)).catch(() => null),
                    lbSlugWithLoc !== lbSlugPlain ? getDoc(doc(db, "leaderboard", lbSlugPlain)).catch(() => null) : Promise.resolve(null)
                  ]);

                  [lbDoc1, lbDoc2].forEach(lbSnap => {
                    if (lbSnap && lbSnap.exists()) {
                      const lbData = lbSnap.data();
                      if (typeof lbData.totalScore === "number") maxScore = Math.max(maxScore, lbData.totalScore);
                      if (typeof lbData.totalFugaScore === "number") maxFugaScore = Math.max(maxFugaScore, lbData.totalFugaScore);
                      if (typeof lbData.totalAmazonsScore === "number") maxAmazonsScore = Math.max(maxAmazonsScore, lbData.totalAmazonsScore);
                      if (typeof lbData.totalDomineeringScore === "number") maxDomineeringScore = Math.max(maxDomineeringScore, lbData.totalDomineeringScore);
                      if (typeof lbData.totalAbaloneScore === "number") maxAbaloneScore = Math.max(maxAbaloneScore, lbData.totalAbaloneScore);
                      if (typeof lbData.totalHexScore === "number") maxHexScore = Math.max(maxHexScore, lbData.totalHexScore);
                      if (typeof lbData.totalChainTriangleScore === "number") maxChainTriangleScore = Math.max(maxChainTriangleScore, lbData.totalChainTriangleScore);
                      if (typeof lbData.totalOrbitoScore === "number") maxOrbitoScore = Math.max(maxOrbitoScore, lbData.totalOrbitoScore);
                      if (typeof lbData.totalPenteScore === "number") maxPenteScore = Math.max(maxPenteScore, lbData.totalPenteScore);
                      if (typeof lbData.totalShobuScore === "number") maxShobuScore = Math.max(maxShobuScore, lbData.totalShobuScore);
                      if (typeof lbData.totalYinshScore === "number") maxYinshScore = Math.max(maxYinshScore, lbData.totalYinshScore);
                      if (typeof lbData.totalOnitamaScore === "number") maxOnitamaScore = Math.max(maxOnitamaScore, lbData.totalOnitamaScore);
                      if (typeof lbData.totalBadukScore === "number") maxBadukScore = Math.max(maxBadukScore, lbData.totalBadukScore);
                      if (typeof lbData.totalScoreOverall === "number") maxOverallLeaderboardScore = Math.max(maxOverallLeaderboardScore, lbData.totalScoreOverall);
                    }
                  });
                } catch (e) {
                  console.warn("Leaderboard check in loadStatsAsync skipped:", e);
                }

                const localSavedStats = localStorage.getItem("wallgo_stats");
                if (!localSavedStats && mostRecentData && isMounted) {
                  const restoredStats = { ...DEFAULT_STATS };
                  restoredStats.totalScore = maxScore;
                  restoredStats.totalFugaScore = maxFugaScore;
                  restoredStats.totalAmazonsScore = maxAmazonsScore;
                  restoredStats.totalDomineeringScore = maxDomineeringScore;
                  restoredStats.totalAbaloneScore = maxAbaloneScore;
                  restoredStats.totalHexScore = maxHexScore;
                  restoredStats.totalChainTriangleScore = maxChainTriangleScore;
                  restoredStats.totalOrbitoScore = maxOrbitoScore;
                  restoredStats.totalPenteScore = maxPenteScore;
                  restoredStats.totalShobuScore = maxShobuScore;
                  restoredStats.totalYinshScore = maxYinshScore;
                  restoredStats.totalOnitamaScore = maxOnitamaScore;
                  restoredStats.totalBadukScore = maxBadukScore;

                  if (mostRecentData.lastGamePlayedAt)
                    restoredStats.lastGamePlayedAt = mostRecentData.lastGamePlayedAt;

                  restoredStats.badges = Array.from(allBadges.values());
                  if (mostRecentData.unlockedModes) {
                    restoredStats.unlockedModes = mostRecentData.unlockedModes;
                  } else {
                    restoredStats.unlockedModes = [];
                  }
                  allUnlockedModes.forEach(m => {
                    if (!restoredStats.unlockedModes!.includes(m as GameMode)) {
                      restoredStats.unlockedModes!.push(m as GameMode);
                    }
                  });
                  if (!restoredStats.unlockedModes!.includes("dominio")) {
                    restoredStats.unlockedModes!.push("dominio");
                  }
                  restoredStats.unlockedModes = Array.from(new Set(restoredStats.unlockedModes));
                  
                  if (mostRecentData.freeUnlockedModes) {
                    restoredStats.freeUnlockedModes = mostRecentData.freeUnlockedModes;
                  } else {
                    restoredStats.freeUnlockedModes = [];
                  }
                  allFreeUnlockedModes.forEach(m => {
                    if (!restoredStats.freeUnlockedModes!.includes(m as GameMode)) {
                      restoredStats.freeUnlockedModes!.push(m as GameMode);
                    }
                  });
                  restoredStats.freeUnlockedModes = Array.from(new Set(restoredStats.freeUnlockedModes));

                  if (mostRecentData.stats) {
                    if (mostRecentData.stats.normale) {
                      restoredStats[2].wins = mostRecentData.stats.normale.wins || 0;
                      restoredStats[2].losses = mostRecentData.stats.normale.losses || 0;
                    }
                    if (mostRecentData.stats.difficile) {
                      restoredStats[2].hardWins = mostRecentData.stats.difficile.wins || 0;
                    }
                  }
                  if (mostRecentData["stats.normale.wins"] !== undefined) restoredStats[2].wins = mostRecentData["stats.normale.wins"];
                  if (mostRecentData["stats.normale.losses"] !== undefined) restoredStats[2].losses = mostRecentData["stats.normale.losses"];
                  if (mostRecentData["stats.difficile.wins"] !== undefined) restoredStats[2].hardWins = mostRecentData["stats.difficile.wins"];

                  if (mostRecentData.stats3?.normale?.wins) restoredStats[3].wins = mostRecentData.stats3.normale.wins;
                  if (mostRecentData.stats3?.normale?.losses) restoredStats[3].losses = mostRecentData.stats3.normale.losses;
                  if (mostRecentData.stats3?.difficile?.wins) restoredStats[3].hardWins = mostRecentData.stats3.difficile.wins;
                  if (mostRecentData["stats3.normale.wins"] !== undefined) restoredStats[3].wins = mostRecentData["stats3.normale.wins"];
                  if (mostRecentData["stats3.normale.losses"] !== undefined) restoredStats[3].losses = mostRecentData["stats3.normale.losses"];
                  if (mostRecentData["stats3.difficile.wins"] !== undefined) restoredStats[3].hardWins = mostRecentData["stats3.difficile.wins"];

                  if (mostRecentData.stats4?.normale?.wins) restoredStats[4].wins = mostRecentData.stats4.normale.wins;
                  if (mostRecentData.stats4?.normale?.losses) restoredStats[4].losses = mostRecentData.stats4.losses;
                  if (mostRecentData.stats4?.difficile?.wins) restoredStats[4].hardWins = mostRecentData.stats4.difficile.wins;
                  if (mostRecentData["stats4.normale.wins"] !== undefined) restoredStats[4].wins = mostRecentData["stats4.normale.wins"];
                  if (mostRecentData["stats4.normale.losses"] !== undefined) restoredStats[4].losses = mostRecentData["stats4.normale.losses"];
                  if (mostRecentData["stats4.difficile.wins"] !== undefined) restoredStats[4].hardWins = mostRecentData["stats4.difficile.wins"];

                  const spent = calculatePointsSpent(restoredStats.unlockedModes || [], savedName, savedLocation, restoredStats.freeUnlockedModes || []);
                  const curSum = (restoredStats.totalScore || 0) + (restoredStats.totalFugaScore || 0) + (restoredStats.totalAmazonsScore || 0) + (restoredStats.totalDomineeringScore || 0) + (restoredStats.totalAbaloneScore || 0) + (restoredStats.totalHexScore || 0) + (restoredStats.totalChainTriangleScore || 0) + (restoredStats.totalOrbitoScore || 0) + (restoredStats.totalPenteScore || 0) + (restoredStats.totalShobuScore || 0) + (restoredStats.totalYinshScore || 0) + (restoredStats.totalOnitamaScore || 0) + (restoredStats.totalBadukScore || 0) - spent;
                  if (maxOverallLeaderboardScore > curSum) {
                    restoredStats.totalScore = (restoredStats.totalScore || 0) + (maxOverallLeaderboardScore - curSum);
                  }

                  setStats(restoredStats);
                  saveStorageItem("wallgo_stats", JSON.stringify(restoredStats));
                  Logger.info("Stats restored from Firebase");
                } else if (localSavedStats && isMounted) {
                  setStats((prev) => {
                    const newStats = { ...prev };
                    if (!newStats.badges) newStats.badges = [];

                    let changed = false;
                    if (maxScore > (newStats.totalScore || 0)) { newStats.totalScore = maxScore; changed = true; }
                    if (maxFugaScore > (newStats.totalFugaScore || 0)) { newStats.totalFugaScore = maxFugaScore; changed = true; }
                    if (maxAmazonsScore > (newStats.totalAmazonsScore || 0)) { newStats.totalAmazonsScore = maxAmazonsScore; changed = true; }
                    if (maxDomineeringScore > (newStats.totalDomineeringScore || 0)) { newStats.totalDomineeringScore = maxDomineeringScore; changed = true; }
                    if (maxAbaloneScore > (newStats.totalAbaloneScore || 0)) { newStats.totalAbaloneScore = maxAbaloneScore; changed = true; }
                    if (maxHexScore > (newStats.totalHexScore || 0)) { newStats.totalHexScore = maxHexScore; changed = true; }
                    if (maxChainTriangleScore > (newStats.totalChainTriangleScore || 0)) { newStats.totalChainTriangleScore = maxChainTriangleScore; changed = true; }
                    if (maxOrbitoScore > (newStats.totalOrbitoScore || 0)) { newStats.totalOrbitoScore = maxOrbitoScore; changed = true; }
                    if (maxPenteScore > (newStats.totalPenteScore || 0)) { newStats.totalPenteScore = maxPenteScore; changed = true; }
                    if (maxShobuScore > (newStats.totalShobuScore || 0)) { newStats.totalShobuScore = maxShobuScore; changed = true; }
                    if (maxYinshScore > (newStats.totalYinshScore || 0)) { newStats.totalYinshScore = maxYinshScore; changed = true; }
                    if (maxOnitamaScore > (newStats.totalOnitamaScore || 0)) { newStats.totalOnitamaScore = maxOnitamaScore; changed = true; }
                    if (maxBadukScore > (newStats.totalBadukScore || 0)) { newStats.totalBadukScore = maxBadukScore; changed = true; }

                    const spent = calculatePointsSpent(newStats.unlockedModes || [], savedName, savedLocation, newStats.freeUnlockedModes || []);
                    const curSum = (newStats.totalScore || 0) + (newStats.totalFugaScore || 0) + (newStats.totalAmazonsScore || 0) + (newStats.totalDomineeringScore || 0) + (newStats.totalAbaloneScore || 0) + (newStats.totalHexScore || 0) + (newStats.totalChainTriangleScore || 0) + (newStats.totalOrbitoScore || 0) + (newStats.totalPenteScore || 0) + (newStats.totalShobuScore || 0) + (newStats.totalYinshScore || 0) + (newStats.totalOnitamaScore || 0) + (newStats.totalBadukScore || 0) - spent;
                    if (maxOverallLeaderboardScore > curSum) {
                      newStats.totalScore = (newStats.totalScore || 0) + (maxOverallLeaderboardScore - curSum);
                      changed = true;
                    }

                    if (allBadges.size > 0) {
                      allBadges.forEach((b) => {
                        const existingIdx = newStats.badges!.findIndex(
                          (lb) => (typeof lb === "string" ? lb : lb.id) === b.id,
                        );
                        if (existingIdx === -1) {
                          newStats.badges!.push(b);
                          changed = true;
                        } else {
                          const existing = newStats.badges![existingIdx];
                          const existingDiff =
                            typeof existing === "string"
                              ? "normale"
                              : existing.difficulty || "normale";
                          const diffValues = { normale: 1, difficile: 2, estrema: 3, maestro: 4 };
                          const currentVal =
                            diffValues[existingDiff as keyof typeof diffValues] || 1;
                          const newVal =
                            diffValues[b.difficulty as keyof typeof diffValues] || 1;
                          if (newVal > currentVal) {
                            newStats.badges![existingIdx] = b;
                            changed = true;
                          }
                        }
                      });
                    }

                    if (changed) {
                      saveStorageItem("wallgo_stats", JSON.stringify(newStats));
                      Logger.info("Stats and scores merged from Firebase");
                    }
                    return newStats;
                  });
                }

                if (allUnlockedModes.size > 0 && isMounted) {
                  setStats((prev) => {
                    const newStats = { ...prev };
                    const existingModes = new Set(newStats.unlockedModes || []);
                    let changed = false;
                    allUnlockedModes.forEach((m) => {
                      if (!existingModes.has(m as GameMode)) {
                        existingModes.add(m as GameMode);
                        changed = true;
                      }
                    });

                    if (changed) {
                      newStats.unlockedModes = Array.from(existingModes) as GameMode[];
                      saveStorageItem("wallgo_stats", JSON.stringify(newStats));
                    }
                    return newStats;
                  });
                }
              }
            }
          } catch (e: any) {
            Logger.error(`Firebase init error: ${e}`);
          }
        }
      } catch (e) {
        console.warn("Config load error:", e);
      }
    };

    loadStatsAsync();

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const loadMissions = async () => {
      const today = getTodayDateString();
      const stored = await loadStorageItem("wallgo_daily_missions");
      if (stored) {
        try {
          const parsed: DailyMissionsState = JSON.parse(stored);
          if (parsed.date === today) {
            // Merge with fresh missions to ensure updated translations are used
            const generated = generateDailyMissions(today);
            parsed.missions = parsed.missions.map(pm => {
              const fresh = generated.find(gm => gm.id === pm.id);
              return fresh ? { ...fresh, isCompleted: pm.isCompleted } : pm;
            });
            saveStorageItem("wallgo_daily_missions", JSON.stringify(parsed));
            
            // Sync history
            loadStorageItem("wallgo_mission_history").then(histStr => {
               const hist = histStr ? JSON.parse(histStr) : {};
               hist[today] = parsed.missions.filter((m: any) => m.isCompleted).map((m: any) => m.id);
               saveStorageItem("wallgo_mission_history", JSON.stringify(hist));
            }).catch(() => {});
            
            setDailyMissions(parsed);
            return;
          }
        } catch (e) {}
      }
      const newMissions = {
        date: today,
        missions: generateDailyMissions(today)
      };
      saveStorageItem("wallgo_daily_missions", JSON.stringify(newMissions));
      setDailyMissions(newMissions);
    };
    loadMissions();
  }, []);

  useEffect(() => {
    if (gameState.status === "ended") {
      
    }
  }, [gameState.status]);

  // Real-time synchronization of room moves from Firestore
  useEffect(() => {
    if (!onlineMatchSession || !db) return;
    if (onlineMatchSession.isSimulatedOpponent) return;
    const roomRef = doc(db, "online_rooms", onlineMatchSession.roomId);

    const unsub = onSnapshot(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

      if (data.status === "aborted" || data.status === "abandoned" || data.status === "saved") {
        if (data.status === "saved") {
          const saver = data.savedByName || (language === "it" ? "L'avversario" : "Opponent");
          alert(
            language === "it"
              ? `💾 ${saver} ha salvato la partita. La potrete riprendere in qualsiasi momento quando rigiocherete insieme a Baduk/Go!`
              : `💾 ${saver} saved the match. You can resume it anytime when playing Baduk/Go together!`
          );
          setOnlineMatchSession(null);
          resetGameToMenu(true);
          return;
        } else if (data.status === "abandoned" && data.abandonedBy && data.abandonedBy !== onlineMatchSession.myPlayerIndex) {
            const currentMode = onlineMatchSession.gameMode || "dominio";
            const winPoints = getOnlineMatchWinPoints(currentMode, onlineMatchSession.boardTheme);
            setStats(prev => {
                let newStats = { ...prev };
                const key = 2;
                newStats[key] = { ...(newStats[key] || { wins: 0, losses: 0, ties: 0 }) };
                newStats[key].wins = (newStats[key].wins || 0) + 1;
                newStats.totalOnlineMatches = (newStats.totalOnlineMatches || 0) + 1;
                const isSimulatedOpponent = !!(onlineMatchSession?.isSimulatedOpponent || (onlineMatchSession?.opponentDeviceId && String(onlineMatchSession.opponentDeviceId).startsWith("ai_simulated_")));
                if (isSimulatedOpponent) {
                  newStats.totalOnlineMatchesVsAi = (newStats.totalOnlineMatchesVsAi || 0) + 1;
                }
                if (!newStats.onlineMatchesByMode) newStats.onlineMatchesByMode = {};
                newStats.onlineMatchesByMode[currentMode] = (newStats.onlineMatchesByMode[currentMode] || 0) + 1;
                newStats = applyModeScore(newStats, currentMode, winPoints);
                saveStorageItem("wallgo_stats", JSON.stringify(newStats));
                if (deviceId && db) {
                  const now = new Date().toISOString();
                  const modeKey = getStatKeyForMode(currentMode);
                  updateDoc(doc(db, "devices", deviceId), {
                    lastActive: now,
                    totalScore: newStats.totalScore || 0,
                    totalOnlineMatches: newStats.totalOnlineMatches || 0,
                    ...(isSimulatedOpponent ? { totalOnlineMatchesVsAi: increment(1) } : {}),
                    [`onlineMatchesByMode.${currentMode}`]: increment(1),
                    totalAmazonsScore: newStats.totalAmazonsScore || 0,
                    totalFugaScore: newStats.totalFugaScore || 0,
                    totalDomineeringScore: newStats.totalDomineeringScore || 0,
                    totalAbaloneScore: newStats.totalAbaloneScore || 0,
                    totalHexScore: newStats.totalHexScore || 0,
                    totalChainTriangleScore: newStats.totalChainTriangleScore || 0,
                    totalPenteScore: newStats.totalPenteScore || 0,
                    totalShobuScore: newStats.totalShobuScore || 0,
                    totalYinshScore: newStats.totalYinshScore || 0,
                    totalOnitamaScore: newStats.totalOnitamaScore || 0,
                    totalOrbitoScore: newStats.totalOrbitoScore || 0,
                    totalBadukScore: newStats.totalBadukScore || 0,
                    totalStrategoScore: newStats.totalStrategoScore || 0,
                    [`${modeKey}.normale.wins`]: increment(1),
                  }).catch(() => {});
                }
                return newStats;
            });
            alert(language === "it" ? `L'avversario ha abbandonato la partita. Vittoria! +${winPoints} punti.` : `Opponent abandoned the match. You win! +${winPoints} points.`);
        } else if (data.status === "aborted") {
            alert(language === "it" ? "La partita online è stata interrotta." : "Online match was interrupted.");
        }
        setOnlineMatchSession(null);
        resetGameToMenu(true);
        return;
      }

      // If move made by the other player or host initial state for guest:
      if (data.lastMoveBy !== onlineMatchSession.myPlayerIndex && data.gameState) {
        try {
          const parsed: GameState = JSON.parse(data.gameState);
          const incomingSyncCount = data.turnCount ?? 0;
          if (incomingSyncCount > previousOnlineTurnCount.current && incomingSyncCount > 0) {
            try {
              SoundManager.playMovePiece();
            } catch (e) {}
          }
          previousOnlineTurnCount.current = incomingSyncCount;

          if (data.isResumedGame) {
            setIsResumeOnlineBadukModalOpen(false);
            setPendingResumeBadukSave(null);
            const mySavedIdx = parsed.players?.findIndex(
              (p: any) => p.name?.trim().toLowerCase() === (userName || "").trim().toLowerCase()
            );
            if (mySavedIdx !== undefined && mySavedIdx !== -1) {
              setOnlineMatchSession((prev) =>
                prev ? { ...prev, myPlayerIndex: (mySavedIdx + 1) as 1 | 2 } : null
              );
            }
          }

          // Check if game has ended in incoming state or remote room document
          const isGameOverState = parsed.status === "ended" || (parsed.winner !== null && parsed.winner !== undefined) || data.status === "finished" || (data.winner !== undefined && data.winner !== null);
          if (isGameOverState) {
            if ((parsed.gameMode || onlineMatchSession.gameMode) === "baduk" && db) {
              const pKey = getBadukPairKey(userName, onlineMatchSession.opponentName);
              deleteDoc(doc(db, "saved_online_games", `baduk_saved_${pKey}`)).catch(() => {});
            }
            const rawWinner = parsed.winner ?? data.winner;
            const winnerId: PlayerId | "draw" = (rawWinner === "draw" || rawWinner === 1 || rawWinner === 2 || rawWinner === 3 || rawWinner === 4) ? rawWinner : (data.winner ?? "draw");
            const isWin = winnerId === onlineMatchSession.myPlayerIndex;
            const isLoss = winnerId !== "draw" && winnerId !== onlineMatchSession.myPlayerIndex;
            const isDraw = winnerId === "draw";

            parsed.status = "ended";
            parsed.winner = winnerId;

            const currentMode = parsed.gameMode || onlineMatchSession.gameMode || "dominio";
            const currentTheme = parsed.boardTheme || onlineMatchSession.boardTheme;
            let winPoints = 0;

            if (!processedOnlineEndRoomsRef.current.has(onlineMatchSession.roomId)) {
              processedOnlineEndRoomsRef.current.add(onlineMatchSession.roomId);

              if (isWin) {
                winPoints = getOnlineMatchWinPoints(currentMode, currentTheme);
                winEffectRef.current = Math.random() > 0.5 ? "fireworks" : "confetti";
                if (sfxVolume > 0) {
                  try {
                    SoundManager.stopBackgroundMusic();
                    setTimeout(() => SoundManager.playVictory(), 200);
                  } catch (e) {}
                }
              } else if (isLoss) {
                if (sfxVolume > 0) {
                  try {
                    SoundManager.stopBackgroundMusic();
                    setTimeout(() => SoundManager.playDefeat(), 200);
                  } catch (e) {}
                }
              }

              // Update stats for the player
              setStats((prevStats) => {
                let updated = { ...prevStats };
                const key = 2;
                updated[key] = { ...(updated[key] || { wins: 0, losses: 0, ties: 0 }) };
                if (isWin) {
                  updated[key].wins = (updated[key].wins || 0) + 1;
                } else if (isLoss) {
                  updated[key].losses = (updated[key].losses || 0) + 1;
                } else if (isDraw) {
                  updated[key].ties = (updated[key].ties || 0) + 1;
                }
                updated.totalOnlineMatches = (updated.totalOnlineMatches || 0) + 1;
                const isSimulatedOpponent = !!(onlineMatchSession?.isSimulatedOpponent || (onlineMatchSession?.opponentDeviceId && String(onlineMatchSession.opponentDeviceId).startsWith("ai_simulated_")));
                if (isSimulatedOpponent) {
                  updated.totalOnlineMatchesVsAi = (updated.totalOnlineMatchesVsAi || 0) + 1;
                }
                if (!updated.onlineMatchesByMode) updated.onlineMatchesByMode = {};
                updated.onlineMatchesByMode[currentMode] = (updated.onlineMatchesByMode[currentMode] || 0) + 1;

                let guestMissionBonus = 0;
                if (dailyMissions) {
                  const today = getTodayDateString();
                  if (dailyMissions.date === today) {
                    let changed = false;
                    const updatedMissions = dailyMissions.missions.map((m) => {
                      if (m.isCompleted) return m;
                      let completed = false;
                      if (m.type === "play_multiplayer") completed = true;
                      if (isWin) {
                        if (m.type === "win_mode" && m.target === currentMode) completed = true;
                        if (m.type === "win_theme" && m.target === currentTheme) completed = true;
                        if (m.type === "win_multiplayer") completed = true;
                        if (m.type === "win_multiplayer_mode" && m.target === currentMode) completed = true;
                      }
                      if (completed) {
                        changed = true;
                        guestMissionBonus += m.reward;
                        return { ...m, isCompleted: true };
                      }
                      return m;
                    });
                    if (changed) {
                      const newState = { date: today, missions: updatedMissions };
                      setDailyMissions(newState);
                      saveStorageItem("wallgo_daily_missions", JSON.stringify(newState));
                      const completedIds = updatedMissions.filter(m => m.isCompleted).map(m => m.id);
                      loadStorageItem("wallgo_mission_history").then(histStr => {
                        const hist = histStr ? JSON.parse(histStr) : {};
                        hist[today] = completedIds;
                        saveStorageItem("wallgo_mission_history", JSON.stringify(hist));
                      }).catch(() => {});
                    }
                  }
                }
                if (guestMissionBonus > 0) {
                  updated.totalScore = (updated.totalScore || 0) + guestMissionBonus;
                  winPoints += guestMissionBonus;
                }

                if (isWin && winPoints > 0) {
                  updated = applyModeScore(updated, currentMode, winPoints);
                }

                saveStorageItem("wallgo_stats", JSON.stringify(updated));

                if (deviceId && db) {
                  const today = getTodayDateString();
                  const isSameDay = prevStats.lastGamePlayedAt ? prevStats.lastGamePlayedAt.startsWith(today) : false;
                  const now = new Date().toISOString();
                  const modeKey = getStatKeyForMode(currentMode);
                  const diffKey = "normale";
                  const updates: any = {
                    lastActive: now,
                    lastGamePlayedAt: now,
                    gamesPlayedToday: isSameDay ? increment(1) : 1,
                    totalScore: updated.totalScore || 0,
                    totalOnlineMatches: updated.totalOnlineMatches || 0,
                    ...(isSimulatedOpponent ? { totalOnlineMatchesVsAi: increment(1) } : {}),
                    [`onlineMatchesByMode.${currentMode}`]: increment(1),
                    totalAmazonsScore: updated.totalAmazonsScore || 0,
                    totalFugaScore: updated.totalFugaScore || 0,
                    totalDomineeringScore: updated.totalDomineeringScore || 0,
                    totalAbaloneScore: updated.totalAbaloneScore || 0,
                    totalHexScore: updated.totalHexScore || 0,
                    totalChainTriangleScore: updated.totalChainTriangleScore || 0,
                    totalPenteScore: updated.totalPenteScore || 0,
                    totalShobuScore: updated.totalShobuScore || 0,
                    totalYinshScore: updated.totalYinshScore || 0,
                    totalOnitamaScore: updated.totalOnitamaScore || 0,
                    totalOrbitoScore: updated.totalOrbitoScore || 0,
                    totalBadukScore: updated.totalBadukScore || 0,
                    totalStrategoScore: updated.totalStrategoScore || 0,
                    [`${modeKey}.${diffKey}.wins`]: increment(isWin ? 1 : 0),
                    [`${modeKey}.${diffKey}.losses`]: increment(isLoss ? 1 : 0),
                  };
                  updateDoc(doc(db, "devices", deviceId), updates).catch((e) => console.error("Firebase update doc error:", e));
                }

                return updated;
              });

              parsed.matchResult = {
                pointsEarned: isWin ? winPoints : 0,
                earnedBadges: [],
              };
            } else {
              const pts = isWin ? getOnlineMatchWinPoints(currentMode, currentTheme) : 0;
              parsed.matchResult = {
                pointsEarned: pts,
                earnedBadges: [],
              };
            }
          }

          setGameState(parsed);
          if (parsed.gameMode) {
            setGameMode(parsed.gameMode);
            localStorage.setItem("wallgo_gamemode", parsed.gameMode);
          }
          if (parsed.boardTheme) {
            setBoardTheme(parsed.boardTheme);
            localStorage.setItem("wallgo_theme", parsed.boardTheme);
          }
        } catch (err) {
          console.error("Failed to parse incoming game state:", err);
        }
      }
    }, (err) => {
      console.warn("Firestore room snapshot error:", err?.message || err);
    });
    return () => unsub();
  }, [onlineMatchSession, deviceId, db, sfxVolume, language]);

  // Sync state to online room when local player makes a move
  useEffect(() => {
    if (!onlineMatchSession || !db) return;
    if (gameState.status !== "playing" && gameState.status !== "ended") return;

    const totalPieces = gameState.players.reduce((acc, p) => acc + (p.positions?.length || 0), 0);
    const totalWalls = gameState.walls?.length || 0;
    const yinshRings = gameState.yinshState?.rings?.length || 0;
    const yinshMarkers = Object.keys(gameState.yinshState?.markers || {}).length;
    const yinshRingsWon = gameState.yinshState?.ringsWon
      ? ((gameState.yinshState.ringsWon[1] || 0) + (gameState.yinshState.ringsWon[2] || 0))
      : 0;
    const yinshPhaseVal = gameState.yinshState
      ? (gameState.yinshState.phase === 'remove_markers' ? 1 : gameState.yinshState.phase === 'remove_ring' ? 2 : 0)
      : 0;
    const chainTriangleBands = gameState.chainTriangleState?.rubberBands?.length || 0;

    const syncCount =
      (gameState.turnCount * 100000) +
      (yinshRings * 1000) +
      (yinshMarkers * 50) +
      (yinshRingsWon * 200) +
      (yinshPhaseVal * 10) +
      (chainTriangleBands * 10) +
      (totalWalls * 10) +
      totalPieces;

    if (syncCount > previousOnlineTurnCount.current) {
      const prevPlayerIndex = gameState.currentPlayerIndex === 0 ? 1 : 0;
      const whoMoved = gameState.lastMovedPlayerId || (gameState.winner ? (gameState.currentPlayerIndex + 1) : (prevPlayerIndex + 1));
      if (whoMoved === onlineMatchSession.myPlayerIndex || onlineMatchSession.isSimulatedOpponent) {
        previousOnlineTurnCount.current = syncCount;
        setDoc(doc(db, "online_rooms", onlineMatchSession.roomId), {
          gameState: JSON.stringify(gameState),
          lastMoveBy: whoMoved,
          turnCount: syncCount,
          status: gameState.winner ? "finished" : "playing",
          winner: gameState.winner ?? null,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.error("Sync move error:", err));
      }
    }
  }, [gameState, onlineMatchSession]);

  // Listen for incoming game invites targeting our deviceId
  useEffect(() => {
    if (!db || !deviceId) return;
    const q = query(
      collection(db, "game_invites"),
      where("toDeviceId", "==", deviceId),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        let latestInvite: any = null;
        snapshot.forEach((d) => {
          const data = d.data();
          if (Date.now() - (data.timestamp || 0) < 60000) {
            latestInvite = { id: d.id, ...data };
          }
        });
        if (latestInvite) {
          setIncomingInvite({
            id: latestInvite.id,
            fromDeviceId: latestInvite.fromDeviceId,
            fromName: latestInvite.fromName || "Player",
            fromLocation: latestInvite.fromLocation,
            gameMode: latestInvite.gameMode || "dominio",
            boardTheme: latestInvite.boardTheme,
            roomId: latestInvite.roomId,
          });
        }
      } else {
        setIncomingInvite(null);
      }
    }, (err) => {
      console.warn("Firestore game invites listener error:", err?.message || err);
    });

    return () => unsub();
  }, [deviceId]);

  // Se il giocatore ha l'app aperta e non sceglie un gioco entro 10 secondi,
  // solo una volta al giorno un giocatore finto lo sfida online a un gioco casuale (escluso Baduk/Go).
  useEffect(() => {
    const isWaitingToChooseGame =
      !isSplashActive &&
      gameState.status === "setup" &&
      setupView === "grid" &&
      !onlineMatchSession &&
      !incomingInvite &&
      !isOnlineSearchOpen &&
      !isSettingsOpen &&
      !isRulesOpen &&
      !isHistoryOpen &&
      !isLeaderboardOpen &&
      !isRegistrationOpen &&
      !isAdminStatsOpen &&
      !isPrivacyOpen &&
      !isOrbitoRulesOpen &&
      !isPenteRulesOpen &&
      !isShobuRulesOpen &&
      !isYinshRulesOpen &&
      !isOnitamaRulesOpen &&
      !isBadukRulesOpen &&
      !isStrategoRulesOpen &&
      unlockModalMode === null &&
      !isDailyMissionsOpen &&
      !isExitAlertOpen &&
      !isResumeOnlineBadukModalOpen;

    if (!isWaitingToChooseGame) {
      return;
    }

    const todayStr = getTodayDateString();
    const lastDailyFakeDate = localStorage.getItem("wallgo_last_daily_fake_invite_date");
    if (lastDailyFakeDate === todayStr) {
      return;
    }

    const idleTimer = setTimeout(() => {
      const currentTodayStr = getTodayDateString();
      if (localStorage.getItem("wallgo_last_daily_fake_invite_date") === currentTodayStr) {
        return;
      }

      // Imposta la data odierna per garantire che avvenga rigorosamente una sola volta al giorno
      localStorage.setItem("wallgo_last_daily_fake_invite_date", currentTodayStr);

      // Seleziona un candidato casuale tra i giocatori finti internazionali (punteggio <= 150)
      const candidate = AI_PLAYER_CANDIDATES[Math.floor(Math.random() * AI_PLAYER_CANDIDATES.length)];

      // Giochi casuali multiplayer ad esclusione di baduk/go
      const ELIGIBLE_MODES: GameMode[] = [
        "dominio",
        "corsa",
        "pente",
        "amazons",
        "domineering",
        "hex",
        "chain_triangle",
        "orbito",
        "shobu",
        "yinsh",
        "abalone",
        "onitama",
      ];
      const randomMode = ELIGIBLE_MODES[Math.floor(Math.random() * ELIGIBLE_MODES.length)];

      let theme: BoardTheme = "neon";
      if (randomMode === "abalone") {
        theme = ALL_ABALONE_THEMES[Math.floor(Math.random() * ALL_ABALONE_THEMES.length)];
      } else if (randomMode === "amazons") {
        theme = "amazons-6";
      } else if (randomMode === "onitama") {
        theme = "onitama-dark";
      } else if (randomMode === "corsa") {
        theme = "corsa";
      } else if (randomMode === "pente") {
        theme = "pente";
      } else if (randomMode === "hex") {
        theme = "hex";
      } else if (randomMode === "orbito") {
        theme = "orbito";
      } else if (randomMode === "shobu") {
        theme = "shobu";
      } else if (randomMode === "yinsh") {
        theme = "yinsh";
      } else if (randomMode === "chain_triangle") {
        theme = "chain_triangle";
      } else if (randomMode === "domineering") {
        theme = "domineering";
      }

      const fakeInviteId = `ai_simulated_invite_${Date.now()}`;
      const fakeDeviceId = `ai_simulated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fakeRoomId = `room_${fakeInviteId}`;

      setIncomingInvite({
        id: fakeInviteId,
        fromDeviceId: fakeDeviceId,
        fromName: candidate.name,
        fromLocation: candidate.location,
        fromScore: candidate.score,
        gameMode: randomMode,
        boardTheme: theme,
        roomId: fakeRoomId,
      });

      try {
        SoundManager.playMovePiece();
      } catch (e) {}
    }, 10000);

    return () => clearTimeout(idleTimer);
  }, [
    isSplashActive,
    gameState.status,
    setupView,
    onlineMatchSession,
    incomingInvite,
    isOnlineSearchOpen,
    isSettingsOpen,
    isRulesOpen,
    isHistoryOpen,
    isLeaderboardOpen,
    isRegistrationOpen,
    isAdminStatsOpen,
    isPrivacyOpen,
    isOrbitoRulesOpen,
    isPenteRulesOpen,
    isShobuRulesOpen,
    isYinshRulesOpen,
    isOnitamaRulesOpen,
    isBadukRulesOpen,
    isStrategoRulesOpen,
    unlockModalMode,
    isDailyMissionsOpen,
    isExitAlertOpen,
    isResumeOnlineBadukModalOpen,
  ]);

  const handleAcceptIncomingInvite = async (inv: IncomingInviteData) => {
    const isSimulated = inv.id.startsWith("ai_simulated_") || inv.fromDeviceId.startsWith("ai_simulated_");
    if (db && !isSimulated) {
      try {
        await updateDoc(doc(db, "game_invites", inv.id), {
          status: "accepted",
        });
      } catch (e) {
        console.error("Failed to accept invite:", e);
      }
    }
    setIncomingInvite(null);

    // Pre-popolamento stanza per statistiche admin se simulata
    if (isSimulated && db) {
      try {
        await setDoc(doc(db, "online_rooms", inv.roomId), {
          roomId: inv.roomId,
          gameMode: inv.gameMode,
          boardTheme: inv.boardTheme || null,
          hostDeviceId: inv.fromDeviceId,
          hostName: inv.fromName,
          hostLocation: inv.fromLocation || "",
          guestDeviceId: deviceId,
          guestName: userName || "Player",
          guestLocation: userLocation || "",
          isGuestAI: false,
          isHostAI: true,
          isSimulatedOpponent: true,
          opponentDeviceId: inv.fromDeviceId,
          status: "playing",
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {}
    }

    if (isSimulated) {
      // Inserisci temporaneamente il giocatore finto nella classifica per 24 ore
      insertSimulatedPlayerToLeaderboard({
        name: inv.fromName,
        location: inv.fromLocation,
        score: inv.fromScore,
        gameMode: inv.gameMode,
      }).catch(() => {});
    }

    startOnlineMatch({
      roomId: inv.roomId,
      gameMode: inv.gameMode,
      boardTheme: inv.boardTheme,
      myPlayerIndex: 2, // Guest
      opponentName: inv.fromName,
      opponentLocation: inv.fromLocation,
      opponentDeviceId: inv.fromDeviceId,
      opponentScore: inv.fromScore,
      isInviter: false,
      isSimulatedOpponent: isSimulated,
    });
  };

  const handleDeclineIncomingInvite = async (inviteId: string) => {
    if (db && !inviteId.startsWith("ai_simulated_")) {
      try {
        await updateDoc(doc(db, "game_invites", inviteId), {
          status: "declined",
        });
      } catch (e) {}
    }
    setIncomingInvite(null);
  };

  const startOnlineMatch = (matchData: {
    roomId: string;
    gameMode: GameMode;
    boardTheme?: BoardTheme;
    myPlayerIndex: 1 | 2;
    opponentName: string;
    opponentLocation?: string;
    opponentDeviceId?: string;
    opponentScore?: number;
    isInviter?: boolean;
    isSimulatedOpponent?: boolean;
  }) => {
    const isCorsa = matchData.gameMode === "corsa";
    const isAmazons = matchData.gameMode === "amazons";

    const isSimulatedAI = !!(
      matchData.isSimulatedOpponent ||
      matchData.opponentDeviceId?.startsWith("ai_simulated_")
    );

    if (isSimulatedAI) {
      insertSimulatedPlayerToLeaderboard({
        name: matchData.opponentName,
        location: matchData.opponentLocation,
        score: matchData.opponentScore,
        gameMode: matchData.gameMode,
      }).catch(() => {});
    }

    const effectiveTheme: BoardTheme =
      matchData.boardTheme ||
      (matchData.gameMode === "corsa"
        ? "corsa"
        : matchData.gameMode === "amazons"
          ? "amazons-6"
          : matchData.gameMode === "domineering"
            ? "domineering"
            : matchData.gameMode === "abalone"
              ? (isRandomAbaloneTheme
                  ? ALL_ABALONE_THEMES[Math.floor(Math.random() * ALL_ABALONE_THEMES.length)]
                  : (boardTheme && boardTheme.startsWith("abalone") ? boardTheme : "abalone"))
              : matchData.gameMode === "hex"
                ? "hex"
                : matchData.gameMode === "orbito"
                  ? "orbito"
                  : matchData.gameMode === "pente"
                    ? "pente"
                    : matchData.gameMode === "chain_triangle"
                      ? "chain_triangle"
                      : matchData.gameMode === "shobu"
                        ? "shobu"
                        : matchData.gameMode === "yinsh"
                          ? "yinsh"
                          : matchData.gameMode === "onitama"
                            ? "onitama-dark"
                            : matchData.gameMode === "baduk"
                              ? "baduk-9"
                              : matchData.gameMode === "stratego"
                                ? "stratego-classic"
                                : "neon");

    setGameMode(matchData.gameMode);
    setBoardTheme(effectiveTheme);
    setSetupView("details");
    localStorage.setItem("wallgo_gamemode", matchData.gameMode);
    localStorage.setItem("wallgo_theme", effectiveTheme);
    setPlayerCount(2);
    const isInviter = matchData.isInviter ?? (matchData.myPlayerIndex === 1);
    setOnlineMatchSession({ ...matchData, isInviter, isSimulatedOpponent: isSimulatedAI });
    setShowPostOnlineInviteModal(false);
    setHasShownPostOnlineInviteModal(false);
    setPostOnlineInviteSession(null);
    previousOnlineTurnCount.current = -1;
    setIsAIThinking(false);
    aiRunningRef.current = false;

    const startingPositions: Record<number, Point[]> = {};
    if (isCorsa) {
      startingPositions[1] = [{ r: 8, c: 4 }];
      startingPositions[2] = [{ r: 0, c: 4 }];
    } else if (matchData.gameMode === "abalone") {
      const abalonePositions = getAbaloneStartingPositions(effectiveTheme);
      startingPositions[1] = abalonePositions[1];
      startingPositions[2] = abalonePositions[2];
    } else if (matchData.gameMode === "shobu") {
      startingPositions[1] = [
        { r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 }, // Board 1 (top-left)
        { r: 3, c: 5 }, { r: 3, c: 6 }, { r: 3, c: 7 }, { r: 3, c: 8 }, // Board 2 (top-right)
        { r: 8, c: 0 }, { r: 8, c: 1 }, { r: 8, c: 2 }, { r: 8, c: 3 }, // Board 3 (bot-left)
        { r: 8, c: 5 }, { r: 8, c: 6 }, { r: 8, c: 7 }, { r: 8, c: 8 }, // Board 4 (bot-right)
      ];
      startingPositions[2] = [
        { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, // Board 1
        { r: 0, c: 5 }, { r: 0, c: 6 }, { r: 0, c: 7 }, { r: 0, c: 8 }, // Board 2
        { r: 5, c: 0 }, { r: 5, c: 1 }, { r: 5, c: 2 }, { r: 5, c: 3 }, // Board 3
        { r: 5, c: 5 }, { r: 5, c: 6 }, { r: 5, c: 7 }, { r: 5, c: 8 }, // Board 4
      ];
    } else if (matchData.gameMode === "onitama") {
      startingPositions[1] = [
        { r: 4, c: 2 }, { r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 3 }, { r: 4, c: 4 }
      ];
      startingPositions[2] = [
        { r: 0, c: 2 }, { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 3 }, { r: 0, c: 4 }
      ];
    }

    const hostName = matchData.myPlayerIndex === 1 ? (userName || "Player 1") : matchData.opponentName;
    const guestName = matchData.myPlayerIndex === 2 ? (userName || "Player 2") : matchData.opponentName;

    const isHostAI = isSimulatedAI && matchData.myPlayerIndex === 2;
    const isGuestAI = isSimulatedAI && matchData.myPlayerIndex === 1;

    const onlinePlayers: Player[] = [
      {
        id: 1,
        name: hostName,
        positions: (startingPositions[1] || []).map((p) => ({
          ...p,
          id: `piece-1-${Math.random().toString(36).substr(2, 9)}`,
        })),
        color: PLAYER_COLORS[1],
        isAI: isHostAI,
        score: matchData.gameMode === "baduk" ? 0 : 0,
        isEnclosed: false,
        isTrapped: false,
        hasWallbreaker: !isCorsa && !isAmazons && matchData.gameMode !== "abalone" && matchData.gameMode !== "orbito" && matchData.gameMode !== "shobu" && matchData.gameMode !== "hex",
        wallsLeft: isCorsa ? 10 : 0,
      },
      {
        id: 2,
        name: guestName,
        positions: (startingPositions[2] || []).map((p) => ({
          ...p,
          id: `piece-2-${Math.random().toString(36).substr(2, 9)}`,
        })),
        color: PLAYER_COLORS[2],
        isAI: isGuestAI,
        score: matchData.gameMode === "baduk" ? 7.5 : 0,
        isEnclosed: false,
        isTrapped: false,
        hasWallbreaker: !isCorsa && !isAmazons && matchData.gameMode !== "abalone" && matchData.gameMode !== "orbito" && matchData.gameMode !== "shobu" && matchData.gameMode !== "hex",
        wallsLeft: isCorsa ? 10 : 0,
      }
    ];

    const initialTurnPhase = isCorsa || (isAmazons && startingPositions[1] && startingPositions[1].length > 0) || matchData.gameMode === "abalone" || matchData.gameMode === "orbito" || matchData.gameMode === "shobu" || matchData.gameMode === "chain_triangle" || matchData.gameMode === "yinsh" || matchData.gameMode === "onitama"
      ? "moving"
      : "setup";

    const newGameState: GameState = {
      players: onlinePlayers,
      walls: [],
      currentPlayerIndex: 0,
      startingPlayerIndex: 0,
      turnPhase: initialTurnPhase,
      setupStep: 0,
      selectedPieceIndex: isCorsa ? 0 : null,
      moveBackupPos: null,
      winner: null,
      status: "playing",
      history: [],
      territoryMap: {},
      difficulty: "normale",
      usedWallbreakerThisTurn: false,
      consecutivePasses: 0,
      gameMode: matchData.gameMode,
      boardTheme: effectiveTheme,
      corsaAction: isCorsa ? "move" : undefined,
      fugaWallPreview: null,
      chainTriangleState: matchData.gameMode === "chain_triangle" ? {
        rubberBands: [],
        triangles: generateAllTriangles(generateTriggleBoard()),
        selectedPeg: null,
      } : undefined,
      yinshState: matchData.gameMode === "yinsh" ? createInitialYinshState() : undefined,
      onitamaState: matchData.gameMode === "onitama" ? createInitialOnitamaState(1) : undefined,
      orbitoPhase: matchData.gameMode === "orbito" ? "place" : undefined,
      lastPlacedPiece: null,
      lastMoveByPlayer: {},
      turnCount: 0,
    };

    setGameState(newGameState);
    setPenteDyingPieces([]);
    enterFullScreen();
    hideMobileAddressBar();

    if ((matchData.myPlayerIndex === 1 || isSimulatedAI) && db) {
      setDoc(doc(db, "online_rooms", matchData.roomId), {
        roomId: matchData.roomId,
        gameMode: matchData.gameMode,
        boardTheme: effectiveTheme,
        gameState: JSON.stringify(newGameState),
        lastMoveBy: 0,
        turnCount: 0,
        hostName,
        guestName,
        isGuestAI: isSimulatedAI && matchData.myPlayerIndex === 1,
        isHostAI: isSimulatedAI && matchData.myPlayerIndex === 2,
        isSimulatedOpponent: isSimulatedAI,
        opponentDeviceId: matchData.opponentDeviceId || null,
        status: "playing",
        ...(matchData.gameMode === "stratego" ? {
          strategoMove: null,
        } : {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.error("Error setting initial room state:", err));
    }

    // Se la partita è a Baduk/Go in multiplayer, controlla se esiste un salvataggio precedente tra questi 2 giocatori
    if (matchData.gameMode === "baduk" && db) {
      const myName = userName || (matchData.myPlayerIndex === 1 ? "Player 1" : "Player 2");
      const oppName = matchData.opponentName;
      const pairKey = getBadukPairKey(myName, oppName);
      const saveDocId = `baduk_saved_${pairKey}`;

      getDoc(doc(db, "saved_online_games", saveDocId)).then((snap) => {
        if (snap.exists()) {
          const savedData = snap.data();
          if (savedData && savedData.gameState) {
            setPendingResumeBadukSave(savedData);
            setIsResumeOnlineBadukModalOpen(true);
          }
        }
      }).catch((e) => console.error("Error checking saved baduk match:", e));
    }
  };

  const handleAcceptResumeBaduk = async (saveData: any) => {
    if (!onlineMatchSession || !db) return;
    try {
      const parsedGameState: GameState = JSON.parse(saveData.gameState);

      // Assicura che l'utente mantenga il colore e l'indice corretto della partita salvata
      const mySavedIdx = parsedGameState.players.findIndex(
        (p) => p.name?.trim().toLowerCase() === (userName || "").trim().toLowerCase()
      );
      if (mySavedIdx !== -1) {
        setOnlineMatchSession((prev) =>
          prev ? { ...prev, myPlayerIndex: (mySavedIdx + 1) as 1 | 2 } : null
        );
      }

      setGameState(parsedGameState);
      if (parsedGameState.boardTheme) {
        setBoardTheme(parsedGameState.boardTheme);
        localStorage.setItem("wallgo_theme", parsedGameState.boardTheme);
      }
      if (parsedGameState.gameMode) {
        setGameMode(parsedGameState.gameMode);
        localStorage.setItem("wallgo_gamemode", parsedGameState.gameMode);
      }
      setIsResumeOnlineBadukModalOpen(false);
      setPendingResumeBadukSave(null);

      // Sincronizza lo stato ripreso con la stanza online
      const newTurnCount = (parsedGameState.turnCount || 0) + 1;
      previousOnlineTurnCount.current = newTurnCount;
      await setDoc(
        doc(db, "online_rooms", onlineMatchSession.roomId),
        {
          gameState: JSON.stringify(parsedGameState),
          lastMoveBy: 0,
          turnCount: newTurnCount,
          isResumedGame: true,
          status: "playing",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Rimuovi il salvataggio una volta ripreso
      if (saveData.saveId) {
        await deleteDoc(doc(db, "saved_online_games", saveData.saveId)).catch(() => {});
      }

      alert(
        language === "it"
          ? "Partita salvata ripresa con successo!"
          : "Saved match resumed successfully!"
      );
    } catch (e) {
      console.error("Error resuming saved baduk match:", e);
      alert(language === "it" ? "Errore nel ripristino della partita salvata." : "Error restoring saved match.");
    }
  };

  const handleSaveOnlineBadukGame = async (shouldExit = false) => {
    if (!onlineMatchSession || !db || (gameState.gameMode || gameMode) !== "baduk" || gameState.status === "ended") return;
    try {
      setIsSavingOnlineBaduk(true);
      const myName = userName || (onlineMatchSession.myPlayerIndex === 1 ? "Player 1" : "Player 2");
      const oppName = onlineMatchSession.opponentName || (onlineMatchSession.myPlayerIndex === 1 ? "Player 2" : "Player 1");
      const pairKey = getBadukPairKey(myName, oppName);
      const saveDocId = `baduk_saved_${pairKey}`;

      // Se l'utente stava visionando mosse precedenti (< o >), salviamo comunque lo stato attuale completo
      let stateToSave = gameState;
      if (gameState.futureStates && gameState.futureStates.length > 0) {
        const presentState = gameState.futureStates[gameState.futureStates.length - 1];
        const newPastStates = [
          ...(gameState.pastStates || []),
          {
            players: gameState.players,
            currentPlayerIndex: gameState.currentPlayerIndex,
            turnPhase: gameState.turnPhase,
            badukKoPoint: gameState.badukKoPoint,
          },
          ...gameState.futureStates.slice(0, -1),
        ];
        stateToSave = {
          ...gameState,
          ...presentState,
          pastStates: newPastStates,
          futureStates: [],
        };
      }

      const savePayload = {
        saveId: saveDocId,
        gameMode: "baduk",
        boardTheme: stateToSave.boardTheme || boardTheme,
        player1Name: onlineMatchSession.myPlayerIndex === 1 ? myName : oppName,
        player2Name: onlineMatchSession.myPlayerIndex === 2 ? myName : oppName,
        playersNormalized: [myName.trim().toLowerCase(), oppName.trim().toLowerCase()].sort(),
        savedAt: new Date().toISOString(),
        savedByName: myName,
        savedByDeviceId: deviceId,
        gameState: JSON.stringify(stateToSave),
        turnCount: stateToSave.turnCount || 0,
        currentPlayerIndex: stateToSave.currentPlayerIndex,
      };

      await setDoc(doc(db, "saved_online_games", saveDocId), savePayload);

      if (shouldExit) {
        // Notifica la stanza online in modo che entrambi i giocatori escano in sicurezza senza penalità
        await updateDoc(doc(db, "online_rooms", onlineMatchSession.roomId), {
          status: "saved",
          savedByName: myName,
          updatedAt: new Date().toISOString(),
        }).catch((err) => console.error("Error updating room status to saved:", err));

        setOnlineMatchSession(null);
        resetGameToMenu(true);
        alert(
          language === "it"
            ? "Partita salvata con successo! Potrete riprenderla quando rigiocherete insieme a Baduk/Go."
            : "Match saved successfully! You can resume it next time you play Baduk/Go together."
        );
      } else {
        alert(
          language === "it"
            ? "💾 Partita salvata con successo! Potrete riprenderla in qualsiasi momento."
            : "💾 Match saved successfully! You can resume it at any time."
        );
      }
    } catch (err) {
      console.error("Failed to save online baduk match:", err);
      alert(language === "it" ? "Errore durante il salvataggio della partita." : "Error saving game.");
    } finally {
      setIsSavingOnlineBaduk(false);
    }
  };

  const handleOnlineAbandon = () => {
    if (onlineMatchSession && db) {
      try {
        updateDoc(doc(db, "online_rooms", onlineMatchSession.roomId), {
          status: "abandoned",
          abandonedBy: onlineMatchSession.myPlayerIndex,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {}
      
      const currentMode = onlineMatchSession.gameMode || "dominio";
      let newStats = { ...stats };
      const key = 2;
      newStats[key] = { ...(newStats[key] || { wins: 0, losses: 0, ties: 0 }) };
      newStats[key].losses = (newStats[key].losses || 0) + 1;
      newStats.totalOnlineMatches = (newStats.totalOnlineMatches || 0) + 1;
      const isSimulatedOpponent = !!(onlineMatchSession?.isSimulatedOpponent || (onlineMatchSession?.opponentDeviceId && String(onlineMatchSession.opponentDeviceId).startsWith("ai_simulated_")));
      if (isSimulatedOpponent) {
        newStats.totalOnlineMatchesVsAi = (newStats.totalOnlineMatchesVsAi || 0) + 1;
      }
      if (!newStats.onlineMatchesByMode) newStats.onlineMatchesByMode = {};
      newStats.onlineMatchesByMode[currentMode] = (newStats.onlineMatchesByMode[currentMode] || 0) + 1;
      newStats = applyModeScore(newStats, currentMode, -2);
      setStats(newStats);
      saveStorageItem("wallgo_stats", JSON.stringify(newStats));
      
      if (deviceId && db) {
        const now = new Date().toISOString();
        const modeKey = getStatKeyForMode(currentMode);
        updateDoc(doc(db, "devices", deviceId), {
          lastActive: now,
          totalScore: newStats.totalScore || 0,
          totalOnlineMatches: newStats.totalOnlineMatches || 0,
          ...(isSimulatedOpponent ? { totalOnlineMatchesVsAi: increment(1) } : {}),
          [`onlineMatchesByMode.${currentMode}`]: increment(1),
          totalAmazonsScore: newStats.totalAmazonsScore || 0,
          totalFugaScore: newStats.totalFugaScore || 0,
          totalDomineeringScore: newStats.totalDomineeringScore || 0,
          totalAbaloneScore: newStats.totalAbaloneScore || 0,
          totalHexScore: newStats.totalHexScore || 0,
          totalChainTriangleScore: newStats.totalChainTriangleScore || 0,
          totalPenteScore: newStats.totalPenteScore || 0,
          totalShobuScore: newStats.totalShobuScore || 0,
          totalYinshScore: newStats.totalYinshScore || 0,
          totalOnitamaScore: newStats.totalOnitamaScore || 0,
          totalOrbitoScore: newStats.totalOrbitoScore || 0,
          totalBadukScore: newStats.totalBadukScore || 0,
          [`${modeKey}.normale.losses`]: increment(1),
        }).catch(() => {});
      }

      if (typeof syncUserDataToFirebase === 'function') {
         syncUserDataToFirebase(deviceId, userName || "Player", userLocation, newStats);
      }

      alert(language === "it" ? "Hai abbandonato la partita. Penalità: -2 punti." : "You abandoned the match. Penalty: -2 points.");
      setOnlineMatchSession(null);
    }
    resetGameToMenu(true);
  };

  const handleOnlineStrategoEnd = (result: {
    winner: "red" | "blue" | "draw";
    winnerIndex: 1 | 2;
    isMeWinner: boolean;
    reason?: string;
  }) => {
    if (!onlineMatchSession) return;
    const currentMode = "stratego";
    const currentTheme = boardTheme;
    const winPoints = getOnlineMatchWinPoints("stratego", currentTheme);
    const isWin = result.isMeWinner;

    if (isWin) {
      winEffectRef.current = Math.random() > 0.5 ? "fireworks" : "confetti";
      if (sfxVolume > 0) {
        try {
          SoundManager.stopBackgroundMusic();
          setTimeout(() => SoundManager.playVictory(), 200);
        } catch (e) {}
      }
    } else {
      if (sfxVolume > 0) {
        try {
          SoundManager.stopBackgroundMusic();
          setTimeout(() => SoundManager.playDefeat(), 200);
        } catch (e) {}
      }
    }

    setStats((prevStats) => {
      let updated = { ...prevStats };
      const key = 2;
      updated[key] = { ...(updated[key] || { wins: 0, losses: 0, ties: 0 }) };
      if (isWin) {
        updated[key].wins = (updated[key].wins || 0) + 1;
      } else {
        updated[key].losses = (updated[key].losses || 0) + 1;
      }
      updated.totalOnlineMatches = (updated.totalOnlineMatches || 0) + 1;
      const isSimulatedOpponent = !!(onlineMatchSession?.isSimulatedOpponent || (onlineMatchSession?.opponentDeviceId && String(onlineMatchSession.opponentDeviceId).startsWith("ai_simulated_")));
      if (isSimulatedOpponent) {
        updated.totalOnlineMatchesVsAi = (updated.totalOnlineMatchesVsAi || 0) + 1;
      }
      if (!updated.onlineMatchesByMode) updated.onlineMatchesByMode = {};
      updated.onlineMatchesByMode[currentMode] = (updated.onlineMatchesByMode[currentMode] || 0) + 1;
      if (isWin) {
        updated = applyModeScore(updated, currentMode, winPoints);
      }
      saveStorageItem("wallgo_stats", JSON.stringify(updated));

      if (deviceId && db) {
        const now = new Date().toISOString();
        const modeKey = getStatKeyForMode(currentMode);
        updateDoc(doc(db, "devices", deviceId), {
          lastActive: now,
          totalScore: updated.totalScore || 0,
          totalOnlineMatches: updated.totalOnlineMatches || 0,
          totalStrategoScore: updated.totalStrategoScore || 0,
          ...(isSimulatedOpponent ? { totalOnlineMatchesVsAi: increment(1) } : {}),
          [`onlineMatchesByMode.${currentMode}`]: increment(1),
          [`${modeKey}.normale.${isWin ? "wins" : "losses"}`]: increment(1),
        }).catch(() => {});
      }
      return updated;
    });

    setPostOnlineInviteSession({
      ...onlineMatchSession,
      gameMode: "stratego",
      boardTheme: boardTheme,
    });
    setShowPostOnlineInviteModal(true);
  };

  const handleStrategoGameEnd = (result: {
    winner: "red" | "blue";
    isWin: boolean;
    difficulty: StrategoDifficulty;
    pointsAwarded: number;
  }) => {
    const diffMap: Record<StrategoDifficulty, string> = {
      easy: "facile",
      medium: "normale",
      hard: "difficile",
    };
    const diffKey = diffMap[result.difficulty] || "normale";

    setStats((prevStats) => {
      let updated = { ...prevStats };
      const key = 2;
      updated[key] = { ...(updated[key] || { wins: 0, losses: 0, ties: 0 }) };
      if (result.isWin) {
        updated[key].wins = (updated[key].wins || 0) + 1;
      } else {
        updated[key].losses = (updated[key].losses || 0) + 1;
      }

      if (!updated.strategoStats) updated.strategoStats = {};
      if (!updated.strategoStats[diffKey]) updated.strategoStats[diffKey] = { wins: 0, losses: 0 };
      if (result.isWin) {
        updated.strategoStats[diffKey].wins = (updated.strategoStats[diffKey].wins || 0) + 1;
      } else {
        updated.strategoStats[diffKey].losses = (updated.strategoStats[diffKey].losses || 0) + 1;
      }

      // Check badge for hard (former master) win
      if (result.isWin && result.difficulty === "hard") {
        const hasBadge = (updated.badges || []).some((b: any) => (typeof b === "string" ? b : b.id) === "stratego_master");
        if (!hasBadge) {
          const newBadge = { id: "stratego_master", difficulty: "difficile" as const, date: new Date().toISOString() };
          updated.badges = [...(updated.badges || []), newBadge];
        }
      }

      updated = applyModeScore(updated, "stratego", result.pointsAwarded);
      saveStorageItem("wallgo_stats", JSON.stringify(updated));

      if (deviceId && db) {
        const now = new Date().toISOString();
        updateDoc(doc(db, "devices", deviceId), {
          lastActive: now,
          lastGamePlayedAt: now,
          totalScore: updated.totalScore || 0,
          totalStrategoScore: updated.totalStrategoScore || 0,
          [`strategoStats.${diffKey}.${result.isWin ? "wins" : "losses"}`]: increment(1),
          badges: updated.badges,
        }).catch(() => {});
      }
      return updated;
    });
  };

  const resetGameToMenu = (skipOnlineClear = false) => {
    if (!skipOnlineClear && onlineMatchSession && db) {
      try {
        updateDoc(doc(db, "online_rooms", onlineMatchSession.roomId), {
          status: "aborted",
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {}
      setOnlineMatchSession(null);
    }
    SoundManager.stopVictory();
    aiRunningRef.current = false;
    setIsAIThinking(false);
    setSetupView("grid");
    setIsResumedGame(false);
    setGameState({
      players: [],
      walls: [],
      currentPlayerIndex: 0,
      turnPhase: "setup",
      setupStep: 0,
      selectedPieceIndex: null,
      moveBackupPos: null,
      winner: null,
      status: "setup",
      history: [],
      territoryMap: {},
      difficulty: "normale",
      usedWallbreakerThisTurn: false,
      consecutivePasses: 0,
      lastPlacedPiece: null,
      lastMoveByPlayer: {},
      boardTheme,
      turnCount: 0,
    });
    setPenteDyingPieces([]);
    setStats((prev) => ({ ...prev }));
    SoundManager.startBackgroundMusic(musicVolume);
    SoundManager.setMusicVolume(musicVolume);
  };

  const handleProposeNewInviteFromEnd = () => {
    setShowPostOnlineInviteModal(false);
    const session = postOnlineInviteSession || onlineMatchSession;
    const prevOpponent = session?.opponentName || "";
    const prevMode = session?.gameMode || gameMode;
    const prevTheme = session?.boardTheme || boardTheme;

    setOnlineMatchSession(null);
    resetGameToMenu(true);
    setGameMode(prevMode);
    if (prevTheme) setBoardTheme(prevTheme);
    setOnlineSearchInitialQuery(prevOpponent);
    setIsOnlineSearchOpen(true);
  };

  const handleReturnToMenuFromEnd = () => {
    setShowPostOnlineInviteModal(false);
    setOnlineMatchSession(null);
    resetGameToMenu();
  };

  useEffect(() => {
    if (gameState.status === "ended" && onlineMatchSession) {
      const isInviter = onlineMatchSession.isInviter ?? (onlineMatchSession.myPlayerIndex === 1);
      if (isInviter && !hasShownPostOnlineInviteModal) {
        setPostOnlineInviteSession(onlineMatchSession);
        setHasShownPostOnlineInviteModal(true);
        const timer = setTimeout(() => {
          setShowPostOnlineInviteModal(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.status, onlineMatchSession, hasShownPostOnlineInviteModal]);

  const saveGameAndExit = async () => {
    if (gameState.status === "ended") {
      resetGameToMenu();
      return;
    }
    try {
      const stateToSave = {
        gameState,
        gameMode,
        boardTheme,
        difficulty,
        playerCount,
        startingPreference,
        isRandomAbaloneTheme,
        badukStoneColor
      };
      const jsonStr = JSON.stringify(stateToSave);
      await saveStorageItem(`wallgo_saved_game_${gameMode}`, jsonStr);
      await saveStorageItem("wallgo_last_saved_mode", gameMode);
      setSavedGamesVersion((v) => v + 1);
    } catch (e) {
      console.error("Failed to save game:", e);
    }
    resetGameToMenu();
  };

  const loadSavedGame = async (targetMode?: GameMode) => {
    const modeToLoad = targetMode || gameMode;
    try {
      const savedString = (await loadStorageItem(`wallgo_saved_game_${modeToLoad}`)) || localStorage.getItem(`wallgo_saved_game_${modeToLoad}`);
      if (savedString) {
        const saved = JSON.parse(savedString);
        if (modeToLoad === "stratego") {
          setGameMode("stratego");
          if (saved.difficulty) setStrategoDifficulty(saved.difficulty);
          if (saved.startingPlayer) setStrategoStarter(saved.startingPlayer === "red" ? "human" : "ai");
          if (saved.selectedPreset) setStrategoPreset(saved.selectedPreset);
          setStrategoSavedGame(saved);
          setGameState((prev) => ({
            ...prev,
            status: "playing",
            gameMode: "stratego",
          }));
          enterFullScreen();
          hideMobileAddressBar();
          setHumanMovesInSession(0);
          setIsResumedGame(true);
          await removeStorageItem("wallgo_saved_game_stratego");
          await removeStorageItem("wallgo_last_saved_mode");
          if (typeof window !== "undefined") {
            localStorage.removeItem("wallgo_saved_game_stratego");
            localStorage.removeItem("wallgo_last_saved_mode");
          }
          setSavedGamesVersion((v) => v + 1);
          setPendingSavedGameInfo(null);
          return;
        }
        if (saved.gameMode) setGameMode(saved.gameMode);
        if (saved.boardTheme) setBoardTheme(saved.boardTheme);
        if (saved.difficulty) setDifficulty(saved.difficulty);
        if (saved.playerCount) setPlayerCount(saved.playerCount);
        if (saved.startingPreference) setStartingPreference(saved.startingPreference);
        if (saved.isRandomAbaloneTheme !== undefined) setIsRandomAbaloneTheme(saved.isRandomAbaloneTheme);
        if (saved.badukStoneColor) setBadukStoneColor(saved.badukStoneColor);
        setGameState(saved.gameState);
        enterFullScreen();
        hideMobileAddressBar();
        setHumanMovesInSession(0);
        setIsResumedGame(true);
        // Delete save immediately upon resumption
        await removeStorageItem(`wallgo_saved_game_${modeToLoad}`);
        await removeStorageItem("wallgo_last_saved_mode");
        if (typeof window !== "undefined") {
          localStorage.removeItem(`wallgo_saved_game_${modeToLoad}`);
          localStorage.removeItem("wallgo_last_saved_mode");
        }
        setSavedGamesVersion((v) => v + 1);
        setPendingSavedGameInfo(null);
      }
    } catch (e) {
      console.error("Failed to load saved game:", e);
      await removeStorageItem(`wallgo_saved_game_${modeToLoad}`);
      await removeStorageItem("wallgo_last_saved_mode");
      setSavedGamesVersion((v) => v + 1);
    }
  };

  useEffect(() => {
    const listener = CapacitorApp.addListener('backButton', () => {
      const { status, humanMoves, isOnline } = appStateRef.current;
      const { setupView } = appStatusRef.current;
      
      if (setupView === 'details') {
        setSetupView('grid');
        return;
      }
      
      // Se si trova sulla pagina iniziale -> Chiedi Conferma (ExitApp Modal)
      if (status === 'setup' || status === 'menu' as any) {
        setIsExitAlertOpen(true);
      } else if (status === 'playing') {
        if (isOnline) {
          if (appStateRef.current.gameMode === "baduk") {
            setIsBadukOnlineExitModalOpen(true);
          } else {
            setIsOnlineExitConfirmOpen(true);
          }
        } else if (humanMoves === 0) {
          resetGameToMenu();
        } else {
          setIsSaveConfirmModalOpen(true);
        }
      } else if (status === 'ended') {
        // Chiude la finestra con esito finale
        resetGameToMenu();
      }
    });
    
    // Web version fallback handling via back functionality
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      const { status, humanMoves, isOnline } = appStateRef.current;
      const { setupView } = appStatusRef.current;
      if (setupView === 'details') {
        setSetupView('grid');
      } else if (status === 'setup' || status === 'menu' as any) {
        setIsExitAlertOpen(true);
      } else if (status === 'playing') {
        if (isOnline) {
          if (appStateRef.current.gameMode === "baduk") {
            setIsBadukOnlineExitModalOpen(true);
          } else {
            setIsOnlineExitConfirmOpen(true);
          }
        } else if (humanMoves === 0) {
          resetGameToMenu();
        } else {
          setIsSaveConfirmModalOpen(true);
        }
      } else if (status === 'ended') {
        resetGameToMenu();
      }
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      listener.then(l => l.remove());
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const advanceTurn = useCallback(
    (
      updatedWalls: Wall[],
      updatedPlayers: Player[],
      isPass: boolean = false,
      skipNextPlayer: boolean = false,
      updatedChainTriangleState?: any,
      updatedYinshState?: any,
      updatedOnitamaState?: any,
      updatedBadukKoPoint?: Point | null,
      isBadukFinalized: boolean = false,
      updatedLastPlacedPiece?: { r: number; c: number; playerId: PlayerId } | null
    ) => {
      setAdviceObj(null);
      setIsAdviceLoading(false);
      setAdvicePos({ x: 0, y: 0 });
      setIsWallBreakingMode(false); // Reset wallbreaking mode

      if (isPass && gameState.players[gameState.currentPlayerIndex]?.isAI) {
        let msg = language === "it" ? "L'AI ha passato il turno" : language === "es" ? "La IA ha pasado el turno" : language === "fr" ? "L'IA a passé son tour" : language === "de" ? "Die KI hat gepasst" : "The AI has passed the turn";
        if (gameState.gameMode === "baduk") {
          if (language === "it") msg += " • Tocca PASSA per finire!";
          else if (language === "es") msg += " • ¡Toca PASAR para terminar!";
          else if (language === "fr") msg += " • Touchez PASSER pour finir!";
          else if (language === "de") msg += " • Tippe PASSEN zum Beenden!";
          else msg += " • Tap PASS to finish!";
        }
        setAiPassToast(msg);
        if (aiPassToastTimeout.current) clearTimeout(aiPassToastTimeout.current);
        aiPassToastTimeout.current = setTimeout(() => setAiPassToast(null), 4500);
      }

      if (gameState.players[gameState.currentPlayerIndex] && !gameState.players[gameState.currentPlayerIndex].isAI) {
        setIsResumedGame(false);
        setHumanMovesInSession(prev => {
          if (prev === 0) {
            removeStorageItem(`wallgo_saved_game_${gameMode}`);
            removeStorageItem("wallgo_last_saved_mode");
            setSavedGamesVersion((v) => v + 1);
          }
          return prev + 1;
        });
      }

      // Pass entire boardTheme to logic
      const activeTheme = gameState.boardTheme;
      
      const oldTerritory = gameState.gameMode === "baduk" 
        ? calculateTerritory(gameState.walls, gameState.players, activeTheme, gameState.badukDeadStones) 
        : null;
        
      const territory = calculateTerritory(
        updatedWalls,
        updatedPlayers,
        activeTheme,
        gameState.badukDeadStones,
      );

      let territoryCreated = false;
      let badukTerritoryClosed = false;
      
      const playersWithStats = updatedPlayers.map((p) => {
        const oldPlayer = gameState.players.find((pl) => pl.id === p.id);
        const aliveStones = gameState.gameMode === "baduk" && gameState.badukDeadStones
          ? p.positions.filter(pos => !gameState.badukDeadStones!.includes(`${pos.r},${pos.c}`)).length
          : p.positions.length;
        const newScore =
          gameState.gameMode === "abalone" || gameState.gameMode === "chain_triangle" || gameState.gameMode === "shobu" || gameState.gameMode === "yinsh"
            ? p.score || 0
            : gameState.gameMode === "baduk"
              ? (territory.scores[p.id] || 0) + aliveStones + (p.id !== gameState.players[gameState.startingPlayerIndex || 0]?.id ? 7.5 : 0)
            : gameState.gameMode === "pente"
              ? p.penteCaptures || 0
              : territory.scores[p.id];
              
        if (gameState.gameMode === "baduk" && oldTerritory) {
           if ((territory.scores[p.id] || 0) > (oldTerritory.scores[p.id] || 0)) {
               badukTerritoryClosed = true;
           }
        }
        
        if (
          oldPlayer &&
          newScore > (oldPlayer.score || 0) &&
          gameState.gameMode !== "abalone" &&
          gameState.gameMode !== "baduk"
        ) {
          territoryCreated = true;
        }
        return {
          ...p,
          score: newScore,
          isEnclosed: territory.enclosed[p.id],
          isTrapped: !canPlayerMove(
            p,
            updatedWalls,
            updatedPlayers,
            activeTheme,
            gameState.gameMode,
          ),
        };
      });

      if (territoryCreated && sfxVolume > 0 && gameState.gameMode !== "pente" && gameState.gameMode !== "shobu" && gameState.gameMode !== "yinsh") {
        SoundManager.playTerritoryCreated();
      }
      
      if (badukTerritoryClosed && sfxVolume > 0 && gameState.gameMode === "baduk") {
        SoundManager.playBadukTerritory();
      }

      const nextPassCount = isPass ? gameState.consecutivePasses + 1 : 0;
      const isCorsa = gameState.gameMode === "corsa";
      const isAmazons = gameState.gameMode === "amazons";
      let corsaWinnerId: PlayerId | null = null;
      let amazonsWinnerId: PlayerId | null = null;
      let domineeringWinnerId: PlayerId | null = null;
      let abaloneWinnerId: PlayerId | null = null;
      let orbitoWinnerId: PlayerId | null = null;
      let shobuWinnerId: PlayerId | null = null;
      if (gameState.gameMode === "orbito") {
        orbitoWinnerId = checkOrbitoWinner(playersWithStats);
      } else if (gameState.gameMode === "shobu") {
        const boardRegions = [
          {rmin: 0, rmax: 3, cmin: 0, cmax: 3},
          {rmin: 0, rmax: 3, cmin: 5, cmax: 8},
          {rmin: 5, rmax: 8, cmin: 0, cmax: 3},
          {rmin: 5, rmax: 8, cmin: 5, cmax: 8}
        ];
        playersWithStats.forEach(p => {
          let hasLost = false;
          boardRegions.forEach(region => {
              const piecesInRegion = p.positions.filter(pos => pos.r >= region.rmin && pos.r <= region.rmax && pos.c >= region.cmin && pos.c <= region.cmax);
              if (piecesInRegion.length === 0) hasLost = true;
          });
          if (hasLost || p.isTrapped) {
             shobuWinnerId = playersWithStats.find(op => op.id !== p.id)?.id || null;
          }
        });
      } else if (gameState.gameMode === "abalone") {
        const winner = playersWithStats.find((p) => (p.score || 0) >= 6);
        if (winner) abaloneWinnerId = winner.id;
      } else if (isCorsa) {
        playersWithStats.forEach((p) => {
          if (p.positions.length > 0) {
            const pos = p.positions[0];
            if (p.id === 1 && pos.r === 0) corsaWinnerId = 1;
            if (p.id === 2 && pos.r === 8) corsaWinnerId = 2;
            if (p.id === 3 && pos.c === 8) corsaWinnerId = 3;
            if (p.id === 4 && pos.c === 0) corsaWinnerId = 4; // Fuga 4P uses ID 4 on the right
          }
        });
      } else if (isAmazons) {
        const activePlayers = playersWithStats.filter((p) => !p.isTrapped);
        if (activePlayers.length === 1) {
          amazonsWinnerId = activePlayers[0].id;
        } else if (activePlayers.length === 0) {
          amazonsWinnerId = "draw" as unknown as PlayerId;
        }
      } else if (gameState.gameMode === "domineering") {
        const activePlayers = playersWithStats.filter((p) =>
          canPhysicallyMove(p, updatedWalls, playersWithStats, activeTheme),
        );
        if (activePlayers.length === 1) {
          domineeringWinnerId = activePlayers[0].id;
        } else if (activePlayers.length === 0) {
          domineeringWinnerId = "draw" as unknown as PlayerId;
        }
      }

      let dominioWinnerId: PlayerId | "draw" | null = null;
      if (!isAmazons && !isCorsa && gameState.gameMode !== "domineering" && gameState.gameMode !== "abalone" && gameState.gameMode !== "hex" && gameState.gameMode !== "pente" && gameState.gameMode !== "orbito" && gameState.gameMode !== "shobu" && gameState.gameMode !== "yinsh" && gameState.gameMode !== "onitama" && gameState.gameMode !== "baduk" && gameState.gameMode !== "chain_triangle") {
        const activePlayers = playersWithStats.filter((p) => !p.isTrapped);
        if (activePlayers.length === 1 && playersWithStats.length === 2) {
          dominioWinnerId = activePlayers[0].id;
        }
      }

      let penteWinnerId: PlayerId | null = null;
      let penteWinningLine: Point[] | undefined = undefined;
      if (gameState.gameMode === "pente") {
        const penteResult = checkPenteWinner(playersWithStats);
        if (penteResult) {
          penteWinnerId = penteResult.winnerId;
          penteWinningLine = penteResult.line;
        }
      }

      const allTrappedPermanently = playersWithStats.every(
        (p) =>
          !canPhysicallyMove(p, updatedWalls, playersWithStats, activeTheme) &&
          !p.hasWallbreaker,
      );
      const allEnclosed = playersWithStats.every((p) => p.isEnclosed);
      const everyonePassed = nextPassCount >= playersWithStats.length;

      // Baduk special case: when both pass, transition to reconciliation scoring phase unless already finalized
      if (gameState.gameMode === "baduk" && everyonePassed && !isBadukFinalized) {
        let bSize = 9;
        if (activeTheme === "baduk-13") bSize = 13;
        if (activeTheme === "baduk-19") bSize = 19;

        const autoDeadStones = detectInitialBadukDeadStones(playersWithStats, bSize, activeTheme);
        const terrWithDead = calculateTerritory(updatedWalls, playersWithStats, activeTheme, autoDeadStones);

        const scoringPlayers = playersWithStats.map((p) => {
          const aliveStones = p.positions.filter(pos => !autoDeadStones.includes(`${pos.r},${pos.c}`)).length;
          const komi = (p.id !== gameState.players[gameState.startingPlayerIndex || 0]?.id ? 7.5 : 0);
          return {
            ...p,
            score: (terrWithDead.scores[p.id] || 0) + aliveStones + komi,
            isEnclosed: terrWithDead.enclosed[p.id],
          };
        });

        setGameState((prev) => ({
          ...prev,
          players: scoringPlayers,
          walls: updatedWalls,
          status: "scoring",
          consecutivePasses: nextPassCount,
          badukDeadStones: autoDeadStones,
          territoryMap: terrWithDead.territoryMap,
        }));
        setIsAIThinking(false);
        return;
      }

      // Nuova condizione: tutti i territori conquistati (nessuna cella neutrale o contesa)
      // isSettled è true se non ci sono regioni con più di un giocatore
      const isGameOver =
        gameState.gameMode === "yinsh"
          ? (updatedYinshState || gameState.yinshState)?.winner !== undefined && (updatedYinshState || gameState.yinshState)?.winner !== null
          : gameState.gameMode === "onitama"
            ? (updatedOnitamaState || gameState.onitamaState)?.winner !== undefined && (updatedOnitamaState || gameState.onitamaState)?.winner !== null
          : gameState.gameMode === "chain_triangle"
          ? (((updatedChainTriangleState || gameState.chainTriangleState)?.triangles.every((t: any) => t.ownerId !== null)) || !hasValidChainTriangleMoves(updatedChainTriangleState || gameState.chainTriangleState)) ?? false
          : gameState.gameMode === "baduk"
            ? (everyonePassed || isBadukFinalized)
          : gameState.gameMode === "pente"
          ? penteWinnerId !== null || everyonePassed
          : gameState.gameMode === "orbito"
            ? orbitoWinnerId !== null
            : gameState.gameMode === "shobu"
              ? shobuWinnerId !== null
            : gameState.gameMode === "abalone"
              ? abaloneWinnerId !== null || everyonePassed
              : gameState.gameMode === "domineering"
                ? domineeringWinnerId !== null
                : isCorsa
                  ? corsaWinnerId !== null
                  : isAmazons
                    ? amazonsWinnerId !== null
                    : dominioWinnerId !== null ||
                      (gameState.gameMode === "hex"
                        ? territory.hexWinner !== null
                        : allTrappedPermanently ||
                          allEnclosed ||
                          everyonePassed ||
                          territory.isSettled);

      if (isGameOver) {
        winEffectRef.current = Math.random() > 0.5 ? "fireworks" : "confetti";

        const maxScore = Math.max(...playersWithStats.map((p) => p.score || 0));
        const winners = playersWithStats.filter(
          (p) => (p.score || 0) === maxScore,
        );
        const isDraw = winners.length > 1;
        const winnerId: PlayerId | "draw" =
          gameState.gameMode === "yinsh"
            ? (updatedYinshState || gameState.yinshState)?.winner!
            : gameState.gameMode === "onitama"
              ? (updatedOnitamaState || gameState.onitamaState)?.winner!
            : gameState.gameMode === "pente"
            ? penteWinnerId !== null
              ? penteWinnerId!
              : isDraw
                ? "draw"
                : winners[0].id
            : gameState.gameMode === "orbito"
              ? orbitoWinnerId!
              : gameState.gameMode === "shobu"
                ? shobuWinnerId!
              : gameState.gameMode === "abalone"
                ? abaloneWinnerId !== null
                  ? abaloneWinnerId!
                  : isDraw
                    ? "draw"
                    : winners[0].id
                : gameState.gameMode === "domineering"
                  ? domineeringWinnerId!
                  : isCorsa
                    ? (corsaWinnerId as unknown as PlayerId)
                    : isAmazons
                      ? (amazonsWinnerId as unknown as PlayerId)
                      : gameState.gameMode === "hex"
                        ? territory.hexWinner!
                        : dominioWinnerId !== null
                          ? dominioWinnerId
                          : isDraw
                            ? (playersWithStats.filter(p => !p.isTrapped).length === 1 ? playersWithStats.find(p => !p.isTrapped)!.id : "draw")
                            : winners[0].id;

        const isWin = onlineMatchSession ? winnerId === onlineMatchSession.myPlayerIndex : winnerId === 1;
        const isLoss = onlineMatchSession ? (winnerId !== "draw" && winnerId !== onlineMatchSession.myPlayerIndex) : (winnerId !== "draw" && winnerId !== 1);

        if (sfxVolume > 0) {
          SoundManager.stopBackgroundMusic();
          setTimeout(() => {
            if (isWin) SoundManager.playVictory();
            else if (isLoss) SoundManager.playDefeat();
          }, 200);
        }
        const key = updatedPlayers.length as 2 | 3 | 4;
        const newStats = { ...stats };
        newStats[key] = { ...stats[key] };
        if (!newStats.badges) newStats.badges = [];
        else newStats.badges = [...(stats.badges || [])];

        if (newStats.totalScore === undefined) newStats.totalScore = 0;
        if (newStats.totalFugaScore === undefined) newStats.totalFugaScore = 0;
        if (newStats.totalAmazonsScore === undefined)
          newStats.totalAmazonsScore = 0;
        if (newStats.totalDomineeringScore === undefined)
          newStats.totalDomineeringScore = 0;
        if (newStats.totalAbaloneScore === undefined)
          newStats.totalAbaloneScore = 0;
        if (newStats.totalHexScore === undefined) newStats.totalHexScore = 0;
        if (newStats.totalChainTriangleScore === undefined) newStats.totalChainTriangleScore = 0;
        if (newStats.totalPenteScore === undefined)
          newStats.totalPenteScore = 0;
        if (newStats.totalShobuScore === undefined)
          newStats.totalShobuScore = 0;
        if (newStats.totalYinshScore === undefined)
          newStats.totalYinshScore = 0;
        if (newStats.totalOnitamaScore === undefined)
          newStats.totalOnitamaScore = 0;
        if (newStats.totalOrbitoScore === undefined)
          newStats.totalOrbitoScore = 0;
        if (newStats.totalBadukScore === undefined)
          newStats.totalBadukScore = 0;

        const oldScore =
          gameState.gameMode === "yinsh"
            ? newStats.totalYinshScore
            : gameState.gameMode === "pente"
            ? newStats.totalPenteScore
            : gameState.gameMode === "shobu"
              ? newStats.totalShobuScore
            : gameState.gameMode === "onitama"
              ? newStats.totalOnitamaScore
            : gameState.gameMode === "orbito"
              ? newStats.totalOrbitoScore
            : gameState.gameMode === "baduk"
              ? newStats.totalBadukScore
              : gameState.gameMode === "abalone"
                ? newStats.totalAbaloneScore
                : gameState.gameMode === "domineering"
                  ? newStats.totalDomineeringScore
                  : gameState.gameMode === "hex"
                    ? newStats.totalHexScore
                    : gameState.gameMode === "chain_triangle"
                      ? newStats.totalChainTriangleScore
                      : isCorsa
                        ? newStats.totalFugaScore
                        : isAmazons
                          ? newStats.totalAmazonsScore
                          : newStats.totalScore;
        const oldBadgeIds = newStats.badges.map((b) =>
          typeof b === "string"
            ? `${b}-normale`
            : `${b.id}-${b.difficulty || "normale"}`,
        );

        let scoreChange = 0;
        if (onlineMatchSession) {
          processedOnlineEndRoomsRef.current.add(onlineMatchSession.roomId);
          newStats.totalOnlineMatches = (newStats.totalOnlineMatches || 0) + 1;
          const isSimulatedOpponent = !!(onlineMatchSession.isSimulatedOpponent || (onlineMatchSession.opponentDeviceId && String(onlineMatchSession.opponentDeviceId).startsWith("ai_simulated_")));
          if (isSimulatedOpponent) {
            newStats.totalOnlineMatchesVsAi = (newStats.totalOnlineMatchesVsAi || 0) + 1;
          }
          const currentMode = gameState.gameMode || "dominio";
          if (!newStats.onlineMatchesByMode) newStats.onlineMatchesByMode = {};
          newStats.onlineMatchesByMode[currentMode] = (newStats.onlineMatchesByMode[currentMode] || 0) + 1;
          if (isWin) {
            scoreChange = getOnlineMatchWinPoints(currentMode, activeTheme);
          }
        } else if (winnerId === 1) {
          if (difficulty === "facile") {
            if (gameState.gameMode === "abalone") scoreChange = 1.5;
            else if (gameState.gameMode === "yinsh") scoreChange = 2;
            else if (gameState.gameMode === "shobu") scoreChange = 1.5;
            else if (gameState.gameMode === "chain_triangle") scoreChange = 1.5;
            else if (gameState.gameMode === "pente") scoreChange = 1.5;
            else if (gameState.gameMode === "domineering") scoreChange = 1.5;
            else if (gameState.gameMode === "hex") scoreChange = 1;
            else if (gameState.gameMode === "baduk") scoreChange = 2;
            else if (isCorsa) scoreChange = 1;
            else if (gameState.gameMode === "orbito") scoreChange = 1;
            else if (isAmazons) scoreChange = 1.5;
            else {
              scoreChange = 1.0;
            }
          } else if (difficulty === "normale") {
            if (gameState.gameMode === "abalone") scoreChange = 3;
            else if (gameState.gameMode === "yinsh") scoreChange = 3.5;
            else if (gameState.gameMode === "shobu") scoreChange = 3;
            else if (gameState.gameMode === "chain_triangle") scoreChange = 3;
            else if (gameState.gameMode === "pente") scoreChange = 2.7;
            else if (gameState.gameMode === "domineering") scoreChange = 2.5;
            else if (gameState.gameMode === "hex") scoreChange = 1.5;
            else if (gameState.gameMode === "baduk") scoreChange = 3.5;
            else if (isCorsa) scoreChange = 2;
            else if (gameState.gameMode === "orbito") scoreChange = 2;
            else if (isAmazons) scoreChange = 3;
            else {
              if (key === 2) scoreChange = 1.5;
              else if (activeTheme === "neon") scoreChange = 2;
              else if (activeTheme === "islands") scoreChange = 2.2;
              else if (activeTheme === "desert") scoreChange = 2.4;
              else if (activeTheme === "hourglass") scoreChange = 2.6;
              else if (activeTheme === "bridge") scoreChange = 2.8;
              else if (activeTheme === "hammer") scoreChange = 3.0;
              else if (activeTheme === "arena") scoreChange = 3.2;
            }
          } else if (difficulty === "difficile") {
            if (gameState.gameMode === "abalone") scoreChange = 5;
            else if (gameState.gameMode === "yinsh") scoreChange = 6.5;
            else if (gameState.gameMode === "shobu") scoreChange = 5.5;
            else if (gameState.gameMode === "chain_triangle") scoreChange = 6;
            else if (gameState.gameMode === "pente") scoreChange = 4.8;
            else if (gameState.gameMode === "domineering") scoreChange = 4.5;
            else if (gameState.gameMode === "hex") scoreChange = 2.5;
            else if (gameState.gameMode === "baduk") scoreChange = 6.0;
            else if (isCorsa) scoreChange = 4;
            else if (isAmazons) scoreChange = 5;
            else {
              if (key === 2) scoreChange = 2.5;
              else if (activeTheme === "neon") scoreChange = 3;
              else if (activeTheme === "islands") scoreChange = 3.4;
              else if (activeTheme === "desert") scoreChange = 3.8;
              else if (activeTheme === "hourglass") scoreChange = 4.2;
              else if (activeTheme === "bridge") scoreChange = 4.6;
              else if (activeTheme === "hammer") scoreChange = 5.0;
              else if (activeTheme === "arena") scoreChange = 5.4;
            }
          } else if (difficulty === "estrema") {
            if (gameState.gameMode === "abalone") scoreChange = 12;
            else if (gameState.gameMode === "yinsh") scoreChange = 14;
            else if (gameState.gameMode === "shobu") scoreChange = 13;
            else if (gameState.gameMode === "chain_triangle") scoreChange = 15;
            else if (gameState.gameMode === "pente") scoreChange = 7;
            else if (gameState.gameMode === "domineering") scoreChange = 11;
            else if (gameState.gameMode === "hex") scoreChange = 5;
            else if (gameState.gameMode === "baduk") scoreChange = 14;
            else if (isCorsa) scoreChange = 10;
            else if (isAmazons) scoreChange = 12;
            else {
              if (key === 2) scoreChange = 7;
              else if (activeTheme === "neon") scoreChange = 10;
              else if (activeTheme === "islands") scoreChange = 11;
              else if (activeTheme === "desert") scoreChange = 12;
              else if (activeTheme === "hourglass") scoreChange = 13;
              else if (activeTheme === "bridge") scoreChange = 14;
              else if (activeTheme === "hammer") scoreChange = 15;
              else if (activeTheme === "arena") scoreChange = 16;
            }
          } else if (difficulty === "maestro") {
            // Give even higher rewards for maestro
            if (gameState.gameMode === "abalone") scoreChange = 20;
            else if (gameState.gameMode === "yinsh") scoreChange = 25;
            else if (gameState.gameMode === "shobu") scoreChange = 22;
            else if (gameState.gameMode === "chain_triangle") scoreChange = 25;
            else if (gameState.gameMode === "pente") scoreChange = 12;
            else if (gameState.gameMode === "domineering") scoreChange = 18;
            else if (gameState.gameMode === "hex") scoreChange = 10;
            else if (gameState.gameMode === "baduk") scoreChange = 22;
            else if (isCorsa) scoreChange = 15;
            else if (isAmazons) scoreChange = 20;
            else {
              if (key === 2) scoreChange = 12;
              else if (activeTheme === "neon") scoreChange = 15;
              else if (activeTheme === "islands") scoreChange = 16;
              else if (activeTheme === "desert") scoreChange = 17;
              else if (activeTheme === "hourglass") scoreChange = 18;
              else if (activeTheme === "bridge") scoreChange = 19;
              else if (activeTheme === "hammer") scoreChange = 20;
              else if (activeTheme === "arena") scoreChange = 22;
            }
          }
          if (key === 3) scoreChange += 0.2;
          else if (key === 4) scoreChange += 0.4;
        } else if (!onlineMatchSession && winnerId !== "draw") {
          if (gameState.gameMode === "hex") {
            if (difficulty === "facile") scoreChange = -0.5;
            else if (difficulty === "normale") scoreChange = -1.0;
            else if (difficulty === "difficile") scoreChange = -1.5;
            else if (difficulty === "estrema" || difficulty === "maestro") scoreChange = -3.0;
          } else if (gameState.gameMode === "chain_triangle") {
            if (difficulty === "facile") scoreChange = -0.5;
            else if (difficulty === "normale") scoreChange = -1.0;
            else if (difficulty === "difficile") scoreChange = -1.5;
            else if (difficulty === "estrema" || difficulty === "maestro") scoreChange = -2.5;
          } else if (gameState.gameMode === "pente") {
            if (difficulty === "facile") scoreChange = -0.3;
            else if (difficulty === "normale") scoreChange = -0.5;
            else if (difficulty === "difficile") scoreChange = -0.7;
            else if (difficulty === "estrema" || difficulty === "maestro") scoreChange = -1.3;
          } else if (gameState.gameMode === "baduk") {
            if (difficulty === "facile") scoreChange = -0.5;
            else if (difficulty === "normale") scoreChange = -1.0;
            else if (difficulty === "difficile") scoreChange = -1.5;
            else if (difficulty === "estrema" || difficulty === "maestro") scoreChange = -2.5;
          } else {
            const currentScore = oldScore || 0;
            let penalty = Math.max(1, currentScore * 0.05);
            if (penalty > 5) penalty = 5;

            if (difficulty === "facile") penalty *= 0.5;
            else if (difficulty === "difficile") penalty *= 0.8;
            else if (difficulty === "estrema") penalty *= 0.5;
            else if (difficulty === "maestro") penalty *= 0.3;

            if (key === 3) penalty *= 0.9;
            else if (key === 4) penalty *= 0.8;

            scoreChange = -penalty;
          }
        }

        const now = new Date();
        if (newStats.lastGamePlayedAt) {
          const lastGame = new Date(newStats.lastGamePlayedAt);
          const diffHours =
            (now.getTime() - lastGame.getTime()) / (1000 * 60 * 60);
          if (diffHours >= 2) {
            scoreChange += 1;
          }
        }
        newStats.lastGamePlayedAt = now.toISOString();

        if (gameState.gameMode === "abalone") {
          if (!newStats.totalAbaloneScore) newStats.totalAbaloneScore = 0;
          newStats.totalAbaloneScore += scoreChange;
        } else if (gameState.gameMode === "chain_triangle") {
          if (!newStats.totalChainTriangleScore) newStats.totalChainTriangleScore = 0;
          newStats.totalChainTriangleScore += scoreChange;
          if (newStats.totalChainTriangleScore < 0) newStats.totalChainTriangleScore = 0;
        } else if (gameState.gameMode === "orbito") {
          if (!newStats.totalOrbitoScore) newStats.totalOrbitoScore = 0;
          newStats.totalOrbitoScore += scoreChange;
          if (newStats.totalOrbitoScore < 0) newStats.totalOrbitoScore = 0;
        } else if (gameState.gameMode === "pente") {
          if (!newStats.totalPenteScore) newStats.totalPenteScore = 0;
          newStats.totalPenteScore += scoreChange;
          if (newStats.totalPenteScore < 0) newStats.totalPenteScore = 0;
        } else if (gameState.gameMode === "shobu") {
          if (!newStats.totalShobuScore) newStats.totalShobuScore = 0;
          newStats.totalShobuScore += scoreChange;
          if (newStats.totalShobuScore < 0) newStats.totalShobuScore = 0;
        } else if (gameState.gameMode === "yinsh") {
          if (!newStats.totalYinshScore) newStats.totalYinshScore = 0;
          newStats.totalYinshScore += scoreChange;
          if (newStats.totalYinshScore < 0) newStats.totalYinshScore = 0;
        } else if (gameState.gameMode === "onitama") {
          if (!newStats.totalOnitamaScore) newStats.totalOnitamaScore = 0;
          newStats.totalOnitamaScore += scoreChange;
          if (newStats.totalOnitamaScore < 0) newStats.totalOnitamaScore = 0;
        } else if (gameState.gameMode === "baduk") {
          if (!newStats.totalBadukScore) newStats.totalBadukScore = 0;
          newStats.totalBadukScore += scoreChange;
          if (newStats.totalBadukScore < 0) newStats.totalBadukScore = 0;
        } else if (gameState.gameMode === "domineering") {
          if (!newStats.totalDomineeringScore) newStats.totalDomineeringScore = 0;
          newStats.totalDomineeringScore += scoreChange;
          if (newStats.totalDomineeringScore < 0)
            newStats.totalDomineeringScore = 0;
        } else if (gameState.gameMode === "hex") {
          if (!newStats.totalHexScore) newStats.totalHexScore = 0;
          newStats.totalHexScore += scoreChange;
          if (newStats.totalHexScore < 0) newStats.totalHexScore = 0;
        } else if (isCorsa) {
          if (!newStats.totalFugaScore) newStats.totalFugaScore = 0;
          newStats.totalFugaScore += scoreChange;
          if (newStats.totalFugaScore < 0) newStats.totalFugaScore = 0;
        } else if (isAmazons) {
          if (!newStats.totalAmazonsScore) newStats.totalAmazonsScore = 0;
          newStats.totalAmazonsScore += scoreChange;
          if (newStats.totalAmazonsScore < 0) newStats.totalAmazonsScore = 0;
        } else {
          newStats.totalScore += scoreChange;
        }

        if (isWin) {
          newStats[key].wins += 1;

          const hasBadge = (
            id: string,
            diff?: "normale" | "difficile" | "estrema",
          ) => {
            if (!diff)
              return newStats.badges!.some((b) =>
                typeof b === "string" ? b === id : b.id === id,
              );
            return newStats.badges!.some(
              (b) =>
                typeof b !== "string" && b.id === id && b.difficulty === diff,
            );
          };
          const getBadgeDifficulty = (id: string) => {
            const b = newStats.badges!.find(
              (b) => typeof b !== "string" && b.id === id,
            );
            return b && typeof b !== "string" ? b.difficulty : undefined;
          };
          const addBadge = (
            id: string,
            diff?: "normale" | "difficile" | "estrema" | "maestro",
          ) => {
            const currentDiff = getBadgeDifficulty(id);

            const getPointsForDiff = (
              d: "normale" | "difficile" | "estrema" | "maestro" | undefined,
            ) => {
              if (!d) return BADGE_POINTS[id] || 0;
              if (d === "normale") return (BADGE_POINTS[id] || 0) / 2;
              if (d === "difficile") return BADGE_POINTS[id] || 0;
              if (d === "estrema") return (BADGE_POINTS[id] || 0) * 1.5;
              if (d === "maestro") return (BADGE_POINTS[id] || 0) * 2;
              if (d === "maestro") return (BADGE_POINTS[id] || 0) * 2;
              return 0;
            };

            const diffValues = { normale: 1, difficile: 2, estrema: 3, maestro: 4 };

            if (diff) {
              const currentVal = currentDiff ? diffValues[currentDiff] : 0;
              const newVal = diffValues[diff];

              if (newVal > currentVal) {
                if (currentDiff) {
                  newStats.badges = newStats.badges!.filter((b) =>
                    typeof b === "string" ? b !== id : b.id !== id,
                  );
                }
                newStats.badges!.push({
                  id,
                  date: new Date().toISOString(),
                  difficulty: diff,
                });

                const pointsToAdd =
                  getPointsForDiff(diff) - getPointsForDiff(currentDiff);
                newStats.totalScore! += pointsToAdd;
              }
            } else {
              if (!hasBadge(id)) {
                newStats.badges!.push({ id, date: new Date().toISOString() });
                newStats.totalScore! += BADGE_POINTS[id] || 0;
              }
            }
          };

          let localBadgeSum = 0;
          newStats.badges?.forEach((b: any) => {
             const id = typeof b === "string" ? b : b.id;
             const diff = typeof b === "string" ? "normale" : (b.difficulty || "normale");
             let pts = BADGE_POINTS[id] || 0;
             if (diff === "normale") pts = pts / 2;
             else if (diff === "estrema") pts = pts * 1.5;
             else if (diff === "maestro") pts = pts * 2;
             localBadgeSum += pts;
          });
          if ((newStats.totalScore || 0) < localBadgeSum) {
             newStats.totalScore = localBadgeSum;
          }

          if (!onlineMatchSession) {
            const humanPlayer = playersWithStats.find((p) => p.id === 1);

            if (humanPlayer && humanPlayer.score > 0) {
              if (gameState.gameMode === "shobu" && (difficulty === "normale" || difficulty === "difficile" || difficulty === "estrema")) {
                addBadge("shobu_master", difficulty);
              }
              if (gameState.gameMode === "yinsh" && (difficulty === "normale" || difficulty === "difficile" || difficulty === "estrema")) {
                addBadge("yinsh_master", difficulty);
              }
            }

            if (difficulty === "normale") {
              if (!newStats.normalWinsByTheme) newStats.normalWinsByTheme = {};
              newStats.normalWinsByTheme[activeTheme] =
                (newStats.normalWinsByTheme[activeTheme] || 0) + 1;
            }

            if (difficulty === "difficile") {
              newStats[key].hardWins = (newStats[key].hardWins || 0) + 1;

              if (!newStats.hardWinsByTheme) newStats.hardWinsByTheme = {};
              newStats.hardWinsByTheme[activeTheme] =
                (newStats.hardWinsByTheme[activeTheme] || 0) + 1;

              addBadge("cervellone");

              if (isCorsa) {
                addBadge("fuga_hard");
              }
              if (isAmazons) {
                addBadge("amazons_hard");
              }
              if (gameState.gameMode === "abalone") {
                addBadge("abalone_hard");
              }
              if (gameState.gameMode === "hex") {
                addBadge("hex_hard");
              }
              if (gameState.gameMode === "orbito") {
                addBadge("orbito_hard");
              }
              if (gameState.gameMode === "onitama") {
                addBadge("onitama_hard");
              }
              if (gameState.gameMode === "chain_triangle") {
                addBadge("chain_triangle_medium");
              }

              if (
                (newStats[2].hardWins || 0) > 0 &&
                (newStats[3].hardWins || 0) > 0 &&
                (newStats[4].hardWins || 0) > 0
              ) {
                addBadge("dominatore");
              }
            }

            if (difficulty === "estrema" || difficulty === "maestro") {
              addBadge("maestro");
              if (gameState.gameMode === "chain_triangle") {
                addBadge("chain_triangle_hard");
              }
              if (gameState.gameMode === "onitama") {
                addBadge("onitama_hard");
              }
              if (gameState.gameMode === "baduk") {
                addBadge("baduk_extreme");
              }
              if (gameState.gameMode === "pente") {
                addBadge("pente_extreme");
              }
              if (gameState.gameMode === "domineering") {
                addBadge("domineering_extreme");
              }
            }
          }
        } else if (isLoss) {
          newStats[key].losses += 1;
        }

        const diffKey = difficulty || "normale";
        
        // Define helpers
        const getStatKey = (mode: string) => {
          if (mode === "onitama") return "onitamaStats";
          if (mode === "shobu") return "shobuStats";
          if (mode === "yinsh") return "yinshStats";
          if (mode === "chain_triangle") return "chainTriangleStats";
          if (mode === "pente") return "penteStats";
          if (mode === "orbito") return "orbitoStats";
          if (mode === "hex") return "hexStats";
          if (mode === "abalone") return "abaloneStats";
          if (mode === "domineering") return "domineeringStats";
          if (mode === "baduk") return "badukStats";
          if (mode === "corsa" || isCorsa) return "corsaStats";
          if (mode === "amazons" || isAmazons) return "amazonsStats";
          return "stats";
        };

        const statKey = getStatKey(gameState.gameMode || "");
        if (!newStats[statKey]) {
          newStats[statKey] = {
            facile: { wins: 0, losses: 0 },
            normale: { wins: 0, losses: 0 },
            difficile: { wins: 0, losses: 0 },
            estrema: { wins: 0, losses: 0 },
            maestro: { wins: 0, losses: 0 }
          };
        }
        if (!newStats[statKey][diffKey]) {
          newStats[statKey][diffKey] = { wins: 0, losses: 0 };
        }
        
        if (isWin) {
          newStats[statKey][diffKey].wins += 1;
        } else if (isLoss) {
          newStats[statKey][diffKey].losses += 1;
        }

        const newScore =
          gameState.gameMode === "yinsh"
            ? newStats.totalYinshScore
            : gameState.gameMode === "pente"
            ? newStats.totalPenteScore
            : gameState.gameMode === "shobu"
              ? newStats.totalShobuScore
            : gameState.gameMode === "onitama"
              ? newStats.totalOnitamaScore
            : gameState.gameMode === "orbito"
              ? newStats.totalOrbitoScore
            : gameState.gameMode === "baduk"
              ? newStats.totalBadukScore
              : gameState.gameMode === "abalone"
                ? newStats.totalAbaloneScore
                : gameState.gameMode === "domineering"
                  ? newStats.totalDomineeringScore
                  : gameState.gameMode === "hex"
                    ? newStats.totalHexScore
                    : gameState.gameMode === "chain_triangle"
                      ? newStats.totalChainTriangleScore
                      : isCorsa
                        ? newStats.totalFugaScore
                        : isAmazons
                          ? newStats.totalAmazonsScore
                          : newStats.totalScore;
        const pointsEarned = (newScore || 0) - (oldScore || 0);
        const earnedBadges = newStats.badges
          .filter((b) => {
            const idStr =
              typeof b === "string"
                ? `${b}-normale`
                : `${b.id}-${b.difficulty || "normale"}`;
            return !oldBadgeIds.includes(idStr);
          })
          .map((b) => (typeof b === "string" ? b : b.id));

        setStats(newStats);
        saveStorageItem("wallgo_stats", JSON.stringify(newStats));
        
        let finalPointsEarned = pointsEarned;
        // Check daily missions
        if (dailyMissions) {
          const today = getTodayDateString();
          if (dailyMissions.date === today) {
            let changed = false;
            let earnedMissionPoints = 0;
            const updatedMissions = dailyMissions.missions.map((m) => {
              if (m.isCompleted) return m;
              let completed = false;

              if (m.type === "play_multiplayer" && onlineMatchSession) {
                completed = true;
              }

              if (isWin) {
                if (m.type === "win_mode" && m.target === gameState.gameMode) completed = true;
                if (m.type === "win_theme" && m.target === gameState.boardTheme) completed = true;
                // Exclude win_difficulty in multiplayer matches!
                if (m.type === "win_difficulty" && !onlineMatchSession && m.target === (difficulty || "normale")) {
                  completed = true;
                }
                if (m.type === "win_multiplayer" && onlineMatchSession) {
                  completed = true;
                }
                if (m.type === "win_multiplayer_mode" && onlineMatchSession && m.target === gameState.gameMode) {
                  completed = true;
                }
              }

              if (completed) {
                changed = true;
                earnedMissionPoints += m.reward;
                return { ...m, isCompleted: true };
              }
              return m;
            });

            if (changed) {
              const newState = { date: today, missions: updatedMissions };
              setDailyMissions(newState);
              saveStorageItem("wallgo_daily_missions", JSON.stringify(newState));
              
              const completedIds = updatedMissions.filter(m => m.isCompleted).map(m => m.id);
              loadStorageItem("wallgo_mission_history").then(histStr => {
                 const hist = histStr ? JSON.parse(histStr) : {};
                 hist[today] = completedIds;
                 saveStorageItem("wallgo_mission_history", JSON.stringify(hist));
              }).catch(() => {});
              
              if (earnedMissionPoints > 0) {
                finalPointsEarned += earnedMissionPoints;
                newStats.totalScore = (newStats.totalScore || 0) + earnedMissionPoints;
                setStats({...newStats});
                saveStorageItem("wallgo_stats", JSON.stringify(newStats));
                
                // Show toast for missions completed
                const msg = language === "it" ? `🎉 Missioni Completate: +${earnedMissionPoints} PT!` : `🎉 Missions Completed: +${earnedMissionPoints} PT!`;
                if (comingSoonToastTimeout.current) clearTimeout(comingSoonToastTimeout.current);
                setComingSoonToast(msg);
                comingSoonToastTimeout.current = setTimeout(() => setComingSoonToast(null), 4000);
              }
            }
          }
        }

        setGameState((prev) => ({
          ...prev,
          players: playersWithStats,
          walls: updatedWalls,
          winner: winnerId,
          winningLine: penteWinningLine,
          status: "ended",
          turnCount: prev.turnCount + 1,
          lastMovedPlayerId: gameState.players[gameState.currentPlayerIndex]?.id,
          territoryMap: territory.territoryMap,
          consecutivePasses: nextPassCount,
          matchResult: { pointsEarned: finalPointsEarned, earnedBadges },
          ...(updatedYinshState && { yinshState: updatedYinshState }),
          ...(updatedLastPlacedPiece !== undefined
            ? {
                lastPlacedPiece: updatedLastPlacedPiece,
                lastMoveByPlayer: updatedLastPlacedPiece
                  ? {
                      ...(prev.lastMoveByPlayer || {}),
                      [updatedLastPlacedPiece.playerId]: { r: updatedLastPlacedPiece.r, c: updatedLastPlacedPiece.c },
                    }
                  : prev.lastMoveByPlayer,
              }
            : {}),
        }));
        setIsAIThinking(false);

        // Delete any saved game for this mode since the game has ended
        removeStorageItem(`wallgo_saved_game_${gameState.gameMode}`);
        removeStorageItem("wallgo_last_saved_mode");
        if (typeof window !== "undefined") {
          localStorage.removeItem(`wallgo_saved_game_${gameState.gameMode}`);
          localStorage.removeItem("wallgo_last_saved_mode");
        }
        setSavedGamesVersion((v) => v + 1);

        // Send stats to backend
        if (winnerId !== "draw") {
          const saveToFirebase = async () => {
            try {
              if (deviceId) {
                const info = { osVersion: "unknown", model: navigator.userAgent, platform: "web" };
                const now = new Date().toISOString();
                // isWin is already defined outside
                const diffKey = difficulty;

                const deviceRef = doc(db, "devices", deviceId);
                const deviceSnap = await getDoc(deviceRef);
                const deviceData = deviceSnap.exists() ? deviceSnap.data() : {};

                const lastGamePlayedAt = deviceData.lastGamePlayedAt
                  ? new Date(deviceData.lastGamePlayedAt)
                  : null;
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const isSameDay =
                  lastGamePlayedAt && lastGamePlayedAt >= todayStart;

                const updates: any = {
                  osVersion: info.osVersion || "unknown",
                  model: info.model || "unknown",
                  platform: info.platform || "web",
                  lastActive: now,
                  lastGamePlayedAt: now,
                  gamesPlayedToday: isSameDay ? increment(1) : 1,
                  [`${getStatKey(gameState.gameMode || "") || (isCorsa ? "corsaStats" : isAmazons ? "amazonsStats" : "stats")}.${diffKey}.wins`]:
                    increment(isWin ? 1 : 0),
                  [`${getStatKey(gameState.gameMode || "") || (isCorsa ? "corsaStats" : isAmazons ? "amazonsStats" : "stats")}.${diffKey}.losses`]:
                    increment(isWin ? 0 : 1),
                  totalScore: newStats.totalScore || 0,
                  totalOnlineMatches: newStats.totalOnlineMatches || 0,
                  ...(onlineMatchSession ? { [`onlineMatchesByMode.${gameState.gameMode || "dominio"}`]: increment(1) } : {}),
                  ...(onlineMatchSession?.isSimulatedOpponent || (onlineMatchSession?.opponentDeviceId && String(onlineMatchSession.opponentDeviceId).startsWith("ai_simulated_"))
                    ? { totalOnlineMatchesVsAi: increment(1) }
                    : {}),
                  totalFugaScore: newStats.totalFugaScore || 0,
                  totalAmazonsScore: newStats.totalAmazonsScore || 0,
                  totalDomineeringScore: newStats.totalDomineeringScore || 0,
                  totalAbaloneScore: newStats.totalAbaloneScore || 0,
                  totalHexScore: newStats.totalHexScore || 0,
                  totalChainTriangleScore: newStats.totalChainTriangleScore || 0,
                  totalPenteScore: newStats.totalPenteScore || 0,
                  totalShobuScore: newStats.totalShobuScore || 0,
                  totalYinshScore: newStats.totalYinshScore || 0,
                  totalOnitamaScore: newStats.totalOnitamaScore || 0,
                  totalOrbitoScore: newStats.totalOrbitoScore || 0,
                  unlockedModes: newStats.unlockedModes || [],
                  userName: userName,
                  userLocation: userLocation,
                  userComment: userComment,
                  userEmail: userEmail,
                  isTester: isTester,
                  version: APP_VERSION,
                };
                
                if (newStats.yinshStats) updates.yinshStats = newStats.yinshStats;
                if (newStats.onitamaStats) updates.onitamaStats = newStats.onitamaStats;
                if (newStats.badukStats) updates.badukStats = newStats.badukStats;
                if (newStats.totalBadukScore !== undefined) updates.totalBadukScore = newStats.totalBadukScore;

                if (!deviceData.firstGamePlayedAt) {
                  updates.firstGamePlayedAt = now;
                }

                if (newStats.badges && newStats.badges.length > 0) {
                  updates.badges = {};
                  newStats.badges.forEach((b: any) => {
                    if (typeof b === "object") {
                      updates.badges[b.id] = {
                        date: b.date,
                        difficulty: b.difficulty || "normale",
                      };
                    } else {
                      updates.badges[b] = { date: now, difficulty: "normale" };
                    }
                  });
                }

                await setDoc(deviceRef, updates, { merge: true });

                // 1. Trova tutti i dispositivi con lo stesso userName
                const devicesQuery = query(
                  collection(db, "devices"),
                  where("userName", "==", userName),
                );
                const devicesSnap = await getDocs(devicesQuery);

                const filteredDevices: any[] = [];
                const devLocationPromises: Promise<void>[] = [];
                devicesSnap.forEach((d) => {
                  const data = d.data();
                  if ((data.userLocation || "") !== (userLocation || "")) {
                    data.userLocation = userLocation;
                    devLocationPromises.push(setDoc(doc(db, "devices", d.id), { 
                        userLocation, 
                        userName,
                        osVersion: data.osVersion || "unknown",
                        model: data.model || "unknown",
                        platform: data.platform || "web",
                        lastActive: data.lastActive || new Date().toISOString()
                    }, { merge: true }));
                  }
                  // Fix pre-2.5.0 stats in memory
                    const isVersionOlder = (v1: string, v2: string) => {
                      const p1 = v1.split('.').map(Number);
                      const p2 = v2.split('.').map(Number);
                      for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
                        const n1 = p1[i] || 0;
                        const n2 = p2[i] || 0;
                        if (n1 < n2) return true;
                        if (n1 > n2) return false;
                      }
                      return false;
                    };
                    if (
                      (!data.version || isVersionOlder(data.version, "2.5.0")) &&
                      data.badges &&
                      !Array.isArray(data.badges)
                    ) {
                      let pointsToSubtract = 0;
                      Object.entries(data.badges).forEach(
                        ([id, bData]: [string, any]) => {
                          const bDiff =
                            typeof bData === "object" && bData !== null
                              ? bData.difficulty || "normale"
                              : "normale";
                          const hasDiff = [
                            "shobu_master",
                            "ponte",
                            "martello",
                            "arena",
                          ].includes(id);
                          if (hasDiff) {
                            if (bDiff === "estrema")
                              pointsToSubtract += (BADGE_POINTS[id] || 0) * 1.5;
                            else if (bDiff === "maestro")
                              pointsToSubtract += (BADGE_POINTS[id] || 0) * 2;
                            else if (bDiff === "difficile")
                              pointsToSubtract += BADGE_POINTS[id] || 0;
                            else
                              pointsToSubtract += (BADGE_POINTS[id] || 0) / 2;
                          } else {
                            pointsToSubtract += BADGE_POINTS[id] || 0;
                          }
                        },
                      );
                      data.totalScore = (data.totalScore || 0) - pointsToSubtract;
                      data.badges = {}; // Clear badges
                      data.version = "2.7.3"; // Mark as fixed
                    }
                    filteredDevices.push({ id: d.id, data });
                });
                await Promise.all(devLocationPromises);

                const nowTime = new Date(now).getTime();
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

                const docsToDelete: string[] = [];
                let mostRecentDocId = deviceId;
                let mostRecentTime = nowTime;

                const allUniqueBadges = new Map<string, any>();
                const allUniqueUnlockedModes = new Set<string>(newStats.unlockedModes || []);
                const allUniqueFreeUnlockedModes = new Set<string>(newStats.freeUnlockedModes || []);
                let aggregatedBaseScore = 0;
                let aggregatedFugaScore = 0;
                let aggregatedAmazonsScore = 0;
                let aggregatedDomineeringScore = 0;
                let aggregatedAbaloneScore = 0;
                let aggregatedHexScore = 0;
                let aggregatedChainTriangleScore = 0;
                let aggregatedPenteScore = 0;
                let aggregatedShobuScore = 0;
                let aggregatedYinshScore = 0;
                let aggregatedOnitamaScore = 0;
                let aggregatedOrbitoScore = 0;
                let aggregatedBadukScore = 0;
                let aggregatedStrategoScore = 0;
                
                let aggregatedBaseGames = 0;
                let aggregatedFugaGames = 0;
                let aggregatedAmazonsGames = 0;
                let aggregatedDomineeringGames = 0;
                let aggregatedAbaloneGames = 0;
                let aggregatedHexGames = 0;
                let aggregatedChainTriangleGames = 0;
                let aggregatedPenteGames = 0;
                let aggregatedShobuGames = 0;
                let aggregatedYinshGames = 0;
                let aggregatedOnitamaGames = 0;
                let aggregatedOrbitoGames = 0;
                let aggregatedBadukGames = 0;
                let aggregatedStrategoGames = 0;

                const getPointsForDiff = (
                  id: string,
                  d: "normale" | "difficile" | "estrema" | "maestro" | undefined,
                ) => {
                  if (!d) return BADGE_POINTS[id] || 0;
                  if (d === "normale") return (BADGE_POINTS[id] || 0) / 2;
                  if (d === "difficile") return BADGE_POINTS[id] || 0;
                  if (d === "estrema") return (BADGE_POINTS[id] || 0) * 1.5;
              if (d === "maestro") return (BADGE_POINTS[id] || 0) * 2;
                  if (d === "maestro") return (BADGE_POINTS[id] || 0) * 2.0;
                  return 0;
                };

                // Trova il dispositivo più recente e raccogli i badge unici
                filteredDevices.forEach((d) => {
                  const data = d.data;
                  const lastActiveStr =
                    data.lastActive || data.lastGamePlayedAt;
                  const lastActiveTime = lastActiveStr
                    ? new Date(lastActiveStr).getTime()
                    : 0;
                  if (lastActiveTime > mostRecentTime) {
                    mostRecentTime = lastActiveTime;
                    mostRecentDocId = d.id;
                  }

                  const deviceUnlockedModes =
                    d.id === deviceId && newStats.unlockedModes !== undefined ? newStats.unlockedModes : data.unlockedModes;
                  if (deviceUnlockedModes && Array.isArray(deviceUnlockedModes)) {
                    deviceUnlockedModes.forEach((m: string) => allUniqueUnlockedModes.add(m));
                  }
                  
                  if (data.freeUnlockedModes && Array.isArray(data.freeUnlockedModes)) {
                    data.freeUnlockedModes.forEach((m: string) => allUniqueFreeUnlockedModes.add(m));
                  }
                  if (d.id === deviceId && newStats.freeUnlockedModes && Array.isArray(newStats.freeUnlockedModes)) {
                    newStats.freeUnlockedModes.forEach((m: string) => allUniqueFreeUnlockedModes.add(m));
                  }
                  
                  const deviceBadges =
                    d.id === deviceId && newStats.badges !== undefined ? newStats.badges : data.badges;
                  if (deviceBadges) {
                    const processBadge = (badgeId: string, bData: any) => {
                        const bDiff = typeof bData === "object" && bData !== null ? bData.difficulty || "normale" : "normale";
                        const existing = allUniqueBadges.get(badgeId);
                        if (!existing) {
                          allUniqueBadges.set(badgeId, bDiff);
                        } else {
                          const diffValues = { normale: 1, difficile: 2, estrema: 3, maestro: 4 };
                          if (diffValues[bDiff as keyof typeof diffValues] > diffValues[existing as keyof typeof diffValues]) {
                            allUniqueBadges.set(badgeId, bDiff);
                          }
                        }
                    };

                    if (Array.isArray(deviceBadges)) {
                      deviceBadges.forEach((bData: any) => {
                        const badgeId = typeof bData === "string" ? bData : bData.id;
                        processBadge(badgeId, bData);
                      });
                    } else {
                      Object.entries(deviceBadges).forEach(([badgeId, bData]: [string, any]) => {
                        processBadge(badgeId, bData);
                      });
                    }
                  }
                });

                // Somma i punteggi base (senza badge) e segna i vecchi per l'eliminazione
                const deleteLeaderboardPromises: Promise<void>[] = [];
                filteredDevices.forEach((d) => {
                  const data = d.data;
                  const lastActiveStr =
                    data.lastActive || data.lastGamePlayedAt;
                  const lastActiveTime = lastActiveStr
                    ? new Date(lastActiveStr).getTime()
                    : 0;

                  // Usa il punteggio aggiornato se è il dispositivo corrente, altrimenti quello del DB
                  const docScore =
                    d.id === deviceId
                      ? newStats.totalScore || 0
                      : data.totalScore || 0;
                  const docFugaScore =
                    d.id === deviceId
                      ? newStats.totalFugaScore || 0
                      : data.totalFugaScore || 0;
                  const docAmazonsScore =
                    d.id === deviceId
                      ? newStats.totalAmazonsScore || 0
                      : data.totalAmazonsScore || 0;
                  const docDomineeringScore =
                    d.id === deviceId
                      ? newStats.totalDomineeringScore || 0
                      : data.totalDomineeringScore || 0;
                  const docAbaloneScore =
                    d.id === deviceId
                      ? newStats.totalAbaloneScore || 0
                      : data.totalAbaloneScore || 0;
                  const docHexScore =
                    d.id === deviceId
                      ? newStats.totalHexScore || 0
                      : data.totalHexScore || 0;
                  const docChainTriangleScore =
                    d.id === deviceId
                      ? newStats.totalChainTriangleScore || 0
                      : data.totalChainTriangleScore || 0;
                  const docPenteScore =
                    d.id === deviceId
                      ? newStats.totalPenteScore || 0
                      : data.totalPenteScore || 0;
                  const docShobuScore =
                    d.id === deviceId
                      ? newStats.totalShobuScore || 0
                      : data.totalShobuScore || 0;
                  const docYinshScore =
                    d.id === deviceId
                      ? newStats.totalYinshScore || 0
                      : data.totalYinshScore || 0;
                  const docOnitamaScore =
                    d.id === deviceId
                      ? newStats.totalOnitamaScore || 0
                      : data.totalOnitamaScore || 0;
                  const docOrbitoScore =
                    d.id === deviceId
                      ? newStats.totalOrbitoScore || 0
                      : data.totalOrbitoScore || 0;
                  const docBadukScore =
                    d.id === deviceId
                      ? newStats.totalBadukScore || 0
                      : data.totalBadukScore || 0;
                  const docStrategoScore =
                    d.id === deviceId
                      ? newStats.totalStrategoScore || 0
                      : data.totalStrategoScore || 0;

                  const countGames = (statsObj: any, prefix?: string, fullData?: any) => {
                    let sum = 0;
                    if (statsObj) {
                      Object.values(statsObj).forEach((val: any) => {
                        if (typeof val === 'object' && val !== null) {
                          sum += (val.wins || 0) + (val.losses || 0);
                        } else if (typeof val === 'number') {
                          sum += val;
                        }
                      });
                    }
                    if (fullData && prefix) {
                      ['normale', 'difficile', 'estrema', 'maestro'].forEach(diff => {
                        sum += (fullData[`${prefix}.${diff}.wins`] || 0);
                        sum += (fullData[`${prefix}.${diff}.losses`] || 0);
                      });
                    }
                    return sum;
                  };

                  const statsToCount = d.id === deviceId ? newStats : data;
                  const getFlatCounts = (prefix: string) => countGames(statsToCount[prefix], prefix, statsToCount);
                  
                  const baseStatsObj = statsToCount.stats || {
                    2: statsToCount[2],
                    3: statsToCount[3],
                    4: statsToCount[4]
                  };
                  aggregatedBaseGames = Math.max(aggregatedBaseGames, countGames(baseStatsObj, 'stats', statsToCount));
                  aggregatedFugaGames = Math.max(aggregatedFugaGames, getFlatCounts('corsaStats'));
                  aggregatedAmazonsGames = Math.max(aggregatedAmazonsGames, getFlatCounts('amazonsStats'));
                  aggregatedDomineeringGames = Math.max(aggregatedDomineeringGames, getFlatCounts('domineeringStats'));
                  aggregatedAbaloneGames = Math.max(aggregatedAbaloneGames, getFlatCounts('abaloneStats'));
                  aggregatedHexGames = Math.max(aggregatedHexGames, getFlatCounts('hexStats'));
                  aggregatedChainTriangleGames = Math.max(aggregatedChainTriangleGames, getFlatCounts('chainTriangleStats'));
                  aggregatedPenteGames = Math.max(aggregatedPenteGames, getFlatCounts('penteStats'));
                  aggregatedShobuGames = Math.max(aggregatedShobuGames, getFlatCounts('shobuStats'));
                  aggregatedYinshGames = Math.max(aggregatedYinshGames, getFlatCounts('yinshStats'));
                  aggregatedOnitamaGames = Math.max(aggregatedOnitamaGames, getFlatCounts('onitamaStats'));
                  aggregatedOrbitoGames = Math.max(aggregatedOrbitoGames, getFlatCounts('orbitoStats'));
                  aggregatedBadukGames = Math.max(aggregatedBadukGames, getFlatCounts('badukStats'));
                  aggregatedStrategoGames = Math.max(aggregatedStrategoGames, getFlatCounts('strategoStats'));


                  // Calcola i punti dei badge per questo dispositivo
                  let deviceBadgePoints = 0;
                  const deviceBadges =
                    d.id === deviceId ? updates.badges : data.badges;
                  if (deviceBadges) {
                    if (Array.isArray(deviceBadges)) {
                      deviceBadges.forEach((bData: any) => {
                        const badgeId = typeof bData === "string" ? bData : bData.id;
                        const bDiff = typeof bData === "object" && bData !== null ? bData.difficulty || "normale" : "normale";
                        deviceBadgePoints += getPointsForDiff(badgeId, bDiff);
                      });
                    } else {
                      Object.entries(deviceBadges).forEach(([badgeId, bData]: [string, any]) => {
                        const bDiff = typeof bData === "object" && bData !== null ? bData.difficulty || "normale" : "normale";
                        deviceBadgePoints += getPointsForDiff(badgeId, bDiff);
                      });
                    }
                  }

                  const baseScore = docScore - deviceBadgePoints;
                  aggregatedBaseScore = Math.max(aggregatedBaseScore, baseScore);
                  aggregatedFugaScore = Math.max(aggregatedFugaScore, docFugaScore);
                  aggregatedAmazonsScore = Math.max(aggregatedAmazonsScore, docAmazonsScore);
                  aggregatedDomineeringScore = Math.max(aggregatedDomineeringScore, docDomineeringScore);
                  aggregatedAbaloneScore = Math.max(aggregatedAbaloneScore, docAbaloneScore);
                  aggregatedHexScore = Math.max(aggregatedHexScore, docHexScore);
                  aggregatedChainTriangleScore = Math.max(aggregatedChainTriangleScore, docChainTriangleScore);
                  aggregatedPenteScore = Math.max(aggregatedPenteScore, docPenteScore);
                  aggregatedShobuScore = Math.max(aggregatedShobuScore, docShobuScore);
                  aggregatedYinshScore = Math.max(aggregatedYinshScore, docYinshScore);
                  aggregatedOnitamaScore = Math.max(aggregatedOnitamaScore, docOnitamaScore);
                  aggregatedOrbitoScore = Math.max(aggregatedOrbitoScore, docOrbitoScore);
                  aggregatedBadukScore = Math.max(aggregatedBadukScore, docBadukScore);
                  aggregatedStrategoScore = Math.max(aggregatedStrategoScore, docStrategoScore);

                  // Se non è il più recente e ha più di 7 giorni, eliminalo
                  if (
                    d.id !== mostRecentDocId &&
                    nowTime - lastActiveTime > sevenDaysMs
                  ) {
                    docsToDelete.push(d.id);
                  }

                  // Rimuovi le vecchie entry singole dalla leaderboard (basate sul deviceId)
                  deleteLeaderboardPromises.push(
                    deleteDoc(doc(db, "leaderboard", d.id)),
                  );
                });

                // Calcola i punti totali dei badge unici
                let totalUniqueBadgePoints = 0;
                allUniqueBadges.forEach((diff, id) => {
                  totalUniqueBadgePoints += getPointsForDiff(id, diff);
                });

                const aggregatedScore =
                  aggregatedBaseScore + totalUniqueBadgePoints;

                // Elimina i vecchi dispositivi
                for (const idToDelete of docsToDelete) {
                  await deleteDoc(doc(db, "devices", idToDelete));
                }
                await Promise.all(deleteLeaderboardPromises);
                
                // Update stats locally and in DB if we aggregated more modes or scores
                let shouldUpdateDeviceModes = false;
                const modesUpdate: any = {};
                
                if (allUniqueUnlockedModes.size > (newStats.unlockedModes?.length || 0)) {
                  const mergedModes = Array.from(allUniqueUnlockedModes) as GameMode[];
                  newStats.unlockedModes = mergedModes;
                  modesUpdate.unlockedModes = mergedModes;
                  shouldUpdateDeviceModes = true;
                }
                
                if (allUniqueFreeUnlockedModes.size > (newStats.freeUnlockedModes?.length || 0)) {
                  const mergedFreeModes = Array.from(allUniqueFreeUnlockedModes) as GameMode[];
                  newStats.freeUnlockedModes = mergedFreeModes;
                  modesUpdate.freeUnlockedModes = mergedFreeModes;
                  shouldUpdateDeviceModes = true;
                }

                if (aggregatedScore > (newStats.totalScore || 0)) {
                  newStats.totalScore = aggregatedScore;
                  modesUpdate.totalScore = aggregatedScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedFugaScore > (newStats.totalFugaScore || 0)) {
                  newStats.totalFugaScore = aggregatedFugaScore;
                  modesUpdate.totalFugaScore = aggregatedFugaScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedAmazonsScore > (newStats.totalAmazonsScore || 0)) {
                  newStats.totalAmazonsScore = aggregatedAmazonsScore;
                  modesUpdate.totalAmazonsScore = aggregatedAmazonsScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedDomineeringScore > (newStats.totalDomineeringScore || 0)) {
                  newStats.totalDomineeringScore = aggregatedDomineeringScore;
                  modesUpdate.totalDomineeringScore = aggregatedDomineeringScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedAbaloneScore > (newStats.totalAbaloneScore || 0)) {
                  newStats.totalAbaloneScore = aggregatedAbaloneScore;
                  modesUpdate.totalAbaloneScore = aggregatedAbaloneScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedHexScore > (newStats.totalHexScore || 0)) {
                  newStats.totalHexScore = aggregatedHexScore;
                  modesUpdate.totalHexScore = aggregatedHexScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedChainTriangleScore > (newStats.totalChainTriangleScore || 0)) {
                  newStats.totalChainTriangleScore = aggregatedChainTriangleScore;
                  modesUpdate.totalChainTriangleScore = aggregatedChainTriangleScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedPenteScore > (newStats.totalPenteScore || 0)) {
                  newStats.totalPenteScore = aggregatedPenteScore;
                  modesUpdate.totalPenteScore = aggregatedPenteScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedShobuScore > (newStats.totalShobuScore || 0)) {
                  newStats.totalShobuScore = aggregatedShobuScore;
                  modesUpdate.totalShobuScore = aggregatedShobuScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedYinshScore > (newStats.totalYinshScore || 0)) {
                  newStats.totalYinshScore = aggregatedYinshScore;
                  modesUpdate.totalYinshScore = aggregatedYinshScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedOnitamaScore > (newStats.totalOnitamaScore || 0)) {
                  newStats.totalOnitamaScore = aggregatedOnitamaScore;
                  modesUpdate.totalOnitamaScore = aggregatedOnitamaScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedOrbitoScore > (newStats.totalOrbitoScore || 0)) {
                  newStats.totalOrbitoScore = aggregatedOrbitoScore;
                  modesUpdate.totalOrbitoScore = aggregatedOrbitoScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedBadukScore > (newStats.totalBadukScore || 0)) {
                  newStats.totalBadukScore = aggregatedBadukScore;
                  modesUpdate.totalBadukScore = aggregatedBadukScore;
                  shouldUpdateDeviceModes = true;
                }
                if (aggregatedStrategoScore > (newStats.totalStrategoScore || 0)) {
                  newStats.totalStrategoScore = aggregatedStrategoScore;
                  modesUpdate.totalStrategoScore = aggregatedStrategoScore;
                  shouldUpdateDeviceModes = true;
                }

                if (allUniqueBadges.size > (newStats.badges?.length || 0)) {
                  const mergedBadges = Array.from(allUniqueBadges.entries()).map(([id, difficulty]) => ({ id, difficulty, date: new Date().toISOString() }));
                  newStats.badges = mergedBadges;
                  modesUpdate.badges = mergedBadges;
                  shouldUpdateDeviceModes = true;
                }
                
                if (shouldUpdateDeviceModes) {
                  setStats(prev => {
                     const upd = { ...prev, ...modesUpdate };
                     saveStorageItem("wallgo_stats", JSON.stringify(upd));
                     return upd;
                  });
                  const firestoreModesUpdate = { ...modesUpdate };
                  if (firestoreModesUpdate.badges && Array.isArray(firestoreModesUpdate.badges)) {
                    const badgesMap: Record<string, any> = {};
                    firestoreModesUpdate.badges.forEach((b: any) => {
                      if (typeof b === "object") {
                        badgesMap[b.id] = { date: b.date || new Date().toISOString(), difficulty: b.difficulty || "normale" };
                      } else {
                        badgesMap[b] = { date: new Date().toISOString(), difficulty: "normale" };
                      }
                    });
                    firestoreModesUpdate.badges = badgesMap;
                  }
                  await setDoc(deviceRef, firestoreModesUpdate, { merge: true });
                }

                // Salva un'unica entry nella leaderboard basata sul nome utente
                const displayName = userLocation
                  ? `${userName} (${userLocation})`
                  : userName;
                const leaderboardId = userLocation
                  ? `${userName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${userLocation.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
                  : userName.toLowerCase().replace(/[^a-z0-9]/g, "_") ||
                  "unknown";

                const pointsSpent = calculatePointsSpent(Array.from(allUniqueUnlockedModes), userName, userLocation, Array.from(allUniqueFreeUnlockedModes));
                const totalScoreOverall = Math.max(0,
                  aggregatedScore +
                  aggregatedFugaScore +
                  aggregatedAmazonsScore +
                  aggregatedDomineeringScore +
                  aggregatedAbaloneScore +
                  aggregatedHexScore +
                  aggregatedChainTriangleScore +
                  aggregatedPenteScore +
                  aggregatedShobuScore +
                  aggregatedYinshScore +
                  aggregatedOnitamaScore +
                  aggregatedBadukScore +
                  aggregatedStrategoScore +
                  aggregatedOrbitoScore - pointsSpent);
                  
                setCloudScore(totalScoreOverall);

                await setDoc(
                  doc(db, "leaderboard", leaderboardId),
                  {
                    userName: displayName,
                    totalScore: aggregatedScore,
                    totalFugaScore: aggregatedFugaScore,
                    totalAmazonsScore: aggregatedAmazonsScore,
                    totalDomineeringScore: aggregatedDomineeringScore,
                    totalAbaloneScore: aggregatedAbaloneScore,
                    totalHexScore: aggregatedHexScore,
                    totalChainTriangleScore: aggregatedChainTriangleScore,
                    totalPenteScore: aggregatedPenteScore,
                    totalShobuScore: aggregatedShobuScore,
                    totalYinshScore: aggregatedYinshScore,
                    totalOnitamaScore: aggregatedOnitamaScore,
                    totalBadukScore: aggregatedBadukScore,
                    totalStrategoScore: aggregatedStrategoScore,
                    totalOrbitoScore: aggregatedOrbitoScore,
                    totalScoreOverall: totalScoreOverall,
                    totalGamesOverall: aggregatedBaseGames + aggregatedFugaGames + aggregatedAmazonsGames + aggregatedDomineeringGames + aggregatedAbaloneGames + aggregatedHexGames + aggregatedChainTriangleGames + aggregatedPenteGames + aggregatedShobuGames + aggregatedYinshGames + aggregatedOnitamaGames + aggregatedOrbitoGames + aggregatedBadukGames + aggregatedStrategoGames,
                    totalGamesTarget: {
                       generale: aggregatedBaseGames,
                       corsa: aggregatedFugaGames,
                       amazons: aggregatedAmazonsGames,
                       domineering: aggregatedDomineeringGames,
                       abalone: aggregatedAbaloneGames,
                       hex: aggregatedHexGames,
                       chain_triangle: aggregatedChainTriangleGames,
                       pente: aggregatedPenteGames,
                       shobu: aggregatedShobuGames,
                       yinsh: aggregatedYinshGames,
                       onitama: aggregatedOnitamaGames,
                       orbito: aggregatedOrbitoGames,
                       baduk: aggregatedBadukGames,
                       stratego: aggregatedStrategoGames,
                    },
                    lastActive: now,
                  },
                  { merge: true },
                );

                // Pulizia vecchie o duplicate entry nella leaderboard per questo utente
                try {
                  const baseSlug = userName.toLowerCase().replace(/[^a-z0-9]/g, "_");
                  const lbCleanupSnap = await getDocs(collection(db, "leaderboard"));
                  const deletePromises: Promise<void>[] = [];
                  lbCleanupSnap.forEach((d) => {
                    const id = d.id;
                    const dName = d.data().userName || "";
                    if (id !== leaderboardId) {
                      if (
                        id.startsWith(baseSlug + "_") ||
                        id === baseSlug ||
                        dName.startsWith(userName + " (") ||
                        dName === userName
                      ) {
                        deletePromises.push(deleteDoc(doc(db, "leaderboard", id)));
                      }
                    }
                  });
                  await Promise.all(deletePromises);
                } catch (e) {
                  console.error("Error cleaning up old leaderboard docs:", e);
                }

                // Aggiorna statistiche giornaliere globali
                const todayDateString = now.split("T")[0];
                const dailyStatsRef = doc(db, "daily_stats", todayDateString);
                await setDoc(
                  dailyStatsRef,
                  {
                    gamesPlayed: increment(1),
                    totalWins: increment(isWin ? 1 : 0),
                    totalLosses: increment(isWin ? 0 : 1),
                    activePlayers: arrayUnion(deviceId),
                    date: todayDateString,
                  },
                  { merge: true },
                );

                Logger.info("Statistica salvata su Firebase (Device & Daily)!");
              }
            } catch (e) {
              Logger.error(`Errore salvataggio Firebase: ${e}`);
            }
          };
          saveToFirebase();
        }

        return;
      }

      let nextIdx = skipNextPlayer ? gameState.currentPlayerIndex : (gameState.currentPlayerIndex + 1) % updatedPlayers.length;
      let fallbackCount = 0;
      while (
        playersWithStats[nextIdx].isTrapped &&
        fallbackCount < updatedPlayers.length
      ) {
        nextIdx = (nextIdx + 1) % updatedPlayers.length;
        fallbackCount++;
      }

      setIsAIThinking(updatedPlayers[nextIdx].isAI);
      setGameState((prev) => {
        let nextOrbitoPhase: "shift" | "place" | undefined = undefined;
        if (prev.gameMode === "orbito") {
          const otherPlayersHavePieces = playersWithStats.some(
            (p) =>
              p.id !== updatedPlayers[nextIdx].id && p.positions.length > 0,
          );
          nextOrbitoPhase = otherPlayersHavePieces ? "shift" : "place";
        }

        const newPastStates = prev.gameMode === "baduk" 
          ? [...(prev.pastStates || []), {
              players: prev.players,
              currentPlayerIndex: prev.currentPlayerIndex,
              turnPhase: prev.turnPhase,
              badukKoPoint: prev.badukKoPoint,
            }]
          : prev.pastStates;

        return {
          ...prev,
          pastStates: newPastStates,
          futureStates: prev.gameMode === "baduk" ? [] : prev.futureStates,
          walls: updatedWalls,
          players: playersWithStats,
          currentPlayerIndex: nextIdx,
          turnPhase:
            prev.gameMode === "domineering" ||
            prev.gameMode === "hex" ||
            prev.gameMode === "pente" ||
            prev.gameMode === "baduk"
              ? "setup"
              : "moving",
          selectedPieceIndex: null,
          territoryMap: territory.territoryMap,
          usedWallbreakerThisTurn: false,
          consecutivePasses: nextPassCount,
          moveBackupPos: null,
          turnCount: prev.turnCount + 1,
          lastMovedPlayerId: gameState.players[gameState.currentPlayerIndex]?.id,
          orbitoPhase: nextOrbitoPhase,
          orbitoActionState: undefined,
          ...(updatedYinshState && { yinshState: updatedYinshState }),
          ...(updatedOnitamaState && { onitamaState: updatedOnitamaState }),
          ...(updatedBadukKoPoint !== undefined 
            ? { badukKoPoint: updatedBadukKoPoint } 
            : (isPass && prev.gameMode === "baduk" ? { badukKoPoint: null } : {})),
          ...(updatedLastPlacedPiece !== undefined
            ? {
                lastPlacedPiece: updatedLastPlacedPiece,
                lastMoveByPlayer: updatedLastPlacedPiece
                  ? {
                      ...(prev.lastMoveByPlayer || {}),
                      [updatedLastPlacedPiece.playerId]: { r: updatedLastPlacedPiece.r, c: updatedLastPlacedPiece.c },
                    }
                  : prev.lastMoveByPlayer,
              }
            : {}),
        };
      });
    },
    [
      musicVolume,
      sfxVolume,
      stats,
      gameState.consecutivePasses,
      gameState.currentPlayerIndex,
      gameState.boardTheme,
      gameState.gameMode,
      gameState.players,
      boardTheme,
      onlineMatchSession,
      language,
      db,
      difficulty,
      userName,
      deviceId,
      userLocation,
      userEmail,
      isTester,
      dailyMissions,
    ],
  );

  const handleHistoryBack = useCallback(() => {
    if (gameState.gameMode !== "baduk") return;
    setGameState((prev) => {
      if (!prev.pastStates || prev.pastStates.length === 0) return prev;
      const lastState = prev.pastStates[prev.pastStates.length - 1];
      const newPastStates = prev.pastStates.slice(0, -1);
      const newFutureStates = [
        {
          players: prev.players,
          currentPlayerIndex: prev.currentPlayerIndex,
          turnPhase: prev.turnPhase,
          badukKoPoint: prev.badukKoPoint,
        },
        ...(prev.futureStates || []),
      ];

      return {
        ...prev,
        ...lastState,
        pastStates: newPastStates,
        futureStates: newFutureStates,
      };
    });
  }, [gameState.gameMode]);

  const handleHistoryForward = useCallback(() => {
    if (gameState.gameMode !== "baduk") return;
    setGameState((prev) => {
      if (!prev.futureStates || prev.futureStates.length === 0) return prev;
      const nextState = prev.futureStates[0];
      const newFutureStates = prev.futureStates.slice(1);
      const newPastStates = [
        ...(prev.pastStates || []),
        {
          players: prev.players,
          currentPlayerIndex: prev.currentPlayerIndex,
          turnPhase: prev.turnPhase,
          badukKoPoint: prev.badukKoPoint,
        },
      ];

      return {
        ...prev,
        ...nextState,
        pastStates: newPastStates,
        futureStates: newFutureStates,
      };
    });
  }, [gameState.gameMode]);

  const handleHistoryToPresent = useCallback(() => {
    if (gameState.gameMode !== "baduk") return;
    setGameState((prev) => {
      if (!prev.futureStates || prev.futureStates.length === 0) return prev;
      const presentState = prev.futureStates[prev.futureStates.length - 1];
      const newPastStates = [
        ...(prev.pastStates || []),
        {
          players: prev.players,
          currentPlayerIndex: prev.currentPlayerIndex,
          turnPhase: prev.turnPhase,
          badukKoPoint: prev.badukKoPoint,
        },
        ...prev.futureStates.slice(0, -1),
      ];

      return {
        ...prev,
        ...presentState,
        pastStates: newPastStates,
        futureStates: [],
      };
    });
  }, [gameState.gameMode]);

  const handlePieRuleSwap = () => {
    setGameState((prev) => {
      const p1 = prev.players[0];
      const p2 = prev.players[1];

      const newWalls = prev.walls.map((w) => ({
        ...w,
        ownerId:
          w.ownerId === 1 ? 2 : ((w.ownerId === 2 ? 1 : w.ownerId) as PlayerId),
      }));
      const nPlayers: Player[] = [
        { ...p1, positions: [...p2.positions] },
        { ...p2, positions: [...p1.positions] },
      ];

      return {
        ...prev,
        players: nPlayers,
        walls: newWalls,
        currentPlayerIndex: 1,
        turnCount: prev.turnCount + 1,
        turnPhase:
          prev.gameMode === "hex" || prev.gameMode === "pente"
            ? "setup"
            : "moving",
        selectedPieceIndex: null,
      };
    });
  };

  const handleToggleBadukDeadStone = (r: number, c: number) => {
    if (gameState.gameMode !== "baduk" || gameState.status !== "scoring") return;
    let bSize = 9;
    if (gameState.boardTheme === "baduk-13") bSize = 13;
    if (gameState.boardTheme === "baduk-19") bSize = 19;

    const currentDead = gameState.badukDeadStones || [];
    const nextDead = toggleBadukDeadGroup(gameState.players, r, c, currentDead, bSize);
    const terrWithDead = calculateTerritory(gameState.walls, gameState.players, gameState.boardTheme, nextDead);

    setGameState((prev) => {
      const scoringPlayers = prev.players.map((p) => {
        const aliveStones = p.positions.filter(
          (pos) => !nextDead.includes(`${pos.r},${pos.c}`)
        ).length;
        const komi =
          p.id !== prev.players[prev.startingPlayerIndex || 0]?.id ? 7.5 : 0;
        return {
          ...p,
          score: (terrWithDead.scores[p.id] || 0) + aliveStones + komi,
          isEnclosed: terrWithDead.enclosed[p.id],
        };
      });

      return {
        ...prev,
        players: scoringPlayers,
        badukDeadStones: nextDead,
        territoryMap: terrWithDead.territoryMap,
      };
    });
  };

  const handleResumeBadukGame = () => {
    setGameState((prev) => ({
      ...prev,
      status: "playing",
      consecutivePasses: 0,
      badukDeadStones: [],
    }));
  };

  const handleConfirmBadukScoring = () => {
    advanceTurn(
      gameState.walls,
      gameState.players,
      false,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
  };

  const handleMove = (
    p: Point & {
      isAbaloneMove?: boolean;
      isPush?: boolean;
      du?: number;
      dv?: number;
      abaloneIndices?: number[];
      onitamaMove?: { from: Point; to: Point; card: import('./types').OnitamaCardName };
      isAIMove?: boolean;
    },
  ) => {
    const isAbalone = gameState.gameMode === "abalone";
    const isCorsa = gameState.gameMode === "corsa";
    const pieceIdx = isCorsa ? 0 : gameState.selectedPieceIndex;

    if (gameState.status !== "playing" || gameState.winner) return;

    const isSimulatedAI = !!(
      onlineMatchSession?.isSimulatedOpponent ||
      (onlineMatchSession?.opponentDeviceId && String(onlineMatchSession.opponentDeviceId).startsWith("ai_simulated_"))
    );
    const isCurrentPlayerAI = !!gameState.players[gameState.currentPlayerIndex]?.isAI;
    const isAllowedAIMove = isSimulatedAI && (isCurrentPlayerAI || p.isAIMove);

    if (
      onlineMatchSession &&
      !isAllowedAIMove &&
      gameState.currentPlayerIndex !== onlineMatchSession.myPlayerIndex - 1
    ) {
      return;
    }

    const player = gameState.players[gameState.currentPlayerIndex];

    if (gameState.gameMode === "onitama" && p.onitamaMove) {
      setGameState(prev => {
        const next = { ...prev };
        next.players = JSON.parse(JSON.stringify(prev.players || []));
        const currentPlayer = next.players[next.currentPlayerIndex];
        const nextPlayer = next.players[(next.currentPlayerIndex + 1) % next.players.length];
        const { from, to, card } = p.onitamaMove!;
        
        // Move our piece
        const pieceIdx = currentPlayer.positions.findIndex(pos => pos.r === from.r && pos.c === from.c);
        if (pieceIdx === -1) return prev;
        
        const isMaster = pieceIdx === 0;
        currentPlayer.positions[pieceIdx].r = to.r;
        currentPlayer.positions[pieceIdx].c = to.c;

        // Capture logic
        let win = false;
        const oppPieceIdx = nextPlayer.positions.findIndex(pos => pos.r === to.r && pos.c === to.c);
        if (oppPieceIdx !== -1) {
          if (oppPieceIdx === 0) win = true; // Way of the Stone (Captured Master)
          nextPlayer.positions.splice(oppPieceIdx, 1);
        }

        // Temple logic (Way of the Stream)
        const enemyTempleR = currentPlayer.id === 1 ? 0 : 4;
        const enemyTempleC = 2;
        if (isMaster && to.r === enemyTempleR && to.c === enemyTempleC) {
          win = true; // Way of the Stream (Reached Temple)
        }

        // Card exchange
        const onitamaState = { ...prev.onitamaState! };
        const myCards = currentPlayer.id === 1 ? [...onitamaState.player1Cards] : [...onitamaState.player2Cards];
        const cardIndex = myCards.indexOf(card);
        const oldNeutral = onitamaState.neutralCard;
        myCards[cardIndex] = oldNeutral;
        onitamaState.neutralCard = card;
        if (currentPlayer.id === 1) onitamaState.player1Cards = myCards;
        else onitamaState.player2Cards = myCards;
        
        if (win) {
           onitamaState.winner = currentPlayer.id;
           if (sfxVolume > 0) SoundManager.playVictory();
        } else {
           if (sfxVolume > 0) SoundManager.playMovePiece();
        }

        setTimeout(() => advanceTurn(prev.walls, next.players, false, false, undefined, undefined, onitamaState), 10);
        return { ...next, currentPlayerIndex: prev.currentPlayerIndex, onitamaState, turnCount: prev.turnCount };
      });
      return;
    }

    if (isAbalone) {
      let moveObj = p;
      if (!moveObj.isAbaloneMove) {
        const selIndices = gameState.abaloneSelectedIndices;
        if (selIndices && selIndices.length > 0) {
          const availMoves = getAbalonePossibleMoves(
            player,
            selIndices,
            gameState.players,
            gameState.boardTheme,
          );
          const matched = availMoves.find((m) => m.r === p.r && m.c === p.c);
          if (matched) {
            moveObj = { ...p, ...matched };
          }
        }
      }

      if (!moveObj.isAbaloneMove) return;

      const selIndices = moveObj.abaloneIndices || gameState.abaloneSelectedIndices;
      if (!selIndices || selIndices.length === 0) return;

      const { du, dv } = moveObj;
      if (du === undefined || dv === undefined) return;

      const prev = gameState;
      const nPlayers = JSON.parse(JSON.stringify(prev.players || [])) as Player[];
      const currP = nPlayers[prev.currentPlayerIndex];
      const oldOpponentPositions = new Map<
        string,
        { pIdx: number; posIdx: number }
      >();

      nPlayers.forEach((pl, pIdx) => {
        if (pl.id !== currP.id) {
          pl.positions.forEach((pos, posIdx) =>
            oldOpponentPositions.set(`${pos.r},${pos.c}`, { pIdx, posIdx }),
          );
        }
      });

      const movedPositions = new Set<string>();

      // Move our pieces
      selIndices.forEach((idx) => {
        const uv = getAbaloneUV(currP.positions[idx]);
        const nextUv = { u: uv.u + du, v: uv.v + dv };
        const nextPt = getAbalonePointFromUV(nextUv.u, nextUv.v);
        movedPositions.add(`${nextPt.r},${nextPt.c}`);
        currP.positions[idx].r = nextPt.r;
        currP.positions[idx].c = nextPt.c;
      });

      let pushScoreCount = 0;
      const fallenMarbles: {
        id: string;
        color: string;
        r: number;
        c: number;
        t: number;
      }[] = [];

      // Check pushes
      if (p.isPush) {
        const shiftOpponent = (nr: number, nc: number) => {
          const match = oldOpponentPositions.get(`${nr},${nc}`);
          if (match) {
            const opp = nPlayers[match.pIdx];
            const oppUv = getAbaloneUV(opp.positions[match.posIdx]);
            const oppNextPt = getAbalonePointFromUV(oppUv.u + du, oppUv.v + dv);
            shiftOpponent(oppNextPt.r, oppNextPt.c);
            opp.positions[match.posIdx].r = oppNextPt.r;
            opp.positions[match.posIdx].c = oppNextPt.c;
          }
        };

        movedPositions.forEach((posKey) => {
          const [nr, nc] = posKey.split(",").map(Number);
          shiftOpponent(nr, nc);
        });
      }

      // Remove opponents that fell off and increment score
      nPlayers.forEach((pl) => {
        if (pl.id !== currP.id) {
          const startCount = pl.positions.length;
          pl.positions = pl.positions.filter((pos) => {
            if (isValidCell(pos.r, pos.c, prev.boardTheme)) return true;
            fallenMarbles.push({
              id: Math.random().toString(36).substr(2, 9),
              color: PLAYER_COLORS[pl.id],
              r: pos.r,
              c: pos.c,
              t: Date.now(),
            });
            return false;
          });
          const endCount = pl.positions.length;
          if (endCount < startCount) {
            pushScoreCount += startCount - endCount;
          }
        }
      });

      const nextScore = (currP.score || 0) + pushScoreCount;
      currP.score = nextScore;

      if (fallenMarbles.length > 0) {
        setPushedMarbles((pm) => [...pm, ...fallenMarbles]);
        setTimeout(() => {
          setPushedMarbles((pm) =>
            pm.filter((m) => !fallenMarbles.find((fm) => fm.id === m.id)),
          );
        }, 3000);
      }

      if (pushScoreCount > 0) {
        if (sfxVolume > 0) SoundManager.playScream();
      } else {
        if (sfxVolume > 0) SoundManager.playMovePiece();
      }

      setTimeout(() => advanceTurn(prev.walls, nPlayers, false), 10);

      setGameState((g) => ({
        ...g,
        abalonePreviousState: {
          players: JSON.parse(JSON.stringify(g.players || [])),
          currentPlayerIndex: g.currentPlayerIndex,
          turnCount: g.turnCount,
        },
        players: nPlayers,
        turnPhase: "moving",
        selectedPieceIndex: null,
        abaloneSelectedIndices: [],
        consecutivePasses: 0,
        moveBackupPos: null,
      }));

      if (!currP.isAI) {
        setUndoWindowActive(true);
        setTimeout(() => setUndoWindowActive(false), 2000);
      }

      return;
    }

    if (pieceIdx === null) return;
    const oldPos = player.positions[pieceIdx];

    const path = findPath(
      oldPos,
      p,
      gameState.walls,
      gameState.players,
      2,
      gameState.boardTheme,
    );

    if (path && path.length > 2 && gameState.gameMode !== "shobu") {
      // Move to intermediate first
      setGameState((prev) => {
        const nPlayers = prev.players.map((pl) => {
          if (pl.id === player.id) {
            const nPos = [...pl.positions];
            nPos[pieceIdx] = path[1];
            return { ...pl, positions: nPos };
          }
          return pl;
        });
        return { ...prev, players: nPlayers };
      });

      setTimeout(() => {
        const nPlayers = gameState.players.map((pl) => {
          if (pl.id === player.id) {
            const nPos = [...pl.positions];
            nPos[pieceIdx] = p;
            return { ...pl, positions: nPos };
          }
          return pl;
        });
        if (sfxVolume > 0) SoundManager.playMovePiece();
        if (
          gameState.usedWallbreakerThisTurn ||
          (!gameState.gameMode?.startsWith("amazons") &&
            gameState.turnCount === 0) ||
          isCorsa ||
          gameState.gameMode === "shobu"
        )
          advanceTurn(gameState.walls, nPlayers, false);
        else
          setGameState((prev) => ({
            ...prev,
            players: nPlayers,
            turnPhase: "walling",
            moveBackupPos: oldPos,
          }));
      }, 300);
      return;
    }

    const nPlayers = gameState.players.map((pl) => {
      if (pl.id === player.id) {
        const nPos = [...pl.positions];
        nPos[pieceIdx] = p;
        return { ...pl, positions: nPos };
      }
      return pl;
    });
    if (sfxVolume > 0) SoundManager.playMovePiece();

    if (isCorsa) {
      advanceTurn(gameState.walls, nPlayers, false);
    } else if (gameState.gameMode === "shobu") {
      if (!gameState.shobuState?.passiveMove) {
        setGameState(prev => ({
          ...prev,
          players: nPlayers,
          shobuState: {
            passiveMove: {
              r: oldPos.r, c: oldPos.c,
              dr: p.r - oldPos.r, dc: p.c - oldPos.c,
              steps: Math.max(Math.abs(p.r - oldPos.r), Math.abs(p.c - oldPos.c)),
              boardColor: oldPos.c < 4 ? 'dark' : 'light'
            }
          },
          selectedPieceIndex: null
        }));
      } else {
        const pm = gameState.shobuState.passiveMove!;
        const dr_step = Math.sign(pm.dr);
        const dc_step = Math.sign(pm.dc);
        const pushR = p.r + dr_step;
        const pushC = p.c + dc_step;

        let captured = false;
        let opponentColor = "";

        let updatedPlayers = nPlayers.map(pl => {
            if (pl.id !== player.id) {
               const idx = pl.positions.findIndex(pos => pos.r === p.r && pos.c === p.c);
               if (idx !== -1) {
                   const nPos = [...pl.positions];
                   if (isValidCell(pushR, pushC, gameState.boardTheme)) {
                       nPos[idx] = { ...nPos[idx], r: pushR, c: pushC };
                   } else {
                       nPos.splice(idx, 1); // Pushed off the board!
                       captured = true;
                       opponentColor = pl.color;
                   }
                   return { ...pl, positions: nPos };
               }
            }
            return pl;
        });

        if (captured) {
            if (sfxVolume > 0) SoundManager.playScream();
            setPenteDyingPieces(prev => [...prev, { id: `shobu-falling-${Date.now()}`, color: opponentColor, r: pushR, c: pushC, t: Date.now() }]);
            updatedPlayers = updatedPlayers.map(pl => pl.id === player.id ? { ...pl, score: (pl.score || 0) + 1 } : pl);
        }

        setGameState(prev => ({ ...prev, shobuState: undefined }));
        advanceTurn(gameState.walls, updatedPlayers, false);
      }
    } else {
      if (
        gameState.gameMode === "dominio" ||
        gameState.gameMode?.startsWith("amazons")
      ) {
        if (
          gameState.usedWallbreakerThisTurn ||
          (!gameState.gameMode?.startsWith("amazons") &&
            gameState.turnCount === 0)
        )
          advanceTurn(gameState.walls, nPlayers, false);
        else
          setGameState((prev) => ({
            ...prev,
            players: nPlayers,
            turnPhase: "walling",
            moveBackupPos: oldPos,
          }));
      } else {
        advanceTurn(gameState.walls, nPlayers, false);
      }
    }
  };

  const handleYinshPointClick = useCallback(
    (point: import("./types").YinshPoint) => {
      if (gameState.status !== "playing") return;
      if (isAIThinking) return;
      if (onlineMatchSession && gameState.currentPlayerIndex !== onlineMatchSession.myPlayerIndex - 1) return;
      if (!gameState.yinshState) return;

      const player = gameState.players[gameState.currentPlayerIndex];
      if (player.isAI) return;
      const ys = { 
        ...gameState.yinshState,
        rings: [...gameState.yinshState.rings],
        ringsWon: { ...gameState.yinshState.ringsWon },
        markers: { ...gameState.yinshState.markers },
        activeRows: [...gameState.yinshState.activeRows]
      };
      
      const ptKey = `${point.q},${point.r}`;
      
      if (ys.phase === 'place_ring') {
        // Must be empty
        if (ys.rings.some(r => r.q === point.q && r.r === point.r)) return;
        if (ys.markers[ptKey]) return; // Shouldn't have markers yet anyway
        
        safePlaySound(() => SoundManager.playPlaceWall());
        
        ys.rings = [...ys.rings, { id: `ring-${Math.random().toString(36).substr(2, 9)}`, playerId: player.id, q: point.q, r: point.r }];
        
        let nextPlayerIdx = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        if (ys.rings.length === 10) {
          ys.phase = 'place_marker';
          nextPlayerIdx = gameState.startingPlayerIndex || 0; // The player who started placing rings plays first? No, the second player to place a ring is player 2. Let's just use startingPlayerIndex? 
          // Standard rules: P1 places 1, P2 places 1... finally P2 places the 10th. P1 starts `place_marker`.
          // So if length is 10, it's P1's turn naturally because (1+1)%2 = 0 which is P1.
        }
        
        setGameState(prev => ({ 
          ...prev, 
          yinshState: ys, 
          currentPlayerIndex: nextPlayerIdx,
          turnCount: prev.turnCount + 1,
          lastMovedPlayerId: player.id
        }));
      }
      else if (ys.phase === 'place_marker') {
        const ring = ys.rings.find(r => r.q === point.q && r.r === point.r && r.playerId === player.id);
        if (!ring) return;
        
        ys.selectedRing = { ...point };
        ys.phase = 'move_ring';
        setGameState(prev => ({ ...prev, yinshState: ys }));
      }
      else if (ys.phase === 'move_ring') {
        // If clicked on own ring again, can select a different one
        if (ys.rings.some(r => r.q === point.q && r.r === point.r && r.playerId === player.id)) {
           ys.selectedRing = { ...point };
           setGameState(prev => ({ ...prev, yinshState: ys }));
           return;
        }
        
        if (!ys.selectedRing) return;
        
        const validMoves = getValidYinshMoves(ys, ys.selectedRing);
        if (!validMoves.some(m => m.q === point.q && m.r === point.r)) return; // Invalid move
        
        safePlaySound(() => SoundManager.playMovePiece());
        
        // Perform move
        const newState = performYinshMove(ys, ys.selectedRing, point, player.id);
        newState.selectedRing = null;
        
        // Check for 5-in-a-row
        const lines = checkYinshLines(newState);
        if (lines.length > 0) {
          const myRows = lines.filter(r => r.playerId === player.id);
          if (myRows.length > 0) {
            newState.activeRows = lines;
            newState.phase = 'remove_markers';
            setGameState(prev => ({ 
              ...prev, 
              yinshState: newState,
              turnCount: prev.turnCount + 1,
              lastMovedPlayerId: player.id
            }));
          } else {
            // Switch to opponent immediately to remove their rows
            const oppIdx = gameState.players.findIndex(p => p.id === lines[0].playerId);
            newState.activeRows = lines;
            newState.phase = 'remove_markers';
            setGameState(prev => ({ 
              ...prev, 
              yinshState: newState, 
              currentPlayerIndex: oppIdx,
              turnCount: prev.turnCount + 1,
              lastMovedPlayerId: player.id
            }));
          }
        } else {
          // Next player's turn
          newState.phase = 'place_marker';
          const nextPlayerIdx = (gameState.currentPlayerIndex + 1) % gameState.players.length;
          setGameState(prev => ({ 
            ...prev, 
            yinshState: newState, 
            currentPlayerIndex: nextPlayerIdx,
            turnCount: prev.turnCount + 1,
            lastMovedPlayerId: player.id
          }));
        }
      }
      else if (ys.phase === 'remove_markers') {
        // Player clicks on a marker to remove that row (if multiple).
        // Since `checkYinshLines` returns rows, let's just find a row that contains this point in `activeRows` for the CURRENT player.
        // Wait, what if the opponent formed a line of 5 on your turn? The rules say: 
        // "If a player forms a row of 5 markers of their own color, they remove..."
        // If a move creates lines for both players, the active player removes theirs first.
        // If multiple, they choose.
        
        const myRows = ys.activeRows.filter(r => r.playerId === player.id);
        if (myRows.length === 0) {
          // Check opponent rows?
          const oppRows = ys.activeRows; // they must belong to the other player
          if (oppRows.length > 0) {
            // Need to let the other player remove them! But wait, it's currently player's turn phase.
            // A simpler way: automatically switch currentPlayerIndex to the person who has rows to remove, OR
            // just remove them automatically if there's only 1 option.
          }
        }
        
        const clickedRowCand = ys.activeRows.filter(row => row.playerId === player.id && row.points.some(p => p.q === point.q && p.r === point.r));
        let clickedRow = clickedRowCand[0];
        if (clickedRowCand.length > 1) {
          // Identify if the clicked point is at the end of one of the sequences
          const endpointMatchedRow = clickedRowCand.find(row => 
            (row.points[0].q === point.q && row.points[0].r === point.r) || 
            (row.points[row.points.length - 1].q === point.q && row.points[row.points.length - 1].r === point.r)
          );
          if (endpointMatchedRow) {
            clickedRow = endpointMatchedRow;
          }
        }
        
        if (clickedRow) {
          safePlaySound(() => SoundManager.playMovePiece());
          
          // Remove the markers
          clickedRow.points.forEach(p => {
             delete ys.markers[`${p.q},${p.r}`];
          });
          // Remove this row and any overlapping rows from activeRows
          ys.activeRows = ys.activeRows.filter(r => !r.points.some(rp => clickedRow.points.some(cp => cp.q === rp.q && cp.r === rp.r)));
          
          if (ys.ringsWon[player.id] === 2) {
             ys.ringsWon[player.id]++;
             const ringIdx = ys.rings.findIndex(r => r.playerId === player.id);
             if (ringIdx !== -1) ys.rings.splice(ringIdx, 1);
             ys.winner = player.id;
             setGameState(prev => {
                const nextPlayers = prev.players.map(pl => pl.id === player.id ? { ...pl, score: (pl.score || 0) + 5 } : pl);
                setTimeout(() => advanceTurn(prev.walls, nextPlayers, false, false, undefined, ys), 0);
                return { ...prev, players: nextPlayers, yinshState: ys, turnCount: prev.turnCount + 1, lastMovedPlayerId: player.id };
             });
             return;
          }
          
          ys.phase = 'remove_ring';
          setGameState(prev => {
             const nextPlayers = prev.players.map(pl => pl.id === player.id ? { ...pl, score: (pl.score || 0) + 5 } : pl);
             return { ...prev, players: nextPlayers, yinshState: ys, turnCount: prev.turnCount + 1, lastMovedPlayerId: player.id };
          });
        }
      }
      else if (ys.phase === 'remove_ring') {
        const ringIdx = ys.rings.findIndex(r => r.q === point.q && r.r === point.r && r.playerId === player.id);
        if (ringIdx === -1) return;
        
        safePlaySound(() => SoundManager.playMovePiece());
        
        ys.rings.splice(ringIdx, 1);
        ys.ringsWon[player.id]++;
        
        if (ys.ringsWon[player.id] >= 3) {
           ys.winner = player.id;
           setGameState(prev => {
              setTimeout(() => advanceTurn(prev.walls, prev.players, false, false, undefined, ys), 0);
              return { ...prev, yinshState: ys, turnCount: prev.turnCount + 1, lastMovedPlayerId: player.id };
           });
           return;
        }
        
        // Are there more rows to remove?
        // Wait, maybe we need to re-check lines because some might have been destroyed.
        // But activeRows already has overlapping ones removed.
        const myRows = ys.activeRows.filter(r => r.playerId === player.id);
        if (myRows.length > 0) {
           ys.phase = 'remove_markers';
           setGameState(prev => ({ 
             ...prev, 
             yinshState: ys, 
             turnCount: prev.turnCount + 1, 
             lastMovedPlayerId: player.id 
           }));
        } else {
           // Any opponent rows?
           const oppRows = ys.activeRows; // all remaining
           if (oppRows.length > 0) {
              // Wait, shift control to opponent to remove their rows?
              // For simplicity, let's just make the other player ACTIVE.
              const oppIdx = gameState.players.findIndex(p => p.id === oppRows[0].playerId);
              ys.phase = 'remove_markers';
              setGameState(prev => ({ 
                ...prev, 
                yinshState: ys, 
                currentPlayerIndex: oppIdx, 
                turnCount: prev.turnCount + 1, 
                lastMovedPlayerId: player.id 
              }));
           } else {
              ys.phase = 'place_marker';
              const nextPlayerIdx = (gameState.currentPlayerIndex + 1) % gameState.players.length;
              setGameState(prev => ({ 
                ...prev, 
                yinshState: ys, 
                currentPlayerIndex: nextPlayerIdx, 
                turnCount: prev.turnCount + 1, 
                lastMovedPlayerId: player.id 
              }));
           }
        }
      }
    },
    [gameState, isAIThinking, onlineMatchSession, advanceTurn]
  );


  const handleChainTrianglePegClick = useCallback(
    (peg: Peg) => {
      if (gameState.status !== "playing") return;
      if (isAIThinking) return;
      if (onlineMatchSession && gameState.currentPlayerIndex !== onlineMatchSession.myPlayerIndex - 1) return;

      const player = gameState.players[gameState.currentPlayerIndex];
      if (player.isAI) return;
      
      const chainState = gameState.chainTriangleState;
      if (!chainState) return;

      if (!chainState.selectedPeg) {
        setGameState((prev) => ({
          ...prev,
          chainTriangleState: { ...prev.chainTriangleState!, selectedPeg: peg }
        }));
        return;
      }

      const line = getLineOfPegs(chainState.selectedPeg, peg);
      if (!line) {
        setGameState((prev) => ({
          ...prev,
          chainTriangleState: { ...prev.chainTriangleState!, selectedPeg: null }
        }));
        return;
      }

      const rubberBandId = getEdgeId(line[0], line[3]);
      const exists = chainState.rubberBands.find(rb => rb.id === rubberBandId);
      if (exists) {
        setGameState((prev) => ({
          ...prev,
          chainTriangleState: { ...prev.chainTriangleState!, selectedPeg: null }
        }));
        return;
      }

      const newEdges = getEdgesFromPegs(line);
      const coveredEdges = new Set<string>();
      chainState.rubberBands.forEach(rb => {
        rb.edges.forEach(e => coveredEdges.add(e));
      });
      newEdges.forEach(e => coveredEdges.add(e));

      const updatedTriangles = [...chainState.triangles];
      let trianglesClaimedThisTurn = 0;

      for (let i = 0; i < updatedTriangles.length; i++) {
        const tri = updatedTriangles[i];
        if (tri.ownerId === null) {
          const allEdgesCovered = tri.edges.every(e => coveredEdges.has(e));
          if (allEdgesCovered) {
            updatedTriangles[i] = { ...tri, ownerId: player.id };
            trianglesClaimedThisTurn++;
          }
        }
      }

      let nextPlayers = gameState.players;
      if (trianglesClaimedThisTurn > 0) {
        nextPlayers = nextPlayers.map(p => 
          p.id === player.id ? { ...p, score: (p.score || 0) + trianglesClaimedThisTurn } : p
        );
        if (sfxVolume > 0) SoundManager.playTerritoryCreated();
      } else {
        if (sfxVolume > 0) SoundManager.playPlaceWall(); // Normal move sound
      }

      const newRubberBands = [
        ...chainState.rubberBands, 
        { id: rubberBandId, pegs: line, edges: newEdges, ownerId: player.id }
      ];

      const newState = { 
        ...chainState, 
        selectedPeg: null, 
        rubberBands: newRubberBands, 
        triangles: updatedTriangles 
      };

      setGameState((prev) => ({ ...prev, chainTriangleState: newState, players: nextPlayers }));

      setTimeout(() => {
        advanceTurn(gameState.walls, nextPlayers, false, false, newState);
      }, 0);
    },
    [gameState, isAIThinking, sfxVolume, advanceTurn]
  );

  const handlePlaceWall = (nr: number, nc: number) => {
    if (
      gameState.status !== "playing" ||
      gameState.winner ||
      gameState.gameMode === "corsa" ||
      (onlineMatchSession && gameState.currentPlayerIndex !== onlineMatchSession.myPlayerIndex - 1)
    )
      return;

    if (gameState.selectedPieceIndex === null) return;

    const player = gameState.players[gameState.currentPlayerIndex];
    const pos = player.positions[gameState.selectedPieceIndex!];

    const wallId =
      gameState.gameMode === "amazons"
        ? `${nr},${nc}`
        : serializeWall(pos.r, pos.c, nr, nc);
    if (sfxVolume > 0) SoundManager.playPlaceWall();
    const newWalls = [...gameState.walls, { id: wallId, ownerId: player.id }];

    advanceTurn(newWalls, gameState.players, false);
  };

  const handleBreakWall = (r: number, c: number, side: any) => {
    if (
      gameState.status !== "playing" ||
      gameState.winner ||
      (onlineMatchSession && gameState.currentPlayerIndex !== onlineMatchSession.myPlayerIndex - 1)
    )
      return;

    // Side is now used to pass the target coordinates directly for hex compatibility
    // side object: {nr, nc}
    let r2, c2;
    if (typeof side === "object" && side.nr !== undefined) {
      r2 = side.nr;
      c2 = side.nc;
    } else {
      // Fallback for square mode generic calls if any
      r2 = r;
      c2 = c;
      if (side === "top") r2--;
      else if (side === "bottom") r2++;
      else if (side === "left") c2--;
      else if (side === "right") c2++;
    }

    const newWalls = removeWall(gameState.walls, r, c, r2, c2);
    const territory = calculateTerritory(
      newWalls,
      gameState.players,
      gameState.boardTheme,
    );
    const nPlayers = gameState.players.map((p) => {
      const isCurrent =
        p.id === gameState.players[gameState.currentPlayerIndex].id;
      return {
        ...p,
        hasWallbreaker: isCurrent ? false : p.hasWallbreaker,
        score:
          gameState.gameMode === "abalone" || gameState.gameMode === "chain_triangle" || gameState.gameMode === "shobu" || gameState.gameMode === "yinsh"
            ? p.score || 0
            : gameState.gameMode === "baduk"
              ? (territory.scores[p.id] || 0) + p.positions.length + (p.id !== gameState.players[gameState.startingPlayerIndex || 0]?.id ? 7.5 : 0)
            : gameState.gameMode === "pente"
              ? p.penteCaptures || 0
              : territory.scores[p.id],
        isEnclosed: territory.enclosed[p.id],
        isTrapped: !canPlayerMove(
          p,
          newWalls,
          gameState.players,
          gameState.boardTheme,
        ),
      };
    });
    setGameState((prev) => ({
      ...prev,
      walls: newWalls,
      players: nPlayers,
      usedWallbreakerThisTurn: true,
      turnPhase: "moving",
      territoryMap: territory.territoryMap,
    }));
    setIsWallBreakingMode(false);
  };

  // Auto-pass per i giocatori umani se sono completamente bloccati e non hanno il wallbreaker
  useEffect(() => {
    if (isPlayerSuspended && !isStrategyOpen) {
      Logger.info(
        `Player ${currentPlayer.id} is suspended (trapped). Auto-passing.`,
      );
      const timeout = setTimeout(() => {
        advanceTurn(gameState.walls, gameState.players, true);
      }, 1500); // Ridotto a 1.5s per maggiore reattività
      return () => clearTimeout(timeout);
    }
  }, [isPlayerSuspended, isStrategyOpen, advanceTurn, currentPlayer?.id]);

  useEffect(() => {
    const p = gameState.players[gameState.currentPlayerIndex];
    const isSimulatedOnlineMatch = !!(
      onlineMatchSession?.isSimulatedOpponent ||
      (onlineMatchSession?.opponentDeviceId && String(onlineMatchSession.opponentDeviceId).startsWith("ai_simulated_"))
    );
    if (
      (onlineMatchSession && !isSimulatedOnlineMatch) ||
      gameState.status !== "playing" ||
      !p ||
      !p.isAI ||
      gameState.winner ||
      aiRunningRef.current ||
      isStrategyOpen ||
      (gameState.gameMode === "baduk" && gameState.futureStates && gameState.futureStates.length > 0)
    )
      return;

    // We only set this to true if we are definitely scheduling a new move
    aiRunningRef.current = true;
    setIsAIThinking(true);
    let timeoutFired = false;

    const aiTimeout = setTimeout(
      () => {
        timeoutFired = true;
        try {
          if (
            gameState.gameMode === "domineering" ||
            gameState.gameMode === "hex" ||
            gameState.gameMode === "pente" ||
            gameState.gameMode === "yinsh"
          ) {
            if (gameState.gameMode === "domineering") {
              const bestMove = getBestDomineeringMoveForAI(
                gameState,
                p.id,
                gameState.difficulty,
              );
              if (bestMove) {
                const nPlayers = gameState.players.map((pl, idx) =>
                  idx === gameState.currentPlayerIndex
                    ? {
                        ...pl,
                        positions: [
                          ...pl.positions,
                          {
                            r: bestMove.r,
                            c: bestMove.c,
                            id: `piece-ai-${Math.random().toString(36).substr(2, 9)}`,
                          },
                          {
                            r: bestMove.r2,
                            c: bestMove.c2,
                            id: `piece-ai-${Math.random().toString(36).substr(2, 9)}`,
                          },
                        ],
                      }
                    : pl,
                );
                advanceTurn(gameState.walls, nPlayers, false);
              }
            } else if (gameState.gameMode === "hex") {
              const pos = getBestSetupForAI(gameState);
              if (pos) {
                let nPlayers = gameState.players.map((pl, idx) =>
                  idx === gameState.currentPlayerIndex
                    ? {
                        ...pl,
                        positions: [
                          ...pl.positions,
                          {
                            ...pos,
                            id: `piece-ai-${Math.random().toString(36).substr(2, 9)}`,
                          },
                        ],
                      }
                    : pl,
                );
                advanceTurn(gameState.walls, nPlayers, false);
              }
            } else if (gameState.gameMode === "yinsh") {
              if (gameState.yinshState) {
                const aiMove = getBestYinshMoveForAI(gameState.yinshState!, p.id, difficulty);
                if (!aiMove) {
                  aiRunningRef.current = false;
                  setIsAIThinking(false);
                  return;
                }
                  
                  if (aiMove.action === 'place_ring') {
                     safePlaySound(() => SoundManager.playPlaceWall());
                  } else if (aiMove.action === 'place_marker' || aiMove.action === 'remove_markers' || aiMove.action === 'remove_ring') {
                     safePlaySound(() => SoundManager.playMovePiece());
                  }
                  
                  // Wait we need to update state
                  setGameState(prev => {
                    if (prev.status !== 'playing') return prev;
                    const ys = { 
                      ...prev.yinshState!,
                      rings: [...prev.yinshState!.rings],
                      ringsWon: { ...prev.yinshState!.ringsWon },
                      markers: { ...prev.yinshState!.markers },
                      activeRows: [...prev.yinshState!.activeRows]
                    };
                    if (aiMove.action === 'place_ring' && aiMove.pt) {
                       ys.rings = [...ys.rings, { id: `ring-${Math.random().toString(36).substr(2, 9)}`, playerId: p.id, q: aiMove.pt.q, r: aiMove.pt.r }];
                       const isNextPhase = ys.rings.length === 10;
                       if (isNextPhase) {
                          ys.phase = 'place_marker';
                       }
                       const nextPlayerIdx = isNextPhase ? (prev.startingPlayerIndex || 0) : ((prev.currentPlayerIndex + 1) % prev.players.length);
                       return { ...prev, yinshState: ys, currentPlayerIndex: nextPlayerIdx };
                    } else if (aiMove.action === 'place_marker' && aiMove.from && aiMove.to) {
                       const newState = performYinshMove(ys, aiMove.from, aiMove.to, p.id);
                       const lines = checkYinshLines(newState);
                       if (lines.length > 0) {
                         const myRows = lines.filter(r => r.playerId === p.id);
                         if (myRows.length > 0) {
                           newState.activeRows = lines;
                           newState.phase = 'remove_markers';
                           return { ...prev, yinshState: newState };
                         } else {
                           const oppIdx = prev.players.findIndex(pl => pl.id === lines[0].playerId);
                           newState.activeRows = lines;
                           newState.phase = 'remove_markers';
                           return { ...prev, yinshState: newState, currentPlayerIndex: oppIdx };
                         }
                       } else {
                         newState.phase = 'place_marker';
                         return { ...prev, yinshState: newState, currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length };
                       }
                    } else if (aiMove.action === 'remove_markers' && aiMove.row) {
                       aiMove.row.forEach(pt => {
                          delete ys.markers[`${pt.q},${pt.r}`];
                       });
                       ys.activeRows = ys.activeRows.filter(r => !r.points.some(rp => aiMove.row!.some(cp => cp.q === rp.q && cp.r === rp.r)));
                       
                       const nextPlayers = prev.players.map(pl => pl.id === p.id ? { ...pl, score: (pl.score || 0) + 5 } : pl);
                       if (ys.ringsWon[p.id] === 2) {
                          ys.ringsWon[p.id]++;
                          const ringIdx = ys.rings.findIndex(r => r.playerId === p.id);
                          if (ringIdx !== -1) ys.rings.splice(ringIdx, 1);
                          ys.winner = p.id;
                          setTimeout(() => advanceTurn(prev.walls, nextPlayers, false, false, undefined, ys), 0);
                          return { ...prev, players: nextPlayers, yinshState: ys };
                       }
                       
                       ys.phase = 'remove_ring';
                       return { ...prev, players: nextPlayers, yinshState: ys };
                    } else if (aiMove.action === 'remove_ring' && aiMove.pt) {
                       const ringIdx = ys.rings.findIndex(r => r.q === aiMove.pt!.q && r.r === aiMove.pt!.r && r.playerId === p.id);
                       if (ringIdx !== -1) {
                         ys.rings.splice(ringIdx, 1);
                         ys.ringsWon[p.id]++;
                         if (ys.ringsWon[p.id] >= 3) {
                            ys.winner = p.id;
                            setTimeout(() => advanceTurn(prev.walls, prev.players, false, false, undefined, ys), 0);
                            return { ...prev, yinshState: ys };
                         }
                       }
                       
                       const myRows = ys.activeRows.filter(r => r.playerId === p.id);
                       if (myRows.length > 0) {
                          ys.phase = 'remove_markers';
                          return { ...prev, yinshState: ys };
                       } else {
                          const oppRows = ys.activeRows;
                          if (oppRows.length > 0) {
                             const oppIdx = prev.players.findIndex(pl => pl.id === oppRows[0].playerId);
                             ys.phase = 'remove_markers';
                             return { ...prev, yinshState: ys, currentPlayerIndex: oppIdx };
                          } else {
                             ys.phase = 'place_marker';
                             return { ...prev, yinshState: ys, currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length };
                          }
                       }
                    }
                    return prev;
                  });
                  aiRunningRef.current = false;
                  setIsAIThinking(false);
              }
            } else if (gameState.gameMode === "pente") {
              // Use the new getBestPenteMoveForAI
              const pos = getBestPenteMoveForAI(
                gameState,
                p.id,
                gameState.difficulty,
              );
              if (pos) {
                let capturedPiecesList: any[] = [];
                let nPlayers = gameState.players.map((pl, idx) =>
                  idx === gameState.currentPlayerIndex
                    ? {
                        ...pl,
                        positions: [
                          ...pl.positions,
                          {
                            ...pos,
                            id: `piece-ai-${Math.random().toString(36).substr(2, 9)}`,
                            isNewAi: pl.positions.length >= 2,
                          },
                        ],
                      }
                    : pl,
                );

                // Very simple capture check around the new piece for AI
                const directions = [
                  [-1, 0],
                  [1, 0],
                  [0, -1],
                  [0, 1], // Cardinal
                  [-1, -1],
                  [-1, 1],
                  [1, -1],
                  [1, 1], // Diagonal
                ];
                const opponentIndex =
                  gameState.currentPlayerIndex === 0 ? 1 : 0;

                let newOpponentPositions = [
                  ...nPlayers[opponentIndex].positions,
                ];
                let capturedCount = 0;
                const r = pos.r;
                const c = pos.c;

                for (const [dr, dc] of directions) {
                  const r1 = r + dr,
                    c1 = c + dc;
                  const r2 = r + 2 * dr,
                    c2 = c + 2 * dc;
                  const r3 = r + 3 * dr,
                    c3 = c + 3 * dc;

                  const hasOpp1 = newOpponentPositions.find(
                    (pt) => pt.r === r1 && pt.c === c1,
                  );
                  const hasOpp2 = newOpponentPositions.find(
                    (pt) => pt.r === r2 && pt.c === c2,
                  );
                  const hasPl3 = nPlayers[
                    gameState.currentPlayerIndex
                  ].positions.some((pt) => pt.r === r3 && pt.c === c3);

                  if (hasOpp1 && hasOpp2 && hasPl3) {
                    capturedPiecesList.push({ ...hasOpp1, color: nPlayers[opponentIndex].color, t: Date.now() });
                    capturedPiecesList.push({ ...hasOpp2, color: nPlayers[opponentIndex].color, t: Date.now() });
                    newOpponentPositions = newOpponentPositions.filter(
                      (pt) =>
                        !(
                          (pt.r === r1 && pt.c === c1) ||
                          (pt.r === r2 && pt.c === c2)
                        ),
                    );
                    capturedCount += 2;
                  }
                }

                if (capturedPiecesList.length > 0) {
                  setPenteDyingPieces((prev) => [...prev, ...capturedPiecesList]);
                }

                nPlayers = nPlayers.map((pl, idx) => {
                  if (idx === opponentIndex)
                    return { ...pl, positions: newOpponentPositions };
                  if (idx === gameState.currentPlayerIndex)
                    return {
                      ...pl,
                      penteCaptures: (pl.penteCaptures || 0) + capturedCount,
                    };
                  return pl;
                });

                advanceTurn(
                  gameState.walls,
                  nPlayers,
                  false,
                  false,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  false,
                  { r: pos.r, c: pos.c, playerId: p.id }
                );
              }
            }
            aiRunningRef.current = false;
            setIsAIThinking(false);
            return;
          } else if (gameState.gameMode === "baduk") {
            const size = gameState.boardTheme === 'baduk-13' ? 13 : (gameState.boardTheme === 'baduk-19' ? 19 : 9);
            const isEasyOrNormal = gameState.difficulty === "facile" || gameState.difficulty === "normale";
            const totalStones = gameState.players.reduce((acc, pl) => acc + pl.positions.length, 0);
            const isOpening = totalStones <= (size === 19 ? 6 : (size === 13 ? 4 : 2));

            // For facile/normale or during opening moves, execute immediately with fast heuristic / opening book
            if (isEasyOrNormal || isOpening || !badukWorkerRef.current) {
              const pos = getBestBadukMoveForAI(
                gameState,
                p.id,
                gameState.difficulty,
              );
              if (pos) {
                const res = performBadukMove(gameState.players, pos.r, pos.c, gameState.currentPlayerIndex, size, gameState.badukKoPoint);
                if (res.valid && res.newPlayers) {
                    safePlaySound(() => SoundManager.playBadukStone());
                    if (res.captured && res.captured.length > 0) {
                        safePlaySound(() => SoundManager.playBadukCapture());
                        setPenteDyingPieces((prev) => [...prev, ...res.captured!]);
                        res.newPlayers[gameState.currentPlayerIndex].penteCaptures = (res.newPlayers[gameState.currentPlayerIndex].penteCaptures || 0) + res.captured.length;
                    }
                    advanceTurn(gameState.walls, res.newPlayers, false, false, undefined, undefined, undefined, res.newKoPoint);
                } else {
                    advanceTurn(gameState.walls, gameState.players, true); // AI has to pass if valid move is somehow wrong
                }
              } else {
                 advanceTurn(gameState.walls, gameState.players, true); // AI pass
              }
              aiRunningRef.current = false;
              setIsAIThinking(false);
              return;
            }

            if (badukWorkerRef.current) {
                const starterIdx = gameState.startingPlayerIndex || 0;
                const boardData = new Int8Array(size * size);
                gameState.players.forEach((player, i) => {
                    const pColor = i === starterIdx ? 1 : 2;
                    player.positions.forEach(pos => { boardData[pos.r * size + pos.c] = pColor; });
                });
                const myColor = gameState.players.findIndex(pl => pl.id === p.id) === starterIdx ? 1 : 2;
                let timeBudget = 0.5;
                if (gameState.difficulty === "maestro") timeBudget = size === 19 ? 1.0 : 2.5;
                else if (gameState.difficulty === "estrema") timeBudget = size === 19 ? 0.8 : 1.5;
                else if (gameState.difficulty === "difficile") timeBudget = size === 19 ? 0.4 : 0.6;

                badukWorkerRef.current.onmessage = (e) => {
                    if (e.data.type === 'MOVE_RESULT') {
                        badukWorkerRef.current!.onmessage = null;
                        const move = e.data.move;
                        const pos = move !== null ? { r: Math.floor(move / size), c: move % size } : null;
                        if (pos) {
                          const res = performBadukMove(gameState.players, pos.r, pos.c, gameState.currentPlayerIndex, size, gameState.badukKoPoint);
                          if (res.valid && res.newPlayers) {
                              safePlaySound(() => SoundManager.playBadukStone());
                              if (res.captured && res.captured.length > 0) {
                                  safePlaySound(() => SoundManager.playBadukCapture());
                                  setPenteDyingPieces((prev) => [...prev, ...res.captured!]);
                                  res.newPlayers[gameState.currentPlayerIndex].penteCaptures = (res.newPlayers[gameState.currentPlayerIndex].penteCaptures || 0) + res.captured.length;
                              }
                              advanceTurn(gameState.walls, res.newPlayers, false, false, undefined, undefined, undefined, res.newKoPoint);
                          } else {
                              advanceTurn(gameState.walls, gameState.players, true); 
                          }
                        } else {
                           advanceTurn(gameState.walls, gameState.players, true); 
                        }
                        aiRunningRef.current = false;
                        setIsAIThinking(false);
                    }
                };
                
                // Initialize state safely without destroying the tree if it matches
                badukWorkerRef.current.postMessage({
                    type: 'INIT',
                    size,
                    boardData: Array.from(boardData),
                    koPoint: gameState.badukKoPoint,
                    color: myColor,
                    consecutivePasses: gameState.consecutivePasses
                });

                badukWorkerRef.current.postMessage({
                    type: 'GET_MOVE',
                    timeBudget
                });
                return; // Wait for worker to call advanceTurn
            }
          } else if (gameState.turnPhase === "setup") {
            const pos = getBestSetupForAI(gameState);
            setGameState((prev) => {
              const nPlayers = prev.players.map((p, idx) =>
                idx === prev.currentPlayerIndex
                  ? {
                      ...p,
                      positions: [
                        ...p.positions,
                        {
                          ...pos,
                          id: `piece-ai-${Math.random().toString(36).substr(2, 9)}`,
                        },
                      ],
                    }
                  : p,
              );
              const done = nPlayers.every(
                (x) => x.positions.length === (nPlayers.length === 2 ? 4 : 2),
              );
              if (done)
                return {
                  ...prev,
                  players: nPlayers,
                  status: "playing",
                  turnPhase: "moving",
                  currentPlayerIndex: prev.startingPlayerIndex ?? 0,
                  consecutivePasses: 0,
                };
              return {
                ...prev,
                players: nPlayers,
                turnPhase: "setup",
                currentPlayerIndex:
                  (prev.currentPlayerIndex + 1) % nPlayers.length,
              };
            });
          } else if (gameState.turnPhase === "moving") {
            if (
              p.hasWallbreaker &&
              !gameState.usedWallbreakerThisTurn &&
              (!canPhysicallyMove(
                p,
                gameState.walls,
                gameState.players,
                gameState.boardTheme,
              ) ||
                p.isEnclosed)
            ) {
              const brk = getBestBreakForAI(gameState, p.id);
              if (brk) {
                handleBreakWall(brk.r, brk.c, brk.side);
                aiRunningRef.current = false;
                return;
              }
            }
            if (gameState.gameMode === "chain_triangle") {
              const move = getBestChainTriangleMoveForAI(gameState, p.id, difficulty);
              if (move) {
                const chainState = gameState.chainTriangleState;
                if (!chainState) return;

                const newEdges = getEdgesFromPegs(move.line);
                const rubberBandId = getEdgeId(move.line[0], move.line[3]);
                
                const coveredEdges = new Set<string>();
                chainState.rubberBands.forEach(rb => {
                  rb.edges.forEach(e => coveredEdges.add(e));
                });
                newEdges.forEach(e => coveredEdges.add(e));
                
                const updatedTriangles = [...chainState.triangles];
                let trianglesClaimedThisTurn = 0;
                
                for (let i = 0; i < updatedTriangles.length; i++) {
                  const tri = updatedTriangles[i];
                  if (tri.ownerId === null) {
                    const allEdgesCovered = tri.edges.every(e => coveredEdges.has(e));
                    if (allEdgesCovered) {
                      updatedTriangles[i] = { ...tri, ownerId: p.id };
                      trianglesClaimedThisTurn++;
                    }
                  }
                }
                
                let nextPlayers = gameState.players;
                if (trianglesClaimedThisTurn > 0) {
                  nextPlayers = nextPlayers.map(player => 
                    player.id === p.id ? { ...player, score: (player.score || 0) + trianglesClaimedThisTurn } : player
                  );
                  if (sfxVolume > 0) SoundManager.playTerritoryCreated();
                } else {
                  if (sfxVolume > 0) SoundManager.playPlaceWall();
                }

                const newRubberBands = [
                  ...chainState.rubberBands, 
                  { id: rubberBandId, pegs: move.line, edges: newEdges, ownerId: p.id }
                ];
                
                const newState = { 
                  ...chainState, 
                  rubberBands: newRubberBands, 
                  triangles: updatedTriangles 
                };
                
                setGameState((prev) => ({ ...prev, chainTriangleState: newState, players: nextPlayers }));
                
                setTimeout(() => {
                  advanceTurn(gameState.walls, nextPlayers, false, false, newState);
                }, 0);
                
                aiRunningRef.current = false;
                setIsAIThinking(false);
              } else {
                advanceTurn(gameState.walls, gameState.players, true);
                aiRunningRef.current = false;
                setIsAIThinking(false);
              }
              return;
            }

            if (gameState.gameMode === "onitama") {
              const best = getBestOnitamaMoveForAI(gameState);

              if (best) {
                setTimeout(() => {
                  handleMove({
                     r: best.to.r, c: best.to.c,
                     onitamaMove: {
                       from: best.from,
                       to: best.to,
                       card: best.card
                     },
                     isAIMove: true,
                  });
                  aiRunningRef.current = false;
                  setIsAIThinking(false);
                }, 800);
              } else {
                advanceTurn(gameState.walls, gameState.players, true);
                aiRunningRef.current = false;
                setIsAIThinking(false);
              }
              return;
            }

            if (gameState.gameMode === "abalone") {
              const act = getBestAbaloneMoveForAI(gameState, p.id, difficulty);
              if (act) {
                // highlight selected pieces
                setGameState((prev) => ({
                  ...prev,
                  selectedPieceIndex: act.pieceIdx,
                  abaloneSelectedIndices: act.abaloneIndices,
                }));
                setTimeout(() => {
                  handleMove({
                    r: act.movePos.r,
                    c: act.movePos.c,
                    isAbaloneMove: true,
                    du: act.du,
                    dv: act.dv,
                    isPush: act.isPush,
                    abaloneIndices: act.abaloneIndices,
                    isAIMove: true,
                  });
                  aiRunningRef.current = false;
                  setIsAIThinking(false);
                }, 500);
              } else {
                advanceTurn(gameState.walls, gameState.players, true);
                aiRunningRef.current = false;
                setIsAIThinking(false);
              }
              return;
            }

            if (gameState.gameMode === "orbito") {
              (async () => {
                try {
                  let workingPlayers = JSON.parse(
                    JSON.stringify(gameState.players || []),
                  );

                  // Setup AI Move
                  const orbitoMove = getBestOrbitoMoveForAI(
                    gameState,
                    difficulty,
                  );

                  // Phase 1: Shift (if someone else has pieces)
                  const otherHavePieces = workingPlayers.some((pl: Player) => pl.id !== p.id && pl.positions.length > 0);
                      if (otherHavePieces) {
                          if (orbitoMove.shift) {
                              const choice = orbitoMove.shift;
                              const oppPlayer = workingPlayers.find((pl: Player) => pl.id === choice.pId);
                              if (oppPlayer && oppPlayer.positions[choice.idx]) {
                                  oppPlayer.positions[choice.idx].r = choice.dr;
                                  oppPlayer.positions[choice.idx].c = choice.dc;
                              }
                              safePlaySound(() => SoundManager.playMovePiece());
                              
                              setGameState(prev => ({ ...prev, players: JSON.parse(JSON.stringify(workingPlayers)), orbitoPhase: 'shift' as any }));
                              // Wait out the 1000ms transition time + buffer
                              await new Promise(r => setTimeout(r, 1200));
                          }
                      }

                      // Phase 2: Place
                      setGameState(prev => ({ ...prev, orbitoPhase: 'place' as any }));
                      
                      if (orbitoMove.place) {
                          const choice = orbitoMove.place;
                          const myPlayer = workingPlayers.find((pl: Player) => pl.id === p.id);
                          if (myPlayer) {
                              myPlayer.positions.push({ r: choice.r, c: choice.c, id: `piece-ai-${Math.random().toString(36).substr(2, 9)}` });
                          }
                          safePlaySound(() => SoundManager.playMovePiece());
                          
                          setGameState(prev => ({ ...prev, players: JSON.parse(JSON.stringify(workingPlayers)) }));
                          // Wait for placement transition
                          await new Promise(r => setTimeout(r, 1200));
                      }

                      // Phase 3: Button (Rotate)
                  setGameState((prev) => ({
                    ...prev,
                    orbitoPhase: "button" as any,
                  }));
                  // brief pause to simulate clicking button
                  await new Promise((r) => setTimeout(r, 600));

                  workingPlayers.forEach((pl: Player) => {
                    pl.positions.forEach((pos: any) => {
                      const i = pos.r * 4 + pos.c;
                      let nextI = i;
                      if (i === 0) nextI = 4;
                      else if (i === 4) nextI = 8;
                      else if (i === 8) nextI = 12;
                      else if (i === 12) nextI = 13;
                      else if (i === 13) nextI = 14;
                      else if (i === 14) nextI = 15;
                      else if (i === 15) nextI = 11;
                      else if (i === 11) nextI = 7;
                      else if (i === 7) nextI = 3;
                      else if (i === 3) nextI = 2;
                      else if (i === 2) nextI = 1;
                      else if (i === 1) nextI = 0;
                      else if (i === 5) nextI = 9;
                      else if (i === 9) nextI = 10;
                      else if (i === 10) nextI = 6;
                      else if (i === 6) nextI = 5;
                      pos.r = Math.floor(nextI / 4);
                      pos.c = nextI % 4;
                    });
                  });

                  safePlaySound(() => SoundManager.playPlaceWall());
                  setGameState((prev) => ({
                    ...prev,
                    players: JSON.parse(JSON.stringify(workingPlayers)),
                    orbitoPhase: "animating" as any,
                  }));

                  // Evaluate conditions visually
                  await new Promise((r) => setTimeout(r, 1200));

                  advanceTurn(gameState.walls, workingPlayers, false);
                  aiRunningRef.current = false;
                } catch (e) {
                  console.error("AI Error in Orbito:", e);
                  advanceTurn(gameState.walls, gameState.players, true); // this might pass turn completely!
                  aiRunningRef.current = false;
                  setIsAIThinking(false);
                }
              })();

              return;
            }

            if (gameState.gameMode === "shobu") {
              const acts = getBestShobuMoveForAI(gameState, p.id, difficulty);
              if (acts) {
                const pm = acts.passive;
                const am = acts.active;
                let oldR = 0;
                let oldC = 0;
                
                setGameState((prev) => {
                  const nPlayers = prev.players.map((pl) => {
                    if (pl.id === p.id) {
                      const nPos = [...pl.positions];
                      oldR = nPos[pm.pieceIdx].r;
                      oldC = nPos[pm.pieceIdx].c;
                      nPos[pm.pieceIdx] = { ...nPos[pm.pieceIdx], r: pm.toR, c: pm.toC };
                      return { ...pl, positions: nPos };
                    }
                    return pl;
                  });
                  return { 
                    ...prev, 
                    players: nPlayers,
                    shobuState: {
                      passiveMove: {
                        r: oldR, c: oldC,
                        dr: pm.dr, dc: pm.dc,
                        steps: pm.steps,
                        boardColor: oldC < 4 ? 'dark' : 'light'
                      }
                    },
                    selectedPieceIndex: null
                  };
                });
                if (sfxVolume > 0) SoundManager.playMovePiece();

                setTimeout(() => {
                  let captured = false;
                  let opponentColor = "";
                  
                  setGameState((prev) => {
                    const nPlayers2 = prev.players.map((pl) => {
                      if (pl.id === p.id) {
                        const nPos2 = [...pl.positions];
                        nPos2[am.pieceIdx] = { ...nPos2[am.pieceIdx], r: am.toR, c: am.toC };
                        return { ...pl, positions: nPos2 };
                      }
                      if (am.pushOpponent && pl.id === am.pushOpponent.pId) {
                         const nPos2 = [...pl.positions];
                         if (am.pushOpponent.pushOff) {
                            nPos2.splice(am.pushOpponent.pieceIdx, 1);
                            captured = true;
                            opponentColor = pl.color;
                         } else {
                            nPos2[am.pushOpponent.pieceIdx] = { ...nPos2[am.pushOpponent.pieceIdx], r: am.pushOpponent.pushR, c: am.pushOpponent.pushC };
                         }
                         return { ...pl, positions: nPos2 };
                      }
                      return pl;
                    });
                    
                    const finalPlayers = captured ? nPlayers2.map((pl) => pl.id === p.id ? { ...pl, score: (pl.score || 0) + 1 } : pl) : nPlayers2;
                    return { ...prev, players: finalPlayers, shobuState: undefined };
                  });
                  
                  if (captured) {
                      if (sfxVolume > 0) SoundManager.playScream();
                      setPenteDyingPieces(prev => [...prev, { id: `shobu-falling-${Date.now()}`, color: opponentColor, r: am.pushOpponent!.pushR, c: am.pushOpponent!.pushC, t: Date.now() }]);
                  } else {
                      if (sfxVolume > 0) SoundManager.playMovePiece();
                  }

                  setTimeout(() => {
                     setGameState((prev) => {
                         setTimeout(() => advanceTurn(prev.walls, prev.players, false), 0);
                         return prev;
                     });
                     aiRunningRef.current = false;
                     setIsAIThinking(false);
                  }, 400);
                  
                }, 800);
                return;
              } else {
                 advanceTurn(gameState.walls, gameState.players, false);
                 aiRunningRef.current = false;
                 setIsAIThinking(false);
                 return;
              }
            }

            const isAmazons = gameState.gameMode === "amazons";
            const act = isAmazons
                ? getBestAmazonsMoveForAI(gameState, p.id, difficulty)
                : getBestMoveForAI(gameState, p.id);
            if (act) {
              const startPos = p.positions[act.pieceIdx];
              const path = isAmazons
                ? null
                : findPath(
                    startPos,
                    act.movePos,
                    gameState.walls,
                    gameState.players,
                    2,
                    gameState.boardTheme,
                  );

              if (path && path.length > 2) {
                // Move to intermediate first
                setGameState((prev) => {
                  const nPlayers = prev.players.map((pl) => {
                    if (pl.id === p.id) {
                      const nPos = [...pl.positions];
                      nPos[act.pieceIdx] = path[1];
                      return { ...pl, positions: nPos };
                    }
                    return pl;
                  });
                  return { ...prev, players: nPlayers };
                });

                setTimeout(() => {
                  const nPlayers = gameState.players.map((pl) => {
                    if (pl.id === p.id) {
                      const nPos = [...pl.positions];
                      nPos[act.pieceIdx] = act.movePos;
                      if (
                        gameState.gameMode === "corsa" &&
                        act.fugaWallTarget
                      ) {
                        return {
                          ...pl,
                          positions: nPos,
                          wallsLeft: (pl.wallsLeft || 0) - 1,
                        };
                      }
                      return { ...pl, positions: nPos };
                    }
                    return pl;
                  });
                  if (gameState.gameMode === "corsa") {
                    if (act.fugaWallTarget) {
                      const { r, c, orientation } = act.fugaWallTarget;
                      let w1Id, w2Id;
                      if (orientation === "h") {
                        w1Id = serializeWall(r, c, r + 1, c);
                        w2Id = serializeWall(r, c + 1, r + 1, c + 1);
                      } else {
                        w1Id = serializeWall(r, c, r, c + 1);
                        w2Id = serializeWall(r + 1, c, r + 1, c + 1);
                      }
                      advanceTurn(
                        [
                          ...gameState.walls,
                          { id: w1Id, ownerId: p.id },
                          { id: w2Id, ownerId: p.id },
                        ],
                        nPlayers,
                        false,
                      );
                    } else {
                      advanceTurn(gameState.walls, nPlayers, false);
                    }
                  } else if (gameState.gameMode === "amazons") {
                    if (!act.wallTarget) {
                      advanceTurn(gameState.walls, nPlayers, false);
                      aiRunningRef.current = false;
                      setIsAIThinking(false);
                    } else {
                      setGameState((prev) => ({ ...prev, players: nPlayers }));
                      setAiTrace({ from: act.movePos, to: act.wallTarget });
                      setTimeout(() => {
                        setAiTrace(null);
                        advanceTurn(
                          [
                            ...gameState.walls,
                            {
                              id: `${act.wallTarget!.r},${act.wallTarget!.c}`,
                              ownerId: p.id,
                            },
                          ],
                          nPlayers,
                          false,
                        );
                        aiRunningRef.current = false;
                        setIsAIThinking(false);
                      }, 600);
                      return; // Prevent running cleanup below
                    }
                  } else {
                    if (gameState.usedWallbreakerThisTurn || !act.wallTarget) {
                      advanceTurn(gameState.walls, nPlayers, false);
                      aiRunningRef.current = false;
                      setIsAIThinking(false);
                    } else {
                      setGameState((prev) => ({ ...prev, players: nPlayers }));
                      setTimeout(() => {
                        advanceTurn(
                          [
                            ...gameState.walls,
                            {
                              id: serializeWall(
                                act.movePos.r,
                                act.movePos.c,
                                act.wallTarget!.r,
                                act.wallTarget!.c,
                              ),
                              ownerId: p.id,
                            },
                          ],
                          nPlayers,
                          false,
                        );
                        aiRunningRef.current = false;
                        setIsAIThinking(false);
                      }, 600);
                      return; // Prevent running cleanup below
                    }
                  }
                  if (gameState.gameMode === "corsa" || !act.wallTarget) {
                    aiRunningRef.current = false;
                    setIsAIThinking(false);
                  }
                }, 300);
                return; // Wait for setTimeout to finish
              } else {
                const nPlayers = gameState.players.map((pl) => {
                  if (pl.id === p.id) {
                    const nPos = [...pl.positions];
                    nPos[act.pieceIdx] = act.movePos;
                    if (gameState.gameMode === "corsa" && act.fugaWallTarget) {
                      return {
                        ...pl,
                        positions: nPos,
                        wallsLeft: (pl.wallsLeft || 0) - 1,
                      };
                    }
                    return { ...pl, positions: nPos };
                  }
                  return pl;
                });
                if (gameState.gameMode === "corsa") {
                  if (act.fugaWallTarget) {
                    const { r, c, orientation } = act.fugaWallTarget;
                    let w1Id, w2Id;
                    if (orientation === "h") {
                      w1Id = serializeWall(r, c, r + 1, c);
                      w2Id = serializeWall(r, c + 1, r + 1, c + 1);
                    } else {
                      w1Id = serializeWall(r, c, r, c + 1);
                      w2Id = serializeWall(r + 1, c, r + 1, c + 1);
                    }
                    advanceTurn(
                      [
                        ...gameState.walls,
                        { id: w1Id, ownerId: p.id },
                        { id: w2Id, ownerId: p.id },
                      ],
                      nPlayers,
                      false,
                    );
                  } else {
                    advanceTurn(gameState.walls, nPlayers, false);
                  }
                } else if (gameState.gameMode === "amazons") {
                  if (!act.wallTarget) {
                    advanceTurn(gameState.walls, nPlayers, false);
                    aiRunningRef.current = false;
                    setIsAIThinking(false);
                  } else {
                    setGameState((prev) => ({ ...prev, players: nPlayers }));
                    setTimeout(() => {
                      setAiTrace({ from: act.movePos, to: act.wallTarget! });
                      setTimeout(() => {
                        setAiTrace(null);
                        advanceTurn(
                          [
                            ...gameState.walls,
                            {
                              id: `${act.wallTarget!.r},${act.wallTarget!.c}`,
                              ownerId: p.id,
                            },
                          ],
                          nPlayers,
                          false,
                        );
                        aiRunningRef.current = false;
                        setIsAIThinking(false);
                      }, 600);
                    }, 300);
                    return; // Prevent running cleanup below
                  }
                } else {
                  if (gameState.usedWallbreakerThisTurn || !act.wallTarget) {
                    advanceTurn(gameState.walls, nPlayers, false);
                    aiRunningRef.current = false;
                    setIsAIThinking(false);
                  } else {
                    setGameState((prev) => ({ ...prev, players: nPlayers }));
                    setTimeout(() => {
                      advanceTurn(
                        [
                          ...gameState.walls,
                          {
                            id: serializeWall(
                              act.movePos.r,
                              act.movePos.c,
                              act.wallTarget!.r,
                              act.wallTarget!.c,
                            ),
                            ownerId: p.id,
                          },
                        ],
                        nPlayers,
                        false,
                      );
                      aiRunningRef.current = false;
                      setIsAIThinking(false);
                    }, 600);
                    return; // Prevent running cleanup below
                  }
                }
              }
            } else {
              advanceTurn(gameState.walls, gameState.players, true);
              aiRunningRef.current = false;
              setIsAIThinking(false);
            }
          }
          if (
            gameState.gameMode === "corsa" ||
            gameState.turnPhase === "setup"
          ) {
            aiRunningRef.current = false;
            setIsAIThinking(false);
          }
        } catch (e) {
          console.error("AI Error:", e);
          advanceTurn(gameState.walls, gameState.players, true);
          aiRunningRef.current = false;
          setIsAIThinking(false);
        }
      },
      isSimulatedOnlineMatch
        ? (4000 + Math.floor(Math.random() * 4001)) // Tempo variabile tra 4 e 8 secondi (4000ms - 8000ms)
        : gameState.gameMode === "yinsh" && gameState.yinshState?.phase === "place_ring"
        ? 0
        : gameState.gameMode === "yinsh" && gameState.yinshState?.phase !== "remove_ring" && gameState.yinshState?.phase !== "remove_markers"
        ? 2600 // give a slight buffer over the 2.5s player animation
        : gameState.gameMode === "yinsh"
          ? (gameState.yinshState?.lastMove ? Math.max(800, 3100 - (Date.now() - gameState.yinshState.lastMove.timestamp)) : 800)
        : gameState.gameMode === "abalone" && undoWindowActive
          ? 2000
          : isPlayerSuspended
            ? 300
            : 800,
    );

    return () => {
      clearTimeout(aiTimeout);
      if (!timeoutFired) {
        aiRunningRef.current = false;
        setIsAIThinking(false);
      }
    };
  }, [
    gameState.currentPlayerIndex,
    gameState.turnPhase,
    gameState.status,
    gameState.winner,
    gameState.usedWallbreakerThisTurn,
    advanceTurn,
    isStrategyOpen,
    boardTheme,
    gameState.orbitoPhase,
    gameState.yinshState?.phase,
    onlineMatchSession,
  ]);

  // Nuova funzione fetchAdvice completamente locale
  const fetchAdvice = async () => {
    if (isAdviceLoading || !isUserTurn) return;

    setIsAdviceLoading(true);
    setAdviceObj(null);
    Logger.info("Calcolo strategia locale...");

    try {
      const res = await getStrategyAdvice(gameState, language);
      setAdviceObj(res);
      Logger.info("Strategia calcolata.");
    } catch (e: any) {
      Logger.error("Errore strategia", e);
      setAdviceObj({
        text:
          language === "it"
            ? `Errore tattico. Riprova.`
            : `Tactical error. Try again.`,
      });
    } finally {
      setIsAdviceLoading(false);
    }
  };

  const closeAdvice = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setAdviceObj(null);
    setIsAdviceLoading(false);
    setAdvicePos({ x: 0, y: 0 });
  };

  const onAdvicePointerDown = (e: React.PointerEvent) => {
    setIsDraggingAdvice(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: advicePos.x,
      startY: advicePos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onAdvicePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingAdvice) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setAdvicePos({
      x: dragStartRef.current.startX + dx,
      y: dragStartRef.current.startY + dy,
    });
  };

  const onAdvicePointerUp = (e: React.PointerEvent) => {
    setIsDraggingAdvice(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (isSplashActive) {
    return <SplashScreen onFinish={() => setIsSplashActive(false)} />;
  }

  const content = (
    <div className={`flex-1 flex h-full bg-slate-950 text-white ${gameMode === "stratego" && gameState.status === "playing" ? "p-1 sm:p-2.5" : "p-2 sm:p-4"} pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:pb-4 overflow-hidden relative gap-3 sm:gap-4 justify-between items-stretch`}>
      {/* PC LEFT PANEL: Trivia & YouTube Links */}
      <div className="hidden lg:flex w-80 xl:w-96 shrink-0 h-full flex-col bg-slate-900/80 rounded-[2.5rem] border border-white/10 p-4 sm:p-5 overflow-hidden shadow-2xl backdrop-blur-xl">
        <DesktopTriviaPanel
          language={language}
          selectedGame={pcSelectedGame}
          onSelectGame={(m) => setPcSelectedGame(m)}
          historyData={historyData}
        />
      </div>

      {/* CENTER PANEL: Setup or Game View */}
      <div className={`flex-1 min-h-0 flex flex-col w-full ${gameMode === "stratego" && gameState.status === "playing" ? "max-w-2xl lg:max-w-3xl xl:max-w-4xl" : "max-w-sm lg:max-w-md xl:max-w-xl"} mx-auto h-full relative overflow-hidden`}>
      {gameMode === "stratego" && gameState.status === "playing" ? (
        <StrategoBoard
          savedGameData={strategoSavedGame}
          boardTheme={boardTheme}
          onBackToMenu={() => {
            if (onlineMatchSession) {
              handleOnlineAbandon();
            } else {
              setGameMode("dominio");
              setSetupView("grid");
              setGameState((prev) => ({ ...prev, status: "setup" }));
              setStrategoSavedGame(null);
              setHasDismissedResumeModal(false);
            }
          }}
          onBackToSetup={() => {
            if (onlineMatchSession) {
              handleOnlineAbandon();
            } else {
              setGameState((prev) => ({ ...prev, status: "setup" }));
              setSetupView("details");
              setStrategoSavedGame(null);
              setHasDismissedResumeModal(false);
            }
          }}
          onOpenHistory={() => {
            setHistoryMode("stratego");
            setIsHistoryOpen(true);
          }}
          onOpenRules={() => setIsStrategoRulesOpen(true)}
          language={language}
          isAdmin={isStrategoAdmin}
          initialDifficulty={strategoDifficulty}
          initialStarter={onlineMatchSession ? "red" : strategoStarter === "human" ? "red" : strategoStarter === "ai" ? "blue" : (Math.random() < 0.5 ? "red" : "blue")}
          initialPreset={strategoPreset}
          onlineMatchSession={onlineMatchSession}
          onOnlineAbandon={handleOnlineAbandon}
          onEndOnlineMatch={handleOnlineStrategoEnd}
          onGameEnd={handleStrategoGameEnd}
        />
      ) : gameState.status === "setup" ? (
        <div className="flex-1 min-h-0 flex flex-col w-full max-w-sm mx-auto overflow-y-auto no-scrollbar py-1 sm:py-2">
          {setupView === "grid" ? (
            <>
              <div className="w-full flex items-center justify-between p-2.5 bg-slate-900/40 rounded-[1.5rem] border border-white/5 backdrop-blur-xl shadow-2xl shrink-0 mb-3">
                <div
                  className="flex items-center gap-2 pl-1 cursor-pointer"
                  onClick={() => {
                    if (userName === "ZioSeb" && userLocation === "Sant'Alfio")
                      setIsAdminStatsOpen(true);
                  }}
                >
                  <Logo size={32} />
                  <h1 className="text-xl font-black italic text-blue-400">
                    WALL GO AI
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <PWAInstallButton language={language} />

                  {!Capacitor.isNativePlatform() && (
                    <button
                      onClick={toggleFullScreen}
                      className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-white/10 flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
                      title={isFullscreen ? (language === "it" ? "Riduci schermo" : "Exit full screen") : (language === "it" ? "Schermo intero" : "Full screen")}
                      aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4 text-blue-400" /> : <Maximize className="w-4 h-4 text-blue-400" />}
                      <span className="text-[11px] hidden sm:inline">{isFullscreen ? (language === "it" ? "Normale" : "Normal") : (language === "it" ? "Schermo intero" : "Full screen")}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsExitAlertOpen(true)}
                    className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 rounded-xl border border-red-500/30 flex items-center gap-1.5 text-xs font-bold text-red-300 hover:text-white transition-all shadow-md active:scale-95"
                    title={language === "it" ? "Esci dall'applicazione" : "Exit application"}
                    aria-label="Exit"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider">EXIT</span>
                  </button>
                </div>
              </div>



              <div className="w-full mb-2 px-1 shrink-0">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setIsDailyMissionsOpen(true)}
                    className="flex items-center justify-center py-1.5 px-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 hover:border-amber-400 text-amber-200 active:scale-95 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] group min-h-[44px]"
                  >
                    <span className="text-xs sm:text-sm font-black italic tracking-tight leading-[1.15] text-center line-clamp-2 break-words text-wrap">
                      {(t as any).dailyMissionsButton || "Le missioni di oggi"}
                    </span>
                  </button>

                  <button
                    onClick={() => setIsOnlineSearchOpen(true)}
                    className="flex items-center justify-center py-1.5 px-2 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 hover:border-emerald-400 text-emerald-200 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] group min-h-[44px]"
                  >
                    <span className="text-xs sm:text-sm font-black italic tracking-tight leading-[1.15] text-center line-clamp-2 break-words text-wrap">
                      {(t as any).searchOnlinePlayerButton || "Cerca giocatore online"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="w-full flex-1 flex flex-col min-h-0 relative">
                {(() => {
                  const allGames = [
                    { m: "dominio", i: (<div className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] scale-125"><Logo size={48} /></div>), n: "Wall Go AI", l: language === "it" ? "Territorio" : "Territory", bg: "bg-blue-600/20", from: "from-blue-500/20", shadow: "shadow-blue-900/50", txt: "text-blue-400", txtSub: "text-blue-300/80" },
                    { m: "corsa", i: "🏁", n: "Quoridor", l: language === "it" ? "Percorso" : "Path", bg: "bg-orange-600/20", from: "from-orange-500/20", shadow: "shadow-orange-900/50", txt: "text-orange-400", txtSub: "text-orange-300/80" },
                    { m: "amazons", i: "🏹", n: "Amazons", l: language === "it" ? "Distruzione" : "Destroy", bg: "bg-purple-600/20", from: "from-purple-500/20", shadow: "shadow-purple-900/50", txt: "text-purple-400", txtSub: "text-purple-300/80" },
                    { m: "domineering", i: "⚔️", n: "Domineering", l: language === "it" ? "Blocco" : "Block", bg: "bg-rose-600/20", from: "from-rose-500/20", shadow: "shadow-rose-900/50", txt: "text-rose-400", txtSub: "text-rose-300/80" },
                    { m: "hex", i: "⬡", n: "Hex", l: language === "it" ? "Connessione" : "Connection", bg: "bg-fuchsia-600/20", from: "from-fuchsia-500/20", shadow: "shadow-fuchsia-900/50", txt: "text-fuchsia-400", txtSub: "text-fuchsia-300/80" },
                    { m: "pente", i: "⭐", n: "Pente", l: language === "it" ? "Allinea 5" : "Align 5", bg: "bg-teal-900/30", from: "from-teal-500/20", shadow: "shadow-[0_0_20px_rgba(20,184,166,0.3)]", txt: "text-teal-400", txtSub: "text-teal-300/60" },
                    { m: "orbito", i: "🪐", n: "Orbito", l: language === "it" ? "Allineamento" : "Align", bg: "bg-pink-600/20", from: "from-pink-500/20", shadow: "shadow-pink-900/50", txt: "text-pink-400", txtSub: "text-pink-300/80" },
                    { m: "chain_triangle", i: "🔺", n: "Chain Triangle", l: language === "it" ? "Connessione" : "Connection", bg: "bg-yellow-600/20", from: "from-yellow-500/20", shadow: "shadow-yellow-900/50", txt: "text-yellow-400", txtSub: "text-yellow-300/80" },
                    { m: "shobu", i: "🪨", n: "Shobu", l: language === "it" ? "Pietre" : "Stones", bg: "bg-cyan-600/20", from: "from-cyan-500/20", shadow: "shadow-cyan-900/50", txt: "text-cyan-400", txtSub: "text-cyan-300/80" },
                    { m: "yinsh", i: "💍", n: "Yinsh", l: language === "it" ? "Anelli" : "Rings", bg: "bg-emerald-600/20", from: "from-emerald-500/20", shadow: "shadow-emerald-900/50", txt: "text-emerald-400", txtSub: "text-emerald-300/80" },
                    { m: "abalone", i: "🎱", n: "Abalone", l: language === "it" ? "Spinta" : "Push", bg: "bg-slate-700/80", from: "from-slate-400/20", shadow: "shadow-[0_0_20px_rgba(148,163,184,0.3)]", txt: "text-slate-200", txtSub: "text-slate-300/80" },
                    { m: "onitama", i: "🏯", n: "Onitama", l: language === "it" ? "Spirito" : "Spirit", bg: "bg-red-900/30", from: "from-red-500/20", shadow: "shadow-red-900/50", txt: "text-red-400", txtSub: "text-red-300/60" },
                    { m: "baduk", i: "⚫", n: "Baduk / Go", l: language === "it" ? "Territorio" : "Territory", bg: "bg-zinc-600/20", from: "from-zinc-500/20", shadow: "shadow-[0_0_20px_rgba(113,113,122,0.3)]", txt: "text-zinc-300", txtSub: "text-zinc-400" },
                    { m: "stratego", i: "🚩", n: "Stratego", l: language === "it" ? "Strategia" : "Strategy", bg: "bg-amber-600/20", from: "from-amber-500/20", shadow: "shadow-amber-900/50", txt: "text-amber-400", txtSub: "text-amber-300/80" }
                  ];

                  const renderSmallButton = (g: any) => {
                    const isUnlocked = g.m === "stratego" ? true : g.comingSoon ? true : isModeUnlocked(g.m as GameMode);
                    return (
                      <button
                        key={g.m}
                        onClick={() => {
                          if (g.m === "stratego") {
                            handleOpenStratego();
                            return;
                          }
                          if (g.comingSoon) {
                            handleComingSoon();
                            return;
                          }
                          if (!isUnlocked) {
                            setUnlockModalMode(g.m as GameMode);
                            return;
                          }
                          handleGameModeChange(g.m as GameMode);
                          setSetupView("details");
                        }}
                        className={`rounded-xl flex flex-row items-center justify-start px-3 h-full min-h-[48px] relative active:scale-95 transition-all outline-none ${g.m === gameMode ? "ring-2 ring-inset ring-white/80 bg-white/10 z-10" : ""} ${isUnlocked || g.comingSoon ? `${g.bg} ${g.shadow}` : "bg-slate-800/40 opacity-70 border border-white/5"}`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-t ${isUnlocked || g.comingSoon ? g.from : "from-slate-900/50"} rounded-xl`}></div>
                        {g.m === "stratego" ? (
                          <div className="absolute top-1.5 right-2 z-20 px-1.5 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-wider bg-amber-500/25 border-amber-400/50 text-amber-300 shadow-sm">
                            3D NEW
                          </div>
                        ) : g.comingSoon ? (
                          <div className="absolute top-1.5 right-2 z-20 px-1.5 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-wider bg-amber-500/25 border-amber-400/40 text-amber-300">
                            SOON
                          </div>
                        ) : !isUnlocked ? (
                          <div className="absolute top-2 right-2 z-20 text-[10px]">🔒</div>
                        ) : null}
                        <div className={`text-2xl mr-3 relative z-10 ${!isUnlocked && !g.comingSoon ? "grayscale opacity-50" : g.m === "hex" ? "text-fuchsia-400" : ""}`}>{g.i}</div>
                        <div className="flex flex-col items-start justify-center overflow-hidden w-full relative z-10">
                          <span className={`text-[10px] font-black uppercase tracking-widest text-left truncate w-full ${isUnlocked || g.comingSoon ? g.txt : "text-slate-500"}`}>{g.n}</span>
                          <span className={`text-[7px] font-bold uppercase mt-0.5 whitespace-nowrap overflow-hidden text-clip w-full text-left ${isUnlocked || g.comingSoon ? g.txtSub : "text-slate-600"}`}>
                            {g.m === "stratego" ? (language === "it" ? "3D Attivo" : "3D Active") : g.comingSoon ? (language === "it" ? "In arrivo" : "Coming soon") : isUnlocked ? g.l : language === "it" ? "50 PUNTI" : "50 POINTS"}
                          </span>
                        </div>
                      </button>
                    );
                  };

                  const wallGo = allGames.find(g => g.m === "dominio")!;
                  const baduk = allGames.find(g => g.m === "baduk")!;
                  const stratego = allGames.find(g => g.m === "stratego")!;
                  const onitama = allGames.find(g => g.m === "onitama")!;
                  const amazons = allGames.find(g => g.m === "amazons")!;
                  const chainTriangle = allGames.find(g => g.m === "chain_triangle")!;

                  // Ordine: Onitama al posto di Amazons, Amazons in fondo a destra
                  const otherGames = [
                    allGames.find(g => g.m === "corsa")!,
                    onitama,
                    allGames.find(g => g.m === "domineering")!,
                    allGames.find(g => g.m === "hex")!,
                    allGames.find(g => g.m === "pente")!,
                    allGames.find(g => g.m === "orbito")!,
                    allGames.find(g => g.m === "shobu")!,
                    allGames.find(g => g.m === "yinsh")!,
                    allGames.find(g => g.m === "abalone")!,
                    amazons
                  ];

                  return (
                    <div className="flex flex-col h-full flex-1 min-h-0">
                      {/* Horizontal Swipe/Scroll Carousel */}
                      <div
                        ref={homeCarouselRef}
                        onScroll={handleHomeCarouselScroll}
                        onTouchStart={handleHomeTouchStart}
                        onTouchEnd={handleHomeTouchEnd}
                        className="w-full flex-1 flex flex-row overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar select-none min-h-0"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                      >
                        {/* Slide 0: Current 13 Games */}
                        <div className="w-full shrink-0 snap-start snap-always flex flex-col gap-2 p-1 min-h-0 h-full justify-between">
                          <button
                            onClick={() => {
                              handleGameModeChange(wallGo.m as GameMode);
                              setSetupView("details");
                            }}
                            className={`rounded-2xl shrink-0 p-4 flex-[1.2] min-h-[76px] flex flex-row items-center gap-4 relative active:scale-95 transition-all outline-none ${wallGo.m === gameMode ? "ring-2 ring-inset ring-white/80 bg-white/10 z-10" : ""} ${wallGo.bg} ${wallGo.shadow}`}
                          >
                            <div className={`absolute inset-0 bg-gradient-to-t ${wallGo.from} rounded-2xl`}></div>
                            <div className="text-5xl ml-2 relative z-10">{wallGo.i}</div>
                            <div className="flex flex-col items-start relative z-10 pt-1">
                              <span className={`text-xl font-black uppercase tracking-widest text-left ${wallGo.txt}`}>{wallGo.n}</span>
                              <span className={`text-[10px] mt-1 font-bold uppercase text-left ${wallGo.txtSub}`}>{wallGo.l}</span>
                            </div>
                          </button>

                          <div className="grid grid-cols-2 gap-2 flex-1 min-h-[68px]">
                            <button
                              onClick={() => {
                                const isUnlocked = isModeUnlocked("baduk");
                                if (!isUnlocked) {
                                  setUnlockModalMode("baduk");
                                  return;
                                }
                                handleGameModeChange(baduk.m as GameMode);
                                setSetupView("details");
                              }}
                              className={`rounded-2xl shrink-0 px-2 h-full shadow-xl flex flex-row items-center gap-2 relative active:scale-95 transition-all outline-none ${baduk.m === gameMode ? "ring-2 ring-inset ring-white/80 bg-white/10 z-10" : ""} ${(isModeUnlocked("baduk")) ? `${baduk.bg} ${baduk.shadow}` : "bg-slate-800/40 opacity-70 border border-white/5"}`}
                            >
                              <div className={`absolute inset-0 bg-gradient-to-t ${(isModeUnlocked("baduk")) ? baduk.from : "from-slate-900/50"} rounded-2xl`}></div>
                              {!(isModeUnlocked("baduk")) && <div className="absolute top-2 right-2 z-20 text-[10px]">🔒</div>}
                              <div className={`text-3xl ml-1 relative z-10 ${!(isModeUnlocked("baduk")) ? "grayscale opacity-50" : ""}`}>{baduk.i}</div>
                              <div className="flex flex-col items-start relative z-10 mt-0.5">
                                <span className={`text-sm font-black uppercase tracking-widest text-left ${(isModeUnlocked("baduk")) ? baduk.txt : "text-slate-500"}`}>{baduk.n}</span>
                                <span className={`text-[8px] mt-0.5 font-bold uppercase text-left ${(isModeUnlocked("baduk")) ? baduk.txtSub : "text-slate-600"}`}>
                                  {(isModeUnlocked("baduk")) ? baduk.l : language === "it" ? "50 PUNTI" : "50 POINTS"}
                                </span>
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                handleOpenStratego();
                              }}
                              className={`rounded-2xl shrink-0 px-2 h-full shadow-xl flex flex-row items-center gap-2 relative active:scale-95 transition-all outline-none ${stratego.m === gameMode ? "ring-2 ring-inset ring-white/80 bg-white/10 z-10" : ""} ${stratego.bg} ${stratego.shadow}`}
                            >
                              <div className={`absolute inset-0 bg-gradient-to-t ${stratego.from} rounded-2xl`}></div>
                              <div className="absolute top-1.5 right-2 z-20 px-1.5 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-wider bg-amber-500/25 border-amber-400/50 text-amber-300 shadow-sm">
                                3D NEW
                              </div>
                              <div className="text-3xl ml-1 relative z-10">{stratego.i}</div>
                              <div className="flex flex-col items-start relative z-10 mt-0.5">
                                <span className={`text-sm font-black uppercase tracking-widest text-left ${stratego.txt}`}>{stratego.n}</span>
                                <span className={`text-[8px] mt-0.5 font-bold uppercase text-left ${stratego.txtSub}`}>
                                  {language === "it" ? "3D Attivo" : "3D Active"}
                                </span>
                              </div>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 flex-[4] min-h-[250px] auto-rows-fr">
                            {otherGames.map(game => renderSmallButton(game))}
                          </div>
                        </div>

                        {/* Slide 1: 14th Game - CHAIN TRIANGLE (TRIANGOLI) - Grafica sobria con dimensione Wall Go AI */}
                        <div className="w-full shrink-0 snap-start snap-always flex flex-col gap-2.5 p-1 min-h-0 h-full justify-between">
                          {/* Top Navigation Row */}
                          <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md shadow-md shrink-0">
                            <button
                              onClick={() => scrollToHomeSlide(0)}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                            >
                              <span>◀</span>
                              <span>{language === "it" ? "Torna alla 1ª Pagina" : "Back to 1st Page"}</span>
                            </button>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-yellow-400" />
                              <span className="text-[10px] font-black text-yellow-300 uppercase tracking-wider">
                                {language === "it" ? "2ª Pagina Giochi" : "2nd Page Games"}
                              </span>
                            </div>
                          </div>

                          {/* Pulsante Chain Triangle con grafica sobria e dimensione identica al pulsante WALL GO AI */}
                          {(() => {
                            const isUnlocked = isModeUnlocked("chain_triangle");
                            return (
                              <button
                                onClick={() => {
                                  if (!isUnlocked) {
                                    setUnlockModalMode("chain_triangle");
                                    return;
                                  }
                                  handleGameModeChange(chainTriangle.m as GameMode);
                                  setSetupView("details");
                                }}
                                className={`rounded-2xl shrink-0 p-4 flex-[1.2] min-h-[76px] flex flex-row items-center gap-4 relative active:scale-95 transition-all outline-none ${chainTriangle.m === gameMode ? "ring-2 ring-inset ring-white/80 bg-white/10 z-10" : ""} ${isUnlocked ? `${chainTriangle.bg} ${chainTriangle.shadow}` : "bg-slate-800/40 opacity-70 border border-white/5"}`}
                              >
                                <div className={`absolute inset-0 bg-gradient-to-t ${isUnlocked ? chainTriangle.from : "from-slate-900/50"} rounded-2xl`}></div>
                                {!isUnlocked && <div className="absolute top-2.5 right-2.5 z-20 text-[10px]">🔒</div>}
                                <div className={`text-5xl ml-2 relative z-10 ${!isUnlocked ? "grayscale opacity-50" : ""}`}>{chainTriangle.i}</div>
                                <div className="flex flex-col items-start relative z-10 pt-1">
                                  <span className={`text-xl font-black uppercase tracking-widest text-left ${isUnlocked ? chainTriangle.txt : "text-slate-500"}`}>{chainTriangle.n}</span>
                                  <span className={`text-[10px] mt-1 font-bold uppercase text-left ${isUnlocked ? chainTriangle.txtSub : "text-slate-600"}`}>
                                    {isUnlocked ? chainTriangle.l : language === "it" ? "50 PUNTI" : "50 POINTS"}
                                  </span>
                                </div>
                              </button>
                            );
                          })()}

                          {/* Sezione sobria inferiore con helper di ritorno */}
                          <div className="flex-1 flex flex-col items-center justify-center p-4">
                            <button
                              onClick={() => scrollToHomeSlide(0)}
                              className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                            >
                              <span>👈</span>
                              <span>{language === "it" ? "Scorri a sinistra per tornare alla prima pagina" : "Swipe left to return to first page"}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Pagination Indicator Dots */}
                      <div className="flex items-center justify-center gap-2 py-1.5 shrink-0">
                        <button
                          onClick={() => scrollToHomeSlide(0)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${homePageSlide === 0 ? "w-6 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "w-1.5 bg-slate-600/70 hover:bg-slate-400"}`}
                          aria-label="Pagina 1"
                        />
                        <button
                          onClick={() => scrollToHomeSlide(1)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${homePageSlide === 1 ? "w-6 bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" : "w-1.5 bg-slate-600/70 hover:bg-slate-400"}`}
                          aria-label="Pagina 2"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
              {comingSoonToast && (
                <div className="fixed sm:absolute bottom-12 left-1/2 -translate-x-1/2 w-max max-w-[320px] bg-slate-900/95 text-amber-300 text-sm font-black px-6 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.6)] border-2 border-amber-500/80 animate-in fade-in slide-in-from-bottom-2 z-50 text-center pointer-events-none flex items-center gap-2.5">
                  <span className="text-base">⏳</span>
                  <span>{comingSoonToast}</span>
                </div>
              )}
            </>
          ) : (
            <div className="w-full flex-1 flex flex-col relative animate-in slide-in-from-bottom-8 fade-in duration-300">
              {/* Detail View Header & Large Icon Container */}
              <div className="flex flex-col w-full mb-1 sm:mb-2 px-1 shrink-0">
                {/* Top Controls */}
                <div className="flex items-center justify-between w-full mb-2 sm:mb-3">
                  <button
                    onClick={() => setSetupView("grid")}
                    className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-slate-800 rounded-full flex items-center justify-center text-lg sm:text-xl shadow-xl hover:bg-slate-700 border border-white/10 z-10 active:scale-95 transition-transform"
                  >
                    🔙
                  </button>

                  <div className="flex gap-2 shrink-0 z-10 pointer-events-auto">
                    <button
                      onClick={() => {
                        if (gameMode === "stratego")
                          setIsStrategoRulesOpen(true);
                        else if (gameMode === "orbito") setIsOrbitoRulesOpen(true);
                        else if (gameMode === "pente")
                          setIsPenteRulesOpen(true);
                        else if (gameMode === "shobu")
                          setIsShobuRulesOpen(true);
                        else if (gameMode === "yinsh")
                          setIsYinshRulesOpen(true);
                        else if (gameMode === "onitama")
                          setIsOnitamaRulesOpen(true);
                        else if (gameMode === "baduk")
                          setIsBadukRulesOpen(true);
                        else setIsRulesOpen(true);
                      }}
                      className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-slate-800 rounded-full border border-white/10 shadow-xl flex items-center justify-center text-base sm:text-lg hover:bg-slate-700 transition-colors"
                    >
                      ❓
                    </button>
                    <button
                      onClick={() => {
                        setSettingsTab("account");
                        setIsSettingsOpen(true);
                      }}
                      className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-slate-800 rounded-full border border-white/10 shadow-xl flex items-center justify-center text-base sm:text-lg hover:bg-slate-700 transition-colors"
                    >
                      👤
                    </button>
                    <button
                      onClick={() => {
                        setSettingsTab("general");
                        setIsSettingsOpen(true);
                      }}
                      className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-slate-800 rounded-full border border-white/10 shadow-xl flex items-center justify-center text-base sm:text-lg hover:bg-slate-700 transition-colors"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>

                {/* Title and Icon Area */}
                <div className="flex flex-col items-center justify-center relative w-full mb-1 sm:mb-2 z-0">
                  <span
                    className={`text-2xl sm:text-3xl font-black italic truncate w-full text-center px-4 tracking-tight drop-shadow-md mb-2 sm:mb-4 ${gameMode === "stratego" ? "text-amber-400" : gameMode === "corsa" ? "text-orange-400" : gameMode === "amazons" ? "text-purple-400" : gameMode === "domineering" ? "text-rose-400" : gameMode === "abalone" ? "text-slate-200" : gameMode === "hex" ? "text-fuchsia-400" : gameMode === "orbito" ? "text-pink-400" : gameMode === "pente" ? "text-teal-400" : gameMode === "chain_triangle" ? "text-yellow-400" : gameMode === "shobu" ? "text-cyan-400" : gameMode === "yinsh" ? "text-emerald-400" : gameMode === "onitama" ? "text-red-400" : "text-blue-400"}`}
                  >
                    {gameMode === "stratego"
                      ? "STRATEGO"
                      : gameMode === "corsa"
                      ? "QUORIDOR"
                      : gameMode === "amazons"
                        ? "AMAZONS"
                        : gameMode === "domineering"
                          ? "DOMINEERING"
                          : gameMode === "abalone"
                            ? "ABALONE"
                            : gameMode === "hex"
                              ? "HEX"
                              : gameMode === "orbito"
                                ? "ORBITO"
                                : gameMode === "pente"
                                  ? "PENTE"
                                  : gameMode === "chain_triangle"
                                    ? "CHAIN TRIANGLE"
                                    : gameMode === "shobu"
                                      ? "SHOBU"
                                      : gameMode === "yinsh"
                                        ? "YINSH"
                                        : gameMode === "onitama"
                                          ? "ONITAMA"
                                          : gameMode === "baduk"
                                            ? "BADUK / GO"
                                            : "WALL GO AI"}
                  </span>

                  <div className="flex justify-center shrink-0">
                    <div
                      className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[1.5rem] border-2 sm:border-[3px] flex items-center justify-center text-4xl sm:text-5xl shadow-2xl relative overflow-hidden ${gameMode === "stratego" ? "bg-amber-600/20 border-amber-500/80 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)]" : gameMode === "corsa" ? "bg-orange-600/20 border-orange-500/80 text-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.3)]" : gameMode === "amazons" ? "bg-purple-600/20 border-purple-500/80 text-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.3)]" : gameMode === "domineering" ? "bg-rose-600/20 border-rose-500/80 text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)]" : gameMode === "abalone" ? "bg-slate-700/80 border-slate-400/80 text-slate-200 shadow-[0_0_25px_rgba(148,163,184,0.3)]" : gameMode === "hex" ? "bg-fuchsia-600/20 border-fuchsia-500/80 text-fuchsia-400 shadow-[0_0_25px_rgba(217,70,239,0.3)]" : gameMode === "orbito" ? "bg-pink-600/20 border-pink-500/80 text-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.3)]" : gameMode === "pente" ? "bg-teal-900/30 border-teal-500/80 text-teal-400 shadow-[0_0_25px_rgba(20,184,166,0.3)]" : gameMode === "chain_triangle" ? "bg-yellow-600/20 border-yellow-500/80 text-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.3)]" : gameMode === "shobu" ? "bg-cyan-600/20 border-cyan-500/80 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)]" : gameMode === "yinsh" ? "bg-emerald-600/20 border-emerald-500/80 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]" : gameMode === "onitama" ? "bg-red-900/30 border-red-500/80 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.3)]" : "bg-blue-600/10 border-blue-500/60 shadow-[0_0_25px_rgba(59,130,246,0.3)]"}`}
                    >
                      {/* Inner glow */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-tr opacity-30 ${gameMode === "stratego" ? "from-amber-500 to-transparent" : gameMode === "corsa" ? "from-orange-500 to-transparent" : gameMode === "amazons" ? "from-purple-500 to-transparent" : gameMode === "domineering" ? "from-rose-500 to-transparent" : gameMode === "abalone" ? "from-slate-400 to-transparent" : gameMode === "hex" ? "from-fuchsia-500 to-transparent" : gameMode === "orbito" ? "from-pink-500 to-transparent" : gameMode === "pente" ? "from-teal-500 to-transparent" : gameMode === "chain_triangle" ? "from-yellow-500 to-transparent" : gameMode === "shobu" ? "from-cyan-500 to-transparent" : gameMode === "yinsh" ? "from-emerald-500 to-transparent" : gameMode === "onitama" ? "from-red-500 to-transparent" : "from-blue-500 to-transparent"}`}
                      ></div>

                      <div className="relative z-10 flex items-center justify-center">
                        {gameMode === "stratego" ? (
                          "🚩"
                        ) : gameMode === "corsa" ? (
                          "🏁"
                        ) : gameMode === "amazons" ? (
                          "🏹"
                        ) : gameMode === "domineering" ? (
                          "⚔️"
                        ) : gameMode === "abalone" ? (
                          "🎱"
                        ) : gameMode === "hex" ? (
                          "⬡"
                        ) : gameMode === "orbito" ? (
                          "🪐"
                        ) : gameMode === "pente" ? (
                          "⭐"
                        ) : gameMode === "chain_triangle" ? (
                          "🔺"
                        ) : gameMode === "shobu" ? (
                          "🌊"
                        ) : gameMode === "dominio" ? (
                          <div className="scale-[0.85] sm:scale-[1.1] my-auto ml-1 drop-shadow-xl animate-pulse">
                            <Logo size={46} />
                          </div>
                        ) : (
                          "🟦"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full flex-1 min-h-0 flex flex-col transition-all duration-300">
                <div className="w-full grid grid-cols-2 gap-2 mb-2 sm:mb-3 px-2 shrink-0">
                <div className="w-full py-1.5 sm:py-2 bg-slate-900/50 rounded-xl sm:rounded-[1.25rem] border border-blue-500/20 flex flex-col items-center justify-center">
                  <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 text-center">
                    {language === "it" ? "SCORE GLOBALE" : "GLOBAL SCORE"}
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white">
                    {(() => {
                      if (cloudScore !== null) return Number(cloudScore.toFixed(1));
                      const computedSpent = calculatePointsSpent(stats.unlockedModes || [], userName, userLocation, stats.freeUnlockedModes || []);
                      return Number(
                        Math.max(
                          0,
                          (stats.totalAbaloneScore || 0) +
                          (stats.totalHexScore || 0) +
                          (stats.totalChainTriangleScore || 0) +
                          (stats.totalFugaScore || 0) +
                          (stats.totalAmazonsScore || 0) +
                          (stats.totalDomineeringScore || 0) +
                          (stats.totalScore || 0) +
                          (stats.totalOrbitoScore || 0) +
                          (stats.totalPenteScore || 0) +
                          (stats.totalShobuScore || 0) +
                          (stats.totalYinshScore || 0) +
                          (stats.totalOnitamaScore || 0) +
                          (stats.totalBadukScore || 0) +
                          (stats.totalStrategoScore || 0) - computedSpent
                        ).toFixed(1)
                      );
                    })()}
                  </span>
                </div>
                <button
                  onClick={() => setIsLeaderboardOpen(true)}
                  className="w-full py-1.5 sm:py-2 bg-slate-900/50 rounded-xl sm:rounded-[1.25rem] border border-amber-500/20 flex flex-col items-center justify-center hover:bg-slate-800 transition-colors active:scale-95"
                >
                  <span className="text-[9px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">
                    RANK & STATS
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white">🏆</span>
                </button>
              </div>

              <div className="w-full flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 sm:space-y-3 bg-slate-900/50 p-3 sm:p-4 rounded-2xl sm:rounded-[1.5rem] border border-white/10 shadow-lg">
                {gameMode === "stratego" ? (
                  <>
                    {/* 1. Difficoltà */}
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                        {t.difficulty}
                      </label>
                      <div className="flex gap-1 sm:gap-2">
                        {[
                          { id: "easy", it: "Facile", en: "Easy", color: "bg-emerald-600 text-white" },
                          { id: "medium", it: "Normale", en: "Normal", color: "bg-blue-600 text-white" },
                          { id: "hard", it: "Difficile", en: "Hard", color: "bg-amber-600 text-white" },
                        ].map((d) => (
                          <button
                            key={d.id}
                            onClick={() => setStrategoDifficulty(d.id as StrategoDifficulty)}
                            className={`flex-1 py-1.5 px-1 sm:px-2 rounded-xl font-bold transition-all text-xs active:scale-95 ${
                              strategoDifficulty === d.id
                                ? `${d.color} shadow-lg ring-1 ring-white/40`
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}
                          >
                            {language === "it" ? d.it : d.en}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Chi muove per primo */}
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                        {(t as any).startingPlayer || (language === "it" ? "Chi muove per primo?" : "Who moves first?")}
                      </label>
                      <div className="flex gap-2">
                        {[
                          { id: "human", it: (t as any).youStart || "Tu (Rosso)", en: "You (Red)", icon: "🔴", color: "bg-red-600 text-white" },
                          { id: "ai", it: (t as any).aiStarts || "IA (Blu)", en: "AI (Blue)", icon: "🔵", color: "bg-blue-600 text-white" },
                          { id: "random", it: (t as any).randomStart || "Casuale", en: "Random", icon: "🎲", color: "bg-purple-600 text-white" },
                        ].map((starter) => (
                          <button
                            key={starter.id}
                            onClick={() => setStrategoStarter(starter.id as any)}
                            className={`flex-1 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1 active:scale-95 ${
                              strategoStarter === starter.id
                                ? `${starter.color} shadow-lg ring-1 ring-white/40`
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}
                          >
                            <span className="text-xs">{starter.icon}</span>
                            <span className="truncate">{language === "it" ? starter.it : starter.en}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                {(gameMode === "dominio" || gameMode === "corsa" || gameMode === "chain_triangle") && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                      {t.players}
                    </label>
                    <div className="flex gap-2">
                      {[2, 3, 4].map((n) => {
                        const isDisabled = gameMode === "corsa" && n === 3;
                        return (
                          <button
                            key={n}
                            disabled={isDisabled}
                            onClick={() => setPlayerCount(n as any)}
                            className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${playerCount === n ? "bg-blue-600 shadow-lg" : isDisabled ? "bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-50" : "bg-slate-800 hover:bg-slate-700"}`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 relative">
                  <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                    {t.difficulty}
                  </label>
                  <div className="flex gap-2">
                    {((gameMode === "baduk" ? ["normale", "difficile", "estrema", "maestro"] : ["normale", "difficile", "estrema"]) as Difficulty[]).map(
                      (d) => (
                        <button
                          key={d}
                          onClick={() => handleDifficultyClick(d)}
                          className={`flex-1 py-1.5 min-w-[65px] rounded-xl font-bold capitalize transition-all text-xs ${difficulty === d ? "bg-emerald-600 shadow-lg text-white" : "bg-slate-800 text-slate-300"}`}
                        >
                          {d === "normale"
                            ? t.normal
                            : d === "difficile"
                              ? t.hard
                              : d === "estrema"
                                ? (t as any).extreme
                                : "Maestro"}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {((isStartingPreferenceEnabled && gameMode === "dominio") || gameMode === "baduk") && (
                  <div className="space-y-1.5 relative">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                      {(t as any).startingPlayer || "Chi inizia?"}
                    </label>
                    <div className="flex gap-2">
                      {(
                        ["human", "ai", "random"] as StartingPlayerPreference[]
                      ).map((pref) => (
                        <button
                          key={pref}
                          onClick={() => setStartingPreference(pref)}
                          className={`flex-1 py-2.5 rounded-xl font-bold capitalize transition-all ${startingPreference === pref ? "bg-purple-600 shadow-lg" : "bg-slate-800"}`}
                        >
                          {pref === "human"
                            ? (t as any).youStart || "Tu"
                            : pref === "ai"
                              ? (t as any).aiStarts || "AI"
                              : (t as any).randomStart || "Casuale"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                </>
              )}
            </div>

              {difficultyToast && (
                <div className="fixed bottom-[110px] left-1/2 -translate-x-1/2 w-max max-w-[280px] bg-slate-800 text-amber-400 text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl shadow-2xl border border-amber-500/30 animate-in fade-in slide-in-from-bottom-2 z-[9999] text-center pointer-events-none">
                  {difficultyToast}
                </div>
              )}

              {aiPassToast && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max max-w-[300px] bg-slate-900/90 backdrop-blur-md text-cyan-300 text-sm md:text-base font-black px-6 py-4 rounded-3xl shadow-[0_0_40px_rgba(34,211,238,0.3)] border-2 border-cyan-500/50 animate-in fade-in zoom-in-75 z-[99999] text-center pointer-events-none">
                  <div className="text-2xl mb-1 text-cyan-400 opacity-90 drop-shadow-md">🤖</div>
                  <div className="uppercase tracking-widest">{aiPassToast}</div>
                </div>
              )}

              <div className="w-full shrink-0 px-2 pt-2 pb-[max(1.75rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))]">
                {gameMode === "stratego" && typeof window !== "undefined" && localStorage.getItem("wallgo_saved_game_stratego") && (
                  <button
                    onClick={() => loadSavedGame("stratego")}
                    className="w-full mb-2.5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm text-white uppercase tracking-wider shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all border border-blue-400/30"
                  >
                    <span>▶️</span>
                    <span>{language === "it" ? "Riprendi Partita Salvata" : "Resume Saved Match"}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (gameMode === "stratego") {
                      setGameState((prev) => ({
                        ...prev,
                        status: "playing",
                      }));
                      SoundManager.startBackgroundMusic(musicVolume);
                      enterFullScreen();
                      hideMobileAddressBar();
                      return;
                    }
                    
                    const isCorsa = gameMode === "corsa";
                    const isAmazons = gameMode === "amazons";

                    let effectiveAbaloneTheme = boardTheme;
                    if (gameMode === "abalone" && isRandomAbaloneTheme) {
                      const themes: BoardTheme[] = [
                        "abalone",
                        "abalone-daisy",
                        "abalone-dutch",
                        "abalone-domination",
                        "abalone-infiltration",
                        "abalone-wall",
                      ];
                      effectiveAbaloneTheme =
                        themes[Math.floor(Math.random() * themes.length)];
                      setBoardTheme(effectiveAbaloneTheme);
                      localStorage.setItem(
                        "wallgo_theme",
                        effectiveAbaloneTheme,
                      );
                    }

                    let starterIndex = 0;
                    if (isAmazons || gameMode === "hex") {
                      starterIndex = 1;
                    } else if (gameMode === "pente") {
                      if (difficulty === "normale" || difficulty === "difficile") {
                        starterIndex = 0;
                      } else {
                        starterIndex = 1;
                      }
                    } else if (!isCorsa && startingPreference === "ai") {
                      starterIndex = 1;
                    } else if (!isCorsa && startingPreference === "random") {
                      starterIndex = Math.floor(Math.random() * playerCount);
                    }

                    const startingPositions: Record<number, Point[]> = {};

                    if (isCorsa) {
                      // Initialize default Quoridor positions on 9x9 board
                      startingPositions[1] = [{ r: 8, c: 4 }]; // Bottom (Player 1)
                      startingPositions[2] = [{ r: 0, c: 4 }]; // Top (Player 2)
                      startingPositions[3] = [{ r: 4, c: 0 }]; // Left (Player 3)
                      startingPositions[4] = [{ r: 4, c: 8 }]; // Right (Player 4)
                    } else if (gameMode === "abalone") {
                      if (effectiveAbaloneTheme === "abalone-daisy") {
                        startingPositions[1] = [
                          // Player 1 (White)
                          { r: 0, c: 0 },
                          { r: 0, c: 1 },
                          { r: 1, c: 0 },
                          { r: 1, c: 1 },
                          { r: 1, c: 2 },
                          { r: 2, c: 1 },
                          { r: 2, c: 2 },
                          { r: 8, c: 3 },
                          { r: 8, c: 4 },
                          { r: 7, c: 3 },
                          { r: 7, c: 4 },
                          { r: 7, c: 5 },
                          { r: 6, c: 4 },
                          { r: 6, c: 5 },
                        ];
                        startingPositions[2] = [
                          // Player 2 (Black)
                          { r: 0, c: 3 },
                          { r: 0, c: 4 },
                          { r: 1, c: 3 },
                          { r: 1, c: 4 },
                          { r: 1, c: 5 },
                          { r: 2, c: 4 },
                          { r: 2, c: 5 },
                          { r: 8, c: 0 },
                          { r: 8, c: 1 },
                          { r: 7, c: 0 },
                          { r: 7, c: 1 },
                          { r: 7, c: 2 },
                          { r: 6, c: 1 },
                          { r: 6, c: 2 },
                        ];
                      } else if (effectiveAbaloneTheme === "abalone-dutch") {
                        startingPositions[1] = [
                          { r: 8, c: 0 },
                          { r: 8, c: 1 },
                          { r: 7, c: 0 },
                          { r: 7, c: 2 },
                          { r: 6, c: 1 },
                          { r: 6, c: 2 }, // Top-Left Ring
                          { r: 1, c: 1 }, // Bottom-Left Center
                          { r: 2, c: 4 },
                          { r: 2, c: 5 },
                          { r: 1, c: 3 },
                          { r: 1, c: 5 },
                          { r: 0, c: 3 },
                          { r: 0, c: 4 }, // Bottom-Right Ring
                          { r: 7, c: 4 }, // Top-Right Center
                        ];
                        startingPositions[2] = [
                          { r: 7, c: 1 }, // Top-Left Center
                          { r: 8, c: 3 },
                          { r: 8, c: 4 },
                          { r: 7, c: 3 },
                          { r: 7, c: 5 },
                          { r: 6, c: 4 },
                          { r: 6, c: 5 }, // Top-Right Ring
                          { r: 2, c: 1 },
                          { r: 2, c: 2 },
                          { r: 1, c: 0 },
                          { r: 1, c: 2 },
                          { r: 0, c: 0 },
                          { r: 0, c: 1 }, // Bottom-Left Ring
                          { r: 1, c: 4 }, // Bottom-Right Center
                        ];
                      } else if (
                        effectiveAbaloneTheme === "abalone-domination"
                      ) {
                        startingPositions[1] = [
                          { r: 1, c: 0 },
                          { r: 2, c: 0 },
                          { r: 2, c: 1 },
                          { r: 3, c: 0 },
                          { r: 3, c: 1 },
                          { r: 3, c: 2 },
                          { r: 3, c: 3 },
                          { r: 5, c: 4 },
                          { r: 5, c: 5 },
                          { r: 5, c: 6 },
                          { r: 5, c: 7 },
                          { r: 6, c: 5 },
                          { r: 6, c: 6 },
                          { r: 7, c: 5 },
                        ];
                        startingPositions[2] = [
                          { r: 1, c: 4 },
                          { r: 2, c: 4 },
                          { r: 2, c: 5 },
                          { r: 3, c: 5 },
                          { r: 3, c: 6 },
                          { r: 3, c: 7 },
                          { r: 4, c: 5 },
                          { r: 4, c: 3 },
                          { r: 5, c: 0 },
                          { r: 5, c: 1 },
                          { r: 5, c: 2 },
                          { r: 6, c: 1 },
                          { r: 6, c: 2 },
                          { r: 7, c: 1 },
                        ];
                      } else if (
                        effectiveAbaloneTheme === "abalone-infiltration"
                      ) {
                        startingPositions[1] = [
                          { r: 0, c: 2 },
                          { r: 2, c: 2 },
                          { r: 2, c: 4 },
                          { r: 5, c: 2 },
                          { r: 5, c: 5 },
                          { r: 6, c: 1 },
                          { r: 6, c: 3 },
                          { r: 6, c: 5 },
                          { r: 7, c: 1 },
                          { r: 7, c: 2 },
                          { r: 7, c: 3 },
                          { r: 7, c: 4 },
                          { r: 8, c: 1 },
                          { r: 8, c: 3 },
                        ];
                        startingPositions[2] = [
                          { r: 0, c: 1 },
                          { r: 0, c: 3 },
                          { r: 1, c: 1 },
                          { r: 1, c: 2 },
                          { r: 1, c: 3 },
                          { r: 1, c: 4 },
                          { r: 2, c: 1 },
                          { r: 2, c: 3 },
                          { r: 2, c: 5 },
                          { r: 3, c: 2 },
                          { r: 3, c: 5 },
                          { r: 6, c: 2 },
                          { r: 6, c: 4 },
                          { r: 8, c: 2 },
                        ];
                      } else if (effectiveAbaloneTheme === "abalone-wall") {
                        startingPositions[1] = [
                          { r: 0, c: 2 },
                          { r: 2, c: 1 },
                          { r: 2, c: 2 },
                          { r: 2, c: 3 },
                          { r: 2, c: 4 },
                          { r: 2, c: 5 },
                          { r: 3, c: 0 },
                          { r: 3, c: 1 },
                          { r: 3, c: 2 },
                          { r: 3, c: 3 },
                          { r: 3, c: 4 },
                          { r: 3, c: 5 },
                          { r: 3, c: 6 },
                          { r: 3, c: 7 },
                        ];
                        startingPositions[2] = [
                          { r: 5, c: 0 },
                          { r: 5, c: 1 },
                          { r: 5, c: 2 },
                          { r: 5, c: 3 },
                          { r: 5, c: 4 },
                          { r: 5, c: 5 },
                          { r: 5, c: 6 },
                          { r: 5, c: 7 },
                          { r: 6, c: 1 },
                          { r: 6, c: 2 },
                          { r: 6, c: 3 },
                          { r: 6, c: 4 },
                          { r: 6, c: 5 },
                          { r: 8, c: 2 },
                        ];
                      } else {
                        startingPositions[1] = [
                          { r: 8, c: 0 },
                          { r: 8, c: 1 },
                          { r: 8, c: 2 },
                          { r: 8, c: 3 },
                          { r: 8, c: 4 }, // row 8
                          { r: 7, c: 0 },
                          { r: 7, c: 1 },
                          { r: 7, c: 2 },
                          { r: 7, c: 3 },
                          { r: 7, c: 4 },
                          { r: 7, c: 5 }, // row 7
                          { r: 6, c: 2 },
                          { r: 6, c: 3 },
                          { r: 6, c: 4 }, // row 6 middle
                        ];
                        startingPositions[2] = [
                          { r: 0, c: 0 },
                          { r: 0, c: 1 },
                          { r: 0, c: 2 },
                          { r: 0, c: 3 },
                          { r: 0, c: 4 }, // row 0
                          { r: 1, c: 0 },
                          { r: 1, c: 1 },
                          { r: 1, c: 2 },
                          { r: 1, c: 3 },
                          { r: 1, c: 4 },
                          { r: 1, c: 5 }, // row 1
                          { r: 2, c: 2 },
                          { r: 2, c: 3 },
                          { r: 2, c: 4 }, // row 2 middle
                        ];
                      }
                    } else if (gameMode === "shobu") {
                      startingPositions[1] = [
                        { r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 }, // Board 1 (top-left)
                        { r: 3, c: 5 }, { r: 3, c: 6 }, { r: 3, c: 7 }, { r: 3, c: 8 }, // Board 2 (top-right)
                        { r: 8, c: 0 }, { r: 8, c: 1 }, { r: 8, c: 2 }, { r: 8, c: 3 }, // Board 3 (bot-left)
                        { r: 8, c: 5 }, { r: 8, c: 6 }, { r: 8, c: 7 }, { r: 8, c: 8 }, // Board 4 (bot-right)
                      ];
                      startingPositions[2] = [
                        { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, // Board 1
                        { r: 0, c: 5 }, { r: 0, c: 6 }, { r: 0, c: 7 }, { r: 0, c: 8 }, // Board 2
                        { r: 5, c: 0 }, { r: 5, c: 1 }, { r: 5, c: 2 }, { r: 5, c: 3 }, // Board 3
                        { r: 5, c: 5 }, { r: 5, c: 6 }, { r: 5, c: 7 }, { r: 5, c: 8 }, // Board 4
                      ];
                    } else if (gameMode === "onitama") {
                      startingPositions[1] = [
                        { r: 4, c: 2 }, // Master
                        { r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 3 }, { r: 4, c: 4 }, // Students
                      ];
                      startingPositions[2] = [
                        { r: 0, c: 2 }, // Master
                        { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 3 }, { r: 0, c: 4 }, // Students
                      ];
                    }

                    const players: Player[] = Array.from({
                      length: playerCount,
                    }).map((_, i) => ({
                      id: (i + 1) as PlayerId,
                      name:
                        i === 0
                          ? userName
                          : (t as any)[
                              i === 1
                                ? "rubyAI"
                                : i === 2
                                  ? "emeraldAI"
                                  : "amberAI"
                            ],
                      positions:
                        isCorsa ||
                        isAmazons ||
                        gameMode === "abalone" ||
                        gameMode === "orbito" ||
                        gameMode === "shobu" ||
                        gameMode === "onitama"
                          ? (startingPositions[i + 1] || []).map((p) => ({
                              ...p,
                              id: `piece-${i + 1}-${Math.random().toString(36).substr(2, 9)}`,
                            }))
                          : [],
                      color: PLAYER_COLORS[((i + (playerCount - starterIndex)) % playerCount + 1) as PlayerId],
                      isAI: i !== 0,
                      score: gameMode === "baduk" && i !== starterIndex ? 7.5 : 0,
                      isEnclosed: false,
                      hasWallbreaker:
                        !isCorsa &&
                        !isAmazons &&
                        gameMode !== "abalone" &&
                        gameMode !== "orbito" &&
                        gameMode !== "shobu" &&
                        gameMode !== "hex" &&
                        gameMode !== "pente" &&
                        gameMode !== "domineering" &&
                        gameMode !== "chain_triangle" &&
                        playerCount > 2,
                      isTrapped: false,
                      wallsLeft: isCorsa
                        ? playerCount === 2
                          ? 10
                          : 5
                        : undefined,
                    }));

                    setIsResumedGame(false);
                    setGameState({
                      gameMode,
                      corsaAction: "move",
                      players,
                      walls: [],
                      currentPlayerIndex: starterIndex,
                      startingPlayerIndex: starterIndex,
                      turnPhase:
                        isCorsa ||
                        (isAmazons && startingPositions[1] && startingPositions[1].length > 0) ||
                        gameMode === "abalone" ||
                        gameMode === "orbito" ||
                        gameMode === "shobu" ||
                        gameMode === "chain_triangle" ||
                        gameMode === "yinsh" ||
                        gameMode === "onitama"
                          ? "moving"
                          : "setup",
                      yinshState: gameMode === "yinsh" ? createInitialYinshState() : undefined,
                      onitamaState: gameMode === "onitama" ? createInitialOnitamaState(starterIndex + 1) : undefined,
                      chainTriangleState: gameMode === "chain_triangle" ? {
                        rubberBands: [],
                        triangles: generateAllTriangles(generateTriggleBoard()),
                        selectedPeg: null
                      } : undefined,
                      orbitoPhase: gameMode === "orbito" ? "place" : undefined,
                      setupStep: 0,
                      selectedPieceIndex: null,
                      moveBackupPos: null,
                      winner: null,
                      status: "playing",
                      history: [],
                      territoryMap: {},
                      difficulty,
                      usedWallbreakerThisTurn: false,
                      consecutivePasses: 0,
                      boardTheme: isCorsa
                        ? "corsa"
                        : gameMode === "abalone"
                          ? effectiveAbaloneTheme.startsWith("abalone")
                            ? effectiveAbaloneTheme
                            : "abalone"
                          : gameMode === "domineering"
                            ? "domineering"
                            : gameMode === "hex"
                              ? "hex"
                              : gameMode === "orbito"
                                ? "orbito"
                                : gameMode === "pente"
                                  ? "pente"
                                  : gameMode === "shobu"
                                    ? boardTheme.startsWith("shobu") ? boardTheme : "shobu"
                                    : boardTheme,
                      lastPlacedPiece: null,
                      lastMoveByPlayer: {},
                      turnCount: 0,
                    });
                    setPenteDyingPieces([]);
                    enterFullScreen();
                    hideMobileAddressBar();
                  }}
                  className="w-full py-3.5 sm:py-4 rounded-2xl font-black text-lg sm:text-xl shadow-2xl active:scale-95 transition-transform bg-gradient-to-r from-blue-600 to-emerald-600 text-white"
                >
                  {t.startBattle}
                </button>
              </div>
            </div>
            </div>
          )}

          {unlockModalMode && (() => {
            const infoMap: Record<string, { i: any; n: string }> = {
              'dominio': { i: <Logo size={42} />, n: "Wall Go AI" },
              'corsa': { i: "🏁", n: "Quoridor" },
              'amazons': { i: "🏹", n: "Amazons" },
              'domineering': { i: "⚔️", n: "Domineering" },
              'abalone': { i: "🎱", n: "Abalone" },
              'hex': { i: "⬡", n: "Hex" },
              'orbito': { i: "🪐", n: "Orbito" },
              'pente': { i: "⭐", n: "Pente" },
              'chain_triangle': { i: "🔺", n: "Chain Triangle" },
              'shobu': { i: "🪨", n: "Shobu" },
              'yinsh': { i: "💍", n: "Yinsh" },
              'onitama': { i: "🏯", n: "Onitama" },
              'baduk': { i: "⚫", n: "Baduk / Go" }
            };
            const info = infoMap[unlockModalMode] || { i: "❓", n: "Unknown" };

            const cost = unlockModalMode === "shobu" && isAdmin ? 0 : 50;
            const pointsSpent = calculatePointsSpent(stats.unlockedModes, userName, userLocation, stats.freeUnlockedModes);
            const globalScore = Number(
              Math.max(
                0,
                  (stats.totalAbaloneScore || 0) +
                  (stats.totalHexScore || 0) +
                  (stats.totalChainTriangleScore || 0) +
                  (stats.totalFugaScore || 0) +
                  (stats.totalAmazonsScore || 0) +
                  (stats.totalDomineeringScore || 0) +
                  (stats.totalScore || 0) +
                  (stats.totalOrbitoScore || 0) +
                  (stats.totalPenteScore || 0) +
                  (stats.totalShobuScore || 0) +
                  (stats.totalYinshScore || 0) +
                  (stats.totalOnitamaScore || 0) +
                  (stats.totalBadukScore || 0) +
                  (stats.totalStrategoScore || 0) - pointsSpent
              ).toFixed(1)
            );
            const canUnlock = globalScore >= cost;

            return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
              <div className="w-full max-w-xs bg-slate-900 rounded-[2.5rem] border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 flex flex-col items-center text-center">
                  <div className="text-5xl mb-2 drop-shadow-xl h-16 flex items-center justify-center">
                    {info.i}
                  </div>
                  <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">{info.n}</h2>
                  
                  <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-xl border border-blue-500/20">
                    🔒
                  </div>

                  <h3 className="text-lg font-black italic text-white mb-2 uppercase tracking-tight">
                    {language === "it" ? "SBLOCCA GIOCO" : "UNLOCK GAME"}
                  </h3>

                  {canUnlock ? (
                    <p className="text-slate-400 text-xs font-medium mb-6 px-2">
                      {language === "it"
                        ? `Vuoi sbloccare questo gioco per ${cost} punti?`
                        : `Do you want to unlock this game for ${cost} points?`}
                    </p>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6 w-full">
                      <p className="text-red-400 text-xs font-medium mb-1">
                        {language === "it" ? "Punti insufficienti" : "Insufficient points"}
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        {language === "it"
                          ? `Ti servono ${cost} punti, ma ne hai solo ${globalScore}. Gioca più partite per guadagnarli!`
                          : `You need ${cost} points, but you only have ${globalScore}. Play more games to earn them!`}
                      </p>
                    </div>
                  )}

                  <div className="w-full space-y-2">
                    <button
                      onClick={() => handleUnlockMode(unlockModalMode)}
                      disabled={!canUnlock}
                      className={`w-full py-3 rounded-2xl font-black text-sm shadow-lg transition-all ${
                        canUnlock 
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-95" 
                          : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-80"
                      }`}
                    >
                      {language === "it" 
                        ? (canUnlock ? `SBLOCCA (${cost}PT)` : "PUNTI INSUFFICIENTI") 
                        : (canUnlock ? `UNLOCK (${cost}PT)` : "NOT ENOUGH POINTS")}
                    </button>
                    <button
                      onClick={() => {
                        handleGameModeChange(unlockModalMode);
                        if (unlockModalMode === "orbito") setIsOrbitoRulesOpen(true);
                        else if (unlockModalMode === "pente") setIsPenteRulesOpen(true);
                        else if (unlockModalMode === "shobu") setIsShobuRulesOpen(true);
                        else if (unlockModalMode === "yinsh") setIsYinshRulesOpen(true);
                        else if (unlockModalMode === "onitama") setIsOnitamaRulesOpen(true);
                        else if (unlockModalMode === "baduk") setIsBadukRulesOpen(true);
                        else setIsRulesOpen(true);
                      }}
                      className="w-full py-3 bg-slate-800 rounded-2xl font-black text-sm text-blue-400 border border-blue-500/30 hover:bg-slate-700 transition-colors active:scale-95"
                    >
                      {language === "it" ? "COME SI GIOCA?" : "HOW TO PLAY?"}
                    </button>

                    <button
                      onClick={() => {
                        setHistoryMode(unlockModalMode);
                        setIsHistoryOpen(true);
                        setUnlockModalMode(null);
                      }}
                      className="w-full py-3 bg-slate-800 rounded-2xl font-black text-sm text-orange-400 border border-orange-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {language === "it" ? "STORIA / CURIOSITÀ" : "HISTORY / TRIVIA"}
                    </button>

                    <a 
                      href={`https://www.youtube.com/results?search_query=how+to+play+${
                        unlockModalMode === "corsa" ? "quoridor" :
                        unlockModalMode === "amazons" ? "game+of+the+amazons" :
                        unlockModalMode === "chain_triangle" ? "chain+triangle" :
                        unlockModalMode
                      }+board+game`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-slate-800 rounded-2xl font-black text-sm text-red-400 border border-red-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      {t.searchTutorialVideo}
                    </a>

                    <button
                      onClick={() => setUnlockModalMode(null)}
                      className="w-full py-3 bg-slate-800 rounded-2xl font-black text-sm text-slate-400 hover:bg-slate-700 transition-colors active:scale-95"
                    >
                      {language === "it" ? "ANNULLA" : "CANCEL"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      ) : (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full space-y-1 pt-1 relative min-h-0 overflow-hidden">
          <header className="flex items-center justify-between px-2 py-0.5 flex-shrink-0">
            <div className="flex items-center gap-3">
              {gameMode === "corsa" ? (
                <span className="text-2xl">🧱</span>
              ) : gameMode === "amazons" ? (
                <span className="text-2xl">🏹</span>
              ) : gameMode === "domineering" ? (
                <span className="text-2xl">⚔️</span>
              ) : gameMode === "abalone" ? (
                <span className="text-2xl">🟤</span>
              ) : gameMode === "hex" ? (
                <div className="text-[24px] leading-[24px] mr-1 text-purple-400">
                  ⬡
                </div>
              ) : gameMode === "orbito" ? (
                <span className="text-2xl">🪐</span>
              ) : gameMode === "pente" ? (
                <span className="text-2xl">⭐</span>
              ) : gameMode === "chain_triangle" ? (
                <span className="text-2xl">🔺</span>
              ) : gameMode === "shobu" ? (
                <span className="text-2xl">🪨</span>
              ) : gameMode === "yinsh" ? (
                <span className="text-2xl">💍</span>
              ) : gameMode === "onitama" ? (
                <span className="text-2xl">🏯</span>
              ) : gameMode === "baduk" ? (
                <span className="text-2xl">⚫</span>
              ) : (
                <Logo size={24} />
              )}
              <div>
                <h2 className={`text-lg font-black italic leading-none ${gameMode === "corsa" ? "text-orange-400" : gameMode === "amazons" ? "text-purple-400" : gameMode === "domineering" ? "text-rose-400" : gameMode === "abalone" ? "text-slate-300" : gameMode === "hex" ? "text-fuchsia-400" : gameMode === "orbito" ? "text-pink-400" : gameMode === "pente" ? "text-teal-400" : gameMode === "chain_triangle" ? "text-yellow-400" : gameMode === "shobu" ? "text-cyan-400" : gameMode === "yinsh" ? "text-emerald-400" : gameMode === "onitama" ? "text-red-400" : gameMode === "baduk" ? "text-zinc-300" : "text-blue-400"}`}>
                  {gameMode === "corsa"
                    ? "QUORIDOR"
                    : gameMode === "amazons"
                      ? "AMAZONS"
                      : gameMode === "domineering"
                        ? "DOMINEERING"
                        : gameMode === "abalone"
                          ? "ABALONE"
                          : gameMode === "hex"
                            ? "HEX"
                            : gameMode === "orbito"
                              ? "ORBITO"
                              : gameMode === "pente"
                                ? "PENTE"
                                : gameMode === "chain_triangle"
                                  ? "CHAIN TRIANGLE"
                                  : gameMode === "shobu"
                                    ? "SHOBU"
                                    : gameMode === "yinsh"
                                      ? "YINSH"
                                      : gameMode === "onitama"
                                        ? "ONITAMA"
                                        : gameMode === "baduk"
                                          ? "BADUK / GO"
                                          : "WALL GO AI"}
                </h2>
              </div>
            </div>
            {gameState.status !== "ended" && (
              <div className="flex gap-2">
                {!Capacitor.isNativePlatform() && (
                  <button
                    onClick={toggleFullScreen}
                    className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors border border-white/10 text-slate-300 hover:text-white"
                    title={isFullscreen ? (language === "it" ? "Riduci schermo" : "Exit full screen") : (language === "it" ? "Schermo intero" : "Full screen")}
                    aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4 text-blue-400" /> : <Maximize className="w-4 h-4 text-blue-400" />}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (gameMode === "orbito") setIsOrbitoRulesOpen(true);
                    else if (gameMode === "pente") setIsPenteRulesOpen(true);
                    else if (gameMode === "shobu") setIsShobuRulesOpen(true);
                    else if (gameMode === "yinsh") setIsYinshRulesOpen(true);
                    else if (gameMode === "onitama") setIsOnitamaRulesOpen(true);
                    else if (gameMode === "baduk") setIsBadukRulesOpen(true);
                    else setIsRulesOpen(true);
                  }}
                  className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors border border-white/10"
                  aria-label="Regole"
                >
                  ❓
                </button>
                {!onlineMatchSession && (
                  <button
                    onClick={saveGameAndExit}
                    className="px-3 h-10 bg-blue-600/80 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors border border-blue-400/30 text-xs font-bold uppercase"
                    aria-label="Salva e Esci"
                  >
                    💾 {language === "it" ? "Salva" : "Save"}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (onlineMatchSession) {
                      if ((gameState.gameMode || gameMode) === "baduk") {
                        setIsBadukOnlineExitModalOpen(true);
                      } else {
                        setIsOnlineExitConfirmOpen(true);
                      }
                    } else if (humanMovesInSession === 0) {
                      resetGameToMenu();
                    } else {
                      setIsSaveConfirmModalOpen(true);
                    }
                  }}
                  className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-red-900/50 transition-colors border border-white/10"
                  aria-label="Esci"
                >
                  ✕
                </button>
              </div>
            )}
          </header>

          {onlineMatchSession && (
            <div className="w-full mb-2 p-2 px-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between text-xs shadow-lg shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-bold text-white text-[11px] sm:text-xs truncate">
                  Online 1v1: <span className="text-blue-400">{onlineMatchSession.myPlayerIndex === 1 ? (userName || "Tu") : onlineMatchSession.opponentName}</span> vs <span className="text-red-400">{onlineMatchSession.myPlayerIndex === 2 ? (userName || "Tu") : onlineMatchSession.opponentName}</span>
                </span>
              </div>

            </div>
          )}

          {gameMode !== "onitama" && (
            <div
              className={`grid gap-2 flex-shrink-0 ${gameState.players.length === 2 ? "grid-cols-2" : gameState.players.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}
            >
              {gameState.players.map((p) => (
                <div
                  key={p.id}
                  className={`p-2 px-3 rounded-2xl border-2 transition-all ${p.id === currentPlayer?.id ? "bg-slate-900 border-blue-500 shadow-xl" : "bg-slate-900/40 border-transparent opacity-60"}`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-[10px] font-black uppercase truncate">
                      {p.name}
                    </span>
                  </div>
                  {gameMode === "orbito" ? (
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-black leading-none">
                        {8 - p.positions.length}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">
                        {language === "it" ? "da posizionare" : "to place"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-black leading-none">
                        {p.score}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">
                        {t.points}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-center relative mt-2 md:mt-0 min-h-0 w-full overflow-hidden">
            <div
              className={`w-full h-full flex items-center justify-center p-1 ${!isMyTurnOnline ? "pointer-events-none select-none opacity-90" : ""}`}
              style={{ containerType: "size" }}
            >
              {gameMode === "chain_triangle" ? (
                <ChainTriangleBoard chainState={gameState.chainTriangleState} onPegClick={handleChainTrianglePegClick} />
              ) : gameMode === "yinsh" && gameState.yinshState ? (
                <YinshBoard gameState={gameState.yinshState} onPointClick={handleYinshPointClick} currentPlayerId={currentPlayer.id} />
              ) : gameMode === "onitama" && gameState.onitamaState ? (
                <OnitamaBoard gameState={gameState} onMove={handleMove} viewerId={currentPlayer.id} theme={gameState.boardTheme} language={language} />
              ) : gameMode === "orbito" ? (
                <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-2xl border-2 border-slate-700 shadow-2xl p-3">
                  <div className="relative w-full h-full">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const r = Math.floor(i / 4);
                      const c = i % 4;
                      let direction = "";
                      if (i === 1 || i === 2 || i === 3 || i === 6)
                        direction = "left";
                      else if (i === 0 || i === 4 || i === 8 || i === 5)
                        direction = "down";
                      else if (i === 12 || i === 13 || i === 14 || i === 9)
                        direction = "right";
                      else if (i === 7 || i === 11 || i === 15 || i === 10)
                        direction = "up";

                      let rotation = 0;
                      if (direction === "up") rotation = -90;
                      else if (direction === "down") rotation = 90;
                      else if (direction === "left") rotation = 180;
                      else if (direction === "right") rotation = 0;

                      // Trova se c'è una pedina
                      let piecePlayer: Player | undefined;
                      gameState.players.forEach((p) => {
                        if (
                          p.positions.find((pos) => pos.r === r && pos.c === c)
                        ) {
                          piecePlayer = p;
                        }
                      });

                      // Se stiamo shiftando un pezzo avversario, le caselle adiacenti libere sono evidenziate
                      let isPossibleShiftMove = false;
                      if (
                        gameState.orbitoPhase === "shift" &&
                        gameState.orbitoActionState?.playerId &&
                        gameState.orbitoActionState.pieceIdx !== undefined &&
                        !piecePlayer
                      ) {
                        const oppP = gameState.players.find(
                          (p) => p.id === gameState.orbitoActionState!.playerId,
                        );
                        if (
                          oppP &&
                          oppP.positions[gameState.orbitoActionState.pieceIdx]
                        ) {
                          const oppPos =
                            oppP.positions[
                              gameState.orbitoActionState.pieceIdx
                            ];
                          const dr = Math.abs(oppPos.r - r);
                          const dc = Math.abs(oppPos.c - c);
                          if (
                            (dr === 1 && dc === 0) ||
                            (dr === 0 && dc === 1)
                          ) {
                            isPossibleShiftMove = true;
                          }
                        }
                      }

                      const handleCellClick = () => {
                        if (!isUserTurn) return;
                        if (gameState.orbitoPhase === "shift") {
                          if (!piecePlayer && isPossibleShiftMove) {
                            // Move the opponent piece
                            setGameState((prev) => {
                              const px = prev.orbitoActionState?.pieceIdx;
                              const nPlayers = JSON.parse(
                                JSON.stringify(prev.players || []),
                              );
                              const oppPlayer = nPlayers.find(
                                (p: any) =>
                                  p.id === prev.orbitoActionState?.playerId,
                              );
                              if (
                                px !== undefined &&
                                oppPlayer &&
                                oppPlayer.positions[px]
                              ) {
                                oppPlayer.positions[px].r = r;
                                oppPlayer.positions[px].c = c;
                              }
                              if (sfxVolume > 0) SoundManager.playMovePiece();
                              return {
                                ...prev,
                                players: nPlayers,
                                orbitoPhase: "place",
                                orbitoActionState: undefined,
                              };
                            });
                          }
                        } else if (gameState.orbitoPhase === "place") {
                          if (!piecePlayer) {
                            const newPos = {
                              r,
                              c,
                              id: `piece-${Math.random().toString(36).substr(2, 9)}`,
                            };
                            setGameState((prev) => {
                              const nPlayers = prev.players.map((p, idx) =>
                                idx === prev.currentPlayerIndex
                                  ? {
                                      ...p,
                                      positions: [...p.positions, newPos],
                                    }
                                  : p,
                              );
                              if (sfxVolume > 0) SoundManager.playMovePiece();
                              return {
                                ...prev,
                                players: nPlayers,
                                orbitoPhase: "button",
                              };
                            });
                          }
                        }
                      };

                      return (
                        <div
                          key={i}
                          onClick={handleCellClick}
                          style={{
                            top: `calc(${r} * ((100% - 3 * 0.5rem) / 4) + ${r} * 0.5rem)`,
                            left: `calc(${c} * ((100% - 3 * 0.5rem) / 4) + ${c} * 0.5rem)`,
                            width: `calc((100% - 3 * 0.5rem) / 4)`,
                            height: `calc((100% - 3 * 0.5rem) / 4)`,
                          }}
                          className={`absolute rounded-full shadow-inner flex items-center justify-center bg-slate-800 border border-slate-700/50 shadow-black/50 ${!piecePlayer && (gameState.orbitoPhase === "place" || isPossibleShiftMove) ? "cursor-pointer hover:bg-slate-700" : ""}`}
                        >
                          <svg
                            style={{ transform: `rotate(${rotation}deg)` }}
                            className="w-[30px] h-[30px] text-slate-500 opacity-60 absolute pointer-events-none"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                          {isPossibleShiftMove && (
                            <div className="absolute w-3 h-3 rounded-full bg-amber-400 opacity-60 pointer-events-none animate-pulse z-10"></div>
                          )}
                        </div>
                      );
                    })}

                    {/* Render pieces independently on top for animations */}
                    {gameState.players.map((p) =>
                      p.positions.map((pos, pieceIdx) => {
                        const isSelectedOpponent =
                          gameState.orbitoPhase === "shift" &&
                          gameState.orbitoActionState?.playerId === p.id &&
                          gameState.orbitoActionState?.pieceIdx === pieceIdx;

                        const handlePieceClick = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (!isUserTurn) return;
                          if (
                            gameState.orbitoPhase === "shift" &&
                            p.id !== currentPlayer?.id
                          ) {
                            setGameState((prev) => ({
                              ...prev,
                              orbitoActionState: { playerId: p.id, pieceIdx },
                            }));
                          }
                        };

                        return (
                          <div
                            key={pos.id}
                            onClick={handlePieceClick}
                            className={`absolute rounded-full shadow-lg flex items-center justify-center border border-white/20 z-20 transition-all duration-1000 ease-in-out ${isSelectedOpponent ? "ring-4 ring-amber-400 scale-110" : ""} ${gameState.orbitoPhase === "shift" && p.id !== currentPlayer?.id ? "cursor-pointer hover:scale-105" : "pointer-events-none"}`}
                            style={{
                              backgroundColor: p.color,
                              top: `calc(${pos.r} * ((100% - 3 * 0.5rem) / 4) + ${pos.r} * 0.5rem + (((100% - 3 * 0.5rem) / 4) * 0.1))`,
                              left: `calc(${pos.c} * ((100% - 3 * 0.5rem) / 4) + ${pos.c} * 0.5rem + (((100% - 3 * 0.5rem) / 4) * 0.1))`,
                              width: `calc(((100% - 3 * 0.5rem) / 4) * 0.8)`,
                              height: `calc(((100% - 3 * 0.5rem) / 4) * 0.8)`,
                              opacity: 0.7,
                            }}
                          >
                            <div className="w-1/2 h-1/2 rounded-full bg-white/20 blur-[2px] -mt-2 -ml-2 pointer-events-none" />
                          </div>
                        );
                      }),
                    )}

                    {/* Inner square border */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52%] h-[52%] border-2 border-slate-700/50 rounded-[1.25rem] pointer-events-none shadow-lg z-10"></div>

                    {/* Center button */}
                    <div
                      onClick={() => {
                        if (gameState.orbitoPhase === "button" && isUserTurn) {
                          if (sfxVolume > 0) SoundManager.playPlaceWall();

                          const nPlayers = JSON.parse(
                            JSON.stringify(gameState.players || []),
                          );
                          const nWalls = gameState.walls;

                          nPlayers.forEach((p: Player) => {
                            p.positions.forEach((pos) => {
                              const r = pos.r;
                              const c = pos.c;
                              const i = r * 4 + c;
                              let nextI = i;
                              if (i === 0) nextI = 4;
                              else if (i === 4) nextI = 8;
                              else if (i === 8) nextI = 12;
                              else if (i === 12) nextI = 13;
                              else if (i === 13) nextI = 14;
                              else if (i === 14) nextI = 15;
                              else if (i === 15) nextI = 11;
                              else if (i === 11) nextI = 7;
                              else if (i === 7) nextI = 3;
                              else if (i === 3) nextI = 2;
                              else if (i === 2) nextI = 1;
                              else if (i === 1) nextI = 0;
                              else if (i === 5) nextI = 9;
                              else if (i === 9) nextI = 10;
                              else if (i === 10) nextI = 6;
                              else if (i === 6) nextI = 5;

                              pos.r = Math.floor(nextI / 4);
                              pos.c = nextI % 4;
                            });
                          });

                          setGameState((prev) => ({
                            ...prev,
                            players: nPlayers,
                            orbitoPhase: "animating" as any,
                          }));

                          setTimeout(() => {
                            advanceTurn(nWalls, nPlayers, false);
                          }, 1000);
                        }
                      }}
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border z-30 flex items-center justify-center transition-all duration-300 ${gameState.orbitoPhase === "button" ? "bg-emerald-600 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)] cursor-pointer hover:bg-emerald-500 active:scale-95 animate-pulse" : "bg-emerald-900/50 border-emerald-800 opacity-50"}`}
                    ></div>
                  </div>
                </div>
              ) : (
                <Board
                  players={gameState.players}
                  walls={gameState.walls}
                  currentPlayerIndex={gameState.currentPlayerIndex}
                  startingPlayerIndex={gameState.startingPlayerIndex}
                  turnPhase={gameState.turnPhase}
                  badukStoneColor={badukStoneColor}
                  onMove={handleMove}
                  onInvalidShobuClick={handleInvalidShobuClick}
                  onPlaceWall={handlePlaceWall}
                  onRevertMove={() => {
                    setGameState((prev) => {
                      if (!prev.moveBackupPos || prev.selectedPieceIndex === null) return prev;
                      const nPlayers = [...prev.players];
                      const cp = { ...nPlayers[prev.currentPlayerIndex] };
                      const nPos = [...cp.positions];
                      nPos[prev.selectedPieceIndex] = prev.moveBackupPos;
                      cp.positions = nPos;
                      nPlayers[prev.currentPlayerIndex] = cp;
                      return {
                        ...prev,
                        players: nPlayers,
                        turnPhase: "moving",
                        moveBackupPos: null,
                      };
                    });
                  }}
                  isAIThinking={isAIThinking}
                  onPlacePiece={(r, c) => {
                    if (gameState.winner || isAIThinking || (onlineMatchSession && gameState.currentPlayerIndex !== onlineMatchSession.myPlayerIndex - 1) || (gameState.gameMode === "baduk" && gameState.futureStates && gameState.futureStates.length > 0)) return;

                    if (
                      gameMode === "domineering" ||
                      gameMode === "hex" ||
                      gameMode === "pente" ||
                      gameMode === "baduk"
                    ) {
                      if (gameMode === "domineering") {
                        const isV = gameState.currentPlayerIndex === 0;
                        const r2 = isV ? r + 1 : r;
                        const c2 = isV ? c : c + 1;

                        if (r2 >= 8 || c2 >= 8) return; // Out of bounds

                        const isOccupied = gameState.players.some((p) =>
                          p.positions.some(
                            (pos) =>
                              (pos.r === r && pos.c === c) ||
                              (pos.r === r2 && pos.c === c2),
                          ),
                        );
                        if (isOccupied) return;

                        const newPos1 = {
                          r,
                          c,
                          id: `piece-${Math.random().toString(36).substr(2, 9)}`,
                        };
                        const newPos2 = {
                          r: r2,
                          c: c2,
                          id: `piece-${Math.random().toString(36).substr(2, 9)}`,
                        };

                        const nPlayers = gameState.players.map((p, idx) =>
                          idx === gameState.currentPlayerIndex
                            ? {
                                ...p,
                                positions: [...p.positions, newPos1, newPos2],
                              }
                            : p,
                        );
                        advanceTurn(gameState.walls, nPlayers, false);
                        return;
                      } else if (gameMode === "hex" || gameMode === "pente" || gameMode === "baduk") {
                        if (gameMode === "baduk") {
                           const res = performBadukMove(gameState.players, r, c, gameState.currentPlayerIndex, gameState.boardTheme === 'baduk-13' ? 13 : (gameState.boardTheme === 'baduk-19' ? 19 : 9), gameState.badukKoPoint);
                           if (!res.valid || !res.newPlayers) return; // invalid move
                           
                           if (sfxVolume > 0) SoundManager.playBadukStone();
                           const sz = gameState.boardTheme === 'baduk-13' ? 13 : (gameState.boardTheme === 'baduk-19' ? 19 : 9);
                           badukWorkerRef.current?.postMessage({ type: 'HUMAN_MOVE', move: r * sz + c });
                           
                           if (res.captured && res.captured.length > 0) {
                               safePlaySound(() => SoundManager.playBadukCapture());
                               setPenteDyingPieces((prev) => [...prev, ...res.captured!]);
                               // Update score
                               res.newPlayers[gameState.currentPlayerIndex].penteCaptures = (res.newPlayers[gameState.currentPlayerIndex].penteCaptures || 0) + res.captured.length;
                           }
                           
                           advanceTurn(gameState.walls, res.newPlayers, false, false, undefined, undefined, undefined, res.newKoPoint);
                           return;
                        }

                        const isOccupied = gameState.players.some((p) =>
                          p.positions.some((pos) => pos.r === r && pos.c === c),
                        );
                        if (isOccupied) return;

                        const newPos = {
                          r,
                          c,
                          id: `piece-${Math.random().toString(36).substr(2, 9)}`,
                        };
                        let nPlayers = gameState.players.map((p, idx) =>
                          idx === gameState.currentPlayerIndex
                            ? { ...p, positions: [...p.positions, newPos] }
                            : p,
                        );

                        if (gameMode === "pente") {
                          // Very simple capture check around the new piece
                          const directions = [
                            [-1, 0],
                            [1, 0],
                            [0, -1],
                            [0, 1], // Cardinal
                            [-1, -1],
                            [-1, 1],
                            [1, -1],
                            [1, 1], // Diagonal
                          ];
                          const opponentIndex =
                            gameState.currentPlayerIndex === 0 ? 1 : 0;

                          let newOpponentPositions = [
                            ...nPlayers[opponentIndex].positions,
                          ];
                          let capturedPiecesList: any[] = [];
                          let capturedCount = 0;

                          for (const [dr, dc] of directions) {
                            // Check if r+dr, c+dc and r+2dr, c+2dc are opponent pieces, and r+3dr, c+3dc is player piece
                            const r1 = r + dr,
                              c1 = c + dc;
                            const r2 = r + 2 * dr,
                              c2 = c + 2 * dc;
                            const r3 = r + 3 * dr,
                              c3 = c + 3 * dc;

                            const hasOpp1 = newOpponentPositions.find(
                              (p) => p.r === r1 && p.c === c1,
                            );
                            const hasOpp2 = newOpponentPositions.find(
                              (p) => p.r === r2 && p.c === c2,
                            );
                            const hasPl3 = nPlayers[
                              gameState.currentPlayerIndex
                            ].positions.some((p) => p.r === r3 && p.c === c3);

                            if (hasOpp1 && hasOpp2 && hasPl3) {
                              // Capture! Remove the two opponent pieces.
                              capturedPiecesList.push({ ...hasOpp1, color: nPlayers[opponentIndex].color, t: Date.now() });
                              capturedPiecesList.push({ ...hasOpp2, color: nPlayers[opponentIndex].color, t: Date.now() });
                              newOpponentPositions =
                                newOpponentPositions.filter(
                                  (p) =>
                                    !(
                                      (p.r === r1 && p.c === c1) ||
                                      (p.r === r2 && p.c === c2)
                                    ),
                                );
                              capturedCount += 2;
                            }
                          }
                          
                          if (capturedPiecesList.length > 0) {
                            setPenteDyingPieces((prev) => [...prev, ...capturedPiecesList]);
                          }

                          // We also need to update player's capture score if we want, but for now we just remove them.
                          nPlayers = nPlayers.map((p, idx) => {
                            if (idx === opponentIndex)
                              return { ...p, positions: newOpponentPositions };
                            // To keep score, we can inject a property into the player object or handle it outside.
                            // Let's add it to the state later, for now just remove pieces.
                            if (idx === gameState.currentPlayerIndex)
                              return {
                                ...p,
                                penteCaptures:
                                  (p.penteCaptures || 0) + capturedCount,
                              };
                            return p;
                          });
                        }

                        advanceTurn(
                          gameState.walls,
                          nPlayers,
                          false,
                          false,
                          undefined,
                          undefined,
                          undefined,
                          undefined,
                          false,
                          {
                            r,
                            c,
                            playerId: gameState.players[gameState.currentPlayerIndex].id,
                          }
                        );
                        return;
                      } else if (gameMode === "orbito") {
                        const isOccupied = gameState.players.some((p) =>
                          p.positions.some((pos) => pos.r === r && pos.c === c),
                        );
                        if (isOccupied) return;

                        const newPos = {
                          r,
                          c,
                          id: `piece-${Math.random().toString(36).substr(2, 9)}`,
                        };
                        const nPlayers = gameState.players.map((p, idx) =>
                          idx === gameState.currentPlayerIndex
                            ? { ...p, positions: [...p.positions, newPos] }
                            : p,
                        );

                        if (sfxVolume > 0) SoundManager.playMovePiece();
                        setGameState((prev) => ({
                          ...prev,
                          players: nPlayers,
                          orbitoPhase: "button",
                          selectedPieceIndex: null,
                        }));
                        return;
                      }
                    }

                    if (gameState.turnPhase !== "setup") return;
                    setGameState((prev) => {
                      if (
                        prev.players.some((p) =>
                          p.positions.some((pos) => pos.r === r && pos.c === c),
                        )
                      )
                        return prev;
                      const nPlayers = prev.players.map((p, idx) =>
                        idx === prev.currentPlayerIndex
                          ? {
                              ...p,
                              positions: [
                                ...p.positions,
                                {
                                  r,
                                  c,
                                  id: `piece-${Math.random().toString(36).substr(2, 9)}`,
                                },
                              ],
                            }
                          : p,
                      );
                      const done = nPlayers.every(
                        (x) =>
                          x.positions.length ===
                          (nPlayers.length === 2 ? 4 : 2),
                      );
                      if (done)
                        return {
                          ...prev,
                          players: nPlayers,
                          status: "playing",
                          turnPhase: "moving",
                          currentPlayerIndex: prev.startingPlayerIndex ?? 0,
                          consecutivePasses: 0,
                        };
                      return {
                        ...prev,
                        players: nPlayers,
                        turnPhase: "setup",
                        currentPlayerIndex:
                          (prev.currentPlayerIndex + 1) % nPlayers.length,
                      };
                    });
                  }}
                  onSelectOpponentPiece={(playerId, pieceIdx) =>
                    setGameState((prev) => {
                      if (onlineMatchSession && prev.currentPlayerIndex !== onlineMatchSession.myPlayerIndex - 1) {
                        return prev;
                      }
                      return {
                        ...prev,
                        orbitoActionState: { playerId, pieceIdx },
                      };
                    })
                  }
                  onShiftOpponentPiece={(playerId, pieceIdx, r, c) => {
                    setGameState((prev) => {
                      if (onlineMatchSession && prev.currentPlayerIndex !== onlineMatchSession.myPlayerIndex - 1) {
                        return prev;
                      }
                      const nPlayers = JSON.parse(JSON.stringify(prev.players || []));
                      const oppPlayer = nPlayers.find(
                        (p: any) => p.id === playerId,
                      );
                      if (oppPlayer && oppPlayer.positions[pieceIdx]) {
                        oppPlayer.positions[pieceIdx].r = r;
                        oppPlayer.positions[pieceIdx].c = c;
                      }
                      if (sfxVolume > 0) SoundManager.playMovePiece();
                      return {
                        ...prev,
                        players: nPlayers,
                        orbitoPhase: "place",
                        orbitoActionState: undefined,
                        selectedPieceIndex: null,
                      };
                    });
                  }}
                  orbitoPhase={gameState.orbitoPhase}
                  orbitoActionState={gameState.orbitoActionState}
                  onSelectPiece={(idx, isDragging) =>
                    setGameState((prev) => {
                      if (onlineMatchSession && prev.currentPlayerIndex !== onlineMatchSession.myPlayerIndex - 1) {
                        return prev;
                      }
                      if (prev.gameMode === "abalone" && idx !== null) {
                        const currentSelected =
                          prev.abaloneSelectedIndices || [];

                        // If already selected, deselect it (and potentially break the line, so just clear or remove)
                        if (currentSelected.includes(idx)) {
                          if (currentSelected.length === 1) {
                            return {
                              ...prev,
                              selectedPieceIndex: null,
                              abaloneSelectedIndices: [],
                            };
                          }
                          // For simplicity, if they click an already selected piece, we just reset selection to that piece
                          return {
                            ...prev,
                            selectedPieceIndex: idx,
                            abaloneSelectedIndices: [idx],
                          };
                        }

                        if (currentSelected.length === 0) {
                          return {
                            ...prev,
                            selectedPieceIndex: idx,
                            abaloneSelectedIndices: [idx],
                          };
                        }

                        if (currentSelected.length >= 3) {
                          // Max 3 pieces.
                          if (isDragging) {
                            return prev; // Ignore the 4th piece if they're dragging
                          }
                          // If they click a 4th casually, reset selection to just the new piece.
                          return {
                            ...prev,
                            selectedPieceIndex: idx,
                            abaloneSelectedIndices: [idx],
                          };
                        }

                        // Need to check if it's adjacent and collinear
                        const pNew =
                          prev.players[prev.currentPlayerIndex].positions[idx];
                        const lastIdx =
                          currentSelected[currentSelected.length - 1];
                        const pLast =
                          prev.players[prev.currentPlayerIndex].positions[
                            lastIdx
                          ];

                        const neighbors = getNeighbors(
                          pLast.r,
                          pLast.c,
                          prev.boardTheme,
                        );
                        const isAdjacent = neighbors.some(
                          ([nr, nc]) => nr === pNew.r && nc === pNew.c,
                        );

                        if (!isAdjacent) {
                          if (isDragging) return prev;
                          return {
                            ...prev,
                            selectedPieceIndex: idx,
                            abaloneSelectedIndices: [idx],
                          };
                        }

                        if (currentSelected.length === 2) {
                          // Must be collinear
                          const pFirst =
                            prev.players[prev.currentPlayerIndex].positions[
                              currentSelected[0]
                            ];

                          const getUV = (p: Point) => {
                            const wOffset = p.r <= 4 ? 4 + p.r : 12 - p.r;
                            return { u: 2 * p.c - wOffset, v: p.r };
                          };

                          const uv1 = getUV(pFirst);
                          const uv2 = getUV(pLast);
                          const uv3 = getUV(pNew);

                          const du1 = uv2.u - uv1.u;
                          const dv1 = uv2.v - uv1.v;
                          const du2 = uv3.u - uv2.u;
                          const dv2 = uv3.v - uv2.v;

                          if (du1 * dv2 !== du2 * dv1) {
                            if (isDragging) return prev;
                            return {
                              ...prev,
                              selectedPieceIndex: idx,
                              abaloneSelectedIndices: [idx],
                            };
                          }
                        }

                        return {
                          ...prev,
                          selectedPieceIndex: idx,
                          abaloneSelectedIndices: [...currentSelected, idx],
                        };
                      }
                      return {
                        ...prev,
                        selectedPieceIndex: idx,
                        abaloneSelectedIndices: idx !== null ? [idx] : [],
                      };
                    })
                  }
                  selectedPieceIndex={gameState.selectedPieceIndex}
                  abaloneSelectedIndices={gameState.abaloneSelectedIndices}
                  territoryMap={gameState.territoryMap}
                  isWallBreakingMode={isWallBreakingMode}
                  onBreakWall={handleBreakWall}
                  winner={gameState.winner}
                  suggestedMove={adviceObj?.suggestedMove}
                  suggestedWall={adviceObj?.suggestedWall}
                  theme={gameState.boardTheme || boardTheme}
                  status={gameState.status}
                  winningLine={gameState.winningLine}
                  corsaAction={gameState.corsaAction}
                  fugaWallPreview={gameState.fugaWallPreview}
                  onPreviewFugaWall={(r, c, orientation) => {
                    const effectiveTheme = gameState.boardTheme || boardTheme;
                    if (
                      isValidFugaWall(
                        { r, c, orientation },
                        gameState.walls,
                        gameState.players,
                        effectiveTheme,
                      )
                    ) {
                      setGameState((prev) => ({
                        ...prev,
                        fugaWallPreview: { r, c, orientation },
                      }));
                    } else {
                      const fallback = orientation === "h" ? "v" : "h";
                      if (
                        isValidFugaWall(
                          { r, c, orientation: fallback },
                          gameState.walls,
                          gameState.players,
                          effectiveTheme,
                        )
                      ) {
                        setGameState((prev) => ({
                          ...prev,
                          fugaWallPreview: { r, c, orientation: fallback },
                        }));
                      }
                    }
                  }}
                  gameMode={gameState.gameMode || gameMode}
                  isUserTurn={isUserTurn}
                  className="max-h-full max-w-full object-contain"
                  aiTrace={aiTrace}
                  pushedMarbles={pushedMarbles}
                  penteDyingPieces={penteDyingPieces}
                  shobuState={gameState.shobuState}
                  badukDeadStones={gameState.badukDeadStones}
                  onToggleBadukDeadStone={handleToggleBadukDeadStone}
                  penteLastOpponentMove={getPenteOpponentLastMove()}
                />
              )}
            </div>

            {isPlayerSuspended && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-[3rem] pointer-events-none">
                <div className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-xl shadow-2xl animate-bounce border-2 border-white/30">
                  {language === "it"
                    ? "SEI BLOCCATO! SALTO TURNO..."
                    : "TRAPPED! SKIPPING TURN..."}
                </div>
              </div>
            )}

            {mustUseWallbreaker && (
              <div className="absolute top-4 z-[1000] flex items-center justify-center pointer-events-none">
                <div className="bg-amber-500 text-slate-900 px-6 py-3 rounded-full font-black text-sm md:text-base shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse border-2 border-white/50 text-center">
                  {language === "it"
                    ? "⚠️ DEVI USARE IL WALLBREAKER 🔨"
                    : "⚠️ YOU MUST USE THE WALLBREAKER 🔨"}
                </div>
              </div>
            )}
          </div>

          {gameState.gameMode === "baduk" && (onlineMatchSession || (gameState.pastStates && gameState.pastStates.length > 0) || (gameState.futureStates && gameState.futureStates.length > 0)) && (
            <div className="w-full flex justify-center items-center gap-3 mt-2 -mb-2 z-[90]">
              <button
                onClick={handleHistoryBack}
                disabled={!gameState.pastStates || gameState.pastStates.length === 0}
                className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-full border border-slate-600 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md"
                title={language === "it" ? "Mossa precedente" : "Previous move"}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              
              <button
                onClick={handleHistoryForward}
                disabled={!gameState.futureStates || gameState.futureStates.length === 0}
                className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-full border border-slate-600 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md"
                title={language === "it" ? "Mossa successiva" : "Next move"}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>

              {/* Pulsante Salva - presente accanto ai tasti < > solo nelle partite multiplayer a Baduk/Go non ancora terminate */}
              {onlineMatchSession && gameState.status !== "ended" && (
                <button
                  onClick={() => handleSaveOnlineBadukGame(false)}
                  disabled={isSavingOnlineBaduk}
                  className="h-12 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-full font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-95 transition-all border border-blue-400/40"
                  title={language === "it" ? "Salva partita" : "Save match"}
                >
                  <span className="text-base">💾</span>
                  <span>{language === "it" ? "Salva" : "Save"}</span>
                </button>
              )}

              {(gameState.futureStates && gameState.futureStates.length > 0) && (
                <button
                  onClick={handleHistoryToPresent}
                  className="w-12 h-12 flex items-center justify-center bg-emerald-600 rounded-full border border-emerald-500 hover:bg-emerald-500 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse"
                  title={language === "it" ? "Torna alla mossa corrente" : "Return to present"}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          )}

          {gameState.status === "scoring" ? (
            <div className="mt-auto p-4 w-full max-w-md mx-auto animate-in slide-in-from-bottom duration-500 fade-in z-50">
              <div className="bg-slate-900/95 p-5 rounded-[2.5rem] border-2 border-indigo-500/50 shadow-2xl flex flex-col items-center gap-3.5 backdrop-blur-md">
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">⚖️</span>
                    <h2 className="text-xl sm:text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-indigo-300 uppercase">
                      {language === "it" ? "Conteggio Territorio" : "Scoring & Territory"}
                    </h2>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-300 leading-tight max-w-[320px]">
                    {language === "it"
                      ? "Tocca i gruppi di pietre morte sulla plancia per contrassegnarli o ripristinarli."
                      : "Tap dead stone groups on the board to mark or restore them."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 w-full my-0.5">
                  {gameState.players.map((p, idx) => {
                    const isStarter = idx === (gameState.startingPlayerIndex ?? 0);
                    const isWhite = !isStarter;
                    const komi = isWhite ? 7.5 : 0;
                    const terrScore = (gameState.territoryMap ? Object.values(gameState.territoryMap).filter(id => id === p.id).length : 0);
                    const aliveStones = p.positions.filter(pos => !(gameState.badukDeadStones || []).includes(`${pos.r},${pos.c}`)).length;
                    const totalScore = (p.score || 0);

                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-2xl border flex flex-col items-center text-center ${
                          isStarter
                            ? "bg-neutral-900/80 border-neutral-700"
                            : "bg-slate-800/80 border-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border shadow-sm ${
                              isStarter ? "bg-neutral-900 border-neutral-600" : "bg-neutral-100 border-neutral-400"
                            }`}
                          />
                          <span className="text-xs font-black text-white truncate max-w-[90px]">
                            {p.name}
                          </span>
                        </div>
                        <span className="text-2xl font-black text-amber-300">{totalScore.toFixed(1)}</span>
                        <div className="text-[10px] text-slate-400 font-medium space-y-0.5 mt-1">
                          <div>{language === "it" ? "Territorio" : "Territory"}: <b className="text-white">{terrScore}</b></div>
                          <div>{language === "it" ? "Pietre vive" : "Live stones"}: <b className="text-white">{aliveStones}</b></div>
                          {komi > 0 && <div>Komi: <b className="text-emerald-400">+{komi}</b></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2.5 w-full mt-1">
                  <button
                    onClick={handleResumeBadukGame}
                    className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-[11px] uppercase border border-slate-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>↩️</span>
                    <span>{language === "it" ? "Riprendi Gioco" : "Resume Game"}</span>
                  </button>

                  <button
                    onClick={handleConfirmBadukScoring}
                    className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] uppercase border border-emerald-400/50 active:scale-95 transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-1.5"
                  >
                    <span>✅</span>
                    <span>{language === "it" ? "Conferma" : "Confirm Score"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : gameState.status === "ended" ? (
            <div className="mt-auto p-4 w-full max-w-sm mx-auto animate-in slide-in-from-bottom duration-500 fade-in">
              <div className="bg-slate-900/95 p-6 rounded-[2.5rem] border-2 border-slate-700 shadow-2xl flex flex-col items-center gap-5">
                <div className="text-center space-y-1">
                  <h2
                    className={`text-3xl font-black italic text-transparent bg-clip-text uppercase ${
                      (onlineMatchSession ? gameState.winner === onlineMatchSession.myPlayerIndex : gameState.winner === 1)
                        ? "bg-gradient-to-r from-blue-400 to-emerald-400"
                        : gameState.winner === "draw"
                          ? "bg-gradient-to-r from-amber-400 to-yellow-400"
                          : "bg-gradient-to-r from-rose-400 to-red-500"
                    }`}
                  >
                    {gameState.winner === "draw"
                      ? language === "it"
                        ? "PAREGGIO!"
                        : "DRAW!"
                      : (onlineMatchSession ? gameState.winner === onlineMatchSession.myPlayerIndex : gameState.winner === 1)
                        ? t.youWin
                        : t.aiWin.replace(
                            "{name}",
                            gameState.players.find(
                              (p) => p.id === gameState.winner,
                            )?.name || (onlineMatchSession ? onlineMatchSession.opponentName : ""),
                          )}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    {t.battleEnded}
                  </p>
                  {gameState.gameMode === "pente" && gameState.winner !== "draw" && !gameState.winningLine && (
                     <p className="text-xs font-bold text-amber-400 mt-2 uppercase text-center bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 w-fit mx-auto">
                       {language === "it" ? "Vittoria per 5 catture (10 Punti)" : "Win by 5 captures (10 Points)"}
                     </p>
                  )}
                </div>

                {gameState.matchResult && (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div
                      className={`text-2xl font-black ${gameState.matchResult.pointsEarned > 0 ? "text-emerald-400" : gameState.matchResult.pointsEarned < 0 ? "text-red-400" : "text-slate-400"}`}
                    >
                      {gameState.matchResult.pointsEarned > 0 ? "+" : ""}
                      {gameState.matchResult.pointsEarned.toFixed(1)} Pts
                    </div>
                    {gameState.matchResult.earnedBadges.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-1">
                        {gameState.matchResult.earnedBadges.map((badgeId) => {
                          const badgeInfo = [
                            {
                              id: "cervellone",
                              icon: "🧠",
                              name: t.badgeBrainiac,
                            },
                            {
                              id: "dominatore",
                              icon: "👑",
                              name: t.badgeDominator,
                            },
                            {
                              id: "abalone_hard",
                              icon: "🟤",
                              name: (t as any).badgeAbaloneHard,
                            },
                            {
                              id: "orbito_hard",
                              icon: "🪐",
                              name:
                                (t as any).badgeOrbitoHard || "Maestro Orbito",
                            },
                            {
                              id: "hex_hard",
                              icon: "⬡",
                              name: (t as any).badgeHexHard || "Hex Master",
                            },
                            {
                              id: "shobu_master",
                              icon: "🪨",
                              name:
                                (t as any).badgeShobuMaster ||
                                "Maestro Shobu",
                            },
                            {
                              id: "yinsh_master",
                              icon: "⭕",
                              name: (t as any).badgeYinshMaster || "Signore degli Anelli",
                            },
                            {
                              id: "onitama_hard",
                              icon: "🏯",
                              name: (t as any).badgeOnitamaHard || "Maestro Onitama",
                            },

                            {
                              id: "fuga_hard",
                              icon: "🏃",
                              name: (t as any).badgeFugaHard || "Velocista",
                            },
                            {
                              id: "amazons_hard",
                              icon: "🏹",
                              name: (t as any).badgeAmazonsHard || "Guerriero",
                            },
                            {
                              id: "maestro",
                              icon: "🍡",
                              name: (t as any).badgeMaster || "Maestro Dango",
                            },
                            {
                              id: "baduk_extreme",
                              icon: "☯️",
                              name: (t as any).badgeBadukExtreme || "Maestro di Go",
                            },
                            {
                              id: "pente_extreme",
                              icon: "🌟",
                              name: (t as any).badgePenteExtreme || "Maestro Pente",
                            },
                            {
                              id: "domineering_extreme",
                              icon: "🧱",
                              name: (t as any).badgeDomineeringExtreme || "Maestro Domineering",
                            },
                            {
                              id: "chain_triangle_medium",
                              icon: "🔺",
                              name: (t as any).badgeChainTriangleMedium || "Pensatore di Triangoli",
                            },
                            {
                              id: "chain_triangle_hard",
                              icon: "🌋",
                              name: (t as any).badgeChainTriangleHard || "Maestro dei Triangoli",
                            },
                            {
                              id: "stratego_master",
                              icon: "🚩",
                              name: language === "it" ? "Generale Supremo" : "Supreme General",
                            },
                          ].find((b) => b.id === badgeId);
                          return badgeInfo ? (
                            <div
                              key={badgeId}
                              className="flex flex-col items-center bg-slate-800/80 p-3 rounded-xl border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-in zoom-in duration-500"
                            >
                              <span className="text-3xl drop-shadow-lg">
                                {badgeInfo.icon}
                              </span>
                              <span className="text-[9px] font-black text-amber-400 mt-2 uppercase tracking-widest text-center">
                                {badgeInfo.name}
                              </span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="w-full h-px bg-white/10" />
                {(onlineMatchSession?.isInviter || postOnlineInviteSession?.isInviter) ? (
                  <div className="w-full flex flex-col gap-2.5">
                    <button
                      id="btn-gameover-propose-new-invite"
                      onClick={handleProposeNewInviteFromEnd}
                      className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-black text-base uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-transform hover:from-cyan-400 hover:to-blue-500 flex items-center justify-center gap-2"
                    >
                      <span>✉️</span>
                      <span>{language === "it" ? "Proponi nuovo invito" : "Propose new invite"}</span>
                    </button>
                    <button
                      id="btn-gameover-return-to-menu"
                      onClick={() => {
                        resetGameToMenu();
                      }}
                      className="w-full py-3 bg-slate-800 text-slate-200 rounded-2xl font-bold text-sm uppercase tracking-wider border border-white/10 active:scale-95 transition-transform hover:bg-slate-700 flex items-center justify-center gap-2"
                    >
                      <span>🏠</span>
                      <span>{language === "it" ? "Menu Iniziale" : "Main Menu"}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      resetGameToMenu();
                    }}
                    className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 transition-transform hover:bg-slate-200"
                  >
                    {t.newChallenge} 🏠
                  </button>
                )}
              </div>
            </div>
          ) : (
            <footer className="mt-auto bg-slate-900/80 p-3 px-4 rounded-[2rem] border-[2px] border-[#fef08a] relative flex-shrink-0">
              {onlineMatchSession && !gameState.winner && (
                <div className={`w-full mb-3 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-[11px] sm:text-xs font-black tracking-widest uppercase ${isMyTurnOnline ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]"}`}>
                  {isMyTurnOnline ? (
                    <>
                       <span className="text-sm">👉</span>
                       <span>{language === "it" ? "Tocca a te!" : "Your turn!"}</span>
                    </>
                  ) : (
                    <>
                       <span className="text-sm">⏳</span>
                       <span>{language === "it" ? `In attesa di ${onlineMatchSession.opponentName}...` : `Waiting for ${onlineMatchSession.opponentName}...`}</span>
                    </>
                  )}
                </div>
              )}
              {isPlayerSuspended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse shadow-xl border border-white/20 z-50 whitespace-nowrap">
                  {language === "it" ? "SEI BLOCCATO!" : "YOU ARE TRAPPED!"}
                </div>
              )}
              {gameMode === "baduk" && isResumedGame && humanMovesInSession === 0 && (() => {
                const players = gameState.players || [];
                const humanIdx = players.findIndex((p) => !p.isAI);
                const humanIndex = humanIdx >= 0 ? humanIdx : 0;
                const starterIdx = gameState.startingPlayerIndex ?? 0;
                const isClassic = badukStoneColor === "classic";

                let text = "";
                let symbol = "";
                let bgStyle = "";

                if (isClassic) {
                  const isBlack = humanIndex === starterIdx;
                  if (isBlack) {
                    text = language === "it" ? "Partita ripresa — Giochi con le pietre NERE" : "Resumed game — You play as BLACK";
                    symbol = "⚫";
                    bgStyle = "bg-zinc-800 text-zinc-100 border-zinc-600 shadow-[0_0_12px_rgba(255,255,255,0.15)]";
                  } else {
                    text = language === "it" ? "Partita ripresa — Giochi con le pietre BIANCHE" : "Resumed game — You play as WHITE";
                    symbol = "⚪";
                    bgStyle = "bg-slate-200 text-slate-900 border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]";
                  }
                } else {
                  const humanPlayer = players[humanIndex];
                  const isPlayer1 = humanPlayer?.id === 1;
                  if (isPlayer1) {
                    text = language === "it" ? "Partita ripresa — Giochi con le pietre NEON BLU" : "Resumed game — You play as NEON BLUE";
                    symbol = "🔵";
                    bgStyle = "bg-blue-950/80 text-blue-300 border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.3)]";
                  } else {
                    text = language === "it" ? "Partita ripresa — Giochi con le pietre NEON ROSSE" : "Resumed game — You play as NEON RED";
                    symbol = "🔴";
                    bgStyle = "bg-red-950/80 text-red-300 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.3)]";
                  }
                }

                return (
                  <div className={`w-full mb-2.5 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-[11px] sm:text-xs font-black uppercase tracking-wider animate-fade-in ${bgStyle}`}>
                    <span>{text}</span>
                    <span className="text-sm">{symbol}</span>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-[80px]">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                    {t.phase}
                  </span>
                  <span
                    className={`text-sm font-black italic uppercase leading-none ${isAIThinking ? "text-blue-500" : "text-blue-400"}`}
                  >
                    {isAIThinking ? "AI..." : 
                      (gameState.gameMode === "yinsh" && gameState.yinshState) 
                        ? (
                            gameState.yinshState.phase === 'place_ring' ? (language === 'it' ? 'PIAZZA ANELLO' : 'PLACE RING')
                          : gameState.yinshState.phase === 'place_marker' ? (language === 'it' ? 'PIAZZA MARKER' : 'PLACE MARKER')
                          : gameState.yinshState.phase === 'move_ring' ? (language === 'it' ? 'MUOVI ANELLO' : 'MOVE RING')
                          : gameState.yinshState.phase === 'remove_markers' ? (language === 'it' ? 'RIMUOVI 5' : 'REMOVE 5')
                          : gameState.yinshState.phase === 'remove_ring' ? (language === 'it' ? 'PUNTO!' : 'SCORE!')
                          : t[gameState.turnPhase]
                        ) 
                        : (gameState.gameMode === "baduk" || gameState.gameMode === "pente" || gameState.gameMode === "hex" || gameState.gameMode === "domineering")
                          ? (gameState.consecutivePasses > 0 
                              ? (language === "it" ? "PASSO RIVALE" : language === "es" ? "PASE RIVAL" : language === "fr" ? "PASSE RIVAL" : language === "de" ? "PASS RIVALE" : "OPPONENT PASSED")
                              : (language === "it" ? "PARTITA" : language === "es" ? "PARTIDA" : language === "fr" ? "PARTIE" : language === "de" ? "SPIEL" : "PLAYING")
                            )
                        : t[gameState.turnPhase]
                    }
                  </span>
                </div>

                <div
                  id="bottom-action-buttons"
                  className="flex flex-1 items-center justify-center gap-2 flex-wrap min-h-[40px]"
                >
                  {gameMode === "yinsh" && gameState.yinshState?.phase === 'remove_ring' && isUserTurn && (
                      <span className="text-[11px] font-semibold text-amber-300 italic px-2 text-center leading-tight animate-fade-in w-full">
                        {gameState.yinshState.ringsWon[currentPlayer.id] === 2
                          ? (language === "it"
                            ? "Scegli l'ultimo anello da rimuovere per VINCERE LA PARTITA!"
                            : "Choose your last ring to remove to WIN THE GAME!")
                          : (language === "it"
                          ? "Scegli un tuo anello dal tabellone per fare punto e completare il turno"
                          : "Choose one of your rings from the board to score and complete your turn")}
                      </span>
                  )}
                  {gameMode === "yinsh" && gameState.yinshState?.phase === 'remove_markers' && isUserTurn && (
                      <span className="text-[11px] font-semibold text-emerald-300 italic px-2 text-center leading-tight animate-fade-in w-full">
                        {gameState.yinshState.ringsWon[currentPlayer.id] === 2
                          ? (language === "it"
                            ? "Rimuovi l'ultima fila di 5 pedine per vincere!"
                            : "Remove the final row of 5 markers to win!")
                          : gameState.yinshState.activeRows.filter(r => r.playerId === currentPlayer.id).length > 1
                            ? (language === "it"
                              ? "Hai completato una fila maggiore di 5! Seleziona un'estremità della fila formata per rimuoverne 5"
                              : "You formed a row of more than 5! Select one end of the formed row to remove exactly 5 markers")
                            : (language === "it"
                              ? "Clicca su una delle tue pedine lampeggianti per rimuovere la fila da 5"
                              : "Click one of your flashing markers to remove the row of 5")}
                      </span>
                  )}
                  {gameMode === "abalone" &&
                    isUserTurn &&
                    (!gameState.abaloneSelectedIndices ||
                      gameState.abaloneSelectedIndices.length === 0) && (
                      <span className="text-[11px] font-semibold text-blue-300 italic px-2 text-center leading-tight animate-fade-in w-full">
                        {language === "it"
                          ? "seleziona 1, 2 o 3 pedine adiacenti da spostare"
                          : "select 1, 2 or 3 adjacent pieces to move"}
                      </span>
                    )}

                  {gameMode === "orbito" && isUserTurn && (
                    <div className="w-full flex justify-center flex-col items-center gap-1">
                      <span className="text-[11px] font-semibold text-emerald-300 italic px-2 text-center leading-tight animate-fade-in w-full">
                        {language === "it"
                          ? gameState.orbitoPhase === "button"
                            ? "Premi il pulsante verde centrale per far ruotare la plancia!"
                            : "Seleziona e sposta una pedina avversaria (opzionale), poi piazza la tua pedina."
                          : gameState.orbitoPhase === "button"
                            ? "Press the central green button to rotate the board!"
                            : "Select and move an opponent piece (optional), then place your piece."}
                      </span>
                      {gameState.orbitoPhase === "shift" && (
                        <button
                          onClick={() =>
                            setGameState((prev) => ({
                              ...prev,
                              orbitoPhase: "place",
                              selectedPieceIndex: null,
                            }))
                          }
                          className="text-[10px] font-semibold text-amber-300 px-3 py-1 bg-white/5 rounded-lg hover:bg-white/10 active:scale-95 transition-all w-auto whitespace-nowrap"
                        >
                          {language === "it"
                            ? "Salta lo spostamento avversario"
                            : "Skip opponent piece shift"}
                        </button>
                      )}
                    </div>
                  )}

                  {gameMode === "shobu" && isUserTurn && (
                    <div className="w-full flex justify-center flex-col items-center gap-1 mt-2">
                       <span className="text-[11px] font-semibold text-emerald-300 italic px-2 text-center leading-tight animate-fade-in w-full max-w-[280px]">
                         {language === "it"
                           ? gameState.shobuState?.passiveMove
                             ? "Fase Attiva: esegui una mossa di uguale direzione e passi su una plancia di colore diverso (puoi spingere le pedine avversarie)."
                             : "Fase Passiva: muovi una tua pedina di 1 o 2 passi sulla plancia del tuo lato (non puoi spingere altre pedine)."
                           : gameState.shobuState?.passiveMove
                             ? "Active Phase: execute a move of equal direction and steps on a different color board (you can push opponent pieces)."
                             : "Passive Phase: move one of your pieces 1 or 2 steps on your home board (you cannot push other pieces)."}
                       </span>
                       {gameState.shobuState?.passiveMove && (
                         <button
                           onClick={() => {
                             const pm = gameState.shobuState?.passiveMove;
                             if (!pm) return;
                             const targetR = pm.r + pm.dr;
                             const targetC = pm.c + pm.dc;
                             const fromR = pm.r;
                             const fromC = pm.c;
                             setGameState((prev) => {
                               const nPlayers = prev.players.map((pl) => {
                                 if (pl.id === prev.players[prev.currentPlayerIndex].id) {
                                   const nPos = pl.positions.map((pos) => {
                                     if (pos.r === targetR && pos.c === targetC) {
                                       return { ...pos, r: fromR, c: fromC };
                                     }
                                     return pos;
                                   });
                                   return { ...pl, positions: nPos };
                                 }
                                 return pl;
                               });
                               return {
                                 ...prev,
                                 players: nPlayers,
                                 shobuState: undefined,
                                 selectedPieceIndex: null,
                               };
                             });
                           }}
                           className="mt-1 px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                         >
                           {language === "it" ? "↩️ Annulla mossa passiva" : "↩️ Cancel passive move"}
                         </button>
                       )}
                       {shobuWarningToast && (
                         <span className="text-[11px] font-black text-rose-500 italic px-2 text-center leading-tight animate-pulse underline select-none pointer-events-none mt-1">
                           {shobuWarningToast}
                         </span>
                       )}
                    </div>
                  )}

                  {(gameState.gameMode || gameMode) === "corsa" && isUserTurn && (
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl w-full max-w-[200px] border border-white/10 shadow-inner">
                      <button
                        onClick={() =>
                          setGameState((prev) => ({
                            ...prev,
                            corsaAction: "move",
                            fugaWallPreview: null,
                          }))
                        }
                        className={`flex-1 py-2 font-black text-[10px] uppercase rounded-lg transition-all flex justify-center items-center gap-1 ${
                          !gameState.corsaAction ||
                          gameState.corsaAction === "move"
                            ? "bg-blue-600 text-white shadow shadow-blue-500/50"
                            : "text-slate-400 hover:text-white opacity-70 hover:opacity-100"
                        }`}
                      >
                        <span className="text-sm leading-none mt-0.5">🏃</span>
                        <span>{language === "it" ? "Muovi" : "Move"}</span>
                      </button>
                      <button
                        onClick={() =>
                          setGameState((prev) => ({
                            ...prev,
                            corsaAction: "wall",
                            fugaWallPreview: null,
                          }))
                        }
                        disabled={(currentPlayer.wallsLeft || 0) <= 0}
                        className={`flex-1 flex flex-col items-center justify-center py-1 font-black text-[10px] uppercase rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          gameState.corsaAction === "wall"
                            ? "bg-orange-600 text-white shadow shadow-orange-500/50"
                            : "text-slate-400 hover:text-white opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm leading-none">🧱</span>
                          <span>{language === "it" ? "Muro" : "Wall"}</span>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-black/20 text-white ml-1">
                            x{currentPlayer.wallsLeft || 0}
                          </span>
                        </div>
                      </button>
                    </div>
                  )}

                  {(gameState.gameMode || gameMode) === "corsa" &&
                    isUserTurn &&
                    gameState.corsaAction === "wall" &&
                    gameState.fugaWallPreview && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (
                              gameState.status !== "playing" ||
                              gameState.winner ||
                              !gameState.fugaWallPreview
                            )
                              return;
                            const { r, c, orientation } =
                              gameState.fugaWallPreview;
                            let w1Id, w2Id;
                            if (orientation === "h") {
                              w1Id = serializeWall(r, c, r + 1, c);
                              w2Id = serializeWall(r, c + 1, r + 1, c + 1);
                            } else {
                              w1Id = serializeWall(r, c, r, c + 1);
                              w2Id = serializeWall(r + 1, c, r + 1, c + 1);
                            }
                            if (sfxVolume > 0) SoundManager.playPlaceWall();
                            const newWalls = [
                              ...gameState.walls,
                              { id: w1Id, ownerId: currentPlayer.id },
                              { id: w2Id, ownerId: currentPlayer.id },
                            ];
                            const nPlayers = gameState.players.map((pl) =>
                              pl.id === currentPlayer.id
                                ? { ...pl, wallsLeft: (pl.wallsLeft || 0) - 1 }
                                : pl,
                            );
                            setGameState((prev) => ({
                              ...prev,
                              fugaWallPreview: null,
                              corsaAction: "move",
                            }));
                            advanceTurn(newWalls, nPlayers, false);
                          }}
                          className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-500/50 active:scale-95 transition-all"
                        >
                          Conferma
                        </button>
                        <button
                          onClick={() =>
                            setGameState((prev) => ({
                              ...prev,
                              fugaWallPreview: null,
                            }))
                          }
                          className="w-10 h-10 bg-red-600/20 text-red-500 flex items-center justify-center rounded-xl border border-red-500/30 active:scale-95 transition-all font-black"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                  {((gameMode === "amazons" &&
                    gameState.boardTheme === "amazons-6" &&
                    gameState.turnPhase === "moving") ||
                    gameMode === "hex") &&
                    gameState.turnCount === 1 &&
                    isUserTurn && (
                      <button
                        onClick={handlePieRuleSwap}
                        className="flex-1 max-w-[150px] py-2.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl font-black text-[10px] uppercase tracking-tight active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5"
                      >
                        {language === "it"
                          ? "🔄 Scambia Colori"
                          : "🔄 Swap Colors"}
                      </button>
                    )}

                  {gameMode === "dominio" &&
                    isUserTurn &&
                    gameState.turnPhase === "moving" &&
                    !currentPlayer.isTrapped &&
                    gameState.selectedPieceIndex !== null && (
                      <button
                        onClick={() =>
                          handleMove(
                            currentPlayer.positions[
                              gameState.selectedPieceIndex || 0
                            ],
                          )
                        }
                        className="flex-1 max-w-[110px] py-2.5 bg-amber-600/20 text-amber-500 border border-amber-500/30 rounded-xl font-black text-[10px] uppercase tracking-tight active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5"
                      >
                        {language === "it" ? "Fermo qui" : "Stay Here"}
                      </button>
                    )}

                  {(gameMode === "dominio" || gameMode === "amazons") &&
                    isUserTurn &&
                    gameState.turnPhase === "walling" &&
                    gameState.moveBackupPos &&
                    gameState.selectedPieceIndex !== null && (
                      <button
                        onClick={() => {
                          setGameState((prev) => {
                            if (
                              !prev.moveBackupPos ||
                              prev.selectedPieceIndex === null
                            )
                              return prev;
                            const nPlayers = [...prev.players];
                            const cp = { ...nPlayers[prev.currentPlayerIndex] };
                            const nPos = [...cp.positions];
                            nPos[prev.selectedPieceIndex] = prev.moveBackupPos;
                            cp.positions = nPos;
                            nPlayers[prev.currentPlayerIndex] = cp;
                            return {
                              ...prev,
                              players: nPlayers,
                              turnPhase: "moving",
                              moveBackupPos: null,
                            };
                          });
                        }}
                        className="flex-1 max-w-[110px] py-2.5 bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl font-black text-[10px] uppercase tracking-tight active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5"
                      >
                        {language === "it" ? "Annulla Mossa" : "Undo Move"}
                      </button>
                    )}

                  {gameMode === "abalone" &&
                    gameState.abalonePreviousState &&
                    !gameState.players[
                      gameState.abalonePreviousState!.currentPlayerIndex
                    ].isAI &&
                    (isUserTurn || (isAIThinking && undoWindowActive)) &&
                    (gameState.abaloneSelectedIndices?.length === 0 ||
                      !gameState.abaloneSelectedIndices) && (
                      <button
                        onClick={() => {
                          setUndoWindowActive(false);
                          setGameState((prev) => ({
                            ...prev,
                            players: prev.abalonePreviousState!.players,
                            currentPlayerIndex:
                              prev.abalonePreviousState!.currentPlayerIndex,
                            turnCount: prev.abalonePreviousState!.turnCount,
                            abalonePreviousState: null,
                            selectedPieceIndex: null,
                            abaloneSelectedIndices: [],
                          }));
                        }}
                        className="flex-1 max-w-[110px] py-2.5 bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl font-black text-[10px] uppercase tracking-tight active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5"
                      >
                        {language === "it" ? "Annulla Mossa" : "Undo Move"}
                      </button>
                    )}

                  {gameMode === "dominio" &&
                    isUserTurn &&
                    gameState.turnPhase === "moving" &&
                    currentPlayer.hasWallbreaker &&
                    !gameState.usedWallbreakerThisTurn &&
                    isSelectedPieceEnclosed && (
                      <button
                        onClick={() => setIsWallBreakingMode((prev) => !prev)}
                        className={`flex-1 max-w-[110px] py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tight active:scale-95 transition-all border shadow-lg flex flex-col items-center justify-center gap-0.5 ${isWallBreakingMode ? "bg-red-600 text-white border-red-400" : "bg-slate-800 text-slate-300 border-white/10"}`}
                      >
                        <span>
                          {isWallBreakingMode ? "Annulla" : "Wallbreaker"}
                        </span>
                        {!isWallBreakingMode && (
                          <span className="text-[12px]">🔨</span>
                        )}
                      </button>
                    )}

                  {(isUserTurn && currentPlayer.isTrapped) || (isUserTurn && gameMode === "baduk") ? (
                    <button
                      onClick={() => {
                        if (gameState.gameMode === "baduk") {
                            badukWorkerRef.current?.postMessage({ type: 'HUMAN_MOVE', move: -1 });
                        }
                        advanceTurn(gameState.walls, gameState.players, true);
                      }}
                      className={`flex-1 max-w-[130px] py-2.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-tight active:scale-95 transition-all shadow-lg ${
                        gameMode === "baduk" && gameState.consecutivePasses > 0
                          ? "bg-amber-500/30 text-amber-300 border-2 border-amber-400 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                          : "bg-red-600/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {gameMode === "baduk" && gameState.consecutivePasses > 0
                        ? (language === "it" ? "PASSA E CONCLUDI" : language === "es" ? "PASAR Y TERMINAR" : language === "fr" ? "PASSER ET FINIR" : language === "de" ? "PASSEN & ENDE" : "PASS TO FINISH")
                        : t.passTurn}
                    </button>
                  ) : null}

                  {isStrategyEnabled &&
                    gameMode === "dominio" &&
                    !mustUseWallbreaker && (
                      <button
                        disabled={isAdviceLoading || !isUserTurn}
                        onClick={fetchAdvice}
                        className={`flex-1 max-w-[110px] py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-black text-[10px] uppercase tracking-tight disabled:opacity-30 active:scale-95 transition-all shadow-lg flex flex-col items-center justify-center gap-0.5`}
                      >
                        <span>{isAdviceLoading ? "..." : t.strategy}</span>
                        {!isAdviceLoading && (
                          <span className="text-[10px]">🧠</span>
                        )}
                      </button>
                    )}
                </div>
              </div>
            </footer>
          )}

          {isStrategyOpen && (
            <div
              onPointerDown={onAdvicePointerDown}
              onPointerMove={onAdvicePointerMove}
              onPointerUp={onAdvicePointerUp}
              style={{
                transform: `translate(${advicePos.x}px, ${advicePos.y}px)`,
              }}
              className={`fixed bottom-32 left-4 right-4 z-[500] p-6 rounded-[2.5rem] bg-slate-900/80 border-2 border-white/20 shadow-2xl max-w-2xl mx-auto overflow-hidden backdrop-blur-xl transition-shadow ${isDraggingAdvice ? "shadow-blue-500/20 cursor-grabbing" : "cursor-grab"}`}
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/20 rounded-full" />
              <div className="flex items-start gap-4 mt-2">
                <div className="flex-1 pointer-events-none">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-2 h-2 rounded-full ${isAdviceLoading ? "bg-blue-400 animate-ping" : "bg-emerald-400"}`}
                    />
                    <span className="text-[10px] font-black uppercase text-white/60 tracking-widest">
                      Tactical Engine
                    </span>
                  </div>
                  <p className="text-base font-bold text-white italic leading-tight">
                    "{adviceObj?.text || "Analisi in corso..."}"
                  </p>
                </div>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={closeAdvice}
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-black active:scale-90 transition-transform hover:bg-white/20"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isRegistrationOpen && (
        <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] p-6 flex flex-col animate-in zoom-in-95 duration-300 shadow-2xl border border-white/10">
            <div className="flex flex-col items-center mb-6 text-center">
              <h2 className="text-3xl font-black italic text-blue-400 uppercase tracking-tight mb-2">
                {language === "it" ? "Benvenuto!" : "Welcome!"}
              </h2>
              <p className="text-xs text-slate-400 font-bold">
                {language === "it"
                  ? "Per partecipare alle classifiche globali, inserisci un nome utente."
                  : "To participate in global leaderboards, enter a username."}
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">
                  {language === "it"
                    ? "Nome Utente (Obbligatorio)"
                    : "Username (Required)"}
                </label>
                <input
                  value={tempUserName}
                  onChange={(e) => {
                     setTempUserName(e.target.value);
                     setProfileState("idle");
                  }}
                  placeholder={language === "it" ? "Il tuo nome" : "Your name"}
                  className="w-full bg-slate-800 p-4 rounded-xl font-bold border border-white/10 outline-none text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">
                  {language === "it"
                    ? "Paese/Nazione (Opzionale)"
                    : "Country/Nation (Optional)"}
                </label>
                <input
                  value={tempUserLocation}
                  onChange={(e) => {
                     setTempUserLocation(e.target.value);
                     setProfileState("idle");
                  }}
                  placeholder={
                    language === "it"
                      ? "es. Bologna/Italia"
                      : "e.g. New York/USA"
                  }
                  className="w-full bg-slate-800 p-4 rounded-xl font-bold border border-white/10 outline-none text-white focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">
                  {language === "it"
                    ? "Indirizzo Gmail (Opzionale per test)"
                    : "Gmail Address (Optional for testing)"}
                </label>
                <input
                  value={tempUserEmail}
                  onChange={(e) => {
                     setTempUserEmail(e.target.value);
                     setProfileState("idle");
                  }}
                  placeholder={language === "it" ? "es. tuoindirizzo@gmail.com" : "e.g. youraddress@gmail.com"}
                  className="w-full bg-slate-800 p-4 rounded-xl font-bold border border-white/10 outline-none text-white focus:border-blue-500 transition-colors"
                />
              </div>
              {(tempUserName.toLowerCase().includes("@gmail.com") || tempUserEmail.toLowerCase().includes("@gmail.com")) && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">
                      {language === "it" ? "Lascia un commento" : "Leave a comment"}
                    </label>
                    <input
                      value={tempUserComment}
                      onChange={(e) => {
                         setTempUserComment(e.target.value);
                         setProfileState("idle");
                      }}
                      placeholder={language === "it" ? "Il tuo commento" : "Your comment"}
                      className="w-full bg-slate-800 p-4 rounded-xl font-bold border border-white/10 outline-none text-white focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-2 bg-slate-800 p-4 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="tester-checkbox-reg"
                      checked={tempIsTester}
                      onChange={(e) => {
                         setTempIsTester(e.target.checked);
                         setProfileState("idle");
                      }}
                      className="w-5 h-5 accent-blue-500"
                    />
                    <label htmlFor="tester-checkbox-reg" className="text-sm font-bold text-slate-300 select-none">
                      {language === "it" ? "Voglio diventare un tester dell'app" : "I want to become an app tester"}
                    </label></div>
                    <div className="text-[11px] text-emerald-400 font-medium leading-tight ml-8">
                      {language === "it" ? "I tester con indirizzo Gmail verificato avranno tutti i giochi sbloccati gratuitamente!" : 
                       language === "fr" ? "Les testeurs avec une adresse Gmail auront tous les jeux débloqués gratuitement !" :
                       language === "de" ? "Tester mit einer Gmail-Adresse haben alle Spiele kostenlos freigeschaltet!" :
                       language === "es" ? "¡Los probadores con una dirección de Gmail tendrán todos los juegos desbloqueados gratis!" :
                       "Testers with a Gmail address will have all games unlocked for free!"}
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">
                  Lingua / Language
                </label>
                <div className="flex gap-2">
                  {(["it", "en", "fr", "de", "es"] as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setLanguage(l);
                        localStorage.setItem("wallgo_lang", l);
                      }}
                      className={`flex-1 py-3 rounded-xl font-bold uppercase transition-all ${language === l ? "bg-blue-600 shadow-lg" : "bg-slate-800"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {profileError && (
                <div className="text-red-400 text-sm font-bold text-center bg-red-900/30 py-2 rounded-lg border border-red-500/30">
                  {profileError}
                </div>
              )}
              
              {profileState === "suggest_new" && (
                <div className="text-orange-400 text-sm font-bold text-center bg-orange-900/30 py-3 px-2 rounded-lg border border-orange-500/30">
                   {language === "it" ? "Questo nome è già in uso da un utente in un'altra nazione." : "This name is already in use by a user in another nation."}
                   <br/>
                   {language === "it" ? "Ti suggeriamo: " : "We suggest: "}
                   <button 
                     onClick={() => {
                       setTempUserName(profileSuggestion);
                       setProfileState("idle");
                     }} 
                     className="ml-2 bg-orange-500/20 px-3 py-1 rounded text-orange-300 active:scale-95"
                   >
                     {profileSuggestion}
                   </button>
                </div>
              )}
              
              {profileState === "confirm_existing" && (
                <div className="text-blue-400 text-sm font-bold text-center bg-blue-900/30 py-3 px-2 rounded-lg border border-blue-500/30">
                   {language === "it" ? "Questa combinazione di Nome e Nazione è già registrata. Clicca di nuovo per confermare e collegare questo dispositivo al profilo esistente." : "This Name and Nation combination is already registered. Click again to confirm and link this device to the existing profile."}
                </div>
              )}

              <button
                onClick={() => handleSaveProfile("registration")}
                disabled={profileState === "checking"}
                className={`w-full py-4 mt-4 rounded-xl font-black text-lg uppercase tracking-wider shadow-lg active:scale-95 transition-all ${profileState === "confirm_existing" ? "bg-green-600 hover:bg-green-500 shadow-green-500/20" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"} ${profileState === "checking" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {profileState === "checking" ? "..." : (profileState === "confirm_existing" ? (language === "it" ? "Conferma Profilo" : "Confirm Profile") : (language === "it" ? "Inizia a Giocare" : "Start Playing"))}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-5 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-black italic text-blue-400 uppercase tracking-tight">
                {t.settings}
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 bg-slate-800 rounded-full font-black text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-3 sm:mb-5">
              <button
                onClick={() => setSettingsTab("general")}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors ${settingsTab === "general" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                {language === "it" ? "Generali" : "General"}
              </button>
              <button
                onClick={() => setSettingsTab("account")}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors ${settingsTab === "account" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                Account
              </button>
            </div>

            <div className="space-y-3 sm:space-y-5">
              {settingsTab === "account" && (
                <div className="p-3 sm:p-4 bg-slate-800/40 rounded-2xl sm:rounded-[1.5rem] border border-white/5 space-y-2 sm:space-y-4 animate-in fade-in duration-200">
                  <div className="hidden sm:flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                      Account
                    </span>
                  </div>
                  <div className="space-y-0.5 sm:space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                      {t.yourName}
                    </label>
                    <input
                      value={tempUserName}
                      onChange={(e) => {
                        setTempUserName(e.target.value);
                        setProfileState("idle");
                      }}
                      className="w-full bg-slate-800 p-2 sm:p-3.5 rounded-xl font-bold text-sm sm:text-base border border-white/5 outline-none text-white focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-0.5 sm:space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                      {language === "it" ? "Indirizzo Gmail (Opzionale)" : "Gmail Address (Optional)"}
                    </label>
                    <input
                      value={tempUserEmail}
                      onChange={(e) => {
                        setTempUserEmail(e.target.value);
                        setProfileState("idle");
                      }}
                      placeholder={language === "it" ? "es. tuoindirizzo@gmail.com" : "e.g. youraddress@gmail.com"}
                      className="w-full bg-slate-800 p-2 sm:p-3.5 rounded-xl font-bold text-sm sm:text-base border border-white/5 outline-none text-white focus:border-blue-500"
                    />
                  </div>
                  {(tempUserName.toLowerCase().includes("@gmail.com") || tempUserEmail.toLowerCase().includes("@gmail.com")) && (
                    <div className="flex flex-col items-start gap-1 sm:gap-2 bg-slate-800 p-2 sm:p-3.5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="tester-checkbox-set"
                        checked={tempIsTester}
                        onChange={(e) => {
                           setTempIsTester(e.target.checked);
                           setProfileState("idle");
                        }}
                        className="w-5 h-5 accent-blue-500"
                      />
                      <label htmlFor="tester-checkbox-set" className="text-sm font-bold text-slate-300 select-none">
                        {language === "it" ? "Voglio diventare un tester dell'app" : "I want to become an app tester"}
                      </label></div>
                    <div className="text-[11px] text-emerald-400 font-medium leading-tight ml-8">
                      {language === "it" ? "I tester con indirizzo Gmail verificato avranno tutti i giochi sbloccati gratuitamente!" : 
                       language === "fr" ? "Les testeurs avec une adresse Gmail auront tous les jeux débloqués gratuitement !" :
                       language === "de" ? "Tester mit einer Gmail-Adresse haben alle Spiele kostenlos freigeschaltet!" :
                       language === "es" ? "¡Los probadores con una dirección de Gmail tendrán todos los juegos desbloqueados gratis!" :
                       "Testers with a Gmail address will have all games unlocked for free!"}
                    </div>
                    </div>
                  )}
                  <div className="space-y-0.5 sm:space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                      {language === "it"
                        ? "Paese/Nazione (Opzionale)"
                        : "Country/Nation (Optional)"}
                    </label>
                    <input
                      value={tempUserLocation}
                      onChange={(e) => {
                        setTempUserLocation(e.target.value);
                        setProfileState("idle");
                      }}
                      placeholder={
                        language === "it"
                          ? "es. Bologna/Italia"
                          : "e.g. New York/USA"
                      }
                      className="w-full bg-slate-800 p-2 sm:p-3.5 rounded-xl font-bold text-sm sm:text-base border border-white/5 outline-none text-white focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-0.5 sm:space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                      {language === "it" ? "Lascia un commento" : "Leave a comment"}
                    </label>
                    <input
                      value={tempUserComment}
                      onChange={(e) => {
                        setTempUserComment(e.target.value);
                        setProfileState("idle");
                      }}
                      placeholder={language === "it" ? "Il tuo commento" : "Your comment"}
                      className="w-full bg-slate-800 p-2 sm:p-3.5 rounded-xl font-bold text-sm sm:text-base border border-white/5 outline-none text-white focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-0.5 sm:space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                      {t.language}
                    </label>
                    <div className="relative">
                      <select
                        value={language}
                        onChange={(e) => {
                          setLanguage(e.target.value as Language);
                          localStorage.setItem("wallgo_lang", e.target.value);
                        }}
                        className="w-full bg-slate-800 p-2 sm:p-3.5 rounded-xl font-bold text-sm sm:text-base appearance-none outline-none text-white border border-white/5"
                      >
                        {(["it", "en", "fr", "de", "es"] as Language[]).map(
                          (l) => (
                            <option key={l} value={l}>
                              {l.toUpperCase()}
                            </option>
                          ),
                        )}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>
                  
                  {profileError && (
                    <div className="text-red-400 text-sm font-bold text-center bg-red-900/30 py-2 rounded-lg border border-red-500/30">
                      {profileError}
                    </div>
                  )}
                  
                  {profileState === "suggest_new" && (
                    <div className="text-orange-400 text-sm font-bold text-center bg-orange-900/30 py-3 px-2 rounded-lg border border-orange-500/30">
                       {language === "it" ? "Questo nome è già in uso da un utente in un'altra nazione." : "This name is already in use by a user in another nation."}
                       <br/>
                       {language === "it" ? "Ti suggeriamo: " : "We suggest: "}
                       <button 
                         onClick={() => {
                           setTempUserName(profileSuggestion);
                           setProfileState("idle");
                         }} 
                         className="ml-2 bg-orange-500/20 px-3 py-1 rounded text-orange-300 active:scale-95"
                       >
                         {profileSuggestion}
                       </button>
                    </div>
                  )}
                  
                  {profileState === "confirm_existing" && (
                    <div className="text-blue-400 text-sm font-bold text-center bg-blue-900/30 py-3 px-2 rounded-lg border border-blue-500/30">
                       {language === "it" ? "Questa combinazione di Nome e Nazione è già registrata. Clicca di nuovo per confermare e collegare questo dispositivo al profilo esistente." : "This Name and Nation combination is already registered. Click again to confirm and link this device to the existing profile."}
                    </div>
                  )}

                  {(tempUserName !== userName || tempUserLocation !== userLocation || tempUserComment !== userComment || tempUserEmail !== userEmail || tempIsTester !== isTester || profileState !== "idle") && (
                     <button
                       onClick={() => handleSaveProfile("settings")}
                       disabled={profileState === "checking"}
                       className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 ${profileState === "confirm_existing" ? "bg-green-600 hover:bg-green-500 shadow-green-500/20" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"} ${profileState === "checking" ? "opacity-50 cursor-not-allowed" : ""}`}
                     >
                        {profileState === "checking" ? "..." : (profileState === "confirm_existing" ? (language === "it" ? "Conferma Profilo" : "Confirm Profile") : (language === "it" ? "Salva Profilo" : "Save Profile"))}
                     </button>
                  )}
                </div>
              )}

              {settingsTab === "general" && (
                <div className="space-y-3 sm:space-y-5 animate-in fade-in duration-200">
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      if (gameMode === "orbito") setIsOrbitoRulesOpen(true);
                      else if (gameMode === "pente") setIsPenteRulesOpen(true);
                      else if (gameMode === "shobu") setIsShobuRulesOpen(true);
                      else if (gameMode === "yinsh") setIsYinshRulesOpen(true);
                      else if (gameMode === "onitama") setIsOnitamaRulesOpen(true);
                      else if (gameMode === "baduk") setIsBadukRulesOpen(true);
                      else setIsRulesOpen(true);
                    }}
                    className="w-full py-3.5 bg-blue-600 rounded-xl font-black text-base uppercase tracking-wider shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3"
                  >
                    📖 {t.howToPlay}
                  </button>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-4">
                      <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                        {t.audio || "AUDIO"}
                      </label>
                      <div className="space-y-3 bg-slate-800 p-4 rounded-xl border border-white/5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300 flex justify-between">
                            <span>
                              {(t as any).musicVolume || "Volume Musica"}
                            </span>
                            <span className="text-blue-400">
                              {musicVolume}%
                            </span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={musicVolume}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              setMusicVolume(v);
                              localStorage.setItem(
                                "wallgo_music_volume",
                                v.toString(),
                              );
                            }}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300 flex justify-between">
                            <span>
                              {(t as any).sfxVolume || "Volume Effetti"}
                            </span>
                            <span className="text-blue-400">{sfxVolume}%</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sfxVolume}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              setSfxVolume(v);
                              localStorage.setItem(
                                "wallgo_sfx_volume",
                                v.toString(),
                              );
                            }}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOARD THEME SELECTOR */}
                  {gameMode !== "orbito" && (
                    <>
                      {gameMode === "amazons" ? (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest text-emerald-400">
                            Dimensioni Scacchiera
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setBoardTheme("amazons-10");
                                localStorage.setItem(
                                  "wallgo_theme",
                                  "amazons-10",
                                );
                              }}
                              className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "amazons-10" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              10 x 10
                            </button>
                            <button
                              onClick={() => {
                                setBoardTheme("amazons-8");
                                localStorage.setItem(
                                  "wallgo_theme",
                                  "amazons-8",
                                );
                              }}
                              className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "amazons-8" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              8 x 8
                            </button>
                            <button
                              onClick={() => {
                                setBoardTheme("amazons-6");
                                localStorage.setItem(
                                  "wallgo_theme",
                                  "amazons-6",
                                );
                              }}
                              className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "amazons-6" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              6 x 6
                            </button>
                          </div>
                        </div>
                      ) : gameMode === "abalone" ? (
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest text-emerald-400">
                            {t.boardTheme}
                          </label>
                          <div className="flex items-center gap-2 px-1 mb-1">
                            <input
                              type="checkbox"
                              id="randomAbaloneTheme"
                              checked={isRandomAbaloneTheme}
                              onChange={(e) => {
                                setIsRandomAbaloneTheme(e.target.checked);
                                localStorage.setItem(
                                  "wallgo_abalone_random_theme",
                                  e.target.checked.toString(),
                                );
                              }}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            <label
                              htmlFor="randomAbaloneTheme"
                              className="text-xs font-bold text-slate-300 select-none cursor-pointer"
                            >
                              {language === "it"
                                ? "Mappa casuale"
                                : "Random Map"}
                            </label>
                          </div>
                          {!isRandomAbaloneTheme && (
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setBoardTheme("abalone");
                                    localStorage.setItem(
                                      "wallgo_theme",
                                      "abalone",
                                    );
                                  }}
                                  className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "abalone" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                                >
                                  Classic
                                </button>
                                <button
                                  onClick={() => {
                                    setBoardTheme("abalone-daisy");
                                    localStorage.setItem(
                                      "wallgo_theme",
                                      "abalone-daisy",
                                    );
                                  }}
                                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${boardTheme === "abalone-daisy" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                                >
                                  Belgian Daisy
                                </button>
                                <button
                                  onClick={() => {
                                    setBoardTheme("abalone-dutch");
                                    localStorage.setItem(
                                      "wallgo_theme",
                                      "abalone-dutch",
                                    );
                                  }}
                                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${boardTheme === "abalone-dutch" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                                >
                                  Dutch Daisy
                                </button>
                              </div>
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() => {
                                    setBoardTheme("abalone-domination");
                                    localStorage.setItem(
                                      "wallgo_theme",
                                      "abalone-domination",
                                    );
                                  }}
                                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${boardTheme === "abalone-domination" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                                >
                                  Domination
                                </button>
                                <button
                                  onClick={() => {
                                    setBoardTheme("abalone-infiltration");
                                    localStorage.setItem(
                                      "wallgo_theme",
                                      "abalone-infiltration",
                                    );
                                  }}
                                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${boardTheme === "abalone-infiltration" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                                >
                                  Infiltration
                                </button>
                                <button
                                  onClick={() => {
                                    setBoardTheme("abalone-wall");
                                    localStorage.setItem(
                                      "wallgo_theme",
                                      "abalone-wall",
                                    );
                                  }}
                                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${boardTheme === "abalone-wall" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                                >
                                  The Wall
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : gameMode === "shobu" ? (
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest text-emerald-400">
                            {t.boardTheme}
                          </label>
                          <div className="flex items-center gap-2 px-1 mb-1">
                            <button
                              onClick={() => {
                                setBoardTheme("shobu");
                                localStorage.setItem(
                                  "wallgo_theme",
                                  "shobu",
                                );
                              }}
                              className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "shobu" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              Classico
                            </button>
                            <button
                              onClick={() => {
                                setBoardTheme("shobu-scacchiera");
                                localStorage.setItem(
                                  "wallgo_theme",
                                  "shobu-scacchiera",
                                );
                              }}
                              className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "shobu-scacchiera" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              Scacchiera
                            </button>
                          </div>
                        </div>
                      ) : gameMode === "onitama" ? (
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest text-emerald-400">
                            {t.boardTheme}
                          </label>
                          <div className="flex items-center gap-2 px-1 mb-1">
                            <button
                              onClick={() => {
                                setBoardTheme("onitama-dark");
                                localStorage.setItem(
                                  "wallgo_theme",
                                  "onitama-dark",
                                );
                              }}
                              className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "onitama-dark" || boardTheme.indexOf("onitama") === -1 ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              Tema Scuro
                            </button>
                            <button
                              onClick={() => {
                                setBoardTheme("onitama-light");
                                localStorage.setItem(
                                  "wallgo_theme",
                                  "onitama-light",
                                );
                              }}
                              className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "onitama-light" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              Tema Chiaro
                            </button>
                          </div>
                        </div>
                      ) : gameMode === "baduk" ? (
                        <>
                          <div className="space-y-1.5 flex flex-col mb-4">
                            <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest text-emerald-400">
                              Stile Pietre
                            </label>
                            <div className="flex items-center gap-2 px-1 mb-1">
                              <button
                                onClick={() => {
                                  setBadukStoneColor("neon");
                                  localStorage.setItem("wallgo_baduk_stone_color", "neon");
                                }}
                                className={`flex-1 py-2 rounded-xl font-bold transition-colors border ${badukStoneColor === "neon" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                              >
                                Neon
                              </button>
                              <button
                                onClick={() => {
                                  setBadukStoneColor("classic");
                                  localStorage.setItem("wallgo_baduk_stone_color", "classic");
                                }}
                                className={`flex-1 py-2 rounded-xl font-bold transition-colors border ${badukStoneColor === "classic" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                              >
                                Classico
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5 flex flex-col">
                            <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest text-emerald-400">
                              Dimensione (Tema)
                            </label>
                            <div className="flex items-center gap-2 px-1 mb-1">
                            <button
                              onClick={() => {
                                setBoardTheme("baduk-9");
                                localStorage.setItem("wallgo_theme", "baduk-9");
                              }}
                              className={`flex-1 py-2 rounded-xl font-bold transition-colors border ${(boardTheme === "baduk-9" || !boardTheme.startsWith("baduk")) ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              9x9
                            </button>
                            <button
                              onClick={() => {
                                setBoardTheme("baduk-13");
                                localStorage.setItem("wallgo_theme", "baduk-13");
                              }}
                              className={`flex-1 py-2 rounded-xl font-bold transition-colors border ${boardTheme === "baduk-13" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              13x13
                            </button>
                            <button
                              onClick={() => {
                                setBoardTheme("baduk-19");
                                localStorage.setItem("wallgo_theme", "baduk-19");
                              }}
                              className={`flex-1 py-2 rounded-xl font-bold transition-colors border ${boardTheme === "baduk-19" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              19x19
                            </button>
                          </div>
                        </div>
                        </>
                      ) : gameMode === "stratego" ? (
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest text-emerald-400">
                            {t.boardTheme}
                          </label>
                          <div className="flex items-center gap-2 px-1 mb-1">
                            <button
                              onClick={() => {
                                setBoardTheme("stratego-classic");
                                localStorage.setItem("wallgo_theme", "stratego-classic");
                              }}
                              className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "stratego-classic" || !boardTheme.startsWith("stratego") ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              {language === "it" ? "Classico" : "Classic"}
                            </button>
                            <button
                              onClick={() => {
                                setBoardTheme("stratego-dark");
                                localStorage.setItem("wallgo_theme", "stratego-dark");
                              }}
                              className={`flex-1 py-3 rounded-xl font-bold transition-colors border ${boardTheme === "stratego-dark" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-transparent text-slate-400"}`}
                            >
                              {language === "it" ? "Campale Scuro" : "Dark Field"}
                            </button>
                          </div>
                        </div>
                      ) : gameMode === "dominio" ? (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                            {t.boardTheme}
                          </label>
                          <div className="relative">
                            <select
                              value={boardTheme}
                              onChange={(e) => {
                                const th = e.target.value as BoardTheme;
                                setBoardTheme(th);
                                localStorage.setItem("wallgo_theme", th);
                              }}
                              className="w-full bg-slate-800 p-3.5 rounded-xl font-bold appearance-none outline-none text-white border border-white/5 focus:border-blue-500 capitalize"
                            >
                              <option value="neon">{t.themeNeon}</option>
                              <option value="islands">
                                {t.themeIslands}
                              </option>
                              <option value="desert">{t.themeDesert}</option>
                              <option value="hourglass">
                                {(t as any).themeHourglass || "Hourglass"}
                              </option>
                              <option value="bridge">
                                {(t as any).themeBridge || "Bridge"}
                              </option>
                              <option value="hammer">
                                {(t as any).themeHammer || "Hammer"}
                              </option>
                              <option value="arena">
                                {(t as any).themeArena || "Arena"}
                              </option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-xs">
                              ▼
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}

                  {gameMode === "dominio" && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                          {t.strategyToggle}
                        </label>
                        <button
                          onClick={() => {
                            const v = !isStrategyEnabled;
                            setIsStrategyEnabled(v);
                            localStorage.setItem(
                              "wallgo_strategy_enabled",
                              v.toString(),
                            );
                          }}
                          className={`w-full py-3.5 rounded-xl font-black text-xs border transition-all active:scale-95 ${isStrategyEnabled ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-slate-800 border-white/5 text-slate-400"}`}
                        >
                          {isStrategyEnabled ? t.enabled : t.disabled}
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">
                          {(t as any).startingPlayerToggle}
                        </label>
                        <button
                          onClick={() => {
                            const v = !isStartingPreferenceEnabled;
                            setIsStartingPreferenceEnabled(v);
                            localStorage.setItem(
                              "wallgo_enableStartingPref",
                              v.toString(),
                            );
                          }}
                          className={`w-full py-3.5 rounded-xl font-black text-xs border transition-all active:scale-95 ${isStartingPreferenceEnabled ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-slate-800 border-white/5 text-slate-400"}`}
                        >
                          {isStartingPreferenceEnabled ? t.enabled : t.disabled}
                        </button>
                      </div>
                    </>
                  )}

                  <div className="p-4 bg-slate-800/40 rounded-[1.5rem] border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {t.appInfo}
                      </span>
                      <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                        {APP_VERSION}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        Logger.info("Controllo aggiornamenti in corso...");
                        if (Capacitor.isNativePlatform()) {
                          if (
                            window.confirm(
                              language === "it"
                                ? "Verrai reindirizzato al Play Store per scaricare l'ultimo aggiornamento. Vuoi procedere?"
                                : "You will be redirected to the Play Store to download the latest update. Do you want to proceed?",
                            )
                          ) {
                            window.open("https://play.google.com/apps/internaltest/4701630510403699104", "_system");
                          }
                        } else {
                          if (
                            window.confirm(
                              language === "it"
                                ? "Vuoi cercare e installare l'ultimo aggiornamento disponibile? L'app verrà riavviata."
                                : "Do you want to check and install the latest available update? The app will restart.",
                            )
                          ) {
                            window.location.reload();
                          }
                        }
                      }}
                      className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-400 rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                      🔄{" "}
                      {language === "it"
                        ? "Cerca Aggiornamenti"
                        : "Check for Updates"}
                    </button>

                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase mb-0.5">
                          Studio
                        </span>
                        <span className="text-sm font-black text-white">
                          {DEVELOPER_NAME}
                        </span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-500 uppercase mb-0.5">
                          {language === "it" ? "Supporto :" : "Support :"}
                        </span>
                        <a
                          href={`mailto:${SUPPORT_EMAIL}`}
                          className="text-blue-400 font-black text-[10px] underline"
                        >
                          {SUPPORT_EMAIL}
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setIsPrivacyOpen(true);
                        }}
                        className="flex-1 py-2.5 bg-slate-700/30 hover:bg-slate-700/50 transition-colors rounded-xl text-[8px] font-black uppercase tracking-[0.15em] text-slate-300 border border-white/5"
                      >
                        {t.privacyPolicy}
                      </button>
                      <button
                        onClick={async () => {
                          setShowDebugLogs(true);
                          Logger.info("Test connessione Firebase in corso...");
                          try {
                            if (!deviceId)
                              throw new Error("Device ID non trovato");
                            const testDoc = doc(db, "devices", deviceId);
                            await setDoc(
                              testDoc,
                              { lastActive: new Date().toISOString() },
                              { merge: true },
                            );
                            Logger.info(
                              `✅ Firebase OK: Connessione riuscita!`,
                            );
                          } catch (e: any) {
                            Logger.error(`❌ Errore Firebase: ${e.message}`);
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-[0.05em] border transition-colors bg-orange-600 border-orange-500 text-white`}
                      >
                        Test Firebase 🔥
                      </button>
                      <button
                        onClick={() => setShowDebugLogs(true)}
                        className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-[0.05em] border transition-colors ${showDebugLogs ? "bg-amber-600 border-amber-500 text-white" : "bg-slate-700/30 text-slate-400 border-white/5"}`}
                      >
                        Debug 🐞
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isRulesOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-blue-400 uppercase tracking-tight">
                {t.howToPlay}
              </h2>
              <button
                onClick={() => setIsRulesOpen(false)}
                className="w-8 h-8 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <h3 className="text-sm font-black text-emerald-400 uppercase mb-2 tracking-wider">
                  🎯{" "}
                  {gameMode === "hex"
                    ? ((t as any).hex_objective || "").split(":")[0]
                    : gameMode === "chain_triangle"
                      ? ((t as any).chain_triangle_objective || "").split(":")[0]
                      : gameMode === "corsa"
                        ? t.fuga_objective.split(":")[0]
                        : gameMode === "amazons"
                          ? ((t as any).amazons_objective || "").split(":")[0]
                          : gameMode === "domineering"
                            ? ((t as any).domineering_objective || "").split(
                                ":",
                              )[0]
                            : gameMode === "abalone"
                              ? ((t as any).abalone_objective || "").split(":")[0]
                              : t.dominio_objective.split(":")[0]}
                </h3>
                <p className="text-sm font-bold text-slate-300 leading-relaxed">
                  {gameMode === "hex"
                    ? ((t as any).hex_objective || "").split(":")[1] ||
                      (t as any).hex_objective
                    : gameMode === "chain_triangle"
                      ? ((t as any).chain_triangle_objective || "").split(":")[1] ||
                        (t as any).chain_triangle_objective
                      : gameMode === "corsa"
                        ? t.fuga_objective.split(":")[1] || t.fuga_objective
                        : gameMode === "amazons"
                          ? ((t as any).amazons_objective || "").split(":")[1] ||
                            (t as any).amazons_objective
                          : gameMode === "domineering"
                            ? ((t as any).domineering_objective || "").split(
                                ":",
                              )[1] || (t as any).domineering_objective
                            : gameMode === "abalone"
                              ? ((t as any).abalone_objective || "").split(
                                  ":",
                                )[1] || (t as any).abalone_objective
                              : t.dominio_objective.split(":")[1] ||
                                t.dominio_objective}
                </p>
              </div>

              <div className="space-y-4">
                {gameMode === "hex"
                  ? [
                        (t as any).hex_rules_1,
                        (t as any).hex_rules_2,
                        (t as any).hex_rules_3,
                        (t as any).hex_rules_4,
                        (t as any).hex_rules_5,
                      ].map((rule, idx) => (
                        <div key={idx} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-black text-sm shrink-0 border border-purple-500/30">
                            {idx + 1}
                          </div>
                          <div className="space-y-1 w-full">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                              {rule && rule.includes(":")
                                ? rule.split(":")[0]
                                : `Rule ${idx + 1}`}
                            </h4>
                            <p className="text-sm font-bold text-white leading-relaxed">
                              {rule && rule.includes(":")
                                ? rule.split(":")[1]
                                : rule}
                            </p>
                          </div>
                        </div>
                      ))
                  : gameMode === "chain_triangle"
                    ? [
                        (t as any).chain_triangle_rules_1,
                        (t as any).chain_triangle_rules_2,
                        (t as any).chain_triangle_rules_3,
                        (t as any).chain_triangle_rules_4,
                        (t as any).chain_triangle_rules_5,
                      ].map((rule, idx) => (
                        <div key={idx} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-full bg-yellow-600/20 text-yellow-500 flex items-center justify-center font-black text-sm shrink-0 border border-yellow-500/30">
                            {idx + 1}
                          </div>
                          <div className="space-y-1 w-full">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                              {rule && rule.includes(":")
                                ? rule.split(":")[0]
                                : `Rule ${idx + 1}`}
                            </h4>
                            <p className="text-sm font-bold text-white leading-relaxed">
                              {rule && rule.includes(":")
                                ? rule.split(":")[1]
                                : rule}
                            </p>
                          </div>
                        </div>
                      ))
                  : gameMode === "corsa"
                    ? [
                        t.fuga_rules_1,
                        t.fuga_rules_2,
                        t.fuga_rules_3,
                        t.fuga_rules_4,
                        t.fuga_rules_5,
                      ].map((rule, idx) => (
                        <div key={idx} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm shrink-0 border border-blue-500/30">
                            {idx + 1}
                          </div>
                          <div className="space-y-1 w-full">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                              {rule.includes(":")
                                ? rule.split(":")[0]
                                : `Rule ${idx + 1}`}
                            </h4>
                            <p className="text-sm font-bold text-white leading-relaxed">
                              {rule.includes(":") ? rule.split(":")[1] : rule}
                            </p>
                          </div>
                        </div>
                      ))
                    : gameMode === "amazons"
                      ? [
                            (t as any).amazons_rules_1,
                            (t as any).amazons_rules_2,
                            (t as any).amazons_rules_3,
                            (t as any).amazons_rules_4,
                            (t as any).amazons_rules_5,
                            (t as any).amazons_rules_6,
                          ].map((rule, idx) => (
                            <div key={idx} className="flex gap-4 items-start">
                              <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-black text-sm shrink-0 border border-purple-500/30">
                                {idx + 1}
                              </div>
                              <div className="space-y-1 w-full">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                  {rule && rule.includes(":")
                                    ? rule.split(":")[0]
                                    : `Rule ${idx + 1}`}
                                </h4>
                                <p className="text-sm font-bold text-white leading-relaxed">
                                  {rule && rule.includes(":")
                                    ? rule.split(":")[1]
                                    : rule}
                                </p>
                              </div>
                            </div>
                          ))
                      : gameMode === "domineering"
                        ? [
                            (t as any).domineering_rules_1,
                            (t as any).domineering_rules_2,
                            (t as any).domineering_rules_3,
                            (t as any).domineering_rules_4,
                            (t as any).domineering_rules_5,
                            (t as any).domineering_rules_6,
                          ].map((rule, idx) => (
                            <div key={idx} className="flex gap-4 items-start">
                              <div className="w-8 h-8 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center font-black text-sm shrink-0 border border-rose-500/30">
                                {idx + 1}
                              </div>
                              <div className="space-y-1 w-full">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                  {rule && rule.includes(":")
                                    ? rule.split(":")[0]
                                    : `Rule ${idx + 1}`}
                                </h4>
                                <p className="text-sm font-bold text-white leading-relaxed">
                                  {rule && rule.includes(":")
                                    ? rule.split(":")[1]
                                    : rule}
                                </p>
                              </div>
                            </div>
                          ))
                        : gameMode === "abalone"
                          ? [
                              (t as any).abalone_rules_1,
                              (t as any).abalone_rules_2,
                              (t as any).abalone_rules_3,
                              (t as any).abalone_rules_4,
                              (t as any).abalone_rules_5,
                            ].map((rule, idx) => (
                              <div key={idx} className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-slate-600/20 text-slate-200 flex items-center justify-center font-black text-sm shrink-0 border border-slate-500/30">
                                  {idx + 1}
                                </div>
                                <div className="space-y-1 w-full">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                    {rule && rule.includes(":")
                                      ? rule.split(":")[0]
                                      : `Rule ${idx + 1}`}
                                  </h4>
                                  <p className="text-sm font-bold text-white leading-relaxed">
                                    {rule && rule.includes(":")
                                      ? rule.split(":")[1]
                                      : rule}
                                  </p>
                                </div>
                              </div>
                            ))
                          : [
                              t.dominio_rules_1,
                              t.dominio_rules_2,
                              t.dominio_rules_3,
                              t.dominio_rules_4,
                              t.dominio_rules_5,
                            ].map((rule, idx) => (
                              <div key={idx} className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm shrink-0 border border-blue-500/30">
                                  {idx + 1}
                                </div>
                                <div className="space-y-1 w-full">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                    {rule.includes(":")
                                      ? rule.split(":")[0]
                                      : `Rule ${idx + 1}`}
                                  </h4>
                                  <p className="text-sm font-bold text-white leading-relaxed">
                                    {rule.includes(":")
                                      ? rule.split(":")[1]
                                      : rule}
                                  </p>

                                  {idx === 1 && (
                                    <div className="mt-3 bg-slate-800/80 rounded-xl p-4 border border-white/10 flex justify-center items-center">
                                      <svg
                                        viewBox="0 0 200 120"
                                        className="w-full max-w-[200px] h-auto drop-shadow-lg"
                                      >
                                        {/* Grid Background */}
                                        <path
                                          d="M40,20 L160,20 M40,60 L160,60 M40,100 L160,100 M60,10 L60,110 M100,10 L100,110 M140,10 L140,110"
                                          stroke="#334155"
                                          strokeWidth="2"
                                          strokeDasharray="4 4"
                                        />

                                        <defs>
                                          <filter
                                            id="glow"
                                            x="-50%"
                                            y="-50%"
                                            width="200%"
                                            height="200%"
                                          >
                                            <feGaussianBlur
                                              stdDeviation="2"
                                              result="blur"
                                            />
                                            <feMerge>
                                              <feMergeNode in="blur" />
                                              <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                          </filter>
                                        </defs>

                                        {/* Suggested Squares (Highlights) */}
                                        <rect
                                          x="62"
                                          y="22"
                                          width="36"
                                          height="36"
                                          rx="4"
                                          fill="#10b981"
                                          fillOpacity="0.2"
                                          stroke="#34d399"
                                          strokeWidth="2"
                                          strokeDasharray="2 2"
                                        />
                                        <rect
                                          x="102"
                                          y="22"
                                          width="36"
                                          height="36"
                                          rx="4"
                                          fill="#10b981"
                                          fillOpacity="0.2"
                                          stroke="#34d399"
                                          strokeWidth="2"
                                          strokeDasharray="2 2"
                                        />
                                        <rect
                                          x="102"
                                          y="62"
                                          width="36"
                                          height="36"
                                          rx="4"
                                          fill="#10b981"
                                          fillOpacity="0.2"
                                          stroke="#34d399"
                                          strokeWidth="2"
                                          strokeDasharray="2 2"
                                        />
                                        <rect
                                          x="62"
                                          y="62"
                                          width="36"
                                          height="36"
                                          rx="4"
                                          fill="#10b981"
                                          fillOpacity="0.2"
                                          stroke="#34d399"
                                          strokeWidth="2"
                                          strokeDasharray="2 2"
                                        />

                                        {/* Movement Dots (Pallini) */}
                                        <circle
                                          cx="80"
                                          cy="40"
                                          r="5"
                                          fill="#60a5fa"
                                          stroke="white"
                                          strokeWidth="1.5"
                                          filter="url(#glow)"
                                          className="animate-pulse"
                                        />
                                        <circle
                                          cx="120"
                                          cy="40"
                                          r="5"
                                          fill="#60a5fa"
                                          stroke="white"
                                          strokeWidth="1.5"
                                          filter="url(#glow)"
                                          className="animate-pulse"
                                        />
                                        <circle
                                          cx="120"
                                          cy="80"
                                          r="5"
                                          fill="#60a5fa"
                                          stroke="white"
                                          strokeWidth="1.5"
                                          filter="url(#glow)"
                                          className="animate-pulse"
                                        />
                                        <circle
                                          cx="80"
                                          cy="80"
                                          r="5"
                                          fill="#60a5fa"
                                          stroke="white"
                                          strokeWidth="1.5"
                                          filter="url(#glow)"
                                          className="animate-pulse"
                                        />

                                        {/* Central Piece */}
                                        <circle
                                          cx="80"
                                          cy="80"
                                          r="12"
                                          fill="#3b82f6"
                                          stroke="#60a5fa"
                                          strokeWidth="2"
                                        />
                                        <circle
                                          cx="80"
                                          cy="76"
                                          r="12"
                                          fill="#60a5fa"
                                        />
                                        <circle
                                          cx="80"
                                          cy="76"
                                          r="6"
                                          fill="#93c5fd"
                                        />

                                        {/* Movement Arrow */}
                                        <path
                                          d="M80,68 L80,45 Q80,40 85,40 L112,40"
                                          fill="none"
                                          stroke="#f59e0b"
                                          strokeWidth="3"
                                          strokeLinecap="round"
                                        />
                                        <polygon
                                          points="112,35 120,40 112,45"
                                          fill="#f59e0b"
                                        />

                                        {/* Selection Indicator */}
                                        <circle
                                          cx="80"
                                          cy="80"
                                          r="16"
                                          fill="none"
                                          stroke="#fbbf24"
                                          strokeWidth="2"
                                          strokeDasharray="4 4"
                                          className="animate-[spin_4s_linear_infinite]"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
              </div>

              {gameMode === "corsa" || gameMode === "dominio" ? (
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-blue-500/30 mt-6 shrink-0">
                  <h3 className="text-sm font-black text-blue-400 uppercase mb-3 tracking-wider">
                    🎮{" "}
                    {language === "it"
                      ? "Gestione Fasi & Comandi"
                      : "Phases & Controls"}
                  </h3>
                  <ul className="space-y-4 text-sm font-bold text-slate-300 leading-relaxed list-none">
                    <li className="flex gap-2 relative">
                      <span className="text-xl">⏱️</span>
                      <div>
                        <span className="text-amber-400 uppercase tracking-widest text-xs block mb-1">
                          {language === "it" ? "Fasi del Turno" : "Turn Phases"}
                        </span>
                        {gameMode === "corsa"
                          ? language === "it"
                            ? "Nel tuo turno puoi fare UNA SOLA azione: Muovere la pedina OPPURE Piazzare un muro."
                            : "On your turn you can do ONLY ONE action: Move your piece OR Place a wall."
                          : language === "it"
                            ? "Nel tuo turno DEVI fare due azioni in sequenza: prima Muovere una pedina, POI piazzare un muro."
                            : "On your turn you MUST do two actions in sequence: first Move a piece, THEN place a wall."}
                      </div>
                    </li>
                    <li className="flex gap-2 relative">
                      <span className="text-xl">👇</span>
                      <div>
                        <span className="text-pink-400 uppercase tracking-widest text-xs block mb-1">
                          {language === "it"
                            ? "Selezione & Deselezione"
                            : "Select & Unselect"}
                        </span>
                        {language === "it"
                          ? "Tocca la tua pedina per mostrare mosse e muri validi. Per deselezionarla, basta toccare un'altra pedina o una cella vuota qualsiasi."
                          : "Tap your piece to see valid moves and walls. To unselect, just tap another piece or any empty cell."}
                      </div>
                    </li>
                    {gameMode !== "corsa" && (
                      <li className="flex gap-2 relative">
                        <span className="text-xl">🔨</span>
                        <div>
                          <span className="text-emerald-400 uppercase tracking-widest text-xs block mb-1">
                            Wallbreaker
                          </span>
                          {language === "it"
                            ? "Non vedi subito il bottone! Se sei intrappolato, tocca la TUA pedina: comparirà il pulsante rosso per attivare il Wallbreaker."
                            : "You won't see the button right away! If you are completely trapped, tap YOUR piece: a red button will appear to activate the Wallbreaker."}
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              ) : gameMode === "amazons" ? (
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-purple-500/30 mt-6 shrink-0">
                  <h3 className="text-sm font-black text-purple-400 uppercase mb-3 tracking-wider">
                    🎮{" "}
                    {language === "it"
                      ? "Gestione Fasi & Comandi"
                      : "Phases & Controls"}
                  </h3>
                  <ul className="space-y-4 text-sm font-bold text-slate-300 leading-relaxed list-none">
                    <li className="flex gap-2 relative">
                      <span className="text-xl">⏱️</span>
                      <div>
                        <span className="text-amber-400 uppercase tracking-widest text-xs block mb-1">
                          {language === "it" ? "Fasi del Turno" : "Turn Phases"}
                        </span>
                        {language === "it"
                          ? "Nel tuo turno DEVI fare due azioni in sequenza: prima Muovere una pedina, POI scoccare una freccia per bruciare una casella."
                          : "On your turn you MUST do two actions in sequence: first Move a piece, THEN shoot an arrow to burn a cell."}
                      </div>
                    </li>
                    <li className="flex gap-2 relative">
                      <span className="text-xl">👇</span>
                      <div>
                        <span className="text-pink-400 uppercase tracking-widest text-xs block mb-1">
                          {language === "it" ? "Selezione" : "Selection"}
                        </span>
                        {language === "it"
                          ? "Tocca una tua pedina per vedere le mosse disponibili. Dopo esserti mosso, tocca una casella per scoccare la freccia in quella cella dal punto in cui ti sei mosso."
                          : "Tap your piece to see available moves. After moving, tap a cell to shoot an arrow into it from your new position."}
                      </div>
                    </li>
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex justify-center pb-2">
              <a 
                href={`https://www.youtube.com/results?search_query=how+to+play+${
                  gameMode === "corsa" ? "quoridor" :
                  gameMode === "amazons" ? "game+of+the+amazons" :
                  gameMode === "chain_triangle" ? "chain+triangle" :
                  gameMode
                }+board+game`}
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-red-600/10 w-full hover:bg-red-600/20 border border-red-500/30 text-red-100/90 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
              >
                <svg className="w-6 h-6 text-red-500 shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>{t.searchTutorialVideo}</span>
              </a>
            </div>

            <button
              onClick={() => {
                setIsRulesOpen(false);
                setHistoryMode(gameMode);
                setIsHistoryOpen(true);
              }}
              className="w-full mt-8 py-3 bg-slate-800 rounded-2xl font-black text-sm text-orange-400 border border-orange-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {language === "it" ? "STORIA / CURIOSITÀ" : "HISTORY / TRIVIA"}
            </button>

            <button
              onClick={() => {
                setIsRulesOpen(false);
                setSettingsTab("general");
                setIsSettingsOpen(true);
              }}
              className="w-full mt-4 py-4 bg-slate-800 text-white rounded-xl font-black text-base uppercase tracking-wider shadow-lg active:scale-95 transition-transform hover:bg-slate-700 border border-white/5"
            >
              ⬅ {t.settings}
            </button>
          </div>
        </div>
      )}
      {isHistoryOpen && historyMode && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-2xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl border border-orange-500/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-orange-400 uppercase tracking-tight flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {historyData[historyMode] ? (language === "it" ? "Storia / Curiosità" : "History / Trivia") : (language === "it" ? "Ops..." : "Oops...")}
              </h2>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="w-8 h-8 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
              {historyData[historyMode] ? (
                historyData[historyMode][language] || historyData[historyMode].en
              ) : (
                <div className="text-center text-slate-400 py-10 font-bold">
                  {language === "it" ? "Nessuna informazione storica disponibile per questo gioco." : "No historical information available for this game."}
                </div>
              )}
              {(() => {
                const isUnlocked = 
                  isModeUnlocked(historyMode);
                
                if (!isUnlocked) {
                  return (
                    <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col items-center">
                      <div className="w-full sm:w-auto flex flex-col items-center gap-3">
                        <input
                          type="text"
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 font-bold uppercase text-center focus:border-green-500 focus:outline-none transition-colors"
                          placeholder={language === "it" ? "INSERISCI PASSWORD" : "ENTER PASSWORD"}
                          value={unlockPassword}
                          onChange={(e) => setUnlockPassword(e.target.value.toUpperCase())}
                        />
                        <button 
                          onClick={(e) => {
                            const pwd = unlockPassword;
                            
                            if (pwd) {
                              const infoMapping: Record<string, string> = {
                                'dominio': "Wall Go AI",
                                'corsa': "Quoridor",
                                'amazons': "Amazons",
                                'domineering': "Domineering",
                                'abalone': "Abalone",
                                'hex': "Hex",
                                'orbito': "Orbito",
                                'pente': "Pente",
                                'chain_triangle': "Chain Triangle",
                                'shobu': "Shobu",
                                'yinsh': "Yinsh",
                                'onitama': "Onitama",
                                'baduk': "Baduk / Go"
                              };
                              const gameName = historyMode ? (infoMapping[historyMode] || historyMode) : "Unknown";
                              const today = new Date();
                              const yyyy = today.getFullYear();
                              const mm = String(today.getMonth() + 1).padStart(2, '0');
                              const dd = String(today.getDate()).padStart(2, '0');
                              const gamePrefix = gameName.substring(0, 3).toUpperCase();
                              const expectedPassword = `${yyyy}${gamePrefix}${mm}${dd}`;

                              if (pwd.toUpperCase() === expectedPassword || pwd.toLowerCase() === "wallgo2026" || pwd.toLowerCase() === "zioseb2026" || pwd.toLowerCase() === "sblocca") { 
                                 handleUnlockGameWithoutCost(historyMode);
                                 setUnlockPassword("");
                              } else {
                                 setUnlockPassword(""); // Clear on fail
                                 const pwdInput = e.currentTarget.parentElement?.querySelector('input');
                                 if (pwdInput) {
                                  pwdInput.placeholder = language === "it" ? "PASSWORD ERRATA!" : "WRONG PASSWORD!";
                                  setTimeout(() => {
                                      if (pwdInput) pwdInput.placeholder = language === "it" ? "INSERISCI PASSWORD" : "ENTER PASSWORD";
                                  }, 2000);
                                 }
                              }
                            }
                          }}
                          disabled={!unlockPassword}
                          className={`py-3 px-6 rounded-xl font-bold uppercase tracking-wider transition-colors border w-full sm:w-auto ${
                            unlockPassword 
                              ? "bg-slate-800 text-green-400 hover:bg-slate-700 border-green-500/30" 
                              : "bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed"
                          }`}
                        >
                           {language === "it" ? "Sblocca gioco senza punti (Password)" : "Unlock game without points (Password)"}
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <button
              onClick={() => setIsHistoryOpen(false)}
              className="w-full mt-6 py-4 bg-orange-600/20 text-orange-400 rounded-xl font-black text-base uppercase tracking-wider shadow-lg active:scale-95 transition-transform hover:bg-orange-600/30 border border-orange-500/30"
            >
              {language === "it" ? "CHIUDI" : "CLOSE"}
            </button>
          </div>
        </div>
      )}
      {isOrbitoRulesOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-blue-400 uppercase tracking-tight">
                Orbito - {language === "it" ? "Come si gioca" : language === "fr" ? "Comment jouer" : language === "de" ? "Spielanleitung" : language === "es" ? "Cómo jugar" : "How to Play"}
              </h2>
              <button
                onClick={() => {
                  setIsOrbitoRulesOpen(false);
                  handleGameModeChange("orbito");
                  setBoardTheme("orbito");
                  setPlayerCount(2);
                }}
                className="w-8 h-8 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <h3 className="text-sm font-black text-emerald-400 uppercase mb-2 tracking-wider">
                  🎯{" "}
                  {language === "it" ? "OBIETTIVO ORBITO" 
                   : language === "fr" ? "OBJECTIF ORBITO" 
                   : language === "de" ? "ORBITO ZIEL" 
                   : language === "es" ? "OBJETIVO ORBITO" 
                   : "ORBITO OBJECTIVE"}
                </h3>
                <p className="text-sm font-bold text-slate-300 leading-relaxed">
                  {language === "it"
                    ? "Essere il primo ad allineare 4 biglie del proprio colore in orizzontale, verticale o diagonale."
                    : language === "fr"
                    ? "Être le premier à aligner 4 de ses billes horizontalement, verticalement ou diagonalement."
                    : language === "de"
                    ? "Als Erster 4 Murmeln der eigenen Farbe horizontal, vertikal oder diagonal anordnen."
                    : language === "es"
                    ? "Ser el primero en alinear 4 canicas de tu color en horizontal, vertical o diagonal."
                    : "Be the first to align 4 of your marbles horizontally, vertically, or diagonally."}
                </p>
              </div>

              <div className="space-y-4">
                {(
                  language === "it" ? [
                      "1. La Preparazione: Il tabellone è una griglia 4x4 con dei binari circolari (un anello esterno e uno interno). Ogni giocatore sceglie un colore (bianco o nero).",
                      "2. Il Turno di Gioco (Posizionamento): Posizioni una tua biglia in uno dei posti vuoti sul tabellone.",
                      "3. Regola Speciale: Prima di posizionare la tua biglia, puoi scegliere di spostare una delle biglie dell'avversario in uno spazio adiacente (orizzontalmente o verticalmente), a patto che quello spazio sia vuoto.",
                      "4. L'Orbita: Dopo aver mosso, devi premere il pulsante centrale del tabellone. Questo farà scorrere tutte le biglie di una posizione lungo il loro percorso circolare.",
                      "5. Come si vince?: Si vince se, DOPO aver premuto il pulsante dell'Orbita e aver concluso il movimento delle biglie, si ottiene un allineamento di 4 biglie del proprio colore. A differenza del Forza 4 tradizionale, non devi guardare dove sono le biglie adesso, ma dove saranno dopo la rotazione.",
                  ] : language === "fr" ? [
                      "1. La Préparation : Le plateau est une grille 4x4 avec des pistes circulaires (un anneau extérieur et un anneau intérieur). Chaque joueur choisit une couleur.",
                      "2. Le Tour de Jeu (Placement) : Placez votre bille sur n'importe quel emplacement vide du plateau.",
                      "3. Règle Spéciale : Avant de placer votre bille, vous pouvez choisir de déplacer l'une des billes de l'adversaire vers un espace adjacent (horizontalement ou verticalement), à condition que cet espace soit vide.",
                      "4. L'Orbite : Après avoir joué, vous devez appuyer sur le bouton central du plateau. Cela fera glisser toutes les billes d'une position le long de leur parcours circulaire.",
                      "5. Comment Gagner : Vous gagnez si, APRÈS avoir appuyé sur le bouton Orbite et que les billes ont fini de bouger, vous obtenez un alignement de 4 de vos billes. Contrairement au Puissance 4 classique, vous devez imaginer où seront les billes après la rotation.",
                  ] : language === "de" ? [
                      "1. Vorbereitung: Das Spielfeld ist ein 4x4 Gitter mit kreisförmigen Bahnen (einem äußeren und einem inneren Ring). Jeder Spieler wählt eine Farbe.",
                      "2. Spielzug (Platzieren): Platziere deine Murmel auf einem beliebigen leeren Feld auf dem Brett.",
                      "3. Sonderregel: Bevor du deine Murmel platzierst, kannst du optional eine gegnerische Murmel auf ein angrenzendes leeres Feld (horizontal oder vertikal) verschieben.",
                      "4. Die Umlaufbahn: Nach dem Zug musst du den Knopf in der Mitte des Spielfelds drücken. Dadurch rutschen alle Murmeln um eine Position auf ihrer kreisförmigen Bahn weiter.",
                      "5. Wie Man Gewinnt: Du gewinnst, wenn du, NACHDEM du den Orbit-Knopf gedrückt hast und die Murmeln zum Stehen gekommen sind, 4 deiner Murmeln in einer Reihe hast. Im Gegensatz zu herkömmlichem Vier Gewinnt musst du überlegen, wo die Murmeln nach der Drehung sein werden.",
                  ] : language === "es" ? [
                      "1. La Preparación: El tablero es una cuadrícula 4x4 con pistas circulares (un anillo exterior y otro interior). Cada jugador elige un color.",
                      "2. El Turno (Colocación): Coloca tu canica en cualquier espacio vacío del tablero.",
                      "3. Regla Especial: Antes de colocar tu canica, puedes elegir mover una de las canicas del oponente a un espacio adyacente (horizontal o vertical), siempre y cuando ese espacio esté vacío.",
                      "4. La Órbita: Después de mover, debes presionar el botón central del tablero. Esto hará que todas las canicas se deslicen una posición a lo largo de su ruta circular.",
                      "5. Cómo Ganar: Ganas si, DESPUÉS de presionar el botón Órbita y que las canicas dejen de moverse, tienes una alineación de 4 canicas de tu color. A diferencia del Conecta 4 tradicional, debes pensar en dónde estarán las canicas después de la rotación.",
                  ] : [
                      "1. Setup: The board is a 4x4 grid with circular tracks (an inner and outer ring). Each player chooses a color.",
                      "2. Turn (Placement): Place your marble in any empty spot on the board.",
                      "3. Special Rule: Before placing your marble, you can optionally shift one of your opponent's marbles to an adjacent empty orthogonal space.",
                      "4. The Orbit: After moving, you must press the center button. This will slide all marbles one position along their circular orbit.",
                      "5. How to Win: You win if, AFTER pressing the Orbit button and the marbles stop moving, you have an alignment of 4 of your marbles. Unlike traditional Connect 4, you have to think about where the marbles will be after the spin.",
                  ]
                ).map((rule, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm shrink-0 border border-blue-500/30">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-bold text-slate-400 leading-relaxed pt-1">
                      {rule.replace(/^\d+\.\s*/, "")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center pb-2">
                <a 
                  href="https://www.youtube.com/results?search_query=how+to+play+orbito+board+game"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-600/10 w-full hover:bg-red-600/20 border border-red-500/30 text-red-100/90 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  <svg className="w-6 h-6 text-red-500 shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>{t.searchTutorialVideo}</span>
                </a>
              </div>

              <button
                onClick={() => {
                  setIsOrbitoRulesOpen(false);
                  setHistoryMode("orbito");
                  setIsHistoryOpen(true);
                }}
                className="w-full mt-8 py-3 bg-slate-800 rounded-2xl font-black text-sm text-orange-400 border border-orange-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {language === "it" ? "STORIA / CURIOSITÀ" : "HISTORY / TRIVIA"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isPenteRulesOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-teal-400 uppercase tracking-tight">
                Pente - {language === "it" ? "Come si gioca" : language === "fr" ? "Comment jouer" : language === "de" ? "Spielanleitung" : language === "es" ? "Cómo jugar" : "How to Play"}
              </h2>
              <button
                onClick={() => {
                  setIsPenteRulesOpen(false);
                  handleGameModeChange("pente");
                  setBoardTheme("pente");
                  setPlayerCount(2);
                }}
                className="w-8 h-8 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <h3 className="text-sm font-black text-teal-400 uppercase mb-2 tracking-wider">
                  🎯 {language === "it" ? "OBIETTIVO PENTE" 
                   : language === "fr" ? "OBJECTIF PENTE" 
                   : language === "de" ? "PENTE ZIEL" 
                   : language === "es" ? "OBJETIVO PENTE" 
                   : "PENTE OBJECTIVE"}
                </h3>
                <p className="text-sm font-bold text-slate-300 leading-relaxed">
                  {language === "it"
                    ? "Raggiungere una delle due condizioni di vittoria: 1) Allineare 5 pedine consecutive in qualsiasi direzione oppure 2) Catturare 5 coppie di pedine avversarie."
                    : language === "fr"
                    ? "Atteindre l'une des deux conditions de victoire : 1) Aligner 5 pièces consécutives dans n'importe quelle direction, ou 2) Capturer 5 paires de pièces adverses."
                    : language === "de"
                    ? "Erreiche eine von zwei Siegbedingungen: 1) Reihe 5 aufeinanderfolgende Steine in einer beliebigen Richtung auf, oder 2) Schlage 5 Paare gegnerischer Steine."
                    : language === "es"
                    ? "Lograr una de las dos condiciones de victoria: 1) Alinear 5 piedras consecutivas en cualquier dirección o 2) Capturar 5 pares de piedras del oponente."
                    : "Achieve one of two win conditions: 1) Align 5 consecutive pieces in any direction, or 2) Capture 5 pairs of opponent pieces."}
                </p>
              </div>

              <div className="space-y-4">
                {(
                  language === "it" ? [
                      "1. Il Tabellone: Si gioca su una griglia fitta formata da intersezioni. I pezzi si posizionano proprio sugli incroci delle linee.",
                      "2. Il Turno di Gioco: I giocatori si alternano posizionando una singola pietra alla volta in qualsiasi intersezione vuota. Una volta posizionata, una pietra non può più essere mossa, tranne quando viene catturata.",
                      "3. La Regola della Cattura: Questa è la meccanica chiave! Catturi due pietre avversarie posizionando le tue pietre in modo da intrappolare due pietre contigue dell'avversario fra due pietre del tuo colore in una fila ininterrotta (es. B N N B).",
                      "4. Limiti della Cattura: Le catture possono avvenire orizzontalmente, verticalmente o diagonalmente. Le pietre intrappolate vengono rimosse dal gioco. Ricorda che muovere la TUA pietra in una possibile posizione di cattura ('auto-cattura') non fa sì che i tuoi pezzi vengano catturati.",
                      "5. Come si vince: Puoi vincere in due modi: o effettuando 5 catture totali (rimuovendo 10 pietre avversarie dal tabellone) O creando una linea continua di esattamente (o più) 5 delle tue pietre in qualsiasi direzione.",
                      "6. Regola PRO (Medio/Difficile): L'IA inizierà sempre al centro. Al secondo turno dell'IA, la sua pedina sarà posizionata ad almeno 3 incroci di distanza dal centro."
                  ] : language === "fr" ? [
                      "1. Le Plateau : Se joue sur une grille composée d'intersections. Les pièces sont placées directement sur les croisements.",
                      "2. Le Tour de Jeu : Les joueurs placent à tour de rôle une seule pierre sur n'importe quelle intersection vide. Une fois placée, une pierre ne peut pas être déplacée, sauf si elle est capturée.",
                      "3. La Règle de Capture : C'est la mécanique clé ! Vous capturez deux pierres adverses en encadrant exactement deux pierres adverses adjacentes avec deux de vos propres pierres dans une ligne ininterrompue (ex. B N N B).",
                      "4. Limites de Capture : Les captures peuvent se faire horizontalement, verticalement ou diagonalement. Les pierres piégées sont retirées du jeu. Notez que déplacer VOTRE pierre dans une position d'encadrement ('auto-capture') n'entraîne pas la capture de vos pièces.",
                      "5. Comment Gagner : Vous pouvez gagner de deux manières : soit en réalisant 5 captures totales (en retirant 10 pierres adverses) OU en créant une ligne continue d'exactement (ou plus) 5 de vos pierres dans n'importe quelle direction.",
                      "6. Règle PRO (Moyen/Difficile) : L'IA commencera toujours au centre. Au deuxième tour de l'IA, sa pièce sera placée à au moins 3 intersections du centre."
                  ] : language === "de" ? [
                      "1. Das Spielbrett: Gespielt wird auf einem Gitter aus Knotenpunkten. Die Steine werden direkt auf die Schnittpunkte gesetzt.",
                      "2. Der Spielzug: Die Spieler setzen abwechselnd einen einzelnen Stein auf einen beliebigen leeren Schnittpunkt. Einmal gesetzt, kann ein Stein nicht mehr bewegt werden, es sei denn, er wird geschlagen.",
                      "3. Die Schlagregel: Das ist die wichtigste Mechanik! Du schlägst zwei gegnerische Steine, indem du genau zwei benachbarte gegnerische Steine mit zwei deiner eigenen in einer ununterbrochenen Linie einschließt (z. B. S W W S).",
                      "4. Schlaggrenzen: Schlagen kann horizontal, vertikal oder diagonal erfolgen. Die eingeschlossenen Steine werden vom Brett entfernt. Beachte, dass das Bewegen DEINES Steins in eine flankierte Position ('Selbstschlag') nicht dazu führt, dass deine Steine geschlagen werden.",
                      "5. Wie Man Gewinnt: Du kannst auf zwei Arten gewinnen: entweder durch 5 erfolgreiche Schläge (10 gegnerische Steine entfernt) ODER durch eine ununterbrochene Linie von genau (oder mehr) 5 deiner Steine in einer beliebigen Richtung.",
                      "6. PRO-Regel (Mittel/Schwer): Die KI beginnt immer in der Mitte. Im zweiten Zug der KI wird ihr Stein mindestens 3 Kreuzungen von der Mitte entfernt platziert."
                  ] : language === "es" ? [
                      "1. El Tablero: Se juega en una cuadrícula compuesta de intersecciones. Las piezas se colocan directamente en los puntos de cruce.",
                      "2. El Turno: Los jugadores se turnan para colocar una sola piedra en cualquier intersección vacía. Una vez colocada, una piedra no se puede mover a menos que sea capturada.",
                      "3. La Regla de Captura: ¡Esta es la mecánica clave! Capturas dos piedras del oponente flanqueando exactamente dos piedras del oponente adyacentes con dos de las tuyas en una línea ininterrumpida (ej. N B B N).",
                      "4. Límites de Captura: Las capturas pueden ocurrir horizontal, vertical o diagonalmente. Las piedras atrapadas se retiran del juego. Ten en cuenta que mover TU piedra a una posición de flanqueo ('auto-captura') no hace que tus piezas sean capturadas.",
                      "5. Cómo Ganar: Puedes ganar de dos maneras: ya sea realizando 5 capturas en total (retirando 10 piedras del oponente) O creando una línea continua de exactamente (o más) 5 de tus piedras en cualquier dirección.",
                      "6. Regla PRO (Medio/Difícil): La IA siempre comenzará en el centro. En el segundo turno de la IA, su piedra se colocará al menos a 3 intersecciones de distancia del centro."
                  ] : [
                      "1. The Board: Played on a grid composed of intersections. Pieces are placed directly on the cross-points.",
                      "2. The Turn: Players take turns placing a single stone on any empty intersection. Once placed, a stone cannot be moved unless it is captured.",
                      "3. The Capture Rule: This is the key mechanic! You capture a pair of opponent stones by flanking exactly two adjacent opponent stones with two of your own in an unbroken line (e.g. W B B W).",
                      "4. Capture Limits: Captures can happen horizontally, vertically, or diagonally. The trapped stones are removed from the board. Note that moving YOUR stone into a flanking position ('self-capture') does not result in your pieces being captured.",
                      "5. How to Win: You can win two ways: either by making 5 total captures (removing 10 opponent stones) OR by creating an unbroken line of 5 (or more) of your stones in any direction.",
                      "6. PRO Rule (Medium/Hard): The AI will always start in the center. On the AI's second turn, its stone must be placed at least 3 intersections away from the center."
                  ]
                ).map((rule, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-teal-600/20 text-teal-400 flex items-center justify-center font-black text-sm shrink-0 border border-teal-500/30">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-bold text-slate-400 leading-relaxed pt-1">
                      {rule.replace(/^\d+\.\s*/, "")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center pb-2">
                <a 
                  href="https://www.youtube.com/results?search_query=how+to+play+pente+board+game"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-600/10 w-full hover:bg-red-600/20 border border-red-500/30 text-red-100/90 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  <svg className="w-6 h-6 text-red-500 shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>{t.searchTutorialVideo}</span>
                </a>
              </div>

              <button
                onClick={() => {
                  setIsPenteRulesOpen(false);
                  setHistoryMode("pente");
                  setIsHistoryOpen(true);
                }}
                className="w-full mt-8 py-3 bg-slate-800 rounded-2xl font-black text-sm text-teal-400 border border-teal-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {language === "it" ? "STORIA / CURIOSITÀ" : "HISTORY / TRIVIA"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isShobuRulesOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-cyan-400 uppercase tracking-tight">
                Shobu - {language === "it" ? "Come si gioca" : language === "fr" ? "Comment jouer" : language === "de" ? "Spielanleitung" : language === "es" ? "Cómo jugar" : "How to Play"}
              </h2>
              <button
                onClick={() => {
                  setIsShobuRulesOpen(false);
                  handleGameModeChange("shobu");
                  setBoardTheme("shobu");
                  setPlayerCount(2);
                }}
                className="w-8 h-8 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <h3 className="text-sm font-black text-cyan-400 uppercase mb-2 tracking-wider">
                  🎯{" "}
                  {language === "it" ? "OBIETTIVO SHOBU" 
                   : "SHOBU OBJECTIVE"}
                </h3>
                <p className="text-sm font-bold text-slate-300 leading-relaxed">
                  {language === "it"
                    ? "Vince il giocatore che riesce a eliminare tutte e 4 le pietre dell'avversario da un SINGOLO tavoliere."
                    : "The player who manages to push all 4 of their opponent's stones off a SINGLE board wins."}
                </p>
              </div>

              <div className="space-y-4">
                {(
                  language === "it" ? [
                      "1. La Particolarità: La partita si svolge contemporaneamente su 4 tavolieri separati. Ogni mossa richiede di compiere due azioni collegate: una mossa 'passiva' di preparazione e una mossa 'attiva' di attacco.",
                      "2. Il Turno di Gioco (Mossa Passiva): Scegli una pietra su uno dei due tavolieri vicini a te e muovila di 1 o 2 spazi (ortogonale o diagonale). Il percorso deve essere libero. Questa mossa non spinge e non salta.",
                      "3. La Mossa Attiva (L'Attacco): Muovi una seconda pietra su un tavoliere del colore OPPOSTO a quello dove hai fatto la mossa passiva. Deve copiare esattamente direzione e distanza. Questa mossa può spingere UNA singola pietra avversaria.",
                      "4. Come si Cattura: Se la mossa attiva incontra una pietra avversaria sulla traiettoria, la spinge. Se la pietra l'avversario viene spinta fuori dal bordo del tavoliere, è catturata e rimossa (non puoi spingere più di una pietra per volta).",
                      "5. Regole Aggiuntive: Non puoi fare mosse che spingerebbero o eliminerebbero una tua pedina. Il tuo scopo non è mangiarle tutte ma catturane 4 su un solo tavolo.",
                      "6. Dipingersi in un angolo: Se all'inizio del tuo turno sei bloccato e non esiste alcuna combinazione valida di Mossa Passiva e successiva Mossa Attiva, la partita termina all'istante e perdi a favore del tuo avversario. In Shobu non si salta il turno."
                  ] : [
                      "1. The Special Rule: The game is played simultaneously on 4 separate boards. Every turn requires two linked actions: a 'passive' prep move and an 'active' attack move.",
                      "2. The Turn (Passive Move): Pick a stone on one of the two boards closest to you and move it 1 or 2 spaces (orthogonal or diagonal). The path must be clear. It doesn't push or jump.",
                      "3. The Active Move (The Attack): Move a second stone on a board of the OPPOSITE color to your passive move's board. It must perfectly copy the direction and distance. This move can push ONE opponent stone.",
                      "4. How to Capture: If the active move hits an opponent's stone, it pushes it. If the stone is pushed off the board, it is captured and removed. You cannot push multiple stones at once.",
                      "5. Additional Rules: You cannot push your own stones, nor push any of your stones off the board. The goal is just to clear 4 stones from a single board.",
                      "6. Paint yourself into a corner: If at the start of your turn you are blocked and there is no valid combination of Passive Move and Active Move, the game ends instantly and you lose. You cannot skip a turn in Shobu."
                  ]
                ).map((rule, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-black text-sm shrink-0 border border-cyan-500/30">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-bold text-slate-400 leading-relaxed pt-1">
                      {rule.replace(/^\d+\.\s*/, "")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center pb-2">
                <a 
                  href="https://www.youtube.com/results?search_query=how+to+play+shobu+board+game"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-600/10 w-full hover:bg-red-600/20 border border-red-500/30 text-red-100/90 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  <svg className="w-6 h-6 text-red-500 shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>{t.searchTutorialVideo}</span>
                </a>
              </div>

              <button
                onClick={() => {
                  setIsShobuRulesOpen(false);
                  setHistoryMode("shobu");
                  setIsHistoryOpen(true);
                }}
                className="w-full mt-8 py-3 bg-slate-800 rounded-2xl font-black text-sm text-cyan-400 border border-cyan-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {language === "it" ? "STORIA / CURIOSITÀ" : "HISTORY / TRIVIA"}
              </button>
              
              <button
                onClick={() => {
                  setIsShobuRulesOpen(false);
                }}
                className="w-full mt-6 py-4 bg-cyan-600/20 text-cyan-400 rounded-xl font-black text-base uppercase tracking-wider shadow-lg active:scale-95 transition-transform hover:bg-cyan-600/30 border border-cyan-500/30"
              >
                {language === "it" ? "CHIUDI" : "CLOSE"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isYinshRulesOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-emerald-400 uppercase tracking-tight">
                Yinsh - {language === "it" ? "Come si gioca" : language === "fr" ? "Comment jouer" : language === "de" ? "Spielanleitung" : language === "es" ? "Cómo jugar" : "How to Play"}
              </h2>
              <button
                onClick={() => {
                  setIsYinshRulesOpen(false);
                  handleGameModeChange("yinsh");
                  setBoardTheme("yinsh");
                  setPlayerCount(2);
                }}
                className="w-8 h-8 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <h3 className="text-sm font-black text-emerald-400 uppercase mb-2 tracking-wider">
                  {language === "fr" ? "🎯 OBJECTIF YINSH" : language === "de" ? "🎯 YINSH ZIEL" : language === "es" ? "🎯 OBJETIVO YINSH" : language === "it" ? "🎯 OBIETTIVO YINSH" : "🎯 YINSH OBJECTIVE"}
                </h3>
                <p className="text-sm font-bold text-slate-300 leading-relaxed">
                  {language === "it"
                    ? "Essere il primo giocatore a rimuovere 3 dei propri anelli dal tabellone. Per fare un punto e rimuovere un anello, devi allineare 5 marker del tuo colore."
                    : language === "fr" ? "Être le premier joueur à retirer 3 de ses propres anneaux du plateau. Pour marquer un point et retirer un anneau, vous devez aligner 5 marqueurs de votre couleur."
                    : language === "de" ? "Sei der erste Spieler, der 3 seiner eigenen Ringe vom Brett entfernt. Um einen Punkt zu erzielen und einen Ring zu entfernen, musst du 5 Marker deiner Farbe aufreihen."
                    : language === "es" ? "Sé el primer jugador en quitar 3 de tus propios anillos del tablero. Para ganar un punto y quitar un anillo, debes alinear 5 marcadores de tu color."
                    : "Be the first player to remove 3 of your own rings from the board. To score a point and remove a ring, you must align 5 markers in your color."}
                </p>
              </div>

              <div className="space-y-4">
                {(
                  language === "it" ? [
                      "1. I Componenti: Il tabellone è una griglia di linee intersecanti (gli spazi sono let intersezioni). Ogni giocatore ha 5 anelli. I marker sono bicolore.",
                      "2. Preparazione: I giocatori piazzano a turno i loro 5 anelli su una qualsiasi intersezione libera. Una volta messi, la partita vera e propria inizia.",
                      "3. Il Turno di Gioco (Fase A - Piazzare): Prendi un marker e piazzalo col tuo colore in alto all'interno di un tuo anello.",
                      "4. Il Turno (Fase B - Muovere): Muovi l'anello (svuotato) in linea retta. Può passare in spazi vuoti o saltare una fila continua di marker (fermandosi nel primo spazio vuoto subito dopo). Non può saltare altri anelli.",
                      "5. Ribaltamento (Effetto Othello): Tutti i marker che vengono saltati dal tuo anello si capovolgono, cambiando colore (da bianco a nero e viceversa).",
                      "6. Fare Punto: Se crei una fila di 5 marker dello stesso colore, li rimuovi e puoi togliere un tuo anello dal gioco. Toglierne 3 ti fa vincere (ma ti lascia con meno mobilità sul tabellone!)."
                  ] : language === "fr" ? [
                      "1. Composants : Le plateau est une grille d'intersections. Chaque joueur dispose de 5 anneaux. Il y a une réserve de marqueurs double face.",
                      "2. Préparation : Les joueurs placent à tour de rôle leurs 5 anneaux sur un petit espace vide. Le jeu commence une fois les 10 anneaux placés.",
                      "3. Tour de de jeu (Phase A - Placer) : Placez un marqueur de votre couleur face visible à l'intérieur de l'un de vos anneaux.",
                      "4. Tour de de jeu (Phase B - Déplacer) : Déplacez l'anneau (maintenant vide) en ligne droite. Il peut glisser sur des espaces vides ou sauter par-dessus une ligne continue de marqueurs (en s'arrêtant dans le premier espace vide juste après). Il ne peut pas sauter d'autres anneaux.",
                      "5. Retournement (Effet Othello) : Les marqueurs par-dessus lesquels l'anneau a sauté sont retournés, changeant ainsi de couleur.",
                      "6. Marquer : Si une ligne de 5 marqueurs de même couleur est formée, retirez-les puis retirez l'un de vos anneaux pour marquer. Retirez-en 3 pour gagner (mais cela réduit votre mobilité !)."
                  ] : language === "de" ? [
                      "1. Komponenten: Das Brett ist ein Gitter aus Schnittpunkten. Jeder Spieler hat 5 Ringe. Es gibt einen Vorrat an doppelseitigen Markern.",
                      "2. Vorbereitung: Die Spieler platzieren abwechselnd ihre 5 Ringe auf einem beliebigen leeren Feld. Wenn alle 10 Ringe platziert sind, beginnt das Spiel.",
                      "3. Spielzug (Phase A - Marker platzieren): Lege einen Marker mit deiner Farbe nach oben in einen deiner Ringe.",
                      "4. Spielzug (Phase B - Ring bewegen): Bewege den (jetzt leeren) Ring in einer geraden Linie. Er kann über leere Felder gleiten oder eine ununterbrochene Reihe von Markern überspringen (und hält auf dem ersten leeren Feld direkt dahinter an). Er kann keine anderen Ringe überspringen.",
                      "5. Marker umdrehen: Alle Marker, die vom Ring übersprungen wurden, werden umgedreht und wechseln die Farbe.",
                      "6. Punkten: Wenn eine Reihe von 5 gleichfarbigen Markern gebildet wird, entferne sie und nimm einen deiner Ringe vom Brett, um zu punkten. Entferne 3, um zu gewinnen (aber das schränkt deine Mobilität ein!)."
                  ] : language === "es" ? [
                      "1. Componentes: El tablero es una cuadrícula de intersecciones. Cada jugador tiene 5 anillos. Hay una reserva de marcadores de doble cara.",
                      "2. Preparación: Los jugadores se turnan para colocar sus 5 anillos en cualquier espacio libre. Una vez colocados los 10, comienza el juego.",
                      "3. Turno de juego (Fase A - Colocar): Coloca un marcador con tu color hacia arriba dentro de uno de tus anillos.",
                      "4. Turno de juego (Fase B - Mover): Mueve el anillo (ahora vacío) en línea recta. Puede deslizarse sobre espacios vacíos o saltar sobre una línea continua de marcadores (deteniéndose en el primer espacio vacío justo después). No puede saltar sobre otros anillos.",
                      "5. Voltear marcadores: Cualquier marcador sobre los que saltó el anillo se voltea, cambiando de color.",
                      "6. Puntuación: Si se forma una línea de 5 marcadores del mismo color, quítalos y retira uno de tus anillos del juego para anotar. Quita 3 para ganar (¡pero quitar un anillo limita tu movilidad!)."
                  ] : [
                      "1. Components: The board is an intersecting grid. Each player has 5 rings. There's a reserve of double-sided markers.",
                      "2. Preparation: Players take turns placing their 5 rings on any vacant space. Once all 10 are placed, the game begins.",
                      "3. Game Turn (Phase A - Place Marker): Place a marker with your color facing up inside one of your rings.",
                      "4. Game Turn (Phase B - Move Ring): Move the ring in a straight line. It can slide over empty spaces or jump over a continuous line of markers (stopping in the first empty space right after). It cannot jump rings.",
                      "5. Flipping Markers: Any markers the ring jumped over are flipped over, switching to the opposite color.",
                      "6. Scoring: If a line of 5 markers of the same color is formed, remove the 5 markers and remove one of your rings from the game to score. Remove 3 to win (but removing a ring limits your mobility!)."
                  ]
                ).map((rule, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-500/30">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-bold text-slate-400 leading-relaxed pt-1">
                      {rule.replace(/^\d+\.\s*/, "")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center pb-2">
                <a 
                  href="https://www.youtube.com/results?search_query=how+to+play+yinsh+board+game"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-600/10 w-full hover:bg-red-600/20 border border-red-500/30 text-red-100/90 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  <svg className="w-6 h-6 text-red-500 shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>{t.searchTutorialVideo}</span>
                </a>
              </div>

              <button
                onClick={() => {
                  setIsYinshRulesOpen(false);
                  setHistoryMode("yinsh");
                  setIsHistoryOpen(true);
                }}
                className="w-full mt-8 py-3 bg-slate-800 rounded-2xl font-black text-sm text-emerald-400 border border-emerald-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {language === "it" ? "STORIA / CURIOSITÀ" : "HISTORY / TRIVIA"}
              </button>
              
              <button
                onClick={() => {
                  setIsYinshRulesOpen(false);
                }}
                className="w-full mt-6 py-4 bg-emerald-600/20 text-emerald-400 rounded-xl font-black text-base uppercase tracking-wider shadow-lg active:scale-95 transition-transform hover:bg-emerald-600/30 border border-emerald-500/30"
              >
                {language === "it" ? "CHIUDI" : "CLOSE"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isOnitamaRulesOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-red-400 uppercase tracking-tight flex items-center gap-2">
                <span className="text-3xl">🏯</span>
                {language === "it" ? "COME SI GIOCA" : "HOW TO PLAY"} (ONITAMA)
              </h2>
              <button
                onClick={() => setIsOnitamaRulesOpen(false)}
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label="Chiudi"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <p className="text-slate-300 font-medium">
                    {language === "it"
                      ? "Onitama è un gioco astratto per 2 giocatori spesso paragonato agli scacchi, ma molto più veloce da imparare. Una partita dura circa 15-20 minuti."
                      : language === "fr"
                      ? "Onitama est un jeu abstrait pour 2 joueurs souvent comparé aux échecs, mais beaucoup plus rapide à apprendre. Une partie dure environ 15-20 minutes."
                      : language === "de"
                      ? "Onitama ist ein abstraktes Spiel für 2 Spieler, das oft mit Schach verglichen wird, aber viel schneller zu erlernen ist. Eine Partie dauert etwa 15-20 Minuten."
                      : language === "es"
                      ? "Onitama es un juego abstracto para 2 jugadores a menudo comparado con el ajedrez, pero mucho más rápido de aprender. Una partida dura unos 15-20 minutos."
                      : "Onitama is a 2-player abstract game often compared to chess, but much faster to learn. A game lasts about 15-20 minutes."}
                  </p>
                </div>
                
                <div className="flex flex-col gap-6">
                  {/* Obiettivo del gioco */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                    <h3 className="text-lg font-black text-red-400 mb-3 uppercase">
                      {language === "it" ? "Obiettivo del gioco" : language === "fr" ? "Objectif du jeu" : language === "de" ? "Ziel des Spiels" : language === "es" ? "Objetivo del juego" : "Goal of the game"}
                    </h3>
                    <p className="text-slate-300 text-sm font-bold mb-2">
                        {language === "it" ? "Puoi vincere in due modi:" : language === "fr" ? "Vous pouvez gagner de deux manières :" : language === "de" ? "Sie können auf zwei Arten gewinnen:" : language === "es" ? "Puedes ganar de dos maneras:" : "You can win in two ways:"}
                    </p>
                    <ul className="text-sm text-slate-400 space-y-2 list-disc pl-5">
                      <li><strong className="text-slate-300 font-bold">{language === "it" ? "Via della Pietra (Way of the Stone):" : language === "fr" ? "La Voie de la Pierre :" : language === "de" ? "Weg des Steins:" : language === "es" ? "Camino de la Piedra:" : "Way of the Stone:"}</strong> {language === "it" ? "catturare il Maestro avversario." : language === "fr" ? "capturer le Maître adverse." : language === "de" ? "schlagen Sie den gegnerischen Meister." : language === "es" ? "captura al Maestro del oponente." : "capture the opponent's Master."}</li>
                      <li><strong className="text-slate-300 font-bold">{language === "it" ? "Via del Torrente (Way of the Stream):" : language === "fr" ? "La Voie de l'Eau :" : language === "de" ? "Weg des Stroms:" : language === "es" ? "Camino del Arroyo:" : "Way of the Stream:"}</strong> {language === "it" ? "portare il tuo Maestro sulla casella iniziale del Maestro nemico (il tempio avversario)." : language === "fr" ? "amener votre Maître sur la case de départ du Maître ennemi (le temple adverse)." : language === "de" ? "bewegen Sie Ihren Meister auf das Startfeld des gegnerischen Meisters (den feindlichen Tempel)." : language === "es" ? "mueve tu Maestro a la casilla de inicio del Maestro enemigo (el templo adversario)." : "move your Master into the opponent's starting Master space (the enemy temple)."}</li>
                    </ul>
                  </div>

                  {/* Preparazione */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                    <h3 className="text-lg font-black text-red-400 mb-3 uppercase">
                      {language === "it" ? "Preparazione" : language === "fr" ? "Préparation" : language === "de" ? "Aufbau" : language === "es" ? "Preparación" : "Setup"}
                    </h3>
                    <ul className="text-sm text-slate-400 space-y-2 list-disc pl-5">
                      <li>{language === "it" ? "Il tabellone è una griglia 5×5." : language === "fr" ? "Le plateau est une grille de 5x5." : language === "de" ? "Das Spielfeld ist ein 5x5 Raster." : language === "es" ? "El tablero es una cuadrícula de 5x5." : "The board is a 5x5 grid."}</li>
                      <li>{language === "it" ? "Ogni giocatore ha: 1 Maestro e 4 Studenti." : language === "fr" ? "Chaque joueur possède: 1 Maître et 4 Élèves." : language === "de" ? "Jeder Spieler hat: 1 Meister und 4 Schüler." : language === "es" ? "Cada jugador tiene: 1 Maestro y 4 Alumnos." : "Each player has: 1 Master and 4 Students."}</li>
                      <li>{language === "it" ? "Il Maestro viene posizionato al centro della fila più vicina al giocatore." : language === "fr" ? "Le Maître est placé au centre de la rangée la plus proche du joueur." : language === "de" ? "Der Meister wird in die Mitte der Reihe gestellt, die dem Spieler am nächsten ist." : language === "es" ? "El Maestro se coloca en el centro de la fila más cercana al jugador." : "The Master is placed in the middle of the row closest to the player."}</li>
                      <li>{language === "it" ? "Gli allievi occupano le altre caselle della stessa fila." : language === "fr" ? "Les élèves occupent les autres cases de la même rangée." : language === "de" ? "Die Schüler besetzen die anderen Felder in derselben Reihe." : language === "es" ? "Los alumnos ocupan las otras casillas de la misma fila." : "The students occupy the other spaces in the same row."}</li>
                      <li>{language === "it" ? "Si pescano 5 carte movimento: 2 a un giocatore, 2 all'altro giocatore, 1 viene lasciata scoperta di lato." : language === "fr" ? "5 cartes de mouvement sont piochées : 2 pour un joueur, 2 pour l'autre, et 1 est laissée face visible sur le côté." : language === "de" ? "5 Bewegungskarten werden gezogen: 2 für einen Spieler, 2 für den anderen, und 1 wird offen zur Seite gelegt." : language === "es" ? "Se roban 5 cartas de movimiento: 2 para un jugador, 2 para el otro, y 1 se deja boca arriba a un lado." : "5 movement cards are drawn: 2 for one player, 2 for the other, and 1 is left face-up on the side."}</li>
                    </ul>
                  </div>

                  {/* Come funzionano le carte */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                    <h3 className="text-lg font-black text-red-400 mb-3 uppercase">
                      {language === "it" ? "Come funzionano le carte" : language === "fr" ? "Comment fonctionnent les cartes" : language === "de" ? "Wie die Karten funktionieren" : language === "es" ? "Cómo funcionan las cartas" : "How cards work"}
                    </h3>
                    <p className="text-slate-300 text-sm font-bold mb-2 flex items-start gap-2">
                        {language === "it" ? "La vera particolarità di Onitama sono le carte. Ogni carta mostra uno schema di movimento:" : language === "fr" ? "La véritable particularité d'Onitama réside dans les cartes. Chaque carte montre un schéma de mouvement :" : language === "de" ? "Die wahre Besonderheit von Onitama sind die Karten. Jede Karte zeigt ein Bewegungsmuster:" : language === "es" ? "La verdadera particularidad de Onitama son las cartas. Cada carta muestra un patrón de movimiento:" : "The real uniqueness of Onitama is the cards. Each card shows a movement pattern:"}
                    </p>
                    <ul className="text-sm text-slate-400 space-y-2 list-disc pl-5 mb-3">
                      <li>{language === "it" ? "Il quadrato nero rappresenta la posizione della tua pedina." : language === "fr" ? "Le carré noir représente la position de votre pièce." : language === "de" ? "Das schwarze Quadrat stellt die Position Ihrer Figur dar." : language === "es" ? "El cuadrado negro representa la posición de tu pieza." : "The black square represents the position of your piece."}</li>
                      <li>{language === "it" ? "I quadrati colorati mostrano dove può muoversi." : language === "fr" ? "Les carrés colorés montrent où elle peut se déplacer." : language === "de" ? "Die farbigen Quadrate zeigen, wohin sie sich bewegen kann." : language === "es" ? "Los cuadrados de colores muestran adónde puede moverse." : "The colored squares show where it can move."}</li>
                    </ul>
                    <p className="text-slate-400 text-sm mb-2">
                      {language === "it" ? "Per esempio, una carta potrebbe permettere di andare avanti di una casella; oppure in diagonale." : language === "fr" ? "Par exemple, une carte pourrait permettre d'avancer d'une case ; ou en diagonale." : language === "de" ? "Zum Beispiel könnte eine Karte erlauben, ein Feld vorwärts zu ziehen; oder diagonal." : language === "es" ? "Por ejemplo, una carta podría permitir avanzar una casilla; o en diagonal." : "For example, a card might allow moving forward one space; or diagonally."}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {language === "it" ? "Ogni carta rappresenta una tecnica di arti marziali con nomi come Tigre, Drago, Gru, Cobra, Scimmia ecc." : language === "fr" ? "Chaque carte représente une technique d'arts martiaux nommée d'après des animaux comme le Tigre, le Dragon, la Grue, le Cobra, le Singe, etc." : language === "de" ? "Jede Karte repräsentiert eine Kampfsporttechnik, benannt nach Tieren wie Tiger, Drache, Kranich, Kobra, Affe usw." : language === "es" ? "Cada carta representa una técnica de artes marciales con nombres de animales como Tigre, Dragón, Grulla, Cobra, Mono, etc." : "Each card represents a martial arts technique named after animals like Tiger, Dragon, Crane, Cobra, Monkey, etc."}
                    </p>
                  </div>

                  {/* Turno di gioco */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                    <h3 className="text-lg font-black text-red-400 mb-3 uppercase">
                      {language === "it" ? "Turno di gioco" : language === "fr" ? "Tour de jeu" : language === "de" ? "Spielzug" : language === "es" ? "Turno de juego" : "Gameplay"}
                    </h3>
                    <p className="text-slate-300 text-sm font-bold mb-2">
                      {language === "it" ? "Nel tuo turno:" : language === "fr" ? "À votre tour :" : language === "de" ? "In Ihrem Zug:" : language === "es" ? "En tu turno:" : "On your turn:"}
                    </p>
                    <div className="space-y-3">
                      {(language === "it" ? [
                          "Scegli una delle due carte che hai davanti.",
                          "Muovi una qualsiasi tua pedina seguendo esattamente il movimento mostrato.",
                          "Se atterri su una casella occupata da un pezzo nemico, lo catturi.",
                          "Metti la carta usata al centro (o sul lato del tabellone).",
                          "Prendi la carta che era al centro e la aggiungi alla tua mano."
                      ] : language === "fr" ? [
                          "Choisissez l'une des deux cartes devant vous.",
                          "Déplacez n'importe laquelle de vos pièces en suivant exactement le mouvement indiqué.",
                          "Si vous atterrissez sur une case occupée par une pièce ennemie, vous la capturez.",
                          "Placez la carte jouée au centre (ou sur le côté du plateau).",
                          "Prenez la carte qui était au centre et ajoutez-la à votre main."
                      ] : language === "de" ? [
                          "Wählen Sie eine der beiden Karten vor Ihnen aus.",
                          "Bewegen Sie eine beliebige Ihrer Figuren genau nach dem angezeigten Muster.",
                          "Wenn Sie auf einem Feld landen, das von einer feindlichen Figur besetzt ist, schlagen Sie diese.",
                          "Legen Sie die gespielte Karte in die Mitte (oder an den Rand des Bretts).",
                          "Nehmen Sie die Karte, die in der Mitte lag, und fügen Sie sie Ihrer Hand hinzu."
                      ] : language === "es" ? [
                          "Elige una de las dos cartas que tienes delante.",
                          "Mueve cualquiera de tus piezas siguiendo exactamente el movimiento mostrado.",
                          "Si caes en una casilla ocupada por una pieza enemiga, la capturas.",
                          "Coloca la carta jugada en el centro (o a un lado del tablero).",
                          "Toma la carta que estaba en el centro y añádela a tu mano."
                      ] : [
                          "Choose one of the two cards in front of you.",
                          "Move any of your pieces following exactly the movement shown.",
                          "If you land on a space occupied by an enemy piece, you capture it.",
                          "Place the played card in the center (or side of the board).",
                          "Take the card that was in the center and add it to your hand."
                      ]).map((step, idx) => (
                        <div key={idx} className="flex gap-4 items-start">
                          <div className="w-6 h-6 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center font-black text-xs shrink-0 border border-red-500/30">
                            {idx + 1}
                          </div>
                          <p className="text-sm font-bold text-slate-400 leading-relaxed pt-0.5">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-300 text-sm font-bold mt-4">
                      {language === "it" ? "In questo modo le carte passano continuamente da un giocatore all'altro." : language === "fr" ? "De cette façon, les cartes passent continuellement d'un joueur à l'autre." : language === "de" ? "Auf diese Weise wechseln die Karten kontinuierlich von einem Spieler zum anderen." : language === "es" ? "De esta manera, las cartas pasan continuamente de un jugador a otro." : "This way, cards continuously pass from one player to another."}
                    </p>
                  </div>

                  {/* Perché è strategico? */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                    <h3 className="text-lg font-black text-red-400 mb-3 uppercase">
                      {language === "it" ? "Perché è strategico?" : language === "fr" ? "Pourquoi est-ce stratégique ?" : language === "de" ? "Warum ist es strategisch?" : language === "es" ? "¿Por qué es estratégico?" : "Why is it strategic?"}
                    </h3>
                    <p className="text-slate-300 text-sm font-bold mb-2">
                      {language === "it" ? "A differenza degli scacchi:" : language === "fr" ? "Contrairement aux échecs :" : language === "de" ? "Im Gegensatz zum Schach:" : language === "es" ? "A diferencia del ajedrez:" : "Unlike chess:"}
                    </p>
                    <ul className="text-sm text-slate-400 space-y-2 list-disc pl-5">
                      <li>{language === "it" ? "le mosse disponibili cambiano continuamente;" : language === "fr" ? "les mouvements disponibles changent constamment ;" : language === "de" ? "ändern sich die verfügbaren Züge ständig;" : language === "es" ? "los movimientos disponibles cambian constantemente;" : "available moves change constantly;"}</li>
                      <li>{language === "it" ? "quando usi una carta, sai che presto sarà disponibile al tuo avversario;" : language === "fr" ? "lorsque vous utilisez une carte, vous savez qu'elle sera bientôt disponible pour votre adversaire ;" : language === "de" ? "wenn Sie eine Karte verwenden, wissen Sie, dass sie bald Ihrem Gegner zur Verfügung stehen wird;" : language === "es" ? "cuando usas una carta, sabes que pronto estará disponible para tu oponente;" : "when you use a card, you know it will soon be available to your opponent;"}</li>
                      <li>{language === "it" ? "devi pensare non solo alla tua mossa, ma anche a quali mosse stai regalando all'altro giocatore." : language === "fr" ? "vous devez penser non seulement à votre mouvement, mais aussi aux mouvements que vous offrez à l'autre joueur." : language === "de" ? "müssen Sie nicht nur über Ihren eigenen Zug nachdenken, sondern auch darüber, welche Züge Sie dem anderen Spieler überlassen." : language === "es" ? "debes pensar no solo en tu movimiento, sino también en qué movimientos le estás regalando al otro jugador." : "you must think not only about your move but also what moves you are gifting to the other player."}</li>
                    </ul>
                  </div>

                  {/* Consigli per iniziare */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                    <h3 className="text-lg font-black text-red-400 mb-3 uppercase">
                      {language === "it" ? "Consigli per iniziare" : language === "fr" ? "Conseils pour débutants" : language === "de" ? "Tipps für Anfänger" : language === "es" ? "Consejos para principiantes" : "Tips for beginners"}
                    </h3>
                    <ul className="text-sm text-slate-400 space-y-2 list-disc pl-5">
                      <li>{language === "it" ? "Proteggi sempre il Maestro." : language === "fr" ? "Protégez toujours votre Maître." : language === "de" ? "Beschützen Sie immer Ihren Meister." : language === "es" ? "Protege siempre a tu Maestro." : "Always protect your Master."}</li>
                      <li>{language === "it" ? "Controlla quali carte avrà il tuo avversario nel turno successivo." : language === "fr" ? "Vérifiez quelles cartes votre adversaire aura au tour suivant." : language === "de" ? "Behalten Sie im Auge, welche Karten Ihr Gegner im nächsten Zug haben wird." : language === "es" ? "Comprueba qué cartas tendrá tu oponente en el próximo turno." : "Keep track of what cards your opponent will have on their next turn."}</li>
                      <li>{language === "it" ? "Non sacrificare Allievi inutilmente: servono per bloccare le linee di attacco." : language === "fr" ? "Ne sacrifiez pas vos Élèves inutilement : ils servent à bloquer les lignes d'attaque." : language === "de" ? "Opfern Sie Schüler nicht unnötig: Sie werden verwendet, um Angriffslinien zu blockieren." : language === "es" ? "No sacrifiques Alumnos innecesariamente: sirven para bloquear líneas de ataque." : "Don't sacrifice Students needlessly: they are used to block attack lines."}</li>
                      <li>{language === "it" ? "Tieni d'occhio il tempio avversario: molte partite si vincono entrando nel santuario invece che catturando il Maestro." : language === "fr" ? "Gardez un œil sur le temple ennemi : de nombreuses parties se gagnent en entrant dans le sanctuaire plutôt qu'en capturant le Maître." : language === "de" ? "Behalten Sie den feindlichen Tempel im Auge: Viele Partien werden gewonnen, indem man den Schrein betritt, anstatt den Meister zu schlagen." : language === "es" ? "No pierdas de vista el templo enemigo: muchas partidas se ganan entrando en el santuario en lugar de capturando al Maestro." : "Keep an eye on the enemy temple: many games are won by entering the shrine rather than capturing the Master."}</li>
                    </ul>
                  </div>

                </div>
              </div>

              <div className="mt-8 flex justify-center pb-2">
                <a 
                  href="https://www.youtube.com/results?search_query=how+to+play+onitama+board+game"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-600/10 w-full hover:bg-red-600/20 border border-red-500/30 text-red-100/90 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  <svg className="w-6 h-6 text-red-500 shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>{t.searchTutorialVideo}</span>
                </a>
              </div>

              <button
                onClick={() => {
                  setIsOnitamaRulesOpen(false);
                  setHistoryMode("onitama");
                  setIsHistoryOpen(true);
                }}
                className="w-full mt-8 py-3 bg-slate-800 rounded-2xl font-black text-sm text-red-400 border border-red-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {language === "it" ? "STORIA / CURIOSITÀ" : "HISTORY / TRIVIA"}
              </button>
              
              <button
                onClick={() => setIsOnitamaRulesOpen(false)}
                className="w-full mt-6 py-4 bg-red-900/30 text-red-400 rounded-xl font-black text-base uppercase tracking-wider shadow-lg active:scale-95 transition-transform hover:bg-red-900/50 border border-red-500/30"
              >
                {language === "it" ? "CHIUDI" : "CLOSE"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isBadukRulesOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-zinc-300 uppercase tracking-tight flex items-center gap-2">
                <span className="text-3xl">⚫</span>
                {language === "it" ? "COME SI GIOCA" : language === "fr" ? "COMMENT JOUER" : language === "de" ? "SPIELANLEITUNG" : language === "es" ? "CÓMO JUGAR" : "HOW TO PLAY"} (BADUK / GO)
              </h2>
              <button
                onClick={() => setIsBadukRulesOpen(false)}
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label="Chiudi"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <h3 className="text-sm font-black text-zinc-300 uppercase mb-2 tracking-wider">
                  🎯 {language === "it" ? "OBIETTIVO BADUK (GO)" : language === "fr" ? "OBJECTIF BADUK (GO)" : language === "de" ? "BADUK (GO) ZIEL" : language === "es" ? "OBJETIVO BADUK (GO)" : "BADUK (GO) OBJECTIVE"}
                </h3>
                <p className="text-sm font-bold text-slate-300 leading-relaxed">
                  {language === "it"
                    ? "Conquistare la maggior area di territorio possibile. Punteggio Area (Cinese): Area vuota circondata + Pietre sulla scacchiera."
                    : language === "fr" ? "Conquérir la plus grande superficie. Score de zone (chinois): zone vide entourée + pierres sur le plateau."
                    : language === "de" ? "Erobern Sie das größte Gebiet. Flächenwertung (Chinesisch): umgebenes leeres Gebiet + Steine auf dem Brett."
                    : language === "es" ? "Conquistar la mayor área de territorio. Puntuación de área (chino): área vacía rodeada + piedras en el tablero."
                    : "Conquer the largest area of territory. Area Scoring (Chinese rules): Surrounded empty area + Stones on the board."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                  <h3 className="text-lg font-black text-zinc-300 mb-3 uppercase">
                    {language === "it" ? "Regole Base" : language === "fr" ? "Règles de Base" : language === "de" ? "Grundregeln" : language === "es" ? "Reglas Básicas" : "Basic Rules"}
                  </h3>
                  <ul className="text-sm text-slate-400 space-y-2 list-disc pl-5">
                    <li>{language === "it" ? "Le pietre si posizionano sulle intersezioni della scacchiera, non all'interno dei quadrati." : language === "fr" ? "Les pierres sont placées sur les intersections du plateau, et non à l'intérieur des cases." : language === "de" ? "Die Steine werden auf die Schnittpunkte des Brettes gesetzt, nicht in die Quadrate." : language === "es" ? "Las piedras se colocan en las intersecciones del tablero, no dentro de los cuadrados." : "Stones are placed on the intersections of the board, not inside the squares."}</li>
                    <li>{language === "it" ? "Le pietre posizionate non si spostano più." : language === "fr" ? "Une fois placées, les pierres ne peuvent plus être déplacées." : language === "de" ? "Einmal platzierte Steine können nicht mehr bewegt werden." : language === "es" ? "Una vez colocadas, las piedras no se pueden mover." : "Once placed, stones cannot be moved."}</li>
                    <li>{language === "it" ? "Le pietre nemiche adiacenti ortogonalmente che vengono completamente circondate dalle tue pietre (ovvero non hanno più 'libertà') vengono catturate e rimosse dalla scacchiera." : language === "fr" ? "Les pierres ennemies adjacentes orthogonalement qui sont complètement encerclées par vos pierres (c'est-à-dire qui n'ont plus de 'libertés') sont capturées et retirées du plateau." : language === "de" ? "Orthogonal benachbarte feindliche Steine, die vollständig von Ihren Steinen umgeben sind (d. h. keine 'Freiheiten' mehr haben), werden geschlagen und vom Brett entfernt." : language === "es" ? "Las piedras enemigas adyacentes ortogonalmente que están completamente rodeadas por tus piedras (es decir, que no tienen 'libertades') son capturadas y retiradas del tablero." : "Enemy stones orthogonally adjacent that are completely surrounded by your stones (meaning they have zero 'liberties') are captured and removed from the board."}</li>
                    <li>{language === "it" ? "Una pietra non può essere posizionata in una casella in cui non avrebbe libertà immediatamente, a meno che quella mossa non catturi pietre nemiche (Mossa Suicida vietata)." : language === "fr" ? "Une pierre ne peut pas être placée sur une intersection où elle n'aurait immédiatement aucune liberté, à moins que ce coup ne capture des pierres ennemies (Règle du Suicide)." : language === "de" ? "Ein Stein darf nicht auf einem Feld platziert werden, auf dem er sofort keine Freiheiten mehr hätte, es sei denn, dieser Zug schlägt gegnerische Steine (Selbstmordregel)." : language === "es" ? "Una piedra no se puede colocar en una casilla donde no tendría libertades inmediatamente, a menos que ese movimiento capture piedras enemigas (Regla de Suicidio)." : "A stone cannot be placed in a spot where it would immediately have no liberties, unless that move captures enemy stones (Suicide rule)."}</li>
                    <li>{language === "it" ? "Regola del Ko: non è possibile posizionare una pietra in modo da ricreare esattamente la stessa posizione della plancia del turno precedente." : language === "fr" ? "Règle de Ko : vous ne pouvez pas placer une pierre de manière à recréer exactement la même position sur le plateau qu'au tour précédent." : language === "de" ? "Ko-Regel: Ein Stein darf nicht so gesetzt werden, dass exakt dieselbe Brettstellung wie im vorherigen Zug entsteht." : language === "es" ? "Regla del Ko: no se puede colocar una piedra de manera que se recree exactamente la misma posición del tablero que en el turno anterior." : "Ko rule: you cannot place a stone in a way that recreates exactly the same board position as the previous turn."}</li>
                    <li><strong className="text-emerald-400">{language === "it" ? "Attenzione agli Occhi (Eyes):" : "Eyes & Liberties:"}</strong> {language === "it" ? "Le libertà sono le intersezioni vuote! Un'unica intersezione vuota (il puntino incrociato) circondata da pietre rappresenta una sola libertà, anche se visivamente circondata da 4 quadrati. Per non essere mai catturato, un gruppo deve avere almeno due 'occhi' (intersezioni vuote) separati." : "Liberties are empty intersections! A single empty intersection surrounded by stones counts as exactly ONE liberty, even if surrounded by 4 visual grid squares. To be uncapturable, a group must have at least TWO completely separate 'eyes' (empty intersections)."}</li>
                    <li><strong className="text-amber-300">{language === "it" ? "Fine Partita (2 Passaggi Consecutivi):" : language === "es" ? "Fin de la Partida (2 Pases Consecutivos):" : language === "fr" ? "Fin de Partie (2 Passes Consécutives):" : language === "de" ? "Spielende (2 aufeinanderfolgende Pässe):" : "Game End (2 Consecutive Passes):"}</strong> {language === "it" ? "Quando tutti i confini sono chiusi e non ci sono più mosse utili da giocare, un giocatore PASSA. Quando ENTRAMBI i giocatori passano consecutivamente, la partita termina e si accede alla schermata di conteggio del territorio per decretare la vittoria." : language === "es" ? "Cuando todos los límites están cerrados y no quedan movimientos útiles, un jugador PASA. Cuando AMBOS jugadores pasan consecutivamente, la partida termina y se accede al conteo final del territorio para proclamar la victoria." : language === "fr" ? "Lorsque toutes les frontières sont fermées et qu'il n'y a plus de coups utiles, un joueur PASSE. Lorsque les DEUX joueurs passent consécutivement, la partie se termine et le décompte du territoire proclame la victoire." : language === "de" ? "Wenn alle Grenzen geschlossen sind und keine Züge mehr sinnvoll sind, PASST ein Spieler. Wenn BEIDE Spieler nacheinander passen, endet das Spiel und die Gebietspunkte werden gezählt." : "When all borders are sealed and no useful moves remain, a player PASSES. When BOTH players pass consecutively, the game ends and moves to territory counting to declare the winner."}</li>
                  </ul>
                </div>

                <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                  <h3 className="text-lg font-black text-zinc-300 mb-3 uppercase">
                    {language === "it" ? "Risorse Utili (Link Esterni)" : "Useful Resources (External Links)"}
                  </h3>
                  <ul className="text-sm text-blue-400 space-y-2 list-none">
                    <li><a href="https://www.reddit.com/r/baduk/s/DLWuk9Fduq" target="_blank" rel="noopener noreferrer" className="hover:underline">→ Reddit r/baduk: Links for beginners</a></li>
                    <li><a href="https://gomagic.org/courses/go-rules/" target="_blank" rel="noopener noreferrer" className="hover:underline">→ Go Magic: Introduction</a></li>
                    <li><a href="https://senseis.xmp.net/?PagesForBeginners" target="_blank" rel="noopener noreferrer" className="hover:underline">→ Sensei's Library: Beginners</a></li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setIsBadukRulesOpen(false);
                    setHistoryMode("baduk");
                    setIsHistoryOpen(true);
                  }}
                  className="w-full mt-8 py-3 bg-slate-800 rounded-2xl font-black text-sm text-zinc-300 border border-zinc-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {language === "it" ? "STORIA / CURIOSITÀ" : "HISTORY / TRIVIA"}
                </button>

              </div>

              <button
                onClick={() => setIsBadukRulesOpen(false)}
                className="w-full mt-6 py-4 bg-zinc-900/30 text-zinc-300 rounded-xl font-black text-base uppercase tracking-wider shadow-lg active:scale-95 transition-transform hover:bg-zinc-900/50 border border-zinc-500/30"
              >
                {language === "it" ? "CHIUDI" : "CLOSE"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isStrategoRulesOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-amber-500/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-amber-400 uppercase tracking-tight flex items-center gap-2">
                <span className="text-3xl">🚩</span>
                {language === "it" ? "COME SI GIOCA" : language === "es" ? "CÓMO JUGAR" : language === "fr" ? "COMMENT JOUER" : language === "de" ? "SPIELANLEITUNG" : "HOW TO PLAY"} (STRATEGO)
              </h2>
              <button
                onClick={() => setIsStrategoRulesOpen(false)}
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label="Chiudi"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar text-slate-300 text-sm leading-relaxed">
              {/* 1. Obiettivo & Laghi */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 space-y-2">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                  🎯 1. {language === "it" ? "OBIETTIVO & I 2 LAGHI CENTRALI" : language === "es" ? "OBJETIVO Y LOS 2 LAGOS CENTRALES" : language === "fr" ? "OBJECTIF & LES 2 LACS CENTRAUX" : language === "de" ? "ZIEL & DIE 2 SEEN" : "OBJECTIVE & THE 2 LAKES"}
                </h3>
                <p>
                  {language === "it"
                    ? "L'obiettivo supremo è catturare la BANDIERA (Flag) nemica. Si vince anche se l'avversario non ha più pedine capaci di muoversi. Al centro della scacchiera 10x10 si trovano due laghi 2x2 caselle invalicabili che creano 3 corridoi strategici."
                    : language === "es"
                    ? "El objetivo primordial es capturar la BANDERA enemiga. También se gana si el rival se queda sin piezas con movimiento legal. En el centro del tablero de 10x10 hay dos lagos de 2x2 casillas infranqueables que forman 3 corredores estratégicos."
                    : language === "fr"
                    ? "L'objectif ultime est de capturer le DRAPEAU ennemi. Vous gagnez également si l'adversaire n'a plus aucune pièce mobile. Au centre du plateau 10x10 se trouvent deux lacs infranchissables de 2x2 cases créant 3 couloirs stratégiques."
                    : language === "de"
                    ? "Das oberste Ziel ist es, die feindliche FAHNE zu erobern. Sie gewinnen auch, wenn der Gegner keine beweglichen Figuren mehr hat. In der Mitte des 10x10-Bretts befinden sich zwei unpassierbare 2x2-Seen, die 3 strategische Engpässe bilden."
                    : "The primary objective is capturing the enemy FLAG. You also win if the opponent has no movable pieces left. In the center of the 10x10 board are two 2x2 lake zones that no piece may enter, creating 3 key choke points."}
                </p>
              </div>

              {/* 2. Gradi Militari */}
              <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 space-y-2">
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                  🎖️ 2. {language === "it" ? "GERARCHIA DEI GRADI MILITARI" : language === "es" ? "JERARQUÍA DE RANGOS MILITARES" : language === "fr" ? "HIÉRARCHIE DES GRADES MILITAIRES" : language === "de" ? "RANGORDNUNG DER ARMEE" : "MILITARY RANK HIERARCHY"}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === "it"
                    ? "In combattimento normale, il grado più alto vince ed elimina quello inferiore: Maresciallo (10) > Generale (9) > Colonnello (8) > Maggiore (7) > Capitano (6) > Tenente (5) > Sergente (4) > Geniere (3) > Esploratore (2) > Spia (1). A parità di grado, entrambi i pezzi cadono."
                    : language === "es"
                    ? "En combate normal, el rango superior derrota y elimina al inferior: Mariscal (10) > General (9) > Coronel (8) > Mayor (7) > Capitán (6) > Teniente (5) > Sargento (4) > Minero (3) > Explorador (2) > Espía (1). A igual rango, ambas piezas quedan eliminadas."
                    : language === "fr"
                    ? "En combat normal, le grade supérieur l'emporte et élimine le grade inférieur : Maréchal (10) > Général (9) > Colonel (8) > Commandant (7) > Capitaine (6) > Lieutenant (5) > Sergent (4) > Démineur (3) > Éclaireur (2) > Espion (1). En cas d'égalité, les deux pièces sont éliminées."
                    : language === "de"
                    ? "Im regulären Kampf schlägt der höhere Rang den niedrigeren: Feldmarschall (10) > General (9) > Oberst (8) > Major (7) > Hauptmann (6) > Leutnant (5) > Feldwebel (4) > Mineur (3) > Aufklärer (2) > Spion (1). Bei gleichem Rang fallen beide Figuren."
                    : "In combat, higher rank eliminates lower rank: Marshal (10) > General (9) > Colonel (8) > Major (7) > Captain (6) > Lieutenant (5) > Sergeant (4) > Miner (3) > Scout (2) > Spy (1). Equal ranks eliminate each other."}
                </p>
              </div>

              {/* 3. Pezzi Speciali */}
              <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 space-y-2.5">
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                  ⚡ 3. {language === "it" ? "UNITÀ CON ABILITÀ SPECIALI" : language === "es" ? "UNIDADES CON HABILIDADES ESPECIALES" : language === "fr" ? "UNITÉS AUX POUVOIRS SPÉCIAUX" : language === "de" ? "SPEZIALEINHEITEN & KRÄFTE" : "SPECIAL UNITS & POWERS"}
                </h3>
                <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/20 text-xs">
                  <span className="font-black text-red-300">💣 {language === "it" ? "BOMBA" : language === "es" ? "BOMBA" : language === "fr" ? "BOMBE" : language === "de" ? "BOMBE" : "BOMB"} & ⛏️ {language === "it" ? "GENIERE (Grado 3)" : language === "es" ? "MINERO (Rango 3)" : language === "fr" ? "DÉMINEUR (Grade 3)" : language === "de" ? "MINEUR (Rang 3)" : "MINER (Rank 3)"}: </span>
                  <span>
                    {language === "it"
                      ? "Le Bombe sono immobili ed eliminano qualunque attaccante, tranne il Geniere che le disinnesca e le distrugge!"
                      : language === "es"
                      ? "¡Las Bombas son inmóviles y destruyen a cualquier atacante, excepto al Minero que las desactiva y retira!"
                      : language === "fr"
                      ? "Les Bombes sont immobiles et détruisent tout attaquant, sauf le Démineur qui les désamorce et les détruit !"
                      : language === "de"
                      ? "Bomben sind unbeweglich und zerstören jeden Angreifer, außer den Mineur, der sie entschärft und entfernt!"
                      : "Bombs are stationary and destroy any attacker, except the Miner who disarms and removes them!"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/20 text-xs">
                  <span className="font-black text-purple-300">🕵️ {language === "it" ? "SPIA (Grado 1) vs 🌟 MARESCIALLO (Grado 10)" : language === "es" ? "ESPÍA (Rango 1) vs 🌟 MARISCAL (Rango 10)" : language === "fr" ? "ESPION (Grade 1) vs 🌟 MARÉCHAL (Grade 10)" : language === "de" ? "SPION (Rang 1) vs 🌟 MARSCHALL (Rang 10)" : "SPY (Rank 1) vs 🌟 MARSHAL (Rank 10)"}: </span>
                  <span>
                    {language === "it"
                      ? "Se la Spia attacca il Maresciallo nemico per prima, lo ELIMINA! (Ma se è il Maresciallo ad attaccarla, la Spia soccombe)."
                      : language === "es"
                      ? "¡Si la Espía ataca primero al Mariscal enemigo, lo ELIMINA! (Pero si el Mariscal ataca a la Espía, la Espía es derrotada)."
                      : language === "fr"
                      ? "Si l'Espion attaque le Maréchal ennemi en premier, il l'ÉLIMINE ! (Mais si c'est le Maréchal qui attaque l'Espion, l'Espion succombe)."
                      : language === "de"
                      ? "Greift der Spion den feindlichen Feldmarschall zuerst an, ELIMINIERT er ihn! (Wird der Spion jedoch vom Marschall angegriffen, fällt der Spion)."
                      : "If the Spy attacks the enemy Marshal, it ELIMINATES him! (If the Marshal attacks the Spy, the Spy dies)."}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs">
                  <span className="font-black text-cyan-300">🔭 {language === "it" ? "ESPLORATORE (Grado 2)" : language === "es" ? "EXPLORADOR (Rango 2)" : language === "fr" ? "ÉCLAIREUR (Grade 2)" : language === "de" ? "AUFKLÄRER (Rang 2)" : "SCOUT (Rank 2)"}: </span>
                  <span>
                    {language === "it"
                      ? "Può muoversi di qualunque numero di caselle vuote in linea retta ortogonale, come la Torre negli scacchi!"
                      : language === "es"
                      ? "¡Puede desplazarse cualquier número de casillas vacías en línea recta ortogonal, como la Torre en el ajedrez!"
                      : language === "fr"
                      ? "Peut se déplacer d'un nombre quelconque de cases vides en ligne droite orthogonale, comme la Tour aux échecs !"
                      : language === "de"
                      ? "Darf beliebig viele freie Felder in gerader Linie ziehen, wie der Turm im Schach!"
                      : "Can move any number of open orthogonal squares in a straight line, like the Rook in chess!"}
                  </span>
                </div>
              </div>

              {/* Risorse Utili (Link Esterni) - Stile Baduk */}
              <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                <h3 className="text-lg font-black text-amber-300 mb-3 uppercase">
                  {language === "it" ? "Risorse Utili (Link Esterni)" : language === "es" ? "Recursos Útiles (Enlaces Externos)" : language === "fr" ? "Ressources Utiles (Liens Externes)" : language === "de" ? "Nützliche Ressourcen (Externe Links)" : "Useful Resources (External Links)"}
                </h3>
                <ul className="text-sm text-blue-400 space-y-2 list-none">
                  <li><a href="https://en.wikipedia.org/wiki/Stratego" target="_blank" rel="noopener noreferrer" className="hover:underline">→ Wikipedia: Stratego</a></li>
                  <li><a href="https://www.ultrastratego.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">→ International Stratego Federation (ISF)</a></li>
                  <li><a href="https://www.stratego.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">→ Stratego Official Strategy &amp; Rules</a></li>
                </ul>
              </div>

              {/* Pulsante Storia / Curiosita - Stile Baduk */}
              <button
                onClick={() => {
                  setIsStrategoRulesOpen(false);
                  setHistoryMode("stratego");
                  setIsHistoryOpen(true);
                }}
                className="w-full mt-8 py-3 bg-slate-800 rounded-2xl font-black text-sm text-amber-400 border border-amber-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {language === "it" ? "STORIA / CURIOSITÀ" : language === "es" ? "HISTORIA / CURIOSIDADES" : language === "fr" ? "HISTOIRE / CURIOSITÉS" : language === "de" ? "GESCHICHTE / KURIOSITÄTEN" : "HISTORY / TRIVIA"}
              </button>

              {/* Pulsante Chiudi - Stile Baduk */}
              <button
                onClick={() => setIsStrategoRulesOpen(false)}
                className="w-full mt-6 py-4 bg-amber-900/30 text-amber-300 rounded-xl font-black text-base uppercase tracking-wider shadow-lg active:scale-95 transition-transform hover:bg-amber-900/50 border border-amber-500/30"
              >
                {language === "it" ? "CHIUDI" : language === "es" ? "CERRAR" : language === "fr" ? "FERMER" : language === "de" ? "SCHLIESSEN" : "CLOSE"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isPrivacyOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic text-blue-400 uppercase tracking-tight">
                {t.privacyPolicy}
              </h2>
              <button
                onClick={() => setIsPrivacyOpen(false)}
                className="w-8 h-8 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar text-slate-300 text-sm font-medium leading-relaxed">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                {t.privacy_update}
              </p>

              <div className="space-y-4">
                {[
                  {
                    h: t.privacy_intro_h,
                    p: t.privacy_intro_p.replace("{developer}", DEVELOPER_NAME),
                  },
                  { h: t.privacy_data_h, p: t.privacy_data_p },
                  { h: t.privacy_ai_h, p: t.privacy_ai_p },
                  { h: t.privacy_services_h, p: t.privacy_services_p },
                  { h: t.privacy_contacts_h, p: t.privacy_contacts_p },
                ].map((section, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/30 p-4 rounded-2xl border border-white/5"
                  >
                    <h3 className="text-sm font-black text-white uppercase mb-2 tracking-wide">
                      {section.h}
                    </h3>
                    <p className="whitespace-pre-wrap">{section.p}</p>
                    {idx === 4 && (
                      <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="block mt-2 text-blue-400 font-bold underline"
                      >
                        {SUPPORT_EMAIL}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setIsPrivacyOpen(false);
                setSettingsTab("general");
                setIsSettingsOpen(true);
              }}
              className="w-full mt-8 py-4 bg-slate-800 text-white rounded-xl font-black text-base uppercase tracking-wider shadow-lg active:scale-95 transition-transform hover:bg-slate-700 border border-white/5"
            >
              ⬅ {t.settings}
            </button>
          </div>
        </div>
      )}
      {gameState.status === "ended" &&
        (onlineMatchSession ? gameState.winner === onlineMatchSession.myPlayerIndex : gameState.winner === 1) &&
        (winEffectRef.current === "fireworks" ? <Fireworks /> : <Confetti />)}

      {selectedBadge && (
        <div
          className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`text-6xl mb-4 relative inline-block ${selectedBadge.isUnlocked ? "" : "grayscale opacity-50"}`}
            >
              <span
                className={
                  selectedBadge.difficulty === "normale" &&
                  (selectedBadge.id === "shobu_master" ||
                    selectedBadge.id === "ponte" ||
                    selectedBadge.id === "martello" ||
                    selectedBadge.id === "arena")
                    ? "grayscale opacity-30"
                    : ""
                }
              >
                {selectedBadge.icon}
              </span>
              {selectedBadge.difficulty === "normale" &&
                (selectedBadge.id === "shobu_master" ||
                  selectedBadge.id === "ponte" ||
                  selectedBadge.id === "martello" ||
                  selectedBadge.id === "arena") && (
                  <span
                    className="absolute top-0 left-0 overflow-hidden whitespace-nowrap"
                    style={{ width: "50%" }}
                  >
                    {selectedBadge.icon}
                  </span>
                )}
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              {selectedBadge.name}
            </h2>
            <p className="text-slate-400 font-medium">{selectedBadge.desc}</p>
            {selectedBadge.isUnlocked ? (
              <div className="mt-6 pt-6 border-t border-white/10">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">
                  {t.unlockedOn || "Sbloccato il"}
                </span>
                <span className="text-sm font-bold text-white">
                  {selectedBadge.date
                    ? new Date(selectedBadge.date).toLocaleDateString()
                    : new Date().toLocaleDateString()}
                </span>
                {selectedBadge.difficulty && (
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mt-2">
                    {selectedBadge.difficulty === "normale"
                      ? t.normal
                      : selectedBadge.difficulty === "difficile"
                        ? t.hard
                        : (t as any).extreme}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t border-white/10">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  {t.locked || "Bloccato"}
                </span>
              </div>
            )}
            <button
              onClick={() => setSelectedBadge(null)}
              className="mt-6 w-full py-4 bg-slate-800 rounded-2xl font-bold text-white active:scale-95 transition-transform"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {isLeaderboardOpen && (
        <LeaderboardModal
          onClose={() => setIsLeaderboardOpen(false)}
          language={language}
          currentUserName={userName}
          userLocation={userLocation}
          currentScore={stats.totalScore || 0}
          deviceId={deviceId}
          stats={stats}
          onBadgeClick={(b) => setSelectedBadge(b)}
          isAdmin={isAdmin}
        />
      )}

      {isAdminStatsOpen && (
        <AdminStatsModal onClose={() => setIsAdminStatsOpen(false)} />
      )}

      {dailyMissions && (
        <DailyMissionsModal
          isOpen={isDailyMissionsOpen}
          onClose={() => setIsDailyMissionsOpen(false)}
          missions={dailyMissions.missions}
          language={language}
        />
      )}

      <OnlinePlayerSearchModal
        isOpen={isOnlineSearchOpen}
        onClose={() => {
          setIsOnlineSearchOpen(false);
          setOnlineSearchInitialQuery("");
        }}
        currentDeviceId={deviceId}
        currentUserName={userName}
        currentUserLocation={userLocation}
        currentUserEmail={userEmail}
        selectedGameMode={gameMode}
        currentBoardTheme={boardTheme}
        isRandomAbaloneTheme={isRandomAbaloneTheme}
        initialSearchQuery={onlineSearchInitialQuery}
        onSelectGameMode={(m) => setGameMode(m)}
        onSelectBoardTheme={(t: BoardTheme) => setBoardTheme(t)}
        onStartOnlineMatch={startOnlineMatch}
        language={language}
      />

      <PostOnlineMatchModal
        isOpen={showPostOnlineInviteModal}
        onClose={() => setShowPostOnlineInviteModal(false)}
        opponentName={postOnlineInviteSession?.opponentName || onlineMatchSession?.opponentName || ""}
        opponentLocation={postOnlineInviteSession?.opponentLocation || onlineMatchSession?.opponentLocation}
        gameMode={postOnlineInviteSession?.gameMode || onlineMatchSession?.gameMode}
        onProposeNewInvite={handleProposeNewInviteFromEnd}
        onReturnToMenu={handleReturnToMenuFromEnd}
        language={language}
      />

      <IncomingInviteModal
        invite={incomingInvite}
        onAccept={handleAcceptIncomingInvite}
        onDecline={handleDeclineIncomingInvite}
        language={language}
      />

      {showDebugLogs && (
        <div className="fixed inset-0 z-[3000] bg-black/90 flex flex-col p-4 pt-12 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-amber-500">DEBUG CONSOLE</h2>
            <div className="flex gap-2">
              <button
                onClick={() => Logger.clear()}
                className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-bold text-white hover:bg-slate-700"
              >
                Pulisci
              </button>
              <button
                onClick={() => setShowDebugLogs(false)}
                className="w-8 h-8 bg-slate-800 rounded-full text-white hover:bg-slate-700"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black rounded-xl p-3 overflow-y-auto font-mono text-[10px] text-green-400 whitespace-pre-wrap border border-white/10 custom-scrollbar">
            {logs.length === 0 ? (
              <span className="text-slate-600">Nessun log disponibile...</span>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  className={`mb-1.5 ${l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-400" : "text-green-400"}`}
                >
                  <span className="opacity-50">[{l.timestamp}]</span>{" "}
                  {l.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isSaveConfirmModalOpen && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
              <span className="text-3xl">💾</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
              {language === "it" ? "Salvare?" : "Save Game?"}
            </h2>
            <p className="text-slate-400 font-medium mb-8">
              {language === "it" 
                ? "Vuoi salvare la partita prima di uscire?" 
                : "Do you want to save the game before exiting?"}
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => {
                  setIsSaveConfirmModalOpen(false);
                  resetGameToMenu();
                }}
                className="flex-1 py-4 bg-slate-800 rounded-2xl font-bold text-white uppercase tracking-wider active:scale-95 transition-transform"
              >
                {language === "it" ? "No" : "No"}
              </button>
              <button
                onClick={() => {
                  setIsSaveConfirmModalOpen(false);
                  saveGameAndExit();
                }}
                className="flex-1 py-4 bg-blue-600 rounded-2xl font-bold text-white uppercase tracking-wider active:scale-95 transition-transform shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                {language === "it" ? "Sì, Salva" : "Yes, Save"}
              </button>
            </div>
            <button 
              onClick={() => setIsSaveConfirmModalOpen(false)}
              className="mt-6 text-sm text-slate-500 hover:text-slate-300 font-bold uppercase transition-colors"
            >
              {language === "it" ? "Annulla" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {isOnlineExitConfirmOpen && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 border border-red-500/30">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
              {language === "it" ? "Abbandonare?" : "Leave Game?"}
            </h2>
            <p className="text-slate-400 font-medium mb-8">
              {language === "it" 
                ? "Vuoi davvero abbandonare la partita online? L'abbandono decreterà la vittoria del tuo avversario." 
                : "Do you really want to leave the online match? Leaving will forfeit the game to your opponent."}
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setIsOnlineExitConfirmOpen(false)}
                className="flex-1 py-4 bg-slate-800 rounded-2xl font-bold text-white uppercase tracking-wider active:scale-95 transition-transform"
              >
                {language === "it" ? "Annulla" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  setIsOnlineExitConfirmOpen(false);
                  handleOnlineAbandon();
                }}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-bold text-white uppercase tracking-wider active:scale-95 transition-transform shadow-[0_0_15px_rgba(220,38,38,0.4)]"
              >
                {language === "it" ? "Esci" : "Leave"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Salvataggio ed Uscita Baduk/Go Online */}
      {isBadukOnlineExitModalOpen && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-5 border border-blue-500/30">
              <span className="text-3xl">💾</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
              {language === "it" ? "Uscita da Baduk/Go" : "Exit Baduk/Go"}
            </h2>
            <p className="text-slate-300 text-sm font-medium mb-6">
              {language === "it" 
                ? "Vuoi salvare la partita in corso prima di uscire? Potrai riprenderla in qualsiasi momento quando rigiocherai con lo stesso avversario." 
                : "Do you want to save the current match before exiting? You can resume it anytime when playing with the same opponent."}
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                disabled={isSavingOnlineBaduk}
                onClick={() => {
                  setIsBadukOnlineExitModalOpen(false);
                  handleSaveOnlineBadukGame(true);
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-2xl font-bold text-white uppercase tracking-wider active:scale-95 transition-transform shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>{language === "it" ? "Salva ed Esci" : "Save and Exit"}</span>
              </button>
              <button
                disabled={isSavingOnlineBaduk}
                onClick={() => {
                  setIsBadukOnlineExitModalOpen(false);
                  handleOnlineAbandon();
                }}
                className="w-full py-3 bg-red-900/60 hover:bg-red-800/80 rounded-2xl font-semibold text-red-200 text-xs uppercase tracking-wider active:scale-95 transition-transform border border-red-500/30"
              >
                {language === "it" ? "Esci senza salvare (Abbandona)" : "Exit without saving (Forfeit)"}
              </button>
              <button
                onClick={() => setIsBadukOnlineExitModalOpen(false)}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 font-bold uppercase transition-colors"
              >
                {language === "it" ? "Annulla" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ripresa Partita Baduk/Go Online */}
      {isResumeOnlineBadukModalOpen && pendingResumeBadukSave && (
        <div className="fixed inset-0 z-[5000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <span className="text-3xl">⏳</span>
            </div>

            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-1">
              {language === "it" ? "Partita Salvata Trovata" : "Saved Match Found"}
            </h2>
            <p className="text-xs text-amber-300 font-semibold mb-3">
              Baduk / Go Multiplayer
            </p>

            <div className="bg-slate-800/80 rounded-2xl p-4 w-full mb-5 text-left border border-slate-700/60 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span>{language === "it" ? "Avversario:" : "Opponent:"}</span>
                <span className="font-bold text-white">{onlineMatchSession?.opponentName || pendingResumeBadukSave.player2Name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>{language === "it" ? "Mosse giocate:" : "Turns played:"}</span>
                <span className="font-bold text-amber-300">{pendingResumeBadukSave.turnCount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-[10px]">
                <span>{language === "it" ? "Salvataggio:" : "Saved on:"}</span>
                <span>{pendingResumeBadukSave.savedAt ? new Date(pendingResumeBadukSave.savedAt).toLocaleDateString() : ""}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-6 font-medium">
              {language === "it"
                ? "È stata trovata una partita precedente salvata tra voi due. Desideri riprenderla?"
                : "A previously saved match between you two was found. Would you like to resume it?"}
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => handleAcceptResumeBaduk(pendingResumeBadukSave)}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-2xl font-black text-white uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
              >
                <span>▶️</span>
                <span>{language === "it" ? "Riprendi Partita" : "Resume Match"}</span>
              </button>

              <button
                onClick={() => {
                  setIsResumeOnlineBadukModalOpen(false);
                  setPendingResumeBadukSave(null);
                }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-slate-300 text-xs uppercase tracking-wider active:scale-95 transition-transform border border-slate-700"
              >
                {language === "it" ? "Nuova Partita" : "Start New Match"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isExitAlertOpen && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 border border-red-500/30">
              <span className="text-3xl">🚪</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
              {language === "it" ? "Uscire?" : "Exit?"}
            </h2>
            <p className="text-slate-400 font-medium mb-8">
              {language === "it" 
                ? "Sei sicuro di voler chiudere l'applicazione?" 
                : "Are you sure you want to close the application?"}
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setIsExitAlertOpen(false)}
                className="flex-1 py-4 bg-slate-800 rounded-2xl font-bold text-white uppercase tracking-wider active:scale-95 transition-transform"
              >
                {language === "it" ? "Annulla" : "Cancel"}
              </button>
              <button
                onClick={() => handleExitApp()}
                className="flex-1 py-4 bg-red-600 rounded-2xl font-bold text-white uppercase tracking-wider active:scale-95 transition-transform shadow-[0_0_15px_rgba(220,38,38,0.4)]"
              >
                {language === "it" ? "Esci" : "Exit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Partita Salvata */}
      {isResumeModalOpen && pendingSavedGameInfo && (
        <div className="fixed inset-0 z-[5000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
          <div className="bg-slate-900 border-2 border-blue-500/60 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/40 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <span className="text-3xl">💾</span>
            </div>

            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-1">
              {language === "it" ? "Partita in Sospeso" : "Saved Game Available"}
            </h2>

            <p className="text-blue-400 font-extrabold text-sm uppercase tracking-wide mb-3">
              {(() => {
                const modeLabels: Record<string, string> = {
                  corsa: "Quoridor", dominio: "Wall Go AI", fuga: "Fuga", battaglia: "Battaglia",
                  abalone: "Abalone", pente: "Pente", domineering: "Domineering", orbito: "Orbito",
                  shobu: "Shōbu", yinsh: "YINSH", baduk: "Baduk (Go)", onitama: "Onitama",
                  chain_triangle: "Chain Triangle", amazons: "Amazons", stratego: "Stratego"
                };
                return modeLabels[pendingSavedGameInfo.mode] || pendingSavedGameInfo.mode;
              })()}
            </p>

            <p className="text-slate-300 text-xs font-semibold leading-relaxed mb-6">
              {language === "it"
                ? "Hai una partita non conclusa. Vuoi riprenderla ora oppure lasciarla in sospeso per giocare a un altro gioco?"
                : "You have an unfinished game. Do you want to resume it now or leave it saved to play another game?"}
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              {/* Riprendi Partita */}
              <button
                onClick={() => {
                  setIsResumeModalOpen(false);
                  setHasDismissedResumeModal(true);
                  setGameMode(pendingSavedGameInfo.mode);
                  loadSavedGame(pendingSavedGameInfo.mode);
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl font-black text-xs text-white uppercase tracking-wider shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
              >
                <span>▶️</span>
                <span>{language === "it" ? "Riprendi Partita" : "Resume Game"}</span>
              </button>

              {/* Lascia in Sospeso e Gioca ad Altro */}
              <button
                onClick={() => {
                  setIsResumeModalOpen(false);
                  setHasDismissedResumeModal(true);
                  setPendingSavedGameInfo(null);
                }}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-slate-700 rounded-2xl font-extrabold text-xs text-slate-200 uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>⏸️</span>
                <span>{language === "it" ? "Lascia in Sospeso e Gioca ad Altro" : "Leave Saved & Play Another"}</span>
              </button>

              {/* Elimina Salvataggio */}
              <button
                onClick={async () => {
                  await removeStorageItem(`wallgo_saved_game_${pendingSavedGameInfo.mode}`);
                  await removeStorageItem("wallgo_last_saved_mode");
                  setSavedGamesVersion((v) => v + 1);
                  setIsResumeModalOpen(false);
                  setHasDismissedResumeModal(true);
                  setPendingSavedGameInfo(null);
                }}
                className="w-full py-2 text-[11px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider opacity-80 hover:opacity-100 transition-opacity mt-1"
              >
                🗑️ {language === "it" ? "Elimina Salvataggio" : "Delete Saved Game"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* PC RIGHT PANEL: Leaderboards (Classifiche) & Stats */}
      <div className="hidden lg:flex w-80 xl:w-96 shrink-0 h-full flex-col bg-slate-900/80 rounded-[2.5rem] border border-white/10 p-4 sm:p-5 overflow-hidden shadow-2xl backdrop-blur-xl">
        <LeaderboardModal
          isInline={true}
          language={language}
          currentUserName={userName}
          userLocation={userLocation}
          currentScore={stats.totalScore || 0}
          deviceId={deviceId}
          stats={stats}
          onBadgeClick={(b) => setSelectedBadge(b)}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );

  if (VIDEO_MODE) {
    return (
      <div className="w-full h-screen bg-slate-950 flex items-center justify-center overflow-hidden relative font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-black pointer-events-none" />

        <div className="hidden xl:flex flex-1 h-full flex-col items-end justify-center pr-8 space-y-8 z-0 opacity-80">
          <div className="text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 drop-shadow-[0_0_30px_rgba(37,99,235,0.4)] leading-none text-right">
            WALL
            <br />
            GO
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="h-1.5 w-48 bg-blue-500/50 rounded-full" />
            <div className="h-1.5 w-32 bg-blue-500/30 rounded-full" />
            <div className="h-1.5 w-16 bg-blue-500/10 rounded-full" />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-6xl max-h-[95vh] aspect-video bg-black rounded-3xl border-[8px] border-slate-800 shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col mx-4">
          {content}
        </div>

        <div className="hidden xl:flex flex-1 h-full flex-col items-start justify-center pl-8 space-y-12 z-0 opacity-60">
          <div className="relative">
            <div className="absolute -left-8 top-0 w-1 h-32 bg-gradient-to-b from-emerald-500 to-transparent" />
            <div className="text-5xl font-black text-slate-800 uppercase tracking-[0.2em] rotate-90 origin-top-left translate-x-12 translate-y-12">
              STRATEGY
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 opacity-50">
            <div className="w-16 h-16 rounded-2xl border-2 border-emerald-500/30 rotate-12" />
            <div className="w-12 h-12 rounded-xl border-2 border-red-500/30 -rotate-6 translate-y-8" />
            <div className="w-20 h-20 rounded-full border border-blue-500/20 col-span-2 mx-auto mt-4 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return content;
};

export default App;
