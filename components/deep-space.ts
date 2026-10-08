import * as THREE from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

export function createDeepSpace(size = 64) {
  const noise = new ImprovedNoise();
  const density = new Uint8Array(size ** 3);
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = noise.noise(x / size * 8 + 7.3, y / size * 8 + 2.7, z / size * 8 + 9.1);
    const b = noise.noise(x / size * 18 + 3.8, y / size * 18 + 6.2, z / size * 18 + 4.6);
    const c = noise.noise(x / size * 31 + 1.2, y / size * 31 + 8.7, z / size * 31 + 5.3);
    density[x + y * size + z * size * size] = Math.round(THREE.MathUtils.clamp(.5 + a * .46 + b * .20 + c * .07, 0, 1) * 255);
  }
  const texture = new THREE.Data3DTexture(density, size, size, size);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    uniforms: { uVolume: { value: texture }, uTime: { value: 0 }, uPull: { value: 0 }, uTarget: { value: new THREE.Vector3() }, uResolution: { value: new THREE.Vector2(1, 1) } },
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
      uniform vec2 uResolution;
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
        // Low-amplitude, static sampling softens slice bands without animated grain.
        float jitter = .5 + .18 * (fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))) * 43758.5453) - .5);
        // Bounded ray march; both scales come from cached voxels, not per-pixel fBm.
        for (int i = 0; i < 16; i++) {
          vec3 p = cameraPosition + ray * (max(0.0,start) + (float(i) + jitter) * stepSize);
          p += (uTarget - p) * uPull * .18;
          vec3 uv = (p - vec3(-16.0,-11.0,-32.0)) / vec3(32.0,22.0,28.0) + vec3(0.0, sin(uTime * .02) * .02, 0.0);
          float cloud = texture(uVolume, uv).r;
          float detail = texture(uVolume, uv.zxy * 3.7 + .13).r;
          float ribbon = p.y - p.x * .47 + 1.8 + sin(p.x * .29) * 1.5 + p.z * .09;
          float rift = ribbon + (cloud - .5) * 12.0 + (detail - .5) * 1.8;
          float sheet = exp(-pow(ribbon * .32, 2.0)) * exp(-pow((p.z + 17.0) * .095, 2.0));
          float filaments = smoothstep(.48,.65,detail) * smoothstep(.49,.65,cloud);
          float darkLane = (1.0 - smoothstep(.28, 1.7, abs(rift))) * smoothstep(.38, .58, cloud);
          float dust = smoothstep(.40, .66, cloud) * sheet;
          float extinction = dust * .36 * stepSize;
          vec3 emission = mix(vec3(.006,.065,.23), vec3(.15,.016,.12), smoothstep(-6.0, 8.0, p.x));
          vec3 ionized = mix(vec3(.018,.37,.65), vec3(.73,.085,.16), smoothstep(-4.0, 7.0, p.x + p.y * .8));
          emission += ionized * filaments * 1.65;
          emission += vec3(.85,.46,.21) * pow(filaments, 3.0) * .7;
          emission *= 1.0 - darkLane * .98;
          light += emission * extinction * (1.0 - alpha);
          alpha += extinction * (1.0 - alpha);
        }
        vec2 screen = gl_FragCoord.xy / uResolution;
        vec2 reading = abs((screen - vec2(.5,.48)) / vec2(.46,.34));
        float outsideCopy = smoothstep(.2, 1.8, pow(reading.x, 4.0) + pow(reading.y, 4.0));
        float readingGuard = mix(.52, 1.0, outsideCopy);
        gl_FragColor = vec4(light / max(alpha, .001), min(.9, alpha) * (1.0 - uPull * .55) * readingGuard);
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
