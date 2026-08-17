import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { t } from '../i18n';
import AppText from '../components/AppText';
import { BackArrowIcon } from '../components/ServiceIcon';
import Receipt from '../components/Receipt';

type Props = {
  saleId: number;
  onBack: () => void;
};

export default function SaleDetailScreen({ saleId, onBack }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="back"
          onPress={onBack}
          style={styles.backBtn}
        >
          <BackArrowIcon size={26} color="#FFFFFF" />
        </Pressable>
        <AppText bold style={styles.title}>{t.receipt.title}</AppText>
        <View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Receipt saleId={saleId} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#4A6CF7',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14, gap: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#fff', fontSize: 20, textAlign: 'center' },
});
