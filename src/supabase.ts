import 'expo-sqlite/localStorage/install';
import { AppState } from 'react-native';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseProjectConfig } from './db';

export let supabase: SupabaseClient | null = null;
export let isSupabaseConfigured = false;
const CLOUD_AUTH_STORAGE_KEY = 'clothes-pos-supabase-auth-session';

function createRuntimeClient(config: Pick<SupabaseProjectConfig, 'url' | 'publishableKey'>): SupabaseClient {
  return createClient(config.url, config.publishableKey, {
    auth: { storage: globalThis.localStorage, storageKey: CLOUD_AUTH_STORAGE_KEY, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
}

/** Configures only the public client credential held in local SQLite. */
export function configureSupabase(config: Pick<SupabaseProjectConfig, 'url' | 'publishableKey' | 'active'>): SupabaseClient | null {
  if (!config.active || !config.url || !config.publishableKey) {
    supabase?.auth.stopAutoRefresh();
    supabase = null;
    isSupabaseConfigured = false;
    return null;
  }
  supabase?.auth.stopAutoRefresh();
  supabase = createRuntimeClient(config);
  isSupabaseConfigured = true;
  return supabase;
}

AppState.addEventListener('change', (state) => {
  if (!supabase) return;
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export type ShopRole = 'owner' | 'admin' | 'staff';
export type ShopMembership = { shopId: string; role: ShopRole; mustChangePassword: boolean; active: boolean };
export type SupabaseReadiness = { ok: boolean; code: string; message: string };

function isNetworkFailure(message: string): boolean {
  return /network request failed|failed to fetch|fetch failed|network error/i.test(message);
}

export async function testSupabaseReadiness(config: Pick<SupabaseProjectConfig, 'url' | 'publishableKey'>): Promise<SupabaseReadiness> {
  const normalizedConfig = { url: config.url.trim(), publishableKey: config.publishableKey.trim() };
  if (!normalizedConfig.url || !normalizedConfig.publishableKey) return { ok: false, code: 'CONFIG_REQUIRED', message: 'CONFIG_REQUIRED' };
  try {
    const client = createRuntimeClient(normalizedConfig);
    const { error: sessionError } = await client.auth.getSession();
    if (sessionError) return { ok: false, code: isNetworkFailure(sessionError.message) ? 'CONNECTION_FAILED' : 'AUTH_UNAVAILABLE', message: sessionError.message };
    // Static deployment marker: this distinguishes the upgraded schema from a
    // reachable but incomplete project without mutating remote data.
    const { data, error } = await client.rpc('get_backend_readiness');
    if (error) return { ok: false, code: isNetworkFailure(error.message) ? 'CONNECTION_FAILED' : 'PROJECT_OR_SCHEMA_UNREADY', message: error.message };
    const result = data as { status?: string } | null;
    if (result?.status !== 'READY_SCHEMA') return { ok: false, code: 'PROJECT_OR_SCHEMA_UNREADY', message: result?.status ?? 'READINESS_RESPONSE_INVALID' };
    return { ok: true, code: 'READY_SCHEMA', message: 'READY_SCHEMA' };
  } catch (error) {
    return { ok: false, code: 'CONNECTION_FAILED', message: error instanceof Error ? error.message : 'CONNECTION_FAILED' };
  }
}

export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentMembership(): Promise<ShopMembership | null> {
  if (!supabase) return null;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await supabase.from('shop_members').select('shop_id, role, must_change_password, active').eq('user_id', userData.user.id).eq('active', true).limit(1).maybeSingle();
  if (error) throw error;
  if (!data || !['owner', 'admin', 'staff'].includes(data.role)) return null;
  return { shopId: data.shop_id, role: data.role as ShopRole, mustChangePassword: data.must_change_password, active: data.active };
}

export async function bootstrapCloudOwner(input: { email: string; password: string; bootstrapToken: string; shopName: string; ownerName: string; phone: string; address: string }): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await supabase.functions.invoke('bootstrap-owner', {
    body: { email: input.email.trim(), password: input.password, shopName: input.shopName.trim(), ownerName: input.ownerName.trim(), phone: input.phone.trim(), address: input.address.trim() },
    headers: { 'x-owner-bootstrap-token': input.bootstrapToken.trim() },
  });
  if (error) throw error;
}
export async function signInWithEmail(email: string, password: string): Promise<void> { if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED'); const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error; }
export async function signOut(): Promise<void> {
  if (!supabase) {
    globalThis.localStorage.removeItem(CLOUD_AUTH_STORAGE_KEY);
    return;
  }
  // Local scope never needs the network and removes the persisted credential
  // before local-account logout or project disconnect clears the client.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}
export async function changePassword(password: string): Promise<void> { if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED'); const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; }

/**
 * Subscribes to the shop event log as a low-latency wake-up signal. Callers
 * must still run the cursor-based pull RPC so missed events remain recoverable.
 */
export function subscribeToCatalogChanges(shopId: string, onChange: () => void): () => void {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client
    .channel(`catalog-events:${shopId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shop_change_events', filter: `shop_id=eq.${shopId}` }, onChange)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
