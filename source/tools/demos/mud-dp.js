/* 第 4 章：泥地上的迭代策略评价与价值迭代（同步 / 原地），逐轮看表值与整表差 Δ_k。
 * 模型同 demos/mud_world.py：3×3 迷宫，中间是墙，S4 是泥地（向任何方向都以打滑概率留在原地），
 * 进入 G 得 1，其余奖励 0。 */
RLDemo.register('mud-dp', (ctx) => {
  const { el, fmt } = ctx;
  const POS = { S1: [0, 0], S2: [1, 0], G: [2, 0], S3: [0, 1], S4: [2, 1], S5: [0, 2], S6: [1, 2], S7: [2, 2] };
  const AT = {};
  for (const [s, xy] of Object.entries(POS)) AT[xy.join()] = s;
  const STATES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
  const ACTS = [['up', 0, -1, '↑'], ['right', 1, 0, '→'], ['down', 0, 1, '↓'], ['left', -1, 0, '←']];
  const PI0 = { S1: 1, S2: 1, S3: 0, S4: 0, S5: 0, S6: 3, S7: 0 }; // π0：S7 向上穿泥地
  let gamma = 0.9, slip = 0.9, mode = ctx.root.dataset.mode === 'vi' ? 'vi' : 'eval', sweep = 'sync';
  let pi = { ...PI0 }, V, hist, k, sel = 'S4';

  function outcomes(s, a) {
    const [x, y] = POS[s], [, dx, dy] = ACTS[a];
    const nxt = AT[[x + dx, y + dy].join()] || s;
    const move = [s === 'S4' ? 1 - slip : 1, nxt, nxt === 'G' ? 1 : 0];
    return s === 'S4' ? [[slip, s, 0], move] : [move];
  }
  const q = (T, s, a) => outcomes(s, a).reduce((acc, [p, n, r]) => acc + p * (r + gamma * (n === 'G' ? 0 : T[n])), 0);
  const target = (T, s) => (mode === 'eval' ? q(T, s, pi[s]) : Math.max(...ACTS.map((_, a) => q(T, s, a))));

  function oneSweep() {
    const W = { ...V };
    const read = sweep === 'sync' ? V : W; // 原地：后算的格读本轮已更新的值
    for (const s of STATES) W[s] = target(read, s);
    const d = Math.max(...STATES.map((s) => Math.abs(W[s] - V[s])));
    V = W; k += 1; hist.push(d);
    return d;
  }
  function exact() {
    let T = Object.fromEntries(STATES.map((s) => [s, 0]));
    for (let i = 0; i < 5000; i++) {
      const W = Object.fromEntries(STATES.map((s) => [s, target(T, s)]));
      const d = Math.max(...STATES.map((s) => Math.abs(W[s] - T[s])));
      T = W;
      if (d < 1e-13) break;
    }
    return T;
  }
  let star;
  function reset() {
    V = Object.fromEntries(STATES.map((s) => [s, 0]));
    hist = []; k = 0; star = exact();
    actBtn.hidden = mode !== 'eval';
    auto.stop(); ctx.redraw(); show();
  }

  /* 控件 */
  const modeSeg = ctx.segmented([['eval', '评价固定策略'], ['vi', '价值迭代']], mode, (v) => { mode = v; reset(); }, '计算');
  const sweepSeg = ctx.segmented([['sync', '同步'], ['inplace', '原地']], sweep, (v) => { sweep = v; reset(); }, '扫掠');
  const g = ctx.slider({ label: 'γ', min: 0.5, max: 0.99, step: 0.01, value: gamma, format: (x) => x.toFixed(2), oninput: (x) => { gamma = x; reset(); } });
  const sl = ctx.slider({ label: '打滑概率', min: 0, max: 0.95, step: 0.05, value: slip, format: (x) => x.toFixed(2), oninput: (x) => { slip = x; reset(); } });
  const stepBtn = ctx.button('算一轮', () => { auto.stop(); oneSweep(); ctx.redraw(); show(); }, true);
  const autoBtn = ctx.button('连续', () => (auto.running ? auto.stop() : auto.start()));
  const resetBtn = ctx.button('清零', () => { if (mode === 'eval') pi = { ...PI0 }; reset(); });
  let acc = 0;
  const auto = ctx.loop((dt) => {
    acc += dt;
    if (acc < (ctx.reduced() ? 0.6 : 0.25)) return true;
    acc = 0;
    const d = oneSweep(); ctx.redraw(); show();
    return d > 1e-10 && k < 300;
  });
  auto.onstop = () => (autoBtn.textContent = '连续');
  const _start = auto.start;
  auto.start = () => { autoBtn.textContent = '暂停'; _start(); };

  const read = ctx.readout();
  const stepsBox = ctx.steps();
  const actBtn = ctx.button('改动作', () => {
    if (mode !== 'eval') return;
    pi[sel] = (pi[sel] + 1) % 4;
    V = Object.fromEntries(STATES.map((t) => [t, 0])); hist = []; k = 0; star = exact();
    auto.stop(); ctx.redraw(); show();
  });
  const grid = el('div'), chart = el('div');
  ctx.stage.append(
    ctx.row(modeSeg.node, sweepSeg.node),
    el('div', { class: 'demo-grid2' }, grid, chart),
    ctx.row(stepBtn, autoBtn, resetBtn, actBtn),
    ctx.row(g.node, sl.node),
    read,
    stepsBox.node,
  );

  /* 网格 */
  const gc = ctx.canvas({
    parent: grid, aspect: 1, maxHeight: 300, minHeight: 220, label: '泥地网格上的价值表',
    draw(G, w, h) {
      const C = ctx.colors(), n = 3, size = Math.min(w, h), cs = size / n, ox = (w - size) / 2;
      const vmax = Math.max(1e-9, ...STATES.map((s) => star[s]));
      G.textAlign = 'center'; G.textBaseline = 'middle';
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const s = AT[[x, y].join()], X = ox + x * cs, Y = y * cs;
        if (!s) { G.fillStyle = ctx.mix(C.bg, C.ink, 0.42); G.fillRect(X + 1, Y + 1, cs - 2, cs - 2); continue; }
        G.fillStyle = s === 'G' ? C.accentSoft : ctx.mix(C.bg, C.accent, 0.08 + 0.55 * Math.max(0, V[s]) / vmax);
        G.fillRect(X + 1, Y + 1, cs - 2, cs - 2);
        if (s === 'S4') { G.strokeStyle = C.series[1]; G.lineWidth = 3; G.strokeRect(X + 2.5, Y + 2.5, cs - 5, cs - 5); }
        if (s === sel) { G.save(); G.setLineDash([5, 3]); G.strokeStyle = C.ink; G.lineWidth = 2; G.strokeRect(X + 7, Y + 7, cs - 14, cs - 14); G.restore(); }
        G.fillStyle = C.muted; G.font = ctx.font(cs * 0.12); G.textAlign = 'left';
        G.fillText(s === 'S4' ? 'S4 泥地' : s, X + 6, Y + cs * 0.13);
        G.textAlign = 'center';
        if (s === 'G') { G.fillStyle = C.ink; G.font = ctx.font(cs * 0.2, 600); G.fillText('G  +1', X + cs / 2, Y + cs / 2); continue; }
        G.fillStyle = C.ink; G.font = ctx.font(cs * 0.19, 600, true);
        G.fillText(V[s].toFixed(3), X + cs / 2, Y + cs * 0.5);
        // 箭头：评价时画固定策略，价值迭代时画对当前表贪心的动作（并列都画）
        const qs = ACTS.map((_, a) => q(V, s, a)), best = Math.max(...qs);
        const arrows = mode === 'eval' ? [pi[s]] : ACTS.map((_, a) => a).filter((a) => qs[a] > best - 1e-9);
        G.fillStyle = mode === 'eval' ? C.series[2] : C.series[0];
        G.font = ctx.font(cs * 0.2, 600);
        G.fillText(arrows.map((a) => ACTS[a][3]).join(''), X + cs / 2, Y + cs * 0.8);
      }
      gc.layout = { ox, cs };
    },
  });
  gc.cv.style.cursor = 'pointer';
  gc.cv.addEventListener('click', (e) => {
    if (!gc.layout) return;
    const r = gc.cv.getBoundingClientRect(), { ox, cs } = gc.layout;
    const x = Math.floor((e.clientX - r.left - ox) / cs), y = Math.floor((e.clientY - r.top) / cs);
    const s = AT[[x, y].join()];
    if (!s || s === 'G') return;
    sel = s; ctx.redraw(); show();
  });

  /* 整表差 Δ_k 的对数图，虚线是 γ^k 的收缩上界 */
  ctx.canvas({
    parent: chart, aspect: 0.8, maxHeight: 300, minHeight: 220, label: '每轮最大改变量的对数',
    draw(G, w, h) {
      const C = ctx.colors();
      const data = hist.map((d, i) => [i, Math.log10(Math.max(d, 1e-12))]);
      const xmax = Math.max(10, hist.length);
      const bound = hist.length ? [[0, data[0][1]], [xmax, data[0][1] + xmax * Math.log10(gamma)]] : [];
      ctx.plot(G, w, h, {
        series: [{ data: bound, color: C.muted, dash: [5, 4], width: 1.3 }, { data, color: C.series[0], width: 2 }],
        xmin: 0, xmax, ymin: -10, ymax: 0, xlabel: '轮数 k', ylabel: 'log₁₀ Δₖ', pad: { l: 40 },
      });
    },
  });
  chart.append(ctx.legend([['var(--d1)', 'Δₖ = ‖Vₖ₊₁ − Vₖ‖∞'], ['var(--muted)', 'γᵏ Δ₀（收缩上界）']]));

  function show() {
    const err = Math.max(...STATES.map((s) => Math.abs(V[s] - star[s])));
    read.innerHTML = `第 <b>${k}</b> 轮　` + (hist.length ? `Δ<sub>${k - 1}</sub> = <b>${hist[hist.length - 1].toExponential(2)}</b>　` : '尚未更新　') +
      `V(S7) = <b>${fmt(V.S7, 4)}</b>，精确值 ${fmt(star.S7, 4)}　与精确表的最大差 <b>${err.toExponential(2)}</b>` +
      '<br><span class="demo-note">点格子看这一格下一轮怎样算' + (mode === 'eval' ? '；“改动作”换这一格的固定动作' : '') + '。</span>';
    showSteps();
  }

  /* 计算过程：选中格 s 在第 k→k+1 轮的一步期望更新，代入当前表的数 */
  const NAME = { 0: '上', 1: '右', 2: '下', 3: '左' };
  const f3 = (x) => x.toFixed(3);
  function readTable() {
    if (sweep === 'sync') return V;
    const W = { ...V }; // 原地：排在 s 前面的格已写入本轮新值
    for (const t of STATES) { if (t === sel) break; W[t] = target(W, t); }
    return W;
  }
  function backupTerms(T, s, a) {
    const outs = outcomes(s, a);
    const sym = outs.map(([p, n, r]) => `${p === 1 ? '' : fmt(p, 2) + '·'}(${r} + γ·${n === 'G' ? '0' : `V(${n})`})`).join(' + ');
    const num = outs.map(([p, n, r]) => `${p === 1 ? '' : fmt(p, 2) + '·'}(${r} + ${fmt(gamma, 2)}·${n === 'G' ? '0' : f3(T[n])})`).join(' + ');
    return { sym, num, val: q(T, s, a), outs };
  }
  function showSteps() {
    const s = sel, T = readTable(), lab = sweep === 'sync' ? `V_{${k}}` : 'V';
    const lines = [];
    const tableNote = sweep === 'sync' ? `读第 ${k} 轮的整张旧表 $V_{${k}}$` : `原地：读当前表，排在 ${s} 前面的格已是本轮新值`;
    if (mode === 'eval') {
      const a = pi[s], t = backupTerms(T, s, a);
      lines.push([`${s} 的固定动作 $π(${s})$ = ${NAME[a]}` + (s === 'S4' ? `；泥地以 $p_{slip} = ${fmt(slip, 2)}$ 留在原地` : '') + '；' + tableNote, null]);
      lines.push(['Bellman 期望更新', `V_{${k + 1}}(${s}) = Σ_{s′,r} p(s′,r|${s},π(${s}))·[r + γ·${lab}(s′)]`]);
      lines.push(['展开', `= ${t.sym.replace(/V\(/g, lab + '(')}`]);
      lines.push(['代入', `= ${t.num}`]);
      lines.push(['结果', { html: ctx.m(`= `) + `<b>${f3(t.val)}</b>` }]);
    } else {
      lines.push([`对 ${s} 的四个动作各算一步目标，取最大；` + tableNote, null]);
      lines.push(['价值迭代', `V_{${k + 1}}(${s}) = max_a Σ_{s′,r} p(s′,r|${s},a)·[r + γ·${lab}(s′)]`]);
      const qs = ACTS.map((_, a) => backupTerms(T, s, a)), best = Math.max(...qs.map((x) => x.val));
      qs.forEach((t, a) => lines.push([`$a$ = ${NAME[a]}`, { html: ctx.m(`q(${s},${ACTS[a][3]}) = ${t.num} = `) + (t.val > best - 1e-9 ? `<b>${f3(t.val)}</b>` : f3(t.val)) }]));
      lines.push(['取最大', { html: ctx.m(`V_{${k + 1}}(${s}) = `) + `<b>${f3(best)}</b>` }]);
    }
    stepsBox.set(lines, `计算过程　${s}：第 ${k} → ${k + 1} 轮`);
  }
  reset();
});
