export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const damp = (
  current: number,
  target: number,
  lambda: number,
  dt: number
) => lerp(current, target, 1 - Math.exp(-lambda * dt));

export const clamp01 = (v: number) => clamp(v, 0, 1);

export const normalizeHexColor = (value: string): string | null => {
  const raw = value.trim();
  if (!raw) return null;
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return hex.toLowerCase();
};

export const parseNum = (value: string | null): number | null => {
  if (value == null) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

export const safeParseJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

// URL-safe base64 helpers
export const toBase64Url = (text: string): string => {
  const b64 = btoa(unescape(encodeURIComponent(text)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const fromBase64Url = (text: string): string | null => {
  try {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const b64 = padded + '='.repeat(padLen);
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return null;
  }
};

export const createPresetId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return String(Date.now());
};
export const isMobilePanel = () =>
  window.matchMedia('(max-width: 980px)').matches;

/**
 * Resolves an asset URL by prepending the base URL if needed.
 * This handles deployment to subdirectories (e.g. GitHub Pages).
 * Safe to call on paths that are already resolved.
 */
export const resolveAssetUrl = (path: string): string => {
  if (!path || path.match(/^[a-z]+:/i)) return path;

  const base = import.meta.env.BASE_URL;
  // If base is root, just return the path (assuming it points to root)
  if (!base || base === '/') {
    return path;
  }

  // Normalize base to ensure trailing slash
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  // Normalize path to ensure leading slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If the path already includes the base, return it as-is to avoid double-prefixing.
  // e.g. path is "/repo/models/foo.glb" and base is "/repo/"
  if (cleanPath.startsWith(cleanBase)) {
    return cleanPath;
  }

  // Prepend base
  return `${cleanBase}${cleanPath.slice(1)}`;
};
