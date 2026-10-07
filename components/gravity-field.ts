import * as THREE from "three";

export function infallPoint(source: THREE.Vector3, target: THREE.Vector3, travel: number, seed: number, out = new THREE.Vector3(), upper = false) {
  const t = THREE.MathUtils.clamp(travel, 0, 1);
  const x = source.x - target.x, y = source.y - target.y, z = source.z - target.z;
  const contraction = Math.pow(1 - t, 1.5);
  const startAngle = Math.atan2(y, x);
  const turn = upper ? THREE.MathUtils.clamp(startAngle - 1.72, 0, .55) : 2.8 + seed * .6;
  const angle = startAngle - Math.pow(t, 1.7) * turn;
  const radius = Math.hypot(x, y) * contraction;
  return out.set(target.x + Math.cos(angle) * radius, target.y + Math.sin(angle) * radius, target.z + z * contraction);
}

export function gravityMaterial(target: THREE.Vector3, size: number, streak = false, stream = false, sparkle = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTarget: { value: target }, uPull: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: size }, uHorizon: { value: 0 },
      ...(stream ? { uCameraWorld: { value: new THREE.Matrix4() }, uInverseProjection: { value: new THREE.Matrix4() } } : {}),
    },
    vertexShader: `
      attribute vec3 color;
      ${streak ? "attribute float aTail;" : ""}
      ${stream ? "attribute float aSeed; attribute float aUpper; uniform mat4 uCameraWorld; uniform mat4 uInverseProjection;" : ""}
      uniform vec3 uTarget;
      uniform float uPull;
      uniform float uTime;
      uniform float uScale;
      uniform float uSize;
      uniform float uHorizon;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        ${stream ? `vec4 sourceRay = uInverseProjection * vec4(position.xy, .5, 1.0);
        vec3 viewSource = sourceRay.xyz / sourceRay.w;
        viewSource *= position.z / viewSource.z;
        vec3 source = (uCameraWorld * vec4(viewSource, 1.0)).xyz;` : "vec3 source = (modelMatrix * vec4(position, 1.0)).xyz;"}
        float seed = ${stream ? "aSeed" : "fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453)"};
        float influence = smoothstep(.08, .24, seed);
        ${stream ? "float phase = fract(uTime * .05 + seed);" : ""}
        float travel = ${stream ? `max(0.0, phase ${streak ? "- aTail * .014" : ""})` : `clamp(uPull * influence * (1.18 + seed * .12) - seed * .12 ${streak ? "- aTail * uPull * .012" : ""}, 0.0, 1.0)`};
        vec3 delta = source - uTarget;
        float contraction = pow(1.0 - travel, 1.5);
        float startAngle = atan(delta.y, delta.x);
        float turn = ${stream ? "mix(2.8 + seed * .6, clamp(startAngle - 1.72, 0.0, .55), aUpper)" : "2.8 + seed * .6"};
        float angle = startAngle - pow(travel, 1.7) * turn;
        vec3 spiral = vec3(cos(angle), sin(angle), 0.0) * length(delta.xy) * contraction;
        spiral.z = delta.z * contraction;
        vec4 view = viewMatrix * vec4(uTarget + spiral, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(uSize * uScale / max(1.0, -view.z) * (1.0 + uPull * .6) ${stream ? "* mix(1.0, 1.85, aUpper)" : ""}, 1.0, ${sparkle ? "14.0" : "7.0"});
        vColor = color;
        vFade = (1.0 - smoothstep(.78, .96, ${stream ? "phase" : "travel"})) ${stream ? "* smoothstep(0.0, .10, phase) * uPull" : ""} ${streak ? `* mix(.8, .08, aTail) ${stream ? "" : "* uPull"}` : ""};
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
