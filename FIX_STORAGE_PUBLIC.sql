-- SCHNELLE LÖSUNG: Mache den Bucket öffentlich und erlaube allen Zugriff
-- Führe dies im Supabase SQL Editor aus

-- 1. Mache den Bucket öffentlich
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-attachments';

-- 2. Lösche alle alten Policies
DROP POLICY IF EXISTS "Allow authenticated users to upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all users to upload chat files" ON storage.objects;

-- 3. Erlaube ALLEN Upload (auch nicht-authentifizierte User)
CREATE POLICY "Allow all users to upload chat files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'chat-attachments');

-- 4. Erlaube ALLEN Download (public read)
CREATE POLICY "Allow public read access to chat files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- 5. Erlaube ALLEN Delete
CREATE POLICY "Allow all users to delete chat files"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'chat-attachments');

-- 6. Erlaube ALLEN Update
CREATE POLICY "Allow all users to update chat files"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'chat-attachments');

-- Prüfe ob es funktioniert hat:
SELECT id, name, public FROM storage.buckets WHERE id = 'chat-attachments';
