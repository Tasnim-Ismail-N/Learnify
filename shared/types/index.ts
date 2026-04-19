export type Difficulty = 'easy' | 'medium' | 'hard';
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type Language = 'fr' | 'en';
export type ContestStatus = 'pending' | 'active' | 'finished';

export interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface UserPublic {
  _id: string;
  username: string;
  avatar: string;
  xp: number;
  level: Level;
  streak: { current: number; longest: number };
}
