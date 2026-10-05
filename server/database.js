import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

export async function connectDatabase() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI is required in production.');
    }
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('campus_found_demo');
    console.warn('MONGODB_URI is not set; using an ephemeral MongoDB instance for this development session. Data will not survive a restart.');
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log('MongoDB connected.');
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && !memoryServer) {
      console.warn(`Could not connect to ${uri}. Falling back to in-memory MongoDB instance for development...`);
      memoryServer = await MongoMemoryServer.create();
      const fallbackUri = memoryServer.getUri('campus_found_demo');
      await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 15000 });
      console.log('Connected to fallback in-memory MongoDB.');
    } else {
      throw err;
    }
  }
  return mongoose.connection;
}

export async function closeDatabase() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
