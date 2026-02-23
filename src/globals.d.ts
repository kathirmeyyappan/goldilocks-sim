declare global {
  interface QueryInput {
    st_rad_min: string;
    st_rad_max: string;
    st_teff_min: string;
    st_teff_max: string;
    pl_orbsmax_min: string;
    pl_orbsmax_max: string;
    pl_rade_min: string;
    pl_rade_max: string;
    pl_masse_min: string;
    pl_masse_max: string;
    pl_orbper_min: string;
    pl_orbper_max: string;
    pl_orbeccen_min: string;
    pl_orbeccen_max: string;
  }

  interface TapRow {
    pl_name?: string | null;
    PL_NAME?: string | null;
    hostname?: string | null;
    HOSTNAME?: string | null;
    [key: string]: unknown;
  }

  type FetchResult =
    | { ok: true; data: TapRow[] }
    | { ok: false; error: string };

  interface Window {
    GoldilocksQuery: {
      buildQuery: (input: QueryInput) => string;
      buildWhere: (input: QueryInput) => string;
      fetchPlanets: (input: QueryInput) => Promise<FetchResult>;
      fetchPlanetsByNames: (names: string[]) => Promise<FetchResult>;
    };
  }
}

export {};
