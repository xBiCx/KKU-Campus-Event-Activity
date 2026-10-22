import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import notifRoutes from './routes/notifRoutes.js';
import { startEventReminderScheduler } from './services/reminderService.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded photos
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'KKU Campus Event Activity Notification API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
// Compatibility alias with previous routes
app.use('/api/items', eventRoutes);
app.use('/api/notifications', notifRoutes);

// Error Handling Middleware
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
    });
  }
);

// Start pre-event reminder scheduler
startEventReminderScheduler();

// Listen on 0.0.0.0 so devices on local Wi-Fi can connect
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 KKU Campus Event Activity API Server`);
  console.log(`📡 Local:   http://localhost:${PORT}`);
  console.log(`📡 Network: http://${process.env.SERVER_URL || '10.112.142.249'}:${PORT}`);
  console.log(`===============================================`);
});
