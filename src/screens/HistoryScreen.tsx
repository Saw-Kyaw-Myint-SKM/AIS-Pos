import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { Sale } from '../db';
import {
  endOfDay, formatDateMM, parseDbDate, startOfDay, t, toMM,
} from '../i18n';
import { colors, font, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import DatePickerModal from '../components/DatePickerModal';

type Props = {
  sales: Sale[];
  onOpen: (saleId: number) => void;
};

type PickerTarget = 'start' | 'end';

function startOfToday(): Date {
  return startOfDay(new Date());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export default function HistoryScreen({ sales, onOpen }: Props) {
  const [startDate, setStartDate] = useState<Date>(startOfToday());
  const [endDate, setEndDate] = useState<Date>(startOfToday());
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  const isFiltered = !isSameDay(startDate, new Date())
    || !isSameDay(endDate, new Date())
    || startDate.getTime() !== endDate.getTime();

  const startMs = startOfDay(startDate).getTime();
  const endMs = endOfDay(endDate).getTime();

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const t = parseDbDate(sale.createdAt).getTime();
      return t >= startMs && t <= endMs;
    });
  }, [sales, startMs, endMs]);

  const summary = useMemo(() => {
    const total = filteredSales.reduce((sum, s) => sum + s.total, 0);
    return { count: filteredSales.length, total };
  }, [filteredSales]);

  const openPicker = (target: PickerTarget) => setPickerTarget(target);
  const closePicker = () => setPickerTarget(null);

  const handleSelectDate = (date: Date) => {
    if (!pickerTarget) return;
    if (pickerTarget === 'start') {
      const normalized = startOfDay(date);
      setStartDate(normalized);
      if (normalized.getTime() > endOfDay(endDate).getTime()) {
        setEndDate(normalized);
      }
    } else {
      const normalized = startOfDay(date);
      if (normalized.getTime() < startOfDay(startDate).getTime()) {
        Alert.alert(t.history.datePicker.invalidRange);
        closePicker();
        return;
      }
      setEndDate(normalized);
    }
    closePicker();
  };

  const handleClearFilter = () => {
    const today = startOfToday();
    setStartDate(today);
    setEndDate(today);
  };

  const pickerInitial = pickerTarget === 'end' ? endDate : startDate;
  const pickerTitle = pickerTarget === 'end'
    ? t.history.datePicker.endTitle
    : t.history.datePicker.startTitle;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AppText bold style={styles.title}>{t.history.title}</AppText>
      </View>

      <View style={styles.rangeBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => openPicker('start')}
          style={({ pressed }) => [styles.dateBtn, pressed && styles.pressed]}
        >
          <AppText style={styles.dateLabel}>{t.history.startDate}</AppText>
          <AppText bold style={styles.dateValue}>{formatDateMM(startDate)}</AppText>
        </Pressable>
        <AppText style={styles.rangeArrow}>→</AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => openPicker('end')}
          style={({ pressed }) => [styles.dateBtn, pressed && styles.pressed]}
        >
          <AppText style={styles.dateLabel}>{t.history.endDate}</AppText>
          <AppText bold style={styles.dateValue}>{formatDateMM(endDate)}</AppText>
        </Pressable>
        {isFiltered ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleClearFilter}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <AppText bold style={styles.clearText}>✕</AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryCardLeft]}>
          <AppText style={styles.summaryLabel}>{t.history.billCount}</AppText>
          <AppText bold style={styles.summaryValue}>{toMM(summary.count)}</AppText>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardRight]}>
          <AppText style={styles.summaryLabel}>{t.history.totalAmount}</AppText>
          <AppText bold style={styles.summaryValue}>{formatKyat(summary.total)}</AppText>
        </View>
      </View>

      <FlatList
        data={filteredSales}
        keyExtractor={(sale) => String(sale.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpen(item.id)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.billBadge}>
              <AppText bold style={styles.billText}>#{toMM(item.id)}</AppText>
            </View>
            <View style={styles.info}>
              <AppText style={styles.dateLine}>{formatDateMM(parseDbDate(item.createdAt))}</AppText>
              <AppText style={styles.meta}>{toMM(item.itemCount)} {t.sell.piece}</AppText>
            </View>
            <AppText bold style={styles.total}>{formatKyat(item.total)}</AppText>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title={isFiltered ? t.history.emptyFiltered : t.history.empty}
          />
        }
      />

      <DatePickerModal
        visible={pickerTarget !== null}
        title={pickerTitle}
        initialDate={pickerInitial}
        onClose={closePicker}
        onSelect={handleSelectDate}
      />
    </View>
  );
}

function formatKyat(value: number): string {
  const formatted = Math.round(value).toLocaleString('en-US');
  return `${toMM(formatted)} ကျပ်`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#4A6CF7', minHeight: 56, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  title: { color: '#fff', fontSize: 18 },

  rangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
  },
  dateBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    ...shadow,
  },
  pressed: { opacity: 0.85 },
  dateLabel: {
    color: colors.muted,
    fontSize: 10,
    fontFamily: font.regular,
  },
  dateValue: { color: colors.text, fontSize: 11, marginTop: 1 },
  rangeArrow: { color: colors.muted, fontSize: 13 },
  clearBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  clearText: { color: colors.danger, fontSize: 13 },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...shadow,
  },
  summaryCardLeft: {},
  summaryCardRight: {},
  summaryLabel: {
    color: colors.muted,
    fontSize: 10,
    fontFamily: font.regular,
  },
  summaryValue: { color: '#4A6CF7', fontSize: 16, marginTop: 2 },

  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingVertical: 8, paddingHorizontal: 10,
    marginBottom: 8, ...shadow,
  },
  billBadge: {
    minWidth: 42, height: 34, borderRadius: 10, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  billText: { color: colors.header, fontSize: 12 },
  info: { flex: 1 },
  dateLine: { color: colors.text, fontSize: 11 },
  meta: { color: colors.muted, fontSize: 10, marginTop: 2 },
  total: { color: colors.header, fontSize: 13 },
});
