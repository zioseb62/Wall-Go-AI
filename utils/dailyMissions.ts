import { GameMode, BoardTheme, Difficulty } from "../types";

export type MissionType = "win_mode" | "win_theme" | "win_difficulty" | "play_mode" | "win_multiplayer" | "win_multiplayer_mode" | "play_multiplayer";

export interface DailyMission {
  id: string;
  type: MissionType;
  target: string;
  reward: number;
  description: { en: string; it: string; fr: string; de: string; es: string };
  isCompleted: boolean;
}

export interface DailyMissionsState {
  date: string; // YYYY-MM-DD
  missions: DailyMission[];
}

const MISSIONS_POOL: Omit<DailyMission, 'isCompleted' | 'id'>[] = [
  { type: "win_mode", target: "baduk", reward: 25, description: { en: "Win 1 game in Baduk", it: "Vinci 1 partita a Baduk", fr: "Gagnez 1 partie au Baduk", de: "Gewinne 1 Spiel in Baduk", es: "Gana 1 partida en Baduk" } },
  { type: "win_mode", target: "corsa", reward: 15, description: { en: "Win 1 game in Quoridor", it: "Vinci 1 partita a Quoridor", fr: "Gagnez 1 partie au Quoridor", de: "Gewinne 1 Spiel in Quoridor", es: "Gana 1 partida en Quoridor" } },
  { type: "win_mode", target: "dominio", reward: 15, description: { en: "Win 1 game in Wall Go AI", it: "Vinci 1 partita a Wall Go AI", fr: "Gagnez 1 partie à Wall Go AI", de: "Gewinne 1 Spiel in Wall Go AI", es: "Gana 1 partida en Wall Go AI" } },
  { type: "win_mode", target: "abalone", reward: 20, description: { en: "Win 1 game in Abalone", it: "Vinci 1 partita ad Abalone", fr: "Gagnez 1 partie à Abalone", de: "Gewinne 1 Spiel in Abalone", es: "Gana 1 partida en Abalone" } },
  { type: "win_mode", target: "onitama", reward: 15, description: { en: "Win 1 game in Onitama", it: "Vinci 1 partita ad Onitama", fr: "Gagnez 1 partie à Onitama", de: "Gewinne 1 Spiel in Onitama", es: "Gana 1 partida en Onitama" } },
  { type: "win_mode", target: "shobu", reward: 20, description: { en: "Win 1 game in Shōbu", it: "Vinci 1 partita a Shōbu", fr: "Gagnez 1 partie à Shōbu", de: "Gewinne 1 Spiel in Shōbu", es: "Gana 1 partida en Shōbu" } },
  { type: "win_mode", target: "yinsh", reward: 20, description: { en: "Win 1 game in YINSH", it: "Vinci 1 partita a YINSH", fr: "Gagnez 1 partie à YINSH", de: "Gewinne 1 Spiel in YINSH", es: "Gana 1 partida en YINSH" } },
  { type: "win_theme", target: "neon", reward: 10, description: { en: "Win with the Neon theme (any game)", it: "Vinci con il tema Neon (qualsiasi gioco)", fr: "Gagnez avec le thème Néon (n'importe quel jeu)", de: "Gewinne mit dem Neon-Design (beliebiges Spiel)", es: "Gana con el tema Neón (cualquier juego)" } },
  { type: "win_theme", target: "islands", reward: 10, description: { en: "Win with the Islands theme (any game)", it: "Vinci con il tema Islands (qualsiasi gioco)", fr: "Gagnez avec le thème Îles (n'importe quel jeu)", de: "Gewinne mit dem Insel-Design (beliebiges Spiel)", es: "Gana con el tema Islas (cualquier juego)" } },
  { type: "win_difficulty", target: "difficile", reward: 25, description: { en: "Win 1 game on Hard difficulty (any game)", it: "Vinci 1 partita a difficoltà Difficile (qualsiasi gioco)", fr: "Gagnez 1 partie en difficulté Difficile (n'importe quel jeu)", de: "Gewinne 1 Spiel auf Schwierigkeitsgrad Schwer (beliebiges Spiel)", es: "Gana 1 partida en dificultad Difícil (cualquier juego)" } },
  { type: "win_difficulty", target: "estrema", reward: 50, description: { en: "Win 1 game on Extreme difficulty (any game)", it: "Vinci 1 partita a difficoltà Estrema (qualsiasi gioco)", fr: "Gagnez 1 partie en difficulté Extrême (n'importe quel jeu)", de: "Gewinne 1 Spiel auf Schwierigkeitsgrad Extrem (beliebiges Spiel)", es: "Gana 1 partida en dificultad Extrema (cualquier juego)" } },
  { type: "win_difficulty", target: "maestro", reward: 75, description: { en: "Win 1 game on Master difficulty (any game)", it: "Vinci 1 partita a difficoltà Maestro (qualsiasi gioco)", fr: "Gagnez 1 partie en difficulté Maître (n'importe quel jeu)", de: "Gewinne 1 Spiel auf Schwierigkeitsgrad Meister (beliebiges Spiel)", es: "Gana 1 partida en dificultad Maestro (cualquier juego)" } },
  // Multiplayer-exclusive missions
  { type: "win_multiplayer", target: "any", reward: 30, description: { en: "Win 1 Multiplayer match (any game)", it: "Vinci 1 partita in modalità Multiplayer (qualsiasi gioco)", fr: "Gagnez 1 partie en mode Multijoueur (n'importe quel jeu)", de: "Gewinne 1 Mehrspieler-Spiel (beliebiges Spiel)", es: "Gana 1 partida en modo Multijugador (cualquier juego)" } },
  { type: "win_multiplayer_mode", target: "onitama", reward: 35, description: { en: "Win 1 Multiplayer match in Onitama", it: "Vinci 1 partita multiplayer a Onitama", fr: "Gagnez 1 partie multijoueur à Onitama", de: "Gewinne 1 Mehrspieler-Spiel in Onitama", es: "Gana 1 partida multijugador en Onitama" } },
  { type: "win_multiplayer_mode", target: "dominio", reward: 35, description: { en: "Win 1 Multiplayer match in Wall Go", it: "Vinci 1 partita multiplayer a Wall Go", fr: "Gagnez 1 partie multijoueur à Wall Go", de: "Gewinne 1 Mehrspieler-Spiel in Wall Go", es: "Gana 1 partida multijugador en Wall Go" } },
  { type: "win_multiplayer_mode", target: "corsa", reward: 35, description: { en: "Win 1 Multiplayer match in Quoridor", it: "Vinci 1 partita multiplayer a Quoridor", fr: "Gagnez 1 partie multijoueur à Quoridor", de: "Gewinne 1 Mehrspieler-Spiel in Quoridor", es: "Gana 1 partida multijugador en Quoridor" } },
  { type: "win_multiplayer_mode", target: "shobu", reward: 40, description: { en: "Win 1 Multiplayer match in Shōbu", it: "Vinci 1 partita multiplayer a Shōbu", fr: "Gagnez 1 partie multijoueur à Shōbu", de: "Gewinne 1 Mehrspieler-Spiel in Shōbu", es: "Gana 1 partida multijugador en Shōbu" } },
  { type: "win_multiplayer_mode", target: "yinsh", reward: 40, description: { en: "Win 1 Multiplayer match in YINSH", it: "Vinci 1 partita multiplayer a YINSH", fr: "Gagnez 1 partie multijoueur à YINSH", de: "Gewinne 1 Mehrspieler-Spiel in YINSH", es: "Gana 1 partida multijugador en YINSH" } },
  { type: "win_multiplayer_mode", target: "abalone", reward: 40, description: { en: "Win 1 Multiplayer match in Abalone", it: "Vinci 1 partita multiplayer ad Abalone", fr: "Gagnez 1 partie multijoueur à Abalone", de: "Gewinne 1 Mehrspieler-Spiel in Abalone", es: "Gana 1 partida multijugador en Abalone" } },
  { type: "play_multiplayer", target: "any", reward: 20, description: { en: "Play 1 match in Multiplayer mode", it: "Gioca 1 partita in modalità Multiplayer", fr: "Jouez 1 partie en mode Multijoueur", de: "Spiele 1 Spiel im Mehrspielermodus", es: "Juega 1 partida en modo Multijugador" } },
];

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generateDailyMissions(dateStr: string): DailyMission[] {
  const seed = parseInt(dateStr.replace(/-/g, ''), 10);
  const pool = [...MISSIONS_POOL];
  
  // Shuffle based on seed
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  return pool.slice(0, 3).map((m, idx) => ({
    ...m,
    id: `${dateStr}_${idx}`,
    isCompleted: false
  }));
}

export function getPastDaysDateStrings(days: number): string[] {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return dates;
}
