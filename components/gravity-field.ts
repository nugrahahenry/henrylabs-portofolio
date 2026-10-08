import * as THREE from "three";

export function dustWarmth(distance: number, horizon: number) {
  return horizon > 0 ? 1 - THREE.MathUtils.smoothstep(distance, horizon * 1.25, horizon * 3.25) : 0;
}

export function infallPoint(source: THREE.Vector3, target: THREE.Vector3, travel: number, seed: number, out = new THREE.Vector3()) {
  const t = THREE.MathUtils.clamp(travel, 0, 1);
  const x = source.x - target.x, y = source.y - target.y, z = source.z - target.z;
  const contraction = Math.pow(1 - t, 1.35);
  const startAngle = Math.atan2(y, x);
  const turn = Math.PI * 2 * (1.15 + seed * .35);
  const angle = startAngle - t * (.75 + t * .25) * turn;
  const radius = Math.hypot(x, y) * contraction;
  return out.set(target.x + Math.cos(angle) * radius, target.y + Math.sin(angle) * radius, target.z + z * contraction);
}

export function gravityMaterial(target: THREE.Vector3, size: number, streak = false, stream = false, sparkle = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTarget: { value: target }, uPull: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: size }, uHorizon: { value: 0 },
      ...(stream ? { uCameraWorld: { value: new THREE.Matrix4() }, uInverseProjection: { value: new THREE.Matrix4() }, uResolution: { value: new THREE.Vector2(1, 1) }, uTravelScale: { value: 1 } } : {}),
    },
    vertexShader: `
      attribute vec3 color;
      ${streak ? "attribute float aTail;" : ""}
      ${stream ? "attribute float aSeed; uniform mat4 uCameraWorld; uniform mat4 uInverseProjection; uniform float uTravelScale;" : ""}
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
        float travel = ${stream ? `max(0.0, phase ${streak ? "- aTail * .014" : ""}) * uTravelScale` : `clamp(uPull * influence * (1.18 + seed * .12) - seed * .12 ${streak ? "- aTail * uPull * .012" : ""}, 0.0, 1.0)`};
        vec3 delta = source - uTarget;
        float contraction = pow(1.0 - travel, 1.35);
        float startAngle = atan(delta.y, delta.x);
        float turn = 6.2831853 * (1.15 + seed * .35);
        float angle = startAngle - travel * (.75 + travel * .25) * turn;
        vec3 spiral = vec3(cos(angle), sin(angle), 0.0) * length(delta.xy) * contraction;
        spiral.z = delta.z * contraction;
        vec4 view = viewMatrix * vec4(uTarget + spiral, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(uSize * uScale / max(1.0, -view.z) * (1.0 + uPull * .6) ${stream ? "* 1.45" : ""}, 1.0, ${sparkle ? "14.0" : "7.0"});
        vColor = color;
        ${stream ? "float warmth = 1.0 - smoothstep(uHorizon * 1.25, max(.001, uHorizon * 3.25), length(spiral)); vColor = mix(color, vec3(1.0, .76, .44), warmth * uPull * .55);" : ""}
        vFade = (1.0 - smoothstep(.78, .96, ${stream && streak ? "phase * uTravelScale" : "travel"})) ${stream ? "* smoothstep(0.0, .10, phase) * uPull" : ""} ${streak ? `* mix(.8, .08, aTail) ${stream ? "" : "* uPull"}` : ""};
        float horizonFade = smoothstep(uHorizon * .85, max(.001, uHorizon * 1.2), length(spiral));
        vFade *= mix(1.0, horizonFade, min(1.0, uPull * 1.8));
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      ${stream ? "uniform vec2 uResolution;" : ""}
      void main() {
        ${streak ? "float mask = 1.0;" : sparkle ? "vec2 p = abs(gl_PointCoord - .5); float core = 1.0 - smoothstep(.015, .21, length(p)); float rays = exp(-min(p.x,p.y) * 65.0) * (1.0 - smoothstep(.05,.5,max(p.x,p.y))); float mask = max(core, rays * .7);" : "float mask = 1.0 - smoothstep(.08, .5, length(gl_PointCoord - .5));"}
        ${stream ? `vec2 screen = gl_FragCoord.xy / uResolution;
        vec2 reading = abs((screen - vec2(.5, .54)) / vec2(.44, .34));
        float outerField = smoothstep(.3, 1.5, pow(reading.x, 4.0) + pow(reading.y, 4.0));
        float readingGuard = mix(.72, 1.0, outerField);` : ""}
        gl_FragColor = vec4(vColor, mask * vFade * ${streak ? ".54" : ".65"} ${stream ? "* readingGuard" : ""});
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}
