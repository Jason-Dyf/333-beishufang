# 构建与二次开发

仓库里有两套东西：

| 目录 | 是什么 |
| --- | --- |
| `src/` | 多文件站点源码（`index.html` + `assets/app.js` + `assets/views-*.js` + `assets/data/*.js`） |
| `tools/` | 把源码打成单文件、以及重建数据用的脚本 |
| `333beishufang-tablet.html` | 由 `src/` 打包出来的单文件成品（已内联全部数据） |
| `333beishufang-1.1.0.apk` | 把上面那个单文件塞进 WebView 壳里的安卓包 |

## 1. 本地跑多文件版

`src/` 是纯静态的，直接双击 `src/index.html` 就能开，也可以用任意静态服务器：

```bash
cd src
python -m http.server 8000
# 浏览器打开 http://127.0.0.1:8000
```

## 2. 打成单文件

```bash
node tools/_tablet.js
# 产出 333背书房-平板版.html（约 14.5 MB，内含 22 本教材原文的惰性 JSON）
```

脚本做三件事：把 `index.html` 里引用的 CSS/JS 全部内联；把 `assets/data/src/s-*.js` 的原文转成
`<script type="application/json" id="src-json-<id>">`（打开对应页面时才解析）；输出单文件。

## 3. 重建数据（可选）

数据文件已经是成品，只有你换了原始资料才需要重跑：

| 脚本 | 作用 |
| --- | --- |
| `tools/mksrc.py` | 教材分页文本 → `assets/data/src/s-*.js` 原文库 |
| `tools/build_psrc.py` | 考点 → 出处（书/版本/页）`pointsrc.js` |
| `tools/_qsrc.js` | 题目 → 出处 `qsrc.js` |
| `tools/_plink.js` | 考点 ↔ 相关练习/真题 `plink.js` |
| `tools/gen_parts.js` | 重写 `index.html` 里的 `<!-- QUIZ_SCRIPTS -->` / `<!-- PART_SCRIPTS -->` 占位 |

OCR 相关脚本（`ocr_pdf.py`、`q1200_parse.py`、`mock_papers.py` 等）依赖原始 PDF 与 rapidocr，未随仓库发布。

## 4. 打 APK

APK 是一个极薄的 WebView 壳：安卓工程读 `assets/index.html`（就是单文件版），另外挂了一个
`K3Android` 的 JS 桥做系统语音识别与麦克风授权。

需要 JDK 17 + Android build-tools（`aapt2` / `d8` / `zipalign` / `apksigner`）和一份 `android.jar`：

```bash
# 1) 把单文件放进 assets
cp 333beishufang-tablet.html apk/proj/assets/index.html

# 2) 编译（示意，路径按本机调整）
javac -source 8 -target 8 -classpath android.jar -d build/classes $(find src -name '*.java')
d8 --lib android.jar --min-api 21 --output build/dex $(find build/classes -name '*.class')
aapt2 link -A proj/assets -I android.jar --manifest proj/AndroidManifest.xml -o build/base.apk
# 3) 塞入 classes.dex、对齐、签名
zip -j build/base.apk build/dex/classes.dex
zipalign -f -p 4 build/base.apk build/aligned.apk
apksigner sign --ks debug.keystore --ks-pass pass:android --out 333beishufang.apk build/aligned.apk
```

## 5. 改完怎么验证

```bash
node _smoke.js     # 遍历全部视图，检查渲染是否报错（0 错误为通过）
```

## 许可

代码（结构、样式、脚本、构建工具）MIT；题目与教材内容版权归原作者/出版方，仅供个人复习使用。