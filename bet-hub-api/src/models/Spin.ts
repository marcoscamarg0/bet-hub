import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISpin extends Document {
  user: Types.ObjectId;
  houseId: string;      // slug da casa, ex: 'lotogreen'
  houseName: string;    // nome no momento do registro (snapshot)
  roletaLabel: string;  // ex: 'Roleta 1', 'Roleta 2', 'Bônus'
  amount: number;       // valor ganho (pode ser 0)
  currency: string;     // 'BRL' por padrão
  playedAt: Date;       // horário em que a roleta foi jogada
  createdAt: Date;
  updatedAt: Date;
}

const spinSchema = new Schema<ISpin>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    houseId: { type: String, required: true, index: true },
    houseName: { type: String, required: true },
    roletaLabel: { type: String, required: true },
    amount: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, default: 'BRL' },
    playedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

// Index útil para relatórios por usuário/data
spinSchema.index({ user: 1, playedAt: -1 });
spinSchema.index({ houseId: 1, playedAt: -1 });

export const Spin: Model<ISpin> =
  mongoose.models.Spin || mongoose.model<ISpin>('Spin', spinSchema);
