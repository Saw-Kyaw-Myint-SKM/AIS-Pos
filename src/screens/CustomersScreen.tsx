import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { Customer } from '../db';
import { t } from '../i18n';
import { colors, font, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import { BackArrowIcon, TrashIcon } from '../components/ServiceIcon';

type Props = {
  customers: Customer[];
  onBack: () => void;
  onCreate: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
};

export default function CustomersScreen({ customers, onBack, onCreate, onEdit, onDelete }: Props) {
  const confirmDelete = (customer: Customer) => {
    Alert.alert(t.customer.deleteTitle, `${customer.name}\n${t.customer.deleteBody}`, [
      { text: t.customer.cancel, style: 'cancel' },
      { text: t.customer.delete, style: 'destructive', onPress: () => onDelete(customer) },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
          <BackArrowIcon size={24} color="#FFFFFF" />
        </Pressable>
        <AppText bold style={styles.title}>{t.customer.title}</AppText>
        <Pressable accessibilityRole="button" onPress={onCreate} style={styles.addButton}>
          <AppText bold style={styles.addText}>{t.customer.add}</AppText>
        </Pressable>
      </View>
      <FlatList
        data={customers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable accessibilityRole="button" onPress={() => onEdit(item)} style={styles.customerInfo}>
              <View style={styles.avatar}><AppText bold style={styles.avatarText}>{item.name.trim().charAt(0)}</AppText></View>
              <View style={styles.details}>
                <AppText bold style={styles.name}>{item.name}</AppText>
                <AppText style={styles.phone}>{item.phone}</AppText>
                <AppText numberOfLines={1} style={styles.address}>{item.address}</AppText>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => confirmDelete(item)} style={styles.deleteButton}>
              <TrashIcon size={19} color={colors.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<EmptyState title={t.customer.empty} hint={t.customer.emptyHint} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { minHeight: 58, backgroundColor: '#4A6CF7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 18 },
  addButton: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  addText: { color: colors.header, fontSize: 13 },
  list: { padding: 12, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: 10, padding: 10, ...shadow },
  customerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.header, fontSize: 17 },
  details: { flex: 1, marginLeft: 10 },
  name: { color: colors.text, fontSize: 15 },
  phone: { color: colors.header, fontSize: 12, marginTop: 1 },
  address: { color: colors.muted, fontFamily: font.regular, fontSize: 11, marginTop: 2 },
  deleteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
