-- Create Storage Bucket for Chat Attachments
-- Run this in your Supabase SQL Editor

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow everyone to read/download files (public bucket)
CREATE POLICY "Allow public read access to chat files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete their own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments');

-- Allow users to update their own uploaded files
CREATE POLICY "Allow users to update their own chat files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-attachments');
