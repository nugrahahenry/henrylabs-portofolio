import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = process.env.PORTFOLIO_URL ?? "http://localhost:3002";
mkdirSync("test-results/project-contact", { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const slugs = ["catmoji", "nalira", "canox", "hengs", "polara", "rentalmobil-sg", "pos-z-shoes", "labq", "y-ventures", "soreva"];

async function checkDrafts(page, language) {
  const name = await page.locator("h1").innerText();
  const section = page.locator(".detail-contact");
  await expect(section).toHaveCount(1);
  const wa = section.locator('a[href^="https://wa.me/"]');
  const email = section.locator('a[href^="mailto:"]');
  await expect(wa).toHaveText(language === "en" ? "Discuss on WhatsApp" : "Diskusi via WhatsApp");
  const link = new URL(await wa.getAttribute("href"));
  const mail = new URL(await email.getAttribute("href"));
  assert.equal(link.pathname, "/6289513595554");
  assert.equal(mail.pathname, "henrynugraha1210@gmail.com");
  const message = link.searchParams.get("text");
  assert.ok(message.includes(name));
  assert.match(message, language === "en" ? /^Hi Henry,/ : /^Halo Henry,/);
  assert.equal(message, mail.searchParams.get("body"));
  assert.doesNotMatch(message, /localhost|qa-private-query|spoofed|returnTo|attacker/);
  assert.ok(mail.searchParams.get("subject").includes(name));
  await expect(wa).toHaveAttribute("target", "_blank");
  await expect(wa).toHaveAttribute("rel", /noreferrer/);
  await expect(email).not.toHaveAttribute("target", "_blank");
  return { section, wa, email };
}

try {
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 740], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 500, reducedMotion: width === 320 ? "reduce" : "no-preference" });
    const outbound = [];
    // Intercept the external destination before network access; never send a real inquiry.
    await context.route("https://wa.me/**", route => {
      outbound.push(route.request().url());
      return route.fulfill({ status: 200, contentType: "text/plain", body: "Local QA intercepted this draft." });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const language = width < 500 ? "id" : "en";
    await page.goto(`${base}/projects/polara?from=universe&lang=${language}&q=qa-private-query&to=attacker&text=spoofed`);
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true");
    const { section, wa, email } = await checkDrafts(page, language);
    assert.equal(outbound.length, 0, "no WhatsApp request before visitor intent");
    await section.scrollIntoViewIfNeeded();
    await wa.focus();
    await expect(wa).toBeFocused();
    assert.equal(await wa.evaluate(n => getComputedStyle(n).outlineStyle), "solid");
    await page.keyboard.press("Tab");
    await expect(email).toBeFocused();
    const proof = page.locator(".polara-mobile-proof img");
    await expect.poll(() => proof.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await proof.evaluate(image => image.decode());
    await page.screenshot({ path: `test-results/project-contact/${width}-polara.png` });
    for (const node of await section.locator("h2, p, a").all()) {
      assert.ok(await node.evaluate(n => n.scrollWidth <= n.clientWidth + 1), "new copy and buttons fit");
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no page overflow");
    const bounds = await wa.boundingBox();
    assert.ok(bounds.height >= 44 && bounds.width >= 44, "touch target remains usable");
    await wa.focus();
    const popupPromise = page.waitForEvent("popup");
    if (width < 500) await wa.tap();
    else await page.keyboard.press("Enter");
    const popup = await popupPromise;
    await expect.poll(() => outbound.length).toBe(1);
    assert.equal(new URL(outbound[0]).searchParams.get("text"), new URL(await wa.getAttribute("href")).searchParams.get("text"));
    await popup.close();
    await expect(page).toHaveURL(/\/projects\/polara/);
    await expect(page.locator(".detail-route a")).toHaveAttribute("href", /world=polara/);
    await page.locator(".language-toggle").focus();
    await page.keyboard.press("Enter");
    await checkDrafts(page, language === "en" ? "id" : "en");
    await expect(page.locator(".language-toggle")).toBeFocused();
    await page.locator(".detail-neighbor").first().click();
    await expect(page.locator("h1")).not.toHaveText("Polara");
    await checkDrafts(page, language === "en" ? "id" : "en");
    await page.goBack();
    await expect(page.locator("h1")).toHaveText("Polara");
    await checkDrafts(page, language === "en" ? "id" : "en");
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS contextual contact ${width}x${height}: localized draft, keyboard/touch, intercepted new tab, language, neighbor and Back`);
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  for (const slug of slugs) for (const language of ["en", "id"]) {
    await page.goto(`${base}/projects/${slug}?lang=${language}&motion=off`);
    const { section } = await checkDrafts(page, language);
    const primary = page.locator(".detail-actions a.library-action").first();
    if (["catmoji", "nalira", "polara"].includes(slug)) await expect(primary).toHaveAttribute("href", /\.vercel\.app\//);
    if (["canox", "rentalmobil-sg", "y-ventures", "soreva"].includes(slug)) {
      const link = new URL(await primary.getAttribute("href"));
      assert.match(link.searchParams.get(link.protocol === "mailto:" ? "body" : "text"), /walkthrough/);
    }
    if (["pos-z-shoes", "labq"].includes(slug)) await expect(primary).toHaveAttribute("href", /^https:\/\/github\.com\/nugrahahenry\//);
    if (slug === "soreva") {
      await section.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/project-contact/390-soreva-${language}.png` });
      await expect(page.locator(".privacy-note")).toBeVisible();
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.close();
  console.log("PASS all ten projects in EN/ID: canonical recipients, preserved live/source actions and private walkthroughs");
} finally { await browser.close(); }
