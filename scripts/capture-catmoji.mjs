import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

// Capture the shipped camera-free interface, never synthetic recognition results.
const root = path.resolve(process.env.CATMOJI_ROOT ?? "../catmoji");
const output = path.resolve("public/assets/projects/catmoji");
const temporary = path.resolve("test-results/catmoji-capture");
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim(), "", "capture a committed product");
const version = (await readFile(path.join(root, "sw.js"), "utf8")).match(/catmoji-v([\d.]+)/)?.[1];
assert.ok(version);
await mkdir(output, { recursive: true });
await mkdir(temporary, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith(".") || part === "_originals") || !/^(index\.html$|model_data\.js$|face\.js$|owner\.js$|favicon[^\\/]*$|manifest\.webmanifest$|assets[\\/])/.test(relative)) throw new Error("Not public");
    await stat(file);
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
const errors = [], captures = [];
const local = `http://127.0.0.1:${server.address().port}`;
const enter = async context => {
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    const allowed = (url.origin === local && !url.pathname.startsWith("/api/")) || ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname);
    return allowed && route.request().method() === "GET" ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${local}/?nocam`);
  await expect(page.locator("#badge-text")).toHaveText("AI LIVE · 2460 data");
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#mute-btn").click();
  await expect(page.locator("#mute-btn")).toHaveClass(/active/);
  return page;
};
const capture = async (page, name, selector) => {
  await page.waitForTimeout(500);
  const bytes = selector ? await page.locator(selector).screenshot() : await page.screenshot();
  const { width, height } = await sharp(bytes).metadata();
  await sharp(bytes).webp({ quality: 86 }).toFile(path.join(output, `${name}.webp`));
  captures.push({ file: `${name}.webp`, size: [width, height], crop: selector ?? "full viewport" });
  await writeFile(path.join(output, `${name}.webp.json`), JSON.stringify({ prompt: `Source capture, not generated: actual Catmoji v${version}, commit ${revision}. Built-in ?nocam interface, camera off, no recognition results or personal input. ${selector ? `Unaltered ${selector} element crop.` : "Full viewport."} See capture.json and scripts/capture-catmoji.mjs.`, createdAt: new Date().toISOString() }, null, 2) + "\n");
};
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 960 }, serviceWorkers: "block", permissions: [] });
  const page = await enter(desktop);
  await capture(page, "normal-panel", "#panel");
  await page.locator('[data-mode="challenge"]').click();
  await expect(page.locator("#challenge-lobby")).toBeVisible();
  await capture(page, "challenge-panel", "#panel");
  await desktop.close();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", permissions: [] });
  const phone = await enter(mobile);
  await phone.locator('[data-mode="challenge"]').click();
  await phone.locator("#challenge-lobby").scrollIntoViewIfNeeded();
  await capture(phone, "challenge-mobile", "#panel");
  await mobile.close();
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "capture.json"), JSON.stringify({ product: "Catmoji", version, revision, captured: new Date().toISOString().slice(0, 10), origin: "Actual local product UI using built-in ?nocam. Camera off; no gesture recognition, injected predictions, personal data or live TTS calls.", viewport: [1280, 960], mobileViewport: [390, 844], captures }, null, 2) + "\n");
  console.log(JSON.stringify({ product: "Catmoji", version, captures }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
