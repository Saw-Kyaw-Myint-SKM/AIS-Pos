import {
  saveCategory,
  deleteCategory,
  getCategories,
  reorderCategories,
  type Category,
  type CategoryInput,
} from "../src/db";

interface FakeDb {
  categories: Category[];
  nextId: number;
  runAsync: jest.Mock;
  getAllAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
  execAsync: jest.Mock;
}

function createFakeDb(): FakeDb {
  const db: FakeDb = {
    categories: [],
    nextId: 1,
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    withTransactionAsync: jest.fn(async (fn: any) => fn(db)),
    execAsync: jest.fn(async () => {}),
  } as any;

  db.runAsync.mockImplementation(async (sql: string, ...params: any[]) => {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith("INSERT INTO CATEGORIES")) {
      const [name, color, position] = params;
      const exists = db.categories.find(
        (c) => c.name.toLowerCase() === String(name).toLowerCase(),
      );
      if (exists) {
        throw new Error("UNIQUE constraint failed: categories.name");
      }
      const id = db.nextId++;
      db.categories.push({
        id,
        name: String(name),
        color: String(color),
        position: Number(position),
        createdAt: "2026-01-01 00:00:00",
        updatedAt: "2026-01-01 00:00:00",
      });
      return { lastInsertRowId: id, changes: 1 };
    }
    if (trimmed.startsWith("UPDATE CATEGORIES SET POSITION = ?")) {
      const [position, id] = params;
      const found = db.categories.find((c) => c.id === Number(id));
      if (found) found.position = Number(position);
      return { changes: 1 };
    }
    if (trimmed.startsWith("UPDATE CATEGORIES SET NAME = ?")) {
      const [name, color, id] = params;
      const found = db.categories.find((c) => c.id === Number(id));
      if (found) {
        found.name = String(name);
        found.color = String(color);
      }
      return { changes: 1 };
    }
    if (trimmed.startsWith("DELETE FROM CATEGORIES")) {
      const [id] = params;
      const before = db.categories.length;
      db.categories = db.categories.filter((c) => c.id !== Number(id));
      return { changes: before - db.categories.length };
    }
    return { changes: 0 };
  });

  db.getAllAsync.mockImplementation(async (sql: string) => {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith("SELECT ID, NAME, COLOR, POSITION")) {
      return [...db.categories].sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return a.name.localeCompare(b.name);
      });
    }
    return [];
  });

  db.getFirstAsync.mockImplementation(async (sql: string, ...params: any[]) => {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith("SELECT MAX(POSITION)")) {
      const max = db.categories.reduce((maxVal, c) => Math.max(maxVal, c.position), -1);
      return { m: max };
    }
    if (trimmed.startsWith("SELECT ID, NAME, COLOR, POSITION, CREATED_AT")) {
      const id = Number(params[0]);
      return db.categories.find((c) => c.id === id) ?? null;
    }
    return null;
  });

  return db;
}

describe("db — categories", () => {
  test("saveCategory inserts a new category with position = max + 1", async () => {
    const db = createFakeDb();
    const a = await saveCategory(db as any, { name: "အင်္ကျီ", color: "#4F46E5" });
    const b = await saveCategory(db as any, { name: "ဘောင်းဘီ", color: "#2563EB" });
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    expect(b.position).toBe(1);
    expect(db.categories).toHaveLength(2);
  });

  test("saveCategory rejects duplicate names (case-insensitive)", async () => {
    const db = createFakeDb();
    await saveCategory(db as any, { name: "အင်္ကျီ", color: "#4F46E5" });
    await expect(
      saveCategory(db as any, { name: "အင်္ကျီ", color: "#2563EB" }),
    ).rejects.toThrow();
  });

  test("saveCategory updates an existing category when id is provided", async () => {
    const db = createFakeDb();
    const a = await saveCategory(db as any, { name: "အင်္ကျီ", color: "#4F46E5" });
    const updated = await saveCategory(db as any, {
      id: a.id,
      name: "အင်္ကျီ",
      color: "#9333EA",
    });
    expect(updated.color).toBe("#9333EA");
    expect(db.categories).toHaveLength(1);
  });

  test("getCategories returns ordered by position", async () => {
    const db = createFakeDb();
    await saveCategory(db as any, { name: "A", color: "#000000" });
    await saveCategory(db as any, { name: "B", color: "#111111" });
    await saveCategory(db as any, { name: "C", color: "#222222" });
    const rows = await getCategories(db as any);
    expect(rows.map((r) => r.name)).toEqual(["A", "B", "C"]);
  });

  test("deleteCategory removes a category", async () => {
    const db = createFakeDb();
    const a = await saveCategory(db as any, { name: "A", color: "#000000" });
    const b = await saveCategory(db as any, { name: "B", color: "#111111" });
    await deleteCategory(db as any, a.id);
    const rows = await getCategories(db as any);
    expect(rows.map((r) => r.id)).toEqual([b.id]);
  });

  test("reorderCategories rewrites positions to match the provided id order", async () => {
    const db = createFakeDb();
    const a = await saveCategory(db as any, { name: "A", color: "#000000" });
    const b = await saveCategory(db as any, { name: "B", color: "#111111" });
    const c = await saveCategory(db as any, { name: "C", color: "#222222" });
    await reorderCategories(db as any, [c.id, a.id, b.id]);
    const rows = await getCategories(db as any);
    expect(rows.map((r) => r.name)).toEqual(["C", "A", "B"]);
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2]);
  });
});
