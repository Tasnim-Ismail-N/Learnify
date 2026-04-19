import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IContestQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface IParticipantAnswer {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface IParticipant {
  userId: Types.ObjectId;
  username: string;
  avatar: string;
  answers: IParticipantAnswer[];
  score: number;
  rank: number;
  submittedAt?: Date;
}

export interface IContest extends Document {
  code: string;
  creatorId: Types.ObjectId;
  title: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  questionCount: number;
  durationMinutes: number;
  questionTypes: string[];
  questions: IContestQuestion[];
  status: 'pending' | 'active' | 'finished';
  participants: IParticipant[];
  maxParticipants: number;
  scheduledStartAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
}

const contestQuestionSchema = new Schema<IContestQuestion>(
  {
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const participantAnswerSchema = new Schema<IParticipantAnswer>(
  {
    questionIndex: { type: Number, required: true },
    selectedIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    timeSpentMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const participantSchema = new Schema<IParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    avatar: { type: String, default: '' },
    answers: [participantAnswerSchema],
    score: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    submittedAt: { type: Date },
  },
  { _id: false }
);

const contestSchema = new Schema<IContest>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true,
    },
    questionCount: { type: Number, required: true, min: 1, max: 50 },
    durationMinutes: { type: Number, required: true, min: 1, max: 120 },
    questionTypes: { type: [String], default: ['multiple-choice'] },
    questions: [contestQuestionSchema],
    status: {
      type: String,
      enum: ['pending', 'active', 'finished'],
      default: 'pending',
    },
    participants: [participantSchema],
    maxParticipants: { type: Number, default: 20 },
    scheduledStartAt: { type: Date },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

contestSchema.index({ creatorId: 1 });
contestSchema.index({ status: 1 });

export const Contest = mongoose.model<IContest>('Contest', contestSchema);
