import { supabase } from "@/integrations/supabase/client";

export type Contact = { id: string; name: string; phone: string; relation: string; kind: string; email?: string };
export type Profile = {
  full_name: string; phone: string; blood_group: string; address: string;
  medical_notes: string; sos_message: string; location_enabled: boolean;
};
export type GeoFix = { latitude: number; longitude: number; accuracy: number };

export function getLocation(timeout = 8000): Promise<GeoFix | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 5000 },
    );
  });
}

export const mapsLink = (g: GeoFix) => `https://maps.google.com/?q=${g.latitude.toFixed(6)},${g.longitude.toFixed(6)}`;

export function buildMessage(p: Profile | null, g: GeoFix | null, source: string) {
  const lines = [
    `🚨 SOS from ${p?.full_name || "a SafeVoice user"}`,
    p?.sos_message || "I am in danger and need help.",
    g ? `📍 ${mapsLink(g)} (±${Math.round(g.accuracy)}m)` : "📍 Location unavailable",
    p?.phone ? `📞 ${p.phone}` : "",
    p?.blood_group ? `🩸 Blood: ${p.blood_group}` : "",
    p?.medical_notes ? `ℹ️ ${p.medical_notes}` : "",
    `Trigger: ${source} · ${new Date().toLocaleString()}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Opens the phone's native SMS composer pre-filled for every contact (works on Android/iOS). */
export function smsUri(numbers: string[], body: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return `sms:${numbers.join(",")}${isIOS ? "&" : "?"}body=${encodeURIComponent(body)}`;
}

/** WhatsApp click-to-chat link (one recipient per link). 10-digit numbers assume India (+91). */
export function waLink(phone: string, body: string) {
  let d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(body)}`;
}

export async function triggerSos(opts: {
  userId: string;
  source: "voice" | "manual" | "wearable" | "scream";
  transcript?: string;
  intent?: string;
  confidence?: number;
  reason?: string;
  profile: Profile | null;
  contacts: Contact[];
}) {
  const geo = await getLocation();
  const message = buildMessage(opts.profile, geo, opts.source);
  const numbers = opts.contacts.map((c) => c.phone.replace(/[^\d+]/g, "")).filter(Boolean);

  const { data: event } = await supabase
    .from("sos_events")
    .insert({
      user_id: opts.userId,
      trigger_source: opts.source,
      transcript: opts.transcript ?? "",
      intent: opts.intent ?? "emergency",
      confidence: opts.confidence ?? 1,
      reason: opts.reason ?? "",
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      accuracy: geo?.accuracy ?? null,
      notified_count: numbers.length,
    })
    .select()
    .single();

  if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 800]);
  // No auto-navigation: SOS emails go out automatically; SMS/WhatsApp stay as manual buttons in the banner.

  return { event, message, geo, numbers };
}

/** Live tracking: keeps updating the SOS event with fresh coordinates until stopped. */
export function startLiveTracking(eventId: string, onFix?: (g: GeoFix) => void) {
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition(
    async (p) => {
      const g = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy };
      onFix?.(g);
      await supabase.from("sos_events").update({ latitude: g.latitude, longitude: g.longitude, accuracy: g.accuracy }).eq("id", eventId);
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 10000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
