/* 第 7 章 7.2 节“λ 在偏差与方差之间移动”：从 S7 出发的 G_0^λ（或 n 步回报 G_{0:n}）对全部终止时刻精确求和。
 * 泥地：S7 一步到 S4，S4 每步以 .1 脱困（奖励 1）、以 .9 留在原地；γ = .9，回合长 L 的概率 .1 × .9^{L−2}，截到 400 步。
 * 尾值只读冻结的 V(S4)；真值 v(S7) = 9/19，v(S4) = 10/19。 */
(() => {
  const GAMMA = 0.9, V7 = 9 / 19, V4T = 10 / 19, LMAX = 401;
  /* target(L) 给出长 L 的回合上的目标值，返回均值、偏差、方差、均方误差 */
  function moments(target) {
    let m1 = 0, m2 = 0;
    for (let L = 2; L <= LMAX; L++) { const p = 0.1 * 0.9 ** (L - 2), x = target(L); m1 += p * x; m2 += p * x * x; }
    const v = m2 - m1 * m1, b = m1 - V7;
    return { mean: m1, bias: b, var: Math.max(0, v), mse: b * b + Math.max(0, v) };
  }
  function lambdaStats(lam, V4) {
    // G_0^λ = V4 Σ_{n=1}^{L−1} (1−λ)λ^{n−1}γ^n + λ^{L−1} γ^{L−1}（末步奖励 1 折扣 L−1 次）；部分和随 L 递增
    const S = new Float64Array(LMAX + 1);
    for (let L = 2; L <= LMAX; L++) S[L] = S[L - 1] + (1 - lam) * lam ** (L - 2) * GAMMA ** (L - 1);
    return moments((L) => V4 * S[L] + (lam * GAMMA) ** (L - 1));
  }
  const nStats = (n, V4) => moments((L) => (n < L ? GAMMA ** n * V4 : GAMMA ** (L - 1)));
  const biasLambda = (lam, V4) => ((0.9 * (1 - lam)) / (1 - 0.81 * lam)) * (V4 - V4T);
  const biasN = (n, V4) => 0.9 ** n * 0.9 ** (n - 1) * (V4 - V4T);
  const cLambda = (lam) => ((1 - lam) * GAMMA) / (1 - GAMMA * lam);
  const model = { moments, lambdaStats, nStats, biasLambda, biasN, cLambda, V7, V4T };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('lambda-bias-var', (ctx) => {
    ctx.stage.style.textAlign = 'left'; // 页面正文两端对齐，计算过程里的长说明会被拉开字距
    const { fmt } = ctx;
    let mode = 'lambda', V4 = 0.3, probe = 0.8, nProbe = 4, curve = [];
    const xs = () => (mode === 'lambda' ? Array.from({ length: 101 }, (_, i) => i / 100) : Array.from({ length: 20 }, (_, i) => i + 1));
    const recompute = () => { curve = xs().map((x) => [x, mode === 'lambda' ? lambdaStats(x, V4) : nStats(x, V4)]); };
    const seg = ctx.segmented([['lambda', 'λ-回报'], ['n', 'n 步回报']], mode, (v) => { mode = v; recompute(); probeBox.replaceChildren(mode === 'lambda' ? lamS.node : nS.node); upd(); }, '目标的种类');
    const vS = ctx.slider({ label: 'V(S4)', min: 0, max: 1, step: 0.01, value: V4, format: (x) => fmt(x, 2), oninput: (x) => { V4 = x; recompute(); upd(); } });
    const lamS = ctx.slider({ label: '查看 λ', min: 0, max: 1, step: 0.01, value: probe, format: (x) => fmt(x, 2), oninput: (x) => { probe = x; upd(); } });
    const nS = ctx.slider({ label: '查看 n', min: 1, max: 20, step: 1, value: nProbe, format: String, oninput: (x) => { nProbe = x; upd(); } });
    const probeBox = ctx.el('div', {}, lamS.node), read = ctx.readout(), st = ctx.steps();
    ctx.stage.append(ctx.row(seg.node), ctx.row(vS.node, probeBox));
    recompute();
    ctx.canvas({
      aspect: 0.5, maxHeight: 300, minHeight: 220, label: '从 S7 出发的目标的均方误差、偏差平方与方差',
      draw(G, w, h) {
        const C = ctx.colors(), ymax = Math.max(0.01, ...curve.map(([, s]) => s.mse)) * 1.12;
        const ax = ctx.plot(G, w, h, {
          series: [
            { data: curve.map(([x, s]) => [x, s.var]), color: C.series[0], width: 1.6 },
            { data: curve.map(([x, s]) => [x, s.bias * s.bias]), color: C.series[1], width: 1.6 },
            { data: curve.map(([x, s]) => [x, s.mse]), color: C.series[2], width: 2.6 },
          ],
          xmin: mode === 'lambda' ? 0 : 1, xmax: mode === 'lambda' ? 1 : 20, ymin: 0, ymax, xlabel: mode === 'lambda' ? 'λ' : 'n', ylabel: '均方误差', pad: { l: 54 },
        });
        let best = curve[0]; for (const c of curve) if (c[1].mse < best[1].mse) best = c;
        G.fillStyle = C.series[2]; G.beginPath(); G.arc(ax.X(best[0]), ax.Y(best[1].mse), 4.5, 0, 2 * Math.PI); G.fill();
        const px = ax.X(mode === 'lambda' ? probe : nProbe);
        G.save(); G.strokeStyle = C.muted; G.setLineDash([2, 3]); G.beginPath(); G.moveTo(px, ax.P.t); G.lineTo(px, ax.Y(0)); G.stroke(); G.restore();
      },
    });
    ctx.stage.append(ctx.legend([['var(--d3)', '均方误差 = 偏差² + 方差（圆点为最小处）'], ['var(--d2)', '偏差²'], ['var(--d1)', '方差']]), read, st.node);
    function upd() { ctx.redraw(); show(); }
    function show() {
      let best = curve[0]; for (const c of curve) if (c[1].mse < best[1].mse) best = c;
      const isL = mode === 'lambda', x = isL ? probe : nProbe, s = isL ? lambdaStats(x, V4) : nStats(x, V4);
      read.innerHTML = `V(S4) = ${fmt(V4, 2)}：均方误差最小在 ${isL ? 'λ' : 'n'} = <b>${isL ? fmt(best[0], 2) : best[0]}</b>，为 <b>${fmt(best[1].mse, 4)}</b>；` +
        `${isL ? 'λ = 1' : 'n = 20'} 处为 ${fmt(curve[curve.length - 1][1].mse, 4)}`;
      const lines = [
        ['被估量：$v(S7) = 9/19$；尾值误差 $V(S4) − v(S4)$', { html: ctx.m(`${fmt(V4, 2)} − ${fmt(V4T, 4)} = `) + `<b>${fmt(V4 - V4T, 4)}</b>` }],
        isL
          ? ['偏差：第 n 步仍在泥地的概率 $.9^{n−1}$，按权重求和', { html: ctx.m(`.9(1−λ)/(1−.81λ) × (${fmt(V4 - V4T, 4)}) = ${fmt(0.9 * (1 - x) / (1 - 0.81 * x), 4)} × (${fmt(V4 - V4T, 4)}) = `) + `<b>${fmt(biasLambda(x, V4), 4)}</b>` }]
          : ['偏差：只有第 n 步还没到终点时才读尾值，概率 $.9^{n−1}$', { html: ctx.m(`γ^n · .9^{n−1} × (${fmt(V4 - V4T, 4)}) = ${fmt(0.9 ** (2 * x - 1), 4)} × (${fmt(V4 - V4T, 4)}) = `) + `<b>${fmt(biasN(x, V4), 4)}</b>` }],
        ['方差：对全部终止时刻 $L$ 精确求和，$P(L) = .1 × .9^{L−2}$', { html: ctx.m('E[Y^2] − (E Y)^2 = ') + `<b>${fmt(s.var, 4)}</b>` }],
        ['均方误差 $=$ 偏差$^2$ $+$ 方差', { html: ctx.m(`${fmt(s.bias, 4)}^2 + ${fmt(s.var, 4)} = `) + `<b>${fmt(s.mse, 4)}</b>` }],
      ];
      if (isL) lines.push(['对照：最大范数界里的系数 $c_λ = (1−λ)γ/(1−γλ)$，大于上面偏差的系数', { html: ctx.m('c_λ = ') + `<b>${fmt(cLambda(x), 3)}</b>` }]);
      st.set(lines, `计算过程　${isL ? 'λ = ' + fmt(x, 2) : 'n = ' + x}，V(S4) = ${fmt(V4, 2)}`);
    }
    show();
  });
})();
