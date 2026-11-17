/* 主观题 AI 批改室 · 速练大题 · AI 接口设置 */
(function () {
  "use strict";
  var A3 = window.A3, K = A3.K, esc = A3.esc, state = A3.state;
  var app = document.getElementById("app");
  var GQ = window.K3_GQ || { items: [] };
  var G = window.K3G || null;

  var S = {
    item: null, ans: "", res: null, ai: null, busy: "", msg: "",
    f: "all", q: "", show: 24, custom: false, cq: "", cmat: "", cfull: 15,
    ansOpen: false, drill: null, drillText: "", drillRes: null, hist: true,
    img: "", imgName: "", topic: "", genBusy: ""
  };
  try { S.f = localStorage.getItem("k3_gr_f") || "all"; } catch (e) {}

  var KIND = {
    essay: { name: "论述题", short: "论述" },
    material: { name: "材料分析", short: "材料" },
    q200: { name: "冬青 200 题", short: "200 题" }
  };

  function items() { return (GQ && GQ.items) || []; }
  function byId(id) { for (var i = 0; i < items().length; i++) if (items()[i].id === id) return items()[i]; return null; }

  function subjName(id) {
    var m = { ep: "教原", cn: "中教史", wj: "外教史", xl: "教心" };
    return m[id] || id || "";
  }
  function srcName(it) {
    if (!it.src) return "";
    if (it.kind === "q200") return "冬青 200 题 · 第 " + (it.src.no || "?") + " 题";
    return (it.src.ver || it.src.name || "") + " · " + (it.src.real === false ? "模拟" : it.src.year || "");
  }

  /* ---------- 记录 ---------- */
  function loadRecs() {
    try { return JSON.parse(localStorage.getItem("k3_grade_v1") || "[]"); } catch (e) { return []; }
  }
  function saveRec(r) {
    var a = loadRecs();
    a.unshift(r);
    a = a.slice(0, 60);
    try { localStorage.setItem("k3_grade_v1", JSON.stringify(a)); } catch (e) {}
  }

/* 答案不随题库下发，按 src 回原著取（省 ~1MB） */
  function refAns(it) {
    if (!it) return "";
    if (it.ans) return it.ans;
    if (it.kind === "q200") {
      var arr = (A3.K && A3.K.q200) || [];
      var sid = String(it.subj || "").replace(/^edu-/, "");
      for (var i = 0; i < arr.length; i++) {
        var x = arr[i];
        if (x && x.no === it.src.no && String(x.subjId || "") === sid) {
          var ps = x.pts || [];
          return Array.isArray(ps) ? ps.join("\n") : String(ps || "");
        }
      }
      return "";
    }
    var P = (window.K3_ZT_PAPERS && window.K3_ZT_PAPERS.papers) || [];
    var listName = it.kind === "essay" ? "essay" : "material";
    for (var j = 0; j < P.length; j++) {
      if (String(P[j].year) !== String(it.src && it.src.key)) continue;
      var list = P[j][listName] || [];
      for (var k = 0; k < list.length; k++) {
        if (list[k].no === it.src.no) return String(list[k].ans || "");
      }
    }
    return "";
  }

  /* ---------- 批改室 ---------- */
  function statsHtml() {
    var all = items();
    var recs = loadRecs();
    var avg = 0;
    if (recs.length) {
      var s = 0;
      recs.forEach(function (r) { var rv = +r.rate || 0; s += (rv > 1 ? rv / 100 : rv); });
      avg = Math.round((s / recs.length) * 100);
    }
    var h = '<div class="gr-stats">';
    h += '<div class="gr-stat"><b>' + all.length + '</b><span>可批改大题</span></div>';
    h += '<div class="gr-stat"><b>' + all.filter(function (i) { return i.kind === "essay"; }).length + '</b><span>论述题</span></div>';
    h += '<div class="gr-stat"><b>' + all.filter(function (i) { return i.kind === "material"; }).length + '</b><span>材料题</span></div>';
    h += '<div class="gr-stat"><b>' + (recs.length ? avg + "%" : "—") + '</b><span>' + (recs.length ? "最近批改均分率" : "还没批过") + '</span></div>';
    h += "</div>";
    return h;
  }

  function recHtml() {
    var recs = loadRecs().slice(0, 12);
    if (!recs.length) return "";
    var h = '<div class="section-title"><h3>最近批改</h3><button class="ghost-btn gr-recdel" id="grRecDel">清空</button></div><div class="mcard gr-recs">';
    recs.forEach(function (r) {
      h += '<button class="gr-rec" data-rec="' + esc(r.id) + '">';
      h += '<span class="gr-rec-s">' + r.score + '<i>/' + r.full + "</i></span>";
      h += '<span class="gr-rec-t">' + esc((KIND[r.kind] || {}).short || "") + " · " + esc(r.title || "") + "</span>";
      h += '<span class="gr-rec-d">' + esc(String(r.at || "").slice(5, 16)) + "</span>";
      h += "</button>";
    });
    h += "</div>";
    return h;
  }

  function filterList() {
    var q = S.q.trim().toLowerCase();
    return items().filter(function (it) {
      if (S.f !== "all" && it.kind !== S.f) return false;
      if (!q) return true;
      var hay = (it.q + " " + (it.asks || "") + " " + (it.ans || "")).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function pickerHtml() {
    var list = filterList();
    var h = "";
    h += '<div class="gr-chips">';
    [["all", "全部 " + items().length], ["essay", "论述 " + items().filter(function (i) { return i.kind === "essay"; }).length],
      ["material", "材料 " + items().filter(function (i) { return i.kind === "material"; }).length],
      ["q200", "200 题 " + items().filter(function (i) { return i.kind === "q200"; }).length]].forEach(function (c) {
      h += '<button class="chip ' + (S.f === c[0] ? "active" : "") + '" data-gf="' + c[0] + '">' + c[1] + "</button>";
    });
    h += "</div>";
    h += '<div class="gr-search"><input type="search" id="grQ" class="ks-input" placeholder="搜题目 / 关键词，如「大学区制」「陶行知」" value="' + esc(S.q) + '"><span id="grCnt" class="filter-count">' + list.length + " 题</span></div>";
    var show = list.slice(0, S.show);
    h += '<div class="gr-list">';
    show.forEach(function (it) {
      h += '<button class="gr-item" data-pick="' + esc(it.id) + '">';
      h += '<span class="gr-item-k">' + esc((KIND[it.kind] || {}).short || "") + "</span>";
      h += '<span class="gr-item-q">' + esc(it.q.replace(/\s+/g, " ").slice(0, 46)) + "</span>";
      h += '<span class="gr-item-m">' + esc(subjName(it.subj)) + " · " + it.full + " 分 · " + esc(it.type || "") + "</span>";
      h += "</button>";
    });
    if (!list.length) h += '<div class="empty">没找到题目，换个关键词。</div>';
    h += "</div>";
    if (list.length > show.length) {
      h += '<div class="gr-more"><button class="ghost-btn" id="grMore">再显示 ' + Math.min(24, list.length - show.length) + " 题</button></div>";
    }
    h += '<div class="gr-foot"><button class="ghost-btn" id="grCustom">✍ 自定义题目（自己录题）</button>';
    h += '<button class="ghost-btn" data-go="drill">⚡ 去速练大题</button></div>';
    return h;
  }

  function customHtml() {
    var h = '<div class="section-title"><h3>自定义题目</h3></div><div class="mcard gr-custom">';
    h += '<label class="gr-lab">题目 / 材料</label><textarea id="grCq" rows="4" placeholder="把题目或材料粘进来…">' + esc(S.cq) + "</textarea>";
    h += '<label class="gr-lab">材料（可选）</label><textarea id="grCmat" rows="3" placeholder="材料分析题把材料原文粘这里">' + esc(S.cmat) + "</textarea>";
    h += '<div class="gr-row"><label class="gr-lab">满分</label><input id="grCfull" type="number" min="5" max="40" value="' + (+S.cfull || 15) + '"></div>';
    h += '<div class="gr-tools"><button class="btn" id="grCustomGo">开始批改这道题</button><button class="ghost-btn" id="grCBack">返回题库</button></div>';
    h += '<div class="gr-msg">自定义题目没有采分点库：本地判分只看结构、篇幅与材料引用，想要内容分请配 AI Key 用「AI 精批」。</div>';
    h += "</div>";
    return h;
  }

  function qCardHtml(it) {
    var h = '<div class="mcard gr-q">';
    h += '<div class="gr-q-top"><span class="gr-badge">' + esc((KIND[it.kind] || {}).name || "题目") + "</span>";
    h += '<span class="gr-q-meta">' + esc(subjName(it.subj)) + " · " + it.full + " 分 · " + esc(it.type || "") + " · " + esc(srcName(it)) + "</span></div>";
    h += '<div class="gr-q-text">' + A3.md(it.q) + "</div>";
    if (it.mat) h += '<details class="gr-mat"><summary>看材料（' + String(it.mat).length + " 字）</summary><div class=\"gr-mat-body\">" + A3.md(it.mat) + "</div></details>";
    if (it.asks) h += '<div class="gr-ask">要求：' + esc(it.asks) + "</div>";
    h += "</div>";
    return h;
  }

  function partsHtml(res) {
    var h = '<div class="gr-parts">';
    (res.parts || []).forEach(function (p) {
      var pct = p.max ? Math.round((p.got / p.max) * 100) : 0;
      h += '<div class="gr-part"><span class="gr-part-k">' + esc(p.k) + "</span>" +
        '<span class="gr-part-bar"><i style="width:' + Math.max(2, Math.min(100, pct)) + '%"></i></span>' +
        '<span class="gr-part-v">' + (+p.got).toFixed(1) + "<i>/" + p.max + "</i></span></div>";
    });
    h += "</div>";
    return h;
  }

  function resultHtml(it, res) {
    var h = '<div class="mcard gr-res">';
    h += '<div class="gr-score"><b>' + (+res.score).toFixed(1) + "</b><i>/" + it.full + "</i>";
    h += '<span class="gr-rate">得分率 ' + Math.round((res.rate || 0) * 100) + "%</span>";
    h += '<span class="gr-mode">' + (res.mode === "ai" ? "AI 精批" : "本地采分点判分") + "</span></div>";
    h += partsHtml(res);
    if (res.quotes && res.quotes.length) {
      h += '<div class="gr-block gr-quotes"><h4>📌 用到的材料原句（' + res.quotes.length + ' 处）</h4><ul>';
      res.quotes.slice(0, 4).forEach(function (q) { h += "<li>「" + esc(String(q).slice(0, 56)) + "…」</li>"; });
      h += "</ul></div>";
    }

    if (res.bright && res.bright.length) {
      h += '<div class="gr-block"><h4>✅ 亮点与得分依据</h4><ul>';
      res.bright.forEach(function (x) { h += "<li>" + A3.md(x) + "</li>"; });
      h += "</ul></div>";
    }
    if (res.hits && res.hits.length) {
      h += '<div class="gr-block"><h4>踩到的点</h4><div class="gr-tags">';
      res.hits.forEach(function (x) { h += '<span class="gr-tag ok">' + esc(x) + "</span>"; });
      h += "</div></div>";
    }
    if (res.misses && res.misses.length) {
      h += '<div class="gr-block"><h4>❌ 扣分依据 / 还缺的点</h4><ul>';
      res.misses.forEach(function (x) {
        var t = typeof x === "string" ? x : ((x.t || "") + (x.why ? "：" + x.why : ""));
        h += "<li>" + A3.md(t) + "</li>";
      });
      h += "</ul></div>";
    }
    if (res.notes && res.notes.length) {
      h += '<div class="gr-block"><h4>体例提醒</h4><ul class="gr-notes">';
      res.notes.forEach(function (x) { h += "<li>" + esc(x) + "</li>"; });
      h += "</ul></div>";
    }
    if (res.advice && res.advice.length) {
      h += '<div class="gr-block"><h4>📈 提升建议</h4><ul>';
      res.advice.forEach(function (x) { h += "<li>" + A3.md(x) + "</li>"; });
      h += "</ul></div>";
    }
    if (res.comment) h += '<div class="gr-comment">' + A3.md(res.comment) + "</div>";
    if (res.sample) h += '<div class="gr-sample"><b>📖 可背模板句</b><p>' + A3.md(res.sample) + "</p></div>";
    h += "</div>";
    return h;
  }

  function ansHtml(it) {
    var pts = it.pts || [];
    var h = '<div class="mcard gr-ans ' + (S.ansOpen ? "open" : "") + '">';
    h += '<button class="gr-ans-head" id="grAnsT">📖 参考答案与采分点（' + it.full + ' 分 · ' + pts.length + " 个点）" + (S.ansOpen ? " ▾" : " ▸") + "</button>";
    if (S.ansOpen) {
      h += '<div class="gr-ans-body">';
      if (pts.length) {
        h += '<ol class="gr-pts">';
        pts.forEach(function (p) {
          h += '<li><b>' + esc(p.t) + "</b><span class=\"gr-w\">" + p.w + " 分</span>";
          if (p.body) h += '<div class="gr-pt-body">' + esc(String(p.body).slice(0, 180)) + "</div>";
          h += "</li>";
        });
        h += "</ol>";
      }
      var ref = refAns(it);
      if (ref) h += '<div class="gr-ans-full">' + A3.md(ref) + "</div>";
      h += "</div>";
    }
    h += "</div>";
    return h;
  }

  function linksHtml(it) {
    var kws = [];
    (it.pts || []).slice(0, 3).forEach(function (p) { (p.kw || []).slice(0, 2).forEach(function (k) { kws.push(k); }); });
    kws = kws.filter(function (k, i) { return k && k.length >= 2 && kws.indexOf(k) === i; }).slice(0, 5);
    var h = '<div class="gr-links">';
    h += '<span class="gr-link-lab">相关知识点：</span>';
    kws.forEach(function (k) {
      h += '<button class="pt-link q" data-gk="' + esc(k) + '">' + esc(k) + "</button>";
    });
    h += "</div>";
    return h;
  }

  function rubricHtml() {
    return '<details class="gr-rubric"><summary>📐 评分标准（论述 / 材料分别怎么给分）</summary>' +
      "<ul>" +
      "<li><b>论述题 15 分</b>：观点·采分点 7.5 + 论证 7.5。只列观点不展开，论证最多给一半。</li>" +
      "<li><b>材料题 15 分</b>：原理·采分点 7.5 + 结合材料 7.5。不引材料原句，材料分最多给一成；书上采分点与材料内容缺一不可。</li>" +
      "<li><b>自测 200 题</b>：要点 60% + 展开 40%，按参考答案的分点算命中。</li>" +
      "<li><b>踩点</b>：命中术语且有一句内涵解释才算满分，只写术语按半命中（0.35）；同一意思重复不给第二次分。</li>" +
      "<li><b>结构</b>：论述 3–5 点、每点「四字小标题＋定义＋展开」；人物思想按「人性论→作用→目的→内容方法→评价」至少 4 点；启示/影响按教育目的、内容、方法、制度、师生关系分维度，平铺长句不给结构分。</li>" +
      "<li><b>篇幅</b>：论述建议 500–600 字，材料 450–550 字；不到 60% 整体压分。</li>" +
      "<li><b>AI 精批</b>：在「AI 接口设置」填 DeepSeek / 百炼 Key 后，会用同一份采分点 + 上述口径再判一次，并给可背模板句。</li>" +
      "</ul></details>";
  }

  A3.views.grader = function () {
    var it = S.item;
    var h = '<section class="hero"><h2>🧮 大题批改室</h2>';
    h += "<p>一道一道来：选/粘题目 → 写（或粘）你的答案 → 本地按采分点判分；配好 AI 接口可再精批一次。判分口径：论述 = 观点 + 论证各半，材料 = 原理 + 结合材料各半。</p></section>";
    h += statsHtml();
    h += rubricHtml();

    if (!it) {
      if (S.custom) h += customHtml();
      else h += pickerHtml();
      h += recHtml();
      app.innerHTML = h;
      bindPicker();
      return;
    }

    h += '<div class="gr-head"><button class="ghost-btn" id="grBack">← 换一题</button><span class="gr-cur">' + esc((KIND[it.kind] || {}).name || "") + " · " + it.full + " 分</span></div>";
    h += qCardHtml(it);
    h += '<div class="mcard gr-write"><label class="gr-lab">我的作答 <span id="grCnt2" class="gr-cnt">' + S.ans.length + " 字</span></label>";
    h += '<textarea id="grAns" rows="10" placeholder="按「小标题：一句话说明」的分点写法作答；不会写就先写小标题，也算踩点。">' + esc(S.ans) + "</textarea>";
    h += '<div class="gr-photo"><label class="ghost-btn" for="grImg">📷 拍/选答题卡</label>' +
      '<input id="grImg" type="file" accept="image/*" style="display:none">' +
      (S.img ? '<img class="gr-thumb" id="grThumb" src="' + S.img + '" alt="答题卡">' +
        '<button class="ghost-btn" id="grOcr">识图转文字</button>' +
        '<button class="ghost-btn" id="grImgDel">删掉图</button>' : '') +
      '<span class="gr-photo-tip">图片只作对照；要自动转文字需在 AI 设置里填百炼 Key（视觉模型）。</span></div>';
    h += '<div class="gr-tools"><button class="btn" id="grLocal">本地判分</button>' +
      '<button class="ghost-btn" id="grAI">🤖 AI 精批</button>' +
      '<button class="ghost-btn" id="grSample">填参考要点</button>' +
      '<button class="ghost-btn" id="grClear">清空</button></div>';
    h += '<div class="gr-msg" id="grMsg">' + esc(S.msg) +
      (S.msg && /AI|Key/.test(S.msg) ? ' <a class="ghost-btn" href="#aigrade">去填 AI Key →</a>' : "") +
      "</div></div>";

    if (S.res) {
      h += resultHtml(it, S.res);
      h += linksHtml(it);
      h += ansHtml(it);
    }
    app.innerHTML = h;
    bindGrader(it);
  };

  function bindPicker() {
    var q = document.getElementById("grQ");
    if (q) {
      q.addEventListener("input", function () {
        S.q = q.value;
        clearTimeout(S._t);
        S._t = setTimeout(function () { A3.render(); }, 220);
      });
    }
    app.querySelectorAll("[data-gf]").forEach(function (b) {
      b.onclick = function () { S.f = b.getAttribute("data-gf"); S.show = 24; try { localStorage.setItem("k3_gr_f", S.f); } catch (e) {} A3.render(); };
    });
    app.querySelectorAll("[data-pick]").forEach(function (b) {
      b.onclick = function () {
        S.item = byId(b.getAttribute("data-pick")); S.ans = ""; S.res = null; S.msg = ""; S.ansOpen = false; A3.render();
      };
    });
    app.querySelectorAll("[data-rec]").forEach(function (b) {
      b.onclick = function () {
        var it = byId(b.getAttribute("data-rec"));
        if (!it) return;
        S.item = it; S.ans = ""; S.res = null; S.msg = ""; A3.render();
      };
    });
    var rd = document.getElementById("grRecDel");
    if (rd) rd.onclick = function () { try { localStorage.removeItem("k3_grade_v1"); } catch (e) {} A3.render(); };
    var more = document.getElementById("grMore");
    if (more) more.onclick = function () { S.show += 24; A3.render(); };
    var cu = document.getElementById("grCustom");
    if (cu) cu.onclick = function () { S.custom = true; A3.render(); };
    var cb = document.getElementById("grCBack");
    if (cb) cb.onclick = function () { S.custom = false; A3.render(); };
    var cq = document.getElementById("grCq"), cm = document.getElementById("grCmat"), cf = document.getElementById("grCfull");
    if (cq) cq.oninput = function () { S.cq = cq.value; };
    if (cm) cm.oninput = function () { S.cmat = cm.value; };
    if (cf) cf.oninput = function () { S.cfull = +cf.value || 15; };
    var go = document.getElementById("grCustomGo");
    if (go) {
      go.onclick = function () {
        if (!S.cq.trim()) { S.msg = "先把题目粘进来"; return; }
        S.item = { id: "custom", kind: "material", full: +S.cfull || 15, subj: "", q: S.cq, mat: S.cmat, pts: [], ans: "", type: "自定义" };
        S.custom = false; S.res = null; S.ans = ""; A3.render();
      };
    }
    A3.bindGo();
  }

  function bindGrader(it) {
    var ta = document.getElementById("grAns"), cnt = document.getElementById("grCnt2");
    if (ta) {
      ta.addEventListener("input", function () { S.ans = ta.value; if (cnt) cnt.textContent = ta.value.length + " 字"; });
    }
    var back = document.getElementById("grBack");
    if (back) back.onclick = function () { S.item = null; S.res = null; S.ans = ""; S.msg = ""; A3.render(); };
    var clr = document.getElementById("grClear");
    if (clr) clr.onclick = function () { S.ans = ""; S.res = null; S.msg = ""; A3.render(); };
    var smp = document.getElementById("grSample");
    if (smp) smp.onclick = function () {
      S.ans = sampleFill(it); S.res = null; S.msg = "已把参考答案的「小标题 + 首句」填进去，删掉你要自己写。"; A3.render();
    };
    var loc = document.getElementById("grLocal");
    if (loc) loc.onclick = function () { runLocal(it); };
    var ai = document.getElementById("grAI");
    if (ai) ai.onclick = function () { runAI(it); };
    var fi = document.getElementById("grImg");
    if (fi) fi.onchange = function () {
      var f = fi.files && fi.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { S.img = String(rd.result || ""); S.imgName = f.name || "photo"; S.msg = ""; A3.render(); };
      rd.readAsDataURL(f);
    };
    var oc = document.getElementById("grOcr");
    if (oc) oc.onclick = function () {
      var cfg = G.aiConfig();
      if (!cfg.key && !cfg.visionKey) { S.msg = "识图要先在「AI 接口设置」里填百炼 Key。"; A3.render(); return; }
      S.msg = "正在识图（约 5–15 秒）…"; A3.render();
      G.aiVision(S.img, cfg, "手写答题内容").then(function (txt) {
        S.ans = (S.ans ? S.ans.replace(/[ \t]+$/, "") + "\n" : "") + txt;
        S.msg = "识图完成，已填进作答框，校对一下再判分。";
        A3.render();
      }).catch(function (e) { S.msg = "识图失败：" + (e && e.message || e); A3.render(); });
    };
    var idl = document.getElementById("grImgDel");
    if (idl) idl.onclick = function () { S.img = ""; S.msg = ""; A3.render(); };
    var at = document.getElementById("grAnsT");
    if (at) at.onclick = function () { S.ansOpen = !S.ansOpen; A3.render(); };
    app.querySelectorAll("[data-gk]").forEach(function (b) {
      b.onclick = function () {
        A3._srchQ = b.getAttribute("data-gk");
        A3.go("srch");
      };
    });
    A3.bindGo();
  }

  function sampleFill(it) {
    var out = [];
    (it.pts || []).forEach(function (p) {
      var body = String(p.body || "").replace(/\s+/g, " ");
      var first = body.split(/[。；]/)[1] || body;
      out.push(p.t + "：" + first.slice(0, 40));
    });
    return out.join("\n");
  }

  function runLocal(it) {
    if (!G) { S.msg = "判分引擎没载入"; A3.render(); return; }
    var text = S.ans.trim();
    if (text.length < 10) { S.msg = "至少写两句话再判（现在 " + text.length + " 字）。"; A3.render(); return; }
    S.busy = "local";
    try {
      S.res = G.grade(it, text);
      S.msg = "";
      saveRec({ id: it.id, kind: it.kind, score: (+S.res.score).toFixed(1), full: it.full, rate: S.res.rate, title: it.q.slice(0, 24), at: new Date().toISOString() });
    } catch (e) {
      S.msg = "判分出错：" + (e && e.message || e);
    }
    S.busy = "";
    S.ansOpen = false;
    A3.render();
  }

  function runAI(it) {
    var cfg = G.aiConfig();
    if (!cfg.key) {
      S.msg = "还没配置 AI：先点下面的「AI 接口设置」，填 DeepSeek 或百炼的 Key。";
      A3.render();
      return;
    }
    if (!S.ans.trim()) { S.msg = "先写点东西再让 AI 批。"; A3.render(); return; }
    S.busy = "ai"; S.msg = "AI 正在批改（一般 5–15 秒）…";
    A3.render();
    var local = null;
    try { local = G.grade(it, S.ans); } catch (e) {}
    G.aiGrade(it, S.ans, local, cfg).then(function (o) {
      o.rate = it.full ? (+o.score || 0) / it.full : 0;
      S.res = o; S.busy = ""; S.msg = "AI 批改完成，可以对照本地判分。";
      saveRec({ id: it.id, kind: it.kind, score: (+o.score || 0).toFixed(1), full: it.full, rate: o.rate, title: it.q.slice(0, 24), at: new Date().toISOString() });
      A3.render();
    }).catch(function (e) {
      S.busy = ""; S.msg = "AI 批改失败：" + (e && e.message || e) + "（本地判分仍可用）";
      A3.render();
    });
  }

  /* ---------- 速练大题 ---------- */
  function pickDrill(kind) {
    var pool = items().filter(function (i) { return !kind || kind === "all" || i.kind === kind; });
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  A3.views.drill = function () {
    if (!S.drill) S.drill = pickDrill("essay");
    var it = S.drill;
    var h = '<section class="hero"><h2>⚡ 速练大题</h2>';
    h += "<p>不用写全篇：一行一个「小标题：这句话大概写什么」。检查会告诉你点够不够、维度全不全、还缺哪几个采分点。</p></section>";
    h += '<div class="gr-chips">';
    [["essay", "抽论述"], ["material", "抽材料"], ["q200", "抽 200 题"]].forEach(function (c) {
      h += '<button class="chip" data-dr="' + c[0] + '">' + c[1] + "</button>";
    });
    h += '<button class="chip" data-dr="again">🔄 换一题</button></div>';
    h += '<div class="gr-gen"><input id="drTopic" class="ks-input" placeholder="想练哪个主题？如「蔡元培」「德育方法」，留空随机" value="' + esc(S.topic) + '">' +
      '<button class="ghost-btn" id="drGen">🤖 让 AI 出题</button></div>';
    if (S.genBusy) h += '<div class="gr-msg">' + esc(S.genBusy) + "</div>";

    h += '<div class="mcard gr-q"><div class="gr-q-top"><span class="gr-badge">' + esc((KIND[it.kind] || {}).name || "") + "</span>";
    h += '<span class="gr-q-meta">' + esc(subjName(it.subj)) + " · " + it.full + " 分 · " + esc(it.type || "") + "</span></div>";
    h += '<div class="gr-q-text">' + A3.md(it.q) + "</div>";
    if (it.mat) h += '<details class="gr-mat"><summary>看材料</summary><div class="gr-mat-body">' + A3.md(it.mat) + "</div></details>";
    h += "</div>";

    h += '<div class="mcard gr-write"><label class="gr-lab">我的思路（每行：小标题：一句大意）</label>';
    h += '<textarea id="drT" rows="8" placeholder="例如：\n教育目的：培养德智体全面发展的人\n教育内容：六艺与四书\n教育方法：因材施教、启发诱导">' + esc(S.drillText) + "</textarea>";
    h += '<div class="gr-tools"><button class="btn" id="drGo">检查思路</button><button class="ghost-btn" id="drAns">看参考答案</button><button class="ghost-btn" id="drClear">清空</button></div>';
    h += '<div class="gr-msg" id="drMsg">' + esc(S.msg) + "</div></div>";

    if (S.drillRes) {
      var r = S.drillRes;
      var hits = [], seen = {};
      (r.rows || []).forEach(function (row) {
        if (row.match && row.cov >= 0.28 && !seen[row.match]) { seen[row.match] = 1; hits.push(row.match); }
      });
      var missed = (it.pts || []).map(function (p) { return p.t; }).filter(function (t) { return !seen[t]; });
      h += '<div class="mcard gr-res"><div class="gr-score"><b>' + (+r.est).toFixed(1) + "</b><i>/" + it.full + "</i>";
      h += '<span class="gr-rate">估分（按思路完整度：分点数 ' + r.n + " / 点了标题的 " + r.good + " / 四字小标题 " + r.heads4 + "）</span></div>";
      h += '<div class="gr-block"><h4>点到的采分点（' + hits.length + "）</h4><div class=\"gr-tags\">";
      if (!hits.length) h += '<span class="gr-tag">暂时一个都没对上</span>';
      hits.forEach(function (x) { h += '<span class="gr-tag ok">' + esc(x) + "</span>"; });
      h += "</div></div>";
      if (missed.length) {
        h += '<div class="gr-block"><h4>还没写到的点（' + missed.length + "）</h4><ul>";
        missed.slice(0, 8).forEach(function (x) { h += "<li>" + esc(x) + "</li>"; });
        h += "</ul></div>";
      }
      if (r.tips && r.tips.length) {
        h += '<div class="gr-block"><h4>改一改能多拿分</h4><ul>';
        r.tips.forEach(function (x) { h += "<li>" + esc(x) + "</li>"; });
        h += "</ul></div>";
      }
      h += "</div>";
      if (S.ansOpen) {
        h += '<div class="mcard gr-ans open"><div class="gr-ans-head">参考答案要点</div><div class="gr-ans-body"><ol class="gr-pts">';
        (it.pts || []).forEach(function (p) { h += "<li><b>" + esc(p.t) + '</b><span class="gr-w">' + p.w + " 分</span></li>"; });
        h += "</ol></div></div>";
      }
    }
    app.innerHTML = h;
    var ta = document.getElementById("drT");
    if (ta) ta.addEventListener("input", function () { S.drillText = ta.value; });
    app.querySelectorAll("[data-dr]").forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-dr");
        S.drill = pickDrill(k === "again" ? null : k);
        S.drillText = ""; S.drillRes = null; S.ansOpen = false; S.msg = ""; A3.render();
      };
    });
    var g = document.getElementById("drGo");
    if (g) g.onclick = function () {
      if (S.drillText.trim().length < 12) { S.msg = "至少写三行思路。"; A3.render(); return; }
      S.drillRes = G.outline(it, S.drillText); S.msg = ""; A3.render();
    };
    var tp = document.getElementById("drTopic");
    if (tp) tp.addEventListener("input", function () { S.topic = tp.value; });
    var gn = document.getElementById("drGen");
    if (gn) gn.onclick = function () {
      var cfg = G.aiConfig();
      if (!cfg.key) { S.msg = "先在「AI 接口设置」里填 Key，才能让 AI 出题。"; A3.render(); return; }
      S.genBusy = "AI 正在出题…"; A3.render();
      G.aiMake(S.topic, cfg).then(function (o) {
        S.drill = o; S.drillText = ""; S.drillRes = null; S.genBusy = ""; S.ansOpen = false;
        S.msg = "AI 出的题已就位（" + (o.type || "主观题") + "）。";
        A3.render();
      }).catch(function (e) { S.genBusy = ""; S.msg = "出题失败：" + (e && e.message || e); A3.render(); });
    };
    var a = document.getElementById("drAns");
    if (a) a.onclick = function () { S.ansOpen = !S.ansOpen; A3.render(); };
    var c = document.getElementById("drClear");
    if (c) c.onclick = function () { S.drillText = ""; S.drillRes = null; S.msg = ""; A3.render(); };
    A3.bindGo();
  };

  /* ---------- AI 设置 ---------- */
  A3.views.aigrade = function () {
    var cfg = G ? G.aiConfig() : {};
    var PR = (G && G.providers) || { deepseek: { label: "DeepSeek 官方", base: "https://api.deepseek.com/v1", model: "deepseek-chat" }, bailian: { label: "阿里云百炼", base: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" } };
    var pid = cfg.provider || "deepseek";
    var h = '<section class="hero"><h2>🤖 AI 接口设置</h2><p>本地判分不走网络；配好 Key 才能用「AI 精批」。Key 只存在这台设备的浏览器里，不会上传到别处。</p></section>';
    h += '<div class="mcard gr-cfg">';
    h += '<div class="gr-chips">';
    Object.keys(PR).forEach(function (k) {
      if (k === "custom") return;
      h += '<button class="chip ' + (pid === k ? "active" : "") + '" data-ap="' + k + '">' + esc(PR[k].label || k) + "</button>";
    });
    h += '<button class="chip ' + (pid === "custom" ? "active" : "") + '" data-ap="custom">自定义</button></div>';
    h += '<label class="gr-lab">Base URL</label><input id="aiBase" class="ks-input" placeholder="https://api.deepseek.com/v1" value="' + esc(cfg.base || PR[pid].base || "") + '">';
    h += '<label class="gr-lab">模型名</label><input id="aiModel" class="ks-input" placeholder="deepseek-chat" value="' + esc(cfg.model || PR[pid].model || "") + '">';
    h += '<label class="gr-lab">API Key</label><input id="aiKey" type="password" class="ks-input" placeholder="sk-…" value="' + esc(cfg.key || "") + '">';
    h += '<div class="gr-tools"><button class="btn" id="aiSave">保存</button><button class="ghost-btn" id="aiTest">测试连接</button><button class="ghost-btn" data-go="grader">去批改</button></div>';
    h += '<div class="gr-msg" id="aiMsg">' + esc(S.msg) + "</div>";
    h += '<ul class="gr-tips"><li>DeepSeek：在 platform.deepseek.com 生成 Key，Base 用 <code>https://api.deepseek.com/v1</code>，模型 <code>deepseek-chat</code>。</li>';
    h += '<li>百炼：在 dashscope.console.aliyun.com 生成 Key，Base 用 <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code>，模型 <code>qwen-plus</code>。</li>';
    h += "<li>手机/平板上如果接口报跨域或网络错误，多半是网络问题，不影响本地判分。</li></ul></div>";
    app.innerHTML = h;
    var sel = pid;
    app.querySelectorAll("[data-ap]").forEach(function (b) {
      b.onclick = function () {
        sel = b.getAttribute("data-ap");
        var base = document.getElementById("aiBase"), model = document.getElementById("aiModel");
        if (sel !== "custom") {
          if (base) base.value = PR[sel].base;
          if (model) model.value = PR[sel].model;
        }
        S._prov = sel;
        A3.render();
      };
    });
    if (S._prov) sel = S._prov;
    var sv = document.getElementById("aiSave");
    if (sv) sv.onclick = function () {
      var c = {
        provider: sel,
        base: document.getElementById("aiBase").value.trim(),
        model: document.getElementById("aiModel").value.trim(),
        key: document.getElementById("aiKey").value.trim()
      };
      G.aiSave(c);
      S.msg = "已保存到本机。";
      A3.render();
    };
    var ts = document.getElementById("aiTest");
    if (ts) ts.onclick = function () {
      var c = { provider: sel, base: document.getElementById("aiBase").value.trim(), model: document.getElementById("aiModel").value.trim(), key: document.getElementById("aiKey").value.trim() };
      if (!c.key) { S.msg = "先填 Key"; A3.render(); return; }
      G.aiSave(c);
      var it = items()[0];
      S.msg = "正在测试…";
      A3.render();
      G.aiGrade(it, sampleFill(it), { score: 8 }, c).then(function (o) {
        S.msg = "连接成功，模型回了 " + (o.score != null ? o.score + " 分" : "内容") + "。";
        A3.render();
      }).catch(function (e) { S.msg = "失败：" + (e && e.message || e); A3.render(); });
    };
    A3.bindGo();
  };
})();