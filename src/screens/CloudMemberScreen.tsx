import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppText from '../components/AppText';
import { BackArrowIcon, CloudIcon } from '../components/ServiceIcon';
import { t } from '../i18n';
import { colors, font, radius } from '../theme';

type Props = { configured: boolean; onBack: () => void; onSignIn: (input: { email: string; password: string }) => Promise<void> };
const emailValid = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

export default function CloudMemberScreen({ configured, onBack, onSignIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (!configured) { setError(t.cloudMember.notConfigured); return; }
    if (!emailValid(email) || password.length < 8) { setError(t.cloudMember.invalidInput); return; }
    setBusy(true); setError('');
    try { await onSignIn({ email, password }); } catch { setError(t.cloudMember.signInError); } finally { setBusy(false); }
  };
  return <View style={styles.screen}>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.back}><BackArrowIcon size={26} color="#FFFFFF" /></Pressable><View style={styles.headerText}><AppText bold style={styles.title}>{t.cloudMember.title}</AppText><AppText style={styles.subtitle}>{t.cloudMember.subtitle}</AppText></View><View style={styles.back} /></View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.hero}><CloudIcon size={34} color={colors.primary} /><AppText bold style={styles.heroTitle}>{t.cloudMember.heroTitle}</AppText><AppText style={styles.hint}>{t.cloudMember.hint}</AppText></View><View style={styles.card}><AppInput label={t.cloudOwner.email} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" /><AppInput label={t.cloudOwner.password} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} />{error ? <AppText style={styles.error}>{error}</AppText> : null}{busy ? <ActivityIndicator color={colors.header} /> : <AppButton label={t.cloudMember.signIn} fullWidth onPress={() => { void submit(); }} />}</View></ScrollView></KeyboardAvoidingView>
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg }, flex: { flex: 1 }, header: { minHeight: 64, backgroundColor: colors.header, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1, alignItems: 'center' }, title: { color: '#FFFFFF', fontFamily: font.bold, fontSize: 18 }, subtitle: { color: 'rgba(255,255,255,.75)', fontSize: 12 }, content: { padding: 20, gap: 16 }, hero: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 22, alignItems: 'center' }, heroTitle: { color: colors.text, fontSize: 17, marginTop: 10 }, hint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' }, card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 18 }, error: { color: colors.danger, textAlign: 'center', fontSize: 13, marginBottom: 14 } });
