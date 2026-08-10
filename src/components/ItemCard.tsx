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
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <AppText bold style={styles.avatarText}>{item.name.trim().charAt(0)}</AppText>
        </View>
        <View style={styles.addBtn}>
          <AppText bold style={styles.addText}>+</AppText>
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
    minHeight: 127,
    ...shadow,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
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
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontSize: 16, lineHeight: 18 },
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
});