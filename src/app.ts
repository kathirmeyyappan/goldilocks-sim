/**
 * Page 1: form input → query module → render list. On row click → store + go to viz.
 */

(function (): void {
  const form = document.getElementById("query-form") as HTMLFormElement;
  const status = document.getElementById("status") as HTMLParagraphElement;
  const resultsEl = document.getElementById("results") as HTMLUListElement;

  function getInput(): QueryInput {
    const fd = new FormData(form);
    return {
      st_rad_min: (fd.get("st_rad_min") ?? "") as string,
      st_rad_max: (fd.get("st_rad_max") ?? "") as string,
      st_teff_min: (fd.get("st_teff_min") ?? "") as string,
      st_teff_max: (fd.get("st_teff_max") ?? "") as string,
      pl_orbsmax_min: (fd.get("pl_orbsmax_min") ?? "") as string,
      pl_orbsmax_max: (fd.get("pl_orbsmax_max") ?? "") as string,
      pl_rade_min: (fd.get("pl_rade_min") ?? "") as string,
      pl_rade_max: (fd.get("pl_rade_max") ?? "") as string,
      pl_masse_min: (fd.get("pl_masse_min") ?? "") as string,
      pl_masse_max: (fd.get("pl_masse_max") ?? "") as string,
      pl_orbper_min: (fd.get("pl_orbper_min") ?? "") as string,
      pl_orbper_max: (fd.get("pl_orbper_max") ?? "") as string
    };
  }

  function renderList(rows: { pl_name?: string | null; PL_NAME?: string | null; hostname?: string | null; HOSTNAME?: string | null }[]): void {
    resultsEl.innerHTML = "";
    rows.forEach(function (row) {
      const li = document.createElement("li");
      const name = row.pl_name ?? row.PL_NAME ?? "—";
      const host = row.hostname ?? row.HOSTNAME ?? "—";
      li.textContent = name + " (" + host + ")";
      li.style.cursor = "pointer";
      li.addEventListener("click", function () {
        try {
          sessionStorage.setItem("goldilocks_planet", JSON.stringify(row));
          window.location.href = "simulation/";
        } catch (e) {
          status.textContent = "Could not open viz: " + (e as Error).message;
        }
      });
      resultsEl.appendChild(li);
    });
  }

  form.addEventListener("submit", async function (e: Event) {
    e.preventDefault();
    status.textContent = "Loading…";
    resultsEl.innerHTML = "";
    const input = getInput();
    const out = await window.GoldilocksQuery.fetchPlanets(input);
    if (!out.ok) {
      let msg = out.error || "Could not load data.";
      if (out.error === "Failed to fetch" || out.error.includes("fetch")) {
        msg += " Open this page from a local server (e.g. run: npx serve . then visit http://localhost:3000), not as a file.";
      }
      status.textContent = "Error: " + msg;
      return;
    }
    const data = out.data || [];
    if (data.length === 0) {
      status.textContent = "No planets match. Widen filters.";
      return;
    }
    status.textContent = data.length + " result(s). Click a row to visualize.";
    renderList(data);
  });
})();
