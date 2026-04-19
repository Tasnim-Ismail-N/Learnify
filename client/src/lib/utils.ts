export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

type AxiosLikeError = { response?: { status?: number; data?: { error?: string } } };

/**
 * Extracts a user-friendly error message from an API error.
 * Handles 429 rate-limit, validation errors, and generic server errors.
 */
export function getApiError(err: unknown, fallback: string): string {
  const e = err as AxiosLikeError;
  if (e?.response?.status === 429) return fallback; // caller should pass t('errors.rateLimit')
  return e?.response?.data?.error ?? fallback;
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatStudyTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function hashToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
}

export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function getLevel(xp: number): string {
  if (xp >= 1200) return 'expert';
  if (xp >= 600) return 'advanced';
  if (xp >= 200) return 'intermediate';
  return 'beginner';
}

export function getXPToNextLevel(xp: number): { current: number; needed: number; pct: number } {
  const thresholds = [0, 200, 600, 1200];
  const labels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const idx = labels.indexOf(getLevel(xp));
  if (idx === labels.length - 1) return { current: xp - thresholds[idx], needed: 0, pct: 100 };
  const current = xp - thresholds[idx];
  const needed = thresholds[idx + 1] - thresholds[idx];
  return { current, needed, pct: Math.round((current / needed) * 100) };
}

export function relativeTime(date: string | Date, lang: string = 'en'): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (diffMin < 1) return rtf.format(0, 'minute');
  if (diffH < 1) return rtf.format(-diffMin, 'minute');
  if (diffD < 1) return rtf.format(-diffH, 'hour');
  return rtf.format(-diffD, 'day');
}
