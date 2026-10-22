import { Router } from 'express';
import { register, login, getMe, updateAvatar } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.post('/avatar', authenticateToken, upload.single('image'), updateAvatar);

export default router;

