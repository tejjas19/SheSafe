import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeLocally, type LocalIntent } from "@/lib/nlp/local-intent";
import { classifyIntent } from "@/lib/ai/intent.functions";

/**
 * Voice pipeline:
 *  mic ─┬─> Web Speech API (streaming STT, en-IN) ─> on-device NLP ─┬─> code word? → SOS
 *       │                                                           └─> distress? → AI classifier → SOS
 *       └─> Web Audio analyser (RMS + spectral centroid) → scream detector → AI/heuristic → SOS
 */
export type Detection = {
  at: number;
  transcript: string;
  local: LocalIntent;
  ai?: { intent: string; confidence: number; reason: string };
  decision: "sos" | "ignored" | "checking";
};

export type GuardStatus = "idle" | "listening" | "analyzing" | "unsupported" | "error";

type SR = any;
const getSR = (): SR | null =>
  typeof window === "undefined" ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

export function useVoiceGuard(opts: {
  codeWords: string[];
  sensitivity: "low" | "balanced" | "high";
  onEmergency: (d: { transcript: string; source: "voice" | "scream"; intent: string; confidence: number; reason: string }) => void;
}) {
  const [status, setStatus] = useState<GuardStatus>("idle");
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [log, setLog] = useState<Detection[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SR>(null);
  const activeRef = useRef(false);
  const audioRef = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const loudSinceRef = useRef<number | null>(null);
  const cooldownRef = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const thresholds = { low: 0.8, balanced: 0.55, high: 0.35 }[opts.sensitivity];

  const fire = useCallback((d: Parameters<typeof opts.onEmergency>[0]) => {
    if (Date.now() < cooldownRef.current) return;
    cooldownRef.current = Date.now() + 30000;
    optsRef.current.onEmergency(d);
  }, []);

  const evaluate = useCallback(async (transcript: string, screamDetected: boolean) => {
    const local = analyzeLocally(transcript, optsRef.current.codeWords);
    const entry: Detection = { at: Date.now(), transcript, local, decision: "checking" };
    const push = (e: Detection) => setLog((l) => [e, ...l.filter((x) => x.at !== e.at)].slice(0, 20));

    // 1) Covert code word → instant trigger, never second-guessed.
    if (local.codeWordMatch && !local.negated) {
      push({ ...entry, decision: "sos" });
      fire({ transcript, source: "voice", intent: "emergency", confidence: local.codeWordMatch.similarity, reason: `Matched code word “${local.codeWordMatch.phrase}”` });
      return;
    }
    // 2) Very strong local evidence → instant trigger.
    if (local.distressScore >= 0.9 && !local.negated) {
      push({ ...entry, decision: "sos" });
      fire({ transcript, source: screamDetected ? "scream" : "voice", intent: "emergency", confidence: local.distressScore, reason: `Distress phrases: ${local.signals.join(", ")}` });
      return;
    }
    // 3) Ambiguous → escalate to AI.
    if (local.distressScore >= thresholds * 0.6 || screamDetected) {
      push(entry);
      setStatus("analyzing");
      try {
        const ai = await classifyIntent({ data: { transcript, localScore: local.distressScore, signals: local.signals, screamDetected } });
        const isSos = ai.intent === "emergency" && ai.confidence >= thresholds;
        push({ ...entry, ai, decision: isSos ? "sos" : "ignored" });
        if (isSos) fire({ transcript, source: screamDetected ? "scream" : "voice", intent: ai.intent, confidence: ai.confidence, reason: ai.reason });
      } catch {
        push({ ...entry, decision: "ignored" });
      } finally {
        if (activeRef.current) setStatus("listening");
      }
      return;
    }
    push({ ...entry, decision: "ignored" });
  }, [fire, thresholds]);

  const startAudioMonitor = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } });
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    const time = new Float32Array(an.fftSize);
    const freq = new Float32Array(an.frequencyBinCount);
    const tick = () => {
      an.getFloatTimeDomainData(time);
      an.getFloatFrequencyData(freq);
      let sum = 0;
      for (const v of time) sum += v * v;
      const rms = Math.sqrt(sum / time.length);
      // spectral centroid (Hz) – screams are loud AND high-pitched
      let num = 0, den = 0;
      for (let i = 0; i < freq.length; i++) {
        const mag = Math.pow(10, freq[i]! / 20);
        num += mag * i; den += mag;
      }
      const centroid = den ? (num / den) * (ctx.sampleRate / an.fftSize) : 0;
      setLevel(Math.min(1, rms * 5));
      const loud = rms > 0.25 && centroid > 1200;
      if (loud) {
        loudSinceRef.current ??= Date.now();
        if (Date.now() - loudSinceRef.current > 700) {
          loudSinceRef.current = null;
          evaluate("[scream / sustained loud high-pitched voice detected]", true);
        }
      } else loudSinceRef.current = null;
      if (audioRef.current) audioRef.current.raf = requestAnimationFrame(tick);
    };
    audioRef.current = { ctx, stream, raf: requestAnimationFrame(tick) };
  }, [evaluate]);

  const start = useCallback(async () => {
    const SRc = getSR();
    setError(null);
    if (!SRc) { setStatus("unsupported"); setError("Speech recognition isn't supported here. Use Chrome or Edge."); return; }
    try {
      await startAudioMonitor();
    } catch {
      setStatus("error"); setError("Microphone permission denied."); return;
    }
    const rec = new SRc();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    rec.onresult = (e: any) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) evaluate(r[0].transcript, false);
        else {
          partial += r[0].transcript;
          // fast-path on interim results for code words / strong pleas
          const l = analyzeLocally(partial, optsRef.current.codeWords);
          if ((l.codeWordMatch && l.codeWordMatch.similarity > 0.92) || l.distressScore >= 0.95) evaluate(partial, false);
        }
      }
      setInterim(partial);
    };
    rec.onerror = (e: any) => { if (e.error === "not-allowed") { setError("Microphone blocked."); stop(); } };
    rec.onend = () => { if (activeRef.current) try { rec.start(); } catch { /* restarting */ } };
    recRef.current = rec;
    activeRef.current = true;
    rec.start();
    setStatus("listening");
  }, [evaluate, startAudioMonitor]);

  const stop = useCallback(() => {
    activeRef.current = false;
    try { recRef.current?.stop(); } catch { /* noop */ }
    recRef.current = null;
    if (audioRef.current) {
      cancelAnimationFrame(audioRef.current.raf);
      audioRef.current.stream.getTracks().forEach((t) => t.stop());
      audioRef.current.ctx.close();
      audioRef.current = null;
    }
    setLevel(0); setInterim(""); setStatus("idle");
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { status, interim, level, log, error, start, stop, testPhrase: (t: string) => evaluate(t, false) };
}
