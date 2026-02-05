import mongoose from 'mongoose';

let cachedPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  const opts = {
    bufferCommands: false,
    maxPoolSize: 10, 
  };

  cachedPromise = mongoose
    .connect(process.env.MONGO_URI, opts)
    .then((mongoose) => {
      console.log('✅ MongoDB connected successfully!');
      return mongoose;
    })
    .catch((error) => {
      console.error('❌ Database connection failed', error);
      cachedPromise = null; 
      throw error;
    });

  return cachedPromise;
}

export default connectDB;
