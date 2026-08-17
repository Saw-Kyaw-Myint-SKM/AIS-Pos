import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { Category, ClothingItem } from '../db';
import { t, toMM } from '../i18n';
import { font } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import { TrashIcon } from '../components/ServiceIcon';

type Props = {
  categories: Category[];
  items: ClothingItem[];
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
};

export default function CategoriesScreen({
  categories,
  items,
  onEditCategory,
  onDeleteCategory,
}: Props) {
  const [search, setSearch] = useState('');

  const itemCount = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of items) {
      if (item.categoryId == null) continue;
      map[item.categoryId] = (map[item.categoryId] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const handleDeletePress = (category: Category) => {
    if (!category || category.id == null) return;
    const count = itemCount[category.id] ?? 0;
    if (count > 0) {
      Alert.alert(
        t.items.categoryDeleteTitle,
        t.items.categoryHasProducts,
        [{ text: t.items.deleteNo, style: 'cancel' }],
      );
      return;
    }
    Alert.alert(
      t.items.categoryDeleteTitle,
      category.name,
      [
        { text: t.items.deleteNo, style: 'cancel' },
        {
          text: t.items.deleteYes,
          style: 'destructive',
          onPress: () => onDeleteCategory(category),
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <View style={styles.searchBox}>
          <AppText style={styles.searchIcon}>🔍</AppText>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.items.categorySearchPlaceholder}
            placeholderTextColor="#6B7280"
            style={styles.searchInput}
          />
          {search !== '' && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <AppText style={styles.searchClear}>✕</AppText>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          if (!item || item.id == null) return null;
          const count = itemCount[item.id] ?? 0;
          return (
            <View style={styles.card}>
              <Pressable
                style={styles.cardMain}
                onPress={() => onEditCategory(item)}
              >
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <View style={styles.cardInfo}>
                  <AppText bold style={styles.cardName}>{item.name}</AppText>
                  <View style={styles.countBadge}>
                    <AppText bold style={styles.countBadgeText}>
                      {t.items.categoryItemCount} {toMM(count)}
                    </AppText>
                  </View>
                </View>
              </Pressable>
              <View style={styles.cardActions}>
                <Pressable
                  hitSlop={6}
                  style={[styles.iconBtn, styles.iconBtnDanger]}
                  onPress={() => handleDeletePress(item)}
                >
                  <TrashIcon size={16} color="#D9534F" />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState title={t.items.categoryEmpty} />
          </View>
        }
      />
    </View>
  );
}

const CARD_BORDER = '#E5E7EA';
const CARD_MUTED = '#6B727A';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  searchBar: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: 'Pyidaungsu-Regular',
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },
  searchClear: { fontSize: 14, color: CARD_MUTED, paddingHorizontal: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardInfo: { flex: 1, gap: 6 },
  cardName: { fontSize: 15, color: '#101126', fontFamily: font.bold },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeText: { fontSize: 11, color: '#4F46E5', fontFamily: font.bold },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: { backgroundColor: '#FBEAE9' },
  emptyWrap: { paddingVertical: 40 },
});
