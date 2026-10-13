import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../components/gravity-sequence.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { gravitySequence, gravityBirth, gravityVisitors, gravityVisitorEntry, gravityVisitorPose, gravityVisitorMember, gravityBackgroundPose, gravityReadingVisibility, gravityApproachAngle, advanceGravityAge, updateClosingScroll, closingReturn, GRAVITY_INTAKE_SECONDS, GRAVITY_REST_SECONDS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("persistent planets spiral from their retained position without a distant respawn", () => {
  const origin = { x: 3.05, y: 1.9, z: -3.2 }, target = { x: 5.1, y: -3.3, z: -4.8 };
  const pose = { x: 0, y: 0, z: 0, scale: 0, turn: 0 };
  const frames = [];
  let previousRadius = Infinity;
  for (let step = 0; step <= 100; step++) {
    assert.equal(gravityBackgroundPose(step / 100, origin, target, pose), pose);
    const radius = Math.hypot(pose.x - target.x, pose.y - target.y);
    assert.ok(radius <= previousRadius + 1e-12);
    assert.ok(pose.z >= -4.8 && pose.z <= -3.2, "the original system never takes the visitor's deep-space entrance");
    if (step <= 18) assert.equal(pose.scale, 1, "do not shrink while still far from the horizon");
    if (step) assert.ok(Math.hypot(pose.x - frames[step-1].x, pose.y - frames[step-1].y) < .1);
    frames.push({ ...pose }); previousRadius = radius;
  }
  assert.ok(Math.abs(frames[0].x-origin.x)<1e-12 && Math.abs(frames[0].y-origin.y)<1e-12);
  assert.equal(frames[50].turn, .45);
  assert.ok(frames[50].x < (origin.x + target.x) / 2 - .6, "the capture must bow left instead of following a straight chord");
  assert.ok(frames[50].scale > .65);
  assert.equal(frames[100].x, target.x);
  assert.equal(frames[100].y, target.y);
  for (let step = 100; step >= 0; step--) assert.deepEqual(gravityBackgroundPose(step / 100, origin, target, pose), frames[step]);
  assert.deepEqual(gravityBackgroundPose(NaN, origin, target, pose), frames[0]);
  assert.deepEqual(gravityBackgroundPose(2, origin, target, pose), frames[100]);
});

test("arrivals originate in distant upper-middle space, not beside the cropped horizon", () => {
  for (let index = 0; index < 5; index++) {
    const entry = gravityVisitorEntry(index);
    const x = (entry.x + 1) / 2, y = (1 - entry.y) / 2;
    assert.ok(x >= .3 && x <= .6 && y >= .05 && y <= .12);
    assert.ok(Math.hypot(x - .82, y - .86) > .75);
    assert.ok(entry.z <= -280 && entry.z >= -312, "arrival starts at a genuinely distant depth inside the extended frustum");
  }
});

test("visitors approach through true depth before the curved intake, then retrace the same path", () => {
  for (const aspect of [1.6, .462, 2.16]) for (let cycle = 0; cycle < 5; cycle++) {
    const hx = aspect < 1 ? .82 : .86, hy = .86;
    const start = gravityVisitorPose(0, cycle, aspect, hx, hy);
    assert.ok(start.z <= -78);
    const near = gravityVisitorPose(.3, cycle, aspect, hx, hy);
    assert.ok(near.z > -9 && near.capture < .05);
    // Fixed physical bodies grow in projection, not through an artificial size pop.
    assert.ok((6.4 - start.z) / (6.4 - near.z) > 2.3);
    assert.equal(near.scale, 1);
    let depth = -Infinity;
    const frames = [];
    for (let step = 0; step <= 100; step++) {
      const pose = gravityVisitorPose(step / 100, cycle, aspect, hx, hy);
      assert.ok(pose.z >= depth && pose.z <= -4.8 + 1e-10);
      assert.ok(pose.scale >= .35 && pose.scale <= 1);
      if (step) assert.ok(Math.hypot(pose.x - frames[step-1].x, pose.y - frames[step-1].y) < .08);
      frames.push(pose); depth = pose.z;
    }
    for (let step = 100; step >= 0; step--) assert.deepEqual(gravityVisitorPose(step / 100, cycle, aspect, hx, hy), frames[step]);
    assert.ok(Math.abs(frames[100].x - (hx * 2 - 1)) < 1e-12);
    assert.ok(Math.abs(frames[100].y - (1 - hy * 2)) < 1e-12);
  }
});

test("planet birth resolves while still tiny, then solid bodies approach through depth", () => {
  for(let cycle=0;cycle<5;cycle++) for(let member=0;member<5;member++) {
    let prior = { opacity:0, projection:0 };
    for(let frame=0;frame<=600;frame++) {
      const p=gravitySequence(frame/60).progress;
      const pose=gravityVisitorPose(p,cycle,1.6,.86,.86);
      const opacity=gravityVisitorMember(p,member).opacity;
      const projection=1/(6.4-pose.z);
      assert.ok(opacity >= prior.opacity && opacity-prior.opacity < .035);
      assert.ok(projection >= prior.projection);
      if(frame<=60) assert.ok(pose.z < -279);
      if(frame===180) {assert.equal(opacity,1);assert.ok(pose.z < -260);}
      prior={opacity,projection};
    }
    assert.ok(prior.opacity>.99);
  }
});

test("reading protection dims visitors without switching them off and back on", () => {
  const rects=[{left:100,top:200,right:300,bottom:350}];
  let previous=1;
  for(let y=80;y<=480;y++) {
    const visibility=gravityReadingVisibility(180,y,10,390,844,rects,.14);
    assert.ok(visibility>=.14 && visibility<=1);
    assert.ok(Math.abs(visibility-previous)<.02);
    if(y>=190&&y<=360) assert.equal(visibility,.14);
    previous=visibility;
  }
  assert.equal(gravityReadingVisibility(5,80,10,390,844,rects,.14),0,"offscreen bodies still fade before crossing the frame");
});

test("portrait arrivals retain an upper reading lane before the final descent", () => {
  for (let cycle = 0; cycle < 5; cycle++) {
    const portrait = gravityVisitorPose(.5, cycle, 390 / 844, .82, .86);
    assert.equal(portrait.capture, 0);
    assert.ok(portrait.y >= .78 && portrait.x < .6);
    assert.ok(gravityVisitorPose(.5, cycle, 1.6, .86, .86).capture > .2);
  }
});

test("five cached members have different depth, size, phase and absorption timing", () => {
  const members = Array.from({length:5},(_,i)=>gravityVisitorMember(.85,i));
  for (const key of ["depth", "scale", "phase", "opacity"]) assert.equal(new Set(members.map(m=>m[key])).size,5);
  for (let i=0;i<5;i++) {
    assert.equal(gravityVisitorMember(0,i).opacity,0);
    assert.equal(gravityVisitorMember(.1,i).opacity,1);
    assert.equal(gravityVisitorMember(1,i).opacity,0);
  }
});

test("arrival reading protection covers the whole body and feathers before touching text or frame", () => {
  const rects = [{left:100,top:200,right:300,bottom:350}];
  assert.equal(gravityReadingVisibility(95,250,10,390,844,rects),0);
  assert.equal(gravityReadingVisibility(150,220,10,390,844,rects),0);
  assert.equal(gravityReadingVisibility(150,80,10,390,844,rects),1);
  assert.equal(gravityReadingVisibility(5,80,10,390,844,rects),0);
  const feather = gravityReadingVisibility(70,250,10,390,844,rects);
  assert.ok(feather>0 && feather<1);
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
