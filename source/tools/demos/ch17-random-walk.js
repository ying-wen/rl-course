/* 第 17 章：19 状态随机游走上，λ 固定时三种写法的误差随步长 α 的变化：累积迹 TD(λ)、离线 λ 回报、真在线 TD(λ)。
 * 对应 17.2 节“19 状态随机游走：误差隔约一百步才到”的第二条结论（Sutton 与 Barto 图 12.6 的设定）与 17.4 节的表。
 * “正文那批”是本课重跑程序 demos/ch17_lit_rw19.py 所用的同一批游走（numpy default_rng(17)，100 次运行×10 回合），
 * 每步左右用一位记下，打包成下面的 BITS；“另一批”用 mulberry32 按种子另抽。 */
(() => {
  const BITS = (
    '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' +
    'pDC3Db3uvvA='
  );
  const N = 19, EPIS = 10, RUNS = 100, CAP = 1e6;
  const TRUE = Array.from({ length: N + 2 }, (_, i) => (i >= 1 && i <= N ? (i - 10) / 10 : 0));
  const ALPHAS = Array.from({ length: 20 }, (_, k) => +((k + 1) * 0.05).toFixed(2));
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function decode64(s) {
    const out = [];
    let buf = 0, n = 0;
    for (const ch of s) {
      const v = B64.indexOf(ch);
      if (v < 0) continue;
      buf = (buf << 6) | v; n += 6;
      if (n >= 8) { n -= 8; out.push((buf >> n) & 255); }
    }
    return Uint8Array.from(out);
  }
  /* 位串 → runs×EPIS 条路径；路径含起点 10 与终点 0 或 20。 */
  function walksFromBits(bytes, runs = RUNS) {
    let i = 0;
    const W = [];
    for (let r = 0; r < runs; r++) {
      const ep = [];
      for (let e = 0; e < EPIS; e++) {
        const p = [10];
        let s = 10;
        while (s > 0 && s <= N) { s += (bytes[i >> 3] >> (7 - (i & 7))) & 1 ? 1 : -1; i++; p.push(s); }
        ep.push(Int8Array.from(p));
      }
      W.push(ep);
    }
    return W;
  }
  function walksFromRng(R, runs = RUNS) {
    const W = [];
    for (let r = 0; r < runs; r++) {
      const ep = [];
      for (let e = 0; e < EPIS; e++) {
        const p = [10];
        let s = 10;
        while (s > 0 && s <= N) { s += R() < 0.5 ? -1 : 1; p.push(s); }
        ep.push(Int8Array.from(p));
      }
      W.push(ep);
    }
    return W;
  }
  const rms = (V) => { let s = 0; for (let i = 1; i <= N; i++) s += (V[i] - TRUE[i]) ** 2; return Math.sqrt(s / N); };
  const rew = (s) => (s === N + 1 ? 1 : s === 0 ? -1 : 0);
  /* 一个回合，原地改 V；stats 非空时（累积迹）记录 α e(S_t) 的最大值与超过 1 的步数。返回 false 表示发散。 */
  function episode(method, V, p, a, lam, stats) {
    const T = p.length - 1;
    if (method === 'offline') {
      const V0 = V.slice(), G = new Float64Array(T);
      let g = 0;
      for (let t = T - 1; t >= 0; t--) { const s2 = p[t + 1]; g = t === T - 1 ? rew(s2) : (1 - lam) * V0[s2] + lam * g; G[t] = g; }
      for (let t = 0; t < T; t++) { const s = p[t]; V[s] += a * (G[t] - V[s]); }
    } else {
      const e = new Float64Array(N + 2);
      let vold = V[p[0]];
      for (let t = 0; t < T; t++) {
        const s = p[t], s2 = p[t + 1], term = t === T - 1, v = V[s], v2 = term ? 0 : V[s2], r = rew(s2);
        if (method === 'acc') {
          const d = r + v2 - v;
          for (let i = 1; i <= N; i++) e[i] *= lam;
          e[s] += 1;
          if (stats) { const ae = a * e[s]; stats.steps++; if (ae > 1) stats.over++; if (ae > stats.max) stats.max = ae; }
          for (let i = 1; i <= N; i++) if (e[i] !== 0) V[i] += a * d * e[i];
        } else { // 真在线 TD(λ)，算法 17.2，表格特征
          const d = r + v2 - vold, es = e[s];
          for (let i = 1; i <= N; i++) e[i] *= lam;
          e[s] += 1 - a * lam * es;
          for (let i = 1; i <= N; i++) if (e[i] !== 0) V[i] += a * d * e[i];
          V[s] += a * (vold - v);
          vold = v2;
        }
        if (!(Math.abs(V[s]) < CAP)) return false;
      }
    }
    for (let i = 1; i <= N; i++) if (!(Math.abs(V[i]) < CAP)) return false;
    return true;
  }
  const model = {
    N, EPIS, RUNS, TRUE, ALPHAS, rms,
    walksText: () => walksFromBits(decode64(BITS)),
    walksFromRng,
    /* 第 r0…r1−1 次运行：每回合末 RMS 的和；发散则 div = true。 */
    partial(method, lam, a, W, r0, r1, stats) {
      let sum = 0, div = false;
      for (let r = r0; r < r1 && !div; r++) {
        const V = new Float64Array(N + 2);
        for (const p of W[r]) { if (!episode(method, V, p, a, lam, stats)) { div = true; break; } sum += rms(V); }
      }
      return { sum, div };
    },
    /* 前 10 回合、全部运行的平均 RMS；发散记 Infinity。 */
    point(method, lam, a, W, stats) {
      const { sum, div } = model.partial(method, lam, a, W, 0, W.length, stats);
      return div ? Infinity : sum / (W.length * EPIS);
    },
    meanLength(W) { let s = 0, n = 0; for (const ep of W) for (const p of ep) { s += p.length - 1; n++; } return s / n; },
    initRms: () => rms(new Float64Array(N + 2)),
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 3) => {
    if (!Number.isFinite(x)) return '发散';
    let s = x.toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace(/^(-?)0\./, '$1.').replace('-', '−');
  };
  const METHODS = [['acc', '累积迹 TD(λ)'], ['offline', '离线 λ 回报'], ['true', '真在线 TD(λ)']];

  RLDemo.register('ch17-random-walk', (ctx) => {
    const { el } = ctx;
    let lam = 0.9, look = 0.65, batch = 'text', seed = 1, W = model.walksText();
    const res = {}; // res[method] = 20 个 α 上的值（未算完为 null）
    let job = null;

    const lamSeg = ctx.segmented([[0, '0'], [0.4, '.4'], [0.8, '.8'], [0.9, '.9'], [0.95, '.95'], [1, '1']], lam, (v) => { lam = v; restart(); }, '迹参数 λ');
    const batchSeg = ctx.segmented([['text', '正文那批游走'], ['new', '另抽一批']], batch, (v) => {
      batch = v; W = v === 'text' ? model.walksText() : model.walksFromRng(ctx.rng(seed)); restart();
    }, '游走批次');
    const again = ctx.button('换种子', () => { seed += 1; batch = 'new'; batchSeg.set('new'); W = model.walksFromRng(ctx.rng(seed)); restart(); });
    const lookS = ctx.slider({ label: '查看 α', min: 0.05, max: 1, step: 0.05, value: look, format: (x) => num(x, 2), oninput: (x) => { look = +x.toFixed(2); update(); } });
    const read = ctx.readout();
    const box = ctx.steps();
    /* 阅读稿正文对 li 两端对齐，计算过程里改为左对齐。 */
    const setBox = (lines, title) => { box.set(lines, title); box.node.querySelectorAll('li').forEach((li) => { li.style.textAlign = 'left'; }); };
    const top = el('div');
    ctx.stage.append(ctx.row(el('span', { class: 'demo-note', text: 'λ' }), lamSeg.node), ctx.row(batchSeg.node, again), top, ctx.row(lookS.node), read, box.node);

    const YMAX = 0.8;
    ctx.canvas({
      parent: top, aspect: 0.56, maxHeight: 330, minHeight: 220, label: '平均 RMS 误差随步长的变化，三种写法',
      draw(g, w, h) {
        const C = ctx.colors(), col = { acc: C.series[2], offline: C.series[3], true: C.accent };
        const data = (m) => (res[m] || []).map((v, k) => [ALPHAS[k], v == null ? NaN : Math.min(v, YMAX + 0.04)]);
        const P = ctx.plot(g, w, h, {
          series: METHODS.map(([m]) => ({ data: data(m), color: col[m], width: m === 'true' ? 2 : 2.4, dash: m === 'true' ? [5, 3] : null })),
          xmin: 0, xmax: 1, ymin: 0, ymax: YMAX, xlabel: '步长 α', ylabel: '前 10 回合平均 RMS', xticks: 5, yticks: 4, pad: { l: 44 },
          hlines: [{ y: model.initRms(), color: C.muted, label: '零初值 .548' }],
        });
        g.strokeStyle = C.series[2]; g.fillStyle = C.series[2]; g.lineWidth = 1.6; g.font = ctx.font(11, 600); g.textAlign = 'center'; g.textBaseline = 'bottom';
        (res.acc || []).forEach((v, k) => {
          if (v == null || v <= YMAX) return;
          const x = P.X(ALPHAS[k]), y = P.Y(YMAX) + 6;
          if (!Number.isFinite(v)) { g.beginPath(); g.moveTo(x - 3.5, y - 3.5); g.lineTo(x + 3.5, y + 3.5); g.moveTo(x + 3.5, y - 3.5); g.lineTo(x - 3.5, y + 3.5); g.stroke(); }
          else { g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y - 4); g.lineTo(x - 3, y - 1); g.moveTo(x, y - 4); g.lineTo(x + 3, y - 1); g.stroke(); }
        });
        const x = P.X(look);
        g.strokeStyle = C.muted; g.setLineDash([2, 3]); g.lineWidth = 1; g.beginPath(); g.moveTo(x, P.Y(0)); g.lineTo(x, P.Y(YMAX)); g.stroke(); g.setLineDash([]);
      },
    });
    top.append(ctx.legend([['var(--d3)', '累积迹（↑ 超出图顶，× 发散）'], ['var(--d4)', '离线 λ 回报'], ['var(--accent)', '真在线 TD（虚线）']]));

    function restart() {
      for (const [m] of METHODS) res[m] = ALPHAS.map(() => null);
      job = { mi: 0, ai: 0, r: 0, sum: 0, div: false };
      run.start(); update();
    }
    /* 分帧计算：每帧最多约 6 ms，按 10 次运行一块推进。 */
    const run = ctx.loop(() => {
      const t0 = performance.now();
      while (job && performance.now() - t0 < 6) {
        const m = METHODS[job.mi][0], a = ALPHAS[job.ai];
        if (!job.div) { const p = model.partial(m, lam, a, W, job.r, job.r + 10); job.sum += p.sum; job.div = p.div; }
        job.r += 10;
        if (job.r >= W.length || job.div) {
          res[m][job.ai] = job.div ? Infinity : job.sum / (W.length * model.EPIS);
          job.r = 0; job.sum = 0; job.div = false; job.ai += 1;
          if (job.ai >= ALPHAS.length) { job.ai = 0; job.mi += 1; if (job.mi >= METHODS.length) job = null; }
        }
      }
      update();
      return job !== null;
    });

    function update() {
      const k = ALPHAS.indexOf(look), v = (m) => res[m] && res[m][k];
      const done = METHODS.reduce((s, [m]) => s + (res[m] || []).filter((x) => x != null).length, 0), total = METHODS.length * ALPHAS.length;
      read.innerHTML = (done < total ? `计算中：${done} / ${total} 个 (方法, α) 组合。` : `已算完 ${total} 个组合。`) +
        `${batch === 'text' ? '正文那批游走' : `另抽的一批（种子 ${seed}）`}：100 次运行 × 10 回合，平均每回合 ${num(model.meanLength(W), 2)} 步。`;
      const lines = [];
      lines.push(['度量，每回合末算一次，再对 1000 个回合平均', 'RMS = √(Σ_s (V(s) − v_π(s))^2 / 19)']);
      lines.push(['零初值的误差', `√(Σ_s v_π(s)^2 / 19) = ${num(model.initRms())}`]);
      const sa = num(look, 2), sl = num(lam, 2);
      lines.push([`累积迹，α = ${sa}`, { html: ctx.m(`e ← ${sl}e + x_t，w ← w + αδ_t e`) + `　<b>${v('acc') == null ? '…' : num(v('acc'))}</b>` }]);
      lines.push([`离线 λ 回报`, { html: ctx.m(`回合末依次 V(S_t) ← V(S_t) + α(G_t^λ − V(S_t))`) + `　<b>${v('offline') == null ? '…' : num(v('offline'))}</b>` }]);
      lines.push([`真在线 TD`, { html: ctx.m(`Dutch 迹 e ← ${sl}e + (1 − α · ${sl} · e(S_t))x_t`) + `　<b>${v('true') == null ? '…' : num(v('true'))}</b>` }]);
      if (done === total) {
        const st = { steps: 0, over: 0, max: 0 };
        model.partial('acc', lam, look, W, 0, 10, st);
        lines.push([`累积迹在前 10 次运行里，当前格的 $αe(S_t)$`, `最大 ${num(st.max, 2)}；超过 1 的步占 ${num((100 * st.over) / Math.max(1, st.steps), 1)}%`]);
        lines.push(['$αe(S_t) > 1$ 时，这一步对 $V(S_t)$ 的写入越过它自己的一步目标', null]);
      }
      setBox(lines, `计算过程　λ = ${sl}，α = ${sa}`);
      ctx.redraw();
    }
    restart();
  });
})();
