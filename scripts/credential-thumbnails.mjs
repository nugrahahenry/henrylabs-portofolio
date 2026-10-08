import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { certificates } from "../content/credentials.ts";

// Reject unreviewed inputs: thumbnails must never re-publish an unmarked master.
const manifestPath = "public/assets/certificates/watermarks.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
for (const record of certificates) {
  if (hash(await readFile(`public${record.image}`)) !== manifest.files[record.image]?.sha256) throw new Error(`Unverified public image: ${record.id}`);
}
await mkdir("public/assets/certificates/thumbnails", { recursive: true });
let bytes = 0;
for (const record of certificates) {
  const target = `public${record.thumbnail}`;
  await sharp(`public${record.image}`).rotate().resize({ width: 720, height: 560, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
  bytes += (await stat(target)).size;
  manifest.files[record.thumbnail] = { sha256: hash(await readFile(target)), bytes: (await stat(target)).size };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${certificates.length} watermarked thumbnails; ${Math.round(bytes / 1024)} KB total. Private masters unchanged.`);
