import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const sizes = process.argv.includes("--landscape") ? [[844, 390]] : process.argv.includes("--confirm") ? [[1440, 900], [390, 844]] : [[1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 800], [844, 390]];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const report = [];
mkdirSync("test-results/volley", { recursive: true });
try {
  for (const [width, height] of sizes) {
    const repeat = process.argv.includes("--repeat") && width === 1440;
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (/Shader Error|THREE.WebGLProgram/.test(message.text())) errors.push(message.text()); });
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
    await page.evaluate(repeat => {
      const host = document.querySelector(".worldline-backdrop");
      window.__volley = { frames: [], calls: 0, pairPixels: 0 };
      const record = () => {
        const d = host.dataset, shots = JSON.parse(d.pursuitShots ?? "[]").filter(shot => shot.active && shot.pulse > .08 && shot.pulse < .93);
        const qa = window.__volley;
        qa.calls = Math.max(qa.calls, Number(d.drawCalls));
        if (shots.length && qa.frames.length < 3000) qa.frames.push({ age: Number(d.flightTime), cycle: Number(d.flightCycle), ufo: JSON.parse(d.ufoShotHull), shots,
          noteBottom: document.querySelector(".hero-note").getBoundingClientRect().bottom,
          craft: ["ufo", "scout"].map(kind => ({ y: +d[`${kind}Y`], radius: +d[`${kind}Radius`] })),
        });
        if (shots.length === 2 && qa.pairPixels < 40) {
          const canvas = host.querySelector("canvas"), gl = canvas.getContext("webgl2");
          const scaleX = gl.drawingBufferWidth / canvas.clientWidth, scaleY = gl.drawingBufferHeight / canvas.clientHeight;
          for (const shot of shots) {
            const x = Math.round(shot.x * scaleX), y = Math.round((canvas.clientHeight - shot.y) * scaleY);
            if (x < 9 || y < 9 || x > canvas.width - 9 || y > canvas.height - 9) continue;
            const pixels = new Uint8Array(16 * 16 * 4);
            gl.readPixels(x - 8, y - 8, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            let total = 0, max = 0;
            for (let i = 0; i < pixels.length; i += 4) { const light = pixels[i] + pixels[i + 1] + pixels[i + 2]; total += light; max = Math.max(max, light); }
            qa.pairPixels = Math.max(qa.pairPixels, max - total / 256);
          }
        }
        if (Number(d.flightCycle) < (repeat ? 1 : 0) || Number(d.flightTime) < 19) requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    }, repeat);
    let captured = false;
    const deadline = Date.now() + (repeat ? 100000 : 35000);
    while (Date.now() < deadline) {
      const state = await page.locator(".worldline-backdrop").evaluate(h => ({ age: +h.dataset.flightTime, cycle: +h.dataset.flightCycle, shots: JSON.parse(h.dataset.pursuitShots) }));
      if (!captured && state.shots.filter(shot => shot.active && shot.pulse > .2 && shot.pulse < .7).length === 2) {
        await page.screenshot({ path: `test-results/volley/${width}-paired-shot.png` }); captured = true;
      }
      if (state.cycle >= (repeat ? 1 : 0) && state.age > 18.5) break;
      await page.waitForTimeout(45);
    }
    const result = await page.evaluate(() => window.__volley);
    const ids = new Set(result.frames.flatMap(frame => frame.shots.map(shot => shot.id)));
    const pairs = [0, 1, 2, 3].filter(pair => ids.has(pair * 2) && ids.has(pair * 2 + 1));
    report.push({ width, height, pairs, ids: [...ids], final: await page.locator(".worldline-backdrop").evaluate(h => JSON.parse(h.dataset.pursuitShots)), ...result });
    await page.screenshot({ path: `test-results/volley/${width}-portal-approach.png` });
    assert.ok(pairs.length >= 3, `three or four paired salvos must be visible at ${width}px, got ${pairs}`);
    if (repeat) {
      const second = new Set(result.frames.filter(frame => frame.cycle === 1).flatMap(frame => frame.shots.map(shot => shot.id)));
      assert.equal(second.size, 8, "all four pairs return after the quiet interval without reloading");
    }
    assert.ok(result.frames.some(frame => frame.age > 14.6 && frame.shots.length === 2), "last pair reaches the portal approach");
    const sides = new Set(result.frames.flatMap(frame => frame.shots.map(shot => shot.side)));
    assert.deepEqual([...sides].sort(), [-1, 1], "visible salvos use both sides of the UFO");
    assert.ok(result.pairPixels > 35, "paired missiles paint bright, bounded pixels");
    assert.ok(result.calls < 65);
    const starts = new Map();
    const gaps = new Map();
    if (height < 620) for (const frame of result.frames) for (const craft of frame.craft) assert.ok(craft.y - craft.radius >= frame.noteBottom + 3, "landscape flights remain below the availability note");
    for (const frame of result.frames) for (const shot of frame.shots) {
      const key = `${shot.cycle}:${shot.id}`;
      if (!starts.has(key)) starts.set(key, [shot.sx, shot.sy, shot.ex, shot.ey]);
      assert.deepEqual([shot.sx, shot.sy, shot.ex, shot.ey], starts.get(key), "aim stays locked after launch");
      const dx = shot.ex - shot.sx, dy = shot.ey - shot.sy;
      const deviation = Math.abs((shot.x - shot.sx) * dy - (shot.y - shot.sy) * dx) / Math.hypot(dx, dy);
      assert.ok(deviation < .1, "projectiles travel straight, not a moving homing curve");
      assert.ok(shot.angle <= .44);
      const clearance = Math.hypot((shot.x - frame.ufo.x) / frame.ufo.rx, (shot.y - frame.ufo.y) / frame.ufo.ry);
      assert.ok(clearance >= 1, "missiles never overlap the UFO silhouette");
      gaps.set(key, Math.min(gaps.get(key) ?? Infinity, (clearance - 1) * Math.min(frame.ufo.rx, frame.ufo.ry)));
    }
    assert.ok([...gaps.values()].filter(gap => gap <= 8).length >= 6, "at least three pairs narrowly miss rather than veering far away");
    assert.deepEqual(errors, []);
    await page.getByRole("button", { name: "Animation", exact: true }).click();
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-pursuit-bolts", "0");
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-companion-time", "0.000");
    console.log(`PASS ${width}x${height}: ${pairs.length} paired salvos, locked straight paths, pixels and clearance`);
    await page.close();
  }
} finally {
  writeFileSync("test-results/volley/report.json", JSON.stringify(report));
  await browser.close();
}
