/* 第 19 章：一条转移上同时写多张 GVF 表。右灯转角 J_R，行为 b 以 b(右) 向右（一步到 B），否则向左到 W。
 * 四个问题：到站信号（两步内到 B）与时钟（到 B 的步数）两种累积量，各配目标策略 π = b（同策略）与 π_R（总向右，离策略）。
 * 对应 19.3 节“同一条转移的两项时序差分更新”（α = .5，旧值 .60、2.00，V(W,1) = .20，V(W) = 1.50）
 * 与 19.4 节“比率为 4 的一步”（b(右) = 1/4，α = .1，旧值 .40、3）。只写出发状态 J_R，W 的旧值不改。 */
(() => {
  /* 画布不认下标：把文字里的 _X（单个字符）画成缩小、下移的 X，按当前 textAlign 对齐。 */
  function subText(g, t, x, y) {
    const parts = t.split(/_(.)/), base = g.font, px = parseFloat(/(\d+(\.\d+)?)px/.exec(base)[1]);
    const small = base.replace(/\d+(\.\d+)?px/, `${(px * 0.72).toFixed(1)}px`), align = g.textAlign;
    let total = 0;
    parts.forEach((p, i) => { g.font = i % 2 ? small : base; total += g.measureText(p).width; });
    let cx = align === 'center' ? x - total / 2 : align === 'right' || align === 'end' ? x - total : x;
    g.textAlign = 'left';
    parts.forEach((p, i) => { g.font = i % 2 ? small : base; g.fillText(p, cx, i % 2 ? y + px * 0.28 : y); cx += g.measureText(p).width; });
    g.font = base; g.textAlign = align;
  }
  const DEMONS = [
    { id: 'hitB', kind: 'hit', pol: 'b', name: '到站信号，π = b', short: '到站·b' },
    { id: 'clkB', kind: 'clock', pol: 'b', name: '时钟，π = b', short: '时钟·b' },
    { id: 'hitR', kind: 'hit', pol: 'R', name: '到站信号，π_R', short: '到站·π_R' },
    { id: 'clkR', kind: 'clock', pol: 'R', name: '时钟，π_R', short: '时钟·π_R' },
  ];
  const OLD_W = { hit: 0.2, clock: 1.5 }; // V(W,1) 与 V(W)，本演示不改
  const PRESETS = {
    s5: { pR: 0, alpha: 0.5, V: { hitB: 0.6, clkB: 2, hitR: 0.4, clkR: 3 } },
    r4: { pR: 0.25, alpha: 0.1, V: { hitB: 0.6, clkB: 2, hitR: 0.4, clkR: 3 } },
  };
  /* 这一步的 (C, Γ)：向右一步到 B，两问题都停；向左到 W，到站信号记 0 继续，时钟记 1 继续。 */
  const cg = (kind, a) => (a === 'R' ? [1, 0] : kind === 'hit' ? [0, 1] : [1, 1]);
  const rho = (pol, a, pR) => (pol === 'b' ? 1 : a === 'R' ? 1 / pR : 0);
  const model = {
    DEMONS, OLD_W, PRESETS, cg, rho,
    /* 一条转移，四张表各写一次。V 为写入前的 J_R 表项。 */
    step(V, a, pR, alpha) {
      const rows = DEMONS.map((d) => {
        const [C, G] = cg(d.kind, a), r = rho(d.pol, a, pR), y = C + G * OLD_W[d.kind], delta = y - V[d.id];
        return { id: d.id, rho: r, C, G, y, delta, before: V[d.id], after: V[d.id] + alpha * r * delta };
      });
      const W = {};
      rows.forEach((r) => { W[r.id] = r.after; });
      return { rows, V: W };
    },
    /* 真值（W 之后按各自目标策略走）与 W 旧值不改时 TD 的不动点。 */
    truth(id, pR) { return { hitB: pR, clkB: 3 - 2 * pR, hitR: 1, clkR: 1 }[id]; },
    fixed(id, pR) { return { hitB: pR + (1 - pR) * OLD_W.hit, clkB: pR + (1 - pR) * (1 + OLD_W.clock), hitR: 1, clkR: 1 }[id]; },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 4) => {
    if (!Number.isFinite(x)) return '—';
    if (Math.abs(x) >= 1e5) return x.toExponential(2).replace('-', '−');
    let s = (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace(/^(-?)0\./, '$1.').replace('-', '−');
  };
  const sgn = (x) => (x > 0 ? '+' : '') + num(x);
  const MAXN = 2000;

  RLDemo.register('ch19-horde', (ctx) => {
    const { el } = ctx;
    let preset = 's5', pR = 0, alpha = 0.5, V = { ...PRESETS.s5.V }, hist = [], last = null, R = ctx.rng(19), nR = 0;
    const reset = () => { V = { ...PRESETS[preset].V }; hist = [{ ...V }]; last = null; nR = 0; R = ctx.rng(19); update(); };
    const presetSeg = ctx.segmented([['s5', '第 5 步的设定'], ['r4', '比率为 4 的设定']], preset, (v) => {
      preset = v; pR = PRESETS[v].pR; alpha = PRESETS[v].alpha; pS.value = pR; aS.value = alpha; reset();
    }, '设定');
    const pS = slider('行为 b(右)', 0, 1, 0.05, pR, (x) => { pR = x; reset(); });
    const aS = slider('步长 α', 0.05, 1, 0.05, alpha, (x) => { alpha = x; reset(); });
    function slider(label, min, max, step, value, on) { return ctx.slider({ label, min, max, step, value, format: (x) => num(x, 2), oninput: on }); }
    const act = (a) => {
      if (hist.length > MAXN) return;
      const r = model.step(V, a, pR, alpha); V = r.V; last = { a, rows: r.rows }; if (a === 'R') nR += 1; hist.push({ ...V }); update();
    };
    const bL = ctx.button('这一步向左', () => act('L'), true);
    const bR = ctx.button('这一步向右', () => act('R'));
    const b100 = ctx.button('按 b 抽 100 步', () => { for (let i = 0; i < 100 && hist.length <= MAXN; i++) act(R() < pR ? 'R' : 'L'); });
    const b0 = ctx.button('重来', reset);
    let view = 'hit';
    const viewSeg = ctx.segmented([['hit', '到站信号'], ['clock', '时钟']], view, (v) => { view = v; ctx.redraw(); }, '下图显示');
    const read = ctx.readout();
    const box = ctx.steps();
    const setBox = (lines, title) => { box.set(lines, title); box.node.querySelectorAll('li').forEach((li) => { li.style.textAlign = 'left'; }); };
    const top = el('div'), bottom = el('div', { class: 'demo-grid2' }), pane = el('div');
    ctx.stage.append(ctx.row(presetSeg.node), ctx.row(pS.node, aS.node), ctx.row(bL, bR, b100, b0), top, read, bottom);
    bottom.append(pane, box.node);

    /* 上图：J_R 的两条出路与四张表的 J_R 表项（三角是真值）。 */
    ctx.canvas({
      parent: top, aspect: 0.52, maxHeight: 270, minHeight: 230, label: '右灯转角的一条转移与四张预测表',
      draw(g, W, H) {
        const C = ctx.colors(), a = last && last.a;
        const node = (x, y, t, hi) => {
          g.beginPath(); g.arc(x, y, 13, 0, 7); g.fillStyle = C.bg; g.fill();
          g.strokeStyle = hi ? C.accent : C.ink; g.lineWidth = hi ? 2 : 1.2; g.stroke();
          g.fillStyle = C.ink; g.font = ctx.font(12.5, 600); g.textAlign = 'center'; g.textBaseline = 'middle'; subText(g, t, x, y);
        };
        const arrow = (x0, y0, x1, y1, on, label, below) => {
          const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
          const p = [x0 + ux * 15, y0 + uy * 15], q = [x1 - ux * 16, y1 - uy * 16];
          g.strokeStyle = on ? C.series[2] : C.rule; g.fillStyle = g.strokeStyle; g.lineWidth = on ? 2.4 : 1.3;
          g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
          g.beginPath(); g.moveTo(q[0] + ux * 5, q[1] + uy * 5); g.lineTo(q[0] - ux * 3 - uy * 4, q[1] - uy * 3 + ux * 4); g.lineTo(q[0] - ux * 3 + uy * 4, q[1] - uy * 3 - ux * 4); g.closePath(); g.fill();
          g.font = ctx.font(11, on ? 600 : 400); g.fillStyle = on ? C.ink : C.muted; g.textAlign = 'center';
          g.textBaseline = below ? 'top' : 'bottom'; g.fillText(label, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + (below ? 5 : -5));
        };
        const my = 38, xJ = Math.max(34, W * 0.16), xE = W * 0.72;
        arrow(xJ, my, xE, my - 22, a === 'R', `右，b = ${num(pR, 2)}：到 B`, false);
        arrow(xJ, my, xE, my + 22, a === 'L', `左，b = ${num(1 - pR, 2)}：到 W`, true);
        node(xJ, my, 'J_R', !!a); node(xE, my - 22, 'B', a === 'R'); node(xE, my + 22, 'W', a === 'L');
        g.font = ctx.font(10.5); g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'middle';
        if (xE + 20 + 70 < W) { g.fillText('V(W,1) = .2', xE + 20, my + 16); g.fillText('V(W) = 1.5', xE + 20, my + 30); }

        const Lw = Math.min(118, W * 0.3), Rm = 52, bw = W - Lw - Rm, y0 = 92, rh = (H - y0 - 6) / 4;
        DEMONS.forEach((d, i) => {
          const y = y0 + i * rh, bh = Math.min(13, rh * 0.36), top = d.kind === 'hit' ? 2 : 4, X = (v) => Lw + Math.max(0, Math.min(1, v / top)) * bw;
          const col = d.pol === 'b' ? C.series[3] : C.series[2], row = last && last.rows[i], wrote = row && row.rho > 0;
          g.font = ctx.font(11.5, wrote ? 600 : 400); g.fillStyle = wrote ? C.ink : C.soft; g.textAlign = 'left'; g.textBaseline = 'middle';
          subText(g, d.short, 0, y + bh / 2);
          g.font = ctx.font(10); g.fillStyle = C.muted;
          const cov = d.pol === 'R' && pR === 0;
          g.fillText(cov ? '未覆盖' : row ? `ρ = ${num(row.rho, 2)}` : '', 0, y + bh / 2 + 14);
          g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(Lw, y, bw, bh);
          if (row) { g.globalAlpha = 0.28; g.fillStyle = col; g.fillRect(Lw, y, X(row.before) - Lw, bh); g.globalAlpha = 1; }
          g.fillStyle = col; g.fillRect(Lw, y + bh * 0.25, X(V[d.id]) - Lw, bh * 0.5);
          const tx = X(model.truth(d.id, pR));
          g.fillStyle = C.ink; g.beginPath(); g.moveTo(tx, y + bh + 1); g.lineTo(tx - 4, y + bh + 7); g.lineTo(tx + 4, y + bh + 7); g.closePath(); g.fill();
          g.font = ctx.font(9.5); g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'top';
          g.fillText('0', Lw, y + bh + 2); g.fillText(String(top), Lw + bw, y + bh + 2);
          g.font = ctx.font(11.5, 600, true); g.fillStyle = Math.abs(V[d.id]) > top || V[d.id] < 0 ? C.warn : C.ink; g.textAlign = 'left'; g.textBaseline = 'middle';
          g.fillText(num(V[d.id], 3), Lw + bw + 6, y + bh / 2);
        });
      },
    });

    /* 下图：J_R 表项随更新次数的变化。 */
    ctx.canvas({
      parent: pane, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '右灯转角表项随更新次数的变化',
      draw(g, W, H) {
        const C = ctx.colors(), n = Math.max(20, hist.length - 1), [ib, iR] = view === 'hit' ? ['hitB', 'hitR'] : ['clkB', 'clkR'];
        const lo = view === 'hit' ? -0.2 : 0, hi = view === 'hit' ? 2 : 4;
        const clamp = (v) => (Number.isFinite(v) ? Math.max(lo - 1, Math.min(hi + 1, v)) : NaN);
        const series = [
          { data: hist.map((h, k) => [k, clamp(h[ib])]), color: C.series[3], width: 2 },
          { data: hist.map((h, k) => [k, clamp(h[iR])]), color: C.series[2], width: 2 },
        ];
        const hl = [{ y: model.truth(iR, pR), color: C.series[2], label: '离策略真值 1' }, { y: model.truth(ib, pR), color: C.series[3], label: `同策略真值 ${num(model.truth(ib, pR), 2)}` }];
        const fx = model.fixed(ib, pR);
        if (Math.abs(fx - model.truth(ib, pR)) > 1e-9) hl.push({ y: fx, color: C.muted });
        ctx.plot(g, W, H, { series, xmin: 0, xmax: n, ymin: lo, ymax: hi, xlabel: '更新次数', ylabel: view === 'hit' ? '右灯转角：到站信号' : '右灯转角：时钟', xticks: 4, yticks: 4, hlines: hl, pad: { l: 50 } });
      },
    });
    pane.append(ctx.row(viewSeg.node), ctx.legend([['var(--d4)', '同策略 π = b'], ['var(--d3)', [ '离策略 π', el('sub', { text: 'R' }), '（总向右）' ]], ['var(--muted)', '灰虚线：W 旧值不改时同策略表的极限']]));

    function update() {
      bR.disabled = pR === 0; bL.disabled = pR === 1;
      const k = hist.length - 1;
      read.innerHTML = ctx.m(`已更新 ${k} 次，其中向右 ${nR} 次。` + (pR === 0 ? '行为从不向右，π_R 的两张表没有可用的样本（覆盖不满足）。' : `向右时 ρ = 1/${num(pR, 2)} = ${num(1 / pR, 3)}，αρ = ${num(alpha / pR, 3)}${alpha / pR >= 2 ? '，到站信号的离策略表会越过 1 后来回跳或发散' : ''}。`));
      const lines = [];
      if (!last) {
        lines.push(['W 的旧值（本演示不改）', `V(W,1) = ${num(OLD_W.hit)}，V(W) = ${num(OLD_W.clock)}`]);
        lines.push(['目标', 'y = C + Γ V(后继)，δ = y − V(J_R)']);
        lines.push(['写入', 'V(J_R) ← V(J_R) + αρδ，ρ = π(A | J_R) / b(A | J_R)']);
        setBox(lines, '计算过程　尚未更新');
        ctx.redraw();
        return;
      }
      lines.push([`第 ${k} 次：向${last.a === 'R' ? '右，到 B，两类问题都停' : '左，到 W'}`, last.a === 'R' ? '(C, Γ) = (1, 0)' : '到站 (0, 1)，时钟 (1, 1)']);
      last.rows.forEach((r, i) => {
        const d = DEMONS[i];
        const nm = d.name.replace('π_R', '$π_R$');
        if (r.rho === 0) { lines.push([`${nm}：ρ = 0，不写`, null]); return; }
        const yExpr = r.G === 0 ? `y = ${num(r.C)}` : `y = ${num(r.C)} + ${num(OLD_W[d.kind])} = ${num(r.y, 3)}`;
        lines.push([`${nm}：ρ = ${num(r.rho, 3)}，$V(J_R)$ 由 ${num(r.before, 3)} 写成 ${num(r.after, 3)}`, `${yExpr}，δ = ${sgn(+r.delta.toFixed(3))}`]);
      });
      if (pR > 0) lines.push(['对行为求平均的离策略增量', `${num(pR, 2)} × ${num(1 / pR, 3)} × αδ + ${num(1 - pR, 2)} × 0 = αδ`]);
      setBox(lines, `计算过程　α = ${num(alpha, 2)}`);
      ctx.redraw();
    }
    reset();
  });
})();
