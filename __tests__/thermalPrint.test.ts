import {
  checkThermalPrinterConnection,
  printImageToThermal,
  ThermalPrintError,
  type ThermalPrinterAdapter,
} from '../src/thermalPrint';

function createAdapter(overrides: Partial<ThermalPrinterAdapter> = {}) {
  const calls: string[] = [];
  const adapter: ThermalPrinterAdapter = {
    runExclusive: async (task) => { calls.push('queue'); await task(); },
    connect: async () => { calls.push('connect'); },
    getStatus: async () => { calls.push('status'); return { online: { statusCode: 1 } }; },
    addImage: async (_uri, width) => { calls.push(`image:${width}`); },
    addFeedLine: async () => { calls.push('feed'); },
    addCut: async () => { calls.push('cut'); },
    sendData: async () => { calls.push('send'); },
    disconnect: async () => { calls.push('disconnect'); },
    ...overrides,
  };
  return { adapter, calls };
}

const config = { target: 'BT:AA:BB:CC', deviceName: 'Epson TM', paperWidth: '58' as const };

describe('thermal print orchestration', () => {
  test('prints a 58 mm receipt in order and disconnects', async () => {
    const { adapter, calls } = createAdapter();
    await printImageToThermal('file:///receipt.png', config, { adapter });
    expect(calls).toEqual(['queue', 'connect', 'status', 'image:384', 'feed', 'cut', 'send', 'disconnect']);
  });

  test('uses 576 dots for 80 mm and can skip auto cut', async () => {
    const { adapter, calls } = createAdapter();
    await printImageToThermal('file:///receipt.png', { ...config, paperWidth: '80', autoCut: false }, { adapter });
    expect(calls).toContain('image:576');
    expect(calls).not.toContain('cut');
  });

  test('checks connection without sending a receipt and disconnects', async () => {
    const { adapter, calls } = createAdapter();
    await checkThermalPrinterConnection(config, { adapter });
    expect(calls).toEqual(['queue', 'connect', 'status', 'disconnect']);
  });

  test('reports an offline connection check and disconnects', async () => {
    const { adapter, calls } = createAdapter({
      getStatus: async () => { calls.push('status'); return { online: { statusCode: 0 } }; },
    });
    await expect(checkThermalPrinterConnection(config, {
      adapter, connectAttempts: 1,
    })).rejects.toMatchObject({ code: 'offline' });
    expect(calls).toEqual(['queue', 'connect', 'status', 'disconnect']);
  });

  test('retries an offline printer a bounded number of times then disconnects', async () => {
    const { adapter, calls } = createAdapter({
      getStatus: async () => { calls.push('status'); return { online: { statusCode: 0 } }; },
    });
    await expect(printImageToThermal('file:///receipt.png', config, {
      adapter, connectAttempts: 2, retryDelayMs: 0, sleep: async () => undefined,
    })).rejects.toMatchObject({ code: 'offline' });
    expect(calls.filter((call) => call === 'connect')).toHaveLength(2);
    expect(calls[calls.length - 1]).toBe('disconnect');
  });

  test('does not retry an ambiguous send failure and still disconnects', async () => {
    const { adapter, calls } = createAdapter({
      sendData: async () => { calls.push('send'); throw new Error('timeout'); },
    });
    await expect(printImageToThermal('file:///receipt.png', config, { adapter })).rejects.toEqual(expect.any(ThermalPrintError));
    expect(calls.filter((call) => call === 'send')).toHaveLength(1);
    expect(calls[calls.length - 1]).toBe('disconnect');
  });

  test('mock mode prints without a selected physical printer', async () => {
    await expect(printImageToThermal('file:///receipt.png', {
      target: '', deviceName: '', paperWidth: '58', mode: 'mock',
    })).resolves.toBeUndefined();
  });
});
