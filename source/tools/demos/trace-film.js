/* 第 7 章 7.3 节“迹的胶片”“同一张表，两种加法”与 7.4 节“在线更新”：泥地回合 S7 → S4 → S4 → S4 → G 逐步播放。
 * 初表 V0 = (.4, .5)，γ = .9；三种写法：冻结表 + 累积迹（回合末一次写入）、每步写入 + 累积迹、真在线 TD(λ)（Dutch 迹 + 预测修正，算法 7.3）。
 * 每个状态的迹按访问拆成分量：第 k 次访问的那一份，累积迹为 (γλ)^{t−k}；Dutch 迹在同一状态被再次访问时把旧分量乘 1−α。 */
(() => {
  const GAMMA = 0.9, V0 = [0.4, 0.5], S = [0, 1, 1, 1], NEXT = [1, 1, 1, -1], R = [0, 0, 0, 1], T = 4;
  const NAMES = ['S7', 'S4'];
  /* mode：'offline' | 'online' | 'trueOnline'。返回每一步的帧 */
  function run(mode, alpha = 0.2, lam = 0.8) {
    const gl = GAMMA * lam, V = V0.slice(), cum = [0, 0], comps = [], frames = [];
    let vOld = 0;
    for (let t = 0; t < T; t++) {
      const s = S[t], s2 = NEXT[t], read = mode === 'offline' ? V0 : V;
      const v = read[s], v2 = s2 < 0 ? 0 : read[s2], delta = R[t] + GAMMA * v2 - v;
      const ePrev = [0, 0]; comps.forEach((c, k) => (ePrev[S[k]] += c));
      for (let k = 0; k < comps.length; k++) {
        comps[k] *= gl;
        if (mode === 'trueOnline' && S[k] === s) comps[k] *= 1 - alpha;
      }
      comps.push(1);
      const e = [0, 0]; comps.forEach((c, k) => (e[S[k]] += c));
      const x = [0, 0]; x[s] = 1;
      const inc = e.map((ei) => alpha * delta * ei);
      const corr = mode === 'trueOnline' ? e.map((ei, i) => alpha * (v - vOld) * (ei - x[i])) : [0, 0];
      const before = V.slice();
      for (let i = 0; i < 2; i++) { cum[i] += inc[i] + corr[i]; if (mode !== 'offline') V[i] += inc[i] + corr[i]; }
      if (mode === 'offline' && t === T - 1) for (let i = 0; i < 2; i++) V[i] = V0[i] + cum[i];
      frames.push({ t, s, s2, r: R[t], v, v2, vOld, delta, ePrev, e, comps: comps.slice(), inc, corr, cum: cum.slice(), before, V: V.slice() });
      if (mode === 'trueOnline') vOld = v2;
    }
    return frames;
  }
  /* 贡献表：格 (k, t) = 第 k 次访问在第 t 步的迹分量 × δ_t（未乘 α） */
  function contrib(frames) {
    const M = [];
    for (let k = 0; k < T; k++) M.push(frames.map((f, t) => (t >= k ? f.comps[k] * f.delta : null)));
    return M;
  }
  const model = { GAMMA, V0, S, NEXT, R, T, run, contrib };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('trace-film', (ctx) => {
    ctx.stage.style.textAlign = 'left'; // 页面正文两端对齐，计算过程里的长说明会被拉开字距
    const { fmt } = ctx;
    let mode = 'offline', alpha = 0.2, lam = 0.8, step = -1, frames = run(mode, alpha, lam), acc = 0;
    const MODES = [['offline', '冻结表'], ['online', '每步写入'], ['trueOnline', '真在线']];
    const rerun = () => { frames = run(mode, alpha, lam); upd(); };
    const seg = ctx.segmented(MODES, mode, (v) => { mode = v; rerun(); }, '写入方式');
    const aS = ctx.slider({ label: 'α', min: 0.01, max: 0.5, step: 0.01, value: alpha, format: (x) => fmt(x, 2), oninput: (x) => { alpha = x; rerun(); } });
    const lS = ctx.slider({ label: 'λ', min: 0, max: 1, step: 0.01, value: lam, format: (x) => fmt(x, 2), oninput: (x) => { lam = x; rerun(); } });
    const bNext = ctx.button('下一步', () => { play.stop(); if (step < T - 1) step++; upd(); }, true);
    const bPlay = ctx.button('播放', () => {
      if (play.running) { play.stop(); return; }
      if (step >= T - 1) step = -1;
      if (ctx.reduced()) { step = T - 1; upd(); return; }
      acc = 0; bPlay.textContent = '暂停'; play.start(); upd();
    });
    const bReset = ctx.button('重来', () => { play.stop(); step = -1; alpha = 0.2; lam = 0.8; aS.value = alpha; lS.value = lam; rerun(); });
    const play = ctx.loop((dt) => {
      acc += dt;
      if (acc < 1.1) return true;
      acc = 0; step++; upd();
      return step < T - 1;
    });
    play.onstop = () => (bPlay.textContent = '播放');
    const read = ctx.readout(), st = ctx.steps();
    ctx.stage.append(ctx.row(bNext, bPlay, bReset), ctx.row(seg.node), ctx.row(aS.node, lS.node));
    const visitCol = (C, k) => C.series[[0, 3, 4, 1][k]];

    /* 胶片：上方是回合，中间是两格的迹（按访问分段），右侧是两格的当前值 */
    ctx.canvas({
      aspect: 0.52, maxHeight: 290, minHeight: 230, label: '回合逐步播放：每一步的 TD 误差、两格的迹按访问分段、两格的当前估值',
      draw(G, w, h) {
        const C = ctx.colors(), f = step >= 0 ? frames[step] : null;
        const fs = w < 420 ? 10 : 11; G.font = ctx.font(fs);
        // 回合行
        const cells = ['S7', 'S4', 'S4', 'S4', 'G'], cw = Math.min(54, (w - 20) / 5 - 14), gap = (w - 20 - 5 * cw) / 4, y0 = 8, ch = 26;
        const cx = (i) => 10 + i * (cw + gap);
        cells.forEach((c, i) => {
          const on = f && (i === step || i === step + 1);
          G.fillStyle = on ? ctx.mix(C.series[0], C.bg, 0.75) : C.bg; G.fillRect(cx(i), y0, cw, ch);
          G.strokeStyle = on ? C.series[0] : C.rule; G.lineWidth = on ? 2 : 1; G.strokeRect(cx(i), y0, cw, ch);
          G.fillStyle = C.ink; G.textAlign = 'center'; G.textBaseline = 'middle'; G.fillText(c, cx(i) + cw / 2, y0 + ch / 2);
          if (i < 4) {
            const ax = cx(i) + cw + 2, bx = cx(i + 1) - 2, ay = y0 + ch / 2;
            G.strokeStyle = i <= step ? C.ink : C.muted; G.lineWidth = 1; G.beginPath(); G.moveTo(ax, ay); G.lineTo(bx, ay); G.lineTo(bx - 4, ay - 3); G.moveTo(bx, ay); G.lineTo(bx - 4, ay + 3); G.stroke();
            G.textBaseline = 'top'; G.fillStyle = i <= step ? (frames[i].delta >= 0 ? C.series[3] : C.series[2]) : C.muted;
            G.fillText(i <= step ? `δ${'₀₁₂₃'[i]}=${fmt(frames[i].delta, 3)}` : `δ${'₀₁₂₃'[i]}`, (ax + bx) / 2, y0 + ch + 4);
          }
        });
        // 迹
        const top = y0 + ch + 30, rowH = (h - top - 22) / 2, Vw = Math.max(70, w * 0.22), tl = 34, tr = w - Vw - 18;
        const emax = Math.max(3, 1 / (1 - GAMMA * lam + 1e-9) > 3 ? 1 / (1 - GAMMA * lam) : 3), Xe = (x) => tl + (x / Math.min(emax, 10)) * (tr - tl);
        G.textAlign = 'left'; G.textBaseline = 'bottom'; G.fillStyle = C.muted; G.fillText(`迹 e（按访问分段；γλ = ${fmt(GAMMA * lam, 2)}）`, tl, top - 2);
        G.textAlign = 'right'; G.fillText('估值 V', w - 6, top - 2);
        for (let i = 0; i < 2; i++) {
          const yy = top + i * rowH + 4, bh = Math.min(24, rowH - 18);
          G.fillStyle = C.ink; G.textAlign = 'left'; G.textBaseline = 'middle'; G.fillText(NAMES[i], 2, yy + bh / 2);
          G.strokeStyle = C.line; G.strokeRect(tl, yy, tr - tl, bh);
          for (let u = 1; u < Math.min(emax, 10); u++) { G.fillStyle = C.line; G.fillRect(Xe(u), yy + bh, 1, 4); }
          if (f) {
            let x = 0;
            f.comps.forEach((c, k) => {
              if (S[k] !== i || c <= 0) return;
              G.fillStyle = ctx.mix(visitCol(C, k), C.bg, k === step ? 0.1 : 0.4); G.fillRect(Xe(x), yy, Xe(x + c) - Xe(x), bh);
              G.strokeStyle = C.bg; G.strokeRect(Xe(x), yy, Xe(x + c) - Xe(x), bh); x += c;
            });
            G.fillStyle = C.ink; G.textAlign = 'left'; G.textBaseline = 'top'; G.fillText(`e = ${fmt(f.e[i], 4)}`, tl, yy + bh + 3);
          }
          // 估值
          const vx0 = w - Vw - 4, Xv = (v) => vx0 + v * Vw, cur = f ? f.V[i] : V0[i];
          G.strokeStyle = C.line; G.strokeRect(vx0, yy, Vw, bh);
          G.fillStyle = ctx.mix(C.series[1], C.bg, 0.4); G.fillRect(vx0, yy, Math.max(0, Math.min(1, cur)) * Vw, bh);
          G.fillStyle = C.muted; G.fillRect(Xv(V0[i]), yy - 3, 1.5, bh + 6);
          G.fillStyle = C.ink; G.textAlign = 'right'; G.textBaseline = 'top'; G.fillText(fmt(cur, 4), w - 4, yy + bh + 3);
        }
        G.fillStyle = C.muted; G.textAlign = 'left'; G.textBaseline = 'bottom';
        G.fillText(mode === 'offline' && step < T - 1 ? '冻结表：回合末才写入估值' : (f ? `第 ${step} 步之后` : '回合开始前'), tl, h - 2);
      },
    });
    /* 贡献表：行 = 访问 k，列 = 误差 δ_t；格里是迹分量 × δ_t */
    ctx.canvas({
      aspect: 0.42, maxHeight: 230, minHeight: 190, label: '贡献表：每次访问从每个误差分到的量，行和是前向视角，按状态的列和是后向视角',
      draw(G, w, h) {
        const C = ctx.colors(), M = contrib(frames), fs = w < 420 ? 9.5 : 11; G.font = ctx.font(fs);
        const lw = Math.min(64, w * 0.15), cols = 5, cw = (w - lw - 4) / cols, rh = (h - 4) / 7;
        const head = ['δ₀', 'δ₁', 'δ₂', 'δ₃', '行和'], rows = ['k=0 S7', 'k=1 S4', 'k=2 S4', 'k=3 S4', '列和 S7', '列和 S4'];
        G.textAlign = 'center'; G.textBaseline = 'middle';
        head.forEach((t, j) => { G.fillStyle = j === step ? C.ink : C.muted; G.fillText(t, lw + (j + 0.5) * cw, rh / 2); });
        const vmax = 0.6, cell = (x, y, val, bold) => {
          if (val == null) return;
          const a = Math.min(1, Math.abs(val) / vmax);
          G.fillStyle = ctx.mix(val >= 0 ? C.series[3] : C.series[2], C.bg, 1 - 0.55 * a); G.fillRect(x + 1, y + 1, cw - 2, rh - 2);
          G.fillStyle = C.ink; G.font = ctx.font(fs, bold ? 600 : 400); G.fillText(fmt(val, 4), x + cw / 2, y + rh / 2); G.font = ctx.font(fs);
        };
        rows.forEach((name, r) => {
          const y = (r + 1) * rh + (r >= 4 ? 4 : 0);
          G.fillStyle = C.ink; G.textAlign = 'left'; G.fillText(name, 2, y + rh / 2); G.textAlign = 'center';
          for (let t = 0; t < T; t++) {
            if (t > step) { if (r < 4 ? t >= r : true) { G.strokeStyle = C.line; G.strokeRect(lw + t * cw + 1, y + 1, cw - 2, rh - 2); } continue; }
            if (r < 4) cell(lw + t * cw, y, M[r][t], false);
            else { const s = r - 4; let sum = 0, any = false; for (let k = 0; k <= t; k++) if (S[k] === s) { sum += M[k][t]; any = true; } cell(lw + t * cw, y, any ? sum : 0, false); }
          }
          if (r < 4 && step >= r) { let sum = 0; for (let t = r; t <= step; t++) sum += M[r][t]; cell(lw + 4 * cw, y, sum, step === T - 1); }
        });
        if (step >= 0) { G.strokeStyle = C.series[1]; G.lineWidth = 2; G.strokeRect(lw + step * cw, rh, cw, 6 * rh + 4); G.lineWidth = 1; }
        G.strokeStyle = C.rule; G.beginPath(); G.moveTo(0, 5 * rh + 2); G.lineTo(w, 5 * rh + 2); G.stroke();
      },
    });
    ctx.stage.append(ctx.legend([['var(--d1)', 'S7 那次访问'], ['var(--d4)', 'S4 第 1 次'], ['var(--d5)', 'S4 第 2 次'], ['var(--d2)', 'S4 第 3 次'], ['var(--d3)', '贡献表：负值红、正值青；金框为当前一步']]), read, st.node);

    function upd() { ctx.redraw(); show(); }
    function show() {
      const off = run('offline', alpha, lam), on = run('online', alpha, lam), tr = run('trueOnline', alpha, lam), last = (fs) => fs[T - 1].V;
      const M = contrib(frames), rowSum = M.map((row) => row.reduce((s, x) => s + (x || 0), 0));
      const fwd = [alpha * rowSum[0], alpha * (rowSum[1] + rowSum[2] + rowSum[3])];
      read.innerHTML = `回合末 S4：冻结表 <b>${fmt(last(off)[1], 6)}</b>，每步写入 <b>${fmt(last(on)[1], 6)}</b>，真在线 <b>${fmt(last(tr)[1], 6)}</b>（α = ${fmt(alpha, 2)}，λ = ${fmt(lam, 2)}）` +
        (step === T - 1 && mode !== 'trueOnline'
          ? `<br>行和 × α（前向）：S7 ${fmt(fwd[0], 6)}，S4 ${fmt(fwd[1], 6)}；累计写入（后向）：S7 ${fmt(frames[T - 1].cum[0], 6)}，S4 ${fmt(frames[T - 1].cum[1], 6)}` +
            (mode === 'offline' ? '，两者相同' : '；每步写入时表里各列的 δ 读到改过的表，前向的 λ-回报却仍按冻结表算，两者不必相等')
          : '');
      if (step < 0) { st.set([['回合开始前：迹清零，表为初值', { html: ctx.m('e = (0, 0)，V = (.4, .5)') }]], '计算过程　按“下一步”逐步看'); return; }
      const f = frames[step], gl = GAMMA * lam, s = f.s, o = 1 - s, lines = [];
      const rd = mode === 'offline' ? 'V_0' : `V_${step}`;
      lines.push([`TD 误差：$δ_t = R_{t+1} + γ V(S_{t+1}) − V(S_t)$，读 $${rd}$`, { html: ctx.m(`${f.r} + .9 × ${f.s2 < 0 ? '0（终点）' : fmt(f.v2, 4)} − ${fmt(f.v, 4)} = `) + `<b>${fmt(f.delta, 6)}</b>` }]);
      if (mode === 'trueOnline') lines.push([`Dutch 迹：被访问的 ${NAMES[s]} 旧迹乘 $(1−α)γλ$ 再加 1，另一格乘 $γλ$`, { html: ctx.m(`e(${NAMES[s]}) = ${fmt(1 - alpha, 2)} × ${fmt(gl, 2)} × ${fmt(f.ePrev[s], 4)} + 1 = `) + `<b>${fmt(f.e[s], 6)}</b>` + ctx.m(`，e(${NAMES[o]}) = ${fmt(gl, 2)} × ${fmt(f.ePrev[o], 4)} = `) + `<b>${fmt(f.e[o], 6)}</b>` }]);
      else lines.push([`累积迹：两格乘 $γλ$，当前状态 ${NAMES[s]} 再加 1`, { html: ctx.m(`e(${NAMES[s]}) = ${fmt(gl, 2)} × ${fmt(f.ePrev[s], 4)} + 1 = `) + `<b>${fmt(f.e[s], 6)}</b>` + ctx.m(`，e(${NAMES[o]}) = ${fmt(gl, 2)} × ${fmt(f.ePrev[o], 4)} = `) + `<b>${fmt(f.e[o], 6)}</b>` }]);
      lines.push(['本步 $αδ_t e_t$', { html: ctx.m(`${fmt(alpha, 2)} × ${fmt(f.delta, 4)} × (${fmt(f.e[0], 4)}, ${fmt(f.e[1], 4)}) = `) + `<b>(${fmt(f.inc[0], 6)}, ${fmt(f.inc[1], 6)})</b>` }]);
      if (mode === 'trueOnline') lines.push(['预测修正：$α(v − v_{old})(e − x)$，$v_{old}$ 是上一步读到的后继预测', { html: ctx.m(`${fmt(alpha, 2)} × (${fmt(f.v, 4)} − ${fmt(f.vOld, 4)}) × (e − x) = `) + `<b>(${fmt(f.corr[0], 6)}, ${fmt(f.corr[1], 6)})</b>` }]);
      lines.push([mode === 'offline' ? '累计 $ΔV$（冻结表：回合末一次加到 $V_0$ 上）' : '写入后的表', mode === 'offline'
        ? { html: ctx.m('ΔV = ') + `<b>(${fmt(f.cum[0], 6)}, ${fmt(f.cum[1], 6)})</b>` + (step === T - 1 ? ctx.m('，V = ') + `<b>(${fmt(f.V[0], 6)}, ${fmt(f.V[1], 6)})</b>` : '') }
        : { html: ctx.m(`V = (${fmt(f.before[0], 4)}, ${fmt(f.before[1], 4)}) + 改动 = `) + `<b>(${fmt(f.V[0], 6)}, ${fmt(f.V[1], 6)})</b>` }]);
      st.set(lines, `计算过程　第 ${step} 步 ${NAMES[s]} → ${f.s2 < 0 ? 'G' : NAMES[f.s2]}，${MODES.find((m) => m[0] === mode)[1]}`);
    }
    show();
  });
})();
