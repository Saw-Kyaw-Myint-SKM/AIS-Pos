import {
  createSale,
  INSUFFICIENT_STOCK_ERROR,
  type ClothingItem,
} from '../src/db';

type FakeItem = Pick<ClothingItem, 'id' | 'stock'>;
type FakeSale = { id: number; total: number; taxAmount: number; taxReason: string };
type FakeSaleItem = { saleId: number; clothingId: number; quantity: number };

type FakeDb = {
  items: FakeItem[];
  sales: FakeSale[];
  saleItems: FakeSaleItem[];
  nextSaleId: number;
  runAsync: (sql: string, ...params: unknown[]) => Promise<{ lastInsertRowId: number; changes: number }>;
  withTransactionAsync: (operation: () => Promise<void>) => Promise<void>;
};

function createFakeDb(items: FakeItem[]): FakeDb {
  const db: FakeDb = {
    items: items.map((item) => ({ ...item })),
    sales: [],
    saleItems: [],
    nextSaleId: 1,
    runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
    withTransactionAsync: async () => {},
  };

  db.runAsync = async (sql, ...params) => {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('INSERT INTO SALES')) {
      const [total, taxAmount, taxReason] = params as [number, number, string];
      const id = db.nextSaleId++;
      db.sales.push({ id, total, taxAmount, taxReason });
      return { lastInsertRowId: id, changes: 1 };
    }
    if (normalized.startsWith('UPDATE ITEMS')) {
      const [quantity, id, minimumStock] = params as [number, number, number];
      const item = db.items.find((candidate) => candidate.id === id);
      if (!item || item.stock < minimumStock) return { lastInsertRowId: 0, changes: 0 };
      item.stock -= quantity;
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (normalized.startsWith('INSERT INTO SALE_ITEMS')) {
      const [saleId, clothingId,,,, quantity] = params as [number, number, string, string, number, number];
      db.saleItems.push({ saleId, clothingId, quantity });
      return { lastInsertRowId: db.saleItems.length, changes: 1 };
    }
    throw new Error(`Unhandled SQL: ${sql}`);
  };

  db.withTransactionAsync = async (operation) => {
    const itemSnapshot = db.items.map((item) => ({ ...item }));
    const salesSnapshot = db.sales.map((sale) => ({ ...sale }));
    const saleItemsSnapshot = db.saleItems.map((saleItem) => ({ ...saleItem }));
    const nextSaleIdSnapshot = db.nextSaleId;
    try {
      await operation();
    } catch (error) {
      db.items = itemSnapshot;
      db.sales = salesSnapshot;
      db.saleItems = saleItemsSnapshot;
      db.nextSaleId = nextSaleIdSnapshot;
      throw error;
    }
  };

  return db;
}

function item(id: number, stock: number, price = 1000): ClothingItem {
  return {
    id,
    qrCode: `item-${id}`,
    name: `Item ${id}`,
    size: 'M',
    price,
    categoryId: null,
    categoryName: '',
    categoryColor: '',
    stock,
    choiceType: 'color',
    colorValue: '#000000',
    photoUri: '',
    note: '',
  };
}

describe('createSale stock handling', () => {
  test('stores the sale and reduces stock after a successful checkout', async () => {
    const db = createFakeDb([{ id: 1, stock: 5 }]);
    const saleId = await createSale(db as never, [item(1, 5)], { 1: 2 }, 100, 'အခွန်');

    expect(saleId).toBe(1);
    expect(db.items[0].stock).toBe(3);
    expect(db.sales).toEqual([{ id: 1, total: 2100, taxAmount: 100, taxReason: 'အခွန်' }]);
    expect(db.saleItems).toEqual([{ saleId: 1, clothingId: 1, quantity: 2 }]);
  });

  test('rolls back all sale and stock changes when an item is short of stock', async () => {
    const db = createFakeDb([{ id: 1, stock: 5 }, { id: 2, stock: 1 }]);

    await expect(
      createSale(db as never, [item(1, 5), item(2, 1)], { 1: 2, 2: 2 }),
    ).rejects.toThrow(INSUFFICIENT_STOCK_ERROR);

    expect(db.items).toEqual([{ id: 1, stock: 5 }, { id: 2, stock: 1 }]);
    expect(db.sales).toEqual([]);
    expect(db.saleItems).toEqual([]);
  });
});
