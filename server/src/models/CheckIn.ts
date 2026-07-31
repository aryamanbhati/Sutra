import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const MOODS = ['calm', 'anxious', 'hopeful', 'low', 'energised', 'unsettled'] as const;

const CheckInSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  mood: { type: String, enum: MOODS, required: true },
  energy: { type: Number, min: 1, max: 5, required: true },
  note: { type: String, default: '' },
  transitSnapshot: {
    moonSign: String,
    moonNakshatra: String,
    activeAspects: [String],
  },
  createdAt: { type: Date, default: Date.now },
});

CheckInSchema.index({ userId: 1, date: 1 }, { unique: true });

export type CheckInDoc = InferSchemaType<typeof CheckInSchema>;
export const CheckIn = mongoose.model('CheckIn', CheckInSchema);
