import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const ConsultationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  astrologerId: { type: Schema.Types.ObjectId, ref: 'Astrologer', required: true },
  astrologerName: { type: String, required: true }, // denormalized for cheap timeline reads
  topic: { type: String, required: true },
  summary: { type: String, required: true },
  predictionIds: [{ type: Schema.Types.ObjectId, ref: 'Prediction' }],
  createdAt: { type: Date, default: Date.now },
});

export type ConsultationDoc = InferSchemaType<typeof ConsultationSchema>;
export const Consultation = mongoose.model('Consultation', ConsultationSchema);
