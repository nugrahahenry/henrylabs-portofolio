import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect as baseExpect } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 20000 });
const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
mkdirSync("test-results/contact-path", { recursive: true });
const cases = [
  { width: 1440, height: 900 }, { width: 1024, height: 768 },
  { width: 768, height: 1024 }, { width: 390, height: 844 },
  { width: 320, height: 740 }, { width: 844, height: 390 },
  { width: 1440, height: 900, motion: "off", language: "id" },
  { width: 390, height: 844, reducedMotion: "reduce", language: "id" },
];
const targets = process.argv.includes("--preferences") ? cases.filter(config => config.motion || config.reducedMotion) : cases;

async function contactLink(page) {
  const menu = page.locator(".mobile-nav summary");
  if (await menu.isVisible()) {
    await menu.focus();
    await page.keyboard.press("Enter");
  }
  return page.locator(await menu.isVisible() ? ".mobile-nav nav" : ".desktop-nav").locator('a[href$="#contact"]');
}

async function arrival(page) {
  await expect(page.locator(".intro-loader")).toBeHidden();
  await expect(page.locator("#contact")).toBeFocused();
  await expect(page.locator("#contact-title")).toBeInViewport();
  await page.keyboard.press("Tab");
  await expect(page.locator('.contact-actions a[href^="https://wa.me/"]')).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator('.contact-actions a[href^="mailto:"]')).toBeFocused();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}

try {
  for (const config of targets) {
    const { width, height, motion, language, reducedMotion } = config;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion, hasTouch: width <= 640 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    const params = new URLSearchParams();
    if (motion) params.set("motion", motion);
    if (language) params.set("lang", language);
    const query = params.size ? `?${params}` : "";
    const label = `${width}-${height}-${motion ?? reducedMotion ?? "animated"}`;

    for (const source of ["/projects", "/credentials", "/projects/catmoji"]) {
      await page.goto(`${base}${source}${query}`, { waitUntil: "load" });
      await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true");
      const link = await contactLink(page);
      if (source === "/credentials") {
        if (width <= 640) await link.tap();
        else await link.click();
      } else {
        await link.focus();
        await page.keyboard.press("Enter");
      }
      await expect(page).toHaveURL(url => url.origin === new URL(base).origin && url.pathname === "/" && url.hash === "#contact");
      assert.deepEqual([...new URL(page.url()).searchParams].sort(), [...params].sort(), "navigation preserves preferences regardless of query order");
      await arrival(page);
      if (source === "/credentials") await page.screenshot({ path: `test-results/contact-path/${label}.png` });
      await page.goBack();
      await expect(page).toHaveURL(`${base}${source}${query}`);
      await expect(page.locator("h1")).toBeVisible();
    }
    console.log(`PASS contact entry ${label}: catalogs/detail and browser Back`);

    // Same-page and repeated fragment links use the native focusable destination.
    await page.goto(`${base}/${query}`, { waitUntil: "load" });
    await expect(page.locator(".intro-loader")).toBeHidden();
    for (let attempt = 0; attempt < 2; attempt++) {
      const link = await contactLink(page);
      await link.focus();
      await page.keyboard.press("Enter");
      await arrival(page);
    }

    // Direct fragment arrival also waits for the inert intro gate to open.
    await page.goto(`${base}/${query}#contact`, { waitUntil: "load" });
    await arrival(page);
    await page.locator(".language-toggle").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".language-toggle")).toBeFocused();
    assert.deepEqual(errors, [], `${label} browser errors`);
    await page.close();
    console.log(`PASS contact path ${label}: catalogs/detail, back, same-page, repeat, direct, focus order`);
  }
} finally {
  await browser.close();
}
