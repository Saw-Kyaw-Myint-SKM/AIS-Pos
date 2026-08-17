import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { Category, ClothingItem } from '../db';
import { formatKyat, t, toMM } from '../i18n';
import { colors, font, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import ItemCard from '../components/ItemCard';
import {
  BackArrowIcon,
  CartIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ScanIcon,
  SearchIcon,
} from '../components/ServiceIcon';

type Props = {
  items: ClothingItem[];
  categories: Category[];
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
  categories,
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
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
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
    return items.filter((item) => {
      if (categoryFilter !== null && item.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q) ||
        item.qrCode.toLowerCase().includes(q)
      );
    });
  }, [items, query, categoryFilter]);

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="category-filter"
            onPress={() => setCategorySheetOpen(true)}
            style={({ pressed }) => [
              styles.chevronWrap,
              categoryFilter !== null && styles.chevronWrapActive,
              pressed && styles.chevronWrapPressed,
            ]}
          >
            <ChevronDownIcon
              size={22}
              color={categoryFilter !== null ? '#FFFFFF' : '#1D1B20'}
            />
          </Pressable>
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
          style={({ pressed }) => [styles.cartBar, pressed && styles.cartBarPressed]}
        >
          <View style={styles.cartLeft}>
            <View style={styles.cartIconWrap}>
              <CartIcon size={22} color="#FFFFFF" />
              <View style={styles.countBadge}>
                <AppText bold style={styles.countBadgeText}>
                  {toMM(cartCount)}
                </AppText>
              </View>
            </View>
            <AppText bold style={styles.cartLabel}>{t.sell.cart}</AppText>
          </View>
          <View style={styles.cartRight}>
            <AppText bold style={styles.cartTotal}>{formatKyat(cartTotal)}</AppText>
            <ChevronRightIcon size={18} color="#FFFFFF" />
          </View>
        </Pressable>
      ) : (
        <View style={styles.hintBar}>
          <AppText style={styles.hintText}>{t.sell.tapToAdd}</AppText>
        </View>
      )}

      <Modal
        visible={categorySheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCategorySheetOpen(false)}
      >
        <View style={styles.filterOverlay}>
          <Pressable style={styles.filterBackdrop} onPress={() => setCategorySheetOpen(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.grabber} />
            <AppText bold style={styles.filterSheetTitle}>{t.items.filterCategory}</AppText>
            <Pressable
              style={[styles.categoryOption, categoryFilter === null && styles.categoryOptionActive]}
              onPress={() => { setCategoryFilter(null); setCategorySheetOpen(false); }}
            >
              <AppText style={[styles.categoryOptionText, categoryFilter === null && styles.categoryOptionTextActive]}>
                {t.sell.categoryAll}
              </AppText>
            </Pressable>
            {categories.map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.categoryOption, active && styles.categoryOptionActive]}
                  onPress={() => { setCategoryFilter(cat.id); setCategorySheetOpen(false); }}
                >
                  <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  <AppText style={[styles.categoryOptionText, active && styles.categoryOptionTextActive]}>
                    {cat.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
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
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  chevronWrapActive: {
    backgroundColor: '#4A6CF7',
    borderLeftColor: '#4A6CF7',
  },
  chevronWrapPressed: { opacity: 0.7 },
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
    bottom: 24,
    backgroundColor: colors.sellBlue,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cartBarPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  cartLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  countBadgeText: { color: '#FFFFFF', fontSize: 11, lineHeight: 14 },
  cartLabel: { color: '#FFFFFF', fontSize: 16 },
  cartRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cartTotal: { color: '#FFFFFF', fontSize: 17 },
  hintBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  hintText: { color: colors.muted, fontSize: 12 },
  filterOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    ...shadow,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EA',
    alignSelf: 'center',
    marginBottom: 12,
  },
  filterSheetTitle: {
    fontSize: 16,
    color: '#1D1B20',
    marginBottom: 10,
    fontFamily: font.bold,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  categoryOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  categoryDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#1D1B20',
    fontFamily: font.regular,
  },
  categoryOptionTextActive: {
    color: '#4A6CF7',
    fontFamily: font.bold,
  },
});