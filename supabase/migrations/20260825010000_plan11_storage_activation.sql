-- Plan 11.1 — Live production activation: Supabase private storage bootstrap.
--
-- Apply after all Plans 3–9 migrations.
-- This migration is safe to apply independently to separate WRS staging and
-- production Supabase projects. Both projects intentionally use the same
-- logical private bucket name because project isolation supplies the
-- environment boundary.
--
-- IMPORTANT:
-- - This bucket must remain private.
-- - Browser clients do not receive direct bucket policies. Upload/download
--   access is mediated by server-generated signed URLs using the server-side
--   Supabase secret/service-role key.
-- - Malware/quality scan results are recorded in the application tables from
--   Plan 6 and must be processed before submitted assets become eligible for
--   downstream use.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'wrs-private-data',
  'wrs-private-data',
  false,
  52428800,
  array[
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/webm',
    'video/mp4',
    'application/json',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Keep direct browser access fail-closed. The service-role key bypasses RLS
-- for the server-side signed-URL and deletion flows. No broad authenticated or
-- anonymous policy is created for this bucket.

commit;
