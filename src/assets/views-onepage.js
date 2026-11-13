/* 333 背书房 · 一页纸（模糊遮挡 / 挖空自测 两版；可缩放；单科放大 + 关键词搜索） */
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

  var BIG_RE = /(论述|简答|意义|启示|比较|关系|如何|为什么|试述|评价|简析|辨析|原则|方法|途径|措施|影响|作用|条件|原因|特点)/;
  function isBig(t) { return BIG_RE.test(String(t || "")); }

  function zHit(sub, ch, pi) {
    var P = window.K3_PLINK || {};
    var rec = P[sub + "|" + ch + "|" + pi];
    return rec && rec.z ? rec.z.length : 0;
  }

  /* 把一行文本按 {{关键词}} 变成「文字 + 可点空白」 */
  function blankLine(s) {
    var re = /\{\{([^}]+)\}\}/g, out = "", last = 0, m, n = 0;
    while ((m = re.exec(s))) {
      out += esc(plain(s.slice(last, m.index)));
      out += '<button class="bk" data-a="' + esc(m[1]) + '">' + esc("＿".repeat(Math.min(8, Math.max(3, m[1].length)))) + "</button>";
      last = m.index + m[0].length;
      n++;
    }
    out += esc(plain(s.slice(last)));
    return n ? out : esc(plain(s));
  }

  /* ---------- 状态 ---------- */
  function st() {
    try {
      var o = JSON.parse(localStorage.getItem("k3_opview_v1") || "{}") || {};
      if (o.mode === "blank" || o.mode === "blur") A3._opMode = o.mode;
      if (o.src === "q200" || o.src === "point") A3._opSrc = o.src;
      if (typeof o.fs === "number") A3._opFs = o.fs;
    } catch (e) {}
    if (!A3._opMode) A3._opMode = "blur";
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

    h += '<div class="op-modes">';
    h += '<span class="op-mlab">版本</span>';
    h += '<button class="op-chip' + (A3._opSrc === "point" ? " on" : "") + '" data-src="point">📘 大纲背书版</button>';
    h += '<button class="op-chip' + (A3._opSrc === "q200" ? " on" : "") + '" data-src="q200">🧪 冬青200题自测版</button>';
    h += "</div>";

    h += '<div class="op-modes">';
    h += '<span class="op-mlab">模式</span>';
    h += '<button class="op-chip' + (A3._opMode === "blur" ? " on" : "") + '" data-mode="blur">🌫 模糊遮挡</button>';
    h += '<button class="op-chip' + (A3._opMode === "blank" ? " on" : "") + '" data-mode="blank">✏️ 挖空自测</button>';
    if (A3._opMode === "blank") h += '<button class="op-chip" id="opAll">全部显示</button>';
    h += '<span class="op-zoom"><button id="opMinus">A−</button><i id="opFsTxt">' + Math.round(A3._opFs * 100) + '%</i><button id="opPlus">A＋</button></span>';
    h += "</div>";
    return h;
  }

  /* ---------- 大纲版 ---------- */
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
            rows += '<div class="bk-pt" data-sub="' + esc(s.id) + '" data-ch="' + esc(c.id) + '" data-pi="' + pi + '">';
            rows += '<div class="bk-t">' + badges + "<b>" + esc(title) + "</b></div>";
            (p.p || []).forEach(function (line) {
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

  /* ---------- 冬青 200 题自测版 ---------- */
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
    h += '<div class="bk-qstat">共 ' + list.length + " 道 · 先自己想，再点「看要点」核对。</div>";
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
    h += '<input type="search" class="op-search" id="opQ" placeholder="找考点、关键词或题目…" value="' + esc(A3._opQuery || "") + '" />';
    if (A3._opMode === "blur") {
      h += '<button class="qbtn small' + (A3._opMask ? " on" : "") + '" id="opMask">' + (A3._opMask ? "👁 显示关键词" : "🙈 遮住关键词自测") + "</button>";
      if (A3._opMask) h += '<button class="qbtn small" id="opReveal">全部显示</button>';
    }
    h += "</div>";

    if (A3._opSrc === "point" && sid !== "all") {
      var sub0 = (K.subjects || []).filter(function (s) { return s.id === sid; })[0];
      h += '<div class="op-nav" id="opNav">' + ((sub0 && sub0.chapters) || []).map(function (c) {
        return '<button data-jump="' + esc(c.id) + '">' + esc(c.name) + "</button>";
      }).join("") + "</div>";
    }

    h += '<div class="op-wrap" style="zoom:' + A3._opFs.toFixed(2) + '">';
    h += A3._opSrc === "q200" ? q200Body() : pointBody();
    h += "</div>";

    app.innerHTML = h;

    /* 事件 */
    Array.prototype.forEach.call(app.querySelectorAll("[data-src]"), function (b) {
      b.onclick = function () { A3._opSrc = b.getAttribute("data-src"); A3._opQuery = ""; save(); A3.render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-mode]"), function (b) {
      b.onclick = function () { A3._opMode = b.getAttribute("data-mode"); save(); A3.render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll("#opTabs .subj-tab"), function (b) {
      b.onclick = function () { A3._opSubj = b.getAttribute("data-s"); A3._opQuery = ""; A3.render(); };
    });
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
    var mk = document.getElementById("opMask");
    if (mk) mk.onclick = function () { A3._opMask = !A3._opMask; A3.render(); };
    var rv = document.getElementById("opReveal");
    if (rv) rv.onclick = function () {
      Array.prototype.forEach.call(app.querySelectorAll(".op-row.reveal"), function (r) { r.classList.remove("reveal"); });
    };
    var al = document.getElementById("opAll");
    if (al) al.onclick = function () { app.classList.toggle("bk-show"); };

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

    /* 挖空：点空白显示答案 */
    Array.prototype.forEach.call(app.querySelectorAll(".bk"), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        b.textContent = b.getAttribute("data-a");
        b.classList.add("on");
      };
    });
    /* 冬青版：看要点 */
    Array.prototype.forEach.call(app.querySelectorAll(".bk-rev"), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var box = b.parentNode.parentNode;
        var on = box.classList.toggle("on");
        b.textContent = on ? "收起" : "看要点";
      };
    });

    Array.prototype.forEach.call(app.querySelectorAll("#opNav button"), function (b) {
      b.onclick = function () {
        var card = app.querySelector('.op-ch[data-chid="' + b.getAttribute("data-jump") + '"]');
        if (card) {
          try { card.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) { card.scrollIntoView(); }
          card.classList.add("flash");
          setTimeout(function () { card.classList.remove("flash"); }, 1200);
        }
      };
    });
    /* 模糊版：点行揭示 / 再点跳转 */
    Array.prototype.forEach.call(app.querySelectorAll(".op-row"), function (r) {
      r.onclick = function () {
        if (A3._opMask && !r.classList.contains("reveal")) { r.classList.add("reveal"); return; }
        A3._jumpPoint(r.getAttribute("data-sub"), r.getAttribute("data-ch"), +r.getAttribute("data-pi"));
      };
    });
    /* 挖空版：点标题跳背书页 */
    Array.prototype.forEach.call(app.querySelectorAll(".bk-t"), function (t) {
      t.onclick = function () {
        var pt = t.parentNode;
        A3._jumpPoint(pt.getAttribute("data-sub"), pt.getAttribute("data-ch"), +pt.getAttribute("data-pi"));
      };
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