-- Owner/Admin/Staff offline-first foundation (additive follow-up migration).
-- DEPLOYMENT PREREQUISITE: Link this repository to the single dedicated Supabase
-- project selected by one shop, then apply with `supabase db push`. Do not run
-- this from the mobile app. The app uses only the publishable key; service-role
-- credentials belong exclusively in Edge Function secrets and must never be
-- placed in app configuration, backups, requests, or client-side code.
--
-- This migration deliberately does not drop prior prototype objects or user data.
-- It upgrades the prototype in place and creates only additive tables/functions.

create extension if not exists pgcrypto;

do $$ begin
  alter type public.shop_role add value if not exists 'owner' before 'admin';
exception when undefined_object then
  create type public.shop_role as enum ('owner', 'admin', 'staff');
end $$;

alter table public.shops add column if not exists updated_at timestamptz not null default now();
alter table public.categories add column if not exists deleted_at timestamptz;
alter table public.items add column if not exists photo_storage_path text not null default '';
alter table public.customers add column if not exists deleted_at timestamptz;
alter table public.sales add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.sales add column if not exists deleted_at timestamptz;
alter table public.sales add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.shop_profiles (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  phone text not null default '', email text not null default '', address text not null default '',
  deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.credit_sales (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  sale_id uuid not null unique references public.sales(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  original_total numeric(14,2) not null check (original_total >= 0), paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  settled_at timestamptz, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (paid_amount <= original_total)
);
create table if not exists public.app_settings (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.shop_change_events (
  cursor_id bigint generated always as identity primary key, shop_id uuid not null references public.shops(id) on delete cascade,
  entity_type text not null, entity_id uuid not null, operation text not null check (operation in ('upsert', 'delete')),
  changed_at timestamptz not null default now(), changed_by uuid references auth.users(id) on delete set null,
  record jsonb not null default '{}'::jsonb
);
create table if not exists public.audit_records (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null, action text not null, target_type text not null,
  target_id text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists idx_shop_members_active_user on public.shop_members(user_id, active, shop_id);
create index if not exists idx_shop_members_shop_role_active on public.shop_members(shop_id, role, active);
create index if not exists idx_categories_shop_changed on public.categories(shop_id, updated_at) where deleted_at is null;
create index if not exists idx_items_shop_changed on public.items(shop_id, updated_at) where deleted_at is null;
create index if not exists idx_customers_shop_changed on public.customers(shop_id, updated_at) where deleted_at is null;
create index if not exists idx_sales_shop_created on public.sales(shop_id, created_at desc);
create index if not exists idx_credit_sales_shop_changed on public.credit_sales(shop_id, updated_at) where deleted_at is null;
create index if not exists idx_change_events_shop_cursor on public.shop_change_events(shop_id, cursor_id);
create index if not exists idx_audit_records_shop_created on public.audit_records(shop_id, created_at desc);
create index if not exists idx_sync_operations_shop_created on public.sync_operations(shop_id, created_at);

create or replace function public.has_shop_role(p_shop_id uuid, p_roles text[] default array['owner','admin','staff'])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shop_members m where m.shop_id = p_shop_id and m.user_id = (select auth.uid()) and m.active and m.role::text = any(p_roles));
$$;

create or replace function public.is_shop_owner(p_shop_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$ select public.has_shop_role(p_shop_id, array['owner']); $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql security definer set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.record_shop_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_row jsonb; v_id uuid; v_operation text;
begin
  if tg_op = 'DELETE' then v_row := to_jsonb(old); v_id := old.id; v_operation := 'delete';
  else v_row := to_jsonb(new); v_id := new.id; v_operation := case when new.deleted_at is null then 'upsert' else 'delete' end; end if;
  insert into public.shop_change_events (shop_id, entity_type, entity_id, operation, changed_by, record)
  values (coalesce(new.shop_id, old.shop_id), tg_table_name, v_id, v_operation, (select auth.uid()), v_row);
  return null; -- return value is ignored by AFTER triggers.
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'categories_touch_updated_at') then create trigger categories_touch_updated_at before update on public.categories for each row execute function public.touch_updated_at(); end if;
  if not exists (select 1 from pg_trigger where tgname = 'items_touch_updated_at') then create trigger items_touch_updated_at before update on public.items for each row execute function public.touch_updated_at(); end if;
  if not exists (select 1 from pg_trigger where tgname = 'customers_touch_updated_at') then create trigger customers_touch_updated_at before update on public.customers for each row execute function public.touch_updated_at(); end if;
  if not exists (select 1 from pg_trigger where tgname = 'sales_touch_updated_at') then create trigger sales_touch_updated_at before update on public.sales for each row execute function public.touch_updated_at(); end if;
  if not exists (select 1 from pg_trigger where tgname = 'credit_sales_touch_updated_at') then create trigger credit_sales_touch_updated_at before update on public.credit_sales for each row execute function public.touch_updated_at(); end if;
  if not exists (select 1 from pg_trigger where tgname = 'app_settings_touch_updated_at') then create trigger app_settings_touch_updated_at before update on public.app_settings for each row execute function public.touch_updated_at(); end if;
  if not exists (select 1 from pg_trigger where tgname = 'categories_change_event') then create trigger categories_change_event after insert or update or delete on public.categories for each row execute function public.record_shop_change(); end if;
  if not exists (select 1 from pg_trigger where tgname = 'items_change_event') then create trigger items_change_event after insert or update or delete on public.items for each row execute function public.record_shop_change(); end if;
  if not exists (select 1 from pg_trigger where tgname = 'customers_change_event') then create trigger customers_change_event after insert or update or delete on public.customers for each row execute function public.record_shop_change(); end if;
  if not exists (select 1 from pg_trigger where tgname = 'sales_change_event') then create trigger sales_change_event after insert or update or delete on public.sales for each row execute function public.record_shop_change(); end if;
end $$;

-- All active roles can perform normal POS catalog/customer work. Account/project,
-- migration and conflict authority remains Owner-only through privileged RPCs/functions.
alter table public.shop_profiles enable row level security;
alter table public.credit_sales enable row level security;
alter table public.app_settings enable row level security;
alter table public.shop_change_events enable row level security;
alter table public.audit_records enable row level security;

drop policy if exists "members read shops" on public.shops;
drop policy if exists "members read memberships" on public.shop_members;
drop policy if exists "members read categories" on public.categories;
drop policy if exists "admins manage categories" on public.categories;
drop policy if exists "members read items" on public.items;
drop policy if exists "admins manage items" on public.items;
drop policy if exists "members read customers" on public.customers;
drop policy if exists "admins manage customers" on public.customers;
drop policy if exists "members read sales" on public.sales;
drop policy if exists "members read sale items" on public.sale_items;
create policy "members read shops" on public.shops for select to authenticated using (public.has_shop_role(id));
create policy "members read memberships" on public.shop_members for select to authenticated using (user_id = (select auth.uid()) or public.has_shop_role(shop_id, array['owner','admin']));
create policy "members manage categories" on public.categories for all to authenticated using (public.has_shop_role(shop_id)) with check (public.has_shop_role(shop_id));
create policy "members manage items" on public.items for all to authenticated using (public.has_shop_role(shop_id)) with check (public.has_shop_role(shop_id));
create policy "members manage customers" on public.customers for all to authenticated using (public.has_shop_role(shop_id)) with check (public.has_shop_role(shop_id));
create policy "members read sales" on public.sales for select to authenticated using (public.has_shop_role(shop_id));
create policy "members read sale items" on public.sale_items for select to authenticated using (exists (select 1 from public.sales s where s.id = sale_id and public.has_shop_role(s.shop_id)));
create policy "members read profiles" on public.shop_profiles for select to authenticated using (public.has_shop_role(shop_id));
create policy "owner manages profiles" on public.shop_profiles for all to authenticated using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));
create policy "members read credit sales" on public.credit_sales for select to authenticated using (public.has_shop_role(shop_id));
create policy "owner manages settings" on public.app_settings for all to authenticated using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));
create policy "members read changes" on public.shop_change_events for select to authenticated using (public.has_shop_role(shop_id));
create policy "owner reads audits" on public.audit_records for select to authenticated using (public.is_shop_owner(shop_id));

-- Private Storage: every object name must start with the owning shop UUID,
-- e.g. <shop-id>/<item-id>/<image-id>.jpg. The client never receives bucket-wide access.
drop policy if exists "members read product images" on storage.objects;
drop policy if exists "admins upload product images" on storage.objects;
drop policy if exists "admins update product images" on storage.objects;
drop policy if exists "admins delete product images" on storage.objects;
create policy "members read product images" on storage.objects for select to authenticated using (bucket_id = 'product-images' and public.has_shop_role((storage.foldername(name))[1]::uuid));
create policy "members upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.has_shop_role((storage.foldername(name))[1]::uuid));
create policy "members update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.has_shop_role((storage.foldername(name))[1]::uuid)) with check (bucket_id = 'product-images' and public.has_shop_role((storage.foldername(name))[1]::uuid));
create policy "members delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.has_shop_role((storage.foldername(name))[1]::uuid));

create or replace function public.get_backend_readiness()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('status', 'READY_SCHEMA', 'schema_version', 2, 'storage_bucket', 'product-images');
$$;
grant execute on function public.get_backend_readiness() to anon, authenticated;

create or replace function public.apply_sync_operation(p_operation_id text, p_operation_type text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_shop_id uuid; v_role text; v_response jsonb; v_sale_id uuid; v_total numeric(14,2) := 0;
  v_line jsonb; v_item record; v_requested integer; v_customer_id uuid; v_id uuid; v_name text;
begin
  if p_operation_id is null or p_operation_id !~ '^[0-9a-fA-F-]{16,64}$' then return jsonb_build_object('status','validation_error','error_code','OPERATION_ID_REQUIRED'); end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or nullif(p_payload->>'shopId','') is null then return jsonb_build_object('status','validation_error','error_code','SHOP_ID_REQUIRED'); end if;
  begin v_shop_id := (p_payload->>'shopId')::uuid; exception when invalid_text_representation then return jsonb_build_object('status','validation_error','error_code','INVALID_SHOP_ID'); end;
  select role::text into v_role from public.shop_members where shop_id = v_shop_id and user_id = (select auth.uid()) and active;
  if v_role is null then return jsonb_build_object('status','forbidden','error_code','ACTIVE_MEMBERSHIP_REQUIRED'); end if;
  select response into v_response from public.sync_operations where operation_id = p_operation_id and shop_id = v_shop_id;
  if found then return v_response; end if;

  if p_operation_type = 'local_bootstrap' then
    if v_role <> 'owner' then return jsonb_build_object('status','forbidden','error_code','OWNER_REQUIRED'); end if;
    v_response := jsonb_build_object('status','accepted','code','BOOTSTRAP_MANIFEST_REQUIRED','message','Local entity mappings and migration checkpoints are not implemented by this RPC.');
  elsif p_operation_type = 'sale_create' then
    if jsonb_typeof(p_payload->'lines') <> 'array' or jsonb_array_length(p_payload->'lines') = 0 then return jsonb_build_object('status','validation_error','error_code','SALE_LINES_REQUIRED'); end if;
    -- Group before locking so duplicate item lines cannot bypass stock validation.
    for v_line in select value from jsonb_array_elements(p_payload->'lines') loop
      begin v_id := (v_line->>'itemId')::uuid; v_requested := (v_line->>'quantity')::integer; exception when others then return jsonb_build_object('status','validation_error','error_code','REMOTE_UUID_ITEM_ID_AND_POSITIVE_QUANTITY_REQUIRED'); end;
      if v_requested <= 0 then return jsonb_build_object('status','validation_error','error_code','REMOTE_UUID_ITEM_ID_AND_POSITIVE_QUANTITY_REQUIRED'); end if;
    end loop;
    for v_item in select i.* , q.quantity from public.items i join (select (value->>'itemId')::uuid item_id, sum((value->>'quantity')::integer) quantity from jsonb_array_elements(p_payload->'lines') group by 1) q on q.item_id = i.id where i.shop_id = v_shop_id and i.deleted_at is null order by i.id for update loop
      if v_item.stock < v_item.quantity then
        v_response := jsonb_build_object('status','conflict','error_code','INSUFFICIENT_STOCK','server_state',jsonb_build_object('itemId',v_item.id,'stock',v_item.stock,'requested',v_item.quantity));
        insert into public.sync_operations(operation_id,shop_id,user_id,operation_type,status,response,completed_at) values(p_operation_id,v_shop_id,(select auth.uid()),p_operation_type,'conflict',v_response,now()); return v_response;
      end if;
      v_total := v_total + v_item.price * v_item.quantity;
    end loop;
    if (select count(*) from (select distinct (value->>'itemId')::uuid from jsonb_array_elements(p_payload->'lines')) x) <> (select count(*) from public.items i where i.shop_id=v_shop_id and i.deleted_at is null and i.id in (select (value->>'itemId')::uuid from jsonb_array_elements(p_payload->'lines'))) then return jsonb_build_object('status','validation_error','error_code','ITEM_NOT_FOUND'); end if;
    if nullif(p_payload->>'customerId','') is not null then begin v_customer_id := (p_payload->>'customerId')::uuid; if not exists(select 1 from public.customers where id=v_customer_id and shop_id=v_shop_id and deleted_at is null) then return jsonb_build_object('status','validation_error','error_code','CUSTOMER_NOT_FOUND'); end if; exception when invalid_text_representation then return jsonb_build_object('status','validation_error','error_code','INVALID_CUSTOMER_ID'); end; end if;
    insert into public.sales(shop_id,customer_id,total,tax_amount,tax_reason,discount_amount,discount_reason,created_by) values(v_shop_id,v_customer_id,v_total,0,'',0,'',(select auth.uid())) returning id into v_sale_id;
    for v_item in select i.*, q.quantity from public.items i join (select (value->>'itemId')::uuid item_id, sum((value->>'quantity')::integer) quantity from jsonb_array_elements(p_payload->'lines') group by 1) q on q.item_id=i.id where i.shop_id=v_shop_id order by i.id loop
      update public.items set stock=stock-v_item.quantity where id=v_item.id;
      insert into public.sale_items(sale_id,item_id,name,size,price,cost_price,quantity) values(v_sale_id,v_item.id,v_item.name,v_item.size,v_item.price,v_item.purchase_cost,v_item.quantity);
    end loop;
    v_response := jsonb_build_object('status','completed','saleId',v_sale_id,'total',v_total);
  elsif p_operation_type in ('category_upsert','customer_upsert','item_upsert','category_delete','customer_delete','item_delete') then
    -- Exact remote UUID payload mappings are intentionally required; legacy numeric SQLite IDs must be mapped client-side.
    if nullif(p_payload->>'id','') is null then return jsonb_build_object('status','validation_error','error_code','REMOTE_UUID_ID_REQUIRED'); end if;
    begin v_id := (p_payload->>'id')::uuid; exception when invalid_text_representation then return jsonb_build_object('status','validation_error','error_code','REMOTE_UUID_ID_REQUIRED'); end;
    if p_operation_type = 'category_upsert' then
      v_name := nullif(p_payload->>'name',''); if v_name is null then return jsonb_build_object('status','validation_error','error_code','CATEGORY_NAME_REQUIRED'); end if;
      insert into public.categories(id,shop_id,name,color,position) values(v_id,v_shop_id,v_name,coalesce(p_payload->>'color','#4F46E5'),coalesce((p_payload->>'position')::integer,0)) on conflict(id) do update set name=excluded.name,color=excluded.color,position=excluded.position,deleted_at=null where public.categories.shop_id=v_shop_id;
    elsif p_operation_type = 'customer_upsert' then
      v_name := nullif(p_payload->>'name',''); if v_name is null then return jsonb_build_object('status','validation_error','error_code','CUSTOMER_NAME_REQUIRED'); end if;
      insert into public.customers(id,shop_id,name,phone,address) values(v_id,v_shop_id,v_name,coalesce(p_payload->>'phone',''),coalesce(p_payload->>'address','')) on conflict(id) do update set name=excluded.name,phone=excluded.phone,address=excluded.address,deleted_at=null where public.customers.shop_id=v_shop_id;
    elsif p_operation_type = 'item_upsert' then
      v_name := nullif(p_payload->>'name',''); if v_name is null or nullif(p_payload->>'price','') is null then return jsonb_build_object('status','validation_error','error_code','ITEM_NAME_AND_PRICE_REQUIRED'); end if;
      insert into public.items(id,shop_id,name,size,price,purchase_cost,stock,choice_type,color_value,photo_storage_path,note) values(v_id,v_shop_id,v_name,coalesce(p_payload->>'size',''),(p_payload->>'price')::numeric,coalesce((p_payload->>'purchaseCost')::numeric,0),coalesce((p_payload->>'stock')::integer,0),coalesce(p_payload->>'choiceType','color'),coalesce(p_payload->>'colorValue',''),coalesce(p_payload->>'photoStoragePath',''),coalesce(p_payload->>'note','')) on conflict(id) do update set name=excluded.name,size=excluded.size,price=excluded.price,purchase_cost=excluded.purchase_cost,stock=excluded.stock,choice_type=excluded.choice_type,color_value=excluded.color_value,photo_storage_path=excluded.photo_storage_path,note=excluded.note,deleted_at=null where public.items.shop_id=v_shop_id;
    elsif p_operation_type = 'category_delete' then
      update public.categories set deleted_at = now() where id = v_id and shop_id = v_shop_id;
    elsif p_operation_type = 'customer_delete' then
      update public.customers set deleted_at = now() where id = v_id and shop_id = v_shop_id;
    else
      update public.items set deleted_at = now() where id = v_id and shop_id = v_shop_id;
    end if;
    v_response := jsonb_build_object('status','completed','id',v_id);
  else
    v_response := jsonb_build_object('status','unsupported','error_code','UNSUPPORTED_OPERATION','operation_type',p_operation_type,'message','This backend does not implement the requested operation or legacy-ID mapping.');
  end if;
  insert into public.sync_operations(operation_id,shop_id,user_id,operation_type,status,response,completed_at) values(p_operation_id,v_shop_id,(select auth.uid()),p_operation_type,case when v_response->>'status'='unsupported' then 'unsupported' else 'completed' end,v_response,now());
  return v_response;
end;
$$;
grant execute on function public.apply_sync_operation(text,text,jsonb) to authenticated;

-- Direct table write policies intentionally do not grant sales/sale_items insertion.
-- All server-authoritative sales must pass through apply_sync_operation.
