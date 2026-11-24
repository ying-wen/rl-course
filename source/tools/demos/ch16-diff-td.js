/* 第 16 章：差分 TD 在总向左的仓库上逐步运行，画出差分价值表与奖励率估计 R̄ 怎样一起被同一个 δ 改写。
 * 对应 16.5 节“差分 TD 更新”：七个状态 B、D_L、D_R、J_L、J_R、W、C，率 r(π)=5/8，真值 ṽ（取 ṽ(B)=0）；
 * 正文算例“仓库上的一步”（Ṽ(D_R)=0、Ṽ(J_R)=−1、R̄=1/2、α=1/4、ι=1/2 → δ=−3/2、Ṽ(D_R)=−3/8、R̄=5/16），
 * 不动点上八步中六步 δ=0、B→D_L 与 B→D_R 为 ±17/8，以及收敛定理里的不变量 R̄ − ι·1ᵀṼ。 */
(() => {
  const NAMES = ['B', 'D_L', 'D_R', 'J_L', 'J_R', 'W', 'C'];
  const B = 0, DL = 1, DR = 2, JL = 3, JR = 4, W = 5, C = 6;
  const TRUE_V = [0, 11 / 4, -3 / 2, 27 / 8, -7 / 8, -1 / 4, -5 / 8];
  const RATE = 5 / 8;
  const model = {
    NAMES, TRUE_V, RATE, B, DL, DR, JL, JR, W, C,
    /* 总向左：B 处的指示左右各半（u 为 [0,1) 的随机数）；其余各步确定。返回 [奖励, 后继]。 */
    step(z, u) {
      switch (z) {
        case B: return [0, u < 0.5 ? DL : DR];
        case DL: return [0, JL];
        case DR: return [0, JR];
        case JL: return [4, B];
        case JR: return [0, W];
        case W: return [1, C];
        default: return [0, B];
      }
    },
    /* 一次差分 TD 写入：只用写入前的读数算 δ，改出发格与 R̄。 */
    update(st, z, r, z2, alpha, iota) {
      const delta = r - st.R + st.V[z2] - st.V[z];
      const before = { Vz: st.V[z], Vz2: st.V[z2], R: st.R };
      st.V[z] += alpha * delta;
      st.R += iota * alpha * delta;
      return { delta, before };
    },
    invariant(st, iota) { return st.R - iota * st.V.reduce((a, b) => a + b, 0); },
    /* 正文算例的初值。 */
    exampleState() { const V = new Array(7).fill(0); V[JR] = -1; return { V, R: 1 / 2, z: DR }; },
    fixedState() { return { V: TRUE_V.slice(), R: RATE, z: B }; },
    zeroState() { return { V: new Array(7).fill(0), R: 0, z: B }; },
    /* 同一步用折扣 TD(0) 的对照：δ = r + γV(z′) − V(z)，V(z) ← V(z) + αδ。 */
    discounted(Vz, Vz2, r, gamma, alpha) { const d = r + gamma * Vz2 - Vz; return { delta: d, Vz: Vz + alpha * d }; },
    /* 表与真值的差：比较 Ṽ(z) − Ṽ(B) 与 ṽ(z)。 */
    maxErr(V) { let m = 0; for (let i = 0; i < 7; i++) m = Math.max(m, Math.abs(V[i] - V[B] - TRUE_V[i])); return m; },
    /* 连续跑 n 步（测试用）。rand 是 [0,1) 随机数发生器。 */
    run(st, n, alpha, iota, rand, onStep) {
      for (let t = 0; t < n; t++) {
        const [r, z2] = model.step(st.z, rand());
        const res = model.update(st, st.z, r, z2, alpha, iota);
        onStep && onStep(st, res, r, z2);
        st.z = z2;
      }
      return st;
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 3) => {
    if (!Number.isFinite(x)) return '—';
    let s = x.toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s.replace(/^(-?)0\./, '$1.').replace('-', '−');
  };
  /* 分母不超过 64 的数写成分数，其余写小数。 */
  const frac = (x, d = 3) => {
    if (Math.abs(x) < 1e-12) return '0';
    for (let q = 1; q <= 64; q++) {
      const p = Math.round(x * q);
      if (Math.abs(x * q - p) < 1e-9) return q === 1 ? String(p).replace('-', '−') : `${p < 0 ? '−' : ''}${Math.abs(p)}/${q}`;
    }
    return num(x, d);
  };

  RLDemo.register('ch16-diff-td', (ctx) => {
    const { el } = ctx;
    let alpha = 0.1, iota = 0.5, seed = 1, rand = ctx.rng(seed);
    let preset = 'zero', st, t, hist, last, inv0, firstOfExample;

    function reset() {
      st = preset === 'example' ? model.exampleState() : preset === 'fixed' ? model.fixedState() : model.zeroState();
      if (preset === 'example') { alpha = 0.25; iota = 0.5; aS.value = alpha; iS.value = iota; }
      rand = ctx.rng(seed); t = 0; hist = [[0, st.R]]; last = null; inv0 = model.invariant(st, iota);
      firstOfExample = preset === 'example';
    }
    function one() {
      const z = st.z, [r, z2] = model.step(z, rand());
      const res = model.update(st, z, r, z2, alpha, iota);
      last = { z, z2, r, ...res, alpha, iota, t, example: firstOfExample };
      firstOfExample = false;
      st.z = z2; t += 1;
      hist.push([t, st.R]);
      if (hist.length > 4000) hist = hist.filter((_, i) => i % 2 === 0 || i === hist.length - 1);
    }

    const pre = ctx.segmented([['zero', '全零起步'], ['example', '正文的一步'], ['fixed', '从真值出发']], preset, (v) => {
      preset = v; auto.stop(); reset(); update();
    }, '初值');
    const aS = ctx.slider({ label: '价值步长 α', min: 0.01, max: 0.5, step: 0.01, value: alpha, format: (x) => num(x, 2), oninput: (x) => { alpha = x; update(); } });
    const iS = ctx.slider({ label: '步长比 ι', min: 0.05, max: 2, step: 0.05, value: iota, format: (x) => num(x, 2), oninput: (x) => { iota = x; inv0 = model.invariant(st, iota); update(); } });
    const stepBtn = ctx.button('走一步', () => { auto.stop(); one(); update(); }, true);
    const autoBtn = ctx.button('连续', () => (auto.running ? auto.stop() : auto.start()));
    const fastBtn = ctx.button('快进 1000 步', () => { auto.stop(); for (let k = 0; k < 1000; k++) one(); update(); });
    const resetBtn = ctx.button('重来', () => { auto.stop(); seed += 1; reset(); update(); });
    let acc = 0;
    const auto = ctx.loop((dt) => {
      acc += dt;
      const gap = ctx.reduced() ? 0.6 : 0.12;
      if (acc < gap) return true;
      acc = 0; one(); update();
      return true;
    });
    const _start = auto.start;
    auto.start = () => { autoBtn.textContent = '暂停'; acc = 0; _start(); };
    auto.onstop = () => (autoBtn.textContent = '连续');

    const read = ctx.readout();
    const box = ctx.steps('这一步的计算');
    const graphBox = el('div'), plotBox = el('div');
    ctx.stage.append(ctx.row(pre.node), ctx.row(aS.node, iS.node), graphBox, ctx.row(stepBtn, autoBtn, fastBtn, resetBtn), read, plotBox, box.node);

    /* 状态图的位置（按画布宽高的比例）。 */
    const POS = [[0.08, 0.5], [0.3, 0.17], [0.3, 0.83], [0.58, 0.17], [0.58, 0.83], [0.8, 0.83], [0.92, 0.5]];
    const EDGES = [[B, DL, ''], [B, DR, ''], [DL, JL, ''], [DR, JR, ''], [JL, B, '+4'], [JR, W, ''], [W, C, '+1'], [C, B, '']];
    function label(g, name, x, y, px, color) {
      const [b, s] = name.split('_');
      g.fillStyle = color; g.textBaseline = 'middle';
      g.font = ctx.font(px, 600, false);
      const wb = g.measureText(b).width;
      g.font = ctx.font(px * 0.68, 600, false);
      const ws = s ? g.measureText(s).width : 0;
      const x0 = x - (wb + ws) / 2;
      g.textAlign = 'left';
      g.font = ctx.font(px, 600, false); g.fillText(b, x0, y);
      if (s) { g.font = ctx.font(px * 0.68, 600, false); g.fillText(s, x0 + wb, y + px * 0.28); }
    }
    ctx.canvas({
      parent: graphBox, aspect: 0.5, maxHeight: 340, minHeight: 250, label: '总向左的仓库状态图：节点内是学到的 Ṽ(z)−Ṽ(B)，节点外是真值 ṽ(z)',
      draw(g, w, h) {
        const Cc = ctx.colors();
        const R = Math.max(17, Math.min(30, Math.min(w, h) * 0.085));
        const P = POS.map(([a, b]) => [a * w, 24 + b * (h - 48)]);
        // 边
        for (const [a, b, lab] of EDGES) {
          const hot = last && last.z === a && last.z2 === b;
          const [x1, y1] = P[a], [x2, y2] = P[b];
          // J_L→B 画成向下弯的弧，避开 D_L
          const curved = a === JL && b === B;
          const cx = curved ? 0.36 * w : (x1 + x2) / 2, cy = curved ? 24 + 0.47 * (h - 48) : (y1 + y2) / 2;
          let ux = cx - x1, uy = cy - y1, L = Math.hypot(ux, uy); ux /= L; uy /= L;
          let vx = x2 - cx, vy = y2 - cy; L = Math.hypot(vx, vy); vx /= L; vy /= L;
          const sx = x1 + ux * R, sy = y1 + uy * R, ex = x2 - vx * (R + 2), ey = y2 - vy * (R + 2);
          g.strokeStyle = hot ? Cc.series[2] : Cc.rule; g.fillStyle = g.strokeStyle; g.lineWidth = hot ? 2.6 : 1.3;
          g.beginPath(); g.moveTo(sx, sy);
          if (curved) g.quadraticCurveTo(cx, cy, ex, ey); else g.lineTo(ex, ey);
          g.stroke();
          g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - vx * 8 - vy * 4, ey - vy * 8 + vx * 4); g.lineTo(ex - vx * 8 + vy * 4, ey - vy * 8 - vx * 4); g.closePath(); g.fill();
          const mx = curved ? 0.25 * sx + 0.5 * cx + 0.25 * ex : (sx + ex) / 2, my = curved ? 0.25 * sy + 0.5 * cy + 0.25 * ey : (sy + ey) / 2;
          const nx = curved ? 0 : -vy, ny = curved ? 1 : vx;
          if (lab) { g.font = ctx.font(12, 600, true); g.fillStyle = Cc.accent; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, mx + nx * 11, my + ny * 11); }
          if (hot) {
            g.font = ctx.font(12, 700, true); g.textAlign = 'center'; g.textBaseline = 'middle';
            const tx = mx - nx * 16, ty = my - ny * 16;
            const s = 'δ=' + frac(last.delta);
            const tw = g.measureText(s).width + 8;
            g.save(); g.fillStyle = Cc.bg; g.globalAlpha = 0.85; g.fillRect(tx - tw / 2, ty - 9, tw, 18); g.restore();
            g.fillStyle = Cc.series[2]; g.fillText(s, tx, ty);
          }
        }
        // 节点
        for (let i = 0; i < 7; i++) {
          const [x, y] = P[i];
          const learned = st.V[i] - st.V[B], err = Math.abs(learned - TRUE_V[i]);
          g.fillStyle = ctx.mix(Cc.surface || Cc.bg, Cc.warn || Cc.series[3], Math.min(1, err / 3) * 0.7);
          g.strokeStyle = i === st.z ? Cc.series[2] : Cc.rule; g.lineWidth = i === st.z ? 3 : 1.2;
          g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); g.stroke();
          label(g, NAMES[i], x, y - R * 0.3, Math.min(15, R * 0.6), Cc.ink);
          g.font = ctx.font(Math.min(12, R * 0.5), 600, true); g.fillStyle = Cc.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(num(learned, 2), x, y + R * 0.4);
          const below = POS[i][1] > 0.45;
          g.font = ctx.font(11, 400, true); g.fillStyle = Cc.muted; g.textBaseline = below ? 'top' : 'bottom';
          g.fillText('ṽ=' + frac(TRUE_V[i]), x, below ? y + R + 3 : y - R - 3);
        }
      },
    });
    graphBox.append(ctx.legend([['var(--d3)', '当前状态与刚走过的边'], ['var(--warn)', '底色越深，Ṽ(z)−Ṽ(B) 离真值 ṽ(z) 越远']]));

    ctx.canvas({
      parent: plotBox, aspect: 0.3, maxHeight: 210, minHeight: 160, label: '奖励率估计 R̄ 随步数的轨迹，虚线是真率 5/8',
      draw(g, w, h) {
        const Cc = ctx.colors();
        let lo = 0, hi = 1;
        for (const [, y] of hist) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
        ctx.plot(g, w, h, {
          series: [{ data: hist, color: Cc.accent, width: 1.8 }],
          xmin: 0, xmax: Math.max(10, t), ymin: lo, ymax: hi, xlabel: '步数 t', ylabel: 'R̄', yticks: 3, xticks: 4, pad: { l: 48, b: 32 },
          hlines: [{ y: RATE, color: Cc.series[2], label: 'r(π) = 5/8' }],
        });
      },
    });

    /* m() 把 R 排成斜体后，组合上横线会落到标签外；这里改用上划线。 */
    const H = (src, tail = '') => ({ html: ctx.m(src).replace(/<i>R<\/i>\u0304/g, '<i style="text-decoration:overline">R</i>') + tail });
    function update() {
      const err = model.maxErr(st.V), inv = model.invariant(st, iota);
      read.innerHTML = `第 <b>${t}</b> 步　R̄ = <b>${frac(st.R)}</b>（真率 5/8 = .625）` +
        `　max<sub>z</sub>|Ṽ(z)−Ṽ(B)−ṽ(z)| = <b>${num(err, 3)}</b>` +
        `<br>R̄ − ι·1<sup>ᵀ</sup>Ṽ = <b>${frac(inv)}</b>，起点为 ${frac(inv0)}：ι 不变时每次写入都保持它不变。`;
      const L = [];
      if (!last) {
        L.push(['还没有走。一步的误差只读写入前的三个数', H('δ = R - R̄ + Ṽ(z′) - Ṽ(z)')]);
        L.push(['出发格与率用同一个 δ', H('Ṽ(z) ← Ṽ(z) + αδ,　R̄ ← R̄ + ιαδ')]);
      } else {
        const q = last, nz = NAMES[q.z], nz2 = NAMES[q.z2];
        L.push([`第 ${q.t + 1} 步：$${nz}$ → $${nz2}$，奖励 ${q.r}`, null]);
        L.push(['TD 误差', H(`δ = R - R̄ + Ṽ(${nz2}) - Ṽ(${nz}) = ${frac(q.r)} - ${frac(q.before.R)} + (${frac(q.before.Vz2)}) - (${frac(q.before.Vz)}) = `, `<b>${frac(q.delta)}</b>`)]);
        L.push(['写进出发格', { html: ctx.m(`Ṽ(${nz}) ← ${frac(q.before.Vz)} + ${frac(q.alpha)}×(${frac(q.delta)}) = `) + `<b>${frac(q.before.Vz + q.alpha * q.delta)}</b>` }]);
        const newR = q.before.R + q.iota * q.alpha * q.delta;
        L.push(['写进率估计，β = ια', H(`R̄ ← ${frac(q.before.R)} + ${frac(q.iota)}×${frac(q.alpha)}×(${frac(q.delta)}) = `, `<b>${frac(newR)}</b>`)]);
        L.push(['其余表项不动；R̄ 的增量是表项增量的 ι 倍', H(`ΔR̄ = ι·ΔṼ(${nz})`)]);
        if (q.example) {
          const d = model.discounted(q.before.Vz, q.before.Vz2, q.r, 0.9, q.alpha);
          L.push(['对照：同一步用折扣 TD，γ = .9', { html: ctx.m(`δ = 0 + .9×(${frac(q.before.Vz2)}) - ${frac(q.before.Vz)} = ${num(d.delta)},　V(${nz}) ← ${num(d.Vz)}`) }]);
        }
        if (preset === 'fixed' && q.z === B) L.push(['在不动点上，只有回仓后看指示的这一步随机', 'δ = ±17/8，均值 0']);
      }
      box.set(L);
      ctx.redraw();
    }

    reset(); update();
  });
})();
