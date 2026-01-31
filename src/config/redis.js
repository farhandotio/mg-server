import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.log('Missing redis url');
  process.exit(1);
}

export const redisClient = createClient({
  url: redisUrl,
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Redis connection failed', error);
    process.exit(1);
  }
};
