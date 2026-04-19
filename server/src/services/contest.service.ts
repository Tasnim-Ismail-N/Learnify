import { Contest, IContest } from '../models/Contest.js';
import { User } from '../models/User.js';
import { generateQuestions } from './ai.service.js';
import { calcContestScore, generateContestCode } from '../utils/helpers.js';

/**
 * Create a new contest and pre-generate questions via AI
 */
export async function createContest(params: {
  creatorId: string;
  title: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  questionCount: number;
  durationMinutes: number;
  questionTypes: string[];
  maxParticipants: number;
  language: string;
}): Promise<IContest> {
  const { questions } = await generateQuestions({
    count: params.questionCount,
    difficulty: params.difficulty,
    chapter: params.subject,
    level: params.level,
    subject: params.subject,
    language: params.language,
    questionType: params.questionTypes[0] ?? 'multiple-choice',
  });

  let code = generateContestCode();
  while (await Contest.exists({ code })) {
    code = generateContestCode();
  }

  const creator = await User.findById(params.creatorId).select('username avatar').lean();

  const contest = await Contest.create({
    code,
    creatorId: params.creatorId,
    title: params.title,
    subject: params.subject,
    difficulty: params.difficulty,
    level: params.level,
    questionCount: params.questionCount,
    durationMinutes: params.durationMinutes,
    questionTypes: params.questionTypes,
    maxParticipants: params.maxParticipants,
    questions,
    status: 'pending',
    participants: creator
      ? [{ userId: params.creatorId, username: creator.username, avatar: creator.avatar, answers: [], score: 0, rank: 0 }]
      : [],
  });

  return contest;
}

/**
 * Compute and update final rankings after contest ends
 */
export async function finalizeContest(contestId: string): Promise<IContest | null> {
  const contest = await Contest.findById(contestId);
  if (!contest) return null;

  const timeLimitMs = contest.durationMinutes * 60 * 1000;

  for (const participant of contest.participants) {
    let score = 0;
    for (const answer of participant.answers) {
      score += calcContestScore(answer.isCorrect, answer.timeSpentMs, timeLimitMs);
    }
    participant.score = score;
  }

  contest.participants.sort((a, b) => b.score - a.score);
  contest.participants.forEach((p, i) => {
    p.rank = i + 1;
  });

  contest.status = 'finished';
  contest.finishedAt = new Date();
  await contest.save();

  return contest;
}

/**
 * Record a participant's answer during a live contest
 */
export async function recordContestAnswer(
  contestId: string,
  userId: string,
  questionIndex: number,
  selectedIndex: number,
  timeSpentMs: number
): Promise<{ isCorrect: boolean; score: number }> {
  const contest = await Contest.findById(contestId);
  if (!contest) throw new Error('Contest not found');

  const question = contest.questions[questionIndex];
  if (!question) throw new Error('Question not found');

  const isCorrect = question.correctIndex === selectedIndex;
  const timeLimitMs = contest.durationMinutes * 60 * 1000;
  const points = calcContestScore(isCorrect, timeSpentMs, timeLimitMs);

  const participant = contest.participants.find((p) => p.userId.toString() === userId);
  if (!participant) throw new Error('Participant not found');

  const existingAnswerIdx = participant.answers.findIndex((a) => a.questionIndex === questionIndex);
  const answerData = { questionIndex, selectedIndex, isCorrect, timeSpentMs };

  if (existingAnswerIdx >= 0) {
    participant.answers[existingAnswerIdx] = answerData;
  } else {
    participant.answers.push(answerData);
  }

  participant.score += points;
  await contest.save();

  return { isCorrect, score: points };
}
