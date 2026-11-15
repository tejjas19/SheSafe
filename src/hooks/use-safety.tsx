import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { connectWearable } from "@/lib/wearable";
import { startLiveTracking, triggerSos, type Contact, type GeoFix, type Profile } from "@/lib/sos";
import { sendSosEmails } from "@/lib/sos-email.functions";

type ActiveSos = { id: string; message: string; geo: GeoFix | null; numbers: string[]; source: string; reason: string };
type FireArgs = { source: "voice" | "manual" | "wearable" | "scream"; transcript?: string; intent?: string; confidence?: number; reason?: string };

type SafetyCtx = {
  profile: (Profile & { sensitivity: string }) | null;
  contacts: Contact[];
  codeWords: { id: string; phrase: string }[];
  active: ActiveSos | null;
  fireSos: (a: FireArgs) => Promise<void>;
  resolveSos: () => Promise<void>;
  refresh: () => void;
  wearable: WearState;
  connectWear: () => Promise<void>;
  disconnectWear: () => void;
};
type WearState = { connected: boolean; name: string; battery?: number | undefined; lastEvent?: string };
const Ctx = createContext<SafetyCtx | null>(null);

export function SafetyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;

  const profileQ = useQuery({
    queryKey: ["profile", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle()).data,
  });
  const contactsQ = useQuery({
    queryKey: ["contacts", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("emergency_contacts").select("*").order("created_at")).data ?? [],
  });
  const wordsQ = useQuery({
    queryKey: ["code_words", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("code_words").select("id, phrase").order("created_at")).data ?? [],
  });

  const [active, setActive] = useState<ActiveSos | null>(null);
  const stopTrack = useRef<(() => void) | null>(null);

  const fireSos = useCallback(async (a: FireArgs) => {
    if (!uid) return;
    toast.error("SOS triggered — alerting your circle", { duration: 6000 });
    const r = await triggerSos({ userId: uid, ...a, profile: (profileQ.data as Profile) ?? null, contacts: contactsQ.data ?? [] });
    sendSosEmails({ data: { message: r.message } })
      .then((m) => (m.sent ? toast.success(`SOS email sent to ${m.sent} contact${m.sent > 1 ? "s" : ""}`) : toast.error(m.error ?? "Email not sent")))
      .catch(() => toast.error("SOS email could not be sent"));
    if (r.event) {
      setActive({ id: r.event.id, message: r.message, geo: r.geo, numbers: r.numbers, source: a.source, reason: a.reason ?? "" });
      stopTrack.current?.();
      stopTrack.current = startLiveTracking(r.event.id, (g) => setActive((s) => (s ? { ...s, geo: g } : s)));
    }
    qc.invalidateQueries({ queryKey: ["sos_events"] });
  }, [uid, profileQ.data, contactsQ.data, qc]);

  const resolveSos = useCallback(async () => {
    stopTrack.current?.(); stopTrack.current = null;
    if (active) await supabase.from("sos_events").update({ status: "resolved" }).eq("id", active.id);
    setActive(null);
    qc.invalidateQueries({ queryKey: ["sos_events"] });
    toast.success("Marked safe. Stay safe 💛");
  }, [active, qc]);

  useEffect(() => () => stopTrack.current?.(), []);

  const refresh = () => qc.invalidateQueries();

  const [wearable, setWearable] = useState<WearState>({ connected: false, name: "" });
  const wearOff = useRef<(() => void) | null>(null);
  const fireRef = useRef(fireSos);
  fireRef.current = fireSos;
  const connectWear = async () => {
    try {
      wearOff.current = await connectWearable({
        onStatus: (s) => setWearable((w) => ({ ...w, ...s })),
        onTrigger: (ev) => fireRef.current({ source: "wearable", reason: `Wearable: ${ev}` }),
      });
      toast.success("Wearable paired");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pairing failed");
    }
  };
  const disconnectWear = () => { wearOff.current?.(); setWearable({ connected: false, name: "" }); };

  return (
    <Ctx.Provider value={{
      profile: (profileQ.data as any) ?? null, contacts: contactsQ.data ?? [], codeWords: wordsQ.data ?? [],
      active, fireSos, resolveSos, refresh, wearable, connectWear, disconnectWear,
    }}>{children}</Ctx.Provider>
  );
}

export function useSafety() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSafety must be inside SafetyProvider");
  return c;
}
