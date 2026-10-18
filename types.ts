
export type PlayerId = 1 | 2 | 3 | 4;
export type Difficulty = 'facile' | 'normale' | 'difficile' | 'estrema' | 'maestro';
export type Language = 'en' | 'fr' | 'de' | 'it' | 'es';
export type BoardTheme = 'neon' | 'islands' | 'desert' | 'hourglass' | 'bridge' | 'hammer' | 'arena' | 'corsa' | 'amazons-8' | 'amazons-10' | 'amazons-6' | 'domineering' | 'abalone' | 'abalone-daisy' | 'abalone-dutch' | 'abalone-domination' | 'abalone-infiltration' | 'abalone-wall' | 'hex' | 'orbito' | 'pente' | 'chain_triangle' | 'shobu' | 'shobu-scacchiera' | 'yinsh' | 'onitama-dark' | 'onitama-light' | 'baduk-9' | 'baduk-13' | 'baduk-19' | 'stratego-classic' | 'stratego-dark';
export type StartingPlayerPreference = 'human' | 'ai' | 'random';
export type GameMode = 'dominio' | 'corsa' | 'amazons' | 'domineering' | 'abalone' | 'hex' | 'orbito' | 'pente' | 'chain_triangle' | 'shobu' | 'yinsh' | 'onitama' | 'baduk' | 'stratego';

export interface Point {
  r: number;
  c: number;
  id?: string;
  isNewAi?: boolean; // Used for Pente AI animate
}

export interface Wall {
  id: string; // Formato "r1,c1|r2,c2"
  ownerId: PlayerId;
}

export type Side = 'top' | 'bottom' | 'left' | 'right';

export interface Player {
  id: PlayerId;
  name: string;
  positions: Point[];
  color: string;
  isAI: boolean;
  score: number;
  isEnclosed: boolean;
  hasWallbreaker: boolean;
  isTrapped: boolean;
  wallsLeft?: number;
  penteCaptures?: number;
}

export type TurnPhase = 'setup' | 'moving' | 'walling';

export interface AIAction {
  pieceIdx: number;
  movePos: Point;
  wallTarget: Point | null;
  fugaWallTarget?: FugaWallPreview | null;
}

export interface GameRecord {
  wins: number;
  losses: number;
  hardWins?: number;
  ties?: number;
}

export interface BadgeUnlock {
  id: string;
  date: string;
  difficulty?: 'normale' | 'difficile' | 'estrema' | 'maestro';
}

export interface PlayerStats {
  [key: string]: any;
  2: GameRecord;
  3: GameRecord;
  4: GameRecord;
  badges?: (string | BadgeUnlock)[];
  hardWinsByTheme?: Record<string, number>;
  normalWinsByTheme?: Record<string, number>;
  totalScore?: number;
  totalOnlineMatches?: number;
  totalFugaScore?: number;
  totalAmazonsScore?: number;
  totalDomineeringScore?: number;
  totalAbaloneScore?: number;
  totalHexScore?: number;
  totalChainTriangleScore?: number;
  totalOrbitoScore?: number;
  totalPenteScore?: number;
  totalShobuScore?: number;
  totalYinshScore?: number;
  totalOnitamaScore?: number;
  totalStrategoScore?: number;
  yinshStats?: any;
  shobuStats?: any;
  onitamaStats?: any;
  strategoStats?: any;
  unlockedModes?: GameMode[];
  freeUnlockedModes?: GameMode[];
  lastGamePlayedAt?: string;
}

export interface StrategyAdvice {
  text: string;
  suggestedMove?: Point;
  suggestedWall?: Point;
}

export interface FugaWallPreview {
  r: number;
  c: number;
  orientation: 'h' | 'v';
}

export interface Peg {
  q: number;
  r: number;
  s: number; // cube coordinates
}

export interface Triangle {
  id: string; // unique identifier
  pegs: Peg[]; // exactly 3 pegs
  edges: string[]; // 3 edge IDs
  ownerId: number | null; // which player claimed it
}

export interface RubberBand {
  id: string;
  pegs: Peg[]; // exactly 4 pegs in a line
  edges: string[]; // 3 edge IDs it covers
  ownerId: number; // which player placed it
}

export interface ChainTriangleState {
  rubberBands: RubberBand[];
  triangles: Triangle[];
  selectedPeg: Peg | null;
}

export interface YinshPoint {
  q: number;
  r: number;
}

export type OnitamaCardName = 'tiger' | 'dragon' | 'frog' | 'rabbit' | 'crab' | 'elephant' | 'goose' | 'rooster' | 'monkey' | 'mantis' | 'horse' | 'ox' | 'crane' | 'boar' | 'eel' | 'cobra';

export interface OnitamaState {
  player1Cards: OnitamaCardName[];
  player2Cards: OnitamaCardName[];
  neutralCard: OnitamaCardName;
  selectedCardName: OnitamaCardName | null;
  winner?: PlayerId;
}

export interface YinshState {
  rings: { id?: string; playerId: PlayerId; q: number; r: number }[];
  markers: Record<string, PlayerId>;
  phase: 'place_ring' | 'place_marker' | 'move_ring' | 'remove_markers' | 'remove_ring';
  selectedRing: YinshPoint | null;
  activeRows: { points: YinshPoint[]; playerId: PlayerId }[];
  ringsWon: Record<PlayerId, number>;
  winner: PlayerId | null;
  lastMove?: { from: YinshPoint; to: YinshPoint; timestamp: number };
}

export interface GameState {
  onitamaState?: OnitamaState;
  yinshState?: YinshState;
  shobuState?: {
    passiveMove?: {
      r: number;
      c: number;
      dr: number;
      dc: number;
      steps: number;
      boardColor: 'dark' | 'light';
    };
  };
  chainTriangleState?: ChainTriangleState;
  gameMode?: GameMode;
  corsaAction?: 'move' | 'wall';
  corsaWallStartCell?: Point | null;
  fugaWallPreview?: FugaWallPreview | null;
  orbitoPhase?: 'shift' | 'place' | 'button';
  orbitoActionState?: {
    playerId?: PlayerId;
    pieceIdx?: number;
  };
  players: Player[];
  walls: Wall[];
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  setupStep: number;
  selectedPieceIndex: number | null;
  abaloneSelectedIndices?: number[];
  moveBackupPos: Point | null;
  winner: PlayerId | 'draw' | null;
  winningLine?: Point[];
  status: 'setup' | 'playing' | 'ended' | 'scoring';
  history: string[];
  pastStates?: any[];
  futureStates?: any[];
  abalonePreviousState?: {
    players: Player[];
    currentPlayerIndex: number;
    turnCount: number;
  } | null;
  territoryMap: Record<string, PlayerId>;
  difficulty: Difficulty;
  usedWallbreakerThisTurn?: boolean;
  consecutivePasses: number;
  badukKoPoint?: Point | null;
  badukDeadStones?: string[];
  lastPlacedPiece?: { r: number; c: number; playerId: PlayerId } | null;
  lastMoveByPlayer?: Record<number, Point>;
  boardTheme: BoardTheme;
  matchResult?: { pointsEarned: number, earnedBadges: string[] };
  startingPlayerIndex?: number;
  lastMovedPlayerId?: PlayerId;
  turnCount: number;
}
