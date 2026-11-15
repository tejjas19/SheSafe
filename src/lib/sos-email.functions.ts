import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const hdr = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

/** Emails the SOS message to every saved contact that has an email, from the connected Gmail account. */
export const sendSosEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ message: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
    const GOOGLE_MAIL_API_KEY = process.env["GOOGLE_MAIL_API_KEY"];
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) return { sent: 0, failed: 0, error: "Email is not configured" };

    // Recipients come from the user's own saved contacts (RLS), never from client input.
    const { data: rows, error } = await context.supabase.from("emergency_contacts").select("name, email");
    if (error) return { sent: 0, failed: 0, error: error.message };
    const emails = [...new Set((rows ?? []).map((r) => r.email.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];
    if (!emails.length) return { sent: 0, failed: 0, error: "No contacts have an email saved" };

    let sent = 0;
    const errors: string[] = [];
    for (const to of emails) {
      const raw = b64(
        [`To: ${to}`, `Subject: ${hdr("🚨 SOS — urgent help needed")}`, "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "", data.message].join("\r\n"),
      ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (res.ok) sent++;
      else {
        const body = await res.text();
        console.error(`Gmail send failed [${res.status}]: ${body}`);
        errors.push(`${res.status}`);
      }
    }
    return { sent, failed: errors.length, error: errors.length ? `Some emails failed (${errors.join(", ")})` : null };
  });
