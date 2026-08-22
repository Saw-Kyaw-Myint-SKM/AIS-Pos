import React, { useMemo, useState } from 'react';
import {
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
import EmptyState from '../components/EmptyState';
import { BackArrowIcon } from '../components/ServiceIcon';
import type { ClothingItem } from '../db';
import { t, toMM } from '../i18n';
import { avatarPalette, colors, font } from '../theme';

type Props = {
  items: ClothingItem[];
  stockAlertLimit: number;
  onSaveLimit: (limit: number) => Promise<void>;
  onBack: () => void;
};

export default function StockAlertScreen({
  items,
  stockAlertLimit,
  onSaveLimit,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [targetError, setTargetError] = useState('');
  const [saving, setSaving] = useState(false);

  const alertItems = useMemo(
    () => items
      .filter((item) => item.stock <= stockAlertLimit)
      .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name)),
    [items, stockAlertLimit],
  );

  const openTargetModal = () => {
    setTargetInput(String(stockAlertLimit));
    setTargetError('');
    setTargetOpen(true);
  };

  const saveTarget = async () => {
    if (!/^\d+$/.test(targetInput)) {
      setTargetError(t.stockAlert.invalidTarget);
      return;
    }
    const target = Number(targetInput);
    if (!Number.isSafeInteger(target) || target < 0) {
      setTargetError(t.stockAlert.invalidTarget);
      return;
    }
    setSaving(true);
    try {
      await onSaveLimit(target);
      setTargetOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.items.back}
          onPress={onBack}
          style={styles.backButton}
        >
          <BackArrowIcon size={26} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerText}>
          <AppText bold style={styles.title}>{t.stockAlert.title}</AppText>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.targetCard}>
          <View style={styles.targetAmountWrap}>
            <AppText bold style={styles.targetAmount}>{toMM(stockAlertLimit)}</AppText>
          </View>
          <View style={styles.targetText}>
            <AppText bold style={styles.targetLabel}>{t.stockAlert.targetLabel}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openTargetModal}
            style={({ pressed }) => [styles.targetButton, pressed && styles.pressed]}
          >
            <AppText bold style={styles.targetButtonText}>{t.stockAlert.targetButton}</AppText>
          </Pressable>
        </View>

        <View style={styles.sectionRow}>
          <AppText bold style={styles.sectionTitle}>{t.stockAlert.title}</AppText>
          <AppText style={styles.countText}>
            {toMM(alertItems.length)} {t.stockAlert.itemCount}
          </AppText>
        </View>

        {alertItems.length ? (
          <View style={styles.list}>
            {alertItems.map((item) => <StockItemCard item={item} key={item.id} />)}
          </View>
        ) : (
          <EmptyState title={t.stockAlert.emptyTitle} hint={t.stockAlert.emptyHint} />
        )}
      </ScrollView>

      <Modal
        visible={targetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTargetOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setTargetOpen(false)} />
          <View style={styles.modalBox}>
            <AppText bold style={styles.modalTitle}>{t.stockAlert.targetModalTitle}</AppText>
            <AppText style={styles.modalHint}>{t.stockAlert.targetModalHint}</AppText>
            <TextInput
              autoFocus
              keyboardType="number-pad"
              placeholder={t.stockAlert.targetPlaceholder}
              placeholderTextColor="#9CA3AF"
              value={targetInput}
              onChangeText={(value) => {
                setTargetInput(value.replace(/[^0-9]/g, ''));
                if (targetError) setTargetError('');
              }}
              style={[styles.modalInput, targetError ? styles.modalInputError : null]}
              textAlign="center"
            />
            {targetError ? <AppText style={styles.modalError}>{targetError}</AppText> : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTargetOpen(false)}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <AppText style={styles.cancelText}>{t.stockAlert.cancel}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={saveTarget}
                disabled={saving}
                style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.pressed]}
              >
                <AppText bold style={styles.saveText}>{t.stockAlert.save}</AppText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StockItemCard({ item }: { item: ClothingItem }) {
  const color = item.colorValue || item.categoryColor || avatarPalette[item.id % avatarPalette.length];
  const initials = item.name.trim().slice(0, 1) || '?';

  return (
    <View style={styles.itemCard}>
      <View style={[styles.itemAvatar, { backgroundColor: color }]}>
        <AppText bold style={styles.avatarText}>{initials}</AppText>
      </View>
      <View style={styles.itemDetails}>
        <AppText bold style={styles.itemName} numberOfLines={1}>{item.name}</AppText>
        <AppText style={styles.itemMeta} numberOfLines={1}>
          {[item.categoryName, item.size].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View style={styles.stockBlock}>
        <AppText style={styles.stockLabel}>{t.stockAlert.stockRemaining}</AppText>
        <AppText bold style={[styles.stockValue, item.stock === 0 ? styles.outOfStock : null]}>
          {toMM(item.stock)}
        </AppText>
      </View>
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
    minHeight: 56,
    paddingVertical: 8,
    gap: 10,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 18, fontFamily: font.bold },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  targetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#22302B',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  targetAmountWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  targetAmount: { color: '#D9534F', fontSize: 20, fontFamily: font.bold },
  targetText: { flex: 1, marginHorizontal: 8 },
  targetLabel: { color: '#1F2330', fontSize: 13, fontFamily: font.bold },
  targetButton: { backgroundColor: '#4A6CF7', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  targetButtonText: { color: '#FFFFFF', fontSize: 11, lineHeight: 16, textAlign: 'center', fontFamily: font.bold },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 10, paddingHorizontal: 4 },
  sectionTitle: { color: '#1F2330', fontSize: 16, fontFamily: font.bold },
  countText: { color: '#8A90A6', fontSize: 12, fontFamily: font.regular },
  list: { gap: 10 },
  itemCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center' },
  itemAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontFamily: font.bold },
  itemDetails: { flex: 1, marginHorizontal: 12 },
  itemName: { color: '#1F2330', fontSize: 15, fontFamily: font.bold },
  itemMeta: { color: '#8A90A6', fontSize: 12, fontFamily: font.regular, marginTop: 4 },
  stockBlock: { alignItems: 'flex-end' },
  stockLabel: { color: '#8A90A6', fontSize: 10, fontFamily: font.regular },
  stockValue: { color: '#B45309', fontSize: 20, fontFamily: font.bold, marginTop: 2 },
  outOfStock: { color: '#D9534F' },
  pressed: { opacity: 0.78 },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000088' },
  modalBox: { width: '100%', maxWidth: 420, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 24, alignItems: 'center' },
  modalTitle: { color: '#1F2330', fontSize: 17, textAlign: 'center', fontFamily: font.bold },
  modalHint: { color: '#8A90A6', fontSize: 13, lineHeight: 20, textAlign: 'center', fontFamily: font.regular, marginTop: 8 },
  modalInput: { alignSelf: 'stretch', marginTop: 16, borderWidth: 1, borderColor: '#E2E2EA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, color: '#1F2330', fontFamily: font.regular, fontSize: 16 },
  modalInputError: { borderColor: '#D9534F', borderWidth: 1.5 },
  modalError: { alignSelf: 'flex-start', color: '#D9534F', fontSize: 12, fontFamily: font.regular, marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 16 },
  cancelButton: { flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E2EA', borderRadius: 12, paddingVertical: 10 },
  cancelText: { color: '#1F2330', fontSize: 14, fontFamily: font.regular },
  saveButton: { flex: 1, alignItems: 'center', backgroundColor: '#4A6CF7', borderRadius: 12, paddingVertical: 10 },
  saveText: { color: '#FFFFFF', fontSize: 14, fontFamily: font.bold },
});
