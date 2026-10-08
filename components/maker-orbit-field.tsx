"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import type { TechOrbitItem } from "./cosmic-canvas";
import { orbitTechNodes } from "@/content/technologies";
import { advanceMakerRotation, portraitCoversSatellite, MAKER_RETREAT_START, MAKER_PROOF_START, type OrbitRotation, type PortraitAlpha } from "./maker-motion";

type Props = {
  items: readonly TechOrbitItem[];
  nodes: RefObject<(HTMLButtonElement | null)[]>;
  paused: RefObject<boolean>;
  rotation: RefObject<OrbitRotation>;
  progress: MotionValue<number>;
  selected: string;
};

// The portrait stays in HTML; its alpha is a depth-only matte for passing satellites.
export function MakerOrbitField({ items, nodes, paused, rotation, progress, selected }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ items, selected });
  state.current = { items, selected };
  useEffect(() => {
    const element = host.current!;
    const parent = element.closest<HTMLElement>(".maker-scene")!;
    const portrait = parent.querySelector<HTMLElement>(".portrait-reveal")!;
    const canvas = document.createElement("canvas"); element.append(canvas);
    let renderer: THREE.WebGLRenderer | undefined;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power", preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    } catch { /* Semantic orbit buttons retain their own icons without WebGL. */ }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 2400);
    camera.position.z = 1200;
    scene.add(new THREE.HemisphereLight(0xc9eaff, 0x192337, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-350, 400, 600); scene.add(light);
    const rim = new THREE.DirectionalLight(0xffdb9c, 2);
    rim.position.set(400, -80, -100); scene.add(rim);
    const textures: THREE.Texture[] = [];
    const sources: HTMLImageElement[] = [];
    let disposed = false, lost = false, frame = 0, last = 0, width = 0, height = 0;
    const silhouette = { left: 0, right: 0, top: 0, bottom: 0 };
    let alphaMask: PortraitAlpha | undefined;
    const geometry = new THREE.SphereGeometry(1, 28, 20);
    const cap = new THREE.SphereGeometry(1.008, 24, 16, Math.PI * .28, Math.PI * .44, Math.PI * .28, Math.PI * .44);
    const planets = orbitTechNodes.map(item => {
      const group = new THREE.Group();
      const material = new THREE.MeshPhysicalMaterial({ color: `#${item.color}`, metalness: .4, roughness: .3, clearcoat: 1, transparent: true });
      const body = new THREE.Mesh(geometry, material);
      const surface = document.createElement("canvas"); surface.width = surface.height = 128;
      const ctx = surface.getContext("2d")!;
      ctx.fillStyle = "#fff"; ctx.font = "bold 42px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const initials: Record<string, string> = { JavaScript: "JS", TypeScript: "TS", "Next.js": "N", "Node.js": "NJ", "C#": "C#" };
      ctx.fillText(initials[item.label] ?? item.label.slice(0, 2), 64, 65);
      const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      const logoMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
      const logo = new THREE.Mesh(cap, logoMaterial);
      group.add(body, logo); scene.add(group);
      const image = new Image(); image.crossOrigin = "anonymous";
      image.onload = () => { if (disposed) return; ctx.clearRect(0, 0, 128, 128); ctx.drawImage(image, 16, 16, 96, 96); texture.needsUpdate = true; };
      image.src = `https://cdn.simpleicons.org/${item.slug}/ffffff`; sources.push(image);
      return { group, material, logoMaterial, label: item.label, presence: 0, theta: 0 };
    });
    const matteMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, alphaTest: .1 });
    const matte = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matteMaterial);
    matte.renderOrder = -1; matte.visible = false; scene.add(matte);
    const mask = new THREE.TextureLoader().load("/assets/portrait/henry-cosmic-560.webp", texture => {
      if (disposed) { texture.dispose(); return; }
      matteMaterial.map = texture; matteMaterial.needsUpdate = true; matte.visible = true;
      const sample = document.createElement("canvas"); sample.width = 224; sample.height = 280;
      const ctx = sample.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(texture.image, 0, 0, sample.width, sample.height);
      alphaMask = { data: ctx.getImageData(0, 0, sample.width, sample.height).data, width: sample.width, height: sample.height };
    }); textures.push(mask);
    const projected = new THREE.Vector3();
    const resize = () => {
      const box = parent.getBoundingClientRect(), figure = portrait.getBoundingClientRect();
      width = box.width; height = box.height;
      camera.aspect = width / Math.max(1, height);
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / 2400)); camera.updateProjectionMatrix();
      renderer?.setSize(width, height, false);
      matte.position.set(figure.left - box.left + figure.width / 2 - width / 2, height / 2 - (figure.top - box.top + figure.height / 2), 0);
      matte.scale.set(figure.width, figure.height, 1);
      silhouette.left = figure.left - box.left; silhouette.right = silhouette.left + figure.width;
      silhouette.top = figure.top - box.top; silhouette.bottom = silhouette.top + figure.height;
    };
    const render = (time: number) => {
      frame = 0;
      if (disposed || document.hidden) { last = 0; return; }
      const dt = Math.min(.05, (time - (last || time)) / 1000); last = time;
      const retreat = THREE.MathUtils.smoothstep(progress.get(), MAKER_RETREAT_START, MAKER_PROOF_START);
      if (retreat < 1) advanceMakerRotation(rotation.current, dt, paused.current);
      const { items, selected } = state.current;
      const all = items.length > 16;
      const radius = Math.min(width * .39, width / 2 - 38, 560);
      const depthRadius = Math.min(190, width * .23);
      const verticalBias = height * (all ? -.065 : width < 600 ? .01 : .045);
      const controlClearance = (silhouette.bottom + 12 - 70 - height / 2) / (1200 / (1200 - depthRadius)) - verticalBias;
      const verticalRadius = Math.max(25, Math.min(all ? 170 : width < 600 ? 70 : 125, height * .22, controlClearance));
      let front = 0, back = 0;
      planets.forEach(planet => {
        const index = items.findIndex(item => item.label === planet.label);
        planet.presence = THREE.MathUtils.damp(planet.presence, index < 0 ? 0 : 1, 12, dt);
        planet.group.visible = planet.presence > .01;
        if (!planet.group.visible) return;
        const laneIndex = all ? Math.max(0, index) % 3 : 0;
        const lane = all ? 1 - laneIndex * .10 : items.length > 8 && index % 2 ? .79 : 1;
        if (index >= 0) {
          const count = all ? Math.ceil((items.length - laneIndex) / 3) : items.length;
          const slot = all ? Math.floor(index / 3) : index;
          const target = slot / count * Math.PI * 2 + laneIndex * .6;
          planet.theta += Math.atan2(Math.sin(target - planet.theta), Math.cos(target - planet.theta)) * (1 - Math.exp(-dt * 9));
        }
        const theta = planet.theta + rotation.current.angle;
        const depth = Math.sin(theta) * depthRadius;
        const orbitY = all ? Math.sin(theta) * verticalRadius * .38 + (laneIndex - 1) * verticalRadius * .6 : Math.sin(theta) * verticalRadius * lane;
        planet.group.position.set(Math.cos(theta) * radius * lane * (1 + retreat * .55), -verticalBias - orbitY, depth - retreat * 300);
        const size = (width < 600 ? 22 : 30) * (all ? .84 : 1) * (selected === planet.label ? 1.1 : 1);
        planet.group.scale.setScalar(size * planet.presence);
        planet.group.rotation.set(Math.sin(theta) * .08, Math.sin(theta + .4) * .25, Math.cos(theta) * .12);
        planet.material.opacity = (1 - retreat) * planet.presence; planet.logoMaterial.opacity = planet.material.opacity;
        projected.copy(planet.group.position).project(camera);
        const node = index >= 0 ? nodes.current[index] : null;
        if (node) {
          const x = (projected.x * .5 + .5) * width, y = (-projected.y * .5 + .5) * height;
          node.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) scale(${(1200 / (1200 - planet.group.position.z)).toFixed(3)})`;
          node.dataset.depth = depth.toFixed(2);
          node.dataset.side = depth > 0 ? "front" : "back";
          node.style.zIndex = String(Math.round(depth + depthRadius));
          node.dataset.occluded = String(depth < 0 && portraitCoversSatellite(alphaMask, silhouette, x, y, size * 1200 / (1200 - depth)));
        }
        if (depth > 0) front++; else back++;
      });
      if (!lost) renderer?.render(scene, camera);
      parent.dataset.webgl = String(!!renderer && !lost);
      element.dataset.ready = "true";
      element.dataset.phase = rotation.current.angle.toFixed(4);
      element.dataset.velocity = rotation.current.velocity.toFixed(3);
      element.dataset.front = String(front); element.dataset.back = String(back);
      element.dataset.drawCalls = String(renderer?.info.render.calls ?? 0);
      element.dataset.retreat = retreat.toFixed(3);
      if (retreat < 1) frame = requestAnimationFrame(render);
    };
    const wake = () => { if (!frame && !disposed) frame = requestAnimationFrame(render); };
    const observer = new ResizeObserver(() => { resize(); wake(); }); observer.observe(parent); observer.observe(portrait);
    const contextLost = (event: Event) => { event.preventDefault(); lost = true; parent.dataset.webgl = "false"; wake(); };
    canvas.addEventListener("webglcontextlost", contextLost);
    document.addEventListener("visibilitychange", wake);
    const unsubscribe = progress.on("change", wake);
    let pointer: { id: number; x: number; y: number; lastX: number; lastTime: number } | undefined;
    let suppressClick = false;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || (event.target as Element).closest(".maker-tools-controls, .portrait-states, a")) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: event.timeStamp };
      suppressClick = false;
    };
    const move = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      if (!rotation.current.dragging) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { pointer = undefined; return; }
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        rotation.current.dragging = true; suppressClick = true;
        parent.setPointerCapture(event.pointerId); parent.dataset.dragging = "true";
      }
      const delta = (event.clientX - pointer.lastX) * .009;
      rotation.current.angle += delta;
      rotation.current.velocity = THREE.MathUtils.clamp(delta / Math.max(.016, (event.timeStamp - pointer.lastTime) / 1000), -5, 5);
      pointer.lastX = event.clientX; pointer.lastTime = event.timeStamp;
      event.preventDefault();
    };
    const up = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      if (event.type === "pointercancel") rotation.current.velocity = 0;
      if (event.timeStamp - pointer.lastTime > 100) rotation.current.velocity = 0;
      rotation.current.dragging = false; parent.dataset.dragging = "false";
      if (parent.hasPointerCapture(event.pointerId)) parent.releasePointerCapture(event.pointerId);
      pointer = undefined;
    };
    const click = (event: MouseEvent) => {
      if (suppressClick && event.detail > 0) { event.preventDefault(); event.stopPropagation(); }
      suppressClick = false;
    };
    parent.addEventListener("pointerdown", down);
    parent.addEventListener("pointermove", move);
    parent.addEventListener("pointerup", up);
    parent.addEventListener("pointercancel", up);
    parent.addEventListener("lostpointercapture", up);
    parent.addEventListener("click", click, true);
    resize(); wake();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); unsubscribe();
      canvas.removeEventListener("webglcontextlost", contextLost); document.removeEventListener("visibilitychange", wake);
      parent.removeEventListener("pointerdown", down); parent.removeEventListener("pointermove", move);
      parent.removeEventListener("pointerup", up); parent.removeEventListener("pointercancel", up);
      parent.removeEventListener("lostpointercapture", up); parent.removeEventListener("click", click, true);
      rotation.current.dragging = false; delete parent.dataset.dragging;
      sources.forEach(image => { image.onload = null; });
      planets.forEach(planet => { planet.material.dispose(); planet.logoMaterial.dispose(); });
      geometry.dispose(); cap.dispose(); matte.geometry.dispose(); matteMaterial.dispose(); textures.forEach(texture => texture.dispose());
      if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
      canvas.remove();
      delete parent.dataset.webgl;
      nodes.current.forEach(node => { if (node) { delete node.dataset.occluded; delete node.dataset.side; node.style.removeProperty("transform"); node.style.removeProperty("z-index"); } });
    };
  }, [nodes, paused, rotation, progress]);
  return <div ref={host} className="maker-orbit-field" aria-hidden="true" />;
}
