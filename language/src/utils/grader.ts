export type GradeResultStatus = 'exact' | 'accent-warning' | 'close' | 'incorrect';

export interface GradeResult {
  status: GradeResultStatus;
  accepted: boolean;
  expected: string;
  feedback: string;
}

export const BRAZILIAN_ACCENTS = ['á', 'â', 'ã', 'à', 'ç', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú'] as const;

export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(input: string, keepAccents = true): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[¡!¿?.,;:"'()…—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return keepAccents ? cleaned : stripAccents(cleaned);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Expand slash-separated forms (e.g., "Amigo / Amiga") into individual valid answers.
 */
export function expandAcceptedAnswers(primary: string, alternatives: string[] = []): string[] {
  const raw = [primary, ...alternatives];
  const expanded = new Set<string>();

  for (const entry of raw) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    expanded.add(trimmed);
    if (trimmed.includes('/')) {
      for (const part of trimmed.split('/')) {
        const p = part.trim();
        if (p) expanded.add(p);
      }
    }
  }
  return Array.from(expanded);
}

/**
 * Grade a typed Brazilian Portuguese answer with accent-aware, learner-friendly feedback.
 */
export function gradePortugueseAnswer(
  userInput: string,
  primaryExpected: string,
  alternatives: string[] = []
): GradeResult {
  const normExact = normalizeText(userInput, true);
  const normPlain = normalizeText(userInput, false);

  if (!normPlain) {
    return {
      status: 'incorrect',
      accepted: false,
      expected: primaryExpected,
      feedback: `Answer: ${primaryExpected}`,
    };
  }

  const candidates = expandAcceptedAnswers(primaryExpected, alternatives);

  // 1. Exact match including accents
  for (const cand of candidates) {
    if (normExact === normalizeText(cand, true)) {
      return {
        status: 'exact',
        accepted: true,
        expected: primaryExpected,
        feedback: 'Perfeito! Exact match.',
      };
    }
  }

  // 2. Right spelling, missed an accent/cedilla
  for (const cand of candidates) {
    if (normPlain === normalizeText(cand, false)) {
      return {
        status: 'accent-warning',
        accepted: true,
        expected: cand,
        feedback: `Correto! Watch the accent: "${cand}"`,
      };
    }
  }

  // 3. Tiny single-character typo on words >= 5 chars
  for (const cand of candidates) {
    const candPlain = normalizeText(cand, false);
    if (candPlain.length >= 5 && levenshtein(normPlain, candPlain) === 1) {
      return {
        status: 'close',
        accepted: true,
        expected: cand,
        feedback: `Quase perfeito! Small typo — spelled "${cand}".`,
      };
    }
  }

  return {
    status: 'incorrect',
    accepted: false,
    expected: primaryExpected,
    feedback: `Expected "${primaryExpected}"`,
  };
}
