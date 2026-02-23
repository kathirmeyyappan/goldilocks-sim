# Goldilocks Sim — Build and run

How to build, run locally, and deploy the app.

---

## Build

```bash
npm install
npm run build
```

TypeScript in `src/` compiles to `dist/`. The site is static: `index.html`, `preloaded-planets.json`, and `dist/` (plus any other assets at repo root).

---

## Run locally

Browsers block requests from `file://`. Use a local server:

```bash
npm run serve
```

Then open **http://localhost:3000** (or the port shown).

---

## Pages and modal tabs

- **index.html** — 3D simulation (home). “Search planets” / “Change planet” opens a modal with three tabs:
  - **Examples** — Preloaded list from `preloaded-planets.json` (solar system + a few exoplanets). No API call; instant.
  - **Suggestions** — Preset categories that query the NASA Exoplanet Archive (Famous, Highly elliptical, Hot Jupiters, Earth-sized).
  - **Search** — Custom filters (min/max ranges) against the archive.
- Picking a planet (from any tab) stores it in `sessionStorage` and reloads to run the sim.
- **simulation/** — Same 3D view when opened directly with a stored planet.

---

## Deploy (e.g. GitHub Pages)

The repo includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that builds and copies `index.html`, `preloaded-planets.json`, and `dist/` into a `site/` directory, then deploys that artifact to GitHub Pages. In the repo **Settings → Pages**, set the source to **GitHub Actions**.
