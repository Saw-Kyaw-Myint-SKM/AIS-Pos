import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppText from '../components/AppText';
import { BackArrowIcon, CloudIcon } from '../components/ServiceIcon';
import { t } from '../i18n';
import { colors, font, radius } from '../theme';
import type { SyncMode } from '../db';
import type { ShopRole } from '../supabase';
import type { SyncStatus } from '../sync';

type Props = {
  role: ShopRole | null;
  configured: boolean;
  mode: SyncMode;
  onSetMode: (mode: SyncMode) => void;
  status: SyncStatus;
  syncing: boolean;
  onBack: () => void;
  onSync: () => void;
  onRequestMigration: () => void;
  onSignIn: () => void;
};

function SyncRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.rowLabel}>{label}</AppText>
      <AppText bold style={[styles.rowValue, danger && styles.danger]}>{value}</AppText>
    </View>
  );
}

export default function SyncScreen({ role, configured, mode, onSetMode, status, syncing, onBack, onSync, onRequestMigration, onSignIn }: Props) {
  const isOnline = mode === 'online';
  const isOwner = role === 'owner';
  const statusLabel = !isOnline ? t.sync.offlineMode : configured ? t.sync.ready : t.sync.notConfigured;
  const canSync = isOnline && configured && role !== null && !syncing;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerButton}>
          <BackArrowIcon size={26} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerText}>
          <AppText bold style={styles.title}>{t.sync.title}</AppText>
          <AppText style={styles.subtitle}>{t.sync.subtitle}</AppText>
        </View>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><CloudIcon size={34} color={colors.primary} /></View>
          <AppText bold style={styles.heroTitle}>{statusLabel}</AppText>
          <AppText style={styles.heroBody}>{!isOnline ? t.sync.offlineHint : configured ? t.sync.onlineHint : t.sync.notConfiguredHint}</AppText>
        </View>

        <View style={styles.modeCard}>
          <AppText bold style={styles.modeTitle}>{t.sync.mode}</AppText>
          <View style={styles.modeRow}>
            <Pressable accessibilityRole="button" onPress={() => onSetMode('offline')} style={[styles.modeButton, mode === 'offline' && styles.modeButtonActive]}><AppText bold style={[styles.modeText, mode === 'offline' && styles.modeTextActive]}>{t.sync.offlineMode}</AppText></Pressable>
            <Pressable accessibilityRole="button" onPress={() => onSetMode('online')} style={[styles.modeButton, mode === 'online' && styles.modeButtonActive]}><AppText bold style={[styles.modeText, mode === 'online' && styles.modeTextActive]}>{t.sync.onlineMode}</AppText></Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <SyncRow label={t.sync.accountRole} value={role === 'owner' ? t.sync.owner : role === 'admin' ? t.sync.admin : role === 'staff' ? t.sync.staff : t.sync.notSignedIn} />
          <SyncRow label={t.sync.pending} value={String(status.pendingCount + status.syncingCount + status.failedCount)} />
          <SyncRow label={t.sync.conflicts} value={String(status.conflictCount)} danger={status.conflictCount > 0} />
          <SyncRow label={t.sync.lastSync} value={status.lastSyncedAt ?? t.sync.never} />
          {status.lastError ? <SyncRow label={t.sync.lastError} value={status.lastError} danger /> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canSync}
          onPress={onSync}
          style={({ pressed }) => [styles.primaryButton, (!canSync || pressed) && styles.buttonDisabled]}
        >
          {syncing ? <ActivityIndicator color="#FFFFFF" /> : <AppText bold style={styles.primaryText}>{t.sync.syncNow}</AppText>}
        </Pressable>

        {!role && configured && isOnline ? <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.outlineButton}><AppText bold style={styles.outlineText}>{t.cloudMember.signIn}</AppText></Pressable> : null}

        {isOwner ? (
          <View style={styles.migrationCard}>
            <AppText bold style={styles.migrationTitle}>{t.sync.migrationTitle}</AppText>
            <AppText style={styles.migrationBody}>{t.sync.migrationHint}</AppText>
            <Pressable
              accessibilityRole="button"
              disabled={!configured || syncing || status.migrationCompleted}
              onPress={onRequestMigration}
              style={({ pressed }) => [styles.outlineButton, (!configured || syncing || status.migrationCompleted || pressed) && styles.outlineDisabled]}
            >
              <AppText bold style={styles.outlineText}>{status.migrationCompleted ? t.sync.migrationComplete : t.sync.migrationAction}</AppText>
            </Pressable>
          </View>
        ) : <AppText style={styles.staffHint}>{t.sync.staffHint}</AppText>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { minHeight: 64, backgroundColor: colors.header, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  headerButton: { height: 42, width: 42, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 18, fontFamily: font.bold },
  subtitle: { color: 'rgba(255,255,255,0.74)', fontSize: 12, marginTop: 2 },
  content: { padding: 20, gap: 16 },
  hero: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, alignItems: 'center' },
  heroIcon: { width: 62, height: 62, borderRadius: 31, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.accentSoft },
  heroTitle: { marginTop: 14, color: colors.text, fontSize: 17 },
  heroBody: { marginTop: 5, color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  modeCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16 },
  modeTitle: { color: colors.text, fontSize: 14, marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeButton: { flex: 1, minHeight: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: colors.header, borderColor: colors.header },
  modeText: { color: colors.muted, fontSize: 13 },
  modeTextActive: { color: '#FFFFFF' },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  row: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 14 },
  rowLabel: { color: colors.muted, fontSize: 13, flex: 1 },
  rowValue: { color: colors.text, fontSize: 13, maxWidth: '55%', textAlign: 'right' },
  danger: { color: colors.danger },
  primaryButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 15 },
  buttonDisabled: { opacity: 0.55 },
  migrationCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 18 },
  migrationTitle: { color: colors.text, fontSize: 15 },
  migrationBody: { color: colors.muted, marginTop: 6, lineHeight: 20, fontSize: 13 },
  outlineButton: { marginTop: 16, minHeight: 46, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  outlineText: { color: colors.primary, fontSize: 14 },
  outlineDisabled: { opacity: 0.45 },
  staffHint: { color: colors.muted, textAlign: 'center', fontSize: 13, lineHeight: 20 },
});
