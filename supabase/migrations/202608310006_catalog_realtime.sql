-- Realtime only wakes clients up. Cursor-based pull_catalog_changes remains the
-- authoritative reconciliation mechanism, including deletes and missed events.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shop_change_events'
  ) then
    alter publication supabase_realtime add table public.shop_change_events;
  end if;
end $$;
