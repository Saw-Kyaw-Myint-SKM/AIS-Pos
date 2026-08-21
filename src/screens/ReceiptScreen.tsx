import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getSale, getSaleItems, type PaperWidth } from '../db';
import { t } from '../i18n';
import { exportReceiptPdf } from '../receiptHtml';
import { colors, radius } from '../theme';
import AppText from '../components/AppText';
import PrintReceiptModal from '../components/PrintReceiptModal';
import Receipt from '../components/Receipt';
import { PrinterIcon } from '../components/ServiceIcon';

type Props = {
  saleId: number;
  shopName: string;
  paperWidth: PaperWidth;
  onSelectPrinter: () => void;
  onNewSale: () => void;
  onViewHistory: () => void;
  onToast: (message: string) => void;
};

export default function ReceiptScreen({
  saleId,
  shopName,
  paperWidth,
  onSelectPrinter,
  onNewSale,
  onViewHistory,
  onToast,
}: Props) {
  const db = useSQLiteContext();
  const [exporting, setExporting] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const [sale, items] = await Promise.all([getSale(db, saleId), getSaleItems(db, saleId)]);
      if (!sale) return;
      await exportReceiptPdf(sale, items, shopName);
    } catch {
      // best effort — sharing may be dismissed or unavailable
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    setPrintOpen(true);
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
          onPress={handlePrint}
          style={({ pressed }) => [styles.printBtn, pressed && { opacity: 0.8 }]}
        >
          <PrinterIcon size={16} color="#FFFFFF" />
          <AppText bold style={styles.printText}>{t.printer.print}</AppText>
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

      <PrintReceiptModal
        visible={printOpen}
        saleId={saleId}
        shopName={shopName}
        paperWidth={paperWidth}
        onClose={() => setPrintOpen(false)}
        onPrinted={() => onToast(t.printer.mockPrinted)}
      />
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
  printBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.header, borderRadius: radius.md, paddingVertical: 9,
  },
  printText: { color: '#fff', fontSize: 13 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.header, borderRadius: radius.md, paddingVertical: 9,
  },
  outlineText: { color: colors.header, fontSize: 13 },
  secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 9, alignItems: 'center' },
  secondaryText: { color: colors.header, fontSize: 13 },
});
