import { createFileRoute } from "@tanstack/react-router";
import { Bluetooth, BluetoothOff, Gem } from "lucide-react";
import { useSafety } from "@/hooks/use-safety";
import { Button } from "@/components/ui/button";
import { SAFEVOICE_SERVICE, TRIGGER_CHAR, bluetoothSupported } from "@/lib/wearable";

export const Route = createFileRoute("/_authenticated/wearable")({
  head: () => ({ meta: [{ title: "Wearable — SafeVoice" }, { name: "description", content: "Pair smart jewellery, a belt or hair clip to trigger SOS over Bluetooth." }] }),
  component: Wearable,
});

function Wearable() {
  const { wearable, connectWear, disconnectWear } = useSafety();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Wearable</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pair a SafeVoice-compatible pendant, ring, belt buckle or hair clip. A long-press sends SOS through your phone.</p>
      </div>
      <div className="glass flex flex-col items-center gap-4 rounded-3xl p-8 text-center">
        <span className={wearable.connected ? "flex size-20 items-center justify-center rounded-full bg-safe/15 text-safe" : "flex size-20 items-center justify-center rounded-full bg-secondary text-muted-foreground"}>
          {wearable.connected ? <Bluetooth className="size-9" /> : <BluetoothOff className="size-9" />}
        </span>
        <div>
          <p className="font-display text-xl font-bold">{wearable.connected ? wearable.name : "No device paired"}</p>
          <p className="text-sm text-muted-foreground">
            {wearable.connected ? `Battery ${wearable.battery ?? "–"}% · Last event: ${wearable.lastEvent ?? "none"}` : bluetoothSupported() ? "Turn on your device and tap pair." : "This browser has no Bluetooth. Use Chrome on Android or desktop."}
          </p>
        </div>
        {wearable.connected
          ? <Button variant="outline" onClick={disconnectWear}>Disconnect</Button>
          : <Button variant="hero" size="lg" onClick={connectWear} disabled={!bluetoothSupported()}><Gem /> Pair wearable</Button>}
      </div>
      <section className="glass rounded-2xl p-5 text-sm">
        <h2 className="font-bold">For hardware makers — protocol v1</h2>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>Service UUID: <code className="text-foreground">{SAFEVOICE_SERVICE}</code></li>
          <li>Trigger characteristic (notify): <code className="text-foreground">{TRIGGER_CHAR}</code></li>
          <li>Byte 0: 0x01 SOS · 0x02 fall · 0x03 heart-rate spike · 0x10 keep-alive</li>
          <li>Byte 1: battery %</li>
        </ul>
      </section>
    </div>
  );
}
