/* 第 7 章 7.2 节：λ-回报的权重与合成（“λ-回报的水桶”“为什么取几何权重”）。
 * 泥地回合 S7 → S4 → … → S4 → G，只有末步奖励 1，γ = .9；冻结表 V(S7) = .4、V(S4) 可调（正文 .5）。
 * 回合共 L 步：t = 0 在 S7，t = 1…L−1 在 S4。正文的回合 L = 4，S4 访问三次。 */
(() => {
  const GAMMA = 0.9, V_TRUE = [9 / 19, 10 / 19]; // [S7, S4]
  /* 从第 k 次访问起的各深度回报 G_{k:k+n}，n = 1…L−k；最后一项是完整回报 */
  function nstep(k, L, V4, g = GAMMA) {
    const out = [];
    for (let n = 1; n <= L - k; n++) out.push(n < L - k ? g ** n * V4 : g ** (L - k - 1));
    return out;
  }
  function weights(lam, Lk) {
    const w = [];
    for (let n = 1; n <= Lk; n++) w.push(n < Lk ? (1 - lam) * lam ** (n - 1) : lam ** (Lk - 1));
    return w;
  }
  function lambdaReturn(k, L, V4, lam) {
    const G = nstep(k, L, V4), w = weights(lam, L - k);
    return G.reduce((s, x, i) => s + w[i] * x, 0);
  }
  /* 一步递推 G_t^λ = R_{t+1} + γ[(1−λ)V(S_{t+1}) + λ G_{t+1}^λ]，从终点倒推 */
  function recursion(L, V4, lam) {
    const G = new Array(L);
    G[L - 1] = 1;
    for (let t = L - 2; t >= 0; t--) G[t] = GAMMA * ((1 - lam) * V4 + lam * G[t + 1]);
    return G;
  }
  const cLambda = (lam) => ((1 - lam) * GAMMA) / (1 - GAMMA * lam);
  const cOmega = (w) => w.slice(0, -1).reduce((s, x, i) => s + x * GAMMA ** (i + 1), 0);
  const meanDepth = (w) => w.reduce((s, x, i) => s + x * (i + 1), 0);
  const model = { GAMMA, V_TRUE, nstep, weights, lambdaReturn, recursion, cLambda, cOmega, meanDepth };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('lambda-return', (ctx) => {
    ctx.stage.style.textAlign = 'left'; // 页面正文两端对齐，计算过程里的长说明会被拉开字距
    const { fmt } = ctx;
    const V7 = 0.4;
    let lam = 0.8, V4 = 0.5, m = 3, k = 0;
    const L = () => m + 1;
    const lamS = ctx.slider({ label: 'λ', min: 0, max: 1, step: 0.01, value: lam, format: (x) => fmt(x, 2), oninput: (x) => { lam = x; upd(); } });
    const vS = ctx.slider({ label: 'V(S4)', min: 0, max: 1, step: 0.01, value: V4, format: (x) => fmt(x, 2), oninput: (x) => { V4 = x; upd(); } });
    const mS = ctx.slider({ label: 'S4 访问次数', min: 1, max: 10, step: 1, value: m, format: String, oninput: (x) => { m = x; kIn.max = String(m); if (k > m) { k = m; kS.value = k; } upd(); } });
    const kS = ctx.slider({ label: '起点：第 k 步的访问', min: 0, max: m, step: 1, value: k, format: (x) => (x === 0 ? '0（S7）' : `${x}（S4）`), oninput: (x) => { k = x; upd(); } });
    const kIn = kS.node.querySelector('input');
    const bReset = ctx.button('回到正文的回合', () => { lam = 0.8; V4 = 0.5; m = 3; k = 0; lamS.value = lam; vS.value = V4; mS.value = m; kIn.max = '3'; kS.value = 0; upd(); });
    const read = ctx.readout(), st = ctx.steps();
    ctx.stage.append(ctx.row(lamS.node, vS.node), ctx.row(mS.node, kS.node), ctx.row(bReset));

    ctx.canvas({
      aspect: 0.48, maxHeight: 300, minHeight: 230, label: '各深度分到的权重（柱）与该深度的回报（点），横线是 λ-回报',
      draw(G, w, h) {
        const C = ctx.colors(), Lk = L() - k, Gs = nstep(k, L(), V4), W = weights(lam, Lk), glam = lambdaReturn(k, L(), V4, lam);
        const slots = Math.max(Lk + 4, 8), P = { l: 40, r: 10, t: 14, b: 34 };
        const sw = (w - P.l - P.r) / slots, X = (n) => P.l + (n - 0.5) * sw, Y = (y) => P.t + (1 - y) * (h - P.t - P.b);
        G.font = ctx.font(11); G.textAlign = 'right'; G.textBaseline = 'middle';
        for (const v of [0, 0.25, 0.5, 0.75, 1]) { G.strokeStyle = C.line; G.beginPath(); G.moveTo(P.l, Y(v)); G.lineTo(w - P.r, Y(v)); G.stroke(); G.fillStyle = C.muted; G.fillText(String(v), P.l - 5, Y(v)); }
        const bw = Math.min(28, sw * 0.62);
        // 回合若不结束，深度 n ≥ L−k 本该分到的几何权重：虚框，合起来就是终点那一柱
        for (let n = Lk; n <= slots; n++) {
          const ww = (1 - lam) * lam ** (n - 1);
          G.save(); G.setLineDash([3, 3]); G.strokeStyle = C.muted; G.strokeRect(X(n) - bw / 2, Y(ww), bw, Y(0) - Y(ww)); G.restore();
        }
        W.forEach((ww, i) => {
          const n = i + 1, term = n === Lk;
          G.fillStyle = ctx.mix(term ? C.series[2] : C.series[0], C.bg, 0.45);
          G.fillRect(X(n) - bw / 2, Y(ww), bw, Y(0) - Y(ww));
          if (sw > 30) { G.fillStyle = C.ink; G.textAlign = 'center'; G.textBaseline = 'bottom'; G.fillText(fmt(ww, 3), X(n), Y(ww) - 2); }
        });
        // 回报的点：自举的圆点、完整回报的方块
        G.strokeStyle = C.series[3]; G.lineWidth = 1.2; G.beginPath();
        Gs.forEach((y, i) => (i ? G.lineTo(X(i + 1), Y(y)) : G.moveTo(X(i + 1), Y(y)))); G.stroke();
        Gs.forEach((y, i) => {
          G.fillStyle = C.series[3];
          if (i === Gs.length - 1) G.fillRect(X(i + 1) - 5, Y(y) - 5, 10, 10); else { G.beginPath(); G.arc(X(i + 1), Y(y), 4.5, 0, 2 * Math.PI); G.fill(); }
        });
        const hline = (y, col, txt, dash) => {
          G.save(); if (dash) G.setLineDash([5, 4]); G.strokeStyle = col; G.lineWidth = 2; G.beginPath(); G.moveTo(P.l, Y(y)); G.lineTo(w - P.r, Y(y)); G.stroke(); G.restore();
          G.fillStyle = col; G.textAlign = 'right'; G.textBaseline = 'bottom'; G.fillText(txt, w - P.r, Y(y) - 2);
        };
        hline(glam, C.series[1], `G^λ = ${fmt(glam, 4)}`, false);
        hline(V_TRUE[k ? 1 : 0], C.muted, `真值 ${fmt(V_TRUE[k ? 1 : 0], 4)}`, true);
        G.fillStyle = C.muted; G.textAlign = 'center'; G.textBaseline = 'top';
        for (let n = 1; n <= slots; n++) G.fillText(n === Lk ? '终点' : String(n), X(n), h - P.b + 4);
        G.textBaseline = 'bottom'; G.fillText('深度 n', P.l + (w - P.l - P.r) / 2, h);
        G.strokeStyle = C.rule; G.lineWidth = 1; G.beginPath(); G.moveTo(P.l, P.t); G.lineTo(P.l, Y(0)); G.lineTo(w - P.r, Y(0)); G.stroke();
      },
    });
    ctx.stage.append(ctx.legend([['var(--d1)', '在深度 n 自举的权重 (1−λ)λⁿ⁻¹'], ['var(--d3)', '终点余量 λᴸ⁻ᵏ⁻¹'], ['var(--muted)', '虚框：回合若不结束时的几何权重'], ['var(--d4)', '回报 Gₖ:ₖ₊ₙ（方块为完整回报）'], ['var(--d2)', 'λ-回报']]), read, st.node);

    function upd() { ctx.redraw(); show(); }
    function show() {
      const Lk = L() - k, Gs = nstep(k, L(), V4), W = weights(lam, Lk), glam = lambdaReturn(k, L(), V4, lam), Vk = k ? V4 : V7;
      read.innerHTML = `权重和 <b>${fmt(W.reduce((s, x) => s + x, 0), 3)}</b>；这条行程上按权重平均的深度 <b>${fmt(meanDepth(W), 3)}</b> 步（回合不结束时 1/(1−λ) = ${lam < 1 ? fmt(1 / (1 - lam), 2) : '∞'}）` +
        `<br>尾值误差的系数：本行程 c<sub>ω</sub> = <b>${fmt(cOmega(W), 6)}</b>，无限行程 c<sub>λ</sub> = (1−λ)γ/(1−γλ) = <b>${fmt(cLambda(lam), 3)}</b>`;
      const rows = W.map((ww, i) => [i + 1, ww, Gs[i]]), show6 = rows.length <= 6 ? rows : [...rows.slice(0, 4), null, rows[rows.length - 1]];
      const lines = [['定义：$G_k^λ = (1−λ) Σ_{n=1}^{L−1} λ^{n−1} G_{k:k+n} + λ^{L−1} G_k$，此处 $L = T − k = ' + Lk + '$', 'G_{k:k+n} = γ^n V(S4)（n < L），G_k = γ^{L−1} · 1']];
      for (const r of show6) {
        if (!r) { lines.push(['…', '']); continue; }
        const [n, ww, g] = r, term = n === Lk;
        lines.push([term ? `终点：余量 $λ^{${Lk - 1}}$ 给完整回报` : `深度 ${n}：权重 $(1−λ)λ^{${n - 1}}$`, { html: ctx.m(`${fmt(ww, 4)} × ${fmt(g, 4)} = `) + `<b>${fmt(ww * g, 6)}</b>` }]);
      }
      lines.push(['相加', { html: ctx.m('G_' + k + '^λ = ') + `<b>${fmt(glam, 6)}</b>` + ctx.m(`，比 V(S_${k}) = ${fmt(Vk, 2)} 高 ${fmt(glam - Vk, 6)}`) }]);
      const rec = recursion(L(), V4, lam);
      lines.push(['一步递推核对：$G_t^λ = R_{t+1} + γ[(1−λ)V(S_{t+1}) + λG_{t+1}^λ]$，从终点倒推', { html: rec.map((g, t) => ctx.m(`G_${t}^λ = `) + `<b>${fmt(g, 4)}</b>`).reverse().join('，') }]);
      st.set(lines, `计算过程　λ = ${fmt(lam, 2)}，起点第 ${k} 步（${k ? 'S4' : 'S7'}）`);
    }
    show();
  });
})();
