# Goldilocks Sim

Exoplanet query + 3D orbit viz (Goldilocks zone). Static site for GitHub Pages. TypeScript source in `src/`, compiled to `dist/`.

## Build

```bash
npm install
npm run build
```

## Run locally

Browsers block requests from `file://`. Use a local server:

```bash
npm run serve
```

Then open **http://localhost:3000** (or the port shown).

## Pages

- **index.html** — Set filters, search NASA Exoplanet Archive, click a result.
- **simulation/** — 3D view: star, orbit, planet, habitable zone disk (second page).
