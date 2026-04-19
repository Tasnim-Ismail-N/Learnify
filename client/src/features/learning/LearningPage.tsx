import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle, XCircle, ArrowRight, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/axios';
import { getApiError } from '../../lib/utils';

const schema = z.object({
  subject: z.string().min(1),
  chapter: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.coerce.number().int().min(3).max(20),
});

type FormData = z.infer<typeof schema>;

interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface SessionData {
  _id: string;
  questions: Question[];
  subject: string;
  chapter: string;
}

interface LessonData {
  title: string;
  summary: string;
  keyPoints: string[];
}

type Phase = 'config' | 'lesson' | 'quiz' | 'summary';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function LearningPage() {
  const { t } = useTranslation();
  const { updateUser } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('config');
  const [session, setSession] = useState<SessionData | null>(null);
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Array<{ questionIndex: number; selectedIndex: number; timeSpentMs: number }>>([]);
  const [qStartTime, setQStartTime] = useState(Date.now());
  const [summaryData, setSummaryData] = useState<{ score: number; totalQuestions: number; xpEarned: number } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { difficulty: 'medium', questionCount: 10 },
  });

  const onGenerate = async (data: FormData) => {
    try {
      const res = await api.post('/learn/session/generate', data);
      setSession(res.data.session);
      setLesson(res.data.lesson);
      setPhase('lesson');
      setCurrentQ(0);
      setAnswers([]);
    } catch (err: unknown) {
      const isRateLimit = (err as { response?: { status?: number } })?.response?.status === 429;
      const msg = isRateLimit ? t('errors.rateLimit') : getApiError(err, t('errors.generic'));
      toast.error(msg, { duration: 8000 });
      console.error('Session generate error:', err);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
  };

  const handleReveal = () => {
    if (selected === null || !session) return;
    setRevealed(true);
    const timeSpentMs = Date.now() - qStartTime;
    setAnswers((prev) => [...prev, { questionIndex: currentQ, selectedIndex: selected, timeSpentMs }]);
  };

  const handleNext = () => {
    if (!session) return;
    if (currentQ + 1 < session.questions.length) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setRevealed(false);
      setQStartTime(Date.now());
    } else {
      submitSession();
    }
  };

  const submitSession = async () => {
    if (!session) return;
    try {
      const res = await api.post(`/learn/session/${session._id}/submit`, { answers });
      setSummaryData({ score: res.data.score, totalQuestions: res.data.totalQuestions, xpEarned: res.data.xpEarned });
      updateUser({ xp: res.data.score });
      setPhase('summary');
      toast.success(t('toasts.sessionComplete', { xp: res.data.xpEarned }));
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const reset = () => {
    setPhase('config');
    setSession(null);
    setLesson(null);
    setCurrentQ(0);
    setSelected(null);
    setRevealed(false);
    setAnswers([]);
    setSummaryData(null);
  };

  const question = session?.questions[currentQ];
  const isCorrect = revealed && selected !== null && question && selected === question.correctIndex;

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* CONFIG */}
          {phase === 'config' && (
            <motion.div key="config" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-2">
                  <Brain className="w-7 h-7 text-brand-400" /> {t('learn.title')}
                </h1>
              </div>
              <Card>
                <form onSubmit={handleSubmit(onGenerate)} className="space-y-4">
                  <Input label={t('learn.subject')} placeholder="Mathematics, Physics, History..." error={errors.subject?.message} {...register('subject')} />
                  <Input label={t('learn.chapter')} placeholder="Pythagorean theorem, Newton's laws..." error={errors.chapter?.message} {...register('chapter')} />

                  <div>
                    <label className="text-sm font-medium text-zinc-300 block mb-2">{t('learn.difficulty.label')}</label>
                    <div className="flex gap-2">
                      {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <label key={d} className="flex-1 cursor-pointer">
                          <input type="radio" value={d} {...register('difficulty')} className="sr-only peer" />
                          <div className={`text-center py-2 rounded-lg border text-sm font-medium transition-all peer-checked:border-brand-500 peer-checked:bg-brand-600/10 peer-checked:text-brand-400 border-zinc-700 text-zinc-400`}>
                            {t(`learn.difficulty.${d}`)}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Input label={t('learn.questionCount')} type="number" min={3} max={20} placeholder="10" error={errors.questionCount?.message} {...register('questionCount')} />

                  <Button type="submit" loading={isSubmitting} className="w-full" size="lg" icon={<Brain className="w-4 h-4" />}>
                    {isSubmitting ? t('learn.generating') : t('learn.generate')}
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {/* LESSON */}
          {phase === 'lesson' && lesson && (
            <motion.div key="lesson" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-2xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-brand-400" /> {t('learn.lesson.title')}
              </h2>
              <Card className="space-y-5">
                <h3 className="text-xl font-semibold text-brand-300">{lesson.title}</h3>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{lesson.summary}</p>
                <div>
                  <h4 className="font-semibold text-zinc-200 mb-3">{t('learn.lesson.keyPoints')}</h4>
                  <ul className="space-y-2">
                    {lesson.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-zinc-300 text-sm">
                        <span className="text-brand-400 mt-0.5">•</span> {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button className="w-full" size="lg" onClick={() => setPhase('quiz')}>
                  {t('learn.lesson.startQuiz')} <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>
            </motion.div>
          )}

          {/* QUIZ */}
          {phase === 'quiz' && session && question && (
            <motion.div key={`quiz-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-4 space-y-2">
                <div className="flex justify-between items-center text-sm text-zinc-400">
                  <span>{t('learn.question', { current: currentQ + 1, total: session.questions.length })}</span>
                </div>
                <ProgressBar value={currentQ + 1} max={session.questions.length} color="brand" />
              </div>

              <Card className="space-y-5">
                <p className="text-lg font-semibold text-zinc-100 leading-snug">{question.text}</p>

                <div className="space-y-2">
                  {question.options.map((option, idx) => {
                    let optionStyle = 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700';
                    if (revealed) {
                      if (idx === question.correctIndex) optionStyle = 'border-neon-teal bg-neon-teal/10 text-neon-teal';
                      else if (idx === selected && idx !== question.correctIndex) optionStyle = 'border-red-500 bg-red-900/20 text-red-400';
                      else optionStyle = 'border-zinc-800 bg-zinc-900 text-zinc-500 opacity-60';
                    } else if (idx === selected) {
                      optionStyle = 'border-brand-500 bg-brand-600/10 text-brand-300';
                    }

                    return (
                      <motion.button
                        key={idx}
                        whileTap={revealed ? {} : { scale: 0.98 }}
                        animate={revealed && idx === selected && idx !== question.correctIndex ? { x: [0, -6, 6, -6, 6, 0] } : {}}
                        transition={revealed && idx === selected && idx !== question.correctIndex ? { duration: 0.4 } : {}}
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${optionStyle}`}
                        disabled={revealed}
                      >
                        <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 border-current">{OPTION_LABELS[idx]}</span>
                        <span className="text-sm">{option}</span>
                        {revealed && idx === question.correctIndex && <CheckCircle className="w-4 h-4 ml-auto text-neon-teal" />}
                        {revealed && idx === selected && idx !== question.correctIndex && <XCircle className="w-4 h-4 ml-auto text-red-400" />}
                      </motion.button>
                    );
                  })}
                </div>

                {revealed && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl border ${isCorrect ? 'bg-neon-teal/5 border-neon-teal/20' : 'bg-red-900/10 border-red-800/30'}`}>
                    <p className="text-sm font-semibold mb-1">{isCorrect ? t('learn.correct') : t('learn.incorrect')}</p>
                    <p className="text-xs text-zinc-400">{question.explanation}</p>
                  </motion.div>
                )}

                {!revealed ? (
                  <Button className="w-full" onClick={handleReveal} disabled={selected === null}>
                    {t('learn.submitAnswer')}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={handleNext}>
                    {currentQ + 1 < session.questions.length ? t('learn.next') : t('learn.finish')} <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </Card>
            </motion.div>
          )}

          {/* SUMMARY */}
          {phase === 'summary' && summaryData && (
            <motion.div key="summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="text-center space-y-6">
                <div>
                  <div className="text-5xl font-bold text-brand-400">
                    {Math.round((summaryData.score / summaryData.totalQuestions) * 100)}%
                  </div>
                  <p className="text-zinc-400 text-sm mt-1">{t('learn.summary.score')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-2xl font-bold text-neon-teal">+{summaryData.xpEarned}</p>
                    <p className="text-xs text-zinc-500">{t('learn.summary.xpEarned')}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-2xl font-bold text-zinc-100">{summaryData.score}/{summaryData.totalQuestions}</p>
                    <p className="text-xs text-zinc-500">{t('common.noData')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={reset}>{t('learn.summary.tryAgain')}</Button>
                  <Button className="flex-1" onClick={() => window.location.href = '/dashboard'}>{t('learn.summary.backToDashboard')}</Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
