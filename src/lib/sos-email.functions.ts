
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendSosEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ message: z.string().min(1).max(4000) }).parse(d)
  )
  .handler(async ({ data, context }) => {
   const RESEND_API_KEY = process.env["RESEND_API_KEY"];

    if (!RESEND_API_KEY) {
      return { sent: 0, failed: 0, error: "RESEND_API_KEY is not configured" };
    }

    const { data: rows, error } = await context.supabase
      .from("emergency_contacts")
      .select("name, email");

    if (error) {
      return { sent: 0, failed: 0, error: error.message };
    }

    const emails = [
      ...new Set(
        (rows ?? [])
          .map((r) => r.email?.trim())
          .filter((e): e is string => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      ),
    ];

    if (!emails.length) {
      return { sent: 0, failed: 0, error: "No valid contact emails found" };
    }

    let sent = 0;
    const errors: string[] = [];

    for (const to of emails) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SafeVoice <onboarding@resend.dev>",
          to: [to],
          subject: "🚨 SOS — Urgent help needed",
          text: `A SafeVoice SOS alert has been triggered.\n\n${data.message}\n\nPlease contact the person immediately.`,
        }),
      });

      if (response.ok) {
        sent++;
      } else {
        const body = await response.text();
        console.error(`Resend failed for ${to}: ${response.status} ${body}`);
        errors.push(`${response.status}`);
      }
    }

    return {
      sent,
      failed: errors.length,
      error: errors.length ? `Some emails failed: ${errors.join(", ")}` : null,
    };
  });
