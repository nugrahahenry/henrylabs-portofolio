import * as THREE from "three";

const plane = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.58, .08, -.22)));

// A focus-centered ellipse: the star sits at the focus, not at the geometric center.
export function sampleOrbit(radius: number, phase: number, eccentricity = .1, target = new THREE.Vector3()) {
  let anomaly = phase;
  for (let i = 0; i < 4; i++) anomaly -= (anomaly - eccentricity * Math.sin(anomaly) - phase) / (1 - eccentricity * Math.cos(anomaly));
  return target.set(radius * (Math.cos(anomaly) - eccentricity), radius * Math.sqrt(1 - eccentricity ** 2) * Math.sin(anomaly), 0).applyMatrix3(plane);
}

export function orbitalSpeed(radius: number) {
  return .18 * Math.pow(2 / radius, 1.5);
}

export function orbitGeometry(eccentricity = .1) {
  return new THREE.BufferGeometry().setFromPoints(Array.from({ length: 160 }, (_, i) => sampleOrbit(1, i / 160 * Math.PI * 2, eccentricity)));
}
