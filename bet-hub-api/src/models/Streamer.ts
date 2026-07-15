import mongoose, { Schema, Document } from 'mongoose';

export interface IStreamer extends Document {
  name: string;
  platform: 'twitch' | 'youtube';
  channelId: string; // Twitch login name or YouTube Channel ID
  tipUrl?: string; // Link para doação/gorjeta
  isLive: boolean;
  streamTitle?: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  lastChecked: Date;
  createdAt: Date;
  updatedAt: Date;
}

const streamerSchema = new Schema<IStreamer>(
  {
    name: { type: String, required: true },
    platform: { type: String, enum: ['twitch', 'youtube'], required: true },
    channelId: { type: String, required: true }, // e.g. "gaules" for Twitch or "UCX6OQ3DkcsbYNE6H8uQQuVA" for YT
    tipUrl: { type: String },
    isLive: { type: Boolean, default: false },
    streamTitle: { type: String },
    streamUrl: { type: String },
    thumbnailUrl: { type: String },
    lastChecked: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Streamer = mongoose.model<IStreamer>('Streamer', streamerSchema);
