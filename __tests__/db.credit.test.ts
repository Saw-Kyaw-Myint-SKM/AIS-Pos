import {
  CREDIT_ALREADY_SETTLED_ERROR,
  CUSTOMER_HAS_CREDIT_ERROR,
  INSUFFICIENT_STOCK_ERROR,
  createCreditSale,
  deleteCustomer,
  settleCreditSale,
  type ClothingItem,
} from '../src/db';

type Credit = { id: number; saleId: number; customerId: number; initialPaid: number; settledAt: string | null };
type FakeDb = {
  customers: { id: number }[];
  items: { id: number; stock: number }[];
  credits: Credit[];
  nextSaleId: number;
  runAsync: (sql: string, ...params: unknown[]) => Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;
};

function createDb(stock = 5): FakeDb {
  const db: FakeDb = {
    customers: [{ id: 1 }], items: [{ id: 1, stock }], credits: [], nextSaleId: 1,
    runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
    getFirstAsync: async () => null,
    withTransactionAsync: async () => {},
  };
  db.getFirstAsync = async <T>(sql: string, ...params: unknown[]) => {
    const normalized = sql.toUpperCase();
    const id = params[0] as number;
    if (normalized.includes('FROM CUSTOMERS')) return (db.customers.find((customer) => customer.id === id) ?? null) as T | null;
    if (normalized.includes('FROM CREDIT_SALES') && normalized.includes('WHERE ID')) return (db.credits.find((credit) => credit.id === id) ?? null) as T | null;
    return null;
  };
  db.runAsync = async (sql, ...params) => {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('INSERT INTO SALES')) return { lastInsertRowId: db.nextSaleId++, changes: 1 };
    if (normalized.startsWith('UPDATE ITEMS')) {
      const [quantity, id, minimum] = params as [number, number, number];
      const item = db.items.find((candidate) => candidate.id === id);
      if (!item || item.stock < minimum) return { lastInsertRowId: 0, changes: 0 };
      item.stock -= quantity;
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (normalized.startsWith('INSERT INTO SALE_ITEMS')) return { lastInsertRowId: 1, changes: 1 };
    if (normalized.startsWith('INSERT INTO CREDIT_SALES')) {
      const [saleId, customerId, initialPaid] = params as [number, number, number];
      db.credits.push({ id: db.credits.length + 1, saleId, customerId, initialPaid, settledAt: null });
      return { lastInsertRowId: db.credits.length, changes: 1 };
    }
    if (normalized.startsWith('UPDATE CREDIT_SALES')) {
      const credit = db.credits.find((candidate) => candidate.id === params[0] && candidate.settledAt === null);
      if (!credit) return { lastInsertRowId: 0, changes: 0 };
      credit.settledAt = '2026-01-01 00:00:00';
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (normalized.startsWith('DELETE FROM CUSTOMERS')) {
      const id = params[0] as number;
      if (db.credits.some((credit) => credit.customerId === id)) return { lastInsertRowId: 0, changes: 0 };
      const before = db.customers.length;
      db.customers = db.customers.filter((customer) => customer.id !== id);
      return { lastInsertRowId: 0, changes: before - db.customers.length };
    }
    throw new Error(`Unhandled SQL: ${sql}`);
  };
  db.withTransactionAsync = async (task) => {
    const items = db.items.map((item) => ({ ...item }));
    const credits = db.credits.map((credit) => ({ ...credit }));
    const nextSaleId = db.nextSaleId;
    try { await task(); } catch (error) { db.items = items; db.credits = credits; db.nextSaleId = nextSaleId; throw error; }
  };
  return db;
}

function item(stock = 5): ClothingItem {
  return { id: 1, qrCode: 'code', name: 'အင်္ကျီ', size: 'M', price: 1000, purchaseCost: 500, categoryId: null, categoryName: '', categoryColor: '', stock, choiceType: 'color', colorValue: '', photoUri: '', note: '' };
}

describe('credit sales', () => {
  test('stores zero and partial payments while reducing stock', async () => {
    const db = createDb();
    await createCreditSale(db as never, 1, [item()], { 1: 2 }, 0);
    await createCreditSale(db as never, 1, [item(3)], { 1: 1 }, 500);
    expect(db.items[0].stock).toBe(2);
    expect(db.credits.map((credit) => credit.initialPaid)).toEqual([0, 500]);
  });

  test('rolls back stock and credit record when inventory is unavailable', async () => {
    const db = createDb(1);
    await expect(createCreditSale(db as never, 1, [item(1)], { 1: 2 }, 0)).rejects.toThrow(INSUFFICIENT_STOCK_ERROR);
    expect(db.items[0].stock).toBe(1);
    expect(db.credits).toEqual([]);
  });

  test('settles only once and prevents deleting a linked customer', async () => {
    const db = createDb();
    await createCreditSale(db as never, 1, [item()], { 1: 1 }, 0);
    await settleCreditSale(db as never, 1);
    await expect(settleCreditSale(db as never, 1)).rejects.toThrow(CREDIT_ALREADY_SETTLED_ERROR);
    await expect(deleteCustomer(db as never, 1)).rejects.toThrow(CUSTOMER_HAS_CREDIT_ERROR);
  });
});
