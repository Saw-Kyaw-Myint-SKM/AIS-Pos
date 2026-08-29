import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { CreditLedgerRow, CreditStatus } from '../db';
import { formatDateTimeMM, formatKyat, t } from '../i18n';
import { colors, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import { BackArrowIcon } from '../components/ServiceIcon';

type Props = { ledger: CreditLedgerRow[]; onBack: () => void; onSettle: (credit: CreditLedgerRow) => void };

export default function CreditLedgerScreen({ ledger, onBack, onSettle }: Props) {
  const [filter, setFilter] = useState<CreditStatus>('unpaid');
  const rows = useMemo(() => ledger.filter((row) => row.status === filter), [filter, ledger]);
  const requestSettlement = (row: CreditLedgerRow) => Alert.alert(t.credit.settleTitle, `${row.customerName}\n${formatKyat(row.balance)}\n${t.credit.settleBody}`, [
    { text: t.credit.cancel, style: 'cancel' },
    { text: t.credit.settle, onPress: () => onSettle(row) },
  ]);

  return <View style={styles.screen}>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><BackArrowIcon size={24} color="#FFFFFF" /></Pressable><AppText bold style={styles.title}>{t.credit.ledgerTitle}</AppText></View>
    <View style={styles.filters}>{(['unpaid', 'settled'] as CreditStatus[]).map((status) => <Pressable key={status} accessibilityRole="button" onPress={() => setFilter(status)} style={[styles.filter, filter === status && styles.filterSelected]}><AppText bold style={[styles.filterText, filter === status && styles.filterTextSelected]}>{status === 'unpaid' ? t.credit.unpaid : t.credit.settled}</AppText></Pressable>)}</View>
    <FlatList data={rows} keyExtractor={(row) => String(row.id)} contentContainerStyle={styles.list} renderItem={({ item }) => <View style={styles.card}>
      <View style={styles.cardTop}><View style={styles.person}><View style={styles.avatar}><AppText bold style={styles.avatarText}>{item.customerName.trim().charAt(0)}</AppText></View><View><AppText bold style={styles.name}>{item.customerName}</AppText><AppText style={styles.phone}>{item.customerPhone}</AppText></View></View><View style={[styles.status, item.status === 'settled' && styles.statusDone]}><AppText bold style={[styles.statusText, item.status === 'settled' && styles.statusTextDone]}>{item.status === 'unpaid' ? t.credit.unpaid : t.credit.settled}</AppText></View></View>
      <AppText style={styles.date}>{formatDateTimeMM(item.createdAt)}</AppText>
      <View style={styles.amounts}><View><AppText style={styles.amountLabel}>{t.credit.total}</AppText><AppText bold style={styles.amountValue}>{formatKyat(item.total)}</AppText></View><View><AppText style={styles.amountLabel}>{t.credit.paid}</AppText><AppText bold style={styles.amountValue}>{formatKyat(item.paidAmount)}</AppText></View><View><AppText style={styles.amountLabel}>{t.credit.remaining}</AppText><AppText bold style={styles.balance}>{formatKyat(item.balance)}</AppText></View></View>
      {item.status === 'unpaid' ? <Pressable accessibilityRole="button" onPress={() => requestSettlement(item)} style={styles.settleButton}><AppText bold style={styles.settleText}>{t.credit.settle}</AppText></Pressable> : null}
    </View>} ListEmptyComponent={<EmptyState title={filter === 'unpaid' ? t.credit.emptyUnpaid : t.credit.emptySettled} />} />
  </View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F5F5F5' }, header: { minHeight: 58, backgroundColor: '#4A6CF7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, title: { color: '#FFFFFF', fontSize: 18, marginLeft: 4 }, filters: { flexDirection: 'row', padding: 12, gap: 8 }, filter: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, filterSelected: { backgroundColor: colors.header, borderColor: colors.header }, filterText: { color: colors.muted, fontSize: 13 }, filterTextSelected: { color: '#FFFFFF' }, list: { padding: 12, paddingTop: 0, flexGrow: 1 }, card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 13, marginBottom: 10, ...shadow }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, person: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft, marginRight: 9 }, avatarText: { color: colors.header, fontSize: 16 }, name: { color: colors.text, fontSize: 15 }, phone: { color: colors.muted, fontSize: 11 }, status: { backgroundColor: colors.dangerSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, statusDone: { backgroundColor: colors.successSoft }, statusText: { color: colors.danger, fontSize: 10 }, statusTextDone: { color: colors.success, fontSize: 10 }, date: { color: colors.muted, fontSize: 10, marginTop: 9 }, amounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }, amountLabel: { color: colors.muted, fontSize: 10 }, amountValue: { color: colors.text, fontSize: 11, marginTop: 2 }, balance: { color: colors.danger, fontSize: 11, marginTop: 2 }, settleButton: { marginTop: 12, backgroundColor: colors.header, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm }, settleText: { color: '#FFFFFF', fontSize: 13 } });
