import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import type { ClothingItem } from '../db';
import { formatKyat, t, toMM } from '../i18n';
import { colors, radius } from '../theme';
import AppText from './AppText';
import QtyStepper from './QtyStepper';

export type CartLine = { item: ClothingItem; quantity: number };

type Props = {
  visible: boolean;
  lines: CartLine[];
  total: number;
  onClose: () => void;
  onQuantity: (id: number, delta: number) => void;
  onClear: () => void;
  onConfirm: () => void;
};

export default function CartSheet({ visible, lines, total, onClose, onQuantity, onClear, onConfirm }: Props) {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <AppText bold style={styles.title}>{t.cart.title}</AppText>
          <View style={styles.countChip}><AppText bold style={styles.countText}>{toMM(count)} {t.sell.piece}</AppText></View>
        </View>
        {lines.length === 0 ? (
          <AppText style={styles.empty}>{t.cart.empty}</AppText>
        ) : (
          <FlatList
            data={lines}
            keyExtractor={(line) => String(line.item.id)}
            style={styles.list}
            renderItem={({ item: line }) => (
              <View style={styles.line}>
                <View style={styles.lineInfo}>
                  <AppText bold numberOfLines={1} style={styles.lineName}>{line.item.name}</AppText>
                  <AppText style={styles.lineMeta}>{line.item.size} · {formatKyat(line.item.price)}</AppText>
                  <AppText bold style={styles.lineTotal}>{formatKyat(line.item.price * line.quantity)}</AppText>
                </View>
                <QtyStepper
                  value={line.quantity}
                  onMinus={() => onQuantity(line.item.id, -1)}
                  onPlus={() => onQuantity(line.item.id, 1)}
                />
              </View>
            )}
          />
        )}
        <View style={styles.totalRow}>
          <AppText style={styles.totalLabel}>{t.cart.total}</AppText>
          <AppText bold style={styles.totalValue}>{formatKyat(total)}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={lines.length === 0}
          onPress={onConfirm}
          style={({ pressed }) => [styles.confirmBtn, (lines.length === 0 || pressed) && { opacity: 0.6 }]}
        >
          <AppText bold style={styles.confirmText}>{t.cart.confirm}</AppText>
        </Pressable>
        {lines.length > 0 && (
          <Pressable accessibilityRole="button" onPress={onClear} style={styles.clearBtn}>
            <AppText style={styles.clearText}>{t.cart.clear}</AppText>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066' },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '82%',
  },
  grabber: {
    alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
    backgroundColor: colors.border, marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 21, color: colors.header },
  countChip: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: colors.header, fontSize: 13 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 30 },
  list: { flexGrow: 0 },
  line: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  lineInfo: { flex: 1 },
  lineName: { fontSize: 15 },
  lineMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  lineTotal: { color: colors.header, fontSize: 14, marginTop: 4 },
  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
  },
  totalLabel: { color: colors.muted, fontSize: 15 },
  totalValue: { color: colors.header, fontSize: 24 },
  confirmBtn: {
    backgroundColor: colors.header,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 17 },
  clearBtn: { alignItems: 'center', paddingVertical: 12 },
  clearText: { color: colors.danger, fontSize: 14 },
});
