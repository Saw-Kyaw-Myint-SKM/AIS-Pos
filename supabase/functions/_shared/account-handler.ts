import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

type AccountRole = 'admin' | 'staff';
type RequestBody = { shopId?: string; email?: string; displayName?: string; temporaryPassword?: string; role?: AccountRole };

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status });

/** Server-only account provisioning. Service role is read solely from Function secrets. */
export async function createAccount(request: Request, compatibilityRole?: 'staff'): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'UNAUTHENTICATED' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'FUNCTION_CONFIGURATION_ERROR' }, 500);

  let body: RequestBody;
  try { body = await request.json() as RequestBody; } catch { return json({ error: 'INVALID_JSON' }, 400); }
  const role = compatibilityRole ?? body.role;
  const email = body.email?.trim().toLowerCase();
  if (!body.shopId || !email || !body.temporaryPassword || body.temporaryPassword.length < 8 || (role !== 'admin' && role !== 'staff')) {
    return json({ error: 'INVALID_INPUT' }, 400);
  }

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: callerData, error: callerError } = await caller.auth.getUser();
  if (callerError || !callerData.user) return json({ error: 'UNAUTHENTICATED' }, 401);

  const { data: membership, error: membershipError } = await admin.from('shop_members')
    .select('role, active').eq('shop_id', body.shopId).eq('user_id', callerData.user.id).maybeSingle();
  if (membershipError || !membership?.active) return json({ error: 'ACTIVE_MEMBERSHIP_REQUIRED' }, 403);
  const allowed = membership.role === 'owner' || (membership.role === 'admin' && role === 'staff');
  if (!allowed) return json({ error: 'ROLE_HIERARCHY_FORBIDDEN' }, 403);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: body.temporaryPassword,
    email_confirm: true,
    user_metadata: body.displayName?.trim() ? { display_name: body.displayName.trim() } : {},
  });
  if (createError || !created.user) return json({ error: 'CREATE_USER_FAILED', detail: createError?.message ?? null }, 400);
  const { error: insertError } = await admin.from('shop_members').insert({ shop_id: body.shopId, user_id: created.user.id, role, must_change_password: true, active: true });
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: 'CREATE_MEMBERSHIP_FAILED', detail: insertError.message }, 400);
  }
  await admin.from('audit_records').insert({ shop_id: body.shopId, actor_user_id: callerData.user.id, action: 'account.create', target_type: 'shop_member', target_id: created.user.id, details: { role, email } });
  return json({ userId: created.user.id, email: created.user.email, role, mustChangePassword: true }, 201);
}
