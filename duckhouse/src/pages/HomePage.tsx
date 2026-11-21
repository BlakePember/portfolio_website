import React from 'react';
import { ArrowRight, Bot, Crown, Globe, Lock, Shuffle, Sparkles, Users } from 'lucide-react';
import { useGame } from '../context/GameContext';

export const HomePage: React.FC = () => {
  const { setPage, setShowRules, startPractice, connected, matchmaking } = useGame();

  return (
    <main className="dh-page dh-home">
      <section className="dh-hero">
        <div className="dh-hero-copy">
          <div className="dh-eyebrow">
            <span className={`dh-dot ${connected ? 'live' : ''}`} />
            {connected ? `${matchmaking.onlineCount} ONLINE · 2v2 REALTIME VARIANT` : '2v2 CHESS VARIANT · BUGHOUSE × DUCK CHESS'}
          </div>

          <h1 className="dh-hero-title">
            Two boards.<br />
            Two ducks.<br />
            <span className="dh-highlight">Total chaos.</span>
          </h1>

          <p className="dh-hero-desc">
            <strong>Duckhouse</strong> fuses the frantic 2v2 teamwork of <em>Bughouse Chess</em> with the hilarious
            tactical obstruction of <em>Duck Chess</em>. Feed captured pieces to your teammate, drop reinforcements onto
            the board, and move the duck after every turn to block attacks and hunt the enemy King.
          </p>

          <div className="dh-hero-actions">
            <button type="button" className="dh-btn dh-btn-primary dh-btn-lg" onClick={() => setPage('lobby')}>
              <Globe size={18} />
              <span>Play Online</span>
              <ArrowRight size={17} />
            </button>

            <button
              type="button"
              className="dh-btn dh-btn-secondary dh-btn-lg"
              onClick={() => startPractice('bots')}
            >
              <Bot size={18} />
              <span>Play vs Bots</span>
            </button>

            <button
              type="button"
              className="dh-btn dh-btn-ghost dh-btn-lg"
              onClick={() => startPractice('sandbox')}
            >
              <Users size={18} />
              <span>4-Seat Sandbox</span>
            </button>
          </div>

          <div className="dh-hero-meta">
            <button type="button" className="dh-text-btn" onClick={() => setShowRules(true)}>
              Read full rules ↗
            </button>
            <span className="dh-sep">•</span>
            <span>Matchmake with randoms or create private rooms with invite codes</span>
          </div>
        </div>

        <div className="dh-hero-visual" aria-label="Duckhouse dual-board illustration">
          <div className="dh-hero-card">
            <div className="dh-hero-card-top">
              <span className="dh-pill-badge emerald">TEAM EMERALD · A-White + B-Black</span>
              <span className="dh-pill-badge amber">TEAM AMBER · A-Black + B-White</span>
            </div>

            <div className="dh-mini-arena">
              <div className="dh-mini-board-box">
                <div className="dh-mini-label">Board A</div>
                <div className="dh-mini-grid">
                  {Array.from({ length: 16 }).map((_, idx) => {
                    const r = Math.floor(idx / 4);
                    const c = idx % 4;
                    const light = (r + c) % 2 === 0;
                    return (
                      <div key={idx} className={`dh-mini-sq ${light ? 'light' : 'dark'}`}>
                        {idx === 1 && <img src="./pieces/king-b.svg" alt="" />}
                        {idx === 5 && <img src="./duck.png" alt="Duck" className="dh-mini-duck" />}
                        {idx === 10 && <img src="./pieces/knight-w.svg" alt="" />}
                        {idx === 14 && <img src="./pieces/queen-w.svg" alt="" />}
                      </div>
                    );
                  })}
                </div>
                <div className="dh-mini-foot">Duck blocks e6 · Knight jumps!</div>
              </div>

              <div className="dh-transfer-badge">
                <img src="./duck.png" alt="Duckhouse Mascot" className="dh-mascot" />
                <span>Captures → Partner Pocket</span>
              </div>

              <div className="dh-mini-board-box">
                <div className="dh-mini-label">Board B</div>
                <div className="dh-mini-grid">
                  {Array.from({ length: 16 }).map((_, idx) => {
                    const r = Math.floor(idx / 4);
                    const c = idx % 4;
                    const light = (r + c) % 2 === 0;
                    return (
                      <div key={idx} className={`dh-mini-sq ${light ? 'light' : 'dark'}`}>
                        {idx === 2 && <img src="./pieces/king-w.svg" alt="" />}
                        {idx === 6 && <img src="./pieces/rook-b.svg" alt="" />}
                        {idx === 9 && <img src="./duck.png" alt="Duck" className="dh-mini-duck" />}
                        {idx === 13 && <img src="./pieces/bishop-w.svg" alt="" />}
                      </div>
                    );
                  })}
                </div>
                <div className="dh-mini-foot">Drop N@f3 → Move Duck!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dh-feature-strip">
        <div className="dh-feature-card">
          <div className="dh-feature-icon"><Shuffle size={20} /></div>
          <h3>Random Matchmaking</h3>
          <p>Queue up solo by time control and get automatically paired into a live 4-player match.</p>
        </div>

        <div className="dh-feature-card">
          <div className="dh-feature-icon"><Lock size={20} /></div>
          <h3>Private &amp; Public Rooms</h3>
          <p>Host a public room in the lobby browser or spin up a private room with a 6-letter invite code.</p>
        </div>

        <div className="dh-feature-card">
          <div className="dh-feature-icon"><Sparkles size={20} /></div>
          <h3>Bughouse Pockets + Drops</h3>
          <p>Every capture feeds your teammate’s reserve. Drop pieces anywhere except the duck (or pawn ranks 1 &amp; 8).</p>
        </div>

        <div className="dh-feature-card">
          <div className="dh-feature-icon"><Crown size={20} /></div>
          <h3>King Capture Victory</h3>
          <p>No check restrictions — block threats with your duck and be the first team to capture an enemy King!</p>
        </div>
      </section>
    </main>
  );
};
