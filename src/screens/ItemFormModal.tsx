import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { t } from '../i18n';
import { colors, radius } from '../theme';
import AppText from '../components/AppText';

export type ItemFormValue = { id: number; qrCode: string; name: string; size: string; price: string };

type Props = {
  visible: boolean;
  initial: ItemFormValue;
  onClose: () => void;
  onSave: (form: ItemFormValue) => void;
};

export default function ItemFormModal({ visible, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<ItemFormValue>(initial);

  useEffect(() => {
    if (visible) setForm(initial);
  }, [visible, initial]);

  const fields: { key: keyof Omit<ItemFormValue, 'id'>; label: string; numeric?: boolean }[] = [
    { key: 'name', label: t.items.name },
    { key: 'size', label: t.items.size },
    { key: 'price', label: t.items.price, numeric: true },
    { key: 'qrCode', label: t.items.qr },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.shade}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <AppText bold style={styles.title}>{form.id ? t.items.editItem : t.items.newItem}</AppText>
          <ScrollView keyboardShouldPersistTaps="handled">
            {fields.map((field) => (
              <View key={field.key} style={styles.field}>
                <AppText style={styles.label}>{field.label}</AppText>
                <TextInput
                  value={form[field.key]}
                  onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
                  placeholder={field.label}
                  placeholderTextColor={colors.muted}
                  keyboardType={field.numeric ? 'numeric' : 'default'}
                  style={styles.input}
                />
              </View>
            ))}
            <View style={styles.row}>
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelBtn}>
                <AppText style={styles.cancelText}>{t.items.cancel}</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => onSave(form)} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}>
                <AppText bold style={styles.saveText}>{t.items.save}</AppText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000066' },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, maxHeight: '85%',
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 14 },
  title: { fontSize: 20, color: colors.header, marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Pyidaungsu-Regular', fontSize: 15, color: colors.text,
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { color: colors.muted, fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: colors.header, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15 },
});
