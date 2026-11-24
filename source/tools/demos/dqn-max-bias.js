/* 第 10 章：取最大的偏差与双估计。对应 10.4 节“动作越多，偏差越大”“为什么是 √(2 ln K)”：
 * K 个动作的估计 q̂_c = q_c + σε_c，ε_c 独立标准正态；单估计取 max_c V_c，双估计用在线组 U 选 I、
 * 副本 V 打分。副本以概率 κ 与在线组共用同一组读数（正文 Double DQN 一段的 κ）。 */
(() => {
  const KS = [2, 3, 4, 6, 8, 12, 18, 24, 32, 48, 64];

  /* 标准正态的分布函数：erfc 的 Chebyshev 近似（相对误差 < 1.2e-7）。 */
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
      t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const Phi = (x) => 0.5 * erfc(-x / Math.SQRT2);
  const phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

  const model = {
    KS,
    /* 真值：相等时都为 0；递减时 0, −.5, −1, …（正文 K = 4 的算例）。 */
    means(K, mode) { return Array.from({ length: K }, (_, c) => (mode === 'equal' ? 0 : -0.5 * c)); },
    /* 精确值（数值积分）：E[max_c q̂_c]，被在线组选中的概率 P(I = c)，独立打分时的 E[V_I]。 */
    exact(mus, sigma, n = 4000) {
      const top = Math.max(...mus), lo = top - 10 * sigma, hi = top + 10 * sigma, dx = (hi - lo) / n;
      let emax = lo;
      const pick = mus.map(() => 0);
      for (let i = 0; i <= n; i++) {
        const x = lo + i * dx, w = i === 0 || i === n ? 0.5 : 1;
        let logF = 0;
        const lp = mus.map((m) => Math.log(Math.max(1e-300, Phi((x - m) / sigma))));
        for (const v of lp) logF += v;
        emax += w * dx * (1 - Math.exp(logF));
        mus.forEach((m, c) => { pick[c] += w * dx * (phi((x - m) / sigma) / sigma) * Math.exp(logF - lp[c]); });
      }
      const s = pick.reduce((a, b) => a + b, 0);
      const pI = pick.map((v) => v / s);
      const evalI = pI.reduce((a, p, c) => a + p * mus[c], 0);
      return { emax, pI, evalI, top };
    },
    /* 双估计的期望：κ 时共用读数（等于单估计），否则独立打分。 */
    doubleMean(ex, kappa) { return kappa * ex.emax + (1 - kappa) * ex.evalI; },
    bound(K, sigma) { return sigma * Math.sqrt(2 * Math.log(K)); },
    /* 一次抽样：在线组 U、副本 V、I = argmax U、两种标签。 */
    sample(mus, sigma, kappa, rng) {
      const U = mus.map((m) => m + sigma * rng.normal());
      const shared = rng() < kappa;
      const V = shared ? U.slice() : mus.map((m) => m + sigma * rng.normal());
      let I = 0, J = 0;
      for (let c = 1; c < U.length; c++) { if (U[c] > U[I]) I = c; if (V[c] > V[J]) J = c; }
      return { U, V, I, J, shared, yDQN: V[J], yDouble: V[I] };
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('dqn-max-bias', (ctx) => {
    const { el, fmt } = ctx;
    let mode = 'equal', kIdx = 6, sigma = 1, kappa = 0;
    const NMAX = 20000, BINS = 56;
    let rng = ctx.rng(10), ex, mus, hist, n, sum, sum2, last, memo = new Map(), exCache = new Map();
    const K = () => KS[kIdx];
    const key = (k) => `${mode}|${sigma}|${kappa}|${k}`;
    const exactOf = (k) => {
      const kk = `${mode}|${sigma}|${k}`;
      if (!exCache.has(kk)) exCache.set(kk, model.exact(model.means(k, mode), sigma, 1500));
      return exCache.get(kk);
    };
    const range = () => [-4 * sigma, 4.6 * sigma];

    function reset() {
      mus = model.means(K(), mode); ex = model.exact(mus, sigma);
      hist = [new Array(BINS).fill(0), new Array(BINS).fill(0)];
      n = 0; sum = [0, 0]; sum2 = [0, 0]; last = null; rng = ctx.rng(10 + kIdx);
      run.stop(); ctx.redraw(); show();
    }
    function add(s) {
      const [lo, hi] = range();
      [s.yDQN, s.yDouble].forEach((y, j) => {
        sum[j] += y; sum2[j] += y * y;
        const b = Math.floor(((y - lo) / (hi - lo)) * BINS);
        if (b >= 0 && b < BINS) hist[j][b] += 1;
      });
      n += 1; last = s;
    }
    function draw(count) {
      for (let i = 0; i < count && n < NMAX; i++) add(model.sample(mus, sigma, kappa, rng));
      memo.set(key(K()), { n, m: [sum[0] / n, sum[1] / n] });
    }

    const modeSeg = ctx.segmented([['equal', '真值相等（都为 0）'], ['dec', '真值递减 0, −.5, −1, …']], mode, (v) => { mode = v; reset(); }, '真值');
    const kS = ctx.slider({ label: '动作数 K', min: 0, max: KS.length - 1, step: 1, value: kIdx, format: (i) => String(KS[i]), oninput: (i) => { kIdx = i; reset(); } });
    const sS = ctx.slider({ label: '噪声 σ', min: 0.2, max: 2, step: 0.1, value: sigma, format: (x) => x.toFixed(1), oninput: (x) => { sigma = +x.toFixed(1); reset(); } });
    const cS = ctx.slider({ label: '共用读数概率 κ', min: 0, max: 1, step: 0.05, value: kappa, format: (x) => x.toFixed(2), oninput: (x) => { kappa = +x.toFixed(2); reset(); } });
    const oneBtn = ctx.button('抽一次', () => { run.stop(); draw(1); ctx.redraw(); show(); }, true);
    const runBtn = ctx.button('连续抽样', () => (run.running ? run.stop() : run.start()));
    const resetBtn = ctx.button('清零', () => { memo.forEach((_, k) => k.startsWith(`${mode}|${sigma}|${kappa}|`) && memo.delete(k)); reset(); });
    const run = ctx.loop(() => {
      const per = Math.ceil((ctx.reduced() ? 4000 : 24000) / (2 * K()));
      draw(per); ctx.redraw(); show();
      return n < NMAX;
    });
    run.onstop = () => (runBtn.textContent = '连续抽样');
    const _start = run.start;
    run.start = () => { if (n >= NMAX) return; runBtn.textContent = '暂停'; _start(); };

    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(
      ctx.row(modeSeg.node),
      ctx.row(kS.node, sS.node, cS.node),
      el('div', { class: 'demo-grid2' }, left, right),
      ctx.row(oneBtn, runBtn, resetBtn),
      read, stepsBox.node,
    );

    /* 左：两种标签的样本直方图与各条参考线 */
    ctx.canvas({
      parent: left, aspect: 0.75, maxHeight: 300, minHeight: 220, label: '单估计与双估计标签的样本直方图',
      draw(G, w, h) {
        const C = ctx.colors(), [lo, hi] = range(), bw = (hi - lo) / BINS;
        const peak = Math.max(1, ...hist[0], ...hist[1]) / (Math.max(1, n) * bw);
        const P = ctx.plot(G, w, h, { series: [], xmin: lo, xmax: hi, ymin: 0, ymax: n ? peak * 1.12 : 1, xlabel: '标签值', ylabel: '频率密度', pad: { l: 42 } });
        const cols = [C.series[2], C.series[0]];
        [0, 1].forEach((j) => {
          if (!n) return;
          G.save(); G.globalAlpha = 0.28; G.fillStyle = cols[j];
          hist[j].forEach((c, b) => { if (!c) return; const y = c / (n * bw); G.fillRect(P.X(lo + b * bw), P.Y(y), P.X(lo + (b + 1) * bw) - P.X(lo + b * bw) + 0.3, P.Y(0) - P.Y(y)); });
          G.restore();
          G.strokeStyle = cols[j]; G.lineWidth = 1.6; G.beginPath();
          hist[j].forEach((c, b) => { const y = c / (n * bw), x0 = P.X(lo + b * bw), x1 = P.X(lo + (b + 1) * bw); if (b === 0) G.moveTo(x0, P.Y(y)); else G.lineTo(x0, P.Y(y)); G.lineTo(x1, P.Y(y)); });
          G.stroke();
        });
        const vline = (x, color, dash, lab, row) => {
          if (x < lo || x > hi) return;
          G.save(); G.setLineDash(dash); G.strokeStyle = color; G.lineWidth = 1.5;
          G.beginPath(); G.moveTo(P.X(x), P.P.t); G.lineTo(P.X(x), P.Y(0)); G.stroke(); G.restore();
          if (lab) { G.fillStyle = color; G.font = ctx.font(11); G.textAlign = 'left'; G.textBaseline = 'top'; G.fillText(lab, P.X(x) + 3, P.P.t + 2 + row * 13); }
        };
        vline(ex.top, C.ink, [2, 3], 'max q', 0);
        vline(ex.emax, C.series[2], [6, 4], 'E[max]', 1);
        vline(model.doubleMean(ex, kappa), C.series[0], [6, 4], 'E[V_I]', 2);
        if (mode === 'equal') vline(model.bound(K(), sigma), C.muted, [1.5, 2.5], 'σ√(2lnK)', 3);
      },
    });
    left.append(ctx.legend([['var(--d3)', '单估计 max_c V_c'], ['var(--d1)', '双估计 V_I']]));

    /* 右：偏差（以 σ 为单位）随 K 的变化，横轴取对数 */
    ctx.canvas({
      parent: right, aspect: 0.75, maxHeight: 300, minHeight: 220, label: '偏差随动作数的变化',
      draw(G, w, h) {
        const C = ctx.colors(), X2 = (k) => Math.log2(k);
        const single = KS.map((k) => { const e = exactOf(k); return [X2(k), (e.emax - e.top) / sigma]; });
        const dbl = KS.map((k) => { const e = exactOf(k); return [X2(k), (model.doubleMean(e, kappa) - e.top) / sigma]; });
        const bnd = []; for (let x = 1; x <= 6.001; x += 0.1) bnd.push([x, Math.sqrt(2 * Math.log(2 ** x))]);
        const ymin = Math.min(-0.2, ...dbl.map((p) => p[1])) - 0.15;
        const P = ctx.plot(G, w, h, {
          series: [{ data: bnd, color: C.muted, dash: [5, 4], width: 1.4 }, { data: single, color: C.series[2], width: 2 }, { data: dbl, color: C.series[0], width: 2 }],
          xmin: 1, xmax: 6, ymin, ymax: 3.05, xticks: 5, xlabel: '动作数 K（对数刻度）', ylabel: '偏差 / σ', hlines: [{ y: 0, color: C.rule }], pad: { l: 42 },
        });
        G.fillStyle = C.surface; G.fillRect(P.P.l - 14, h - P.P.b + 2, w - P.P.l + 14, 16);
        G.fillStyle = C.muted; G.font = ctx.font(12); G.textAlign = 'center'; G.textBaseline = 'top';
        [2, 4, 8, 16, 32, 64].forEach((k) => G.fillText(String(k), P.X(X2(k)), h - P.P.b + 6));
        // 已抽样的 K：空心点是单估计、实心点是双估计的样本均值
        for (const k of KS) {
          const r = memo.get(key(k)), e = exactOf(k);
          if (!r || !r.n) continue;
          const x = P.X(X2(k));
          G.lineWidth = 1.8; G.strokeStyle = C.series[2]; G.beginPath(); G.arc(x, P.Y((r.m[0] - e.top) / sigma), 4.5, 0, 7); G.stroke();
          G.fillStyle = C.series[0]; G.beginPath(); G.arc(x, P.Y((r.m[1] - e.top) / sigma), 3.8, 0, 7); G.fill();
        }
        G.save(); G.setLineDash([2, 3]); G.strokeStyle = C.ink; G.lineWidth = 1;
        G.beginPath(); G.moveTo(P.X(X2(K())), P.P.t); G.lineTo(P.X(X2(K())), h - P.P.b); G.stroke(); G.restore();
      },
    });
    right.append(ctx.legend([['var(--d3)', '单估计（精确）'], ['var(--d1)', '双估计（精确）'], ['var(--muted)', '√(2 ln K)'], ['var(--ink)', '圆点：样本均值']]));

    const f3 = (x) => fmt(x, 3);
    function show() {
      const se = (j) => (n > 1 ? Math.sqrt(Math.max(0, sum2[j] / n - (sum[j] / n) ** 2) / n) : NaN);
      read.innerHTML = `已抽 <b>${n}</b> / ${NMAX} 次　K = <b>${K()}</b>　` +
        (n ? `单估计均值 <b>${f3(sum[0] / n)}</b> ± ${f3(se(0))}（精确 ${f3(ex.emax)}）　双估计均值 <b>${f3(sum[1] / n)}</b> ± ${f3(se(1))}（精确 ${f3(model.doubleMean(ex, kappa))}）`
          : `精确值：单估计 ${f3(ex.emax)}，双估计 ${f3(model.doubleMean(ex, kappa))}`) +
        `　max<sub>c</sub> q<sub>c</sub> = ${f3(ex.top)}` + (mode === 'equal' ? `　σ√(2 ln K) = ${f3(model.bound(K(), sigma))}` : '') +
        '<br><span class="demo-note">± 是样本均值的一个标准误；改 K、σ、κ 后重新抽样，右图在各个 K 处留下样本均值。</span>';
      showSteps();
    }
    function showSteps() {
      const k = K(), lines = [];
      const list = (arr) => {
        if (arr.length <= 6) return arr.map((v) => fmt(v, 2)).join(', ');
        const order = arr.map((v, c) => [v, c]).sort((a, b) => b[0] - a[0]).slice(0, 3);
        return order.map(([v, c]) => `${c + 1}: ${fmt(v, 2)}`).join(', ') + ', …';
      };
      lines.push([`真值 $q_c$：${mode === 'equal' ? '都为 0' : '0, −.5, −1, …'}；在线组 $U_c = q_c + σε_c$，副本 $V_c$ 以概率 $κ = ${fmt(kappa, 2)}$ 与在线组共用读数，否则独立重抽`, null]);
      if (!last) {
        lines.push(['单估计（DQN）', 'Y_{DQN} = max_c V_c']);
        lines.push(['双估计（Double）', 'I = argmax_c U_c,　Y_{Double} = V_I']);
      } else {
        const s = last;
        lines.push([`本次${s.shared ? '共用读数' : '独立重抽'}；${k > 6 ? '按大小列出前三个（动作号: 值）' : '各动作依次为'}`, null]);
        lines.push(['在线组', `U = (${list(s.U)})`]);
        lines.push(['副本', `V = (${list(s.V)})`]);
        lines.push(['单估计在副本内选与评', { html: ctx.m(`Y_{DQN} = max_c V_c = V_{${s.J + 1}} = `) + `<b>${fmt(s.yDQN, 3)}</b>` }]);
        lines.push(['双估计由在线组选、副本评', { html: ctx.m(`I = argmax_c U_c = ${s.I + 1},　Y_{Double} = V_{${s.I + 1}} = `) + `<b>${fmt(s.yDouble, 3)}</b>` }]);
        lines.push(['本次相对 $max_c q_c$ 的偏差', `${fmt(s.yDQN - ex.top, 3)}（单）,　${fmt(s.yDouble - ex.top, 3)}（双）`]);
      }
      if (mode === 'equal') {
        lines.push(['期望（数值积分）与上界', { html: ctx.m(`E[max_c q̂_c] − q = σ·E[max_c ε_c] = ${fmt(sigma, 1)}·${f3(ex.emax / sigma)} = `) + `<b>${f3(ex.emax)}</b>` + ctx.m(`　≤ σ√(2 ln K) = ${f3(model.bound(k, sigma))}`) }]);
        lines.push(['双估计：独立时打分与选择无关', { html: ctx.m(`E[V_I] = κ·E[max_c V_c] + (1 − κ)·q = ${fmt(kappa, 2)}·${f3(ex.emax)} + 0 = `) + `<b>${f3(model.doubleMean(ex, kappa))}</b>` }]);
      } else {
        const pr = ex.pI.slice(0, Math.min(4, k)).map((p) => fmt(p, 2)).join(', ') + (k > 4 ? ', …' : '');
        lines.push(['被在线组选中的概率', `P(I = c) = (${pr})`]);
        lines.push(['独立打分时', { html: ctx.m(`E[V_I] = Σ_c P(I = c)·q_c = `) + `<b>${f3(ex.evalI)}</b>` + ctx.m(`;　κ = ${fmt(kappa, 2)} 时 κ·${f3(ex.emax)} + (1 − κ)·${f3(ex.evalI)} = ${f3(model.doubleMean(ex, kappa))}`) }]);
        lines.push(['单估计', { html: ctx.m(`E[max_c q̂_c] = `) + `<b>${f3(ex.emax)}</b>` + ctx.m(`,　max_c q_c = 0`) }]);
      }
      stepsBox.set(lines, last ? `计算过程　第 ${n} 次抽样（K = ${k}）` : `计算过程　K = ${k}`);
    }
    reset();
  });
})();
