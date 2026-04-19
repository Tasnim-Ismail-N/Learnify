import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, Swords, Brain, User, Trophy, Zap, LogOut, Stethoscope,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../ui/Avatar';
import { LanguageToggle } from '../ui/LanguageToggle';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/learn', icon: BookOpen, key: 'nav.learn' },
  { to: '/contests', icon: Swords, key: 'nav.contest' },
  { to: '/tutor', icon: Brain, key: 'nav.tutor' },
  { to: '/diagnostic', icon: Stethoscope, key: 'nav.diagnostic' },
  { to: '/leaderboard', icon: Trophy, key: 'nav.leaderboard' },
  { to: '/profile', icon: User, key: 'nav.profile' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('learnify-refresh-token');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // silent
    }
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-zinc-800 bg-zinc-950 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg text-zinc-100">{t('app.name')}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-brand-400' : '')} />
                {t(key)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-zinc-800 space-y-3">
        <LanguageToggle className="w-full justify-center" />
        {user && (
          <div className="flex items-center gap-2 px-2">
            <Avatar username={user.username} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user.username}</p>
              <p className="text-xs text-zinc-500">{user.xp} XP</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-zinc-600 hover:text-red-400 transition-colors p-1"
              title={t('nav.logout')}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
