import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Approved generated portraits only. Source photographs never enter the public tree.
const selected = {
  cosmic: "henry-cosmic-v2.png",
  sunglasses: "henry-human-sunglasses-v2.png",
  glasses: "henry-human-glasses-v2.png",
  human: "henry-human-no-glasses-v1.png",
};
await mkdir("public/assets/portrait", { recursive: true });
await mkdir("test-results/portrait", { recursive: true });
const report = [];
for (const [state, filename] of Object.entries(selected)) {
  const input = await readFile(`docs/assets/portrait/candidates/${filename}`);
  const metadata = await sharp(input).metadata();
  if (metadata.width !== 1122 || metadata.height !== 1402 || !metadata.hasAlpha) throw new Error(`Unexpected portrait: ${filename}`);
  for (const width of [560, 960]) {
    const output = await sharp(input).resize({ width }).webp({ quality: 83, alphaQuality: 95, effort: 5 }).toBuffer();
    await writeFile(`public/assets/portrait/henry-${state}-${width}.webp`, output);
    report.push({ state, width, bytes: output.length, sourceSHA256: createHash("sha256").update(input).digest("hex") });
  }
}
await writeFile("test-results/portrait/export-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify([560, 960].map(width => ({ width, totalKB: Math.round(report.filter(r => r.width === width).reduce((n, r) => n + r.bytes, 0) / 1024) }))));
