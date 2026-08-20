import { Printer, PrinterConstants } from 'react-native-esc-pos-printer';
import type { PaperWidth } from './db';

export const paperWidthToDots = (w: PaperWidth): number => (w === '80' ? 576 : 384);

export const paperWidthToPx = (w: PaperWidth): number => (w === '80' ? 576 : 384);

export type ThermalPrinterConfig = {
  target: string;
  deviceName: string;
  paperWidth: PaperWidth;
};

export async function printImageToThermal(
  imageUri: string,
  config: ThermalPrinterConfig,
): Promise<void> {
  const printer = new Printer({
    target: config.target,
    deviceName: config.deviceName || 'Printer',
  });

  await printer.addQueueTask(async () => {
    await Printer.tryToConnectUntil(
      printer,
      (status) => status.online.statusCode === PrinterConstants.TRUE,
    );
    await printer.addImage({
      source: { uri: imageUri },
      width: paperWidthToDots(config.paperWidth),
      color: PrinterConstants.COLOR_NONE,
      mode: PrinterConstants.MODE_MONO,
    });
    await printer.addFeedLine(2);
    await printer.addCut(PrinterConstants.CUT_FEED);
    const result = await printer.sendData();
    await printer.disconnect();
    return result;
  });
}
