// This file configures the Express application and API routes.
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import opportunityRoutes from './routes/opportunityRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import organisationRoutes from './routes/organisationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler, notFound } from './middleware/errors.js';
import mongoose from 'mongoose';

const app = express();
// These middleware functions allow the frontend, JSON bodies, and request logs.
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// The health route shows whether Express and MongoDB are ready.
app.get('/api/health', async (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable', service: 'Volunteer Nepal API', database: 'MongoDB', region: 'Nepal' });
});
// Each route group handles one part of the application.
app.use('/api/auth', authRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organisations', organisationRoutes);
app.use('/api/notifications', notificationRoutes);
// These two handlers run only when no route matched or an error occurred.
app.use(notFound);
app.use(errorHandler);

export default app;
