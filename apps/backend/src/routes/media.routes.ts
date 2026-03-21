// backend/src/routes/media.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/media.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

// Store files in memory (buffer) for Supabase upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

router.post('/upload', authenticate, upload.single('file'), uploadFile);

export default router;