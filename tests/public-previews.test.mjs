import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

test("all 63 public credential copies match the reviewed baked-watermark exports", () => {
  const manifest = JSON.parse(readFileSync("public/assets/certificates/watermarks.json", "utf8"));
  assert.equal(manifest.watermark, "Henry Nugraha \u2022 Portfolio Preview");
  assert.equal(Object.keys(manifest.files).length, 63);
  for (const [path, record] of Object.entries(manifest.files)) {
    assert.ok(path.startsWith("/assets/certificates/") || path.startsWith("/assets/readme/"));
    assert.ok(!path.includes(".."));
    const bytes = readFileSync(`public${path}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256, path);
    assert.equal(bytes.length, record.bytes);
  }
  for (const folder of ["previews", "source", "thumbnails"]) {
    for (const file of readdirSync(`public/assets/certificates/${folder}`)) {
      assert.ok(manifest.files[`/assets/certificates/${folder}/${file}`], `Unreviewed public copy: ${file}`);
    }
  }
  assert.doesNotMatch(readFileSync("components/credential-viewer.tsx", "utf8"), /Original image|Source PDF|PDF asli/);
  assert.doesNotMatch(readFileSync("components/credential-library.tsx", "utf8"), /Source PDF|PDF asli/);
});

test("Universe navigation lands centrally in a fully visible, settled exploration window", () => {
  const module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync("components/universe-chapter.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("module", "exports", compiled)(module, module.exports);
  const { UNIVERSE_CHAPTER: c, universeLanding } = module.exports;
  assert.ok(c.landing > c.settled + .1 && c.landing < c.departure - .2);
  assert.ok(c.visible <= c.settled && c.departure < c.hidden);
  for (const height of [390, 800, 900, 1024]) {
    assert.equal(universeLanding(84, height * 3.4, height), 84 + height * 2.4 * c.landing);
  }
  assert.equal(universeLanding(0, 400, 900), 0);
});
