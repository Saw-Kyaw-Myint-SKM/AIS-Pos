-- Offline-first POS foundation. Apply with `supabase db push` after linking this project.
create extension if not exists pgcrypto;

create type public.shop_role as enum ('admin', 'staff');

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_members (
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.shop_role not null default 'staff',
  must_change_password boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);
create index if not exists idx_shop_members_user_id on public.shop_members(user_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null, color text not null default '#4F46E5', position integer not null default 0,
  deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (shop_id, name)
);
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null, qr_code text, name text not null, size text not null default '',
  price numeric(14,2) not null check (price >= 0), purchase_cost numeric(14,2) not null default 0 check (purchase_cost >= 0),
  stock integer not null default 0 check (stock >= 0), choice_type text not null default 'color', color_value text not null default '',
  photo_storage_path text not null default '', note text not null default '', deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (shop_id, qr_code)
);
create index if not exists idx_items_shop_id on public.items(shop_id);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null, phone text not null default '', address text not null default '', deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  total numeric(14,2) not null, tax_amount numeric(14,2) not null default 0, tax_reason text not null default '',
  discount_amount numeric(14,2) not null default 0, discount_reason text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id) on delete cascade,
  item_id uuid, name text not null, size text not null default '', price numeric(14,2) not null, cost_price numeric(14,2) not null default 0,
  quantity integer not null check (quantity > 0)
);
create table if not exists public.sync_operations (
  operation_id text primary key, shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id), operation_type text not null, status text not null,
  response jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), completed_at timestamptz
);

create or replace function public.is_shop_member(p_shop_id uuid, p_required_role public.shop_role default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shop_members m
    where m.shop_id = p_shop_id and m.user_id = (select auth.uid()) and m.active
      and (p_required_role is null or m.role = p_required_role)
  );
$$;

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sync_operations enable row level security;

create policy "members read shops" on public.shops for select to authenticated using (public.is_shop_member(id));
create policy "members read memberships" on public.shop_members for select to authenticated using (user_id = (select auth.uid()) or public.is_shop_member(shop_id, 'admin'));
create policy "members read categories" on public.categories for select to authenticated using (public.is_shop_member(shop_id));
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_shop_member(shop_id, 'admin')) with check (public.is_shop_member(shop_id, 'admin'));
create policy "members read items" on public.items for select to authenticated using (public.is_shop_member(shop_id));
create policy "admins manage items" on public.items for all to authenticated using (public.is_shop_member(shop_id, 'admin')) with check (public.is_shop_member(shop_id, 'admin'));
create policy "members read customers" on public.customers for select to authenticated using (public.is_shop_member(shop_id));
create policy "admins manage customers" on public.customers for all to authenticated using (public.is_shop_member(shop_id, 'admin')) with check (public.is_shop_member(shop_id, 'admin'));
create policy "members read sales" on public.sales for select to authenticated using (public.is_shop_member(shop_id));
create policy "members read sale items" on public.sale_items for select to authenticated using (exists (select 1 from public.sales s where s.id = sale_id and public.is_shop_member(s.shop_id)));

create or replace function public.apply_sync_operation(p_operation_id text, p_operation_type text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_shop_id uuid; v_existing jsonb; v_item jsonb; v_sale_id uuid; v_line jsonb;
begin
  select shop_id into v_shop_id from public.shop_members where user_id = (select auth.uid()) and active limit 1;
  if v_shop_id is null then raise exception 'SHOP_MEMBERSHIP_REQUIRED'; end if;
  select response into v_existing from public.sync_operations where operation_id = p_operation_id and shop_id = v_shop_id;
  if v_existing is not null then return v_existing; end if;

  if p_operation_type = 'sale_create' then
    insert into public.sales (shop_id, total, tax_amount, tax_reason, discount_amount, discount_reason)
    values (v_shop_id, (p_payload->>'total')::numeric, coalesce((p_payload->>'taxAmount')::numeric, 0), coalesce(p_payload->>'taxReason',''), coalesce((p_payload->>'discountAmount')::numeric, 0), coalesce(p_payload->>'discountReason','')) returning id into v_sale_id;
    for v_line in select value from jsonb_array_elements(coalesce(p_payload->'lines', '[]'::jsonb)) loop
      update public.items set stock = stock - (v_line->>'quantity')::integer, updated_at = now()
       where id = (v_line->>'itemId')::uuid and shop_id = v_shop_id and stock >= (v_line->>'quantity')::integer;
      if not found then
        raise exception 'INSUFFICIENT_STOCK';
      end if;
      insert into public.sale_items (sale_id, item_id, name, size, price, cost_price, quantity)
      values (v_sale_id, (v_line->>'itemId')::uuid, v_line->>'name', coalesce(v_line->>'size',''), (v_line->>'price')::numeric, coalesce((v_line->>'costPrice')::numeric,0), (v_line->>'quantity')::integer);
    end loop;
    v_existing := jsonb_build_object('status', 'completed', 'saleId', v_sale_id);
  elsif p_operation_type = 'local_bootstrap' then
    if not public.is_shop_member(v_shop_id, 'admin') then raise exception 'ADMIN_REQUIRED'; end if;
    v_existing := jsonb_build_object('status', 'accepted', 'message', 'Bootstrap payload accepted. Upload entities in dependency order.');
  else
    raise exception 'UNSUPPORTED_OPERATION:%', p_operation_type;
  end if;

  insert into public.sync_operations (operation_id, shop_id, user_id, operation_type, status, response, completed_at)
  values (p_operation_id, v_shop_id, (select auth.uid()), p_operation_type, 'completed', v_existing, now());
  return v_existing;
exception when others then
  if sqlerrm = 'INSUFFICIENT_STOCK' then return jsonb_build_object('status', 'conflict', 'error_code', 'INSUFFICIENT_STOCK'); end if;
  raise;
end;
$$;

grant execute on function public.apply_sync_operation(text, text, jsonb) to authenticated;

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', false) on conflict (id) do nothing;
create policy "members read product images" on storage.objects for select to authenticated using (
  bucket_id = 'product-images' and public.is_shop_member((storage.foldername(name))[1]::uuid)
);
create policy "admins upload product images" on storage.objects for insert to authenticated with check (
  bucket_id = 'product-images' and public.is_shop_member((storage.foldername(name))[1]::uuid, 'admin')
);
create policy "admins update product images" on storage.objects for update to authenticated using (
  bucket_id = 'product-images' and public.is_shop_member((storage.foldername(name))[1]::uuid, 'admin')
);
create policy "admins delete product images" on storage.objects for delete to authenticated using (
  bucket_id = 'product-images' and public.is_shop_member((storage.foldername(name))[1]::uuid, 'admin')
);
