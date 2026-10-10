import * as THREE from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

export function createDeepSpace(size = 64) {
  const noise = new ImprovedNoise();
  const density = new Uint8Array(size ** 3);
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = noise.noise(x / size * 8 + 7.3, y / size * 8 + 2.7, z / size * 8 + 9.1);
    const b = noise.noise(x / size * 18 + 3.8, y / size * 18 + 6.2, z / size * 18 + 4.6);
    const c = noise.noise(x / size * 31 + 1.2, y / size * 31 + 8.7, z / size * 31 + 5.3);
    const ridge = 1 - Math.abs(noise.noise(x / size * 11 + 12.4, y / size * 11 + 4.1, z / size * 11 + 15.8));
    const cloud = .5 + a * .38 + b * .19 + c * .07 + Math.pow(THREE.MathUtils.clamp(ridge, 0, 1), 1.7) * .12;
    density[x + y * size + z * size * size] = Math.round(THREE.MathUtils.clamp(cloud, 0, 1) * 255);
  }
  const texture = new THREE.Data3DTexture(density, size, size, size);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    uniforms: { uVolume: { value: texture }, uTime: { value: 0 }, uPull: { value: 0 }, uPresence: { value: 1 }, uTarget: { value: new THREE.Vector3() }, uResolution: { value: new THREE.Vector2(1, 1) } },
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
      uniform float uPresence;
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
          float macro = texture(uVolume, uv).r;
          float cloudDetail = texture(uVolume, fract(uv * 1.34 + vec3(.11,.07,.17))).r;
          float detail = texture(uVolume, fract(uv.zxy * 3.7 + vec3(.13))).r;
          float cloud = smoothstep(.34, .72, macro * .74 + cloudDetail * .26);
          float laneA = p.y - p.x * .47 + 1.8 + sin(p.x * .29 + p.z * .07) * 1.5 + p.z * .09;
          float laneB = p.y + p.x * .28 - 2.6 + sin(p.x * .19 - p.z * .06) * 1.2 - p.z * .07;
          float laneC = p.y * .48 - p.x * .08 + 1.1 + sin(p.x * .36 + p.z * .11) * .82;
          float rift = min(abs(laneA), min(abs(laneB), abs(laneC))) + (macro - .5) * 8.0 + (detail - .5) * 1.8;
          float sheetA = exp(-pow(laneA * .32, 2.0)) * exp(-pow((p.z + 17.0) * .095, 2.0));
          float sheetB = exp(-pow(laneB * .22, 2.0)) * exp(-pow((p.z + 12.0) * .11, 2.0));
          float sheetC = exp(-pow(laneC * .46, 2.0)) * exp(-pow((p.z + 22.0) * .075, 2.0));
          float sheet = max(sheetA, max(sheetB * .78, sheetC * .64));
          float filaments = smoothstep(.45, .68, detail) * smoothstep(.40, .68, cloud) * (.32 + sheet * .68);
          float darkLane = (1.0 - smoothstep(.28, 1.7, abs(rift))) * smoothstep(.38, .58, cloud);
          float dust = smoothstep(.40, .66, cloud) * (.22 + sheet * .92);
          float extinction = dust * .36 * stepSize;
          float depthTint = smoothstep(-29.0, -7.0, p.z);
          vec3 emission = mix(vec3(.004,.038,.14), vec3(.12,.01,.10), smoothstep(-6.0, 8.0, p.x));
          vec3 ionized = mix(vec3(.018,.30,.60), vec3(.62,.045,.22), smoothstep(-5.0, 7.0, p.x + p.y * .8));
          vec3 warm = mix(vec3(.86,.17,.045), vec3(1.0,.72,.32), depthTint);
          emission += ionized * filaments * 1.46;
          emission += warm * pow(sheet, 2.4) * .58;
          emission *= 1.0 - darkLane * .92;
          light += emission * extinction * (1.0 - alpha);
          alpha += extinction * (1.0 - alpha);
        }
        vec2 screen = gl_FragCoord.xy / uResolution;
        vec2 reading = abs((screen - vec2(.5,.48)) / vec2(.46,.34));
        float outsideCopy = smoothstep(.2, 1.8, pow(reading.x, 4.0) + pow(reading.y, 4.0));
        float readingGuard = mix(.52, 1.0, outsideCopy);
        gl_FragColor = vec4(light / max(alpha, .001), min(.9, alpha) * (1.0 - uPull * .55) * readingGuard * uPresence);
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
