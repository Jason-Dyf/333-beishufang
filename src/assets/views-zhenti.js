/* 333 背书房 · 真题整卷（2024—2026） */
(function () {
  var A3 = window.A3, K = A3.K;
  var esc = A3.esc, md = A3.md;

  function data() { return window.K3_ZT_PAPERS || { papers: [] }; }
  var VER_RANK = { "洪哥八套卷": 1, "丹丹六套卷": 2 };
  function papers() {
    var list = (data().papers || []).slice();
    var real = list.filter(function (p) { return /^20\d\d$/.test(String(p.year)); })
      .sort(function (a, b) { return String(b.year) - String(a.year); });
    var mock = list.filter(function (p) { return !/^20\d\d$/.test(String(p.year)); })
      .sort(function (a, b) {
        var ra = VER_RANK[a.ver] || 9, rb = VER_RANK[b.ver] || 9;
        if (ra !== rb) return ra - rb;
        return (a.ord || 0) - (b.ord || 0);
      });
    return real.concat(mock);
  }
  function find(year) {
    var p = null;
    papers().forEach(function (x) { if (String(x.year) === String(year)) p = x; });
    return p;
  }
  function subjName(id) {
    var n = id;
    (K.subjects || []).forEach(function (s) { if (s.id === id) n = s.short || s.name; });
    return n;
  }
  function hashParts() {
    var raw = (location.hash || "").replace(/^#/, "");
    var p = raw.split("/");
    return { view: p[0] || "", a: p[1] || "", b: p[2] || "" };
  }
  function go(year, tab) {
    location.hash = "zhenti" + (year ? "/" + year : "") + (tab ? "/" + tab : "");
    A3.go("zhenti");
  }

  /* ---------------- 列表 ---------------- */
  A3.views.zhenti = function () {
    var hp = hashParts();
    if (hp.a) { renderPaper(hp.a, hp.b || "c"); return; }
    var ps = papers();
    var h = '<div class="section-title">📑 历年真题整卷</div>';
    h += '<p class="muted" style="margin:-4px 0 14px;font-size:13.5px;color:var(--ink-3)">' +
      '每张卷 = 30 道单选 + 2 道论述 + 4 道材料分析。点击进入可按题型查看原题、答案与解析；选择题可一键开刷。</p>';
    if (!ps.length) { h += '<div class="qempty">还没有导入口语真题数据</div>'; app.innerHTML = h; return; }
    h += '<div class="zt-list">';
    ps.forEach(function (p) {
      var c = p.choice || [], e = p.essay || [], m = p.material || [];
      h += '<div class="zt-card">' +
        '<div class="zt-card-top"><div class="zt-year">' + esc(p.tag || p.year) + '</div>' +
        '<div class="zt-meta"><b>' + esc(p.name) + '</b><span>' + esc(p.ver || "") + ' · 满分 150 分</span></div></div>' +
        '<div class="zt-pills"><span>单选 ' + c.length + '</span><span>论述 ' + e.length + '</span><span>材料 ' + m.length + '</span></div>' +
        '<div class="zt-card-acts">' +
        '<button class="qbtn primary" data-y="' + p.year + '" data-t="c">看选择题</button>' +
        '<button class="qbtn" data-y="' + p.year + '" data-t="e">论述题</button>' +
        '<button class="qbtn" data-y="' + p.year + '" data-t="m">材料分析</button>' +
        '<button class="qbtn ghost" data-zt-run="' + p.year + '">开刷这套单选 ▸</button>' +
        '</div></div>';
    });
    h += "</div>";
    app.innerHTML = h;
    Array.prototype.forEach.call(app.querySelectorAll("[data-y]"), function (b) {
      b.onclick = function () { go(b.getAttribute("data-y"), b.getAttribute("data-t")); };
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-zt-run]"), function (b) {
      b.onclick = function () {
        var y = b.getAttribute("data-zt-run");
        if (A3.quizStartPaper) { A3.quizStartPaper(y); }
      };
    });
  };

  /* ---------------- 单卷 ---------------- */
  function renderPaper(year, tab) {
    var p = find(year);
    if (!p) { app.innerHTML = '<div class="qempty">没有找到这套真题</div>'; return; }
    var c = p.choice || [], e = p.essay || [], m = p.material || [];
    var h = '<div class="zt-head">';
    h += '<button class="qbtn ghost" id="ztBack">‹ 全部真题</button>';
    h += '<div class="section-title" style="margin:6px 0 2px">' + esc(p.name || (p.year + ' 年 · 333 真题')) + '</div>';
    h += '<p class="muted" style="margin:0 0 10px;font-size:13px;color:var(--ink-3)">' + esc(p.ver || "") +
      "　单选 " + c.length + " · 论述 " + e.length + " · 材料 " + m.length + "</p>";
    h += "</div>";

    h += '<div class="zt-tabs">';
    [["c", "单项选择题", c.length], ["e", "论述题", e.length], ["m", "材料分析题", m.length]].forEach(function (t) {
      h += '<button class="zt-tab' + (tab === t[0] ? " on" : "") + '" data-tab="' + t[0] + '">' + t[1] + '<i>' + t[2] + "</i></button>";
    });
    h += "</div>";

    if (tab === "c") {
      if (!c.length) h += '<div class="qempty">这套卷没有录入选择题</div>';
      else {
        var nRun = c.filter(function (z) { return typeof z.a === "number" && z.a >= 0; }).length;
        if (nRun < c.length) h += '<p class="muted" style="margin:0 0 6px;font-size:12.5px;color:var(--ink-3)">这 ' + c.length + ' 道里有 ' + (c.length - nRun) + " 道原卷缺答案，只能看题；能判分的是 " + nRun + " 道。</p>";
        h += '<div style="display:flex;gap:8px;margin:10px 0 14px;flex-wrap:wrap">' +
          '<button class="qbtn primary" id="ztRun">开刷这 ' + nRun + ' 道单选</button>' +
          '<button class="qbtn" id="ztAll">展开 / 收起全部答案</button></div>';
        c.forEach(function (q, i) {
          h += '<div class="ztq" data-i="' + i + '" data-no="' + q.no + '" data-a="' + q.a + '">';
          h += '<div class="ztq-head"><span class="ztq-no">' + q.no + '</span>' +
            '<span class="qcard-tag">' + esc(subjName(q.subj)) + "</span>" +
            '<span class="qcard-tag">单选 · 2 分</span></div>';
          h += '<div class="qcard-q">' + md(q.q) + "</div>";
          h += '<div class="zt-opts">';
          (q.opts || []).forEach(function (o, k) {
            var right = (k === q.a);
            h += '<div class="zt-opt" data-k="' + k + '"><b>' + "ABCD"[k] + "</b><span>" + md(o) + "</span></div>";
          });
          h += "</div>";
          h += '<div class="zt-acts"><button class="qbtn zt-tog">看答案</button>' +
            (q.a >= 0 && A3.openSrc ? "" : "") + "</div>";
          h += '<div class="zt-ans" hidden><div class="zt-key">答案：' + (q.a >= 0 ? "ABCD"[q.a] : "缺失") + "</div>" +
            '<div class="zt-exp">' + md(q.exp || "") + "</div></div>";
          h += "</div>";
        });
      }
    } else if (tab === "e") {
      if (!e.length) h += '<div class="qempty">这套卷没有录入论述题</div>';
      e.forEach(function (q, i) {
        h += '<div class="ztq" data-i="' + i + '" data-no="' + q.no + '" data-a="' + q.a + '">';
        h += '<div class="ztq-head"><span class="ztq-no">' + q.no + '</span><span class="qcard-tag">论述 · ' + (q.score || 15) + ' 分</span>' +
          '<span class="qcard-tag">' + esc(subjName(q.subj)) + "</span></div>";
        h += '<div class="qcard-q">' + md(q.q) + "</div>";
        h += '<div class="zt-acts"><button class="qbtn zt-tog">看参考答案</button></div>';
        h += '<div class="zt-ans" hidden><div class="zt-exp zt-pre">' + md(q.ans || "（暂无参考答案）") + "</div></div>";
        h += "</div>";
      });
    } else {
      if (!m.length) h += '<div class="qempty">这套卷没有录入材料分析题</div>';
      m.forEach(function (q, i) {
        h += '<div class="ztq" data-i="' + i + '" data-no="' + q.no + '" data-a="' + q.a + '">';
        h += '<div class="ztq-head"><span class="ztq-no">' + q.no + '</span><span class="qcard-tag">材料分析 · ' + (q.score || 15) + ' 分</span>' +
          '<span class="qcard-tag">' + esc(subjName(q.subj)) + "</span></div>";
        if (q.mat) h += '<div class="zt-mat">' + md(q.mat) + "</div>";
        if ((q.asks || []).length) {
          h += '<div class="zt-asks">';
          q.asks.forEach(function (a) {
            h += '<div class="zt-ask"><b>' + a.score + ' 分</b><span>' + md(a.t) + "</span></div>";
          });
          h += "</div>";
        }
        h += '<div class="zt-acts"><button class="qbtn zt-tog">看参考答案</button></div>';
        h += '<div class="zt-ans" hidden><div class="zt-exp zt-pre">' + md(q.ans || "（暂无参考答案）") + "</div></div>";
        h += "</div>";
      });
    }

    app.innerHTML = h;
    document.getElementById("ztBack").onclick = function () { go(""); };
    Array.prototype.forEach.call(app.querySelectorAll(".zt-tab"), function (b) {
      b.onclick = function () { go(year, b.getAttribute("data-tab")); };
    });
    Array.prototype.forEach.call(app.querySelectorAll(".zt-tog"), function (b) {
      b.onclick = function () {
        var zq = b.closest(".ztq");
        var box = zq.querySelector(".zt-ans");
        box.hidden = !box.hidden;
        var okEl = zq.querySelector('.zt-opt[data-k="' + zq.getAttribute("data-a") + '"]');
        if (okEl) okEl.classList.toggle("ok", !box.hidden);
        b.textContent = box.hidden ? (tab === "c" ? "看答案" : "看参考答案") : "收起";
      };
    });
    var all = document.getElementById("ztAll");
    if (all) all.onclick = function () {
      var boxes = app.querySelectorAll(".zt-ans");
      var open = false;
      Array.prototype.forEach.call(boxes, function (b) { if (b.hidden) open = true; });
      Array.prototype.forEach.call(boxes, function (b) { b.hidden = !open; });
      Array.prototype.forEach.call(app.querySelectorAll(".zt-tog"), function (b) { b.textContent = open ? "收起" : "看答案"; });
      Array.prototype.forEach.call(app.querySelectorAll(".ztq"), function (zq) {
        var box = zq.querySelector(".zt-ans");
        if (box) box.hidden = !open;
        var okEl = zq.querySelector('.zt-opt[data-k="' + zq.getAttribute("data-a") + '"]');
        if (okEl) okEl.classList.toggle("ok", open);
      });
    };
    /* 从搜索跳进来：定位到指定题并高亮 */
    if (A3._ztFocus && A3._ztFocus.tab === tab) {
      var f = A3._ztFocus;
      var tnode = app.querySelector('.ztq[data-no="' + f.no + '"]');
      if (tnode) {
        tnode.classList.add("zt-flash");
        try { tnode.scrollIntoView({ block: "center" }); } catch (e) {}
      }
      setTimeout(function () { if (A3._ztFocus === f) A3._ztFocus = null; }, 600);
    }
    var run = document.getElementById("ztRun");
    if (run) run.onclick = function () { if (A3.quizStartPaper) A3.quizStartPaper(year); };
  }

  /* 供首页/搜索跳转 */
  A3.ztOpen = function (year, tab) { go(year, tab); };
})();