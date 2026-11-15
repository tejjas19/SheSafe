/**
 * On-device NLP layer (runs in the browser, zero latency, works offline).
 * 1. Normalises the transcript (lowercase, strip punctuation, collapse repeats)
 * 2. Fuzzy-matches the user's personal code words (token-level Levenshtein)
 * 3. Scores a weighted distress lexicon (English + Hinglish) with negation handling
 * The result decides whether to fire instantly (code word), escalate to the
 * AI classifier (ambiguous distress), or ignore (normal speech).
 */

export type LocalIntent = {
  normalized: string;
  codeWordMatch: { phrase: string; similarity: number } | null;
  distressScore: number; // 0..1
  signals: string[];
  negated: boolean;
};

const DISTRESS_LEXICON: Array<[string, number]> = [
  ["help me", 0.9], ["save me", 0.95], ["help", 0.6], ["somebody help", 0.95], ["someone help", 0.95],
  ["call the police", 0.95], ["call police", 0.95], ["police", 0.5], ["let me go", 0.85], ["leave me alone", 0.8],
  ["get away from me", 0.85], ["dont touch me", 0.9], ["stop it", 0.5], ["stop", 0.3], ["please stop", 0.6],
  ["im scared", 0.6], ["i am scared", 0.6], ["being followed", 0.8], ["following me", 0.75], ["kidnap", 0.9],
  ["emergency", 0.7], ["danger", 0.65], ["attack", 0.8], ["hurt me", 0.8], ["no no no", 0.6],
  ["bachao", 0.95], ["bachaao", 0.95], ["madad", 0.8], ["chhodo", 0.8], ["chodo mujhe", 0.9], ["mujhe bachao", 0.98],
];

const NEGATIONS = ["dont need", "do not need", "no need", "not in danger", "just kidding", "im fine", "i am fine", "its okay"];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\u0900-\u097f\s]/g, " ")
    .replace(/(.)\1{2,}/g, "$1$1") // "heeeelp" -> "heelp"
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev! + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

const sim = (a: string, b: string) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

/** Sliding-window phrase similarity: best match of the phrase anywhere in the transcript. */
export function phraseSimilarity(transcript: string, phrase: string): number {
  const t = transcript.split(" ");
  const p = normalize(phrase).split(" ");
  if (!p[0]) return 0;
  let best = 0;
  for (let w = Math.max(1, p.length - 1); w <= p.length + 1; w++) {
    for (let i = 0; i + w <= t.length; i++) {
      best = Math.max(best, sim(t.slice(i, i + w).join(" "), p.join(" ")));
    }
  }
  return best;
}

export function analyzeLocally(transcript: string, codeWords: string[]): LocalIntent {
  const normalized = normalize(transcript);
  const signals: string[] = [];

  let codeWordMatch: LocalIntent["codeWordMatch"] = null;
  for (const phrase of codeWords) {
    const s = phraseSimilarity(normalized, phrase);
    if (s >= 0.82 && (!codeWordMatch || s > codeWordMatch.similarity)) codeWordMatch = { phrase, similarity: s };
  }
  if (codeWordMatch) signals.push(`code word “${codeWordMatch.phrase}”`);

  let score = 0;
  for (const [term, w] of DISTRESS_LEXICON) {
    if (` ${normalized} `.includes(` ${term} `)) {
      score = 1 - (1 - score) * (1 - w); // noisy-OR combination
      signals.push(term);
    }
  }
  const repeats = normalized.match(/\b(help|bachao|stop)\b/g)?.length ?? 0;
  if (repeats >= 2) { score = Math.min(1, score + 0.15); signals.push("repeated plea"); }

  const negated = NEGATIONS.some((n) => normalized.includes(n));
  if (negated) score *= 0.3;

  return { normalized, codeWordMatch, distressScore: Number(score.toFixed(3)), signals, negated };
}
