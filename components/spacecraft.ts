import * as THREE from "three";

export function spacecraftPose(age: number, motionOn: boolean) {
  if (!motionOn) return { visible: true, x: -.65, y: .67, depth: -3.4, roll: -.08, opacity: .65 };
  const t = (age % 112 - .6) / 14;
  const fade = THREE.MathUtils.smoothstep(t, 0, .08) * (1 - THREE.MathUtils.smoothstep(t, .88, 1));
  return { visible: t > 0 && t < 1, x: -.9 + t * 1.8, y: .58 + Math.sin(t * Math.PI) * .14, depth: -3.4 + Math.sin(t * Math.PI) * .6, roll: Math.sin(t * Math.PI * 2) * .13, opacity: fade };
}

export function createSpacecraft() {
  const group = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: "#b7d8de", metalness: .72, roughness: .27, transparent: true });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#5bdcd3", metalness: .08, roughness: .12, transparent: true, opacity: .7 });
  const light = new THREE.MeshBasicMaterial({ color: "#ffe0a2", transparent: true });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.2, .28, .07, 32), hull);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.135, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  dome.position.y = .035;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.25, .013, 8, 40), light);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -.015;
  const ports = new THREE.InstancedMesh(new THREE.SphereGeometry(.019, 8, 6), light, 6);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2;
    ports.setMatrixAt(i, matrix.makeTranslation(Math.cos(angle) * .225, .032, Math.sin(angle) * .225));
  }
  group.add(base, dome, rim, ports);
  return { group, hull, glass, light };
}
