import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

// Read-only sibling checkout. No camera permission, injected product state, or private photos.
const root = path.resolve(process.env.POLARA_ROOT ?? "../polara");
const output = path.resolve("public/assets/projects/polara");
const temporary = path.resolve("test-results/polara-capture");
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim(), "", "capture a committed product");
const { version } = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
await mkdir(output, { recursive: true });
await mkdir(temporary, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith(".") || part === "_originals") || !/^(index\.html|favicon[^\\/]*|manifest[^\\/]*|assets[\\/]|src[\\/]|styles[\\/])/.test(relative)) throw new Error("Not public");
    await stat(file);
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
const errors = [];
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: temporary, size: { width: 1440, height: 1000 } }, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  const recordingStart = Date.now();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#primaryBtn").click();
  await page.locator("#tertiaryBtn").click();
  await expect(page.locator("#cameraBayLabel")).toHaveText("Demo photos");
  for (let slot = 0; slot < 3; slot++) {
    await page.locator("#primaryBtn:not(:disabled)").click();
    await page.waitForFunction(() => !document.querySelector('[data-panel="review"]').hidden || (!document.querySelector("#primaryBtn").disabled && document.querySelector("#primaryBtn").textContent.trim() === "Take photo"));
  }
  await expect(page.locator('[data-panel="review"]')).toBeVisible();
  const capture = async name => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(600);
    await sharp(await page.screenshot()).webp({ quality: 86 }).toFile(path.join(output, `${name}.webp`));
  };
  await capture("review");
  await page.locator("#primaryBtn").click();
  await expect(page.locator('[data-panel="frame"]')).toBeVisible();
  await expect(page.locator("#primaryBtn")).toBeEnabled();
  await page.waitForTimeout(1200);
  const start = (Date.now() - recordingStart) / 1000;
  await capture("frames");
  await page.waitForTimeout(1200);
  await page.locator("#templateList .tpl-btn").nth(1).click();
  await page.waitForTimeout(1400);
  await page.locator("#photoSlotTabs .slot-tab").nth(1).click();
  await page.locator("#fitContainBtn").click();
  await page.waitForTimeout(1400);
  await page.locator("#primaryBtn").click();
  await expect(page.locator('[data-panel="decorate"]')).toBeVisible();
  await page.waitForTimeout(1400);
  await page.locator("#primaryBtn").click();
  await expect(page.locator("#revealTitle")).toHaveText("Proof approved.", { timeout: 40000 });
  await page.waitForTimeout(1800);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save PNG", exact: true }).click();
  await (await download).saveAs(path.join(temporary, "demo-strip.png"));
  const png = await readFile(path.join(temporary, "demo-strip.png"));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [720, 1800]);
  await page.waitForTimeout(1400);
  const duration = (Date.now() - recordingStart) / 1000 - start;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture("reveal-mobile");
  const video = page.video();
  await context.close();
  const source = await video.path();
  const ffmpeg = process.env.FFMPEG_PATH ?? path.join(process.env.LOCALAPPDATA, "ms-playwright/ffmpeg-1011/ffmpeg-win64.exe");
  execFileSync(ffmpeg, ["-y", "-ss", String(start), "-i", source, "-t", String(duration), "-an", "-c:v", "libvpx", "-b:v", "600k", "-crf", "18", path.join(output, "walkthrough.webm")], { stdio: "pipe", windowsHide: true });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "capture.json"), JSON.stringify({ product: "Polara", version, revision, captured: new Date().toISOString().slice(0, 10), origin: "Actual local product UI, explicit Demo mode with fictional sample photos; no live camera or private photos.", viewport: [1440, 1000], mobileViewport: [390, 844], video: { durationSeconds: Math.round(duration * 10) / 10, audio: false, sequence: ["Select a frame", "Adjust photo fit", "Continue without stickers", "Reveal", "Save PNG"] }, files: ["review.webp", "frames.webp", "reveal-mobile.webp", "walkthrough.webm"] }, null, 2) + "\n");
  console.log(`Captured Polara ${version} (${revision.slice(0, 7)}): three images and ${duration.toFixed(1)}s actual UI recording.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
