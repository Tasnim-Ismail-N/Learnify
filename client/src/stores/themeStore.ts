import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: true,
      toggle: () => {
        const next = !get().isDark;
        document.documentElement.classList.toggle('dark', next);
        set({ isDark: next });
      },
    }),
    { name: 'learnify-theme' }
  )
);

// Apply on initial load
const stored = JSON.parse(localStorage.getItem('learnify-theme') ?? '{"state":{"isDark":true}}');
document.documentElement.classList.toggle('dark', stored.state?.isDark ?? true);
