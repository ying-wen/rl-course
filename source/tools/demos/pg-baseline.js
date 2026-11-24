/* 第 11 章：状态基线只改方差、不改均值。对应 11.3 节“动作无关基线与最小方差基线”的 s1 算例：
 * q = π(取 3|s1) = .25，取 1 得 1、取 3 得 3，Bernoulli 对数策略梯度 g = A − q。到访 s1 时的局部更新为 (G − β)g。
 * 另一模式用同批 N 个独立样本的均值 Ḡ 作基线，期望被乘以 1 − 1/N。 */
(() => {
  const Q = 0.25;
  const outcomes = (beta) => [
    { a: 1, prob: 1 - Q, G: 1, g: -Q, u: (1 - beta) * -Q },
    { a: 3, prob: Q, G: 3, g: 1 - Q, u: (3 - beta) * (1 - Q) },
  ];
  const model = {
    Q, outcomes,
    meanVar(beta) {
      const o = outcomes(beta), m = o.reduce((s, x) => s + x.prob * x.u, 0);
      return { mean: m, var: o.reduce((s, x) => s + x.prob * (x.u - m) ** 2, 0) };
    },
    /* 最小方差常数基线 β* = E[G g²] / E[g²]。 */
    betaStar() { const o = outcomes(0); return o.reduce((s, x) => s + x.prob * x.G * x.g * x.g, 0) / o.reduce((s, x) => s + x.prob * x.g * x.g, 0); },
    value() { return (1 - Q) * 1 + Q * 3; },
    binom(n, k) { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; },
    /* 同批均值基线：样本 i 的动作与其余 N−1 个样本中取 3 的个数 k，枚举 (G_i − Ḡ) g_i 的分布。 */
    batchMeanDist(N) {
      const pts = [];
      for (const own of outcomes(0)) for (let k = 0; k < N; k++) {
        const pk = model.binom(N - 1, k) * Q ** k * (1 - Q) ** (N - 1 - k);
        const Gbar = (own.G + 3 * k + (N - 1 - k)) / N;
        pts.push({ a: own.a, k, prob: own.prob * pk, Gbar, u: (own.G - Gbar) * own.g });
      }
      const m = pts.reduce((s, x) => s + x.prob * x.u, 0);
      return { pts, mean: m, var: pts.reduce((s, x) => s + x.prob * (x.u - m) ** 2, 0) };
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('pg-baseline', (ctx) => {
    const { el, fmt } = ctx;
    let mode = 'fixed', beta = 0, N = 2;
    const f3 = (x) => fmt(x, 3);
    const seg = ctx.segmented([['fixed', '预先固定的基线 β'], ['batch', '同批均值 Ḡ']], mode, (v) => { mode = v; sync(); }, '基线的取法');
    const bS = ctx.slider({ label: '基线 β', min: 0, max: 3.5, step: 0.05, value: beta, format: (x) => fmt(x, 2), oninput: (x) => { beta = x; ctx.redraw(); show(); } });
    const nS = ctx.slider({ label: '同批样本数 N', min: 2, max: 16, step: 1, value: N, oninput: (x) => { N = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(seg.node, bS.node, nS.node), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);
    function sync() { bS.node.style.display = mode === 'fixed' ? '' : 'none'; nS.node.style.display = mode === 'batch' ? '' : 'none'; ctx.redraw(); show(); }

    const vline = (G, P, h, x, col, wd, dash) => { G.save(); G.strokeStyle = col; G.lineWidth = wd; G.setLineDash(dash || []); G.beginPath(); G.moveTo(P.X(x), P.P.t); G.lineTo(P.X(x), h - P.P.b); G.stroke(); G.restore(); };
    ctx.canvas({
      parent: left, aspect: 0.75, maxHeight: 280, minHeight: 200, label: '到访 s1 时局部更新的分布',
      draw(G, w, h) {
        const C = ctx.colors();
        const pts = mode === 'fixed' ? outcomes(beta).map((o) => ({ ...o, row: 0.5 })) : model.batchMeanDist(N).pts.map((o) => ({ ...o, row: o.a === 3 ? 0.7 : 0.3 }));
        const mean = mode === 'fixed' ? model.meanVar(beta).mean : model.batchMeanDist(N).mean;
        const P = ctx.plot(G, w, h, { series: [], xmin: -1, xmax: 2.5, ymin: 0, ymax: 1, yticks: 0, xlabel: '局部更新 (G − β)g', ylabel: '', pad: { l: 14 } });
        vline(G, P, h, 0.375, C.muted, 1.2, [4, 4]);
        vline(G, P, h, mean, C.ink, 2);
        pts.forEach((o) => {
          G.fillStyle = o.a === 3 ? C.series[2] : C.series[3]; G.globalAlpha = 0.85;
          G.beginPath(); G.arc(P.X(o.u), P.Y(o.row), 3 + 22 * Math.sqrt(o.prob), 0, 7); G.fill();
        });
        G.globalAlpha = 1; G.fillStyle = C.muted; G.font = ctx.font(11); G.textAlign = 'left'; G.textBaseline = 'top';
        G.fillText('圆面积 ∝ 概率', P.P.l + 4, P.P.t + 2);
      },
    });
    left.append(ctx.legend([['var(--d4)', '取 1'], ['var(--d3)', '取 3'], ['var(--ink)', '当前均值'], ['var(--muted)', '真实值 .375']]));

    ctx.canvas({
      parent: right, aspect: 0.75, maxHeight: 280, minHeight: 200, label: '条件方差随基线的变化，或同批均值基线下期望随样本数的变化',
      draw(G, w, h) {
        const C = ctx.colors();
        if (mode === 'fixed') {
          const data = []; for (let i = 0; i <= 70; i++) { const b = i / 20; data.push([b, model.meanVar(b).var]); }
          const P = ctx.plot(G, w, h, { series: [{ data, color: C.series[0], width: 2 }], xmin: 0, xmax: 3.5, ymin: 0, ymax: 1.4, xlabel: '基线 β', ylabel: '条件方差', pad: { l: 40 } });
          [[0, '0'], [model.value(), 'v_π = 1.5'], [model.betaStar(), 'β* = 2.5']].forEach(([b, t]) => {
            G.fillStyle = C.muted; G.beginPath(); G.arc(P.X(b), P.Y(model.meanVar(b).var), 3.5, 0, 7); G.fill();
            G.font = ctx.font(11); G.textAlign = b > 3 ? 'right' : 'left'; G.textBaseline = 'bottom'; G.fillText(t, P.X(b) + 5, P.Y(model.meanVar(b).var) - 4);
          });
          G.fillStyle = C.ink; G.beginPath(); G.arc(P.X(beta), P.Y(model.meanVar(beta).var), 5, 0, 7); G.fill();
        } else {
          const data = []; for (let n = 2; n <= 16; n++) data.push([n, model.batchMeanDist(n).mean]);
          const P = ctx.plot(G, w, h, { series: [{ data, color: C.series[0], width: 2 }], xmin: 2, xmax: 16, ymin: 0, ymax: 0.45, xlabel: '同批样本数 N', ylabel: 'E[(G_i − Ḡ)g_i]', hlines: [{ y: 0.375, label: '真实值 .375（留一均值）' }], pad: { l: 44 } });
          G.fillStyle = C.ink; G.beginPath(); G.arc(P.X(N), P.Y(model.batchMeanDist(N).mean), 5, 0, 7); G.fill();
        }
      },
    });

    function show() {
      const lines = [];
      if (mode === 'fixed') {
        const [o1, o3] = outcomes(beta), mv = model.meanVar(beta);
        read.innerHTML = `β = ${fmt(beta, 2)}：取 1 时 <b>${f3(o1.u)}</b>（概率 .75），取 3 时 <b>${f3(o3.u)}</b>（概率 .25）；均值 <b>${f3(mv.mean)}</b>，条件方差 <b>${f3(mv.var)}</b>`;
        lines.push(['Bernoulli 策略的对数策略梯度，$q = .25$', 'g(取 1) = −q = −.25,　g(取 3) = 1 − q = .75']);
        lines.push(['两种局部更新', `(1 − β)(−.25) = ${f3(o1.u)},　(3 − β)(.75) = ${f3(o3.u)}`]);
        lines.push(['基线项的期望为零', 'E[β g] = β[.75(−.25) + .25(.75)] = 0']);
        lines.push(['均值与 β 无关', { html: ctx.m(`.75·(${f3(o1.u)}) + .25·(${f3(o3.u)}) = `) + `<b>${f3(mv.mean)}</b>` }]);
        lines.push(['方差是 β 的二次函数', { html: ctx.m(`q(1−q)[(3−β)(.75) − (1−β)(−.25)]^2 = .1875(2.5 − β)^2 = `) + `<b>${f3(mv.var)}</b>` }]);
        lines.push(['最小方差基线', `β^* = E[G g^2] / E[g^2] = (.25·3·.5625 + .75·1·.0625) / (.25·.5625 + .75·.0625) = ${fmt(model.betaStar(), 2)}`]);
      } else {
        const d = model.batchMeanDist(N), loo = 0.375;
        read.innerHTML = `N = ${N}：E[(G<sub>i</sub> − Ḡ)g<sub>i</sub>] = <b>${f3(d.mean)}</b>，比真实值 .375 少 <b>${f3(loo - d.mean)}</b>；方差 ${f3(d.var)}。换成其余 N − 1 个样本的均值后，期望回到 .375`;
        lines.push(['同批均值含有本样本', 'Ḡ = (1/N) Σ_j G_j,　E[g_i G_j] = 0 (j ≠ i),　E[g_i G_i] = .375']);
        lines.push(['期望被乘以 $1 − 1/N$', { html: ctx.m(`E[(G_i − Ḡ)g_i] = (1 − 1/${N})·.375 = `) + `<b>${f3(d.mean)}</b>` }]);
        lines.push(['留一均值 $β_{−i}$ 与本样本独立', 'E[(G_i − β_{−i}) g_i] = .375']);
      }
      stepsBox.set(lines, mode === 'fixed' ? '计算过程　到访 s₁ 的局部更新' : '计算过程　同批均值基线');
    }
    sync();
  });
})();
