jest.mock("expo-sqlite", () => {
  const db = {
    execAsync: jest.fn(async () => {}),
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    withTransactionAsync: jest.fn(async (fn) => fn(db)),
  };
  return {
    openDatabaseAsync: jest.fn(async () => db),
    SQLiteDatabase: jest.fn(),
    SQLiteProvider: ({ children }) => children,
    useSQLiteContext: () => db,
  };
});

jest.mock("expo-font", () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(async () => true),
}));

jest.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn(async () => "file:///mock-receipt.png"),
}));

jest.mock("react-native-esc-pos-printer", () => {
  class Printer {
    constructor() {}
    addQueueTask = async (task) => task();
    connect = jest.fn(async () => undefined);
    getStatus = jest.fn(async () => ({ online: { statusCode: 1 } }));
    addImage = jest.fn(async () => undefined);
    addFeedLine = jest.fn(async () => undefined);
    addCut = jest.fn(async () => undefined);
    sendData = jest.fn(async () => undefined);
    disconnect = jest.fn(async () => undefined);
  }
  return {
    Printer,
    PrinterConstants: { TRUE: 1, COLOR_NONE: 0, MODE_MONO: 0, CUT_FEED: 0 },
    DiscoveryFilterOption: { MODEL_ALL: 0, TRUE: 1, PORTTYPE_BLUETOOTH: 0 },
    usePrintersDiscovery: () => ({
      printers: [], isDiscovering: false, printerError: null,
      start: jest.fn(), stop: jest.fn(),
    }),
  };
});

jest.mock("expo-file-system/legacy", () => ({
  StorageAccessFramework: {
    getUriForDirectoryInRoot: jest.fn(),
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
  },
}));
