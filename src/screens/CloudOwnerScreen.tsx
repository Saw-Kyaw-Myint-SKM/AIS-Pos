import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppText from '../components/AppText';
import { BackArrowIcon, CloudIcon } from '../components/ServiceIcon';
import { t } from '../i18n';
import { colors, font, radius } from '../theme';

type Props = {
  email: string;
  configured: boolean;
  onBack: () => void;
  onCreate: (input: { email: string; password: string; bootstrapToken: string }) => Promise<void>;
  onSignIn: (input: { email: string; password: string }) => Promise<void>;
};

const emailValid = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

export default function CloudOwnerScreen({ email: initialEmail, configured, onBack, onCreate, onSignIn }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (create: boolean) => {
    if (busy) return;
    if (!configured) { setError(t.cloudOwner.notConfigured); return; }
    if (!emailValid(email) || password.length < 8 || (create && !token.trim())) { setError(t.cloudOwner.invalidInput); return; }
    setBusy(true);
    setError('');
    try {
      if (create) await onCreate({ email, password, bootstrapToken: token });
      else await onSignIn({ email, password });
    } catch {
      setError(create ? t.cloudOwner.createError : t.cloudOwner.signInError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back}><BackArrowIcon size={26} color="#FFFFFF" /></Pressable>
        <View style={styles.headerText}><AppText bold style={styles.title}>{t.cloudOwner.title}</AppText><AppText style={styles.subtitle}>{t.cloudOwner.subtitle}</AppText></View>
        <View style={styles.back} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}><CloudIcon size={34} color={colors.primary} /><AppText bold style={styles.heroTitle}>{t.cloudOwner.heroTitle}</AppText><AppText style={styles.hint}>{t.cloudOwner.hint}</AppText></View>
          <View style={styles.card}>
            <AppInput label={t.cloudOwner.email} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
            <AppInput label={t.cloudOwner.password} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} />
            <AppInput label={t.cloudOwner.bootstrapToken} value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} />
            <AppText style={styles.tokenHint}>{t.cloudOwner.tokenHint}</AppText>
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <AppButton label={busy ? t.settings.busy : t.cloudOwner.create} fullWidth disabled={busy} onPress={() => { void submit(true); }} />
            <View style={styles.separator}><View style={styles.line} /><AppText style={styles.or}>{t.cloudOwner.or}</AppText><View style={styles.line} /></View>
            {busy ? <ActivityIndicator color={colors.header} /> : <AppButton label={t.cloudOwner.signIn} variant="outline" fullWidth disabled={busy} onPress={() => { void submit(false); }} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, flex: { flex: 1 },
  header: { minHeight: 64, backgroundColor: colors.header, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1, alignItems: 'center' }, title: { color: '#FFFFFF', fontFamily: font.bold, fontSize: 18 }, subtitle: { color: 'rgba(255,255,255,.75)', fontSize: 12 },
  content: { padding: 20, gap: 16 }, hero: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 22, alignItems: 'center' }, heroTitle: { color: colors.text, fontSize: 17, marginTop: 10 }, hint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' }, card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 18 }, tokenHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -7, marginBottom: 16 }, error: { color: colors.danger, textAlign: 'center', fontSize: 13, marginBottom: 14 }, separator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 }, line: { height: StyleSheet.hairlineWidth, flex: 1, backgroundColor: colors.border }, or: { color: colors.muted, fontSize: 12 },
});
