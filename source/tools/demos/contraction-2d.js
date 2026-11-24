/* 第 4 章：Bellman 算子的 γ-收缩（4.2 节）画在 (V(S4), V(S7)) 平面上。π₀ 下 S4 与 S7 只互相引用，
 * 两格的期望算子 T_π 是全表算子的精确一块；T_* 时其余格取最优值（S6 = γ⁴），S4、S7 两格取最大。
 * 撒一片初始表，逐次施加算子：以不动点为中心的 ∞-范数正方形每步缩为 γ 倍，读数给出 ‖TU−TV‖∞ 与 γ‖U−V‖∞。 */
(() => {
  /* 一步期望 q(s,a)，动作次序 上、右、下、左；V = [V(S4), V(S7)]。 */
  function qs([x, y], g) {
    return {
      S4: [0.1 * 1 + 0.9 * g * x, g * x, 0.1 * g * y + 0.9 * g * x, g * x],
      S7: [g * x, g * y, g * y, g * g ** 4],
    };
  }
  const Tpi = ([x], g) => [0.1 + 0.9 * g * x, g * x];
  const Tstar = (v, g) => { const q = qs(v, g); return [Math.max(...q.S4), Math.max(...q.S7)]; };
  const apply = (mode, v, g) => (mode === 'pi' ? Tpi(v, g) : Tstar(v, g));
  const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  function fixed(mode, g) {
    let v = [0, 0];
    for (let k = 0; k < 100000; k++) {
      const w = apply(mode, v, g);
      if (dist(w, v) < 1e-15) return w;
      v = w;
    }
    return v;
  }
  /* 从零表出发同步代入 n 轮：返回每轮的误差 ‖V_k − v‖∞ 与改变量 ‖V_k − V_{k−1}‖∞。 */
  function fromZero(mode, g, n) {
    const vs = fixed(mode, g), out = [];
    let v = [0, 0];
    for (let k = 1; k <= n; k++) {
      const w = apply(mode, v, g);
      out.push({ k, err: dist(w, vs), change: dist(w, v) });
      v = w;
    }
    return out;
  }
  const model = { qs, Tpi, Tstar, apply, dist, fixed, fromZero };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('contraction-2d', (ctx) => {
    const { el, fmt } = ctx;
    const LO = -0.5, HI = 1.5, NPTS = 40;
    let mode = ctx.root.dataset.mode === 'star' ? 'star' : 'pi', gamma = 0.9, seed = 1;
    let cloud, U, V, k, hist, vstar, last = null, anim = null, prevU = null;
    const d3 = (x) => fmt(x, 3).replace(/^(−?)0\./, '$1.');
    const gs = () => String(+gamma.toFixed(2)).replace(/^0\./, '.');

    function scatter(keepUV) {
      const r = ctx.rng(seed);
      cloud = Array.from({ length: NPTS }, () => [LO + 0.1 + r() * (HI - LO - 0.2), LO + 0.1 + r() * (HI - LO - 0.2)]);
      if (!keepUV) { U = [LO + 0.1 + r() * 0.6, 1.1 + r() * 0.3]; V = [1.0 + r() * 0.35, LO + 0.15 + r() * 0.5]; }
      restart();
    }
    function restart() {
      vstar = fixed(mode, gamma); k = 0; last = null; prevU = null; anim = null;
      const r0 = Math.max(...cloud.concat([U, V]).map((p) => dist(p, vstar)));
      hist = [{ k: 0, r: r0, uv: dist(U, V), r0 }];
      ctx.redraw(); show();
    }
    function step() {
      const from = { cloud: cloud.map((p) => p.slice()), U: U.slice(), V: V.slice() };
      const TU = apply(mode, U, gamma), TV = apply(mode, V, gamma);
      last = { before: dist(U, V), after: dist(TU, TV) };
      prevU = U;
      cloud = cloud.map((p) => apply(mode, p, gamma)); U = TU; V = TV; k += 1;
      hist.push({ k, r: Math.max(...cloud.concat([U, V]).map((p) => dist(p, vstar))), uv: dist(U, V), r0: hist[0].r0 });
      if (hist.length > 61) hist.splice(1, 1);
      anim = ctx.reduced() ? null : { from, t: 0 };
      if (anim) tween.start();
      ctx.redraw(); show();
    }
    const tween = ctx.loop((dt) => {
      if (!anim) return false;
      anim.t += dt / 0.45;
      if (anim.t >= 1) { anim = null; ctx.redraw(); return false; }
      ctx.redraw();
      return true;
    });
    let acc = 0;
    const auto = ctx.loop((dt) => {
      acc += dt;
      if (acc < (ctx.reduced() ? 1.2 : 0.75)) return true;
      acc = 0;
      if (k >= 40 || hist[hist.length - 1].r < 1e-4) return false;
      step();
      return true;
    });
    const autoBtn = ctx.button('连续', () => (auto.running ? auto.stop() : (acc = 1, auto.start())));
    const _start = auto.start;
    auto.start = () => { autoBtn.textContent = '暂停'; _start(); };
    auto.onstop = () => { autoBtn.textContent = '连续'; };

    const stepBtn = ctx.button('施加 T 一次', () => { auto.stop(); step(); }, true);
    const reBtn = ctx.button('重撒', () => { auto.stop(); seed += 1; scatter(false); });
    const zeroBtn = ctx.button('U 取零表、V 取不动点', () => { auto.stop(); U = [0, 0]; V = fixed(mode, gamma).slice(); restart(); });
    const modeSeg = ctx.segmented([['pi', 'Tπ（π₀）'], ['star', 'T*']], mode, (v) => { mode = v; auto.stop(); restart(); }, '算子');
    const gSl = ctx.slider({ label: 'γ', min: 0.5, max: 0.99, step: 0.01, value: gamma, format: (x) => x.toFixed(2),
      oninput: (x) => { gamma = x; auto.stop(); restart(); } });
    const read = ctx.readout();
    const st = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(
      ctx.row(modeSeg.node, gSl.node),
      ctx.row(stepBtn, autoBtn, reBtn, zeroBtn),
      el('div', { class: 'demo-grid2' }, left, right),
      read, st.node,
    );

    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const ease = (t) => 1 - (1 - t) ** 3;
    let view = null;
    const plane = ctx.canvas({
      parent: left, aspect: 1, maxHeight: 400, minHeight: 280,
      label: '价值平面：横轴 V(S4)，纵轴 V(S7)；灰点是初始表，虚线正方形以不动点为中心，半径每步乘 γ',
      draw(G, w, h) {
        const C = ctx.colors(), pad = { l: 46, r: 14, t: 10, b: 36 };
        const side = Math.min(w - pad.l - pad.r, h - pad.t - pad.b);
        const ox = pad.l + (w - pad.l - pad.r - side) / 2, oy = pad.t;
        const X = (x) => ox + ((x - LO) / (HI - LO)) * side, Y = (y) => oy + (1 - (y - LO) / (HI - LO)) * side;
        view = { X, Y, side, ox, oy };
        const t = anim ? ease(Math.min(1, anim.t)) : 1;
        const P = (p, i, key) => (anim ? lerp(key === 'c' ? anim.from.cloud[i] : anim.from[key], p, t) : p);
        // 网格与坐标
        G.lineWidth = 1; G.strokeStyle = C.line; G.fillStyle = C.muted; G.font = ctx.font(11);
        for (const [v, t] of [[-0.5, '−.5'], [0, '0'], [0.5, '.5'], [1, '1'], [1.5, '1.5']]) {
          G.beginPath(); G.moveTo(X(v), oy); G.lineTo(X(v), oy + side); G.stroke();
          G.beginPath(); G.moveTo(ox, Y(v)); G.lineTo(ox + side, Y(v)); G.stroke();
          G.textAlign = 'center'; G.textBaseline = 'top'; G.fillText(t, X(v), oy + side + 4);
          G.textAlign = 'right'; G.textBaseline = 'middle'; G.fillText(t, ox - 4, Y(v));
        }
        G.strokeStyle = C.rule; G.strokeRect(ox, oy, side, side);
        G.fillStyle = C.soft; G.textAlign = 'center'; G.textBaseline = 'bottom';
        G.fillText('V(S4)', ox + side / 2, oy + side + 32);
        G.save(); G.translate(10, oy + side / 2); G.rotate(-Math.PI / 2); G.textBaseline = 'middle'; G.fillText('V(S7)', 0, 0); G.restore();
        G.save(); G.beginPath(); G.rect(ox, oy, side, side); G.clip();
        // ∞-范数正方形：上一步（淡）与当前 γ^k r₀
        const r0 = hist[0].r0, sq = (r, col, dash, lw) => {
          G.save(); G.setLineDash(dash); G.strokeStyle = col; G.lineWidth = lw;
          G.strokeRect(X(vstar[0] - r), Y(vstar[1] + r), X(vstar[0] + r) - X(vstar[0] - r), Y(vstar[1] - r) - Y(vstar[1] + r)); G.restore();
        };
        const rk = r0 * gamma ** k, rprev = r0 * gamma ** Math.max(0, k - 1);
        if (k > 0) sq(anim ? rprev + (rk - rprev) * t : rk, C.accent, [6, 4], 1.8);
        if (k > 0) sq(rprev, ctx.mix(C.bg, C.accent, 0.35), [3, 4], 1);
        if (k === 0) sq(r0, C.accent, [6, 4], 1.8);
        // 点云
        G.fillStyle = ctx.mix(C.bg, C.ink, 0.45);
        cloud.forEach((p, i) => { const q = P(p, i, 'c'); G.beginPath(); G.arc(X(q[0]), Y(q[1]), 2.6, 0, 7); G.fill(); });
        // U、V 及其张成的矩形（长边即 ‖U−V‖∞）
        const u = P(U, 0, 'U'), v = P(V, 0, 'V');
        const wx = Math.abs(u[0] - v[0]), wy = Math.abs(u[1] - v[1]);
        G.save(); G.setLineDash([2, 3]); G.strokeStyle = C.soft; G.lineWidth = 1;
        G.strokeRect(Math.min(X(u[0]), X(v[0])), Math.min(Y(u[1]), Y(v[1])), Math.abs(X(u[0]) - X(v[0])), Math.abs(Y(u[1]) - Y(v[1]))); G.restore();
        G.strokeStyle = C.ink; G.lineWidth = 2.2; G.beginPath();
        if (wx >= wy) { G.moveTo(X(u[0]), Y(v[1])); G.lineTo(X(v[0]), Y(v[1])); } else { G.moveTo(X(u[0]), Y(u[1])); G.lineTo(X(u[0]), Y(v[1])); }
        G.stroke();
        G.restore();
        // 不动点
        G.strokeStyle = C.ink; G.lineWidth = 2;
        const fx = X(vstar[0]), fy = Y(vstar[1]);
        G.beginPath(); G.moveTo(fx - 6, fy - 6); G.lineTo(fx + 6, fy + 6); G.moveTo(fx + 6, fy - 6); G.lineTo(fx - 6, fy + 6); G.stroke();
        G.fillStyle = C.ink; G.textAlign = 'left'; G.textBaseline = 'alphabetic';
        G.font = ctx.font(14, 600); G.fillText('v', fx + 7, fy - 6);
        G.font = ctx.font(10, 600); G.fillText(mode === 'pi' ? 'π₀' : '*', fx + 7 + 8, fy - 2);
        const dot = (p, col, name) => {
          G.fillStyle = col; G.beginPath(); G.arc(X(p[0]), Y(p[1]), 6.5, 0, 7); G.fill();
          G.strokeStyle = C.bg; G.lineWidth = 1.5; G.stroke();
          G.fillStyle = col; G.font = ctx.font(13, 700); G.textAlign = 'left'; G.textBaseline = 'middle';
          G.fillText(name, X(p[0]) + 9, Y(p[1]) - 9);
        };
        dot(u, C.series[1], 'U'); dot(v, C.series[3], 'V');
      },
    });
    // 拖动 U、V
    let drag = null;
    const pos = (e) => { const r = plane.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const inv = ([px, py]) => {
      const { ox, oy, side } = view;
      const c = (z) => Math.max(LO, Math.min(HI, z));
      return [c(LO + ((px - ox) / side) * (HI - LO)), c(LO + (1 - (py - oy) / side) * (HI - LO))];
    };
    plane.cv.addEventListener('pointerdown', (e) => {
      if (!view) return;
      const [px, py] = pos(e);
      const near = (p) => Math.hypot(view.X(p[0]) - px, view.Y(p[1]) - py) < 16;
      drag = near(U) ? 'U' : near(V) ? 'V' : null;
      if (drag) { auto.stop(); plane.cv.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    plane.cv.addEventListener('pointermove', (e) => {
      if (!view) return;
      const [px, py] = pos(e);
      if (!drag) { const near = (p) => Math.hypot(view.X(p[0]) - px, view.Y(p[1]) - py) < 16; plane.cv.style.cursor = near(U) || near(V) ? 'grab' : 'default'; return; }
      const p = inv([px, py]);
      if (drag === 'U') U = p; else V = p;
      restart();
    });
    const endDrag = () => { drag = null; };
    plane.cv.addEventListener('pointerup', endDrag);
    plane.cv.addEventListener('pointercancel', endDrag);
    plane.cv.style.touchAction = 'none';

    ctx.canvas({
      parent: right, aspect: 0.8, maxHeight: 380, minHeight: 210,
      label: '半对数图：横轴是施加次数 k，纵轴是最大差的常用对数；实线是点云离不动点的最远距离与 ‖U−V‖∞，虚线是 γ^k r₀',
      draw(G, w, h) {
        const C = ctx.colors(), K = Math.max(12, k);
        const L = (x) => Math.log10(Math.max(x, 1e-12));
        const r0 = hist[0].r0;
        const ref = Array.from({ length: K + 1 }, (_, i) => [i, L(r0 * gamma ** i)]);
        const lo = Math.min(-3, ...hist.map((p) => L(p.uv)), L(r0 * gamma ** K)) - 0.1;
        ctx.plot(G, w, h, {
          series: [
            { data: ref, color: C.muted, dash: [5, 4], width: 1.5 },
            { data: hist.map((p) => [p.k, L(p.r)]), color: C.accent, width: 2.2 },
            { data: hist.map((p) => [p.k, L(p.uv)]), color: C.series[1], width: 1.8 },
          ],
          xmin: 0, xmax: K, ymin: Math.max(lo, -12), ymax: Math.max(0.3, L(r0) + 0.15),
          xlabel: '施加次数 k', ylabel: 'log₁₀ 最大差', pad: { l: 42 },
        });
      },
    });
    const legend = ctx.legend([['var(--d1)', '点云离不动点最远'], ['var(--d2)', '‖U − V‖∞'], ['var(--muted)', 'γᵏr₀（虚线）']]);
    right.append(legend);

    const mm = (t) => t.split(/(S\d)/).map((x, i) => (i % 2 ? x : ctx.m(x))).join('');
    const B = (x) => `<b>${d3(x)}</b>`;
    function show() {
      const D = dist(U, V), TU = apply(mode, U, gamma), TV = apply(mode, V, gamma), DT = dist(TU, TV);
      const h = hist[hist.length - 1];
      let s = `k = ${k}　点云离不动点最远 <b>${d3(h.r)}</b>，γ<sup>k</sup>r<sub>0</sub> = <b>${d3(h.r0 * gamma ** k)}</b>`;
      if (last) s += `<br>上一次：‖U − V‖<sub>∞</sub> 由 ${d3(last.before)} 变为 <b>${d3(last.after)}</b>，γ × ${d3(last.before)} = <b>${d3(gamma * last.before)}</b>，比值 ${(last.after / Math.max(last.before, 1e-300)).toFixed(3)}`;
      if (prevU) {
        const ch = dist(U, prevU), err = dist(U, vstar);
        s += `<br>U 的轨迹：误差 ‖U − ${mode === 'pi' ? 'v<sub>π</sub>' : 'v<sub>*</sub>'}‖<sub>∞</sub> = <b>${fmt(err, 4)}</b>，改变量 <b>${fmt(ch, 4)}</b>，界 γ/(1−γ)×改变量 = <b>${fmt(gamma / (1 - gamma) * ch, 4)}</b>`;
      }
      read.innerHTML = s;
      const [u4, u7] = U, [v4, v7] = V, g = gs();
      const lines = [];
      if (mode === 'pi') {
        lines.push(['一般式', '(T_π V)(s) = Σ_a π(a|s) Σ_{s′,r} p(s′,r|s,a)[r + γV(s′)]']);
        lines.push(['S4 向上：.1 进 G 得 1，.9 打滑留在 S4', { html: mm(`(T_π U)(S4) = .1·(1 + ${g}·0) + .9·(0 + ${g}·${d3(u4)}) = `) + d3(TU[0]) }]);
        lines.push(['S7 向上一步到 S4', { html: mm(`(T_π U)(S7) = 1·(0 + ${g}·${d3(u4)}) = `) + d3(TU[1]) }]);
        lines.push(['$V$ 同理', { html: mm(`(T_π V)(S4) = ${d3(TV[0])}，(T_π V)(S7) = ${d3(TV[1])}`) }]);
        const a4 = Math.abs(TU[0] - TV[0]), a7 = Math.abs(TU[1] - TV[1]), d4 = u4 - v4;
        lines.push(['① S4 一行，奖励相消（G 两边都为 0）', { html: mm(`|(T_π U)(S4) − (T_π V)(S4)| = ${g}·|.1·0 + .9·(${d3(d4)})| = `) + d3(a4) }]);
        lines.push(['② 权重非负，③ 权重和为 1', { html: mm(`≤ ${g}·(.1·0 + .9·${d3(Math.abs(d4))}) ≤ ${g}·‖U − V‖_∞ = ${g}·${d3(D)} = `) + d3(gamma * D) }]);
        lines.push(['S7 一行只有一个后继', { html: mm(`|(T_π U)(S7) − (T_π V)(S7)| = ${g}·|${d3(d4)}| = ${d3(a7)} ≤ ${d3(gamma * D)}`) }]);
        lines.push(['合起来', { html: mm(`‖T_π U − T_π V‖_∞ = max{${d3(a4)}, ${d3(a7)}} = `) + B(DT) + mm(` ≤ γ‖U − V‖_∞ = `) + B(gamma * D) }]);
      } else {
        const qU = qs(U, gamma), qV = qs(V, gamma), L4 = (q) => q.map(d3).join(', ');
        lines.push(['一般式', '(T_* V)(s) = max_a Σ_{s′,r} p(s′,r|s,a)[r + γV(s′)]']);
        lines.push(['其余格取最优值，S6 为 $γ^4$，S7 向左一枝为 $γ^5$']);
        for (const [s, i] of [['S4', 0], ['S7', 1]]) {
          lines.push([`${s} 四个动作（上、右、下、左）`, { html: mm(`(T_* U)(${s}) = max{${L4(qU[s])}} = ${d3(TU[i])}`) }]);
          lines.push(['', { html: mm(`(T_* V)(${s}) = max{${L4(qV[s])}} = ${d3(TV[i])}`) }]);
        }
        lines.push(['两个最大值之差不超过逐动作差的最大值，每个动作的差再按 ①②③ 不超过 $γ‖U − V‖_∞$']);
        const row = (s, i) => {
          const a = Math.abs(TU[i] - TV[i]), b = Math.max(...qU[s].map((x, j) => Math.abs(x - qV[s][j])));
          lines.push([`${s} 一行`, { html: mm(`|(T_* U)(${s}) − (T_* V)(${s})| = ${d3(a)}`) }]);
          lines.push(['', { html: mm(`≤ max_a |q_U(${s},a) − q_V(${s},a)| = ${d3(b)} ≤ ${g}·${d3(D)} = ${d3(gamma * D)}`) }]);
          return a;
        };
        const a4 = row('S4', 0), a7 = row('S7', 1);
        lines.push(['合起来', { html: mm(`‖T_* U − T_* V‖_∞ = max{${d3(a4)}, ${d3(a7)}} = `) + B(DT) + mm(` ≤ γ‖U − V‖_∞ = `) + B(gamma * D) }]);
      }
      st.set(lines, `计算过程　下一次施加 ${mode === 'pi' ? 'Tπ' : 'T*'}，U = (${d3(u4)}, ${d3(u7)})，V = (${d3(v4)}, ${d3(v7)})，γ = ${gamma.toFixed(2)}`);
    }
    scatter(false);
  });
})();
