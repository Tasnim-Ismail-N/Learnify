import { create } from 'zustand';

export interface ContestQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  answeredCount: number;
}

interface ContestState {
  contestId: string | null;
  questions: ContestQuestion[];
  startedAt: Date | null;
  durationMs: number;
  currentAnswers: Record<number, number>;
  leaderboard: LeaderboardEntry[];
  isStarted: boolean;
  isFinished: boolean;

  setContest: (id: string, questions: ContestQuestion[], startedAt: Date, durationMs: number) => void;
  setAnswer: (questionIndex: number, selectedIndex: number) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setFinished: () => void;
  reset: () => void;
}

export const useContestStore = create<ContestState>((set) => ({
  contestId: null,
  questions: [],
  startedAt: null,
  durationMs: 0,
  currentAnswers: {},
  leaderboard: [],
  isStarted: false,
  isFinished: false,

  setContest: (id, questions, startedAt, durationMs) =>
    set({ contestId: id, questions, startedAt, durationMs, isStarted: true, isFinished: false, currentAnswers: {} }),

  setAnswer: (questionIndex, selectedIndex) =>
    set((state) => ({
      currentAnswers: { ...state.currentAnswers, [questionIndex]: selectedIndex },
    })),

  setLeaderboard: (entries) => set({ leaderboard: entries }),

  setFinished: () => set({ isFinished: true }),

  reset: () =>
    set({
      contestId: null,
      questions: [],
      startedAt: null,
      durationMs: 0,
      currentAnswers: {},
      leaderboard: [],
      isStarted: false,
      isFinished: false,
    }),
}));
