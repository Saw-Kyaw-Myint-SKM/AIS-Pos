import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppText from '../components/AppText';
import { type LocalAccount } from '../db';
import { t } from '../i18n';
import { colors, font } from '../theme';

type Props = { actor: LocalAccount; accounts: LocalAccount[]; onBack: () => void; onCreate: () => void; onToggle: (account: LocalAccount) => void };
const roleLabel = (role: LocalAccount['role']) => role === 'owner' ? t.auth.owner : role === 'admin' ? t.auth.admin : t.auth.staff;

export default function AccountsScreen({ actor, accounts, onBack, onCreate, onToggle }: Props) {
  const visible = accounts.filter((account) => actor.role === 'owner' ? account.role !== 'owner' : account.role === 'staff');
  return <View style={styles.screen}><View style={styles.header}><Pressable onPress={onBack} style={styles.back}><AppText style={styles.backText}>‹</AppText></Pressable><AppText bold style={styles.title}>{t.auth.accounts}</AppText><View style={styles.back} /></View><ScrollView contentContainerStyle={styles.scroll}>{visible.length ? visible.map((account) => <View key={account.id} style={styles.card}><View style={styles.info}><AppText bold style={styles.name}>{account.name}</AppText><AppText style={styles.detail}>{account.email}</AppText><AppText style={styles.detail}>{roleLabel(account.role)} · {account.isActive ? t.auth.active : t.auth.disabled}</AppText></View><Pressable onPress={() => onToggle(account)} style={[styles.toggle, !account.isActive && styles.enable]}><AppText bold style={[styles.toggleText, !account.isActive && styles.enableText]}>{account.isActive ? t.auth.disable : t.auth.enable}</AppText></Pressable></View>) : <AppText style={styles.empty}>{t.auth.noManagedAccounts}</AppText>}<AppButton label={t.auth.addAccount} onPress={onCreate} fullWidth /></ScrollView></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg }, header: { minHeight: 60, backgroundColor: colors.header, alignItems: 'center', flexDirection: 'row', paddingHorizontal: 12 }, back: { width: 42, alignItems: 'center' }, backText: { color: '#fff', fontSize: 32, lineHeight: 36 }, title: { flex: 1, color: '#fff', fontFamily: font.bold, fontSize: 18, textAlign: 'center' }, scroll: { padding: 20, gap: 12 }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' }, info: { flex: 1 }, name: { color: colors.text, fontSize: 16 }, detail: { color: colors.muted, fontSize: 12, marginTop: 3 }, toggle: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.dangerSoft }, toggleText: { color: colors.danger, fontSize: 12 }, enable: { backgroundColor: colors.successSoft }, enableText: { color: colors.header }, empty: { color: colors.muted, textAlign: 'center', paddingVertical: 36, fontSize: 14 } });
