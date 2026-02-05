import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 5000,
  },
});

redisClient.on('error', (err) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Redis Client Error:', err.message);
  }
});

export const connectRedis = async () => {
  if (!redisUrl) return null;

  try {
    if (redisClient.isOpen || redisClient.isReady) {
      return redisClient;
    }

    await redisClient.connect();
    console.log('✅ Redis Connected');
    return redisClient;
  } catch (error) {
    console.error('❌ Redis Connection Failed:', error.message);
    return null; 
  }
};
