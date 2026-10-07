import * as THREE from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

export type GalaxyId = "main" | "university" | "client";
export const galaxies = [
  { id: "main", name: { en: "HenryLabs", id: "HenryLabs" }, count: 5, color: "#78cdbb", arms: 3 },
  { id: "university", name: { en: "University", id: "Kuliah" }, count: 3, color: "#ebcd89", arms: 2 },
  { id: "client", name: { en: "Client Work", id: "Client Work" }, count: 2, color: "#d5a7c8", arms: 4 },
] as const;

function galaxyDustTexture(arms: number, color: string, seed: number) {
  const width = 384;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = width;
  const data = new Uint8ClampedArray(width * width * 4);
  const noise = new ImprovedNoise();
  const tint = new THREE.Color(color).getHex(THREE.SRGBColorSpace);
  const outer = [(tint >> 16) & 255, (tint >> 8) & 255, tint & 255];
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const sx = x / (width - 1) * 2 - 1;
    const sy = y / (width - 1) * 2 - 1;
    const radius = Math.hypot(sx, sy);
    const offset = (y * width + x) * 4;
    if (radius >= .97) continue;
    const clumps = noise.noise(sx * 9 + seed, sy * 9, seed * .3);
    const grain = noise.noise(sx * 47 + seed, sy * 47, seed);
    const phase = Math.atan2(sy, sx) - radius * (4.5 + seed * .04);
    const arm = Math.pow(.5 + .5 * Math.cos(phase * arms + clumps * 1.6), 6);
    const bulge = Math.exp(-radius * radius * 54);
    const dustLane = 1 - Math.pow(.5 + .5 * Math.sin(phase * arms + .7 + clumps), 18) * .6;
    const edge = 1 - THREE.MathUtils.smoothstep(radius, .72, .97);
    const light = (bulge * .84 + arm * (.19 + clumps * .12 + grain * .045) + .025) * dustLane * edge;
    data.set([
      THREE.MathUtils.lerp(outer[0], 255, bulge),
      THREE.MathUtils.lerp(outer[1], 228, bulge),
      THREE.MathUtils.lerp(outer[2], 185, bulge),
      THREE.MathUtils.clamp(light * 255, 0, 255),
    ], offset);
  }
  canvas.getContext("2d")!.putImageData(new ImageData(data, width, width), 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createGalaxySystem() {
  const stamp = document.createElement("canvas");
  stamp.width = stamp.height = 32;
  const context = stamp.getContext("2d")!;
  const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(.22, "rgba(255,255,255,.7)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(stamp);
  const group = new THREE.Group();
  const textures: THREE.Texture[] = [texture];
  const clusters = galaxies.map((galaxy, index) => {
    const cluster = new THREE.Group();
    const disk = new THREE.Group();
    const positions = new Float32Array(820 * 3);
    const colors = new Float32Array(820 * 3);
    const tint = new THREE.Color(galaxy.color);
    const coreColor = new THREE.Color("#fff6de");
    const color = new THREE.Color();
    THREE.MathUtils.seededRandom(1703 + index * 97);
    for (let i = 0; i < 820; i++) {
      const seed = THREE.MathUtils.seededRandom();
      const bulge = i < 170;
      const radius = bulge ? Math.pow(seed, .65) * .36 : Math.pow(seed, .72) * 1.62;
      const angle = bulge ? THREE.MathUtils.seededRandom() * Math.PI * 2 : i % galaxy.arms * Math.PI * 2 / galaxy.arms + radius * (2.7 + index * .35) + (THREE.MathUtils.seededRandom() - .5) * (.35 + seed * .7);
      positions.set([
        Math.cos(angle) * radius,
        (THREE.MathUtils.seededRandom() - .5) * (bulge ? .18 : .055 + radius * .065),
        Math.sin(angle) * radius,
      ], i * 3);
      color.copy(tint).lerp(coreColor, bulge ? .8 : Math.pow(1 - seed, 3) * .7);
      colors.set([color.r, color.g, color.b], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ map: texture, vertexColors: true, size: .043, sizeAttenuation: true, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geometry, material);
    disk.add(points);
    const dustMap = galaxyDustTexture(galaxy.arms, galaxy.color, 17 + index * 13);
    textures.push(dustMap);
    const dustMaterial = new THREE.MeshBasicMaterial({ map: dustMap, transparent: true, opacity: .62, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const dust = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3), dustMaterial);
    dust.rotation.x = -Math.PI / 2;
    disk.add(dust);
    const nucleus = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: "#fff6de", transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }));
    nucleus.scale.set(.28, .2, 1);
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: galaxy.color, transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false }));
    cloud.scale.set(1.5, .8, 1);
    disk.add(cloud, nucleus);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.42, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
    cluster.add(disk, hit);
    group.add(cluster);
    return { ...galaxy, cluster, disk, material, nucleus, cloud, hit, dustMaterial };
  });
  const center = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: "#fff1ca", transparent: true, opacity: .42, blending: THREE.AdditiveBlending, depthWrite: false }));
  center.scale.set(.22, .22, 1);
  center.position.z = -.6;
  group.add(center);
  const layout = (portrait: boolean, angle: number) => {
    // Keep each nucleus outside the neighboring label's touch target.
    const positions = portrait ? [[0, 2.9, 0], [2.1, .05, -.4], [.65, -2.9, .15]] : [[-3.2, .85, .2], [2.8, 1.25, -.9], [.7, -2.0, .55]];
    clusters.forEach(({ cluster, disk }, index) => {
      const [x, y, z] = positions[index];
      cluster.position.set(x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle), z + Math.sin(angle + index) * .2);
      cluster.scale.setScalar(portrait ? .85 : index === 0 ? 1.35 : 1.12);
      disk.rotation.set([.92, .7, 1.12][index], -.15 + index * .23, -.12 + index * .18);
    });
  };
  return { group, clusters, center, textures, layout };
}
