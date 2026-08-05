import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { Sale } from '../db';
import { formatDateTimeMM, formatKyat, t, toMM } from '../i18n';
import { colors, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';

type Props = {
  sales: Sale[];
  todayTotal: number;
  onOpen: (saleId: number) => void;
};

export default function HistoryScreen({ sales, todayTotal, onOpen }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AppText bold style={styles.title}>{t.history.title}</AppText>
      </View>
      <View style={styles.todayCard}>
        <AppText style={styles.todayLabel}>{t.history.todayTotal}</AppText>
        <AppText bold style={styles.todayValue}>{formatKyat(todayTotal)}</AppText>
      </View>
      <FlatList
        data={sales}
        keyExtractor={(sale) => String(sale.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpen(item.id)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.billBadge}><AppText bold style={styles.billText}>#{toMM(item.id)}</AppText></View>
            <View style={styles.info}>
              <AppText style={styles.date}>{formatDateTimeMM(item.createdAt)}</AppText>
              <AppText style={styles.meta}>{toMM(item.itemCount)} {t.sell.piece}</AppText>
            </View>
            <AppText bold style={styles.total}>{formatKyat(item.total)}</AppText>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title={t.history.empty} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.header, paddingHorizontal: 16, paddingVertical: 14 },
  title: { color: '#fff', fontSize: 20 },
  todayCard: {
    backgroundColor: colors.successSoft, marginHorizontal: 16, marginTop: 14,
    borderRadius: radius.lg, padding: 16, alignItems: 'center',
  },
  todayLabel: { color: colors.success, fontSize: 13 },
  todayValue: { color: colors.header, fontSize: 24, marginTop: 4 },
  list: { padding: 16, paddingBottom: 28 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 14, marginBottom: 10, ...shadow,
  },
  billBadge: {
    minWidth: 52, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  billText: { color: colors.header, fontSize: 14 },
  info: { flex: 1 },
  date: { color: colors.text, fontSize: 13 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  total: { color: colors.header, fontSize: 15 },
});
