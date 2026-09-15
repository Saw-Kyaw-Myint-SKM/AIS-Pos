# Merge Plan: SDK 57 Upgrade into feature/release_v2

## Status: COMPLETED

## Goal

Apply all Expo SDK 57 upgrade changes from `feature/update_expo_version_57` into `feature/release_v2`, while keeping all printer-related code unchanged from `feature/release_v2`.

## Branches

| Branch | Contains |
|--------|----------|
| `feature/release_v2` | Full printer integration + SDK 57 (after merge) |
| `feature/update_expo_version_57` | SDK 57 upgrade + printer removal |

## Printer Files PRESERVED (no changes)

| File | Status |
|------|--------|
| `src/thermalPrint.ts` | ✅ Unchanged |
| `src/components/PrintReceiptModal.tsx` | ✅ Unchanged |
| `src/components/PrintableReceipt.tsx` | ✅ Unchanged |
| `src/screens/PrinterScreen.tsx` | ✅ Unchanged |
| `__tests__/thermalPrint.test.ts` | ✅ Unchanged |
| `doc/printer-logic.md` | ✅ Unchanged |
| `src/navigation.ts` | ✅ `PrinterReturnRoute` + `printer` route kept |
| `src/screens/HomeScreen.tsx` | ✅ `onOpenPrinter` + printer tile kept |
| `src/screens/ReceiptScreen.tsx` | ✅ Printer props + print button + modal kept |
| `src/screens/SaleDetailScreen.tsx` | ✅ Printer props + print button + modal kept |
| `jest.setup.js` | ✅ `react-native-view-shot` + `react-native-esc-pos-printer` mocks kept |

## Files EDITED

### 1. `package.json` ✅

SDK 57 version bumps applied. Printer deps kept at current versions (already latest, compatible with RN 0.86.3).

| Package | From (SDK 54) | To (SDK 57) |
|---------|---------------|-------------|
| `expo` | ~54.0.36 | ~57.0.22 |
| `expo-asset` | ~12.0.13 | ~57.0.17 |
| `expo-camera` | ~17.0.10 | ~57.0.5 |
| `expo-document-picker` | ~14.0.8 | ~57.0.2 |
| `expo-file-system` | ~19.0.20 | ~57.0.7 |
| `expo-font` | ~14.0.12 | ~57.0.4 |
| `expo-image` | ~3.0.11 | ~57.0.5 |
| `expo-image-picker` | ~16.1.4 | ~57.0.17 |
| `expo-print` | ~15.0.8 | ~57.0.2 |
| `expo-sharing` | ~14.0.8 | ~57.0.19 |
| `expo-sqlite` | ~16.0.10 | ~57.0.3 |
| `expo-status-bar` | ~3.0.9 | ~57.0.1 |
| `react` | 19.1.0 | 19.2.3 |
| `react-native` | 0.81.5 | 0.86.3 |
| `react-native-safe-area-context` | ~5.6.0 | ~5.7.0 |
| `react-native-svg` | 15.12.1 | 15.15.4 |
| `@types/react` | ~19.1.10 | ~19.2.4 |
| `jest-expo` | ~54.0.0 | ~57.0.5 |
| `typescript` | ~5.9.2 | ~6.0.3 |

**Unchanged (printer deps):**
- `react-native-bluetooth-classic`: 1.73.0-rc.17 (latest, peer: `>=0.73.1`)
- `react-native-esc-pos-printer`: 4.5.0 (latest, peer: `*`)
- `react-native-view-shot`: 5.1.1 (latest, peer: `>=0.76.0`)

### 2. `app.json` ✅

- Added plugins: `expo-image`, `expo-sharing`, `expo-status-bar`
- Bluetooth permissions preserved

### 3. `tsconfig.json` ✅

Added `"exclude": ["__tests__"]`.

### 4. `AGENTS.md` ✅

Version table updated to SDK 57 versions.

### 5. `App.tsx` ✅

Non-printer changes applied:
- `saveCustomer` import added (kept `savePrinterSettings`)
- `dbKey` state + `key={dbKey}` on `SQLiteProvider`
- `onImportDone` prop on `PosApp`
- Import handler simplified to `onImportDone()`
- `backgroundColor` removed from both `<StatusBar>` instances
- All printer state, routes, props preserved

### 6. `src/db.ts` ✅

`importDatabaseFile` changed to close/recreate/write approach:
```
await db.closeAsync();
const dbDir = getDbDirectory();
const dbFile = new File(dbDir, DATABASE_FILE_NAME);
if (dbFile.exists) dbFile.delete();
dbFile.create();
dbFile.write(bytes);
```
All printer settings preserved.

### 7. StyleSheet.absoluteFillObject → StyleSheet.absoluteFill ✅

| File | Occurrences |
|------|-------------|
| `src/components/CartSheet.tsx` | 2 |
| `src/components/DatePickerModal.tsx` | 1 |
| `src/screens/ItemFormModal.tsx` | 1 |
| `src/screens/ItemFormScreen.tsx` | 1 |
| `src/screens/ItemsScreen.tsx` | 1 |
| `src/screens/ScannerModal.tsx` | 2 |
| `src/screens/SellScreen.tsx` | 2 |
| `src/screens/SettingsScreen.tsx` | 2 |
| `src/screens/StockAlertScreen.tsx` | 1 |

## File CREATED

### `doc/UPGRADE-SDK57.md` ✅

Upgrade documentation copied from `feature/update_expo_version_57`.

## Post-edit Steps ✅

```bash
npm install        # ✅ 28 added, 48 removed, 24 changed
npm run typecheck  # ✅ Passed clean
```
