/* 扫描 assets/data/parts/*.js 与 assets/data/quizparts/*.js，重写 index.html 里
   <!-- PART_SCRIPTS --> 与 <!-- QUIZ_SCRIPTS --> 之后到 <script src="assets/data.js"> 之间的脚本列表 */
const fs = require("fs"), path = require("path");
const root = __dirname;
const site = path.join(root, "kaoyan333-site");
const dataDir = path.join(site, "assets", "data");

function list(sub) {
  const dir = path.join(dataDir, sub);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort()
    .map(f => '  <script src="assets/data/' + sub + "/" + f + '"></script>');
}

const parts = list("parts");
const quiz = list("quizparts");
const htmlPath = path.join(site, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");

function fill(marker, block) {
  const tag = "<!-- " + marker + " -->";
  const i = html.indexOf(tag);
  if (i < 0) { console.error("marker missing: " + marker); process.exit(1); }
  // 该标记块的范围：标记之后到下一个标记（或 data.js）之前
  const others = ["<!-- PART_SCRIPTS -->", "<!-- QUIZ_SCRIPTS -->"]
    .filter(m => m !== tag).map(m => html.indexOf(m, i + tag.length)).filter(x => x > 0);
  const stop = others.length ? Math.min.apply(null, others) : html.indexOf('<script src="assets/data.js"></script>');
  if (stop < 0) { console.error("end marker missing"); process.exit(1); }
  html = html.slice(0, i + tag.length) + "\n" + block.join("\n") + "\n  " + html.slice(stop);
}

fill("QUIZ_SCRIPTS", quiz);
/* 题目出处索引：始终挂在 PART_SCRIPTS 末尾（每次重生成都不会丢） */
if (parts.length) parts.push('  <script src="assets/data/qsrc.js"></script>');
fill("PART_SCRIPTS", parts);
fs.writeFileSync(htmlPath, html, "utf8");
console.log("parts=" + parts.length + " quiz=" + quiz.length);