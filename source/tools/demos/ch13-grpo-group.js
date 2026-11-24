/* 第 13 章：组内标准化。同题 K 份回答，优势 Â_i=(Z_i−Z̄)/s_Z（总体标准差）；
 * 对应 13.4 节课堂算例 (0,0,0,1)：均值 .25、标准差 .433、优势 −.577 与 1.732；留一差 −1/3 与 1，乘 3/4 得 −1/4 与 3/4；
 * 多轮训练一节的 (.80,.80,.80,.84)：均值 .81、标准差 .0173，优势相同；
 * “组内标准化改变的目标”：极限权重 1/√(p(1−p))，p=.5、.1、.01 处为 2、3.33、约 10；Dr. GRPO 去掉除法后为常数；
 * “组内筛选”：保留概率 s(p)=1−p^K−(1−p)^K，K=4 时最高 7/8。
 * 有限 K 的精确权重 w_K(p)=E[Â_1|Z_1=1]−E[Â_1|Z_1=0]（其余 K−1 份 ~ Bin(K−1,p)，全同组的优势记 0）由本演示计算，正文未列。 */
(() => {
  function stats(Z) {
    const K = Z.length, mean = Z.reduce((a, b) => a + b, 0) / K;
    const sd = Math.sqrt(Z.reduce((a, z) => a + (z - mean) ** 2, 0) / K);
    const adv = Z.map((z) => (sd > 1e-12 ? (z - mean) / sd : 0));
    const loo = Z.map((z, i) => z - (Z.reduce((a, b) => a + b, 0) - z) / (K - 1));
    return { mean, sd, adv, loo, looScaled: loo.map((v) => (v * (K - 1)) / K) };
  }
  const retain = (p, K) => 1 - p ** K - (1 - p) ** K;
  const wAsym = (p) => 1 / Math.sqrt(p * (1 - p));
  const wDr = (K) => (K - 1) / K;
  /* 组合数取对数，K 很大时也不溢出。 */
  function logBinom(n) {
    const row = [0];
    for (let k = 1; k <= n; k++) row.push(row[k - 1] + Math.log(n - k + 1) - Math.log(k));
    return row;
  }
  const BIN = new Map();
  /* 有限 K 的精确权重；center=true 时只减均值、不除标准差（Dr. GRPO 的写法，分母取 1）。 */
  function wExact(p, K, center = false) {
    if (!BIN.has(K)) BIN.set(K, logBinom(K - 1));
    const C = BIN.get(K);
    let a1 = 0, a0 = 0;
    for (let M = 0; M <= K - 1; M++) {
      const pr = Math.exp(C[M] + (M ? M * Math.log(p) : 0) + (K - 1 - M ? (K - 1 - M) * Math.log(1 - p) : 0));
      if (!(pr > 0)) continue;
      for (const z of [1, 0]) {
        const m = M + z, q = m / K, sd = Math.sqrt(q * (1 - q));
        const a = center ? z - q : sd > 1e-12 ? (z - q) / sd : 0;
        if (z) a1 += pr * a; else a0 += pr * a;
      }
    }
    return a1 - a0;
  }
  const model = { stats, retain, wAsym, wDr, wExact };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 3) => {
    if (!Number.isFinite(x)) return '∞';
    let t = Math.abs(x).toFixed(d);
    if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '');
    t = t.replace(/^0\./, '.');
    return (x < -1e-12 && t !== '0' ? '−' : '') + t;
  };

  RLDemo.register('ch13-grpo-group', (ctx) => {
    const { el } = ctx;
    let K = 4, m = 1, scale = 'bin', p = 0.1;
    const lab = (t) => el('span', { class: 'demo-note', text: t, style: 'margin:0' });
    const H = (src) => ({ html: ctx.m(src).replace(/<i>Z<\/i>\u0304/g, '<i style="text-decoration:overline">Z</i>') });
    const segK = ctx.segmented([[4, '4'], [8, '8'], [16, '16'], [64, '64']], K, (v) => {
      K = v; m = Math.min(m, K); const inp = mS.node.querySelector && mS.node.querySelector('input'); if (inp) inp.max = K; mS.value = m; update();
    }, '每组回答数 K');
    const segS = ctx.segmented([['bin', '0 / 1'], ['near', '.80 / .84']], scale, (v) => { scale = v; update(); }, '分数尺度');
    const mS = ctx.slider({ label: '通过的份数', min: 0, max: K, step: 1, value: m, format: String, oninput: (x) => { m = x; update(); } });
    const pS = ctx.slider({ label: '通过率 p', min: 0.01, max: 0.99, step: 0.01, value: p, format: (x) => num(x, 2), oninput: (x) => { p = x; update(); } });
    const read = ctx.readout();
    const box1 = ctx.steps('这一组的优势');
    const box2 = ctx.steps('通过率 p 处的权重');
    const barBox = el('div'), wBox = el('div'), sBox = el('div');
    const grid = el('div', { class: 'demo-grid2' }, wBox, sBox);
    ctx.stage.append(
      ctx.row(lab('每组 K'), segK.node, lab('分数（未过 / 过）'), segS.node), ctx.row(mS.node), barBox, read, box1.node,
      ctx.row(pS.node), grid,
      ctx.legend([['var(--d1)', '极限 1/√(p(1−p))'], ['var(--d4)', '有限 K 的精确值'], ['var(--d2)', 'Dr. GRPO：(K−1)/K']]),
      box2.node);

    let S = null;
    const Zs = () => {
      const [lo, hi] = scale === 'bin' ? [0, 1] : [0.8, 0.84];
      return Array.from({ length: K }, (_, i) => (i >= K - m ? hi : lo));
    };

    ctx.canvas({
      parent: barBox, aspect: 0.3, maxHeight: 200, minHeight: 140,
      label: '条形图：同组每份回答的标准化优势，青色为通过，橙色为未通过',
      draw(g, w, h) {
        const Cc = ctx.colors();
        const L = 30, R = 6, T = 12, B = 18;
        const top = Math.max(1, ...S.adv) * 1.12, bot = Math.min(-1, ...S.adv) * 1.12;
        const Y = (v) => T + ((top - v) / (top - bot)) * (h - T - B);
        g.strokeStyle = Cc.rule; g.lineWidth = 1;
        g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(w - R, Y(0)); g.stroke();
        g.fillStyle = Cc.muted; g.font = ctx.font(10); g.textAlign = 'right'; g.textBaseline = 'middle';
        for (const v of [Math.ceil(bot / 1.12 - 1e-9), 0, Math.floor(top / 1.12 + 1e-9)]) g.fillText(num(v, 0), L - 5, Y(v));
        const bw = (w - L - R) / K, Z = Zs(), hi = Math.max(...Z);
        for (let i = 0; i < K; i++) {
          const a = S.adv[i], x = L + i * bw;
          g.fillStyle = Z[i] === hi && m > 0 ? Cc.series[3] : Cc.series[1];
          const y0 = Y(0), y1 = Y(a);
          g.fillRect(x + Math.min(2, bw * 0.15), Math.min(y0, y1), Math.max(1, bw - 2 * Math.min(2, bw * 0.15)), Math.max(1, Math.abs(y1 - y0)));
          if (K <= 8) {
            g.fillStyle = Cc.ink; g.textAlign = 'center'; g.font = ctx.font(11, 400, true);
            g.textBaseline = a >= 0 ? 'bottom' : 'top';
            g.fillText(num(a, 3), x + bw / 2, a >= 0 ? y1 - 2 : y1 + 2);
            g.fillStyle = Cc.muted; g.font = ctx.font(10); g.textBaseline = a >= 0 ? 'top' : 'bottom';
            g.fillText('Z=' + num(Z[i], 2), x + bw / 2, a >= 0 ? y0 + 3 : y0 - 3);
          }
        }
        if (S.sd < 1e-12) {
          g.fillStyle = Cc.warn; g.font = ctx.font(12); g.textAlign = 'center'; g.textBaseline = 'top';
          g.fillText('组内全同，s_Z = 0，这一组不进入更新', (L + w - R) / 2, T);
        }
      },
    });

    const P = Array.from({ length: 197 }, (_, i) => 0.005 + (0.99 * i) / 196);
    let curK = -1, exact = [];
    ctx.canvas({
      parent: wBox, aspect: 0.72, maxHeight: 280, minHeight: 190,
      label: '每单位通过率梯度获得的权重随通过率变化：U 形极限曲线、有限 K 的精确曲线与 Dr. GRPO 的水平线',
      draw(g, w, h) {
        const Cc = ctx.colors();
        if (curK !== K) { curK = K; exact = P.map((x) => [x, wExact(x, K)]); }
        const ax = ctx.plot(g, w, h, {
          series: [
            { data: P.map((x) => [x, wAsym(x)]), color: Cc.series[0], width: 2 },
            { data: exact, color: Cc.series[3], width: 2 },
            { data: [[0, wDr(K)], [1, wDr(K)]], color: Cc.series[1], dash: [6, 4] },
          ],
          xmin: 0, xmax: 1, ymin: 0, ymax: 11, xlabel: '通过率 p', ylabel: '每单位 ∇p 的权重', pad: { l: 40 },
        });
        g.strokeStyle = Cc.faint; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(ax.X(p), ax.P.t); g.lineTo(ax.X(p), h - ax.P.b); g.stroke(); g.setLineDash([]);
        for (const [y, c] of [[wAsym(p), Cc.series[0]], [wExact(p, K), Cc.series[3]], [wDr(K), Cc.series[1]]]) {
          if (y > 11) continue;
          g.fillStyle = c; g.beginPath(); g.arc(ax.X(p), ax.Y(y), 3.5, 0, 2 * Math.PI); g.fill();
        }
      },
    });
    ctx.canvas({
      parent: sBox, aspect: 0.72, maxHeight: 280, minHeight: 190,
      label: '组内有分差、因而被保留的概率随通过率变化，中间最高、两端为零',
      draw(g, w, h) {
        const Cc = ctx.colors();
        const ax = ctx.plot(g, w, h, {
          series: [{ data: P.map((x) => [x, retain(x, K)]), color: Cc.series[3], width: 2 }],
          xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: '通过率 p', ylabel: '保留概率 s(p)', pad: { l: 50 },
        });
        g.strokeStyle = Cc.faint; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(ax.X(p), ax.P.t); g.lineTo(ax.X(p), h - ax.P.b); g.stroke(); g.setLineDash([]);
        g.fillStyle = Cc.series[3]; g.beginPath(); g.arc(ax.X(p), ax.Y(retain(p, K)), 3.5, 0, 2 * Math.PI); g.fill();
      },
    });

    function update() {
      const Z = Zs();
      S = stats(Z);
      const [lo, hi] = scale === 'bin' ? [0, 1] : [0.8, 0.84];
      const iP = K - 1, iF = 0;
      read.innerHTML = `K = <b>${K}</b>，通过 <b>${m}</b> 份　均值 <b>${num(S.mean, 4)}</b>　总体标准差 <b>${num(S.sd, 4)}</b>` +
        (scale === 'near' && S.sd > 0 ? '　分差缩为 .04，标准差同比缩为 0/1 时的 1/25，优势不变' : '');
      const q = m / K;
      const L = [[`组内平均`, H(`Z̄ = (${m}×${num(hi, 2)} + ${K - m}×${num(lo, 2)})/${K} = ${num(S.mean, 4)}`)],
        [`总体标准差（差值 ${num(hi - lo, 2)} 乘 √(q(1−q))，q = ${m}/${K}）`, `s_Z = ${num(hi - lo, 2)}×√(${num(q, 4)}×${num(1 - q, 4)}) = ${num(S.sd, 4)}`]];
      if (S.sd < 1e-12) L.push(['组内全同', 's_Z = 0：没有组内得分差，这一组被跳过']);
      else {
        L.push(['通过份的优势', `(${num(hi, 2)} − ${num(S.mean, 4)})/${num(S.sd, 4)} = ${num(S.adv[iP], 3)}`]);
        L.push(['未通过份的优势', `(${num(lo, 2)} − ${num(S.mean, 4)})/${num(S.sd, 4)} = ${num(S.adv[iF], 3)}`]);
        L.push([`留一，通过份：减去其余 ${K - 1} 份的均值，再乘 (K−1)/K，等于减全组均值`, H(`${num(S.loo[iP], 4)}×${K - 1}/${K} = ${num(S.looScaled[iP], 4)} = ${num(hi, 2)} − Z̄`)]);
        L.push(['留一，未通过份', H(`${num(S.loo[iF], 4)}×${K - 1}/${K} = ${num(S.looScaled[iF], 4)} = ${num(lo, 2)} − Z̄`)]);
      }
      box1.set(L);
      box2.set([
        ['极限权重（组很大时）', `1/√(p(1−p)) = 1/√(${num(p, 2)}×${num(1 - p, 2)}) = ${num(wAsym(p), 3)}`],
        [`K = ${K} 的精确权重，已计入组内全同、贡献为零的组`, `E[Â_1 | Z_1 = 1] − E[Â_1 | Z_1 = 0] = ${num(wExact(p, K), 3)}`],
        ['Dr. GRPO 只减均值，权重与 p 无关', `(K − 1)/K = ${num(wDr(K), 4)}`],
        ['组内有分差的保留概率', `s(p) = 1 − p^{${K}} − (1 − p)^{${K}} = ${num(retain(p, K), 4)}`],
      ]);
      ctx.redraw();
    }
    update();
  });
})();
