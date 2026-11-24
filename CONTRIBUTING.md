# 欢迎贡献

[强化学习：问题、方法与持续学习智能体](https://yingwen.io/rl-course/)（温颖）的阅读稿、课件和交互演示在 GitHub 上公开修订，欢迎一起把它改好。读者在阅读和演算中最容易发现错误和讲得不清楚的地方。一条勘误、一句“这里没看懂”，都会进入下一次发布。

所有讨论与修改都在本仓库公开进行：意见用 issue，修改用 pull request（PR）。你的 issue、评论与合并的 PR 会记录在仓库的 [contributors](https://github.com/ying-wen/rl-course/graphs/contributors) 与各 issue 页里。

## 欢迎哪些贡献

- **勘误**：错字、公式、记号、数字、链接的错误。附上你的依据（推导、文献页码或代码输出）最有帮助。
- **讲解**：哪一步推导没看懂，前后两处说法对不上，某个假设没有说清，某张图的图注与图不符。只说出“读到这里卡住了”也有用。
- **例子、推导与文献**：一个能把概念讲清楚的小例子，一段缺失的推导，一篇确知存在、与本节直接相关的文献。
- **练习**：新的练习题，最好附上解答思路，并说明它检验的是本章的哪一点。
- **交互演示**：在某些浏览器、手机或暗色主题下显示不全，算出的数与正文不一致；或者一个新演示的想法乃至实现（原生 JavaScript，无外部依赖）。
- **课件**：某一页的错误或改进建议。课件以 PDF 与页图发布，LaTeX 源不在本仓库；在逐页课件里点页面下方的“对本页提意见”，页码会自动填好，作者据此修改课件。

## 三种参与方式

| 想做的事 | 做法 |
|---|---|
| 报告错误、提出建议 | 开一个 issue：[勘误](https://github.com/ying-wen/rl-course/issues/new?template=erratum.yml)、[内容建议](https://github.com/ying-wen/rl-course/issues/new?template=suggestion.yml)、[交互演示](https://github.com/ying-wen/rl-course/issues/new?template=demo.yml)。课件页的问题，在逐页课件里点“对本页提意见” |
| 改阅读稿的一两处文字 | 在阅读稿章题下点“在 GitHub 上修改本章”，在浏览器里改完后提交 PR（见下文“在网页上改”） |
| 改多处、写新的一节或新的演示 | fork 本仓库，在本地改 `source/` 下的文件，再提交 PR（见下文“在本地改”）。改动大的请先开 issue 说明打算 |

开 issue 或 PR 之前，先在 [issues](https://github.com/ying-wen/rl-course/issues) 与 [pull requests](https://github.com/ying-wen/rl-course/pulls) 里搜一下有没有人提过同一处。

## 源文件在哪里

网站上的 HTML、PDF、页图和代码压缩包都由作者在本地构建生成，直接改它们会在下次发布时被覆盖。可以改的源文件在 `source/` 目录：

| 网站上的内容 | 源文件 |
|---|---|
| 阅读稿第 N 章（`reading/chapter-NN.html`） | `source/textbook/NN.md`；第 0 章是 `00-course.md`，附录“预备知识”是 `00-prerequisites.md`，复现附录是 `appendix-reproduction.md` |
| 阅读稿里的交互演示 | `source/tools/demos/<名字>.js`，共用的部分在 `demo-core.js` 与 `demo.css`；名字是 md 里 `::: {.demo widget="名字"}` 的 `widget` |
| 课件 | 只发布 PDF（`pdf/rl-yingwen-slides-*.pdf`）与页图（`reader/pages/`），用 issue 提意见 |
| 各章实验代码 | 只发布压缩包（`code/`），用 issue 提意见 |

## 写作要求

- **术语与记号**：同策略 / 离策略；状态分布写小写 $d$，数据集写花体 $\mathcal D$；行为策略写 $b$（第 14 章写 $\mu$，那里 $b$ 指身体）；tile coding 译作“瓦片编码”；lifetime 不译。一个记号在一章里只表示一样东西，首次出现时给出定义。拿不准时，照本章已有的写法。
- **数字要有来处**：来自课件、本课代码的输出，或给出页码的文献。不估算、不凭记忆写数字；改动了实验数字，请在 PR 里写明运行的命令与次数。
- **文献**只列确知存在的，写清作者、题名、年份与出处。
- **文风**保持强化学习的学术用语，从问题出发，先讲直觉再形式化，把假设与失效的情形说清楚。请不要用以下几种写法：先立后破的“不是 X 而是 Y”；段落末尾用一句短句制造余味；听起来有深度的格言；“你可能会想”“答案出人意料”一类事先安排的铺垫；“为什么？因为……”式的自问自答。
- **公式**写在 `$…$` 或 `$$…$$` 里。收尾的 `$` 后面不要紧跟数字（写 `$n\approx 15$K`，不写 `$n\approx$15K`），否则网页与 PDF 都排不出公式。
- **块**：定义、定理、例子、算法、注记、易错点、延伸、练习用 pandoc 的 fenced div 写，如 `::: {.definition title="……"}` … `:::`，照本章已有的样子。
- 一个 PR 只做一件事，例如“第 6 章 6.3 节重要性采样比的定义”。

## 在网页上改（适合一两处文字）

1. 打开阅读稿的那一章，点章题下的“在 GitHub 上修改本章”。GitHub 会在网页编辑器里打开对应的 `source/textbook/NN.md`；第一次会请你 fork 本仓库，点确认即可。
2. 用浏览器的查找（Ctrl/⌘ F）定位要改的句子，改完点 “Commit changes…”，在说明里写一句改了什么、为什么改，选 “Propose changes”。
3. 在接下来的页面点 “Create pull request”，按模板填写。

## 在本地改

```sh
git clone https://github.com/<你的用户名>/rl-course.git
cd rl-course
git switch -c fix-ch06-rho            # 分支名写清改的是什么
# 编辑 source/ 下的文件
git commit -am "第 6 章 6.3：重要性采样比的定义补上覆盖条件"
git push -u origin fix-ch06-rho       # 然后在 GitHub 上开 PR
```

仓库里网站部分有几百 MB；只改 `source/` 时可以用稀疏检出，少下载页图与 PDF：

```sh
git clone --filter=blob:none --sparse https://github.com/<你的用户名>/rl-course.git
cd rl-course && git sparse-checkout set source .github
```

提交前的自检（可选，作者合并后还会整本重编）：

- 阅读稿 md 的语法：`pandoc -f markdown+tex_math_single_backslash+tex_math_dollars -t html5 source/textbook/06.md -o /dev/null` 不报错。
- 交互演示：`cd source && python3 tools/demos/preview.py /tmp/demo-preview textbook/06.md`，再用任意静态服务打开 `/tmp/demo-preview/06.html`（例如 `python3 -m http.server -d /tmp/demo-preview`），亮色、暗色与手机宽度各看一遍。需要本机装有 pandoc；页面样式取自仓库里的 `reading/chapter-01.html`，稀疏检出时没有这一页，脚本会从阅读站下载。

## 合并之后

PR 合并后网站不会马上变化。作者把 `source/` 的改动同步回课程的源目录，重编阅读稿与 PDF，核对链接后整体发布；发布时 `source/` 会按新的源目录整体刷新。合并的改动会出现在下一次发布里。

## 许可

阅读稿、课件等课程文字与图按 CC BY-NC-SA 4.0 发布，代码按 MIT 发布，详见 [LICENSE.md](LICENSE.md)。提交 PR 即表示你同意你的改动按同样的许可发布。课件与阅读稿引用的论文图、照片和截图，版权归原作者所有，不在本仓库的许可范围内；请不要提交来源不明的图片。
