"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { planetTexture, projectWorlds, type ProjectId } from "./cosmic-canvas";
import { gravityMaterial } from "./gravity-field";
import { advanceGravityAge, gravityBirth, gravitySequence, GRAVITY_REST_SECONDS } from "./gravity-sequence";

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

function createBlackHole() {
  const group = new THREE.Group();
  const horizon = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 24), new THREE.MeshBasicMaterial({ color: 0x020308, transparent: true }));
  const diskMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, uResolution: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `
      varying vec2 vDisk;
      void main() {
        vDisk = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uStrength;
      uniform vec2 uResolution;
      varying vec2 vDisk;
      void main() {
        float radius = length(vDisk);
        float angle = atan(vDisk.y, vDisk.x);
        float edge = smoothstep(.56, .65, radius) * (1.0 - smoothstep(1.08, 1.55, radius));
        float ribbon = sin(radius * 54.0 - angle * 3.0 + uTime * .7);
        float detail = sin(radius * 113.0 + angle * 7.0 - uTime * 1.1);
        float heat = pow(clamp(1.55 - radius, 0.0, 1.0), 1.8);
        float filament = sin(angle * 11.0 + radius * 83.0 - uTime * .8);
        float brightness = (.62 + ribbon * .15 + detail * .07 + filament * .035) * (.76 + .24 * cos(angle - .7));
        vec3 color = mix(vec3(.20, .52, .66), vec3(.96, .62, .27), heat);
        color = mix(color, vec3(1.0, .96, .82), pow(heat, 3.0));
        vec2 screen = vec2(gl_FragCoord.x / uResolution.x, 1.0 - gl_FragCoord.y / uResolution.y);
        float readingMask = clamp(smoothstep(.77, .94, screen.y) + smoothstep(.85, .99, screen.x), 0.0, 1.0);
        gl_FragColor = vec4(color * (brightness + heat * .45) * 1.15, edge * uStrength * mix(.18, 1.0, readingMask));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(.56, 1.55, 96, 4), diskMaterial);
  disk.rotation.set(1.16, 0, -.16);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.515, .0035, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffe8b8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  // A complete far-side light path is naturally occluded by the dark horizon.
  const lens = new THREE.Mesh(new THREE.TorusGeometry(.72, .006, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffe8bd, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  lens.scale.y = .8;
  lens.position.z = -.3;
  horizon.renderOrder = 1;
  disk.renderOrder = 2;
  rim.renderOrder = 3;
  group.add(horizon, disk, rim, lens);
  return { group, horizon, diskMaterial, rim, lens };
}

export function WorldlineBackdrop({ activeId, motionOn, progress, contactProgress, contactVisible }: {
  activeId: ProjectId;
  motionOn: boolean;
  progress: MotionValue<number>;
  contactProgress: MotionValue<number>;
  contactVisible: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const state = useRef({ activeId, motionOn, contactVisible });
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    state.current = { activeId, motionOn, contactVisible };
    wakeRef.current();
  }, [activeId, motionOn, contactVisible]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = host?.querySelector("canvas");
    if (!host || !canvas) return;

    let holeStrength = 0;
    const updateChapter = () => {
      holeStrength = THREE.MathUtils.smoothstep(contactProgress.get(), 0, .15);
      host.style.setProperty("--black-hole-strength", holeStrength.toFixed(3));
      host.style.setProperty("--hole-growth", THREE.MathUtils.smoothstep(contactProgress.get(), 0, .65).toFixed(3));
      host.dataset.holeOpacity = holeStrength.toFixed(3);
      wakeRef.current();
    };
    const unsubscribeChapter = contactProgress.on("change", updateChapter);
    updateChapter();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    } catch {
      host.dataset.fallback = "true";
      return unsubscribeChapter;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, .1, 100);
    const field = new THREE.Group();
    const starField = new THREE.Group();
    const planetSystem = new THREE.Group();
    const sectorSystem = new THREE.Group();
    planetSystem.position.z = -3.2;
    sectorSystem.position.z = -4.3;
    scene.add(field, starField, planetSystem, sectorSystem);
    const blackHole = createBlackHole();
    scene.add(blackHole.group);
    const holeRay = new THREE.Vector3();
    const gravityTarget = new THREE.Vector3();
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
    const starMaterial = gravityMaterial(gravityTarget, .035);
    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.frustumCulled = false;
    starField.add(stars);
    const streakGeometry = new THREE.BufferGeometry();
    const streakPositions = new Float32Array(80 * 6);
    const streakColors = new Float32Array(80 * 6);
    const streakTails = new Float32Array(80 * 2);
    for (let i = 0; i < 80; i++) {
      const index = (i * 11) % starCount;
      for (let end = 0; end < 2; end++) {
        streakPositions.set(starPositions.subarray(index * 3, index * 3 + 3), i * 6 + end * 3);
        streakColors.set(starColors.subarray(index * 3, index * 3 + 3), i * 6 + end * 3);
        streakTails[i * 2 + end] = end;
      }
    }
    streakGeometry.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3));
    streakGeometry.setAttribute("color", new THREE.BufferAttribute(streakColors, 3));
    streakGeometry.setAttribute("aTail", new THREE.BufferAttribute(streakTails, 1));
    const streakMaterial = gravityMaterial(gravityTarget, 0, true);
    const gravityStreaks = new THREE.LineSegments(streakGeometry, streakMaterial);
    gravityStreaks.frustumCulled = false;
    starField.add(gravityStreaks);

    const galaxyCount = 1180;
    const galaxyPositions = new Float32Array(galaxyCount * 3);
    const galaxyColors = new Float32Array(galaxyCount * 3);
    const galaxyColor = new THREE.Color();
    const galaxyPalette = ["#d9fbf4", "#6ee7f4", "#9b8cff", "#ff82c8", "#efc95f"];
    for (let i = 0; i < galaxyCount; i++) {
      const galaxyIndex = i % 3;
      const arms = [3, 2, 4][galaxyIndex];
      const arm = Math.floor(i / 3) % arms;
      const radius = .06 + Math.pow((i * 17 % galaxyCount) / galaxyCount, .63) * [3.0, 2.4, 2.7][galaxyIndex];
      const twist = radius * (1.3 + galaxyIndex * .25);
      const phase = arm * Math.PI * 2 / arms + twist + (i * 13 % 100) / 100 * .32;
      const thickness = (.12 + radius * .045) * ((i * 29 % 100) / 100 - .5);
      galaxyPositions[i * 3] = [-4.0, 3.3, .25][galaxyIndex] + Math.cos(phase) * radius;
      galaxyPositions[i * 3 + 1] = [1.65, 1.4, -1.65][galaxyIndex] + Math.sin(phase) * radius * .36 + thickness;
      galaxyPositions[i * 3 + 2] = [-6.8, -7.6, -5.6][galaxyIndex] + Math.sin(phase) * radius * .25;
      galaxyColor.set(galaxyPalette[(i + arm) % galaxyPalette.length]);
      galaxyColors.set([galaxyColor.r, galaxyColor.g, galaxyColor.b], i * 3);
    }
    const galaxyGeometry = new THREE.BufferGeometry();
    galaxyGeometry.setAttribute("position", new THREE.BufferAttribute(galaxyPositions, 3));
    galaxyGeometry.setAttribute("color", new THREE.BufferAttribute(galaxyColors, 3));
    const galaxyMaterial = gravityMaterial(gravityTarget, .029);
    const galaxyDust = new THREE.Points(galaxyGeometry, galaxyMaterial);
    galaxyDust.frustumCulled = false;
    starField.add(galaxyDust);

    // One recycled GPU stream keeps the close alive during the planet's quiet interval.
    const flowGeometry = new THREE.BufferGeometry();
    const flowPositions = new Float32Array(160 * 3);
    const flowColors = new Float32Array(160 * 3);
    for (let i = 0; i < 160; i++) {
      const index = (i * 7) % galaxyCount;
      flowPositions.set(galaxyPositions.subarray(index * 3, index * 3 + 3), i * 3);
      flowColors.set(galaxyColors.subarray(index * 3, index * 3 + 3), i * 3);
    }
    flowGeometry.setAttribute("position", new THREE.BufferAttribute(flowPositions, 3));
    flowGeometry.setAttribute("color", new THREE.BufferAttribute(flowColors, 3));
    const flowMaterial = gravityMaterial(gravityTarget, .027, false, true);
    const feedingDust = new THREE.Points(flowGeometry, flowMaterial);
    feedingDust.frustumCulled = false;
    starField.add(feedingDust);

    const glowTexture = createGlowTexture();
    const wandererTextures = ["#82b8c4", "#c69b78", "#a9bba0"].map(planetTexture);
    const wanderer = new THREE.Group();
    const wandererMaterial = new THREE.MeshStandardMaterial({ map: wandererTextures[0], roughness: .82, metalness: .025, transparent: true });
    const wandererSurface = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 24), wandererMaterial);
    const wandererAtmosphere = new THREE.Mesh(new THREE.SphereGeometry(.55, 24, 16), new THREE.MeshBasicMaterial({ color: "#88c5d1", transparent: true, opacity: .12, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    const wandererRing = new THREE.Mesh(new THREE.TorusGeometry(.77, .009, 6, 64), new THREE.MeshBasicMaterial({ color: "#d5d9b7", transparent: true, opacity: .35, depthWrite: false }));
    wandererRing.rotation.set(.85, .18, .3);
    wanderer.add(wandererSurface, wandererAtmosphere, wandererRing);
    scene.add(wanderer);
    const visitorOrigin = new THREE.Vector3();
    const visitorOffset = new THREE.Vector3();
    let visitorIndex = -1;
    const galaxyCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0x9b8cff, transparent: true, opacity: .075, blending: THREE.AdditiveBlending, depthWrite: false }));
    galaxyCore.position.set(0, 0, -5.2);
    galaxyCore.scale.set(3.2, 1.35, 1);
    field.add(galaxyCore);
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

    const orbitPlanets = projectWorlds.map((world, index) => {
      const pivot = new THREE.Group();
      const body = new THREE.Group();
      const radius = .16 + (index % 2) * .025;
      const phase = [2.75, 1.4, .18, 4.2, 5.2][index];
      const surface = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 16),
        new THREE.MeshStandardMaterial({ color: world.color, emissive: world.color, emissiveIntensity: .14, metalness: .12, roughness: .62, transparent: true, opacity: .72 }),
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
      const highlight = new THREE.Mesh(
        new THREE.SphereGeometry(radius * .72, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      highlight.position.set(-radius * .28, radius * .32, radius * .7);
      body.add(highlight);
      return { pivot, body, ring, highlight, phase, orbitRadius: 3.6 + index * .38, index };
    });

    const constellationPairs = [[0, 1], [1, 2], [2, 4], [4, 3]];
    const constellationLinks = constellationPairs.map(([from, to]) => {
      const positions = new Float32Array(25 * 3);
      const colors = new Float32Array(25 * 3);
      const colorFrom = new THREE.Color(projectWorlds[from].color);
      const colorTo = new THREE.Color(projectWorlds[to].color);
      const mixed = new THREE.Color();
      for (let i = 0; i < 25; i++) {
        mixed.copy(colorFrom).lerp(colorTo, i / 24);
        colors.set([mixed.r, mixed.g, mixed.b], i * 3);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .16, depthWrite: false }));
      line.frustumCulled = false;
      planetSystem.add(line);
      return { from, to, positions, geometry, line };
    });
    host.dataset.constellationLinks = String(constellationLinks.length);

    const sectorNodes = [
      { color: 0xefc95f, phase: .55, orbit: .42, size: .045 },
      { color: 0xee674f, phase: 2.15, orbit: .5, size: .04 },
      { color: 0x6ee7f4, phase: 3.35, orbit: .48, size: .05 },
      { color: 0xff82c8, phase: 4.65, orbit: .56, size: .035 },
      { color: 0x9b8cff, phase: 5.45, orbit: .44, size: .04 },
    ].map(({ color, phase, orbit, size }, index) => {
      const pivot = new THREE.Group();
      const body = new THREE.Group();
      const surface = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .65 }),
      );
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.26, 14, 10),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      body.add(surface, atmosphere);
      const sparkle = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
      sparkle.scale.setScalar(size * 5);
      body.add(sparkle);
      pivot.add(body);
      sectorSystem.add(pivot);
      return { pivot, body, phase, orbit, size, index };
    });

    let visible = true;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let birthAge = 0;
    let gravityAge = 0;
    const render = (time: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      const delta = Math.max(0, (time - lastTime) / 1000 || 0);
      const dt = Math.min(delta, .04);
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
      galaxyDust.rotation.y = drift * .006 + scroll * .035;
      galaxyDust.rotation.z = Math.sin(drift * .012) * .018;
      galaxyCore.material.opacity = state.current.motionOn ? .065 + Math.sin(drift * .22) * .012 : .07;
      activeGlow.material.opacity = state.current.motionOn ? .07 + Math.sin(drift * 1.2) * .018 : .08;
      haze.forEach((sprite, index) => {
        sprite.position.x += state.current.motionOn ? Math.sin(drift * .04 + index) * .0005 : 0;
        sprite.material.opacity = [ .11, .1, .08 ][index] + (state.current.motionOn ? Math.sin(drift * .16 + index) * .012 : 0);
      });
      const orbitAngle = drift * .045 + scroll * Math.PI * 1.6;
      planetSystem.rotation.y = orbitAngle;
      planetSystem.rotation.x = .2 + Math.sin(scroll * Math.PI * 1.4) * .17;
      planetSystem.rotation.z = Math.sin(drift * .012) * .018;
      orbitPlanets.forEach(({ pivot, body, ring, highlight, phase, orbitRadius, index }) => {
        const phaseOffset = phase + orbitAngle * (.7 + index * .04);
        pivot.position.set(
          Math.cos(phaseOffset) * orbitRadius,
          Math.sin(phaseOffset) * orbitRadius * .44,
          Math.sin(phaseOffset) * orbitRadius * .32,
        );
        body.rotation.y = drift * (.12 + index * .01) + index;
        body.rotation.z = Math.sin(drift * .18 + index) * .12;
        const selected = projectWorlds[index].id === state.current.activeId;
        body.scale.setScalar(selected ? 1.3 : .9);
        ring.material.opacity = selected ? .64 : .25;
        highlight.material.opacity = selected ? .09 : .045;
      });
      constellationLinks.forEach(({ from, to, positions, geometry, line }) => {
        const a = orbitPlanets[from].pivot.position;
        const b = orbitPlanets[to].pivot.position;
        for (let i = 0; i < 25; i++) {
          const t = i / 24;
          positions[i * 3] = THREE.MathUtils.lerp(a.x, b.x, t);
          positions[i * 3 + 1] = THREE.MathUtils.lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * .14;
          positions[i * 3 + 2] = THREE.MathUtils.lerp(a.z, b.z, t) - Math.sin(t * Math.PI) * .4;
        }
        geometry.attributes.position.needsUpdate = true;
        line.material.opacity = planetSystem.visible ? .14 : 0;
      });
      const sectorAngle = drift * .026 + scroll * Math.PI * .72;
      sectorSystem.rotation.copy(planetSystem.rotation);
      sectorSystem.position.copy(planetSystem.position);
      sectorSystem.visible = planetSystem.visible;
      sectorNodes.forEach(({ pivot, body, phase, orbit, index }) => {
        const owner = orbitPlanets[index].pivot.position;
        const phaseOffset = phase + sectorAngle + drift * .08;
        pivot.position.set(
          owner.x + Math.cos(phaseOffset) * orbit,
          owner.y + Math.sin(phaseOffset) * orbit * .6,
          owner.z + Math.sin(phaseOffset) * orbit * .35,
        );
        body.rotation.y = drift * (.08 + index * .012) + index;
        body.rotation.z = Math.sin(drift * .14 + index) * .08;
        body.scale.setScalar(state.current.motionOn ? .9 + Math.sin(drift * .35 + index) * .045 : .9);
      });
      camera.position.x = Math.sin(scroll * Math.PI * 1.15) * .36;
      camera.position.y = Math.cos(scroll * Math.PI * .9) * .18;
      camera.position.z = 6.8 - scroll * .42;
      camera.lookAt(0, 0, -3.8);
      camera.updateMatrixWorld();

      // Screen-space anchoring keeps the terminal landmark out of the hero and reading center.
      const width = host.clientWidth;
      const height = host.clientHeight;
      const portrait = width < height;
      const holeY = height < 620 ? .88 : portrait ? .9 : .87;
      const contactActive = state.current.motionOn && state.current.contactVisible && holeStrength > .05;
      birthAge = advanceGravityAge(birthAge, delta, contactActive);
      const birth = state.current.motionOn ? gravityBirth(birthAge) : { growth: 1, ready: true };
      const holeX = THREE.MathUtils.lerp(.92, 1.01, birth.growth);
      holeRay.set(holeX * 2 - 1, 1 - holeY * 2, .5).unproject(camera).sub(camera.position).normalize();
      blackHole.group.position.copy(camera.position).addScaledVector(holeRay, (-4.8 - camera.position.z) / holeRay.z);
      blackHole.group.quaternion.copy(camera.quaternion);
      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z + 4.8);
      const diameter = Math.min(width * .95, height * .8);
      blackHole.group.scale.setScalar(viewHeight * diameter / height * (.08 + birth.growth * .92));
      blackHole.group.visible = holeStrength > .001;
      blackHole.diskMaterial.uniforms.uTime.value = drift * .35;
      blackHole.diskMaterial.uniforms.uStrength.value = holeStrength;
      blackHole.diskMaterial.uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
      blackHole.horizon.material.opacity = holeStrength * .98;
      blackHole.rim.material.opacity = holeStrength * .56;
      blackHole.lens.material.opacity = holeStrength * .32;
      gravityTarget.copy(blackHole.group.position);
      const gravityActive = contactActive && birth.ready;
      gravityAge = advanceGravityAge(gravityAge, delta, gravityActive);
      const sequence = gravitySequence(gravityAge);
      const pull = state.current.motionOn ? holeStrength * sequence.fieldPull : 0;
      [starMaterial, galaxyMaterial, streakMaterial].forEach((material) => {
        material.uniforms.uPull.value = pull;
        material.uniforms.uTime.value = gravityAge * .18;
        material.uniforms.uScale.value = height * renderer.getPixelRatio() * .5;
      });
      gravityStreaks.visible = pull > .01;
      feedingDust.visible = gravityActive;
      flowMaterial.uniforms.uPull.value = gravityActive ? holeStrength * THREE.MathUtils.smoothstep(gravityAge, 0, 2) : 0;
      flowMaterial.uniforms.uTime.value = gravityAge;
      flowMaterial.uniforms.uScale.value = height * renderer.getPixelRatio() * .5;
      planetSystem.scale.setScalar(1 - pull * .94);
      planetSystem.position.set(gravityTarget.x * pull, gravityTarget.y * pull, THREE.MathUtils.lerp(-3.2, gravityTarget.z, pull));
      planetSystem.rotation.z += pull * pull * 4;
      sectorSystem.scale.copy(planetSystem.scale);
      sectorSystem.position.copy(planetSystem.position);
      wanderer.visible = gravityActive && sequence.visitorVisible;
      if (wanderer.visible) {
        if (visitorIndex !== sequence.index) {
          visitorIndex = sequence.index;
          wandererMaterial.map = wandererTextures[visitorIndex % wandererTextures.length];
        }
        holeRay.set(-.52, -.7, .5).unproject(camera).sub(camera.position).normalize();
        visitorOrigin.copy(camera.position).addScaledVector(holeRay, (-4.8 - camera.position.z) / holeRay.z);
        visitorOffset.copy(visitorOrigin).sub(gravityTarget);
        const contraction = Math.pow(1 - sequence.progress, 1.3);
        const angle = Math.atan2(visitorOffset.y, visitorOffset.x) - Math.pow(sequence.progress, 1.6) * Math.PI * 1.2;
        const radius = Math.hypot(visitorOffset.x, visitorOffset.y) * contraction;
        wanderer.position.set(gravityTarget.x + Math.cos(angle) * radius, gravityTarget.y + Math.sin(angle) * radius, gravityTarget.z + visitorOffset.z * contraction);
        wanderer.scale.setScalar(viewHeight * Math.min(width, height) / height * .11 * (1 - sequence.progress * .78));
        wanderer.rotation.set(.2, gravityAge * .09, sequence.progress * 1.8);
      }
      const visitorOpacity = wanderer.visible ? holeStrength * THREE.MathUtils.smoothstep(sequence.progress, 0, .012) * (1 - THREE.MathUtils.smoothstep(sequence.progress, .82, 1)) : 0;
      wandererMaterial.opacity = visitorOpacity;
      wandererAtmosphere.material.opacity = visitorOpacity * .12;
      wandererRing.material.opacity = visitorOpacity * .35;
      host.style.setProperty("--hole-growth", birth.growth.toFixed(3));
      host.dataset.holeX = holeX.toFixed(3);
      host.dataset.holeY = String(holeY);
      host.dataset.holeDiameter = diameter.toFixed(1);
      host.dataset.pull = pull.toFixed(3);
      host.dataset.backgroundGalaxies = "3";
      host.dataset.gravityAge = gravityAge.toFixed(2);
      host.dataset.birthAge = birthAge.toFixed(2);
      host.dataset.holeGrowth = birth.growth.toFixed(3);
      host.dataset.feedingDust = String(feedingDust.visible);
      host.dataset.gravityActive = String(gravityActive);
      host.dataset.gravityPhase = birth.ready ? sequence.phase : "birth";
      host.dataset.gravityCycle = String(sequence.index);
      host.dataset.gravityRest = String(GRAVITY_REST_SECONDS);
      host.dataset.visitorOpacity = visitorOpacity.toFixed(3);
      renderer.render(scene, camera);
      host.dataset.drawCalls = String(renderer.info.render.calls);
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
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      unsubscribe();
      unsubscribeChapter();
      canvas.removeEventListener("webglcontextlost", contextLost);
      document.removeEventListener("visibilitychange", wake);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose());
      });
      glowTexture.dispose();
      wandererTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
      wakeRef.current = () => {};
    };
  }, [progress, contactProgress]);

  return <div ref={hostRef} className="worldline-backdrop" aria-hidden="true"><canvas /><span className="black-hole-fallback" /></div>;
}
