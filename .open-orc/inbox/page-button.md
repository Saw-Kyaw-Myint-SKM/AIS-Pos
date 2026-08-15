<!-- open-orc-ui:agent-drafted -->
# Spec

## Goal

ပစ္စည်းအသစ်ထည့်ရန် page မှာ အလုပ်မလုပ်သော "အတန်းထည့်မည်" button ကို ဖယ်ရှားရန်

## Acceptance criteria

- "အတန်းထည့်မည်" (Add Row) button no longer appears on the ItemFormScreen (add/edit item page)
- A new "မှတ်စု" (Note) multiline TextArea field is rendered in its place on the form
- The note value persists: saving an item with a note stores it in SQLite, and re-opening the form shows the saved note
- `npm run typecheck` passes with zero errors
- Existing items without a note continue to work (backward compatible — note defaults to empty string)

## Repo facts

### Files to touch

- `src/screens/ItemFormScreen.tsx` — remove the non-functional `addRowBtn` Pressable (line 194-196); add `note` to `ItemFormValue` type, `emptyForm`, and render a multiline `TextInput` for "မှတ်စု"; add corresponding styles
- `src/i18n.ts` — add `note: 'မှတ်စု'` key under `items`
- `src/db.ts` — add `note: string` to `ClothingItem` type; add migration in `initializeDatabase` to ALTER TABLE clothes ADD COLUMN note; update `saveClothingItem` INSERT/UPDATE to include `note`
- `App.tsx` — include `note: form.note` in the `saveClothingItem` call inside `saveItem` callback (line ~173)

### Key symbols / patterns

- `ItemFormValue` (ItemFormScreen.tsx line 9) — add `note: string`
- `emptyForm` (ItemFormScreen.tsx line 35) — add `note: ''`
- `itemToForm` (ItemFormScreen.tsx line 21) — map `item.note` if it exists
- `addRowBtn` / `addRowText` styles (ItemFormScreen.tsx lines 353-366) — remove these unused styles
- `ClothingItem` (db.ts line 13) — add `note: string`
- `saveClothingItem` (db.ts line 153) — add `note` to both INSERT and UPDATE statements
- `initializeDatabase` (db.ts line 48) — add migration: check for `note` column, add if missing
- `t.items.addRow` (i18n.ts line 58) — can be removed or left unused
- `saveItem` callback (App.tsx line 165) — pass `note` through to `saveClothingItem`

### Steps to reproduce

1. Open the app → navigate to ပစ္စည်းများ (Items) tab
2. Tap "+ အသစ်" to open the add item form
3. Observe the "အတန်းထည့်မည်" button with no `onPress` handler — tapping it does nothing

### Expected vs actual

- **Expected:** A "မှတ်စု" (Note) multiline TextArea field appears on the form for entering item notes
- **Actual:** A non-functional "အတန်းထည့်မည်" (Add Row) button appears with no `onPress` handler

### Verified commands

- `npm run typecheck` — TypeScript strict mode, zero errors

## Todo list

- [ ] Remove the non-functional "အတန်းထည့်မည်" button and its styles from `ItemFormScreen.tsx`
- [ ] Add `note: string` to `ItemFormValue`, `emptyForm`, and `itemToForm` in `ItemFormScreen.tsx`
- [ ] Render a multiline `TextInput` for "မှတ်စု" in the form (replacing the removed button position)
- [ ] Add `note: 'မှတ်စု'` to `i18n.ts` under `items`
- [ ] Add `note: string` to `ClothingItem` type in `db.ts`
- [ ] Add migration for `note` column in `initializeDatabase` (ALTER TABLE if missing)
- [ ] Update `saveClothingItem` INSERT and UPDATE to include `note` field
- [ ] Update `saveItem` in `App.tsx` to pass `note` through
- [ ] Run `npm run typecheck` and confirm zero errors

## Out of scope

- Unrelated refactors or UI changes
- Adding note display to item cards or other screens
- Changing the database schema beyond the `note` column addition
