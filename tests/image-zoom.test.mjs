import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync("components/image-zoom.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { imageLayout, imageAnchor, imageScroll, certificateZoomSteps } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const close = (a, b) => assert.ok(Math.abs(a - b) < .001, `${a} != ${b}`);

test("certificates fit without cropping at every viewport and zoom with their original proportions", () => {
  assert.deepEqual(certificateZoomSteps, [1, 1.5, 2, 3]);
  for (const [width, height] of [[1600, 1100], [1100, 1600], [1200, 1200], [2000, 650]]) {
    for (const [vw, vh] of [[288, 400], [358, 480], [720, 760], [810, 190], [1160, 620]]) {
      const fit = imageLayout(width, height, vw, vh, 1);
      assert.ok(fit.width <= vw - 16 + .001 && fit.height <= vh - 16 + .001);
      close(fit.sheetWidth, vw); close(fit.sheetHeight, vh);
      for (const zoom of certificateZoomSteps) {
        const next = imageLayout(width, height, vw, vh, zoom);
        close(next.width / next.height, width / height);
        close(next.width, fit.width * zoom);
        assert.ok(next.x >= 8 - .001 && next.y >= 8 - .001);
      }
    }
  }
});

test("zoom retains the point being read instead of jumping to the top-left", () => {
  const before = imageLayout(1600, 1100, 360, 480, 2);
  const anchor = imageAnchor(before, 100, 5);
  const next = imageLayout(1600, 1100, 360, 480, 3);
  const scroll = imageScroll(next, anchor);
  const after = imageAnchor(next, scroll.left, scroll.top);
  close(after.u, anchor.u); close(after.v, anchor.v);
  assert.ok(scroll.left > 100);
});

test("double-click anchors to the image point and fit clamps both scroll axes to zero", () => {
  const before = imageLayout(1600, 1100, 360, 480, 1);
  const anchor = imageAnchor(before, 0, 0, 250, 280);
  const next = imageLayout(1600, 1100, 360, 480, 3);
  const scroll = imageScroll(next, anchor);
  const after = imageAnchor(next, scroll.left, scroll.top, 250, 280);
  close(after.u, anchor.u); close(after.v, anchor.v);
  assert.deepEqual(imageScroll(before, after), { left: 0, top: 0 });
});

test("orientation changes preserve the reading center and edge anchors stay in bounds", () => {
  const old = imageLayout(1100, 1600, 360, 480, 3);
  const anchor = imageAnchor(old, 200, 400);
  const next = imageLayout(1100, 1600, 800, 220, 3);
  for (const value of [anchor, { u: 0, v: 0 }, { u: 1, v: 1 }]) {
    const scroll = imageScroll(next, { ...value, x: 400, y: 110 });
    assert.ok(scroll.left >= 0 && scroll.left <= next.sheetWidth - 800);
    assert.ok(scroll.top >= 0 && scroll.top <= next.sheetHeight - 220);
  }
});

test("certificate toolbar stays outside the pannable image, and gallery selection resets zoom", () => {
  const source = readFileSync("components/credential-viewer.tsx", "utf8");
  assert.match(source, /CertificateDocument key=\{record.id\}/);
  assert.ok(source.indexOf('className="credential-zoom-tools"') < source.indexOf("ref={imageArea}"));
  assert.match(source, /image\?\.complete/);
  assert.match(source, /decoding="async"/);
  assert.match(readFileSync("components/use-image-pan.ts", "utf8"), /event.pointerType === "touch"/);
  assert.match(readFileSync("app\/library.css", "utf8"), /\.credential-dialog-image \{[^}]*touch-action: manipulation/);
});
