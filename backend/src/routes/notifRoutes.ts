import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  triggerTestNotification,
} from '../controllers/notifController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// Test notification route (can be triggered with or without auth token)
router.post('/test', triggerTestNotification);

// Authenticated routes
router.use(authenticateToken);
router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;
