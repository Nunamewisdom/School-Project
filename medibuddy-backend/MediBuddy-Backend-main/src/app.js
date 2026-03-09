import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { requestLogger, errorHandler, notFoundHandler, generalLimiter, syncLimiter } from './middleware/index.js';

// Import routes
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import syncRoutes from './routes/sync.js';
import healthRoutes from './routes/health.js';
import pushRoutes from './routes/push.js';
import appointmentRoutes from './routes/appointments.js';
import healthMetricRoutes from './routes/healthMetrics.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import docsRouter from './docs.js';

/**
 * Express Application
 * 
 * Configured per BACKEND_SKILL.md with security middleware,
 * logging, and route mounting.
 */
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}));

// Rate limiting
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Routes — all under /api prefix for consistency
app.use('/docs', docsRouter);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/sync', syncLimiter, syncRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/health-metrics', healthMetricRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
