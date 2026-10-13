import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
mkdirSync("test-results/maker-continuity", { recursive: true });
async function move(page, value) {
  await page.locator(".maker-chapter").evaluate((node, value) => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top + (node.offsetHeight - innerHeight) * value, behavior: "instant" }), value);
  await expect.poll(() => page.locator(".maker-chapter").evaluate(node => Number(node.style.getPropertyValue("--maker-progress")))).toBeCloseTo(value, 2);
}
async function inView(locator) {
  await expect.poll(() => locator.evaluate(node => { const r = node.getBoundingClientRect(); return r.y >= 0 && r.bottom <= innerHeight && r.x >= 0 && r.right <= innerWidth; })).toBe(true);
}
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport });
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(url, { waitUntil: "load" });
    await page.locator(".intro-loader").waitFor({ state: "hidden" });
    await move(page, .87);
    const card = page.locator(".maker-evidence-card").first();
    await expect(page.locator(".maker-evidence-card[data-arrived='true']")).toHaveCount(5);
    await card.click();
    await expect(page.locator(".credential-dialog-stage")).toHaveAttribute("data-image-state", "ready");
    const y = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 700); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => scrollY), y, "viewer protects its underlying chapter");
    await page.keyboard.press("Escape"); await expect(card).toBeFocused();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator(".maker-chapter")).toHaveAttribute("data-spatial", "false");
    await inView(card);
    await page.screenshot({ path: `test-results/maker-continuity/${viewport.width}-linear.png` });
    await page.setViewportSize(viewport);
    await expect(page.locator(".maker-chapter")).toHaveAttribute("data-proof", "true");
    await expect(page.locator(".maker-evidence-card[data-arrived='true']")).toHaveCount(5);
    await inView(card); await expect(card).toBeFocused();
    await page.screenshot({ path: `test-results/maker-continuity/${viewport.width}-proof.png` });
    await move(page, .35);
    await expect(page.locator(".maker-groups [aria-pressed='true']")).toContainText("Systems");
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator(".maker-chapter")).toHaveAttribute("data-spatial", "false");
    await inView(page.locator(".maker-groups"));
    await page.setViewportSize(viewport);
    await expect(page.locator(".maker-groups [aria-pressed='true']")).toContainText("Systems");
    await expect(page.locator(".maker-orbit-field")).toHaveAttribute("data-ready", "true");
    await page.screenshot({ path: `test-results/maker-continuity/${viewport.width}-tools.png` });
    // DOM click leaves the current reading position unchanged while exercising the real preference action.
    await page.locator(".motion-toggle").evaluate(node => node.click());
    await expect(page.locator(".maker-chapter")).toHaveAttribute("data-spatial", "false");
    await inView(page.locator(".maker-groups"));
    await page.locator(".motion-toggle").evaluate(node => node.click());
    await expect(page.locator(".maker-chapter")).toHaveAttribute("data-spatial", "true");
    await expect(page.locator(".maker-groups [aria-pressed='true']")).toContainText("Systems");
    await move(page, .87);
    await page.locator(".motion-toggle").evaluate(node => node.click());
    await expect(page.locator(".maker-chapter")).toHaveAttribute("data-spatial", "false");
    await inView(card);
    await page.locator(".motion-toggle").evaluate(node => node.click());
    await expect(page.locator(".maker-chapter")).toHaveAttribute("data-proof", "true");
    await inView(card);
    await card.click();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator(".credential-dialog")).toBeVisible();
    await expect(page.locator(".credential-dialog-close")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(card).toBeFocused(); await inView(card);
    await page.setViewportSize(viewport);
    await expect(page.locator(".maker-chapter")).toHaveAttribute("data-proof", "true");
    await inView(card);
    await move(page, .2);
    await page.locator(".maker-groups button").filter({ hasText: "All" }).click();
    await page.setViewportSize({ width: 844, height: 390 });
    await inView(page.locator(".maker-groups"));
    await page.locator(".maker-groups button").filter({ hasText: "Build" }).click();
    await page.setViewportSize(viewport);
    await expect(page.locator(".maker-groups [aria-pressed='true']")).toContainText("Build");
    await expect.poll(() => page.locator(".maker-tools").evaluate(node => Number(getComputedStyle(node).opacity))).toBe(1);
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await expect.poll(() => page.locator(".worldline-backdrop").getAttribute("data-hole-opacity").then(Number)).toBeGreaterThan(.9);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(() => page.locator("#contact").evaluate(node => node.getBoundingClientRect().bottom > 0 && node.getBoundingClientRect().top < innerHeight)).toBe(true);
    assert.deepEqual(errors, []);
    await page.close(); console.log(`PASS maker continuity ${viewport.width}`);
  }
} finally { await browser.close(); }
