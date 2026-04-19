import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Flame } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/axios';

type Tab = 'global' | 'contests';

export function LeaderboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('global');

  const { data: globalData, isLoading: loadingGlobal } = useQuery({
    queryKey: ['leaderboard-global'],
    queryFn: () => api.get('/leaderboard/global').then((r) => r.data),
    enabled: tab === 'global',
  });

  const { data: contestData, isLoading: loadingContest } = useQuery({
    queryKey: ['leaderboard-contests'],
    queryFn: () => api.get('/leaderboard/contests').then((r) => r.data),
    enabled: tab === 'contests',
  });

  const isLoading = tab === 'global' ? loadingGlobal : loadingContest;
  const entries = tab === 'global' ? globalData : contestData;

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-neon-amber" /> {t('leaderboard.title')}
        </h1>

        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 w-fit">
          {(['global', 'contests'] as Tab[]).map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t_ ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {t(`leaderboard.${t_}`)}
            </button>
          ))}
        </div>

        <Card className="space-y-1">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : entries?.length ? (
            entries.map((entry: { rank?: number; userId: string; username: string; xp?: number; level?: string; streak?: number; wins?: number; participated?: number }, i: number) => {
              const rank = entry.rank ?? i + 1;
              const isMe = entry.username === user?.username;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isMe ? 'bg-brand-900/20 border border-brand-800/40' : 'hover:bg-zinc-800/50'}`}
                >
                  <div className={`w-8 text-center font-bold text-sm ${rank === 1 ? 'text-neon-amber text-lg' : rank === 2 ? 'text-zinc-300 text-base' : rank === 3 ? 'text-orange-400' : 'text-zinc-500'}`}>
                    {`#${rank}`}
                  </div>
                  <Avatar username={entry.username} size="sm" />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${isMe ? 'text-brand-300' : 'text-zinc-200'}`}>{entry.username}</p>
                    {entry.level && <Badge variant="neutral" className="mt-0.5">{t(`dashboard.level.${entry.level}`)}</Badge>}
                  </div>
                  <div className="text-right">
                    {tab === 'global' && (
                      <>
                        <p className="text-sm font-bold text-brand-400">{entry.xp} XP</p>
                        {entry.streak !== undefined && entry.streak > 0 && (
                          <p className="text-xs text-neon-amber flex items-center gap-0.5 justify-end">
                            <Flame className="w-3 h-3" />{entry.streak}
                          </p>
                        )}
                      </>
                    )}
                    {tab === 'contests' && (
                      <>
                        <p className="text-sm font-bold text-neon-amber">{entry.wins} wins</p>
                        <p className="text-xs text-zinc-500">{entry.participated} played</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-zinc-500 py-8">{t('common.noData')}</p>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
