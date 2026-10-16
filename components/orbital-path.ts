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

export type OrbitFrameBody = {
  position: THREE.Vector3;
  radius: number;
  orbitRadius: number;
  eccentricity: number;
};

const frameRotation = new THREE.Matrix4();
const frameU = new THREE.Vector3(), frameV = new THREE.Vector3();
const frameFocus = new THREE.Vector3(), framePosition = new THREE.Vector3();
const frameNormal = new THREE.Vector3();

// Fit the swept ellipse, not just today's positions, so orbit motion cannot crop a world.
export function orbitFrameDistance(
  bodies: readonly OrbitFrameBody[], focus: THREE.Vector3, rotation: THREE.Euler,
  fov: number, width: number, height: number,
) {
  frameRotation.makeRotationFromEuler(rotation);
  frameU.set(1, 0, 0).applyMatrix3(plane).applyMatrix4(frameRotation);
  frameV.set(0, 1, 0).applyMatrix3(plane).applyMatrix4(frameRotation);
  frameFocus.copy(focus).applyMatrix4(frameRotation);
  frameFocus.y -= .05;
  const vertical = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const horizontal = vertical * width / height;
  const safeX = horizontal * (1 - 2 * Math.min(24 / width, .06));
  const safeY = vertical * (1 - 2 * Math.min(40 / height, .12));
  let distance = 0;
  for (const body of bodies) {
    framePosition.copy(body.position).applyMatrix4(frameRotation);
    framePosition.y -= .05;
    for (let side = 0; side < 4; side++) {
      const tangent = side < 2 ? safeX : safeY;
      frameNormal.set(side < 2 ? (side === 0 ? 1 : -1) : 0, side >= 2 ? (side === 2 ? 1 : -1) : 0, tangent);
      const major = frameNormal.dot(frameU) * body.orbitRadius;
      const minor = frameNormal.dot(frameV) * body.orbitRadius * Math.sqrt(1 - body.eccentricity ** 2);
      const sweep = frameNormal.dot(frameFocus) - major * body.eccentricity + Math.hypot(major, minor);
      // The current position also covers the handoff between old and new selected worlds.
      const extent = Math.max(sweep, frameNormal.dot(framePosition)) + body.radius * frameNormal.length();
      distance = Math.max(distance, extent / tangent);
    }
  }
  return distance;
}
