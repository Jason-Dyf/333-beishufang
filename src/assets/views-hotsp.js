/* 333 背书房 · 教育热点（14 个主题 + 20 道专项测试 + 选择题速记）
   数据来自 assets/data/hotsp.js（《27年教育热点》讲义与 2026 专项测试题），只做整理，不编造 */
(function () {
  "use strict";
  var A3 = window.A3, app = document.getElementById("app");
  var esc = A3.esc;
  var F = "all", Q = "", OPEN = {};

  function data() {
    return window.K3_HOTSP || { themes: [], quiz: [], sel: [] };
  }

  function hit(s) {
    if (!Q) return true;
    return String(s || "").toLowerCase().indexOf(Q) >= 0;
  }

  function themeCard(t) {
    var bys = (t.items || []).filter(hit);
    if (Q && !hit(t.name) && !bys.length) return "";
    var open = OPEN[t.id];
    var items = (t.items || []).slice(0, open ? 99 : 3);
    var h = '<article class="hs-card" data-id="' + t.id + '">';
    h += '<div class="hs-h"><b>' + esc(t.name) + "</b>";
    h += '<span class="hs-badge ' + (t.kind === "重点主题" ? "hot" : "") + '">' + esc(t.kind) + "</span></div>";
    if (t.angle) h += '<p class="hs-angle">' + esc(t.angle) + "</p>";
    if (t.points && t.points.length) {
      h += '<div class="hs-pts">';
      t.points.forEach(function (p) { h += '<span class="hs-pt">' + esc(p) + "</span>"; });
      h += "</div>";
    }
    if (items.length) {
      h += '<ol class="hs-items">';
      items.forEach(function (x) { h += "<li>" + esc(x) + "</li>"; });
      h += "</ol>";
      if ((t.items || []).length > 3) {
        h += '<button class="hs-more" data-id="' + t.id + '">' + (open ? "收起" : "展开全部 " + t.items.length + " 条") + "</button>";
      }
    }
    if (t.links && t.links.length) {
      h += '<div class="hs-links">📎 ' + t.links.map(esc).join(" · ") + "</div>";
    }
    h += "</article>";
    return h;
  }

  function quizCard(q) {
    if (Q && !hit(q.q) && !hit(q.exp)) return "";
    var h = '<article class="hq-card" data-no="' + q.no + '">';
    h += '<div class="hq-h"><span class="hq-no">' + q.no + '</span><span class="hq-type">' + esc(q.type) + "</span></div>";
    h += '<p class="hq-q">' + esc(q.q) + "</p>";
    if (q.opts && q.opts.length) {
      h += '<div class="hq-opts">';
      q.opts.forEach(function (o) { h += '<span class="hq-o"><i>' + esc(o[0]) + "</i>" + esc(o[1]) + "</span>"; });
      h += "</div>";
    }
    h += '<button class="hq-rev" data-no="' + q.no + '">看答案</button>';
    h += '<div class="hq-ans" hidden><b>答案：' + esc(q.a) + "</b>";
    if (q.exp) h += "<p>" + esc(q.exp) + "</p>";
    if (q.pt) h += '<div class="hq-pt">' + esc(q.pt) + "</div>";
    h += "</div>";
    h += "</article>";
    return h;
  }

  A3.views.hotsp = function () {
    var d = data();
    var h = '<section class="hero"><h2>🔥 教育热点 · 2026</h2>';
    h += "<p>按讲义 14 个主题整理：先看「出题角度」判断会怎么问，再背「答题素材」的几条硬料，最后对着关联考点想想能接到哪一章。专项 20 题可自测，选择题速记用来过客观题。</p></section>";

    h += '<div class="stat-row" style="grid-template-columns:repeat(3,minmax(0,1fr))">';
    h += '<div class="stat"><b>' + d.themes.length + "</b><span>热点主题</span></div>";
    h += '<div class="stat"><b>' + d.quiz.length + "</b><span>专项测试题</span></div>";
    h += '<div class="stat"><b>' + d.sel.length + "</b><span>选择题速记</span></div>";
    h += "</div>";

    h += '<div class="hsp-bar"><input id="hspQ" class="hsp-q" placeholder="搜热点：人工智能、惩戒、双减、PISA…" value="' + esc(Q) + '">';
    h += '<div class="hsp-chips">';
    [["all", "全部"], ["key", "重点主题"], ["norm", "常规主题"], ["quiz", "专项测试 " + d.quiz.length], ["sel", "选择题速记"]].forEach(function (c) {
      h += '<button class="chip ' + (F === c[0] ? "active" : "") + '" data-hf="' + c[0] + '">' + esc(c[1]) + "</button>";
    });
    h += "</div></div>";

    if (F === "quiz") {
      var qs = d.quiz.map(quizCard).join("");
      h += '<div class="hq-list">' + (qs || '<p class="hsp-empty">没有匹配的题，换个词试试。</p>') + "</div>";
    } else if (F === "sel") {
      var lastH = "";
      h += '<div class="hs-sel">';
      d.sel.forEach(function (s) {
        if (Q && !hit(s.t)) return;
        if (s.h !== lastH) { h += '<div class="hs-selh">' + esc(s.h) + "</div>"; lastH = s.h; }
        h += '<p class="hs-seli">' + esc(s.t) + "</p>";
      });
      h += "</div>";
    } else {
      var list = d.themes.filter(function (t) {
        if (F === "key" && t.kind !== "重点主题") return false;
        if (F === "norm" && t.kind !== "常规主题") return false;
        return true;
      });
      var body = list.map(themeCard).join("");
      h += body || '<p class="hsp-empty">没有匹配的热点，换个词试试。</p>';
    }
    app.innerHTML = h;

    var inp = document.getElementById("hspQ");
    if (inp) {
      var timer = null;
      inp.oninput = function () {
        var v = this.value;
        clearTimeout(timer);
        timer = setTimeout(function () { Q = v.trim().toLowerCase(); A3.views.hotsp(); }, 220);
      };
    }
  };

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var chip = t.closest("[data-hf]");
    if (chip) { F = chip.getAttribute("data-hf"); A3.views.hotsp(); return; }
    var more = t.closest(".hs-more");
    if (more) { var id = more.getAttribute("data-id"); OPEN[id] = !OPEN[id]; A3.views.hotsp(); return; }
    var rev = t.closest(".hq-rev");
    if (rev && rev.closest("#app")) {
      var box = rev.parentNode.querySelector(".hq-ans");
      if (box) {
        box.hidden = !box.hidden;
        rev.textContent = box.hidden ? "看答案" : "收起答案";
      }
      return;
    }
  });
})();