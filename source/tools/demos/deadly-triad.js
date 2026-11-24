/* 第 9 章：两状态离策略例上的致命三元组（9.4 节“一个完整的离策略反例”与“去掉一项”）。
 * 任务：a0 总到 s0，a1 总到 s1，奖励恒 0，γ=.9；v̂(s0)=w，v̂(s1)=2w；目标策略总选 a1，
 * 行为策略以 p 选 a0（ρ(a0)=0，ρ(a1)=1/(1−p)），行为平稳分布 (p, 1−p)。
 * 冻结分布下的平均更新倍数：三项都有 1+α(1.2p−.4)；去掉离策略 1−.4α；去掉自举 1−α(4−3p)；
 * 去掉函数逼近 v0⁺=(1−pα)v0+.9pαv1，v1⁺=(1−.1α(1−p))v1。正文取 p=.95、α=.1：1.074、.96、.885、.905 与 .9995。 */
(() => {
  const G = 0.9;
  const VARIANTS = ['triad', 'nooff', 'noboot', 'nofa'];
  /* 一步平均更新；state 是 {w} 或表格 {v0, v1}。 */
  function avgStep(variant, p, a, st) {
    if (variant === 'nofa') {
      const v0 = (1 - p * a) * st.v0 + G * p * a * st.v1, v1 = (1 - 0.1 * a * (1 - p)) * st.v1;
      return { v0, v1 };
    }
    return { w: st.w * gain(variant, p, a) };
  }
  function gain(variant, p, a) {
    if (variant === 'triad') return 1 + a * (1.2 * p - 0.4);
    if (variant === 'nooff') return 1 - 0.4 * a;
    if (variant === 'noboot') return 1 - a * (4 - 3 * p);
    return Math.max(Math.abs(1 - p * a), Math.abs(1 - 0.1 * a * (1 - p))); // 上三角矩阵的谱半径
  }
  const init = (variant) => (variant === 'nofa' ? { v0: 1, v1: 2 } : { w: 1 });
  const vals = (st) => (st.w != null ? [st.w, 2 * st.w] : [st.v0, st.v1]);
  const size = (st) => Math.max(...vals(st).map(Math.abs));
  function run(variant, p, a, K) {
    const out = [init(variant)];
    for (let k = 0; k < K; k++) out.push(avgStep(variant, p, a, out[k]));
    return out;
  }
  /* 按行为策略采一条真实转移并做一次离策略半梯度 TD(0)：w ← w + αρδx(S)。 */
  function sampleStep(p, a, w, s, r) {
    const a0 = r() < p, rho = a0 ? 0 : 1 / (1 - p), s2 = a0 ? 0 : 1;
    const x = s === 0 ? 1 : 2, delta = G * (s2 === 0 ? 1 : 2) * w - x * w;
    return { w: w + a * rho * delta * x, s: s2, rho, delta, x };
  }
  /* 样本轨迹 log|w| 的每步期望增量：只有选 a1（概率 1−p）时更新，起点按 (p, 1−p)。 */
  function expectedLogGrowth(p, a) {
    const rho = 1 / (1 - p);
    return (1 - p) * (p * Math.log(Math.abs(1 + 0.8 * a * rho)) + (1 - p) * Math.log(Math.abs(1 - 0.4 * a * rho)));
  }
  const projection = (p) => (1.8 * (2 - p)) / (4 - 3 * p);

  const model = { G, VARIANTS, avgStep, gain, init, vals, size, run, sampleStep, expectedLogGrowth, projection };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('deadly-triad', (ctx) => {
    const { el, fmt } = ctx;
    const NAMES = { triad: '三项都有', nooff: '去掉离策略', noboot: '去掉自举', nofa: '去掉函数逼近' };
    const COL = { triad: 1, nooff: 0, noboot: 2, nofa: 3 };
    const KMAX = 100;
    let variant = 'triad', p = 0.95, a = 0.1, k = 0, withSample = false, sample = [], R = ctx.rng(5), sState = 0;
    let paths = {};
    function recompute() { for (const v of VARIANTS) paths[v] = run(v, p, a, KMAX); }
    function resetSample() { R = ctx.rng(5); sState = 0; sample = [{ w: 1 }]; for (let i = 0; i < k; i++) pushSample(); }
    function pushSample() { const last = sample[sample.length - 1].w, o = sampleStep(p, a, last, sState, R); sState = o.s; sample.push({ w: o.w }); }
    function reset() { anim.stop(); k = 0; recompute(); resetSample(); ctx.redraw(); show(); }
    function stepOnce() { if (k >= KMAX) return false; k++; if (withSample) pushSample(); ctx.redraw(); show(); return k < KMAX; }

    const vSeg = ctx.segmented(VARIANTS.map((v) => [v, NAMES[v]]), variant, (v) => { variant = v; ctx.redraw(); show(); }, '去掉哪一项');
    const pS = ctx.slider({ label: '行为选 a₀ 的概率 p', min: 0, max: 0.99, step: 0.01, value: p, format: (x) => x.toFixed(2), oninput: (x) => { p = x; recompute(); resetSample(); ctx.redraw(); show(); } });
    const aS = ctx.slider({ label: '步长 α', min: 0.01, max: 0.3, step: 0.01, value: a, format: (x) => x.toFixed(2), oninput: (x) => { a = x; recompute(); resetSample(); ctx.redraw(); show(); } });
    const sChk = ctx.checkbox('叠加一条样本轨迹（三项都有）', withSample, (on) => { withSample = on; resetSample(); ctx.redraw(); show(); });
    const oneBtn = ctx.button('迭代一步', () => { anim.stop(); stepOnce(); }, true);
    const runBtn = ctx.button('连续', () => (anim.running ? anim.stop() : anim.start()));
    const resetBtn = ctx.button('重置', reset);
    let acc = 0;
    const anim = ctx.loop((dt) => { acc += dt * (ctx.reduced() ? 4 : 30); let go = true; while (acc >= 1 && go) { acc -= 1; go = stepOnce(); } return go; });
    anim.onstop = () => (runBtn.textContent = '连续');
    const _st = anim.start; anim.start = () => { if (k >= KMAX) { k = 0; resetSample(); } runBtn.textContent = '暂停'; _st(); };

    const read = ctx.readout(), stepsBox = ctx.steps();
    const top = el('div'), bot = el('div');
    ctx.stage.append(ctx.row(vSeg.node), top, ctx.row(oneBtn, runBtn, resetBtn), ctx.row(pS.node, aS.node, sChk.node), bot, read, stepsBox.node);

    const lg = (x) => Math.log10(Math.max(x, 1e-12));
    /* 上图：精确平均算子迭代 k 次后的 log10 max_s|v̂(s)|，四种情形 */
    ctx.canvas({
      parent: top, aspect: 0.5, maxHeight: 320, minHeight: 210, label: '四种情形下预测幅度随平均更新次数的变化，对数纵轴',
      draw(Gc, w, h) {
        const C = ctx.colors();
        const series = VARIANTS.map((v) => ({ data: paths[v].slice(0, k + 1).map((st, i) => [i, lg(size(st))]), color: C.series[COL[v]], width: v === variant ? 3 : 1.3, dash: v === variant ? null : [5, 3] }));
        if (withSample) series.push({ data: sample.map((st, i) => [i, lg(Math.abs(st.w) * 2)]), color: C.muted, width: 1.2 });
        ctx.plot(Gc, w, h, { series, xmin: 0, xmax: KMAX, ymin: -3, ymax: 3, xlabel: '平均更新次数 k', ylabel: 'log₁₀ max|v̂(s)|', hlines: [{ y: Math.log10(2), label: '初值 2', color: C.faint || C.muted }] });
      },
    });
    top.append(ctx.legend(VARIANTS.map((v) => [`var(--d${COL[v] + 1})`, NAMES[v]]).concat([['var(--muted)', '样本轨迹（勾选后显示）']])));
    /* 下图：一步平均倍数随 p 变化，虚线 1 是收缩与放大的分界 */
    ctx.canvas({
      parent: bot, aspect: 0.42, maxHeight: 260, minHeight: 190, label: '一步平均更新倍数随行为概率 p 的变化',
      draw(Gc, w, h) {
        const C = ctx.colors(), ps = Array.from({ length: 100 }, (_, i) => i / 100);
        const P = ctx.plot(Gc, w, h, {
          series: VARIANTS.map((v) => ({ data: ps.map((q) => [q, gain(v, q, a)]), color: C.series[COL[v]], width: v === variant ? 3 : 1.3 })),
          xmin: 0, xmax: 1, xlabel: '行为策略选 a₀ 的概率 p', ylabel: '倍数', hlines: [{ y: 1, label: '1' }],
        });
        Gc.strokeStyle = C.ink; Gc.setLineDash([3, 3]); Gc.beginPath(); Gc.moveTo(P.X(p), P.Y(P.ymax)); Gc.lineTo(P.X(p), P.Y(P.ymin)); Gc.stroke(); Gc.setLineDash([]);
        for (const v of VARIANTS) { Gc.fillStyle = C.series[COL[v]]; Gc.beginPath(); Gc.arc(P.X(p), P.Y(gain(v, p, a)), v === variant ? 5 : 3.5, 0, 7); Gc.fill(); }
        Gc.fillStyle = C.muted; Gc.font = ctx.font(11); Gc.textAlign = 'center'; Gc.textBaseline = 'top';
        Gc.fillText('p = 1/3', P.X(1 / 3), P.Y(P.ymax) + 2);
        Gc.strokeStyle = C.line; Gc.beginPath(); Gc.moveTo(P.X(1 / 3), P.Y(P.ymax) + 14); Gc.lineTo(P.X(1 / 3), P.Y(P.ymin)); Gc.stroke();
      },
    });

    const f3 = (x) => fmt(x, 3), f4 = (x) => fmt(x, 4);
    function show() {
      const cur = paths[variant][k];
      read.innerHTML = `k = <b>${k}</b>　` + VARIANTS.map((v) => `${NAMES[v]} max|v̂| = <b>${f3(size(paths[v][k]))}</b>`).join('　') +
        (withSample ? `　样本轨迹 |v̂(s₁)| = <b>${f3(Math.abs(sample[k].w) * 2)}</b>（每步期望 Δln|w| = ${f4(expectedLogGrowth(p, a))}）` : '');
      const L = [], bp = 1 - p;
      if (variant === 'nofa') {
        L.push(['两个表项各自一个参数，起点仍按 $μ_b=(p, 1−p)$，目标读 $s_1$ 的表项', `μ_b = (${fmt(p, 2)}, ${fmt(bp, 2)})，v_0 = ${f3(cur.v0)}，v_1 = ${f3(cur.v1)}`]);
        L.push(['在 $s_0$ 更新', `v_0^{+} = (1 − pα)v_0 + 0.9pα·v_1 = ${f4(1 - p * a)}×${f3(cur.v0)} + ${f4(G * p * a)}×${f3(cur.v1)}`]);
        L.push(['在 $s_1$ 更新，$ρ=0.9$，每次只消去误差的 $α(1−0.9)$', `v_1^{+} = (1 − 0.1α(1 − p))v_1 = ${fmt(1 - 0.1 * a * bp, 5)}×${f3(cur.v1)}`]);
        L.push(['两个方向的倍数', { html: ctx.m(`1 − pα = `) + `<b>${f4(1 - p * a)}</b>` + ctx.m('，1 − 0.1α(1 − p) = ') + `<b>${fmt(1 - 0.1 * a * bp, 5)}</b>` }]);
      } else {
        const w = cur.w;
        if (variant === 'triad') {
          L.push(['两处一步目标都沿 $a_1$ 读 $s_1$', `U = 0 + γv̂(s_1) = 0.9×2w = ${f3(1.8 * w)}`]);
          L.push(['起点 $s_0$：(目标 − 预测) × 特征 × 频率', `(1.8w − w)×1×p = ${f3(0.8 * w)}×${fmt(p, 2)} = ${f4(0.8 * w * p)}`]);
          L.push(['起点 $s_1$', `(1.8w − 2w)×2×(1 − p) = ${f3(-0.4 * w)}×${fmt(bp, 2)} = ${f4(-0.4 * w * bp)}`]);
          L.push(['平均修正 $E_b[ρδx] = −A_b w$', `(1.2p − 0.4)w = ${f4(1.2 * p - 0.4)}×${f3(w)}，A_b = 0.4 − 1.2p = ${f3(0.4 - 1.2 * p)}`]);
          L.push(['同一处做一次精确投影', `w̃/w = 1.8(2 − p)/(4 − 3p) = ${f3(projection(p))}`]);
        } else if (variant === 'nooff') {
          L.push(['按目标策略采样，起点全在 $s_1$，$ρ=0.9×2/2=0.9$', `U = 0.9×2w，(U − 2w)×2 = −0.4w = ${f4(-0.4 * w)}`]);
        } else {
          L.push(['目标是真实回报 0，不随 $w$ 动', `p(0 − w)×1 + (1 − p)(0 − 2w)×2 = −(4 − 3p)w = ${f4(-(4 - 3 * p) * w)}`]);
        }
        const g = gain(variant, p, a);
        L.push(['一步平均更新', { html: ctx.m(`w^{+} = w + α×（平均修正） = ${f3(w)}×${f4(g)} = `) + `<b>${f4(w * g)}</b>` + (g > 1 ? '　倍数大于 1，幅度放大' : '　倍数小于 1，幅度收缩') }]);
      }
      stepsBox.set(L, `计算过程　${NAMES[variant]}，p = ${fmt(p, 2)}，α = ${fmt(a, 2)}，第 ${k} 次之后`);
    }
    reset();
  });
})();
