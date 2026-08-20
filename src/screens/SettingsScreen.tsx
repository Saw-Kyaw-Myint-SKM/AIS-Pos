import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import {
  BackArrowIcon,
  ChevronRightIcon,
  CloudIcon,
  DownloadIcon,
  StoreIcon,
  UploadIcon,
} from '../components/ServiceIcon';
import { SHOP_UNLOCK_CODE } from '../db';
import { t } from '../i18n';
import { font } from '../theme';

type Props = {
  onBack: () => void;
  onExport: () => Promise<void>;
  onExportToDownloads: () => Promise<void>;
  onImport: () => void;
  busy?: boolean;
  shopName: string;
  shopUnlocked: boolean;
  onUnlockShopName: () => Promise<void>;
  onSaveShopName: (name: string) => Promise<void>;
};

type OptionRowProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
};

function OptionRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  hint,
  onPress,
  disabled,
}: OptionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon size={24} color={iconColor} />
      </View>
      <View style={styles.textWrap}>
        <AppText bold style={styles.label}>{label}</AppText>
        <AppText style={styles.hint}>{hint}</AppText>
      </View>
      <ChevronRightIcon size={20} color="#C7C7CF" />
    </Pressable>
  );
}

export default function SettingsScreen({
  onBack,
  onExport,
  onExportToDownloads,
  onImport,
  busy,
  shopName,
  shopUnlocked,
  onUnlockShopName,
  onSaveShopName,
}: Props) {
  const insets = useSafeAreaInsets();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  const openShopSetting = () => {
    if (shopUnlocked) {
      setNameInput(shopName);
      setEditOpen(true);
    } else {
      setCode('');
      setCodeError('');
      setUnlockOpen(true);
    }
  };

  const submitUnlock = async () => {
    if (code.trim() === SHOP_UNLOCK_CODE) {
      await onUnlockShopName();
      setUnlockOpen(false);
      setNameInput(shopName);
      setEditOpen(true);
    } else {
      setCodeError(t.settings.wrongCode);
    }
  };

  const submitShopName = async () => {
    if (savingName) return;
    setSavingName(true);
    try {
      await onSaveShopName(nameInput);
      setEditOpen(false);
    } finally {
      setSavingName(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="back"
          onPress={onBack}
          style={styles.backBtn}
        >
          <BackArrowIcon size={26} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerText}>
          <AppText bold style={styles.title}>{t.settings.title}</AppText>
          <AppText style={styles.subtitle}>{t.settings.subtitle}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      {busy ? (
        <View style={styles.busyOverlay} pointerEvents="auto">
          <View style={styles.busyCard}>
            <ActivityIndicator size="large" color="#4A6CF7" />
            <AppText style={styles.busyText}>{t.settings.busy}</AppText>
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.sectionLabel}>{t.settings.shopSection}</AppText>

        <View style={styles.group}>
          <OptionRow
            icon={StoreIcon}
            iconBg="#FFF3E6"
            iconColor="#E8862E"
            label={t.settings.shopName}
            hint={shopUnlocked ? shopName : t.settings.shopLockedHint}
            onPress={openShopSetting}
          />
        </View>

        <AppText style={styles.sectionLabel}>{t.settings.backupSection}</AppText>

        <View style={styles.group}>
          <OptionRow
            icon={CloudIcon}
            iconBg="#EBF1FF"
            iconColor="#3B82F6"
            label={t.settings.saveFile}
            hint={t.settings.saveHint}
            onPress={onExport}
            disabled={busy}
          />
          <View style={styles.divider} />
          <OptionRow
            icon={DownloadIcon}
            iconBg="#E7F8F0"
            iconColor="#10B981"
            label={t.settings.saveToDownloads}
            hint={t.settings.saveToDownloadsHint}
            onPress={onExportToDownloads}
            disabled={busy}
          />
        </View>

        <AppText style={styles.sectionLabel}>{t.settings.restoreSection}</AppText>

        <View style={styles.group}>
          <OptionRow
            icon={UploadIcon}
            iconBg="#F1ECFF"
            iconColor="#8B5CF6"
            label={t.settings.loadFile}
            hint={t.settings.loadHint}
            onPress={onImport}
            disabled={busy}
          />
        </View>

        <AppText style={styles.footerNote}>{t.settings.footerNote}</AppText>
      </ScrollView>

      <Modal
        visible={unlockOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setUnlockOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setUnlockOpen(false)} />
          <View style={styles.modalBox}>
            <AppText bold style={styles.modalTitle}>{t.settings.unlockTitle}</AppText>
            <AppText style={styles.modalBody}>{t.settings.unlockBody}</AppText>
            <TextInput
              style={[styles.modalInput, codeError ? styles.modalInputError : null]}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/[^0-9]/g, ''));
                if (codeError) setCodeError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor="#C7C7CF"
              textAlign="center"
              autoFocus
            />
            {codeError ? <AppText style={styles.modalError}>{codeError}</AppText> : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setUnlockOpen(false)}
                style={({ pressed }) => [styles.modalCancelBtn, pressed && { opacity: 0.7 }]}
              >
                <AppText style={styles.modalCancelText}>{t.settings.cancel}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={submitUnlock}
                style={({ pressed }) => [styles.modalOkBtn, pressed && { opacity: 0.9 }]}
              >
                <AppText bold style={styles.modalOkText}>{t.settings.unlock}</AppText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setEditOpen(false)} />
          <View style={styles.modalBox}>
            <AppText bold style={styles.modalTitle}>{t.settings.shopName}</AppText>
            <AppText style={styles.modalBody}>{t.settings.shopNameHint}</AppText>
            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={t.settings.shopName}
              placeholderTextColor="#C7C7CF"
              autoCapitalize="words"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setEditOpen(false)}
                style={({ pressed }) => [styles.modalCancelBtn, pressed && { opacity: 0.7 }]}
              >
                <AppText style={styles.modalCancelText}>{t.settings.cancel}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={submitShopName}
                disabled={savingName}
                style={({ pressed }) => [styles.modalOkBtn, (pressed || savingName) && { opacity: 0.9 }]}
              >
                <AppText bold style={styles.modalOkText}>{t.settings.save}</AppText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    backgroundColor: '#4A6CF7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontFamily: font.bold },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: font.regular, marginTop: 2 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabel: {
    color: '#8A90A6',
    fontSize: 12,
    fontFamily: font.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 18,
    marginHorizontal: 4,
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#22302B',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  pressed: { backgroundColor: '#F7F8FC' },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, marginLeft: 14, marginRight: 8 },
  label: { color: '#1F2330', fontSize: 15, fontFamily: font.bold },
  hint: { color: '#8A90A6', fontSize: 12, fontFamily: font.regular, marginTop: 3 },
  divider: { height: 1, backgroundColor: '#F0F0F4', marginLeft: 76 },
  footerNote: {
    color: '#A6ACBD',
    fontSize: 11,
    fontFamily: font.regular,
    textAlign: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    lineHeight: 16,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,246,250,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  busyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  busyText: {
    fontFamily: font.regular,
    fontSize: 13,
    color: '#374151',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000088',
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 17, color: '#1F2330', textAlign: 'center', fontFamily: font.bold },
  modalBody: {
    fontSize: 13,
    color: '#8A90A6',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontFamily: font.regular,
  },
  modalInput: {
    alignSelf: 'stretch',
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E2E2EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 6,
    color: '#1F2330',
    fontFamily: font.regular,
  },
  modalInputError: { borderColor: '#D9534F', borderWidth: 1.5 },
  modalError: { color: '#D9534F', fontSize: 12, fontFamily: font.regular, marginTop: 6, alignSelf: 'flex-start' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    alignSelf: 'stretch',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E2EA',
    alignItems: 'center',
  },
  modalCancelText: { color: '#1F2330', fontSize: 15, fontFamily: font.regular },
  modalOkBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#4A6CF7',
    alignItems: 'center',
  },
  modalOkText: { color: '#FFFFFF', fontSize: 15, fontFamily: font.bold },
});
