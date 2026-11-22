export type SrsRating = 0 | 1 | 2 | 3; // 0 = Again, 1 = Hard, 2 = Good, 3 = Easy

export type CardStatus = 'new' | 'learning' | 'review' | 'mastered';

export interface SrsCardProgress {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: number;
  lastReviewedAt: number;
  correctCount: number;
  wrongCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function createInitialProgress(now = Date.now()): SrsCardProgress {
  return {
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: now,
    lastReviewedAt: 0,
    correctCount: 0,
    wrongCount: 0,
  };
}

/**
 * SM-2 inspired spaced repetition scheduler tuned for daily language study.
 */
export function reviewCard(
  current: SrsCardProgress | undefined,
  rating: SrsRating,
  now = Date.now()
): SrsCardProgress {
  const prev = current ?? createInitialProgress(now);
  let { ease, intervalDays, repetitions, lapses, correctCount, wrongCount } = prev;

  if (rating === 0) {
    // Again: reset streak, show again in 10 minutes
    repetitions = 0;
    lapses += 1;
    intervalDays = 0;
    ease = Math.max(1.3, Number((ease - 0.2).toFixed(2)));
    wrongCount += 1;
    return {
      ease,
      intervalDays,
      repetitions,
      lapses,
      dueAt: now + 10 * MINUTE_MS,
      lastReviewedAt: now,
      correctCount,
      wrongCount,
    };
  }

  correctCount += 1;

  if (rating === 1) {
    // Hard
    ease = Math.max(1.3, Number((ease - 0.15).toFixed(2)));
    if (repetitions === 0) {
      intervalDays = 0.5; // 12 hours
      repetitions = 1;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
      repetitions += 1;
    }
  } else if (rating === 2) {
    // Good
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 4;
    } else {
      intervalDays = Math.max(2, Math.round(intervalDays * ease));
    }
    repetitions += 1;
  } else {
    // Easy (3)
    ease = Math.min(3.0, Number((ease + 0.15).toFixed(2)));
    if (repetitions === 0) {
      intervalDays = 4;
    } else if (repetitions === 1) {
      intervalDays = 7;
    } else {
      intervalDays = Math.max(4, Math.round(intervalDays * ease * 1.3));
    }
    repetitions += 1;
  }

  return {
    ease,
    intervalDays,
    repetitions,
    lapses,
    dueAt: now + Math.round(intervalDays * DAY_MS),
    lastReviewedAt: now,
    correctCount,
    wrongCount,
  };
}

export function isCardDue(progress: SrsCardProgress | undefined, now = Date.now()): boolean {
  if (!progress) return true;
  return progress.dueAt <= now;
}

export function getCardStatus(progress: SrsCardProgress | undefined): CardStatus {
  if (!progress || progress.lastReviewedAt === 0) return 'new';
  if (progress.repetitions >= 3 && progress.intervalDays >= 7) return 'mastered';
  if (progress.intervalDays >= 1) return 'review';
  return 'learning';
}

export function formatIntervalLabel(days: number, dueAt: number, now = Date.now()): string {
  const diffMs = Math.max(0, dueAt - now);
  if (days === 0 || diffMs < 60 * MINUTE_MS) {
    const mins = Math.max(1, Math.round(diffMs / MINUTE_MS));
    return `${mins}m`;
  }
  if (days < 1) {
    const hrs = Math.max(1, Math.round(diffMs / (60 * MINUTE_MS)));
    return `${hrs}h`;
  }
  if (days < 30) {
    return `${Math.round(days)}d`;
  }
  const months = (days / 30).toFixed(1).replace(/\.0$/, '');
  return `${months}mo`;
}

export function previewIntervals(
  current: SrsCardProgress | undefined,
  now = Date.now()
): Record<SrsRating, string> {
  const ratings: SrsRating[] = [0, 1, 2, 3];
  const out = {} as Record<SrsRating, string>;
  for (const r of ratings) {
    const next = reviewCard(current, r, now);
    out[r] = formatIntervalLabel(next.intervalDays, next.dueAt, now);
  }
  return out;
}
