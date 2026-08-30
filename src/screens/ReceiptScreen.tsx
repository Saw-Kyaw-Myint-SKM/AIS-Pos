import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getSale, getSaleItems } from '../db';
import { t } from '../i18n';
import { exportReceiptPdf } from '../receiptHtml';
import { colors, radius } from '../theme';
import AppText from '../components/AppText';
import Receipt from '../components/Receipt';

type Props = {
  saleId: number;
  shopName: string;
  onNewSale: () => void;
  onViewHistory: () => void;
};

export default function ReceiptScreen({
  saleId,
  shopName,
  onNewSale,
  onViewHistory,
}: Props) {
  const db = useSQLiteContext();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const [sale, items] = await Promise.all([getSale(db, saleId), getSaleItems(db, saleId)]);
      if (!sale) return;
      await exportReceiptPdf(sale, items, shopName);
    } catch {
      // Best effort — sharing may be dismissed or unavailable.
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.successBand}>
        <View style={styles.check}><AppText bold style={styles.checkText}>✓</AppText></View>
        <AppText bold style={styles.done}>{t.cart.confirm} ✓</AppText>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Receipt saleId={saleId} shopName={shopName} />
      </ScrollView>
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={onNewSale} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
          <AppText bold style={styles.primaryText}>{t.receipt.newSale}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleExport}
          disabled={exporting}
          style={({ pressed }) => [styles.outlineBtn, (pressed || exporting) && { opacity: 0.8 }]}
        >
          <AppText bold style={styles.outlineText}>{exporting ? t.settings.busy : t.receipt.export}</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onViewHistory} style={styles.secondaryBtn}>
          <AppText style={styles.secondaryText}>{t.receipt.viewHistory}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  successBand: {
    backgroundColor: '#4A6CF7', alignItems: 'center',
    paddingTop: 22, paddingBottom: 18,
  },
  check: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF33',
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  checkText: { color: '#fff', fontSize: 26 },
  done: { color: '#fff', fontSize: 17 },
  scroll: { paddingBottom: 8 },
  footer: { padding: 16, gap: 10, backgroundColor: '#F5F5F5' },
  primaryBtn: { backgroundColor: '#4A6CF7', borderRadius: radius.md, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 14 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.header, borderRadius: radius.md, paddingVertical: 9,
  },
  outlineText: { color: colors.header, fontSize: 13 },
  secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 9, alignItems: 'center' },
  secondaryText: { color: colors.header, fontSize: 13 },
});
