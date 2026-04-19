import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, Wifi, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthStore } from '../../stores/authStore';
import { useContestStore } from '../../stores/contestStore';
import { getSocket, connectSocket } from '../../lib/socket';
import api from '../../lib/axios';

interface Participant {
  userId: string;
  username: string;
  avatar: string;
}

interface ContestInfo {
  _id: string;
  code: string;
  title: string;
  subject: string;
  difficulty: string;
  questionCount: number;
  durationMinutes: number;
  status: string;
  creatorId: string;
  participants: Participant[];
}

export function ContestLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setContest } = useContestStore();

  const [contest, setContestInfo] = useState<ContestInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchContest = async () => {
      try {
        const res = await api.get(`/contests/${code}`);
        setContestInfo(res.data);
        setParticipants(res.data.participants);
      } catch {
        toast.error(t('errors.generic'));
        navigate('/contests');
      } finally {
        setLoading(false);
      }
    };
    fetchContest();
  }, [code]);

  useEffect(() => {
    if (!contest || !user) return;
    const socket = getSocket();
    connectSocket();

    socket.emit('join-lobby', { contestId: contest._id, userId: user._id });

    socket.on('participant-joined', ({ participants: p }: { participants: Participant[] }) => setParticipants(p));
    socket.on('participant-left', ({ participants: p }: { participants: Participant[] }) => setParticipants(p));

    socket.on('contest-started', ({ questions, startedAt, durationMs }: { questions: unknown[]; startedAt: string; durationMs: number }) => {
      setContest(contest._id, questions as Parameters<typeof setContest>[1], new Date(startedAt), durationMs);
      navigate(`/contests/${code}/arena`);
    });

    return () => {
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('contest-started');
      socket.emit('leave-lobby', { contestId: contest._id, userId: user._id });
    };
  }, [contest, user]);

  const handleStart = async () => {
    if (!contest || !user) return;
    setStarting(true);
    try {
      const socket = getSocket();
      socket.emit('start-contest', { contestId: contest._id, userId: user._id });
      await api.post(`/contests/${contest._id}/start`);
    } catch {
      toast.error(t('errors.generic'));
      setStarting(false);
    }
  };

  const isCreator = contest?.creatorId === user?._id;

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : contest ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-100">{contest.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="brand">{contest.subject}</Badge>
                  <Badge variant="neutral">{contest.difficulty}</Badge>
                  <Badge variant="neutral">{contest.questionCount} questions</Badge>
                  <Badge variant="neutral">{contest.durationMinutes}m</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">{t('contest.joinCode')}</p>
                <p className="text-xl font-mono font-bold text-brand-300">{contest.code}</p>
              </div>
            </div>

            <Card className="space-y-4">
              <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-400" />
                {t('contest.lobby.participants')} ({participants.length})
              </h3>
              <div className="space-y-2">
                {participants.map((p) => (
                  <motion.div
                    key={p.userId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50"
                  >
                    <Avatar username={p.username} size="sm" />
                    <span className="text-sm font-medium text-zinc-200">{p.username}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-neon-teal animate-pulse-soft" />
                      <span className="text-xs text-zinc-500">{t('contest.lobby.online')}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>

            <Card className="text-center">
              {isCreator ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Wifi className="w-4 h-4 text-neon-teal animate-pulse-soft" />
                    <p className="text-sm text-zinc-400">
                      {participants.length} participant(s) connected
                    </p>
                  </div>
                  <Button className="w-full" size="lg" loading={starting} onClick={handleStart} icon={<Zap className="w-4 h-4" />}>
                    {t('contest.lobby.launch')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-400">{t('contest.lobby.waitingForHost')}</p>
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </PageWrapper>
  );
}
