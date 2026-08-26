import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { getSale, getSaleItems, type ClothingItem, type SaleItem, type SaleUpdateInput } from '../db';
import { formatKyat, t, toMM } from '../i18n';
import { colors, font, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import QtyStepper from '../components/QtyStepper';
import { BackArrowIcon } from '../components/ServiceIcon';

type Props = {
  saleId: number;
  items: ClothingItem[];
  onBack: () => void;
  onSave: (input: SaleUpdateInput) => void;
};

type OriginalLine = SaleItem & { item: ClothingItem };

export default function SaleEditScreen({ saleId, items, onBack, onSave }: Props) {
  const db = useSQLiteContext();
  const [originalLines, setOriginalLines] = useState<OriginalLine[] | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [taxText, setTaxText] = useState('0');
  const [discountText, setDiscountText] = useState('0');
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [sale, lines] = await Promise.all([getSale(db, saleId), getSaleItems(db, saleId)]);
      if (!alive) return;
      if (!sale) {
        setUnavailable(true);
        setLoading(false);
        return;
      }

      const liveById = new Map(items.map((item) => [item.id, item]));
      const resolvedLines: OriginalLine[] = [];
      const nextQuantities: Record<number, number> = {};
      for (const line of lines) {
        const item = liveById.get(line.clothingId);
        if (!item) {
          setUnavailable(true);
          setLoading(false);
          return;
        }
        resolvedLines.push({ ...line, item });
        nextQuantities[line.clothingId] = (nextQuantities[line.clothingId] ?? 0) + line.quantity;
      }
      setOriginalLines(resolvedLines);
      setQuantities(nextQuantities);
      setTaxText(String(sale.taxAmount));
      setDiscountText(String(sale.discountAmount));
      setLoading(false);
    })().catch(() => {
      if (alive) {
        setUnavailable(true);
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, [db, items, saleId]);

  const originalById = useMemo(() => {
    const values = new Map<number, SaleItem>();
    originalLines?.forEach((line) => {
      if (!values.has(line.clothingId)) values.set(line.clothingId, line);
    });
    return values;
  }, [originalLines]);

  const selectedItems = useMemo(() => items.filter((item) => (quantities[item.id] ?? 0) > 0), [items, quantities]);
  const taxAmount = Number(taxText || '0');
  const discountAmount = Number(discountText || '0');
  const taxValid = Number.isFinite(taxAmount) && taxAmount >= 0;
  const subtotal = selectedItems.reduce((sum, item) => {
    const price = originalById.get(item.id)?.price ?? item.price;
    return sum + price * (quantities[item.id] ?? 0);
  }, 0);
  const discountValid = Number.isFinite(discountAmount)
    && discountAmount >= 0
    && discountAmount <= subtotal + (taxValid ? taxAmount : 0);

  const setQuantity = (item: ClothingItem, nextQuantity: number) => {
    const originalQuantity = originalLines?.filter((line) => line.clothingId === item.id)
      .reduce((sum, line) => sum + line.quantity, 0) ?? 0;
    const maximum = item.stock + originalQuantity;
    setQuantities((current) => {
      const value = Math.max(0, Math.min(nextQuantity, maximum));
      const next = { ...current };
      if (value === 0) delete next[item.id];
      else next[item.id] = value;
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedItems.length) return;
    if (!taxValid || !discountValid) return;
    onSave({
      lines: selectedItems.map((item) => ({ clothingId: item.id, quantity: quantities[item.id] })),
      taxAmount,
      taxReason: 'အခွန်',
      discountAmount,
      discountReason: 'လျော့စျေး',
    });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.header} /><AppText style={styles.loading}>{t.saleEdit.loading}</AppText></View>;
  }

  if (unavailable) {
    return (
      <View style={styles.center}>
        <AppText bold style={styles.unavailableTitle}>{t.saleEdit.unavailableTitle}</AppText>
        <AppText style={styles.unavailableBody}>{t.saleEdit.unavailableBody}</AppText>
        <Pressable onPress={onBack} style={styles.backAction}><AppText bold style={styles.backActionText}>{t.items.back}</AppText></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.items.back} onPress={onBack} style={styles.headerButton}>
          <BackArrowIcon size={26} color="#FFFFFF" />
        </Pressable>
        <AppText bold style={styles.title}>{t.saleEdit.title}</AppText>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText bold style={styles.sectionTitle}>{t.saleEdit.selectedProducts}</AppText>
        {selectedItems.map((item) => {
          const original = originalById.get(item.id);
          const quantity = quantities[item.id] ?? 0;
          const maximum = item.stock + (originalLines?.filter((line) => line.clothingId === item.id).reduce((sum, line) => sum + line.quantity, 0) ?? 0);
          const price = original?.price ?? item.price;
          return (
            <View key={item.id} style={styles.line}>
              <View style={styles.lineInfo}>
                <AppText bold style={styles.lineName}>{original?.name ?? item.name}</AppText>
                <AppText style={styles.lineMeta}>{original?.size ?? item.size} · {formatKyat(price)}</AppText>
              </View>
              <QtyStepper
                value={quantity}
                onMinus={() => setQuantity(item, quantity - 1)}
                onPlus={() => setQuantity(item, quantity + 1)}
                plusDisabled={quantity >= maximum}
              />
            </View>
          );
        })}

        <AppText bold style={styles.sectionTitle}>{t.saleEdit.addProducts}</AppText>
        <View style={styles.productGrid}>
          {items.map((item) => {
            const quantity = quantities[item.id] ?? 0;
            const originalQuantity = originalLines?.filter((line) => line.clothingId === item.id).reduce((sum, line) => sum + line.quantity, 0) ?? 0;
            const maximum = item.stock + originalQuantity;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => setQuantity(item, quantity + 1)}
                disabled={quantity >= maximum}
                style={({ pressed }) => [styles.productCard, quantity >= maximum && styles.productDisabled, pressed && styles.productPressed]}
              >
                <AppText bold numberOfLines={1} style={styles.productName}>{item.name}</AppText>
                <AppText style={styles.productPrice}>{formatKyat(originalById.get(item.id)?.price ?? item.price)}</AppText>
                <AppText style={styles.productStock}>{t.sell.stock} {toMM(maximum - quantity)}</AppText>
                {quantity > 0 && <AppText bold style={styles.productQty}>× {toMM(quantity)}</AppText>}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.taxCard}>
          <AppText bold style={styles.taxLabel}>{t.saleEdit.tax}</AppText>
          <TextInput value={taxText} onChangeText={setTaxText} keyboardType="decimal-pad" placeholder={t.saleEdit.taxPlaceholder} style={styles.taxInput} />
          {!taxValid && <AppText style={styles.error}>{t.saleEdit.invalidTax}</AppText>}
        </View>
        <View style={styles.taxCard}>
          <AppText bold style={styles.taxLabel}>{t.saleEdit.discount}</AppText>
          <TextInput value={discountText} onChangeText={setDiscountText} keyboardType="decimal-pad" placeholder={t.saleEdit.discountPlaceholder} style={styles.taxInput} />
          {!discountValid && <AppText style={styles.error}>{t.saleEdit.invalidDiscount}</AppText>}
        </View>
        {!selectedItems.length && <AppText style={styles.error}>{t.saleEdit.empty}</AppText>}
        <View style={styles.summary}>
          <View style={styles.summaryRow}><AppText style={styles.summaryLabel}>{t.saleEdit.subtotal}</AppText><AppText style={styles.summaryValue}>{formatKyat(subtotal)}</AppText></View>
          <View style={styles.summaryRow}><AppText style={styles.summaryLabel}>{t.cart.tax}</AppText><AppText style={styles.summaryValue}>{formatKyat(taxValid ? taxAmount : 0)}</AppText></View>
          <View style={styles.summaryRow}><AppText style={styles.summaryLabel}>{t.cart.discount}</AppText><AppText style={styles.summaryValue}>− {formatKyat(discountValid ? discountAmount : 0)}</AppText></View>
          <View style={styles.summaryRow}><AppText bold style={styles.totalLabel}>{t.saleEdit.total}</AppText><AppText bold style={styles.totalValue}>{formatKyat(subtotal + (taxValid ? taxAmount : 0) - (discountValid ? discountAmount : 0))}</AppText></View>
        </View>
        <Pressable accessibilityRole="button" onPress={handleSave} disabled={!selectedItems.length || !taxValid || !discountValid} style={({ pressed }) => [styles.saveButton, (!selectedItems.length || !taxValid || !discountValid) && styles.saveDisabled, pressed && styles.productPressed]}>
          <AppText bold style={styles.saveText}>{t.saleEdit.save}</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { height: 56, backgroundColor: '#4A6CF7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 18 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 16, color: colors.text, marginBottom: 10, marginTop: 8 },
  line: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow },
  lineInfo: { flex: 1 },
  lineName: { fontSize: 14, color: colors.text },
  lineMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productCard: { width: '48.5%', backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, minHeight: 92, ...shadow },
  productDisabled: { opacity: 0.55 },
  productPressed: { opacity: 0.78 },
  productName: { fontSize: 14, color: colors.text },
  productPrice: { marginTop: 4, fontSize: 12, color: colors.header },
  productStock: { marginTop: 3, fontSize: 11, color: colors.muted },
  productQty: { marginTop: 3, fontSize: 14, color: colors.sellBlue },
  taxCard: { marginTop: 20, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, ...shadow },
  taxLabel: { fontSize: 14, color: colors.text },
  taxInput: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, fontFamily: font.regular, color: colors.text },
  summary: { marginTop: 16, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, ...shadow },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { color: colors.muted },
  summaryValue: { color: colors.text },
  totalLabel: { fontSize: 16, color: colors.text },
  totalValue: { fontSize: 18, color: colors.success },
  saveButton: { marginTop: 16, backgroundColor: colors.sellBlue, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  saveDisabled: { backgroundColor: colors.muted },
  saveText: { color: '#FFFFFF', fontSize: 15 },
  error: { color: colors.danger, fontSize: 12, marginTop: 8 },
  center: { flex: 1, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', padding: 28 },
  loading: { marginTop: 12, color: colors.muted },
  unavailableTitle: { color: colors.danger, fontSize: 18, textAlign: 'center' },
  unavailableBody: { marginTop: 8, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  backAction: { marginTop: 18, backgroundColor: colors.sellBlue, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 24 },
  backActionText: { color: '#FFFFFF' },
});
