import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { checkPages } from "./check-pages.mjs";
import { normalizePagesSegments } from "./pages-segments.mjs";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  cwd: root,
  env: { ...process.env, PORTFOLIO_STATIC_EXPORT: "1" },
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
normalizePagesSegments(fileURLToPath(new URL("../out/", import.meta.url)));
checkPages(root);
