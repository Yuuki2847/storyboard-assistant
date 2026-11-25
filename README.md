# 分镜审阅台

读取 TXT / Markdown / Excel 时可直接用浏览器打开 index.html。读取 Word 时，在 Windows 上安装并初始化 Microsoft Word 或 Excel，安装 Node.js，然后在本目录运行 `node server.js` 并打开 http://127.0.0.1:8765。Word 文件由本机服务读取，Excel 文件由浏览器解析，单文件上限 20 MB。Word 读取正文，Excel 按工作表顺序读取单元格值，工作表名作为标题，同行单元格以制表符分隔。

## 操作流程

1. 导入 TXT、Markdown（UTF-8）、Word（.doc / .docx）或 Excel（.xls / .xlsx）剧本，再选择一张或多张 PNG、JPEG 或 WebP 草稿。
2. 选择分镜，在剧本文字框保留该镜头相关的动作或台词。批量导入时，每张草稿以导入时的剧本文字和对焦意图为初始值，之后可以逐镜头修改。
3. 选择标注点并点击画面。重新点击可以移动同一个点。人体标注对应同一人物，左右按画面方向标记。
4. 阅读修改建议并填写备注。导出当前镜头的标注 PNG，以及全部镜头的审阅 JSON。刷新页面前请导出需要保留的结果。

## 架构

| 文件 | 职责 |
| --- | --- |
| index.html | 文件导入、镜头切换、标注和建议面板 |
| style.css | 审阅工作区与响应式布局 |
| app.js | 多镜头会话、Canvas 叠加绘制、交互与导出 |
| review.js | 标注定义、骨架连线定义和三类规则 |
| server.js | 本机应用入口和 Office 文件导入接口 |
| read-office.ps1 | 通过 Windows 上的 Word / Excel 提取剧本文字 |

标注坐标归一化到 0–1，人体肢段对比按原图宽高比换算。建议来自手动标注与剧本关键词，虚实关系由创作者在原绘图工具中落实。PNG 包含当前网格和标注，长边最多 2400 像素。JSON 是审阅报告，包含剧本片段、标注、意图和备注。


## 修改样图

每张草稿都有构图裁切和景深对照，可分别下载 PNG。标注主体后，样图会根据主体位置更新。景深虚化以主体为中心估算，在保留环境模式下显示全幅对照。两侧前臂或小腿具有足够的有效标注且长度差达到提示阈值时，会增加一版关节调整示意。样图由 samples.js 在浏览器内绘制，长边最多 800 像素。

如果本地服务已启动，更新后请重新运行 node server.js 并刷新页面。

## 从剧本绘制

选择「从剧本绘制」，导入或粘贴剧本，再点击「生成示意分镜」。此模式无需草稿图片，与审阅模式各自保留编辑内容。可用「第 1 场」「镜头 1」等标题明确场次和镜头。没有镜头标题时按行和句末标点拆分。每次最多显示前 60 镜，可分段生成其余剧本。

storyboard.js 根据景别、场景和动作关键词绘制人物轮廓及环境示意。每张卡片保留对应剧本文字，可独立下载 960 × 540 PNG。绘图采用规则和模板，人物外观、复杂动作和具体道具需要后续细化。

### Office 导入遇到 HTTP 405

双击 start-storyboard.cmd（或运行 node server.js），保持窗口打开，再用 Edge 或 Chrome 访问 http://127.0.0.1:8765/。Word 导入需要此地址提供的读取接口。TXT、Markdown 和 Excel 可从静态预览或直接打开 index.html 导入。如果已启动旧版服务，先在其窗口按 Ctrl+C，再启动新版。

### GitHub Pages 上导入 Excel

将更新后的静态文件提交到 Pages 发布目录，包含 excel-script.js、xlsx.full.min.js 和 LICENSE-SheetJS.txt。Excel（.xls / .xlsx）由浏览器解析，不需要 Node.js、Microsoft Office 或读取接口。Word（.doc / .docx）仍需启动 Windows 本机服务；在 GitHub Pages 上可粘贴 Word 正文，或先另存为 TXT 再导入。
