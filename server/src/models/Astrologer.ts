import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const AstrologerSchema = new Schema({
  name: { type: String, required: true },
  specialties: [String],
  languages: [String],
  ratePerMin: { type: Number, required: true }, // INR
  avatarSeed: String, // deterministic svg avatar hint
});

export type AstrologerDoc = InferSchemaType<typeof AstrologerSchema>;
export const Astrologer = mongoose.model('Astrologer', AstrologerSchema);
