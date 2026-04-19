import crypto from 'crypto';

/** Generate a unique contest join code like LRN-7X4K */
export function generateContestCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'LRN-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Compute XP required for a given level */
export function getLevel(xp: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (xp >= 1200) return 'expert';
  if (xp >= 600) return 'advanced';
  if (xp >= 200) return 'intermediate';
  return 'beginner';
}

/** Contest scoring formula */
export function calcContestScore(isCorrect: boolean, timeSpentMs: number, timeLimitMs: number): number {
  if (!isCorrect) return 0;
  const base = 20;
  const timeBonus = Math.floor(((timeLimitMs - timeSpentMs) / timeLimitMs) * 10);
  return base + Math.max(0, timeBonus);
}

/** Session XP formula */
export function calcSessionXP(answers: { isCorrect: boolean }[]): number {
  let xp = 0;
  let streak = 0;
  for (const a of answers) {
    if (a.isCorrect) {
      xp += 10;
      streak++;
      if (streak >= 3) xp += 5;
    } else {
      streak = 0;
    }
  }
  return xp;
}

/** Hash a string to a stable hex colour for avatars */
export function hashToColor(str: string): string {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `#${hash.slice(0, 6)}`;
}

/** Strip passwordHash from any user object */
export function sanitizeUser<T extends { passwordHash?: string }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _, ...rest } = user;
  return rest;
}
