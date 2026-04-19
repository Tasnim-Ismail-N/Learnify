import { Namespace, Socket } from 'socket.io';
import { Contest } from '../models/Contest.js';
import { finalizeContest, recordContestAnswer } from '../services/contest.service.js';
import { logger } from '../utils/logger.js';

const contestTimers = new Map<string, NodeJS.Timeout>();

export function registerContestHandlers(io: Namespace, socket: Socket): void {
  socket.on('join-lobby', async ({ contestId, userId }: { contestId: string; userId: string }) => {
    try {
      const contest = await Contest.findById(contestId).lean();
      if (!contest) return;

      const room = `contest:${contestId}`;
      await socket.join(room);
      socket.data.contestId = contestId;
      socket.data.userId = userId;

      io.to(room).emit('participant-joined', { participants: contest.participants });
      logger.debug(`User ${userId} joined lobby ${contestId}`);
    } catch (err) {
      logger.error('join-lobby error:', err);
    }
  });

  socket.on('leave-lobby', async ({ contestId, userId }: { contestId: string; userId: string }) => {
    const room = `contest:${contestId}`;
    await socket.leave(room);
    const contest = await Contest.findById(contestId).lean();
    if (contest) {
      io.to(room).emit('participant-left', { participants: contest.participants });
    }
  });

  socket.on('start-contest', async ({ contestId, userId }: { contestId: string; userId: string }) => {
    try {
      const contest = await Contest.findById(contestId);
      if (!contest) return;
      if (contest.creatorId.toString() !== userId) return;
      if (contest.status !== 'pending') return;

      contest.status = 'active';
      contest.startedAt = new Date();
      await contest.save();

      const room = `contest:${contestId}`;
      const durationMs = contest.durationMinutes * 60 * 1000;

      io.to(room).emit('contest-started', {
        questions: contest.questions,
        startedAt: contest.startedAt,
        durationMs,
      });

      // Auto-end after duration
      const timer = setTimeout(async () => {
        const finalized = await finalizeContest(contestId);
        if (finalized) {
          const finalRanking = finalized.participants.map((p) => ({
            userId: p.userId,
            username: p.username,
            score: p.score,
            rank: p.rank,
          }));
          io.to(room).emit('contest-ended', {
            finalRanking,
            correctAnswers: finalized.questions,
          });
        }
        contestTimers.delete(contestId);
      }, durationMs);

      contestTimers.set(contestId, timer);
      logger.info(`Contest ${contestId} started, duration: ${contest.durationMinutes}m`);
    } catch (err) {
      logger.error('start-contest error:', err);
    }
  });

  socket.on(
    'submit-answer',
    async ({
      contestId,
      userId,
      questionIndex,
      selectedIndex,
      timeSpentMs,
    }: {
      contestId: string;
      userId: string;
      questionIndex: number;
      selectedIndex: number;
      timeSpentMs: number;
    }) => {
      try {
        await recordContestAnswer(contestId, userId, questionIndex, selectedIndex, timeSpentMs);

        const contest = await Contest.findById(contestId).lean();
        if (!contest) return;

        const room = `contest:${contestId}`;
        const leaderboard = contest.participants
          .map((p) => ({
            userId: p.userId,
            username: p.username,
            score: p.score,
            answeredCount: p.answers.length,
          }))
          .sort((a, b) => b.score - a.score);

        io.to(room).emit('leaderboard-update', { ranking: leaderboard });
      } catch (err) {
        logger.error('submit-answer error:', err);
      }
    }
  );

  socket.on('finish-contest', async ({ contestId, userId }: { contestId: string; userId: string }) => {
    try {
      const contest = await Contest.findById(contestId);
      if (!contest) return;

      const participant = contest.participants.find((p) => p.userId.toString() === userId);
      if (participant) {
        participant.submittedAt = new Date();
        await contest.save();
      }

      const room = `contest:${contestId}`;
      io.to(room).emit('participant-finished', {
        userId,
        score: participant?.score ?? 0,
        rank: participant?.rank ?? 0,
      });

      // Check if all participants finished
      const allDone = contest.participants.every((p) => p.submittedAt);
      if (allDone) {
        const timer = contestTimers.get(contestId);
        if (timer) {
          clearTimeout(timer);
          contestTimers.delete(contestId);
        }

        const finalized = await finalizeContest(contestId);
        if (finalized) {
          io.to(room).emit('contest-ended', {
            finalRanking: finalized.participants.map((p) => ({
              userId: p.userId,
              username: p.username,
              score: p.score,
              rank: p.rank,
            })),
            correctAnswers: finalized.questions,
          });
        }
      }
    } catch (err) {
      logger.error('finish-contest error:', err);
    }
  });

  socket.on('disconnect', async () => {
    const { contestId, userId } = socket.data;
    if (contestId && userId) {
      const room = `contest:${contestId}`;
      const contest = await Contest.findById(contestId).lean();
      if (contest && contest.status === 'pending') {
        io.to(room).emit('participant-left', { participants: contest.participants });
      }
    }
  });
}
