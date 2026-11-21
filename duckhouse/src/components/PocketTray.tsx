import React from 'react';
import { Color, DroppablePieceType, PocketCounts } from '../../shared/types';
import { assetUrl } from '../utils/routes';

const PIECE_ORDER: DroppablePieceType[] = ['q', 'r', 'b', 'n', 'p'];

const PIECE_SVG_NAME: Record<DroppablePieceType, string> = {
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

interface PocketTrayProps {
  color: Color;
  pocket: PocketCounts;
  interactive: boolean;
  selectedDrop: DroppablePieceType | null;
  onSelectDrop: (piece: DroppablePieceType | null) => void;
  label?: string;
}

export const PocketTray: React.FC<PocketTrayProps> = ({
  color,
  pocket,
  interactive,
  selectedDrop,
  onSelectDrop,
  label,
}) => {
  const total = PIECE_ORDER.reduce((sum, t) => sum + pocket[t], 0);

  return (
    <div className={`dh-pocket ${interactive ? 'interactive' : ''} ${total > 0 ? 'has-pieces' : ''}`}>
      <div className="dh-pocket-label">{label ?? 'Pocket'}</div>
      <div className="dh-pocket-slots">
        {PIECE_ORDER.map((type) => {
          const count = pocket[type];
          const isSelected = interactive && selectedDrop === type;
          const canClick = interactive && count > 0;
          return (
            <button
              key={type}
              type="button"
              disabled={!canClick}
              className={`dh-pocket-slot ${count > 0 ? 'available' : 'empty'} ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                if (!canClick) return;
                onSelectDrop(isSelected ? null : type);
              }}
              draggable={canClick}
              onDragStart={(e) => {
                if (!canClick) return;
                onSelectDrop(type);
                e.dataTransfer.setData('text/plain', `drop:${type}`);
              }}
              title={
                count > 0
                  ? interactive
                    ? `Drop ${PIECE_SVG_NAME[type]} (${count} in pocket)`
                    : `${count} ${PIECE_SVG_NAME[type]}${count > 1 ? 's' : ''} in reserve`
                  : `No ${PIECE_SVG_NAME[type]}s in pocket`
              }
            >
              <img
                src={assetUrl(`pieces/${PIECE_SVG_NAME[type]}-${color}.svg`)}
                alt={`${color === 'w' ? 'White' : 'Black'} ${PIECE_SVG_NAME[type]}`}
                draggable={false}
              />
              {count > 0 && <span className="dh-pocket-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
