import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import type { ProfitSummary } from '../db';
import { formatDateMM, formatKyat, startOfDay, t, toMM } from '../i18n';
import { colors, font, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import DatePickerModal from '../components/DatePickerModal';
import EmptyState from '../components/EmptyState';
import { BackArrowIcon } from '../components/ServiceIcon';

type PickerTarget = 'start' | 'end';

type Props = {
  onBack: () => void;
  onLoad: (startInclusive: Date, endExclusive: Date) => Promise<ProfitSummary>;
};

function todayStart(): Date {
  return startOfDay(new Date());
}

function nextDayStart(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + 1);
  return next;
}

export default function ProfitReportScreen({ onBack, onLoad }: Props) {
  const [startDate, setStartDate] = useState<Date>(todayStart());
  const [endDate, setEndDate] = useState<Date>(todayStart());
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await onLoad(startOfDay(startDate), nextDayStart(endDate)));
    } catch {
      Alert.alert(t.profit.resetError);
    } finally {
      setLoading(false);
    }
  }, [endDate, onLoad, startDate]);

  useEffect(() => { load(); }, [load]);

  const selectDate = (date: Date) => {
    if (pickerTarget === 'start') {
      const normalized = startOfDay(date);
      setStartDate(normalized);
      if (normalized > endDate) setEndDate(normalized);
    } else if (pickerTarget === 'end') {
      const normalized = startOfDay(date);
      if (normalized < startDate) {
        Alert.alert(t.history.datePicker.invalidRange);
      } else {
        setEndDate(normalized);
      }
    }
    setPickerTarget(null);
  };

  const isEmpty = !loading && (summary?.saleCount ?? 0) === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <BackArrowIcon size={22} color="#FFFFFF" />
        </Pressable>
        <AppText bold style={styles.title}>{t.profit.title}</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.rangeBar}>
        <Pressable onPress={() => setPickerTarget('start')} accessibilityRole="button" style={styles.dateButton}>
          <AppText style={styles.dateLabel}>{t.history.startDate}</AppText>
          <AppText bold style={styles.dateValue}>{formatDateMM(startDate)}</AppText>
        </Pressable>
        <AppText style={styles.arrow}>→</AppText>
        <Pressable onPress={() => setPickerTarget('end')} accessibilityRole="button" style={styles.dateButton}>
          <AppText style={styles.dateLabel}>{t.history.endDate}</AppText>
          <AppText bold style={styles.dateValue}>{formatDateMM(endDate)}</AppText>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : isEmpty ? (
        <EmptyState title={t.profit.empty} />
      ) : (
        <View style={styles.content}>
          <View style={styles.saleCount}>
            <AppText style={styles.saleCountLabel}>{t.profit.saleCount}</AppText>
            <AppText bold style={styles.saleCountValue}>{toMM(summary?.saleCount ?? 0)}</AppText>
          </View>
          <SummaryCard label={t.profit.revenue} value={formatKyat(summary?.revenue ?? 0)} color={colors.primary} />
          <SummaryCard label={t.profit.cost} value={formatKyat(summary?.cost ?? 0)} color={colors.danger} />
          <SummaryCard label={t.profit.netProfit} value={formatKyat(summary?.profit ?? 0)} color={colors.success} emphasis />
          <SummaryCard label={t.profit.profitPercentage} value={`${toMM((summary?.profitPercentage ?? 0).toFixed(1))}%`} color={colors.accent} />
        </View>
      )}

      <DatePickerModal
        visible={pickerTarget !== null}
        title={pickerTarget === 'end' ? t.history.datePicker.endTitle : t.history.datePicker.startTitle}
        initialDate={pickerTarget === 'end' ? endDate : startDate}
        onClose={() => setPickerTarget(null)}
        onSelect={selectDate}
      />
    </View>
  );
}

function SummaryCard({ label, value, color, emphasis = false }: { label: string; value: string; color: string; emphasis?: boolean }) {
  return (
    <View style={[styles.card, emphasis && styles.emphasisCard]}>
      <AppText style={styles.cardLabel}>{label}</AppText>
      <AppText bold style={[styles.cardValue, { color }]}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A6CF7', paddingHorizontal: 12 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 19, textAlign: 'center', fontFamily: font.bold },
  headerSpacer: { width: 42 },
  rangeBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  dateButton: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9, ...shadow },
  dateLabel: { color: colors.muted, fontSize: 12 },
  dateValue: { color: colors.text, fontSize: 14, marginTop: 2 },
  arrow: { color: colors.muted, fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, gap: 12 },
  saleCount: { alignItems: 'center', marginBottom: 4 },
  saleCountLabel: { color: colors.muted, fontSize: 13 },
  saleCountValue: { color: colors.text, fontSize: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 18, ...shadow },
  emphasisCard: { backgroundColor: colors.successSoft },
  cardLabel: { color: colors.muted, fontSize: 14 },
  cardValue: { fontSize: 22, marginTop: 5 },
});
