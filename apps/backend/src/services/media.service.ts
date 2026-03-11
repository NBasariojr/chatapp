// backend/src/services/media.service.ts
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(url, key);
};

const BUCKET = process.env.SUPABASE_BUCKET || 'chatapp-media';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
}

/**
 * Upload a file buffer to Supabase Storage
 */
export const uploadMedia = async (
  file: Express.Multer.File,
  userId: string
): Promise<UploadResult> => {
  const supabase = getSupabase();

  // Sanitize filename to prevent path traversal
  const ext = file.originalname.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  return {
    url: urlData.publicUrl,
    path: filename,
    size: file.size,
    type: file.mimetype,
  };
};

/**
 * Delete a file from Supabase Storage
 */
export const deleteMedia = async (path: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.warn(`Failed to delete media at ${path}:`, error.message);
  }
};