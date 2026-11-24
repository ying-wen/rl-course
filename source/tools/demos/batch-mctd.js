/* 第 5 章：泥地记录上的批量首访 MC 与批量 TD，对应 5.5 节“一条记录的批量解”。
 * 一个回合 S7 →(0) S4，S4 打滑 j 次后成功 →(1) G；一组记录 = K 个回合，只需各回合的打滑次数 j。
 * 批量首访 MC 的解是首访回报的平均：V(S4) = mean .9^j；批量 TD 的解是经验 Bellman 方程的解：V(S4) = K/(K + .1·Σj)；两者都有 V(S7) = .9·V(S4)。 */
(() => {
  const GAMMA = 0.9, P = 0.1, V4 = P / (1 - GAMMA * (1 - P)), V7 = GAMMA * V4;
  const LN9 = Math.log(1 - P);
  const TEXT_RECORD = [2]; // 正文的四步记录：两次打滑、一次成功
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
  const slips = (r) => Math.floor(Math.log(1 - r()) / LN9); // 几何分布：P(j) = .9^j·.1
  const record = (r, K) => Array.from({ length: K }, () => slips(r));
  /* 统计量：K 回合、S 次打滑、S4 访问 n = K + S 次、首访回报之和。 */
  function stats(rec) {
    const K = rec.length, S = rec.reduce((a, b) => a + b, 0);
    const G4 = rec.reduce((a, j) => a + GAMMA ** j, 0);
    return { K, S, n: K + S, G4, G7: GAMMA * G4 };
  }
  function solutions(rec) {
    const { K, S, G4 } = stats(rec);
    const mc4 = G4 / K, td4 = K / (K + (1 - GAMMA) * S);
    return { mc: { S7: GAMMA * mc4, S4: mc4 }, td: { S7: GAMMA * td4, S4: td4 } };
  }
  /* 一遍批量更新：用同一张旧表算出全部增量，求和后乘 α = η/N(s) 一次写入。 */
  const ETA = 0.5;
  function sweepMC(V, rec) {
    const { K, G4, G7 } = stats(rec);
    const d7 = G7 - K * V.S7, d4 = G4 - K * V.S4;
    return { V: { S7: V.S7 + (ETA / K) * d7, S4: V.S4 + (ETA / K) * d4 }, d7, d4, N7: K, N4: K };
  }
  function sweepTD(V, rec) {
    const { K, S, n } = stats(rec);
    const d7 = K * (0 + GAMMA * V.S4 - V.S7);
    const d4 = K * (1 - V.S4) + S * (GAMMA * V.S4 - V.S4);
    return { V: { S7: V.S7 + (ETA / K) * d7, S4: V.S4 + (ETA / n) * d4 }, d7, d4, N7: K, N4: n };
  }
  /* 多组比较：每组一份 K 回合记录，比较两种解在 S4 上的误差（S7 = .9·S4，两格的比较一致）。 */
  function groupErr(r, K) {
    let S = 0, G4 = 0;
    for (let i = 0; i < K; i++) { const j = slips(r); S += j; G4 += GAMMA ** j; }
    return [Math.abs(G4 / K - V4), Math.abs(K / (K + (1 - GAMMA) * S) - V4)];
  }
  const RMS2 = Math.sqrt((1 + GAMMA * GAMMA) / 2); // 把 S4 误差换成 S7、S4 两格的均方根
  /* K = 1 的精确值：按 j 的几何分布求和。 */
  function exactK1(jmax = 4000) {
    let mc = 0, td = 0, mcb = 0, tie = 0;
    for (let j = 0; j < jmax; j++) {
      const p = P * (1 - P) ** j, e1 = Math.abs(GAMMA ** j - V4), e2 = Math.abs(1 / (1 + (1 - GAMMA) * j) - V4);
      mc += p * e1 * e1; td += p * e2 * e2;
      if (Math.abs(e1 - e2) < 1e-12) tie += p; else if (e1 < e2) mcb += p;
    }
    return { mc: RMS2 * Math.sqrt(mc), td: RMS2 * Math.sqrt(td), mcCloser: mcb, tie };
  }
  const model = { GAMMA, V4, V7, TEXT_RECORD, ETA, rng, slips, record, stats, solutions, sweepMC, sweepTD, groupErr, RMS2, exactK1 };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('batch-mctd', (ctx) => {
    const { el, fmt } = ctx;
    const NG = 200000, SHOW = 4000, MAXSW = 60;
    let K = 1, seed = 1, rec = TEXT_RECORD.slice(), r = rng(seed);
    let Vm, Vt, hist, last, sol;
    const d3 = (x) => fmt(x, 3).replace(/^(−?)0\./, '$1.');
    const mm = (s) => s.split(/(S\d)/).map((x, i) => (i % 2 ? x : ctx.m(x))).join('');

    function resetSweeps() {
      Vm = { S7: 0, S4: 0 }; Vt = { S7: 0, S4: 0 }; last = null; sol = solutions(rec);
      hist = { mc: [0], td: [0] };
    }
    function sweep() {
      if (hist.mc.length > MAXSW) return false;
      const a = sweepMC(Vm, rec), b = sweepTD(Vt, rec);
      last = { m: a, t: b, Vm: Vm, Vt: Vt };
      Vm = a.V; Vt = b.V; hist.mc.push(Vm.S4); hist.td.push(Vt.S4);
      return Math.max(Math.abs(Vm.S4 - sol.mc.S4), Math.abs(Vt.S4 - sol.td.S4), Math.abs(Vt.S7 - sol.td.S7)) > 5e-5;
    }

    // 多组比较，分块跑
    let gr, sq, cnt, pts, gdone;
    function restartGroups() {
      gr = rng(9000 + K); sq = [0, 0]; cnt = [0, 0, 0]; pts = []; gdone = 0; groups.start();
    }
    const groups = ctx.loop(() => {
      const t0 = performance.now();
      while (gdone < NG && performance.now() - t0 < 6) {
        for (let i = 0; i < 200 && gdone < NG; i++, gdone++) {
          const [e1, e2] = groupErr(gr, K);
          sq[0] += e1 * e1; sq[1] += e2 * e2;
          cnt[Math.abs(e1 - e2) < 1e-12 ? 1 : e1 < e2 ? 0 : 2] += 1;
          if (pts.length < SHOW) pts.push([e1, e2]);
        }
      }
      ctx.redraw(); showGroups();
      return gdone < NG;
    });

    let acc = 0;
    const auto = ctx.loop((dt) => {
      acc += dt;
      const per = ctx.reduced() ? 0.5 : 0.08;
      if (acc < per) return true;
      acc = 0;
      const more = sweep();
      ctx.redraw(); show();
      return more;
    });
    const autoBtn = ctx.button('连续扫', () => (auto.running ? auto.stop() : auto.start()));
    const _start = auto.start;
    auto.start = () => { autoBtn.textContent = '暂停'; acc = 0; _start(); };
    auto.onstop = () => { autoBtn.textContent = '连续扫'; };
    const sweepBtn = ctx.button('扫一遍', () => { auto.stop(); sweep(); ctx.redraw(); show(); }, true);
    const newBtn = ctx.button('换一组记录', () => { auto.stop(); seed += 1; r = rng(seed); rec = record(r, K); resetSweeps(); ctx.redraw(); show(); });
    const textBtn = ctx.button('正文的记录', () => {
      auto.stop();
      if (K !== 1) { K = 1; kSeg.set(1); restartGroups(); }
      rec = TEXT_RECORD.slice(); resetSweeps(); ctx.redraw(); show();
    });
    const kSeg = ctx.segmented([[1, 'K = 1'], [3, '3'], [10, '10'], [100, '100']], K, (v) => {
      auto.stop(); K = +v; rec = K === 1 ? TEXT_RECORD.slice() : record(r, K); resetSweeps(); restartGroups(); ctx.redraw(); show();
    }, '每组记录的回合数 K');
    const recRead = ctx.readout(), read = ctx.readout(), gread = ctx.readout();
    const st = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(
      ctx.row(kSeg.node),
      ctx.row(sweepBtn, autoBtn, newBtn, textBtn),
      recRead,
      el('div', { class: 'demo-grid2' }, left, right),
      ctx.legend([['var(--d4)', '批量首访 MC'], ['var(--d3)', '批量 TD'], ['var(--muted)', '真值 10/19（虚线）']]),
      read, gread, st.node,
    );

    ctx.canvas({
      parent: left, aspect: 0.78, maxHeight: 300, minHeight: 220,
      label: '当前记录上的批量扫描：横轴是扫描遍数，纵轴是 V(S4)，虚线是两种解的不动点与真值',
      draw(G, w, h) {
        const C = ctx.colors(), n = hist.mc.length - 1;
        const P2 = ctx.plot(G, w, h, {
          series: [
            { data: hist.mc.map((y, i) => [i, y]), color: C.series[3], width: 2.4 },
            { data: hist.td.map((y, i) => [i, y]), color: C.series[2], width: 2 },
          ],
          xmin: 0, xmax: Math.max(20, n), ymin: 0, ymax: 1.05,
          hlines: [
            { y: V4, color: C.muted },
            { y: sol.mc.S4, color: C.series[3] },
            { y: sol.td.S4, color: C.series[2] },
          ],
          xlabel: '扫描遍数', ylabel: 'V(S4)', pad: { l: 48, r: 10 },
        });
        // 不动点的数标在左侧绘图区内，两条线太近时错开
        const tags = [[sol.mc.S4, C.series[3], 'MC ' + d3(sol.mc.S4)], [sol.td.S4, C.series[2], 'TD ' + d3(sol.td.S4)], [V4, C.muted, '真值 .526']]
          .map(([y, c, t]) => ({ y: P2.Y(y), c, t })).sort((a, b) => a.y - b.y);
        for (let i = 1; i < tags.length; i++) if (tags[i].y - tags[i - 1].y < 14) tags[i].y = tags[i - 1].y + 14;
        G.font = ctx.font(11.5, 600); G.textAlign = 'right'; G.textBaseline = 'bottom';
        for (const tg of tags) {
          const tw = G.measureText(tg.t).width;
          G.fillStyle = C.surface; G.fillRect(w - P2.P.r - tw - 4, tg.y - 14, tw + 4, 13);
          G.fillStyle = tg.c; G.fillText(tg.t, w - P2.P.r - 2, tg.y - 1);
        }
      },
    });
    ctx.canvas({
      parent: right, aspect: 0.78, maxHeight: 300, minHeight: 220,
      label: '多组记录的散点：横轴是批量 MC 解在 S4 上的误差，纵轴是批量 TD 解的误差，对角线上方表示 MC 更近',
      draw(G, w, h) {
        const C = ctx.colors();
        let lim = 0.05;
        if (pts.length) {
          const m = pts.map(([a, b]) => Math.max(a, b)).sort((a, b) => a - b);
          lim = Math.min(0.55, Math.max(0.02, m[Math.floor(0.99 * (m.length - 1))] * 1.08));
        }
        const P2 = ctx.plot(G, w, h, { series: [], xmin: 0, xmax: lim, ymin: 0, ymax: lim, xticks: 3, yticks: 3,
          xlabel: '|MC 解 − 真值|', ylabel: '|TD 解 − 真值|', pad: { l: 50, r: 12 } });
        G.save(); G.beginPath(); G.rect(P2.P.l, P2.P.t, w - P2.P.l - P2.P.r, h - P2.P.t - P2.P.b); G.clip();
        G.strokeStyle = C.rule; G.setLineDash([4, 4]); G.lineWidth = 1;
        G.beginPath(); G.moveTo(P2.X(0), P2.Y(0)); G.lineTo(P2.X(lim), P2.Y(lim)); G.stroke(); G.setLineDash([]);
        const col = [C.series[3], C.muted, C.series[2]];
        G.globalAlpha = 0.55;
        for (const [a, b] of pts) {
          const k = Math.abs(a - b) < 1e-12 ? 1 : a < b ? 0 : 2;
          G.fillStyle = col[k]; G.fillRect(P2.X(a) - 1.3, P2.Y(b) - 1.3, 2.6, 2.6);
        }
        G.globalAlpha = 1;
        G.restore();
        G.font = ctx.font(11.5, 600); G.textBaseline = 'top';
        G.fillStyle = C.series[3]; G.textAlign = 'left'; G.fillText('MC 更近', P2.P.l + 6, P2.P.t + 2);
        G.fillStyle = C.series[2]; G.textAlign = 'right'; G.textBaseline = 'bottom'; G.fillText('TD 更近', w - P2.P.r - 4, h - P2.P.b - 4);
      },
    });

    function recText() {
      const { K: k, S, n } = stats(rec);
      if (k === 1) {
        const j = rec[0];
        const path = j <= 6 ? 'S7 →(0) S4' + ' →(0) S4'.repeat(j) + ' →(1) G' : `S7 →(0) S4，打滑 ${j} 次，→(1) G`;
        return `记录：${path}　S4 访问 ${n} 次，首访回报 ${mm(`.9^{${j}}`)} = ${d3(GAMMA ** j)}`;
      }
      return `记录：${k} 个回合，S4 共访问 ${n} 次（成功 ${k} 次，打滑 ${S} 次）`;
    }
    function show() {
      recRead.innerHTML = recText();
      const n = hist.mc.length - 1;
      read.innerHTML = `第 ${n} 遍后　批量 MC：V(S7) = ${d3(Vm.S7)}，V(S4) = <b>${d3(Vm.S4)}</b>（解 ${d3(sol.mc.S4)}）` +
        `　批量 TD：V(S7) = ${d3(Vt.S7)}，V(S4) = <b>${d3(Vt.S4)}</b>（解 ${d3(sol.td.S4)}）　真值 S4 = 10/19 ≈ .526`;
      const { K: k, S, n: n4, G4 } = stats(rec);
      const lines = [];
      if (last) {
        const { m: a, t: b, Vm: om, Vt: ot } = last;
        lines.push(['批量 TD，S4 的增量之和（旧表）', { html: mm(`Σδ = ${k}·(1 − ${d3(ot.S4)}) + ${S}·(.9·${d3(ot.S4)} − ${d3(ot.S4)}) = `) + `<b>${d3(b.d4)}</b>` }]);
        lines.push([`一次写入，$α$ = 1/(2·${n4})`, { html: mm(`V(S4) ← ${d3(ot.S4)} + ${d3(b.d4)}/${2 * n4} = `) + `<b>${d3(b.V.S4)}</b>` }]);
        lines.push(['S7 的增量读旧表里的 S4', { html: mm(`Σδ = ${k}·(0 + .9·${d3(ot.S4)} − ${d3(ot.S7)}) = ${d3(b.d7)}，V(S7) ← `) + `<b>${d3(b.V.S7)}</b>` }]);
        lines.push(['批量首访 MC，S4 的增量之和', { html: mm(`Σ(G − V) = ${d3(G4)} − ${k}·${d3(om.S4)} = ${d3(a.d4)}，V(S4) ← ${d3(om.S4)} + ${d3(a.d4)}/${2 * k} = `) + `<b>${d3(a.V.S4)}</b>` }]);
      }
      lines.push(['TD 的解，增量之和为零', { html: mm(`V = (${S}/${n4})(.9V) + (${k}/${n4})·1 ⇒ V(S4) = ${k}/(${k} + .1·${S}) = `) + `<b>${d3(sol.td.S4)}</b>` }]);
      lines.push(['MC 的解，首访回报平均', { html: mm(`V(S4) = ${d3(G4)}/${k} = `) + `<b>${d3(sol.mc.S4)}</b>` + mm('，两种解都有 V(S7) = .9·V(S4)') }]);
      st.set(lines, `计算过程　K = ${k}，γ = .9，每遍步长 α = 1/(2N(s))，N(s) 为该状态的增量个数`);
    }
    function showGroups() {
      if (!gdone) { gread.innerHTML = ''; return; }
      const e = (x) => (RMS2 * Math.sqrt(x / gdone)).toFixed(3).replace(/^0\./, '.');
      const pc = (x) => (100 * x / gdone).toFixed(1) + '%';
      gread.innerHTML = `${gdone < NG ? `已算 ${gdone} / ${NG} 组` : `${NG} 组`}，每组 K = ${K}　均方根误差（S7、S4）：MC <b>${e(sq[0])}</b>，TD <b>${e(sq[1])}</b>` +
        `　MC 严格更近 ${pc(cnt[0])}，相同 ${pc(cnt[1])}，TD 更近 ${pc(cnt[2])}`;
    }
    resetSweeps(); show(); restartGroups();
  });
})();
