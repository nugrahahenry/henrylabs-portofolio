import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import sharp from "sharp";

test("all public credential copies match the reviewed baked-watermark exports", () => {
  const manifest = JSON.parse(readFileSync("public/assets/certificates/watermarks.json", "utf8"));
  const delivery = JSON.parse(readFileSync("content/credential-delivery.json", "utf8"));
  assert.equal(manifest.watermark, "Henry Nugraha \u2022 Portfolio Preview");
  assert.equal(Object.keys(manifest.files).length, 85 + Object.keys(delivery).length);
  for (const [path, record] of Object.entries(manifest.files)) {
    assert.ok(path.startsWith("/assets/certificates/") || path.startsWith("/assets/readme/"));
    assert.ok(!path.includes(".."));
    const bytes = readFileSync(`public${path}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256, path);
    assert.equal(bytes.length, record.bytes);
  }
  for (const folder of ["previews", "source", "thumbnails", "reading"]) {
    for (const file of readdirSync(`public/assets/certificates/${folder}`)) {
      assert.ok(manifest.files[`/assets/certificates/${folder}/${file}`], `Unreviewed public copy: ${file}`);
    }
  }
  assert.doesNotMatch(readFileSync("components/credential-viewer.tsx", "utf8"), /Original image|Source PDF|PDF asli/);
  assert.doesNotMatch(readFileSync("components/credential-library.tsx", "utf8"), /Source PDF|PDF asli/);
});

test("reading variants reduce transfer size without changing a single watermarked pixel", async () => {
  const manifest = JSON.parse(readFileSync("public/assets/certificates/watermarks.json", "utf8"));
  const delivery = JSON.parse(readFileSync("content/credential-delivery.json", "utf8"));
  assert.ok(Object.keys(delivery).length > 0);
  assert.deepEqual(readdirSync("public/assets/certificates/reading").sort(), Object.values(delivery).map(path => path.split("/").pop()).sort());
  for (const [source, path] of Object.entries(delivery)) {
    assert.match(source, /^\/assets\/certificates\/previews\/[a-z0-9-]+\.(png|jpeg)$/);
    assert.match(path, /^\/assets\/certificates\/reading\/[a-z0-9-]+\.webp$/);
    assert.equal(manifest.files[path].source, source);
    assert.equal(manifest.files[path].sourceSha256, manifest.files[source].sha256);
    assert.ok(manifest.files[path].bytes <= manifest.files[source].bytes * .9, path);
    const original = await sharp(`public${source}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const variant = await sharp(`public${path}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(variant.info.width, original.info.width, path);
    assert.equal(variant.info.height, original.info.height, path);
    assert.ok(variant.data.equals(original.data), `Changed pixels: ${path}`);
  }
});

test("the shared reader prefers lighter copies with canonical fallback and unchanged public links", () => {
  const viewer = readFileSync("components/credential-viewer.tsx", "utf8");
  assert.match(viewer, /readingImages\[record.image\] \?\? record.image/);
  assert.match(viewer, /source !== record.image\) \{ setSource\(record.image\); setStatus\("loading"\)/);
  assert.match(viewer, /else setStatus\("error"\)/);
  assert.match(viewer, /onError=\{failed\}/);
  assert.match(viewer, /href=\{record.image\}/);
  assert.match(viewer, /href=\{record.source\}/);
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

test("hero and sky share reversible eased chapter boundaries without a competing opacity clock", () => {
  const module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync("components/universe-chapter.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("module", "exports", compiled)(module, module.exports);
  const { UNIVERSE_CHAPTER: c, chapterEase, universeHeroOpacity, universePresence } = module.exports;
  assert.equal(universeHeroOpacity(0), 1);
  assert.equal(universeHeroOpacity(c.entry), 0);
  assert.equal(universePresence(0), 0);
  assert.equal(universePresence(c.landing), 1);
  assert.equal(universePresence(1), 0);
  for (let p = -.1; p <= 1.1; p += .001) {
    for (const sample of [universePresence, universeHeroOpacity]) {
      assert.ok(sample(p) >= 0 && sample(p) <= 1);
      assert.ok(Math.abs(sample(p + .001) - sample(p)) < .02, "no chapter boundary pop");
    }
    assert.ok(universeHeroOpacity(p) >= universeHeroOpacity(p + .001));
  }
  assert.ok(chapterEase(.001, 0, 1) < .00001, "approach starts without linear velocity");
  const experience = readFileSync("components/portfolio-experience.tsx", "utf8");
  assert.match(experience, /opacity: motionOn \? heroOpacity : 1/);
  assert.match(experience, /mapPresence=\{mapPresence\}/);
  assert.doesNotMatch(readFileSync("app/globals.css", "utf8"), /\.hero-copy \{ transition: opacity/);
});

test("project reading retains full text opacity and settles its media before the viewport center", () => {
  const preview = readFileSync("components/home-project-preview.tsx", "utf8");
  assert.match(preview, /offset: \["start end", "start 48%"\]/);
  assert.doesNotMatch(preview, /headingOpacity|copyOpacity|headingScale/);
  assert.match(preview, /chapterEase/);
  const scrim = readFileSync("app/library.css", "utf8").match(/\.work-section::after\s*\{([^}]+)\}/)?.[1];
  assert.ok(scrim);
  assert.match(scrim, /animation: none/);
  assert.match(scrim, /transform: none/);
  assert.match(scrim, /inset: 0;/, "the feather finishes inside the clipped section without a hard lower edge");
});

test("opening lighting is bounded, reversible and absent from intro and reading chapters", () => {
  const module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync("components/universe-chapter.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("module", "exports", compiled)(module, module.exports);
  const { universeLighting, UNIVERSE_CHAPTER: c } = module.exports;
  for (const progress of [0, .2, c.landing, c.departure]) assert.equal(universeLighting(progress), 1);
  for (const progress of [0, .57, .94, 1]) assert.equal(universeLighting(progress, true), 0);
  for (const progress of [1, 2, NaN, Infinity]) assert.equal(universeLighting(progress), 0);
  assert.ok(Math.abs(universeLighting(.94) - .5) < .00001);
  for (let p = 0; p <= 1; p += .001) {
    assert.ok(universeLighting(p) >= 0 && universeLighting(p) <= 1);
    assert.ok(Math.abs(universeLighting(p + .001) - universeLighting(p)) < .013);
  }
});
