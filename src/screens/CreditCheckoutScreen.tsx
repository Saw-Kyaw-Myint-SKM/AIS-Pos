import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { Customer } from '../db';
import type { CartLine } from '../components/CartSheet';
import { formatKyat, t, toMM } from '../i18n';
import { colors, font, radius, shadow } from '../theme';
import AppButton from '../components/AppButton';
import AppText from '../components/AppText';
import { BackArrowIcon } from '../components/ServiceIcon';

type Props = {
  lines: CartLine[];
  total: number;
  customers: Customer[];
  onBack: () => void;
  onCreateCustomer: () => void;
  onConfirm: (customerId: number, initialPaid: number) => Promise<void>;
};

export default function CreditCheckoutScreen({ lines, total, customers, onBack, onCreateCustomer, onConfirm }: Props) {
  const [customerId, setCustomerId] = useState<number | null>(customers[0]?.id ?? null);
  const [paymentText, setPaymentText] = useState('0');
  const [saving, setSaving] = useState(false);
  const balance = useMemo(() => Math.max(0, total - (Number(paymentText) || 0)), [paymentText, total]);

  const submit = async () => {
    const paid = Number(paymentText);
    if (!customerId) { Alert.alert(t.credit.customerRequired); return; }
    if (!Number.isFinite(paid) || paid < 0 || paid >= total) { Alert.alert(t.credit.invalidPayment); return; }
    setSaving(true);
    try { await onConfirm(customerId, paid); } finally { setSaving(false); }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><BackArrowIcon size={24} color="#FFFFFF" /></Pressable>
        <AppText bold style={styles.title}>{t.credit.checkoutTitle}</AppText>
      </View>
      <FlatList
        data={lines}
        keyExtractor={(line) => String(line.item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <>
            <AppText bold style={styles.sectionTitle}>{t.credit.chooseCustomer}</AppText>
            {customers.length === 0 ? (
              <AppButton label={t.credit.addCustomerFirst} variant="outline" fullWidth onPress={onCreateCustomer} />
            ) : (
              <View style={styles.customerList}>{customers.map((customer) => {
                const selected = customer.id === customerId;
                return <Pressable key={customer.id} accessibilityRole="button" onPress={() => setCustomerId(customer.id)} style={[styles.customer, selected && styles.customerSelected]}>
                  <View style={styles.radio}>{selected ? <View style={styles.radioInner} /> : null}</View>
                  <View><AppText bold style={styles.customerName}>{customer.name}</AppText><AppText style={styles.customerMeta}>{customer.phone}</AppText></View>
                </Pressable>;
              })}</View>
            )}
            <Pressable accessibilityRole="button" onPress={onCreateCustomer} style={styles.addCustomer}><AppText bold style={styles.addCustomerText}>{t.credit.addCustomer}</AppText></Pressable>
            <AppText bold style={styles.sectionTitle}>{t.credit.items}</AppText>
          </>
        )}
        renderItem={({ item: line }) => <View style={styles.line}><View style={styles.lineInfo}><AppText bold style={styles.lineName}>{line.item.name}</AppText><AppText style={styles.lineMeta}>{toMM(line.quantity)} {t.sell.piece} × {formatKyat(line.item.price)}</AppText></View><AppText bold style={styles.lineTotal}>{formatKyat(line.item.price * line.quantity)}</AppText></View>}
        ListFooterComponent={(
          <View style={styles.summary}>
            <View style={styles.totalRow}><AppText bold style={styles.totalLabel}>{t.credit.total}</AppText><AppText bold style={styles.totalValue}>{formatKyat(total)}</AppText></View>
            <AppText style={styles.paymentLabel}>{t.credit.initialPayment}</AppText>
            <TextInput value={paymentText} onChangeText={(value) => setPaymentText(value.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={styles.paymentInput} placeholder="၀" placeholderTextColor={colors.muted} />
            <View style={styles.balanceRow}><AppText bold style={styles.balanceLabel}>{t.credit.remaining}</AppText><AppText bold style={styles.balanceValue}>{formatKyat(balance)}</AppText></View>
            <AppButton label={t.credit.confirm} fullWidth onPress={submit} disabled={saving || !lines.length || !customers.length} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' }, header: { minHeight: 58, backgroundColor: '#4A6CF7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, back: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' }, title: { color: '#FFFFFF', fontSize: 18, marginLeft: 4 }, content: { padding: 14, paddingBottom: 30 }, sectionTitle: { color: colors.text, fontSize: 15, marginBottom: 8, marginTop: 4 }, customerList: { gap: 8 }, customer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }, customerSelected: { borderColor: colors.header, backgroundColor: colors.accentSoft }, radio: { width: 20, height: 20, borderWidth: 2, borderColor: colors.header, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 }, radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.header }, customerName: { color: colors.text, fontSize: 14 }, customerMeta: { color: colors.muted, fontSize: 11 }, addCustomer: { alignSelf: 'flex-start', paddingVertical: 10 }, addCustomerText: { color: colors.header, fontSize: 13 }, line: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 8, ...shadow }, lineInfo: { flex: 1 }, lineName: { color: colors.text, fontSize: 14 }, lineMeta: { color: colors.muted, fontSize: 11, marginTop: 2 }, lineTotal: { color: colors.header, fontSize: 12 }, summary: { marginTop: 10, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, ...shadow }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, totalLabel: { color: colors.text, fontSize: 15 }, totalValue: { color: colors.header, fontSize: 16 }, paymentLabel: { color: colors.muted, fontSize: 12, marginBottom: 5 }, paymentInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: font.regular, color: colors.text, fontSize: 16 }, balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 14 }, balanceLabel: { color: colors.text, fontSize: 14 }, balanceValue: { color: colors.danger, fontSize: 15 },
});
