import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

// Store files in memory (buffer) for Supabase upload
export const upload = multer({
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

// Validate actual file content using magic bytes
export const validateFileContent = async (buffer: Buffer, originalMimetype: string): Promise<void> => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf'];
  
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      throw new Error('Unable to determine file type');
    }
    
    const detectedMimetype = fileType.mime;
    
    if (!allowed.includes(detectedMimetype)) {
      throw new Error(`File type ${detectedMimetype} not allowed`);
    }
    
    // Optional: Ensure detected type matches declared type
    if (detectedMimetype !== originalMimetype) {
      throw new Error(`Declared file type ${originalMimetype} does not match detected type ${detectedMimetype}`);
    }
  } catch (error) {
    throw new Error(`File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
