import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Link2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  CONTRACTIONS,
  FALSE_FRIENDS,
  SER_ESTAR_PAIRS,
  SOUND_RULES,
} from '../data/guide';
import { AudioButton } from '../components/AudioButton';

type GuideTab = 'pronunciation' | 'contractions' | 'ser-estar' | 'false-friends';

export const GuidePage: React.FC = () => {
  const [tab, setTab] = useState<GuideTab>('pronunciation');

  return (
    <main className="fl-page fl-guide-page">
      <header className="fl-page-header">
        <div>
          <span className="fl-section-eyebrow">BRAZILIAN SURVIVAL GUIDE</span>
          <h1>Pronunciation &amp; Core Patterns</h1>
          <p className="fl-muted-sm">
            Portuguese spelling is remarkably consistent once you know Brazil&apos;s signature sound
            shifts. Click any word to hear it aloud in <code>pt-BR</code>.
          </p>
        </div>
      </header>

      <div className="fl-guide-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pronunciation'}
          className={`fl-guide-tab ${tab === 'pronunciation' ? 'active' : ''}`}
          onClick={() => setTab('pronunciation')}
        >
          <Volume2 size={16} /> Soundboard
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'contractions'}
          className={`fl-guide-tab ${tab === 'contractions' ? 'active' : ''}`}
          onClick={() => setTab('contractions')}
        >
          <Link2 size={16} /> Contractions &amp; Spoken Shortcuts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ser-estar'}
          className={`fl-guide-tab ${tab === 'ser-estar' ? 'active' : ''}`}
          onClick={() => setTab('ser-estar')}
        >
          <ArrowRightLeft size={16} /> Ser vs. Estar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'false-friends'}
          className={`fl-guide-tab ${tab === 'false-friends' ? 'active' : ''}`}
          onClick={() => setTab('false-friends')}
        >
          <AlertTriangle size={16} /> False Friends
        </button>
      </div>

      {/* TAB 1: PRONUNCIATION SOUNDBOARD */}
      {tab === 'pronunciation' && (
        <section className="fl-sound-grid">
          {SOUND_RULES.map((rule) => (
            <article key={rule.id} className="fl-sound-card">
              <div className="fl-sound-head">
                <span className="fl-sound-symbol">{rule.symbol}</span>
                <span className="fl-sound-tag">{rule.tag}</span>
              </div>
              <h3>{rule.title}</h3>
              <p className="fl-sound-rule">{rule.rule}</p>

              <div className="fl-sound-examples">
                {rule.examples.map((ex) => (
                  <div key={ex.pt} className="fl-sound-ex-row">
                    <div>
                      <strong>{ex.pt}</strong>
                      <span className="fl-preview-phonetic">/{ex.phonetic}/</span>
                      <span className="fl-sound-ex-en">{ex.en}</span>
                    </div>
                    <AudioButton text={ex.pt} showSlow size="sm" />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* TAB 2: CONTRACTIONS */}
      {tab === 'contractions' && (
        <section className="fl-guide-stack">
          <div className="fl-guide-block">
            <h2>Mandatory Grammar Contractions</h2>
            <p className="fl-muted-sm">
              In Portuguese, prepositions fuse directly with articles (<em>o, a, os, as</em>). You
              never say &ldquo;em o hotel&rdquo; — always say <strong>no hotel</strong>!
            </p>
            <div className="fl-contraction-grid">
              {CONTRACTIONS.filter((c) => c.kind === 'grammar').map((row) => (
                <div key={row.formula} className="fl-contraction-card">
                  <div className="fl-contraction-eq">
                    <span className="fl-formula">{row.formula}</span>
                    <span className="fl-arrow">→</span>
                    <strong className="fl-result">{row.result}</strong>
                  </div>
                  <p className="fl-contraction-meaning">{row.meaning}</p>
                  <div className="fl-contraction-ex">
                    <div>
                      <strong>{row.examplePt}</strong>
                      <span>{row.exampleEn}</span>
                    </div>
                    <AudioButton text={row.examplePt} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fl-guide-block">
            <h2>
              <Sparkles size={17} /> Everyday Spoken Brazilian Reductions
            </h2>
            <p className="fl-muted-sm">
              Textbooks teach full forms, but in Rio, São Paulo, and everywhere in Brazil, you will
              hear these contractions constantly:
            </p>
            <div className="fl-contraction-grid">
              {CONTRACTIONS.filter((c) => c.kind === 'spoken').map((row) => (
                <div key={row.formula} className="fl-contraction-card spoken">
                  <div className="fl-contraction-eq">
                    <span className="fl-formula">{row.formula}</span>
                    <span className="fl-arrow">→</span>
                    <strong className="fl-result">{row.result}</strong>
                  </div>
                  <p className="fl-contraction-meaning">{row.meaning}</p>
                  <div className="fl-contraction-ex">
                    <div>
                      <strong>{row.examplePt}</strong>
                      <span>{row.exampleEn}</span>
                    </div>
                    <AudioButton text={row.examplePt} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: SER VS ESTAR */}
      {tab === 'ser-estar' && (
        <section className="fl-guide-stack">
          <div className="fl-ser-estar-summary">
            <div className="fl-se-card">
              <span className="fl-chip-label">SER (EU SOU · VOCÊ É)</span>
              <h3>Identity &amp; Essence</h3>
              <p>
                Nationality, profession, personality, time, dates, and inherent qualities that
                define what something <em>is</em>.
              </p>
            </div>
            <div className="fl-se-card">
              <span className="fl-chip-label">ESTAR (EU ESTOU/TÔ · VOCÊ ESTÁ/TÁ)</span>
              <h3>State &amp; Moment</h3>
              <p>
                Moods, feelings, temperature, temporary conditions, ongoing actions (<em>estou
                estudando</em>), and where a person is right now.
              </p>
            </div>
          </div>

          <div className="fl-se-pairs">
            {SER_ESTAR_PAIRS.map((pair) => (
              <article key={pair.context} className="fl-se-pair-card">
                <h4>{pair.context}</h4>
                <div className="fl-se-cols">
                  <div className="fl-se-col">
                    <div className="fl-se-row">
                      <strong>{pair.serPt}</strong>
                      <AudioButton text={pair.serPt} size="sm" />
                    </div>
                    <span>{pair.serEn}</span>
                  </div>
                  <div className="fl-se-col">
                    <div className="fl-se-row">
                      <strong>{pair.estarPt}</strong>
                      <AudioButton text={pair.estarPt} size="sm" />
                    </div>
                    <span>{pair.estarEn}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 4: FALSE FRIENDS */}
      {tab === 'false-friends' && (
        <section className="fl-ff-grid">
          {FALSE_FRIENDS.map((ff) => (
            <article key={ff.pt} className="fl-ff-card">
              <div className="fl-ff-top">
                <div>
                  <h3>{ff.pt}</h3>
                  <span className="fl-ff-trap">Looks like: {ff.looksLike}</span>
                </div>
                <AudioButton text={ff.pt} size="sm" />
              </div>
              <p className="fl-ff-meaning">
                <strong>Actually means:</strong> {ff.actuallyMeans}
              </p>
              <p className="fl-ff-real">
                <strong>Use instead:</strong> {ff.realPtForLookalike}
              </p>
              <div className="fl-ff-ex">
                <span>{ff.examplePt}</span>
                <AudioButton text={ff.examplePt} size="sm" />
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
};
