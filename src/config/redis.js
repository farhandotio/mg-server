import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;
let isConnecting = false;

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 5000,
  },
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
});

export const connectRedis = async () => {
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL not found, Redis disabled');
    return null;
  }

  if (redisClient.isReady) {
    return redisClient;
  }

  if (isConnecting) {
    return redisClient;
  }

  try {
    isConnecting = true;
    await redisClient.connect();
    console.log('✅ Redis Connected');
    return redisClient;
  } catch (error) {
    console.error('❌ Redis Connection Failed:', error.message);
    return null;
  } finally {
    isConnecting = false;
  }
};
