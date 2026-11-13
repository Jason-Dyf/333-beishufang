/* 333 教育综合背书房 — 交互主逻辑（原生 JS，无依赖，支持 file:// 离线） */
(function () {
  "use strict";

  var A3 = (window.A3 = window.A3 || {});
  A3.views = A3.views || {};

  var K = window.K333 || { subjects: [], bills: { countries: [] }, billsQuiz: [], q200: [], material70: [], method: {}, scoreTips: {} };

function ztMetaOf(y) {
    var arr = (window.K3_ZT_PAPERS && window.K3_ZT_PAPERS.papers) || [];
    for (var i = 0; i < arr.length; i++) {
      if (String(arr[i].year) === String(y)) return arr[i];
    }
    return null;
  }
  function ztTabName(t) {
    return t === "e" ? "论述" : t === "m" ? "材料" : "单选";
  }
  function ztChip(z) {
    var y = String(z[0]), t = z[1], no = z[2];
    var m = ztMetaOf(y);
    var isReal = /^20\d\d$/.test(y);
    var label;
    if (isReal) label = y + " "; 
    else {
      var nm = (m && m.name) || y;
      label = nm.replace(/^洪哥八套卷\s*·\s*/, "").replace(/^丹丹六套卷\s*·\s*/, "丹丹") + " ";
    }
    label += ztTabName(t) + " 第" + no + "题";
    var cls = isReal ? "pt-link z real" : "pt-link z mock";
    return '<button class="' + cls + '" data-y="' + esc(y) + '" data-t="' + esc(t) + '" data-no="' + esc(no) + '">' + esc(label) + "</button>";
  }

  /* ================= 状态 ================= */
  var LS = {
    marks: "k3_marks",
    exam: "k3_exam_date",
    checkin: "k3_checkin",
    quiz: "k3_quiz_stats",
    flashSeen: "k3_flash_seen"
  };

  function read(k, dflt) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; }
  }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var state = {
    view: "home",
    prevView: "home",
    marks: read(LS.marks, {}),
    subject: (K.subjects[0] || {}).id || "edu-principle",
    filter: "",
    onlyTodo: false,
    arsenalSubject: (K.subjects[0] || {}).id || "edu-principle",
    arsenalFilter: "all",
    ciYear: null,
    ciMonth: null,
    billCountry: "all",
    billStar: false,
    billOpen: {},
    quiz: null,
    flash: null,
    q200Subj: "all",
    q200Open: {},
    q200OnlyMust: false
  };

  var DEFAULT_EXAM = "2026-12-19";
  var cdTimer = null;

  var app = document.getElementById("app");
  var nav = document.getElementById("mainNav");
  var backdrop = document.getElementById("navBackdrop");
  var searchInput = document.getElementById("globalSearch");
  var searchClear = document.getElementById("searchClear");

  /* ================= 工具 ================= */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* 极简行内标记：{{关键词}} -> 金色重点；<<易错/注意>> -> 红色硬点 */
  function md(s) {
    var t = esc(s);
    t = t.replace(/\{\{([^}]+)\}\}/g, '<span class="k-gold">$1</span>');
    t = t.replace(/&lt;&lt;([^&]*?)&gt;&gt;/g, '<span class="k-md">$1</span>');
    return t;
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dkey(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function todayKey() { return dkey(new Date()); }
  function ymdToDate(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function fmtDay(k) { return k.replace(/-/g, "/"); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function toast(msg) {
    var old = document.querySelector(".ky-toast");
    if (old) old.remove();
    var d = document.createElement("div");
    d.className = "ky-toast";
    d.innerHTML = '<span class="ky-toast-ic">✓</span>' + esc(msg);
    document.body.appendChild(d);
    setTimeout(function () { d.classList.add("show"); }, 10);
    setTimeout(function () {
      d.classList.remove("show");
      setTimeout(function () { d.remove(); }, 320);
    }, 2100);
  }
  A3.esc = esc; A3.md = md; A3.toast = toast; A3.shuffle = shuffle; A3.state = state; A3.K = K;

  /* ================= 搜索同义词（壬戌↔六三三 等） ================= */
  var SYN = {
    "壬戌学制": ["六三三学制", "新学制", "1922年学制"],
    "六三三": ["壬戌学制", "新学制"],
    "癸卯学制": ["奏定学堂章程", "1904年学制"],
    "壬寅学制": ["钦定学堂章程", "1902年学制"],
    "壬子癸丑学制": ["1912年学制", "民国初年学制"],
    "最近发展区": ["潜在发展水平", "ZPD"],
    "终身教育": ["学习化社会", "终身学习"],
    "五育": ["五育并举", "五育并重"],
    "杜威": ["实用主义教育", "现代教育派"],
    "赫尔巴特": ["传统教育派", "四段教学法"],
    "夸美纽斯": ["大教学论", "泛智"],
    "卢梭": ["自然教育", "爱弥儿"],
    "裴斯泰洛齐": ["要素教育", "教育心理学化"],
    "福禄培尔": ["幼儿园", "恩物"],
    "陶行知": ["生活教育", "晓庄"],
    "陈鹤琴": ["活教育"],
    "蔡元培": ["五育并举", "兼容并包"],
    "晏阳初": ["平民教育"],
    "梁漱溟": ["乡村建设"],
    "黄炎培": ["职业教育"],
    "学在官府": ["学术官守", "官师合一"],
    "有教无类": ["孔子"],
    "中体西用": ["洋务教育"],
    "京师大学堂": ["北京大学前身"],
    "苏格拉底": ["产婆术", "问答法"],
    "柏拉图": ["理想国", "学园"],
    "亚里士多德": ["自由教育", "吕克昂"],
    "昆体良": ["雄辩术原理"],
    "洛克": ["白板说", "绅士教育"],
    "斯宾塞": ["教育准备生活说", "科学知识"],
    "马卡连柯": ["集体教育", "平行教育"],
    "赞科夫": ["发展性教学", "教学与发展"],
    "布鲁纳": ["结构主义", "发现学习"],
    "奥苏伯尔": ["有意义接受学习", "先行组织者"],
    "加涅": ["学习结果分类", "九大教学事件"],
    "皮亚杰": ["认知发展阶段", "建构主义"],
    "维果茨基": ["最近发展区", "文化历史"],
    "埃里克森": ["人格发展八阶段"],
    "科尔伯格": ["道德发展三水平六阶段"],
    "桑代克": ["试误说", "准备律"],
    "斯金纳": ["操作性条件作用", "强化"],
    "班杜拉": ["观察学习", "自我效能"],
    "罗杰斯": ["人本主义", "非指导性教学"],
    "学习动机": ["成就动机", "自我效能"],
    "知识建构": ["同化", "顺应"],
    "迁移": ["学习迁移", "正迁移"],
    "创造性": ["发散思维", "创造力"]
  };
  function uniqList(a) {
    var seen = {}, out = [];
    a.forEach(function (x) { if (x && !Object.prototype.hasOwnProperty.call(seen, x)) { seen[x] = 1; out.push(x); } });
    return out;
  }
  function synGroups(q) {
    var toks = String(q == null ? "" : q).trim().split(/[\s，,、]+/).filter(Boolean);
    return toks.map(function (t) {
      var alts = [t];
      for (var k in SYN) {
        if (!Object.prototype.hasOwnProperty.call(SYN, k)) continue;
        if (t === k || t.indexOf(k) > -1 || k.indexOf(t) > -1) alts = alts.concat(SYN[k]);
      }
      return uniqList(alts).map(function (s) { return s.toLowerCase(); });
    });
  }
  function synHit(hay, groups) {
    if (!groups.length) return false;
    hay = String(hay || "").toLowerCase();
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i], ok = false;
      for (var j = 0; j < g.length; j++) { if (hay.indexOf(g[j]) > -1) { ok = true; break; } }
      if (!ok) return false;
    }
    return true;
  }
  A3.synGroups = synGroups;
  A3.synHit = synHit;
  A3.SYN = SYN;
  function srcShort(n) {
    n = String(n || "");
    if (n.indexOf("丹丹") > -1) return "丹丹";
    if (n.indexOf("大纲全解") > -1) return "大纲全解";
    if (n.indexOf("补充资料") > -1) return "补充";
    if (n.indexOf("200题") > -1) return "200题";
    if (n.indexOf("1200") > -1) return "1200题";
    return n.slice(0, 6);
  }
  A3.srcShort = srcShort;
  A3.go = function (v) { go(v); };

  /* 掌握标记 */
  function markKey(sub, ch, pi) { return sub + "|" + ch + "|" + pi; }
  function isMarked(key) { return !!state.marks[key]; }
  function toggleMark(key, btn) {
    if (state.marks[key]) delete state.marks[key];
    else state.marks[key] = (new Date()).valueOf();
    write(LS.marks, state.marks);
    if (btn) {
      btn.classList.toggle("done", !!state.marks[key]);
      btn.textContent = state.marks[key] ? "✓ 已掌握" : "标记掌握";
    }
  }
  A3.toggleMark = toggleMark;
  A3.markKey = markKey;

  /* 考试日期 / 打卡 */
  function loadExamDate() { try { return localStorage.getItem(LS.exam) || DEFAULT_EXAM; } catch (e) { return DEFAULT_EXAM; } }
  function saveExamDate(v) { try { localStorage.setItem(LS.exam, v); } catch (e) {} }
  function loadCheckins() { return read(LS.checkin, []); }
  function saveCheckins(a) { write(LS.checkin, a); }
  function toggleCheckin(k) {
    var l = loadCheckins(), i = l.indexOf(k);
    if (i > -1) l.splice(i, 1); else l.push(k);
    l.sort();
    saveCheckins(l);
  }
  function streakOf(list) {
    var set = {}, d = new Date(), n = 0;
    list.forEach(function (k) { set[k] = 1; });
    if (!set[todayKey()]) d.setDate(d.getDate() - 1);
    while (set[dkey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function cdParts() {
    var ex = ymdToDate(loadExamDate());
    var target = ex ? new Date(ex.getFullYear(), ex.getMonth(), ex.getDate(), 8, 30, 0) : new Date();
    var diff = target - new Date();
    if (diff <= 0) return { days: 0, h: 0, m: 0, s: 0, past: true };
    return {
      days: Math.floor(diff / 86400000),
      h: Math.floor(diff % 86400000 / 3600000),
      m: Math.floor(diff % 3600000 / 60000),
      s: Math.floor(diff % 60000 / 1000),
      past: false
    };
  }
  function stopCdTimer() { if (cdTimer) { clearInterval(cdTimer); cdTimer = null; } }

  /* 统计 */
  function countSubject(s) {
    var total = 0, done = 0;
    s.chapters.forEach(function (ch) {
      ch.points.forEach(function (p, pi) {
        total++;
        if (isMarked(markKey(s.id, ch.id, pi))) done++;
      });
    });
    return { total: total, done: done };
  }
  function countGrand() {
    var t = 0, d = 0;
    K.subjects.forEach(function (s) { var c = countSubject(s); t += c.total; d += c.done; });
    return { total: t, done: d };
  }
  A3.countSubject = countSubject; A3.countGrand = countGrand;

  /* ================= 备份 · 换设备 ================= */
  A3.views.backup = function () {
    var marksN = Object.keys(state.marks || {}).length;
    var ansN = 0, wrongN = 0, favN = 0;
    try {
      var qb = JSON.parse(localStorage.getItem("k3_qbank_v1") || "{}");
      ansN = Object.keys(qb.ans || {}).length;
      wrongN = Object.keys(qb.wrong || {}).length;
      favN = Object.keys(qb.fav || {}).length;
    } catch (e) {}
    var h = '<section class="hero"><h2>💾 备份 · 换设备</h2>';
    h += "<p>进度只存在这台设备的浏览器里（平板、手机、电脑各一份）。要搬到另一台，导出这个文件，在新设备上导入即可。</p></section>";
    h += '<div class="mcard" style="padding:16px">';
    h += '<div class="bk-stats">已掌握 <b>' + marksN + "</b> 个考点 · 已答 <b>" + ansN + "</b> 题 · 错题 <b>" + wrongN + "</b> · 收藏 <b>" + favN + "</b></div>";
    h += '<div class="bk-row"><button class="qbtn primary" id="bkExport">⬇️ 导出进度文件</button>';
    h += '<label class="qbtn" id="bkPick" for="bkFile">⬆️ 导入进度文件</label><input type="file" id="bkFile" accept="application/json,.json" hidden />';
    h += "</div>";
    h += '<p class="bk-tip">导出的文件名形如「333进度-20261110.json」，微信发给另一台设备，打开背书房 → 这里 → 导入。<br/>导入会<strong>覆盖</strong>本机现有进度，题库本身不受影响。</p>';
    h += '<div class="bk-msg" id="bkMsg"></div>';
    h += "</div>";
    app.innerHTML = h;

    document.getElementById("bkExport").onclick = function () {
      var out = {};
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("k3_") === 0) out[k] = localStorage.getItem(k);
        }
      } catch (e) {}
      var msg = document.getElementById("bkMsg");
      if (!Object.keys(out).length) { msg.textContent = "这台浏览器没有可导出的进度（可能不允许本地存储）。"; return; }
      var blob = new Blob([JSON.stringify({ app: "333背书房", ver: 1, at: new Date().toISOString(), data: out }, null, 1)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      var d = new Date();
      a.download = "333进度-" + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} a.remove(); }, 4000);
      msg.textContent = "已导出 " + Object.keys(out).length + " 项数据，去「下载」文件夹里找。";
    };
    document.getElementById("bkFile").onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var msg = document.getElementById("bkMsg");
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var j = JSON.parse(String(fr.result));
          var data = (j && j.data) ? j.data : j;
          var n = 0;
          Object.keys(data).forEach(function (k) {
            if (k.indexOf("k3_") === 0 && typeof data[k] === "string") { localStorage.setItem(k, data[k]); n++; }
          });
          msg.textContent = "已导入 " + n + " 项，正在刷新…";
          setTimeout(function () { location.reload(); }, 700);
        } catch (e) { msg.textContent = "文件读不出来：不是背书房导出的进度文件？"; }
      };
      fr.readAsText(f);
    };
  };

  /* ================= 路由 ================= */
  function go(view) {
    stopCdTimer();
    if (state.view === "oral" && view !== "oral" && A3._oralStop) { try { A3._oralStop(); } catch (e) {} }
    state.prevView = state.view;
    state.view = view;
    Array.prototype.forEach.call(document.querySelectorAll(".navbtn"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".mtb-item"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });
    if (nav) nav.classList.remove("open");
    if (backdrop) backdrop.classList.remove("show");
    document.body.classList.remove("nav-open");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    try { var cur = (location.hash || "").replace(/^#/, ""); if (cur !== view && cur.split("/")[0] !== view) location.hash = view; } catch (e) {}
    render();
  }
  A3.go = go;

  function viewFromHash() {
    var h = (location.hash || "").replace(/^#/, "").split("/")[0];
    return (h && (A3.views[h] || h === "home")) ? h : null;
  }
  window.addEventListener("hashchange", function () {
    var v = viewFromHash();
    if (v && v !== state.view) go(v);
  });

  function render() {
    var fn = A3.views[state.view];
    try {
      var out = typeof fn === "function" ? fn() : renderHome();
      A3._booted = true;
      return out;
    } catch (e) {
      if (window.console) console.error("[333] 视图渲染出错", state.view, e);
      app.innerHTML = '<div class="empty">「' + esc(state.view) + '」渲染出错：' + esc(String(e && e.message || e)) + "</div>";
    }
  }
  A3.render = render;

  /* ================= 首页 ================= */
  function dailyCard(grand, cp) {
    var days = cp.past ? 1 : Math.max(1, cp.days);
    var left = Math.max(0, grand.total - grand.done);
    var perDay = Math.min(60, Math.max(6, Math.ceil(left / days)));
    var totalQ = ((K.qbank || {}).questions || []).length;
    var qb = {};
    try { qb = JSON.parse(localStorage.getItem("k3_qbank_v1") || "{}"); } catch (e) { qb = {}; }
    var ansN = Object.keys(qb.ans || {}).length;
    var wrongN = Object.keys(qb.wrong || {}).length;
    var qLeft = Math.max(0, totalQ - ansN);
    var qPerDay = Math.min(120, Math.max(10, Math.ceil(qLeft / days)));
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var t0v = t0.getTime();
    var todayPts = 0;
    Object.keys(state.marks).forEach(function (k) { if (+state.marks[k] >= t0v) todayPts++; });
    var todayQ = 0;
    (qb.runs || []).forEach(function (r) { if (r && +r.t >= t0v) todayQ += (+r.done || 0); });
    var pPct = Math.min(100, Math.round(todayPts / perDay * 100));
    var qPct = Math.min(100, Math.round(todayQ / qPerDay * 100));
    var h = '<section class="daily-card">';
    h += '<div class="dc-top"><b>🎯 今日任务</b><span>距初试 ' + (cp.past ? "—" : cp.days) + " 天 · 还剩 " + left + " 个考点 · " + qLeft + " 道题没刷</span></div>";
    h += '<div class="dc-rows">';
    h += '<div class="dc-row"><div class="dc-main"><b>背 ' + perDay + " 个考点</b><span>今天已背 " + todayPts + " 个</span></div>" +
      '<div class="dc-bar"><i style="width:' + pPct + '%"></i></div>' +
      '<button class="qbtn small" data-go="recite">去背</button></div>';
    h += '<div class="dc-row"><div class="dc-main"><b>刷 ' + qPerDay + " 道选择题</b><span>今天已刷 " + todayQ + " 道</span></div>" +
      '<div class="dc-bar"><i style="width:' + qPct + '%"></i></div>' +
      '<button class="qbtn small" id="dcQuiz">开刷</button></div>';
    h += '<div class="dc-row"><div class="dc-main"><b>复习错题</b><span>错题本还有 ' + wrongN + " 道</span></div>" +
      '<div class="dc-bar"><i style="width:' + (wrongN ? 100 : 0) + '%;background:linear-gradient(90deg,#e98a3c,#d9483f)"></i></div>' +
      '<button class="qbtn small" data-go="quizwrong">去复习</button></div>';
    h += "</div></section>";
    return h;
  }

  /* 复习队列：已掌握满 1 天的考点，按间隔（1/3/7/15 天）分批回流 */
  function reviewDue() {
    var now = Date.now(), out = [];
    Object.keys(state.marks).forEach(function (k) {
      var ts = +state.marks[k];
      if (!ts || ts > now) return;
      var days = Math.floor((now - ts) / 86400000);
      if (days < 1) return;
      var bc = days >= 15 ? 4 : days >= 7 ? 3 : days >= 3 ? 2 : 1;
      var p = k.split("|");
      out.push({ k: k, days: days, bc: bc, sub: p[0], ch: p[1] });
    });
    out.sort(function (a, b) { return b.bc - a.bc || b.days - a.days; });
    return out;
  }

  function reviewCard() {
    var due = reviewDue();
    if (due.length < 3) return "";           /* 刚开始背时不必打扰 */
    var nameOf = {};
    (K.subjects || []).forEach(function (s) {
      (s.chapters || []).forEach(function (c) { nameOf[s.id + "|" + c.id] = (s.short || s.name) + " · " + c.name; });
    });
    var groups = [], gi = {};
    due.forEach(function (d) {
      var key = d.sub + "|" + d.ch;
      if (!gi[key]) { gi[key] = { sub: d.sub, ch: d.ch, n: 0, days: d.days }; groups.push(gi[key]); }
      gi[key].n++;
    });
    groups.sort(function (a, b) { return b.n - a.n || b.days - a.days; });
    var shown = groups.slice(0, 6);
    var h = '<section class="review-card">';
    h += '<div class="rv-top"><b>🔁 该复习了</b><span>' + due.length + " 个已掌握的考点在等你，最早 " + due[0].days + " 天前背的</span></div>";
    h += '<div class="rv-chips">';
    shown.forEach(function (g) {
      h += '<button class="rv-chip" data-rsub="' + esc(g.sub) + '" data-rch="' + esc(g.ch) + '">' +
        esc(nameOf[g.sub + "|" + g.ch] || "章节") + '<i>' + g.n + "</i></button>";
    });
    h += "</div>";
    if (groups.length > shown.length) h += '<div class="rv-more">另有 ' + (groups.length - shown.length) + " 个章节也有待复习考点</div>";
    h += '<div class="rv-tip">点章节跳过去重背一遍；复习完再点「标记掌握」，计时会从今天重新开始（1 → 3 → 7 → 15 天）。</div>';
    h += "</section>";
    return h;
  }

  function renderHome() {
    var grand = countGrand();
    var pct = grand.total ? Math.round(grand.done / grand.total * 100) : 0;
    var list = loadCheckins();
    var streak = streakOf(list);
    var cp = cdParts();
    var ex = loadExamDate();
    var billCount = 0;
    (K.bills.countries || []).forEach(function (c) { billCount += c.items.length; });
    var mustCount = (K.q200 || []).filter(function (q) { return q.must; }).length;

    var html = "";
    html += '<section class="hero home-hero">';
    html += "<h2>📖 333 教育综合背书房</h2>";
    html += "<p>把《大纲考点轻松记》拆成一条条能打卡的考点，把冬青 200 题做成翻一张就想答一张的卡片——背得进去、说得出来、写得满卷。</p>";
    html += '<div class="quick"><button data-go="recite">开始背书</button><button data-go="q200">刷 200 题</button><button data-go="billsquiz">法案选择题</button></div>';
    html += "</section>";

    html += '<div class="stat-row">';
    html += '<div class="stat"><b>' + (cp.past ? "—" : cp.days) + "</b><span>距初试（天）</span></div>";
    html += '<div class="stat"><b>' + grand.total + "</b><span>考点总数</span></div>";
    html += '<div class="stat"><b>' + grand.done + "</b><span>已掌握</span></div>";
    html += '<div class="stat"><b>' + pct + "%</b><span>背书进度</span></div>";
    html += '<div class="stat"><b>' + billCount + "</b><span>外教法案</span></div>";
    html += '<div class="stat"><b>' + streak + "</b><span>连续打卡</span></div>";
    html += "</div>";

    /* 今日任务卡 + 复习队列 */
    html += dailyCard(grand, cp);
    html += reviewCard();

    html += '<h2 class="section-title">今天从哪儿开始</h2>';
    html += '<div class="k3-quick">';
    var qn = ((K.qbank || {}).questions || []).length;
    var cards = [
      { v: "oral", ic: "🎙", t: "听我背书 · 抽查", d: "随机抽一题，你背它听，说完给分：说中哪些采分点、还差哪些", n: "老师抽查" },
      { v: "quiz", ic: "🎯", t: "刷题 · 选择题", d: "按章节刷、乱序随机、模考 100 题，错题收藏笔记都在本地", n: qn + " 题" },
      { v: "recite", ic: "📚", t: "大纲考点背书", d: "四科 + 补充资料，考点按「含义 / 要求」两栏背，掌握一条勾一条", n: grand.done + "/" + grand.total },
      { v: "bills", ic: "📜", t: "外教史 59 法案", d: "英法德美俄日六国法案一张表，★ 论述点、× 易错点都标好了", n: billCount + " 条" },
      { v: "billsquiz", ic: "✅", t: "法案选择题", d: "年份 / 国别 / 内容 / 影响四类干扰项，做错立刻看解析", n: (K.billsQuiz || []).length + " 题" },
      { v: "q200", ic: "🗂", t: "冬青 200 题", d: "点开卡片看题干、答题框架、要点与评分点", n: "★必刷 " + mustCount },
      { v: "material70", ic: "🕳", t: "材料题 70 考点", d: "材料题常考的 70 个点，练「材料—原理」的对应手感", n: (K.material70 || []).length + " 个" },
      { v: "method", ic: "🧭", t: "大题思路总纲", d: "名词解释 / 简答 / 论述 / 材料题的答题骨架与时间分配", n: "先看这个" },
      { v: "hot", ic: "📈", t: "真题考点榜", d: "把 3 套真题 + 14 套模拟卷按考点排热度，哪条反复考一目了然", n: "命中排行" }
    ];
    cards.forEach(function (c) {
      html += '<button class="k3-quick-card" data-go="' + c.v + '">';
      html += '<span class="k3q-n">' + esc(c.n) + "</span>";
      html += '<div class="k3q-ic">' + c.ic + "</div>";
      html += '<div class="k3q-t">' + esc(c.t) + "</div>";
      html += '<div class="k3q-d">' + esc(c.d) + "</div></button>";
    });
    html += "</div>";

    html += '<h2 class="section-title">四科进度</h2>';
    html += '<div class="prog-list">';
    K.subjects.forEach(function (s) {
      var c = countSubject(s);
      var sp = c.total ? Math.round(c.done / c.total * 100) : 0;
      html += '<div class="prog-row" style="--c:' + (s.color || "#0f6e5c") + '">';
      html += '<div class="prog-name"><span class="badge" style="background:' + (s.color || "#0f6e5c") + '">' + esc(s.short) + "</span>" + esc(s.name) + "</div>";
      html += '<div class="prog-bar"><div class="prog-fill" style="width:' + sp + '%"></div></div>';
      html += '<div class="prog-num">' + c.done + "/" + c.total + "</div></div>";
    });
    html += "</div>";

    html += '<div class="home-ci"><div class="home-ci-left"><div class="home-ci-days"><b>' + (cp.past ? "—" : cp.days) + "</b>天</div>";
    html += '<div class="home-ci-meta">初试 ' + esc(ex) + " · 已打卡 " + list.length + " 天</div></div>";
    html += '<a class="home-ci-link" data-go="checkin">去打卡 / 改日期 →</a></div>';

    app.innerHTML = html;
    bindGo();
    Array.prototype.forEach.call(app.querySelectorAll(".rv-chip"), function (b) {
      b.addEventListener("click", function () {
        state.subject = b.getAttribute("data-rsub");
        state.filter = "";
        A3._openCh = b.getAttribute("data-rch");
        go("recite");
      });
    });
    var dcq = document.getElementById("dcQuiz");
    if (dcq) dcq.addEventListener("click", function () {
      var days = Math.max(1, cp.past ? 1 : cp.days);
      var qLeft = ((K.qbank || {}).questions || []).length;
      if (A3.quizStartSet) A3.quizStartSet({ n: Math.min(50, Math.max(10, Math.ceil(qLeft / days))), random: true });
      else go("quiz");
    });
  }

  function bindGo() {
    Array.prototype.forEach.call(app.querySelectorAll("[data-go]"), function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); go(b.getAttribute("data-go")); });
    });
  }
  A3.bindGo = bindGo;

  /* ================= 倒计时 · 打卡 ================= */
  A3.views.checkin = function () {
    stopCdTimer();
    var now = new Date();
    if (state.ciYear == null) { state.ciYear = now.getFullYear(); state.ciMonth = now.getMonth(); }
    var exam = loadExamDate();
    var list = loadCheckins();
    var set = {};
    list.forEach(function (k) { set[k] = 1; });
    var tk = todayKey();
    var cp = cdParts();
    var streak = streakOf(list);

    var monthPrefix = state.ciYear + "-" + pad2(state.ciMonth + 1) + "-";
    var monthDone = list.filter(function (k) { return k.indexOf(monthPrefix) === 0; }).length;
    var dim = new Date(state.ciYear, state.ciMonth + 1, 0).getDate();
    var firstWd = new Date(state.ciYear, state.ciMonth, 1).getDay();
    var today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var passedDays = 0;
    for (var i = 1; i <= dim; i++) if (new Date(state.ciYear, state.ciMonth, i).getTime() <= today0) passedDays++;

    var QUOTES = [
      "背一页是一页：考场不看苦劳，只认你真正写得出来的。",
      "333 的分数不在书里，在你合上书还能复述的那几句话里。",
      "连续打卡不是形式，是把「明天再背」改成「现在就背」。",
      "今天多背的一个采分点，可能就是出分时的那一分。"
    ];
    var quote = QUOTES[list.length % QUOTES.length];

    var html = "";
    html += '<section class="hero ci-hero"><h2>⏳ 倒计时 · 每日打卡</h2>';
    html += "<p>考试日期与打卡记录只存在你自己的浏览器里，不上传任何信息。每天按一下，把「今天也背了」变成看得见的连续记录。</p></section>";

    html += '<div class="cd-card"><div class="cd-left">';
    html += '<div class="cd-days"><b id="cdDays">' + cp.days + "</b><i>天</i></div>";
    html += '<div class="cd-clock" id="cdClock">' + pad2(cp.h) + ":" + pad2(cp.m) + ":" + pad2(cp.s) + "</div>";
    html += '<div class="cd-cap">' + (cp.past ? "初试已开考或已结束，稳住心态。" : "距 <b>" + esc(exam) + "</b> 上午 8:30 开考") + "</div></div>";
    html += '<div class="cd-right"><div class="cd-row"><label for="cdDate">考试日期</label><input type="date" id="cdDate" value="' + esc(exam) + '" /></div>';
    html += '<div class="cd-presets"><button class="cd-chip" data-cd="2026-12-19">27 届 · 2026/12/19</button>';
    html += '<button class="cd-chip" data-cd="2027-12-25">28 届 · 2027/12/25</button>';
    html += '<button class="cd-chip ghost" data-cd="' + DEFAULT_EXAM + '">恢复默认</button></div>';
    html += '<div class="cd-note">改完日期即时生效，只影响这台设备。</div></div></div>';

    html += '<div class="ci-grid"><div class="ci-main">';
    html += '<div class="ci-head"><div class="ci-title">🔥 每日打卡</div>';
    html += '<div class="ci-sub">连续 <b>' + streak + "</b> 天 · 累计 <b>" + list.length + "</b> 天 · 本月 <b>" + monthDone + "/" + passedDays + "</b> 天</div></div>";
    html += '<div class="ci-actions">';
    if (set[tk]) html += '<button class="ci-btn done" disabled>✓ 今天已打卡</button>';
    else html += '<button class="ci-btn" id="ciToggle">🔥 点一下 · 立即打卡</button>';
    html += '<span class="ci-tip">今天打上就是成功，一天只记一次；漏打的往期可在日历上补卡。</span></div>';

    html += '<div class="ci-cal-head"><button class="ci-nav" data-cim="-1" aria-label="上个月">‹</button>';
    html += '<div class="ci-cal-title">' + state.ciYear + " 年 " + (state.ciMonth + 1) + " 月</div>";
    html += '<button class="ci-nav" data-cim="1" aria-label="下个月">›</button></div>';
    html += '<div class="ci-cal">';
    ["日", "一", "二", "三", "四", "五", "六"].forEach(function (w) { html += '<div class="ci-wd">' + w + "</div>"; });
    for (var b = 0; b < firstWd; b++) html += '<div class="ci-cell empty"></div>';
    for (var d = 1; d <= dim; d++) {
      var k = state.ciYear + "-" + pad2(state.ciMonth + 1) + "-" + pad2(d);
      var isFuture = new Date(state.ciYear, state.ciMonth, d).getTime() > today0;
      var cls = "ci-cell";
      if (set[k]) cls += " checked";
      if (k === tk) cls += " today";
      if (isFuture) cls += " future";
      if (set[k]) html += '<button class="' + cls + '"' + (isFuture ? " disabled" : ' data-ci="' + k + '"') + "><span>" + d + '</span><i class="ci-ck" aria-hidden="true">✓</i></button>';
      else html += '<button class="' + cls + '"' + (isFuture ? " disabled" : ' data-ci="' + k + '"') + ">" + d + "</button>";
    }
    html += "</div>";
    html += '<div class="ci-legend"><span class="lg checked"></span>已打卡<span class="lg today"></span>今天<span class="lg"></span>未打卡</div></div>';

    html += '<div class="ci-side">';
    html += '<div class="ci-tile"><span>当前连续</span><b>' + streak + "<i>天</i></b></div>";
    html += '<div class="ci-tile"><span>累计打卡</span><b>' + list.length + "<i>天</i></b></div>";
    html += '<div class="ci-tile"><span>本月打卡</span><b>' + monthDone + "<i>天</i></b></div>";
    html += '<div class="ci-quote">' + esc(quote) + "</div></div></div>";

    app.innerHTML = html;

    var tgl = document.getElementById("ciToggle");
    if (tgl) tgl.addEventListener("click", function () {
      toggleCheckin(tk);
      A3.views.checkin();
      toast("打卡成功 · 已打卡 " + loadCheckins().length + " 天");
    });
    var dIn = document.getElementById("cdDate");
    if (dIn) dIn.addEventListener("change", function () {
      if (ymdToDate(dIn.value)) { saveExamDate(dIn.value); A3.views.checkin(); }
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-cd]"), function (b) {
      b.addEventListener("click", function () { saveExamDate(b.getAttribute("data-cd")); A3.views.checkin(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-ci]"), function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-ci");
        var was = b.classList.contains("checked");
        if (was && k === tk) { toast("今天已经打过卡啦 ✓"); return; }
        toggleCheckin(k);
        A3.views.checkin();
        if (!was) toast(k === tk ? "打卡成功" : "补卡成功 · " + fmtDay(k));
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-cim]"), function (b) {
      b.addEventListener("click", function () {
        var m = state.ciMonth + parseInt(b.getAttribute("data-cim"), 10), y = state.ciYear;
        if (m < 0) { m = 11; y--; }
        if (m > 11) { m = 0; y++; }
        state.ciMonth = m; state.ciYear = y;
        A3.views.checkin();
      });
    });

    if (!cp.past) {
      cdTimer = setInterval(function () {
        var q = cdParts();
        var dEl = document.getElementById("cdDays"), cEl = document.getElementById("cdClock");
        if (!dEl || !cEl) { stopCdTimer(); return; }
        dEl.textContent = q.days;
        cEl.textContent = pad2(q.h) + ":" + pad2(q.m) + ":" + pad2(q.s);
        if (q.past) stopCdTimer();
      }, 1000);
    }
  };

  /* ================= 大纲考点背书 ================= */
  A3.views.recite = function () {
    var sub = K.subjects.filter(function (s) { return s.id === state.subject; })[0] || K.subjects[0];
    if (!sub) { app.innerHTML = '<div class="empty">数据尚未载入。</div>'; return; }

    var html = "";
    html += '<section class="hero"><h2>📚 大纲考点背书</h2>';
    html += "<p>按「考点 → 含义 → 要求」三段式背。蓝色是必背关键词，红色是易错硬点；背完一条点「标记掌握」，进度会记在首页。</p></section>";

    html += '<div class="toolbar">';
    K.subjects.forEach(function (s) {
      html += '<button class="chip ' + (s.id === sub.id ? "active" : "") + '" data-sub="' + s.id + '">' + esc(s.short) + "</button>";
    });
    html += '<button class="chip ' + (state.onlyTodo ? "active" : "") + '" id="onlyTodo">只看未掌握</button>';
    html += "</div>";

    if (sub.desc) {
      html += '<div class="mcard" style="padding:12px 15px;margin-bottom:14px"><p class="lead" style="margin:0">' + md(sub.desc) + "</p></div>";
    }

    html += '<div class="filter-bar">';
    html += '<input type="text" id="chapFilter" placeholder="在本科目内搜索考点（如「癸卯学制」「启发性原则」「最近发展区」）" />';
    html += '<span class="filter-count" id="chapCount"></span>';
    html += "</div>";

    html += '<div id="chapterList">';
    var shown = 0;
    sub.chapters.forEach(function (ch, ci) {
      var pts = ch.points.filter(function (p, pi) {
        var key = markKey(sub.id, ch.id, pi);
        if (state.onlyTodo && isMarked(key)) return false;
        if (!state.filter) return true;
        var hay = (p.t + " " + (p.p || []).join(" ") + " " + (p.req || []).join(" ") + " " + (p.tip || "")).toLowerCase();
        return hay.indexOf(state.filter) > -1;
      });
      if (!pts.length) return;
      shown++;
      var deep = /^#recite\/([a-z0-9-]+)/i.exec(location.hash || "");
      var wantOpen = (deep && deep[1] === ch.id) || (window.A3._openCh === ch.id);
      html += '<div class="chapter ' + (state.filter || wantOpen ? "open" : "") + '" data-ch="' + ch.id + '">';
      html += '<div class="chapter-head" style="--c:' + (sub.color || "#0f6e5c") + '">';
      html += '<span class="num">' + (ci + 1) + "</span><h3>" + esc(ch.name) + "</h3>";
      html += '<span class="arrow">▶</span></div>';
      html += '<div class="chapter-body">';
      ch.points.forEach(function (p, pi) {
        if (pts.indexOf(p) < 0) return;
        var key = markKey(sub.id, ch.id, pi);
        var done = isMarked(key);
        html += '<div class="point" data-pi="' + pi + '">';
        html += '<div class="point-q"><span class="dot">●</span><span>' + md(p.t) + "</span>";
        var psrc = (window.K3_PSRC || {})[sub.id + "|" + ch.id + "|" + pi];
        if (psrc && psrc.length) {
          psrc.forEach(function (s) {
            var nm = srcShort(s.n);
            html += '<button class="pt-src" data-src-book="' + esc(s.b) + '" data-src-page="' + s.p +
              '" data-src-title="' + esc(p.t) + '" title="' + esc(s.n) + ' 第 ' + s.p + ' 页">📖 ' +
              esc(nm) + ' P' + s.p + '</button>';
          });
        }
        html += '<button class="mark-btn ' + (done ? "done" : "") + '" data-key="' + esc(key) + '">' + (done ? "✓ 已掌握" : "标记掌握") + "</button></div>";
        html += '<div class="k3-point-body">';
        if (p.p && p.p.length) {
          html += '<div class="k3-sec"><span class="k3-lbl">含义</span><ul class="point-p">';
          p.p.forEach(function (line) { html += "<li>" + md(line) + "</li>"; });
          html += "</ul></div>";
        }
        if (p.req && p.req.length) {
          html += '<div class="k3-sec"><span class="k3-lbl req">要求</span><ul class="point-p">';
          p.req.forEach(function (line) { html += "<li>" + md(line) + "</li>"; });
          html += "</ul></div>";
        }
        if (p.tip) html += '<div class="k3-tip">💡 ' + md(p.tip) + "</div>";
        html += "</div>";
        var pl = (window.K3_PLINK || {})[sub.id + "|" + ch.id + "|" + pi];
        if (pl && ((pl.q && pl.q.length) || (pl.z && pl.z.length))) {
          html += '<div class="pt-links">';
          var zs = pl.z || [];
          var zReal = zs.filter(function (z) { return /^20\d\d$/.test(String(z[0])); });
          var zMock = zs.filter(function (z) { return !/^20\d\d$/.test(String(z[0])); });
          if (zReal.length) {
            html += '<div class="ptl-row"><span class="ptl-lbl real">📑 真题命中 ' + zReal.length + "</span>";
            zReal.forEach(function (z) { html += ztChip(z); });
            html += "</div>";
          }
          if (zMock.length) {
            html += '<div class="ptl-row"><span class="ptl-lbl mock">🧪 模拟题命中 ' + zMock.length + "</span>";
            zMock.forEach(function (z) { html += ztChip(z); });
            html += "</div>";
          }
          if (pl.q && pl.q.length) {
            html += '<div class="ptl-row"><span class="ptl-lbl">🎯 相关练习</span>';
            html += '<button class="pt-link q" data-ids="' + esc(pl.q.join(",")) + '" data-title="' + esc(p.t) + '">刷这 ' + pl.q.length + " 道</button>";
            html += "</div>";
          }
          html += "</div>";
        }
        html += "</div>";
      });
      html += "</div></div>";
    });
    html += "</div>";
    if (!shown) html += '<div class="empty">没有匹配的考点，换个关键词或关掉「只看未掌握」。</div>';

    app.innerHTML = html;
    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-sub]"), function (c) {
      c.addEventListener("click", function () { state.subject = c.getAttribute("data-sub"); state.filter = ""; A3.views.recite(); });
    });
    var ot = document.getElementById("onlyTodo");
    if (ot) ot.addEventListener("click", function () { state.onlyTodo = !state.onlyTodo; A3.views.recite(); });
    Array.prototype.forEach.call(app.querySelectorAll(".chapter-head"), function (h) {
      h.addEventListener("click", function () { h.parentNode.classList.toggle("open"); });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".mark-btn"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); toggleMark(b.getAttribute("data-key"), b); });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".pt-src"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        if (A3.openSrc) A3.openSrc(b.getAttribute("data-src-book"), parseInt(b.getAttribute("data-src-page"), 10), b.getAttribute("data-src-title"));
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".pt-link.q"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var ids = (b.getAttribute("data-ids") || "").split(",").filter(Boolean);
        if (A3.quizFromIds) A3.quizFromIds(ids, (b.getAttribute("data-title") || "") + " · 相关练习");
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".pt-link.z"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        A3._ztFocus = { tab: b.getAttribute("data-t"), no: +b.getAttribute("data-no") };
        if (A3.ztOpen) A3.ztOpen(b.getAttribute("data-y"), b.getAttribute("data-t"));
        else go("zhenti");
      });
    });
    /* 从一页纸/搜索跳进来时，滚到对应考点并高亮一下 */
    if (A3._openPt != null) {
      var want = A3._openPt;
      A3._openPt = null;
      setTimeout(function () {
        var pt = document.querySelector('.point[data-pi="' + want + '"]');
        if (!pt) return;
        try { pt.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { try { pt.scrollIntoView(); } catch (e2) {} }
        pt.classList.add("flash");
        setTimeout(function () { pt.classList.remove("flash"); }, 1600);
      }, 80);
    }
    var f = document.getElementById("chapFilter");
    if (f) {
      f.value = state.filter;
      f.addEventListener("input", function () { state.filter = f.value.trim().toLowerCase(); A3.views.recite(); });
    }
    var count = document.getElementById("chapCount");
    if (count) count.textContent = "共 " + shown + " 章 · " + countPoints(sub) + " 个考点";
  };
  function countPoints(sub) {
    var n = 0;
    sub.chapters.forEach(function (c) { n += c.points.length; });
    return n;
  }

  /* ================= 考点速览（扁平） ================= */
  A3.views.arsenal = function () {
    var sub = K.subjects.filter(function (s) { return s.id === state.arsenalSubject; })[0] || K.subjects[0];
    var html = "";
    html += '<section class="hero"><h2>🎒 考点速览</h2>';
    html += "<p>把整本书压成一条条「标题 + 要点」，考前扫一遍找漏。点开即看全文，勾一下就记掌握。</p></section>";
    html += '<div class="toolbar">';
    K.subjects.forEach(function (s) {
      html += '<button class="chip ' + (s.id === sub.id ? "active" : "") + '" data-sub="' + s.id + '">' + esc(s.short) + "</button>";
    });
    html += "</div>";
    html += '<div class="toolbar">';
    [["all", "全部"], ["todo", "未掌握"], ["done", "已掌握"]].forEach(function (f) {
      html += '<button class="chip ' + (state.arsenalFilter === f[0] ? "active" : "") + '" data-f="' + f[0] + '">' + f[1] + "</button>";
    });
    html += "</div>";

    var count = 0;
    html += '<div id="arsList">';
    sub.chapters.forEach(function (ch, ci) {
      var items = "";
      ch.points.forEach(function (p, pi) {
        var key = markKey(sub.id, ch.id, pi);
        if (state.arsenalFilter === "done" && !isMarked(key)) return;
        if (state.arsenalFilter === "todo" && isMarked(key)) return;
        count++;
        items += '<div class="arsenal-item ' + (isMarked(key) ? "done" : "") + '">';
        items += '<div class="arsenal-q"><span>' + md(p.t) + "</span>";
        items += '<button class="mark-btn mini ' + (isMarked(key) ? "done" : "") + '" data-key="' + esc(key) + '">' + (isMarked(key) ? "✓ 已掌握" : "标记") + "</button></div>";
        items += '<ul class="point-p">' + (p.p || []).map(function (l) { return "<li>" + md(l) + "</li>"; }).join("") + "</ul>";
        if (p.req && p.req.length) items += '<ul class="point-p k3-req">' + p.req.map(function (l) { return "<li>" + md(l) + "</li>"; }).join("") + "</ul>";
        items += "</div>";
      });
      if (items) html += '<div class="arsenal-ch"><div class="arsenal-ch-title">' + (ci + 1) + ". " + esc(ch.name) + "</div>" + items + "</div>";
    });
    html += "</div>";
    if (!count) html += '<div class="empty">该筛选下暂无内容。</div>';

    app.innerHTML = html;
    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-sub]"), function (c) {
      c.addEventListener("click", function () { state.arsenalSubject = c.getAttribute("data-sub"); A3.views.arsenal(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-f]"), function (c) {
      c.addEventListener("click", function () { state.arsenalFilter = c.getAttribute("data-f"); A3.views.arsenal(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".mark-btn"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); toggleMark(b.getAttribute("data-key"), b); });
    });
  };

/* ================= 闪卡 ================= */
  function askOf(t) {
    t = String(t || "").trim();
    if (/[？?]$/.test(t)) return t;
    if (/^(简述|试述|论述|分析|比较|如何|为什么|谈谈)/.test(t)) return t + "。";
    if (t.length >= 14) return "请完整回答：" + t;
    return "什么是「" + t + "」？请说出它的含义、内容与要点。";
  }
  function mdEsc(x) {
    return String(x).replace(/[<>&]/g, function (c) { return c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"; });
  }
  var SUB_CODE = { "edu-principle": "ep", "edu-china": "cn", "edu-foreign": "wj", "edu-psych": "xl" };
  function subjName(id) {
    var n = "";
    K.subjects.forEach(function (s) { if (s.id === id) n = s.short || s.name; });
    return n || id;
  }
  function buildFlashSet(src) {
    var sub = state.flashSub || "all";
    var chId = state.flashCh || "";
    var qsub = state.flashQSub || "all";
    var items = [];
    if (src === "point" || src === "all") {
      K.subjects.forEach(function (s) {
        if (sub !== "all" && s.id !== sub) return;
        s.chapters.forEach(function (ch) {
          if (chId && ch.id !== chId) return;
          ch.points.forEach(function (p) {
            var back = (p.p || []).join("\\n");
            if (p.req && p.req.length) back += (back ? "\\n" : "") + "【要求】" + p.req.join("\\n");
            items.push({ front: mdEsc(askOf(p.t)), back: back, tag: s.short + " · " + ch.name, color: s.color || "#0f6e5c" });
          });
        });
      });
    }
    if (src === "bill" || src === "all") {
      (K.bills.countries || []).forEach(function (c) {
        c.items.forEach(function (b) {
          var back = "【内容】" + (b.content || []).join("；");
          if (b.impact && b.impact.length) back += "\\n【影响】" + b.impact.join("；");
          items.push({ front: c.name + "《" + b.name + "》" + (b.year ? "（" + b.year + "）" : ""), back: back, tag: "外教法案 · " + (c.short || c.name), color: "#c08a2e" });
        });
      });
    }
    if (src === "q200" || src === "all") {
      (K.q200 || []).forEach(function (q) {
        if (qsub !== "all" && q.subjId !== (SUB_CODE[qsub] || qsub)) return;
        var back = q.frame && q.frame.length ? "【思路】" + q.frame.join(" → ") : "";
        if (q.points && q.points.length) back += (back ? "\\n" : "") + "【要点】" + q.points.slice(0, 6).join("；");
        items.push({ front: q.no + ". " + q.q, back: back, tag: "200 题 · " + subjName(q.subjId), color: "#2b6ea6" });
      });
    }
    return shuffle(items.slice());
  }

  A3.views.flashcards = function (src) {
    src = src || (state.flash ? state.flash.src : "point");
    if (!state.flash || state.flash.src !== src) {
      state.flash = { src: src, idx: 0, items: buildFlashSet(src), known: 0 };
    }
    var fs = state.flash;
    var html = "";
    html += '<section class="hero fc-hero"><h2>🃏 闪卡 · 主动回忆</h2>';
    html += "<p>先看正面自己复述，再翻面核对。「认识」计一分，「不认识」翻回去重看——遮住答案自测，比反复读记得牢。</p></section>";
    html += '<div class="toolbar">';
    [["point", "考点"], ["bill", "法案"], ["q200", "200 题"], ["all", "全部混合"]].forEach(function (s) {
      html += '<button class="chip ' + (fs.src === s[0] ? "active" : "") + '" data-fc="' + s[0] + '">' + s[1] + "</button>";
    });
    html += "</div>";

    var usePoint = fs.src === "point" || fs.src === "all";
    var useQ = fs.src === "q200" || fs.src === "all";
    if (usePoint || useQ) {
      var sub = state.flashSub || "all";
      html += '<div class="fc-filters">';
      html += '<div class="chips-row"><span class="fc-lbl">书</span>';
      html += '<button class="chip ' + (sub === "all" ? "active" : "") + '" data-fs="all">四本随机</button>';
      K.subjects.forEach(function (s) {
        html += '<button class="chip ' + (sub === s.id ? "active" : "") + '" data-fs="' + s.id + '">' + esc(s.short || s.name) + "</button>";
      });
      html += "</div>";
      var chapters = [];
      if (sub !== "all") {
        K.subjects.forEach(function (s) { if (s.id === sub) chapters = s.chapters; });
      }
      if (chapters.length) {
        html += '<div class="fc-lbl-row"><span class="fc-lbl">章</span><select id="fcCh">';
        html += '<option value="">全书随机</option>';
        chapters.forEach(function (c) {
          html += '<option value="' + c.id + '"' + (state.flashCh === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>";
        });
        html += "</select></div>";
      }
      if (fs.src === "q200") {
        var qsub = state.flashQSub || "all";
        html += '<div class="chips-row"><span class="fc-lbl">200题</span>';
        html += '<button class="chip ' + (qsub === "all" ? "active" : "") + '" data-fqs="all">全部</button>';
        K.subjects.forEach(function (s) {
          html += '<button class="chip ' + (qsub === s.id ? "active" : "") + '" data-fqs="' + s.id + '">' + esc(s.short || s.name) + "</button>";
        });
        html += "</div>";
      }
      html += "</div>";
    }

    if (!fs.items.length) {
      app.innerHTML = html + '<div class="empty">该筛选下没有卡片，换个书/章试试。</div>';
      bindFlashFilters(fs);
      return;
    }
    var it = fs.items[fs.idx];
    html += '<div class="fc-progress">第 ' + (fs.idx + 1) + " / " + fs.items.length + " 张 · 已认识 " + fs.known + " 张</div>";
    html += '<div class="fc-card" id="fcCard" style="--c:' + (it.color || "#0f6e5c") + '">';
    html += '<div class="fc-tag">' + esc(it.tag) + "</div>";
    html += '<div class="fc-front" id="fcFront">' + md(it.front) + "</div>";
    html += '<div class="fc-back" id="fcBack" style="display:none">' + md(it.back).replace(/\\n/g, "<br>") + "</div>";
    html += '<div class="fc-flip-hint" id="fcHint">👆 点击卡片翻面</div></div>';
    html += '<div class="fc-actions">';
    html += '<button class="ghost-btn" id="fcPrev">◀ 上一张</button>';
    html += '<button class="big-btn" id="fcKnown" style="width:auto;padding:12px 22px">✅ 认识</button>';
    html += '<button class="big-btn alt" id="fcUnknown" style="width:auto;padding:12px 22px">❌ 不认识</button>';
    html += '<button class="ghost-btn" id="fcNext">下一张 ▶</button></div>';
    html += '<button class="ghost-btn" id="fcShuffle">🔀 重新洗牌</button>';
    app.innerHTML = html;

    var card = document.getElementById("fcCard");
    function flip() {
      var f = document.getElementById("fcFront"), b = document.getElementById("fcBack"), h = document.getElementById("fcHint");
      var showing = f.style.display !== "none";
      f.style.display = showing ? "none" : "block";
      b.style.display = showing ? "block" : "none";
      h.textContent = showing ? "👀 这是答案，点卡片返回" : "👆 点击卡片翻面";
    }
    card.addEventListener("click", flip);
    document.getElementById("fcPrev").addEventListener("click", function () { fs.idx = (fs.idx - 1 + fs.items.length) % fs.items.length; A3.views.flashcards(fs.src); });
    document.getElementById("fcNext").addEventListener("click", function () { fs.idx = (fs.idx + 1) % fs.items.length; A3.views.flashcards(fs.src); });
    document.getElementById("fcShuffle").addEventListener("click", function () { state.flash = { src: fs.src, idx: 0, items: shuffle(fs.items.slice()), known: 0 }; A3.views.flashcards(fs.src); });
    document.getElementById("fcKnown").addEventListener("click", function () {
      fs.known++;
      if (fs.idx < fs.items.length - 1) fs.idx++;
      A3.views.flashcards(fs.src);
    });
    document.getElementById("fcUnknown").addEventListener("click", function () { flip(); });
    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-fc]"), function (b) {
      b.addEventListener("click", function () { A3.views.flashcards(b.getAttribute("data-fc")); });
    });
    bindFlashFilters(fs);
  };

  function bindFlashFilters(fs) {
    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-fs]"), function (b) {
      b.addEventListener("click", function () {
        state.flashSub = b.getAttribute("data-fs");
        state.flashCh = "";
        state.flash = { src: fs.src, idx: 0, items: buildFlashSet(fs.src), known: 0 };
        A3.views.flashcards(fs.src);
      });
    });
    var sel = document.getElementById("fcCh");
    if (sel) sel.addEventListener("change", function () {
      state.flashCh = sel.value;
      state.flash = { src: fs.src, idx: 0, items: buildFlashSet(fs.src), known: 0 };
      A3.views.flashcards(fs.src);
    });
    Array.prototype.forEach.call(app.querySelectorAll(".chip[data-fqs]"), function (b) {
      b.addEventListener("click", function () {
        state.flashQSub = b.getAttribute("data-fqs");
        state.flash = { src: fs.src, idx: 0, items: buildFlashSet(fs.src), known: 0 };
        A3.views.flashcards(fs.src);
      });
    });
  }

  /* ================= 进度 ================= */
  A3.views.progress = function () {
    var grand = countGrand();
    var pct = grand.total ? Math.round(grand.done / grand.total * 100) : 0;
    var qs = read(LS.quiz, { done: 0, right: 0 });
    var html = "";
    html += '<section class="hero prog-hero"><h2>📊 背书进度</h2>';
    html += "<p>数据全部在你的浏览器本地。进度条涨一点，考场上能写出来的就多一点。</p></section>";
    html += '<div class="prog-overall"><div class="prog-ring" style="--p:' + pct + '"><span>' + pct + "%</span></div>";
    html += '<div class="prog-overall-text">已掌握 ' + grand.done + " / " + grand.total + " 个考点</div></div>";
    html += '<div class="prog-list">';
    K.subjects.forEach(function (s) {
      var c = countSubject(s);
      var sp = c.total ? Math.round(c.done / c.total * 100) : 0;
      html += '<div class="prog-row" style="--c:' + (s.color || "#0f6e5c") + '">';
      html += '<div class="prog-name"><span class="badge" style="background:' + (s.color || "#0f6e5c") + '">' + esc(s.short) + "</span>" + esc(s.name) + "</div>";
      html += '<div class="prog-bar"><div class="prog-fill" style="width:' + sp + '%"></div></div>';
      html += '<div class="prog-num">' + c.done + "/" + c.total + "</div></div>";
    });
    html += "</div>";
    html += '<div class="prog-extra">';
    html += '<div class="prog-card"><b>法案选择题</b><span>' + (qs.done ? qs.right + " / " + qs.done : "暂无") + "</span></div>";
    html += '<div class="prog-card"><b>打卡天数</b><span>' + loadCheckins().length + "</span></div>";
    html += '<div class="prog-card"><b>连续打卡</b><span>' + streakOf(loadCheckins()) + "</span></div>";
    html += "</div>";
    html += '<button class="ghost-btn danger-btn" id="resetProgress">🗑 清空掌握记录与测验成绩</button>';
    app.innerHTML = html;
    document.getElementById("resetProgress").addEventListener("click", function () {
      if (confirm("确定清空所有「标记掌握」记录与法案测验成绩吗？此操作不可撤销。")) {
        state.marks = {};
        write(LS.marks, {});
        try { localStorage.removeItem(LS.quiz); } catch (e) {}
        A3.views.progress();
      }
    });
  };

  /* ================= 全局搜索 ================= */
  searchInput.addEventListener("input", function () {
    var q = searchInput.value.trim();
    if (!q) { go(state.prevView || "home"); return; }
    renderSearch(q);
  });
  searchClear.addEventListener("click", function () {
    searchInput.value = "";
    go(state.prevView || "home");
  });

  function markHits(text, q) {
    var t = esc(text);
    var k = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return t.replace(new RegExp("(" + k + ")", "gi"), "<mark>$1</mark>");
  }

  function renderSearch(q) {
    var qgroups = synGroups(q);
    var html = '<div class="search-meta">搜索「' + esc(q) + "」：";
    var groups = [];

    K.subjects.forEach(function (s) {
      var hits = [];
      s.chapters.forEach(function (ch) {
        ch.points.forEach(function (p) {
          var hay = (p.t + " " + (p.p || []).join(" ") + " " + (p.req || []).join(" ")).toLowerCase();
          if (synHit(hay, qgroups)) {
            var inTitle = synHit(String(p.t).toLowerCase(), qgroups) ? 2 : 0;
            hits.push({ ch: ch.name, t: p.t, body: (p.p || []).join("；"), sc: inTitle });
          }
        });
      });
      /* 标题命中的考点排前面，其次保持章节顺序 */
      hits.sort(function (a, b) { return b.sc - a.sc; });
      if (hits.length) {
        var CAP = 12;
        var g = { title: "📚 " + s.name,
          items: hits.slice(0, CAP).map(function (h) {
            return { no: "", t: h.t, sub: h.ch, body: h.body, view: "recite" };
          }) };
        if (hits.length > CAP) g.more = "还有 " + (hits.length - CAP) + " 个考点没显示，加个更具体的关键词（如「德育方法」）能缩小范围";
        groups.push(g);
      }
    });

    var billHits = [];
    (K.bills.countries || []).forEach(function (c) {
      c.items.forEach(function (b) {
        var hay = (b.name + " " + (b.year || "") + " " + (b.content || []).join(" ") + " " + (b.impact || []).join(" ")).toLowerCase();
        if (synHit(hay, qgroups)) billHits.push({ t: c.name + "《" + b.name + "》", sub: (b.year || "") + " · " + (b.stage || ""), body: (b.content || []).join("；"), view: "bills" });
      });
    });
    if (billHits.length) groups.push({ title: "📜 外教法案", items: billHits.slice(0, 20) });

    var qHits = [];
    (K.q200 || []).forEach(function (q2) {
      var hay = (q2.q + " " + (q2.points || []).join(" ") + " " + (q2.frame || []).join(" ")).toLowerCase();
      if (synHit(hay, qgroups)) qHits.push({ t: q2.no + ". " + q2.q, sub: q2.subj, body: (q2.points || []).slice(0, 3).join("；"), view: "q200" });
    });
    if (qHits.length) groups.push({ title: "🗂 200 题", items: qHits.slice(0, 20) });

    var mHits = [];
    (K.material70 || []).forEach(function (m) {
      var hay = (m.point + " " + (m.text || "") + " " + (m.keys || []).join(" ")).toLowerCase();
      if (synHit(hay, qgroups)) mHits.push({ t: m.point, sub: m.subj, body: m.text || "", view: "material70" });
    });
    if (mHits.length) groups.push({ title: "🕳 材料题考点", items: mHits.slice(0, 15) });

    /* 真题命中：单选 / 论述 / 材料，标红并可直接跳原卷 */
    var ztHits = [];
    var ZT = (window.K3_ZT_PAPERS && window.K3_ZT_PAPERS.papers) || [];
    ZT.forEach(function (p) {
      var isMock = !/^20\d\d$/.test(String(p.year));
      var label = isMock ? (p.tag || "模考") : (p.year + " 年");
      (p.choice || []).forEach(function (it) {
        var hay = (it.q + " " + (it.opts || []).join(" ") + " " + (it.exp || "")).toLowerCase();
        if (synHit(hay, qgroups)) ztHits.push({ y: p.year, tab: "c", no: it.no, kind: "单选", txt: it.q, sub: it.subj, mock: isMock, label: label });
      });
      (p.essay || []).forEach(function (it) {
        var hay = (it.q + " " + (it.ans || "")).toLowerCase();
        if (synHit(hay, qgroups)) ztHits.push({ y: p.year, tab: "e", no: it.no, kind: "论述", txt: it.q, sub: it.subj, mock: isMock, label: label });
      });
      (p.material || []).forEach(function (it) {
        var hay = ((it.mat || "") + " " + (it.q || "") + " " + (it.asks || []).map(function (a) { return a.t; }).join(" ")).toLowerCase();
        if (synHit(hay, qgroups)) ztHits.push({ y: p.year, tab: "m", no: it.no, kind: "材料分析", txt: (it.q || it.mat || ""), sub: it.subj, mock: isMock, label: label });
      });
    });

    var total = groups.reduce(function (a, g) { return a + g.items.length; }, 0) + ztHits.length;
    html += "命中 " + total + " 条</div>";
    html += '<div class="search-src"><button class="src-btn" id="searchSrcBtn">📖 在教材原文里找「' + esc(q) + "」的出处（书名 · 版本 · 页码）</button></div>";
    if (!total) {
      app.innerHTML = html + '<div class="empty">没搜到，换个更短的关键词试试（如「学制」「原则」「法案名」），或点上面的按钮直接搜教材原文。</div>';
      var sb0 = document.getElementById("searchSrcBtn");
      if (sb0) sb0.addEventListener("click", function () { A3.searchSource && A3.searchSource(q); });
      return;
    }

    if (ztHits.length) {
      var realN = ztHits.filter(function (z) { return !z.mock; }).length;
      var mockN = ztHits.length - realN;
      var ttl = "📑 ";
      if (realN) ttl += "真题命中（" + realN + "）";
      if (mockN) ttl += (realN ? " · " : "") + "模考命中（" + mockN + "）";
      html += '<h2 class="section-title zt-red-title">' + ttl + "</h2>";
      html += '<div class="zt-hit-list">';
      ztHits.slice(0, 20).forEach(function (z, zi) {
        html += '<div class="zt-hit' + (z.mock ? " mock" : "") + '" data-zi="' + zi + '">' +
          '<div class="zt-hit-top"><span class="zt-badge' + (z.mock ? " mock" : "") + '">' + (z.mock ? "模考" : "真题") + "</span>" +
          '<span class="zt-hit-meta">' + esc(z.label || z.y) + " · " + z.kind + " 第 " + z.no + " 题</span></div>" +
          '<div class="zt-hit-txt">' + markHits(String(z.txt || "").slice(0, 160), q) + "</div>" +
          '<button class="zt-jump" data-y="' + z.y + '" data-t="' + z.tab + '" data-no="' + z.no + '">看原题 ▸</button>' +
          "</div>";
      });
      html += "</div>";
    }

    groups.forEach(function (g) {
      html += '<h2 class="section-title">' + g.title + "（" + g.items.length + "）</h2>";
      html += '<div class="q-list">';
      g.items.forEach(function (h) {
        html += '<div class="qcard"><div class="qcard-head"><div class="qcard-title">' + markHits(h.t, q) + (h.sub ? ' <span class="tag">' + esc(h.sub) + "</span>" : "") + "</div></div>";
        if (h.body) html += '<div class="qcard-body" style="display:block;padding:0 14px 12px">' + markHits(h.body.slice(0, 240), q) + "</div>";
        html += "</div>";
      });
      html += "</div>";
      if (g.more) html += '<div class="grp-more">' + esc(g.more) + "</div>";
    });
    app.innerHTML = html;
    var sb = document.getElementById("searchSrcBtn");
    if (sb) sb.addEventListener("click", function () { A3.searchSource && A3.searchSource(q); });
    Array.prototype.forEach.call(app.querySelectorAll(".zt-jump"), function (b) {
      b.addEventListener("click", function () {
        A3._ztFocus = { tab: b.getAttribute("data-t"), no: +b.getAttribute("data-no") };
        if (A3.ztOpen) A3.ztOpen(b.getAttribute("data-y"), b.getAttribute("data-t"));
        else go("zhenti");
      });
    });
  }

  /* ================= 容错：白屏自愈 ================= */
  function fatal(msg) {
    var a = document.getElementById("app");
    if (!a) return;
    a.innerHTML = '<div class="qempty" style="padding:40px 20px;text-align:center">' +
      '<div style="font-size:34px">😵</div><div style="margin:10px 0;color:var(--ink)">页面加载出错了</div>' +
      '<div style="font-size:12px;color:var(--ink-3);margin-bottom:16px">' + esc(String(msg || "")) + '</div>' +
      '<button class="qbtn primary" onclick="location.reload()">重新载入</button></div>';
  }
  A3.fatal = fatal;
  window.addEventListener("error", function (e) {
    if (!e || !e.message) return;
    /* 只有「首屏还没渲染出来」时才整页报错；页面已经在用的话，只记日志，绝不把内容换掉 */
    if (!A3._booted) fatal(e.message);
    else if (window.console && console.warn) console.warn("[非致命错误]", e.message);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    var a = document.getElementById("app");
    if (a && !a.childElementCount) {
      try { location.reload(); } catch (err) {}
    }
  });

  /* ================= 启动 ================= */
  Array.prototype.forEach.call(document.querySelectorAll(".navbtn"), function (b) {
    b.addEventListener("click", function () { go(b.getAttribute("data-view")); });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".mtb-item"), function (b) {
    b.addEventListener("click", function () { go(b.getAttribute("data-view")); });
  });
  var mt = document.getElementById("menuToggle");
  function setNav(open) {
    document.body.classList.toggle("nav-open", !!open);
    if (nav) nav.classList.toggle("open", !!open);
    if (backdrop) backdrop.classList.toggle("show", !!open);
    if (mt) mt.setAttribute("aria-expanded", open ? "true" : "false");
  }
  A3.setNav = setNav;
  if (mt) mt.addEventListener("click", function (ev) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    setNav(!document.body.classList.contains("nav-open"));
  });
  if (backdrop) backdrop.addEventListener("click", function () { setNav(false); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") setNav(false); });

  var meta = K.meta || {};
  if (meta.subtitle) document.getElementById("siteSubtitle").textContent = meta.subtitle;

  /* ================= 深色 / 浅色 ================= */
  function applyTheme(dark) {
    var root = document.documentElement;
    if (dark) root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    var t = document.getElementById("themeToggle");
    if (t) {
      t.textContent = dark ? "☀️" : "🌙";
      t.setAttribute("aria-pressed", dark ? "true" : "false");
      t.title = dark ? "切回浅色" : "切到深色";
    }
    var mc = document.querySelector('meta[name="theme-color"]');
    if (mc) mc.setAttribute("content", dark ? "#0e1522" : "#1e6fd9");
    try { localStorage.setItem("k3_theme", dark ? "dark" : "light"); } catch (e) {}
  }
  A3.applyTheme = applyTheme;
  (function () {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    try { if (localStorage.getItem("k3_theme") === "dark") dark = true; } catch (e) {}
    applyTheme(dark);
    var t = document.getElementById("themeToggle");
    if (t) t.addEventListener("click", function (ev) {
      if (ev) ev.stopPropagation();
      applyTheme(document.documentElement.getAttribute("data-theme") !== "dark");
    });
  })();
  var fn = document.getElementById("footerNotice");
  if (fn) fn.textContent = "整理更新：" + (meta.updated || "") + "｜" + (meta.notice || "内容依据公开资料整理，请以最新大纲与官方教材为准。");

  /* ============ 记住上次看到哪里：刷新/切后台回来不丢内容 ============ */
  var NAV_KEY = "k3_nav_v1";
  function saveNav() {
    try {
      /* 以地址栏 hash 为准：go() 是同步写 hash 的，比 state.view 更不容易慢一拍 */
      var hv = String(location.hash || "").replace(/^#/, "").split("/")[0];
      var v = (hv && A3.views[hv]) ? hv : state.view;
      localStorage.setItem(NAV_KEY, JSON.stringify({
        view: v, subject: state.subject, onlyTodo: !!state.onlyTodo,
        opSubj: A3._opSubj || "all", opQuery: A3._opQuery || "", opMask: !!A3._opMask,
        srchQ: A3._srchQ || "", openCh: A3._openCh || "",
        scroll: Math.round(window.pageYOffset || 0), at: Date.now()
      }));
    } catch (e) {}
  }
  A3.saveNav = saveNav;
  window.addEventListener("beforeunload", saveNav);
  window.addEventListener("pagehide", saveNav);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") saveNav();
  });

  function navSnapshot() {
    try { return JSON.parse(localStorage.getItem(NAV_KEY) || "null"); } catch (e) { return null; }
  }
  function applySavedSubstate(o) {
    if (!o) return;
    if (o.subject) state.subject = o.subject;
    state.onlyTodo = !!o.onlyTodo;
    A3._opSubj = o.opSubj || "all";
    A3._opQuery = o.opQuery || "";
    A3._opMask = !!o.opMask;
    A3._srchQ = o.srchQ || "";
    if (o.openCh) A3._openCh = o.openCh;
  }
  function restoreNav() {
    var o = navSnapshot();
    if (!o || !o.view) return false;
    if (!(A3.views[o.view] || o.view === "home")) return false;
    applySavedSubstate(o);
    go(o.view);
    if (o.scroll) setTimeout(function () { try { window.scrollTo(0, o.scroll); } catch (e) {} }, 80);
    return true;
  }
  A3.restoreNav = restoreNav;

  /* 启动：有深链就以深链为准（并补全学科），否则回到上次那一页 */
  var bootSaved = navSnapshot();
  applySavedSubstate(bootSaved);
  function applyHash() {
    var hv = viewFromHash();
    if (hv && hv !== state.view) go(hv);
  }
  A3.applyHash = applyHash;
  (function boot() {
    var hv = viewFromHash();
    var deep = /^#recite\/([a-z0-9-]+)/i.exec(location.hash || "");
    if (deep) {
      var chId = deep[1];
      (K.subjects || []).forEach(function (s) {
        (s.chapters || []).forEach(function (c) { if (c.id === chId) state.subject = s.id; });
      });
    }
    if (hv) { go(hv); }
    else if (!restoreNav()) { render(); }
  })();
  setTimeout(applyHash, 0);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyHash);
  }
  window.addEventListener("load", applyHash);

  /* 兜底：万一哪一步没渲染出来，给一个能点的重载按钮，而不是白屏 */
  window.addEventListener("error", function (ev) {
    if (window.console) console.error("[333] 启动出错", ev.error || ev.message);
  });
  setTimeout(function () {
    var a = document.getElementById("app");
    if (!a) return;
    var txt = String(a.innerHTML || "").replace(/\s+/g, "");
    if (txt.length < 80) {
      a.innerHTML = '<div class="empty" style="line-height:1.9">页面没有正常加载出来。<br>' +
        '① 先点下面按钮重新载入；<br>' +
        '② 如果是从微信/QQ 里打开的，请点右上角「…」→ 用浏览器打开；<br>' +
        '③ 平板请用 Chrome / Edge 打开本地文件。<br><br>' +
        '<button class="qbtn" onclick="location.reload()">重新载入</button></div>';
    }
  }, 1800);
})();