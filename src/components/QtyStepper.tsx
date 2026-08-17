import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { toMM } from '../i18n';
import { colors } from '../theme';
import AppText from './AppText';

type Props = {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
};

export default function QtyStepper({ value, onMinus, onPlus }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.btn, styles.minus, pressed && styles.btnPressed]}
        onPress={onMinus}
      >
        <AppText bold style={styles.minusText}>−</AppText>
      </Pressable>
      <AppText bold style={styles.value}>{toMM(value)}</AppText>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.btn, styles.plus, pressed && styles.btnPressed]}
        onPress={onPlus}
      >
        <AppText bold style={styles.plusText}>＋</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: { backgroundColor: '#EEF0FF' },
  plus: { backgroundColor: colors.sellBlue },
  btnPressed: { opacity: 0.75 },
  minusText: { color: colors.header, fontSize: 18, lineHeight: 22 },
  plusText: { color: '#FFFFFF', fontSize: 18, lineHeight: 22 },
  value: { minWidth: 26, textAlign: 'center', fontSize: 15, color: colors.text },
});