import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const reports = [], failures = [];
mkdirSync("test-results/opening-journey", { recursive: true });
const check = (condition, message) => { if (!condition) failures.push(message); };

async function opening(viewport, query = "?intro=1", setup) {
  const page = await browser.newPage({ viewport });
  await page.clock.install({ time: new Date("2026-10-13T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-13T00:00:01Z"));
  if (setup) await page.addInitScript(setup);
  await page.goto(`${base}/${query}`, { waitUntil: "domcontentloaded" });
  await expect.poll(async () => {
    await page.clock.runFor(16);
    return page.locator("html").getAttribute("data-preferences-ready");
  }, { timeout: 20000 }).toBe("true");
  await page.clock.runFor(500);
  return page;
}

try {
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    const page = await opening(viewport);
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const intro = page.locator(".arrival-intro");
    const skip = page.getByRole("button", {name:"Skip intro",exact:true});
    await expect(skip).toBeVisible();
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.mouse.wheel(0, 650);
    await page.clock.runFor(600);
    const wheelScroll = await page.evaluate(() => scrollY);
    check(wheelScroll === 0, `${viewport.width}: wheel scrolled behind intro by ${wheelScroll}px`);
    await skip.focus();
    await page.keyboard.press("PageDown");
    await page.clock.runFor(400);
    check(await page.evaluate(() => scrollY === 0), `${viewport.width}: PageDown escaped the opening`);
    await skip.focus();
    await page.keyboard.press("Tab");
    check(await intro.evaluate(n=>n.contains(document.activeElement)), `${viewport.width}: Tab escaped into hidden page content`);
    await skip.focus();
    await page.keyboard.press("Shift+Tab");
    check(await intro.evaluate(n=>n.contains(document.activeElement)), `${viewport.width}: reverse Tab escaped the opening`);
    const before = Number(await intro.getAttribute("data-intro-progress"));
    await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));});
    await page.clock.fastForward(60000);
    check(Number(await intro.getAttribute("data-intro-progress")) === before, `${viewport.width}: hidden tab consumed the intro`);
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"));});
    await page.clock.runFor(120);
    const resumed = Number(await intro.getAttribute("data-intro-progress"));
    check(resumed > before && resumed - before < 1, `${viewport.width}: visible resume skipped ahead ${resumed-before}%`);
    if (!(await intro.getAttribute("class")).includes("intro-loader--done")) {
      await skip.focus();
      await page.keyboard.press("Enter");
      await page.clock.runFor(1000);
      check(await page.locator("#main-content").evaluate(n=>n===document.activeElement), `${viewport.width}: Skip left focus on hidden controls`);
    }
    await page.clock.runFor(1400);
    await expect(intro).toHaveAttribute("aria-hidden", "true");
    await page.screenshot({path:`test-results/opening-journey/${viewport.width}-skip.png`});
    check(await page.evaluate(()=>scrollY===0), `${viewport.width}: hero did not open at the top`);
    check(await page.locator(".site-header").evaluate(n=>!n.inert), `${viewport.width}: header remained inert after intro`);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
    await page.clock.runFor(400);
    await page.getByRole("button", {name:"Explore the universe",exact:true}).click();
    await page.clock.runFor(1600);
    await expect(page.locator(".cosmic-canvas")).toBeFocused();
    const landing = await page.locator(".hero-stage").evaluate(n=>(scrollY-n.offsetTop)/(n.offsetHeight-innerHeight));
    check(Math.abs(landing-.57)<.003, `${viewport.width}: Explore missed the exploration plateau: ${landing}`);
    await expect.poll(async () => {
      await page.clock.runFor(100);
      return Number(await page.locator(".worldline-backdrop").getAttribute("data-sky-presence"));
    }).toBeLessThanOrEqual(.621);
    await page.screenshot({path:`test-results/opening-journey/${viewport.width}-explore.png`});
    reports.push({viewport,wheelScroll,before,resumed,landing,errors});
    check(errors.length===0, `${viewport.width}: runtime errors ${errors}`);
    await page.close();
  }
  const still = await opening({width:390,height:844}, "?intro=1&motion=off");
  check(await still.locator(".site-shell").getAttribute("data-intro")==="done", "Still preference must bypass even a replay URL");
  check(await still.locator(".arrival-field-canvas").count()===0, "Still must not mount an empty intro canvas");
  await still.close();
  const finishing = await opening({width:390,height:844});
  const finishingIntro = finishing.locator(".arrival-intro");
  const beforeResize = Number(await finishingIntro.getAttribute("data-intro-progress"));
  await finishing.setViewportSize({width:844,height:390});
  await finishing.clock.runFor(300);
  check(Number(await finishingIntro.getAttribute("data-intro-progress"))>=beforeResize, "rotation must not restart the search");
  const skipRect = await finishing.locator(".arrival-skip").boundingBox();
  check(skipRect.x>=0 && skipRect.y>=0 && skipRect.x+skipRect.width<=844 && skipRect.y+skipRect.height<=390, "Skip must remain reachable after rotation");
  let frames = 0;
  while (Number(await finishingIntro.getAttribute("data-intro-progress"))<100 && frames++<110) await finishing.clock.fastForward(250);
  check(frames<110, "the normal opening must reach its final hold in bounded visible time");
  await finishing.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));});
  await finishing.clock.fastForward(60000);
  check(await finishing.locator(".site-shell").getAttribute("data-intro")==="active", "hidden time must not consume the final destination hold");
  await finishing.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"));});
  await finishing.clock.runFor(2000);
  await expect(finishing.locator(".site-shell")).toHaveAttribute("data-intro","done");
  await expect(finishing.locator("#main-content")).toBeFocused();
  await finishing.goto(`${base}/?intro=1`, {waitUntil:"domcontentloaded"});
  await finishing.clock.runFor(600);
  await expect(finishing.getByRole("button", {name:"Skip intro",exact:true})).toBeVisible();
  await finishing.keyboard.press("Escape");
  await finishing.clock.runFor(1000);
  await expect(finishing.locator(".site-shell")).toHaveAttribute("data-intro","done");
  check(await finishing.evaluate(()=>getComputedStyle(document.documentElement).overflowY!=="hidden"), "Escape must release the opening scroll lock");
  await finishing.close();
  const unavailableStorage = await opening({width:390,height:844}, "?intro=1&lang=id", () => {
    Storage.prototype.getItem = () => {throw new DOMException("Unavailable", "SecurityError");};
    Storage.prototype.setItem = () => {throw new DOMException("Unavailable", "SecurityError");};
  });
  await unavailableStorage.getByRole("button",{name:"Lewati intro",exact:true}).click();
  await unavailableStorage.clock.runFor(1000);
  await expect(unavailableStorage.locator(".site-shell")).toHaveAttribute("data-intro","done");
  await expect(unavailableStorage.locator(".hero-copy")).not.toHaveAttribute("inert", "");
  await unavailableStorage.close();
  assert.deepEqual(failures, []);
  console.log("PASS opening input, hidden clock/hold, skip focus, rotation, replay/Escape, Explore, Still and storage denial");
} finally {
  writeFileSync("test-results/opening-journey/report.json", JSON.stringify({reports,failures},null,2));
  await browser.close();
}
