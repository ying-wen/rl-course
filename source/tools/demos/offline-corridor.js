/* 第 12 章：未见动作的任意估值沿贪心自举传回起点。对应 12.1 节“未见动作的任意估值沿贪心自举传回起点”与 12.2 节“支持内贪心”：
 * 四道门的走廊，前三道门记录中的通过频率都是 .8，末门前进 0 条记录，记 u = Q̂(x3, 前进)。
 * 普通贪心：Q̂(x_i, 前进) = .8 max{1, Q̂(x_{i+1}, 前进)}，u = 5 时依次 4、3.2、2.56；x2 前进当且仅当 u > 1.25。
 * 支持内贪心：x3 只剩退出，各门前进都只值 .8，起点退出。放回真实走廊（通过率 .8，末门奖 B = 4 或 0）：
 * 一直前进得 4(.8)^4 = 1.6384 或 0，立即退出两边都得 1。 */
(() => {
  const P = 0.8, NG = 4;
  const model = {
    P,
    /* 返回各门前进的估值与贪心动作（1 = 前进）。support 为真时末门前进不在候选中。 */
    solve(u, support) {
      const qf = new Array(NG), act = new Array(NG);
      qf[NG - 1] = support ? null : u;
      let V = support ? 1 : Math.max(1, u);
      act[NG - 1] = !support && u > 1 ? 1 : 0;
      for (let i = NG - 2; i >= 0; i--) { qf[i] = P * V; act[i] = qf[i] > 1 ? 1 : 0; V = Math.max(1, qf[i]); }
      return { qf, act, v0: V };
    },
    /* 在真实走廊中执行确定性策略的期望回报。 */
    trueReturn(act, B) {
      let pr = 1;
      for (let i = 0; i < NG; i++) { if (!act[i]) return pr; pr *= P; }
      return pr * B;
    },
    /* 普通贪心在起点改为前进的门槛 u > 1/.8^3。 */
    threshold() { return 1 / P ** (NG - 1); },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('offline-corridor', (ctx) => {
    const { el, fmt } = ctx;
    let u = 5, support = false;
    const f3 = (x) => fmt(x, 3);
    const seg = ctx.segmented([[0, '普通贪心'], [1, '支持内贪心']], 0, (v) => { support = !!v; uS.node.style.opacity = support ? 0.45 : 1; ctx.redraw(); show(); }, '后继取最大的范围');
    const uS = ctx.slider({ label: '末门前进的任意估值 u', min: 0, max: 6, step: 0.05, value: u, format: (x) => fmt(x, 2), oninput: (x) => { u = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(seg.node, uS.node), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);

    ctx.canvas({
      parent: left, aspect: 0.8, maxHeight: 280, minHeight: 200, label: '走廊四道门的前进估值与贪心动作',
      draw(G, w, h) {
        const C = ctx.colors(), s = model.solve(u, support), gx = (i) => 18 + (i + 0.5) * ((w - 36) / NG), y0 = h * 0.36, bw = Math.min(64, (w - 36) / NG - 10), bh = 34;
        G.font = ctx.font(12, 600); G.textAlign = 'center'; G.textBaseline = 'middle';
        let alive = true;
        for (let i = 0; i < NG; i++) {
          const x = gx(i), on = alive, fw = s.act[i] && on;
          G.fillStyle = C.ink; G.font = ctx.font(12, 600); G.fillText(`x${'₀₁₂₃'[i]}`, x, y0 - bh / 2 - 26);
          const box = (yy, txt, hot, dashed, col) => {
            G.save(); G.fillStyle = hot ? ctx.mix(C.surface, col, 0.35) : C.surface; G.strokeStyle = hot ? col : C.rule; G.lineWidth = hot ? 2.2 : 1.2;
            if (dashed) G.setLineDash([4, 3]);
            G.fillRect(x - bw / 2, yy - bh / 2, bw, bh); G.strokeRect(x - bw / 2, yy - bh / 2, bw, bh); G.restore();
            G.fillStyle = C.ink; G.font = ctx.font(12.5, 600); G.fillText(txt, x, yy);
          };
          const q = s.qf[i];
          box(y0, q == null ? '不在候选' : f3(q), fw, i === NG - 1, i === NG - 1 ? C.series[2] : C.series[0]);
          box(y0 + bh + 26, '1', on && !s.act[i], false, C.series[3]);
          G.font = ctx.font(10.5); G.fillStyle = C.muted;
          G.fillText(i === NG - 1 ? '记录 0 条' : `通过 ${['100/125', '60/75', '40/50'][i]}`, x, y0 - bh / 2 - 10);
          if (i < NG - 1) { G.strokeStyle = C.muted; G.lineWidth = 1.2; G.beginPath(); G.moveTo(x + bw / 2 + 1, y0); G.lineTo(gx(i + 1) - bw / 2 - 3, y0); G.stroke(); }
          if (!s.act[i]) alive = false;
        }
        G.font = ctx.font(11); G.fillStyle = C.muted; G.textAlign = 'left';
        G.fillText('上行：前进的估值', 6, h - 30); G.fillText('下行：退出得 1；加框为从起点执行时的选择', 6, h - 14);
      },
    });

    ctx.canvas({
      parent: right, aspect: 0.8, maxHeight: 280, minHeight: 200, label: '放回两个真实世界的起点回报随 u 的变化',
      draw(G, w, h) {
        const C = ctx.colors(), w1 = [], w2 = [];
        for (let i = 0; i <= 240; i++) { const x = (6 * i) / 240, a = model.solve(x, support).act; w1.push([x, model.trueReturn(a, 4)]); w2.push([x, model.trueReturn(a, 0)]); }
        const Pp = ctx.plot(G, w, h, { series: [{ data: w2, color: C.series[2], width: 2.2 }, { data: w1, color: C.series[0], width: 2.2, dash: [6, 3] }], xmin: 0, xmax: 6, ymin: -0.1, ymax: 1.9, xlabel: '末门前进的估值 u', ylabel: '起点回报', pad: { l: 40 } });
        const a = model.solve(u, support).act;
        [[model.trueReturn(a, 4), C.series[0]], [model.trueReturn(a, 0), C.series[2]]].forEach(([y, c]) => { G.fillStyle = c; G.beginPath(); G.arc(Pp.X(u), Pp.Y(y), 5, 0, 7); G.fill(); });
      },
    });
    right.append(ctx.legend([['var(--d1)', '世界一：末门奖 4'], ['var(--d3)', '世界二：末门奖 0']]));

    function show() {
      const s = model.solve(u, support), r1 = model.trueReturn(s.act, 4), r2 = model.trueReturn(s.act, 0);
      const pol = s.act.map((x) => (x ? '前' : '退')).join(' ');
      read.innerHTML = `${support ? '支持内贪心' : `普通贪心、u = ${fmt(u, 2)}`}：各门贪心动作 ${pol}；起点回报 世界一 <b>${fmt(r1, 4)}</b>，世界二 <b>${fmt(r2, 4)}</b>` +
        (support ? '' : `<br>起点改为前进的门槛 u > 1/.8³ = ${fmt(model.threshold(), 3)}；两组估值都满足经验 Bellman 方程`);
      const lines = [['前三道门的通过频率', '100/125 = 60/75 = 40/50 = .8']];
      lines.push(support ? ['支持内：$x_3$ 只有退出有记录', 'V(x_3) = 1'] : ['末门前进没有记录，估值任意', `V(x_3) = max{1, u} = ${f3(Math.max(1, u))}`]);
      for (let i = NG - 2; i >= 0; i--) {
        const nv = i === NG - 2 ? (support ? 1 : Math.max(1, u)) : Math.max(1, s.qf[i + 1]);
        lines.push([`$x_${i}$ 前进，后继 $x_${i + 1}$ 取 max{1, 前进估值}`, { html: ctx.m(`Q̂(x_${i}, 前进) = .8 × ${f3(nv)} = `) + `<b>${f3(s.qf[i])}</b>` + ctx.m(s.qf[i] > 1 ? ' > 1，前进' : ' ≤ 1，退出') }]);
      }
      lines.push(['放回真实走廊（通过率 .8）', { html: ctx.m(`J = `) + `<b>${fmt(r1, 4)}</b>` + ctx.m(`（B = 4），`) + `<b>${fmt(r2, 4)}</b>` + ctx.m('（B = 0）') }]);
      stepsBox.set(lines, '计算过程　由后向前的贪心自举');
    }
    show();
  });
})();
