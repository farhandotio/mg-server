import mongoose from 'mongoose';

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.log('Database connection failed', error);
    throw new Error('MongoDB Connection Failed');
  }
}

export default connectDB;
