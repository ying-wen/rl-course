/* 第 23 章：不重置的经验流上，元梯度调的共享步长先缩小、在奖励改变后再被拉回。
 * 对应 23.6 节开头的共享预测器：初值 0、步长 .5，回报 4 或 1 各半；每趟先用写入前的预测计分，
 * 按 23.1 节的完整敏感度递推 s_{k+1} = (G_k − w_k) + (1 − α)s_k 算元梯度，元步长 .025，步长截在 [0,1]，再写入；
 * 第 500 趟起 W→C 的奖励由 1 改为 3。1000 条流，正文读数：第 20 趟中位数约 .22，第 100、500 趟约 .07、.09。 */
(() => {
  const K = 1000;

  function rng(seed = 1) {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return r;
  }
  const mixSeed = (a, b) => (Math.imul(a + 1, 0x9E3779B1) ^ Math.imul(b + 1, 0x85EBCA77)) >>> 0;

  /* 一条流：同一串回报同时喂给元梯度学习器与写定 .5 的学习器。
   * 返回 A[k]（第 k 趟写入后的步长）、两者的 |w − Ḡ|，以及逐趟记录 log（只在 keepLog 时保存）。 */
  function stream(r, { meta = 0.025, change = 500, newR = 3, keepLog = false } = {}) {
    let w = 0, a = 0.5, s = 0, wf = 0;
    const A = new Float64Array(K + 1), Em = new Float64Array(K + 1), Ef = new Float64Array(K + 1), log = keepLog ? [] : null;
    A[0] = a;
    for (let k = 1; k <= K; k++) {
      const after = change && k > change, right = r() < 0.5, G = right ? (after ? newR : 1) : 4;
      const gbar = change && k >= change ? (4 + newR) / 2 : 2.5;
      const grad = (w - G) * s, a0 = a, w0 = w, s0 = s;
      a = Math.min(1, Math.max(0, a - meta * grad));
      s = (G - w) + (1 - a) * s;
      w = w + a * (G - w);
      wf = wf + 0.5 * (G - wf);
      A[k] = a; Em[k] = Math.abs(w - gbar); Ef[k] = Math.abs(wf - gbar);
      if (log) log.push({ k, G, w0, s0, a0, grad, a, s, w });
    }
    return { A, Em, Ef, log };
  }

  /* 把同一协议在两趟上反复重置：α ← α − .025·(4α − 1)·4（章首的“趋于 .25”）。 */
  function resetSeq(n, a = 0.5, meta = 0.025) {
    const out = [a];
    for (let i = 0; i < n; i++) { a -= meta * (4 * a - 1) * 4; out.push(a); }
    return out;
  }

  function batch(seed, n, opts) { return { seed, n, opts, done: 0, A: [], Em: [], Ef: [] }; }
  function advance(B, m = 100) {
    for (let j = 0; j < m && B.done < B.n; j++, B.done++) {
      const o = stream(rng(mixSeed(B.seed, B.done)), B.opts);
      B.A.push(o.A); B.Em.push(o.Em); B.Ef.push(o.Ef);
    }
    return B.done < B.n;
  }
  function quant(arrs, k, q) {
    const v = arrs.map((x) => x[k]).sort((x, y) => x - y), p = q * (v.length - 1), i = Math.floor(p);
    return v.length ? v[i] + (v[Math.min(i + 1, v.length - 1)] - v[i]) * (p - i) : NaN;
  }
  const frac = (arrs, k, f) => arrs.filter((x) => f(x[k])).length / Math.max(1, arrs.length);

  const model = { K, rng, mixSeed, stream, resetSeq, batch, advance, quant, frac };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 3) => (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d).replace(/^(-?)0\./, '$1.').replace('-', '−');

  RLDemo.register('ch23-meta-stream', (ctx) => {
    const { el } = ctx;
    let meta = 0.025, change = 500, seed = 1, B, one, kSel = 2;

    const metaSeg = ctx.segmented([[0.01, '.01'], [0.025, '.025'], [0.05, '.05']], meta, (v) => { meta = v; restart(); }, '元步长');
    const chSeg = ctx.segmented([[500, '第 500 趟奖励 1→3'], [0, '奖励不变']], change, (v) => { change = v; restart(); }, '是否改变奖励');
    const kSl = ctx.slider({ label: '查看第 k 趟', min: 1, max: K, step: 1, value: kSel, format: (v) => `k = ${v}`, oninput: (v) => { kSel = v; ctx.redraw(); show(); } });
    const seedBtn = ctx.button('换一组随机种子', () => { seed += 1; restart(); });
    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const pa = el('div'), pb = el('div');
    ctx.stage.append(ctx.row(el('span', { class: 'demo-note', text: '元步长' }), metaSeg.node, chSeg.node), ctx.row(kSl.node, seedBtn),
      el('div', { class: 'demo-grid2' }, pa, pb), read, stepsBox.node);

    ctx.canvas({
      parent: pa, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '各趟步长的中位数与四分位带，细线是第一条流',
      draw(g, w, h) {
        const C = ctx.colors(), { med, q1, q3 } = curves(), first = [];
        for (let k = 0; k <= K; k += 2) first.push([k, one.A[k]]);
        const P = ctx.plot(g, w, h, {
          series: [{ data: first, color: C.faint, width: 1 }, { data: med, color: C.series[0], width: 2 }],
          xmin: 0, xmax: K, ymin: 0, ymax: 0.6, xlabel: '趟数', ylabel: '步长 α', yticks: 3, xticks: 4, pad: { l: 36, r: 18 },
          hlines: [{ y: 0.5, color: C.series[2], label: '写定 .5' }],
        });
        if (q1.length) {
          g.save(); g.fillStyle = C.series[0]; g.globalAlpha = 0.18; g.beginPath();
          q3.forEach(([x, y], i) => (i ? g.lineTo(P.X(x), P.Y(y)) : g.moveTo(P.X(x), P.Y(y))));
          for (let i = q1.length - 1; i >= 0; i--) g.lineTo(P.X(q1[i][0]), P.Y(q1[i][1]));
          g.fill(); g.restore();
        }
        g.save(); g.strokeStyle = C.muted; g.setLineDash([2, 3]);
        if (change) { g.beginPath(); g.moveTo(P.X(change), P.P.t); g.lineTo(P.X(change), h - P.P.b); g.stroke(); }
        g.strokeStyle = C.ink; g.setLineDash([]); g.globalAlpha = 0.6;
        g.beginPath(); g.moveTo(P.X(kSel), P.P.t); g.lineTo(P.X(kSel), h - P.P.b); g.stroke(); g.restore();
      },
    });
    ctx.canvas({
      parent: pb, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '奖励改变后预报与新均值之差的中位数，写定 .5 与元梯度调的对比',
      draw(g, w, h) {
        const C = ctx.colors(), { dm, df } = curves();
        ctx.plot(g, w, h, {
          series: [{ data: df, color: C.series[2], width: 1.6, dash: [5, 4] }, { data: dm, color: C.series[0], width: 2 }],
          xmin: 0, xmax: 60, ymin: 0, ymax: 1.2, xlabel: change ? '奖励改变后的趟数' : '第 500 趟后的趟数', ylabel: '|w − Ḡ| 中位数', yticks: 4, xticks: 3, pad: { l: 36 },
        });
      },
    });

    /* 分位数曲线按已完成的流数缓存，拖动滑块时不重算。 */
    let cache = null;
    function curves() {
      if (cache && cache.B === B && cache.done === B.done) return cache;
      const c = { B, done: B.done, med: [], q1: [], q3: [], dm: [], df: [] }, c0 = change || 500;
      if (B.done) {
        for (let k = 0; k <= K; k += 4) { c.med.push([k, quant(B.A, k, 0.5)]); c.q1.push([k, quant(B.A, k, 0.25)]); c.q3.push([k, quant(B.A, k, 0.75)]); }
        for (let j = 1; j <= 60; j++) { c.dm.push([j, quant(B.Em, c0 + j, 0.5)]); c.df.push([j, quant(B.Ef, c0 + j, 0.5)]); }
      }
      return (cache = c);
    }

    const job = ctx.loop(() => { const more = advance(B, ctx.reduced() ? 25 : 100); ctx.redraw(); show(); return more; });

    function restart() {
      job.stop();
      const opts = { meta, change };
      B = batch(seed, 1000, opts);
      one = stream(rng(mixSeed(seed, 0)), { ...opts, keepLog: true });
      ctx.redraw(); show(); job.start();
    }

    function show() {
      const at = (k) => (B.done ? num(quant(B.A, k, 0.5), 2) : '—');
      const tail = change ? `；改变后第 5、10 趟 <b>${at(change + 5)}</b>、<b>${at(change + 10)}</b>` : '';
      read.innerHTML = `已完成 <b>${B.done}</b> / ${B.n} 条流（种子 ${seed}）。步长中位数：第 20 趟 <b>${at(20)}</b>，第 100 趟 <b>${at(100)}</b>，` +
        `第 500 趟 <b>${at(500)}</b>${tail}，第 1000 趟 <b>${at(1000)}</b>。` +
        (B.done ? `<br>第 500 趟低于 .25 的流占 <b>${num(frac(B.A, 500, (x) => x < 0.25), 2)}</b>，落到 0 的占 <b>${num(frac(B.A, 500, (x) => x === 0), 2)}</b>；第 ${kSel} 趟中位数 <b>${at(kSel)}</b>。` : '');
      const L = one.log[kSel - 1], pre = L.w0, Gs = L.G;
      stepsBox.set([
        [`第一条流第 ${kSel} 趟的回报 $G_k$ = ${Gs}；先用写入前的 $w_k$、$s_k$ 计分`, 'g = (w_k − G_k) s_k'],
        ['代入', { html: ctx.m(`g = (${num(pre)} − ${Gs})(${num(L.s0)}) = ${num(L.grad)}`) }],
        ['更新步长并截在 [0, 1]', { html: ctx.m(`α ← ${num(L.a0)} − ${meta}·(${num(L.grad)}) = `) + `<b>${num(L.a)}</b>` }],
        ['再写入敏感度', { html: ctx.m(`s_{k+1} = (G_k − w_k) + (1 − α)s_k = (${Gs} − ${num(pre)}) + (1 − ${num(L.a)})(${num(L.s0)}) = ${num(L.s)}`) }],
        ['与预测', { html: ctx.m(`w_{k+1} = w_k + α(G_k − w_k) = ${num(L.w)}`) }],
      ], `计算过程　第一条流第 ${kSel} 趟`);
    }
    restart();
  });
})();
