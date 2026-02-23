/**
 * Rendering only: reads state object, calls state.update() and state.getPlanetPosition(), draws.
 * No orbit/HZ math, no parsing. Expects THREE on window (script tag).
 */
declare const THREE: typeof import("three");

import type { SimulationState } from "./model.js";

const DT = 0.005;

export function runScene(canvas: HTMLCanvasElement, state: SimulationState): void {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.01, 100);
  camera.position.set(0, 4, 4);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

  const starGeo = new THREE.SphereGeometry(state.starRadius, 32, 32);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
  const star = new THREE.Mesh(starGeo, starMat);
  scene.add(star);

  const hzGeo = new THREE.RingGeometry(state.hzInner, state.hzOuter, 64);
  const hzMat = new THREE.MeshBasicMaterial({ color: 0x00aa44, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
  const hzDisk = new THREE.Mesh(hzGeo, hzMat);
  hzDisk.rotation.x = -Math.PI / 2;
  scene.add(hzDisk);

  const points = state.getOrbitPoints().map(p => new THREE.Vector3(p.x, p.y, p.z));
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x4488ff });
  const orbitLine = new THREE.Line(orbitGeo, orbitMat);
  scene.add(orbitLine);

  const planetGeo = new THREE.SphereGeometry(state.planetRadius, 16, 16);
  const planetMat = new THREE.MeshBasicMaterial({ color: 0x66aaff });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  const pos = state.getPlanetPosition();
  planet.position.set(pos.x, pos.y, pos.z);
  scene.add(planet);

  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w && h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  }

  function animate(): void {
    requestAnimationFrame(animate);
    state.update(DT);
    const p = state.getPlanetPosition();
    planet.position.set(p.x, p.y, p.z);
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", resize);
  resize();
  animate();
}
