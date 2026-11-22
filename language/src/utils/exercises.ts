import {
  VOCAB_ITEMS,
  getSentencesByUnit,
  getVocabByUnit,
  type SentenceChallenge,
  type UnitId,
  type VocabItem,
} from '../data/curriculum';

export type ExerciseKind =
  | 'mc-pt-to-en'
  | 'mc-en-to-pt'
  | 'listen-pick'
  | 'word-bank'
  | 'fill-blank'
  | 'type-pt';

export interface LessonExercise {
  id: string;
  kind: ExerciseKind;
  vocabId?: string;
  prompt: string;
  subprompt?: string;
  audioText?: string;
  phonetic?: string;
  options?: string[];
  correctAnswer: string;
  altAnswers?: string[];
  /** Word bank tiles for 'word-bank' kind */
  wordTiles?: string[];
  /** Sentence with ___ for 'fill-blank' */
  blankSentence?: string;
  tip?: string;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickDistractors(
  target: VocabItem,
  pool: VocabItem[],
  field: 'pt' | 'en',
  count: number,
  seed: number
): string[] {
  const targetVal = target[field].toLowerCase();
  const seen = new Set<string>([targetVal]);

  const sameUnit = seededShuffle(
    pool.filter((v) => v.id !== target.id && v.unitId === target.unitId),
    seed
  );
  const otherUnits = seededShuffle(
    pool.filter((v) => v.id !== target.id && v.unitId !== target.unitId),
    seed + 31
  );

  const picked: string[] = [];
  for (const item of [...sameUnit, ...otherUnits]) {
    const val = item[field];
    const key = val.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      picked.push(val);
      if (picked.length === count) break;
    }
  }
  return picked;
}

function tokenizeSentence(sentence: string): string[] {
  return sentence
    .replace(/[?!.]/g, '')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function makeWordBankExercise(sc: SentenceChallenge, seed: number): LessonExercise {
  const tokens = tokenizeSentence(sc.pt);
  const extraDistractors = sc.distractors.slice(0, 2);
  const tiles = seededShuffle([...tokens, ...extraDistractors], seed);
  return {
    id: `wb-${sc.id}`,
    kind: 'word-bank',
    prompt: sc.en,
    subprompt: 'Tap the Portuguese words in order',
    audioText: sc.pt,
    correctAnswer: tokens.join(' '),
    wordTiles: tiles,
    tip: sc.note,
  };
}

export function replaceBlankWord(sentence: string, blankWord: string): string {
  const escaped = blankWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'iu');
  return sentence.replace(regex, '_____');
}

function makeFillBlankExercise(sc: SentenceChallenge, seed: number): LessonExercise {
  const blankSentence = replaceBlankWord(sc.pt, sc.blankWord);
  const options = seededShuffle([sc.blankWord, ...sc.distractors.slice(0, 3)], seed);
  return {
    id: `fb-${sc.id}`,
    kind: 'fill-blank',
    prompt: sc.en,
    subprompt: `Hint: ${sc.blankHint}`,
    blankSentence,
    audioText: sc.pt,
    options,
    correctAnswer: sc.blankWord,
    tip: sc.note,
  };
}

/**
 * Generate a curated 10-question mixed active-recall lesson for a unit.
 */
export function buildUnitLesson(unitId: UnitId, seed = Date.now()): {
  previewItems: VocabItem[];
  exercises: LessonExercise[];
} {
  const unitVocab = getVocabByUnit(unitId);
  const unitSentences = getSentencesByUnit(unitId);
  const shuffledVocab = seededShuffle(unitVocab, seed);
  const shuffledSentences = seededShuffle(unitSentences, seed + 17);

  // Pick 6 core items to preview & drill deeply
  const focusVocab = shuffledVocab.slice(0, 6);
  const exercises: LessonExercise[] = [];

  // 1-2: PT -> EN Multiple Choice
  focusVocab.slice(0, 2).forEach((item, idx) => {
    const distractors = pickDistractors(item, VOCAB_ITEMS, 'en', 3, seed + idx * 13);
    exercises.push({
      id: `pt-en-${item.id}`,
      kind: 'mc-pt-to-en',
      vocabId: item.id,
      prompt: item.pt,
      subprompt: 'Choose the English meaning',
      audioText: item.pt,
      phonetic: item.phonetic,
      options: seededShuffle([item.en, ...distractors], seed + idx * 19),
      correctAnswer: item.en,
      tip: item.tip,
    });
  });

  // 3-4: Listen & Recognize (Brazilian Audio -> pick meaning)
  focusVocab.slice(2, 4).forEach((item, idx) => {
    const distractors = pickDistractors(item, VOCAB_ITEMS, 'pt', 3, seed + 100 + idx * 17);
    exercises.push({
      id: `listen-${item.id}`,
      kind: 'listen-pick',
      vocabId: item.id,
      prompt: 'Listen carefully and choose what you hear',
      subprompt: `Meaning: "${item.en}"`,
      audioText: item.pt,
      phonetic: item.phonetic,
      options: seededShuffle([item.pt, ...distractors], seed + 120 + idx * 23),
      correctAnswer: item.pt,
      tip: item.tip,
    });
  });

  // 5-6: EN -> PT Multiple Choice
  focusVocab.slice(4, 6).forEach((item, idx) => {
    const distractors = pickDistractors(item, VOCAB_ITEMS, 'pt', 3, seed + 200 + idx * 11);
    exercises.push({
      id: `en-pt-${item.id}`,
      kind: 'mc-en-to-pt',
      vocabId: item.id,
      prompt: item.en,
      subprompt: 'Choose the Brazilian Portuguese',
      audioText: item.pt,
      phonetic: item.phonetic,
      options: seededShuffle([item.pt, ...distractors], seed + 230 + idx * 29),
      correctAnswer: item.pt,
      tip: item.tip,
    });
  });

  // 7: Fill in the Blank
  if (shuffledSentences[0]) {
    exercises.push(makeFillBlankExercise(shuffledSentences[0], seed + 301));
  }

  // 8: Sentence Builder (Word Bank)
  if (shuffledSentences[1]) {
    exercises.push(makeWordBankExercise(shuffledSentences[1], seed + 401));
  }

  // 9: Fill in the Blank #2
  if (shuffledSentences[2]) {
    exercises.push(makeFillBlankExercise(shuffledSentences[2], seed + 501));
  }

  // 10: Active Typing Challenge (pick a clean single-or-two-word item without slash or ellipsis)
  const typable =
    focusVocab.find((v) => !v.pt.includes('/') && !v.pt.includes('...')) ??
    shuffledVocab.find((v) => !v.pt.includes('/') && !v.pt.includes('...')) ??
    focusVocab[0];

  if (typable) {
    exercises.push({
      id: `type-${typable.id}`,
      kind: 'type-pt',
      vocabId: typable.id,
      prompt: typable.en,
      subprompt: 'Type this in Brazilian Portuguese (use the accent bar if needed)',
      audioText: typable.pt,
      phonetic: typable.phonetic,
      correctAnswer: typable.pt,
      altAnswers: typable.altPt,
      tip: typable.tip,
    });
  }

  // Interleave slightly while keeping recognition before production
  return {
    previewItems: focusVocab,
    exercises,
  };
}
