/* 第 22 章：仓库转角上的技能模型规划，两种模式。
 * mode="backup" 对应 22.2 节“同一走法的两种规划计算”：r(μ) = 5/8、ṽ(C) = −5/8，一步模型 J_R→W（奖励 0）、W→C（奖励 1），
 *   技能模型行 (1, 2, C)；先 W 后 J_R 两次原始备份与一次跨步备份都得 −7/8，W 仍为 0 时单在 J_R 备份得 −5/8。
 * mode="row" 对应 22.2 节“一次完成调用怎样改变模型行、分数与选择”：模型行 (1, 2, ½, ½)，样本 (1, 2, C)，
 *   α = ½ 时变为 (1, 2, ¼, ¾)，左行分数 −9/16 → −23/32，右行 27/8 不变，间隔 63/16 → 131/32，极限 17/4。 */
(() => {
  const R = 5 / 8, VB = 0, VC = -5 / 8, RIGHT = 27 / 8;

  /* 一步模型上的原始备份与技能模型上的跨步备份。v = {W, J}。 */
  const backupW = () => 1 - R + VC;
  const backupJ = (v) => 0 - R + v.W;
  const backupOption = () => 1 - 2 * R + VC;

  /* 模型行 m = [r̂, ℓ̂, P̂(B), P̂(C)]；样本 (G, τ, 终点) 写成 (G, τ, 1{B}, 1{C})。 */
  const ROW0 = [1, 2, 0.5, 0.5];
  const update = (m, sample, a) => m.map((x, i) => x + a * (sample[i] - x));
  const score = (m) => m[0] - R * m[1] + m[2] * VB + m[3] * VC;
  /* 在 C 交回的频率超过 p 所需的同样样本数。 */
  function samplesToExceed(a, p = 0.75) { let m = ROW0, n = 0; while (!(m[3] > p)) { m = update(m, [1, 2, 0, 1], a); n++; } return n; }

  /* 有理数显示：分母不超过 4096 时写成分数，否则写小数。 */
  function frac(x) {
    if (Number.isInteger(x)) return String(x).replace('-', '−');
    for (let q = 2; q <= 4096; q++) {
      const p = Math.round(x * q);
      if (Math.abs(p / q - x) < 1e-12) return `${p < 0 ? '−' : ''}${Math.abs(p)}/${q}`;
    }
    return x.toFixed(4).replace(/^(-?)0\./, '$1.').replace('-', '−');
  }

  const model = { R, VB, VC, RIGHT, backupW, backupJ, backupOption, ROW0, update, score, samplesToExceed, frac };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('ch22-skill-model', (ctx) => {
    if ((ctx.root.dataset.mode || 'row') === 'backup') backupDemo(ctx); else rowDemo(ctx);
  });

  /* ---------- 两种规划计算 ---------- */
  function backupDemo(ctx) {
    const { el } = ctx;
    let v = { W: 0, J: 0 }, log = [], last = null;
    const read = ctx.readout(), stepsBox = ctx.steps();
    const bW = ctx.button('在 W 作原始备份', () => act('W'));
    const bJ = ctx.button('在 J_R 作原始备份', () => act('J'));
    const bO = ctx.button('在 J_R 作跨步备份', () => act('O'), true);
    const bR = ctx.button('清零', () => { v = { W: 0, J: 0 }; log = []; last = null; ctx.redraw(); show(); });
    bJ.innerHTML = '在 J<sub>R</sub> 作原始备份'; bO.innerHTML = '在 J<sub>R</sub> 作跨步备份';
    ctx.stage.append(ctx.row(bW, bJ, bO, bR));
    ctx.canvas({
      aspect: 0.34, maxHeight: 200, minHeight: 150, label: '转角 J_R、W、C 三个位置与当前的价值估计',
      draw(g, w, h) {
        const C = ctx.colors(), xs = [0.14, 0.5, 0.86].map((t) => t * w), y = h * 0.42, rr = Math.min(26, w * 0.06);
        const names = ['J_R', 'W', 'C'], vals = [v.J, v.W, VC];
        g.lineWidth = 2; g.strokeStyle = C.muted; g.fillStyle = C.muted;
        const arrow = (x0, x1, yy) => { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.stroke(); g.beginPath(); g.moveTo(x1, yy); g.lineTo(x1 - 8, yy - 5); g.lineTo(x1 - 8, yy + 5); g.fill(); };
        arrow(xs[0] + rr, xs[1] - rr - 2, y); arrow(xs[1] + rr, xs[2] - rr - 2, y);
        g.font = ctx.font(12); g.textAlign = 'center'; g.textBaseline = 'bottom';
        g.fillText('奖励 0', (xs[0] + xs[1]) / 2, y - 6); g.fillText('奖励 1', (xs[1] + xs[2]) / 2, y - 6);
        g.strokeStyle = C.series[1]; g.setLineDash([5, 4]);
        g.beginPath(); g.moveTo(xs[0], y + rr); g.quadraticCurveTo(w / 2, h * 0.98, xs[2], y + rr); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.series[1]; g.textBaseline = 'top'; g.fillText('技能行 (1, 2, C)', w / 2, 0.5 * (y + rr) + 0.49 * h + 4);
        names.forEach((n, i) => {
          const hot = last && ((last === 'W' && i === 1) || ((last === 'J' || last === 'O') && i === 0));
          g.fillStyle = hot ? C.accentSoft : C.bg; g.strokeStyle = hot ? C.accent : C.rule; g.lineWidth = hot ? 2.5 : 1.5;
          g.beginPath(); g.arc(xs[i], y, rr, 0, 2 * Math.PI); g.fill(); g.stroke();
          g.fillStyle = C.ink; g.font = ctx.font(14, 600); g.textBaseline = 'middle';
          if (i === 0) { g.fillText('J', xs[i] - 3, y); g.font = ctx.font(10, 600); g.fillText('R', xs[i] + 5, y + 5); } else g.fillText(n, xs[i], y);
          g.font = ctx.font(12.5, 600, true); g.fillStyle = i === 2 ? C.muted : C.accent; g.textBaseline = 'bottom';
          g.fillText(frac(vals[i]), xs[i], y - rr - 4);
        });
      },
    });
    ctx.stage.append(read, stepsBox.node);
    function act(k) {
      if (k === 'W') v.W = backupW();
      if (k === 'J') v.J = backupJ(v);
      if (k === 'O') v.J = backupOption();
      log.push(k); last = k; ctx.redraw(); show();
    }
    function show() {
      const seq = log.map((k) => ({ W: 'W 原始', J: 'J<sub>R</sub> 原始', O: 'J<sub>R</sub> 跨步' })[k]).join(' → ') || '尚未备份';
      read.innerHTML = `已做 <b>${log.length}</b> 次备份：${seq}。当前 q̃(J<sub>R</sub>, o<sub>L</sub>) = <b>${frac(v.J)}</b>，精确值 −7/8。`;
      const base = [['参考策略总向左', { html: ctx.m('r(μ) = 5/8，ṽ_μ(B) = 0，ṽ_μ(C) = −5/8') }]];
      if (last === 'W') base.push(['W 的一步模型：奖励 1、一步到 C', 'u(W) = 1 − r(μ) + ṽ_μ(C)'], ['代入', { html: ctx.m('= 1 − 5/8 − 5/8 = ') + '<b>−1/4</b>' }]);
      if (last === 'J') base.push(['$J_R$ 的一步模型：奖励 0、一步到 W', 'q̃(J_R) = 0 − r(μ) + u(W)'], ['代入当前 u(W)', { html: ctx.m(`= 0 − 5/8 + (${frac(v.W)}) = `) + `<b>${frac(v.J)}</b>` }]);
      if (last === 'O') base.push(['技能模型行一次跨到交回点 C', 'q̃(J_R) = r_o − r(μ)ℓ_o + ṽ_μ(C)'], ['代入 (1, 2, C)', { html: ctx.m('= 1 − 2(5/8) − 5/8 = ') + '<b>−7/8</b>' }]);
      if (!last) base.push(['点上面的按钮选一次备份；“计算过程”列出这次用到的模型与代入', null]);
      stepsBox.set(base, '计算过程　最近一次备份');
    }
    show();
  }

  /* ---------- 一次完成调用改变模型行 ---------- */
  function rowDemo(ctx) {
    const { el } = ctx;
    let a = 0.5, m = ROW0.slice(), hist = [score(m)], lastS = null, prev = null;
    const aSeg = ctx.segmented([[1, 'α = 1'], [0.5, 'α = 1/2'], [0.1, 'α = 1/10']], a, (v) => { a = v; reset(); }, '模型步长');
    const sC = ctx.button('完成样本 (1, 2, C)', () => feed([1, 2, 0, 1]), true);
    const sB = ctx.button('完成样本 (1, 2, B)', () => feed([1, 2, 1, 0]));
    const rs = ctx.button('复位', () => reset());
    const read = ctx.readout(), stepsBox = ctx.steps();
    const pa = el('div'), pb = el('div');
    ctx.stage.append(ctx.row(aSeg.node), ctx.row(sC, sB, rs), el('div', { class: 'demo-grid2' }, pa, pb), read, stepsBox.node);

    ctx.canvas({
      parent: pa, aspect: 0.72, maxHeight: 260, minHeight: 200, label: '左行模型的停点频率与两行分数',
      draw(g, w, h) {
        const C = ctx.colors(), P = { l: 12, r: 12, t: 24, b: 26 }, mid = w * 0.36;
        g.font = ctx.font(12); g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillStyle = C.muted;
        g.fillText('左行停点频率', mid / 2 + P.l / 2, P.t - 6);
        const bh = h - P.t - P.b, bw = Math.min(40, (mid - P.l) / 3);
        [[m[2], 'B', C.series[3]], [m[3], 'C', C.series[0]]].forEach(([p, n, c], i) => {
          const x = P.l + (mid - P.l) * (i + 0.5) / 2 - bw / 2;
          g.fillStyle = C.tint; g.fillRect(x, P.t, bw, bh);
          g.fillStyle = c; g.fillRect(x, P.t + bh * (1 - p), bw, bh * p);
          g.fillStyle = C.ink; g.textBaseline = 'top'; g.fillText(`P̂(${n})`, x + bw / 2, h - P.b + 6);
          g.textBaseline = 'bottom'; g.font = ctx.font(12, 600, true); g.fillText(frac(p), x + bw / 2, P.t + bh * (1 - p) - 2); g.font = ctx.font(12);
        });
        const lo = -1.25, hi = 3.75, X0 = mid + 30, X1 = w - P.r;
        const Y = (s) => P.t + (1 - (s - lo) / (hi - lo)) * bh;
        g.strokeStyle = C.rule; g.lineWidth = 1; g.beginPath(); g.moveTo(X0, P.t); g.lineTo(X0, h - P.b); g.stroke();
        g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
        for (const t of [-1, 0, 1, 2, 3]) { g.fillText(String(t).replace('-', '−'), X0 - 5, Y(t)); g.strokeStyle = C.line; g.beginPath(); g.moveTo(X0, Y(t)); g.lineTo(X1, Y(t)); g.stroke(); }
        g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('转角两行的分数', (X0 + X1) / 2, P.t - 6);
        const mark = (s, label, c, x) => { g.fillStyle = c; g.beginPath(); g.arc(x, Y(s), 6, 0, 2 * Math.PI); g.fill(); g.fillStyle = C.ink; g.textBaseline = 'middle'; g.font = ctx.font(12, 600, true); const fit = x + 10 + g.measureText(label).width <= w - 2; g.textAlign = fit ? 'left' : 'right'; g.fillText(label, fit ? x + 10 : x - 10, Y(s)); g.font = ctx.font(12); };
        const xl = X0 + (X1 - X0) * 0.22, xr = X0 + (X1 - X0) * 0.5;
        g.save(); g.setLineDash([3, 3]); g.strokeStyle = C.muted; g.beginPath(); g.moveTo(xl - 12, Y(-7 / 8)); g.lineTo(xl + 12, Y(-7 / 8)); g.stroke(); g.restore();
        g.strokeStyle = C.series[1]; g.lineWidth = 2; g.beginPath(); g.moveTo((xl + xr) / 2, Y(score(m))); g.lineTo((xl + xr) / 2, Y(RIGHT)); g.stroke();
        mark(score(m), `向左 ${frac(score(m))}`, C.series[0], xl);
        mark(RIGHT, '向右 27/8', C.series[3], xr);
      },
    });
    ctx.canvas({
      parent: pb, aspect: 0.72, maxHeight: 260, minHeight: 200, label: '左行分数随样本数的变化，虚线是极限 −7/8',
      draw(g, w, h) {
        const C = ctx.colors();
        ctx.plot(g, w, h, {
          series: [{ data: hist.map((s, i) => [i, s]), color: C.series[0], width: 2 }], xmin: 0, xmax: Math.max(8, hist.length - 1),
          ymin: -1, ymax: 0, xlabel: '完成样本数', ylabel: '左行分数', yticks: 4, xticks: 4, pad: { l: 54 },
          hlines: [{ y: -7 / 8, color: C.muted, label: '−7/8' }, { y: -0.25, color: C.faint, label: '−1/4（全在 B）' }],
        });
      },
    });

    function feed(sample) { prev = m; lastS = sample; m = update(m, sample, a); hist.push(score(m)); ctx.redraw(); show(); }
    function reset() { m = ROW0.slice(); hist = [score(m)]; lastS = null; prev = null; ctx.redraw(); show(); }
    const row = (x) => `(${x.map(frac).join(', ')})`;
    function show() {
      const n = hist.length - 1, q = score(m);
      read.innerHTML = `已写入 <b>${n}</b> 条样本，模型行 ${row(m)}。左行分数 <b>${frac(q)}</b>，右行 <b>27/8</b>，间隔 <b>${frac(RIGHT - q)}</b>，选${q > RIGHT ? '左' : '右'}。` +
        `<br>α = ${frac(a)} 时，要 <b>${samplesToExceed(a)}</b> 条 (1, 2, C) 样本，在 C 交回的频率才超过 3/4。`;
      if (!lastS) {
        stepsBox.set([
          ['左行分数', 'q̃ = r̂ − r(μ)ℓ̂ + P̂(B)ṽ_μ(B) + P̂(C)ṽ_μ(C)'],
          ['代入初始行', { html: ctx.m(`= 1 − (5/8)2 + ${frac(m[2])}·0 + ${frac(m[3])}(−5/8) = `) + `<b>${frac(q)}</b>` }],
          ['点“完成样本”写入一条完成调用', null],
        ], '计算过程　左行分数');
        return;
      }
      const dq = q - score(prev), dP = m[2] - prev[2];
      stepsBox.set([
        ['① 模型行', { html: ctx.m(`m̂ ← m̂ + ${frac(a)}[${row(lastS)} − ${row(prev)}] = `) + `<b>${row(m)}</b>` }],
        ['② 左行分数', { html: ctx.m(`1 − (5/8)2 + ${frac(m[3])}(−5/8) = `) + `<b>${frac(q)}</b>` }],
        ['分数的改变只来自停点项', { html: ctx.m(`Δq̃ = ΔP̂(B)[ṽ_μ(B) − ṽ_μ(C)] = (${frac(dP)})(5/8) = `) + `<b>${frac(dq)}</b>` }],
        ['③④ 与右行比较', { html: ctx.m(`27/8 − (${frac(q)}) = `) + `<b>${frac(RIGHT - q)}</b>` + '，极限 ' + ctx.m('27/8 + 7/8 = 17/4') }],
      ], `计算过程　第 ${n} 条样本`);
    }
    show();
  }
})();
