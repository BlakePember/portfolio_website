import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Clock,
  Crown,
  Flag,
  History,
  RefreshCw,
  RotateCcw,
  Users,
} from 'lucide-react';
import {
  BoardId,
  Color,
  DroppablePieceType,
  GameState,
  PromotionPieceType,
  SeatKey,
  SeatPlayer,
  TIME_CONTROLS,
  getPartnerSeat,
  getSeatBoardAndColor,
  getSeatKey,
  getSeatTeam,
  oppositeColor,
  otherBoard,
} from '../../shared/types';
import { PracticeMode, useGame } from '../context/GameContext';
import { ChessBoard } from '../components/ChessBoard';
import { PocketTray } from '../components/PocketTray';
import { PlayerClock } from '../components/PlayerClock';
import { TeamChat } from '../components/TeamChat';

interface GamePageProps {
  mode: 'online' | 'practice';
}

export const GamePage: React.FC<GamePageProps> = ({ mode }) => {
  const {
    room,
    mySeat,
    leaveRoom,
    rematch,
    sendMove,
    sendDrop,
    sendDuck,
    resign,
    sendChat,
    playerName,
    practiceMode,
    practiceTc,
    practiceGame,
    startPractice,
    practiceMove,
    practiceDrop,
    practiceDuck,
    practiceResign,
  } = useGame();

  const [flipped, setFlipped] = useState(false);
  const [selectedDrops, setSelectedDrops] = useState<Record<BoardId, DroppablePieceType | null>>({
    A: null,
    B: null,
  });
  const [historyBoard, setHistoryBoard] = useState<BoardId>('A');

  const isOnline = mode === 'online';
  const game: GameState | null = isOnline ? room?.game ?? null : practiceGame;

  const seats: Record<SeatKey, SeatPlayer | null> = useMemo(() => {
    if (isOnline && room) return room.seats;
    if (practiceMode === 'bots') {
      return {
        A_w: { id: 'human', name: playerName, isBot: false, connected: true, ready: true },
        B_b: { id: 'bot_partner', name: 'QuackBot (Partner)', isBot: true, connected: true, ready: true },
        A_b: { id: 'bot_opp1', name: 'MallardAI', isBot: true, connected: true, ready: true },
        B_w: { id: 'bot_opp2', name: 'DrakeEngine', isBot: true, connected: true, ready: true },
      };
    }
    return {
      A_w: { id: 's1', name: 'Board A White', isBot: false, connected: true, ready: true },
      B_b: { id: 's2', name: 'Board B Black', isBot: false, connected: true, ready: true },
      A_b: { id: 's3', name: 'Board A Black', isBot: false, connected: true, ready: true },
      B_w: { id: 's4', name: 'Board B White', isBot: false, connected: true, ready: true },
    };
  }, [isOnline, room, practiceMode, playerName]);

  if (!game) return null;

  const activeSeat: SeatKey | null = isOnline ? mySeat : practiceMode === 'bots' ? 'A_w' : null;
  const primaryBoardId: BoardId = activeSeat ? getSeatBoardAndColor(activeSeat).boardId : 'A';
  const secondaryBoardId: BoardId = otherBoard(primaryBoardId);

  const primaryDefaultColor: Color = activeSeat ? getSeatBoardAndColor(activeSeat).color : 'w';
  const primaryOrientation: Color = flipped ? oppositeColor(primaryDefaultColor) : primaryDefaultColor;
  // Partner always plays the opposite color on the other board!
  const secondaryOrientation: Color = oppositeColor(primaryOrientation);

  const partnerSeat: SeatKey | null = activeSeat ? getPartnerSeat(activeSeat) : null;

  const canActOnBoard = (boardId: BoardId): boolean => {
    if (game.status !== 'playing') return false;
    const board = game.boards[boardId];
    if (!isOnline && practiceMode === 'sandbox') return true;
    if (!activeSeat) return false;
    return getSeatKey(boardId, board.turn) === activeSeat;
  };

  const handleMove = (boardId: BoardId, from: number, to: number, promotion?: PromotionPieceType) => {
    setSelectedDrops((prev) => ({ ...prev, [boardId]: null }));
    if (isOnline) sendMove({ boardId, from, to, promotion });
    else practiceMove({ boardId, from, to, promotion });
  };

  const handleDrop = (boardId: BoardId, pieceType: DroppablePieceType, to: number) => {
    setSelectedDrops((prev) => ({ ...prev, [boardId]: null }));
    if (isOnline) sendDrop({ boardId, pieceType, to });
    else practiceDrop({ boardId, pieceType, to });
  };

  const handleDuck = (boardId: BoardId, to: number) => {
    setSelectedDrops((prev) => ({ ...prev, [boardId]: null }));
    if (isOnline) sendDuck({ boardId, to });
    else practiceDuck({ boardId, to });
  };

  const renderBoardColumn = (boardId: BoardId, orientation: Color, isPrimary: boolean) => {
    const board = game.boards[boardId];
    const bottomColor = orientation;
    const topColor = oppositeColor(orientation);
    const bottomSeat = getSeatKey(boardId, bottomColor);
    const topSeat = getSeatKey(boardId, topColor);

    const canAct = canActOnBoard(boardId);
    const bottomCanDrop =
      canAct && board.phase === 'chess' && board.turn === bottomColor;
    const topCanDrop =
      !isOnline && practiceMode === 'sandbox' && game.status === 'playing' && board.phase === 'chess' && board.turn === topColor;

    return (
      <div className={`dh-board-column ${isPrimary ? 'primary' : 'secondary'}`}>
        <div className="dh-board-heading">
          <span className="dh-board-badge">
            Board {boardId} {isPrimary && activeSeat ? '· Your Board' : partnerSeat?.startsWith(boardId) ? '· Partner’s Board' : ''}
          </span>
          <span className={`dh-board-phase-tag ${board.phase === 'duck' ? 'duck' : ''}`}>
            {game.status === 'finished'
              ? 'Finished'
              : board.phase === 'duck'
              ? `🦆 ${board.turn === 'w' ? 'White' : 'Black'} moving Duck`
              : `${board.turn === 'w' ? 'White' : 'Black'} to move`}
          </span>
        </div>

        <PlayerClock
          seat={topSeat}
          player={seats[topSeat]}
          timeMs={game.clocks[topSeat]}
          lastClockTickAt={game.lastClockTickAt}
          isActiveTurn={board.turn === topColor}
          phase={board.phase}
          isPlaying={game.status === 'playing'}
          isMe={activeSeat === topSeat}
          isPartner={partnerSeat === topSeat}
        />

        <PocketTray
          color={topColor}
          pocket={board.pockets[topColor]}
          interactive={topCanDrop}
          selectedDrop={topCanDrop ? selectedDrops[boardId] : null}
          onSelectDrop={(piece) => setSelectedDrops((prev) => ({ ...prev, [boardId]: piece }))}
          label={`${topColor === 'w' ? 'White' : 'Black'} Pocket`}
        />

        <ChessBoard
          board={board}
          orientation={orientation}
          canAct={canAct}
          selectedDrop={selectedDrops[boardId]}
          onClearDrop={() => setSelectedDrops((prev) => ({ ...prev, [boardId]: null }))}
          onChessMove={(from, to, promo) => handleMove(boardId, from, to, promo)}
          onDropMove={(pieceType, to) => handleDrop(boardId, pieceType, to)}
          onDuckMove={(to) => handleDuck(boardId, to)}
          compact={!isPrimary}
        />

        <PocketTray
          color={bottomColor}
          pocket={board.pockets[bottomColor]}
          interactive={bottomCanDrop}
          selectedDrop={bottomCanDrop ? selectedDrops[boardId] : null}
          onSelectDrop={(piece) => setSelectedDrops((prev) => ({ ...prev, [boardId]: piece }))}
          label={bottomCanDrop ? 'Your Pocket (Click to Drop)' : `${bottomColor === 'w' ? 'White' : 'Black'} Pocket`}
        />

        <PlayerClock
          seat={bottomSeat}
          player={seats[bottomSeat]}
          timeMs={game.clocks[bottomSeat]}
          lastClockTickAt={game.lastClockTickAt}
          isActiveTurn={board.turn === bottomColor}
          phase={board.phase}
          isPlaying={game.status === 'playing'}
          isMe={activeSeat === bottomSeat}
          isPartner={partnerSeat === bottomSeat}
        />
      </div>
    );
  };

  // Dynamic instructional banner
  const primaryBoard = game.boards[primaryBoardId];
  const myTurnNow = canActOnBoard(primaryBoardId);
  const myTeam = activeSeat ? getSeatTeam(activeSeat) : null;

  let bannerText = '';
  let bannerVariant = 'neutral';
  if (game.status === 'finished') {
    const winLabel = game.winnerTeam === 1 ? 'Team Emerald' : 'Team Amber';
    const reasonText =
      game.winReason === 'king_capture'
        ? `King captured on Board ${game.winningBoard}!`
        : game.winReason === 'timeout'
        ? `Time expired on Board ${game.winningBoard}!`
        : 'Opponent resigned!';
    const iWon = myTeam !== null && myTeam === game.winnerTeam;
    bannerText = `${iWon ? '🏆 Victory! ' : ''}${winLabel} wins — ${reasonText}`;
    bannerVariant = iWon ? 'win' : 'finished';
  } else if (!isOnline && practiceMode === 'sandbox') {
    const duckOnA = game.boards.A.phase === 'duck';
    const duckOnB = game.boards.B.phase === 'duck';
    bannerText =
      duckOnA || duckOnB
        ? `🦆 Sandbox Mode: Place the duck on ${[duckOnA ? 'Board A' : '', duckOnB ? 'Board B' : ''].filter(Boolean).join(' & ')}!`
        : '4-Seat Sandbox Mode: Move pieces or drop from pockets on either board.';
    bannerVariant = duckOnA || duckOnB ? 'duck' : 'info';
  } else if (myTurnNow && primaryBoard.phase === 'duck') {
    bannerText = `🦆 DUCK PHASE! Click any empty square on Board ${primaryBoardId} to place the duck.`;
    bannerVariant = 'duck';
  } else if (myTurnNow) {
    bannerText = `Your turn on Board ${primaryBoardId} — move a piece or click a pocket piece to drop it!`;
    bannerVariant = 'turn';
  } else if (activeSeat) {
    bannerText = `Opponent’s turn on Board ${primaryBoardId}… Watch your partner on Board ${secondaryBoardId}!`;
    bannerVariant = 'neutral';
  } else {
    bannerText = 'Spectating live Duckhouse match.';
    bannerVariant = 'neutral';
  }

  const activeHistory = game.boards[historyBoard].moveHistory;

  return (
    <main className="dh-page dh-game-page">
      {/* Top Action & Status Bar */}
      <div className="dh-game-topbar">
        <div className="dh-game-topbar-left">
          {isOnline ? (
            <button type="button" className="dh-btn dh-btn-ghost dh-btn-sm" onClick={leaveRoom}>
              <ArrowLeft size={15} /> Lobby
            </button>
          ) : (
            <div className="dh-practice-switcher">
              <button
                type="button"
                className={`dh-seg-btn ${practiceMode === 'bots' ? 'active' : ''}`}
                onClick={() => startPractice('bots', practiceTc)}
              >
                <Bot size={14} /> vs 3 Bots
              </button>
              <button
                type="button"
                className={`dh-seg-btn ${practiceMode === 'sandbox' ? 'active' : ''}`}
                onClick={() => startPractice('sandbox', practiceTc)}
              >
                <Users size={14} /> 4-Seat Sandbox
              </button>
            </div>
          )}

          <div className="dh-game-title-meta">
            <strong>{isOnline && room ? room.name : practiceMode === 'bots' ? 'Solo Practice vs Bots' : '4-Seat Sandbox'}</strong>
            <span className="dh-pill-badge neutral">
              <Clock size={12} /> {isOnline && room ? room.timeControl.label : practiceTc.label}
            </span>
            {isOnline && room && <span className="dh-room-code-chip">{room.code}</span>}
          </div>
        </div>

        <div className="dh-game-topbar-right">
          <button
            type="button"
            className="dh-btn dh-btn-ghost dh-btn-sm"
            onClick={() => setFlipped((f) => !f)}
            title="Flip board perspective"
          >
            <RotateCcw size={14} /> Flip
          </button>

          {game.status === 'playing' && (activeSeat || !isOnline) && (
            <button
              type="button"
              className="dh-btn dh-btn-danger dh-btn-sm"
              onClick={isOnline ? resign : practiceResign}
            >
              <Flag size={14} /> Resign
            </button>
          )}

          {game.status === 'finished' && (
            <button
              type="button"
              className="dh-btn dh-btn-primary dh-btn-sm"
              onClick={isOnline ? rematch : () => startPractice(practiceMode, practiceTc)}
            >
              <RefreshCw size={14} /> {isOnline ? 'Rematch (Swap Colors)' : 'Play Again'}
            </button>
          )}
        </div>
      </div>

      {/* Turn / Duck / Victory Banner */}
      <div className={`dh-status-banner variant-${bannerVariant}`}>
        <span>{bannerText}</span>
        {game.status === 'finished' && (
          <button
            type="button"
            className="dh-btn dh-btn-primary dh-btn-sm"
            onClick={isOnline ? rematch : () => startPractice(practiceMode, practiceTc)}
          >
            <Crown size={14} /> {isOnline ? 'Rematch' : 'New Match'}
          </button>
        )}
      </div>

      {/* Main Arena: Board A + Board B + Sidebar */}
      <div className="dh-arena-grid">
        <div className="dh-boards-pair">
          {renderBoardColumn(primaryBoardId, primaryOrientation, true)}
          {renderBoardColumn(secondaryBoardId, secondaryOrientation, false)}
        </div>

        <aside className="dh-game-sidebar">
          {!isOnline && (
            <div className="dh-card dh-practice-panel">
              <div className="dh-panel-heading">Practice Settings</div>
              <label className="dh-field">
                <span>Time Control</span>
                <select
                  value={practiceTc.id}
                  onChange={(e) => {
                    const tc = TIME_CONTROLS.find((t) => t.id === e.target.value) ?? TIME_CONTROLS[2];
                    startPractice(practiceMode as PracticeMode, tc);
                  }}
                >
                  {TIME_CONTROLS.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.id} — {tc.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="dh-btn dh-btn-secondary dh-btn-full dh-btn-sm"
                onClick={() => startPractice(practiceMode, practiceTc)}
              >
                <RefreshCw size={14} /> Restart Match
              </button>
            </div>
          )}

          {/* Dual-Board Move History */}
          <div className="dh-card dh-history-panel">
            <div className="dh-history-head">
              <div className="dh-panel-heading">
                <History size={15} /> Move Log
              </div>
              <div className="dh-history-tabs">
                <button
                  type="button"
                  className={historyBoard === 'A' ? 'active' : ''}
                  onClick={() => setHistoryBoard('A')}
                >
                  Board A ({game.boards.A.moveHistory.length})
                </button>
                <button
                  type="button"
                  className={historyBoard === 'B' ? 'active' : ''}
                  onClick={() => setHistoryBoard('B')}
                >
                  Board B ({game.boards.B.moveHistory.length})
                </button>
              </div>
            </div>

            <div className="dh-history-list">
              {activeHistory.length === 0 ? (
                <div className="dh-history-empty">No moves yet on Board {historyBoard}.</div>
              ) : (
                Array.from({ length: Math.ceil(activeHistory.length / 2) }).map((_, idx) => {
                  const wMove = activeHistory[idx * 2];
                  const bMove = activeHistory[idx * 2 + 1];
                  return (
                    <div key={idx} className="dh-history-row">
                      <span className="dh-move-num">{idx + 1}.</span>
                      <span className="dh-move-cell">{wMove?.notation ?? ''}</span>
                      <span className="dh-move-cell">{bMove?.notation ?? ''}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Online Team Chat */}
          {isOnline && room && (
            <TeamChat messages={room.chat} mySeat={mySeat} onSend={sendChat} />
          )}
        </aside>
      </div>
    </main>
  );
};
