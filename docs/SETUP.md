# Goldilocks Sim — Build and run

How to build, run locally, and deploy the app.

---

## Build

```bash
npm install
npm run build
```

TypeScript in `src/` compiles to `dist/`. The site is static: `index.html` plus `dist/` (and any other assets at repo root).

---

## Run locally

Browsers block requests from `file://`. Use a local server:

```bash
npm run serve
```

Then open **http://localhost:3000** (or the port shown).

---

## Pages

- **index.html** — 3D simulation (home). “Search planets” / “Change planet” opens a modal (Suggestions presets + Search filters); picking a planet loads the sim.
- **simulation/** — Same 3D view when opened directly with a stored planet.

---

## Deploy (e.g. GitHub Pages)

The repo includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that builds and deploys the `site/` artifact (index.html + dist/) to GitHub Pages. In the repo **Settings → Pages**, set the source to **GitHub Actions**.
