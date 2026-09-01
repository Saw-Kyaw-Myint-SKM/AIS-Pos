# AIS POS — Local-First Accounts and Owner-Dedicated Supabase

## 1. Goal

Extend the current SQLite-only Expo POS into a local-first POS with accounts and optional Supabase synchronization.

The app must work completely with local SQLite before any cloud connection exists. An Owner can later connect that shop to a dedicated Supabase project, migrate local accounts/data/photos, and enable multi-device synchronization.

The app must preserve:

- Expo managed workflow, TypeScript strict mode, manual route rendering, and React local state.
- Burmese-only UI text through `src/i18n.ts` and Pyidaungsu font through `AppText`.
- Existing SQLite POS behavior: inventory, QR scanning, sales, credit sales, receipts, history, profit reports, backup, and restore.
- Offline selling and SQLite as the immediate working cache after Supabase connection.

## 2. Confirmed Architecture

### 2.1 One dedicated Supabase project per shop/Owner

Each shop/Owner may connect its own Supabase account/project. That dedicated project owns that shop's:

- PostgreSQL database
- Product photo Storage bucket/path
- Supabase Auth users after migration
- Sync/RPC/audit data

The app must not assume one shared developer-owned Supabase project across all shops.

The developer deploys database migrations, RLS policies, Storage configuration, RPC functions, and Edge Functions to each Owner's selected Supabase project. The mobile app never creates Supabase projects and never contains a Supabase secret/service-role key.

### 2.2 Local-first lifecycle

```text
Fresh install
  → Owner Setup creates shop profile + local Owner account in SQLite
  → Owner is automatically signed in
  → POS works with local SQLite only
  → Owner may create local Admin/Staff accounts
  → Owner optionally connects a dedicated Supabase project later
  → Owner explicitly migrates local accounts/data/photos
  → SQLite remains the offline cache and durable sync queue
```

### 2.3 Secrets and public configuration

- The app may store the selected project's URL and publishable/anon key in local app configuration after Owner setup; these are public client values.
- `SUPABASE_SERVICE_ROLE_KEY`, database password, private keys, and admin secrets must never be in the mobile app, `app.json`, checked-in environment files, or backup exports.
- The service-role key is configured only as a Supabase Edge Function secret by the developer during deployment.

## 3. Accounts and Authentication

### 3.1 Roles

There are three roles: `owner`, `admin`, and `staff`.

| Capability | Owner | Admin | Staff |
| --- | :---: | :---: | :---: |
| Email/password sign-in | Yes | Yes | Yes |
| Sell, scan, receipt, history | Yes | Yes | Yes |
| Product CRUD, stock, QR, price, photo | Yes | Yes | Yes |
| Category CRUD and reorder | Yes | Yes | Yes |
| Customer CRUD | Yes | Yes | Yes |
| Credit sale/settlement normal POS actions | Yes | Yes | Yes |
| Create/edit/disable/reset Admin accounts | Yes | No | No |
| Create/edit/disable/reset Staff accounts | Yes | Yes | No |
| View Account Management | Yes | Yes | No |
| View/change Supabase URL/key/database/bucket/path | Yes | No | No |
| Connect/disconnect/change Supabase project | Yes | No | No |
| Start local-to-Supabase migration | Yes | No | No |
| Resolve sync conflicts | Yes | No | No |
| SQLite backup/restore | Yes | No | No |

All role checks must be enforced in UI and, after migration, by Supabase RLS/RPC/Edge Function authorization. UI hiding alone is never authorization.

### 3.2 First-run Owner Setup

The current first-run registration flow becomes **Owner Setup**. It appears automatically only when SQLite has no local Owner account.

The single form collects:

- Shop name, phone, email, and address
- Owner name
- Owner email, prefilled with `aisource.mm@gmail.com` but editable
- Owner password and confirmation

On submit, a single exclusive SQLite transaction creates/updates:

- Existing shop profile (`customer_profile`)
- Local Owner account
- Local authenticated session

The Owner is then automatically signed in and routed to Home.

### 3.3 Local-only authentication

Before Supabase is connected/migrated:

- Owner/Admin/Staff sign in with email and password from one common Login screen.
- Users remain signed in across app restarts until they explicitly log out, are disabled, or their local session is invalidated.
- Passwords must never be stored as plain text. Store a modern salted password hash plus password metadata only.
- Account records must include display name, normalized unique email, role, active state, creation/update timestamps, hash data, and local/remote migration metadata.
- A disabled account must be immediately rejected on app start and next action/session check.

### 3.4 Account Management screen

Create a manual-route Account Management screen.

Owner capabilities:

- View Owner/Admin/Staff accounts
- Create Admin and Staff accounts
- Edit account name/email where permitted
- Disable/re-enable Admin and Staff accounts
- Reset temporary passwords for Admin and Staff accounts

Admin capabilities:

- View account list limited to appropriate details
- Create Staff accounts only
- Edit/disable/re-enable/reset Staff accounts only
- Must not create, modify, disable, or reset Owner/Admin accounts

Staff must not access Account Management.

### 3.5 Supabase Auth migration and password policy

After the Owner explicitly starts migration:

- Local Owner/Admin/Staff accounts are migrated to Supabase Auth.
- Local password hashes cannot be copied into Supabase Auth; the Owner generates/sets a new temporary password for every migrated account.
- Supabase Email provider must have **Confirm email disabled**.
- Admin-created users can sign in immediately with their temporary password; no email verification link is required.
- Every migrated account has `must_change_password = true`.
- On first Supabase login with a temporary password, the user is forced to Change Password and cannot access POS routes until the change succeeds.
- The change-password screen clears the forced-change flag only after a successful Supabase password update and authorized membership update.

## 4. Owner-Only Supabase Settings

Add Owner-only Settings entries and routes. Admin and Staff must not see these entries.

### 4.1 Supabase Setup screen

The Owner can:

- Enter/edit Supabase Project URL
- Enter/edit Supabase publishable/anon key
- Select/edit product-image Storage bucket and path prefix
- Test connection/auth/schema readiness
- View active connection/project status
- View sync state, pending count, open conflict count, and failed uploads
- Disconnect the local app from the remote project after explicit confirmation
- Open Sync screen
- Start explicit local-to-Supabase migration

The screen must show clear Burmese warnings that URL/key are for the current shop project only and that the secret/service-role key must never be entered in the app.

### 4.2 Project/database/storage change guard

The Owner may change project URL, database project, bucket, or storage path only if all of the following are true:

- No pending/syncing/failed outbox operations
- No open sync conflicts
- No pending/uploading/failed local photo uploads
- No active migration

If any condition fails, block change and show the exact remaining counts. The Owner must resolve/sync/cancel the work first. Project changes must not silently overwrite, merge, or delete data from the previous project.

### 4.3 Developer deployment responsibility

The developer, not the Owner app UI, is responsible for deploying the backend to the selected project:

```powershell
npx supabase login
npx supabase link --project-ref <owner-project-reference>
npx supabase db push
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<secret>
npx supabase functions deploy create-staff
```

The app may test readiness but must not pretend to create schema/RLS/functions using publishable client credentials.

## 5. Dedicated Supabase Backend

### 5.1 Remote data model

Use UUID remote identifiers. Keep existing SQLite numeric IDs for UI/cart behavior and map them to remote IDs.

Required tables:

- `shops` — one logical shop record for the selected dedicated project
- `shop_members` — `shop_id`, `user_id`, role (`owner`, `admin`, `staff`), active flag, forced-password-change flag, audit timestamps
- `shop_profiles`
- `categories`
- `items`
- `customers`
- `sales`
- `sale_items`
- `credit_sales`
- `app_settings`
- `sync_operations` — server idempotency/result ledger
- remote change cursor/event/tombstone mechanism for incremental pull
- audit records for account, migration, conflict, and project-setting actions

All syncable records require shop identifier, creation/update timestamps, and deletion/tombstone semantics where deletion is allowed.

`items` includes remote category relation, QR code, prices, cost, stock, display/color values, note, and `photo_storage_path`. Store stable Storage paths, never expiring signed URLs.

`sale_items` always preserve immutable item snapshots: item ID, name, size, sale price, cost price, and quantity.

### 5.2 RLS and server authorization

- Enable RLS for every exposed table and `storage.objects` policies.
- Restrict all records to authenticated active members of the selected shop.
- Enforce Owner/Admin/Staff permissions from the confirmed role matrix.
- Owner-only settings/migration/conflict functions must require Owner membership.
- Account management Edge Functions must verify caller role server-side.
- Index every RLS filter column (`shop_id`, `user_id`, active/role lookup, sync cursor fields).
- Use schema-qualified, fixed-search-path security-definer helper functions where required.
- Add pgTAP tests for anonymous, Owner, Admin, Staff, disabled user, and foreign-shop access.

### 5.3 Edge Functions

Privileged account operations must use Edge Functions with the service-role key held only in function secrets.

Required functions:

- `create-account` — Owner can create Admin/Staff; Admin can create Staff only; creates Supabase Auth user, membership, temporary password state
- `update-account` / `disable-account` / `reset-account-password` — enforce role hierarchy
- Migration-specific account bootstrap if required

No client request can use Auth Admin API directly.

### 5.4 Server-authoritative sale transaction

Create transactional RPC functions that:

1. Verify active membership and role.
2. Verify unique client operation UUID in `sync_operations`.
3. Lock/validate each requested inventory item for the shop.
4. Atomically decrement server stock only when all requested stock is available.
5. Insert sale and immutable sale line snapshots.
6. Insert credit-sale record and validate customer/partial-payment rules when applicable.
7. Return canonical IDs and operation result.
8. On insufficient stock, roll back fully and return structured `INSUFFICIENT_STOCK` conflict data.

Duplicate retries with the same operation ID must return the original result and never create duplicate remote sales.

Provide equivalent atomic RPC behavior for sale edit stock deltas, credit settlement, and permitted catalog/customer/category mutations.

## 6. Local SQLite Extensions

All changes to `initializeDatabase` must be additive, idempotent, and preserve existing databases/backups.

### 6.1 Local accounts

Add local account/session tables and secure password fields. Do not reuse `customer_profile` as an authorization account.

Suggested local tables:

- `local_accounts`
- `local_auth_session`
- `local_account_audit`

Support role, normalized email uniqueness, password hash/salt/algorithm metadata, active state, forced password-change state, remote user ID, and migration status.

### 6.2 Sync metadata

Add/maintain:

- `sync_metadata` — selected project config reference, active remote shop/member, last pull cursor, last successful sync, errors, migration state
- `sync_outbox` — operation UUID, type, payload, dependencies, status, retry count, error/timestamps
- `sync_conflicts` — operation/sale reference, reason, server snapshot, Owner resolution state/audit
- `local_file_uploads` — local image URI, item reference, remote Storage path, content type, status/retry/error
- remote ID/mapping fields or mapping table for legacy numeric IDs

### 6.3 Atomic local writes

Every syncable local mutation must write its business data and durable outbox operation inside one exclusive SQLite transaction. This includes:

- item/category/customer create/update/delete/reorder
- photo changes
- cash sale
- credit sale
- credit settlement
- sale edit
- allowed settings changes

A local checkout cannot be considered completed unless its sale operation is durably queued.

## 7. Synchronization

### 7.1 Sync triggers

Run sync when configured/authenticated and safe:

- App startup after local/session bootstrap
- App foreground
- Connectivity recovery
- After a successful local mutation
- Owner manual **Sync now** action

Use a single-flight lock: only one sync execution may mutate queue/state at a time.

### 7.2 Push/pull sequence

1. Confirm remote connection and active Supabase session/membership.
2. Upload required pending product photos before dependent item operations.
3. Push outbox operations in dependency-safe order using idempotency UUIDs.
4. Persist accepted remote IDs/timestamps.
5. Mark transient errors pending/failed with retry/backoff.
6. Convert stock rejection to an open conflict; do not auto-retry it.
7. Pull changed/deleted remote entities after local cursor.
8. Apply pulled changes atomically to SQLite without silently overwriting unsynced local mutations.
9. Advance local cursor only after successful application.
10. Update Sync screen status.

### 7.3 Conflict behavior

When an offline sale fails remote stock validation:

- Keep local sale, lines, receipt/history, and original operation for audit.
- Mark it visibly unsynchronized.
- Preserve server stock/context response.
- Do not create partial or duplicate remote sale.
- Only Owner can retry after stock correction or cancel/reverse with explicit confirmation and local stock correction/audit.
- Admin/Staff can see normal POS data but cannot resolve sync conflict.

### 7.4 Product photo workflow

1. User selects/captures an image locally.
2. App retains local URI for immediate offline display.
3. App queues image upload and related item mutation.
4. When online, upload to private Storage path such as `<shop-id>/<item-id>/<image-id>.jpg`.
5. Save stable `photo_storage_path` remotely and locally.
6. Generate/refresh signed URL only for display.
7. Preserve failed upload state for Owner review; do not discard local image automatically.

## 8. Screens and Routes

Retain manual `Route` union and conditional rendering. Add routes/screens as needed:

- `ownerSetup`
- `login`
- `accountManagement`
- `accountForm`
- `changePassword`
- `supabaseSetup`
- `sync`
- `syncConflictDetail`

### 8.1 Route gates

- No local Owner → `ownerSetup`
- Existing local account but no session → `login`
- Local/Supabase user with `mustChangePassword` → `changePassword`
- Existing session → normal POS routes according to role
- Owner-only routes must redirect/deny for Admin/Staff
- Account Management must allow Owner and Admin with actions limited by role

### 8.2 Required Burmese UI

Add all labels/messages to `src/i18n.ts`, including:

- Owner setup, login, logout, account disabled, invalid credentials
- Account create/edit/disable/reset and temporary password information
- Role labels and unauthorized message
- Supabase setup, connection test, developer-deployment readiness message
- Sync state, pending/failed upload, conflict, retry/cancel/reverse
- Migration summary, temporary password generation, confirmation/progress/result
- Project-change block reasons

All screen text must use `AppText`/Pyidaungsu.

## 9. SQLite Backup and Restore

- Existing `.db` export/import remains an Owner-only, device-local backup feature.
- Do not export service-role secrets.
- Imported backup must not silently overwrite remote Supabase data.
- After restore, set a reconciliation-required sync state and show Owner warning.
- Owner reviews pending/conflicts and resolves normal sync rules before project configuration is changed.

## 10. Migration Workflow

Owner-only action: **Migrate Local Accounts and Data to Supabase**.

Preconditions:

- Supabase connection test passes
- Developer has deployed schema, RLS, Storage, RPC, and Edge Functions
- Owner is signed in
- No other migration is active

Workflow:

1. Show local summary: accounts by role, profile, categories, items, photos, customers, sales, sale lines, credit data, settings, and queued work.
2. Owner confirms selected remote project and creates/sets temporary password for each local account.
3. Create remote Owner/Admin/Staff Auth users/members using privileged Edge Function.
4. Upload profile/settings/categories/items/photos/customers/sales/sale items/credit records in dependency order.
5. Write stable local-to-remote mappings and durable migration checkpoints.
6. Preserve local SQLite source data.
7. Support restart/resume without duplicate remote rows or users.
8. Mark remote accounts as forced password change.
9. Require each user to sign in with temporary password and change it.

## 11. Acceptance Criteria

1. Fresh app starts at Owner Setup, not generic registration/login.
2. Owner Setup creates shop profile, local Owner account, hashed password data, and signed-in session atomically.
3. Default Owner email is `aisource.mm@gmail.com` and can be edited.
4. Owner/Admin/Staff use email/password login and remain signed in until logout/disable/session invalidation.
5. Owner creates Admin and Staff; Admin creates Staff only; Staff accesses no account management.
6. Owner/Admin/Staff all have product CRUD, category CRUD/reorder, customer CRUD, normal sales, photos, receipts, history, and credit POS capabilities.
7. Only Owner can access SQLite backup/restore, Supabase setup, project/database/bucket/path changes, migration, and conflict resolution.
8. The app works fully without Supabase connection using SQLite.
9. Owner can connect a dedicated Supabase project only from Owner settings.
10. Developer-deployed RLS/Edge Functions prevent role bypass through direct API access.
11. Local mutations create durable outbox records atomically.
12. Offline sales sync through server-authoritative stock transaction; insufficient stock creates preserved conflict without partial/duplicate remote sale.
13. Project/database/storage changes are blocked while pending work, failed uploads, open conflicts, or migration exists.
14. Photos use private Supabase Storage path plus signed URLs, with offline upload retry.
15. Explicit migration moves local accounts/data/photos safely, checkpoints progress, prevents duplicates, and preserves local source data.
16. Supabase Email Confirm Email is disabled; migrated temporary-password users must change password before POS access.
17. SQLite restore does not silently overwrite Supabase; Owner reconciliation is required.
18. Typecheck, targeted tests, Supabase RLS/RPC tests, Edge Function tests, and Expo smoke test pass.

## 12. Implementation Order

1. Add local accounts, secure password hashing, session, role types, and additive SQLite migrations.
2. Replace first-run registration with Owner Setup and build Login/Logout/forced password change flows.
3. Add Account Management and enforce Owner/Admin/Staff route/action guards.
4. Make local backup/restore Owner-only and add post-restore reconciliation marker.
5. Build Owner-only Supabase Setup configuration and strict project-change guard.
6. Complete dedicated-project Supabase SQL migrations, RLS, Storage policies, RPCs, and Edge Functions.
7. Wire every local POS mutation into atomic outbox creation.
8. Implement photo upload, idempotent push, incremental pull, retry, and status service.
9. Build Owner Sync/conflict screens and automatic/manual sync triggers.
10. Implement Owner-controlled account/data/photo migration and forced Supabase password change.
11. Add automated tests and end-to-end two-device/offline/conflict validation.

## 13. Non-Goals

- Replacing SQLite entirely
- Putting any Supabase secret/service-role key in the app
- Automatically creating Supabase projects from the mobile app
- Silent cloud migration or silent remote overwrite during local restore
- Real-time subscriptions in the initial delivery; trigger-based and manual sync is sufficient
