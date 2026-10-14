import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const baseline = process.argv.includes("--baseline");
const dir = `test-results/sky-lighting/${baseline ? "before" : "after"}`;
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const reports = [];
async function pose(page, progress) {
  await page.locator(".hero-stage").evaluate((node, p) => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top + (node.offsetHeight - innerHeight) * p, behavior: "instant" }), progress);
  await page.waitForTimeout(1100);
}
try {
  for (const [width, height] of [[1440, 900], [390, 844], [768, 1024]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (/Shader Error|THREE.WebGLProgram/.test(message.text())) errors.push(message.text()); });
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(process.env.PORTFOLIO_URL ?? "http://localhost:3002/", { waitUntil: "load" });
    const sky = page.locator(".worldline-backdrop");
    await expect(sky).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".intro-loader")).toBeHidden();
    for (const [name, p] of [["hero", 0], ["map", .57], ["departure", .94]]) {
      await pose(page, p);
      await page.screenshot({ path: `${dir}/${width}-${name}.png` });
      const data = await sky.evaluate(node => ({ ...node.dataset }));
      const canvas = await sky.locator("canvas").evaluate(node => node.toDataURL());
      const buffer = Buffer.from(canvas.split(",")[1], "base64");
      const stats = await sharp(buffer).removeAlpha().stats();
      assert.ok(stats.channels.some(channel => channel.stdev > 10), "real sky pixels must paint");
      assert.ok(+data.drawCalls < 65, "lighting must not add render passes");
      if (!baseline) {
        assert.ok(name === "departure" ? +data.openingLight < .6 : +data.openingLight > .99);
      }
      reports.push({ width, height, name, light: data.openingLight, calls: data.drawCalls, std: stats.channels.map(channel => channel.stdev) });
    }
    await page.locator(".maker-chapter").evaluate(node => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top + (node.offsetHeight - innerHeight) * .35, behavior: "instant" }));
    if (!baseline) await expect.poll(() => sky.getAttribute("data-opening-light").then(Number)).toBe(0);
    await page.locator("#contact").scrollIntoViewIfNeeded();
    if (!baseline) await expect.poll(() => sky.getAttribute("data-opening-light").then(Number)).toBe(0);
    await pose(page, .57);
    if (!baseline) await expect.poll(() => sky.getAttribute("data-opening-light").then(Number)).toBeGreaterThan(.99);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS sky lighting ${width}x${height} (${baseline ? "before" : "after"})`);
  }
  if (!baseline) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
    await page.goto(`${base}/?intro=1`);
    const sky = page.locator(".worldline-backdrop");
    await expect(sky).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".intro-loader")).toBeVisible();
    await expect(sky).toHaveAttribute("data-opening-light", "0.000");
    await page.getByRole("button", { name: "Skip intro", exact: true }).click();
    await expect.poll(() => sky.getAttribute("data-opening-light").then(Number)).toBeGreaterThan(.99);
    await page.goto(`${base}/?motion=off`);
    await expect(sky).toHaveAttribute("data-ready", "true");
    await expect(sky).toHaveAttribute("data-opening-light", "1.000");
    const still = await sky.locator("canvas").evaluate(node => node.toDataURL());
    await page.waitForTimeout(250);
    assert.equal(await sky.locator("canvas").evaluate(node => node.toDataURL()), still, "Still lighting must not run a new animation clock");
    for (const route of ["projects", "credentials"]) {
      await page.goto(`${base}/${route}?motion=off`);
      await expect(page.locator(".reading-sky")).toHaveAttribute("data-ready", "true");
    }
    await page.close();
    console.log("PASS opening gate, Still pixels and shared library shaders");
  }
} finally {
  writeFileSync(`${dir}/report.json`, JSON.stringify(reports, null, 2));
  await browser.close();
}
