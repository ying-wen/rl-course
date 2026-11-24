/* 第 9 章：半梯度 TD 的目标跟着预测移动（9.1 节“目标跟着预测移动”）。
 * 同一转移反复更新：预测升高 αδ x(s)ᵀx(s)，目标升高 αδ γ x(s')ᵀx(s)，
 * 新误差 δ⁺ = δ[1 − α x(s)ᵀx(s)(1 − χ)]，χ = γ x(s')ᵀx(s) / x(s)ᵀx(s)。
 * 正文三行：聚合 13→14（χ=0，.2→.18）；瓦片 16→17（χ=.5，.2→.19）；两状态离策略例 s0→s1（χ=1.8，.8→.864）。 */
(() => {
  const PRESETS = {
    agg: { name: '状态聚合 13→14', alpha: 0.1, xx: 1, xpx: 0, gamma: 1, pred: 0, targ: 0.2 },
    tile: { name: '瓦片编码 16→17', alpha: 0.05, xx: 2, xpx: 1, gamma: 1, pred: 0, targ: 0.2 },
    two: { name: '两状态离策略例 s₀→s₁', alpha: 0.1, xx: 1, xpx: 2, gamma: 0.9, pred: 1, targ: 1.8 },
  };
  const rhoOf = (P) => (P.gamma * P.xpx) / P.xx;
  /* 一次半梯度更新：c = α x(s)ᵀx(s) 是预测移动的比例，目标移动预测的 χ 倍。 */
  function update(st, c, rho) {
    const delta = st.targ - st.pred;
    return { pred: st.pred + c * delta, targ: st.targ + rho * c * delta, delta, deltaNew: delta * (1 - c * (1 - rho)) };
  }
  const model = { PRESETS, rhoOf, update };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('fa-moving-target', (ctx) => {
    const { el, fmt } = ctx, KMAX = 30;
    let key = 'two', rho = rhoOf(PRESETS.two), hist = [], frozen = [];
    const P = () => PRESETS[key], c = () => P().alpha * P().xx;
    function reset() {
      anim.stop();
      hist = [{ pred: P().pred, targ: P().targ }]; frozen = [{ pred: P().pred, targ: P().targ }];
      ctx.redraw(); show();
    }
    function once() {
      if (hist.length > KMAX) return false;
      const h = hist[hist.length - 1], f = frozen[frozen.length - 1];
      hist.push(update(h, c(), rho)); frozen.push(update(f, c(), 0));
      ctx.redraw(); show();
      return hist.length <= KMAX;
    }
    const seg = ctx.segmented(Object.keys(PRESETS).map((k) => [k, PRESETS[k].name]), key, (k) => { key = k; rho = rhoOf(P()); rS.value = rho; reset(); }, '正文表中的三个转移');
    const rS = ctx.slider({ label: '目标被带动的比例 χ', min: 0, max: 2.5, step: 0.05, value: rho, format: (x) => x.toFixed(2), oninput: (x) => { rho = x; reset(); } });
    const oneBtn = ctx.button('在这条转移上更新一次', () => { anim.stop(); once(); }, true);
    const runBtn = ctx.button('连续更新', () => (anim.running ? anim.stop() : anim.start()));
    const resetBtn = ctx.button('重置', reset);
    let acc = 0;
    const anim = ctx.loop((dt) => { acc += dt * (ctx.reduced() ? 2 : 8); let go = true; while (acc >= 1 && go) { acc -= 1; go = once(); } return go; });
    anim.onstop = () => (runBtn.textContent = '连续更新');
    const _st = anim.start; anim.start = () => { if (hist.length > KMAX) reset(); runBtn.textContent = '暂停'; _st(); };

    const read = ctx.readout(), stepsBox = ctx.steps(), top = el('div'), bot = el('div');
    ctx.stage.append(ctx.row(seg.node), ctx.row(rS.node), top, ctx.row(oneBtn, runBtn, resetBtn), bot, read, stepsBox.node);

    /* 上图：数轴上的预测（圆点）与目标（方块），浅色是此前各次的位置，横线长度是误差 δ */
    ctx.canvas({
      parent: top, aspect: 0.22, maxHeight: 150, minHeight: 110, label: '数轴上的预测与目标，横线长度是 TD 误差',
      draw(G, w, h) {
        const C = ctx.colors(), xs = hist.flatMap((s) => [s.pred, s.targ]);
        let lo = Math.min(...xs), hi = Math.max(...xs); const pad = (hi - lo) * 0.08 + 1e-3; lo -= pad; hi += pad;
        const X = (v) => 16 + ((v - lo) / (hi - lo)) * (w - 32), y = h * 0.5;
        G.strokeStyle = C.rule; G.lineWidth = 1; G.beginPath(); G.moveTo(10, y); G.lineTo(w - 10, y); G.stroke();
        G.font = ctx.font(11); G.fillStyle = C.muted; G.textAlign = 'center'; G.textBaseline = 'top';
        for (const v of [lo + pad, hi - pad]) { G.fillText(fmt(v, 3), X(v), y + 16); G.beginPath(); G.moveTo(X(v), y - 4); G.lineTo(X(v), y + 4); G.stroke(); }
        hist.forEach((s, i) => {
          const last = i === hist.length - 1, t = last ? 1 : 0.25;
          G.fillStyle = ctx.mix(C.bg, C.series[0], t); G.beginPath(); G.arc(X(s.pred), y, last ? 6 : 4, 0, 7); G.fill();
          G.fillStyle = ctx.mix(C.bg, C.series[1], t); const r = last ? 6 : 4; G.fillRect(X(s.targ) - r, y - r, 2 * r, 2 * r);
          if (last) {
            G.strokeStyle = C.series[2]; G.lineWidth = 3; G.beginPath(); G.moveTo(X(s.pred), y - 14); G.lineTo(X(s.targ), y - 14); G.stroke();
            G.fillStyle = C.ink; G.textBaseline = 'bottom'; G.fillText(`δ = ${fmt(s.targ - s.pred, 4)}`, (X(s.pred) + X(s.targ)) / 2, y - 18);
          }
        });
      },
    });
    top.append(ctx.legend([['var(--d1)', '预测 v̂(s,w)'], ['var(--d2)', '目标 R + γv̂(s′,w)'], ['var(--d3)', '误差 δ']]));
    /* 下图：|δ_k|/|δ_0|，对数纵轴；实线是移动目标，虚线是目标冻结（χ=0） */
    ctx.canvas({
      parent: bot, aspect: 0.42, maxHeight: 260, minHeight: 190, label: '误差比随更新次数的变化，移动目标与冻结目标对照',
      draw(G, w, h) {
        const C = ctx.colors(), d0 = Math.abs(hist[0].targ - hist[0].pred);
        const ser = (arr) => arr.map((s, i) => [i, Math.log10(Math.max(1e-9, Math.abs(s.targ - s.pred) / d0))]);
        ctx.plot(G, w, h, {
          series: [{ data: ser(frozen), color: C.muted, dash: [5, 4], width: 1.5 }, { data: ser(hist), color: C.series[2], width: 2.6 }],
          xmin: 0, xmax: KMAX, ymin: -1.5, ymax: 1.5, xlabel: '在同一转移上的更新次数 k', ylabel: 'log₁₀ |δ_k/δ_0|', hlines: [{ y: 0, label: '误差不变' }],
        });
      },
    });
    bot.append(ctx.legend([['var(--d3)', '目标跟着移动（当前 χ）'], ['var(--muted)', '目标冻结（χ = 0）']]));

    const f3 = (x) => fmt(x, 3), f4 = (x) => fmt(x, 4);
    function show() {
      const p = P(), cc = c(), cur = hist[hist.length - 1], k = hist.length - 1, d = cur.targ - cur.pred, mult = 1 - cc * (1 - rho);
      const asPreset = Math.abs(rho - rhoOf(p)) < 1e-9;
      read.innerHTML = `第 <b>${k}</b> 次更新后：预测 <b>${f4(cur.pred)}</b>，目标 <b>${f4(cur.targ)}</b>，δ = <b>${f4(d)}</b>；每次误差乘 <b>${f4(mult)}</b>` +
        (mult > 1 ? '，误差变大' : mult === 1 ? '，误差不变' : '，误差缩小');
      const L = [];
      if (asPreset) L.push([`${p.name}：$x(s)^⊤x(s)$ = ${p.xx}，$x(s′)^⊤x(s)$ = ${p.xpx}，$γ$ = ${p.gamma}`, `χ = γ·x(s′)^⊤x(s)/x(s)^⊤x(s) = ${p.gamma}×${p.xpx}/${p.xx} = ${fmt(rho, 2)}`]);
      else L.push(['滑块改了 $χ$，保持本行的 $α x(s)^⊤x(s)$', `χ = ${fmt(rho, 2)}，α·x(s)^⊤x(s) = ${p.alpha}×${p.xx} = ${fmt(cc, 2)}`]);
      L.push(['预测升高', `Δv̂(s) = α·δ·x(s)^⊤x(s) = ${fmt(cc, 2)}×${f4(d)} = ${f4(cc * d)}`]);
      L.push(['目标升高', `Δ[γv̂(s′)] = χ·α·δ·x(s)^⊤x(s) = ${fmt(rho, 2)}×${f4(cc * d)} = ${f4(rho * cc * d)}`]);
      L.push(['新误差', { html: ctx.m(`δ_{k+1} = δ_k[1 − α·x(s)^⊤x(s)(1 − χ)] = ${f4(d)}×[1 − ${fmt(cc, 2)}×(1 − ${fmt(rho, 2)})] = `) + `<b>${f4(d * mult)}</b>` }]);
      L.push(['半梯度把目标当常数，等于假定 $χ=0$ 时的倍数', `1 − α·x(s)^⊤x(s) = ${f4(1 - cc)}`]);
      stepsBox.set(L, `计算过程　下一次（第 ${k + 1} 次）更新`);
    }
    reset();
  });
})();
