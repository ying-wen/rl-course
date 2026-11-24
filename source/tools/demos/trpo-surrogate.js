/* 第 11 章：旧访问代理与真实改善。对应 11.4 节“策略性能差异与局部代理目标”的两步树：
 * 旧策略 p_o = .5，q_o = .25，γ = .9。ΔJ = B(s0) + γp·B(s1)，L_old = B(s0) + γp_o·B(s1)，
 * B(s) 是候选策略在 s 的平均旧优势。候选 (.9, .1) 时 L = +.005，ΔJ = −.103。 */
(() => {
  const GAMMA = 0.9, PO = 0.5, QO = 0.25;
  const J = (p, q) => (1 - p) + GAMMA * p * (1 + 2 * q);
  const JO = J(PO, QO);
  const logit = (x) => Math.log(x / (1 - x)), sig = (z) => 1 / (1 + Math.exp(-z));
  const model = {
    GAMMA, PO, QO, J, JO,
    parts(p, q) {
      const v0 = JO, v1 = 1 + 2 * QO;
      const B0 = (1 - p) * (1 - v0) + p * (GAMMA * v1 - v0);
      const B1 = q * (3 - v1) + (1 - q) * (1 - v1);
      return { B0, B1, nOld: GAMMA * PO, nNew: GAMMA * p, L: B0 + GAMMA * PO * B1, dJ: B0 + GAMMA * p * B1 };
    },
    /* 在 logit 空间里从旧策略走到候选的直线截面，t ∈ [0, 1]。 */
    along(p, q, t) {
      const pt = sig(logit(PO) + t * (logit(p) - logit(PO))), qt = sig(logit(QO) + t * (logit(q) - logit(QO)));
      return { p: pt, q: qt, ...model.parts(pt, qt) };
    },
    /* 旧点处的方向导数 g·u，g 为对 logit 的精确梯度。 */
    slope(p, q) {
      const g0 = PO * (1 - PO) * (-1 + GAMMA * (1 + 2 * QO)), g1 = GAMMA * PO * 2 * QO * (1 - QO);
      return g0 * (logit(p) - logit(PO)) + g1 * (logit(q) - logit(QO));
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('trpo-surrogate', (ctx) => {
    const { el, fmt } = ctx;
    let p = 0.9, q = 0.1;
    const f3 = (x) => fmt(x, 3);
    const pS = ctx.slider({ label: '候选 p', min: 0.02, max: 0.98, step: 0.01, value: p, format: (x) => fmt(x, 2), oninput: (x) => { p = x; ctx.redraw(); show(); } });
    const qS = ctx.slider({ label: '候选 q', min: 0.02, max: 0.98, step: 0.01, value: q, format: (x) => fmt(x, 2), oninput: (x) => { q = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(pS.node, qS.node), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);

    let sq = null;
    const map = ctx.canvas({
      parent: left, aspect: 1, maxHeight: 300, minHeight: 220, label: '策略平面上的真实改善与旧访问代理的符号；点击或拖动选择候选策略',
      draw(G, w, h) {
        const C = ctx.colors(), pad = { l: 40, r: 10, t: 10, b: 30 }, W = w - pad.l - pad.r, H = h - pad.t - pad.b;
        sq = { pad, W, H };
        const n = 48, cw = W / n, ch = H / n, pos = ctx.mix(C.surface, C.series[0], 0.55), neg = ctx.mix(C.surface, C.series[2], 0.55);
        for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
          const pp = (i + 0.5) / n, qq = (k + 0.5) / n, r = model.parts(pp, qq);
          const t = Math.min(1, Math.abs(r.dJ) / 0.8);
          G.fillStyle = ctx.mix(C.surface, r.dJ > 0 ? pos : neg, 0.25 + 0.75 * t);
          G.fillRect(pad.l + i * cw, pad.t + (n - 1 - k) * ch, cw + 0.6, ch + 0.6);
          // 两者符号不同的区域加斜纹
          if (r.dJ * r.L < 0 && (i + k) % 3 === 0) { G.fillStyle = C.ink; G.globalAlpha = 0.45; G.fillRect(pad.l + i * cw + cw * 0.3, pad.t + (n - 1 - k) * ch + ch * 0.3, cw * 0.4, ch * 0.4); G.globalAlpha = 1; }
        }
        ctx.plot(G, w, h, { series: [], xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: 'p = π(继续|s₀)', ylabel: 'q = π(取 3|s₁)', pad });
        const X = (x) => pad.l + x * W, Y = (y) => pad.t + (1 - y) * H;
        G.strokeStyle = C.ink; G.lineWidth = 1.6; G.setLineDash([4, 3]); G.beginPath();
        for (let i = 0; i <= 40; i++) { const a = model.along(p, q, i / 40); i ? G.lineTo(X(a.p), Y(a.q)) : G.moveTo(X(a.p), Y(a.q)); }
        G.stroke(); G.setLineDash([]);
        G.fillStyle = C.series[2]; G.beginPath(); G.arc(X(PO), Y(QO), 5, 0, 7); G.fill();
        G.fillStyle = C.ink; G.beginPath(); G.arc(X(p), Y(q), 6, 0, 7); G.fill();
        G.strokeStyle = C.bg; G.lineWidth = 2; G.stroke();
        G.font = ctx.font(11.5, 600); G.fillStyle = C.ink; G.textAlign = 'left'; G.textBaseline = 'bottom';
        G.fillText('π_o', X(PO) + 7, Y(QO) - 3);
      },
    });
    const pick = (e) => {
      if (!sq) return;
      const r = map.cv.getBoundingClientRect(), x = (e.clientX - r.left - sq.pad.l) / sq.W, y = 1 - (e.clientY - r.top - sq.pad.t) / sq.H;
      p = Math.min(0.98, Math.max(0.02, Math.round(x * 100) / 100)); q = Math.min(0.98, Math.max(0.02, Math.round(y * 100) / 100));
      pS.value = p; qS.value = q; ctx.redraw(); show();
    };
    let drag = false;
    map.cv.style.touchAction = 'none'; map.cv.style.cursor = 'crosshair';
    map.cv.addEventListener('pointerdown', (e) => { drag = true; map.cv.setPointerCapture(e.pointerId); pick(e); });
    map.cv.addEventListener('pointermove', (e) => { if (drag) pick(e); });
    map.cv.addEventListener('pointerup', () => { drag = false; });
    left.append(ctx.legend([['var(--d1)', '真实回报上升'], ['var(--d3)', '真实回报下降'], ['var(--ink)', '小方块：代理与真实符号相反']]));

    ctx.canvas({
      parent: right, aspect: 1, maxHeight: 300, minHeight: 220, label: '沿虚线从旧策略走到候选策略时的真实改善与代理',
      draw(G, w, h) {
        const C = ctx.colors(), dj = [], L = [], tan = [], s = model.slope(p, q);
        for (let i = 0; i <= 60; i++) { const t = i / 60, a = model.along(p, q, t); dj.push([t, a.dJ]); L.push([t, a.L]); tan.push([t, s * t]); }
        const ys = [...dj, ...L].map((d) => d[1]), lo = Math.min(-0.05, ...ys), hi = Math.max(0.05, ...ys), m = 0.1 * (hi - lo);
        ctx.plot(G, w, h, {
          series: [{ data: tan, color: C.muted, width: 1.4, dash: [4, 4] }, { data: L, color: C.series[0], width: 2.2 }, { data: dj, color: C.series[2], width: 2.2 }],
          xmin: 0, xmax: 1, ymin: lo - m, ymax: hi + m, xlabel: 't（0 = 旧策略，1 = 候选）', ylabel: '回报改善', pad: { l: 44 }, hlines: [{ y: 0, color: C.rule }],
        });
      },
    });
    right.append(ctx.legend([['var(--d3)', '真实改善 ΔJ'], ['var(--d1)', '旧访问代理 L_old'], ['var(--muted)', '旧点处的共同切线']]));

    function show() {
      const r = model.parts(p, q);
      read.innerHTML = `候选 (p, q) = (${fmt(p, 2)}, ${fmt(q, 2)})：代理 L<sub>old</sub> = <b>${f3(r.L)}</b>，真实改善 ΔJ = <b>${f3(r.dJ)}</b>（J 从 ${f3(JO)} 到 ${f3(J(p, q))}）` +
        `<br>s₁ 的折扣访问量：旧轨迹 γp<sub>o</sub> = ${f3(r.nOld)}，候选策略 γp = ${f3(r.nNew)}` + (r.L * r.dJ < 0 ? '　<b>两者符号相反</b>' : '');
      stepsBox.set([
        ['旧策略的精确价值', `v_o(s_0) = J(π_o) = ${f3(JO)},　v_o(s_1) = 1 + 2q_o = 1.5`],
        ['候选策略在 $s_0$ 的平均旧优势', `B(s_0) = (1−p)(1 − ${f3(JO)}) + p(γ·1.5 − ${f3(JO)}) = ${f3(r.B0)}`],
        ['候选策略在 $s_1$ 的平均旧优势', `B(s_1) = q(3 − 1.5) + (1−q)(1 − 1.5) = 2(q − .25) = ${f3(r.B1)}`],
        ['代理沿用旧轨迹的访问量 $γp_o$', { html: ctx.m(`L_{old} = B(s_0) + γp_o B(s_1) = ${f3(r.B0)} + ${f3(r.nOld)}·(${f3(r.B1)}) = `) + `<b>${f3(r.L)}</b>` }],
        ['真实改善按候选策略的访问量 $γp$ 计', { html: ctx.m(`ΔJ = B(s_0) + γp B(s_1) = ${f3(r.B0)} + ${f3(r.nNew)}·(${f3(r.B1)}) = `) + `<b>${f3(r.dJ)}</b>` }],
        ['两者之差只来自访问量', `ΔJ − L_{old} = γ(p − p_o)B(s_1) = ${f3(r.dJ - r.L)}`],
      ], '计算过程　性能差异与旧访问代理');
    }
    show();
  });
})();
