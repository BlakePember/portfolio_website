import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Ear,
  Layers,
  List,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { UNITS, type UnitId, type VocabItem } from '../data/curriculum';
import { useLanguage } from '../context/LanguageContext';
import {
  getCardStatus,
  isCardDue,
  previewIntervals,
  type SrsRating,
} from '../utils/srs';
import { playCorrectSound, playTapSound, playWrongSound } from '../utils/sounds';
import { AudioButton } from '../components/AudioButton';

type DeckFilter = 'smart' | 'all' | 'starred' | 'custom' | UnitId;
type CardDirection = 'pt-en' | 'en-pt' | 'audio';
type FlashcardView = 'study' | 'browse';

export const FlashcardsPage: React.FC = () => {
  const {
    flashcardsFilterUnit,
    allCards,
    customCards,
    addCustomCard,
    deleteCustomCard,
    srs,
    starredIds,
    toggleStar,
    recordSrsReview,
    speak,
  } = useLanguage();

  const [view, setView] = useState<FlashcardView>('study');
  const [filter, setFilter] = useState<DeckFilter>(
    flashcardsFilterUnit === 'all' ? 'smart' : flashcardsFilterUnit
  );
  const [direction, setDirection] = useState<CardDirection>('pt-en');
  const [flipped, setFlipped] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [reviewedInSession, setReviewedInSession] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Card Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPt, setNewPt] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newExamplePt, setNewExamplePt] = useState('');
  const [newExampleEn, setNewExampleEn] = useState('');

  // Sync if user navigated from a specific unit card
  useEffect(() => {
    setFilter(flashcardsFilterUnit === 'all' ? 'smart' : flashcardsFilterUnit);
    setCursor(0);
    setFlipped(false);
  }, [flashcardsFilterUnit]);

  const deckCards = useMemo<VocabItem[]>(() => {
    const now = Date.now();
    let list = [...allCards];

    if (filter === 'starred') {
      list = list.filter((c) => starredIds.includes(c.id));
    } else if (filter === 'custom') {
      list = [...customCards];
    } else if (filter !== 'smart' && filter !== 'all') {
      list = list.filter((c) => c.unitId === filter);
    }

    if (filter === 'smart') {
      // Prioritize: (1) overdue reviewed cards, (2) learning cards, (3) new cards, (4) upcoming
      return list.sort((a, b) => {
        const pa = srs[a.id];
        const pb = srs[b.id];
        const aDue = pa && pa.lastReviewedAt > 0 && isCardDue(pa, now) ? 0 : !pa ? 1 : 2;
        const bDue = pb && pb.lastReviewedAt > 0 && isCardDue(pb, now) ? 0 : !pb ? 1 : 2;
        if (aDue !== bDue) return aDue - bDue;
        return (pa?.dueAt ?? 0) - (pb?.dueAt ?? 0);
      });
    }

    return list;
  }, [allCards, customCards, filter, srs, starredIds]);

  const browseCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return deckCards;
    return deckCards.filter(
      (c) =>
        c.pt.toLowerCase().includes(q) ||
        c.en.toLowerCase().includes(q) ||
        c.phonetic.toLowerCase().includes(q)
    );
  }, [deckCards, searchQuery]);

  const currentCard = deckCards.length ? deckCards[cursor % deckCards.length] : null;
  const currentProgress = currentCard ? srs[currentCard.id] : undefined;
  const intervalHints = useMemo(
    () => previewIntervals(currentProgress),
    [currentProgress]
  );

  // Auto-play audio in Audio First mode when a new card shows
  useEffect(() => {
    if (view === 'study' && direction === 'audio' && currentCard && !flipped) {
      const t = window.setTimeout(() => speak(currentCard.pt, false), 180);
      return () => window.clearTimeout(t);
    }
  }, [view, direction, currentCard, flipped, speak]);

  const handleFlip = useCallback(() => {
    if (!currentCard) return;
    playTapSound();
    setFlipped((f) => {
      const next = !f;
      if (next && direction === 'en-pt') {
        speak(currentCard.pt, false);
      }
      return next;
    });
  }, [currentCard, direction, speak]);

  const handleRate = useCallback(
    (rating: SrsRating) => {
      if (!currentCard) return;
      if (rating === 0) playWrongSound();
      else playCorrectSound(rating);

      recordSrsReview(currentCard.id, rating, rating === 0 ? 2 : 5);
      setReviewedInSession((n) => n + 1);
      setFlipped(false);
      // In smart mode the reviewed card moves down the priority queue naturally; otherwise advance cursor
      if (filter !== 'smart') {
        setCursor((c) => (c + 1) % Math.max(1, deckCards.length));
      } else {
        setCursor(0);
      }
    },
    [currentCard, deckCards.length, filter, recordSrsReview]
  );

  // Keyboard shortcuts in study view
  useEffect(() => {
    if (view !== 'study' || showAddModal || !currentCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        speak(currentCard.pt, false);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        speak(currentCard.pt, true);
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        handleRate((Number(e.key) - 1) as SrsRating);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentCard, flipped, handleFlip, handleRate, showAddModal, speak, view]);

  const handleAddCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPt.trim() || !newEn.trim()) return;
    addCustomCard({
      pt: newPt.trim(),
      en: newEn.trim(),
      phonetic: newPhonetic.trim() || 'Tap speaker to listen',
      examplePt: newExamplePt.trim() || newPt.trim(),
      exampleEn: newExampleEn.trim() || newEn.trim(),
      tip: 'Personal custom flashcard',
    });
    setNewPt('');
    setNewEn('');
    setNewPhonetic('');
    setNewExamplePt('');
    setNewExampleEn('');
    setShowAddModal(false);
    setFilter('custom');
    setCursor(0);
    setFlipped(false);
  };

  return (
    <main className="fl-page fl-flashcards-page">
      <header className="fl-page-header">
        <div>
          <span className="fl-section-eyebrow">SPACED REPETITION · SM-2</span>
          <h1>Brazilian Portuguese Flashcards</h1>
          <p className="fl-muted-sm">
            Review words right before you forget them. Press <kbd>Space</kbd> to flip and{' '}
            <kbd>1</kbd>–<kbd>4</kbd> to rate recall.
          </p>
        </div>

        <div className="fl-header-controls">
          <div className="fl-segmented">
            <button
              type="button"
              className={view === 'study' ? 'active' : ''}
              onClick={() => setView('study')}
            >
              <Layers size={15} /> Study Deck
            </button>
            <button
              type="button"
              className={view === 'browse' ? 'active' : ''}
              onClick={() => setView('browse')}
            >
              <List size={15} /> Browse ({deckCards.length})
            </button>
          </div>

          <button
            type="button"
            className="fl-btn fl-btn-primary fl-btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} /> Add Word
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <section className="fl-filter-bar" aria-label="Deck filters">
        <div className="fl-filter-group">
          <label htmlFor="deck-select" className="fl-filter-label">Deck</label>
          <select
            id="deck-select"
            className="fl-select"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as DeckFilter);
              setCursor(0);
              setFlipped(false);
            }}
          >
            <option value="smart">Smart Review Queue ({allCards.length})</option>
            <option value="all">All Cards ({allCards.length})</option>
            <option value="starred">Starred / Bookmarked ({starredIds.length})</option>
            <option value="custom">My Custom Words ({customCards.length})</option>
            <optgroup label="By Curriculum Unit">
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.order}: {u.titlePt} ({u.titleEn})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {view === 'study' ? (
          <div className="fl-filter-group">
            <span className="fl-filter-label">Card Front</span>
            <div className="fl-segmented sm">
              <button
                type="button"
                className={direction === 'pt-en' ? 'active' : ''}
                onClick={() => {
                  setDirection('pt-en');
                  setFlipped(false);
                }}
              >
                PT → EN
              </button>
              <button
                type="button"
                className={direction === 'en-pt' ? 'active' : ''}
                onClick={() => {
                  setDirection('en-pt');
                  setFlipped(false);
                }}
              >
                EN → PT
              </button>
              <button
                type="button"
                className={direction === 'audio' ? 'active' : ''}
                onClick={() => {
                  setDirection('audio');
                  setFlipped(false);
                }}
              >
                <Ear size={13} /> Audio
              </button>
            </div>
          </div>
        ) : (
          <div className="fl-search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search Portuguese or English..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <div className="fl-session-pill">
          <Sparkles size={14} />
          <span>{reviewedInSession} reviewed this session</span>
        </div>
      </section>

      {/* STUDY DECK VIEW */}
      {view === 'study' && (
        <section className="fl-study-stage">
          {!currentCard ? (
            <div className="fl-empty-card">
              <CheckCircle2 size={34} />
              <h3>No cards in this filter yet</h3>
              <p className="fl-muted-sm">
                {filter === 'starred'
                  ? 'Tap the star icon on any phrase to build your personal starred deck.'
                  : filter === 'custom'
                    ? 'Click "Add Word" above to save your own Brazilian Portuguese words!'
                    : 'Choose another unit or switch back to the Smart Review Queue.'}
              </p>
              <button
                type="button"
                className="fl-btn fl-btn-primary"
                onClick={() => setFilter('smart')}
              >
                Open Smart Queue
              </button>
            </div>
          ) : (
            <>
              <div
                className={`fl-flashcard ${flipped ? 'is-flipped' : ''}`}
                onClick={handleFlip}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFlip();
                }}
                aria-label={flipped ? 'Flashcard answer side' : 'Flashcard prompt side — click to flip'}
              >
                <div className="fl-flashcard-top">
                  <span className={`fl-status-pill status-${getCardStatus(currentProgress)}`}>
                    {getCardStatus(currentProgress)}
                  </span>
                  <div className="fl-flashcard-meta">
                    <span className="fl-muted-sm">
                      Card {(cursor % deckCards.length) + 1} / {deckCards.length}
                    </span>
                    <button
                      type="button"
                      className={`fl-mini-icon-btn ${starredIds.includes(currentCard.id) ? 'starred' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(currentCard.id);
                      }}
                      aria-label="Star card"
                    >
                      <Star
                        size={15}
                        fill={starredIds.includes(currentCard.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                </div>

                {!flipped ? (
                  <div className="fl-flashcard-body">
                    {direction === 'pt-en' && (
                      <>
                        <span className="fl-chip-label">BRAZILIAN PORTUGUESE</span>
                        <h2 className="fl-flashcard-big">{currentCard.pt}</h2>
                        <p className="fl-flashcard-phonetic">/{currentCard.phonetic}/</p>
                        <div className="fl-flashcard-audio">
                          <AudioButton text={currentCard.pt} showSlow size="md" label="Listen" />
                        </div>
                      </>
                    )}

                    {direction === 'en-pt' && (
                      <>
                        <span className="fl-chip-label">SAY IT IN BRAZILIAN PORTUGUESE</span>
                        <h2 className="fl-flashcard-big">{currentCard.en}</h2>
                        {currentCard.literal && (
                          <p className="fl-muted-sm">Literal hint: &ldquo;{currentCard.literal}&rdquo;</p>
                        )}
                      </>
                    )}

                    {direction === 'audio' && (
                      <>
                        <span className="fl-chip-label">LISTEN &amp; RECALL</span>
                        <div className="fl-flashcard-audio-hero">
                          <AudioButton
                            text={currentCard.pt}
                            showSlow
                            size="lg"
                            label="Play Audio"
                          />
                        </div>
                        <p className="fl-muted-sm">Listen carefully, then flip to check spelling &amp; meaning.</p>
                      </>
                    )}

                    <div className="fl-flip-hint">
                      <RotateCw size={14} /> Click card or press <kbd>Space</kbd> to reveal
                    </div>
                  </div>
                ) : (
                  <div className="fl-flashcard-body answer-side">
                    <span className="fl-chip-label">ANSWER</span>
                    <div className="fl-answer-head">
                      <h2 className="fl-flashcard-big">{currentCard.pt}</h2>
                      <AudioButton text={currentCard.pt} showSlow size="md" />
                    </div>
                    <p className="fl-flashcard-phonetic">/{currentCard.phonetic}/</p>
                    <p className="fl-flashcard-en">{currentCard.en}</p>

                    <div className="fl-flashcard-example" onClick={(e) => e.stopPropagation()}>
                      <div className="fl-spot-example-head">
                        <span className="fl-chip-label">EXAMPLE</span>
                        <AudioButton text={currentCard.examplePt} size="sm" />
                      </div>
                      <p className="fl-spot-ex-pt">{currentCard.examplePt}</p>
                      <p className="fl-spot-ex-en">{currentCard.exampleEn}</p>
                    </div>

                    {currentCard.tip && (
                      <p className="fl-spot-tip">
                        <strong>Tip:</strong> {currentCard.tip}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* SM-2 Rating Controls */}
              <div className="fl-rating-wrap">
                {!flipped ? (
                  <button
                    type="button"
                    className="fl-btn fl-btn-primary fl-btn-lg"
                    onClick={handleFlip}
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <div className="fl-rating-grid" role="group" aria-label="Rate how well you remembered">
                    <button
                      type="button"
                      className="fl-rate-btn rate-again"
                      onClick={() => handleRate(0)}
                    >
                      <span className="fl-rate-key">1</span>
                      <strong>Again</strong>
                      <span>{intervalHints[0]}</span>
                    </button>
                    <button
                      type="button"
                      className="fl-rate-btn rate-hard"
                      onClick={() => handleRate(1)}
                    >
                      <span className="fl-rate-key">2</span>
                      <strong>Hard</strong>
                      <span>{intervalHints[1]}</span>
                    </button>
                    <button
                      type="button"
                      className="fl-rate-btn rate-good"
                      onClick={() => handleRate(2)}
                    >
                      <span className="fl-rate-key">3</span>
                      <strong>Good</strong>
                      <span>{intervalHints[2]}</span>
                    </button>
                    <button
                      type="button"
                      className="fl-rate-btn rate-easy"
                      onClick={() => handleRate(3)}
                    >
                      <span className="fl-rate-key">4</span>
                      <strong>Easy</strong>
                      <span>{intervalHints[3]}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* BROWSE GLOSSARY VIEW */}
      {view === 'browse' && (
        <section className="fl-browse-grid">
          {browseCards.map((card) => {
            const status = getCardStatus(srs[card.id]);
            const starred = starredIds.includes(card.id);
            const isCustom = card.id.startsWith('custom-');
            return (
              <article key={card.id} className="fl-browse-card">
                <div className="fl-browse-top">
                  <div>
                    <h3>{card.pt}</h3>
                    <span className="fl-preview-phonetic">/{card.phonetic}/</span>
                  </div>
                  <div className="fl-preview-tools">
                    <AudioButton text={card.pt} size="sm" />
                    <button
                      type="button"
                      className={`fl-mini-icon-btn ${starred ? 'starred' : ''}`}
                      onClick={() => toggleStar(card.id)}
                      aria-label="Bookmark"
                    >
                      <Star size={14} fill={starred ? 'currentColor' : 'none'} />
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        className="fl-mini-icon-btn"
                        onClick={() => deleteCustomCard(card.id)}
                        title="Delete custom card"
                        aria-label="Delete custom card"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="fl-browse-en">{card.en}</p>
                <p className="fl-browse-ex">{card.examplePt}</p>
                <div className="fl-browse-foot">
                  <span className={`fl-status-pill status-${status}`}>{status}</span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ADD CUSTOM WORD MODAL */}
      {showAddModal && (
        <div
          className="fl-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-card-title"
          onClick={() => setShowAddModal(false)}
        >
          <div className="fl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fl-modal-head">
              <div className="fl-modal-title-row">
                <Plus size={18} />
                <h2 id="add-card-title">Add Personal Brazilian Phrase</h2>
              </div>
              <button
                type="button"
                className="fl-icon-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form className="fl-modal-body fl-custom-form" onSubmit={handleAddCustomSubmit}>
              <label className="fl-field">
                <span>Brazilian Portuguese *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Que saudade!"
                  value={newPt}
                  onChange={(e) => setNewPt(e.target.value)}
                />
              </label>

              <label className="fl-field">
                <span>English Meaning *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. How I miss you / it!"
                  value={newEn}
                  onChange={(e) => setNewEn(e.target.value)}
                />
              </label>

              <label className="fl-field">
                <span>Phonetic Hint (optional)</span>
                <input
                  type="text"
                  placeholder="e.g. kee sow-DAH-jee"
                  value={newPhonetic}
                  onChange={(e) => setNewPhonetic(e.target.value)}
                />
              </label>

              <label className="fl-field">
                <span>Example Sentence in Portuguese (optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Que saudade da praia!"
                  value={newExamplePt}
                  onChange={(e) => setNewExamplePt(e.target.value)}
                />
              </label>

              <label className="fl-field">
                <span>Example Translation (optional)</span>
                <input
                  type="text"
                  placeholder="e.g. How I miss the beach!"
                  value={newExampleEn}
                  onChange={(e) => setNewExampleEn(e.target.value)}
                />
              </label>

              <div className="fl-modal-actions">
                <button
                  type="button"
                  className="fl-btn fl-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fl-btn fl-btn-primary">
                  Save to My Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
