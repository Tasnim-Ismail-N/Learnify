import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Brain, Copy, Check, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../lib/axios';
import { getApiError } from '../../lib/utils';

const schema = z.object({
  title: z.string().min(1).max(100),
  subject: z.string().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  questionCount: z.coerce.number().int().min(3).max(30),
  durationMinutes: z.coerce.number().int().min(1).max(120),
  maxParticipants: z.coerce.number().int().min(2).max(100),
});

type FormData = z.infer<typeof schema>;

const questionTypes = ['multiple-choice', 'true-false', 'fill-blank'];

export function CreateContestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState(['multiple-choice']);
  const [contestCode, setContestCode] = useState('');
  const [contestId, setContestId] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { difficulty: 'medium', level: 'intermediate', questionCount: 10, durationMinutes: 15, maxParticipants: 20 },
  });

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? (prev.length > 1 ? prev.filter((t) => t !== type) : prev) : [...prev, type]
    );
  };

  const onGenerate = async (data: FormData) => {
    setGenerating(true);
    try {
      const res = await api.post('/contests', { ...data, questionTypes: selectedTypes });
      setContestCode(res.data.code);
      setContestId(res.data._id);
      setStep(3);
      toast.success(t('toasts.contestCreated'));
    } catch (err: unknown) {
      const isRateLimit = (err as { response?: { status?: number } })?.response?.status === 429;
      const msg = isRateLimit ? t('errors.rateLimit') : getApiError(err, t('errors.generic'));
      toast.error(msg, { duration: 8000 });
      console.error('Contest create error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(contestCode);
    setCopied(true);
    toast.success(t('toasts.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    { n: 1, label: t('contest.form.step1') },
    { n: 2, label: t('contest.form.step2') },
    { n: 3, label: t('contest.form.step3') },
  ];

  return (
    <PageWrapper>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/contests')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-zinc-100">{t('contest.create')}</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= n ? 'bg-brand-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{n}</div>
              <span className={`text-sm ${step === n ? 'text-zinc-200 font-medium' : 'text-zinc-500'}`}>{label}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step > n ? 'bg-brand-600' : 'bg-zinc-700'} min-w-[20px]`} />}
            </div>
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          {step === 1 && (
            <Card className="space-y-4">
              <Input label={t('contest.form.title')} placeholder="Friday Math Challenge" error={errors.title?.message} {...register('title')} />
              <Input label={t('contest.form.subject')} placeholder="Mathematics" error={errors.subject?.message} {...register('subject')} />

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">{t('contest.form.difficulty')}</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((d) => (
                    <label key={d} className="flex-1 cursor-pointer">
                      <input type="radio" value={d} {...register('difficulty')} className="sr-only peer" />
                      <div className="text-center py-2 rounded-lg border text-sm font-medium transition-all peer-checked:border-brand-500 peer-checked:bg-brand-600/10 peer-checked:text-brand-400 border-zinc-700 text-zinc-400">
                        {t(`learn.difficulty.${d}`)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">{t('contest.form.level')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map((l) => (
                    <label key={l} className="cursor-pointer">
                      <input type="radio" value={l} {...register('level')} className="sr-only peer" />
                      <div className="text-center py-2 rounded-lg border text-sm font-medium transition-all peer-checked:border-brand-500 peer-checked:bg-brand-600/10 peer-checked:text-brand-400 border-zinc-700 text-zinc-400">
                        {t(`dashboard.level.${l}`)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label={`${t('contest.form.questionCount')}`} type="number" min={3} max={30} {...register('questionCount')} />
                <Input label={`${t('contest.form.duration')}`} type="number" min={1} max={120} {...register('durationMinutes')} />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">{t('contest.form.questionTypes')}</label>
                <div className="flex flex-wrap gap-2">
                  {questionTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedTypes.includes(type) ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={() => setStep(2)}>
                {t('common.save')} <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          )}

          {step === 2 && (
            <Card className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-600/15 flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100">Review & Generate</h3>
                  <p className="text-sm text-zinc-400 mt-1">AI will generate {getValues('questionCount')} {getValues('difficulty')} questions for <strong className="text-zinc-200">{getValues('subject')}</strong></p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-left">
                  {[
                    ['Title', getValues('title')],
                    ['Subject', getValues('subject')],
                    ['Difficulty', getValues('difficulty')],
                    ['Level', getValues('level')],
                    ['Questions', getValues('questionCount')],
                    ['Duration', `${getValues('durationMinutes')}m`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-zinc-800 rounded-lg p-2.5">
                      <p className="text-zinc-500 text-xs">{k}</p>
                      <p className="text-zinc-200 font-medium capitalize">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  loading={generating}
                  onClick={handleSubmit(onGenerate)}
                  icon={<Brain className="w-4 h-4" />}
                >
                  {t('contest.form.generate')}
                </Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-neon-teal/10 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-neon-teal" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 text-xl">{t('contest.form.codeGenerated')}</h3>
                <p className="text-zinc-400 text-sm mt-1">Share this code with participants</p>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <p className="text-3xl font-mono font-bold tracking-widest text-brand-300">{contestCode}</p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={copyCode} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
                <Button className="flex-1" onClick={() => navigate(`/contests/${contestCode}/lobby`)}>
                  Go to Lobby
                </Button>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
