import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { certificates } from "../content/credentials.ts";

const manifestPath = "public/assets/certificates/watermarks.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const sources = new Map();
for (const record of certificates) {
  const bytes = await readFile(`public${record.image}`);
  if (hash(bytes) !== manifest.files[record.image]?.sha256) throw new Error(`Unverified public image: ${record.id}`);
  sources.set(record.image, bytes);
}

const delivery = {};
let before = 0, after = 0;
await mkdir("public/assets/certificates/reading", { recursive: true });
for (const record of certificates) {
  const source = sources.get(record.image);
  const encoded = await sharp(source).webp({ lossless: true, effort: 4 }).toBuffer();
  before += source.length;
  // Keep the canonical image when a second asset would save too little to justify it.
  if (encoded.length > source.length * .9 || source.length - encoded.length < 8192) {
    after += source.length;
    continue;
  }
  const original = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decoded = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (original.info.width !== decoded.info.width || original.info.height !== decoded.info.height || !original.data.equals(decoded.data)) {
    // Some transparent inputs do not round-trip exactly; retain their existing copy.
    console.log(`${record.id}: retained canonical image (pixel mismatch)`);
    after += source.length;
    continue;
  }
  const path = `/assets/certificates/reading/${record.id}.webp`;
  await writeFile(`public${path}`, encoded);
  manifest.files[path] = { sha256: hash(encoded), bytes: encoded.length, source: record.image, sourceSha256: hash(source) };
  delivery[record.image] = path;
  after += encoded.length;
  console.log(`${record.id}: ${source.length} -> ${encoded.length} bytes; identical RGBA pixels`);
}
await writeFile("content/credential-delivery.json", JSON.stringify(delivery, null, 2) + "\n");
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ variants: Object.keys(delivery).length, before, after, saved: before - after, percent: (1 - after / before) * 100 }));
