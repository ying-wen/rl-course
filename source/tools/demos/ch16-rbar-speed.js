/* 第 16 章：率步长 β 的快与准。仓库总向左一直跑，第 0 步把 J_L 的交货奖励由 4 降为 2，率从 5/8 降到 3/8；
 * 多次独立运行差分 TD（α=.1，β=ια），画 R̄ 的均值与第 10、90 百分位，并与公式 σ√(β/(2−β))、ln10/β 对照。
 * 对应 16.6 节“快与准”的表（β=.1/.03/.01/.001）与图 ch16-rbar-speed；σ²=289/256。 */
(() => {
  const TRUE_V = [0, 11 / 4, -3 / 2, 27 / 8, -7 / 8, -1 / 4, -5 / 8]; // B, D_L, D_R, J_L, J_R, W, C；旧世界的真值
  const OLD = 5 / 8, NEW = 3 / 8, ALPHA = 0.1, SIGMA2 = 289 / 256;
  const BETAS = [0.1, 0.03, 0.01, 0.001];
  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* 一步：返回奖励，并把后继写进 s.z。rJL 是 J_L 的交货奖励。 */
  function move(s, rand, rJL) {
    switch (s.z) {
      case 0: s.z = rand() < 0.5 ? 1 : 2; return 0;
      case 1: s.z = 3; return 0;
      case 2: s.z = 4; return 0;
      case 3: s.z = 0; return rJL;
      case 4: s.z = 5; return 0;
      case 5: s.z = 6; return 1;
      default: s.z = 0; return 0;
    }
  }
  function tdStep(s, rand, rJL, beta) {
    const z = s.z, r = move(s, rand, rJL);
    const d = r - s.R + s.V[s.z] - s.V[z];
    s.V[z] += ALPHA * d; s.R += beta * d;
  }
  const model = {
    TRUE_V, OLD, NEW, ALPHA, SIGMA2, BETAS,
    formulaStd: (b) => Math.sqrt(SIGMA2 * b / (2 - b)),
    lagFormula: (b) => Math.log(10) / b,
    /* 并行的 N 次运行：每次从旧世界的真值（R̄=5/8，Ṽ=ṽ，位于 B）出发，第 0 步起奖励改为 2。
     * advance(budget) 每次推进约 budget 个“运行·步”，返回是否完成；mean[t] 是第 t 步 R̄ 的均值，
     * q10/q90 只在对数网格 grid 上记录。 */
    tracker(beta, N, T, seed) {
      const runs = Array.from({ length: N }, (_, i) => ({ V: TRUE_V.slice(), R: OLD, z: 0, rand: mulberry(seed * 7919 + i + 1) }));
      const mean = new Float64Array(T + 1); mean[0] = OLD;
      const grid = [], seen = new Set();
      for (let k = 0; k <= 200; k++) { const t = Math.round(10 ** (k * Math.log10(T) / 200)); if (!seen.has(t)) { seen.add(t); grid.push(t); } }
      const q10 = [], q90 = [], buf = new Float64Array(N);
      let t = 0, gi = 0;
      const tr = {
        beta, N, T, mean, grid, q10, q90,
        get t() { return t; },
        advance(budget) {
          let todo = Math.max(1, Math.floor(budget / N));
          while (todo-- > 0 && t < T) {
            t += 1;
            let s = 0;
            for (let i = 0; i < N; i++) { const run = runs[i]; tdStep(run, run.rand, 2, beta); s += run.R; buf[i] = run.R; }
            mean[t] = s / N;
            if (gi < grid.length && grid[gi] === t) {
              const sorted = Array.from(buf).sort((a, b) => a - b);
              q10.push([t, sorted[Math.floor(0.1 * (N - 1))]]); q90.push([t, sorted[Math.ceil(0.9 * (N - 1))]]);
              gi += 1;
            }
          }
          return t >= T;
        },
        /* 均值第一次走完 90% 落差（R̄ ≤ 5/8 − .9×1/4）的步数。 */
        lag() { const lvl = OLD - 0.9 * (OLD - NEW); for (let k = 0; k <= t; k++) if (mean[k] <= lvl) return k; return null; },
      };
      return tr;
    },
    /* 未变的世界里长时间运行，取后 90% 时段 R̄ 的标准差。可分段推进。 */
    stationary(beta, L, seed) {
      const run = { V: TRUE_V.slice(), R: OLD, z: 0 }, rand = mulberry(seed * 104729 + 17);
      let t = 0, n = 0, s1 = 0, s2 = 0;
      return {
        beta, L,
        advance(budget) {
          const end = Math.min(L, t + budget);
          for (; t < end; t++) { tdStep(run, rand, 4, beta); if (t >= L / 10) { s1 += run.R; s2 += run.R * run.R; n++; } }
          return t >= L;
        },
        get done() { return t >= L; },
        get progress() { return t / L; },
        std() { if (!n) return null; const m = s1 / n; return Math.sqrt(Math.max(0, s2 / n - m * m)); },
      };
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 3) => {
    if (x == null || !Number.isFinite(x)) return '—';
    let s = x.toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace(/^(-?)0\./, '$1.').replace('-', '−');
  };
  const big = (x) => (x == null ? '—' : x >= 1000 ? String(Math.round(x)).replace(/\B(?=(\d{3})+$)/, ' ') : String(Math.round(x)));
  const T = 10000;
  const STAT_L = { 0.1: 200000, 0.03: 300000, 0.01: 500000, 0.001: 1500000 };

  RLDemo.register('ch16-rbar-speed', (ctx) => {
    const { el } = ctx;
    let sel = 0.01, N = 200, seed = 1, jobs = [], trackers = {}, stats = {}, cursor = 0;

    function start() {
      trackers = {}; stats = {}; jobs = [];
      for (const b of BETAS) { trackers[b] = model.tracker(b, N, T, seed); jobs.push(trackers[b]); }
      for (const b of BETAS) { stats[b] = model.stationary(b, STAT_L[b], seed); jobs.push(stats[b]); }
      cursor = 0; work.start();
    }
    const work = ctx.loop(() => {
      const t0 = performance.now();
      while (cursor < jobs.length && performance.now() - t0 < 6) {
        if (jobs[cursor].advance(ctx.reduced() ? 20000 : 40000)) cursor += 1;
      }
      update();
      return cursor < jobs.length;
    });
    const _start = work.start;
    work.start = () => { rerun.disabled = true; _start(); };
    work.onstop = () => { rerun.disabled = false; update(); };

    const segB = ctx.segmented(BETAS.map((b) => [b, 'β = ' + num(b)]), sel, (v) => { sel = v; update(); }, '突出显示的率步长');
    const segN = ctx.segmented([[100, '100 次'], [200, '200 次'], [400, '400 次']], N, (v) => { N = v; work.stop(); start(); }, '独立运行次数');
    const rerun = ctx.button('换随机种子重跑', () => { seed += 1; work.stop(); start(); }, true);
    const read = ctx.readout();
    const tableBox = el('div', { style: 'overflow-x:auto;max-width:100%' });
    const box = ctx.steps('公式从哪里来');
    const plotBox = el('div');
    ctx.stage.append(ctx.row(segB.node), ctx.row(segN.node, rerun), plotBox, read, tableBox, box.node);

    const LX = (t) => Math.log10(Math.max(1, t));
    ctx.canvas({
      parent: plotBox, aspect: 0.55, maxHeight: 360, minHeight: 240, label: '奖励变化后各率步长下 R̄ 的均值与第 10 至 90 百分位，横轴为对数刻度的步数',
      draw(g, w, h) {
        const Cc = ctx.colors();
        const series = [];
        BETAS.forEach((b, k) => {
          const tr = trackers[b]; if (!tr) return;
          const pts = [];
          for (const tt of tr.grid) { if (tt > tr.t) break; pts.push([LX(tt), tr.mean[tt]]); }
          series.push({ data: pts, color: Cc.series[k], width: b === sel ? 2.6 : 1.3, dash: b === sel ? null : [5, 3] });
        });
        const P = ctx.plot(g, w, h, {
          series, xmin: 0, xmax: 4, ymin: 0.1, ymax: 0.9, xlabel: '奖励变化后的步数（对数刻度）', ylabel: 'R̄', yticks: 4, xticks: 4,
          pad: { l: 40, b: 36, r: 12 },
          hlines: [{ y: OLD, color: Cc.muted, label: '旧率 5/8' }, { y: NEW, color: Cc.muted, label: '新率 3/8' }, { y: OLD - 0.225, color: Cc.series[4] }],
        });
        g.fillStyle = Cc.series[4]; g.font = ctx.font(11); g.textAlign = 'left'; g.textBaseline = 'top';
        g.fillText('走完九成 .4', P.P.l + 4, P.Y(OLD - 0.225) + 2);
        // 百分位带
        const tr = trackers[sel];
        if (tr && tr.q10.length > 1) {
          g.save(); g.globalAlpha = Cc.dark ? 0.28 : 0.2; g.fillStyle = Cc.series[BETAS.indexOf(sel)];
          g.beginPath();
          tr.q90.forEach(([tt, y], i) => (i ? g.lineTo(P.X(LX(tt)), P.Y(y)) : g.moveTo(P.X(LX(tt)), P.Y(y))));
          for (let i = tr.q10.length - 1; i >= 0; i--) g.lineTo(P.X(LX(tr.q10[i][0])), P.Y(tr.q10[i][1]));
          g.closePath(); g.fill(); g.restore();
          const lag = tr.lag();
          if (lag) {
            g.strokeStyle = Cc.series[BETAS.indexOf(sel)]; g.setLineDash([2, 3]); g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(P.X(LX(lag)), P.Y(0.1)); g.lineTo(P.X(LX(lag)), P.Y(OLD - 0.225)); g.stroke(); g.setLineDash([]);
          }
        }
        // 横轴刻度改写成 1、10、100……
        g.fillStyle = Cc.bg; g.fillRect(P.P.l - 14, h - P.P.b + 2, w - P.P.l - P.P.r + 28, 16);
        g.fillStyle = Cc.muted; g.font = ctx.font(12); g.textAlign = 'center'; g.textBaseline = 'top';
        ['1', '10', '100', '1000', '10⁴'].forEach((s, k) => g.fillText(s, P.X(k), h - P.P.b + 6));
      },
    });
    plotBox.append(ctx.legend(BETAS.map((b, k) => [`var(--d${k + 1})`, 'β = ' + num(b)]).concat([['var(--d5)', '九成落差线 .4']])));

    function update() {
      const done = !work.running;
      const total = jobs.length;
      const prog = total ? (cursor + (cursor < total ? (jobs[cursor].progress ?? (jobs[cursor].t / T)) : 0)) / total : 1;
      read.innerHTML = (done ? `已完成：每个 β 各 ${N} 次独立运行，每次 ${big(T)} 步；平时的标准差取未变世界里的一次长运行。`
        : `模拟中 <b>${Math.round(prog * 100)}%</b>（每帧只算几毫秒，可以先看已算出的部分）。`) +
        `<br>粗线与色带是 β = ${num(sel)}：色带为第 10 与第 90 百分位，竖虚线是均值走完九成落差的步数。`;
      const rows = BETAS.map((b) => {
        const tr = trackers[b], s = stats[b];
        const sd = s && s.done ? s.std() : null, lag = tr ? tr.lag() : null;
        const prod = sd != null && lag != null ? lag * sd * sd : null;
        const hl = b === sel ? ' style="font-weight:600"' : '';
        return `<tr${hl}><td>${num(b)}</td><td>${num(sd)}</td><td>${num(model.formulaStd(b))}</td><td>${big(lag)}</td><td>${big(model.lagFormula(b))}</td><td>${num(prod, 2)}</td></tr>`;
      }).join('');
      tableBox.innerHTML = '<table style="width:100%;font-size:.86em;font-variant-numeric:tabular-nums"><thead><tr><th>β</th><th>标准差<br>模拟</th><th>公式<br>σ√(β/(2−β))</th><th>跟上九成<br>模拟</th><th>ln10/β</th><th>步数<br>×方差</th></tr></thead>' +
        `<tbody>${rows}</tbody></table>`;
      for (const c of tableBox.querySelectorAll('th,td')) { c.style.padding = '.35em .3em'; c.style.minWidth = '0'; c.style.whiteSpace = 'nowrap'; }
      const b = sel;
      box.set([
        ['价值表取真值时，只有回到 $B$ 看指示的一步随机，占全部步数的 1/4', 'δ = ±17/8，各半'],
        ['误差的方差', 'σ^2 = 1/4 × (17/8)^2 = 289/256'],
        [`R̄ 是误差的指数加权和，β = ${num(b)} 时平稳标准差`, { html: ctx.m(`σ√(β/(2-β)) = ${num(Math.sqrt(SIGMA2))}×√(${num(b)}/${num(2 - b)}) = `) + `<b>${num(model.formulaStd(b))}</b>` }],
        ['落差每步缩小约 1−β，剩一成所需步数', { html: ctx.m(`ln10/β = 2.303/${num(b)} = `) + `<b>${big(model.lagFormula(b))}</b>` }],
        ['两者相乘与 β 无关', { html: ctx.m('(σ^2β/2)×(ln10/β) = σ^2 ln10/2 ≈ ') + '<b>1.30</b>' }],
      ]);
      ctx.redraw();
    }

    start(); update();
  });
})();
