import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DiscoveryFilterOption,
  usePrintersDiscovery,
  type DeviceInfo,
} from 'react-native-esc-pos-printer';
import AppText from '../components/AppText';
import { BackArrowIcon, PrinterIcon, ScanIcon } from '../components/ServiceIcon';
import type { PaperWidth, PrinterMode } from '../db';
import { formatDateTimeMM, t } from '../i18n';
import { paperWidthToPx, printImageToThermal } from '../thermalPrint';
import { font } from '../theme';

type Props = {
  onBack: () => void;
  printerMode: PrinterMode;
  printerTarget: string;
  printerDeviceName: string;
  paperWidth: PaperWidth;
  autoCut: boolean;
  shopName: string;
  onSelectPrinter: (target: string, deviceName: string) => Promise<void>;
  onSetPrinterMode: (mode: PrinterMode) => Promise<void>;
  onSetPaperWidth: (width: PaperWidth) => Promise<void>;
  onSetAutoCut: (enabled: boolean) => Promise<void>;
  onToast: (message: string) => void;
};

export default function PrinterScreen({
  onBack,
  printerMode,
  printerTarget,
  printerDeviceName,
  paperWidth,
  autoCut,
  shopName,
  onSelectPrinter,
  onSetPrinterMode,
  onSetPaperWidth,
  onSetAutoCut,
  onToast,
}: Props) {
  const insets = useSafeAreaInsets();
  const { printers, isDiscovering, printerError, start, stop } = usePrintersDiscovery();
  const [testPrinting, setTestPrinting] = useState(false);
  const testRef = useRef<View>(null);
  const isMock = printerMode === 'mock';

  const startDiscovery = () => {
    if (isMock) return;
    start({
      timeout: 8000,
      filterOption: {
        deviceModel: DiscoveryFilterOption.MODEL_ALL,
        bondedDevices: DiscoveryFilterOption.TRUE,
        portType: DiscoveryFilterOption.PORTTYPE_BLUETOOTH,
      },
    });
  };

  useEffect(() => {
    startDiscovery();
    return () => { stop(); };
    // Discovery should restart only when the saved mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printerMode]);

  const handleMode = async (mode: PrinterMode) => {
    await onSetPrinterMode(mode);
    if (mode === 'epson') startDiscovery();
    else await stop();
  };

  const handleSelect = async (device: DeviceInfo) => {
    await onSelectPrinter(device.target, device.deviceName);
    onToast(t.printer.selected);
  };

  const handleTestPrint = async () => {
    if ((!isMock && !printerTarget) || testPrinting) return;
    setTestPrinting(true);
    try {
      const uri = await captureRef(testRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await printImageToThermal(uri, {
        target: printerTarget,
        deviceName: printerDeviceName,
        paperWidth,
        mode: printerMode,
        autoCut,
      });
      onToast(isMock ? t.printer.mockPrinted : t.printer.printed);
    } catch {
      onToast(t.printer.error);
    } finally {
      setTestPrinting(false);
    }
  };

  const renderRow = (
    iconBg: string,
    iconColor: string,
    label: string,
    hint: string,
    onPress: () => void,
    active?: boolean,
  ) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}><ScanIcon size={22} color={iconColor} /></View>
      <View style={styles.textWrap}><AppText bold style={styles.rowLabel}>{label}</AppText><AppText style={styles.rowHint}>{hint}</AppText></View>
      {active ? <AppText bold style={styles.check}>✓</AppText> : null}
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.items.back} onPress={onBack} style={styles.backBtn}><BackArrowIcon size={26} color="#FFFFFF" /></Pressable>
        <AppText bold style={styles.title}>{t.printer.title}</AppText><View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <AppText style={styles.sectionLabel}>{t.printer.mode}</AppText>
        <View style={styles.group}>
          {renderRow('#EBF1FF', '#3B82F6', t.printer.realMode, t.printer.realModeHint, () => handleMode('epson'), !isMock)}
          <View style={styles.divider} />
          {renderRow('#E7F8F0', '#10B981', t.printer.mockMode, t.printer.mockModeHint, () => handleMode('mock'), isMock)}
        </View>
        <AppText style={styles.compatibility}>{t.printer.compatibilityHint}</AppText>

        <AppText style={styles.sectionLabel}>{t.printer.currentPrinter}</AppText>
        <View style={styles.group}><View style={styles.currentCard}>
          <View style={[styles.iconBox, { backgroundColor: '#EBF1FF' }]}><PrinterIcon size={24} color="#3B82F6" /></View>
          <View style={styles.textWrap}><AppText bold style={styles.rowLabel}>{isMock ? t.printer.mockSelected : (printerTarget ? printerDeviceName : t.printer.none)}</AppText><AppText style={styles.rowHint}>{isMock ? t.printer.mockModeHint : (printerTarget || t.printer.selectHint)}</AppText></View>
        </View></View>

        {!isMock ? <>
          <AppText style={styles.sectionLabel}>{t.printer.selectHint}</AppText>
          <Pressable accessibilityRole="button" onPress={startDiscovery} disabled={isDiscovering} style={({ pressed }) => [styles.searchBtn, (pressed || isDiscovering) && { opacity: 0.8 }]}>
            {isDiscovering ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ScanIcon size={18} color="#FFFFFF" />}
            <AppText style={styles.searchText}>{isDiscovering ? t.printer.searching : t.printer.searchAgain}</AppText>
          </Pressable>
          <View style={styles.group}>
            {printers.length === 0 && !isDiscovering ? <View style={styles.empty}><AppText bold style={styles.emptyTitle}>{t.printer.notFound}</AppText><AppText style={styles.emptyHint}>{t.printer.notFoundHint}</AppText></View> : printers.map((device, index) => <View key={`${device.target}-${index}`}>{renderRow('#E7F8F0', '#10B981', device.deviceName || device.target, device.target, () => handleSelect(device), printerTarget === device.target)}{index < printers.length - 1 ? <View style={styles.divider} /> : null}</View>)}
          </View>
          {printerError ? <AppText style={styles.errorText}>{t.printer.discoveryError}</AppText> : null}
        </> : null}

        <AppText style={styles.sectionLabel}>{t.printer.paperSize}</AppText>
        <View style={styles.group}>{renderRow('#FFF3E6', '#E8862E', t.printer.mm58, '384 dots', () => onSetPaperWidth('58'), paperWidth === '58')}<View style={styles.divider} />{renderRow('#FFF3E6', '#E8862E', t.printer.mm80, '576 dots', () => onSetPaperWidth('80'), paperWidth === '80')}</View>
        <AppText style={styles.sectionLabel}>{t.printer.autoCut}</AppText>
        <View style={styles.group}>{renderRow('#FFF3E6', '#E8862E', autoCut ? t.printer.enabled : t.printer.disabled, t.printer.autoCutHint, () => onSetAutoCut(!autoCut), autoCut)}</View>
        <Pressable accessibilityRole="button" onPress={handleTestPrint} disabled={(!isMock && !printerTarget) || testPrinting} style={({ pressed }) => [styles.testBtn, ((!isMock && !printerTarget) || pressed || testPrinting) && { opacity: 0.6 }]}>
          {testPrinting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <PrinterIcon size={18} color="#FFFFFF" />}<AppText style={styles.testText}>{t.printer.testPrint}</AppText>
        </Pressable>
      </ScrollView>
      <View style={styles.hiddenTest}><View ref={testRef} collapsable={false} style={[styles.testReceipt, { width: paperWidthToPx(paperWidth) }]}><AppText bold style={styles.testShop}>{shopName}</AppText><AppText style={styles.testLine}>{t.printer.testPrint}</AppText><AppText style={styles.testMeta}>{formatDateTimeMM(new Date().toISOString())}</AppText></View></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' }, header: { backgroundColor: '#4A6CF7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, gap: 10 }, backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, color: '#fff', fontSize: 20, textAlign: 'center' }, scroll: { paddingHorizontal: 20, paddingTop: 20 }, sectionLabel: { color: '#8A90A6', fontSize: 12, fontFamily: font.bold, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 18, marginHorizontal: 4 }, group: { backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', shadowColor: '#22302B', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }, cardActive: { backgroundColor: '#F0F6FF' }, currentCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 }, pressed: { opacity: 0.85 }, iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, textWrap: { flex: 1, marginLeft: 14, marginRight: 8 }, rowLabel: { color: '#1F2330', fontSize: 15, fontFamily: font.bold }, rowHint: { color: '#8A90A6', fontSize: 12, fontFamily: font.regular, marginTop: 3 }, check: { color: '#4A6CF7', fontSize: 18 }, divider: { height: 1, backgroundColor: '#F0F0F4', marginLeft: 76 }, searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4A6CF7', borderRadius: 14, paddingVertical: 13, marginBottom: 12 }, searchText: { color: '#FFFFFF', fontSize: 14, fontFamily: font.bold }, empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 }, emptyTitle: { color: '#1F2330', fontSize: 15, fontFamily: font.bold }, emptyHint: { color: '#8A90A6', fontSize: 12, fontFamily: font.regular, marginTop: 6, textAlign: 'center' }, errorText: { color: '#D9534F', fontSize: 12, fontFamily: font.regular, marginTop: 8, marginHorizontal: 4 }, compatibility: { color: '#8A90A6', fontSize: 12, marginHorizontal: 4, marginTop: 8 }, testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 15, marginTop: 24 }, testText: { color: '#FFFFFF', fontSize: 15, fontFamily: font.bold }, hiddenTest: { position: 'absolute', left: -9999, top: 0 }, testReceipt: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 20 }, testShop: { textAlign: 'center', fontSize: 20, color: '#000' }, testLine: { textAlign: 'center', fontSize: 14, color: '#000', marginTop: 6 }, testMeta: { textAlign: 'center', fontSize: 12, color: '#000', marginTop: 4 },
});
