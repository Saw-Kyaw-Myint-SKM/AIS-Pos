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

export async function initializeDatabase(db: SQLiteDatabase) {
  // Set WAL mode in its own execAsync so the journal-mode switch doesn't
  // leave an open statement when the enclosing transaction commits.
  // Without this, expo-sqlite 16 on Android rejects subsequent closeAsync
  // with "unable to close due to unfinalized statements".
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Rename the legacy inventory table in place before creating the canonical
  // table. ALTER TABLE preserves existing rows, IDs, constraints, and indexes.
  const existingInventoryTables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('clothes', 'items')`,
  );
  const hasLegacyClothes = existingInventoryTables.some((table) => table.name === 'clothes');
  const hasItems = existingInventoryTables.some((table) => table.name === 'items');
  if (hasLegacyClothes && hasItems) {
    throw new Error('Both legacy clothes and items tables exist; inventory migration cannot continue safely.');
  }
  if (hasLegacyClothes) {
    await db.execAsync('ALTER TABLE clothes RENAME TO items;');
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

  const cols = await db.getAllAsync<{ name: string; notnull: number }>('PRAGMA table_info(items)');
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('purchase_cost')) {
    await db.execAsync('ALTER TABLE items ADD COLUMN purchase_cost REAL NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0)');
  }
  if (!colNames.has('category')) {
    await db.execAsync("ALTER TABLE items ADD COLUMN category TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has('stock')) {
    await db.execAsync('ALTER TABLE items ADD COLUMN stock INTEGER NOT NULL DEFAULT 0');
  }
  if (!colNames.has('choice_type')) {
    await db.execAsync("ALTER TABLE items ADD COLUMN choice_type TEXT NOT NULL DEFAULT 'color'");
  }
  if (!colNames.has('color_value')) {
    await db.execAsync("ALTER TABLE items ADD COLUMN color_value TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has('note')) {
    await db.execAsync("ALTER TABLE items ADD COLUMN note TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has('photo_uri')) {
    await db.execAsync("ALTER TABLE items ADD COLUMN photo_uri TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has('category_id')) {
    await db.execAsync('ALTER TABLE items ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');
  }

  const qrCodeColumn = cols.find((column) => column.name === 'qr_code');
  if (qrCodeColumn?.notnull) {
    const foreignKeys = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    await db.execAsync('PRAGMA foreign_keys = OFF');
    try {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE items_rebuilt (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            qr_code TEXT UNIQUE,
            name TEXT NOT NULL,
            size TEXT NOT NULL,
            price REAL NOT NULL CHECK (price >= 0),
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
            id, qr_code, name, size, price, category, category_id, stock,
            choice_type, color_value, photo_uri, note, created_at, updated_at
          )
          SELECT
            id, NULLIF(TRIM(qr_code), ''), name, size, price, category, category_id, stock,
            choice_type, color_value, photo_uri, note, created_at, updated_at
          FROM items;
          DROP TABLE items;
          ALTER TABLE items_rebuilt RENAME TO items;
        `);
      });
    } finally {
      await db.execAsync(`PRAGMA foreign_keys = ${foreignKeys?.foreign_keys ? 'ON' : 'OFF'}`);
    }
  }

  const salesCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sales)');
  const salesColNames = new Set(salesCols.map((c) => c.name));
  if (!salesColNames.has('tax_amount')) {
    await db.execAsync('ALTER TABLE sales ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0');
  }
  if (!salesColNames.has('tax_reason')) {
    await db.execAsync("ALTER TABLE sales ADD COLUMN tax_reason TEXT NOT NULL DEFAULT ''");
  }
  if (!salesColNames.has('discount_amount')) {
    await db.execAsync('ALTER TABLE sales ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0');
  }
  if (!salesColNames.has('discount_reason')) {
    await db.execAsync("ALTER TABLE sales ADD COLUMN discount_reason TEXT NOT NULL DEFAULT ''");
  }

  const saleItemCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sale_items)');
  const saleItemColNames = new Set(saleItemCols.map((c) => c.name));
  if (!saleItemColNames.has('cost_price')) {
    await db.execAsync('ALTER TABLE sale_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0 CHECK (cost_price >= 0)');
  }

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
) {
  if (item.id) {
    await db.runAsync(
      `UPDATE items SET qr_code = ?, name = ?, size = ?, price = ?, purchase_cost = ?, category_id = ?, stock = ?, choice_type = ?, color_value = ?, photo_uri = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      item.qrCode, item.name, item.size, item.price, item.purchaseCost, item.categoryId, item.stock, item.choiceType, item.colorValue, item.photoUri, item.note, item.id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO items (qr_code, name, size, price, purchase_cost, category_id, stock, choice_type, color_value, photo_uri, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      item.qrCode, item.name, item.size, item.price, item.purchaseCost, item.categoryId, item.stock, item.choiceType, item.colorValue, item.photoUri, item.note,
    );
  }
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

export const DEFAULT_STOCK_ALERT_LIMIT = 5;

export const SETTING_PRINTER_TARGET = 'printer_target';
export const SETTING_PRINTER_DEVICE_NAME = 'printer_device_name';
export const SETTING_PRINTER_PAPER_WIDTH = 'printer_paper_width';
export const SETTING_PRINTER_MODE = 'printer_mode';
export const SETTING_PRINTER_AUTO_CUT = 'printer_auto_cut';

export type PaperWidth = '58' | '80';
export type PrinterMode = 'epson' | 'mock';
export const DEFAULT_PAPER_WIDTH: PaperWidth = '58';
export const DEFAULT_PRINTER_MODE: PrinterMode = 'epson';

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

export type PrinterSettings = {
  target: string;
  deviceName: string;
  paperWidth: PaperWidth;
  autoCut: boolean;
};

export async function savePrinterSettings(db: SQLiteDatabase, settings: PrinterSettings): Promise<void> {
  const entries: Array<[string, string]> = [
    [SETTING_PRINTER_TARGET, settings.target],
    [SETTING_PRINTER_DEVICE_NAME, settings.deviceName],
    [SETTING_PRINTER_PAPER_WIDTH, settings.paperWidth],
    [SETTING_PRINTER_MODE, DEFAULT_PRINTER_MODE],
    [SETTING_PRINTER_AUTO_CUT, settings.autoCut ? '1' : '0'],
  ];

  await db.withTransactionAsync(async () => {
    for (const [key, value] of entries) {
      await db.runAsync(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        key, value,
      );
    }
  });
}

export const DATABASE_FILE_NAME = 'clothes-pos.db';

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
  if (!bytes || bytes.byteLength === 0) throw new Error('Picked file is empty');
  try {
    await db.closeAsync();
  } catch {
    // already closed or unavailable
  }
  const dir = getDbDirectory();
  const dest = new File(dir, DATABASE_FILE_NAME);
  if (!dest.exists) dest.create();
  dest.write(bytes);

  try {
    const wal = new File(dir, DATABASE_FILE_NAME + '-wal');
    if (wal.exists) wal.delete();
  } catch {
    // ignore
  }
  try {
    const shm = new File(dir, DATABASE_FILE_NAME + '-shm');
    if (shm.exists) shm.delete();
  } catch {
    // ignore
  }
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
