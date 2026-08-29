import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Customer, CustomerInput } from '../db';
import { t } from '../i18n';
import { colors } from '../theme';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppText from '../components/AppText';
import { BackArrowIcon } from '../components/ServiceIcon';

type Props = { initial?: Customer; onBack: () => void; onSave: (input: CustomerInput) => Promise<void> };
type Errors = { name?: string; phone?: string; address?: string };

export default function CustomerFormScreen({ initial, onBack, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const submit = useCallback(async () => {
    const next: Errors = {};
    if (!name.trim()) next.name = t.customer.required;
    if (!phone.trim()) next.phone = t.customer.required;
    if (!address.trim()) next.address = t.customer.required;
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try { await onSave({ id: initial?.id, name, phone, address }); } finally { setSaving(false); }
  }, [address, initial?.id, name, onSave, phone]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><BackArrowIcon size={24} color="#FFFFFF" /></Pressable>
        <AppText bold style={styles.title}>{initial ? t.customer.editTitle : t.customer.newTitle}</AppText>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppInput label={t.customer.name} value={name} error={errors.name} onChangeText={(v) => { setName(v); setErrors((old) => ({ ...old, name: undefined })); }} />
          <AppInput label={t.customer.phone} value={phone} error={errors.phone} keyboardType="phone-pad" onChangeText={(v) => { setPhone(v); setErrors((old) => ({ ...old, phone: undefined })); }} />
          <AppInput label={t.customer.address} value={address} error={errors.address} multiline numberOfLines={3} onChangeText={(v) => { setAddress(v); setErrors((old) => ({ ...old, address: undefined })); }} />
          <AppButton label={t.customer.save} fullWidth onPress={submit} disabled={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' }, flex: { flex: 1 },
  header: { minHeight: 58, backgroundColor: '#4A6CF7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 18, marginLeft: 4 },
  content: { padding: 18 },
});
