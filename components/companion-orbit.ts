import * as THREE from "three";

export const companionCounts = [2, 2, 2, 3, 2] as const;
const colors = [0xe4d3bb, 0xb9dce5, 0xd4bdad, 0xc5d4b6, 0xcac8e3];

export function createCompanionOrbit(ownerIndex: number, slot: number, bodyRadius: number, ringed: boolean) {
  const eccentricity = .025 + (ownerIndex + slot) % 4 * .015;
  const orbitRadius = bodyRadius * ((ringed ? 2.36 : 1.72) + slot * .65);
  const tilt = .3 + ownerIndex * .14 + slot * .23;
  const frame = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilt, ownerIndex * .41, -.28 + slot * .37)));
  return {
    ownerIndex, slot, orbitRadius, eccentricity, frame,
    size: bodyRadius * (.18 + (ownerIndex + slot) % 3 * .018),
    phase: ownerIndex * 1.73 + slot * 2.399,
    speed: Math.PI * 2 / (24 + ownerIndex * 2.3 + slot * 5.6),
    spin: .11 + ownerIndex * .013 + slot * .019,
    tilt,
    color: colors[(ownerIndex + slot * 2) % colors.length],
  };
}

export type CompanionOrbit = ReturnType<typeof createCompanionOrbit>;

export function advanceCompanionTime(age: number, delta: number, motionOn: boolean) {
  // Preserve real speed at 5-25fps, but never catch up after a hidden tab or a long stall.
  return age + (motionOn && Number.isFinite(delta) && delta > 0 && delta <= .25 ? delta : 0);
}

// The lane is independent of the owner's axial spin. Only its center and scale follow the owner.
export function sampleCompanionOrbit(orbit: CompanionOrbit, phase: number, target = new THREE.Vector3()) {
  let anomaly = phase;
  for (let i = 0; i < 4; i++) anomaly -= (anomaly - orbit.eccentricity * Math.sin(anomaly) - phase) / (1 - orbit.eccentricity * Math.cos(anomaly));
  return target.set(orbit.orbitRadius * (Math.cos(anomaly) - orbit.eccentricity), orbit.orbitRadius * Math.sqrt(1 - orbit.eccentricity ** 2) * Math.sin(anomaly), 0).applyMatrix3(orbit.frame);
}
