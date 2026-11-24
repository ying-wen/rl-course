/* 第 24 章：全程回报差恒等式 J_T(L) − J_T(L0) = E_L Σ A_t^0，在“练习—调用”算例上逐步分摊。
 * 对应 24.2 节“两步算例”：等待得 0，练习得 −1、之后技能可用，调用（练过以后）得 3；L0 总是等待，L 先练习再调用。
 * T = 2 时 A_0 = −1、A_1 = +3，合计 2；只在 L0 的历史上评估得 −1；若规定 L0 练过以后会调用，A_0 = +2、A_1 = 0。
 * 这里把期限 T 与 L 练习的时刻 p 做成可调，L 练过以后每步调用。 */
(() => {
  const REW = { wait: 0, practice: -1, call: 3 };

  /* L 的动作序列：p 步之前等待，第 p 步练习，之后调用。 */
  function actions(T, p) { return Array.from({ length: T }, (_, t) => (t < p ? 'wait' : t === p ? 'practice' : 'call')); }
  /* L0 从余期 n、是否练过出发的价值。练过以后的延拓 ext = 'wait' 或 'call'。 */
  const V0 = (n, practiced, ext) => (practiced && ext === 'call' ? 3 * n : 0);

  /* 沿 L 的历史逐步算 Q_t^0、V_t^0、A_t^0，并记 L0 自己是否到达这段历史（L0 从不练习）。 */
  function decompose(T, p, ext) {
    const acts = actions(T, p), rows = [];
    let practiced = false, JL = 0;
    for (let t = 0; t < T; t++) {
      const a = acts[t], r = REW[a], next = practiced || a === 'practice';
      const V = V0(T - t, practiced, ext), Vn = V0(T - t - 1, next, ext), Q = r + Vn;
      rows.push({ t, a, r, practiced, reached: !practiced, Q, V, Vn, A: Q - V });
      JL += r; practiced = next;
    }
    const sum = rows.reduce((s, x) => s + x.A, 0), onL0 = rows.filter((x) => x.reached).reduce((s, x) => s + x.A, 0);
    return { rows, JL, JL0: 0, sum, onL0 };
  }

  const model = { REW, actions, V0, decompose };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const sg = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);
  const NAME = { wait: '等待', practice: '练习', call: '调用' };

  RLDemo.register('ch24-identity', (ctx) => {
    const { el } = ctx;
    let T = 2, p = 0, ext = 'wait', sel = 0;
    const tSl = ctx.slider({ label: '期限 T', min: 2, max: 8, step: 1, value: T, format: (v) => `${v} 步`, oninput: (v) => { T = v; p = Math.min(p, T - 1); pSl.value = p; sel = Math.min(sel, T - 1); fix(); } });
    const pSl = ctx.slider({ label: 'L 在第几步练习', min: 0, max: 7, step: 1, value: p, format: (v) => `t = ${v}`, oninput: (v) => { p = Math.min(v, T - 1); pSl.value = p; fix(); } });
    const extSeg = ctx.segmented([['wait', 'L0 练过以后仍等待'], ['call', 'L0 练过以后调用']], ext, (v) => { ext = v; fix(); }, 'L0 在新历史上的延拓');
    const selSl = ctx.slider({ label: '查看第 t 步', min: 0, max: T - 1, step: 1, value: sel, format: (v) => `t = ${v}`, oninput: (v) => { sel = Math.min(v, T - 1); fix(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    ctx.stage.append(ctx.row(tSl.node, pSl.node), ctx.row(extSeg.node), ctx.row(selSl.node));
    const cv = ctx.canvas({
      aspect: 0.42, maxHeight: 260, minHeight: 190, label: '沿 L 的历史逐步的参照优势，青色是 L0 也会到达的历史，红色是 L0 不到达的历史',
      draw(g, w, h) {
        const C = ctx.colors(), D = decompose(T, p, ext), P = { l: 34, r: 10, t: 18, b: 40 };
        const vals = D.rows.map((x) => x.A), lo = Math.min(-2, ...vals), hi = Math.max(4, ...vals);
        const Y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (h - P.t - P.b), bw = (w - P.l - P.r) / T;
        g.font = ctx.font(12); g.textAlign = 'right'; g.textBaseline = 'middle'; g.lineWidth = 1;
        const st = hi - lo > 12 ? 5 : hi - lo > 6 ? 2 : 1;
        for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) { g.strokeStyle = v === 0 ? C.rule : C.line; g.beginPath(); g.moveTo(P.l, Y(v)); g.lineTo(w - P.r, Y(v)); g.stroke(); g.fillStyle = C.muted; g.fillText(sg(v), P.l - 5, Y(v)); }
        D.rows.forEach((x, i) => {
          const x0 = P.l + i * bw + bw * 0.2, ww = bw * 0.6;
          g.fillStyle = x.reached ? C.series[3] : C.series[2]; g.globalAlpha = i === sel ? 1 : 0.7;
          g.fillRect(x0, Math.min(Y(0), Y(x.A)), ww, Math.max(1.5, Math.abs(Y(x.A) - Y(0))));
          g.globalAlpha = 1;
          if (i === sel) { g.strokeStyle = C.ink; g.lineWidth = 2; g.strokeRect(x0 - 2, Math.min(Y(0), Y(x.A)) - 2, ww + 4, Math.max(1.5, Math.abs(Y(x.A) - Y(0))) + 4); g.lineWidth = 1; }
          g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = x.A >= 0 ? 'bottom' : 'top'; g.font = ctx.font(12, 600, true);
          g.fillText(sg(x.A), x0 + ww / 2, x.A >= 0 ? Y(x.A) - 2 : Y(x.A) + 2);
          g.font = ctx.font(12); g.fillStyle = C.muted; g.textBaseline = 'top';
          g.fillText(`t=${i}`, x0 + ww / 2, h - P.b + 4); g.fillText(NAME[x.a], x0 + ww / 2, h - P.b + 20);
        });
      },
    });
    cv.cv.addEventListener('click', (e) => { const r = cv.cv.getBoundingClientRect(), i = Math.floor((e.clientX - r.left - 34) / ((r.width - 44) / T)); if (i >= 0 && i < T) { sel = i; selSl.value = i; fix(); } });
    ctx.stage.append(ctx.legend([['var(--d4)', 'L0 也会到达的历史'], ['var(--d3)', 'L0 不到达的历史（练过以后）']]), read, stepsBox.node);

    function fix() {
      selSl.value = Math.min(sel, T - 1); sel = selSl.value;
      selSl.node.querySelector('input').max = T - 1;
      ctx.redraw(); show();
    }
    function show() {
      const D = decompose(T, p, ext), x = D.rows[sel];
      read.innerHTML = `J<sub>${T}</sub>(L) = <b>${sg(D.JL) || 0}</b>，J<sub>${T}</sub>(L0) = 0。沿 L 的历史累加 ΣA<sub>t</sub><sup>0</sup> = <b>${sg(D.sum) || 0}</b>，与回报差相等；` +
        `只累加 L0 也到达的历史，得 <b>${sg(D.onL0) || 0}</b>。`;
      const hist = x.practiced ? '练过以后' : '尚未练习';
      stepsBox.set([
        [`第 ${sel} 步，历史“${hist}”，L ${NAME[x.a]}，之后交还 L0`, `Q_${sel}^0 = r + V_${sel + 1}^0`],
        ['代入', { html: ctx.m(`Q_${sel}^0 = ${sg(x.r) || 0} + ${x.Vn} = ${sg(x.Q) || 0}`) }],
        [x.practiced ? `L0 在这段历史上按延拓“${ext === 'call' ? '每步调用' : '等待'}”行动` : 'L0 在这段历史上一直等待', { html: ctx.m(`V_${sel}^0 = ${x.V}`) }],
        ['参照优势', { html: ctx.m(`A_${sel}^0 = Q_${sel}^0 − V_${sel}^0 = `) + `<b>${sg(x.A) || 0}</b>` }],
        ['各步相加，相邻的 $V^0$ 相消', { html: ctx.m(`Σ_t A_t^0 = ${D.rows.map((r) => `(${sg(r.A) || 0})`).join(' + ')} = `) + `<b>${sg(D.sum) || 0}</b>` + ctx.m(` = J_${T}(L) − J_${T}(L_0)`) }],
      ], `计算过程　第 ${sel} 步的参照优势`);
    }
    show();
  });
})();
