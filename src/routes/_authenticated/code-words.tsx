import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSafety } from "@/hooks/use-safety";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/code-words")({
  head: () => ({ meta: [{ title: "Code words — SafeVoice" }, { name: "description", content: "Create secret phrases that silently trigger SOS." }] }),
  component: CodeWords,
});

const IDEAS = ["I'm coming home", "Did you feed the cat", "Order the blue pizza", "Please reach me"];

function CodeWords() {
  const { user } = useAuth();
  const { codeWords, profile, refresh } = useSafety();
  const [phrase, setPhrase] = useState("");
  const [editing, setEditing] = useState<{ id: string; phrase: string } | null>(null);

  async function add(p = phrase) {
    const v = p.trim();
    if (v.length < 2 || v.length > 80) { toast.error("Use 2–80 characters"); return; }
    const { error } = await supabase.from("code_words").insert({ user_id: user!.id, phrase: v });
    if (error) { toast.error(error.message); return; }
    setPhrase(""); refresh();
  }
  async function save() {
    if (!editing) return;
    await supabase.from("code_words").update({ phrase: editing.phrase.trim() }).eq("id", editing.id);
    setEditing(null); refresh();
  }
  async function remove(id: string) { await supabase.from("code_words").delete().eq("id", id); refresh(); }
  async function setSensitivity(s: string) { await supabase.from("profiles").update({ sensitivity: s }).eq("id", user!.id); refresh(); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Code words</h1>
        <p className="mt-1 text-sm text-muted-foreground">Innocent-sounding phrases you can say on a call or out loud. When heard, SOS fires instantly — no AI second-guessing.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="glass flex gap-2 rounded-2xl p-4">
        <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Type a secret phrase…" />
        <Button type="submit" variant="hero"><Plus /> Add</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {IDEAS.filter((i) => !codeWords.some((c) => c.phrase.toLowerCase() === i.toLowerCase())).map((i) => (
          <Button key={i} variant="outline" size="sm" onClick={() => add(i)}><Plus /> {i}</Button>
        ))}
      </div>
      <ul className="space-y-2">
        {codeWords.map((c) => (
          <li key={c.id} className="glass flex items-center gap-2 rounded-2xl p-3">
            {editing?.id === c.id ? (
              <>
                <Input value={editing.phrase} onChange={(e) => setEditing({ ...editing, phrase: e.target.value })} autoFocus />
                <Button size="icon" variant="ghost" onClick={save} aria-label="Save"><Check /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel"><X /></Button>
              </>
            ) : (
              <>
                <span className="flex-1 px-2 font-semibold">“{c.phrase}”</span>
                <Button size="icon" variant="ghost" onClick={() => setEditing(c)} aria-label="Edit"><Pencil /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)} aria-label="Delete"><Trash2 /></Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <section className="glass rounded-2xl p-5">
        <h2 className="font-bold">AI sensitivity</h2>
        <p className="text-sm text-muted-foreground">How sure the AI must be before sending SOS for non-code-word speech.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["low", "balanced", "high"] as const).map((s) => (
            <Button key={s} variant={profile?.sensitivity === s ? "hero" : "outline"} onClick={() => setSensitivity(s)} className="capitalize">{s}</Button>
          ))}
        </div>
      </section>
    </div>
  );
}
