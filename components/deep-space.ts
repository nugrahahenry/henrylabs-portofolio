import * as THREE from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

export function createDeepSpace(size = 64) {
  const noise = new ImprovedNoise();
  const density = new Uint8Array(size ** 3);
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = noise.noise(x / size * 8 + 7.3, y / size * 8 + 2.7, z / size * 8 + 9.1);
    const b = noise.noise(x / size * 18 + 3.8, y / size * 18 + 6.2, z / size * 18 + 4.6);
    density[x + y * size + z * size * size] = Math.round(THREE.MathUtils.clamp(.5 + a * .38 + b * .16, 0, 1) * 255);
  }
  const texture = new THREE.Data3DTexture(density, size, size, size);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    uniforms: { uVolume: { value: texture }, uTime: { value: 0 }, uPull: { value: 0 }, uTarget: { value: new THREE.Vector3() } },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: `
      precision highp sampler3D;
      uniform sampler3D uVolume;
      uniform float uTime;
      uniform float uPull;
      uniform vec3 uTarget;
      varying vec3 vWorld;
      void main() {
        vec3 ray = normalize(vWorld - cameraPosition);
        vec3 inv = 1.0 / ray;
        vec3 a = (vec3(-16.0,-11.0,-32.0) - cameraPosition) * inv;
        vec3 b = (vec3(16.0,11.0,-4.0) - cameraPosition) * inv;
        vec3 nearPlane = min(a,b), farPlane = max(a,b);
        float start = max(max(nearPlane.x, nearPlane.y), nearPlane.z);
        float end = min(min(farPlane.x, farPlane.y), farPlane.z);
        float stepSize = max(0.0, end - max(0.0,start)) / 16.0;
        vec3 light = vec3(0.0);
        float alpha = 0.0;
        // Sixteen trilinear density samples replace full-screen animated noise evaluation.
        for (int i = 0; i < 16; i++) {
          vec3 p = cameraPosition + ray * (max(0.0,start) + (float(i) + .5) * stepSize);
          p += (uTarget - p) * uPull * .18;
          vec3 uv = (p - vec3(-16.0,-11.0,-32.0)) / vec3(32.0,22.0,28.0) + vec3(0.0, sin(uTime * .02) * .02, 0.0);
          float cloud = texture(uVolume, uv).r;
          float detail = texture(uVolume, uv.zxy * .93 + .05).r;
          float sheet = exp(-pow((p.y + 3.0 - sin(p.x * .23) * 2.8 + p.z * .12) * .8, 2.0));
          float dust = smoothstep(.43, .68, cloud) * (1.0 - smoothstep(.54,.70,detail) * .75) * sheet;
          float extinction = dust * .17 * stepSize;
          vec3 emission = mix(vec3(.07,.30,.33), vec3(.42,.10,.19), smoothstep(-8.0, 10.0, p.x));
          emission = mix(emission, vec3(.38,.38,.47), smoothstep(.56,.72, detail) * .45);
          light += emission * extinction * (1.0 - alpha);
          alpha += extinction * (1.0 - alpha);
        }
        gl_FragColor = vec4(light / max(alpha, .001), min(.76, alpha) * (1.0 - uPull * .55));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, side: THREE.BackSide,
  });
  const volume = new THREE.Mesh(new THREE.BoxGeometry(32, 22, 28), material);
  volume.position.z = -18;
  volume.renderOrder = -10;
  volume.frustumCulled = false;
  return { volume, material, texture };
}
