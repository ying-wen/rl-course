/* 第 11 章：GAE 的 λ 在偏差与方差之间移动。对应 11.3 节“多步优势与广义优势估计”的两步树算例：
 * p = .5，q = .25，γ = .9，评论者给对起点 V(s0) = 1.175，s1 的估值 V(s1) 可以有误差（真值 1.5）。
 * 单条轨迹对 θ0 的估计 g0·Â0，Â0 = δ0 + γλδ1，逐条路径精确计算均值、方差与均方误差。 */
(() => {
  const GAMMA = 0.9, P = 0.5, Q = 0.25, V0 = 1.175, TRUE = 0.0875;
  /* 三条路径：停止、继续取 1、继续取 3。 */
  function paths(V1, lam) {
    const out = [{ name: '停止', prob: 1 - P, g0: -P, d0: 1 - V0, d1: null }];
    for (const [name, prob, R2] of [['继续、取 1', P * (1 - Q), 1], ['继续、取 3', P * Q, 3]]) {
      out.push({ name, prob, g0: 1 - P, d0: GAMMA * V1 - V0, d1: R2 - V1 });
    }
    out.forEach((o) => { o.A = o.d0 + (o.d1 == null ? 0 : GAMMA * lam * o.d1); o.x = o.g0 * o.A; });
    return out;
  }
  const model = {
    GAMMA, TRUE, V0, paths,
    stats(V1, lam, N = 1) {
      const ps = paths(V1, lam), m = ps.reduce((s, o) => s + o.prob * o.x, 0);
      const v = ps.reduce((s, o) => s + o.prob * (o.x - m) ** 2, 0) / N, b2 = (m - TRUE) ** 2;
      return { mean: m, bias2: b2, var: v, mse: b2 + v, paths: ps };
    },
    best(V1, N = 1) {
      let bl = 0, bm = Infinity;
      for (let i = 0; i <= 1000; i++) { const l = i / 1000, s = model.stats(V1, l, N).mse; if (s < bm) { bm = s; bl = l; } }
      return { lam: bl, mse: bm };
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('gae-lambda', (ctx) => {
    const { el, fmt } = ctx;
    let V1 = 1, lam = 0.5, N = 1;
    const f3 = (x) => fmt(x, 3), f4 = (x) => fmt(x, 4);
    const vSeg = ctx.segmented([[1.5, '1.5（准确）'], [1, '1'], [0.5, '.5'], [0, '0']], V1, (v) => { V1 = v; ctx.redraw(); show(); }, '评论者给 s₁ 的估值');
    const lS = ctx.slider({ label: 'λ', min: 0, max: 1, step: 0.01, value: lam, format: (x) => fmt(x, 2), oninput: (x) => { lam = x; ctx.redraw(); show(); } });
    const nS = ctx.slider({ label: '平均的独立轨迹数 N', min: 1, max: 16, step: 1, value: N, oninput: (x) => { N = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(el('span', { class: 'demo-note', text: 'V(s₁)：' }), vSeg.node), ctx.row(lS.node, nS.node), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);

    const grid = (f) => { const d = []; for (let i = 0; i <= 100; i++) d.push([i / 100, f(i / 100)]); return d; };
    const mark = (G, P, x, y, col, r = 4.5) => { G.fillStyle = col; G.beginPath(); G.arc(P.X(x), P.Y(y), r, 0, 7); G.fill(); };
    const vmark = (G, P, h, C) => { G.save(); G.strokeStyle = C.muted; G.setLineDash([2, 3]); G.beginPath(); G.moveTo(P.X(lam), P.P.t); G.lineTo(P.X(lam), h - P.P.b); G.stroke(); G.restore(); };
    ctx.canvas({
      parent: left, aspect: 0.8, maxHeight: 290, minHeight: 210, label: '起点梯度分量的期望随 λ 的变化',
      draw(G, w, h) {
        const C = ctx.colors();
        const P = ctx.plot(G, w, h, {
          series: [{ data: grid((l) => model.stats(V1, l).mean), color: C.series[0], width: 2.2 }],
          xmin: 0, xmax: 1, ymin: -0.3, ymax: 0.15, xlabel: 'λ', ylabel: 'E[g₀Â₀]', pad: { l: 44 },
          hlines: [{ y: TRUE, color: C.series[2], label: '真实导数 .0875' }, { y: 0, color: C.rule }],
        });
        vmark(G, P, h, C); mark(G, P, lam, model.stats(V1, lam).mean, C.ink);
      },
    });
    ctx.canvas({
      parent: right, aspect: 0.8, maxHeight: 290, minHeight: 210, label: '偏差平方、方差与均方误差随 λ 的变化',
      draw(G, w, h) {
        const C = ctx.colors(), b = model.best(V1, N);
        const ymax = Math.max(0.03, 1.15 * Math.max(model.stats(V1, 0, N).mse, model.stats(V1, 1, N).mse));
        const P = ctx.plot(G, w, h, {
          series: [
            { data: grid((l) => model.stats(V1, l, N).bias2), color: C.series[2], width: 1.8 },
            { data: grid((l) => model.stats(V1, l, N).var), color: C.series[1], width: 1.8 },
            { data: grid((l) => model.stats(V1, l, N).mse), color: C.ink, width: 2.4 },
          ],
          xmin: 0, xmax: 1, ymin: 0, ymax, xlabel: 'λ', ylabel: '误差', pad: { l: 44 },
        });
        vmark(G, P, h, C);
        G.save(); G.strokeStyle = C.ink; G.lineWidth = 1.5; G.beginPath(); G.arc(P.X(b.lam), P.Y(b.mse), 6, 0, 7); G.stroke(); G.restore();
        mark(G, P, lam, model.stats(V1, lam, N).mse, C.ink);
      },
    });
    right.append(ctx.legend([['var(--d3)', '偏差平方'], ['var(--d2)', '方差 / N'], ['var(--ink)', '均方误差（空心圈为最小处）']]));

    function show() {
      const s = model.stats(V1, lam, N), b = model.best(V1, N);
      read.innerHTML = `V(s₁) = ${fmt(V1, 1)}（误差 ${fmt(V1 - 1.5, 1)}），λ = ${fmt(lam, 2)}，N = ${N}：E[g₀Â₀] = <b>${f4(s.mean)}</b>，偏差平方 <b>${f4(s.bias2)}</b>，方差 <b>${f4(s.var)}</b>，均方误差 <b>${f4(s.mse)}</b>` +
        `<br>均方误差最小处 λ ≈ <b>${fmt(b.lam, 2)}</b>，约 <b>${f3(b.mse)}</b>`;
      const lines = [['冻结评论者：$V(s_0) = 1.175$，' + `$V(s_1) = ${fmt(V1, 1)}$；两项 TD 误差`, 'δ_0 = R_1 + γV(S_1) − V(s_0),　δ_1 = R_2 − V(s_1)']];
      lines.push(['GAE 在两步轨迹上的形式', 'Â_0 = δ_0 + γλδ_1']);
      s.paths.forEach((o) => {
        const A = o.d1 == null ? `Â_0 = 1 − 1.175 = ${f3(o.A)}` : `Â_0 = ${f3(o.d0)} + .9·${fmt(lam, 2)}·${f3(o.d1)} = ${f3(o.A)}`;
        lines.push([`${o.name}（概率 ${fmt(o.prob, 3).replace(/^0/, '')}），$g_0 = ${fmt(o.g0, 1)}$`, `${A},　g_0Â_0 = ${f4(o.x)}`]);
      });
      lines.push(['按路径概率平均', { html: ctx.m(`E[g_0Â_0] = `) + `<b>${f4(s.mean)}</b>` + ctx.m(`,　真实导数 ${TRUE}`) }]);
      lines.push(['均方误差 = 偏差平方 + 方差 / N', { html: ctx.m(`(${f4(s.mean)} − .0875)^2 + ${f4(s.var * N)}/${N} = `) + `<b>${f4(s.mse)}</b>` }]);
      stepsBox.set(lines, `计算过程　λ = ${fmt(lam, 2)} 的起点优势`);
    }
    show();
  });
})();
