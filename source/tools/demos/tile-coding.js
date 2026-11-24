/* 第 9 章：一维瓦片编码的一次梯度更新波及哪里（9.1 节“瓦片编码与局部泛化”）。
 * 特征同 demos/deep_v13_connections.py 的 tile_features：输入 s∈[0,1)，κ 层网格，瓦片宽 w，
 * 第 k 层错开 k·w/κ；线性估计 v̂(s,w)=Σ_i w_i x_i(s)，更新 w ← w + α[U − v̂(s,w)]x(s)，α=ᾱ/κ。
 * 正文的数：κ=4、宽 .25、s=.53、δ=2、α=.05，激活权重各加 .1，s 处升高 .4。 */
(() => {
  function layout(K, width) { return { K, width, per: Math.floor(1 / width) + 2 }; }
  /* 第 k 层激活的瓦片编号 j 与它覆盖的区间 [lo, hi)。 */
  function tile(L, s, k) {
    const off = (k * L.width) / L.K, j = Math.floor((s + off) / L.width);
    return { k, j, index: k * L.per + j, lo: j * L.width - off, hi: (j + 1) * L.width - off };
  }
  const active = (L, s) => Array.from({ length: L.K }, (_, k) => tile(L, s, k));
  const predict = (L, W, s) => active(L, s).reduce((x, t) => x + W[t.index], 0);
  const overlap = (L, s, u) => active(L, s).filter((t, k) => tile(L, u, k).j === t.j).length;
  function update(L, W, s, U, abar) {
    const alpha = abar / L.K, tiles = active(L, s), v = predict(L, W, s), delta = U - v;
    const before = tiles.map((t) => W[t.index]);
    for (const t of tiles) W[t.index] += alpha * delta;
    return { s, U, v, delta, alpha, abar, tiles, before, after: predict(L, W, s) };
  }
  const zeros = (L) => new Float64Array(L.K * L.per);
  /* 两个目标：正文那次更新用的常数 2；反复采样用的带跳变曲线。 */
  const TARGETS = { const: () => 2, jump: (s) => Math.sin(2 * Math.PI * s) + (s >= 0.7 ? 1.5 : 0) };
  function rmse(L, W, f, n = 400) {
    let e = 0;
    for (let i = 0; i < n; i++) { const s = (i + 0.5) / n; e += (predict(L, W, s) - f(s)) ** 2; }
    return Math.sqrt(e / n);
  }

  const model = { layout, tile, active, predict, overlap, update, zeros, TARGETS, rmse };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('tile-coding', (ctx) => {
    const { el, fmt } = ctx;
    let K = 4, width = 0.25, abar = 0.2, target = 'const', s = 0.53;
    let L = layout(K, width), W = zeros(L), last = null, nUpd = 0, prevW = null;
    let R = ctx.rng(11);
    const f = () => TARGETS[target];

    function reset() { L = layout(K, width); W = zeros(L); last = null; prevW = null; nUpd = 0; R = ctx.rng(11); samp.stop(); ctx.redraw(); show(); }
    function once(x) {
      s = Math.min(0.999, Math.max(0, x)); sS.value = s;
      prevW = W.slice(); last = update(L, W, s, f()(s), abar); nUpd++;
      ctx.redraw(); show();
    }

    const tSeg = ctx.segmented([['const', '目标 U = 2'], ['jump', '目标 U = f(s)（有跳变）']], target, (v) => { target = v; reset(); }, '更新目标');
    const kS = ctx.slider({ label: '层数 κ', min: 1, max: 8, step: 1, value: K, oninput: (x) => { K = x; reset(); } });
    const wS = ctx.slider({ label: '瓦片宽', min: 0.05, max: 0.5, step: 0.05, value: width, format: (x) => x.toFixed(2), oninput: (x) => { width = x; reset(); } });
    const aS = ctx.slider({ label: 'ᾱ', min: 0.05, max: 1, step: 0.05, value: abar, format: (x) => x.toFixed(2), oninput: (x) => { abar = x; show(); } });
    const sS = ctx.slider({ label: '输入 s', min: 0, max: 0.99, step: 0.01, value: s, format: (x) => x.toFixed(2), oninput: (x) => { s = x; ctx.redraw(); show(); } });
    const upBtn = ctx.button('在 s 更新一次', () => { samp.stop(); once(s); }, true);
    const sampBtn = ctx.button('随机采样 200 次', () => (samp.running ? samp.stop() : (todo = 200, samp.start())));
    const resetBtn = ctx.button('清零', reset);
    let todo = 0;
    const samp = ctx.loop(() => {
      const n = ctx.reduced() ? 1 : 4;
      for (let i = 0; i < n && todo > 0; i++, todo--) { const x = R(); prevW = W.slice(); s = x; last = update(L, W, x, f()(x), abar); nUpd++; }
      sS.value = s; ctx.redraw(); show();
      return todo > 0;
    });
    samp.onstop = () => (sampBtn.textContent = '随机采样 200 次');
    const _st = samp.start;
    samp.start = () => { sampBtn.textContent = '暂停'; _st(); };

    const read = ctx.readout(), stepsBox = ctx.steps();
    const top = el('div'), bot = el('div');
    ctx.stage.append(ctx.row(tSeg.node), top, bot, ctx.row(upBtn, sampBtn, resetBtn), ctx.row(sS.node, kS.node, wS.node, aS.node), read, stepsBox.node);

    const PAD = { l: 40, r: 10 };
    /* 上图：κ 层错位网格，深色是含当前输入 s 的瓦片，竖线是 s */
    ctx.canvas({
      parent: top, aspect: 0.26, maxHeight: 190, minHeight: 120, label: '各层瓦片网格与输入 s 激活的瓦片',
      draw(G, w, h) {
        const C = ctx.colors(), x0 = PAD.l, x1 = w - PAD.r, X = (u) => x0 + u * (x1 - x0);
        const rh = Math.min(22, (h - 8) / K), y0 = (h - rh * K) / 2;
        const act = active(L, s);
        G.font = ctx.font(11); G.textAlign = 'right'; G.textBaseline = 'middle';
        for (let k = 0; k < K; k++) {
          const y = y0 + k * rh, off = (k * width) / K;
          G.fillStyle = C.muted; G.fillText(`第${k + 1}层`, x0 - 4, y + rh / 2);
          for (let j = 0; j * width - off < 1; j++) {
            const lo = Math.max(0, j * width - off), hi = Math.min(1, (j + 1) * width - off);
            if (hi <= 0) continue;
            const on = act[k].j === j;
            G.fillStyle = on ? C.accent : ctx.mix(C.bg, C.ink, 0.06);
            G.fillRect(X(lo) + 1, y + 2, X(hi) - X(lo) - 2, rh - 4);
          }
        }
        G.strokeStyle = C.series[2]; G.lineWidth = 2;
        G.beginPath(); G.moveTo(X(s), y0 - 3); G.lineTo(X(s), y0 + rh * K + 3); G.stroke();
      },
    });
    /* 下图：估计 v̂(·,w)（蓝）、目标（灰虚线）；橙色柱是最近一次更新的改变量 Δv̂(u) */
    const bc = ctx.canvas({
      parent: bot, aspect: 0.45, maxHeight: 300, minHeight: 200, label: '价值估计曲线与最近一次更新的改变量',
      draw(G, w, h) {
        const C = ctx.colors(), n = 300, us = Array.from({ length: n }, (_, i) => (i + 0.5) / n);
        const [ymin, ymax] = target === 'const' ? [-0.2, 2.4] : [-1.4, 2.8];
        const P = ctx.plot(G, w, h, {
          series: [
            { data: us.map((u) => [u, f()(u)]), color: C.muted, dash: [5, 4], width: 1.4 },
            { data: us.map((u) => [u, predict(L, W, u)]), color: C.series[0], width: 2.2 },
          ],
          xmin: 0, xmax: 1, ymin, ymax, xlabel: '输入 s', ylabel: 'v̂(s,w)', pad: PAD,
        });
        if (prevW) {
          G.fillStyle = ctx.mix(C.bg, C.series[1], 0.55);
          const bw = (P.X(1) - P.X(0)) / n;
          for (const u of us) {
            const d = predict(L, W, u) - predict(L, prevW, u);
            if (Math.abs(d) < 1e-12) continue;
            const ya = P.Y(0), yb = P.Y(d);
            G.fillRect(P.X(u) - bw / 2, Math.min(ya, yb), bw + 0.5, Math.abs(yb - ya));
          }
          G.strokeStyle = C.series[0]; G.lineWidth = 2.2; G.beginPath();
          us.forEach((u, i) => { const y = P.Y(predict(L, W, u)); i ? G.lineTo(P.X(u), y) : G.moveTo(P.X(u), y); }); G.stroke();
        }
        G.strokeStyle = C.series[2]; G.lineWidth = 1.5; G.setLineDash([3, 3]);
        G.beginPath(); G.moveTo(P.X(s), P.Y(ymax)); G.lineTo(P.X(s), P.Y(ymin)); G.stroke(); G.setLineDash([]);
        bc.P = P;
      },
    });
    bc.cv.style.cursor = 'crosshair';
    bc.cv.addEventListener('click', (e) => {
      if (!bc.P) return;
      const r = bc.cv.getBoundingClientRect(), x = (e.clientX - r.left - bc.P.X(0)) / (bc.P.X(1) - bc.P.X(0));
      if (x < 0 || x > 1) return;
      samp.stop(); once(Math.round(x * 100) / 100);
    });
    bot.append(ctx.legend([['var(--d1)', '估计 v̂(s,w)'], ['var(--muted)', '目标 U'], ['var(--d2)', '最近一次更新的改变量 Δv̂'], ['var(--d3)', '输入 s']]));

    const f3 = (x) => fmt(x, 3);
    function show() {
      read.innerHTML = `κ = <b>${K}</b> 层，宽 <b>${width.toFixed(2)}</b>，参数共 <b>${K * L.per}</b> 个；α = ᾱ/κ = <b>${fmt(abar / K, 4)}</b>　已更新 <b>${nUpd}</b> 次` +
        `　与目标的均方根误差 <b>${f3(rmse(L, W, f()))}</b>` +
        '<br><span class="demo-note">点下图任一处，在那里以目标 U 更新一次。</span>';
      const lines = [];
      const shown = last && Math.abs(last.s - s) < 1e-9 ? last : null;
      const tiles = active(L, s), names = tiles.map((t) => `w_{${t.k + 1},${t.j}}`);
      lines.push([`$s$ = ${s.toFixed(2)} 在每层恰落进一块瓦片，$x(s)$ 有 ${K} 个分量为 1：` +
        tiles.map((t) => `第 ${t.k + 1} 层 [${f3(Math.max(0, t.lo))}, ${f3(Math.min(1, t.hi))})`).join('，'), null]);
      const v = shown ? shown.v : predict(L, W, s), U = f()(s), d = U - v, al = abar / K;
      const ws = shown ? shown.before : tiles.map((t) => W[t.index]);
      lines.push(['预测', `v̂(s,w) = Σ_i w_i x_i(s) = ${names.join(' + ')} = ${ws.map(f3).join(' + ')} = ${f3(v)}`]);
      lines.push(['误差', `δ = U − v̂(s,w) = ${f3(U)} − ${f3(v)} = ${f3(d)}`]);
      lines.push(['步长按层数缩放', `α = ᾱ/κ = ${fmt(abar, 2)}/${K} = ${fmt(al, 4)}`]);
      lines.push([`梯度 $∇v̂(s,w) = x(s)$，只有 ${K} 个激活权重改变`, { html: ctx.m(`w_i ← w_i + α·δ·x_i(s) = w_i + ${fmt(al, 4)}·${f3(d)} = w_i + `) + `<b>${fmt(al * d, 4)}</b>` }]);
      lines.push(['波及', { html: ctx.m(`Δv̂(u) = α·δ·x(u)^⊤x(s) = ${fmt(al * d, 4)} × （与 s 共享的瓦片数），s 处 = ${fmt(al * d, 4)} × ${K} = `) + `<b>${f3(al * d * K)}</b>` + ctx.m(` = ᾱδ`) }]);
      stepsBox.set(lines, shown ? `计算过程　刚才在 s = ${s.toFixed(2)} 的更新` : `计算过程　在 s = ${s.toFixed(2)} 更新一次将会怎样`);
    }
    reset();
  });
})();
