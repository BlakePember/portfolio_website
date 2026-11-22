import React, { useState } from 'react';
import { Keyboard, RotateCcw, Settings2, Volume2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const HelpModal: React.FC = () => {
  const {
    showHelp,
    setShowHelp,
    ptVoices,
    preferredVoiceURI,
    setPreferredVoiceURI,
    speak,
    stats,
    setDailyGoalXp,
    resetAllProgress,
  } = useLanguage();

  const [confirmReset, setConfirmReset] = useState(false);

  if (!showHelp) return null;

  return (
    <div
      className="fl-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={() => {
        setConfirmReset(false);
        setShowHelp(false);
      }}
    >
      <div className="fl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fl-modal-head">
          <div className="fl-modal-title-row">
            <Settings2 size={18} />
            <h2 id="help-modal-title">Study Settings &amp; Shortcuts</h2>
          </div>
          <button
            type="button"
            className="fl-icon-btn"
            onClick={() => {
              setConfirmReset(false);
              setShowHelp(false);
            }}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="fl-modal-body">
          <section className="fl-modal-section">
            <h3>Daily XP Goal</h3>
            <p className="fl-muted-sm">Pick a steady daily rhythm — consistency beats cramming.</p>
            <div className="fl-goal-grid">
              {[
                { xp: 30, label: 'Casual', desc: '5 min/day' },
                { xp: 60, label: 'Steady', desc: '10 min/day' },
                { xp: 100, label: 'Focused', desc: '20 min/day' },
                { xp: 150, label: 'Immersive', desc: '30 min/day' },
              ].map((opt) => (
                <button
                  key={opt.xp}
                  type="button"
                  className={`fl-goal-chip ${stats.dailyGoalXp === opt.xp ? 'active' : ''}`}
                  onClick={() => setDailyGoalXp(opt.xp)}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.xp} XP · {opt.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="fl-modal-section">
            <h3>
              <Volume2 size={15} /> Brazilian Portuguese Voice
            </h3>
            {ptVoices.length > 0 ? (
              <div className="fl-voice-row">
                <select
                  className="fl-select"
                  value={preferredVoiceURI}
                  onChange={(e) => setPreferredVoiceURI(e.target.value)}
                  aria-label="Choose Portuguese voice"
                >
                  <option value="">Auto (Best Brazilian Portuguese)</option>
                  {ptVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="fl-btn fl-btn-secondary"
                  onClick={() => speak('Oi! Tudo bem? Vamos aprender português brasileiro!')}
                >
                  Test voice
                </button>
              </div>
            ) : (
              <p className="fl-muted-sm">
                Using your browser&apos;s default <code>pt-BR</code> speech engine. For the most natural
                Brazilian voices, Chrome or Edge on desktop includes Google/Microsoft neural{' '}
                <code>pt-BR</code> voices automatically.
              </p>
            )}
          </section>

          <section className="fl-modal-section">
            <h3>
              <Keyboard size={15} /> Keyboard Shortcuts
            </h3>
            <div className="fl-shortcut-grid">
              <div><kbd>1</kbd>–<kbd>4</kbd> Select option / Rate flashcard</div>
              <div><kbd>Space</kbd> Flip flashcard</div>
              <div><kbd>Enter</kbd> Check answer / Next question</div>
              <div><kbd>R</kbd> Play Brazilian audio</div>
              <div><kbd>S</kbd> Play slow audio (0.6x)</div>
            </div>
          </section>

          <section className="fl-modal-section fl-danger-zone">
            <h3>Reset Local Progress</h3>
            {!confirmReset ? (
              <button
                type="button"
                className="fl-btn fl-btn-danger-ghost"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw size={14} /> Reset XP, streak &amp; flashcard schedule
              </button>
            ) : (
              <div className="fl-confirm-row">
                <span className="fl-muted-sm">Are you sure? This clears all saved study progress.</span>
                <div className="fl-confirm-btns">
                  <button
                    type="button"
                    className="fl-btn fl-btn-secondary"
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="fl-btn fl-btn-danger"
                    onClick={() => {
                      resetAllProgress();
                      setConfirmReset(false);
                      setShowHelp(false);
                    }}
                  >
                    Yes, reset everything
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
