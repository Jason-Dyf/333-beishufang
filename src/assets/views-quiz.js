/* ============================================================
   333 背书房 · 刷题中心（仿「精研刷题」小程序）
   视图：quiz / quizrun / quizwrong / quizfav / quiznote /
         quizstats / quizsettings / quizmock(复用 quizrun)
   ============================================================ */
(function () {
  "use strict";
  var A3 = window.A3;
  if (!A3) return;
  var esc = A3.esc, md = A3.md, toast = A3.toast, shuffle = A3.shuffle;
  var app = document.getElementById("app");
  var K = A3.K;

  /* ---------------- 数据 ---------------- */
  var QB = K.qbank || { banks: [], questions: [] };
  var QS = QB.questions || [];
  var BMAP = {};
  (QB.banks || []).forEach(function (b) { BMAP[b.id] = b; });
  var QMAP = {};
  QS.forEach(function (q) { QMAP[q.id] = q; });

  /* 章节名索引：subj -> chId -> {name, order} */
  var CH = {};
  (K.subjects || []).forEach(function (s) {
    CH[s.id] = {};
    s.chapters.forEach(function (c, i) { CH[s.id][c.id] = { name: c.name, i: i }; });
  });
  var SUBJ = {};
  (K.subjects || []).forEach(function (s) { SUBJ[s.id] = s; });

  /* 题库章节名索引（回退用）：subj|ch -> chName */
  var QCHN = {};
  QS.forEach(function (q) {
    var k = q.subj + "|" + q.ch;
    if (q.ch && q.chName && !QCHN[k]) QCHN[k] = q.chName;
  });

  function subjName(id) { return (SUBJ[id] || {}).name || "综合"; }
  function subjShort(id) { return (SUBJ[id] || {}).short || "综合"; }
  function chName(subj, ch) {
    var m = CH[subj] && CH[subj][ch];
    if (m) return m.name;
    var qn = QCHN[subj + "|" + ch];
    return qn || (ch || "未分章");
  }

  /* ---------------- 本地状态 ---------------- */
  var KEY = "k3_qbank_v1";
  var DFLT = {
    ans: {},        /* qid -> {ok:1|0, t:ts, n:次数, sel:选中的选项下标} */
    wrong: {},      /* qid -> 1 */
    fav: {},        /* qid -> 1 */
    notes: {},      /* qid -> string */
    runs: [],       /* {t, title, total, right, sec} */
    bank: "all",
    subj: "all",
    set: { order: "seq", showRate: 1, passClear: 0, autoNext: 1, instant: 1, hideSrc: 0 }
  };
  var D = load();
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { d = null; }
    d = d || {};
    var o = JSON.parse(JSON.stringify(DFLT));
    ["ans", "wrong", "fav", "notes"].forEach(function (k) { o[k] = d[k] || {}; });
    o.runs = d.runs || [];
    o.bank = d.bank || "all";
    o.subj = d.subj || "all";
    o.set = Object.assign({}, DFLT.set, d.set || {});
    return o;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {}
  }

  /* ---------------- 统计 ---------------- */
  function inBank(q, bank) { return bank === "all" || q.bank === bank; }
  function listOf(bank, subj) {
    return QS.filter(function (q) {
      return inBank(q, bank) && (subj === "all" || q.subj === subj);
    });
  }
  function rateOf(list) {
    var ans = 0, ok = 0;
    list.forEach(function (q) {
      var a = D.ans[q.id];
      if (a) { ans++; if (a.ok) ok++; }
    });
    return { total: list.length, ans: ans, ok: ok, rate: ans ? Math.round(ok / ans * 1000) / 10 : 0 };
  }
  function bankLabel(id) {
    if (id === "all") return "全部题库";
    return (BMAP[id] || {}).name || id;
  }

  /* ---------------- 会话 ---------------- */
  var S = null;
  function okQ(q) { return q && typeof q.a === "number" && q.a >= 0; }
  function newSession(list, title, opts) {
    list = (list || []).filter(okQ);
    opts = opts || {};
    if (D.set.order === "rand" || opts.random) list = shuffle(list.slice());
    S = {
      queue: list, i: 0, title: title, mode: opts.mock ? "mock" : "practice",
      start: Date.now(), limit: opts.limit ? opts.limit * 60000 : 0, answered: {}, right: 0, wrong: 0, finished: false
    };
    persistSession();
  }

  /* 刷新/切后台回来，把这一套题接着做完 */
  function persistSession() {
    if (!S) return;
    try {
      sessionStorage.setItem("k3_sess_v1", JSON.stringify({
        ids: S.queue.map(function (q) { return q.id; }), i: S.i, title: S.title, mode: S.mode,
        start: S.start, limit: S.limit, answered: S.answered, right: S.right, wrong: S.wrong, finished: !!S.finished
      }));
    } catch (e) {}
  }
  function restoreSession() {
    var raw = null;
    try { raw = sessionStorage.getItem("k3_sess_v1"); } catch (e) { return false; }
    if (!raw) return false;
    try {
      var o = JSON.parse(raw);
      if (!o || !o.ids || !o.ids.length) return false;
      var qs = o.ids.map(function (id) { return QMAP[id]; }).filter(okQ);
      if (!qs.length) return false;
      S = {
        queue: qs, i: Math.max(0, Math.min(o.i || 0, qs.length - 1)), title: o.title || "上次的练习",
        mode: o.mode || "practice", start: o.start || Date.now(), limit: o.limit || 0,
        answered: o.answered || {}, right: o.right || 0, wrong: o.wrong || 0, finished: !!o.finished
      };
      return true;
    } catch (e) { return false; }
  }
  A3._restoreSession = restoreSession;
  function cur() { return S && S.queue[S.i]; }

  /* ---------------- 通用零件 ---------------- */
  function hubStatBar(html) { return html; }

  function progressOf(list) {
    var r = rateOf(list);
    return r;
  }

  function ringPct(r) { return Math.max(0, Math.min(100, r)); }

  function emptyState(text, extra) {
    return '<div class="qempty">' + esc(text) + (extra || "") + "</div>";
  }

  function bankChips() {
    var h = '<div class="q-bankbar"><button class="q-bank-btn" id="qBankBtn">📚 ' + esc(bankLabel(D.bank)) + " ▾</button>" +
      '<span style="font-size:12.5px;color:var(--ink-2)">共 ' + QS.length + " 题</span></div>";
    h += '<div class="q-bank-panel" id="qBankPanel" hidden>';
    var rows = [{ id: "all", name: "全部题库", n: QS.length }].concat((QB.banks || []).map(function (b) {
      return { id: b.id, name: b.name, n: QS.filter(function (q) { return q.bank === b.id; }).length };
    }));
    rows.forEach(function (r) {
      var isEmpty = r.id !== "all" && r.n === 0;
      h += '<button class="q-bank-row' + (D.bank === r.id ? " on" : "") + (isEmpty ? " off" : "") +
        '" data-bank="' + esc(r.id) + '"' + (isEmpty ? " disabled" : "") + ">" +
        '<span class="qb-name">' + esc(r.name) + '</span><span class="qb-meta">' +
        (isEmpty ? "未收录" : r.n + " 题") + "</span></button>";
    });
    h += "</div>";
    return h;
  }

  function subjTabs(active, showAll) {
    var h = '<div class="subj-tabs">';
    if (showAll) h += '<button class="subj-tab' + (active === "all" ? " on" : "") + '" data-subj="all">全部</button>';
    (K.subjects || []).forEach(function (s) {
      h += '<button class="subj-tab' + (active === s.id ? " on" : "") + '" data-subj="' + s.id + '">' + esc(s.name) + "</button>";
    });
    return h + "</div>";
  }

  function bindSubjTabs(cb) {
    Array.prototype.forEach.call(app.querySelectorAll(".subj-tab"), function (b) {
      b.addEventListener("click", function () { cb(b.getAttribute("data-subj")); });
    });
  }

  /* ---------------- 刷题主页 ---------------- */
  A3.views.quiz = function () {
    var all = QS.length;
    var cur = listOf(D.bank, "all");
    var r = rateOf(cur);
    var days = countdownDays();

    var h = '<div class="q-hub">';
    h += '<div class="q-hero">';
    h += '<div class="q-hero-top"><div class="q-hero-title">刷题总览<span>共 ' + r.total + " 道题</span></div>" +
      '<div class="q-countdown">距考试还剩 <b>' + days + "</b> DAY</div></div>";
    h += '<div class="q-hero-body">';
    h += '<div class="q-ring" style="--p:' + ringPct(r.rate) + '"><b>' + (r.ans ? r.rate + "%" : "—") + "</b><i>正确率</i></div>";
    h += '<div class="q-hero-stats">';
    h += '<div class="q-hs"><b>' + r.ok + "</b><span>答对</span></div>";
    h += '<div class="q-hs"><b>' + r.ans + "</b><span>已答</span></div>";
    h += '<div class="q-hs"><b>' + r.total + "</b><span>总题</span></div>";
    h += "</div>";
    h += "</div>";
    h += '<div class="q-bar"><i style="width:' + ringPct(r.rate) + '%"></i></div>';
    h += "</div>";

    /* 八宫格 */
    var cells = [
      ["\ud83d\udcdd", "模考模式", "quizmock", ""],
      ["\ud83c\udfb2", "随机组卷", "quizbuild", ""],
      ["\ud83d\udcd1", "历年真题", "zhenti", ""],
      ["\ud83d\udcca", "刷题排行", "quizstats", ""],
      ["\ud83d\udcd5", "我的错题", "quizwrong", Object.keys(D.wrong).length || ""],
      ["\u2b50", "我的收藏", "quizfav", Object.keys(D.fav).length || ""],
      ["\u270f\ufe0f", "我的笔记", "quiznote", Object.keys(D.notes).length || ""],
      ["\u2699\ufe0f", "题库设置", "quizsettings", ""]
    ];
    h += '<div class="q-grid">';
    cells.forEach(function (c) {
      h += '<button class="q-grid-item" data-view="' + c[2] + '"><span class="qi-ico">' + c[0] + "</span>" +
        '<span class="qi-txt">' + c[1] + "</span>" + (c[3] ? "<em>" + c[3] + "</em>" : "") + "</button>";
    });
    h += "</div>";

    /* 题库切换 */
    h += bankChips();

    /* 掌握度热力图 */
    h += '<div class="section-title" style="margin:6px 0 2px">掌握度热力图<span class="heat-hint">颜色越绿越稳，越红越要回看</span></div>';
    h += '<div class="heat-wrap" id="heatWrap"></div>';

    /* 科目 + 章节 */
    h += '<div class="section-title" style="margin:6px 0 2px">按章节刷题</div>';
    h += subjTabs(D.subj, true);
    h += '<div class="q-chlist" id="qChList"></div>';
    h += "</div>";

    app.innerHTML = h;
    A3.bindGo ? A3.bindGo() : null;
    Array.prototype.forEach.call(app.querySelectorAll("[data-view]"), function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-view");
        if (v === "quizrand") startRandom(); else A3.go(v);
      });
    });
    var bb = document.getElementById("qBankBtn"), bp = document.getElementById("qBankPanel");
    if (bb && bp) {
      bb.addEventListener("click", function () { bp.hidden = !bp.hidden; });
      Array.prototype.forEach.call(bp.querySelectorAll(".q-bank-row"), function (row) {
        row.addEventListener("click", function () {
          D.bank = row.getAttribute("data-bank"); save(); A3.render();
        });
      });
    }
    bindSubjTabs(function (s) { D.subj = s; save(); A3.render(); });
    renderChList();
    renderHeat();
  };

  /* 掌握度热力图：每章一格，颜色 = 正确率，深浅 = 完成度 */
  function renderHeat() {
    var box = document.getElementById("heatWrap");
    if (!box) return;
    var subjects = K.subjects || [];
    var h = "";
    subjects.forEach(function (s) {
      var arr = listOf(D.bank, s.id);
      if (!arr.length) return;
      var groups = {};
      arr.forEach(function (q) { (groups[q.ch || "_"] = groups[q.ch || "_"] || []).push(q); });
      var keys = Object.keys(groups).sort(function (a, b) {
        var ia = (CH[s.id] && CH[s.id][a]) ? CH[s.id][a].i : 50;
        var ib = (CH[s.id] && CH[s.id][b]) ? CH[s.id][b].i : 50;
        return ia - ib;
      });
      h += '<div class="heat-subj"><div class="heat-subj-name" style="--c:' + (s.color || "#1e6fd9") + '">' + esc(s.short) + "</div>";
      h += '<div class="heat-grid">';
      keys.forEach(function (k) {
        var r = rateOf(groups[k]);
        var lvl = 0;
        if (r.ans) {
          if (r.rate >= 85 && r.ans / r.total >= .8) lvl = 4;
          else if (r.rate >= 75) lvl = 3;
          else if (r.rate >= 60) lvl = 2;
          else lvl = 1;
        }
        var idx = (CH[s.id] && CH[s.id][k] && CH[s.id][k].i) || 0;
        h += '<button class="heat-cell lv' + lvl + '" data-subj="' + esc(s.id) + '" data-ch="' + esc(k) + '" ' +
          'title="' + esc(chName(s.id, k)) + "：已答 " + r.ans + "/" + r.total + "，正确率 " + (r.ans ? r.rate + "%" : "—") + '">' +
          (idx || "·") + "</button>";
      });
      h += "</div></div>";
    });
    h += '<div class="heat-legend"><span class="heat-cell lv0">·</span>未做' +
      '<span class="heat-cell lv1">·</span>&lt;60%' +
      '<span class="heat-cell lv2">·</span>60–75%' +
      '<span class="heat-cell lv3">·</span>75–85%' +
      '<span class="heat-cell lv4">·</span>≥85%</div>';
    box.innerHTML = h;
    Array.prototype.forEach.call(box.querySelectorAll(".heat-cell[data-ch]"), function (b) {
      b.addEventListener("click", function () {
        var sid = b.getAttribute("data-subj"), ch = b.getAttribute("data-ch");
        var arr = listOf(D.bank, sid).filter(function (q) { return (q.ch || "_") === ch && okQ(q); });
        if (!arr.length) return;
        newSession(arr, chName(sid, ch) + " · 章节练习", { random: false });
        A3.go("quizrun");
      });
    });
  }

  function countdownDays() {
    var d = null;
    try { d = localStorage.getItem("k3_exam_date") || "2026-12-19"; } catch (e) { d = "2026-12-19"; }
    var p = String(d).split("-");
    var t = new Date(+p[0], +p[1] - 1, +p[2]) - new Date();
    return Math.max(0, Math.ceil(t / 86400000));
  }

  function renderChList() {
    var box = document.getElementById("qChList");
    if (!box) return;
    var subj = D.subj;
    var subjOrder = (K.subjects || []).map(function (s) { return s.id; });

    function rowsFor(sid) {
      var list = listOf(D.bank, sid).filter(okQ);
      var groups = {};
      list.forEach(function (q) {
        var key = q.ch || "_";
        (groups[key] = groups[key] || []).push(q);
      });
      var keys = Object.keys(groups).sort(function (a, b) {
        var ia = (CH[sid] && CH[sid][a]) ? CH[sid][a].i : 50 + (parseInt(String(a).replace(/\D/g, ""), 10) || 0);
        var ib = (CH[sid] && CH[sid][b]) ? CH[sid][b].i : 50 + (parseInt(String(b).replace(/\D/g, ""), 10) || 0);
        return ia - ib;
      });
      var h = "";
      keys.forEach(function (k) {
        var arr = groups[k], r = rateOf(arr);
        var pct = r.total ? Math.round(r.ans / r.total * 100) : 0;
        h += '<button class="q-chrow" data-subj="' + esc(sid) + '" data-ch="' + esc(k) + '">' +
          '<span class="q-ch-name">' + esc(chName(sid, k)) + "</span>" +
          '<span class="q-ch-count">' + r.ans + "/" + r.total + "</span>" +
          (D.set.showRate
            ? '<span class="q-ch-sub"><span class="q-ch-prog"><i style="width:' + pct + '%"></i></span>' +
              '<span class="q-ch-rate">' + (r.ans ? "正确率 " + r.rate + "%" : "未开始") + "</span></span>"
            : "") +
          "</button>";
      });
      return h;
    }

    var h = "";
    if (subj === "all") {
      subjOrder.forEach(function (sid) {
        var one = rowsFor(sid);
        if (!one) return;
        h += '<div class="q-ch-subjhead">' + esc(subjName(sid)) +
          '<span>' + listOf(D.bank, sid).filter(okQ).length + " 题</span></div>" + one;
      });
    } else {
      h = rowsFor(subj);
    }
    if (!h) { box.innerHTML = emptyState("这个题库里还没有该科目的题目"); return; }
    box.innerHTML = h;
    Array.prototype.forEach.call(box.querySelectorAll(".q-chrow"), function (b) {
      b.addEventListener("click", function () {
        var sid = b.getAttribute("data-subj"), ch = b.getAttribute("data-ch");
        var arr = listOf(D.bank, sid).filter(function (q) { return (q.ch || "_") === ch && okQ(q); });
        if (!arr.length) return;
        newSession(arr, chName(sid, ch) + " · 章节练习", { random: false });
        A3.go("quizrun");
      });
    });
  }

  function startRandom() {
    var pool = listOf(D.bank, "all");
    if (!pool.length) { toast("题库还是空的"); return; }
    newSession(pool.filter(okQ).slice(0, 60), "乱序随机 60 题", { random: true });
    A3.go("quizrun");
  }

  /* ---------------- 答题 ---------------- */
  A3.views.quizrun = function () {
    if (!S) restoreSession();
    if (!S || !S.queue.length) {
      var pool0 = listOf(D.bank, "all");
      if (pool0.length) {
        newSession(pool0.filter(okQ).slice(0, 10), "快速开始 10 题", {});
        A3.views.quizrun();
        return;
      }
      app.innerHTML = emptyState("没有正在进行的练习") +
        '<div style="margin-top:12px"><button class="big-btn" id="qBack">回到刷题中心</button></div>';
      var b0 = document.getElementById("qBack");
      if (b0) b0.addEventListener("click", function () { A3.go("quiz"); });
      return;
    }
    if (S.finished) return renderResult();
    var q = cur();
    if (!q) return renderResult();

    var total = S.queue.length, idx = S.i;
    var a = S.answered[q.id];
    var shown = a && (S.mode === "practice" && D.set.instant);
    var opts = q.opts || [];

    var h = '<div class="qrun">';
    h += '<div class="qrun-head"><span class="qrun-idx">' + (idx + 1) + " / " + total + "</span>" +
      '<span class="qrun-prog"><i style="width:' + Math.round((idx + 1) / total * 100) + '%"></i></span>' +
      '<span class="qrun-idx" id="qClock">' + (S.mode === "mock" ? "⏱ 模考" : "") + "</span></div>";
    h += '<div class="qcard-main">';
    h += '<div class="qcard-tags"><span class="qcard-tag">' + esc(subjShort(q.subj)) + "</span>" +
      '<span class="qcard-tag">' + esc(chName(q.subj, q.ch)) + "</span>" +
      (q.type ? '<span class="qcard-tag gold">' + esc(q.type) + "</span>" : "") +
      (D.fav[q.id] ? '<span class="qcard-tag gold">⭐ 已收藏</span>' : "") + "</div>";
    h += '<div class="qcard-q">' + md(q.q) + "</div>";
    h += '<div class="qopts">';
    opts.forEach(function (o, i) {
      var cls = "qopt";
      if (shown) {
        if (i === q.a) cls += " right";
        else if (a.sel === i) cls += " wrong";
      } else if (a && a.sel === i) cls += " sel";
      h += '<button class="' + cls + '" data-opt="' + i + '"><span class="qo-key">' + "ABCDEFGH"[i] + "</span><span>" + md(o) + "</span></button>";
    });
    h += "</div>";
    if (shown) {
      var ok = !!a.ok;
      h += '<div class="qexp ' + (ok ? "ok" : "no") + '"><h4>' + (ok ? "✓ 答对了" : "✕ 答错了，正确答案 " + "ABCDEFGH"[q.a]) + "</h4>";
      if (q.exp) h += "<div>" + md(q.exp) + "</div>";
      if (q.src && !D.set.hideSrc) {
        var _qmap = window.K3_QSRC || {};
        var _qs = _qmap[q.bank + "|" + q.id] || _qmap[q.id] || "";
        var _bid = "", _pg = q.src.page || 0;
        if (_qs) { var _pp = String(_qs).split(":"); _bid = _pp[0]; _pg = _pg || (parseInt(_pp[1], 10) || 0); }
        h += '<div class="qexp-src">📖 出处：<b>' + esc(q.src.book || "") + "</b>" +
          (q.src.ver ? "（" + esc(q.src.ver) + "）" : "") + (_pg ? " 第 " + _pg + " 页" : "");
        if (_pg && _bid) {
          h += ' <a href="javascript:;" class="qs-open" data-src-book="' + _bid + '" data-src-page="' + _pg +
            '" data-src-title="' + esc(q.src.book || "") + '">查看原题 ▸</a>';
        } else if (/^zt-/.test(String(q.ch || ""))) {
          var _zno = q.no != null ? q.no : String(q.id || "").split("|").pop();
          h += ' <a href="javascript:;" class="zt-open" data-zt-year="' + esc(String(q.ch).slice(3)) +
            '" data-zt-no="' + esc(String(_zno)) + '">在整卷里看 ▸</a>';
        }
        h += "</div>";
      }
      h += "</div>";
    }
    h += "</div>";
    h += '<div class="qfoot">';
    h += '<button class="qicon' + (D.fav[q.id] ? " on" : "") + '" id="qFav" title="收藏">' + (D.fav[q.id] ? "★" : "☆") + "</button>";
    h += '<button class="qicon' + (D.notes[q.id] ? " on" : "") + '" id="qNote" title="笔记">✎</button>';
    h += '<button class="qbtn" id="qPrev"' + (idx === 0 ? " disabled" : "") + ">上一题</button>";
    h += '<button class="qbtn primary" id="qNext">' + (idx === total - 1 ? "交卷 / 看结果" : (shown ? "下一题" : "确定")) + "</button>";
    h += "</div>";
    h += "</div>";
    app.innerHTML = h;

    function bind(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", fn); }

    Array.prototype.forEach.call(app.querySelectorAll(".qopt"), function (b) {
      b.addEventListener("click", function () {
        if (S.mode === "practice" && D.set.instant && S.answered[q.id]) return;
        answer(parseInt(b.getAttribute("data-opt"), 10));
      });
    });
    bind("qFav", function () {
      if (D.fav[q.id]) { delete D.fav[q.id]; toast("已取消收藏"); } else { D.fav[q.id] = 1; toast("已收藏"); }
      save(); A3.render();
    });
    bind("qNote", function () { openNote(q); });
    bind("qPrev", function () { if (S.i > 0) { S.i--; A3.render(); } });
    bind("qNext", function () {
      var ansd = S.answered[q.id];
      if (!ansd) { toast("先选一个答案"); return; }
      if (S.mode === "practice" && D.set.instant && !ansd.revealed) { ansd.revealed = 1; A3.render(); return; }
      nextQ();
    });
    if (S.mode === "mock") startClock();
    persistSession();
  };

  function answer(sel) {
    var q = cur();
    if (!q) return;
    var ok = sel === q.a;
    var rec = D.ans[q.id] || { n: 0 };
    rec.ok = ok ? 1 : 0;
    rec.t = Date.now();
    rec.n = (rec.n || 0) + 1;
    rec.sel = sel;
    D.ans[q.id] = rec;
    if (ok) {
      if (D.set.passClear) delete D.wrong[q.id];
    } else {
      D.wrong[q.id] = 1;
    }
    S.answered[q.id] = { sel: sel, ok: ok, revealed: 0 };
    if (!S._counted) S._counted = {};
    if (!S._counted[q.id]) {
      S._counted[q.id] = 1;
      if (ok) S.right++; else S.wrong++;
    }
    save();
    if (S.mode === "practice" && D.set.instant) {
      A3.render();
      /* 自动跳到下一题 */
      if (ok && D.set.autoNext) {
        setTimeout(function () {
          if (!S || S.finished) return;
          var c = cur();
          if (c && S.answered[c.id] && S.answered[c.id].revealed) nextQ();
        }, 700);
      }
    } else {
      A3.render();
    }
  }

  function nextQ() {
    if (!S) return;
    if (S.i >= S.queue.length - 1) { finish(); return; }
    S.i++;
    A3.render();
  }

  function finish() {
    S.finished = true;
    var done = Object.keys(S.answered).length;
    var rec = { t: Date.now(), title: S.title, total: S.queue.length, done: done, right: S.right, sec: Math.round((Date.now() - S.start) / 1000) };
    if (done) { D.runs.unshift(rec); D.runs = D.runs.slice(0, 30); }
    save();
    persistSession();
    A3.render();
  }

  function renderResult() {
    var total = S.queue.length, done = Object.keys(S.answered).length, right = S.right, wrong = S.wrong;
    var pct = done ? Math.round(right / done * 100) : 0;
    var min = Math.max(1, Math.round((Date.now() - S.start) / 60000));
    var h = '<div class="qresult">';
    h += '<div><div style="font-size:13px;color:var(--ink-2);margin-bottom:6px">' + esc(S.title) + " · 完成</div>" +
      '<div class="qr-score">' + pct + '%</div><div class="qr-sub">正确率</div></div>';
    h += '<div class="qr-grid"><div class="qr-cell"><b>' + done + "</b><span>已答</span></div>" +
      '<div class="qr-cell"><b>' + right + "</b><span>答对</span></div>" +
      '<div class="qr-cell"><b>' + wrong + "</b><span>答错</span></div></div>";
    h += '<div class="qr-sub">用时约 ' + min + " 分钟" + (total - done > 0 ? "｜跳过 " + (total - done) + " 题" : "") + "</div>";
    h += '<div style="display:flex;gap:10px"><button class="qbtn" id="qrWrong">看错题</button><button class="qbtn primary" id="qrHub">回到刷题中心</button></div>';
    h += "</div>";
    app.innerHTML = h;
    var a = document.getElementById("qrWrong");
    if (a) a.addEventListener("click", function () { A3.go("quizwrong"); });
    var b = document.getElementById("qrHub");
    if (b) b.addEventListener("click", function () { A3.go("quiz"); });
  }

  /* 模考计时 */
  var clockTimer = null;
  function startClock() {
    stopClock();
    var limit = (S && S.limit) ? S.limit : 90 * 60000;
    var t0 = S.start;
    clockTimer = setInterval(function () {
      if (!S || S.finished) return stopClock();
      var left = limit - (Date.now() - t0);
      if (left <= 0) { stopClock(); finish(); return; }
      var el = document.getElementById("qClock");
      if (el) el.textContent = "⏱ " + Math.floor(left / 60000) + ":" + ("0" + Math.floor(left % 60000 / 1000)).slice(-2);
    }, 500);
  }
  function stopClock() { if (clockTimer) { clearInterval(clockTimer); clockTimer = null; } }

  /* 笔记弹层 */
  function openNote(q) {
    var old = document.getElementById("qNoteBox");
    if (old) old.remove();
    var box = document.createElement("div");
    box.id = "qNoteBox";
    box.style.cssText = "position:fixed;inset:0;background:rgba(12,26,48,.45);z-index:200;display:grid;place-items:center;padding:16px";
    box.innerHTML = '<div style="background:#fff;border-radius:16px;padding:16px;width:min(520px,100%);box-shadow:0 20px 50px rgba(0,0,0,.25)">' +
      '<div style="font-weight:800;margin-bottom:10px">✏️ 我的笔记</div>' +
      '<textarea id="qNoteArea" style="width:100%;min-height:120px;border:1px solid #dbe7f7;border-radius:12px;padding:10px;font:inherit;font-size:14px;resize:vertical"></textarea>' +
      '<div style="display:flex;gap:10px;margin-top:12px"><button class="qbtn" id="qNoteCancel">取消</button><button class="qbtn primary" id="qNoteSave">保存笔记</button></div>' +
      "</div>";
    document.body.appendChild(box);
    var ta = document.getElementById("qNoteArea");
    ta.value = D.notes[q.id] || "";
    ta.focus();
    document.getElementById("qNoteCancel").onclick = function () { box.remove(); };
    document.getElementById("qNoteSave").onclick = function () {
      var v = ta.value.trim();
      if (v) D.notes[q.id] = v; else delete D.notes[q.id];
      save(); box.remove(); toast("笔记已保存"); A3.render();
    };
    box.addEventListener("click", function (e) { if (e.target === box) box.remove(); });
  }

  /* ---------------- 模考 ---------------- */
  A3.views.quizmock = function () {
    var h = '<div class="section-title">📝 模考模式</div>';
    h += '<p class="muted" style="margin:-4px 0 14px;font-size:13.5px;color:var(--ink-3)">' +
      '两种模考：选择题按真题比例随机抽 30 题、40 分钟；大题模考抽 1 论述 + 2 材料分析，90 分钟手写。</p>';
    var mkB = A3._mkBank || "all";
    var banks = [{ id: "all", n: "全部" }].concat((QB.banks || []).map(function (b) {
      return { id: b.id, n: b.short || b.name };
    }));
    h += '<div class="qset" style="margin-bottom:12px"><div class="qset-row"><div class="qs-txt"><b>选择题模考的题库</b>' +
      '<span>从这位老师的题库里抽，比例仍是 7/8/7/8</span></div><div class="seg" id="mkBank">' +
      banks.map(function (b) { return '<button data-b="' + b.id + '"' + (b.id === mkB ? ' class="on"' : "") + ">" + esc(b.n) + "</button>"; }).join("") +
      "</div></div></div>";
    h += '<div class="mk-cards">';
    h += '<div class="mk-card"><div class="mk-ico">🧮</div><div class="mk-t">选择题模考</div>' +
      '<div class="mk-d">30 题 · 40 分钟 · 教原 7 / 中教史 8 / 外教史 7 / 教心 8</div>' +
      '<button class="qbtn primary" id="mkChoice">开始选择题模考</button></div>';
    h += '<div class="mk-card"><div class="mk-ico">📝</div><div class="mk-t">大题模考</div>' +
      '<div class="mk-d">1 道论述 + 2 道材料分析 · 90 分钟 · 交卷后看参考答案</div>' +
      '<button class="qbtn primary" id="mkEssay">开始大题模考</button></div>';
    h += "</div>";
    h += '<div style="display:flex;gap:10px;margin-top:4px"><button class="qbtn" id="mkBack">返回</button></div>';
    app.innerHTML = h;
    document.getElementById("mkBack").onclick = function () { A3.go("quiz"); };
    Array.prototype.forEach.call(document.querySelectorAll("#mkBank button"), function (b) {
      b.onclick = function () {
        Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        A3._mkBank = b.getAttribute("data-b");
        A3.render();
      };
    });
    document.getElementById("mkChoice").onclick = function () {
      var pick = paperStylePick();
      if (!pick.length) { toast("题库还不够 30 题"); return; }
      newSession(pick, "选择题模考 · 30 题 / 40 分钟", { mock: true, random: true, limit: 40 });
      A3.go("quizrun");
    };
    document.getElementById("mkEssay").onclick = function () { A3.go("quizessay"); };
  };

  /* 按真题比例抽 30 题：教原 7 / 中教史 8 / 外教史 7 / 教心 8 */
  function paperStylePick() {
    var mix = { "edu-principle": 7, "edu-china": 8, "edu-foreign": 7, "edu-psych": 8 };
    var bank = A3._mkBank || "all";
    var base = bank === "all" ? QS : QS.filter(function (q) { return q.bank === bank; });
    base = base.filter(okQ);
    if (base.length < 30) base = QS.filter(okQ);
    var out = [];
    Object.keys(mix).forEach(function (sid) {
      var pool = base.filter(function (q) { return q.subj === sid; });
      var n = Math.min(mix[sid], pool.length);
      out = out.concat(shuffle(pool).slice(0, n));
    });
    /* 某一科不够时，从其余科目补足到 30 */
    if (out.length < 30) {
      var used = {};
      out.forEach(function (q) { used[q.id] = 1; });
      var rest = shuffle(base.filter(function (q) { return !used[q.id]; }));
      out = out.concat(rest.slice(0, 30 - out.length));
    }
    return shuffle(out);
  }
  A3.paperStylePick = paperStylePick;

  /* ---------------- 随机组卷 ---------------- */
  A3.views.quizbuild = function () {
    var B = { n: 30, subj: "all", bank: D.bank, order: "rand" };
    var h = '<div class="section-title">🎲 随机组卷</div>';
    h += '<p class="muted" style="margin:-4px 0 14px;font-size:13.5px;color:var(--ink-3)">自选题量、科目范围与题库，随机抽成一套卷来刷。</p>';
    h += '<div class="qset">';
    h += '<div class="qset-row"><div class="qs-txt"><b>题量</b><span>这一套刷多少题</span></div>' +
      '<div class="seg" id="bldN">' + [10, 20, 30, 50, 100].map(function (n) {
        return '<button data-n="' + n + '"' + (n === B.n ? ' class="on"' : "") + ">" + n + "</button>";
      }).join("") + "</div></div>";
    h += '<div class="qset-row"><div class="qs-txt"><b>科目</b><span>只抽某几科，或四科混合</span></div>' +
      '<div class="seg" id="bldSubj"><button data-s="all" class="on">全部</button>' +
      (K.subjects || []).map(function (s2) {
        return '<button data-s="' + s2.id + '">' + esc(s2.short || s2.name) + "</button>";
      }).join("") + "</div></div>";
    h += '<div class="qset-row"><div class="qs-txt"><b>题库</b><span>从哪个题库里抽</span></div>' +
      '<div class="seg" id="bldBank"><button data-b="all"' + (D.bank === "all" ? ' class="on"' : "") + ">全部</button>" +
      (QB.banks || []).map(function (b) {
        var n = QS.filter(function (q) { return q.bank === b.id; }).length;
        return '<button data-b="' + b.id + '"' + (D.bank === b.id ? ' class="on"' : "") + ">" + esc(b.short || b.name) + " " + n + "</button>";
      }).join("") + "</div></div>";
    h += "</div>";
    h += '<div class="bld-sum" id="bldSum"></div>';
    h += '<div style="display:flex;gap:10px;margin-top:14px"><button class="qbtn" id="bldBack">返回</button>' +
      '<button class="qbtn primary" id="bldGo">开始刷</button></div>';
    app.innerHTML = h;
    document.getElementById("bldBack").onclick = function () { A3.go("quiz"); };

    function seg(box, key, cast) {
      Array.prototype.forEach.call(document.getElementById(box).children, function (b) {
        b.onclick = function () {
          Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          B[key] = cast ? cast(b) : b.getAttribute("data-n") || b.getAttribute("data-s") || b.getAttribute("data-b");
          sum();
        };
      });
    }
    seg("bldN", "n", function (b) { return +b.getAttribute("data-n"); });
    seg("bldSubj", "subj");
    seg("bldBank", "bank");
    function pool() {
      return QS.filter(function (q) {
        if (B.bank !== "all" && q.bank !== B.bank) return false;
        if (B.subj !== "all" && q.subj !== B.subj) return false;
        return okQ(q);
      });
    }
    function sum() {
      var n = Math.min(B.n, pool().length);
      document.getElementById("bldSum").innerHTML = "可抽 <b>" + pool().length + "</b> 题，本次出 <b>" + n + "</b> 题";
      document.getElementById("bldGo").disabled = !n;
    }
    sum();
    document.getElementById("bldGo").onclick = function () {
      var list = shuffle(pool()).slice(0, Math.min(B.n, pool().length));
      if (!list.length) return;
      newSession(list, "随机组卷 · " + list.length + " 题", { random: false });
      A3.go("quizrun");
    };
  };

  /* ---------------- 大题模考 ---------------- */
  A3.views.quizessay = function () {
    var P = window.K3_ZT_PAPERS || { papers: [] };
    var essays = [], mats = [];
    (P.papers || []).forEach(function (p) {
      (p.essay || []).forEach(function (q) { essays.push({ y: p.year, q: q }); });
      (p.material || []).forEach(function (q) { mats.push({ y: p.year, q: q }); });
    });
    if (!essays.length && !mats.length) { app.innerHTML = '<div class="qempty">还没有大题数据</div>'; return; }
    var E = shuffle(essays).slice(0, 1), M = shuffle(mats).slice(0, 2);
    var items = E.map(function (x) { return { kind: "论述", y: x.y, q: x.q }; })
      .concat(M.map(function (x) { return { kind: "材料分析", y: x.y, q: x.q }; }));
    var total = 0; items.forEach(function (it) { total += it.q.score || 15; });

    var h = '<div class="section-title">📝 大题模考</div>';
    h += '<div class="ek-bar"><div><b id="ekClock">90:00</b><span>剩余时间</span></div>' +
      '<div style="flex:1"><b>' + items.length + ' 道 · 共 ' + total + ' 分</b><span>论述 1 道 + 材料分析 2 道</span></div>' +
      '<button class="qbtn primary" id="ekStart">开始计时</button>' +
      '<button class="qbtn" id="ekNew">换一套</button>' +
      '<button class="qbtn" id="ekBack">返回</button></div>';
    items.forEach(function (it, i) {
      h += '<div class="ztq">';
      h += '<div class="ztq-head"><span class="ztq-no">' + (i + 1) + '</span><span class="qcard-tag">' + it.kind + '</span>' +
        '<span class="qcard-tag">' + (it.q.score || 15) + ' 分</span><span class="qcard-tag">' + it.y + ' 年真题</span></div>';
      if (it.q.mat) h += '<div class="zt-mat">' + md(it.q.mat) + "</div>";
      h += '<div class="qcard-q">' + md(it.q.q || "") + "</div>";
      if ((it.q.asks || []).length) {
        h += '<div class="zt-asks">';
        it.q.asks.forEach(function (a) {
          h += '<div class="zt-ask"><b>' + a.score + ' 分</b><span>' + md(a.t) + "</span></div>";
        });
        h += "</div>";
      }
      h += '<div class="zt-acts"><button class="qbtn zt-tog">看参考答案</button></div>';
      h += '<div class="zt-ans" hidden><div class="zt-exp zt-pre">' + md(it.q.ans || "（暂无参考答案）") + "</div></div>";
      h += "</div>";
    });
    app.innerHTML = h;
    document.getElementById("ekBack").onclick = function () { A3.go("quizmock"); };
    document.getElementById("ekNew").onclick = function () { A3.render(); };
    Array.prototype.forEach.call(app.querySelectorAll(".zt-tog"), function (b) {
      b.onclick = function () {
        var box = b.closest(".ztq").querySelector(".zt-ans");
        box.hidden = !box.hidden;
        b.textContent = box.hidden ? "看参考答案" : "收起";
      };
    });
    var left = 90 * 60, t = null, clock = document.getElementById("ekClock"), st = document.getElementById("ekStart");
    function paint() {
      var m = Math.floor(left / 60), sec = left % 60;
      clock.textContent = m + ":" + (sec < 10 ? "0" : "") + sec;
    }
    st.onclick = function () {
      if (t) { clearInterval(t); t = null; st.textContent = "继续计时"; return; }
      st.textContent = "暂停";
      t = setInterval(function () {
        left--; paint();
        if (left <= 0) { clearInterval(t); t = null; st.textContent = "时间到"; st.disabled = true; }
      }, 1000);
    };
    paint();
  };

  /* ---------------- 错题 / 收藏 / 笔记 ---------------- */
  function qList(items, kind) {
    if (!items.length) return emptyState(kind === "wrong" ? "错题本是空的，继续保持！" : kind === "fav" ? "还没有收藏题目" : "还没有写过笔记");
    var h = '<div class="qlist">';
    items.forEach(function (q) {
      var a = D.ans[q.id] || {};
      h += '<div class="qlist-row" data-q="' + esc(q.id) + '">';
      h += '<div class="ql-top"><span class="qcard-tag">' + esc(subjShort(q.subj)) + "</span>" +
        '<span>' + esc(chName(q.subj, q.ch)) + "</span>" +
        (a.ok === 1 ? '<span style="color:#159a72">✓ 已答对</span>' : a.ok === 0 ? '<span style="color:#e8654f">✕ 答错</span>' : '<span>未答</span>') + "</div>";
      h += '<div class="ql-q">' + md(q.q) + "</div>";
      if (kind === "note") h += '<div class="ql-note">' + md(D.notes[q.id] || "") + "</div>";
      h += "</div>";
    });
    h += "</div>";
    return h;
  }

  function bindQList() {
    Array.prototype.forEach.call(app.querySelectorAll(".qlist-row"), function (r) {
      r.addEventListener("click", function () {
        var id = r.getAttribute("data-q");
        var q = QMAP[id];
        if (!q) return;
        newSession([q], "单题精练", { random: false });
        A3.go("quizrun");
      });
    });
  }

  A3.views.quizwrong = function () {
    var ids = Object.keys(D.wrong);
    var items = ids.map(function (id) { return QMAP[id]; }).filter(Boolean);
    var h = '<div class="section-title">📕 我的错题 <span class="badge">' + items.length + "</span></div>";
    if (!items.length) {
      app.innerHTML = h + emptyState("还没有错题。刷题时答错的题会自动进来，答对（并开着「刷对才算过」）会移出。");
      return;
    }

    /* 按 科目 → 章节 聚类 */
    var bySub = {};
    items.forEach(function (q) {
      var sid = q.subj || "_", ch = q.ch || "_";
      bySub[sid] = bySub[sid] || {};
      (bySub[sid][ch] = bySub[sid][ch] || []).push(q);
    });
    var sorder = (K.subjects || []).map(function (s) { return s.id; });

    h += '<div class="wr-top"><button class="qbtn primary" id="wrPract">全部错题重练（' + items.length + "）</button>" +
      '<button class="qbtn" id="wrClear">清空错题本</button></div>';
    h += '<div class="wr-groups">';
    Object.keys(bySub).sort(function (a, b) {
      var ia = sorder.indexOf(a), ib = sorder.indexOf(b);
      return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib);
    }).forEach(function (sid) {
      var chs = bySub[sid];
      var subTotal = 0;
      Object.keys(chs).forEach(function (k) { subTotal += chs[k].length; });
      h += '<div class="wr-subjhead">' + esc(subjName(sid)) + '<span>' + subTotal + " 题</span></div>";
      Object.keys(chs).sort(function (a, b) {
        var ia = (CH[sid] && CH[sid][a]) ? CH[sid][a].i : 50;
        var ib = (CH[sid] && CH[sid][b]) ? CH[sid][b].i : 50;
        return ia - ib;
      }).forEach(function (k) {
        var arr = chs[k];
        var all = listOf(D.bank, sid).filter(function (q) { return (q.ch || "_") === k; });
        var rep = 0;
        arr.forEach(function (q) { var w = D.wrong[q.id]; if (w && w.n > 1) rep++; });
        h += '<button class="wr-ch" data-subj="' + esc(sid) + '" data-ch="' + esc(k) + '">' +
          '<span class="wr-name">' + esc(chName(sid, k)) + "</span>" +
          '<span class="wr-n">错 <b>' + arr.length + "</b>" + (all.length ? " / 共 " + all.length : "") +
          (rep ? ' <em title="错过两次以上">×' + rep + "</em>" : "") + "</span>" +
          '<span class="wr-go">只刷本章错题 →</span></button>';
      });
    });
    h += "</div>";

    /* 错题清单（折叠在下面，便于回看） */
    h += '<div class="section-title" style="margin-top:20px">逐题回看</div>';
    h += qList(items, "wrong");

    app.innerHTML = h;
    bindQList();
    var p = document.getElementById("wrPract");
    if (p) p.onclick = function () { newSession(shuffle(items.slice()), "错题重练", { random: true }); A3.go("quizrun"); };
    var c = document.getElementById("wrClear");
    if (c) c.onclick = function () { D.wrong = {}; save(); toast("错题本已清空"); A3.render(); };
    Array.prototype.forEach.call(app.querySelectorAll(".wr-ch"), function (b) {
      b.addEventListener("click", function () {
        var sid = b.getAttribute("data-subj"), ch = b.getAttribute("data-ch");
        var arr = (bySub[sid] || {})[ch] || [];
        if (!arr.length) return;
        newSession(shuffle(arr.slice()), chName(sid, ch) + " · 错题重练", { random: true });
        A3.go("quizrun");
      });
    });
  };

  A3.views.quizfav = function () {
    var items = Object.keys(D.fav).map(function (id) { return QMAP[id]; }).filter(Boolean);
    app.innerHTML = '<div class="section-title">⭐ 我的收藏 <span class="badge">' + items.length + "</span></div>" +
      (items.length ? '<div style="margin-bottom:12px"><button class="qbtn primary" id="fvPract">收藏题重刷</button></div>' : "") +
      qList(items, "fav");
    bindQList();
    var p = document.getElementById("fvPract");
    if (p) p.onclick = function () { newSession(items.slice(), "收藏题目练习", { random: true }); A3.go("quizrun"); };
  };

  A3.views.quiznote = function () {
    var items = Object.keys(D.notes).map(function (id) { return QMAP[id]; }).filter(function (q) { return !!q; });
    app.innerHTML = '<div class="section-title">✏️ 我的笔记 <span class="badge">' + items.length + "</span></div>" + qList(items, "note");
    bindQList();
  };

  /* ---------------- 排行 / 记录 ---------------- */
  A3.views.quizstats = function () {
    var h = '<div class="section-title">📊 刷题排行 · 记录</div>';
    /* 各科正确率排行 */
    var rows = (K.subjects || []).map(function (s) {
      var r = rateOf(listOf(D.bank, s.id));
      return { name: s.name, short: s.short, r: r };
    }).sort(function (a, b) { return b.r.rate - a.r.rate; });
    h += '<div class="qset">';
    rows.forEach(function (x, i) {
      var medal = ["🥇", "🥈", "🥉", "4️⃣"][i] || "·";
      h += '<div class="qset-row"><div class="qs-txt"><b>' + medal + " " + esc(x.name) + "</b><span>已答 " + x.r.ans + " / 共 " + x.r.total + " 题</span></div>" +
        '<b style="color:var(--brand-1);font-size:17px">' + (x.r.ans ? x.r.rate + "%" : "—") + "</b></div>";
    });
    h += "</div>";

    /* 最近记录 */
    h += '<div class="section-title" style="margin-top:20px">🧾 刷题记录</div>';
    if (!D.runs.length) h += emptyState("还没有练习记录，去刷一组吧");
    else {
      h += '<div class="qlist">';
      D.runs.forEach(function (r) {
        var d = new Date(r.t);
        var pct = r.done ? Math.round(r.right / r.done * 100) : 0;
        h += '<div class="qlist-row"><div class="ql-top"><span>' + fmtTime(d) + "</span><span>" + esc(r.title) + "</span></div>" +
          '<div class="ql-q">答 ' + r.done + "/" + r.total + " 题，正确 " + r.right + " 题，正确率 <b>" + pct + "%</b>，用时 " + Math.round(r.sec / 60) + " 分钟</div></div>";
      });
      h += "</div>";
    }
    h += '<div style="margin-top:14px"><button class="qbtn" id="stClear">清除刷题记录</button></div>';
    app.innerHTML = h;
    document.getElementById("stClear").onclick = function () {
      if (!confirm("确定清除全部刷题记录与成绩（错题、收藏不受影响）？")) return;
      D.runs = []; save(); toast("记录已清除"); A3.render();
    };
  };

  function fmtTime(d) {
    return d.getFullYear() + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + ("0" + d.getDate()).slice(-2) +
      " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  /* ---------------- 设置 ---------------- */
  A3.views.quizsettings = function () {
    var st = D.set;
    var h = '<div class="section-title">⚙️ 题库设置</div><div class="qset">';
    var rows = [
      ["instant", "即时反馈", "答完立刻判对错并显示解析", 1],
      ["autoNext", "答对自动下一题", "只有答对才自动跳转（答错停下来看解析）", 2],
      ["passClear", "刷对才算过", "错题答对后自动移出错题本", 3],
      ["showRate", "显示正确率", "在章节列表显示正确率与完成度", 4],
      ["hideSrc", "隐藏出处", "题目解析里隐藏教材出处", 5]
    ];
    rows.forEach(function (r) {
      h += '<div class="qset-row"><div class="qs-txt"><b>' + r[1] + "</b><span>" + r[2] + "</span></div>" +
        '<label class="switch"><input type="checkbox" data-set="' + r[0] + '"' + (st[r[0]] ? " checked" : "") + "><i></i></label></div>";
    });
    /* 顺序 */
    h += '<div class="qset-row"><div class="qs-txt"><b>出题顺序</b><span>按章节顺序 或 乱序随机</span></div>' +
      '<label class="switch"><input type="checkbox" data-set2="order"' + (st.order === "rand" ? " checked" : "") + "><i></i></label></div>";
    h += "</div>";
    h += '<div class="section-title" style="margin-top:20px">🧹 数据清理</div>';
    h += '<div class="qset">';
    h += '<button class="qset-row" id="clrRuns" style="width:100%;text-align:left;cursor:pointer;font:inherit"><div class="qs-txt"><b>清除刷题记录</b><span>只清记录，不动错题收藏</span></div><span>›</span></button>';
    h += '<button class="qset-row" id="clrWrong" style="width:100%;text-align:left;cursor:pointer;font:inherit"><div class="qs-txt"><b>清空错题本</b><span>' + Object.keys(D.wrong).length + " 题</span></div><span>›</span></button>";
    h += '<button class="qset-row" id="clrAll" style="width:100%;text-align:left;cursor:pointer;font:inherit"><div class="qs-txt"><b style="color:#e8654f">恢复出厂设置</b><span>清空全部刷题进度、错题、收藏与笔记</span></div><span>›</span></button>';
    h += "</div>";
    app.innerHTML = h;

    Array.prototype.forEach.call(app.querySelectorAll("[data-set]"), function (el) {
      el.addEventListener("change", function () {
        D.set[el.getAttribute("data-set")] = el.checked ? 1 : 0; save(); toast("已保存");
      });
    });
    var o = app.querySelector("[data-set2='order']");
    if (o) o.addEventListener("change", function () { D.set.order = o.checked ? "rand" : "seq"; save(); toast("出题顺序：" + (o.checked ? "乱序" : "顺序")); });
    document.getElementById("clrRuns").onclick = function () { D.runs = []; save(); toast("记录已清除"); A3.render(); };
    document.getElementById("clrWrong").onclick = function () { D.wrong = {}; save(); toast("错题本已清空"); A3.render(); };
    document.getElementById("clrAll").onclick = function () {
      if (!confirm("确定清空全部刷题数据？此操作不可恢复。")) return;
      D = load(); D.ans = {}; D.wrong = {}; D.fav = {}; D.notes = {}; D.runs = []; save();
      toast("已恢复出厂设置"); A3.render();
    };
  };

  /* 解析里的「查看原题」 */
  document.addEventListener("click", function (ev) {
    var zt = ev.target && ev.target.closest ? ev.target.closest(".zt-open") : null;
    if (zt) {
      ev.preventDefault();
      A3._ztFocus = { tab: "c", no: parseInt(zt.getAttribute("data-zt-no"), 10) || 0 };
      A3.ztOpen(zt.getAttribute("data-zt-year"), "c");
      return;
    }
    var a = ev.target && ev.target.closest ? ev.target.closest(".qs-open") : null;
    if (!a) return;
    ev.preventDefault();
    if (A3.openSrc) {
      A3.openSrc(a.getAttribute("data-src-book"), parseInt(a.getAttribute("data-src-page"), 10) || 1,
        a.getAttribute("data-src-title") || "");
    }
  });

  /* 整套真题开刷 */
  A3.quizStartPaper = function (year) {
    var list = QS.filter(function (q) {
      return String(q.ch) === "zt-" + year && q.a >= 0;
    });
    if (!list.length) { toast("这套卷没有可刷的选择题"); return; }
    var pname = String(year);
    ((window.K3_ZT_PAPERS && window.K3_ZT_PAPERS.papers) || []).forEach(function (p) {
      if (String(p.year) === String(year)) pname = p.name || p.tag || pname;
    });
    newSession(list, pname + " · 单选 " + list.length + " 题", { random: false });
    A3.go("quizrun");
  };
  /* 由题目 id 列表直接开一局（考点↔题目联动用） */
  A3.quizFromIds = function (ids, title) {
    var list = (ids || []).map(function (id) { return QMAP[id]; }).filter(Boolean).filter(okQ);
    if (!list.length) { toast("没有找到相关联的题目"); return; }
    newSession(list, title || ("关联题目 · " + list.length + " 题"), { random: false });
    A3.go("quizrun");
  };
  A3.quizStartSet = function (opts) {
    opts = opts || {};
    var list = QS.filter(function (q) {
      if (opts.bank && q.bank !== opts.bank) return false;
      if (opts.subj && opts.subj !== "all" && q.subj !== opts.subj) return false;
      return okQ(q);
    });
    list = opts.random === false ? list : shuffle(list);
    if (opts.n) list = list.slice(0, opts.n);
    newSession(list, opts.title || ("随机练习 · " + list.length + " 题"), { random: false });
    A3.go("quizrun");
  };

  /* 暴露给其它视图（首页快捷入口用） */
  A3.quizStartRandom = startRandom;
})();