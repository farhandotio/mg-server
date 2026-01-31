import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { connectRedis } from "./src/config/redis.js";

const port = process.env.PORT || 5000;
connectDB();
connectRedis();

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
