import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  Lightbulb,
  Repeat,
  XCircle,
} from 'lucide-react';
import {
  PRONOUNS,
  TENSES,
  VERBS,
  type PronounKey,
  type TenseId,
  type VerbEntry,
  type VerbGroup,
} from '../data/verbs';
import { useLanguage } from '../context/LanguageContext';
import { gradePortugueseAnswer } from '../utils/grader';
import { playCorrectSound, playWrongSound } from '../utils/sounds';
import { AudioButton } from '../components/AudioButton';
import { AccentBar } from '../components/AccentBar';

type VerbMode = 'explore' | 'drill';
type GroupFilter = 'all' | 'essential' | VerbGroup;

interface DrillPrompt {
  verb: VerbEntry;
  tense: TenseId;
  pronoun: PronounKey;
  answer: string;
  options: string[];
}

function buildDrillPrompt(
  verbs: VerbEntry[],
  tenses: TenseId[],
  avoidKey?: string
): DrillPrompt {
  const pool = verbs.length ? verbs : VERBS;
  const activeTenses: TenseId[] = tenses.length ? tenses : ['presente'];

  let chosenVerb = pool[Math.floor(Math.random() * pool.length)];
  let chosenTense = activeTenses[Math.floor(Math.random() * activeTenses.length)];
  let chosenPronoun = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)].key;

  for (let tries = 0; tries < 6; tries++) {
    const key = `${chosenVerb.id}-${chosenTense}-${chosenPronoun}`;
    if (key !== avoidKey) break;
    chosenVerb = pool[Math.floor(Math.random() * pool.length)];
    chosenTense = activeTenses[Math.floor(Math.random() * activeTenses.length)];
    chosenPronoun = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)].key;
  }

  const answer = chosenVerb.conjugations[chosenTense][chosenPronoun];
  const distractors = new Set<string>([answer]);

  // Pull plausible forms from same verb first, then other verbs in same tense
  for (const t of TENSES) {
    for (const p of PRONOUNS) {
      const candidate = chosenVerb.conjugations[t.id][p.key];
      if (!distractors.has(candidate)) distractors.add(candidate);
      if (distractors.size >= 4) break;
    }
    if (distractors.size >= 4) break;
  }

  const options = Array.from(distractors).slice(0, 4).sort(() => Math.random() - 0.5);
  return {
    verb: chosenVerb,
    tense: chosenTense,
    pronoun: chosenPronoun,
    answer,
    options,
  };
}

export const VerbsPage: React.FC = () => {
  const { speak, stats, recordVerbAttempt } = useLanguage();
  const [mode, setMode] = useState<VerbMode>('explore');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [selectedVerbId, setSelectedVerbId] = useState<string>('ser');
  const [exploreTense, setExploreTense] = useState<TenseId>('presente');

  // Drill state
  const [drillTenses, setDrillTenses] = useState<TenseId[]>(['presente', 'passado', 'futuro']);
  const [drillInputMode, setDrillInputMode] = useState<'type' | 'choice'>('type');
  const [typed, setTyped] = useState('');
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<{
    accepted: boolean;
    tone: 'exact' | 'warning' | 'incorrect';
    message: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredVerbs = useMemo(() => {
    if (groupFilter === 'all') return VERBS;
    if (groupFilter === 'essential') return VERBS.filter((v) => v.essential);
    return VERBS.filter((v) => v.group === groupFilter);
  }, [groupFilter]);

  const selectedVerb = useMemo(
    () =>
      filteredVerbs.find((v) => v.id === selectedVerbId) ??
      filteredVerbs[0] ??
      VERBS[0],
    [filteredVerbs, selectedVerbId]
  );

  const [prompt, setPrompt] = useState<DrillPrompt>(() =>
    buildDrillPrompt(VERBS.filter((v) => v.essential), ['presente', 'passado', 'futuro'])
  );

  const nextPrompt = useCallback(() => {
    const key = `${prompt.verb.id}-${prompt.tense}-${prompt.pronoun}`;
    setPrompt(buildDrillPrompt(filteredVerbs, drillTenses, key));
    setTyped('');
    setResult(null);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [drillTenses, filteredVerbs, prompt]);

  // Refresh drill prompt if group filter excludes current verb or tense selection excludes current tense
  useEffect(() => {
    if (mode !== 'drill') return;
    const verbInFilter = filteredVerbs.some((v) => v.id === prompt.verb.id);
    const tenseInFilter = drillTenses.includes(prompt.tense);
    if (!verbInFilter || !tenseInFilter) {
      setPrompt(buildDrillPrompt(filteredVerbs, drillTenses));
      setTyped('');
      setResult(null);
    }
  }, [drillTenses, filteredVerbs, mode, prompt.tense, prompt.verb.id]);

  const toggleDrillTense = (tenseId: TenseId) => {
    setDrillTenses((prev) => {
      if (prev.includes(tenseId)) {
        if (prev.length === 1) return prev; // Keep at least one tense active
        return prev.filter((t) => t !== tenseId);
      }
      return [...prev, tenseId];
    });
  };

  const evaluateAnswer = useCallback(
    (guess: string) => {
      if (result) return;
      const alts: string[] = [];
      if (prompt.tense === 'presente' && prompt.verb.spokenForms?.[prompt.pronoun]) {
        alts.push(prompt.verb.spokenForms[prompt.pronoun]!);
      }
      const grade = gradePortugueseAnswer(guess, prompt.answer, alts);
      recordVerbAttempt(grade.accepted);

      if (grade.accepted) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        playCorrectSound(nextStreak);
        setResult({
          accepted: true,
          tone: grade.status === 'exact' ? 'exact' : 'warning',
          message:
            grade.status === 'exact'
              ? `Perfeito! "${prompt.pronoun === 'voce' ? 'você' : prompt.pronoun} ${prompt.answer}"`
              : grade.feedback,
        });
      } else {
        setStreak(0);
        playWrongSound();
        setResult({
          accepted: false,
          tone: 'incorrect',
          message: `Correct form: "${prompt.answer}"`,
        });
      }

      const spokenSubject =
        prompt.pronoun === 'voce'
          ? 'você'
          : prompt.pronoun === 'voces'
            ? 'vocês'
            : prompt.pronoun === 'nos'
              ? 'nós'
              : 'eu';
      speak(`${spokenSubject} ${prompt.answer}`, false);
    },
    [prompt, recordVerbAttempt, result, speak, streak]
  );

  // Keyboard shortcuts in drill mode (Enter to advance, 1-4 in multiple choice)
  useEffect(() => {
    if (mode !== 'drill') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && result) {
        e.preventDefault();
        nextPrompt();
        return;
      }
      if (!result && drillInputMode === 'choice' && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (prompt.options[idx]) {
          e.preventDefault();
          evaluateAnswer(prompt.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drillInputMode, evaluateAnswer, mode, nextPrompt, prompt.options, result]);

  const insertAccent = (ch: string) => {
    const input = inputRef.current;
    if (!input) {
      setTyped((p) => p + ch);
      return;
    }
    const start = input.selectionStart ?? typed.length;
    const end = input.selectionEnd ?? typed.length;
    setTyped(typed.slice(0, start) + ch + typed.slice(end));
    window.requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  const tenseMeta = TENSES.find((t) => t.id === prompt.tense) ?? TENSES[0];
  const pronounMeta = PRONOUNS.find((p) => p.key === prompt.pronoun) ?? PRONOUNS[0];
  const verbAccPct =
    stats.verbsAttempted > 0
      ? Math.round((stats.verbsCorrect / stats.verbsAttempted) * 100)
      : null;

  return (
    <main className="fl-page fl-verbs-page">
      <header className="fl-page-header">
        <div>
          <span className="fl-section-eyebrow">BRAZILIAN CONJUGATION</span>
          <h1>Verb Explorer &amp; Drill</h1>
          <p className="fl-muted-sm">
            Brazilian Portuguese skips textbook <em>tu/vós</em> in everyday speech — learn just 4
            forms per tense (<em>eu, você/a gente, nós, vocês</em>) and unlock real conversation.
          </p>
        </div>

        <div className="fl-segmented">
          <button
            type="button"
            className={mode === 'explore' ? 'active' : ''}
            onClick={() => setMode('explore')}
          >
            <BookOpen size={15} /> Explorer
          </button>
          <button
            type="button"
            className={mode === 'drill' ? 'active' : ''}
            onClick={() => setMode('drill')}
          >
            <Repeat size={15} /> Conjugation Drill
          </button>
        </div>
      </header>

      {/* Group filter strip */}
      <div className="fl-pill-row" role="group" aria-label="Filter verbs">
        {(
          [
            ['all', `All (${VERBS.length})`],
            ['essential', 'Top Essentials'],
            ['irregular', 'Irregular'],
            ['ar', '-AR Regular'],
            ['er', '-ER Regular'],
            ['ir', '-IR Regular'],
          ] as Array<[GroupFilter, string]>
        ).map(([val, label]) => (
          <button
            key={val}
            type="button"
            className={`fl-filter-pill ${groupFilter === val ? 'active' : ''}`}
            onClick={() => setGroupFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ================= EXPLORER MODE ================= */}
      {mode === 'explore' && (
        <section className="fl-verb-explorer">
          <aside className="fl-verb-list" aria-label="Verb list">
            {filteredVerbs.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`fl-verb-list-item ${v.id === selectedVerb.id ? 'active' : ''}`}
                onClick={() => setSelectedVerbId(v.id)}
              >
                <div>
                  <strong>{v.infinitive}</strong>
                  <span>{v.english}</span>
                </div>
                <span className={`fl-group-tag group-${v.group}`}>
                  {v.group === 'irregular' ? 'irreg' : `-${v.group}`}
                </span>
              </button>
            ))}
          </aside>

          <div className="fl-verb-detail">
            <div className="fl-verb-detail-head">
              <div>
                <div className="fl-verb-title-row">
                  <h2>{selectedVerb.infinitive}</h2>
                  <AudioButton text={selectedVerb.infinitive.replace(/\s*\(.*\)/, '')} showSlow size="md" />
                </div>
                <p className="fl-verb-meaning">{selectedVerb.english}</p>
              </div>
              <button
                type="button"
                className="fl-btn fl-btn-primary fl-btn-sm"
                onClick={() => {
                  setPrompt(buildDrillPrompt([selectedVerb], drillTenses));
                  setResult(null);
                  setTyped('');
                  setMode('drill');
                }}
              >
                <Repeat size={14} /> Drill this verb
              </button>
            </div>

            <div className="fl-grammar-banner compact">
              <div className="fl-grammar-icon">
                <Lightbulb size={16} />
              </div>
              <p>{selectedVerb.tip}</p>
            </div>

            {/* Tense tabs */}
            <div className="fl-tense-tabs" role="tablist">
              {TENSES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={exploreTense === t.id}
                  className={`fl-tense-tab ${exploreTense === t.id ? 'active' : ''}`}
                  onClick={() => setExploreTense(t.id)}
                >
                  <strong>{t.namePt}</strong>
                  <span>{t.nameEn}</span>
                </button>
              ))}
            </div>

            <p className="fl-tense-desc">
              {TENSES.find((t) => t.id === exploreTense)?.description}
            </p>

            {/* Conjugation Table */}
            <div className="fl-conj-table">
              {PRONOUNS.map((p) => {
                const form = selectedVerb.conjugations[exploreTense][p.key];
                const spoken = exploreTense === 'presente' ? selectedVerb.spokenForms?.[p.key] : undefined;
                const audioSubject =
                  p.key === 'voce' ? 'você' : p.key === 'voces' ? 'vocês' : p.key === 'nos' ? 'nós' : 'eu';
                return (
                  <div key={p.key} className="fl-conj-row">
                    <div className="fl-conj-pronoun">
                      <strong>{p.label}</strong>
                      <span>{p.sublabel}</span>
                    </div>
                    <div className="fl-conj-form">
                      <span className="fl-conj-word">{form}</span>
                      {spoken && (
                        <span className="fl-spoken-badge">Spoken: {spoken}</span>
                      )}
                    </div>
                    <AudioButton text={`${audioSubject} ${form}`} size="sm" />
                  </div>
                );
              })}
            </div>

            {/* Real Example */}
            <div className="fl-spot-example">
              <div className="fl-spot-example-head">
                <span className="fl-chip-label">IN BRAZILIAN CONTEXT</span>
                <AudioButton text={selectedVerb.examplePt} showSlow size="sm" />
              </div>
              <p className="fl-spot-ex-pt">{selectedVerb.examplePt}</p>
              <p className="fl-spot-ex-en">{selectedVerb.exampleEn}</p>
            </div>
          </div>
        </section>
      )}

      {/* ================= DRILL MODE ================= */}
      {mode === 'drill' && (
        <section className="fl-verb-drill">
          <div className="fl-drill-config">
            <div className="fl-drill-tenses">
              <span className="fl-filter-label">Tenses:</span>
              {TENSES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`fl-filter-pill sm ${drillTenses.includes(t.id) ? 'active' : ''}`}
                  onClick={() => toggleDrillTense(t.id)}
                >
                  {t.nameEn}
                </button>
              ))}
            </div>

            <div className="fl-drill-right-meta">
              <div className="fl-segmented sm">
                <button
                  type="button"
                  className={drillInputMode === 'type' ? 'active' : ''}
                  onClick={() => setDrillInputMode('type')}
                >
                  Type
                </button>
                <button
                  type="button"
                  className={drillInputMode === 'choice' ? 'active' : ''}
                  onClick={() => setDrillInputMode('choice')}
                >
                  Multiple Choice
                </button>
              </div>
              <div className="fl-quiz-streak">
                <Flame size={14} /> {streak}
                {verbAccPct !== null && <span className="fl-muted-sm"> · {verbAccPct}% acc</span>}
              </div>
            </div>
          </div>

          <div className="fl-quiz-card">
            <div className="fl-quiz-kind-row">
              <span className="fl-kind-pill">
                {tenseMeta.namePt.toUpperCase()} ({tenseMeta.nameEn})
              </span>
              <span className={`fl-group-tag group-${prompt.verb.group}`}>
                {prompt.verb.group === 'irregular' ? 'Irregular' : `Regular -${prompt.verb.group.toUpperCase()}`}
              </span>
            </div>

            <div className="fl-drill-prompt-box">
              <div className="fl-drill-infinitive">
                <strong>{prompt.verb.infinitive}</strong>
                <span>({prompt.verb.english})</span>
              </div>
              <div className="fl-drill-subject">
                Conjugate for: <mark>{pronounMeta.label}</mark>
              </div>
              <p className="fl-muted-sm">{tenseMeta.description}</p>
            </div>

            {drillInputMode === 'type' ? (
              <form
                className="fl-type-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typed.trim()) evaluateAnswer(typed);
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className="fl-type-input"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={Boolean(result)}
                  placeholder={`Type the ${tenseMeta.nameEn.toLowerCase()} form...`}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <AccentBar onInsert={insertAccent} disabled={Boolean(result)} />
                {!result && (
                  <div className="fl-type-actions">
                    <button
                      type="button"
                      className="fl-btn fl-btn-ghost fl-btn-sm"
                      onClick={() => evaluateAnswer('')}
                    >
                      Reveal
                    </button>
                    <button
                      type="submit"
                      className="fl-btn fl-btn-primary"
                      disabled={!typed.trim()}
                    >
                      Check Form
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <div className="fl-options-grid">
                {prompt.options.map((opt, idx) => {
                  const isRight = opt === prompt.answer;
                  let cls = '';
                  if (result) {
                    cls = isRight ? 'correct' : 'dimmed';
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(result)}
                      className={`fl-option-btn ${cls}`}
                      onClick={() => evaluateAnswer(opt)}
                    >
                      <span className="fl-option-key">{idx + 1}</span>
                      <span className="fl-option-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {result && (
              <div className={`fl-feedback-box tone-${result.tone}`} role="status">
                <div className="fl-feedback-main">
                  <div className="fl-feedback-icon">
                    {result.accepted ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                  </div>
                  <div className="fl-feedback-copy">
                    <strong>{result.message}</strong>
                    <p>{prompt.verb.tip}</p>
                  </div>
                </div>
                <button type="button" className="fl-btn fl-btn-primary" onClick={nextPrompt}>
                  Next Verb <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
};
