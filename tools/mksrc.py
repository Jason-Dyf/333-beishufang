# -*- coding: utf-8 -*-
"""把 _ocr/<book>/pNNN.json 编译成前端可用的原文检索库 assets/data/src/*.js"""
import os, json, re, glob

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "kaoyan333-site", "assets", "data", "src")
os.makedirs(OUT, exist_ok=True)

BOOKS = {
    "dandan":      ("丹丹333大纲考点轻松记", "27版", "P"),
    "dandan_supp": ("丹丹333补充资料", "27版", "P"),
    "dongqing200": ("冬青333主观题200题", "27版", "P"),
    "dongqing70":  ("冬青材料题70个考点", "27版", "P"),
    "q1200_ti":    ("选择题1200题·题目册", "27版", "P"),
    "q1200_jie":   ("选择题1200题·解析册", "27版", "P"),
    "bills":       ("外教史59个法案记忆表格", "冬青", "P"),
    "dagang_ep":   ("27大纲全解·教育学原理", "27版", "P"),
    "dagang_cn":   ("27大纲全解·中国教育史", "27版", "P"),
    "dagang_wj":   ("27大纲全解·外国教育史", "27版", "P"),
    "dagang_xl":   ("27大纲全解·教育心理学", "27版", "P"),
    "dd_ep_ti":    ("丹丹1000题·教育学原理", "27版", "P"),
    "dd_cn_ti":    ("丹丹1000题·中国教育史", "27版", "P"),
    "dd_wj_ti":    ("丹丹1000题·外国教育史", "27版", "P"),
    "dd_xl_ti":    ("丹丹1000题·教育心理学", "27版", "P"),
    "dd_ep_jie":   ("丹丹1000题解析·教育学原理", "27版", "P"),
    "dd_cn_jie":   ("丹丹1000题解析·中国教育史", "27版", "P"),
    "dd_wj_jie":   ("丹丹1000题解析·外国教育史", "27版", "P"),
    "dd_xl_jie":   ("丹丹1000题解析·教育心理学", "27版", "P"),
    "kc_ti":       ("凯程应试题库·试题册", "27版", "P"),
    "kc_jie":      ("凯程应试题库·解析册", "27版", "P"),
    "kaodian":     ("冬青选择题考点清单", "27版", "P"),
}

SUBJ_OF = {
    "dagang_cn": "edu-china", "dagang_wj": "edu-foreign",
    "dagang_ep": "edu-principle", "dagang_xl": "edu-psych",
    "dd_ep_ti": "edu-principle", "dd_ep_jie": "edu-principle",
    "dd_cn_ti": "edu-china", "dd_cn_jie": "edu-china",
    "dd_wj_ti": "edu-foreign", "dd_wj_jie": "edu-foreign",
    "dd_xl_ti": "edu-psych", "dd_xl_jie": "edu-psych",
}

NOISE = re.compile(
    r"^(?:\d{1,3}|[（(]?\s*\d+\s*[)）]?|第\s*\d+\s*页|丹丹|冬青|教育学原理|中国教育史|"
    r"外国教育史|教育心理学|高等教育出版社|江西高校出版社|续表|学习建议[:：].*)$")


def clean(lines):
    rows = []
    for ln in lines:
        t = (ln.get("t") or "").strip()
        if not t:
            continue
        b = ln.get("b") or [[0, 0]]
        y = sum(p[1] for p in b) / float(len(b))
        x = min(p[0] for p in b)
        rows.append((y, x, t))
    rows.sort(key=lambda r: (r[0], r[1]))
    out = []
    for y, x, t in rows:
        if NOISE.match(t.replace(" ", "")):
            continue
        if len(t) == 1 and not re.search(r"[\u4e00-\u9fa5]", t):
            continue
        out.append(t)
    txt = "\n".join(out)
    txt = re.sub(r"\n{2,}", "\n", txt).strip()
    return txt


def main():
    for key, (name, ver, _p) in BOOKS.items():
        files = sorted(glob.glob(os.path.join(BASE, "_ocr", key, "p*.json")))
        if not files:
            print("skip", key)
            continue
        pages = {}
        for f in files:
            with open(f, encoding="utf-8") as fh:
                d = json.load(fh)
            pno = d.get("page")
            t = clean(d.get("lines") or [])
            if t:
                pages[pno] = t
        n = max(pages) if pages else 0
        arr = [pages.get(i, "") for i in range(0, n + 1)]
        data = {"id": key, "name": name, "ver": ver, "subj": SUBJ_OF.get(key, ""), "pages": arr}
        js = "window.K3_SRC=window.K3_SRC||{};window.K3_SRC[%s]=%s;\n" % (
            json.dumps(key), json.dumps(data, ensure_ascii=False))
        with open(os.path.join(OUT, "s-%s.js" % key), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(js)
        total = sum(len(x) for x in arr)
        print("%-14s pages=%4d chars=%7d" % (key, n, total))


if __name__ == "__main__":
    main()