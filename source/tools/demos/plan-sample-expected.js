/* 第 8 章：样本更新与期望更新的计算—误差取舍（8.3 节“样本更新与期望更新”，原书第二版图 8.7）。
 * 分支因子 b、b 个等概率后继：t 次样本平均的均方根误差 √((b−1)/(bt))，期望更新算满 b 次才完成，完成时误差为 0。
 * 泥地 b = 2：模型 p̂ = .2，Y ∈ {1, .45}，模型均值 .56、方差 .0484；真实均值 .505，模型偏差 .055；
 * 相对真实均值，K 个样本平均的均方误差 .055² + .0484/K，K = 2 时 .0272，完整期望 .003025。 */
(() => {
  const sampleRMS = (b, t) => (t <= 0 ? 1 : Math.sqrt((b - 1) / (b * t)));
  const expectedRMS = (b, t) => (t < b ? 1 : 0);
  /* b 个后继值：零均值、按 b−1 归一的样本方差为 1，于是 t 次有放回抽样平均的均方根误差正是 √((b−1)/(bt))。 */
  function successors(b, r) {
    const y = Array.from({ length: b }, () => r() - 0.5), m = y.reduce((a, x) => a + x, 0) / b;
    const s = Math.sqrt(y.reduce((a, x) => a + (x - m) ** 2, 0) / (b - 1));
    return y.map((x) => (x - m) / s);
  }
  function simulate(b, runs, T, r) {
    const y = successors(b, r), se = new Float64Array(T + 1); se[0] = runs;
    for (let n = 0; n < runs; n++) { let sum = 0; for (let t = 1; t <= T; t++) { sum += y[Math.floor(r() * b)]; se[t] += (sum / t) ** 2; } }
    return Array.from(se, (x) => Math.sqrt(x / runs));
  }
  const MUD = { ph: 0.2, hi: 1, lo: 0.45, q0: 0.4, trueMean: 0.1 * 1 + 0.9 * 0.45 };
  MUD.mean = MUD.ph * MUD.hi + (1 - MUD.ph) * MUD.lo;
  MUD.var = MUD.ph * (1 - MUD.ph) * (MUD.hi - MUD.lo) ** 2;
  MUD.bias = MUD.mean - MUD.trueMean;
  const mudSampleMSE = (K) => (K <= 0 ? (MUD.q0 - MUD.trueMean) ** 2 : MUD.bias ** 2 + MUD.var / K);
  const mudExpectedMSE = (K) => (K < 2 ? (MUD.q0 - MUD.trueMean) ** 2 : MUD.bias ** 2);
  function simulateMud(runs, T, r) {
    const se = new Float64Array(T + 1); se[0] = runs * mudSampleMSE(0);
    for (let n = 0; n < runs; n++) { let sum = 0; for (let t = 1; t <= T; t++) { sum += r() < MUD.ph ? MUD.hi : MUD.lo; se[t] += (sum / t - MUD.trueMean) ** 2; } }
    return Array.from(se, (x) => x / runs);
  }
  const model = { sampleRMS, expectedRMS, successors, simulate, MUD, mudSampleMSE, mudExpectedMSE, simulateMud };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('plan-sample-expected', (ctx) => {
    const { el, fmt } = ctx;
    let mode = '100', t = 0.5, seed = 3, sim = null;
    const isMud = () => mode === 'mud', b = () => +mode;
    function resim() {
      const r = ctx.rng(seed);
      sim = isMud() ? simulateMud(2000, 10, r) : simulate(b(), b() >= 1000 ? 150 : 300, 2 * b(), r);
      ctx.redraw(); show();
    }
    const seg = ctx.segmented([['2', 'b = 2'], ['10', 'b = 10'], ['100', 'b = 100'], ['1000', 'b = 1000'], ['mud', '泥地（模型有偏）']], mode, (v) => { mode = v; tS.value = isMud() ? 0.4 : 0.5; t = tS.value; resim(); }, '分支因子');
    const tS = ctx.slider({ label: '计算预算', min: 0, max: 2, step: 0.05, value: t, format: (x) => (isMud() ? `${Math.round(x * 5)} 次` : `${x.toFixed(2)} b`), oninput: (x) => { t = x; ctx.redraw(); show(); } });
    const reBtn = ctx.button('重新模拟', () => { seed++; resim(); });
    const read = ctx.readout(), stepsBox = ctx.steps(), box = el('div');
    ctx.stage.append(ctx.row(seg.node), box, ctx.row(tS.node, reBtn), read, stepsBox.node);
    const comps = () => (isMud() ? Math.round(t * 5) : Math.round(t * b()));
    ctx.canvas({
      parent: box, aspect: 0.5, maxHeight: 320, minHeight: 220, label: '样本更新与期望更新的误差随计算次数的变化',
      draw(G, w, h) {
        const C = ctx.colors();
        let P;
        if (isMud()) {
          const Ks = Array.from({ length: 11 }, (_, i) => i);
          P = ctx.plot(G, w, h, {
            series: [
              { data: Ks.map((K) => [K, mudExpectedMSE(K)]), color: C.series[1], width: 2.4 },
              { data: Ks.slice(1).map((K) => [K, mudSampleMSE(K)]).concat([]), color: C.series[0], width: 2.4 },
              { data: sim.map((x, K) => [K, x]).slice(1), color: C.muted, dash: [3, 3], width: 1.4 },
            ],
            xmin: 0, xmax: 10, ymin: 0, ymax: 0.06, xlabel: '计算次数 K（抽样或求和项）', ylabel: 'MSE', pad: { l: 52 },
            hlines: [{ y: MUD.bias ** 2, label: '模型偏差² .003025' }],
          });
        } else {
          const B = b(), xs = Array.from({ length: 201 }, (_, i) => (i / 100) * B);
          P = ctx.plot(G, w, h, {
            series: [
              { data: xs.map((x) => [x / B, expectedRMS(B, x)]), color: C.series[1], width: 2.4 },
              { data: xs.map((x) => [x / B, sampleRMS(B, Math.floor(x))]), color: C.series[0], width: 2.4 },
              { data: sim.map((x, i) => [i / B, x]), color: C.muted, dash: [3, 3], width: 1.4 },
            ],
            xmin: 0, xmax: 2, ymin: 0, ymax: 1.05, xlabel: '计算次数（以 b 为单位）', ylabel: '均方根误差',
          });
        }
        G.strokeStyle = C.ink; G.setLineDash([3, 3]); const x = isMud() ? comps() : t;
        G.beginPath(); G.moveTo(P.X(x), P.Y(P.ymax)); G.lineTo(P.X(x), P.Y(P.ymin)); G.stroke(); G.setLineDash([]);
      },
    });
    box.append(ctx.legend([['var(--d1)', '样本更新（公式）'], ['var(--muted)', '样本更新（模拟）'], ['var(--d2)', '期望更新']]));

    function show() {
      const n = comps();
      if (isMud()) {
        const s = mudSampleMSE(n), e = mudExpectedMSE(n);
        read.innerHTML = `K = <b>${n}</b>：样本更新 MSE <b>${fmt(s, 4)}</b>（模拟 ${fmt(sim[n], 4)}，2000 次），期望更新 MSE <b>${fmt(e, 6)}</b>`;
        stepsBox.set([
          ['模型给出的两种后果', `Y = 1（p̂ = .2）或 .9×.5 = .45；m̂ = .2×1 + .8×.45 = ${fmt(MUD.mean, 3)}，Var_{p̂}(Y) = .2×.8×.55^2 = ${fmt(MUD.var, 4)}`],
          ['真实均值（真实 $p=.1$）', `.1×1 + .9×.45 = ${fmt(MUD.trueMean, 3)}，模型偏差 ${fmt(MUD.mean, 3)} − ${fmt(MUD.trueMean, 3)} = ${fmt(MUD.bias, 3)}`],
          ['$K$ 个样本平均', n ? { html: ctx.m(`MSE = .055^2 + Var/K = .003025 + ${fmt(MUD.var, 4)}/${n} = `) + `<b>${fmt(s, 4)}</b>` } : `K = 0：仍是初值 Q(S4,↑) = .4，MSE = (.4 − .505)^2 = ${fmt(s, 6)}`],
          ['完整期望（$b=2$ 次计算）', n >= 2 ? { html: ctx.m('MSE = .055^2 = ') + '<b>.003025</b>' + '，偏差来自模型，求和消不掉' } : `计算不足 2 次，完整期望尚未完成，MSE = ${fmt(e, 6)}`],
        ], `计算过程　泥地 S4 向上，K = ${n}`);
      } else {
        const B = b(), s = sampleRMS(B, n), e = expectedRMS(B, n);
        read.innerHTML = `b = <b>${B}</b>，计算 <b>${n}</b> 次：样本更新误差 <b>${fmt(s, 4)}</b>（模拟 ${fmt(sim[Math.min(n, sim.length - 1)], 4)}），期望更新误差 <b>${e}</b>` + (n < B ? '（尚未算完）' : '');
        stepsBox.set([
          ['$t$ 次抽样平均，后继值的样本方差取 1', n ? { html: ctx.m(`√((b − 1)/(bt)) = √(${B - 1}/(${B}×${n})) = `) + `<b>${fmt(s, 4)}</b>` } : 't = 0：尚未更新，误差 1'],
          ['期望更新要对 $b$ 个后继各算一次', n >= B ? { html: `${n} ≥ ${B}，已完成，误差 <b>0</b>` } : `${n} < ${B}，尚未完成，误差仍为 1`],
          ['同样的计算，样本更新可以分给多少个状态动作', `每个状态动作抽 1 次，可改进 ${n} 个；完整期望只能完成 ${Math.floor(n / B)} 个`],
        ], `计算过程　b = ${B}，计算 ${n} 次`);
      }
    }
    resim();
  });
})();
