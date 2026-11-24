/* 第 9 章：同策略线性 TD 固定点的误差界 1/(1−γ²)（9.3 节“同策略线性 TD 固定点的误差界”，两状态循环例）。
 * 确定性循环 s0→s1→s0，离开 s0 得 1，μ = (.5, .5)，单个特征 x(s0) = 1，x(s1) = f（正文 f = 2）。
 * v_π = (1, γ)/(1 − γ²)；最佳近似 w* = (v0 + f v1)/(1 + f²)；A = .5(1 + f² − 2γf)，b0 = .5，w_TD = b0/A。
 * 正文 γ = .9、f = 2：w* ≈ 2.947，min VE ≈ 3.352；A = .7，w_TD = 5/7，VE ≈ 15.818，比值 ≈ 4.72，界 5.26。 */
(() => {
  const MU = [0.5, 0.5];
  function solve(gamma, f) {
    const v0 = 1 / (1 - gamma * gamma), v1 = gamma * v0;
    const wStar = (MU[0] * v0 + MU[1] * f * v1) / (MU[0] + MU[1] * f * f);
    const A = MU[0] * 1 * (1 - gamma * f) + MU[1] * f * (f - gamma), b0 = MU[0] * 1 * 1, wTD = b0 / A;
    const ve = (w) => MU[0] * (v0 - w) ** 2 + MU[1] * (v1 - f * w) ** 2;
    const T = (w) => [1 + gamma * f * w, gamma * w]; // 对 (w, f w) 做一次 Bellman 更新
    const proj = (y) => (MU[0] * y[0] + MU[1] * f * y[1]) / (MU[0] + MU[1] * f * f); // Π_μ 的系数
    return { gamma, f, v0, v1, wStar, A, b0, wTD, veMin: ve(wStar), veTD: ve(wTD), ve, T, proj, bound: 1 / (1 - gamma * gamma) };
  }
  const model = { MU, solve };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('fa-td-bound', (ctx) => {
    const { el, fmt } = ctx;
    let gamma = 0.9, f = 2;
    const gS = ctx.slider({ label: '折扣 γ', min: 0, max: 0.99, step: 0.01, value: gamma, format: (x) => x.toFixed(2), oninput: (x) => { gamma = x; ctx.redraw(); show(); } });
    const fS = ctx.slider({ label: '特征 x(s₁)', min: 0.2, max: 3, step: 0.1, value: f, format: (x) => x.toFixed(1), oninput: (x) => { f = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps(), top = el('div'), bot = el('div');
    ctx.stage.append(top, ctx.row(gS.node, fS.node), bot, read, stepsBox.node);

    /* 上图：价值平面，坐标 (v(s0), v(s1))，两轴同比例，μ 均等时直角就是 μ 加权内积下的直角 */
    ctx.canvas({
      parent: top, aspect: 0.6, maxHeight: 360, minHeight: 240, label: '价值平面上的真值、最佳近似、TD 固定点与它的 Bellman 像',
      draw(G, w, h) {
        const C = ctx.colors(), S = solve(gamma, f);
        const pts = [[0, 0], [S.v0, S.v1], [S.wStar, f * S.wStar], [S.wTD, f * S.wTD], S.T(S.wTD)];
        let x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
        const padv = 0.12 * Math.max(x1 - x0, y1 - y0) + 0.2; x0 -= padv; x1 += padv; y0 -= padv; y1 += padv;
        const sc = Math.min((w - 24) / (x1 - x0), (h - 24) / (y1 - y0)), ox = (w - sc * (x1 - x0)) / 2, oy = (h - sc * (y1 - y0)) / 2;
        const X = (v) => ox + (v - x0) * sc, Y = (v) => h - oy - (v - y0) * sc;
        G.strokeStyle = C.rule; G.lineWidth = 1; G.beginPath(); G.moveTo(X(x0), Y(0)); G.lineTo(X(x1), Y(0)); G.moveTo(X(0), Y(y0)); G.lineTo(X(0), Y(y1)); G.stroke();
        G.font = ctx.font(11); G.fillStyle = C.muted; G.textAlign = 'right'; G.textBaseline = 'bottom';
        G.fillText('v(s₀)', X(x1) - 2, Y(0) - 2); G.textAlign = 'left'; G.textBaseline = 'top'; G.fillText('v(s₁)', X(0) + 4, Y(y1) + 2);
        // 可表示的直线 {(w, f w)}
        const tMax = Math.max(Math.abs(x1), Math.abs(x0), Math.abs(y1 / f), Math.abs(y0 / f)) * 2;
        G.strokeStyle = C.ink; G.lineWidth = 1.6; G.beginPath(); G.moveTo(X(-tMax), Y(-f * tMax)); G.lineTo(X(tMax), Y(f * tMax)); G.stroke();
        const seg = (a, b, col, wd, dash) => { G.strokeStyle = col; G.lineWidth = wd; G.setLineDash(dash || []); G.beginPath(); G.moveTo(X(a[0]), Y(a[1])); G.lineTo(X(b[0]), Y(b[1])); G.stroke(); G.setLineDash([]); };
        const v = [S.v0, S.v1], pv = [S.wStar, f * S.wStar], ft = [S.wTD, f * S.wTD], tf = S.T(S.wTD);
        seg(v, pv, C.series[0], 2.4); seg(v, ft, C.series[1], 1.6, [5, 4]); seg(tf, ft, C.series[2], 1.6, [2, 3]);
        const dot = (p, col, r, label, dx = 8, dy = -8) => { G.fillStyle = col; G.beginPath(); G.arc(X(p[0]), Y(p[1]), r, 0, 7); G.fill(); G.fillStyle = C.ink; G.textAlign = dx < 0 ? 'right' : 'left'; G.textBaseline = 'middle'; G.fillText(label, X(p[0]) + dx, Y(p[1]) + dy); };
        dot(v, C.ink, 5, 'v_π'); dot(pv, C.series[0], 5, 'Π_μ v_π', -8, 0); dot(ft, C.series[1], 5, 'X w_TD', -8, 0); dot(tf, C.series[2], 4, 'T_π X w_TD');
      },
    });
    top.append(ctx.legend([['var(--ink)', '可表示的直线 (w, x(s₁)w)'], ['var(--d1)', '最小误差 v_π − Π_μ v_π'], ['var(--d2)', 'TD 固定点的误差'], ['var(--d3)', '投影回自身 Π_μ T_π X w_TD = X w_TD']]));
    /* 下图：VE(w_TD)/min VE 随 γ 的变化（当前特征），对数纵轴，与两条界对照 */
    ctx.canvas({
      parent: bot, aspect: 0.42, maxHeight: 260, minHeight: 190, label: 'TD 固定点误差与最小误差之比随折扣的变化，以及误差界',
      draw(G, w, h) {
        const C = ctx.colors(), gs = Array.from({ length: 100 }, (_, i) => i / 100);
        const ratio = (g) => { const S = solve(g, f); return S.veMin > 1e-12 ? Math.log10(S.veTD / S.veMin) : NaN; };
        const P = ctx.plot(G, w, h, {
          series: [
            { data: gs.map((g) => [g, Math.log10(1 / (1 - g))]), color: C.muted, dash: [2, 3], width: 1.3 },
            { data: gs.map((g) => [g, Math.log10(1 / (1 - g * g))]), color: C.ink, dash: [6, 4], width: 1.6 },
            { data: gs.map((g) => [g, ratio(g)]), color: C.series[1], width: 2.6 },
          ],
          xmin: 0, xmax: 1, ymin: 0, ymax: 2.2, xlabel: '折扣 γ', ylabel: 'log₁₀ 倍数',
        });
        const r = ratio(gamma);
        if (Number.isFinite(r)) { G.fillStyle = C.series[1]; G.beginPath(); G.arc(P.X(gamma), P.Y(Math.min(2.2, r)), 5, 0, 7); G.fill(); }
      },
    });
    bot.append(ctx.legend([['var(--d2)', 'VE(w_TD)/min VE'], ['var(--ink)', '界 1/(1 − γ²)'], ['var(--muted)', '较松的 1/(1 − γ)']]));

    const f3 = (x) => fmt(x, 3), f4 = (x) => fmt(x, 4);
    function show() {
      const S = solve(gamma, f), ratio = S.veMin > 1e-12 ? S.veTD / S.veMin : NaN;
      read.innerHTML = `min VE = <b>${f3(S.veMin)}</b>，VE(w<sub>TD</sub>) = <b>${f3(S.veTD)}</b>，比值 <b>${Number.isFinite(ratio) ? fmt(ratio, 2) : '—'}</b>，界 1/(1 − γ²) = <b>${fmt(S.bound, 2)}</b>` +
        (Math.abs(f - gamma) < 1e-9 ? '　（x(s₁) = γ 时真值落在直线上，两点重合）' : '');
      const tf = S.T(S.wTD), hyp = S.veTD, leg1 = S.veMin, leg2 = 0.5 * (S.wStar - S.wTD) ** 2 * (1 + f * f);
      stepsBox.set([
        ['真值：确定性循环，离开 $s_0$ 得 1', `v_π(s_0) = 1/(1 − γ^2) = ${f3(S.v0)}，v_π(s_1) = γv_π(s_0) = ${f3(S.v1)}`],
        ['最佳近似（MC 的停点）', `w^* = [.5v_π(s_0) + .5·${fmt(f, 1)}·v_π(s_1)] / (.5 + .5·${fmt(f, 1)}^2) = ${f3(S.wStar)}，min VE_μ = ${f3(S.veMin)}`],
        ['TD 固定点 $Aw=b_0$', `A = .5·1·(1 − γ·${fmt(f, 1)}) + .5·${fmt(f, 1)}·(${fmt(f, 1)} − γ) = ${f4(S.A)}，b_0 = .5，w_{TD} = ${f4(S.wTD)}`],
        ['固定点投影回自身', `T_π Xw_{TD} = (${f3(tf[0])}, ${f3(tf[1])})，Π_μ 后系数 ${f4(S.proj(tf))} = w_{TD}`],
        ['勾股：斜边² = 最小误差 + 平面内一段，后一段至多 $γ^2$ 倍斜边²', `${f3(hyp)} = ${f3(leg1)} + ${f3(leg2)}，${f3(leg2)} ≤ γ^2·${f3(hyp)} = ${f3(gamma * gamma * hyp)}`],
        ['比值与界', { html: ctx.m(`VE_μ(w_{TD})/min VE_μ = ${f3(S.veTD)}/${f3(S.veMin)} = `) + `<b>${Number.isFinite(ratio) ? fmt(ratio, 2) : '—'}</b>` + ctx.m(` ≤ 1/(1 − γ^2) = `) + `<b>${fmt(S.bound, 2)}</b>` }],
      ], `计算过程　γ = ${fmt(gamma, 2)}，x(s₁) = ${fmt(f, 1)}`);
    }
    show();
  });
})();
