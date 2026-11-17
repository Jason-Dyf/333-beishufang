/* 333 背书房 · 大题批改引擎（本地确定性判分 + 可选 AI 精批）
   口径：观点/原理 55% · 论证 25% · 材料/评价 20%（材料题材料引用单列）
   所有分数可复算，不随刷新变化。 */
(function (root) {
  "use strict";

  var STOP = /[\s\u3000，。；：、！？“”‘’（）()【】《》〈〉·—…,.;:!?"'\-]/g;

  function norm(s) {
    return String(s == null ? "" : s).replace(STOP, "").toLowerCase();
  }

  function bigrams(s) {
    var set = Object.create(null);
    for (var i = 0; i < s.length - 1; i++) set[s.slice(i, i + 2)] = 1;
    return set;
  }

  // a 的二元组有多少比例出现在 bSet（覆盖度）
  function cover(aText, bSet) {
    var a = norm(aText);
    if (a.length < 2) return 0;
    var seen = Object.create(null), total = 0, hit = 0;
    for (var i = 0; i < a.length - 1; i++) {
      var g = a.slice(i, i + 2);
      if (seen[g]) continue;
      seen[g] = 1;
      total++;
      if (bSet[g]) hit++;
    }
    return total ? hit / total : 0;
  }

  function termsIn(answerNorm, kws) {
    var out = [];
    (kws || []).forEach(function (k) {
      var n = norm(k);
      if (n.length >= 2 && answerNorm.indexOf(n) >= 0) out.push(k);
    });
    return out;
  }

  function countRe(text, re) {
    var m = text.match(re);
    return m ? m.length : 0;
  }

  // 分点识别：行首编号、行首四字小标题、句首「一、」、行内 【小标题】
  function countPoints(text) {
    var lines = String(text || "").split(/\n+/);
    var n = 0;
    lines.forEach(function (l) {
      var s = l.trim();
      if (/^[（(]\s*[一二三四五六七八九十\d]{1,2}\s*[）)]/.test(s)) n++;
      else if (/^\d{1,2}\s*[.、．]/.test(s)) n++;
      else if (/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(s)) n++;
      else if (/^[一二三四五六七八九十]{1,2}、/.test(s)) n++;
      else if (/^[\u4e00-\u9fa5]{4}[：:]/.test(s)) n++;
      else if (/^【[^】]{2,16}】/.test(s)) n++;
      else if (/【[^】]{2,16}】/.test(s) && s.length < 60) n++;
    });
    if (n) return n;
    var m = String(text || "").match(/[①②③④⑤⑥⑦⑧⑨⑩]/g);
    return m ? m.length : 0;
  }

  // 四字小标题数（问启示/影响时用）
  function fourCharHeads(text) {
    var n = 0;
    String(text || "").split(/\n+/).forEach(function (l) {
      var s = l.trim().replace(/^[（(]\s*[\d一二三四五六七八九十]{1,2}\s*[）)]\s*/, "").replace(/^\d{1,2}\s*[.、．]\s*/, "");
      var m = s.match(/^([\u4e00-\u9fa5]{4})(?:[：:、，,\s]|$)/);
      if (m) n++;
    });
    return n;
  }

  // 材料原句引用：把材料切成句子，看每句有多少被写进作答
  function quotedSentences(mat, answerBig) {
    var sents = String(mat || "")
      .split(/(?<=[。！？；])/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return norm(s).length >= 8; });
    var q = [];
    sents.forEach(function (s) {
      if (cover(s, answerBig) >= 0.55) q.push(s.length > 26 ? s.slice(0, 26) + "…" : s);
    });
    return q;
  }

  var CAUSAL = /因为|因此|所以|这说明|可见|从而|进而|由此|之所以|由此可见|究其原因/g;
  var EVAL = /局限|贡献|地位|价值|评价|不足|偏颇|意义深远|历史意义|影响深远|欠缺|忽视了/g;

  function grade(item, answer, opt) {
    opt = opt || {};
    var txt = String(answer || "");
    var answerNorm = norm(txt);
    var answerBig = bigrams(answerNorm);
    var len = answerNorm.length;
    var full = Number(item.full) || 15;
    var isMat = item.kind === "material";
    var isQ200 = item.kind === "q200";

    var pts = item.pts || [];
    var sumW = pts.reduce(function (a, p) { return a + (p.w || 1); }, 0) || 1;
    var gained = 0;
    var hits = [], misses = [];
    if (len < 10) {
      var zero = { score: 0, full: full, rate: 0, parts: [], hits: [], misses: (item.pts || []).map(function (p) { return { t: p.t, cov: 0, level: 0, w: p.w, got: 0, kw: [], want: (p.kw || []).slice(0, 3) }; }), quotes: [], causal: 0, evalN: 0, points: 0, heads4: 0, len: len, bright: [], advice: ["一个字都没写：先写题干关键词 + 上位概念，通常能捞 1–3 分。"], notes: ["空白或过短作答，按 0 分计。"], cap: 0, mode: "local" };
      return zero;
    }
    pts.forEach(function (p) {
      var th = termsIn(answerNorm, p.kw);
      var cov = cover(p.body || p.t, answerBig);
      var level = 0;
      if (cov >= 0.24 || th.length >= 2 || (th.length >= 1 && th[0].length >= 6)) level = 1;
      else if (cov >= 0.10 || th.length >= 1) level = 0.5;
      var credit = level >= 1 ? 1 : level > 0 ? 0.35 : 0;
      var got = (p.w || 1) * credit;
      gained += got;
      var row = {
        t: p.t,
        cov: Math.round(cov * 100) / 100,
        level: level,
        w: p.w,
        got: Math.round(got * 10) / 10,
        kw: th,
        want: (p.kw || []).slice(0, 3)
      };
      if (level >= 1) hits.push(row);
      else if (level > 0) hits.push(row);
      else misses.push(row);
    });

    var ptRatio = gained / sumW; // 0..1 观点覆盖率（含半命中）
    var causal = countRe(txt, CAUSAL);
    var evalN = countRe(txt, EVAL);
    var quotes = isMat ? quotedSentences(item.mat || item.q, answerBig) : [];
    var nPts = countPoints(txt);
    var heads4 = fourCharHeads(txt);

    var parts = [];
    var score = 0;

// 论证/展开：分点结构 + 每点展开深度 + 因果逻辑（不要求每个人都写「因为」）
    var need = full >= 15 ? 5 : 3;
    var segs = String(answer).split(/\n+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length >= 8; });
    var avgLen = nPts > 0 ? Math.round(len / Math.max(1, nPts)) : 0;
    var structR = Math.min(1, nPts / need);
    var depthR = Math.min(1, (avgLen || len) / 34);
    var logicR = Math.min(1, causal / 2);
    var argR = Math.min(1, 0.5 * structR + 0.32 * depthR + 0.18 * logicR + (evalN ? 0.08 : 0));
    if (!nPts) argR *= 0.55;

    // 材料贴合度：引原句 + 与材料共享的实词比例
    var matR = 0;
    if (isMat) {
      var qf = quotes.length >= 2 ? 1 : quotes.length === 1 ? 0.62 : 0.06;
      var matBig = bigrams(norm(String(item.mat || "").slice(0, 1200)));
      var ansBig2 = bigrams(norm(answer.slice(0, 1600)));
      var inter = 0, tot = 0;
      Object.keys(ansBig2).forEach(function (g) { tot++; if (matBig[g]) inter++; });
      matR = Math.min(1, inter / Math.max(12, tot * 0.06));
      var tailR = 0.62 * qf + 0.38 * matR;
      matR = tailR;
    }

    var parts = [];
    var wIdea = isQ200 ? 0.6 : 0.5;
    var wArg = 1 - wIdea;

    var idea = full * wIdea * Math.min(1, ptRatio * 1.06);
    parts.push({ k: isMat ? "原理·采分点" : isQ200 ? "要点·采分点" : "观点·采分点", got: idea, max: full * wIdea });

    var argLabel = isMat ? "结合材料（引原句 " + quotes.length + " 处）" : isQ200 ? "展开（分点 " + nPts + " / 均 " + avgLen + " 字）" : "论证（分点 " + nPts + " / 均 " + avgLen + " 字 / 因果 " + causal + " 处）";
    var argR2 = isMat ? matR : argR;
    var arg = full * wArg * Math.max(0, Math.min(1, argR2));
    parts.push({ k: argLabel, got: arg, max: full * wArg });

    score = idea + arg;

    // 结构与篇幅校正
    var expect = isMat ? 480 : item.kind === "q200" ? 260 : 520;
    var cap = full;
    var notes = [];
    if (nPts === 0 && len > 40) { cap = Math.min(cap, full * 0.85); notes.push("没有分点编号，阅卷老师找不到采分点，结构分按 85% 计。"); }
    if (len < expect * 0.45) { cap = Math.min(cap, full * 0.62); notes.push("篇幅 " + len + " 字，明显短于该题建议的 " + expect + " 字，论证不完整。"); }
    else if (len < expect * 0.7) { cap = Math.min(cap, full * 0.85); notes.push("篇幅偏短（" + len + " 字），建议写到 " + expect + " 字左右。"); }
    if (isMat && quotes.length === 0) { notes.push("全篇没有引用材料原句：材料题「原理分 + 材料分」各半，不引材料最高只能拿一半。"); }
    if (!isMat && (item.type === "启示影响") && heads4 < 3) { notes.push("启示/影响类建议用 4 字小标题（如「教育目的」「教育内容」）分维度写，当前只有 " + heads4 + " 个。"); }
    if (!isMat && (item.type === "人物思想") && nPts < 4) { notes.push("人物思想类至少要分 4 点（教育目的 / 内容 / 方法 / 制度 / 评价），当前 " + nPts + " 点。"); }

    score = Math.max(0, Math.min(cap, score));
    var final = Math.round(score * 2) / 2;
    var rate = final / full;

    // 提升建议（按短板排序）
    var advice = [];
    if (misses.length) {
      advice.push("补 3 个没写到的采分点：" + misses.slice(0, 3).map(function (m) { return "「" + m.t.slice(0, 14) + "」"; }).join("、") + "。");
    }
    if (causal < 2) advice.push("每个观点后补一句因果（「因为…」「这说明…」）：论证分只有 " + Math.round(arg) + "/" + Math.round(full * wArg) + "。");
    if (isMat && quotes.length < 2) advice.push("每问至少引 1 句材料原句，写成「材料中『……』说明……」，两问就是 2 处。");
    if (!isMat && evalN === 0) advice.push("结尾补评价段：历史贡献 + 局限，一句就够，这是 15 分题与 12 分题的差别。");
    if (nPts < 3) advice.push("分 3–5 点、每点一段并编号（一、（一）1. ①），别写成一大段。");
    if (len < expect * 0.7) advice.push("再补 " + Math.max(60, expect - len) + " 字左右的内容，把每点从一句扩成两句。");
    if (heads4 >= 3) advice.push("四字小标题用得不错，保持这种「维度 + 术语」的写法。");
    advice = advice.slice(0, 5);

    // 亮点
    var bright = [];
    if (hits.length) bright.push("命中了 " + hits.filter(function (h) { return h.level >= 1; }).length + " 个完整采分点、" + hits.filter(function (h) { return h.level < 1; }).length + " 个半命中，主要落在「" + hits.slice(0, 3).map(function (h) { return h.t.slice(0, 10); }).join("」「") + "」。");
    if (causal >= 2) bright.push("有 " + causal + " 处因果论证，说明不是只罗列观点。");
    if (isMat && quotes.length) bright.push("引用了 " + quotes.length + " 处材料原句，原理能落到材料上。");
    if (!isMat && evalN) bright.push("有独立评价句，观点之外给了判断。");
    if (heads4 >= 3) bright.push("用了 " + heads4 + " 个四字小标题，结构清楚。");
    if (!bright.length) bright.push("先把题干关键词写进第一句，再把教材定义补上，能立刻多拿分。");

    return {
      score: final,
      full: full,
      rate: Math.round(rate * 100),
      parts: parts.map(function (p) { return { k: p.k, got: Math.round(p.got * 10) / 10, max: Math.round(p.max * 10) / 10 }; }),
      hits: hits,
      misses: misses,
      quotes: quotes,
      causal: causal,
      evalN: evalN,
      points: nPts,
      heads4: heads4,
      len: len,
      bright: bright,
      advice: advice,
      notes: notes,
      cap: Math.round(cap * 2) / 2,
      mode: "local"
    };
  }

  // 速练：只写「小标题 + 大意」时的结构检查
  function outline(item, text) {
    var lines = String(text || "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var rows = [], nHead4 = 0, dimHit = [];
    var dims = item.dims || [];
    lines.forEach(function (l) {
      var m = l.match(/^([\u4e00-\u9fa5]{2,8})\s*[：:、]\s*(.+)$/);
      var head = "", body = l;
      if (m) { head = m[1]; body = m[2]; }
      else {
        var m2 = l.match(/^([\u4e00-\u9fa5]{4})(?=[\u4e00-\u9fa5]{6,})/);
        if (m2) { head = m2[1]; body = l.slice(4); }
      }
      if (/^[\u4e00-\u9fa5]{4}$/.test(head)) nHead4++;
      var bn = norm(body);
      var bset = bigrams(bn);
      // 与各采分点比：关键词命中优先，其次二元组 Dice 相似度
      var best = null, bestCov = 0;
      (item.pts || []).forEach(function (p) {
        var th = termsIn(bn, p.kw);
        var ptBig = bigrams(norm((p.t || "") + (p.body || "")));
        var inter = 0, keys = Object.keys(bset);
        keys.forEach(function (g) { if (ptBig[g]) inter++; });
        var dice = keys.length ? (2 * inter) / (keys.length + Object.keys(ptBig).length) : 0;
        var c = Math.max(dice * 2.2, th.length ? 0.5 + 0.15 * th.length : 0);
        if (c > bestCov) { bestCov = c; best = p; }
      });
      dims.forEach(function (d) { if (l.indexOf(d) >= 0) dimHit.push(d); });
      rows.push({
        head: head,
        body: body,
        ok: body.length >= 6,
        head4: /^[\u4e00-\u9fa5]{4}$/.test(head),
        match: best ? best.t : "",
        cov: Math.round(bestCov * 100) / 100
      });
    });
    var n = rows.length;
    var need = item.full >= 15 ? 5 : 3;
    var good = rows.filter(function (r) { return r.ok && r.head; }).length;
    var dimsUniq = Array.from(new Set(dimHit));
    var tips = [];
    if (n < need) tips.push("分点只有 " + n + " 个，这类题建议 " + need + " 点左右（按分值每 2–3 分一点）。");
    if (good < n) tips.push((n - good) + " 行只有小标题、没写大意，展开时容易变成空话。");
    if (item.type === "启示影响" && nHead4 < 3) tips.push("启示/影响类用 4 字小标题分维度（教育目的 / 教育内容 / 教育方法 / 教育制度），当前 " + nHead4 + " 个。");
    if (item.type === "人物思想" && n < 4) tips.push("人物思想类至少 4 点：人性论 / 教育作用 / 教育目的 / 内容与方法 / 评价。");
    if (dims.length && dimsUniq.length < Math.min(3, dims.length)) tips.push("维度覆盖不足：可参考「" + dims.slice(0, 4).join(" / ") + "」。");
    var score = Math.round(Math.min(item.full, item.full * (0.35 * Math.min(1, good / need) + 0.35 * Math.min(1, n / need) + 0.3 * (dimsUniq.length ? Math.min(1, dimsUniq.length / 3) : 0.6))) * 2) / 2;
    return { rows: rows, n: n, good: good, heads4: nHead4, dims: dimsUniq, tips: tips, est: score, full: item.full };
  }

  // ---------- AI 精批（可选） ----------
  var PROVIDERS = {
    deepseek: { name: "DeepSeek 官方", base: "https://api.deepseek.com/v1", model: "deepseek-chat" },
    bailian: { name: "阿里百炼", base: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
    custom: { name: "自定义（OpenAI 兼容）", base: "", model: "" }
  };

  function aiConfig() {
    try {
      return JSON.parse(localStorage.getItem("k3_ai_cfg") || "{}");
    } catch (e) {
      return {};
    }
  }

  function aiSave(cfg) {
    localStorage.setItem("k3_ai_cfg", JSON.stringify(cfg || {}));
  }

  function buildPrompt(item, answer, local) {
    var pts = (item.pts || []).map(function (p, i) {
      return (i + 1) + ". " + p.t + "（权重 " + p.w + "，关键词：" + (p.kw || []).slice(0, 4).join("、") + "）";
    }).join("\n");
    var sys = "你是 333 教育综合统考阅卷老师。按“踩点给分 + 言之有理”判分，不灌鸡汤、不羞辱。只输出 JSON。";
    var user = [
      "题型：" + (item.kind === "material" ? "材料分析题" : item.kind === "q200" ? "主观题" : "论述题") + "，满分 " + item.full + " 分，科目：" + item.subj,
      "题目：" + item.q.slice(0, 600),
      item.kind === "material" ? "材料：" + String(item.mat).slice(0, 800) : "",
      "本地采分点（可补充，不可全推翻）：\n" + pts,
      "考生作答：\n" + String(answer).slice(0, 2500),
      "本地机评：" + local.score + "/" + item.full + "（参考，不要照抄）",
      "",
      "输出 JSON：{\"score\":数字,\"parts\":[{\"k\":\"观点/原理\",\"got\":数字,\"max\":数字},{\"k\":\"论证\",\"got\":..,\"max\":..},{\"k\":\"材料/评价\",\"got\":..,\"max\":..}],",
      "\"bright\":[\"亮点1\",\"亮点2\"],\"misses\":[{\"t\":\"缺失的采分点\",\"why\":\"为什么该有\"}],",
      "\"advice\":[\"改法1\",\"改法2\"],\"comment\":\"60 字总评\",\"sample\":\"一句可直接背的模板句\"}",
      "规则：论述=观点/论证各半；材料=原理+结合材料各半；只写术语不给内涵判半；引用材料原句才给材料分；启示影响类没分维度要扣分。"
    ].filter(Boolean).join("\n\n");
    return { sys: sys, user: user };
  }

  function aiGrade(item, answer, local, cfg) {
    cfg = cfg || aiConfig();
    var p = PROVIDERS[cfg.provider || "deepseek"] || PROVIDERS.deepseek;
    var base = (cfg.base || p.base || "").replace(/\/+$/, "");
    var model = cfg.model || p.model;
    var key = cfg.key || "";
    if (!base || !model || !key) {
      return Promise.reject(new Error("还没填 API Key / Base URL"));
    }
    var pr = buildPrompt(item, answer, local);
    return fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: model,
        temperature: 0.2,
        messages: [{ role: "system", content: pr.sys }, { role: "user", content: pr.user }]
      })
    })
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error("HTTP " + r.status + "：" + t.slice(0, 120)); });
        return r.json();
      })
      .then(function (j) {
        var c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (!c) throw new Error("返回里没有内容");
        var m = c.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("返回的不是 JSON");
        var o = JSON.parse(m[0]);
        o.mode = "ai";
        o.full = item.full;
        return o;
      });
  }

// ---------- 图片识别（可选，走百炼视觉模型） ----------
  function aiVision(imgUrl, cfg, hint) {
    cfg = cfg || aiConfig();
    var base = (cfg.visionBase || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "");
    var model = cfg.visionModel || "qwen-vl-max";
    var key = cfg.visionKey || cfg.key || "";
    if (!key) return Promise.reject(new Error("图片识别要百炼的 Key（DeepSeek 不支持看图）"));
    var prompt = "把这张图片里的" + (hint || "题目或手写答题内容") + "完整转录成文字，保留分点编号和换行；看不清的字用□代替；不要加解释。";
    return fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: model,
        temperature: 0,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imgUrl } }
          ]
        }]
      })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error("HTTP " + r.status + "：" + t.slice(0, 120)); });
      return r.json();
    }).then(function (j) {
      var c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!c) throw new Error("没返回文字");
      if (typeof c !== "string") c = (c.map(function (x) { return x.text || ""; }).join(""));
      return String(c).trim();
    });
  }

  // ---------- AI 生成练习题 ----------
  function aiMake(topic, cfg) {
    cfg = cfg || aiConfig();
    var p = PROVIDERS[cfg.provider || "deepseek"] || PROVIDERS.deepseek;
    var base = (cfg.base || p.base || "").replace(/\/+$/, "");
    var model = cfg.model || p.model;
    if (!base || !key0(cfg)) return Promise.reject(new Error("还没配 AI 接口"));
    var sys = "你是 333 教育综合命题老师。仿统考风格出 1 道主观题，只输出 JSON。";
    var user = "主题：" + (topic || "教育综合高频考点") + "\n" +
      '输出 {"q":"题干","asks":"答题要求","type":"启示影响|人物思想|制度法案|理论论述|材料分析","full":15,"pts":[{"t":"采分点小标题","body":"该点要写的内容","w":3}],"sample":"50 字示范答案"}\n' +
      "要求：15 分题给 5 个点左右、权重和=15；题干像真题，不要出现「请背诵」。";
    return fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.key },
      body: JSON.stringify({ model: model, temperature: 0.7, messages: [{ role: "system", content: sys }, { role: "user", content: user }] })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error("HTTP " + r.status + "：" + t.slice(0, 100)); });
      return r.json();
    }).then(function (j) {
      var c = j.choices[0].message.content;
      var m = c.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("返回的不是 JSON");
      var o = JSON.parse(m[0]);
      o.id = "ai-" + Date.now();
      o.kind = o.type === "材料分析" ? "material" : "essay";
      o.q = o.q || "";
      o.ans = o.sample || "";
      o.pts = (o.pts || []).map(function (p, i) {
        p.w = +p.w || Math.round(((+o.full || 15) / Math.max(1, o.pts.length)) * 10) / 10;
        p.n = i + 1;
        p.kw = String(p.t || "").split(/[，、；]/).filter(function (x) { return x.length >= 2; }).slice(0, 5);
        return p;
      });
      return o;
    });
  }

  function key0(cfg) { return !!(cfg && cfg.key); }

  root.K3G = {
    norm: norm,
    cover: cover,
    bigrams: bigrams,
    grade: grade,
    outline: outline,
    providers: PROVIDERS,
    aiConfig: aiConfig,
    aiSave: aiSave,
    aiGrade: aiGrade,
    aiVision: aiVision,
    aiMake: aiMake
  };
})(typeof window !== "undefined" ? window : globalThis);