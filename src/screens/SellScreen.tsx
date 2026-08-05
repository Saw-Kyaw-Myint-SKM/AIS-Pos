import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { ClothingItem } from '../db';
import { formatKyat, t, toMM } from '../i18n';
import { colors, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import ItemCard from '../components/ItemCard';

type Props = {
  items: ClothingItem[];
  cartCount: number;
  cartTotal: number;
  onAdd: (item: ClothingItem) => void;
  onOpenCart: () => void;
  onScan: () => void;
  onBack: () => void;
};

export default function SellScreen({ items, cartCount, cartTotal, onAdd, onOpenCart, onScan, onBack }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(q) || item.size.toLowerCase().includes(q) || item.qrCode.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <AppText bold style={styles.backText}>‹</AppText>
        </Pressable>
        <AppText bold style={styles.title}>{t.sell.title}</AppText>
        <Pressable accessibilityRole="button" onPress={onScan} style={styles.scanBtn}>
          <AppText bold style={styles.scanText}>{t.sell.scan}</AppText>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.sell.search}
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, cartCount > 0 && styles.listWithCart]}
        renderItem={({ item }) => <ItemCard item={item} onAdd={onAdd} />}
        ListEmptyComponent={<EmptyState title={t.sell.emptyTitle} hint={t.sell.emptyHint} />}
      />

      {cartCount > 0 ? (
        <Pressable accessibilityRole="button" onPress={onOpenCart} style={({ pressed }) => [styles.cartBar, pressed && { opacity: 0.9 }]}>
          <View style={styles.cartLeft}>
            <View style={styles.countBadge}><AppText bold style={styles.countText}>{toMM(cartCount)}</AppText></View>
            <AppText bold style={styles.cartLabel}>{t.sell.cart}</AppText>
          </View>
          <AppText bold style={styles.cartTotal}>{formatKyat(cartTotal)} ›</AppText>
        </Pressable>
      ) : (
        <View style={styles.hintBar}><AppText style={styles.hintText}>{t.sell.tapToAdd}</AppText></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.header,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14, gap: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.headerSoft },
  backText: { color: '#fff', fontSize: 26, lineHeight: 30 },
  title: { flex: 1, color: '#fff', fontSize: 20 },
  scanBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  scanText: { color: '#fff', fontSize: 13 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  search: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Pyidaungsu-Regular', fontSize: 14, color: colors.text,
  },
  row: { gap: 12, paddingHorizontal: 16 },
  list: { paddingTop: 10, paddingBottom: 24 },
  listWithCart: { paddingBottom: 96 },
  cartBar: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    backgroundColor: colors.header, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    ...shadow,
  },
  cartLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: {
    minWidth: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  countText: { color: '#fff', fontSize: 14 },
  cartLabel: { color: '#fff', fontSize: 16 },
  cartTotal: { color: '#fff', fontSize: 17 },
  hintBar: { position: 'absolute', left: 16, right: 16, bottom: 16, alignItems: 'center', paddingVertical: 10 },
  hintText: { color: colors.muted, fontSize: 12 },
});
