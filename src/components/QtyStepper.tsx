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
      <Pressable accessibilityRole="button" style={[styles.btn, styles.minus]} onPress={onMinus}>
        <AppText bold style={styles.minusText}>−</AppText>
      </Pressable>
      <AppText bold style={styles.value}>{toMM(value)}</AppText>
      <Pressable accessibilityRole="button" style={[styles.btn, styles.plus]} onPress={onPlus}>
        <AppText bold style={styles.plusText}>+</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  minus: { backgroundColor: colors.dangerSoft },
  plus: { backgroundColor: colors.accentSoft },
  minusText: { color: colors.danger, fontSize: 22, lineHeight: 26 },
  plusText: { color: colors.header, fontSize: 22, lineHeight: 26 },
  value: { minWidth: 28, textAlign: 'center', fontSize: 17 },
});
