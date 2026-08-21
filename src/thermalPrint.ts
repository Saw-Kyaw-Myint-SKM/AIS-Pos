import type { PaperWidth } from './db';

export const paperWidthToDots = (width: PaperWidth): number => (width === '80' ? 576 : 384);
export const paperWidthToPx = paperWidthToDots;

/**
 * Expo Go-safe receipt print simulation.
 * The native Epson transport intentionally lives only in the thermal-native branch.
 */
export async function simulateReceiptPrint(
  _paperWidth: PaperWidth,
): Promise<void> {
  await Promise.resolve();
}
