"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { createProjectSculpture } from "./project-sculptures";

export type ProjectId = "catmoji" | "nalira" | "canox" | "hengs" | "polara";

const worlds = [
  { id: "catmoji", name: "Catmoji", x: -3.2, y: 1.15, z: .2, color: "#ef8e73", logo: "catmoji.png" },
  { id: "nalira", name: "Nalira", x: 2.25, y: 1.3, z: -.7, color: "#78cdbb", logo: "nalira.svg" },
  { id: "canox", name: "Canox", x: 3.15, y: -.85, z: .2, color: "#8ea2d5", logo: "canox.png" },
  { id: "hengs", name: "Hengs", x: -2.1, y: -1.6, z: -.5, color: "#ebcd89", logo: "hengs.png" },
  { id: "polara", name: "Polara", x: .85, y: -1.7, z: .6, color: "#d5a7c8", logo: "polara.png" },
] as const;

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

export function CosmicCanvas({ activeId, onSelect, onPrevious, onNext, motionOn, progress }: {
  activeId: ProjectId;
  onSelect: (id: ProjectId) => void;
  onPrevious: () => void;
  onNext: () => void;
  motionOn: boolean;
  progress: MotionValue<number>;
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

    const coreTexture = planetTexture("#d9c7ac");
    const core = new THREE.Mesh(new THREE.SphereGeometry(.87, 64, 32), new THREE.MeshStandardMaterial({ map: coreTexture, roughness: .85 }));
    core.rotation.z = -.35;
    system.add(core);
    const rings = new THREE.Group();
    rings.rotation.set(1.15, -.12, -.3);
    [1.15, 1.27, 1.39, 1.46].forEach((r, i) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + .055, 120), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xc4b6a2 : 0xdbe6dc, side: THREE.DoubleSide, transparent: true, opacity: .55 - i * .08 }));
      rings.add(ring);
    });
    system.add(rings);

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
    const textures: THREE.Texture[] = [coreTexture];
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

    let visible = true;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let dragging = false;
    let pointerMoved = false;
    let pressedPlanet = -1;
    let lastX = 0;
    let startX = 0;
    let startY = 0;
    let angle = 0;
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
      const portrait = camera.aspect < .9;
      const halfWidth = portrait ? 3.1 : 4.7;
      const fittedDistance = Math.max(10.5, halfWidth / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      camera.position.set(0, .05, fittedDistance + (1 - zoom) * 5);
      if (state.current.motionOn && !dragging) angle += dt * .055;
      // Orbit positions in a shallow ellipse, keeping the field readable at every angle.
      system.rotation.y = Math.sin(elapsed * .12) * .08;
      core.rotation.y = elapsed * .075;
      const coreScale = state.current.motionOn ? THREE.MathUtils.damp(core.scale.x, .24, 6, dt) : .24;
      core.scale.setScalar(coreScale);
      rings.scale.setScalar(coreScale);
      planets.forEach(({ group, sphere, atmosphere, logoHalo, focusRing, sculpture }, index) => {
        const selected = worlds[index].id === state.current.activeId;
        const scale = selected ? 2 : .94;
        group.scale.setScalar(state.current.motionOn ? THREE.MathUtils.damp(group.scale.x, scale, 7, dt) : scale);
        const phase = orbitPhases[index] + angle;
        const orbitX = Math.cos(phase) * (portrait ? 1.95 : 3.35);
        const orbitY = Math.sin(phase) * 1.45;
        const orbitZ = Math.sin(phase) * .55;
        const targetX = selected ? 0 : orbitX;
        const targetY = selected ? .2 : orbitY;
        const targetZ = selected ? 1.85 : orbitZ;
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
      startX = event.clientX;
      startY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 6) pointerMoved = true;
      angle += (event.clientX - lastX) * .006;
      lastX = event.clientX;
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
