import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoleta {
  label: string;
  url: string;
}

export interface IHouse extends Document {
  id: string;
  name: string;
  url: string;
  roletas: IRoleta[];
  active: boolean;
  note?: string;
  order: number;
  gorjeta: boolean;
  deposito: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roletaSchema = new Schema<IRoleta>(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const houseSchema = new Schema<IHouse> (
  {
    id: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    roletas: { type: [roletaSchema], default: [] },
    active: { type: Boolean, default: true },
    note: { type: String },
    order: { type: Number, default: 0 },
    gorjeta: { type: Boolean, default: false },
    deposito: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const House: Model<IHouse> =
  mongoose.models.House || mongoose.model<IHouse>('House', houseSchema);
