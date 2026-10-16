import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Inputs are selected original report images, extracted privately before this step.
const input = path.resolve(process.argv.slice(2).find(arg => !arg.startsWith("--")) ?? "test-results/pos-source");
const output = path.resolve("public/assets/projects/pos-z-shoes");
if (!process.argv.includes("--confirmed-simulated-data")) throw new Error("Confirm the selected report images contain approved simulated data before export: --confirmed-simulated-data");
const entries = [
  ["image62.jpeg", "products", "317a6a876ecd6a9ca2dca16aec1cc0e367041c166ef9043ee346097feef8bd44"],
  ["image65.jpeg", "transactions", "b3e6dca538125b5248a2983cfead30ddb6fad564d54d83872779ef385a477194"],
  ["image72.jpeg", "reports", "5afdef0b11a554f14195c6ac6936502f9049511ee04590e6243165a85e6dbaf1"],
];
mkdirSync(output, { recursive: true });
const captures = [];
for (const [source, name, approvedHash] of entries) {
  const bytes = readFileSync(path.join(input, source));
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  if (sourceSha256 !== approvedHash) throw new Error(`Unreviewed source image: ${source}`);
  const filename = `${name}.webp`;
  const target = path.join(output, filename);
  const result = await sharp(bytes).webp({ quality: 88 }).toFile(target);
  const origin = `Existing POS Z Shoes desktop screenshot from the APBDS Z Shoes course report, word/media/${source}. Source SHA-256 ${sourceSha256}. Simulated coursework data, confirmed by Henry and approved for portfolio display on 2026-10-16. WebP conversion only; no UI reconstruction or content replacement.`;
  writeFileSync(`${target}.json`, `${JSON.stringify({ prompt: origin }, null, 2)}\n`);
  captures.push({ file: filename, source, sourceSha256, width: result.width, height: result.height, bytes: result.size });
}
writeFileSync(path.join(output, "capture.json"), `${JSON.stringify({ origin: "Archived application screenshots from the POS Z Shoes course report; not a newly recorded runtime session.", data: "Simulated coursework data. Henry confirmed and approved these screenshots for portfolio display on 2026-10-16.", contribution: "Application built independently by Henry; classmates helped prepare sample data.", processing: "WebP quality 88. Original framing and content retained. Product-photo placeholders retained as captured.", captures }, null, 2)}\n`);
console.log(JSON.stringify(captures, null, 2));
