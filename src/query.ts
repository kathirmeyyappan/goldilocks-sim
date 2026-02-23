/**
 * Query + data processing. No UI. Call with form input; returns parsed rows or error.
 * Types (QueryInput, TapRow, FetchResult, Window.GoldilocksQuery) in globals.d.ts.
 */

const TAP_BASE = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync";

const SELECT_COLS = [
  "pl_name", "hostname",
  "st_rad", "st_teff", "st_lum", "st_mass",
  "pl_rade", "pl_masse", "pl_orbsmax", "pl_orbper", "pl_orbeccen", "pl_orbincl"
].join(",");

const FROM = "ps";

const RANGES: [string, keyof QueryInput, keyof QueryInput][] = [
  ["st_rad", "st_rad_min", "st_rad_max"],
  ["st_teff", "st_teff_min", "st_teff_max"],
  ["pl_orbsmax", "pl_orbsmax_min", "pl_orbsmax_max"],
  ["pl_rade", "pl_rade_min", "pl_rade_max"],
  ["pl_masse", "pl_masse_min", "pl_masse_max"],
  ["pl_orbper", "pl_orbper_min", "pl_orbper_max"]
];

function buildWhere(input: QueryInput): string {
  const parts = ["default_flag = 1"];
  for (const [col, minKey, maxKey] of RANGES) {
    const minVal = input[minKey];
    const maxVal = input[maxKey];
    if (minVal === "" || minVal == null || maxVal === "" || maxVal == null) continue;
    const min = Number(minVal);
    const max = Number(maxVal);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      parts.push(`(${col} IS NOT NULL AND ${col} BETWEEN ${min} AND ${max})`);
    }
  }
  return parts.join(" AND ");
}

function buildQuery(input: QueryInput): string {
  return `SELECT ${SELECT_COLS} FROM ${FROM} WHERE ${buildWhere(input)}`;
}

const CORS_PROXY = "https://api.allorigins.win/raw?url=";

async function fetchPlanets(input: QueryInput): Promise<FetchResult> {
  const query = buildQuery(input);
  const url = `${TAP_BASE}?query=${encodeURIComponent(query)}&format=json`;
  const useProxy = typeof location !== "undefined" && /^https?:\/\/localhost(\b|:)/i.test(location.origin);

  function parseResponse(res: Response): Promise<FetchResult> {
    if (!res.ok) return Promise.resolve({ ok: false, error: "Request failed: " + res.status });
    return res.json().then((raw: unknown) => {
      const data = Array.isArray(raw) ? raw : (raw as { data?: TapRow[]; results?: TapRow[] }).data ?? (raw as { results?: TapRow[] }).results ?? [];
      return { ok: true, data };
    });
  }

  const target = useProxy ? CORS_PROXY + encodeURIComponent(url) : url;
  try {
    let res = await fetch(target);
    return await parseResponse(res);
  } catch (e: unknown) {
    const err = e as { message?: string; name?: string };
    if (!useProxy && (err.message === "Failed to fetch" || err.name === "TypeError")) {
      try {
        const res2 = await fetch(CORS_PROXY + encodeURIComponent(url));
        return await parseResponse(res2);
      } catch (e2: unknown) {
        return { ok: false, error: (e2 as Error).message || "Network error" };
      }
    }
    return { ok: false, error: (err as Error).message || "Network error" };
  }
}

window.GoldilocksQuery = { buildQuery, buildWhere, fetchPlanets };
