import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const send = require("next/dist/compiled/send");

// A local static-file host, not Next's request handler or a Cloudflare emulator.
export async function startPagesPreview() {
  const root = path.resolve("out");
  const headers = new Map();
  let rule;
  for (const line of readFileSync(path.join(root, "_headers"), "utf8").split(/\r?\n/)) {
    if (line.startsWith("/")) headers.set(rule = line.trim(), []);
    else if (rule && line.trim()) {
      const colon = line.indexOf(":");
      headers.get(rule).push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
    }
  }
  const isFile = name => {
    const file = path.resolve(root, `.${name}`);
    return file.startsWith(`${root}${path.sep}`) && existsSync(file) && statSync(file).isFile();
  };
  const server = createServer((request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405).end(); return; }
    let url, route;
    try {
      url = new URL(request.url, "http://127.0.0.1");
      route = decodeURIComponent(url.pathname);
      if (route.includes("\\") || route.includes("\0") || route.split("/").some(part => part.startsWith("."))) throw new Error("Invalid path");
    } catch { response.writeHead(400).end(); return; }
    if (route.endsWith(".html") && isFile(route) && route !== "/404.html") {
      response.writeHead(308, { Location: `${route.replace(/(?:\/index)?\.html$/, "") || "/"}${url.search}` }).end();
      return;
    }
    const file = route === "/" ? "/index.html" :
      !["/_headers", "/_redirects"].includes(route) && isFile(route) ? route :
      isFile(`${route}.html`) ? `${route}.html` :
      route.endsWith("/") && isFile(`${route}index.html`) ? `${route}index.html` : "/404.html";
    if (file === "/404.html") response.statusCode = 404;
    for (const [key, value] of headers.get(route) ?? []) response.setHeader(key, value);
    send(request, file, { root, dotfiles: "deny", index: false })
      .on("error", error => { if (!response.headersSent) response.writeHead(error.statusCode ?? 500); response.end(); })
      .pipe(response);
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
