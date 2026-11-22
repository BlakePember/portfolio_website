import { describe, expect, it } from 'vitest';
import { SENTENCE_CHALLENGES, UNITS, VOCAB_ITEMS, getVocabByUnit } from '../data/curriculum';
import { PRONOUNS, TENSES, VERBS } from '../data/verbs';
import { CONVERSATIONS } from '../data/conversations';
import { CONTRACTIONS, FALSE_FRIENDS, SER_ESTAR_PAIRS, SOUND_RULES } from '../data/guide';
import { buildUnitLesson, replaceBlankWord } from './exercises';
import { gradePortugueseAnswer, levenshtein, normalizeText, stripAccents } from './grader';
import { parseRoute } from './routes';
import { getCardStatus, isCardDue, previewIntervals, reviewCard } from './srs';
import { applyXpGain, defaultState } from './storage';

describe('Brazilian Portuguese curriculum data integrity', () => {
  it('has 8 unique units with rich vocab and sentence challenges', () => {
    expect(UNITS.length).toBe(8);
    const unitIds = new Set(UNITS.map((u) => u.id));
    expect(unitIds.size).toBe(UNITS.length);

    for (const unit of UNITS) {
      const items = getVocabByUnit(unit.id);
      expect(items.length).toBeGreaterThanOrEqual(16);
      const sentences = SENTENCE_CHALLENGES.filter((s) => s.unitId === unit.id);
      expect(sentences.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('has unique vocab IDs and complete fields', () => {
    const ids = new Set<string>();
    for (const item of VOCAB_ITEMS) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(item.pt.trim().length).toBeGreaterThan(0);
      expect(item.en.trim().length).toBeGreaterThan(0);
      expect(item.phonetic.trim().length).toBeGreaterThan(0);
      expect(item.examplePt.trim().length).toBeGreaterThan(0);
      expect(item.exampleEn.trim().length).toBeGreaterThan(0);
    }
  });

  it('has complete sentence blanks that match words inside each sentence (including accented words)', () => {
    for (const s of SENTENCE_CHALLENGES) {
      const blanked = replaceBlankWord(s.pt, s.blankWord);
      expect(blanked).toContain('_____');
      expect(blanked).not.toBe(s.pt);
      expect(s.distractors.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('has 20 verbs with full Brazilian conjugations across all 4 tenses and pronouns', () => {
    expect(VERBS.length).toBe(20);
    const ids = new Set<string>();
    for (const verb of VERBS) {
      expect(ids.has(verb.id)).toBe(false);
      ids.add(verb.id);
      for (const tense of TENSES) {
        for (const p of PRONOUNS) {
          const form = verb.conjugations[tense.id][p.key];
          expect(form.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has valid interactive conversations with roleplay options', () => {
    expect(CONVERSATIONS.length).toBe(6);
    for (const conv of CONVERSATIONS) {
      const youTurns = conv.turns.filter((t) => t.speaker === 'you');
      expect(youTurns.length).toBeGreaterThanOrEqual(2);
      for (const turn of youTurns) {
        expect(turn.options?.length).toBeGreaterThanOrEqual(3);
        const correctOpts = turn.options!.filter((o) => o.correct);
        expect(correctOpts.length).toBe(1);
      }
    }
  });

  it('has populated pronunciation & survival guide datasets', () => {
    expect(SOUND_RULES.length).toBeGreaterThanOrEqual(8);
    expect(CONTRACTIONS.length).toBeGreaterThanOrEqual(8);
    expect(SER_ESTAR_PAIRS.length).toBeGreaterThanOrEqual(4);
    expect(FALSE_FRIENDS.length).toBeGreaterThanOrEqual(6);
  });
});

describe('Lesson exercise generator', () => {
  it('generates 10 diverse exercises with unique options for every unit', () => {
    for (const unit of UNITS) {
      const { previewItems, exercises } = buildUnitLesson(unit.id, 4242);
      expect(previewItems.length).toBe(6);
      expect(exercises.length).toBe(10);

      for (const ex of exercises) {
        if (ex.options) {
          expect(ex.options.length).toBe(4);
          expect(new Set(ex.options.map((o) => o.toLowerCase())).size).toBe(4);
          expect(
            ex.options.some((o) => normalizeText(o, true) === normalizeText(ex.correctAnswer, true))
          ).toBe(true);
        }
        if (ex.kind === 'fill-blank') {
          expect(ex.blankSentence).toContain('_____');
        }
        if (ex.kind === 'word-bank') {
          expect((ex.wordTiles ?? []).length).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });
});

describe('Brazilian Portuguese answer grader', () => {
  it('strips diacritics and normalizes punctuation accurately', () => {
    expect(stripAccents('Pão de queijo — manhã, coração!')).toBe('Pao de queijo — manha, coracao!');
    expect(normalizeText('  Tudo bem?! ', true)).toBe('tudo bem');
    expect(levenshtein('obrigado', 'obrigada')).toBe(1);
  });

  it('recognizes exact answers, accent-missing warnings, alternatives, and small typos', () => {
    const exact = gradePortugueseAnswer('Pão de queijo', 'Pão de queijo');
    expect(exact.status).toBe('exact');
    expect(exact.accepted).toBe(true);

    const accentWarn = gradePortugueseAnswer('pao de queijo', 'Pão de queijo');
    expect(accentWarn.status).toBe('accent-warning');
    expect(accentWarn.accepted).toBe(true);

    const altAccepted = gradePortugueseAnswer('obrigada', 'Obrigado', ['obrigada']);
    expect(altAccepted.status).toBe('exact');
    expect(altAccepted.accepted).toBe(true);

    const slashAccepted = gradePortugueseAnswer('amiga', 'Amigo / Amiga');
    expect(slashAccepted.accepted).toBe(true);

    const closeTypo = gradePortugueseAnswer('obrigadu', 'Obrigado');
    expect(closeTypo.status).toBe('close');
    expect(closeTypo.accepted).toBe(true);

    const wrong = gradePortugueseAnswer('banheiro', 'Pão de queijo');
    expect(wrong.status).toBe('incorrect');
    expect(wrong.accepted).toBe(false);
  });
});

describe('SM-2 spaced repetition engine', () => {
  it('schedules intervals progressively and resets on lapse', () => {
    const t0 = 1_700_000_000_000;
    const r1 = reviewCard(undefined, 2, t0); // Good
    expect(r1.repetitions).toBe(1);
    expect(r1.intervalDays).toBe(1);
    expect(isCardDue(r1, t0 + 1000)).toBe(false);
    expect(isCardDue(r1, r1.dueAt + 1)).toBe(true);

    const r2 = reviewCard(r1, 2, r1.dueAt);
    expect(r2.repetitions).toBe(2);
    expect(r2.intervalDays).toBe(4);

    const r3 = reviewCard(r2, 2, r2.dueAt);
    expect(r3.repetitions).toBe(3);
    expect(r3.intervalDays).toBeGreaterThanOrEqual(7);
    expect(getCardStatus(r3)).toBe('mastered');

    // Lapse with Again (0)
    const lapsed = reviewCard(r3, 0, r3.dueAt);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.intervalDays).toBe(0);
    expect(getCardStatus(lapsed)).toBe('learning');

    const hints = previewIntervals(r1, t0);
    expect(hints[0]).toBe('10m');
    expect(hints[2]).toBe('4d');
  });
});

describe('Routing and XP streak storage helpers', () => {
  it('parses clean routes under /language', () => {
    expect(parseRoute('/language/')).toEqual({ page: 'home' });
    expect(parseRoute('/language/lesson/food')).toEqual({ page: 'lesson', unitId: 'food' });
    expect(parseRoute('/language/flashcards')).toEqual({ page: 'flashcards' });
    expect(parseRoute('/language/verbs')).toEqual({ page: 'verbs' });
    expect(parseRoute('/language/conversations')).toEqual({ page: 'conversations' });
    expect(parseRoute('/language/guide')).toEqual({ page: 'guide' });
  });

  it('tracks daily XP and multi-day streaks cleanly', () => {
    const initial = defaultState().stats;
    const day1 = new Date(2026, 10, 20, 10, 0, 0);
    const day2 = new Date(2026, 10, 21, 10, 0, 0);
    const day5 = new Date(2026, 10, 24, 10, 0, 0);

    const s1 = applyXpGain(initial, 30, day1);
    expect(s1.streakDays).toBe(1);
    expect(s1.dailyXp).toBe(30);

    const s2 = applyXpGain(s1, 40, day2);
    expect(s2.streakDays).toBe(2);
    expect(s2.bestStreakDays).toBe(2);
    expect(s2.dailyXp).toBe(40);
    expect(s2.totalXp).toBe(70);

    // Gap resets current streak but keeps bestStreakDays
    const s3 = applyXpGain(s2, 20, day5);
    expect(s3.streakDays).toBe(1);
    expect(s3.bestStreakDays).toBe(2);
  });
});
