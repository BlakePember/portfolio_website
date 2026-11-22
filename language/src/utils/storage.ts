import type { UnitId, VocabItem } from '../data/curriculum';
import type { SrsCardProgress } from './srs';

export type ThemeMode = 'dark' | 'light';

export interface UserStats {
  totalXp: number;
  dailyXp: number;
  dailyGoalXp: number;
  lastStudyDate: string; // YYYY-MM-DD
  streakDays: number;
  bestStreakDays: number;
  lessonsCompleted: Partial<Record<UnitId, number>>;
  verbsCorrect: number;
  verbsAttempted: number;
  conversationsCompleted: string[];
}

export interface PersistedState {
  theme: ThemeMode;
  muted: boolean;
  preferredVoiceURI: string;
  srs: Record<string, SrsCardProgress>;
  starredIds: string[];
  customCards: VocabItem[];
  stats: UserStats;
}

const STORAGE_KEY = 'fala_ptbr_state_v1';

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function yesterdayKey(date = new Date()): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return todayKey(copy);
}

export function defaultState(): PersistedState {
  return {
    theme: 'dark',
    muted: false,
    preferredVoiceURI: '',
    srs: {},
    starredIds: [],
    customCards: [],
    stats: {
      totalXp: 0,
      dailyXp: 0,
      dailyGoalXp: 60,
      lastStudyDate: '',
      streakDays: 0,
      bestStreakDays: 0,
      lessonsCompleted: {},
      verbsCorrect: 0,
      verbsAttempted: 0,
      conversationsCompleted: [],
    },
  };
}

export function loadPersistedState(): PersistedState {
  const fallback = defaultState();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const today = todayKey();
    const yesterday = yesterdayKey();
    const stats: UserStats = {
      ...fallback.stats,
      ...(parsed.stats ?? {}),
      lessonsCompleted: { ...(parsed.stats?.lessonsCompleted ?? {}) },
      conversationsCompleted: Array.isArray(parsed.stats?.conversationsCompleted)
        ? parsed.stats.conversationsCompleted
        : [],
    };

    // Roll over daily XP if last study date is not today
    if (stats.lastStudyDate && stats.lastStudyDate !== today) {
      stats.dailyXp = 0;
      if (stats.lastStudyDate !== yesterday) {
        stats.streakDays = 0;
      }
    }

    return {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      muted: Boolean(parsed.muted),
      preferredVoiceURI: typeof parsed.preferredVoiceURI === 'string' ? parsed.preferredVoiceURI : '',
      srs: parsed.srs && typeof parsed.srs === 'object' ? parsed.srs : {},
      starredIds: Array.isArray(parsed.starredIds) ? parsed.starredIds : [],
      customCards: Array.isArray(parsed.customCards) ? parsed.customCards : [],
      stats,
    };
  } catch {
    return fallback;
  }
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function applyXpGain(stats: UserStats, amount: number, now = new Date()): UserStats {
  const today = todayKey(now);
  const yesterday = yesterdayKey(now);
  let { streakDays, bestStreakDays, dailyXp } = stats;

  if (stats.lastStudyDate !== today) {
    dailyXp = 0;
    if (stats.lastStudyDate === yesterday) {
      streakDays += 1;
    } else if (amount > 0) {
      streakDays = 1;
    }
  } else if (streakDays === 0 && amount > 0) {
    streakDays = 1;
  }

  dailyXp += amount;
  bestStreakDays = Math.max(bestStreakDays, streakDays);

  return {
    ...stats,
    totalXp: stats.totalXp + amount,
    dailyXp,
    lastStudyDate: today,
    streakDays,
    bestStreakDays,
  };
}
