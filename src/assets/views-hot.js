/* 333 背书房 · 真题考点榜
   数据来自 assets/data/plink.js（考点 ↔ 历年整卷/练习的匹配结果），只做统计，不编造 */
(function () {
  "use strict";
  var A3 = window.A3, K = A3.K, app = document.getElementById("app");
  var esc = A3.esc;
  var rows = null;

  function build() {
    if (rows) return rows;
    var link = window.K3_PLINK || {};
    var idx = {};
    (K.subjects || []).forEach(function (s) {
      (s.chapters || []).forEach(function (c) {
        (c.points || []).forEach(function (p, pi) {
          idx[s.id + "|" + c.id + "|" + pi] = { sub: s.id, subName: s.short || s.name, ch: c.id, chName: c.name, pi: pi, t: p.t };
        });
      });
    });
    rows = [];
    Object.keys(link).forEach(function (k) {
      var it = idx[k];
      if (!it) return;
      var z = (link[k] && link[k].z) || [];
      var q = (link[k] && link[k].q) || [];
      if (!z.length && !q.length) return;
      rows.push({ sub: it.sub, subName: it.subName, ch: it.ch, chName: it.chName, pi: it.pi, t: it.t, z: z, q: q });
    });
    rows.sort(function (a, b) { return b.z.length - a.z.length || b.q.length - a.q.length; });
    return rows;
  }

  function zLabel(z) {
    return z.map(function (x) { return x[0] + (x[1] === "c" ? "选" : x[1] === "e" ? "论" : "材"); }).join(" · ");
  }

  A3.views.hot = function () {
    var all = build();
    var cur = A3.state.hotSubj || "all";
    var onlyZ = A3.state.hotOnlyZ !== false;
    var list = all.filter(function (r) {
      if (cur !== "all" && r.sub !== cur) return false;
      if (onlyZ && !r.z.length) return false;
      return true;
    });
    var h = '<div class="section-title">📈 真题考点榜</div>';
    h += '<p class="hot-sub">把 2024–2026 三套整卷、洪哥八套、丹丹六套的题目按考点对了一遍：哪条考点被反复考，这里排前面。点一行直接跳到背诵页那一条。数据来自卷面匹配，不是猜的。</p>';
    var zTotal = all.reduce(function (n, r) { return n + r.z.length; }, 0);
    h += '<div class="ol-stats"><span>有题目记录的考点 <b>' + all.length + "</b> 条</span><span>整卷命中 <b>" + zTotal + "</b> 处</span><span>当前显示 <b>" + list.length + "</b> 条</span></div>";
    h += '<div class="toolbar" id="hotSubj"><button class="chip' + (cur === "all" ? " active" : "") + '" data-sub="all">全部科目</button>';
    (K.subjects || []).forEach(function (s) {
      h += '<button class="chip' + (cur === s.id ? " active" : "") + '" data-sub="' + s.id + '">' + esc(s.short || s.name) + "</button>";
    });
    h += "</div>";
    h += '<div class="toolbar"><button class="chip' + (onlyZ ? " active" : "") + '" id="hotOnlyZ">' + (onlyZ ? "只看真题命中" : "真题 + 练习命中") + "</button></div>";

    if (!list.length) {
      h += '<div class="hot-empty">这个科目暂时没有匹配到整卷题目，换成「全部科目」看看。</div>';
    } else {
      var max = list[0].z.length || 1;
      h += '<div class="hot-list">';
      list.slice(0, 60).forEach(function (r, i) {
        var pct = Math.round((r.z.length / max) * 100);
        h += '<button class="hot-row" data-sub="' + r.sub + '" data-ch="' + r.ch + '" data-pi="' + r.pi + '">';
        h += '<span class="hot-no">' + (i + 1) + "</span>";
        h += '<span class="hot-main"><span class="hot-t">' + esc(r.t) + "</span>";
        h += '<span class="hot-meta">' + esc(r.subName) + " · " + esc(r.chName) + (r.z.length ? " · 整卷 " + zLabel(r.z.slice(0, 4)) : "") + (r.q.length ? " · 练习 " + r.q.length + " 题" : "") + "</span>";
        h += '<span class="hot-bar"><i style="width:' + Math.max(4, pct) + '%"></i></span></span>';
        h += '<span class="hot-n">' + r.z.length + "<i>次</i></span>";
        h += "</button>";
      });
      h += "</div>";
      if (list.length > 60) h += '<p class="hot-more">只显示前 60 条，点上面科目可以缩小范围。</p>';
    }
    app.innerHTML = h;

    Array.prototype.forEach.call(app.querySelectorAll("#hotSubj .chip"), function (c) {
      c.onclick = function () { A3.state.hotSubj = c.getAttribute("data-sub"); A3.render(); };
    });
    var bz = document.getElementById("hotOnlyZ");
    if (bz) bz.onclick = function () { A3.state.hotOnlyZ = !onlyZ; A3.render(); };
    Array.prototype.forEach.call(app.querySelectorAll(".hot-row"), function (b) {
      b.onclick = function () {
        A3._jumpPoint(b.getAttribute("data-sub"), b.getAttribute("data-ch"), parseInt(b.getAttribute("data-pi"), 10));
      };
    });
  };
})();