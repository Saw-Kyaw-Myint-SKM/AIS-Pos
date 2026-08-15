import { colors, radius, font, avatarPalette, spacing } from "../src/theme";

describe("design tokens — theme.ts (baseline for figma-verifier L1 diff)", () => {
  describe("colors", () => {
    test("primary is brand orange", () => {
      expect(colors.primary).toBe("#E8862E");
    });
    test("header is deep teal", () => {
      expect(colors.header).toBe("#0E4F45");
    });
    test("background is warm cream", () => {
      expect(colors.bg).toBe("#F6F3EC");
    });
    test("text is dark slate", () => {
      expect(colors.text).toBe("#22302B");
    });
    test("success / danger pair", () => {
      expect(colors.success).toBe("#1E9E6A");
      expect(colors.danger).toBe("#D9534F");
    });
    test("accent is teal-green", () => {
      expect(colors.accent).toBe("#22B8A0");
    });
  });

  describe("spacing", () => {
    test("spacing(1) = 4", () => {
      expect(spacing(1)).toBe(4);
    });
    test("spacing(4) = 16 (md)", () => {
      expect(spacing(4)).toBe(16);
    });
    test("spacing(6) = 24 (lg)", () => {
      expect(spacing(6)).toBe(24);
    });
  });

  describe("radius", () => {
    test("radius scale (sm/md/lg/xl/tile/icon)", () => {
      expect(radius).toEqual({
        sm: 10,
        md: 16,
        lg: 22,
        xl: 28,
        tile: 20,
        icon: 16,
      });
    });
  });

  describe("font", () => {
    test("uses Pyidaungsu (Burmese)", () => {
      expect(font.regular).toBe("Pyidaungsu-Regular");
      expect(font.bold).toBe("Pyidaungsu-Bold");
    });
  });

  describe("avatar palette", () => {
    test("6 color entries", () => {
      expect(avatarPalette).toHaveLength(6);
      expect(avatarPalette[0]).toBe(colors.primary);
    });
  });
});
