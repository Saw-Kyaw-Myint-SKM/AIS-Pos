# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# clothes-pos — Project Guide

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Expo (managed workflow) | ~54.0.36 |
| UI Framework | React Native | ^0.81.5 |
| Language | TypeScript (strict mode) | ~5.9.2 |
| Local DB | SQLite via `expo-sqlite` | ~16.0.10 |
| Camera/Barcode | `expo-camera` | ~17.0.10 |
| Font Loading | `expo-font` | ~14.0.12 |
| Image | `expo-image` | ~3.0.11 |
| SVG Icons | `react-native-svg` | 15.12.1 |
| Safe Area | `react-native-safe-area-context` | ~5.6.0 |
| State | React `useState` (no external lib) | — |
| Navigation | Manual conditional rendering (no React Navigation) | — |

- **No `.env`** — everything is hardcoded config or SQLite.
- **No API calls** — app is fully offline.
- **Font:** Pyidaungsu (Regular + Bold), loaded from `assets/fonts/`.
- **Locale:** Full Burmese (Unicode) — UI text, Myanmar numerals, Burmese month names.

---

## Entry Point & App Shell

```
index.ts
  └─ registerRootComponent(App)
       └─ SafeAreaProvider
            └─ SQLiteProvider (databaseName="clothes-pos.db", onInit=initializeDatabase)
                 └─ PosApp (internal component, holds ALL state)
```

### State (all in `PosApp` / `App.tsx`)

```
route: Route                         — current screen (manual router)
profile: CustomerProfile | null      — shop owner
items: ClothingItem[]                — product inventory
sales: Sale[]                        — all transactions
today: TodaySummary                  — today's stats
cart: Record<number, number>         — itemId → qty
cartOpen: boolean / scannerOpen: boolean
toast: string | null
```

- `refreshAll()` calls `getClothingItems`, `getSales`, `getTodaySummary` and sets all three.
- After every mutation (save/delete/sale), `refreshAll()` is called.

---

## Routing (Manual, No Library)

```ts
type Route =
  | { name: 'register' }
  | { name: 'home' }
  | { name: 'sell' }
  | { name: 'clothes' }
  | { name: 'history' }
  | { name: 'receipt'; saleId: number }
  | { name: 'saleDetail'; saleId: number }
  | { name: 'itemForm'; itemId?: number };
```

Screen conditionally rendered by `route.name` in `App.tsx`. Props (callbacks + data) are passed directly.

**App flow:**
1. Fonts load → splash spinner.
2. `getCustomerProfile()` — if `null` → `RegisterScreen`.
3. Once profile exists → `HomeScreen`.
4. From home, user navigates to Sell, Items, History, Scanner.
5. `TabBar` renders only on `home`, `clothes`, `history`.

---

## File Map

```
src/
├── db.ts                          # SQLite schema + all query functions
├── i18n.ts                        # Burmese strings + format utils
├── theme.ts                       # Colors, spacing, fonts, shadows
├── components/
│   ├── AppButton.tsx              # primary | secondary | outline | pill
│   ├── AppInput.tsx               # boxed | underline variants
│   ├── AppText.tsx                # Pyidaungsu text wrapper (allowFontScaling=false)
│   ├── CartSheet.tsx              # Bottom-sheet modal: cart review + confirm/clear
│   ├── EmptyState.tsx             # Centered ∅ placeholder
│   ├── ItemCard.tsx               # 2-col product card with + add button
│   ├── QtyStepper.tsx             # - / count / + inline stepper
│   ├── Receipt.tsx                # Paper-style receipt (reads sale from DB)
│   ├── ServiceIcon.tsx            # 10 SVG icons (Dollar, Package, Home, Scan, etc.)
│   └── TabBar.tsx                 # Floating pill-shaped 3-tab bar with animated indicator
└── screens/
    ├── RegisterScreen.tsx         # Customer profile form → SQLite
    ├── HomeScreen.tsx             # Dashboard: stats + 5 service tiles
    ├── SellScreen.tsx             # 2-col product grid + search + cart bar + scan
    ├── ItemsScreen.tsx            # Product list + color/category filters + delete
    ├── ItemFormScreen.tsx         # Full-screen add/edit form (color picker, category dropdown)
    ├── ItemFormModal.tsx          # LEGACY — unused, superseded by ItemFormScreen
    ├── HistoryScreen.tsx          # Sales list + today's total
    ├── SaleDetailScreen.tsx       # Past sale detail (uses Receipt component)
    ├── ReceiptScreen.tsx          # Post-checkout receipt + "new sale" / "view history" actions
    └── ScannerModal.tsx           # Camera barcode scanner (single + multi-scan modes)
```

---

## Database (`src/db.ts`)

**4 tables in `clothes-pos.db`:**

### `customer_profile`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK, CHECK(id=1) — single row only |
| name, phone, email, address | TEXT | |
| createdAt, updatedAt | TEXT | ISO datetimes |

### `clothes`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK AUTOINCREMENT |
| qrCode | TEXT | UNIQUE |
| name | TEXT | NOT NULL |
| size | TEXT | |
| price | REAL | >=0 |
| category | TEXT | |
| stock | INTEGER | >=0 |
| choiceType | TEXT | 'color' or 'photo' |
| colorValue | TEXT | hex color string |

### `sales`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK AUTOINCREMENT |
| total | REAL | NOT NULL |
| createdAt | TEXT | DEFAULT CURRENT_TIMESTAMP |

### `sale_items`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK AUTOINCREMENT |
| saleId | INTEGER | FK → sales.id |
| clothingId | INTEGER | FK → clothes.id |
| name, size | TEXT | snapshot at sale time |
| price | REAL | snapshot at sale time |
| quantity | INTEGER | |

### Query Functions
| Function | What it does |
|----------|-------------|
| `initializeDatabase(db)` | CREATE TABLEs, migrate missing columns, seed 5 sample items |
| `getCustomerProfile(db)` | Returns the single profile row or null |
| `saveCustomerProfile(db, profile)` | UPSERT id=1 |
| `getClothingItems(db)` | All items, ordered by name NOCASE |
| `findClothingByQr(db, qr)` | Single item by exact QR match |
| `saveClothingItem(db, item)` | INSERT (no id) or UPDATE (has id) |
| `deleteClothingItem(db, id)` | DELETE by id |
| `createSale(db, items, qtyMap)` | INSERT sale + sale_items in transaction → returns saleId |
| `getSales(db)` | All sales + itemCount (JOIN), newest first |
| `getSale(db, id)` | Single sale by id |
| `getSaleItems(db, saleId)` | All line items for a sale |
| `getTodaySummary(db)` | SUM total, COUNT sales, SUM itemCount for today (UTC date) |

### Migrations
`initializeDatabase` contains additive column migrations — checks if `choiceType`/`colorValue` exist on `clothes`, adds them if missing.

---

## Theme (`src/theme.ts`)

- `colors` — 28 named colors (bg, surface, header=#0E4F45, accent, primary=#E8862E, success, danger, text, muted, border, etc.)
- `spacing(n)` — n × 4px
- `radius` — sm(10), md(16), lg(22), xl(28), tile(20), icon(16)
- `font.regular` / `font.bold` — Pyidaungsu
- `avatarPalette` — 6 colors for product avatar backgrounds
- `shadow`, `tileShadow` — reusable shadow styles

---

## i18n (`src/i18n.ts`)

- `t` — nested Burmese strings for every UI label
- `toMM(value)` — Arabic → Myanmar numerals
- `formatKyat(value)` — `"၈,၅၀၀ ကျပ်"`
- `formatDateMM(d)`, `formatTimeMM(d)`, `formatDateTimeMM(createdAt)` — Burmese date/time
- `scanFormatLabel(type)` — barcode type → label (QR, EAN-13, etc.)

---

## Scripts

```bash
npm start          # expo start
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npm run typecheck  # tsc --noEmit
```

---

## Key Conventions

1. **All text in Burmese** — never use English in UI strings. Use `t.*` from `i18n.ts`.
2. **No navigation library** — add screens by extending the `Route` type and adding a conditional branch in `App.tsx`.
3. **No state library** — add state as `useState` in `PosApp`, pass down as props.
4. **Always re-fetch after mutation** — call `refreshAll()` after any DB write.
5. **Font must be Pyidaungsu** — use `AppText` (or `style={fontFamily: font.regular}`) for all text.
6. **Price formatting** — always use `formatKyat()` for display.
7. **DB schema changes** — add to `initializeDatabase` as migration, avoid breaking existing data.
