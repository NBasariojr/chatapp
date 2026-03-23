// backend/src/routes/media.routes.ts
import { Router } from 'express';
import { upload } from '../config/multer';
import { uploadFile } from '../controllers/media.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

router.post('/upload', authenticate, upload.single('file'), uploadFile);

export default router;