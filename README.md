# Clothes POS — အဝတ်အစားဆိုင်

Offline clothing point-of-sale app built with Expo, React Native, TypeScript, and SQLite. UI is fully in Burmese (Unicode) with Myanmar Kyat pricing, inspired by Loyverse POS.

## Features

- **ပင်မ (Home)** — Loyverse-style tile dashboard with today's sales summary
- **အရောင်း (Sell)** — tappable 2-column item grid, search, QR/barcode scan, floating cart bar
- **စျေးခြင်း (Cart)** — bottom-sheet confirmation with quantity steppers and total
- **ငွေရှင်းမည် (Checkout)** — saves the sale and shows a receipt-style summary
- **ပစ္စည်းစာရင်း (Items)** — clothing CRUD: name, size, price (Kyat), QR code
- **အရောင်းမှတ်တမ်း (History)** — daily total, sale list, tap to view the receipt
- All product and sales data stored locally in SQLite (offline)

## Language and font

- UI text: Burmese only (`src/i18n.ts`)
- Digits and prices are rendered with Myanmar numerals, e.g. `၈,၅၀၀ ကျပ်`
- Font: **Pyidaungsu 2.5.3** (Regular + Bold), bundled in `assets/fonts/`
  - Source: <https://github.com/mcfnlp/Pyidaungsu>
  - Loaded at runtime with `expo-font` (`useFonts`) and registered in `app.json` via the expo-font config plugin

## Run with Expo Go

Requirements: Node.js and the Expo Go app on a physical phone. Android Studio is not required.

```bash
npm install
npm start
```

Scan the QR code shown by Expo with Expo Go. The phone and computer must be on the same network. Allow camera permission when using the scanner.

### Expo Go compatibility

This project uses **Expo SDK 54** to match Expo Go `54.0.8`. If Expo Go reports that the project requires a newer version, fully close and reopen Expo Go, then restart the development server:

```bash
npm start -- --clear
```

The Expo Go app and the project SDK must be compatible. Do not use an old Expo Go APK. If the Play Store cannot update Expo Go on the device, use a supported physical Android device or create an Expo development build instead.

## Build an Android APK with EAS

Use an APK build to install AIS POS directly on an Android phone. In Git Bash, sign in and configure EAS once:

```bash
eas login
eas build:configure
```

Ensure `eas.json` includes an Android `preview` profile with `"buildType": "apk"`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

Start the APK build with:

```bash
eas build --platform android --profile preview
```

EAS prints a build URL. When the build finishes, open that URL on the Android phone and download the APK to install it. For Google Play publishing, build an AAB instead with `eas build --platform android --profile production`.

## Scanning

The scanner accepts **QR, EAN-13, EAN-8, UPC-A, UPC-E, and Code 128** codes. A toggle inside the scanner switches between single-scan mode (closes after one scan) and continuous multi-scan mode (keeps scanning with an on-screen counter). The scanned value is matched against each item's `QR / ဘားကုဒ်` field in the local database, so enter the barcode digits (e.g. an EAN-13 number) as the item's code to make barcode labels scannable.

## Usage notes

The app seeds five sample Burmese clothing items on its first launch (shirt, jeans, longyi, t-shirt, and a handbag with the EAN-13 code `2000000000017` for barcode testing). Add a clothing item with a code value matching the value encoded in the physical QR code or barcode. The scanner looks up that value in the local database and adds the item to the cart.

## Validation

```bash
npm run typecheck
npx expo-doctor
```

The SQLite database is named `clothes-pos.db` and is created in the app's local storage. Removing the app clears the local database.
