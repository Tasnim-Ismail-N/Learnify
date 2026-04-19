import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { Contest } from '../models/Contest.js';
import { User } from '../models/User.js';
import { createContest, finalizeContest } from '../services/contest.service.js';
import { generateContestFeedback } from '../services/ai.service.js';

const router = Router();
router.use(authenticate);

const createContestSchema = z.object({
  title: z.string().min(1).max(100),
  subject: z.string().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  questionCount: z.number().int().min(3).max(30).default(10),
  durationMinutes: z.number().int().min(1).max(120).default(15),
  questionTypes: z.array(z.string()).default(['multiple-choice']),
  maxParticipants: z.number().int().min(2).max(100).default(20),
});

router.post('/', aiRateLimiter, validate(createContestSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.body as z.infer<typeof createContestSchema>;
    const user = await User.findById(req.userId).select('preferredLanguage').lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const contest = await createContest({
      ...params,
      creatorId: req.userId!,
      language: user.preferredLanguage,
    });

    res.status(201).json(contest);
  } catch (err) {
    next(err);
  }
});

router.get('/:code', async (req: AuthRequest, res: Response) => {
  const code = String(req.params.code);
  const contest = await Contest.findOne({ code: code.toUpperCase() })
    .select('-questions')
    .lean();
  if (!contest) {
    res.status(404).json({ error: 'Contest not found' });
    return;
  }
  res.json(contest);
});

router.post('/:code/join', async (req: AuthRequest, res: Response) => {
  const joinCode = String(req.params.code);
  const contest = await Contest.findOne({ code: joinCode.toUpperCase() });
  if (!contest) {
    res.status(404).json({ error: 'Contest not found' });
    return;
  }
  if (contest.status !== 'pending') {
    res.status(400).json({ error: 'Contest already started or finished' });
    return;
  }
  if (contest.participants.length >= contest.maxParticipants) {
    res.status(400).json({ error: 'Contest is full' });
    return;
  }

  const alreadyJoined = contest.participants.some((p) => p.userId.toString() === req.userId);
  if (alreadyJoined) {
    res.json(contest);
    return;
  }

  const user = await User.findById(req.userId).select('username avatar').lean();
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  contest.participants.push({
    userId: user._id,
    username: user.username,
    avatar: user.avatar,
    answers: [],
    score: 0,
    rank: 0,
  });

  await contest.save();
  res.json(contest);
});

router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) {
    res.status(404).json({ error: 'Contest not found' });
    return;
  }
  if (contest.creatorId.toString() !== req.userId) {
    res.status(403).json({ error: 'Only the creator can start the contest' });
    return;
  }
  if (contest.status !== 'pending') {
    res.status(400).json({ error: 'Contest already started' });
    return;
  }

  contest.status = 'active';
  contest.startedAt = new Date();
  await contest.save();

  res.json({ message: 'Contest started', startedAt: contest.startedAt });
});

router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  const { answers } = req.body as {
    answers: Array<{ questionIndex: number; selectedIndex: number; timeSpentMs: number }>;
  };

  const contest = await Contest.findById(req.params.id);
  if (!contest) {
    res.status(404).json({ error: 'Contest not found' });
    return;
  }
  if (contest.status !== 'active') {
    res.status(400).json({ error: 'Contest is not active' });
    return;
  }

  const participant = contest.participants.find((p) => p.userId.toString() === req.userId);
  if (!participant) {
    res.status(400).json({ error: 'Not a participant' });
    return;
  }

  const timeLimitMs = contest.durationMinutes * 60 * 1000;
  let score = 0;
  const gradedAnswers = answers.map((a) => {
    const question = contest.questions[a.questionIndex];
    const isCorrect = question?.correctIndex === a.selectedIndex;
    if (isCorrect) {
      const timeBonus = Math.floor(((timeLimitMs - a.timeSpentMs) / timeLimitMs) * 10);
      score += 20 + Math.max(0, timeBonus);
    }
    return { ...a, isCorrect };
  });

  participant.answers = gradedAnswers;
  participant.score = score;
  participant.submittedAt = new Date();
  await contest.save();

  res.json({ score, totalQuestions: contest.questionCount });
});

router.get('/:id/results', async (req: AuthRequest, res: Response) => {
  const contest = await Contest.findById(req.params.id).lean();
  if (!contest) {
    res.status(404).json({ error: 'Contest not found' });
    return;
  }

  const myParticipant = contest.participants.find((p) => p.userId.toString() === req.userId);
  const user = await User.findById(req.userId).select('preferredLanguage').lean();

  let feedback = null;
  if (myParticipant && contest.status === 'finished' && user) {
    const wrongAnswerIndices = myParticipant.answers
      .filter((a) => !a.isCorrect)
      .map((a) => a.questionIndex);
    const weakTopics = wrongAnswerIndices
      .map((i) => contest.questions[i]?.text?.slice(0, 40) ?? '')
      .filter(Boolean)
      .slice(0, 3);

    feedback = await generateContestFeedback({
      username: myParticipant.username,
      score: myParticipant.score,
      total: contest.questionCount,
      rank: myParticipant.rank,
      totalParticipants: contest.participants.length,
      weakTopics,
      language: user.preferredLanguage,
    });
  }

  const ranking = contest.participants
    .map((p) => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      rank: p.rank,
      correct: p.answers.filter((a) => a.isCorrect).length,
      total: contest.questionCount,
    }))
    .sort((a, b) => a.rank - b.rank);

  const correctAnswers = contest.status === 'finished'
    ? contest.questions.map((q, i) => ({
        index: i,
        text: q.text,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      }))
    : [];

  res.json({
    contest: {
      _id: contest._id,
      title: contest.title,
      subject: contest.subject,
      status: contest.status,
      durationMinutes: contest.durationMinutes,
    },
    ranking,
    myResult: myParticipant
      ? {
          score: myParticipant.score,
          rank: myParticipant.rank,
          correct: myParticipant.answers.filter((a) => a.isCorrect).length,
          answers: myParticipant.answers,
        }
      : null,
    correctAnswers,
    feedback,
  });
});

export default router;
