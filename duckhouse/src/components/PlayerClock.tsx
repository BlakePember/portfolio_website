import React, { useEffect, useState } from 'react';
import { Bot, User, WifiOff } from 'lucide-react';
import { SeatKey, SeatPlayer, TurnPhase, getSeatTeam } from '../../shared/types';

interface PlayerClockProps {
  seat: SeatKey;
  player: SeatPlayer | null;
  timeMs: number;
  lastClockTickAt: number | null;
  isActiveTurn: boolean;
  phase: TurnPhase;
  isPlaying: boolean;
  isMe?: boolean;
  isPartner?: boolean;
}

function formatTime(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (clamped < 20_000) {
    const tenths = Math.floor((clamped % 1000) / 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerClock: React.FC<PlayerClockProps> = ({
  seat,
  player,
  timeMs,
  lastClockTickAt,
  isActiveTurn,
  phase,
  isPlaying,
  isMe,
  isPartner,
}) => {
  const [displayMs, setDisplayMs] = useState(timeMs);

  useEffect(() => {
    setDisplayMs(timeMs);
    if (!isPlaying || !isActiveTurn || lastClockTickAt === null) return;

    const tick = () => {
      const elapsed = Math.max(0, Date.now() - lastClockTickAt);
      setDisplayMs(Math.max(0, timeMs - elapsed));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [timeMs, lastClockTickAt, isActiveTurn, isPlaying]);

  const team = getSeatTeam(seat);
  const isLow = displayMs < 20_000 && isPlaying;
  const colorLabel = seat.endsWith('_w') ? 'White' : 'Black';

  return (
    <div
      className={`dh-player-bar team-${team} ${isActiveTurn && isPlaying ? 'active-turn' : ''} ${
        isActiveTurn && isPlaying && phase === 'duck' ? 'duck-turn' : ''
      }`}
    >
      <div className="dh-player-info">
        <span className={`dh-color-swatch ${seat.endsWith('_w') ? 'white' : 'black'}`} title={colorLabel} />
        <span className="dh-player-icon">
          {player?.isBot ? <Bot size={15} /> : <User size={15} />}
        </span>
        <span className="dh-player-name">
          {player ? player.name : 'Open Seat'}
        </span>
        {isMe && <span className="dh-tag tag-you">YOU</span>}
        {isPartner && <span className="dh-tag tag-partner">PARTNER</span>}
        {player && !player.connected && !player.isBot && (
          <span className="dh-tag tag-offline" title="Disconnected">
            <WifiOff size={11} />
          </span>
        )}
        {isActiveTurn && isPlaying && (
          <span className={`dh-phase-pill ${phase === 'duck' ? 'duck' : 'chess'}`}>
            {phase === 'duck' ? '🦆 Place Duck' : 'Move'}
          </span>
        )}
      </div>

      <div className={`dh-clock ${isActiveTurn && isPlaying ? 'running' : ''} ${isLow ? 'low' : ''}`}>
        {formatTime(displayMs)}
      </div>
    </div>
  );
};
