# Goldilocks Sim — System Design (GitHub Pages)

Static site; all data fetched from the browser. No backend.

```mermaid
flowchart TB
    subgraph USER[" "]
        A[User opens site on GitHub Pages]
    end

    subgraph PAGE1["Page 1: Query"]
        B[Parameter form]
        B --> B1[Star size range]
        B --> B2[Orbital distance range]
        B --> B3[Planet size range]
        B --> B4[Defaults / error ranges]
        C[User clicks Search / Apply]
        D[JS builds NASA TAP URL]
        E[fetch to NASA Exoplanet Archive TAP]
        F[Parse response JSON/CSV]
        G[Render results list/table]
    end

    subgraph EXTERNAL["External"]
        TAP["NASA Exoplanet Archive TAP\n exoplanetarchive.ipac.caltech.edu/TAP/sync?query=..."]
    end

    subgraph PAGE2["Page 2: 3D Viz"]
        H[User clicks a result row]
        I[JS passes planet + star params to viz]
        J[Render 3D scene: star, orbit, planet]
        K[Compute & draw Goldilocks zone green disk]
        L[Show habitability details]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> TAP
    TAP --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
```

## Data flow (no backend)

| Step | Where | What |
|------|--------|------|
| 1 | Page 1 (JS) | Read form values (ranges for star size, orbital distance, planet size, etc.). |
| 2 | Page 1 (JS) | Build ADQL query and TAP URL (e.g. `SELECT ... FROM ps WHERE ... &format=json`). |
| 3 | Browser | `fetch(TAP_URL)` → NASA TAP (CORS permitting). |
| 4 | Page 1 (JS) | Parse response → display rows. |
| 5 | User | Clicks one result. |
| 6 | Page 2 (JS) | Receive planet/star params (via route state, hash, or sessionStorage). |
| 7 | Page 2 (JS) | Three.js (or similar): draw star, orbit from `pl_orbsmax`/ecc, planet from `pl_rade`. |
| 8 | Page 2 (JS) | Compute HZ from stellar lum/Teff; draw green disk; show “in Goldilocks” yes/no. |

Everything runs in the browser; no server or “piping” — only static files + JS calling NASA TAP.
