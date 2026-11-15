import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

/** Server-only: AI intent classifier on Lovable AI Gateway. */
export const intentSchema = z.object({
  intent: z.enum(["emergency", "possible_distress", "normal"]),
  confidence: z.number(),
  reason: z.string(),
});
export type AiIntent = z.infer<typeof intentSchema>;

const INSTRUCTIONS = `You are the safety-intent classifier inside SafeVoice, a women's safety app.
You receive a short speech-to-text transcript captured while the user's voice guard was on, plus signals from an on-device model.
Classify whether the speaker is genuinely asking for help or is in danger right now.
- "emergency": explicit pleas (help, save me, call police, bachao), threats, being attacked/followed, screaming, panic, or the user's own covert code word.
- "possible_distress": fearful/ambiguous but not clearly an emergency.
- "normal": everyday talk, quoting songs/films, negated statements ("I don't need help"), or jokes.
Transcripts may be noisy, partial, Hinglish or multilingual. Prefer safety: when explicit pleas appear without negation, choose emergency.
confidence is 0..1. reason is one short sentence.`;

export async function classifyWithAi(input: {
  transcript: string;
  localScore: number;
  signals: string[];
  screamDetected: boolean;
}): Promise<AiIntent> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    output: Output.object({ schema: intentSchema }),
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          transcript: input.transcript,
          on_device_distress_score: input.localScore,
          on_device_signals: input.signals,
          scream_or_loud_voice_detected: input.screamDetected,
        }),
      },
    ],
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const out = await result.output;
  return { ...out, confidence: Math.max(0, Math.min(1, out.confidence)) };
}
