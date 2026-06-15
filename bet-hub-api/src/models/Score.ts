import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScore extends Document {
  name: string;
  amount: number;
  mines: number;
  cells: number;
  createdAt: Date;
}

const scoreSchema = new Schema<IScore>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    mines: { type: Number, required: true },
    cells: { type: Number, required: true },
  },
  { timestamps: true }
);

scoreSchema.index({ amount: -1 }); // index para ordenação por valor

export const Score: Model<IScore> =
  mongoose.models.Score || mongoose.model<IScore>('Score', scoreSchema);
