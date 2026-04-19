import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Zap, Brain, BarChart2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LanguageToggle } from '../../components/ui/LanguageToggle';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/axios';

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  password: z.string().min(6),
  preferredLanguage: z.enum(['fr', 'en']),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { preferredLanguage: currentLang },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/register', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success('Welcome to Learnify');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('errors.generic');
      setError('root', { message: msg });
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-gradient-to-br from-brand-900 via-brand-800 to-zinc-900 p-12 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-neon-purple/20 via-transparent to-transparent" />
        <div className="relative z-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto border border-white/20">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white">{t('auth.registerTitle')}</h1>
          <p className="text-xl text-brand-200">{t('app.tagline')}</p>
          <ul className="text-left space-y-3 text-brand-100">
            {[
              { icon: <Brain className="w-4 h-4 shrink-0" />, text: 'AI-generated personalized sessions' },
              { icon: <Zap className="w-4 h-4 shrink-0" />, text: 'Live competitive contests' },
              { icon: <BarChart2 className="w-4 h-4 shrink-0" />, text: 'Track your progress in real time' },
              { icon: <Globe className="w-4 h-4 shrink-0" />, text: 'FR / EN fully bilingual' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm">
                {icon} <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-between items-center">
            <div className="lg:hidden flex items-center gap-2">
              <Zap className="w-6 h-6 text-brand-400" />
              <span className="font-bold text-zinc-100">{t('app.name')}</span>
            </div>
            <LanguageToggle className="ml-auto" />
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-3xl font-bold text-zinc-100">{t('auth.registerTitle')}</h2>
            <p className="mt-1 text-zinc-400 text-sm">{t('auth.registerSubtitle')}</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <Input label={t('auth.email')} type="email" icon={<Mail className="w-4 h-4" />} placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label={t('auth.username')} icon={<User className="w-4 h-4" />} placeholder="coolstudent42" error={errors.username?.message} {...register('username')} />
            <Input label={t('auth.password')} type="password" icon={<Lock className="w-4 h-4" />} placeholder="••••••••" error={errors.password?.message} {...register('password')} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">{t('auth.language')}</label>
              <div className="flex gap-2">
                {(['fr', 'en'] as const).map((lang) => (
                  <label key={lang} className="flex-1 cursor-pointer">
                    <input type="radio" value={lang} {...register('preferredLanguage')} className="sr-only peer" />
                    <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-zinc-700 peer-checked:border-brand-500 peer-checked:bg-brand-600/10 peer-checked:text-brand-400 text-zinc-400 text-sm font-medium transition-all">
                      {lang === 'fr' ? 'Français' : 'English'}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {errors.root && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              {t('auth.register')}
            </Button>
          </motion.form>

          <p className="text-sm text-center text-zinc-500">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
