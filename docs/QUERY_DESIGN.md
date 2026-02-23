# Query semantics and mechanics

How the parameter form maps to NASA TAP requests and how we handle responses.

---

## 0. What we query and where it comes from

**Single service, not multiple databases.**  
We call **one** API: the **NASA Exoplanet Archive** at Caltech IPAC. There is no “piping” between several databases — the browser sends one (or more) requests to that archive’s **TAP** endpoint and gets back tables.

| Question | Answer |
|----------|--------|
| **What do we actually query?** | **Tables** served by the NASA Exoplanet Archive’s TAP service. We send an ADQL query (e.g. `SELECT ... FROM ps WHERE ...`) to `https://exoplanetarchive.ipac.caltech.edu/TAP/sync`. |
| **What is one “result row”?** | One **planet** (with its host star and orbital parameters). The main table we use is **`ps`** (Planetary Systems). Each row = one planet + that planet’s host star and orbit (and discovery info). So we’re querying **planetary system records**, not raw light curves or separate star catalogs. |
| **Which “databases” does it come from?** | **One** source from our perspective: the **NASA Exoplanet Archive**. That archive is a **curated compilation**: it ingests and normalizes data from many missions and papers (TESS, Kepler, K2, radial velocity surveys, imaging, microlensing, etc.). We do **not** query TESS, Kepler, or other missions directly — we only query the archive. So “query NASA databases” here means “query the NASA Exoplanet Archive’s tables.” |
| **Can we “join” multiple databases?** | We can only join **tables inside the same TAP service** (e.g. `ps` and `pscomppars`). Those are different tables in the **same** archive, not different institutions. For this project we can stay with a single table, **`ps`**, which already has star + planet + orbit columns in one row. |

**In short:** We query **one** place (NASA Exoplanet Archive TAP), get back **rows from table `ps`** (one planet per row, with star and orbit parameters). The archive’s data originally comes from many missions/surveys, but we only talk to the archive.

---

## 1. Form parameters → TAP columns

One-to-one mapping from UI ranges to ADQL. All ranges are **inclusive** [min, max].

| Form parameter (concept) | TAP column | Unit | Notes |
|--------------------------|------------|------|--------|
| Star size (radius)       | `st_rad`   | Solar radii | Optional range. |
| Star temperature         | `st_teff`  | K    | Optional. |
| Orbital distance         | `pl_orbsmax` | AU | Semi-major axis. |
| Planet size (radius)     | `pl_rade`  | Earth radii | Optional. |
| Planet mass              | `pl_masse` | Earth masses | Optional. |
| Orbital period           | `pl_orbper` | days | Optional. |

**Default ranges (suggested):**  
Pre-fill with wide bounds so the first load returns a reasonable set (e.g. `pl_orbsmax` 0.01–100 AU, `pl_rade` 0.1–30, `st_rad` 0.1–10). Can tighten later for “Earth-like” or “hot Jupiters” presets.

**“Error ranges”:**  
If we add a “use error bars” toggle, we could use archive error columns (e.g. `st_raderr1`, `st_raderr2`) only for **display** (show ± on the result row). Filtering stays on the main value columns above; we don’t filter on error columns.

---

## 2. Table and default row choice

- **Table:** `ps` (Planetary Systems). One row per planet (per solution); many planets have multiple rows (different solutions).  
- **Default row:** Restrict to the archive’s default solution so we get one row per planet:

  ```text
  default_flag = 1
  ```

- Optionally restrict to **confirmed** only:

  ```text
  upper(soltype) LIKE '%CONF%'
  ```

So the base predicate is always: `default_flag = 1` (and optionally the soltype filter).

---

## 3. SELECT list (what we ask for)

We **do not** filter or query on the extra columns below; we fetch them once and **store the full row** so any of it can be shown on demand (detail panel, viz page, tooltips).

### Option A — Minimum (list + 3D viz only)

Use this if you want the smallest payload:

- Identifiers: `pl_name`, `hostname`
- Star: `st_rad`, `st_teff`, `st_lum`, `st_mass`
- Planet: `pl_rade`, `pl_masse`, `pl_orbsmax`, `pl_orbper`, `pl_orbeccen`, `pl_orbincl`

### Option B — Full payload (recommended: “get everything, display on demand”)

Request all columns that are useful for display. Store the full result row in memory (and pass it to the viz page); use what you need for the list/viz and show the rest in a detail view or expandable section when the user wants it.

**Categories and columns (all from table `ps`):**

| Category | Columns (value + err1 for ± display) |
|----------|----------------------------------------|
| **Names** | `pl_name`, `hostname`, `pl_letter`, `hd_name`, `hip_name`, `tic_id`, `gaia_dr2_id`, `gaia_dr3_id` |
| **System composition** | `sy_snum`, `sy_pnum`, `sy_mnum`, `cb_flag` |
| **Discovery** | `discoverymethod`, `disc_year`, `disc_facility`, `disc_telescope`, `disc_instrument`, `disc_locale`, `disc_pubdate`, `disc_refname` |
| **Detection flags** | `rv_flag`, `tran_flag`, `ast_flag`, `obm_flag`, `micro_flag`, `etv_flag`, `ima_flag`, `ptv_flag`, `pul_flag`, `dkin_flag`, `ttv_flag` |
| **Planet – orbit** | `pl_orbsmax`, `pl_orbsmaxerr1`, `pl_orbsmaxerr2`, `pl_orbper`, `pl_orbpererr1`, `pl_orbpererr2`, `pl_orbeccen`, `pl_orbeccenerr1`, `pl_orbincl`, `pl_orbinclerr1`, `pl_orblper`, `pl_orbtper` |
| **Planet – size/mass** | `pl_rade`, `pl_radeerr1`, `pl_radeerr2`, `pl_masse`, `pl_masseerr1`, `pl_masseerr2`, `pl_bmasse`, `pl_bmassj`, `pl_dens`, `pl_denserr1`, `pl_massj`, `pl_msinie`, `pl_msinij` |
| **Planet – habitability-related** | `pl_eqt` (equilibrium temp), `pl_eqterr1`, `pl_insol` (insolation), `pl_insolerr1` |
| **Planet – transit** | `pl_trandep`, `pl_trandur`, `pl_tranmid`, `pl_occdep`, `pl_imppar` |
| **Planet – other** | `pl_refname`, `pl_pubdate`, `pl_nnotes`, `pl_ntranspec`, `pl_nespec`, `pl_ndispec`, `pl_controv_flag` |
| **Star – basic** | `st_rad`, `st_raderr1`, `st_raderr2`, `st_teff`, `st_tefferr1`, `st_tefferr2`, `st_mass`, `st_masserr1`, `st_masserr2`, `st_lum`, `st_lumerr1`, `st_spectype` |
| **Star – other** | `st_met`, `st_logg`, `st_age`, `st_ageerr1`, `st_dens`, `st_rotp`, `st_radv`, `st_vsin`, `st_refname` |
| **System – position/distance** | `sy_dist`, `sy_disterr1`, `sy_plx`, `ra`, `dec`, `rastr`, `decstr`, `glat`, `glon`, `elat`, `elon` |
| **System – proper motion** | `sy_pm`, `sy_pmra`, `sy_pmdec` |
| **Magnitudes (common)** | `sy_vmag`, `sy_jmag`, `sy_kmag`, `sy_gaiamag`, `sy_tmag`, `sy_kepmag` |
| **Counts** | `st_nphot`, `st_nrvc`, `st_nspec` |
| **Metadata** | `soltype`, `default_flag`, `rowupdate`, `pl_pubdate`, `releasedate` |

**Single SELECT list for “full payload” (copy-paste into ADQL):**

```text
pl_name, hostname, pl_letter, hd_name, hip_name, tic_id, gaia_dr2_id, gaia_dr3_id,
sy_snum, sy_pnum, sy_mnum, cb_flag,
discoverymethod, disc_year, disc_facility, disc_telescope, disc_instrument, disc_locale, disc_pubdate, disc_refname,
rv_flag, tran_flag, ast_flag, obm_flag, micro_flag, etv_flag, ima_flag, ptv_flag, pul_flag, dkin_flag, ttv_flag,
pl_orbsmax, pl_orbsmaxerr1, pl_orbsmaxerr2, pl_orbper, pl_orbpererr1, pl_orbpererr2, pl_orbeccen, pl_orbeccenerr1, pl_orbincl, pl_orbinclerr1, pl_orblper, pl_orbtper,
pl_rade, pl_radeerr1, pl_radeerr2, pl_masse, pl_masseerr1, pl_masseerr2, pl_bmasse, pl_bmassj, pl_dens, pl_denserr1, pl_massj, pl_msinie, pl_msinij,
pl_eqt, pl_eqterr1, pl_insol, pl_insolerr1,
pl_trandep, pl_trandur, pl_tranmid, pl_occdep, pl_imppar,
pl_refname, pl_pubdate, pl_nnotes, pl_ntranspec, pl_nespec, pl_ndispec, pl_controv_flag,
st_rad, st_raderr1, st_raderr2, st_teff, st_tefferr1, st_tefferr2, st_mass, st_masserr1, st_masserr2, st_lum, st_lumerr1, st_spectype,
st_met, st_logg, st_age, st_ageerr1, st_dens, st_rotp, st_radv, st_vsin, st_refname,
sy_dist, sy_disterr1, sy_plx, ra, dec, rastr, decstr, glat, glon, elat, elon,
sy_pm, sy_pmra, sy_pmdec,
sy_vmag, sy_jmag, sy_kmag, sy_gaiamag, sy_tmag, sy_kepmag,
st_nphot, st_nrvc, st_nspec,
soltype, default_flag, rowupdate, pl_pubdate, releasedate
```

- **Where it comes from:** all of the above are columns in the **`ps`** table from the **NASA Exoplanet Archive** TAP service (single database, single table).
- **Usage:** Run the same query as now (with your WHERE filters); only the SELECT list changes. Keep the response as the “full planet record” and pass that object to the viz page and to any detail panel. Render whatever subset you want in the list; show the rest on click/expand.
- **Nulls:** Many columns will be null for many rows. In the UI, show “—” or hide the label when value is null.

If a column is missing in the archive for some rows, TAP still returns the row with that field null; we handle nulls in the UI and in the viz (e.g. skip eccentricity or use 0).

---

## 4. WHERE construction (mechanics)

- Start with fixed predicate: `default_flag = 1`.
- For each **form parameter that the user has constrained** (min/max both set and different from “no limit”), add a range condition:
  - `st_rad BETWEEN :min_st_rad AND :max_st_rad`
  - `pl_orbsmax BETWEEN :min_pl_orbsmax AND :max_pl_orbsmax`
  - … same idea for `st_teff`, `pl_rade`, `pl_masse`, `pl_orbper`
- **Nulls:** Archive uses null for missing values. So:
  - Filtering: add `AND <col> IS NOT NULL` for any column we use in a `BETWEEN` (otherwise “null” won’t match the range).
  - Example:  
    `pl_orbsmax IS NOT NULL AND pl_orbsmax BETWEEN 0.5 AND 2`

**Optional rule:** If “min” or “max” is left empty or “no limit”, don’t add that bound (so we don’t do `BETWEEN 0.01 AND null`). Only add the clause when both min and max are valid numbers.

**Example full WHERE (concept):**

```text
default_flag = 1
AND (st_rad IS NOT NULL AND st_rad BETWEEN 0.8 AND 1.2)
AND (pl_orbsmax IS NOT NULL AND pl_orbsmax BETWEEN 0.5 AND 2)
AND (pl_rade IS NOT NULL AND pl_rade BETWEEN 0.5 AND 2)
```

---

## 5. URL and encoding

- Base: `https://exoplanetarchive.ipac.caltech.edu/TAP/sync`
- Query param: `query=<ADQL>` and `format=json` (or `format=csv` if we prefer to parse CSV).
- ADQL must be **URL-encoded** and **single line** (no newlines). Spaces as `+` or `%20`; other reserved characters encoded (e.g. `'` → `%27`).
- In JS: build the ADQL string, then use `encodeURIComponent(query)` and append as `?query=...&format=json`.

---

## 6. Response handling

- **Success:** Parse JSON (or CSV). Iterate rows and render the table; store full row (or the needed fields) so on “click” we can pass the same object to the viz page (e.g. via `sessionStorage` or route state).
- **Empty:** Show “No planets match these filters” and suggest widening ranges.
- **TAP / network error:** Show a short message (“Could not load data; try again or check filters”) and optionally log the response status/text for debugging.
- **Row limit:** TAP may cap rows (e.g. 2000). We can add `TOP N` in the SELECT if the archive supports it, or document that results may be truncated; for a class project, a few hundred rows is usually enough.

---

## 7. Summary

| Topic | Choice |
|-------|--------|
| Table | `ps` |
| Row choice | `default_flag = 1` (optionally + confirmed only) |
| Ranges | Inclusive [min, max]; only add WHERE term when both min/max set |
| Nulls | Require `col IS NOT NULL` for any column used in a range |
| Output | `format=json`, fixed SELECT list for list + viz |
| Encoding | Single-line ADQL, URL-encoded in `query=` |
| Errors | Handle empty result and fetch failure in UI |

This gives you clear query semantics and mechanics for the JS that builds and calls TAP from the form.
