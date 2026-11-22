import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { VOCAB_ITEMS, type UnitId, type VocabItem } from '../data/curriculum';
import {
  navigatePath,
  parseRoute,
  type AppPage,
} from '../utils/routes';
import { setSoundMuted } from '../utils/sounds';
import {
  getPortugueseVoices,
  isSpeechSupported,
  speakPortuguese,
  stopSpeaking,
} from '../utils/speech';
import {
  getCardStatus,
  isCardDue,
  reviewCard,
  type SrsCardProgress,
  type SrsRating,
} from '../utils/srs';
import {
  applyXpGain,
  defaultState,
  loadPersistedState,
  savePersistedState,
  type PersistedState,
  type ThemeMode,
  type UserStats,
} from '../utils/storage';

interface LanguageContextValue {
  page: AppPage;
  activeUnitId: UnitId;
  flashcardsFilterUnit: UnitId | 'all';
  activeScenarioId: string;
  setPage: (page: AppPage) => void;
  openLesson: (unitId: UnitId) => void;
  openFlashcards: (unitId?: UnitId | 'all') => void;
  openConversation: (scenarioId?: string) => void;

  theme: ThemeMode;
  toggleTheme: () => void;
  muted: boolean;
  toggleMute: () => void;

  speechSupported: boolean;
  ptVoices: SpeechSynthesisVoice[];
  preferredVoiceURI: string;
  setPreferredVoiceURI: (uri: string) => void;
  speakingText: string | null;
  speak: (text: string, slow?: boolean) => void;
  stopAudio: () => void;

  allCards: VocabItem[];
  customCards: VocabItem[];
  addCustomCard: (card: Omit<VocabItem, 'id' | 'unitId' | 'partOfSpeech'>) => void;
  deleteCustomCard: (cardId: string) => void;

  srs: Record<string, SrsCardProgress>;
  starredIds: string[];
  toggleStar: (cardId: string) => void;
  recordSrsReview: (cardId: string, rating: SrsRating, xpReward?: number) => void;
  dueCount: number;
  masteredCount: number;
  getUnitMastery: (unitId: UnitId) => { reviewed: number; mastered: number; total: number; pct: number };

  stats: UserStats;
  setDailyGoalXp: (goal: number) => void;
  recordLessonComplete: (unitId: UnitId, accuracyPct: number, xpEarned: number) => void;
  recordVerbAttempt: (correct: boolean) => void;
  recordConversationComplete: (scenarioId: string) => void;
  resetAllProgress: () => void;

  showHelp: boolean;
  setShowHelp: (open: boolean) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersistedState());
  const [showHelp, setShowHelp] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [ptVoices, setPtVoices] = useState<SpeechSynthesisVoice[]>(() => getPortugueseVoices());
  const speechSupported = useMemo(() => isSpeechSupported(), []);

  const initialRoute = useMemo(
    () =>
      typeof window !== 'undefined'
        ? parseRoute(window.location.pathname, window.location.hash)
        : { page: 'home' as const },
    []
  );

  const [page, setPageState] = useState<AppPage>(initialRoute.page);
  const [activeUnitId, setActiveUnitId] = useState<UnitId>(
    initialRoute.page === 'lesson' ? initialRoute.unitId : 'greetings'
  );
  const [flashcardsFilterUnit, setFlashcardsFilterUnit] = useState<UnitId | 'all'>('all');
  const [activeScenarioId, setActiveScenarioId] = useState<string>('padaria');

  // Apply theme attribute & mute setting
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', persisted.theme);
  }, [persisted.theme]);

  useEffect(() => {
    setSoundMuted(persisted.muted);
  }, [persisted.muted]);

  // Persist to localStorage whenever state updates
  useEffect(() => {
    savePersistedState(persisted);
  }, [persisted]);

  // Listen for async speechSynthesis voice loading
  useEffect(() => {
    if (!speechSupported) return;
    const syncVoices = () => setPtVoices(getPortugueseVoices());
    syncVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', syncVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', syncVoices);
    };
  }, [speechSupported]);

  // Browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      stopSpeaking();
      setSpeakingText(null);
      const parsed = parseRoute(window.location.pathname, window.location.hash);
      setPageState(parsed.page);
      if (parsed.page === 'lesson') {
        setActiveUnitId(parsed.unitId);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setPage = useCallback((nextPage: AppPage) => {
    stopSpeaking();
    setSpeakingText(null);
    setPageState(nextPage);
    if (nextPage === 'home') navigatePath('/');
    else if (nextPage === 'lesson') navigatePath(`/lesson/${activeUnitId}`);
    else navigatePath(`/${nextPage}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeUnitId]);

  const openLesson = useCallback((unitId: UnitId) => {
    stopSpeaking();
    setSpeakingText(null);
    setActiveUnitId(unitId);
    setPageState('lesson');
    navigatePath(`/lesson/${unitId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openFlashcards = useCallback((unitId: UnitId | 'all' = 'all') => {
    stopSpeaking();
    setSpeakingText(null);
    setFlashcardsFilterUnit(unitId);
    setPageState('flashcards');
    navigatePath('/flashcards');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openConversation = useCallback((scenarioId?: string) => {
    stopSpeaking();
    setSpeakingText(null);
    if (scenarioId) setActiveScenarioId(scenarioId);
    setPageState('conversations');
    navigatePath('/conversations');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleTheme = useCallback(() => {
    setPersisted((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const toggleMute = useCallback(() => {
    setPersisted((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const setPreferredVoiceURI = useCallback((uri: string) => {
    setPersisted((prev) => ({ ...prev, preferredVoiceURI: uri }));
  }, []);

  const speak = useCallback(
    (text: string, slow = false) => {
      speakPortuguese(text, {
        slow,
        voiceURI: persisted.preferredVoiceURI || undefined,
        onStart: () => setSpeakingText(text),
        onEnd: () => setSpeakingText((curr) => (curr === text ? null : curr)),
      });
    },
    [persisted.preferredVoiceURI]
  );

  const stopAudio = useCallback(() => {
    stopSpeaking();
    setSpeakingText(null);
  }, []);

  const allCards = useMemo(
    () => [...VOCAB_ITEMS, ...persisted.customCards],
    [persisted.customCards]
  );

  const toggleStar = useCallback((cardId: string) => {
    setPersisted((prev) => {
      const exists = prev.starredIds.includes(cardId);
      const starredIds = exists
        ? prev.starredIds.filter((id) => id !== cardId)
        : [...prev.starredIds, cardId];
      return { ...prev, starredIds };
    });
  }, []);

  const addCustomCard = useCallback(
    (card: Omit<VocabItem, 'id' | 'unitId' | 'partOfSpeech'>) => {
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const entry: VocabItem = {
        ...card,
        id,
        unitId: 'slang',
        partOfSpeech: 'phrase',
      };
      setPersisted((prev) => ({
        ...prev,
        customCards: [entry, ...prev.customCards],
        starredIds: [id, ...prev.starredIds],
      }));
    },
    []
  );

  const deleteCustomCard = useCallback((cardId: string) => {
    setPersisted((prev) => {
      const nextSrs = { ...prev.srs };
      delete nextSrs[cardId];
      return {
        ...prev,
        customCards: prev.customCards.filter((c) => c.id !== cardId),
        starredIds: prev.starredIds.filter((id) => id !== cardId),
        srs: nextSrs,
      };
    });
  }, []);

  const recordSrsReview = useCallback((cardId: string, rating: SrsRating, xpReward = 5) => {
    setPersisted((prev) => {
      const updatedCard = reviewCard(prev.srs[cardId], rating);
      const nextStats = xpReward > 0 ? applyXpGain(prev.stats, xpReward) : prev.stats;
      return {
        ...prev,
        srs: { ...prev.srs, [cardId]: updatedCard },
        stats: nextStats,
      };
    });
  }, []);

  const setDailyGoalXp = useCallback((goal: number) => {
    setPersisted((prev) => ({
      ...prev,
      stats: { ...prev.stats, dailyGoalXp: goal },
    }));
  }, []);

  const recordLessonComplete = useCallback(
    (unitId: UnitId, _accuracyPct: number, xpEarned: number) => {
      setPersisted((prev) => {
        const prevCount = prev.stats.lessonsCompleted[unitId] ?? 0;
        const nextStats = applyXpGain(prev.stats, xpEarned);
        nextStats.lessonsCompleted = {
          ...prev.stats.lessonsCompleted,
          [unitId]: prevCount + 1,
        };
        return { ...prev, stats: nextStats };
      });
    },
    []
  );

  const recordVerbAttempt = useCallback((correct: boolean) => {
    setPersisted((prev) => {
      const base = correct ? applyXpGain(prev.stats, 6) : prev.stats;
      return {
        ...prev,
        stats: {
          ...base,
          verbsAttempted: base.verbsAttempted + 1,
          verbsCorrect: base.verbsCorrect + (correct ? 1 : 0),
        },
      };
    });
  }, []);

  const recordConversationComplete = useCallback((scenarioId: string) => {
    setPersisted((prev) => {
      const already = prev.stats.conversationsCompleted.includes(scenarioId);
      const base = applyXpGain(prev.stats, already ? 10 : 25);
      return {
        ...prev,
        stats: {
          ...base,
          conversationsCompleted: already
            ? base.conversationsCompleted
            : [...base.conversationsCompleted, scenarioId],
        },
      };
    });
  }, []);

  const resetAllProgress = useCallback(() => {
    setPersisted((prev) => ({
      ...defaultState(),
      theme: prev.theme,
      muted: prev.muted,
      preferredVoiceURI: prev.preferredVoiceURI,
    }));
  }, []);

  const dueCount = useMemo(() => {
    const now = Date.now();
    // Cards already started that are due right now
    let count = 0;
    for (const card of allCards) {
      const p = persisted.srs[card.id];
      if (p && p.lastReviewedAt > 0 && isCardDue(p, now)) {
        count += 1;
      }
    }
    return count;
  }, [allCards, persisted.srs]);

  const masteredCount = useMemo(() => {
    let count = 0;
    for (const card of allCards) {
      if (getCardStatus(persisted.srs[card.id]) === 'mastered') {
        count += 1;
      }
    }
    return count;
  }, [allCards, persisted.srs]);

  const getUnitMastery = useCallback(
    (unitId: UnitId) => {
      const items = VOCAB_ITEMS.filter((v) => v.unitId === unitId);
      let reviewed = 0;
      let mastered = 0;
      for (const item of items) {
        const status = getCardStatus(persisted.srs[item.id]);
        if (status !== 'new') reviewed += 1;
        if (status === 'mastered' || status === 'review') mastered += 1;
      }
      const pct = items.length ? Math.round((mastered / items.length) * 100) : 0;
      return { reviewed, mastered, total: items.length, pct };
    },
    [persisted.srs]
  );

  const value: LanguageContextValue = {
    page,
    activeUnitId,
    flashcardsFilterUnit,
    activeScenarioId,
    setPage,
    openLesson,
    openFlashcards,
    openConversation,
    theme: persisted.theme,
    toggleTheme,
    muted: persisted.muted,
    toggleMute,
    speechSupported,
    ptVoices,
    preferredVoiceURI: persisted.preferredVoiceURI,
    setPreferredVoiceURI,
    speakingText,
    speak,
    stopAudio,
    allCards,
    customCards: persisted.customCards,
    addCustomCard,
    deleteCustomCard,
    srs: persisted.srs,
    starredIds: persisted.starredIds,
    toggleStar,
    recordSrsReview,
    dueCount,
    masteredCount,
    getUnitMastery,
    stats: persisted.stats,
    setDailyGoalXp,
    recordLessonComplete,
    recordVerbAttempt,
    recordConversationComplete,
    resetAllProgress,
    showHelp,
    setShowHelp,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
