import React, { useMemo, useState } from 'react';
import {
  BoardState,
  Color,
  DroppablePieceType,
  PieceType,
  PromotionPieceType,
} from '../../shared/types';
import {
  FILES,
  RANKS,
  colOf,
  getLegalDropSquares,
  getLegalDuckSquares,
  getLegalMovesForSquare,
  rowOf,
  toSquare,
} from '../../shared/engine';

const PIECE_FILE_MAP: Record<PieceType, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const PROMOTION_CHOICES: PromotionPieceType[] = ['q', 'r', 'b', 'n'];

interface ChessBoardProps {
  board: BoardState;
  orientation: Color;
  canAct: boolean;
  selectedDrop: DroppablePieceType | null;
  onClearDrop: () => void;
  onChessMove: (from: number, to: number, promotion?: PromotionPieceType) => void;
  onDropMove: (pieceType: DroppablePieceType, to: number) => void;
  onDuckMove: (to: number) => void;
  compact?: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  orientation,
  canAct,
  selectedDrop,
  onClearDrop,
  onChessMove,
  onDropMove,
  onDuckMove,
  compact = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: number; to: number } | null>(null);
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  const isDuckPhase = canAct && board.phase === 'duck';

  const legalMovesFromSelected = useMemo(() => {
    if (!canAct || board.phase !== 'chess' || selectedSquare === null) return [];
    return getLegalMovesForSquare(board, selectedSquare);
  }, [board, canAct, selectedSquare]);

  const legalMoveTargets = useMemo(() => {
    const map = new Map<number, (typeof legalMovesFromSelected)[number]>();
    for (const m of legalMovesFromSelected) {
      map.set(m.to, m);
    }
    return map;
  }, [legalMovesFromSelected]);

  const legalDropSet = useMemo(() => {
    if (!canAct || board.phase !== 'chess' || !selectedDrop) return new Set<number>();
    return new Set(getLegalDropSquares(board, selectedDrop));
  }, [board, canAct, selectedDrop]);

  const legalDuckSet = useMemo(() => {
    if (!isDuckPhase) return new Set<number>();
    return new Set(getLegalDuckSquares(board));
  }, [board, isDuckPhase]);

  const displayRows = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const displayCols = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const handleSquareClick = (sq: number) => {
    if (!canAct) return;

    // 1. Duck placement phase
    if (board.phase === 'duck') {
      if (legalDuckSet.has(sq)) {
        onDuckMove(sq);
        setSelectedSquare(null);
      }
      return;
    }

    // 2. Pocket drop mode
    if (selectedDrop) {
      if (legalDropSet.has(sq)) {
        onDropMove(selectedDrop, sq);
        onClearDrop();
        setSelectedSquare(null);
        return;
      }
      // Clicking own piece cancels drop and selects that piece
      const clickedPiece = board.squares[sq];
      if (clickedPiece && clickedPiece.color === board.turn) {
        onClearDrop();
        setSelectedSquare(sq);
        return;
      }
      onClearDrop();
      return;
    }

    // 3. Chess move execution if clicking a legal destination
    if (selectedSquare !== null && legalMoveTargets.has(sq)) {
      const move = legalMoveTargets.get(sq)!;
      if (move.isPromotion) {
        setPendingPromotion({ from: move.from, to: move.to });
      } else {
        onChessMove(move.from, move.to);
        setSelectedSquare(null);
      }
      return;
    }

    // 4. Select or deselect own piece
    const piece = board.squares[sq];
    if (piece && piece.color === board.turn) {
      setSelectedSquare(selectedSquare === sq ? null : sq);
    } else {
      setSelectedSquare(null);
    }
  };

  const handleDropOnSquare = (e: React.DragEvent, targetSq: number) => {
    e.preventDefault();
    setHoveredSquare(null);
    if (!canAct) return;
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    if (data.startsWith('drop:') && board.phase === 'chess') {
      const pieceType = data.slice(5) as DroppablePieceType;
      const legalDrops = getLegalDropSquares(board, pieceType);
      if (legalDrops.includes(targetSq)) {
        onDropMove(pieceType, targetSq);
        onClearDrop();
        setSelectedSquare(null);
      }
      return;
    }

    if (data === 'duck' && board.phase === 'duck') {
      if (legalDuckSet.has(targetSq)) {
        onDuckMove(targetSq);
      }
      return;
    }

    if (data.startsWith('sq:') && board.phase === 'chess') {
      const fromSq = Number(data.slice(3));
      const move = getLegalMovesForSquare(board, fromSq).find((m) => m.to === targetSq);
      if (move) {
        if (move.isPromotion) {
          setPendingPromotion({ from: move.from, to: move.to });
        } else {
          onChessMove(move.from, move.to);
          setSelectedSquare(null);
        }
      }
    }
  };

  return (
    <div
      className={`dh-board-wrapper ${compact ? 'compact' : ''} ${isDuckPhase ? 'duck-phase-active' : ''} ${
        selectedDrop ? 'drop-phase-active' : ''
      }`}
    >
      <div className="dh-board-grid" role="grid" aria-label={`Board ${board.id}`}>
        {displayRows.map((r, rIdx) =>
          displayCols.map((c, cIdx) => {
            const sq = toSquare(r, c);
            const isLight = (r + c) % 2 === 0;
            const piece = board.squares[sq];
            const hasDuck = board.duckSquare === sq;
            const isSelected = selectedSquare === sq;
            const legalMove = legalMoveTargets.get(sq);
            const isLegalDrop = legalDropSet.has(sq);
            const isLegalDuck = legalDuckSet.has(sq);
            const isLastFrom = board.lastMove?.from === sq;
            const isLastTo = board.lastMove?.to === sq;
            const isLastDuckTo = board.lastDuckMove?.to === sq;
            const showRank = cIdx === 0;
            const showFile = rIdx === 7;
            const showDuckGhost = isDuckPhase && isLegalDuck && hoveredSquare === sq;

            const classes = [
              'dh-square',
              isLight ? 'light' : 'dark',
              isSelected ? 'selected' : '',
              isLastFrom || isLastTo ? 'last-move' : '',
              isLastDuckTo ? 'last-duck' : '',
              isLegalDrop ? 'legal-drop' : '',
              isLegalDuck ? 'legal-duck' : '',
              hasDuck ? 'has-duck' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={sq}
                role="gridcell"
                className={classes}
                onClick={() => handleSquareClick(sq)}
                onMouseEnter={() => setHoveredSquare(sq)}
                onMouseLeave={() => setHoveredSquare((prev) => (prev === sq ? null : prev))}
                onDragOver={(e) => {
                  if (canAct) e.preventDefault();
                }}
                onDrop={(e) => handleDropOnSquare(e, sq)}
              >
                {showRank && <span className="dh-coord-rank">{RANKS[r]}</span>}
                {showFile && <span className="dh-coord-file">{FILES[c]}</span>}

                {piece && (
                  <img
                    src={`./pieces/${PIECE_FILE_MAP[piece.type]}-${piece.color}.svg`}
                    alt={`${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_FILE_MAP[piece.type]}`}
                    className={`dh-piece ${
                      canAct && board.phase === 'chess' && piece.color === board.turn ? 'movable' : ''
                    }`}
                    draggable={canAct && board.phase === 'chess' && piece.color === board.turn}
                    onDragStart={(e) => {
                      if (!canAct || board.phase !== 'chess' || piece.color !== board.turn) return;
                      onClearDrop();
                      setSelectedSquare(sq);
                      e.dataTransfer.setData('text/plain', `sq:${sq}`);
                    }}
                  />
                )}

                {hasDuck && (
                  <div
                    className={`dh-duck-piece ${isDuckPhase ? 'pulse' : ''}`}
                    draggable={isDuckPhase}
                    onDragStart={(e) => {
                      if (!isDuckPhase) return;
                      e.dataTransfer.setData('text/plain', 'duck');
                    }}
                    title="The Duck — blocks movement & drops (Knights jump over it)"
                  >
                    <img src="./duck.png" alt="Duck" draggable={false} />
                  </div>
                )}

                {showDuckGhost && (
                  <div className="dh-duck-ghost" aria-hidden="true">
                    <img src="./duck.png" alt="" draggable={false} />
                  </div>
                )}

                {legalMove && !legalMove.isCapture && <span className="dh-move-dot" />}
                {legalMove && legalMove.isCapture && <span className="dh-capture-ring" />}
                {isLegalDrop && !piece && !hasDuck && <span className="dh-drop-dot" />}
              </div>
            );
          })
        )}
      </div>

      {pendingPromotion && (
        <div className="dh-promo-backdrop" onClick={() => setPendingPromotion(null)}>
          <div className="dh-promo-picker" onClick={(e) => e.stopPropagation()}>
            <div className="dh-promo-title">Promote Pawn</div>
            <div className="dh-promo-options">
              {PROMOTION_CHOICES.map((pType) => (
                <button
                  key={pType}
                  type="button"
                  className="dh-promo-btn"
                  onClick={() => {
                    onChessMove(pendingPromotion.from, pendingPromotion.to, pType);
                    setPendingPromotion(null);
                    setSelectedSquare(null);
                  }}
                >
                  <img
                    src={`./pieces/${PIECE_FILE_MAP[pType]}-${board.turn}.svg`}
                    alt={PIECE_FILE_MAP[pType]}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
