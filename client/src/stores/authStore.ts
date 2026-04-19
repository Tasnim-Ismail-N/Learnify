import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n/i18n';

export interface AuthUser {
  _id: string;
  email: string;
  username: string;
  avatar: string;
  avatarColor: string;
  xp: number;
  level: string;
  streak: { current: number; longest: number; lastActiveDate: string | null };
  preferredLanguage: 'fr' | 'en';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('learnify-access-token', accessToken);
        localStorage.setItem('learnify-refresh-token', refreshToken);
        i18n.changeLanguage(user.preferredLanguage);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () => {
        localStorage.removeItem('learnify-access-token');
        localStorage.removeItem('learnify-refresh-token');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'learnify-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
