-- Authenticated, cursor-based catalog pull for multi-device reconciliation.
create or replace function public.pull_catalog_changes(
  p_shop_id uuid,
  p_after_cursor bigint default 0,
  p_limit integer default 200
)
returns table(cursor_id bigint, entity_type text, entity_id uuid, operation text, changed_at timestamptz, record jsonb)
language sql stable security definer set search_path = '' as $$
  select e.cursor_id, e.entity_type, e.entity_id, e.operation, e.changed_at, e.record
  from public.shop_change_events e
  where e.shop_id = p_shop_id
    and e.cursor_id > greatest(coalesce(p_after_cursor, 0), 0)
    and e.entity_type in ('categories', 'items')
    and public.has_shop_role(p_shop_id)
  order by e.cursor_id asc
  limit least(greatest(coalesce(p_limit, 200), 1), 200);
$$;
grant execute on function public.pull_catalog_changes(uuid, bigint, integer) to authenticated;
