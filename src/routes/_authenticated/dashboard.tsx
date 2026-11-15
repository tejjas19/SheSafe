import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, MicOff, MapPin, Bluetooth, Hand, Loader2 } from "lucide-react";
import { useSafety } from "@/hooks/use-safety";
import { useVoiceGuard } from "@/hooks/use-voice-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Voice SOS — SafeVoice" }, { name: "description", content: "Turn on your AI voice guard and trigger SOS hands-free." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, contacts, codeWords, fireSos, wearable } = useSafety();
  const guard = useVoiceGuard({
    codeWords: codeWords.map((c) => c.phrase),
    sensitivity: (profile?.sensitivity as "low" | "balanced" | "high") ?? "balanced",
    onEmergency: (d) => fireSos({ source: d.source, transcript: d.transcript, intent: d.intent, confidence: d.confidence, reason: d.reason }),
  });
  const [gps, setGps] = useState<PermissionState | "unknown">("unknown");
  const [test, setTest] = useState("");
  const listening = guard.status === "listening" || guard.status === "analyzing";

  useEffect(() => {
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((p) => {
      setGps(p.state); p.onchange = () => setGps(p.state);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Hey {profile?.full_name?.split(" ")[0] || "there"} 👋</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">{listening ? "Voice guard is on" : "You're in control"}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="glass flex flex-col items-center rounded-3xl p-8">
          <button
            onClick={() => (listening ? guard.stop() : guard.start())}
            aria-label={listening ? "Stop voice guard" : "Start voice guard"}
            className="relative my-4 flex size-56 items-center justify-center rounded-full md:size-64"
          >
            {listening && <>
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-sos-ring" />
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-sos-ring [animation-delay:0.9s]" />
            </>}
            <span className={cn("sos-orb relative flex size-full flex-col items-center justify-center rounded-full transition-transform", listening && "scale-95")}
              style={{ transform: listening ? `scale(${0.95 + guard.level * 0.15})` : undefined }}>
              {guard.status === "analyzing" ? <Loader2 className="size-12 animate-spin text-primary-foreground" />
                : listening ? <Mic className="size-12 text-primary-foreground" /> : <MicOff className="size-12 text-primary-foreground" />}
              <span className="mt-2 font-display text-2xl font-extrabold text-primary-foreground">
                {guard.status === "analyzing" ? "Analyzing" : listening ? "Listening" : "Tap to guard"}
              </span>
            </span>
          </button>
          <p className="min-h-6 max-w-sm text-center text-sm italic text-muted-foreground">
            {guard.error ?? (guard.interim ? `“${guard.interim}”` : listening ? "Speak naturally. Say a code word or call for help." : "Voice guard listens for your code words, pleas & screams.")}
          </p>
          <Button variant="hero" size="lg" className="mt-6 w-full max-w-xs" onClick={() => fireSos({ source: "manual", reason: "Manual SOS button" })}>
            <Hand /> Send SOS now
          </Button>
        </section>

        <section className="space-y-4">
          <StatusRow ok={gps === "granted"} icon={MapPin} label="GPS location"
            value={gps === "granted" ? "Allowed" : gps === "denied" ? "Blocked in browser" : "Tap to allow"}
            onClick={() => navigator.geolocation.getCurrentPosition(() => setGps("granted"), () => setGps("denied"))} />
          <StatusRow ok={contacts.length > 0} icon={Hand} label="Safety circle" value={`${contacts.length} contacts`} to="/contacts" />
          <StatusRow ok={codeWords.length > 0} icon={Mic} label="Code words" value={`${codeWords.length} saved`} to="/code-words" />
          <StatusRow ok={wearable.connected} icon={Bluetooth} label="Wearable" value={wearable.connected ? wearable.name : "Not paired"} to="/wearable" />

          <div className="glass rounded-2xl p-4">
            <p className="text-sm font-semibold">Test the AI (no mic needed)</p>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (test.trim()) { guard.testPhrase(test); setTest(""); } }}>
              <Input value={test} onChange={(e) => setTest(e.target.value)} placeholder="e.g. someone is following me" />
              <Button type="submit" variant="secondary">Analyze</Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">Heads up: an emergency result really triggers SOS.</p>
          </div>
        </section>
      </div>

      <section className="glass rounded-3xl p-6">
        <h2 className="text-xl font-bold">Live detection feed</h2>
        {guard.log.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing heard yet.</p> : (
          <ul className="mt-3 divide-y divide-border">
            {guard.log.map((d) => (
              <li key={d.at} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm">“{d.transcript}”</p>
                  <p className="text-xs text-muted-foreground">
                    NLP score {Math.round(d.local.distressScore * 100)}%{d.local.signals.length ? ` · ${d.local.signals.join(", ")}` : ""}
                    {d.ai ? ` · AI: ${d.ai.intent} (${Math.round(d.ai.confidence * 100)}%) — ${d.ai.reason}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 self-start rounded-full px-3 py-1 text-xs font-bold",
                  d.decision === "sos" ? "bg-primary text-primary-foreground" : d.decision === "checking" ? "bg-warn text-accent-foreground" : "bg-secondary text-muted-foreground")}>
                  {d.decision === "sos" ? "SOS SENT" : d.decision === "checking" ? "AI checking…" : "Safe"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusRow({ ok, icon: Icon, label, value, to, onClick }: { ok: boolean; icon: typeof Mic; label: string; value: string; to?: string; onClick?: () => void }) {
  const inner = (
    <div className="glass flex items-center gap-3 rounded-2xl p-4 text-left">
      <span className={cn("flex size-10 items-center justify-center rounded-xl", ok ? "bg-safe/15 text-safe" : "bg-warn/15 text-warn")}><Icon className="size-5" /></span>
      <div className="flex-1"><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted-foreground">{value}</p></div>
      <span className={cn("size-2.5 rounded-full", ok ? "bg-safe" : "bg-warn")} />
    </div>
  );
  if (to) return <Link to={to} className="block">{inner}</Link>;
  return <button onClick={onClick} className="block w-full">{inner}</button>;
}
