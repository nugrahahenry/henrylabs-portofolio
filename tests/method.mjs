import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const executablePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, ...(existsSync(executablePath) ? { executablePath } : {}) });
const viewports = [
  { width: 1440, height: 900 }, { width: 1024, height: 768 },
  { width: 768, height: 1024 }, { width: 390, height: 844 },
  { width: 360, height: 800 }, { width: 844, height: 390 },
];

try {
  mkdirSync("test-results", { recursive: true });
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator(".intro-loader").waitFor({ state: "hidden" });
    await expect(page.locator(".site-shell")).toHaveAttribute("data-motion", "on");
    const method = page.locator("#method");
    const steps = method.locator(".signal-steps > span:not(.signal-progress)");
    await expect(steps).toHaveCount(3);
    await expect(method.locator("strong")).toHaveCount(3);
    await expect(method.locator(".method-scene")).toHaveCount(0);
    const range = await method.evaluate((section) => {
      const rect = section.getBoundingClientRect();
      const top = scrollY + rect.top;
      return { start: top - innerHeight * .85, end: top + rect.height / 2 - innerHeight / 2 };
    });
    for (const [progress, step] of [[0, "01"], [.5, "02"], [1, "03"], [.5, "02"], [1, "03"]]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), range.start + (range.end - range.start) * progress);
      await expect(method.locator('[aria-current="step"] i')).toHaveText(step);
    }
    const center = await method.evaluate((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    assert.ok(Math.abs(center - viewport.height / 2) < 2, "step 03 must be active at viewport center");
    if (viewport.height >= 700) await expect(steps.last()).toBeInViewport();
    await page.screenshot({ path: `test-results/${viewport.width}-method-centered.png` });
    await steps.last().scrollIntoViewIfNeeded();
    await expect(method.locator('[aria-current="step"] i')).toHaveText("03");
    await page.getByRole("button", { name: "Toggle language" }).click();
    await expect(method.locator("strong")).toHaveCount(3);
    await expect(method.locator('[aria-current="step"] strong')).toHaveText("Kirim langkah berguna berikutnya");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`method QA passed at ${viewport.width}x${viewport.height}`);
  }
  const reduced = await browser.newPage({ viewport: viewports[3], reducedMotion: "reduce" });
  await reduced.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await expect(reduced.locator(".site-shell")).toHaveAttribute("data-motion", "off");
  await expect(reduced.locator('#method [aria-current="step"] i')).toHaveText("03");
  const reducedTransform = await reduced.locator(".signal-progress").evaluate((line) => getComputedStyle(line).transform);
  assert.ok(["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(reducedTransform), "reduced motion must keep the full reading track visible");
  await reduced.close();
  console.log("method reduced-motion QA passed");
} finally {
  await browser.close();
}
