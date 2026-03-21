// backend/src/routes/room.routes.ts
import { Router } from 'express';
import { getRooms, createRoom, getRoomById } from '../controllers/room.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);
router.get('/', getRooms);
router.post('/', createRoom);
router.get('/:roomId', getRoomById);

export default router;