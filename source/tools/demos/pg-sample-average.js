/* 第 11 章：样本平均估计的是哪个和。对应 11.1 节“样本平均估计的是哪个和”“在两步树上核对”。
 * 两步树 p = σ(θ0) = .5，q = σ(θ1) = .25，γ = .9。三条轨迹：停止（回报 1）、继续后取 1（.9）、继续后取 3（2.7）。
 * 逐回合采样，比较三种累计平均：G0 → J；G0·∂P → Σ P·G0·∂P（错误的和）；G0·∂logP → ∂J（梯度）。 */
(() => {
  const p = 0.5, q = 0.25, gamma = 0.9;
  const trajs = [
    { name: '停止', P: 1 - p, G: 1, dP: [-p * (1 - p), 0] },
    { name: '继续、取 1', P: p * (1 - q), G: gamma * 1, dP: [p * (1 - p) * (1 - q), -p * q * (1 - q)] },
    { name: '继续、取 3', P: p * q, G: gamma * 3, dP: [p * (1 - p) * q, p * q * (1 - q)] },
  ];
  trajs.forEach((t) => { t.dlog = t.dP.map((d) => d / t.P); });
  const sum = (f) => trajs.reduce((s, t) => s + f(t), 0);
  const model = {
    p, q, gamma, trajs,
    J: sum((t) => t.P * t.G),
    grad: [0, 1].map((k) => sum((t) => t.G * t.dP[k])),
    naive: [0, 1].map((k) => sum((t) => t.P * t.G * t.dP[k])),
    lr: [0, 1].map((k) => sum((t) => t.P * t.G * t.dlog[k])),
    sd: [0, 1].map((k) => { const m = sum((t) => t.P * t.G * t.dlog[k]); return Math.sqrt(sum((t) => t.P * (t.G * t.dlog[k] - m) ** 2)); }),
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('pg-sample-average', (ctx) => {
    const { el, fmt } = ctx;
    const MAXN = 5000;
    let dir = 0, seed = 1, r = ctx.rng(seed);
    let N = 0, counts = [0, 0, 0], sG = 0, sN = [0, 0], sL = [0, 0], last = -1;
    let hist = [];   // 每回合后的 [N, avgG, avgNaive0, avgNaive1, avgLR0, avgLR1]
    const f3 = (x) => fmt(x, 3), f4 = (x) => fmt(x, 4);

    function episode() {
      const u = r();
      const k = u < trajs[0].P ? 0 : u < trajs[0].P + trajs[1].P ? 1 : 2;
      const t = trajs[k];
      N += 1; counts[k] += 1; last = k;
      sG += t.G;
      for (const d of [0, 1]) { sN[d] += t.G * t.dP[d]; sL[d] += t.G * t.dlog[d]; }
      hist.push([N, sG / N, sN[0] / N, sN[1] / N, sL[0] / N, sL[1] / N]);
    }
    function run(n) { for (let i = 0; i < n && N < MAXN; i++) episode(); refresh(); }
    function reset() {
      loop.running && loop.stop();
      seed += 1; r = ctx.rng(seed);
      N = 0; counts = [0, 0, 0]; sG = 0; sN = [0, 0]; sL = [0, 0]; last = -1; hist = [];
      refresh();
    }

    const seg = ctx.segmented([[0, '沿 θ₀（继续的偏好）'], [1, '沿 θ₁（取 3 的偏好）']], dir, (v) => { dir = v; refresh(); }, '参数方向');
    const b1 = ctx.button('走一回合', () => run(1), true);
    const b100 = ctx.button('走 100 回合', () => run(100));
    const bAuto = ctx.button('自动', () => { if (loop.running) loop.stop(); else if (N < MAXN) { loop.start(); bAuto.textContent = '暂停'; } });
    const bReset = ctx.button('重置', reset);
    const loop = ctx.loop(() => { run(Math.max(1, Math.round(N / 40))); return N < MAXN; });
    loop.onstop = () => { bAuto.textContent = '自动'; };

    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div'), bottom = el('div');
    ctx.stage.append(ctx.row(seg.node), ctx.row(b1, b100, bAuto, bReset), el('div', { class: 'demo-grid2' }, left, right), bottom, read, stepsBox.node);

    ctx.canvas({
      parent: left, aspect: 0.72, maxHeight: 260, minHeight: 190, label: '三条轨迹的出现频率与概率',
      draw(G, w, h) {
        const C = ctx.colors();
        const P = ctx.plot(G, w, h, { series: [], xmin: 0, xmax: 3, ymin: 0, ymax: 0.7, xticks: 0, yticks: 7, xlabel: '', ylabel: '频率 / 概率', pad: { l: 40, b: 34 } });
        const bw = (P.X(1) - P.X(0)) * 0.42;
        trajs.forEach((t, k) => {
          const cx = P.X(k + 0.5), fr = N ? counts[k] / N : 0;
          G.fillStyle = C.series[0];
          G.globalAlpha = k === last ? 0.95 : 0.6;
          G.fillRect(cx - bw / 2, P.Y(fr), bw, P.Y(0) - P.Y(fr));
          G.globalAlpha = 1;
          G.strokeStyle = C.ink; G.lineWidth = 2; G.setLineDash([5, 3]);
          G.beginPath(); G.moveTo(cx - bw * 0.75, P.Y(t.P)); G.lineTo(cx + bw * 0.75, P.Y(t.P)); G.stroke(); G.setLineDash([]);
          G.fillStyle = C.muted; G.font = ctx.font(11); G.textAlign = 'center'; G.textBaseline = 'top';
          G.fillText(t.name, cx, P.Y(0) + 6);
          G.fillText(`${counts[k]} 次`, cx, P.Y(0) + 19);
        });
      },
    });
    left.append(ctx.legend([['var(--d1)', '出现频率（刚采到的一条加深）'], ['var(--ink)', '概率 P(τ)，虚线']]));

    const sub = () => { if (hist.length <= 600) return hist; const out = [], st = hist.length / 600; for (let i = 0; i < 600; i++) out.push(hist[Math.floor(i * st)]); out.push(hist[hist.length - 1]); return out; };
    ctx.canvas({
      parent: right, aspect: 0.72, maxHeight: 260, minHeight: 190, label: '回报的累计平均',
      draw(G, w, h) {
        const C = ctx.colors(), H = sub();
        const P = ctx.plot(G, w, h, { series: [{ data: H.map((x) => [x[0], x[1]]), color: C.series[2], width: 2 }], xmin: 0, xmax: Math.max(20, N), ymin: 0.6, ymax: 2.0, xlabel: '回合数 N', ylabel: 'G₀ 的平均', hlines: [{ y: model.J, label: 'J = 1.175' }], pad: { l: 40 } });
      },
    });
    right.append(ctx.legend([['var(--d3)', 'G₀ 的累计平均'], ['var(--muted)', 'J，虚线']]));

    ctx.canvas({
      parent: bottom, aspect: 0.42, maxHeight: 300, minHeight: 200, label: '两种梯度估计的累计平均',
      draw(G, w, h) {
        const C = ctx.colors(), H = sub();
        const yr = dir === 0 ? [-0.4, 0.5] : [-0.3, 0.6];
        ctx.plot(G, w, h, {
          series: [
            { data: H.map((x) => [x[0], x[2 + dir]]), color: C.series[3], width: 2 },
            { data: H.map((x) => [x[0], x[4 + dir]]), color: C.series[0], width: 2 },
          ],
          xmin: 0, xmax: Math.max(20, N), ymin: yr[0], ymax: yr[1], xlabel: '回合数 N', ylabel: '累计平均',
          hlines: [
            { y: model.grad[dir], label: `真梯度 ${f4(model.grad[dir])}`, color: C.series[0] },
            { y: model.naive[dir], label: `ΣP·G₀·∂P = ${f4(model.naive[dir])}`, color: C.series[3] },
          ],
          pad: { l: 44 },
        });
      },
    });
    bottom.append(ctx.legend([['var(--d1)', 'G₀·∂log P 的平均（对数导数技巧）'], ['var(--d4)', 'G₀·∂P 的平均（直接平均）']]));

    function refresh() {
      ctx.redraw();
      const th = dir === 0 ? 'θ₀' : 'θ₁';
      if (!N) {
        read.innerHTML = `还没有采样。真梯度 ∂J/∂${th} = <b>${f4(model.grad[dir])}</b>；直接对 G₀·∂P 取平均，会趋于 <b>${f4(model.naive[dir])}</b>。`;
      } else {
        read.innerHTML = `N = ${N}：G₀ 平均 <b>${f3(sG / N)}</b>（J = 1.175）；G₀·∂P 平均 <b>${f4(sN[dir] / N)}</b>（趋于 ${f4(model.naive[dir])}）；G₀·∂log P 平均 <b>${f4(sL[dir] / N)}</b>（真梯度 ${f4(model.grad[dir])}）。`;
      }
      const lines = [];
      if (last >= 0) {
        const t = trajs[last];
        lines.push([`刚采到：${t.name}，概率 ${fmt(t.P, 3)}，回报 $G_0$ = ${fmt(t.G, 2)}`, null]);
        lines.push([`概率对 ${th} 的导数与对数概率导数`, `∂P = ${f4(t.dP[dir])},　∂log P = ∂P / P = ${f4(t.dlog[dir])}`]);
        lines.push(['两种单样本值', `G_0·∂P = ${f4(t.G * t.dP[dir])},　G_0·∂log P = ${f4(t.G * t.dlog[dir])}`]);
      }
      const tab = trajs.map((t) => f4(t.G * t.dlog[dir])).join(', ');
      lines.push([`三条轨迹的 $G_0·∂log P$`, `${tab}；按概率平均 = ${f4(model.lr[dir])}`]);
      lines.push(['直接平均的极限多乘了一个 $P$', `Σ P·G_0·∂P = ${f4(model.naive[dir])}　≠　Σ G_0·∂P = ${f4(model.grad[dir])}`]);
      lines.push([`单样本 $G_0·∂log P$ 的标准差`, `${f3(model.sd[dir])}；N 回合平均后约 ${f3(model.sd[dir])}/√N${N ? ' = ' + f3(model.sd[dir] / Math.sqrt(N)) : ''}`]);
      stepsBox.set(lines, '计算过程　两步树，p = .5，q = .25，γ = .9');
    }
    refresh();
  });
})();
