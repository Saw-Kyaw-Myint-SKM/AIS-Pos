// Deploy with: supabase functions deploy bootstrap-owner
// Required Function secrets: SUPABASE_SERVICE_ROLE_KEY and OWNER_BOOTSTRAP_TOKEN.
// OWNER_BOOTSTRAP_TOKEN is entered once by the local Owner and is never stored by the app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

type BootstrapRequest = {
  email?: string;
  password?: string;
  shopName?: string;
  ownerName?: string;
  phone?: string;
  address?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-owner-bootstrap-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function tokensMatch(received: string, expected: string): Promise<boolean> {
  const [left, right] = await Promise.all([digest(received), digest(expected)]);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const expectedToken = Deno.env.get('OWNER_BOOTSTRAP_TOKEN');
  const receivedToken = request.headers.get('x-owner-bootstrap-token')?.trim() ?? '';
  if (!url || !serviceKey || !expectedToken) return json({ error: 'FUNCTION_CONFIGURATION_ERROR' }, 500);
  if (!receivedToken || !await tokensMatch(receivedToken, expectedToken)) return json({ error: 'BOOTSTRAP_TOKEN_INVALID' }, 403);

  let body: BootstrapRequest;
  try { body = await request.json() as BootstrapRequest; } catch { return json({ error: 'INVALID_JSON' }, 400); }
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  const shopName = body.shopName?.trim();
  const ownerName = body.ownerName?.trim() ?? '';
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !shopName) return json({ error: 'INVALID_INPUT' }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: claimError } = await admin.from('owner_bootstrap_guard').insert({ id: true });
  if (claimError) return json({ error: 'BOOTSTRAP_ALREADY_COMPLETED' }, 409);

  const { count, error: shopCheckError } = await admin.from('shops').select('id', { count: 'exact', head: true });
  if (shopCheckError || (count ?? 0) > 0) {
    await admin.from('owner_bootstrap_guard').delete().eq('id', true);
    return json({ error: shopCheckError ? 'SHOP_CHECK_FAILED' : 'BOOTSTRAP_ALREADY_COMPLETED' }, shopCheckError ? 500 : 409);
  }

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: ownerName ? { display_name: ownerName } : {},
  });
  if (userError || !created.user) {
    await admin.from('owner_bootstrap_guard').delete().eq('id', true);
    return json({ error: 'OWNER_USER_CREATE_FAILED' }, 400);
  }

  let shopId: string | null = null;
  try {
    const { data: shop, error: shopError } = await admin.from('shops').insert({ name: shopName }).select('id').single();
    if (shopError || !shop) throw new Error('SHOP_CREATE_FAILED');
    shopId = shop.id;
    const { error: memberError } = await admin.from('shop_members').insert({ shop_id: shopId, user_id: created.user.id, role: 'owner', active: true, must_change_password: false });
    if (memberError) throw new Error('OWNER_MEMBERSHIP_CREATE_FAILED');
    const { error: profileError } = await admin.from('shop_profiles').insert({ shop_id: shopId, email, phone: body.phone?.trim() ?? '', address: body.address?.trim() ?? '' });
    if (profileError) throw new Error('SHOP_PROFILE_CREATE_FAILED');
    await admin.from('app_settings').insert({ shop_id: shopId, settings: {} });
    await admin.from('audit_records').insert({ shop_id: shopId, actor_user_id: created.user.id, action: 'owner.bootstrap', target_type: 'shop', target_id: shopId, details: { email } });
    return json({ shopId, email, role: 'owner' }, 201);
  } catch {
    if (shopId) await admin.from('shops').delete().eq('id', shopId);
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from('owner_bootstrap_guard').delete().eq('id', true);
    return json({ error: 'OWNER_BOOTSTRAP_FAILED' }, 500);
  }
});
