"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "motion/react";
import { ArrowUpRight, Minus, Plus, RotateCcw } from "lucide-react";
import * as THREE from "three";
import { createGalaxySystem, galaxies, type GalaxyId } from "./galaxy-system";
import { advanceGalaxyFlight, sampleGalaxyFlight } from "./galaxy-flight";
import { createPlanetMaps, removeEdgeMatte } from "./planet-materials";
import { createProjectSculpture } from "./project-sculptures";
import { resolveTechOwner, sampleTechOrbit, techOrbitRadius } from "./tech-orbit";
import { orbitGeometry, orbitalSpeed, sampleOrbit } from "./orbital-path";
import { createStellarAura } from "./stellar-core";
import { UNIVERSE_CHAPTER as chapter } from "./universe-chapter";

export type ProjectId = "catmoji" | "nalira" | "canox" | "hengs" | "polara";
export type SatelliteId = "rental" | "pos" | "labq" | "yventures" | "soreva";
export type OrbitId = ProjectId | SatelliteId;
export type SatelliteWorld = { id: SatelliteId; name: string; color: string; mark: string; x: number; y: number; z: number };
type OrbitWorld = { id: OrbitId; name: string; color: string; logo?: string; mark?: string; x: number; y: number; z: number };
export type TechOrbitItem = { label: string; slug: string; color: string; projectIds: readonly OrbitId[] };

export const projectWorlds = [
  { id: "catmoji", name: "Catmoji", x: -3.2, y: 1.15, z: .2, color: "#ef8e73", logo: "catmoji.png" },
  { id: "nalira", name: "Nalira", x: 2.25, y: 1.3, z: -.7, color: "#78cdbb", logo: "nalira.svg" },
  { id: "canox", name: "Canox", x: 3.15, y: -.85, z: .2, color: "#8ea2d5", logo: "canox.png" },
  { id: "hengs", name: "Hengs", x: -2.1, y: -1.6, z: -.5, color: "#ebcd89", logo: "hengs.png" },
  { id: "polara", name: "Polara", x: .85, y: -1.7, z: .6, color: "#d5a7c8", logo: "polara.png" },
] as const;

const orbitPhases = [130, 60, 0, 210, 300].map(THREE.MathUtils.degToRad);

function projectShellTexture(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, 512, 256);
  gradient.addColorStop(0, color);
  gradient.addColorStop(.5, "#10162c");
  gradient.addColorStop(1, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function satelliteTexture(canvas: HTMLCanvasElement, mark: string) {
  const ctx = canvas.getContext("2d")!;
  ctx.font = "700 48px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f4f5ef";
  [128, 384].forEach((x) => ctx.fillText(mark, x, 128));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function projectMarkSilhouette(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = 256 / Math.max(width, height);
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  // Only a uniform, edge-connected fill is removed; enclosed light details survive.
  removeEdgeMatte(pixels.data, canvas.width, canvas.height);
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function planetSurfaceTexture(image: HTMLImageElement, surface: HTMLCanvasElement) {
  const context = surface.getContext("2d")!;
  const silhouette = projectMarkSilhouette(image);
  const imageWidth = silhouette.width;
  const imageHeight = silhouette.height;
  const drawLogo = (centerX: number, centerY: number, size: number, opacity: number, rotation: number) => {
    context.save();
    context.globalAlpha = opacity;
    context.translate(centerX, centerY);
    context.rotate(rotation);
    const scale = Math.min(size / imageWidth, size / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    context.drawImage(silhouette, -width / 2, -height / 2, width, height);
    context.restore();
  };

  // A faint all-surface identity skin complements the full 3D mark inside the shell.
  drawLogo(128, 128, 122, .65, 0);
  drawLogo(384, 128, 122, .65, 0);
  drawLogo(256, 68, 65, .7, -.12);
  drawLogo(256, 193, 65, .7, .12);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function techMark(label: string) {
  if (label === "JavaScript") return "JS";
  if (label === "TypeScript") return "TS";
  if (label === "Next.js") return "N";
  if (label === "Node.js") return "NJ";
  if (label === "MediaPipe") return "MP";
  if (label === "WhatsApp") return "WA";
  return label.slice(0, 2).toUpperCase();
}

function techPlanetSurfaceTexture(item: TechOrbitItem) {
  const color = `#${item.color}`;
  const seed = Array.from(item.label).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 127;
  const maps = createPlanetMaps(color, "rocky", 256, seed);
  const surface = maps.map.image as HTMLCanvasElement;
  const context = surface.getContext("2d")!;
  context.scale(.5, .5);
  const drawMark = (centerX: number, centerY: number, size: number, opacity: number) => {
    context.save();
    context.globalAlpha = opacity;
    const glow = context.createRadialGradient(centerX - size * .18, centerY - size * .2, size * .06, centerX, centerY, size * .62);
    glow.addColorStop(0, "rgba(255,255,255,.95)");
    glow.addColorStop(.45, color);
    glow.addColorStop(1, "rgba(7,9,27,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, centerY, size * .66, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(7,9,27,.7)";
    context.beginPath();
    context.arc(centerX, centerY, size * .43, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f4f5ef";
    context.font = `700 ${Math.round(size * .32)}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(techMark(item.label), centerX, centerY + 1);
    context.restore();
  };
  drawMark(256, 128, 102, 1);
  drawMark(78, 94, 66, .48);
  drawMark(434, 94, 66, .48);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  const paintLogo = (image: HTMLImageElement) => {
    const drawImageMark = (centerX: number, centerY: number, size: number, opacity: number) => {
      const imageWidth = image.naturalWidth || image.width;
      const imageHeight = image.naturalHeight || image.height;
      const scale = Math.min(size / imageWidth, size / imageHeight);
      context.save();
      context.globalAlpha = opacity;
      context.beginPath();
      context.arc(centerX, centerY, size * .44, 0, Math.PI * 2);
      context.clip();
      context.drawImage(image, centerX - imageWidth * scale / 2, centerY - imageHeight * scale / 2, imageWidth * scale, imageHeight * scale);
      context.restore();
    };
    drawImageMark(256, 128, 64, 1);
    drawImageMark(78, 94, 42, .48);
    drawImageMark(434, 94, 42, .48);
    texture.needsUpdate = true;
  };
  return { texture, bump: maps.bump, sourceTexture: maps.map, paintLogo };
}

export function CosmicCanvas({ activeId, onSelect, onPrevious, onNext, motionOn, progress, techNodes, satelliteCatalog, sector, view, language, readingOpen, onGalaxySelect, onUniverse }: {
  activeId: OrbitId;
  onSelect: (id: OrbitId) => void;
  onPrevious: () => void;
  onNext: () => void;
  motionOn: boolean;
  progress: MotionValue<number>;
  techNodes: readonly TechOrbitItem[];
  satelliteCatalog: Record<"university" | "client", readonly SatelliteWorld[]>;
  sector: GalaxyId;
  view: "universe" | "orbit";
  language: "en" | "id";
  readingOpen: boolean;
  onGalaxySelect: (id: GalaxyId) => void;
  onUniverse: () => void;
}) {
  const worlds: readonly OrbitWorld[] = sector === "main" ? projectWorlds : satelliteCatalog[sector];
  const hostRef = useRef<HTMLDivElement>(null);
  const labels = useRef<Array<HTMLButtonElement | null>>([]);
  const galaxyLabels = useRef<Array<HTMLButtonElement | null>>([]);
  const selectRef = useRef(onSelect);
  const galaxySelectRef = useRef(onGalaxySelect);
  const [viewZoom, setViewZoom] = useState(0);
  const state = useRef({ activeId, motionOn, viewZoom, sector, view, readingOpen });
  const focusRequest = useRef<"universe" | "orbit" | null>(null);
  const wakeRef = useRef<() => void>(() => {});
  const [fallback, setFallback] = useState(false);
  const rendererEpoch = useRef(0);
  const galaxyHover = useRef(-1);

  useEffect(() => {
    if (state.current.view !== view) focusRequest.current = view;
    state.current = { activeId, motionOn, viewZoom, sector, view, readingOpen };
    wakeRef.current();
  }, [activeId, motionOn, viewZoom, sector, view, readingOpen]);

  useEffect(() => {
    selectRef.current = onSelect;
    galaxySelectRef.current = onGalaxySelect;
  }, [onSelect, onGalaxySelect]);

  useEffect(() => {
    const host = hostRef.current!;
    const canvas = host.querySelector("canvas")!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    host.dataset.rendererEpoch = String(++rendererEpoch.current);
    setFallback(false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    const system = new THREE.Group();
    scene.add(system);
    const universe = createGalaxySystem();
    scene.add(universe.group);
    scene.add(new THREE.AmbientLight(0xd8ebec, 1.8));
    const sunlight = new THREE.DirectionalLight(0xfff1da, 2.5);
    sunlight.position.set(-4, 5, 7);
    scene.add(sunlight);
    const fill = new THREE.DirectionalLight(0xb4d9dc, 1.4);
    fill.position.set(3, -1, -4);
    scene.add(fill);

    const starPositions = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      starPositions[i * 3] = Math.sin(i * 127.1) * 14;
      starPositions[i * 3 + 1] = Math.cos(i * 311.7) * 9;
      starPositions[i * 3 + 2] = -4 - (i % 19) * .4;
    }
    const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(starPositions, 3)), new THREE.PointsMaterial({ color: 0xcce2df, size: .019, transparent: true, opacity: .65 }));
    scene.add(stars);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const textures: THREE.Texture[] = universe.textures;
    let disposed = false;
    let brandedWorlds = 0;
    host.dataset.brandedWorlds = "0";
    const sectorWorlds: Record<GalaxyId, readonly OrbitWorld[]> = { main: projectWorlds, ...satelliteCatalog };
    const allWorlds: readonly OrbitWorld[] = [...projectWorlds, ...satelliteCatalog.university, ...satelliteCatalog.client];
    const mainCount = projectWorlds.length;
    const universityCount = satelliteCatalog.university.length;
    const allPlanets = allWorlds.map((world, worldIndex) => {
      const isMain = worldIndex < mainCount;
      const index = isMain ? worldIndex : worldIndex < mainCount + universityCount ? worldIndex - mainCount : worldIndex - mainCount - universityCount;
      const group = new THREE.Group();
      group.position.set(world.x, world.y, world.z);
      const shellTexture = projectShellTexture(world.color);
      textures.push(shellTexture);
      const texture = world.mark ? satelliteTexture(shellTexture.image, world.mark) : shellTexture;
      if (world.mark) textures.push(texture);
      const radius = .37 + index * .02;
      const sphereMaterial = new THREE.MeshStandardMaterial({ map: texture, color: "#ffffff", metalness: .08, roughness: .45, transparent: true, opacity: .12, depthWrite: false });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), sphereMaterial);
      const aura = createStellarAura(radius, world.color);
      const atmosphere = aura.shell;
      const logoHalo = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.18, .009, 8, 72), new THREE.MeshBasicMaterial({ color: world.color, transparent: true, opacity: .24, depthWrite: false }));
      logoHalo.rotation.x = .35;
      const focusRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.42, .004, 8, 72),
        new THREE.MeshBasicMaterial({ color: world.color, transparent: true, opacity: 0, depthWrite: false }),
      );
      focusRing.rotation.set(.72, -.18, .25);
      const sculpture = createProjectSculpture(world.id);
      if (isMain) sculpture.scale.multiplyScalar(radius * 1.05);
      else {
        const bounds = new THREE.Box3().setFromObject(sculpture);
        const size = bounds.getSize(new THREE.Vector3());
        const fit = radius * 1.55 / Math.max(size.x, size.y, size.z);
        sculpture.scale.multiplyScalar(fit);
        sculpture.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-fit);
      }
      group.add(sphere, atmosphere, logoHalo, focusRing, sculpture);
      if (world.logo) {
        const logoTexture = loader.load(`/assets/brand/${world.logo}`, (loaded) => {
          const surfaceTexture = planetSurfaceTexture(loaded.image, shellTexture.image);
          logoTexture.dispose();
          if (disposed) surfaceTexture.dispose();
          else {
            textures.push(surfaceTexture);
            sphereMaterial.map = surfaceTexture;
            sphereMaterial.needsUpdate = true;
            host.dataset.brandedWorlds = String(++brandedWorlds);
            wakeRef.current();
          }
        });
      }
      system.add(group);
      return { group, sphere, atmosphere, aura, logoHalo, focusRing, sculpture, radius, orbitBlend: 1, orbitFrom: new THREE.Vector3() };
    });
    const sectorPlanets = {
      main: allPlanets.slice(0, mainCount),
      university: allPlanets.slice(mainCount, mainCount + universityCount),
      client: allPlanets.slice(mainCount + universityCount),
    };
    const sectorGroups: Record<GalaxyId, THREE.Object3D[]> = {
      main: sectorPlanets.main.map(({ group }) => group),
      university: sectorPlanets.university.map(({ group }) => group),
      client: sectorPlanets.client.map(({ group }) => group),
    };
    const techTextures: THREE.Texture[] = [];
    const techSystem = new THREE.Group();
    system.add(techSystem);
    const techPlanets = techNodes.map((item, index) => {
      const group = new THREE.Group();
      const lane = index % 3;
      const radius = .09 + (index % 3) * .012;
      const color = `#${item.color}`;
      const techSurface = techPlanetSurfaceTexture(item);
      const texture = techSurface.texture;
      techTextures.push(texture, techSurface.bump, techSurface.sourceTexture);
      loader.load(`https://cdn.simpleicons.org/${item.slug}/${item.color}`, (loaded) => {
        if (!disposed) {
          techSurface.paintLogo(loaded.image);
          wakeRef.current();
        }
        loaded.dispose();
      }, undefined, () => {});
      const surface = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 12),
        new THREE.MeshStandardMaterial({ map: texture, bumpMap: techSurface.bump, bumpScale: .002, color: "#ffffff", emissive: color, emissiveIntensity: .015, metalness: 0, roughness: .9 }),
      );
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.22, 12, 10),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.42, radius * .055, 6, 28),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .25, depthWrite: false }),
      );
      ring.rotation.set(.78 + lane * .16, .18 + index * .04, .24 + lane * .22);
      ring.visible = lane === 2;
      const focusHalo = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.78, radius * .032, 5, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .04, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      focusHalo.rotation.set(.78 + lane * .16, .18 + index * .04, .24 + lane * .22);
      group.add(surface, atmosphere, ring, focusHalo);
      techSystem.add(group);
      const linkedProjectIndexes = item.projectIds.map((projectId) => allWorlds.findIndex((world) => world.id === projectId)).filter((projectIndex) => projectIndex >= 0);
      return { group, surface, atmosphere, ring, focusHalo, radius, index, lane, linkedProjectIndexes, owner: linkedProjectIndexes[0] ?? -1, handoff: 1, handoffFrom: new THREE.Vector3() };
    });
    const techOrbitFrames = allWorlds.map((world) => {
      const group = new THREE.Group();
      const techOrbitLanes = [0, 1, 2].map((laneIndex) => {
        const points = Array.from({ length: 128 }, (_, i) => sampleTechOrbit(1, laneIndex, i / 128 * Math.PI * 2));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const lane = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: world.color, transparent: true, opacity: .17, depthWrite: false }));
        group.add(lane);
        return lane;
      });
      techSystem.add(group);
      return { group, techOrbitLanes };
    });
    const sharedTechOrbit = new THREE.Group();
    sharedTechOrbit.position.set(0, -.25, -1.05);
    techSystem.add(sharedTechOrbit);
    techPlanets.forEach((moon) => (moon.owner >= 0 ? techOrbitFrames[moon.owner].group : sharedTechOrbit).add(moon.group));
    const techSignalMaterial = new THREE.MeshBasicMaterial({ color: 0x78cdbb, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const techSignal = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 8), techSignalMaterial);
    techSignal.renderOrder = 2;
    techSystem.add(techSignal);
    const orbitTarget = new THREE.Vector3();
    const sectorOwnerIndexes = Object.fromEntries(Object.entries(sectorWorlds).map(([id, worlds]) => [id, worlds.map((world) => allWorlds.findIndex((candidate) => candidate.id === world.id))])) as Record<GalaxyId, number[]>;
    const projectOrbits = Array.from({ length: 5 }, (_, index) => {
      const line = new THREE.LineLoop(orbitGeometry(.06 + index * .012), new THREE.LineBasicMaterial({ color: 0x74dfe2, transparent: true, opacity: .1, depthWrite: false }));
      system.add(line);
      return line;
    });
    const focusAnchor = new THREE.Vector3(0, .15, 2.1);
    const projectTarget = new THREE.Vector3();
    let orbitLayoutScale = 1;
    let lastFocusedId = state.current.activeId;
    let lastSector = state.current.sector;

    let visible = true;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let dragging = false;
    let pointerMoved = false;
    let pressedPlanet = -1;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let angle = 0;
    let pitch = 0;
    let viewBlend = state.current.view === "universe" ? 0 : 1;
    let universeAngle = 0;
    const galaxyEmphasis = [0, 0, 0];
    const flightPose = { pan: 0, approach: 0, orbitScale: 0, selectedVisibility: 1, otherVisibility: 1, arc: 0 };
    const mapFrame = host.closest<HTMLElement>(".cosmic-frame");
    const cameraTarget = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const findPlanetAt = (event: PointerEvent) => {
      if (viewBlend !== (state.current.view === "universe" ? 0 : 1)) return -1;
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const planetGroups = state.current.view === "universe" ? universe.clusters.map(({ hit }) => hit) : sectorGroups[state.current.sector];
      const hit = raycaster.intersectObjects(planetGroups, true).find(({ object }) => object.visible);
      if (!hit) return -1;
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        const index = planetGroups.indexOf(object);
        if (index >= 0) return index;
        object = object.parent;
      }
      return -1;
    };
    const render = (time: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = Math.min((time - lastTime) / 1000 || 0, .04);
      lastTime = time;
      if (state.current.motionOn) elapsed += dt;
      const sector = state.current.sector;
      const worlds = sectorWorlds[sector];
      const planets = sectorPlanets[sector];
      const zoom = state.current.motionOn ? THREE.MathUtils.smoothstep(progress.get(), chapter.entry, chapter.settled) : 1;
      const departure = state.current.motionOn ? THREE.MathUtils.smoothstep(progress.get(), chapter.departure, 1) : 0;
      const targetBlend = state.current.view === "universe" ? 0 : 1;
      viewBlend = state.current.motionOn ? advanceGalaxyFlight(viewBlend, targetBlend === 1, dt) : targetBlend;
      sampleGalaxyFlight(viewBlend, flightPose);
      const flightReady = viewBlend === targetBlend;
      techSystem.visible = true;
      const portrait = camera.aspect < .9;
      const galaxyFocused = document.activeElement?.classList.contains("galaxy-label");
      if (state.current.motionOn && flightReady && state.current.view === "universe" && !dragging && galaxyHover.current < 0 && !galaxyFocused) universeAngle += dt * .025;
      universe.layout(portrait, universeAngle);
      universe.center.material.opacity = .42 * (1 - viewBlend);
      const focus = universe.clusters.find((galaxy) => galaxy.id === sector)!.cluster.position;
      const halfWidth = portrait ? 3.8 : 4.7;
      const fittedDistance = Math.max(10.5, halfWidth / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      const overviewDistance = Math.max(14.5, 4.3 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      camera.position.set(focus.x * flightPose.pan, .05 + focus.y * flightPose.pan, THREE.MathUtils.lerp(overviewDistance + (1 - zoom) * 3, focus.z + fittedDistance - state.current.viewZoom * 2.7, flightPose.approach));
      const arcDirection = sector === "university" ? -1 : 1;
      camera.position.x += flightPose.arc * arcDirection * (portrait ? .65 : 1.4);
      camera.position.y += flightPose.arc * .3;
      camera.position.z += departure * departure * 26;
      cameraTarget.set(focus.x * flightPose.pan, focus.y * flightPose.pan, focus.z * flightPose.pan);
      camera.lookAt(cameraTarget);
      camera.rotateZ(flightPose.arc * arcDirection * -.025);
      system.position.copy(focus);
      system.scale.setScalar(Math.max(.0001, flightPose.orbitScale));
      system.visible = flightPose.orbitScale > .0001;
      Object.entries(sectorPlanets).forEach(([id, family]) => family.forEach(({ group }) => { group.visible = id === sector; }));
      universe.clusters.forEach(({ id, disk, material, nucleus, cloud, dustMaterial }, index) => {
        const highlighted = galaxyHover.current === index || galaxyLabels.current[index] === document.activeElement;
        const emphasis = galaxyEmphasis[index] = state.current.motionOn ? THREE.MathUtils.damp(galaxyEmphasis[index], highlighted ? 1 : 0, 8, dt) : highlighted ? 1 : 0;
        disk.rotation.y = -.15 + index * .23 + elapsed * (.018 + index * .005);
        const visibility = id === sector ? flightPose.selectedVisibility : flightPose.otherVisibility;
        material.opacity = (id === sector ? .07 + visibility * .88 : .85 * visibility) + emphasis * .12 * visibility;
        nucleus.material.opacity = (.72 + emphasis * .25) * visibility;
        cloud.material.opacity = (.025 + emphasis * .02) * visibility;
        dustMaterial.opacity = (.65 + emphasis * .08) * visibility;
        nucleus.scale.setScalar(THREE.MathUtils.damp(nucleus.scale.x, highlighted ? .22 : .17, 8, dt));
        galaxyLabels.current[index]?.setAttribute("data-highlighted", String(highlighted));
      });
      if (state.current.motionOn && !dragging && state.current.view === "orbit") angle += dt * .055;
      // The active identity is the system's star; siblings follow its complete orbital paths.
      system.rotation.y = Math.sin(elapsed * .12) * .08;
      system.rotation.x = pitch + Math.sin(elapsed * .09) * .018;
      const activeIndex = Math.max(0, worlds.findIndex((world) => world.id === state.current.activeId));
      const railOpen = !portrait && state.current.readingOpen;
      focusAnchor.x = state.current.motionOn ? THREE.MathUtils.damp(focusAnchor.x, railOpen ? -1.4 : 0, 7, dt) : railOpen ? -1.4 : 0;
      orbitLayoutScale = state.current.motionOn ? THREE.MathUtils.damp(orbitLayoutScale, railOpen ? .72 : 1, 7, dt) : railOpen ? .72 : 1;
      if (lastFocusedId !== state.current.activeId || lastSector !== sector) {
        planets.forEach((planet) => { planet.orbitFrom.copy(planet.group.position).sub(focusAnchor); planet.orbitBlend = state.current.motionOn ? 0 : 1; });
        lastFocusedId = state.current.activeId;
        lastSector = sector;
      }
      let projectOrbitError = 0;
      projectOrbits.forEach((line, index) => { line.visible = index < planets.length && index !== activeIndex; });
      planets.forEach((planet, index) => {
        const { group, sphere, atmosphere, aura, logoHalo, focusRing, sculpture } = planet;
        const selected = worlds[index].id === state.current.activeId;
        const scale = selected ? 2.25 : .94;
        group.scale.setScalar(state.current.motionOn ? THREE.MathUtils.damp(group.scale.x, scale, 7, dt) : scale);
        const rank = (index - activeIndex + worlds.length) % worlds.length - 1;
        const orbitRadius = ((portrait ? 1.98 : 2.35) + Math.max(0, rank) * (portrait ? .31 : .37)) * orbitLayoutScale;
        const phase = (sector === "main" ? orbitPhases[index] : index * Math.PI * 2 / worlds.length + .8) + angle + elapsed * orbitalSpeed(orbitRadius) * .45;
        const line = projectOrbits[index];
        line.position.copy(focusAnchor);
        line.scale.setScalar(orbitRadius);
        line.material.color.set(worlds[activeIndex].color);
        line.material.opacity = .075 + (index % 2) * .025;
        if (selected) projectTarget.set(0, 0, 0);
        else sampleOrbit(orbitRadius, phase, .06 + index * .012, projectTarget);
        planet.orbitBlend = Math.min(1, planet.orbitBlend + dt / .85);
        group.position.copy(planet.orbitBlend < 1 ? planet.orbitFrom : projectTarget);
        if (planet.orbitBlend < 1) group.position.lerp(projectTarget, 1 - Math.pow(1 - planet.orbitBlend, 3));
        group.position.add(focusAnchor);
        if (planet.orbitBlend >= 1) projectOrbitError = Math.max(projectOrbitError, group.position.distanceTo(projectTarget.add(focusAnchor)));
        sphere.rotation.y = -system.rotation.y + index * .12 + elapsed * .08;
        sphere.rotation.x = Math.sin(elapsed * .18 + index) * .035;
        atmosphere.rotation.y = -elapsed * .05;
        sculpture.rotation.y = elapsed * (.11 + index * .008) + angle * .22;
        sculpture.rotation.x = Math.sin(elapsed * .16 + index) * .04;
        aura.material.uniforms.uOpacity.value = selected ? .42 : .09;
        aura.material.uniforms.uTime.value = elapsed;
        logoHalo.rotation.z = elapsed * (state.current.motionOn ? .08 : 0);
        const focusMaterial = focusRing.material as THREE.MeshBasicMaterial;
        const targetOpacity = selected ? .42 : .025;
        focusMaterial.opacity = state.current.motionOn ? THREE.MathUtils.damp(focusMaterial.opacity, targetOpacity, 8, dt) : targetOpacity;
        focusRing.rotation.z = elapsed * (state.current.motionOn ? (selected ? .18 : -.035) : 0);
        focusRing.scale.setScalar(state.current.motionOn && selected ? 1 + Math.sin(elapsed * 2.4 + index) * .045 : 1);
      });
      const selectedProjectIndex = allWorlds.findIndex((world) => world.id === state.current.activeId);
      const availableOwners = sectorOwnerIndexes[sector];
      let visibleTechCount = 0;
      const activeTechPlanets = techPlanets.filter(({ linkedProjectIndexes }) => linkedProjectIndexes.includes(selectedProjectIndex));
      const activeLanes = new Set(activeTechPlanets.map(({ lane }) => lane));
      techOrbitFrames.forEach(({ group, techOrbitLanes }, ownerIndex) => {
        const owner = allPlanets[ownerIndex].group;
        group.position.copy(owner.position);
        group.rotation.y = elapsed * .025 + ownerIndex * .15;
        const bodyRadius = allPlanets[ownerIndex].radius * owner.scale.x;
        techOrbitLanes.forEach((lane, laneIndex) => {
          lane.scale.setScalar(techOrbitRadius(bodyRadius, laneIndex));
          lane.visible = ownerIndex === selectedProjectIndex && activeLanes.has(laneIndex);
          lane.material.opacity = .16 + (state.current.motionOn ? Math.sin(elapsed * .8 + laneIndex) * .018 : 0);
        });
      });
      techSignal.visible = activeTechPlanets.length > 0;
      techSignalMaterial.color.set(allWorlds[selectedProjectIndex]?.color ?? "#78cdbb");
      techSignalMaterial.opacity = state.current.motionOn ? .55 + Math.sin(elapsed * 2.4) * .16 : .55;
      if (activeTechPlanets.length > 0) {
        const frame = techOrbitFrames[selectedProjectIndex];
        if (techSignal.parent !== frame.group) frame.group.add(techSignal);
        const signalLane = activeTechPlanets[Math.floor(elapsed * .35) % activeTechPlanets.length]?.lane ?? 0;
        const signalPhase = elapsed * (.22 + signalLane * .03);
        const bodyRadius = allPlanets[selectedProjectIndex].radius * allPlanets[selectedProjectIndex].group.scale.x;
        sampleTechOrbit(techOrbitRadius(bodyRadius, signalLane), signalLane, signalPhase, techSignal.position);
      }
      let orbitError = 0;
      let transfers = 0;
      techPlanets.forEach((moon) => {
        const { group, surface, atmosphere, ring, focusHalo, index, lane, linkedProjectIndexes } = moon;
        const anchorIndex = resolveTechOwner(linkedProjectIndexes, selectedProjectIndex, availableOwners);
        group.visible = anchorIndex >= 0 || linkedProjectIndexes.length === 0 && sector === "main";
        if (group.visible) visibleTechCount++;
        const belongsToProject = anchorIndex >= 0;
        const isActiveProjectTool = linkedProjectIndexes.includes(selectedProjectIndex);
        const frame = belongsToProject ? techOrbitFrames[anchorIndex].group : sharedTechOrbit;
        if (moon.owner !== anchorIndex) {
          frame.attach(group);
          moon.handoffFrom.copy(group.position);
          moon.handoff = state.current.motionOn ? 0 : 1;
          moon.owner = anchorIndex;
        }
        const anchorRadius = belongsToProject ? allPlanets[anchorIndex].radius * allPlanets[anchorIndex].group.scale.x : 0;
        const radiusPath = belongsToProject ? techOrbitRadius(anchorRadius, lane) : 2.55 + lane * .16;
        const phase = index * 2.37 + elapsed * (belongsToProject ? .24 + lane * .035 : .065);
        sampleTechOrbit(radiusPath, lane, phase, orbitTarget);
        moon.handoff = Math.min(1, moon.handoff + dt / .8);
        if (moon.handoff < 1 && state.current.motionOn) {
          group.position.copy(moon.handoffFrom).lerp(orbitTarget, 1 - Math.pow(1 - moon.handoff, 3));
          if (group.visible) transfers++;
        } else group.position.copy(orbitTarget);
        if (belongsToProject && moon.handoff >= 1) orbitError = Math.max(orbitError, Math.abs(group.position.length() - radiusPath));
        group.rotation.y = elapsed * (.16 + lane * .04) + index;
        const pulse = state.current.motionOn ? 1 + Math.sin(elapsed * 1.7 + index) * .05 : 1;
        group.scale.setScalar(pulse * (isActiveProjectTool ? 1.2 : belongsToProject ? .96 : .72));
        const surfaceMaterial = surface.material as THREE.MeshStandardMaterial;
        surfaceMaterial.emissiveIntensity = isActiveProjectTool ? .045 : belongsToProject ? .015 : 0;
        surface.scale.setScalar(1);
        atmosphere.material.opacity = (isActiveProjectTool ? .24 : belongsToProject ? .13 : .045) + (state.current.motionOn ? Math.sin(elapsed * .8 + index) * .025 : 0);
        (ring.material as THREE.MeshBasicMaterial).opacity = isActiveProjectTool ? .64 : belongsToProject ? .26 : .07;
        ring.rotation.z = .24 + lane * .22 + elapsed * (.12 + lane * .035);
        const focusMaterial = focusHalo.material as THREE.MeshBasicMaterial;
        const focusOpacity = isActiveProjectTool ? .3 : belongsToProject ? .065 : .015;
        focusMaterial.opacity = state.current.motionOn ? THREE.MathUtils.damp(focusMaterial.opacity, focusOpacity, 8, dt) : focusOpacity;
        focusHalo.rotation.z = .24 + lane * .22 - elapsed * (.16 + lane * .035);
        focusHalo.scale.setScalar(isActiveProjectTool && state.current.motionOn ? 1 + Math.sin(elapsed * 2.1 + index) * .08 : 1);
      });
      renderer.render(scene, camera);
      universe.clusters.forEach(({ cluster }, index) => {
        cluster.getWorldPosition(projected);
        projected.project(camera);
        const label = galaxyLabels.current[index];
        if (label) {
          const x = (projected.x * .5 + .5) * host.clientWidth;
          const y = (-projected.y * .5 + .5) * host.clientHeight;
          const offset = host.clientHeight < 250 ? 14 : portrait ? 26 : 55;
          label.dataset.coreX = x.toFixed(1);
          label.dataset.coreY = y.toFixed(1);
          label.style.transform = `translate(-50%, 0) translate(${Math.max(62, Math.min(host.clientWidth - 62, x))}px, ${Math.max(4, Math.min(host.clientHeight - 54, y + offset))}px)`;
        }
      });
      planets.forEach(({ group }, index) => {
        group.getWorldPosition(projected);
        const depth = Math.max(.1, projected.distanceTo(camera.position));
        projected.project(camera);
        const label = labels.current[index];
        const radiusPixels = (.37 + index * .02) * group.scale.x * host.clientHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth);
        if (label) label.style.transform = `translate(-50%, 0) translate(${(projected.x * .5 + .5) * host.clientWidth}px, ${(-projected.y * .5 + .5) * host.clientHeight + radiusPixels + 8}px)`;
      });
      host.dataset.ready = "true";
      host.dataset.time = elapsed.toFixed(2);
      host.dataset.angle = angle.toFixed(3);
      host.dataset.pitch = pitch.toFixed(3);
      host.dataset.techCount = String(state.current.view === "orbit" ? visibleTechCount : 0);
      host.dataset.linkedTechCount = String(state.current.view === "orbit" ? techPlanets.filter(({ linkedProjectIndexes }) => linkedProjectIndexes.includes(selectedProjectIndex)).length : 0);
      host.dataset.viewZoom = state.current.viewZoom.toFixed(2);
      host.dataset.worldCount = String(state.current.view === "orbit" ? worlds.length : 0);
      host.dataset.activeWorld = state.current.view === "orbit" ? state.current.activeId : "";
      host.dataset.flight = viewBlend.toFixed(3);
      host.dataset.flightReady = String(flightReady);
      if (mapFrame) mapFrame.dataset.flightReady = String(flightReady);
      host.dataset.flightStage = flightReady ? state.current.view : viewBlend < .46 ? "approach" : "arrival";
      host.dataset.flightPan = flightPose.pan.toFixed(3);
      host.dataset.flightArc = flightPose.arc.toFixed(3);
      host.dataset.orbitScale = flightPose.orbitScale.toFixed(3);
      host.dataset.galaxyVisibility = flightPose.selectedVisibility.toFixed(3);
      host.dataset.galaxyCount = "3";
      host.dataset.planetSurface = "transparent-identity";
      host.dataset.sculptureWorlds = String(allPlanets.length);
      host.dataset.techOrbitError = orbitError.toFixed(6);
      host.dataset.techTransfers = String(transfers);
      host.dataset.orbitCenter = worlds[activeIndex].id;
      host.dataset.projectOrbits = String(planets.length - 1);
      host.dataset.orbitConnectors = "0";
      host.dataset.projectOrbitError = projectOrbitError.toFixed(6);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.universeAngle = universeAngle.toFixed(4);
      host.dataset.departure = departure.toFixed(3);
      host.dataset.cameraDistance = camera.position.z.toFixed(2);
      host.dataset.hoveredGalaxy = galaxyHover.current >= 0 ? galaxies[galaxyHover.current].id : "";
      if (focusRequest.current && viewBlend === targetBlend) {
        if (document.activeElement === document.body || document.activeElement === host) {
          if (focusRequest.current === "orbit") host.focus({ preventScroll: true });
          else galaxyLabels.current[galaxies.findIndex((galaxy) => galaxy.id === sector)]?.focus({ preventScroll: true });
        }
        focusRequest.current = null;
      }
      if (state.current.motionOn) frame = requestAnimationFrame(render);
    };
    const wake = () => { if (!frame && !disposed) frame = requestAnimationFrame(render); };
    wakeRef.current = wake;
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = host;
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      wake();
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (viewBlend !== (state.current.view === "universe" ? 0 : 1)) return;
      if ((event.target as HTMLElement).closest("button")) return;
      dragging = true;
      pointerMoved = false;
      pressedPlanet = findPlanetAt(event);
      lastX = event.clientX;
      lastY = event.clientY;
      startX = event.clientX;
      startY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) {
        galaxyHover.current = state.current.view === "universe" ? findPlanetAt(event) : -1;
        canvas.style.cursor = galaxyHover.current >= 0 ? "pointer" : "";
        wake();
        return;
      }
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 6) pointerMoved = true;
      angle += (event.clientX - lastX) * .006;
      pitch += (event.clientY - lastY) * .006;
      lastX = event.clientX;
      lastY = event.clientY;
      wake();
    };
    const up = (event: PointerEvent) => {
      if (!dragging) return;
      if (!pointerMoved && pressedPlanet >= 0) {
        if (state.current.view === "universe") { galaxyHover.current = -1; setViewZoom(0); galaxySelectRef.current(universe.clusters[pressedPlanet].id); }
        else {
          setViewZoom(.2);
          selectRef.current(sectorWorlds[state.current.sector][pressedPlanet].id);
        }
      }
      dragging = false;
      pointerMoved = false;
      pressedPlanet = -1;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const cancel = () => { dragging = false; pointerMoved = false; pressedPlanet = -1; };
    const leave = () => { galaxyHover.current = -1; canvas.style.cursor = ""; wake(); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("pointerleave", leave);
    const contextLost = (event: Event) => { event.preventDefault(); setFallback(true); cancelAnimationFrame(frame); };
    canvas.addEventListener("webglcontextlost", contextLost);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const intersection = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      visible = entry.isIntersecting;
      host.dataset.intersecting = String(visible);
      if (visible) wake();
    }, { rootMargin: "80px 0px" });
    intersection.observe(host);
    document.addEventListener("visibilitychange", wake);
    const unsubscribe = progress.on("change", wake);
    resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      unsubscribe();
      document.removeEventListener("visibilitychange", wake);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", contextLost);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose());
      });
      textures.forEach((texture) => texture.dispose());
      techTextures.forEach((texture) => texture.dispose());
      techSignal.geometry.dispose();
      techSignalMaterial.dispose();
      // React Strict Mode reuses a connected canvas during its effect audit.
      if (!canvas.isConnected) renderer.forceContextLoss();
      renderer.dispose();
      wakeRef.current = () => {};
    };
  }, [progress, satelliteCatalog, techNodes]);

  return <div ref={hostRef} data-view={view} data-kind={sector === "main" ? "main" : "satellite"} data-world-count={view === "orbit" ? worlds.length : 0} data-active-world={view === "orbit" ? activeId : ""} className={`cosmic-canvas${fallback ? " canvas-fallback" : ""}`} role="group" tabIndex={0} aria-label={view === "universe" ? language === "en" ? "Galaxy map" : "Peta galaksi" : "Project orbit"} onKeyDown={(event) => {
    if (event.key === "Escape" && view === "orbit" && !document.querySelector('[role="dialog"]')) { event.preventDefault(); onUniverse(); return; }
    if (!fallback && hostRef.current?.dataset.flightReady === "false" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); return; }
    if (view === "universe") {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const index = galaxyLabels.current.findIndex((label) => label === document.activeElement);
        galaxyLabels.current[(index + (event.key === "ArrowRight" ? 1 : 2) + 3) % 3]?.focus({ preventScroll: true });
      }
      return;
    }
    if (event.key === "ArrowLeft") { event.preventDefault(); onPrevious(); }
    if (event.key === "ArrowRight") { event.preventDefault(); onNext(); }
  }}>
    <canvas aria-hidden="true" />
    {view === "orbit" && <div className="cosmic-zoom-controls" aria-label="Planet view controls">
      <button type="button" onClick={() => setViewZoom((value) => Math.min(.45, value + .12))} aria-label="Zoom in on planets" title="Zoom in"><Plus size={14} /></button>
      <button type="button" onClick={() => setViewZoom((value) => Math.max(0, value - .12))} aria-label="Zoom out of planets" title="Zoom out"><Minus size={14} /></button>
      <button type="button" onClick={() => setViewZoom(0)} aria-label="Reset planet zoom" title="Reset zoom"><RotateCcw size={13} /></button>
    </div>}
    {view === "universe" && galaxies.map((galaxy, index) => <button key={galaxy.id} ref={(element) => { galaxyLabels.current[index] = element; }} type="button" className="galaxy-label" style={{ "--galaxy-color": galaxy.color } as React.CSSProperties} onFocus={() => wakeRef.current()} onBlur={() => wakeRef.current()} onPointerEnter={() => { galaxyHover.current = index; wakeRef.current(); }} onPointerLeave={() => { galaxyHover.current = -1; wakeRef.current(); }} onClick={() => { galaxyHover.current = -1; setViewZoom(0); onGalaxySelect(galaxy.id); }} aria-label={`${language === "en" ? "Explore" : "Jelajahi"} ${galaxy.name[language]} ${language === "en" ? "galaxy" : "galaksi"}`}>
      <span className="galaxy-label-name">{galaxy.name[language]}<ArrowUpRight size={13} aria-hidden="true" /></span><small>{String(galaxy.count).padStart(2, "0")} {language === "en" ? "worlds" : "dunia"}</small>
    </button>)}
    {view === "orbit" && worlds.map((world, index) => <button
      ref={(element) => { labels.current[index] = element; }}
      key={world.id} type="button" className="planet-label"
      style={{ "--world-color": world.color } as React.CSSProperties}
      aria-pressed={activeId === world.id} onClick={() => { setViewZoom(.2); onSelect(world.id); }}>
      <span />{world.name}
    </button>)}
  </div>;
}
