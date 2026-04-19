import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Edit, Trophy, Flame, BookOpen, Target, Zap, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { LanguageToggle } from '../../components/ui/LanguageToggle';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/axios';

const schema = z.object({
  username: z.string().min(2).max(30).optional(),
  bio: z.string().max(200).optional(),
});

type FormData = z.infer<typeof schema>;

const ACHIEVEMENTS = [
  { id: 'first-session', icon: Target, label: 'First session', earned: true },
  { id: 'streak-7', icon: Flame, label: '7-day streak', earned: false },
  { id: 'contest-win', icon: Trophy, label: 'Contest winner', earned: false },
  { id: 'expert', icon: Zap, label: 'Expert level', earned: false },
  { id: 'sessions-10', icon: BookOpen, label: '10 sessions', earned: false },
  { id: 'perfect', icon: Star, label: 'Perfect score', earned: false },
];

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: user?.username, bio: '' },
  });

  const onSave = async (data: FormData) => {
    try {
      const res = await api.patch('/users/me', data);
      updateUser(res.data);
      setEditing(false);
      toast.success(t('toasts.profileSaved'));
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  if (!user) return null;

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-zinc-100">{t('profile.title')}</h1>

        {/* Profile card */}
        <Card className="space-y-4">
          <div className="flex items-start gap-4">
            <Avatar username={user.username} size="xl" />
            <div className="flex-1">
              {editing ? (
                <form onSubmit={handleSubmit(onSave)} className="space-y-3">
                  <Input label={t('profile.username')} {...register('username')} />
                  <Input label={t('profile.bio')} {...register('bio')} />
                  <div className="flex gap-2">
                    <Button type="submit" loading={isSubmitting} size="sm">{t('profile.save')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>{t('profile.cancel')}</Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-100">{user.username}</h2>
                    <Badge variant="brand">{t(`dashboard.level.${user.level}`)}</Badge>
                  </div>
                  <p className="text-sm text-zinc-400 mt-0.5">{user.email}</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditing(true)} icon={<Edit className="w-3.5 h-3.5" />}>
                    {t('profile.edit')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Trophy, label: t('profile.stats.totalXP'), value: user.xp, color: 'text-brand-400' },
            { icon: Flame, label: t('profile.stats.bestStreak'), value: user.streak.longest, color: 'text-neon-amber' },
            { icon: BookOpen, label: t('profile.stats.sessionsCompleted'), value: '-', color: 'text-neon-teal' },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="text-center space-y-1">
              <Icon className={`w-5 h-5 mx-auto ${color}`} />
              <p className="text-xl font-bold text-zinc-100">{value}</p>
              <p className="text-xs text-zinc-500">{label}</p>
            </Card>
          ))}
        </div>

        {/* Language */}
        <Card className="space-y-3">
          <h3 className="font-semibold text-zinc-200">{t('profile.language')}</h3>
          <LanguageToggle />
        </Card>

        {/* Achievements */}
        <Card className="space-y-4">
          <h3 className="font-semibold text-zinc-200">{t('profile.achievements')}</h3>
          <div className="grid grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((ach) => (
              <motion.div
                key={ach.id}
                whileHover={{ scale: 1.05 }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${ach.earned ? 'bg-brand-900/20 border-brand-800/50' : 'bg-zinc-800/30 border-zinc-800 opacity-50'}`}
              >
                <ach.icon className={`w-6 h-6 ${ach.earned ? 'text-brand-400' : 'text-zinc-500'}`} />
                <p className="text-xs font-medium text-zinc-300 text-center">{ach.label}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
