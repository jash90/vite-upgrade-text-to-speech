## 🇵🇱 Wersja polska

Zbudowałem aplikację text-to-speech, która działa w dwóch trybach: chmurze (OpenAI) i lokalnie w przeglądarce (Piper + WASM). Po drodze wyleciały w powietrze dwa założenia, które wcześniej uważałem za oczywiste.

Po pierwsze — **Vite nie jest już obowiązkowy**. Projekt zaczął się jako klasyczny stack Vite + React, ale skończył jako setup oparty wyłącznie na Bun: runtime, bundler, dev server, package manager. Jeden plik `scripts/build.ts`, `bun --hot` w devie, zero Vite. Build jest szybszy, a `package.json` chudszy o kilkanaście devDependencies.

Po drugie — **lokalny TTS w przeglądarce jest realny**, ale ma swoje pułapki. Użyłem `@mintplex-labs/piper-tts-web`, który uruchamia modele ONNX przez WebAssembly. I tu zaczęła się zabawa:

🔸 Dłuższe teksty powodowały `RangeError` — ONNX runtime używa int32 do indeksowania tensora, więc przy dużym wejściu licznik się przepełnia. Rozwiązanie: chunkowanie tekstu na zdania i konkatenacja audio po stronie klienta.

🔸 Po kilku generacjach WASM rzucał `bad_alloc`. Liniowa pamięć WebAssembly fragmentuje się i nie da się jej "odzyskać" bez zrestartowania modułu. Rozwiązanie: reset sesji Piper między większymi zadaniami.

Wnioski dla zespołów, które myślą o inferencji w przeglądarce:
✅ Działa — ale planuj chunkowanie od pierwszego dnia
✅ WASM memory = zużyj i wyrzuć; nie licz na GC
✅ Bun jako kompletny stack to dziś realna alternatywa dla Vite, nie eksperyment

Stack: React 18 · TypeScript · Tailwind v4 · shadcn/ui · Bun · Piper TTS · OpenAI TTS · Vercel (Fluid Compute)

A Wy — mielibyście w produkcji model ML działający całkowicie po stronie klienta, czy wolicie bezpieczną chmurę?

---

## 🇬🇧 English version

I built a text-to-speech app that runs in two modes: cloud (OpenAI) and fully local in the browser (Piper + WASM). Along the way, two assumptions I used to take for granted went up in smoke.

First — **Vite is no longer mandatory**. The project started as a standard Vite + React stack and ended up Bun-only: runtime, bundler, dev server, package manager. One `scripts/build.ts`, `bun --hot` in dev, zero Vite. Builds are faster, `package.json` is lighter by a dozen devDependencies.

Second — **in-browser TTS is real**, but it has sharp edges. I used `@mintplex-labs/piper-tts-web`, which runs ONNX models via WebAssembly. That's where the fun started:

🔸 Longer inputs threw `RangeError` — ONNX runtime uses int32 for tensor indexing, so large inputs overflow the counter. Fix: chunk the text by sentence and concatenate audio on the client.

🔸 After a few generations, WASM threw `bad_alloc`. WebAssembly linear memory fragments and can't be "reclaimed" without resetting the module. Fix: reset the Piper session between larger jobs.

Takeaways for teams considering in-browser inference:
✅ It works — but plan chunking from day one
✅ WASM memory = use-and-discard; don't trust GC
✅ Bun as a complete stack is a real Vite alternative today, not an experiment

Stack: React 18 · TypeScript · Tailwind v4 · shadcn/ui · Bun · Piper TTS · OpenAI TTS · Vercel (Fluid Compute)

Curious — would you ship a fully client-side ML model to production, or stick with the safety of the cloud?
