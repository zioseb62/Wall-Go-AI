
import { PlayerId } from './types';

// Aumentato a 19 per supportare la modalità Baduk (19x19)
// Le modalità classiche o esagonali mapperanno sulle celle necessarie.
export const GRID_SIZE = 19;
export const MAX_MOVE_DISTANCE = 2;

export const PLAYER_COLORS: Record<PlayerId, string> = {
  1: '#3b82f6', // blue (Neon Azure)
  2: '#ef4444', // red (Ruby)
  3: '#10b981', // green (Emerald)
  4: '#f59e0b', // amber (Amber)
};

export const PLAYER_NAMES: Record<PlayerId, string> = {
  1: 'Umano (Tu)',
  2: 'AI Rubino',
  3: 'AI Smeraldo',
  4: 'AI Ambra',
};

// Suggerimenti di posizione (usano indici sicuri < 7 per compatibilità con tutte le mappe)
export const INITIAL_POSITIONS: Record<number, Record<number, {r: number, c: number}[]>> = {
  2: { 
    0: [{r: 1, c: 1}, {r: 5, c: 4}], // Adattato per essere sicuro su Ziggurat (c < 4+r)
    1: [{r: 1, c: 4}, {r: 5, c: 1}]
  },
  3: { 
    0: [{r: 0, c: 0}, {r: 6, c: 6}],
    1: [{r: 0, c: 3}, {r: 6, c: 0}], // c=3 su riga 0 è valido (len 4: 0,1,2,3)
    2: [{r: 3, c: 0}, {r: 3, c: 6}]
  },
  4: { 
    0: [{r: 0, c: 0}, {r: 6, c: 6}],
    1: [{r: 0, c: 3}, {r: 6, c: 0}],
    2: [{r: 3, c: 0}, {r: 3, c: 6}],
    3: [{r: 2, c: 2}, {r: 4, c: 4}]
  }
};
