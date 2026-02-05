import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';

const startServer = async () => {
  await connectDB();

  await connectRedis();

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
};

startServer();
export default app;
