/* 阅读稿交互演示的公共运行时（tools/demos/）。
 * 阅读稿 md 写 ::: {.demo widget="名字" title="…"} 说明文字 :::，构建时把 demo-core.js 与用到的
 * 各 widget 脚本内联进页面。说明文字在 PDF 与无脚本时照常显示；脚本把交互区插在说明之前。
 * 每个 widget：RLDemo.register('名字', (ctx) => {...})。演示滚进视口才初始化，离开视口或标签页
 * 隐藏时动画暂停；颜色取阅读器主题变量，切换亮暗主题时重画。 */
(() => {
  'use strict';
  if (window.RLDemo) return;
  const registry = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }

  /* 可复现的随机数：mulberry32；normal 用 Box–Muller。 */
  function rng(seed = 1) {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = () => {
      let u = 0;
      while (u === 0) u = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
    };
    r.int = (n) => Math.floor(r() * n);
    return r;
  }

  function colors(root) {
    const s = getComputedStyle(root);
    const v = (n) => s.getPropertyValue(n).trim();
    return {
      ink: v('--ink'), soft: v('--soft'), muted: v('--muted'), faint: v('--faint'),
      line: v('--line'), rule: v('--rule'), bg: v('--bg'), surface: v('--surface'), tint: v('--tint'),
      accent: v('--accent'), accentSoft: v('--accent-soft'), warn: v('--warn'),
      series: [v('--d1'), v('--d2'), v('--d3'), v('--d4'), v('--d5')],
      dark: document.documentElement.dataset.theme === 'dark' ||
        (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches),
    };
  }

  /* 把两种颜色按 t∈[0,1] 混合（用于热力图）。接受 #rgb/#rrggbb。 */
  function hex(c) {
    const rgb = /^rgba?\(([^)]+)\)/.exec(c);
    if (rgb) return rgb[1].split(',').slice(0, 3).map((x) => Math.round(parseFloat(x)));
    c = c.replace('#', '');
    if (c.length === 3) c = [...c].map((x) => x + x).join('');
    return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    t = Math.max(0, Math.min(1, t));
    return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`;
  }

  /* 行内记号：m('V_{k+1}(s) = γ^k') → 带上下标的 HTML，单个拉丁字母与希腊字母排斜体。
   * 只做显示，不是 TeX：_x / _{…} 下标，^x / ^{…} 上标；文字里的 < > & 先转义。 */
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function m(src) {
    let s = esc(src);
    const ital = (t) => t.replace(/(^|[^A-Za-zÀ-ɏ])([A-Za-z]|[α-ωϵϑϕ])([̀-ͯ]*)(?![A-Za-z])/g, '$1<i>$2$3</i>'); // 组合附加符（如 R̄ 的上横）随字母一起斜体
    s = s.replace(/([_^])(\{([^{}]*)\}|([^\s{}()=,+\-−×·/]))/g, (_, op, __, grp, one) => {
      const tag = op === '_' ? 'sub' : 'sup';
      return `<${tag}>${grp ?? one}</${tag}>`;
    });
    // 斜体只作用于标签之外的文字
    return s.split(/(<[^>]+>)/).map((part) => (part.startsWith('<') ? part : ital(part))).join('');
  }

  function fmt(x, d = 2) {
    if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '—';
    return x.toFixed(d).replace('-', '−');
  }

  function makeCtx(root) {
    const stage = el('div', { class: 'demo-stage' });
    root.prepend(stage);
    const redraws = new Set();
    let visible = false;
    const loops = new Set();

    const ctx = {
      root, stage, el, rng, mix, fmt, reduced: () => reduced.matches,
      colors: () => colors(root),
      /* 画布字体：canvas 不认 CSS 变量，取阅读器的 --sans / --mono 实际字体串。 */
      font(px, weight = 400, mono = false) {
        const fam = getComputedStyle(root).getPropertyValue(mono ? '--mono' : '--sans').trim() || (mono ? 'monospace' : 'sans-serif');
        return `${weight} ${Math.round(px)}px ${fam}`;
      },
      onRedraw(fn) { redraws.add(fn); return fn; },
      redraw() { redraws.forEach((f) => f()); },
      row(...kids) { const r = el('div', { class: 'demo-row' }, ...kids); return r; },
      button(text, onclick, primary = false) {
        return el('button', { type: 'button', class: 'demo-btn' + (primary ? ' primary' : ''), onclick, text });
      },
      /* 滑块：返回 {node, get value, set value}；format 决定读数显示。 */
      slider({ label, min, max, step, value, format = (x) => String(x), oninput }) {
        const input = el('input', { type: 'range', min, max, step, value, 'aria-label': label });
        const out = el('output', { text: format(+value) });
        input.addEventListener('input', () => { out.textContent = format(+input.value); oninput && oninput(+input.value); });
        const node = el('label', { class: 'demo-range' }, el('span', { text: label }), input, out);
        return {
          node,
          get value() { return +input.value; },
          set value(x) { input.value = x; out.textContent = format(+input.value); },
        };
      },
      /* 分段按钮：options = [[值, 文字], …]。 */
      segmented(options, value, onchange, label = '') {
        const wrap = el('div', { class: 'demo-seg', role: 'group', 'aria-label': label });
        const btns = options.map(([v, t]) => el('button', {
          type: 'button', 'aria-pressed': String(v === value), text: t,
          onclick: () => { set(v); onchange(v); },
        }));
        function set(v) { btns.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v))); }
        wrap.append(...btns);
        return { node: wrap, set };
      },
      checkbox(label, checked, onchange) {
        const input = el('input', { type: 'checkbox' });
        input.checked = checked;
        input.addEventListener('change', () => onchange(input.checked));
        return { node: el('label', { class: 'demo-check' }, input, el('span', { text: label })), input };
      },
      readout() { return el('div', { class: 'demo-read', 'aria-live': 'polite' }); },
      m,
      /* 计算过程面板：set([[说明, 式子], …])。说明是文字，其中 $…$ 段按记号排；式子整段用 m() 的记号写法；
       * 某一项写成 {html: '…'} 时原样插入（已自行转义）。 */
      steps(title = '计算过程') {
        const list = el('ol');
        const head = el('div', { class: 'demo-steps-head', text: title });
        const node = el('div', { class: 'demo-steps' }, head, list);
        const cell = (x, cls) => {
          const span = el('span', { class: cls });
          if (x && typeof x === 'object' && 'html' in x) span.innerHTML = x.html;
          else if (cls === 'demo-m') span.innerHTML = m(x);
          else span.innerHTML = String(x).split('$').map((t, i) => (i % 2 ? `<span class="demo-m">${m(t)}</span>` : esc(t))).join('');
          return span;
        };
        return {
          node,
          set(lines, newTitle) {
            if (newTitle) head.textContent = newTitle;
            list.replaceChildren(...lines.map((ln) => {
              const [desc, expr] = Array.isArray(ln) ? ln : [ln, null];
              return el('li', {}, desc != null && desc !== '' ? cell(desc, 'demo-sd') : null, expr != null ? cell(expr, 'demo-m') : null);
            }));
          },
        };
      },
      legend(items) {
        return el('div', { class: 'demo-legend' }, items.map(([c, t]) => el('span', {}, el('i', { style: `background:${c}` }), t)));
      },
      /* 画布：按容器宽度与 aspect（高/宽）定尺寸，处理高分屏；draw(g, w, h) 在尺寸或主题变化时重画。 */
      canvas({ aspect = 0.5, maxHeight = 420, minHeight = 160, draw, parent = stage, label = '' }) {
        const cv = el('canvas', { role: 'img', 'aria-label': label });
        parent.append(cv);
        const g = cv.getContext('2d');
        const c = { cv, g, w: 0, h: 0, draw };
        const size = () => {
          const w = Math.max(1, cv.parentElement.clientWidth);
          const h = Math.round(Math.max(minHeight, Math.min(maxHeight, w * aspect)));
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          if (c.w === w && c.h === h && cv.width === Math.round(w * dpr)) return;
          c.w = w; c.h = h;
          cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
          cv.style.height = h + 'px';
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        c.paint = () => { size(); g.clearRect(0, 0, c.w, c.h); c.draw && c.draw(g, c.w, c.h); };
        new ResizeObserver(() => c.paint()).observe(parent);
        redraws.add(c.paint);
        return c;
      },
      /* 折线图：series = [{data:[y…] 或 [[x,y]…], color, label, width, dash}]。返回绘图区，供叠加标注。 */
      plot(g, w, h, { series, xmin = 0, xmax, ymin, ymax, xlabel = '', ylabel = '', yticks = 4, xticks = 4, hlines = [], pad = {} }) {
        const C = colors(root);
        const P = { l: pad.l ?? 44, r: pad.r ?? 10, t: pad.t ?? 10, b: pad.b ?? 30 };
        const pts = series.map((s) => s.data.map((d, i) => (Array.isArray(d) ? d : [i + 1, d])));
        const all = pts.flat().filter((p) => Number.isFinite(p[1]));
        if (xmax == null) xmax = Math.max(1, ...pts.map((p) => (p.length ? p[p.length - 1][0] : 1)));
        if (ymin == null) ymin = all.length ? Math.min(...all.map((p) => p[1])) : 0;
        if (ymax == null) ymax = all.length ? Math.max(...all.map((p) => p[1])) : 1;
        if (ymax - ymin < 1e-9) { ymax += 0.5; ymin -= 0.5; }
        const X = (x) => P.l + ((x - xmin) / (xmax - xmin)) * (w - P.l - P.r);
        const Y = (y) => P.t + (1 - (y - ymin) / (ymax - ymin)) * (h - P.t - P.b);
        g.font = '12px ' + getComputedStyle(root).getPropertyValue('--sans');
        g.lineWidth = 1; g.strokeStyle = C.line; g.fillStyle = C.muted;
        g.textAlign = 'right'; g.textBaseline = 'middle';
        const nice = (lo, hi, n) => {
          const raw = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(raw));
          const st = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
          const out = [];
          for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(+v.toFixed(10));
          return out;
        };
        for (const v of nice(ymin, ymax, yticks)) {
          g.beginPath(); g.moveTo(P.l, Y(v)); g.lineTo(w - P.r, Y(v)); g.stroke();
          g.fillText(String(+v.toPrecision(3)).replace('-', '−'), P.l - 6, Y(v));
        }
        g.textAlign = 'center'; g.textBaseline = 'top';
        for (const v of nice(xmin, xmax, xticks)) g.fillText(String(+v.toPrecision(4)), X(v), h - P.b + 6);
        g.strokeStyle = C.rule; g.beginPath(); g.moveTo(P.l, P.t); g.lineTo(P.l, h - P.b); g.lineTo(w - P.r, h - P.b); g.stroke();
        for (const hl of hlines) {
          g.save(); g.setLineDash([4, 4]); g.strokeStyle = hl.color || C.muted;
          g.beginPath(); g.moveTo(P.l, Y(hl.y)); g.lineTo(w - P.r, Y(hl.y)); g.stroke(); g.restore();
          if (hl.label) { g.fillStyle = hl.color || C.muted; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(hl.label, w - P.r, Y(hl.y) - 2); }
        }
        g.save(); g.beginPath(); g.rect(P.l, P.t - 2, w - P.l - P.r, h - P.t - P.b + 4); g.clip();
        series.forEach((s, k) => {
          const p = pts[k];
          if (!p.length) return;
          g.strokeStyle = s.color; g.lineWidth = s.width || 1.8; g.lineJoin = 'round';
          if (s.dash) g.setLineDash(s.dash); else g.setLineDash([]);
          g.beginPath();
          let pen = false;
          for (const [x, y] of p) {
            if (!Number.isFinite(y)) { pen = false; continue; }
            if (pen) g.lineTo(X(x), Y(y)); else { g.moveTo(X(x), Y(y)); pen = true; }
          }
          g.stroke();
        });
        g.restore(); g.setLineDash([]);
        g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'bottom';
        if (xlabel) g.fillText(xlabel, P.l + (w - P.l - P.r) / 2, h);
        if (ylabel) { g.save(); g.translate(11, P.t + (h - P.t - P.b) / 2); g.rotate(-Math.PI / 2); g.textBaseline = 'middle'; g.fillText(ylabel, 0, 0); g.restore(); }
        return { X, Y, P, xmin, xmax, ymin, ymax };
      },
      /* 动画循环：step(dt) 返回 false 时自动停。只在演示可见、页面在前台时跑。 */
      loop(step) {
        let id = 0, last = 0;
        const L = {
          running: false,
          start() { if (L.running) return; L.running = true; loops.add(L); last = 0; if (visible) id = requestAnimationFrame(tick); },
          stop() { L.running = false; cancelAnimationFrame(id); loops.delete(L); L.onstop && L.onstop(); },
          resume() { if (L.running && visible) { cancelAnimationFrame(id); last = 0; id = requestAnimationFrame(tick); } },
          pause() { cancelAnimationFrame(id); },
        };
        function tick(t) {
          const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 60;
          last = t;
          if (step(dt) === false) { L.stop(); return; }
          if (L.running && visible && !document.hidden) id = requestAnimationFrame(tick);
        }
        return L;
      },
      _visible(v) { visible = v; loops.forEach((L) => (v ? L.resume() : L.pause())); },
    };
    return ctx;
  }

  const started = new WeakMap();
  function start(root) {
    if (started.has(root)) return;
    const name = root.dataset.widget, init = registry.get(name);
    if (!init) return;
    const ctx = makeCtx(root);
    started.set(root, ctx);
    try { init(ctx); } catch (e) { console.error('demo ' + name, e); ctx.stage.remove(); return; }
    ctx._visible(true);
    ctx.redraw();
  }

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) start(e.target);
      const ctx = started.get(e.target);
      if (ctx) { ctx._inView = e.isIntersecting; ctx._visible(e.isIntersecting); }
    }
  }, { rootMargin: '300px 0px' }) : null;

  function scan() {
    document.querySelectorAll('.demo[data-widget]').forEach((root) => (io ? io.observe(root) : start(root)));
  }
  const themeChanged = () => document.querySelectorAll('.demo[data-widget]').forEach((r) => { const c = started.get(r); c && c.redraw(); });
  new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) document.querySelectorAll('.demo[data-widget]').forEach((r) => { const c = started.get(r); c && c._visible(c._inView !== false); });
  });

  window.RLDemo = {
    register(name, init) {
      registry.set(name, init);
      document.querySelectorAll(`.demo[data-widget="${name}"]`).forEach((r) => (io ? io.observe(r) : start(r)));
    },
    rng, mix, fmt, m,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  // 分块载入的页面（全书阅读稿）插入新章节后发 rl:content，新章里的演示照常在滚进视口时初始化。
  document.addEventListener('rl:content', scan);
})();
