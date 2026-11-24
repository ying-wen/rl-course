/* 第 3 章：泥地上 Bellman 期望方程与最优方程的一步备份。点一个格子，画出它的备份树（动作、后果、概率、
 * 奖励、叶值），计算过程逐项代入；叶值读线性方程组 (I − γP_π)v = r_π 的精确解（或价值迭代得到的 v_*），
 * 备份结果与解对照。模型同 3.1 节：3×3 网格，中间是墙，S4 泥地以 .9 打滑留在原地，进入 G 得 1。 */
(() => {
  const STATES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
  const POS = { S1: [0, 0], S2: [1, 0], G: [2, 0], S3: [0, 1], S4: [2, 1], S5: [0, 2], S6: [1, 2], S7: [2, 2] };
  const AT = {};
  for (const [s, xy] of Object.entries(POS)) AT[xy.join()] = s;
  const ACTS = [['up', 0, -1, '↑', '上'], ['right', 1, 0, '→', '右'], ['down', 0, 1, '↓', '下'], ['left', -1, 0, '←', '左']];
  const SLIP = 0.9;
  const det = (a) => [0, 1, 2, 3].map((i) => (i === a ? 1 : 0));
  const PI0 = { S1: det(1), S2: det(1), S3: det(0), S4: det(0), S5: det(0), S6: det(3), S7: det(0) };
  const POLICIES = {
    pi0: PI0,
    pi1: { ...PI0, S7: det(3) },
    tilde: { ...PI0, S4: [0.7, 0, 0.3, 0] },
  };

  /* 一步后果 [[p, s′, r], …]；同一 (s′, r) 合并为一枝。 */
  function outcomes(s, a) {
    const [x, y] = POS[s], [, dx, dy] = ACTS[a];
    const nxt = AT[[x + dx, y + dy].join()] || s;
    const raw = s === 'S4' ? [[1 - SLIP, nxt, nxt === 'G' ? 1 : 0], [SLIP, s, 0]] : [[1, nxt, nxt === 'G' ? 1 : 0]];
    const out = [];
    for (const [p, n, r] of raw) {
      const o = out.find((z) => z[1] === n && z[2] === r);
      if (o) o[0] += p; else out.push([p, n, r]);
    }
    return out;
  }
  const val = (V, n) => (n === 'G' ? 0 : V[n]);
  const q = (V, s, a, g) => outcomes(s, a).reduce((acc, [p, n, r]) => acc + p * (r + g * val(V, n)), 0);
  const backup = (V, s, pi, g) => pi[s].reduce((acc, w, a) => acc + (w ? w * q(V, s, a, g) : 0), 0);
  const optBackup = (V, s, g) => Math.max(...ACTS.map((_, a) => q(V, s, a, g)));

  /* 解 (I − γP_π)v = r_π：高斯消元，部分选主元。 */
  function solve(pi, g) {
    const n = STATES.length, idx = Object.fromEntries(STATES.map((s, i) => [s, i]));
    const A = STATES.map(() => new Array(n).fill(0)), b = new Array(n).fill(0);
    STATES.forEach((s, i) => {
      A[i][i] += 1;
      pi[s].forEach((w, a) => {
        if (!w) return;
        for (const [p, nx, r] of outcomes(s, a)) {
          b[i] += w * p * r;
          if (nx !== 'G') A[i][idx[nx]] -= g * w * p;
        }
      });
    });
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
      for (let r = c + 1; r < n; r++) {
        const f = A[r][c] / A[c][c];
        if (!f) continue;
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let t = b[r];
      for (let k = r + 1; k < n; k++) t -= A[r][k] * x[k];
      x[r] = t / A[r][r];
    }
    return Object.fromEntries(STATES.map((s, i) => [s, x[i]]));
  }
  /* v_*：价值迭代到整表差 < 1e-14。 */
  function optimal(g) {
    let V = Object.fromEntries(STATES.map((s) => [s, 0]));
    for (let k = 0; k < 20000; k++) {
      const W = Object.fromEntries(STATES.map((s) => [s, optBackup(V, s, g)]));
      const d = Math.max(...STATES.map((s) => Math.abs(W[s] - V[s])));
      V = W;
      if (d < 1e-14) break;
    }
    return V;
  }
  const residual = (V, f) => Math.max(...STATES.map((s) => Math.abs(f(V, s) - V[s])));
  const model = { STATES, ACTS, POLICIES, outcomes, q, backup, optBackup, solve, optimal, residual };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('mud-bellman', (ctx) => {
    const { el, fmt } = ctx;
    let gamma = 0.9, mode = ctx.root.dataset.mode === 'opt' ? 'opt' : 'eval', preset = 'pi0', sel = 'S4';
    let pi = clonePi(POLICIES.pi0), V;
    function clonePi(p) { return Object.fromEntries(STATES.map((s) => [s, p[s].slice()])); }
    const d3 = (x) => fmt(x, 3).replace(/^(−?)0\./, '$1.');
    const dn = (x) => { const t = String(+x.toFixed(2)); return t.replace(/^0\./, '.'); }; // .9、.7、1

    function recompute() {
      V = mode === 'eval' ? solve(pi, gamma) : optimal(gamma);
      ctx.redraw(); show();
    }

    const modeSeg = ctx.segmented([['eval', '期望方程'], ['opt', '最优方程']], mode, (v) => { mode = v; showPol(); recompute(); }, '方程');
    const polSeg = ctx.segmented([['pi0', 'π₀'], ['pi1', 'π₁（S7 向左）'], ['tilde', 'π̃（S4 上 .7 下 .3）']], preset,
      (v) => { preset = v; pi = clonePi(POLICIES[v]); recompute(); }, '策略');
    const stSeg = ctx.segmented(STATES.map((s) => [s, s]), sel, (v) => { sel = v; ctx.redraw(); show(); }, '选中的格子');
    const actBtn = ctx.button('改动作', () => {
      const cur = pi[sel].indexOf(Math.max(...pi[sel]));
      pi[sel] = det((cur + 1) % 4);
      preset = 'custom'; polSeg.set('custom'); recompute();
    });
    const gs = ctx.slider({ label: 'γ', min: 0.5, max: 0.99, step: 0.01, value: gamma, format: (x) => x.toFixed(2), oninput: (x) => { gamma = x; recompute(); } });
    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const grid = el('div'), tree = el('div');
    const polRow = ctx.row(polSeg.node, actBtn);
    const showPol = () => { polRow.style.display = mode === 'eval' ? '' : 'none'; };
    ctx.stage.append(
      ctx.row(modeSeg.node, gs.node),
      polRow,
      ctx.row(el('span', { class: 'demo-note', text: '选格子' }), stSeg.node),
      el('div', { class: 'demo-grid2' }, grid, tree),
      read,
      stepsBox.node,
    );
    showPol();

    const arrowsOf = (s) => {
      if (mode === 'eval') return ACTS.map((_, a) => a).filter((a) => pi[s][a] > 0);
      const qs = ACTS.map((_, a) => q(V, s, a, gamma)), best = Math.max(...qs);
      return ACTS.map((_, a) => a).filter((a) => qs[a] > best - 1e-12);
    };

    const gc = ctx.canvas({
      parent: grid, aspect: 1, maxHeight: 290, minHeight: 220, label: '泥地网格：格中数字是精确价值，箭头是策略或最优动作',
      draw(G, w, h) {
        const C = ctx.colors(), cs = Math.min(w, h) / 3, ox = (w - 3 * cs) / 2;
        const vmax = Math.max(1e-9, ...STATES.map((s) => V[s]));
        G.textBaseline = 'middle';
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
          const s = AT[[x, y].join()], X = ox + x * cs, Y = y * cs;
          if (!s) { G.fillStyle = ctx.mix(C.bg, C.ink, 0.42); G.fillRect(X + 1, Y + 1, cs - 2, cs - 2); continue; }
          G.fillStyle = s === 'G' ? C.accentSoft : ctx.mix(C.bg, C.accent, 0.08 + 0.5 * Math.max(0, V[s]) / vmax);
          G.fillRect(X + 1, Y + 1, cs - 2, cs - 2);
          if (s === 'S4') { G.strokeStyle = C.series[1]; G.lineWidth = 3; G.strokeRect(X + 6, Y + 6, cs - 12, cs - 12); }
          if (s === sel) { G.save(); G.setLineDash([6, 3]); G.strokeStyle = C.ink; G.lineWidth = 2.5; G.strokeRect(X + 2.5, Y + 2.5, cs - 5, cs - 5); G.restore(); }
          G.fillStyle = C.muted; G.font = ctx.font(cs * 0.11); G.textAlign = 'left';
          G.fillText(s === 'S4' ? 'S4 泥地' : s, X + 10, Y + cs * 0.17);
          G.textAlign = 'center';
          if (s === 'G') { G.fillStyle = C.ink; G.font = ctx.font(cs * 0.2, 600); G.fillText('G  +1', X + cs / 2, Y + cs / 2); continue; }
          G.fillStyle = C.ink; G.font = ctx.font(cs * 0.19, 600, true);
          G.fillText(d3(V[s]), X + cs / 2, Y + cs * 0.5);
          G.fillStyle = mode === 'eval' ? C.series[2] : C.series[0];
          G.font = ctx.font(cs * 0.2, 600);
          G.fillText(arrowsOf(s).map((a) => ACTS[a][3]).join(''), X + cs / 2, Y + cs * 0.8);
        }
        gc.layout = { ox, cs };
      },
    });
    gc.cv.style.cursor = 'pointer';
    gc.cv.addEventListener('click', (e) => {
      if (!gc.layout) return;
      const r = gc.cv.getBoundingClientRect(), { ox, cs } = gc.layout;
      const s = AT[[Math.floor((e.clientX - r.left - ox) / cs), Math.floor((e.clientY - r.top) / cs)].join()];
      if (!s || s === 'G') return;
      sel = s; stSeg.set(s); ctx.redraw(); show();
    });

    /* 备份树：根是选中格，第二层是四个动作（边上 π(a|s)），叶是后果（边上 p，叶下 r + γv(s′)）。 */
    ctx.canvas({
      parent: tree, aspect: 0.8, maxHeight: 290, minHeight: 250, label: '选中格子的一步备份树',
      draw(G, w, h) {
        const C = ctx.colors(), s = sel, col = w / 4;
        const qs = ACTS.map((_, a) => q(V, s, a, gamma)), best = Math.max(...qs);
        const yR = 22, yA = h * 0.36, yL = h * 0.74;
        const tag = (t, x, y, color, px = 11, weight = 400) => {
          G.font = ctx.font(px, weight, true);
          const tw = G.measureText(t).width;
          G.fillStyle = C.surface; G.fillRect(x - tw / 2 - 2, y - px * 0.6, tw + 4, px * 1.2);
          G.fillStyle = color; G.fillText(t, x, y);
        };
        G.textAlign = 'center'; G.textBaseline = 'middle';
        ACTS.forEach((A, a) => {
          const on = mode === 'eval' ? pi[s][a] > 0 : qs[a] > best - 1e-12;
          const faint = mode === 'eval' && !on;
          const cx = col * (a + 0.5);
          G.globalAlpha = faint ? 0.38 : 1;
          G.strokeStyle = on ? C.accent : C.rule; G.lineWidth = on ? 2.2 : 1.2;
          G.beginPath(); G.moveTo(w / 2, yR + 12); G.lineTo(cx, yA - 5); G.stroke();
          const outs = outcomes(s, a);
          outs.forEach(([p, n, r], j) => {
            const lx = cx + (outs.length === 1 ? 0 : (j ? 1 : -1) * Math.min(col * 0.24, 26));
            G.strokeStyle = on ? C.accent : C.rule; G.lineWidth = on ? 1.8 : 1;
            G.beginPath(); G.moveTo(cx, yA + 5); G.lineTo(lx, yL - 11); G.stroke();
            const ty = yA + (yL - yA) * 0.62;
            tag(dn(p), cx + (lx - cx) * 0.62 + (outs.length === 1 ? 9 : 0), ty, C.soft, 10.5);
            if (n === 'G') { G.fillStyle = C.accentSoft; G.fillRect(lx - 10, yL - 10, 20, 20); G.strokeStyle = C.ink; G.lineWidth = 1; G.strokeRect(lx - 10, yL - 10, 20, 20); }
            else { G.fillStyle = C.bg; G.beginPath(); G.arc(lx, yL, 10.5, 0, 7); G.fill(); G.strokeStyle = n === 'S4' ? C.series[1] : C.ink; G.lineWidth = 1.3; G.stroke(); }
            G.fillStyle = C.ink; G.font = ctx.font(9.5, 600); G.fillText(n, lx, yL + 0.5);
            G.font = ctx.font(10.5, 400, true); G.fillStyle = C.soft;
            G.fillText(d3(r + gamma * (n === 'G' ? 0 : V[n])), lx, yL + 21);
            if (r) { G.fillStyle = C.series[1]; G.font = ctx.font(10, 600); G.fillText('r=1', lx, yL + 34); }
          });
          G.fillStyle = on ? C.accent : C.muted; G.beginPath(); G.arc(cx, yA, 5, 0, 7); G.fill();
          G.font = ctx.font(13, 600); G.fillStyle = on ? C.ink : C.muted; G.textAlign = 'right';
          G.fillText(A[3], cx - 8, yA - 1); G.textAlign = 'center';
          tag('q ' + d3(qs[a]), cx, yA + 17, on ? C.ink : C.muted, 10.5, on ? 600 : 400);
          if (mode === 'eval') tag(dn(pi[s][a]), (w / 2 + cx) / 2, (yR + 12 + yA) / 2, on ? C.accent : C.muted, 10.5, 600);
          G.globalAlpha = 1;
        });
        G.fillStyle = C.bg; G.beginPath(); G.arc(w / 2, yR, 12, 0, 7); G.fill();
        G.strokeStyle = C.ink; G.lineWidth = 1.6; G.stroke();
        G.fillStyle = C.ink; G.font = ctx.font(10.5, 600); G.fillText(s, w / 2, yR + 0.5);
        G.textAlign = 'left'; G.font = ctx.font(11); G.fillStyle = C.muted;
        G.fillText(mode === 'eval' ? '边上：π(a|s) 与 p' : '高亮的枝：取最大的动作', 4, h - 9);
      },
    });

    const NAME = ACTS.map((A) => A[4]);
    const g2 = () => dn(gamma);
    function terms(s, a) {
      return outcomes(s, a).map(([p, n, r]) => `${p === 1 ? '' : dn(p) + '·'}(${r} + ${g2()}·${n === 'G' ? '0' : d3(V[n])})`).join(' + ');
    }
    const mm = (t) => t.split(/(S\d|\bG\b)/).map((x, i) => (i % 2 ? x : ctx.m(x))).join('');
    function show() {
      const s = sel, exact = V[s];
      const b = mode === 'eval' ? backup(V, s, pi, gamma) : optBackup(V, s, gamma);
      const res = residual(V, mode === 'eval' ? (T, t) => backup(T, t, pi, gamma) : (T, t) => optBackup(T, t, gamma));
      const vn = mode === 'eval' ? 'v<sub>π</sub>' : 'v<sub>*</sub>';
      read.innerHTML = `备份算出 ${vn}(${s}) = <b>${fmt(b, 6)}</b>　` +
        (mode === 'eval' ? '线性方程组的解' : '价值迭代收敛的表') + ` <b>${fmt(exact, 6)}</b>　` +
        `全表残差 max<sub>s</sub>|${mode === 'eval' ? 'T<sub>π</sub>' : 'T<sub>*</sub>'}v − v| = <b>${res.toExponential(1)}</b>` +
        '<br><span class="demo-note">点格子或上方格名换根；' + (mode === 'eval' ? '“改动作”把选中格改成下一个确定动作。' : '调 γ 看 S7 的最优动作何时由向左变为向上。') + '</span>';
      const lines = [];
      if (mode === 'eval') {
        lines.push(['Bellman 期望方程', 'v_π(s) = Σ_a π(a|s) Σ_{s′,r} p(s′,r|s,a)[r + γ v_π(s′)]']);
        const used = ACTS.map((_, a) => a).filter((a) => pi[s][a] > 0);
        used.forEach((a) => lines.push([`$π$(${ACTS[a][3]}|${s}) = ${dn(pi[s][a])}，按 $p$ 平均后果`,
          { html: mm(`q_π(${s},${ACTS[a][3]}) = ${terms(s, a)} = `) + d3(q(V, s, a, gamma)) }]));
        lines.push(['按策略平均', { html: mm(`v_π(${s}) = ${used.map((a) => (pi[s][a] === 1 ? '' : dn(pi[s][a]) + '·') + d3(q(V, s, a, gamma))).join(' + ')} = `) + `<b>${d3(b)}</b>` }]);
        const unused = ACTS.map((_, a) => a).filter((a) => !(pi[s][a] > 0));
        if (unused.length) lines.push(['策略不选的动作，首步之后仍按 $π$', { html: unused.map((a) => mm(`q_π(${s},${ACTS[a][3]}) = `) + d3(q(V, s, a, gamma))).join('，') }]);
        lines.push(['对照：解 $(I − γP_π)v = r_π$', { html: mm(`v_π(${s}) = `) + fmt(exact, 6) }]);
      } else {
        lines.push(['Bellman 最优方程', 'v_*(s) = max_a Σ_{s′,r} p(s′,r|s,a)[r + γ v_*(s′)]']);
        const qs = ACTS.map((_, a) => q(V, s, a, gamma)), best = Math.max(...qs);
        ACTS.forEach((A, a) => lines.push([`$a$ = ${NAME[a]}`, { html: mm(`q_*(${s},${A[3]}) = ${terms(s, a)} = `) + (qs[a] > best - 1e-12 ? `<b>${d3(qs[a])}</b>` : d3(qs[a])) }]));
        lines.push(['取最大', { html: mm(`v_*(${s}) = max{${qs.map(d3).join(', ')}} = `) + `<b>${d3(best)}</b>` }]);
        lines.push(['对照：价值迭代到整表差 $< 10^{−14}$', { html: mm(`v_*(${s}) = `) + fmt(exact, 6) }]);
      }
      stepsBox.set(lines, `计算过程　以 ${s} 为根，γ = ${gamma.toFixed(2)}，叶值取精确解`);
    }
    recompute();
  });
})();
