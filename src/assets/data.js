/* 333 数据装配：把各数据分片组装成 window.K333 */
(function () {
  "use strict";

  var SUBJ_META = [
    { id: "edu-principle", name: "教育学原理", short: "教原", color: "#0f6e5c", desc: "总分最重、最容易拿分的一门：概念、原则、规律、制度，背准了就能写满。" },
    { id: "edu-china", name: "中国教育史", short: "中教史", color: "#a3352a", desc: "古代教育制度与教育家思想，按「朝代—制度—人物」三条线串起来背。" },
    { id: "edu-foreign", name: "外国教育史", short: "外教史", color: "#2b6ea6", desc: "法案、教育家、思潮三块硬骨头，法案单独有栏目，这里背人与思想。" },
    { id: "edu-psych", name: "教育心理学", short: "教心", color: "#8a5a1e", desc: "理论多、名字多、阶段多：先记人物—理论—阶段三件套，再背含义。" }
  ];

  var parts = (window.K3_CH || []).slice();

  /* 章节去重合并：同一个 chapter.id 可能出现在多个分片里 */
  var bySubj = {};
  parts.forEach(function (p) {
    if (!p || !p.chapter || !p.subj) return;
    var bucket = bySubj[p.subj] || (bySubj[p.subj] = {});
    var ch = bucket[p.chapter.id];
    if (!ch) {
      bucket[p.chapter.id] = { id: p.chapter.id, name: p.chapter.name, desc: p.chapter.desc || "", points: (p.chapter.points || []).slice() };
    } else {
      ch.points = ch.points.concat(p.chapter.points || []);
      if (!ch.name && p.chapter.name) ch.name = p.chapter.name;
    }
  });

  function sortChapters(bucket) {
    return Object.keys(bucket || {}).sort(function (a, b) {
      return a < b ? -1 : a > b ? 1 : 0;
    }).map(function (k) {
      var ch = bucket[k];
      /* 去掉重复考点（同标题同内容） */
      var seen = {};
      ch.points = ch.points.filter(function (pt) {
        var key = (pt.t || "") + "|" + (pt.p || []).join("").slice(0, 40);
        if (seen[key]) return false;
        seen[key] = 1;
        return true;
      }).map(function (pt) {
        /* 字段归一：req 统一成数组，p 不会是字符串 */
        pt.req = pt.req ? (Array.isArray(pt.req) ? pt.req : [pt.req]) : undefined;
        if (pt.p && !Array.isArray(pt.p)) pt.p = [pt.p];
        if (pt.tip && Array.isArray(pt.tip)) pt.tip = pt.tip.join("；");
        return pt;
      });
      return ch;
    });
  }

  var subjects = SUBJ_META.map(function (m) {
    var chapters = sortChapters(bySubj[m.id]);
    return {
      id: m.id, name: m.name, short: m.short, color: m.color, desc: m.desc,
      chapters: chapters
    };
  });

  /* ===== 冬青 200 题：结构化 → 扁平数组（同时保留 .subjects 给卡片视图） ===== */
  var q = window.K3_Q200 || { intro: window.K3_Q200_INTRO || "", subjects: window.K3_Q200P || [] };
  var arr = function (v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); };
  var qFlat = [];
  (q.subjects || []).forEach(function (s) {
    (s.items || []).forEach(function (it) {
      it.subj = s.short || s.name;
      it.subjId = s.id;
      it.subjName = s.name;
      /* 清掉 OCR 混进题干的页脚广告与「必刷」残片 */
      it.t = String(it.t || "")
        .replace(/[）)]\s*必刷】.*$/, "）")
        .replace(/\s*冬青同系列图书[（(][^）)]*[）)]/g, "")
        .replace(/\s*冬青同系列图书《[^》]*》.*$/, "")
        .replace(/\s*【?\d{4}\s*年?\s*冬青[^】]*】?.*$/, "")
        .trim();
      it.q = it.t;
      it.pts = arr(it.pts);
      it.frame = arr(it.frame);
      it.score = arr(it.score);
      it.warn = arr(it.warn);
      it.points = it.pts;
      it.must = !!it.star;
      qFlat.push(it);
    });
  });
  qFlat.subjects = q.subjects || [];
  qFlat.intro = q.intro || "";

  /* ===== 材料题 70 考点：同样双形态 ===== */
  var m = window.K3_M70 || { intro: window.K3_M70_INTRO || "", subjects: window.K3_M70P || [] };
  var mFlat = [];
  (m.subjects || []).forEach(function (s) {
    (s.items || []).forEach(function (it) {
      it.point = it.t;
      it.subj = s.short || s.name;
      it.subjId = s.id;
      it.text = it.use || it.signal || "";
      it.pts = arr(it.pts);
      it.keys = it.pts;
      mFlat.push(it);
    });
  });
  mFlat.subjects = m.subjects || [];
  mFlat.intro = m.intro || "";

  /* ===== 外教法案 ===== */
  var bills = window.K3_BILLS || { intro: "", countries: [] };
  var billsQuiz = window.K3_BILLS_QUIZ || [];

  /* ===== 刷题题库 ===== */
  var QBANKS = window.K3_QBANKS || [];
  var QRAW = window.K3_QRAW || [];
  QRAW = [].concat.apply([], QRAW.map(function (x) { return Array.isArray(x) ? x : [x]; }));
  var LETTERS = "ABCDEFGH";
  var qseen = {};
  var qlist = [];
  QRAW.forEach(function (q, i) {
    if (!q || !q.q) return;
    var id = q.id || ((q.bank || "q") + "-" + i);
    if (qseen[id]) return;
    qseen[id] = 1;
    /* 清理 OCR 把章节标题粘进题干的尾巴 */
    q.q = String(q.q).replace(/[，,、；;\s]*第[一二三四五六七八九十]+章[：:][^。？?]*$/, "").trim();
    /* OCR 丢了右括号的题干补回「（　）」 */
    q.q = q.q.replace(/[（(]\s*$/, "（　）").trim();
    var a = q.a;
    if (typeof a === "string") a = LETTERS.indexOf(a.toUpperCase().trim());
    /* -1 = 原卷缺答案，保留标记：题库里只展示、不进练习（views-quiz.js 的 okQ 过滤） */
    if (typeof a !== "number" || (a < 0 && a !== -1) || a >= (q.opts || []).length) a = 0;
    qlist.push({
      id: id,
      bank: q.bank || "misc",
      subj: q.subj || "edu-principle",
      ch: q.ch || "",
      q: q.q,
      opts: q.opts || [],
      a: a,
      exp: q.exp || "",
      type: q.type || "",
      star: !!q.star,
      chName: q.chName || "",
      sec: q.sec || "",
      no: q.no != null ? q.no : String(id).split("|").pop(),
      src: q.src || null
    });
  });
  /* 法案选择题并入题库（始终并入，独立成库） */
  if (billsQuiz.length) {
    var hasBills = qlist.some(function (q) { return q.bank === "bills"; });
    if (!hasBills) {
      billsQuiz.forEach(function (b, i) {
        qlist.push({
          id: "bills-" + i, bank: "bills", subj: "edu-foreign", ch: "bills-quiz",
          chName: "外教史 59 个法案", sec: "全部",
          q: b.q, opts: b.opts || [], a: typeof b.ans === "number" ? b.ans : "ABCDEFGH".indexOf(String(b.ans || "").toUpperCase().trim()), exp: b.exp || "", type: "单选",
          star: false,
          src: { book: "外教史59个法案记忆表格", ver: "冬青", page: "" }
        });
      });
    }
    if (!QBANKS.some(function (b) { return b.id === "bills"; })) {
      QBANKS = QBANKS.concat([{ id: "bills", name: "外教史 59 法案选择题", short: "法案" }]);
    }
  }
  /* ===== 选项修补：OCR 常把两个选项挤成一行（"…B.…"），按字母拆回原位；拆不干净的题剔除 ===== */
  (function repairOpts() {
    var L = "ABCD", fixed = 0, dropped = 0;
    qlist = qlist.filter(function (q) {
      if (!q.q || String(q.q).replace(/[（）()\s　]/g, "").length < 2) {
        q.q = "（本题干原卷扫描缺行，请看答案与解析）";
        fixed++;
      }
      if (!Array.isArray(q.opts) || q.opts.length < 2) return true;
      var out = [null, null, null, null], i, n = Math.min(q.opts.length, 4);
      for (i = 0; i < n; i++) {
        var str = String(q.opts[i] == null ? "" : q.opts[i]).trim();
        if (!str) continue;
        var m = str.match(/^(.*?)([A-D])\s*[.．、]\s*([\s\S]+)$/);
        if (m && m[1].replace(/[\s、，,：:]/g, "").length >= 2) {
          if (out[i] == null) out[i] = m[1].trim();
          var j = L.indexOf(m[2]);
          if (j >= 0 && out[j] == null) out[j] = m[3].trim();
          fixed++;
        } else if (out[i] == null) {
          out[i] = str;
        }
      }
      for (var z = 0; z < 4; z++) {
        if (out[z] == null) { out[z] = "（此选项原卷扫描缺行）"; fixed++; }
      }
      q.opts = out;
      if ((q.a < 0 && q.a !== -1) || q.a > 3) q.a = 0;
      return true;
    });
    if (fixed || dropped) {
      try { console.info("[题库修补] 拆回被挤在一起的选项、补齐缺行处 " + fixed + " 次；题干/选项残缺的题保留并标注，不删题"); } catch (e) {}
    }
  })();
  /* ===== 整卷页选项同样修补（整卷不删题，缺行标注） ===== */
  (function repairPapers() {
    var ZP = window.K3_ZT_PAPERS;
    if (!ZP || !Array.isArray(ZP.papers)) return;
    ZP.papers.forEach(function (p) {
      (p.choice || []).forEach(function (c) {
        if (!Array.isArray(c.opts) || c.opts.length < 2) return;
        var L = "ABCD", out = [null, null, null, null], n = Math.min(c.opts.length, 4);
        for (var i = 0; i < n; i++) {
          var str = String(c.opts[i] == null ? "" : c.opts[i]).trim();
          if (!str) continue;
          var m = str.match(/^(.*?)([A-D])\s*[.．、]\s*([\s\S]+)$/);
          if (m && m[1].replace(/[\s、，,：:]/g, "").length >= 2) {
            if (out[i] == null) out[i] = m[1].trim();
            var j = L.indexOf(m[2]);
            if (j >= 0 && out[j] == null) out[j] = m[3].trim();
          } else if (out[i] == null) out[i] = str;
        }
        for (var z = 0; z < 4; z++) if (out[z] == null) out[z] = "（此选项原卷扫描缺行）";
        c.opts = out;
      });
    });
  })();
  if (!QBANKS.length && qlist.length) QBANKS = [{ id: "all", name: "全部题库" }];
  /* 统计每库题数 */
  var qbankMeta = QBANKS.map(function (b) {
    return { id: b.id, name: b.name, short: b.short || b.name, n: qlist.filter(function (q) { return q.bank === b.id; }).length };
  });

  window.K333 = {
    meta: window.K3_META || {
      subtitle: "333 教育综合背书房",
      updated: "2026-11",
      notice: "内容依据《27版丹丹333·大纲考点轻松记》《冬青200题》《冬青材料题70考点精讲》《冬青外教史59个法案记忆表格》整理，仅供自用复盘；以最新大纲与官方教材为准。"
    },
    subjects: subjects,
    bills: bills,
    billsQuiz: billsQuiz,
    q200: qFlat,
    material70: mFlat,
    method: window.K3_METHOD || { intro: "", steps: [], sections: [] },
    scoreTips: window.K3_SCORETIPS || { intro: "", groups: [], rules: [] },
    qbank: { banks: qbankMeta, questions: qlist },
    supplement: window.K3_SUPP || null
  };
  /* 兼容两套写法：scoretips / scoreTips、method */
  window.K333.scoretips = window.K333.scoreTips;

  /* 统计用 */
  window.K3_STATS = null;
  var total = 0;
  subjects.forEach(function (s) { s.chapters.forEach(function (c) { total += c.points.length; }); });
  window.K3_STATS = { points: total };
})();