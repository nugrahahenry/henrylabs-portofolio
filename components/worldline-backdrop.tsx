"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { projectWorlds, type ProjectId } from "./cosmic-canvas";
import { createAtmosphere, createPlanetMaps, createPlanetRing, projectPlanetKinds } from "./planet-materials";
import { gravityMaterial, infallPoint } from "./gravity-field";
import { advanceGravityAge, closingReturn, updateClosingScroll, gravityApproachAngle, gravityBirth, gravitySequence, gravityVisitors, gravityVisitorEntry, GRAVITY_REST_SECONDS } from "./gravity-sequence";
import { orbitGeometry, orbitalSpeed, sampleOrbit } from "./orbital-path";
import { createStellarCore } from "./stellar-core";
import { createDeepSpace } from "./deep-space";
import { createSpacecraft, spacecraftPose, routeSpacecraft, flightPresence, createPursuitBolts, pursuitPulse, pursuitMiss, clearShot, createWormhole, wormholePresence, advancePursuit, pursuitEnd, WORMHOLE_X, PURSUIT_DELAY, COMPACT_PURSUIT_DELAY, PURSUIT_REST } from "./spacecraft";
import { COMPACT_STAR_COUNT, DISTANT_STAR_COUNT, FEEDING_DUST_COUNT, createDistantStarMaterial, distantStarPoint, dustStreamSource } from "./ambient-field";

function createBlackHole() {
  const group = new THREE.Group();
  const horizon = new THREE.Mesh(new THREE.SphereGeometry(.5, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000001, transparent: true }));
  const diskMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, uResolution: { value: new THREE.Vector2(1, 1) }, uVoid: { value: new THREE.Vector3() } },
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
      uniform vec3 uVoid;
      varying vec2 vDisk;
      void main() {
        float apparentRadius = length(gl_FragCoord.xy - uVoid.xy) / max(1.0, uVoid.z);
        if (apparentRadius < .97) discard;
        float radius = length(vDisk);
        float angle = atan(vDisk.y, vDisk.x);
        float edge = smoothstep(.51, .59, radius) * (1.0 - smoothstep(.98, 1.7, radius));
        float flow = angle * 3.0 + log(radius) * 22.0 - uTime * .8;
        float ribbon = sin(flow + sin(angle * 7.0 + radius * 13.0) * .38);
        float detail = sin(radius * 170.0 + angle * 9.0 - uTime * 1.2);
        float heat = pow(clamp(1.4 - radius, 0.0, 1.0), 1.4);
        float filament = pow(.5 + .5 * sin(flow * 3.0), 8.0);
        float brightness = (.38 + ribbon * .20 + detail * .08 + filament * .4) * (1.0 + .55 * cos(angle - .7));
        vec3 color = mix(vec3(.08, .35, .85), vec3(1.0, .32, .08), smoothstep(.1,.6,heat));
        color = mix(color, vec3(1.0, .89, .57), smoothstep(.6,.84,heat));
        vec2 screen = vec2(gl_FragCoord.x / uResolution.x, 1.0 - gl_FragCoord.y / uResolution.y);
        float readingMask = clamp(smoothstep(.77, .94, screen.y) + smoothstep(.85, .99, screen.x), 0.0, 1.0);
        gl_FragColor = vec4(color * (brightness + heat * .9) * 1.4, edge * uStrength * mix(.18, 1.0, readingMask));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(.51, 1.7, 128, 5), diskMaterial);
  disk.rotation.set(1.16, 0, -.16);
  // A graded image of the far disk bends over the silhouette; no solid torus edge.
  const lensMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 } },
    vertexShader: `varying vec2 vLens; void main() { vLens = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform float uStrength; varying vec2 vLens;
      void main() {
        float r = length(vLens), a = atan(vLens.y, vLens.x);
        float outside = smoothstep(.498, .514, r);
        float photon = exp(-pow((r - .518) / .013, 2.0));
        float arcRadius = length(vec2(vLens.x, vLens.y * .92));
        float arc = exp(-pow((arcRadius - .575) / .055, 2.0)) * smoothstep(-.12,.32,vLens.y);
        float bands = .65 + .20 * sin(arcRadius * 240.0 + a * 4.0 - uTime) + .15 * sin(a * 19.0 + r * 93.0);
        float glow = exp(-max(0.0, r - .52) * 24.0) * .12;
        float beaming = .8 + .3 * cos(a - .5);
        vec3 light = vec3(1.0,.76,.35) * photon * 1.8 + mix(vec3(1.0,.26,.08),vec3(1.0,.82,.48),bands) * arc * bands * 1.6;
        light += vec3(.14,.32,.64) * glow;
        gl_FragColor = vec4(light * beaming, clamp(photon + arc + glow,0.0,1.0) * outside * uStrength);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), lensMaterial);
  lens.position.z = 0;
  horizon.renderOrder = 1;
  disk.renderOrder = 2;
  lens.renderOrder = 3;
  group.add(horizon, disk, lens);
  return { group, horizon, diskMaterial, lensMaterial };
}

export function WorldlineBackdrop({ activeId, motionOn, progress, contactProgress, contactVisible, mapActive }: {
  activeId: ProjectId;
  motionOn: boolean;
  progress: MotionValue<number>;
  contactProgress: MotionValue<number>;
  contactVisible: boolean;
  mapActive: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const state = useRef({ activeId, motionOn, contactVisible, mapActive });
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    state.current = { activeId, motionOn, contactVisible, mapActive };
    wakeRef.current();
  }, [activeId, motionOn, contactVisible, mapActive]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = host?.querySelector("canvas");
    if (!host || !canvas) return;

    let holeStrength = 0;
    let enhanced = false;
    const updateChapter = () => {
      holeStrength = THREE.MathUtils.smoothstep(contactProgress.get(), 0, .15);
      if (!enhanced) {
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
      return unsubscribeChapter;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    enhanced = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    const deepSpace = createDeepSpace();
    scene.add(deepSpace.volume);
    const flights = [createSpacecraft(), createSpacecraft("scout")].map((model) => ({ model, pose: spacecraftPose(0, false, model.kind), safe: { x: 0, y: .65, visible: false, clearance: 0 }, candidate: { x: 0, y: .65, visible: false, clearance: 0 }, heading: 0, radius: 0, presence: 0, retired: false, portalEntry: null as boolean | null, cycle: -1 }));
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
    const shotEnd = { x: 0, y: 0 }, shotTarget = { x: 0, y: 0, radius: 0 };
    let portalOpacity = 0, portalCycle = -1;
    const boltPose = new THREE.Object3D(), boltStart = new THREE.Vector3(), boltTarget = new THREE.Vector3(), boltDirection = new THREE.Vector3();
    const flightObstacles = Array.from({ length: 12 }, () => ({ x: 0, y: 0, radius: 0 }));
    const celestialObstacles = flightObstacles.slice(0, 11);
    const flightWorld = new THREE.Vector3(), flightView = new THREE.Vector3();
    const heroCopy = document.querySelector<HTMLElement>(".hero-copy");
    const heroKicker = document.querySelector<HTMLElement>(".hero-kicker");
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
      const material = new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.bump, bumpScale: .009, roughness: .86, metalness: 0, transparent: true });
      const surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 18), material);
      const atmosphere = createAtmosphere(radius, "#88c5d1");
      const { ring, texture } = createPlanetRing(radius);
      planetTextures.push(texture);
      group.add(surface, atmosphere, ring);
      wanderer.add(group);
      return { group, surface, material, atmosphere, ring };
    });
    const visitorStar = createStellarCore(.24);
    const visitorLight = new THREE.PointLight(0xffe1bd, 5, 8, 2);
    wanderer.add(visitorStar.group, visitorLight);
    scene.add(wanderer);
    const visitorOrigin = new THREE.Vector3();
    const visitorOffset = new THREE.Vector3();
    const visitorOrbit = new THREE.Vector3();
    const projectedVisitor = new THREE.Vector3();
    let visitorIndex = -1;

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
      return { pivot, body, surface, atmosphere, ring, cloud, radius, phase, orbitRadius: 1.45 + index * .64, index };
    });

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
    const pursuit = { age: 0, cycle: 0, delay: PURSUIT_DELAY, interrupted: false };
    let birthAge = 0;
    let gravityAge = 0;
    const closing = { peak: 0, presence: 0, returning: false };
    const retreatPose = { infall: 0, growth: 0, opacity: 0 };
    let solarVisibility = 1;
    let readingBlend = 0;
    const solarBodies = orbitPlanets.map(() => ({ x: 0, y: 0, radius: 0 }));
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
      const drift = state.current.motionOn ? elapsed : 0;
      starField.rotation.y = drift * .004 + scroll * .08;
      stars.rotation.z = Math.sin(drift * .02) * .018;
      galaxyDust.rotation.y = drift * .006 + scroll * .035;
      galaxyDust.rotation.z = Math.sin(drift * .012) * .018;
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
      planetSystem.visible = solarVisibility > .005;
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
        surface.material.opacity = solarVisibility;
        atmosphere.material.uniforms.uOpacity.value = .6 * solarVisibility;
        ring.material.opacity = (selected ? .9 : .7) * solarVisibility;
        if (cloud) { cloud.rotation.y = drift * .013; cloud.material.opacity = .65 * solarVisibility; }
      });
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
      camera.position.z = 6.8 - scroll * .42;
      camera.lookAt(0, 0, -3.8);
      camera.updateMatrixWorld();

      // Screen-space anchoring keeps the terminal landmark out of the hero and reading center.
      const width = host.clientWidth;
      const height = host.clientHeight;
      const portrait = width < height;
      const holeY = height < 620 ? .88 : portrait ? .9 : .87;
      const contactActive = state.current.motionOn && state.current.contactVisible && holeStrength > .05 && !closing.returning && closing.presence === 1;
      birthAge = advanceGravityAge(birthAge, delta, contactActive);
      const birth = state.current.motionOn ? gravityBirth(birthAge) : { growth: 1, ready: true };
      const holeGrowth = birth.growth * retreat.growth;
      const holeX = THREE.MathUtils.lerp(.92, 1.01, holeGrowth);
      holeRay.set(holeX * 2 - 1, 1 - holeY * 2, .5).unproject(camera).sub(camera.position).normalize();
      blackHole.group.position.copy(camera.position).addScaledVector(holeRay, (-4.8 - camera.position.z) / holeRay.z);
      blackHole.group.quaternion.copy(camera.quaternion);
      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z + 4.8);
      const diameter = Math.min(width * .95, height * .8);
      blackHole.group.scale.setScalar(viewHeight * diameter / height * (.08 + holeGrowth * .92));
      blackHole.group.visible = holeOpacity > .001;
      blackHole.diskMaterial.uniforms.uTime.value = drift * .35;
      blackHole.diskMaterial.uniforms.uStrength.value = holeOpacity;
      blackHole.diskMaterial.uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
      blackHole.diskMaterial.uniforms.uVoid.value.set(holeX * width * renderer.getPixelRatio(), (1 - holeY) * height * renderer.getPixelRatio(), diameter * (.08 + holeGrowth * .92) * .5 * renderer.getPixelRatio());
      blackHole.horizon.material.opacity = holeOpacity;
      blackHole.lensMaterial.uniforms.uTime.value = drift * .35;
      blackHole.lensMaterial.uniforms.uStrength.value = holeOpacity;
      gravityTarget.copy(blackHole.group.position);
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
      deepSpace.material.uniforms.uPresence.value = THREE.MathUtils.damp(deepSpace.material.uniforms.uPresence.value, state.current.mapActive ? .48 : 1, 4, dt);
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
      const compactFlight = width < 1100 || camera.aspect < .9 || height < 620;
      const portalX = compactFlight ? .48 : WORMHOLE_X;
      const requestedDelay = compactFlight ? COMPACT_PURSUIT_DELAY : PURSUIT_DELAY;
      const compactOpening = compactFlight && heroCopy && !heroCopy.inert;
      if (bandDirty) {
        bandTop = Math.max(headerHeight + 16, (methodSteps?.getBoundingClientRect().bottom ?? height) + 16);
        bandBottom = Math.min(height - 24, (stackKicker?.getBoundingClientRect().top ?? 0) - 16);
        bandDirty = false;
      }
      const readingLane = readingChapter && bandBottom - bandTop >= 120;
      const laneCenter = 1 - (bandTop + bandBottom) / height;
      const chapterAllowsFlight = holeOpacity < .05 && !state.current.mapActive && !compactOpening && (!readingChapter || readingLane);
      advancePursuit(pursuit, dt, Boolean(chapterAllowsFlight), state.current.motionOn, requestedDelay, portalOpacity < .001 && flights.every(flight => flight.presence < .001));
      const flightAllowed = chapterAllowsFlight && !pursuit.interrupted && pursuit.delay === requestedDelay;
      const flightAge = pursuit.age, flightDelay = pursuit.delay;
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
      if (flightActive && solarVisibility > .05) {
        planetSystem.updateWorldMatrix(true, true);
        obstacle(stellarCore.group, .63 * stellarCore.group.scale.x * planetSystem.scale.x, 0);
        orbitPlanets.forEach(({ body, radius, ring }, index) => obstacle(body, radius * body.scale.x * planetSystem.scale.x * (ring.visible ? 1.93 : 1.3), index + 1));
        sectorNodes.forEach(({ body, size }, index) => {
          if (sectorSystem.visible) obstacle(body, size * body.scale.x * planetSystem.scale.x * 1.26, index + 6);
          else { flightObstacles[index + 6].x = 100; flightObstacles[index + 6].radius = 0; }
        });
      } else if (solarVisibility <= .05) {
        celestialObstacles.forEach(body => { body.x = 100; body.radius = 0; });
      }
      flightObstacles[11].radius = 0;
      flightObstacles[11].x = 100;
      const readingEdge = (flightActive || portalOpacity > 0) && heroCopy && !heroCopy.inert && heroKicker ? heroKicker.getBoundingClientRect().top : null;
      const portalPixels = Math.min(38, width * .105, readingEdge === null ? 38 : Math.max(0, readingEdge - headerHeight - 28) / 3);
      const portalRadius = portalPixels / height * 2;
      const portalFloor = readingLane ? 1 - (bandBottom - portalPixels) / height * 2 : compactFlight ? -1 + portalRadius + 32 / height : readingEdge === null ? .18 : 1 - (readingEdge - portalRadius * height / 2 - 12) / height * 2;
      const portalCeiling = readingLane ? 1 - (bandTop + portalPixels) / height * 2 : compactFlight ? -.6 : 1 - (headerHeight + portalPixels + 10) / height * 2;
      const cycle = pursuit.cycle;
      if (portalCycle !== cycle) { portalCycle = cycle; portalSafe.visible = false; }
      routeSpacecraft(portalX * camera.aspect, readingLane ? laneCenter : portalOpacity > .01 ? portalSafe.y : compactFlight ? -.78 : .64, portalRadius, celestialObstacles, portalFloor, portalCeiling, portalCandidate);
      if (portalOpacity < .01 || portalCandidate.visible && Math.abs(portalCandidate.y - portalSafe.y) < .1) Object.assign(portalSafe, portalCandidate);
      const portalClear = portalPixels >= 24 && portalSafe.visible && celestialObstacles.every(body => Math.hypot(portalSafe.x - body.x, portalSafe.y - body.y) >= portalRadius + body.radius + .02);
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
        const cycle = pursuit.cycle;
        if (cycle !== flight.cycle) { flight.cycle = cycle; flight.retired = false; flight.portalEntry = null; }
        if (!state.current.motionOn) flight.retired = false;
        pose.x = -1.15 + (pose.x + 1.15) / (WORMHOLE_X + 1.15) * (portalX + 1.15);
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
        const availableHeight = readingLane ? bandBottom - bandTop - 8 : readingEdge === null ? Infinity : Math.max(0, readingEdge - headerHeight - 30);
        // Reserve separation for both silhouettes even at their closest depth and in a narrow heading gap.
        const pairSpacing = flightDelay / 18 * (portalX + 1.15) * width * .5;
        const pairRadius = Math.max(0, (pairSpacing - .045 * height * .5) * .5);
        const size = Math.min(baseSize, Math.min(availableHeight * .5, pairRadius) * model.span / (model.radius * 1.12 * peakPerspective));
        const perspective = (camera.position.z + 2.8) / (camera.position.z - pose.depth);
        const projectedSize = size * perspective;
        const radius = projectedSize * model.radius / model.span / height * 2 * 1.12 * pose.scale;
        const previousX = safe.x, previousY = safe.y;
        const cruisingY = readingLane ? laneCenter + (model.kind === "ufo" ? -.025 : .025) : compactFlight ? (model.kind === "ufo" ? -.84 : -.62) + Math.sin(drift * .5) * .015 : pose.y;
        const routeY = flight.portalEntry ? THREE.MathUtils.lerp(cruisingY, portalSafe.y, THREE.MathUtils.smoothstep(pose.entry, .4, 1)) : cruisingY;
        const desired = state.current.motionOn ? THREE.MathUtils.damp(previousY, routeY, 5, dt) : routeY;
        const floor = readingLane ? 1 - bandBottom / height * 2 + radius : compactFlight ? -1 + radius + 32 / height : readingEdge === null ? .18 : 1 - (readingEdge - radius * height / 2 - 12) / height * 2;
        const ceiling = readingLane ? 1 - bandTop / height * 2 - radius : compactFlight ? -.6 : 1 - (headerHeight + radius * height / 2 + 10) / height * 2;
        routeSpacecraft(pose.x * camera.aspect, desired, radius, flightObstacles, floor, ceiling, candidate);
        const continuous = flight.presence < .05 || Math.hypot(candidate.x - safe.x, candidate.y - safe.y) < .24;
        const canFly = flightAllowed && pose.visible && candidate.visible && size >= 28 && continuous;
        // Finish one graceful exit at the last safe pose; never flicker back within this pass.
        if (!canFly && flight.presence > 0 && state.current.motionOn) {
          if (!flight.retired) host.dataset[`${model.kind}ExitReason`] = !flightAllowed ? "protected" : !pose.visible ? "complete" : !candidate.visible ? "blocked" : !continuous ? "discontinuity" : "compact";
          flight.retired = true;
        }
        const targetPresence = canFly && !flight.retired ? pose.opacity : 0;
        flight.presence = state.current.motionOn ? flightPresence(flight.presence, targetPresence, dt) : targetPresence;
        model.group.visible = flight.presence > .001;
        if (canFly && !flight.retired) {
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
        if (index === 0 && model.group.visible) { flightObstacles[11].x = safe.x; flightObstacles[11].y = safe.y; flightObstacles[11].radius = flight.radius; }
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
      const canShoot = state.current.motionOn && flightAllowed && !lead.retired && !scout.retired && lead.presence > .6 && scout.presence > .6 && lead.pose.entry === 0;
      Object.assign(shotTarget, lead.safe, { radius: lead.radius + .02 });
      for (let index = 0; index < 3; index++) {
        pursuitMiss(scout.safe, shotTarget, index, shotEnd);
        const clear = canShoot && clearShot(scout.safe, shotEnd, flightObstacles);
        const pulse = clear ? pursuitPulse(flightAge, index, flightDelay) : -1;
        const size = pulse < 0 ? 0 : Math.sin(pulse * Math.PI);
        boltPose.scale.set(size, size * .24, size);
        if (size > 0) {
          holeRay.set(shotEnd.x / camera.aspect, shotEnd.y, .5).unproject(camera).sub(camera.position).normalize();
          boltTarget.copy(camera.position).addScaledVector(holeRay, (scout.pose.depth - camera.position.z) / holeRay.z);
          boltDirection.copy(boltTarget).sub(scout.model.group.position).normalize();
          boltStart.copy(scout.model.group.position).addScaledVector(boltDirection, scout.model.group.scale.x * .58);
          boltPose.position.lerpVectors(boltStart, boltTarget, pulse);
          boltPose.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, boltDirection);
          visibleBolts++;
          flightWorld.copy(boltPose.position).project(camera);
          host.dataset.boltX = ((flightWorld.x * .5 + .5) * width).toFixed(2);
          host.dataset.boltY = ((-flightWorld.y * .5 + .5) * height).toFixed(2);
          host.dataset.boltRadius = "8";
        }
        boltPose.updateMatrix();
        bolts.setMatrixAt(index, boltPose.matrix);
      }
      bolts.visible = visibleBolts > 0;
      bolts.instanceMatrix.needsUpdate = true;
      host.dataset.pursuitBolts = String(visibleBolts);
      wanderer.visible = gravityActive && sequence.visitorVisible || restoring && visitorProgress > 0;
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
        holeRay.set(visitorEntry.x, visitorEntry.y, .5).unproject(camera).sub(camera.position).normalize();
        visitorOrigin.copy(camera.position).addScaledVector(holeRay, (visitorEntry.z - camera.position.z) / holeRay.z);
        visitorOffset.copy(visitorOrigin).sub(gravityTarget);
        const contraction = Math.pow(1 - visitorProgress, 1.3);
        const angle = gravityApproachAngle(Math.atan2(visitorOffset.y, visitorOffset.x), visitorProgress);
        const radius = Math.hypot(visitorOffset.x, visitorOffset.y) * contraction;
        wanderer.position.set(gravityTarget.x + Math.cos(angle) * radius, gravityTarget.y + Math.sin(angle) * radius, gravityTarget.z + visitorOffset.z * contraction);
        wanderer.scale.setScalar(viewHeight * Math.min(width, height) / height * .14 * (1 - visitorProgress * .78));
        wanderer.rotation.set(.18, gravityAge * .04, visitorProgress * .7);
      }
      const visitorOpacity = wanderer.visible ? holeOpacity * THREE.MathUtils.smoothstep(visitorProgress, 0, .012) * (1 - THREE.MathUtils.smoothstep(visitorProgress, .82, 1)) : 0;
      visitors.forEach((visitor, index) => {
        visitor.group.visible = index < visitorGroup.count;
        const radius = .55 + index * .18;
        sampleOrbit(radius, index * 2.4 + gravityAge * orbitalSpeed(radius) * .35, .08, visitorOrbit);
        visitor.group.position.copy(visitorOrbit);
        visitor.surface.rotation.y = gravityAge * .12 + index;
        visitor.material.opacity = visitorOpacity;
        visitor.atmosphere.material.uniforms.uOpacity.value = visitorOpacity * .6;
        visitor.ring.material.opacity = visitorOpacity * .7;
      });
      visitorStar.material.uniforms.uTime.value = gravityAge;
      visitorStar.material.uniforms.uOpacity.value = visitorOpacity;
      visitorStar.aura.material.uniforms.uOpacity.value = visitorOpacity * .4;
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
      stellarCore.group.getWorldPosition(projectedStar).project(camera);
      host.dataset.stellarX = ((projectedStar.x * .5 + .5) * width).toFixed(1);
      host.dataset.stellarY = ((-projectedStar.y * .5 + .5) * height).toFixed(1);
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
      host.dataset.pursuitPhase = pursuit.interrupted ? "retiring" : flightAge >= pursuitEnd(flightDelay) ? "rest" : flightAllowed ? "flying" : "paused";
      host.dataset.brightStars = "18";
      host.dataset.dustFlow = returning ? "outward-return" : "inward";
      host.dataset.dustSources = "top,left,bottom,right";
      host.dataset.dustMotion = "orbital-accretion";
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
      if (wanderer.visible && visitorOpacity > .1) visitors.forEach((visitor, index) => {
        visitor.group.getWorldPosition(projectedVisitor).project(camera);
        if (index < visitorGroup.count && Math.abs(projectedVisitor.x) < 1 && Math.abs(projectedVisitor.y) < 1 && projectedVisitor.z < 1) visibleVisitors++;
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
