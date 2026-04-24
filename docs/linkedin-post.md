# LinkedIn posts — Text-to-Speech Converter

Two drop-in versions. Pick one, paste into LinkedIn, optionally attach
the OG screenshot from `public/og.png` (it's already 1200×630).

Links used in both posts:

- Live demo: <https://vite-upgrade-text-to-speech.vercel.app/>
- Source: <https://github.com/jash90/vite-upgrade-text-to-speech>

---

## 🇬🇧 English

🎙️ Shipped: a browser-first text-to-speech converter — OpenAI cloud voices **or** fully offline Piper VITS running via WebAssembly.

Why I built it: I kept bouncing between paid cloud TTS for quality and free-but-limited alternatives, and wanted one tool that does both. So:

→ OpenAI TTS (`tts-1`, `tts-1-hd`, `gpt-4o-mini-tts`) — voice dropdown auto-filters to what the selected model actually supports
→ Offline Piper VITS for Polish & English — runs fully in the browser after a one-time model download (cached in OPFS, ~63 MB per voice)
→ Drop multiple `.txt` files → each gets its own audio + a merged MP3 on top
→ Live USD cost estimate based on current OpenAI pricing, before you hit Convert
→ Free voice previews via OpenAI's public sample CDN — zero API calls

Stack worth mentioning:
• Bun as bundler + dev server + Edge function (no Vite, no PostCSS)
• Tailwind v4 with CSS-first `@theme` config
• React 18 with a lazy-loaded piper-tts-web + onnxruntime-web chunk so OpenAI-only users don't pay the bundle cost
• Vercel Edge function proxy (needed because OpenAI's `/v1/audio/speech` blocks direct browser calls via CORS)

MIT, no signup, no tracking. The OpenAI key never leaves your machine except to call OpenAI itself.

🔗 Try it: https://vite-upgrade-text-to-speech.vercel.app/
⭐ Source: https://github.com/jash90/vite-upgrade-text-to-speech

#WebDev #OpenAI #TTS #Bun #React #WebAssembly #OpenSource #Piper

---

## 🇵🇱 Polski

🎙️ Nowy projekt: przeglądarkowy konwerter tekstu na mowę — głosy OpenAI z chmury **albo** w pełni offline Piper VITS na WebAssembly.

Po co: ciągle przeskakiwałem między płatnym cloudowym TTS dla jakości a darmowymi rozwiązaniami z ograniczeniami. Chciałem jednego narzędzia, które daje oba światy:

→ OpenAI TTS (`tts-1`, `tts-1-hd`, `gpt-4o-mini-tts`) — lista głosów filtruje się automatycznie do tego, co wspiera wybrany model
→ Offline Piper VITS dla polskiego i angielskiego — działa w całości w przeglądarce po jednorazowym pobraniu modelu (cache w OPFS, ~63 MB na głos)
→ Przeciągasz kilka plików `.txt` → każdy dostaje własne audio, a na górze zmergowany MP3
→ Na żywo widzisz koszt w USD na podstawie aktualnego cennika OpenAI, jeszcze przed kliknięciem „Convert"
→ Darmowe podglądy głosów przez publiczne sample OpenAI — zero wywołań API

Stack wart wspomnienia:
• Bun jako bundler + dev server + Edge function (bez Vite, bez PostCSS)
• Tailwind v4 z konfigiem po stronie CSS (`@theme`)
• React 18 z lazy-loadowanym chunkiem piper-tts-web + onnxruntime-web — użytkownicy trybu OpenAI nie płacą bundle'em za część offline
• Proxy do OpenAI jako Vercel Edge Function (konieczne, bo `/v1/audio/speech` blokuje bezpośrednie wywołania z przeglądarki przez CORS)

MIT, bez rejestracji, bez trackingu. Klucz OpenAI nigdy nie opuszcza Twojej maszyny poza samymi wywołaniami do OpenAI.

🔗 Wypróbuj: https://vite-upgrade-text-to-speech.vercel.app/
⭐ Kod: https://github.com/jash90/vite-upgrade-text-to-speech

#WebDev #OpenAI #TTS #Bun #React #WebAssembly #OpenSource #PolskiTech #Piper
