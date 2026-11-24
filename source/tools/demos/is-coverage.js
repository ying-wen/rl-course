/* 第 6 章 6.6 节“覆盖与方差”：泥地 S7，目标策略 π 向上 .8、向左 .2，行为 b 在 S7 以 p 向左、1−p 向上；γ = .9。
 * 左路回报 .9^5，权重 .2/p；上路在 S4 每步以 .1 脱困，k 次打滑后回报 .9^{k+1}，权重 .8/(1−p)。
 * 普通估计 U_n = Σρ_iG_i / n，加权估计 M_n = Σρ_iG_i / Σρ_i（式 (5.5)–(5.6)）。 */
(() => {
  const GL = 0.9 ** 5, V_UP = 9 / 19, M_UP = 0.081 / 0.271, PI_UP = 0.8, PI_L = 0.2;
  const V_PI = PI_UP * V_UP + PI_L * GL;
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
  const weights = (p) => ({ L: p > 0 ? PI_L / p : NaN, U: PI_UP / (1 - p) });
  /* 一回合普通估计 ρG 的均值与方差；p = 0 时左路无样本，均值只剩上路那一份 */
  function onePoint(p) {
    const w = weights(p);
    if (p <= 0) return { mean: PI_UP * V_UP, var: PI_UP ** 2 * M_UP - (PI_UP * V_UP) ** 2, covered: false };
    return { mean: V_PI, var: (PI_L ** 2) * GL * GL / p + (PI_UP ** 2) * M_UP / (1 - p) - V_PI * V_PI, covered: true, w };
  }
  function episode(R, p) {
    if (R() < p) return { G: GL, left: true };
    let k = 0; while (R() < 0.9) k++;
    return { G: 0.9 ** (k + 1), left: false };
  }
  /* nRuns 条独立序列，每条 nEp 回合，返回每条序列上 U_n 与 M_n 的轨迹 */
  function runs(seed, p, nRuns = 20, nEp = 200) {
    const R = rng(seed), w = weights(p), out = [];
    for (let r = 0; r < nRuns; r++) {
      let sY = 0, sW = 0; const U = new Float64Array(nEp), M = new Float64Array(nEp);
      for (let n = 0; n < nEp; n++) {
        const e = episode(R, p), rho = e.left ? w.L : w.U;
        sY += rho * e.G; sW += rho;
        U[n] = sY / (n + 1); M[n] = sW > 0 ? sY / sW : NaN;
      }
      out.push({ U, M });
    }
    return out;
  }
  /* 加权估计 M_1、M_2 的精确均值、方差、均方误差（对上路打滑次数求和，截到 400 次） */
  function exactWeighted(p) {
    const ups = []; for (let k = 0; k < 400; k++) ups.push([0.1 * 0.9 ** k, 0.9 ** (k + 1)]);
    const w = weights(p);
    let m1 = 0, s1 = 0;
    const add1 = (pr, x) => { m1 += pr * x; s1 += pr * x * x; };
    if (p > 0) add1(p, GL);
    for (const [q, g] of ups) add1((1 - p) * q, g);
    let m2 = 0, s2 = 0;
    const add2 = (pr, x) => { m2 += pr * x; s2 += pr * x * x; };
    if (p > 0) add2(p * p, GL);
    for (const [q1, g1] of ups) {
      if (p > 0) add2(2 * p * (1 - p) * q1, (w.U * g1 + w.L * GL) / (w.U + w.L));
      for (const [q2, g2] of ups) add2((1 - p) ** 2 * q1 * q2, (g1 + g2) / 2);
    }
    const pack = (m, s) => ({ mean: m, bias: m - V_PI, var: s - m * m, mse: s - m * m + (m - V_PI) ** 2 });
    return { M1: pack(m1, s1), M2: pack(m2, s2) };
  }
  const model = { GL, V_UP, M_UP, V_PI, weights, onePoint, episode, runs, exactWeighted, rng };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('is-coverage', (ctx) => {
    ctx.stage.style.textAlign = 'left'; // 页面正文两端对齐，计算过程里的长说明会被拉开字距
    const { fmt } = ctx;
    const N_RUNS = 20, N_EP = 200;
    let p = 0.5, seed = 1, data = runs(seed, p, N_RUNS, N_EP);
    const pS = ctx.slider({ label: 'b 在 S7 向左的概率 p', min: 0, max: 0.9, step: 0.01, value: p, format: (x) => fmt(x, 2), oninput: (x) => { p = x; data = runs(seed, p, N_RUNS, N_EP); ctx.redraw(); show(); } });
    const bNew = ctx.button('重新采样', () => { seed += 1; data = runs(seed, p, N_RUNS, N_EP); ctx.redraw(); show(); }, true);
    const bPi = ctx.button('p = .2（b = π）', () => { p = 0.2; pS.value = p; data = runs(seed, p, N_RUNS, N_EP); ctx.redraw(); show(); });
    const left = ctx.el('div'), right = ctx.el('div'), read = ctx.readout(), st = ctx.steps();
    ctx.stage.append(ctx.row(bNew, bPi), ctx.row(pS.node), ctx.el('div', { class: 'demo-grid2' }, left, right));
    const panel = (parent, key, title) => ctx.canvas({
      parent, aspect: 0.8, maxHeight: 300, minHeight: 220, label: `${title}：${N_RUNS} 条独立序列上估计随回合数的变化`,
      draw(G, w, h) {
        const C = ctx.colors(), one = onePoint(p);
        // 参照线的标签写在图顶，免得压在密集的序列上（p = 0 时两条线只差 .02–.12）
        const lim = key === 'U' ? one.mean : V_UP;
        const hl = [{ y: V_PI, color: C.series[3] }];
        if (!one.covered) hl.push({ y: lim, color: C.series[2] });
        const ax = ctx.plot(G, w, h, {
          series: data.map((r) => ({ data: Array.from(r[key], (y, i) => [i + 1, y]), color: ctx.mix(C.series[key === 'U' ? 0 : 1], C.bg, 0.35), width: 1.1 })),
          xmin: 0, xmax: N_EP, ymin: 0, ymax: 1.2, xlabel: '回合数 n', ylabel: title, hlines: hl, pad: { l: 46 },
        });
        G.font = ctx.font(11); G.textAlign = 'right'; G.textBaseline = 'top';
        const xr = w - ax.P.r;
        G.fillStyle = C.series[3]; G.fillText(`虚线 vπ = ${fmt(V_PI, 3)}`, xr, ax.Y(1.17));
        if (!one.covered) { G.fillStyle = C.series[2]; G.fillText(`p = 0 的极限 ${fmt(lim, 3)}`, xr, ax.Y(1.17) + 14); }
      },
    });
    panel(left, 'U', '普通估计 Uₙ'); panel(right, 'M', '加权估计 Mₙ');
    ctx.stage.append(read, st.node);

    const sd = (arr) => { const xs = arr.filter(Number.isFinite), m = xs.reduce((s, x) => s + x, 0) / xs.length; return [m, Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, xs.length - 1))]; };
    function show() {
      const one = onePoint(p), w = weights(p), ex = exactWeighted(p);
      const [mu, su] = sd(data.map((r) => r.U[N_EP - 1])), [mm, sm] = sd(data.map((r) => r.M[N_EP - 1]));
      read.innerHTML = (one.covered
        ? `覆盖成立。一回合 ρG 的方差 <b>${fmt(one.var, 3)}</b>；n = ${N_EP} 时普通估计的标准差理论值 ${fmt(Math.sqrt(one.var / N_EP), 3)}`
        : `p = 0，覆盖不成立：数据里没有左路，普通估计收敛到 <b>${fmt(one.mean, 3)}</b>，加权估计收敛到 <b>${fmt(V_UP, 3)}</b>，都不是 v<sub>π</sub> = ${fmt(V_PI, 3)}`) +
        `<br>第 ${N_EP} 回合，${N_RUNS} 条序列：普通 均值 ${fmt(mu, 3)}、标准差 <b>${fmt(su, 3)}</b>；加权 均值 ${fmt(mm, 3)}、标准差 <b>${fmt(sm, 3)}</b>`;
      st.set([
        ['两路的权重 $ρ = π/b$（S7 以后两策略相同，比率只看首动作）', { html: ctx.m(`ρ_左 = .2/${fmt(p, 2)} = `) + `<b>${p > 0 ? fmt(w.L, 3) : '无定义（没有样本）'}</b>` + ctx.m(`，ρ_上 = .8/${fmt(1 - p, 2)} = `) + `<b>${fmt(w.U, 3)}</b>` }],
        ['普通估计的期望 $E_b[ρG] = p ρ_左 g_L + (1−p) ρ_上 · 9/19$', p > 0 ? { html: ctx.m('.2 × .9^5 + .8 × 9/19 = ') + `<b>${fmt(V_PI, 4)}</b>` } : { html: ctx.m('0 + .8 × 9/19 = ') + `<b>${fmt(one.mean, 4)}</b>，少了 ` + ctx.m('.2 g_L ≈ .118') }],
        ['一回合的方差 $Var_b(ρG) = .04 g_L^2/p + .64 m_↑/(1−p) − v_π^2$，$m_↑ = .081/.271$', p > 0 ? { html: ctx.m(`.04(${fmt(GL * GL, 4)})/${fmt(p, 2)} + .64(${fmt(M_UP, 4)})/${fmt(1 - p, 2)} − ${fmt(V_PI, 4)}^2 = `) + `<b>${fmt(one.var, 4)}</b>` } : '左路无样本，此式不适用'],
        ['加权估计 $M_1 = G$（单回合时权重约掉），对全部可能记录精确求和', { html: ctx.m(`偏差 ${fmt(ex.M1.bias, 4)}，方差 ${fmt(ex.M1.var, 4)}，均方误差 `) + `<b>${fmt(ex.M1.mse, 4)}</b>` }],
        ['$M_2$：两回合，同路取平均，一上一左按权重平均', { html: ctx.m(`偏差 ${fmt(ex.M2.bias, 4)}，方差 ${fmt(ex.M2.var, 4)}，均方误差 `) + `<b>${fmt(ex.M2.mse, 4)}</b>` + (p > 0 ? ctx.m(`；普通 U_2 的均方误差 ${fmt(one.var / 2, 4)}`) : '') }],
      ], `计算过程　p = ${fmt(p, 2)}`);
    }
    show();
  });
})();
