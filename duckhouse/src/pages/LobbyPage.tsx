import React, { useMemo, useState } from 'react';
import {
  Bot,
  Clock,
  Globe,
  KeyRound,
  Lock,
  PlusCircle,
  RefreshCw,
  Search,
  Shuffle,
  Users,
  X,
} from 'lucide-react';
import { RoomVisibility, TIME_CONTROLS } from '../../shared/types';
import { useGame } from '../context/GameContext';
import { assetUrl } from '../utils/routes';

export const LobbyPage: React.FC = () => {
  const {
    connected,
    publicRooms,
    matchmaking,
    refreshRooms,
    createRoom,
    joinRoom,
    joinMatchmaking,
    leaveMatchmaking,
    startPractice,
    playerName,
  } = useGame();

  // Quick Match state
  const [selectedQueueTc, setSelectedQueueTc] = useState<string>('5+0');

  // Create Room form state
  const [roomName, setRoomName] = useState(`${playerName}'s Duckhouse`);
  const [visibility, setVisibility] = useState<RoomVisibility>('public');
  const [createTc, setCreateTc] = useState<string>('5+0');
  const [creating, setCreating] = useState(false);

  // Join Private Code state
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Search / Filter Public Games state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTc, setFilterTc] = useState<string>('all');
  const [onlyOpenSeats, setOnlyOpenSeats] = useState<boolean>(false);

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publicRooms.filter((r) => {
      if (filterTc !== 'all' && r.timeControl.id !== filterTc) return false;
      if (onlyOpenSeats && (r.status !== 'waiting' || r.openSeats <= 0)) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.hostName.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.timeControl.label.toLowerCase().includes(q)
      );
    });
  }, [publicRooms, searchQuery, filterTc, onlyOpenSeats]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    await createRoom({
      name: roomName.trim() || `${playerName}'s Table`,
      visibility,
      timeControlId: createTc,
    });
    setCreating(false);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    await joinRoom(joinCode.trim());
    setJoining(false);
  };

  return (
    <main className="dh-page dh-lobby">
      <div className="dh-lobby-header">
        <div>
          <h1 className="dh-page-title">Online Multiplayer Lobby</h1>
          <p className="dh-page-subtitle">
            Matchmake with random players, search open public tables, or spin up a private room for friends.
          </p>
        </div>

        <div className="dh-lobby-stats">
          <div className="dh-stat-chip">
            <Users size={15} />
            <span>{connected ? `${matchmaking.onlineCount} Players Online` : 'Server Disconnected'}</span>
          </div>
          <div className="dh-stat-chip">
            <Globe size={15} />
            <span>{publicRooms.length} Public Rooms</span>
          </div>
        </div>
      </div>

      {!connected && (
        <div className="dh-offline-callout">
          <div>
            <strong>Multiplayer server not connected.</strong>
            <p>
              Run <code>npm run dev</code> inside <code>duckhouse/</code> to start the local Cloudflare Worker + Durable
              Objects runtime, or jump into offline Practice Mode right away!
            </p>
          </div>
          <button type="button" className="dh-btn dh-btn-primary" onClick={() => startPractice('bots')}>
            <Bot size={16} /> Play vs Bots Offline
          </button>
        </div>
      )}

      {/* TOP ROW: Quick Matchmaking + Join Private Code */}
      <div className="dh-lobby-top-grid">
        {/* Random Matchmaking Card */}
        <section className="dh-card dh-matchmaking-card">
          <div className="dh-card-head">
            <div className="dh-card-title-row">
              <Shuffle size={19} className="dh-accent-icon" />
              <div>
                <h2>Quick Match (Randoms)</h2>
                <p>Queue solo and get paired into a 4-player Duckhouse match automatically.</p>
              </div>
            </div>
          </div>

          <div className="dh-tc-grid">
            {TIME_CONTROLS.map((tc) => {
              const count = matchmaking.queueCountsByTc[tc.id] ?? 0;
              const isSelected = selectedQueueTc === tc.id;
              const isQueuedHere = matchmaking.inQueue && matchmaking.timeControlId === tc.id;
              return (
                <button
                  key={tc.id}
                  type="button"
                  disabled={matchmaking.inQueue}
                  className={`dh-tc-btn ${isSelected ? 'selected' : ''} ${isQueuedHere ? 'queued' : ''}`}
                  onClick={() => setSelectedQueueTc(tc.id)}
                >
                  <span className="dh-tc-id">{tc.id}</span>
                  <span className="dh-tc-label">{tc.label}</span>
                  <span className="dh-tc-queue">{count}/4 in queue</span>
                </button>
              );
            })}
          </div>

          {matchmaking.inQueue ? (
            <div className="dh-queue-active-box">
              <div className="dh-queue-progress">
                <div className="dh-spinner" />
                <div>
                  <strong>Searching for random players ({matchmaking.timeControlId})…</strong>
                  <div className="dh-queue-dots">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`dh-q-dot ${i < matchmaking.queueCount ? 'filled' : ''}`} />
                    ))}
                    <span className="dh-queue-count-text">
                      {matchmaking.queueCount} / {matchmaking.needed} players ready
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" className="dh-btn dh-btn-danger" onClick={leaveMatchmaking}>
                <X size={15} /> Cancel Search
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="dh-btn dh-btn-primary dh-btn-full"
              disabled={!connected}
              onClick={() => joinMatchmaking(selectedQueueTc)}
            >
              <Shuffle size={17} />
              <span>Find Random Match ({selectedQueueTc})</span>
            </button>
          )}
        </section>

        {/* Create Game + Private Room Join Column */}
        <div className="dh-lobby-side-col">
          {/* Create Room Form */}
          <section className="dh-card">
            <div className="dh-card-head">
              <div className="dh-card-title-row">
                <PlusCircle size={19} className="dh-accent-icon" />
                <div>
                  <h2>Create Online Game</h2>
                  <p>Host a public table or a private invite-only room (supports Bot fill too).</p>
                </div>
              </div>
            </div>

            <form className="dh-form" onSubmit={handleCreateRoom}>
              <label className="dh-field">
                <span>Room Name</span>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Friday Night Quackhouse"
                  maxLength={36}
                  required
                />
              </label>

              <div className="dh-form-row-2">
                <div className="dh-field">
                  <span>Visibility</span>
                  <div className="dh-segmented">
                    <button
                      type="button"
                      className={visibility === 'public' ? 'active' : ''}
                      onClick={() => setVisibility('public')}
                    >
                      <Globe size={14} /> Public
                    </button>
                    <button
                      type="button"
                      className={visibility === 'private' ? 'active' : ''}
                      onClick={() => setVisibility('private')}
                    >
                      <Lock size={14} /> Private
                    </button>
                  </div>
                </div>

                <label className="dh-field">
                  <span>Time Control</span>
                  <select value={createTc} onChange={(e) => setCreateTc(e.target.value)}>
                    {TIME_CONTROLS.map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.id} — {tc.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="submit"
                className="dh-btn dh-btn-primary dh-btn-full"
                disabled={!connected || creating}
              >
                {visibility === 'private' ? <Lock size={16} /> : <PlusCircle size={16} />}
                <span>{creating ? 'Creating…' : `Create ${visibility === 'private' ? 'Private' : 'Public'} Room`}</span>
              </button>
            </form>
          </section>

          {/* Join Private Room by Code */}
          <section className="dh-card dh-join-code-card">
            <div className="dh-card-head compact">
              <div className="dh-card-title-row">
                <KeyRound size={18} className="dh-accent-icon" />
                <div>
                  <h2>Join Private Room</h2>
                  <p>Have a 6-character room code from a friend?</p>
                </div>
              </div>
            </div>

            <form className="dh-inline-form" onSubmit={handleJoinByCode}>
              <input
                type="text"
                className="dh-code-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="ENTER CODE (E.G. DUCK7K)"
                maxLength={8}
              />
              <button
                type="submit"
                className="dh-btn dh-btn-secondary"
                disabled={!connected || joining || joinCode.trim().length < 4}
              >
                {joining ? 'Joining…' : 'Join'}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* BOTTOM SECTION: Search & Browse Public Games */}
      <section className="dh-card dh-browser-card">
        <div className="dh-browser-head">
          <div>
            <h2>Search Public Online Games</h2>
            <p>Browse live open Duckhouse tables created by other players.</p>
          </div>
          <button
            type="button"
            className="dh-btn dh-btn-ghost dh-btn-sm"
            onClick={refreshRooms}
            disabled={!connected}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="dh-browser-controls">
          <div className="dh-search-box">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by room name, host, or code..."
            />
            {searchQuery && (
              <button type="button" className="dh-clear-search" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="dh-filter-pills">
            <button
              type="button"
              className={`dh-filter-pill ${filterTc === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTc('all')}
            >
              All Times
            </button>
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc.id}
                type="button"
                className={`dh-filter-pill ${filterTc === tc.id ? 'active' : ''}`}
                onClick={() => setFilterTc(tc.id)}
              >
                {tc.id}
              </button>
            ))}
          </div>

          <label className="dh-checkbox-inline">
            <input
              type="checkbox"
              checked={onlyOpenSeats}
              onChange={(e) => setOnlyOpenSeats(e.target.checked)}
            />
            <span>Open seats only</span>
          </label>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="dh-empty-rooms">
            <img src={assetUrl('duck.png')} alt="" className="dh-empty-duck" />
            <h3>No matching public rooms right now</h3>
            <p>
              {publicRooms.length === 0
                ? 'Be the first to host a public table above, or queue in Quick Match!'
                : 'Try clearing your search or time control filter.'}
            </p>
          </div>
        ) : (
          <div className="dh-rooms-list">
            {filteredRooms.map((r) => {
              const filled = 4 - r.openSeats;
              const canJoinSeat = r.status === 'waiting' && r.openSeats > 0;
              return (
                <div key={r.code} className="dh-room-row">
                  <div className="dh-room-row-main">
                    <div className="dh-room-row-title">
                      <strong>{r.name}</strong>
                      <span className="dh-room-code-chip">{r.code}</span>
                      <span className={`dh-status-chip ${r.status}`}>
                        {r.status === 'waiting' ? 'Open Lobby' : r.status === 'playing' ? 'In Game' : 'Finished'}
                      </span>
                    </div>
                    <div className="dh-room-row-meta">
                      <span>Host: {r.hostName}</span>
                      <span>•</span>
                      <span>
                        <Clock size={12} /> {r.timeControl.label}
                      </span>
                      <span>•</span>
                      <span>
                        <Users size={12} /> {filled}/4 seated
                        {r.botCount > 0 ? ` (${r.botCount} bot${r.botCount > 1 ? 's' : ''})` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`dh-btn ${canJoinSeat ? 'dh-btn-primary' : 'dh-btn-secondary'} dh-btn-sm`}
                    onClick={() => joinRoom(r.code)}
                  >
                    {canJoinSeat ? 'Join Table' : 'Spectate'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
