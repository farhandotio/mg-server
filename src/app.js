import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';

// Import routes
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import brandRoutes from './routes/brand.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import reviewRoutes from './routes/review.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { csrfProtection } from './middlewares/csrf.middleware.js';

const app = express();

// 1. Basic Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL,
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//   })
// );
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.get('/', (req, res) => {
  res.send('Server is running...');
});

app.use(csrfProtection);

// 5. Routes call
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payment', paymentRoutes);

export default app;
