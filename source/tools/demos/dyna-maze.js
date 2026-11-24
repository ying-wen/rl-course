/* 第 8 章：Dyna-Q 在原书例 8.1 的 6×9 迷宫上运行（8.2 节“规划计算与真实策略价值”）。
 * 设定同正文：七个障碍格，到 G 奖励 +1、其余 0，γ=.95、α=.1、ε=.1，Q 初值 0，平局随机打破；
 * 确定性模型 M(s,a) 只存最近一次后果，规划先随机选见过的状态、再随机选该处试过的动作；
 * 每个真实步后规划 B 次（原书记作 n）。批量实验按三组 B=0、5、50 各独立运行 100 次取平均。 */
(() => {
  const ROWS = 6, COLS = 9, NS = ROWS * COLS, NA = 4;
  const id = (r, c) => r * COLS + c;
  const START = id(2, 0), GOAL = id(0, 8);
  const WALL = new Uint8Array(NS);
  [[1, 2], [2, 2], [3, 2], [4, 5], [0, 7], [1, 7], [2, 7]].forEach(([r, c]) => (WALL[id(r, c)] = 1));
  const ACTS = [[-1, 0, '↑'], [0, 1, '→'], [1, 0, '↓'], [0, -1, '←']];

  function rng(seed = 1) { // mulberry32，与 demo-core 的 rng 相同
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function envStep(s, a) {
    const r = Math.floor(s / COLS) + ACTS[a][0], c = (s % COLS) + ACTS[a][1];
    let s2 = s;
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !WALL[id(r, c)]) s2 = id(r, c);
    return [s2, s2 === GOAL ? 1 : 0, s2 === GOAL];
  }

  /* 一个 Dyna-Q 学习器。step() 走一个真实步并做 B 次规划；record 为真时记下本步的计算细节。 */
  function makeAgent({ B = 0, alpha = 0.1, gamma = 0.95, eps = 0.1, seed = 1 } = {}) {
    const R = rng(seed);
    const Q = new Float64Array(NS * NA);
    const mS = new Int16Array(NS * NA).fill(-1), mR = new Float64Array(NS * NA);
    const seen = [], tried = Array.from({ length: NS }, () => []);
    const ag = { Q, B, alpha, gamma, eps, s: START, t: 0, episodes: [], total: 0, planned: 0, last: null, mS, mR, seen, tried };
    const vmax = (s) => (s === GOAL ? 0 : Math.max(Q[s * NA], Q[s * NA + 1], Q[s * NA + 2], Q[s * NA + 3]));
    ag.V = vmax;
    function greedy(s) {
      let best = -Infinity, ties = [];
      for (let a = 0; a < NA; a++) {
        const q = Q[s * NA + a];
        if (q > best + 1e-12) { best = q; ties = [a]; } else if (q > best - 1e-12) ties.push(a);
      }
      return ties.length === 1 ? ties[0] : ties[Math.floor(R() * ties.length)];
    }
    ag.greedy = greedy;
    function update(s, a, r, s2) {
      const k = s * NA + a, old = Q[k], tail = vmax(s2), target = r + gamma * tail;
      Q[k] = old + alpha * (target - old);
      return { s, a, r, s2, old, tail, target, now: Q[k] };
    }
    ag.step = (record = false, keep = 4) => {
      const s = ag.s;
      const a = R() < eps ? Math.floor(R() * NA) : greedy(s);
      const [s2, r, done] = envStep(s, a);
      const real = update(s, a, r, s2);
      const k = s * NA + a;
      if (mS[k] < 0) { if (!tried[s].length) seen.push(s); tried[s].push(a); }
      mS[k] = s2; mR[k] = r;
      const plans = [];
      let changed = 0;
      for (let i = 0; i < B; i++) {
        const ps = seen[Math.floor(R() * seen.length)];
        const pa = tried[ps][Math.floor(R() * tried[ps].length)];
        const u = update(ps, pa, mR[ps * NA + pa], mS[ps * NA + pa]);
        if (record) {
          if (Math.abs(u.now - u.old) > 1e-15) changed++;
          if (plans.length < keep) plans.push(u);
        }
      }
      ag.planned += B; ag.total += 1; ag.t += 1;
      const ended = done ? ag.t : 0;
      if (done) { ag.episodes.push(ag.t); ag.t = 0; ag.s = START; } else ag.s = s2;
      if (record) ag.last = { real, plans, changed, B, ended };
      return done;
    };
    return ag;
  }

  /* 批量实验中的一次运行：nEp 个回合各用了多少真实步。 */
  function runEpisodes(B, nEp, seed) {
    const ag = makeAgent({ B, seed });
    while (ag.episodes.length < nEp) ag.step(false);
    return ag.episodes.slice();
  }

  /* 均匀随机游走从起点到 G 的步数：到达时间方程 E(s)=1+¼Σ_a E(s')，二阶矩同理，高斯消元精确求解。 */
  function randomWalkSteps() {
    const free = [];
    for (let s = 0; s < NS; s++) if (!WALL[s] && s !== GOAL) free.push(s);
    const ix = new Map(free.map((s, i) => [s, i])), n = free.length;
    const solve = (rhs) => {
      const A = free.map((s, i) => {
        const row = new Float64Array(n + 1);
        row[i] += 1;
        for (let a = 0; a < NA; a++) { const [s2] = envStep(s, a); if (s2 !== GOAL) row[ix.get(s2)] -= 0.25; }
        row[n] = rhs(s, i);
        return row;
      });
      for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        [A[c], A[p]] = [A[p], A[c]];
        for (let r = 0; r < n; r++) if (r !== c) {
          const f = A[r][c] / A[c][c];
          if (f) for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
        }
      }
      return A.map((row, i) => row[n] / row[i]);
    };
    const E = solve(() => 1);
    const val = (v, s2) => (s2 === GOAL ? 0 : v[ix.get(s2)]);
    const M2 = solve((s) => { let x = 1; for (let a = 0; a < NA; a++) x += 0.5 * val(E, envStep(s, a)[0]); return x; });
    const m = E[ix.get(START)], m2 = M2[ix.get(START)];
    return { mean: m, sd: Math.sqrt(m2 - m * m), nStates: n + 1 };
  }

  const model = { ROWS, COLS, START, GOAL, WALL, ACTS, envStep, makeAgent, runEpisodes, randomWalkSteps, rng };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('dyna-maze', (ctx) => {
    const { el, fmt } = ctx;
    const BS = [0, 5, 50], NEP = 50, RUNS = 100;
    let B = 50, seed = 7, ag, spf = 10;
    const batch = { 0: null, 5: null, 50: null }, acc = { 0: [], 5: [], 50: [] };
    let bRun = 0;
    const name = (s) => `(${Math.floor(s / COLS) + 1},${(s % COLS) + 1})`;
    const SNAME = (s) => (s === START ? 'S' : s === GOAL ? 'G' : name(s));

    function reset() { auto.stop(); ag = makeAgent({ B, seed }); ctx.redraw(); show(); }

    const bSeg = ctx.segmented(BS.map((b) => [b, `B = ${b}`]), B, (v) => { B = v; reset(); }, '每个真实步的规划次数');
    const spSeg = ctx.segmented([[1, '慢'], [10, '中'], [200, '快']], spf, (v) => (spf = v), '连续运行的速度');
    const stepBtn = ctx.button('走一步', () => { auto.stop(); ag.step(true, B > 5 ? 4 : 5); ctx.redraw(); show(); }, true);
    const epBtn = ctx.button('走完一回合', () => {
      auto.stop();
      const n = ag.episodes.length;
      let guard = 0;
      while (ag.episodes.length === n && guard++ < 2e5) ag.step(true, 4);
      ctx.redraw(); show();
    });
    const autoBtn = ctx.button('连续', () => (auto.running ? auto.stop() : auto.start()));
    const resetBtn = ctx.button('重置', () => { seed += 1; reset(); });
    const batchBtn = ctx.button(`三组各 ${RUNS} 次平均`, () => {
      if (bLoop.running) return;
      for (const b of BS) { acc[b] = []; batch[b] = null; }
      bRun = 0; bLoop.start();
    });

    const auto = ctx.loop(() => {
      const n = ctx.reduced() ? 1 : spf;
      for (let i = 0; i < n; i++) ag.step(i === n - 1, 4);
      ctx.redraw(); show();
      return true;
    });
    auto.onstop = () => (autoBtn.textContent = '连续');
    const _start = auto.start;
    auto.start = () => { autoBtn.textContent = '暂停'; _start(); };

    /* 批量：每帧跑若干次完整运行（约 6 ms），进度写在读数里 */
    const bLoop = ctx.loop(() => {
      const t0 = performance.now();
      while (bRun < 3 * RUNS && performance.now() - t0 < 6) {
        const b = BS[Math.floor(bRun / RUNS)], i = bRun % RUNS;
        acc[b].push(runEpisodes(b, NEP, 1000 + i));
        if (acc[b].length === RUNS) batch[b] = Array.from({ length: NEP }, (_, e) => acc[b].reduce((x, r) => x + r[e], 0) / RUNS);
        bRun++;
      }
      chart.paint(); show();
      return bRun < 3 * RUNS;
    });

    const read = ctx.readout(), stepsBox = ctx.steps();
    const gridBox = el('div'), chartBox = el('div');
    ctx.stage.append(
      ctx.row(bSeg.node, spSeg.node),
      el('div', { class: 'demo-grid2' }, gridBox, chartBox),
      ctx.row(stepBtn, epBtn, autoBtn, resetBtn, batchBtn),
      read, stepsBox.node,
    );

    /* 迷宫：底色深浅是 V(s)=max_a Q(s,a)，箭头是对 Q 贪心的动作（并列都画），圆点是智能体，
     * 小圈标出本步规划改动过的格。 */
    const gc = ctx.canvas({
      parent: gridBox, aspect: ROWS / COLS, maxHeight: 300, minHeight: 150, label: 'Dyna 迷宫：状态价值热图与贪心动作',
      draw(G, w, h) {
        const C = ctx.colors(), cs = Math.min(w / COLS, h / ROWS), ox = (w - cs * COLS) / 2;
        const touched = new Set(ag.last ? ag.last.plans.filter((u) => u.now !== u.old).map((u) => u.s) : []);
        G.textAlign = 'center'; G.textBaseline = 'middle';
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const s = id(r, c), X = ox + c * cs, Y = r * cs;
          if (WALL[s]) { G.fillStyle = ctx.mix(C.bg, C.ink, 0.45); G.fillRect(X + 1, Y + 1, cs - 2, cs - 2); continue; }
          const v = ag.V(s);
          G.fillStyle = s === GOAL ? C.accentSoft : ctx.mix(C.bg, C.accent, 0.06 + 0.6 * Math.min(1, v));
          G.fillRect(X + 1, Y + 1, cs - 2, cs - 2);
          if (s === GOAL || s === START) {
            G.fillStyle = C.ink; G.font = ctx.font(cs * 0.34, 700);
            G.fillText(s === GOAL ? 'G' : 'S', X + cs * 0.5, Y + cs * (s === START && v > 0 ? 0.3 : 0.5));
            if (s === GOAL) continue;
          }
          if (v > 0) {
            let best = -Infinity;
            for (let a = 0; a < NA; a++) best = Math.max(best, ag.Q[s * NA + a]);
            const arrows = ACTS.map((x, a) => (ag.Q[s * NA + a] > best - 1e-12 ? x[2] : '')).join('');
            G.fillStyle = v > 0.45 ? C.bg : C.ink; G.font = ctx.font(cs * (arrows.length > 1 ? 0.28 : 0.42), 700);
            G.fillText(arrows, X + cs / 2, Y + cs * (s === START ? 0.68 : cs > 44 ? 0.42 : 0.5));
            if (cs > 44 && s !== START) { G.font = ctx.font(cs * 0.2, 400, true); G.fillText(v.toFixed(2), X + cs / 2, Y + cs * 0.78); }
          }
          if (touched.has(s)) { G.strokeStyle = C.series[3]; G.lineWidth = 2; G.beginPath(); G.arc(X + cs * 0.84, Y + cs * 0.16, cs * 0.08, 0, 7); G.stroke(); }
        }
        if (ag.last) { // 本步的真实转移
          const { s, s2 } = ag.last.real, P = (q) => [ox + (q % COLS + 0.5) * cs, (Math.floor(q / COLS) + 0.5) * cs];
          const [x1, y1] = P(s), [x2, y2] = P(s2);
          G.strokeStyle = C.series[1]; G.lineWidth = 2.5; G.beginPath(); G.moveTo(x1, y1); G.lineTo(x2, y2); G.stroke();
        }
        const ax = ox + (ag.s % COLS + 0.5) * cs, ay = (Math.floor(ag.s / COLS) + 0.5) * cs;
        G.fillStyle = C.series[1]; G.beginPath(); G.arc(ax, ay, cs * 0.17, 0, 7); G.fill();
        G.strokeStyle = C.bg; G.lineWidth = 1.5; G.stroke();
      },
    });
    gridBox.append(ctx.legend([['var(--d2)', '智能体与本步真实转移'], ['var(--d4)', '本步规划改动过的格']]));

    /* 每回合步数（对数纵轴）：实线是当前这次运行，虚线是批量平均 */
    const COL = { 0: 2, 5: 1, 50: 0 };
    const chart = ctx.canvas({
      parent: chartBox, aspect: 0.75, maxHeight: 300, minHeight: 220, label: '每回合真实步数的对数',
      draw(G, w, h) {
        const C = ctx.colors(), L = (x) => Math.log10(Math.max(1, x));
        const series = BS.filter((b) => batch[b]).map((b) => ({ data: batch[b].map((y, i) => [i + 1, L(y)]), color: C.series[COL[b]], width: 1.4, dash: [5, 3] }));
        series.push({ data: ag.episodes.map((y, i) => [i + 1, L(y)]), color: C.series[COL[B]], width: 2.2 });
        ctx.plot(G, w, h, {
          series, xmin: 1, xmax: Math.max(NEP, ag.episodes.length), ymin: 1, ymax: 3.6,
          xlabel: '回合', ylabel: 'log₁₀ 每回合步数', pad: { l: 40 },
          hlines: [{ y: L(14), label: '最短 14 步', color: C.muted }],
        });
      },
    });
    chartBox.append(ctx.legend([['var(--d1)', 'B = 50'], ['var(--d2)', 'B = 5'], ['var(--d3)', 'B = 0']]),
      el('div', { class: 'demo-note', text: '实线：当前运行；虚线：三组批量平均。' }));

    function show() {
      const eps = ag.episodes, lastEp = eps.length ? eps[eps.length - 1] : null;
      let html = `B = <b>${B}</b>　第 <b>${eps.length + 1}</b> 回合已走 <b>${ag.t}</b> 步` +
        (lastEp != null ? `，上一回合 <b>${lastEp}</b> 步` : '') +
        `　真实步共 <b>${ag.total}</b>，规划更新共 <b>${ag.planned}</b>　V(S) = <b>${fmt(ag.V(START), 3)}</b>`;
      const done = BS.filter((b) => batch[b]);
      if (bLoop.running) html += `<br>批量实验进行中：<b>${bRun}</b> / ${3 * RUNS} 次运行`;
      if (done.length) html += '<br>批量平均（各 ' + RUNS + ' 次）：' + done.map((b) => `B=${b} 第 1 回合 <b>${batch[b][0].toFixed(0)}</b>、第 3 回合 <b>${batch[b][2].toFixed(0)}</b> 步`).join('；');
      read.innerHTML = html;
      showSteps();
    }

    const f4 = (x) => fmt(x, 4);
    function upd(u, label) {
      const g = fmt(0.95, 2), al = fmt(0.1, 1);
      return [`${label}：$${SNAME(u.s)}$ ${ACTS[u.a][2]}，得 $R$ = ${u.r}，$S′$ = ${SNAME(u.s2)}`,
        { html: ctx.m(`Q ← ${f4(u.old)} + ${al}·[${u.r} + ${g}·${u.s2 === GOAL ? '0' : f4(u.tail)} − ${f4(u.old)}] = `) + `<b>${f4(u.now)}</b>` }];
    }
    function showSteps() {
      const L = ag.last;
      if (!L) {
        stepsBox.set([['点“走一步”，这里列出一次真实更新与随后的规划更新。所有 $Q$ 初值为 0，找到 G 之前每次更新的目标都是 0。', null],
          ['真实与模拟转移共用一步误差', 'δ_Q(s,a,r,s′) = r + γ·max_c Q(s′,c) − Q(s,a)，Q(s,a) ← Q(s,a) + α·δ_Q'],
          ['终止状态 G 的尾值取 0；本例 $α$ = .1，$γ$ = .95', null]], '计算过程');
        return;
      }
      const lines = [];
      lines.push(['一般式（第 3、7 行同一个更新）', 'Q(S,A) ← Q(S,A) + α·[R + γ·max_a Q(S′,a) − Q(S,A)]']);
      lines.push(upd(L.real, '真实一步'));
      lines.push([`模型学习：$M$(${SNAME(L.real.s)}, ${ACTS[L.real.a][2]}) ← (${L.real.r}, ${SNAME(L.real.s2)})，只存最近一次后果`, null]);
      if (L.B === 0) lines.push(['$B$ = 0：没有规划更新，这条转移用一次就不再用', null]);
      L.plans.forEach((u, i) => lines.push(upd(u, `规划 ${i + 1}`)));
      if (L.B > L.plans.length) lines.push([`其余 ${L.B - L.plans.length} 次规划从略；本步 ${L.B} 次规划中有 ${L.changed} 次改变了 $Q$`, null]);
      else if (L.B) lines.push([`本步 ${L.B} 次规划中有 ${L.changed} 次改变了 $Q$`, null]);
      if (L.ended) lines.push([`到达 G，本回合用了 ${L.ended} 个真实步，回到起点 S`, null]);
      stepsBox.set(lines, `计算过程　第 ${ag.total} 个真实步`);
    }
    reset();
  });
})();
