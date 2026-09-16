import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import type { ProfitSummary } from '../db';
import { formatDateMM, formatKyat, startOfDay, t, toMM } from '../i18n';
import { colors, font, shadow } from '../theme';
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
      Alert.alert(t.profit.loadError);
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
  const profit = summary?.profit ?? 0;
  const profitColor = profit >= 0 ? '#15803D' : '#B91C1C';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <BackArrowIcon size={22} color="#FFFFFF" />
        </Pressable>
        <AppText bold style={styles.title}>{t.profit.title}</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.main}>
        <View style={styles.rangeCard}>
          <Pressable onPress={() => setPickerTarget('start')} accessibilityRole="button" style={styles.dateBlock}>
            <AppText style={styles.dateLabel}>{t.history.startDate}</AppText>
            <AppText bold style={styles.dateValue}>{formatDateMM(startDate)}</AppText>
          </Pressable>
          <View style={styles.rangeDivider} />
          <Pressable onPress={() => setPickerTarget('end')} accessibilityRole="button" style={styles.dateBlock}>
            <AppText style={styles.dateLabel}>{t.history.endDate}</AppText>
            <AppText bold style={styles.dateValue}>{formatDateMM(endDate)}</AppText>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.header} /></View>
        ) : isEmpty ? (
          <View style={styles.emptyWrap}><EmptyState title={t.profit.empty} /></View>
        ) : (
          <View style={styles.content}>
            <AppText bold style={styles.periodHeading}>{t.profit.periodSummary}</AppText>
            <View style={styles.statementCard}>
              <View style={styles.statementRow}>
                <AppText style={styles.rowLabel}>{t.profit.revenue}</AppText>
                <AppText bold style={styles.revenueValue}>{formatKyat(summary?.revenue ?? 0)}</AppText>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.statementRow}>
                <AppText style={styles.rowLabel}>{t.profit.cost}</AppText>
                <AppText bold style={styles.costValue}>− {formatKyat(summary?.cost ?? 0)}</AppText>
              </View>
              <View style={styles.profitBlock}>
                <AppText style={styles.profitLabel}>{t.profit.netProfit}</AppText>
                <AppText bold style={[styles.profitValue, { color: profitColor }]}>{formatKyat(profit)}</AppText>
                <View style={styles.marginBadge}>
                  <AppText bold style={styles.marginText}>
                    {t.profit.profitPercentage} {toMM((summary?.profitPercentage ?? 0).toFixed(1))}%
                  </AppText>
                </View>
              </View>
            </View>

            <View style={styles.countStrip}>
              <AppText style={styles.countLabel}>{t.profit.saleCount}</AppText>
              <View style={styles.countValueWrap}>
                <AppText bold style={styles.countValue}>{toMM(summary?.saleCount ?? 0)}</AppText>
                <AppText style={styles.countUnit}> {t.home.bills}</AppText>
              </View>
            </View>
          </View>
        )}
      </View>

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F6FB' },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A6CF7', paddingHorizontal: 12 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 19, textAlign: 'center', fontFamily: font.bold },
  headerSpacer: { width: 42 },
  main: { flex: 1, padding: 20 },
  rangeCard: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: '#E4E5F0', ...shadow },
  dateBlock: { flex: 1, minHeight: 74, justifyContent: 'center', paddingHorizontal: 14 },
  rangeDivider: { width: 1, marginVertical: 13, backgroundColor: '#E4E5F0' },
  dateLabel: { color: colors.muted, fontSize: 12 },
  dateValue: { color: colors.text, fontSize: 14, marginTop: 5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  content: { marginTop: 28 },
  periodHeading: { color: '#5B5E7C', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  statementCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, ...shadow },
  statementRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLabel: { color: '#667085', fontSize: 15 },
  revenueValue: { color: colors.header, fontSize: 18 },
  costValue: { color: '#C2410C', fontSize: 18 },
  rowDivider: { height: 1, backgroundColor: '#EEF0F5', marginVertical: 5 },
  profitBlock: { alignItems: 'center', marginTop: 15, borderRadius: 14, backgroundColor: '#EEF8F2', paddingHorizontal: 16, paddingVertical: 18 },
  profitLabel: { color: '#35704A', fontSize: 14 },
  profitValue: { fontSize: 28, marginTop: 5 },
  marginBadge: { marginTop: 10, borderRadius: 999, backgroundColor: '#D9F0E1', paddingHorizontal: 11, paddingVertical: 5 },
  marginText: { color: '#35704A', fontSize: 12 },
  countStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E5F0', paddingHorizontal: 18, paddingVertical: 15 },
  countLabel: { color: '#667085', fontSize: 14 },
  countValueWrap: { flexDirection: 'row', alignItems: 'baseline' },
  countValue: { color: colors.header, fontSize: 20 },
  countUnit: { color: '#667085', fontSize: 13 },
});
