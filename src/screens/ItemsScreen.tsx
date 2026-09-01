import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { Category, ClothingItem } from '../db';
import { formatKyat, t, toMM } from '../i18n';
import { avatarPalette, font } from '../theme';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import CategoriesScreen from './CategoriesScreen';
import { ListIcon, CategoriesIcon, TrashIcon } from '../components/ServiceIcon';

type TabKey = 'products' | 'categories';

type Props = {
  items: ClothingItem[];
  categories: Category[];
  onPressItem: (item: ClothingItem) => void;
  onDelete: (item: ClothingItem) => void;
  onCreateProduct: () => void;
  onCreateCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onMoveCategoryUp: (category: Category) => void;
  onMoveCategoryDown: (category: Category) => void;
  editable: boolean;
};

const BLUE = '#4A6CF7';
const ACTIVE_COLOR = '#4F46E5';

const CARD_BORDER = '#E5E7EA';
const CARD_NAME = '#101126';
const CARD_MUTED = '#6B727A';
const PRICE_COLOR = '#3B3F76';

const COLOR_PICKER = [
  { label: 'အနက်', hex: '#1A1A1A' },
  { label: 'အဖြူ', hex: '#F5F5F5' },
  { label: 'အနီ', hex: '#DC2626' },
  { label: 'အပြာ', hex: '#2563EB' },
  { label: 'အစိမ်း', hex: '#16A34A' },
  { label: 'အဝါ', hex: '#CA8A04' },
  { label: 'ခရမ်း', hex: '#9333EA' },
  { label: 'ပန်းရောင်', hex: '#DB2777' },
  { label: 'မီးခိုး', hex: '#6B7280' },
  { label: 'အညို', hex: '#A16207' },
  { label: 'လိမ္မော်', hex: '#EA580C' },
  { label: 'အပြာနု', hex: '#06B6D4' },
];

type FilterModal = 'color' | 'category' | null;

export default function ItemsScreen({
  items,
  categories,
  onPressItem,
  onDelete,
  onCreateProduct,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onMoveCategoryUp,
  onMoveCategoryDown,
  editable,
}: Props) {
  const [tab, setTab] = useState<TabKey>('products');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterModal, setFilterModal] = useState<FilterModal>(null);

  const hasFilter = search.trim() !== '' || filterColor !== '' || filterCategory !== null;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (filterColor && item.colorValue !== filterColor) return false;
      if (filterCategory !== null && item.categoryId !== filterCategory) return false;
      return true;
    });
  }, [items, search, filterColor, filterCategory]);

  const clearFilters = () => {
    setSearch('');
    setFilterColor('');
    setFilterCategory(null);
  };

  const closeMenu = () => setShowAddMenu(false);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AppText bold style={styles.title}>{t.items.title}</AppText>
        {editable ? <Pressable
          accessibilityRole="button"
          onPress={() => setShowAddMenu(!showAddMenu)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        >
          <AppText bold style={styles.addText}>+ {t.items.addProduct}</AppText>
        </Pressable> : null}
      </View>

      {showAddMenu && (
        <View style={styles.addMenu}>
          <Pressable
            style={styles.addMenuItem}
            onPress={() => { onCreateProduct(); closeMenu(); }}
          >
            <View style={styles.addMenuItemIcon}>
              <ListIcon size={18} color={ACTIVE_COLOR} />
            </View>
            <AppText bold style={styles.addMenuItemText}>{t.items.addProduct}</AppText>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            style={styles.addMenuItem}
            onPress={() => { onCreateCategory(); closeMenu(); }}
          >
            <View style={styles.addMenuItemIcon}>
              <CategoriesIcon size={18} color={ACTIVE_COLOR} />
            </View>
            <AppText bold style={styles.addMenuItemText}>{t.items.addCategory}</AppText>
          </Pressable>
        </View>
      )}

      <View style={styles.tabRowPills}>
        <Pressable
          style={[styles.tabPill, tab === 'products' && styles.tabPillActive]}
          onPress={() => setTab('products')}
        >
          <ListIcon size={16} color={tab === 'products' ? '#FFFFFF' : CARD_MUTED} />
          <AppText style={[styles.tabPillLabel, tab === 'products' && styles.tabPillLabelActive]}>
            {t.items.products}
          </AppText>
        </Pressable>
        <Pressable
          style={[styles.tabPill, tab === 'categories' && styles.tabPillActive]}
          onPress={() => setTab('categories')}
        >
          <CategoriesIcon size={16} color={tab === 'categories' ? '#FFFFFF' : CARD_MUTED} />
          <AppText style={[styles.tabPillLabel, tab === 'categories' && styles.tabPillLabelActive]}>
            {t.items.categories}
          </AppText>
        </Pressable>
      </View>

      {tab === 'products' && (
        <View style={styles.searchFilterArea}>
          <View style={styles.searchBox}>
            <AppText style={styles.searchIcon}>🔍</AppText>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t.items.searchPlaceholder}
              placeholderTextColor={CARD_MUTED}
              style={styles.searchInput}
            />
            {search !== '' && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <AppText style={styles.searchClear}>✕</AppText>
              </Pressable>
            )}
          </View>

          <View style={styles.filterRow}>
            <Pressable
              style={[styles.filterChip, filterColor !== '' && styles.filterChipActive]}
              onPress={() => setFilterModal('color')}
            >
              {filterColor !== '' && (
                <View style={[styles.filterColorDot, { backgroundColor: filterColor }]} />
              )}
              <AppText style={[styles.filterChipLabel, filterColor !== '' && styles.filterChipLabelActive]}>
                {t.items.filterColor}
              </AppText>
            </Pressable>
            <Pressable
              style={[styles.filterChip, filterCategory !== null && styles.filterChipActive]}
              onPress={() => setFilterModal('category')}
            >
              {filterCategory !== null && (
                <View style={[styles.filterColorDot, { backgroundColor: categories.find((c) => c.id === filterCategory)?.color ?? '#4F46E5' }]} />
              )}
              <AppText style={[styles.filterChipLabel, filterCategory !== null && styles.filterChipLabelActive]}>
                {filterCategory !== null
                  ? categories.find((c) => c.id === filterCategory)?.name ?? t.items.filterCategory
                  : t.items.filterCategory}
              </AppText>
            </Pressable>
            {hasFilter && (
              <Pressable style={styles.clearAllBtn} onPress={clearFilters}>
                <AppText style={styles.clearAllText}>{t.items.clearAll}</AppText>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {tab === 'products' ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const color = item.colorValue || avatarPalette[item.id % avatarPalette.length];
            const stock = item.stock ?? 0;
            const lowStock = stock > 0 && stock <= 3;
            const outOfStock = stock <= 0;
            const stockBadge = outOfStock
              ? styles.stockBadgeOut
              : lowStock
                ? styles.stockBadgeLow
                : styles.stockBadge;
            const stockTextColor = outOfStock
              ? '#D9534F'
              : lowStock
                ? '#B45309'
                : '#4F46E5';
            return (
              <Pressable
                style={styles.card}
                onPress={editable ? () => onPressItem(item) : undefined}
              >
                {item.photoUri ? (
                  <Image
                    source={{ uri: item.photoUri }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: color }]}>
                    <AppText bold style={[styles.thumbText, color === '#F5F5F5' && styles.thumbTextDark]}>{item.name.trim().charAt(0)}</AppText>
                  </View>
                )}
                <View style={styles.info}>
                  <AppText bold numberOfLines={1} style={styles.name}>{item.name}</AppText>
                  <AppText numberOfLines={1} style={styles.sub}>{t.items.size}: {item.size}</AppText>
                  {item.categoryName ? (
                    <View style={styles.categoryPill}>
                      <View style={[styles.categoryPillDot, { backgroundColor: item.categoryColor || '#4F46E5' }]} />
                      <AppText style={styles.categoryPillText}>{item.categoryName}</AppText>
                    </View>
                  ) : null}
                </View>
                <View style={styles.rightCol}>
                  <AppText bold style={styles.price}>{formatKyat(item.price)}</AppText>
                  <View style={stockBadge}>
                    <AppText bold style={[styles.stockLabel, { color: stockTextColor }]}>{t.sell.stock}</AppText>
                    <AppText bold style={[styles.stockValue, { color: stockTextColor }]}>{toMM(stock)}</AppText>
                  </View>
                </View>
                {editable ? <Pressable
                  hitSlop={8}
                  onPress={() => onDelete(item)}
                  style={styles.deleteBtn}
                >
                  <TrashIcon size={20} color="#DC2626" />
                </Pressable> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyState title={t.items.empty} />}
        />
      ) : (
        <CategoriesScreen
          categories={categories}
          items={items}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          editable={editable}
        />
      )}

      <FilterModal
        type={filterModal}
        onClose={() => setFilterModal(null)}
        selectedColor={filterColor}
        selectedCategory={filterCategory}
        categories={categories}
        onSelectColor={(hex) => { setFilterColor(hex); setFilterModal(null); }}
        onSelectCategory={(cat) => { setFilterCategory(cat); setFilterModal(null); }}
      />
    </View>
  );
}

function FilterModal({
  type, onClose, selectedColor, selectedCategory, categories, onSelectColor, onSelectCategory,
}: {
  type: FilterModal;
  onClose: () => void;
  selectedColor: string;
  selectedCategory: number | null;
  categories: Category[];
  onSelectColor: (hex: string) => void;
  onSelectCategory: (cat: number | null) => void;
}) {
  return (
    <Modal visible={type !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.filterOverlay}>
        <Pressable style={styles.filterBackdrop} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.grabber} />
          {type === 'color' && (
            <>
              <AppText bold style={styles.filterSheetTitle}>{t.items.filterColor}</AppText>
              <View style={styles.filterColorGrid}>
                {COLOR_PICKER.map((c) => {
                  const isSelected = selectedColor === c.hex;
                  return (
                    <Pressable key={c.hex} style={styles.filterColorItem} onPress={() => onSelectColor(c.hex)}>
                      <View style={[styles.filterColorSwatch, { backgroundColor: c.hex }, c.hex === '#F5F5F5' && styles.filterColorSwatchWhite, isSelected && styles.filterColorSwatchSelected]}>
                        {isSelected && <AppText style={styles.filterColorCheck}>✓</AppText>}
                      </View>
                      <AppText style={styles.filterColorLabel}>{c.label}</AppText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
          {type === 'category' && (
            <>
              <AppText bold style={styles.filterSheetTitle}>{t.items.filterCategory}</AppText>
              <Pressable
                style={[styles.categoryOption, styles.categoryOptionRow, selectedCategory === null && styles.categoryOptionActive]}
                onPress={() => onSelectCategory(null)}
              >
                <AppText style={[styles.categoryOptionText, selectedCategory === null && styles.categoryOptionTextActive]}>
                  {t.items.all}
                </AppText>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[styles.categoryOption, styles.categoryOptionRow, selectedCategory === cat.id && styles.categoryOptionActive]}
                  onPress={() => onSelectCategory(cat.id)}
                >
                  <View style={[styles.categoryOptionDot, { backgroundColor: cat.color }]} />
                  <AppText style={[styles.categoryOptionText, selectedCategory === cat.id && styles.categoryOptionTextActive]}>
                    {cat.name}
                  </AppText>
                </Pressable>
              ))}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
  },
  title: { color: '#FFFFFF', fontSize: 18, fontFamily: font.bold },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 4,
  },
  addBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  addText: { color: '#FFFFFF', fontSize: 14, fontFamily: font.bold },
  addMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    minWidth: 180,
    zIndex: 100,
  },
  addMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  addMenuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMenuItemText: {
    fontSize: 14,
    color: '#111827',
    fontFamily: font.bold,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  tabRowPills: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  tabPillActive: {
    backgroundColor: BLUE,
  },
  tabPillLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: font.regular,
  },
  tabPillLabelActive: {
    color: '#FFFFFF',
    fontFamily: font.bold,
  },
  searchFilterArea: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
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
  searchClear: {
    fontSize: 14,
    color: CARD_MUTED,
    paddingHorizontal: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    borderColor: ACTIVE_COLOR,
    backgroundColor: '#EEF2FF',
  },
  filterChipLabel: {
    fontSize: 13,
    color: CARD_MUTED,
    fontFamily: font.regular,
  },
  filterChipLabelActive: {
    color: ACTIVE_COLOR,
    fontFamily: font.bold,
  },
  filterColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearAllBtn: {
    marginLeft: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  clearAllText: {
    fontSize: 13,
    color: BLUE,
    fontFamily: font.bold,
  },
  list: { padding: 16, paddingBottom: 28 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbText: { color: '#FFFFFF', fontSize: 28, fontFamily: font.bold },
  thumbTextDark: { color: '#1A1A1A' },
  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  name: { fontSize: 14, color: CARD_NAME, fontFamily: font.bold },
  sub: { fontSize: 12, color: CARD_MUTED, fontFamily: font.regular, marginTop: 4 },
  price: { fontSize: 14, color: PRICE_COLOR, fontFamily: font.bold },
  rightCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
    marginRight: 8,
  },
  deleteBtn: { padding: 4 },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockBadgeLow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockBadgeOut: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#FBEAE9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockLabel: {
    fontSize: 10,
    fontFamily: font.bold,
  },
  stockValue: {
    fontSize: 12,
    fontFamily: font.bold,
  },
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: CARD_MUTED,
    fontFamily: font.regular,
  },
  filterOverlay: { flex: 1, justifyContent: 'flex-end' },
  filterBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000066' },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB', marginBottom: 14 },
  filterSheetTitle: { fontSize: 18, color: '#111827', marginBottom: 16 },
  filterColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterColorItem: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  filterColorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterColorSwatchWhite: {
    borderColor: '#E5E7EB',
  },
  filterColorSwatchSelected: {
    borderColor: ACTIVE_COLOR,
  },
  filterColorCheck: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: font.bold,
  },
  filterColorLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: font.regular,
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  categoryOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryOptionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#111827',
    fontFamily: font.regular,
  },
  categoryOptionTextActive: {
    color: ACTIVE_COLOR,
    fontFamily: font.bold,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 11,
    color: '#374151',
    fontFamily: font.bold,
  },
});
