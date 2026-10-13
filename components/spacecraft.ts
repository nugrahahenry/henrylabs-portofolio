import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type SpacecraftKind = "ufo" | "scout";
export type SpacecraftPose = { visible: boolean; x: number; y: number; depth: number; roll: number; pitch: number; yaw: number; opacity: number; entry: number; scale: number };
export type FlightObstacle = { x: number; y: number; radius: number };
export type SafeFlightPoint = { x: number; y: number; visible: boolean; clearance: number };
export const PURSUIT_DELAY = 4.8;
export const COMPACT_PURSUIT_DELAY = 10;
export const PURSUIT_REST = 30;
export const PURSUIT_SHOTS = 8;
export const PURSUIT_SHOT_SECONDS = .48;
export const FLIGHT_START_X = -1.04;
export const pursuitEnd = (delay = PURSUIT_DELAY) => 20.7 + delay;
// The next UFO appears at +.6, exactly thirty seconds after the portal closes.
export const pursuitPeriod = (delay = PURSUIT_DELAY) => pursuitEnd(delay) + PURSUIT_REST - .6;
export type PursuitClock = { age: number; cycle: number; delay: number; interrupted: boolean };

export function advancePursuit(clock: PursuitClock, dt: number, allowed: boolean, motionOn: boolean, delay: number, settled: boolean) {
  if (!motionOn) return;
  if (clock.age === 0 && settled) clock.delay = delay;
  if (clock.delay !== delay || !allowed && clock.age > .6 && clock.age < pursuitEnd(clock.delay)) clock.interrupted = true;
  if (clock.interrupted) {
    if (!settled) return;
    clock.delay = delay;
    clock.age = pursuitEnd(delay);
    clock.interrupted = false;
  }
  if (!allowed) return;
  clock.age += Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .04) : 0;
  const period = pursuitPeriod(clock.delay);
  if (clock.age >= period) { clock.age -= period; clock.cycle++; }
}
// Keep the rendezvous in the open left sky, away from the natural system on the right.
export const WORMHOLE_X = -.42;

export function wormholePresence(age: number, motionOn: boolean, delay = PURSUIT_DELAY) {
  const time = Math.max(0, age) % pursuitPeriod(delay);
  return motionOn ? THREE.MathUtils.smoothstep(time, 13.5, 15.3) * (1 - THREE.MathUtils.smoothstep(time, 18.9 + delay, 20.7 + delay)) : 0;
}

// Aim just past the target on a tight tangent. The whole segment is clearance-tested,
// so the shot reads as a deliberate warning burst instead of a stray projectile.
export function pursuitMiss(from: Pick<FlightObstacle, "x" | "y">, target: FlightObstacle & { radiusX?: number; radiusY?: number }, index: number, out = { x: 0, y: 0 }, side = 1, gap = .008) {
  const rx = Math.max(.001, target.radiusX ?? target.radius), ry = Math.max(.001, target.radiusY ?? target.radius);
  const dx = (target.x - from.x) / rx, dy = (target.y - from.y) / ry;
  const distance = Math.max(.001, Math.hypot(dx, dy));
  const clearance = gap / Math.min(rx, ry);
  const sine = Math.min(.95, (1 + clearance * (1 + index % 2 * .25)) / distance);
  const cosine = Math.sqrt(1 - sine * sine);
  const travel = distance * cosine + Math.max(.8, distance * .18) + clearance;
  out.x = from.x + (dx / distance * cosine - dy / distance * sine * side) * travel * rx;
  out.y = from.y + (dy / distance * cosine + dx / distance * sine * side) * travel * ry;
  return out;
}

export function flightPresence(current: number, target: number, dt: number) {
  const step = Math.min(.04, Math.max(0, dt)) / (target > current ? .55 : .42);
  return current + THREE.MathUtils.clamp(target - current, -step, step);
}

export function pursuitShotTime(index: number, delay = PURSUIT_DELAY) {
  const first = Math.max(7.4, delay + 1.9);
  return THREE.MathUtils.lerp(first, Math.max(first, 14.95), Math.floor(index / 2) / 3) + index % 2 * .045;
}

export function pursuitPulse(age: number, index: number, delay = PURSUIT_DELAY) {
  if (index < 0 || index >= PURSUIT_SHOTS) return -1;
  const encounter = Math.max(0, age) % pursuitPeriod(delay);
  const phase = (encounter - pursuitShotTime(index, delay)) / PURSUIT_SHOT_SECONDS;
  return phase >= 0 && phase <= 1 ? phase : -1;
}

export function clearShot(from: Pick<FlightObstacle, "x" | "y">, to: Pick<FlightObstacle, "x" | "y">, obstacles: readonly FlightObstacle[], count = obstacles.length, margin = .025) {
  const dx = to.x - from.x, dy = to.y - from.y, length = dx * dx + dy * dy;
  if (length < .001) return false;
  for (let index = 0; index < count; index++) {
    const body = obstacles[index];
    const t = THREE.MathUtils.clamp(((body.x - from.x) * dx + (body.y - from.y) * dy) / length, 0, 1);
    if (Math.hypot(body.x - from.x - dx * t, body.y - from.y - dy * t) < body.radius + margin) return false;
  }
  return true;
}

export function createPursuitBolts() {
  const material = new THREE.MeshBasicMaterial({ color: "#d4f8ff", transparent: true, opacity: .95, depthWrite: false, toneMapped: false });
  const geometry = packed([
    new THREE.CylinderGeometry(.07, .07, .6, 8),
    new THREE.ConeGeometry(.075, .2, 8).translate(0, .4, 0),
    new THREE.CylinderGeometry(.055, .006, .65, 6).translate(0, -.62, 0),
  ]);
  const mesh = new THREE.InstancedMesh(geometry, material, PURSUIT_SHOTS);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.visible = false;
  return mesh;
}

export function spacecraftPose(age: number, motionOn: boolean, kind: SpacecraftKind = "ufo", out: SpacecraftPose = { visible: false, x: 0, y: 0, depth: 0, roll: 0, pitch: 0, yaw: 0, opacity: 0, entry: 0, scale: 1 }, delay = PURSUIT_DELAY) {
  const t = ((Math.max(0, Number.isFinite(age) ? age : 0) % pursuitPeriod(delay)) - .6 - (kind === "scout" ? delay : 0)) / 18;
  const travel = THREE.MathUtils.clamp(t, 0, 1), arc = Math.sin(travel * Math.PI);
  out.visible = motionOn ? t > 0 && t < 1 : true;
  out.entry = motionOn ? THREE.MathUtils.smoothstep(t, .82, 1) : 0;
  out.x = motionOn ? FLIGHT_START_X + travel * (WORMHOLE_X - FLIGHT_START_X) : kind === "ufo" ? -.46 : -.75;
  out.y = motionOn ? .61 + Math.sin(t * Math.PI) * .10 + Math.sin(t * Math.PI * 4) * .035 * (1 - out.entry) : kind === "ufo" ? .68 : .43;
  out.depth = -2.8 + (motionOn ? arc * 2.1 - out.entry * 4 : 0);
  out.roll = motionOn ? Math.sin(travel * Math.PI * 2) * .30 * (1 - out.entry) : -.08;
  out.pitch = motionOn ? Math.cos(travel * Math.PI * 2) * .12 * (1 - out.entry) : .08;
  out.yaw = motionOn ? -.38 + travel * .65 + out.entry * 1.05 : -.3;
  out.scale = 1 - out.entry * .96;
  out.opacity = motionOn ? THREE.MathUtils.smoothstep(t, 0, .09) * (1 - THREE.MathUtils.smoothstep(out.entry, .75, 1)) : .72;
  return out;
}

export function createWormhole() {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform float uOpacity;
      void main(){
        vec2 p=(vUv-.5)*2.4; float r=length(p); float a=atan(p.y,p.x);
        float edge=exp(-pow((r-.83)*20.0,2.0));
        float spiral=(.5+.5*sin(a*5.0-r*23.0+uTime*1.8))*smoothstep(.12,.8,r);
        vec3 color=mix(vec3(.015,.04,.07),vec3(.12,.6,.68),spiral*.3);
        color+=edge*mix(vec3(.28,.88,1.0),vec3(1.0,.82,.48),.5+.5*sin(a*2.0+uTime*.4));
        gl_FragColor=vec4(color,uOpacity*(1.0-smoothstep(.91,1.1,r)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), material));
  const rimMaterial = new THREE.MeshBasicMaterial({ color: "#bceefa", transparent: true, opacity: 0, depthWrite: false });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.85, .012, 8, 80), rimMaterial);
  rim.position.z = .035;
  group.add(rim);
  group.visible = false;
  return { group, material, rimMaterial };
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
  const hull = new THREE.MeshStandardMaterial({ color: kind === "ufo" ? "#a9b6bf" : "#d1d5d5", metalness: .48, roughness: .34, emissive: "#18232a", emissiveIntensity: .12, transparent: true });
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
    const fuselage = [[0, -.36], [.085, -.35], [.13, -.24], [.11, .12], [.075, .36], [.015, .58], [0, .60]].map(([r, x]) => new THREE.Vector2(r, x));
    const fin = new THREE.Shape();
    fin.moveTo(-.38, .06); fin.lineTo(-.36, .26); fin.lineTo(-.14, .10); fin.closePath();
    group.add(new THREE.Mesh(packed([
      new THREE.LatheGeometry(fuselage, 24).rotateZ(-Math.PI / 2), wingGeometry,
      new THREE.ExtrudeGeometry(fin, { depth: .022, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1, steps: 1 }).translate(0, 0, -.011),
      ...[-.24, .24].map((z) => new THREE.CylinderGeometry(.075, .09, .24, 16).rotateZ(Math.PI / 2).translate(-.38, 0, z)),
    ]), hull));
    group.add(new THREE.Mesh(packed([
      new THREE.BoxGeometry(.34, .016, .055).translate(-.13, .124, 0),
      ...[-.24, .24].map(z => new THREE.CylinderGeometry(.055, .055, .19, 16).rotateZ(Math.PI / 2).translate(-.42, 0, z)),
      ...[-.24, .24].map((z) => new THREE.TorusGeometry(.082, .012, 8, 24).rotateY(Math.PI / 2).translate(-.51, 0, z)),
      ...[-.20, .20].map(z => new THREE.CylinderGeometry(.016, .022, .18, 10).rotateZ(-Math.PI / 2).translate(.13, .01, z)),
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
  const outline = kind === "ufo" ? [[.335, .02], [.26, .075], [.135, .15], [0, .215], [.075, -.18]].flatMap(([r, y]) => Array.from({ length: 24 }, (_, index) => new THREE.Vector3(Math.cos(index / 24 * Math.PI * 2) * r, y, Math.sin(index / 24 * Math.PI * 2) * r))) : [];
  return { kind, group, hull, trim, glass, light, flame, outline, radius: sphere.radius + sphere.center.length(), span: bounds.max.x - bounds.min.x };
}
