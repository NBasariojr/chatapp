// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import {
  getStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getRooms,
  deleteRoom,
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate, requireRole('admin'));
router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);
router.get('/rooms', getRooms);
router.delete('/rooms/:roomId', deleteRoom);

export default router;