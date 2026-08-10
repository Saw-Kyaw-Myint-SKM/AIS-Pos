import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import type { ClothingItem } from '../db';
import { formatKyat, t, toMM } from '../i18n';
import { colors, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import ItemCard from '../components/ItemCard';
import {
  ChevronDownIcon,
  MenuIcon,
  ScanIcon,
  SearchIcon,
} from '../components/ServiceIcon';

type Props = {
  items: ClothingItem[];
  cartCount: number;
  cartTotal: number;
  onAdd: (item: ClothingItem) => void;
  onOpenCart: () => void;
  onScan: () => void;
  onBack: () => void;
};

export default function SellScreen({
  items,
  cartCount,
  cartTotal,
  onAdd,
  onOpenCart,
  onScan,
  onBack,
}: Props) {
  const [query, setQuery] = useState('');
  const [customPrice, setCustomPrice] = useState(false);

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
          <MenuIcon size={26} color="#FFFFFF" />
        </Pressable>
        <AppText style={styles.title}>{t.sell.brand}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="scan"
          onPress={onScan}
          style={styles.iconBtn}
        >
          <ScanIcon size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.actionBar}>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenCart}
          style={({ pressed }) => [styles.ticketPill, pressed && styles.pressed]}
        >
          <AppText bold style={styles.ticketText}>{t.sell.ticket}</AppText>
          <View style={styles.ticketBadge}>
            <AppText bold style={styles.ticketBadgeText}>{toMM(cartCount)}</AppText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenCart}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
        >
          <AppText bold style={styles.saveText}>{t.sell.save}</AppText>
        </Pressable>
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

      <View style={styles.toggleRow}>
        <Switch
          value={customPrice}
          onValueChange={setCustomPrice}
          trackColor={{ false: '#D1D5DB', true: colors.accentBlue }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D1D5DB"
        />
        <AppText style={styles.toggleLabel}>{t.sell.customPrice}</AppText>
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
        renderItem={({ item }) => <ItemCard item={item} onAdd={onAdd} />}
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
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 58,
    backgroundColor: colors.accentBlue,
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
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  ticketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  pressed: { opacity: 0.9 },
  ticketText: { color: colors.text, fontSize: 14 },
  ticketBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  ticketBadgeText: { color: '#FFFFFF', fontSize: 12, lineHeight: 14 },
  saveBtn: {
    backgroundColor: colors.accentBlue,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  saveBtnPressed: { opacity: 0.92 },
  saveText: { color: '#FFFFFF', fontSize: 14 },
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  toggleLabel: {
    color: colors.banner,
    fontSize: 14,
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