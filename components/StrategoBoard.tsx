import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Maximize, Minimize } from "lucide-react";
import { SoundManager } from "../utils/soundManager";
import { Stratego3DFigure, STRATEGO_RANK_COLORS } from "./Stratego3DFigures";
import { SwordDuelArena } from "./SwordDuelArena";
import { StrategoOrganicLake } from "./StrategoOrganicLake";
import { Fireworks } from "./Fireworks";
import { saveStorageItem, removeStorageItem } from "../utils/storage";
import { BoardTheme, Language } from "../types";
import { getStrategoI18n, getPieceLocalizedName } from "../utils/strategoTranslations";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

export type StrategoPieceType =
  | "flag"
  | "bomb"
  | "spy"
  | "scout"
  | "miner"
  | "sergeant"
  | "lieutenant"
  | "captain"
  | "major"
  | "colonel"
  | "general"
  | "marshal";

export interface StrategoPiece {
  id: string;
  player: "red" | "blue"; // red = human/admin, blue = AI
  type: StrategoPieceType;
  rank: number; // 10=Marshal, 9=General... 1=Spy, 0=Bomb, -1=Flag
  revealedToOpponent: boolean;
  row: number;
  col: number;
}

export interface StrategoBattleResult {
  attacker: StrategoPiece;
  defender: StrategoPiece;
  winner: "attacker" | "defender" | "draw";
  description: string;
}

export type StrategoDifficulty = "easy" | "medium" | "hard";
export type StrategoStarter = "red" | "blue";

export interface StrategoOnlineMatchSession {
  roomId: string;
  gameMode: string;
  myPlayerIndex: 1 | 2;
  opponentName: string;
  opponentLocation?: string;
  opponentDeviceId?: string;
  opponentScore?: number;
  isInviter?: boolean;
  isSimulatedOpponent?: boolean;
}

export interface StrategoBoardProps {
  onBackToMenu: () => void;
  onBackToSetup?: () => void;
  onOpenHistory?: () => void;
  onOpenRules?: () => void;
  language: string;
  isAdmin?: boolean;
  initialDifficulty?: StrategoDifficulty;
  initialStarter?: StrategoStarter;
  initialPreset?: string;
  savedGameData?: any;
  boardTheme?: BoardTheme;
  onlineMatchSession?: StrategoOnlineMatchSession | null;
  onOnlineAbandon?: () => void;
  onEndOnlineMatch?: (result: {
    winner: "red" | "blue" | "draw";
    winnerIndex: 1 | 2;
    isMeWinner: boolean;
    reason?: string;
  }) => void;
  onGameEnd?: (result: {
    winner: "red" | "blue";
    isWin: boolean;
    difficulty: StrategoDifficulty;
    pointsAwarded: number;
  }) => void;
}

// Lake definitions (10x10 board, 2x2 lakes)
export const isStrategoLake = (r: number, c: number): boolean => {
  if (r === 4 || r === 5) {
    if (c === 2 || c === 3) return true;
    if (c === 6 || c === 7) return true;
  }
  return false;
};

// Piece metadata
export const STRATEGO_PIECE_DEFS: Record<
  StrategoPieceType,
  {
    nameIt: string;
    nameEn: string;
    rank: number;
    count: number;
    icon: string;
    movementIt: string;
    movementEn: string;
    specialAbilityIt: string;
    specialAbilityEn: string;
    descriptionIt: string;
    descriptionEn: string;
    movable: boolean;
  }
> = {
  marshal: {
    nameIt: "Maresciallo",
    nameEn: "Marshal",
    rank: 10,
    count: 1,
    icon: "🌟",
    movementIt: "1 casella ortogonale",
    movementEn: "1 square orthogonal",
    specialAbilityIt: "Grado Supremo: Batte qualunque pezzo militare nemico (Gradi 1-9). Vulnerabile solo alla Spia (se attaccato) e alle Bombe.",
    specialAbilityEn: "Supreme Rank: Beats any enemy soldier (ranks 1-9). Vulnerable only to the Spy (if attacked) and Bombs.",
    descriptionIt: "Il grado più elevato dell'esercito. Guida l'assalto finale e comanda il campo di battaglia.",
    descriptionEn: "Highest rank in the army. Leads final assaults and commands the field.",
    movable: true,
  },
  general: {
    nameIt: "Generale",
    nameEn: "General",
    rank: 9,
    count: 1,
    icon: "🎖️",
    movementIt: "1 casella ortogonale",
    movementEn: "1 square orthogonal",
    specialAbilityIt: "Secondo in comando: Batte tutti i gradi dall'8 all'1. Superato solo dal Maresciallo (10) e dalle Bombe.",
    specialAbilityEn: "Second in command: Beats ranks 8 through 1. Defeated only by the Marshal (10) and Bombs.",
    descriptionIt: "Formidabile forza d'attacco per sfondare le difese centrali.",
    descriptionEn: "Powerful attacking force to shatter enemy center lines.",
    movable: true,
  },
  colonel: {
    nameIt: "Colonnello",
    nameEn: "Colonel",
    rank: 8,
    count: 2,
    icon: "🦅",
    movementIt: "1 casella ortogonale",
    movementEn: "1 square orthogonal",
    specialAbilityIt: "Ufficiale superiore di sfondamento: Batte tutti i gradi dal 7 all'1.",
    specialAbilityEn: "High-ranking officer: Eliminates all enemy units of rank 7 down to 1.",
    descriptionIt: "Ufficiale d'élite per conquistare le teste di ponte sui laghi.",
    descriptionEn: "Elite officer to control lake passage choke points.",
    movable: true,
  },
  major: {
    nameIt: "Maggiore",
    nameEn: "Major",
    rank: 7,
    count: 3,
    icon: "⚔️",
    movementIt: "1 casella ortogonale",
    movementEn: "1 square orthogonal",
    specialAbilityIt: "Ufficiale d'assalto: Batte i capitani (6), i tenenti (5), i sergenti (4), i genieri (3), gli esploratori (2) e le spie (1).",
    specialAbilityEn: "Assault officer: Defeats captains (6), lieutenants (5), sergeants (4), miners (3), scouts (2), and spies (1).",
    descriptionIt: "Ottimo per incursioni offensive e per eliminare la fanteria nemica.",
    descriptionEn: "Great for aggressive probes and eliminating forward troops.",
    movable: true,
  },
  captain: {
    nameIt: "Capitano",
    nameEn: "Captain",
    rank: 6,
    count: 4,
    icon: "🛡️",
    movementIt: "1 casella ortogonale",
    movementEn: "1 square orthogonal",
    specialAbilityIt: "Medio rango equilibrato: Spina dorsale delle colonne di pattugliamento e presidio dei laghi.",
    specialAbilityEn: "Balanced mid-rank: Backbone of scouting columns and defensive holds.",
    descriptionIt: "Pilastro della difesa e della prima linea.",
    descriptionEn: "Sturdy pillar of frontline defense.",
    movable: true,
  },
  lieutenant: {
    nameIt: "Tenente",
    nameEn: "Lieutenant",
    rank: 5,
    count: 4,
    icon: "🗡️",
    movementIt: "1 casella ortogonale",
    movementEn: "1 square orthogonal",
    specialAbilityIt: "Fanteria regolare avanzata: Elimina sergenti, genieri, esploratori e spie.",
    specialAbilityEn: "Regular frontline infantry: Eliminates sergeants, miners, scouts, and spies.",
    descriptionIt: "Truppa d'attacco per snidare le pedine nemiche di basso grado.",
    descriptionEn: "Frontline unit designed to flush out lower-ranked enemy pieces.",
    movable: true,
  },
  sergeant: {
    nameIt: "Sergente",
    nameEn: "Sergeant",
    rank: 4,
    count: 4,
    icon: "🪖",
    movementIt: "1 casella ortogonale",
    movementEn: "1 square orthogonal",
    specialAbilityIt: "Pattugliatore di prima linea: Ideale per saggiare la forza nemica e catturare esploratori e spie.",
    specialAbilityEn: "Frontline patrol: Ideal for testing enemy ranks and eliminating scouts and spies.",
    descriptionIt: "Pattuglia di prima linea a protezione dei pezzi d'alto rango.",
    descriptionEn: "Protective screen guarding valuable high-ranking officers.",
    movable: true,
  },
  miner: {
    nameIt: "Geniere",
    nameEn: "Miner",
    rank: 3,
    count: 5,
    icon: "⛏️",
    movementIt: "1 casella ortogonale",
    movementEn: "1 square orthogonal",
    specialAbilityIt: "⭐ DISINNESCO BOMBE: È l'UNICO pezzo in grado di attaccare e neutralizzare le BOMBE nemiche senza saltare in aria!",
    specialAbilityEn: "⭐ BOMB DEFUSER: The ONLY piece capable of attacking and defusing enemy BOMBS safely without blowing up!",
    descriptionIt: "Unità fondamentale per aprire un varco nelle fortezze di bombe nemiche verso la Bandiera.",
    descriptionEn: "Vital unit needed to breach bomb bastions guarding the enemy Flag.",
    movable: true,
  },
  scout: {
    nameIt: "Esploratore",
    nameEn: "Scout",
    rank: 2,
    count: 8,
    icon: "🔭",
    movementIt: "Illimitato in linea retta (Stile Torre negli Scacchi)",
    movementEn: "Unlimited in a straight orthogonal line (like Chess Rook)",
    specialAbilityIt: "⭐ RICOGNIZIONE A LUNGO RAGGIO: Può muoversi di quante caselle libere desidera in linea retta per colpire o sondare a sorpresa!",
    specialAbilityEn: "⭐ LONG-RANGE RECON: Can move any number of unobstructed empty squares in a straight line to strike or scout!",
    descriptionIt: "Permette di sondare l'identità dei pezzi nemici e lanciare attacchi fulminei attraverso il tabellone.",
    descriptionEn: "Permits probing enemy pieces and launching swift cross-board skirmishes.",
    movable: true,
  },
  spy: {
    nameIt: "Spia",
    nameEn: "Spy",
    rank: 1,
    count: 1,
    icon: "🕵️",
    movementIt: "1 casella ortogonale",
    movementEn: "1 square orthogonal",
    specialAbilityIt: "⭐ AGGUATO AL MARESCIALLO: Se attacca per prima il Maresciallo nemico (10), lo UCCIDE all'istante! (Se è il Maresciallo ad attaccarla, la Spia muore).",
    specialAbilityEn: "⭐ MARSHAL ASSASSIN: If it initiates combat against the enemy Marshal (10), the Marshal is instantly ELIMINATED! (If attacked by the Marshal, Spy dies).",
    descriptionIt: "L'arma segreta dell'esercito: un asso nella manica micidiale contro il pezzo più forte dell'avversario.",
    descriptionEn: "The secret tactical wildcard: deadly against the opponent's supreme commander.",
    movable: true,
  },
  bomb: {
    nameIt: "Bomba",
    nameEn: "Bomb",
    rank: 0,
    count: 6,
    icon: "💣",
    movementIt: "Immobile (Non può muoversi)",
    movementEn: "Immobile (Cannot move)",
    specialAbilityIt: "⭐ DIFESA LETALE: Distrugge all'istante qualunque pedina la attacchi, indipendentemente dal grado! Solo il Geniere (3) può disinnescarla.",
    specialAbilityEn: "⭐ LETHAL DEFENSE: Instantly destroys any attacker regardless of rank! Only the Miner (3) can disarm it safely.",
    descriptionIt: "Mina letale posizionata per proteggere la Bandiera o creare falsi bunker di dissuasione psicologica.",
    descriptionEn: "Deadly barrier placed to guard the Flag or create psychological bluff strongholds.",
    movable: false,
  },
  flag: {
    nameIt: "Bandiera",
    nameEn: "Flag",
    rank: -1,
    count: 1,
    icon: "🚩",
    movementIt: "Immobile (Non può muoversi)",
    movementEn: "Immobile (Cannot move)",
    specialAbilityIt: "⭐ OBIETTIVO SUPREMO DELLA PARTITA: Chi cattura la Bandiera avversaria vince IMMEDIATAMENTE la battaglia!",
    specialAbilityEn: "⭐ SUPREME MATCH OBJECTIVE: Capturing the opponent's Flag grants INSTANT VICTORY!",
    descriptionIt: "Il cuore dell'esercito. Deve essere custodita e protetta con astuzia e ingegno strategico.",
    descriptionEn: "The heart of the army. Must be guarded with deception and tactical fortress building.",
    movable: false,
  },
};

// Key for storing the player's personal custom army setup
export const STRATEGO_PERSONAL_PRESET_KEY = "wallgo_stratego_personal_preset";

export const getSavedPersonalPreset = (): StrategoPieceType[][] | null => {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STRATEGO_PERSONAL_PRESET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === 4 &&
      parsed.every((row: any) => Array.isArray(row) && row.length === 10)
    ) {
      return parsed;
    }
  } catch (e) {
    // Ignored
  }
  return null;
};

// Strategic preset configurations for red (rows 6..9, cols 0..9)
export const PRESETS: Record<
  string,
  {
    nameIt: string;
    nameEn: string;
    descIt: string;
    descEn: string;
    icon: string;
    map: StrategoPieceType[][];
  }
> = {
  personal: {
    nameIt: "Personale",
    nameEn: "Custom",
    icon: "⭐",
    descIt: "Schieramento personalizzato creato e salvato dal giocatore.",
    descEn: "Custom army deployment arranged and saved by the player.",
    map: [
      // row 6
      ["scout", "sergeant", "miner", "lieutenant", "scout", "scout", "lieutenant", "miner", "sergeant", "scout"],
      // row 7
      ["captain", "major", "scout", "captain", "colonel", "general", "captain", "scout", "major", "captain"],
      // row 8
      ["sergeant", "miner", "lieutenant", "marshal", "miner", "miner", "lieutenant", "major", "sergeant", "colonel"],
      // row 9
      ["bomb", "flag", "bomb", "scout", "bomb", "bomb", "scout", "spy", "bomb", "bomb"],
    ],
  },
  balanced: {
    nameIt: "Bilanciato Tattico",
    nameEn: "Tactical Balanced",
    icon: "⚖️",
    descIt: "Distribuzione armonica di genieri ed esploratori sulle ali con ufficiali scaglionati in profondità.",
    descEn: "Harmonious balance of miners and scouts on the flanks with staggered officer coverage.",
    map: [
      // row 6
      ["scout", "sergeant", "miner", "lieutenant", "scout", "scout", "lieutenant", "miner", "sergeant", "scout"],
      // row 7
      ["captain", "major", "scout", "captain", "colonel", "general", "captain", "scout", "major", "captain"],
      // row 8
      ["sergeant", "miner", "lieutenant", "marshal", "miner", "miner", "lieutenant", "major", "sergeant", "colonel"],
      // row 9
      ["bomb", "flag", "bomb", "scout", "bomb", "bomb", "scout", "spy", "bomb", "bomb"],
    ],
  },
  wall: {
    nameIt: "Muraglia Difensiva",
    nameEn: "Defensive Wall",
    icon: "🛡️",
    descIt: "Presidio serrato sui varchi d'acqua e trincea arretrata a protezione dell'asta centrale.",
    descEn: "Dense defensive wall screening water bottlenecks with protected trench rear lines.",
    map: [
      // row 6: defensive screen
      ["sergeant", "scout", "captain", "scout", "sergeant", "sergeant", "scout", "captain", "scout", "sergeant"],
      // row 7
      ["miner", "lieutenant", "major", "lieutenant", "miner", "miner", "lieutenant", "major", "lieutenant", "miner"],
      // row 8
      ["scout", "captain", "colonel", "general", "marshal", "colonel", "major", "captain", "scout", "miner"],
      // row 9
      ["scout", "scout", "bomb", "bomb", "bomb", "flag", "bomb", "bomb", "bomb", "spy"],
    ],
  },
  blitz: {
    nameIt: "Attacco d'Assalto Blitz",
    nameEn: "Blitz Assault",
    icon: "⚡",
    descIt: "Prima linea aggressiva con Maresciallo, Generale ed esploratori per prendere il controllo dei laghi.",
    descEn: "Aggressive frontlines with Marshal, General, and Scouts positioned to conquer lake choke points.",
    map: [
      // row 6: aggressive frontline
      ["scout", "marshal", "scout", "general", "scout", "colonel", "scout", "colonel", "scout", "scout"],
      // row 7
      ["captain", "major", "captain", "major", "captain", "major", "captain", "lieutenant", "lieutenant", "miner"],
      // row 8
      ["sergeant", "sergeant", "sergeant", "sergeant", "miner", "miner", "miner", "miner", "lieutenant", "lieutenant"],
      // row 9 (flag hidden on flank with decoy bombs)
      ["flag", "bomb", "bomb", "spy", "bomb", "scout", "scout", "bomb", "bomb", "bomb"],
    ],
  },
  bluff: {
    nameIt: "Doppio Bluff (Inganno)",
    nameEn: "Double Bluff",
    icon: "🎭",
    descIt: "Cluster di bombe civetta al centro per simulare una finta fortezza; vera bandiera decentrata.",
    descEn: "Decoy bomb fortress in center; true flag hidden quietly on the flank behind infantry.",
    map: [
      // row 6
      ["scout", "scout", "sergeant", "miner", "scout", "scout", "sergeant", "miner", "scout", "scout"],
      // row 7
      ["lieutenant", "captain", "colonel", "captain", "lieutenant", "captain", "colonel", "captain", "lieutenant", "lieutenant"],
      // row 8 (decoy bomb cluster in center, real flag in corner)
      ["marshal", "general", "major", "bomb", "bomb", "bomb", "major", "major", "sergeant", "sergeant"],
      // row 9
      ["flag", "bomb", "spy", "bomb", "bomb", "miner", "miner", "miner", "scout", "scout"],
    ],
  },
  fortress: {
    nameIt: "Fortezza con Bombe",
    nameEn: "Fortress Defense",
    icon: "🏰",
    descIt: "Bandiera bunkerata nell'angolo, circondata da un anello di mine letali e retroguardia protetta.",
    descEn: "Flag heavily fortified in the corner behind a ring of bombs with dense rear protection.",
    map: [
      // row 6
      ["scout", "sergeant", "scout", "lieutenant", "scout", "scout", "sergeant", "scout", "scout", "sergeant"],
      // row 7
      ["miner", "captain", "miner", "captain", "lieutenant", "captain", "miner", "lieutenant", "captain", "miner"],
      // row 8
      ["colonel", "major", "major", "colonel", "general", "marshal", "major", "miner", "sergeant", "lieutenant"],
      // row 9 (back row: flag protected by bombs)
      ["spy", "scout", "scout", "bomb", "bomb", "bomb", "bomb", "bomb", "bomb", "flag"],
    ],
  },
};

// Highly Detailed 3D Vector Figurines for each soldier rank and structure
const renderDetailedFigureSVG = (type: StrategoPieceType, isRed: boolean) => {
  const accentGold = isRed ? "#fbbf24" : "#93c5fd";
  const darkCoat = isRed ? "#7f1d1d" : "#1e3a8a";
  const lightCloth = isRed ? "#ef4444" : "#3b82f6";

  switch (type) {
    case "flag":
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Natural Ceremonial Pedestal Base - Zero Glow */}
          <path d="M10 32 L26 32 L24 28 L12 28 Z" fill="#292524" stroke="#1c1917" strokeWidth="0.8" />
          <rect x="11" y="28" width="14" height="1.5" fill="#78350f" />
          {/* Brass Flagpole */}
          <line x1="12" y1="5" x2="12" y2="28" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="5" r="1.8" fill="#fbbf24" stroke="#78350f" strokeWidth="0.6" />
          {/* Fluttering Silk Banner in the Wind */}
          <g style={{ transformOrigin: "12px 12px" }}>
            <path
              d="M13 6 C17 5 21 8 25 6 C28 4.5 30 7 30 7 L27 19 C25 17 21 20 17 17 C15 16 13 18 13 18 Z"
              fill={isRed ? "#b91c1c" : "#1d4ed8"}
              stroke={accentGold}
              strokeWidth="0.9"
            >
              <animate
                attributeName="d"
                dur="1.8s"
                repeatCount="indefinite"
                values="
                  M13 6 C17 5 21 8 25 6 C28 4.5 30 7 30 7 L27 19 C25 17 21 20 17 17 C15 16 13 18 13 18 Z;
                  M13 6 C17 7 21 5 25 8 C28 8 30 6 30 6 L27 18 C25 18 21 16 17 19 C15 17 13 18 13 18 Z;
                  M13 6 C17 8 21 4 25 5 C28 6 30 8 30 8 L27 20 C25 16 21 19 17 16 C15 16 13 18 13 18 Z;
                  M13 6 C17 5 21 8 25 6 C28 4.5 30 7 30 7 L27 19 C25 17 21 20 17 17 C15 16 13 18 13 18 Z
                "
              />
            </path>
            {/* Gold Crest on Banner */}
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="1.8s"
                repeatCount="indefinite"
                values="0,0; 0.6,0.8; -0.4,-0.5; 0,0"
              />
              <path d="M19 10 L22 10 L20.5 14 Z" fill="#fef08a" />
              <circle cx="20.5" cy="11.5" r="1.5" fill="#f59e0b" />
            </g>
            {/* Gold Tassel Fringe */}
            <path
              d="M13 18 C17 16 21 20 25 17 L27 19"
              stroke="#fcd34d"
              strokeWidth="0.8"
              strokeDasharray="1.2 0.8"
            >
              <animate
                attributeName="d"
                dur="1.8s"
                repeatCount="indefinite"
                values="
                  M13 18 C17 16 21 20 25 17 L27 19;
                  M13 18 C17 18 21 16 25 18 L27 18;
                  M13 18 C17 15 21 19 25 16 L27 20;
                  M13 18 C17 16 21 20 25 17 L27 19
                "
              />
            </path>
          </g>
        </svg>
      );

    case "bomb":
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Shadow */}
          <ellipse cx="18" cy="30" rx="9" ry="2.5" fill="#000000" fillOpacity="0.4" />
          {/* Cast Iron Sphere */}
          <circle cx="18" cy="20" r="9.5" fill="url(#ironBombGrad)" stroke="#1e293b" strokeWidth="1" />
          {/* Specular 3D highlight */}
          <ellipse cx="15" cy="16" rx="4" ry="2.2" fill="#ffffff" fillOpacity="0.3" transform="rotate(-25 15 16)" />
          {/* Riveted Welded Band */}
          <path d="M9 20 C11 23 25 23 27 20" stroke="#475569" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          {/* Brass Fuse Collar */}
          <rect x="15.5" y="9" width="5" height="3" rx="0.8" fill="#b45309" stroke="#78350f" strokeWidth="0.6" />
          {/* Burning Rope Fuse */}
          <path d="M18 9 C18 6 22 7 23 4" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />
          {/* Glowing Flame & Sparks */}
          <circle cx="23.5" cy="3.5" r="3.2" fill="#f97316" fillOpacity="0.8" />
          <circle cx="23.5" cy="3.5" r="1.8" fill="#fef08a" />
          <circle cx="26" cy="1.5" r="0.8" fill="#fde047" />
          <circle cx="21" cy="2" r="0.6" fill="#f97316" />
          <defs>
            <radialGradient id="ironBombGrad" cx="35%" cy="35%" r="65%">
              <stop stopColor="#64748b" />
              <stop offset="0.6" stopColor="#1e293b" />
              <stop offset="1" stopColor="#090d16" />
            </radialGradient>
          </defs>
        </svg>
      );

    case "marshal": // 10
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Imperial Bicorne Hat */}
          <path d="M7 14 C12 6 24 6 29 14 C25 12 11 12 7 14 Z" fill="#0f172a" stroke="#d97706" strokeWidth="1" />
          {/* Gold Laurel Ribbon on Hat */}
          <path d="M10 13 C14 11 22 11 26 13" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="1 1" />
          {/* White / Tricolor Feather Plume */}
          <path d="M18 6 C17 3 20 2 21 4 C21 6 19 7 18 6 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
          {/* Head & Collar */}
          <circle cx="18" cy="15" r="3.2" fill="#fbcfe8" />
          <path d="M14 18 L22 18 L23 23 L13 23 Z" fill={darkCoat} stroke="#d97706" strokeWidth="0.7" />
          {/* Golden Fringed Epaulets */}
          <rect x="10" y="18" width="4" height="2" rx="0.5" fill="#f59e0b" />
          <line x1="10" y1="20" x2="10" y2="23" stroke="#f59e0b" strokeWidth="0.8" />
          <rect x="22" y="18" width="4" height="2" rx="0.5" fill="#f59e0b" />
          <line x1="25" y1="20" x2="25" y2="23" stroke="#f59e0b" strokeWidth="0.8" />
          {/* Grand Crossed Sabers */}
          <line x1="8" y1="28" x2="28" y2="17" stroke="#e2e8f0" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="28" y1="28" x2="8" y2="17" stroke="#e2e8f0" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="10" cy="27" r="1.5" fill="#f59e0b" />
          <circle cx="26" cy="27" r="1.5" fill="#f59e0b" />
          {/* Grand Marshal Diamond Star */}
          <path d="M18 20 L19.2 22 L21.5 22.2 L19.8 23.8 L20.3 26 L18 24.8 L15.7 26 L16.2 23.8 L14.5 22.2 L16.8 22 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="0.5" />
        </svg>
      );

    case "general": // 9
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Officer Cocked Hat */}
          <path d="M9 13 C13 7 23 7 27 13 C23 11 13 11 9 13 Z" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.9" />
          <circle cx="18" cy="10" r="1.5" fill="#f59e0b" />
          {/* Head & Uniform */}
          <circle cx="18" cy="14" r="3" fill="#fbcfe8" />
          <path d="M13 18 L23 18 L24 26 L12 26 Z" fill={darkCoat} stroke="#f59e0b" strokeWidth="0.6" />
          {/* Gold Commander Sash */}
          <line x1="14" y1="18" x2="22" y2="25" stroke="#f59e0b" strokeWidth="1.5" />
          {/* Brass Telescope in Hand */}
          <line x1="22" y1="20" x2="29" y2="16" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <line x1="27" y1="17" x2="29" y2="16" stroke="#fef08a" strokeWidth="2.4" strokeLinecap="round" />
          {/* Stars */}
          <circle cx="16" cy="22" r="0.9" fill="#fef08a" />
          <circle cx="18" cy="23.5" r="0.9" fill="#fef08a" />
          <circle cx="20" cy="22" r="0.9" fill="#fef08a" />
        </svg>
      );

    case "colonel": // 8
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Dragoon Crested Helmet */}
          <path d="M14 9 C14 6 22 6 22 9 L23 14 L13 14 Z" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="0.8" />
          <path d="M18 4 C19 7 23 9 24 13" stroke="#b91c1c" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="18" cy="14" r="2.8" fill="#fbcfe8" />
          {/* Cuirassier Breastplate Armor */}
          <path d="M13 17 C13 17 18 16 23 17 L22 25 L14 25 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
          <line x1="18" y1="17" x2="18" y2="25" stroke="#94a3b8" strokeWidth="1" />
          {/* Cavalry Saber */}
          <line x1="9" y1="27" x2="23" y2="19" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="10" cy="26" r="1.3" fill="#f59e0b" />
        </svg>
      );

    case "major": // 7
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Officer Shako with Gold Cockade */}
          <rect x="14" y="8" width="8" height="6" rx="1" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.7" />
          <circle cx="18" cy="9.5" r="1.3" fill="#f59e0b" />
          <line x1="13" y1="14" x2="23" y2="14" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
          {/* Head & Coat */}
          <circle cx="18" cy="16" r="2.8" fill="#fbcfe8" />
          <path d="M13 19 L23 19 L23 26 L13 26 Z" fill={darkCoat} stroke="#f59e0b" strokeWidth="0.6" />
          {/* Chest Medal Ribbons & Cross */}
          <rect x="15" y="20" width="3" height="2" fill="#ef4444" />
          <rect x="18" y="20" width="3" height="2" fill="#3b82f6" />
          <circle cx="18" cy="23" r="1.4" fill="#fbbf24" stroke="#b45309" strokeWidth="0.4" />
          {/* Commander Baton */}
          <line x1="22" y1="20" x2="27" y2="26" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    case "captain": // 6
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Shako with Chin Scale */}
          <rect x="14" y="9" width="8" height="5.5" rx="0.8" fill="#334155" stroke="#f59e0b" strokeWidth="0.6" />
          <circle cx="18" cy="15.5" r="2.8" fill="#fbcfe8" />
          {/* Officer Uniform & Epaulets */}
          <path d="M13 19 L23 19 L23 26 L13 26 Z" fill={darkCoat} stroke="#94a3b8" strokeWidth="0.6" />
          <circle cx="13.5" cy="19.5" r="1" fill="#f59e0b" />
          <circle cx="22.5" cy="19.5" r="1" fill="#f59e0b" />
          {/* Raised Sword with Basket Guard */}
          <line x1="22" y1="22" x2="29" y2="10" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="23" cy="21" r="1.6" fill="#f59e0b" stroke="#78350f" strokeWidth="0.4" />
        </svg>
      );

    case "lieutenant": // 5
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Peaked Shako */}
          <rect x="14.5" y="9.5" width="7" height="5" rx="0.5" fill="#1e293b" />
          <line x1="13.5" y1="14.5" x2="22.5" y2="14.5" stroke="#000" strokeWidth="1" strokeLinecap="round" />
          <circle cx="18" cy="16" r="2.6" fill="#fbcfe8" />
          {/* Uniform */}
          <path d="M14 19 L22 19 L22 26 L14 26 Z" fill={darkCoat} stroke="#94a3b8" strokeWidth="0.5" />
          {/* Service Pistol in hand */}
          <line x1="22" y1="21" x2="27" y2="21" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="22" y="21" width="2" height="3" fill="#78350f" />
          {/* Side Sabre */}
          <line x1="14" y1="21" x2="10" y2="27" stroke="#e2e8f0" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    case "sergeant": // 4
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Soldier Shako with Visor */}
          <rect x="14.5" y="9" width="7" height="5" fill="#334155" />
          <line x1="13" y1="14" x2="23" y2="14" stroke="#0f172a" strokeWidth="1" strokeLinecap="round" />
          <circle cx="18" cy="15.5" r="2.6" fill="#fbcfe8" />
          {/* Soldier Coat */}
          <path d="M14 19 L22 19 L22 26 L14 26 Z" fill={darkCoat} />
          {/* 3 Golden Chevrons (V-stripes) */}
          <path d="M16 20.5 L18 22.5 L20 20.5" stroke="#fde047" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M16 22.5 L18 24.5 L20 22.5" stroke="#fde047" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {/* Infantry Halberd / Bayonet Spear */}
          <line x1="9" y1="28" x2="9" y2="7" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M7.5 10 L9 6 L10.5 10 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="0.5" />
        </svg>
      );

    case "miner": // 3
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Sapper Engineer Helmet with Ridge */}
          <path d="M14 12 C14 8 22 8 22 12 Z" fill="#475569" stroke="#f59e0b" strokeWidth="0.7" />
          <rect x="13.5" y="12" width="9" height="1.5" fill="#334155" />
          <circle cx="18" cy="15" r="2.6" fill="#fbcfe8" />
          {/* Heavy Leather Apron */}
          <path d="M14 18 L22 18 L22 26 L14 26 Z" fill="#78350f" stroke="#451a03" strokeWidth="0.6" />
          {/* Crossed Steel Pickaxes */}
          <line x1="10" y1="27" x2="26" y2="15" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M23 13 C25 14 27 16 28 17 C27 15 25 14 23 13 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="0.5" />
          <line x1="26" y1="27" x2="10" y2="15" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M13 13 C11 14 9 16 8 17 C9 15 11 14 13 13 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="0.5" />
        </svg>
      );

    case "scout": // 2
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Vanguard Scout Cap */}
          <path d="M14 11 C15 9 21 9 22 11 L23 13 L13 13 Z" fill="#1e293b" />
          <circle cx="18" cy="15" r="2.6" fill="#fbcfe8" />
          {/* Coat */}
          <path d="M14 18 L22 18 L22 25 L14 25 Z" fill={lightCloth} />
          {/* Dual Field Binoculars held forward */}
          <circle cx="16" cy="17" r="2" fill="#d97706" stroke="#fbbf24" strokeWidth="0.8" />
          <circle cx="20" cy="17" r="2" fill="#d97706" stroke="#fbbf24" strokeWidth="0.8" />
          <line x1="17.5" y1="17" x2="18.5" y2="17" stroke="#451a03" strokeWidth="1" />
          <circle cx="16" cy="17" r="1.1" fill="#38bdf8" />
          <circle cx="20" cy="17" r="1.1" fill="#38bdf8" />
          {/* Swift Winged Insignia */}
          <path d="M15 23 L18 21 L21 23" stroke="#fde047" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      );

    case "spy": // 1
      return (
        <svg viewBox="0 0 36 36" className="w-[88%] h-[88%] drop-shadow" fill="none">
          {/* Dark Assassin Hood / Cowl */}
          <path d="M18 5 C12 5 12 14 12 18 L24 18 C24 14 24 5 18 5 Z" fill="#090d16" stroke="#475569" strokeWidth="0.7" />
          {/* Shadowed Face with Glowing Slit Eyes */}
          <ellipse cx="18" cy="13.5" rx="3.5" ry="3" fill="#020617" />
          <circle cx="16.5" cy="13.5" r="0.8" fill="#4ade80" />
          <circle cx="19.5" cy="13.5" r="0.8" fill="#4ade80" />
          {/* Cloak Shoulders */}
          <path d="M11 18 L25 18 L26 27 L10 27 Z" fill="#0f172a" />
          {/* Dual Raised Stiletto Daggers */}
          <line x1="9" y1="25" x2="13" y2="16" stroke="#f1f5f9" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="9.5" cy="24.5" r="1" fill="#22c55e" />
          <line x1="27" y1="25" x2="23" y2="16" stroke="#f1f5f9" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="26.5" cy="24.5" r="1" fill="#22c55e" />
        </svg>
      );

    default:
      return null;
  }
};

// 3D Miniature Figurine Component
const StrategoPieceFigure: React.FC<{
  piece: StrategoPiece;
  isRevealed: boolean;
  isAdminReveal?: boolean;
  isMine?: boolean;
}> = ({ piece, isRevealed, isAdminReveal, isMine = piece.player === "red" }) => {
  const isRed = piece.player === "red";
  const showIdentity = isMine || piece.revealedToOpponent || isRevealed || isAdminReveal;

  return (
    <div
      className={`w-full h-full relative flex flex-col items-center justify-between p-0.5 rounded-lg select-none transition-transform duration-150 ${
        isRed
          ? "bg-gradient-to-b from-red-600 via-red-800 to-red-950 border-t border-red-400 border-b-2 border-red-950 shadow-[0_4px_8px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.4)]"
          : "bg-gradient-to-b from-blue-600 via-blue-800 to-blue-950 border-t border-blue-400 border-b-2 border-blue-950 shadow-[0_4px_8px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.4)]"
      }`}
    >
      {/* 3D Gloss / Specular Top Highlight */}
      <div className="absolute top-0 inset-x-1 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full pointer-events-none" />

      {showIdentity ? (
        <>
          {/* Detailed 3D Figurine Silhouette & Art */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            {renderDetailedFigureSVG(piece.type, isRed)}
          </div>

          {/* Embossed Metallic Rank Plaque at Pedestal Base */}
          <div
            className={`w-[88%] py-0.2 px-0.5 rounded flex items-center justify-center border shadow-inner ${
              isRed
                ? "bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 border-amber-300 text-stone-950 shadow-black/60"
                : "bg-gradient-to-r from-slate-600 via-slate-300 to-slate-600 border-slate-200 text-stone-950 shadow-black/60"
            }`}
          >
            <span
              className={`text-[7px] sm:text-[9px] leading-none drop-shadow-sm ${
                piece.rank === 10 ? "font-black tracking-tight" : "font-semibold tracking-normal"
              }`}
            >
              {piece.type === "flag" ? "🚩" : piece.type === "bomb" ? "💣" : piece.rank}
            </span>
          </div>
        </>
      ) : (
        /* Fog of War Enemy Figurine */
        <>
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <svg viewBox="0 0 40 40" className="w-[85%] h-[85%] drop-shadow-md" fill="none">
              <path d="M20 4 L33 9 V22 C33 30 20 37 20 37 C20 37 7 30 7 22 V9 Z" fill="url(#shieldBlueGrad)" stroke="#60a5fa" strokeWidth="1.5" />
              <path d="M20 7 L30 11 V21 C30 27 20 33 20 33 C20 33 10 27 10 21 V11 Z" fill="#1e3a8a" fillOpacity="0.6" stroke="#93c5fd" strokeWidth="0.75" />
              <circle cx="20" cy="18" r="5" fill="#3b82f6" fillOpacity="0.4" stroke="#bfdbfe" strokeWidth="0.8" />
              <text x="20" y="22" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="900" fontFamily="sans-serif">?</text>
              <defs>
                <linearGradient id="shieldBlueGrad" x1="7" y1="4" x2="33" y2="37" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6" />
                  <stop offset="0.5" stopColor="#1e40af" />
                  <stop offset="1" stopColor="#0f172a" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="w-[88%] py-0.2 rounded bg-blue-950/90 border border-blue-400/40 text-blue-300 flex items-center justify-center">
            <span className="text-[7px] sm:text-[8px] font-black">?</span>
          </div>
        </>
      )}
    </div>
  );
};

// Isolated Match Timer badge component: updates only its own small DOM node every second
// preventing the entire 100-cell 3D Stratego board from re-rendering and flickering on mobile GPUs!
const StrategoMatchTimer: React.FC<{
  phase: "setup" | "playing" | "gameover";
  gameSecondsRef: React.MutableRefObject<number>;
  language: string;
}> = React.memo(({ phase, gameSecondsRef, language }) => {
  const [displaySeconds, setDisplaySeconds] = useState<number>(gameSecondsRef.current);

  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      gameSecondsRef.current += 1;
      setDisplaySeconds(gameSecondsRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, gameSecondsRef]);

  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <span title={language === "it" ? "Tempo di gioco" : language === "es" ? "Tiempo de juego" : language === "fr" ? "Temps de jeu" : language === "de" ? "Spielzeit" : "Game time"}>
      ⏱️ {formatted}
    </span>
  );
});

export const StrategoBoard: React.FC<StrategoBoardProps> = ({
  onBackToMenu,
  onBackToSetup,
  onOpenHistory,
  onOpenRules,
  language,
  isAdmin = false,
  initialDifficulty = "medium",
  initialStarter = "red",
  initialPreset = "balanced",
  savedGameData,
  boardTheme = "stratego-classic",
  onlineMatchSession = null,
  onOnlineAbandon,
  onEndOnlineMatch,
  onGameEnd,
}) => {
  const st = useMemo(() => getStrategoI18n(language), [language]);
  const isOnline = !!onlineMatchSession;
  const myPlayerIndex = onlineMatchSession?.myPlayerIndex ?? 1;
  const myColor: "red" | "blue" = isOnline ? (myPlayerIndex === 1 ? "red" : "blue") : "red";
  const opponentColor: "red" | "blue" = myColor === "red" ? "blue" : "red";

  // Board orientation: invited player (Blue) sees their own pieces positioned at the bottom of the board
  const isBoardFlipped = myColor === "blue";
  const displayRows = useMemo(() => isBoardFlipped ? [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [isBoardFlipped]);
  const displayCols = useMemo(() => isBoardFlipped ? [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [isBoardFlipped]);

  // Online setup readiness synchronization: both players must complete army setup before the match starts
  const [isMySetupReady, setIsMySetupReady] = useState<boolean>(false);
  const [isOpponentSetupReady, setIsOpponentSetupReady] = useState<boolean>(false);
  const hasStartedOnlineGameRef = useRef<boolean>(false);

  const lastProcessedRemoteMoveIdRef = useRef<string>("");
  const localMoveCountRef = useRef<number>(0);

  // Game states
  const [phase, setPhase] = useState<"setup" | "playing" | "gameover">("setup");
  const [board, setBoard] = useState<(StrategoPiece | null)[][]>(() =>
    Array.from({ length: 10 }, () => Array(10).fill(null))
  );
  const [turn, setTurn] = useState<"red" | "blue">(initialStarter);
  const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);
  const [swapTargetPos, setSwapTargetPos] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number; c: number }[]>([]);
  const [combatClashInfo, setCombatClashInfo] = useState<StrategoBattleResult | null>(null);
  const [combatFocusPos, setCombatFocusPos] = useState<{ r: number; c: number } | null>(null);
  const [animatingMove, setAnimatingMove] = useState<{
    piece: StrategoPiece;
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
    isAttack: boolean;
    targetPiece: StrategoPiece | null;
    started: boolean;
  } | null>(null);
  // 2-second dynamic sword duel animation state
  const [activeDuel, setActiveDuel] = useState<{
    attacker: StrategoPiece;
    defender: StrategoPiece;
    battleResult: StrategoBattleResult;
    targetPos: { r: number; c: number };
    fromPos: { r: number; c: number };
  } | null>(null);
  const [winner, setWinner] = useState<"red" | "blue" | null>(null);
  const [winReason, setWinReason] = useState<string>("");
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  const hasEndedRef = useRef<boolean>(false);
  const enemyMovedPiecesRef = useRef<Set<string>>(new Set());
  const enemyScoutPiecesRef = useRef<Set<string>>(new Set());
  const [capturedRed, setCapturedRed] = useState<StrategoPiece[]>([]);
  const [capturedBlue, setCapturedBlue] = useState<StrategoPiece[]>([]);

  // Ultima mossa eseguita: lascia sulle caselle di partenza e arrivo un colore più acceso per 1 mossa
  const [lastExecutedMove, setLastExecutedMove] = useState<{
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
    player: "red" | "blue";
  } | null>(null);
  const [turnNoticeToast, setTurnNoticeToast] = useState<string | null>(null);

  // Pre-game Settings Configuration (Disabled on mount: standard setup view handles it)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<StrategoDifficulty>(
    initialDifficulty === "easy" || initialDifficulty === "medium" || initialDifficulty === "hard"
      ? initialDifficulty
      : "medium"
  );

  const [moveCount, setMoveCount] = useState<number>(0);
  const gameSecondsRef = useRef<number>(0);
  const [finalGameSeconds, setFinalGameSeconds] = useState<number>(0);

  // Freeze match duration for victory/defeat modal when match concludes
  useEffect(() => {
    if (phase === "gameover" || winner !== null) {
      setFinalGameSeconds((prev) => (prev > 0 ? prev : gameSecondsRef.current));
    }
  }, [phase, winner]);

  const formatTime = useCallback((totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const awardGameEndPoints = useCallback((winningPlayer: "red" | "blue") => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    const isWin = winningPlayer === myColor;
    let points = 0;
    if (isWin) {
      if (onlineMatchSession) points = 15.0;
      else if (difficulty === "easy") points = 12.0;    // Former Difficile -> Facile (+12)
      else if (difficulty === "medium") points = 20.0;  // Former Estrema -> Normale (+20)
      else if (difficulty === "hard") points = 35.0;    // Former Maestro -> Difficile (+35)
    } else {
      if (onlineMatchSession) points = -1.0;
      else if (difficulty === "easy") points = -1.5;    // Former Difficile -> Facile (-1.5)
      else if (difficulty === "medium") points = -2.5;  // Former Estrema -> Normale (-2.5)
      else if (difficulty === "hard") points = -3.0;    // Former Maestro -> Difficile (-3.0)
    }
    setEarnedPoints(points);
    if (onGameEnd) {
      onGameEnd({
        winner: winningPlayer,
        isWin,
        difficulty,
        pointsAwarded: points,
      });
    }
  }, [myColor, difficulty, onlineMatchSession, onGameEnd]);
  const [startingPlayer, setStartingPlayer] = useState<StrategoStarter>(initialStarter);
  const [selectedPreset, setSelectedPreset] = useState<string>(initialPreset);

  // Sync props if changed externally
  useEffect(() => {
    setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(() => {
    setStartingPlayer(initialStarter);
    setTurn(initialStarter);
  }, [initialStarter]);

  useEffect(() => {
    setSelectedPreset(initialPreset);
  }, [initialPreset]);

  // Popup modale per selezione dello schema di posizionamento pedine
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);

  // Flag per non mostrare più il fumetto di avvio (memorizzato in localStorage)
  const [dontShowStartBubbleAgain, setDontShowStartBubbleAgain] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("wallgo_stratego_hide_start_bubble") === "true";
    } catch (e) {
      return false;
    }
  });

  // Fumetto di indicazione del tasto per terminare il posizionamento e iniziare il gioco
  const [showStartBubble, setShowStartBubble] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem("wallgo_stratego_hide_start_bubble") === "true") {
        return false;
      }
    } catch (e) {}
    return true;
  });

  // Auto-dismiss del fumetto dopo 45 secondi se non chiuso prima dall'utente
  useEffect(() => {
    if (!showStartBubble) return;
    const timer = setTimeout(() => {
      setShowStartBubble(false);
    }, 45000);
    return () => clearTimeout(timer);
  }, [showStartBubble]);

  const executeMoveRef = useRef<((fromR: number, fromC: number, toR: number, toC: number) => void) | null>(null);

  // Online room synchronization for live multiplayer vs another real player
  useEffect(() => {
    if (!onlineMatchSession || onlineMatchSession.isSimulatedOpponent || !db) return;
    const roomRef = doc(db, "online_rooms", onlineMatchSession.roomId);

    const unsub = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Check if opponent abandoned
      if (data.status === "abandoned" && data.abandonedBy && data.abandonedBy !== myPlayerIndex) {
        setWinner(myColor);
        const reason = language === "it"
          ? `${onlineMatchSession.opponentName} ha abbandonato la partita.`
          : `${onlineMatchSession.opponentName} abandoned the match.`;
        setWinReason(reason);
        setPhase("gameover");
        SoundManager.playVictory();
        if (onEndOnlineMatch) {
          onEndOnlineMatch({
            winner: myColor,
            winnerIndex: myPlayerIndex,
            isMeWinner: true,
            reason,
          });
        }
        return;
      }

      // 1. ONLINE SETUP READINESS SYNCHRONIZATION
      // Both players must complete and confirm their army positioning before the match begins!
      const oppReady = myPlayerIndex === 1 ? !!data.p2Ready : !!data.p1Ready;
      setIsOpponentSetupReady(oppReady);

      const myReadyFromData = myPlayerIndex === 1 ? !!data.p1Ready : !!data.p2Ready;
      if (myReadyFromData) {
        setIsMySetupReady(true);
      }

      // Helper to safely parse serialized army (JSON string or array)
      const parseArmy = (raw: any): StrategoPieceType[][] | null => {
        if (!raw) return null;
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
            console.warn("Failed to parse army JSON from room:", e);
          }
        } else if (Array.isArray(raw)) {
          return raw;
        }
        return null;
      };

      // If BOTH players have confirmed setup, merge opponent's secret army and start playing!
      if (data.p1Ready && data.p2Ready && !hasStartedOnlineGameRef.current) {
        hasStartedOnlineGameRef.current = true;

        const p1Army = parseArmy(data.p1Army);
        const p2Army = parseArmy(data.p2Army);

        setBoard((prevBoard) => {
          const nextBoard = prevBoard.map((row) => [...row]);
          if (myPlayerIndex === 1 && p2Army) {
            // Player 1 (Red) receives Player 2 (Blue)'s actual placement in rows 0..3
            p2Army.forEach((rowTypes: StrategoPieceType[], rIdx: number) => {
              const r = rIdx;
              if (Array.isArray(rowTypes)) {
                rowTypes.forEach((type: StrategoPieceType, c: number) => {
                  const def = STRATEGO_PIECE_DEFS[type] || STRATEGO_PIECE_DEFS.scout;
                  nextBoard[r][c] = {
                    id: `blue_${r}_${c}_${type}`,
                    player: "blue",
                    type,
                    rank: def.rank,
                    revealedToOpponent: false,
                    row: r,
                    col: c,
                  };
                });
              }
            });
          } else if (myPlayerIndex === 2 && p1Army) {
            // Player 2 (Blue) receives Player 1 (Red)'s actual placement in rows 6..9
            p1Army.forEach((rowTypes: StrategoPieceType[], rIdx: number) => {
              const r = 6 + rIdx;
              if (Array.isArray(rowTypes)) {
                rowTypes.forEach((type: StrategoPieceType, c: number) => {
                  const def = STRATEGO_PIECE_DEFS[type] || STRATEGO_PIECE_DEFS.scout;
                  nextBoard[r][c] = {
                    id: `red_${r}_${c}_${type}`,
                    player: "red",
                    type,
                    rank: def.rank,
                    revealedToOpponent: false,
                    row: r,
                    col: c,
                  };
                });
              }
            });
          }
          return nextBoard;
        });

        setSelectedPos(null);
        setSwapTargetPos(null);
        setValidMoves([]);
        setPhase("playing");
        setTurn("red"); // In official Stratego, Red always makes the first move
        setHasGameStarted(true);
        setEarnedPoints(null);
        hasEndedRef.current = false;
        setMoveCount(0);
        gameSecondsRef.current = 0;
        setFinalGameSeconds(0);
        SoundManager.playMovePiece();
      }

      // 2. Check for incoming remote move
      if (data.strategoMove && data.lastMoveBy && data.lastMoveBy !== myPlayerIndex) {
        const { fromR, fromC, toR, toC, moveId } = data.strategoMove;
        if (moveId && moveId !== lastProcessedRemoteMoveIdRef.current) {
          lastProcessedRemoteMoveIdRef.current = moveId;
          executeMoveRef.current?.(fromR, fromC, toR, toC);
        }
      }
    });

    return () => unsub();
  }, [onlineMatchSession, myPlayerIndex, myColor, language, onEndOnlineMatch]);

  // Ensure standard background music is playing
  useEffect(() => {
    SoundManager.startBackgroundMusic();
  }, []);

  // Fullscreen state and listener
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    const doc = typeof document !== "undefined" ? (document as any) : null;
    return !!(doc && (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
  });

  useEffect(() => {
    const updateFs = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
    };
    document.addEventListener("fullscreenchange", updateFs);
    document.addEventListener("webkitfullscreenchange", updateFs);
    return () => {
      document.removeEventListener("fullscreenchange", updateFs);
      document.removeEventListener("webkitfullscreenchange", updateFs);
    };
  }, []);

  const toggleFullScreen = () => {
    const doc = document as any;
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
    try {
      if (isFs) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
        else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
        else if (doc.msExitFullscreen) doc.msExitFullscreen();
      } else {
        const el = document.documentElement as any;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
        else if (el.msRequestFullscreen) el.msRequestFullscreen();
      }
    } catch (e) {
      // Ignored
    }
  };

  // Clear saved game when game ends or is deleted
  const clearSavedGame = useCallback(() => {
    try {
      localStorage.removeItem("wallgo_saved_game_stratego");
      localStorage.removeItem("wallgo_last_saved_mode");
      removeStorageItem("wallgo_saved_game_stratego").catch(() => {});
      removeStorageItem("wallgo_last_saved_mode").catch(() => {});
    } catch (e) {
      // Ignored
    }
  }, []);

  // Save game handling with toast feedback
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [personalSaveToast, setPersonalSaveToast] = useState<boolean>(false);
  const [swapToast, setSwapToast] = useState<string | null>(null);
  const [hasGameStarted, setHasGameStarted] = useState<boolean>(false);

  // Save personal army layout to localStorage / cloud storage
  const handleSavePersonalPreset = useCallback(async () => {
    try {
      const customMap: StrategoPieceType[][] = [];
      if (myColor === "blue") {
        for (let rIdx = 0; rIdx < 4; rIdx++) {
          const boardRow = 3 - rIdx;
          const rowTypes: StrategoPieceType[] = [];
          for (let col = 0; col < 10; col++) {
            const boardCol = 9 - col;
            const piece = board[boardRow][boardCol];
            rowTypes.push(piece ? piece.type : "scout");
          }
          customMap.push(rowTypes);
        }
      } else {
        for (let r = 6; r <= 9; r++) {
          const rowTypes: StrategoPieceType[] = [];
          for (let c = 0; c < 10; c++) {
            const piece = board[r][c];
            rowTypes.push(piece ? piece.type : "scout");
          }
          customMap.push(rowTypes);
        }
      }

      const jsonStr = JSON.stringify(customMap);
      localStorage.setItem(STRATEGO_PERSONAL_PRESET_KEY, jsonStr);
      if (PRESETS.personal) {
        PRESETS.personal.map = customMap;
      }
      try {
        await saveStorageItem(STRATEGO_PERSONAL_PRESET_KEY, jsonStr);
      } catch (err) {}

      setSelectedPreset("personal");
      setPersonalSaveToast(true);
      setTimeout(() => setPersonalSaveToast(false), 2500);
      SoundManager.playMovePiece();
    } catch (e) {
      console.error("Failed to save personal preset:", e);
    }
  }, [board, myColor]);

  // Execute swap between posA and posB during setup
  const handleExecuteSwapWith = useCallback(
    (posA: { r: number; c: number }, posB: { r: number; c: number }) => {
      const p1 = board[posA.r][posA.c];
      const p2 = board[posB.r][posB.c];
      if (!p1 && !p2) return;

      const newBoard = board.map((row) => [...row]);
      newBoard[posA.r][posA.c] = p2
        ? { ...p2, row: posA.r, col: posA.c }
        : null;
      newBoard[posB.r][posB.c] = p1
        ? { ...p1, row: posB.r, col: posB.c }
        : null;

      setBoard(newBoard);
      SoundManager.playMovePiece();
      setSelectedPos(null);
      setSwapTargetPos(null);
      if (!dontShowStartBubbleAgain) {
        setShowStartBubble(true);
      }
      setSwapToast(st.piecesSwappedToast);
      setTimeout(() => setSwapToast(null), 2500);
    },
    [board, st.piecesSwappedToast, dontShowStartBubbleAgain]
  );

  const handleExecuteSwap = useCallback(() => {
    if (!selectedPos || !swapTargetPos) return;
    handleExecuteSwapWith(selectedPos, swapTargetPos);
  }, [selectedPos, swapTargetPos, handleExecuteSwapWith]);

  // Seleziona e applica uno schema di posizionamento dal popup di selezione
  const handleSelectPreset = useCallback((presetKey: string) => {
    setSelectedPreset(presetKey);
    if (!dontShowStartBubbleAgain) {
      setShowStartBubble(true);
    }
    const chosenPreset = PRESETS[presetKey] || PRESETS.balanced;
    const mapToUse = presetKey === "personal"
      ? (getSavedPersonalPreset() || chosenPreset.map)
      : chosenPreset.map;

    setBoard((prevBoard) => {
      const nextBoard = prevBoard.map((row) => [...row]);
      if (myColor === "blue") {
        // Giocatore Blu (ospite online): righe 0..3 con prospettiva capovolta (riga 0 fondo/retroguardia, riga 3 fronte)
        mapToUse.forEach((rowTypes, rIdx) => {
          const boardRow = 3 - rIdx;
          rowTypes.forEach((type, col) => {
            const boardCol = 9 - col;
            const def = STRATEGO_PIECE_DEFS[type] || STRATEGO_PIECE_DEFS.scout;
            nextBoard[boardRow][boardCol] = {
              id: `blue_${boardRow}_${boardCol}_${type}`,
              player: "blue",
              type,
              rank: def.rank,
              revealedToOpponent: false,
              row: boardRow,
              col: boardCol,
            };
          });
        });
      } else {
        // Giocatore Rosso (host o single-player): righe 6..9
        mapToUse.forEach((rowTypes, rIdx) => {
          const boardRow = 6 + rIdx;
          rowTypes.forEach((type, col) => {
            const def = STRATEGO_PIECE_DEFS[type] || STRATEGO_PIECE_DEFS.scout;
            nextBoard[boardRow][col] = {
              id: `red_${boardRow}_${col}_${type}`,
              player: "red",
              type,
              rank: def.rank,
              revealedToOpponent: false,
              row: boardRow,
              col,
            };
          });
        });
      }
      return nextBoard;
    });

    setSelectedPos(null);
    setSwapTargetPos(null);
    setValidMoves([]);
    setIsPresetModalOpen(false);
    SoundManager.playMovePiece();
    setSwapToast(st.setupAppliedToast);
    setTimeout(() => setSwapToast(null), 2000);
  }, [myColor, st.setupAppliedToast, dontShowStartBubbleAgain]);

  // Confirm initial army setup and begin the match
  const handleConfirmSetupAndPlay = useCallback(() => {
    setShowStartBubble(false);
    if (isOnline && !onlineMatchSession?.isSimulatedOpponent && db && onlineMatchSession) {
      // In live online match: submit ready status and secret army to Firestore
      setIsMySetupReady(true);
      const roomRef = doc(db, "online_rooms", onlineMatchSession.roomId);

      if (myPlayerIndex === 1) {
        const myArmy = board.slice(6, 10).map((row) => row.map((p) => p ? p.type : "scout"));
        setDoc(roomRef, {
          p1Ready: true,
          p1Army: JSON.stringify(myArmy),
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch((err) => console.error("Error setting p1Ready:", err));
      } else {
        const myArmy = board.slice(0, 4).map((row) => row.map((p) => p ? p.type : "scout"));
        setDoc(roomRef, {
          p2Ready: true,
          p2Army: JSON.stringify(myArmy),
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch((err) => console.error("Error setting p2Ready:", err));
      }
      SoundManager.playMovePiece();
      return;
    }

    // Local or simulated AI match: start immediately
    setSelectedPos(null);
    setSwapTargetPos(null);
    setValidMoves([]);
    setPhase("playing");
    setTurn(startingPlayer);
    setHasGameStarted(true);
    setEarnedPoints(null);
    hasEndedRef.current = false;
    setMoveCount(0);
    gameSecondsRef.current = 0;
    setFinalGameSeconds(0);
    SoundManager.playMovePiece();
  }, [board, db, isOnline, myPlayerIndex, onlineMatchSession, startingPlayer]);

  // Cancel my ready status while waiting for opponent in online match
  const handleCancelMyReady = useCallback(() => {
    if (isOnline && !onlineMatchSession?.isSimulatedOpponent && db && onlineMatchSession) {
      setIsMySetupReady(false);
      const roomRef = doc(db, "online_rooms", onlineMatchSession.roomId);
      const field = myPlayerIndex === 1 ? "p1Ready" : "p2Ready";
      setDoc(roomRef, {
        [field]: false,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch((err) => console.error("Error canceling ready status:", err));
      SoundManager.playMovePiece();
    }
  }, [db, isOnline, myPlayerIndex, onlineMatchSession]);

  const handleSaveGame = async () => {
    try {
      const stateToSave = {
        board,
        turn,
        phase,
        difficulty,
        startingPlayer,
        selectedPreset,
        capturedRed,
        capturedBlue,
        tiltAngle,
        zoomScale,
        savedAt: new Date().toISOString(),
      };
      const jsonStr = JSON.stringify(stateToSave);
      localStorage.setItem("wallgo_saved_game_stratego", jsonStr);
      localStorage.setItem("wallgo_last_saved_mode", "stratego");
      try {
        await saveStorageItem("wallgo_saved_game_stratego", jsonStr);
        await saveStorageItem("wallgo_last_saved_mode", "stratego");
      } catch (err) {}
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
      SoundManager.playMovePiece();
    } catch (e) {
      console.error("Failed to save Stratego game:", e);
    }
  };

  // Hover state on piece (for showing rank and ability tooltip)
  const [hoveredPiece, setHoveredPiece] = useState<StrategoPiece | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ r: number; c: number } | null>(null);

  // 3D and Display settings (default tilt = 34° Media, pinch-to-zoom enabled)
  const [tiltAngle, setTiltAngle] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("wallgo_stratego_tilt_preference");
      if (saved) {
        const num = Number(saved);
        if (!isNaN(num) && num >= 12 && num <= 52) return num;
      }
    } catch (e) {}
    return 34;
  });

  const handleSetTiltAngle = useCallback((newAngle: number) => {
    setTiltAngle(newAngle);
    try {
      localStorage.setItem("wallgo_stratego_tilt_preference", String(newAngle));
    } catch (e) {}
  }, []);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const touchPinchRef = useRef<{ dist: number; midY: number; initialTilt: number; initialZoom: number } | null>(null);
  const zoomResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [revealEnemyAdmin, setRevealEnemyAdmin] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isPieceCodexOpen, setIsPieceCodexOpen] = useState<boolean>(false);
  const [rulesTab, setRulesTab] = useState<"overview" | "pieces" | "special" | "tactics" | "history">("overview");

  // Cleanup zoom reset timer on unmount
  useEffect(() => {
    return () => {
      if (zoomResetTimerRef.current) {
        clearTimeout(zoomResetTimerRef.current);
      }
    };
  }, []);

  // Helper to reset camera combat focus after 1 second from move or duel completion
  const scheduleZoomResetAfterMove = useCallback(() => {
    if (zoomResetTimerRef.current) clearTimeout(zoomResetTimerRef.current);
    zoomResetTimerRef.current = setTimeout(() => {
      // Clear camera combat focus only. NEVER clear selectedPos or validMoves, which would cancel user's selection!
      setCombatFocusPos(null);
    }, 1000);
  }, []);

  // Persistent inspected piece and combat summary so the top box never flashes an unwanted prompt message
  const [inspectedPiece, setInspectedPiece] = useState<StrategoPiece | null>(null);
  const [combatClashSummary, setCombatClashSummary] = useState<string | null>(null);

  // Board theme style check
  const isDarkTheme = boardTheme === "stratego-dark";

  const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const [isPinching, setIsPinching] = useState<boolean>(false);

  // Dynamic 100% Zoom: when a piece is selected or during/after an attack, zoom in smoothly on the area of interest!
  // Smooth camera panning (panX, panY) ensures lateral pieces (col 0, col 9) and edge pieces (row 0, row 9)
  // are centered in the visible board arena and never truncated or clipped at the borders.
  // CRITICAL: In setup phase (scambio iniziale), zoom is NEVER active so the player can easily see and swap distant pieces across the board!
  const activeFocus = selectedPos || combatFocusPos;
  const isZoomed = phase !== "setup" && activeFocus !== null;
  // Natural 100% board scale: baseline zoom is zoomScale (1.0). When focused on a selected piece or combat, zoom smoothly by 1.35x
  const effectiveZoom = isZoomed ? Number((zoomScale * 1.35).toFixed(2)) : (phase === "setup" ? 1.0 : zoomScale);
  const panX = isZoomed && activeFocus
    ? Number((-(((isBoardFlipped ? (9 - activeFocus.c) : activeFocus.c) - 4.5) / 10) * effectiveZoom * 36).toFixed(1))
    : 0;
  const panY = isZoomed && activeFocus
    ? Number((-(((isBoardFlipped ? (9 - activeFocus.r) : activeFocus.r) - 4.5) / 10) * effectiveZoom * Math.cos((tiltAngle * Math.PI) / 180) * 30).toFixed(1))
    : 0;

  // Touch Pinch-to-zoom & tilt gesture handlers (disables CSS transitions during touch gestures for flicker-free fluidity)
  const handleBoardTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (phase === "setup") return; // Keep stable full board view during setup
    if (e.touches.length === 2) {
      setIsPinching(true);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midY = (t1.clientY + t2.clientY) / 2;
      touchPinchRef.current = { dist, midY, initialTilt: tiltAngle, initialZoom: zoomScale };
    }
  };

  const handleBoardTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (phase === "setup") return; // Keep stable full board view during setup
    if (e.touches.length === 2 && touchPinchRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midY = (t1.clientY + t2.clientY) / 2;

      // Pinch zoom scale
      const distDiff = dist - touchPinchRef.current.dist;
      const newZoom = Math.min(1.4, Math.max(0.72, touchPinchRef.current.initialZoom + distDiff * 0.0035));
      setZoomScale(Number(newZoom.toFixed(2)));

      // Tilt modification with pinch vertical gesture (medium baseline)
      const yDiff = midY - touchPinchRef.current.midY;
      const newTilt = Math.min(52, Math.max(12, touchPinchRef.current.initialTilt - yDiff * 0.2));
      setTiltAngle(Math.round(newTilt));
    }
  };

  const handleBoardTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      touchPinchRef.current = null;
      setIsPinching(false);
    }
  };

  const handleBoardWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (phase === "setup") return; // Keep stable full board view during setup
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      // Trackpad pinch zoom
      e.preventDefault();
      setZoomScale((prev) => {
        const next = Math.min(1.4, Math.max(0.72, prev - e.deltaY * 0.003));
        return Number(next.toFixed(2));
      });
    } else {
      // Mouse wheel tilts the perspective smoothly
      setTiltAngle((prev) => Math.min(52, Math.max(12, prev + (e.deltaY > 0 ? 2 : -2))));
    }
  };

  // Helper to initialize board layout
  const initializeSetup = useCallback((presetKey = "balanced", starter: StrategoStarter = "red") => {
    const newBoard: (StrategoPiece | null)[][] = Array.from({ length: 10 }, () =>
      Array(10).fill(null)
    );

    const chosenKey = presetKey || "balanced";
    const preset = PRESETS[chosenKey] || PRESETS.balanced;
    const mapToUse = chosenKey === "personal"
      ? (getSavedPersonalPreset() || preset.map)
      : preset.map;

    if (myColor === "blue") {
      // Local player is BLUE (invited player): rows 0..3 populated with chosen preset!
      // On flipped board (displayRows = [9, 8, ..., 0]), row 0 is at the bottom of the screen (back row)
      // and row 3 is adjacent to the lakes (front row).
      // mapToUse[3] is the back row (flag, spy, bombs) -> mapped to boardRow 0 (first row at the bottom)
      // mapToUse[0] is the front row (scouts) -> mapped to boardRow 3 (facing the lakes)
      mapToUse.forEach((rowTypes, rIdx) => {
        const boardRow = 3 - rIdx;
        rowTypes.forEach((type, col) => {
          const boardCol = 9 - col;
          const def = STRATEGO_PIECE_DEFS[type];
          newBoard[boardRow][boardCol] = {
            id: `blue_${boardRow}_${boardCol}_${type}`,
            player: "blue",
            type,
            rank: def.rank,
            revealedToOpponent: false,
            row: boardRow,
            col: boardCol,
          };
        });
      });

      // Opponent (Red): rows 6..9 (placeholder until synced from Player 1)
      const oppPreset = PRESETS.balanced.map;
      oppPreset.forEach((rowTypes, rIdx) => {
        const boardRow = 6 + rIdx;
        rowTypes.forEach((type, col) => {
          const def = STRATEGO_PIECE_DEFS[type];
          newBoard[boardRow][col] = {
            id: `red_${boardRow}_${col}_${type}`,
            player: "red",
            type,
            rank: def.rank,
            revealedToOpponent: false,
            row: boardRow,
            col,
          };
        });
      });
    } else {
      // Local player is RED (host or single-player): rows 6..9 populated with chosen preset!
      mapToUse.forEach((rowTypes, rIdx) => {
        const boardRow = 6 + rIdx;
        rowTypes.forEach((type, col) => {
          const def = STRATEGO_PIECE_DEFS[type];
          newBoard[boardRow][col] = {
            id: `red_${boardRow}_${col}_${type}`,
            player: "red",
            type,
            rank: def.rank,
            revealedToOpponent: false,
            row: boardRow,
            col,
          };
        });
      });

      // Setup Blue army (rows 0..3) with intelligent AI setup matching tactical strategy
      const aiPresetKeys = ["balanced", "defensive", "blitz", "ambush", "fortress"];
      const chosenAiKey =
        difficulty === "hard"
          ? (Math.random() < 0.5 ? "fortress" : "ambush")
          : difficulty === "medium"
          ? (Math.random() < 0.4 ? "fortress" : aiPresetKeys[Math.floor(Math.random() * aiPresetKeys.length)])
          : (Math.random() < 0.5 ? "balanced" : "blitz");
      const aiPreset = (PRESETS[chosenAiKey] || PRESETS.blitz).map;
      aiPreset.forEach((rowTypes, rIdx) => {
        const boardRow = 3 - rIdx;
        rowTypes.forEach((type, col) => {
          const def = STRATEGO_PIECE_DEFS[type];
          newBoard[boardRow][col] = {
            id: `blue_${boardRow}_${col}_${type}`,
            player: "blue",
            type,
            rank: def.rank,
            revealedToOpponent: false,
            row: boardRow,
            col,
          };
        });
      });
    }

    setBoard(newBoard);
    setSelectedPos(null);
    setSwapTargetPos(null);
    setValidMoves([]);
    setTurn(starter);
    setWinner(null);
    setWinReason("");
    setEarnedPoints(null);
    hasEndedRef.current = false;
    setMoveCount(0);
    gameSecondsRef.current = 0;
    setFinalGameSeconds(0);
    setCapturedRed([]);
    setCapturedBlue([]);
    setCombatClashInfo(null);
    setAnimatingMove(null);
    setActiveDuel(null);
    setCombatFocusPos(null);
    setHoveredPiece(null);
    setHoveredPos(null);
    setPhase("setup");
    setHasGameStarted(false);
    setIsMySetupReady(false);
    setIsOpponentSetupReady(false);
    hasStartedOnlineGameRef.current = false;
    setLastExecutedMove(null);
    setTurnNoticeToast(null);
    setIsPresetModalOpen(false);
    setShowStartBubble(true);
    // Initial inspected piece: player piece
    const initialPiece = myColor === "blue" ? (newBoard[0][9] || newBoard[0][0] || null) : (newBoard[9][0] || null);
    setInspectedPiece(initialPiece);
    setCombatClashSummary(null);
  }, [difficulty, myColor]);

  // Initialize on mount: restore saved game if provided, else initialize fresh setup
  useEffect(() => {
    let stateToRestore = savedGameData && savedGameData.board ? savedGameData : null;

    if (stateToRestore && stateToRestore.board) {
      setBoard(stateToRestore.board);
      setTurn(stateToRestore.turn || "red");
      const restoredPhase = stateToRestore.phase || "playing";
      setPhase(restoredPhase);
      setHasGameStarted(restoredPhase === "playing");
      if (stateToRestore.difficulty) {
        const d = stateToRestore.difficulty;
        if (d === "hard" || d === "master") setDifficulty("hard");
        else if (d === "medium" || d === "extreme") setDifficulty("medium");
        else setDifficulty("easy");
      }
      if (stateToRestore.startingPlayer) setStartingPlayer(stateToRestore.startingPlayer);
      if (stateToRestore.selectedPreset) setSelectedPreset(stateToRestore.selectedPreset);
      if (stateToRestore.capturedRed) setCapturedRed(stateToRestore.capturedRed);
      if (stateToRestore.capturedBlue) setCapturedBlue(stateToRestore.capturedBlue);
      if (stateToRestore.tiltAngle !== undefined) setTiltAngle(stateToRestore.tiltAngle);
      if (stateToRestore.zoomScale !== undefined) setZoomScale(stateToRestore.zoomScale);
      setSelectedPos(null);
      setValidMoves([]);
      setWinner(null);
      setWinReason("");
      setCombatClashInfo(null);
      setAnimatingMove(null);
      setCombatFocusPos(null);
      setHoveredPiece(null);
      setHoveredPos(null);
      // Pick first player piece as inspected piece
      let initialPiece: StrategoPiece | null = null;
      for (const row of stateToRestore.board) {
        for (const p of row) {
          if (p && p.player === myColor) {
            initialPiece = p;
            break;
          }
        }
        if (initialPiece) break;
      }
      setInspectedPiece(initialPiece);
      setCombatClashSummary(null);
      return;
    }

    initializeSetup(selectedPreset, startingPlayer);
  }, [savedGameData, initializeSetup, selectedPreset, startingPlayer]);

  // Handler to start or restart match from the settings dialog
  const handleStartMatchFromSettings = (
    chosenPreset = selectedPreset,
    chosenDiff = difficulty,
    chosenStarter = startingPlayer
  ) => {
    setSelectedPreset(chosenPreset);
    setDifficulty(chosenDiff);
    setStartingPlayer(chosenStarter);
    initializeSetup(chosenPreset, chosenStarter);
    setPhase("setup");
    setHasGameStarted(false);
    setTurn(chosenStarter);
    setIsSettingsModalOpen(false);
    SoundManager.startBackgroundMusic();
  };

  // Calculate legal moves for a selected piece
  const getLegalMovesForPiece = useCallback(
    (piece: StrategoPiece, currentBoard: (StrategoPiece | null)[][], overridePos?: { r: number; c: number }) => {
      if (!STRATEGO_PIECE_DEFS[piece.type].movable) return [];
      const moves: { r: number; c: number }[] = [];
      const row = overridePos ? overridePos.r : (piece.row ?? 0);
      const col = overridePos ? overridePos.c : (piece.col ?? 0);

      const directions = [
        { dr: -1, dc: 0 }, // up
        { dr: 1, dc: 0 },  // down
        { dr: 0, dc: -1 }, // left
        { dr: 0, dc: 1 },  // right
      ];

      // Scout can move any number of empty squares in orthogonal directions
      const maxDist = piece.type === "scout" ? 9 : 1;

      for (const { dr, dc } of directions) {
        for (let dist = 1; dist <= maxDist; dist++) {
          const nr = row + dr * dist;
          const nc = col + dc * dist;

          // Check board boundaries
          if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) break;

          // Inaccessible lakes check!
          if (isStrategoLake(nr, nc)) break;

          const targetPiece = currentBoard[nr][nc];
          if (!targetPiece) {
            moves.push({ r: nr, c: nc });
          } else {
            // Cannot attack own pieces
            if (targetPiece.player !== piece.player) {
              moves.push({ r: nr, c: nc });
            }
            // Blocked by any piece
            break;
          }
        }
      }

      return moves;
    },
    []
  );

  // Handle cell click during setup or playing
  const handleCellClick = (r: number, c: number) => {
    if (animatingMove || activeDuel) return; // Disallow interaction while piece is in motion or sword duel in progress
    // Immediately cancel any pending post-move zoom reset timer so it never wipes out user's immediate selection
    if (zoomResetTimerRef.current) {
      clearTimeout(zoomResetTimerRef.current);
      zoomResetTimerRef.current = null;
    }
    if (isStrategoLake(r, c)) {
      SoundManager.playMovePiece();
      return;
    }

    // SETUP PHASE: Player selects 2 pieces (or 1 piece + target square) in their territory to swap them
    if (phase === "setup") {
      if (isMySetupReady) return; // Locked while waiting for opponent to finish setup
      const isMyTerritory = myColor === "red" ? (r >= 6 && r <= 9) : (r >= 0 && r <= 3);
      if (!isMyTerritory) return; // Only player's army territory is interactive during setup

      const clickedPiece = board[r][c];

      // Nothing selected yet: select clicked piece as 1st piece
      if (!selectedPos) {
        if (clickedPiece && clickedPiece.player === myColor) {
          setSelectedPos({ r, c });
          setSwapTargetPos(null);
          setInspectedPiece(clickedPiece);
          SoundManager.playMovePiece();
        }
        return;
      }

      // Tapped exact same cell as 1st piece: deselect both
      if (selectedPos.r === r && selectedPos.c === c) {
        setSelectedPos(null);
        setSwapTargetPos(null);
        return;
      }

      // Tapped another cell in own territory: execute swap directly!
      handleExecuteSwapWith(selectedPos, { r, c });
      return;
    }

    if (phase === "playing") {
      if (turn !== myColor) {
        const oppName = onlineMatchSession?.opponentName || (language === "it" ? "l'avversario" : "the opponent");
        const turnColorText = turn === "red"
          ? (language === "it" ? "Rosso" : "Red")
          : (language === "it" ? "Blu" : "Blue");
        const msg = language === "it"
          ? `È il turno di ${oppName} (Esercito ${turnColorText})!`
          : `It is ${oppName}'s turn (${turnColorText} Army)!`;
        setTurnNoticeToast(msg);
        setTimeout(() => setTurnNoticeToast(null), 2500);
        return;
      }

      const clickedPiece = board[r][c];

      // If a piece is currently selected and clicking a valid move: execute move!
      if (selectedPos) {
        const isMoveValid = validMoves.some((m) => m.r === r && m.c === c);
        if (isMoveValid) {
          executeMove(selectedPos.r, selectedPos.c, r, c);
          return;
        }
      }

      // If clicking own piece: select it and zoom 60% to show legal moves
      if (clickedPiece && clickedPiece.player === myColor) {
        setCombatFocusPos(null); // Switch focus to newly selected piece
        setInspectedPiece(clickedPiece);
        if (STRATEGO_PIECE_DEFS[clickedPiece.type].movable) {
          setSelectedPos({ r, c });
          const moves = getLegalMovesForPiece(clickedPiece, board, { r, c });
          setValidMoves(moves);
          SoundManager.playMovePiece();
        } else {
          // Immobile (Bomb or Flag)
          setSelectedPos(null);
          setValidMoves([]);
        }
      } else if (clickedPiece && (clickedPiece.revealedToOpponent || revealEnemyAdmin)) {
        setInspectedPiece(clickedPiece);
        setSelectedPos(null);
        setValidMoves([]);
        setCombatFocusPos(null);
      } else {
        // Tapped empty space or unselected: reset zoom
        setInspectedPiece(null);
        setSelectedPos(null);
        setValidMoves([]);
        setCombatFocusPos(null);
      }
    }
  };

  // Resolve combat according to official Stratego rules
  const resolveCombat = (
    attacker: StrategoPiece,
    defender: StrategoPiece
  ): StrategoBattleResult => {
    attacker.revealedToOpponent = true;
    defender.revealedToOpponent = true;

    // RULE 1: Flag captured!
    if (defender.type === "flag") {
      return {
        attacker,
        defender,
        winner: "attacker",
        description:
          language === "it"
            ? "🚩 BANDIERA CATTURATA! La bandiera nemica è stata espugnata!"
            : "🚩 FLAG CAPTURED! The enemy flag has been seized!",
      };
    }

    // RULE 2: Bomb interaction
    if (defender.type === "bomb") {
      if (attacker.type === "miner") {
        return {
          attacker,
          defender,
          winner: "attacker",
          description:
            language === "it"
              ? "⛏️ BOMBA DISINNESCATA! Il Geniere ha neutralizzato la mina senza esplodere!"
              : "⛏️ BOMB DEFUSED! The Miner successfully disarmed the bomb safely!",
        };
      } else {
        return {
          attacker,
          defender,
          winner: "defender",
          description:
            language === "it"
              ? "💣 BOOM! L'attaccante è saltato in aria sulla Bomba nemica!"
              : "💣 BOOM! The attacker detonated the enemy Bomb and was eliminated!",
        };
      }
    }

    // RULE 3: Spy vs Marshal
    if (attacker.type === "spy" && defender.type === "marshal") {
      return {
        attacker,
        defender,
        winner: "attacker",
        description:
          language === "it"
            ? "🕵️ AGGUATO RIUSCITO! La Spia ha eliminato a sorpresa il Maresciallo nemico (10)!"
            : "🕵️ AMBUSH! The Spy assassinated the enemy Marshal (10) in a surprise attack!",
      };
    }

    // RULE 4: Same rank = both eliminated
    if (attacker.rank === defender.rank) {
      return {
        attacker,
        defender,
        winner: "draw",
        description:
          language === "it"
            ? `⚔️ PARI GRADO (${attacker.rank} vs ${defender.rank}): Entrambi i combattenti cadono sul campo!`
            : `⚔️ EQUAL RANK (${attacker.rank} vs ${defender.rank}): Both units destroyed in simultaneous clash!`,
      };
    }

    // RULE 5: Higher rank wins
    if (attacker.rank > defender.rank) {
      return {
        attacker,
        defender,
        winner: "attacker",
        description:
          language === "it"
            ? `🏆 VITTORIA (${STRATEGO_PIECE_DEFS[attacker.type].nameIt} grado ${attacker.rank} sconfigge ${STRATEGO_PIECE_DEFS[defender.type].nameIt} grado ${defender.rank})!`
            : `🏆 VICTORY (${STRATEGO_PIECE_DEFS[attacker.type].nameEn} rank ${attacker.rank} defeats ${STRATEGO_PIECE_DEFS[defender.type].nameEn} rank ${defender.rank})!`,
      };
    } else {
      return {
        attacker,
        defender,
        winner: "defender",
        description:
          language === "it"
            ? `💀 SCONFITTA (${STRATEGO_PIECE_DEFS[attacker.type].nameIt} grado ${attacker.rank} battuto da ${STRATEGO_PIECE_DEFS[defender.type].nameIt} grado ${defender.rank})!`
            : `💀 DEFEAT (${STRATEGO_PIECE_DEFS[attacker.type].nameEn} rank ${attacker.rank} eliminated by ${STRATEGO_PIECE_DEFS[defender.type].nameEn} rank ${defender.rank})!`,
      };
    }
  };

  // Check if player has at least one piece that can make a legal move
  const checkHasMovablePieces = (player: "red" | "blue", currentBoard: (StrategoPiece | null)[][]) => {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const p = currentBoard[r][c];
        if (p && p.player === player && STRATEGO_PIECE_DEFS[p.type].movable) {
          const moves = getLegalMovesForPiece(p, currentBoard);
          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  };

  // Callback when the 2-second sword duel animation concludes
  const handleDuelComplete = useCallback(
    (duelData: {
      attacker: StrategoPiece;
      defender: StrategoPiece;
      battleResult: StrategoBattleResult;
      targetPos: { r: number; c: number };
      fromPos: { r: number; c: number };
    }) => {
      // Clear movement selection and valid moves immediately after combat
      setSelectedPos(null);
      setValidMoves([]);
      setHoveredPos(null);
      setHoveredPiece(null);

      const { attacker, defender, battleResult, targetPos, fromPos } = duelData;
      const { r: toR, c: toC } = targetPos;
      const { r: fromR, c: fromC } = fromPos;

      setBoard((currentBoard) => {
        const newBoard = currentBoard.map((row) => [...row]);

        if (battleResult.winner === "attacker") {
          newBoard[fromR][fromC] = null;
          newBoard[toR][toC] = { ...attacker, row: toR, col: toC, revealedToOpponent: true };
          if (defender.player === "blue") {
            setCapturedBlue((prev) => [...prev, defender]);
            SoundManager.playPlaceWall();
          } else {
            setCapturedRed((prev) => [...prev, defender]);
            SoundManager.playDefeat();
          }

          // Win condition: captured flag
          if (defender.type === "flag") {
            const winReasonText = attacker.player === myColor
              ? st.flagCapturedWin
              : st.flagCapturedLoss;
            setWinner(attacker.player);
            setWinReason(winReasonText);
            setPhase("gameover");
            clearSavedGame();
            awardGameEndPoints(attacker.player);
            if (attacker.player === myColor) SoundManager.playVictory();
            else SoundManager.playDefeat();
            if (onlineMatchSession && onEndOnlineMatch) {
              onEndOnlineMatch({
                winner: attacker.player,
                winnerIndex: attacker.player === "red" ? 1 : 2,
                isMeWinner: attacker.player === myColor,
                reason: winReasonText,
              });
            }
            setActiveDuel(null);
            scheduleZoomResetAfterMove();
            return newBoard;
          }
        } else if (battleResult.winner === "defender") {
          newBoard[fromR][fromC] = null; // Attacker dies
          newBoard[toR][toC] = { ...defender, revealedToOpponent: true }; // Defender survives and is revealed!
          if (attacker.player === myColor) {
            setCapturedRed((prev) => [...prev, attacker]);
            SoundManager.playDefeat();
          } else {
            setCapturedBlue((prev) => [...prev, attacker]);
            SoundManager.playPlaceWall();
          }
        } else {
          // Draw: both eliminated
          newBoard[fromR][fromC] = null;
          newBoard[toR][toC] = null;
          if (attacker.player === "red") setCapturedRed((prev) => [...prev, attacker]);
          else setCapturedBlue((prev) => [...prev, attacker]);

          if (defender.player === "red") setCapturedRed((prev) => [...prev, defender]);
          else setCapturedBlue((prev) => [...prev, defender]);
          SoundManager.playDefeat();
        }

        // Check if next player has any movable pieces left
        const nextPlayer = attacker.player === "red" ? "blue" : "red";
        const nextPlayerHasMoves = checkHasMovablePieces(nextPlayer, newBoard);
        if (!nextPlayerHasMoves) {
          const winReasonText = attacker.player === myColor
            ? st.noLegalMovesWin
            : st.noLegalMovesLoss;
          setWinner(attacker.player);
          setWinReason(winReasonText);
          setPhase("gameover");
          clearSavedGame();
          awardGameEndPoints(attacker.player);
          if (attacker.player === myColor) SoundManager.playVictory();
          else SoundManager.playDefeat();
          if (onlineMatchSession && onEndOnlineMatch) {
            onEndOnlineMatch({
              winner: attacker.player,
              winnerIndex: attacker.player === "red" ? 1 : 2,
              isMeWinner: attacker.player === myColor,
              reason: winReasonText,
            });
          }
          setActiveDuel(null);
          scheduleZoomResetAfterMove();
          return newBoard;
        }

        setTurn(nextPlayer);
        setActiveDuel(null);
        scheduleZoomResetAfterMove();
        return newBoard;
      });
    },
    [language, scheduleZoomResetAfterMove]
  );

  // Execute a move on the board with slow and realistic animation
  const executeMove = (fromR: number, fromC: number, toR: number, toC: number) => {
    const sourcePiece = board[fromR][fromC];
    if (!sourcePiece || animatingMove || activeDuel) return;

    // Traccia l'ultima mossa eseguita: lascia sulle caselle di partenza e arrivo un colore più acceso per 1 mossa
    setLastExecutedMove({
      fromR,
      fromC,
      toR,
      toC,
      player: sourcePiece.player,
    });

    const targetPiece = board[toR][toC];
    const isAttack = targetPiece !== null;
    setInspectedPiece(null);
    setSelectedPos(null);
    setValidMoves([]);
    setHoveredPos(null);
    setHoveredPiece(null);
    setHasGameStarted(true);
    setMoveCount((prev) => prev + 1);

    // Track enemy moved pieces for AI deduction (moved piece cannot be Bomb or Flag)
    if (sourcePiece.player === myColor) {
      enemyMovedPiecesRef.current.add(sourcePiece.id);
      enemyMovedPiecesRef.current.add(`${toR}_${toC}`);
      if (Math.abs(fromR - toR) > 1 || Math.abs(fromC - toC) > 1) {
        enemyScoutPiecesRef.current.add(sourcePiece.id);
      }
    }

    // Sync move to online room if live multiplayer
    if (onlineMatchSession && !onlineMatchSession.isSimulatedOpponent && db && sourcePiece.player === myColor) {
      localMoveCountRef.current += 1;
      const moveId = `move_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      lastProcessedRemoteMoveIdRef.current = moveId;
      setDoc(doc(db, "online_rooms", onlineMatchSession.roomId), {
        strategoMove: { fromR, fromC, toR, toC, moveId },
        lastMoveBy: myPlayerIndex,
        turnCount: localMoveCountRef.current,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch((e) => console.error("Error sending Stratego move:", e));
    }

    let battleResult: StrategoBattleResult | null = null;
    if (isAttack && targetPiece) {
      battleResult = resolveCombat(sourcePiece, targetPiece);
      setCombatClashInfo(battleResult);
      setCombatClashSummary(battleResult.description);
      // Zoom 100% directly centered on the battle square!
      setCombatFocusPos({ r: toR, c: toC });

      // Start the 2-second piece duel immediately directly between the two pieces on the board!
      setActiveDuel({
        attacker: sourcePiece,
        defender: targetPiece,
        battleResult,
        targetPos: { r: toR, c: toC },
        fromPos: { r: fromR, c: fromC },
      });
      return;
    }

    setCombatFocusPos(null);

    // 1. Simple Move: Initiate realistic glide animation state
    setAnimatingMove({
      piece: sourcePiece,
      fromR,
      fromC,
      toR,
      toC,
      isAttack: false,
      targetPiece: null,
      started: false,
    });
    SoundManager.playMovePiece();

    // 2. Trigger glide animation on next tick
    setTimeout(() => {
      setAnimatingMove((prev) => (prev ? { ...prev, started: true } : null));
    }, 25);

    // 3. Complete glide animation (875ms)
    setTimeout(() => {
      // Simple Move to empty square
      setBoard((prev) => {
        const nextBoard = prev.map((row) => [...row]);
        const pieceToMove = nextBoard[fromR][fromC] || sourcePiece;
        nextBoard[fromR][fromC] = null;
        nextBoard[toR][toC] = { ...pieceToMove, row: toR, col: toC };
        return nextBoard;
      });
      SoundManager.playMovePiece();
      setAnimatingMove(null);

      // Reset zoom 1 second after move completion
      scheduleZoomResetAfterMove();

      // Switch turn
      const nextTurn = sourcePiece.player === "red" ? "blue" : "red";
      setTurn(nextTurn);
    }, 875);
  };

  useEffect(() => {
    executeMoveRef.current = executeMove;
  });

  // AI turn automation with configurable difficulty (supports local game and online simulated opponents)
  useEffect(() => {
    if (phase !== "playing") return;
    const aiPlayer: "red" | "blue" = myColor === "red" ? "blue" : "red";
    const isAiTurn = onlineMatchSession
      ? (onlineMatchSession.isSimulatedOpponent && turn === aiPlayer)
      : (turn === "blue");

    if (!isAiTurn) return;

    const timer = setTimeout(() => {
      interface AIMoveOption {
        fromR: number;
        fromC: number;
        toR: number;
        toC: number;
        score: number;
      }
      const allMoves: AIMoveOption[] = [];

      // Helper: check if a board square is threatened by a known stronger adjacent enemy
      const isSquareThreatenedByStronger = (sqR: number, sqC: number, movingPieceRank: number, movingPieceType: StrategoPieceType): boolean => {
        const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of deltas) {
          const nr = sqR + dr;
          const nc = sqC + dc;
          if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
            const enemy = board[nr][nc];
            if (enemy && enemy.player === myColor && enemy.revealedToOpponent) {
              if (movingPieceType === "marshal" && enemy.type === "spy") return true;
              if (enemy.rank > movingPieceRank && STRATEGO_PIECE_DEFS[enemy.type].movable) return true;
            }
          }
        }
        return false;
      };

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const piece = board[r][c];
          if (piece && piece.player === aiPlayer && STRATEGO_PIECE_DEFS[piece.type].movable) {
            const moves = getLegalMovesForPiece(piece, board);
            const currentlyInDanger = isSquareThreatenedByStronger(r, c, piece.rank, piece.type);

            moves.forEach((m) => {
              const target = board[m.r][m.c];
              let score = 15; // Base baseline score

              // 1. Advance towards enemy territory
              const advanceDist = aiPlayer === "blue" ? m.r : (9 - m.r);
              // Easy (former Hard): 3.5 | Medium (former Extreme): 4.5 | Hard (former Master): 5.5
              const advanceFactor =
                difficulty === "easy" ? 3.5 :
                difficulty === "medium" ? 4.5 : 5.5;
              score += advanceDist * advanceFactor;

              // Center lane preference
              const centerDist = Math.abs(m.c - 4.5);
              score += (4.5 - centerDist) * 1.2;

              // 2. Tactical Evasion: if currently threatened, reward escaping to a safe square
              const landingInDanger = isSquareThreatenedByStronger(m.r, m.c, piece.rank, piece.type);
              if (currentlyInDanger && !landingInDanger) {
                const evasionReward = piece.rank * (
                  difficulty === "easy" ? 180 :
                  difficulty === "medium" ? 260 : 280
                );
                score += evasionReward;
              }

              // 3. Danger / Blunder avoidance: penalize stepping into line of fire of known stronger enemy
              if (landingInDanger) {
                const threatPenalty =
                  difficulty === "easy" ? (350 + piece.rank * 50) :
                  difficulty === "medium" ? (550 + piece.rank * 75) :
                  (650 + piece.rank * 85);
                score -= threatPenalty;
              }

              // 4. Combat evaluation (if target is opponent piece)
              if (target && target.player === myColor) {
                if (target.revealedToOpponent) {
                  // A. Known Flag: Absolute top priority
                  if (target.type === "flag") {
                    score += 500000;
                  }
                  // B. Known Bomb
                  else if (target.type === "bomb") {
                    if (piece.type === "miner") {
                      score += difficulty === "easy" ? 2800 : difficulty === "medium" ? 4500 : 5500;
                    } else {
                      // Do not suicide into bomb
                      score -= 20000;
                    }
                  }
                  // C. Known Marshal
                  else if (target.type === "marshal") {
                    if (piece.type === "spy") {
                      score += difficulty === "easy" ? 12000 : difficulty === "medium" ? 25000 : 35000;
                    } else {
                      score -= 15000; // Suicide
                    }
                  }
                  // D. Known General (9)
                  else if (target.type === "general") {
                    if (piece.type === "marshal") {
                      score += difficulty === "easy" ? 2500 : difficulty === "medium" ? 4500 : 6000;
                    } else if (piece.rank < 9) {
                      score -= 12000;
                    }
                  }
                  // E. General rank comparisons
                  else if (piece.rank > target.rank) {
                    const victimMultiplier =
                      difficulty === "easy" ? 90 :
                      difficulty === "medium" ? 115 : 130;
                    score += 280 + target.rank * victimMultiplier;

                    // High value targets
                    if (target.type === "miner") score += 180; // Deny bomb-disarming
                    if (target.type === "spy") score += 250;   // Protect Marshal
                  } else if (piece.rank === target.rank) {
                    // Trade equality
                    if (piece.rank <= 5) score += 45; // Good trade for minor ranks
                    else if (piece.rank <= 7) score += 10;
                    else score -= 180; // High officers avoid unnecessary trades
                  } else {
                    // Suicide into known stronger piece
                    score -= 18000;
                  }
                } else {
                  // Unknown target attack
                  const targetHasMoved =
                    enemyMovedPiecesRef.current.has(target.id) ||
                    enemyMovedPiecesRef.current.has(`${m.r}_${m.c}`);
                  const targetIsScout = enemyScoutPiecesRef.current.has(target.id);

                  if (targetIsScout) {
                    // Confirmed scout (rank 2)
                    if (piece.rank > 2) score += 260;
                    else if (piece.rank === 2) score += 40;
                  } else if (targetHasMoved) {
                    // Not a Bomb and not a Flag!
                    if (piece.type === "scout") {
                      score += 130; // Great probe
                    } else if (piece.rank >= 7) {
                      score += 100; // Likely wins against most
                    } else if (piece.type === "spy") {
                      score -= 120; // Protect spy
                    }
                  } else {
                    // Has not moved: could be Bomb or Flag!
                    const isBackArea = aiPlayer === "blue" ? m.r >= 8 : m.r <= 1;
                    if (piece.type === "miner") {
                      score += isBackArea ? 320 : 180; // Miners disarm potential bunker
                    } else if (piece.type === "scout") {
                      score += isBackArea ? 140 : 80;  // Scout sacrifice probe
                    } else if (piece.rank >= 8) {
                      score -= difficulty === "easy" ? 280 : 350; // Don't suicide General/Marshal on potential bomb
                    } else if (piece.type === "spy") {
                      score -= 150;
                    }
                  }
                }
              }

              // 5. Special piece role guidelines
              // Spy behavior: remain patient and hidden behind frontline if enemy marshal not located
              if (piece.type === "spy" && !target) {
                const isAdvanced = aiPlayer === "blue" ? m.r >= 5 : m.r <= 4;
                if (isAdvanced) {
                  score -= 80; // Keep spy in reserve
                }
              }

              // 6. Random spice per difficulty level:
              // Easy (former Hard): Math.random() * 1.5 | Medium (former Extreme): Math.random() * 0.3 | Hard (former Master): 0
              const randomSpice =
                difficulty === "easy" ? Math.random() * 1.5 :
                difficulty === "medium" ? Math.random() * 0.3 : 0;

              score += randomSpice;
              allMoves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, score });
            });
          }
        }
      }

      if (allMoves.length > 0) {
        allMoves.sort((a, b) => b.score - a.score);
        const chosen = allMoves[0];
        executeMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC);
      } else {
        // AI has no moves: Human wins!
        const winReasonText = st.noLegalMovesWin;
        setWinner(myColor);
        setWinReason(winReasonText);
        setPhase("gameover");
        clearSavedGame();
        awardGameEndPoints(myColor);
        SoundManager.playVictory();
        if (onlineMatchSession && onEndOnlineMatch) {
          onEndOnlineMatch({
            winner: myColor,
            winnerIndex: myPlayerIndex,
            isMeWinner: true,
            reason: winReasonText,
          });
        }
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [phase, turn, board, getLegalMovesForPiece, difficulty, myColor, onlineMatchSession, onEndOnlineMatch, myPlayerIndex, language, awardGameEndPoints]);

  // Active inspected piece: on desktop, mouse hover prioritizes live preview; on mobile (or when no hover), selected/tapped piece is shown stably!
  const activeInspectedPiece = useMemo(() => {
    const candidate = hoveredPiece || inspectedPiece;
    if (!candidate) return null;
    if (candidate.player === myColor || candidate.revealedToOpponent || revealEnemyAdmin) {
      return candidate;
    }
    return null;
  }, [hoveredPiece, inspectedPiece, revealEnemyAdmin, myColor]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between bg-slate-950 text-slate-100 select-none overflow-hidden relative p-1 sm:p-2.5">
      {/* Top Header Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-900 rounded-2xl border border-white/10 shadow-xl shrink-0 z-20">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-sm sm:text-base">🚩</span>
            <span className="text-[11px] sm:text-sm font-black text-amber-400 uppercase tracking-wider sm:tracking-widest">
              STRATEGO<span className="hidden xs:inline"> 3D</span>
            </span>
          </div>

          {onlineMatchSession && (
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-[10px] sm:text-xs text-emerald-300 font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
              <span className="hidden xs:inline">ONLINE:</span>
              <span className="truncate max-w-[80px] sm:max-w-[130px] font-black text-white">
                vs {onlineMatchSession.opponentName}
              </span>
            </div>
          )}
        </div>

        {/* Top Header Action Icons: [Fullscreen] [?] [SALVA] [X] - Responsive sizing prevents mobile truncation */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullScreen}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors border border-white/10 text-slate-300 hover:text-white active:scale-95 shadow-md shrink-0"
            title={isFullscreen ? st.exitFullscreen : st.fullscreen}
            aria-label={isFullscreen ? st.exitFullscreen : st.fullscreen}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />}
          </button>

          {/* Rules Button */}
          <button
            onClick={() => {
              if (onOpenRules) {
                onOpenRules();
              } else {
                setIsRulesOpen(true);
              }
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors border border-white/10 text-sm sm:text-base active:scale-95 shadow-md shrink-0"
            title={st.rulesTooltip}
            aria-label="Regole"
          >
            ❓
          </button>

          {/* Save Button (Disabled / hidden if in live online match) */}
          {!onlineMatchSession && (
            <button
              onClick={handleSaveGame}
              className="h-8 sm:h-10 px-2 sm:px-3 bg-blue-600/80 rounded-full flex items-center justify-center gap-1 hover:bg-blue-500 transition-colors border border-blue-400/30 text-[11px] sm:text-xs font-bold uppercase text-white shadow-md active:scale-95 shrink-0"
              title={st.saveMatch}
              aria-label={st.saveMatch}
            >
              <span className="text-xs sm:text-sm">💾</span>
              <span className="hidden sm:inline">{st.save}</span>
            </button>
          )}

          {/* Exit / Close Button */}
          <button
            onClick={() => {
              if (onlineMatchSession) {
                if (window.confirm(st.abandonOnlineConfirm)) {
                  if (onOnlineAbandon) onOnlineAbandon();
                  else if (onBackToSetup) onBackToSetup();
                  else onBackToMenu();
                }
              } else {
                if (onBackToSetup) onBackToSetup();
                else onBackToMenu();
              }
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-red-900/50 transition-colors border border-white/10 text-white font-bold text-xs sm:text-sm active:scale-95 shadow-md shrink-0"
            title={st.exit}
            aria-label={st.exit}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Floating Save Confirmation Toast */}
      {saveToast && (
        <div className="absolute top-16 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600/95 border border-emerald-400 text-white font-black text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 pointer-events-none">
          <span>💾</span>
          <span>{st.gameSavedSuccess}</span>
        </div>
      )}

      {/* Floating Personal Preset Saved Toast */}
      {personalSaveToast && (
        <div className="absolute top-16 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-600/95 border border-amber-300 text-white font-black text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 pointer-events-none">
          <span>⭐</span>
          <span>{st.customSetupSavedToast}</span>
        </div>
      )}

      {/* Floating Swap Toast */}
      {swapToast && (
        <div className="absolute top-16 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 pointer-events-none">
          <span>🔄</span>
          <span>{swapToast}</span>
        </div>
      )}

      {/* Floating Turn Notice Toast */}
      {turnNoticeToast && (
        <div className="absolute top-16 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 pointer-events-none">
          <span>⏳</span>
          <span>{turnNoticeToast}</span>
        </div>
      )}

      {/* Turn Status & Live Captured Counter (Fixed Header Panel - z-40 so floating fumetto overlays content below) */}
      <div className="w-full max-w-2xl px-2 sm:px-3 py-1.5 mb-1 rounded-xl bg-slate-900/90 border border-white/10 shrink-0 text-xs z-40 shadow-lg relative">
        {phase === "setup" ? (
          <div className="flex flex-col w-full gap-1.5 py-0.5">
            {/* Top Info Line */}
            <div className="flex items-center justify-between w-full gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse shrink-0" />
                <span className="font-black uppercase tracking-wider text-amber-300 text-[11px] sm:text-sm truncate">
                  {st.setupTitle}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-amber-300 font-bold truncate text-right">
                {isOnline && !onlineMatchSession?.isSimulatedOpponent && isMySetupReady
                  ? st.waitingBothConfirm
                  : selectedPos
                  ? st.tapSecondPieceToSwap
                  : st.finishedSetupPrompt}
              </span>
            </div>

            {/* Bottom Action Buttons Line: [📐 Schema Dropdown] [⭐ Salva] [⚔️ Inizia Battaglia!] */}
            <div className="flex items-center justify-between w-full gap-2 pt-1 border-t border-white/10">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
                {/* DROPDOWN BOX SELEZIONE SCHEMA DI SCHIERAMENTO */}
                {!isMySetupReady && (
                  <div className="relative inline-flex items-center">
                    <select
                      id="stratego-preset-dropdown"
                      aria-label={st.selectPresetAria}
                      value={selectedPreset}
                      onChange={(e) => handleSelectPreset(e.target.value)}
                      className="appearance-none bg-slate-800 hover:bg-slate-700/90 text-amber-300 hover:text-amber-200 border border-amber-400/50 hover:border-amber-400 rounded-lg sm:rounded-xl pl-2.5 pr-6 py-1 sm:py-1.5 text-[11px] sm:text-xs font-black transition-all cursor-pointer shadow-md focus:outline-none focus:ring-1 focus:ring-amber-400 max-w-[135px] sm:max-w-[165px] truncate"
                      title={st.choosePresetTitle}
                    >
                      <option value="balanced" className="bg-slate-900 text-white font-bold">
                        {st.presetBalanced}
                      </option>
                      <option value="wall" className="bg-slate-900 text-white font-bold">
                        {st.presetDefensive}
                      </option>
                      <option value="blitz" className="bg-slate-900 text-white font-bold">
                        {st.presetBlitz}
                      </option>
                      <option value="bluff" className="bg-slate-900 text-white font-bold">
                        {st.presetBluff}
                      </option>
                      <option value="fortress" className="bg-slate-900 text-white font-bold">
                        {st.presetFortress}
                      </option>
                      <option value="personal" className="bg-slate-900 text-amber-300 font-bold">
                        {st.presetCustom}
                      </option>
                    </select>
                    {/* Freccia dropdown */}
                    <span className="pointer-events-none absolute right-2 text-[10px] text-amber-400 font-black">
                      ▾
                    </span>
                  </div>
                )}

                {/* Salva Schieramento Personale */}
                {!isMySetupReady && (
                  <button
                    onClick={handleSavePersonalPreset}
                    className="px-2 py-1 sm:py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/50 rounded-lg sm:rounded-xl text-blue-300 text-[10px] sm:text-xs font-black active:scale-95 transition-all shadow-md flex items-center gap-1 shrink-0 whitespace-nowrap"
                    title={st.saveCustomTooltip}
                  >
                    <span className="text-xs">⭐</span>
                    <span className="font-bold">
                      {st.save}
                    </span>
                  </button>
                )}
              </div>

              {/* ONLINE: Show waiting indicator when I'm ready; otherwise Start / Ready button */}
              {isOnline && !onlineMatchSession?.isSimulatedOpponent && isMySetupReady ? (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] sm:text-xs font-black shadow-md animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <span>
                      {`${st.waitingForOpponent} ${onlineMatchSession.opponentName}...`}
                    </span>
                  </div>
                  <button
                    onClick={handleCancelMyReady}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] sm:text-[10px] font-bold border border-white/10 active:scale-95 transition-all"
                    title={st.editArmy}
                  >
                    {st.editArmy}
                  </button>
                </div>
              ) : (
                <div className="relative flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* Opponent readiness hint */}
                  {isOnline && !onlineMatchSession?.isSimulatedOpponent && isOpponentSetupReady && (
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-400/40 px-2 py-1 rounded-lg flex items-center gap-1 animate-pulse">
                      <span>✓</span>
                      <span className="hidden xs:inline">{onlineMatchSession.opponentName} {st.opponentReady}</span>
                    </span>
                  )}

                  {/* Inizia Battaglia button */}
                  <div className="relative">
                    {showStartBubble && !isMySetupReady && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.95)] animate-bounce border border-amber-200 pointer-events-none whitespace-nowrap z-50">
                        👇 {st.tapHere}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setShowStartBubble(false);
                        handleConfirmSetupAndPlay();
                      }}
                      className="relative px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 hover:from-emerald-500 hover:to-green-400 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.7)] flex items-center gap-1.5 shrink-0 whitespace-nowrap ring-2 ring-emerald-300 animate-pulse"
                    >
                      <span className="text-xs sm:text-sm">⚔️</span>
                      <span>
                        {st.startBattle}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* FUMETTO DI GUIDA ALL'AVVIO - PERFETTAMENTE POSIZIONATO E NON TRONCATO SULLA DESTRA */}
            {showStartBubble && !isMySetupReady && (
              <div
                className="absolute right-2 sm:right-3 top-full mt-2 z-[99999] animate-in fade-in zoom-in-95 duration-200 filter drop-shadow-2xl max-w-[calc(100vw-1.5rem)] w-[295px] sm:w-[325px]"
                style={{ pointerEvents: "auto" }}
              >
                {/* Becco rivolto in alto verso il pulsante Inizia Battaglia */}
                <div className="absolute -top-2.5 right-6 sm:right-9 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] border-b-emerald-400" />

                <div className="relative bg-gradient-to-br from-emerald-800 via-slate-900 to-slate-950 border-2 border-emerald-400 text-white rounded-2xl p-3 sm:p-3.5 shadow-[0_12px_35px_rgba(0,0,0,0.95),0_0_25px_rgba(16,185,129,0.7)] ring-2 ring-emerald-400/40 w-full">
                  <button
                    onClick={() => setShowStartBubble(false)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white text-xs flex items-center justify-center border border-white/20 transition-colors"
                    title={st.closeBtn}
                  >
                    ✕
                  </button>

                  <div className="flex items-start gap-2.5 pr-6">
                    <span className="text-xl shrink-0 mt-0.5 animate-bounce">⚔️</span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-emerald-200 uppercase tracking-wide">
                        {st.bubbleTitle}
                      </h4>
                      <div className="text-[11px] sm:text-xs text-emerald-50 leading-snug mt-1.5 space-y-1 font-medium">
                        <p>
                          🔄 <strong className="text-white font-bold">{st.bubbleSwapTitle}</strong>{" "}
                          {st.bubbleSwapDesc}
                        </p>
                        <p>
                          ⚔️ <strong className="text-white font-bold">{st.bubbleStartTitle}</strong>{" "}
                          {st.bubbleStartDesc}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Flag per non mostrare più il fumetto */}
                  <label className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/15 cursor-pointer select-none text-[11px] text-emerald-100 hover:text-white">
                    <input
                      type="checkbox"
                      checked={dontShowStartBubbleAgain}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDontShowStartBubbleAgain(checked);
                        try {
                          if (checked) {
                            localStorage.setItem("wallgo_stratego_hide_start_bubble", "true");
                          } else {
                            localStorage.removeItem("wallgo_stratego_hide_start_bubble");
                          }
                        } catch (err) {}
                      }}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-emerald-400 focus:ring-emerald-400 cursor-pointer accent-emerald-500 shrink-0"
                    />
                    <span className="font-semibold truncate">
                      {st.bubbleDontShowAgain}
                    </span>
                  </label>

                  {/* Footer con tasto OK */}
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-300">
                    <span>💡 {st.bubbleFooterHint}</span>
                    <button
                      onClick={() => setShowStartBubble(false)}
                      className="bg-emerald-500 hover:bg-emerald-400 px-3 py-1 rounded-lg text-slate-950 font-black text-[11px] uppercase tracking-wider shadow transition-colors active:scale-95"
                    >
                      {st.bubbleOk}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-1 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${
                  onlineMatchSession
                    ? turn === myColor
                      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"
                      : "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse"
                    : turn === "red"
                    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"
                    : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"
                }`}
              />
              <span className="font-black uppercase tracking-wider text-white text-[11px] sm:text-xs truncate">
                {onlineMatchSession
                  ? turn === myColor
                    ? moveCount === 0 && myColor === "red"
                      ? language === "it"
                        ? "⚔️ Tuo Turno (Prima mossa al Rosso)"
                        : language === "es"
                        ? "⚔️ Tu Turno (Primer movimiento al Rojo)"
                        : language === "fr"
                        ? "⚔️ Votre Tour (Premier coup au Rouge)"
                        : language === "de"
                        ? "⚔️ Ihr Zug (Rot beginnt)"
                        : "⚔️ Your Turn (Red moves first)"
                      : `⚔️ ${st.yourTurn}`
                    : moveCount === 0 && turn === "red"
                    ? language === "it"
                      ? `⏳ Prima mossa a ${onlineMatchSession.opponentName} (Rosso)...`
                      : language === "es"
                      ? `⏳ Primer movimiento: ${onlineMatchSession.opponentName} (Rojo)...`
                      : language === "fr"
                      ? `⏳ Premier coup : ${onlineMatchSession.opponentName} (Rouge)...`
                      : language === "de"
                      ? `⏳ Erster Zug: ${onlineMatchSession.opponentName} (Rot)...`
                      : `⏳ First move: ${onlineMatchSession.opponentName} (Red)...`
                    : `⏳ ${onlineMatchSession.opponentName}...`
                  : turn === "red"
                  ? `⚔️ ${st.yourTurn}`
                  : `⏳ ${st.aiTurn}...`}
              </span>
              <span className="text-[9px] sm:text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase shrink-0">
                {onlineMatchSession
                  ? "1v1 ONLINE"
                  : difficulty === "hard"
                  ? (language === "it" ? "Difficile" : language === "es" ? "Difícil" : language === "fr" ? "Difficile" : language === "de" ? "Schwer" : "Hard")
                  : difficulty === "medium"
                  ? (language === "it" ? "Normale" : language === "es" ? "Normal" : language === "fr" ? "Normal" : language === "de" ? "Normal" : "Normal")
                  : (language === "it" ? "Facile" : language === "es" ? "Fácil" : language === "fr" ? "Facile" : language === "de" ? "Leicht" : "Easy")}
              </span>
              <div className="hidden xs:flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-300 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                <StrategoMatchTimer phase={phase} gameSecondsRef={gameSecondsRef} language={language} />
                <span className="text-white/20">|</span>
                <span title={st.movesPlayed}>♟️ {moveCount}</span>
              </div>
            </div>

            {/* Status / Captured Counters & Zoom Reset & Modifica Schieramento */}
            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold shrink-0">
              {!hasGameStarted && (
                <button
                  onClick={() => {
                    setPhase("setup");
                    setSelectedPos(null);
                    setValidMoves([]);
                  }}
                  className="px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-[9px] sm:text-[10px] font-black text-amber-300 flex items-center gap-1 active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap"
                  title={language === "it" ? "Modifica lo schieramento delle tue pedine" : language === "es" ? "Modificar el despliegue de tus piezas" : "Modify piece setup"}
                >
                  <span>🛠️</span>
                  <span className="hidden xs:inline">{st.editArmy}</span>
                </button>
              )}
              {isZoomed && (
                <button
                  onClick={() => {
                    setSelectedPos(null);
                    setValidMoves([]);
                    setCombatFocusPos(null);
                  }}
                  className="px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-[9px] sm:text-[10px] font-black text-amber-300 flex items-center gap-1 active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap"
                  title={language === "it" ? "Ripristina Zoom (100%)" : language === "es" ? "Restablecer Zoom (100%)" : "Reset Zoom (100%)"}
                >
                  <span>🔍</span>
                  <span className="hidden xs:inline">Zoom</span>
                </button>
              )}
              <span className="text-red-400 shrink-0 text-[10px] sm:text-xs">🔴 -{capturedRed.length}</span>
              <span className="text-blue-400 shrink-0 text-[10px] sm:text-xs">🔵 -{capturedBlue.length}</span>
            </div>
          </div>
        )}
      </div>

        {/* PIECE HOVER & INSPECTION TACTICAL BAR (STABLE FIXED HEIGHT - ZERO LAYOUT SHIFT) */}
        <div
          className="w-full max-w-2xl mb-1.5 px-3 sm:px-3.5 py-1.5 rounded-2xl bg-slate-900 border border-amber-500/40 shrink-0 h-[82px] sm:h-[86px] min-h-[82px] max-h-[86px] flex items-center justify-between z-10 shadow-xl text-xs overflow-hidden select-none"
          style={{ contain: "layout" }}
        >
          {activeInspectedPiece ? (
            <div className="flex items-center justify-between w-full gap-2.5 h-full">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* 3D-styled Piece Avatar with distinct rank border */}
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md relative"
                  style={{
                    backgroundColor: activeInspectedPiece.player === "red" ? "#991b1b" : "#1e40af",
                    border: `1.5px solid ${
                      activeInspectedPiece.type === "flag"
                        ? "#facc15"
                        : activeInspectedPiece.type === "bomb"
                        ? "#64748b"
                        : STRATEGO_RANK_COLORS[activeInspectedPiece.rank]?.border || "#facc15"
                    }`,
                    boxShadow:
                      activeInspectedPiece.type === "flag"
                        ? undefined
                        : STRATEGO_RANK_COLORS[activeInspectedPiece.rank]
                        ? `0 0 10px ${STRATEGO_RANK_COLORS[activeInspectedPiece.rank].glow}`
                        : undefined,
                  }}
                >
                  <span className="text-xl sm:text-2xl drop-shadow">
                    {STRATEGO_PIECE_DEFS[activeInspectedPiece.type].icon}
                  </span>
                </div>

                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  {/* Top Line: Name + Rank Badge + Movement */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap leading-none mb-1">
                    <span className="font-black text-white text-xs sm:text-sm tracking-wide">
                      {getPieceLocalizedName(activeInspectedPiece.type, language)}
                    </span>

                    {activeInspectedPiece.type === "flag" ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                        🚩 {st.flag} ({language === "it" ? "Obiettivo" : language === "es" ? "Objetivo" : language === "fr" ? "Objectif" : language === "de" ? "Ziel" : "Objective"})
                      </span>
                    ) : activeInspectedPiece.type === "bomb" ? (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        💣 {st.bomb} ({language === "it" ? "Mina Letale" : language === "es" ? "Mina Letal" : language === "fr" ? "Mine Létale" : language === "de" ? "Mine" : "Hazard"})
                      </span>
                    ) : (
                      (() => {
                        const rt = STRATEGO_RANK_COLORS[activeInspectedPiece.rank];
                        return (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1"
                            style={{
                              backgroundColor: rt ? rt.main : "#eab308",
                              color: rt ? rt.textColor : "#ffffff",
                              border: `1px solid ${rt ? rt.border : "#facc15"}`,
                              boxShadow: rt ? `0 0 8px ${rt.glow}` : undefined,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                            {`${st.rank} ${activeInspectedPiece.rank} • ${language === "it" ? (rt ? rt.nameIt : "") : (rt ? rt.name : "")}`}
                          </span>
                        );
                      })()
                    )}

                    <span className="text-[10px] text-slate-300 font-bold bg-slate-800/90 px-1.5 py-0.5 rounded border border-white/10">
                      {activeInspectedPiece.type === "scout"
                        ? (language === "it" ? "↔️ Illimitato (Torre)" : language === "es" ? "↔️ Ilimitado (Torre)" : language === "fr" ? "↔️ Illimité (Tour)" : language === "de" ? "↔️ Unbegrenzt (Turm)" : "↔️ Straight Line")
                        : activeInspectedPiece.type === "bomb" || activeInspectedPiece.type === "flag"
                        ? (language === "it" ? "🛑 Immobile" : language === "es" ? "🛑 Inmóvil" : language === "fr" ? "🛑 Immobile" : language === "de" ? "🛑 Unbeweglich" : "🛑 Stationary")
                        : (language === "it" ? "👣 1 casella" : language === "es" ? "👣 1 casilla" : language === "fr" ? "👣 1 case" : language === "de" ? "👣 1 Feld" : "👣 1 square")}
                    </span>

                    {/* Reconnaissance Status Badge: Identità Scoperta vs Segreta */}
                    {activeInspectedPiece.player === myColor ? (
                      activeInspectedPiece.revealedToOpponent ? (
                        <span
                          className="px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-400/80 text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1 shadow-sm"
                          title={
                            language === "it"
                              ? "L'avversario ha scoperto questa pedina in combattimento: la sua identità è nota!"
                              : language === "es"
                              ? "El oponente ha descubierto esta pieza en combate: ¡su identidad es conocida!"
                              : "Opponent has revealed this piece in combat: identity is known!"
                          }
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-amber-300 fill-current shrink-0" aria-hidden="true">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          <span>{language === "it" ? "Scoperta dal nemico" : "Spotted by enemy"}</span>
                        </span>
                      ) : (
                        <span
                          className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1 shadow-sm"
                          title={
                            language === "it"
                              ? "Identità segreta: l'avversario non sa ancora che pedina sia!"
                              : "Covered: opponent does not know this piece yet!"
                          }
                        >
                          <span className="text-xs leading-none">🤫</span>
                          <span>{language === "it" ? "Segreta al nemico" : "Hidden from enemy"}</span>
                        </span>
                      )
                    ) : null}
                  </div>

                  {/* Bottom Line: Full Tactical Ability & Rules */}
                  <p className="text-[11px] sm:text-xs text-amber-200/95 font-medium leading-snug line-clamp-2">
                    {language === "it"
                      ? STRATEGO_PIECE_DEFS[activeInspectedPiece.type].specialAbilityIt
                      : STRATEGO_PIECE_DEFS[activeInspectedPiece.type].specialAbilityEn}
                  </p>
                </div>
              </div>
            </div>
          ) : combatClashInfo ? (
            <div className="w-full h-full grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 px-0.5 animate-in fade-in select-none">
              {/* 1. ATTACCANTE */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 bg-slate-950/80 border border-red-500/50 rounded-xl px-2 py-1 shadow-sm">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 text-base sm:text-lg shadow"
                  style={{
                    backgroundColor: combatClashInfo.attacker.player === "red" ? "#991b1b" : "#1e40af",
                    border: `1.5px solid ${combatClashInfo.attacker.player === "red" ? "#ef4444" : "#60a5fa"}`,
                  }}
                >
                  {STRATEGO_PIECE_DEFS[combatClashInfo.attacker.type]?.icon || "⚔️"}
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] sm:text-[9px] font-black uppercase text-red-400">
                      {combatClashInfo.attacker.player === "red"
                        ? st.you
                        : st.ai}
                    </span>
                    <span className="text-[7px] sm:text-[8px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 font-extrabold uppercase">
                      {st.attack}
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-xs font-black text-white truncate">
                    {getPieceLocalizedName(combatClashInfo.attacker.type, language)}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 truncate">
                    {combatClashInfo.attacker.type === "flag"
                      ? st.flag
                      : combatClashInfo.attacker.type === "bomb"
                      ? st.bomb
                      : `${st.rank} ${combatClashInfo.attacker.rank}`}
                  </span>
                </div>
              </div>

              {/* 2. ESITO CENTRALE SCHEMATICO */}
              <div className="flex flex-col items-center justify-center shrink-0 px-1 text-center">
                <div
                  className={`px-2.5 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm whitespace-nowrap ${
                    combatClashInfo.winner === "attacker"
                      ? combatClashInfo.attacker.player === "red"
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : "bg-rose-500/20 border-rose-400 text-rose-300"
                      : combatClashInfo.winner === "defender"
                      ? combatClashInfo.defender.player === "red"
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : "bg-rose-500/20 border-rose-400 text-rose-300"
                      : "bg-amber-500/20 border-amber-400 text-amber-300"
                  }`}
                >
                  <span>
                    {combatClashInfo.winner === "draw"
                      ? "⚖️"
                      : (combatClashInfo.winner === "attacker" && combatClashInfo.attacker.player === "red") ||
                        (combatClashInfo.winner === "defender" && combatClashInfo.defender.player === "red")
                      ? "🏆"
                      : "💀"}
                  </span>
                  <span>
                    {combatClashInfo.winner === "attacker"
                      ? combatClashInfo.attacker.player === "red"
                        ? st.victory
                        : st.defeat
                      : combatClashInfo.winner === "defender"
                      ? combatClashInfo.defender.player === "red"
                        ? st.defenseWon
                        : st.repelled
                      : st.doubleOut}
                  </span>
                </div>

                {/* Confronto Gradi */}
                <div className="text-[11px] sm:text-xs font-black text-amber-200 mt-0.5 flex items-center gap-1.5 leading-none">
                  <span className="text-white px-1 py-0.5 rounded bg-slate-800 border border-white/20">
                    {combatClashInfo.attacker.type === "flag" ? "🚩" : combatClashInfo.attacker.type === "bomb" ? "💣" : combatClashInfo.attacker.rank}
                  </span>
                  <span className="text-amber-400 font-black text-[9px] sm:text-[10px]">VS</span>
                  <span className="text-white px-1 py-0.5 rounded bg-slate-800 border border-white/20">
                    {combatClashInfo.defender.type === "flag" ? "🚩" : combatClashInfo.defender.type === "bomb" ? "💣" : combatClashInfo.defender.rank}
                  </span>
                </div>
              </div>

              {/* 3. DIFENSORE */}
              <div className="flex items-center justify-end gap-1.5 sm:gap-2 min-w-0 bg-slate-950/80 border border-blue-500/50 rounded-xl px-2 py-1 shadow-sm">
                <div className="flex flex-col min-w-0 text-right leading-tight">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-[7px] sm:text-[8px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-extrabold uppercase">
                      {st.defense}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-black uppercase text-blue-400">
                      {combatClashInfo.defender.player === "red"
                        ? st.you
                        : st.ai}
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-xs font-black text-white truncate">
                    {getPieceLocalizedName(combatClashInfo.defender.type, language)}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 truncate">
                    {combatClashInfo.defender.type === "flag"
                      ? st.flag
                      : combatClashInfo.defender.type === "bomb"
                      ? st.bomb
                      : `${st.rank} ${combatClashInfo.defender.rank}`}
                  </span>
                </div>
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 text-base sm:text-lg shadow"
                  style={{
                    backgroundColor: combatClashInfo.defender.player === "red" ? "#991b1b" : "#1e40af",
                    border: `1.5px solid ${combatClashInfo.defender.player === "red" ? "#ef4444" : "#60a5fa"}`,
                  }}
                >
                  {STRATEGO_PIECE_DEFS[combatClashInfo.defender.type]?.icon || "🛡️"}
                </div>
              </div>
            </div>
          ) : combatClashSummary ? (
            <div className="flex items-center justify-between w-full h-full gap-2">
              <div className="flex items-center gap-2 text-amber-300 min-w-0 flex-1">
                <span className="text-xl">⚔️</span>
                <span className="text-[11px] sm:text-xs font-bold leading-snug line-clamp-2">
                  {combatClashSummary}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full h-full gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <span className="text-xl">🚩</span>
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="text-xs sm:text-sm font-black text-amber-400 tracking-wide">
                    {language === "it"
                      ? "Stratego 3D • Schieramento Tattico"
                      : language === "es"
                      ? "Stratego 3D • Despliegue Táctico"
                      : language === "fr"
                      ? "Stratego 3D • Déploiement Tactique"
                      : language === "de"
                      ? "Stratego 3D • Taktische Aufstellung"
                      : "Stratego 3D • Tactical Deployment"}
                  </span>
                  <span className="text-[11px] text-slate-300 font-medium leading-snug truncate">
                    {language === "it"
                      ? "Tocca o passa il mouse su qualsiasi pedina per visualizzare grado, movimento e poteri speciali."
                      : language === "es"
                      ? "Toca o pasa el cursor sobre cualquier pieza para ver rango, movimiento y habilidades especiales."
                      : language === "fr"
                      ? "Touchez ou survolez n'importe quelle pièce pour inspecter rang, mouvement et capacités."
                      : language === "de"
                      ? "Tippen oder zeigen Sie auf eine Figur, um Rang, Bewegung und Fähigkeiten zu sehen."
                      : "Tap or hover any piece to inspect rank, movement, and abilities."}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Board Arena with Pinch-to-Zoom & Tilt Gesture Support (EXCLUSIVELY FOR BOARD) */}
        <div
          className="w-full flex-1 flex items-center justify-center relative min-h-0 py-0.5 overflow-hidden touch-none"
          onTouchStart={handleBoardTouchStart}
          onTouchMove={handleBoardTouchMove}
          onTouchEnd={handleBoardTouchEnd}
          onWheel={handleBoardWheel}
        >
          {/* 3D Perspective Board Container (Hardware Accelerated & Mobile Optimized) */}
          <div
            className="relative flex items-center justify-center w-full h-full max-w-lg aspect-square p-1 sm:p-2"
            style={{
              perspective: "1100px",
              WebkitPerspective: "1100px",
            }}
          >
            <div
              className={`w-full h-full aspect-square relative p-2 sm:p-3 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center select-none ${
                isDarkTheme
                  ? "bg-gradient-to-b from-slate-900 via-zinc-900 to-black border-2 sm:border-4 border-slate-700/60 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_20px_rgba(71,85,105,0.2)]"
                  : "bg-gradient-to-b from-stone-800 via-stone-900 to-black border-2 sm:border-4 border-amber-900/60 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_20px_rgba(180,83,9,0.2)]"
              }`}
              style={{
                transform: `translate3d(${panX.toFixed(1)}%, ${panY.toFixed(1)}%, 0px) rotateX(${tiltAngle}deg) scale(${effectiveZoom.toFixed(3)})`,
                transformOrigin: "50% 50%",
                WebkitTransformOrigin: "50% 50%",
                transition: isPinching ? "none" : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transformStyle: "preserve-3d",
                WebkitTransformStyle: "preserve-3d",
                willChange: isPinching ? "transform" : "auto",
              }}
            >
            {/* Wooden / Brass / Steel Grid Frame Edge */}
            <div
              className={`absolute inset-1.5 sm:inset-2 rounded-2xl border pointer-events-none ${
                isDarkTheme ? "border-slate-500/25" : "border-amber-600/30"
              }`}
            />

            {/* 10x10 Grid (High-Resolution 2X Grid Buffer) */}
            <div
              className={`grid grid-cols-10 grid-rows-10 w-full h-full gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-xl border relative shadow-inner ${
                isDarkTheme ? "bg-slate-950/90 border-slate-800" : "bg-stone-950/80 border-stone-800"
              }`}
            >
              {/* Natural Irregular Lakes Layer (Spans over 2x2 lake areas with organic shorelines) */}
              <div className="absolute inset-1.5 sm:inset-2 pointer-events-none z-10">
                {/* West Lake (Display Cols 2-3, Rows 4-5) */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: "19.5%",
                    top: "39.5%",
                    width: "21%",
                    height: "21%",
                  }}
                >
                  <StrategoOrganicLake lakeId="west" language={language} isDarkTheme={isDarkTheme} />
                </div>

                {/* East Lake (Display Cols 6-7, Rows 4-5) */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: "59.5%",
                    top: "39.5%",
                    width: "21%",
                    height: "21%",
                  }}
                >
                  <StrategoOrganicLake lakeId="east" language={language} isDarkTheme={isDarkTheme} />
                </div>
              </div>

              {displayRows.map((r) =>
                displayCols.map((c) => {
                  const piece = board[r][c];
                  const isLake = isStrategoLake(r, c);
                  const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                  const isSwapTarget = phase === "setup" && swapTargetPos?.r === r && swapTargetPos?.c === c;
                  const isValidMove = selectedPos !== null && !animatingMove && !activeDuel && phase === "playing" && validMoves.some((m) => m.r === r && m.c === c);
                  const isHovered = hoveredPos?.r === r && hoveredPos?.c === c;
                  const isMoveOrigin = animatingMove && animatingMove.fromR === r && animatingMove.fromC === c;
                  const isMoveTarget = animatingMove && animatingMove.toR === r && animatingMove.toC === c;
                  const isCombatSquare = combatFocusPos?.r === r && combatFocusPos?.c === c;
                  const isDuelTarget = activeDuel && activeDuel.targetPos.r === r && activeDuel.targetPos.c === c;
                  const isDuelOrigin = activeDuel && activeDuel.fromPos.r === r && activeDuel.fromPos.c === c;
                  const isLastMoveOrigin = phase === "playing" && lastExecutedMove?.fromR === r && lastExecutedMove?.fromC === c;
                  const isLastMoveTarget = phase === "playing" && lastExecutedMove?.toR === r && lastExecutedMove?.toC === c;
                  const isLastMoveSquare = isLastMoveOrigin || isLastMoveTarget;

                  // Lake cell rendering: Seamless basin slot underneath organic irregular lake illustration
                  if (isLake) {
                    return (
                      <div
                        key={`lake_${r}_${c}`}
                        className="relative rounded-lg sm:rounded-xl overflow-hidden cursor-not-allowed select-none bg-slate-950/20"
                        title={
                          language === "it"
                            ? "Lago Naturale Invalicabile (Ostacolo acquatico non oltrepassabile)"
                            : "Natural Impassable Lake (Impassable water obstacle)"
                        }
                      />
                    );
                  }

                  const isPlayerTerritory = myColor === "red" ? (r >= 6 && r <= 9) : (r >= 0 && r <= 3);

                  // Normal playable board square
                  return (
                    <div
                      key={`sq_${r}_${c}`}
                      onClick={() => handleCellClick(r, c)}
                      onMouseEnter={() => {
                        if (isTouchDevice) return;
                        setHoveredPiece(piece);
                        setHoveredPos({ r, c });
                        if (piece && (piece.player === myColor || piece.revealedToOpponent || revealEnemyAdmin)) {
                          setInspectedPiece(piece);
                        }
                      }}
                      onMouseLeave={() => {
                        if (isTouchDevice) return;
                        setHoveredPiece(null);
                        setHoveredPos(null);
                      }}
                      style={{
                        zIndex: isDuelTarget ? 70 : isMoveOrigin ? 60 : isSelected || isSwapTarget ? 40 : isHovered ? 30 : isCombatSquare ? 35 : 10 + r,
                      }}
                      className={`relative rounded-lg sm:rounded-xl flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                        (r + c) % 2 === 0
                          ? isDarkTheme ? "bg-slate-800/80" : "bg-stone-800/80"
                          : isDarkTheme ? "bg-slate-900/90" : "bg-stone-900/90"
                      } ${
                        isLastMoveSquare && !isSelected && !isSwapTarget && !isValidMove
                          ? isDarkTheme
                            ? "bg-amber-400/25 border border-amber-400/60 shadow-[inset_0_0_14px_rgba(251,191,36,0.35)] brightness-110"
                            : "bg-amber-300/35 border border-amber-500/60 shadow-[inset_0_0_14px_rgba(245,158,11,0.4)] brightness-115"
                          : ""
                      } ${
                        isSelected
                          ? "ring-2 ring-amber-400 bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.7)]"
                          : ""
                      } ${
                        isSwapTarget
                          ? "ring-2 ring-cyan-400 bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse"
                          : ""
                      } ${
                        isValidMove
                          ? "ring-2 ring-emerald-400 bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                          : ""
                      } ${
                        phase === "setup" && isPlayerTerritory && selectedPos && !isSelected && !isSwapTarget
                          ? "ring-1 ring-amber-400/50 bg-amber-500/10 hover:ring-2 hover:ring-amber-300 hover:bg-amber-500/25"
                          : ""
                      } ${
                        phase === "setup" && isPlayerTerritory
                          ? "border border-amber-500/30"
                          : ""
                      } ${
                        isHovered && piece
                          ? "ring-1 ring-amber-300/80 brightness-110"
                          : "hover:brightness-105"
                      } ${
                        isCombatSquare && !animatingMove && !isDuelTarget
                          ? "ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.7)]"
                          : ""
                      }`}
                    >
                      {/* Selection order badge during setup */}
                      {phase === "setup" && isSelected && (
                        <div className="absolute top-1 left-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center shadow-md z-30 pointer-events-none">
                          1
                        </div>
                      )}
                      {phase === "setup" && isSwapTarget && (
                        <div className="absolute top-1 left-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-400 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center shadow-md z-30 pointer-events-none animate-pulse">
                          2
                        </div>
                      )}

                      {/* Ultima mossa eseguita: alone/colore più acceso sia su casella di partenza che su casella di arrivo (solo per 1 mossa) */}
                      {isLastMoveSquare && !isMoveOrigin && !isMoveTarget && !animatingMove && !activeDuel && (
                        <div className="absolute inset-0.5 rounded-md sm:rounded-lg pointer-events-none bg-gradient-to-br from-amber-400/20 via-amber-300/15 to-amber-500/25 border border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.35)] z-10 transition-all duration-300 animate-pulse" />
                      )}

                      {/* Origin footprint during piece movement */}
                      {isMoveOrigin && (
                        <div className="absolute inset-1 rounded-md sm:rounded-lg border-2 border-dashed border-amber-400/70 bg-amber-500/15 pointer-events-none animate-pulse" />
                      )}

                      {/* Duel origin footprint while sword duel is in progress */}
                      {isDuelOrigin && (
                        <div className="absolute inset-1 rounded-md sm:rounded-lg border-2 border-dashed border-amber-400/60 bg-amber-500/10 pointer-events-none animate-pulse" />
                      )}

                      {/* Destination target indicator during piece movement */}
                      {isMoveTarget && (
                        <div className="absolute inset-1 rounded-md sm:rounded-lg border-2 border-amber-400 bg-amber-500/25 pointer-events-none animate-ping" />
                      )}

                      {/* Valid Move Indicator (Glowing Ring / Dot) */}
                      {isValidMove && !piece && (
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)] opacity-95" />
                      )}

                      {/* Target indicator during setup */}
                      {phase === "setup" && isPlayerTerritory && selectedPos && !isSelected && !isSwapTarget && (
                        <div className="absolute inset-0 rounded-md sm:rounded-lg border border-amber-400/30 bg-amber-400/5 pointer-events-none flex items-center justify-center z-20">
                          <span className="text-xs sm:text-sm text-amber-300/70 font-black">↔️</span>
                        </div>
                      )}
                      {phase === "setup" && isSwapTarget && (
                        <div className="absolute inset-0 rounded-md sm:rounded-lg border-2 border-cyan-400 bg-cyan-400/15 pointer-events-none flex items-center justify-center z-20 animate-pulse">
                          <span className="text-sm sm:text-base text-cyan-300 font-black drop-shadow">🔄</span>
                        </div>
                      )}

                      {/* 2-SECOND PROCEDURAL SWORD DUEL ARENA WITH CLASHING BLADES & DEATH ANIMATION */}
                      {isDuelTarget && activeDuel && (
                        <SwordDuelArena
                          attacker={activeDuel.attacker}
                          defender={activeDuel.defender}
                          battleResult={activeDuel.battleResult}
                          fromPos={activeDuel.fromPos}
                          targetPos={activeDuel.targetPos}
                          tiltAngle={tiltAngle}
                          isBoardFlipped={isBoardFlipped}
                          language={language}
                          onComplete={() => handleDuelComplete(activeDuel)}
                        />
                      )}

                      {/* MOVING PIECE GLIDING IN REALISTIC SLOW 3D TRANSIT */}
                      {isMoveOrigin && (
                        <div
                          className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                          style={{
                            transform: animatingMove.started
                              ? `translate3d(${((isBoardFlipped ? -(animatingMove.toC - animatingMove.fromC) : (animatingMove.toC - animatingMove.fromC)) * 100)}%, ${((isBoardFlipped ? -(animatingMove.toR - animatingMove.fromR) : (animatingMove.toR - animatingMove.fromR)) * 100)}%, 28px) scale(${animatingMove.isAttack ? 1.25 : 1.15})`
                              : "translate3d(0%, 0%, 0px) scale(1)",
                            transition: "transform 850ms cubic-bezier(0.35, 0.05, 0.25, 1)",
                            filter: animatingMove.started
                              ? "drop-shadow(0 20px 14px rgba(0,0,0,0.85))"
                              : undefined,
                          }}
                        >
                          <Stratego3DFigure
                            type={animatingMove.piece.type}
                            player={animatingMove.piece.player}
                            rank={animatingMove.piece.rank}
                            isRevealed={animatingMove.piece.revealedToOpponent}
                            isAdminReveal={revealEnemyAdmin}
                            tiltAngle={tiltAngle}
                            isSelected={true}
                            isHovered={false}
                            isLocalPlayerPiece={animatingMove.piece.player === myColor}
                          />
                        </div>
                      )}

                      {/* Normal stationary 3D Figure on board */}
                      {piece && !isMoveOrigin && !isDuelTarget && !isDuelOrigin && (
                        <Stratego3DFigure
                          type={piece.type}
                          player={piece.player}
                          rank={piece.rank}
                          isRevealed={piece.revealedToOpponent}
                          isAdminReveal={revealEnemyAdmin}
                          tiltAngle={tiltAngle}
                          isSelected={isSelected}
                          isHovered={isHovered}
                          isLocalPlayerPiece={piece.player === myColor}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3D Perspective Controls Bar (Fixed Footer - NEVER ZOOMED OR PUSHED) */}
      <div className="w-full max-w-xl flex items-center justify-between px-2.5 sm:px-3 py-1.5 mt-0.5 rounded-xl bg-slate-900 border border-white/10 text-xs shrink-0 shadow-xl z-20 gap-2">
        {/* Tilt angle quick selector */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-amber-400/90 flex items-center gap-1">
            <span>📐</span>
            <span className="hidden xs:inline">
              {language === "it" ? "Inclinazione:" : language === "es" ? "Inclinación:" : language === "fr" ? "Inclinaison :" : language === "de" ? "Neigung:" : "Tilt:"}
            </span>
          </span>
          <button
            onClick={() => handleSetTiltAngle(12)}
            className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
              tiltAngle <= 18
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title={language === "it" ? "Vista piana quasi 2D (12°)" : language === "es" ? "Vista plana casi 2D (12°)" : language === "fr" ? "Vue plane quasi 2D (12°)" : language === "de" ? "Fast ebene 2D-Ansicht (12°)" : "Top-down view (12°)"}
          >
            12° {language === "it" ? "Piana" : language === "es" ? "Plana" : language === "fr" ? "Plane" : language === "de" ? "Flach" : "Flat"}
          </button>
          <button
            onClick={() => handleSetTiltAngle(34)}
            className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
              tiltAngle > 18 && tiltAngle < 45
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title={language === "it" ? "Prospettiva bilanciata predefinita (34°)" : language === "es" ? "Perspectiva equilibrada predeterminada (34°)" : language === "fr" ? "Perspective équilibrée par défaut (34°)" : language === "de" ? "Ausgewogene Standardperspektive (34°)" : "Default balanced 3D view (34°)"}
          >
            34° {language === "it" ? "Media" : language === "es" ? "Media" : language === "fr" ? "Moyenne" : language === "de" ? "Mittel" : "Mid"} ⭐
          </button>
          <button
            onClick={() => handleSetTiltAngle(52)}
            className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
              tiltAngle >= 45
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title={language === "it" ? "Massima inclinazione 3D con pedine slanciate e alte (52°)" : language === "es" ? "Máxima inclinación 3D con piezas estilizadas (52°)" : language === "fr" ? "Inclinaison 3D maximale (52°)" : language === "de" ? "Maximale 3D-Neigung (52°)" : "Max 3D tilt with tall pieces (52°)"}
          >
            52° {language === "it" ? "Max 3D" : language === "es" ? "Máx 3D" : "Max 3D"}
          </button>
        </div>

        {/* Legend Indicator for Discovered Pieces */}
        <div
          className="hidden xs:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/10 border border-white/20 text-[10px] text-white font-bold"
          title={
            language === "it"
              ? "Le tue pedine scoperte hanno il riquadro bianco con testo colorato (colori invertiti) per indicare che la loro identità è nota all'avversario"
              : language === "es"
              ? "Tus piezas descubiertas tienen la placa blanca con texto coloreado (colores invertidos) para indicar que su rango es conocido por el rival"
              : language === "fr"
              ? "Vos pièces découvertes ont une plaque blanche avec texte coloré pour indiquer que leur identité est connue de l'adversaire"
              : language === "de"
              ? "Ihre aufgedeckten Figuren haben ein weißes Schild mit farbigem Text, um anzuzeigen, dass ihre Identität dem Gegner bekannt ist"
              : "Discovered pieces feature an inverted white plaque with colored text to indicate their rank is known to the opponent"
          }
        >
          <span className="w-2.5 h-2.5 rounded bg-white text-slate-900 flex items-center justify-center font-black text-[8px] leading-none">1</span>
          <span className="hidden sm:inline">
            {language === "it"
              ? "Pedine scoperte (base invertita)"
              : language === "es"
              ? "Piezas descubiertas (base invertida)"
              : language === "fr"
              ? "Pièces découvertes (base inversée)"
              : language === "de"
              ? "Aufgedeckte Figuren"
              : "Discovered pieces (inverted)"}
          </span>
        </div>

        {/* Zoom reset or info */}
        <div className="flex items-center gap-1.5">
          {isZoomed ? (
            <button
              onClick={() => {
                setSelectedPos(null);
                setValidMoves([]);
                setCombatFocusPos(null);
              }}
              className="px-2 py-0.5 sm:py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-300 text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
              title={language === "it" ? "Ripristina visuale completa scacchiera" : "Reset zoom to full board"}
            >
              <span>🔍</span>
              <span>{language === "it" ? "Reset Zoom" : "Reset Zoom"}</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {language === "it" ? "Rotellina per inclinare" : "Wheel to tilt"}
            </span>
          )}
        </div>
      </div>

      {/* PRE-GAME SETTINGS MODAL (Difficoltà, chi muove per primo, tipo di schieramento) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 rounded-[2.5rem] p-5 sm:p-6 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto border border-white/10 custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚙️</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black italic text-blue-400 uppercase tracking-tight">
                    {language === "it" ? "Impostazioni Partita" : "Match Settings"}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-bold">
                    {language === "it"
                      ? "Configura la partita prima di iniziare"
                      : "Configure match before playing"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Section 1: Livello di Difficoltà (3 Livelli) */}
            <div className="mt-4">
              <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest mb-1.5 block">
                1. {language === "it" ? "Livello di Difficoltà IA" : "AI Difficulty Level"}
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  {
                    id: "easy" as StrategoDifficulty,
                    it: "Facile",
                    subIt: "Tattico",
                    en: "Easy",
                    subEn: "Tactical",
                    icon: "🟢",
                    color: "bg-emerald-600 text-white shadow-lg ring-1 ring-white/40",
                  },
                  {
                    id: "medium" as StrategoDifficulty,
                    it: "Normale",
                    subIt: "Avanzato",
                    en: "Normal",
                    subEn: "Advanced",
                    icon: "⚡",
                    color: "bg-blue-600 text-white shadow-lg ring-1 ring-white/40",
                  },
                  {
                    id: "hard" as StrategoDifficulty,
                    it: "Difficile",
                    subIt: "Maestro",
                    en: "Hard",
                    subEn: "Master",
                    icon: "🎖️",
                    color: "bg-amber-600 text-white shadow-lg ring-1 ring-white/40",
                  },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`py-2 px-1.5 rounded-xl font-bold transition-all text-xs flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                      difficulty === d.id
                        ? d.color
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-xl">{d.icon}</span>
                    <span className="font-bold text-[11px] sm:text-xs leading-tight">
                      {language === "it" ? d.it : d.en}
                    </span>
                    <span className="text-[9px] opacity-75 leading-tight">
                      {language === "it" ? d.subIt : d.subEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Chi muove per primo */}
            <div className="mt-4">
              <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest mb-1.5 block">
                2. {language === "it" ? "Chi Muove per Primo?" : "Who Moves First?"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStartingPlayer("red")}
                  className={`p-3 rounded-xl font-bold transition-all flex items-center gap-3 active:scale-95 ${
                    startingPlayer === "red"
                      ? "bg-red-600 text-white shadow-lg ring-1 ring-white/40"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span className="text-2xl">🔴</span>
                  <div className="text-left">
                    <span className="font-bold text-xs block">
                      {language === "it" ? "Tu (Rosso)" : "You (Red)"}
                    </span>
                    <span className="text-[10px] opacity-75 block font-normal">
                      {language === "it" ? "Fai la prima mossa" : "Make the opening move"}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setStartingPlayer("blue")}
                  className={`p-3 rounded-xl font-bold transition-all flex items-center gap-3 active:scale-95 ${
                    startingPlayer === "blue"
                      ? "bg-blue-600 text-white shadow-lg ring-1 ring-white/40"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span className="text-2xl">🔵</span>
                  <div className="text-left">
                    <span className="font-bold text-xs block">
                      {language === "it" ? "IA (Blu)" : "AI (Blue)"}
                    </span>
                    <span className="text-[10px] opacity-75 block font-normal">
                      {language === "it" ? "Il computer muove per primo" : "Computer opens match"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 3: Tipo di Schieramento Iniziale */}
            <div className="mt-4">
              <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest mb-1.5 block">
                3. {language === "it" ? "Schieramento Iniziale (Esercito)" : "Initial Army Deployment Preset"}
              </label>
              <div className="space-y-2">
                {Object.keys(PRESETS).map((key) => {
                  const p = PRESETS[key];
                  const isSelected = selectedPreset === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedPreset(key)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start gap-3 active:scale-95 ${
                        isSelected
                          ? "bg-blue-600 border-blue-400 text-white shadow-lg ring-1 ring-white/40"
                          : "bg-slate-800 border-transparent text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <span className="text-2xl p-1 rounded-lg bg-black/30 shrink-0">
                        {p.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">
                            {language === "it" ? p.nameIt : p.nameEn}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                              ✓ {language === "it" ? "Selezionato" : "Selected"}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] mt-0.5 leading-snug ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                          {language === "it" ? p.descIt : p.descEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch Game Button */}
            <button
              onClick={() => handleStartMatchFromSettings(selectedPreset, difficulty, startingPlayer)}
              className="mt-6 w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-base uppercase tracking-wider shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>⚔️</span>
              <span>{language === "it" ? "INIZIA BATTAGLIA" : "START BATTLE"}</span>
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODALE: SELEZIONE SCHEMA DI POSIZIONAMENTO PEDINE */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 z-[2010] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-[0_0_50px_rgba(99,102,241,0.35)] relative max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/40">📐</span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    {language === "it" ? "Schema di Posizionamento" : "Deployment Schema"}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-indigo-300 font-medium">
                    {language === "it" ? "Seleziona lo schema tattico per le tue 40 pedine:" : "Choose the tactical setup for your 40 pieces:"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPresetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition-colors border border-white/10 active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* List of Schemas */}
            <div className="overflow-y-auto space-y-2 py-3 pr-1 max-h-[60vh] no-scrollbar">
              {Object.keys(PRESETS).map((key) => {
                const p = PRESETS[key];
                const isSelected = selectedPreset === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectPreset(key)}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-start gap-3 active:scale-95 group ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-400/60"
                        : "bg-slate-800/80 hover:bg-slate-800 border-white/10 text-slate-300 hover:border-indigo-400/40"
                    }`}
                  >
                    <span className="text-2xl p-1.5 rounded-xl bg-black/40 shrink-0 group-hover:scale-110 transition-transform">
                      {p.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-xs sm:text-sm text-white truncate">
                          {language === "it" ? p.nameIt : p.nameEn}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/40 shrink-0">
                            ✓ {language === "it" ? "In uso" : "Active"}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-1 leading-snug ${isSelected ? "text-indigo-100 font-medium" : "text-slate-400"}`}>
                        {language === "it" ? p.descIt : p.descEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsPresetModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors border border-white/10 active:scale-95"
              >
                {language === "it" ? "Chiudi" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Game Over Modal with Victory Celebration */}
      {winner && (() => {
        const isVictory = winner === myColor;
        return (
          <>
            {/* REAL FIREWORKS CELEBRATION ON VICTORY */}
            {isVictory && <Fireworks />}

            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[2005] flex items-center justify-center p-3 sm:p-4 animate-in zoom-in-95">
              <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-black border-2 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center text-center relative overflow-hidden">
                {/* Victory Radiant Top Strip */}
                {isVictory && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 animate-pulse" />
                )}

                <span className="text-5xl sm:text-6xl mb-2 filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.6)] animate-bounce">
                  {isVictory ? "🏆" : "💀"}
                </span>

                <h2
                  className={`text-2xl sm:text-3xl font-black uppercase tracking-widest mb-1 ${
                    isVictory
                      ? "bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                      : "text-rose-400"
                  }`}
                >
                  {isVictory
                    ? st.triumphantVictory
                    : st.defeatTitle}
                </h2>

                <p className="text-xs text-slate-300 mb-3 px-2">{winReason}</p>

                {/* EVIDENZIA PUNTI GUADAGNATI */}
                {earnedPoints !== null && (
                  <div
                    className={`w-full mb-3.5 p-3 sm:p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg relative overflow-hidden transition-all ${
                      isVictory
                        ? "bg-gradient-to-br from-amber-500/25 via-yellow-500/20 to-emerald-500/20 border-amber-400/90 shadow-[0_0_25px_rgba(245,158,11,0.55)]"
                        : "bg-rose-500/15 border-rose-400/50 text-rose-300"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1.5 ${
                        isVictory ? "text-amber-300" : "text-rose-300"
                      }`}
                    >
                      <span>{isVictory ? "⭐" : "📉"}</span>
                      <span>
                        {isVictory
                          ? st.pointsEarned
                          : st.matchScore}
                      </span>
                      <span>{isVictory ? "⭐" : "📉"}</span>
                    </span>

                    <div
                      className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-1.5 drop-shadow ${
                        isVictory ? "text-amber-300" : "text-rose-300"
                      }`}
                    >
                      <span>{earnedPoints > 0 ? `+${earnedPoints.toFixed(1)}` : earnedPoints.toFixed(1)}</span>
                      <span className="text-xs uppercase font-bold text-slate-300">
                        {st.points}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-semibold mt-1">
                      {onlineMatchSession
                        ? st.online1v1
                        : `${st.level}: ${
                            difficulty === "hard"
                              ? (language === "it" ? "Difficile (+35 pt)" : language === "es" ? "Difícil (+35 pt)" : language === "fr" ? "Difficile (+35 pt)" : language === "de" ? "Schwer (+35 Pkt)" : "Hard (+35 pts)")
                              : difficulty === "medium"
                              ? (language === "it" ? "Normale (+20 pt)" : language === "es" ? "Normal (+20 pt)" : language === "fr" ? "Normal (+20 pt)" : language === "de" ? "Normal (+20 Pkt)" : "Normal (+20 pts)")
                              : (language === "it" ? "Facile (+12 pt)" : language === "es" ? "Fácil (+12 pt)" : language === "fr" ? "Facile (+12 pt)" : language === "de" ? "Leicht (+12 Pkt)" : "Easy (+12 pts)")
                          }`}
                    </span>
                  </div>
                )}

                {/* STATISTICHE DELLA PARTITA: NUMERO DI MOSSE E TEMPO IMPIEGATO */}
                <div className="grid grid-cols-2 gap-2.5 w-full mb-4">
                  {/* Numero di Mosse */}
                  <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-800/85 border border-amber-400/30 shadow-md">
                    <div className="flex items-center gap-1 text-slate-400 text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-0.5">
                      <span>♟️</span>
                      <span>{st.moves}</span>
                    </div>
                    <span className="text-lg sm:text-xl font-black text-amber-300 tracking-tight">
                      {moveCount}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {st.movesPlayed}
                    </span>
                  </div>

                  {/* Tempo Impiegato */}
                  <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-800/85 border border-cyan-400/30 shadow-md">
                    <div className="flex items-center gap-1 text-slate-400 text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-0.5">
                      <span>⏱️</span>
                      <span>{st.time}</span>
                    </div>
                    <span className="text-lg sm:text-xl font-black text-cyan-300 tracking-tight font-mono">
                      {formatTime(finalGameSeconds || gameSecondsRef.current)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {st.timeTaken}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      if (onBackToSetup) onBackToSetup();
                      else {
                        setIsSettingsModalOpen(true);
                        setWinner(null);
                      }
                    }}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg"
                  >
                    {st.newMatch}
                  </button>
                  <button
                    onClick={onBackToMenu}
                    className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all border border-white/10"
                  >
                    {st.exit}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Complete Official Rules Modal */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 rounded-[2.5rem] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] border border-white/10">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h3 className="text-lg sm:text-xl font-black italic text-blue-400 uppercase tracking-tight">
                  {language === "it"
                    ? "Regolamento Stratego"
                    : language === "es"
                    ? "Reglamento de Stratego"
                    : language === "fr"
                    ? "Règlement Stratego"
                    : language === "de"
                    ? "Stratego-Regeln"
                    : "Stratego Rules"}
                </h3>
              </div>
              <button
                onClick={() => setIsRulesOpen(false)}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Direct Link to Codex Pedine e Gradi */}
            <div className="pt-2.5 pb-1 shrink-0">
              <button
                onClick={() => {
                  setIsRulesOpen(false);
                  setIsPieceCodexOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 flex items-center justify-between text-xs font-black text-amber-300 shadow-md active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📖</span>
                  <span>
                    {language === "it"
                      ? "Codex Pedine e Gradi (Schede Dettagliate)"
                      : language === "es"
                      ? "Códice de Piezas y Rangos (Guía Detallada)"
                      : language === "fr"
                      ? "Codex des Pièces et Grades (Guide Détaillé)"
                      : language === "de"
                      ? "Figuren- und Rang-Kodex (Detaillierter Leitfaden)"
                      : "Piece & Rank Codex (Detailed Guide)"}
                  </span>
                </div>
                <span className="text-amber-400 font-bold">➜</span>
              </button>
            </div>

            {/* Rules Navigation Tabs */}
            <div className="flex items-center gap-1.5 py-3 border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: "overview", it: "Obiettivo & Laghi", es: "Objetivo y Lagos", fr: "Objectif & Lacs", de: "Ziel & Seen", en: "Overview & Lakes" },
                  { id: "pieces", it: "Gradi & Esercito", es: "Rangos y Ejército", fr: "Grades & Armée", de: "Ränge & Armee", en: "Ranks & Army" },
                  { id: "special", it: "Unità Speciali", es: "Unidades Especiales", fr: "Unités Spéciales", de: "Spezialeinheiten", en: "Special Units" },
                  { id: "tactics", it: "Bluff & Tattica", es: "Farol y Táctica", fr: "Bluff & Tactique", de: "Bluff & Taktik", en: "Tactics & Bluff" },
                  { id: "history", it: "Storia & Trivia", es: "Historia y Trivia", fr: "Histoire & Trivia", de: "Geschichte & Trivia", en: "History & Trivia" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRulesTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 ${
                    rulesTab === tab.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {(tab as any)[language] || tab.en}
                </button>
              ))}
            </div>

            {/* Rules Tab Content */}
            <div className="flex-1 overflow-y-auto py-3 text-xs leading-relaxed text-slate-300 space-y-3 pr-1 custom-scrollbar">
              {rulesTab === "overview" && (
                <>
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/5">
                    <h4 className="font-black text-amber-400 uppercase mb-1">
                      {language === "it" ? "1. L'Obiettivo Supremo" : "1. Supreme Objective"}
                    </h4>
                    <p>
                      {language === "it"
                        ? "Stratego è una leggendaria sfida di strategia a informazione nascosta per 2 giocatori. L'obiettivo primario è catturare la BANDIERA (Flag) dell'avversario. Si vince inoltre se l'avversario rimane senza pezzi capaci di muoversi."
                        : "Stratego is a legendary game of military tactics and hidden information. The primary objective is to capture the opponent's FLAG. You also win if the opponent has no movable pieces left."}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
                    <h4 className="font-black text-cyan-300 uppercase mb-1">
                      {language === "it" ? "2. La Scacchiera 10x10 e i 2 Laghi Invalicabili" : "2. The 10x10 Board & 2 Lakes"}
                    </h4>
                    <p>
                      {language === "it"
                        ? "La scacchiera misura 10 caselle per 10 (100 caselle in totale). Al centro si trovano due grandi specchi d'acqua di 2x2 caselle ciascuno (i Laghi). Nessuna pedina può MAI entrare nei laghi né saltarli. I laghi creano 3 corridoi naturali di strozzatura per la battaglia (ala sinistra, corridoio centrale, ala destra)."
                        : "The board consists of a 10x10 grid. In the middle row lie two 2x2 lake zones. No piece can EVER enter or jump over a lake square. These create 3 vital bottlenecks (left flank, center passage, right flank)."}
                    </p>
                  </div>
                </>
              )}

              {rulesTab === "pieces" && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-400 mb-1">
                    {language === "it"
                      ? "Ciascun esercito comprende 40 pezzi. Nello scontro tra due pezzi normali, il grado più ALTO sconfigge quello più BASSO:"
                      : "Each army contains 40 pieces. In normal combat, higher rank eliminates lower rank:"}
                  </p>
                  {(Object.keys(STRATEGO_PIECE_DEFS) as StrategoPieceType[]).map((type) => {
                    const def = STRATEGO_PIECE_DEFS[type];
                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{def.icon}</span>
                          <div>
                            <span className="font-black text-white">
                              {language === "it" ? def.nameIt : def.nameEn}
                            </span>
                            <span className="ml-2 text-[10px] text-amber-400 font-bold">
                              {def.rank > 0 ? `Grado ${def.rank}` : def.rank === 0 ? "Bomba" : "Bandiera"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {def.count}x {language === "it" ? "pezzi" : "pcs"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {rulesTab === "special" && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30">
                    <h5 className="font-black text-red-300">💣 BOMBA & ⛏️ GENIERE (MINER)</h5>
                    <p className="mt-1">
                      {language === "it"
                        ? "Le Bombe sono immobili e distruggono qualsiasi pezzo le attacchi! L'unica eccezione è il GENIERE (Grado 3): quando un Geniere attacca una Bomba, la disinnesca e la cattura senza esplodere!"
                        : "Bombs are stationary and blow up any attacker! The only exception is the MINER (Rank 3): when a Miner attacks a Bomb, it disarms and captures it safely!"}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30">
                    <h5 className="font-black text-purple-300">🕵️ SPIA (SPY) vs 🌟 MARESCIALLO (MARSHAL)</h5>
                    <p className="mt-1">
                      {language === "it"
                        ? "La Spia è il pezzo di grado più basso (Grado 1), ma possiede una letale abilità: se la Spia attacca il Maresciallo nemico (Grado 10), il Maresciallo viene sconfitto! Tuttavia, se è il Maresciallo ad attaccare la Spia, la Spia muore."
                        : "The Spy is rank 1, but if it initiates an attack on the enemy Marshal (10), the Marshal is eliminated! If the Marshal attacks the Spy, the Spy dies."}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/30">
                    <h5 className="font-black text-teal-300">🔭 ESPLORATORE (SCOUT - GRADO 2)</h5>
                    <p className="mt-1">
                      {language === "it"
                        ? "Tutti i pezzi si muovono di 1 casella alla volta (in orizzontale o verticale). L'ESPLORATORE può invece muoversi di quante caselle vuote desidera in linea retta ortogonale, come la Torre negli scacchi!"
                        : "Most pieces move 1 square orthogonally. The SCOUT can move any number of open squares in a straight line, like the Rook in chess!"}
                    </p>
                  </div>
                </div>
              )}

              {rulesTab === "tactics" && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                    <h4 className="font-black text-amber-300 uppercase">
                      {language === "it" ? "La Strategia del Bluff e della Difesa" : "Bluffing and Defense Strategy"}
                    </h4>
                    <p>
                      {language === "it"
                        ? "Poiché l'avversario non vede il grado dei tuoi pezzi finché non avvengono scontri, puoi ingannarlo fingendo che una pedina debole sia il Maresciallo, o piazzando bombe lontano dalla bandiera per simulare una falsa fortezza!"
                        : "Because your opponent cannot see piece identities until combat, bluffing is crucial! You can pretend a low-ranked piece is your Marshal, or place bombs as decoys."}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-950/30 border border-amber-500/40 space-y-2">
                    <h4 className="font-black text-amber-300 uppercase flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span>
                        {language === "it" ? "Riconoscimento Pedine Scoperte (Colori Invertiti)" : "Discovered Pieces (Inverted Base)"}
                      </span>
                    </h4>
                    <p>
                      {language === "it"
                        ? "Quando una delle tue pedine entra in combattimento e sopravvive, la sua identità viene rivelata all'avversario! Sulla scacchiera, le tue pedine scoperte sono evidenziate visivamente dal riquadro bianco a colori invertiti (fondo bianco con testo colorato) e dal bordo luminoso bianco sulla base. Così saprai sempre con precisione quali pedine conservano ancora l'effetto sorpresa e quali sono note al nemico!"
                        : "When one of your pieces survives combat, its identity is revealed to the opponent! Discovered pieces are marked with an inverted white rank plaque (white background with colored text) and a luminous white ring around the pedestal base, so you always know which units still possess the element of surprise!"}
                    </p>
                  </div>
                </div>
              )}

              {rulesTab === "history" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30">
                    <h4 className="font-black text-amber-400 uppercase mb-1">
                      {language === "it" ? "1. L'Attaque di Hermance Edan (1908)" : "1. Hermance Edan's L'Attaque (1908)"}
                    </h4>
                    <p>
                      {language === "it"
                        ? "Nel 1908 a Parigi, l'institutrice Hermance Edan depositò il brevetto per L'Attaque. Conteneva già la griglia quadrata, i due laghi centrali, le pedine a informazione nascosta, la spia letale e la bandiera da catturare."
                        : "In 1908 Paris, schoolteacher Hermance Edan patented L'Attaque, featuring the 10x10 board, two impassable lakes, fog of war ranks, lethal Spy and flag capture."}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/5">
                    <h4 className="font-black text-amber-400 uppercase mb-1">
                      {language === "it" ? "2. Mogendorff, Jumbo e Milton Bradley" : "2. Mogendorff, Jumbo & Milton Bradley"}
                    </h4>
                    <p>
                      {language === "it"
                        ? "Nel 1942 Jacques Johan Mogendorff registrò nei Paesi Bassi il marchio Stratego, concesso in licenza a Jumbo nel 1946. Nel 1961 Milton Bradley (MB) lo distribuì negli USA facendone un fenomeno mondiale con decine di milioni di copie vendute."
                        : "In 1942 Jacques Johan Mogendorff registered the Stratego trademark in the Netherlands, licensing to Jumbo in 1946. In 1961 Milton Bradley distributed it in the US, turning it into a worldwide phenomenon."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Risorse Utili (Link Esterni) - Stile Baduk */}
            <div className="bg-slate-800/40 p-3 rounded-2xl border border-white/5 shrink-0 mt-2">
              <h4 className="text-xs font-black text-amber-400 uppercase mb-1">
                {st.usefulResources}
              </h4>
              <ul className="text-xs text-blue-400 space-y-1 list-none">
                <li><a href="https://en.wikipedia.org/wiki/Stratego" target="_blank" rel="noopener noreferrer" className="hover:underline">→ Wikipedia: Stratego</a></li>
                <li><a href="https://www.ultrastratego.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">→ International Stratego Federation (ISF)</a></li>
                <li><a href="https://www.stratego.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">→ Stratego Official Strategy &amp; Rules</a></li>
              </ul>
            </div>

            {/* Pulsante Storia / Curiosità - Stile Baduk */}
            {onOpenHistory && (
              <button
                onClick={() => {
                  setIsRulesOpen(false);
                  onOpenHistory();
                }}
                className="w-full mt-2.5 py-3 bg-slate-800 rounded-2xl font-black text-xs text-amber-400 border border-amber-500/30 hover:bg-slate-700 transition-colors active:scale-95 flex items-center justify-center gap-2 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {st.historyTriviaBtn}
              </button>
            )}

            {/* Pulsante Chiudi - Stile Baduk */}
            <button
              onClick={() => setIsRulesOpen(false)}
              className="mt-2.5 w-full py-3 bg-amber-900/30 text-amber-300 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform hover:bg-amber-900/50 border border-amber-500/30 shrink-0"
            >
              {st.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* PIECE CODEX MODAL: All pieces with distinct rank pedestal colors and full abilities */}
      {isPieceCodexOpen && (
        <div className="fixed inset-0 z-[2500] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-slate-900 rounded-[2.5rem] p-5 sm:p-6 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 shadow-2xl border border-white/10 custom-scrollbar overflow-hidden">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎖️</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black italic text-amber-400 uppercase tracking-tight">
                    {st.pieceCodex}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-bold">
                    {st.pieceCodexTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPieceCodexOpen(false)}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-full font-black text-white hover:bg-slate-700 transition-colors flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 custom-scrollbar text-xs">
              {(Object.keys(STRATEGO_PIECE_DEFS) as StrategoPieceType[]).map((type) => {
                const def = STRATEGO_PIECE_DEFS[type];
                const rt = STRATEGO_RANK_COLORS[def.rank];
                const isFlag = type === "flag";
                const isBomb = type === "bomb";

                return (
                  <div
                    key={type}
                    className="p-3 rounded-2xl bg-slate-800/60 border border-white/10 flex flex-col gap-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-1.5 rounded-xl bg-black/40 border border-white/10">
                          {def.icon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-white text-sm">
                              {language === "it" ? def.nameIt : def.nameEn}
                            </span>
                            {isFlag ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 border border-amber-400/50 text-amber-300 flex items-center gap-1">
                                🚩 {language === "it" ? "Bandiera (Svolazzante)" : "Flag (Fluttering Banner)"}
                              </span>
                            ) : isBomb ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-700 border border-slate-500 text-slate-200 flex items-center gap-1">
                                💣 {language === "it" ? "Bomba (Ferro Scuro)" : "Bomb (Dark Iron)"}
                              </span>
                            ) : rt ? (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm"
                                style={{
                                  backgroundColor: rt.main,
                                  color: rt.textColor,
                                  border: `1.5px solid ${rt.border}`,
                                  boxShadow: `0 0 8px ${rt.glow}`,
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                                {language === "it" ? `Grado ${def.rank} • ${rt.nameIt}` : `Rank ${def.rank} • ${rt.name}`}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                            {language === "it" ? `Quantità esercito: ${def.count}x` : `Army count: ${def.count}x`} • {language === "it" ? def.movementIt : def.movementEn}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-200/95 font-medium leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                      {language === "it" ? def.specialAbilityIt : def.specialAbilityEn}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setIsPieceCodexOpen(false)}
              className="mt-2 w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-md shrink-0"
            >
              {language === "it" ? "Chiudi Guida" : "Close Codex"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategoBoard;
