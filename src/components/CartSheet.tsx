import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClothingItem } from '../db';
import { formatKyat, t, toMM } from '../i18n';
import { avatarPalette, colors, radius, shadow, tileShadow } from '../theme';
import AppText from './AppText';
import QtyStepper from './QtyStepper';
import { BackArrowIcon, CartIcon, TrashIcon } from './ServiceIcon';

export type CartLine = { item: ClothingItem; quantity: number };

type Props = {
  visible: boolean;
  lines: CartLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  onSetTax: (n: number) => void;
  onClose: () => void;
  onQuantity: (id: number, delta: number) => void;
  onClear: () => void;
  onConfirm: () => void;
};

export default function CartSheet({
  visible,
  lines,
  subtotal,
  taxAmount,
  total,
  onSetTax,
  onClose,
  onQuantity,
  onClear,
  onConfirm,
}: Props) {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const isEmpty = lines.length === 0;
  const [confirm, setConfirm] = useState<'clear' | 'checkout' | null>(null);
  const [taxModalOpen, setTaxModalOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setConfirm(null);
      setTaxModalOpen(false);
    }
  }, [visible]);

  const handleConfirmAction = () => {
    if (confirm === 'clear') onClear();
    else if (confirm === 'checkout') onConfirm();
    setConfirm(null);
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.cart.close}
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <BackArrowIcon size={26} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <CartIcon size={22} color="#FFFFFF" />
            <AppText bold style={styles.headerTitle}>{t.cart.title}</AppText>
          </View>
          <View style={styles.countChip}>
            <AppText bold style={styles.countChipText}>
              {toMM(count)} {t.sell.piece}
            </AppText>
          </View>
        </View>

        {isEmpty ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <CartIcon size={48} color={colors.muted} />
            </View>
            <AppText style={styles.emptyTitle}>{t.cart.empty}</AppText>
            <AppText style={styles.emptyHint}>{t.cart.emptyHint}</AppText>
          </View>
        ) : (
          <FlatList
            data={lines}
            keyExtractor={(line) => String(line.item.id)}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: line }) => {
              const avatarColor =
                line.item.colorValue || avatarPalette[line.item.id % avatarPalette.length];
              return (
                <View style={styles.card}>
                  {line.item.photoUri ? (
                    <Image
                      source={{ uri: line.item.photoUri }}
                      style={styles.avatar}
                      contentFit="cover"
                      transition={120}
                    />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                      <AppText bold style={styles.avatarText}>
                        {line.item.name.trim().charAt(0)}
                      </AppText>
                    </View>
                  )}
                  <View style={styles.info}>
                    <AppText bold numberOfLines={1} style={styles.name}>
                      {line.item.name}
                    </AppText>
                    <AppText style={styles.meta}>
                      {line.item.size} · {formatKyat(line.item.price)}
                    </AppText>
                  </View>
                  <View style={styles.rightCol}>
                    <AppText bold style={styles.subtotal}>
                      {formatKyat(line.item.price * line.quantity)}
                    </AppText>
                    <QtyStepper
                      value={line.quantity}
                      onMinus={() => onQuantity(line.item.id, -1)}
                      onPlus={() => onQuantity(line.item.id, 1)}
                    />
                  </View>
                </View>
              );
            }}
          />
        )}

        {!isEmpty && (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirm('clear')}
              style={({ pressed }) => [styles.clearLink, pressed && { opacity: 0.6 }]}
            >
              <TrashIcon size={15} color={colors.danger} />
              <AppText style={styles.clearText}>{t.cart.clearAll}</AppText>
            </Pressable>

            <View style={styles.totalRow}>
              <AppText style={styles.totalLabel}>{t.cart.subtotal}</AppText>
              <AppText style={styles.totalValue}>{formatKyat(subtotal)}</AppText>
            </View>

            {taxAmount > 0 ? (
              <View style={styles.taxRow}>
                <AppText style={styles.totalLabel}>{t.cart.tax}</AppText>
                <View style={styles.taxRight}>
                  <AppText bold style={styles.totalValue}>{formatKyat(taxAmount)}</AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.cart.editTax}
                    onPress={() => setTaxModalOpen(true)}
                    style={({ pressed }) => [styles.taxEditBtn, pressed && { opacity: 0.7 }]}
                  >
                    <AppText style={styles.taxEditText}>{t.cart.editTax}</AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.cart.clearTax}
                    onPress={() => onSetTax(0)}
                    style={({ pressed }) => [styles.taxClearBtn, pressed && { opacity: 0.7 }]}
                  >
                    <AppText bold style={styles.taxClearText}>✕</AppText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setTaxModalOpen(true)}
                style={({ pressed }) => [styles.addTaxBtn, pressed && { opacity: 0.6 }]}
              >
                <AppText bold style={styles.addTaxText}>{t.cart.addTax}</AppText>
              </Pressable>
            )}

            <View style={styles.totalDivider} />

            <View style={styles.totalRow}>
              <AppText bold style={styles.totalLabel}>{t.cart.grandTotal}</AppText>
              <AppText bold style={styles.totalValue}>{formatKyat(total)}</AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirm('checkout')}
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.9 }]}
            >
              <AppText bold style={styles.confirmCheck}>✓</AppText>
              <AppText bold style={styles.confirmText}>{t.cart.confirm}</AppText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>

    <Modal
      visible={confirm !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setConfirm(null)}
    >
      <View style={styles.confirmOverlay}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirm(null)} />
        <View style={styles.confirmBox}>
          <View
            style={[
              styles.confirmIconWrap,
              confirm === 'clear' ? styles.confirmIconDanger : styles.confirmIconPrimary,
            ]}
          >
            {confirm === 'clear' ? (
              <TrashIcon size={26} color="#FFFFFF" />
            ) : (
              <CartIcon size={26} color="#FFFFFF" />
            )}
          </View>
          <AppText bold style={styles.confirmBoxTitle}>
            {confirm === 'clear' ? t.cart.confirmClearTitle : t.cart.confirmCheckoutTitle}
          </AppText>
          <AppText style={styles.confirmBoxBody}>
            {confirm === 'clear' ? t.cart.confirmClearBody : t.cart.confirmCheckoutBody}
          </AppText>
          <View style={styles.confirmBoxActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirm(null)}
              style={({ pressed }) => [styles.confirmCancelBtn, pressed && { opacity: 0.7 }]}
            >
              <AppText style={styles.confirmCancelText}>{t.cart.cancel}</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleConfirmAction}
              style={({ pressed }) => [
                styles.confirmOkBtn,
                confirm === 'clear' && styles.confirmOkDanger,
                pressed && { opacity: 0.9 },
              ]}
            >
              <AppText bold style={styles.confirmOkText}>
                {confirm === 'clear' ? t.cart.yesClear : t.cart.confirm}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    <TaxModal
      visible={taxModalOpen}
      initialAmount={taxAmount}
      onClose={() => setTaxModalOpen(false)}
      onSave={(n) => {
        onSetTax(n);
        setTaxModalOpen(false);
      }}
    />
    </>
  );
}

type TaxModalProps = {
  visible: boolean;
  initialAmount: number;
  onClose: () => void;
  onSave: (n: number) => void;
};

function TaxModal({ visible, initialAmount, onClose, onSave }: TaxModalProps) {
  const [taxInput, setTaxInput] = useState('');
  const [taxError, setTaxError] = useState('');

  useEffect(() => {
    if (visible) {
      setTaxInput(initialAmount > 0 ? String(initialAmount) : '');
      setTaxError('');
    }
  }, [visible, initialAmount]);

  const handleSave = () => {
    const cleaned = taxInput.replace(/[^\d.]/g, '');
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) {
      setTaxError(t.cart.taxAmountInvalid);
      return;
    }
    onSave(n);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.taxOverlay}
      >
        <Pressable style={styles.taxBackdrop} onPress={onClose} />
        <View style={styles.taxBox}>
          <AppText bold style={styles.taxTitle}>{t.cart.taxModalTitle}</AppText>

          {/* <AppText style={styles.taxFieldLabel}>{t.cart.tax}</AppText>
          <View style={styles.taxFixedValue}>
            <AppText bold style={styles.taxFixedText}>အခွန်</AppText>
          </View> */}

          <AppText style={styles.taxFieldLabel}>{t.cart.taxAmountLabel}</AppText>
          <View style={[styles.taxInputWrap, taxError ? styles.taxInputWrapError : null]}>
            <TextInput
              style={styles.taxInput}
              value={taxInput}
              onChangeText={(v) => {
                setTaxInput(v);
                if (taxError) setTaxError('');
              }}
              keyboardType="numeric"
              placeholder={t.cart.taxAmountPlaceholder}
              placeholderTextColor={colors.muted}
              autoFocus
            />
          </View>
          {taxError ? (
            <AppText style={styles.taxErrorText}>{taxError}</AppText>
          ) : null}

          <View style={styles.taxActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.taxCancelBtn, pressed && { opacity: 0.7 }]}
            >
              <AppText style={styles.taxCancelText}>{t.cart.cancel}</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              style={({ pressed }) => [styles.taxSaveBtn, pressed && { opacity: 0.9 }]}
            >
              <AppText bold style={styles.taxSaveText}>{t.cart.save}</AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sheet },
  header: {
    backgroundColor: colors.sellBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: '#FFFFFF', fontSize: 18 },
  countChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  countChipText: { color: '#FFFFFF', fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 12,
    marginBottom: 12,
    ...tileShadow,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 15, color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 8 },
  subtotal: { fontSize: 15, color: colors.sellBlue },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 16 },
  emptyHint: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: colors.sheet,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  clearLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingVertical: 2,
    marginBottom: 4,
  },
  clearText: { color: colors.danger, fontSize: 12 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  totalLabel: { color: colors.muted, fontSize: 13 },
  totalValue: { color: colors.sellBlue, fontSize: 15 },
  totalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  taxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  taxRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taxEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.accentSoft,
  },
  taxEditText: { color: colors.header, fontSize: 11 },
  taxClearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taxClearText: { color: colors.danger, fontSize: 11, lineHeight: 13 },
  addTaxBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    marginBottom: 2,
  },
  addTaxText: { color: colors.header, fontSize: 13 },
  taxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  taxBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  taxBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    ...shadow,
  },
  taxTitle: { fontSize: 15, color: colors.header, marginBottom: 8 },
  taxFieldLabel: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 3,
    marginTop: 4,
  },
  taxFixedValue: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignSelf: 'flex-start',
  },
  taxFixedText: { color: colors.text, fontSize: 13 },
  taxInputWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
  },
  taxInputWrapError: { borderColor: colors.danger },
  taxInput: {
    fontSize: 14,
    color: colors.text,
    padding: 0,
    minHeight: 24,
  },
  taxErrorText: {
    color: colors.danger,
    fontSize: 10,
    marginTop: 3,
  },
  taxActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  taxCancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taxCancelText: { color: colors.text, fontSize: 12 },
  taxSaveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.header,
  },
  taxSaveText: { color: '#FFFFFF', fontSize: 12 },
  confirmBtn: {
    backgroundColor: colors.sellBlue,
    borderRadius: radius.md,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  confirmCheck: { color: '#FFFFFF', fontSize: 18 },
  confirmText: { color: '#FFFFFF', fontSize: 16 },
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000088',
  },
  confirmBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmIconDanger: { backgroundColor: colors.danger },
  confirmIconPrimary: { backgroundColor: colors.sellBlue },
  confirmBoxTitle: { fontSize: 17, color: colors.text, textAlign: 'center' },
  confirmBoxBody: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  confirmBoxActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    alignSelf: 'stretch',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  confirmCancelText: { color: colors.text, fontSize: 15 },
  confirmOkBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.sellBlue,
    alignItems: 'center',
  },
  confirmOkDanger: { backgroundColor: colors.danger },
  confirmOkText: { color: '#FFFFFF', fontSize: 15 },
});