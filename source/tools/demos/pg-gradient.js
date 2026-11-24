/* 第 11 章：策略梯度定理在两步决策树上的三种算法。对应 11.1 节“两步决策任务”与“策略梯度定理与状态访问权重”：
 * p = σ(θ0)，q = σ(θ1)，γ = .9，J = (1−p) + γp(1+2q)。比较有限差分、似然比（REINFORCE）估计与定理给出的精确梯度，
 * 以及“错误地固定到达 s1 的概率”时的 −p(1−p)。 */
(() => {
  const GAMMA = 0.9, TH0 = [0, Math.log(1 / 3)];
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const model = {
    GAMMA, TH0,
    J(th) { const p = sig(th[0]), q = sig(th[1]); return (1 - p) + GAMMA * p * (1 + 2 * q); },
    /* 定理：∇J = Σ_s n_π(s) Σ_a π(a|s) q_π(s,a) ∇log π(a|s)，n(s0) = 1，n(s1) = γp。 */
    theorem(th) {
      const p = sig(th[0]), q = sig(th[1]);
      const k0 = (1 - p) * 1 * (-p) + p * GAMMA * (1 + 2 * q) * (1 - p);
      const k1 = (1 - q) * 1 * (-q) + q * 3 * (1 - q);
      return { p, q, n0: 1, n1: GAMMA * p, k0, k1, grad: [k0, GAMMA * p * k1] };
    },
    /* 把到达 s1 的概率当成常数时，第一分量只剩 −p(1−p)。 */
    frozenVisit(th) { const p = sig(th[0]); return -p * (1 - p); },
    fd(th, j, h) { const a = th.slice(), b = th.slice(); a[j] += h; b[j] -= h; return (model.J(a) - model.J(b)) / (2 * h); },
    /* 一回合的似然比估计 Σ_t γ^t G_t ∇log π(A_t|S_t)。 */
    episode(th, rng) {
      const p = sig(th[0]), q = sig(th[1]);
      if (rng() >= p) return [-p, 0];
      const take3 = rng() < q, R = take3 ? 3 : 1;
      return [GAMMA * R * (1 - p), GAMMA * R * ((take3 ? 1 : 0) - q)];
    },
    batchMean(th, j, N, rng) { let s = 0; for (let i = 0; i < N; i++) s += model.episode(th, rng)[j]; return s / N; },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('pg-gradient', (ctx) => {
    const { el, fmt } = ctx;
    const M = 40, H = 0.01;
    let j = 0, th = TH0.slice(), N = 16, seed = 1, est = [];
    const f4 = (x) => fmt(x, 4), f3 = (x) => fmt(x, 3);
    function resample() {
      const r = ctx.rng(seed * 7919 + N * 31 + j * 3 + Math.round(th[j] * 100));
      est = Array.from({ length: M }, () => model.batchMean(th, j, N, r));
      ctx.redraw(); show();
    }
    const thS = ctx.slider({ label: '所选参数的值', min: -3, max: 3, step: 0.05, value: th[0], format: (x) => fmt(x, 2), oninput: (x) => { th[j] = x; resample(); } });
    const seg = ctx.segmented([[0, 'θ₀：s₀ 继续'], [1, 'θ₁：s₁ 取 3']], 0, (v) => { j = v; th = TH0.slice(); thS.value = th[j]; resample(); }, '求导的参数');
    const nS = ctx.slider({ label: '每批回合数 N', min: 1, max: 128, step: 1, value: N, oninput: (x) => { N = x; resample(); } });
    const again = ctx.button('重新采样', () => { seed += 1; resample(); }, true);
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(seg.node, thS.node), ctx.row(nS.node, again), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);

    const stats = () => { const m = est.reduce((a, b) => a + b, 0) / M; return { m, sd: Math.sqrt(est.reduce((a, b) => a + (b - m) ** 2, 0) / (M - 1)) }; };

    ctx.canvas({
      parent: left, aspect: 0.8, maxHeight: 300, minHeight: 220, label: '期望回报沿所选参数的截面与三种斜率',
      draw(G, w, h) {
        const C = ctx.colors(), xs = [];
        for (let i = 0; i <= 120; i++) { const x = -4 + i / 15, t = th.slice(); t[j] = x; xs.push([x, model.J(t)]); }
        const P = ctx.plot(G, w, h, { series: [{ data: xs, color: C.ink, width: 2 }], xmin: -4, xmax: 4, ymin: 0.6, ymax: 2.8, xlabel: j ? 'θ₁（θ₀ 固定为 0）' : 'θ₀（θ₁ 固定为 log ⅓）', ylabel: 'J(θ)', pad: { l: 40 } });
        const x0 = th[j], y0 = model.J(th), L = 1.3;
        const line = (slope, col, wd, dash, alpha = 1) => {
          G.save(); G.globalAlpha = alpha; G.strokeStyle = col; G.lineWidth = wd; G.setLineDash(dash || []);
          G.beginPath(); G.moveTo(P.X(x0 - L), P.Y(y0 - L * slope)); G.lineTo(P.X(x0 + L), P.Y(y0 + L * slope)); G.stroke(); G.restore();
        };
        G.save(); G.beginPath(); G.rect(P.P.l, P.P.t, w - P.P.l - P.P.r, h - P.P.t - P.P.b); G.clip();
        est.forEach((s) => line(s, C.series[1], 1, null, 0.28));
        if (j === 0) line(model.frozenVisit(th), C.series[2], 1.8, [5, 4]);
        line(model.theorem(th).grad[j], C.series[0], 2.4);
        G.restore();
        G.fillStyle = C.ink; G.beginPath(); G.arc(P.X(x0), P.Y(y0), 4.5, 0, 7); G.fill();
      },
    });
    left.append(ctx.legend([['var(--ink)', 'J(θ)'], ['var(--d1)', '定理的精确斜率'], ['var(--d2)', `${M} 批似然比估计`], ['var(--d3)', '固定到达概率（仅 θ₀）']]));

    ctx.canvas({
      parent: right, aspect: 0.8, maxHeight: 300, minHeight: 220, label: '各批似然比估计的散布',
      draw(G, w, h) {
        const C = ctx.colors(), tg = model.theorem(th).grad[j], { m, sd } = stats();
        const span = Math.max(0.15, 3.2 * sd, Math.abs(tg) * 1.6), lo = tg - span, hi = tg + span;
        const P = ctx.plot(G, w, h, { series: [], xmin: lo, xmax: hi, ymin: 0, ymax: M + 1, yticks: 0, xlabel: `∂J/∂θ${j ? '₁' : '₀'} 的估计`, ylabel: '批次', pad: { l: 30 } });
        G.save(); G.beginPath(); G.rect(P.P.l, P.P.t, w - P.P.l - P.P.r, h - P.P.t - P.P.b); G.clip();
        G.fillStyle = C.series[1];
        est.forEach((s, i) => { G.beginPath(); G.arc(P.X(s), P.Y(i + 1), 3, 0, 7); G.fill(); });
        const vline = (x, col, wd, dash) => { G.save(); G.strokeStyle = col; G.lineWidth = wd; G.setLineDash(dash || []); G.beginPath(); G.moveTo(P.X(x), P.P.t); G.lineTo(P.X(x), h - P.P.b); G.stroke(); G.restore(); };
        vline(0, C.rule, 1);
        vline(tg, C.series[0], 2.4);
        vline(m, C.series[1], 1.6, [4, 3]);
        G.restore();
      },
    });
    right.append(ctx.legend([['var(--d1)', '定理 = 有限差分'], ['var(--d2)', '点：每批均值；虚线：40 批平均']]));

    function show() {
      const T = model.theorem(th), tg = T.grad[j], fd = model.fd(th, j, H), { m, sd } = stats();
      const wrong = est.filter((s) => s * tg < 0).length;
      read.innerHTML = `p = ${f3(T.p)}，q = ${f3(T.q)}，J = ${f3(model.J(th))}<br>` +
        `∂J/∂θ${j ? '₁' : '₀'}：定理 <b>${f4(tg)}</b>，有限差分 <b>${f4(fd)}</b>，${M} 批似然比估计（每批 N = ${N}）的平均 <b>${f4(m)}</b>，批间标准差 <b>${f4(sd)}</b>；` +
        `${wrong} 批的符号与真梯度相反` + (j === 0 ? `；固定到达概率得 <b>${f4(model.frozenVisit(th))}</b>` : '');
      const lines = [
        ['策略梯度定理，$n_π$ 为折扣访问权重', '∇J = Σ_s n_π(s) Σ_a π(a|s) q_π(s,a) ∇log π(a|s)'],
      ];
      if (j === 0) {
        lines.push(['$s_0$：$n_π(s_0) = 1$，停止 $q = 1$，继续 $q = γ(1+2q)$，$∂ log π$ 依次为 $−p$ 与 $1−p$', `k(s_0) = (1−p)·1·(−p) + p·γ(1+2q)·(1−p) = ${f3(1 - T.p)}·(−${f3(T.p)}) + ${f3(T.p)}·${f3(GAMMA * (1 + 2 * T.q))}·${f3(1 - T.p)}`]);
        lines.push(['合并', { html: ctx.m(`∂J/∂θ_0 = p(1−p)[γ(1+2q) − 1] = `) + `<b>${f4(tg)}</b>` }]);
        lines.push(['若把到达 $s_1$ 的概率 $γp$ 当成常数，只剩停止与继续的即时差', { html: ctx.m('−p(1−p) = ') + `<b>${f4(model.frozenVisit(th))}</b>` }]);
      } else {
        lines.push(['$s_1$：取 1 得 1、取 3 得 3，$∂ log π$ 依次为 $−q$ 与 $1−q$', `k(s_1) = (1−q)·1·(−q) + q·3·(1−q) = 2q(1−q) = ${f4(T.k1)}`]);
        lines.push(['乘 $s_1$ 的折扣访问权重 $n_π(s_1) = γp$', { html: ctx.m(`∂J/∂θ_1 = γp·k(s_1) = ${f3(T.n1)}·${f4(T.k1)} = `) + `<b>${f4(tg)}</b>` }]);
      }
      lines.push([`有限差分，$h = ${H}$，需要能在任意参数处算出 $J$`, `[J(θ + h e_${j}) − J(θ − h e_${j})] / 2h = ${f4(fd)}`]);
      lines.push(['似然比估计：只用当前策略采到的回合', { html: ctx.m(`(1/N) Σ_i Σ_t γ^t G_t ∂_{θ_${j}} log π(A_t|S_t)：${M} 批平均 `) + `<b>${f4(m)}</b>` + ctx.m(`，标准差 ${f4(sd)}`) }]);
      stepsBox.set(lines, `计算过程　∂J/∂θ${j ? '₁' : '₀'} 的三种算法`);
    }
    resample();
  });
})();
