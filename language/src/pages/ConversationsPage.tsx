import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  Lightbulb,
  MapPin,
  MessageCircle,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  CONVERSATIONS,
  type ConversationScenario,
  type DialogueOption,
} from '../data/conversations';
import { useLanguage } from '../context/LanguageContext';
import { AudioButton } from '../components/AudioButton';
import { playCelebrationSound, playCorrectSound, playWrongSound } from '../utils/sounds';

type ConvMode = 'read' | 'roleplay';

function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const ConversationsPage: React.FC = () => {
  const { activeScenarioId, speak, stats, recordConversationComplete } = useLanguage();
  const [selectedId, setSelectedId] = useState<string>(activeScenarioId || CONVERSATIONS[0].id);
  const [mode, setMode] = useState<ConvMode>('read');
  const [showTranslations, setShowTranslations] = useState(true);
  const [showPhonetics, setShowPhonetics] = useState(true);

  // Roleplay state
  const [roleplayStep, setRoleplayStep] = useState(0);
  const [pickedFeedback, setPickedFeedback] = useState<{
    correct: boolean;
    message: string;
    chosenPt: string;
  } | null>(null);
  const [roleplayDone, setRoleplayDone] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(11);

  useEffect(() => {
    if (activeScenarioId) setSelectedId(activeScenarioId);
  }, [activeScenarioId]);

  const scenario: ConversationScenario = useMemo(
    () => CONVERSATIONS.find((c) => c.id === selectedId) ?? CONVERSATIONS[0],
    [selectedId]
  );

  // Reset roleplay whenever scenario or mode changes
  const startRoleplay = () => {
    setMode('roleplay');
    setRoleplayStep(0);
    setPickedFeedback(null);
    setRoleplayDone(false);
    setShuffleSeed((s) => s + 7);
  };

  useEffect(() => {
    setRoleplayStep(0);
    setPickedFeedback(null);
    setRoleplayDone(false);
  }, [selectedId]);

  // Compute how many turns are revealed in roleplay mode:
  // Always advance through partner turns automatically until hitting the next 'you' turn (or end).
  const activeTurnIndex = useMemo(() => {
    if (mode !== 'roleplay') return scenario.turns.length - 1;
    let idx = roleplayStep;
    while (idx < scenario.turns.length && scenario.turns[idx].speaker === 'partner') {
      idx += 1;
    }
    return idx;
  }, [mode, roleplayStep, scenario.turns]);

  const currentUserTurn =
    mode === 'roleplay' && activeTurnIndex < scenario.turns.length
      ? scenario.turns[activeTurnIndex]
      : null;

  const shuffledOptions = useMemo(() => {
    if (!currentUserTurn?.options) return [];
    return deterministicShuffle(currentUserTurn.options, shuffleSeed + activeTurnIndex * 13);
  }, [activeTurnIndex, currentUserTurn, shuffleSeed]);

  // Auto-speak the latest partner turn in roleplay mode
  useEffect(() => {
    if (mode !== 'roleplay') return;
    const prevPartnerIdx = activeTurnIndex - 1;
    if (prevPartnerIdx >= 0 && scenario.turns[prevPartnerIdx]?.speaker === 'partner') {
      const t = window.setTimeout(() => {
        speak(scenario.turns[prevPartnerIdx].pt, false);
      }, 240);
      return () => window.clearTimeout(t);
    }
  }, [activeTurnIndex, mode, scenario.turns, speak]);

  const handleOptionSelect = (opt: DialogueOption) => {
    if (opt.correct) {
      playCorrectSound(2);
      speak(opt.pt, false);
      setPickedFeedback({ correct: true, message: opt.feedback, chosenPt: opt.pt });

      // Check if any more 'you' turns remain after this one
      const nextStart = activeTurnIndex + 1;
      const hasMoreYouTurns = scenario.turns.slice(nextStart).some((t) => t.speaker === 'you');

      window.setTimeout(() => {
        setPickedFeedback(null);
        if (!hasMoreYouTurns) {
          setRoleplayStep(scenario.turns.length);
          setRoleplayDone(true);
          recordConversationComplete(scenario.id);
          playCelebrationSound();
          // Speak final partner line if one exists after last user line
          const finalTurn = scenario.turns[scenario.turns.length - 1];
          if (finalTurn && finalTurn.speaker === 'partner' && nextStart < scenario.turns.length) {
            window.setTimeout(() => speak(finalTurn.pt, false), 350);
          }
        } else {
          setRoleplayStep(nextStart);
        }
      }, 1150);
    } else {
      playWrongSound();
      setPickedFeedback({ correct: false, message: opt.feedback, chosenPt: opt.pt });
    }
  };

  const visibleRoleplayTurns = roleplayDone
    ? scenario.turns
    : scenario.turns.slice(0, activeTurnIndex);

  return (
    <main className="fl-page fl-conv-page">
      <header className="fl-page-header">
        <div>
          <span className="fl-section-eyebrow">CONVERSAÇÃO REAL</span>
          <h1>Brazilian Dialogues &amp; Roleplay</h1>
          <p className="fl-muted-sm">
            Hear how Brazilian Portuguese flows in real life — then switch to Roleplay mode to
            respond naturally yourself.
          </p>
        </div>

        <div className="fl-segmented">
          <button
            type="button"
            className={mode === 'read' ? 'active' : ''}
            onClick={() => setMode('read')}
          >
            <Headphones size={15} /> Listen &amp; Read
          </button>
          <button
            type="button"
            className={mode === 'roleplay' ? 'active' : ''}
            onClick={startRoleplay}
          >
            <MessageCircle size={15} /> Roleplay Practice
          </button>
        </div>
      </header>

      <div className="fl-conv-layout">
        {/* Scenario Picker */}
        <aside className="fl-scenario-list" aria-label="Conversation scenarios">
          {CONVERSATIONS.map((c) => {
            const done = stats.conversationsCompleted.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`fl-scenario-btn ${c.id === scenario.id ? 'active' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="fl-scenario-top">
                  <span className={`fl-level-pill level-${c.level.toLowerCase()}`}>{c.level}</span>
                  {done && (
                    <span className="fl-done-badge">
                      <CheckCircle2 size={13} /> Done
                    </span>
                  )}
                </div>
                <strong>{c.titlePt}</strong>
                <span className="fl-scenario-en">{c.titleEn}</span>
                <span className="fl-scenario-city">
                  <MapPin size={12} /> {c.city}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Active Conversation Stage */}
        <section className="fl-conv-stage">
          <div className="fl-conv-stage-head">
            <div>
              <div className="fl-conv-title-row">
                <h2>{scenario.titlePt}</h2>
                <span className="fl-scenario-city">
                  <MapPin size={13} /> {scenario.city}
                </span>
              </div>
              <p className="fl-muted-sm">
                {scenario.description} Talking with <strong>{scenario.partnerName}</strong> (
                {scenario.partnerRole}).
              </p>
            </div>

            <div className="fl-conv-toggles">
              <button
                type="button"
                className="fl-tiny-toggle"
                onClick={() => setShowTranslations((v) => !v)}
              >
                {showTranslations ? <Eye size={13} /> : <EyeOff size={13} />} English
              </button>
              <button
                type="button"
                className="fl-tiny-toggle"
                onClick={() => setShowPhonetics((v) => !v)}
              >
                {showPhonetics ? <Eye size={13} /> : <EyeOff size={13} />} Phonetics
              </button>
            </div>
          </div>

          {/* Chat Bubbles */}
          <div className="fl-chat-stream">
            {(mode === 'read' ? scenario.turns : visibleRoleplayTurns).map((turn) => (
              <div
                key={turn.id}
                className={`fl-bubble-row ${turn.speaker === 'you' ? 'from-you' : 'from-partner'}`}
              >
                <div className="fl-bubble">
                  <div className="fl-bubble-head">
                    <span className="fl-bubble-name">{turn.speakerName}</span>
                    <AudioButton text={turn.pt} showSlow size="sm" />
                  </div>
                  <p className="fl-bubble-pt">{turn.pt}</p>
                  {showPhonetics && <p className="fl-bubble-phonetic">/{turn.phonetic}/</p>}
                  {showTranslations && <p className="fl-bubble-en">{turn.en}</p>}

                  {turn.highlight && (
                    <div className="fl-bubble-note">
                      <Lightbulb size={13} />
                      <span>
                        <strong>{turn.highlight.phrase}:</strong> {turn.highlight.note}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Roleplay Interactive Prompt */}
          {mode === 'roleplay' && !roleplayDone && currentUserTurn && (
            <div className="fl-roleplay-box">
              <div className="fl-roleplay-head">
                <span className="fl-kind-pill">YOUR TURN TO RESPOND</span>
                <p>{currentUserTurn.roleplayPrompt}</p>
              </div>

              <div className="fl-roleplay-options">
                {shuffledOptions.map((opt) => (
                  <button
                    key={opt.pt}
                    type="button"
                    className={`fl-roleplay-opt ${
                      pickedFeedback?.chosenPt === opt.pt
                        ? pickedFeedback.correct
                          ? 'correct'
                          : 'wrong'
                        : ''
                    }`}
                    onClick={() => handleOptionSelect(opt)}
                  >
                    <strong>{opt.pt}</strong>
                    {showTranslations && <span>{opt.en}</span>}
                  </button>
                ))}
              </div>

              {pickedFeedback && (
                <div
                  className={`fl-feedback-box compact tone-${pickedFeedback.correct ? 'exact' : 'incorrect'}`}
                >
                  <div className="fl-feedback-main">
                    <div className="fl-feedback-icon">
                      {pickedFeedback.correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    </div>
                    <div className="fl-feedback-copy">
                      <strong>{pickedFeedback.message}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'roleplay' && roleplayDone && (
            <div className="fl-roleplay-done">
              <Sparkles size={22} />
              <div>
                <strong>Mandou muito bem! Roleplay Complete (+25 XP)</strong>
                <p className="fl-muted-sm">
                  You navigated &ldquo;{scenario.titlePt}&rdquo; smoothly in Brazilian Portuguese.
                </p>
              </div>
              <button
                type="button"
                className="fl-btn fl-btn-secondary fl-btn-sm"
                onClick={startRoleplay}
              >
                <RotateCcw size={14} /> Replay
              </button>
            </div>
          )}

          {mode === 'read' && (
            <div className="fl-conv-footer-cta">
              <button type="button" className="fl-btn fl-btn-primary" onClick={startRoleplay}>
                <MessageCircle size={16} /> Practice this Dialogue in Roleplay Mode
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
