import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { t, toMM } from '../i18n';
import { colors, radius } from '../theme';
import AppText from '../components/AppText';

const SUPPORTED_TYPES = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;
const DUPLICATE_WINDOW_MS = 1500;

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (value: string, format: string, keepOpen: boolean) => void;
};

export default function ScannerModal({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [singleDone, setSingleDone] = useState(false);
  const [multiScan, setMultiScan] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const lastScan = useRef<{ data: string; time: number } | null>(null);

  useEffect(() => {
    if (visible) {
      setSingleDone(false);
      setScanCount(0);
      lastScan.current = null;
      requestPermission();
    }
  }, [visible]);

  const handleScan = (result: BarcodeScanningResult) => {
    const now = Date.now();
    if (lastScan.current && lastScan.current.data === result.data && now - lastScan.current.time < DUPLICATE_WINDOW_MS) {
      return;
    }
    lastScan.current = { data: result.data, time: now };

    if (multiScan) {
      setScanCount((count) => count + 1);
      onScanned(result.data, result.type, true);
    } else {
      setSingleDone(true);
      onScanned(result.data, result.type, false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <AppText bold style={styles.title}>{t.scanner.title}</AppText>

        <View style={styles.toggleRow}>
          <AppText style={styles.toggleLabel}>{t.scanner.multiScan}</AppText>
          <Switch
            value={multiScan}
            onValueChange={setMultiScan}
            trackColor={{ false: '#FFFFFF44', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {permission?.granted ? (
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: [...SUPPORTED_TYPES] }}
            onBarcodeScanned={!multiScan && singleDone ? undefined : handleScan}
          >
            <View style={styles.frame} />
            {multiScan && scanCount > 0 ? (
              <View style={styles.countBadge}>
                <AppText bold style={styles.countText}>{t.scanner.scanned} {toMM(scanCount)} {t.sell.piece}</AppText>
              </View>
            ) : null}
          </CameraView>
        ) : (
          <View style={styles.permission}>
            <AppText bold style={styles.permissionText}>{t.scanner.needPermission}</AppText>
            <Pressable accessibilityRole="button" onPress={requestPermission} style={styles.allowBtn}>
              <AppText bold style={styles.allowText}>{t.scanner.allow}</AppText>
            </Pressable>
          </View>
        )}

        <AppText style={styles.hint}>{t.scanner.supportedHint}</AppText>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
          <AppText bold style={styles.closeText}>{t.scanner.close}</AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.header, padding: 20, paddingTop: 60 },
  title: { color: '#fff', fontSize: 22, marginBottom: 12, textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.headerSoft, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14,
  },
  toggleLabel: { color: '#fff', fontSize: 14 },
  camera: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 230, height: 170, borderWidth: 3, borderColor: colors.accent, borderRadius: radius.lg },
  countBadge: {
    position: 'absolute', top: 14,
    backgroundColor: colors.success, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  countText: { color: '#fff', fontSize: 14 },
  permission: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.headerSoft, borderRadius: radius.lg, padding: 24, gap: 16,
  },
  permissionText: { color: '#fff', fontSize: 15, textAlign: 'center' },
  allowBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 22, paddingVertical: 12 },
  allowText: { color: '#fff', fontSize: 15 },
  hint: { color: '#BFE3DA', fontSize: 11, textAlign: 'center', marginTop: 12 },
  closeBtn: {
    marginTop: 10, borderWidth: 1, borderColor: '#FFFFFF55',
    borderRadius: radius.md, paddingVertical: 13, alignItems: 'center',
  },
  closeText: { color: '#fff', fontSize: 15 },
});
