import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const sizes = [{ width: 1440, height: 900 }, { width: 866, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 844, height: 390 }];
const targets = process.argv.includes("--fallback") ? [] : process.argv.includes("--phone") ? [sizes[3], sizes[4]] : process.argv.includes("--capture") ? [sizes[0], sizes[3]] : sizes;
const move = (page, progress) => page.locator(".maker-chapter").evaluate((node, value) => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top + Math.max(0, node.offsetHeight - innerHeight) * value, behavior: "instant" }), progress);
mkdirSync("test-results/portrait", { recursive: true });
try {
  for (const viewport of targets) {
    const page = await browser.newPage({ viewport });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator(".intro-loader").waitFor({ state: "hidden" });
    await move(page, .2);
    const wide = viewport.height >= 560;
    if (wide) await expect(page.locator(".maker-proof-heading a")).toBeHidden();
    if (!wide) await page.locator(".portrait-reveal").scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator(".portrait-reveal img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    assert.equal(await page.locator(".certificate-shelf, .proof-section, .stack-section, .signal-chapter").count(), 0);
    assert.equal(await page.locator(".maker-evidence-card").count(), 5);
    await page.screenshot({ path: `test-results/portrait/${viewport.width}-tech.png` });
    if (wide) {
      await expect(page.locator(".maker-orbit-field")).toHaveAttribute("data-ready", "true");
      await expect(page.locator(".maker-scene")).toHaveAttribute("data-webgl", "true");
      await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-intersecting", "false");
      assert.ok(Number(await page.locator(".maker-orbit-field").getAttribute("data-draw-calls")) <= 27);
      assert.ok(Number(await page.locator(".maker-orbit-field").getAttribute("data-front")) > 0);
      assert.ok(Number(await page.locator(".maker-orbit-field").getAttribute("data-back")) > 0);
      const phase = Number(await page.locator(".maker-orbit-field").getAttribute("data-phase"));
      await expect.poll(() => page.locator(".maker-orbit-field").getAttribute("data-phase").then(Number)).toBeGreaterThan(phase + .015);
      const painted = await page.locator(".maker-orbit-field canvas").evaluate(canvas => new Promise(resolve => requestAnimationFrame(() => {
        const gl = canvas.getContext("webgl2"), pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let count = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 50) count++;
        resolve(count);
      })));
      assert.ok(painted > 800, "real 3D satellites must paint, not only report their coordinates");
    }
    const portrait = page.locator(".portrait-reveal");
    await portrait.scrollIntoViewIfNeeded();
    const box = await portrait.boundingBox();
    const before = await portrait.screenshot();
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .34);
    await expect.poll(() => portrait.evaluate(node => Number(node.style.getPropertyValue("--human-opacity")))).toBeGreaterThan(.9);
    const after = await portrait.screenshot();
    const a = await sharp(before).raw().toBuffer(), b = await sharp(after).raw().toBuffer();
    let changed = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (Math.abs(a[i] - b[i]) > 25) changed++;
    assert.ok(changed > 1500, "actual face pixels reveal the human layer");
    await page.screenshot({ path: `test-results/portrait/${viewport.width}-reveal.png` });
    await page.mouse.move(5, 80);
    await expect.poll(() => portrait.evaluate(node => Number(node.style.getPropertyValue("--reveal-strength")))).toBeLessThan(.02);
    await page.getByRole("button", { name: "Clear glasses", exact: true }).click();
    await expect(portrait).toHaveAttribute("data-portrait-mode", "glasses");
    await page.getByRole("button", { name: "StarGod", exact: true }).click();
    if (wide) await expect(page.locator(".maker-chapter")).toHaveAttribute("data-proof", "false");
    const found = new Set();
    assert.ok(await page.locator(".portrait-states button").evaluateAll(buttons => buttons.every(button => { const b = button.getBoundingClientRect(); return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest("button") === button; })), "all portrait controls remain unobstructed by satellites");
    for (const group of ["Build", "Interface", "Systems"]) {
      await page.locator(".maker-groups button").filter({ hasText: group }).click();
      for (const label of await page.locator(".maker-tool").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-label")))) found.add(label);
    }
    assert.equal(found.size, 25);
    await page.locator(".maker-groups button").filter({ hasText: "Build" }).click();
    if (wide) {
      await move(page, .94);
      await expect(page.locator(".maker-chapter")).toHaveAttribute("data-proof", "true");
      await expect(page.locator(".maker-evidence-card[data-arrived='true']")).toHaveCount(5);
      await expect.poll(() => page.locator(".maker-proof-heading").evaluate(node => Number(getComputedStyle(node).opacity))).toBe(1);
      const steady = await portrait.boundingBox();
      assert.ok(Math.abs(steady.y - box.y) < 2 && Math.abs(steady.x - box.x) < 2, "Henry remains at exactly the same center during the exchange");
      await expect(page.locator(".maker-tools")).toBeHidden();
      await page.screenshot({ path: `test-results/portrait/${viewport.width}-proof.png` });
      assert.ok(await page.locator(".portrait-states button").evaluateAll(buttons => buttons.every(button => { const b = button.getBoundingClientRect(); return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest("button") === button; })), "credentials must not cover the portrait controls");
      for (const card of await page.locator(".maker-evidence-card").all()) {
        const bounds = await card.boundingBox();
        assert.ok(bounds.y >= 64 && bounds.y + bounds.height <= viewport.height, "complete credential and caption fit the viewport");
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width, "credential edges remain inside narrow viewports");
      }
    } else await page.locator(".maker-proof-heading").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/portrait/${viewport.width}-proof.png` });
    const card = page.locator(".maker-evidence-card").first();
    await card.click();
    await expect(page.locator(".credential-dialog")).toBeVisible();
    await expect(page.locator(".credential-dialog-stage")).toHaveAttribute("data-image-state", "ready");
    await page.keyboard.press("Escape");
    await expect(card).toBeFocused();
    if (wide) { await move(page, .2); await expect(page.locator(".maker-chapter")).toHaveAttribute("data-proof", "false"); }
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await expect.poll(() => page.locator(".worldline-backdrop").getAttribute("data-hole-opacity").then(Number)).toBeGreaterThan(.9);
    await expect(page.locator(".maker-orbit-field canvas")).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false); assert.deepEqual(errors, []);
    await page.close(); console.log(`PASS maker ${viewport.width}x${viewport.height}`);
  }
  if (!process.argv.includes("--capture")) {
    const reduced = await browser.newPage({ viewport: sizes[0], reducedMotion: "reduce" });
    await reduced.goto(url, { waitUntil: "domcontentloaded" });
    await reduced.locator(".maker-evidence-card").first().click();
    await expect(reduced.locator(".credential-dialog")).toBeVisible();
    await reduced.keyboard.press("Escape");
    await reduced.getByRole("button", { name: "Henry", exact: true }).click();
    await expect(reduced.locator(".portrait-reveal")).toHaveAttribute("data-portrait-mode", "human");
    await reduced.close();
    const failed = await browser.newPage({ viewport: sizes[3] });
    await failed.route("**/assets/portrait/*cosmic*", route => route.abort());
    await failed.route("https://cdn.simpleicons.org/**", route => route.abort());
    await failed.goto(url, { waitUntil: "domcontentloaded" });
    await failed.locator(".intro-loader").waitFor({ state: "hidden" });
    await failed.locator(".portrait-reveal").scrollIntoViewIfNeeded();
    await expect(failed.locator(".portrait-reveal")).toHaveAttribute("data-portrait-mode", "sunglasses");
    await expect(failed.locator(".maker-tool")).toHaveCount(6);
    await failed.locator(".maker-tools").scrollIntoViewIfNeeded();
    await expect(failed.locator(".maker-tool-icon small")).toHaveCount(6);
    await failed.close();
    const touch = await browser.newPage({ viewport: sizes[3], hasTouch: true, isMobile: true });
    await touch.goto(url, { waitUntil: "domcontentloaded" });
    await touch.locator(".intro-loader").waitFor({ state: "hidden" });
    await touch.locator(".portrait-reveal").scrollIntoViewIfNeeded();
    await expect(touch.locator(".portrait-reveal")).toHaveAttribute("data-interactive", "true");
    const face = await touch.locator(".portrait-reveal").boundingBox();
    await touch.touchscreen.tap(face.x + face.width * .5, face.y + face.height * .34);
    // The touch reveal intentionally returns to cosmic, so sample its brief peak.
    await expect.poll(() => touch.locator(".portrait-reveal").evaluate(node => Number(node.style.getPropertyValue("--human-opacity"))), { intervals: [100] }).toBeGreaterThan(.9);
    await expect.poll(() => touch.locator(".portrait-reveal").evaluate(node => Number(node.style.getPropertyValue("--reveal-strength")))).toBeLessThan(.02);
    await touch.close(); console.log("PASS reduced motion, failed portrait/icons, and native touch reveal");
    const noGL = await browser.newPage({ viewport: sizes[3] });
    await noGL.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith("webgl") ? null : original.call(this, type, ...args); }; });
    await noGL.goto(url, { waitUntil: "domcontentloaded" });
    await noGL.locator(".intro-loader").waitFor({ state: "hidden" });
    await move(noGL, .2);
    await expect(noGL.locator(".maker-scene")).toHaveAttribute("data-webgl", "false");
    await expect(noGL.locator(".maker-tool-icon").first()).toBeVisible();
    await noGL.locator(".maker-tool").first().focus(); await noGL.keyboard.press("Enter");
    await move(noGL, .94); await noGL.locator(".maker-evidence-card").first().click();
    await expect(noGL.locator(".credential-dialog")).toBeVisible();
    await noGL.close(); console.log("PASS no-WebGL semantic orbit and credential viewer");
  }
} finally { await browser.close(); }
