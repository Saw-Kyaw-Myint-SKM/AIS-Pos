<!-- open-orc-ui:agent-drafted -->
# Spec

## Goal

Home Page မှာ setting icon change — `SettingsIcon` က sun icon (နေပုံစံ) ဖြစ်နေပြီး ဂီယာ/gear ပုံစံ setting icon အစစ်ဖြစ်အောင် ပြင်ရန်။

## Acceptance criteria

- Home Page ရဲ့ "ဆက်တင်များ" tile မှာ gear/cog ပုံစံ setting icon ပြသနေရမည် (sun/brightness icon မဟုတ်)
- Icon က အခြား service tiles (DollarIcon, PackageIcon, etc.) နဲ့ visual style ကိုက်ညီရမည် — white stroke on colored background, 22px size
- `SettingsIcon` component ကို `ServiceIcon.tsx` မှာ ပြင်ပြီးနောက် အခြား icon များ (DollarIcon, PackageIcon, ReceiptIcon, ScanIcon) ပုံမှန်အတိုင်း ဆက်လက်အလုပ်လုပ်ရမည်
- `npm run typecheck` passes with zero errors

## Repo facts

### Failing path(s)

- `src/components/ServiceIcon.tsx` — lines 64-76: `SettingsIcon` function renders a sun icon (circle + 8 radiating lines) instead of a gear/settings icon

### Files to touch

- `src/components/ServiceIcon.tsx` — replace the `SettingsIcon` SVG paths with a proper gear/cog icon (two interlocking circles or a cogwheel with teeth)

### Key symbols / patterns

- `SettingsIcon` (ServiceIcon.tsx line 64) — currently exports a sun icon; must be replaced with a gear/cog SVG
- `HomeScreen.tsx` line 70 — imports and uses `SettingsIcon` in the services array (no changes needed here, just verify it still renders)
- All icons in `ServiceIcon.tsx` share the same pattern: `Svg` from `react-native-svg` with `Path`/`Circle` elements, `stroke={color}`, `strokeWidth={2}`, `strokeLinecap="round"`

### Current buggy SVG (sun icon)

```tsx
export function SettingsIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      <Path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
```

This renders a center circle with 8 radiating lines — visually a sun, not a settings gear.

### Expected icon shape

A standard settings/gear icon: a cogwheel with teeth (typically 6-8 teeth around a center circle) or a simplified gear outline. Should match the existing icon style (stroke-based, no fill, `strokeWidth={2}`).

### Verified commands

- `npm run typecheck` — TypeScript strict mode, zero errors

## Todo list

- [ ] Replace the `SettingsIcon` SVG in `ServiceIcon.tsx` (lines 64-76) with a proper gear/cog icon that matches the existing stroke-based icon style
- [ ] Run `npm run typecheck` and confirm zero errors

## Out of scope

- Changing any other icons (DollarIcon, PackageIcon, ReceiptIcon, ScanIcon, etc.)
- Modifying HomeScreen.tsx layout or service tile styling
- Adding new features or screens
