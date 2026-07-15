import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  balance: number;
  lastDailyReset: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    balance: { type: Number, default: 100 },
    lastDailyReset: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
