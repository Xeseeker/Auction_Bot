import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { fileURLToPath } from 'url';
import { config } from './src/config/env.js';
import connectDB from './src/config/db.js';
import { startCronJobs } from './src/services/cronService.js';
import { startBot } from './src/bot/index.js';
import adminApiRouter from './src/routes/adminApi.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

const allowOrigin = (origin, callback) => {
  if (!origin) {
    return callback(null, true);
  }

  if (!config.ADMIN_CORS_ORIGIN) {
    return callback(null, true);
  }

  const allowedOrigins = config.ADMIN_CORS_ORIGIN.split(',').map((value) => value.trim());
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error('CORS origin not allowed.'));
};

app.use(cors({ origin: allowOrigin, credentials: true }));
app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.MONGO_URI,
      ttl: config.SESSION_TTL_HOURS * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production',
      maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000,
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again shortly.' },
});

app.use('/api', apiLimiter);
app.use('/api/admin/session', loginLimiter);
app.use('/api/admin', adminApiRouter);

if (fs.existsSync(frontendDistPath)) {
  app.use('/admin', express.static(frontendDistPath));
  app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

app.get('/', (req, res) => {
  res.send(
    fs.existsSync(frontendDistPath)
      ? 'Auction Bot is running. Open /admin for the React admin panel.'
      : 'Auction Bot is running. Start the frontend app in /frontend to use the React admin panel.'
  );
});

const init = async () => {
  try {
    await connectDB();
    startBot();
    startCronJobs();

    app.listen(config.PORT, () => {
      console.log(`Application running on port ${config.PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize the application:', error);
    process.exit(1);
  }
};

init();
