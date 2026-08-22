import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { BackArrowIcon, PrinterIcon } from '../components/ServiceIcon';
import type { PaperWidth } from '../db';
import { t } from '../i18n';
import { simulateReceiptPrint } from '../thermalPrint';
import { colors, font } from '../theme';

type Props = {
  onBack: () => void;
  paperWidth: PaperWidth;
  onSetPaperWidth: (width: PaperWidth) => Promise<void>;
  onToast: (message: string) => void;
};

export default function PrinterScreen({
  onBack,
  paperWidth,
  onSetPaperWidth,
  onToast,
}: Props) {
  const insets = useSafeAreaInsets();
  const [testing, setTesting] = useState(false);

  const handleTestPrint = async () => {
    if (testing) return;
    setTesting(true);
    try {
      await simulateReceiptPrint(paperWidth);
      onToast(t.printer.mockPrinted);
    } finally {
      setTesting(false);
    }
  };

  const renderOption = (label: string, hint: string, onPress: () => void, active: boolean) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}
    >
      <View style={styles.iconBox}><PrinterIcon size={22} color="#3B3F76" /></View>
      <View style={styles.textWrap}>
        <AppText bold style={styles.rowLabel}>{label}</AppText>
        <AppText style={styles.rowHint}>{hint}</AppText>
      </View>
      {active ? <AppText bold style={styles.check}>✓</AppText> : null}
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.items.back} onPress={onBack} style={styles.backBtn}>
          <BackArrowIcon size={26} color="#FFFFFF" />
        </Pressable>
        <AppText bold style={styles.title}>{t.printer.title}</AppText>
        <View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        <AppText style={styles.sectionLabel}>{t.printer.mockMode}</AppText>
        <View style={styles.group}>
          <View style={styles.infoCard}>
            <View style={styles.iconBox}><PrinterIcon size={24} color="#3B3F76" /></View>
            <View style={styles.textWrap}>
              <AppText bold style={styles.rowLabel}>{t.printer.mockSelected}</AppText>
              <AppText style={styles.rowHint}>{t.printer.mockModeHint}</AppText>
            </View>
          </View>
        </View>
        <AppText style={styles.compatibility}>{t.printer.compatibilityHint}</AppText>

        <AppText style={styles.sectionLabel}>{t.printer.paperSize}</AppText>
        <View style={styles.group}>
          {renderOption(t.printer.mm58, '384 dots', () => onSetPaperWidth('58'), paperWidth === '58')}
          <View style={styles.divider} />
          {renderOption(t.printer.mm80, '576 dots', () => onSetPaperWidth('80'), paperWidth === '80')}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleTestPrint}
          disabled={testing}
          style={({ pressed }) => [styles.testBtn, (pressed || testing) && { opacity: 0.7 }]}
        >
          {testing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <PrinterIcon size={18} color="#FFFFFF" />}
          <AppText style={styles.testText}>{t.printer.testPrint}</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { backgroundColor: colors.sellBlue, minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 18, textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { color: '#7A8880', fontSize: 12, fontFamily: font.bold, marginTop: 18, marginBottom: 10, marginHorizontal: 4 },
  group: { backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', elevation: 2 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  cardActive: { backgroundColor: '#EEF0FF' },
  pressed: { opacity: 0.85 },
  iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EEF0FF', alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1, marginLeft: 14 },
  rowLabel: { color: '#1F2330', fontSize: 15 },
  rowHint: { color: '#7A8880', fontSize: 12, marginTop: 3 },
  check: { color: '#3B3F76', fontSize: 18 },
  divider: { height: 1, backgroundColor: '#F0F0F4', marginLeft: 76 },
  compatibility: { color: '#7A8880', fontSize: 12, marginHorizontal: 4, marginTop: 8 },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.sellBlue, borderRadius: 16, paddingVertical: 15, marginTop: 24 },
  testText: { color: '#FFFFFF', fontSize: 15, fontFamily: font.bold },
});
