import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Shield } from 'lucide-react';
import { RoomChatMessage, SeatKey } from '../../shared/types';

const QUICK_CALLOUTS = [
  'Need Knight!',
  'Need Pawn!',
  'Need Queen/Rook!',
  'Stall!',
  'Watch your King!',
  'Duck block!',
];

interface TeamChatProps {
  messages: RoomChatMessage[];
  mySeat: SeatKey | null;
  onSend: (text: string, scope: 'all' | 'team') => void;
}

export const TeamChat: React.FC<TeamChatProps> = ({ messages, mySeat, onSend }) => {
  const [scope, setScope] = useState<'all' | 'team'>(mySeat ? 'team' : 'all');
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim(), mySeat ? scope : 'all');
    setText('');
  };

  return (
    <div className="dh-chat-panel">
      <div className="dh-chat-header">
        <div className="dh-chat-title">
          <MessageSquare size={15} />
          <span>Table Chat</span>
        </div>
        {mySeat && (
          <div className="dh-chat-scope-tabs">
            <button
              type="button"
              className={scope === 'team' ? 'active' : ''}
              onClick={() => setScope('team')}
              title="Only your Bughouse teammate can see Team chat"
            >
              <Shield size={12} /> Team
            </button>
            <button
              type="button"
              className={scope === 'all' ? 'active' : ''}
              onClick={() => setScope('all')}
            >
              All
            </button>
          </div>
        )}
      </div>

      {mySeat && (
        <div className="dh-quick-callouts">
          {QUICK_CALLOUTS.map((callout) => (
            <button
              key={callout}
              type="button"
              className="dh-callout-chip"
              onClick={() => onSend(callout, 'team')}
              title="Send quick callout to teammate"
            >
              {callout}
            </button>
          ))}
        </div>
      )}

      <div className="dh-chat-messages" ref={listRef}>
        {messages.length === 0 ? (
          <div className="dh-chat-empty">No messages yet. Coordinate drops with your partner!</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`dh-chat-msg scope-${m.scope} seat-${m.seat === 'system' ? 'system' : 'user'}`}>
              {m.seat === 'system' ? (
                <span className="dh-chat-sys">{m.text}</span>
              ) : (
                <>
                  <span className="dh-chat-meta">
                    {m.scope === 'team' && <span className="dh-chat-team-badge">TEAM</span>}
                    <strong>{m.senderName}</strong>
                  </span>
                  <span className="dh-chat-body">{m.text}</span>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <form className="dh-chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mySeat && scope === 'team' ? 'Message teammate...' : 'Message table...'}
          maxLength={220}
        />
        <button type="submit" className="dh-btn dh-btn-primary dh-btn-sm" aria-label="Send message">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
