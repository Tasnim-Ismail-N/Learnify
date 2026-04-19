import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash: string;
  avatar: string;
  xp: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  streak: {
    current: number;
    longest: number;
    lastActiveDate: Date | null;
  };
  preferredLanguage: 'fr' | 'en';
  subjects: Array<{ name: string; masteryPct: number }>;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 30 },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: '' },
    xp: { type: Number, default: 0, min: 0 },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner',
    },
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastActiveDate: { type: Date, default: null },
    },
    preferredLanguage: { type: String, enum: ['fr', 'en'], default: 'fr' },
    subjects: [
      {
        name: { type: String, required: true },
        masteryPct: { type: Number, default: 0, min: 0, max: 100 },
      },
    ],
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

userSchema.index({ xp: -1 });

export const User = mongoose.model<IUser>('User', userSchema);
