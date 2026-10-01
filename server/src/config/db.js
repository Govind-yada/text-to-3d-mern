import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/text-to-3d';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${mongoURI}.`);
    console.warn(`[MongoDB Warning] Reason: ${error.message}`);
    console.warn(`[MongoDB Warning] Generation will still function; history will be stored in-memory fallback until MongoDB is reachable.`);
  }
};

export const getDBStatus = () => isConnected;
