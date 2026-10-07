import * as THREE from "three";

const laneFrames = [
  new THREE.Euler(.55, .18, -.2),
  new THREE.Euler(.9, -.12, .4),
  new THREE.Euler(1.2, .35, -.42),
].map((rotation) => new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(rotation)));

export function techOrbitRadius(bodyRadius: number, lane: number) {
  return bodyRadius + .36 + lane * .22;
}

export function resolveTechOwner(owners: readonly number[], selected: number) {
  return owners.includes(selected) ? selected : owners[0] ?? -1;
}

// The same tilted circle drives the drawn lane, its moons, and the travelling signal.
export function sampleTechOrbit(radius: number, lane: number, phase: number, target = new THREE.Vector3()) {
  return target.set(Math.cos(phase) * radius, Math.sin(phase) * radius, 0).applyMatrix3(laneFrames[lane]);
}
