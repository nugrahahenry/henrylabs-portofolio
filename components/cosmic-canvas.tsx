"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";

export type ProjectId = "catmoji" | "nalira" | "canox" | "hengs" | "polara";

const worlds = [
  { id: "catmoji", name: "Catmoji", x: -3.2, y: 1.15, z: .2, color: "#ef8e73", logo: "catmoji.png" },
  { id: "nalira", name: "Nalira", x: 2.25, y: 1.3, z: -.7, color: "#78cdbb", logo: "nalira.svg" },
  { id: "canox", name: "Canox", x: 3.15, y: -.85, z: .2, color: "#8ea2d5", logo: "canox.png" },
  { id: "hengs", name: "Hengs", x: -2.1, y: -1.6, z: -.5, color: "#ebcd89", logo: "hengs.png" },
  { id: "polara", name: "Polara", x: .85, y: -1.7, z: .6, color: "#d5a7c8", logo: "polara.png" },
] as const;

const portraitPositions = [[-1.7, 1.9], [1.65, 1.55], [1.8, -.9], [-1.8, -.6], [.15, -2.1]];

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

export function CosmicCanvas({ activeId, onSelect, motionOn, progress }: {
  activeId: ProjectId;
  onSelect: (id: ProjectId) => void;
  motionOn: boolean;
  progress: MotionValue<number>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labels = useRef<Array<HTMLButtonElement | null>>([]);
  const state = useRef({ activeId, motionOn });
  const wakeRef = useRef<() => void>(() => {});
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    state.current = { activeId, motionOn };
    wakeRef.current();
  }, [activeId, motionOn]);

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
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(.37 + index * .02, 40, 24), new THREE.MeshStandardMaterial({ map: texture, roughness: .8 }));
      group.add(sphere);
      const logoTexture = loader.load(`/assets/brand/${world.logo}`, (loaded) => {
        if (disposed) loaded.dispose();
        else wakeRef.current();
      });
      logoTexture.colorSpace = THREE.SRGBColorSpace;
      textures.push(logoTexture);
      const logo = new THREE.Sprite(new THREE.SpriteMaterial({ map: logoTexture, depthTest: false }));
      logo.scale.set(.35, .35, 1);
      logo.position.set(0, .03, .5);
      group.add(logo);
      system.add(group);
      return { group, sphere };
    });

    let visible = true;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let dragging = false;
    let lastX = 0;
    let angle = 0;
    const projected = new THREE.Vector3();
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
      system.rotation.y = angle + (state.current.motionOn ? Math.sin(elapsed * .12) * .08 : 0);
      core.rotation.y = elapsed * .075;
      planets.forEach(({ group, sphere }, index) => {
        const selected = worlds[index].id === state.current.activeId;
        const scale = selected ? 1.25 : .94;
        group.scale.setScalar(state.current.motionOn ? THREE.MathUtils.damp(group.scale.x, scale, 7, dt) : scale);
        group.position.x = portrait ? portraitPositions[index][0] : worlds[index].x;
        group.position.y = (portrait ? portraitPositions[index][1] : worlds[index].y) + Math.sin(elapsed * .45 + index) * .06;
        sphere.rotation.y = elapsed * .13;
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
      if ((event.target as HTMLElement).closest("button")) return;
      dragging = true;
      lastX = event.clientX;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      angle = THREE.MathUtils.clamp(angle + (event.clientX - lastX) * .003, -.5, .5);
      lastX = event.clientX;
      wake();
    };
    const up = () => { dragging = false; };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
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
      canvas.removeEventListener("pointercancel", up);
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

  return <div ref={hostRef} className={`cosmic-canvas${fallback ? " canvas-fallback" : ""}`}>
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
