import * as THREE from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

export type PlanetKind = "rocky" | "ocean" | "ice" | "gas";
export const projectPlanetKinds: PlanetKind[] = ["rocky", "ocean", "ice", "gas", "rocky"];
const noise = new ImprovedNoise();
const clamp = THREE.MathUtils.clamp;

export function removeEdgeMatte(data: Uint8ClampedArray, width: number, height: number) {
  const corners = [0, width - 1, width * (height - 1), width * height - 1];
  const background = [...data.slice(0, 4)];
  const matches = (index: number) => {
    const offset = index * 4;
    return Math.abs(background[0] - data[offset]) < 24 && Math.abs(background[1] - data[offset + 1]) < 24 && Math.abs(background[2] - data[offset + 2]) < 24 && data[offset + 3] > 235;
  };
  if (background[3] < 235 || !corners.every(matches)) return;
  const queue = new Uint32Array(width * height);
  const seen = new Uint8Array(queue.length);
  let head = 0;
  let tail = 0;
  const visit = (index: number) => {
    if (!seen[index] && matches(index)) { seen[index] = 1; queue[tail++] = index; }
  };
  corners.forEach(visit);
  while (head < tail) {
    const index = queue[head++];
    data[index * 4 + 3] = 0;
    const x = index % width;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < width * (height - 1)) visit(index + width);
  }
}

function terrainNoise(x: number, y: number, z: number, seed: number, octaves = 4) {
  let total = 0;
  let amplitude = .55;
  let frequency = 2.6;
  for (let i = 0; i < octaves; i++) {
    total += noise.noise(x * frequency + seed, y * frequency + seed * .37, z * frequency - seed * .23) * amplitude;
    frequency *= 2.05;
    amplitude *= .5;
  }
  return total;
}

// Sampling a sphere, rather than a flat UV plane, joins longitudes and poles without seams.
export function buildPlanetPixels(color: string, kind: PlanetKind, width = 512, seed = 7) {
  const height = width / 2;
  const albedo = new Uint8ClampedArray(width * height * 4);
  const relief = new Uint8ClampedArray(albedo.length);
  const clouds = new Uint8ClampedArray(albedo.length);
  const tint = new THREE.Color(color).getHex(THREE.SRGBColorSpace);
  const base = [(tint >> 16) & 255, (tint >> 8) & 255, tint & 255];
  const craters = Array.from({ length: 9 }, (_, i) => {
    const longitude = i * 2.399 + seed;
    const latitude = Math.asin(-.8 + i * .2);
    return { x: Math.cos(longitude) * Math.cos(latitude), y: Math.sin(latitude), z: Math.sin(longitude) * Math.cos(latitude), radius: .09 + i % 3 * .045 };
  });
  for (let row = 0; row < height; row++) {
    const latitude = row / (height - 1) * Math.PI;
    const sy = Math.cos(latitude);
    const latitudeRadius = Math.sin(latitude);
    for (let column = 0; column < width; column++) {
      const longitude = column / (width - 1) * Math.PI * 2;
      const sx = Math.cos(longitude) * latitudeRadius;
      const sz = Math.sin(longitude) * latitudeRadius;
      const landNoise = terrainNoise(sx, sy, sz, seed);
      const fine = noise.noise(sx * 54 + seed, sy * 54, sz * 54) * .055;
      let elevation = .5 + landNoise * .6 + fine;
      let brightness = .58 + elevation * .7;
      let red = base[0] * brightness;
      let green = base[1] * brightness;
      let blue = base[2] * brightness;
      if (kind === "gas") {
        const warp = terrainNoise(sx, sy, sz, seed + 13, 3);
        const bands = Math.sin(sy * 32 + warp * 6) * .13 + Math.sin(sy * 73 + warp * 8) * .045;
        brightness = .77 + bands + landNoise * .18;
        red = base[0] * brightness + 13;
        green = base[1] * brightness + 7;
        blue = base[2] * brightness;
        elevation = .5 + bands * .18;
      } else if (kind === "ocean") {
        const land = THREE.MathUtils.smoothstep(landNoise, -.025, .08);
        const ocean = [16 + elevation * 14, 43 + elevation * 20, 69 + elevation * 31];
        red = THREE.MathUtils.lerp(ocean[0], base[0] * .65 * brightness, land);
        green = THREE.MathUtils.lerp(ocean[1], base[1] * .76 * brightness, land);
        blue = THREE.MathUtils.lerp(ocean[2], base[2] * .51 * brightness, land);
        const cap = THREE.MathUtils.smoothstep(Math.abs(sy) + landNoise * .15, .88, .98);
        red = THREE.MathUtils.lerp(red, 220, cap);
        green = THREE.MathUtils.lerp(green, 231, cap);
        blue = THREE.MathUtils.lerp(blue, 231, cap);
        elevation = .22 + land * (.3 + landNoise * .3);
      } else if (kind === "ice") {
        const cracks = Math.pow(Math.max(0, 1 - Math.abs(landNoise * 3)), 12);
        red = 118 + base[0] * .39 + landNoise * 44 - cracks * 55;
        green = 139 + base[1] * .35 + landNoise * 36 - cracks * 34;
        blue = 151 + base[2] * .3 + landNoise * 26 - cracks * 14;
        elevation = .5 + landNoise * .3 - cracks * .12;
      } else {
        for (const crater of craters) {
          const distance = Math.hypot(sx - crater.x, sy - crater.y, sz - crater.z) / crater.radius;
          if (distance < 1.2) {
            const bowl = (1 - THREE.MathUtils.smoothstep(distance, .35, .85)) * .13;
            const ridge = Math.exp(-Math.pow((distance - .9) * 11, 2)) * .065;
            elevation += ridge - bowl;
            red += (ridge - bowl) * 90;
            green += (ridge - bowl) * 84;
            blue += (ridge - bowl) * 72;
          }
        }
      }
      const offset = (row * width + column) * 4;
      albedo.set([clamp(red, 0, 255), clamp(green, 0, 255), clamp(blue, 0, 255), 255], offset);
      const bump = clamp(elevation * 255, 0, 255);
      relief.set([bump, bump, bump, 255], offset);
      const cloud = kind === "ocean" ? THREE.MathUtils.smoothstep(terrainNoise(sx * 1.8, sy, sz * 1.8, seed + 31, 3), .05, .24) * 170 : 0;
      clouds.set([233, 242, 245, cloud], offset);
    }
  }
  return { width, height, albedo, relief, clouds };
}

export function createPlanetMaps(color: string, kind: PlanetKind, width = 512, seed = 7) {
  const pixels = buildPlanetPixels(color, kind, width, seed);
  const makeTexture = (data: Uint8ClampedArray, colorSpace: typeof THREE.SRGBColorSpace | typeof THREE.NoColorSpace) => {
    const canvas = document.createElement("canvas");
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(data), pixels.width, pixels.height), 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = colorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
  };
  const map = makeTexture(pixels.albedo, THREE.SRGBColorSpace);
  const bump = makeTexture(pixels.relief, THREE.NoColorSpace);
  const cloud = kind === "ocean" ? makeTexture(pixels.clouds, THREE.SRGBColorSpace) : null;
  return { map, bump, cloud, textures: cloud ? [map, bump, cloud] : [map, bump] };
}

export function createAtmosphere(radius: number, color: string) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: .6 }, uSun: { value: new THREE.Vector3(-4, 5, 7).normalize() } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vView = cameraPosition - world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uSun;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec3 normal = normalize(vNormal);
        float rim = pow(1.0 - abs(dot(normal, normalize(vView))), 4.2);
        float light = smoothstep(-.3, .65, dot(normal, uSun));
        gl_FragColor = vec4(uColor, rim * uOpacity * mix(.08, 1.0, light));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.035, 32, 20), material);
}

export function createPlanetRing(radius: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const context = canvas.getContext("2d")!;
  for (let x = 0; x < 256; x++) {
    const t = x / 255;
    const edge = Math.sin(t * Math.PI);
    const gap = t > .61 && t < .65 ? .06 : 1;
    const shade = 140 + Math.sin(x * .57) * 20 + Math.cos(x * .16) * 26;
    context.fillStyle = `rgba(${shade + 28},${shade + 17},${shade},${edge * gap * .72})`;
    context.fillRect(x, 0, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.RingGeometry(radius * 1.25, radius * 1.93, 96);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, (Math.hypot(position.getX(i), position.getY(i)) / radius - 1.25) / .68, .5);
  const ring = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false, roughness: .96 }));
  ring.rotation.set(.95, .18, .25);
  return { ring, texture };
}
