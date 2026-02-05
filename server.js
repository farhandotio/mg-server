import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';

const initConnections = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
  }

  try {
    await connectRedis();
    console.log('✅ Redis Connected');
  } catch (err) {
    console.error('❌ Redis Error:', err.message);
  }
};

initConnections();

if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`🚀 Port: ${port}`));
}

export default app;
