-- Create Storage Bucket for Chat Attachments
-- Run this in your Supabase SQL Editor

-- WICHTIG: Zuerst alle alten Policies löschen, falls sie existieren
DROP POLICY IF EXISTS "Allow authenticated users to upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own chat files" ON storage.objects;

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow ALL authenticated users to upload files (keine zusätzlichen Checks)
CREATE POLICY "Allow authenticated users to upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow everyone to read/download files (public bucket)
CREATE POLICY "Allow public read access to chat files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Allow ALL authenticated users to delete files (nicht nur eigene)
CREATE POLICY "Allow users to delete their own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments');

-- Allow ALL authenticated users to update files (nicht nur eigene)
CREATE POLICY "Allow users to update their own chat files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-attachments');

-- ALTERNATIVE: Wenn das immer noch nicht funktioniert, kannst du diese Policy verwenden
-- die ALLEN (auch nicht-authentifizierten) Usern Upload erlaubt:
-- 
-- DROP POLICY IF EXISTS "Allow authenticated users to upload chat files" ON storage.objects;
-- 
-- CREATE POLICY "Allow all users to upload chat files"
-- ON storage.objects FOR INSERT
-- TO public
-- WITH CHECK (bucket_id = 'chat-attachments');
