// backend/src/routes/message.routes.ts
import { Router } from 'express';
import { getMessages, sendMessage, deleteMessage } from '../controllers/message.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

router.get('/:roomId', getMessages);
router.post('/:roomId', sendMessage);
router.delete('/:messageId', deleteMessage);

export default router;