"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { projectWorlds, type ProjectId } from "./cosmic-canvas";

const projectColors: Record<ProjectId, number> = {
  catmoji: 0xef8e73,
  nalira: 0x78cdbb,
  canox: 0x8ea2d5,
  hengs: 0xebcd89,
  polara: 0xd5a7c8,
};

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,.9)");
  gradient.addColorStop(.16, "rgba(255,255,255,.34)");
  gradient.addColorStop(.48, "rgba(110,231,244,.1)");
  gradient.addColorStop(1, "rgba(110,231,244,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function WorldlineBackdrop({ activeId, motionOn, progress }: {
  activeId: ProjectId;
  motionOn: boolean;
  progress: MotionValue<number>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const state = useRef({ activeId, motionOn });
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    state.current = { activeId, motionOn };
    wakeRef.current();
  }, [activeId, motionOn]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = host?.querySelector("canvas");
    if (!host || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    } catch {
      host.dataset.fallback = "true";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, .1, 100);
    const field = new THREE.Group();
    const starField = new THREE.Group();
    const planetSystem = new THREE.Group();
    planetSystem.position.z = -3.2;
    scene.add(field, starField, planetSystem);
    scene.add(new THREE.AmbientLight(0x9fc4df, 1.15));
    const planetLight = new THREE.PointLight(0xffe5b2, 7, 18, 1.5);
    planetLight.position.set(-2.4, 2.8, 2.8);
    scene.add(planetLight);

    const starCount = 980;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starColor = new THREE.Color();
    const palette = ["#d9fbf4", "#6ee7f4", "#efc95f", "#ff82c8", "#9b8cff"];
    for (let i = 0; i < starCount; i++) {
      const arm = i % 3;
      const radius = 2.2 + ((i * 37) % 100) / 100 * 8.5;
      const phase = i * .73 + arm * 2.1;
      starPositions[i * 3] = Math.cos(phase) * radius;
      starPositions[i * 3 + 1] = Math.sin(phase * 1.13) * (1.8 + radius * .25);
      starPositions[i * 3 + 2] = -1.5 - (i % 17) * .48;
      starColor.set(palette[i % palette.length]);
      starColors.set([starColor.r, starColor.g, starColor.b], i * 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ vertexColors: true, size: .035, sizeAttenuation: true, transparent: true, opacity: .62, depthWrite: false }));
    starField.add(stars);

    const glowTexture = createGlowTexture();
    const haze = [
      { x: -3.6, y: 1.2, z: -5.8, scale: 5.8, color: 0x4366c7, opacity: .11 },
      { x: 3.8, y: -.2, z: -7.4, scale: 6.8, color: 0xd457a2, opacity: .1 },
      { x: -.8, y: -2.2, z: -9.2, scale: 5.4, color: 0x1fa5b2, opacity: .08 },
    ].map(({ x, y, z, scale, color, opacity }) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
      sprite.position.set(x, y, z);
      sprite.scale.set(scale, scale * .72, 1);
      field.add(sprite);
      return sprite;
    });
    const activeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: projectColors[activeId], transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false }));
    activeGlow.position.set(.8, .65, -3.8);
    activeGlow.scale.set(3.8, 3.8, 1);
    field.add(activeGlow);

    const lanes = [
      { radius: 2.2, yScale: .55, z: -3.2, color: 0x6ee7f4, opacity: .12, rotation: .28 },
      { radius: 3.6, yScale: .48, z: -4.2, color: 0xff82c8, opacity: .09, rotation: -.42 },
      { radius: 5, yScale: .36, z: -5.8, color: 0xefc95f, opacity: .08, rotation: .12 },
    ].map(({ radius, yScale, z, color, opacity, rotation }) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius * yScale, 0, Math.PI * 2, false, rotation);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(160));
      const line = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      line.position.z = z;
      line.rotation.x = .78;
      field.add(line);
      return line;
    });

    const planetLoader = new THREE.TextureLoader();
    const planetTextures: THREE.Texture[] = [];
    let disposed = false;
    const orbitPlanets = projectWorlds.map((world, index) => {
      const pivot = new THREE.Group();
      const body = new THREE.Group();
      const radius = .22 + (index % 2) * .028;
      const phase = [2.75, 1.4, .18, 4.2, 5.2][index];
      const surface = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 16),
        new THREE.MeshStandardMaterial({ color: world.color, emissive: world.color, emissiveIntensity: .2, metalness: .12, roughness: .62, transparent: true, opacity: .9 }),
      );
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.16, 20, 14),
        new THREE.MeshBasicMaterial({ color: world.color, transparent: true, opacity: .15, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.42, .008, 6, 36),
        new THREE.MeshBasicMaterial({ color: world.color, transparent: true, opacity: .25, depthWrite: false }),
      );
      ring.rotation.set(.72, -.2, .2);
      body.add(surface, atmosphere, ring);
      pivot.add(body);
      planetSystem.add(pivot);

      let logo: THREE.Sprite | undefined;
      planetLoader.load(`/assets/brand/${world.logo}`, (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = THREE.SRGBColorSpace;
        planetTextures.push(loaded);
        logo = new THREE.Sprite(new THREE.SpriteMaterial({ map: loaded, transparent: true, opacity: .78, depthWrite: false }));
        logo.position.z = radius * 1.04;
        logo.scale.setScalar(radius * 1.18);
        body.add(logo);
        wakeRef.current();
      });
      return { pivot, body, ring, get logo() { return logo; }, phase, radius, index };
    });

    let visible = true;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    const render = (time: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min((time - lastTime) / 1000 || 0, .04);
      lastTime = time;
      const scroll = THREE.MathUtils.clamp(progress.get(), 0, 1);
      planetSystem.visible = THREE.MathUtils.smoothstep(scroll, .035, .14) > 0;
      if (state.current.motionOn) elapsed += dt;
      const color = projectColors[state.current.activeId];
      (activeGlow.material as THREE.SpriteMaterial).color.setHex(color);
      const drift = state.current.motionOn ? elapsed : 0;
      field.rotation.y = drift * .008 + scroll * .12;
      field.rotation.x = Math.sin(drift * .018) * .018 + (scroll - .5) * .045;
      starField.rotation.y = drift * .004 + scroll * .08;
      stars.rotation.z = Math.sin(drift * .02) * .018;
      activeGlow.material.opacity = state.current.motionOn ? .07 + Math.sin(drift * 1.2) * .018 : .08;
      haze.forEach((sprite, index) => {
        sprite.position.x += state.current.motionOn ? Math.sin(drift * .04 + index) * .0005 : 0;
        sprite.material.opacity = [ .11, .1, .08 ][index] + (state.current.motionOn ? Math.sin(drift * .16 + index) * .012 : 0);
      });
      lanes.forEach((lane, index) => {
        lane.rotation.z = (index % 2 ? -.42 : .28) + Math.sin(drift * .02 + index) * .018;
      });

      const orbitAngle = drift * .045 + scroll * Math.PI * 1.6;
      planetSystem.rotation.y = orbitAngle;
      planetSystem.rotation.x = .2 + Math.sin(scroll * Math.PI * 1.4) * .17;
      planetSystem.rotation.z = Math.sin(drift * .012) * .018;
      orbitPlanets.forEach(({ pivot, body, ring, logo, phase, radius, index }) => {
        const phaseOffset = phase + orbitAngle * (.7 + index * .04);
        pivot.position.set(
          Math.cos(phaseOffset) * radius,
          Math.sin(phaseOffset) * radius * .44,
          Math.sin(phaseOffset) * radius * .72,
        );
        body.rotation.y = drift * (.12 + index * .01) + index;
        body.rotation.z = Math.sin(drift * .18 + index) * .12;
        const selected = projectWorlds[index].id === state.current.activeId;
        body.scale.setScalar(selected ? 1.22 : .86);
        ring.material.opacity = selected ? .64 : .25;
        if (logo) logo.material.opacity = selected ? .98 : .78;
      });
      camera.position.x = Math.sin(scroll * Math.PI * 1.15) * .36;
      camera.position.y = Math.cos(scroll * Math.PI * .9) * .18;
      camera.position.z = 6.8 - scroll * .42;
      camera.lookAt(0, 0, -3.8);
      renderer.render(scene, camera);
      host.dataset.ready = "true";
      host.dataset.time = drift.toFixed(2);
      if (state.current.motionOn) frame = requestAnimationFrame(render);
    };
    const wake = () => { if (!frame) frame = requestAnimationFrame(render); };
    wakeRef.current = wake;
    const resize = () => {
      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      wake();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const visibilityTarget = host.parentElement ?? host;
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); }, { rootMargin: "100% 0px" });
    intersection.observe(visibilityTarget);
    const unsubscribe = progress.on("change", wake);
    const contextLost = (event: Event) => { event.preventDefault(); host.dataset.fallback = "true"; cancelAnimationFrame(frame); };
    canvas.addEventListener("webglcontextlost", contextLost);
    document.addEventListener("visibilitychange", wake);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      unsubscribe();
      canvas.removeEventListener("webglcontextlost", contextLost);
      document.removeEventListener("visibilitychange", wake);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose());
      });
      glowTexture.dispose();
      planetTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
      wakeRef.current = () => {};
    };
  }, [progress]);

  return <div ref={hostRef} className="worldline-backdrop" aria-hidden="true"><canvas /></div>;
}
