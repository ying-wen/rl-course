/* 第 6 章：悬崖行走上 Sarsa 与 Q-learning 同时学习，看两条贪心路线与训练回报。
 * 对应 6.4 节（Sutton 与 Barto 例 6.6）：4×12 网格，每步 −1，踏入悬崖 −100 并回到起点，只有终点终止；
 * γ = 1，α = .5，ε-贪心行为，Q 初值 0。训练时并列最大随机打破，贪心路线按上、右、下、左的固定次序打破，
 * 同 demos/course25_sarsa_q.py。 */
(() => {
  const ROWS = 4, COLS = 12, START = 36, GOAL = 47, NA = 4;
  const MOVES = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // 上、右、下、左
  const ARROW = ['↑', '→', '↓', '←'];

  /* 与 demo-core 相同的 mulberry32，node 测试与网页给出同一串数 */
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
    return r;
  }

  function step(s, a) {
    const row = Math.floor(s / COLS), col = s % COLS;
    const r2 = Math.min(ROWS - 1, Math.max(0, row + MOVES[a][0]));
    const c2 = Math.min(COLS - 1, Math.max(0, col + MOVES[a][1]));
    const n = r2 * COLS + c2;
    if (n >= 37 && n <= 46) return { s2: START, r: -100, done: false, fall: true };
    return { s2: n, r: -1, done: n === GOAL, fall: false };
  }
  const row4 = (Q, s) => [Q[s * NA], Q[s * NA + 1], Q[s * NA + 2], Q[s * NA + 3]];
  /* ε-贪心概率：并列最大的动作平分 1 − ε */
  function probs(row, eps) {
    const m = Math.max(...row), ties = row.filter((x) => x === m).length;
    return row.map((x) => eps / NA + (x === m ? (1 - eps) / ties : 0));
  }
  function choose(Q, s, eps, R) {
    if (R() < eps) return R.int(NA);
    const row = row4(Q, s), m = Math.max(...row);
    const ties = [];
    for (let a = 0; a < NA; a++) if (row[a] === m) ties.push(a);
    return ties[R.int(ties.length)];
  }

  function learner(kind, seed, eps) {
    const R = rng(seed), Q = new Float64Array(ROWS * COLS * NA);
    return { kind, R, Q, s: START, a: choose(Q, START, eps, R), ret: 0, len: 0, falls: 0, returns: [], steps: 0, last: null };
  }
  /* 一次真实转移；返回计算过程要用的记录（目标量都读更新前的表） */
  function transition(L, eps, alpha, gamma = 1) {
    const { Q, R, s, a } = L;
    const { s2, r, done, fall } = step(s, a);
    const next = done ? null : row4(Q, s2); // 更新前 S′ 那一行（自环时也读旧表）
    const old = Q[s * NA + a];
    let a2 = null, target;
    if (done) target = r;
    else if (L.kind === 'sarsa') { a2 = choose(Q, s2, eps, R); target = r + gamma * next[a2]; }
    else target = r + gamma * Math.max(...next);
    Q[s * NA + a] = old + alpha * (target - old);
    L.ret += r; L.len += 1; L.steps += 1; if (fall) L.falls += 1;
    const rec = { kind: L.kind, s, a, r, s2, done, fall, next, old, target, val: Q[s * NA + a], a2, t: L.len };
    if (done || L.len >= 10000) {
      L.returns.push(L.ret); L.ret = 0; L.len = 0; L.falls = 0;
      L.s = START; L.a = choose(Q, START, eps, R);
      rec.episodeEnd = true;
    } else {
      L.s = s2;
      L.a = L.kind === 'sarsa' ? a2 : choose(Q, s2, eps, R);
      if (L.kind !== 'sarsa') rec.a2 = L.a; // Q-learning 更新后才按新的 b_Q 采出，只供对照
    }
    return rec;
  }
  function runEpisode(L, eps, alpha) {
    const n = L.returns.length;
    let rec;
    while (L.returns.length === n) rec = transition(L, eps, alpha);
    return rec;
  }
  function train(kind, seed, episodes = 500, alpha = 0.5, eps = 0.1) {
    const L = learner(kind, seed, eps);
    while (L.returns.length < episodes) runEpisode(L, eps, alpha);
    return L;
  }
  /* 冻结 Q 后的贪心路线：并列时取上、右、下、左中最先的一个 */
  function greedyPath(Q, cap = 60) {
    let s = START;
    const path = [s];
    for (let t = 0; t < cap; t++) {
      const row = row4(Q, s);
      let a = 0;
      for (let b = 1; b < NA; b++) if (row[b] > row[a]) a = b;
      const o = step(s, a);
      if (o.fall) return { path, end: 'fall' };
      if (o.s2 === s) return { path, end: 'stuck' };
      s = o.s2; path.push(s);
      if (o.done) return { path, end: 'goal' };
    }
    return { path, end: 'loop' };
  }
  /* 同一条转移上的三种目标 */
  function targets(rec, eps, gamma = 1) {
    if (rec.done) return { sarsa: rec.r, exp: rec.r, q: rec.r, b: null };
    const b = probs(rec.next, eps);
    return {
      b,
      sarsa: rec.a2 == null ? null : rec.r + gamma * rec.next[rec.a2],
      exp: rec.r + gamma * b.reduce((acc, p, c) => acc + p * rec.next[c], 0),
      q: rec.r + gamma * Math.max(...rec.next),
    };
  }
  function smooth(xs, w = 20) {
    const out = [];
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      acc += xs[i];
      if (i >= w) acc -= xs[i - w];
      out.push(acc / Math.min(i + 1, w));
    }
    return out;
  }
  const model = { ROWS, COLS, START, GOAL, MOVES, rng, step, probs, choose, learner, transition, runEpisode, train, greedyPath, targets, smooth, row4 };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('cliff-walk', (ctx) => {
    ctx.stage.style.textAlign = 'left'; // 页面正文两端对齐，计算过程里的长说明会被拉开字距
    const { el, fmt } = ctx;
    const ALPHA = 0.5, EPISODES = 500;
    let eps = 0.1, L, seedBase = 1, view = 'sarsa', lastRec = { sarsa: null, qlearning: null };
    let batch = null; // 12 次运行的平均曲线

    function reset() {
      run.stop(); batchLoop.stop();
      L = { sarsa: learner('sarsa', 2 * seedBase, eps), qlearning: learner('qlearning', 2 * seedBase + 1, eps) };
      lastRec = { sarsa: null, qlearning: null };
      batch = null; batchBtn.disabled = false; batchBtn.textContent = '12 次运行平均';
      ctx.redraw(); show();
    }
    const done = () => L.sarsa.returns.length >= EPISODES && L.qlearning.returns.length >= EPISODES;

    const stepBtn = ctx.button('单步', () => {
      run.stop();
      for (const k of ['sarsa', 'qlearning']) if (L[k].returns.length < EPISODES) lastRec[k] = transition(L[k], eps, ALPHA);
      ctx.redraw(); show();
    }, true);
    const epBtn = ctx.button('一回合', () => {
      run.stop();
      for (const k of ['sarsa', 'qlearning']) if (L[k].returns.length < EPISODES) lastRec[k] = runEpisode(L[k], eps, ALPHA);
      ctx.redraw(); show();
    });
    const runBtn = ctx.button('连续训练', () => (run.running ? run.stop() : run.start()));
    const resetBtn = ctx.button('重置', () => { seedBase += 1; reset(); });
    const run = ctx.loop(() => {
      const per = ctx.reduced() ? 1 : 3, t0 = performance.now();
      for (let i = 0; i < per && performance.now() - t0 < 6; i++) {
        for (const k of ['sarsa', 'qlearning']) if (L[k].returns.length < EPISODES) lastRec[k] = runEpisode(L[k], eps, ALPHA);
      }
      ctx.redraw(); show();
      return !done();
    });
    run.onstop = () => (runBtn.textContent = '连续训练');
    const _start = run.start;
    run.start = () => { if (done()) return; runBtn.textContent = '暂停'; _start(); };

    /* 12 次独立运行，每帧跑一次运行（一种方法 500 回合） */
    let jobs = [];
    const batchLoop = ctx.loop(() => {
      const t0 = performance.now();
      while (jobs.length && performance.now() - t0 < 6) {
        const [kind, seed] = jobs.shift();
        const R = train(kind, seed, EPISODES, ALPHA, eps);
        const sm = smooth(R.returns);
        const acc = batch[kind];
        sm.forEach((x, i) => (acc.sum[i] += x));
        acc.n += 1;
        acc.last100.push(R.returns.slice(-100).reduce((a, b) => a + b, 0) / 100);
        acc.paths.push(greedyPath(R.Q));
      }
      batchBtn.textContent = jobs.length ? `已算 ${24 - jobs.length}/24` : '12 次运行平均';
      ctx.redraw(); show();
      return jobs.length > 0;
    });
    const batchBtn = ctx.button('12 次运行平均', () => {
      if (batchLoop.running) return;
      const blank = () => ({ sum: new Float64Array(EPISODES), n: 0, last100: [], paths: [] });
      batch = { sarsa: blank(), qlearning: blank(), eps };
      jobs = [];
      for (let i = 0; i < 12; i++) jobs.push(['sarsa', 1000 + 2 * i], ['qlearning', 1001 + 2 * i]);
      batchBtn.disabled = true;
      batchLoop.start();
    });
    batchLoop.onstop = () => { batchBtn.disabled = false; };

    const epsS = ctx.slider({ label: '探索率 ε', min: 0, max: 0.3, step: 0.01, value: eps, format: (x) => x.toFixed(2), oninput: (x) => { eps = x; reset(); } });
    const viewSeg = ctx.segmented([['sarsa', 'Sarsa 的转移'], ['qlearning', 'Q-learning 的转移']], view, (v) => { view = v; show(); }, '计算过程看哪一个学习器');
    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const gridBox = el('div'), chartBox = el('div');
    ctx.stage.append(gridBox, ctx.row(stepBtn, epBtn, runBtn, resetBtn, batchBtn), ctx.row(epsS.node, viewSeg.node), chartBox, read, stepsBox.node);

    /* 网格与两条贪心路线 */
    const gridInfo = {};
    ctx.canvas({
      parent: gridBox, aspect: 0.36, maxHeight: 260, minHeight: 130, label: '悬崖网格上 Sarsa 与 Q-learning 各自的贪心路线',
      draw(G, w, h) {
        const C = ctx.colors(), top = 4, cs = Math.min((w - 2) / COLS, (h - top - 4) / ROWS), ox = (w - cs * COLS) / 2;
        if (!(cs > 2)) return;
        const cx = (s) => ox + (s % COLS + 0.5) * cs, cy = (s) => top + (Math.floor(s / COLS) + 0.5) * cs;
        G.textAlign = 'center'; G.textBaseline = 'middle';
        for (let s = 0; s < ROWS * COLS; s++) {
          const x = ox + (s % COLS) * cs, y = top + Math.floor(s / COLS) * cs, cliff = s >= 37 && s <= 46;
          G.fillStyle = cliff ? ctx.mix(C.bg, C.series[2], C.dark ? 0.35 : 0.22) : s >= 25 && s <= 34 ? ctx.mix(C.bg, C.series[1], 0.12) : C.tint;
          G.fillRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        }
        G.fillStyle = C.ink; G.font = ctx.font(cs * 0.42, 600);
        G.fillText('S', cx(START), cy(START)); G.fillText('G', cx(GOAL), cy(GOAL));
        G.fillStyle = C.dark ? C.ink : C.series[2]; G.font = ctx.font(Math.max(10, cs * 0.36));
        G.fillText('悬崖：−100，回到 S', ox + 6 * cs, cy(40));
        const draw = (Q, color, off) => {
          const { path, end } = greedyPath(Q);
          G.strokeStyle = color; G.lineWidth = Math.max(2, cs * 0.09); G.lineJoin = 'round'; G.lineCap = 'round';
          G.beginPath();
          path.forEach((s, i) => (i ? G.lineTo(cx(s) + off, cy(s) + off) : G.moveTo(cx(s) + off, cy(s) + off)));
          G.stroke();
          const last = path[path.length - 1];
          if (end !== 'goal') {
            G.fillStyle = color; G.font = ctx.font(cs * 0.5, 700);
            G.fillText('×', cx(last) + off, cy(last) + off);
          }
          return { len: path.length - 1, end };
        };
        const off = cs * 0.1;
        gridInfo.s = draw(L.sarsa.Q, C.series[3], -off);
        gridInfo.q = draw(L.qlearning.Q, C.series[2], off);
        // 两个学习器此刻的位置
        for (const [k, color, o] of [['sarsa', C.series[3], -off], ['qlearning', C.series[2], off]]) {
          const s = L[k].s;
          G.beginPath(); G.arc(cx(s) + o, cy(s) + o, cs * 0.16, 0, 2 * Math.PI);
          G.fillStyle = C.bg; G.fill(); G.lineWidth = 2; G.strokeStyle = color; G.stroke();
        }
      },
    });
    gridBox.append(ctx.legend([['var(--d4)', 'Sarsa 的贪心路线'], ['var(--d3)', 'Q-learning 的贪心路线'], ['var(--d2)', '临崖格（浅黄）']]));

    /* 训练回报曲线 */
    ctx.canvas({
      parent: chartBox, aspect: 0.42, maxHeight: 280, minHeight: 180, label: '每回合奖励之和随训练回合的变化，20 回合滑动平均',
      draw(G, w, h) {
        const C = ctx.colors(), series = [];
        if (batch) for (const [k, c] of [['sarsa', C.series[3]], ['qlearning', C.series[2]]]) {
          if (batch[k].n) series.push({ data: Array.from(batch[k].sum, (x) => x / batch[k].n), color: ctx.mix(C.bg, c, 0.45), width: 4.5 });
        }
        series.push({ data: smooth(L.sarsa.returns), color: C.series[3], width: 1.6 });
        series.push({ data: smooth(L.qlearning.returns), color: C.series[2], width: 1.6 });
        ctx.plot(G, w, h, { series, xmin: 0, xmax: EPISODES, ymin: -150, ymax: 0, xlabel: '回合', ylabel: '每回合奖励之和', pad: { l: 54 } });
      },
    });
    chartBox.append(ctx.legend([['var(--d4)', 'Sarsa（本次运行）'], ['var(--d3)', 'Q-learning（本次运行）'], ['var(--muted)', '粗淡线：12 次运行的平均']]));

    const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const routeText = (g) => (g.end === 'goal' ? `${g.len} 步到终点` : g.end === 'fall' ? '会跌落' : '到不了终点');
    function show() {
      const n = (k) => L[k].returns.length;
      const last = (k) => (n(k) ? avg(L[k].returns.slice(-100)) : NaN);
      let html = `回合：Sarsa <b>${n('sarsa')}</b>，Q-learning <b>${n('qlearning')}</b>（各 ${EPISODES}）　` +
        `最近 100 回合平均奖励：Sarsa <b>${fmt(last('sarsa'), 1)}</b>，Q-learning <b>${fmt(last('qlearning'), 1)}</b>` +
        `<br>冻结当前表的贪心路线：Sarsa ${gridInfo.s ? routeText(gridInfo.s) : '—'}，Q-learning ${gridInfo.q ? routeText(gridInfo.q) : '—'}`;
      if (batch && batch.sarsa.n === 12 && batch.qlearning.n === 12) {
        const cnt = (k, len) => batch[k].paths.filter((p) => p.end === 'goal' && p.path.length - 1 === len).length;
        html += `<br>12 次运行（ε = ${fmt(batch.eps, 2)}）：最后 100 回合平均 Sarsa <b>${fmt(avg(batch.sarsa.last100), 1)}</b>，Q-learning <b>${fmt(avg(batch.qlearning.last100), 1)}</b>；` +
          `贪心路线 13 步的 Sarsa ${cnt('sarsa', 13)} 次、Q-learning ${cnt('qlearning', 13)} 次，17 步的 Sarsa ${cnt('sarsa', 17)} 次、Q-learning ${cnt('qlearning', 17)} 次`;
      }
      read.innerHTML = html;
      showSteps();
    }

    const cell = (s) => `(${Math.floor(s / COLS) + 1},${s % COLS + 1})`;
    const f2 = (x) => fmt(x, 2);
    function showSteps() {
      const rec = lastRec[view], name = view === 'sarsa' ? 'Sarsa' : 'Q-learning';
      if (!rec) {
        stepsBox.set([['点“单步”后，这里对所选学习器刚做的一次转移列出三种一步目标；格子记作 (行, 列)，左下起点是 (4,1)。', null]], `计算过程　${name}`);
        return;
      }
      const T = targets(rec, eps), lines = [];
      lines.push(['转移', `S = ${cell(rec.s)}，A = ${ARROW[rec.a]}，R = ${rec.r}，S′ = ${cell(rec.s2)}` +
        (rec.fall ? '（踏入悬崖，回到起点，不终止）' : rec.done ? '（终点）' : '')]);
      if (rec.done) {
        lines.push(['$S′$ 是终点，三种目标的自举项都取 0', `Y_{Sarsa} = Y_{Exp} = Y^Q = R = ${rec.r}`]);
      } else {
        const q = rec.next.map(f2).join(', '), b = T.b.map((p) => fmt(p, 3)).join(', ');
        lines.push([`更新前的表在 $S′$ 上，按 ↑ → ↓ ← 排；$b_Q$ 是 ε = ${fmt(eps, 2)} 的 ε-贪心，并列最大平分 $1−ε$`, `Q(S′,·) = (${q})，b_Q(·|S′) = (${b})`]);
        const sarsaNote = view === 'sarsa' ? `Sarsa：接按 $b_Q$ 采出、下一步要执行的 $A′$ = ${ARROW[rec.a2]}` : `Sarsa（对照）：若把 Q-learning 随后执行的 $A′$ = ${ARROW[rec.a2]} 放进目标`;
        lines.push([sarsaNote, { html: ctx.m(`Y_{Sarsa} = R + γQ(S′,A′) = ${rec.r} + 1·(${f2(rec.next[rec.a2])}) = `) + `<b>${f2(rec.r + rec.next[rec.a2])}</b>` }]);
        const terms = T.b.map((p, c) => `${fmt(p, 3)}·(${f2(rec.next[c])})`).join(' + ');
        lines.push(['Expected Sarsa：按 $b_Q$ 对四个动作加权', { html: ctx.m(`Y_{Exp} = R + γΣ_c b_Q(c|S′)Q(S′,c) = ${rec.r} + 1·[${terms}] = `) + `<b>${f2(T.exp)}</b>` }]);
        lines.push(['Q-learning：取最大，不看下一步实际执行什么', { html: ctx.m(`Y^Q = R + γ max_c Q(S′,c) = ${rec.r} + 1·(${f2(Math.max(...rec.next))}) = `) + `<b>${f2(T.q)}</b>` }]);
      }
      const used = view === 'sarsa' ? 'Y_{Sarsa}' : 'Y^Q';
      lines.push([`${name} 用 $${used}$ 写回（α = .5，γ = 1）`, { html: ctx.m(`Q(S,A) ← Q(S,A) + α[Y − Q(S,A)] = ${f2(rec.old)} + .5·(${f2(rec.target)} − ${f2(rec.old)}) = `) + `<b>${f2(rec.val)}</b>` }]);
      stepsBox.set(lines, `计算过程　${name}：本回合第 ${rec.t} 步`);
    }
    reset();
  });
})();
