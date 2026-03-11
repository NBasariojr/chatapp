// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;