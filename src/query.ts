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
  ["pl_orbper", "pl_orbper_min", "pl_orbper_max"],
  ["pl_orbeccen", "pl_orbeccen_min", "pl_orbeccen_max"]
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
    if (!res.ok) {
      const msg = res.status === 408
        ? "Request timed out (408). Try narrowing filters or try again."
        : "Request failed: " + res.status;
      return Promise.resolve({ ok: false, error: msg });
    }
    return res.json().then((raw: unknown) => {
      const data = Array.isArray(raw) ? raw : (raw as { data?: TapRow[]; results?: TapRow[] }).data ?? (raw as { results?: TapRow[] }).results ?? [];
      return { ok: true, data };
    });
  }

  const target = useProxy ? CORS_PROXY + encodeURIComponent(url) : url;

  async function doFetch(noCache: boolean): Promise<FetchResult> {
    const opts: RequestInit = noCache ? { cache: "no-store" } : {};
    const res = await fetch(target, opts);
    if (res.status === 408 && !noCache) {
      await new Promise((r) => setTimeout(r, 400));
      return doFetch(true);
    }
    return parseResponse(res);
  }

  try {
    return await doFetch(false);
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

function fetchPlanetsByNames(names: string[]): Promise<FetchResult> {
  if (names.length === 0) return Promise.resolve({ ok: true, data: [] });
  const escaped = names.map((n) => "'" + String(n).replace(/'/g, "''") + "'");
  const inList = escaped.join(", ");
  const query = `SELECT ${SELECT_COLS} FROM ${FROM} WHERE default_flag = 1 AND pl_name IN (${inList})`;
  const url = `${TAP_BASE}?query=${encodeURIComponent(query)}&format=json`;
  const useProxy = typeof location !== "undefined" && /^https?:\/\/localhost(\b|:)/i.test(location.origin);
  const target = useProxy ? CORS_PROXY + encodeURIComponent(url) : url;

  function parseResponse(res: Response): Promise<FetchResult> {
    if (!res.ok) {
      const msg = res.status === 408
        ? "Request timed out (408). Try again."
        : "Request failed: " + res.status;
      return Promise.resolve({ ok: false, error: msg });
    }
    return res.json().then((raw: unknown) => {
      const data = Array.isArray(raw) ? raw : (raw as { data?: TapRow[] }).data ?? [];
      return { ok: true, data };
    });
  }

  return fetch(target).then(parseResponse).catch((err: unknown) => ({
    ok: false as const,
    error: (err as Error).message || "Network error"
  }));
}

window.GoldilocksQuery = { buildQuery, buildWhere, fetchPlanets, fetchPlanetsByNames };
