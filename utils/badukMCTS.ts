import { Player, Difficulty, Point } from "../types";

export class FastBoard {
    size: number;
    data: Int8Array;
    ko: number = -1;
    passes: number = 0;
    capturedP1: number = 0;
    capturedP2: number = 0;

    constructor(size: number) {
        this.size = size;
        this.data = new Int8Array(size * size);
    }

    clone(): FastBoard {
         const b = new FastBoard(this.size);
         b.data.set(this.data);
         b.ko = this.ko;
         b.passes = this.passes;
         b.capturedP1 = this.capturedP1;
         b.capturedP2 = this.capturedP2;
         return b;
    }

    // 0 = empty, 1 = p1 (black), 2 = p2 (white)
    playMove(idx: number, color: number): boolean {
        if (idx === -1) { // pass
            this.passes++;
            this.ko = -1;
            return true;
        }

        if (this.data[idx] !== 0) return false;
        if (this.ko === idx) return false;

        this.data[idx] = color;
        const oppColor = color === 1 ? 2 : 1;
        
        let capturedIndices: number[] = [];
        const neighbors = this.getNeighbors(idx);
        
        // Check surrounding opponent groups for capture
        for (const n of neighbors) {
            if (this.data[n] === oppColor) {
                 const { group, liberties } = this.getGroup(n);
                 if (liberties === 0) {
                     for (const g of group) {
                         capturedIndices.push(g);
                     }
                 }
            }
        }

        if (capturedIndices.length > 0) {
            // execute capture
            for (const c of capturedIndices) {
                this.data[c] = 0;
            }
            if (color === 1) this.capturedP1 += capturedIndices.length;
            else this.capturedP2 += capturedIndices.length;

            if (capturedIndices.length === 1) {
                // check if the placed stone has exactly 1 liberty and size 1
                const selfGrp = this.getGroup(idx);
                if (selfGrp.group.length === 1 && selfGrp.liberties === 1) {
                    this.ko = capturedIndices[0];
                } else {
                    this.ko = -1;
                }
            } else {
                this.ko = -1;
            }
        } else {
            this.ko = -1;
            // self capture check
            const selfGrp = this.getGroup(idx);
            if (selfGrp.liberties === 0) {
                this.data[idx] = 0; // revert
                return false;
            }
        }

        this.passes = 0;
        return true;
    }

    getNeighbors(idx: number): number[] {
        const n: number[] = [];
        const r = Math.floor(idx / this.size);
        const c = idx % this.size;
        if (r > 0) n.push(idx - this.size);
        if (r < this.size - 1) n.push(idx + this.size);
        if (c > 0) n.push(idx - 1);
        if (c < this.size - 1) n.push(idx + 1);
        return n;
    }

    getGroup(startIdx: number): { group: number[], liberties: number } {
        const color = this.data[startIdx];
        if (color === 0) return { group: [], liberties: 0 };

        const group: number[] = [];
        let liberties = 0;
        const visited = new Set<number>();
        const libVisited = new Set<number>();
        const queue = [startIdx];
        visited.add(startIdx);

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            group.push(curr);
            const nbs = this.getNeighbors(curr);
            for (const nb of nbs) {
                const c = this.data[nb];
                if (c === 0) {
                    if (!libVisited.has(nb)) {
                        libVisited.add(nb);
                        liberties++;
                    }
                } else if (c === color && !visited.has(nb)) {
                    visited.add(nb);
                    queue.push(nb);
                }
            }
        }
        return { group, liberties };
    }

    // Very simple true eye check
    isTrueEye(idx: number, color: number): boolean {
        if (this.data[idx] !== 0) return false;
        const r = Math.floor(idx / this.size);
        const c = idx % this.size;
        
        let myN = 0, off = 0;
        const nbs = this.getNeighbors(idx);
        for (const n of nbs) {
            if (this.data[n] === color) myN++;
        }
        off = 4 - nbs.length;
        if (myN + off !== 4) return false;

        // Check diagonals
        let oppD = 0;
        const diags = [[r-1,c-1], [r-1,c+1], [r+1,c-1], [r+1,c+1]];
        for (const [dr, dc] of diags) {
            if (dr >= 0 && dr < this.size && dc >= 0 && dc < this.size) {
                if (this.data[dr * this.size + dc] === (color === 1 ? 2 : 1)) oppD++;
            }
        }
        const maxOppD = off > 0 ? 0 : 1;
        return oppD <= maxOppD;
    }

    getPossibleMoves(color: number): number[] {
        const moves: number[] = [];
        for (let i = 0; i < this.size * this.size; i++) {
            if (this.data[i] === 0 && this.ko !== i && !this.isTrueEye(i, color)) {
                // simple suicide check approximation (won't catch big eyes)
                moves.push(i);
            }
        }
        return moves;
    }

    // Tromp-Taylor Area Scoring approximation
    getScore(): number {
        let s = 0; // >0 means p1 wins
        const visited = new Set<number>();
        for (let i = 0; i < this.size * this.size; i++) {
            if (this.data[i] === 1) s++;
            else if (this.data[i] === 2) s--;
            else if (!visited.has(i)) {
                 // flood fill empty
                 let p1Bound = false;
                 let p2Bound = false;
                 let count = 0;
                 const q = [i];
                 visited.add(i);
                 let h = 0;
                 while (h < q.length) {
                     const curr = q[h++];
                     count++;
                     const nbs = this.getNeighbors(curr);
                     for (const nb of nbs) {
                         if (this.data[nb] === 1) p1Bound = true;
                         else if (this.data[nb] === 2) p2Bound = true;
                         else if (!visited.has(nb)) {
                             visited.add(nb);
                             q.push(nb);
                         }
                     }
                 }
                 if (p1Bound && !p2Bound) s += count;
                 if (p2Bound && !p1Bound) s -= count;
            }
        }
        return s; // Positive -> P1 advantage. Need to add komi if P2 is white.
    }
}

class MCTSNode {
    move: number; // -1 for root
    parent: MCTSNode | null;
    children: MCTSNode[] = [];
    wins: number = 0;
    visits: number = 0;
    scoreMargin: number = 0;
    untriedMoves: number[];
    playerToMove: number; // The player who WILL move from this state
    priors: number[] = [];

    constructor(move: number, parent: MCTSNode | null, untriedMoves: number[], playerToMove: number) {
        this.move = move;
        this.parent = parent;
        this.untriedMoves = untriedMoves;
        this.playerToMove = playerToMove;
    }

    PUCTSelectChild(): MCTSNode {
        let bestScore = -Infinity;
        let bestChild = this.children[0];
        const C = 1.414; // exploration parameter
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const prior = this.priors[i] || 1.0;
            // win rate from perspective of player who just moved to get here
            let winRate = 0.5;
            if (child.visits > 0) winRate = child.wins / child.visits;
            
            const uctScore = winRate + C * prior * Math.sqrt(this.visits) / (1 + child.visits);
            if (uctScore > bestScore) {
                bestScore = uctScore;
                bestChild = child;
            }
        }
        return bestChild;
    }
}

// Advanced heuristics for Maestro
function evaluateMovePrior(state: FastBoard, move: number, color: number): number {
    let score = 1.0;
    const r = Math.floor(move / state.size);
    const c = move % state.size;
    const er = Math.min(r, state.size - 1 - r);
    const ec = Math.min(c, state.size - 1 - c);
    
    if (state.passes === 0 && state.capturedP1 + state.capturedP2 < 5) {
        if ((er === 2 || er === 3) && (ec === 2 || ec === 3)) score += 5.0; // Urgent opening
        if (er === 0 || ec === 0) score *= 0.1; // avoid 1st line early
    }

    const nbs = state.getNeighbors(move);
    let myStones = 0, emptyNbs = 0, atariCapture = false, atariSave = false;

    for (const n of nbs) {
        const stone = state.data[n];
        if (stone === 0) emptyNbs++;
        else if (stone === color) {
            myStones++;
            if (state.getGroup(n).liberties === 1) atariSave = true;
        }
        else {
            if (state.getGroup(n).liberties === 1) atariCapture = true;
        }
    }

    if (atariCapture) score += 50.0;
    if (atariSave && emptyNbs > 0) score += 40.0;

    state.data[move] = color;
    const newGrp = state.getGroup(move);
    state.data[move] = 0;
    if (newGrp.liberties === 1 && !atariCapture) score *= 0.01; // self-atari
    
    // basic shape
    const diags = [[r-1,c-1], [r-1,c+1], [r+1,c-1], [r+1,c+1]];
    let myDiags = 0;
    for (const [dr, dc] of diags) {
        if (dr >= 0 && dr < state.size && dc >= 0 && dc < state.size && state.data[dr * state.size + dc] === color) myDiags++;
    }
    if (myDiags > 0 && myStones === 0) score += 2.0;
    
    return Math.max(0.01, score);
}

function heavyRolloutMove(state: FastBoard, player: number, moves: number[]): number {
    if (Math.random() < 0.1) return moves[Math.floor(Math.random() * moves.length)];
    let bestMove = -1, bestScore = -1;
    for (let i = 0; i < Math.min(10, moves.length); i++) {
        const m = moves[Math.floor(Math.random() * moves.length)];
        const prior = evaluateMovePrior(state, m, player);
        if (prior > bestScore) { bestScore = prior; bestMove = m; }
        if (bestScore > 20) break;
    }
    return bestMove !== -1 ? bestMove : moves[Math.floor(Math.random() * moves.length)];
}

export const runMCTS = (initialState: FastBoard, myPlayer: number, timeLimitMs: number): number => {
    let bestMove = -1;
    const rootMoves = initialState.getPossibleMoves(myPlayer);
    if (rootMoves.length === 0) return -1;
    
    // Quick win detection: if we only have one move
    // if (rootMoves.length === 1) return rootMoves[0];

    const root = new MCTSNode(-1, null, rootMoves, myPlayer);
    const startTime = Date.now();
    let iter = 0;

    // Small heuristic: prefer 3-4 line on large boards in early game
    const preferredMoves = new Set<number>();
    if (initialState.size >= 13 && root.untriedMoves.length > (initialState.size * initialState.size - 20)) {
        for (const move of rootMoves) {
            const r = Math.floor(move / initialState.size);
            const c = move % initialState.size;
            const er = Math.min(r, initialState.size - 1 - r);
            const ec = Math.min(c, initialState.size - 1 - c);
            if ((er === 2 || er === 3) && (ec === 2 || ec === 3)) {
                preferredMoves.add(move);
            }
        }
    }

    while (Date.now() - startTime < timeLimitMs) {
        iter++;
        let node = root;
        let state = initialState.clone();

        // 1. SELECT
        while (node.untriedMoves.length === 0 && node.children.length > 0) {
            node = node.PUCTSelectChild();
            state.playMove(node.move, node.parent!.playerToMove);
        }

        // 2. EXPAND
        if (node.untriedMoves.length > 0) {
            // Select a random untried move (prefer preferred moves if available)
            let moveIdx = Math.floor(Math.random() * node.untriedMoves.length);
            // If at root and have preferred moves, bias towards them
            if (node === root && preferredMoves.size > 0 && Math.random() < 0.5) {
                const prefArr = node.untriedMoves.filter(m => preferredMoves.has(m));
                if (prefArr.length > 0) {
                    const chosen = prefArr[Math.floor(Math.random() * prefArr.length)];
                    moveIdx = node.untriedMoves.indexOf(chosen);
                }
            }

            const move = node.untriedMoves.splice(moveIdx, 1)[0];
            const nextPlayer = node.playerToMove === 1 ? 2 : 1;
            
            const valid = state.playMove(move, node.playerToMove);
            if (!valid) continue; // invalid move

            const newMoves = state.getPossibleMoves(nextPlayer);
            const childNode = new MCTSNode(move, node, newMoves, nextPlayer);
            node.children.push(childNode);
            node.priors.push(timeLimitMs > 2000 ? evaluateMovePrior(state, move, node.playerToMove) : 1.0);
            node = childNode;
        }

        // 3. ROLLOUT
        let rolloutPlayer = node.playerToMove;
        let p1Pass = false;
        let p2Pass = false;
        let rollouts = 0;
        
        while (rollouts < 40 && state.passes < 2) {
            const moves = state.getPossibleMoves(rolloutPlayer);
            if (moves.length === 0) {
                state.playMove(-1, rolloutPlayer);
            } else {
                 // Fast random rollout vs Heavy Rollout in Maestro
                 let m = timeLimitMs > 2000 ? heavyRolloutMove(state, rolloutPlayer, moves) : moves[Math.floor(Math.random() * moves.length)];
                 const valid = state.playMove(m, rolloutPlayer);
                 if (!valid) state.playMove(-1, rolloutPlayer);
            }
            rolloutPlayer = rolloutPlayer === 1 ? 2 : 1;
            rollouts++;
        }

        // 4. BACKPROPAGATE
        let score = state.getScore();
        // Add komi for player 2 (white)
        score -= 7.5; 
        
        // Did myPlayer win? Yes if score > 0 and myPlayer == 1, or score < 0 and myPlayer == 2
        const p1Wins = score > 0;
        
        let curr: MCTSNode | null = node;
        while (curr != null) {
            curr.visits++;
            // The node represents the state AFTER `curr.parent!.playerToMove` played `curr.move`.
            // So we want to update the win according to `curr.parent!.playerToMove`.
            if (curr.parent !== null) {
                const playerWhoMadeThisNode = curr.parent.playerToMove;
                if ((playerWhoMadeThisNode === 1 && p1Wins) || (playerWhoMadeThisNode === 2 && !p1Wins)) {
                    curr.wins++;
                }
                const margin = playerWhoMadeThisNode === 1 ? score : -score;
                curr.scoreMargin += margin;
            }
            curr = curr.parent;
        }
    }

    console.log(`MCTS performed ${iter} iterations in ${timeLimitMs}ms`);

    let maxVisits = -1;
    let bestAvgMargin = -Infinity;
    
    // Check if the AI is completely losing on all branches
    const isLosing = root.children.every(c => (c.wins / c.visits) < 0.05);

    for (const child of root.children) {
        if (isLosing) {
             const childAvgMargin = child.scoreMargin / child.visits;
             if (childAvgMargin > bestAvgMargin) {
                 bestAvgMargin = childAvgMargin;
                 bestMove = child.move;
                 maxVisits = child.visits;
             }
             // prefer passing over playing a nonsense move if margin is similar
             else if (child.move === -1 && childAvgMargin >= bestAvgMargin - 1.5) {
                 bestAvgMargin = childAvgMargin;
                 bestMove = child.move;
                 maxVisits = child.visits;
             }
        } else {
             if (child.visits > maxVisits) {
                 maxVisits = child.visits;
                 bestMove = child.move;
             }
        }
    }

    return bestMove;
};

