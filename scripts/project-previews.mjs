import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { projectPreviewSources } from "../content/project-previews.ts";

const report = [];
for (const [source, preview] of Object.entries(projectPreviewSources)) {
  const input = await readFile(path.join("public", source));
  const metadata = await sharp(input).metadata();
  assert.deepEqual([metadata.width, metadata.height], preview.size, source);
  for (const width of preview.widths) {
    assert.ok(width <= metadata.width, "Do not enlarge original artwork");
    const target = path.join("public", `${preview.target}-${width}.webp`);
    const output = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toBuffer();
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, output);
    report.push({ source, sha256: createHash("sha256").update(input).digest("hex"), target, width, originalBytes: input.length, bytes: output.length });
  }
}
await mkdir("test-results/project-previews", { recursive: true });
await writeFile("test-results/project-previews/exports.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map(({ source, width, originalBytes, bytes }) => ({ source, width, originalBytes, bytes })), null, 2));
