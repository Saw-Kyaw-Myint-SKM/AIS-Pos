// Backward-compatible endpoint. Deploy with: supabase functions deploy create-staff
// It intentionally accepts only Staff creation and never accepts a service-role key in a request.
import { createAccount } from '../_shared/account-handler.ts';
Deno.serve((request) => createAccount(request, 'staff'));
