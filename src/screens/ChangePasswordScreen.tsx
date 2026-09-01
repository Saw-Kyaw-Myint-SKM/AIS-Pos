import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppText from '../components/AppText';
import { createPasswordVerifier } from '../auth';
import { updateLocalAccountPassword, type LocalAccount } from '../db';
import { t } from '../i18n';
import { colors, font } from '../theme';

type Props = { account: LocalAccount; onDone: () => void };

export default function ChangePasswordScreen({ account, onDone }: Props) {
  const db = useSQLiteContext();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (saving) return;
    if (password.length < 8) return setError(t.auth.passwordShort);
    if (password !== confirmation) return setError(t.auth.passwordMismatch);
    setSaving(true);
    setError('');
    try {
      await updateLocalAccountPassword(db, account.id, await createPasswordVerifier(password));
      onDone();
    } catch (caught) {
      console.warn('[auth:change-password]', caught);
      setError(t.auth.loginError);
    } finally {
      setSaving(false);
    }
  }, [account.id, confirmation, db, onDone, password, saving]);

  return <View style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><View style={styles.card}><AppText bold style={styles.title}>{t.auth.passwordChangeTitle}</AppText><AppText style={styles.hint}>{t.auth.passwordChangeHint}</AppText><View style={styles.form}><AppInput label={t.auth.newPassword} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} /><AppInput label={t.auth.confirmPassword} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => { void save(); }} />{error ? <AppText style={styles.error}>{error}</AppText> : null}<AppButton label={t.auth.changePassword} fullWidth onPress={() => { void save(); }} disabled={saving} /></View></View></ScrollView></KeyboardAvoidingView></View>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bg }, flex: { flex: 1 }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 }, card: { backgroundColor: colors.surface, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: colors.border }, title: { fontFamily: font.bold, fontSize: 21, color: colors.text, textAlign: 'center' }, hint: { color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 8 }, form: { marginTop: 28 }, error: { color: colors.danger, textAlign: 'center', fontSize: 13, marginBottom: 14 } });
