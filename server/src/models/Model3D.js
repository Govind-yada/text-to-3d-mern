import mongoose from 'mongoose';

const model3DSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    artStyle: {
      type: String,
      default: 'realistic',
      enum: ['realistic', 'sculpture', 'cartoon', 'low-poly', 'pbr'],
    },
    taskId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      default: 'meshy',
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'EXPIRED'],
      default: 'PENDING',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    modelUrls: {
      glb: { type: String, default: null },
      fbx: { type: String, default: null },
      obj: { type: String, default: null },
      usdz: { type: String, default: null },
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Fallback in-memory store if MongoDB is not active
export const memoryStore = new Map();

export const Model3D = mongoose.model('Model3D', model3DSchema);
