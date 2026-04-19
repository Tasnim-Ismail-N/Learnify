import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, Zap, TrendingUp, Clock, Target, BookOpen, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton, CardSkeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useAuthStore } from '../../stores/authStore';
import { getXPToNextLevel, relativeTime, formatStudyTime } from '../../lib/utils';
import api from '../../lib/axios';
import { useNavigate } from 'react-router-dom';

type Tab = 'progress' | 'skills' | 'recommendations' | 'activity';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('progress');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/users/me/dashboard').then((r) => r.data),
  });

  const xpInfo = user ? getXPToNextLevel(user.xp) : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'progress', label: t('dashboard.tabs.progress') },
    { key: 'skills', label: t('dashboard.tabs.skills') },
    { key: 'recommendations', label: t('dashboard.tabs.recommendations') },
    { key: 'activity', label: t('dashboard.tabs.activity') },
  ];

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {user && <Avatar username={user.username} size="lg" />}
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">
                {t('dashboard.greeting', { name: user?.username })}
              </h1>
              {user && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="brand">{t(`dashboard.level.${user.level}`)}</Badge>
                  {user.streak.current > 0 && (
                    <Badge variant="warning">
                      <Flame className="w-3 h-3" />
                      {t('dashboard.streak.current', { days: user.streak.current })}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* XP bar */}
          {xpInfo && user && (
            <div className="hidden md:block w-56">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>{user.xp} XP</span>
                <span className="flex items-center gap-1">{xpInfo.pct < 100 ? t('dashboard.level.nextLevel', { xp: xpInfo.needed - xpInfo.current }) : <><Trophy className="w-3 h-3 text-neon-amber" /> Max level</>}</span>
              </div>
              <ProgressBar value={xpInfo.pct} color="brand" />
            </div>
          )}
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            [
              { icon: Zap, label: t('dashboard.metrics.xp'), value: data?.metrics.totalXP ?? 0, color: 'text-brand-400', suffix: ' XP' },
              { icon: Target, label: t('dashboard.metrics.score'), value: `${data?.metrics.avgScore ?? 0}%`, color: 'text-neon-teal', suffix: '' },
              { icon: BookOpen, label: t('dashboard.metrics.sessions'), value: data?.metrics.sessionsCompleted ?? 0, color: 'text-neon-amber', suffix: '' },
              { icon: Clock, label: t('dashboard.metrics.studyTime'), value: formatStudyTime(data?.metrics.studyTimeMin ?? 0), color: 'text-zinc-400', suffix: '' },
            ].map(({ icon: Icon, label, value, color, suffix }) => (
              <motion.div
                key={label}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Card className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                    <Icon className={`w-4 h-4 ${color}`} />
                    {label}
                  </div>
                  <p className="text-2xl font-bold text-zinc-100">{value}{suffix}</p>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 w-fit">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {tab === 'progress' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 space-y-4">
                <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-400" />
                  {t('dashboard.chart.weeklyScore')}
                </h3>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data?.weeklyData ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#f4f4f5' }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#7F77DD" strokeWidth={2} dot={{ fill: '#7F77DD', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="space-y-3">
                <h3 className="font-semibold text-zinc-200 flex items-center gap-2"><Flame className="w-4 h-4 text-neon-amber" /> Streak</h3>
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <div className="text-center space-y-2">
                    <div className="text-5xl font-bold text-neon-amber">{data?.user.streak.current ?? 0}</div>
                    <p className="text-zinc-400 text-sm">{t('dashboard.streak.current', { days: data?.user.streak.current ?? 0 })}</p>
                    <p className="text-xs text-zinc-600">{t('dashboard.streak.longest', { days: data?.user.streak.longest ?? 0 })}</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'skills' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="space-y-4">
                <h3 className="font-semibold text-zinc-200">{t('dashboard.tabs.skills')}</h3>
                {isLoading ? (
                  <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : data?.radarData?.length ? (
                  data.radarData.map(({ subject, mastery }: { subject: string; mastery: number }) => (
                    <div key={subject} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-300 font-medium">{subject}</span>
                        <Badge variant={mastery >= 80 ? 'success' : mastery >= 50 ? 'warning' : 'danger'}>
                          {mastery >= 80 ? t('dashboard.skills.mastered') : mastery >= 50 ? t('dashboard.skills.inProgress') : t('dashboard.skills.needsWork')}
                        </Badge>
                      </div>
                      <ProgressBar value={mastery} color={mastery >= 80 ? 'teal' : mastery >= 50 ? 'amber' : 'red'} showPct />
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500 text-sm">{t('dashboard.skills.noSkills')}</p>
                )}
              </Card>

              <Card className="space-y-4">
                <h3 className="font-semibold text-zinc-200">Radar</h3>
                {data?.radarData?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={data.radarData}>
                      <PolarGrid stroke="#3f3f46" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 11 }} />
                      <Radar name="Mastery" dataKey="mastery" stroke="#7F77DD" fill="#7F77DD" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-48 w-full" />
                )}
              </Card>
            </div>
          )}

          {tab === 'recommendations' && (
            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold text-zinc-200 mb-4">{t('dashboard.recommendations.title')}</h3>
                {isLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : data?.recommendations?.length ? (
                  <div className="space-y-3">
                    {data.recommendations.map(({ subject, masteryPct, urgency }: { subject: string; masteryPct: number; urgency: string }) => (
                      <div key={subject} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-200">{subject}</span>
                            <Badge variant={urgency === 'high' ? 'danger' : urgency === 'medium' ? 'warning' : 'neutral'}>
                              {t(`dashboard.recommendations.urgency.${urgency}`)}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500">{masteryPct}% mastery</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate('/learn', { state: { subject } })}
                        >
                          {t('dashboard.recommendations.launchSession')}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">{t('dashboard.recommendations.noRecommendations')}</p>
                )}
              </Card>
            </div>
          )}

          {tab === 'activity' && (
            <Card>
              <h3 className="font-semibold text-zinc-200 mb-4">{t('dashboard.tabs.activity')}</h3>
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : data?.activityFeed?.length ? (
                <div className="space-y-2">
                  {data.activityFeed.map((item: { subject: string; chapter: string; score: number; totalQuestions: number; xpEarned: number; date: string }, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{item.subject} — {item.chapter}</p>
                        <p className="text-xs text-zinc-500">{relativeTime(item.date, i18n.language)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neon-teal font-semibold">+{item.xpEarned} XP</p>
                        <p className="text-xs text-zinc-500">{item.score}/{item.totalQuestions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">{t('dashboard.activity.noActivity')}</p>
              )}
            </Card>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
