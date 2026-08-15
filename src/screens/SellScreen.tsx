import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { ClothingItem } from '../db';
import { formatKyat, t, toMM } from '../i18n';
import { colors, font, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import ItemCard from '../components/ItemCard';
import {
  BackArrowIcon,
  ChevronDownIcon,
  ScanIcon,
  SearchIcon,
} from '../components/ServiceIcon';

type Props = {
  items: ClothingItem[];
  cart: Record<number, number>;
  cartCount: number;
  cartTotal: number;
  onChangeQty: (item: ClothingItem, qty: number) => void;
  onOpenCart: () => void;
  onScan: () => void;
  onBack: () => void;
};

export default function SellScreen({
  items,
  cart,
  cartCount,
  cartTotal,
  onChangeQty,
  onOpenCart,
  onScan,
  onBack,
}: Props) {
  const [query, setQuery] = useState('');
  const [customPrice, setCustomPrice] = useState(false);
  const toggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: customPrice ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [customPrice, toggleAnim]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q) ||
        item.qrCode.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="menu"
          onPress={onBack}
          style={styles.iconBtn}
        >
          <BackArrowIcon size={26} color="#FFFFFF" />
        </Pressable>
        <AppText style={styles.title}>{t.sell.brand}</AppText>
        <View style={styles.headerRight}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: customPrice }}
            onPress={() => setCustomPrice((v) => !v)}
            style={({ pressed }) => [
              styles.headerToggle,
              pressed && styles.togglePressed,
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius: 14,
                  backgroundColor: toggleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgba(255,255,255,0.25)', '#FFFFFF'],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.headerToggleThumb,
                {
                  transform: [
                    {
                      translateX: toggleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 16],
                      }),
                    },
                  ],
                  backgroundColor: toggleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#FFFFFF', '#4A6CF7'],
                  }),
                },
              ]}
            />
            <Animated.Text
              style={[
                styles.headerToggleLabel,
                {
                  color: toggleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#FFFFFF', '#4A6CF7'],
                  }),
                },
              ]}
            >
              {t.sell.customPrice}
            </Animated.Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="scan"
            onPress={onScan}
            style={styles.iconBtn}
          >
            <ScanIcon size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconWrap}>
            <SearchIcon size={22} color={colors.iconGreen} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.sell.search}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          <View style={styles.chevronWrap}>
            <ChevronDownIcon size={22} color="#1D1B20" />
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.list,
          cartCount > 0 && styles.listWithCart,
        ]}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            quantity={cart[item.id] ?? 0}
            onChangeQty={onChangeQty}
          />
        )}
        ListEmptyComponent={
          <EmptyState title={t.sell.emptyTitle} hint={t.sell.emptyHint} />
        }
      />

      {cartCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onOpenCart}
          style={({ pressed }) => [styles.cartBar, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.cartLeft}>
            <View style={styles.countBadge}>
              <AppText bold style={styles.countText}>
                {toMM(cartCount)}
              </AppText>
            </View>
            <AppText bold style={styles.cartLabel}>
              {t.sell.cart}
            </AppText>
          </View>
          <AppText bold style={styles.cartTotal}>
            {formatKyat(cartTotal)} ›
          </AppText>
        </Pressable>
      ) : (
        <View style={styles.hintBar}>
          <AppText style={styles.hintText}>{t.sell.tapToAdd}</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    height: 58,
    backgroundColor: '#4A6CF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Pyidaungsu-Bold',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...shadow,
  },
  searchIconWrap: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 4,
    fontFamily: 'Pyidaungsu-Regular',
    fontSize: 14,
    color: colors.text,
  },
  chevronWrap: {
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    minHeight: 26,
    overflow: 'hidden',
  },
  togglePressed: { opacity: 0.85 },
  headerToggleThumb: {
    position: 'absolute',
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  headerToggleLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: font.bold,
    marginLeft: 18,
  },
  row: { gap: 16, paddingHorizontal: 16 },
  list: { paddingTop: 6, paddingBottom: 24 },
  listWithCart: { paddingBottom: 96 },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.header,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadow,
  },
  cartLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { color: '#fff', fontSize: 14 },
  cartLabel: { color: '#fff', fontSize: 16 },
  cartTotal: { color: '#fff', fontSize: 17 },
  hintBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  hintText: { color: colors.muted, fontSize: 12 },
});