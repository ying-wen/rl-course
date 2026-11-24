/* 第 11 章：PPO 的裁剪代理。对应 11.5 节“PPO：用裁剪代理进行多轮一阶优化”与“例：同批两次更新”：
 * ℓ = min{ρÂ, clip(ρ, 1−ϵ, 1+ϵ)Â}；两步树末次选择只更新 z = logit(q)，q_o = .25，一条取 3（Â = +1.5）、
 * 三条取 1（Â = −.5），每条权重 .9/8，步长 2。 */
(() => {
  const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const model = {
    ell(rho, A, eps) { return Math.min(rho * A, clip(rho, 1 - eps, 1 + eps) * A); },
    /* 对 ρ 的导数（折点处取右导数之外的一侧）：平台上为 0，其余为 Â。 */
    dEll(rho, A, eps) { return (A > 0 && rho > 1 + eps) || (A < 0 && rho < 1 - eps) ? 0 : A; },
    QO: 0.25, W: 0.9 / 8, LR: 2,
    /* 同批更新的一步：返回两类记录的比率、各自梯度与新 z。 */
    ppoStep(z, eps) {
      const q = sig(z), r3 = q / model.QO, r1 = (1 - q) / (1 - model.QO);
      const g3 = model.dEll(r3, 1.5, eps) === 0 ? 0 : model.W * 1.5 * r3 * (1 - q);
      const g1 = model.dEll(r1, -0.5, eps) === 0 ? 0 : 3 * model.W * (-0.5) * r1 * (-q);
      const z2 = z + model.LR * (g3 + g1);
      return { q, r3, r1, g3, g1, grad: g3 + g1, z: z2, q2: sig(z2), r3n: sig(z2) / model.QO, r1n: (1 - sig(z2)) / (1 - model.QO) };
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('ppo-clip', (ctx) => {
    const { el, fmt } = ctx;
    let mode = 'curve', eps = 0.2, rho = 1.25, z0 = Math.log(1 / 3), hist, last;
    const f3 = (x) => fmt(x, 3);
    function reset() { hist = [{ z: z0, q: sig(z0) }]; last = null; ctx.redraw(); show(); }
    const seg = ctx.segmented([['curve', '单条记录的裁剪项'], ['batch', '同批多次更新']], mode, (v) => { mode = v; sync(); }, '演示内容');
    const eS = ctx.slider({ label: '裁剪宽度 ϵ', min: 0.05, max: 0.5, step: 0.01, value: eps, format: (x) => fmt(x, 2), oninput: (x) => { eps = x; if (mode === 'batch') reset(); else { ctx.redraw(); show(); } } });
    const rS = ctx.slider({ label: '概率比 ρ', min: 0, max: 2, step: 0.01, value: rho, format: (x) => fmt(x, 2), oninput: (x) => { rho = x; ctx.redraw(); show(); } });
    const upBtn = ctx.button('更新一次', () => { if (hist.length > 8) return; last = model.ppoStep(hist[hist.length - 1].z, eps); hist.push({ z: last.z, q: last.q2 }); ctx.redraw(); show(); }, true);
    const rsBtn = ctx.button('重置', () => reset());
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div'), grid = el('div', { class: 'demo-grid2' }, left, right), one = el('div');
    const ctrl2 = ctx.row(upBtn, rsBtn);
    ctx.stage.append(ctx.row(seg.node, eS.node, rS.node), grid, one, ctrl2, read, stepsBox.node);
    function sync() {
      const c = mode === 'curve';
      grid.style.display = c ? '' : 'none'; one.style.display = c ? 'none' : ''; ctrl2.style.display = c ? 'none' : '';
      rS.node.style.display = c ? '' : 'none';
      if (c) { ctx.redraw(); show(); } else reset();
    }

    const panel = (parent, A) => {
      const cv = ctx.canvas({
        parent, aspect: 0.8, maxHeight: 280, minHeight: 200, label: `优势 ${A > 0 ? '为正' : '为负'} 时裁剪代理随概率比的变化；可拖动选择 ρ`,
        draw(G, w, h) {
          const C = ctx.colors(), un = [], cl = [];
          for (let i = 0; i <= 200; i++) { const r = i / 100; un.push([r, r * A]); cl.push([r, model.ell(r, A, eps)]); }
          const P = ctx.plot(G, w, h, { series: [], xmin: 0, xmax: 2, ymin: A > 0 ? -0.2 : -2.1, ymax: A > 0 ? 2.1 : 0.2, xlabel: '概率比 ρ', ylabel: `Â = ${A > 0 ? '+1' : '−1'} 的 ℓ`, pad: { l: 40 } });
          // 平台（梯度为零）的阴影
          const [a, b] = A > 0 ? [1 + eps, 2] : [0, 1 - eps];
          G.fillStyle = C.tint; G.fillRect(P.X(a), P.P.t, P.X(b) - P.X(a), h - P.P.t - P.P.b);
          const seg2 = (pts, col, wd, dash) => { G.save(); G.strokeStyle = col; G.lineWidth = wd; G.setLineDash(dash || []); G.beginPath(); pts.forEach(([x, y], i) => (i ? G.lineTo(P.X(x), P.Y(y)) : G.moveTo(P.X(x), P.Y(y)))); G.stroke(); G.restore(); };
          seg2(un, C.muted, 1.4, [5, 4]); seg2(cl, C.series[0], 2.6);
          G.fillStyle = C.ink; G.beginPath(); G.arc(P.X(1), P.Y(A), 3.5, 0, 7); G.fill();
          const y = model.ell(rho, A, eps);
          G.fillStyle = C.series[2]; G.beginPath(); G.arc(P.X(rho), P.Y(y), 5.5, 0, 7); G.fill();
          G.font = ctx.font(11); G.fillStyle = C.muted; G.textAlign = 'center'; G.textBaseline = 'top';
          G.fillText('梯度为零', (P.X(a) + P.X(b)) / 2, P.P.t + 3);
          cv._P = P;
        },
      });
      cv.cv.style.touchAction = 'none'; cv.cv.style.cursor = 'ew-resize';
      let drag = false;
      const pick = (e) => { const P = cv._P; if (!P) return; const r = cv.cv.getBoundingClientRect(); const x = (e.clientX - r.left - P.P.l) / (r.width - P.P.l - P.P.r) * 2; rho = Math.round(clip(x, 0, 2) * 100) / 100; rS.value = rho; ctx.redraw(); show(); };
      cv.cv.addEventListener('pointerdown', (e) => { drag = true; cv.cv.setPointerCapture(e.pointerId); pick(e); });
      cv.cv.addEventListener('pointermove', (e) => { if (drag) pick(e); });
      cv.cv.addEventListener('pointerup', () => { drag = false; });
    };
    panel(left, 1); panel(right, -1);
    grid.after(ctx.legend([['var(--muted)', '未裁剪 ρÂ'], ['var(--d1)', '裁剪代理 ℓ'], ['var(--d3)', '当前 ρ'], ['var(--ink)', '旧策略 ρ = 1']]));

    ctx.canvas({
      parent: one, aspect: 0.5, maxHeight: 280, minHeight: 200, label: '同批多次更新时两类记录的概率比',
      draw(G, w, h) {
        const C = ctx.colors();
        const r3 = hist.map((s, i) => [i, s.q / model.QO]), r1 = hist.map((s, i) => [i, (1 - s.q) / (1 - model.QO)]);
        const P = ctx.plot(G, w, h, {
          series: [{ data: r3, color: C.series[0], width: 2.2 }, { data: r1, color: C.series[1], width: 2.2 }],
          xmin: 0, xmax: 8, ymin: 0.5, ymax: 2.2, xlabel: '在同一批上的更新次数', ylabel: '概率比 ρ', pad: { l: 40 }, xticks: 8,
          hlines: [{ y: 1 + eps, label: `1 + ϵ = ${fmt(1 + eps, 2)}` }, { y: 1 - eps, label: `1 − ϵ = ${fmt(1 - eps, 2)}` }],
        });
        [[r3, C.series[0]], [r1, C.series[1]]].forEach(([d, c]) => d.forEach(([x, y]) => { G.fillStyle = c; G.beginPath(); G.arc(P.X(x), P.Y(y), 3.5, 0, 7); G.fill(); }));
      },
    });
    one.append(ctx.legend([['var(--d1)', '取 3 的记录（Â = +1.5）'], ['var(--d2)', '取 1 的三条记录（Â = −.5）']]));

    function show() {
      if (mode === 'curve') {
        const lp = model.ell(rho, 1, eps), ln = model.ell(rho, -1, eps), dp = model.dEll(rho, 1, eps), dn = model.dEll(rho, -1, eps);
        read.innerHTML = `ϵ = ${fmt(eps, 2)}，ρ = ${fmt(rho, 2)}：Â = +1 时 ℓ = <b>${f3(lp)}</b>，∂ℓ/∂ρ = <b>${fmt(dp, 0)}</b>；Â = −1 时 ℓ = <b>${f3(ln)}</b>，∂ℓ/∂ρ = <b>${fmt(dn, 0)}</b>`;
        stepsBox.set([
          ['裁剪代理', 'ℓ = min{ρÂ, clip(ρ, 1−ϵ, 1+ϵ)Â}'],
          [`$Â = +1$，取 min(ρ, 1+ϵ)`, { html: ctx.m(`ℓ = min(${f3(rho)}, ${f3(1 + eps)}) = `) + `<b>${f3(lp)}</b>` }],
          [`$Â = −1$，取 −max(ρ, 1−ϵ)`, { html: ctx.m(`ℓ = −max(${f3(rho)}, ${f3(1 - eps)}) = `) + `<b>${f3(ln)}</b>` }],
          ['分段梯度，$g = ∇log π(a|s)$', 'Â > 0 且 ρ > 1+ϵ，或 Â < 0 且 ρ < 1−ϵ 时 ∇ℓ = 0；否则 ∇ℓ = ρÂg'],
          ['对 ρ 的导数', `Â = +1：${fmt(dp, 0)}；Â = −1：${fmt(dn, 0)}`],
        ], '计算过程　单条记录的裁剪项');
        return;
      }
      const k = hist.length - 1, cur = hist[k];
      read.innerHTML = `已更新 <b>${k}</b> 次：q = <b>${fmt(cur.q, 4)}</b>，取 3 的比率 <b>${f3(cur.q / model.QO)}</b>，取 1 的比率 <b>${f3((1 - cur.q) / (1 - model.QO))}</b>` +
        (cur.q / model.QO > 1 + eps ? '；取 3 的记录已越过 1 + ϵ，仍被另一类记录的梯度推着走' : '');
      if (!last) {
        stepsBox.set([
          ['只更新末次选择的 $z = logit(q)$，每条记录权重 $.9/8$，步长 2', 'z ← z + 2·Σ_j w ∇_z ℓ_j,　∇_z ℓ_j = ρ_j Â_j ∂_z log π(a_j)（在斜坡上）'],
          ['对数概率对 $z$ 的导数', '∂_z log q = 1 − q,　∂_z log(1 − q) = −q'],
        ], '计算过程　点“更新一次”');
        return;
      }
      const L = last, z3 = L.g3 === 0, z1 = L.g1 === 0;
      stepsBox.set([
        ['当前比率', `ρ_3 = q/.25 = ${f3(L.r3)},　ρ_1 = (1 − q)/.75 = ${f3(L.r1)}`],
        [z3 ? `取 3：$Â > 0$ 且 $ρ_3 > 1+ϵ$，在平台上` : '取 3：在斜坡上', z3 ? 'w·∇ℓ = 0' : `(.9/8)(1.5)(${f3(L.r3)})(1 − ${fmt(L.q, 4)}) = ${fmt(L.g3, 5)}`],
        [z1 ? `取 1：$Â < 0$ 且 $ρ_1 < 1−ϵ$，在平台上` : '取 1 的三条：在斜坡上', z1 ? 'w·∇ℓ = 0' : `3(.9/8)(−.5)(${f3(L.r1)})(−${fmt(L.q, 4)}) = ${fmt(L.g1, 5)}`],
        ['合计与更新', { html: ctx.m(`∂_z = ${fmt(L.grad, 5)},　q: ${fmt(L.q, 4)} → `) + `<b>${fmt(L.q2, 4)}</b>` }],
        ['更新后的比率', { html: ctx.m('ρ_3 = ') + `<b>${f3(L.r3n)}</b>` + ctx.m(',　ρ_1 = ') + `<b>${f3(L.r1n)}</b>` }],
      ], `计算过程　第 ${k} 次更新`);
    }
    reset(); sync();
  });
})();
