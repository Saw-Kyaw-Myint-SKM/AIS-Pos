import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppText from '../components/AppText';
import { t } from '../i18n';
import { colors, font } from '../theme';
import type { LocalAccountRole } from '../db';

type Props = { actorRole: LocalAccountRole; onBack: () => void; onSave: (input: { name: string; email: string; password: string; role: LocalAccountRole }) => Promise<void> };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountFormScreen({ actorRole, onBack, onSave }: Props) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [role, setRole] = useState<LocalAccountRole>(actorRole === 'admin' ? 'staff' : 'staff'); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const roles: LocalAccountRole[] = actorRole === 'owner' ? ['admin', 'staff'] : ['staff'];
  const save = useCallback(async () => { if (saving) return; if (!name.trim() || !EMAIL_RE.test(email.trim()) || password.length < 8) { setError(!password || password.length < 8 ? t.auth.passwordShort : t.auth.invalidEmail); return; } setSaving(true); setError(''); try { await onSave({ name: name.trim(), email: email.trim().toLowerCase(), password, role }); } catch { setError(t.auth.setupError); } finally { setSaving(false); } }, [email, name, onSave, password, role, saving]);
  return <View style={styles.screen}><View style={styles.header}><Pressable onPress={onBack} style={styles.back}><AppText style={styles.backText}>‹</AppText></Pressable><AppText bold style={styles.title}>{t.auth.addAccount}</AppText><View style={styles.back} /></View><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><AppInput label={t.auth.accountName} value={name} onChangeText={setName} autoCapitalize="words" /><AppInput label={t.auth.email} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" /><AppText style={styles.label}>{t.auth.role}</AppText><View style={styles.roles}>{roles.map((value) => <Pressable key={value} onPress={() => setRole(value)} style={[styles.role, role === value && styles.roleActive]}><AppText bold style={[styles.roleText, role === value && styles.roleTextActive]}>{value === 'admin' ? t.auth.admin : t.auth.staff}</AppText></Pressable>)}</View><AppInput label={t.auth.temporaryPassword} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} />{error ? <AppText style={styles.error}>{error}</AppText> : null}<AppButton label={t.auth.createAccount} onPress={() => { void save(); }} disabled={saving} fullWidth /></ScrollView></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg }, header: { minHeight: 60, backgroundColor: colors.header, alignItems: 'center', flexDirection: 'row', paddingHorizontal: 12 }, back: { width: 42, alignItems: 'center' }, backText: { color: '#fff', fontSize: 32, lineHeight: 36 }, title: { flex: 1, color: '#fff', fontFamily: font.bold, fontSize: 18, textAlign: 'center' }, scroll: { padding: 20 }, label: { color: colors.text, fontSize: 13, marginBottom: 8 }, roles: { flexDirection: 'row', gap: 10, marginBottom: 18 }, role: { flex: 1, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: colors.surface }, roleActive: { borderColor: colors.header, backgroundColor: colors.accentSoft }, roleText: { color: colors.muted, fontSize: 13 }, roleTextActive: { color: colors.header }, error: { color: colors.danger, textAlign: 'center', marginBottom: 12, fontSize: 13 } });
