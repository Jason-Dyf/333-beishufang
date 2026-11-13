// 平板离线版打包：单个自包含 HTML
// 与 _single.js 的区别：7 MB 的原文库不再当 JS 解析，改为 <script type="application/json"> 惰性解析，
// 启动时只解析 ~3.5 MB 的核心数据；首次用到某本书时才 JSON.parse。
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = "C:/Users/25602/Documents/deepseek-harness/default-workspace/kaoyan333-site";
const OUT = "C:/Users/25602/Documents/deepseek-harness/default-workspace/333背书房-平板版.html";
const OUT2 = "C:/Users/25602/Desktop/333背书房（平板版）.html";

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

// 1) 样式表内联
html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g, (m, href) => {
  try {
    return "<style>\n/* " + href + " */\n" + read(href) + "\n</style>";
  } catch (e) {
    console.log("miss css", href);
    return m;
  }
});

// 2) 页面脚本内联（保持原有顺序）
html = html.replace(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/g, (m, src) => {
  try {
    return "<script>\n/* " + src + " */\n" + read(src) + "\n</script>";
  } catch (e) {
    console.log("miss js", src);
    return m;
  }
});

// 3) 平板 meta
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '  <meta name="apple-mobile-web-app-capable" content="yes">\n' +
    '  <meta name="mobile-web-app-capable" content="yes">\n' +
    '  <meta name="apple-mobile-web-app-title" content="333背书房">\n' +
    '  <meta name="format-detection" content="telephone=no">'
);

// 4) 原文库：JSON 惰性解析（不参与启动解析）
const srcDir = path.join(ROOT, "assets/data/src");
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".js")).sort();
let blocks = "";
let bytes = 0;
for (const f of files) {
  const code = fs.readFileSync(path.join(srcDir, f), "utf8");
  const ctx = { window: {} };
  try {
    vm.runInNewContext(code, ctx);
  } catch (e) {
    console.log("skip src", f, e.message);
    continue;
  }
  const store = ctx.window.K3_SRC || {};
  for (const id of Object.keys(store)) {
    let json = JSON.stringify(store[id]);
    // 让 JSON 安全地待在 <script> 里：\/ 与 \u0021 都是合法 JSON 转义
    json = json.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\u0021--");
    blocks +=
      '<script type="application/json" id="src-json-' + id + '">' + json + "</script>\n";
    bytes += json.length;
  }
}
console.log("books", Object.keys(files).length, "json", (bytes / 1048576).toFixed(2) + " MB");

html = html.replace("</body>", blocks + "</body>");

fs.writeFileSync(OUT, html, "utf8");
try {
  fs.writeFileSync(OUT2, html, "utf8");
} catch (e) {
  console.log("desktop copy failed", e.message);
}
const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
console.log("wrote", OUT, mb + " MB");