# အသစ်ဖြစ်သော Branch ဖန်တီးခြင်း အစီအစဉ်

## ရည်ရွယ်ချက်

`develop` ဘရန်ခ်မှ **Bluetooth Printer Native Code** ကို ယူပြီး၊ `master` ဘရန်ခ်မှ **အခြား Feature များ** ကို ပေါင်းစည်းကာ အသစ် Branch တစ်ခုဖန်တီးရန်။

---

## ဘရန်ခ် အခြေအနေ

```
develop (f4d6299)     ← Printer Native Code ပါဝင်ပြီး၊ Feature အားလုံး ပါဝင်
    │
master (89f7eb1)      ← develop ထက် Commit ၄ ခု ပိုများ (Native Printer Code ဖျက်ထား)
                         + Uncommitted ပြင်ဆင်ချက်များ ပါဝင်
```

### ဘရန်ခ် ကွာခြားမှု

| ဘရန်ခ် | အခြေအနေ |
|---------|----------|
| `develop` | Printer Native Code ပါဝင်၊ Feature အားလုံး ပါဝင် |
| `master` | Native Printer Code ဖျက်ထား၊ ဒါပေမယ့် Printer Settings ပြင်ဆင်ချက်များ ပါဝင် |

---

## အဆင့်များ

### အဆင့် ၁ - develop မှ Branch အသစ်ဖန်တီး

```bash
git checkout develop
git checkout -b feature/printer-bluetooth
```

### အဆင့် ၂ - master မှ ဖိုင်များ ကူးယူ

master ဘရန်ခ်မှ ဖိုင်များကို ကူးယူရန်：

```bash
git checkout master -- App.tsx src/db.ts src/navigation.ts src/screens/HomeScreen.tsx src/screens/ReceiptScreen.tsx src/screens/SaleDetailScreen.tsx src/i18n.ts src/components/CartSheet.tsx package.json app.json
```

### အဆင့် ၃ - Master ၏ Uncommitted ပြင်ဆင်ချက်များ ထည့်သွင်း

Master ၏ `App.tsx` နှင့် `src/db.ts` တွင် Printer Settings ပြင်ဆင်ချက်များ ပါဝင်ပါသည်：

- `PrinterMode` Type
- `savePrinterSettings` Function
- `SETTING_PRINTER_TARGET`, `SETTING_PRINTER_DEVICE_NAME`, `SETTING_PRINTER_AUTO_CUT`
- Import DB ပြင်ဆင်ချက်

### အဆင့် ၄ - Dependencies ထည့်သွင်း

`package.json` တွင် Printer Dependencies ထည့်သွင်းရန်：

```json
"react-native-bluetooth-classic": "1.73.0-rc.17",
"react-native-esc-pos-printer": "4.5.0",
"react-native-view-shot": "5.1.1"
```

`app.json` တွင် Bluetooth Permissions ထည့်သွင်းရန်：

```json
"android.permission.BLUETOOTH",
"android.permission.BLUETOOTH_ADMIN",
"android.permission.BLUETOOTH_SCAN",
"android.permission.BLUETOOTH_CONNECT",
"android.permission.ACCESS_COARSE_LOCATION",
"android.permission.ACCESS_FINE_LOCATION"
```

### အဆင့် ၅ - Dependencies Install

```bash
npm install
```

### အဆင့် ၆ - Type Check နှင့် Test

```bash
npm run typecheck
npm run test
```

### အဆင့် ၇ - Push

```bash
git push -u origin feature/printer-bluetooth
```

---

## Conflict ဖြစ်နိုင်သော ဖိုင်များ

| ဖိုင် | Risk | ဖြေရှင်းနည်း |
|------|------|-------------|
| `App.tsx` | **မြင့်** | Master Base + Develop ၏ Printer Routes + Master ၏ Uncommitted Settings |
| `src/db.ts` | **မြင့်** | Master Base + Develop ၏ Printer Functions + Master ၏ Uncommitted Types |
| `src/navigation.ts` | နည်း | Develop တွင် Printer Route ပြီးပြီ |
| `src/screens/ReceiptScreen.tsx` | နည်း | Develop တွင် Print Integration ပြီးပြီ |
| `src/screens/SaleDetailScreen.tsx` | နည်း | Develop တွင် Print Integration ပြီးပြီ |
| `src/screens/HomeScreen.tsx` | နည်း | Develop တွင် Printer Tile ပြီးပြီ |
| `package.json` | နည်း | Dependencies ပေါင်းစည်းရန် |
| `app.json` | နည်း | Permissions ပေါင်းစည်းရန် |

---

## နောက်ဆက်တွဲ

- Branch အသစ်ဖန်တီးပြီးနောက် `npm run typecheck` နှင့် `npm run test` ဖြင့် စစ်ဆေးရန်
- Conflict ဖြစ်ပါက Manual Merge လုပ်ရန်
- Printer Native Code ကို Develop မှ ထိန်းသိမ်းရန်
