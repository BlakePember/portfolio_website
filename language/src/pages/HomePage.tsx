import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Coffee,
  Compass,
  Flame,
  Heart,
  Layers,
  MapPin,
  MessageCircle,
  Play,
  RefreshCw,
  Repeat,
  Sparkles,
  Star,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import { UNITS, VOCAB_ITEMS, type Unit, type UnitId } from '../data/curriculum';
import { VERBS } from '../data/verbs';
import { CONVERSATIONS } from '../data/conversations';
import { useLanguage } from '../context/LanguageContext';
import { AudioButton } from '../components/AudioButton';

const FEATURED_IDS = [
  'greet-tudo-bem',
  'food-pao-de-queijo',
  'people-saudade',
  'slang-beleza',
  'intro-a-gente',
  'slang-jeitinho',
  'food-cafezinho',
  'slang-bora',
  'people-gente-boa',
  'city-onde-fica',
];

function UnitIcon({ icon, size = 18 }: { icon: Unit['icon']; size?: number }) {
  switch (icon) {
    case 'sun':
      return <Sun size={size} />;
    case 'user':
      return <User size={size} />;
    case 'coffee':
      return <Coffee size={size} />;
    case 'map':
      return <MapPin size={size} />;
    case 'clock':
      return <Clock size={size} />;
    case 'heart':
      return <Heart size={size} />;
    case 'zap':
      return <Zap size={size} />;
    case 'sparkles':
      return <Sparkles size={size} />;
  }
}

export const HomePage: React.FC = () => {
  const {
    setPage,
    openLesson,
    openFlashcards,
    openConversation,
    allCards,
    starredIds,
    toggleStar,
    stats,
    dueCount,
    masteredCount,
    getUnitMastery,
  } = useLanguage();

  const featuredPool = useMemo(() => {
    const items = FEATURED_IDS.map((id) => VOCAB_ITEMS.find((v) => v.id === id)).filter(
      (v): v is (typeof VOCAB_ITEMS)[number] => Boolean(v)
    );
    return items.length ? items : VOCAB_ITEMS.slice(0, 8);
  }, []);

  const [featuredIdx, setFeaturedIdx] = useState(() => {
    const dayOfYear = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    return dayOfYear % featuredPool.length;
  });

  const featuredCard = featuredPool[featuredIdx % featuredPool.length];
  const isFeaturedStarred = starredIds.includes(featuredCard.id);

  const recommendedUnit = useMemo<Unit>(() => {
    for (const unit of UNITS) {
      const doneCount = stats.lessonsCompleted[unit.id] ?? 0;
      if (doneCount === 0) return unit;
    }
    return UNITS[0];
  }, [stats.lessonsCompleted]);

  const dailyPct = Math.min(100, Math.round((stats.dailyXp / Math.max(1, stats.dailyGoalXp)) * 100));
  const totalLessonsDone = Object.values(stats.lessonsCompleted).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <main className="fl-page fl-home">
      {/* ===== HERO ===== */}
      <section className="fl-hero">
        <div className="fl-hero-copy">
          <div className="fl-eyebrow">
            <span className="fl-dot" />
            <span>
              PORTUGUÊS DO BRASIL · {allCards.length} PHRASES · {VERBS.length} VERBS ·{' '}
              {CONVERSATIONS.length} DIALOGUES
            </span>
          </div>

          <h1 className="fl-hero-title">
            Learn Brazilian<br />
            <span className="fl-highlight">Portuguese</span> naturally.
          </h1>

          <p className="fl-hero-desc">
            Built for how people <strong>actually speak in Brazil</strong> — from your first{' '}
            <em>&ldquo;Oi, tudo bem?&rdquo;</em> and ordering <em>pão de queijo</em> to mastering{' '}
            <strong>a gente</strong>, verb conjugations, nasal sounds, and everyday Rio &amp; São
            Paulo slang.
          </p>

          <div className="fl-hero-actions">
            <button
              type="button"
              className="fl-btn fl-btn-primary fl-btn-lg"
              onClick={() => openLesson(recommendedUnit.id)}
            >
              <Play size={17} />
              <span>
                {totalLessonsDone === 0
                  ? 'Start Unit 1: Greetings'
                  : `Continue: ${recommendedUnit.titleEn}`}
              </span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              className="fl-btn fl-btn-secondary fl-btn-lg"
              onClick={() => openFlashcards('all')}
            >
              <Layers size={17} />
              <span>{dueCount > 0 ? `Review (${dueCount} due)` : 'Flashcards'}</span>
            </button>

            <button
              type="button"
              className="fl-btn fl-btn-ghost fl-btn-lg"
              onClick={() => setPage('guide')}
            >
              <Compass size={17} />
              <span>Pronunciation</span>
            </button>
          </div>
        </div>

        {/* Interactive Word of the Moment Card */}
        <aside className="fl-spot-card" aria-label="Expression of the moment">
          <div className="fl-spot-top">
            <span className="fl-spot-label">
              <Sparkles size={13} /> EXPRESSÃO DO MOMENTO
            </span>
            <div className="fl-spot-tools">
              <button
                type="button"
                className={`fl-mini-icon-btn ${isFeaturedStarred ? 'starred' : ''}`}
                onClick={() => toggleStar(featuredCard.id)}
                title={isFeaturedStarred ? 'Remove bookmark' : 'Bookmark for review'}
                aria-label="Bookmark phrase"
              >
                <Star size={14} fill={isFeaturedStarred ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                className="fl-mini-icon-btn"
                onClick={() => setFeaturedIdx((i) => (i + 1) % featuredPool.length)}
                title="Show another Brazilian expression"
                aria-label="Next expression"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="fl-spot-main">
            <div className="fl-spot-word-row">
              <h2 className="fl-spot-pt">{featuredCard.pt}</h2>
              <AudioButton text={featuredCard.pt} showSlow size="md" />
            </div>
            <p className="fl-spot-phonetic">/{featuredCard.phonetic}/</p>
            <p className="fl-spot-en">{featuredCard.en}</p>
            {featuredCard.literal && (
              <p className="fl-spot-literal">Literally: &ldquo;{featuredCard.literal}&rdquo;</p>
            )}
          </div>

          <div className="fl-spot-example">
            <div className="fl-spot-example-head">
              <span className="fl-chip-label">IN CONTEXT</span>
              <AudioButton text={featuredCard.examplePt} size="sm" />
            </div>
            <p className="fl-spot-ex-pt">{featuredCard.examplePt}</p>
            <p className="fl-spot-ex-en">{featuredCard.exampleEn}</p>
          </div>

          {featuredCard.tip && (
            <p className="fl-spot-tip">
              <strong>Brasil tip:</strong> {featuredCard.tip}
            </p>
          )}
        </aside>
      </section>

      {/* ===== DAILY PROGRESS STRIP ===== */}
      <section className="fl-progress-strip" aria-label="Study progress">
        <div className="fl-goal-card">
          <div className="fl-goal-head">
            <span className="fl-goal-title">Daily Goal</span>
            <span className="fl-goal-num">
              <strong>{stats.dailyXp}</strong> / {stats.dailyGoalXp} XP
            </span>
          </div>
          <div className="fl-bar-track" role="progressbar" aria-valuenow={dailyPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="fl-bar-fill" style={{ width: `${dailyPct}%` }} />
          </div>
          <span className="fl-goal-sub">
            {dailyPct >= 100
              ? 'Meta batida! Daily goal reached!'
              : `${stats.dailyGoalXp - stats.dailyXp} XP left for today's goal`}
          </span>
        </div>

        <div className="fl-metric-card">
          <div className="fl-metric-icon fl-icon-gold">
            <Flame size={18} />
          </div>
          <div>
            <div className="fl-metric-val">
              {stats.streakDays} day{stats.streakDays === 1 ? '' : 's'}
            </div>
            <div className="fl-metric-label">Current Streak (Best {stats.bestStreakDays}d)</div>
          </div>
        </div>

        <div className="fl-metric-card">
          <div className="fl-metric-icon fl-icon-emerald">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="fl-metric-val">
              {masteredCount} / {allCards.length}
            </div>
            <div className="fl-metric-label">Words Mastered in SRS</div>
          </div>
        </div>

        <button
          type="button"
          className="fl-metric-card fl-metric-action"
          onClick={() => openFlashcards('all')}
        >
          <div className="fl-metric-icon fl-icon-sky">
            <Layers size={18} />
          </div>
          <div>
            <div className="fl-metric-val">
              {dueCount > 0 ? `${dueCount} Due Now` : 'All Caught Up'}
            </div>
            <div className="fl-metric-label">Open Spaced Repetition →</div>
          </div>
        </button>
      </section>

      {/* ===== GUIDED CURRICULUM PATH ===== */}
      <section className="fl-section" aria-labelledby="curriculum-heading">
        <div className="fl-section-head">
          <div>
            <span className="fl-section-eyebrow">GUIDED PATH · A0 TO A2</span>
            <h2 id="curriculum-heading">8 Brazilian Portuguese Units</h2>
          </div>
          <p className="fl-section-sub">
            Each lesson previews key phrases with Brazilian audio, then builds active recall through
            listening, sentence building, and accent-assisted typing.
          </p>
        </div>

        <div className="fl-unit-grid">
          {UNITS.map((unit) => {
            const mastery = getUnitMastery(unit.id);
            const completions = stats.lessonsCompleted[unit.id] ?? 0;

            return (
              <article key={unit.id} className={`fl-unit-card ${completions > 0 ? 'completed' : ''}`}>
                <div className="fl-unit-top">
                  <div className="fl-unit-icon">
                    <UnitIcon icon={unit.icon} size={18} />
                  </div>
                  <div className="fl-unit-badges">
                    <span className="fl-unit-num">UNIT {String(unit.order).padStart(2, '0')}</span>
                    <span className={`fl-level-pill level-${unit.level.toLowerCase()}`}>
                      {unit.level}
                    </span>
                  </div>
                </div>

                <h3 className="fl-unit-title-pt">{unit.titlePt}</h3>
                <p className="fl-unit-title-en">{unit.titleEn}</p>
                <p className="fl-unit-desc">{unit.subtitle}</p>

                <div className="fl-unit-tip-chip">
                  <BookOpen size={12} />
                  <span>{unit.grammarTitle}</span>
                </div>

                <div className="fl-unit-progress">
                  <div className="fl-unit-progress-row">
                    <span>
                      {mastery.reviewed} / {mastery.total} words practiced
                    </span>
                    {completions > 0 && (
                      <span className="fl-done-badge">
                        <CheckCircle2 size={12} /> {completions}× done
                      </span>
                    )}
                  </div>
                  <div className="fl-bar-track sm">
                    <div
                      className="fl-bar-fill"
                      style={{
                        width: `${Math.max(mastery.pct, completions > 0 ? 35 : 0)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="fl-unit-actions">
                  <button
                    type="button"
                    className="fl-btn fl-btn-primary fl-btn-sm"
                    onClick={() => openLesson(unit.id)}
                  >
                    <Play size={14} />
                    <span>{completions > 0 ? 'Practice Again' : 'Start Lesson'}</span>
                  </button>
                  <button
                    type="button"
                    className="fl-btn fl-btn-secondary fl-btn-sm"
                    onClick={() => openFlashcards(unit.id as UnitId)}
                  >
                    <Layers size={14} />
                    <span>Cards</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ===== PRACTICE STUDIO MODES ===== */}
      <section className="fl-section" aria-labelledby="studio-heading">
        <div className="fl-section-head">
          <div>
            <span className="fl-section-eyebrow">PRACTICE STUDIO</span>
            <h2 id="studio-heading">Go Beyond Flashcards</h2>
          </div>
        </div>

        <div className="fl-studio-grid">
          <button
            type="button"
            className="fl-studio-card"
            onClick={() => setPage('verbs')}
          >
            <div className="fl-studio-icon fl-icon-emerald">
              <Repeat size={20} />
            </div>
            <h3>Brazilian Verb Trainer</h3>
            <p>
              Master the {VERBS.length} most essential verbs across Present, Simple Past, Imperfect,
              and spoken Future — focused on <em>eu, você, a gente, nós,</em> and <em>vocês</em>.
            </p>
            <span className="fl-studio-link">
              Open Verb Drills <ArrowRight size={14} />
            </span>
          </button>

          <button
            type="button"
            className="fl-studio-card"
            onClick={() => openConversation('padaria')}
          >
            <div className="fl-studio-icon fl-icon-gold">
              <MessageCircle size={20} />
            </div>
            <h3>Real Brazilian Dialogues</h3>
            <p>
              Step into {CONVERSATIONS.length} real scenarios from São Paulo bakeries to Rio beaches
              — listen along line-by-line or practice speaking your half in Roleplay mode.
            </p>
            <span className="fl-studio-link">
              Start a Conversation <ArrowRight size={14} />
            </span>
          </button>

          <button
            type="button"
            className="fl-studio-card"
            onClick={() => setPage('guide')}
          >
            <div className="fl-studio-icon fl-icon-sky">
              <Compass size={20} />
            </div>
            <h3>Pronunciation &amp; Survival Guide</h3>
            <p>
              Interactive <code>pt-BR</code> soundboard for nasal <em>ão</em>, R→H, D→J, T→CH,
              essential contractions (<em>no, na, tá, pra</em>), Ser vs. Estar, and false friends.
            </p>
            <span className="fl-studio-link">
              Explore the Guide <ArrowRight size={14} />
            </span>
          </button>
        </div>
      </section>
    </main>
  );
};
