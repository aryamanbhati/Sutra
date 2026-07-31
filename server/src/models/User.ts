import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const PlanetSchema = new Schema(
  {
    body: { type: String, required: true },
    sign: { type: String, required: true },
    degree: { type: Number, required: true },
    house: { type: Number, required: true },
    retrograde: { type: Boolean, required: true },
  },
  { _id: false },
);

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },

  birthData: {
    type: {
      date: String, // YYYY-MM-DD
      time: String, // HH:mm
      lat: Number,
      lng: Number,
      tzOffset: Number,
      placeName: String,
    },
    default: null,
  },

  natalChart: {
    type: {
      ascendant: String,
      planets: [PlanetSchema],
      computedAt: String,
    },
    default: null,
  },

  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastCheckInDate: { type: String, default: null }, // YYYY-MM-DD
    freezesRemaining: { type: Number, default: 2 },
  },

  createdAt: { type: Date, default: Date.now },
});

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User = mongoose.model('User', UserSchema);
