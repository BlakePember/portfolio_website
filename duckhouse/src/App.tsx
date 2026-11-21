import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { GameProvider, useGame } from './context/GameContext';
import { Navbar } from './components/Navbar';
import { RulesModal } from './components/RulesModal';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { RoomWaitingPage } from './pages/RoomWaitingPage';
import { GamePage } from './pages/GamePage';

const AppShell: React.FC = () => {
  const { page, room, errorBanner, clearError } = useGame();

  const renderPage = () => {
    if (page === 'room' && room) {
      if (room.game.status === 'waiting') {
        return <RoomWaitingPage />;
      }
      return <GamePage mode="online" />;
    }
    if (page === 'lobby') return <LobbyPage />;
    if (page === 'practice') return <GamePage mode="practice" />;
    return <HomePage />;
  };

  return (
    <div className="dh-app">
      <Navbar />
      {errorBanner && (
        <div className="dh-toast-error" role="alert">
          <AlertCircle size={16} />
          <span>{errorBanner}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss alert">
            <X size={15} />
          </button>
        </div>
      )}
      {renderPage()}
      <RulesModal />
    </div>
  );
};

export const App: React.FC = () => (
  <GameProvider>
    <AppShell />
  </GameProvider>
);

export default App;
