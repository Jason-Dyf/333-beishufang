# -*- coding: utf-8 -*-
"""为每个考点建立「出处索引」：知识点 -> 在哪本书、哪一页。
输入：_points.json（node _dumppts.js 生成）
      kaoyan333-site/assets/data/src/s-*.js
输出：kaoyan333-site/assets/data/pointsrc.js  window.K3_PSRC
"""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "kaoyan333-site", "assets", "data", "src")
OUT = os.path.join(BASE, "kaoyan333-site", "assets", "data", "pointsrc.js")

DAGANG = {
    "edu-china": "dagang_cn",
    "edu-foreign": "dagang_wj",
    "edu-principle": "dagang_ep",
    "edu-psych": "dagang_xl",
}
DANDAN_RANGE = {
    "edu-principle": (4, 70),
    "edu-china": (71, 140),
    "edu-foreign": (141, 199),
    "edu-psych": (200, 255),
}


def load_src(key):
    p = os.path.join(SRC, "s-%s.js" % key)
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        txt = f.read()
    i = txt.find('window.K3_SRC["')
    if i < 0:
        return None
    i = txt.find("{", txt.find("=", i))
    if i < 0:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(txt[i:])
        return obj
    except Exception:
        return None


def norm(t):
    t = re.sub(r"[「」《》\s()（）·、,，。.;；:：!！?？]", "", t or "")
    return t


TOC_RE = re.compile(r"[.·•]{1,3}\s*\d{1,3}")


def is_toc(t):
    """目录页：开头就是「目录」，或大量「·64」式页码。"""
    if not t:
        return True
    head = t[:40]
    if "目录" in head or "目 录" in head:
        return True
    if len(TOC_RE.findall(t)) >= 6:
        return True
    return len(t) < 60


def find_page(book, needle, lo=1, hi=None):
    """在 book.pages 中查找 needle 首次出现的页码（跳过目录页）。"""
    pages = book["pages"]
    hi = hi or len(pages) - 1
    best, best_n = None, 0
    for p in range(lo, min(hi, len(pages) - 1) + 1):
        t = pages[p]
        if not t or needle not in t or is_toc(t):
            continue
        n = t.count(needle)
        if n > best_n:
            best, best_n = p, n
            if n >= 3:
                break
    return best


def main():
    with open(os.path.join(BASE, "_points.json"), encoding="utf-8") as f:
        pts = json.load(f)
    books = {}
    for k in ["dagang_cn", "dagang_wj", "dagang_ep", "dagang_xl", "dandan", "dandan_supp"]:
        b = load_src(k)
        if b:
            books[k] = b

    out = {}
    hit_dg = hit_dd = 0
    for p in pts:
        title = p["t"]
        key = "%s|%s|%d" % (p["subj"], p["ch"], p["i"])
        cands = []
        dg = books.get(DAGANG.get(p["subj"], ""))
        dd = books.get("dandan")
        variants = []
        base = norm(title)
        core = re.sub(r"(的含义|的基本含义|的含义与特点|的概念|的主要内容|的基本内容|的特点|的意义|的作用"
                      r"|的原则|的方法|的要求|的途径|的历史|的演变|的比较|与|及)+$", "", base)
        for v in (base, core):
            if v and v not in variants:
                variants.append(v)
        for n in (10, 8, 6, 5, 4):
            for v in (base, core):
                if len(v) > n and v[:n] not in variants:
                    variants.append(v[:n])
        variants = [v for v in variants if len(v) >= 4]
        found = None
        if dg:
            for v in variants:
                pg = find_page(dg, v)
                if pg:
                    found = {"b": dg["id"], "n": dg["name"], "p": pg}
                    break
        if found:
            cands.append(found)
            hit_dg += 1
        if dd and p["subj"] in DANDAN_RANGE:
            lo, hi = DANDAN_RANGE[p["subj"]]
            for v in variants:
                pg = find_page(dd, v, lo, hi)
                if pg:
                    cands.append({"b": "dandan", "n": dd["name"], "p": pg})
                    hit_dd += 1
                    break
        if cands:
            out[key] = cands

    js = "window.K3_PSRC=%s;\n" % json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* 考点出处索引：由 build_psrc.py 自动生成 */\n" + js)
    n = len(pts)
    rep = ["points=%d 有出处=%d (%.1f%%) 其中大纲全解命中=%d 丹丹命中=%d" % (
        n, len(out), 100.0 * len(out) / max(1, n), hit_dg, hit_dd)]
    with open(os.path.join(BASE, "_psrc_report.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(rep) + "\n")


if __name__ == "__main__":
    main()