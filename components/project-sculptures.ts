import * as THREE from "three";

type World = "catmoji" | "polara" | "hengs" | "nalira" | "canox";

// Closed, dimensional interpretations of the existing marks, not image billboards.
export function createProjectSculpture(id: World) {
  const root = new THREE.Group();
  root.name = `sculpture-${id}`;
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string, metalness = .05) => {
    const key = `${color}-${metalness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .3, metalness }));
    return materials.get(key)!;
  };
  const ball = (color: string, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    root.add(mesh);
    return mesh;
  };
  const solid = (shape: THREE.Shape, color: string, depth: number, z = 0, bevel = .04) => {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 12 }), material(color, .18));
    mesh.position.z = z - depth / 2;
    root.add(mesh);
    return mesh;
  };
  const line = (points: number[][], color: string, radius = .025) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 8, false), material(color));
    root.add(mesh);
    return mesh;
  };
  const polygon = (points: number[][]) => new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const star = (cx: number, cy: number, outer: number, inner: number, count = 5) => polygon(Array.from({ length: count * 2 }, (_, i) => {
    const a = i * Math.PI / count + Math.PI / 2;
    return [cx + Math.cos(a) * (i % 2 ? inner : outer), cy + Math.sin(a) * (i % 2 ? inner : outer)];
  }));

  if (id === "catmoji" || id === "polara") {
    const polara = id === "polara";
    const outline = polara ? "#785146" : "#302421";
    const accent = polara ? "#fa83ae" : "#ff803e";
    ball("#fff0d9", 0, -.02, 0, .66, .55, .5);
    for (const side of [-1, 1]) {
      const ear = polygon([[side * .21, .34], [side * .59, .7], [side * .6, .16]]);
      solid(ear, "#fff0d9", .36, -.015, .065);
      solid(polygon([[side * .32, .34], [side * .54, .59], [side * .53, .23]]), accent, .04, .23, .025);
      ball(accent, side * .42, -.11, .397, .12, .065, .025);
      for (const dy of [-.09, .03]) line([[side * .47, dy, .39], [side * .66, dy + .02, .32], [side * .79, dy + .035, .24]], outline, .016);
    }
    for (let i = -1; i <= 1; i++) ball("#ff9c48", i * .13, .365, .35, .048, .115, .026);
    ball(outline, -.23, .07, .467, .13, .15, .048);
    if (polara) {
      ball(outline, .23, .07, .467, .13, .15, .048);
      for (const side of [-1, 1]) ball("#ffffff", side * .23 - .03, .115, .512, .04);
    } else {
      solid(star(-.23, .07, .09, .032, 4), "#ffd349", .016, .525, .006);
      line([[.12, .065, .49], [.22, .15, .493], [.33, .07, .466]], outline, .03);
      ball("#119fa5", 0, -.42, -.05, .5, .12, .39);
      solid(star(0, -.48, .15, .071), "#ffd349", .08, .42, .014);
      for (const side of [-1, 1]) ball("#fff0d9", side * .44, -.4, .36, .16, .13, .14);
    }
    ball(outline, 0, -.08, .51, .057, .04, .025);
    line([[-.13, -.15, .494], [-.07, -.2, .51], [0, -.14, .52], [.07, -.2, .51], [.13, -.15, .494]], outline, .018);
    // A curled tail and back markings keep the identity dimensional through a full turn.
    line([[.4, -.3, -.3], [.65, -.17, -.38], [.59, .08, -.43], [.39, .03, -.47]], accent, .08);
    for (let i = -1; i <= 1; i++) ball("#ffb065", i * .13, .25, -.429, .055, .115, .028);
    root.scale.setScalar(.76);
  } else if (id === "hengs") {
    const h = polygon([[-.5,-.55],[-.25,-.55],[-.25,-.22],[.25,-.22],[.25,-.55],[.5,-.55],[.5,.58],[.25,.58],[.25,.2],[-.25,.2],[-.25,.58],[-.5,.58]]);
    solid(h, "#8b60d1", .44, 0, .095);
    for (const side of [-1, 1]) {
      ball("#73e8ff", side * .58, -.02, 0, .12, .25, .26);
      ball("#6a4dc8", side * .63, -.02, 0, .1, .2, .22);
    }
    ball("#14182e", 0, -.055, .25, .44, .23, .11);
    for (const side of [-1, 1]) line([[side*.19-.075,-.055,.347],[side*.19,.035,.367],[side*.19+.075,-.055,.347]], "#6ee7f4", .025);
    line([[-.09,-.15,.35],[0,-.19,.36],[.09,-.15,.35]], "#6ee7f4", .022);
    for (const y of [-.08,0,.08]) line([[-.15,y,-.28],[.15,y,-.28]], "#4b337f", .019);
    root.scale.setScalar(.78);
  } else if (id === "canox") {
    solid(polygon([[0,.76],[-.075,.14],[-.19,.015],[-.13,-.09],[0,-.7],[.075,-.12],[.35,.11],[.06,-.005],[-.04,.005],[.12,.15],[.025,.19]]), "#d1f6fc", .19, 0, .019);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.43, .009, 8, 100), material("#45cee3", .3));
    ring.rotation.x = .25;
    root.add(ring);
    ball("#38d7f8", .32, .38, .03, .065);
    root.scale.setScalar(.83);
  } else {
    solid(polygon([[-.58,.62],[-.38,.62],[.38,-.04],[.38,-.63],[-.58,.25]]), "#1e2b93", .4, 0, .04);
    solid(polygon([[.38,-.04],[.79,.3],[.79,-.02],[.4,-.63]]), "#5858b0", .4, 0, .04);
    solid(polygon([[.38,-.04],[.79,.3],[-.02,.88]]), "#b1b3e8", .4, 0, .04);
    solid(star(-.18, .04, .2, .07, 4), "#ffffff", .06, .26, .015);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.72, .012, 8, 96), material("#48d9f2", .28));
    ring.rotation.x = .34;
    root.add(ring);
    root.scale.setScalar(.62);
  }
  return root;
}
