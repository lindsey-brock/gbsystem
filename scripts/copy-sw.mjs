// Nitro's static output directory depends on the detected deploy target
// (e.g. .vercel/output/static on Vercel CI, .output/public locally/cloudflare).
// Copy the generated service worker into whichever one exists.
import { copyFileSync, existsSync } from "node:fs";

const src = "dist/sw.js";
const candidates = [".vercel/output/static/sw.js", ".output/public/sw.js"];

let copied = false;
for (const dest of candidates) {
  const destDir = dest.slice(0, dest.lastIndexOf("/"));
  if (existsSync(destDir)) {
    copyFileSync(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
    copied = true;
  }
}

if (!copied) {
  console.warn(`Warning: no known Nitro output directory found among [${candidates.join(", ")}]; sw.js was not copied.`);
}
