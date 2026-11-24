/* 第 11 章：两步决策树上的 REINFORCE 与状态基线。对应 11.1 节“两步决策任务”、11.2 节算法 11.1
 * 与 11.3 节“一条轨迹的方向、方差与偏差”：p = σ(θ0) 是 s0 继续的概率，q = σ(θ1) 是 s1 取 3 的概率，
 * γ = .9；停止得 1，继续得 0 后在 s1 取 1 或取 3 并终止。基线取 0 或真实状态价值 v_π(s)。 */
(() => {
  const GAMMA = 0.9, THETA0 = [0, Math.log(0.25 / 0.75)];
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const model = {
    GAMMA, THETA0, sig,
    probs(th) { return [sig(th[0]), sig(th[1])]; },
    J(th) { const [p, q] = model.probs(th); return (1 - p) + GAMMA * p * (1 + 2 * q); },
    grad(th) { const [p, q] = model.probs(th); return [p * (1 - p) * (-1 + GAMMA * (1 + 2 * q)), GAMMA * p * 2 * q * (1 - q)]; },
    values(th) { const [, q] = model.probs(th); return [model.J(th), 1 + 2 * q]; },
    /* 三种轨迹：0 停止，1 继续后取 1，2 继续后取 3。 */
    trajProbs(th) { const [p, q] = model.probs(th); return [1 - p, p * (1 - q), p * q]; },
    episode(th, rng) {
      const [p, q] = model.probs(th);
      if (rng() >= p) return 0;
      return rng() < q ? 2 : 1;
    },
    /* 一回合的样本梯度 Σ_t γ^t (G_t − β(S_t)) ∇log π(A_t|S_t)，附中间量。 */
    sampleGrad(tau, th, useBase) {
      const [p, q] = model.probs(th), [v0, v1] = useBase ? model.values(th) : [0, 0];
      const A0 = tau === 0 ? 0 : 1, g0 = A0 - p;
      if (tau === 0) return { tau, A0, g0, G0: 1, beta0: v0, gh: [(1 - v0) * g0, 0] };
      const R2 = tau === 2 ? 3 : 1, A1 = tau === 2 ? 1 : 0, g1 = A1 - q, G1 = R2, G0 = GAMMA * R2;
      return { tau, A0, A1, g0, g1, G0, G1, beta0: v0, beta1: v1, gh: [(G0 - v0) * g0, GAMMA * (G1 - v1) * g1] };
    },
    /* 单回合估计各分量的精确均值与方差（枚举三种轨迹）。 */
    moments(th, useBase) {
      const P = model.trajProbs(th), m = [0, 0], s2 = [0, 0];
      P.forEach((pr, t) => { const g = model.sampleGrad(t, th, useBase).gh; for (let j = 0; j < 2; j++) { m[j] += pr * g[j]; s2[j] += pr * g[j] * g[j]; } });
      return { mean: m, sd: m.map((x, j) => Math.sqrt(Math.max(0, s2[j] - x * x))) };
    },
    /* 算法 11.1 的一批：N 个回合，ĝ 为回合平均，θ ← θ + αĝ。 */
    batch(th, N, alpha, useBase, rng) {
      const eps = [], gh = [0, 0];
      for (let i = 0; i < N; i++) { const e = model.sampleGrad(model.episode(th, rng), th, useBase); eps.push(e); gh[0] += e.gh[0] / N; gh[1] += e.gh[1] / N; }
      return { eps, gh, next: [th[0] + alpha * gh[0], th[1] + alpha * gh[1]] };
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('pg-twostep', (ctx) => {
    const { el, fmt } = ctx;
    let useBase = false, N = 32, alpha = 0.2;
    let th, hist, eps, last, rng, cloudRng;
    const MAXEP = 9600;
    function reset() {
      th = THETA0.slice(); eps = 0; last = null; rng = ctx.rng(7); cloudRng = ctx.rng(99);
      hist = [[0, ...model.probs(th), model.J(th)]];
      auto.stop(); ctx.redraw(); show();
    }
    function update() {
      const b = model.batch(th, N, alpha, useBase, rng);
      last = { th: th.slice(), ...b }; th = b.next; eps += N;
      hist.push([eps, ...model.probs(th), model.J(th)]);
    }

    const baseSeg = ctx.segmented([[false, '基线 β = 0'], [true, '基线 β(s) = v_π(s)']], useBase, (v) => { useBase = v; ctx.redraw(); show(); }, '基线');
    const nS = ctx.slider({ label: '每批回合数 N', min: 1, max: 64, step: 1, value: N, oninput: (x) => { N = x; ctx.redraw(); show(); } });
    const aS = ctx.slider({ label: '步长 α', min: 0.05, max: 1, step: 0.05, value: alpha, format: (x) => x.toFixed(2), oninput: (x) => { alpha = x; } });
    const stepBtn = ctx.button('采一批并更新', () => { auto.stop(); update(); ctx.redraw(); show(); }, true);
    const autoBtn = ctx.button('连续', () => (auto.running ? auto.stop() : auto.start()));
    const resetBtn = ctx.button('重置', () => reset());
    let acc = 0;
    const auto = ctx.loop((dt) => {
      acc += dt;
      if (acc < (ctx.reduced() ? 0.5 : 0.06)) return true;
      acc = 0; update(); ctx.redraw(); show();
      return eps < MAXEP;
    });
    auto.onstop = () => (autoBtn.textContent = '连续');
    const _start = auto.start;
    auto.start = () => { autoBtn.textContent = '暂停'; _start(); };

    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(
      ctx.row(baseSeg.node, nS.node, aS.node),
      el('div', { class: 'demo-grid2' }, left, right),
      ctx.row(stepBtn, autoBtn, resetBtn),
      read, stepsBox.node,
    );

    /* 左：在当前 θ 处重复 240 批得到的批均值估计 ĝ，两种基线各一团；箭头是真梯度 */
    const CLOUD = 240;
    ctx.canvas({
      parent: left, aspect: 0.85, maxHeight: 320, minHeight: 230, label: '当前参数处梯度估计的散布',
      draw(G, w, h) {
        const C = ctx.colors(), g = model.grad(th);
        const m0 = model.moments(th, false), sd = m0.sd.map((s) => Math.max(0.02, s / Math.sqrt(N)));
        const xr = 3.2 * Math.max(sd[0], 0.05), yr = 3.2 * Math.max(sd[1], 0.05);
        const P = ctx.plot(G, w, h, { series: [], xmin: g[0] - xr, xmax: g[0] + xr, ymin: g[1] - yr, ymax: g[1] + yr, xlabel: 'ĝ 的第一分量（θ₀）', ylabel: 'ĝ 的第二分量（θ₁）', pad: { l: 44 } });
        G.save(); G.beginPath(); G.rect(P.P.l, P.P.t, w - P.P.l - P.P.r, h - P.P.t - P.P.b); G.clip();
        const r = ctx.rng(Math.round(th[0] * 1e4) ^ Math.round(th[1] * 1e4) ^ (N << 8));
        [[false, C.series[1]], [true, C.series[0]]].forEach(([ub, col]) => {
          G.fillStyle = col; G.globalAlpha = ub === useBase ? 0.55 : 0.3;
          for (let i = 0; i < CLOUD; i++) {
            const s = [0, 0];
            for (let k = 0; k < N; k++) { const e = model.sampleGrad(model.episode(th, r), th, ub).gh; s[0] += e[0] / N; s[1] += e[1] / N; }
            G.beginPath(); G.arc(P.X(s[0]) + (r() - 0.5) * 3, P.Y(s[1]) + (r() - 0.5) * 3, 2.3, 0, 7); G.fill();
          }
        });
        G.globalAlpha = 1;
        // 原点十字与真梯度
        G.strokeStyle = C.rule; G.lineWidth = 1;
        if (0 > P.xmin && 0 < P.xmax) { G.beginPath(); G.moveTo(P.X(0), P.P.t); G.lineTo(P.X(0), h - P.P.b); G.stroke(); }
        if (0 > P.ymin && 0 < P.ymax) { G.beginPath(); G.moveTo(P.P.l, P.Y(0)); G.lineTo(w - P.P.r, P.Y(0)); G.stroke(); }
        G.fillStyle = C.ink; G.beginPath(); G.arc(P.X(g[0]), P.Y(g[1]), 4.5, 0, 7); G.fill();
        G.restore();
        G.fillStyle = C.ink; G.font = ctx.font(11.5, 600); G.textAlign = 'left'; G.textBaseline = 'bottom';
        G.fillText('∇J', P.X(g[0]) + 6, P.Y(g[1]) - 3);
      },
    });
    left.append(ctx.legend([['var(--d2)', 'β = 0'], ['var(--d1)', 'β(s) = v_π(s)'], ['var(--ink)', '真梯度 ∇J(θ)']]));

    ctx.canvas({
      parent: right, aspect: 0.85, maxHeight: 320, minHeight: 230, label: '训练中的动作概率与期望回报',
      draw(G, w, h) {
        const C = ctx.colors();
        ctx.plot(G, w, h, {
          series: [
            { data: hist.map((r) => [r[0], r[1]]), color: C.series[0], width: 2 },
            { data: hist.map((r) => [r[0], r[2]]), color: C.series[1], width: 2 },
            { data: hist.map((r) => [r[0], r[3]]), color: C.ink, width: 2 },
          ],
          xmin: 0, xmax: Math.max(320, eps), ymin: 0, ymax: 3, xlabel: '已采样的回合数', ylabel: '概率 / 期望回报',
          hlines: [{ y: 2.7, color: C.series[2], label: '最优 2.7' }, { y: 1.175, color: C.muted, label: '初始 1.175' }], pad: { l: 40 },
        });
      },
    });
    right.append(ctx.legend([['var(--d1)', 'p = π(继续|s₀)'], ['var(--d2)', 'q = π(取 3|s₁)'], ['var(--ink)', 'J(θ)（用已知模型精确算）']]));

    const f3 = (x) => fmt(x, 3), f4 = (x) => fmt(x, 4);
    const NAME = ['停止', '继续、取 1', '继续、取 3'];
    function show() {
      const [p, q] = model.probs(th), g = model.grad(th), m0 = model.moments(th, false), m1 = model.moments(th, true);
      const sq = Math.sqrt(N);
      read.innerHTML = `已采 <b>${eps}</b> 回合　θ = (${f3(th[0])}, ${f3(th[1])})　p = <b>${f3(p)}</b>，q = <b>${f3(q)}</b>，J(θ) = <b>${f3(model.J(th))}</b>` +
        `<br>当前 θ 处 N = ${N} 的批估计标准差：β = 0 时 (${f3(m0.sd[0] / sq)}, ${f3(m0.sd[1] / sq)})，β = v<sub>π</sub> 时 (<b>${f3(m1.sd[0] / sq)}</b>, <b>${f3(m1.sd[1] / sq)}</b>)；真梯度 (${f4(g[0])}, ${f4(g[1])})` +
        '<br><span class="demo-note">两团点的中心都在真梯度处，基线只改变散布。训练所用的基线由上方按钮选择。</span>';
      showSteps();
    }
    function showSteps() {
      const lines = [];
      if (!last) {
        lines.push(['对数策略梯度（Bernoulli 策略）', '∂_{θ_0} log π(A_0|s_0) = A_0 − p,　∂_{θ_1} log π(A_1|s_1) = A_1 − q']);
        lines.push(['一回合的样本梯度', 'ĝ = Σ_t γ^t (G_t − β(S_t)) ∇_θ log π(A_t|S_t)']);
        lines.push(['一批的更新', 'θ ← θ + α·(1/N) Σ_i ĝ^{(i)}']);
        stepsBox.set(lines, '计算过程　点“采一批并更新”后代入本批第 1 回合');
        return;
      }
      const e = last.eps[0], [p, q] = model.probs(last.th), [np, nq] = model.probs(last.next);
      lines.push([`本批第 1 回合：${NAME[e.tau]}；` + (e.tau === 0 ? '$G_0 = 1$' : `$R_2 = ${e.G1}$，$G_1 = ${e.G1}$，$G_0 = γ·${e.G1} = ${fmt(e.G0, 2)}$`), null]);
      lines.push(['对数策略梯度', e.tau === 0 ? `g_0 = A_0 − p = 0 − ${f3(p)} = ${f3(e.g0)}` : `g_0 = A_0 − p = 1 − ${f3(p)} = ${f3(e.g0)},　g_1 = A_1 − q = ${e.A1} − ${f3(q)} = ${f3(e.g1)}`]);
      lines.push([useBase ? '基线取真实状态价值' : '不减基线', useBase ? `β(s_0) = J(θ) = ${f3(e.beta0)},　β(s_1) = 1 + 2q = ${f3(model.values(last.th)[1])}` : 'β(s_0) = β(s_1) = 0']);
      if (e.tau === 0) lines.push(['样本梯度', { html: ctx.m(`ĝ = ((G_0 − β(s_0))·g_0, 0) = ((1 − ${f3(e.beta0)})·${f3(e.g0)}, 0) = `) + `<b>(${f3(e.gh[0])}, 0)</b>` }]);
      else lines.push(['样本梯度', { html: ctx.m(`ĝ = ((G_0 − β(s_0))·g_0, γ(G_1 − β(s_1))·g_1) = ((${fmt(e.G0, 2)} − ${f3(e.beta0)})·${f3(e.g0)}, 0.9·(${e.G1} − ${f3(e.beta1)})·${f3(e.g1)}) = `) + `<b>(${f3(e.gh[0])}, ${f3(e.gh[1])})</b>` }]);
      lines.push([`本批 ${N} 回合平均`, { html: ctx.m(`ĝ = (1/${N}) Σ_i ĝ^{(i)} = `) + `<b>(${f4(last.gh[0])}, ${f4(last.gh[1])})</b>` + ctx.m(`;　真梯度 ∇J = (${f4(model.grad(last.th)[0])}, ${f4(model.grad(last.th)[1])})`) }]);
      lines.push(['更新', { html: ctx.m(`θ ← (${f4(last.th[0])}, ${f4(last.th[1])}) + ${fmt(alpha, 2)}·(${f4(last.gh[0])}, ${f4(last.gh[1])}) = `) + `<b>(${f4(last.next[0])}, ${f4(last.next[1])})</b>` }]);
      lines.push(['动作概率', `(p, q): (${f4(p)}, ${f4(q)}) → (${f4(np)}, ${f4(nq)})`]);
      stepsBox.set(lines, `计算过程　第 ${eps / N} 批（第 ${eps - N + 1}–${eps} 回合）`);
    }
    reset();
  });
})();
