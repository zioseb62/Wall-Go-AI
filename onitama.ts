import { OnitamaCardName, OnitamaState, Point, GameState } from "./types";

export interface OnitamaCardDef {
  color: 'red' | 'blue';
  moves: { dr: number; dc: number }[];
}

export const ONITAMA_CARDS: Record<OnitamaCardName, OnitamaCardDef> = {
  tiger: { color: 'blue', moves: [{ dr: -2, dc: 0 }, { dr: 1, dc: 0 }] },
  dragon: { color: 'red', moves: [{ dr: -1, dc: -2 }, { dr: -1, dc: 2 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }] },
  frog: { color: 'red', moves: [{ dr: 0, dc: -2 }, { dr: -1, dc: -1 }, { dr: 1, dc: 1 }] },
  rabbit: { color: 'blue', moves: [{ dr: 0, dc: 2 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }] },
  crab: { color: 'blue', moves: [{ dr: 0, dc: -2 }, { dr: 0, dc: 2 }, { dr: -1, dc: 0 }] },
  elephant: { color: 'red', moves: [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }] },
  goose: { color: 'blue', moves: [{ dr: 0, dc: -1 }, { dr: -1, dc: -1 }, { dr: 0, dc: 1 }, { dr: 1, dc: 1 }] },
  rooster: { color: 'red', moves: [{ dr: 0, dc: 1 }, { dr: -1, dc: 1 }, { dr: 0, dc: -1 }, { dr: 1, dc: -1 }] },
  monkey: { color: 'blue', moves: [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }] },
  mantis: { color: 'red', moves: [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: 0 }] },
  horse: { color: 'red', moves: [{ dr: 0, dc: -1 }, { dr: -1, dc: 0 }, { dr: 1, dc: 0 }] },
  ox: { color: 'blue', moves: [{ dr: 0, dc: 1 }, { dr: -1, dc: 0 }, { dr: 1, dc: 0 }] },
  crane: { color: 'blue', moves: [{ dr: -1, dc: 0 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }] },
  boar: { color: 'red', moves: [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }, { dr: -1, dc: 0 }] },
  eel: { color: 'blue', moves: [{ dr: -1, dc: -1 }, { dr: 1, dc: -1 }, { dr: 0, dc: 1 }] },
  cobra: { color: 'red', moves: [{ dr: -1, dc: 1 }, { dr: 1, dc: 1 }, { dr: 0, dc: -1 }] }
};

export function createInitialOnitamaState(starterPlayerIndex: number = 1): OnitamaState {
  const cardKeys = Object.keys(ONITAMA_CARDS) as OnitamaCardName[];
  // Shuffle cards
  const shuffled = [...cardKeys].sort(() => Math.random() - 0.5);
  const p1Cards = [shuffled[0], shuffled[1]];
  const p2Cards = [shuffled[2], shuffled[3]];
  const neutralCard = shuffled[4];

  return {
    player1Cards: p1Cards,
    player2Cards: p2Cards,
    neutralCard,
    selectedCardName: null
  };
}

export function getBestOnitamaMoveForAI(gameState: GameState): { from: Point; to: Point; card: OnitamaCardName } | null {
  const onitamaState = gameState.onitamaState;
  if (!onitamaState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isP1 = currentPlayer.id === 1;
  const sign = isP1 ? 1 : -1;
  const myCards = isP1 ? onitamaState.player1Cards : onitamaState.player2Cards;
  const opponent = gameState.players.find(p => p.id !== currentPlayer.id);
  if (!opponent) return null;

  const validMoves: { from: Point; to: Point; card: OnitamaCardName; score: number }[] = [];

  for (const piece of currentPlayer.positions) {
    for (const cardName of myCards) {
      const cardDef = ONITAMA_CARDS[cardName];
      for (const m of cardDef.moves) {
        const targetR = piece.r + (m.dr * sign);
        const targetC = piece.c + (m.dc * sign);

        // Check board bounds (5x5)
        if (targetR < 0 || targetR >= 5 || targetC < 0 || targetC >= 5) continue;

        // Cannot move onto own piece
        const ownPiece = currentPlayer.positions.some(p => p.r === targetR && p.c === targetC);
        if (ownPiece) continue;

        let score = Math.random() * 5;

        // Check if capturing opponent piece
        const oppPieceIndex = opponent.positions.findIndex(p => p.r === targetR && p.c === targetC);
        if (oppPieceIndex !== -1) {
          if (oppPieceIndex === 0) {
            // Master capture! Maximum priority
            score += 1000;
          } else {
            // Student capture
            score += 100;
          }
        }

        // Check if landing on opponent's temple arch (P1 temple is (4,2), P2 temple is (0,2))
        const oppTempleR = isP1 ? 0 : 4;
        const isMaster = piece.r === currentPlayer.positions[0].r && piece.c === currentPlayer.positions[0].c;
        if (isMaster && targetR === oppTempleR && targetC === 2) {
          score += 1000;
        }

        validMoves.push({
          from: piece,
          to: { r: targetR, c: targetC },
          card: cardName,
          score
        });
      }
    }
  }

  if (validMoves.length === 0) return null;

  validMoves.sort((a, b) => b.score - a.score);
  return {
    from: validMoves[0].from,
    to: validMoves[0].to,
    card: validMoves[0].card
  };
}
