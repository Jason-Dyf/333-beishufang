/* 333 背书房 · 一页纸
   三种形态：🧭 框架图（脑图 + 主线链 + 并列对比）/ ✏️ 挖空自测 / 🌫 模糊遮挡
   两个内容版本：📘 大纲背书版 / 🧪 冬青200题自测版
   缩放、单科、关键词搜索；框架数据来自 assets/data/frames.js（window.K3_FRAME） */
(function () {
  var A3 = window.A3, K = A3.K;
  var esc = A3.esc;

  /* ---------- 小工具 ---------- */
  function stars(p) {
    var out = [], re = /\{\{([^}]+)\}\}/g, m;
    while ((m = re.exec(p))) out.push(m[1].replace(/\s+/g, ""));
    return out;
  }
  function pick(list) {
    var seen = {}, out = [];
    list.forEach(function (p) {
      stars(p).forEach(function (w) {
        if (!seen[w]) { seen[w] = 1; out.push(w); }
      });
    });
    return out.slice(0, 14);
  }
  function plain(s) { return String(s == null ? "" : s).replace(/\{\{|\}\}/g, ""); }
  function cut(s, n) { s = plain(s); return s.length > n ? s.slice(0, n) + "…" : s; }

  var BIG_RE = /(论述|简答|意义|启示|比较|关系|如何|为什么|试述|评价|简析|辨析|原则|方法|途径|措施|影响|作用|条件|原因|特点)/;
  function isBig(t) { return BIG_RE.test(String(t || "")); }

  function zHit(sub, ch, pi) {
    var P = window.K3_PLINK || {};
    var rec = P[sub + "|" + ch + "|" + pi];
    return rec && rec.z ? rec.z.length : 0;
  }
  function frameOf(sub, ch) {
    var F = window.K3_FRAME || {};
    return F[sub + "|" + ch] || null;
  }

  /* 一行文本按 {{关键词}} 变成「文字 + 可点空白」 */
  function blankLine(s) {
    var re = /\{\{([^}]+)\}\}/g, out = "", last = 0, m, n = 0;
    while ((m = re.exec(s))) {
      out += esc(plain(s.slice(last, m.index)));
      var w = m[1];
      out += '<button class="bk" data-a="' + esc(w) + '" data-f="' + esc(w.slice(0, 1)) + '">' +
        esc("＿".repeat(Math.min(8, Math.max(3, w.length)))) + "</button>";
      last = m.index + m[0].length;
      n++;
    }
    out += esc(plain(s.slice(last)));
    return n ? out : esc(plain(s));
  }


  /* 没有 {{}} 标记的考点：把「是指/分为/包括…」后的定义短语自动挖空，避免整段无空可填 */
  var AUTO_RE = /(是指|指的是|是|指|即|包括|分为|主要有|表现为|体现在)([^，。；：、！？“”]{3,14})/;
  function autoMask(line) {
    if (line.indexOf("{{") >= 0) return line;
    if (String(line).length < 14) return line;
    var m = AUTO_RE.exec(line);
    if (!m) return line;
    return line.slice(0, m.index) + m[1] + "{{" + m[2] + "}}" + line.slice(m.index + m[0].length);
  }

  /* ---------- 状态 ---------- */
  function st() {
    try {
      var o = JSON.parse(localStorage.getItem("k3_opview_v1") || "{}") || {};
      if (o.mode === "blank" || o.mode === "blur" || o.mode === "map") A3._opMode = o.mode;
      if (o.src === "q200" || o.src === "point") A3._opSrc = o.src;
      if (typeof o.fs === "number") A3._opFs = o.fs;
    } catch (e) {}
    if (!A3._opMode) A3._opMode = "map";
    if (!A3._opSrc) A3._opSrc = "point";
    if (!A3._opFs) A3._opFs = 1;
  }
  function save() {
    try {
      localStorage.setItem("k3_opview_v1", JSON.stringify({ mode: A3._opMode, src: A3._opSrc, fs: A3._opFs }));
    } catch (e) {}
  }

  /* ---------- 工具栏 ---------- */
  function headHtml() {
    var h = '<div class="op-head">';
    h += '<div><div class="section-title" style="margin:0">📄 333 一页纸</div></div>';
    h += '<button class="qbtn" id="opPrint">🖨 打印</button></div>';

    h += '<div class="op-modes"><span class="op-mlab">版本</span>';
    h += '<button class="op-chip' + (A3._opSrc === "point" ? " on" : "") + '" data-src="point">📘 大纲背书版</button>';
    h += '<button class="op-chip' + (A3._opSrc === "q200" ? " on" : "") + '" data-src="q200">🧪 冬青200题自测版</button>';
    h += "</div>";

    if (A3._opSrc === "point") {
      h += '<div class="op-modes"><span class="op-mlab">形态</span>';
      h += '<button class="op-chip' + (A3._opMode === "map" ? " on" : "") + '" data-mode="map">🧭 框架图</button>';
      h += '<button class="op-chip' + (A3._opMode === "blank" ? " on" : "") + '" data-mode="blank">✏️ 挖空自测</button>';
      h += '<button class="op-chip' + (A3._opMode === "blur" ? " on" : "") + '" data-mode="blur">🌫 模糊遮挡</button>';
      h += '<span class="op-zoom"><button id="opMinus">A−</button><i id="opFsTxt">' + Math.round(A3._opFs * 100) + '%</i><button id="opPlus">A＋</button></span>';
      h += "</div>";
    } else {
      h += '<div class="op-modes"><span class="op-mlab">缩放</span>' +
        '<span class="op-zoom"><button id="opMinus">A−</button><i id="opFsTxt">' + Math.round(A3._opFs * 100) + '%</i><button id="opPlus">A＋</button></span></div>';
    }
    return h;
  }

  /* ================= 框架图 ================= */
  var TOPIC_C = "#1e6fd9", THEME_C = "#8a5b16";

  /* 单章脑图：章节 → 主题簇 → 考点 */
  function mapSvg(c, f) {
    var ROW = 25, GAP = 13, W = 680;
    var cl = (f.clusters || []).filter(function (x) { return x.items.length; });
    if (!cl.length) return "";
    var y = 14, nodes = [];
    cl.forEach(function (grp) {
      var ys = grp.items.map(function () { var v = y; y += ROW; return v; });
      nodes.push({ g: grp, y: (ys[0] + ys[ys.length - 1]) / 2, top: ys[0], bot: ys[ys.length - 1] });
      y += GAP;
    });
    var H = Math.max(96, y + 8);
    var cx = 8, cw = 132, half = 42;
    var mx = 205, mw = 118;
    var lx = 352;
    var s = '<svg class="fm-svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(plain(c.name)) + '框架图">';
    s += '<rect x="' + cx + '" y="' + (H / 2 - half) + '" width="' + cw + '" height="' + (half * 2) + '" rx="12" class="fm-root"/>';
    var nm = plain(c.name).replace(/^第[一二三四五六七八九十百]+章\s*/, "");
    s += '<text x="' + (cx + cw / 2) + '" y="' + (H / 2 - 4) + '" class="fm-roott">' + esc(cut(nm, 11)) + "</text>";
    s += '<text x="' + (cx + cw / 2) + '" y="' + (H / 2 + 15) + '" class="fm-roots">' + (f.n || "") + " 个考点</text>";

    nodes.forEach(function (n) {
      var isT = n.g.kind === "topic";
      var col = isT ? TOPIC_C : THEME_C;
      var y0 = H / 2, y1 = n.y;
      s += '<path d="M' + (cx + cw) + " " + y0 + " C " + (cx + cw + 30) + " " + y0 + ", " + (mx - 26) + " " + y1 + ", " + mx + " " + y1 + '" class="fm-edge" style="stroke:' + col + '"/>';
      s += '<rect x="' + mx + '" y="' + (n.y - 13) + '" width="' + mw + '" height="26" rx="13" class="fm-branch" style="stroke:' + col + '"/>';
      s += '<text x="' + (mx + mw / 2) + '" y="' + (n.y + 4) + '" class="fm-bt" style="fill:' + col + '">' +
        esc(cut(n.g.k, 7)) + '<tspan class="fm-bn"> ' + n.g.items.length + "</tspan></text>";

      n.g.items.forEach(function (pi, k) {
        var py = n.top + k * ROW;
        s += '<path d="M' + (mx + mw) + " " + n.y + " C " + (mx + mw + 20) + " " + n.y + ", " + (lx - 18) + " " + py + ", " + (lx - 4) + " " + py + '" class="fm-leaf" style="stroke:' + col + '"/>';
        s += '<circle cx="' + (lx - 2) + '" cy="' + py + '" r="2.6" style="fill:' + col + '"/>';
        var t = plain(c.points[pi].t || "");
        s += '<text x="' + (lx + 8) + '" y="' + (py + 4) + '" class="fm-lt" data-pi="' + pi + '">' + esc(cut(t, 21)) + "</text>";
      });
    });
    s += "</svg>";
    return s;
  }


  /* 窄屏用竖向树（避免脑图横向滚动） */
  function mapTree(c, f) {
    var cl = (f.clusters || []).filter(function (x) { return x.items.length; });
    var h = '<div class="fmt">';
    h += '<div class="fmt-root">' + (f.n || 0) + " 个考点<i>" + cl.length + " 个主题簇 · 点条目可跳背书</i></div>";
    h += '<ul class="fmt-bs">';
    cl.forEach(function (g) {
      h += '<li class="' + (g.kind === "topic" ? "t" : "th") + '"><div class="fmt-b"><b>' + esc(g.k) + "</b><span>" + g.items.length + "</span></div>";
      h += '<div class="fmt-ls">' + g.items.map(function (pi) {
        return '<button class="fm-step" data-pi="' + pi + '">' + esc(cut(c.points[pi].t, 16)) + "</button>";
      }).join("") + "</div></li>";
    });
    h += "</ul></div>";
    return h;
  }
  function narrow() {
    try { return !!(window.matchMedia && window.matchMedia("(max-width:620px)").matches); } catch (e) { return false; }
  }

  /* 主线链：同一主体下的条目顺序，可遮住自测 */
  function chainHtml(c, f) {
    var out = "";
    (f.chains || []).forEach(function (ch) {
      out += '<div class="fm-chain">';
      out += '<div class="fm-chaint"><b>🔗 ' + esc(ch.k) + "</b>" +
        '<span class="fm-cn">' + ch.items.length + " 环</span>" +
        '<button class="fm-hide">遮住顺序</button></div>';
      out += '<ol class="fm-steps">';
      ch.items.forEach(function (pi) {
        out += '<li><button class="fm-step" data-pi="' + pi + '">' + esc(cut(c.points[pi].t, 20)) + "</button></li>";
      });
      out += "</ol></div>";
    });
    return out;
  }

  /* 并列对比：同一尾缀的一组（…的原则 / …的方法） */
  function cmpHtml(c, f) {
    return (f.cmps || []).map(function (g) {
      return '<div class="fm-cmp"><b>⇄ 并列 · ' + esc(g.k) + "</b>" +
        g.items.map(function (pi) {
          return '<button class="fm-step" data-pi="' + pi + '">' + esc(cut(c.points[pi].t, 20)) + "</button>";
        }).join("") + "</div>";
    }).join("");
  }

  function mapBody() {
    var sid = A3._opSubj || "all";
    var q = String(A3._opQuery || "").toLowerCase().trim();
    var subs = (K.subjects || []).filter(function (s) { return sid === "all" ? true : s.id === sid; });
    var h = '<div class="fm-body">';
    var total = 0;
    subs.forEach(function (s) {
      var sec = '<section class="fm-subj">';
      sec += '<h3 class="fm-sh">' + esc(s.name) + '<i>' + (s.chapters || []).length + " 章 · " +
        (s.chapters || []).reduce(function (n, c) { return n + (c.points || []).length; }, 0) + " 考点</i></h3>";
      (s.chapters || []).forEach(function (c) {
        var f = frameOf(s.id, c.id);
        if (!f) return;
        if (q) {
          var hay = (plain(c.name) + " " + (c.points || []).map(function (p) { return plain(p.t || ""); }).join(" ")).toLowerCase();
          if (hay.indexOf(q) < 0) return;
        }
        total++;
        var sum = (f.clusters || []).filter(function (x) { return x.kind === "topic"; })
          .map(function (x) { return x.k; }).slice(0, 6).join(" · ");
        sec += '<section class="fm-ch" data-sub="' + esc(s.id) + '" data-chid="' + esc(c.id) + '">';
        sec += '<header class="fm-h"><span class="fm-nm">' + esc(plain(c.name).replace(/^第[一二三四五六七八九十百]+章\s*/, "")) + "</span>" +
          '<i class="fm-meta">' + (f.n || 0) + " 点" + (f.chains && f.chains.length ? " · " + f.chains.length + " 链" : "") + "</i>" +
          '<span class="fm-sum">' + esc(sum) + "</span>" +
          '<button class="fm-toggle">展开</button></header>';
        sec += '<div class="fm-inner">';
        var nar = narrow();
        sec += '<div class="fm-mapwrap' + (nar ? " narrow" : "") + '">' + (nar ? mapTree(c, f) : mapSvg(c, f)) + "</div>";
        if (!nar) sec += '<div class="fm-swipe">← 左右滑动看图 →</div>';
        var chs = chainHtml(c, f), cps = cmpHtml(c, f);
        if (chs) sec += '<div class="fm-chains">' + chs + "</div>";
        if (cps) sec += '<div class="fm-cmps">' + cps + "</div>";
        sec += "</div></section>";
      });
      sec += "</section>";
      h += sec;
    });
    if (!total) h += '<div class="empty">没有匹配的章节，换个关键词试试。</div>';
    h += "</div>";
    return h;
  }

  /* ================= 大纲版（模糊 / 挖空） ================= */
  function pointBody() {
    var sid = A3._opSubj || "all";
    var q = String(A3._opQuery || "").toLowerCase().trim();
    var subs = (K.subjects || []).filter(function (s) { return sid === "all" ? true : s.id === sid; });
    var h = '<div class="op-body' + (sid !== "all" ? " one" : "") + (A3._opMode === "blur" && A3._opMask ? " mask" : "") + '">';
    var hit = 0;
    subs.forEach(function (s) {
      var sec = '<section class="op-subj" style="--c:' + (s.color || "#1e6fd9") + '">';
      sec += '<h3>' + esc(s.name) + '<i>' + (s.chapters || []).length + " 章 · " +
        (s.chapters || []).reduce(function (n, c) { return n + (c.points || []).length; }, 0) + " 考点</i></h3>";
      sec += '<div class="op-chs">';
      (s.chapters || []).forEach(function (c) {
        var rows = "";
        (c.points || []).forEach(function (p, pi) {
          var title = plain(p.t || "");
          var words = pick(p.p || []);
          var z = zHit(s.id, c.id, pi);
          if (q) {
            var hay = (title + " " + words.join(" ") + " " + (p.p || []).join(" ")).toLowerCase();
            if (hay.indexOf(q) < 0) return;
          }
          hit++;
          if (A3._opMode === "blank") {
            var badges = "";
            if (z) badges += '<i class="bk-badge z">真题 ' + z + "</i>";
            if (isBig(title)) badges += '<i class="bk-badge big">大题</i>';
            if (p.req || words.length >= 2) badges += '<i class="bk-badge">重点</i>';
            var raw = p.p || [];
            var anyBlk = raw.some(function (l) { return l.indexOf("{{") >= 0; });
            var lines = raw.map(function (l, k) { return k === 0 && !anyBlk ? autoMask(l) : l; });
            var blanks = 0;
            lines.forEach(function (line) { blanks += (line.match(/\{\{/g) || []).length; });
            rows += '<div class="bk-pt" data-sub="' + esc(s.id) + '" data-ch="' + esc(c.id) + '" data-pi="' + pi + '">';
            rows += '<div class="bk-t">' + badges + "<b>" + esc(title) + "</b>" +
              (blanks ? '<span class="bk-cnt">0/' + blanks + "</span>" + '<button class="bk-hint">首字</button>' : "") + "</div>";
            lines.forEach(function (line) {
              rows += '<div class="bk-l">' + blankLine(line) + "</div>";
            });
            rows += "</div>";
          } else {
            if (!words.length) {
              var t0 = plain((p.p || [])[0] || "").slice(0, 26);
              if (t0) words = [t0];
            }
            rows += '<div class="op-row" data-sub="' + esc(s.id) + '" data-ch="' + esc(c.id) + '" data-pi="' + pi + '">' +
              "<b>" + esc(title) + "</b>" +
              (words.length ? "<span>" + esc(words.join(" · ")) + "</span>" : "") + "</div>";
          }
        });
        if (!rows) return;
        sec += '<div class="op-ch" data-chid="' + esc(c.id) + '"><h4>' + esc(c.name) + "</h4>" + rows + "</div>";
      });
      sec += "</div></section>";
      h += sec;
    });
    if (!hit) h += '<div class="empty" style="grid-column:1/-1">没有匹配「' + esc(A3._opQuery || "") + '」的考点，换个关键词试试。</div>';
    h += "</div>";
    return h;
  }

  /* ================= 冬青 200 题自测版 ================= */
  function q200Body() {
    var q = String(A3._opQuery || "").toLowerCase().trim();
    var sid = A3._opSubj || "all";
    var code = sid === "all" ? "" : sid.replace("edu-", "");
    var list = (K.q200 || []).filter(function (it) {
      if (code && it.subjId !== code) return false;
      if (!q) return true;
      var hay = (it.t + " " + (it.frame || []).join(" ") + " " + (it.pts || []).join(" ")).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
    var h = '<div class="op-body q200">';
    h += '<div class="bk-qstat">共 ' + list.length + " 道 · 先自己搭骨架，再点「看要点」核对。</div>";
    if (!list.length) h += '<div class="empty">没有匹配的题目，换个关键词。</div>';
    list.forEach(function (it, i) {
      var parts = [];
      (it.pts || []).forEach(function (line, k) {
        var m = /^【([^】]+)】\s*([\s\S]*)$/.exec(String(line));
        var label = m ? m[1] : "要点 " + (k + 1);
        var bodyTxt = m ? m[2] : String(line);
        parts.push('<div class="bk-q"><div class="bk-qt"><b>' + esc(label) + "</b>" +
          '<button class="bk-rev">看要点</button></div><div class="bk-body">' + esc(bodyTxt) + "</div></div>");
      });
      h += '<div class="bk-item"><div class="bk-ihead"><span class="bk-no">' + esc(it.subj || "") + " · 第" + esc(it.no || i + 1) + "题</span>" +
        '<i class="bk-badge">' + esc(it.type || "") + (it.score ? " " + esc(it.score) + "分" : "") + "</i>" +
        (it.star ? '<i class="bk-badge z">重点</i>' : "") + "</div>";
      h += '<div class="bk-iq">' + esc(it.t || "") + "</div>";
      if (it.frame && it.frame.length) {
        h += '<div class="bk-frame">' + it.frame.map(function (f) { return "<span>" + esc(f) + "</span>"; }).join("") + "</div>";
      }
      h += '<div class="bk-parts">' + parts.join("") + "</div></div>";
    });
    h += "</div>";
    return h;
  }

  /* ================= 视图入口 ================= */
  A3.views.onepage = function () {
    st();
    var sid = A3._opSubj || "all";
    var h = headHtml();
    h += '<div class="subj-tabs" id="opTabs"><button class="subj-tab' + (sid === "all" ? " on" : "") + '" data-s="all">四科合览</button>';
    (K.subjects || []).forEach(function (s) {
      h += '<button class="subj-tab' + (sid === s.id ? " on" : "") + '" data-s="' + s.id + '">' + esc(s.short || s.name) + "</button>";
    });
    h += "</div>";

    h += '<div class="op-tools">';
    h += '<input type="search" class="op-search" id="opQ" placeholder="找考点、章名或关键词…" value="' + esc(A3._opQuery || "") + '" />';
    if (A3._opSrc === "point" && A3._opMode === "blur") {
      h += '<button class="qbtn small' + (A3._opMask ? " on" : "") + '" id="opMask">' + (A3._opMask ? "👁 显示关键词" : "🙈 遮住关键词自测") + "</button>";
      if (A3._opMask) h += '<button class="qbtn small" id="opReveal">全部显示</button>';
    }
    if (A3._opSrc === "point" && A3._opMode === "blank") {
      h += '<button class="qbtn small' + (A3._opAll ? " on" : "") + '" id="opAll">' + (A3._opAll ? "收起答案" : "全部显示") + "</button>";
    }
    h += "</div>";

    if (A3._opSrc === "point" && sid !== "all" && A3._opMode !== "map") {
      var sub0 = (K.subjects || []).filter(function (s) { return s.id === sid; })[0];
      h += '<div class="op-nav" id="opNav">' + ((sub0 && sub0.chapters) || []).map(function (c) {
        return '<button data-jump="' + esc(c.id) + '">' + esc(plain(c.name).replace(/^第[一二三四五六七八九十百]+章\s*/, "")) + "</button>";
      }).join("") + "</div>";
    }

    h += '<div class="op-wrap' + (A3._opMode === "blank" && A3._opAll ? " bk-all" : "") + '" style="zoom:' + A3._opFs.toFixed(2) + '">';
    if (A3._opSrc === "q200") h += q200Body();
    else if (A3._opMode === "map") h += mapBody();
    else h += pointBody();
    h += "</div>";

    app.innerHTML = h;

    /* ---- 顶部 chips ---- */
    Array.prototype.forEach.call(app.querySelectorAll("[data-src]"), function (b) {
      b.onclick = function () { A3._opSrc = b.getAttribute("data-src"); A3._opQuery = ""; save(); A3.render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-mode]"), function (b) {
      b.onclick = function () { A3._opMode = b.getAttribute("data-mode"); save(); A3.render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll("#opTabs .subj-tab"), function (b) {
      b.onclick = function () { A3._opSubj = b.getAttribute("data-s"); A3._opQuery = ""; A3.render(); };
    });

    /* ---- 搜索 ---- */
    var qi = document.getElementById("opQ");
    if (qi) {
      var timer = null;
      qi.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          A3._opQuery = qi.value;
          var pos = qi.selectionStart;
          A3.render();
          var n2 = document.getElementById("opQ");
          if (n2) { n2.focus(); try { n2.setSelectionRange(pos, pos); } catch (e) {} }
        }, 260);
      });
    }

    /* ---- 缩放 ---- */
    function zoom(d) {
      A3._opFs = Math.max(0.8, Math.min(1.6, Math.round((A3._opFs + d) * 10) / 10));
      save();
      var w = app.querySelector(".op-wrap");
      if (w) w.style.zoom = A3._opFs;
      var t = document.getElementById("opFsTxt");
      if (t) t.textContent = Math.round(A3._opFs * 100) + "%";
    }
    var pm = document.getElementById("opMinus"); if (pm) pm.onclick = function () { zoom(-0.1); };
    var pp = document.getElementById("opPlus"); if (pp) pp.onclick = function () { zoom(0.1); };

    /* ---- 框架图：展开 / 链遮住 / 叶子跳转 ---- */
    Array.prototype.forEach.call(app.querySelectorAll(".fm-h"), function (head) {
      head.onclick = function () {
        var ch = head.parentNode;
        ch.classList.toggle("open");
        head.querySelector(".fm-toggle").textContent = ch.classList.contains("open") ? "收起" : "展开";
      };
    });
    Array.prototype.forEach.call(app.querySelectorAll(".fm-hide"), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var chain = b.parentNode.parentNode;
        var on = chain.classList.toggle("hide");
        b.textContent = on ? "显示顺序" : "遮住顺序";
      };
    });

    /* ---- 挖空：点空白显示答案 + 计数 ---- */
    Array.prototype.forEach.call(app.querySelectorAll(".bk"), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        if (b.classList.contains("on")) return;
        b.textContent = b.getAttribute("data-a");
        b.classList.add("on");
        var pt = b.parentNode ? b.closest(".bk-pt") : null;
        if (pt) {
          var all = pt.querySelectorAll(".bk").length, on = pt.querySelectorAll(".bk.on").length;
          var c = pt.querySelector(".bk-cnt");
          if (c) c.textContent = on + "/" + all;
        }
      };
    });
    Array.prototype.forEach.call(app.querySelectorAll(".bk-hint"), function (h) {
      h.onclick = function (e) {
        e.stopPropagation();
        var pt = h.closest(".bk-pt");
        Array.prototype.forEach.call(pt.querySelectorAll(".bk:not(.on)"), function (b) {
          b.textContent = (b.getAttribute("data-f") || "·") + "…";
        });
      };
    });
    var al = document.getElementById("opAll");
    if (al) al.onclick = function () {
      A3._opAll = !A3._opAll;
      var w = app.querySelector(".op-wrap");
      if (w) w.classList.toggle("bk-all", A3._opAll);
      al.textContent = A3._opAll ? "收起答案" : "全部显示";
      al.classList.toggle("on", A3._opAll);
    };

    /* ---- 冬青版看要点 ---- */
    Array.prototype.forEach.call(app.querySelectorAll(".bk-rev"), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var box = b.parentNode.parentNode;
        var on = box.classList.toggle("on");
        b.textContent = on ? "收起" : "看要点";
      };
    });

    /* ---- 模糊版：点行揭示 / 再点跳转 ---- */
    var mk = document.getElementById("opMask");
    if (mk) mk.onclick = function () { A3._opMask = !A3._opMask; A3.render(); };
    var rv = document.getElementById("opReveal");
    if (rv) rv.onclick = function () {
      Array.prototype.forEach.call(app.querySelectorAll(".op-row"), function (r) { r.classList.add("reveal"); });
    };
    Array.prototype.forEach.call(app.querySelectorAll(".op-row"), function (r) {
      r.onclick = function () {
        if (A3._opMask && !r.classList.contains("reveal")) { r.classList.add("reveal"); return; }
        A3._jumpPoint(r.getAttribute("data-sub"), r.getAttribute("data-ch"), +r.getAttribute("data-pi"));
      };
    });
    Array.prototype.forEach.call(app.querySelectorAll(".bk-t"), function (t) {
      if (!t.querySelector(".bk-hint")) {
        t.onclick = function () {
          var pt = t.parentNode;
          A3._jumpPoint(pt.getAttribute("data-sub"), pt.getAttribute("data-ch"), +pt.getAttribute("data-pi"));
        };
      }
    });

    /* ---- 章节跳转 / 脑图叶子 / 链 / 对比 ---- */
    function scrollToCh(chid) {
      var card = app.querySelector('.fm-ch[data-chid="' + chid + '"]') || app.querySelector('.op-ch[data-chid="' + chid + '"]');
      if (!card) return;
      if (card.classList.contains("fm-ch") && !card.classList.contains("open")) {
        card.classList.add("open");
        card.querySelector(".fm-toggle").textContent = "收起";
      }
      try { card.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) { card.scrollIntoView(); }
      card.classList.add("flash");
      setTimeout(function () { card.classList.remove("flash"); }, 1200);
    }
    Array.prototype.forEach.call(app.querySelectorAll("#opNav button"), function (b) {
      b.onclick = function () { scrollToCh(b.getAttribute("data-jump")); };
    });

    function subjOf(chid) {
      if (A3._opSubj && A3._opSubj !== "all") return A3._opSubj;
      var pref = String(chid || "").slice(0, 3);
      return ({ ep: "edu-principle", cn: "edu-china", wj: "edu-foreign", xl: "edu-psych" })[pref] || (K.subjects[0] || {}).id;
    }
    function jumpFrom(el) {
      var sec = el.closest("[data-chid]");
      var chid = sec ? sec.getAttribute("data-chid") : null;
      if (!chid) return;
      A3._jumpPoint(sec.getAttribute("data-sub") || subjOf(chid), chid, +el.getAttribute("data-pi"));
    }
    Array.prototype.forEach.call(app.querySelectorAll(".fm-lt"), function (t) {
      t.addEventListener("click", function (e) { e.stopPropagation(); jumpFrom(t); });
    });
    Array.prototype.forEach.call(app.querySelectorAll(".fm-step"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var chain = b.closest(".fm-chain");
        if (chain && chain.classList.contains("hide") && !b.classList.contains("shown")) {
          b.classList.add("shown");
          return;
        }
        jumpFrom(b);
      });
    });

    var pr = document.getElementById("opPrint");
    if (pr) pr.onclick = function () { window.print(); };
  };

  /* 从一页纸 / 搜索 跳到背书页对应考点 */
  A3._jumpPoint = function (sid, ch, pi) {
    if (sid) A3.state.subject = sid;
    A3.state.filter = "";
    A3._openCh = ch;
    A3._openPt = pi;
    A3.go("recite");
  };
})();