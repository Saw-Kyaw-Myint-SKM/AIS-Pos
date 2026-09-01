import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';

function getDbDirectory(): Directory {
  // expo-sqlite stores the DB under <document>/SQLite (see defaultDatabaseDirectory:
  // context.filesDir + "/SQLite" on Android, documentDirectory + "/SQLite" on iOS).
  const dir = new Directory(Paths.document, 'SQLite');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export type CustomerProfile = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalAccountRole = 'owner' | 'admin' | 'staff';

export type LocalAccount = {
  id: number;
  email: string;
  name: string;
  role: LocalAccountRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
};

export type LocalAccountCredential = LocalAccount & {
  passwordHash: string;
  passwordSalt: string;
  passwordAlgorithm: string;
  passwordIterations: number;
};

export type LocalSession = {
  account: LocalAccount;
  createdAt: string;
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerInput = Pick<Customer, 'name' | 'phone' | 'address'> & { id?: number };
export type CreditStatus = 'unpaid' | 'settled';

export type CreditLedgerRow = {
  id: number;
  saleId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  total: number;
  paidAmount: number;
  balance: number;
  status: CreditStatus;
  createdAt: string;
  settledAt: string | null;
};

export type Category = {
  id: number;
  name: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ClothingItem = {
  id: number;
  qrCode: string;
  name: string;
  size: string;
  price: number;
  purchaseCost: number;
  categoryId: number | null;
  categoryName: string;
  categoryColor: string;
  stock: number;
  choiceType: 'color' | 'photo';
  colorValue: string;
  photoUri: string;
  note: string;
};

export type Sale = {
  id: number;
  total: number;
  createdAt: string;
  itemCount: number;
  taxAmount: number;
  taxReason: string;
  discountAmount: number;
  discountReason: string;
};

export type SaleItem = {
  id: number;
  saleId: number;
  clothingId: number;
  name: string;
  size: string;
  price: number;
  costPrice: number;
  quantity: number;
};

export type TodaySummary = {
  total: number;
  saleCount: number;
  itemCount: number;
};

export type ProfitSummary = {
  revenue: number;
  cost: number;
  profit: number;
  profitPercentage: number;
  saleCount: number;
};

export type CategoryInput = {
  id?: number;
  name: string;
  color: string;
};

export const CATEGORY_PALETTE = [
  { label: 'အနက်', hex: '#1A1A1A' },
  { label: 'အဖြူ', hex: '#F5F5F5' },
  { label: 'အနီ', hex: '#DC2626' },
  { label: 'အပြာ', hex: '#2563EB' },
  { label: 'အစိမ်း', hex: '#16A34A' },
  { label: 'အဝါ', hex: '#CA8A04' },
  { label: 'ခရမ်း', hex: '#9333EA' },
  { label: 'ပန်းရောင်', hex: '#DB2777' },
  { label: 'မီးခိုး', hex: '#6B7280' },
  { label: 'အညို', hex: '#A16207' },
  { label: 'လိမ္မော်', hex: '#EA580C' },
  { label: 'အပြာနု', hex: '#06B6D4' },
];

const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: 'အင်္ကျီ', color: '#4F46E5' },
  { name: 'ဘောင်းဘီ', color: '#2563EB' },
  { name: 'ထည်', color: '#0EA5E9' },
  { name: 'လုံချည်', color: '#16A34A' },
  { name: 'အခြား', color: '#6B7280' },
];

type TableColumn = { name: string };
type TableIndex = { name: string; unique: number };
type IndexColumn = { name: string };

async function getColumnNames(db: SQLiteDatabase, tableName: string): Promise<Set<string>> {
  const columns = await db.getAllAsync<TableColumn>(`PRAGMA table_info(${tableName})`);
  return new Set(columns.map((column) => column.name));
}

async function addColumnIfMissing(
  db: SQLiteDatabase,
  tableName: string,
  columns: Set<string>,
  columnName: string,
  definition: string,
): Promise<void> {
  if (columns.has(columnName)) return;
  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  columns.add(columnName);
}

async function hasUniqueSingleColumnIndex(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const indexes = await db.getAllAsync<TableIndex>(`PRAGMA index_list(${tableName})`);
  for (const index of indexes) {
    if (!index.unique) continue;
    const columns = await db.getAllAsync<IndexColumn>(`PRAGMA index_info(${index.name})`);
    if (columns.length === 1 && columns[0].name === columnName) return true;
  }
  return false;
}

async function createAppSettingsKeyIndexIfSafe(db: SQLiteDatabase): Promise<void> {
  const invalid = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM app_settings WHERE key IS NULL OR TRIM(key) = ''`,
  );
  const duplicate = await db.getFirstAsync<{ key: string }>(
    `SELECT key FROM app_settings
     WHERE key IS NOT NULL AND TRIM(key) <> ''
     GROUP BY key
     HAVING COUNT(*) > 1
     LIMIT 1`,
  );
  if ((invalid?.count ?? 0) > 0 || duplicate) {
    console.warn('[database:migration] Skipped app_settings key index because invalid or duplicate setting keys were preserved.');
    return;
  }
  if (!await hasUniqueSingleColumnIndex(db, 'app_settings', 'key')) {
    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_key_unique ON app_settings(key)');
  }
}

async function createQrCodeIndexIfSafe(db: SQLiteDatabase): Promise<void> {
  const duplicate = await db.getFirstAsync<{ qr_code: string }>(
    `SELECT qr_code
     FROM items
     WHERE qr_code IS NOT NULL AND TRIM(qr_code) <> ''
     GROUP BY qr_code
     HAVING COUNT(*) > 1
     LIMIT 1`,
  );
  if (duplicate) {
    console.warn('[database:migration] Skipped QR unique index because existing duplicate QR codes were preserved.');
    return;
  }
  await db.execAsync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_items_qr_code_unique ON items(qr_code) WHERE qr_code IS NOT NULL AND TRIM(qr_code) <> \'\'',
  );
}

export async function initializeDatabase(db: SQLiteDatabase) {
  // WAL may not be supported by a restored, locked, or device-specific database.
  // Continue with SQLite's existing journal mode instead of preventing startup.
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  } catch {
    // Best effort: SQLite remains usable with its existing journal mode.
  }
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Rename the legacy inventory table in place before creating the canonical
  // table. ALTER TABLE preserves existing rows, IDs, constraints, and indexes.
  const existingInventoryTables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('clothes', 'items')`,
  );
  const hasLegacyClothes = existingInventoryTables.some((table) => table.name === 'clothes');
  const hasItems = existingInventoryTables.some((table) => table.name === 'items');
  // Some older installs can contain both names after an interrupted migration.
  // Keep the canonical items table intact and leave the legacy table untouched
  // rather than preventing the app from starting or risking inventory loss.
  if (hasLegacyClothes && !hasItems) {
    await db.execAsync('ALTER TABLE clothes RENAME TO items;');
  }

  // Recover only our known scratch table from an interrupted QR migration.
  // It is safe to remove when the canonical items table still exists; no user
  // inventory table is deleted.
  if (hasItems) {
    await db.execAsync('DROP TABLE IF EXISTS items_rebuilt;');
  }

  // Schema in a single statement (one transaction). Keeps the connection
  // clean for closeAsync.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customer_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS local_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_algorithm TEXT NOT NULL,
      password_iterations INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
      remote_user_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      disabled_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_local_accounts_single_owner
      ON local_accounts(role) WHERE role = 'owner';
    CREATE TABLE IF NOT EXISTS local_auth_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      account_id INTEGER NOT NULL REFERENCES local_accounts(id) ON DELETE CASCADE,
      session_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS local_account_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_account_id INTEGER REFERENCES local_accounts(id) ON DELETE SET NULL,
      target_account_id INTEGER REFERENCES local_accounts(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_local_account_audit_target ON local_account_audit(target_account_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      color TEXT NOT NULL DEFAULT '#4F46E5',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code TEXT UNIQUE,
      name TEXT NOT NULL,
      size TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      purchase_cost REAL NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0),
      category TEXT NOT NULL DEFAULT '',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      choice_type TEXT NOT NULL DEFAULT 'color',
      color_value TEXT NOT NULL DEFAULT '',
      photo_uri TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      tax_reason TEXT NOT NULL DEFAULT '',
      discount_amount REAL NOT NULL DEFAULT 0,
      discount_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      clothing_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      size TEXT NOT NULL,
      price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
      quantity INTEGER NOT NULL CHECK (quantity > 0)
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS credit_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL UNIQUE REFERENCES sales(id) ON DELETE RESTRICT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      initial_paid REAL NOT NULL CHECK (initial_paid >= 0),
      settled_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_credit_sales_customer ON credit_sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_credit_sales_status ON credit_sales(settled_at, created_at DESC);
  `);

  // Owner-entered public Supabase project settings remain local to this device.
  // This table deliberately has no service-role key or database-password fields.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS supabase_project_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      url TEXT NOT NULL DEFAULT '',
      publishable_key TEXT NOT NULL DEFAULT '',
      storage_bucket TEXT NOT NULL DEFAULT '',
      path_prefix TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
      last_test_result TEXT,
      last_test_code TEXT,
      last_tested_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO supabase_project_config (id) VALUES (1);
  `);

  // Offline-first Supabase metadata. These tables are local-only and are
  // additive, so existing SQLite POS data remains usable before sign-in.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_id TEXT,
      last_pull_cursor TEXT,
      last_synced_at TEXT,
      last_error TEXT,
      migration_requested_at TEXT,
      migration_completed TEXT NOT NULL DEFAULT '0',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO sync_metadata (id) VALUES (1);
    CREATE TABLE IF NOT EXISTS sync_outbox (
      operation_id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'completed', 'conflict', 'failed')),
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_created ON sync_outbox(status, created_at);
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      operation_id TEXT PRIMARY KEY REFERENCES sync_outbox(operation_id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      server_state TEXT NOT NULL DEFAULT '',
      resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'resolved', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS local_file_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_uri TEXT NOT NULL,
      item_id INTEGER,
      storage_path TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL DEFAULT 'image/jpeg',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'completed', 'failed')),
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_local_file_uploads_status ON local_file_uploads(status, created_at);
    CREATE TABLE IF NOT EXISTS sync_entity_map (
      entity_type TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      shop_id TEXT NOT NULL,
      remote_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (entity_type, local_id, shop_id),
      UNIQUE (shop_id, entity_type, remote_id)
    );
  `);

  // A previous release used camelCase inventory columns. Add canonical
  // columns before any reads so an upgraded install cannot fail at launch.
  const legacyItemColumnNames = await getColumnNames(db, 'items');
  if (!legacyItemColumnNames.has('qr_code') && legacyItemColumnNames.has('qrCode')) {
    // SQLite cannot add a UNIQUE column through ALTER TABLE. Add the value
    // column first, preserve every existing QR code, then index only when safe.
    await addColumnIfMissing(db, 'items', legacyItemColumnNames, 'qr_code', 'qr_code TEXT');
    await db.execAsync("UPDATE items SET qr_code = NULLIF(TRIM(qrCode), '') WHERE qr_code IS NULL");
  }
  if (!legacyItemColumnNames.has('choice_type') && legacyItemColumnNames.has('choiceType')) {
    await addColumnIfMissing(db, 'items', legacyItemColumnNames, 'choice_type', "choice_type TEXT NOT NULL DEFAULT 'color'");
    await db.execAsync("UPDATE items SET choice_type = COALESCE(NULLIF(choiceType, ''), 'color')");
  }
  if (!legacyItemColumnNames.has('color_value') && legacyItemColumnNames.has('colorValue')) {
    await addColumnIfMissing(db, 'items', legacyItemColumnNames, 'color_value', "color_value TEXT NOT NULL DEFAULT ''");
    await db.execAsync("UPDATE items SET color_value = COALESCE(colorValue, '')");
  }

  const colNames = await getColumnNames(db, 'items');
  await addColumnIfMissing(db, 'items', colNames, 'purchase_cost', 'purchase_cost REAL NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0)');
  await addColumnIfMissing(db, 'items', colNames, 'category', "category TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'items', colNames, 'stock', 'stock INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'items', colNames, 'choice_type', "choice_type TEXT NOT NULL DEFAULT 'color'");
  await addColumnIfMissing(db, 'items', colNames, 'color_value', "color_value TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'items', colNames, 'note', "note TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'items', colNames, 'photo_uri', "photo_uri TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'items', colNames, 'category_id', 'category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');
  await createQrCodeIndexIfSafe(db);

  const itemColumnDetails = await db.getAllAsync<{ name: string; notnull: number }>('PRAGMA table_info(items)');
  const qrCodeColumn = itemColumnDetails.find((column) => column.name === 'qr_code');
  const purchaseCostExpression = colNames.has('purchase_cost') ? 'purchase_cost' : '0';
  if (qrCodeColumn?.notnull) {
    // This table is a migration scratch table; it was cleared above if an
    // earlier interrupted run left it behind. Keep a backup until the rebuilt
    // canonical table is in place, then discard the backup.
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    try {
      await db.execAsync(`
        CREATE TABLE items_rebuilt (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          qr_code TEXT UNIQUE,
          name TEXT NOT NULL,
          size TEXT NOT NULL,
          price REAL NOT NULL CHECK (price >= 0),
          purchase_cost REAL NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0),
          category TEXT NOT NULL DEFAULT '',
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          choice_type TEXT NOT NULL DEFAULT 'color',
          color_value TEXT NOT NULL DEFAULT '',
          photo_uri TEXT NOT NULL DEFAULT '',
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO items_rebuilt (
          id, qr_code, name, size, price, purchase_cost, category, category_id, stock,
          choice_type, color_value, photo_uri, note, created_at, updated_at
        )
        SELECT
          id, NULLIF(TRIM(qr_code), ''), name, size, price, ${purchaseCostExpression}, category, category_id, stock,
          choice_type, color_value, photo_uri, note, created_at, updated_at
        FROM items;
        ALTER TABLE items RENAME TO items_pre_qr_rebuild;
        ALTER TABLE items_rebuilt RENAME TO items;
        DROP TABLE items_pre_qr_rebuild;
      `);
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
  }

  const salesCols = await getColumnNames(db, 'sales');
  await addColumnIfMissing(db, 'sales', salesCols, 'tax_amount', 'tax_amount REAL NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'sales', salesCols, 'tax_reason', "tax_reason TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'sales', salesCols, 'discount_amount', 'discount_amount REAL NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'sales', salesCols, 'discount_reason', "discount_reason TEXT NOT NULL DEFAULT ''");

  const saleItemCols = await getColumnNames(db, 'sale_items');
  await addColumnIfMissing(db, 'sale_items', saleItemCols, 'cost_price', 'cost_price REAL NOT NULL DEFAULT 0 CHECK (cost_price >= 0)');

  // The current app reads these fields at startup. Legacy installs may have
  // the tables but not the newer columns, so repair them additively.
  const profileCols = await getColumnNames(db, 'customer_profile');
  await addColumnIfMissing(db, 'customer_profile', profileCols, 'name', "name TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'customer_profile', profileCols, 'phone', "phone TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'customer_profile', profileCols, 'email', "email TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'customer_profile', profileCols, 'address', "address TEXT NOT NULL DEFAULT ''");
  const hadCamelCreatedAt = profileCols.has('createdAt');
  const hadCamelUpdatedAt = profileCols.has('updatedAt');
  await addColumnIfMissing(db, 'customer_profile', profileCols, 'created_at', "created_at TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'customer_profile', profileCols, 'updated_at', "updated_at TEXT NOT NULL DEFAULT ''");
  if (hadCamelCreatedAt) {
    await db.execAsync("UPDATE customer_profile SET created_at = createdAt WHERE created_at = '' AND createdAt IS NOT NULL");
  }
  if (hadCamelUpdatedAt) {
    await db.execAsync("UPDATE customer_profile SET updated_at = updatedAt WHERE updated_at = '' AND updatedAt IS NOT NULL");
  }

  const appSettingsCols = await getColumnNames(db, 'app_settings');
  await addColumnIfMissing(db, 'app_settings', appSettingsCols, 'key', 'key TEXT');
  await addColumnIfMissing(db, 'app_settings', appSettingsCols, 'value', 'value TEXT');
  await createAppSettingsKeyIndexIfSafe(db);

  const categoryCols = await getColumnNames(db, 'categories');
  await addColumnIfMissing(db, 'categories', categoryCols, 'color', "color TEXT NOT NULL DEFAULT '#4F46E5'");
  await addColumnIfMissing(db, 'categories', categoryCols, 'position', 'position INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'categories', categoryCols, 'created_at', "created_at TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'categories', categoryCols, 'updated_at', "updated_at TEXT NOT NULL DEFAULT ''");

  const customerCols = await getColumnNames(db, 'customers');
  await addColumnIfMissing(db, 'customers', customerCols, 'phone', "phone TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'customers', customerCols, 'address', "address TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'customers', customerCols, 'created_at', "created_at TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'customers', customerCols, 'updated_at', "updated_at TEXT NOT NULL DEFAULT ''");

  const creditCols = await getColumnNames(db, 'credit_sales');
  await addColumnIfMissing(db, 'credit_sales', creditCols, 'settled_at', 'settled_at TEXT');
  await addColumnIfMissing(db, 'credit_sales', creditCols, 'created_at', "created_at TEXT NOT NULL DEFAULT ''");

  // Track first-run seeding with PRAGMA user_version so that a re-import of a
  // backup (possibly containing zero items) does NOT re-seed sample data.
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const isFresh = !versionRow || versionRow.user_version === 0;

  // Seed default categories if the table is empty (first run only).
  if (isFresh) {
    const catCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories');
    if (!catCount?.count) {
      await db.withTransactionAsync(async () => {
        for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
          const c = DEFAULT_CATEGORIES[i];
          await db.runAsync(
            'INSERT INTO categories (name, color, position) VALUES (?, ?, ?)',
            c.name, c.color, i,
          );
        }
      });
    }
  }

  // One-shot migration: copy items.category text -> category_id via find-or-create.
  const needsMigration = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM items WHERE category_id IS NULL AND category <> ''`,
  );
  if (needsMigration && needsMigration.n > 0) {
    const rows = await db.getAllAsync<{ category: string }>(
      `SELECT DISTINCT category FROM items WHERE category_id IS NULL AND category <> ''`,
    );
    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        const name = row.category.trim();
        if (!name) continue;
        let id = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM categories WHERE name = ? COLLATE NOCASE`,
          name,
        );
        if (!id) {
          const palette = CATEGORY_PALETTE.find((p) => p.label === name);
          const color = palette?.hex ?? '#4F46E5';
          const posRow = await db.getFirstAsync<{ m: number | null }>(
            `SELECT MAX(position) AS m FROM categories`,
          );
          const nextPos = (posRow?.m ?? -1) + 1;
          const result = await db.runAsync(
            `INSERT INTO categories (name, color, position) VALUES (?, ?, ?)`,
            name, color, nextPos,
          );
          id = { id: result.lastInsertRowId };
        }
        await db.runAsync(
          `UPDATE items SET category_id = ? WHERE category = ? COLLATE NOCASE AND category_id IS NULL`,
          id!.id, name,
        );
      }
    });
  }

  // Mark fresh initialization as completed. New installs intentionally begin
  // with no inventory; existing databases are never modified here.
  if (isFresh) {
    await db.execAsync('PRAGMA user_version = 1');
  }

  // Flush any pending WAL state so closeAsync does not see unfinalized
  // statements. Safe to run repeatedly; returns immediately if no WAL.
  try {
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // Ignore — best effort. Some expo-sqlite versions may not support it.
  }
}

export async function getCustomerProfile(db: SQLiteDatabase) {
  return db.getFirstAsync<CustomerProfile>(
    `SELECT id, name, phone, email, address, created_at AS createdAt, updated_at AS updatedAt
     FROM customer_profile WHERE id = 1`,
  );
}

export async function saveCustomerProfile(
  db: SQLiteDatabase,
  profile: { name: string; phone: string; email: string; address: string },
) {
  await db.runAsync(
    `INSERT INTO customer_profile (id, name, phone, email, address, created_at, updated_at)
     VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       phone = excluded.phone,
       email = excluded.email,
       address = excluded.address,
       updated_at = CURRENT_TIMESTAMP`,
    profile.name, profile.phone, profile.email, profile.address,
  );
}

export async function getLocalAccountCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM local_accounts');
  return row?.count ?? 0;
}

const localAccountSelect = `
  SELECT id, email, name, role, is_active AS isActive,
         must_change_password AS mustChangePassword,
         created_at AS createdAt, updated_at AS updatedAt, disabled_at AS disabledAt
  FROM local_accounts`;

export async function getLocalAccountByEmail(db: SQLiteDatabase, email: string): Promise<LocalAccount | null> {
  return (await db.getFirstAsync<LocalAccount>(
    `${localAccountSelect} WHERE email = ? COLLATE NOCASE`,
    email.trim(),
  )) ?? null;
}

export async function getLocalAccountCredentialByEmail(
  db: SQLiteDatabase,
  email: string,
): Promise<LocalAccountCredential | null> {
  return (await db.getFirstAsync<LocalAccountCredential>(
    `SELECT id, email, name, role, is_active AS isActive,
            must_change_password AS mustChangePassword,
            password_hash AS passwordHash, password_salt AS passwordSalt,
            password_algorithm AS passwordAlgorithm, password_iterations AS passwordIterations,
            created_at AS createdAt, updated_at AS updatedAt, disabled_at AS disabledAt
     FROM local_accounts WHERE email = ? COLLATE NOCASE`,
    email.trim(),
  )) ?? null;
}

type LocalSessionRow = LocalAccount & { sessionCreatedAt: string };

export async function getLocalSession(db: SQLiteDatabase): Promise<LocalSession | null> {
  const row = await db.getFirstAsync<LocalSessionRow>(
    `SELECT a.id, a.email, a.name, a.role, a.is_active AS isActive,
            a.must_change_password AS mustChangePassword,
            a.created_at AS createdAt, a.updated_at AS updatedAt, a.disabled_at AS disabledAt,
            s.created_at AS sessionCreatedAt
     FROM local_auth_session s
     JOIN local_accounts a ON a.id = s.account_id
     WHERE s.id = 1 AND a.is_active = 1`,
  );
  if (!row) return null;
  return {
    account: {
      id: row.id, email: row.email, name: row.name, role: row.role,
      isActive: Boolean(row.isActive), mustChangePassword: Boolean(row.mustChangePassword),
      createdAt: row.createdAt, updatedAt: row.updatedAt, disabledAt: row.disabledAt,
    },
    createdAt: row.sessionCreatedAt,
  };
}

export type LocalAccountWrite = {
  email: string;
  name: string;
  role: LocalAccountRole;
  passwordHash: string;
  passwordSalt: string;
  passwordAlgorithm: string;
  passwordIterations: number;
  mustChangePassword?: boolean;
};

export async function createInitialOwner(
  db: SQLiteDatabase,
  profile: { name: string; phone: string; email: string; address: string },
  account: Omit<LocalAccountWrite, 'role'>,
  sessionToken: string,
): Promise<LocalAccount> {
  let saved: LocalAccount | null = null;
  await db.withTransactionAsync(async () => {
    const existing = await getLocalAccountCount(db);
    if (existing > 0) throw new Error('LOCAL_OWNER_ALREADY_EXISTS');
    await saveCustomerProfile(db, profile);
    const result = await db.runAsync(
      `INSERT INTO local_accounts
        (email, name, role, password_hash, password_salt, password_algorithm, password_iterations, must_change_password)
       VALUES (?, ?, 'owner', ?, ?, ?, ?, ?)`,
      account.email.trim().toLowerCase(), account.name.trim(), account.passwordHash,
      account.passwordSalt, account.passwordAlgorithm, account.passwordIterations,
      account.mustChangePassword ? 1 : 0,
    );
    saved = await db.getFirstAsync<LocalAccount>(`${localAccountSelect} WHERE id = ?`, result.lastInsertRowId);
    if (!saved) throw new Error('LOCAL_ACCOUNT_CREATE_FAILED');
    await db.runAsync(
      `INSERT INTO local_auth_session (id, account_id, session_token, created_at, updated_at)
       VALUES (1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      saved.id, sessionToken,
    );
    await db.runAsync(
      `INSERT INTO local_account_audit (actor_account_id, target_account_id, action)
       VALUES (?, ?, 'owner_created')`, saved.id, saved.id,
    );
  });
  return saved!;
}

export async function createLocalSession(db: SQLiteDatabase, accountId: number, sessionToken: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO local_auth_session (id, account_id, session_token, created_at, updated_at)
       VALUES (1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET account_id = excluded.account_id,
         session_token = excluded.session_token, updated_at = CURRENT_TIMESTAMP`,
      accountId, sessionToken,
    );
    await db.runAsync(
      `INSERT INTO local_account_audit (actor_account_id, target_account_id, action)
       VALUES (?, ?, 'signed_in')`, accountId, accountId,
    );
  });
}

export async function clearLocalSession(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const session = await db.getFirstAsync<{ accountId: number }>(
      'SELECT account_id AS accountId FROM local_auth_session WHERE id = 1',
    );
    await db.runAsync('DELETE FROM local_auth_session WHERE id = 1');
    if (session) {
      await db.runAsync(
        `INSERT INTO local_account_audit (actor_account_id, target_account_id, action)
         VALUES (?, ?, 'signed_out')`, session.accountId, session.accountId,
      );
    }
  });
}

export async function updateLocalAccountPassword(
  db: SQLiteDatabase,
  accountId: number,
  verifier: Pick<LocalAccountWrite, 'passwordHash' | 'passwordSalt' | 'passwordAlgorithm' | 'passwordIterations'>,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE local_accounts
       SET password_hash = ?, password_salt = ?, password_algorithm = ?, password_iterations = ?,
           must_change_password = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND is_active = 1`,
      verifier.passwordHash, verifier.passwordSalt, verifier.passwordAlgorithm, verifier.passwordIterations, accountId,
    );
    await db.runAsync(
      `INSERT INTO local_account_audit (actor_account_id, target_account_id, action)
       VALUES (?, ?, 'password_changed')`, accountId, accountId,
    );
  });
}

export async function getLocalAccounts(db: SQLiteDatabase): Promise<LocalAccount[]> {
  const rows = await db.getAllAsync<LocalAccount>(`${localAccountSelect} ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, name COLLATE NOCASE`);
  return rows.map((row) => ({ ...row, isActive: Boolean(row.isActive), mustChangePassword: Boolean(row.mustChangePassword) }));
}

function canManageRole(actor: LocalAccount, targetRole: LocalAccountRole): boolean {
  return actor.role === 'owner' ? targetRole === 'admin' || targetRole === 'staff' : actor.role === 'admin' && targetRole === 'staff';
}

export async function createManagedLocalAccount(
  db: SQLiteDatabase,
  actor: LocalAccount,
  input: LocalAccountWrite,
): Promise<LocalAccount> {
  if (!canManageRole(actor, input.role)) throw new Error('LOCAL_ACCOUNT_PERMISSION_DENIED');
  const result = await db.runAsync(
    `INSERT INTO local_accounts
      (email, name, role, password_hash, password_salt, password_algorithm, password_iterations, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    input.email.trim().toLowerCase(), input.name.trim(), input.role, input.passwordHash,
    input.passwordSalt, input.passwordAlgorithm, input.passwordIterations,
  );
  const saved = await db.getFirstAsync<LocalAccount>(`${localAccountSelect} WHERE id = ?`, result.lastInsertRowId);
  if (!saved) throw new Error('LOCAL_ACCOUNT_CREATE_FAILED');
  await db.runAsync(
    `INSERT INTO local_account_audit (actor_account_id, target_account_id, action, detail)
     VALUES (?, ?, 'account_created', ?)`, actor.id, saved.id, input.role,
  );
  return { ...saved, isActive: Boolean(saved.isActive), mustChangePassword: Boolean(saved.mustChangePassword) };
}

export async function setManagedLocalAccountActive(
  db: SQLiteDatabase,
  actor: LocalAccount,
  target: LocalAccount,
  active: boolean,
): Promise<void> {
  if (!canManageRole(actor, target.role)) throw new Error('LOCAL_ACCOUNT_PERMISSION_DENIED');
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE local_accounts SET is_active = ?, disabled_at = CASE WHEN ? THEN NULL ELSE CURRENT_TIMESTAMP END,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`, active ? 1 : 0, active ? 1 : 0, target.id,
    );
    if (!active) await db.runAsync('DELETE FROM local_auth_session WHERE account_id = ?', target.id);
    await db.runAsync(
      `INSERT INTO local_account_audit (actor_account_id, target_account_id, action)
       VALUES (?, ?, ?)`, actor.id, target.id, active ? 'account_enabled' : 'account_disabled',
    );
  });
}

export async function getCustomers(db: SQLiteDatabase) {
  return db.getAllAsync<Customer>(
    `SELECT id, name, phone, address, created_at AS createdAt, updated_at AS updatedAt
     FROM customers ORDER BY name COLLATE NOCASE`,
  );
}

export async function getCustomer(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Customer>(
    `SELECT id, name, phone, address, created_at AS createdAt, updated_at AS updatedAt
     FROM customers WHERE id = ?`,
    id,
  );
}

function validateCustomerInput(input: CustomerInput) {
  if (!input.name.trim() || !input.phone.trim() || !input.address.trim()) {
    throw new Error(INVALID_CUSTOMER_ERROR);
  }
}

export async function saveCustomer(db: SQLiteDatabase, input: CustomerInput): Promise<Customer> {
  validateCustomerInput(input);
  if (input.id) {
    await db.runAsync(
      `UPDATE customers SET name = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      input.name.trim(), input.phone.trim(), input.address.trim(), input.id,
    );
    const saved = await getCustomer(db, input.id);
    if (!saved) throw new Error(CUSTOMER_NOT_FOUND_ERROR);
    return saved;
  }
  const result = await db.runAsync(
    `INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)`,
    input.name.trim(), input.phone.trim(), input.address.trim(),
  );
  const saved = await getCustomer(db, result.lastInsertRowId);
  if (!saved) throw new Error(CUSTOMER_NOT_FOUND_ERROR);
  return saved;
}

export async function deleteCustomer(db: SQLiteDatabase, id: number) {
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `DELETE FROM customers
       WHERE id = ?
         AND NOT EXISTS (SELECT 1 FROM credit_sales WHERE customer_id = ?)`,
      id, id,
    );
    if (result.changes === 1) return;
    const exists = await db.getFirstAsync<{ id: number }>('SELECT id FROM customers WHERE id = ?', id);
    if (!exists) throw new Error(CUSTOMER_NOT_FOUND_ERROR);
    throw new Error(CUSTOMER_HAS_CREDIT_ERROR);
  });
}

export async function getClothingItems(db: SQLiteDatabase) {
  return db.getAllAsync<ClothingItem>(
    `SELECT
       c.id, COALESCE(c.qr_code, '') AS qrCode, c.name, c.size, c.price,
       c.purchase_cost AS purchaseCost,
       c.category_id AS categoryId,
       COALESCE(cat.name, '') AS categoryName,
       COALESCE(cat.color, '') AS categoryColor,
       c.stock, c.choice_type AS choiceType, c.color_value AS colorValue,
       c.photo_uri AS photoUri, c.note
     FROM items c
     LEFT JOIN categories cat ON cat.id = c.category_id
     ORDER BY c.name COLLATE NOCASE`,
  );
}

export async function findClothingByQr(db: SQLiteDatabase, qrCode: string) {
  const normalizedQrCode = qrCode.trim();
  if (!normalizedQrCode) return null;

  return db.getFirstAsync<ClothingItem>(
    `SELECT
       c.id, COALESCE(c.qr_code, '') AS qrCode, c.name, c.size, c.price,
       c.purchase_cost AS purchaseCost,
       c.category_id AS categoryId,
       COALESCE(cat.name, '') AS categoryName,
       COALESCE(cat.color, '') AS categoryColor,
       c.stock, c.choice_type AS choiceType, c.color_value AS colorValue,
       c.photo_uri AS photoUri, c.note
     FROM items c
     LEFT JOIN categories cat ON cat.id = c.category_id
     WHERE c.qr_code = ?`, normalizedQrCode,
  );
}

type ClothingItemInput = Omit<
  Pick<ClothingItem, 'id' | 'qrCode' | 'name' | 'size' | 'price' | 'purchaseCost' | 'categoryId' | 'stock' | 'choiceType' | 'colorValue' | 'photoUri' | 'note'>,
  'qrCode'
> & {
  qrCode: string | null;
};

export async function saveClothingItem(
  db: SQLiteDatabase,
  item: ClothingItemInput,
): Promise<number> {
  if (item.id) {
    await db.runAsync(
      `UPDATE items SET qr_code = ?, name = ?, size = ?, price = ?, purchase_cost = ?, category_id = ?, stock = ?, choice_type = ?, color_value = ?, photo_uri = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      item.qrCode, item.name, item.size, item.price, item.purchaseCost, item.categoryId, item.stock, item.choiceType, item.colorValue, item.photoUri, item.note, item.id,
    );
    return item.id;
  }
  const result = await db.runAsync(
    `INSERT INTO items (qr_code, name, size, price, purchase_cost, category_id, stock, choice_type, color_value, photo_uri, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.qrCode, item.name, item.size, item.price, item.purchaseCost, item.categoryId, item.stock, item.choiceType, item.colorValue, item.photoUri, item.note,
  );
  return result.lastInsertRowId;
}

export async function deleteClothingItem(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
}

export async function getCategories(db: SQLiteDatabase) {
  return db.getAllAsync<Category>(
    `SELECT id, name, color, position, created_at AS createdAt, updated_at AS updatedAt
     FROM categories ORDER BY position ASC, name COLLATE NOCASE`,
  );
}

export async function findCategoryById(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Category>(
    `SELECT id, name, color, position, created_at AS createdAt, updated_at AS updatedAt
     FROM categories WHERE id = ?`,
    id,
  );
}

export async function saveCategory(
  db: SQLiteDatabase,
  input: CategoryInput,
): Promise<Category> {
  if (input.id) {
    await db.runAsync(
      `UPDATE categories SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      input.name, input.color, input.id,
    );
    const found = await findCategoryById(db, input.id);
    return found!;
  }
  const posRow = await db.getFirstAsync<{ m: number | null }>(
    `SELECT MAX(position) AS m FROM categories`,
  );
  const nextPos = (posRow?.m ?? -1) + 1;
  const result = await db.runAsync(
    `INSERT INTO categories (name, color, position) VALUES (?, ?, ?)`,
    input.name, input.color, nextPos,
  );
  const found = await findCategoryById(db, result.lastInsertRowId);
  return found!;
}

export async function deleteCategory(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
}

export async function reorderCategories(db: SQLiteDatabase, ids: number[]) {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.runAsync(
        `UPDATE categories SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        i, ids[i],
      );
    }
  });
}

export async function getCategoryItemCounts(db: SQLiteDatabase): Promise<Record<number, number>> {
  const rows = await db.getAllAsync<{ id: number; count: number }>(
    `SELECT categories.id AS id, COUNT(items.id) AS count
     FROM categories LEFT JOIN items ON items.category_id = categories.id
     GROUP BY categories.id`,
  );
  const out: Record<number, number> = {};
  for (const row of rows) out[row.id] = row.count;
  return out;
}

export const INSUFFICIENT_STOCK_ERROR = 'INSUFFICIENT_STOCK';
export const INVALID_CUSTOMER_ERROR = 'INVALID_CUSTOMER';
export const CUSTOMER_NOT_FOUND_ERROR = 'CUSTOMER_NOT_FOUND';
export const CUSTOMER_HAS_CREDIT_ERROR = 'CUSTOMER_HAS_CREDIT';
export const INVALID_CREDIT_PAYMENT_ERROR = 'INVALID_CREDIT_PAYMENT';
export const CREDIT_NOT_FOUND_ERROR = 'CREDIT_NOT_FOUND';
export const CREDIT_ALREADY_SETTLED_ERROR = 'CREDIT_ALREADY_SETTLED';
export const CREDIT_SALE_EDIT_FORBIDDEN_ERROR = 'CREDIT_SALE_EDIT_FORBIDDEN';

export type SaleUpdateLine = {
  clothingId: number;
  quantity: number;
};

export type SaleUpdateInput = {
  lines: SaleUpdateLine[];
  taxAmount: number;
  taxReason: string;
  discountAmount: number;
  discountReason: string;
};

export const SALE_NOT_FOUND_ERROR = 'SALE_NOT_FOUND';
export const SALE_ITEM_UNAVAILABLE_ERROR = 'SALE_ITEM_UNAVAILABLE';
export const INVALID_SALE_UPDATE_ERROR = 'INVALID_SALE_UPDATE';

export async function createSale(
  db: SQLiteDatabase,
  items: ClothingItem[],
  quantities: Record<number, number>,
  taxAmount: number = 0,
  taxReason: string = '',
  discountAmount: number = 0,
  discountReason: string = '',
): Promise<number> {
  const subtotal = items.reduce((sum, item) => sum + item.price * (quantities[item.id] ?? 0), 0);
  if (!Number.isFinite(taxAmount) || taxAmount < 0
    || !Number.isFinite(discountAmount) || discountAmount < 0
    || discountAmount > subtotal + taxAmount) {
    throw new Error(INVALID_SALE_UPDATE_ERROR);
  }
  const total = subtotal + taxAmount - discountAmount;
  let saleId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO sales (total, tax_amount, tax_reason, discount_amount, discount_reason)
       VALUES (?, ?, ?, ?, ?)`,
      total, taxAmount, taxReason.trim(), discountAmount, discountReason.trim(),
    );
    saleId = result.lastInsertRowId;
    for (const item of items) {
      const quantity = quantities[item.id] ?? 0;
      if (quantity <= 0) continue;

      const stockUpdate = await db.runAsync(
        `UPDATE items
         SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND stock >= ?`,
        quantity, item.id, quantity,
      );
      if (stockUpdate.changes !== 1) {
        throw new Error(INSUFFICIENT_STOCK_ERROR);
      }

      await db.runAsync(
        'INSERT INTO sale_items (sale_id, clothing_id, name, size, price, cost_price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
        saleId, item.id, item.name, item.size, item.price, item.purchaseCost, quantity,
      );
    }
  });
  return saleId;
}

export async function createCreditSale(
  db: SQLiteDatabase,
  customerId: number,
  items: ClothingItem[],
  quantities: Record<number, number>,
  initialPaid: number,
  taxAmount: number = 0,
  taxReason: string = '',
  discountAmount: number = 0,
  discountReason: string = '',
): Promise<number> {
  if (!Number.isSafeInteger(customerId) || customerId <= 0 || !Number.isFinite(initialPaid) || initialPaid < 0) {
    throw new Error(INVALID_CREDIT_PAYMENT_ERROR);
  }
  const subtotal = items.reduce((sum, item) => sum + item.price * (quantities[item.id] ?? 0), 0);
  if (!Number.isFinite(taxAmount) || taxAmount < 0
    || !Number.isFinite(discountAmount) || discountAmount < 0
    || discountAmount > subtotal + taxAmount) {
    throw new Error(INVALID_SALE_UPDATE_ERROR);
  }
  const total = subtotal + taxAmount - discountAmount;
  if (total <= 0 || initialPaid >= total) throw new Error(INVALID_CREDIT_PAYMENT_ERROR);

  let saleId = 0;
  await db.withTransactionAsync(async () => {
    const customer = await db.getFirstAsync<{ id: number }>('SELECT id FROM customers WHERE id = ?', customerId);
    if (!customer) throw new Error(CUSTOMER_NOT_FOUND_ERROR);
    const result = await db.runAsync(
      `INSERT INTO sales (total, tax_amount, tax_reason, discount_amount, discount_reason)
       VALUES (?, ?, ?, ?, ?)`,
      total, taxAmount, taxReason.trim(), discountAmount, discountReason.trim(),
    );
    saleId = result.lastInsertRowId;
    for (const item of items) {
      const quantity = quantities[item.id] ?? 0;
      if (quantity <= 0) continue;
      const stockUpdate = await db.runAsync(
        `UPDATE items SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND stock >= ?`,
        quantity, item.id, quantity,
      );
      if (stockUpdate.changes !== 1) throw new Error(INSUFFICIENT_STOCK_ERROR);
      await db.runAsync(
        'INSERT INTO sale_items (sale_id, clothing_id, name, size, price, cost_price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
        saleId, item.id, item.name, item.size, item.price, item.purchaseCost, quantity,
      );
    }
    await db.runAsync(
      'INSERT INTO credit_sales (sale_id, customer_id, initial_paid) VALUES (?, ?, ?)',
      saleId, customerId, initialPaid,
    );
  });
  return saleId;
}

export async function getCreditLedger(db: SQLiteDatabase, status?: CreditStatus) {
  const statusClause = status === 'unpaid'
    ? 'AND credit_sales.settled_at IS NULL'
    : status === 'settled' ? 'AND credit_sales.settled_at IS NOT NULL' : '';
  return db.getAllAsync<CreditLedgerRow>(
    `SELECT credit_sales.id, credit_sales.sale_id AS saleId, credit_sales.customer_id AS customerId,
            customers.name AS customerName, customers.phone AS customerPhone, sales.total,
            CASE WHEN credit_sales.settled_at IS NULL THEN credit_sales.initial_paid ELSE sales.total END AS paidAmount,
            CASE WHEN credit_sales.settled_at IS NULL THEN sales.total - credit_sales.initial_paid ELSE 0 END AS balance,
            CASE WHEN credit_sales.settled_at IS NULL THEN 'unpaid' ELSE 'settled' END AS status,
            credit_sales.created_at AS createdAt, credit_sales.settled_at AS settledAt
     FROM credit_sales
     JOIN customers ON customers.id = credit_sales.customer_id
     JOIN sales ON sales.id = credit_sales.sale_id
     WHERE 1 = 1 ${statusClause}
     ORDER BY credit_sales.created_at DESC`,
  );
}

export async function settleCreditSale(db: SQLiteDatabase, creditId: number) {
  await db.withTransactionAsync(async () => {
    const credit = await db.getFirstAsync<{ id: number; settledAt: string | null }>(
      'SELECT id, settled_at AS settledAt FROM credit_sales WHERE id = ?', creditId,
    );
    if (!credit) throw new Error(CREDIT_NOT_FOUND_ERROR);
    if (credit.settledAt) throw new Error(CREDIT_ALREADY_SETTLED_ERROR);
    const result = await db.runAsync(
      'UPDATE credit_sales SET settled_at = CURRENT_TIMESTAMP WHERE id = ? AND settled_at IS NULL',
      creditId,
    );
    if (result.changes !== 1) throw new Error(CREDIT_ALREADY_SETTLED_ERROR);
  });
}

export async function updateSale(
  db: SQLiteDatabase,
  saleId: number,
  input: SaleUpdateInput,
): Promise<void> {
  if (!Number.isSafeInteger(saleId) || saleId <= 0
    || !Number.isFinite(input.taxAmount) || input.taxAmount < 0
    || typeof input.taxReason !== 'string'
    || !Number.isFinite(input.discountAmount) || input.discountAmount < 0
    || typeof input.discountReason !== 'string' || !input.lines.length) {
    throw new Error(INVALID_SALE_UPDATE_ERROR);
  }

  const quantities = new Map<number, number>();
  for (const line of input.lines) {
    if (!Number.isSafeInteger(line.clothingId) || line.clothingId <= 0
      || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      throw new Error(INVALID_SALE_UPDATE_ERROR);
    }
    quantities.set(line.clothingId, (quantities.get(line.clothingId) ?? 0) + line.quantity);
  }

  await db.withTransactionAsync(async () => {
    const creditSale = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM credit_sales WHERE sale_id = ?',
      saleId,
    );
    if (creditSale) throw new Error(CREDIT_SALE_EDIT_FORBIDDEN_ERROR);
    const sale = await db.getFirstAsync<{ id: number }>('SELECT id FROM sales WHERE id = ?', saleId);
    if (!sale) throw new Error(SALE_NOT_FOUND_ERROR);

    const existingLines = await db.getAllAsync<SaleItem>(
      `SELECT id, sale_id AS saleId, clothing_id AS clothingId, name, size, price, cost_price AS costPrice, quantity
       FROM sale_items WHERE sale_id = ? ORDER BY id`,
      saleId,
    );
    const originalQuantities = new Map<number, number>();
    const originalSnapshots = new Map<number, SaleItem>();
    for (const line of existingLines) {
      originalQuantities.set(line.clothingId, (originalQuantities.get(line.clothingId) ?? 0) + line.quantity);
      if (!originalSnapshots.has(line.clothingId)) originalSnapshots.set(line.clothingId, line);
    }

    const affectedIds = new Set([...originalQuantities.keys(), ...quantities.keys()]);
    const liveItems = new Map<number, Pick<ClothingItem, 'id' | 'name' | 'size' | 'price' | 'purchaseCost'>>();
    for (const itemId of affectedIds) {
      const item = await db.getFirstAsync<Pick<ClothingItem, 'id' | 'name' | 'size' | 'price' | 'purchaseCost'>>(
        'SELECT id, name, size, price, purchase_cost AS purchaseCost FROM items WHERE id = ?',
        itemId,
      );
      if (!item) throw new Error(SALE_ITEM_UNAVAILABLE_ERROR);
      liveItems.set(itemId, item);
    }

    for (const itemId of affectedIds) {
      const previousQuantity = originalQuantities.get(itemId) ?? 0;
      const nextQuantity = quantities.get(itemId) ?? 0;
      const delta = nextQuantity - previousQuantity;
      if (delta > 0) {
        const stockUpdate = await db.runAsync(
          `UPDATE items
           SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND stock >= ?`,
          delta, itemId, delta,
        );
        if (stockUpdate.changes !== 1) throw new Error(INSUFFICIENT_STOCK_ERROR);
      } else if (delta < 0) {
        const stockUpdate = await db.runAsync(
          'UPDATE items SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          -delta, itemId,
        );
        if (stockUpdate.changes !== 1) throw new Error(SALE_ITEM_UNAVAILABLE_ERROR);
      }
    }

    const lines = [...quantities.entries()].map(([clothingId, quantity]) => {
      const snapshot = originalSnapshots.get(clothingId);
      const liveItem = liveItems.get(clothingId)!;
      return {
        clothingId,
        quantity,
        name: snapshot?.name ?? liveItem.name,
        size: snapshot?.size ?? liveItem.size,
        price: snapshot?.price ?? liveItem.price,
        costPrice: snapshot?.costPrice ?? liveItem.purchaseCost,
      };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    if (input.discountAmount > subtotal + input.taxAmount) {
      throw new Error(INVALID_SALE_UPDATE_ERROR);
    }
    const total = subtotal + input.taxAmount - input.discountAmount;

    await db.runAsync('DELETE FROM sale_items WHERE sale_id = ?', saleId);
    for (const line of lines) {
      await db.runAsync(
        'INSERT INTO sale_items (sale_id, clothing_id, name, size, price, cost_price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
        saleId, line.clothingId, line.name, line.size, line.price, line.costPrice, line.quantity,
      );
    }
    await db.runAsync(
      `UPDATE sales
       SET total = ?, tax_amount = ?, tax_reason = ?, discount_amount = ?, discount_reason = ?
       WHERE id = ?`,
      total, input.taxAmount, input.taxReason.trim(),
      input.discountAmount, input.discountReason.trim(), saleId,
    );
  });
}

export async function getSales(db: SQLiteDatabase) {
  return db.getAllAsync<Sale>(
    `SELECT sales.id, sales.total, sales.tax_amount AS taxAmount,
            sales.tax_reason AS taxReason,
            sales.discount_amount AS discountAmount,
            sales.discount_reason AS discountReason,
            sales.created_at AS createdAt,
      COALESCE(SUM(sale_items.quantity), 0) AS itemCount
     FROM sales LEFT JOIN sale_items ON sale_items.sale_id = sales.id
     GROUP BY sales.id ORDER BY sales.created_at DESC`,
  );
}

export async function getSale(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Sale>(
    `SELECT sales.id, sales.total, sales.tax_amount AS taxAmount,
            sales.tax_reason AS taxReason,
            sales.discount_amount AS discountAmount,
            sales.discount_reason AS discountReason,
            sales.created_at AS createdAt,
      COALESCE(SUM(sale_items.quantity), 0) AS itemCount
     FROM sales LEFT JOIN sale_items ON sale_items.sale_id = sales.id
     WHERE sales.id = ? GROUP BY sales.id`, id,
  );
}

export async function getSaleItems(db: SQLiteDatabase, saleId: number) {
  return db.getAllAsync<SaleItem>(
    `SELECT id, sale_id AS saleId, clothing_id AS clothingId, name, size, price, cost_price AS costPrice, quantity
     FROM sale_items WHERE sale_id = ? ORDER BY id`, saleId,
  );
}

function dbTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function getProfitSummary(
  db: SQLiteDatabase,
  startInclusive: Date,
  endExclusive: Date,
): Promise<ProfitSummary> {
  const row = await db.getFirstAsync<{ revenue: number; cost: number; saleCount: number }>(
    `SELECT COALESCE(SUM(sale_items.price * sale_items.quantity), 0) AS revenue,
            COALESCE(SUM(sale_items.cost_price * sale_items.quantity), 0) AS cost,
            COUNT(DISTINCT sale_items.sale_id) AS saleCount
     FROM sale_items
     JOIN sales ON sales.id = sale_items.sale_id
     WHERE sales.created_at >= ?
       AND sales.created_at < ?
       AND sale_items.cost_price > 0`,
    dbTimestamp(startInclusive), dbTimestamp(endExclusive),
  );
  const revenue = row?.revenue ?? 0;
  const cost = row?.cost ?? 0;
  const profit = revenue - cost;
  return { revenue, cost, profit, profitPercentage: revenue > 0 ? (profit / revenue) * 100 : 0, saleCount: row?.saleCount ?? 0 };
}

export async function clearSalesHistory(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM credit_sales');
    await db.runAsync('DELETE FROM sale_items');
    await db.runAsync('DELETE FROM sales');
  });
}

export async function getTodaySummary(db: SQLiteDatabase): Promise<TodaySummary> {
  const salesRow = await db.getFirstAsync<{ total: number; saleCount: number }>(
    `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS saleCount
     FROM sales WHERE date(created_at, 'localtime') = date('now', 'localtime')`,
  );
  const itemsRow = await db.getFirstAsync<{ itemCount: number }>(
    `SELECT COALESCE(SUM(sale_items.quantity), 0) AS itemCount
     FROM sale_items JOIN sales ON sales.id = sale_items.sale_id
     WHERE date(sales.created_at, 'localtime') = date('now', 'localtime')`,
  );
  return {
    total: salesRow?.total ?? 0,
    saleCount: salesRow?.saleCount ?? 0,
    itemCount: itemsRow?.itemCount ?? 0,
  };
}

export const DEFAULT_SHOP_NAME = 'AISource MM';
export const SHOP_UNLOCK_CODE = '123456';

export const SETTING_SHOP_NAME = 'shop_name';
export const SETTING_SHOP_NAME_UNLOCKED = 'shop_name_unlocked';
export const SETTING_STOCK_ALERT_LIMIT = 'stock_alert_limit';
export const SETTING_PROFIT_TRACKING_READY = 'profit_tracking_ready';
export const SETTING_SYNC_MODE = 'sync_mode';
export type SyncMode = 'offline' | 'online';

export const DEFAULT_STOCK_ALERT_LIMIT = 5;

export const SETTING_PRINTER_PAPER_WIDTH = 'printer_paper_width';

export type PaperWidth = '58' | '80';
export const DEFAULT_PAPER_WIDTH: PaperWidth = '58';

export async function getAppSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?', key,
  );
  return row?.value ?? null;
}

export async function setAppSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key, value,
  );
}

// Reset database generation: this opens a clean local POS database after the
// account/password implementation changed. The previous file remains intact
// on-device and is not silently deleted.
export const DATABASE_FILE_NAME = 'clothes-pos-v2.db';

export async function exportDatabaseFile(db: SQLiteDatabase): Promise<string> {
  try {
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // best effort — some versions may not support checkpointing
  }
  const bytes = await db.serializeAsync();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${ts}.db`;
  const file = new File(Paths.cache, fileName);
  if (!file.exists) file.create();
  file.write(bytes);
  return file.uri;
}

export async function exportDatabaseToDownloads(db: SQLiteDatabase): Promise<boolean> {
  try {
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // best effort — some versions may not support checkpointing
  }
  const bytes = await db.serializeAsync();
  const base64 = bytesToBase64(bytes);

  const downloadUri = LegacyFileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const perm = await LegacyFileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(downloadUri);
  if (!perm.granted) return false;

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `ais_pos_backup-${ts}.db`;
  const fileUri = await LegacyFileSystem.StorageAccessFramework.createFileAsync(
    perm.directoryUri,
    fileName,
    'application/octet-stream',
  );
  await LegacyFileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, base64, {
    encoding: 'base64',
  });
  return true;
}

export async function importDatabaseFile(db: SQLiteDatabase, sourceUri: string): Promise<void> {
  const bytes = await readPickedBytes(sourceUri);
  if (bytes.byteLength === 0) throw new Error('Picked file is empty');
  await (db as SQLiteDatabase & {
    deserializeAsync: (data: Uint8Array) => Promise<void>;
  }).deserializeAsync(bytes);
}

async function readPickedBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('content://')) {
    const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return base64ToBytes(base64);
  }
  const file = new File(uri);
  if (!file.exists) throw new Error('Picked database file does not exist');
  return file.bytes();
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return globalThis.btoa(binary);
}


export type SupabaseProjectConfig = {
  url: string;
  publishableKey: string;
  storageBucket: string;
  pathPrefix: string;
  active: boolean;
  lastTestResult: string | null;
  lastTestCode: string | null;
  lastTestedAt: string | null;
};

export type ProjectChangeGuard = {
  pendingOutbox: number;
  syncingOutbox: number;
  failedOutbox: number;
  openConflicts: number;
  pendingUploads: number;
  uploadingUploads: number;
  failedUploads: number;
  migrationActive: boolean;
  blocked: boolean;
};

const emptySupabaseProjectConfig: SupabaseProjectConfig = { url: '', publishableKey: '', storageBucket: '', pathPrefix: '', active: false, lastTestResult: null, lastTestCode: null, lastTestedAt: null };

export async function getSupabaseProjectConfig(db: SQLiteDatabase): Promise<SupabaseProjectConfig> {
  const row = await db.getFirstAsync<SupabaseProjectConfig & { active: number }>(`SELECT url, publishable_key AS publishableKey, storage_bucket AS storageBucket, path_prefix AS pathPrefix, active, last_test_result AS lastTestResult, last_test_code AS lastTestCode, last_tested_at AS lastTestedAt FROM supabase_project_config WHERE id = 1`);
  return row ? { ...row, active: Boolean(row.active) } : emptySupabaseProjectConfig;
}

export async function getProjectChangeGuard(db: SQLiteDatabase): Promise<ProjectChangeGuard> {
  const [outbox, conflicts, uploads, migration] = await Promise.all([
    db.getFirstAsync<{ pendingOutbox: number; syncingOutbox: number; failedOutbox: number }>(`SELECT SUM(status = 'pending') AS pendingOutbox, SUM(status = 'syncing') AS syncingOutbox, SUM(status = 'failed') AS failedOutbox FROM sync_outbox`),
    db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM sync_conflicts WHERE resolution_status = 'open'`),
    db.getFirstAsync<{ pendingUploads: number; uploadingUploads: number; failedUploads: number }>(`SELECT SUM(status = 'pending') AS pendingUploads, SUM(status = 'uploading') AS uploadingUploads, SUM(status = 'failed') AS failedUploads FROM local_file_uploads`),
    db.getFirstAsync<{ requestedAt: string | null; completed: string | null }>(`SELECT migration_requested_at AS requestedAt, migration_completed AS completed FROM sync_metadata WHERE id = 1`),
  ]);
  const result = { pendingOutbox: outbox?.pendingOutbox ?? 0, syncingOutbox: outbox?.syncingOutbox ?? 0, failedOutbox: outbox?.failedOutbox ?? 0, openConflicts: conflicts?.count ?? 0, pendingUploads: uploads?.pendingUploads ?? 0, uploadingUploads: uploads?.uploadingUploads ?? 0, failedUploads: uploads?.failedUploads ?? 0, migrationActive: Boolean(migration?.requestedAt) && migration?.completed !== '1' };
  return { ...result, blocked: Object.values(result).some(Boolean) };
}

function materiallyChanges(a: SupabaseProjectConfig, b: Pick<SupabaseProjectConfig, 'url' | 'publishableKey' | 'storageBucket' | 'pathPrefix'>) {
  return a.url !== b.url.trim() || a.publishableKey !== b.publishableKey.trim() || a.storageBucket !== b.storageBucket.trim() || a.pathPrefix !== b.pathPrefix.trim().replace(/^\/+|\/+$/g, '');
}

export async function saveSupabaseProjectConfig(db: SQLiteDatabase, input: Pick<SupabaseProjectConfig, 'url' | 'publishableKey' | 'storageBucket' | 'pathPrefix'>): Promise<void> {
  const next = { url: input.url.trim(), publishableKey: input.publishableKey.trim(), storageBucket: input.storageBucket.trim(), pathPrefix: input.pathPrefix.trim().replace(/^\/+|\/+$/g, '') };
  if (!next.url || !next.publishableKey) throw new Error('SUPABASE_CONFIG_REQUIRED');
  await db.withTransactionAsync(async () => {
    const current = await getSupabaseProjectConfig(db);
    if (current.active && materiallyChanges(current, next)) {
      const guard = await getProjectChangeGuard(db);
      if (guard.blocked) throw Object.assign(new Error('SUPABASE_PROJECT_CHANGE_BLOCKED'), { guard });
    }
    await db.runAsync(`UPDATE supabase_project_config SET url = ?, publishable_key = ?, storage_bucket = ?, path_prefix = ?, active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1`, next.url, next.publishableKey, next.storageBucket, next.pathPrefix);
  });
}

export async function clearSupabaseProjectConfig(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const current = await getSupabaseProjectConfig(db);
    if (current.active) {
      const guard = await getProjectChangeGuard(db);
      if (guard.blocked) throw Object.assign(new Error('SUPABASE_PROJECT_CHANGE_BLOCKED'), { guard });
    }
    await db.runAsync(`UPDATE supabase_project_config SET url = '', publishable_key = '', storage_bucket = '', path_prefix = '', active = 0, last_test_result = NULL, last_test_code = NULL, last_tested_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1`);
  });
}

export async function saveSupabaseTestResult(db: SQLiteDatabase, result: string, code: string | null): Promise<void> {
  await db.runAsync(`UPDATE supabase_project_config SET last_test_result = ?, last_test_code = ?, last_tested_at = CURRENT_TIMESTAMP WHERE id = 1`, result, code);
}
