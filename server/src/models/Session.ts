import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  aiGenerated: boolean;
}

export interface IAnswer {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface ISession extends Document {
  userId: Types.ObjectId;
  subject: string;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: IQuestion[];
  answers: IAnswer[];
  score: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  xpEarned: number;
}

const questionSchema = new Schema<IQuestion>(
  {
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
    aiGenerated: { type: Boolean, default: true },
  },
  { _id: false }
);

const answerSchema = new Schema<IAnswer>(
  {
    questionIndex: { type: Number, required: true },
    selectedIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    timeSpentMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    questions: [questionSchema],
    answers: [answerSchema],
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    durationMs: { type: Number },
    xpEarned: { type: Number, default: 0 },
  },
  { timestamps: false }
);

sessionSchema.index({ userId: 1, startedAt: -1 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
