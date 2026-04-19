import './config/env.js';
import express from 'express';
import { createServer } from 'http';
import { Server, Namespace } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { registerContestHandlers } from './socket/contestHandlers.js';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import learnRouter from './routes/learn.js';
import contestsRouter from './routes/contests.js';
import leaderboardRouter from './routes/leaderboard.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.CLIENT_URL, credentials: true },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/learn', learnRouter);
app.use('/api/contests', contestsRouter);
app.use('/api/leaderboard', leaderboardRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Socket.io
const contestNamespace = io.of('/contest');
contestNamespace.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);
  registerContestHandlers(contestNamespace, socket);
});

// Error handler
app.use(errorHandler);

async function start() {
  await connectDB();
  httpServer.listen(Number(env.PORT), () => {
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
  });
}

start();
