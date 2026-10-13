import * as THREE from "three";

export const PASSAGE_COUNT = 72;
export const COMPACT_PASSAGE_COUNT = 36;
const spread = (index: number, step: number) => ((index + .5) * step) % 1;

export type PassageClock = { distance: number; speed: number; opacity: number };

export function advancePassage(clock: PassageClock, delta: number, scrollDelta: number, height: number, motion: boolean, protectedChapter: boolean) {
  if (!motion) { clock.speed = 0; clock.opacity = 0; return; }
  // Ignore a suspended frame or a layout jump instead of catching up in one burst.
  if (!Number.isFinite(delta) || delta <= 0 || delta > .25) return;
  const scrollSpeed = Math.min(1, Math.abs(scrollDelta) / Math.max(1, height) / delta / 2);
  const targetSpeed = protectedChapter ? .48 : .48 + scrollSpeed * 2.4;
  clock.speed = THREE.MathUtils.damp(clock.speed, targetSpeed, 2.6, delta);
  clock.opacity = THREE.MathUtils.damp(clock.opacity, protectedChapter ? 0 : .76, protectedChapter ? 6 : 2, delta);
  if (clock.opacity > .002) clock.distance += clock.speed * delta;
}

export function passagePoint(index: number, distance: number, aspect: number, out: THREE.Vector3) {
  const phase = (spread(index, .618033989) + distance * (.78 + spread(index, .438579) * .4) / 26) % 1;
  const angle = index * 2.39996323;
  const radius = 1.3 + spread(index, .754877666) * 3.1;
  out.set(Math.cos(angle) * radius * aspect, Math.sin(angle) * radius, -(27 - phase * 26));
  return THREE.MathUtils.smoothstep(phase, .02, .14) * (1 - THREE.MathUtils.smoothstep(phase, .82, .97));
}

export function passageReadingGuard(x: number, y: number, rect: { left: number; top: number; right: number; bottom: number } | null) {
  if (!rect) return 1;
  const dx = Math.max(rect.left - x, x - rect.right, 0);
  const dy = Math.max(rect.top - y, y - rect.bottom, 0);
  return THREE.MathUtils.smoothstep(Math.hypot(dx, dy), 14, 48);
}

export function createCameraPassage() {
  const positions = new Float32Array(PASSAGE_COUNT * 3);
  const opacity = new Float32Array(PASSAGE_COUNT);
  const colors = new Float32Array(PASSAGE_COUNT * 3);
  const sizes = new Float32Array(PASSAGE_COUNT);
  const color = new THREE.Color();
  for (let i = 0; i < PASSAGE_COUNT; i++) {
    color.set(i % 7 === 0 ? 0xffddab : i % 3 === 0 ? 0x94dcf6 : 0xe7f5ff);
    color.toArray(colors, i * 3);
    sizes[i] = .026 + spread(i, .569840296) * .038;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aOpacity", new THREE.BufferAttribute(opacity, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 }, uOpacity: { value: 0 } },
    vertexShader: `
      attribute vec3 color;
      attribute float aOpacity;
      attribute float aSize;
      uniform float uScale;
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(aSize * uScale / max(1.0, -view.z), 1.5, 6.0);
        vColor = color;
        vOpacity = aOpacity;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.0;
        float core = 1.0 - smoothstep(.08, .48, radius);
        float halo = .22 * pow(max(0.0, 1.0 - radius), 2.0);
        float alpha = (core + halo) * vOpacity * uOpacity;
        if (alpha < .003) discard;
        gl_FragColor = vec4(vColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, geometry, material, positions, opacity, sizes };
}
