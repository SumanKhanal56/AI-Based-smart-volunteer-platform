// This helper connects the backend to MongoDB.
import mongoose from 'mongoose';

const defaultUri = 'mongodb://volunterr_admin:volunterr_dev@127.0.0.1:27017/volunterr?authSource=admin';

// Open one connection that all Mongoose models can use.
export async function connectDatabase(uri = process.env.MONGODB_URI || defaultUri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5_000,
    maxPoolSize: Number(process.env.DB_POOL_SIZE || 10),
    autoIndex: process.env.NODE_ENV !== 'production'
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}

// Close MongoDB cleanly after tests or when the server stops.
export async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
