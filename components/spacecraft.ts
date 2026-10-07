import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type SpacecraftKind = "ufo" | "scout";
export type SpacecraftPose = { visible: boolean; x: number; y: number; depth: number; roll: number; opacity: number };
export type FlightObstacle = { x: number; y: number; radius: number };
export type SafeFlightPoint = { x: number; y: number; visible: boolean; clearance: number };
export const PURSUIT_DELAY = 4.8;
export const SPACECRAFT_PERIOD = 112;

export function spacecraftPose(age: number, motionOn: boolean, kind: SpacecraftKind = "ufo", out: SpacecraftPose = { visible: false, x: 0, y: 0, depth: 0, roll: 0, opacity: 0 }) {
  const t = ((Math.max(0, Number.isFinite(age) ? age : 0) % SPACECRAFT_PERIOD) - .6 - (kind === "scout" ? PURSUIT_DELAY : 0)) / 18;
  out.visible = motionOn ? t > 0 && t < 1 : true;
  out.x = motionOn ? -1.15 + t * 2.3 : kind === "ufo" ? -.46 : -.75;
  out.y = motionOn ? .61 + Math.sin(t * Math.PI) * .11 : kind === "ufo" ? .68 : .43;
  out.depth = -2.8 + (motionOn ? Math.sin(t * Math.PI) * .45 : 0);
  out.roll = motionOn ? Math.sin(t * Math.PI * 2) * .10 : -.08;
  out.opacity = motionOn ? THREE.MathUtils.smoothstep(t, 0, .09) * (1 - THREE.MathUtils.smoothstep(t, .87, 1)) : .72;
  return out;
}

// Circle-boundary candidates also handle overlapping exclusion zones without iterative pushes.
export function routeSpacecraft(x: number, preferredY: number, radius: number, obstacles: readonly FlightObstacle[], minY: number, maxY: number, out: SafeFlightPoint) {
  out.x = x;
  out.visible = false;
  out.clearance = 0;
  if (maxY < minY) return out;
  const desired = THREE.MathUtils.clamp(preferredY, minY, maxY);
  let best = Infinity;
  const consider = (y: number) => {
    if (y < minY || y > maxY) return;
    let clearance = 10;
    for (const obstacle of obstacles) {
      const gap = Math.hypot(x - obstacle.x, y - obstacle.y) - radius - obstacle.radius;
      if (gap < .0349) return;
      clearance = Math.min(clearance, gap);
    }
    const score = Math.abs(y - desired);
    if (score < best) { best = score; out.y = y; out.visible = true; out.clearance = clearance; }
  };
  consider(desired); consider(minY); consider(maxY);
  for (const obstacle of obstacles) {
    const distance = radius + obstacle.radius + .035;
    const dx = x - obstacle.x;
    if (Math.abs(dx) >= distance) continue;
    const offset = Math.sqrt(distance * distance - dx * dx);
    consider(obstacle.y - offset); consider(obstacle.y + offset);
  }
  return out;
}

function packed(parts: THREE.BufferGeometry[]) {
  const flat = parts.map((part) => part.index ? part.toNonIndexed() : part);
  const result = mergeGeometries(flat, false)!;
  parts.forEach((part, index) => { part.dispose(); if (flat[index] !== part) flat[index].dispose(); });
  return result;
}

export function createSpacecraft(kind: SpacecraftKind = "ufo") {
  const group = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: kind === "ufo" ? "#a9b6bf" : "#c6c8bd", metalness: .64, roughness: .31, emissive: "#283a43", emissiveIntensity: .28, transparent: true });
  const trim = new THREE.MeshStandardMaterial({ color: "#28363d", metalness: .48, roughness: .42, transparent: true });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#719ba6", metalness: .18, roughness: .10, clearcoat: 1, clearcoatRoughness: .08, transparent: true, opacity: .84 });
  const light = new THREE.MeshBasicMaterial({ color: kind === "ufo" ? "#ffd59c" : "#a4ecff", transparent: true });
  const flame = new THREE.MeshBasicMaterial({ color: "#75ceeb", transparent: true, opacity: .48, depthWrite: false });
  if (kind === "ufo") {
    const profile = [[0, -.06], [.09, -.07], [.24, -.045], [.32, -.005], [.32, .02], [.26, .06], [.16, .09], [0, .09]].map(([x, y]) => new THREE.Vector2(x, y));
    group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 64), hull));
    group.add(new THREE.Mesh(packed([
      new THREE.TorusGeometry(.265, .008, 8, 64).rotateX(Math.PI / 2).translate(0, .062, 0),
      new THREE.CylinderGeometry(.15, .11, .04, 32).translate(0, -.065, 0),
      new THREE.SphereGeometry(.063, 16, 8).scale(1, .4, 1).translate(0, .1, 0),
    ]), trim));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    dome.position.y = .07;
    group.add(dome);
    group.add(new THREE.Mesh(packed([
      new THREE.TorusGeometry(.30, .006, 8, 64).rotateX(Math.PI / 2).translate(0, .005, 0),
      new THREE.TorusGeometry(.105, .014, 8, 32).rotateX(Math.PI / 2).translate(0, -.09, 0),
    ]), light));
    const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(.055, .006, .032), trim, 12);
    const ports = new THREE.InstancedMesh(new THREE.SphereGeometry(.012, 8, 6), light, 12);
    const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      position.set(Math.cos(angle) * .225, .057, Math.sin(angle) * .225);
      rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, -angle);
      panels.setMatrixAt(i, matrix.compose(position, rotation, scale));
      ports.setMatrixAt(i, matrix.makeTranslation(Math.cos(angle) * .305, .025, Math.sin(angle) * .305));
    }
    group.add(panels, ports);
    group.add(new THREE.Mesh(new THREE.ConeGeometry(.068, .09, 16).rotateX(Math.PI).translate(0, -.13, 0), flame));
  } else {
    const wings = new THREE.Shape();
    wings.moveTo(.18, 0); wings.lineTo(-.18, .16); wings.lineTo(-.44, .45); wings.lineTo(-.45, .25); wings.lineTo(-.24, 0);
    wings.lineTo(-.45, -.25); wings.lineTo(-.44, -.45); wings.lineTo(-.18, -.16); wings.closePath();
    const wingGeometry = new THREE.ExtrudeGeometry(wings, { depth: .032, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1, steps: 1 }).rotateX(-Math.PI / 2).translate(0, -.02, 0);
    group.add(new THREE.Mesh(packed([
      new THREE.CylinderGeometry(.10, .145, .62, 12).rotateZ(-Math.PI / 2),
      new THREE.ConeGeometry(.105, .32, 12).rotateZ(-Math.PI / 2).translate(.42, 0, 0), wingGeometry,
      ...[-.24, .24].map((z) => new THREE.CylinderGeometry(.075, .09, .24, 16).rotateZ(Math.PI / 2).translate(-.38, 0, z)),
    ]), hull));
    group.add(new THREE.Mesh(packed([
      new THREE.BoxGeometry(.34, .016, .055).translate(-.13, .124, 0),
      ...[-.24, .24].map((z) => new THREE.TorusGeometry(.082, .012, 8, 24).rotateY(Math.PI / 2).translate(-.51, 0, z)),
    ]), trim));
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.12, 24, 12), glass);
    cockpit.scale.set(1.65, .55, .7); cockpit.position.set(.12, .105, 0); group.add(cockpit);
    group.add(new THREE.Mesh(packed([-.24, .24].map((z) => new THREE.CircleGeometry(.065, 24).rotateY(-Math.PI / 2).translate(-.524, 0, z))), light));
    group.add(new THREE.Mesh(packed([-.24, .24].map((z) => new THREE.ConeGeometry(.055, .24, 16).rotateZ(Math.PI / 2).translate(-.64, 0, z))), flame));
    const vents = new THREE.InstancedMesh(new THREE.BoxGeometry(.008, .065, .07), trim, 8);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 8; i++) vents.setMatrixAt(i, matrix.makeTranslation(-.22 + (i % 4) * .035, .093, i < 4 ? -.085 : .085));
    group.add(vents);
  }
  const bounds = new THREE.Box3().setFromObject(group);
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  return { kind, group, hull, trim, glass, light, flame, radius: sphere.radius + sphere.center.length(), span: bounds.max.x - bounds.min.x };
}
