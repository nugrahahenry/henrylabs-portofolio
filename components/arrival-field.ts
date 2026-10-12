import * as THREE from "three";

export const ARRIVAL_DURATION = 18000;
const ease = (value: number) => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const blend = (progress: number, from: number, to: number) => ease((progress - from) / (to - from));
const seed = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export const ARRIVAL_FLYBYS = 84;
export const ARRIVAL_COMPACT_FLYBYS = 42;

export function createArrivalCameraPath() {
  const times = [0, .12, .24, .43, .61, .78, .93];
  const eyes = [4, 9, 39, 11, 5, 18, -10, 0, 13, 3, 1.8, 8, .78, .46, 2.7, .34, .2, 2.08, .12, .1, 1.64];
  const aims = [0, 0, 0, 8, 3, 9, -6, -2, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const eyePath = new THREE.CubicInterpolant(times, eyes, 3);
  const aimPath = new THREE.CubicInterpolant(times, aims, 3);
  return (progress: number, eye: THREE.Vector3, aim: THREE.Vector3) => {
    let p = THREE.MathUtils.clamp(progress, 0, .93);
    // Continuous tangents through waypoints; only departure and final lock come to rest.
    if (p < .06) { const t = p / .06; p = .06 * (2 * t * t - t * t * t); }
    else if (p > .87) { const t = (.93 - p) / .06; p = .93 - .06 * (2 * t * t - t * t * t); }
    eye.fromArray(eyePath.evaluate(p));
    aim.fromArray(aimPath.evaluate(p));
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
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: `varying vec3 vNormal; varying vec3 vEye; varying vec3 vColor;
      void main(){ vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.); vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal); vEye=-p.xyz; vColor=instanceColor; gl_Position=projectionMatrix*p; }`,
    fragmentShader: `uniform float uTime; uniform float uFade; varying vec3 vNormal; varying vec3 vEye; varying vec3 vColor;
      void main(){ vec3 n=normalize(vNormal); float rim=pow(1.-abs(dot(n,normalize(vEye))),2.6);
        float bands=pow(.5+.5*sin(n.y*22.+n.x*7.+uTime*.3),12.);
        float light=pow(max(0.,dot(n,normalize(vec3(-.6,.7,1.)))),12.);
        gl_FragColor=vec4(vColor*(.14+rim*1.5+bands*.12)+light*.7,(.10+rim*.68+light*.25)*uFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 20), sphereMaterial, 128);
  const dummy = new THREE.Object3D();
  const palette = ["#67cbdc", "#b4afd9", "#e8c891", "#b9d8cc", "#d996b3"];
  positions.forEach((p, i) => {
    dummy.position.copy(p); dummy.scale.setScalar(radii[i]); dummy.updateMatrix();
    bubbles.setMatrixAt(i, dummy.matrix); bubbles.setColorAt(i, new THREE.Color(palette[i % palette.length]));
  });
  scene.add(bubbles);

  const dots = (points: number[], colors: number[], size: number) => {
    const material = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: size }, uHeight: { value: 900 }, uOpacity: { value: 1 } },
      vertexShader: `attribute vec3 color; varying vec3 vColor; uniform float uSize; uniform float uHeight;
        void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(uSize*uHeight/max(.003,-p.z),1.,9.);gl_Position=projectionMatrix*p;}`,
      fragmentShader: `varying vec3 vColor;uniform float uOpacity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vColor,pow(1.-r,1.6)*uOpacity);}`,
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
    const scale = Math.max(.025, before.distanceTo(after));
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

  // The destination contains a physical filament network and progressively smaller galaxy swarms.
  const nodes = Array.from({ length: 42 }, (_, i) => new THREE.Vector3((seed(i + 13) - .5) * 3.2, (seed(i + 57) - .5) * 2.8, (seed(i + 103) - .5) * 3.2));
  nodes[0].set(0, 0, 0);
  const webPositions: number[] = [], webColors: number[] = [], lines: number[] = [];
  nodes.forEach((node, i) => {
    const neighbours = nodes.map((other, j) => ({ j, d: node.distanceTo(other) })).filter(other => other.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
    neighbours.forEach(({ j }) => {
      lines.push(...node.toArray(), ...nodes[j].toArray());
      for (let n = 0; n < 24; n++) {
        const t = n / 24, jitter = .035;
        webPositions.push(THREE.MathUtils.lerp(node.x, nodes[j].x, t) + (seed(i * 100 + n) - .5) * jitter, THREE.MathUtils.lerp(node.y, nodes[j].y, t) + (seed(i * 50 + n) - .5) * jitter, THREE.MathUtils.lerp(node.z, nodes[j].z, t));
        webColors.push(.3 + t * .4, .55, .85);
      }
    });
  });
  const webDust = dots(webPositions, webColors, .006);
  const web = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lines, 3)), new THREE.LineBasicMaterial({ color: "#94bbc9", transparent: true, opacity: 0, depthWrite: false }));
  scene.add(web);
  const clusterPositions: number[] = [], clusterColors: number[] = [];
  for (let i = 0; i < 3200; i++) {
    const branch = i % 3, r = Math.pow(seed(i + 903), .7) * .24, a = i * 2.4 + r * 24;
    const cx = branch === 0 ? 0 : branch === 1 ? -.34 : .30;
    clusterPositions.push(cx + Math.cos(a) * r, (branch - 1) * .07 + (seed(i + 273) - .5) * .025 + Math.sin(a) * r * .35, Math.sin(a) * r);
    const c = new THREE.Color(palette[branch * 2]); clusterColors.push(c.r, c.g, c.b);
  }
  const cluster = dots(clusterPositions, clusterColors, .0016);
  const focusRing = new THREE.Mesh(new THREE.TorusGeometry(1, .006, 6, 96), new THREE.MeshBasicMaterial({ color: "#f4d696", transparent: true, opacity: .85, depthWrite: false }));
  scene.add(focusRing);
  const target = new THREE.Vector3();
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
    const focus = p < .18 ? 17 : p < .32 ? 61 : 89;
    focusRing.position.copy(positions[focus]); focusRing.quaternion.copy(camera.quaternion);
    const searchRing = 1 - blend(p, .44, .55);
    const lockRing = blend(p, .72, .92);
    focusRing.scale.setScalar(radii[focus] * (focus === 89 ? .72 + lockRing * .2 : 1.1) * (1 + Math.sin(p * 90) * .025));
    focusRing.material.opacity = Math.max(searchRing * .75, lockRing * .92);
    const skyReveal = blend(p, .04, .64);
    skyBackground.lerpColors(openingSky, deepSky, skyReveal * .72);
    farStars.material.uniforms.uOpacity.value = .2 + skyReveal * .46 - blend(p, .84, 1) * .14;
    nearStars.material.uniforms.uOpacity.value = blend(p, .16, .7) * .52;
    farStars.material.uniforms.uSize.value = .035 + skyReveal * .02;
    nearStars.material.uniforms.uSize.value = .02 + blend(p, .25, .72) * .022;
    sphereMaterial.uniforms.uFade.value = 1 - blend(p, .44, .59);
    sphereMaterial.uniforms.uTime.value = p * 18;
    interiors.material.uniforms.uOpacity.value = 1 - blend(p, .44, .59);
    web.material.opacity = blend(p, .39, .54) * (1 - blend(p, .68, .84)) * .24;
    webDust.material.uniforms.uOpacity.value = blend(p, .39, .54) * (1 - blend(p, .73, .88));
    cluster.material.uniforms.uOpacity.value = blend(p, .59, .78);
    for (const cloud of [interiors, webDust, cluster, farStars, nearStars]) cloud.material.uniforms.uHeight.value = height;
    scene.visible = true;
    return focus;
  };
  return { scene, camera, update, dispose() {
    scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (object instanceof THREE.InstancedMesh) object.dispose();
      mesh.geometry?.dispose();
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
    });
  } };
}
