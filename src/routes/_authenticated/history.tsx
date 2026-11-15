import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { mapsLink } from "@/lib/sos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "SOS history — SafeVoice" }, { name: "description", content: "Every SOS alert with trigger, AI reasoning and location." }] }),
  component: History,
});

function History() {
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["sos_events", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("sos_events").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">SOS history</h1>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : data.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-muted-foreground">No alerts yet. Hope it stays that way 💛</p>
      ) : (
        <ul className="space-y-3">
          {data.map((e) => (
            <li key={e.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", e.status === "resolved" ? "bg-safe text-safe-foreground" : "bg-primary text-primary-foreground")}>{e.status}</span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize">{e.trigger_source}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                <span className="ml-auto text-xs text-muted-foreground">{e.notified_count} notified · {Math.round(e.confidence * 100)}% conf.</span>
              </div>
              {e.transcript && <p className="mt-3 text-sm">“{e.transcript}”</p>}
              {e.reason && <p className="mt-1 text-xs text-muted-foreground">{e.reason}</p>}
              {e.latitude != null && e.longitude != null && (
                <a className="mt-2 inline-flex items-center gap-1 text-sm text-safe underline" target="_blank" rel="noreferrer"
                  href={mapsLink({ latitude: e.latitude, longitude: e.longitude, accuracy: e.accuracy ?? 0 })}>
                  <MapPin className="size-4" /> View location
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
