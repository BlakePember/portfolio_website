import React, { useState } from 'react';
import { BookOpen, Edit3, Gamepad2, Globe, Home, Moon, Sun, Volume2, VolumeX, Check, Wifi, WifiOff } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { assetUrl } from '../utils/routes';

export const Navbar: React.FC = () => {
  const {
    page,
    setPage,
    playerName,
    setPlayerName,
    theme,
    toggleTheme,
    muted,
    toggleMute,
    setShowRules,
    connected,
    matchmaking,
    room,
  } = useGame();

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(playerName);

  const commitName = () => {
    if (draftName.trim()) {
      setPlayerName(draftName.trim());
    } else {
      setDraftName(playerName);
    }
    setEditingName(false);
  };

  return (
    <header className="dh-navbar">
      <div className="dh-navbar-inner">
        <button className="dh-brand" onClick={() => setPage('home')} type="button">
          <img src={assetUrl('favicon.png')} alt="Duckhouse" className="dh-brand-logo" />
          <div className="dh-brand-text">
            <span className="dh-brand-title">Duckhouse</span>
            <span className="dh-brand-sub">Bughouse × Duck Chess</span>
          </div>
        </button>

        <nav className="dh-nav-links" aria-label="Main navigation">
          <button
            type="button"
            className={`dh-nav-btn ${page === 'home' ? 'active' : ''}`}
            onClick={() => setPage('home')}
          >
            <Home size={16} />
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`dh-nav-btn ${page === 'lobby' || page === 'room' ? 'active' : ''}`}
            onClick={() => setPage(room ? 'room' : 'lobby')}
          >
            <Globe size={16} />
            <span>{room ? `Room ${room.code}` : 'Online Lobby'}</span>
          </button>

          <button
            type="button"
            className={`dh-nav-btn ${page === 'practice' ? 'active' : ''}`}
            onClick={() => setPage('practice')}
          >
            <Gamepad2 size={16} />
            <span>Practice</span>
          </button>

          <button type="button" className="dh-nav-btn" onClick={() => setShowRules(true)}>
            <BookOpen size={16} />
            <span>Rules</span>
          </button>
        </nav>

        <div className="dh-nav-actions">
          <div
            className={`dh-conn-pill ${connected ? 'online' : 'offline'}`}
            title={
              connected
                ? `Connected to Duckhouse multiplayer server (${matchmaking.onlineCount} online)`
                : 'Multiplayer server offline — Practice mode works offline!'
            }
          >
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{connected ? `${matchmaking.onlineCount} online` : 'Offline'}</span>
          </div>

          {editingName ? (
            <form
              className="dh-name-form"
              onSubmit={(e) => {
                e.preventDefault();
                commitName();
              }}
            >
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={20}
                autoFocus
                onBlur={commitName}
                aria-label="Player name"
              />
              <button type="submit" className="dh-icon-btn" aria-label="Save name">
                <Check size={14} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="dh-name-pill"
              onClick={() => {
                setDraftName(playerName);
                setEditingName(true);
              }}
              title="Click to edit your display name"
            >
              <span className="dh-name-avatar">{playerName.slice(0, 1).toUpperCase()}</span>
              <span className="dh-name-label">{playerName}</span>
              <Edit3 size={12} className="dh-name-edit-icon" />
            </button>
          )}

          <button
            type="button"
            className="dh-icon-btn"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          <button
            type="button"
            className="dh-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
};
