import {
  BoardId,
  BoardState,
  Color,
  DroppablePieceType,
  GameState,
  PieceType,
  PromotionPieceType,
  oppositeColor,
} from './types.js';
import {
  colOf,
  getAllLegalChessMoves,
  getLegalDropSquares,
  getLegalDuckSquares,
  inBounds,
  rowOf,
  toSquare,
} from './engine.js';

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const DROPPABLE_TYPES: DroppablePieceType[] = ['q', 'r', 'b', 'n', 'p'];

function findKingSquare(board: BoardState, color: Color): number {
  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (p && p.type === 'k' && p.color === color) return sq;
  }
  return -1;
}

function getRaySquaresBetween(from: number, to: number): number[] {
  const r1 = rowOf(from);
  const c1 = colOf(from);
  const r2 = rowOf(to);
  const c2 = colOf(to);
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);

  const isStraight = r1 === r2 || c1 === c2;
  const isDiag = Math.abs(r2 - r1) === Math.abs(c2 - c1);
  if (!isStraight && !isDiag) return [];

  const squares: number[] = [];
  let r = r1 + dr;
  let c = c1 + dc;
  while (r !== r2 || c !== c2) {
    if (!inBounds(r, c)) return [];
    squares.push(toSquare(r, c));
    r += dr;
    c += dc;
  }
  return squares;
}

function isSquareAttackedBy(board: BoardState, targetSq: number, attackerColor: Color, duckOverride?: number | null): boolean {
  const duck = duckOverride !== undefined ? duckOverride : board.duckSquare;
  const tr = rowOf(targetSq);
  const tc = colOf(targetSq);

  // Pawn attacks
  const pawnDir = attackerColor === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = tr + pawnDir;
    const pc = tc + dc;
    if (inBounds(pr, pc)) {
      const p = board.squares[toSquare(pr, pc)];
      if (p && p.color === attackerColor && p.type === 'p') return true;
    }
  }

  // Knight attacks
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightOffsets) {
    const nr = tr + dr;
    const nc = tc + dc;
    if (inBounds(nr, nc)) {
      const p = board.squares[toSquare(nr, nc)];
      if (p && p.color === attackerColor && p.type === 'n') return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = tr + dr;
      const nc = tc + dc;
      if (inBounds(nr, nc)) {
        const p = board.squares[toSquare(nr, nc)];
        if (p && p.color === attackerColor && p.type === 'k') return true;
      }
    }
  }

  // Sliding attacks (Rook/Queen straight, Bishop/Queen diag)
  const straightDirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of straightDirs) {
    let nr = tr + dr;
    let nc = tc + dc;
    while (inBounds(nr, nc)) {
      const sq = toSquare(nr, nc);
      if (sq === duck) break;
      const p = board.squares[sq];
      if (p) {
        if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  const diagDirs: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let nr = tr + dr;
    let nc = tc + dc;
    while (inBounds(nr, nc)) {
      const sq = toSquare(nr, nc);
      if (sq === duck) break;
      const p = board.squares[sq];
      if (p) {
        if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return false;
}

export type BotAction =
  | { kind: 'move'; boardId: BoardId; from: number; to: number; promotion?: PromotionPieceType }
  | { kind: 'drop'; boardId: BoardId; pieceType: DroppablePieceType; to: number }
  | { kind: 'duck'; boardId: BoardId; to: number };

function centerBonus(sq: number): number {
  const r = rowOf(sq);
  const c = colOf(sq);
  const dr = Math.abs(3.5 - r);
  const dc = Math.abs(3.5 - c);
  return (4 - dr) * 6 + (4 - dc) * 6;
}

export function chooseBotAction(game: GameState, boardId: BoardId): BotAction | null {
  if (game.status !== 'playing') return null;
  const board = game.boards[boardId];
  const color = board.turn;
  const enemy = oppositeColor(color);

  if (board.phase === 'chess') {
    const candidates: { action: BotAction; score: number }[] = [];
    const enemyKingSq = findKingSquare(board, enemy);
    const ownKingSq = findKingSquare(board, color);
    const ownKingInDanger = ownKingSq >= 0 && isSquareAttackedBy(board, ownKingSq, enemy);

    // 1. Evaluate board moves
    const legalMoves = getAllLegalChessMoves(board);
    for (const move of legalMoves) {
      const moving = board.squares[move.from]!;
      const target = board.squares[move.to];
      let score = centerBonus(move.to) * 0.4 + Math.random() * 18;

      if (target) {
        if (target.type === 'k') {
          return { kind: 'move', boardId, from: move.from, to: move.to, promotion: move.isPromotion ? 'q' : undefined };
        }
        score += PIECE_VALUES[target.type] * 1.3 - PIECE_VALUES[moving.type] * 0.25;
      }

      if (move.isPromotion) {
        score += 750;
      }

      if (move.isCastle) {
        score += 80;
      }

      // Encourage moving king out of danger
      if (moving.type === 'k' && ownKingInDanger) {
        if (!isSquareAttackedBy(board, move.to, enemy)) {
          score += 650;
        }
      }

      // Avoid moving into an attacked square with valuable pieces unless capturing higher value
      if (isSquareAttackedBy(board, move.to, enemy)) {
        score -= PIECE_VALUES[moving.type] * 0.55;
      }

      // Bonus for attacking near enemy king
      if (enemyKingSq >= 0) {
        const dist = Math.abs(rowOf(move.to) - rowOf(enemyKingSq)) + Math.abs(colOf(move.to) - colOf(enemyKingSq));
        score += Math.max(0, 6 - dist) * 10;
      }

      candidates.push({
        action: {
          kind: 'move',
          boardId,
          from: move.from,
          to: move.to,
          promotion: move.isPromotion ? 'q' : undefined,
        },
        score,
      });
    }

    // 2. Evaluate bughouse pocket drops
    for (const pieceType of DROPPABLE_TYPES) {
      if (board.pockets[color][pieceType] <= 0) continue;
      const dropSquares = getLegalDropSquares(board, pieceType);
      // Sample up to 24 squares prioritizing squares near enemy king / center
      for (const sq of dropSquares) {
        let score = 40 + PIECE_VALUES[pieceType] * 0.22 + centerBonus(sq) * 0.5 + Math.random() * 20;

        if (enemyKingSq >= 0) {
          const dist = Math.abs(rowOf(sq) - rowOf(enemyKingSq)) + Math.abs(colOf(sq) - colOf(enemyKingSq));
          score += Math.max(0, 7 - dist) * 26;
        }

        if (isSquareAttackedBy(board, sq, enemy)) {
          score -= PIECE_VALUES[pieceType] * 0.85;
        }

        // Dropping to block an attack on own king
        if (ownKingInDanger && ownKingSq >= 0) {
          const distToOwnKing = Math.abs(rowOf(sq) - rowOf(ownKingSq)) + Math.abs(colOf(sq) - colOf(ownKingSq));
          if (distToOwnKing <= 2) {
            score += 180;
          }
        }

        candidates.push({
          action: { kind: 'drop', boardId, pieceType, to: sq },
          score,
        });
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].action;
  }

  // Phase === 'duck'
  const legalDuckSquares = getLegalDuckSquares(board);
  if (legalDuckSquares.length === 0) return null;

  const ownKingSq = findKingSquare(board, color);
  const enemyKingSq = findKingSquare(board, enemy);
  const ownKingAttackedNow = ownKingSq >= 0 && isSquareAttackedBy(board, ownKingSq, enemy, null);

  let bestSq = legalDuckSquares[0];
  let bestScore = -Infinity;

  // Find enemy sliders for disruptive duck placement
  const enemySliders: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (p && p.color === enemy && (p.type === 'q' || p.type === 'r' || p.type === 'b')) {
      enemySliders.push(sq);
    }
  }

  for (const sq of legalDuckSquares) {
    let score = centerBonus(sq) * 0.45 + Math.random() * 14;

    // Top priority: block an active attack on our own king!
    if (ownKingAttackedNow && ownKingSq >= 0) {
      if (!isSquareAttackedBy(board, ownKingSq, enemy, sq)) {
        score += 1200;
      }
    }

    // Disrupt enemy sliders by sitting next to them or between them and our king
    for (const sliderSq of enemySliders) {
      if (ownKingSq >= 0) {
        const between = getRaySquaresBetween(sliderSq, ownKingSq);
        if (between.includes(sq)) {
          score += 240;
        }
      }
      const dist = Math.max(Math.abs(rowOf(sq) - rowOf(sliderSq)), Math.abs(colOf(sq) - colOf(sliderSq)));
      if (dist === 1) {
        score += 75;
      }
    }

    // Slightly prefer squares near enemy king to cramp escape squares
    if (enemyKingSq >= 0) {
      const distToEnemyKing = Math.max(Math.abs(rowOf(sq) - rowOf(enemyKingSq)), Math.abs(colOf(sq) - colOf(enemyKingSq)));
      if (distToEnemyKing === 1) {
        score += 95;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestSq = sq;
    }
  }

  return { kind: 'duck', boardId, to: bestSq };
}
