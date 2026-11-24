/* 第 21 章：时长不同的周期怎样平均。
 * 对应 21.2 节“随机执行时长与差分 TD 目标”末段：恒向左的参考策略 μ 下两类周期 (G, τ) = (4, 3) 与 (1, 5) 等可能，
 *   E[G]/E[τ] = 5/8 是奖励率，E[G/τ] = (4/3 + 1/5)/2 = 23/30 让短周期占了过多权重；
 *   短周期占圈数的 1/2，只占原始步的 3/(3 + 5) = 3/8。
 * 按灯号选的 μ′（21.6 节）每圈都是 (4, 3)，两种平均同为 4/3，比 μ 每步多 4/3 − 5/8 = 17/24。
 * 前两圈按 21.1 节的记录取亮左、亮右，之后由种子抽取。 */
(() => {
  const SHORT = { G: 4, tau: 3 }, LONG = { G: 1, tau: 5 };
  /* 一圈：灯亮右的概率 1/2；μ 恒向左，亮右时绕行；μ′ 按灯号，总是直达。 */
  function cycle(right, policy) { const c = policy === 'left' && right ? LONG : SHORT; return { right, G: c.G, tau: c.tau, short: c === SHORT }; }
  function stats(cs) {
    let G = 0, T = 0, m = 0, nS = 0;
    for (const c of cs) { G += c.G; T += c.tau; m += c.G / c.tau; if (c.short) nS += 1; }
    const n = cs.length;
    return { n, G, T, nS, rate: n ? G / T : NaN, mean: n ? m / n : NaN, countShare: n ? nS / n : NaN, timeShare: n ? (nS * SHORT.tau) / T : NaN };
  }
  function expected(policy) {
    if (policy === 'mem') return { rate: 4 / 3, mean: 4 / 3, countShare: 1, timeShare: 1 };
    return {
      rate: (SHORT.G + LONG.G) / (SHORT.tau + LONG.tau),
      mean: (SHORT.G / SHORT.tau + LONG.G / LONG.tau) / 2,
      countShare: 1 / 2,
      timeShare: SHORT.tau / (SHORT.tau + LONG.tau),
    };
  }
  const model = { SHORT, LONG, cycle, stats, expected };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 4) => {
    if (!Number.isFinite(x)) return '—';
    let s = x.toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace(/^(-?)0\./, '$1.').replace('-', '−');
  };
  const MAXN = 5000, WIN = 48;

  RLDemo.register('ch21-rate', (ctx) => {
    const { el } = ctx;
    let policy = 'left', seed = 8, R = ctx.rng(seed), cs = [], path = [];
    const draw = () => {
      if (cs.length >= MAXN) return;
      const k = cs.length, right = k < 2 ? k === 1 : R() < 0.5;
      cs.push(model.cycle(right, policy));
      const s = model.stats(cs);
      path.push([s.n, s.rate, s.mean]);
    };
    const reset = () => { R = ctx.rng(seed); cs = []; path = []; update(); };
    const pSeg = ctx.segmented([['left', '恒向左 μ'], ['mem', '按灯号 μ′']], policy, (v) => { policy = v; reset(); }, '上层策略');
    const b1 = ctx.button('抽一圈', () => { draw(); update(); }, true);
    const b100 = ctx.button('抽 100 圈', () => { for (let i = 0; i < 100; i++) draw(); update(); });
    const b0 = ctx.button('重来', reset);
    const bS = ctx.button('换种子', () => { seed += 1; reset(); });
    const read = ctx.readout();
    const box = ctx.steps();
    /* 阅读稿正文对 li 两端对齐，计算过程里改为左对齐。 */
    const setBox = (lines, title) => { box.set(lines, title); box.node.querySelectorAll('li').forEach((li) => { li.style.textAlign = 'left'; }); };
    const top = el('div', { class: 'demo-grid2' }), tPane = el('div'), cPane = el('div');
    top.append(tPane, cPane);
    ctx.stage.append(ctx.row(pSeg.node), ctx.row(b1, b100, b0, bS), top, read, box.node);

    /* 左图：最近若干圈沿原始时间排开，每圈宽 τ、高 G/τ，面积就是 G。 */
    ctx.canvas({
      parent: tPane, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '最近各圈沿原始时间排开：宽是步数 τ，高是每步所得 G/τ，两条横线是两种平均',
      draw(g, W, H) {
        const C = ctx.colors(), s = model.stats(cs);
        const T1 = Math.max(WIN, s.T), T0 = T1 - WIN;
        const P = ctx.plot(g, W, H, { series: [], xmin: T0, xmax: T1, ymin: 0, ymax: 1.6, xlabel: '原始步', ylabel: '每步所得 G/τ', xticks: 4, yticks: 4, pad: { l: 42, r: 12, b: 36 } });
        g.save(); g.beginPath(); g.rect(P.P.l, 0, W - P.P.l - P.P.r, H); g.clip();
        let t = s.T;
        for (let i = cs.length - 1; i >= 0 && t > T0; i--) {
          const c = cs[i], a = t - c.tau, x0 = P.X(a) + 0.75, x1 = P.X(t) - 0.75, y = P.Y(c.G / c.tau);
          g.fillStyle = c.short ? C.series[0] : C.series[1];
          g.globalAlpha = i === cs.length - 1 ? 0.95 : 0.6;
          g.fillRect(x0, y, x1 - x0, P.Y(0) - y);
          t = a;
        }
        g.globalAlpha = 1; g.restore();
        if (s.n) {
          g.lineWidth = 2; g.strokeStyle = C.accent; g.setLineDash([]);
          g.beginPath(); g.moveTo(P.P.l, P.Y(s.rate)); g.lineTo(W - P.P.r, P.Y(s.rate)); g.stroke();
          g.strokeStyle = C.ink; g.setLineDash([5, 4]); g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(P.P.l, P.Y(s.mean)); g.lineTo(W - P.P.r, P.Y(s.mean)); g.stroke();
          g.setLineDash([]);
        }
      },
    });
    /* 右图：两种平均随圈数的变化，虚线是各自的期望值。 */
    ctx.canvas({
      parent: cPane, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '两种平均随圈数的变化',
      draw(g, W, H) {
        const C = ctx.colors(), e = model.expected(policy), n = Math.max(20, cs.length);
        const hl = policy === 'mem' ? [{ y: e.rate, color: C.muted, label: '4/3' }] : [{ y: e.rate, color: C.accent, label: '5/8' }, { y: e.mean, color: C.muted, label: '23/30' }];
        ctx.plot(g, W, H, { series: [{ data: path.map((p) => [p[0], p[2]]), color: C.ink, width: 1.6, dash: [5, 4] }, { data: path.map((p) => [p[0], p[1]]), color: C.accent, width: 2 }], xmin: 0, xmax: n, ymin: 0, ymax: 1.6, xlabel: '圈数', ylabel: '平均', xticks: 4, yticks: 4, hlines: hl, pad: { l: 42, r: 12, b: 36 } });
      },
    });
    tPane.append(ctx.legend([['var(--d1)', '直达一圈 (4, 3)'], ['var(--d2)', '绕行一圈 (1, 5)']]));
    cPane.append(ctx.legend([['var(--accent)', '按时间平均 ΣG/Στ'], ['var(--ink)', '按圈平均 G/τ（虚线）']]));

    function update() {
      const s = model.stats(cs), e = model.expected(policy), lines = [];
      read.innerHTML = s.n
        ? ctx.m(`${s.n} 圈，${s.T} 个原始步　ΣG/Στ = ${num(s.rate)}，每圈 G/τ 的平均 = ${num(s.mean)}`) + (s.n >= MAXN ? '　已到演示上限，按“重来”。' : '')
        : ctx.m('按“抽一圈”：第 1、2 圈取 21.1 节记录里的亮左、亮右');
      if (policy === 'left') lines.push(['恒向左：亮左直达，一圈 3 步得 4；亮右绕行，一圈 5 步得 1；两种灯等可能，$E[G]/E[τ] = (4 + 1)/(3 + 5) = 5/8$，$E[G/τ] = (4/3 + 1/5)/2 = 23/30$', null]);
      else lines.push(['按灯号：两种灯下都直达，一圈 3 步得 4，$E[G]/E[τ] = E[G/τ] = 4/3$', null]);
      if (s.n) {
        const c = cs[cs.length - 1];
        lines.push([`第 ${s.n} 圈：灯亮${c.right ? '右' : '左'}，${c.short ? '直达' : '绕行'}`, `(G, τ) = (${c.G}, ${c.tau})，G/τ = ${c.short ? '4/3' : '1/5'}`]);
        lines.push(['累计', `ΣG = ${s.G}，Στ = ${s.T}，n = ${s.n}`]);
        lines.push(['按时间平均：总所得除以总原始步数', `ΣG/Στ = ${s.G}/${s.T} = ${num(s.rate)}`]);
        lines.push(['按圈平均：每圈的 $G/τ$ 等权', `(1/n) Σ G/τ = ${num(s.mean)}`]);
        if (policy === 'left') {
          lines.push(['直达圈占圈数与占原始步的份额；按时间平均时每圈的权重是 $τ/Στ$', `${s.nS}/${s.n} = ${num(s.countShare, 3)}，3 × ${s.nS}/${s.T} = ${num(s.timeShare, 3)}`]);
          lines.push(['两个份额的期望', `${num(e.countShare, 3)} 与 3/8 = ${num(e.timeShare, 3)}`]);
        } else {
          lines.push(['各圈时长相同，两种平均重合；与恒向左相比每个原始步多得', '4/3 − 5/8 = 17/24']);
        }
      }
      setBox(lines, s.n ? `计算过程　第 ${s.n} 圈` : '计算过程　出发前');
      ctx.redraw();
    }
    update();
  });
})();
