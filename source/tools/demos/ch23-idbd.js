/* 第 23 章：Sutton（1992）IDBD 实验 1 的一次运行，固定步长 LMS 与 IDBD 读同一串样本。
 * 对应 23.2 节“IDBD：怎样给不同线索不同的步长”的算法 23.1 与“原论文的第一个实验”：
 * 20 个标准正态输入，前 5 个系数 ±1、其余为 0，每 20 个样本随机翻转一个符号；IDBD 初始步长 .05；
 * 在第 20000–30000 个样本上算均方误差。正文 100 次运行：LMS 最好 α = .03 得 3.37，IDBD 最好 α_meta = .005 得 1.62。 */
(() => {
  const N = 20, REL = 5, FLIP = 20, TOTAL = 30000, FROM = 20000, BLOCK = 500;

  function rng(seed = 1) {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
    return r;
  }

  /* 一次运行的状态：两个学习器共用样本流。 */
  function create(seed, lmsA, meta, alpha0 = 0.05) {
    const r = rng(seed), sg = new Float64Array(REL);
    for (let i = 0; i < REL; i++) sg[i] = r() < 0.5 ? 1 : -1;
    return {
      r, sg, lmsA, meta, t: 0, x: new Float64Array(N),
      wl: new Float64Array(N), wi: new Float64Array(N), eta: new Float64Array(N).fill(Math.log(alpha0)), s: new Float64Array(N),
      el: 0, ei: 0, bl: 0, bi: 0, blocks: [], diverged: false, last: null,
    };
  }

  /* 处理一个样本：先翻符号（每 20 个），再抽输入、预测、算一次 δ，最后按算法 23.1 第 3、4 行逐坐标写入。 */
  function step(S) {
    const { r, sg, x, wl, wi, eta, s } = S;
    if (S.t > 0 && S.t % FLIP === 0) sg[Math.floor(r() * REL)] *= -1;
    let y = 0;
    for (let i = 0; i < N; i++) { x[i] = r.normal(); if (i < REL) y += sg[i] * x[i]; }
    let pl = 0, pi = 0;
    for (let i = 0; i < N; i++) { pl += wl[i] * x[i]; pi += wi[i] * x[i]; }
    const dl = y - pl, di = y - pi;
    if (!S.diverged && !(Math.abs(di) < 1e6)) S.diverged = true;
    const keep = [0, REL].map((i) => ({ i, x: x[i], s: s[i], eta: eta[i], w: wi[i] }));
    for (let i = 0; i < N; i++) {
      wl[i] += S.lmsA * dl * x[i];
      if (S.diverged) continue;
      eta[i] += S.meta * di * x[i] * s[i];
      const a = Math.exp(eta[i]);
      wi[i] += a * di * x[i];
      s[i] = Math.max(0, 1 - a * x[i] * x[i]) * s[i] + a * di * x[i];
    }
    S.last = { t: S.t + 1, y, di, coords: keep.map((k) => ({ ...k, eta2: eta[k.i], a2: Math.exp(eta[k.i]), s2: s[k.i], w2: wi[k.i] })) };
    const ei = S.diverged ? Infinity : di * di;
    if (S.t >= FROM) { S.el += dl * dl; S.ei += ei; }
    S.bl += dl * dl; S.bi += ei;
    S.t += 1;
    if (S.t % BLOCK === 0) { S.blocks.push([S.t, S.bl / BLOCK, S.bi / BLOCK]); S.bl = 0; S.bi = 0; }
    return S.t < TOTAL;
  }

  function run(seed, lmsA, meta) {
    const S = create(seed, lmsA, meta);
    while (step(S));
    return { lms: S.el / (TOTAL - FROM), idbd: S.ei / (TOTAL - FROM), alpha: Array.from(S.eta, Math.exp), diverged: S.diverged };
  }

  const model = { N, REL, TOTAL, FROM, BLOCK, rng, create, step, run };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d).replace(/^(-?)0\./, '$1.').replace('-', '−') : '发散');

  RLDemo.register('ch23-idbd', (ctx) => {
    const { el } = ctx;
    let meta = 0.005, lmsA = 0.03, seed = 1, S = create(seed, lmsA, meta);

    const metaSeg = ctx.segmented([[0.0005, '.0005'], [0.001, '.001'], [0.005, '.005'], [0.02, '.02']], meta, (v) => { meta = v; restart(); }, 'IDBD 的元步长');
    const lmsSeg = ctx.segmented([[0.01, '.01'], [0.03, '.03'], [0.05, '.05']], lmsA, (v) => { lmsA = v; restart(); }, 'LMS 的固定步长');
    const pauseBtn = ctx.button('暂停', () => (job.running ? job.stop() : S.t < TOTAL && job.start()), true);
    const seedBtn = ctx.button('换一组随机种子', () => { seed += 1; restart(); });
    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const pa = el('div'), pb = el('div');
    ctx.stage.append(
      ctx.row(el('span', { class: 'demo-note', text: 'IDBD 元步长' }), metaSeg.node, el('span', { class: 'demo-note', text: 'LMS 步长' }), lmsSeg.node),
      ctx.row(pauseBtn, seedBtn),
      el('div', { class: 'demo-grid2' }, pa, pb), read, stepsBox.node);

    ctx.canvas({
      parent: pa, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '每 500 个样本的均方误差，LMS 与 IDBD',
      draw(g, w, h) {
        const C = ctx.colors();
        const cap = (v) => (Number.isFinite(v) ? Math.min(v, 12) : NaN);
        const P = ctx.plot(g, w, h, {
          series: [
            { data: S.blocks.map((b) => [b[0] / 1000, cap(b[1])]), color: C.series[2], width: 1.6 },
            { data: S.blocks.map((b) => [b[0] / 1000, cap(b[2])]), color: C.series[0], width: 1.8 },
          ],
          xmin: 0, xmax: TOTAL / 1000, ymin: 0, ymax: 10, xlabel: '样本数（千）', ylabel: '均方误差', yticks: 5, xticks: 3, pad: { l: 36 },
        });
        g.save(); g.fillStyle = C.tint; g.globalAlpha = 0.6;
        g.fillRect(P.X(FROM / 1000), P.P.t, P.X(TOTAL / 1000) - P.X(FROM / 1000), h - P.P.t - P.P.b); g.restore();
        g.font = ctx.font(11.5); g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'top';
        g.fillText('计分段', (P.X(FROM / 1000) + P.X(TOTAL / 1000)) / 2, P.P.t + 2);
      },
    });
    ctx.canvas({
      parent: pb, aspect: 0.72, maxHeight: 280, minHeight: 210, label: 'IDBD 给 20 个输入的步长，对数纵轴；前 5 个是有用输入',
      draw(g, w, h) {
        const C = ctx.colors(), P = { l: 40, r: 8, t: 10, b: 30 }, lo = -4, hi = 0;
        const Y = (a) => P.t + (1 - (Math.log10(Math.max(a, 1e-4)) - lo) / (hi - lo)) * (h - P.t - P.b);
        g.font = ctx.font(12); g.textAlign = 'right'; g.textBaseline = 'middle'; g.lineWidth = 1;
        for (let e = lo; e <= hi; e++) {
          g.strokeStyle = C.line; g.beginPath(); g.moveTo(P.l, Y(10 ** e)); g.lineTo(w - P.r, Y(10 ** e)); g.stroke();
          g.fillStyle = C.muted; g.fillText(e === 0 ? '1' : String(10 ** e).replace(/^0\./, '.'), P.l - 5, Y(10 ** e));
        }
        const bw = (w - P.l - P.r) / N;
        for (let i = 0; i < N; i++) {
          const a = Math.exp(S.eta[i]);
          g.fillStyle = i < REL ? C.series[0] : C.series[4];
          g.globalAlpha = S.diverged ? 0.3 : 1;
          g.fillRect(P.l + i * bw + bw * 0.18, Y(a), bw * 0.64, h - P.b - Y(a));
        }
        g.globalAlpha = 1;
        g.save(); g.setLineDash([4, 4]); g.strokeStyle = C.series[2];
        g.beginPath(); g.moveTo(P.l, Y(lmsA)); g.lineTo(w - P.r, Y(lmsA)); g.stroke(); g.restore();
        g.fillStyle = C.series[2]; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(`LMS ${num(lmsA, 2)}`, w - P.r, Y(lmsA) - 2);
        g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'top';
        g.fillText('x1–x5 有用', P.l + bw * 2.5, h - P.b + 6); g.fillText('x6–x20 无关', P.l + bw * 12.5, h - P.b + 6);
        g.strokeStyle = C.rule; g.beginPath(); g.moveTo(P.l, P.t); g.lineTo(P.l, h - P.b); g.lineTo(w - P.r, h - P.b); g.stroke();
        g.save(); g.translate(11, P.t + (h - P.t - P.b) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('步长 αᵢ', 0, 0); g.restore();
      },
    });

    const job = ctx.loop(() => {
      const per = ctx.reduced() ? 40 : 200, t0 = performance.now();
      let more = true;
      for (let k = 0; k < per && more && performance.now() - t0 < 6; k++) more = step(S);
      ctx.redraw(); show();
      return more;
    });
    const _start = job.start;
    job.start = () => { pauseBtn.textContent = '暂停'; _start(); };
    job.onstop = () => { pauseBtn.textContent = S.t < TOTAL ? '继续' : '已完成'; };

    function restart() { job.stop(); S = create(seed, lmsA, meta); ctx.redraw(); show(); job.start(); }

    function show() {
      const scored = Math.max(0, S.t - FROM);
      const rel = Array.from(S.eta.slice(0, REL), Math.exp), irr = Array.from(S.eta.slice(REL), Math.exp);
      const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
      read.innerHTML = `第 <b>${S.t}</b> / ${TOTAL} 个样本（种子 ${seed}）。IDBD 步长均值：有用输入 <b>${num(mean(rel))}</b>，无关输入 <b>${num(mean(irr), 4)}</b>。` +
        (scored ? `<br>第 20001–${S.t} 个样本的均方误差　LMS <b>${num(S.el / scored, 2)}</b>　IDBD <b>${S.diverged ? '发散' : num(S.ei / scored, 2)}</b>` : '<br>计分段从第 20001 个样本开始。');
      const L = S.last;
      if (!L) { stepsBox.set([['点“继续”后这里列出最近一个样本上两个坐标的写入。', null]]); return; }
      const lines = [['各坐标共用一次误差', { html: ctx.m(`δ = y − w^⊤x = ${num(L.di)}`) }]];
      for (const c of L.coords) {
        const k = c.i + 1, tag = c.i < REL ? '有用' : '无关';
        lines.push([`$x_{${k}}$（${tag}）：对数步长`, { html: ctx.m(`η_{${k}} ← ${num(c.eta)} + ${meta}·(${num(L.di)})(${num(c.x)})(${num(c.s)})`) }]);
        lines.push(['得新的对数步长，再取指数', { html: ctx.m(`η_{${k}} = ${num(c.eta2)}，α_{${k}} = e^{${num(c.eta2)}} = `) + `<b>${num(c.a2, 4)}</b>` }]);
        lines.push(['敏感度', { html: ctx.m(`s_{${k}} ← [1 − α_{${k}}x_{${k}}^2]_+ s_{${k}} + α_{${k}}δx_{${k}} = ${num(c.s2)}`) }]);
      }
      stepsBox.set(lines, `计算过程　第 ${L.t} 个样本（算法 23.1 第 3、4 行）`);
    }
    show();
    job.start();
  });
})();
