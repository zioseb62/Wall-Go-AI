// Claude MCTS translated to TS

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export function other(color: number) {
    return color === BLACK ? WHITE : BLACK;
}

export class IllegalMove extends Error {}

export class Board {
    size: number;
    n: number;
    komi: number;
    board: Int8Array;
    neighbors: number[][];
    diag_neighbors: number[][];
    to_move: number;
    ko_point: number | null;
    last_move: number | null;
    captures: { [key: number]: number };
    consecutive_passes: number;
    move_history: { color: number, move: number | null }[];
    _zobrist: Float64Array[];
    _zobrist_pass: number;
    hash: number;
    seen_hashes: Set<number>;

    constructor(size = 9, komi = 7.5) {
        this.size = size;
        this.n = size * size;
        this.komi = komi;
        this.board = new Int8Array(this.n);
        this.neighbors = this._compute_neighbors();
        this.diag_neighbors = this._compute_diag_neighbors();
        this.to_move = BLACK;
        this.ko_point = null;
        this.last_move = null;
        this.captures = { 1: 0, 2: 0 };
        this.consecutive_passes = 0;
        this.move_history = [];

        // Simplified zobrist
        this._zobrist = [];
        for (let i = 0; i < this.n; i++) {
            this._zobrist.push(new Float64Array([Math.random(), Math.random(), Math.random()]));
        }
        this._zobrist_pass = Math.random();
        this.hash = 0;
        this.seen_hashes = new Set([this.hash]);
    }

    _compute_neighbors() {
        let nb: number[][] = [];
        for (let p = 0; p < this.n; p++) {
            let r = Math.floor(p / this.size);
            let c = p % this.size;
            let lst: number[] = [];
            if (r > 0) lst.push(p - this.size);
            if (r < this.size - 1) lst.push(p + this.size);
            if (c > 0) lst.push(p - 1);
            if (c < this.size - 1) lst.push(p + 1);
            nb.push(lst);
        }
        return nb;
    }

    _compute_diag_neighbors() {
        let nb: number[][] = [];
        for (let p = 0; p < this.n; p++) {
            let r = Math.floor(p / this.size);
            let c = p % this.size;
            let lst: number[] = [];
            for (const d of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                const dr = d[0], dc = d[1];
                let rr = r + dr, cc = c + dc;
                if (0 <= rr && rr < this.size && 0 <= cc && cc < this.size) {
                    lst.push(rr * this.size + cc);
                }
            }
            nb.push(lst);
        }
        return nb;
    }

    copy(): Board {
        let b = new Board(this.size, this.komi);
        b.board = new Int8Array(this.board);
        b.to_move = this.to_move;
        b.ko_point = this.ko_point;
        b.last_move = this.last_move;
        b.captures = { 1: this.captures[1], 2: this.captures[2] };
        b.consecutive_passes = this.consecutive_passes;
        b.move_history = [...this.move_history];
        b._zobrist = this._zobrist;
        b._zobrist_pass = this._zobrist_pass;
        b.hash = this.hash;
        b.seen_hashes = new Set(this.seen_hashes);
        return b;
    }

    to_xy(p: number) {
        return [Math.floor(p / this.size), p % this.size];
    }

    coord_str(p: number | null) {
        if (p === null) return "pass";
        let [r, c] = this.to_xy(p);
        let letters = "ABCDEFGHJKLMNOPQRST";
        return `${letters[c]}${this.size - r}`;
    }

    _group_and_liberties(p: number, board: Int8Array = this.board) {
        let color = board[p];
        let stack = [p];
        let seen = new Set([p]);
        let libs = new Set<number>();
        let stones = [p];
        let nb = this.neighbors;
        while (stack.length > 0) {
            let cur = stack.pop()!;
            for (let q of nb[cur]) {
                let v = board[q];
                if (v === EMPTY) {
                    libs.add(q);
                } else if (v === color && !seen.has(q)) {
                    seen.add(q);
                    stack.push(q);
                    stones.push(q);
                }
            }
        }
        return { stones, libs };
    }

    is_eye_like(p: number, color: number) {
        if (this.board[p] !== EMPTY) return false;
        for (let q of this.neighbors[p]) {
            if (this.board[q] !== color) return false;
        }
        let diag = this.diag_neighbors[p];
        if (diag.length === 0) return true;
        let bad = 0;
        for (let q of diag) {
            if (this.board[q] !== color && this.board[q] !== EMPTY) bad++;
        }
        let allowed = diag.length < 4 ? 0 : 1;
        return bad <= allowed;
    }

    compute_groups() {
        let group_of: { [key: number]: number } = {};
        let groups: { [key: number]: { color: number, stones: number[], libs: Set<number> } } = {};
        let visited = new Uint8Array(this.n);
        let nb = this.neighbors;
        for (let p = 0; p < this.n; p++) {
            if (this.board[p] === EMPTY || visited[p]) continue;
            let color = this.board[p];
            let stack = [p];
            visited[p] = 1;
            let stones = [p];
            let libs = new Set<number>();
            while (stack.length > 0) {
                let cur = stack.pop()!;
                for (let q of nb[cur]) {
                    let v = this.board[q];
                    if (v === EMPTY) {
                        libs.add(q);
                    } else if (v === color && !visited[q]) {
                        visited[q] = 1;
                        stack.push(q);
                        stones.push(q);
                    }
                }
            }
            groups[p] = { color, stones, libs };
            for (let s of stones) group_of[s] = p;
        }
        return { group_of, groups };
    }

    legal_moves_fast(color?: number, allow_eyes = true) {
        let c = color !== undefined ? color : this.to_move;
        let { group_of, groups } = this.compute_groups();
        let opp = other(c);
        let moves: number[] = [];
        for (let p = 0; p < this.n; p++) {
            if (this.board[p] !== EMPTY || p === this.ko_point) continue;
            if (!allow_eyes && this.is_eye_like(p, c)) continue;
            if (this._is_legal_with_groups(p, c, opp, group_of, groups)) {
                moves.push(p);
            }
        }
        return { moves, group_of, groups };
    }

    _is_legal_with_groups(p: number, color: number, opp: number, group_of: any, groups: any) {
        let empty_neighbors = 0;
        let own_gids = new Set<number>();
        for (let q of this.neighbors[p]) {
            let v = this.board[q];
            if (v === EMPTY) empty_neighbors++;
            else if (v === opp) {
                let gid = group_of[q];
                if (groups[gid].libs.size === 1) return true;
            } else if (v === color) {
                own_gids.add(group_of[q]);
            }
        }
        if (empty_neighbors > 0) return true;
        let total_libs = new Set<number>();
        for (let gid of own_gids) {
            for (let lib of groups[gid].libs) total_libs.add(lib);
        }
        total_libs.delete(p);
        return total_libs.size > 0;
    }

    play(p: number | null, color?: number) {
        let c = color !== undefined ? color : this.to_move;
        let opp = other(c);

        if (p === null) {
            this.hash ^= this._zobrist_pass;
            this.consecutive_passes++;
            this.last_move = null;
            this.move_history.push({ color: c, move: null });
            this.to_move = opp;
            this.ko_point = null;
            return [];
        }

        if (this.board[p] !== EMPTY) throw new IllegalMove(`punto ${p} occupato`);
        if (p === this.ko_point) throw new IllegalMove("mossa vietata da ko");

        this.board[p] = c;
        let captured_stones: number[] = [];
        for (let q of this.neighbors[p]) {
            if (this.board[q] === opp) {
                let { stones, libs } = this._group_and_liberties(q);
                if (libs.size === 0) {
                    for (let s of stones) captured_stones.push(s);
                }
            }
        }

        let seen_groups = new Set<number>();
        for (let s of captured_stones) {
            if (this.board[s] === opp && !seen_groups.has(s)) {
                let { stones } = this._group_and_liberties(s);
                for (let st of stones) seen_groups.add(st);
            }
        }

        let unique_captured = Array.from(seen_groups);
        for (let s of unique_captured) this.board[s] = EMPTY;

        let { stones, libs } = this._group_and_liberties(p);
        if (libs.size === 0) {
            this.board[p] = EMPTY;
            for (let s of unique_captured) this.board[s] = opp;
            throw new IllegalMove("mossa suicida");
        }

        // Simplified hash update for JS limits
        // this.hash ^= this._zobrist[p][c];
        // for (let s of unique_captured) this.hash ^= this._zobrist[s][opp];

        this.ko_point = null;
        if (unique_captured.length === 1 && stones.length === 1 && libs.size === 1) {
            this.ko_point = unique_captured[0];
        }

        this.captures[c] += unique_captured.length;
        this.consecutive_passes = 0;
        this.last_move = p;
        this.move_history.push({ color: c, move: p });
        this.to_move = opp;
        return unique_captured;
    }

    is_game_over() {
        return this.consecutive_passes >= 2;
    }

    score() {
        let visited = new Uint8Array(this.n);
        let territory = { 1: 0, 2: 0 };
        let stones_count = { 1: 0, 2: 0 };

        for (let p = 0; p < this.n; p++) {
            if (this.board[p] === BLACK) stones_count[1]++;
            else if (this.board[p] === WHITE) stones_count[2]++;
        }

        for (let p = 0; p < this.n; p++) {
            if (this.board[p] !== EMPTY || visited[p]) continue;
            let region = [p];
            visited[p] = 1;
            let stack = [p];
            let borders = new Set<number>();
            while (stack.length > 0) {
                let cur = stack.pop()!;
                for (let q of this.neighbors[cur]) {
                    if (this.board[q] === EMPTY) {
                        if (!visited[q]) {
                            visited[q] = 1;
                            stack.push(q);
                            region.push(q);
                        }
                    } else {
                        borders.add(this.board[q]);
                    }
                }
            }
            if (borders.size === 1) {
                let owner = Array.from(borders)[0];
                territory[owner as 1|2] += region.length;
            }
        }

        return {
            black: stones_count[1] + territory[1],
            white: stones_count[2] + territory[2] + this.komi
        };
    }
}

// Patterns & Tactical Weights
const W_CAPTURE = 18.0;
const W_ESCAPE_ATARI = 14.0;
const W_ATARI_OPPONENT = 6.0;
const W_HANE = 5.5;
const W_CONNECT = 6.5;
const W_CUT = 5.0;
const W_LOCALITY = 2.0;
const W_LINE3_4 = 3.5;
const W_BASE = 1.0;
const PENALTY_SELF_ATARI = 0.005;
const PENALTY_FIRST_LINE_EARLY = 0.15;

// 9x9 Opening Book for expert early play
const OPENING_BOOK_9x9: { [pattern: string]: number[] } = {
    "EMPTY": [4*9+4, 2*9+2, 2*9+6, 6*9+2, 6*9+6, 2*9+3, 3*9+2, 5*9+6, 6*9+5], // Tengen (4,4) or 3-3 / 3-4
    // Opponent played Tengen (4,4) = 40
    "40": [2*9+4, 6*9+4, 4*9+2, 4*9+6, 2*9+2, 2*9+6, 6*9+2, 6*9+6, 3*9+5, 5*9+3],
    // Opponent played 3-3 (2,2) = 20
    "20": [4*9+4, 6*9+6, 2*9+6, 6*9+2, 5*9+5, 3*9+5],
    // Opponent played 3-3 (2,6) = 24
    "24": [4*9+4, 6*9+2, 2*9+2, 6*9+6, 5*9+3, 3*9+3],
    // Opponent played 3-3 (6,2) = 56
    "56": [4*9+4, 2*9+6, 2*9+2, 6*9+6, 3*9+5, 5*9+5],
    // Opponent played 3-3 (6,6) = 60
    "60": [4*9+4, 2*9+2, 2*9+6, 6*9+2, 3*9+3, 5*9+3],
};

export function move_score(board: Board, p: number, color: number, group_of: any, groups: any) {
    let score = W_BASE;
    let opp = other(color);
    let nb = board.neighbors[p];

    let captures_something = false;
    let escapes_atari = false;
    let puts_in_atari = false;
    let connects_groups = 0;
    let own_gids = new Set<number>();
    let opp_gids = new Set<number>();

    for (let q of nb) {
        let v = board.board[q];
        if (v === opp) {
            let gid = group_of[q];
            opp_gids.add(gid);
            let libs = groups[gid].libs;
            if (libs.size === 1) captures_something = true;
            else if (libs.size === 2 && libs.has(p)) puts_in_atari = true;
        } else if (v === color) {
            let gid = group_of[q];
            own_gids.add(gid);
            if (groups[gid].libs.size === 1) escapes_atari = true;
        }
    }

    if (captures_something) score += W_CAPTURE;
    if (puts_in_atari) score += W_ATARI_OPPONENT;
    if (escapes_atari) score += W_ESCAPE_ATARI;

    // Connecting 2 or more distinct friendly groups
    if (own_gids.size >= 2) {
        score += W_CONNECT * own_gids.size;
    }

    // Cutting 2 or more opponent groups (wedge/cut)
    if (opp_gids.size >= 2) {
        score += W_CUT * opp_gids.size;
    }

    // Hane recognition (bending around opponent stone diagonally adjacent with a friendly support)
    let [pr, pc] = board.to_xy(p);
    let diags = [[pr-1, pc-1], [pr-1, pc+1], [pr+1, pc-1], [pr+1, pc+1]];
    for (const d of diags) {
        const dr = d[0], dc = d[1];
        if (dr >= 0 && dr < board.size && dc >= 0 && dc < board.size) {
            let dp = dr * board.size + dc;
            if (board.board[dp] === opp && own_gids.size > 0) {
                score += W_HANE;
            }
        }
    }

    // Board position lines (3rd and 4th lines for territory & influence)
    let edge_r = Math.min(pr, board.size - 1 - pr);
    let edge_c = Math.min(pc, board.size - 1 - pc);
    let total_stones = board.move_history.length;

    if (total_stones < board.size * 2) {
        // Opening / Early game
        if (edge_r === 0 || edge_c === 0) {
            if (!captures_something && !escapes_atari) {
                score *= PENALTY_FIRST_LINE_EARLY; // Avoid 1st line in opening
            }
        } else if ((edge_r === 2 || edge_r === 3) && (edge_c === 2 || edge_c === 3)) {
            score += W_LINE3_4; // 3-3, 3-4, 4-4 star points
        }
    }

    if (board.last_move !== null) {
        let [lr, lc] = board.to_xy(board.last_move);
        let dist = Math.abs(lr - pr) + Math.abs(lc - pc);
        if (dist <= 2) score += W_LOCALITY / (dist + 1);
    }

    if (!captures_something) {
        let all_libs = new Set<number>();
        for (let q of nb) if (board.board[q] === EMPTY) all_libs.add(q);
        for (let gid of own_gids) {
            for (let lib of groups[gid].libs) all_libs.add(lib);
        }
        all_libs.delete(p);
        if (all_libs.size <= 1) score *= PENALTY_SELF_ATARI;
    }

    return Math.max(score, 0.001);
}

export function weighted_move_choice(board: Board, color: number, candidates: number[], group_of: any, groups: any) {
    if (candidates.length === 0) return null;
    let weights = candidates.map(p => move_score(board, p, color, group_of, groups));
    let total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
    let r = Math.random() * total;
    let upto = 0;
    for (let i = 0; i < candidates.length; i++) {
        upto += weights[i];
        if (upto >= r) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

export function move_priors(board: Board, color: number, candidates: number[], group_of: any, groups: any) {
    if (candidates.length === 0) return {};
    let raw: { [key: number]: number } = {};
    for (let p of candidates) raw[p] = move_score(board, p, color, group_of, groups);
    let total = Object.values(raw).reduce((a, b) => a + b, 0) || 1.0;
    let priors: { [key: number]: number } = {};
    for (let p in raw) priors[p] = raw[p] / total;
    return priors;
}

// MCTS
const RAVE_EQUIV = 800.0;
const UCT_C = 1.0;
const MAX_PLAYOUT_MOVES_FACTOR = 2.2;

class Node {
    move: number | null;
    parent: Node | null;
    children: { [key: number]: Node };
    N: number = 0;
    W: number = 0.0;
    RAVE_N: number = 0;
    RAVE_W: number = 0.0;
    prior: number;
    color: number;
    is_expanded: boolean = false;
    is_terminal: boolean = false;
    _pending_group_of: any;
    _pending_groups: any;

    constructor(move: number | null, parent: Node | null, color: number, prior = 0.0) {
        this.move = move;
        this.parent = parent;
        this.children = {};
        this.prior = prior;
        this.color = color;
    }

    q() { return this.N > 0 ? this.W / this.N : 0.0; }
    rave_q() { return this.RAVE_N > 0 ? this.RAVE_W / this.RAVE_N : 0.0; }

    uct_rave_value(parent_N: number) {
        let beta = (this.N > 0 || this.RAVE_N > 0) ? Math.sqrt(RAVE_EQUIV / (3 * this.N + RAVE_EQUIV)) : 1.0;
        let value = (1 - beta) * this.q() + beta * this.rave_q();
        let explore = UCT_C * Math.sqrt(Math.log(parent_N + 1) / (this.N + 1));
        let prior_bonus = this.prior / (1 + this.N);
        return value + explore + prior_bonus;
    }
}

export class MCTSEngine {
    board_size: number;
    komi: number;
    _last_stats: any;

    root: any = null;

    constructor(board_size = 9, komi = 7.5) {
        this.board_size = board_size;
        this.komi = komi;
    }

    update_root(move: number | null) {
        if (this.root && move !== null && this.root.children[move]) {
             this.root = this.root.children[move];
             this.root.parent = null;
        } else {
             this.root = null;
        }
    }

    ponder(board: Board, color: number, chunk_size = 1) {
        if (!this.root) {
            this.root = new Node(null, null, other(color));
            // removed untried
        }
        if (this.root.is_terminal) return;
        
        for (let i = 0; i < chunk_size; i++) {
            this._simulate_once(this.root, board, color);
        }
    }

    get_move(board: Board, color: number, time_budget = 5.0, min_simulations = 1, max_simulations = 200000) {
        // Instant opening moves for all board sizes on early moves (move history <= 3)
        if (board.move_history.length <= 3) {
            if (this.board_size === 19) {
                const starPoints19 = [
                    3*19+15, 15*19+15, 3*19+3, 15*19+3,
                    2*19+15, 3*19+16, 15*19+16, 16*19+15,
                    2*19+3, 3*19+2, 15*19+2, 16*19+3,
                    9*19+9
                ];
                const freeCorners = starPoints19.slice(0, 4).filter(p => board.board[p] === EMPTY);
                if (freeCorners.length > 0) {
                    return freeCorners[Math.floor(Math.random() * freeCorners.length)];
                }
                const freeOther = starPoints19.filter(p => board.board[p] === EMPTY);
                if (freeOther.length > 0) {
                    return freeOther[Math.floor(Math.random() * freeOther.length)];
                }
            } else if (this.board_size === 13) {
                const starPoints13 = [
                    3*13+9, 9*13+9, 3*13+3, 9*13+3,
                    2*13+9, 3*13+10, 9*13+10, 10*13+9,
                    6*13+6
                ];
                const freeCorners = starPoints13.slice(0, 4).filter(p => board.board[p] === EMPTY);
                if (freeCorners.length > 0) {
                    return freeCorners[Math.floor(Math.random() * freeCorners.length)];
                }
                const freeOther = starPoints13.filter(p => board.board[p] === EMPTY);
                if (freeOther.length > 0) {
                    return freeOther[Math.floor(Math.random() * freeOther.length)];
                }
            } else if (this.board_size === 9 && board.move_history.length <= 1) {
                let key = board.move_history.length === 0 ? "EMPTY" : (board.move_history[0].move !== null ? String(board.move_history[0].move) : "EMPTY");
                if (OPENING_BOOK_9x9[key]) {
                    let options = OPENING_BOOK_9x9[key].filter(p => board.board[p] === EMPTY);
                    if (options.length > 0) {
                        return options[Math.floor(Math.random() * options.length)];
                    }
                }
            }
        }

        if (!this.root) {
            this.root = new Node(null, null, other(color));
            // removed untried
        }

        if (this.root.is_terminal) return null;

        let start = Date.now();
        let deadline = start + time_budget * 1000;
        let sims = 0;

        while (sims < max_simulations) {
            if (sims >= min_simulations && Date.now() >= deadline) break;
            this._simulate_once(this.root, board, color);
            sims++;
        }

        let best_move: number | null = null;
        let max_n = -1;
        let max_q = -Infinity;

        // Collect all moves with max N to break ties with Q (win rate)
        let candidates: string[] = [];
        for (let m in this.root.children) {
            let child = this.root.children[m as any];
            if (child.N > max_n) {
                max_n = child.N;
                candidates = [m];
            } else if (child.N === max_n) {
                candidates.push(m);
            }
        }
        
        if (candidates.length > 0) {
            // Break ties using Q and then randomly
            for (let m of candidates) {
                let child = this.root.children[m];
                let q = child.q();
                // add slight random noise to strictly equal Qs
                q += (Math.random() * 1e-6); 
                if (q > max_q) {
                    max_q = q;
                    best_move = Number(m);
                }
            }
        }
        
        let children_arr = Object.entries(this.root.children).sort((a: any, b: any) => b[1].N - a[1].N).slice(0, 8);
        this._last_stats = {
            simulations: sims,
            children: children_arr.map(([m, n]: [any, any]) => [board.coord_str(Number(m)), n.N, (n.q()).toFixed(3)])
        };

        return best_move === -1 ? null : best_move;
    }

    _candidate_moves(board: Board, color: number) {
        let res = board.legal_moves_fast(color, false);
        if (res.moves.length === 0) {
            res = board.legal_moves_fast(color, true);
        }
        return res;
    }

    _simulate_once(root: Node, board: Board, root_color: number) {
        let working = board.copy();
        let path = [root];
        let node = root;
        let color = root_color;
        let moves_played_this_sim: [number, number | null][] = [];

        while (true) {
            if (!node.is_expanded && !node.is_terminal) {
                let { moves, group_of, groups } = this._candidate_moves(working, color);
                let priors = move_priors(working, color, moves, group_of, groups);
                
                let added = 0;
                if (moves.length === 0) {
                    node.children[-1] = new Node(null, node, color, 1.0);
                    added++;
                } else {
                    for (let move of moves) {
                        node.children[move] = new Node(move, node, color, priors[move] || 0.0);
                        added++;
                    }
                }
                
                node.is_expanded = true;
                if (added === 0) {
                    node.is_terminal = true;
                }
            }

            if (Object.keys(node.children).length > 0) {
                let best_val = -Infinity;
                let best_m: string | null = null;
                for (let m in node.children) {
                    let val = node.children[m].uct_rave_value(node.N || 1);
                    if (val > best_val) {
                        best_val = val;
                        best_m = m;
                    }
                }
                
                let move = best_m !== null ? Number(best_m) : null;
                if (move === -1) move = null; // pass

                try {
                    working.play(move, color);
                } catch(e) {
                    if (e instanceof IllegalMove) {
                        if (best_m !== null) delete node.children[best_m as any];
                        continue;
                    }
                    throw e;
                }
                
                moves_played_this_sim.push([color, move]);
                let next_node = node.children[best_m as any];
                path.push(next_node);
                node = next_node;
                color = other(color);
                
                if (node.N === 0) {
                    break;
                }
            } else {
                node.is_terminal = true;
                break;
            }

            if (working.is_game_over()) {
                break;
            }
        }
        
        let rollout_moves = this._rollout(working, color);
        for (let m of rollout_moves) moves_played_this_sim.push(m);

        let { black, white } = working.score();
        let result_for_black = black > white ? 1.0 : 0.0;
        
        let all_moves_by_color = { 1: new Set<number>(), 2: new Set<number>() };
        for (const pair of moves_played_this_sim) {
            const mv_color = pair[0], mv = pair[1];
            if (mv !== null) all_moves_by_color[mv_color as 1|2].add(mv);
        }

        for (let n of path) {
            n.N++;
            let val = n.color === BLACK ? result_for_black : 1.0 - result_for_black;
            n.W += val;
            
            for (let m in n.children) {
                let m_num = Number(m);
                let child = n.children[m_num];
                if (m_num !== null && all_moves_by_color[child.color as 1|2].has(m_num)) {
                    child.RAVE_N++;
                    let c_val = child.color === BLACK ? result_for_black : 1.0 - result_for_black;
                    child.RAVE_W += c_val;
                }
            }
        }
    }

    _rollout(working: Board, color: number, max_moves?: number): [number, number | null][] {
        let moves_played: [number, number | null][] = [];
        max_moves = max_moves || Math.min(working.size === 19 ? 35 : (working.size === 13 ? 45 : 70), Math.floor(working.n * MAX_PLAYOUT_MOVES_FACTOR));
        let count = 0;
        while (!working.is_game_over() && count < max_moves) {
            let { moves: candidates, group_of, groups } = working.legal_moves_fast(color, false);
            if (candidates.length === 0) {
                try {
                    working.play(null, color);
                } catch(e) {}
                moves_played.push([color, null]);
            } else {
                let move = weighted_move_choice(working, color, candidates, group_of, groups);
                try {
                    working.play(move, color);
                    moves_played.push([color, move]);
                } catch(e) {
                    if (e instanceof IllegalMove) {
                        try {
                            working.play(null, color);
                            moves_played.push([color, null]);
                        } catch(e2) {
                            break;
                        }
                    } else throw e;
                }
            }
            color = other(color);
            count++;
        }
        return moves_played;
    }
}
