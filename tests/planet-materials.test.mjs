import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../components/planet-materials.ts", import.meta.url), "utf8");
let compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
for (const dependency of ["three", "three/addons/math/ImprovedNoise.js"]) {
  compiled = compiled.replace(`from "${dependency}"`, `from ${JSON.stringify(pathToFileURL(require.resolve(dependency)).href)}`);
}
const { buildPlanetPixels, createAtmosphere, createPlanetRing, removeEdgeMatte } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("procedural surfaces stay opaque, varied, deterministic and seamless", () => {
  for (const kind of ["rocky", "ocean", "ice", "gas"]) {
    const surface = buildPlanetPixels("#78cdbb", kind, 128, 19);
    assert.deepEqual(surface, buildPlanetPixels("#78cdbb", kind, 128, 19));
    assert.notDeepEqual(surface.albedo, buildPlanetPixels("#78cdbb", kind, 128, 37).albedo);
    let low = 255;
    let high = 0;
    let clouds = 0;
    for (let i = 0; i < surface.albedo.length; i += 4) {
      assert.equal(surface.albedo[i + 3], 255);
      assert.equal(surface.relief[i], surface.relief[i + 1]);
      assert.equal(surface.relief[i], surface.relief[i + 2]);
      assert.equal(surface.relief[i + 3], 255);
      low = Math.min(low, surface.albedo[i]);
      high = Math.max(high, surface.albedo[i]);
      clouds += surface.clouds[i + 3];
    }
    assert.ok(high - low > 25, `${kind} must have inspectable surface detail`);
    assert.equal(clouds > 0, kind === "ocean");
    for (const pixels of [surface.albedo, surface.relief, surface.clouds]) {
      for (let row = 0; row < surface.height; row++) for (let channel = 0; channel < 4; channel++) {
        const first = row * surface.width * 4 + channel;
        assert.ok(Math.abs(pixels[first] - pixels[first + (surface.width - 1) * 4]) <= 1, "longitudes must join without a UV seam");
      }
      for (const row of [0, surface.height - 1]) for (let x = 1; x < surface.width; x++) {
        const start = row * surface.width * 4;
        assert.ok(Math.abs(pixels[start] - pixels[start + x * 4]) <= 1, "pole samples must not create stripes");
      }
    }
  }
});

test("atmosphere is a lit limb rather than a flat luminous sphere", () => {
  const atmosphere = createAtmosphere(.4, "#8cb6dc");
  assert.match(atmosphere.material.fragmentShader, /dot\(normal, uSun\)/);
  assert.match(atmosphere.material.fragmentShader, /rim \* uOpacity/);
  assert.equal(atmosphere.material.depthWrite, false);
  assert.equal(typeof createPlanetRing, "function");
  atmosphere.geometry.dispose();
  atmosphere.material.dispose();
});

test("brand matte removal preserves enclosed light details and existing transparency", () => {
  const width = 9;
  const height = 7;
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 2; y <= 4; y++) for (let x = 3; x <= 5; x++) pixels.set([30, 140, 120, 255], (y * width + x) * 4);
  pixels.set([255, 255, 255, 255], (3 * width + 4) * 4);
  removeEdgeMatte(pixels, width, height);
  assert.equal(pixels[3], 0);
  assert.equal(pixels[(3 * width + 4) * 4 + 3], 255, "white inside the real mark must not be removed");
  assert.equal(pixels[(2 * width + 3) * 4 + 3], 255);
  const transparent = new Uint8ClampedArray([0, 0, 0, 0, 20, 40, 80, 255, 0, 0, 0, 0, 0, 0, 0, 0]);
  const original = transparent.slice();
  removeEdgeMatte(transparent, 2, 2);
  assert.deepEqual(transparent, original);
});
