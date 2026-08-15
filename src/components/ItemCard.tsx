import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ClothingItem } from '../db';
import { formatKyat, toMM } from '../i18n';
import { avatarPalette, colors, font, radius, shadow } from '../theme';
import AppText from './AppText';

type Props = {
  item: ClothingItem;
  quantity: number;
  onChangeQty: (item: ClothingItem, qty: number) => void;
};

export default function ItemCard({ item, quantity, onChangeQty }: Props) {
  const color = item.colorValue || avatarPalette[item.id % avatarPalette.length];
  const stock = item.stock ?? 0;
  const lowStock = stock > 0 && stock <= 3;
  const outOfStock = stock <= 0;

  const handleSell = () => {
    if (outOfStock) return;
    if (quantity >= stock) return;
    onChangeQty(item, quantity + 1);
  };

  return (
    <Pressable
      onPress={handleSell}
      disabled={outOfStock}
      style={({ pressed }) => [
        styles.card,
        pressed && !outOfStock && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <AppText bold style={styles.avatarText}>{item.name.trim().charAt(0)}</AppText>
        </View>
        <View style={styles.stockWrap}>
          <AppText style={styles.stockLabel}>{t_stock}</AppText>
          <AppText
            bold
            style={[
              styles.stockValue,
              lowStock && styles.stockValueLow,
              outOfStock && styles.stockValueOut,
            ]}
          >
            {toMM(stock)}
          </AppText>
        </View>
      </View>
      <AppText bold numberOfLines={2} style={styles.name}>
        {item.name}
      </AppText>
      <View style={styles.bottomRow}>
        <View style={styles.sizeChip}>
          <AppText style={styles.sizeText}>{item.size}</AppText>
        </View>
        <AppText bold style={styles.price}>
          {formatKyat(item.price)}
        </AppText>
      </View>
      {quantity > 0 ? (
        <View style={styles.qtyLine}>
          <AppText style={styles.qtyLabel}>{t_qty}</AppText>
          <AppText bold style={styles.qtyValue}>× {toMM(quantity)}</AppText>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={handleSell}
          disabled={outOfStock}
          style={({ pressed }) => [
            styles.sellBtn,
            outOfStock && styles.sellBtnDisabled,
            pressed && !outOfStock && styles.sellBtnPressed,
          ]}
        >
          <AppText bold style={styles.sellText}>
            {outOfStock ? 'ကုန်သွားပါပြီ' : 'ရောင်းမည်'}
          </AppText>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
    minHeight: 155,
    ...shadow,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16 },
  stockWrap: {
    alignItems: 'flex-end',
  },
  stockLabel: {
    fontSize: 10,
    color: colors.muted,
    fontFamily: font.regular,
  },
  stockValue: {
    fontSize: 14,
    color: colors.header,
    fontFamily: font.bold,
    marginTop: 2,
  },
  stockValueLow: { color: '#F59E0B' },
  stockValueOut: { color: colors.danger },
  name: {
    fontSize: 14,
    lineHeight: 18,
    minHeight: 36,
    color: colors.text,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sizeChip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sizeText: { color: colors.muted, fontSize: 11 },
  price: { color: colors.header, fontSize: 13 },
  qtyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qtyLabel: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: font.regular,
  },
  qtyValue: {
    fontSize: 14,
    color: '#4A6CF7',
    fontFamily: font.bold,
  },
  sellBtn: {
    marginTop: 10,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#4A6CF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellBtnDisabled: { backgroundColor: '#D1D5DB' },
  sellBtnPressed: { opacity: 0.85 },
  sellText: { color: '#FFFFFF', fontSize: 12, fontFamily: font.bold },
});

const t_stock = 'စတော့';
const t_qty = 'အရေအတွက်';
