<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## SafeVoice architecture
- Intent detection is hybrid: on-device NLP (src/lib/nlp) decides code words/strong pleas instantly; ambiguous speech goes to the AI server function. Why: SOS must never depend on network latency.
- SOS delivery uses the phone's native SMS composer/tel links (src/lib/sos.ts). Why: works without a paid SMS provider.
- Wearables speak the BLE protocol in src/lib/wearable.ts; keep UUIDs stable. Why: hardware firmware depends on them.
