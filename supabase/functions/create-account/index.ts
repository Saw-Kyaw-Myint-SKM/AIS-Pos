// Deploy with: supabase functions deploy create-account
// Requires SUPABASE_SERVICE_ROLE_KEY configured as a server-side Function secret.
import { createAccount } from '../_shared/account-handler.ts';
Deno.serve((request) => createAccount(request));
