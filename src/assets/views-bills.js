/* 外教史 59 法案：记忆表格 / 选择题 / 自测卡 */
(function () {
  "use strict";
  var A3 = window.A3;
  var K = A3.K;
  var esc = A3.esc, md = A3.md, state = A3.state, app = document.getElementById("app");

  var COUNTRY_FLAG = {
    "英国": "英", "法国": "法", "德国": "德", "美国": "美", "俄国": "俄", "日本": "日", "苏联": "苏"
  };

  /* ---------------- 法案总表 ---------------- */
  A3.views.bills = function () {
    var bill = K.bills || { countries: [] };
    var countries = bill.countries || [];
    var total = 0, starTotal = 0;
    countries.forEach(function (c) {
      total += c.items.length;
      c.items.forEach(function (b) { if (b.star) starTotal++; });
    });

    var html = "";
    html += '<section class="hero"><h2>📜 外教史 59 个法案 · 记忆表格</h2>';
    html += "<p>" + esc(bill.intro || "按国别拆开背：先记「哪国 + 哪年 + 什么法」，再记内容三条，最后记影响一句。★ 是可以出论述题的点（要背要点 + 关键词，能连词成句）；× 是选择题最爱挖的坑。") + "</p></section>";

    html += '<div class="stat-row" style="grid-template-columns:repeat(4,1fr)">';
    html += '<div class="stat"><b>' + total + "</b><span>法案总数</span></div>";
    html += '<div class="stat"><b>' + starTotal + "</b><span>★ 论述点</span></div>";
    html += '<div class="stat"><b>' + countries.length + "</b><span>国家</span></div>";
    html += '<div class="stat"><b>' + (K.billsQuiz || []).length + "</b><span>配套选择题</span></div>";
    html += "</div>";

    html += '<div class="bill-toolbar">';
    html += '<button class="chip ' + (state.billCountry === "all" ? "active" : "") + '" data-bc="all">全部国家</button>';
    countries.forEach(function (c) {
      html += '<button class="chip ' + (state.billCountry === c.id ? "active" : "") + '" data-bc="' + c.id + '">' + esc(c.short || c.name) + " · " + c.items.length + "</button>";
    });
    html += '<button class="chip ' + (state.billStar ? "active" : "") + '" id="billStarOnly">★ 只看论述点</button>';
    html += '<button class="chip ' + (state.billOpenAll ? "active" : "") + '" id="billOpenAll">↕ 全部展开</button>';
    html += "</div>";

    countries.forEach(function (c) {
      if (state.billCountry !== "all" && state.billCountry !== c.id) return;
      var items = c.items.filter(function (b) { return !state.billStar || b.star; });
      if (!items.length) return;
      var open = state.billOpenAll || state.billOpen[c.id];
      html += '<div class="bill-country ' + (open ? "open" : "") + '" data-bcc="' + c.id + '">';
      html += '<div class="bill-country-head"><span class="flag">' + esc(COUNTRY_FLAG[c.name] || c.name.charAt(0)) + "</span>";
      html += "<h3>" + esc(c.name) + "</h3><span class=\"cnt\">" + items.length + " 条</span><span class=\"arrow\">▶</span></div>";
      html += '<div class="bill-country-body">';
      items.forEach(function (b) {
        html += '<div class="bill-row">';
        html += '<div class="bill-name">《' + esc(b.name) + "》" + (b.star ? '<span class="star">★</span>' : "");
        if (b.year) html += '<div class="yr">' + esc(b.year) + "</div>";
        if (b.stage) html += '<div class="yr" style="background:#f1f4f3;color:#5b6577">' + esc(b.stage) + "</div>";
        html += "</div>";
        html += '<div class="bill-body">';
        if (b.content && b.content.length) html += "<p><span class=\"lbl\">内容</span>" + b.content.map(function (x) { return md(x); }).join("<br>") + "</p>";
        if (b.impact && b.impact.length) html += '<p class="impact"><span class="lbl">影响</span>' + b.impact.map(function (x) { return md(x); }).join("<br>") + "</p>";
        if (b.warn && b.warn.length) html += '<p class="warn"><span class="lbl">易错</span>' + b.warn.map(function (x) { return md(x); }).join("<br>") + "</p>";
        if (b.mnemo) html += '<p class="mnemo"><span class="lbl">口诀</span>' + md(b.mnemo) + "</p>";
        html += "</div></div>";
      });
      html += "</div></div>";
    });

    html += '<div class="pager-tools"><a class="ghost-btn" data-go="billsquiz">✅ 去做对应选择题</a><a class="ghost-btn" data-go="billsflash">🃏 法案自测卡</a><a class="ghost-btn" data-go="billsdrill">✍️ 年份/国别 速记</a></div>';

    app.innerHTML = html;
    A3.bindGo();

    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-bc]"), function (b) {
      b.addEventListener("click", function () { state.billCountry = b.getAttribute("data-bc"); A3.views.bills(); });
    });
    var so = document.getElementById("billStarOnly");
    if (so) so.addEventListener("click", function () { state.billStar = !state.billStar; A3.views.bills(); });
    var oa = document.getElementById("billOpenAll");
    if (oa) oa.addEventListener("click", function () { state.billOpenAll = !state.billOpenAll; A3.views.bills(); });
    Array.prototype.forEach.call(app.querySelectorAll(".bill-country-head"), function (h) {
      h.addEventListener("click", function () {
        var box = h.parentNode;
        var id = box.getAttribute("data-bcc");
        box.classList.toggle("open");
        state.billOpen[id] = box.classList.contains("open");
      });
    });
  };

  /* ---------------- 法案选择题 ---------------- */
  function ctryName(id) {
    var arr = (K.bills && K.bills.countries) || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i].name;
    return "";
  }
  function ctryChips(active, attr) {
    var arr = (K.bills && K.bills.countries) || [];
    var h = '<div class="chips-row bill-ctry">';
    h += '<button class="chip ' + (active === "all" ? "active" : "") + '" ' + attr + '="all">全部</button>';
    arr.forEach(function (c) {
      h += '<button class="chip ' + (active === c.id ? "active" : "") + '" ' + attr + '="' + c.id + '">' +
        esc(c.short || c.name) + "</button>";
    });
    return h + "</div>";
  }

  A3.views.billsquiz = function () {
    var cur = state.billQuizCountry || "all";
    var want = cur === "all" ? "" : ctryName(cur);
    var pool = (K.billsQuiz || []).filter(function (q) { return !want || q.tag === want; });
    var qs = state.quiz;
    if (!qs) {
      qs = state.quiz = { order: A3.shuffle(pool.map(function (q, i) { return i; })), idx: 0, picked: null, right: 0, wrongList: [] };
    }
    if (!pool.length) { app.innerHTML = '<div class="empty">题库尚未载入。</div>'; return; }
    if (qs.idx >= qs.order.length) {
      var stats = readQuiz();
      stats.done += qs.order.length; stats.right += qs.right;
      writeQuiz(stats);
      app.innerHTML = '<section class="hero"><h2>🎉 本科目刷完</h2><p>本轮 ' + qs.order.length + " 题，答对 " + qs.right + " 题，正确率 " + Math.round(qs.right / qs.order.length * 100) + "%。错题：" + (qs.wrongList.length ? qs.wrongList.join("、") : "无") + "。</p></section>" +
        '<div class="quiz-actions"><button class="big-btn" id="quizAgain" style="width:auto;padding:12px 22px">再来一轮</button>' +
        '<a class="ghost-btn" data-go="bills" style="margin-top:0">回法案表格复习</a></div>';
      A3.bindGo();
      state.quiz = null;
      document.getElementById("quizAgain").addEventListener("click", function () { A3.views.billsquiz(); });
      return;
    }

    var q = pool[qs.order[qs.idx]];
    var html = '<div class="quiz-shell">';
    html += ctryChips(cur, "data-qc");
    html += '<div class="quiz-prog">第 ' + (qs.idx + 1) + " / " + qs.order.length + " 题 · 本卷已答对 " + qs.right + " 题" + (q.tag && q.q.indexOf(q.tag) !== 0 ? " · " + esc(q.tag) : "") + "</div>";
    html += '<div class="quiz-q">' + md(q.q) + "</div>";
    html += '<div class="quiz-opts">';
    var keys = ["A", "B", "C", "D", "E", "F"];
    q.opts.forEach(function (o, i) {
      var cls = "quiz-opt";
      if (qs.picked != null) {
        if (i === q.ans) cls += " right";
        else if (i === qs.picked) cls += " wrong";
      }
      html += '<button class="' + cls + '" data-i="' + i + '"><span class="key">' + keys[i] + "</span>" + md(o) + "</button>";
    });
    html += "</div>";
    if (qs.picked != null) {
      html += '<div class="quiz-exp"><b>' + (qs.picked === q.ans ? "✅ 答对" : "❌ 答错") + "，正确答案 " + keys[q.ans] + "</b><br>" + md(q.exp || "") + "</div>";
      html += '<div class="quiz-actions"><button class="big-btn" id="quizNext" style="width:auto;padding:12px 26px">' + (qs.idx + 1 < qs.order.length ? "下一题 →" : "看结果 →") + "</button></div>";
    }
    html += "</div>";
    app.innerHTML = html;

    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-qc]"), function (b) {
      b.addEventListener("click", function () {
        state.billQuizCountry = b.getAttribute("data-qc");
        state.quiz = null;
        A3.views.billsquiz();
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".quiz-opt"), function (b) {
      b.addEventListener("click", function () {
        if (qs.picked != null) return;
        var i = +b.getAttribute("data-i");
        qs.picked = i;
        if (i === q.ans) qs.right++;
        else qs.wrongList.push((q.tag ? q.tag + " " : "") + "#" + (qs.idx + 1));
        A3.views.billsquiz();
      });
    });
    var nx = document.getElementById("quizNext");
    if (nx) nx.addEventListener("click", function () {
      qs.idx++; qs.picked = null;
      A3.views.billsquiz();
    });
  };

  function readQuiz() {
    try { return JSON.parse(localStorage.getItem("k3_quiz_stats") || '{"done":0,"right":0}'); } catch (e) { return { done: 0, right: 0 }; }
  }
  function writeQuiz(v) { try { localStorage.setItem("k3_quiz_stats", JSON.stringify(v)); } catch (e) {} }

  function joinS(list, sep) {
    return (list || []).map(function (x) {
      return String(x).replace(/[；;。、，,\s]+$/, "");
    }).join(sep);
  }

  /* ---------------- 法案自测卡（正面国家+内容提示 → 背面法案名） ---------------- */
  A3.views.billsflash = function () {
    var mode = state.billFlashMode || "name";  // name: 看内容猜法案名；content: 看法案名背内容
    var fc = state.billFlashCountry || "all";
    var items = [];
    (K.bills.countries || []).forEach(function (c) {
      if (fc !== "all" && c.id !== fc) return;
      c.items.forEach(function (b) {
        if (state.billFlashStar && !b.star) return;
        items.push({ c: c.name, b: b, star: b.star });
      });
    });
    if (!state.billFlashSet || state.billFlashMode !== mode) {
      state.billFlashSet = A3.shuffle(items.slice());
      state.billFlashIdx = 0;
      state.billFlashKnown = 0;
    }
    var set = state.billFlashSet;
    if (!set.length) { app.innerHTML = '<div class="empty">没有符合条件的法案卡。</div>'; return; }
    var cur = set[state.billFlashIdx];
    var b = cur.b;

    var front, back;
    if (mode === "name") {
      front = esc(b.content ? joinS(b.content, "；") : "（无内容）");
      back = "《" + esc(b.name) + "》<br><span class='note'>" + esc(cur.c) + (b.year ? " · " + esc(b.year) : "") + "</span>" +
        (b.impact ? "<br><b>影响：</b>" + md(joinS(b.impact, "；")) : "");
    } else {
      front = "《" + esc(b.name) + "》<br><span class='note'>" + esc(cur.c) + (b.year ? " · " + esc(b.year) : "") + (b.stage ? " · " + esc(b.stage) : "") + "</span>";
      back = "<b>内容：</b>" + md(joinS(b.content, "<br>")) + (b.impact ? "<br><b>影响：</b>" + md(joinS(b.impact, "<br>")) : "") + (b.warn ? "<br><b>易错：</b>" + md(joinS(b.warn, "<br>")) : "");
    }

    var html = '<section class="hero fc-hero"><h2>🃏 法案自测卡</h2>';
    html += "<p>两种背法：<b>看内容猜法案</b>（选择题考法）、<b>看法案背内容</b>（简答/论述考法）。先自己说一遍，再翻面。</p></section>";
    html += '<div class="toolbar">';
    html += '<button class="chip ' + (mode === "name" ? "active" : "") + '" data-bm="name">看内容 → 猜法案名</button>';
    html += '<button class="chip ' + (mode === "content" ? "active" : "") + '" data-bm="content">看法案 → 背内容</button>';
    html += '<button class="chip ' + (state.billFlashStar ? "active" : "") + '" id="bfStar">★ 只背论述点</button>';
    html += "</div>";
    html += ctryChips(fc, "data-fc");
    html += '<div class="fc-progress">第 ' + (state.billFlashIdx + 1) + " / " + set.length + " 张 · 已认识 " + state.billFlashKnown + " 张</div>";
    html += '<div class="fc-card" id="fcCard" style="--c:#c08a2e">';
    html += '<div class="fc-tag">外教法案' + (cur.star ? " · ★ 论述点" : " · 选择题点") + "</div>";
    html += '<div class="fc-front" id="fcFront">' + front + "</div>";
    html += '<div class="fc-back" id="fcBack" style="display:none">' + back + "</div>";
    html += '<div class="fc-flip-hint" id="fcHint">👆 点击卡片翻面</div></div>';
    html += '<div class="fc-actions"><button class="ghost-btn" id="bfPrev">◀ 上一张</button>';
    html += '<button class="big-btn" id="bfKnown" style="width:auto;padding:12px 22px">✅ 背下来了</button>';
    html += '<button class="big-btn alt" id="bfUnknown" style="width:auto;padding:12px 22px">❌ 再背一遍</button>';
    html += '<button class="ghost-btn" id="bfNext">下一张 ▶</button></div>';
    app.innerHTML = html;

    var card = document.getElementById("fcCard");
    function flip() {
      var f = document.getElementById("fcFront"), bk = document.getElementById("fcBack"), h = document.getElementById("fcHint");
      var showing = f.style.display !== "none";
      f.style.display = showing ? "none" : "block";
      bk.style.display = showing ? "block" : "none";
      h.textContent = showing ? "👀 这是答案，点卡片返回" : "👆 点击卡片翻面";
    }
    card.addEventListener("click", flip);
    function step(d) {
      state.billFlashIdx = (state.billFlashIdx + d + set.length) % set.length;
      A3.views.billsflash();
    }
    document.getElementById("bfPrev").addEventListener("click", function () { step(-1); });
    document.getElementById("bfNext").addEventListener("click", function () { step(1); });
    document.getElementById("bfKnown").addEventListener("click", function () { state.billFlashKnown++; step(1); });
    document.getElementById("bfUnknown").addEventListener("click", function () { flip(); });
    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-bm]"), function (c) {
      c.addEventListener("click", function () { state.billFlashMode = c.getAttribute("data-bm"); state.billFlashSet = null; state.billFlashIdx = 0; state.billFlashKnown = 0; A3.views.billsflash(); });
    });
    var bs = document.getElementById("bfStar");
    if (bs) bs.addEventListener("click", function () { state.billFlashStar = !state.billFlashStar; state.billFlashSet = null; state.billFlashIdx = 0; A3.views.billsflash(); });
    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-fc]"), function (b) {
      b.addEventListener("click", function () {
        state.billFlashCountry = b.getAttribute("data-fc");
        state.billFlashSet = null; state.billFlashIdx = 0; state.billFlashKnown = 0;
        A3.views.billsflash();
      });
    });
  };

  /* ---------------- 年份·国别速记（排序填空题） ---------------- */
  A3.views.billsdrill = function () {
    var dc = state.billDrillCountry || "all";
    var all = [];
    (K.bills.countries || []).forEach(function (c) {
      if (dc !== "all" && c.id !== dc) return;
      c.items.forEach(function (b) { all.push({ c: c.name, n: b.name, y: b.year || "", s: b.stage || "", key: b.content ? b.content[0] : "" }); });
    });
    all = A3.shuffle(all).slice(0, 12);
    var html = '<section class="hero"><h2>✍️ 年份 / 国别 速记</h2>';
    html += "<p>给出法案名，先在心里答「哪国、哪年、什么阶段」，再点开核对。答错就回表格再看一遍那一条。</p></section>";
    html += ctryChips(dc, "data-dc");
    html += '<div class="q-list">';
    all.forEach(function (x, i) {
      html += '<div class="qcard" data-i="' + i + '">';
      html += '<div class="qcard-head"><div class="qcard-no">' + (i + 1) + '</div><div class="qcard-title">《' + esc(x.n) + '》</div><div class="qcard-open">点开看答案 ▾</div></div>';
      html += '<div class="qcard-body"><div class="qcard-sec"><div class="score"><span>国别：' + esc(x.c) + "</span><span>年份：" + esc(x.y || "—") + "</span><span>阶段：" + esc(x.s || "—") + "</span></div>";
      if (x.key) html += '<div class="note" style="margin-top:6px">内容首条：' + md(x.key) + "</div>";
      html += "</div></div></div>";
    });
    html += "</div>";
    app.innerHTML = html;
    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-dc]"), function (b) {
      b.addEventListener("click", function () {
        state.billDrillCountry = b.getAttribute("data-dc");
        A3.views.billsdrill();
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".qcard"), function (c) {
      c.querySelector(".qcard-head").addEventListener("click", function () { c.classList.toggle("open"); });
    });
  };
})();