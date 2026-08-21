import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import AppText from './AppText';
import AppButton from './AppButton';
import { t } from '../i18n';
import { colors, font, radius, shadow } from '../theme';

type Props = {
  visible: boolean;
  title: string;
  initialDate: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
};

const DAY_LABELS = ['၃၁', '၃၀', '၂၉', '၂၈', '၂၇', '၂၆', '၂၅', '၂၄', '၂၃', '၂၂', '၂၁', '၂၀', '၁၉', '၁၈', '၁၇', '၁၆', '၁၅', '၁၄', '၁၃', '၁၂', '၁၁', '၁၀', '၉', '၈', '၇', '၆', '၅', '၄', '၃', '၂', '၁'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function DatePickerModal({
  visible, title, initialDate, onClose, onSelect,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const [day, setDay] = useState(initialDate.getDate());
  const [month, setMonth] = useState(initialDate.getMonth());
  const [year, setYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (visible) {
      setDay(initialDate.getDate());
      setMonth(initialDate.getMonth());
      setYear(initialDate.getFullYear());
    }
  }, [visible, initialDate]);

  const maxDay = daysInMonth(year, month);
  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [maxDay, day]);

  const yearOptions = useMemo(() => {
    const min = today.getFullYear() - 5;
    const max = today.getFullYear() + 1;
    const out: number[] = [];
    for (let y = min; y <= max; y++) out.push(y);
    return out;
  }, [today]);

  const monthLabels = useMemo(() => {
    const raw = ['ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
      'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'];
    return raw;
  }, []);

  const dayList = useMemo(() => {
    const out: number[] = [];
    for (let d = 1; d <= maxDay; d++) out.push(d);
    return out;
  }, [maxDay]);

  const dayScrollRef = useRef<ScrollView | null>(null);
  const monthScrollRef = useRef<ScrollView | null>(null);
  const yearScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!visible) return;
    const dayIdx = dayList.indexOf(day);
    if (dayIdx >= 0 && dayScrollRef.current) {
      dayScrollRef.current.scrollTo({ y: Math.max(0, dayIdx - 1) * 40, animated: false });
    }
    if (monthScrollRef.current) {
      monthScrollRef.current.scrollTo({ y: Math.max(0, month - 1) * 40, animated: false });
    }
    if (yearScrollRef.current) {
      const idx = yearOptions.indexOf(year);
      yearScrollRef.current.scrollTo({ y: Math.max(0, idx - 1) * 40, animated: false });
    }
  }, [visible, day, month, year, dayList, yearOptions]);

  const setToday = () => {
    setDay(today.getDate());
    setMonth(today.getMonth());
    setYear(today.getFullYear());
  };

  const handleDone = () => {
    onSelect(new Date(year, month, day, 12, 0, 0, 0));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} hitSlop={10}>
              <AppText style={styles.cancelText}>{t.history.datePicker.cancel}</AppText>
            </Pressable>
            <AppText bold style={styles.title}>{title}</AppText>
            <Pressable onPress={handleDone} hitSlop={10}>
              <AppText bold style={styles.doneText}>{t.history.datePicker.done}</AppText>
            </Pressable>
          </View>

          <View style={styles.columns}>
            <View style={styles.column}>
              <AppText style={styles.columnLabel}>{t.history.datePicker.day}</AppText>
              <ScrollView
                ref={dayScrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.columnList}
              >
                {dayList.map((d) => (
                  <Pressable
                    key={`d-${d}`}
                    onPress={() => setDay(d)}
                    style={[styles.option, d === day && styles.optionActive]}
                  >
                    <AppText bold style={[styles.optionText, d === day && styles.optionTextActive]}>
                      {DAY_LABELS[31 - d]}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.column}>
              <AppText style={styles.columnLabel}>{t.history.datePicker.month}</AppText>
              <ScrollView
                ref={monthScrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.columnList}
              >
                {monthLabels.map((m, idx) => (
                  <Pressable
                    key={`m-${idx}`}
                    onPress={() => setMonth(idx)}
                    style={[styles.option, idx === month && styles.optionActive]}
                  >
                    <AppText bold style={[styles.optionText, idx === month && styles.optionTextActive]}>
                      {m}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.column}>
              <AppText style={styles.columnLabel}>{t.history.datePicker.year}</AppText>
              <ScrollView
                ref={yearScrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.columnList}
              >
                {yearOptions.map((y) => (
                  <Pressable
                    key={`y-${y}`}
                    onPress={() => setYear(y)}
                    style={[styles.option, y === year && styles.optionActive]}
                  >
                    <AppText bold style={[styles.optionText, y === year && styles.optionTextActive]}>
                      {y}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.footer}>
            <AppButton
              variant="outline"
              label={t.history.datePicker.today}
              onPress={setToday}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000066' },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    ...shadow,
  },
  grabber: {
    alignSelf: 'center',
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: colors.border, marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  title: { color: colors.text, fontSize: 16 },
  cancelText: { color: colors.muted, fontSize: 14, fontFamily: font.regular },
  doneText: { color: colors.header, fontSize: 14, fontFamily: font.bold },
  columns: {
    flexDirection: 'row',
    height: 260,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  column: { flex: 1, paddingVertical: 8 },
  columnLabel: {
    color: colors.muted, fontSize: 12,
    textAlign: 'center', paddingBottom: 6,
  },
  columnList: { paddingBottom: 220 },
  option: {
    height: 40, alignItems: 'center', justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: colors.header,
    marginHorizontal: 8, borderRadius: radius.sm,
  },
  optionText: { color: colors.text, fontSize: 15 },
  optionTextActive: { color: colors.headerText },
  footer: { marginTop: 16 },
});
