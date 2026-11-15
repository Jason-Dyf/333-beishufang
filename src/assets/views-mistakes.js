/* 333 背书房 · 错题总结与技巧（来源：学姐 18 周直播答疑/周总结，只取知识点与题目，不搬答题卡） */
(function () {
  "use strict";
  var A3 = window.A3, app = document.getElementById("app");
  var esc = A3.esc;
  var CAT = "all", WK = "all", Q = "";

  function data() {
    return window.K3_MIST || { weeks: [], items: [] };
  }

  function hit(it) {
    if (!Q) return true;
    var hay = [it.t, it.b, it.red, (it.tags || []).join(" ")].join(" ").toLowerCase();
    return hay.indexOf(Q) >= 0;
  }

  function markRed(s) {
    if (!s) return "";
    var parts = String(s).split(/\n+/);
    return parts.map(function (line) {
      return "<p>" + esc(line).replace(/\*\*([^*]+)\*\*/g, '<mark class="mist-red">$1</mark>') + "</p>";
    }).join("");
  }

  function card(it) {
    if (CAT !== "all" && it.cat !== CAT) return "";
    if (WK !== "all" && it.w !== WK) return "";
    if (!hit(it)) return "";
    var h = '<article class="mt-card">';
    h += '<div class="mt-h"><span class="mt-cat ' + esc(it.cat) + '">' + esc(it.cat) + "</span>";
    h += "<b>" + esc(it.t) + "</b>";
    if (it.type) h += '<span class="mt-type">' + esc(it.type) + "</span>";
    h += "</div>";
    if (it.b) h += '<div class="mt-b">' + markRed(it.b) + "</div>";
    if (it.red) h += '<div class="mt-red">🔴 ' + markRed(it.red) + "</div>";
    if (it.tags && it.tags.length) {
      h += '<div class="mt-tags">' + it.tags.map(function (t) { return '<span class="mt-tag">' + esc(t) + "</span>"; }).join("") + "</div>";
    }
    h += "</article>";
    return h;
  }

  A3.views.mistakes = function () {
    var d = data();
    var items = d.items || [];
    var nErr = items.filter(function (i) { return i.cat === "错题"; }).length;
    var nKey = items.filter(function (i) { return i.cat === "重点"; }).length;
    var nTip = items.filter(function (i) { return i.cat === "技巧"; }).length;

    var h = '<section class="hero"><h2>📕 错题总结与相关技巧</h2>';
    h += "<p>把学姐 18 周直播答疑里反复强调的东西抽出来：<b>错题</b>按「错在哪、为什么错、下次怎么躲」写，<b>重点</b>是年年考的老面孔，<b>技巧</b>是考场上真能省时间的招。红色标记＝她原话里加重的地方。</p></section>";

    h += '<div class="stat-row" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">';
    h += '<div class="stat"><b>' + (d.weeks || []).length + "</b><span>周次</span></div>";
    h += '<div class="stat"><b>' + nErr + "</b><span>错题条目</span></div>";
    h += '<div class="stat"><b>' + nKey + "</b><span>重点</span></div>";
    h += '<div class="stat"><b>' + nTip + "</b><span>技巧</span></div>";
    h += "</div>";

    h += '<div class="mt-bar"><input id="mtQ" class="hsp-q" placeholder="搜：教育惩戒、班级授课制、选择题陷阱…" value="' + esc(Q) + '">';
    h += '<div class="hsp-chips">';
    [["all", "全部"], ["错题", "错题"], ["重点", "重点"], ["技巧", "技巧"], ["热点", "热点"]].forEach(function (c) {
      h += '<button class="chip ' + (CAT === c[0] ? "active" : "") + '" data-mc="' + esc(c[0]) + '">' + esc(c[1]) + "</button>";
    });
    h += "</div></div>";

    h += '<div class="mt-weeks"><button class="chip ' + (WK === "all" ? "active" : "") + '" data-mw="all">全部周次</button>';
    (d.weeks || []).forEach(function (w) {
      var n = items.filter(function (i) { return i.w === w.id; }).length;
      if (!n) return;
      h += '<button class="chip ' + (WK === w.id ? "active" : "") + '" data-mw="' + w.id + '" title="' + esc(w.note || "") + '">' + esc(w.short || w.name) + " · " + n + "</button>";
    });
    h += "</div>";

    var body = "";
    (d.weeks || []).forEach(function (w) {
      var inner = items.filter(function (i) { return i.w === w.id; }).map(card).join("");
      if (!inner) return;
      body += '<section class="mt-wk"><h3>' + esc(w.name) + (w.note ? '<span>' + esc(w.note) + "</span>" : "") + "</h3>" + inner + "</section>";
    });
    h += body || '<p class="hsp-empty">没有匹配的条目，换个词试试。</p>';
    app.innerHTML = h;

    var inp = document.getElementById("mtQ");
    if (inp) {
      var timer = null;
      inp.oninput = function () {
        var v = this.value;
        clearTimeout(timer);
        timer = setTimeout(function () { Q = v.trim().toLowerCase(); A3.views.mistakes(); }, 220);
      };
    }
  };

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest("#app")) return;
    var c = t.closest("[data-mc]");
    if (c) { CAT = c.getAttribute("data-mc"); A3.views.mistakes(); return; }
    var w = t.closest("[data-mw]");
    if (w) { WK = w.getAttribute("data-mw"); A3.views.mistakes(); return; }
  });
})();