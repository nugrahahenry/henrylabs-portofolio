import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect as playwrightExpect } from "@playwright/test";

const expect = playwrightExpect.configure({ timeout: 15000 });
const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
mkdirSync("test-results/image-inspection", { recursive: true });

async function drag(page, area) {
  const box = await area.boundingBox();
  const x = box.x + box.width * .7, y = box.y + box.height * .6;
  const before = await area.evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop, maxY: node.scrollHeight - node.clientHeight }));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 90, y - 55, { steps: 8 });
  await expect.poll(() => area.evaluate(node => node.scrollLeft)).toBeGreaterThan(before.x + 40);
  if (before.maxY > 55) await expect.poll(() => area.evaluate(node => node.scrollTop)).toBeGreaterThan(before.y + 20);
  await expect(area).toHaveAttribute("data-panning", "true");
  await page.mouse.up();
  await expect(area).not.toHaveAttribute("data-panning", "true");
  await expect(area).toBeFocused();
}

try {
  for (const [width, height, language] of process.argv.includes("--baseline") ? [[1440, 900, "en"]] : [[1440, 900, "en"], [390, 844, "id"], [844, 390, "en"]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    const en = language === "en";
    for (const kind of ["artwork", "credential"]) {
      await page.goto(`${base}/${kind === "artwork" ? "projects/catmoji" : "credentials"}?motion=off&lang=${language}`);
      const opener = page.locator(kind === "artwork" ? ".project-visual-open" : ".credential-record-preview").first();
      await opener.click();
      const dialog = page.getByRole("dialog");
      const area = dialog.locator(kind === "artwork" ? ".project-art-stage" : ".credential-dialog-image");
      const zoom = dialog.getByRole("button", { name: kind === "artwork" ? (en ? "Zoom artwork" : "Perbesar artwork") : (en ? "Zoom certificate" : "Perbesar sertifikat"), exact: true });
      await expect(zoom).toBeEnabled();
      await zoom.click();
      const bodyY = await page.evaluate(() => scrollY);
      await drag(page, area);
      assert.equal(await page.evaluate(() => scrollY), bodyY, "Dragging never scrolls the universe behind the dialog");
      await page.screenshot({ path: `test-results/image-inspection/${width}-${kind}-zoom.png` });
      await area.evaluate(node => node.scrollTo(0, 0));
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => area.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
      await area.evaluate(node => node.scrollTo(0, 0));
      const box = await area.boundingBox();
      const cdp = await page.context().newCDPSession(page);
      const x = box.x + box.width * .75, y = box.y + box.height * .65;
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1, pointerType: "pen" });
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x - 70, y: y - 30, buttons: 1, pointerType: "pen" });
      await expect.poll(() => area.evaluate(node => node.scrollLeft)).toBeGreaterThan(30);
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x - 70, y: y - 30, button: "left", buttons: 0, clickCount: 1, pointerType: "pen" });
      await expect(area).not.toHaveAttribute("data-panning", "true");
      await area.evaluate(node => node.scrollTo(0, 0));
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - i * 15, y: y - i * 5 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => area.evaluate(node => node.scrollLeft)).toBeGreaterThan(20);
      await expect(area).not.toHaveAttribute("data-panning", "true");
      await cdp.detach();
      await area.evaluate(node => node.scrollTo(0, 0));
      await page.mouse.move(box.x + box.width * .6, box.y + box.height * .5);
      await page.mouse.down();
      await expect(area).toHaveAttribute("data-panning", "true");
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await expect(area).not.toHaveAttribute("data-panning", "true");
      await page.mouse.up();
      await drag(page, area);
      const fit = dialog.getByRole("button", { name: kind === "artwork" ? (en ? "Fit artwork" : "Sesuaikan artwork") : (en ? "Fit certificate" : "Sesuaikan sertifikat"), exact: true });
      await fit.click();
      await expect.poll(() => area.evaluate(node => node.scrollLeft + node.scrollTop)).toBe(0);
      assert.notEqual(await area.evaluate(node => getComputedStyle(node).cursor), "grab", "Fitted images do not advertise panning");
      await page.screenshot({ path: `test-results/image-inspection/${width}-${kind}-fit.png` });
      await dialog.getByRole("button", { name: kind === "artwork" ? (en ? "Zoom artwork" : "Perbesar artwork") : (en ? "Zoom certificate" : "Perbesar sertifikat"), exact: true }).click();
      const finalBox = await area.boundingBox();
      await page.mouse.move(finalBox.x + finalBox.width * .6, finalBox.y + finalBox.height * .5);
      await page.mouse.down();
      await page.keyboard.press("Escape");
      await page.mouse.up();
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
      await opener.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator("[data-panning='true']")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(opener).toBeFocused();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`PASS ${width} ${kind}: mouse/pen pan, native touch, keyboard, blur/restart, fit, Escape during drag and reopen/focus`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally { await browser.close(); }
