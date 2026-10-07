import * as THREE from "three";

export function infallPoint(source: THREE.Vector3, target: THREE.Vector3, travel: number, seed: number, out = new THREE.Vector3()) {
  const t = THREE.MathUtils.clamp(travel, 0, 1);
  const x = source.x - target.x, y = source.y - target.y, z = source.z - target.z;
  const contraction = Math.pow(1 - t, 1.5);
  const angle = Math.atan2(y, x) - Math.pow(t, 1.7) * (2.8 + seed * .6);
  const radius = Math.hypot(x, y) * contraction;
  return out.set(target.x + Math.cos(angle) * radius, target.y + Math.sin(angle) * radius, target.z + z * contraction);
}

export function gravityMaterial(target: THREE.Vector3, size: number, streak = false, stream = false, sparkle = false) {
  return new THREE.ShaderMaterial({
    uniforms: { uTarget: { value: target }, uPull: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: size }, uHorizon: { value: 0 } },
    vertexShader: `
      attribute vec3 color;
      ${streak ? "attribute float aTail;" : ""}
      uniform vec3 uTarget;
      uniform float uPull;
      uniform float uTime;
      uniform float uScale;
      uniform float uSize;
      uniform float uHorizon;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec3 source = (modelMatrix * vec4(position, 1.0)).xyz;
        float seed = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);
        float influence = smoothstep(.08, .24, seed);
        float travel = ${stream ? "fract(uTime * .05 + seed)" : `clamp(uPull * influence * (1.18 + seed * .12) - seed * .12 ${streak ? "- aTail * uPull * .012" : ""}, 0.0, 1.0)`};
        vec3 delta = source - uTarget;
        float contraction = pow(1.0 - travel, 1.5);
        float angle = atan(delta.y, delta.x) - pow(travel, 1.7) * (2.8 + seed * .6);
        vec3 spiral = vec3(cos(angle), sin(angle), 0.0) * length(delta.xy) * contraction;
        spiral.z = delta.z * contraction;
        vec4 view = viewMatrix * vec4(uTarget + spiral, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(uSize * uScale / max(1.0, -view.z) * (1.0 + uPull * .6), 1.0, ${sparkle ? "14.0" : "7.0"});
        vColor = color;
        vFade = (1.0 - smoothstep(.78, .96, travel)) ${stream ? "* smoothstep(0.0, .10, travel) * uPull" : streak ? "* mix(.8, .08, aTail) * uPull" : ""};
        float horizonFade = smoothstep(uHorizon * .85, max(.001, uHorizon * 1.2), length(spiral));
        vFade *= mix(1.0, horizonFade, min(1.0, uPull * 1.8));
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        ${streak ? "float mask = 1.0;" : sparkle ? "vec2 p = abs(gl_PointCoord - .5); float core = 1.0 - smoothstep(.015, .21, length(p)); float rays = exp(-min(p.x,p.y) * 65.0) * (1.0 - smoothstep(.05,.5,max(p.x,p.y))); float mask = max(core, rays * .7);" : "float mask = 1.0 - smoothstep(.08, .5, length(gl_PointCoord - .5));"}
        gl_FragColor = vec4(vColor, mask * vFade * ${streak ? ".54" : ".65"});
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}
