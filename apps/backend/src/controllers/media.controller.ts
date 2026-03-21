import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { uploadMedia } from '../services/media.service';

// Upload file to Supabase storage
export const uploadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const result = await uploadMedia(req.file, req.user._id);

    res.status(201).json({
      success: true,
      data: result,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
};
