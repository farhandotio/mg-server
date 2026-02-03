import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn('⚠️ Missing REDIS_URL. Redis features will be disabled.');
}

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) return new Error('Redis connection failed');
      return Math.min(retries * 100, 3000);
    },
    connectTimeout: 5000,
  },
});

redisClient.on('error', (err) => console.log('❌ Redis Client Error:', err.message));

export const connectRedis = async () => {
  if (!redisUrl) return;

  try {
    if (redisClient.isOpen) return;

    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Redis Connection Failed:', error.message);
  }
};
