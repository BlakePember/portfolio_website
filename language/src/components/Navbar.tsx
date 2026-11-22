import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Flame,
  HelpCircle,
  Home,
  Layers,
  MessageCircle,
  Moon,
  Repeat,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Navbar: React.FC = () => {
  const {
    page,
    setPage,
    openFlashcards,
    theme,
    toggleTheme,
    muted,
    toggleMute,
    stats,
    dueCount,
    setShowHelp,
  } = useLanguage();

  return (
    <header className="fl-navbar">
      <div className="fl-navbar-inner">
        <div className="fl-brand-cluster">
          <a
            href="../"
            className="fl-back-link"
            title="Back to Blake Pember's Portfolio"
            aria-label="Back to Portfolio"
          >
            <ArrowLeft size={15} />
          </a>

          <button className="fl-brand" onClick={() => setPage('home')} type="button">
            <span className="fl-brand-badge" aria-hidden="true">
              <span className="fl-brand-diamond" />
            </span>
            <div className="fl-brand-text">
              <span className="fl-brand-title">Fala!</span>
              <span className="fl-brand-sub">Português Brasileiro</span>
            </div>
          </button>
        </div>

        <nav className="fl-nav-links" aria-label="Main navigation">
          <button
            type="button"
            className={`fl-nav-btn ${page === 'home' || page === 'lesson' ? 'active' : ''}`}
            onClick={() => setPage('home')}
          >
            <Home size={15} />
            <span>Learn</span>
          </button>

          <button
            type="button"
            className={`fl-nav-btn ${page === 'flashcards' ? 'active' : ''}`}
            onClick={() => openFlashcards('all')}
          >
            <Layers size={15} />
            <span>Flashcards</span>
            {dueCount > 0 && <span className="fl-nav-badge">{dueCount}</span>}
          </button>

          <button
            type="button"
            className={`fl-nav-btn ${page === 'verbs' ? 'active' : ''}`}
            onClick={() => setPage('verbs')}
          >
            <Repeat size={15} />
            <span>Verbs</span>
          </button>

          <button
            type="button"
            className={`fl-nav-btn ${page === 'conversations' ? 'active' : ''}`}
            onClick={() => setPage('conversations')}
          >
            <MessageCircle size={15} />
            <span>Dialogues</span>
          </button>

          <button
            type="button"
            className={`fl-nav-btn ${page === 'guide' ? 'active' : ''}`}
            onClick={() => setPage('guide')}
          >
            <Compass size={15} />
            <span>Guide</span>
          </button>
        </nav>

        <div className="fl-nav-actions">
          <div
            className="fl-stat-pill fl-streak-pill"
            title={`Current streak: ${stats.streakDays} day${stats.streakDays === 1 ? '' : 's'} (Best: ${stats.bestStreakDays})`}
          >
            <Flame size={14} />
            <span>{stats.streakDays}d</span>
          </div>

          <div
            className="fl-stat-pill fl-xp-pill"
            title={`Daily progress: ${stats.dailyXp} / ${stats.dailyGoalXp} XP (${stats.totalXp} total XP)`}
          >
            <Sparkles size={13} />
            <span>{stats.dailyXp} XP</span>
          </div>

          <button
            type="button"
            className="fl-icon-btn"
            onClick={() => setShowHelp(true)}
            aria-label="Study Settings & Shortcuts"
            title="Study Settings, Voice & Shortcuts"
          >
            <HelpCircle size={16} />
          </button>

          <button
            type="button"
            className="fl-icon-btn"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute UI sounds' : 'Mute UI sounds'}
            title={muted ? 'Unmute UI sounds' : 'Mute UI sounds'}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            type="button"
            className="fl-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Compact mobile nav bar */}
      <nav className="fl-mobile-nav" aria-label="Mobile navigation">
        <button
          type="button"
          className={`fl-mobile-btn ${page === 'home' || page === 'lesson' ? 'active' : ''}`}
          onClick={() => setPage('home')}
        >
          <BookOpen size={16} />
          <span>Learn</span>
        </button>
        <button
          type="button"
          className={`fl-mobile-btn ${page === 'flashcards' ? 'active' : ''}`}
          onClick={() => openFlashcards('all')}
        >
          <Layers size={16} />
          <span>Cards</span>
        </button>
        <button
          type="button"
          className={`fl-mobile-btn ${page === 'verbs' ? 'active' : ''}`}
          onClick={() => setPage('verbs')}
        >
          <Repeat size={16} />
          <span>Verbs</span>
        </button>
        <button
          type="button"
          className={`fl-mobile-btn ${page === 'conversations' ? 'active' : ''}`}
          onClick={() => setPage('conversations')}
        >
          <MessageCircle size={16} />
          <span>Talk</span>
        </button>
        <button
          type="button"
          className={`fl-mobile-btn ${page === 'guide' ? 'active' : ''}`}
          onClick={() => setPage('guide')}
        >
          <Compass size={16} />
          <span>Guide</span>
        </button>
      </nav>
    </header>
  );
};
