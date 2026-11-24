/* 第 10 章：共享参数时，回放池的记录比例改变没被访问的状态的选择。对应 10.2 节“均匀回放按池中的记录条数加权”
 * 与 10.3 节“共享参数时，同一条经验还可能改变另一个状态的选择”：Q(19,右) = Q(1,左) = Q(10,右) = u，Q(10,左) = q_L = .25。
 * 池中比例 p 的记录在第 19 格向右退出得 +1，其余在第 1 格向左退出得 −1。全池半平方损失一步：u⁺ = u + α[(2p − 1) − u]。
 * 从 u = 0、α = .5 出发：p = .8 时 u⁺ = .30（第 10 格改选右），p = .2 时 −.30；只有一条 +1 记录（p = 1）时 u⁺ = α。 */
(() => {
  const QL = 0.25;
  const model = {
    QL,
    step(u, p, alpha) { return u + alpha * (2 * p - 1 - u); },
    flips(u, p, alpha) { return model.step(u, p, alpha) > QL; },
    /* 每次只抽一条记录时：以 p 得 u + α(1 − u)，以 1 − p 得 u + α(−1 − u)。 */
    single(u, p, alpha) { const up = u + alpha * (1 - u), dn = u + alpha * (-1 - u); return { up, dn, pFlip: (up > QL ? p : 0) + (dn > QL ? 1 - p : 0) }; },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('replay-share', (ctx) => {
    const { el, fmt } = ctx;
    let p = 0.8, alpha = 0.5;
    const f2 = (x) => fmt(x, 2), f3 = (x) => fmt(x, 3);
    const pS = ctx.slider({ label: '池中 +1 记录的比例 p', min: 0, max: 1, step: 0.05, value: p, format: f2, oninput: (x) => { p = x; ctx.redraw(); show(); } });
    const aS = ctx.slider({ label: '步长 α', min: 0.05, max: 1, step: 0.05, value: alpha, format: f2, oninput: (x) => { alpha = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(pS.node, aS.node), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);

    ctx.canvas({
      parent: left, aspect: 0.8, maxHeight: 280, minHeight: 200, label: '更新前后的四个动作估值',
      draw(G, w, h) {
        const C = ctx.colors(), up = model.step(0, p, alpha);
        const P = ctx.plot(G, w, h, { series: [], xmin: 0, xmax: 4, ymin: -1, ymax: 1, xticks: 0, xlabel: '', ylabel: '估值', pad: { l: 40, b: 40 }, hlines: [{ y: 0, color: C.rule }, { y: QL, color: C.muted, label: 'q_L = .25' }] });
        const names = ['Q(19,右)', 'Q(1,左)', 'Q(10,右)', 'Q(10,左)'], bw = (P.X(1) - P.X(0)) * 0.3;
        names.forEach((nm, i) => {
          const before = i < 3 ? 0 : QL, after = i < 3 ? up : QL, xc = P.X(i + 0.5);
          const bar = (x0, v, col) => { const y0 = P.Y(0), y1 = P.Y(v); G.fillStyle = col; G.fillRect(x0, Math.min(y0, y1), bw, Math.max(1.5, Math.abs(y1 - y0))); };
          bar(xc - bw - 1, before, ctx.mix(C.surface, C.muted, 0.5));
          bar(xc + 1, after, i === 2 ? C.series[2] : i < 3 ? C.series[0] : C.series[3]);
          G.fillStyle = C.ink; G.font = ctx.font(11); G.textAlign = 'center'; G.textBaseline = 'top'; G.fillText(nm, xc, h - P.P.b + 6);
        });
        G.font = ctx.font(10.5); G.fillStyle = C.muted; G.fillText('前三项共用参数 u', P.X(1.5), h - P.P.b + 22);
      },
    });
    left.append(ctx.legend([['var(--muted)', '更新前'], ['var(--d1)', '更新后（有记录）'], ['var(--d3)', '第 10 格向右（无记录）']]));

    ctx.canvas({
      parent: right, aspect: 0.8, maxHeight: 280, minHeight: 200, label: '记录比例与步长平面上第 10 格是否改选右',
      draw(G, w, h) {
        const C = ctx.colors();
        const P = ctx.plot(G, w, h, { series: [], xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: '池中 +1 记录的比例 p', ylabel: '步长 α', pad: { l: 40 } });
        const n = 40, cw = (P.X(1) - P.X(0)) / n, ch = (P.Y(0) - P.Y(1)) / n;
        G.fillStyle = ctx.mix(C.surface, C.series[2], 0.3);
        for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) if (model.flips(0, (i + 0.5) / n, (k + 0.5) / n)) G.fillRect(P.X(0) + i * cw, P.Y(1) + (n - 1 - k) * ch, cw + 0.5, ch + 0.5);
        const bd = []; for (let i = 0; i <= 60; i++) { const a = 0.26 + (0.74 * i) / 60; bd.push([0.5 + 0.125 / a, a]); }
        G.strokeStyle = C.series[2]; G.lineWidth = 1.6; G.beginPath(); bd.forEach(([x, y], i) => (i ? G.lineTo(P.X(x), P.Y(y)) : G.moveTo(P.X(x), P.Y(y)))); G.stroke();
        G.fillStyle = C.ink; G.beginPath(); G.arc(P.X(p), P.Y(alpha), 5.5, 0, 7); G.fill(); G.strokeStyle = C.bg; G.lineWidth = 2; G.stroke();
        G.font = ctx.font(11); G.fillStyle = C.ink; G.textAlign = 'right'; G.textBaseline = 'top'; G.fillText('改选右', P.X(0.98), P.Y(0.97));
      },
    });
    right.append(ctx.legend([['var(--d3)', '红区：α(2p − 1) > .25，第 10 格改选右'], ['var(--ink)', '当前 (p, α)']]));

    function show() {
      const up = model.step(0, p, alpha), s = model.single(0, p, alpha), fl = up > QL;
      read.innerHTML = `p = ${f2(p)}、α = ${f2(alpha)}：u⁺ = <b>${f3(up)}</b>，第 10 格 ${fl ? '<b>改选右</b>' : '仍选左'}（右 ${f3(up)}，左 .25）<br>` +
        `每次只抽一条：u⁺ 为 ${f3(s.up)} 或 ${f3(s.dn)}，第 10 格改选右的概率 ${f2(s.pFlip)}`;
      stepsBox.set([
        ['全池半平方损失，两种记录按条数加权', 'L_D(u) = ½{p(u − 1)^2 + (1 − p)(u + 1)^2}'],
        ['梯度', `L_D'(u) = u − (2p − 1),　在 u = 0 处为 −(2·${f2(p)} − 1) = ${f3(-(2 * p - 1))}`],
        ['一次梯度步', { html: ctx.m(`u^+ = 0 + ${f2(alpha)}[(2·${f2(p)} − 1) − 0] = `) + `<b>${f3(up)}</b>` }],
        ['第 10 格没有任何记录，向右的估值也是 u', `Q(10,右) = ${f3(up)} ${fl ? '>' : '≤'} Q(10,左) = .25，贪心动作${fl ? '变为右' : '仍为左'}`],
      ], '计算过程　共享参数 u 的一次回放更新');
    }
    show();
  });
})();
