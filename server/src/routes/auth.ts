import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { getLevel, hashToColor } from '../utils/helpers.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(100),
  preferredLanguage: z.enum(['fr', 'en']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', authRateLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  const { email, username, password, preferredLanguage } = req.body as z.infer<typeof registerSchema>;

  const existing = await User.findOne({ $or: [{ email }, { username }] }).lean();
  if (existing) {
    res.status(409).json({ error: existing.email === email ? 'Email already in use' : 'Username already taken' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const avatar = username.slice(0, 2).toUpperCase();
  const avatarColor = hashToColor(username);

  const user = await User.create({
    email,
    username,
    passwordHash,
    avatar,
    preferredLanguage: preferredLanguage ?? 'fr',
  });

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), email);
  await User.findByIdAndUpdate(user._id, { refreshToken });

  res.status(201).json({
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      email: user.email,
      username: user.username,
      avatar,
      avatarColor,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      preferredLanguage: user.preferredLanguage,
    },
  });
});

router.post('/login', authRateLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email }).select('+passwordHash +refreshToken');
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), email);
  await User.findByIdAndUpdate(user._id, { refreshToken });

  res.json({
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      avatarColor: hashToColor(user.username),
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      preferredLanguage: user.preferredLanguage,
    },
  });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const tokens = generateTokens(user._id.toString(), user.email);
    await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await User.findByIdAndUpdate(payload.userId, { refreshToken: null });
    } catch {
      // Token already invalid, that's fine
    }
  }
  res.json({ message: 'Logged out' });
});

export default router;
