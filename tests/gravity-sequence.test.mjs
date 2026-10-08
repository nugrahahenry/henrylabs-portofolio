import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../components/gravity-sequence.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { gravitySequence, gravityBirth, gravityVisitors, gravityVisitorEntry, gravityApproachAngle, advanceGravityAge, updateClosingScroll, closingReturn, GRAVITY_INTAKE_SECONDS, GRAVITY_REST_SECONDS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("arrivals originate in distant upper-middle space, not beside the cropped horizon", () => {
  for (let index = 0; index < 5; index++) {
    const entry = gravityVisitorEntry(index);
    const x = (entry.x + 1) / 2, y = (1 - entry.y) / 2;
    assert.ok(x >= .3 && x <= .6 && y >= .15 && y <= .3);
    assert.ok(Math.hypot(x - 1.01, y - .9) > .75);
    assert.ok(entry.z < -4.8, "the incoming system starts behind the horizon's camera plane");
  }
});

test("closing return restores objects before shrinking and fading the horizon", () => {
  assert.deepEqual(closingReturn(1), { infall: 1, growth: 1, opacity: 1 });
  const middle = closingReturn(.7);
  assert.ok(middle.infall > 0 && middle.infall < 1);
  assert.equal(middle.growth, 1);
  const restored = closingReturn(.4);
  assert.equal(restored.infall, 0);
  assert.ok(restored.growth > .9 && restored.opacity === 1);
  assert.ok(closingReturn(.15).growth < .4);
  assert.deepEqual(closingReturn(0), { infall: 0, growth: 0, opacity: 0 });
  assert.deepEqual(closingReturn(NaN), closingReturn(0));
  const pose = { infall: 0, growth: 0, opacity: 0 };
  assert.equal(closingReturn(.5, pose), pose);
});

test("partial scroll reversal preserves encounter progress and can rejoin without teleporting", () => {
  const state = { peak: 0, presence: 0, returning: false };
  assert.equal(updateClosingScroll(state, .6, .016, true), state);
  assert.equal(state.presence, 1);
  updateClosingScroll(state, 1, .016, true);
  updateClosingScroll(state, .999, .016, true);
  assert.equal(state.presence, 1, "subpixel scroll jitter must not pause an active encounter");
  assert.equal(state.returning, false);
  const first = updateClosingScroll(state, .6, .016, true).presence;
  assert.ok(first < 1 && first > .9);
  assert.equal(state.peak, 1);
  assert.equal(state.returning, true);
  for (let i = 0; i < 100; i++) updateClosingScroll(state, .6, .016, true);
  assert.equal(state.presence, .6);
  updateClosingScroll(state, .8, .016, true);
  assert.ok(state.presence > .6 && state.presence < .7);
  assert.equal(state.peak, 1);
  for (let i = 0; i < 100; i++) updateClosingScroll(state, 1, .016, true);
  assert.deepEqual(state, { peak: 1, presence: 1, returning: false });
});

test("only a complete closing exit clears the encounter and still mode never runs a return clock", () => {
  const state = { peak: 1, presence: 1, returning: false };
  updateClosingScroll(state, 0, 240, true);
  assert.ok(state.presence > .7, "a hidden interval must not erase the return choreography");
  assert.equal(state.peak, 1);
  const held = state.presence;
  updateClosingScroll(state, 0, NaN, true);
  assert.equal(state.presence, held);
  for (let i = 0; i < 100; i++) updateClosingScroll(state, 0, .016, true);
  assert.deepEqual(state, { peak: 0, presence: 0, returning: false });
  updateClosingScroll(state, .3, .016, true);
  assert.deepEqual(state, { peak: .3, presence: 1, returning: false });
  updateClosingScroll(state, .15, .016, false);
  assert.equal(state.presence, .5);
  updateClosingScroll(state, 0, .016, false);
  assert.deepEqual(state, { peak: 0, presence: 0, returning: false });
});

test("gravity has a slow intake and thirty quiet seconds between visitors", () => {
  assert.equal(GRAVITY_INTAKE_SECONDS, 32);
  assert.equal(GRAVITY_REST_SECONDS, 30);
  assert.equal(gravitySequence(0).progress, 0);
  assert.equal(gravitySequence(16).progress, .5);
  assert.ok(gravitySequence(2).progress < .02);
  assert.equal(gravitySequence(32).phase, "rest");
  assert.equal(gravitySequence(32).visitorVisible, false);
  assert.equal(gravitySequence(32 + 29.9).index, 0);
  assert.equal(gravitySequence(32 + 29.9).visitorVisible, false);
  const next = gravitySequence(32 + 30);
  assert.equal(next.index, 1);
  assert.equal(next.progress, 0);
  assert.equal(next.visitorVisible, true);
  assert.equal(next.fieldPull, 1, "the whole starfield must not pop back for a new visitor");
  assert.equal(gravitySequence((32 + 30) * 2).index, 2);
});

test("the horizon grows before gravity can start", () => {
  assert.deepEqual(gravityBirth(0), { growth: 0, ready: false });
  assert.deepEqual(gravityBirth(2), { growth: .5, ready: false });
  assert.equal(gravityBirth(3.99).ready, false);
  assert.deepEqual(gravityBirth(4), { growth: 1, ready: true });
  assert.deepEqual(gravityBirth(30), { growth: 1, ready: true });
  assert.deepEqual(gravityBirth(NaN), gravityBirth(0));
  assert.deepEqual(gravityBirth(-2), gravityBirth(0));
});

test("closing clock pauses outside contact, during reduced motion and hidden intervals", () => {
  assert.equal(advanceGravityAge(12, .1, false), 12);
  assert.equal(advanceGravityAge(12, .1, true), 12.1);
  assert.equal(advanceGravityAge(12, 240, true), 12.25);
  assert.equal(advanceGravityAge(12, -1, true), 12);
  assert.equal(advanceGravityAge(12, NaN, true), 12);
  assert.equal(gravitySequence(Infinity).progress, 0);
});

test("closing arrivals reuse three or five planets and alternate left and top", () => {
  assert.deepEqual(gravityVisitors(0), { count: 3, direction: "left" });
  assert.deepEqual(gravityVisitors(1), { count: 5, direction: "top" });
  for (let i = 0; i < 100; i++) assert.ok([3, 5].includes(gravityVisitors(i).count));
  assert.deepEqual(gravityVisitors(NaN), gravityVisitors(0));
  assert.deepEqual(gravityVisitors(-1), gravityVisitors(0));
});

test("both entry paths remain on the visible upper-left side of the horizon", () => {
  for (const angle of [1.65, 2.0, 2.7, 3.0]) {
    assert.equal(gravityApproachAngle(angle, 0), angle);
    assert.ok(Math.abs(gravityApproachAngle(angle, 1) - Math.PI * .58) < 1e-12);
    for (let i = 0; i <= 100; i++) {
      const approach = gravityApproachAngle(angle, i / 100);
      assert.ok(Math.cos(approach) < 0 && Math.sin(approach) > 0);
    }
  }
});
