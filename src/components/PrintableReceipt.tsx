import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PaperWidth, Sale, SaleItem } from '../db';
import { formatDateTimeMM, formatKyat, t, toMM } from '../i18n';
import { paperWidthToPx } from '../thermalPrint';
import AppText from './AppText';

type Props = {
  sale: Sale;
  items: SaleItem[];
  shopName: string;
  paperWidth: PaperWidth;
};

const PrintableReceipt = forwardRef<View, Props>(
  ({ sale, items, shopName, paperWidth }, ref) => {
    const width = paperWidthToPx(paperWidth);
    return (
      <View ref={ref} collapsable={false} style={[styles.paper, { width }]}>
        <AppText bold style={styles.shop}>{shopName}</AppText>
        <AppText style={styles.label}>{t.receipt.title}</AppText>
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
          <AppText style={styles.totalLabel}>{t.receipt.total}</AppText>
          <AppText bold style={styles.totalValue}>{formatKyat(sale.total)}</AppText>
        </View>
        <View style={styles.dash} />
        <AppText style={styles.thanks}>{t.receipt.thanks}</AppText>
      </View>
    );
  },
);

PrintableReceipt.displayName = 'PrintableReceipt';

export default PrintableReceipt;

const styles = StyleSheet.create({
  paper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  shop: { textAlign: 'center', fontSize: 20, color: '#000' },
  label: { textAlign: 'center', color: '#000', fontSize: 13, marginTop: 4 },
  meta: { textAlign: 'center', color: '#000', fontSize: 12, marginTop: 2 },
  dash: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#000', marginVertical: 10 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  lineLeft: { flex: 1 },
  lineName: { fontSize: 14, color: '#000' },
  lineMeta: { color: '#000', fontSize: 11, marginTop: 2 },
  lineAmount: { fontSize: 13, color: '#000' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: '#000' },
  totalValue: { fontSize: 18, color: '#000' },
  thanks: { textAlign: 'center', color: '#000', fontSize: 12 },
});
