import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const sizes = process.argv.includes("--confirm") ? [[1440, 900], [390, 844]] : process.argv.includes("--compact") ? [[390, 844], [360, 800], [844, 390]] : [[1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 800], [844, 390]];
mkdirSync("test-results/spatial-type", { recursive: true });
const tilt = page => page.locator(".spatial-title-face").evaluate(n => {
  const m = new DOMMatrix(getComputedStyle(n).transform);
  return Math.abs(m.m13) + Math.abs(m.m23);
});

async function ready(page, suffix = "") {
  await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
  await page.goto(new URL(suffix, base).href, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true");
  await expect(page.locator(".intro-loader")).toBeHidden();
}

try {
  for (const [width, height] of sizes) {
    const touch = width <= 480;
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (/Shader Error|THREE.WebGLProgram/.test(m.text())) errors.push(m.text()); });
    await ready(page);
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-ready", "true");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "I build things I actually see.", exact: true })).toBeVisible();
    const title = await page.locator("#hero-title").boundingBox();
    const actions = await page.locator(".hero-actions").boundingBox();
    await page.mouse.move(title.x + title.width * .86, title.y + title.height * .25);
    if (touch) assert.ok(await tilt(page) < .001, "coarse pointer does not tilt text");
    else await expect.poll(() => tilt(page)).toBeGreaterThan(.025);
    const face = await page.locator(".spatial-title-face").boundingBox();
    const body = await page.locator(".hero-body").boundingBox();
    assert.ok(face.x >= 0 && face.x + face.width <= width && face.y + face.height < body.y, "tilted title stays inside its reading space");
    assert.deepEqual(await page.locator(".hero-actions").boundingBox(), actions, "title motion cannot move the controls");
    await page.screenshot({ path: `test-results/spatial-type/${width}-title.png` });
    await page.mouse.move(3, 3);
    await expect.poll(() => tilt(page)).toBeLessThan(.001);
    await page.getByRole("button", { name: "Toggle language" }).click();
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.screenshot({ path: `test-results/spatial-type/${width}-title-id.png` });
    await page.getByRole("button", { name: "Toggle language" }).click();
    await page.getByRole("button", { name: "Explore the universe", exact: true }).click();
    const scene = page.locator(".cosmic-canvas");
    await expect(scene).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    await expect(page.locator("html")).not.toHaveClass(/lenis-scrolling/);
    await expect.poll(() => page.locator(".cosmic-frame-wrap").evaluate(n => new DOMMatrix(getComputedStyle(n).transform).m11)).toBeGreaterThan(.999);
    await expect(page.locator("#hero-title")).toHaveAttribute("data-depth", "still");
    for (const label of await page.locator(".galaxy-label").all()) {
      const box = await label.boundingBox();
      assert.ok(box.height >= 43.95 && box.width >= 111.95, `minimum touch target: ${JSON.stringify(box)}`);
      await label.focus();
      await expect(label).toHaveAttribute("data-highlighted", "true");
      const settled = await label.boundingBox();
      assert.ok(Math.abs(settled.width - box.width) < .05 && Math.abs(settled.height - box.height) < .05, "focus changes lettering, not target dimensions");
      await expect(label.locator(".galaxy-label-plate")).toBeInViewport({ ratio: .99 });
      const scale = await label.evaluate(n => Number(n.style.getPropertyValue("--letter-scale")));
      assert.ok(scale >= .94 && scale <= 1.055);
    }
    await page.screenshot({ path: `test-results/spatial-type/${width}-galaxies.png` });
    const painted = await scene.locator("canvas").evaluate(canvas => new Promise(resolve => requestAnimationFrame(() => {
      const gl = canvas.getContext("webgl2"), pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let count = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 20) count++;
      resolve(count);
    })));
    assert.ok(painted > 250, "spatial labels retain a real painted galaxy scene");
    const epoch = await scene.getAttribute("data-renderer-epoch");
    for (const name of ["HenryLabs", "University", "Client Work"]) {
      const label = page.getByRole("button", { name: `Explore ${name} galaxy`, exact: true });
      await label.focus();
      await page.keyboard.press("Enter");
      await expect(scene).toHaveAttribute("data-flight", "1.000");
      await expect(page.getByRole("button", { name: "Open active world", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Back to universe", exact: true }).click();
      await expect(scene).toHaveAttribute("data-flight", "0.000");
    }
    assert.equal(await scene.getAttribute("data-renderer-epoch"), epoch);
    assert.equal(await page.locator("canvas").count(), 2);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS spatial typography ${width}x${height}`);
  }
  for (const reduced of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: reduced ? "reduce" : "no-preference" });
    await ready(page, reduced ? "/" : "/?motion=off");
    await expect(page.locator(".spatial-title-face")).toHaveCSS("transform", "none");
    await page.locator(".galaxy-label").first().scrollIntoViewIfNeeded();
    for (const plate of await page.locator(".galaxy-label-plate").all()) await expect(plate).toHaveCSS("transform", "none");
    await page.close();
  }
  console.log("PASS still and device reduced-motion typography");
} finally { await browser.close(); }
