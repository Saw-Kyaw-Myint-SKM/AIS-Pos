import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, TextInput, View,
} from 'react-native';
import type { Category } from '../db';
import { CATEGORY_PALETTE } from '../db';
import { t } from '../i18n';
import { font } from '../theme';
import AppText from '../components/AppText';
import { BackArrowIcon } from '../components/ServiceIcon';

export type CategoryFormValue = {
  id: number | null;
  name: string;
  color: string;
};

type Props = {
  initial: CategoryFormValue;
  categories: Category[];
  onBack: () => void;
  onSave: (form: CategoryFormValue) => Promise<void> | void;
  onDelete?: (form: CategoryFormValue) => void;
};

export function categoryToForm(category: Category): CategoryFormValue {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
  };
}

export const emptyCategoryForm: CategoryFormValue = {
  id: null,
  name: '',
  color: '#4F46E5',
};

export default function CategoryFormScreen({ initial, categories, onBack, onSave, onDelete }: Props) {
  const [form, setForm] = useState<CategoryFormValue>(initial);

  const set = <K extends keyof CategoryFormValue>(key: K, value: CategoryFormValue[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      Alert.alert(t.items.categoryRequired);
      return;
    }
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== form.id,
    );
    if (duplicate) {
      Alert.alert(t.items.categoryDuplicate);
      return;
    }
    await onSave({ ...form, name });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      t.items.categoryDeleteTitle,
      form.name,
      [
        { text: t.items.categoryDeleteNo, style: 'cancel' },
        {
          text: t.items.categoryDeleteYes,
          style: 'destructive',
          onPress: () => onDelete(form),
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <BackArrowIcon size={22} color="#FFFFFF" />
        </Pressable>
        <AppText bold style={styles.headerTitle}>
          {form.id ? t.items.categoryFormEdit : t.items.categoryFormNew}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.categoryName}</AppText>
          <TextInput
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder={t.items.categoryName}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.categoryColor}</AppText>
          <View style={styles.colorGrid}>
            {CATEGORY_PALETTE.map((c) => {
              const isSelected = form.color === c.hex;
              return (
                <Pressable
                  key={c.hex}
                  style={styles.colorItem}
                  onPress={() => set('color', c.hex)}
                >
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c.hex },
                      c.hex === '#F5F5F5' && styles.colorSwatchWhite,
                      isSelected && styles.colorSwatchSelected,
                    ]}
                  >
                    {isSelected && <AppText style={styles.colorCheck}>✓</AppText>}
                  </View>
                  <AppText style={styles.colorLabel}>{c.label}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <AppText bold style={styles.saveText}>{t.items.save}</AppText>
        </Pressable>

        {form.id && onDelete ? (
          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <AppText bold style={styles.deleteText}>{t.items.categoryDeleteYes}</AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const INPUT_BG = '#F9FAFB';
const INPUT_BORDER = '#E5E7EB';
const BLUE = '#4A6CF7';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 18 },
  headerSpacer: { width: 30 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 18 },
  label: {
    fontSize: 14,
    color: '#374151',
    fontFamily: font.bold,
    marginBottom: 8,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontFamily: 'Pyidaungsu-Regular',
    fontSize: 15,
    color: '#111827',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorItem: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchWhite: { borderColor: '#E5E7EB' },
  colorSwatchSelected: { borderColor: BLUE },
  colorCheck: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: font.bold,
  },
  colorLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: font.regular,
  },
  saveBtn: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: { color: '#FFFFFF', fontSize: 14 },
  deleteBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9534F',
    alignItems: 'center',
  },
  deleteText: {
    color: '#D9534F',
    fontSize: 14,
    fontFamily: font.bold,
  },
});
