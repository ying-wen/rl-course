/* 第 5 章：泥地预测上的首访 MC（步长 1/N 与常步长 α）与一步 TD（常步长 α），对应 5.4 节。
 * 固定策略在 S7、S4 都向上：S7 一步到 S4（奖励 0），S4 每步以 .1 进 G 得 1，以 .9 打滑留在原地；γ = .9。
 * 三种更新共用同一批回合，从零表开始；RMSE 对独立运行与 S7、S4 两格的平方误差取平均再开方，与 ch05_matched_steps.py 同法。 */
(() => {
  const GAMMA = 0.9, SUCCESS = 0.1;
  const TRUTH = { S4: SUCCESS / (1 - GAMMA * (1 - SUCCESS)), S7: GAMMA * SUCCESS / (1 - GAMMA * (1 - SUCCESS)) };
  function rng(seed = 1) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* 一个回合：[[S_t, R_{t+1}, S_{t+1}, 终止?], …]。只有这里用到真实成功概率。 */
  function episode(r) {
    const out = [['S7', 0, 'S4', false]];
    for (;;) {
      const done = r() < SUCCESS;
      out.push(['S4', done ? 1 : 0, done ? 'G' : 'S4', done]);
      if (done) return out;
    }
  }
  function returns(ep, g = GAMMA) {
    const G = new Array(ep.length);
    let acc = 0;
    for (let t = ep.length - 1; t >= 0; t--) { acc = ep[t][1] + g * acc; G[t] = acc; }
    return G;
  }
  /* 学习器：三张表与访问计数。 */
  const fresh = () => ({ mc: { S7: 0, S4: 0 }, mca: { S7: 0, S4: 0 }, td: { S7: 0, S4: 0 }, n: { S7: 0, S4: 0 } });
  function tdStep(L, [s, r, s2, done], alpha, g = GAMMA) {
    const old = L.td[s], tail = done ? 0 : L.td[s2], delta = r + g * tail - old;
    L.td[s] = old + alpha * delta;
    return { s, r, s2, done, old, tail, delta, val: L.td[s] };
  }
  function mcEnd(L, ep, alpha, g = GAMMA) {
    const G = returns(ep, g), seen = new Set(), out = [];
    ep.forEach(([s], t) => {
      if (seen.has(s)) return;
      seen.add(s);
      L.n[s] += 1;
      const o1 = L.mc[s], o2 = L.mca[s];
      L.mc[s] = o1 + (G[t] - o1) / L.n[s];
      L.mca[s] = o2 + alpha * (G[t] - o2);
      out.push({ s, t, G: G[t], n: L.n[s], o1, v1: L.mc[s], o2, v2: L.mca[s] });
    });
    return out;
  }
  /* 一次运行：nEp 个回合，回调 each(k, L) 在每回合末给出三张表。 */
  function run(seed, nEp, alpha, each) {
    const r = rng(seed), L = fresh();
    for (let k = 1; k <= nEp; k++) {
      const ep = episode(r);
      for (const tr of ep) tdStep(L, tr, alpha);
      mcEnd(L, ep, alpha);
      each(k, L);
    }
  }
  /* 平方误差累加器：sq[m][k−1] 累加 (V(S7)−v(S7))² + (V(S4)−v(S4))²，m = 0 MC 1/N、1 MC α、2 TD α。 */
  function accumulate(sq, seed, nEp, alpha) {
    run(seed, nEp, alpha, (k, L) => {
      [L.mc, L.mca, L.td].forEach((V, m) => {
        sq[m][k - 1] += (V.S7 - TRUTH.S7) ** 2 + (V.S4 - TRUTH.S4) ** 2;
      });
    });
  }
  function rmse(nRuns, nEp, alpha, seed0 = 1000) {
    const sq = [0, 1, 2].map(() => new Float64Array(nEp));
    for (let i = 0; i < nRuns; i++) accumulate(sq, seed0 + i, nEp, alpha);
    return sq.map((a) => Array.from(a, (x) => Math.sqrt(x / (2 * nRuns))));
  }
  /* S4 的 TD 估计（一步目标固定在 S4 自身）作为马尔可夫链的平稳均值与标准差：
   * 打滑 V ← (1 − .1α)V，成功 V ← (1 − α)V + α。 */
  function tdS4Stationary(alpha, g = GAMMA, p = SUCCESS) {
    const a = 1 - alpha * (1 - g), b = 1 - alpha;
    const m = (p * alpha) / (1 - (1 - p) * a - p * b);
    const s = (p * (2 * alpha * b * m + alpha * alpha)) / (1 - (1 - p) * a * a - p * b * b);
    return { mean: m, sd: Math.sqrt(s - m * m) };
  }
  const model = { GAMMA, SUCCESS, TRUTH, rng, episode, returns, fresh, tdStep, mcEnd, run, accumulate, rmse, tdS4Stationary };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('mud-mctd', (ctx) => {
    const { el, fmt } = ctx;
    const NEP = 500, NRUNS = 2000;
    let alpha = 0.05, seed = 1, which = 'S7';
    let r, L, cur, t, epi, hist, lastTD, lastMC, lastLen = 0;
    const d3 = (x) => fmt(x, 3).replace(/^(−?)0\./, '$1.');
    const as = () => String(+alpha.toFixed(3)).replace(/^0\./, '.');

    function reset() {
      r = rng(seed); L = fresh(); cur = null; t = 0; epi = 0; lastTD = null; lastMC = null;
      hist = { mc: { S7: [], S4: [] }, mca: { S7: [], S4: [] }, td: { S7: [], S4: [] } };
      ctx.redraw(); show();
    }
    function oneStep() {
      if (epi >= NEP) return false;
      if (!cur) { cur = episode(r); t = 0; lastMC = null; }
      lastTD = { ...tdStep(L, cur[t], alpha), t };
      t += 1;
      if (t >= cur.length) {
        lastMC = mcEnd(L, cur, alpha); lastLen = cur.length;
        epi += 1;
        for (const m of ['mc', 'mca', 'td']) for (const s of ['S7', 'S4']) hist[m][s].push(L[m][s]);
        cur = null;
        return 'end';
      }
      return true;
    }
    function oneEpisode() { let x; do { x = oneStep(); } while (x === true); }

    // 2000 次独立运行的 RMSE，分块跑
    let sq, done;
    function restartBatch() { sq = [0, 1, 2].map(() => new Float64Array(NEP)); done = 0; batch.start(); }
    const batch = ctx.loop(() => {
      const t0 = performance.now();
      while (done < NRUNS && performance.now() - t0 < 6) { accumulate(sq, 1000 + done, NEP, alpha); done += 1; }
      ctx.redraw(); showBatch();
      return done < NRUNS;
    });

    let acc = 0;
    const auto = ctx.loop((dt) => {
      acc += dt;
      const per = ctx.reduced() ? 0.25 : 1 / 60;
      let n = 0;
      while (acc >= per && n < 3) { acc -= per; n += 1; oneEpisode(); }
      if (n) { ctx.redraw(); show(); }
      return epi < NEP;
    });
    const autoBtn = ctx.button('连续', () => (auto.running ? auto.stop() : auto.start()));
    const _start = auto.start;
    auto.start = () => { autoBtn.textContent = '暂停'; acc = 0; _start(); };
    auto.onstop = () => { autoBtn.textContent = '连续'; };
    const stepBtn = ctx.button('走一步', () => { auto.stop(); oneStep(); ctx.redraw(); show(); }, true);
    const epBtn = ctx.button('走一回合', () => { auto.stop(); oneEpisode(); ctx.redraw(); show(); });
    const resetBtn = ctx.button('换一批回合', () => { auto.stop(); seed += 1; reset(); });
    const aSl = ctx.slider({ label: 'α', min: 0.01, max: 0.3, step: 0.01, value: alpha, format: (x) => x.toFixed(2),
      oninput: (x) => { alpha = x; auto.stop(); reset(); restartBatch(); } });
    const sSeg = ctx.segmented([['S7', 'S7 的估计'], ['S4', 'S4 的估计']], which, (v) => { which = v; ctx.redraw(); }, '画哪个状态');
    const read = ctx.readout(), bread = ctx.readout();
    const st = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(
      ctx.row(stepBtn, epBtn, autoBtn, resetBtn),
      ctx.row(aSl.node, sSeg.node),
      el('div', { class: 'demo-grid2' }, left, right),
      ctx.legend([['var(--d4)', '首访 MC，1/N'], ['var(--d2)', '首访 MC，常步长 α（虚线）'], ['var(--d3)', '一步 TD，常步长 α']]),
      read, bread, st.node,
    );

    ctx.canvas({
      parent: left, aspect: 0.72, maxHeight: 300, minHeight: 210,
      label: '一次运行：横轴是已完成回合数，纵轴是回合末的估计，灰色虚线是真值',
      draw(G, w, h) {
        const C = ctx.colors(), K = Math.max(50, epi);
        const pts = (a) => a.map((y, i) => [i + 1, y]);
        const P = ctx.plot(G, w, h, {
          series: [
            { data: pts(hist.mc[which]), color: C.series[3], width: 2.6 },
            { data: pts(hist.mca[which]), color: C.series[1], width: 1.6, dash: [6, 4] },
            { data: pts(hist.td[which]), color: C.series[2], width: 1.6 },
          ],
          xmin: 0, xmax: K, ymin: 0, ymax: 1,
          hlines: [{ y: TRUTH[which], color: C.muted, label: `真值 ${which === 'S7' ? '9/19' : '10/19'}` }],
          xlabel: '已完成回合数', ylabel: `${which} 的估计`, pad: { l: 48 },
        });
        G.fillStyle = C.soft; G.font = ctx.font(11.5); G.textAlign = 'left'; G.textBaseline = 'top';
        G.fillText(`单次运行，第 ${epi} 回合`, P.P.l + 6, P.P.t + 2);
      },
    });
    const TICKS = [1, 5, 20, 100, 500];
    ctx.canvas({
      parent: right, aspect: 0.72, maxHeight: 300, minHeight: 210,
      label: '2000 次独立运行的均方根误差，横轴是已完成回合数（对数刻度）',
      draw(G, w, h) {
        const C = ctx.colors();
        const curve = (m) => (done ? Array.from(sq[m], (x, i) => [Math.log10(i + 1), Math.sqrt(x / (2 * done))]) : []);
        const P = ctx.plot(G, w, h, {
          series: [
            { data: curve(0), color: C.series[3], width: 2.6 },
            { data: curve(1), color: C.series[1], width: 1.8, dash: [6, 4] },
            { data: curve(2), color: C.series[2], width: 1.8 },
          ],
          xmin: 0, xmax: Math.log10(NEP), ymin: 0, ymax: 0.5, xticks: 3,
          xlabel: '已完成回合数（对数刻度）', ylabel: 'RMSE', pad: { l: 48, r: 12 },
        });
        // 换掉线性刻度标签，标 1、5、20、100、500
        G.fillStyle = C.surface; G.fillRect(P.P.l - 8, h - P.P.b + 5, w - P.P.l + 8, 13);
        G.fillStyle = C.muted; G.font = ctx.font(12); G.textAlign = 'center'; G.textBaseline = 'top';
        G.strokeStyle = C.line; G.lineWidth = 1;
        for (const k of TICKS) {
          const x = P.X(Math.log10(k));
          G.fillText(String(k), x, h - P.P.b + 6);
          G.beginPath(); G.moveTo(x, h - P.P.b); G.lineTo(x, h - P.P.b + 4); G.stroke();
        }
        G.fillStyle = C.soft; G.font = ctx.font(11.5); G.textAlign = 'right'; G.textBaseline = 'top';
        G.fillText(done < NRUNS ? `已跑 ${done} / ${NRUNS} 次运行` : `${NRUNS} 次独立运行`, w - P.P.r - 4, P.P.t + 2);
      },
    });

    const mm = (s) => s.split(/(S\d)/).map((x, i) => (i % 2 ? x : ctx.m(x))).join('');
    function showBatch() {
      if (!done) { bread.innerHTML = ''; return; }
      const at = (m, k) => Math.sqrt(sq[m][k - 1] / (2 * done)).toFixed(4).replace(/^0\./, '.');
      bread.innerHTML = `RMSE（${done} 次运行）　第 20 回合：MC 1/N ${at(0, 20)}，MC α <b>${at(1, 20)}</b>，TD α <b>${at(2, 20)}</b>` +
        `　第 500 回合：MC 1/N <b>${at(0, 500)}</b>，MC α <b>${at(1, 500)}</b>，TD α <b>${at(2, 500)}</b>`;
    }
    function show() {
      const sd = tdS4Stationary(alpha);
      let s = `表：MC 1/N (${d3(L.mc.S7)}, ${d3(L.mc.S4)})　MC α (${d3(L.mca.S7)}, ${d3(L.mca.S4)})　TD α (${d3(L.td.S7)}, ${d3(L.td.S4)})　括号内依次为 S7、S4`;
      if (cur) s += `<br>第 ${epi + 1} 回合进行中：已走 ${t} 步，S4 已打滑 ${Math.max(0, t - 1)} 次`;
      s += `<br><span class="demo-note">S4 的 TD 估计在 α = ${alpha.toFixed(2)} 下的平稳标准差 ${fmt(sd.sd, 3)}（按 S4 的更新链精确算出）；真值 S7 = 9/19 ≈ .474，S4 = 10/19 ≈ .526。</span>`;
      read.innerHTML = s;
      const lines = [];
      if (lastTD) {
        const { s: S, r: R, s2, done: dn, old, tail, delta, val, t: tt } = lastTD;
        lines.push(['TD 误差', 'δ_t = R_{t+1} + γV(S_{t+1}) − V(S_t)']);
        lines.push([`第 ${tt} 步：${S} → ${s2}，奖励 ${R}${dn ? '，到终点，$V$(G) = 0' : ''}`,
          { html: mm(`δ_{${tt}} = ${R} + .9·${d3(tail)} − ${d3(old)} = `) + `<b>${d3(delta)}</b>` }]);
        lines.push(['TD 更新，走完这一步就写入', { html: mm(`V(${S}) ← ${d3(old)} + ${as()}·(${d3(delta)}) = `) + `<b>${d3(val)}</b>` }]);
      }
      if (lastMC) {
        lines.push(['回合结束，首访 MC 用完整回报', 'G_t = R_{t+1} + γR_{t+2} + … = γ^{T−t−1}']);
        for (const m of lastMC) {
          const T = m.t; // 首次访问时刻
          lines.push([`${m.s} 首次出现在 $t$ = ${T}，本回合 $T$ = ${lastLen}，第 ${m.n} 次计入`, { html: mm(`G_{${T}} = .9^{${lastLen - T - 1}} = ${d3(m.G)}`) }]);
          lines.push(['', { html: mm(`1/N：V(${m.s}) ← ${d3(m.o1)} + (1/${m.n})·(${d3(m.G)} − ${d3(m.o1)}) = `) + `<b>${d3(m.v1)}</b>` }]);
          lines.push(['', { html: mm(`α：V(${m.s}) ← ${d3(m.o2)} + ${as()}·(${d3(m.G)} − ${d3(m.o2)}) = `) + `<b>${d3(m.v2)}</b>` }]);
        }
      } else if (lastTD) {
        lines.push(['回合未结束，MC 还没有回报可用，两张 MC 表不变']);
      }
      if (!lines.length) lines.push(['按“走一步”从 S7 开始第一个回合；TD 每步更新，MC 等到回合结束']);
      st.set(lines, `计算过程　α = ${alpha.toFixed(2)}，γ = .9`);
    }
    reset(); restartBatch();
  });
})();
