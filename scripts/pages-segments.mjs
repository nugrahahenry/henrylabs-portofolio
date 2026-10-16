import assert from "node:assert/strict";
import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export function segmentAlias(file) {
  const parts = file.split("/");
  if (parts.some(part => !part || part === "." || part === ".." || part.includes("\\"))) return null;
  const start = parts.findIndex(part => part.startsWith("__next."));
  if (start < 0 || start === parts.length - 1 || !file.endsWith(".txt")) return null;
  return [...parts.slice(0, start), parts.slice(start).join(".")].join("/");
}

export function normalizePagesSegments(output) {
  const root = path.resolve(output);
  const aliases = [];
  function walk(prefix = "") {
    for (const entry of readdirSync(path.join(root, prefix), { withFileTypes: true })) {
      assert.ok(!entry.isSymbolicLink(), "Segment normalization refuses symlinks");
      const file = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(`${file}/`);
      else {
        const alias = segmentAlias(file);
        if (alias) aliases.push([file, alias]);
      }
    }
  }
  walk();
  // Next 16.3.6 uses OS separators when exporting segments on Windows, but its
  // browser router requests dot-separated names. Linux output is already flat.
  for (const [file, alias] of aliases) {
    const source = path.join(root, file), target = path.join(root, alias);
    assert.ok(target.startsWith(`${root}${path.sep}`), "Segment alias must remain inside out");
    if (existsSync(target)) assert.ok(readFileSync(source).equals(readFileSync(target)), `Segment alias conflict: ${alias}`);
    else copyFileSync(source, target);
  }
  if (aliases.length) console.log(`Verified ${aliases.length} Windows static-navigation aliases.`);
  return aliases.length;
}
