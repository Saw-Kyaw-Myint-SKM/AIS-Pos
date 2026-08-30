import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getSale, getSaleItems } from '../db';
import { t } from '../i18n';
import { exportReceiptPdf } from '../receiptHtml';
import AppText from '../components/AppText';
import Receipt from '../components/Receipt';
import { BackArrowIcon } from '../components/ServiceIcon';

type Props = {
  saleId: number;
  shopName: string;
  onBack: () => void;
  onEdit: () => void;
  editable?: boolean;
};

export default function SaleDetailScreen({
  saleId,
  shopName,
  onBack,
  onEdit,
  editable = true,
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
        {editable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.saleEdit.edit}
            onPress={onEdit}
            style={({ pressed }) => [styles.headerEditBtn, pressed && { opacity: 0.7 }]}
          >
            <AppText bold style={styles.headerEditText}>{t.saleEdit.edit}</AppText>
          </Pressable>
        ) : <View style={styles.backBtn} />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#4A6CF7',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14, gap: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#fff', fontSize: 18, textAlign: 'center' },
  headerEditBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  headerEditText: { color: '#FFFFFF', fontSize: 12 },
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
