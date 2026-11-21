import { describe, it, expect } from 'vitest';
import {
  algebraicToSquare,
  applyChessMove,
  applyDropMove,
  applyDuckMove,
  createInitialGame,
  getLegalDropSquares,
  getLegalDuckSquares,
  getLegalMovesForSquare,
  syncClocksInPlace,
} from './engine.js';
import { TIME_CONTROLS } from './types.js';

describe('Duckhouse Game Engine', () => {
  it('enforces chess phase -> duck phase -> turn switch independently on both boards', () => {
    let game = createInitialGame(TIME_CONTROLS[2], 'playing');
    const e2 = algebraicToSquare('e2');
    const e4 = algebraicToSquare('e4');
    const d4 = algebraicToSquare('d4');

    // Move White pawn on Board A
    const moveRes = applyChessMove(game, 'A', e2, e4);
    expect(moveRes.ok).toBe(true);
    game = moveRes.state;
    expect(game.boards.A.turn).toBe('w');
    expect(game.boards.A.phase).toBe('duck');
    // Board B is unaffected
    expect(game.boards.B.turn).toBe('w');
    expect(game.boards.B.phase).toBe('chess');

    // Cannot make another chess move before placing duck
    const blockedRes = applyChessMove(game, 'A', algebraicToSquare('d2'), d4);
    expect(blockedRes.ok).toBe(false);

    // Place duck on d4
    const duckRes = applyDuckMove(game, 'A', d4);
    expect(duckRes.ok).toBe(true);
    game = duckRes.state;
    expect(game.boards.A.duckSquare).toBe(d4);
    expect(game.boards.A.turn).toBe('b');
    expect(game.boards.A.phase).toBe('chess');
  });

  it('prevents sliding pieces from passing through duck, allows knights to jump over duck, and requires duck to move to a different empty square', () => {
    let game = createInitialGame(TIME_CONTROLS[2], 'playing');
    // Place duck directly on f3 blocking bishop/pawn but knight on g1 can still jump to f3? No, cannot land on f3; can jump to e2/h3.
    // Better: put duck on e3, white queen on d1 cannot slide through e2->f3? Wait e2 has pawn. Let's open e2-e4, place duck on e3.
    game = applyChessMove(game, 'A', algebraicToSquare('e2'), algebraicToSquare('e4')).state;
    game = applyDuckMove(game, 'A', algebraicToSquare('e3')).state;
    // Black plays e7-e5 and puts duck on f3
    game = applyChessMove(game, 'A', algebraicToSquare('e7'), algebraicToSquare('e5')).state;
    // Duck cannot stay on e3!
    expect(getLegalDuckSquares(game.boards.A)).not.toContain(algebraicToSquare('e3'));
    game = applyDuckMove(game, 'A', algebraicToSquare('f3')).state;

    // White queen on d1 cannot reach f3, g4, or h5 because duck is on f3? Wait d1-e2-f3-g4-h5 is diagonal!
    const queenMoves = getLegalMovesForSquare(game.boards.A, algebraicToSquare('d1')).map((m) => m.to);
    expect(queenMoves).toContain(algebraicToSquare('e2'));
    expect(queenMoves).not.toContain(algebraicToSquare('f3'));
    expect(queenMoves).not.toContain(algebraicToSquare('g4'));
    expect(queenMoves).not.toContain(algebraicToSquare('h5'));

    // White knight on g1 cannot land on f3 (duck), CAN land on e2 or h3
    const knightMoves = getLegalMovesForSquare(game.boards.A, algebraicToSquare('g1')).map((m) => m.to);
    expect(knightMoves).not.toContain(algebraicToSquare('f3'));
    expect(knightMoves).toContain(algebraicToSquare('e2'));
    expect(knightMoves).toContain(algebraicToSquare('h3'));
  });

  it('transfers captured pieces to partner pocket (opposite color on other board) and reverts promoted pieces to pawns', () => {
    let game = createInitialGame(TIME_CONTROLS[2], 'playing');
    // Set up Board A: White Queen on d4 captures a promoted Black Rook on d5
    game.boards.A.squares[algebraicToSquare('d4')] = { type: 'q', color: 'w' };
    game.boards.A.squares[algebraicToSquare('d5')] = { type: 'r', color: 'b', promoted: true };
    game.boards.A.squares[algebraicToSquare('e5')] = { type: 'n', color: 'b', promoted: false };

    // Board A White (Team 1) captures promoted Black Rook -> Board B Black (Team 1) receives a Black Pawn!
    const res1 = applyChessMove(game, 'A', algebraicToSquare('d4'), algebraicToSquare('d5'));
    expect(res1.ok).toBe(true);
    expect(res1.state.boards.B.pockets.b.p).toBe(1);
    expect(res1.state.boards.B.pockets.b.r).toBe(0);

    // Move duck, black makes a move & duck, then White captures normal Black Knight on e5
    let g2 = applyDuckMove(res1.state, 'A', algebraicToSquare('a4')).state;
    g2 = applyChessMove(g2, 'A', algebraicToSquare('a7'), algebraicToSquare('a6')).state;
    g2 = applyDuckMove(g2, 'A', algebraicToSquare('a5')).state;
    const res2 = applyChessMove(g2, 'A', algebraicToSquare('d5'), algebraicToSquare('e5'));
    expect(res2.ok).toBe(true);
    expect(res2.state.boards.B.pockets.b.n).toBe(1);

    // On Board B, make White move+duck so it's Black's turn, then check drop restrictions
    let g3 = applyChessMove(res2.state, 'B', algebraicToSquare('e2'), algebraicToSquare('e4')).state;
    g3 = applyDuckMove(g3, 'B', algebraicToSquare('d5')).state;

    // Pawns cannot be dropped on rank 1, rank 8, or duck square d5
    const pawnDrops = getLegalDropSquares(g3.boards.B, 'p');
    expect(pawnDrops).not.toContain(algebraicToSquare('d5'));
    expect(pawnDrops).not.toContain(algebraicToSquare('a1'));
    expect(pawnDrops).not.toContain(algebraicToSquare('h8'));
    expect(pawnDrops).toContain(algebraicToSquare('c5'));

    // Dropping knight on c5 transitions Board B to duck phase
    const dropRes = applyDropMove(g3, 'B', 'n', algebraicToSquare('c5'));
    expect(dropRes.ok).toBe(true);
    expect(dropRes.state.boards.B.squares[algebraicToSquare('c5')])?.toEqual({
      type: 'n',
      color: 'b',
      promoted: false,
    });
    expect(dropRes.state.boards.B.pockets.b.n).toBe(0);
    expect(dropRes.state.boards.B.phase).toBe('duck');
  });

  it('immediately wins the match for the capturing team when a King is captured', () => {
    let game = createInitialGame(TIME_CONTROLS[2], 'playing');
    // Put White Rook on e7 next to Black King on e8 on Board B (Board B White is Team 2)
    game.boards.B.squares[algebraicToSquare('e7')] = { type: 'r', color: 'w' };

    const res = applyChessMove(game, 'B', algebraicToSquare('e7'), algebraicToSquare('e8'));
    expect(res.ok).toBe(true);
    expect(res.kingCaptured).toBe(true);
    expect(res.state.status).toBe('finished');
    expect(res.state.winnerTeam).toBe(2); // B_w is Team 2
    expect(res.state.winReason).toBe('king_capture');
    expect(res.state.winningBoard).toBe('B');
  });

  it('flags a player on timeout and awards win to the opposing team', () => {
    const game = createInitialGame(TIME_CONTROLS[0], 'playing');
    const start = game.lastClockTickAt!;
    game.clocks.A_w = 500;
    const flagged = syncClocksInPlace(game, start + 600);
    expect(flagged).toBe(true);
    expect(game.status).toBe('finished');
    expect(game.winnerTeam).toBe(2); // A_w (Team 1) flagged -> Team 2 wins
    expect(game.winReason).toBe('timeout');
    expect(game.winningBoard).toBe('A');
  });
});
