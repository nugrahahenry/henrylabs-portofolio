import * as THREE from "three";

export const ARRIVAL_DURATION = 24000;
export const ARRIVAL_CHAPTERS = ["Universe", "Laniakea", "Local Group", "HenryLabs"] as const;
export function arrivalChapter(progress: number) {
  return progress < .32 ? 0 : progress < .56 ? 1 : progress < .78 ? 2 : 3;
}
export function arrivalCandidate(progress: number) {
  return progress < .12 ? 17 : progress < .22 ? 61 : 89;
}
export function arrivalPhase(progress: number) {
  return progress < .22 ? "searching" : progress < .32 ? "selected" : progress < .56 ? "mapping" : progress < .78 ? "cluster" : progress < .96 ? "locking" : "ready";
}
export function arrivalHandoff(progress: number) {
  const t = THREE.MathUtils.clamp((progress - .80) / .16, 0, 1);
  return t * t * (3 - 2 * t);
}
const ease = (value: number) => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const blend = (progress: number, from: number, to: number) => ease((progress - from) / (to - from));
const seed = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export const ARRIVAL_FLYBYS = 84;
export const ARRIVAL_COMPACT_FLYBYS = 42;

export function createArrivalCameraPath() {
  const times = [0, .10, .19, .30, .38];
  const eyes = [4, 9, 39, 11, 5, 18, -10, 0, 13, .8, 1.8, 7.8, .3, .7, 4];
  const aims = [0, 0, 0, 8, 3, 9, -6, -2, 5, 0, 0, 0, 0, 0, 0];
  const eyePath = new THREE.CubicInterpolant(times, eyes, 3);
  const aimPath = new THREE.CubicInterpolant(times, aims, 3);
  return (progress: number, eye: THREE.Vector3, aim: THREE.Vector3) => {
    let p = THREE.MathUtils.clamp(progress, 0, .96);
    if (p < .06) { const t = p / .06; p = .06 * (2 * t * t - t * t * t); }
    else if (p > .26 && p <= .30) { const t = (.30 - p) / .04; p = .30 - .04 * (2 * t * t - t * t * t); }
    eye.fromArray(eyePath.evaluate(Math.min(p, .3)));
    aim.fromArray(aimPath.evaluate(Math.min(p, .3)));
    if (p > .3) {
      // Logarithmic distance gives each nested scale its own readable approach without overshooting the origin.
      const t = ease((p - .3) / .66);
      const distance = Math.exp(THREE.MathUtils.lerp(Math.log(8.045), Math.log(.165), t));
      const yaw = .102 * (1 - t), pitch = .226 + Math.sin(t * Math.PI) * .22;
      eye.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(distance);
      aim.set(0, 0, 0);
    }
  };
}

// A stylized navigation atlas, not a claim that observable universes have spherical boundaries.
export function createArrivalField() {
  const scene = new THREE.Scene();
  const openingSky = new THREE.Color("#06091b");
  const deepSky = new THREE.Color("#15113a");
  const skyBackground = openingSky.clone();
  scene.background = skyBackground;
  const camera = new THREE.PerspectiveCamera(48, 1, .002, 180);
  const sampleCamera = createArrivalCameraPath();
  const positions = Array.from({ length: 128 }, (_, i) => {
    const y = 1 - (i + .5) / 128 * 2, a = i * 2.399963;
    const r = 12 + seed(i + 4) * 13, planar = Math.sqrt(1 - y * y);
    return new THREE.Vector3(Math.cos(a) * planar * r, y * r * .72, Math.sin(a) * planar * r);
  });
  positions[89].set(0, 0, 0);
  positions[17].set(8, 3, 9);
  positions[61].set(-6, -2, 5);
  const radii = positions.map((_, i) => i === 89 ? 2.4 : .65 + seed(i + 71) * .8);
  const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 }, uSelection: { value: 0 } },
    vertexShader: `attribute float aDestination; varying float vDestination; varying vec3 vNormal; varying vec3 vEye; varying vec3 vColor;
      void main(){ vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.); vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal); vEye=-p.xyz; vColor=instanceColor; vDestination=aDestination; gl_Position=projectionMatrix*p; }`,
    fragmentShader: `uniform float uTime; uniform float uFade; uniform float uSelection; varying float vDestination; varying vec3 vNormal; varying vec3 vEye; varying vec3 vColor;
      void main(){ vec3 n=normalize(vNormal); float rim=pow(1.-abs(dot(n,normalize(vEye))),2.6);
        float bands=pow(.5+.5*sin(n.y*22.+n.x*7.+uTime*.3),12.);
        float light=pow(max(0.,dot(n,normalize(vec3(-.6,.7,1.)))),12.);
        float emphasis=mix(1.,mix(.10,1.6,vDestination),uSelection);
        gl_FragColor=vec4(vColor*(.14+rim*1.5+bands*.12)+light*.7,(.10+rim*.68+light*.25)*uFade*emphasis);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 20), sphereMaterial, 128);
  bubbles.name = "universe-candidates";
  bubbles.geometry.setAttribute("aDestination", new THREE.InstancedBufferAttribute(new Float32Array(128).map((_, i) => Number(i === 89)), 1));
  const dummy = new THREE.Object3D();
  const palette = ["#67cbdc", "#b4afd9", "#e8c891", "#b9d8cc", "#d996b3"];
  positions.forEach((p, i) => {
    dummy.position.copy(p); dummy.scale.setScalar(radii[i]); dummy.updateMatrix();
    bubbles.setMatrixAt(i, dummy.matrix); bubbles.setColorAt(i, new THREE.Color(i === 89 ? "#6ee7f4" : palette[i % palette.length]));
  });
  scene.add(bubbles);

  const dots = (points: number[], colors: number[], size: number) => {
    const material = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: size }, uHeight: { value: 900 }, uOpacity: { value: 1 } },
      vertexShader: `attribute vec3 color; varying vec3 vColor; uniform float uSize; uniform float uHeight;
        void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(uSize*uHeight/max(.003,-p.z),1.,9.);gl_Position=projectionMatrix*p;}`,
      fragmentShader: `varying vec3 vColor;uniform float uOpacity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vColor,pow(1.-r,1.6)*uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points, 3)).setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const cloud = new THREE.Points(geometry, material);
    scene.add(cloud);
    return cloud;
  };
  // Two depth bands create the same scale cue as a true zoom-out: the distant field
  // is present immediately, while closer stars resolve as the target approaches.
  const farStarPoints: number[] = [], farStarColors: number[] = [];
  const nearStarPoints: number[] = [], nearStarColors: number[] = [];
  const starPalette = ["#e7e7ff", "#9edbff", "#eac5ff", "#f7dca3", "#b9c9ff"];
  for (let i = 0; i < 1500; i++) {
    const latitude = 1 - seed(i + 1400) * 2, angle = i * 2.399963, radius = 32 + seed(i + 1500) * 48;
    const planar = Math.sqrt(1 - latitude * latitude), x = Math.cos(angle) * planar * radius, y = latitude * radius, z = Math.sin(angle) * planar * radius;
    farStarPoints.push(x, y, z);
    const color = new THREE.Color(starPalette[i % starPalette.length]);
    farStarColors.push(color.r, color.g, color.b);
  }
  for (let i = 0; i < 420; i++) {
    const latitude = 1 - seed(i + 2400) * 2, angle = i * 2.399963, radius = 9 + seed(i + 2500) * 22;
    const planar = Math.sqrt(1 - latitude * latitude), x = Math.cos(angle) * planar * radius, y = latitude * radius, z = Math.sin(angle) * planar * radius;
    nearStarPoints.push(x, y, z);
    const color = new THREE.Color(starPalette[(i + 2) % starPalette.length]);
    nearStarColors.push(color.r, color.g, color.b);
  }
  const farStars = dots(farStarPoints, farStarColors, .045);
  const nearStars = dots(nearStarPoints, nearStarColors, .026);
  const flybyPositions: number[] = [], flybyColors: number[] = [], flybyPasses: number[] = [];
  const trailPositions: number[] = [], trailColors: number[] = [], trailPasses: number[] = [], trailAlpha: number[] = [];
  const eye = new THREE.Vector3(), aim = new THREE.Vector3(), before = new THREE.Vector3(), after = new THREE.Vector3();
  const direction = new THREE.Vector3(), viewDirection = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), point = new THREE.Vector3();
  for (let i = 0; i < ARRIVAL_FLYBYS; i++) {
    // Interleave the compact subset across the whole flight, not just its first half.
    const pass = .09 + ((i * 37) % ARRIVAL_FLYBYS) / ARRIVAL_FLYBYS * .74;
    sampleCamera(pass - .022, before, aim);
    sampleCamera(pass + .022, after, aim);
    const scale = Math.max(.001, before.distanceTo(after));
    direction.copy(after).sub(before).normalize();
    sampleCamera(pass, eye, aim);
    viewDirection.copy(aim).sub(eye).normalize();
    right.crossVectors(viewDirection, THREE.Object3D.DEFAULT_UP).normalize();
    up.crossVectors(right, viewDirection).normalize();
    const angle = i * 2.399963, radius = scale * (.06 + seed(i + 2900) * .17);
    // Keep the flyby just in front of the lens so it flashes through the frustum instead of clipping on its plane.
    point.copy(eye).addScaledVector(viewDirection, scale * (.06 + seed(i + 3100) * .06)).addScaledVector(right, Math.cos(angle) * radius).addScaledVector(up, Math.sin(angle) * radius);
    const color = new THREE.Color(starPalette[i % starPalette.length]);
    flybyPositions.push(...point.toArray()); flybyColors.push(color.r, color.g, color.b); flybyPasses.push(pass, scale);
    trailPositions.push(...point.toArray(), ...point.clone().addScaledVector(direction, scale * (.045 + seed(i + 3000) * .09)).toArray());
    trailColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    trailPasses.push(pass, scale, pass, scale); trailAlpha.push(.55, 0);
  }
  const passageUniforms = { uProgress: { value: 0 }, uHeight: { value: 900 }, uCompact: { value: 0 } };
  const passageVertex = `attribute vec3 color; attribute vec2 aPass; attribute float aAlpha;
    uniform float uProgress; uniform float uHeight; uniform float uCompact;
    varying vec3 vColor; varying float vAlpha;
    void main(){
      vec4 view=modelViewMatrix*vec4(position,1.); vec4 clip=projectionMatrix*view;
      vec2 ndc=clip.xy/max(.001,clip.w); float depth=-view.z/aPass.y;
      float gate=smoothstep(aPass.x-.12,aPass.x-.045,uProgress)*(1.-smoothstep(aPass.x+.02,aPass.x+.09,uProgress));
      float proximity=smoothstep(.04,.23,depth)*(1.-smoothstep(1.5,3.8,depth));
      float center=smoothstep(.18,.42,length(ndc));
      float reading=mix(1.,.12,(1.-smoothstep(-.2,.1,ndc.x))* (1.-smoothstep(-.25,.05,ndc.y)));
      reading*=mix(1.,smoothstep(-.25,.05,ndc.y),uCompact);
      vAlpha=gate*proximity*center*reading*aAlpha; vColor=color;
      gl_PointSize=clamp(.006*aPass.y*uHeight/max(.01,-view.z),1.2,4.2);
      gl_Position=clip;
    }`;
  const passageGeometry = (positions: number[], colors: number[], passes: number[], alpha: number[]) => new THREE.BufferGeometry()
    .setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
    .setAttribute("aPass", new THREE.Float32BufferAttribute(passes, 2))
    .setAttribute("aAlpha", new THREE.Float32BufferAttribute(alpha, 1));
  const passageMaterial = (core: boolean) => new THREE.ShaderMaterial({
    uniforms: passageUniforms, vertexShader: passageVertex,
    fragmentShader: `varying vec3 vColor; varying float vAlpha;
      void main(){float alpha=vAlpha;
        ${core ? "float r=length(gl_PointCoord-.5)*2.; if(r>1.)discard; alpha*=pow(1.-r,1.4);" : ""}
        gl_FragColor=vec4(vColor,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const flybys = new THREE.Points(passageGeometry(flybyPositions, flybyColors, flybyPasses, Array(ARRIVAL_FLYBYS).fill(.9)), passageMaterial(true));
  const trails = new THREE.LineSegments(passageGeometry(trailPositions, trailColors, trailPasses, trailAlpha), passageMaterial(false));
  flybys.name = "arrival-flybys"; trails.name = "arrival-trails";
  scene.add(flybys, trails);
  const particles: number[] = [], colors: number[] = [];
  positions.forEach((p, i) => {
    const c = new THREE.Color(palette[i % palette.length]);
    for (let j = 0; j < 75; j++) {
      const r = Math.sqrt(seed(i * 80 + j + 9)) * radii[i] * .83, a = j * 2.4 + r * 4;
      particles.push(p.x + Math.cos(a) * r, p.y + (seed(j * 13 + i) - .5) * r * .55, p.z + Math.sin(a) * r);
      colors.push(c.r, c.g, c.b);
    }
  });
  const interiors = dots(particles, colors, .055);

  // Every scale lives inside the selected parent. The camera visits actual nested geometry,
  // rather than dissolving between unrelated screens. Names describe an authored portfolio atlas.
  const superclusters: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
  for (let group = 0; group < 17; group++) {
    const center = group === 0 ? new THREE.Vector3() : new THREE.Vector3(
      Math.cos(group * 2.4) * (1.2 + seed(group) * .6),
      (seed(group + 30) - .5) * 2.3,
      Math.sin(group * 2.4) * (1 + seed(group + 20) * .7));
    const radius = group === 0 ? .9 : .22 + seed(group + 40) * .25;
    const points: number[] = [], shades: number[] = [];
    const tint = new THREE.Color(group === 0 ? "#efc95f" : palette[group % palette.length]);
    for (let i = 0; i < (group === 0 ? 2600 : 380); i++) {
      const arm = i % 7, t = seed(i + group * 700 + 59);
      const a = arm / 7 * Math.PI * 2 + Math.sin(t * 3 + arm) * .7;
      const r = Math.pow(t, .72) * radius, jitter = radius * (.025 + t * .03);
      points.push(center.x + Math.cos(a) * r + (seed(i + 77) - .5) * jitter,
        center.y + Math.sin(t * 4 + arm) * r * .35 + (seed(i + 71) - .5) * jitter,
        center.z + Math.sin(a) * r + (seed(i + 83) - .5) * jitter);
      const brightness = .55 + seed(i + 27) * .45;
      shades.push(tint.r * brightness, tint.g * brightness, tint.b * brightness);
    }
    const cloud = dots(points, shades, group === 0 ? .006 : .008);
    cloud.name = group === 0 ? "laniakea" : `supercluster-${group}`;
    superclusters.push(cloud);
  }
  const galaxyCenters = [new THREE.Vector3(), new THREE.Vector3(-.24, .085, -.07), new THREE.Vector3(.23, -.045, -.12)];
  for (let i = 3; i < 31; i++) {
    const a = i * 2.399963, r = .28 + seed(i + 510) * .48;
    galaxyCenters.push(new THREE.Vector3(Math.cos(a) * r, (seed(i + 470) - .5) * .48, Math.sin(a) * r));
  }
  const galaxies = galaxyCenters.map((center, index) => {
    const points: number[] = [], shades: number[] = [];
    const radius = index === 0 ? .072 : index < 3 ? .055 : .015 + seed(index + 110) * .026;
    const count = index === 0 ? 4600 : index < 3 ? 1200 : 180;
    const tilt = new THREE.Euler(index === 0 ? .34 : seed(index + 122) * 1.5, seed(index + 128) * .4, index * .77);
    const warm = new THREE.Color("#fff2c5"), cold = new THREE.Color(palette[index % palette.length]);
    const local = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const r = Math.pow(seed(i + index * 517 + 905), .7) * radius;
      const arm = i % 3, a = arm * Math.PI * 2 / 3 + r / radius * 5.8 + (seed(i + 243) - .5) * .55;
      local.set(Math.cos(a) * r, (seed(i + 273) - .5) * radius * .14 * (1 - r / radius), Math.sin(a) * r).applyEuler(tilt).add(center);
      points.push(local.x, local.y, local.z);
      const c = warm.clone().lerp(cold, Math.min(1, r / radius * 2));
      shades.push(c.r, c.g, c.b);
    }
    const cloud = dots(points, shades, index === 0 ? .00065 : .0024);
    cloud.name = ["henrylabs-galaxy", "university-galaxy", "client-galaxy"][index] ?? `local-galaxy-${index}`;
    return cloud;
  });
  const batch = (clouds: typeof superclusters, name: string, size: number) => {
    const points: number[] = [], colors: number[] = [];
    for (const cloud of clouds) {
      points.push(...cloud.geometry.getAttribute("position").array);
      colors.push(...cloud.geometry.getAttribute("color").array);
      scene.remove(cloud); cloud.geometry.dispose(); cloud.material.dispose();
    }
    const merged = dots(points, colors, size); merged.name = name;
    merged.userData.structures = clouds.length;
    return merged;
  };
  superclusters.splice(1, 16, batch(superclusters.slice(1), "other-superclusters", .008));
  galaxies.splice(1, 30, batch(galaxies.slice(1), "local-galaxies", .0024));
  const clouds = [interiors, farStars, nearStars, ...superclusters, ...galaxies];
  const projectCenters = Array.from({ length: 5 }, (_, i) => {
    const a = i / 5 * Math.PI * 2 + Math.PI / 2;
    return new THREE.Vector3(Math.cos(a) * .046, Math.sin(a) * .034, Math.sin(a) * .012 + .027);
  });
  const projectBodies = projectCenters.map((center, i) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.003, 20, 12), new THREE.MeshBasicMaterial({ color: palette[i], transparent: true, opacity: 0 }));
    mesh.position.copy(center); mesh.name = `arrival-project-${i}`; scene.add(mesh);
    return mesh;
  });
  const focusRing = new THREE.Mesh(new THREE.TorusGeometry(1, .006, 6, 96), new THREE.MeshBasicMaterial({ color: "#f4d696", transparent: true, opacity: .85, depthWrite: false }));
  scene.add(focusRing);
  const target = new THREE.Vector3(), projected = new THREE.Vector3();
  const labelAnchors = [new THREE.Vector3(), ...galaxyCenters.slice(0, 3).map(p => p.clone()), ...projectCenters.map(p => p.clone())];
  const labels = labelAnchors.map(() => ({ x: 0, y: 0, visible: false, opacity: 0 }));
  const update = (progress: number, aspect: number, height: number) => {
    const p = THREE.MathUtils.clamp(progress / 100, 0, 1);
    sampleCamera(p, camera.position, target);
    camera.aspect = aspect;
    camera.fov = aspect < .8 ? 65 : 48;
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    // Keep the subject above the bottom-aligned HTML readout on every viewport.
    camera.setViewOffset(aspect * height, height, 0, height * .14, aspect * height, height);
    camera.updateMatrixWorld();
    const compact = aspect * height < 600 || height < 500;
    passageUniforms.uProgress.value = p;
    passageUniforms.uHeight.value = height;
    passageUniforms.uCompact.value = Number(compact);
    flybys.geometry.setDrawRange(0, compact ? ARRIVAL_COMPACT_FLYBYS : ARRIVAL_FLYBYS);
    trails.geometry.setDrawRange(0, (compact ? ARRIVAL_COMPACT_FLYBYS : ARRIVAL_FLYBYS) * 2);
    const focus = arrivalCandidate(p), chapter = arrivalChapter(p);
    const selected = blend(p, .22, .29);
    const focusPosition = positions[focus].clone().lerp(target, blend(p, .285, .325));
    focusRing.position.copy(focusPosition);
    focusRing.quaternion.copy(camera.quaternion);
    const universeRadius = radii[focus] * 1.08;
    const focusRadius = p < .32
      ? universeRadius
      : THREE.MathUtils.lerp(.86, .12, blend(p, .54, .80));
    const galaxyRadius = THREE.MathUtils.lerp(.12, .072, blend(p, .76, .84));
    const readableFocusRadius = chapter === 1 ? focusRadius : chapter === 2 ? galaxyRadius : chapter === 3 ? .072 : focusRadius;
    focusRing.scale.setScalar(readableFocusRadius);
    focusRing.material.opacity = (chapter === 0 ? .5 + selected * .25 : .26) * (1 - blend(p, .85, .91));
    focusRing.material.color.set(focus === 89 ? "#efc95f" : "#94bbc9");
    const skyReveal = blend(p, .04, .64);
    skyBackground.lerpColors(openingSky, deepSky, skyReveal * .72);
    farStars.material.uniforms.uOpacity.value = .2 + skyReveal * .46 - blend(p, .84, 1) * .14;
    nearStars.material.uniforms.uOpacity.value = blend(p, .16, .7) * .52;
    farStars.material.uniforms.uSize.value = .035 + skyReveal * .02;
    nearStars.material.uniforms.uSize.value = .02 + blend(p, .25, .72) * .022;
    sphereMaterial.uniforms.uFade.value = 1 - blend(p, .22, .34);
    sphereMaterial.uniforms.uSelection.value = selected;
    sphereMaterial.uniforms.uTime.value = p * 18;
    interiors.material.uniforms.uOpacity.value = (1 - blend(p, .31, .40)) * (1 - selected * .8);
    superclusters.forEach((cloud, i) => {
      cloud.material.uniforms.uOpacity.value = blend(p, .26, .36) * (1 - blend(p, i === 0 ? .56 : .45, i === 0 ? .70 : .59)) * (i === 0 ? .9 : .7);
    });
    galaxies.forEach((cloud, i) => {
      cloud.material.uniforms.uOpacity.value = blend(p, .49, .61) * (i === 0 ? 1 : 1 - blend(p, .75, .87));
    });
    const projectScale = aspect < .8
      ? THREE.MathUtils.lerp(.72, 1, THREE.MathUtils.clamp((aspect - .45) / .35, 0, 1))
      : 1;
    projectBodies.forEach((body, i) => {
      body.position.set(projectCenters[i].x * projectScale, projectCenters[i].y * projectScale, projectCenters[i].z);
      body.material.opacity = blend(p, .82, .9) * .8;
    });
    for (const cloud of clouds) cloud.material.uniforms.uHeight.value = height;
    labelAnchors[0].copy(chapter === 0 ? positions[focus] : target);
    labels.forEach((label, i) => {
      if (i >= 4) {
        const center = projectCenters[i - 4];
        labelAnchors[i].set(center.x * projectScale, center.y * projectScale, center.z);
      }
      projected.copy(labelAnchors[i]).project(camera);
      label.x = (projected.x * .5 + .5) * aspect * height;
      label.y = (-projected.y * .5 + .5) * height;
      label.opacity = i === 0 ? 1 - blend(p, .56, .61) : i < 4 ? blend(p, .59, .65) * (1 - blend(p, .76, .81)) : blend(p, .84, .91);
      label.visible = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .88 && Math.abs(projected.y) < .83 && label.opacity > .01;
    });
    scene.visible = true;
    return focus;
  };
  return { scene, camera, update, labels, dispose() {
    scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (object instanceof THREE.InstancedMesh) object.dispose();
      mesh.geometry?.dispose();
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
    });
  } };
}
