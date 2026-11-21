import React from 'react';
import { Crown, ShieldAlert, Shuffle, Sparkles, X } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { assetUrl } from '../utils/routes';

export const RulesModal: React.FC = () => {
  const { showRules, setShowRules } = useGame();
  if (!showRules) return null;

  return (
    <div className="dh-modal-backdrop" onClick={() => setShowRules(false)}>
      <div className="dh-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Duckhouse Rules">
        <div className="dh-modal-header">
          <div className="dh-modal-title-row">
            <img src={assetUrl('duck.png')} alt="" className="dh-modal-duck" />
            <div>
              <h2>How to Play Duckhouse</h2>
              <p>Bughouse 2v2 teamwork meets Duck Chess chaos.</p>
            </div>
          </div>
          <button type="button" className="dh-icon-btn" onClick={() => setShowRules(false)} aria-label="Close rules">
            <X size={20} />
          </button>
        </div>

        <div className="dh-rules-grid">
          <div className="dh-rule-card">
            <div className="dh-rule-icon"><Shuffle size={18} /></div>
            <h3>1. Two Boards, Two Teams (2v2)</h3>
            <p>
              <strong>Team Emerald</strong> plays <em>Board A White</em> + <em>Board B Black</em>.<br />
              <strong>Team Amber</strong> plays <em>Board A Black</em> + <em>Board B White</em>.<br />
              Both boards run live side-by-side on independent clocks.
            </p>
          </div>

          <div className="dh-rule-card">
            <div className="dh-rule-icon"><Sparkles size={18} /></div>
            <h3>2. Captures Feed Your Partner</h3>
            <p>
              Every piece you capture is immediately sent to your teammate’s <strong>Pocket</strong> in their color.
              On their turn, instead of moving a piece on the board, they can <strong>drop</strong> any pocket piece
              onto an empty square (pawns cannot drop on rank 1 or 8; promoted pieces revert to pawns when captured).
            </p>
          </div>

          <div className="dh-rule-card">
            <div className="dh-rule-icon"><ShieldAlert size={18} /></div>
            <h3>3. Move the Duck Every Turn</h3>
            <p>
              Both boards have their own <strong>Duck</strong>. After making your chess move (or pocket drop), you{' '}
              <strong>must place or move the duck</strong> on your board to a different empty square.
              No piece can land on or slide through the duck, and you cannot drop a piece onto it.{' '}
              <strong>Knights can jump over the duck!</strong>
            </p>
          </div>

          <div className="dh-rule-card">
            <div className="dh-rule-icon"><Crown size={18} /></div>
            <h3>4. Capture the King to Win!</h3>
            <p>
              Following official Duck Chess rules, there is <strong>no check or checkmate</strong> — Kings can walk into
              danger, and you can use the duck to block attacks! The first team to{' '}
              <strong>capture either enemy King</strong>, win on time, or force a resignation wins the entire match.
            </p>
          </div>
        </div>

        <div className="dh-modal-footer">
          <button type="button" className="dh-btn dh-btn-primary" onClick={() => setShowRules(false)}>
            Got it — Let’s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
