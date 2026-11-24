/* 第 7 章 7.3 节“原地打转时的三种迹”：S4 连续被访问时三种迹的递推。
 * 累积 e ← γλe + 1，Dutch（表格）e ← (1−α)γλe + 1，替换 e ← 1；γ = .9。末步误差 δ3 = .5 时改动为 αδ3e。 */
(() => {
  const GAMMA = 0.9, N = 20;
  /* 连续第 1…n 次访问后的迹 */
  function series(kind, alpha, lam, n = N) {
    const c = GAMMA * lam * (kind === 'dutch' ? 1 - alpha : 1), out = [];
    let e = 0;
    for (let i = 0; i < n; i++) { e = kind === 'repl' ? 1 : c * e + 1; out.push(e); }
    return out;
  }
  function limit(kind, alpha, lam) {
    if (kind === 'repl') return 1;
    const c = GAMMA * lam * (kind === 'dutch' ? 1 - alpha : 1);
    return c < 1 ? 1 / (1 - c) : Infinity;
  }
  const KINDS = ['acc', 'dutch', 'repl'];
  const model = { GAMMA, N, series, limit, KINDS };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('trace-loop', (ctx) => {
    ctx.stage.style.textAlign = 'left'; // 页面正文两端对齐，计算过程里的长说明会被拉开字距
    const { fmt } = ctx;
    let alpha = 0.2, lam = 0.8;
    const NAME = { acc: '累积迹', dutch: 'Dutch 迹', repl: '替换迹' }, COL = (C) => ({ acc: C.series[2], dutch: C.series[3], repl: C.series[4] });
    const aS = ctx.slider({ label: 'α', min: 0.01, max: 0.5, step: 0.01, value: alpha, format: (x) => fmt(x, 2), oninput: (x) => { alpha = x; upd(); } });
    const lS = ctx.slider({ label: 'λ', min: 0, max: 1, step: 0.01, value: lam, format: (x) => fmt(x, 2), oninput: (x) => { lam = x; upd(); } });
    const read = ctx.readout(), st = ctx.steps();
    ctx.stage.append(ctx.row(aS.node, lS.node));
    ctx.canvas({
      aspect: 0.5, maxHeight: 280, minHeight: 210, label: 'S4 连续访问时三种迹的大小，虚线为各自的极限，竖线为第 3 次访问',
      draw(G, w, h) {
        const C = ctx.colors(), col = COL(C), ymax = Math.max(1.5, Math.min(10.5, series('acc', alpha, lam).at(-1) * 1.12));
        const ax = ctx.plot(G, w, h, {
          series: KINDS.map((k) => ({ data: series(k, alpha, lam).map((e, i) => [i + 1, e]), color: col[k], width: 2.2 })),
          xmin: 1, xmax: N, ymin: 0, ymax, xlabel: '连续第几次访问 S4', ylabel: 'S4 的迹 e', pad: { l: 40 },
          hlines: KINDS.filter((k) => k !== 'repl' && limit(k, alpha, lam) < ymax).map((k) => ({ y: limit(k, alpha, lam), label: `极限 ${fmt(limit(k, alpha, lam), 2)}`, color: col[k] })),
        });
        const x3 = ax.X(3);
        G.save(); G.strokeStyle = C.muted; G.setLineDash([2, 3]); G.beginPath(); G.moveTo(x3, ax.P.t); G.lineTo(x3, ax.Y(0)); G.stroke(); G.restore();
        KINDS.forEach((k) => { const e = series(k, alpha, lam, 3)[2]; G.fillStyle = col[k]; G.beginPath(); G.arc(x3, ax.Y(e), 4, 0, 2 * Math.PI); G.fill(); });
      },
    });
    ctx.stage.append(ctx.legend([['var(--d3)', '累积迹 e ← γλe + 1'], ['var(--d4)', 'Dutch 迹 e ← (1−α)γλe + 1'], ['var(--d5)', '替换迹 e ← 1']]), read, st.node);
    function upd() { ctx.redraw(); show(); }
    function show() {
      const gl = GAMMA * lam, e3 = KINDS.map((k) => series(k, alpha, lam, 3)[2]), lim = KINDS.map((k) => limit(k, alpha, lam));
      read.innerHTML = `实际步长 αe（原地打转很久之后）：累积 <b>${Number.isFinite(lim[0]) ? fmt(alpha * lim[0], 3) : '无上界'}</b>，Dutch <b>${fmt(alpha * lim[1], 3)}</b>，替换 <b>${fmt(alpha, 3)}</b>` +
        (alpha * lim[0] > 1 ? '；累积迹的 αe 已超过 1，一次写入就越过目标' : '');
      const c2 = (1 - alpha) * gl;
      st.set([
        ['三条递推的衰减系数', { html: ctx.m(`γλ = .9 × ${fmt(lam, 2)} = ${fmt(gl, 4)}，(1−α)γλ = ${fmt(1 - alpha, 2)} × ${fmt(gl, 4)} = `) + `<b>${fmt(c2, 4)}</b>` }],
        ['第 3 次访问：累积 $1 + γλ + (γλ)^2$', { html: ctx.m(`1 + ${fmt(gl, 4)} + ${fmt(gl * gl, 4)} = `) + `<b>${fmt(e3[0], 6)}</b>` }],
        ['第 3 次访问：Dutch $1 + c + c^2$，$c = (1−α)γλ$', { html: ctx.m(`1 + ${fmt(c2, 4)} + ${fmt(c2 * c2, 4)} = `) + `<b>${fmt(e3[1], 6)}</b>` + '；替换 <b>1</b>' }],
        ['极限 $1/(1−c)$', { html: ctx.m(`累积 1/(1 − ${fmt(gl, 4)}) = `) + `<b>${Number.isFinite(lim[0]) ? fmt(lim[0], 3) : '∞'}</b>` + ctx.m(`，Dutch 1/(1 − ${fmt(c2, 4)}) = `) + `<b>${fmt(lim[1], 3)}</b>` }],
        ['放回账本末步：$δ_3 = .5$ 给 S4 的改动 $αδ_3 e$', { html: ctx.m(`${fmt(alpha, 2)} × .5 × (${e3.map((e) => fmt(e, 4)).join(', ')}) = `) + `<b>(${e3.map((e) => fmt(alpha * 0.5 * e, 4)).join(', ')})</b>` }],
      ], `计算过程　α = ${fmt(alpha, 2)}，λ = ${fmt(lam, 2)}`);
    }
    show();
  });
})();
