/**
 * SafeVoice Wearable Protocol v1 (BLE GATT)
 * Any chip (nRF52, ESP32-C3…) in jewellery, a belt or hair clip can implement:
 *
 *  Service   SAFEVOICE_SERVICE  6e400001-b5a3-f393-e0a9-e50e24dcca9e
 *  Char      TRIGGER_CHAR       6e400003-b5a3-f393-e0a9-e50e24dcca9e  (notify)
 *     byte0 = event: 0x01 SOS (button long-press), 0x02 fall detected,
 *                    0x03 heart-rate spike, 0x10 heartbeat/keep-alive
 *     byte1 = battery %
 *  Standard Battery Service 0x180F is read if present.
 *
 * The phone app listens for notifications and calls onTrigger() for SOS events.
 * Web Bluetooth works in Chrome/Edge (Android, desktop). iOS needs a native wrapper
 * (Capacitor + @capacitor-community/bluetooth-le) using the same UUIDs.
 */
export const SAFEVOICE_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const TRIGGER_CHAR = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

export const WEARABLE_EVENTS: Record<number, string> = {
  0x01: "SOS button",
  0x02: "Fall detected",
  0x03: "Heart-rate spike",
  0x10: "Keep-alive",
};

type BtNav = Navigator & { bluetooth?: { requestDevice(o: unknown): Promise<any> } };

export const bluetoothSupported = () => typeof navigator !== "undefined" && !!(navigator as BtNav).bluetooth;

export async function connectWearable(handlers: {
  onTrigger: (event: string) => void;
  onStatus: (s: { name: string; battery?: number | undefined; lastEvent?: string; connected: boolean }) => void;
}) {
  const bt = (navigator as BtNav).bluetooth;
  if (!bt) throw new Error("Bluetooth is not supported in this browser. Use Chrome on Android or desktop.");
  const device = await bt.requestDevice({
    filters: [{ services: [SAFEVOICE_SERVICE] }, { namePrefix: "SafeVoice" }],
    optionalServices: [SAFEVOICE_SERVICE, "battery_service"],
  });
  const name = device.name ?? "SafeVoice wearable";
  device.addEventListener("gattserverdisconnected", () => handlers.onStatus({ name, connected: false }));
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(SAFEVOICE_SERVICE);
  const ch = await service.getCharacteristic(TRIGGER_CHAR);
  await ch.startNotifications();
  ch.addEventListener("characteristicvaluechanged", (e: any) => {
    const v: DataView = e.target.value;
    const code = v.getUint8(0);
    const battery = v.byteLength > 1 ? v.getUint8(1) : undefined;
    const label = WEARABLE_EVENTS[code] ?? `Unknown 0x${code.toString(16)}`;
    handlers.onStatus({ name, battery, lastEvent: label, connected: true });
    if (code === 0x01 || code === 0x02 || code === 0x03) handlers.onTrigger(label);
  });
  handlers.onStatus({ name, connected: true });
  return () => device.gatt?.disconnect();
}
