// Regenerates www/icons/*.png from tools/make-icons.html.
// Usage: serve the repo root on :8123, then `node tools/make-icons.cjs`.
// Needs Playwright (npm i -g playwright) — a dev tool only, never shipped.
const fs = require("fs");
const path = require("path");
let pw;
try { pw = require("playwright"); } catch { pw = require("/opt/node22/lib/node_modules/playwright"); }
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage();
  await p.goto(process.env.ICON_URL || "http://localhost:8123/tools/make-icons.html");
  await p.waitForFunction(() => window.ready);
  for (const size of [180, 192, 512]) {
    const data = await p.evaluate((s) => window.icon(s), size);
    const out = path.join(__dirname, "..", "www", "icons", `icon-${size}.png`);
    fs.writeFileSync(out, Buffer.from(data.split(",")[1], "base64"));
    console.log("wrote", out);
  }
  await b.close();
})();
