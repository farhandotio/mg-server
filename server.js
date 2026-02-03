import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';

connectDB().catch((err) => console.error('❌ DB Error:', err));
connectRedis().catch((err) => console.error('❌ Redis Error:', err));

if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`🚀 Local Server: http://localhost:${port}`);
  });
}

export default app;
