import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSafety } from "@/hooks/use-safety";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — SafeVoice" }, { name: "description", content: "Your details shared with responders during an SOS." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { profile, refresh } = useSafety();
  const [f, setF] = useState({ full_name: "", phone: "", blood_group: "", address: "", medical_notes: "", sos_message: "", location_enabled: false });
  useEffect(() => { if (profile) setF({ full_name: profile.full_name, phone: profile.phone, blood_group: profile.blood_group, address: profile.address, medical_notes: profile.medical_notes, sos_message: profile.sos_message, location_enabled: profile.location_enabled }); }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").upsert(
  { ...f, id: user!.id },
  { onConflict: "id" }
);
    if (error) toast.error(error.message); else { toast.success("Profile saved"); refresh(); }
  }
  function toggleGps(on: boolean) {
    if (!on) return setF({ ...f, location_enabled: false });
    navigator.geolocation.getCurrentPosition(
      () => { setF((s) => ({ ...s, location_enabled: true })); toast.success("Location access granted"); },
      () => toast.error("Location blocked — enable it in your browser/phone settings"),
      { enableHighAccuracy: true },
    );
  }
  const field = (k: keyof typeof f, label: string, ph = "") => (
    <div className="space-y-1.5"><Label htmlFor={k}>{label}</Label><Input id={k} placeholder={ph} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );

  return (
    <form onSubmit={save} className="space-y-6">
      <h1 className="text-3xl font-extrabold">Profile</h1>
      <div className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-2">
        {field("full_name", "Full name")}
        {field("phone", "Your phone", "+91 98…")}
        {field("blood_group", "Blood group", "B+")}
        {field("address", "Home address")}
        <div className="space-y-1.5 sm:col-span-2"><Label>Medical notes</Label><Input value={f.medical_notes} onChange={(e) => setF({ ...f, medical_notes: e.target.value })} placeholder="Allergies, conditions…" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Emergency message</Label><Textarea value={f.sos_message} onChange={(e) => setF({ ...f, sos_message: e.target.value })} rows={3} /></div>
      </div>
      <div className="glass flex items-center justify-between rounded-2xl p-5">
        <div><p className="font-semibold">Share GPS / live location during SOS</p><p className="text-sm text-muted-foreground">{user?.email}</p></div>
        <Switch checked={f.location_enabled} onCheckedChange={toggleGps} />
      </div>
      <Button type="submit" variant="hero" size="lg">Save profile</Button>
    </form>
  );
}
