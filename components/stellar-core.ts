import * as THREE from "three";

const vertexShader = `
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vLocal = position;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`;

export function createStellarAura(radius: number, color: THREE.ColorRepresentation) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uOpacity: { value: .3 } },
    vertexShader,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      varying vec3 vLocal;
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
        float rim = pow(1.0 - facing, 3.2);
        vec3 p = normalize(vLocal);
        float filaments = .76 + .24 * sin(p.x * 37.0 + p.y * 29.0 + p.z * 17.0 + uTime * .12);
        gl_FragColor = vec4(uColor * 1.3, rim * filaments * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.24, 32, 24), material);
  return { shell, material };
}

export function createStellarCore(radius: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } }, vertexShader,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying vec3 vLocal;
      varying vec3 vWorld;
      varying vec3 vNormal;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float noise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 p = normalize(vLocal);
        vec3 flow = p * 28.0 + vec3(uTime * .035, -uTime * .018, 0.0);
        float cells = noise(flow) * .56 + noise(flow * 2.4) * .28 + noise(flow * 6.1) * .16;
        float spot = smoothstep(.72, .87, noise(p * 15.0 + vec3(.3, uTime * .008, .8)));
        float facing = max(0.0, dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
        vec3 heat = mix(vec3(.95, .28, .025), vec3(3.8, 2.3, .7), smoothstep(.18, .78, cells));
        heat *= (1.0 - spot * .78) * (.58 + .42 * sqrt(facing));
        gl_FragColor = vec4(heat * 1.7, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `, transparent: true, depthWrite: false,
  });
  const group = new THREE.Group();
  const surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), material);
  const aura = createStellarAura(radius, "#ffc46b");
  aura.shell.scale.setScalar(1.3);
  aura.material.uniforms.uOpacity.value = .55;
  group.add(surface, aura.shell);
  return { group, surface, material, aura };
}
