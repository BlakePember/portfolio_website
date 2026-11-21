import {
  BoardId,
  BoardState,
  Color,
  DroppablePieceType,
  GameState,
  Piece,
  PieceType,
  PocketCounts,
  PromotionPieceType,
  TeamId,
  TimeControl,
  TIME_CONTROLS,
  getSeatKey,
  getSeatTeam,
  oppositeColor,
  otherBoard,
} from './types.js';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

export function rowOf(sq: number): number {
  return Math.floor(sq / 8);
}

export function colOf(sq: number): number {
  return sq % 8;
}

export function toSquare(row: number, col: number): number {
  return row * 8 + col;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function squareToAlgebraic(sq: number): string {
  return `${FILES[colOf(sq)]}${RANKS[rowOf(sq)]}`;
}

export function algebraicToSquare(alg: string): number {
  const file = FILES.indexOf(alg[0] as (typeof FILES)[number]);
  const rank = RANKS.indexOf(alg[1] as (typeof RANKS)[number]);
  if (file < 0 || rank < 0) return -1;
  return toSquare(rank, file);
}

export function createEmptyPocket(): PocketCounts {
  return { p: 0, n: 0, b: 0, r: 0, q: 0 };
}

export function createInitialBoard(id: BoardId): BoardState {
  const squares: (Piece | null)[] = Array(64).fill(null);
  const backRank: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

  for (let c = 0; c < 8; c++) {
    squares[toSquare(0, c)] = { type: backRank[c], color: 'b' };
    squares[toSquare(1, c)] = { type: 'p', color: 'b' };
    squares[toSquare(6, c)] = { type: 'p', color: 'w' };
    squares[toSquare(7, c)] = { type: backRank[c], color: 'w' };
  }

  return {
    id,
    squares,
    duckSquare: null,
    turn: 'w',
    phase: 'chess',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    pockets: {
      w: createEmptyPocket(),
      b: createEmptyPocket(),
    },
    lastMove: null,
    lastDuckMove: null,
    moveHistory: [],
  };
}

export function createInitialGame(
  timeControl: TimeControl = TIME_CONTROLS[2],
  status: 'waiting' | 'playing' = 'waiting'
): GameState {
  const now = status === 'playing' ? Date.now() : null;
  return {
    boards: {
      A: createInitialBoard('A'),
      B: createInitialBoard('B'),
    },
    clocks: {
      A_w: timeControl.initialMs,
      A_b: timeControl.initialMs,
      B_w: timeControl.initialMs,
      B_b: timeControl.initialMs,
    },
    status,
    winnerTeam: null,
    winReason: null,
    winningBoard: null,
    startedAt: now,
    lastClockTickAt: now,
  };
}

export function cloneGameState(state: GameState): GameState {
  return structuredClone(state);
}

export interface LegalChessMove {
  from: number;
  to: number;
  isCapture: boolean;
  isEnPassant?: boolean;
  isCastle?: 'K' | 'Q';
  isPromotion?: boolean;
}

/**
 * Generates all legal chess moves for a specific square on a board.
 * Official Duck Chess rules:
 * - No check or checkmate restrictions (you win by capturing the enemy king).
 * - No piece can land on the duck.
 * - Sliding pieces, 2-square pawn pushes, and castling cannot pass through the duck.
 * - Knights can jump over the duck.
 */
export function getLegalMovesForSquare(board: BoardState, from: number): LegalChessMove[] {
  if (board.phase !== 'chess') return [];
  const piece = board.squares[from];
  if (!piece || piece.color !== board.turn) return [];

  const moves: LegalChessMove[] = [];
  const r = rowOf(from);
  const c = colOf(from);
  const color = piece.color;
  const enemy = oppositeColor(color);
  const duck = board.duckSquare;

  const isEmpty = (sq: number) => board.squares[sq] === null && sq !== duck;

  if (piece.type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;

    // 1 square forward
    const r1 = r + dir;
    if (inBounds(r1, c)) {
      const sq1 = toSquare(r1, c);
      if (isEmpty(sq1)) {
        moves.push({
          from,
          to: sq1,
          isCapture: false,
          isPromotion: r1 === promoRow,
        });
        // 2 squares forward from start rank
        const r2 = r + 2 * dir;
        if (r === startRow && inBounds(r2, c)) {
          const sq2 = toSquare(r2, c);
          if (isEmpty(sq2)) {
            moves.push({ from, to: sq2, isCapture: false });
          }
        }
      }
    }

    // Diagonal captures & en passant
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const targetSq = toSquare(nr, nc);
      if (targetSq === duck) continue;
      const targetPiece = board.squares[targetSq];
      if (targetPiece && targetPiece.color === enemy) {
        moves.push({
          from,
          to: targetSq,
          isCapture: true,
          isPromotion: nr === promoRow,
        });
      } else if (board.enPassant !== null && targetSq === board.enPassant) {
        const capturedPawnSq = toSquare(r, nc);
        const capPiece = board.squares[capturedPawnSq];
        if (capPiece && capPiece.type === 'p' && capPiece.color === enemy) {
          moves.push({
            from,
            to: targetSq,
            isCapture: true,
            isEnPassant: true,
          });
        }
      }
    }
  } else if (piece.type === 'n') {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of offsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const targetSq = toSquare(nr, nc);
      if (targetSq === duck) continue;
      const target = board.squares[targetSq];
      if (!target || target.color === enemy) {
        moves.push({ from, to: targetSq, isCapture: Boolean(target) });
      }
    }
  } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
    const dirs: [number, number][] = [];
    if (piece.type === 'b' || piece.type === 'q') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (piece.type === 'r' || piece.type === 'q') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }

    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const targetSq = toSquare(nr, nc);
        if (targetSq === duck) break; // Duck blocks sliding pieces
        const target = board.squares[targetSq];
        if (!target) {
          moves.push({ from, to: targetSq, isCapture: false });
        } else {
          if (target.color === enemy) {
            moves.push({ from, to: targetSq, isCapture: true });
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  } else if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const targetSq = toSquare(nr, nc);
        if (targetSq === duck) continue;
        const target = board.squares[targetSq];
        if (!target || target.color === enemy) {
          moves.push({ from, to: targetSq, isCapture: Boolean(target) });
        }
      }
    }

    // Castling (Duck Chess: no check restriction, just unmoved king/rook & clear path with no duck)
    if (color === 'w' && from === 60) {
      if (
        board.castling.wK &&
        board.squares[63]?.type === 'r' &&
        board.squares[63]?.color === 'w' &&
        isEmpty(61) &&
        isEmpty(62)
      ) {
        moves.push({ from, to: 62, isCapture: false, isCastle: 'K' });
      }
      if (
        board.castling.wQ &&
        board.squares[56]?.type === 'r' &&
        board.squares[56]?.color === 'w' &&
        isEmpty(59) &&
        isEmpty(58) &&
        isEmpty(57)
      ) {
        moves.push({ from, to: 58, isCapture: false, isCastle: 'Q' });
      }
    } else if (color === 'b' && from === 4) {
      if (
        board.castling.bK &&
        board.squares[7]?.type === 'r' &&
        board.squares[7]?.color === 'b' &&
        isEmpty(5) &&
        isEmpty(6)
      ) {
        moves.push({ from, to: 6, isCapture: false, isCastle: 'K' });
      }
      if (
        board.castling.bQ &&
        board.squares[0]?.type === 'r' &&
        board.squares[0]?.color === 'b' &&
        isEmpty(3) &&
        isEmpty(2) &&
        isEmpty(1)
      ) {
        moves.push({ from, to: 2, isCapture: false, isCastle: 'Q' });
      }
    }
  }

  return moves;
}

export function getAllLegalChessMoves(board: BoardState): LegalChessMove[] {
  if (board.phase !== 'chess') return [];
  const all: LegalChessMove[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (p && p.color === board.turn) {
      all.push(...getLegalMovesForSquare(board, sq));
    }
  }
  return all;
}

/**
 * Generates all legal squares where the current player can drop a pocket piece.
 * Bughouse + Duck rules:
 * - Square must be empty AND not occupied by the duck.
 * - Pawns cannot be dropped on rank 1 (row 7) or rank 8 (row 0).
 */
export function getLegalDropSquares(board: BoardState, pieceType: DroppablePieceType): number[] {
  if (board.phase !== 'chess') return [];
  if (board.pockets[board.turn][pieceType] <= 0) return [];

  const targets: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    if (board.squares[sq] !== null || sq === board.duckSquare) continue;
    if (pieceType === 'p') {
      const r = rowOf(sq);
      if (r === 0 || r === 7) continue;
    }
    targets.push(sq);
  }
  return targets;
}

/**
 * Generates all legal squares where the duck can be placed/moved during the duck phase.
 * Official Duck Chess rule:
 * - Must be an empty square.
 * - Must be a DIFFERENT square from where the duck currently sits.
 */
export function getLegalDuckSquares(board: BoardState): number[] {
  if (board.phase !== 'duck') return [];
  const targets: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    if (board.squares[sq] === null && sq !== board.duckSquare) {
      targets.push(sq);
    }
  }
  return targets;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  state: GameState;
  captured?: PieceType;
  kingCaptured?: boolean;
  partnerReceived?: { boardId: BoardId; color: Color; pieceType: DroppablePieceType };
}

function formatChessNotation(
  pieceType: PieceType,
  from: number,
  to: number,
  isCapture: boolean,
  isCastle?: 'K' | 'Q',
  promotion?: PromotionPieceType
): string {
  if (isCastle === 'K') return 'O-O';
  if (isCastle === 'Q') return 'O-O-O';
  const pieceLetter = pieceType === 'p' ? '' : pieceType.toUpperCase();
  const fromFile = pieceType === 'p' && isCapture ? FILES[colOf(from)] : '';
  const cap = isCapture ? 'x' : '';
  const dest = squareToAlgebraic(to);
  const promo = promotion ? `=${promotion.toUpperCase()}` : '';
  return `${pieceLetter}${fromFile}${cap}${dest}${promo}`;
}

function revokeCastlingForSquare(castling: BoardState['castling'], sq: number) {
  if (sq === 60) {
    castling.wK = false;
    castling.wQ = false;
  } else if (sq === 4) {
    castling.bK = false;
    castling.bQ = false;
  } else if (sq === 63) {
    castling.wK = false;
  } else if (sq === 56) {
    castling.wQ = false;
  } else if (sq === 7) {
    castling.bK = false;
  } else if (sq === 0) {
    castling.bQ = false;
  }
}

export function applyChessMove(
  gameState: GameState,
  boardId: BoardId,
  from: number,
  to: number,
  promotion: PromotionPieceType = 'q',
  now: number = Date.now()
): ActionResult {
  if (gameState.status !== 'playing') {
    return { ok: false, error: 'Game is not in progress.', state: gameState };
  }

  const next = cloneGameState(gameState);
  syncClocksInPlace(next, now);
  if (next.status !== 'playing') {
    return { ok: false, error: 'Time expired.', state: next };
  }

  const board = next.boards[boardId];
  if (board.phase !== 'chess') {
    return { ok: false, error: 'You must move the duck before making another chess move.', state: gameState };
  }

  const legal = getLegalMovesForSquare(board, from).find((m) => m.to === to);
  if (!legal) {
    return { ok: false, error: 'Illegal move.', state: gameState };
  }

  const movingPiece = board.squares[from]!;
  const color = movingPiece.color;

  // Determine captured piece
  let capturedPiece: Piece | null = board.squares[to];
  let capturedSquare = to;
  if (legal.isEnPassant) {
    capturedSquare = toSquare(rowOf(from), colOf(to));
    capturedPiece = board.squares[capturedSquare];
  }

  // Execute move on board
  board.squares[from] = null;
  if (legal.isEnPassant) {
    board.squares[capturedSquare] = null;
  }

  const finalPromotion: PromotionPieceType | undefined = legal.isPromotion ? promotion : undefined;
  board.squares[to] = finalPromotion
    ? { type: finalPromotion, color, promoted: true }
    : { ...movingPiece };

  // Castling rook movement
  if (legal.isCastle === 'K') {
    if (color === 'w') {
      board.squares[61] = board.squares[63];
      board.squares[63] = null;
    } else {
      board.squares[5] = board.squares[7];
      board.squares[7] = null;
    }
  } else if (legal.isCastle === 'Q') {
    if (color === 'w') {
      board.squares[59] = board.squares[56];
      board.squares[56] = null;
    } else {
      board.squares[3] = board.squares[0];
      board.squares[0] = null;
    }
  }

  // Update castling rights
  revokeCastlingForSquare(board.castling, from);
  revokeCastlingForSquare(board.castling, to);

  // Update en passant square
  if (movingPiece.type === 'p' && Math.abs(rowOf(to) - rowOf(from)) === 2) {
    board.enPassant = toSquare((rowOf(from) + rowOf(to)) / 2, colOf(from));
  } else {
    board.enPassant = null;
  }

  const notation = formatChessNotation(
    movingPiece.type,
    from,
    to,
    Boolean(capturedPiece),
    legal.isCastle,
    finalPromotion
  );

  board.lastMove = {
    from,
    to,
    pieceType: finalPromotion ?? movingPiece.type,
    color,
    captured: capturedPiece?.type,
  };

  board.moveHistory.push({
    ply: board.moveHistory.length + 1,
    color,
    kind: 'move',
    from,
    to,
    pieceType: movingPiece.type,
    capturedType: capturedPiece?.type,
    promotion: finalPromotion,
    notation,
  });

  // Check King capture -> Immediate team win!
  if (capturedPiece && capturedPiece.type === 'k') {
    const winningSeat = getSeatKey(boardId, color);
    next.status = 'finished';
    next.winnerTeam = getSeatTeam(winningSeat);
    next.winReason = 'king_capture';
    next.winningBoard = boardId;
    return {
      ok: true,
      state: next,
      captured: 'k',
      kingCaptured: true,
    };
  }

  // Bughouse partner pocket transfer
  let partnerReceived: ActionResult['partnerReceived'];
  if (capturedPiece) {
    const partnerBoardId = otherBoard(boardId);
    // Partner plays the opposite color on the other board!
    const partnerColor = oppositeColor(color);
    const pocketPieceType: DroppablePieceType = capturedPiece.promoted
      ? 'p'
      : (capturedPiece.type as DroppablePieceType);
    next.boards[partnerBoardId].pockets[partnerColor][pocketPieceType] += 1;
    partnerReceived = {
      boardId: partnerBoardId,
      color: partnerColor,
      pieceType: pocketPieceType,
    };
  }

  // Transition to Duck phase on this board (same player's turn!)
  // Edge case safety: if somehow there are 0 legal duck squares, skip duck phase
  board.phase = 'duck';
  if (getLegalDuckSquares(board).length === 0) {
    board.phase = 'chess';
    board.turn = oppositeColor(color);
  }

  return {
    ok: true,
    state: next,
    captured: capturedPiece?.type,
    partnerReceived,
  };
}

export function applyDropMove(
  gameState: GameState,
  boardId: BoardId,
  pieceType: DroppablePieceType,
  to: number,
  now: number = Date.now()
): ActionResult {
  if (gameState.status !== 'playing') {
    return { ok: false, error: 'Game is not in progress.', state: gameState };
  }

  const next = cloneGameState(gameState);
  syncClocksInPlace(next, now);
  if (next.status !== 'playing') {
    return { ok: false, error: 'Time expired.', state: next };
  }

  const board = next.boards[boardId];
  if (board.phase !== 'chess') {
    return { ok: false, error: 'You must move the duck first.', state: gameState };
  }

  const legalDrops = getLegalDropSquares(board, pieceType);
  if (!legalDrops.includes(to)) {
    return { ok: false, error: 'Illegal drop square.', state: gameState };
  }

  const color = board.turn;
  board.pockets[color][pieceType] -= 1;
  board.squares[to] = { type: pieceType, color, promoted: false };
  board.enPassant = null;

  const piecePrefix = pieceType === 'p' ? 'P' : pieceType.toUpperCase();
  const notation = `${piecePrefix}@${squareToAlgebraic(to)}`;

  board.lastMove = {
    from: 'drop',
    to,
    pieceType,
    color,
  };

  board.moveHistory.push({
    ply: board.moveHistory.length + 1,
    color,
    kind: 'drop',
    from: 'drop',
    to,
    pieceType,
    notation,
  });

  board.phase = 'duck';
  if (getLegalDuckSquares(board).length === 0) {
    board.phase = 'chess';
    board.turn = oppositeColor(color);
  }

  return { ok: true, state: next };
}

export function applyDuckMove(
  gameState: GameState,
  boardId: BoardId,
  to: number,
  incrementMs: number = 0,
  now: number = Date.now()
): ActionResult {
  if (gameState.status !== 'playing') {
    return { ok: false, error: 'Game is not in progress.', state: gameState };
  }

  const next = cloneGameState(gameState);
  syncClocksInPlace(next, now);
  if (next.status !== 'playing') {
    return { ok: false, error: 'Time expired.', state: next };
  }

  const board = next.boards[boardId];
  if (board.phase !== 'duck') {
    return { ok: false, error: 'Make your chess move or piece drop before moving the duck.', state: gameState };
  }

  if (to < 0 || to > 63 || board.squares[to] !== null || to === board.duckSquare) {
    return { ok: false, error: 'The duck must move to a different empty square.', state: gameState };
  }

  const prevDuck = board.duckSquare;
  const moverColor = board.turn;
  board.duckSquare = to;
  board.lastDuckMove = { from: prevDuck, to };

  // Annotate last history record with duck destination
  const lastRecord = board.moveHistory[board.moveHistory.length - 1];
  if (lastRecord) {
    lastRecord.duckTo = to;
    lastRecord.notation = `${lastRecord.notation} 🦆${squareToAlgebraic(to)}`;
  }

  // Add Fischer increment after completing full turn
  if (incrementMs > 0) {
    const seat = getSeatKey(boardId, moverColor);
    next.clocks[seat] += incrementMs;
  }

  board.turn = oppositeColor(moverColor);
  board.phase = 'chess';

  return { ok: true, state: next };
}

/**
 * Updates active clocks for both boards based on elapsed time since lastClockTickAt.
 * If any player runs out of time, ends the match and awards victory to the opposing team.
 */
export function syncClocksInPlace(state: GameState, now: number = Date.now()): boolean {
  if (state.status !== 'playing') return false;
  if (state.lastClockTickAt === null) {
    state.lastClockTickAt = now;
    return false;
  }

  const elapsed = Math.max(0, now - state.lastClockTickAt);
  if (elapsed === 0) return false;
  state.lastClockTickAt = now;

  const activeSeatA = getSeatKey('A', state.boards.A.turn);
  const activeSeatB = getSeatKey('B', state.boards.B.turn);

  state.clocks[activeSeatA] = Math.max(0, state.clocks[activeSeatA] - elapsed);
  state.clocks[activeSeatB] = Math.max(0, state.clocks[activeSeatB] - elapsed);

  if (state.clocks[activeSeatA] <= 0 || state.clocks[activeSeatB] <= 0) {
    const flaggedSeat = state.clocks[activeSeatA] <= 0 ? activeSeatA : activeSeatB;
    const losingTeam = getSeatTeam(flaggedSeat);
    const winningTeam: TeamId = losingTeam === 1 ? 2 : 1;
    state.status = 'finished';
    state.winnerTeam = winningTeam;
    state.winReason = 'timeout';
    state.winningBoard = flaggedSeat.startsWith('A') ? 'A' : 'B';
    return true;
  }

  return false;
}

export function resignGame(gameState: GameState, resigningTeam: TeamId, boardId: BoardId): GameState {
  const next = cloneGameState(gameState);
  if (next.status !== 'playing') return next;
  next.status = 'finished';
  next.winnerTeam = resigningTeam === 1 ? 2 : 1;
  next.winReason = 'resignation';
  next.winningBoard = boardId;
  return next;
}
