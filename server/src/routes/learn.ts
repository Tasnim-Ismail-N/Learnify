import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { Session } from '../models/Session.js';
import { Diagnostic } from '../models/Diagnostic.js';
import { User } from '../models/User.js';
import {
  generateQuestions,
  generateLesson,
  generateDiagnosticQuestions,
  analyzeDiagnostic,
  streamTutorResponse,
} from '../services/ai.service.js';
import { calcSessionXP, getLevel } from '../utils/helpers.js';
import { updateStreak } from '../services/analytics.service.js';

const router = Router();
router.use(authenticate);

const generateSessionSchema = z.object({
  subject: z.string().min(1).max(100),
  chapter: z.string().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.coerce.number().int().min(3).max(20).default(10),
});

const submitSessionSchema = z.object({
  answers: z.array(
    z.object({
      questionIndex: z.number().int().min(0),
      selectedIndex: z.number().int().min(0).max(3),
      timeSpentMs: z.number().int().min(0).default(0),
    })
  ),
});

const diagnosticStartSchema = z.object({
  subject: z.string().min(1).max(100),
});

const diagnosticSubmitSchema = z.object({
  subject: z.string().min(1).max(100),
  responses: z.array(
    z.object({
      questionId: z.string(),
      questionText: z.string(),
      difficulty: z.string(),
      selectedIndex: z.number().int().min(0).max(3),
      correctIndex: z.number().int().min(0).max(3),
    })
  ),
});

const chatSchema = z.object({
  subject: z.string().min(1).max(100),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(2000),
    })
  ),
});

router.post('/session/generate', aiRateLimiter, validate(generateSessionSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subject, chapter, difficulty, questionCount } = req.body as z.infer<typeof generateSessionSchema>;
    const user = await User.findById(req.userId).select('level preferredLanguage').lean();
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const [{ questions }, lesson] = await Promise.all([
      generateQuestions({ count: questionCount, difficulty, chapter, level: user.level, subject, language: user.preferredLanguage }),
      generateLesson({ chapter, subject, level: user.level, language: user.preferredLanguage }),
    ]);

    const session = await Session.create({
      userId: req.userId, subject, chapter, difficulty,
      questions: questions.map((q) => ({ ...q, aiGenerated: true })),
      answers: [], score: 0, totalQuestions: questions.length, startedAt: new Date(),
    });

    res.status(201).json({ session, lesson });
  } catch (err) { next(err); }
});

router.post('/session/:id/submit', validate(submitSessionSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.completedAt) { res.status(400).json({ error: 'Session already submitted' }); return; }

    const { answers } = req.body as z.infer<typeof submitSessionSchema>;
    const now = new Date();
    const gradedAnswers = answers.map((a) => ({
      ...a,
      isCorrect: session.questions[a.questionIndex]?.correctIndex === a.selectedIndex,
    }));
    const score = gradedAnswers.filter((a) => a.isCorrect).length;
    const xpEarned = calcSessionXP(gradedAnswers);

    session.answers = gradedAnswers;
    session.score = score;
    session.xpEarned = xpEarned;
    session.completedAt = now;
    session.durationMs = now.getTime() - session.startedAt.getTime();
    await session.save();

    const user = await User.findById(req.userId);
    if (user) {
      user.xp += xpEarned;
      user.level = getLevel(user.xp);
      const subjectIdx = user.subjects.findIndex((s) => s.name === session.subject);
      const mastery = Math.round((score / session.totalQuestions) * 100);
      if (subjectIdx >= 0) {
        user.subjects[subjectIdx].masteryPct = Math.round((user.subjects[subjectIdx].masteryPct + mastery) / 2);
      } else {
        user.subjects.push({ name: session.subject, masteryPct: mastery });
      }
      await user.save();
      await updateStreak(req.userId!);
    }

    res.json({ session, xpEarned, score, totalQuestions: session.totalQuestions,
      correctAnswers: gradedAnswers.map((a) => ({ ...a, explanation: session.questions[a.questionIndex]?.explanation })),
    });
  } catch (err) { next(err); }
});

router.post('/diagnostic/start', aiRateLimiter, validate(diagnosticStartSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subject } = req.body as z.infer<typeof diagnosticStartSchema>;
    const user = await User.findById(req.userId).select('preferredLanguage').lean();
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { questions } = await generateDiagnosticQuestions({ subject, count: 10, language: user.preferredLanguage });
    res.json({ questions });
  } catch (err) { next(err); }
});

router.post('/diagnostic/submit', validate(diagnosticSubmitSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subject, responses } = req.body as z.infer<typeof diagnosticSubmitSchema>;
    const user = await User.findById(req.userId).select('preferredLanguage username').lean();
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const gradedResponses = responses.map((r) => ({
      questionId: r.questionId, questionText: r.questionText, difficulty: r.difficulty,
      isCorrect: r.correctIndex === r.selectedIndex,
    }));

    const analysis = await analyzeDiagnostic({ subject, responses: gradedResponses, language: user.preferredLanguage });
    const diagnostic = await Diagnostic.create({
      userId: req.userId, subject,
      responses: gradedResponses.map(({ questionId, isCorrect }) => ({ questionId, isCorrect })),
      competencyProfile: { strengths: analysis.strengths, weaknesses: analysis.weaknesses },
      recommendedLevel: analysis.recommendedLevel,
      completedAt: new Date(),
    });
    await User.findByIdAndUpdate(req.userId, { level: analysis.recommendedLevel });
    res.json({ diagnostic, analysis });
  } catch (err) { next(err); }
});

router.post('/chat', aiRateLimiter, validate(chatSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subject, messages } = req.body as z.infer<typeof chatSchema>;
    const user = await User.findById(req.userId).select('username level preferredLanguage').lean();
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await streamTutorResponse(
      { name: user.username, level: user.level, language: user.preferredLanguage, subject },
      messages,
      (text) => res.write(`data: ${JSON.stringify({ text })}\n\n`),
      () => { res.write(`data: ${JSON.stringify({ done: true })}\n\n`); res.end(); }
    );
  } catch (err) { next(err); }
});

export default router;
