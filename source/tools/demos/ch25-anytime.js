/* 第 25 章：边试边看时三种区间的错误率，一次试走序列与批量运行。
 * 对应 25.2 节“每试一次就看一次”：新路线得分取 0 或 1，μ = .6 时新版 .2 + .5μ 恰与备选 .5 持平；
 * p_f = .05，每次试走后检查一次。正文 20000 次运行、每次 1000 次试走：漏掉过 μ 的比例
 * 正态 .514、固定样本 Hoeffding .091、随时有效 .0001；均值 .9 时定序所需次数 4、21、68。 */
(() => {
  const PF = 0.05, M = 1000;
  const KINDS = [
    { id: 'n', label: '正态，每次 5%' },
    { id: 'h', label: '固定样本 Hoeffding' },
    { id: 'a', label: '随时有效 h_m' },
  ];
  /* 半宽。正态区间用真实方差 μ(1−μ)：μ = .6 时即正文的 1.96√(.24/m)。 */
  function half(j, m, mu) {
    if (j === 0) return 1.96 * Math.sqrt(mu * (1 - mu) / m);
    if (j === 1) return Math.sqrt(Math.log(2 / PF) / (2 * m));
    return Math.sqrt(Math.log(2 * m * (m + 1) / PF) / (2 * m));
  }
  const interval = (j, m, ybar, mu) => { const h = half(j, m, mu); return [Math.max(0, ybar - h), Math.min(1, ybar + h), h]; };
  /* 均值为 mean 时，新版下界 .2 + .5(mean − h) 超过 .5 所需的最少次数。 */
  function orderNeeded(j, mean = 0.9) { let m = 1; while (!(mean - half(j, m, mean) > 0.6)) m++; return m; }

  function rng(seed = 1) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 批量：missAt[j][m] 记第一次漏掉 μ 发生在第 m 次的运行数，wrong[j] 记一度误判“新版更好”的运行数。 */
  function batch(seed, runs, mu) {
    const H = KINDS.map((_, j) => Float64Array.from({ length: M + 1 }, (_, m) => (m ? half(j, m, mu) : NaN)));
    return { seed, runs, mu, H, done: 0, missAt: KINDS.map(() => new Float64Array(M + 1)), wrong: [0, 0, 0] };
  }
  function advance(B, n = 100) {
    const H = B.H;
    for (let c = 0; c < n && B.done < B.runs; c++, B.done++) {
      const r = rng((B.seed * 1000003 + B.done + 1) >>> 0);
      let S = 0;
      const miss = [0, 0, 0], wr = [0, 0, 0];
      for (let m = 1; m <= M; m++) {
        S += r() < B.mu ? 1 : 0;
        const y = S / m;
        for (let j = 0; j < 3; j++) {
          const h = H[j][m];
          if (!miss[j] && Math.abs(y - B.mu) > h) { miss[j] = 1; B.missAt[j][m] += 1; }
          if (!wr[j] && y - h > 0.6) { wr[j] = 1; B.wrong[j] += 1; }
        }
      }
    }
    return B.done < B.runs;
  }
  /* 到第 m 次为止漏掉过 μ 的运行比例。 */
  function missCurve(B, j) {
    const out = new Float64Array(M + 1);
    let c = 0;
    for (let m = 1; m <= M; m++) { c += B.missAt[j][m]; out[m] = c / Math.max(1, B.done); }
    return out;
  }

  const model = { PF, M, KINDS, half, interval, orderNeeded, rng, batch, advance, missCurve };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 3) => (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d).replace(/^(-?)0\./, '$1.').replace('-', '−');

  RLDemo.register('ch25-anytime', (ctx) => {
    const { el } = ctx;
    let mu = 0.6, seed = 1, runs = 20000, B, r, S = 0, m = 0, path = [];

    const muSeg = ctx.segmented([[0.6, 'μ = .6，与备选持平'], [0.9, 'μ = .9']], mu, (v) => { mu = v; restartAll(); }, '新路线的真实均值');
    const runSeg = ctx.segmented([[2000, '2000 次运行'], [20000, '20000 次运行']], runs, (v) => { runs = v; restartBatch(); }, '批量运行次数');
    const oneBtn = ctx.button('试走一次', () => { walk.stop(); trial(1); }, true);
    const tenBtn = ctx.button('连续试走', () => (walk.running ? walk.stop() : walk.start()));
    const resetBtn = ctx.button('重来', () => { seed += 1; restartRun(); });
    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const pa = el('div'), pb = el('div');
    ctx.stage.append(ctx.row(muSeg.node, runSeg.node), ctx.row(oneBtn, tenBtn, resetBtn),
      el('div', { class: 'demo-grid2' }, pa, pb),
      ctx.legend(KINDS.map((k, j) => [`var(--d${[3, 2, 4][j]})`, k.label])), read, stepsBox.node);
    const COL = (C) => [C.series[2], C.series[1], C.series[3]];

    /* 横轴为对数刻度的简单坐标系（demo-core 的 plot 只有线性轴）。 */
    function logAxes(g, w, h, ymin, ymax, ylabel, yt) {
      const C = ctx.colors(), P = { l: 40, r: 18, t: 10, b: 30 };
      const X = (x) => P.l + (Math.log10(x) / 3) * (w - P.l - P.r);
      const Y = (y) => P.t + (1 - (y - ymin) / (ymax - ymin)) * (h - P.t - P.b);
      g.font = ctx.font(12); g.lineWidth = 1; g.fillStyle = C.muted;
      g.textAlign = 'right'; g.textBaseline = 'middle';
      for (const v of yt) { g.strokeStyle = C.line; g.beginPath(); g.moveTo(P.l, Y(v)); g.lineTo(w - P.r, Y(v)); g.stroke(); g.fillText(String(v).replace(/^0\./, '.'), P.l - 6, Y(v)); }
      g.textAlign = 'center'; g.textBaseline = 'top';
      for (const v of [1, 10, 100, 1000]) g.fillText(String(v), X(v), h - P.b + 6);
      g.strokeStyle = C.rule; g.beginPath(); g.moveTo(P.l, P.t); g.lineTo(P.l, h - P.b); g.lineTo(w - P.r, h - P.b); g.stroke();
      g.textBaseline = 'bottom'; g.fillText('试走次数 m（对数刻度）', P.l + (w - P.l - P.r) / 2, h);
      g.save(); g.translate(11, P.t + (h - P.t - P.b) / 2); g.rotate(-Math.PI / 2); g.textBaseline = 'middle'; g.fillText(ylabel, 0, 0); g.restore();
      const line = (pts, color, width = 1.6, dash) => {
        g.save(); g.beginPath(); g.rect(P.l, P.t - 2, w - P.l - P.r, h - P.t - P.b + 4); g.clip();
        g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash || []); g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); g.restore();
      };
      const hline = (y, color, label) => {
        g.save(); g.setLineDash([4, 4]); g.strokeStyle = color; g.beginPath(); g.moveTo(P.l, Y(y)); g.lineTo(w - P.r, Y(y)); g.stroke(); g.restore();
        if (label) { g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(label, P.l + 4, Y(y) - 2); }
      };
      return { X, Y, P, line, hline };
    }

    ctx.canvas({
      parent: pa, aspect: 0.74, maxHeight: 290, minHeight: 220, label: '一次试走序列：样本均值与三种区间的上下界随试走次数的变化',
      draw(g, w, h) {
        const C = ctx.colors(), A = logAxes(g, w, h, 0, 1, '新路线均值 μ 的区间', [0, 0.25, 0.5, 0.75, 1]);
        A.hline(mu, C.ink, `真实 μ = ${num(mu, 1)}`);
        if (mu !== 0.6) A.hline(0.6, C.muted, '.6：新版与备选持平');
        if (!path.length) return;
        COL(C).forEach((c, j) => {
          A.line(path.map(([k, y]) => [k, interval(j, k, y, mu)[0]]), c, 1.4);
          A.line(path.map(([k, y]) => [k, interval(j, k, y, mu)[1]]), c, 1.4);
        });
        A.line(path, C.soft, 1.2, [2, 3]);
        g.fillStyle = C.ink; g.beginPath(); g.arc(A.X(m), A.Y(S / m), 3.5, 0, 2 * Math.PI); g.fill();
      },
    });
    ctx.canvas({
      parent: pb, aspect: 0.74, maxHeight: 290, minHeight: 220, label: '批量运行中到第 m 次为止至少漏掉过一次真值的运行比例',
      draw(g, w, h) {
        const C = ctx.colors(), A = logAxes(g, w, h, 0, 0.6, '漏掉过 μ 的运行比例', [0, 0.2, 0.4, 0.6]);
        A.hline(PF, C.muted, 'p_f = .05');
        if (!B.done) return;
        COL(C).forEach((c, j) => { const cv = missCurve(B, j), pts = []; for (let k = 1; k <= M; k += k < 50 ? 1 : 5) pts.push([k, cv[k]]); pts.push([M, cv[M]]); A.line(pts, c, 2); });
      },
    });

    function trial(n) {
      for (let i = 0; i < n && m < M; i++) { S += r() < mu ? 1 : 0; m += 1; path.push([m, S / m]); }
      ctx.redraw(); show();
      return m < M;
    }
    const walk = ctx.loop(() => trial(ctx.reduced() ? 1 : Math.max(1, Math.floor(m / 40))));
    const _ws = walk.start;
    walk.start = () => { tenBtn.textContent = '暂停'; _ws(); };
    walk.onstop = () => { tenBtn.textContent = m < M ? '连续试走' : '已到 1000 次'; };
    const job = ctx.loop(() => {
      const t0 = performance.now();
      let more = true;
      while (more && performance.now() - t0 < 6) more = advance(B, 10);
      ctx.redraw(); show();
      return more;
    });

    function restartRun() { walk.stop(); r = rng(seed * 7919); S = 0; m = 0; path = []; if (B) { ctx.redraw(); show(); } }
    function restartBatch() { job.stop(); B = batch(1, runs, mu); ctx.redraw(); show(); job.start(); }
    function restartAll() { restartRun(); restartBatch(); }

    function show() {
      let txt = `批量：已完成 <b>${B.done}</b> / ${B.runs} 次运行。`;
      if (B.done) {
        const last = KINDS.map((k, j) => `${k.label.split('，')[0]} <b>${num(missCurve(B, j)[M], 4)}</b>`).join('　');
        txt += `1000 次内漏掉过 μ：${last}`;
        if (mu === 0.6) txt += `<br>一度误判“新版更好”：${KINDS.map((k, j) => `${k.label.split('，')[0]} <b>${num(B.wrong[j] / B.done, 4)}</b>`).join('　')}`;
      }
      read.innerHTML = txt;
      if (!m) {
        stepsBox.set([
          ['点“试走一次”开始一条试走序列。均值为 .9 时，新版下界 .2 + .5(.9 − h) 超过 .5 要求 h < .3', null],
          ['三种半宽各需的次数', { html: KINDS.map((k, j) => `${k.label}：<b>${orderNeeded(j)}</b>`).join('，') }],
        ], '计算过程　定序所需次数');
        return;
      }
      const y = S / m, I = KINDS.map((_, j) => interval(j, m, y, mu));
      const verdict = (lo, hi) => (0.2 + 0.5 * lo > 0.5 ? '新版更好' : 0.2 + 0.5 * hi < 0.5 ? '备选更好' : '未定');
      stepsBox.set([
        [`第 ${m} 次试走后`, { html: ctx.m(`Ȳ_m = Σ/m = ${S}/${m} = ${num(y)}`) }],
        ['正态区间（真实方差）', { html: ctx.m(`1.96√(${num(mu * (1 - mu), 2)}/${m}) = ${num(I[0][2])}`) }],
        ['固定样本 Hoeffding', { html: ctx.m(`√(log(2/.05)/(2·${m})) = ${num(I[1][2])}`) }],
        ['随时有效', { html: ctx.m(`h_m = √(log(2·${m}·${m + 1}/.05)/(2·${m})) = `) + `<b>${num(I[2][2])}</b>` }],
        ...KINDS.map((k, j) => [`${k.label}：新版区间 .2 + .5 × [下界, 上界]`, { html: ctx.m(`[${num(0.2 + 0.5 * I[j][0])}, ${num(0.2 + 0.5 * I[j][1])}] 对 .5：`) + `<b>${verdict(I[j][0], I[j][1])}</b>` }]),
      ], `计算过程　第 ${m} 次试走`);
    }
    restartRun(); restartBatch(); /* 先建批量对象再显示读数 */
  });
})();
