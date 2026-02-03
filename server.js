import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    if (process.env.NODE_ENV !== 'production') {
      const port = process.env.PORT || 5000;
      app.listen(port, () => {
        console.log(`🚀 Server is running on http://localhost:${port}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
};

startServer();

export default app;
