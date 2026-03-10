/**
 * Processing: raw TAP row → simulation state (Goldilocks, orbit, star, planet).
 * Scene only reads this object and calls update() / getPlanetPosition().
 */

/** 1 unit = 1 AU everywhere. */
export interface SimulationState {
  readonly plName: string;
  readonly hostName: string;
  readonly orbitAu: number;
  readonly planetRadiusRe: number;
  readonly hzInnerAu: number;
  readonly hzOuterAu: number;
  readonly inHabitableZone: boolean;
  /** 'in' = in HZ (green), 'too-close' = inside inner (red), 'too-far' = outside outer (blue) */
  readonly habitableZoneStatus: "in" | "too-close" | "too-far";
  readonly orbitalPeriodDays: number;
  readonly starRadius: number;
  readonly orbitRadius: number;
  readonly planetRadius: number;
  readonly hzInner: number;
  readonly hzOuter: number;
  readonly orbitEccentricity: number;
  readonly eccentricityKnown: boolean;
  /** Star luminosity L/L☉ (from catalog or derived from R and T). null if unknown. */
  readonly starLuminosity: number | null;
  /** Star effective temp (K). null if unknown. */
  readonly starTeffK: number | null;
  /** Star radius (R☉). null if unknown. */
  readonly starRadiusRsun: number | null;
  /** Star mass (M☉). null if unknown. */
  readonly starMassMsun: number | null;
  /** Planet mass (M⊕). null if unknown. */
  readonly planetMassMe: number | null;
  getOrbitPoints(): Array<{ x: number; y: number; z: number }>;
  update(deltaTime: number): void;
  getPlanetPosition(): { x: number; y: number; z: number };
  getElapsedDays(): number;
  getElapsedYears(): number;
}

function get(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toUpperCase()] ?? null;
}

function num(row: Record<string, unknown>, key: string, fallback: number): number {
  const v = get(row, key);
  return v != null && Number.isFinite(Number(v)) ? Number(v) : fallback;
}

/** HZ bounds (AU) from stellar luminosity. L in solar units; flux ~ L/d^2 so distance ~ sqrt(L). */
function habitableZoneAU(Lsolar: number): { inner: number; outer: number } {
  const L = Lsolar > 0 ? Lsolar : 1;
  const s = Math.sqrt(L);
  return { inner: 0.75 * s, outer: 1.77 * s };
}

const T_SUN_K = 5778;

/** Luminosity in solar units. From 10^st_lum if available; else from (R/R☉)² (T/T☉)⁴ when R and T exist. */
function resolveLuminosity(
  row: Record<string, unknown>,
  stLum: number,
  stRad: number,
  stTeff: number | null
): number {
  const lumFromLog = get(row, "st_lum");
  if (lumFromLog != null && Number.isFinite(Number(lumFromLog))) {
    return Math.pow(10, Number(lumFromLog));
  }
  if (stRad > 0 && stTeff != null && Number.isFinite(stTeff) && stTeff > 0) {
    return stRad * stRad * Math.pow(stTeff / T_SUN_K, 4);
  }
  return 1;
}

/** Fixed scale: 1 unit = 1 AU. Star/planet radii exaggerated for visibility. */
const SUN_RADIUS_AU = 0.005;
const MIN_STAR_RADIUS = 0.012;
const MIN_PLANET_RADIUS = 0.008;

/** Kepler III: a_AU^3 = T_yr^2 * M_sun. Returns a in AU. */
function semiMajorAxisFromPeriod(periodDays: number, starMassMsun: number): number {
  const Tyr = periodDays / 365.25;
  return Math.pow(Tyr * Tyr * Math.max(0.1, starMassMsun), 1 / 3);
}

export function createSimulationFromRow(row: Record<string, unknown>): SimulationState {
  const plName = (get(row, "pl_name") as string) || "Planet";
  const hostName = (get(row, "hostname") as string) || "Star";
  const stRad = num(row, "st_rad", 1);
  const stLum = num(row, "st_lum", 0);
  const plOrbper = num(row, "pl_orbper", 365);
  const stTeff = get(row, "st_teff");
  const stMass = get(row, "st_mass");
  const plMasse = get(row, "pl_masse");
  const starMassMsunNum = stMass != null && Number.isFinite(Number(stMass)) ? Number(stMass) : 1;
  const derivedAu = semiMajorAxisFromPeriod(plOrbper, starMassMsunNum);
  const plOrbsmaxRaw = get(row, "pl_orbsmax");
  const catalogAu =
    plOrbsmaxRaw != null && Number.isFinite(Number(plOrbsmaxRaw)) ? Number(plOrbsmaxRaw) : null;
  // Use catalog value only if consistent with period (Kepler III); else use derived (e.g. archive sometimes has wrong/placeholder 1.0)
  const plOrbsmax =
    catalogAu != null && derivedAu > 0 && catalogAu >= derivedAu * 0.5 && catalogAu <= derivedAu * 2
      ? catalogAu
      : derivedAu;
  const plOrbeccenRaw = get(row, "pl_orbeccen");
  const eccentricityKnown = plOrbeccenRaw != null && Number.isFinite(Number(plOrbeccenRaw));
  const plOrbeccen = num(row, "pl_orbeccen", 0);
  const plRade = num(row, "pl_rade", 1);

  const stTeffNum: number | null =
    stTeff != null && Number.isFinite(Number(stTeff)) ? Number(stTeff) : null;
  const luminosity = resolveLuminosity(row, stLum, stRad, stTeffNum);

  const starLuminosity: number | null = luminosity;
  const starTeffK: number | null = stTeffNum;
  const starRadiusRsun: number | null =
    stRad != null && Number.isFinite(stRad) ? stRad : null;
  const starMassMsun: number | null =
    stMass != null && Number.isFinite(Number(stMass)) ? Number(stMass) : null;
  const planetMassMe: number | null =
    plMasse != null && Number.isFinite(Number(plMasse)) ? Number(plMasse) : null;

  const hzAu = habitableZoneAU(luminosity);
  const inHz = plOrbsmax >= hzAu.inner && plOrbsmax <= hzAu.outer;
  const habitableZoneStatus: "in" | "too-close" | "too-far" =
    inHz ? "in" : plOrbsmax < hzAu.inner ? "too-close" : "too-far";

  const orbitEccentricity = Math.min(0.99, plOrbeccen);
  const orbitRadius = plOrbsmax;
  const hzInner = hzAu.inner;
  const hzOuter = hzAu.outer;
  const starRadius = Math.max(MIN_STAR_RADIUS, stRad * SUN_RADIUS_AU);
  const planetRadius = Math.max(MIN_PLANET_RADIUS, (plRade ?? 1) * 0.00004);

  const orbitalPeriodDays = plOrbper > 0 ? plOrbper : 365;
  let time = 0;

  function radiusAtAngle(t: number): number {
    return orbitRadius * (1 - orbitEccentricity * orbitEccentricity) / (1 + orbitEccentricity * Math.cos(t));
  }

  function positionAtTime(t: number): { x: number; y: number; z: number } {
    const r = radiusAtAngle(t);
    return {
      x: r * Math.cos(t),
      y: 0,
      z: r * Math.sin(t)
    };
  }

  const orbitPointsCache: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    orbitPointsCache.push(positionAtTime(t));
  }

  return {
    plName,
    hostName,
    orbitAu: plOrbsmax,
    planetRadiusRe: plRade,
    hzInnerAu: hzAu.inner,
    hzOuterAu: hzAu.outer,
    inHabitableZone: inHz,
    habitableZoneStatus,
    orbitalPeriodDays,
    starRadius,
    orbitRadius,
    planetRadius,
    hzInner,
    hzOuter,
    orbitEccentricity,
    eccentricityKnown,
    starLuminosity,
    starTeffK,
    starRadiusRsun,
    starMassMsun,
    planetMassMe,

    getOrbitPoints(): Array<{ x: number; y: number; z: number }> {
      return orbitPointsCache;
    },

    update(deltaTime: number): void {
      // Kepler II: equal areas in equal times → angular speed ∝ 1/r² (fast near star, slow far).
      // Use current radius so elliptical orbits speed up at periastron and slow at apastron.
      const refRadius = (hzInner + hzOuter) * 0.5;
      const rCurrent = Math.max(radiusAtAngle(time), orbitRadius * 0.01);
      const oneOverRSq = (orbitRadius / rCurrent) ** 2;
      const sqrtOneMinusE2 = Math.sqrt(1 - orbitEccentricity * orbitEccentricity);
      time += deltaTime * (refRadius / orbitRadius) * oneOverRSq * sqrtOneMinusE2;
    },

    getPlanetPosition(): { x: number; y: number; z: number } {
      return positionAtTime(time);
    },

    getElapsedDays(): number {
      return (time / (2 * Math.PI)) * orbitalPeriodDays;
    },

    getElapsedYears(): number {
      return this.getElapsedDays() / 365.25;
    }
  };
}
