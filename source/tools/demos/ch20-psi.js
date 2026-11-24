/* 第 20 章：用到站标签逐趟学习记忆系数 ψ。
 * 对应章首的平方风险 E[(p − Y)^2] = κ(1 − κ) + (1/4)(ψ − (2κ − 1))^2 与 20.3 节“一次更新：ψ 从 .5 到 .55”：
 * 在 D 写入 c = ±1（亮左取 +1），此后每走一格 z ← ψz；读出 p = (1 + z_J)/2，损失 ℓ = (1/2)(p − Y)^2。
 * 敏感度 ż ← ψż + z_旧（D 处为 0）。D 到 J 之间多一格走廊时 z_J = ψ^2 c，完整敏感度 2ψc，只回传一步时 ψc（“敏感度的代价”）。
 * 第 1 趟按正文取亮左、向左到 B，之后由种子抽取：指示以 κ 的概率指对。 */
(() => {
  /* 走 K 格到 J（K = 1 直达，K = 2 中间一格走廊）。trunc 为真时只回传最后一步。 */
  function forward(psi, c, K, trunc) {
    const zs = [c], ds = [0];
    let z = c, d = 0;
    for (let k = 0; k < K; k++) {
      const zOld = z;
      d = (trunc && k === K - 1) ? zOld : psi * d + zOld; // 截断：丢掉 ψ·ż_旧 这一份
      z = psi * zOld;
      zs.push(z); ds.push(d);
    }
    return { zs, ds, z, d };
  }
  const risk = (psi, kappa, K) => kappa * (1 - kappa) + 0.25 * (psi ** K - (2 * kappa - 1)) ** 2;
  /* 三种来源：知道历史后仍有的随机性、状态合并历史、读出未学准。ψ^K = 0 时 J 处分不开两种指示。 */
  function decomp(psi, kappa, K) {
    const u = psi ** K, t1 = kappa * (1 - kappa);
    if (Math.abs(u) < 1e-12) return { t1, t2: 0.25 * (2 * kappa - 1) ** 2, t3: 0 };
    return { t1, t2: 0, t3: 0.25 * (u - (2 * kappa - 1)) ** 2 };
  }
  /* 对 c 与 Y 取期望的梯度：完整时 Kψ^(K−1)(ψ^K − (2κ−1))/4，只回传一步时把 K 换成 1。 */
  const expGrad = (psi, kappa, K, trunc) => (trunc ? 1 : K) * psi ** (K - 1) * (psi ** K - (2 * kappa - 1)) / 4;
  /* 平衡点：ψ^K = 2κ − 1 有实根时取之（K = 2 取与 ψ 同号的根），否则为 0。 */
  function optimum(kappa, K, sign = 1) {
    const t = 2 * kappa - 1;
    if (K === 1) return t;
    return t >= 0 ? (sign < 0 ? -1 : 1) * Math.sqrt(t) : 0;
  }
  function update(psi, c, Y, alpha, K, trunc) {
    const f = forward(psi, c, K, trunc), p = (1 + f.z) / 2, dz = (p - Y) / 2, grad = dz * f.d, next = psi - alpha * grad;
    return { ...f, p, dz, grad, next, reread: (1 + next ** K * c) / 2 };
  }
  /* 抽一趟：c 等概率取 ±1；指示以 κ 的概率指对。Y = 1 当且仅当真实一侧是左。 */
  function sample(R, kappa) {
    const c = R() < 0.5 ? 1 : -1, right = R() < kappa;
    return { c, right, Y: (c > 0) === right ? 1 : 0 };
  }
  /* 期望梯度在平衡点处的斜率 h：按期望走一步，离平衡点的距离约乘 1 − αh。 */
  function slope(kappa, K, trunc, near = 1) {
    const o = optimum(kappa, K, near < 0 ? -1 : 1), e = 1e-6;
    return (expGrad(o + e, kappa, K, trunc) - expGrad(o - e, kappa, K, trunc)) / (2 * e);
  }
  const model = { forward, risk, decomp, expGrad, optimum, update, sample, slope };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  /* 画布不认下标：把文字里的 _X（单个字符）画成缩小、下移的 X，按当前 textAlign 对齐。 */
  function subText(g, t, x, y) {
    const parts = t.split(/_(.)/), base = g.font, px = parseFloat(/(\d+(\.\d+)?)px/.exec(base)[1]);
    const small = base.replace(/\d+(\.\d+)?px/, `${(px * 0.72).toFixed(1)}px`), align = g.textAlign;
    let total = 0;
    parts.forEach((p, i) => { g.font = i % 2 ? small : base; total += g.measureText(p).width; });
    let cx = align === 'center' ? x - total / 2 : align === 'right' || align === 'end' ? x - total : x;
    g.textAlign = 'left';
    parts.forEach((p, i) => { g.font = i % 2 ? small : base; g.fillText(p, cx, i % 2 ? y + px * 0.28 : y); cx += g.measureText(p).width; });
    g.font = base; g.textAlign = align;
  }
  const num = (x, d = 4) => {
    if (!Number.isFinite(x)) return '—';
    let s = (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace(/^(-?)0\./, '$1.').replace('-', '−');
  };
  const MAXK = 2000, LIM = 3;

  RLDemo.register('ch20-psi', (ctx) => {
    const { el } = ctx;
    let K = 1, trunc = false, seed = 20, R = ctx.rng(seed), kappa = 0.8, alpha = 0.4, psi0 = 0.5;
    let rec = []; // 每趟：{k, c, Y, right, kappa, alpha, before, u（update 结果）, exp（期望路径上的 ψ）}
    const psiNow = () => (rec.length ? rec[rec.length - 1].u.next : psi0);
    const expNow = () => (rec.length ? rec[rec.length - 1].exp : psi0);
    const out = () => Math.abs(psiNow()) > LIM;

    const trip = () => {
      if (rec.length >= MAXK || out()) return;
      const k = rec.length + 1, s = k === 1 ? { c: 1, right: true, Y: 1 } : model.sample(R, kappa);
      const before = psiNow(), u = model.update(before, s.c, s.Y, alpha, K, trunc);
      const e0 = expNow(), exp = e0 - alpha * model.expGrad(e0, kappa, K, trunc);
      rec.push({ k, ...s, kappa, alpha, before, u, exp: Number.isFinite(exp) && Math.abs(exp) < 1e6 ? exp : NaN });
    };
    const reset = () => { R = ctx.rng(seed); rec = []; update(); };

    const kSeg = ctx.segmented([[1, 'D 直接到 J'], [2, '中间一格走廊']], K, (v) => { K = v; reset(); }, 'D 与 J 之间');
    const tSeg = ctx.segmented([['full', '完整敏感度'], ['trunc', '只回传一步']], 'full', (v) => { trunc = v === 'trunc'; reset(); }, '敏感度');
    const slider = (label, min, max, step, value, on, d = 2) => ctx.slider({ label, min, max, step, value, format: (x) => num(x, d), oninput: on });
    const kS = slider('指示正确率 κ', 0, 1, 0.05, kappa, (v) => { kappa = v; update(); });
    const aS = slider('步长 α', 0.1, 10, 0.1, alpha, (v) => { alpha = v; update(); }, 1);
    const pS = slider('起点 ψ', -1, 1, 0.05, psi0, (v) => { psi0 = v; reset(); });
    const b1 = ctx.button('抽一趟', () => { trip(); update(); }, true);
    const b50 = ctx.button('抽 50 趟', () => { for (let i = 0; i < 50; i++) trip(); update(); });
    const b0 = ctx.button('重来', reset);
    const bS = ctx.button('换种子', () => { seed += 1; reset(); });
    const read = ctx.readout();
    const box = ctx.steps();
    /* 阅读稿正文对 li 两端对齐，计算过程里改为左对齐。 */
    const setBox = (lines, title) => { box.set(lines, title); box.node.querySelectorAll('li').forEach((li) => { li.style.textAlign = 'left'; }); };
    const top = el('div', { class: 'demo-grid2' }), riskPane = el('div'), pathPane = el('div');
    top.append(riskPane, pathPane);
    ctx.stage.append(ctx.row(kSeg.node, tSeg.node), ctx.row(kS.node, aS.node, pS.node), ctx.row(b1, b50, b0, bS), top, read, box.node);

    /* 左图：平方风险随 ψ 的曲线，点是当前 ψ，空心点是上一趟的 ψ，竖虚线是平衡点。 */
    ctx.canvas({
      parent: riskPane, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '平方风险随记忆系数 ψ 的变化与当前 ψ',
      draw(g, W, H) {
        const C = ctx.colors(), xs = [];
        for (let i = 0; i <= 120; i++) { const x = -1.2 + (2.4 * i) / 120; xs.push([x, model.risk(x, kappa, K)]); }
        const P = ctx.plot(g, W, H, { series: [{ data: xs, color: C.ink, width: 1.8 }], xmin: -1.2, xmax: 1.2, ymin: 0, ymax: 0.5, xlabel: 'ψ', ylabel: '平方风险 E(p − Y)²', xticks: 4, yticks: 5, hlines: [{ y: kappa * (1 - kappa), color: C.muted }], pad: { l: 50 } });
        const opts = K === 1 || 2 * kappa - 1 <= 0 ? [model.optimum(kappa, K)] : [model.optimum(kappa, K, -1), model.optimum(kappa, K)];
        g.save(); g.setLineDash([3, 4]); g.strokeStyle = C.series[3]; g.lineWidth = 1.2;
        opts.forEach((o) => { g.beginPath(); g.moveTo(P.X(o), P.Y(0)); g.lineTo(P.X(o), P.Y(0.5)); g.stroke(); });
        g.restore();
        g.font = ctx.font(10.5); g.fillStyle = C.series[3]; g.textAlign = 'center'; g.textBaseline = 'top';
        opts.forEach((o) => g.fillText(num(o, 3), P.X(o), P.t + 2));
        const dot = (x, fill, r) => {
          if (!Number.isFinite(x)) return;
          const xc = Math.max(-1.2, Math.min(1.2, x)), y = Math.min(0.5, model.risk(xc, kappa, K));
          g.beginPath(); g.arc(P.X(xc), P.Y(y), r, 0, 7);
          if (fill) { g.fillStyle = C.accent; g.fill(); } else { g.strokeStyle = C.accent; g.lineWidth = 1.5; g.stroke(); }
        };
        if (rec.length) dot(rec[rec.length - 1].before, false, 5);
        dot(psiNow(), true, 4.5);
      },
    });
    /* 右图：ψ 随趟数的变化；虚线是按期望梯度走的路径。 */
    ctx.canvas({
      parent: pathPane, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '记忆系数 ψ 随趟数的变化',
      draw(g, W, H) {
        const C = ctx.colors(), n = Math.max(20, rec.length);
        const sam = [[0, psi0], ...rec.map((r) => [r.k, r.u.next])], ex = [[0, psi0], ...rec.map((r) => [r.k, r.exp])];
        const o = model.optimum(kappa, K, psiNow() < 0 ? -1 : 1);
        ctx.plot(g, W, H, { series: [{ data: ex, color: C.muted, width: 1.5, dash: [5, 4] }, { data: sam, color: C.accent, width: 1.8 }], xmin: 0, xmax: n, ymin: -1.2, ymax: 1.2, xlabel: '趟数', ylabel: '记忆系数 ψ', xticks: 4, yticks: 4, hlines: [{ y: o, color: C.series[3], label: `平衡点 ${num(o, 3)}` }], pad: { l: 40 } });
      },
    });
    riskPane.append(ctx.legend([['var(--ink)', '平方风险'], ['var(--d4)', '平衡点'], ['var(--muted)', '下限 κ(1 − κ)']]));
    pathPane.append(ctx.legend([['var(--accent)', '逐趟样本更新'], ['var(--muted)', '按期望梯度走']]));

    function update() {
      const n = rec.length, last = rec[n - 1], psi = psiNow(), lines = [];
      b1.disabled = b50.disabled = n >= MAXK || out();
      const sens = K === 1 ? '' : trunc ? '，敏感度只回传一步' : '，完整敏感度';
      if (!n) {
        read.innerHTML = ctx.m(`ψ 从 ${num(psi0)} 出发，κ = ${num(kappa)}，α = ${num(alpha)}${sens}。第 1 趟按正文取亮左、向左到 B，之后由种子 ${seed} 抽取。`);
        lines.push(['出发前', `ψ = ${num(psi0)}`]);
      } else {
        const s = last.u, cs = last.c > 0 ? '亮左' : '亮右';
        read.innerHTML = ctx.m(`第 ${n} 趟：${cs}，指示${last.right ? '正确' : '错误'}，向左到 ${last.Y ? 'B' : 'W'}，Y = ${last.Y}。` +
          (out() ? `ψ 已离开 [−${LIM}, ${LIM}]，按“重来”。` : ''));
        lines.push([`抽样：${cs}，指示${last.right ? '正确' : '错误'}`, `c = ${last.c > 0 ? '+1' : '−1'}，Y = ${last.Y}`]);
        if (K === 1) lines.push(['① 递推', `z_J = ψc = ${num(s.z)}，ż_J = c = ${num(s.d)}`]);
        else {
          lines.push(['① 递推到走廊 E', `z_E = ψc = ${num(s.zs[1])}，ż_E = c = ${num(s.ds[1])}`]);
          lines.push([trunc ? '① 再到 J，只回传一步，丢掉 $ψż_E$' : '① 再到 J', trunc ? `z_J = ${num(s.z)}，ż_J = z_E = ${num(s.d)}` : `z_J = ψz_E = ${num(s.z)}，ż_J = ψż_E + z_E = ${num(s.d)}`]);
        }
        lines.push(['② 读出与误差', `p = (1 + z_J)/2 = ${num(s.p)}，Y − p = ${num(last.Y - s.p)}`]);
        lines.push(['③ 梯度', `(p − Y) · 1/2 · ż_J = ${num(s.grad, 5)}`]);
        lines.push(['④ 更新', `ψ ← ${num(last.before)} − ${num(last.alpha)} × (${num(s.grad, 5)}) = ${num(s.next)}`]);
        lines.push(['⑤ 同一历史再读', `(1 + ${K === 1 ? 'ψc' : 'ψ^2c'})/2 = ${num(s.reread)}`]);
      }
      const t = 2 * (n ? last.kappa : kappa) - 1, off = (t > 0 ? '− ' : '+ ') + num(Math.abs(t));
      const from = n ? last.before : psi0, kE = n ? last.kappa : kappa, aE = n ? last.alpha : alpha, g0 = model.expGrad(from, kE, K, trunc);
      lines.push([`本趟出发时 $ψ = ${num(from)}$，对 c 与 Y 取期望，平衡点 ${K === 1 ? '$ψ = 2κ − 1$' : '$ψ^2 = 2κ − 1$'}`,
        `E[∂ℓ/∂ψ] = ${K === 1 ? '(1/4)(ψ ' + off + ')' : (trunc ? '' : '2') + 'ψ(ψ^2 ' + off + ')/4'} = ${num(g0, 5)}`]);
      lines.push(['按期望走一步', `ψ − α E[∂ℓ/∂ψ] = ${num(from - aE * g0)}`]);
      const h = model.slope(kE, K, trunc, from);
      if (h > 1e-9) lines.push([`平衡点附近按期望走，离平衡点的距离每步乘 $1 − αh$；绝对值大于 1 时越摆越远`, `1 − ${num(aE)} × ${num(h, 3)} = ${num(1 - aE * h, 3)}`]);
      const dc = model.decomp(psi, kappa, K);
      lines.push(['当前 ψ 的平方风险，按三种来源分开', `${num(dc.t1, 4)} + ${num(dc.t2, 4)} + ${num(dc.t3, 4)} = ${num(model.risk(psi, kappa, K), 4)}`]);
      if (n >= MAXK) lines.push(['已到演示上限', `${MAXK} 趟`]);
      setBox(lines, n ? `计算过程　第 ${n} 趟` : '计算过程　出发前');
      ctx.redraw();
    }
    update();
  });
})();
