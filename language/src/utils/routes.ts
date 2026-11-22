import { UNITS, type UnitId } from '../data/curriculum';

export type AppPage = 'home' | 'lesson' | 'flashcards' | 'verbs' | 'conversations' | 'guide';

export type ParsedRoute =
  | { page: 'home' }
  | { page: 'lesson'; unitId: UnitId }
  | { page: 'flashcards'; unitId?: UnitId }
  | { page: 'verbs' }
  | { page: 'conversations'; scenarioId?: string }
  | { page: 'guide' };

const RAW_BASE = import.meta.env.BASE_URL || '/';
export const BASE_URL = RAW_BASE.endsWith('/') ? RAW_BASE : `${RAW_BASE}/`;
export const BASE_PREFIX = BASE_URL === '/' ? '' : BASE_URL.slice(0, -1);

const VALID_UNIT_IDS = new Set<string>(UNITS.map((u) => u.id));

export function isValidUnitId(value: string | undefined): value is UnitId {
  return !!value && VALID_UNIT_IDS.has(value);
}

export function appPath(subpath: string): string {
  const clean = subpath.startsWith('/') ? subpath : `/${subpath}`;
  if (clean === '/') {
    return BASE_URL;
  }
  return `${BASE_PREFIX}${clean}`;
}

export function navigatePath(subpath: string, replace = false): void {
  const target = appPath(subpath);
  if (window.location.pathname === target && !window.location.hash) return;
  if (replace) {
    window.history.replaceState(null, '', target);
  } else {
    window.history.pushState(null, '', target);
  }
}

export function parseRoute(pathname: string, hash = ''): ParsedRoute {
  if (hash.startsWith('#/')) {
    return parseRelativePath(hash.slice(1));
  }

  let rel = pathname;
  if (BASE_PREFIX && rel.toLowerCase().startsWith(BASE_PREFIX.toLowerCase())) {
    rel = rel.slice(BASE_PREFIX.length);
  } else if (rel.toLowerCase().startsWith('/language')) {
    rel = rel.slice('/language'.length);
  }

  return parseRelativePath(rel);
}

function parseRelativePath(raw: string): ParsedRoute {
  const normalized = `/${raw.replace(/^\/+|\/+$/g, '')}`;
  const lower = normalized.toLowerCase();

  const lessonMatch = lower.match(/^\/lesson\/([a-z0-9-]+)$/);
  if (lessonMatch && isValidUnitId(lessonMatch[1])) {
    return { page: 'lesson', unitId: lessonMatch[1] };
  }
  if (lower === '/lesson') {
    return { page: 'lesson', unitId: 'greetings' };
  }
  if (lower === '/flashcards') {
    return { page: 'flashcards' };
  }
  if (lower === '/verbs') {
    return { page: 'verbs' };
  }
  if (lower === '/conversations') {
    return { page: 'conversations' };
  }
  if (lower === '/guide') {
    return { page: 'guide' };
  }
  return { page: 'home' };
}
