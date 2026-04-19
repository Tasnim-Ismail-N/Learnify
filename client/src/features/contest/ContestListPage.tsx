import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, Hash, Swords } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../lib/axios';
import toast from 'react-hot-toast';

export function ContestListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      await api.post(`/contests/${code.toUpperCase()}/join`);
      toast.success(t('toasts.contestJoined'));
      navigate(`/contests/${code.toUpperCase()}/lobby`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('errors.generic');
      toast.error(msg);
    } finally {
      setJoining(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-2">
            <Swords className="w-7 h-7 text-brand-400" /> {t('contest.title')}
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Challenge friends in live AI-powered contests</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ type: 'spring', stiffness: 400 }}>
            <Card
              className="cursor-pointer border-brand-800/50 hover:border-brand-600/50 transition-colors h-full"
              onClick={() => navigate('/contests/new')}
            >
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-600/15 flex items-center justify-center">
                  <Plus className="w-7 h-7 text-brand-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-zinc-100">{t('contest.create')}</h2>
                  <p className="text-xs text-zinc-500 mt-1">Generate questions with AI and invite friends</p>
                </div>
                <Button size="sm" className="mt-2">{t('contest.create')}</Button>
              </div>
            </Card>
          </motion.div>

          <Card className="flex flex-col gap-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-neon-teal/10 flex items-center justify-center">
                <Hash className="w-7 h-7 text-neon-teal" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-100">{t('contest.join')}</h2>
                <p className="text-xs text-zinc-500 mt-1">Enter a code to join an existing contest</p>
              </div>
            </div>
            <Input
              placeholder={t('contest.enterCode')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="text-center font-mono tracking-widest"
              maxLength={8}
            />
            <Button onClick={handleJoin} loading={joining} variant="outline" className="w-full">
              {t('contest.joinNow')}
            </Button>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
