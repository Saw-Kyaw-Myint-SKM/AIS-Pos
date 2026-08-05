import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ClothingItem } from '../db';
import { formatKyat } from '../i18n';
import { avatarPalette, colors, radius, shadow } from '../theme';
import AppText from './AppText';

type Props = {
  item: ClothingItem;
  onAdd: (item: ClothingItem) => void;
};

export default function ItemCard({ item, onAdd }: Props) {
  const color = avatarPalette[item.id % avatarPalette.length];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onAdd(item)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <AppText bold style={styles.avatarText}>{item.name.trim().charAt(0)}</AppText>
      </View>
      <AppText bold numberOfLines={2} style={styles.name}>{item.name}</AppText>
      <View style={styles.sizeChip}><AppText style={styles.sizeText}>{item.size}</AppText></View>
      <View style={styles.bottomRow}>
        <AppText bold style={styles.price}>{formatKyat(item.price)}</AppText>
        <View style={styles.addBtn}><AppText bold style={styles.addText}>+</AppText></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 12,
    minHeight: 158,
    ...shadow,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  avatar: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  avatarText: { color: '#fff', fontSize: 19 },
  name: { fontSize: 15, lineHeight: 22, minHeight: 44 },
  sizeChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8, paddingVertical: 2,
    marginTop: 6,
  },
  sizeText: { color: colors.muted, fontSize: 12 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  price: { color: colors.header, fontSize: 15 },
  addBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addText: { color: '#fff', fontSize: 18, lineHeight: 22 },
});
