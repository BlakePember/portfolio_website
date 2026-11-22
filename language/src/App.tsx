import React from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { HelpModal } from './components/HelpModal';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { VerbsPage } from './pages/VerbsPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { GuidePage } from './pages/GuidePage';

const AppShell: React.FC = () => {
  const { page } = useLanguage();

  return (
    <div className="fl-app">
      <Navbar />
      {page === 'home' && <HomePage />}
      {page === 'lesson' && <LessonPage />}
      {page === 'flashcards' && <FlashcardsPage />}
      {page === 'verbs' && <VerbsPage />}
      {page === 'conversations' && <ConversationsPage />}
      {page === 'guide' && <GuidePage />}
      <HelpModal />
    </div>
  );
};

export const App: React.FC = () => (
  <LanguageProvider>
    <AppShell />
  </LanguageProvider>
);

export default App;
