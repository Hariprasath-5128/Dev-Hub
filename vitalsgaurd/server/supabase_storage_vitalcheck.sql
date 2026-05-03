-- Supabase SQL Commands to create the 'VitalCheck' storage bucket

-- 1. Insert the bucket configuration into the storage.buckets table
INSERT INTO storage.buckets (id, name, public)
VALUES ('VitalCheck', 'VitalCheck', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public access to read files (if needed)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'VitalCheck' );

-- 3. Allow anonymous uploads (Optional but usually needed)
CREATE POLICY "Allow anonymous uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'VitalCheck' );

-- 4. Allow anonymous deletes/updates (Optional)
CREATE POLICY "Allow anonymous update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'VitalCheck' );

CREATE POLICY "Allow anonymous delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'VitalCheck' );
