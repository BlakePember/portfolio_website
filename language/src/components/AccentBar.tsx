import React from 'react';
import { BRAZILIAN_ACCENTS } from '../utils/grader';

interface AccentBarProps {
  onInsert: (char: string) => void;
  disabled?: boolean;
}

export const AccentBar: React.FC<AccentBarProps> = ({ onInsert, disabled = false }) => {
  return (
    <div className="fl-accent-bar" role="group" aria-label="Portuguese accent characters">
      <span className="fl-accent-label">Accents:</span>
      <div className="fl-accent-keys">
        {BRAZILIAN_ACCENTS.map((ch) => (
          <button
            key={ch}
            type="button"
            className="fl-accent-key"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(ch)}
            aria-label={`Insert ${ch}`}
          >
            {ch}
          </button>
        ))}
      </div>
    </div>
  );
};
