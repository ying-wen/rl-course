/* 第 17 章：转角两步预测上逐步写表，比较一步 Sarsa、累积迹、真在线 TD 与重放的在线 λ 回报。
 * 对应 17.1 节“一步 Sarsa 的写入位置”、17.2 节“第 6 步的资格与估值增量”与 17.4 节共用特征的例子：
 * X = (J_R, 向左)，Y = (W, 绕行)，第 5 步得 0，第 6 步得 1 后到站，γ = 1，α = .5，λ = .8。 */
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
  /* 两种特征：两格各一个特征（表格），或两格共用一个特征 x = 1。 */
  const FEATS = {
    table: { X: [1, 0], Y: [0, 1] },
    shared: { X: [1], Y: [1] },
  };
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const axpy = (y, a, x) => y.map((v, i) => v + a * x[i]);
  const model = {
    FEATS,
    /* 一趟两步。w 是本趟开始时的权重；返回每一步写完后的记录。
     * method：'acc' 累积迹（算法 17.1）；'dutch' 真在线 TD（算法 17.2）；'replay' 重放的在线 λ 回报。 */
    trip(w0, { alpha, lam, method, feat }) {
      const F = FEATS[feat], xX = F.X, xY = F.Y, a = alpha, z = xX.map(() => 0);
      const out = [];
      if (method === 'acc') {
        let w = w0.slice(), e = z.slice();
        // 第 5 步：读写入前的表，γ_6 = 1
        const d5 = 0 + dot(w, xY) - dot(w, xX);
        e = axpy(e.map((v) => v * lam * 0), 1, xX); // 首步旧迹为零
        w = axpy(w, a * d5, e);
        out.push({ delta: d5, e: e.slice(), w: w.slice() });
        // 第 6 步：到站，y = 1
        e = axpy(e.map((v) => v * lam), 1, xY);
        const d6 = 1 - dot(w, xY);
        w = axpy(w, a * d6, e);
        out.push({ delta: d6, e: e.slice(), w: w.slice() });
        return out;
      }
      if (method === 'dutch') {
        let w = w0.slice(), e = z.slice(), vold = dot(w, xX);
        const step = (x, r, x2) => {
          const v = dot(w, x), v2 = x2 ? dot(w, x2) : 0, d = r + v2 - vold, xe = dot(x, e);
          e = axpy(e.map((u) => u * lam), 1 - a * lam * xe, x);
          w = axpy(axpy(w, a * d, e), a * (vold - v), x);
          const rec = { delta: r + v2 - v, d, corr: vold - v, e: e.slice(), w: w.slice() };
          vold = v2;
          return rec;
        };
        out.push(step(xX, 0, xY));
        out.push(step(xY, 1, null));
        return out;
      }
      // 重放：每来一条转移，从本趟初值按次序向截至当前能算出的 λ 回报各写一次
      const vh1 = dot(w0, xY); // 转移 0 写入前对 Y 的预报，记录后固定
      const G01 = 0 + vh1;
      const u1a = axpy(w0, a * (G01 - dot(w0, xX)), xX);
      out.push({ delta: G01 - dot(w0, xX), targets: [G01], e: xX.slice(), w: u1a });
      const G12 = 1, G02 = 0 + (1 - lam) * vh1 + lam * G12;
      const u1 = axpy(w0, a * (G02 - dot(w0, xX)), xX);
      const u2 = axpy(u1, a * (G12 - dot(u1, xY)), xY);
      out.push({ delta: G12 - dot(u1, xY), targets: [G02, G12], mid: u1, w: u2 });
      return out;
    },
    q(w, feat) { const F = FEATS[feat]; return [dot(w, F.X), dot(w, F.Y)]; },
    /* 连续 n 趟，每趟末的 (Q(X), Q(Y))；下标 0 是初值。 */
    history(p, n) {
      let w = FEATS[p.feat].X.map(() => 0);
      const H = [model.q(w, p.feat)];
      for (let k = 0; k < n; k++) { const t = model.trip(w, p); w = t[1].w; H.push(model.q(w, p.feat)); }
      return H;
    },
    /* 前向检验：在本趟开始的表上，G_5^λ − Q(X) 与 δ_5 + λδ_6（δ 都按旧表算）。 */
    forward(w0, { lam, feat }) {
      const [x, y] = model.q(w0, feat);
      return { G: (1 - lam) * y + lam * 1, lhs: (y - x) + lam * (1 - y), rhs: (1 - lam) * y + lam - x };
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 4) => {
    if (!Number.isFinite(x)) return '—';
    let s = (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace(/^(-?)0\./, '$1.').replace('-', '−');
  };
  const vec = (v) => (v.length === 1 ? num(v[0]) : `(${v.map((x) => num(x)).join(', ')})`);
  const NAMES = { acc: '累积迹', dutch: '真在线 TD', replay: '在线 λ 回报（重放）' };

  RLDemo.register('ch17-corner-trace', (ctx) => {
    const { el } = ctx;
    const P = { alpha: 0.5, lam: 0.8, method: 'acc', feat: 'table' };
    let w = [0, 0], trip = 1, s = 0, rec = null, w0 = w.slice(); // s：本趟已走的步数 0、1、2

    const reset = () => { w = P.feat === 'table' ? [0, 0] : [0]; w0 = w.slice(); trip = 1; s = 0; rec = null; update(); };
    const featSeg = ctx.segmented([['table', '两格各一个特征'], ['shared', '两格共用一个特征']], P.feat, (v) => { P.feat = v; reset(); }, '特征');
    const methSeg = ctx.segmented(Object.entries(NAMES), P.method, (v) => { P.method = v; reset(); }, '写入方法');
    const aS = ctx.slider({ label: '步长 α', min: 0.05, max: 1, step: 0.05, value: P.alpha, format: (x) => num(x, 2), oninput: (x) => { P.alpha = x; reset(); } });
    const lS = ctx.slider({ label: '迹参数 λ', min: 0, max: 1, step: 0.05, value: P.lam, format: (x) => num(x, 2), oninput: (x) => { P.lam = x; reset(); } });
    const stepOnce = () => {
      if (s === 2) { trip += 1; s = 0; w0 = w.slice(); rec = null; }
      if (s === 0) { rec = model.trip(w0, P); }
      w = rec[s].w.slice(); s += 1; update();
    };
    const stepBtn = ctx.button('走一步', stepOnce, true);
    const tripBtn = ctx.button('走完本趟', () => { if (s === 2) stepOnce(); while (s < 2) stepOnce(); });
    const resetBtn = ctx.button('重来', reset);
    const read = ctx.readout();
    const box = ctx.steps();
    /* 阅读稿正文对 li 两端对齐，计算过程里改为左对齐。 */
    const setBox = (lines, title) => { box.set(lines, title); box.node.querySelectorAll('li').forEach((li) => { li.style.textAlign = 'left'; }); };
    const top = el('div'), bottom = el('div', { class: 'demo-grid2' });
    const pane = el('div');
    ctx.stage.append(ctx.row(featSeg.node), ctx.row(methSeg.node), ctx.row(aS.node, lS.node), ctx.row(stepBtn, tripBtn, resetBtn), top, read, bottom);
    bottom.append(pane, box.node);

    /* 上图：J_R → W → C 两步，下方是表项（或共用权重）与写表时的迹。 */
    ctx.canvas({
      parent: top, aspect: 0.4, maxHeight: 260, minHeight: 210, label: '转角两步的预测：表项与资格迹',
      draw(g, W, H) {
        const C = ctx.colors(), shared = P.feat === 'shared';
        const nodes = [['J_R', 0.14], ['W', 0.5], ['C', 0.86]], ny = 36, r = Math.min(22, W * 0.05);
        g.lineWidth = 1.6;
        for (let i = 0; i < 2; i++) {
          const x0 = W * nodes[i][1] + r + 4, x1 = W * nodes[i + 1][1] - r - 6, active = (s === i + 1);
          g.strokeStyle = active ? C.series[2] : C.rule; g.fillStyle = g.strokeStyle; g.lineWidth = active ? 2.4 : 1.4;
          g.beginPath(); g.moveTo(x0, ny); g.lineTo(x1, ny); g.stroke();
          g.beginPath(); g.moveTo(x1 + 6, ny); g.lineTo(x1 - 2, ny - 4); g.lineTo(x1 - 2, ny + 4); g.closePath(); g.fill();
          g.font = ctx.font(11.5, active ? 600 : 400); g.textAlign = 'center'; g.textBaseline = 'bottom';
          g.fillStyle = active ? C.ink : C.muted;
          g.fillText(i === 0 ? '第 5 步  左' : '第 6 步  绕行', (x0 + x1) / 2, ny - 5);
          g.textBaseline = 'top'; g.fillText(i === 0 ? 'r = 0' : 'r = 1，到站', (x0 + x1) / 2, ny + 6);
        }
        nodes.forEach(([t, fx]) => {
          const x = W * fx; g.beginPath(); g.arc(x, ny, r, 0, 7); g.fillStyle = C.bg; g.fill(); g.strokeStyle = C.ink; g.lineWidth = 1.2; g.stroke();
          g.fillStyle = C.ink; g.font = ctx.font(13, 600); g.textAlign = 'center'; g.textBaseline = 'middle';
          subText(g, t, x, ny);
        });
        // 表项条
        const q = model.q(w, P.feat), e = rec && s > 0 && rec[s - 1].e ? rec[s - 1].e : null;
        const rows = shared ? [['共用权重 w', q[0], e ? e[0] : 0]] : [['Q(X)　X = (J_R, 左)', q[0], e ? e[0] : 0], ['Q(Y)　Y = (W, 绕行)', q[1], e ? e[1] : 0]];
        const L = Math.min(150, W * 0.36), R = 14, bw = W - L - R, y0 = 92, rh = shared ? 52 : 46;
        const X = (v) => L + (v / 2) * bw; // 0…2
        g.strokeStyle = C.line; g.lineWidth = 1; g.font = ctx.font(10.5); g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'top';
        for (const v of [0, 0.5, 1, 1.5, 2]) { g.beginPath(); g.moveTo(X(v), y0 - 6); g.lineTo(X(v), y0 + rows.length * rh - 8); g.stroke(); g.fillText(num(v), X(v), y0 + rows.length * rh - 4); }
        rows.forEach(([lab, val, ev], k) => {
          const y = y0 + k * rh;
          g.fillStyle = C.ink; g.font = ctx.font(12); g.textAlign = 'left'; g.textBaseline = 'middle';
          subText(g, W < 480 ? lab.split('　')[0] : lab, 4, y + 9);
          g.fillStyle = C.accent; g.fillRect(X(0), y + 1, Math.max(0, X(Math.min(2, val)) - X(0)), 15);
          g.fillStyle = C.series[1]; g.fillRect(X(0), y + 20, Math.max(0, X(Math.min(2, ev)) - X(0)), 7);
          g.font = ctx.font(11.5, 600, true); g.textAlign = 'left'; g.fillStyle = C.ink;
          g.fillText(num(val), Math.min(W - 44, X(Math.min(2, val)) + 5), y + 9);
          if (e) { g.font = ctx.font(10.5, 400, true); g.fillStyle = C.series[1]; g.fillText('e ' + num(ev), Math.min(W - 44, X(Math.min(2, ev)) + 5), y + 24); }
        });
      },
    });
    top.append(ctx.legend([['var(--accent)', '写入后的估计'], ['var(--d2)', '本步写表时的迹 e（重放无迹，画所写格的指示）']]));

    /* 下图：每趟末的 Q(X)，三种方法与一步 Sarsa（λ = 0）。 */
    ctx.canvas({
      parent: pane, aspect: 0.62, maxHeight: 260, minHeight: 190, label: '各趟末转角表项的估计',
      draw(g, W, H) {
        const C = ctx.colors(), n = 8;
        const hist = (m, lam) => model.history({ ...P, method: m, lam }, n).map((v, i) => [i, v[0]]);
        const ser = [
          { data: hist('acc', 0), color: C.muted, dash: [5, 4], width: 1.4 },
          { data: hist('replay', P.lam), color: C.series[3], width: 4 },
          { data: hist('dutch', P.lam), color: C.accent, width: 2 },
          { data: hist('acc', P.lam), color: C.series[1], width: 1.6, dash: [2, 2] },
        ];
        const Pl = ctx.plot(g, W, H, { series: ser, xmin: 0, xmax: n, ymin: 0, ymax: 1.25, xlabel: '第几趟之后', ylabel: 'Q(X)', xticks: 4, yticks: 5, pad: { l: 50 },
          hlines: [{ y: 1, color: C.muted, label: '真值 1' }] });
        const done = s === 2 ? trip : trip - 1, mine = model.history(P, n);
        g.fillStyle = C.series[2];
        g.beginPath(); g.arc(Pl.X(done), Pl.Y(mine[done][0]), 4.5, 0, 7); g.fill();
      },
    });
    pane.append(ctx.legend([['var(--d2)', '累积迹'], ['var(--accent)', '真在线 TD'], ['var(--d4)', '在线 λ 回报'], ['var(--muted)', '一步 Sarsa'], ['var(--d3)', '当前']]));

    function update() {
      const q = model.q(w, P.feat), shared = P.feat === 'shared';
      read.innerHTML = `第 ${trip} 趟，${s === 0 ? '尚未出发' : s === 1 ? '第 5 步写完' : '第 6 步写完，到站'}：` +
        (shared ? `共用权重 w = <b>${num(q[0])}</b>` : `(Q(X), Q(Y)) = <b>(${num(q[0])}, ${num(q[1])})</b>`) +
        `　<span class="demo-note">${NAMES[P.method]}，α = ${num(P.alpha, 2)}，λ = ${num(P.lam, 2)}</span>`;
      const a = num(P.alpha, 2), l = num(P.lam, 2), lines = [];
      const qx0 = model.q(w0, P.feat);
      lines.push([`本趟初值`, shared ? `w = ${num(qx0[0])}` : `Q(X) = ${num(qx0[0])}，Q(Y) = ${num(qx0[1])}`]);
      if (s === 0) lines.push(['点“走一步”执行第 5 步 $J_R → W$', null]);
      if (s >= 1) {
        const r = rec[0];
        if (P.method === 'acc') {
          lines.push(['第 5 步，读写入前的表', `δ_5 = 0 + Q(Y) − Q(X) = ${num(r.delta)}`]);
          lines.push(['迹加一后写表', `e = ${vec(r.e)}，${shared ? 'w' : 'Q'} ← ${shared ? 'w' : 'Q'} + ${a}×${num(r.delta)}×e = ${vec(r.w)}`]);
        } else if (P.method === 'dutch') {
          lines.push(['第 5 步，首步 $v_{old} = v$', `d = 0 + v′ − v_{old} = ${num(r.d)}，e = x = ${vec(r.e)}`]);
          lines.push(['写入', `w ← w + ${a}d e + ${a}(v_{old} − v)x = ${vec(r.w)}`]);
        } else {
          lines.push(['第 5 步，前缀只有一条转移', `G_{5:6} = 0 + Q(Y) = ${num(r.targets[0])}，写 X 得 ${vec(r.w)}`]);
        }
      }
      if (s === 2) {
        const r = rec[1];
        if (P.method === 'acc') {
          lines.push(['第 6 步，迹先乘 $λγ_6$ 再给 Y 加一', `e = ${vec(r.e)}`]);
          lines.push(['到站目标为 1', `δ_6 = 1 − Q(Y) = ${num(r.delta)}，${shared ? 'w' : 'Q'} ← +${a}×${num(r.delta)}×e = ${vec(r.w)}`]);
        } else if (P.method === 'dutch') {
          lines.push(['Dutch 迹', `e = ${l}e + (1 − ${a}×${l}×xᵀe)x = ${vec(r.e)}`]);
          lines.push(['到站 $v′ = 0$', `d = 1 − v_{old} = ${num(r.d)}，v_{old} − v = ${num(r.corr)}，w = ${vec(r.w)}`]);
        } else {
          lines.push(['第 6 步到达，从本趟初值重放两次', `G_{5:7} = (1 − ${l})×${num(rec[0].targets[0])} + ${l}×1 = ${num(r.targets[0])}`]);
          lines.push(['先写 X，再向 1 写 Y', `${vec(r.mid)} → ${vec(r.w)}`]);
        }
        const f = model.forward(w0, P);
        if (!shared) lines.push(['前向检验（旧表上）', { html: ctx.m(`δ_5 + λδ_6 = ${num(f.lhs)} = G_5^λ − Q(X) = ${num(f.G)} − ${num(qx0[0])}`) }]);
        else {
          const ref = model.trip(w0, { ...P, method: 'replay' })[1].w[0], accw = model.trip(w0, { ...P, method: 'acc' })[1].w[0];
          lines.push(['三种写法的 w', `累积迹 ${num(accw)}，在线 λ 回报 ${num(ref)}，差 ${num(accw - ref)}`]);
        }
      }
      setBox(lines, `计算过程　第 ${trip} 趟`);
      ctx.redraw();
    }
    update();
  });
})();
