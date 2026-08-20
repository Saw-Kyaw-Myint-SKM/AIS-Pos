import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSale,
  getSaleItems,
  type PaperWidth,
  type PrinterMode,
  type Sale,
  type SaleItem,
} from '../db';
import { t } from '../i18n';
import {
  printImageToThermal,
  ThermalPrintError,
  type ThermalPrintErrorCode,
} from '../thermalPrint';
import { colors, radius } from '../theme';
import AppText from './AppText';
import PrintableReceipt from './PrintableReceipt';
import { BackArrowIcon, PrinterIcon } from './ServiceIcon';

type Props = {
  visible: boolean;
  saleId: number;
  shopName: string;
  paperWidth: PaperWidth;
  printerMode: PrinterMode;
  printerTarget: string;
  printerDeviceName: string;
  autoCut: boolean;
  onClose: () => void;
  onPrinted: () => void;
  onError: (code: ThermalPrintErrorCode) => void;
};

const errorMessage = (code: ThermalPrintErrorCode): string => {
  if (code === 'connect_timeout') return t.printer.connectTimeout;
  if (code === 'offline') return t.printer.offline;
  if (code === 'send_unknown') return t.printer.sendUnknown;
  return t.printer.error;
};

export default function PrintReceiptModal({
  visible,
  saleId,
  shopName,
  paperWidth,
  printerMode,
  printerTarget,
  printerDeviceName,
  autoCut,
  onClose,
  onPrinted,
  onError,
}: Props) {
  const db = useSQLiteContext();
  const printRef = useRef<View>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<ThermalPrintErrorCode | null>(null);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    setPrintError(null);
    (async () => {
      const [saleRow, itemRows] = await Promise.all([getSale(db, saleId), getSaleItems(db, saleId)]);
      if (!alive) return;
      setSale(saleRow ?? null);
      setItems(itemRows);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [db, saleId, visible]);

  const handlePrint = async () => {
    if (!sale || printing) return;
    setPrinting(true);
    setPrintError(null);
    try {
      const uri = await captureRef(printRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await printImageToThermal(uri, {
        target: printerTarget,
        deviceName: printerDeviceName,
        paperWidth,
        mode: printerMode,
        autoCut,
      });
      onPrinted();
      onClose();
    } catch (error) {
      const code = error instanceof ThermalPrintError ? error.code : 'unknown';
      setPrintError(code);
      onError(code);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.printer.close}
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <BackArrowIcon size={26} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <PrinterIcon size={22} color="#FFFFFF" />
            <AppText style={styles.headerTitle}>{t.printer.title}</AppText>
          </View>
          <View style={styles.backBtn} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.sellBlue} />
          </View>
        ) : !sale ? (
          <View style={styles.center}>
            <AppText style={styles.muted}>—</AppText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.preview}>
              <PrintableReceipt
                ref={printRef}
                sale={sale}
                items={items}
                shopName={shopName}
                paperWidth={paperWidth}
              />
            </View>
          </ScrollView>
        )}

        {!loading && sale && (
          <View style={styles.footer}>
            {printError ? (
              <View style={styles.errorBox}>
                <AppText style={styles.errorText}>{errorMessage(printError)}</AppText>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={handlePrint}
              disabled={printing}
              style={({ pressed }) => [styles.printBtn, (pressed || printing) && { opacity: 0.85 }]}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <PrinterIcon size={18} color="#FFFFFF" />
              )}
              <AppText style={styles.printText}>
                {printError ? t.printer.retry : t.printer.printConfirm}
              </AppText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.sellBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: '#FFFFFF', fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted, fontSize: 16 },
  scroll: { alignItems: 'center', padding: 16 },
  preview: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderColor: '#F2B8B5',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
  },
  errorText: { color: '#A83232', fontSize: 13, textAlign: 'center' },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.sellBlue,
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  printText: { color: '#FFFFFF', fontSize: 16 },
});
