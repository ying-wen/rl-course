<!-- 写作要求与源文件位置见 CONTRIBUTING.md。一个 PR 只做一件事。 -->

## 改了什么

<!-- 章节与位置，例如：第 6 章 6.3 节第二段；source/tools/demos/is-coverage.js -->

## 为什么改

<!-- 原文的问题，以及新写法的依据：课件页、文献（作者、题名、年份、页码）或代码输出（命令与运行次数） -->

## 自检

- [ ] 只改了 `source/` 下的文件，没有改生成的 HTML、PDF 或页图
- [ ] 术语与记号符合 CONTRIBUTING.md 的“写作要求”，与本章已有写法一致
- [ ] 新写或改动的数字都有来处，文献都确知存在
- [ ] 改了阅读稿时，`pandoc -f markdown+tex_math_single_backslash+tex_math_dollars -t html5 <文件> -o /dev/null` 不报错
- [ ] 改了交互演示时，用 `source/tools/demos/preview.py` 在亮色、暗色与手机宽度下看过
