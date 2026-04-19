import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { useContestStore } from '../../stores/contestStore';
import { getSocket } from '../../lib/socket';
import api from '../../lib/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function ContestArenaPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { contestId, questions, startedAt, durationMs, currentAnswers, leaderboard, setAnswer, setLeaderboard, setFinished, isFinished } = useContestStore();

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationMs / 1000);
  const [qStartTime, setQStartTime] = useState(Date.now());

  // Redirect to results when finished
  useEffect(() => {
    if (isFinished && contestId) {
      navigate(`/contests/${contestId}/results`);
    }
  }, [isFinished]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('leaderboard-update', ({ ranking }: { ranking: Parameters<typeof setLeaderboard>[0] }) => {
      setLeaderboard(ranking);
    });

    socket.on('contest-ended', () => {
      setFinished();
    });

    return () => {
      socket.off('leaderboard-update');
      socket.off('contest-ended');
    };
  }, []);

  // Timer
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      const remaining = Math.max(0, durationMs / 1000 - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleFinish();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationMs]);

  const handleLockAnswer = useCallback(() => {
    if (selected === null || locked || !contestId || !user) return;
    setLocked(true);
    const timeSpentMs = Date.now() - qStartTime;
    setAnswer(currentQ, selected);

    const socket = getSocket();
    socket.emit('submit-answer', {
      contestId,
      userId: user._id,
      questionIndex: currentQ,
      selectedIndex: selected,
      timeSpentMs,
    });

    setTimeout(() => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ((q) => q + 1);
        setSelected(null);
        setLocked(false);
        setQStartTime(Date.now());
      } else {
        handleFinish();
      }
    }, 1000);
  }, [selected, locked, contestId, user, currentQ, questions.length, qStartTime]);

  const handleFinish = async () => {
    if (!contestId || !user) return;
    try {
      const answers = Object.entries(currentAnswers).map(([qi, si]) => ({
        questionIndex: Number(qi),
        selectedIndex: si,
        timeSpentMs: 0,
      }));
      await api.post(`/contests/${contestId}/submit`, { answers });
      const socket = getSocket();
      socket.emit('finish-contest', { contestId, userId: user._id });
      setFinished();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const question = questions[currentQ];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.floor(timeLeft % 60);
  const timePct = durationMs > 0 ? (timeLeft / (durationMs / 1000)) * 100 : 100;
  const timerColor = timePct > 50 ? 'text-neon-teal' : timePct > 25 ? 'text-neon-amber' : 'text-red-400';

  if (!question) return null;

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Main arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Timer ring */}
        <div className="mb-8 relative">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="3" />
            <motion.circle
              cx="18" cy="18" r="15"
              fill="none"
              stroke={timePct > 50 ? '#1D9E75' : timePct > 25 ? '#EF9F27' : '#E24B4A'}
              strokeWidth="3"
              strokeDasharray="94.2"
              strokeDashoffset={94.2 - (94.2 * timePct) / 100}
              strokeLinecap="round"
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center font-mono font-bold text-lg ${timerColor}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        <div className="w-full max-w-xl space-y-4">
          <div className="text-center text-xs text-zinc-500 font-medium">
            {t('contest.arena.question', { current: currentQ + 1, total: questions.length })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="space-y-4">
                <p className="text-lg font-semibold text-zinc-100">{question.text}</p>
                <div className="space-y-2">
                  {question.options.map((option, idx) => {
                    let style = 'border-zinc-700 bg-zinc-800 hover:border-zinc-600';
                    if (selected === idx) style = 'border-brand-500 bg-brand-600/10 text-brand-300';
                    if (locked && selected === idx) style = 'border-brand-500 bg-brand-600/20 text-brand-300 opacity-70';

                    return (
                      <motion.button
                        key={idx}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => !locked && setSelected(idx)}
                        disabled={locked}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${style}`}
                      >
                        <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 border-current text-zinc-400">
                          {OPTION_LABELS[idx]}
                        </span>
                        <span className="text-sm text-zinc-200">{option}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <Button
                  className="w-full"
                  onClick={handleLockAnswer}
                  disabled={selected === null || locked}
                  size="lg"
                >
                  {t('contest.arena.submit')}
                </Button>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Live leaderboard sidebar */}
      <div className="w-60 bg-zinc-900 border-l border-zinc-800 p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {t('contest.arena.leaderboard')}
        </h3>
        <div className="space-y-1.5">
          {leaderboard.map((entry, i) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm ${entry.userId === user?._id ? 'bg-brand-900/30 border border-brand-800/50' : 'bg-zinc-800/50'}`}
            >
              <span className="text-xs font-bold text-zinc-500 w-5">#{i + 1}</span>
              <span className="flex-1 truncate text-zinc-200 text-xs">{entry.username}</span>
              <span className="text-xs font-bold text-brand-400">{entry.score}</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-xs text-zinc-600">Waiting for answers...</p>
          )}
        </div>
      </div>
    </div>
  );
}
