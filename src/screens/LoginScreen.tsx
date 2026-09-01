import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppText from '../components/AppText';
import { createSessionToken, verifyPassword } from '../auth';
import { createLocalSession, getLocalAccountCredentialByEmail, type LocalAccount } from '../db';
import { t } from '../i18n';
import { colors, font } from '../theme';

type Props = { onDone: (account: LocalAccount) => void };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onDone }: Props) {
  const db = useSQLiteContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (submitting) return;
    if (!EMAIL_RE.test(email.trim()) || !password) {
      setError(t.auth.invalidCredentials);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const account = await getLocalAccountCredentialByEmail(db, email.trim().toLowerCase());
      if (!account || !account.isActive || !await verifyPassword(password, account)) {
        setError(t.auth.invalidCredentials);
        return;
      }
      await createLocalSession(db, account.id, await createSessionToken());
      onDone({
        id: account.id, email: account.email, name: account.name, role: account.role,
        isActive: Boolean(account.isActive), mustChangePassword: Boolean(account.mustChangePassword),
        createdAt: account.createdAt, updatedAt: account.updatedAt, disabledAt: account.disabledAt,
      });
    } catch (caught) {
      console.warn('[auth:login]', caught);
      setError(t.auth.loginError);
    } finally {
      setSubmitting(false);
    }
  }, [db, email, onDone, password, submitting]);

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <AppText bold style={styles.title}>{t.auth.loginTitle}</AppText>
            <AppText style={styles.hint}>{t.auth.loginHint}</AppText>
            <View style={styles.form}>
              <AppInput label={t.auth.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <AppInput label={t.auth.password} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => { void submit(); }} />
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <AppButton label={t.auth.signIn} fullWidth onPress={() => { void submit(); }} disabled={submitting} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, flex: { flex: 1 }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: colors.border },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.text, textAlign: 'center' }, hint: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
  form: { marginTop: 28 }, error: { color: colors.danger, textAlign: 'center', fontSize: 13, marginBottom: 14 },
});
