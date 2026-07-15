import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScore extends Document {
  name: string;
  amount: number;
  mines?: number;
  cells?: number;
  game: 'mines' | 'forest' | 'dragon';
  userId?: string;
  username?: string;
  createdAt: Date;
}

const scoreSchema = new Schema<IScore>(
  {
    name:     { type: String, required: true, trim: true },
    amount:   { type: Number, required: true },
    mines:    { type: Number },
    cells:    { type: Number },
    game:     { type: String, enum: ['mines', 'forest', 'dragon'], default: 'mines' },
    userId:   { type: String },
    username: { type: String },
  },
  { timestamps: true }
);

scoreSchema.index({ amount: -1 });
scoreSchema.index({ game: 1, amount: -1 });
scoreSchema.index({ createdAt: -1 });

export const Score: Model<IScore> =
  mongoose.models.Score || mongoose.model<IScore>('Score', scoreSchema);
