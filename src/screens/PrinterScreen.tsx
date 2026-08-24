import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { checkThermalPrinterConnection, paperWidthToPx, printImageToThermal } from '../thermalPrint';
import { font } from '../theme';

type PrinterDraft = {
  target: string;
  deviceName: string;
  paperWidth: PaperWidth;
  autoCut: boolean;
};

type Props = {
  onBack: () => void;
  printerMode: PrinterMode;
  printerTarget: string;
  printerDeviceName: string;
  paperWidth: PaperWidth;
  autoCut: boolean;
  shopName: string;
  onSaveSettings: (settings: PrinterDraft) => Promise<void>;
  onToast: (message: string) => void;
};

async function requestPrinterDiscoveryPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const androidVersion = Number(Platform.Version);
  const permissions = androidVersion >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [androidVersion >= 29
      ? PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      : PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

export default function PrinterScreen({
  onBack,
  printerMode,
  printerTarget,
  printerDeviceName,
  paperWidth,
  autoCut,
  shopName,
  onSaveSettings,
  onToast,
}: Props) {
  const insets = useSafeAreaInsets();
  const { printers, isDiscovering, printerError, start, stop } = usePrintersDiscovery();
  const [draft, setDraft] = useState<PrinterDraft>({
    target: printerTarget,
    deviceName: printerDeviceName,
    paperWidth,
    autoCut,
  });
  const [saving, setSaving] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'failed'>('idle');
  const testRef = useRef<View>(null);

  const savedSettings: PrinterDraft = {
    target: printerTarget,
    deviceName: printerDeviceName,
    paperWidth,
    autoCut,
  };
  const isDirty = draft.target !== savedSettings.target
    || draft.deviceName !== savedSettings.deviceName
    || draft.paperWidth !== savedSettings.paperWidth
    || draft.autoCut !== savedSettings.autoCut;

  const startDiscovery = async () => {
    const granted = await requestPrinterDiscoveryPermissions();
    if (!granted) {
      onToast(t.printer.permissionRequired);
      return;
    }
    start({
      timeout: 8000,
      filterOption: {
        deviceModel: DiscoveryFilterOption.MODEL_ALL,
        epsonFilter: DiscoveryFilterOption.FILTER_NONE,
        bondedDevices: DiscoveryFilterOption.FALSE,
        portType: DiscoveryFilterOption.PORTTYPE_BLUETOOTH,
      },
    });
  };

  useEffect(() => {
    setDraft({ target: printerTarget, deviceName: printerDeviceName, paperWidth, autoCut });
  }, [printerTarget, printerDeviceName, paperWidth, autoCut]);

  useEffect(() => {
    void startDiscovery();
    return () => { void stop(); };
    // Discovery starts once when the settings screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = async (device: DeviceInfo) => {
    const nextDraft = { ...draft, target: device.target, deviceName: device.deviceName };
    setDraft(nextDraft);
    setConnectionStatus('checking');
    onToast(t.printer.connectionChecking);
    try {
      await checkThermalPrinterConnection({
        target: nextDraft.target,
        deviceName: nextDraft.deviceName,
        paperWidth: nextDraft.paperWidth,
        mode: 'epson',
        autoCut: nextDraft.autoCut,
      });
      setConnectionStatus('connected');
      onToast(t.printer.connectionSuccess);
    } catch {
      setConnectionStatus('failed');
      onToast(t.printer.connectionFailed);
    }
  };

  const saveDraft = async (afterSave?: () => void) => {
    if (!draft.target || saving) {
      if (!draft.target) onToast(t.printer.notSelected);
      return;
    }
    setSaving(true);
    try {
      await onSaveSettings(draft);
      onToast(t.printer.settingsSaved);
      afterSave?.();
    } catch {
      onToast(t.printer.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (!isDirty) {
      onBack();
      return;
    }
    Alert.alert(t.printer.unsavedTitle, t.printer.unsavedBody, [
      { text: t.printer.discard, style: 'destructive', onPress: onBack },
      { text: t.printer.saveSettings, onPress: () => { void saveDraft(onBack); } },
    ]);
  };

  const handleTestPrint = async () => {
    if (!printerTarget || isDirty || testPrinting) return;
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
      onToast(t.printer.printed);
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

  const saveDisabled = !draft.target || !isDirty || saving;
  const testDisabled = !printerTarget || isDirty || saving || testPrinting;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.items.back} onPress={handleBack} style={styles.backBtn}><BackArrowIcon size={26} color="#FFFFFF" /></Pressable>
        <AppText bold style={styles.title}>{t.printer.title}</AppText><View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 116 }]} showsVerticalScrollIndicator={false}>
        <AppText style={styles.sectionLabel}>{t.printer.currentPrinter}</AppText>
        <View style={styles.group}><View style={styles.currentCard}>
          <View style={[styles.iconBox, { backgroundColor: '#EBF1FF' }]}><PrinterIcon size={24} color="#3B82F6" /></View>
          <View style={styles.textWrap}><AppText bold style={styles.rowLabel}>{draft.target ? draft.deviceName : t.printer.none}</AppText><AppText style={styles.rowHint}>{draft.target || t.printer.selectHint}</AppText></View>
        </View></View>
        {connectionStatus !== 'idle' ? <View style={[styles.connectionCard, connectionStatus === 'failed' && styles.connectionFailed]}>
          {connectionStatus === 'checking' ? <ActivityIndicator size="small" color="#3B3F76" /> : <View style={[styles.connectionDot, connectionStatus === 'failed' ? styles.connectionDotFailed : styles.connectionDotSuccess]} />}
          <View style={styles.textWrap}><AppText bold style={styles.rowLabel}>{t.printer.connectionStatus}</AppText><AppText style={[styles.rowHint, connectionStatus === 'failed' && styles.connectionFailedText]}>{connectionStatus === 'checking' ? t.printer.connectionChecking : connectionStatus === 'failed' ? t.printer.connectionFailed : t.printer.connectionSuccess}</AppText></View>
        </View> : null}

        <AppText style={styles.sectionLabel}>{t.printer.selectHint}</AppText>
        <Pressable accessibilityRole="button" onPress={() => { void startDiscovery(); }} disabled={isDiscovering} style={({ pressed }) => [styles.searchBtn, (pressed || isDiscovering) && { opacity: 0.8 }]}>
          {isDiscovering ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ScanIcon size={18} color="#FFFFFF" />}
          <AppText style={styles.searchText}>{isDiscovering ? t.printer.searching : t.printer.searchAgain}</AppText>
        </Pressable>
        <View style={styles.group}>
          {printerError ? <View style={styles.empty}><AppText bold style={styles.errorText}>{t.printer.discoveryError}</AppText></View> : printers.length === 0 && !isDiscovering ? <View style={styles.empty}><AppText bold style={styles.emptyTitle}>{t.printer.notFound}</AppText><AppText style={styles.emptyHint}>{t.printer.notFoundHint}</AppText></View> : printers.map((device, index) => <View key={`${device.target}-${index}`}>{renderRow('#E7F8F0', '#10B981', device.deviceName || device.target, device.target, () => { void handleSelect(device); }, draft.target === device.target)}{index < printers.length - 1 ? <View style={styles.divider} /> : null}</View>)}
        </View>

        <AppText style={styles.sectionLabel}>{t.printer.paperSize}</AppText>
        <View style={styles.group}>{renderRow('#FFF3E6', '#E8862E', t.printer.mm58, '384 dots', () => setDraft((current) => ({ ...current, paperWidth: '58' })), draft.paperWidth === '58')}<View style={styles.divider} />{renderRow('#FFF3E6', '#E8862E', t.printer.mm80, '576 dots', () => setDraft((current) => ({ ...current, paperWidth: '80' })), draft.paperWidth === '80')}</View>
        <AppText style={styles.sectionLabel}>{t.printer.autoCut}</AppText>
        <View style={styles.group}>{renderRow('#FFF3E6', '#E8862E', draft.autoCut ? t.printer.enabled : t.printer.disabled, t.printer.autoCutHint, () => setDraft((current) => ({ ...current, autoCut: !current.autoCut })), draft.autoCut)}</View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable accessibilityRole="button" onPress={() => { void saveDraft(); }} disabled={saveDisabled} style={({ pressed }) => [styles.saveBtn, (pressed || saveDisabled) && styles.buttonDisabled]}>
          {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}<AppText style={styles.actionText}>{t.printer.saveSettings}</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleTestPrint} disabled={testDisabled} style={({ pressed }) => [styles.testBtn, (pressed || testDisabled) && styles.buttonDisabled]}>
          {testPrinting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <PrinterIcon size={18} color="#FFFFFF" />}<AppText style={styles.actionText}>{t.printer.testPrint}</AppText>
        </Pressable>
      </View>
      <View style={styles.hiddenTest}><View ref={testRef} collapsable={false} style={[styles.testReceipt, { width: paperWidthToPx(paperWidth) }]}><AppText bold style={styles.testShop}>{shopName}</AppText><AppText style={styles.testLine}>{t.printer.testPrint}</AppText><AppText style={styles.testMeta}>{formatDateTimeMM(new Date().toISOString())}</AppText></View></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { backgroundColor: '#3B3F76', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, gap: 10 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#fff', fontSize: 20, textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { color: '#8A90A6', fontSize: 12, fontFamily: font.bold, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 18, marginHorizontal: 4 },
  group: { backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', shadowColor: '#22302B', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  connectionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9F5', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginTop: 10 },
  connectionFailed: { backgroundColor: '#FFF1F0' }, connectionDot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 18 }, connectionDotSuccess: { backgroundColor: '#10B981' }, connectionDotFailed: { backgroundColor: '#D9534F' }, connectionFailedText: { color: '#D9534F' },
  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }, cardActive: { backgroundColor: '#F0F6FF' }, currentCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 }, pressed: { opacity: 0.85 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, textWrap: { flex: 1, marginLeft: 14, marginRight: 8 }, rowLabel: { color: '#1F2330', fontSize: 15, fontFamily: font.bold }, rowHint: { color: '#8A90A6', fontSize: 12, fontFamily: font.regular, marginTop: 3 }, check: { color: '#3B3F76', fontSize: 18 }, divider: { height: 1, backgroundColor: '#F0F0F4', marginLeft: 76 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B3F76', borderRadius: 14, paddingVertical: 13, marginBottom: 12 }, searchText: { color: '#FFFFFF', fontSize: 14, fontFamily: font.bold }, empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 }, emptyTitle: { color: '#1F2330', fontSize: 15, fontFamily: font.bold }, emptyHint: { color: '#8A90A6', fontSize: 12, fontFamily: font.regular, marginTop: 6, textAlign: 'center' }, errorText: { color: '#D9534F', fontSize: 12, fontFamily: font.regular, marginTop: 8, marginHorizontal: 4 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8E9F0' },
  saveBtn: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B3F76', borderRadius: 14 },
  testBtn: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 14 },
  buttonDisabled: { opacity: 0.48 }, actionText: { color: '#FFFFFF', fontSize: 14, fontFamily: font.bold },
  hiddenTest: { position: 'absolute', left: -9999, top: 0 }, testReceipt: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 20 }, testShop: { textAlign: 'center', fontSize: 20, color: '#000' }, testLine: { textAlign: 'center', fontSize: 14, color: '#000', marginTop: 6 }, testMeta: { textAlign: 'center', fontSize: 12, color: '#000', marginTop: 4 },
});
