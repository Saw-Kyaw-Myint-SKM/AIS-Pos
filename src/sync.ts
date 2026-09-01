import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { supabase, type ShopMembership } from './supabase';

export type SyncOperationStatus = 'pending' | 'syncing' | 'completed' | 'conflict' | 'failed';
export type SyncOperationType = 'local_bootstrap' | 'item_upsert' | 'item_delete' | 'category_upsert' | 'category_delete' | 'customer_upsert' | 'customer_delete' | 'sale_create' | 'credit_settle' | 'setting_upsert';
export type SyncStatus = { pendingCount: number; syncingCount: number; failedCount: number; conflictCount: number; pendingUploadCount: number; uploadingUploadCount: number; failedUploadCount: number; migrationActive: boolean; lastSyncedAt: string | null; lastError: string | null; migrationCompleted: boolean };
type SyncOperationRow = { operationId: string; operationType: SyncOperationType; payload: string };
type LocalCategory = { id: number; name: string; color: string; position: number };
type LocalItem = { id: number; qrCode: string; name: string; size: string; price: number; purchaseCost: number; categoryId: number | null; stock: number; choiceType: string; colorValue: string; note: string };
type RemoteChange = { cursor_id: number; entity_type: 'categories' | 'items'; entity_id: string; operation: 'upsert' | 'delete'; record: Record<string, unknown> };
const operationId = () => Crypto.randomUUID();

async function ensureEntityMap(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS sync_entity_map (
    entity_type TEXT NOT NULL, local_id INTEGER NOT NULL, shop_id TEXT NOT NULL, remote_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(entity_type, local_id, shop_id), UNIQUE(shop_id, entity_type, remote_id)
  );`);
}
async function findRemoteId(db: SQLiteDatabase, entityType: 'category' | 'item', localId: number, shopId: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ remoteId: string }>('SELECT remote_id AS remoteId FROM sync_entity_map WHERE entity_type = ? AND local_id = ? AND shop_id = ?', entityType, localId, shopId);
  return row?.remoteId ?? null;
}
async function findLocalId(db: SQLiteDatabase, entityType: 'category' | 'item', remoteId: string, shopId: string): Promise<number | null> {
  const row = await db.getFirstAsync<{ localId: number }>('SELECT local_id AS localId FROM sync_entity_map WHERE entity_type = ? AND remote_id = ? AND shop_id = ?', entityType, remoteId, shopId);
  return row?.localId ?? null;
}
async function bindRemoteId(db: SQLiteDatabase, entityType: 'category' | 'item', localId: number, remoteId: string, shopId: string): Promise<void> {
  await db.runAsync('INSERT INTO sync_entity_map (entity_type, local_id, shop_id, remote_id) VALUES (?, ?, ?, ?) ON CONFLICT(entity_type, local_id, shop_id) DO UPDATE SET remote_id = excluded.remote_id, updated_at = CURRENT_TIMESTAMP', entityType, localId, shopId, remoteId);
}
async function getRemoteId(db: SQLiteDatabase, entityType: 'category' | 'item', localId: number, shopId: string): Promise<string> {
  const current = await findRemoteId(db, entityType, localId, shopId);
  if (current) return current;
  const remoteId = Crypto.randomUUID();
  await bindRemoteId(db, entityType, localId, remoteId, shopId);
  return remoteId;
}
export async function queueSyncOperation(db: SQLiteDatabase, operationType: SyncOperationType, payload: unknown): Promise<string> {
  const id = operationId();
  await db.runAsync("INSERT INTO sync_outbox (operation_id, operation_type, payload, status) VALUES (?, ?, ?, 'pending')", id, operationType, JSON.stringify(payload));
  return id;
}
async function queueCategorySnapshot(db: SQLiteDatabase, category: LocalCategory, shopId: string): Promise<string> {
  const id = await getRemoteId(db, 'category', category.id, shopId);
  return queueSyncOperation(db, 'category_upsert', { id, name: category.name, color: category.color, position: category.position });
}
async function queueItemSnapshot(db: SQLiteDatabase, item: LocalItem, shopId: string): Promise<string> {
  const id = await getRemoteId(db, 'item', item.id, shopId);
  const categoryId = item.categoryId ? await getRemoteId(db, 'category', item.categoryId, shopId) : null;
  return queueSyncOperation(db, 'item_upsert', { id, qrCode: item.qrCode, name: item.name, size: item.size, price: item.price, purchaseCost: item.purchaseCost, categoryId, stock: item.stock, choiceType: item.choiceType, colorValue: item.colorValue, photoStoragePath: '', note: item.note });
}
async function getLocalItem(db: SQLiteDatabase, itemId: number): Promise<LocalItem | null> {
  return db.getFirstAsync<LocalItem>('SELECT id, COALESCE(qr_code, \'\') AS qrCode, name, size, price, purchase_cost AS purchaseCost, category_id AS categoryId, stock, choice_type AS choiceType, color_value AS colorValue, note FROM items WHERE id = ?', itemId);
}
export async function queueCategoryUpsert(db: SQLiteDatabase, shopId: string, categoryId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await ensureEntityMap(db);
    const category = await db.getFirstAsync<LocalCategory>('SELECT id, name, color, position FROM categories WHERE id = ?', categoryId);
    if (category) await queueCategorySnapshot(db, category, shopId);
  });
}
export async function queueCategoryDelete(db: SQLiteDatabase, shopId: string, categoryId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await ensureEntityMap(db);
    const remoteId = await findRemoteId(db, 'category', categoryId, shopId);
    if (remoteId) await queueSyncOperation(db, 'category_delete', { id: remoteId });
  });
}
export async function queueCategoryReorder(db: SQLiteDatabase, shopId: string, categoryIds: number[]): Promise<void> {
  for (const categoryId of categoryIds) await queueCategoryUpsert(db, shopId, categoryId);
}
export async function queueItemUpsert(db: SQLiteDatabase, shopId: string, itemId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await ensureEntityMap(db);
    const item = await getLocalItem(db, itemId);
    if (!item) return;
    if (item.categoryId) {
      const category = await db.getFirstAsync<LocalCategory>('SELECT id, name, color, position FROM categories WHERE id = ?', item.categoryId);
      if (category) await queueCategorySnapshot(db, category, shopId);
    }
    await queueItemSnapshot(db, item, shopId);
  });
}
export async function queueItemDelete(db: SQLiteDatabase, shopId: string, itemId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await ensureEntityMap(db);
    const remoteId = await findRemoteId(db, 'item', itemId, shopId);
    if (remoteId) await queueSyncOperation(db, 'item_delete', { id: remoteId });
  });
}
export async function getSyncStatus(db: SQLiteDatabase): Promise<SyncStatus> {
  const [outbox, conflicts, uploads, metadata] = await Promise.all([
    db.getFirstAsync<{ pendingCount: number; syncingCount: number; failedCount: number }>("SELECT SUM(status = 'pending') AS pendingCount, SUM(status = 'syncing') AS syncingCount, SUM(status = 'failed') AS failedCount FROM sync_outbox"),
    db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_conflicts WHERE resolution_status = 'open'"),
    db.getFirstAsync<{ pendingUploadCount: number; uploadingUploadCount: number; failedUploadCount: number }>("SELECT SUM(status = 'pending') AS pendingUploadCount, SUM(status = 'uploading') AS uploadingUploadCount, SUM(status = 'failed') AS failedUploadCount FROM local_file_uploads"),
    db.getFirstAsync<{ lastSyncedAt: string | null; lastError: string | null; migrationCompleted: string | null; migrationRequestedAt: string | null }>('SELECT last_synced_at AS lastSyncedAt, last_error AS lastError, migration_completed AS migrationCompleted, migration_requested_at AS migrationRequestedAt FROM sync_metadata WHERE id = 1'),
  ]);
  return { pendingCount: outbox?.pendingCount ?? 0, syncingCount: outbox?.syncingCount ?? 0, failedCount: outbox?.failedCount ?? 0, conflictCount: conflicts?.count ?? 0, pendingUploadCount: uploads?.pendingUploadCount ?? 0, uploadingUploadCount: uploads?.uploadingUploadCount ?? 0, failedUploadCount: uploads?.failedUploadCount ?? 0, migrationActive: Boolean(metadata?.migrationRequestedAt) && metadata?.migrationCompleted !== '1', lastSyncedAt: metadata?.lastSyncedAt ?? null, lastError: metadata?.lastError ?? null, migrationCompleted: metadata?.migrationCompleted === '1' };
}
export async function markLocalMigrationRequested(db: SQLiteDatabase, shopId: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    const status = await getSyncStatus(db);
    await ensureEntityMap(db);
    if (status.migrationCompleted) {
      const mapped = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_entity_map WHERE shop_id = ? AND entity_type = 'item'", shopId);
      if ((mapped?.count ?? 0) > 0) throw new Error('MIGRATION_ALREADY_COMPLETED');
    }
    await db.runAsync("UPDATE sync_metadata SET migration_requested_at = CURRENT_TIMESTAMP, migration_completed = '0', shop_id = ? WHERE id = 1", shopId);
    const categories = await db.getAllAsync<LocalCategory>('SELECT id, name, color, position FROM categories ORDER BY position, id');
    for (const category of categories) await queueCategorySnapshot(db, category, shopId);
    const items = await db.getAllAsync<LocalItem>("SELECT id, COALESCE(qr_code, '') AS qrCode, name, size, price, purchase_cost AS purchaseCost, category_id AS categoryId, stock, choice_type AS choiceType, color_value AS colorValue, note FROM items ORDER BY id");
    for (const item of items) await queueItemSnapshot(db, item, shopId);
  });
}
async function applyRemoteCategory(db: SQLiteDatabase, event: RemoteChange, shopId: string): Promise<void> {
  const localId = await findLocalId(db, 'category', event.entity_id, shopId);
  if (event.operation === 'delete') {
    if (localId) await db.runAsync('DELETE FROM categories WHERE id = ?', localId);
    return;
  }
  const record = event.record;
  const name = String(record.name ?? '');
  if (!name) return;
  const color = String(record.color ?? '#4F46E5');
  const position = Number(record.position ?? 0);
  let targetId = localId;
  if (!targetId) {
    const matching = await db.getFirstAsync<{ id: number }>('SELECT id FROM categories WHERE name = ? COLLATE NOCASE', name);
    if (matching) targetId = matching.id;
    else targetId = (await db.runAsync('INSERT INTO categories (name, color, position) VALUES (?, ?, ?)', name, color, position)).lastInsertRowId;
  }
  await db.runAsync('UPDATE categories SET name = ?, color = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', name, color, position, targetId);
  await bindRemoteId(db, 'category', targetId, event.entity_id, shopId);
}
async function applyRemoteItem(db: SQLiteDatabase, event: RemoteChange, shopId: string): Promise<void> {
  const localId = await findLocalId(db, 'item', event.entity_id, shopId);
  if (event.operation === 'delete') {
    if (localId) await db.runAsync('DELETE FROM items WHERE id = ?', localId);
    return;
  }
  const record = event.record;
  const name = String(record.name ?? '');
  if (!name) return;
  const remoteCategoryId = typeof record.category_id === 'string' ? record.category_id : null;
  const categoryId = remoteCategoryId ? await findLocalId(db, 'category', remoteCategoryId, shopId) : null;
  const qrCode = String(record.qr_code ?? '') || null;
  const values = [qrCode, name, String(record.size ?? ''), Number(record.price ?? 0), Number(record.purchase_cost ?? 0), categoryId, Number(record.stock ?? 0), String(record.choice_type ?? 'color'), String(record.color_value ?? ''), String(record.note ?? '')] as const;
  let targetId = localId;
  if (!targetId) {
    const matching = qrCode ? await db.getFirstAsync<{ id: number }>('SELECT id FROM items WHERE qr_code = ?', qrCode) : null;
    targetId = matching?.id ?? null;
  }
  if (targetId) await db.runAsync('UPDATE items SET qr_code = ?, name = ?, size = ?, price = ?, purchase_cost = ?, category_id = ?, stock = ?, choice_type = ?, color_value = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ...values, targetId);
  else targetId = (await db.runAsync('INSERT INTO items (qr_code, name, size, price, purchase_cost, category_id, stock, choice_type, color_value, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ...values)).lastInsertRowId;
  await bindRemoteId(db, 'item', targetId, event.entity_id, shopId);
}
async function pullCatalogChanges(db: SQLiteDatabase, membership: ShopMembership): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  await ensureEntityMap(db);
  const metadata = await db.getFirstAsync<{ shopId: string | null; cursor: string | null }>('SELECT shop_id AS shopId, last_pull_cursor AS cursor FROM sync_metadata WHERE id = 1');
  if (metadata?.shopId && metadata.shopId !== membership.shopId) throw new Error('SYNC_SHOP_CHANGED');
  let cursor = Number(metadata?.cursor ?? '0') || 0;
  for (;;) {
    const { data, error } = await supabase.rpc('pull_catalog_changes', { p_shop_id: membership.shopId, p_after_cursor: cursor, p_limit: 200 });
    if (error) throw error;
    const events = (data ?? []) as RemoteChange[];
    if (!events.length) break;
    await db.withTransactionAsync(async () => {
      for (const event of events) {
        if (event.entity_type === 'categories') await applyRemoteCategory(db, event, membership.shopId);
        else if (event.entity_type === 'items') await applyRemoteItem(db, event, membership.shopId);
        cursor = event.cursor_id;
      }
      await db.runAsync('UPDATE sync_metadata SET shop_id = ?, last_pull_cursor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', membership.shopId, String(cursor));
    });
    if (events.length < 200) break;
  }
}
export async function runSync(db: SQLiteDatabase, membership: ShopMembership | null): Promise<SyncStatus> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  if (!membership) throw new Error('ACTIVE_MEMBERSHIP_REQUIRED');
  await db.runAsync("UPDATE sync_outbox SET status = 'pending', last_error = 'RECOVERED_INTERRUPTED_SYNC' WHERE status = 'syncing'");
  if (membership.role !== 'owner') {
    await pullCatalogChanges(db, membership);
    await db.runAsync('UPDATE sync_metadata SET last_synced_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = 1');
    return getSyncStatus(db);
  }
  let pushFailed = false;
  const outbox = await db.getAllAsync<SyncOperationRow>("SELECT operation_id AS operationId, operation_type AS operationType, payload FROM sync_outbox WHERE status IN ('pending', 'failed') ORDER BY rowid ASC");
  for (const operation of outbox) {
    await db.runAsync("UPDATE sync_outbox SET status = 'syncing', retry_count = retry_count + 1 WHERE operation_id = ?", operation.operationId);
    const stored = JSON.parse(operation.payload) as Record<string, unknown>;
    const rpcName = operation.operationType === 'category_upsert' || operation.operationType === 'category_delete' || operation.operationType === 'item_upsert' || operation.operationType === 'item_delete' ? 'apply_catalog_sync_operation' : 'apply_sync_operation';
    const { data, error } = await supabase.rpc(rpcName, { p_operation_id: operation.operationId, p_operation_type: operation.operationType, p_payload: { ...stored, shopId: membership.shopId } });
    if (error) { await db.runAsync("UPDATE sync_outbox SET status = 'failed', last_error = ? WHERE operation_id = ?", error.message, operation.operationId); await db.runAsync('UPDATE sync_metadata SET last_error = ? WHERE id = 1', error.message); pushFailed = true; break; }
    const result = data as { status?: string; error_code?: string; server_state?: unknown } | null;
    if (result?.status === 'conflict') { await db.runAsync("UPDATE sync_outbox SET status = 'conflict', last_error = ? WHERE operation_id = ?", result.error_code ?? 'CONFLICT', operation.operationId); await db.runAsync("INSERT OR REPLACE INTO sync_conflicts (operation_id, reason, server_state, resolution_status) VALUES (?, ?, ?, 'open')", operation.operationId, result.error_code ?? 'CONFLICT', JSON.stringify(result.server_state ?? null)); pushFailed = true; break; }
    if (result?.status === 'unsupported' || result?.status === 'validation_error' || result?.status === 'forbidden') { const code = result.error_code ?? 'SYNC_OPERATION_REJECTED'; await db.runAsync("UPDATE sync_outbox SET status = 'failed', last_error = ? WHERE operation_id = ?", code, operation.operationId); await db.runAsync('UPDATE sync_metadata SET last_error = ? WHERE id = 1', code); pushFailed = true; break; }
    await db.runAsync("UPDATE sync_outbox SET status = 'completed', last_error = NULL WHERE operation_id = ?", operation.operationId);
  }
  if (!pushFailed) await pullCatalogChanges(db, membership);
  const remaining = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_outbox WHERE status <> 'completed'");
  const metadata = await db.getFirstAsync<{ requestedAt: string | null }>('SELECT migration_requested_at AS requestedAt FROM sync_metadata WHERE id = 1');
  if (metadata?.requestedAt && (remaining?.count ?? 0) === 0) await db.runAsync("UPDATE sync_metadata SET migration_completed = '1' WHERE id = 1");
  if (!pushFailed) await db.runAsync('UPDATE sync_metadata SET last_synced_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = 1');
  return getSyncStatus(db);
}
