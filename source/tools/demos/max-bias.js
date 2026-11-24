/* 第 6 章：最大化偏差与 Double Q-learning，Sutton 与 Barto 例 6.7（6.7 节“多次运行的比较”）。
 * A：向右终止、回报 0；向左到 B、奖励 0。B 有 n_B 个动作，各以 N(−.1, 1) 的奖励终止。
 * ε = .1，α = .1，γ = 1，Q 初值 0，每次运行 300 回合，2000 次运行取平均；并列最大随机打破，
 * 行为对 Q^A + Q^B 作 ε-贪心，同 demos/ch06_double_q_runs.py。 */
(() => {
  function rng(seed = 1) {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (n) => Math.floor(r() * n);
    r.normal = () => {
      let u = 0;
      while (u === 0) u = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
    };
    return r;
  }
  /* 并列最大中均匀取一个；q 可以是两张表之和（传 q2） */
  function argmax(R, q, q2) {
    let best = -Infinity, n = 0, pick = 0;
    for (let i = 0; i < q.length; i++) {
      const v = q2 ? q[i] + q2[i] : q[i];
      if (v > best + 1e-12) { best = v; n = 1; pick = i; } else if (v >= best - 1e-12) { n += 1; if (R.int(n) === 0) pick = i; }
    }
    return pick;
  }
  /* 一次运行，结果累加进 acc：left[ep] 是 A 处选左的次数，boot[ep] 是该回合 A 处自举项（若向左）的值 */
  function run(double, R, acc, { episodes = 300, nB = 10, eps = 0.1, alpha = 0.1 } = {}) {
    const qa = [new Float64Array(2), new Float64Array(2)], qb = [new Float64Array(nB), new Float64Array(nB)];
    for (let ep = 0; ep < episodes; ep++) {
      const greedy = double ? argmax(R, qa[0], qa[1]) : argmax(R, qa[0]);
      const a = R() < eps ? R.int(2) : greedy; // 0 = 左，1 = 右
      if (a === 0) acc.left[ep] += 1;
      const I = double ? R.int(2) : 0, J = double ? 1 - I : 0;
      const sel = argmax(R, qb[I]);
      const boot = qb[J][sel]; // Q-learning：I = J，即 max_c Q(B,c)；Double：Q^J(B, argmax_c Q^I(B,c))
      acc.boot[ep] += boot;
      qa[I][a] += alpha * ((a === 0 ? boot : 0) - qa[I][a]);
      if (a === 0) {
        const g = double ? argmax(R, qb[0], qb[1]) : argmax(R, qb[0]);
        const b = R() < eps ? R.int(nB) : g;
        const r = -0.1 + R.normal();
        const U = double ? R.int(2) : 0;
        qb[U][b] += alpha * (r - qb[U][b]);
      }
    }
  }
  function batch(double, seed, runs, opt = {}) {
    const episodes = opt.episodes || 300, R = rng(seed);
    const acc = { left: new Float64Array(episodes), boot: new Float64Array(episodes), n: 0 };
    for (let i = 0; i < runs; i++) { run(double, R, acc, opt); acc.n += 1; }
    return acc;
  }
  /* 正文的最小例子：两个真值为 0 的估计，各等概率 ±.1 */
  function fourCombos() {
    let sMax = 0, sDouble = 0;
    for (const x of [-0.1, 0.1]) for (const y of [-0.1, 0.1]) {
      sMax += Math.max(x, y) / 4;
      // 独立的第二张表 (x′, y′) 给第一张表选中的动作估值
      for (const x2 of [-0.1, 0.1]) for (const y2 of [-0.1, 0.1]) sDouble += (x >= y ? (x > y ? x2 : (x2 + y2) / 2) : y2) / 16;
    }
    return { max: sMax, double: sDouble };
  }
  const model = { rng, argmax, run, batch, fourCombos };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('max-bias', (ctx) => {
    ctx.stage.style.textAlign = 'left'; // 页面正文两端对齐，计算过程里的长说明会被拉开字距
    const { fmt } = ctx;
    const RUNS = 2000, EPISODES = 300;
    let nB = 10, look = 21, acc, Rq, Rd;

    function reset() {
      loop.stop();
      acc = { q: { left: new Float64Array(EPISODES), boot: new Float64Array(EPISODES), n: 0 }, d: { left: new Float64Array(EPISODES), boot: new Float64Array(EPISODES), n: 0 } };
      Rq = ctx.rng(61); Rd = ctx.rng(62);
      loop.start();
      ctx.redraw(); show();
    }
    const loop = ctx.loop(() => {
      const t0 = performance.now(), opt = { nB, episodes: EPISODES };
      while (acc.q.n < RUNS && performance.now() - t0 < 6) {
        for (let i = 0; i < 20; i++) { run(false, Rq, acc.q, opt); acc.q.n += 1; run(true, Rd, acc.d, opt); acc.d.n += 1; }
      }
      ctx.redraw(); show();
      return acc.q.n < RUNS;
    });

    const nBS = ctx.slider({ label: 'B 的动作数', min: 1, max: 20, step: 1, value: nB, format: (x) => String(x), oninput: (x) => { nB = x; reset(); } });
    const lookS = ctx.slider({ label: '查看第几回合', min: 1, max: EPISODES, step: 1, value: look, format: (x) => String(x), oninput: (x) => { look = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const top = ctx.el('div'), bottom = ctx.el('div');
    ctx.stage.append(ctx.row(nBS.node, lookS.node), ctx.el('div', { class: 'demo-grid2' }, top, bottom), read, stepsBox.node);

    const marker = (G, ax, C) => {
      const x = ax.X(look);
      G.save(); G.strokeStyle = C.muted; G.setLineDash([2, 3]); G.beginPath(); G.moveTo(x, ax.P.t); G.lineTo(x, ax.Y(ax.ymin)); G.stroke(); G.restore();
    };
    const curve = (arr, n) => (n ? Array.from(arr, (x, i) => [i + 1, x / n]) : []);
    ctx.canvas({
      parent: top, aspect: 0.75, maxHeight: 280, minHeight: 200, label: 'A 处选左的比例随回合的变化',
      draw(G, w, h) {
        const C = ctx.colors();
        const ax = ctx.plot(G, w, h, {
          series: [{ data: curve(acc.q.left, acc.q.n), color: C.series[2] }, { data: curve(acc.d.left, acc.d.n), color: C.series[3] }],
          xmin: 0, xmax: EPISODES, ymin: 0, ymax: 1, xlabel: '回合', ylabel: 'A 处选左的比例', hlines: [{ y: 0.05, label: '最优 5%' }], pad: { l: 52 },
        });
        marker(G, ax, C);
      },
    });
    ctx.canvas({
      parent: bottom, aspect: 0.75, maxHeight: 280, minHeight: 200, label: 'A 处自举项的平均值随回合的变化',
      draw(G, w, h) {
        const C = ctx.colors();
        const ax = ctx.plot(G, w, h, {
          series: [{ data: curve(acc.q.boot, acc.q.n), color: C.series[2] }, { data: curve(acc.d.boot, acc.d.n), color: C.series[3] }],
          xmin: 0, xmax: EPISODES, ymin: -0.3, ymax: 0.6, xlabel: '回合', ylabel: 'A 处向左的自举项', hlines: [{ y: -0.1, label: '真值 −.1' }], pad: { l: 52 },
        });
        marker(G, ax, C);
      },
    });
    ctx.stage.insertBefore(ctx.legend([['var(--d3)', 'Q-learning'], ['var(--d4)', 'Double Q-learning'], ['var(--muted)', '虚线：参照值与所查看的回合']]), read);

    const mean = (a, lo, hi, n) => { let s = 0; for (let i = lo; i < hi; i++) s += a[i]; return s / (hi - lo) / n; };
    const peak = (a, n) => { let k = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i; return [a[k] / n, k + 1]; };
    function show() {
      const { q, d } = acc;
      if (!q.n) { read.textContent = ''; return; }
      const [pq, kq] = peak(q.left, q.n), [pd, kd] = peak(d.left, d.n);
      read.innerHTML = `已跑 <b>${q.n}</b> / ${RUNS} 次运行（每次 ${EPISODES} 回合，n<sub>B</sub> = ${nB}）<br>` +
        `A 处选左的比例　前 10 回合均值：Q-learning <b>${fmt(mean(q.left, 0, 10, q.n), 3)}</b>，Double <b>${fmt(mean(d.left, 0, 10, d.n), 3)}</b>　` +
        `峰值：<b>${fmt(pq, 3)}</b>（第 ${kq} 回合），<b>${fmt(pd, 3)}</b>（第 ${kd} 回合）　` +
        `末 50 回合均值：<b>${fmt(mean(q.left, EPISODES - 50, EPISODES, q.n), 3)}</b>，<b>${fmt(mean(d.left, EPISODES - 50, EPISODES, d.n), 3)}</b>`;
      const k = look - 1, bq = q.boot[k] / q.n, bd = d.boot[k] / d.n;
      const four = fourCombos();
      stepsBox.set([
        ['正文的最小例子：两个真值为 0 的估计各等概率取 $±.1$，对四种组合求平均', { html: ctx.m(`E max_a Q(a) = ¾·(.1) + ¼·(−.1) = `) + `<b>${fmt(four.max, 2)}</b>` + ctx.m(` > 0 = max_a E Q(a)`) }],
        ['同一例子换成两张独立的表，一张选、一张估', { html: ctx.m(`E Q^J(a^*) = `) + `<b>${fmt(Math.abs(four.double) < 1e-12 ? 0 : four.double, 2)}</b>` + ctx.m(`，a^* = argmax_c Q^I(c)`) }],
        [`例 6.7 第 ${look} 回合，B 的每个动作真值都是 $q(B,c) = −.1$`, 'max_c q(B,c) = −.1'],
        [`Q-learning 在 A 向左的目标读 $max_c Q(B,c)$，${q.n} 次运行平均`, { html: ctx.m(`E[max_c Q(B,c)] = `) + `<b>${fmt(bq, 3)}</b>` + ctx.m(`，比真值高 ${fmt(bq + 0.1, 3)}`) }],
        ['Double Q-learning：表 $I$ 在 B 选动作，表 $J$ 估值', { html: ctx.m(`E[Q^J(B,a^*)] = `) + `<b>${fmt(bd, 3)}</b>` + ctx.m(`，比真值高 ${fmt(bd + 0.1, 3)}`) }],
        ['同一回合 A 处选左的比例；最优策略总向右，ε-贪心仍以 $ε/2$ 选左', { html: ctx.m(`Q-learning ${fmt(q.left[k] / q.n, 3)}，Double ${fmt(d.left[k] / d.n, 3)}，ε/2 = .05`) }],
      ], `计算过程　最大化偏差：第 ${look} 回合`);
    }
    reset();
  });
})();
