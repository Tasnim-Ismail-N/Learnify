import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Star, RefreshCw, Lightbulb } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthStore } from '../../stores/authStore';
import { useContestStore } from '../../stores/contestStore';
import api from '../../lib/axios';

interface RankEntry { rank: number; username: string; score: number; correct: number; total: number }

export function ContestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { reset } = useContestStore();
  const confettiFired = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contest-results', id],
    queryFn: () => api.get(`/contests/${id}/results`).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (data?.myResult?.rank === 1 && !confettiFired.current) {
      confettiFired.current = true;
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.4 } });
    }
    return () => reset();
  }, [data]);

  const podiumColors = ['text-neon-amber', 'text-zinc-300', 'text-neon-amber'];
  const podiumSizes = ['text-5xl', 'text-4xl', 'text-3xl'];

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-2">
          <Trophy className="w-7 h-7 text-neon-amber" /> {t('contest.results.title')}
        </h1>

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : data ? (
          <>
            {/* Podium */}
            <Card>
              <h2 className="font-semibold text-zinc-200 mb-4">{t('contest.results.podium')}</h2>
              <div className="flex items-end justify-center gap-4">
                {[1, 0, 2].map((podiumIdx) => {
                  const entry: RankEntry = data.ranking[podiumIdx];
                  if (!entry) return null;
                  return (
                    <motion.div
                      key={entry.rank}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: podiumIdx * 0.15 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <Avatar username={entry.username} size={podiumIdx === 0 ? 'xl' : 'lg'} />
                      <p className="text-sm font-semibold text-zinc-200">{entry.username}</p>
                      <div className={`font-bold ${podiumSizes[podiumIdx]} ${podiumColors[podiumIdx]}`}>
                        #{entry.rank}
                      </div>
                      <p className="text-xs font-bold text-zinc-400">{entry.score} pts</p>
                    </motion.div>
                  );
                })}
              </div>
            </Card>

            {/* My result */}
            {data.myResult && (
              <Card className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-brand-400">{data.myResult.score}</p>
                  <p className="text-xs text-zinc-500">{t('contest.results.yourScore')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">#{data.myResult.rank}</p>
                  <p className="text-xs text-zinc-500">{t('contest.results.yourRank')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-neon-teal">{data.myResult.correct}/{data.contest?.questionCount}</p>
                  <p className="text-xs text-zinc-500">{t('contest.results.correct')}</p>
                </div>
              </Card>
            )}

            {/* AI Feedback */}
            {data.feedback && (
              <Card className="border-brand-800/40 bg-brand-900/10">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-zinc-200 mb-1">{t('contest.results.feedback')}</h3>
                    <p className="text-sm text-zinc-300">{data.feedback.message}</p>
                    {data.feedback.tip && (
                      <p className="mt-2 text-xs text-brand-300 bg-brand-900/30 rounded-lg px-3 py-2 border border-brand-800/40 flex items-start gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {data.feedback.tip}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Full ranking */}
            <Card>
              <h3 className="font-semibold text-zinc-200 mb-4">{t('contest.results.rankingTable')}</h3>
              <div className="space-y-1">
                {data.ranking.map((entry: RankEntry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${entry.username === user?.username ? 'bg-brand-900/20 border border-brand-800/40' : 'hover:bg-zinc-800/50'}`}
                  >
                    <span className="w-7 text-center font-bold text-zinc-500">#{entry.rank}</span>
                    <Avatar username={entry.username} size="sm" />
                    <span className="flex-1 font-medium text-zinc-200">{entry.username}</span>
                    <Badge variant="neutral">{entry.correct}/{entry.total}</Badge>
                    <span className="font-bold text-brand-300 text-sm">{entry.score}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => navigate('/contests')}>
                Back to contests
              </Button>
              <Button className="flex-1" icon={<RefreshCw className="w-4 h-4" />} onClick={() => navigate('/contests/new')}>
                {t('contest.results.rematch')}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </PageWrapper>
  );
}
