import { useFonts } from 'expo-font';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppText from './src/components/AppText';
import CartSheet, { type CartLine } from './src/components/CartSheet';
import {
  createCreditSale, createSale, clearSalesHistory, deleteCategory, deleteClothingItem, deleteCustomer, DATABASE_FILE_NAME, DEFAULT_PAPER_WIDTH, DEFAULT_SHOP_NAME, exportDatabaseFile, exportDatabaseToDownloads,
  CUSTOMER_HAS_CREDIT_ERROR, INSUFFICIENT_STOCK_ERROR, SALE_ITEM_UNAVAILABLE_ERROR,
  updateSale, settleCreditSale,
  findClothingByQr,
  getAppSetting, getCategories, getClothingItems, getCreditLedger, getCustomerProfile, getCustomers, getLocalAccountCount, getLocalAccounts, getLocalSession, getProfitSummary, getSales, getTodaySummary,
  clearLocalSession, createManagedLocalAccount, setManagedLocalAccountActive,
  importDatabaseFile, initializeDatabase,
  reorderCategories, saveCategory, saveClothingItem, saveCustomer,
  DEFAULT_STOCK_ALERT_LIMIT, SETTING_PRINTER_PAPER_WIDTH,
  SETTING_SHOP_NAME, SETTING_SHOP_NAME_UNLOCKED, SETTING_STOCK_ALERT_LIMIT, SETTING_PROFIT_TRACKING_READY, SETTING_SYNC_MODE, setAppSetting,
  getSupabaseProjectConfig, saveSupabaseProjectConfig, clearSupabaseProjectConfig, saveSupabaseTestResult,
  type Category, type ClothingItem, type CreditLedgerRow, type Customer, type CustomerInput, type CustomerProfile, type LocalAccount, type PaperWidth, type ProfitSummary, type Sale, type SaleUpdateInput, type SyncMode, type TodaySummary, type SupabaseProjectConfig,
} from './src/db';
import { scanFormatLabel, t } from './src/i18n';
import { getBackRoute, type Route } from './src/navigation';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfitReportScreen from './src/screens/ProfitReportScreen';
import HomeScreen from './src/screens/HomeScreen';
import ItemFormScreen, { emptyForm, itemToForm } from './src/screens/ItemFormScreen';
import type { ItemFormValue } from './src/screens/ItemFormScreen';
import CategoryFormScreen, { emptyCategoryForm, categoryToForm } from './src/screens/CategoryFormScreen';
import type { CategoryFormValue } from './src/screens/CategoryFormScreen';
import ItemsScreen from './src/screens/ItemsScreen';
import ReceiptScreen from './src/screens/ReceiptScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import SaleDetailScreen from './src/screens/SaleDetailScreen';
import SaleEditScreen from './src/screens/SaleEditScreen';
import ScannerModal from './src/screens/ScannerModal';
import SellScreen from './src/screens/SellScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AboutScreen from './src/screens/AboutScreen';
import StockAlertScreen from './src/screens/StockAlertScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import CustomerFormScreen from './src/screens/CustomerFormScreen';
import CreditCheckoutScreen from './src/screens/CreditCheckoutScreen';
import CreditLedgerScreen from './src/screens/CreditLedgerScreen';
import SyncScreen from './src/screens/SyncScreen';
import SupabaseSetupScreen from './src/screens/SupabaseSetupScreen';
import CloudOwnerScreen from './src/screens/CloudOwnerScreen';
import CloudMemberScreen from './src/screens/CloudMemberScreen';
import { bootstrapCloudOwner, configureSupabase, getCurrentMembership, signInWithEmail, signOut as signOutCloud, subscribeToCatalogChanges, testSupabaseReadiness, type ShopMembership } from './src/supabase';
import { getSyncStatus, markLocalMigrationRequested, queueCategoryDelete, queueCategoryReorder, queueCategoryUpsert, queueItemDelete, queueItemUpsert, runSync, type SyncStatus } from './src/sync';
import { createPasswordVerifier } from './src/auth';
import AccountsScreen from './src/screens/AccountsScreen';
import AccountFormScreen from './src/screens/AccountFormScreen';
import TabBar from './src/components/TabBar';
import { colors } from './src/theme';

const isDuplicateBarcodeError = (error: unknown): boolean =>
  error instanceof Error && /unique constraint failed:\s*items\.qr_code/i.test(error.message);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Pyidaungsu-Regular': require('./assets/fonts/Pyidaungsu-Regular.ttf'),
    'Pyidaungsu-Bold': require('./assets/fonts/Pyidaungsu-Bold.ttf'),
  });

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
        databaseName={DATABASE_FILE_NAME}
        onInit={initializeDatabase}
      >
        <PosApp />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const splashStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});

const startupStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadingText: { color: colors.muted, fontSize: 14, marginTop: 16, textAlign: 'center' },
  errorTitle: { color: colors.text, fontSize: 20, textAlign: 'center' },
  errorBody: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 10, textAlign: 'center' },
  retryButton: { backgroundColor: colors.header, borderRadius: 12, marginTop: 22, paddingHorizontal: 22, paddingVertical: 12 },
  retryText: { color: '#FFFFFF', fontSize: 14 },
});

function PosApp() {
  const db = useSQLiteContext();
  const [booted, setBooted] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [startupError, setStartupError] = useState(false);
  const [startupStage, setStartupStage] = useState('');
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [managedAccounts, setManagedAccounts] = useState<LocalAccount[]>([]);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creditLedger, setCreditLedger] = useState<CreditLedgerRow[]>([]);
  const [today, setToday] = useState<TodaySummary>({ total: 0, saleCount: 0, itemCount: 0 });
  const [cart, setCart] = useState<Record<number, number>>({});
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<ClothingItem | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [shopName, setShopName] = useState(DEFAULT_SHOP_NAME);
  const [shopUnlocked, setShopUnlocked] = useState(false);
  const [paperWidth, setPaperWidthState] = useState<PaperWidth>(DEFAULT_PAPER_WIDTH);
  const [stockAlertLimit, setStockAlertLimit] = useState(DEFAULT_STOCK_ALERT_LIMIT);
  const [profitTrackingReady, setProfitTrackingReady] = useState(false);
  const [membership, setMembership] = useState<ShopMembership | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ pendingCount: 0, syncingCount: 0, failedCount: 0, conflictCount: 0, pendingUploadCount: 0, uploadingUploadCount: 0, failedUploadCount: 0, migrationActive: false, lastSyncedAt: null, lastError: null, migrationCompleted: false });
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseProjectConfig>({ url: '', publishableKey: '', storageBucket: '', pathPrefix: '', active: false, lastTestResult: null, lastTestCode: null, lastTestedAt: null });
  const [syncing, setSyncing] = useState(false);
  const [deviceMode, setDeviceModeState] = useState<SyncMode>('offline');
  const syncingRef = useRef(false);
  const syncAgainRef = useRef(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (scannerOpen) {
        setScannerOpen(false);
        setLastScannedItem(null);
        return true;
      }
      if (cartOpen) {
        setCartOpen(false);
        return true;
      }

      const backRoute = getBackRoute(route);
      if (!backRoute) return false;
      setRoute(backRoute);
      return true;
    });

    return () => subscription.remove();
  }, [cartOpen, route, scannerOpen]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBooted(false);
    setStartupError(false);
    setStartupStage('');

    (async () => {
      const loadBootstrap = async <T,>(stage: string, request: Promise<T>): Promise<T> => {
        try {
          return await request;
        } catch (error) {
          console.error(`[startup:${stage}]`, error);
          throw new Error(stage);
        }
      };

      try {
        const [
          existing,
          name,
          unlocked,
          pWidth,
          savedStockAlertLimit,
          profitReady,
          savedSyncMode,
          localAccountCount,
          localSession,
          savedSupabaseConfig,
        ] = await Promise.all([
          loadBootstrap('customer-profile', getCustomerProfile(db)),
          loadBootstrap('settings:shop-name', getAppSetting(db, SETTING_SHOP_NAME)),
          loadBootstrap('settings:shop-name-unlocked', getAppSetting(db, SETTING_SHOP_NAME_UNLOCKED)),
          loadBootstrap('settings:printer-paper-width', getAppSetting(db, SETTING_PRINTER_PAPER_WIDTH)),
          loadBootstrap('settings:stock-alert-limit', getAppSetting(db, SETTING_STOCK_ALERT_LIMIT)),
          loadBootstrap('settings:profit-tracking-ready', getAppSetting(db, SETTING_PROFIT_TRACKING_READY)),
          loadBootstrap('settings:sync-mode', getAppSetting(db, SETTING_SYNC_MODE)),
          loadBootstrap('local-account-count', getLocalAccountCount(db)),
          loadBootstrap('local-session', getLocalSession(db)),
          loadBootstrap('supabase-config', getSupabaseProjectConfig(db)),
        ]);
        const parsedStockAlertLimit = Number(savedStockAlertLimit);
        const nextStockAlertLimit = Number.isSafeInteger(parsedStockAlertLimit) && parsedStockAlertLimit >= 0
          ? parsedStockAlertLimit
          : DEFAULT_STOCK_ALERT_LIMIT;
        if (cancelled) return;
        setProfile(existing);
        configureSupabase(savedSupabaseConfig);
        setSupabaseConfig(savedSupabaseConfig);
        setAccount(localSession?.account ?? null);
        setShopName(name ?? DEFAULT_SHOP_NAME);
        setShopUnlocked(unlocked === '1');
        setPaperWidthState((pWidth === '80' ? '80' : '58') as PaperWidth);
        setStockAlertLimit(nextStockAlertLimit);
        setProfitTrackingReady(profitReady === '1');
        setDeviceModeState(savedSyncMode === 'online' ? 'online' : 'offline');
        setRoute(localAccountCount === 0
          ? { name: 'register' }
          : !localSession
            ? { name: 'login' }
            : localSession.account.mustChangePassword
              ? { name: 'changePassword' }
              : { name: 'home' });
      } catch (error) {
        const stage = error instanceof Error && error.message ? error.message : 'BOOTSTRAP';
        console.error('[startup:bootstrap]', error);
        if (!cancelled) {
          setStartupStage(stage);
          setStartupError(true);
        }
      } finally {
        if (!cancelled) setBooted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, startupAttempt]);

  const onRegisterDone = useCallback((next: CustomerProfile, nextAccount: LocalAccount) => {
    setProfile(next);
    setAccount(nextAccount);
    showToast(t.register.success);
    setRoute({ name: 'home' });
  }, [showToast]);

  const onLoginDone = useCallback((nextAccount: LocalAccount) => {
    setAccount(nextAccount);
    setRoute(nextAccount.mustChangePassword ? { name: 'changePassword' } : { name: 'home' });
  }, []);

  const onPasswordChanged = useCallback(() => {
    setAccount((current) => current ? { ...current, mustChangePassword: false } : current);
    showToast(t.auth.passwordChanged);
    setRoute({ name: 'home' });
  }, [showToast]);

  const signOutLocalAccount = useCallback(async () => {
    await signOutCloud();
    setMembership(null);
    await clearLocalSession(db);
    setAccount(null);
    setCart({});
    setCartOpen(false);
    setRoute({ name: 'login' });
  }, [db]);

  const openAccounts = useCallback(async () => {
    if (!account || account.role === 'staff') return;
    setManagedAccounts(await getLocalAccounts(db));
    setRoute({ name: 'accounts' });
  }, [account, db]);

  const saveManagedAccount = useCallback(async (input: { name: string; email: string; password: string; role: LocalAccount['role'] }) => {
    if (!account) return;
    await createManagedLocalAccount(db, account, { ...input, ...await createPasswordVerifier(input.password) });
    setManagedAccounts(await getLocalAccounts(db));
    showToast(t.auth.accountCreated);
    setRoute({ name: 'accounts' });
  }, [account, db, showToast]);

  const toggleManagedAccount = useCallback(async (target: LocalAccount) => {
    if (!account) return;
    await setManagedLocalAccountActive(db, account, target, !target.isActive);
    setManagedAccounts(await getLocalAccounts(db));
  }, [account, db]);

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

  const saveStockAlertLimit = useCallback(async (limit: number) => {
    await setAppSetting(db, SETTING_STOCK_ALERT_LIMIT, String(limit));
    setStockAlertLimit(limit);
  }, [db]);

  const refreshAll = useCallback(async () => {
    const load = async <T,>(stage: string, request: Promise<T>): Promise<T> => {
      try {
        return await request;
      } catch (error) {
        console.error(`[startup:${stage}]`, error);
        throw new Error(stage);
      }
    };

    const [itemRows, categoryRows, saleRows, customerRows, ledgerRows, summary] = await Promise.all([
      load('items', getClothingItems(db)),
      load('categories', getCategories(db)),
      load('sales', getSales(db)),
      load('customers', getCustomers(db)),
      load('credit-ledger', getCreditLedger(db)),
      load('today-summary', getTodaySummary(db)),
    ]);
    setItems(itemRows);
    setCategories(categoryRows);
    setSales(saleRows);
    setCustomers(customerRows);
    setCreditLedger(ledgerRows);
    setToday(summary);
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    setInitialDataLoaded(false);

    void refreshAll()
      .then(() => {
        if (!cancelled) setInitialDataLoaded(true);
      })
      .catch((error) => {
        const stage = error instanceof Error && error.message ? error.message : 'REFRESH';
        console.error('[startup:refreshAll]', error);
        if (!cancelled) {
          setStartupStage(stage);
          setStartupError(true);
          setBooted(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshAll, startupAttempt]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getSyncStatus(db),
      getSupabaseProjectConfig(db),
      getAppSetting(db, SETTING_SYNC_MODE),
    ]).then(async ([status, config, savedMode]) => {
      if (!active) return;
      const nextMode: SyncMode = savedMode === 'online' ? 'online' : 'offline';
      configureSupabase(config);
      setSupabaseConfig(config);
      setSyncStatus(status);
      setDeviceModeState(nextMode);
      setMembership(config.active && nextMode === 'online' ? await getCurrentMembership().catch(() => null) : null);
    }).catch((error) => console.warn('[sync:bootstrap]', error));
    return () => { active = false; };
  }, [db]);

  const syncNow = useCallback(async (silent = false) => {
    if (syncingRef.current) {
      syncAgainRef.current = true;
      return;
    }
    if (deviceMode !== 'online' || !supabaseConfig.active || !membership) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const next = await runSync(db, membership);
      setSyncStatus(next);
      await refreshAll();
    } catch (error) {
      console.warn('[sync:run]', error);
      setSyncStatus(await getSyncStatus(db));
      if (!silent) Alert.alert(t.settings.errorTitle, t.sync.syncError);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [db, membership, refreshAll, supabaseConfig.active, deviceMode]);

  useEffect(() => {
    if (syncing || !syncAgainRef.current) return;
    syncAgainRef.current = false;
    void syncNow(true);
  }, [syncNow, syncing]);

  const requestLocalMigration = useCallback(() => {
    if (membership?.role !== 'owner') return;
    Alert.alert(t.sync.migrationConfirmTitle, t.sync.migrationConfirmBody, [
      { text: t.settings.cancel, style: 'cancel' },
      {
        text: t.settings.yes,
        onPress: () => {
          void markLocalMigrationRequested(db, membership.shopId).then(async () => {
            setSyncStatus(await getSyncStatus(db));
            showToast(t.sync.queued);
          }).catch(() => Alert.alert(t.settings.errorTitle, t.sync.syncError));
        },
      },
    ]);
  }, [db, membership, showToast]);

  const refreshSupabaseState = useCallback(async () => {
    const [config, status] = await Promise.all([getSupabaseProjectConfig(db), getSyncStatus(db)]);
    configureSupabase(config); setSupabaseConfig(config); setSyncStatus(status);
    setMembership(config.active && deviceMode === 'online' ? await getCurrentMembership().catch(() => null) : null);
  }, [db, deviceMode]);

  const setDeviceMode = useCallback(async (nextMode: SyncMode) => {
    if (nextMode === 'online' && !supabaseConfig.active) {
      Alert.alert(t.settings.errorTitle, t.sync.onlineRequired);
      return;
    }
    await setAppSetting(db, SETTING_SYNC_MODE, nextMode);
    setDeviceModeState(nextMode);
    if (nextMode === 'offline') {
      setMembership(null);
    } else {
      setMembership(await getCurrentMembership().catch(() => null));
    }
    showToast(t.sync.modeChanged);
  }, [db, showToast, supabaseConfig.active]);

  useEffect(() => {
    if (deviceMode !== 'online' || !supabaseConfig.active || !membership) return;
    const unsubscribe = subscribeToCatalogChanges(membership.shopId, () => { void syncNow(true); });
    void syncNow(true);
    return unsubscribe;
  }, [deviceMode, membership, supabaseConfig.active, syncNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && deviceMode === 'online') void syncNow(true);
    });
    return () => subscription.remove();
  }, [deviceMode, syncNow]);

  const saveSupabaseConfig = useCallback(async (input: Pick<SupabaseProjectConfig, 'url' | 'publishableKey' | 'storageBucket' | 'pathPrefix'>) => {
    await saveSupabaseProjectConfig(db, input); await refreshSupabaseState(); showToast(t.supabaseSetup.saved);
  }, [db, refreshSupabaseState, showToast]);
  const completeCloudOwnerSignIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfig.active) throw new Error('SUPABASE_NOT_CONFIGURED');
    await signInWithEmail(email, password);
    const nextMembership = await getCurrentMembership();
    if (nextMembership?.role !== 'owner') throw new Error('CLOUD_OWNER_MEMBERSHIP_REQUIRED');
    setMembership(nextMembership);
    showToast(t.cloudOwner.signedIn);
    setRoute({ name: 'sync' });
  }, [showToast, supabaseConfig.active]);
  const completeCloudMemberSignIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfig.active) throw new Error('SUPABASE_NOT_CONFIGURED');
    await signInWithEmail(email, password);
    const nextMembership = await getCurrentMembership();
    if (!nextMembership) { await signOutCloud(); throw new Error('ACTIVE_MEMBERSHIP_REQUIRED'); }
    setMembership(nextMembership);
    showToast(t.cloudMember.signedIn);
    setRoute({ name: 'sync' });
  }, [showToast, supabaseConfig.active]);
  const createCloudOwner = useCallback(async (input: { email: string; password: string; bootstrapToken: string }) => {
    if (!profile || !account || !supabaseConfig.active) throw new Error('SUPABASE_NOT_CONFIGURED');
    await bootstrapCloudOwner({
      email: input.email, password: input.password, bootstrapToken: input.bootstrapToken,
      shopName, ownerName: account.name, phone: profile.phone, address: profile.address,
    });
    await completeCloudOwnerSignIn(input.email, input.password);
    showToast(t.cloudOwner.created);
  }, [account, completeCloudOwnerSignIn, profile, shopName, showToast, supabaseConfig.active]);
  const testSupabaseConfig = useCallback(async (input: Pick<SupabaseProjectConfig, 'url' | 'publishableKey'>) => {
    const result = await testSupabaseReadiness(input);
    const safeMessage = result.message.replace(/[\r\n]+/g, ' ').slice(0, 220);
    // Do not refresh the persisted config here: it can still be empty while the
    // owner is testing values that have not yet been saved, which would clear the form.
    await saveSupabaseTestResult(db, safeMessage, result.code);
    Alert.alert(
      result.ok ? t.supabaseSetup.tested : t.settings.errorTitle,
      result.ok ? t.supabaseSetup.tested : `${t.supabaseSetup.testFailed}\n${result.code}: ${safeMessage}`,
    );
  }, [db]);
  const disconnectSupabase = useCallback(async () => {
    await signOutCloud();
    setMembership(null);
    await clearSupabaseProjectConfig(db);
    await refreshSupabaseState();
    showToast(t.supabaseSetup.disconnected);
  }, [db, refreshSupabaseState, showToast]);

  const openProfitReport = useCallback(() => {
    const proceed = async () => {
      try {
        await clearSalesHistory(db);
        await setAppSetting(db, SETTING_PROFIT_TRACKING_READY, '1');
        setProfitTrackingReady(true);
        await refreshAll();
        setRoute({ name: 'profitReport' });
      } catch {
        Alert.alert(t.profit.resetError);
      }
    };

    if (profitTrackingReady) {
      setRoute({ name: 'profitReport' });
    } else if (!sales.length) {
      void (async () => {
        try {
          await setAppSetting(db, SETTING_PROFIT_TRACKING_READY, '1');
          setProfitTrackingReady(true);
          setRoute({ name: 'profitReport' });
        } catch {
          Alert.alert(t.profit.resetError);
        }
      })();
    } else {
      Alert.alert(t.profit.resetTitle, t.profit.resetBody, [
        { text: t.profit.cancel, style: 'cancel' },
        { text: t.profit.resetConfirm, style: 'destructive', onPress: () => { void proceed(); } },
      ]);
    }
  }, [db, profitTrackingReady, refreshAll, sales.length]);

  const loadProfitSummary = useCallback((startInclusive: Date, endExclusive: Date): Promise<ProfitSummary> => (
    getProfitSummary(db, startInclusive, endExclusive)
  ), [db]);

  const cartLines: CartLine[] = items
    .filter((item) => cart[item.id])
    .map((item) => ({ item, quantity: cart[item.id] }));
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartSubtotal = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const appliedDiscount = Math.min(discountAmount, cartSubtotal + taxAmount);
  const cartTotal = cartSubtotal + taxAmount - appliedDiscount;

  const changeQuantity = useCallback((id: number, delta: number) => {
    setCart((current) => {
      const item = items.find((candidate) => candidate.id === id);
      const maximum = item?.stock ?? 0;
      const quantity = Math.min((current[id] ?? 0) + delta, maximum);
      if (quantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: quantity };
    });
  }, [items]);

  const setItemQty = useCallback((item: ClothingItem, qty: number) => {
    setCart((c) => {
      const nextQuantity = Math.min(qty, item.stock);
      const current = c[item.id] ?? 0;
      if (nextQuantity === current) return c;
      if (nextQuantity <= 0) {
        if (!(item.id in c)) return c;
        const next = { ...c };
        delete next[item.id];
        return next;
      }
      return { ...c, [item.id]: nextQuantity };
    });
  }, []);

  const onScanned = useCallback(async (value: string, format: string, keepOpen: boolean) => {
    if (!keepOpen) setScannerOpen(false);
    const scannedCode = value.trim();
    if (!scannedCode) {
      Alert.alert(t.scanner.notFoundTitle, `${value}\n${t.scanner.notFoundBody}`);
      return;
    }
    const item = await findClothingByQr(db, scannedCode);
    if (!item) {
      Alert.alert(t.scanner.notFoundTitle, `${value}\n${t.scanner.notFoundBody}`);
      return;
    }
    const cartQuantity = cart[item.id] ?? 0;
    if (cartQuantity >= item.stock) {
      showToast(t.sell.soldOut);
      return;
    }
    changeQuantity(item.id, 1);
    setLastScannedItem(item);
    showToast(`${t.toast.added} (${scanFormatLabel(format)})`);
    if (route.name !== 'sell' && route.name !== 'creditSell' && !keepOpen) setRoute({ name: 'sell' });
  }, [db, cart, changeQuantity, showToast, route.name]);

  const confirmSale = useCallback(async () => {
    if (!cartLines.length) return;
    try {
      const saleId = await createSale(
        db,
        cartLines.map((l) => l.item),
        cart,
        taxAmount,
        'အခွန်',
        appliedDiscount,
        'လျော့စျေး',
      );
      setCart({});
      setTaxAmount(0);
      setDiscountAmount(0);
      setCartOpen(false);
      setLastScannedItem(null);
      await refreshAll();
      setRoute({ name: 'receipt', saleId });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      Alert.alert(message === INSUFFICIENT_STOCK_ERROR ? t.cart.stockUnavailable : t.cart.checkoutError);
      await refreshAll();
    }
  }, [db, cartLines, cart, taxAmount, appliedDiscount, refreshAll, showToast]);

  const saveCustomerHandler = useCallback(async (input: CustomerInput) => {
    try {
      await saveCustomer(db, input);
      await refreshAll();
      showToast(t.toast.saved);
      const returnToCredit = route.name === 'customerForm' && route.returnTo === 'creditCheckout';
      setRoute(returnToCredit ? { name: 'creditCheckout' } : { name: 'customers' });
    } catch {
      Alert.alert(t.customer.required);
    }
  }, [db, refreshAll, route, showToast]);

  const deleteCustomerHandler = useCallback(async (customer: Customer) => {
    try {
      await deleteCustomer(db, customer.id);
      await refreshAll();
      showToast(t.toast.deleted);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      Alert.alert(message === CUSTOMER_HAS_CREDIT_ERROR ? t.customer.linkedCannotDelete : t.customer.required);
    }
  }, [db, refreshAll, showToast]);

  const confirmCreditSale = useCallback(async (customerId: number, initialPaid: number) => {
    if (!cartLines.length) return;
    try {
      const saleId = await createCreditSale(
        db, customerId, cartLines.map((line) => line.item), cart, initialPaid,
        taxAmount, 'အခွန်', appliedDiscount, 'လျော့စျေး',
      );
      setCart({});
      setTaxAmount(0);
      setDiscountAmount(0);
      setLastScannedItem(null);
      await refreshAll();
      showToast(t.credit.saved);
      setRoute({ name: 'receipt', saleId });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      Alert.alert(message === INSUFFICIENT_STOCK_ERROR ? t.cart.stockUnavailable : t.credit.createError);
      await refreshAll();
    }
  }, [appliedDiscount, cart, cartLines, db, refreshAll, showToast, taxAmount]);

  const settleCreditHandler = useCallback(async (credit: CreditLedgerRow) => {
    try {
      await settleCreditSale(db, credit.id);
      await refreshAll();
      showToast(t.credit.settledSuccess);
    } catch {
      Alert.alert(t.credit.settleError);
    }
  }, [db, refreshAll, showToast]);

  const saveSaleEdit = useCallback((saleId: number, input: SaleUpdateInput) => {
    Alert.alert(t.saleEdit.confirmTitle, t.saleEdit.confirmBody, [
      { text: t.saleEdit.cancel, style: 'cancel' },
      {
        text: t.saleEdit.confirm,
        onPress: async () => {
          try {
            await updateSale(db, saleId, input);
            await refreshAll();
            showToast(t.saleEdit.success);
            setRoute({ name: 'saleDetail', saleId });
          } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message === INSUFFICIENT_STOCK_ERROR) {
              Alert.alert(t.saleEdit.stockUnavailable);
            } else if (message === SALE_ITEM_UNAVAILABLE_ERROR) {
              Alert.alert(t.saleEdit.unavailableTitle, t.saleEdit.unavailableBody);
            } else {
              Alert.alert(t.saleEdit.saveError);
            }
          }
        },
      },
    ]);
  }, [db, refreshAll, showToast]);

  const clearCart = useCallback(() => {
    setCart({});
    setTaxAmount(0);
    setDiscountAmount(0);
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
            await initializeDatabase(db);
            const [
              restoredProfile,
              restoredShopName,
              restoredShopUnlocked,
              restoredPaperWidth,
              restoredStockAlertLimit,
              restoredProfitReady,
              restoredSyncMode,
              restoredSupabaseConfig,
              restoredSyncStatus,
              restoredLocalAccountCount,
              restoredLocalSession,
            ] = await Promise.all([
              getCustomerProfile(db),
              getAppSetting(db, SETTING_SHOP_NAME),
              getAppSetting(db, SETTING_SHOP_NAME_UNLOCKED),
              getAppSetting(db, SETTING_PRINTER_PAPER_WIDTH),
              getAppSetting(db, SETTING_STOCK_ALERT_LIMIT),
              getAppSetting(db, SETTING_PROFIT_TRACKING_READY),
              getAppSetting(db, SETTING_SYNC_MODE),
              getSupabaseProjectConfig(db),
              getSyncStatus(db),
              getLocalAccountCount(db),
              getLocalSession(db),
            ]);
            const parsedStockAlertLimit = Number(restoredStockAlertLimit);
            setProfile(restoredProfile);
            setAccount(restoredLocalSession?.account ?? null);
            setShopName(restoredShopName ?? DEFAULT_SHOP_NAME);
            setShopUnlocked(restoredShopUnlocked === '1');
            setPaperWidthState(restoredPaperWidth === '80' ? '80' : '58');
            setStockAlertLimit(Number.isSafeInteger(parsedStockAlertLimit) && parsedStockAlertLimit >= 0
              ? parsedStockAlertLimit
              : DEFAULT_STOCK_ALERT_LIMIT);
            setProfitTrackingReady(restoredProfitReady === '1');
            const restoredMode: SyncMode = restoredSyncMode === 'online' ? 'online' : 'offline';
            configureSupabase(restoredSupabaseConfig);
            setSupabaseConfig(restoredSupabaseConfig);
            setSyncStatus(restoredSyncStatus);
            setDeviceModeState(restoredMode);
            setMembership(restoredSupabaseConfig.active && restoredMode === 'online' ? await getCurrentMembership().catch(() => null) : null);
            setCart({});
            setTaxAmount(0);
            setDiscountAmount(0);
            setCartOpen(false);
            setScannerOpen(false);
            setLastScannedItem(null);
            await refreshAll();
            setRoute(restoredLocalAccountCount === 0
              ? { name: 'register' }
              : !restoredLocalSession
                ? { name: 'login' }
                : restoredLocalSession.account.mustChangePassword
                  ? { name: 'changePassword' }
                  : { name: 'home' });
            showToast(t.settings.loadSuccess);
          } catch {
            Alert.alert(t.settings.errorTitle, t.settings.loadError);
          } finally {
            setSettingsBusy(false);
          }
        },
      },
    ]);
  }, [db, refreshAll, settingsBusy, showToast]);

  const saveItem = useCallback(async (form: ItemFormValue) => {
    if (membership && membership.role !== 'owner') return;
    const price = Number(form.price);
    const purchaseCost = Number(form.purchaseCost);
    const stock = Number(form.stock) || 0;
    if (!form.name.trim() || !form.categoryId || !Number.isFinite(price) || price < 0
      || !Number.isFinite(purchaseCost) || purchaseCost < 0) {
      Alert.alert(t.items.invalidTitle, t.items.invalidBody);
      return;
    }
    const normalizedQrCode = form.qrCode.trim();
    try {
      const savedItemId = await saveClothingItem(db, {
        id: form.id,
        name: form.name.trim(),
        size: form.size.trim(),
        qrCode: normalizedQrCode || null,
        price,
        purchaseCost,
        categoryId: form.categoryId,
        stock,
        choiceType: form.choiceType,
        colorValue: form.colorValue,
        photoUri: form.photoUri,
        note: form.note,
      });
      if (membership?.role === 'owner') {
        await queueItemUpsert(db, membership.shopId, savedItemId);
        void syncNow(true);
      }
      setRoute({ name: 'clothes' });
      await refreshAll();
      showToast(t.toast.saved);
    } catch (error) {
      Alert.alert(
        t.items.dupTitle,
        normalizedQrCode && isDuplicateBarcodeError(error) ? t.items.dupBody : t.cart.checkoutError,
      );
    }
  }, [db, membership, refreshAll, showToast, syncNow]);

  const saveCategoryHandler = useCallback(async (form: CategoryFormValue) => {
    if (membership && membership.role !== 'owner') return;
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
      const savedCategory = await saveCategory(db, { id: form.id ?? undefined, name, color: form.color });
      if (membership?.role === 'owner') {
        await queueCategoryUpsert(db, membership.shopId, savedCategory.id);
        void syncNow(true);
      }
      await refreshAll();
      showToast(t.items.categorySaved);
      setRoute({ name: 'clothes' });
    } catch {
      Alert.alert(t.items.categoryDuplicate);
    }
  }, [categories, db, membership, refreshAll, showToast, syncNow]);

  const deleteCategoryHandler = useCallback(async (category: Category) => {
    if (membership && membership.role !== 'owner') return;
    await deleteCategory(db, category.id);
    if (membership?.role === 'owner') {
      await queueCategoryDelete(db, membership.shopId, category.id);
      void syncNow(true);
    }
    await refreshAll();
    showToast(t.items.categoryDeleted);
  }, [db, membership, refreshAll, showToast, syncNow]);

  const moveCategory = useCallback(async (category: Category, direction: 'up' | 'down') => {
    if (membership && membership.role !== 'owner') return;
    const idx = categories.findIndex((c) => c.id === category.id);
    if (idx < 0) return;
    const next = direction === 'up' ? idx - 1 : idx + 1;
    if (next < 0 || next >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(next, 0, moved);
    const orderedIds = reordered.map((c) => c.id);
    await reorderCategories(db, orderedIds);
    if (membership?.role === 'owner') {
      await queueCategoryReorder(db, membership.shopId, orderedIds);
      void syncNow(true);
    }
    await refreshAll();
  }, [categories, db, membership, refreshAll, syncNow]);

  const confirmDelete = useCallback((item: ClothingItem) => {
    if (membership && membership.role !== 'owner') return;
    Alert.alert(t.items.deleteTitle, item.name, [
      { text: t.items.deleteNo, style: 'cancel' },
      {
        text: t.items.deleteYes,
        style: 'destructive',
        onPress: async () => {
          await deleteClothingItem(db, item.id);
          if (membership?.role === 'owner') {
            await queueItemDelete(db, membership.shopId, item.id);
            void syncNow(true);
          }
          await refreshAll();
          showToast(t.toast.deleted);
        },
      },
    ]);
  }, [db, membership, refreshAll, showToast, syncNow]);

  const showTabs = route.name === 'home' || route.name === 'clothes' || route.name === 'history';
  const tabs: { key: Route['name']; label: string }[] = [
    { key: 'home', label: t.tabs.home },
    { key: 'clothes', label: t.tabs.items },
    { key: 'history', label: t.tabs.history },
  ];

  if (!booted || !initialDataLoaded || startupError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <View style={[styles.content, startupStyles.container]}>
          {!booted ? (
            <>
              <ActivityIndicator size="large" color={colors.header} />
              <AppText style={startupStyles.loadingText}>{t.startup.loading}</AppText>
            </>
          ) : (
            <>
              <AppText bold style={startupStyles.errorTitle}>{t.startup.errorTitle}</AppText>
              <AppText style={startupStyles.errorBody}>{t.startup.errorBody}</AppText>
              {startupStage ? (
                <AppText style={startupStyles.errorBody}>{t.startup.diagnostic} {startupStage}</AppText>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => setStartupAttempt((attempt) => attempt + 1)}
                style={({ pressed }) => [startupStyles.retryButton, pressed && { opacity: 0.8 }]}
              >
                <AppText bold style={startupStyles.retryText}>{t.startup.retry}</AppText>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (route.name === 'register') {
    return <RegisterScreen onDone={onRegisterDone} />;
  }

  if (route.name === 'login' || !account) {
    return <LoginScreen onDone={onLoginDone} />;
  }

  if (route.name === 'changePassword' || account.mustChangePassword) {
    return <ChangePasswordScreen account={account} onDone={onPasswordChanged} />;
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
            onOpenProfitReport={openProfitReport}
            onScan={() => setScannerOpen(true)}
            onOpenSettings={() => setRoute({ name: 'settings' })}
            onOpenSync={() => setRoute({ name: 'sync', returnTo: 'home' })}
            syncMode={deviceMode}
            onOpenAccounts={account.role === 'staff' ? undefined : () => { void openAccounts(); }}
            onOpenStockAlert={() => setRoute({ name: 'stockAlert' })}
            onOpenCustomers={() => setRoute({ name: 'customers' })}
            onStartCreditSale={() => setRoute({ name: 'creditSell' })}
            onOpenCreditLedger={() => setRoute({ name: 'creditLedger' })}
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
        {route.name === 'creditSell' && (
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
        {route.name === 'creditCheckout' && (
          <CreditCheckoutScreen
            lines={cartLines}
            total={cartTotal}
            customers={customers}
            onBack={() => setRoute({ name: 'creditSell' })}
            onCreateCustomer={() => setRoute({ name: 'customerForm', returnTo: 'creditCheckout' })}
            onConfirm={confirmCreditSale}
          />
        )}
        {route.name === 'customers' && (
          <CustomersScreen
            customers={customers}
            onBack={() => setRoute({ name: 'home' })}
            onCreate={() => setRoute({ name: 'customerForm' })}
            onEdit={(customer) => setRoute({ name: 'customerForm', customerId: customer.id })}
            onDelete={deleteCustomerHandler}
          />
        )}
        {route.name === 'customerForm' && (
          <CustomerFormScreen
            initial={route.customerId ? customers.find((customer) => customer.id === route.customerId) : undefined}
            onBack={() => setRoute(route.returnTo === 'creditCheckout' ? { name: 'creditCheckout' } : { name: 'customers' })}
            onSave={saveCustomerHandler}
          />
        )}
        {route.name === 'creditLedger' && (
          <CreditLedgerScreen ledger={creditLedger} onBack={() => setRoute({ name: 'home' })} onSettle={settleCreditHandler} />
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
              editable={!membership || membership.role === 'owner'}
            />
          </View>
        )}
        {route.name === 'history' && (
          <View style={{ flex: 1, paddingBottom: 90 }}>
            <HistoryScreen
              sales={sales}
              onOpen={(saleId) => setRoute({ name: 'saleDetail', saleId })}
            />
          </View>
        )}
        {route.name === 'profitReport' && (
          <ProfitReportScreen onBack={() => setRoute({ name: 'home' })} onLoad={loadProfitSummary} />
        )}
        {route.name === 'receipt' && (
          <ReceiptScreen
            saleId={route.saleId}
            shopName={shopName}
            onNewSale={() => setRoute({ name: 'sell' })}
            onViewHistory={() => setRoute({ name: 'history' })}
          />
        )}
        {route.name === 'saleDetail' && (
          <SaleDetailScreen
            saleId={route.saleId}
            shopName={shopName}
            onBack={() => setRoute({ name: 'history' })}
            editable={!creditLedger.some((credit) => credit.saleId === route.saleId)}
            onEdit={() => setRoute({ name: 'saleEdit', saleId: route.saleId })}
          />
        )}
        {route.name === 'saleEdit' && (
          <SaleEditScreen
            saleId={route.saleId}
            items={items}
            onBack={() => setRoute({ name: 'saleDetail', saleId: route.saleId })}
            onSave={(input) => saveSaleEdit(route.saleId, input)}
          />
        )}
        {route.name === 'itemForm' && (!membership || membership.role === 'owner') && (
          <ItemFormScreen
            initial={route.itemId ? itemToForm(items.find((i) => i.id === route.itemId)!) : emptyForm}
            categories={categories}
            onBack={() => setRoute({ name: 'clothes' })}
            onSave={saveItem}
            onCreateCategory={() => setRoute({ name: 'categoryForm' })}
          />
        )}
        {route.name === 'categoryForm' && (!membership || membership.role === 'owner') && (
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
        {route.name === 'accounts' && (
          <AccountsScreen
            actor={account}
            accounts={managedAccounts}
            onBack={() => setRoute({ name: 'settings' })}
            onCreate={() => setRoute({ name: 'accountForm' })}
            onToggle={(target) => { void toggleManagedAccount(target); }}
          />
        )}
        {route.name === 'accountForm' && (
          <AccountFormScreen
            actorRole={account.role}
            onBack={() => setRoute({ name: 'accounts' })}
            onSave={saveManagedAccount}
          />
        )}
        {route.name === 'settings' && (
          <SettingsScreen
            onBack={() => setRoute({ name: 'home' })}
            onExport={handleExportDatabase}
            onExportToDownloads={handleExportToDownloads}
            onImport={handleImportDatabase}
            onOpenAbout={() => setRoute({ name: 'about' })}
            onOpenSupabaseSetup={() => setRoute({ name: 'supabaseSetup' })}
            onOpenAccounts={account.role === 'staff' ? undefined : () => { void openAccounts(); }}
            canManageOwnerControls={account.role === 'owner'}
            onSignOut={() => { void signOutLocalAccount(); }}
            busy={settingsBusy}
            shopName={shopName}
            shopUnlocked={shopUnlocked}
            onUnlockShopName={unlockShopName}
            onSaveShopName={saveShopName}
          />
        )}
        {route.name === 'supabaseSetup' && account.role === 'owner' && (
          <SupabaseSetupScreen
            config={supabaseConfig}
            guard={{ pendingOutbox: syncStatus.pendingCount, syncingOutbox: syncStatus.syncingCount, failedOutbox: syncStatus.failedCount, openConflicts: syncStatus.conflictCount, pendingUploads: syncStatus.pendingUploadCount, uploadingUploads: syncStatus.uploadingUploadCount, failedUploads: syncStatus.failedUploadCount, migrationActive: syncStatus.migrationActive, blocked: syncStatus.pendingCount + syncStatus.syncingCount + syncStatus.failedCount + syncStatus.conflictCount + syncStatus.pendingUploadCount + syncStatus.uploadingUploadCount + syncStatus.failedUploadCount > 0 || syncStatus.migrationActive }}
            busy={syncing}
            onBack={() => setRoute({ name: 'settings' })}
            onSave={saveSupabaseConfig}
            onTest={testSupabaseConfig}
            onDisconnect={() => { void disconnectSupabase(); }}
            onOpenCloudOwner={() => setRoute({ name: 'cloudOwner' })}
            onOpenSync={() => setRoute({ name: 'sync' })}
            onMigration={requestLocalMigration}
          />
        )}
        {route.name === 'cloudOwner' && account.role === 'owner' && (
          <CloudOwnerScreen
            email={account.email}
            configured={supabaseConfig.active}
            onBack={() => setRoute({ name: 'supabaseSetup' })}
            onCreate={createCloudOwner}
            onSignIn={({ email, password }) => completeCloudOwnerSignIn(email, password)}
          />
        )}
        {route.name === 'cloudMember' && (
          <CloudMemberScreen
            configured={supabaseConfig.active}
            onBack={() => setRoute({ name: 'sync' })}
            onSignIn={({ email, password }) => completeCloudMemberSignIn(email, password)}
          />
        )}
        {route.name === 'sync' && (
          <SyncScreen
            role={membership?.role ?? null}
            configured={supabaseConfig.active}
            mode={deviceMode}
            onSetMode={(mode) => { void setDeviceMode(mode); }}
            status={syncStatus}
            syncing={syncing}
            onBack={() => setRoute({ name: route.returnTo ?? 'settings' })}
            onSync={() => { void syncNow(); }}
            onRequestMigration={requestLocalMigration}
            onSignIn={() => setRoute({ name: 'cloudMember' })}
          />
        )}
        {route.name === 'about' && (
          <AboutScreen onBack={() => setRoute({ name: 'settings' })} />
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
        subtotal={cartSubtotal}
        taxAmount={taxAmount}
        discountAmount={appliedDiscount}
        total={cartTotal}
        onSetTax={(amount) => {
          setTaxAmount(amount);
          setDiscountAmount((current) => Math.min(current, cartSubtotal + amount));
        }}
        onSetDiscount={setDiscountAmount}
        onClose={() => setCartOpen(false)}
        onQuantity={changeQuantity}
        onClear={clearCart}
        onConfirm={() => {
          if (route.name === 'creditSell') {
            setCartOpen(false);
            setRoute({ name: 'creditCheckout' });
          } else {
            confirmSale();
          }
        }}
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
    backgroundColor: '#DCFCE7', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  toastText: { color: '#166534', fontSize: 14 },
});
