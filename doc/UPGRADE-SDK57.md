# Expo SDK 54 → 57 Upgrade Plan

## Overview

Upgrade the `clothes-pos` project from Expo SDK 54 to SDK 57. SDK 57 is primarily a React Native 0.86 bump with no breaking changes — described by Expo as "the easiest Expo SDK upgrade."

## Package Version Changes

### Core

| Package | Current (SDK 54) | Target (SDK 57) | Notes |
|---------|------------------|-----------------|-------|
| `expo` | ~54.0.36 | ~57.0.22 | |
| `react` | 19.1.0 | 19.2.3 | Minor bump |
| `react-native` | 0.81.5 | 0.86.3 | Major bump (no breaking changes) |

### Expo Packages

All expo-* packages undergo a versioning alignment to match the SDK number (e.g. `expo-camera` goes from `~17.x` to `~57.x`).

| Package | Current (SDK 54) | Target (SDK 57) |
|---------|------------------|-----------------|
| `expo-camera` | ~17.0.10 | ~57.0.5 |
| `expo-document-picker` | ~14.0.8 | ~57.0.2 |
| `expo-file-system` | ~19.0.20 | ~57.0.7 |
| `expo-font` | ~14.0.12 | ~57.0.4 |
| `expo-image` | ~3.0.11 | ~57.0.5 |
| `expo-image-picker` | ~16.1.4 | ~57.0.17 |
| `expo-print` | ~15.0.8 | ~57.0.2 |
| `expo-sharing` | ~14.0.8 | ~57.0.19 |
| `expo-sqlite` | ~16.0.10 | ~57.0.3 |
| `expo-status-bar` | ~3.0.9 | ~57.0.1 |

### Third-party

| Package | Current (SDK 54) | Target (SDK 57) | Change |
|---------|------------------|-----------------|--------|
| `react-native-safe-area-context` | ~5.6.0 | ~5.7.0 | Minor |
| `react-native-svg` | 15.12.1 | 15.15.4 | Patch |
| `jest-expo` | ~54.0.0 | ~57.0.5 | Major (versioning aligned) |
| `@types/react` | ~19.1.10 | ~19.2.0 | Minor |
| `typescript` | ~5.9.2 | ~5.9.2 | No change |

## Breaking Changes Check

| Area | Status | Notes |
|------|--------|-------|
| `expo-camera` | No code changes | Codebase already uses `CameraView` (not deprecated `Camera`) |
| `expo-sqlite` | No code changes | Uses modern async API (`runAsync`, `getFirstAsync`, etc.) |
| `serializeAsync`/`deserializeAsync` | No changes | Still supported in SDK 57 |
| `tsconfig.json` | No changes | Extends `expo/tsconfig.base`, auto-updates |
| `app.json` plugins | No changes | All plugin configs are compatible |

## Implementation Steps

### Step 1: Run the upgrade command

```bash
npx expo install expo@^57.0.0 --fix
```

This auto-updates all expo-* packages and peer dependencies to SDK 57-compatible versions.

### Step 2: Verify dependency compatibility

```bash
npx expo-doctor@latest
```

Check for any mismatched or incompatible dependencies.

### Step 3: Typecheck

```bash
npm run typecheck
```

Verify TypeScript compiles cleanly with the new `@types/react` and SDK packages.

### Step 4: Test the app

Verify these critical features work:
- [ ] Camera barcode scanning (`ScannerModal.tsx`)
- [ ] SQLite CRUD operations (`db.ts`)
- [ ] File system backup/restore (`serializeAsync`/`deserializeAsync`)
- [ ] Font loading (Pyidaungsu Regular + Bold)
- [ ] Image picker (`expo-image-picker`)
- [ ] Document picker (`expo-document-picker`)

### Step 5: Update AGENTS.md

Update version references in `AGENTS.md` to reflect SDK 57 versions:
- `expo ~54.0.36` → `~57.0.22`
- `react 19.1.0` → `19.2.3`
- `react-native 0.81.5` → `0.86.3`
- All expo-* package versions
- Third-party package versions

## Risk Assessment

**Low risk.** SDK 57 is designed to be a minimal, non-breaking upgrade:
- React Native 0.86 has no breaking changes from 0.85
- No app code changes required
- Expo provides the `--fix` flag to handle version alignment automatically
- The project already uses modern APIs (`CameraView`, async SQLite)

## Rollback

If issues arise, revert `package.json` and run `npm install` to restore SDK 54 versions.
