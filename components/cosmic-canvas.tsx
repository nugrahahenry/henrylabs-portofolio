"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { createProjectSculpture } from "./project-sculptures";

export type ProjectId = "catmoji" | "nalira" | "canox" | "hengs" | "polara";
export type TechOrbitItem = { label: string; slug: string; color: string; projectIds: readonly ProjectId[] };

export const projectWorlds = [
  { id: "catmoji", name: "Catmoji", x: -3.2, y: 1.15, z: .2, color: "#ef8e73", logo: "catmoji.png" },
  { id: "nalira", name: "Nalira", x: 2.25, y: 1.3, z: -.7, color: "#78cdbb", logo: "nalira.svg" },
  { id: "canox", name: "Canox", x: 3.15, y: -.85, z: .2, color: "#8ea2d5", logo: "canox.png" },
  { id: "hengs", name: "Hengs", x: -2.1, y: -1.6, z: -.5, color: "#ebcd89", logo: "hengs.png" },
  { id: "polara", name: "Polara", x: .85, y: -1.7, z: .6, color: "#d5a7c8", logo: "polara.png" },
] as const;

const worlds = projectWorlds;

const orbitPhases = [130, 60, 0, 210, 300].map(THREE.MathUtils.degToRad);

function planetTexture(color: string) {
  const surface = document.createElement("canvas");
  surface.width = 256;
  surface.height = 128;
  const context = surface.getContext("2d")!;
  context.fillStyle = color;
  context.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y++) {
    context.fillStyle = `rgba(24,20,24,${.08 + Math.sin(y * .4) * .065 + Math.cos(y * .87) * .025})`;
    context.fillRect(0, y, 256, 1);
  }
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function planetSurfaceTexture(image: HTMLImageElement, color: string) {
  const surface = document.createElement("canvas");
  surface.width = 768;
  surface.height = 384;
  const context = surface.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, 768, 384);
  gradient.addColorStop(0, color);
  gradient.addColorStop(.5, "#151a3a");
  gradient.addColorStop(1, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 768, 384);
  for (let y = 28; y < 384; y += 24) {
    context.fillStyle = `rgba(255,255,255,${.035 + Math.sin(y * .11) * .02})`;
    context.fillRect(0, y, 768, 6);
  }

  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const drawLogo = (centerX: number, centerY: number, size: number, opacity: number, rotation: number) => {
    context.save();
    context.globalAlpha = opacity;
    context.translate(centerX, centerY);
    context.rotate(rotation);
    const glow = context.createRadialGradient(-size * .18, -size * .2, size * .08, 0, 0, size * .66);
    glow.addColorStop(0, "rgba(255,255,255,.95)");
    glow.addColorStop(.42, color);
    glow.addColorStop(1, "rgba(7,9,27,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, size * .67, 0, Math.PI * 2);
    context.fill();
    const frame = size * .84;
    context.beginPath();
    context.roundRect(-frame / 2, -frame / 2, frame, frame, size * .12);
    context.clip();
    const scale = Math.min(size / imageWidth, size / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    context.drawImage(image, -width / 2, -height / 2, width, height);
    context.restore();
    context.strokeStyle = `rgba(244,245,239,${Math.min(.8, opacity)})`;
    context.lineWidth = 2.5;
    context.beginPath();
    context.roundRect(centerX - frame / 2, centerY - frame / 2, frame, frame, size * .12);
    context.stroke();
  };

  // Repeat the real mark across longitudes and latitudes so the sphere keeps its identity while tumbling.
  drawLogo(384, 192, 174, 1, 0);
  drawLogo(128, 104, 112, .62, -.12);
  drawLogo(640, 104, 112, .62, .12);
  drawLogo(128, 286, 96, .46, .1);
  drawLogo(640, 286, 96, .46, -.1);
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
  const surface = document.createElement("canvas");
  surface.width = 512;
  surface.height = 256;
  const context = surface.getContext("2d")!;
  const color = `#${item.color}`;
  const gradient = context.createLinearGradient(0, 0, 512, 256);
  gradient.addColorStop(0, "#080c23");
  gradient.addColorStop(.24, color);
  gradient.addColorStop(.5, "rgba(244,245,239,.48)");
  gradient.addColorStop(.76, color);
  gradient.addColorStop(1, "#080c23");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);
  for (let y = 21; y < 256; y += 22) {
    context.fillStyle = `rgba(244,245,239,${.05 + Math.sin(y * .19) * .02})`;
    context.fillRect(0, y, 512, 5);
  }
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
  return { texture, paintLogo };
}

export function CosmicCanvas({ activeId, onSelect, onPrevious, onNext, motionOn, progress, techNodes }: {
  activeId: ProjectId;
  onSelect: (id: ProjectId) => void;
  onPrevious: () => void;
  onNext: () => void;
  motionOn: boolean;
  progress: MotionValue<number>;
  techNodes: readonly TechOrbitItem[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labels = useRef<Array<HTMLButtonElement | null>>([]);
  const selectRef = useRef(onSelect);
  const state = useRef({ activeId, motionOn });
  const wakeRef = useRef<() => void>(() => {});
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    state.current = { activeId, motionOn };
    wakeRef.current();
  }, [activeId, motionOn]);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    const system = new THREE.Group();
    scene.add(system);
    scene.add(new THREE.AmbientLight(0xd8ebec, 2));
    const sunlight = new THREE.PointLight(0xffe8bc, 24, 25, 1.2);
    sunlight.position.set(-1.5, 3, 5);
    scene.add(sunlight);
    const fill = new THREE.DirectionalLight(0xb4d9dc, 2);
    fill.position.set(3, -1, 3);
    scene.add(fill);

    const starPositions = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      starPositions[i * 3] = Math.sin(i * 127.1) * 14;
      starPositions[i * 3 + 1] = Math.cos(i * 311.7) * 9;
      starPositions[i * 3 + 2] = -4 - (i % 19) * .4;
    }
    const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(starPositions, 3)), new THREE.PointsMaterial({ color: 0xcce2df, size: .019, transparent: true, opacity: .65 }));
    scene.add(stars);
    [2.3, 3.5, 4.5].forEach((radius, i) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius * .59, 0, Math.PI * 2, false, -.2);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(180));
      const orbit = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: i === 1 ? 0xe3b889 : 0x86c8c7, transparent: true, opacity: .18 }));
      orbit.rotation.set(.4, -.1, i * .25);
      system.add(orbit);
    });

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const textures: THREE.Texture[] = [];
    let disposed = false;
    const planets = worlds.map((world, index) => {
      const group = new THREE.Group();
      group.position.set(world.x, world.y, world.z);
      const texture = planetTexture(world.color);
      textures.push(texture);
      const radius = .37 + index * .02;
      const sphereMaterial = new THREE.MeshStandardMaterial({ map: texture, color: "#ffffff", metalness: .08, roughness: .72, transparent: true, opacity: .2 });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), sphereMaterial);
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.08, 32, 20),
        new THREE.MeshBasicMaterial({ color: world.color, transparent: true, opacity: .14, side: THREE.BackSide, blending: THREE.AdditiveBlending }),
      );
      const logoHalo = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.18, .012, 8, 72),
        new THREE.MeshBasicMaterial({ color: world.color, transparent: true, opacity: .3, depthWrite: false }),
      );
      logoHalo.rotation.x = .35;
      const focusRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.42, .018, 8, 72),
        new THREE.MeshBasicMaterial({ color: world.color, transparent: true, opacity: 0, depthWrite: false }),
      );
      focusRing.rotation.set(.72, -.18, .25);
      const sculpture = createProjectSculpture(world.id);
      sculpture.scale.multiplyScalar(radius * 1.05);
      group.add(sphere, atmosphere, logoHalo, focusRing, sculpture);
      const logoTexture = loader.load(`/assets/brand/${world.logo}`, (loaded) => {
        const surfaceTexture = planetSurfaceTexture(loaded.image, world.color);
        logoTexture.dispose();
        if (disposed) surfaceTexture.dispose();
        else {
          textures.push(surfaceTexture);
          sphereMaterial.map = surfaceTexture;
          sphereMaterial.opacity = .15;
          sphereMaterial.needsUpdate = true;
          wakeRef.current();
        }
      });
      system.add(group);
      return { group, sphere, atmosphere, logoHalo, focusRing, sculpture };
    });
    const planetGroups: THREE.Object3D[] = planets.map(({ group }) => group);
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
      techTextures.push(texture);
      loader.load(`https://cdn.simpleicons.org/${item.slug}/${item.color}`, (loaded) => {
        if (!disposed) {
          techSurface.paintLogo(loaded.image);
          wakeRef.current();
        }
      }, undefined, () => {});
      const surface = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 12),
        new THREE.MeshStandardMaterial({ map: texture, color: "#ffffff", emissive: color, emissiveIntensity: .22, metalness: .14, roughness: .66, transparent: true, opacity: .82 }),
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
      const focusHalo = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.78, radius * .032, 5, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .04, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      focusHalo.rotation.set(.78 + lane * .16, .18 + index * .04, .24 + lane * .22);
      group.add(surface, atmosphere, ring, focusHalo);
      techSystem.add(group);
      const linkedProjectIndexes = item.projectIds.map((projectId) => projectWorlds.findIndex((world) => world.id === projectId)).filter((projectIndex) => projectIndex >= 0);
      return { group, surface, atmosphere, ring, focusHalo, radius, index, lane, linkedProjectIndexes };
    });
    const techOrbit = new THREE.Group();
    const techOrbitLanes = [1.08, 1.38, 1.7].map((radius, index) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius * (.62 + index * .05), 0, Math.PI * 2, false, index * .22);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(150));
      const lane = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: 0x78cdbb, transparent: true, opacity: 0, depthWrite: false }));
      lane.rotation.set(.54 + index * .18, index * .16, index * .2);
      techOrbit.add(lane);
      return lane;
    });
    system.add(techOrbit);
    const techSignalMaterial = new THREE.MeshBasicMaterial({ color: 0x78cdbb, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const techSignal = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 8), techSignalMaterial);
    techSignal.renderOrder = 2;
    techOrbit.add(techSignal);
    // A spanning path keeps every world connected without turning the field into a wireframe.
    const networkPairs = [[0, 1], [1, 2], [2, 4], [4, 3]] as const;
    const networkPositions = new Float32Array(networkPairs.length * 6);
    const networkGeometry = new THREE.BufferGeometry();
    networkGeometry.setAttribute("position", new THREE.BufferAttribute(networkPositions, 3));
    const networkMaterial = new THREE.LineBasicMaterial({ color: 0x74dfe2, transparent: true, opacity: .15, depthWrite: false });
    const network = new THREE.LineSegments(networkGeometry, networkMaterial);
    network.renderOrder = 1;
    system.add(network);
    const signalMaterial = new THREE.MeshBasicMaterial({ color: 0xffd46d, transparent: true, opacity: .9 });
    const signal = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 10), signalMaterial);
    signal.renderOrder = 2;
    system.add(signal);
    const networkStart = new THREE.Vector3();
    const networkEnd = new THREE.Vector3();
    const updateNetwork = () => {
      networkPairs.forEach(([start, end], index) => {
        const from = planets[start].group.position;
        const to = planets[end].group.position;
        networkPositions.set([from.x, from.y, from.z, to.x, to.y, to.z], index * 6);
      });
      networkGeometry.attributes.position.needsUpdate = true;
    };

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
    const projected = new THREE.Vector3();
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const findPlanetAt = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(planetGroups, true)[0];
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
      const zoom = state.current.motionOn ? THREE.MathUtils.smoothstep(progress.get(), .24, .65) : 1;
      techSystem.visible = true;
      const portrait = camera.aspect < .9;
      const halfWidth = portrait ? 3.1 : 4.7;
      const fittedDistance = Math.max(10.5, halfWidth / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      camera.position.set(0, .05, fittedDistance + (1 - zoom) * 5);
      if (state.current.motionOn && !dragging) angle += dt * .055;
      // Orbit positions in a shallow ellipse, keeping the field readable at every angle.
      system.rotation.y = Math.sin(elapsed * .12) * .08;
      system.rotation.x = pitch + Math.sin(elapsed * .09) * .018;
      planets.forEach(({ group, sphere, atmosphere, logoHalo, focusRing, sculpture }, index) => {
        const selected = worlds[index].id === state.current.activeId;
        const scale = selected ? 2.25 : .94;
        group.scale.setScalar(state.current.motionOn ? THREE.MathUtils.damp(group.scale.x, scale, 7, dt) : scale);
        const phase = orbitPhases[index] + angle;
        const orbitX = Math.cos(phase) * (portrait ? 1.95 : 3.35);
        const orbitY = Math.sin(phase) * 1.45;
        const orbitZ = Math.sin(phase) * .55;
        const safeOrbitX = portrait ? orbitX : Math.min(orbitX, 1.2);
        // The dossier owns the right rail on landscape layouts; give the focused world a clear visual bay beside it.
        const targetX = selected ? (portrait ? 0 : -.58) : safeOrbitX;
        const targetY = selected ? .2 : orbitY;
        const targetZ = selected ? 2.1 : orbitZ;
        if (state.current.motionOn) {
          group.position.x = THREE.MathUtils.damp(group.position.x, targetX, 6, dt);
          group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 6, dt);
          group.position.z = THREE.MathUtils.damp(group.position.z, targetZ, 6, dt);
        } else {
          group.position.set(targetX, targetY, targetZ);
        }
        sphere.rotation.y = -system.rotation.y + index * .12 + elapsed * .08;
        sphere.rotation.x = Math.sin(elapsed * .18 + index) * .035;
        sculpture.rotation.y = elapsed * (.11 + index * .008) + angle * .22;
        sculpture.rotation.x = Math.sin(elapsed * .16 + index) * .04;
        atmosphere.rotation.y = -elapsed * .05;
        atmosphere.material.opacity = selected ? .2 : .12;
        logoHalo.rotation.z = elapsed * (state.current.motionOn ? .08 : 0);
        const focusMaterial = focusRing.material as THREE.MeshBasicMaterial;
        const targetOpacity = selected ? .76 : .035;
        focusMaterial.opacity = state.current.motionOn ? THREE.MathUtils.damp(focusMaterial.opacity, targetOpacity, 8, dt) : targetOpacity;
        focusRing.rotation.z = elapsed * (state.current.motionOn ? (selected ? .18 : -.035) : 0);
        focusRing.scale.setScalar(state.current.motionOn && selected ? 1 + Math.sin(elapsed * 2.4 + index) * .045 : 1);
      });
      techSystem.rotation.y = pitch * .06 + Math.sin(elapsed * .04) * .025;
      techSystem.rotation.x = Math.sin(elapsed * .1) * .045;
      techSystem.rotation.z = Math.sin(elapsed * .08) * .025;
      const selectedProjectIndex = projectWorlds.findIndex((world) => world.id === state.current.activeId);
      const selectedPlanetPosition = selectedProjectIndex >= 0 ? planets[selectedProjectIndex].group.position : new THREE.Vector3();
      techOrbit.position.copy(selectedPlanetPosition);
      techOrbit.visible = selectedProjectIndex >= 0;
      const activeTechPlanets = techPlanets.filter(({ linkedProjectIndexes }) => linkedProjectIndexes.includes(selectedProjectIndex));
      const activeLanes = new Set(activeTechPlanets.map(({ lane }) => lane));
      techOrbitLanes.forEach((lane, index) => {
        const material = lane.material as THREE.LineBasicMaterial;
        material.color.set(projectWorlds[selectedProjectIndex]?.color ?? "#78cdbb");
        const laneFocus = activeLanes.has(index) ? .1 : 0;
        material.opacity = state.current.motionOn ? .1 + laneFocus + (index === 1 ? .04 : 0) + Math.sin(elapsed * .8 + index) * .018 : .16 + laneFocus;
        lane.scale.setScalar(1 + (state.current.motionOn ? Math.sin(elapsed * .65 + index) * .025 : 0));
      });
      techSignal.visible = activeTechPlanets.length > 0;
      techSignalMaterial.color.set(projectWorlds[selectedProjectIndex]?.color ?? "#78cdbb");
      techSignalMaterial.opacity = state.current.motionOn ? .55 + Math.sin(elapsed * 2.4) * .16 : .55;
      if (activeTechPlanets.length > 0) {
        const signalLane = activeTechPlanets[Math.floor(elapsed * .35) % activeTechPlanets.length]?.lane ?? 0;
        const signalPhase = elapsed * (.22 + signalLane * .03);
        const signalRadius = 1.08 + signalLane * .3;
        techSignal.position.set(Math.cos(signalPhase) * signalRadius, Math.sin(signalPhase) * signalRadius * (.62 + signalLane * .05), Math.sin(signalPhase * 1.08) * (.2 + signalLane * .05));
      }
      techPlanets.forEach(({ group, surface, atmosphere, ring, focusHalo, radius, index, lane, linkedProjectIndexes }) => {
        const anchorIndex = linkedProjectIndexes.includes(selectedProjectIndex) ? selectedProjectIndex : linkedProjectIndexes[0] ?? -1;
        const belongsToProject = anchorIndex >= 0;
        const isActiveProjectTool = linkedProjectIndexes.includes(selectedProjectIndex);
        const anchorRadius = belongsToProject ? (.37 + anchorIndex * .02) * (anchorIndex === selectedProjectIndex ? 2.25 : .94) : 0;
        const radiusPath = belongsToProject ? anchorRadius + (anchorIndex === selectedProjectIndex ? .48 + lane * .2 : .24 + lane * .1) + (index % 4) * .035 : 2.55 + lane * .16;
        const phase = index * 2.37 + angle * (.18 + lane * .03) + elapsed * (.018 + lane * .006);
        const anchor = belongsToProject ? planets[anchorIndex].group.position : { x: 0, y: -.25, z: -1.05 };
        const orbitX = Math.cos(phase) * radiusPath;
        const techRailCap = !portrait && anchorIndex === selectedProjectIndex ? .68 : 1.55;
        const safeOrbitX = portrait ? orbitX : Math.min(orbitX, techRailCap);
        const targetX = anchor.x + safeOrbitX;
        const targetY = anchor.y + Math.sin(phase) * radiusPath * (.7 + lane * .05);
        const targetZ = anchor.z + Math.sin(phase * 1.08) * (.24 + lane * .08);
        if (state.current.motionOn) {
          group.position.x = THREE.MathUtils.damp(group.position.x, targetX, 7, dt);
          group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 7, dt);
          group.position.z = THREE.MathUtils.damp(group.position.z, targetZ, 7, dt);
        } else {
          group.position.set(targetX, targetY, targetZ);
        }
        group.rotation.y = elapsed * (.16 + lane * .04) + index;
        const pulse = state.current.motionOn ? 1 + Math.sin(elapsed * 1.7 + index) * .05 : 1;
        group.scale.setScalar(pulse * (isActiveProjectTool ? 1.2 : belongsToProject ? .96 : .72));
        const surfaceMaterial = surface.material as THREE.MeshStandardMaterial;
        surfaceMaterial.opacity = isActiveProjectTool ? .98 : belongsToProject ? .68 : .24;
        surfaceMaterial.emissiveIntensity = isActiveProjectTool ? .42 : belongsToProject ? .24 : .12;
        surface.scale.setScalar(1);
        atmosphere.material.opacity = (isActiveProjectTool ? .24 : belongsToProject ? .13 : .045) + (state.current.motionOn ? Math.sin(elapsed * .8 + index) * .025 : 0);
        (ring.material as THREE.MeshBasicMaterial).opacity = isActiveProjectTool ? .64 : belongsToProject ? .26 : .07;
        ring.rotation.z = .24 + lane * .22 + elapsed * (.12 + lane * .035);
        const focusMaterial = focusHalo.material as THREE.MeshBasicMaterial;
        const focusOpacity = isActiveProjectTool ? .76 : belongsToProject ? .11 : .025;
        focusMaterial.opacity = state.current.motionOn ? THREE.MathUtils.damp(focusMaterial.opacity, focusOpacity, 8, dt) : focusOpacity;
        focusHalo.rotation.z = .24 + lane * .22 - elapsed * (.16 + lane * .035);
        focusHalo.scale.setScalar(isActiveProjectTool && state.current.motionOn ? 1 + Math.sin(elapsed * 2.1 + index) * .08 : 1);
      });
      updateNetwork();
      const signalProgress = (elapsed * .42) % networkPairs.length;
      const signalPair = Math.floor(signalProgress);
      const signalT = signalProgress - signalPair;
      const [signalStart, signalEnd] = networkPairs[signalPair];
      networkStart.copy(planets[signalStart].group.position);
      networkEnd.copy(planets[signalEnd].group.position);
      signal.position.lerpVectors(networkStart, networkEnd, signalT);
      signalMaterial.opacity = state.current.motionOn ? .78 + Math.sin(elapsed * 3.2) * .16 : .78;
      renderer.render(scene, camera);
      planets.forEach(({ group }, index) => {
        group.getWorldPosition(projected);
        projected.project(camera);
        const label = labels.current[index];
        const radiusPixels = (.37 + index * .02) * group.scale.x * host.clientHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z);
        if (label) label.style.transform = `translate(-50%, 0) translate(${(projected.x * .5 + .5) * host.clientWidth}px, ${(-projected.y * .5 + .5) * host.clientHeight + radiusPixels + 8}px)`;
      });
      host.dataset.ready = "true";
      host.dataset.time = elapsed.toFixed(2);
      host.dataset.angle = angle.toFixed(3);
      host.dataset.pitch = pitch.toFixed(3);
      host.dataset.techCount = String(techNodes.length);
      host.dataset.linkedTechCount = String(techPlanets.filter(({ linkedProjectIndexes }) => linkedProjectIndexes.includes(selectedProjectIndex)).length);
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
      if (!dragging) return;
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 6) pointerMoved = true;
      angle += (event.clientX - lastX) * .006;
      pitch += (event.clientY - lastY) * .006;
      lastX = event.clientX;
      lastY = event.clientY;
      wake();
    };
    const up = (event: PointerEvent) => {
      if (!dragging) return;
      if (!pointerMoved && pressedPlanet >= 0) selectRef.current(worlds[pressedPlanet].id);
      dragging = false;
      pointerMoved = false;
      pressedPlanet = -1;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const cancel = () => { dragging = false; pointerMoved = false; pressedPlanet = -1; };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    const contextLost = (event: Event) => { event.preventDefault(); setFallback(true); cancelAnimationFrame(frame); };
    canvas.addEventListener("webglcontextlost", contextLost);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); });
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
      canvas.removeEventListener("webglcontextlost", contextLost);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose());
      });
      textures.forEach((texture) => texture.dispose());
      techTextures.forEach((texture) => texture.dispose());
      networkGeometry.dispose();
      networkMaterial.dispose();
      signal.geometry.dispose();
      signalMaterial.dispose();
      techSignal.geometry.dispose();
      techSignalMaterial.dispose();
      renderer.dispose();
      wakeRef.current = () => {};
    };
  }, [progress]);

  return <div ref={hostRef} className={`cosmic-canvas${fallback ? " canvas-fallback" : ""}`} role="group" tabIndex={0} aria-label="Project orbit" onKeyDown={(event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); onPrevious(); }
    if (event.key === "ArrowRight") { event.preventDefault(); onNext(); }
  }}>
    <canvas aria-hidden="true" />
    {worlds.map((world, index) => <button
      ref={(element) => { labels.current[index] = element; }}
      key={world.id} type="button" className="planet-label"
      style={{ "--world-color": world.color } as React.CSSProperties}
      aria-pressed={activeId === world.id} onClick={() => onSelect(world.id)}>
      <span />{world.name}
    </button>)}
  </div>;
}
