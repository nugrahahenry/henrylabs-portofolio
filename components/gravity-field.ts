import * as THREE from "three";

export function gravityMaterial(target: THREE.Vector3, size: number, streak = false, stream = false) {
  return new THREE.ShaderMaterial({
    uniforms: { uTarget: { value: target }, uPull: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: size } },
    vertexShader: `
      attribute vec3 color;
      ${streak ? "attribute float aTail;" : ""}
      uniform vec3 uTarget;
      uniform float uPull;
      uniform float uTime;
      uniform float uScale;
      uniform float uSize;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec3 source = (modelMatrix * vec4(position, 1.0)).xyz;
        float seed = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);
        float influence = smoothstep(.08, .24, seed);
        float travel = ${stream ? "fract(uTime * .075 + seed)" : `clamp(uPull * influence * (1.18 + seed * .12) - seed * .12 ${streak ? "- aTail * uPull * .025" : ""}, 0.0, 1.0)`};
        vec3 delta = source - uTarget;
        float contraction = pow(1.0 - travel, 1.5);
        float angle = atan(delta.y, delta.x) - pow(travel, 1.7) * (7.0 + seed * 2.0) - uTime * .045 * uPull;
        vec3 spiral = vec3(cos(angle), sin(angle), 0.0) * length(delta.xy) * contraction;
        spiral.z = delta.z * contraction - travel * .2;
        vec4 view = viewMatrix * vec4(uTarget + spiral, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(uSize * uScale / max(1.0, -view.z) * (1.0 + uPull * 1.4), 1.0, 7.0);
        vColor = color;
        vFade = (1.0 - smoothstep(.82, 1.0, travel)) ${stream ? "* smoothstep(0.0, .12, travel) * uPull" : streak ? "* mix(.8, .08, aTail) * uPull" : ""};
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        ${streak ? "float mask = 1.0;" : "float mask = 1.0 - smoothstep(.08, .5, length(gl_PointCoord - .5));"}
        gl_FragColor = vec4(vColor, mask * vFade * ${streak ? ".54" : ".65"});
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}
