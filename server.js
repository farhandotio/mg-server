import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';

connectDB().then(() => connectRedis());

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`🚀 Port: ${port}`));

export default app;
