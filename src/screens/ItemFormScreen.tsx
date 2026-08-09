import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { ClothingItem } from '../db';
import { t } from '../i18n';
import { font } from '../theme';
import AppText from '../components/AppText';
import { BackArrowIcon } from '../components/ServiceIcon';

export type ItemFormValue = {
  id: number;
  qrCode: string;
  name: string;
  size: string;
  price: string;
  category: string;
  stock: string;
  choiceType: 'color' | 'photo';
  colorValue: string;
  note: string;
};

export function itemToForm(item: ClothingItem): ItemFormValue {
  return {
    id: item.id,
    qrCode: item.qrCode,
    name: item.name,
    size: item.size,
    price: String(item.price),
    category: item.category,
    stock: String(item.stock),
    choiceType: item.choiceType,
    colorValue: item.colorValue,
    note: item.note ?? '',
  };
}

export const emptyForm: ItemFormValue = {
  id: 0,
  qrCode: '',
  name: '',
  size: '',
  price: '',
  category: '',
  stock: '',
  choiceType: 'color',
  colorValue: '',
  note: '',
};

type Props = {
  initial: ItemFormValue;
  onBack: () => void;
  onSave: (form: ItemFormValue) => void;
};

const CATEGORIES = ['အင်္ကျီ', 'ဘောင်းဘီ', 'ထည်', 'လုံချည်', 'အခြား'];

const COLOR_PICKER = [
  { label: 'အနက်', hex: '#1A1A1A' },
  { label: 'အဖြူ', hex: '#F5F5F5' },
  { label: 'အနီ', hex: '#DC2626' },
  { label: 'အပြာ', hex: '#2563EB' },
  { label: 'အစိမ်း', hex: '#16A34A' },
  { label: 'အဝါ', hex: '#CA8A04' },
  { label: 'ခရမ်း', hex: '#9333EA' },
  { label: 'ပန်းရောင်', hex: '#DB2777' },
  { label: 'မီးခိုး', hex: '#6B7280' },
  { label: 'အညို', hex: '#A16207' },
  { label: 'လိမ္မော်', hex: '#EA580C' },
  { label: 'အပြာနု', hex: '#06B6D4' },
];

export default function ItemFormScreen({ initial, onBack, onSave }: Props) {
  const [form, setForm] = useState<ItemFormValue>(initial);
  const [showCategory, setShowCategory] = useState(false);

  const set = (key: keyof ItemFormValue, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
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
          {form.id ? t.items.editItem : t.items.newItem}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.name}</AppText>
          <TextInput
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder={t.items.name}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.category}</AppText>
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowCategory(!showCategory)}
          >
            <AppText style={form.category ? styles.dropdownText : styles.dropdownPlaceholder}>
              {form.category || t.items.category}
            </AppText>
            <AppText style={styles.dropdownArrow}>▼</AppText>
          </Pressable>
          {showCategory && (
            <View style={styles.dropdownList}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.dropdownItem,
                    form.category === cat && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    set('category', cat);
                    setShowCategory(false);
                  }}
                >
                  <AppText
                    style={[
                      styles.dropdownItemText,
                      form.category === cat && styles.dropdownItemTextActive,
                    ]}
                  >
                    {cat}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.size}</AppText>
          <TextInput
            value={form.size}
            onChangeText={(v) => set('size', v)}
            placeholder={t.items.size}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.price}</AppText>
          <TextInput
            value={form.price}
            onChangeText={(v) => set('price', v)}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.barcode}</AppText>
          <TextInput
            value={form.qrCode}
            onChangeText={(v) => set('qrCode', v)}
            placeholder={t.items.barcode}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.stock}</AppText>
          <TextInput
            value={form.stock}
            onChangeText={(v) => set('stock', v)}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.note}</AppText>
          <TextInput
            value={form.note}
            onChangeText={(v) => set('note', v)}
            placeholder={t.items.note}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            style={styles.textArea}
          />
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.choiceType}</AppText>
          <View style={styles.radioGroup}>
            <Pressable
              style={styles.radioRow}
              onPress={() => set('choiceType', 'color')}
            >
              <View style={[styles.radio, form.choiceType === 'color' && styles.radioActive]}>
                {form.choiceType === 'color' && <View style={styles.radioDot} />}
              </View>
              <AppText style={styles.radioLabel}>{t.items.color}</AppText>
            </Pressable>
            <Pressable
              style={styles.radioRow}
              onPress={() => set('choiceType', 'photo')}
            >
              <View style={[styles.radio, form.choiceType === 'photo' && styles.radioActive]}>
                {form.choiceType === 'photo' && <View style={styles.radioDot} />}
              </View>
              <AppText style={styles.radioLabel}>{t.items.photo}</AppText>
            </Pressable>
          </View>
        </View>

        {form.choiceType === 'color' && (
          <View style={styles.field}>
            <AppText style={styles.label}>အရောင်ရွေးရန်</AppText>
            <View style={styles.colorGrid}>
              {COLOR_PICKER.map((c) => {
                const isSelected = form.colorValue === c.hex;
                return (
                  <Pressable
                    key={c.hex}
                    style={styles.colorItem}
                    onPress={() => set('colorValue', c.hex)}
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c.hex },
                        c.hex === '#F5F5F5' && styles.colorSwatchWhite,
                        isSelected && styles.colorSwatchSelected,
                      ]}
                    >
                      {isSelected && (
                        <AppText style={styles.colorCheck}>✓</AppText>
                      )}
                    </View>
                    <AppText style={styles.colorLabel}>{c.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Pressable
          style={styles.saveBtn}
          onPress={() => onSave(form)}
        >
          <AppText bold style={styles.saveText}>{t.items.save}</AppText>
        </Pressable>
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
    paddingVertical: 12,
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
  dropdown: {
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontFamily: 'Pyidaungsu-Regular',
    fontSize: 15,
    color: '#111827',
  },
  dropdownPlaceholder: {
    fontFamily: 'Pyidaungsu-Regular',
    fontSize: 15,
    color: '#9CA3AF',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#6B7280',
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: INPUT_BORDER,
  },
  dropdownItemActive: {
    backgroundColor: '#EEF2FF',
  },
  dropdownItemText: {
    fontFamily: 'Pyidaungsu-Regular',
    fontSize: 14,
    color: '#111827',
  },
  dropdownItemTextActive: {
    fontFamily: 'Pyidaungsu-Bold',
    color: BLUE,
  },
  textArea: {
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Pyidaungsu-Regular',
    fontSize: 15,
    color: '#111827',
    minHeight: 96,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: BLUE,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE,
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
    fontFamily: font.regular,
  },
  saveBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: { color: '#FFFFFF', fontSize: 16 },
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
  colorSwatchWhite: {
    borderColor: '#E5E7EB',
  },
  colorSwatchSelected: {
    borderColor: BLUE,
  },
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
});
