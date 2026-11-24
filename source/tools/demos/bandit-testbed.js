/* 第 2 章：十臂试验台，分块跑多次独立运行，画平均奖励与选中最优臂的比例。
 * 对应 2.3 节“实验：十臂试验台”：q*(a) ~ N(0,1)，奖励 ~ N(q*(A_t),1)，1000 步，2000 次运行；
 * 正文比较零初值、样本均值的 ε = 0、.01、.1。另两条可勾选：乐观初值 Q_1 = 5、α = .1 的贪心（2.3 节乐观初值），
 * c = 2 的 UCB（2.4 节）。 */
(() => {
  const K = 10, STEPS = 1000;
  const RULES = [
    { id: 'g', label: '贪心 ε = 0', eps: 0, on: true },
    { id: 'e01', label: 'ε = .01', eps: 0.01, on: true },
    { id: 'e1', label: 'ε = .1', eps: 0.1, on: true },
    { id: 'opt', label: '乐观初值 Q₁ = 5，α = .1，贪心', eps: 0, q0: 5, alpha: 0.1, on: false },
    { id: 'ucb', label: 'UCB，c = 2', ucb: 2, on: false },
  ];

  /* mulberry32，与 demo-core 的 ctx.rng 相同，供 node 测试独立使用。 */
  function rng(seed = 1) {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = () => {
      let u = 0;
      while (u === 0) u = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
    };
    return r;
  }
  const mixSeed = (a, b, c) => (Math.imul(a + 1, 0x9E3779B1) ^ Math.imul(b + 1, 0x85EBCA77) ^ Math.imul(c + 1, 0xC2B2AE3D)) >>> 0;

  /* 一次运行：返回每步的奖励与是否选中最优臂，累加进 rew/opt。 */
  function runOne(rule, qstar, rnd, rew, opt) {
    const Q = new Float64Array(K).fill(rule.q0 || 0), N = new Float64Array(K);
    let best = 0;
    for (let a = 1; a < K; a++) if (qstar[a] > qstar[best]) best = a;
    for (let i = 0; i < STEPS; i++) {
      let a;
      if (rule.eps && rnd() < rule.eps) a = Math.floor(rnd() * K);
      else {
        let top = -Infinity, cnt = 0;
        const lt = Math.log(i + 1);
        for (let b = 0; b < K; b++) {
          const v = rule.ucb ? (N[b] === 0 ? Infinity : Q[b] + rule.ucb * Math.sqrt(lt / N[b])) : Q[b];
          if (v > top) { top = v; cnt = 1; a = b; } else if (v === top && rnd() * ++cnt < 1) a = b;
        }
      }
      const R = qstar[a] + rnd.normal();
      N[a] += 1;
      Q[a] += (rule.alpha || 1 / N[a]) * (R - Q[a]);
      rew[i] += R;
      if (a === best) opt[i] += 1;
    }
  }

  /* 批量实验的状态：done 次运行已完成，每条规则一组逐步累加和。 */
  function batch(seed, runs) {
    return { seed, runs, done: 0, sums: RULES.map(() => ({ rew: new Float64Array(STEPS), opt: new Float64Array(STEPS) })) };
  }
  /* 跑第 done 次运行（全部规则），同一次运行里各规则面对同一组 q*。 */
  function advance(B, makeRng = rng) {
    if (B.done >= B.runs) return false;
    const j = B.done, qr = makeRng(mixSeed(B.seed, j, 0)), qstar = new Float64Array(K);
    for (let a = 0; a < K; a++) qstar[a] = qr.normal();
    RULES.forEach((rule, k) => runOne(rule, qstar, makeRng(mixSeed(B.seed, j, k + 1)), B.sums[k].rew, B.sums[k].opt));
    B.done += 1;
    return B.done < B.runs;
  }
  /* 第 from…to−1 步的平均（对已完成的运行再取平均）。 */
  function avg(B, k, key, from = 900, to = STEPS) {
    let s = 0;
    for (let i = from; i < to; i++) s += B.sums[k][key][i];
    return s / (to - from) / Math.max(1, B.done);
  }

  const model = { K, STEPS, RULES, rng, runOne, batch, advance, avg };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 2) => x.toFixed(d).replace(/^(-?)0\./, '$1.').replace('-', '−');

  RLDemo.register('bandit-testbed', (ctx) => {
    const { el } = ctx;
    let runs = 2000, seed = 1, B = batch(seed, runs);
    const on = RULES.map((r) => r.on);

    const runSeg = ctx.segmented([[200, '200 次运行'], [2000, '2000 次运行']], runs, (v) => { runs = v; restart(); }, '运行次数');
    const seedBtn = ctx.button('换一组随机种子', () => { seed += 1; restart(); });
    const pauseBtn = ctx.button('暂停', () => (job.running ? job.stop() : (B.done < B.runs && job.start())));
    const checks = RULES.map((rule, k) => {
      const cb = ctx.checkbox(rule.label, on[k], (v) => { on[k] = v; ctx.redraw(); show(); });
      cb.node.prepend(el('i', { style: `display:inline-block;width:1.3em;height:3px;border-radius:2px;background:var(--d${k + 1})`, 'aria-hidden': 'true' }));
      return cb.node;
    });
    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const pa = el('div'), pb = el('div');
    ctx.stage.append(ctx.row(runSeg.node, seedBtn, pauseBtn), ctx.row(...checks), el('div', { class: 'demo-grid2' }, pa, pb), read, stepsBox.node);

    const curves = (key) => {
      const C = ctx.colors();
      return RULES.map((_, k) => k).filter((k) => on[k]).map((k) => {
        const s = B.sums[k][key], d = new Array(STEPS);
        for (let i = 0; i < STEPS; i++) d[i] = [i + 1, s[i] / Math.max(1, B.done)];
        return { data: B.done ? d : [], color: C.series[k], width: 1.6 };
      });
    };
    ctx.canvas({
      parent: pa, aspect: 0.72, maxHeight: 280, minHeight: 200, label: '各规则每步的平均奖励',
      draw(g, w, h) {
        ctx.plot(g, w, h, { series: curves('rew'), xmin: 0, xmax: STEPS, ymin: 0, ymax: 1.6, xlabel: '步数', ylabel: '平均奖励', yticks: 4, pad: { l: 40, r: 16 } });
      },
    });
    ctx.canvas({
      parent: pb, aspect: 0.72, maxHeight: 280, minHeight: 200, label: '各规则每步选中最优臂的运行比例',
      draw(g, w, h) {
        const C = ctx.colors();
        ctx.plot(g, w, h, {
          series: curves('opt'), xmin: 0, xmax: STEPS, ymin: 0, ymax: 1, xlabel: '步数', ylabel: '选中最优臂的比例', yticks: 5, pad: { l: 40, r: 16 },
          hlines: on[2] ? [{ y: 0.91, color: C.muted, label: '.91' }] : [],
        });
      },
    });

    const job = ctx.loop(() => {
      const t0 = performance.now();
      let more = true;
      while (more && performance.now() - t0 < 6) more = advance(B, ctx.rng);
      ctx.redraw(); show();
      return more;
    });
    const _start = job.start;
    job.start = () => { pauseBtn.textContent = '暂停'; _start(); };
    job.onstop = () => { pauseBtn.textContent = B.done < B.runs ? '继续' : '已完成'; show(); };

    function restart() { job.stop(); B = batch(seed, runs); ctx.redraw(); show(); job.start(); }

    function show() {
      const parts = RULES.map((rule, k) => (on[k] ? `${rule.label.split('，')[0]}：<b>${num(avg(B, k, 'opt'))}</b>` : null)).filter(Boolean);
      read.innerHTML = `已完成 <b>${B.done}</b> / ${B.runs} 次独立运行（种子 ${seed}）。` +
        (B.done ? `<br>第 901–1000 步选中最优臂的比例　${parts.join('　')}` : '');
      const lines = [
        ['ε-贪心在排序全对、最大估计唯一时，每步选中最优臂的概率', 'Pr(A_t = a^*) = 1 − ε + ε/m'],
        ['代入 $ε$ = .1、$m$ = 10', { html: ctx.m('= 1 − .1 + .1/10 = ') + '<b>.91</b>' }],
        ['代入 $ε$ = .01', { html: ctx.m('= 1 − .01 + .01/10 = ') + '<b>.991</b>' }],
      ];
      if (B.done) {
        lines.push([`当前 ${B.done} 次运行在第 901–1000 步的读数`, null]);
        RULES.forEach((rule, k) => { if (on[k]) lines.push([rule.label, { html: `平均奖励 ${num(avg(B, k, 'rew'))}，最优臂比例 <b>${num(avg(B, k, 'opt'))}</b>` }]); });
      }
      stepsBox.set(lines, '计算过程　选中最优臂的上限与读数');
    }
    show();
    job.start();
  });
})();
