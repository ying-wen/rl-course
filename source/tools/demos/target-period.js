/* 第 10 章：复制间隔 C 改变外层迭代的速度，不改变方向。对应 10.2 节“目标网络改变自举的时间”与 10.3 节两状态例：
 * x(s0) = 1，x(s1) = 2，γ = .9，行为以 p 访问 s0。固定副本 w̄ 时 ∂L/∂w = a w − b w̄，a = 4 − 3p，b = 1.8(2 − p)；
 * p = .95 时 a = 1.15、b = 1.89。内层步长 α = .1 做 C 步再复制：每次复制乘 f(C) = r + (1 − αa)^C (1 − r)，r = b/a。
 * C = 1 得 1.074（第 9 章的平均倍率），C → ∞ 得 r = 1.6435（每轮精确拟合）；f(C) > 1 当且仅当 p > 1/3。 */
(() => {
  const ALPHA = 0.1;
  const coef = (p) => ({ a: 4 - 3 * p, b: 1.8 * (2 - p) });
  const model = {
    ALPHA, coef,
    ratio(p) { const { a, b } = coef(p); return b / a; },
    perCopy(p, C, alpha = ALPHA) { const { a } = coef(p), r = model.ratio(p); return r + (1 - alpha * a) ** C * (1 - r); },
    perUpdate(p, C, alpha = ALPHA) { return model.perCopy(p, C, alpha) ** (1 / C); },
    /* 逐步模拟：返回每次更新后的在线 w 与副本 w̄。 */
    run(p, C, T, alpha = ALPHA) {
      const { a, b } = coef(p); let w = 1, wb = 1; const ws = [[0, 1]], wbs = [[0, 1]];
      for (let t = 1; t <= T; t++) {
        w -= alpha * (a * w - b * wb);
        if (t % C === 0) wb = w;
        ws.push([t, w]); wbs.push([t, wb]);
      }
      return { ws, wbs };
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('target-period', (ctx) => {
    const { el, fmt } = ctx;
    let p = 0.95, C = 10;
    const T = 120, f3 = (x) => fmt(x, 3), f4 = (x) => fmt(x, 4);
    const pS = ctx.slider({ label: '行为访问 s₀ 的比例 p', min: 0, max: 1, step: 0.05, value: p, format: (x) => fmt(x, 2), oninput: (x) => { p = x; ctx.redraw(); show(); } });
    const cS = ctx.slider({ label: '复制间隔 C', min: 1, max: 60, step: 1, value: C, oninput: (x) => { C = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(pS.node, cS.node), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);

    const lg = (d) => d.map(([t, v]) => [t, Math.log10(Math.max(1e-6, Math.abs(v)))]);
    ctx.canvas({
      parent: left, aspect: 0.8, maxHeight: 290, minHeight: 210, label: '参数随更新次数的变化，对数纵轴',
      draw(G, w, h) {
        const C0 = ctx.colors(), r = model.run(p, C, T), r1 = model.run(p, 1, T);
        const all = [...lg(r.ws), ...lg(r1.ws)].map((d) => d[1]), lo = Math.min(-1, ...all), hi = Math.max(1, ...all);
        ctx.plot(G, w, h, {
          series: [{ data: lg(r1.ws), color: C0.muted, width: 1.4, dash: [4, 4] }, { data: lg(r.ws), color: C0.series[0], width: 1.4 }, { data: lg(r.wbs), color: C0.series[2], width: 2.2 }],
          xmin: 0, xmax: T, ymin: lo, ymax: hi, xlabel: '内层更新次数', ylabel: 'log₁₀ |w|', pad: { l: 40 }, hlines: [{ y: 0, color: C0.rule }],
        });
      },
    });
    left.append(ctx.legend([['var(--d3)', '目标副本 w̄（每 C 步复制）'], ['var(--d1)', '在线 w'], ['var(--muted)', 'C = 1']]));

    ctx.canvas({
      parent: right, aspect: 0.8, maxHeight: 290, minHeight: 210, label: '每次内层更新的平均倍率随复制间隔的变化',
      draw(G, w, h) {
        const C0 = ctx.colors(), d = [];
        for (let c = 1; c <= 60; c++) d.push([c, model.perUpdate(p, c)]);
        const ys = d.map((x) => x[1]), lo = Math.min(0.97, ...ys), hi = Math.max(1.03, ...ys), m = 0.08 * (hi - lo);
        const P = ctx.plot(G, w, h, { series: [{ data: d, color: C0.series[2], width: 2.2 }], xmin: 1, xmax: 60, ymin: lo - m, ymax: hi + m, xlabel: '复制间隔 C', ylabel: '每步平均倍率', pad: { l: 48 }, hlines: [{ y: 1, color: C0.ink, label: '1' }] });
        G.fillStyle = C0.ink; G.beginPath(); G.arc(P.X(C), P.Y(model.perUpdate(p, C)), 5, 0, 7); G.fill();
      },
    });
    right.append(ctx.legend([['var(--d3)', '高于 1 发散，低于 1 收敛']]));

    function show() {
      const { a, b } = coef(p), r = model.ratio(p), fC = model.perCopy(p, C), c = (1 - ALPHA * a) ** C;
      read.innerHTML = `p = ${fmt(p, 2)}、C = ${C}：每次复制乘 <b>${f4(fC)}</b>，折合每步 <b>${f4(model.perUpdate(p, C))}</b>；C = 1 时每步 ${f4(model.perCopy(p, 1))}，每轮精确拟合时每次复制 ${f4(r)}` +
        `<br>${r > 1 ? '外层放大：复制间隔只改变放大的快慢' : r < 1 ? '外层收缩：复制间隔只改变收缩的快慢' : '临界点 p = 1/3'}`;
      stepsBox.set([
        ['固定副本 w̄ 的损失，按行为频率加权', `L(w; w̄) = ½[p(w − 1.8w̄)^2 + (1 − p)(2w − 1.8w̄)^2]`],
        ['求导得两个系数', `∂L/∂w = a w − b w̄,　a = 4 − 3p = ${f3(a)},　b = 1.8(2 − p) = ${f3(b)}`],
        ['精确拟合点', `w^* = (b/a) w̄ = ${f4(r)} w̄`],
        [`内层 C = ${C} 步、步长 α = .1，从 w = w̄ 出发`, `w_C − w^* = (1 − αa)^C (w̄ − w^*),　(1 − ${f3(ALPHA * a)})^{${C}} = ${f4(c)}`],
        ['每次复制的倍率', { html: ctx.m(`f(C) = ${f4(r)} + ${f4(c)}(1 − ${f4(r)}) = `) + `<b>${f4(fC)}</b>` }],
        ['$f(C) > 1$ 当且仅当 $b > a$，即 $p > 1/3$，与 $C$ 无关', `p = ${fmt(p, 2)}：b − a = ${f3(b - a)}`],
      ], '计算过程　复制间隔与外层倍率');
    }
    show();
  });
})();
