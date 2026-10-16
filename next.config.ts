import type { NextConfig } from "next";
import { isIP } from "node:net";

const exportToPages = process.env.PORTFOLIO_STATIC_EXPORT === "1";

if (exportToPages) {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  let valid = false;
  try {
    const url = new URL(value ?? "");
    const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
    valid = url.protocol === "https:" && !url.username && !url.password &&
      !url.port && url.pathname === "/" && !url.search && !url.hash &&
      host.includes(".") && !isIP(host) &&
      !/(^|\.)(localhost|local|internal|lan)$/.test(host);
  } catch { /* A missing or malformed origin must not become public metadata. */ }
  if (!valid) throw new Error("Pages export requires NEXT_PUBLIC_SITE_URL to be a public HTTPS origin, without a path, query, credentials or port.");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  output: exportToPages ? "export" : undefined,
};

export default nextConfig;
