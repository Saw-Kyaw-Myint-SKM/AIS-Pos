import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, TextInput, View,
} from 'react-native';
import type { Category, ClothingItem } from '../db';
import { t } from '../i18n';
import { font } from '../theme';
import AppText from '../components/AppText';
import { BackArrowIcon, CameraIcon, ImageIcon, ScanIcon } from '../components/ServiceIcon';

export type ItemFormValue = {
  id: number;
  qrCode: string;
  name: string;
  size: string;
  price: string;
  categoryId: number | null;
  stock: string;
  choiceType: 'color' | 'photo';
  colorValue: string;
  photoUri: string;
  note: string;
};

export function itemToForm(item: ClothingItem): ItemFormValue {
  return {
    id: item.id,
    qrCode: item.qrCode,
    name: item.name,
    size: item.size,
    price: String(item.price),
    categoryId: item.categoryId,
    stock: String(item.stock),
    choiceType: item.choiceType,
    colorValue: item.colorValue,
    photoUri: item.photoUri,
    note: item.note ?? '',
  };
}

export const emptyForm: ItemFormValue = {
  id: 0,
  qrCode: '',
  name: '',
  size: '',
  price: '',
  categoryId: null,
  stock: '',
  choiceType: 'color',
  colorValue: '',
  photoUri: '',
  note: '',
};

type Props = {
  initial: ItemFormValue;
  categories: Category[];
  onBack: () => void;
  onSave: (form: ItemFormValue) => void;
  onCreateCategory: () => void;
};

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

const PHOTO_DIR = 'item-photos';

const BARCODE_TYPES = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

function ensurePhotoDir(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

function persistImage(srcUri: string): string {
  try {
    const src = new File(srcUri);
    if (!src.exists) return '';
    const dir = ensurePhotoDir();
    const ext = src.extension || 'jpg';
    const dest = new File(dir, `item-${Date.now()}.${ext}`);
    src.copy(dest);
    return dest.uri;
  } catch {
    return srcUri;
  }
}

function deletePhoto(uri: string) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
}

export default function ItemFormScreen({ initial, categories, onBack, onSave, onCreateCategory }: Props) {
  const [form, setForm] = useState<ItemFormValue>(initial);
  const [showCategory, setShowCategory] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const set = <K extends keyof ItemFormValue>(key: K, value: ItemFormValue[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openBarcodeScanner = () => {
    requestPermission();
    setBarcodeScannerOpen(true);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    set('qrCode', result.data.trim());
    setBarcodeScannerOpen(false);
  };

  const selectedCategory = categories.find((c) => c.id === form.categoryId) || null;

  const requiredLabel = (text: string) => (
    <>
      {text} <AppText style={styles.requiredStar}>*</AppText>
    </>
  );

  const setChoiceType = (next: 'color' | 'photo') => {
    setForm((current) => {
      if (current.choiceType === next) return current;
      if (next === 'photo') {
        return { ...current, choiceType: 'photo', colorValue: '' };
      }
      return { ...current, choiceType: 'color', photoUri: '' };
    });
  };

  const pickFromCamera = async () => {
    setPhotoSheetOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t.items.photoPermission);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = persistImage(result.assets[0].uri);
    if (form.photoUri) deletePhoto(form.photoUri);
    set('photoUri', uri);
  };

  const pickFromLibrary = async () => {
    setPhotoSheetOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t.items.photoPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = persistImage(result.assets[0].uri);
    if (form.photoUri) deletePhoto(form.photoUri);
    set('photoUri', uri);
  };

  const removePhoto = () => {
    setPhotoSheetOpen(false);
    if (form.photoUri) deletePhoto(form.photoUri);
    set('photoUri', '');
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.items.save}
          onPress={() => onSave(form)}
          style={({ pressed }) => [styles.headerSaveButton, pressed && styles.headerSavePressed]}
        >
          <AppText bold style={styles.headerSaveText}>{t.items.save}</AppText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <AppText style={styles.label}>{requiredLabel(t.items.name)}</AppText>
          <TextInput
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder={t.items.name}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{requiredLabel(t.items.category)}</AppText>
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowCategory(!showCategory)}
          >
            <View style={styles.categorySelectedRow}>
              {selectedCategory ? (
                <View style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]} />
              ) : null}
              <AppText style={selectedCategory ? styles.dropdownText : styles.dropdownPlaceholder}>
                {selectedCategory ? selectedCategory.name : t.items.category}
              </AppText>
            </View>
            <AppText style={styles.dropdownArrow}>▼</AppText>
          </Pressable>
          {showCategory && (
            <View style={styles.dropdownList}>
              {categories.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <AppText style={styles.dropdownItemText}>{t.items.categoryEmpty}</AppText>
                </View>
              ) : (
                categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.dropdownItem,
                      styles.dropdownItemRow,
                      form.categoryId === cat.id && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      set('categoryId', cat.id);
                      setShowCategory(false);
                    }}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <AppText
                      style={[
                        styles.dropdownItemText,
                        form.categoryId === cat.id && styles.dropdownItemTextActive,
                      ]}
                    >
                      {cat.name}
                    </AppText>
                  </Pressable>
                ))
              )}
              <Pressable
                style={[styles.dropdownItem, styles.dropdownItemAdd]}
                onPress={() => {
                  setShowCategory(false);
                  onCreateCategory();
                }}
              >
                <View style={styles.categoryAddIcon}>
                  <AppText style={styles.categoryAddPlus}>+</AppText>
                </View>
                <AppText style={styles.dropdownItemTextPrimary}>{t.items.categoryAddNew}</AppText>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{requiredLabel(t.items.price)}</AppText>
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
          <View style={styles.labelRow}>
            <AppText style={styles.label}>{t.items.barcode}</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={openBarcodeScanner}
              hitSlop={8}
              style={styles.scanIconBtn}
            >
              <ScanIcon size={18} color={BLUE} />
            </Pressable>
          </View>
          <TextInput
            value={form.qrCode}
            onChangeText={(v) => set('qrCode', v)}
            placeholder={t.items.barcode}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.flexField}>
            <AppText style={styles.label}>{t.items.size}</AppText>
            <TextInput
              value={form.size}
              onChangeText={(v) => set('size', v)}
              placeholder={t.items.size}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>

          <View style={styles.flexField}>
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
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>{t.items.choiceType}</AppText>
          <View style={styles.radioGroup}>
            <Pressable
              style={styles.radioRow}
              onPress={() => setChoiceType('color')}
            >
              <View style={[styles.radio, form.choiceType === 'color' && styles.radioActive]}>
                {form.choiceType === 'color' && <View style={styles.radioDot} />}
              </View>
              <AppText style={styles.radioLabel}>{t.items.color}</AppText>
            </Pressable>
            <Pressable
              style={styles.radioRow}
              onPress={() => setChoiceType('photo')}
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

        {form.choiceType === 'photo' && (
          <View style={styles.field}>
            <AppText style={styles.label}>{t.items.photoAdd}</AppText>
            {form.photoUri ? (
              <View style={styles.photoCard}>
                <View style={styles.photoImageWrap}>
                  <Image
                    source={{ uri: form.photoUri }}
                    style={styles.photoPreview}
                    contentFit="cover"
                    transition={150}
                  />
                  <View style={styles.photoBadge}>
                    <View style={styles.photoBadgeDot} />
                    <AppText style={styles.photoBadgeText}>ရွေးထားပါသည်</AppText>
                  </View>
                </View>
                <View style={styles.photoActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.photoPill,
                      styles.photoPillPrimary,
                      pressed && styles.photoPillPressed,
                    ]}
                    onPress={() => setPhotoSheetOpen(true)}
                  >
                    <AppText bold style={styles.photoPillTextPrimary}>
                      {t.items.photoChange}
                    </AppText>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.photoPill,
                      styles.photoPillDanger,
                      pressed && styles.photoPillPressed,
                    ]}
                    onPress={removePhoto}
                  >
                    <AppText bold style={styles.photoPillTextDanger}>
                      {t.items.photoRemove}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.photoDropzone}
                onPress={() => setPhotoSheetOpen(true)}
              >
                <View style={styles.photoDropzoneIcon}>
                  <CameraIcon size={32} color="#4A6CF7" />
                </View>
                <AppText style={styles.photoDropzoneText}>
                  {t.items.photoTapHint}
                </AppText>
              </Pressable>
            )}
          </View>
        )}

      </ScrollView>

      <Modal
        visible={photoSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setPhotoSheetOpen(false)}
        >
          <Pressable style={styles.sheetCard} onPress={() => undefined}>
            <Pressable style={styles.sheetItem} onPress={pickFromCamera}>
              <View style={styles.sheetIconWrap}>
                <CameraIcon size={22} color="#4A6CF7" />
              </View>
              <AppText style={styles.sheetItemText}>{t.items.photoTake}</AppText>
            </Pressable>
            <View style={styles.sheetDivider} />
            <Pressable style={styles.sheetItem} onPress={pickFromLibrary}>
              <View style={styles.sheetIconWrap}>
                <ImageIcon size={22} color="#4A6CF7" />
              </View>
              <AppText style={styles.sheetItemText}>{t.items.photoPick}</AppText>
            </Pressable>
            {form.photoUri ? (
              <>
                <View style={styles.sheetDivider} />
                <Pressable style={styles.sheetItem} onPress={removePhoto}>
                  <View style={styles.sheetIconWrap}>
                    <AppText style={styles.sheetDangerGlyph}>✕</AppText>
                  </View>
                  <AppText style={[styles.sheetItemText, styles.sheetItemTextDanger]}>
                    {t.items.photoRemove}
                  </AppText>
                </Pressable>
              </>
            ) : null}
            <View style={styles.sheetDivider} />
            <Pressable
              style={[styles.sheetItem, styles.sheetItemCancel]}
              onPress={() => setPhotoSheetOpen(false)}
            >
              <AppText style={styles.sheetCancelText}>{t.items.photoCancel}</AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={barcodeScannerOpen}
        animationType="slide"
        onRequestClose={() => setBarcodeScannerOpen(false)}
      >
        <View style={styles.scannerScreen}>
          <View style={styles.scannerHeader}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBarcodeScannerOpen(false)}
              hitSlop={10}
              style={styles.scannerCloseBtn}
            >
              <BackArrowIcon size={22} color="#FFFFFF" />
            </Pressable>
            <View style={styles.scannerTitleArea}>
              <AppText bold style={styles.scannerTitle}>{t.items.barcodeScannerTitle}</AppText>
            </View>
            <View style={styles.scannerHeaderSpacer} />
          </View>

          <View style={styles.scannerBody}>
            {permission?.granted ? (
              <>
                <View style={styles.scannerViewfinderBox}>
                  <CameraView
                    style={styles.scannerCamera}
                    barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
                    onBarcodeScanned={handleBarcodeScanned}
                  />
                  <View pointerEvents="none" style={styles.scannerFrame}>
                    <View style={[styles.scannerBracket, styles.scannerBracketTL]} />
                    <View style={[styles.scannerBracket, styles.scannerBracketTR]} />
                    <View style={[styles.scannerBracket, styles.scannerBracketBL]} />
                    <View style={[styles.scannerBracket, styles.scannerBracketBR]} />
                  </View>
                </View>
                <AppText style={styles.scannerHint}>{t.items.barcodeHint}</AppText>
              </>
            ) : (
              <View style={styles.scannerPermission}>
                <AppText bold style={styles.scannerPermissionText}>
                  {t.items.barcodePermission}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  onPress={requestPermission}
                  style={styles.scannerAllowBtn}
                >
                  <AppText bold style={styles.scannerAllowText}>{t.items.barcodeAllow}</AppText>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  headerSaveButton: { minWidth: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)' },
  headerSavePressed: { opacity: 0.75 },
  headerSaveText: { color: '#FFFFFF', fontSize: 14, fontFamily: font.bold },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 18 },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  flexField: { flex: 1 },
  label: {
    fontSize: 14,
    color: '#374151',
    fontFamily: font.bold,
    marginBottom: 8,
  },
  requiredStar: {
    color: '#DC2626',
    fontFamily: font.bold,
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
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#EEF2FF',
  },
  dropdownItemAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
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
  dropdownItemTextPrimary: {
    fontFamily: 'Pyidaungsu-Bold',
    fontSize: 14,
    color: BLUE,
  },
  categorySelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryAddIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAddPlus: {
    color: BLUE,
    fontSize: 14,
    fontFamily: font.bold,
    lineHeight: 16,
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
  photoDropzone: {
    backgroundColor: INPUT_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoDropzoneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDropzoneText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: font.regular,
  },
  photoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  photoImageWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  photoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  photoBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  photoBadgeText: {
    fontSize: 11,
    color: '#374151',
    fontFamily: font.bold,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  photoPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPillPrimary: {
    backgroundColor: '#EEF2FF',
  },
  photoPillDanger: {
    backgroundColor: '#FBEAE9',
  },
  photoPillPressed: {
    opacity: 0.7,
  },
  photoPillTextPrimary: {
    color: BLUE,
    fontSize: 13,
    fontFamily: font.bold,
  },
  photoPillTextDanger: {
    color: '#D9534F',
    fontSize: 13,
    fontFamily: font.bold,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 24,
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 14,
  },
  sheetItemCancel: {
    justifyContent: 'center',
    paddingVertical: 14,
  },
  sheetIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemText: {
    fontSize: 15,
    color: '#111827',
    fontFamily: font.regular,
  },
  sheetItemTextDanger: {
    color: '#D9534F',
  },
  sheetDangerGlyph: {
    fontSize: 16,
    color: '#D9534F',
    fontFamily: font.bold,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: INPUT_BORDER,
  },
  sheetCancelText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: font.regular,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scanIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerScreen: {
    flex: 1,
    backgroundColor: BLUE,
    paddingTop: 50,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 40,
  },
  scannerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTitleArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  scannerHeaderSpacer: {
    width: 36,
  },
  scannerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 74,
    paddingHorizontal: 24,
  },
  scannerViewfinderBox: {
    width: 260,
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  scannerFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerBracket: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#FFFFFF',
    borderWidth: 4,
  },
  scannerBracketTL: {
    top: 16,
    left: 16,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
  },
  scannerBracketTR: {
    top: 16,
    right: 16,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 10,
  },
  scannerBracketBL: {
    bottom: 16,
    left: 16,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
  },
  scannerBracketBR: {
    bottom: 16,
    right: 16,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 10,
  },
  scannerCamera: {
    width: '100%',
    height: '100%',
  },
  scannerHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
  },
  scannerPermission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  scannerPermissionText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  scannerAllowBtn: {
    backgroundColor: '#E8862E',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 16,
  },
  scannerAllowText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
