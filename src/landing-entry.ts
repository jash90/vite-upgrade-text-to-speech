// Minimal entry for the static landing page. The only reason this file
// exists is to pull index.css through the JS module graph — Vercel's
// Bun HTML bundler currently doesn't resolve bare <link rel="stylesheet">
// paths to src/** the way the dev server does.
import './index.css';
