"""Preview the interactive demos without rebuilding the reading pages.

    python3 tools/demos/preview.py OUT_DIR [textbook/04.md …]

For every ::: {.demo widget=…} block in the given chapters (default: all textbook/NN.md) writes
OUT_DIR/<chapter>.html with the reader's CSS, the block text rendered by pandoc and the demo
scripts, plus OUT_DIR/index.html.  Serve OUT_DIR with any static server and open it.
A theme switch at the top of each page checks both colour schemes.
"""
import html, re, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RC = HERE.parent.parent
SITE = 'https://yingwen.io/rl-course/'


def reader_css():
    """阅读页的样式。课程源目录里取 textbook_reader.READER_CSS；GitHub 仓库的 source/ 里没有这个排版脚本，
    改从仓库里已构建的 reading/chapter-01.html 取第一个 <style>，没有检出就从阅读站下载这一页。"""
    sys.path.insert(0, str(RC / 'tools'))
    try:
        import textbook_reader
        return textbook_reader.READER_CSS
    except ImportError:
        pass
    built = RC.parent / 'reading' / 'chapter-01.html'
    if built.is_file():
        t = built.read_text(encoding='utf-8')
    else:
        import urllib.request
        with urllib.request.urlopen(SITE + 'reading/chapter-01.html', timeout=30) as r:
            t = r.read().decode('utf-8')
    m = re.search(r'<style>(.*?)</style>', t, re.S)
    return m.group(1) if m else ''

CSS = ''
BLOCK = re.compile(r'^::: \{\.demo [^}]*\}\n.*?^:::\s*$', re.S | re.M)


def page(title, blocks):
    body = subprocess.run(['pandoc', '-f', 'markdown+tex_math_single_backslash+tex_math_dollars', '-t', 'html5',
                           '--mathml'], input='\n\n'.join(blocks), text=True, capture_output=True, check=True).stdout
    names = sorted(set(re.findall(r'data-widget="([A-Za-z0-9_-]+)"', body)))
    js = '\n'.join([(HERE / 'demo-core.js').read_text()] + [(HERE / f'{n}.js').read_text() for n in names if (HERE / f'{n}.js').is_file()])
    switch = ('<p style="font:13px sans-serif">主题：<button onclick="document.documentElement.dataset.theme=\'light\'">亮</button> '
              '<button onclick="document.documentElement.dataset.theme=\'dark\'">暗</button> '
              '<button onclick="delete document.documentElement.dataset.theme">跟随系统</button>　<a href="index.html">全部</a></p>')
    return ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{html.escape(title)}</title><style>{CSS}{(HERE / "demo.css").read_text()}'
            'main{max-width:46em;margin:0 auto;padding:1.5em max(16px,env(safe-area-inset-left))}</style></head>'
            f'<body><main><article class="chapter">{switch}<h1>{html.escape(title)}</h1>{body}</article></main><script>{js}</script></body></html>')


def main():
    global CSS
    CSS = reader_css()
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    files = [Path(a) for a in sys.argv[2:]] or sorted((RC / 'textbook').glob('[0-9][0-9].md'))
    links = []
    for f in files:
        blocks = BLOCK.findall(f.read_text())
        if not blocks:
            continue
        (out / f'{f.stem}.html').write_text(page(f'第 {int(f.stem)} 章演示', blocks))
        links.append(f'<li><a href="{f.stem}.html">第 {int(f.stem)} 章</a>：{len(blocks)} 个</li>')
        print(f.name, len(blocks), 'demos')
    (out / 'index.html').write_text('<!doctype html><meta charset="utf-8"><title>演示预览</title><ul>' + ''.join(links) + '</ul>')


if __name__ == '__main__':
    main()
