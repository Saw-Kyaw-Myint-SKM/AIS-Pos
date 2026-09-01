-- Catalog-only sync RPC. Kept separate from sale RPC so catalog changes cannot alter sale behavior.
create or replace function public.apply_catalog_sync_operation(p_operation_id text, p_operation_type text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_shop_id uuid; v_role text; v_response jsonb; v_id uuid; v_category_id uuid; v_name text;
begin
  if p_operation_id is null or p_operation_id !~ '^[0-9a-fA-F-]{16,64}$' then return jsonb_build_object('status','validation_error','error_code','OPERATION_ID_REQUIRED'); end if;
  if p_payload is null or nullif(p_payload->>'shopId','') is null then return jsonb_build_object('status','validation_error','error_code','SHOP_ID_REQUIRED'); end if;
  begin v_shop_id := (p_payload->>'shopId')::uuid; v_id := (p_payload->>'id')::uuid; exception when invalid_text_representation then return jsonb_build_object('status','validation_error','error_code','REMOTE_UUID_ID_REQUIRED'); end;
  select role::text into v_role from public.shop_members where shop_id=v_shop_id and user_id=(select auth.uid()) and active;
  if v_role is null then return jsonb_build_object('status','forbidden','error_code','ACTIVE_MEMBERSHIP_REQUIRED'); end if;
  select response into v_response from public.sync_operations where operation_id=p_operation_id and shop_id=v_shop_id;
  if found then return v_response; end if;
  if p_operation_type = 'category_upsert' then
    v_name := nullif(p_payload->>'name',''); if v_name is null then return jsonb_build_object('status','validation_error','error_code','CATEGORY_NAME_REQUIRED'); end if;
    insert into public.categories(id,shop_id,name,color,position) values(v_id,v_shop_id,v_name,coalesce(p_payload->>'color','#4F46E5'),coalesce((p_payload->>'position')::integer,0)) on conflict(id) do update set name=excluded.name,color=excluded.color,position=excluded.position,deleted_at=null where public.categories.shop_id=v_shop_id;
  elsif p_operation_type = 'category_delete' then
    update public.categories set deleted_at=now() where id=v_id and shop_id=v_shop_id;
  elsif p_operation_type = 'item_delete' then
    update public.items set deleted_at=now() where id=v_id and shop_id=v_shop_id;
  elsif p_operation_type = 'item_upsert' then
    v_name := nullif(p_payload->>'name',''); if v_name is null or nullif(p_payload->>'price','') is null then return jsonb_build_object('status','validation_error','error_code','ITEM_NAME_AND_PRICE_REQUIRED'); end if;
    if nullif(p_payload->>'categoryId','') is not null then
      begin v_category_id := (p_payload->>'categoryId')::uuid; exception when invalid_text_representation then return jsonb_build_object('status','validation_error','error_code','INVALID_CATEGORY_ID'); end;
      if not exists(select 1 from public.categories where id=v_category_id and shop_id=v_shop_id and deleted_at is null) then return jsonb_build_object('status','validation_error','error_code','CATEGORY_NOT_FOUND'); end if;
    end if;
    insert into public.items(id,shop_id,category_id,qr_code,name,size,price,purchase_cost,stock,choice_type,color_value,photo_storage_path,note) values(v_id,v_shop_id,v_category_id,nullif(p_payload->>'qrCode',''),v_name,coalesce(p_payload->>'size',''),(p_payload->>'price')::numeric,coalesce((p_payload->>'purchaseCost')::numeric,0),coalesce((p_payload->>'stock')::integer,0),coalesce(p_payload->>'choiceType','color'),coalesce(p_payload->>'colorValue',''),coalesce(p_payload->>'photoStoragePath',''),coalesce(p_payload->>'note','')) on conflict(id) do update set category_id=excluded.category_id,qr_code=excluded.qr_code,name=excluded.name,size=excluded.size,price=excluded.price,purchase_cost=excluded.purchase_cost,stock=excluded.stock,choice_type=excluded.choice_type,color_value=excluded.color_value,photo_storage_path=excluded.photo_storage_path,note=excluded.note,deleted_at=null where public.items.shop_id=v_shop_id;
  else return jsonb_build_object('status','unsupported','error_code','UNSUPPORTED_CATALOG_OPERATION'); end if;
  v_response := jsonb_build_object('status','completed','id',v_id);
  insert into public.sync_operations(operation_id,shop_id,user_id,operation_type,status,response,completed_at) values(p_operation_id,v_shop_id,(select auth.uid()),p_operation_type,'completed',v_response,now());
  return v_response;
end; $$;
grant execute on function public.apply_catalog_sync_operation(text,text,jsonb) to authenticated;
