import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
  getMyEvents,
  getMyRegisteredEvents,
  registerForEvent,
  deleteEvent,
} from '../controllers/eventController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/my', authenticateToken, getMyEvents);
router.get('/registered', authenticateToken, getMyRegisteredEvents);
router.get('/:id', (req, res, next) => {
  // Optional auth to check registration status
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    return authenticateToken(req as any, res, next);
  }
  next();
}, getEventById);

// Protected routes
router.post('/', authenticateToken, upload.single('image'), createEvent);
router.put('/:id', authenticateToken, upload.single('image'), updateEvent);
router.patch('/:id', authenticateToken, upload.single('image'), updateEvent);
router.post('/:id/register', authenticateToken, registerForEvent);
router.patch('/:id/status', authenticateToken, updateEventStatus);
router.delete('/:id', authenticateToken, deleteEvent);

export default router;
