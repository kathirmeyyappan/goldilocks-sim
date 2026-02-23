/**
 * Simulation page: read storage → create state (model) → info panel from state → run scene with state.
 */

import { createSimulationFromRow } from "./model.js";
import { runScene } from "./scene.js";

(function (): void {
  const stored = sessionStorage.getItem("goldilocks_planet");
  const infoEl = document.getElementById("info") as HTMLDivElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

  if (!stored) {
    infoEl.innerHTML = 'No planet selected. <a href="../index.html">Search</a> and click a result.';
    return;
  }

  let row: Record<string, unknown>;
  try {
    row = JSON.parse(stored) as Record<string, unknown>;
  } catch {
    infoEl.textContent = "Invalid stored data.";
    return;
  }

  const state = createSimulationFromRow(row);

  infoEl.innerHTML = "<b>" + state.plName + "</b> (" + state.hostName + ")<br>" +
    "Orbit: " + state.orbitAu.toFixed(3) + " AU | Planet radius: " + (state.planetRadiusRe != null ? state.planetRadiusRe.toFixed(2) : "—") + " R⊕<br>" +
    "Goldilocks: " + state.hzInnerAu.toFixed(2) + " – " + state.hzOuterAu.toFixed(2) + " AU<br>" +
    "<b>" + (state.inHabitableZone ? "In habitable zone" : "Outside habitable zone") + "</b><br>" +
    '<a href="../index.html">Back to search</a>';

  runScene(canvas, state);
})();
