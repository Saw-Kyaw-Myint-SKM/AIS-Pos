import { Printer, PrinterConstants } from 'react-native-esc-pos-printer';
import type { PaperWidth, PrinterMode } from './db';

export const paperWidthToDots = (width: PaperWidth): number => (width === '80' ? 576 : 384);
export const paperWidthToPx = paperWidthToDots;

export type ThermalPrintErrorCode =
  | 'connect_timeout'
  | 'offline'
  | 'send_unknown'
  | 'unknown';

export class ThermalPrintError extends Error {
  constructor(
    public readonly code: ThermalPrintErrorCode,
    options?: { cause?: unknown },
  ) {
    super(code);
    this.name = 'ThermalPrintError';
  }
}

export type ThermalPrinterConfig = {
  target: string;
  deviceName: string;
  paperWidth: PaperWidth;
  mode?: PrinterMode;
  autoCut?: boolean;
};

type PrinterStatus = {
  online?: { statusCode?: number };
};

export type ThermalPrinterAdapter = {
  runExclusive: (task: () => Promise<void>) => Promise<void>;
  connect: (timeoutMs: number) => Promise<void>;
  getStatus: () => Promise<PrinterStatus>;
  addImage: (uri: string, width: number) => Promise<void>;
  addFeedLine: (lines: number) => Promise<void>;
  addCut: () => Promise<void>;
  sendData: (timeoutMs: number) => Promise<void>;
  disconnect: () => Promise<void>;
};

export type ThermalPrintOptions = {
  adapter?: ThermalPrinterAdapter;
  connectAttempts?: number;
  connectTimeoutMs?: number;
  sendTimeoutMs?: number;
  retryDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

const wait = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

export function createEpsonPrinterAdapter(config: ThermalPrinterConfig): ThermalPrinterAdapter {
  const printer = new Printer({
    target: config.target,
    deviceName: config.deviceName || 'Printer',
  });

  return {
    runExclusive: async (task) => {
      await printer.addQueueTask(task);
    },
    connect: async (timeoutMs) => {
      await printer.connect(timeoutMs);
    },
    getStatus: async () => printer.getStatus(),
    addImage: async (uri, width) => {
      await printer.addImage({
        source: { uri },
        width,
        color: PrinterConstants.COLOR_NONE,
        mode: PrinterConstants.MODE_MONO,
      });
    },
    addFeedLine: async (lines) => {
      await printer.addFeedLine(lines);
    },
    addCut: async () => {
      await printer.addCut(PrinterConstants.CUT_FEED);
    },
    sendData: async (timeoutMs) => {
      await printer.sendData(timeoutMs);
    },
    disconnect: async () => {
      await printer.disconnect();
    },
  };
}

export function createMockPrinterAdapter(): ThermalPrinterAdapter {
  return {
    runExclusive: async (task) => task(),
    connect: async () => undefined,
    getStatus: async () => ({ online: { statusCode: PrinterConstants.TRUE } }),
    addImage: async () => undefined,
    addFeedLine: async () => undefined,
    addCut: async () => undefined,
    sendData: async () => undefined,
    disconnect: async () => undefined,
  };
}

async function connectWithRetry(
  adapter: ThermalPrinterAdapter,
  attempts: number,
  timeoutMs: number,
  retryDelayMs: number,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await adapter.connect(timeoutMs);
      const status = await adapter.getStatus();
      if (status.online?.statusCode === PrinterConstants.TRUE) return;
      lastError = new ThermalPrintError('offline');
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts - 1) await sleep(retryDelayMs);
  }
  if (lastError instanceof ThermalPrintError) throw lastError;
  throw new ThermalPrintError('connect_timeout', { cause: lastError });
}

export async function printImageToThermal(
  imageUri: string,
  config: ThermalPrinterConfig,
  options: ThermalPrintOptions = {},
): Promise<void> {
  const adapter = options.adapter ?? (
    config.mode === 'mock' ? createMockPrinterAdapter() : createEpsonPrinterAdapter(config)
  );
  const attempts = Math.max(1, options.connectAttempts ?? 3);
  const connectTimeoutMs = options.connectTimeoutMs ?? 1500;
  const sendTimeoutMs = options.sendTimeoutMs ?? 8000;
  const retryDelayMs = options.retryDelayMs ?? 300;
  const sleep = options.sleep ?? wait;

  await adapter.runExclusive(async () => {
    let primaryError: unknown;
    try {
      await connectWithRetry(adapter, attempts, connectTimeoutMs, retryDelayMs, sleep);
      await adapter.addImage(imageUri, paperWidthToDots(config.paperWidth));
      await adapter.addFeedLine(2);
      if (config.autoCut !== false) await adapter.addCut();
      try {
        await adapter.sendData(sendTimeoutMs);
      } catch (error) {
        throw new ThermalPrintError('send_unknown', { cause: error });
      }
    } catch (error) {
      primaryError = error;
      if (error instanceof ThermalPrintError) throw error;
      throw new ThermalPrintError('unknown', { cause: error });
    } finally {
      try {
        await adapter.disconnect();
      } catch (disconnectError) {
        if (!primaryError) throw new ThermalPrintError('unknown', { cause: disconnectError });
      }
    }
  });
}
