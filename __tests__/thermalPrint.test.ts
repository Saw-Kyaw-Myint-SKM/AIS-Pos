import { paperWidthToDots, paperWidthToPx, simulateReceiptPrint } from '../src/thermalPrint';

describe('Expo Go receipt print simulation', () => {
  test('maps receipt widths for 58 mm and 80 mm previews', () => {
    expect(paperWidthToDots('58')).toBe(384);
    expect(paperWidthToDots('80')).toBe(576);
    expect(paperWidthToPx('58')).toBe(384);
    expect(paperWidthToPx('80')).toBe(576);
  });

  test('completes the mock receipt print without a native printer module', async () => {
    await expect(simulateReceiptPrint('58')).resolves.toBeUndefined();
  });
});
