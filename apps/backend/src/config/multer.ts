import multer from 'multer';
import { BadRequestError } from '../utils/errors';

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
      // BadRequestError maps to 400 — plain Error would produce a 500
      cb(new BadRequestError(`File type ${file.mimetype} not allowed`));
    }
  },
});

/**
 * Validates actual file content using magic bytes.
 * file-type v21 is ESM-only — must be dynamically imported in CommonJS context.
 */
export const validateFileContent = async (
  buffer: Buffer,
  originalMimetype: string,
): Promise<void> => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'application/pdf',
    'text/plain',
  ];

  // Dynamic import required — file-type v21+ is pure ESM
  const { fileTypeFromBuffer } = await import('file-type');
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType) {
    // file-type returns undefined for plain text — validate as UTF-8 fallback
    if (originalMimetype === 'text/plain') {
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        return; // valid UTF-8 text — accept it
      } catch {
        throw new BadRequestError('File declared as text/plain but contains invalid UTF-8');
      }
    }
    throw new BadRequestError('Unable to determine file type from content');
  }

  const detected = fileType.mime;

  if (!allowed.includes(detected)) {
    throw new BadRequestError(`File type ${detected} not allowed`);
  }

  if (detected !== originalMimetype) {
    throw new BadRequestError(
      `Declared type ${originalMimetype} does not match detected type ${detected}`,
    );
  }
};
