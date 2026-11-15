import { useState } from "react";
import { Check, MapPin, MessageSquare, Phone, Send, ShieldCheck } from "lucide-react";
import { useSafety } from "@/hooks/use-safety";
import { Button } from "@/components/ui/button";
import { mapsLink, smsUri, waLink } from "@/lib/sos";

export function ActiveSosBanner() {
  const { active, contacts, resolveSos } = useSafety();
  const [sent, setSent] = useState<string[]>([]);
  if (!active) return null;
  const helpline = contacts.find((c) => c.kind === "helpline");
  const personal = contacts.filter((c) => c.kind === "personal");
  return (
    <div className="mx-5 mt-2 rounded-2xl border border-primary/50 bg-primary/15 p-4 md:mx-auto md:mt-6 md:max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <span className="relative flex size-3"><span className="absolute inset-0 rounded-full bg-primary animate-sos-ring" /><span className="relative size-3 rounded-full bg-primary" /></span>
        <p className="font-display text-lg font-bold">SOS active — live location sharing</p>
        <span className="text-xs text-muted-foreground">via {active.source}{active.reason ? ` · ${active.reason}` : ""}</span>
      </div>
      {active.geo && (
        <a href={mapsLink(active.geo)} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-sm text-safe underline">
          <MapPin className="size-4" /> {active.geo.latitude.toFixed(5)}, {active.geo.longitude.toFixed(5)} (±{Math.round(active.geo.accuracy)}m)
        </a>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild variant="hero" size="sm"><a href={smsUri(active.numbers, active.message)}><MessageSquare /> Resend SMS to {active.numbers.length}</a></Button>
        {helpline && <Button asChild variant="outline" size="sm"><a href={`tel:${helpline.phone}`}><Phone /> Call {helpline.name}</a></Button>}
        <Button variant="safe" size="sm" onClick={resolveSos}><ShieldCheck /> I'm safe</Button>
      </div>
      {personal.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Send on WhatsApp — tap each contact, then press send in WhatsApp</p>
          <div className="flex flex-wrap gap-2">
            {personal.map((c) => (
              <Button key={c.id} asChild variant={sent.includes(c.id) ? "safe" : "outline"} size="sm" className="border-safe/50">
                <a href={waLink(c.phone, active.message)} target="_blank" rel="noreferrer" onClick={() => setSent((s) => [...s, c.id])}>
                  {sent.includes(c.id) ? <Check /> : <Send />} {c.name}
                </a>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
