import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const ReadingSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  transitFeatures: { type: Schema.Types.Mixed, required: true },
  narrative: { type: String, required: true },
  model: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
});

ReadingSchema.index({ userId: 1, date: 1 }, { unique: true });

export type ReadingDoc = InferSchemaType<typeof ReadingSchema>;
export const Reading = mongoose.model('Reading', ReadingSchema);
