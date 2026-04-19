import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getDashboardData } from '../services/analytics.service.js';
import { getLevel } from '../utils/helpers.js';

const router = Router();
router.use(authenticate);

const updateMeSchema = z.object({
  username: z.string().min(2).max(30).optional(),
  preferredLanguage: z.enum(['fr', 'en']).optional(),
  bio: z.string().max(200).optional(),
});

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash -refreshToken').lean();
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

router.patch('/me', validate(updateMeSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updates = req.body as z.infer<typeof updateMeSchema>;
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true })
      .select('-passwordHash -refreshToken').lean();
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

router.get('/me/dashboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboardData(req.userId!);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/me/activity', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      Session.find({ userId: req.userId, completedAt: { $exists: true } })
        .sort({ completedAt: -1 }).skip(skip).limit(limit).lean(),
      Session.countDocuments({ userId: req.userId, completedAt: { $exists: true } }),
    ]);
    res.json({ sessions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

export default router;
