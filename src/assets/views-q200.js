/* 冬青 200 题 / 材料题 70 考点 / 大题思路 / 踩分点 */
(function () {
  "use strict";
  var A3 = window.A3;
  var K = A3.K;
  var esc = A3.esc, md = A3.md, state = A3.state, app = document.getElementById("app");

  function chipRow(id, list, cur, labelAll, allText) {
    var h = '<div class="toolbar" id="' + id + '">';
    h += '<button class="chip ' + (cur === "all" ? "active" : "") + '" data-f="all">' + esc(allText || "全部") + "</button>";
    list.forEach(function (x) {
      h += '<button class="chip ' + (cur === x.id ? "active" : "") + '" data-f="' + x.id + '">' + esc(x.short || x.name) + (x.n != null ? " · " + x.n : "") + "</button>";
    });
    h += "</div>";
    return h;
  }

  function filterBar(viewKey, placeholder) {
    return '<div class="filter-bar"><input type="search" id="' + viewKey + 'Search" class="ks-input" placeholder="' + esc(placeholder) + '" value="' + esc(state[viewKey + "Q"] || "") + '">' +
      '<span class="filter-count" id="' + viewKey + 'Count"></span></div>';
  }

  function bindSearch(viewKey, rerender) {
    var inp = document.getElementById(viewKey + "Search");
    if (!inp) return;
    inp.addEventListener("input", function () {
      state[viewKey + "Q"] = inp.value.trim();
      rerender(true);
    });
  }

  /* ---------------- 冬青 200 题 ---------------- */
  /* 30 秒速写卡：骨架 + 关键词，考前快速过一遍 */
  function quickCard(it) {
    var sk = (it.frame || []).map(function (x) {
      return String(x).replace(/[（(][^)）]*[)）]/g, "").replace(/^[一二三四五六七八九十\d]+[.、．]/g, "").trim();
    }).filter(Boolean).slice(0, 6);
    var kws = [];
    (it.pts || []).forEach(function (p) {
      var m = String(p).match(/\{\{([^}]+)\}\}/g) || [];
      m.forEach(function (x) {
        var t = x.replace(/[{}]/g, "").trim();
        if (t.length >= 2 && kws.indexOf(t) < 0) kws.push(t);
      });
    });
    if (!kws.length) {
      (it.pts || []).slice(0, 6).forEach(function (p) {
        var t = String(p).replace(/^【[^】]*】\s*/, "").replace(/[（(][^)）]*[)）]/g, "").trim();
        /* 取到第一个冒号/句号/分号为止，作为采分点的“抓手” */
        var cut = t.split(/[：:。；;]/)[0].trim();
        if (cut.length > 18) cut = cut.slice(0, 18) + "…";
        if (cut && kws.indexOf(cut) < 0) kws.push(cut);
      });
    }
    if (!sk.length && !kws.length) return "";
    var h = '<div class="qcard-sec qw-sec"><div class="h">⚡ 30 秒速写卡<span class="qw-tip">先默骨架，再补关键词</span></div><div class="qw-body">';
    if (sk.length) h += '<div class="qw-line"><b>骨架</b><span>' + sk.map(esc).join(" → ") +
      (typeof it.score === "number" ? '<i class="qw-score">共 ' + it.score + " 分</i>" : "") + "</span></div>";
    if (kws.length) h += '<div class="qw-line"><b>关键词</b><span>' + kws.slice(0, 8).map(esc).join(" · ") + "</span></div>";
    h += "</div></div>";
    return h;
  }

  A3.views.q200 = function () {
    var data = K.q200 || { subjects: [] };
    var subs = data.subjects || [];
    var q = state.q200Q || "";
    var f = state.q200Subj || "all";
    var onlyStar = state.q200Star;
    var total = 0, starN = 0;
    subs.forEach(function (s) { total += s.items.length; s.items.forEach(function (i) { if (i.star) starN++; }); });

    var subjList = subs.map(function (s) { return { id: s.id, name: s.name, short: s.short, n: s.items.length }; });
    var html = '<section class="hero"><h2>🗂 冬青 200 题 · 大题卡片</h2>';
    html += "<p>每题三块：<b>答题框架</b>（先搭骨架，考场照此分点）→ <b>要点</b>（能写上去的采分词句）→ <b>注意</b>（易混、易漏、评分规矩）。点标题展开，合上看题干先自述一遍再对答案。</p></section>";

    html += '<div class="stat-row" style="grid-template-columns:repeat(4,1fr)">';
    html += '<div class="stat"><b>' + total + "</b><span>题目总数</span></div>";
    html += '<div class="stat"><b>' + starN + "</b><span>★ 必刷</span></div>";
    html += '<div class="stat"><b>' + subs.length + "</b><span>科目</span></div>";
    html += '<div class="stat"><b id="q200Shown">-</b><span>当前显示</span></div>';
    html += "</div>";

    html += chipRow("q200Chips", subjList, f, true, "全部科目");
    html += '<div class="toolbar"><button class="chip ' + (onlyStar ? "active" : "") + '" id="q200StarOnly">★ 只看必刷题</button>';
    html += '<button class="chip" id="q200ToggleAll">↕ 展开/收起全部</button></div>';
    html += filterBar("q200", "搜题干关键词：如「德育」「科举」「赫尔巴特」「学习动机」");

    var shown = 0;
    subs.forEach(function (s) {
      if (f !== "all" && f !== s.id) return;
      var items = s.items.filter(function (it) {
        if (onlyStar && !it.star) return false;
        if (q && (it.t + (it.frame || []).join("") + (it.pts || []).join("")).indexOf(q) < 0) return false;
        return true;
      });
      if (!items.length) return;
      shown += items.length;
      html += '<div class="section-title"><h3>' + esc(s.name) + "</h3><span>" + items.length + " 题</span></div>";
      html += '<div class="q-list">';
      items.forEach(function (it) {
        html += '<div class="qcard" data-q="' + esc(s.id + "-" + it.no) + '">';
        html += '<div class="qcard-head"><div class="qcard-no">' + esc(it.no) + "</div>";
        html += '<div class="qcard-title">' + md(it.t) + (it.type ? '<span class="tag">' + esc(it.type) + "</span>" : "") + (it.star ? '<span class="tag must">★必刷</span>' : "") + "</div>";
        html += '<div class="qcard-open">展开 ▾</div></div>';
        html += '<div class="qcard-body">';
        html += quickCard(it);
        if (it.frame && it.frame.length) {
          html += '<div class="qcard-sec"><div class="h">答题框架</div><ol class="frame">';
          it.frame.forEach(function (x) { html += "<li>" + md(x) + "</li>"; });
          html += "</ol></div>";
        }
        if (it.pts && it.pts.length) {
          html += '<div class="qcard-sec"><div class="h">要点</div><ul>';
          it.pts.forEach(function (x) { html += "<li>" + md(x) + "</li>"; });
          html += "</ul></div>";
        }
        if (it.score) {
          html += '<div class="qcard-sec"><div class="h">评分</div><div class="score">';
          it.score.forEach(function (x) { html += "<span>" + md(x) + "</span>"; });
          html += "</div></div>";
        }
        if (it.warn && it.warn.length) {
          html += '<div class="qcard-sec"><div class="h">注意·易错</div><div class="note">';
          it.warn.forEach(function (x) { html += md(x) + "<br>"; });
          html += "</div></div>";
        }
        html += "</div></div>";
      });
      html += "</div>";
      html += '<div class="pager-tools" style="margin-top:14px"><a class="ghost-btn" data-go="method">🧭 先看大题总纲</a><a class="ghost-btn" data-go="scoretips">🎯 踩分点与注意事项</a></div>';
    });
    if (!shown) html += '<div class="empty">没有匹配的题目，换个关键词试试。</div>';

    app.innerHTML = html;
    A3.bindGo();
    var cEl = document.getElementById("q200Count");
    if (cEl) cEl.textContent = "共 " + shown + " 题";
    var sh = document.getElementById("q200Shown");
    if (sh) sh.textContent = shown;

    Array.prototype.forEach.call(app.querySelectorAll("#q200Chips .chip"), function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-f");
        state.q200Subj = (v === "all" || v !== state.q200Subj) ? (v === "all" ? "all" : v) : "all";
        A3.views.q200();
      });
    });
    var so = document.getElementById("q200StarOnly");
    if (so) so.addEventListener("click", function () { state.q200Star = !state.q200Star; A3.views.q200(); });
    var ta = document.getElementById("q200ToggleAll");
    if (ta) ta.addEventListener("click", function () {
      var cards = app.querySelectorAll(".qcard");
      var anyClosed = Array.prototype.some.call(cards, function (c) { return !c.classList.contains("open"); });
      Array.prototype.forEach.call(cards, function (c) { c.classList.toggle("open", anyClosed); });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".qcard"), function (c) {
      c.addEventListener("click", function (ev) { if (ev.target.closest && ev.target.closest("a,button")) return;
        c.classList.toggle("open");
        var lbl = c.querySelector(".qcard-open");
        if (lbl) lbl.textContent = c.classList.contains("open") ? "收起 ▴" : "展开 ▾";
      });
    });
    bindSearch("q200", function () { A3.views.q200(); });
    if (q) { var i2 = document.getElementById("q200Search"); if (i2) { i2.focus(); i2.setSelectionRange(q.length, q.length); } }
  };

  /* ---------------- 材料题 70 考点 ---------------- */
  A3.views.material70 = function () {
    var data = K.material70 || { intro: "", subjects: [] };
    var subs = data.subjects || [];
    var q = state.m70Q || "";
    var f = state.m70Subj || "all";
    var html = '<section class="hero"><h2>🕳 材料题 70 个考点精讲</h2>';
    html += "<p>" + esc(data.intro || "材料题不是「猜材料」，而是「材料落到考点」。每个考点要记住：材料里通常怎么呈现（信号词）→ 对应哪个知识点 → 怎么用要点去接材料。") + "</p></section>";
    html += chipRow("m70Chips", subs.map(function (s) { return { id: s.id, name: s.name, short: s.short, n: s.items.length }; }), f, true, "全部科目");
    html += filterBar("m70", "搜考点：如「私学」「学制」「班主任」「同化顺应」");

    var shown = 0;
    subs.forEach(function (s) {
      if (f !== "all" && f !== s.id) return;
      var items = s.items.filter(function (it) {
        return !q || (it.t + (it.pts || []).join("") + (it.signal || "")).indexOf(q) >= 0;
      });
      if (!items.length) return;
      shown += items.length;
      html += '<div class="section-title"><h3>' + esc(s.name) + "</h3><span>" + items.length + " 个考点</span></div>";
      html += '<div class="q-list">';
      items.forEach(function (it, idx) {
        html += '<div class="qcard" data-q>' + '<div class="qcard-head"><div class="qcard-no">' + (it.no || idx + 1) + "</div>";
        html += '<div class="qcard-title">' + md(it.t) + (it.star ? '<span class="tag must">高频</span>' : "") + "</div>";
        html += '<div class="qcard-open">展开 ▾</div></div><div class="qcard-body">';
        if (it.signal) html += '<div class="qcard-sec"><div class="h">材料信号</div><div class="note">' + md(it.signal) + "</div></div>";
        if (it.pts && it.pts.length) {
          html += '<div class="qcard-sec"><div class="h">对应要点</div><ul>';
          it.pts.forEach(function (x) { html += "<li>" + md(x) + "</li>"; });
          html += "</ul></div>";
        }
        if (it.use) html += '<div class="qcard-sec"><div class="h">怎么接材料</div><div class="note">' + md(it.use) + "</div></div>";
        html += "</div></div>";
      });
      html += "</div>";
    });
    if (!shown) html += '<div class="empty">没有匹配的考点。</div>';
    app.innerHTML = html;
    A3.bindGo();
    Array.prototype.forEach.call(app.querySelectorAll("#m70Chips .chip"), function (b) {
      b.addEventListener("click", function () { state.m70Subj = b.getAttribute("data-f"); A3.views.material70(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".qcard"), function (c) {
      c.addEventListener("click", function (ev) { if (ev.target.closest && ev.target.closest("a,button")) return;
        c.classList.toggle("open");
        var lbl = c.querySelector(".qcard-open");
        if (lbl) lbl.textContent = c.classList.contains("open") ? "收起 ▴" : "展开 ▾";
      });
    });
    bindSearch("m70", function () { A3.views.material70(); });
  };

  /* ---------------- 大题思路 · 总纲 ---------------- */
  A3.views.method = function () {
    var data = K.method || { sections: [] };
    var html = '<section class="hero"><h2>🧭 333 大题思路 · 总纲</h2>';
    html += "<p>" + esc(data.intro || "333 大题拿分靠三件事：结构（阅卷老师一眼看到采分点）、术语（用教材原话，不用大白话）、篇幅（按分给字）。下面先给万能框架，再按题型拆。") + "</p></section>";

    (data.steps || []).length && (html += '<div class="step-grid">');
    (data.steps || []).forEach(function (s, i) {
      html += '<div class="step-card"><div class="n">' + (i + 1) + "</div><h4>" + esc(s.t) + "</h4><p>" + md(s.d) + "</p></div>";
    });
    if ((data.steps || []).length) html += "</div>";

    (data.sections || []).forEach(function (sec) {
      html += '<div class="section-title"><h3>' + esc(sec.title) + "</h3>" + (sec.sub ? "<span>" + esc(sec.sub) + "</span>" : "") + "</div>";
      html += '<div class="mcard">';
      (sec.body || []).forEach(function (p) { html += "<p class=\"lead\">" + md(p) + "</p>"; });
      if (sec.list && sec.list.length) {
        html += "<ul>";
        sec.list.forEach(function (x) { html += "<li>" + md(x) + "</li>"; });
        html += "</ul>";
      }
      if (sec.tpl) {
        html += '<div class="k3-tip" style="white-space:pre-wrap">' + md(sec.tpl) + "</div>";
      }
      html += "</div>";
    });

    html += '<div class="pager-tools"><a class="ghost-btn" data-go="scoretips">🎯 踩分点与注意事项</a><a class="ghost-btn" data-go="q200">🗂 去刷 200 题</a></div>';
    app.innerHTML = html;
    A3.bindGo();
  };

  /* ---------------- 踩分点 · 注意事项 ---------------- */
  A3.views.scoretips = function () {
    var data = K.scoretips || { groups: [] };
    var html = '<section class="hero"><h2>🎯 踩分点 · 注意事项</h2>';
    html += "<p>" + esc(data.intro || "这一页把「怎么被扣分」讲透：阅卷是踩点给分，写对关键词就有分，写满但没点=0 分。") + "</p></section>";

    (data.groups || []).forEach(function (g) {
      html += '<div class="section-title"><h3>' + esc(g.title) + "</h3></div>";
      html += '<div class="mcard"><ol>';
      g.items.forEach(function (it) {
        html += "<li><b>" + md(it.t) + "</b>" + (it.d ? "　" + md(it.d) : "") + "</li>";
      });
      html += "</ol></div>";
    });

    if (data.rules && data.rules.length) {
      html += '<div class="section-title"><h3>评分规矩（背下来少丢 10 分）</h3></div><div class="mcard"><ul>';
      data.rules.forEach(function (x) { html += "<li>" + md(x) + "</li>"; });
      html += "</ul></div>";
    }
    html += '<div class="pager-tools"><a class="ghost-btn" data-go="method">🧭 回大题总纲</a><a class="ghost-btn" data-go="q200">🗂 去刷 200 题</a></div>';
    app.innerHTML = html;
    A3.bindGo();
  };
})();