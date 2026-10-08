import { mkdir, stat } from "node:fs/promises";
import sharp from "sharp";
import { certificates } from "../content/credentials.ts";

// Derive web-sized previews from already-public originals. Never crop document content.
await mkdir("public/assets/certificates/thumbnails", { recursive: true });
let bytes = 0;
for (const record of certificates) {
  const target = `public${record.thumbnail}`;
  await sharp(`public${record.image}`).rotate().resize({ width: 720, height: 560, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
  bytes += (await stat(target)).size;
}
console.log(`${certificates.length} thumbnails; ${Math.round(bytes / 1024)} KB total. Originals unchanged.`);
