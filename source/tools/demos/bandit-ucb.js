/* 第 2 章：UCB 与 ε-贪心的单次运行，逐步看各臂的 Q_t(a)、探索加成 c√(ln t/N_t(a)) 与增量更新。
 * 对应 2.4 节“选择分数”与算法 2.2：抓取例 q* = (.4, .6)、Bernoulli 奖励，从章首记录（A 4 次 3 成，
 * B 2 次 1 成，t = 6）或从零开始；另有十臂试验台（2.3 节）。ε-贪心按算法 2.1，步长可选 1/n 或常数 α = .1。 */
(() => {
  const ENVS = {
    record: { label: '章首记录', q: [0.4, 0.6], names: ['A', 'B'], bern: true, Q: [0.75, 0.5], N: [4, 2] },
    zero: { label: '两臂从零开始', q: [0.4, 0.6], names: ['A', 'B'], bern: true, Q: [0, 0], N: [0, 0] },
    ten: { label: '十臂试验台', m: 10 },
  };

  function rng(seed = 1) { // mulberry32，与 ctx.rng 相同
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = () => {
      let u = 0;
      while (u === 0) u = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
    };
    return r;
  }

  function init(envKey, rnd) {
    const E = ENVS[envKey];
    if (E.m) {
      const q = Array.from({ length: E.m }, () => rnd.normal());
      return { env: envKey, q, names: q.map((_, i) => String(i + 1)), bern: false, Q: q.map(() => 0), N: q.map(() => 0), t: 0, regret: 0, hist: [[0, 0]], last: null };
    }
    const t = E.N.reduce((a, b) => a + b, 0);
    return { env: envKey, q: E.q.slice(), names: E.names, bern: true, Q: E.Q.slice(), N: E.N.slice(), t, t0: t, regret: 0, hist: [[t, 0]], last: null };
  }

  /* 在 vals 的最大者中均匀抽一个（并列时随机）。 */
  function argmaxRand(vals, rnd) {
    let top = -Infinity, cnt = 0, pick = 0;
    vals.forEach((v, i) => { if (v > top) { top = v; cnt = 1; pick = i; } else if (v === top && rnd() * ++cnt < 1) pick = i; });
    return pick;
  }

  /* 选择：P = {rule: 'ucb'|'eps', c, eps}。返回本步的全部中间量，供“计算过程”面板。 */
  function decide(S, P, rnd) {
    const m = S.Q.length, t = S.t, d = { t, m, rule: P.rule };
    if (P.rule === 'ucb') {
      const untried = S.N.map((n, i) => (n === 0 ? i : -1)).filter((i) => i >= 0);
      d.lnT = t > 0 ? Math.log(t) : 0;
      d.bonus = S.N.map((n) => (n === 0 ? Infinity : P.c * Math.sqrt(d.lnT / n)));
      d.scores = S.Q.map((q, i) => q + d.bonus[i]);
      if (untried.length) { d.init = true; d.a = untried[0]; } // 算法 2.2 第 1 行：每臂先试一次
      else d.a = argmaxRand(d.scores, rnd);
    } else {
      const top = Math.max(...S.Q), G = S.Q.map((q, i) => (q === top ? i : -1)).filter((i) => i >= 0);
      d.greedy = G;
      d.probs = S.Q.map((_, i) => (G.includes(i) ? (1 - P.eps) / G.length : 0) + P.eps / m);
      d.u = rnd();
      d.explore = d.u < P.eps;
      d.a = d.explore ? Math.floor(rnd() * m) : G[Math.floor(rnd() * G.length)];
    }
    return d;
  }

  /* 一步：选择、取奖励、先加计数再更新均值。alpha = null 表示 1/n。 */
  function step(S, P, rnd) {
    const d = decide(S, P, rnd), a = d.a;
    d.R = S.bern ? (rnd() < S.q[a] ? 1 : 0) : S.q[a] + rnd.normal();
    d.nOld = S.N[a]; d.Qold = S.Q[a];
    S.N[a] += 1;
    d.n = S.N[a];
    d.alpha = P.alpha == null ? 1 / d.n : P.alpha;
    S.Q[a] += d.alpha * (d.R - S.Q[a]);
    d.Qnew = S.Q[a];
    S.t += 1;
    S.regret += Math.max(...S.q) - S.q[a];
    S.hist.push([S.t, S.regret]);
    S.last = d;
    return d;
  }

  /* 从某个起点跑到总试验数 T，返回伪遗憾 Σ Δ(A_t)（只计本函数里走的步）。 */
  function runTo(envKey, P, T, rnd) {
    const S = init(envKey, rnd);
    while (S.t < T) step(S, P, rnd);
    return S;
  }

  const model = { ENVS, rng, init, decide, step, runTo };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d).replace(/^(-?)0\./, '$1.').replace('-', '−') : '∞');

  RLDemo.register('bandit-ucb', (ctx) => {
    const { el } = ctx;
    let envKey = 'record', rule = 'ucb', c = Math.SQRT2, eps = 0.1, alphaMode = 'mean', speed = 10, seed = 7;
    let rnd = ctx.rng(seed), S;
    const P = () => ({ rule, c, eps, alpha: alphaMode === 'mean' ? null : 0.1 });

    const envSeg = ctx.segmented(Object.entries(ENVS).map(([k, E]) => [k, E.label]), envKey, (v) => { envKey = v; reset(); }, '环境');
    const ruleSeg = ctx.segmented([['ucb', 'UCB'], ['eps', 'ε-贪心']], rule, (v) => { rule = v; syncCtl(); reset(); }, '选择规则');
    const alphaSeg = ctx.segmented([['mean', '步长 1/n'], ['const', '常数 α = .1']], alphaMode, (v) => { alphaMode = v; reset(); }, '步长');
    const cs = ctx.slider({ label: 'c', min: 0, max: 3, step: 0.01, value: 1.41, format: (x) => (x === 1.41 ? '√2' : x.toFixed(2)), oninput: (x) => { c = x === 1.41 ? Math.SQRT2 : x; reset(); } });
    const es = ctx.slider({ label: 'ε', min: 0, max: 0.5, step: 0.01, value: eps, format: (x) => num(x, 2), oninput: (x) => { eps = x; reset(); } });
    const spSeg = ctx.segmented([[2, '慢'], [10, '中'], [200, '快']], speed, (v) => { speed = v; }, '速度');
    const stepBtn = ctx.button('走一步', () => { auto.stop(); one(); }, true);
    const autoBtn = ctx.button('连续', () => (auto.running ? auto.stop() : auto.start()));
    const resetBtn = ctx.button('重来', () => { seed += 1; reset(); });
    function syncCtl() { cs.node.style.display = rule === 'ucb' ? '' : 'none'; es.node.style.display = rule === 'eps' ? '' : 'none'; refLegend.style.display = ENVS[envKey].bern ? '' : 'none'; }

    let acc = 0;
    const auto = ctx.loop((dt) => {
      const rate = ctx.reduced() ? Math.min(speed, 2) : speed;
      acc += dt * rate;
      let k = 0;
      while (acc >= 1 && k < 400) { acc -= 1; k++; step(S, P(), rnd); }
      if (k) refresh();
      return S.t < 20000;
    });
    const _start = auto.start;
    auto.start = () => { autoBtn.textContent = '暂停'; acc = 1; _start(); };
    auto.onstop = () => (autoBtn.textContent = '连续');

    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const bars = el('div'), chart = el('div');
    ctx.stage.append(
      ctx.row(envSeg.node), ctx.row(ruleSeg.node, alphaSeg.node),
      el('div', { class: 'demo-grid2' }, bars, chart),
      ctx.row(stepBtn, autoBtn, resetBtn, spSeg.node), ctx.row(cs.node, es.node),
      read, stepsBox.node,
    );

    /* 左图：每臂一根条。蓝色段是 Q_t(a)，金色段是探索加成（UCB），黑色短横线是真值 q*(a)，红框是本步选中的臂。 */
    ctx.canvas({
      parent: bars, aspect: 0.8, maxHeight: 300, minHeight: 240, label: '各臂的估计、探索加成与真值',
      draw(g, w, h) {
        const C = ctx.colors(), m = S.Q.length, ten = !S.bern;
        const ymin = ten ? -3 : 0, ymax = ten ? 5 : 2.4;
        const L = 34, R = 6, T0 = 14, B0 = h - (ten ? 34 : 44);
        const Y = (y) => T0 + (1 - (Math.max(ymin, Math.min(ymax, y)) - ymin) / (ymax - ymin)) * (B0 - T0);
        const sp = (w - L - R) / m, bw = Math.min(64, sp * 0.62);
        g.font = ctx.font(11); g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = C.line; g.lineWidth = 1;
        const ticks = ten ? [-2, 0, 2, 4] : [0, 0.5, 1, 1.5, 2];
        for (const v of ticks) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - R, Y(v)); g.stroke(); g.fillText(num(v, v % 1 ? 1 : 0), L - 5, Y(v)); }
        const d = S.last, showBonus = rule === 'ucb';
        const bonus = showBonus ? S.N.map((n) => (n === 0 ? Infinity : c * Math.sqrt((S.t > 0 ? Math.log(S.t) : 0) / n))) : null;
        for (let i = 0; i < m; i++) {
          const x = L + sp * (i + 0.5), q = S.Q[i];
          g.fillStyle = C.accent; g.fillRect(x - bw / 2, Math.min(Y(0), Y(q)), bw, Math.max(1, Math.abs(Y(q) - Y(0))));
          if (showBonus) {
            const u = q + bonus[i];
            g.fillStyle = ctx.mix(C.surface, C.series[1], 0.75);
            g.fillRect(x - bw / 2, Y(u), bw, Math.max(0, Y(q) - Y(u)));
            g.fillStyle = C.ink; g.font = ctx.font(ten ? 10 : 12, 600, true); g.textAlign = 'center'; g.textBaseline = 'bottom';
            if (!ten || sp > 34) g.fillText(num(u, ten ? 1 : 3), x, Y(u) - 2);
            if (u > ymax) { g.fillText('↑', x, T0 + 12); }
          }
          // 真值
          g.strokeStyle = C.ink; g.lineWidth = 2; g.setLineDash([4, 3]);
          g.beginPath(); g.moveTo(x - bw / 2 - 4, Y(S.q[i])); g.lineTo(x + bw / 2 + 4, Y(S.q[i])); g.stroke(); g.setLineDash([]);
          if (d && d.a === i) { g.strokeStyle = C.series[2]; g.lineWidth = 2.2; g.strokeRect(x - bw / 2 - 3, T0 - 4, bw + 6, B0 - T0 + 8); }
          g.fillStyle = C.ink; g.font = ctx.font(12, 600); g.textAlign = 'center'; g.textBaseline = 'top';
          g.fillText(S.names[i], x, B0 + 6);
          if (!ten) {
            g.fillStyle = C.muted; g.font = ctx.font(11);
            g.fillText(`N = ${S.N[i]}`, x, B0 + 22);
          }
        }
        g.strokeStyle = C.rule; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(w - R, Y(0)); g.stroke();
      },
    });
    bars.append(ctx.legend([['var(--accent)', '估计 Q(a)'], ['var(--d2)', '探索加成'], ['var(--ink)', '真值 q*(a)（虚线）'], ['var(--d3)', '本步选中']]));

    /* 右图：本次运行的累计伪遗憾 Σ Δ(A_t)；抓取例另画 ε = .1 的下界 .01·(t − t₀)。 */
    ctx.canvas({
      parent: chart, aspect: 0.8, maxHeight: 300, minHeight: 240, label: '本次运行的累计伪遗憾',
      draw(g, w, h) {
        const C = ctx.colors(), H = S.hist, t0 = H[0][0], tN = Math.max(t0 + 50, S.t);
        const stride = Math.max(1, Math.floor(H.length / 1500));
        const data = H.filter((_, i) => i % stride === 0 || i === H.length - 1);
        const ser = [{ data, color: C.series[0], width: 2 }];
        if (S.bern) ser.unshift({ data: [[t0, 0], [tN, 0.01 * (tN - t0)]], color: C.muted, dash: [5, 4], width: 1.2 });
        ctx.plot(g, w, h, { series: ser, xmin: t0, xmax: tN, ymin: 0, ymax: Math.max(2, S.regret * 1.15, S.bern ? 0.01 * (tN - t0) * 1.05 : 0), xlabel: '已完成的试验数 t', ylabel: '累计伪遗憾', pad: { l: 40 } });
      },
    });
    const refLegend = ctx.legend([['var(--muted)', '抓取例：.01 × 步数（ε = .1 的下界）']]);
    chart.append(ctx.legend([['var(--d1)', '本次运行 Σ Δ(Aₜ)']]), refLegend);

    function reset() {
      auto.stop(); rnd = ctx.rng(seed); S = init(envKey, rnd); syncCtl();
      // 为“计算过程”预先算出下一步的分数，但不执行
      refresh();
    }
    function one() { step(S, P(), rnd); refresh(); }
    function refresh() { ctx.redraw(); show(); }

    const nm = (i) => (S.bern ? S.names[i] : '臂 ' + S.names[i]);
    function show() {
      const n = S.t - (S.hist[0][0]);
      const counts = S.bern ? S.names.map((s, i) => `N(${s}) = <b>${S.N[i]}</b>`).join('，') : '';
      read.innerHTML = `已完成 <b>${S.t}</b> 次试验（本次运行走了 ${n} 步）　累计伪遗憾 <b>${num(S.regret, 1)}</b>` + (counts ? '　' + counts : '') +
        (S.last ? '' : '<br><span class="demo-note">点“走一步”看第 ' + (S.t + 1) + ' 次怎样选。</span>');
      showSteps();
    }
    const cStr = () => (c === Math.SQRT2 ? '√2' : num(c, 2));
    function bonusTerm(d, i) { return `${cStr()}×√(${num(d.lnT, 3)}/${S.N[i] - (i === d.a ? 1 : 0)})`; }
    function showSteps() {
      const d = S.last, lines = [];
      if (!d) {
        const pv = decide({ ...S, Q: S.Q.slice(), N: S.N.slice() }, P(), ctx.rng(1));
        if (rule === 'ucb' && !pv.init) {
          lines.push([`已完成 $t$ = ${S.t} 次试验，ln ${S.t} = ${num(pv.lnT)}；下一步的分数`, 'U_t(a) = Q_t(a) + c√(ln t / N_t(a))']);
          S.Q.forEach((q, i) => { if (S.Q.length <= 3) lines.push([nm(i), { html: ctx.m(`U_{${S.t}}(${S.names[i]}) = ${num(q)} + ${cStr()}×√(${num(pv.lnT)}/${S.N[i]}) = ${num(q)} + ${num(pv.bonus[i])} = `) + `<b>${num(pv.scores[i])}</b>` }]); });
        } else if (rule === 'eps') {
          const gi = pv.greedy[0];
          lines.push([`下一步：贪心集合 $A^*_{${S.t}}$ = {${pv.greedy.map((i) => S.names[i]).join(', ')}}`, { html: ctx.m(`π(${S.names[gi]}) = (1 − ε)/${pv.greedy.length} + ε/m = `) + `<b>${num(pv.probs[gi])}</b>` }]);
        } else lines.push(['点“走一步”开始；未试过的臂先各试一次（算法 2.2 第 1 行）', null]);
        stepsBox.set(lines, '计算过程');
        return;
      }
      const t = d.t, a = d.a, A = S.names[a];
      if (d.rule === 'ucb') {
        if (d.init) lines.push([`${nm(a)} 还没有记录，$N_{${t}}$ = 0，分数无定义；算法 2.2 第 1 行先把每臂各试一次`, null]);
        else {
          lines.push([`已完成 $t$ = ${t} 次试验，ln ${t} = ${num(d.lnT)}`, 'U_t(a) = Q_t(a) + c√(ln t / N_t(a))']);
          const order = d.scores.map((_, i) => i);
          if (d.m > 3) order.sort((x, y) => d.scores[y] - d.scores[x]);
          const shown = order.slice(0, 3);
          for (const i of shown) {
            const qOld = i === a ? d.Qold : S.Q[i];
            const expr = `U_{${t}}(${S.names[i]}) = ${num(qOld)} + ${bonusTerm(d, i)} = ${num(qOld)} + ${num(d.bonus[i])} = `;
            lines.push([nm(i), { html: ctx.m(expr) + (i === a ? `<b>${num(d.scores[i])}</b>` : num(d.scores[i])) }]);
          }
          if (d.m > 3) lines.push([`其余 ${d.m - 3} 臂的分数更低`, null]);
          lines.push([`分数最高的是 ${nm(a)}`, `A_{${t}} = argmax_a U_{${t}}(a) = ${A}`]);
        }
      } else {
        const G = d.greedy.map((i) => S.names[i]).join(', ');
        lines.push([`贪心集合（并列最大的 $Q_{${t}}$）`, `A^*_{${t}} = {${G}}`]);
        const gi = d.greedy[0], oi = d.probs.findIndex((_, i) => !d.greedy.includes(i));
        lines.push(['贪心动作的选择概率', { html: ctx.m(`π(${S.names[gi]}) = (1 − ε)/${d.greedy.length} + ε/m = ${num(1 - eps, 2)}/${d.greedy.length} + ${num(eps, 2)}/${d.m} = `) + `<b>${num(d.probs[gi])}</b>` }]);
        if (oi >= 0) lines.push(['其余每个动作', `π(${S.names[oi]}) = ε/m = ${num(eps, 2)}/${d.m} = ${num(d.probs[oi])}`]);
        lines.push([d.explore ? `抽到 $u$ = ${num(d.u)} < ε：探索分支，在全部 ${d.m} 个动作中均匀选` : `抽到 $u$ = ${num(d.u)} ≥ ε：贪心分支，在 $A^*$ 中均匀选`, `A_{${t}} = ${A}`]);
      }
      lines.push([`执行 ${nm(a)}，只看到它的奖励`, { html: ctx.m(`R_{${t + 1}} = `) + `<b>${S.bern ? d.R : num(d.R)}</b>` }]);
      lines.push(['先把计数加一', `n = N_{${t + 1}}(${A}) = ${d.nOld} + 1 = ${d.n}`]);
      const al = alphaMode === 'mean' ? `1/${d.n}` : '.1';
      lines.push([alphaMode === 'mean' ? '再用新计数作步长，$α$ = 1/$n$' : '常数步长 $α$ = .1',
        { html: ctx.m(`Q_{${t + 1}}(${A}) = Q_{${t}}(${A}) + α[R_{${t + 1}} − Q_{${t}}(${A})] = ${num(d.Qold)} + ${al}×(${S.bern ? d.R : num(d.R)} − ${num(d.Qold)}) = `) + `<b>${num(d.Qnew)}</b>` }]);
      lines.push(['其余各臂的 $N$ 与 $Q$ 不变', null]);
      stepsBox.set(lines, `计算过程　第 ${t + 1} 次试验`);
    }
    reset();
  });
})();
