import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const BUCKET_NAME = 'cluco-vault';

/**
 * Uploads a file to Supabase Storage
 * @param path e.g. "user_123/documents/contract.pdf"
 * @param fileBuffer The file data
 * @param contentType Optional content type
 */
export async function uploadFile(path: string, fileBuffer: Buffer, contentType?: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, fileBuffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error('Error uploading file to Supabase:', error);
    throw error;
  }
  return data.path;
}

/**
 * Downloads a file from Supabase Storage
 */
export async function downloadFile(path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error) {
    console.error('Error downloading file from Supabase:', error);
    throw error;
  }
  
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Gets a public URL for the file if the bucket is public
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Gets a secure, temporary signed URL for downloading a file
 * @param path The path of the file in the bucket
 * @param expiresIn Time in seconds until the link expires (default 60s)
 */
export async function getSignedDownloadUrl(path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, expiresIn, {
    download: true
  });
  if (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
  return data.signedUrl;
}

/**
 * Deletes a file from Supabase Storage
 */
export async function deleteFile(path: string) {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  if (error) {
    console.error('Error deleting file from Supabase:', error);
    throw error;
  }
}
