// backend/src/routes/media.routes.ts
import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { uploadMedia } from '../services/media.service';

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

router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const result = await uploadMedia(req.file, req.user!._id);

    res.status(201).json({
      success: true,
      data: result,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;