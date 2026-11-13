/* 333 背书房 · 听我背书（语音抽查 / 默写自测）
   题材：大纲考点、冬青 200 题、整卷论述与材料题
   依赖：Web Speech API（Chrome / Edge）；不支持时可改用打字默写 */
(function () {
  "use strict";
  var A3 = window.A3, K = A3.K, app = document.getElementById("app");
  var esc = A3.esc, toast = A3.toast;

  var KEY = "k3_oral_v1";
  var ST = { src: "mix", subj: "all", cur: null, listening: false, text: "", result: null, hist: [], lastId: "" };

  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || "null");
      if (o) { ST.hist = o.hist || []; ST.src = o.src || "mix"; ST.subj = o.subj || "all"; if (o.cur && o.cur.id) ST.cur = o.cur; }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ hist: ST.hist.slice(0, 300), src: ST.src, subj: ST.subj, cur: ST.cur })); } catch (e) {}
  }
  load();

  /* ---------- 文本工具 ---------- */
  function plain(s) { return String(s == null ? "" : s).replace(/\{\{|\}\}/g, ""); }
  function normPunct(s) {
    return String(s || "").replace(/[\s，。、；：？！“”‘’（）《》〈〉【】…—\-·,.;:?!"'()\[\]<>\/\\|~`@#$%^&*+=_]/g, "");
  }
  function biSet(s) {
    var set = {}, n = s.length;
    for (var i = 0; i < n - 1; i++) set[s.slice(i, i + 2)] = 1;
    return set;
  }
  function uniq(a) { var s = {}, o = []; a.forEach(function (x) { if (x && !s[x]) { s[x] = 1; o.push(x); } }); return o; }

  function kwOf(fields) {
    var out = [], re = /\{\{([^}]+)\}\}/g, m;
    fields.forEach(function (f) {
      var s = String(f || "");
      while ((m = re.exec(s))) out.push(m[1].replace(/\s+/g, ""));
      re.lastIndex = 0;
    });
    return uniq(out).filter(function (x) { return x.length >= 2; }).slice(0, 18);
  }
  /* 长答案自动提炼采分短语：按标点切成短句，取 4~18 字的，均匀抽 14 条 */
  function autoKw(text) {
    var parts = String(text || "").split(/[。；;！？\n]/).map(function (x) { return x.replace(/^[（(]\d+[）)]|^\d+[.、．]/, "").trim(); });
    var picks = [];
    parts.forEach(function (p) {
      p.split(/[，,、：:]/).forEach(function (q) {
        q = q.trim();
        if (q.length >= 4 && q.length <= 18) picks.push(q);
      });
    });
    picks = uniq(picks);
    if (picks.length > 14) {
      var step = picks.length / 14, out = [];
      for (var i = 0; i < 14; i++) out.push(picks[Math.floor(i * step)]);
      return out;
    }
    return picks;
  }

  /* ---------- 题库 ---------- */
  function ptText(p) {
    return [p.t].concat(p.p || [], p.req || [], p.tip ? [p.tip] : []).map(plain).join("\n");
  }
  function pointPool(subj) {
    var out = [];
    (K.subjects || []).forEach(function (s) {
      if (subj !== "all" && s.id !== subj) return;
      (s.chapters || []).forEach(function (c) {
        (c.points || []).forEach(function (p, pi) {
          var ref = ptText(p);
          if (ref.replace(/\s/g, "").length < 12) return;
          out.push({
            id: "pt|" + s.id + "|" + c.id + "|" + pi, src: "考点", tag: (s.short || s.name) + " · " + c.name,
            prompt: plain(p.t) + "\n（把这条考点的含义、内容与要求完整背出来）", ref: ref, kw: kwOf([p.t].concat(p.p || [], p.req || [])), sub: s.id
          });
        });
      });
    });
    return out;
  }
  var SUB2 = { "edu-principle": "ep", "edu-china": "cn", "edu-foreign": "wj", "edu-psych": "xl" };
  function q200Pool(subj) {
    var out = [], data = K.q200 || { subjects: [] }, want = SUB2[subj] || subj;
    (data.subjects || []).forEach(function (g) {
      if (subj !== "all" && g.id !== want) return;
      (g.items || []).forEach(function (it) {
        var ref = (it.frame || []).concat(it.pts || []).map(plain).join("\n");
        var kw = kwOf((it.pts || []).slice());
        if (kw.length < 3) {
          kw = uniq((it.frame || []).map(plain).filter(function (x) { return x.length >= 3; })
            .concat(autoKw((it.pts || []).map(function (x) {
              return plain(x).replace(/^【[^】]*】/, "").replace(/^[^：:]{0,10}[：:]/, "");
            }).join("\n")))).slice(0, 12);
        }
        out.push({
          id: "q200|" + g.id + "|" + it.no, src: "200题", tag: (g.name || "") + " · 第 " + it.no + " 题" + (it.type ? "（" + it.type + "）" : ""),
          prompt: plain(it.t), ref: ref, kw: kw, sub: g.id
        });
      });
    });
    return out;
  }
  function essayPool(subj) {
    var out = [], papers = ((window.K3_ZT_PAPERS || {}).papers || []);
    papers.forEach(function (p) {
      ["essay", "material"].forEach(function (tab) {
        (p[tab] || []).forEach(function (z) {
          var ref = plain(z.ans || z.a || "");
          if (ref.replace(/\s/g, "").length < 60) return;
          if (subj !== "all" && z.subj && z.subj !== subj) return;
          var promptText = plain(z.q || z.mat || "");
          if (Array.isArray(z.asks) && z.asks.length) {
            promptText += "\n" + z.asks.map(function (a, i) { return "（" + (i + 1) + "）" + plain(a.t || a || ""); }).join("\n");
          }
          if (promptText.replace(/\s/g, "").length < 10) return;
          out.push({
            id: "zt|" + p.year + "|" + tab + "|" + z.no, src: tab === "essay" ? "论述题" : "材料题",
            tag: p.name + (tab === "essay" ? " · 论述第 " + z.no + " 题" : " · 材料第 " + z.no + " 题"),
            prompt: promptText, ref: ref, kw: autoKw(ref), sub: z.subj || ""
          });
        });
      });
    });
    return out;
  }
  function pool() {
    var arr = [];
    var MIN = 40;
    if (ST.src === "point" || ST.src === "mix") arr = arr.concat(pointPool(ST.subj));
    if (ST.src === "q200" || ST.src === "mix") arr = arr.concat(q200Pool(ST.subj));
    if (ST.src === "essay" || ST.src === "mix") arr = arr.concat(essayPool(ST.subj));
    return arr.filter(function (x) { return normPunct(x.ref).length >= MIN; });
  }
  function pickOne() {
    var arr = pool();
    if (!arr.length) return null;
    var pick = arr[Math.floor(Math.random() * arr.length)];
    if (arr.length > 1) { var guard = 0; while (pick.id === ST.lastId && guard++ < 8) pick = arr[Math.floor(Math.random() * arr.length)]; }
    ST.lastId = pick.id;
    ST.cur = pick;
    ST.result = null;
    save();
    return pick;
  }

  /* ---------- 评分 ---------- */
  function grade(spoken, item) {
    var t = normPunct(spoken), r = normPunct(item.ref);
    var tb = biSet(t), rb = biSet(r), hit = 0, total = 0;
    for (var k in rb) { total++; if (tb[k]) hit++; }
    var recall = total ? hit / total : 0;
    var kwHit = [], kwMiss = [];
    (item.kw || []).forEach(function (w) {
      var nw = normPunct(w);
      if (nw && t.indexOf(nw) > -1) kwHit.push(w); else kwMiss.push(w);
    });
    var kcov = (item.kw || []).length ? kwHit.length / item.kw.length : recall;
    var pct = Math.round((recall * 0.45 + kcov * 0.55) * 100);
    /* 短答案别被「说太少」的规则误伤：只有当参考本身很长时，才限制过短的复述 */
    if (t.length < 12) pct = Math.min(pct, 15);
    else if (t.length < 30 && r.length >= 120) pct = Math.min(pct, 45);
    return { pct: Math.max(0, Math.min(100, pct)), recall: Math.round(recall * 100), kcov: Math.round(kcov * 100), kwHit: kwHit, kwMiss: kwMiss, chars: t.length };
  }
  function band(p) {
    if (p >= 85) return ["很稳 ✅", "这一条已经能拿分，隔天再回来复述一次就行。"];
    if (p >= 70) return ["基本会了 👍", "主干在，个别采分点还没说全，把下面漏掉的补上。"];
    if (p >= 50) return ["半熟 🌤", "关键词只说中一半，建议读完参考要点再背一遍。"];
    if (p >= 25) return ["还生 🌱", "先看参考要点，按「是什么 → 为什么 → 怎么做」重新组织。"];
    return ["没接上 🔁", "别急，先读一遍参考要点，再点「再背一次」。"];
  }

  /* ---------- 语音 ---------- */
  var REC = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, finalText = "", interimText = "";

  /* Android APK 里的原生语音桥（WebView 没有 Web Speech，用系统识别服务） */
  var NATOBJ = window.K3Android || null;
  var NAT = null;
  var NDIAG = "";
  try {
    if (NATOBJ && NATOBJ.diag) NDIAG = String(NATOBJ.diag() || "");
    if (NATOBJ && NATOBJ.available && NATOBJ.available()) NAT = NATOBJ;
  } catch (e) { NAT = null; }

  function vmodeText() {
    if (NAT) return "系统语音" + (NDIAG ? " · " + NDIAG : "");
    if (NATOBJ) return "系统无识别服务" + (NDIAG ? " · " + NDIAG : "");
    if (micEnv() === "web") return "网页语音";
    return "网页版无麦克风 · 用键盘🎤";
  }

  function micIdle() {
    ST.listening = false;
    var b = document.getElementById("oralMic");
    if (b) { b.classList.remove("on"); b.innerHTML = "🎤 开始背"; }
  }

  function nativeErr(code) {
    if (code === "denied") toast("麦克风权限被拒了：去「设置 → 应用 → 333背书房 → 权限」里打开麦克风");
    else if (code === "network" || code === "network-timeout") toast("语音识别要联网：连上网络再试，或用下面的「打字默写」");
    else if (code === "no-match" || code === "timeout" || code === "no-speech") toast("没听清，再靠近一点、说慢一点");
    else if (code === "busy") toast("识别服务正忙，等两秒再点一次");
    else if (code === "cancelled") toast("取消了语音输入，可以再点一次「开始背」");
    else if (code === "no-service") toast("这台设备没有语音识别服务：装「讯飞语记」后重开本应用就能用；也可以先用下面的打字默写");
    else if (code === "perm-request-failed") toast("权限弹窗没能打开：去「设置 → 应用 → 333背书房 → 权限」里手动打开麦克风");
    else if (code !== "client") toast("识别出错：" + code);
    micIdle();
    var tag = document.getElementById("oralTag");
    if (tag) tag.textContent = "已停止";
  }

  window.__k3voice = function (txt, kind) {
    if (kind === "partial") { interimText = txt || ""; paintLive(); return; }
    if (kind === "final") { if (txt) finalText += (finalText ? "。" : "") + txt; interimText = ""; paintLive(); return; }
    if (kind === "ready") { var t0 = document.getElementById("oralTag"); if (t0) t0.textContent = "● 正在听"; return; }
    if (kind === "stop") {
      micIdle();
      var t1 = document.getElementById("oralTag");
      if (t1) t1.textContent = "已停止";
      return;
    }
    if (kind === "err") nativeErr(txt || "unknown");
  };

  function paintLive() {
    var live = document.getElementById("oralLive");
    if (!live) return;
    var txt = (finalText + interimText).trim();
    live.innerHTML = txt ? esc(txt) : '<span class="ol-hint">在听了…把这一条完整讲出来（约 30 秒～2 分钟）</span>';
    var cnt = document.getElementById("oralCount");
    if (cnt) cnt.textContent = normPunct(finalText).length + " 字";
  }
  function stopRec() {
    var was = ST.listening;
    ST.listening = false;
    if (NAT && was) { try { NAT.stop(); } catch (e) {} }
    if (rec) { try { rec.onend = null; rec.stop(); } catch (e) {} }
    rec = null;
    var b = document.getElementById("oralMic");
    if (b) { b.classList.remove("on"); b.innerHTML = "🎤 开始背"; }
    var tag = document.getElementById("oralTag");
    if (tag) tag.textContent = "已停止";
  }
  function micEnv() {
    if (NAT) return "native";
    if (NATOBJ && !NAT) return "nobridge";
    var fileProto = /^(file|blob):/i.test(location.protocol || "");
    if (REC && !fileProto) return "web";
    return "none";
  }
  function keyboardHint(extra) {
    var box = document.getElementById("oralHint");
    if (box) {
      box.style.display = "block";
      box.innerHTML = '<b>⌨️ 这台设备上浏览器不给麦克风</b><span>网页版双击打开（file://）时，安卓 Chrome/Edge 会直接拒绝麦克风，这不是 bug，是浏览器的安全限制。三个办法：① 用 APK（原生麦克风，最省事）；② 点下面的输入框，用<u>键盘上的 🎤 说话输入</u>，说完点「提交默写」一样判分；③ 电脑上换成 https/localhost 打开网页版。' + (extra ? "<br>" + extra : "") + "</span>";
    }
    var w = document.getElementById("oralWrite");
    if (w) w.open = true;
    var t = document.getElementById("oralText");
    if (t) { try { t.focus(); } catch (e) {} }
  }
  function startRec() {
    var env = micEnv();
    if (env === "none") {
      toast("浏览器在这个页面不给麦克风，用键盘🎤说话输入一样能判分");
      keyboardHint("");
      return;
    }
    if (env === "nobridge") {
      toast("这台设备没有语音识别服务：装「讯飞语记」后重开 APK 就能用；也可以先打字默写");
      keyboardHint("APK 里这一步会先弹麦克风授权；如果还弹不出来，装「讯飞语记」再打开。");
      return;
    }
    finalText = ""; interimText = ""; ST.text = "";
    if (NAT) {
      ST.listening = true;
      var nb = document.getElementById("oralMic");
      if (nb) { nb.classList.add("on"); nb.innerHTML = "⏹ 背完了"; }
      var ntag = document.getElementById("oralTag");
      if (ntag) ntag.textContent = "● 正在听";
      paintLive();
      try { NAT.start(); } catch (e) { toast("麦克风起不来：" + (e && e.message || e)); }
      return;
    }
    try {
      rec = new REC();
      rec.lang = "zh-CN";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = function (e) {
        var it = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else it += r[0].transcript;
        }
        interimText = it;
        paintLive();
      };
      rec.onerror = function (e) {
        var msg = e && e.error;
        if (msg === "not-allowed" || msg === "service-not-allowed") { toast("麦克风被浏览器拦了"); keyboardHint(""); }
        else if (msg === "network") toast("语音识别要联网，没网就先用「打字默写」");
        else if (msg === "no-speech") toast("没听到声音，靠近一点再说");
        else if (msg !== "aborted") toast("识别出错：" + msg);
      };
      rec.onend = function () {
        if (ST.listening) { try { rec.start(); } catch (e) {} }
      };
      rec.start();
      ST.listening = true;
      var b = document.getElementById("oralMic");
      if (b) { b.classList.add("on"); b.innerHTML = "⏹ 背完了"; }
      var tag = document.getElementById("oralTag");
      if (tag) tag.textContent = "● 正在听";
      paintLive();
    } catch (e) {
      toast("麦克风起不来：" + (e && e.message || e));
    }
  }
  /* ---------- 录音回放（不联网也能用：录下来自己听） ---------- */
  var MR = window.MediaRecorder || null;
  var mr = null, mrStream = null, mrChunks = [];

  function mrBusy() { return !!(mr && mr.state === "recording"); }
  function mrPaint(on) {
    var b = document.getElementById("oralRec");
    if (b) { b.classList.toggle("on", !!on); b.textContent = on ? "⏹ 停止录音" : "🎧 录音回放"; }
  }
  function mrStop() {
    if (mr && mr.state !== "inactive") { try { mr.stop(); } catch (e) {} }
    mrPaint(false);
  }
  function mrStart() {
    if (!MR || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("这个浏览器不能录音，用「打字默写」也能判分");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      mrStream = stream;
      mrChunks = [];
      mr = new MR(stream);
      mr.ondataavailable = function (e) { if (e.data && e.data.size) mrChunks.push(e.data); };
      mr.onstop = function () {
        var wrap = document.getElementById("oralAudioWrap");
        if (wrap) {
          if (mrChunks.length) {
            var blob = new Blob(mrChunks, { type: (mrChunks[0] && mrChunks[0].type) || "audio/webm" });
            var url = URL.createObjectURL(blob);
            A3._lastAudio = { url: url, kb: Math.round(blob.size / 1024) };
            wrap.innerHTML = '<div class="ol-audio-t">回放你的背诵（' + A3._lastAudio.kb + " KB，只存在本机）</div>" +
              '<audio id="oralAudio" controls src="' + url + '"></audio>';
          } else wrap.innerHTML = '<div class="ol-audio-t">没录到声音，检查一下麦克风。</div>';
        }
        if (mrStream) { try { mrStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} mrStream = null; }
        mr = null;
        var tag = document.getElementById("oralTag");
        if (tag) tag.textContent = "已录音";
        if (ST.afterStopRender) { ST.afterStopRender = false; try { A3.render(); } catch (e) {} }
      };
      mr.start();
      mrPaint(true);
      var tag = document.getElementById("oralTag");
      if (tag) tag.textContent = "● 录音中";
      toast("开始录音，背完点一下「停止录音」就能回放");
    }).catch(function (e) {
      toast("麦克风没开成：" + ((e && e.message) || e));
    });
  }

  A3._oralState = ST;
  A3._oralPools = { point: pointPool, q200: q200Pool, essay: essayPool };
  A3._oralStop = function () { stopRec(); mrStop(); try { window.speechSynthesis.cancel(); } catch (e) {} };

  function speakQ() {
    var it = ST.cur;
    if (!it) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(it.prompt.replace(/[（(]\d+分[)）]/g, ""));
      u.lang = "zh-CN"; u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) { toast("这个浏览器不支持朗读"); }
  }

  /* ---------- 渲染 ---------- */
  function segs() {
    var h = '<div class="toolbar" id="oralSrc">';
    [["mix", "混合抽"], ["point", "大纲考点"], ["q200", "200 题"], ["essay", "整卷大题"]].forEach(function (x) {
      h += '<button class="chip' + (ST.src === x[0] ? " active" : "") + '" data-src="' + x[0] + '">' + x[1] + "</button>";
    });
    h += "</div>";
    h += '<div class="toolbar" id="oralSubj">';
    h += '<button class="chip' + (ST.subj === "all" ? " active" : "") + '" data-sub="all">全部科目</button>';
    (K.subjects || []).forEach(function (s) {
      h += '<button class="chip' + (ST.subj === s.id ? " active" : "") + '" data-sub="' + s.id + '">' + esc(s.short || s.name) + "</button>";
    });
    h += "</div>";
    return h;
  }

  function statsLine() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var n = 0, sum = 0;
    ST.hist.forEach(function (r) { if (r.t >= today.getTime()) { n++; sum += r.pct; } });
    var avg = n ? Math.round(sum / n) : 0;
    return '<div class="ol-stats"><span>今天抽查 <b>' + n + "</b> 题</span><span>平均 <b>" + avg + "</b> 分</span><span>累计 <b>" + ST.hist.length + "</b> 题</span></div>";
  }

  function cardQuestion(it) {
    var h = '<section class="ol-card">';
    h += '<div class="ol-meta"><span class="ol-src">' + esc(it.src) + "</span><span>" + esc(it.tag) + '</span><span class="ol-vmode">' + esc(vmodeText()) + "</span></div>";
    h += '<div class="ol-q">' + esc(it.prompt).replace(/\n/g, "<br>") + "</div>";
    h += '<div class="ol-tools">';
    h += '<button class="qbtn" id="oralSay">🔊 念题</button>';
    h += '<button class="qbtn primary" id="oralMic">' + (micEnv() === "none" ? "⌨️ 用键盘说话" : "🎤 开始背") + "</button>";
    h += '<button class="qbtn" id="oralRec">🎧 录音回放</button>';
    h += '<button class="qbtn" id="oralDone">✅ 我背完了</button>';
    h += '<button class="qbtn" id="oralSkip">🔀 换一题</button>';
    h += '<span class="ol-tag" id="oralTag">没开始</span><span class="ol-tag" id="oralCount">0 字</span>';
    h += "</div>";
    h += '<div class="ol-hintbox" id="oralHint" style="display:none"></div>';
    h += '<div class="ol-live" id="oralLive"><span class="ol-hint">' + (micEnv() === "none" ? "网页版拿不到麦克风：点「⌨️ 用键盘说话」，用键盘上的 🎤 说话输入，或直接打字。" : "点「开始背」，把这道题完整讲一遍；识别不了就往下用「打字默写」。") + "</span></div>";
    h += '<div class="ol-audio" id="oralAudioWrap"></div>';
    h += '<details class="ol-write" id="oralWrite"><summary>✍️ 没麦克风 / 没网？打字默写也能判</summary>' +
      '<textarea id="oralText" placeholder="把你要背的内容打在这里，尽量按「是什么 → 为什么 → 怎么做」写全…"></textarea>' +
      '<button class="qbtn primary" id="oralTextGo">提交默写，看能得几分</button></details>';
    h += "</section>";
    return h;
  }

  function cardResult(it, res) {
    var b = band(res.pct);
    var h = '<section class="ol-card ol-result">';
    h += '<div class="ol-scoreline"><div class="ol-score"><b>' + res.pct + "</b><span>分</span></div>" +
      '<div><div class="ol-band">' + b[0] + "</div><div class=\"ol-band-sub\">" + b[1] + "</div>" +
      '<div class="ol-mini">关键词覆盖 ' + res.kcov + "% · 原文吻合 " + res.recall + "% · 说了 " + res.chars + " 字</div></div></div>";
    if (A3._lastAudio) h += '<div class="ol-audio"><div class="ol-audio-t">刚才的背诵录音（' + A3._lastAudio.kb + ' KB，只存在本机）</div><audio controls src="' + A3._lastAudio.url + '"></audio></div>';
    if (res.kwHit.length) h += '<div class="ol-kw"><span class="ol-kw-t">说到的采分点</span>' + res.kwHit.map(function (w) { return '<i class="ok">' + esc(w) + "</i>"; }).join("") + "</div>";
    if (res.kwMiss.length) h += '<div class="ol-kw"><span class="ol-kw-t">还差这些</span>' + res.kwMiss.map(function (w) { return '<i class="miss">' + esc(w) + "</i>"; }).join("") + "</div>";
    h += '<details class="ol-ref" open><summary>📖 参考要点（对一遍再背一次）</summary><div class="ol-ref-body">' + esc(it.ref).replace(/\n/g, "<br>") + "</div></details>";
    h += '<div class="ol-tools"><button class="qbtn primary" id="oralAgain">🔁 再背这一题</button>' +
      '<button class="qbtn" id="oralNext">➡️ 下一题</button>' +
      '<button class="qbtn" id="oralSay2">🔊 听参考</button></div>';
    h += "</section>";
    return h;
  }

  function renderBody() {
    var h = '<div class="ol-head"><div><div class="section-title" style="margin:0">🎙 听我背书 · 老师抽查</div>' +
      '<p class="ol-sub">随机抽一题，你对着麦克风背，它一边听一边打分：说中了哪些采分点、还差哪些。需要联网（Chrome / Edge 的语音识别走网络）；没网就打字默写。</p></div></div>';
    h += statsLine();
    h += segs();
    if (ST.cur) {
      if (ST.result) h += cardResult(ST.cur, ST.result);
      else h += cardQuestion(ST.cur);
    } else {
      h += '<section class="ol-card ol-empty"><div class="ol-empty-t">准备好了就开始</div>' +
        '<p>点下面的按钮，随机抽一道题（考点 / 200 题 / 整卷大题），像老师当面抽查一样背给它听。</p>' +
        '<button class="qbtn primary big" id="oralStart">🎲 抽一题开始</button></section>';
    }
    return h;
  }

  function bind() {
    var b;
    if ((b = document.getElementById("oralStart"))) b.onclick = function () { stopRec(); mrStop(); ST.cur = pickOne(); ST.result = null; A3.render(); };
    if ((b = document.getElementById("oralSkip"))) b.onclick = function () { stopRec(); mrStop(); ST.cur = pickOne(); ST.result = null; A3.render(); };
    if ((b = document.getElementById("oralNext"))) b.onclick = function () { stopRec(); mrStop(); ST.cur = pickOne(); ST.result = null; A3.render(); };
    if ((b = document.getElementById("oralAgain"))) b.onclick = function () { stopRec(); mrStop(); ST.result = null; A3.render(); };
    if ((b = document.getElementById("oralSay"))) b.onclick = speakQ;
    if ((b = document.getElementById("oralSay2"))) b.onclick = speakQ;
    if ((b = document.getElementById("oralMic"))) b.onclick = function () {
      if (ST.listening) stopRec();
      else startRec();
    };
    if ((b = document.getElementById("oralRec"))) b.onclick = function () {
      if (mrBusy()) mrStop();
      else mrStart();
    };
    if ((b = document.getElementById("oralDone"))) b.onclick = function () {
      var typed = (document.getElementById("oralText") || {}).value || "";
      var spoken = (finalText || "") + (typed ? "\n" + typed : "");
      if (normPunct(spoken).length < 6) { toast("还没听到内容：先点「开始背」，或在下面打字"); return; }
      if (mrBusy()) { ST.afterStopRender = true; mrStop(); }
      stopRec();
      ST.result = grade(spoken, ST.cur);
      ST.hist.unshift({ t: Date.now(), id: ST.cur.id, src: ST.cur.src, tag: ST.cur.tag, pct: ST.result.pct });
      ST.hist = ST.hist.slice(0, 300);
      save();
      A3.render();
    };
    if ((b = document.getElementById("oralTextGo"))) b.onclick = function () {
      var typed = (document.getElementById("oralText") || {}).value || "";
      if (normPunct(typed).length < 6) { toast("再多写一点，至少一句话"); return; }
      ST.result = grade(typed, ST.cur);
      ST.hist.unshift({ t: Date.now(), id: ST.cur.id, src: ST.cur.src, tag: ST.cur.tag, pct: ST.result.pct });
      ST.hist = ST.hist.slice(0, 300);
      save();
      A3.render();
    };
    Array.prototype.forEach.call(app.querySelectorAll("#oralSrc .chip"), function (c) {
      c.onclick = function () { stopRec(); ST.src = c.getAttribute("data-src"); ST.cur = null; ST.result = null; save(); A3.render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll("#oralSubj .chip"), function (c) {
      c.onclick = function () { stopRec(); ST.subj = c.getAttribute("data-sub"); ST.cur = null; ST.result = null; save(); A3.render(); };
    });
  }

  A3.views.oral = function () {
    app.innerHTML = renderBody();
    bind();
  };
})();