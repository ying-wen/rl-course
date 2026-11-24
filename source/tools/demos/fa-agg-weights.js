/* 第 9 章：状态聚合下，分组与状态权重怎样决定 MC 解与 TD 固定点（9.1 节加权价值误差、9.2 节“起点分布决定解”、9.3 节“表示与停点”）。
 * 19 状态随机游走，真值 s/10 − 1，访问分布 μ(s) = min(s, 20 − s)/100；γ = 1，两端终止。
 * 状态权重 d = (1 − c)μ + c·(1/19)。MC：组内 d 加权的真值均值；TD：解 Aw = b，
 * A = Σ_s d(s)x(s)[x(s) − E x(S′)]ᵀ，b = Σ_s d(s)x(s)E[R | s]。
 * 正文：三组 μ 下右组 17/30 与 1/7，VE .03013 与 .10557；均匀权重下 .65 与 1/2；五组 .0101 与 .0690。 */
(() => {
  const N = 19;
  const truth = (s) => s / 10 - 1;
  const mu = Array.from({ length: N }, (_, i) => Math.min(i + 1, 19 - i) / 100);
  const GROUPS = { g3: [6, 7, 6], g5: [4, 4, 3, 4, 4], g1: [19], tab: Array(19).fill(1) };
  function groupOf(sizes) { const g = []; sizes.forEach((n, j) => { for (let i = 0; i < n; i++) g.push(j); }); return g; }
  const weights = (c) => mu.map((m) => (1 - c) * m + c / N);
  function mc(sizes, d) {
    const g = groupOf(sizes), num = Array(sizes.length).fill(0), den = Array(sizes.length).fill(0);
    for (let i = 0; i < N; i++) { num[g[i]] += d[i] * truth(i + 1); den[g[i]] += d[i]; }
    return num.map((x, j) => x / den[j]);
  }
  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  function td(sizes, d) {
    const g = groupOf(sizes), n = sizes.length, A = Array.from({ length: n }, () => Array(n).fill(0)), b = Array(n).fill(0);
    for (let i = 0; i < N; i++) {
      const j = g[i]; A[j][j] += d[i];
      for (const nb of [i - 1, i + 1]) {
        if (nb < 0) b[j] += d[i] * 0.5 * -1;
        else if (nb >= N) b[j] += d[i] * 0.5 * 1;
        else A[j][g[nb]] -= d[i] * 0.5;
      }
    }
    return solve(A, b);
  }
  function ve(sizes, w, d) { const g = groupOf(sizes); let e = 0; for (let i = 0; i < N; i++) e += d[i] * (w[g[i]] - truth(i + 1)) ** 2; return e; }

  const model = { N, truth, mu, GROUPS, groupOf, weights, mc, td, ve };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('fa-agg-weights', (ctx) => {
    const { el, fmt } = ctx;
    const NAMES = { g3: '3 组（6、7、6）', g5: '5 组（4、4、3、4、4）', g1: '1 组', tab: '表格（19 组）' };
    let key = 'g3', c = 0;
    const SHORT = { g3: '3 组', g5: '5 组', g1: '1 组', tab: '表格' };
    const seg = ctx.segmented(Object.keys(GROUPS).map((k) => [k, SHORT[k]]), key, (k) => { key = k; ctx.redraw(); show(); }, '分组');
    const cS = ctx.slider({ label: '起点权重：0 为访问分布 μ，1 为均匀', min: 0, max: 1, step: 0.05, value: c, format: (x) => x.toFixed(2), oninput: (x) => { c = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps(), top = el('div'), bot = el('div');
    ctx.stage.append(ctx.row(seg.node), top, bot, ctx.row(cS.node), read, stepsBox.node);
    const PAD = { l: 44, r: 10 };
    const sol = () => { const d = weights(c), s = GROUPS[key]; return { d, s, g: groupOf(s), wm: mc(s, d), wt: td(s, d) }; };
    const bounds = (s) => { const out = []; let acc = 0; for (const n of s.slice(0, -1)) { acc += n; out.push(acc + 0.5); } return out; };
    const stepSeries = (g, w) => g.flatMap((j, i) => [[i + 0.5, w[j]], [i + 1.5, w[j]], [i + 1.5, NaN]]);
    /* 上图：灰虚线是真值，两条阶梯是 MC 投影与 TD 固定点，竖虚线是组的边界 */
    ctx.canvas({
      parent: top, aspect: 0.5, maxHeight: 320, minHeight: 220, label: '19 个状态的真值、MC 解与 TD 固定点',
      draw(G, w, h) {
        const C = ctx.colors(), { s, g, wm, wt } = sol();
        const P = ctx.plot(G, w, h, {
          series: [
            { data: Array.from({ length: N }, (_, i) => [i + 1, truth(i + 1)]), color: C.muted, dash: [5, 4], width: 1.4 },
            { data: stepSeries(g, wm), color: C.series[0], width: 2.6 },
            { data: stepSeries(g, wt), color: C.series[1], width: 2.6 },
          ],
          xmin: 0.5, xmax: 19.5, ymin: -1, ymax: 1, xlabel: '状态 s', ylabel: 'v̂(s)', pad: PAD,
        });
        G.strokeStyle = C.line; G.setLineDash([3, 3]);
        for (const x of bounds(s)) { G.beginPath(); G.moveTo(P.X(x), P.Y(1)); G.lineTo(P.X(x), P.Y(-1)); G.stroke(); }
        G.setLineDash([]);
      },
    });
    top.append(ctx.legend([['var(--muted)', '真值 s/10 − 1'], ['var(--d1)', 'MC 解（组内加权均值）'], ['var(--d2)', 'TD 固定点']]));
    /* 下图：各状态的权重 d(s)，浅色是访问分布 μ 作参照 */
    ctx.canvas({
      parent: bot, aspect: 0.16, maxHeight: 110, minHeight: 80, label: '各状态的权重',
      draw(G, w, h) {
        const C = ctx.colors(), d = weights(c), X0 = PAD.l, X1 = w - PAD.r, bw = (X1 - X0) / N, top0 = 6, base = h - 16;
        const sc = (base - top0) / 0.1;
        for (let i = 0; i < N; i++) {
          G.fillStyle = C.line; G.fillRect(X0 + i * bw + 2, base - mu[i] * sc, bw - 4, mu[i] * sc);
          G.fillStyle = C.accent; G.fillRect(X0 + i * bw + bw * 0.3, base - d[i] * sc, bw * 0.4, d[i] * sc);
        }
        G.fillStyle = C.muted; G.font = ctx.font(11); G.textAlign = 'right'; G.textBaseline = 'middle'; G.fillText('d(s)', X0 - 6, (top0 + base) / 2);
        G.textAlign = 'center'; G.textBaseline = 'top'; for (const s of [1, 10, 19]) G.fillText(String(s), X0 + (s - 0.5) * bw, base + 2);
      },
    });
    bot.append(ctx.legend([['var(--accent)', '当前权重 d(s)'], ['var(--line)', '访问分布 μ(s)']]));

    const f3 = (x) => fmt(x, 3), f4 = (x) => fmt(x, 4), f5 = (x) => fmt(x, 5);
    function show() {
      const { d, s, g, wm, wt } = sol(), vm = ve(s, wm, d), vt = ve(s, wt, d), J = s.length - 1;
      read.innerHTML = `右组 MC <b>${f4(wm[J])}</b>，TD <b>${f4(wt[J])}</b>　VE<sub>d</sub>：MC <b>${f5(vm)}</b>，TD <b>${f5(vt)}</b>` +
        (vm > 1e-12 ? `，比值 <b>${fmt(vt / vm, 2)}</b>` : '') + '　（γ = 1 的回合任务，9.3 节的误差界不适用）';
      const first = N - s[J], idx = Array.from({ length: s[J] }, (_, i) => first + i);
      const sumD = idx.reduce((x, i) => x + d[i], 0), sumDV = idx.reduce((x, i) => x + d[i] * truth(i + 1), 0);
      const left = first === 0 ? -1 : wt[g[first - 1]], dl = d[first], dr = d[N - 1];
      const L = [];
      L.push([`右组是状态 ${first + 1}–19，权重 $d=(1−c)μ+c/19$，c = ${fmt(c, 2)}`, `Σ_{s∈B}d(s) = ${f4(sumD)}`]);
      L.push(['MC：组内真值按 $d$ 加权平均', { html: ctx.m(`w_B = Σ d(s)v_π(s) / Σ d(s) = ${f5(sumDV)} / ${f4(sumD)} = `) + `<b>${f4(wm[J])}</b>` }]);
      L.push([`TD：组内转移的目标就是 $w_B$，误差为零；只剩从 ${first + 1} 向左（目标 ${first === 0 ? '−1' : '左邻组的预测'}）与从 19 向右（目标 +1）`, `d(${first + 1})·½(${first === 0 ? '−1' : f4(left)} − w_B) + d(19)·½(1 − w_B) = 0`]);
      const lv = first === 0 ? '(−1)' : f4(left);
      L.push(['解出', `w_B = [d(${first + 1})·w_{左} + d(19)·1] / [d(${first + 1}) + d(19)]`]);
      L.push(['代入', { html: ctx.m(`w_B = (${f5(dl)}×${lv} + ${f5(dr)}) / ${f5(dl + dr)} = `) + `<b>${f4(wt[J])}</b>` }]);
      L.push(['加权价值误差', `VE_d(w) = Σ_s d(s)[v̂(s,w) − v_π(s)]^2：MC ${f5(vm)}，TD ${f5(vt)}`]);
      stepsBox.set(L, `计算过程　${NAMES[key]}，右组`);
    }
    show();
  });
})();
