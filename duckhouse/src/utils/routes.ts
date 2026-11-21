export type ParsedRoute =
  | { page: 'home' }
  | { page: 'lobby' }
  | { page: 'practice' }
  | { page: 'room'; roomCode: string };

const RAW_BASE = import.meta.env.BASE_URL || '/';
export const BASE_URL = RAW_BASE.endsWith('/') ? RAW_BASE : `${RAW_BASE}/`;
export const BASE_PREFIX = BASE_URL === '/' ? '' : BASE_URL.slice(0, -1);

export function assetUrl(relativePath: string): string {
  return `${BASE_URL}${relativePath.replace(/^\/+/, '')}`;
}

export function appPath(subpath: string): string {
  const clean = subpath.startsWith('/') ? subpath : `/${subpath}`;
  if (clean === '/') {
    return BASE_URL;
  }
  return `${BASE_PREFIX}${clean}`;
}

export function buildInviteUrl(roomCode: string): string {
  return `${window.location.origin}${appPath(`/room/${roomCode.trim().toUpperCase()}`)}`;
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
  // Gracefully support legacy hash links (e.g. #/room/ABC123) if someone uses an older link
  if (hash.startsWith('#/')) {
    return parseRelativePath(hash.slice(1));
  }

  let rel = pathname;
  if (BASE_PREFIX && rel.toLowerCase().startsWith(BASE_PREFIX.toLowerCase())) {
    rel = rel.slice(BASE_PREFIX.length);
  } else if (rel.toLowerCase().startsWith('/duckhouse')) {
    rel = rel.slice('/duckhouse'.length);
  }

  return parseRelativePath(rel);
}

function parseRelativePath(raw: string): ParsedRoute {
  const normalized = `/${raw.replace(/^\/+|\/+$/g, '')}`;
  const roomMatch = normalized.match(/^\/room\/([A-Za-z0-9]{4,10})$/i);
  if (roomMatch) {
    return { page: 'room', roomCode: roomMatch[1].toUpperCase() };
  }
  if (normalized.toLowerCase() === '/lobby') {
    return { page: 'lobby' };
  }
  if (normalized.toLowerCase() === '/practice') {
    return { page: 'practice' };
  }
  return { page: 'home' };
}
