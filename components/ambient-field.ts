import * as THREE from "three";

export const DISTANT_STAR_COUNT = 1800;
export const COMPACT_STAR_COUNT = 1000;
export const FEEDING_DUST_COUNT = 240;

const spread = (index: number, step: number) => ((index + .5) * step) % 1;

export function stellarTwinkle(seed: number, time: number, motionOn = true) {
  return .92 + (motionOn ? .08 * Math.sin(time * (.18 + seed * .08) + seed * Math.PI * 2) : 0);
}

export function createDistantStarMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMotion: { value: 1 }, uScale: { value: 1 } },
    vertexShader: `
      attribute vec3 color;
      uniform float uTime;
      uniform float uMotion;
      uniform float uScale;
      varying vec3 vColor;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        float seed = fract(sin(dot(position.xyz, vec3(12.9898, 78.233, 39.425))) * 43758.5453);
        float light = .92 + uMotion * .08 * sin(uTime * (.18 + seed * .08) + seed * 6.2831853);
        vColor = color * light;
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(.115 * uScale / max(1.0, -view.z), 1.0, 3.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float mask = 1.0 - smoothstep(.08, .5, length(gl_PointCoord - .5));
        gl_FragColor = vec4(vColor, mask * .65);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

export function distantStarPoint(index: number, out = new THREE.Vector3()) {
  const depth = 18 + spread(index, .438579) * 22;
  return out.set(
    (spread(index, .754877666) * 2 - 1) * (depth + 6.8) * .98,
    (spread(index, .569840296) * 2 - 1) * (depth + 6.8) * .5,
    -depth,
  );
}

// View-relative sources retain upper/side coverage across camera motion and aspect ratios.
export function dustStreamSource(index: number, out = new THREE.Vector3()) {
  const u = spread(index, .754877666), v = spread(index, .569840296);
  const lane = index % 4;
  const depth = -(11 + spread(index, .438579) * 3);
  if (lane < 2) return out.set(-.96 + u * 1.6, .64 + v * .32, depth);
  if (lane === 2) return out.set(-.98 + u * .12, -.5 + v * 1.2, depth);
  return out.set(-.96 + u * 1.3, -.96 + v * .22, depth);
}
