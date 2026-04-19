import { Types } from 'mongoose';
import { Session } from '../models/Session.js';
import { Contest } from '../models/Contest.js';
import { User } from '../models/User.js';

/**
 * Aggregate full dashboard data for a user
 */
export async function getDashboardData(userId: string) {
  const objectId = new Types.ObjectId(userId);

  const [sessions, user] = await Promise.all([
    Session.find({ userId: objectId }).sort({ startedAt: -1 }).lean(),
    User.findById(objectId).select('-passwordHash').lean(),
  ]);

  if (!user) throw new Error('User not found');

  // Metric cards
  const totalXP = user.xp;
  const completedSessions = sessions.filter((s) => s.completedAt);
  const avgScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((sum, s) => sum + (s.score / s.totalQuestions) * 100, 0) /
            completedSessions.length
        )
      : 0;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const studyTimeMs = completedSessions
    .filter((s) => s.completedAt && new Date(s.completedAt) > oneWeekAgo)
    .reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
  const studyTimeMin = Math.round(studyTimeMs / 60000);

  // Score over last 8 weeks (weekly buckets)
  const weeklyData: Array<{ week: string; score: number; sessions: number }> = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() - (i - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekSessions = completedSessions.filter((s) => {
      const d = new Date(s.completedAt!);
      return d >= start && d < end;
    });
    const weekAvg =
      weekSessions.length > 0
        ? Math.round(weekSessions.reduce((sum, s) => sum + (s.score / s.totalQuestions) * 100, 0) / weekSessions.length)
        : 0;
    weeklyData.push({
      week: start.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      score: weekAvg,
      sessions: weekSessions.length,
    });
  }

  // Activity heatmap (last 90 days)
  const heatmap: Record<string, number> = {};
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  for (const s of completedSessions) {
    if (s.completedAt && new Date(s.completedAt) > ninetyDaysAgo) {
      const day = new Date(s.completedAt).toISOString().split('T')[0];
      heatmap[day] = (heatmap[day] ?? 0) + 1;
    }
  }

  // Subject radar data
  const subjectMap: Record<string, { total: number; correct: number }> = {};
  for (const s of completedSessions) {
    if (!subjectMap[s.subject]) subjectMap[s.subject] = { total: 0, correct: 0 };
    subjectMap[s.subject].total += s.totalQuestions;
    subjectMap[s.subject].correct += s.score;
  }
  const radarData = Object.entries(subjectMap).map(([subject, { total, correct }]) => ({
    subject,
    mastery: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));

  // AI recommendations: subjects sorted by weakness
  const recommendations = radarData
    .filter((d) => d.mastery < 80)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5)
    .map((d) => ({
      subject: d.subject,
      masteryPct: d.mastery,
      urgency: d.mastery < 40 ? 'high' : d.mastery < 60 ? 'medium' : 'low',
    }));

  // Recent activity feed (last 20 items)
  const activityFeed = completedSessions.slice(0, 20).map((s) => ({
    type: 'session' as const,
    subject: s.subject,
    chapter: s.chapter,
    score: s.score,
    totalQuestions: s.totalQuestions,
    xpEarned: s.xpEarned,
    date: s.completedAt,
  }));

  return {
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      subjects: user.subjects,
      preferredLanguage: user.preferredLanguage,
    },
    metrics: {
      totalXP,
      avgScore,
      sessionsCompleted: completedSessions.length,
      studyTimeMin,
    },
    weeklyData,
    heatmap,
    radarData,
    recommendations,
    activityFeed,
  };
}

/**
 * Update user's streak based on today's activity
 */
export async function updateStreak(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastActive = user.streak.lastActiveDate ? new Date(user.streak.lastActiveDate) : null;

  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return; // Already counted today
    if (diffDays === 1) {
      user.streak.current += 1;
    } else {
      user.streak.current = 1; // Reset streak
    }
  } else {
    user.streak.current = 1;
  }

  user.streak.longest = Math.max(user.streak.longest, user.streak.current);
  user.streak.lastActiveDate = today;
  await user.save();
}
