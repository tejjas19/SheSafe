import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSafety } from "@/hooks/use-safety";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Safety circle — SafeVoice" }, { name: "description", content: "Manage emergency contacts and police/women helplines." }] }),
  component: Contacts,
});

const PRESETS = [
  { name: "Police / Emergency", phone: "112" }, { name: "Women Helpline", phone: "1091" },
  { name: "Women Helpline (Domestic abuse)", phone: "181" }, { name: "Ambulance", phone: "108" },
];

function Contacts() {
  const { user } = useAuth();
  const { contacts, refresh } = useSafety();
  const [form, setForm] = useState({ name: "", phone: "", email: "", relation: "", kind: "personal" });

  async function add(c: { name: string; phone: string; email?: string; relation: string; kind: string } = form) {
    if (!c.name || !/^[+\d\s-]{3,20}$/.test(c.phone)) { toast.error("Enter a name and a valid phone number"); return; }
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) { toast.error("Enter a valid email"); return; }
    const { error } = await supabase.from("emergency_contacts").insert({ ...c, email: c.email ?? "", user_id: user!.id });
    if (error) { toast.error(error.message); return; }
    setForm({ name: "", phone: "", email: "", relation: "", kind: "personal" });
    refresh();
  }
  async function remove(id: string) { await supabase.from("emergency_contacts").delete().eq("id", id); refresh(); }

  const groups = [["personal", "Your people"], ["helpline", "Helplines"]] as const;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Safety circle</h1>
      <p className="text-sm text-muted-foreground">Add an email for each person. When an SOS goes off, they get an email right away.</p>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="glass grid gap-3 rounded-2xl p-5 sm:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Phone (+91…)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Relation" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} />
        <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          <option value="personal">Personal</option><option value="helpline">Helpline</option>
        </select>
        <Button type="submit" variant="hero"><Plus /> Add</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {PRESETS.filter((p) => !contacts.some((c) => c.phone === p.phone)).map((p) => (
          <Button key={p.phone} variant="outline" size="sm" onClick={() => add({ ...p, relation: "Helpline", kind: "helpline" })}><Plus /> {p.name} ({p.phone})</Button>
        ))}
      </div>
      {groups.map(([kind, title]) => (
        <section key={kind}>
          <h2 className="mb-3 text-lg font-bold">{title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.filter((c) => c.kind === kind).map((c) => (
              <div key={c.id} className="glass flex items-center gap-3 rounded-2xl p-4">
                <span className="flex size-11 items-center justify-center rounded-full bg-secondary font-display font-bold">{c.name[0]}</span>
                <div className="flex-1"><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone}{c.email ? ` · ${c.email}` : ""}{c.relation ? ` · ${c.relation}` : ""}</p></div>
                <Button asChild variant="ghost" size="icon"><a href={`tel:${c.phone}`} aria-label="Call"><Phone /></a></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Delete"><Trash2 /></Button>
              </div>
            ))}
            {!contacts.some((c) => c.kind === kind) && <p className="text-sm text-muted-foreground">None yet.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
