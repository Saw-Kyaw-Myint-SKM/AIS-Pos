import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { getSale, getSaleItems, type Sale, type SaleItem } from '../db';
import { formatDateTimeMM, formatKyat, t, toMM } from '../i18n';
import { colors, radius, shadow } from '../theme';
import AppText from './AppText';

type Props = { saleId: number };

export default function Receipt({ saleId }: Props) {
  const db = useSQLiteContext();
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [saleRow, itemRows] = await Promise.all([getSale(db, saleId), getSaleItems(db, saleId)]);
      if (alive) { setSale(saleRow ?? null); setItems(itemRows); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [db, saleId]);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.header} size="large" /></View>;
  }
  if (!sale) {
    return <View style={styles.loading}><AppText style={{ color: colors.muted }}>—</AppText></View>;
  }

  return (
    <View style={styles.paper}>
      <AppText bold style={styles.shop}>AISource MM</AppText>
      <AppText style={styles.receiptLabel}>{t.receipt.title}</AppText>
      <AppText style={styles.meta}>{t.receipt.billNo} #{toMM(sale.id)}</AppText>
      <AppText style={styles.meta}>{formatDateTimeMM(sale.createdAt)}</AppText>
      <View style={styles.dash} />
      {items.map((item) => (
        <View key={item.id} style={styles.line}>
          <View style={styles.lineLeft}>
            <AppText bold style={styles.lineName}>{item.name}</AppText>
            <AppText style={styles.lineMeta}>
              {item.size} · {toMM(item.quantity)} × {formatKyat(item.price)}
            </AppText>
          </View>
          <AppText bold style={styles.lineAmount}>{formatKyat(item.price * item.quantity)}</AppText>
        </View>
      ))}
      <View style={styles.dash} />
      <View style={styles.totalRow}>
        <AppText bold style={styles.totalLabel}>{t.receipt.total}</AppText>
        <AppText bold style={styles.totalValue}>{formatKyat(sale.total)}</AppText>
      </View>
      <View style={styles.dash} />
      <AppText style={styles.thanks}>{t.receipt.thanks}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 60, alignItems: 'center' },
  paper: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
    margin: 16,
    ...shadow,
  },
  shop: { textAlign: 'center', fontSize: 20, color: colors.header },
  receiptLabel: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 4 },
  meta: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 2 },
  dash: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.border, marginVertical: 14 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  lineLeft: { flex: 1 },
  lineName: { fontSize: 15 },
  lineMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  lineAmount: { fontSize: 14, color: colors.header },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, color: colors.text },
  totalValue: { fontSize: 20, color: colors.success },
  thanks: { textAlign: 'center', color: colors.muted, fontSize: 13 },
});
