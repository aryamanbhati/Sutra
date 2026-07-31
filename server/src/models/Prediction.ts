import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const PREDICTION_STATUSES = ['open', 'fulfilled', 'missed', 'unclear'] as const;
export type PredictionStatus = (typeof PREDICTION_STATUSES)[number];

const PredictionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source: { type: String, enum: ['astrologer', 'system'], required: true },
  astrologerId: { type: Schema.Types.ObjectId, ref: 'Astrologer' },
  astrologerName: String, // denormalized
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
  text: { type: String, required: true },
  madeAt: { type: Date, required: true },
  targetWindow: {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
  },
  status: { type: String, enum: PREDICTION_STATUSES, default: 'open' },
  userNote: String,
  resolvedAt: Date,
});

export type PredictionDoc = InferSchemaType<typeof PredictionSchema>;
export const Prediction = mongoose.model('Prediction', PredictionSchema);
