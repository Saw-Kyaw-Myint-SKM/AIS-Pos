# Spec

## Goal

change design in sales page

## Figma

https://www.figma.com/design/xOoeeQTPQ2cPxL2i4s5M0W/Clothes-POS?node-id=2015-468&t=YkBirmex7fDomz1e-4

## Acceptance criteria

- Layout, spacing, and hierarchy match the Figma node
- Colors/radius mapped to `src/theme.ts` (new tokens only if justified)
- Reuses existing components where possible
- Burmese UI via `t.*` / `AppText`; prices via `formatKyat()`
- `npm run typecheck` passes

## Design facts

### Layout

- 

### Tokens / colors

- 

### Assets to export

- 

## Repo facts

### Files to touch

- 

### Key symbols / patterns

- `src/theme.ts`, `AppText`, existing screens/components

### Verified commands

- `npm run typecheck`

## Todo list

- [ ] Pull Figma design context
- [ ] Map to theme + existing components
- [ ] Implement screen wiring in `App.tsx` if needed
- [ ] Export assets into `assets/`
- [ ] Typecheck

## Out of scope

- Unrelated refactors
- New navigation libraries

## Notes

- no keep existing ui 
- change  design like figma but create proucts card design using your idea
