import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDiagnosticResponse {
  questionId: string;
  isCorrect: boolean;
}

export interface IDiagnostic extends Document {
  userId: Types.ObjectId;
  subject: string;
  responses: IDiagnosticResponse[];
  competencyProfile: {
    strengths: string[];
    weaknesses: string[];
  };
  recommendedLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  completedAt: Date;
}

const diagnosticSchema = new Schema<IDiagnostic>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true },
    responses: [
      {
        questionId: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        _id: false,
      },
    ],
    competencyProfile: {
      strengths: [String],
      weaknesses: [String],
    },
    recommendedLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true,
    },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const Diagnostic = mongoose.model<IDiagnostic>('Diagnostic', diagnosticSchema);
