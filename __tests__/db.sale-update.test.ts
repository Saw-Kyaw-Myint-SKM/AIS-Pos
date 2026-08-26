import {
  INSUFFICIENT_STOCK_ERROR,
  updateSale,
  type SaleItem,
} from '../src/db';

type Item = { id: number; name: string; size: string; price: number; stock: number };
type Sale = {
  id: number;
  total: number;
  taxAmount: number;
  taxReason: string;
  discountAmount: number;
  discountReason: string;
};

type FakeDb = {
  items: Item[];
  sales: Sale[];
  saleItems: SaleItem[];
  runAsync: (sql: string, ...params: unknown[]) => Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
  withTransactionAsync: (operation: () => Promise<void>) => Promise<void>;
};

function createDb(): FakeDb {
  const db: FakeDb = {
    items: [
      { id: 1, name: 'Old shirt', size: 'M', price: 999, stock: 5 },
      { id: 2, name: 'New longyi', size: 'L', price: 300, stock: 4 },
    ],
    sales: [{ id: 1, total: 200, taxAmount: 0, taxReason: '', discountAmount: 0, discountReason: '' }],
    saleItems: [{ id: 1, saleId: 1, clothingId: 1, name: 'Original shirt', size: 'S', price: 100, quantity: 2 }],
    runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
    withTransactionAsync: async () => {},
  };

  db.getFirstAsync = async <T>(sql: string, ...params: unknown[]) => {
    const normalized = sql.trim().toUpperCase();
    const id = params[0] as number;
    if (normalized.includes('FROM SALES')) return (db.sales.find((sale) => sale.id === id) ?? null) as T | null;
    if (normalized.includes('FROM ITEMS')) return (db.items.find((item) => item.id === id) ?? null) as T | null;
    return null;
  };
  db.getAllAsync = async <T>(_sql: string, ...params: unknown[]) => db.saleItems
    .filter((line) => line.saleId === params[0]) as T[];
  db.runAsync = async (sql, ...params) => {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('UPDATE ITEMS') && normalized.includes('STOCK = STOCK -')) {
      const [quantity, id, minimum] = params as [number, number, number];
      const item = db.items.find((candidate) => candidate.id === id);
      if (!item || item.stock < minimum) return { lastInsertRowId: 0, changes: 0 };
      item.stock -= quantity;
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (normalized.startsWith('UPDATE ITEMS') && normalized.includes('STOCK = STOCK +')) {
      const [quantity, id] = params as [number, number];
      const item = db.items.find((candidate) => candidate.id === id);
      if (!item) return { lastInsertRowId: 0, changes: 0 };
      item.stock += quantity;
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (normalized.startsWith('DELETE FROM SALE_ITEMS')) {
      db.saleItems = db.saleItems.filter((line) => line.saleId !== params[0]);
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (normalized.startsWith('INSERT INTO SALE_ITEMS')) {
      const [saleId, clothingId, name, size, price, quantity] = params as [number, number, string, string, number, number];
      db.saleItems.push({ id: db.saleItems.length + 1, saleId, clothingId, name, size, price, quantity });
      return { lastInsertRowId: db.saleItems.length, changes: 1 };
    }
    if (normalized.startsWith('UPDATE SALES')) {
      const [total, taxAmount, taxReason, discountAmount, discountReason, id] = params as [number, number, string, number, string, number];
      const sale = db.sales.find((candidate) => candidate.id === id)!;
      sale.total = total;
      sale.taxAmount = taxAmount;
      sale.taxReason = taxReason;
      sale.discountAmount = discountAmount;
      sale.discountReason = discountReason;
      return { lastInsertRowId: 0, changes: 1 };
    }
    throw new Error(`Unhandled SQL: ${sql}`);
  };
  db.withTransactionAsync = async (operation) => {
    const items = db.items.map((item) => ({ ...item }));
    const sales = db.sales.map((sale) => ({ ...sale }));
    const saleItems = db.saleItems.map((line) => ({ ...line }));
    try { await operation(); } catch (error) {
      db.items = items;
      db.sales = sales;
      db.saleItems = saleItems;
      throw error;
    }
  };
  return db;
}

describe('updateSale', () => {
  test('reconciles stock and retains existing line snapshots', async () => {
    const db = createDb();
    await updateSale(db as never, 1, {
      lines: [{ clothingId: 1, quantity: 1 }, { clothingId: 2, quantity: 2 }],
      taxAmount: 50,
      taxReason: 'အခွန်',
      discountAmount: 25,
      discountReason: 'လျော့စျေး',
    });

    expect(db.items.map(({ id, stock }) => ({ id, stock }))).toEqual([{ id: 1, stock: 6 }, { id: 2, stock: 2 }]);
    expect(db.sales[0]).toEqual({ id: 1, total: 725, taxAmount: 50, taxReason: 'အခွန်', discountAmount: 25, discountReason: 'လျော့စျေး' });
    expect(db.saleItems).toEqual([
      expect.objectContaining({ clothingId: 1, name: 'Original shirt', size: 'S', price: 100, quantity: 1 }),
      expect.objectContaining({ clothingId: 2, name: 'New longyi', size: 'L', price: 300, quantity: 2 }),
    ]);
  });

  test('rolls back every change when additional stock is unavailable', async () => {
    const db = createDb();
    await expect(updateSale(db as never, 1, {
      lines: [{ clothingId: 1, quantity: 8 }],
      taxAmount: 0,
      taxReason: '',
      discountAmount: 0,
      discountReason: '',
    })).rejects.toThrow(INSUFFICIENT_STOCK_ERROR);

    expect(db.items.map(({ id, stock }) => ({ id, stock }))).toEqual([{ id: 1, stock: 5 }, { id: 2, stock: 4 }]);
    expect(db.sales[0].total).toBe(200);
    expect(db.saleItems).toHaveLength(1);
  });
});
