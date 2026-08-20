import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Sale, SaleItem } from './db';
import { formatDateTimeMM, formatKyat, t, toMM } from './i18n';

let fontCache: { regular: string; bold: string } | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return globalThis.btoa(binary);
}

async function loadFonts(): Promise<{ regular: string; bold: string }> {
  if (fontCache) return fontCache;
  const regularAsset = Asset.fromModule(require('../assets/fonts/Pyidaungsu-Regular.ttf'));
  const boldAsset = Asset.fromModule(require('../assets/fonts/Pyidaungsu-Bold.ttf'));
  await Promise.all([regularAsset.downloadAsync(), boldAsset.downloadAsync()]);
  const regularBytes = await new File(regularAsset.localUri!).bytes();
  const boldBytes = await new File(boldAsset.localUri!).bytes();
  fontCache = { regular: bytesToBase64(regularBytes), bold: bytesToBase64(boldBytes) };
  return fontCache;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function buildReceiptHtml(
  sale: Sale,
  items: SaleItem[],
  shopName: string,
): Promise<string> {
  const fonts = await loadFonts();

  const rows = items
    .map(
      (item) => `
        <tr>
          <td class="name">${escapeHtml(item.name)}</td>
          <td class="qty">${escapeHtml(item.size)} · ${toMM(item.quantity)} × ${formatKyat(item.price)}</td>
          <td class="amount">${formatKyat(item.price * item.quantity)}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face { font-family: 'Pyidaungsu'; src: url(data:font/truetype;charset=utf-8;base64,${fonts.regular}) format('truetype'); font-weight: normal; }
  @font-face { font-family: 'Pyidaungsu'; src: url(data:font/truetype;charset=utf-8;base64,${fonts.bold}) format('truetype'); font-weight: bold; }
  * { box-sizing: border-box; }
  body { font-family: 'Pyidaungsu', sans-serif; color: #111; margin: 0; padding: 16px; }
  .shop { text-align: center; font-size: 20px; font-weight: bold; margin: 0 0 4px; }
  .label { text-align: center; font-size: 13px; color: #666; margin: 0 0 8px; }
  .meta { text-align: center; font-size: 12px; color: #666; margin: 2px 0; }
  .dash { border-top: 1px dashed #bbb; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 0; vertical-align: top; font-size: 13px; }
  td.name { font-weight: bold; }
  td.qty { color: #666; font-size: 11px; }
  td.amount { text-align: right; white-space: nowrap; }
  .total { display: flex; justify-content: space-between; align-items: center; }
  .total-label { font-size: 15px; }
  .total-value { font-size: 20px; font-weight: bold; color: #3B82F6; }
  .thanks { text-align: center; color: #666; font-size: 13px; }
</style>
</head>
<body>
  <div class="shop">${escapeHtml(shopName)}</div>
  <div class="label">${escapeHtml(t.receipt.title)}</div>
  <div class="meta">${escapeHtml(t.receipt.billNo)} #${toMM(sale.id)}</div>
  <div class="meta">${formatDateTimeMM(sale.createdAt)}</div>
  <div class="dash"></div>
  <table>${rows}</table>
  <div class="dash"></div>
  <div class="total">
    <span class="total-label">${escapeHtml(t.receipt.total)}</span>
    <span class="total-value">${formatKyat(sale.total)}</span>
  </div>
  <div class="dash"></div>
  <div class="thanks">${escapeHtml(t.receipt.thanks)}</div>
</body>
</html>`;
}

export async function exportReceiptPdf(
  sale: Sale,
  items: SaleItem[],
  shopName: string,
): Promise<void> {
  const html = await buildReceiptHtml(sale, items, shopName);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: t.receipt.title,
    UTI: 'com.adobe.pdf',
  });
}
