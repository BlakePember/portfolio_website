import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  XCircle,
} from 'lucide-react';
import { UNITS, getUnitById } from '../data/curriculum';
import { useLanguage } from '../context/LanguageContext';
import { buildUnitLesson, type LessonExercise } from '../utils/exercises';
import { gradePortugueseAnswer, normalizeText } from '../utils/grader';
import {
  playCelebrationSound,
  playCorrectSound,
  playTapSound,
  playWrongSound,
} from '../utils/sounds';
import { AudioButton } from '../components/AudioButton';
import { AccentBar } from '../components/AccentBar';

type LessonStage = 'preview' | 'quiz' | 'complete';

interface FeedbackState {
  accepted: boolean;
  tone: 'exact' | 'warning' | 'incorrect';
  title: string;
  detail: string;
}

export const LessonPage: React.FC = () => {
  const {
    activeUnitId,
    setPage,
    openLesson,
    openFlashcards,
    speak,
    speechSupported,
    recordSrsReview,
    recordLessonComplete,
    starredIds,
    toggleStar,
  } = useLanguage();

  const unit = useMemo(() => getUnitById(activeUnitId), [activeUnitId]);
  const [seed, setSeed] = useState(() => Date.now());
  const [stage, setStage] = useState<LessonStage>('preview');

  const { previewItems, exercises } = useMemo(
    () => buildUnitLesson(activeUnitId, seed),
    [activeUnitId, seed]
  );

  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [bankChosenIndices, setBankChosenIndices] = useState<number[]>([]);
  const [showPhonetic, setShowPhonetic] = useState(true);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset state whenever unit or seed changes
  useEffect(() => {
    setStage('preview');
    setIndex(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setSelectedOption(null);
    setTypedAnswer('');
    setBankChosenIndices([]);
  }, [activeUnitId, seed]);

  const current: LessonExercise | undefined = exercises[index];

  // Auto-play audio for listen-pick exercises
  useEffect(() => {
    if (stage === 'quiz' && current?.kind === 'listen-pick' && current.audioText) {
      const t = window.setTimeout(() => speak(current.audioText!, false), 220);
      return () => window.clearTimeout(t);
    }
  }, [stage, index, current, speak]);

  // Focus text input when a typing exercise appears
  useEffect(() => {
    if (stage === 'quiz' && current?.kind === 'type-pt' && !feedback) {
      inputRef.current?.focus();
    }
  }, [stage, index, current, feedback]);

  const submitResult = useCallback(
    (accepted: boolean, tone: FeedbackState['tone'], title: string, detail: string) => {
      setFeedback({ accepted, tone, title, detail });

      if (accepted) {
        const nextStreak = streak + 1;
        setCorrectCount((c) => c + 1);
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        playCorrectSound(nextStreak);
        if (current?.vocabId) {
          recordSrsReview(current.vocabId, tone === 'exact' ? 2 : 1, 0);
        }
      } else {
        setStreak(0);
        playWrongSound();
        if (current?.vocabId) {
          recordSrsReview(current.vocabId, 0, 0);
        }
      }

      if (current?.audioText && current.kind !== 'listen-pick') {
        speak(current.audioText, false);
      }
    },
    [current, recordSrsReview, speak, streak]
  );

  const handleOptionPick = useCallback(
    (opt: string) => {
      if (!current || feedback) return;
      setSelectedOption(opt);
      const isRight = normalizeText(opt, true) === normalizeText(current.correctAnswer, true);
      if (isRight) {
        submitResult(true, 'exact', 'Correto!', current.tip ?? 'Great recognition!');
      } else {
        submitResult(
          false,
          'incorrect',
          'Quase! Not quite.',
          `Correct answer: "${current.correctAnswer}"${current.tip ? ` — ${current.tip}` : ''}`
        );
      }
    },
    [current, feedback, submitResult]
  );

  const handleCheckWordBank = useCallback(() => {
    if (!current || feedback || !current.wordTiles) return;
    const built = bankChosenIndices.map((i) => current.wordTiles![i]).join(' ');
    const grade = gradePortugueseAnswer(built, current.correctAnswer);
    if (grade.accepted) {
      submitResult(
        true,
        grade.status === 'exact' ? 'exact' : 'warning',
        'Mandou bem!',
        current.tip ?? current.audioText ?? grade.feedback
      );
    } else {
      submitResult(
        false,
        'incorrect',
        'Almost! Check the word order.',
        `Natural sentence: "${current.audioText ?? current.correctAnswer}"`
      );
    }
  }, [bankChosenIndices, current, feedback, submitResult]);

  const handleCheckTyped = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!current || feedback) return;
      const grade = gradePortugueseAnswer(typedAnswer, current.correctAnswer, current.altAnswers);
      if (grade.accepted) {
        submitResult(
          true,
          grade.status === 'exact' ? 'exact' : 'warning',
          grade.status === 'exact' ? 'Perfeito!' : 'Correto!',
          grade.status === 'exact'
            ? current.tip ?? 'Exact Brazilian spelling!'
            : grade.feedback
        );
      } else {
        submitResult(
          false,
          'incorrect',
          'Keep going — you got this!',
          `Answer: "${current.correctAnswer}"${current.phonetic ? ` (/${current.phonetic}/)` : ''}`
        );
      }
    },
    [current, feedback, submitResult, typedAnswer]
  );

  const handleNext = useCallback(() => {
    if (!current) return;
    if (index + 1 >= exercises.length) {
      const accuracyPct = Math.round((correctCount / Math.max(1, exercises.length)) * 100);
      const xpEarned = 20 + correctCount * 4 + (accuracyPct === 100 ? 15 : 0);
      recordLessonComplete(activeUnitId, accuracyPct, xpEarned);
      playCelebrationSound();
      setStage('complete');
    } else {
      setIndex((i) => i + 1);
      setFeedback(null);
      setSelectedOption(null);
      setTypedAnswer('');
      setBankChosenIndices([]);
    }
  }, [activeUnitId, correctCount, current, exercises.length, index, recordLessonComplete]);

  // Keyboard shortcuts during quiz
  useEffect(() => {
    if (stage !== 'quiz' || !current) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (e.key === 'Enter' && feedback) {
        e.preventDefault();
        handleNext();
        return;
      }

      if (inInput) return;

      if ((e.key === 'r' || e.key === 'R') && current.audioText) {
        e.preventDefault();
        speak(current.audioText, false);
        return;
      }
      if ((e.key === 's' || e.key === 'S') && current.audioText) {
        e.preventDefault();
        speak(current.audioText, true);
        return;
      }

      if (!feedback && current.options && ['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = Number(e.key) - 1;
        if (current.options[optIdx]) {
          e.preventDefault();
          handleOptionPick(current.options[optIdx]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, feedback, handleNext, handleOptionPick, speak, stage]);

  const insertAccent = (ch: string) => {
    const input = inputRef.current;
    if (!input) {
      setTypedAnswer((prev) => prev + ch);
      return;
    }
    const start = input.selectionStart ?? typedAnswer.length;
    const end = input.selectionEnd ?? typedAnswer.length;
    const next = typedAnswer.slice(0, start) + ch + typedAnswer.slice(end);
    setTypedAnswer(next);
    window.requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  const toggleWordTile = (tileIdx: number) => {
    if (feedback) return;
    playTapSound();
    setBankChosenIndices((prev) =>
      prev.includes(tileIdx) ? prev.filter((i) => i !== tileIdx) : [...prev, tileIdx]
    );
  };

  const nextUnit = useMemo(() => {
    const pos = UNITS.findIndex((u) => u.id === activeUnitId);
    return UNITS[(pos + 1) % UNITS.length];
  }, [activeUnitId]);

  const accuracyPct = Math.round((correctCount / Math.max(1, exercises.length)) * 100);
  const xpEarned = 20 + correctCount * 4 + (accuracyPct === 100 ? 15 : 0);

  // ================= STAGE 1: PREVIEW =================
  if (stage === 'preview') {
    return (
      <main className="fl-page fl-lesson-page">
        <div className="fl-lesson-topbar">
          <button type="button" className="fl-btn fl-btn-ghost fl-btn-sm" onClick={() => setPage('home')}>
            <ArrowLeft size={15} /> Back to Units
          </button>
          <span className={`fl-level-pill level-${unit.level.toLowerCase()}`}>
            UNIT {String(unit.order).padStart(2, '0')} · {unit.level}
          </span>
        </div>

        <header className="fl-lesson-intro">
          <h1>{unit.titlePt}</h1>
          <p className="fl-lesson-intro-en">{unit.titleEn} — {unit.subtitle}</p>
        </header>

        <div className="fl-grammar-banner">
          <div className="fl-grammar-icon">
            <Lightbulb size={18} />
          </div>
          <div>
            <strong>Key Brazilian Tip — {unit.grammarTitle}</strong>
            <p>{unit.grammarNote}</p>
          </div>
        </div>

        <section className="fl-preview-section">
          <div className="fl-preview-head">
            <h2>
              <BookOpen size={17} /> Preview {previewItems.length} Key Phrases
            </h2>
            <p className="fl-muted-sm">Tap any speaker to hear normal or slow Brazilian pronunciation.</p>
          </div>

          <div className="fl-preview-grid">
            {previewItems.map((item) => {
              const starred = starredIds.includes(item.id);
              return (
                <div key={item.id} className="fl-preview-card">
                  <div className="fl-preview-card-top">
                    <div>
                      <div className="fl-preview-pt">{item.pt}</div>
                      <div className="fl-preview-phonetic">/{item.phonetic}/</div>
                    </div>
                    <div className="fl-preview-tools">
                      <AudioButton text={item.pt} showSlow size="sm" />
                      <button
                        type="button"
                        className={`fl-mini-icon-btn ${starred ? 'starred' : ''}`}
                        onClick={() => toggleStar(item.id)}
                        aria-label="Bookmark phrase"
                      >
                        <Star size={14} fill={starred ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                  <div className="fl-preview-en">{item.en}</div>
                  <div className="fl-preview-ex">
                    <span>{item.examplePt}</span>
                    <em>{item.exampleEn}</em>
                  </div>
                  {item.tip && <p className="fl-preview-tip">{item.tip}</p>}
                </div>
              );
            })}
          </div>

          <div className="fl-preview-cta">
            <button
              type="button"
              className="fl-btn fl-btn-primary fl-btn-lg"
              onClick={() => setStage('quiz')}
            >
              <Play size={17} />
              <span>Start {exercises.length}-Question Practice</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ================= STAGE 3: COMPLETE =================
  if (stage === 'complete') {
    return (
      <main className="fl-page fl-lesson-complete">
        <div className="fl-complete-card">
          <div className="fl-complete-trophy">
            <Trophy size={34} />
          </div>
          <span className="fl-section-eyebrow">PARABÉNS! LESSON COMPLETE</span>
          <h1>{unit.titlePt}</h1>
          <p className="fl-muted-sm">
            Every phrase you practiced was synced into your Spaced Repetition review queue.
          </p>

          <div className="fl-complete-stats">
            <div className="fl-complete-stat">
              <Sparkles size={18} />
              <strong>+{xpEarned} XP</strong>
              <span>Earned</span>
            </div>
            <div className="fl-complete-stat">
              <CheckCircle2 size={18} />
              <strong>{accuracyPct}%</strong>
              <span>Accuracy ({correctCount}/{exercises.length})</span>
            </div>
            <div className="fl-complete-stat">
              <Flame size={18} />
              <strong>{bestStreak}</strong>
              <span>Best Streak</span>
            </div>
          </div>

          <div className="fl-complete-review">
            <h3>Phrases Practiced</h3>
            <div className="fl-complete-list">
              {previewItems.map((item) => (
                <div key={item.id} className="fl-complete-item">
                  <div>
                    <strong>{item.pt}</strong>
                    <span>{item.en}</span>
                  </div>
                  <AudioButton text={item.pt} size="sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="fl-complete-actions">
            <button
              type="button"
              className="fl-btn fl-btn-primary fl-btn-lg"
              onClick={() => openLesson(nextUnit.id)}
            >
              <span>Next: {nextUnit.titlePt}</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="fl-btn fl-btn-secondary"
              onClick={() => setSeed(Date.now())}
            >
              <RotateCcw size={15} /> Practice New Round
            </button>
            <button
              type="button"
              className="fl-btn fl-btn-ghost"
              onClick={() => openFlashcards(activeUnitId)}
            >
              Review Unit Flashcards
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ================= STAGE 2: ACTIVE QUIZ =================
  if (!current) return null;

  const progressPct = Math.round(((index + (feedback ? 1 : 0)) / exercises.length) * 100);

  return (
    <main className="fl-page fl-quiz-page">
      <div className="fl-quiz-header">
        <button
          type="button"
          className="fl-btn fl-btn-ghost fl-btn-sm"
          onClick={() => setPage('home')}
        >
          <ArrowLeft size={15} /> Exit
        </button>

        <div className="fl-quiz-progress-wrap">
          <div className="fl-bar-track">
            <div className="fl-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="fl-quiz-counter">
            {index + 1} / {exercises.length}
          </span>
        </div>

        <div className="fl-quiz-streak" title="Current answer streak">
          <Flame size={15} />
          <span>{streak}</span>
        </div>
      </div>

      <section className="fl-quiz-card">
        <div className="fl-quiz-kind-row">
          <span className="fl-kind-pill">
            {current.kind === 'mc-pt-to-en' && 'TRANSLATE TO ENGLISH'}
            {current.kind === 'mc-en-to-pt' && 'TRANSLATE TO PORTUGUESE'}
            {current.kind === 'listen-pick' && 'LISTENING COMPREHENSION'}
            {current.kind === 'fill-blank' && 'FILL IN THE BLANK'}
            {current.kind === 'word-bank' && 'BUILD THE SENTENCE'}
            {current.kind === 'type-pt' && 'TYPE IN PORTUGUESE'}
          </span>

          {current.phonetic && current.kind !== 'listen-pick' && current.kind !== 'type-pt' && (
            <button
              type="button"
              className="fl-tiny-toggle"
              onClick={() => setShowPhonetic((v) => !v)}
            >
              {showPhonetic ? 'Hide phonetics' : 'Show phonetics'}
            </button>
          )}
        </div>

        {/* Prompt Display */}
        <div className="fl-quiz-prompt-box">
          {current.kind === 'listen-pick' ? (
            <div className="fl-listen-hero">
              {speechSupported ? (
                <>
                  <AudioButton
                    text={current.audioText ?? ''}
                    showSlow
                    size="lg"
                    label="Play Brazilian Audio"
                  />
                  <p className="fl-quiz-subprompt">{current.prompt}</p>
                  <span className="fl-muted-sm">Press R to replay · S for slow</span>
                </>
              ) : (
                <>
                  <h2 className="fl-quiz-prompt">{current.subprompt}</h2>
                  {current.phonetic && <p className="fl-quiz-phonetic">/{current.phonetic}/</p>}
                  <span className="fl-muted-sm">
                    Audio unavailable in this browser — match the Brazilian Portuguese phrase
                  </span>
                </>
              )}
            </div>
          ) : current.kind === 'fill-blank' ? (
            <>
              <div className="fl-blank-sentence">{current.blankSentence}</div>
              <p className="fl-quiz-subprompt">
                &ldquo;{current.prompt}&rdquo; · <span>{current.subprompt}</span>
              </p>
            </>
          ) : (
            <>
              <div className="fl-quiz-prompt-row">
                <h2 className="fl-quiz-prompt">{current.prompt}</h2>
                {current.kind === 'mc-pt-to-en' && current.audioText && (
                  <AudioButton text={current.audioText} showSlow size="md" />
                )}
              </div>
              {current.kind === 'mc-pt-to-en' && showPhonetic && current.phonetic && (
                <p className="fl-quiz-phonetic">/{current.phonetic}/</p>
              )}
              {current.subprompt && <p className="fl-quiz-subprompt">{current.subprompt}</p>}
            </>
          )}
        </div>

        {/* Interactive Body by Kind */}
        {(current.kind === 'mc-pt-to-en' ||
          current.kind === 'mc-en-to-pt' ||
          current.kind === 'listen-pick' ||
          current.kind === 'fill-blank') &&
          current.options && (
            <div className="fl-options-grid">
              {current.options.map((opt, idx) => {
                const isCorrectOpt =
                  normalizeText(opt, true) === normalizeText(current.correctAnswer, true);
                const isSelected = selectedOption === opt;
                let stateClass = '';
                if (feedback) {
                  if (isCorrectOpt) stateClass = 'correct';
                  else if (isSelected) stateClass = 'wrong';
                  else stateClass = 'dimmed';
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={Boolean(feedback)}
                    className={`fl-option-btn ${stateClass}`}
                    onClick={() => handleOptionPick(opt)}
                  >
                    <span className="fl-option-key">{idx + 1}</span>
                    <span className="fl-option-text">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

        {current.kind === 'word-bank' && current.wordTiles && (
          <div className="fl-wordbank-wrap">
            <div className="fl-wordbank-tray" aria-label="Your assembled sentence">
              {bankChosenIndices.length === 0 ? (
                <span className="fl-tray-placeholder">Tap words below to build the Brazilian Portuguese sentence...</span>
              ) : (
                bankChosenIndices.map((tileIdx) => (
                  <button
                    key={`chosen-${tileIdx}`}
                    type="button"
                    className="fl-word-tile placed"
                    disabled={Boolean(feedback)}
                    onClick={() => toggleWordTile(tileIdx)}
                  >
                    {current.wordTiles![tileIdx]}
                  </button>
                ))
              )}
            </div>

            <div className="fl-wordbank-pool">
              {current.wordTiles.map((word, idx) => {
                const used = bankChosenIndices.includes(idx);
                return (
                  <button
                    key={`pool-${idx}-${word}`}
                    type="button"
                    className={`fl-word-tile ${used ? 'used' : ''}`}
                    disabled={used || Boolean(feedback)}
                    onClick={() => toggleWordTile(idx)}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            {!feedback && (
              <div className="fl-wordbank-actions">
                <button
                  type="button"
                  className="fl-btn fl-btn-ghost fl-btn-sm"
                  disabled={bankChosenIndices.length === 0}
                  onClick={() => setBankChosenIndices([])}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="fl-btn fl-btn-primary"
                  disabled={bankChosenIndices.length === 0}
                  onClick={handleCheckWordBank}
                >
                  Check Sentence
                </button>
              </div>
            )}
          </div>
        )}

        {current.kind === 'type-pt' && (
          <form className="fl-type-form" onSubmit={handleCheckTyped}>
            <input
              ref={inputRef}
              type="text"
              className="fl-type-input"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              disabled={Boolean(feedback)}
              placeholder="Type in Brazilian Portuguese..."
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <AccentBar onInsert={insertAccent} disabled={Boolean(feedback)} />
            {!feedback && (
              <div className="fl-type-actions">
                <button
                  type="button"
                  className="fl-btn fl-btn-ghost fl-btn-sm"
                  onClick={() =>
                    submitResult(
                      false,
                      'incorrect',
                      'Skipped — now you know it!',
                      `Answer: "${current.correctAnswer}"${current.phonetic ? ` (/${current.phonetic}/)` : ''}`
                    )
                  }
                >
                  Reveal Answer
                </button>
                <button
                  type="submit"
                  className="fl-btn fl-btn-primary"
                  disabled={!typedAnswer.trim()}
                >
                  Check Answer
                </button>
              </div>
            )}
          </form>
        )}

        {/* Instant Feedback Panel */}
        {feedback && (
          <div className={`fl-feedback-box tone-${feedback.tone}`} role="status" aria-live="polite">
            <div className="fl-feedback-main">
              <div className="fl-feedback-icon">
                {feedback.accepted ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              </div>
              <div className="fl-feedback-copy">
                <strong>{feedback.title}</strong>
                <p>{feedback.detail}</p>
              </div>
            </div>
            <div className="fl-feedback-right">
              {current.audioText && <AudioButton text={current.audioText} showSlow size="sm" />}
              <button
                type="button"
                className="fl-btn fl-btn-primary"
                onClick={handleNext}
              >
                <span>{index + 1 >= exercises.length ? 'Finish Lesson' : 'Continue'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
