# SafeVoice — setup

## Run locally (VS Code)
1. `bun install` (or `npm install`)
2. `.env` holds `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; set `LOVABLE_API_KEY` server-side for the AI classifier.
3. `bun run dev` → http://localhost:8080 (Chrome/Edge needed for speech recognition + Bluetooth).

## Architecture
```
mic ─┬─ Web Speech API (streaming STT, en-IN) ─ on-device NLP (src/lib/nlp/local-intent.ts)
     │      ├─ fuzzy code-word match (Levenshtein, sliding window) → instant SOS
     │      ├─ weighted distress lexicon + negation + repetition (noisy-OR) ≥0.9 → instant SOS
     │      └─ ambiguous → AI classifier (src/lib/ai/intent.server.ts, structured output)
     └─ Web Audio analyser (RMS + spectral centroid) → scream detection → AI classifier
SOS (src/lib/sos.ts): GPS fix → event saved → native SMS composer to all contacts + helplines
     → watchPosition live tracking updates the event until "I'm safe".
Wearable (src/lib/wearable.ts): BLE GATT protocol v1, notify characteristic → SOS.
```
Fail-safe: if AI is unreachable, the on-device score decides.

## Database tables
profiles, emergency_contacts (kind: personal | helpline), code_words, sos_events — all row-level secured to the owner.

## Going native
Wrap with Capacitor for background mic, silent SMS (Twilio server route) and iOS Bluetooth using the same UUIDs.
