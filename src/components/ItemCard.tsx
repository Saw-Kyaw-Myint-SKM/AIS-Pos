import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ClothingItem } from '../db';
import { formatKyat, t, toMM } from '../i18n';
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
  const soldOut = stock <= 0 || quantity >= stock;

  const handleSell = () => {
    if (soldOut) return;
    onChangeQty(item, quantity + 1);
  };

  return (
    <Pressable
      onPress={handleSell}
      disabled={soldOut}
      accessibilityState={{ disabled: soldOut }}
      style={({ pressed }) => [
        styles.card,
        soldOut && styles.cardDisabled,
        pressed && !soldOut && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        {item.photoUri ? (
          <Image
            source={{ uri: item.photoUri }}
            style={styles.avatar}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <AppText bold style={styles.avatarText}>{item.name.trim().charAt(0)}</AppText>
          </View>
        )}
        <View style={styles.stockWrap}>
          <AppText style={styles.stockLabel}>{t.sell.stock}</AppText>
          <AppText
            bold
            style={[
              styles.stockValue,
              lowStock && styles.stockValueLow,
              soldOut && styles.stockValueOut,
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
          <AppText style={styles.qtyLabel}>{soldOut ? t.sell.soldOut : t.sell.quantity}</AppText>
          <AppText bold style={styles.qtyValue}>× {toMM(quantity)}</AppText>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={handleSell}
          disabled={soldOut}
          style={({ pressed }) => [
            styles.sellBtn,
            soldOut && styles.sellBtnDisabled,
            pressed && !soldOut && styles.sellBtnPressed,
          ]}
        >
          <AppText bold style={styles.sellText}>
            {soldOut ? t.sell.soldOut : t.sell.add}
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
  cardDisabled: { opacity: 0.68 },
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
    overflow: 'hidden',
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


