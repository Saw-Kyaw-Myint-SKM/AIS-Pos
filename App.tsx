import { useFonts } from 'expo-font';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppText from './src/components/AppText';
import CartSheet, { type CartLine } from './src/components/CartSheet';
import {
  createSale, deleteClothingItem, findClothingByQr, getClothingItems, getCustomerProfile,
  getSales, getTodaySummary, initializeDatabase, saveClothingItem,
  type ClothingItem, type CustomerProfile, type Sale, type TodaySummary,
} from './src/db';
import { scanFormatLabel, t } from './src/i18n';
import HistoryScreen from './src/screens/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import ItemFormScreen, { emptyForm, itemToForm } from './src/screens/ItemFormScreen';
import type { ItemFormValue } from './src/screens/ItemFormScreen';
import ItemsScreen from './src/screens/ItemsScreen';
import ReceiptScreen from './src/screens/ReceiptScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SaleDetailScreen from './src/screens/SaleDetailScreen';
import ScannerModal from './src/screens/ScannerModal';
import SellScreen from './src/screens/SellScreen';
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
  | { name: 'itemForm'; itemId?: number };

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
      <SQLiteProvider databaseName="clothes-pos.db" onInit={initializeDatabase}>
        <PosApp />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const splashStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});

function PosApp() {
  const db = useSQLiteContext();
  const [booted, setBooted] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [today, setToday] = useState<TodaySummary>({ total: 0, saleCount: 0, itemCount: 0 });
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getCustomerProfile(db);
      if (cancelled) return;
      setProfile(existing);
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

  const refreshAll = useCallback(async () => {
    const [itemRows, saleRows, summary] = await Promise.all([
      getClothingItems(db), getSales(db), getTodaySummary(db),
    ]);
    setItems(itemRows);
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
    showToast(`${t.toast.added} (${scanFormatLabel(format)})`);
    if (route.name !== 'sell' && !keepOpen) setRoute({ name: 'sell' });
  }, [db, changeQuantity, showToast, route.name]);

  const confirmSale = useCallback(async () => {
    if (!cartLines.length) return;
    const saleId = await createSale(db, cartLines.map((l) => l.item), cart);
    setCart({});
    setCartOpen(false);
    await refreshAll();
    setRoute({ name: 'receipt', saleId });
  }, [db, cartLines, cart, refreshAll]);

  const clearCart = useCallback(() => {
    setCart({});
    showToast(t.toast.cleared);
  }, [showToast]);

  const saveItem = useCallback(async (form: ItemFormValue) => {
    const price = Number(form.price);
    const stock = Number(form.stock) || 0;
    if (!form.name.trim() || !form.size.trim() || !form.qrCode.trim() || !Number.isFinite(price) || price < 0) {
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
        category: form.category,
        stock,
        choiceType: form.choiceType,
        colorValue: form.colorValue,
        note: form.note,
      });
      setRoute({ name: 'clothes' });
      await refreshAll();
      showToast(t.toast.saved);
    } catch {
      Alert.alert(t.items.dupTitle, t.items.dupBody);
    }
  }, [db, refreshAll, showToast]);

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
            onStartSale={() => setRoute({ name: 'sell' })}
            onOpenItems={() => setRoute({ name: 'clothes' })}
            onOpenHistory={() => setRoute({ name: 'history' })}
            onScan={() => setScannerOpen(true)}
            onOpenSettings={() => showToast(t.home.setting)}
          />
        )}
        {route.name === 'sell' && (
          <SellScreen
            items={items}
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
              onPressItem={(item) => setRoute({ name: 'itemForm', itemId: item.id })}
              onDelete={confirmDelete}
              onCreateProduct={() => setRoute({ name: 'itemForm' })}
              onCreateCategory={() => showToast('Coming Soon')}
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
            onNewSale={() => setRoute({ name: 'sell' })}
            onViewHistory={() => setRoute({ name: 'history' })}
          />
        )}
        {route.name === 'saleDetail' && (
          <SaleDetailScreen saleId={route.saleId} onBack={() => setRoute({ name: 'history' })} />
        )}
        {route.name === 'itemForm' && (
          <ItemFormScreen
            initial={route.itemId ? itemToForm(items.find((i) => i.id === route.itemId)!) : emptyForm}
            onBack={() => setRoute({ name: 'clothes' })}
            onSave={saveItem}
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

      <ScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={onScanned} />

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
