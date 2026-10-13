import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });

async function dustPixel(page, index) {
  return page.locator(".worldline-backdrop canvas").evaluate((canvas, index) => {
    const gl = canvas.getContext("webgl2");
    const host = canvas.parentElement;
    const probe = JSON.parse(host.dataset.dustProbes).find(probe => probe.index === index);
    const x = Math.round(probe.x / host.clientWidth * gl.drawingBufferWidth);
    const y = Math.round((1 - probe.y / host.clientHeight) * gl.drawingBufferHeight);
    if (x < 5 || x > gl.drawingBufferWidth - 5 || y < 5 || y > gl.drawingBufferHeight - 5) return 0;
    const pixels = new Uint8Array(9 * 9 * 4);
    gl.readPixels(x - 4, y - 4, 9, 9, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let center = 0, surrounding = 0, count = 0;
    for (let row = 0; row < 9; row++) for (let column = 0; column < 9; column++) {
      const index = (row * 9 + column) * 4;
      const light = pixels[index] + pixels[index + 1] + pixels[index + 2];
      if (Math.abs(row - 4) <= 2 && Math.abs(column - 4) <= 2) center = Math.max(center, light);
      else { surrounding += light; count++; }
    }
    return center - surrounding / count;
  }, index);
}

async function paintedDust(page) {
  const probes = await page.locator(".worldline-backdrop").evaluate(host => JSON.parse(host.dataset.dustProbes).filter(probe => probe.x > 12 && probe.x < innerWidth - 12 && probe.y > 12 && probe.y < innerHeight - 12 && probe.travel > .07 && probe.travel < .7));
  let best = { light: 0, point: null };
  for (const point of probes) {
    const light = await dustPixel(page, point.index);
    if (light > best.light) best = { light, point };
  }
  return best;
}

async function arrivalProbe(page) {
  return page.locator(".worldline-backdrop canvas").evaluate(canvas => {
    const gl = canvas.getContext("webgl2");
    const points = JSON.parse(canvas.parentElement.dataset.visitorProbes);
    const reading = [".contact-content h2", ".contact-copy", "footer"].map(selector => document.querySelector(selector).getBoundingClientRect());
    const { stellarX, stellarY, stellarOpacity, holeOpacity } = canvas.parentElement.dataset;
    if (Number(holeOpacity) > .99 && reading.some(rect => Number(stellarX) >= rect.left && Number(stellarX) <= rect.right && Number(stellarY) >= rect.top && Number(stellarY) <= rect.bottom)) {
      if (Number(stellarOpacity) > .17) throw Error("original stellar core washes out Contact text");
    }
    let painted = 0;
    for (const point of points.filter(p => p.opacity > .1)) {
      if (point.x - point.extent <= 0 || point.y - point.extent <= 0 || point.x + point.extent >= innerWidth || point.y + point.extent >= innerHeight) throw Error("incoming planet clipped by viewport");
      for (const rect of reading) {
        const dx = Math.max(rect.left-point.x,0,point.x-rect.right), dy = Math.max(rect.top-point.y,0,point.y-rect.bottom);
        if (Math.hypot(dx,dy) < point.extent + 8 && point.opacity > .141) throw Error("incoming planet is too bright behind Contact text");
      }
      const size = Math.max(2, Math.ceil(point.radius));
      const pixels = new Uint8Array(size*size*16);
      gl.readPixels(Math.round(point.x)-size,Math.round(innerHeight-point.y)-size,size*2,size*2,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let min=765,max=0;
      for(let i=0;i<pixels.length;i+=4) {const value=pixels[i]+pixels[i+1]+pixels[i+2]; min=Math.min(min,value); max=Math.max(max,value);}
      if(max-min>20) painted++;
    }
    return {points,painted};
  });
}

try {
  mkdirSync("test-results", { recursive: true });
  const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
  for (const viewport of process.argv.includes("--desktop") ? viewports.slice(0, 1) : process.argv.includes("--phone") ? viewports.slice(1) : viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (/Shader Error|THREE.WebGLProgram/.test(message.text())) errors.push(message.text()); });
    await page.clock.install({ time: new Date("2026-10-07T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-07T00:00:01Z"));
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(url, { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 8; i++) await page.clock.fastForward(250);
    const field = page.locator(".worldline-backdrop");
    await expect(field).toHaveAttribute("data-ready", "true");
    await page.waitForLoadState("load");
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    // Native intersection notifications need a real browser frame, not just a virtual RAF.
    for (let i = 0; i < 50; i++) {
      await page.clock.fastForward(250);
      if (Number(await field.getAttribute("data-birth-age")) > .5) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(Number(await field.getAttribute("data-hole-growth")) < .5);
    await expect(field).toHaveAttribute("data-pull", "0.000");
    await expect(field).toHaveAttribute("data-visitor-opacity", "0.000");
    await expect(field).toHaveAttribute("data-feeding-dust", "false");
    await page.screenshot({ path: `test-results/${viewport.width}-black-hole-birth.png` });
    for (let i = 0; i < 18; i++) await page.clock.fastForward(250);
    await expect(field).toHaveAttribute("data-gravity-active", "true");
    await expect(field).toHaveAttribute("data-hole-growth", "1.000");
    const arrivalFrames=[];
    async function advanceTo(target) {
      let steps = 0;
      while (Number(await field.getAttribute("data-gravity-age")) < target && steps++ < 1100) {
        await page.clock.fastForward(250);
        const sample=await field.evaluate(el=>({age:+el.dataset.gravityAge,progress:+el.dataset.visitorProgress,cycle:+el.dataset.gravityCycle,points:JSON.parse(el.dataset.visitorProbes)}));
        arrivalFrames.push(sample);
        if(sample.progress>=.1&&sample.progress<=.74) for(const point of sample.points.slice(0,sample.cycle===0?3:5)) {
          const inside=point.x-point.extent>24 && point.x+point.extent<viewport.width-24 && point.y-point.extent>24 && point.y+point.extent<viewport.height-24;
          if(inside) assert.ok(point.opacity>=.139,"a traveling planet must not vanish behind text and respawn below it");
        }
      }
      assert.ok(steps < 1100, "the closing clock must advance with visible frame time");
    }
    await advanceTo(3);
    assert.ok(Number(await field.getAttribute("data-visitor-entry-y")) < .3);
    assert.ok(Number(await field.getAttribute("data-visitor-entry-x")) > .3);
    assert.ok(Number(await field.getAttribute("data-visible-visitors")) > 0, "the distant group must already be visible before it approaches the hole");
    const distant = await arrivalProbe(page);
    assert.ok(distant.points.slice(0,3).every(p=>p.opacity<.35 && p.radius<(viewport.width<700?3.5:8)),"the first approach is faint and tiny, never a full-size mid-screen spawn");
    assert.ok(Number(await field.getAttribute("data-visitor-depth")) < -75);
    await expect(field).toHaveAttribute("data-visitor-capture", "0.000");
    await page.screenshot({ path: `test-results/${viewport.width}-distant-arrival.png` });
    await advanceTo(6);
    assert.ok((await arrivalProbe(page)).painted>0,"the far approach gradually resolves into real shaded planet pixels");
    await advanceTo(10);
    const approach = await arrivalProbe(page);
    assert.ok(approach.painted > 0, "the closer group must remain visible before capture");
    assert.ok(approach.points.some((point,index)=>point.opacity>.1 && point.radius>distant.points[index].radius*1.7),"perspective approach must visibly enlarge a retained planet");
    assert.ok(new Set(approach.points.map(p=>p.depth.toFixed(1))).size>=3);
    await page.screenshot({path:`test-results/${viewport.width}-planet-approach.png`});
    await advanceTo(16);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await expect(page.locator("footer")).toBeInViewport();
    assert.ok(await page.locator("footer").evaluate((node) => Number(getComputedStyle(node).zIndex) > 0), "footer words must paint above the fixed backdrop");
    const pull = Number(await field.getAttribute("data-pull"));
    assert.ok(pull >= .49 && pull <= .55, `mid-intake must be slow and continuous: ${pull}`);
    await expect(field).toHaveAttribute("data-visitor-count", "3");
    await expect(field).toHaveAttribute("data-visitor-direction", "left");
    assert.ok(Number(await field.getAttribute("data-visible-visitors")) > 0, "the arriving orbit must actually enter the viewport");
    await arrivalProbe(page);
    await page.screenshot({ path: `test-results/${viewport.width}-slow-gravity-middle.png` });
    await advanceTo(26);
    await arrivalProbe(page);
    await page.screenshot({path:`test-results/${viewport.width}-planet-capture.png`});
    await advanceTo(32.25);
    await expect(field).toHaveAttribute("data-gravity-phase", "rest");
    await expect(field).toHaveAttribute("data-visitor-opacity", "0.000");
    await expect(field).toHaveAttribute("data-feeding-dust", "true");
    await expect(field).toHaveAttribute("data-distant-star-pull", "0.000");
    await expect(field).toHaveAttribute("data-dust-streaks", "60");
    await expect(field).toHaveAttribute("data-dust-motion", "orbital-accretion");
    const firstDust = await paintedDust(page);
    await page.screenshot({ path: `test-results/${viewport.width}-black-hole-rest.png` });
    assert.ok(firstDust.light > 8, `the orbital stream must paint a local grain, not just expose coordinates: ${JSON.stringify(firstDust)}`);
    await advanceTo(33.5);
    const nextDust = JSON.parse(await field.getAttribute("data-dust-probes")).find(probe => probe.index === firstDust.point.index);
    assert.ok(Math.hypot(nextDust.x - firstDust.point.x, nextDust.y - firstDust.point.y) > 5, "the sampled grain must actually move along its spiral");
    assert.ok((await paintedDust(page)).light > 8, "the rotating stream must remain painted while individual paths pass outside the cropped viewport");
    await advanceTo(61);
    await expect(field).toHaveAttribute("data-gravity-cycle", "0");
    await expect(field).toHaveAttribute("data-gravity-phase", "rest");
    await advanceTo(65);
    await expect(field).toHaveAttribute("data-gravity-cycle", "1");
    await expect(field).toHaveAttribute("data-visitor-count", "5");
    await expect(field).toHaveAttribute("data-visitor-direction", "top");
    assert.ok(Number(await field.getAttribute("data-visitor-opacity")) > .1, "a different cached planet must approach faintly after the quiet interval");
    assert.ok((await arrivalProbe(page)).points.every(p=>p.opacity<.35),"the repeat wave also starts faintly in the far field");
    await expect(field).toHaveAttribute("data-pull", "1.000");
    await expect(field).toHaveAttribute("data-distant-star-pull", "0.000");
    await page.screenshot({ path: `test-results/${viewport.width}-second-gravity-visitor.png` });
    await advanceTo(78);
    await page.screenshot({ path: `test-results/${viewport.width}-five-gravity-visitors.png` });
    assert.ok(Number(await field.getAttribute("data-visible-visitors")) > 0, "the five-planet orbit must enter from above");
    await arrivalProbe(page);
    assert.ok(Number(await field.getAttribute("data-draw-calls")) < 65);
    assert.equal(await page.locator("canvas").count(), 2);
    const contactHit = await page.locator('#contact a[href*="wa.me"]').evaluate((link) => {
      const rect = link.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest("a") === link;
    });
    assert.equal(contactHit, true, "the repeat visitor must not block the contact action");
    // Exercise the visibilitychange boundary without depending on headless window focus.
    const beforeHidden = Number(await field.getAttribute("data-gravity-age"));
    await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));});
    await page.clock.fastForward(60000);
    assert.equal(Number(await field.getAttribute("data-gravity-age")),beforeHidden,"hidden tabs must freeze the encounter clock");
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"));});
    await page.clock.fastForward(16);
    assert.ok(Number(await field.getAttribute("data-gravity-age"))<=beforeHidden+.26,"resuming must not fast-forward a hidden minute");
    await advanceTo(94.25);
    const cycle = await field.getAttribute("data-gravity-cycle");
    const count = "5";
    await expect(field).toHaveAttribute("data-gravity-phase", "rest");
    async function retreatTo(value) {
      const scrollTolerance = await page.locator("#contact").evaluate((contact, p) => {
        const rect = contact.getBoundingClientRect();
        const start = scrollY + rect.top - innerHeight * .65;
        const end = scrollY + rect.bottom - innerHeight;
        window.scrollTo({ top: start + (end - start) * p + (p === 0 ? -2 : p === 1 ? 2 : 0), behavior: "instant" });
        return 1 / Math.max(1, end - start) + .001;
      }, value);
      for (let i = 0; i < 80; i++) {
        await page.clock.fastForward(250);
        const p = Number(await field.getAttribute("data-closing-presence"));
        const measured = Number(await field.getAttribute("data-contact-progress"));
        const settled = value === 0 || value === 1 ? p === value : Math.abs(p - measured) < .002;
        if (settled && Math.abs(measured - value) < scrollTolerance) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      const state = await field.evaluate(host => ({ progress: host.dataset.contactProgress, presence: host.dataset.closingPresence, scroll: scrollY, height: document.querySelector("#contact").offsetHeight, viewport: innerHeight }));
      assert.fail(`closing return did not settle at ${value}: ${JSON.stringify(state)}`);
    }
    await retreatTo(.7);
    await expect(field).toHaveAttribute("data-gravity-phase", "return");
    await expect(field).toHaveAttribute("data-gravity-active", "false");
    await expect(field).toHaveAttribute("data-gravity-cycle", cycle);
    await expect(field).toHaveAttribute("data-visitor-count", count);
    const frozenAge = await field.getAttribute("data-gravity-age");
    const returnDust = await paintedDust(page);
    assert.ok(Number(await field.getAttribute("data-pull")) < .6);
    assert.ok(Number(await field.getAttribute("data-visible-visitors")) > 0, "the same absorbed orbit must actually re-emerge");
    assert.ok(returnDust.light > 3, "returning orbital grains must remain painted");
    await expect(field).toHaveAttribute("data-hole-growth", "1.000");
    await page.screenshot({ path: `test-results/${viewport.width}-black-hole-returning.png` });
    await retreatTo(.58);
    assert.equal(await field.getAttribute("data-gravity-age"), frozenAge, "scroll reversal must not advance into another visitor cycle");
    const retreatDust = JSON.parse(await field.getAttribute("data-dust-probes")).find(probe => probe.index === returnDust.point.index);
    assert.ok(retreatDust.travel < returnDust.point.travel, "scroll reversal must retrace the same grain's spiral toward its source");
    assert.ok((await paintedDust(page)).light > 3, "the reverse-moving stream must still paint pixels");
    const returnedProgress = Number(await field.getAttribute("data-visitor-progress"));
    await retreatTo(1);
    await expect(field).toHaveAttribute("data-gravity-cycle", cycle);
    await expect(field).toHaveAttribute("data-gravity-active", "true");
    assert.ok(Number(await field.getAttribute("data-visitor-progress")) > returnedProgress, "scrolling back down must reabsorb the same orbit");
    await retreatTo(.15);
    assert.ok(Number(await field.getAttribute("data-hole-growth")) < .4);
    await expect(field).toHaveAttribute("data-pull", "0.000");
    await expect(field).toHaveAttribute("data-distant-star-pull", "0.000");
    assert.ok(Number(await field.getAttribute("data-solar-scale")) > .7, "the original background system must recover its full scale");
    await page.screenshot({ path: `test-results/${viewport.width}-black-hole-receding.png` });
    await retreatTo(0);
    await expect(field).toHaveAttribute("data-hole-opacity", "0.000");
    await expect(field).toHaveAttribute("data-hole-growth", "0.000");
    await expect(field).toHaveAttribute("data-gravity-age", "0.00");
    await expect(field).toHaveAttribute("data-birth-age", "0.00");
    await expect(field).toHaveAttribute("data-feeding-dust", "false");
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    for (let i = 0; i < 3; i++) await page.clock.fastForward(250);
    await expect(field).toHaveAttribute("data-gravity-phase", "birth");
    assert.ok(Number(await field.getAttribute("data-hole-growth")) < .5, "a complete re-entry must grow from a small horizon, not restore the giant hole instantly");
    assert.deepEqual(errors, []);
    writeFileSync(`test-results/${viewport.width}-arrival-continuity.json`,JSON.stringify(arrivalFrames));
    await page.close();
    console.log(`birth, dust, recurrence and reversible closing passed at ${viewport.width}x${viewport.height}`);
  }
} finally { await browser.close(); }
