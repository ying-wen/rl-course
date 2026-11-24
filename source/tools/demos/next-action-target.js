/* 第 6 章：同一条转移 S7 →(↑,0) S4 上三种一步目标随 ε 的变化（6.2 节 Expected Sarsa 算例、6.3 节三种目标）。
 * S4 的 Q（上、右、下、左）= (.5, .1, .2, .7)，γ = .9，奖励 0；行为 b_Q 是对这一行的 ε-贪心。 */
(() => {
  const Q4 = [0.5, 0.1, 0.2, 0.7], GAMMA = 0.9, NAMES = ['上', '右', '下', '左'];
  function rng(seed = 1) {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return r;
  }
  /* ε-贪心：最大动作（向左）得 1−ε+ε/4，其余各 ε/4 */
  const probs = (eps) => Q4.map((q, i) => (i === 3 ? 1 - eps + eps / 4 : eps / 4));
  function targets(eps) {
    const b = probs(eps), y = Q4.map((q) => GAMMA * q);
    const mean = b.reduce((s, p, i) => s + p * y[i], 0), m2 = b.reduce((s, p, i) => s + p * y[i] * y[i], 0);
    const avg = Q4.reduce((s, q) => s + q, 0) / 4;
    return { b, y, sarsaMean: mean, sarsaVar: m2 - mean * mean, m2, exp: mean, q: GAMMA * Math.max(...Q4), gap: GAMMA * eps * (Math.max(...Q4) - avg), avg };
  }
  function sample(R, eps) { const b = probs(eps); let u = R(), i = 0; while (i < 3 && u >= b[i]) { u -= b[i]; i++; } return i; }
  const model = { Q4, GAMMA, rng, probs, targets, sample };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('next-action-target', (ctx) => {
    ctx.stage.style.textAlign = 'left'; // 页面正文两端对齐，计算过程里的长说明会被拉开字距
    const { fmt } = ctx;
    let eps = 0.2, R = ctx.rng(7), draws = [], last = -1;
    const epsS = ctx.slider({ label: 'ε', min: 0, max: 1, step: 0.01, value: eps, format: (x) => fmt(x, 2), oninput: (x) => { eps = x; draws = []; last = -1; ctx.redraw(); show(); } });
    const draw = (n) => { for (let i = 0; i < n; i++) { last = sample(R, eps); draws.push(GAMMA * Q4[last]); } ctx.redraw(); show(); };
    const b1 = ctx.button('抽 1 个 A′', () => draw(1), true), b100 = ctx.button('抽 100 个', () => draw(100));
    const bClr = ctx.button('清空', () => { draws = []; last = -1; R = ctx.rng(7); ctx.redraw(); show(); });
    const read = ctx.readout(), st = ctx.steps();
    ctx.stage.append(ctx.row(b1, b100, bClr), ctx.row(epsS.node));
    const lo = 0, hi = 0.7;
    ctx.canvas({
      aspect: 0.3, maxHeight: 170, minHeight: 140, label: '四个可能的 Sarsa 目标、Expected Sarsa 与 Q-learning 目标在数轴上的位置',
      draw(G, w, h) {
        const C = ctx.colors(), T = targets(eps), L = 24, Rr = w - 16, X = (v) => L + ((v - lo) / (hi - lo)) * (Rr - L), y0 = h * 0.5;
        G.strokeStyle = C.rule; G.beginPath(); G.moveTo(L, y0); G.lineTo(Rr, y0); G.stroke();
        G.font = ctx.font(11); G.fillStyle = C.muted; G.textAlign = 'center'; G.textBaseline = 'top';
        for (let v = 0; v <= 0.7001; v += 0.1) { G.fillRect(X(v), y0 - 3, 1, 6); G.fillText(fmt(v, 1), X(v), y0 + 30); }
        const counts = [0, 0, 0, 0]; draws.forEach((y) => counts[Q4.findIndex((q) => Math.abs(GAMMA * q - y) < 1e-9)]++);
        T.y.forEach((y, i) => {
          const r = 4 + 22 * Math.sqrt(T.b[i]);
          G.beginPath(); G.arc(X(y), y0, r, 0, 2 * Math.PI);
          G.fillStyle = ctx.mix(C.series[0], C.bg, i === last ? 0.2 : 0.65); G.fill(); G.strokeStyle = C.series[0]; G.lineWidth = i === last ? 2.5 : 1; G.stroke();
          G.fillStyle = C.ink; G.textBaseline = 'bottom'; G.fillText(`${NAMES[i]} ${fmt(T.b[i], 3)}`, X(y), y0 - r - 3);
          if (draws.length) { G.fillStyle = C.muted; G.textBaseline = 'top'; G.fillText(`×${counts[i]}`, X(y), y0 + 14); }
        });
        const mark = (v, col, txt, up) => {
          G.strokeStyle = col; G.lineWidth = 2.5; G.beginPath(); G.moveTo(X(v), y0 - 30); G.lineTo(X(v), y0 + 30); G.stroke();
          G.fillStyle = col; G.textBaseline = up ? 'top' : 'bottom'; G.fillText(txt, X(v), up ? 2 : h - 2);
        };
        mark(T.exp, C.series[1], `Expected Sarsa ${fmt(T.exp, 4)}`, true);
        mark(T.q, C.series[2], `Q-learning ${fmt(T.q, 2)}`, false);
      },
    });
    ctx.canvas({
      aspect: 0.5, maxHeight: 260, minHeight: 190, label: '三种目标的均值与 Sarsa 目标的标准差随 ε 的变化',
      draw(G, w, h) {
        const C = ctx.colors(), xs = Array.from({ length: 101 }, (_, i) => i / 100), Ts = xs.map(targets);
        const ax = ctx.plot(G, w, h, {
          series: [
            { data: xs.map((x, i) => [x, Ts[i].sarsaMean + Math.sqrt(Ts[i].sarsaVar)]), color: C.series[0], width: 1, dash: [3, 3] },
            { data: xs.map((x, i) => [x, Ts[i].sarsaMean - Math.sqrt(Ts[i].sarsaVar)]), color: C.series[0], width: 1, dash: [3, 3] },
            { data: xs.map((x, i) => [x, Ts[i].exp]), color: C.series[1], width: 2.2 },
            { data: xs.map((x, i) => [x, Ts[i].q]), color: C.series[2], width: 2.2 },
          ],
          xmin: 0, xmax: 1, ymin: 0.2, ymax: 0.75, xlabel: 'ε', ylabel: '目标 Y', pad: { l: 46 },
        });
        const x = ax.X(eps);
        G.save(); G.strokeStyle = C.muted; G.setLineDash([2, 3]); G.beginPath(); G.moveTo(x, ax.P.t); G.lineTo(x, ax.Y(ax.ymin)); G.stroke(); G.restore();
        if (draws.length) { const mu = draws.reduce((s, v) => s + v, 0) / draws.length; G.fillStyle = C.series[0]; G.beginPath(); G.arc(x, ax.Y(mu), 4, 0, 2 * Math.PI); G.fill(); }
      },
    });
    ctx.stage.append(ctx.legend([['var(--d2)', 'Expected Sarsa（= Sarsa 目标的均值）'], ['var(--d1)', 'Sarsa：均值 ± 1 个标准差；圆点为已抽样本的平均'], ['var(--d3)', 'Q-learning：R + γ max']]), read, st.node);

    function show() {
      const T = targets(eps), n = draws.length, mu = n ? draws.reduce((s, v) => s + v, 0) / n : NaN;
      read.innerHTML = `ε = ${fmt(eps, 2)}：Sarsa 目标均值 <b>${fmt(T.sarsaMean, 4)}</b>、方差 <b>${fmt(T.sarsaVar, 4)}</b>；Expected Sarsa <b>${fmt(T.exp, 4)}</b>（方差 0）；Q-learning <b>${fmt(T.q, 2)}</b>（方差 0）` +
        (n ? `<br>已抽 ${n} 个 A′，Sarsa 目标的样本平均 <b>${fmt(mu, 4)}</b>` : '');
      const bs = T.b.map((p) => fmt(p, 3));
      st.set([
        ['行为 $b_Q$：对 S4 一行 $(.5,.1,.2,.7)$ 作 ε-贪心，最大的是向左', { html: ctx.m(`b_Q = (${bs.join(', ')})`) }],
        ['Sarsa：$Y = R + γ Q(S′,A′)$，$A′ ∼ b_Q$；四种取值', { html: ctx.m(`Y ∈ {${T.y.map((y) => fmt(y, 2)).join(', ')}}`) + (last >= 0 ? `，本次 A′ = ${NAMES[last]}，Y = <b>${fmt(T.y[last], 2)}</b>` : '') }],
        ['Expected Sarsa：$Y = R + γ Σ_c b_Q(c) Q(S′,c)$', { html: ctx.m(`.9 × [${bs[0]}(.5) + ${bs[1]}(.1) + ${bs[2]}(.2) + ${bs[3]}(.7)] = `) + `<b>${fmt(T.exp, 4)}</b>` }],
        ['Sarsa 目标的方差：$γ^2 (Σ_c b_Q(c) Q(S′,c)^2 − (Σ_c b_Q(c) Q(S′,c))^2)$', { html: ctx.m(`${fmt(T.m2, 4)} − ${fmt(T.sarsaMean, 4)}^2 = `) + `<b>${fmt(T.sarsaVar, 4)}</b>` }],
        ['Q-learning：$Y = R + γ max_c Q(S′,c)$，与 ε 无关', { html: ctx.m('.9 × .7 = ') + `<b>${fmt(T.q, 2)}</b>` }],
        ['两者之差：$γ ε (max_c Q − 均值_c Q)$', { html: ctx.m(`.9 × ${fmt(eps, 2)} × (.7 − ${fmt(T.avg, 3)}) = `) + `<b>${fmt(T.gap, 4)}</b>` }],
      ], `计算过程　S7 →(↑, 0) S4，ε = ${fmt(eps, 2)}`);
    }
    show();
  });
})();
