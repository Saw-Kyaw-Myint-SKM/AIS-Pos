import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getSale, getSaleItems, type PaperWidth } from '../db';
import { t } from '../i18n';
import { exportReceiptPdf } from '../receiptHtml';
import AppText from '../components/AppText';
import PrintReceiptModal from '../components/PrintReceiptModal';
import Receipt from '../components/Receipt';
import { BackArrowIcon, PrinterIcon } from '../components/ServiceIcon';

type Props = {
  saleId: number;
  shopName: string;
  paperWidth: PaperWidth;
  onSelectPrinter: () => void;
  onBack: () => void;
  onToast: (message: string) => void;
};

export default function SaleDetailScreen({
  saleId,
  shopName,
  paperWidth,
  onSelectPrinter,
  onBack,
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
      // best effort
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    setPrintOpen(true);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.items.back}
          onPress={onBack}
          style={styles.backBtn}
        >
          <BackArrowIcon size={26} color="#FFFFFF" />
        </Pressable>
        <AppText bold style={styles.title}>{t.receipt.title}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.printer.print}
          onPress={handlePrint}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <PrinterIcon size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Receipt saleId={saleId} shopName={shopName} />
        <Pressable
          accessibilityRole="button"
          onPress={handleExport}
          disabled={exporting}
          style={({ pressed }) => [styles.pdfBtn, (pressed || exporting) && { opacity: 0.8 }]}
        >
          <AppText bold style={styles.pdfText}>{exporting ? t.settings.busy : t.receipt.export}</AppText>
        </Pressable>
      </ScrollView>

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
  header: {
    backgroundColor: '#4A6CF7',
    flexDirection: 'row', alignItems: 'center',
    minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, gap: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#fff', fontSize: 18, textAlign: 'center' },
  pdfBtn: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#4A6CF7',
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
  },
  pdfText: { color: '#4A6CF7', fontSize: 14 },
});
