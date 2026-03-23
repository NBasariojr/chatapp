import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { uploadMedia } from '../services/media.service';
import { validateFileContent } from '../config/multer';
import { BadRequestError, UnauthorizedError } from '../utils/errors';

// Upload file to Supabase storage
export const uploadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Validate actual file content using magic bytes
    await validateFileContent(req.file.buffer, req.file.mimetype);

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
