import { useFonts } from 'expo-font';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppText from './src/components/AppText';
import CartSheet, { type CartLine } from './src/components/CartSheet';
import {
  createSale, deleteCategory, deleteClothingItem, DEFAULT_PAPER_WIDTH, DEFAULT_SHOP_NAME, exportDatabaseFile, exportDatabaseToDownloads,
  findClothingByQr,
  getAppSetting, getCategories, getClothingItems, getCustomerProfile, getSales, getTodaySummary,
  importDatabaseFile, initializeDatabase,
  reorderCategories, saveCategory, saveClothingItem,
  DEFAULT_PRINTER_MODE, DEFAULT_STOCK_ALERT_LIMIT, SETTING_PRINTER_AUTO_CUT, SETTING_PRINTER_DEVICE_NAME, SETTING_PRINTER_MODE,
  SETTING_PRINTER_PAPER_WIDTH, SETTING_PRINTER_TARGET,
  SETTING_SHOP_NAME, SETTING_SHOP_NAME_UNLOCKED, SETTING_STOCK_ALERT_LIMIT, setAppSetting,
  type Category, type ClothingItem, type CustomerProfile, type PaperWidth, type PrinterMode, type Sale, type TodaySummary,
} from './src/db';
import { scanFormatLabel, t } from './src/i18n';
import HistoryScreen from './src/screens/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import ItemFormScreen, { emptyForm, itemToForm } from './src/screens/ItemFormScreen';
import type { ItemFormValue } from './src/screens/ItemFormScreen';
import CategoryFormScreen, { emptyCategoryForm, categoryToForm } from './src/screens/CategoryFormScreen';
import type { CategoryFormValue } from './src/screens/CategoryFormScreen';
import ItemsScreen from './src/screens/ItemsScreen';
import PrinterScreen from './src/screens/PrinterScreen';
import ReceiptScreen from './src/screens/ReceiptScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SaleDetailScreen from './src/screens/SaleDetailScreen';
import ScannerModal from './src/screens/ScannerModal';
import SellScreen from './src/screens/SellScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StockAlertScreen from './src/screens/StockAlertScreen';
import TabBar from './src/components/TabBar';
import { colors } from './src/theme';

type Route =
  | { name: 'register' }
  | { name: 'home' }
  | { name: 'sell' }
  | { name: 'clothes' }
  | { name: 'history' }
  | { name: 'receipt'; saleId: number }
  | { name: 'saleDetail'; saleId: number }
  | { name: 'itemForm'; itemId?: number }
  | { name: 'categoryForm'; categoryId?: number }
  | { name: 'settings' }
  | { name: 'printer' }
  | { name: 'stockAlert' };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Pyidaungsu-Regular': require('./assets/fonts/Pyidaungsu-Regular.ttf'),
    'Pyidaungsu-Bold': require('./assets/fonts/Pyidaungsu-Bold.ttf'),
  });
  const [dbVersion, setDbVersion] = useState(0);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={splashStyles.box}>
        <ActivityIndicator size="large" color={colors.header} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider
        key={`db-${dbVersion}`}
        databaseName="clothes-pos.db"
        onInit={initializeDatabase}
      >
        <PosApp dbVersion={dbVersion} onDatabaseReloaded={() => setDbVersion((v) => v + 1)} />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const splashStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});

function PosApp({
  dbVersion: _dbVersion,
  onDatabaseReloaded,
}: {
  dbVersion: number;
  onDatabaseReloaded: () => void;
}) {
  const db = useSQLiteContext();
  const [booted, setBooted] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [today, setToday] = useState<TodaySummary>({ total: 0, saleCount: 0, itemCount: 0 });
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<ClothingItem | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [shopName, setShopName] = useState(DEFAULT_SHOP_NAME);
  const [shopUnlocked, setShopUnlocked] = useState(false);
  const [printerTarget, setPrinterTarget] = useState('');
  const [printerDeviceName, setPrinterDeviceName] = useState('');
  const [printerMode, setPrinterModeState] = useState<PrinterMode>(DEFAULT_PRINTER_MODE);
  const [paperWidth, setPaperWidthState] = useState<PaperWidth>(DEFAULT_PAPER_WIDTH);
  const [printerAutoCut, setPrinterAutoCutState] = useState(true);
  const [stockAlertLimit, setStockAlertLimit] = useState(DEFAULT_STOCK_ALERT_LIMIT);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getCustomerProfile(db);
      const name = await getAppSetting(db, SETTING_SHOP_NAME);
      const unlocked = await getAppSetting(db, SETTING_SHOP_NAME_UNLOCKED);
      const pTarget = await getAppSetting(db, SETTING_PRINTER_TARGET);
      const pName = await getAppSetting(db, SETTING_PRINTER_DEVICE_NAME);
      const pMode = await getAppSetting(db, SETTING_PRINTER_MODE);
      const pWidth = await getAppSetting(db, SETTING_PRINTER_PAPER_WIDTH);
      const pAutoCut = await getAppSetting(db, SETTING_PRINTER_AUTO_CUT);
      const savedStockAlertLimit = await getAppSetting(db, SETTING_STOCK_ALERT_LIMIT);
      const parsedStockAlertLimit = Number(savedStockAlertLimit);
      const nextStockAlertLimit = Number.isSafeInteger(parsedStockAlertLimit) && parsedStockAlertLimit >= 0
        ? parsedStockAlertLimit
        : DEFAULT_STOCK_ALERT_LIMIT;
      if (cancelled) return;
      setProfile(existing);
      setShopName(name ?? DEFAULT_SHOP_NAME);
      setShopUnlocked(unlocked === '1');
      setPrinterTarget(pTarget ?? '');
      setPrinterDeviceName(pName ?? '');
      setPrinterModeState(pMode === 'mock' ? 'mock' : DEFAULT_PRINTER_MODE);
      setPaperWidthState((pWidth === '80' ? '80' : '58') as PaperWidth);
      setPrinterAutoCutState(pAutoCut !== '0');
      setStockAlertLimit(nextStockAlertLimit);
      setRoute(existing ? { name: 'home' } : { name: 'register' });
      setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const onRegisterDone = useCallback((next: CustomerProfile) => {
    setProfile(next);
    showToast(t.register.success);
    setRoute({ name: 'home' });
  }, [showToast]);

  const unlockShopName = useCallback(async () => {
    await setAppSetting(db, SETTING_SHOP_NAME_UNLOCKED, '1');
    setShopUnlocked(true);
  }, [db]);

  const saveShopName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await setAppSetting(db, SETTING_SHOP_NAME, trimmed);
    setShopName(trimmed);
  }, [db]);

  const selectPrinter = useCallback(async (target: string, deviceName: string) => {
    await setAppSetting(db, SETTING_PRINTER_TARGET, target);
    await setAppSetting(db, SETTING_PRINTER_DEVICE_NAME, deviceName);
    setPrinterTarget(target);
    setPrinterDeviceName(deviceName);
  }, [db]);

  const setPrinterMode = useCallback(async (mode: PrinterMode) => {
    await setAppSetting(db, SETTING_PRINTER_MODE, mode);
    setPrinterModeState(mode);
  }, [db]);

  const setPaperWidth = useCallback(async (width: PaperWidth) => {
    await setAppSetting(db, SETTING_PRINTER_PAPER_WIDTH, width);
    setPaperWidthState(width);
  }, [db]);

  const setPrinterAutoCut = useCallback(async (enabled: boolean) => {
    await setAppSetting(db, SETTING_PRINTER_AUTO_CUT, enabled ? '1' : '0');
    setPrinterAutoCutState(enabled);
  }, [db]);

  const saveStockAlertLimit = useCallback(async (limit: number) => {
    await setAppSetting(db, SETTING_STOCK_ALERT_LIMIT, String(limit));
    setStockAlertLimit(limit);
  }, [db]);

  const refreshAll = useCallback(async () => {
    const [itemRows, categoryRows, saleRows, summary] = await Promise.all([
      getClothingItems(db), getCategories(db), getSales(db), getTodaySummary(db),
    ]);
    setItems(itemRows);
    setCategories(categoryRows);
    setSales(saleRows);
    setToday(summary);
  }, [db]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const cartLines: CartLine[] = items
    .filter((item) => cart[item.id])
    .map((item) => ({ item, quantity: cart[item.id] }));
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);

  const changeQuantity = useCallback((id: number, delta: number) => {
    setCart((current) => {
      const quantity = (current[id] ?? 0) + delta;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: quantity };
    });
  }, []);

  const setItemQty = useCallback((item: ClothingItem, qty: number) => {
    setCart((c) => {
      const current = c[item.id] ?? 0;
      if (qty === current) return c;
      if (qty <= 0) {
        if (!(item.id in c)) return c;
        const next = { ...c };
        delete next[item.id];
        return next;
      }
      return { ...c, [item.id]: qty };
    });
  }, []);

  const onScanned = useCallback(async (value: string, format: string, keepOpen: boolean) => {
    if (!keepOpen) setScannerOpen(false);
    const item = await findClothingByQr(db, value.trim());
    if (!item) {
      Alert.alert(t.scanner.notFoundTitle, `${value}\n${t.scanner.notFoundBody}`);
      return;
    }
    changeQuantity(item.id, 1);
    setLastScannedItem(item);
    showToast(`${t.toast.added} (${scanFormatLabel(format)})`);
    if (route.name !== 'sell' && !keepOpen) setRoute({ name: 'sell' });
  }, [db, changeQuantity, showToast, route.name]);

  const confirmSale = useCallback(async () => {
    if (!cartLines.length) return;
    const saleId = await createSale(db, cartLines.map((l) => l.item), cart);
    setCart({});
    setCartOpen(false);
    setLastScannedItem(null);
    await refreshAll();
    setRoute({ name: 'receipt', saleId });
  }, [db, cartLines, cart, refreshAll]);

  const clearCart = useCallback(() => {
    setCart({});
    setLastScannedItem(null);
    showToast(t.toast.cleared);
  }, [showToast]);

  const handleExportDatabase = useCallback(async () => {
    if (settingsBusy) return;
    setSettingsBusy(true);
    try {
      const uri = await exportDatabaseFile(db);
      await Sharing.shareAsync(uri, {
        mimeType: 'application/octet-stream',
        dialogTitle: t.settings.saveFile,
        UTI: 'public.database',
      });
      showToast(t.settings.saveSuccess);
    } catch (error) {
      const message = (error as Error)?.message ?? '';
      if (message.toLowerCase().includes('cancel') || message.toLowerCase().includes('dismiss')) {
        showToast(t.settings.saveCancelled);
      } else {
        showToast(t.settings.saveError);
      }
    } finally {
      setSettingsBusy(false);
    }
  }, [db, settingsBusy, showToast]);

  const handleExportToDownloads = useCallback(async () => {
    if (settingsBusy) return;
    setSettingsBusy(true);
    try {
      const ok = await exportDatabaseToDownloads(db);
      showToast(ok ? t.settings.downloadsSaved : t.settings.permissionDenied);
    } catch {
      showToast(t.settings.saveError);
    } finally {
      setSettingsBusy(false);
    }
  }, [db, settingsBusy, showToast]);

  const handleImportDatabase = useCallback(() => {
    if (settingsBusy) return;
    Alert.alert(t.settings.loadConfirmTitle, t.settings.loadConfirmBody, [
      { text: t.settings.cancel, style: 'cancel' },
      {
        text: t.settings.yes,
        style: 'destructive',
        onPress: async () => {
          setSettingsBusy(true);
          try {
            const picked = await DocumentPicker.getDocumentAsync({
              copyToCacheDirectory: true,
              type: '*/*',
            });
            if (picked.canceled || !picked.assets?.length) {
              setSettingsBusy(false);
              showToast(t.settings.loadCancelled);
              return;
            }
            await importDatabaseFile(db, picked.assets[0].uri);
            showToast(t.settings.loadSuccess);
            onDatabaseReloaded();
          } catch {
            Alert.alert(t.settings.errorTitle, t.settings.loadError);
          } finally {
            setSettingsBusy(false);
          }
        },
      },
    ]);
  }, [db, settingsBusy, showToast, onDatabaseReloaded]);

  const saveItem = useCallback(async (form: ItemFormValue) => {
    const price = Number(form.price);
    const stock = Number(form.stock) || 0;
    if (!form.name.trim() || !form.categoryId || !Number.isFinite(price) || price < 0) {
      Alert.alert(t.items.invalidTitle, t.items.invalidBody);
      return;
    }
    try {
      await saveClothingItem(db, {
        id: form.id,
        name: form.name.trim(),
        size: form.size.trim(),
        qrCode: form.qrCode.trim(),
        price,
        categoryId: form.categoryId,
        stock,
        choiceType: form.choiceType,
        colorValue: form.colorValue,
        photoUri: form.photoUri,
        note: form.note,
      });
      setRoute({ name: 'clothes' });
      await refreshAll();
      showToast(t.toast.saved);
    } catch {
      Alert.alert(t.items.dupTitle, t.items.dupBody);
    }
  }, [db, refreshAll, showToast]);

  const saveCategoryHandler = useCallback(async (form: CategoryFormValue) => {
    const name = form.name.trim();
    if (!name) {
      Alert.alert(t.items.categoryRequired);
      return;
    }
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== form.id,
    );
    if (duplicate) {
      Alert.alert(t.items.categoryDuplicate);
      return;
    }
    try {
      await saveCategory(db, { id: form.id ?? undefined, name, color: form.color });
      await refreshAll();
      showToast(t.items.categorySaved);
      setRoute({ name: 'clothes' });
    } catch {
      Alert.alert(t.items.categoryDuplicate);
    }
  }, [categories, db, refreshAll, showToast]);

  const deleteCategoryHandler = useCallback(async (category: Category) => {
    await deleteCategory(db, category.id);
    await refreshAll();
    showToast(t.items.categoryDeleted);
  }, [db, refreshAll, showToast]);

  const moveCategory = useCallback(async (category: Category, direction: 'up' | 'down') => {
    const idx = categories.findIndex((c) => c.id === category.id);
    if (idx < 0) return;
    const next = direction === 'up' ? idx - 1 : idx + 1;
    if (next < 0 || next >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(next, 0, moved);
    await reorderCategories(db, reordered.map((c) => c.id));
    await refreshAll();
  }, [categories, db, refreshAll]);

  const confirmDelete = useCallback((item: ClothingItem) => {
    Alert.alert(t.items.deleteTitle, item.name, [
      { text: t.items.deleteNo, style: 'cancel' },
      {
        text: t.items.deleteYes,
        style: 'destructive',
        onPress: async () => {
          await deleteClothingItem(db, item.id);
          await refreshAll();
          showToast(t.toast.deleted);
        },
      },
    ]);
  }, [db, refreshAll, showToast]);

  const showTabs = route.name === 'home' || route.name === 'clothes' || route.name === 'history';
  const tabs: { key: Route['name']; label: string }[] = [
    { key: 'home', label: t.tabs.home },
    { key: 'clothes', label: t.tabs.items },
    { key: 'history', label: t.tabs.history },
  ];

  if (!booted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <View style={[styles.content, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={colors.header} />
        </View>
      </SafeAreaView>
    );
  }

  if (route.name === 'register') {
    return <RegisterScreen onDone={onRegisterDone} />;
  }

  const isHome = route.name === 'home';

  return (
    <SafeAreaView style={styles.safe} edges={isHome ? [] : ['top']}>
      <StatusBar style={isHome ? 'light' : 'dark'} backgroundColor={isHome ? '#4A6CF7' : '#FFFFFF'} />
      <View style={styles.content}>
        {route.name === 'home' && (
          <HomeScreen
            summary={today}
            profile={profile}
            items={items}
            onStartSale={() => setRoute({ name: 'sell' })}
            onOpenItems={() => setRoute({ name: 'clothes' })}
            onOpenHistory={() => setRoute({ name: 'history' })}
            onScan={() => setScannerOpen(true)}
            onOpenSettings={() => setRoute({ name: 'settings' })}
            onOpenPrinter={() => setRoute({ name: 'printer' })}
            onOpenStockAlert={() => setRoute({ name: 'stockAlert' })}
            stockAlertLimit={stockAlertLimit}
          />
        )}
        {route.name === 'sell' && (
          <SellScreen
            items={items}
            categories={categories}
            cart={cart}
            cartCount={cartCount}
            cartTotal={cartTotal}
            onChangeQty={setItemQty}
            onOpenCart={() => setCartOpen(true)}
            onScan={() => setScannerOpen(true)}
            onBack={() => setRoute({ name: 'home' })}
          />
        )}
        {route.name === 'clothes' && (
          <View style={{ flex: 1, paddingBottom: 90 }}>
            <ItemsScreen
              items={items}
              categories={categories}
              onPressItem={(item) => setRoute({ name: 'itemForm', itemId: item.id })}
              onDelete={confirmDelete}
              onCreateProduct={() => setRoute({ name: 'itemForm' })}
              onCreateCategory={() => setRoute({ name: 'categoryForm' })}
              onEditCategory={(category) => setRoute({ name: 'categoryForm', categoryId: category.id })}
              onDeleteCategory={deleteCategoryHandler}
              onMoveCategoryUp={(category) => moveCategory(category, 'up')}
              onMoveCategoryDown={(category) => moveCategory(category, 'down')}
            />
          </View>
        )}
        {route.name === 'history' && (
          <View style={{ flex: 1, paddingBottom: 90 }}>
            <HistoryScreen
              sales={sales}
              todayTotal={today.total}
              onOpen={(saleId) => setRoute({ name: 'saleDetail', saleId })}
            />
          </View>
        )}
        {route.name === 'receipt' && (
          <ReceiptScreen
            saleId={route.saleId}
            shopName={shopName}
            printerMode={printerMode}
            printerTarget={printerTarget}
            printerDeviceName={printerDeviceName}
            paperWidth={paperWidth}
            autoCut={printerAutoCut}
            onSelectPrinter={() => setRoute({ name: 'printer' })}
            onNewSale={() => setRoute({ name: 'sell' })}
            onViewHistory={() => setRoute({ name: 'history' })}
            onToast={showToast}
          />
        )}
        {route.name === 'saleDetail' && (
          <SaleDetailScreen
            saleId={route.saleId}
            shopName={shopName}
            printerMode={printerMode}
            printerTarget={printerTarget}
            printerDeviceName={printerDeviceName}
            paperWidth={paperWidth}
            autoCut={printerAutoCut}
            onSelectPrinter={() => setRoute({ name: 'printer' })}
            onBack={() => setRoute({ name: 'history' })}
            onToast={showToast}
          />
        )}
        {route.name === 'itemForm' && (
          <ItemFormScreen
            initial={route.itemId ? itemToForm(items.find((i) => i.id === route.itemId)!) : emptyForm}
            categories={categories}
            onBack={() => setRoute({ name: 'clothes' })}
            onSave={saveItem}
            onCreateCategory={() => setRoute({ name: 'categoryForm' })}
          />
        )}
        {route.name === 'categoryForm' && (
          <CategoryFormScreen
            initial={
              route.categoryId
                ? categoryToForm(categories.find((c) => c.id === route.categoryId)!)
                : emptyCategoryForm
            }
            categories={categories}
            onBack={() => setRoute({ name: 'clothes' })}
            onSave={saveCategoryHandler}
            onDelete={route.categoryId
              ? (form) => {
                  const cat = categories.find((c) => c.id === form.id);
                  if (cat) deleteCategoryHandler(cat);
                }
              : undefined}
          />
        )}
        {route.name === 'stockAlert' && (
          <StockAlertScreen
            items={items}
            stockAlertLimit={stockAlertLimit}
            onSaveLimit={saveStockAlertLimit}
            onBack={() => setRoute({ name: 'home' })}
          />
        )}
        {route.name === 'settings' && (
          <SettingsScreen
            onBack={() => setRoute({ name: 'home' })}
            onExport={handleExportDatabase}
            onExportToDownloads={handleExportToDownloads}
            onImport={handleImportDatabase}
            busy={settingsBusy}
            shopName={shopName}
            shopUnlocked={shopUnlocked}
            onUnlockShopName={unlockShopName}
            onSaveShopName={saveShopName}
          />
        )}
        {route.name === 'printer' && (
          <PrinterScreen
            onBack={() => setRoute({ name: 'home' })}
            printerMode={printerMode}
            printerTarget={printerTarget}
            printerDeviceName={printerDeviceName}
            paperWidth={paperWidth}
            autoCut={printerAutoCut}
            shopName={shopName}
            onSelectPrinter={selectPrinter}
            onSetPrinterMode={setPrinterMode}
            onSetPaperWidth={setPaperWidth}
            onSetAutoCut={setPrinterAutoCut}
            onToast={showToast}
          />
        )}
      </View>

      {showTabs && (
        <TabBar
          tabs={tabs}
          activeKey={route.name}
          onTab={(key) => {
            if (key === 'home') setRoute({ name: 'home' });
            else if (key === 'clothes') setRoute({ name: 'clothes' });
            else if (key === 'history') setRoute({ name: 'history' });
          }}
        />
      )}

      <CartSheet
        visible={cartOpen}
        lines={cartLines}
        total={cartTotal}
        onClose={() => setCartOpen(false)}
        onQuantity={changeQuantity}
        onClear={clearCart}
        onConfirm={confirmSale}
      />

      <ScannerModal
        visible={scannerOpen}
        onClose={() => { setScannerOpen(false); setLastScannedItem(null); }}
        onScanned={onScanned}
        onOpenCart={() => setCartOpen(true)}
        lastItem={lastScannedItem}
        cart={cart}
        cartOpen={cartOpen}
      />

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <AppText bold style={styles.toastText}>✓ {toast}</AppText>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, backgroundColor: '#FFFFFF' },
  toast: {
    position: 'absolute', top: 48, left: 24, right: 24,
    backgroundColor: '#111827', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  toastText: { color: '#fff', fontSize: 14 },
});
