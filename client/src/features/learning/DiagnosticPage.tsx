import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import api from '../../lib/axios';

interface DiagQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: string;
}

interface AnalysisResult {
  strengths: string[];
  weaknesses: string[];
  recommendedLevel: string;
  feedback: string;
}

type Phase = 'setup' | 'quiz' | 'analysing' | 'results';

export function DiagnosticPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('setup');
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState<DiagQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [responses, setResponses] = useState<Array<{ questionId: string; questionText: string; difficulty: string; selectedIndex: number; correctIndex: number }>>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleStart = async () => {
    if (!subject.trim()) return;
    try {
      const res = await api.post('/learn/diagnostic/start', { subject });
      setQuestions(res.data.questions);
      setPhase('quiz');
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const handleNext = () => {
    if (selected === null) return;
    const q = questions[currentQ];
    const newResponses = [...responses, { questionId: q.id, questionText: q.text, difficulty: q.difficulty, selectedIndex: selected, correctIndex: q.correctIndex }];
    setResponses(newResponses);
    setSelected(null);

    if (currentQ + 1 < questions.length) {
      setCurrentQ((i) => i + 1);
    } else {
      submitDiagnostic(newResponses);
    }
  };

  const submitDiagnostic = async (finalResponses: typeof responses) => {
    setPhase('analysing');
    try {
      const res = await api.post('/learn/diagnostic/submit', { subject, responses: finalResponses });
      setAnalysis(res.data.analysis);
      setPhase('results');
    } catch {
      toast.error(t('errors.generic'));
      setPhase('quiz');
    }
  };

  const question = questions[currentQ];

  const radarData = analysis
    ? [
        { area: 'Strengths', value: analysis.strengths.length * 25 },
        { area: 'Knowledge', value: Math.round((responses.filter((r) => r.selectedIndex === r.correctIndex).length / responses.length) * 100) },
        { area: 'Consistency', value: 70 },
        { area: 'Speed', value: 60 },
      ]
    : [];

  return (
    <PageWrapper>
      <div className="max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-brand-600/15 flex items-center justify-center mx-auto">
                  <Stethoscope className="w-8 h-8 text-brand-400" />
                </div>
                <h1 className="text-3xl font-bold text-zinc-100">{t('diagnostic.title')}</h1>
                <p className="text-zinc-400">Find your level and get personalized recommendations</p>
              </div>
              <Card className="space-y-4">
                <Input
                  label={t('learn.subject')}
                  placeholder="Mathematics, Physics, History..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <Button className="w-full" size="lg" onClick={handleStart} disabled={!subject.trim()}>
                  {t('diagnostic.start')} <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>
            </motion.div>
          )}

          {phase === 'quiz' && question && (
            <motion.div key={`q-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>{t('diagnostic.question', { current: currentQ + 1, total: questions.length })}</span>
                  <Badge variant="neutral">{question.difficulty}</Badge>
                </div>
                <ProgressBar value={currentQ + 1} max={questions.length} color="brand" />
              </div>
              <Card className="space-y-4">
                <p className="text-lg font-semibold text-zinc-100">{question.text}</p>
                <div className="space-y-2">
                  {question.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelected(idx)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${selected === idx ? 'border-brand-500 bg-brand-600/10 text-brand-300' : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-600'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <Button className="w-full" onClick={handleNext} disabled={selected === null}>
                  {currentQ + 1 < questions.length ? t('learn.next') : t('common.confirm')} <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>
            </motion.div>
          )}

          {phase === 'analysing' && (
            <motion.div key="analysing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-20">
              <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-zinc-300">{t('diagnostic.analysing')}</p>
            </motion.div>
          )}

          {phase === 'results' && analysis && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <h2 className="text-2xl font-bold text-zinc-100">{t('diagnostic.results.title')}</h2>
              <Card className="text-center space-y-2">
                <p className="text-xs text-zinc-500">{t('diagnostic.results.recommendedLevel')}</p>
                <p className="text-3xl font-bold text-brand-400 capitalize">{analysis.recommendedLevel}</p>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="space-y-2">
                  <h3 className="text-sm font-semibold text-neon-teal flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />{t('diagnostic.results.strengths')}</h3>
                  <ul className="space-y-1">
                    {analysis.strengths.map((s, i) => <li key={i} className="text-xs text-zinc-300">• {s}</li>)}
                  </ul>
                </Card>
                <Card className="space-y-2">
                  <h3 className="text-sm font-semibold text-neon-amber flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{t('diagnostic.results.weaknesses')}</h3>
                  <ul className="space-y-1">
                    {analysis.weaknesses.map((w, i) => <li key={i} className="text-xs text-zinc-300">• {w}</li>)}
                  </ul>
                </Card>
              </div>

              <Card>
                <h3 className="text-sm font-semibold text-zinc-200 mb-2">{t('diagnostic.results.feedback')}</h3>
                <p className="text-sm text-zinc-300">{analysis.feedback}</p>
              </Card>

              <Card>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#3f3f46" />
                    <PolarAngleAxis dataKey="area" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <Radar name="You" dataKey="value" stroke="#7F77DD" fill="#7F77DD" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              <Button className="w-full" size="lg" onClick={() => navigate('/learn')}>
                {t('diagnostic.results.startLearning')} <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
