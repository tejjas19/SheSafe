import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const classifyIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        transcript: z.string().max(2000),
        localScore: z.number().min(0).max(1),
        signals: z.array(z.string().max(100)).max(30),
        screamDetected: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { classifyWithAi } = await import("./intent.server");
    try {
      return { ok: true as const, ...(await classifyWithAi(data)) };
    } catch (e) {
      console.error("intent classify failed", e);
      // Fail-safe: fall back to on-device score so SOS never depends on network AI.
      const intent = data.localScore >= 0.7 || data.screamDetected ? "emergency" : "normal";
      return { ok: false as const, intent, confidence: data.localScore, reason: "AI unavailable – used on-device model" };
    }
  });
