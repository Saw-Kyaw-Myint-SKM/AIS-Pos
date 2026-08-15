<!-- open-orc-ui:agent-drafted -->
# Spec

## Goal

Update အရောင်း (Sell) page design — modernize the Sell screen layout to match the new Figma design, including a redesigned header, action bar with Ticket/Save buttons, improved search bar with category dropdown, custom price toggle, and updated item card layout.

## Figma

https://www.figma.com/design/xOoeeQTPQ2cPxL2i4s5M0W/Clothes-POS?node-id=2015-468&t=LMCoEtuIdfRAoQ2t-4

- File key: `xOoeeQTPQ2cPxL2i4s5M0W`
- Node ID: `2015:468` (named "Home" in Figma, represents the Sell screen)
- Screenshot: https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/e2a96cb0-630c-46ba-afc5-82cc02cc3955

## Acceptance criteria

- Header bar matches Figma: blue (#4A6CF7) background, 58px height, hamburger menu icon (left), "Source MM" title (center, 18px white), barcode scanner icon (right)
- Action bar below header: "Ticket" pill with item count badge on left, "Save" button (blue #4A6CF7, rounded) on right
- Search bar: white rounded input with drop shadow, green (#589C2B) search icon on left, placeholder text, category dropdown arrow on right
- "Custom price" toggle switch aligned right below search bar
- Item cards: 2-column grid, white rounded cards (136×127px) with shadow, matching Figma layout
- Cart bar at bottom (existing pattern) shows item count and total when cart has items
- All UI text in Burmese via `t.*` from `i18n.ts`; prices via `formatKyat()`
- Reuses existing `AppText`, `AppButton`, `ServiceIcon` components where possible
- `npm run typecheck` passes

## Design facts

### Layout

**Overall frame:** 414×1037px (standard mobile)

**Header bar** (top, full width):
- Height: 58px
- Background: blue (#4A6CF7) — matches HomeScreen banner color
- Left: hamburger menu icon (35×35px, white)
- Center: "Source MM" text (18px, Inter, white, 400 weight)
- Right: barcode scanner icon (35×35px, white) — reuse `ScanIcon` from `ServiceIcon.tsx`
- Horizontal padding: ~20px

**Action bar** (below header, y=115):
- Height: 44px
- Left: "Ticket" pill — white bg, rounded (radius ~22px), border, text "Ticket" + badge with count (circle)
- Right: "Save" button — blue (#4A6CF7), rounded (radius ~12px), white text "Save"
- Horizontal padding: 32px from edges
- Gap between pill and button: full width (space-between)

**Search bar** (y=190):
- Height: 41px
- Background: white (#FFFFFF), rounded (radius ~20px)
- Drop shadow: same as existing `shadow` in theme
- Left: green search icon (24×24px, #589C2B) — new `SearchIcon` SVG needed
- Placeholder text: "Shirt" (14px, muted color)
- Right: dropdown arrow icon (24×28px, dark) — new `ChevronDownIcon` SVG needed
- Horizontal padding: 34px from left edge for icon, search field fills remaining

**Custom price toggle** (y=250):
- Right-aligned, below search bar
- Label: "Custom price" (16px, muted #757575)
- Toggle switch: 164×24px, uses Figma "Switch Field" component (can map to React Native Switch or custom toggle)

**Item cards grid** (y=317+):
- 2-column layout, gap ~20px between columns, ~24px between rows
- Card size: 136×127px (Figma shows empty white cards with shadow)
- Card style: white bg, rounded (radius ~16px), drop shadow
- **Item card content** (not shown in Figma — dev must design):
  - Colored avatar circle with first letter (reuse existing pattern from `ItemCard.tsx`)
  - Product name (bold, 15px, 2 lines max)
  - Size chip (small, bordered)
  - Price (bold, header color)
  - "+" add button (primary color circle)
  - Match existing `ItemCard.tsx` structure but adapt to new card dimensions

**Cart bar** (bottom, existing):
- Position: absolute, bottom 16px, left/right 16px
- Blue (#0E4F45 or #4A6CF7) bg, rounded, shadow
- Shows count badge + "Cart" label on left, total on right

### Tokens / colors

| Token | Figma value | Maps to theme |
|-------|------------|---------------|
| Header blue | #4A6CF7 | New: add `accentBlue` or reuse HomeScreen's `#4A6CF7` |
| Search icon green | #589C2B | `colors.iconGreen` |
| Save button blue | #4A6CF7 | Same as header |
| Ticket pill bg | #FFFFFF | `colors.surface` |
| Card bg | #FFFFFF | `colors.surface` |
| Toggle label | #757575 | `colors.banner` |
| Card shadow | drop-shadow | `colors.shadow` (existing) |
| Text muted | #757575 | `colors.muted` (#7A8880) — close enough |

**New tokens to add to `theme.ts`:**
- `accentBlue: '#4A6CF7'` — header/action bar blue (matches HomeScreen banner)

### Assets to export

- **Search icon** (green magnifying glass): Create as SVG in `ServiceIcon.tsx` — `SearchIcon` component, 24×24, color #589C2B
- **Chevron down icon** (dropdown arrow): Create as SVG in `ServiceIcon.tsx` — `ChevronDownIcon` component, 24×24, color #1D1B20
- **Hamburger menu icon**: Create as SVG in `ServiceIcon.tsx` — `MenuIcon` component, 35×35, white
- No raster assets needed — all icons are vector SVG

## Repo facts

### Files to touch

- `src/theme.ts` — add `accentBlue: '#4A6CF7'` color token
- `src/components/ServiceIcon.tsx` — add `SearchIcon`, `ChevronDownIcon`, `MenuIcon` SVG components
- `src/screens/SellScreen.tsx` — **primary file**: rewrite layout to match Figma (new header, action bar, search bar, toggle, item grid)
- `src/components/ItemCard.tsx` — update card styling to match new 136×127px dimensions and cleaner layout
- `src/i18n.ts` — add new Burmese strings for "Ticket", "Save", "Custom price" under `t.sell`
- `App.tsx` — no changes needed (SellScreen props unchanged)

### Key symbols / patterns

- `src/theme.ts` — color tokens, `shadow`, `radius` — reuse existing patterns
- `AppText` — all text must use this component with Pyidaungsu font
- `ServiceIcon.tsx` — SVG icon pattern: `<Svg viewBox="0 0 24 24">` with `Path`/`Circle` elements
- `HomeScreen.tsx` banner — reference for blue (#4A6CF7) header styling
- `CartSheet.tsx` — existing cart bar pattern at bottom of SellScreen
- Manual routing in `App.tsx` — no navigation library, SellScreen is rendered conditionally
- `FlatList` with `numColumns={2}` — existing 2-column grid pattern

### Verified commands

- `npm run typecheck`

## Todo list

- [x] Pull Figma design context (node 2015:468)
- [x] Analyze Figma layout structure (header, action bar, search, toggle, item cards)
- [x] Map Figma colors to existing theme tokens
- [x] Identify new SVG icons needed (Search, ChevronDown, Menu)
- [x] Write Spec with all sections complete
- [ ] Add `accentBlue` color token to `src/theme.ts`
- [ ] Add `SearchIcon`, `ChevronDownIcon`, `MenuIcon` SVG components to `ServiceIcon.tsx`
- [ ] Add new Burmese i18n strings for Ticket/Save/Custom price
- [ ] Rewrite `SellScreen.tsx` layout to match Figma design
- [ ] Update `ItemCard.tsx` styling for new card dimensions
- [ ] Run `npm run typecheck` and fix any errors

## Out of scope

- Changing the cart checkout flow (CartSheet remains unchanged)
- Adding new navigation libraries (manual routing stays)
- Backend/API integration (app remains fully offline)
- Item card photo/image support (avatar-based cards only)
- Category filtering functionality (dropdown UI only, no filter logic)
- Custom price input field (toggle UI only, no price override logic)
- Unrelated screen refactors (HomeScreen, ItemsScreen, HistoryScreen unchanged)

## Notes

- Figma node is named "Home" but represents the Sell screen (အရောင်း page)
- Item card content is NOT shown in Figma (empty white cards) — dev should design appropriate content that fits the 136×127px card size while reusing existing ItemCard patterns
- The Figma uses Inter font for "Source MM" title — keep using Pyidaungsu for Burmese UI text, Inter is acceptable for the brand name
- HomeScreen already uses #4A6CF7 for its banner — this color should be added as a theme token for consistency
- The "Ticket" pill shows item count badge — this should reflect the current cart count
- The "Save" button likely saves the current sale/ticket — wire to existing cart confirm flow
- Category dropdown in search bar is UI-only for this spec (no filter implementation)
