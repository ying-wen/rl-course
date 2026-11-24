/* 第 26 章：仓库上的一段配对 lifetime，逐步画累计差，并对全部指示串精确算配对与不配对的方差。
 * 对应 26.1 节“仓库上的一段配对 lifetime”与“配对差的期望、方差与重放的失效”：指示左右各 1/2，
 * 一致 3 步得 4、不一致 5 步得 1；L0 总向左；L 的表 Q(指示,转向) 初值 5、贪心、平局向左（L' 向右），
 * 每趟回仓后把该格改写为本趟回报。正文的指示串 左右左右右左右、T = 24 给出 22 对 15。 */
(() => {
  const TEXT = [0, 1, 0, 1, 1, 0, 1, 0]; // 0 = 左，1 = 右；第 8 次出发正文未给，取左（T ≤ 24 时落在 lifetime 以外）

  /* 一段 lifetime：返回每步奖励 rew[1..T]、各趟记录与总奖励。base = true 为总向左的 L0。 */
  function life(instr, T, tieRight, base) {
    const Q = [[5, 5], [5, 5]], rew = new Array(T + 1).fill(0), trips = [];
    let t = 0, k = 0, tot = 0;
    while (t < T) {
      const x = instr[k] ?? 0;
      let a;
      if (base) a = 0;
      else { const q = Q[x]; a = q[0] > q[1] ? 0 : q[1] > q[0] ? 1 : (tieRight ? 1 : 0); }
      const match = a === x, r = match ? 4 : 1, at = t + (match ? 2 : 3), len = match ? 3 : 5;
      if (at <= T) { rew[at] += r; tot += r; }
      trips.push({ k, x, a, r, at, start: t, inLife: at <= T });
      if (!base) Q[x][a] = r;
      t += len; k += 1;
    }
    return { tot, rew, trips };
  }

  /* 累计差 c[t] = Σ_{s≤t}(R^L_s − R^{L0}_s)，c[0] = 0。 */
  function cumdiff(instr, T, tieRight) {
    const a = life(instr, T, tieRight, false).rew, b = life(instr, T, tieRight, true).rew, c = [0];
    for (let t = 1; t <= T; t++) c.push(c[t - 1] + a[t] - b[t]);
    return c;
  }

  /* 对 2^n 种指示串精确求和（n = 至多出发的次数），得两臂 TW = 总奖励/T 的方差、协方差与落后概率。 */
  function exact(T, tieRight) {
    const n = Math.ceil(T / 3), N = 1 << n, pts = new Map();
    let mL = 0, m0 = 0, sLL = 0, s00 = 0, sL0 = 0, behind = 0;
    for (let s = 0; s < N; s++) {
      const ins = [];
      for (let i = 0; i < n; i++) ins.push((s >> i) & 1);
      const a = life(ins, T, tieRight, false).tot / T, b = life(ins, T, tieRight, true).tot / T;
      mL += a; m0 += b; sLL += a * a; s00 += b * b; sL0 += a * b;
      if (a < b) behind += 1;
      const key = a.toFixed(6) + ',' + b.toFixed(6);
      pts.set(key, { a, b, n: (pts.get(key)?.n || 0) + 1 });
    }
    mL /= N; m0 /= N;
    const vL = sLL / N - mL * mL, v0 = s00 / N - m0 * m0, cov = sL0 / N - mL * m0;
    return {
      n, N, mL, m0, vL, v0, cov, behind, pBehind: behind / N,
      sdPair: Math.sqrt(Math.max(0, vL + v0 - 2 * cov)), sdUnpair: Math.sqrt(vL + v0),
      rho: vL > 0 && v0 > 0 ? cov / Math.sqrt(vL * v0) : 0, pts: [...pts.values()],
    };
  }

  const model = { TEXT, life, cumdiff, exact };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 3) => (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d).replace(/^(-?)0\./, '$1.').replace('-', '−');
  const SIDE = ['左', '右'];

  RLDemo.register('ch26-paired', (ctx) => {
    const { el } = ctx;
    let instr = TEXT.slice(), T = 24, tieRight = false, seed = 1, rnd = ctx.rng(seed), ex = exact(T, tieRight);

    const chips = el('div', { class: 'demo-seg', role: 'group', 'aria-label': '每次出发的指示，点一下改左右' });
    const chipBtns = instr.map((_, k) => el('button', {
      type: 'button', onclick: () => { instr[k] = 1 - instr[k]; show(); },
    }));
    chips.append(...chipBtns);
    const tieSeg = ctx.segmented([[false, 'L：平局向左'], [true, 'L′：平局向右']], tieRight, (v) => { tieRight = v; ex = exact(T, tieRight); show(); }, '受检学习器的平局规则');
    const tSl = ctx.slider({ label: 'lifetime T', min: 6, max: 24, step: 1, value: T, format: (v) => `${v} 步`, oninput: (v) => { T = v; ex = exact(T, tieRight); show(); } });
    const resetBtn = ctx.button('正文的指示串', () => { instr = TEXT.slice(); show(); });
    const randBtn = ctx.button('随机一串', () => { instr = instr.map(() => (rnd() < 0.5 ? 1 : 0)); show(); });
    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const pa = el('div'), pb = el('div');
    ctx.stage.append(
      ctx.row(el('span', { class: 'demo-note', text: '第 1–8 次出发的指示' }), chips),
      ctx.row(tieSeg.node, tSl.node), ctx.row(resetBtn, randBtn),
      el('div', { class: 'demo-grid2' }, pa, pb), read, stepsBox.node);

    ctx.canvas({
      parent: pa, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '这一串指示下两臂主奖励的累计差随步数的变化',
      draw(g, w, h) {
        const C = ctx.colors(), c = cumdiff(instr, T, tieRight), d = [[0, 0]];
        for (let t = 1; t <= T; t++) d.push([t, c[t - 1]], [t, c[t]]);
        const lo = Math.min(-5, ...c), hi = Math.max(8, ...c);
        const P = ctx.plot(g, w, h, {
          series: [{ data: d, color: C.series[0], width: 2 }], xmin: 0, xmax: T, ymin: lo, ymax: hi,
          xlabel: '步数 t', ylabel: '累计差 Σ(R^L − R^L0)', yticks: 4, xticks: 4, pad: { l: 40 }, hlines: [{ y: 0, color: C.muted }],
        });
        g.fillStyle = C.series[0]; g.beginPath(); g.arc(P.X(T), P.Y(c[T]), 3.5, 0, 2 * Math.PI); g.fill();
        g.font = ctx.font(12, 600); g.textAlign = 'right'; g.textBaseline = 'bottom';
        g.fillText(`${c[T] >= 0 ? '+' : '−'}${Math.abs(c[T])}`, P.X(T) - 5, P.Y(c[T]) - 3);
      },
    });
    ctx.canvas({
      parent: pb, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '全部指示串上两臂全程平均奖励的散点，圆面积正比于概率，对角线下方是受检学习器落后',
      draw(g, w, h) {
        const C = ctx.colors();
        const P = ctx.plot(g, w, h, {
          series: [{ data: [[0, 0], [2, 2]], color: C.rule, width: 1, dash: [4, 4] }], xmin: 0, xmax: 1.4, ymin: 0, ymax: 1.4,
          xlabel: 'TW(L0)', ylabel: 'TW(受检学习器)', yticks: 3, xticks: 3, pad: { l: 40 },
        });
        const a = life(instr, T, tieRight, false).tot / T, b = life(instr, T, tieRight, true).tot / T;
        for (const p of ex.pts) {
          const r = 2 + 14 * Math.sqrt(p.n / ex.N);
          g.fillStyle = p.a < p.b ? C.series[2] : C.series[0]; g.globalAlpha = 0.55;
          g.beginPath(); g.arc(P.X(p.b), P.Y(p.a), r, 0, 2 * Math.PI); g.fill();
        }
        g.globalAlpha = 1; g.strokeStyle = C.ink; g.lineWidth = 2;
        g.beginPath(); g.arc(P.X(b), P.Y(a), 6, 0, 2 * Math.PI); g.stroke();
      },
    });

    function show() {
      chipBtns.forEach((b, k) => { b.textContent = SIDE[instr[k]]; b.setAttribute('aria-label', `第 ${k + 1} 次出发：${SIDE[instr[k]]}`); b.style.background = instr[k] ? 'var(--accent-soft)' : ''; b.style.color = instr[k] ? 'var(--accent-strong)' : ''; });
      const nm = tieRight ? 'L′' : 'L';
      const A = life(instr, T, tieRight, false), B = life(instr, T, tieRight, true), d = A.tot - B.tot;
      const turns = A.trips.filter((x) => x.inLife).map((x) => `${SIDE[x.a]}${x.r}`).join(' ');
      read.innerHTML = `这一串：${nm} 的转向与所得 ${turns}，${T} 步共得 <b>${A.tot}</b>；L0 共得 <b>${B.tot}</b>；` +
        `Δ<sub>i</sub> = ${d}/${T} = <b>${num(d / T, 2)}</b>。<br>全部 ${ex.N} 串：配对差标准差 <b>${num(ex.sdPair)}</b>，不配对 <b>${num(ex.sdUnpair)}</b>，` +
        `相关系数 ${num(ex.rho, 2)}；${nm} 落后的串占 <b>${ex.behind}/${ex.N}</b>（右图红圈）。`;
      stepsBox.set([
        [`对 $2^{${ex.n}}$ 种指示串求和得两臂 TW 的期望`, { html: ctx.m(`E TW(${nm}) = ${num(ex.mL, 4)}，E TW(L_0) = ${num(ex.m0, 4)}`) }],
        ['配对差的方差', `Var Δ = Var TW(${nm}) + Var TW(L_0) − 2 Cov`],
        ['代入', { html: ctx.m(`= ${num(ex.vL, 4)} + ${num(ex.v0, 4)} − 2(${num(ex.cov, 4)}) = ${num(ex.vL + ex.v0 - 2 * ex.cov, 4)}`) }],
        ['配对差的标准差', { html: ctx.m(`√${num(ex.vL + ex.v0 - 2 * ex.cov, 4)} = `) + `<b>${num(ex.sdPair)}</b>` }],
        ['不配对时协方差项为零', { html: ctx.m(`√(${num(ex.vL, 4)} + ${num(ex.v0, 4)}) = `) + `<b>${num(ex.sdUnpair)}</b>` }],
        [ex.cov < 0 ? '协方差为负，两臂反向，配对反而增大方差' : ex.cov > 0 ? '协方差为正，两臂同向，配对减小方差' : '协方差为零，配对不改变方差', null],
      ], `计算过程　T = ${T}，${nm}`);
      ctx.redraw();
    }
    show();
  });
})();
