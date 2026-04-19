import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Contest } from '../models/Contest.js';

const router = Router();
router.use(authenticate);

router.get('/global', async (_req: AuthRequest, res: Response) => {
  const users = await User.find()
    .select('username avatar xp level streak')
    .sort({ xp: -1 })
    .limit(50)
    .lean();

  res.json(
    users.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      username: u.username,
      avatar: u.avatar,
      xp: u.xp,
      level: u.level,
      streak: u.streak.current,
    }))
  );
});

router.get('/contests', async (_req: AuthRequest, res: Response) => {
  const contests = await Contest.find({ status: 'finished' })
    .select('participants title subject createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const participantStats: Record<string, { username: string; wins: number; participated: number }> = {};

  for (const contest of contests) {
    for (const p of contest.participants) {
      const id = p.userId.toString();
      if (!participantStats[id]) {
        participantStats[id] = { username: p.username, wins: 0, participated: 0 };
      }
      participantStats[id].participated++;
      if (p.rank === 1) participantStats[id].wins++;
    }
  }

  const sorted = Object.entries(participantStats)
    .map(([userId, stats]) => ({ userId, ...stats }))
    .sort((a, b) => b.wins - a.wins || b.participated - a.participated)
    .slice(0, 20);

  res.json(sorted);
});

export default router;
