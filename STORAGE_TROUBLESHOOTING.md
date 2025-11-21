# Storage Upload Fehler beheben

## Problem
```
Error: new row violates row-level security policy
Status: 403
```

## Ursache
Die Row-Level Security (RLS) Policies in Supabase erlauben dem User nicht, Dateien hochzuladen.

## Lösung

### Schritt 1: Prüfe die Supabase Storage Policies

1. Gehe zu deinem Supabase Dashboard
2. Navigiere zu **Storage** → **Policies**
3. Wähle den Bucket `chat-attachments` aus
4. Prüfe, ob die Policies existieren und aktiviert sind

### Schritt 2: Führe das aktualisierte SQL-Script aus

1. Öffne den **SQL Editor** in Supabase
2. Kopiere den Inhalt von `SUPABASE_STORAGE_SETUP.sql`
3. Führe das Script aus
4. Das Script löscht zuerst alle alten Policies und erstellt sie neu

### Schritt 3: Prüfe die Authentifizierung

Der Fehler tritt auf, wenn:
- Der User nicht authentifiziert ist
- Die Supabase Session abgelaufen ist
- Der Supabase Client nicht korrekt initialisiert ist

**Prüfe in der Browser-Konsole:**
```javascript
// Prüfe ob User authentifiziert ist
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

### Schritt 4: Alternative Lösung (Falls nichts anderes funktioniert)

Wenn du möchtest, dass **ALLE** User (auch nicht-authentifizierte) Dateien hochladen können:

1. Öffne den SQL Editor in Supabase
2. Führe dieses SQL aus:

```sql
-- Lösche die alte Policy
DROP POLICY IF EXISTS "Allow authenticated users to upload chat files" ON storage.objects;

-- Erlaube ALLEN Usern Upload
CREATE POLICY "Allow all users to upload chat files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'chat-attachments');
```

⚠️ **Warnung:** Dies ist weniger sicher, da jeder Dateien hochladen kann!

### Schritt 5: Teste den Upload

1. Lade die App neu
2. Versuche eine Datei hochzuladen
3. Prüfe die Browser-Konsole auf Fehler

## Weitere Debugging-Schritte

### Prüfe den Bucket
```sql
SELECT * FROM storage.buckets WHERE id = 'chat-attachments';
```

### Prüfe alle Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

### Prüfe ob RLS aktiviert ist
```sql
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'objects' AND relnamespace = 'storage'::regnamespace;
```

## Häufige Fehler

1. **Bucket existiert nicht**: Stelle sicher, dass der Bucket `chat-attachments` existiert
2. **Policies nicht aktiviert**: Policies müssen in Supabase aktiviert sein
3. **Session abgelaufen**: User muss sich neu einloggen
4. **Falscher Bucket-Name**: Prüfe ob der Bucket-Name in `fileUpload.ts` korrekt ist (`chat-attachments`)
