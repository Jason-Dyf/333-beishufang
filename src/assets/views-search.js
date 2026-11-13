/* ============================================================
   333 背书房 · 原文出处搜索（按书 / 版本 / 页码定位）
   数据：window.K3_SRC[bookId] = {id,name,ver,subj,pages:[...]}  懒加载
   ============================================================ */
(function () {
  "use strict";
  var A3 = window.A3;
  if (!A3) return;
  var esc = A3.esc, app = document.getElementById("app");

  var BOOKS = [
    { id: "dagang_ep", file: "s-dagang_ep.js", subj: "edu-principle", label: "大纲全解·教原" },
    { id: "dagang_cn", file: "s-dagang_cn.js", subj: "edu-china", label: "大纲全解·中教史" },
    { id: "dagang_wj", file: "s-dagang_wj.js", subj: "edu-foreign", label: "大纲全解·外教史" },
    { id: "dagang_xl", file: "s-dagang_xl.js", subj: "edu-psych", label: "大纲全解·教心" },
    { id: "dandan", file: "s-dandan.js", label: "丹丹考点" },
    { id: "dandan_supp", file: "s-dandan_supp.js", label: "丹丹补充" },
    { id: "dongqing200", file: "s-dongqing200.js", label: "冬青200题" },
    { id: "dongqing70", file: "s-dongqing70.js", label: "材料题70考点" },
    { id: "q1200_ti", drill: 1, file: "s-q1200_ti.js", label: "1200题·题目册" },
    { id: "q1200_jie", drill: 1, file: "s-q1200_jie.js", label: "1200题·解析册" },
    { id: "dd_ep_ti", drill: 1, file: "s-dd_ep_ti.js", subj: "edu-principle", label: "1000题·教原" },
    { id: "dd_cn_ti", drill: 1, file: "s-dd_cn_ti.js", subj: "edu-china", label: "1000题·中教史" },
    { id: "dd_wj_ti", drill: 1, file: "s-dd_wj_ti.js", subj: "edu-foreign", label: "1000题·外教史" },
    { id: "dd_xl_ti", drill: 1, file: "s-dd_xl_ti.js", subj: "edu-psych", label: "1000题·教心" },
    { id: "dd_ep_jie", drill: 1, file: "s-dd_ep_jie.js", subj: "edu-principle", label: "1000题解析·教原" },
    { id: "dd_cn_jie", drill: 1, file: "s-dd_cn_jie.js", subj: "edu-china", label: "1000题解析·中教史" },
    { id: "dd_wj_jie", drill: 1, file: "s-dd_wj_jie.js", subj: "edu-foreign", label: "1000题解析·外教史" },
    { id: "dd_xl_jie", drill: 1, file: "s-dd_xl_jie.js", subj: "edu-psych", label: "1000题解析·教心" },
    { id: "kc_ti", drill: 1, file: "s-kc_ti.js", label: "凯程题库·试题册" },
    { id: "kc_jie", drill: 1, file: "s-kc_jie.js", label: "凯程题库·解析册" },
    { id: "kaodian", drill: 1, file: "s-kaodian.js", label: "选择题考点清单" },
    { id: "bills", file: "s-bills.js", label: "外教法案表" }
  ];
  var CORE = ["dandan", "dagang_ep", "dagang_cn", "dagang_wj", "dagang_xl"];
  var loaded = {}, loading = {}, failed = {};

  var SUBJCN = {};
  ((A3.K && A3.K.subjects) || []).forEach(function (s) { SUBJCN[s.id] = s.name; });

  function metaOf(id) { return BOOKS.filter(function (b) { return b.id === id; })[0] || null; }

  function ensureBook(id, cb) {
    window.K3_SRC = window.K3_SRC || {};
    if (window.K3_SRC[id]) {
      loaded[id] = 1;
      return cb && cb();
    }
    var jtag = document.getElementById("src-json-" + id);
    if (jtag) {
      try {
        window.K3_SRC[id] = JSON.parse(jtag.textContent);
        loaded[id] = 1;
        return cb && cb();
      } catch (e) {
        if (window.console) console.warn("src json parse failed", id, e);
      }
    }
    if (failed[id]) return cb && cb();
    if (loading[id]) { loading[id].push(cb); return; }
    loading[id] = [cb];
    var meta = metaOf(id);
    if (!meta) return;
    var s = document.createElement("script");
    s.src = "assets/data/src/" + meta.file;
    s.onload = s.onerror = function () {
      if (!window.K3_SRC[id]) failed[id] = 1;
      loaded[id] = 1;
      (loading[id] || []).forEach(function (f) { if (f) f(); });
      loading[id] = [];
      if (S.onProgress) S.onProgress();
    };
    document.head.appendChild(s);
  }

  function ensureCore(done) {
    var n = 0;
    CORE.forEach(function (id) { ensureBook(id, function () { n++; if (done && n === CORE.length) done(); }); });
  }

  function ensureAll(done) {
    var n = 0;
    BOOKS.forEach(function (b) {
      ensureBook(b.id, function () { n++; if (done && n === BOOKS.length) done(); });
    });
  }

  var S = { q: "", book: "all", drill: false, expanded: {}, focus: null, onProgress: null };

  function subjLabel(b, page) {
    if (b.subj && SUBJCN[b.subj]) return SUBJCN[b.subj];
    if (b.id === "dandan") {
      if (page <= 70) return "教育学原理";
      if (page <= 140) return "中国教育史";
      if (page <= 199) return "外国教育史";
      return "教育心理学";
    }
    return "";
  }

  function highlight(text, terms) {
    var out = esc(text);
    terms.forEach(function (t) {
      if (!t) return;
      var re = new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      out = out.replace(re, function (m) { return "<mark>" + m + "</mark>"; });
    });
    return out;
  }

  function snippet(text, terms, len) {
    len = len || 100;
    var pos = -1;
    for (var i = 0; i < terms.length; i++) {
      var p = text.indexOf(terms[i]);
      if (p >= 0 && (pos < 0 || p < pos)) pos = p;
    }
    if (pos < 0) pos = 0;
    var start = Math.max(0, pos - 30);
    var s = text.slice(start, start + len * 2);
    return (start > 0 ? "…" : "") + s + (start + len * 2 < text.length ? "…" : "");
  }

  /* 同义词扩展：壬戌学制 ↔ 六三三学制/新学制，杜威 ↔ 实用主义教育 … */
  function synGroups(q) {
    if (window.A3 && window.A3.synGroups) return window.A3.synGroups(q);
    return q.split(/[\s，,、]+/).filter(Boolean).map(function (t) { return [t]; });
  }
  function synHit(text, groups) {
    if (window.A3 && window.A3.synHit) return window.A3.synHit(text, groups);
    var low = text.toLowerCase();
    return groups.every(function (g) { return g.some(function (w) { return low.indexOf(String(w).toLowerCase()) > -1; }); });
  }

  function search() {
    var q = S.q.trim();
    if (q.length < 2) return [];
    var groups = synGroups(q);
    var terms = [];
    groups.forEach(function (g) { g.forEach(function (w) { if (terms.indexOf(w) < 0) terms.push(w); }); });
    var hits = [];
    var ids = S.book === "all"
      ? BOOKS.filter(function (b) { return S.drill || !b.drill; }).map(function (b) { return b.id; })
      : [S.book];
    ids.forEach(function (id) {
      var b = (window.K3_SRC || {})[id];
      if (!b) return;
      var pages = b.pages || [];
      for (var p = 1; p < pages.length; p++) {
        var t = pages[p];
        if (!t) continue;
        if (!synHit(t, groups)) continue;
        hits.push({ book: b, page: p, text: t, terms: terms });
      }
    });
    return hits;
  }

  function renderFocus(box) {
    var f = S.focus, b = (window.K3_SRC || {})[f.bid];
    if (!b) {
      box.innerHTML = '<div class="qempty">正在载入《' + esc((metaOf(f.bid) || {}).label || f.bid) + '》…</div>';
      ensureBook(f.bid, function () { renderFocus(box); });
      return;
    }
    var text = (b.pages || [])[f.page] || "";
    var sl = subjLabel(b, f.page);
    var h = '<div class="srch-focus"><div class="srch-focus-head">📍 考点出处' +
      (f.title ? "　<span class=\"sf-title\">" + esc(f.title) + "</span>" : "") + "</div>";
    h += '<div class="sh-src"><span class="sh-page">P' + f.page + "</span><b>" + esc(b.name) + "</b><span>" +
      esc(b.ver) + " · 第 " + f.page + " 页" + (sl ? " · " + esc(sl) : "") + "</span></div>";
    h += '<div class="sh-text" style="max-height:none">' + esc(text || "（这一页没有识别到文字）") + "</div>";
    h += '<div class="srch-focus-foot">想找别的内容？在上面的输入框里搜关键词，会给「书名 · 版本 · 页码」。</div></div>';
    box.innerHTML = h;
  }

  function renderResults(hits) {
    var box = document.getElementById("srchResults");
    if (!box) return;
    if (S.focus && !S.q.trim()) { renderFocus(box); return; }
    if (!S.q.trim() || S.q.trim().length < 2) {
      var HOT = ["癸卯学制", "六艺", "福斯特法案", "最近发展区", "夸美纽斯", "壬戌学制", "五育", "终身教育"];
      var hh = '<div class="srch-empty"><div class="se-title">🔎 直接搜一个知识点</div>' +
        '<div class="se-sub">结果会标出它<b>在哪本书、哪个版本、第几页</b>，点一下就能看整页原文。</div>' +
        '<div class="se-hot"><span>热门：</span>';
      HOT.forEach(function (t) { hh += '<button class="chip" data-hot="' + esc(t) + '">' + esc(t) + "</button>"; });
      hh += '</div></div>';
      box.innerHTML = hh;
      Array.prototype.forEach.call(box.querySelectorAll("[data-hot]"), function (b) {
        b.addEventListener("click", function () {
          var t = b.getAttribute("data-hot");
          var i = document.getElementById("srchInput");
          S.focus = null; S.q = t;
          if (i) i.value = t;
          S.last = search();
          renderResults(S.last);
        });
      });
      return;
    }
    if (!hits.length) {
      box.innerHTML = '<div class="qempty">没有在教材原文里找到「' + esc(S.q) + '」<br><span style="font-size:12.5px">换个更短的关键词试试，比如只搜「癸卯」或「福斯特」。</span></div>';
      return;
    }
    var order = {};
    BOOKS.forEach(function (b, i) { order[b.id] = i; });
    var byBook = {};
    hits.forEach(function (h) { (byBook[h.book.id] = byBook[h.book.id] || []).push(h); });
    var ids = Object.keys(byBook).sort(function (a, b) { return (order[a] || 99) - (order[b] || 99); });
    var h = '<div style="font-size:13px;color:var(--ink-2);margin:10px 0 2px">共 <b>' + hits.length +
      "</b> 处，出自 <b>" + ids.length + "</b> 本书</div>";
    ids.forEach(function (bid) {
      var list = byBook[bid], b = list[0].book;
      h += '<div class="section-title" style="font-size:15px;margin:16px 0 8px">📖 ' + esc(b.name) +
        ' <span class="badge">' + esc(b.ver) + " · " + list.length + " 处</span></div>";
      list.slice(0, 12).forEach(function (x) {
        var key = bid + ":" + x.page;
        var open = S.expanded[key];
        var sl = subjLabel(b, x.page);
        h += '<div class="srch-hit" data-key="' + esc(key) + '">';
        h += '<div class="sh-src"><span class="sh-page">P' + x.page + "</span><b>" + esc(b.name) +
          "</b><span>" + esc(b.ver) + " · 第 " + x.page + " 页" + (sl ? " · " + esc(sl) : "") + "</span></div>";
        h += '<div class="sh-text">' + highlight(open ? x.text : snippet(x.text, x.terms), x.terms) + "</div>";
        if (x.text.length > 200) h += '<div class="sh-more">' + (open ? "收起" : "展开整页原文") + "</div>";
        h += "</div>";
      });
      if (list.length > 12) h += '<div class="sh-tip">仅显示前 12 处，可加关键词缩小范围</div>';
    });
    box.innerHTML = h;
    Array.prototype.forEach.call(box.querySelectorAll(".srch-hit"), function (el) {
      el.addEventListener("click", function () {
        var k = el.getAttribute("data-key");
        S.expanded[k] = !S.expanded[k];
        renderResults(S.last || []);
      });
    });
  }

  var timer = null;
  function doSearch() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      var hits = search();
      S.last = hits;
      renderResults(hits);
    }, 120);
  }

  function bookChips() {
    var box = document.getElementById("srchBooks");
    if (!box) return;
    var h = '<button class="chip' + (S.book === "all" ? " active" : "") + '" data-book="all">全部书籍</button>';
    h += '<button class="chip' + (S.drill ? " active" : "") + '" data-drill="1">' + (S.drill ? "含题册 ✓" : "只搜教材") + "</button>";
    BOOKS.forEach(function (b) {
      var meta = (window.K3_SRC || {})[b.id];
      h += '<button class="chip' + (S.book === b.id ? " active" : "") + (meta ? "" : " dim") + (b.drill ? " drill" : "") +
        '" data-book="' + esc(b.id) + '">' + (meta ? "" : "＋") + esc(meta ? meta.name : b.label) + "</button>";
    });
    box.innerHTML = h;
    var dch = box.querySelector("[data-drill]");
    if (dch) dch.addEventListener("click", function () {
      S.drill = !S.drill;
      bookChips();
      if (S.drill) ensureAll(function () { bookChips(); loadBar(); doSearch(); });
      else doSearch();
    });
    Array.prototype.forEach.call(box.querySelectorAll("[data-book]"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-book");
        if (id === "all") {
          S.book = "all";
          bookChips();
          doSearch();
          ensureCore(function () { bookChips(); loadBar(); doSearch(); });
          return;
        }
        if (!(window.K3_SRC || {})[id]) {
          b.textContent = "载入中…";
          ensureBook(id, function () { S.book = id; bookChips(); loadBar(); doSearch(); });
          return;
        }
        S.book = id;
        A3._srchBook = id;
        bookChips();
        doSearch();
      });
    });
  }

  function loadBar() {
    var el = document.getElementById("srchLoad");
    if (!el) return;
    var n = CORE.filter(function (id) { return (window.K3_SRC || {})[id]; }).length;
    var all = BOOKS.filter(function (b) { return (window.K3_SRC || {})[b.id]; }).length;
    if (n >= CORE.length) { el.style.display = "none"; return; }
    el.style.display = "";
    el.innerHTML = '<span class="srch-loading">正在载入常用教材原文 ' + n + " / " + CORE.length +
      " 本…（已可选 " + all + " 本，点书名标签可再载入）</span>";
  }

  A3.views.srch = function () {
    var mf = /^#srch\/([a-z0-9_]+)\/(\d+)$/i.exec(location.hash || "");
    if (mf) { S.focus = { bid: mf[1], page: parseInt(mf[2], 10), title: "" }; S.q = ""; S.last = []; }
    var mh = /^#srch\/(.+)$/.exec(location.hash || "");
    if (mh && !mf) { S.focus = null; try { S.q = decodeURIComponent(mh[1]); } catch (e) { S.q = mh[1]; } }
    /* 刷新回来接着上次的检索 */
    if (!mf && !mh && !S.q && A3._srchQ) { S.q = A3._srchQ; if (A3._srchBook) S.book = A3._srchBook; }
    var h = '<div class="srch">';
    h += '<div class="section-title">🔍 教材原文 · 出处检索</div>';
    h += '<div class="srch-intro">直接搜知识点，返回它<b>在哪本书、哪个版本、第几页</b>，并给原文上下文。</div>';
    h += '<div class="global-search" style="margin:0"><input type="search" id="srchInput" placeholder="搜索教材原文：如 癸卯学制 / 福斯特法案 / 最近发展区" value="' +
      esc(S.q) + '" autocomplete="off"><button id="srchClear" aria-label="清除">✕</button></div>';
    h += '<div id="srchLoad"></div>';
    h += '<div class="srch-books" id="srchBooks"></div>';
    h += '<div id="srchResults"></div>';
    h += "</div>";
    app.innerHTML = h;

    var input = document.getElementById("srchInput");
    var _t = null;
    input.addEventListener("input", function () {
      S.q = input.value;
      A3._srchQ = S.q;
      if (S.q.trim()) S.focus = null;
      if (_t) clearTimeout(_t);
      _t = setTimeout(function () { _t = null; doSearch(); }, 160);
    });
    document.getElementById("srchClear").addEventListener("click", function () {
      input.value = ""; S.q = ""; S.last = []; S.focus = null; renderResults([]); input.focus();
    });
    if (!S.q) input.focus();

    S.onProgress = function () { bookChips(); loadBar(); doSearch(); };
    bookChips();
    loadBar();
    renderResults(search());
    ensureCore(function () { bookChips(); loadBar(); doSearch(); loadRest(); });
  };

  /* 核心 5 本先到，其余在后台补齐（补齐后自动重跑当前检索） */
  function loadRest() {
    if (A3._allLoaded) { doSearch(); return; }
    A3._allLoaded = 1;
    setTimeout(function () {
      ensureAll(function () { bookChips(); loadBar(); doSearch(); });
    }, 800);
  }

  /* 供全局搜索框调用 */
  A3.searchSource = function (q) {
    S.q = q; A3._srchQ = q; S.expanded = {}; S.book = "all"; S.focus = null;
    A3.go("srch");
    setTimeout(function () {
      var i = document.getElementById("srchInput");
      if (i) i.value = q;
      ensureCore(function () { bookChips(); loadBar(); doSearch(); loadRest(); });
      doSearch();
    }, 60);
  };

  /* 从别处（背书页考点、题目解析）直接跳到「某本书某一页」 */
  A3.openSrc = function (bid, page, title) {
    S.focus = { bid: bid, page: Number(page) || 1, title: title || "" };
    S.q = "";
    S.last = [];
    try {
      if (location.hash !== "#srch/" + bid + "/" + S.focus.page) {
        location.hash = "srch/" + bid + "/" + S.focus.page;
      }
    } catch (e) {}
    A3.go("srch");
    setTimeout(function () {
      var i = document.getElementById("srchInput");
      if (i) i.value = "";
      bookChips();
      loadBar();
      var box0 = document.getElementById("srchResults");
      if (box0 && !(window.K3_SRC || {})[bid]) {
        box0.innerHTML = '<div class="srch-loading">📖 正在打开《' + (S.focus.title || bid) + "》第 " + S.focus.page + " 页…</div>";
      }
      ensureBook(bid, function () {
        var box = document.getElementById("srchResults");
        if (box) renderFocus(box);
      });
    }, 60);
  };

  /* 深链 #srch/<book>/<page>：书还没载入时先拉书 */
  if (S.focus && !(window.K3_SRC || {})[S.focus.bid]) {
    var _b = document.getElementById("srchResults");
    if (_b && !S.q.trim()) _b.innerHTML = '<div class="srch-loading">📖 正在打开第 ' + S.focus.page + " 页…</div>";
    ensureBook(S.focus.bid, function () {
      var bb = document.getElementById("srchResults");
      if (bb) renderFocus(bb);
    });
  }

  /* 预加载：页面空闲后先载入最常查的三本 */
  window.addEventListener("load", function () {
    setTimeout(function () { ensureBook("dagang_ep"); }, 1200);
    setTimeout(function () { ensureBook("dandan"); }, 2000);
    setTimeout(function () { ensureBook("dagang_cn"); }, 2800);
  });
})();