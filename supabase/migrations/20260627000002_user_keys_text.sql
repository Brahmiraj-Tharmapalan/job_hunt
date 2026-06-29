-- Step 4 prep: store encrypted BYO keys as base64 TEXT instead of bytea.
-- bytea is awkward to write through supabase-js/PostgREST; base64 text is
-- simpler and equally secure (the value is still AES-256-GCM ciphertext).
-- The columns are empty at this point, so the type change is a no-op on data.

alter table public.user_keys
  alter column gemini_key_enc type text using gemini_key_enc::text,
  alter column gemini_key_iv  type text using gemini_key_iv::text,
  alter column gemini_key_tag type text using gemini_key_tag::text,
  alter column apify_key_enc  type text using apify_key_enc::text,
  alter column apify_key_iv   type text using apify_key_iv::text,
  alter column apify_key_tag  type text using apify_key_tag::text;
