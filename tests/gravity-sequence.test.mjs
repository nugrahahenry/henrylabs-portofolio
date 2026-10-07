import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../components/gravity-sequence.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { gravitySequence, advanceGravityAge, GRAVITY_INTAKE_SECONDS, GRAVITY_REST_SECONDS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("gravity has a slow intake and at least three quiet minutes between visitors", () => {
  assert.equal(GRAVITY_INTAKE_SECONDS, 32);
  assert.ok(GRAVITY_REST_SECONDS >= 180);
  assert.equal(gravitySequence(0).progress, 0);
  assert.equal(gravitySequence(16).progress, .5);
  assert.ok(gravitySequence(2).progress < .02);
  assert.equal(gravitySequence(32).phase, "rest");
  assert.equal(gravitySequence(32).visitorVisible, false);
  assert.equal(gravitySequence(32 + 194.9).index, 0);
  assert.equal(gravitySequence(32 + 194.9).visitorVisible, false);
  const next = gravitySequence(32 + 195);
  assert.equal(next.index, 1);
  assert.equal(next.progress, 0);
  assert.equal(next.visitorVisible, true);
  assert.equal(next.fieldPull, 1, "the whole starfield must not pop back for a new visitor");
  assert.equal(gravitySequence((32 + 195) * 2).index, 2);
});

test("closing clock pauses outside contact, during reduced motion and hidden intervals", () => {
  assert.equal(advanceGravityAge(12, .1, false), 12);
  assert.equal(advanceGravityAge(12, .1, true), 12.1);
  assert.equal(advanceGravityAge(12, 240, true), 12.25);
  assert.equal(advanceGravityAge(12, -1, true), 12);
  assert.equal(advanceGravityAge(12, NaN, true), 12);
  assert.equal(gravitySequence(Infinity).progress, 0);
});
