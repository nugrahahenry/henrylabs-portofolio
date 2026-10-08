"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import type { TechOrbitItem } from "./cosmic-canvas";

type Props = {
  items: readonly TechOrbitItem[];
  nodes: RefObject<(HTMLButtonElement | null)[]>;
  paused: RefObject<boolean>;
  progress: MotionValue<number>;
  selected: string;
};

// The portrait stays in HTML; its alpha is a depth-only matte for passing satellites.
export function MakerOrbitField({ items, nodes, paused, progress, selected }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const active = useRef(selected);
  const phase = useRef(0);
  active.current = selected;
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
    const geometry = new THREE.SphereGeometry(1, 28, 20);
    const cap = new THREE.SphereGeometry(1.008, 24, 16, Math.PI * .28, Math.PI * .44, Math.PI * .28, Math.PI * .44);
    const planets = items.map(item => {
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
      return { group, material, logoMaterial };
    });
    const matteMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, alphaTest: .1 });
    const matte = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matteMaterial);
    matte.renderOrder = -1; matte.visible = false; scene.add(matte);
    const mask = new THREE.TextureLoader().load("/assets/portrait/henry-cosmic-560.webp", texture => {
      if (disposed) { texture.dispose(); return; }
      matteMaterial.map = texture; matteMaterial.needsUpdate = true; matte.visible = true;
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
      const retreat = THREE.MathUtils.smoothstep(progress.get(), .36, .53);
      if (!paused.current && retreat < 1) phase.current += dt * .14;
      const radius = Math.min(width * .39, width / 2 - 38, 560);
      const depthRadius = Math.min(190, width * .23);
      const verticalBias = height * (width < 600 ? .01 : .045);
      const controlClearance = (silhouette.bottom + 12 - 70 - height / 2) / (1200 / (1200 - depthRadius)) - verticalBias;
      const verticalRadius = Math.max(25, Math.min(width < 600 ? 70 : 125, height * .17, controlClearance));
      let front = 0, back = 0;
      planets.forEach((planet, index) => {
        const lane = items.length > 8 && index % 2 ? .79 : 1;
        const theta = index / items.length * Math.PI * 2 + phase.current;
        const depth = Math.sin(theta) * depthRadius;
        planet.group.position.set(Math.cos(theta) * radius * lane * (1 + retreat * .55), -verticalBias - Math.sin(theta) * verticalRadius * lane, depth - retreat * 300);
        planet.group.scale.setScalar((width < 600 ? 22 : 30) * (active.current === items[index].label ? 1.1 : 1));
        planet.group.rotation.set(Math.sin(theta) * .08, Math.sin(theta + .4) * .25, Math.cos(theta) * .12);
        planet.material.opacity = 1 - retreat; planet.logoMaterial.opacity = 1 - retreat;
        projected.copy(planet.group.position).project(camera);
        const node = nodes.current[index];
        if (node) {
          const x = (projected.x * .5 + .5) * width, y = (-projected.y * .5 + .5) * height;
          node.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) scale(${(1200 / (1200 - planet.group.position.z)).toFixed(3)})`;
          node.dataset.depth = depth.toFixed(2);
          node.dataset.side = depth > 0 ? "front" : "back";
          node.dataset.occluded = String(depth < 0 && x > silhouette.left && x < silhouette.right && y > silhouette.top && y < silhouette.bottom);
        }
        if (depth > 0) front++; else back++;
      });
      if (!lost) renderer?.render(scene, camera);
      parent.dataset.webgl = String(!!renderer && !lost);
      element.dataset.ready = "true";
      element.dataset.phase = phase.current.toFixed(4);
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
    resize(); wake();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); unsubscribe();
      canvas.removeEventListener("webglcontextlost", contextLost); document.removeEventListener("visibilitychange", wake);
      sources.forEach(image => { image.onload = null; });
      planets.forEach(planet => { planet.material.dispose(); planet.logoMaterial.dispose(); });
      geometry.dispose(); cap.dispose(); matte.geometry.dispose(); matteMaterial.dispose(); textures.forEach(texture => texture.dispose());
      if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
      canvas.remove();
      delete parent.dataset.webgl;
    };
  }, [items, nodes, paused, progress]);
  return <div ref={host} className="maker-orbit-field" aria-hidden="true" />;
}
