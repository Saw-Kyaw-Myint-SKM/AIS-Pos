import type { SQLiteDatabase } from 'expo-sqlite';

export type CustomerProfile = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type ClothingItem = {
  id: number;
  qrCode: string;
  name: string;
  size: string;
  price: number;
  category: string;
  stock: number;
  choiceType: 'color' | 'photo';
  colorValue: string;
  note: string;
};

export type Sale = {
  id: number;
  total: number;
  createdAt: string;
  itemCount: number;
};

export type SaleItem = {
  id: number;
  saleId: number;
  clothingId: number;
  name: string;
  size: string;
  price: number;
  quantity: number;
};

export type TodaySummary = {
  total: number;
  saleCount: number;
  itemCount: number;
};

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS customer_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS clothes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      size TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      category TEXT NOT NULL DEFAULT '',
      stock INTEGER NOT NULL DEFAULT 0,
      choice_type TEXT NOT NULL DEFAULT 'color',
      color_value TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      clothing_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      size TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0)
    );
  `);

  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(clothes)');
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('category')) {
    await db.execAsync("ALTER TABLE clothes ADD COLUMN category TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has('stock')) {
    await db.execAsync('ALTER TABLE clothes ADD COLUMN stock INTEGER NOT NULL DEFAULT 0');
  }
  if (!colNames.has('choice_type')) {
    await db.execAsync("ALTER TABLE clothes ADD COLUMN choice_type TEXT NOT NULL DEFAULT 'color'");
  }
  if (!colNames.has('color_value')) {
    await db.execAsync("ALTER TABLE clothes ADD COLUMN color_value TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has('note')) {
    await db.execAsync("ALTER TABLE clothes ADD COLUMN note TEXT NOT NULL DEFAULT ''");
  }

  const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM clothes');
  if (!count?.count) {
    await db.runAsync(
      'INSERT INTO clothes (qr_code, name, size, price) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)',
      'SHIRT-WHITE-M', 'အင်္ကျီအဖြူ', 'M', 8500,
      'JEANS-BLUE-32', 'ဂျင်းဘောင်းဘီအပြာ', '32', 25000,
      'LONGYI-GREEN-FREE', 'လုံချည်အစိမ်း', 'Free', 12000,
      'TSHIRT-BLACK-L', 'တီရှပ်အနက်', 'L', 9000,
      '2000000000017', 'လက်ကိုင်အိတ်အနက်', 'Free', 4500,
    );
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

export async function getClothingItems(db: SQLiteDatabase) {
  return db.getAllAsync<ClothingItem>(
    'SELECT id, qr_code AS qrCode, name, size, price, category, stock, choice_type AS choiceType, color_value AS colorValue, note FROM clothes ORDER BY name COLLATE NOCASE',
  );
}

export async function findClothingByQr(db: SQLiteDatabase, qrCode: string) {
  return db.getFirstAsync<ClothingItem>(
    'SELECT id, qr_code AS qrCode, name, size, price, category, stock, choice_type AS choiceType, color_value AS colorValue, note FROM clothes WHERE qr_code = ?', qrCode,
  );
}

export async function saveClothingItem(
  db: SQLiteDatabase,
  item: Pick<ClothingItem, 'id' | 'qrCode' | 'name' | 'size' | 'price' | 'category' | 'stock' | 'choiceType' | 'colorValue' | 'note'>,
) {
  if (item.id) {
    await db.runAsync(
      'UPDATE clothes SET qr_code = ?, name = ?, size = ?, price = ?, category = ?, stock = ?, choice_type = ?, color_value = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      item.qrCode, item.name, item.size, item.price, item.category, item.stock, item.choiceType, item.colorValue, item.note, item.id,
    );
  } else {
    await db.runAsync(
      'INSERT INTO clothes (qr_code, name, size, price, category, stock, choice_type, color_value, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      item.qrCode, item.name, item.size, item.price, item.category, item.stock, item.choiceType, item.colorValue, item.note,
    );
  }
}

export async function deleteClothingItem(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM clothes WHERE id = ?', id);
}

export async function createSale(
  db: SQLiteDatabase,
  items: ClothingItem[],
  quantities: Record<number, number>,
): Promise<number> {
  const total = items.reduce((sum, item) => sum + item.price * (quantities[item.id] ?? 0), 0);
  let saleId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync('INSERT INTO sales (total) VALUES (?)', total);
    saleId = result.lastInsertRowId;
    for (const item of items) {
      const quantity = quantities[item.id] ?? 0;
      if (quantity > 0) {
        await db.runAsync(
          'INSERT INTO sale_items (sale_id, clothing_id, name, size, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
          saleId, item.id, item.name, item.size, item.price, quantity,
        );
      }
    }
  });
  return saleId;
}

export async function getSales(db: SQLiteDatabase) {
  return db.getAllAsync<Sale>(
    `SELECT sales.id, sales.total, sales.created_at AS createdAt,
      COALESCE(SUM(sale_items.quantity), 0) AS itemCount
     FROM sales LEFT JOIN sale_items ON sale_items.sale_id = sales.id
     GROUP BY sales.id ORDER BY sales.created_at DESC`,
  );
}

export async function getSale(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Sale>(
    `SELECT sales.id, sales.total, sales.created_at AS createdAt,
      COALESCE(SUM(sale_items.quantity), 0) AS itemCount
     FROM sales LEFT JOIN sale_items ON sale_items.sale_id = sales.id
     WHERE sales.id = ? GROUP BY sales.id`, id,
  );
}

export async function getSaleItems(db: SQLiteDatabase, saleId: number) {
  return db.getAllAsync<SaleItem>(
    `SELECT id, sale_id AS saleId, clothing_id AS clothingId, name, size, price, quantity
     FROM sale_items WHERE sale_id = ? ORDER BY id`, saleId,
  );
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
