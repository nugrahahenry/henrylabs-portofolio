import * as THREE from "three";

export type GalaxyId = "main" | "university" | "client";
export const galaxies = [
  { id: "main", name: { en: "HenryLabs", id: "HenryLabs" }, count: 5, color: "#78cdbb", arms: 3 },
  { id: "university", name: { en: "University", id: "Kuliah" }, count: 3, color: "#ebcd89", arms: 2 },
  { id: "client", name: { en: "Client Work", id: "Client Work" }, count: 2, color: "#d5a7c8", arms: 4 },
] as const;

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
    const material = new THREE.PointsMaterial({ map: texture, vertexColors: true, size: .085, sizeAttenuation: true, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geometry, material);
    disk.add(points);
    const nucleus = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: "#fff6de", transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }));
    nucleus.scale.set(.28, .2, 1);
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: galaxy.color, transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false }));
    cloud.scale.set(1.5, .8, 1);
    disk.add(cloud, nucleus);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.42, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
    cluster.add(disk, hit);
    group.add(cluster);
    return { ...galaxy, cluster, disk, material, nucleus, cloud, hit };
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
  return { group, clusters, center, texture, layout };
}
