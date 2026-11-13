/* 生成 考点 ↔ 题目 / 真题 关联表 plink.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = "kaoyan333-site/assets/data";
const win = {};
const ctx = vm.createContext({ window: win, console });
function run(f) { vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f }); }
run(path.join(root, "parts", "p-cn1.js")); // noop to ensure dir readable
const partsDir = path.join(root, "parts");
fs.readdirSync(partsDir).filter(f => /^p-.*\.js$/.test(f)).sort().forEach(f => run(path.join(partsDir, f)));
const quizDir = path.join(root, "quizparts");
fs.readdirSync(quizDir).filter(f => /\.js$/.test(f)).sort().forEach(f => {
  try { run(path.join(quizDir, f)); } catch (e) { console.log("skip", f, e.message); }
});
try { run(path.join(root, "zhenti-papers.js")); } catch (e) { console.log("zt fail", e.message); }
try { run(path.join(root, "mock-papers.js")); } catch (e) { console.log("mock fail", e.message); }

const CH = win.K3_CH || [];
const QS = [].concat.apply([], (win.K3_QRAW || []).map(x => Array.isArray(x) ? x : [x]));
const ZT = (win.K3_ZT_PAPERS || {}).papers || [];

function norm(s) { return String(s || "").replace(/\{\{|\}\}|<<|>>/g, "").replace(/[\s《》「」（）()，,。.、；;：:！!？?“”"'’‘]/g, ""); }
function core(t) {
  let s = norm(t);
  s = s.replace(/^(第[一二三四五六七八九十]+[章节])/, "");
  s = s.replace(/(的含义|的主要内容|的基本内容|的特点|的意义|的启示|的贡献|的主要观点|的教育思想|的教育实践|的教育理论)$/, "");
  return s;
}
function keysOf(t) {
  const c = core(t), out = [];
  if (c.length >= 4) out.push(c);
  const head = c.replace(/的.*$/, "");
  if (head.length >= 4 && head !== c) out.push(head);
  return out.slice(0, 2);
}

const qHay = QS.map(q => norm([q.q, (q.opts || []).join(""), q.exp || ""].join("\n")));
const qStem = QS.map(q => norm(q.q || ""));

const zList = [];
ZT.forEach(p => {
  (p.choice || []).forEach(it => zList.push({ y: p.year, tab: "c", no: it.no, real: /^20\d\d$/.test(String(p.year)), hay: norm([it.q, (it.opts || []).join(""), it.exp || ""].join(" ")), stem: norm(it.q || "") }));
  (p.essay || []).forEach(it => zList.push({ y: p.year, tab: "e", no: it.no, real: /^20\d\d$/.test(String(p.year)), hay: norm([it.q, it.ans].join(" ")), stem: norm(it.q || "") }));
  (p.material || []).forEach(it => zList.push({ y: p.year, tab: "m", no: it.no, real: /^20\d\d$/.test(String(p.year)), hay: norm([it.mat, it.q, (it.asks || []).map(a => a.t).join(" "), it.ans].join(" ")), stem: norm(it.mat || it.q || "") }));
});

zList.sort((a, b) => (b.real ? 1 : 0) - (a.real ? 1 : 0));

const out = {};
let withQ = 0, withZ = 0;
CH.forEach(group => {
  const subj = group.subj, ch = group.chapter;
  (ch.points || []).forEach((p, i) => {
    const ks = keysOf(p.t);
    if (!ks.length) return;
    const qh = [], zh = [];
    for (let qi = 0; qi < QS.length && qh.length < 10; qi++) {
      const strong = ks.some(k => qStem[qi].indexOf(k) > -1);
      const weak = !strong && ks.some(k => qHay[qi].indexOf(k) > -1);
      if (strong) qh.push(qi); else if (weak && qh.length < 6) qh.push(qi);
    }
    let nReal = 0, nMock = 0;
    for (let zi = 0; zi < zList.length && zh.length < 8; zi++) {
      if (!ks.some(k => zList[zi].hay.indexOf(k) > -1)) continue;
      if (zList[zi].real) { if (nReal >= 5) continue; nReal++; } else { if (nMock >= 3) continue; nMock++; }
      zh.push(zi);
    }
    if (!qh.length && !zh.length) return;
    const rec = {};
    if (qh.length) { rec.q = qh.slice(0, 8).map(i => QS[i].id); withQ++; }
    if (zh.length) { rec.z = zh.slice(0, 5).map(i => [zList[i].y, zList[i].tab, zList[i].no]); withZ++; }
    out[subj + "|" + ch.id + "|" + i] = rec;
  });
});

const js = "/* 考点 ↔ 题目 / 真题 关联（由 _plink.js 生成） */\nwindow.K3_PLINK = " + JSON.stringify(out) + ";\n";
fs.writeFileSync(path.join(root, "plink.js"), js, "utf8");
console.log("chapters", CH.length, "points", CH.reduce((a, c) => a + (c.chapter.points || []).length, 0),
  "linked", Object.keys(out).length, "withQ", withQ, "withZ", withZ, "size", (js.length / 1024).toFixed(0) + "KB");
