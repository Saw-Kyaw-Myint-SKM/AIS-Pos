-- Serializes first-owner provisioning for one dedicated Supabase project.
-- Edge Functions use the service role and therefore bypass RLS; mobile clients have no policy access.
create table if not exists public.owner_bootstrap_guard (
  id boolean primary key default true check (id),
  created_at timestamptz not null default now()
);
alter table public.owner_bootstrap_guard enable row level security;
