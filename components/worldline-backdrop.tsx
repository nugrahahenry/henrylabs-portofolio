"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { projectWorlds, type ProjectId } from "./cosmic-canvas";
import { createAtmosphere, createCompanionMaterial, createPlanetMaps, createPlanetRing, projectPlanetKinds } from "./planet-materials";
import { companionCounts, createCompanionOrbit, sampleCompanionOrbit, advanceCompanionTime, type CompanionOrbit } from "./companion-orbit";
import { gravityMaterial, infallPoint } from "./gravity-field";
import { advanceGravityAge, closingReturn, updateClosingScroll, gravityBirth, gravitySequence, gravityVisitors, gravityVisitorEntry, gravityVisitorPose, gravityVisitorMember, gravityReadingVisibility, type ReadingRect, GRAVITY_REST_SECONDS } from "./gravity-sequence";
import { orbitGeometry, orbitalSpeed, sampleOrbit } from "./orbital-path";
import { createStellarCore } from "./stellar-core";
import { createDeepSpace } from "./deep-space";
import { blackHoleFrame } from "./black-hole-frame";
import { arrivalBridge } from "./arrival-field";
import { createSpacecraft, spacecraftPose, routeSpacecraft, flightPresence, createPursuitBolts, pursuitPulse, pursuitShotSide, pursuitMiss, clearShot, createWormhole, wormholePresence, advancePursuit, pursuitEnd, WORMHOLE_X, FLIGHT_START_X, PURSUIT_DELAY, COMPACT_PURSUIT_DELAY, PURSUIT_REST, PURSUIT_SHOTS, PURSUIT_SHOT_SECONDS } from "./spacecraft";
import { COMPACT_STAR_COUNT, DISTANT_STAR_COUNT, FEEDING_DUST_COUNT, createDistantStarMaterial, distantStarPoint, dustStreamSource } from "./ambient-field";

function createBlackHole() {
  const group = new THREE.Group();
  const readingUniforms = { uResolution: { value: new THREE.Vector2(1, 1) }, uReadRect: { value: new THREE.Vector4(-1000, -1000, -1000, -1000) } };
  const readingGuard = `
    vec2 screen = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    vec2 outsideCopy = max(max(uReadRect.xy - screen, screen - uReadRect.zw), vec2(0.0));
    float readingGuard = mix(.24, 1.0, smoothstep(0.0, 56.0, length(outsideCopy)));
  `;
  // The observed shadow and photon image share a screen-facing silhouette.
  const horizon = new THREE.Mesh(new THREE.CircleGeometry(.505, 128), new THREE.MeshBasicMaterial({ color: 0x000001, transparent: true, depthTest: false, depthWrite: false }));
  const diskMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, ...readingUniforms, uVoid: { value: new THREE.Vector3() } },
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
      uniform vec4 uReadRect;
      uniform vec3 uVoid;
      varying vec2 vDisk;
      void main() {
        float apparentRadius = length(gl_FragCoord.xy - uVoid.xy) / max(1.0, uVoid.z);
        if (apparentRadius < .97) discard;
        float radius = length(vDisk);
        float angle = atan(vDisk.y, vDisk.x);
        float edge = smoothstep(.49, .56, radius) * (1.0 - smoothstep(1.14, 1.7, radius));
        float logRadius = log(max(radius, .52));
        float flow = angle * 3.0 + logRadius * 20.0 - uTime * .75;
        float shear = sin(angle * 2.0 + radius * 11.0 - uTime * .2) * .18;
        float laneA = pow(max(0.0, .5 + .5 * sin(flow + shear)), 7.0);
        // Integer angular frequencies close at atan's -PI/PI boundary.
        float laneB = pow(max(0.0, .5 + .5 * sin(angle * 5.0 + logRadius * 34.4 + shear * 1.72 + radius * 4.0 - uTime * 1.13)), 9.0);
        float laneC = pow(max(0.0, .5 + .5 * sin(angle * 7.0 + logRadius * 11.6 + shear * .58 - radius * 17.0 - uTime * .735)), 11.0);
        float detail = sin(radius * 145.0 + angle * 13.0 - uTime * 1.4) * .5 + .5;
        float turbulent = .55 + .45 * sin(angle * 5.0 + radius * 23.0 - uTime * .4);
        float heat = pow(clamp(1.38 - radius, 0.0, 1.0), 1.55);
        float depth = smoothstep(.54, .92, radius);
        float brightness = (.13 + laneA * .72 + laneB * .42 + laneC * .24 + detail * .10) * turbulent;
        brightness *= 1.0 + .48 * cos(angle - .55) + .14 * sin(angle * 3.0 + uTime);
        vec3 color = mix(vec3(.035, .18, .72), vec3(1.0, .20, .045), smoothstep(.08, .62, heat));
        color = mix(color, vec3(1.0, .84, .40), smoothstep(.52, .86, heat));
        color = mix(color, vec3(.22, .42, 1.0), clamp(depth * .5 + laneB * .18, 0.0, 1.0));
        ${readingGuard}
        float brokenEdge = .72 + .28 * sin(angle * 3.0 + radius * 9.0 - uTime * .18);
        gl_FragColor = vec4(color * (brightness + heat * .52), edge * brokenEdge * uStrength * readingGuard);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(.51, 1.7, 128, 5), diskMaterial);
  disk.rotation.set(1.16, 0, -.3);
  // A graded image of the far disk bends over the silhouette; no solid torus edge.
  const lensMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, ...readingUniforms },
    vertexShader: `varying vec2 vLens; void main() { vLens = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform float uStrength;
      uniform vec2 uResolution; uniform vec4 uReadRect; varying vec2 vLens;
      void main() {
        float r = length(vLens), a = atan(vLens.y, vLens.x);
        float outside = smoothstep(.498, .514, r);
        float photon = exp(-pow((r - .518) / .008, 2.0));
        float arcRadius = length(vec2(vLens.x, vLens.y * .9));
        float farArc = exp(-pow((arcRadius - .60) / .045, 2.0)) * smoothstep(-.18,.25,vLens.y);
        float nearArc = exp(-pow((arcRadius - .548) / .023, 2.0)) * smoothstep(.04,.46,vLens.y);
        float bands = .55 + .25 * sin(arcRadius * 215.0 + a * 5.0 - uTime * .9) + .20 * sin(a * 17.0 + r * 87.0 - uTime * .35);
        float broken = .55 + .45 * (.5 + .5 * sin(a * 3.0 + arcRadius * 31.0 - uTime * .18));
        float glow = exp(-max(0.0, r - .52) * 27.0) * (.08 + .05 * sin(a * 8.0 - uTime));
        float beaming = .72 + .38 * cos(a - .62);
        vec3 warm = mix(vec3(1.0,.20,.035), vec3(1.0,.85,.46), .5 + .5 * bands);
        vec3 light = vec3(1.0,.72,.28) * photon * .85 + warm * (farArc * bands * .6 + nearArc * broken * .65);
        light += vec3(.10,.28,.72) * glow;
        float alpha = clamp(photon * 1.05 + farArc * broken + nearArc + glow, 0.0, 1.0) * outside * uStrength;
        ${readingGuard}
        gl_FragColor = vec4(light * beaming, alpha * readingGuard);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), lensMaterial);
  lens.position.z = 0;
  // Composite the shadow last so swallowed foreground companions cannot leak through it.
  horizon.renderOrder = 4;
  disk.renderOrder = 2;
  lens.renderOrder = 3;
  group.add(horizon, disk, lens);
  return { group, horizon, diskMaterial, lensMaterial };
}

export function WorldlineBackdrop({ activeId, motionOn, progress, contactProgress, contactVisible, mapActive, introActive, introProgress }: {
  activeId: ProjectId;
  motionOn: boolean;
  progress: MotionValue<number>;
  contactProgress: MotionValue<number>;
  contactVisible: boolean;
  mapActive: boolean;
  introActive: boolean;
  introProgress: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const state = useRef({ activeId, motionOn, contactVisible, mapActive, introActive, introProgress });
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    state.current = { activeId, motionOn, contactVisible, mapActive, introActive, introProgress };
    wakeRef.current();
  }, [activeId, motionOn, contactVisible, mapActive, introActive, introProgress]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = host?.querySelector("canvas");
    if (!host || !canvas) return;

    let holeStrength = 0;
    let enhanced = false;
    const updateChapter = () => {
      holeStrength = THREE.MathUtils.smoothstep(contactProgress.get(), 0, .15);
      if (!enhanced) {
        const frame = blackHoleFrame(host.clientWidth, host.clientHeight, THREE.MathUtils.smoothstep(contactProgress.get(), 0, .65));
        host.style.setProperty("--hole-x", `${frame.x * 100}%`);
        host.style.setProperty("--hole-y", `${frame.y * 100}%`);
        host.style.setProperty("--hole-diameter", `${frame.diameter}px`);
        host.style.setProperty("--black-hole-strength", holeStrength.toFixed(3));
        host.style.setProperty("--hole-growth", THREE.MathUtils.smoothstep(contactProgress.get(), 0, .65).toFixed(3));
        host.dataset.holeOpacity = holeStrength.toFixed(3);
      }
      wakeRef.current();
    };
    const unsubscribeChapter = contactProgress.on("change", updateChapter);
    updateChapter();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    } catch {
      host.dataset.fallback = "true";
      const fallbackResize = new ResizeObserver(updateChapter);
      fallbackResize.observe(host);
      return () => { fallbackResize.disconnect(); unsubscribeChapter(); };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    enhanced = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    const deepSpace = createDeepSpace();
    scene.add(deepSpace.volume);
    const flights = [createSpacecraft(), createSpacecraft("scout")].map((model) => ({ model, pose: spacecraftPose(0, false, model.kind), safe: { x: 0, y: .65, visible: false, clearance: 0 }, candidate: { x: 0, y: .65, visible: false, clearance: 0 }, velocity: new THREE.Vector2(), heading: 0, radius: 0, presence: 0, retired: false, portalEntry: null as boolean | null, cycle: -1 }));
    flights.forEach(({ model }) => { model.group.traverse(object => object.layers.set(1)); scene.add(model.group); });
    // Ship-only studio lighting reveals the hull without bleaching the surrounding universe.
    const craftKey = new THREE.DirectionalLight(0xe3f5ff, 3.2);
    craftKey.position.set(-3, 5, 7); craftKey.layers.set(1);
    const craftFill = new THREE.HemisphereLight(0x93cbec, 0x322535, 1.5);
    craftFill.layers.set(1);
    scene.add(craftKey, craftFill);
    const bolts = createPursuitBolts();
    scene.add(bolts);
    const wormhole = createWormhole();
    scene.add(wormhole.group);
    const portalSafe = { x: 0, y: .64, visible: false, clearance: 0 };
    const portalCandidate = { ...portalSafe };
    const shotFrom = { x: 0, y: 0 }, shotEnd = { x: 0, y: 0 }, shotTarget = { x: 0, y: 0, radius: 0, radiusX: 0, radiusY: 0 };
    const ufoSilhouette = { x: 0, y: 0, radiusX: 0, radiusY: 0 };
    let portalOpacity = 0, portalCycle = -1;
    const boltPose = new THREE.Object3D();
    const shots = Array.from({ length: PURSUIT_SHOTS }, (_, id) => ({ id, cycle: -1, launched: false, live: false, side: 1, length: 0, start: new THREE.Vector3(), end: new THREE.Vector3(), direction: new THREE.Vector3() }));
    const shotProbes = shots.map(shot => ({ id: shot.id, cycle: -1, launched: false, active: false, side: 1, pulse: 0, x: 0, y: 0, sx: 0, sy: 0, ex: 0, ey: 0, angle: 0, reason: "waiting" }));
    const craftObstacle = 11 + companionCounts.reduce((sum, count) => sum + count, 0);
    const flightObstacles = Array.from({ length: craftObstacle + 1 }, () => ({ x: 0, y: 0, radius: 0 }));
    const celestialObstacles = flightObstacles.slice(0, craftObstacle);
    const flightWorld = new THREE.Vector3(), flightView = new THREE.Vector3();
    const heroCopy = document.querySelector<HTMLElement>(".hero-copy");
    const heroKicker = document.querySelector<HTMLElement>(".hero-kicker");
    const heroNote = document.querySelector<HTMLElement>(".hero-note");
    const contactCopy = document.querySelector<HTMLElement>(".contact-copy");
    const contactTitle = document.querySelector<HTMLElement>(".contact-content h2");
    const footer = document.querySelector<HTMLElement>("footer");
    const contactReading: ReadingRect[] = [];
    const methodSteps = document.querySelector<HTMLElement>("#work");
    const stackKicker = document.querySelector<HTMLElement>(".maker-heading");
    let bandDirty = true, bandTop = 0, bandBottom = 0;
    let headerHeight = 76;
    const camera = new THREE.PerspectiveCamera(44, 1, .1, 100);
    camera.layers.enable(1);
    const starField = new THREE.Group();
    const planetSystem = new THREE.Group();
    const sectorSystem = new THREE.Group();
    planetSystem.position.z = -3.2;
    planetSystem.add(sectorSystem);
    scene.add(starField, planetSystem);
    const stellarCore = createStellarCore(.42);
    const stellarLight = new THREE.PointLight(0xffe1b1, 34, 18, 2);
    planetSystem.add(stellarCore.group, stellarLight);
    const solarOrigin = new THREE.Vector3();
    const solarTarget = new THREE.Vector3();
    const projectedStar = new THREE.Vector3();
    const blackHole = createBlackHole();
    scene.add(blackHole.group);
    const holeRay = new THREE.Vector3();
    const gravityTarget = new THREE.Vector3();
    scene.add(new THREE.AmbientLight(0x9fc4df, .14));
    const planetLight = new THREE.DirectionalLight(0xfff1da, .45);
    planetLight.position.set(-4, 5, 7);
    scene.add(planetLight);

    const starCount = 980;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starColor = new THREE.Color();
    const palette = ["#dceafa", "#f4f1da", "#adc3e0", "#ffe2b4", "#edf4f5"];
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
    const brightPositions = new Float32Array(18 * 3);
    const brightColors = new Float32Array(18 * 3);
    for (let i = 0; i < 18; i++) {
      const index = (i * 47 + 11) % starCount;
      brightPositions.set(starPositions.subarray(index * 3, index * 3 + 3), i * 3);
      brightColors.set(starColors.subarray(index * 3, index * 3 + 3), i * 3);
    }
    const brightGeometry = new THREE.BufferGeometry();
    brightGeometry.setAttribute("position", new THREE.BufferAttribute(brightPositions, 3));
    brightGeometry.setAttribute("color", new THREE.BufferAttribute(brightColors, 3));
    const brightMaterial = gravityMaterial(gravityTarget, .16, false, false, true);
    starField.add(new THREE.Points(brightGeometry, brightMaterial));
    const distantPositions = new Float32Array(DISTANT_STAR_COUNT * 3);
    const distantColors = new Float32Array(DISTANT_STAR_COUNT * 3);
    const ambientPoint = new THREE.Vector3();
    for (let i = 0; i < DISTANT_STAR_COUNT; i++) {
      distantStarPoint(i, ambientPoint).toArray(distantPositions, i * 3);
      starColor.set(palette[i % palette.length]).multiplyScalar(.42 + i % 7 * .055);
      starColor.toArray(distantColors, i * 3);
    }
    const distantGeometry = new THREE.BufferGeometry();
    distantGeometry.setAttribute("position", new THREE.BufferAttribute(distantPositions, 3));
    distantGeometry.setAttribute("color", new THREE.BufferAttribute(distantColors, 3));
    const distantMaterial = createDistantStarMaterial();
    const distantStars = new THREE.Points(distantGeometry, distantMaterial);
    distantStars.frustumCulled = false;
    starField.add(distantStars);
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
    const flowPositions = new Float32Array(FEEDING_DUST_COUNT * 3);
    const flowColors = new Float32Array(FEEDING_DUST_COUNT * 3);
    const flowSeeds = new Float32Array(FEEDING_DUST_COUNT);
    for (let i = 0; i < FEEDING_DUST_COUNT; i++) {
      dustStreamSource(i, ambientPoint).toArray(flowPositions, i * 3);
      galaxyColor.set(galaxyPalette[i % galaxyPalette.length]);
      galaxyColor.toArray(flowColors, i * 3);
      flowSeeds[i] = ((i + .5) * .618033989) % 1;
    }
    flowGeometry.setAttribute("position", new THREE.BufferAttribute(flowPositions, 3));
    flowGeometry.setAttribute("color", new THREE.BufferAttribute(flowColors, 3));
    flowGeometry.setAttribute("aSeed", new THREE.BufferAttribute(flowSeeds, 1));
    const flowMaterial = gravityMaterial(gravityTarget, .027, false, true);
    const feedingDust = new THREE.Points(flowGeometry, flowMaterial);
    feedingDust.frustumCulled = false;
    scene.add(feedingDust);
    // Balanced wisps from all four source lanes share the existing particle pool.
    const upperStreakCount = FEEDING_DUST_COUNT / 4;
    const upperStreakGeometry = new THREE.BufferGeometry();
    const upperStreakPositions = new Float32Array(upperStreakCount * 6);
    const upperStreakColors = new Float32Array(upperStreakCount * 6);
    const upperStreakSeeds = new Float32Array(upperStreakCount * 2);
    const upperStreakTails = new Float32Array(upperStreakCount * 2);
    for (let i = 0; i < upperStreakCount; i++) for (let end = 0; end < 2; end++) {
      const index = i * 4 + i % 4;
      upperStreakPositions.set(flowPositions.subarray(index * 3, index * 3 + 3), i * 6 + end * 3);
      upperStreakColors.set(flowColors.subarray(index * 3, index * 3 + 3), i * 6 + end * 3);
      upperStreakSeeds[i * 2 + end] = flowSeeds[index];
      upperStreakTails[i * 2 + end] = end;
    }
    upperStreakGeometry.setAttribute("position", new THREE.BufferAttribute(upperStreakPositions, 3));
    upperStreakGeometry.setAttribute("color", new THREE.BufferAttribute(upperStreakColors, 3));
    upperStreakGeometry.setAttribute("aSeed", new THREE.BufferAttribute(upperStreakSeeds, 1));
    upperStreakGeometry.setAttribute("aTail", new THREE.BufferAttribute(upperStreakTails, 1));
    const upperStreakMaterial = gravityMaterial(gravityTarget, 0, true, true);
    const upperStreaks = new THREE.LineSegments(upperStreakGeometry, upperStreakMaterial);
    upperStreaks.frustumCulled = false;
    scene.add(upperStreaks);
    const feedingMaterials = [flowMaterial, upperStreakMaterial];
    const upperProbeIndex = 44;
    const upperProbe = new THREE.Vector3();
    // Sample all source lanes across the pool; consecutive seeds can all be offscreen on phones.
    const dustProbes = Array.from({ length: 48 }, (_, slot) => ({ index: Math.floor(slot / 4) * 20 + slot % 4, x: 0, y: 0, travel: 0 }));

    const wandererMaps = ["#82b8c4", "#c69b78", "#a9bba0"].map((color, index) => createPlanetMaps(color, index === 0 ? "ocean" : index === 1 ? "rocky" : "ice", 256, 61 + index * 11));
    const planetTextures: THREE.Texture[] = wandererMaps.flatMap((maps) => maps.textures);
    const wanderer = new THREE.Group();
    const visitors = Array.from({ length: 5 }, (_, index) => {
      const group = new THREE.Group();
      const radius = .15 + index % 3 * .025;
      const maps = wandererMaps[index % 3];
      const material = new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.bump, bumpScale: .009, roughness: .86, metalness: 0, transparent: true, depthWrite: false });
      const surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 18), material);
      const atmosphere = createAtmosphere(radius, "#88c5d1");
      const { ring, texture } = createPlanetRing(radius);
      planetTextures.push(texture);
      group.add(surface, atmosphere, ring);
      wanderer.add(group);
      return { group, surface, material, atmosphere, ring, radius };
    });
    const visitorStar = createStellarCore(.24);
    const visitorLight = new THREE.PointLight(0xffe1bd, 5, 8, 2);
    wanderer.add(visitorStar.group, visitorLight);
    scene.add(wanderer);
    const visitorOrbit = new THREE.Vector3();
    const projectedVisitor = new THREE.Vector3();
    const visitorView = new THREE.Vector3();
    const visitorProbes = visitors.map(() => ({ x: 0, y: 0, radius: 0, extent: 0, depth: 0, opacity: 0 }));
    let visitorIndex = -1;

    // Every project world gets a readable local system; the active world is
    // larger, but it is no longer the only planet with visible companions.
    const moonRecords: Array<CompanionOrbit & { anchor: THREE.Object3D; path: THREE.Vector3[] }> = [];
    const orbitPlanets = projectWorlds.map((world, index) => {
      const pivot = new THREE.Group();
      const body = new THREE.Group();
      const radius = [.2, .24, .19, .32, .22][index];
      const phase = [2.75, 1.4, .18, 4.2, 5.2][index];
      const kind = projectPlanetKinds[index];
      const maps = createPlanetMaps(world.color, kind, 256, 7 + index * 17);
      planetTextures.push(...maps.textures);
      const surface = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 16),
        new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.bump, bumpScale: kind === "gas" ? .001 : .009, metalness: 0, roughness: kind === "ocean" ? .62 : .96, transparent: true }),
      );
      const atmosphere = createAtmosphere(radius, "#93b4d1");
      const { ring, texture: ringTexture } = createPlanetRing(radius);
      planetTextures.push(ringTexture);
      ring.visible = kind === "gas";
      body.add(surface, atmosphere, ring);
      pivot.add(body);
      planetSystem.add(pivot);
      const cloud = maps.cloud ? new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, 24, 16), new THREE.MeshStandardMaterial({ map: maps.cloud, transparent: true, opacity: .65, depthWrite: false, roughness: 1 })) : null;
      if (cloud) body.add(cloud);
      for (let moonIndex = 0; moonIndex < companionCounts[index]; moonIndex++) {
        const orbit = createCompanionOrbit(index, moonIndex, radius, ring.visible);
        const anchor = new THREE.Object3D();
        planetSystem.add(anchor);
        const path = Array.from({ length: 65 }, (_, segment) => sampleCompanionOrbit(orbit, segment / 64 * Math.PI * 2));
        moonRecords.push({ ...orbit, anchor, path });
      }
      return { pivot, body, surface, atmosphere, ring, cloud, radius, phase, orbitRadius: 1.45 + index * .64, index };
    });

    const moonGeometry = new THREE.SphereGeometry(1, 20, 14);
    const moonMaps = createPlanetMaps("#c6cbd0", "rocky", 128, 43);
    planetTextures.push(...moonMaps.textures);
    const moonMaterial = createCompanionMaterial(moonMaps.map, moonMaps.bump);
    const moonMesh = new THREE.InstancedMesh(moonGeometry, moonMaterial, moonRecords.length);
    moonMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const moonDummy = new THREE.Object3D();
    moonRecords.forEach((moon, index) => { moonDummy.scale.setScalar(moon.size); moonDummy.updateMatrix(); moonMesh.setMatrixAt(index, moonDummy.matrix); moonMesh.setColorAt(index, new THREE.Color(moon.color)); });
    moonMesh.instanceMatrix.needsUpdate = true;
    if (moonMesh.instanceColor) moonMesh.instanceColor.needsUpdate = true;
    moonMesh.renderOrder = 3;
    planetSystem.add(moonMesh);
    const companionAtmosphere = createAtmosphere(1, "#bdd6e0");
    const moonAtmospheres = new THREE.InstancedMesh(companionAtmosphere.geometry, companionAtmosphere.material, moonRecords.length);
    moonAtmospheres.instanceMatrix = moonMesh.instanceMatrix;
    moonAtmospheres.renderOrder = 3;
    // Their moving matrices invalidate the initial bounds; the parent scene already gates visibility.
    moonMesh.frustumCulled = false;
    moonAtmospheres.frustumCulled = false;
    planetSystem.add(moonAtmospheres);
    const moonLinePositions = new Float32Array(moonRecords.length * 64 * 2 * 3);
    const moonOrbitLines = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(moonLinePositions, 3)),
      new THREE.LineBasicMaterial({ color: 0xabc5ce, transparent: true, opacity: .16, depthWrite: false }),
    );
    moonOrbitLines.renderOrder = 2;
    moonOrbitLines.frustumCulled = false;
    planetSystem.add(moonOrbitLines);
    host.dataset.moonOrbits = String(moonRecords.length);
    host.dataset.moonCounts = companionCounts.join(",");
    host.dataset.companionSurface = "textured-relief";
    const companionProbes = moonRecords.map(moon => ({ owner: moon.ownerIndex, x: 0, y: 0, radius: 0, localX: 0, localY: 0, localZ: 0, period: Math.PI * 2 / moon.speed }));

    const solarOrbits = orbitPlanets.map(({ orbitRadius }, index) => {
      const line = new THREE.LineLoop(orbitGeometry(.08 + index * .015), new THREE.LineBasicMaterial({ color: 0xa7b7bd, transparent: true, opacity: .065, depthWrite: false }));
      line.scale.setScalar(orbitRadius);
      planetSystem.add(line);
      return line;
    });
    host.dataset.constellationLinks = "0";
    host.dataset.solarOrbits = String(solarOrbits.length);
    host.dataset.centralStar = "true";

    const sectorNodes = [
      { color: 0xefc95f, phase: .55, orbit: .42, size: .045 },
      { color: 0xee674f, phase: 2.15, orbit: .5, size: .04 },
      { color: 0x6ee7f4, phase: 3.35, orbit: .48, size: .05 },
      { color: 0xff82c8, phase: 4.65, orbit: .56, size: .035 },
      { color: 0x9b8cff, phase: 5.45, orbit: .44, size: .04 },
    ].map(({ color, phase, orbit, size }, index) => {
      const pivot = new THREE.Group();
      const body = new THREE.Group();
      const maps = createPlanetMaps("#a6b2b1", "rocky", 128, 101 + index * 7);
      planetTextures.push(...maps.textures);
      const surface = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 12),
        new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.bump, bumpScale: .002, roughness: 1 }),
      );
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.26, 14, 10),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      body.add(surface, atmosphere);
      pivot.add(body);
      sectorSystem.add(pivot);
      return { pivot, body, phase, orbit, size, index };
    });

    let visible = true;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let companionAge = 0;
    const pursuit = { age: 0, cycle: 0, delay: PURSUIT_DELAY, interrupted: false };
    let introExitHandled = false;
    let birthAge = 0;
    let gravityAge = 0;
    const closing = { peak: 0, presence: 0, returning: false };
    const retreatPose = { infall: 0, growth: 0, opacity: 0 };
    let solarVisibility = 1;
    let readingBlend = 0;
    let displayedIntroProgress = state.current.introProgress;
    const solarBodies = orbitPlanets.map(() => ({ x: 0, y: 0, radius: 0 }));
    const moonPoint = new THREE.Vector3();
    const moonNextPoint = new THREE.Vector3();
    const moonWorldPoint = new THREE.Vector3();
    const render = (time: number) => {
      frame = 0;
      if (!visible || document.hidden || !enhanced) return;
      const delta = Math.max(0, (time - lastTime) / 1000 || 0);
      const dt = Math.min(delta, .04);
      lastTime = time;
      const scroll = THREE.MathUtils.clamp(progress.get(), 0, 1);
      updateClosingScroll(closing, contactProgress.get(), dt, state.current.motionOn);
      const retreat = closingReturn(closing.presence, retreatPose);
      if (closing.peak === 0) { birthAge = 0; gravityAge = 0; }
      const holeOpacity = THREE.MathUtils.smoothstep(closing.peak, 0, .15) * retreat.opacity;
      planetSystem.visible = true;
      if (state.current.motionOn) elapsed += dt;
      companionAge = advanceCompanionTime(companionAge, delta, state.current.motionOn);
      const drift = state.current.motionOn ? elapsed : 0;
      const companionTime = state.current.motionOn ? companionAge : 0;
      const introMode = state.current.introActive && state.current.motionOn;
      displayedIntroProgress = introMode ? THREE.MathUtils.damp(displayedIntroProgress, state.current.introProgress, 14, dt) : 100;
      const bridge = arrivalBridge(displayedIntroProgress / 100);
      const introReveal = introMode ? bridge.nebula : 1;
      starField.rotation.y = drift * .004 + scroll * .08;
      stars.rotation.z = Math.sin(drift * .02) * .018;
      galaxyDust.rotation.y = drift * .006 + scroll * .035;
      galaxyDust.rotation.z = Math.sin(drift * .012) * .018;
      starField.visible = !introMode || state.current.introProgress > 38;
      const solarPortrait = camera.aspect < .9;
      const readingChapter = scroll > .005 && !state.current.contactVisible && !state.current.mapActive;
      const readingTarget = readingChapter ? 1 : 0;
      readingBlend = state.current.motionOn ? THREE.MathUtils.damp(readingBlend, readingTarget, 5, dt) : readingTarget;
      // Move the same system to the reading periphery instead of hiding its planets.
      const solarScale = (solarPortrait ? .8 : 1) * THREE.MathUtils.lerp(1, solarPortrait ? .7 : .9, readingBlend);
      solarOrigin.set(
        THREE.MathUtils.lerp(solarPortrait ? .72 : 2.8, solarPortrait ? .84 : 3.05, readingBlend),
        THREE.MathUtils.lerp((solarPortrait ? 2.5 : 2.7) - scroll * 2.2, 2.15 - scroll * .25, readingBlend),
        -3.2,
      );
      const solarStrength = state.current.mapActive ? .38 : THREE.MathUtils.lerp(1, .76, readingBlend);
      solarVisibility = state.current.motionOn ? THREE.MathUtils.damp(solarVisibility, solarStrength, 5, dt) : solarStrength;
      planetSystem.visible = solarVisibility > .005 && (!introMode || state.current.introProgress > 58);
      planetSystem.rotation.y = Math.sin(drift * .016) * .08 + scroll * .22;
      planetSystem.rotation.x = Math.sin(scroll * Math.PI * 1.4) * .12;
      planetSystem.rotation.z = Math.sin(drift * .012) * .018;
      stellarCore.material.uniforms.uTime.value = drift;
      stellarCore.group.scale.setScalar(THREE.MathUtils.lerp(1, .78, readingBlend));
      const coreStrength = solarVisibility * THREE.MathUtils.lerp(1, .52, readingBlend);
      stellarCore.material.uniforms.uOpacity.value = coreStrength;
      stellarCore.aura.material.uniforms.uTime.value = drift;
      stellarCore.aura.material.uniforms.uOpacity.value = .55 * coreStrength;
      stellarCore.surface.rotation.y = drift * .018;
      orbitPlanets.forEach(({ pivot, body, surface, atmosphere, ring, cloud, phase, orbitRadius, index }) => {
        const phaseOffset = phase + drift * orbitalSpeed(orbitRadius) + scroll * .45;
        sampleOrbit(orbitRadius, phaseOffset, .08 + index * .015, pivot.position);
        body.rotation.y = drift * (.12 + index * .01) + index;
        body.rotation.z = Math.sin(drift * .18 + index) * .12;
        const selected = projectWorlds[index].id === state.current.activeId;
        body.scale.setScalar(selected ? 1.3 : .9);
        body.updateMatrix();
        surface.material.opacity = solarVisibility;
        atmosphere.material.uniforms.uOpacity.value = .6 * solarVisibility;
        ring.material.opacity = (selected ? .9 : .7) * solarVisibility;
        if (cloud) { cloud.rotation.y = drift * .013; cloud.material.opacity = .65 * solarVisibility; }
      });
      moonRecords.forEach((moon, moonIndex) => {
        const owner = orbitPlanets[moon.ownerIndex];
        const moonPhase = moon.phase + companionTime * moon.speed;
        sampleCompanionOrbit(moon, moonPhase, moonPoint);
        moonWorldPoint.copy(moonPoint).multiplyScalar(owner.body.scale.x).add(owner.pivot.position);
        moon.anchor.position.copy(moonWorldPoint);
        moonDummy.position.copy(moonWorldPoint);
        moonDummy.scale.setScalar(moon.size * owner.body.scale.x);
        moonDummy.rotation.set(moon.tilt, moon.phase + companionTime * moon.spin, 0);
        moonDummy.updateMatrix();
        moonMesh.setMatrixAt(moonIndex, moonDummy.matrix);
        Object.assign(companionProbes[moonIndex], { localX: moonPoint.x, localY: moonPoint.y, localZ: moonPoint.z });
        const lineStart = moonIndex * 64 * 2 * 3;
        for (let segment = 0; segment < 64; segment++) {
          moonPoint.copy(moon.path[segment]).multiplyScalar(owner.body.scale.x).add(owner.pivot.position);
          moonNextPoint.copy(moon.path[segment + 1]).multiplyScalar(owner.body.scale.x).add(owner.pivot.position);
          const offset = lineStart + segment * 6;
          moonLinePositions[offset] = moonPoint.x; moonLinePositions[offset + 1] = moonPoint.y; moonLinePositions[offset + 2] = moonPoint.z;
          moonLinePositions[offset + 3] = moonNextPoint.x; moonLinePositions[offset + 4] = moonNextPoint.y; moonLinePositions[offset + 5] = moonNextPoint.z;
        }
      });
      moonMesh.instanceMatrix.needsUpdate = true;
      moonMaterial.opacity = solarVisibility;
      moonAtmospheres.material.uniforms.uOpacity.value = .34 * solarVisibility;
      moonOrbitLines.geometry.attributes.position.needsUpdate = true;
      moonOrbitLines.material.opacity = .095 * solarVisibility;
      solarOrbits.forEach((line) => { line.material.opacity = .065 * solarVisibility; });
      sectorSystem.visible = solarVisibility > .6;
      const sectorAngle = drift * .026 + scroll * Math.PI * .72;
      sectorNodes.forEach(({ pivot, body, phase, orbit, index }) => {
        const owner = orbitPlanets[index].pivot.position;
        const phaseOffset = phase + sectorAngle + drift * .08;
        sampleOrbit(orbit, phaseOffset, .05, solarTarget);
        pivot.position.copy(owner).add(solarTarget);
        body.rotation.y = drift * (.08 + index * .012) + index;
        body.rotation.z = Math.sin(drift * .14 + index) * .08;
        body.scale.setScalar(state.current.motionOn ? .9 + Math.sin(drift * .35 + index) * .045 : .9);
      });
      camera.position.x = Math.sin(scroll * Math.PI * 1.15) * .36;
      camera.position.y = Math.cos(scroll * Math.PI * .9) * .18;
      camera.position.z = 6.8 - scroll * .42 + bridge.cameraDepth;
      camera.lookAt(0, 0, -3.8);
      if (introMode) camera.setViewOffset(host.clientWidth, host.clientHeight, 0, host.clientHeight * bridge.cameraLift, host.clientWidth, host.clientHeight);
      else if (camera.view?.enabled) camera.clearViewOffset();
      camera.updateMatrixWorld();

      // Screen-space anchoring keeps the terminal landmark out of the hero and reading center.
      const width = host.clientWidth;
      const height = host.clientHeight;
      const contactActive = state.current.motionOn && state.current.contactVisible && holeStrength > .05 && !closing.returning && closing.presence === 1;
      birthAge = advanceGravityAge(birthAge, delta, contactActive);
      const birth = state.current.motionOn ? gravityBirth(birthAge) : { growth: 1, ready: true };
      const holeGrowth = birth.growth * retreat.growth;
      const { x: holeX, y: holeY, diameter, scale: holeScale } = blackHoleFrame(width, height, holeGrowth);
      holeRay.set(holeX * 2 - 1, 1 - holeY * 2, .5).unproject(camera).sub(camera.position).normalize();
      blackHole.group.position.copy(camera.position).addScaledVector(holeRay, (-4.8 - camera.position.z) / holeRay.z);
      blackHole.group.quaternion.copy(camera.quaternion);
      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z + 4.8);
      blackHole.group.scale.setScalar(viewHeight * diameter / height * holeScale);
      blackHole.group.visible = holeOpacity > .001;
      blackHole.diskMaterial.uniforms.uTime.value = drift * .35;
      blackHole.diskMaterial.uniforms.uStrength.value = holeOpacity;
      blackHole.diskMaterial.uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
      blackHole.diskMaterial.uniforms.uVoid.value.set(holeX * width * renderer.getPixelRatio(), (1 - holeY) * height * renderer.getPixelRatio(), diameter * holeScale * .5 * renderer.getPixelRatio());
      contactReading.length = 0;
      if (holeOpacity > .001) {
        for (const element of [contactTitle, contactCopy, footer]) if (element) contactReading.push(element.getBoundingClientRect());
        if (contactCopy) {
          const rect = contactCopy.getBoundingClientRect();
          blackHole.diskMaterial.uniforms.uReadRect.value.set(rect.left - 12, rect.top - 12, rect.right + 12, rect.bottom + 12).multiplyScalar(renderer.getPixelRatio());
        }
      }
      blackHole.horizon.material.opacity = holeOpacity;
      blackHole.lensMaterial.uniforms.uTime.value = drift * .35;
      blackHole.lensMaterial.uniforms.uStrength.value = holeOpacity;
      gravityTarget.copy(blackHole.group.position);
      deepSpace.material.uniforms.uHorizon.value = blackHole.group.scale.x * .5;
      deepSpace.material.uniforms.uLensStrength.value = holeOpacity * holeGrowth;
      const gravityActive = contactActive && birth.ready;
      gravityAge = advanceGravityAge(gravityAge, delta, gravityActive);
      const sequence = gravitySequence(gravityAge);
      const visitorGroup = gravityVisitors(sequence.index);
      const visitorEntry = gravityVisitorEntry(sequence.index);
      const visitorProgress = sequence.progress * retreat.infall;
      const pull = state.current.motionOn ? holeOpacity * sequence.fieldPull * retreat.infall : 0;
      const returning = state.current.motionOn && closing.returning && birth.ready && holeOpacity > .001;
      const restoring = state.current.motionOn && closing.presence < 1 && birth.ready && holeOpacity > .001;
      const streamVisible = birth.ready && state.current.motionOn && holeOpacity > .001 && (gravityActive || returning || closing.presence < 1);
      deepSpace.material.uniforms.uTime.value = drift;
      const targetSkyPresence = state.current.mapActive ? .48 : introReveal;
      deepSpace.material.uniforms.uPresence.value = introMode || !state.current.motionOn ? targetSkyPresence : THREE.MathUtils.damp(deepSpace.material.uniforms.uPresence.value, targetSkyPresence, 4, dt);
      deepSpace.material.uniforms.uPull.value = pull;
      deepSpace.material.uniforms.uTarget.value.copy(gravityTarget);
      [starMaterial, galaxyMaterial, streakMaterial, brightMaterial].forEach((material) => {
        material.uniforms.uPull.value = pull;
        material.uniforms.uTime.value = gravityAge * .18;
        material.uniforms.uScale.value = height * renderer.getPixelRatio() * .5;
        material.uniforms.uHorizon.value = holeOpacity > .05 ? blackHole.group.scale.x * .5 : 0;
      });
      gravityStreaks.visible = pull > .01;
      feedingDust.visible = streamVisible;
      upperStreaks.visible = streamVisible;
      feedingMaterials.forEach((material) => {
        material.uniforms.uPull.value = streamVisible ? holeOpacity * THREE.MathUtils.smoothstep(gravityAge, 0, 2) * retreat.infall : 0;
        material.uniforms.uTravelScale.value = retreat.infall;
        material.uniforms.uTime.value = gravityAge;
        material.uniforms.uCameraWorld.value.copy(camera.matrixWorld);
        material.uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);
        material.uniforms.uScale.value = height * renderer.getPixelRatio() * .5;
        material.uniforms.uHorizon.value = blackHole.group.scale.x * .5;
        material.uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
      });
      distantMaterial.uniforms.uScale.value = height * renderer.getPixelRatio() * .5;
      distantMaterial.uniforms.uTime.value = drift;
      distantMaterial.uniforms.uMotion.value = state.current.motionOn ? 1 : 0;
      planetSystem.scale.setScalar(solarScale * (1 - pull * .94));
      planetSystem.position.copy(solarOrigin).lerp(gravityTarget, pull);
      planetSystem.rotation.z += pull * pull * 4;
      stellarLight.intensity = 34 * (1 - pull);
      // Project real bodies into one height-normalized clearance space, including visible rings.
      const openingEdge = !state.current.introActive && heroCopy && !heroCopy.inert && heroKicker ? heroKicker.getBoundingClientRect().top : null;
      const compactFlight = width < 1100 || camera.aspect < .9 || height < 620 || openingEdge !== null && openingEdge - headerHeight < 112;
      const portalX = compactFlight ? .48 : WORMHOLE_X;
      const requestedDelay = compactFlight ? COMPACT_PURSUIT_DELAY : PURSUIT_DELAY;
      if (bandDirty) {
        bandTop = Math.max(headerHeight + 16, (methodSteps?.getBoundingClientRect().bottom ?? height) + 16);
        bandBottom = Math.min(height - 24, (stackKicker?.getBoundingClientRect().top ?? 0) - 16);
        bandDirty = false;
      }
      const readingLane = readingChapter && bandBottom - bandTop >= 120;
      const noteBottom = compactFlight && openingEdge !== null && heroNote ? heroNote.getBoundingClientRect().bottom : height;
      const openingLane = compactFlight && openingEdge !== null && height - noteBottom >= (height < 620 ? 42 : 90);
      const shallowOpening = openingLane && height - noteBottom < 90;
      const boundedLane = readingLane || openingLane;
      const flightTop = openingLane ? noteBottom + (shallowOpening ? 4 : 12) : bandTop;
      const flightBottom = openingLane ? height - (shallowOpening ? 6 : 24) : bandBottom;
      const laneCenter = 1 - (flightTop + flightBottom) / height;
      const chapterAllowsFlight = !state.current.introActive && holeOpacity < .05 && !state.current.mapActive && (!readingChapter || readingLane);
      if (state.current.introActive || !state.current.motionOn) introExitHandled = false;
      else if (state.current.introProgress >= 100 && !introExitHandled) {
        // The chase belongs to the Henry galaxy opening, immediately after the search handoff.
        // Starting at zero keeps the first UFO entrance readable instead of parking it in the intro.
        pursuit.age = 0;
        pursuit.delay = requestedDelay;
        pursuit.interrupted = false;
        // A pre-hydration/Still pose is not a completed animated encounter.
        // Retire all of its state before starting the first moving pass.
        portalOpacity = 0;
        portalCycle = -1;
        flights.forEach(flight => { flight.presence = 0; flight.cycle = -1; });
        shots.forEach(shot => { shot.cycle = -1; shot.live = false; });
        introExitHandled = true;
      }
      if (!introMode) advancePursuit(pursuit, dt, Boolean(chapterAllowsFlight), state.current.motionOn, requestedDelay, portalOpacity < .001 && flights.every(flight => flight.presence < .001));
      const flightAllowed = !introMode && chapterAllowsFlight && !pursuit.interrupted && pursuit.delay === requestedDelay;
      const flightAge = introMode ? 0 : pursuit.age;
      const flightDelay = introMode ? requestedDelay : pursuit.delay;
      flights.forEach(({ model, pose }) => spacecraftPose(flightAge, state.current.motionOn, model.kind, pose, flightDelay));
      const flightActive = flights.some(({ pose, presence }) => pose.visible && flightAllowed || presence > 0);
      const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const obstacle = (object: THREE.Object3D, radius: number, index: number) => {
        object.getWorldPosition(flightWorld);
        flightView.copy(flightWorld).applyMatrix4(camera.matrixWorldInverse);
        flightWorld.project(camera);
        flightObstacles[index].x = flightWorld.x * camera.aspect;
        flightObstacles[index].y = flightWorld.y;
        flightObstacles[index].radius = radius / (tangent * Math.max(.1, -flightView.z)) * 1.12;
      };
      if (flightActive && solarVisibility > .05 && !introMode) {
        planetSystem.updateWorldMatrix(true, true);
        obstacle(stellarCore.group, .63 * stellarCore.group.scale.x * planetSystem.scale.x, 0);
        orbitPlanets.forEach(({ body, radius, ring }, index) => obstacle(body, radius * body.scale.x * planetSystem.scale.x * (ring.visible ? 1.93 : 1.3), index + 1));
        sectorNodes.forEach(({ body, size }, index) => {
          if (sectorSystem.visible) obstacle(body, size * body.scale.x * planetSystem.scale.x * 1.26, index + 6);
          else { flightObstacles[index + 6].x = 100; flightObstacles[index + 6].radius = 0; }
        });
        moonRecords.forEach((moon, index) => obstacle(moon.anchor, moon.size * orbitPlanets[moon.ownerIndex].body.scale.x * planetSystem.scale.x * 1.1, index + 11));
      } else if (introMode) {
        // The planets are intentionally hidden during the search. Keep the
        // arrival chase clean instead of routing a ship around stale silhouettes.
        celestialObstacles.forEach(body => { body.x = 100; body.y = 100; body.radius = 0; });
      } else if (solarVisibility <= .05) {
        celestialObstacles.forEach(body => { body.x = 100; body.radius = 0; });
      }
      flightObstacles[craftObstacle].radius = 0;
      flightObstacles[craftObstacle].x = 100;
      // During the arrival film the overlay owns the copy, so the craft may use
      // the full sky instead of being squeezed into the compact hero-text lane.
      const readingEdge = flightActive || portalOpacity > 0 ? openingEdge : null;
      const portalPixels = Math.min(38, width * .105, boundedLane ? (flightBottom - flightTop) / 2 - 2 : compactFlight || readingEdge === null ? 38 : Math.max(0, readingEdge - headerHeight - 28) / 3);
      const portalRadius = portalPixels / height * 2;
      const portalFloor = boundedLane ? 1 - (flightBottom - portalPixels) / height * 2 : compactFlight ? -1 + portalRadius + 32 / height : readingEdge === null ? .18 : 1 - (readingEdge - portalRadius * height / 2 - 12) / height * 2;
      const portalCeiling = boundedLane ? 1 - (flightTop + portalPixels) / height * 2 : compactFlight ? -.6 : 1 - (headerHeight + portalPixels + 10) / height * 2;
      const cycle = introMode ? 9001 : pursuit.cycle;
      if (portalCycle !== cycle) { portalCycle = cycle; portalSafe.visible = false; }
      routeSpacecraft(portalX * camera.aspect, boundedLane ? laneCenter : portalOpacity > .01 ? portalSafe.y : compactFlight ? -.78 : .64, portalRadius, celestialObstacles, portalFloor, portalCeiling, portalCandidate);
      if (portalOpacity < .01 || portalCandidate.visible && Math.abs(portalCandidate.y - portalSafe.y) < .1) Object.assign(portalSafe, portalCandidate);
      const portalClear = portalPixels >= (shallowOpening ? 12 : 24) && portalSafe.visible && celestialObstacles.every(body => Math.hypot(portalSafe.x - body.x, portalSafe.y - body.y) >= portalRadius + body.radius + .02);
      const portalTarget = flightAllowed && portalClear ? wormholePresence(flightAge, state.current.motionOn, flightDelay) : 0;
      portalOpacity = state.current.motionOn ? flightPresence(portalOpacity, portalTarget, dt) : 0;
      wormhole.group.visible = portalOpacity > .001;
      if (wormhole.group.visible) {
        holeRay.set(portalSafe.x / camera.aspect, portalSafe.y, .5).unproject(camera).sub(camera.position).normalize();
        wormhole.group.position.copy(camera.position).addScaledVector(holeRay, (-2.7 - camera.position.z) / holeRay.z);
        wormhole.group.quaternion.copy(camera.quaternion);
        wormhole.group.rotateY(-.3);
        wormhole.group.scale.setScalar(portalRadius * tangent * (camera.position.z + 2.7) * (.3 + portalOpacity * .7));
      }
      wormhole.material.uniforms.uTime.value = drift;
      wormhole.material.uniforms.uOpacity.value = portalOpacity;
      wormhole.rimMaterial.opacity = portalOpacity * .6;
      host.dataset.wormholeOpacity = portalOpacity.toFixed(4);
      host.dataset.wormholeX = ((portalSafe.x / camera.aspect * .5 + .5) * width).toFixed(2);
      host.dataset.wormholeY = ((-portalSafe.y * .5 + .5) * height).toFixed(2);
      host.dataset.wormholeRadius = (portalRadius * height / 2).toFixed(2);
      host.dataset.wormholeClear = String(portalClear);
      flights.forEach((flight, index) => {
        const { model, pose, safe, candidate } = flight;
        const cycle = introMode ? 9001 : pursuit.cycle;
        if (cycle !== flight.cycle) { flight.cycle = cycle; flight.retired = false; flight.portalEntry = null; }
        if (!state.current.motionOn) flight.retired = false;
        pose.x = FLIGHT_START_X + (pose.x - FLIGHT_START_X) / (WORMHOLE_X - FLIGHT_START_X) * (portalX - FLIGHT_START_X);
        if (pose.entry > 0 && flight.portalEntry === null) flight.portalEntry = portalOpacity > .35;
        // If the portal cannot fit, finish offscreen instead of shrinking into empty space.
        if (flight.portalEntry === false) {
          pose.x += pose.entry * .75;
          pose.depth += pose.entry * 4;
          pose.scale = 1;
        }
        const compactIntro = readingEdge !== null && width < 640;
        const widthRatio = compactIntro ? model.kind === "ufo" ? .11 : .13 : model.kind === "ufo" ? .14 : .17;
        const baseSize = Math.min(model.kind === "ufo" ? 76 : 90, Math.min(width, height) * widthRatio);
        const peakPerspective = (camera.position.z + 2.8) / (camera.position.z + .7);
        const availableHeight = boundedLane ? flightBottom - flightTop - 8 : compactFlight ? Math.max(84, height * .28 - 16) : readingEdge === null ? Infinity : Math.max(0, readingEdge - headerHeight - 30);
        // Reserve separation for both silhouettes even at their closest depth and in a narrow heading gap.
        const pairSpacing = flightDelay / 18 * (portalX - FLIGHT_START_X) * width * .5;
        const pairRadius = Math.max(0, (pairSpacing - .045 * height * .5) * .5);
        const size = Math.min(baseSize, Math.min(availableHeight * .5, pairRadius) * model.span / (model.radius * 1.12 * peakPerspective));
        const perspective = (camera.position.z + 2.8) / (camera.position.z - pose.depth);
        const projectedSize = size * perspective;
        const radius = projectedSize * model.radius / model.span / height * 2 * 1.12 * pose.scale;
        const previousX = safe.x, previousY = safe.y;
        const cruisingY = boundedLane ? laneCenter + (model.kind === "ufo" ? -.025 : .025) : compactFlight ? (model.kind === "ufo" ? -.84 : -.62) + Math.sin(drift * .5) * .015 : pose.y;
        const routeY = flight.portalEntry ? THREE.MathUtils.lerp(cruisingY, portalSafe.y, THREE.MathUtils.smoothstep(pose.entry, .4, 1)) : cruisingY;
        const desired = state.current.motionOn ? THREE.MathUtils.damp(previousY, routeY, 5, dt) : routeY;
        const floor = boundedLane ? 1 - flightBottom / height * 2 + radius : compactFlight ? -1 + radius + 32 / height : readingEdge === null ? .18 : 1 - (readingEdge - radius * height / 2 - 12) / height * 2;
        const ceiling = boundedLane ? 1 - flightTop / height * 2 - radius : compactFlight ? -.6 : 1 - (headerHeight + radius * height / 2 + 10) / height * 2;
        routeSpacecraft(pose.x * camera.aspect, desired, radius, flightObstacles, floor, ceiling, candidate);
        const continuous = flight.presence < .05 || Math.hypot(candidate.x - safe.x, candidate.y - safe.y) < .24;
        const minimumSize = shallowOpening ? 12 : openingLane ? 24 : 28;
        const canFly = flightAllowed && pose.visible && candidate.visible && size >= minimumSize && continuous;
        // Finish one graceful exit at the last safe pose; never flicker back within this pass.
        if (!canFly && flight.presence > 0 && state.current.motionOn) {
          if (!flight.retired) host.dataset[`${model.kind}ExitReason`] = !flightAllowed ? "protected" : !pose.visible ? "complete" : !candidate.visible ? "blocked" : !continuous ? "discontinuity" : "compact";
          flight.retired = true;
        }
        const targetPresence = canFly && !flight.retired ? pose.opacity : 0;
        flight.presence = state.current.motionOn ? flightPresence(flight.presence, targetPresence, dt) : targetPresence;
        model.group.visible = flight.presence > .001;
        if (canFly && !flight.retired) {
          const smoothing = 1 - Math.exp(-dt * 10);
          flight.velocity.x = THREE.MathUtils.lerp(flight.velocity.x, THREE.MathUtils.clamp((candidate.x - previousX) / Math.max(.001, dt), -.12, .12), smoothing);
          flight.velocity.y = THREE.MathUtils.lerp(flight.velocity.y, THREE.MathUtils.clamp((candidate.y - previousY) / Math.max(.001, dt), -.08, .08), smoothing);
          Object.assign(safe, candidate);
          flight.radius = radius;
          holeRay.set(safe.x / camera.aspect, safe.y, .5).unproject(camera).sub(camera.position).normalize();
          model.group.position.copy(camera.position).addScaledVector(holeRay, (pose.depth - camera.position.z) / holeRay.z);
          const shipHeight = 2 * tangent * (camera.position.z + 2.8);
          model.group.scale.setScalar(shipHeight / height * size / model.span * pose.scale);
          const bank = state.current.motionOn ? THREE.MathUtils.clamp(Math.atan2(safe.y - previousY, Math.max(.001, safe.x - previousX)), -.42, .42) : 0;
          flight.heading = state.current.motionOn ? THREE.MathUtils.damp(flight.heading, bank, 7, dt) : 0;
          model.group.rotation.set((model.kind === "ufo" ? .55 : .52) + pose.roll + flight.heading * .35, model.kind === "ufo" ? drift * .10 : pose.yaw, pose.pitch + flight.heading * .45);
        }
        model.hull.opacity = flight.presence; model.trim.opacity = flight.presence;
        model.glass.opacity = flight.presence * .84; model.light.opacity = flight.presence;
        model.flame.opacity = flight.presence * (state.current.motionOn ? .44 + Math.sin(drift * 7) * .04 : .2);
        if (index === 0 && model.group.visible) { flightObstacles[craftObstacle].x = safe.x; flightObstacles[craftObstacle].y = safe.y; flightObstacles[craftObstacle].radius = flight.radius; }
        host.dataset[`${model.kind}Opacity`] = flight.presence.toFixed(4);
        host.dataset[`${model.kind}Entry`] = pose.entry.toFixed(4);
        host.dataset[`${model.kind}Retired`] = String(flight.retired);
        host.dataset[model.kind === "ufo" ? "ufoX" : "scoutX"] = ((safe.x / camera.aspect * .5 + .5) * width).toFixed(2);
        host.dataset[model.kind === "ufo" ? "ufoY" : "scoutY"] = ((-safe.y * .5 + .5) * height).toFixed(2);
        host.dataset[model.kind === "ufo" ? "ufoClearance" : "scoutClearance"] = safe.clearance.toFixed(4);
        host.dataset[model.kind === "ufo" ? "ufoRadius" : "scoutRadius"] = (flight.radius * height / 2).toFixed(2);
        host.dataset[`${model.kind}Depth`] = pose.depth.toFixed(3);
        host.dataset[`${model.kind}Yaw`] = model.group.rotation.y.toFixed(3);
      });
      let visibleBolts = 0;
      const [lead, scout] = flights;
      if (lead.model.group.visible) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        lead.model.group.updateWorldMatrix(true, false);
        for (const point of lead.model.outline) {
          flightWorld.copy(point).applyMatrix4(lead.model.group.matrixWorld).project(camera);
          minX = Math.min(minX, flightWorld.x * camera.aspect); maxX = Math.max(maxX, flightWorld.x * camera.aspect);
          minY = Math.min(minY, flightWorld.y); maxY = Math.max(maxY, flightWorld.y);
        }
        Object.assign(ufoSilhouette, { x: (minX + maxX) / 2, y: (minY + maxY) / 2, radiusX: (maxX - minX) * .52, radiusY: (maxY - minY) * .52 });
      }
      host.dataset.ufoShotHull = JSON.stringify({ x: (ufoSilhouette.x / camera.aspect * .5 + .5) * width, y: (-ufoSilhouette.y * .5 + .5) * height, rx: ufoSilhouette.radiusX * height / 2, ry: ufoSilhouette.radiusY * height / 2 });
      const canShoot = state.current.motionOn && flightAllowed && !lead.retired && !scout.retired && lead.presence > .6 && scout.presence > .6 && lead.pose.entry === 0;
      const shotFloor = boundedLane ? 1 - flightBottom / height * 2 : -1 + 16 / height;
      const shotCeiling = boundedLane ? 1 - flightTop / height * 2 : compactFlight ? -.55 : 1 - (headerHeight + 10) / height * 2;
      scout.model.group.updateWorldMatrix(true, false);
      for (let index = 0; index < PURSUIT_SHOTS; index++) {
        const shot = shots[index], probe = shotProbes[index];
        const pulse = pursuitPulse(flightAge, index, flightDelay);
        if (shot.cycle !== pursuit.cycle && pulse >= 0) {
          shot.cycle = pursuit.cycle; shot.launched = false; shot.live = false;
          probe.reason = "not-ready";
          if (canShoot) {
            // Freeze a muzzle-to-tangent path at launch, never steer an airborne projectile.
            shot.start.set(.22, .01, index % 2 ? .20 : -.20).applyMatrix4(scout.model.group.matrixWorld);
            flightWorld.copy(shot.start).project(camera);
            shotFrom.x = flightWorld.x * camera.aspect; shotFrom.y = flightWorld.y;
            shotTarget.x = ufoSilhouette.x + lead.velocity.x * PURSUIT_SHOT_SECONDS * .8;
            shotTarget.y = ufoSilhouette.y + lead.velocity.y * PURSUIT_SHOT_SECONDS * .8;
            shotTarget.radiusX = ufoSilhouette.radiusX;
            shotTarget.radiusY = ufoSilhouette.radiusY;
            const gap = 6 / height;
            const preferredSide = pursuitShotSide(index, pursuit.cycle);
            for (const side of index % 2 ? [shots[index - 1].side] : [preferredSide, -preferredSide]) {
              pursuitMiss(shotFrom, shotTarget, index, shotEnd, side, gap);
              const dx = shotEnd.x - shotFrom.x, dy = shotEnd.y - shotFrom.y;
              const aimX = shotTarget.x - shotFrom.x, aimY = shotTarget.y - shotFrom.y;
              const angle = Math.acos(THREE.MathUtils.clamp((dx * aimX + dy * aimY) / (Math.hypot(dx, dy) * Math.hypot(aimX, aimY)), -1, 1));
              if (angle > .44) { probe.reason = "angle"; continue; }
              if (shotEnd.y < shotFloor || shotEnd.y > shotCeiling) { probe.reason = "lane"; continue; }
              if (!clearShot(shotFrom, shotEnd, celestialObstacles)) { probe.reason = "obstacle"; continue; }
              holeRay.set(shotEnd.x / camera.aspect, shotEnd.y, .5).unproject(camera).sub(camera.position).normalize();
              shot.end.copy(camera.position).addScaledVector(holeRay, (shot.start.z - camera.position.z) / holeRay.z);
              shot.direction.copy(shot.end).sub(shot.start).normalize();
              shot.length = 2 * tangent * (camera.position.z - shot.start.z) / height * THREE.MathUtils.clamp(width * .012, 10, 14) / 1.45;
              shot.side = side; shot.launched = true; shot.live = true;
              probe.reason = "launched"; probe.side = side;
              Object.assign(probe, { sx: (shotFrom.x / camera.aspect * .5 + .5) * width, sy: (-shotFrom.y * .5 + .5) * height, ex: (shotEnd.x / camera.aspect * .5 + .5) * width, ey: (-shotEnd.y * .5 + .5) * height, angle });
              break;
            }
          }
        }
        Object.assign(probe, { cycle: shot.cycle, launched: shot.launched, active: false, pulse });
        boltPose.scale.setScalar(0);
        if (!state.current.motionOn || !flightAllowed || pulse < 0) shot.live = false;
        if (shot.live) {
          boltPose.position.lerpVectors(shot.start, shot.end, pulse);
          boltPose.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, shot.direction);
          flightWorld.copy(boltPose.position).project(camera);
          const x = flightWorld.x * camera.aspect, y = flightWorld.y;
          // A moving obstacle can invalidate a shot after launch; retire, do not redirect it.
          const ufoCollision = ((x - ufoSilhouette.x) / (ufoSilhouette.radiusX + 2 / height)) ** 2 + ((y - ufoSilhouette.y) / (ufoSilhouette.radiusY + 2 / height)) ** 2 < 1;
          if (ufoCollision || celestialObstacles.some(body => Math.hypot(x - body.x, y - body.y) < body.radius + 2 / height)) { shot.live = false; probe.reason = "occluded"; }
          else {
            const envelope = Math.min(1, pulse * 14, (1 - pulse) * 10);
            boltPose.scale.setScalar(shot.length * Math.max(0, envelope));
            visibleBolts++;
            Object.assign(probe, { active: true, x: (flightWorld.x * .5 + .5) * width, y: (-flightWorld.y * .5 + .5) * height });
            host.dataset.boltX = probe.x.toFixed(2); host.dataset.boltY = probe.y.toFixed(2); host.dataset.boltRadius = "8";
          }
        }
        boltPose.updateMatrix();
        bolts.setMatrixAt(index, boltPose.matrix);
      }
      bolts.visible = visibleBolts > 0;
      bolts.instanceMatrix.needsUpdate = true;
      host.dataset.pursuitBolts = String(visibleBolts);
      host.dataset.pursuitShots = JSON.stringify(shotProbes);
      wanderer.visible = gravityActive && sequence.visitorVisible || restoring && visitorProgress > 0;
      const visitorPose = gravityVisitorPose(visitorProgress, sequence.index, camera.aspect, holeX, holeY);
      if (wanderer.visible) {
        if (visitorIndex !== sequence.index) {
          visitorIndex = sequence.index;
          visitors.forEach((visitor, index) => {
            const maps = wandererMaps[(visitorIndex + index) % wandererMaps.length];
            visitor.material.map = maps.map;
            visitor.material.bumpMap = maps.bump;
            visitor.ring.visible = (visitorIndex + index) % 3 === 2;
          });
        }
        holeRay.set(visitorPose.x, visitorPose.y, .5).unproject(camera).sub(camera.position).normalize();
        wanderer.position.copy(camera.position).addScaledVector(holeRay, (visitorPose.z - camera.position.z) / holeRay.z);
        wanderer.scale.setScalar(viewHeight * Math.min(width, height) / height * .24 * visitorPose.scale);
        wanderer.rotation.set(.18, gravityAge * .025, visitorPose.capture * .7);
        wanderer.updateMatrixWorld(true);
      }
      const visitorOpacity = wanderer.visible ? holeOpacity * THREE.MathUtils.smoothstep(visitorProgress, 0, .012) * (1 - THREE.MathUtils.smoothstep(visitorProgress, .82, 1)) : 0;
      visitors.forEach((visitor, index) => {
        const member = gravityVisitorMember(visitorProgress, index);
        const radius = .55 + index * .18;
        sampleOrbit(radius, member.phase + sequence.index * .67 + gravityAge * orbitalSpeed(radius) * .25, .08, visitorOrbit);
        visitorOrbit.z += member.depth;
        visitor.group.position.copy(visitorOrbit);
        visitor.group.scale.setScalar(member.scale);
        visitor.surface.rotation.y = gravityAge * .12 + index;
        visitor.group.getWorldPosition(projectedVisitor);
        visitorView.copy(projectedVisitor).applyMatrix4(camera.matrixWorldInverse);
        projectedVisitor.project(camera);
        const x = (projectedVisitor.x * .5 + .5) * width, y = (-projectedVisitor.y * .5 + .5) * height;
        const projectedRadius = visitor.radius * member.scale * wanderer.scale.x / (tangent * Math.max(.1, -visitorView.z)) * height / 2;
        const extent = projectedRadius * (visitor.ring.visible ? 1.93 : 1.26);
        const clearance = gravityReadingVisibility(x, y, extent, width, height, contactReading);
        const opacity = wanderer.visible && index < visitorGroup.count ? holeOpacity * member.opacity * clearance : 0;
        visitor.group.visible = opacity > .001;
        visitor.material.opacity = opacity;
        visitor.atmosphere.material.uniforms.uOpacity.value = opacity * .6;
        visitor.ring.material.opacity = opacity * .7;
        Object.assign(visitorProbes[index], { x, y, radius: projectedRadius, extent, depth: -visitorView.z, opacity });
      });
      visitorStar.group.getWorldPosition(projectedVisitor).project(camera);
      const starRadius = .24 * 1.6 * wanderer.scale.x / (tangent * (camera.position.z - visitorPose.z)) * height / 2;
      const starVisibility = gravityReadingVisibility((projectedVisitor.x * .5 + .5) * width, (-projectedVisitor.y * .5 + .5) * height, starRadius, width, height, contactReading);
      visitorStar.material.uniforms.uTime.value = gravityAge;
      visitorStar.material.uniforms.uOpacity.value = visitorOpacity * starVisibility * .65;
      visitorStar.aura.material.uniforms.uOpacity.value = visitorOpacity * starVisibility * .2;
      visitorLight.intensity = 5 * wanderer.scale.x ** 2;
      host.style.setProperty("--black-hole-strength", holeOpacity.toFixed(3));
      host.style.setProperty("--hole-growth", holeGrowth.toFixed(3));
      host.dataset.holeOpacity = holeOpacity.toFixed(3);
      host.dataset.closingPresence = closing.presence.toFixed(3);
      host.dataset.closingReturning = String(returning);
      host.dataset.contactProgress = contactProgress.get().toFixed(3);
      host.dataset.visitorProgress = visitorProgress.toFixed(3);
      host.dataset.dustTravelScale = flowMaterial.uniforms.uTravelScale.value.toFixed(3);
      host.dataset.solarScale = planetSystem.scale.x.toFixed(3);
      host.dataset.holeX = holeX.toFixed(3);
      host.dataset.holeY = String(holeY);
      host.dataset.holeDiameter = diameter.toFixed(1);
      host.dataset.pull = pull.toFixed(3);
      host.dataset.backgroundGalaxies = "3";
      host.dataset.nebulaModel = "volumetric-filaments";
      host.dataset.arrivalDepth = bridge.cameraDepth.toFixed(3);
      host.dataset.arrivalNebula = introReveal.toFixed(3);
      host.dataset.planetSurface = "opaque-terrain";
      host.dataset.solarVisibility = solarVisibility.toFixed(3);
      host.dataset.readingBlend = readingBlend.toFixed(3);
      host.dataset.solarChapter = state.current.contactVisible ? "contact" : state.current.mapActive ? "map" : readingChapter ? "reading" : "opening";
      planetSystem.updateWorldMatrix(true, true);
      orbitPlanets.forEach(({ body, radius }, index) => {
        body.getWorldPosition(projectedStar);
        flightView.copy(projectedStar).applyMatrix4(camera.matrixWorldInverse);
        projectedStar.project(camera);
        solarBodies[index].x = Number(((projectedStar.x * .5 + .5) * width).toFixed(1));
        solarBodies[index].y = Number(((-projectedStar.y * .5 + .5) * height).toFixed(1));
        solarBodies[index].radius = Number((radius * body.scale.x * planetSystem.scale.x / (tangent * Math.max(.1, -flightView.z)) * height / 2).toFixed(1));
      });
      host.dataset.solarBodies = JSON.stringify(solarBodies);
      moonRecords.forEach((moon, index) => {
        moon.anchor.getWorldPosition(projectedStar);
        flightView.copy(projectedStar).applyMatrix4(camera.matrixWorldInverse);
        projectedStar.project(camera);
        Object.assign(companionProbes[index], {
          x: (projectedStar.x * .5 + .5) * width,
          y: (-projectedStar.y * .5 + .5) * height,
          radius: moon.size * orbitPlanets[moon.ownerIndex].body.scale.x * planetSystem.scale.x / (tangent * Math.max(.1, -flightView.z)) * height / 2,
        });
      });
      host.dataset.companionBodies = JSON.stringify(companionProbes);
      host.dataset.companionTime = companionTime.toFixed(3);
      stellarCore.group.getWorldPosition(projectedStar);
      flightView.copy(projectedStar).applyMatrix4(camera.matrixWorldInverse);
      projectedStar.project(camera);
      const coreRadius = .63 * stellarCore.group.scale.x * planetSystem.scale.x / (tangent * Math.max(.1, -flightView.z)) * height / 2;
      const coreClearance = gravityReadingVisibility((projectedStar.x * .5 + .5) * width, (-projectedStar.y * .5 + .5) * height, coreRadius, width, height, contactReading);
      const coreReading = 1 - holeOpacity * (1 - coreClearance) * .84;
      stellarCore.material.uniforms.uOpacity.value = coreStrength * coreReading;
      stellarCore.aura.material.uniforms.uOpacity.value = .55 * coreStrength * coreReading;
      host.dataset.stellarX = ((projectedStar.x * .5 + .5) * width).toFixed(1);
      host.dataset.stellarY = ((-projectedStar.y * .5 + .5) * height).toFixed(1);
      host.dataset.stellarOpacity = stellarCore.material.uniforms.uOpacity.value.toFixed(3);
      host.dataset.gravityAge = gravityAge.toFixed(2);
      host.dataset.birthAge = birthAge.toFixed(2);
      host.dataset.holeGrowth = holeGrowth.toFixed(3);
      host.dataset.feedingDust = String(feedingDust.visible);
      host.dataset.gravityActive = String(gravityActive);
      host.dataset.gravityPhase = returning ? "return" : birth.ready ? sequence.phase : "birth";
      host.dataset.gravityCycle = String(sequence.index);
      host.dataset.gravityRest = String(GRAVITY_REST_SECONDS);
      host.dataset.visitorOpacity = visitorOpacity.toFixed(3);
      host.dataset.visitorCount = String(wanderer.visible ? visitorGroup.count : 0);
      host.dataset.visitorCapacity = "5";
      host.dataset.visitorDirection = visitorGroup.direction;
      host.dataset.visitorEntryX = ((visitorEntry.x + 1) / 2).toFixed(3);
      host.dataset.visitorEntryY = ((1 - visitorEntry.y) / 2).toFixed(3);
      host.dataset.visitorDepth = visitorPose.z.toFixed(3);
      host.dataset.visitorApproach = visitorPose.approach.toFixed(3);
      host.dataset.visitorCapture = visitorPose.capture.toFixed(3);
      host.dataset.visitorProbes = JSON.stringify(visitorProbes);
      host.dataset.backgroundSource = "volumetric-3d";
      host.dataset.spacecraftVisible = String(flights[0].model.group.visible);
      host.dataset.scoutVisible = String(flights[1].model.group.visible);
      host.dataset.spacecraftCapacity = "2";
      host.dataset.pursuitDelay = String(flightDelay);
      host.dataset.flightTime = flightAge.toFixed(2);
      host.dataset.flightCycle = String(pursuit.cycle);
      host.dataset.pursuitRest = String(PURSUIT_REST);
      host.dataset.flightBand = String(readingLane);
      host.dataset.flightBandTop = bandTop.toFixed(2);
      host.dataset.flightBandBottom = bandBottom.toFixed(2);
      host.dataset.pursuitPhase = introMode ? "scanning" : pursuit.interrupted ? "retiring" : flightAge >= pursuitEnd(flightDelay) ? "rest" : flightAllowed ? "flying" : "paused";
      host.dataset.brightStars = "18";
      host.dataset.dustFlow = returning ? "outward-return" : "inward";
      host.dataset.dustSources = "top,left,bottom,right";
      host.dataset.dustMotion = "orbital-accretion";
      host.dataset.blackHoleModel = "void-photon-flow";
      host.dataset.feedingDustCount = String(flowGeometry.getAttribute("position").count);
      host.dataset.distantStars = String(distantGeometry.drawRange.count);
      host.dataset.distantStarPull = "0.000";
      host.dataset.starTwinkle = distantMaterial.uniforms.uMotion.value ? "on" : "off";
      host.dataset.dustStreaks = String(upperStreakCount);
      const upperPhase = (gravityAge * .05 + flowSeeds[upperProbeIndex]) % 1;
      upperProbe.set(flowPositions[upperProbeIndex * 3], flowPositions[upperProbeIndex * 3 + 1], .5).applyMatrix4(camera.projectionMatrixInverse);
      upperProbe.multiplyScalar(flowPositions[upperProbeIndex * 3 + 2] / upperProbe.z).applyMatrix4(camera.matrixWorld);
      infallPoint(upperProbe, gravityTarget, upperPhase * retreat.infall, flowSeeds[upperProbeIndex], upperProbe).project(camera);
      host.dataset.upperDustX = ((upperProbe.x * .5 + .5) * width).toFixed(2);
      host.dataset.upperDustY = ((-upperProbe.y * .5 + .5) * height).toFixed(2);
      host.dataset.upperDustPhase = upperPhase.toFixed(3);
      if (streamVisible) dustProbes.forEach(probe => {
        const index = probe.index;
        const travel = ((gravityAge * .05 + flowSeeds[index]) % 1) * retreat.infall;
        probe.travel = Number(travel.toFixed(4));
        upperProbe.set(flowPositions[index * 3], flowPositions[index * 3 + 1], .5).applyMatrix4(camera.projectionMatrixInverse);
        upperProbe.multiplyScalar(flowPositions[index * 3 + 2] / upperProbe.z).applyMatrix4(camera.matrixWorld);
        infallPoint(upperProbe, gravityTarget, travel, flowSeeds[index], upperProbe).project(camera);
        probe.x = Number(((upperProbe.x * .5 + .5) * width).toFixed(2));
        probe.y = Number(((-upperProbe.y * .5 + .5) * height).toFixed(2));
      });
      host.dataset.dustProbes = streamVisible ? JSON.stringify(dustProbes) : "[]";
      host.dataset.absorptionRadius = flowMaterial.uniforms.uHorizon.value.toFixed(3);
      renderer.render(scene, camera);
      let visibleVisitors = 0;
      if (wanderer.visible) visitorProbes.forEach(probe => {
        if (probe.opacity > .1 && probe.x > 0 && probe.x < width && probe.y > 0 && probe.y < height) visibleVisitors++;
      });
      host.dataset.visibleVisitors = String(visibleVisitors);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.ready = "true";
      host.dataset.time = drift.toFixed(2);
      if (state.current.motionOn) frame = requestAnimationFrame(render);
    };
    const wake = () => { if (!frame) frame = requestAnimationFrame(render); };
    wakeRef.current = wake;
    const resize = () => {
      shots.forEach(shot => { shot.live = false; });
      bandDirty = true;
      headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 76;
      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      distantGeometry.setDrawRange(0, host.clientWidth < 700 ? COMPACT_STAR_COUNT : DISTANT_STAR_COUNT);
      deepSpace.material.uniforms.uResolution.value.set(host.clientWidth * renderer.getPixelRatio(), host.clientHeight * renderer.getPixelRatio());
      wake();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    if (methodSteps) observer.observe(methodSteps);
    if (stackKicker) observer.observe(stackKicker);
    const updateFlightBand = () => { bandDirty = true; wake(); };
    window.addEventListener("scroll", updateFlightBand, { passive: true });
    const visibilityTarget = host.parentElement ?? host;
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); }, { rootMargin: "100% 0px" });
    intersection.observe(visibilityTarget);
    const unsubscribe = progress.on("change", wake);
    const contextLost = (event: Event) => { event.preventDefault(); enhanced = false; host.dataset.fallback = "true"; cancelAnimationFrame(frame); updateChapter(); };
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
      window.removeEventListener("scroll", updateFlightBand);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (object instanceof THREE.InstancedMesh) object.dispose();
        mesh.geometry?.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose());
      });
      deepSpace.texture.dispose();
      planetTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
      wakeRef.current = () => {};
    };
  }, [progress, contactProgress]);

  return <div ref={hostRef} className="worldline-backdrop" aria-hidden="true"><canvas /><span className="black-hole-fallback" /></div>;
}
