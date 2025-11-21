import { supabase } from './supabaseClient';
import { ChatAttachment } from '../types';

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param channelId - The channel ID for organizing files
 * @returns The uploaded file's attachment data
 */
export const uploadChatFile = async (
  file: File,
  channelId: string,
  onProgress?: (progress: number) => void
): Promise<ChatAttachment> => {
  try {
    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const filePath = `chat-files/${channelId}/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Upload fehlgeschlagen: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    // Create attachment object
    const attachment: ChatAttachment = {
      id: `${timestamp}_${randomString}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: urlData.publicUrl,
    };

    return attachment;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of files to upload
 * @param channelId - The channel ID for organizing files
 * @param onProgress - Optional progress callback
 * @returns Array of uploaded attachments
 */
export const uploadChatFiles = async (
  files: File[],
  channelId: string,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<ChatAttachment[]> => {
  const attachments: ChatAttachment[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const attachment = await uploadChatFile(file, channelId, (progress) => {
        if (onProgress) {
          onProgress(i, progress);
        }
      });
      attachments.push(attachment);
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      throw error;
    }
  }

  return attachments;
};

/**
 * Delete a file from Supabase Storage
 * @param fileUrl - The public URL of the file
 */
export const deleteChatFile = async (fileUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = fileUrl.split('/chat-attachments/');
    if (urlParts.length < 2) {
      throw new Error('Invalid file URL');
    }
    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('chat-attachments')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error(`Löschen fehlgeschlagen: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Get file icon based on file type
 * @param fileType - MIME type of the file
 * @returns Icon name or emoji
 */
export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return '📦';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
  if (fileType.includes('text')) return '📃';
  return '📎';
};

/**
 * Check if file is an image
 * @param fileType - MIME type of the file
 */
export const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/');
};

/**
 * Check if file is a video
 * @param fileType - MIME type of the file
 */
export const isVideoFile = (fileType: string): boolean => {
  return fileType.startsWith('video/');
};

/**
 * Check if file is an audio
 * @param fileType - MIME type of the file
 */
export const isAudioFile = (fileType: string): boolean => {
  return fileType.startsWith('audio/');
};
