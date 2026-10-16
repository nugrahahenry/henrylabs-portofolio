import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Only the three reviewed report screenshots are eligible for public export.
const input = path.resolve(process.argv.slice(2).find(arg => !arg.startsWith("--")) ?? "test-results/rental-source");
const output = path.resolve("public/assets/projects/rentalmobil-sg");
if (!process.argv.includes("--confirmed-simulated-data")) throw new Error("Confirm the selected screenshots contain approved simulated data before export: --confirmed-simulated-data");
const entries = [
  ["image4.jpeg", "catalog", "d2c4f4e0d257dab297a335342619325c81d43186daa5629a6daa18b79df53acf"],
  ["image5.png", "rentals", "ec94eeb0b2c87643eadf1e18137494f005cb0d5a4977f516f395299c019ee47f"],
  ["image3.png", "admin", "d4f423a2db0f4a201c1c2705b7e62bb14947c6fa69a14ea183fcf3a1c3e7027a"],
];
const reviewed = entries.map(([source, name, approvedHash]) => {
  const bytes = readFileSync(path.join(input, source));
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  if (sourceSha256 !== approvedHash) throw new Error(`Unreviewed source image: ${source}`);
  return { source, name, sourceSha256, bytes };
});
mkdirSync(output, { recursive: true });
const captures = [];
for (const { source, name, sourceSha256, bytes } of reviewed) {
  const file = `${name}.webp`;
  const target = path.join(output, file);
  const result = await sharp(bytes).webp({ quality: 88 }).toFile(target);
  const origin = `Original RentalMobil.SG screenshot from the semester-two PBO course report, word/media/${source}. Source SHA-256 ${sourceSha256}. Not generated. Simulated coursework data confirmed by Henry and approved for portfolio display on 2026-10-16. WebP conversion only; original framing and content retained.`;
  writeFileSync(`${target}.json`, `${JSON.stringify({ prompt: origin }, null, 2)}\n`);
  captures.push({ file, source, sourceSha256, width: result.width, height: result.height, bytes: result.size });
}
writeFileSync(path.join(output, "capture.json"), `${JSON.stringify({ origin: "Archived application screenshots from the RentalMobil.SG course report; not a newly recorded runtime session.", data: "Simulated coursework data confirmed by Henry and approved for portfolio display on 2026-10-16. No accounts, contacts, uploaded receipts or database are published.", processing: "WebP quality 88. Original framing and content retained, including the open catalog filter and partial page captures.", captures }, null, 2)}\n`);
console.log(JSON.stringify(captures, null, 2));
