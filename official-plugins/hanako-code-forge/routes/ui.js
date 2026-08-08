import fs from "node:fs/promises";
import path from "node:path";

export default function registerPluginUiRoutes(app, ctx) {
  app.get("/page", async (c) => c.html(await renderShell(c, ctx, "page")));
  app.get("/widget", async (c) => c.html(await renderShell(c, ctx, "widget")));
}

async function renderShell(c, ctx, surface) {
  const theme = c.req.query("hana-theme") || "inherit";
  const assetsDir = path.join(ctx.pluginDir, "assets");
  const [css, js] = await Promise.all([
    fs.readFile(path.join(assetsDir, "panel.css"), "utf8"),
    fs.readFile(path.join(assetsDir, "panel.js"), "utf8"),
  ]);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Hanako Code Forge</title>
  <style>${escapeInlineStyle(css)}</style>
</head>
<body data-hana-theme="${escapeAttr(theme)}" data-surface="${escapeAttr(surface)}">
  <div id="root" data-surface="${escapeAttr(surface)}"></div>
  <script>${escapeInlineScript(js)}</script>
</body>
</html>`;
}

function escapeInlineStyle(value) {
  return String(value).replace(/<\/style/gi, "<\\/style");
}

function escapeInlineScript(value) {
  return String(value).replace(/<\/script/gi, "<\\/script");
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
