import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, Lock, Zap, Brain, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LanguageToggle } from '../../components/ui/LanguageToggle';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/axios';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-brand-600/20 via-transparent to-transparent" />
        <div className="relative z-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto border border-white/20">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white">{t('app.name')}</h1>
          <p className="text-xl text-brand-200">{t('app.tagline')}</p>
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { icon: <Brain className="w-4 h-4" />, label: 'AI-Powered' },
              { icon: <Zap className="w-4 h-4" />, label: 'Real-time' },
              { icon: <Trophy className="w-4 h-4" />, label: 'Compete' },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10 text-white text-sm font-medium flex items-center justify-center gap-1.5">
                {icon} {label}
              </div>
            ))}
          </div>
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
            <h2 className="text-3xl font-bold text-zinc-100">{t('auth.loginTitle')}</h2>
            <p className="mt-1 text-zinc-400 text-sm">{t('auth.loginSubtitle')}</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <Input
              label={t('auth.email')}
              type="email"
              icon={<Mail className="w-4 h-4" />}
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={t('auth.password')}
              type="password"
              icon={<Lock className="w-4 h-4" />}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            {errors.root && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              {t('auth.login')}
            </Button>
          </motion.form>

          <p className="text-sm text-center text-zinc-500">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
