import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import api from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const { user, updateUser, isAuthenticated } = useAuthStore();
  const current = i18n.language?.startsWith('fr') ? 'fr' : 'en';

  const toggle = async (lang: 'fr' | 'en') => {
    if (lang === current) return;
    await i18n.changeLanguage(lang);
    localStorage.setItem('learnify-lang', lang);
    if (isAuthenticated) {
      try {
        await api.patch('/users/me', { preferredLanguage: lang });
        updateUser({ preferredLanguage: lang });
        toast.success(t('toasts.languageChanged'));
      } catch {
        // silent
      }
    }
  };

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-zinc-800 border border-zinc-700', className)}>
      {(['fr', 'en'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => toggle(lang)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
            current === lang
              ? 'bg-brand-600 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          {lang === 'fr' ? 'FR' : 'EN'}
        </button>
      ))}
    </div>
  );
}
