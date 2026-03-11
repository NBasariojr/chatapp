// backend/src/config/database.ts
import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  mongoose.set('strictQuery', false);

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
};