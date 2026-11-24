/* 第 21 章：按调用写的 SMDP 目标与逐步写的差分 TD 误差，在 21.1 节的八步记录上逐步对照。
 * 对应 21.2 节“仓库上的两个样本目标”与“随机执行时长与差分 TD 目标”：r(μ) = 5/8、ṽ_μ(B) = 0、ṽ_μ(C) = −5/8，
 *   J_L 的目标 4 − 5/8 + 0 = 27/8，J_R 的目标 1 − (5/8)·2 − 5/8 = −7/8，α = 1/2 时 q̂(J_R, o_L) ← −7/16；
 *   零表、R̄ = 5/8 时第 5、6 步 δ 为 −5/8 与 3/8，和为 −1/4 = 1 − 2·5/8；恒等式 Σδ = G − R̄τ + Ṽ(Z′) − Ṽ(Z_t)。
 * 参考值表的其余格由 ṽ_μ(B) = 0 与 r(μ) = 5/8 推出：D_L 11/4、J_L 27/8、D_R −3/2、J_R −7/8、W −1/4；
 *   第 8 步到 D 时下一盏灯不在记录内，Ṽ(D) 取两种灯各半 (11/4 − 3/2)/2 = 5/8。 */
(() => {
  const NODES = ['D_L', 'J_L', 'B', 'D_R', 'J_R', 'W', 'C', 'B', 'D']; // Z_0 … Z_8
  const REW = [0, 4, 0, 0, 0, 1, 0, 0]; // 第 t + 1 步（从 Z_t 到 Z_{t+1}）的主奖励
  const CALLS = [{ from: 1, to: 2 }, { from: 4, to: 6 }]; // 调用占第 from + 1 … to 步，起点 Z_from，交回 Z_to
  const RATE = 5 / 8, ALPHA = 0.5;
  const REF = { D_L: 11 / 4, J_L: 27 / 8, B: 0, D_R: -3 / 2, J_R: -7 / 8, W: -1 / 4, C: -5 / 8, D: 5 / 8 };
  const ZERO = { D_L: 0, J_L: 0, B: 0, D_R: 0, J_R: 0, W: 0, C: 0, D: 0 };
  const table = (mode) => (mode === 'ref' ? REF : ZERO);
  const inCall = (t) => CALLS.findIndex((c) => t >= c.from && t < c.to);
  /* 第 t + 1 步的差分 TD 误差，整段记录用同一份 Ṽ 与 R̄。 */
  const delta = (t, V, Rb) => REW[t] - Rb + V[NODES[t + 1]] - V[NODES[t]];
  /* 一次调用：(G, τ, Z′)、SMDP 样本目标、调用内 δ 之和、α = 1/2 写入旧值 0 的结果。 */
  function call(i, V, Rb, qOld = 0) {
    const c = CALLS[i], ds = [];
    let G = 0;
    for (let t = c.from; t < c.to; t++) { G += REW[t]; ds.push(delta(t, V, Rb)); }
    const tau = c.to - c.from, z = NODES[c.from], Zp = NODES[c.to];
    const target = G - Rb * tau + V[Zp];
    return { z, Zp, G, tau, target, ds, sum: ds.reduce((a, b) => a + b, 0), q: qOld + ALPHA * (target - qOld) };
  }
  function record(V, Rb) {
    const ds = REW.map((_, t) => delta(t, V, Rb));
    return { ds, sumR: REW.reduce((a, r) => a + r - Rb, 0), sum: ds.reduce((a, b) => a + b, 0) };
  }
  const model = { NODES, REW, CALLS, RATE, ALPHA, REF, ZERO, table, inCall, delta, call, record };
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
  const frac = (x) => {
    if (Math.abs(x) < 1e-12) return '0';
    for (let q = 1; q <= 64; q++) {
      const p = Math.round(x * q);
      if (Math.abs(x * q - p) < 1e-9) return q === 1 ? String(p).replace('-', '−') : `${p < 0 ? '−' : ''}${Math.abs(p)}/${q}`;
    }
    return x.toFixed(4).replace('-', '−');
  };
  const par = (x) => (x < -1e-12 ? `(${frac(x)})` : frac(x));

  RLDemo.register('ch21-smdp', (ctx) => {
    const { el } = ctx;
    let mode = 'ref', Rb = RATE, pos = 0;
    const modeSeg = ctx.segmented([['ref', 'Ṽ 取参考值'], ['zero', 'Ṽ 取零表']], mode, (v) => { mode = v; update(); }, '差分估计');
    const rS = ctx.slider({ label: '奖励率估计 R̄', min: 0, max: 1.25, step: 0.0625, value: Rb, format: frac, oninput: (v) => { Rb = v; update(); } });
    const b1 = ctx.button('走一步', () => { if (pos < 8) pos += 1; update(); }, true);
    const b8 = ctx.button('走完八步', () => { pos = 8; update(); });
    const b0 = ctx.button('重来', () => { pos = 0; update(); });
    const read = ctx.readout();
    const box = ctx.steps();
    /* 阅读稿正文对 li 两端对齐，计算过程里改为左对齐。 */
    /* m() 把 R 排成斜体后，组合上横线落在标签外显示不出，改用上划线；Ṽ 补成斜体。 */
    const mm = (s) => ctx.m(s).replace(/<i>([A-Za-z])<\/i>\u0304/g, '<i style="text-decoration:overline">$1</i>').replace(/Ṽ/g, '<i>Ṽ</i>');
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const md = (s) => s.split('$').map((t, i) => (i % 2 ? `<span class="demo-m">${mm(t)}</span>` : esc(t))).join('');
    const setBox = (lines, title) => {
      box.set(lines.map(([d, e]) => [{ html: md(d) }, e == null ? null : { html: mm(e) }]), title);
      box.node.querySelectorAll('li').forEach((li) => { li.style.textAlign = 'left'; });
    };
    const pane = el('div');
    ctx.stage.append(ctx.row(modeSeg.node, rS.node), ctx.row(b1, b8, b0), pane, read, box.node);

    /* 上方：九个时刻的状态与 Ṽ，两次调用的括号；下方：每步的 δ。 */
    ctx.canvas({
      parent: pane, aspect: 0.5, maxHeight: 330, minHeight: 270, label: '八步记录上每个原始步的差分 TD 误差，括号标出技能的两次调用及调用内误差之和',
      draw(g, W, H) {
        const C = ctx.colors(), V = model.table(mode), all = model.record(V, Rb).ds;
        const lo = Math.min(0, ...all), hi = Math.max(0, ...all), sp = Math.max(0.5, hi - lo), narrow = W < 480;
        const P = ctx.plot(g, W, H, { series: [], xmin: 0, xmax: 8, ymin: lo - 0.22 * sp, ymax: hi + 0.22 * sp, xlabel: '时刻（原始步）', ylabel: '差分 TD 误差 δ', xticks: 8, yticks: 4, hlines: [{ y: 0, color: C.muted }], pad: { t: 100, l: 42, r: 16, b: 36 } });
        const yN = 6, yV = 24, yC = 50, yB = 74;
        g.textBaseline = 'top'; g.textAlign = 'center';
        NODES.forEach((s, i) => {
          g.font = ctx.font(narrow ? 11.5 : 13, 600); g.fillStyle = i <= pos ? C.ink : C.faint;
          subText(g, s, P.X(i), yN);
          g.font = ctx.font(narrow ? 9.5 : 10.5); g.fillStyle = i <= pos ? C.muted : C.faint;
          g.fillText(frac(V[s]), P.X(i), yV);
        });
        for (let t = 0; t < 8; t++) {
          const x0 = P.X(t) + 6, x1 = P.X(t + 1) - 6, opt = model.inCall(t) >= 0, done = t < pos;
          g.strokeStyle = opt ? C.accent : C.muted; g.globalAlpha = done ? 1 : 0.35; g.lineWidth = opt ? 2.6 : 1.4;
          g.beginPath(); g.moveTo(x0, yC); g.lineTo(x1, yC); g.lineTo(x1 - 5, yC - 3.5); g.moveTo(x1, yC); g.lineTo(x1 - 5, yC + 3.5); g.stroke();
          g.font = ctx.font(narrow ? 9.5 : 10.5, REW[t] ? 600 : 400); g.fillStyle = REW[t] ? C.ink : C.faint;
          g.fillText(REW[t] ? '+' + REW[t] : '0', (P.X(t) + P.X(t + 1)) / 2, yC + 5);
          g.globalAlpha = 1;
        }
        /* 调用括号：完成后标出调用内 δ 之和。 */
        CALLS.forEach((c, i) => {
          if (pos <= c.from) return;
          const end = Math.min(pos, c.to), x0 = P.X(c.from) + 3, x1 = P.X(end) - 3, r = model.call(i, V, Rb);
          g.strokeStyle = C.accent; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(x0, yB - 4); g.lineTo(x0, yB); g.lineTo(x1, yB); if (end === c.to) g.lineTo(x1, yB - 4); g.stroke();
          g.font = ctx.font(narrow ? 9.5 : 10.5); g.fillStyle = C.accent;
          g.fillText(end === c.to ? `Σδ = ${frac(r.sum)}` : '调用中', (x0 + x1) / 2, yB + 3);
        });
        for (let t = 0; t < pos; t++) {
          const d = all[t], xa = P.X(t + 0.2), xb = P.X(t + 0.8), y0 = P.Y(0), y1 = P.Y(d);
          g.fillStyle = model.inCall(t) >= 0 ? C.accent : C.series[1];
          g.fillRect(xa, Math.min(y0, y1), xb - xa, Math.max(1.5, Math.abs(y1 - y0)));
          if (t === pos - 1) { g.strokeStyle = C.ink; g.lineWidth = 1.2; g.strokeRect(xa - 1.5, Math.min(y0, y1) - 1.5, xb - xa + 3, Math.max(1.5, Math.abs(y1 - y0)) + 3); }
          g.font = ctx.font(narrow ? 9.5 : 10.5); g.fillStyle = C.ink;
          g.textBaseline = d < 0 ? 'top' : 'bottom';
          g.fillText(frac(d), (xa + xb) / 2, d < 0 ? Math.max(y0, y1) + 3 : Math.min(y0, y1) - 3);
        }
        g.textBaseline = 'alphabetic';
      },
    });
    pane.append(ctx.legend([['var(--accent)', ['技能 o', el('sub', { text: 'L' }), ' 选动作的步']], ['var(--d2)', '当地唯一动作的步'], ['var(--muted)', '节点下方是 Ṽ']]));

    function update() {
      const V = model.table(mode), q = CALLS.map((c, i) => (pos >= c.to ? model.call(i, V, Rb).q : 0));
      read.innerHTML = mm(`第 ${pos} 步之后　q̂(J_L, o_L) = ${frac(q[0])}，q̂(J_R, o_L) = ${frac(q[1])}`);
      const lines = [];
      if (pos === 0) {
        lines.push([`参考高层策略 $μ$ 每到转角都调用 $o_L$；八步记录取自 21.1 节。全程用同一份 $Ṽ$ 与 $R̄ = ${frac(Rb)}$，$α = 1/2$，$q̂$ 两项初值为 0`, null]);
        if (mode === 'ref') lines.push(['参考值取 $ṽ_μ(B) = 0$，其余各格由 $r(μ) = 5/8$ 逐格推出：$Ṽ(D_L) = 11/4$，$Ṽ(J_L) = 27/8$，$Ṽ(D_R) = −3/2$，$Ṽ(J_R) = −7/8$，$Ṽ(W) = −1/4$，$Ṽ(C) = −5/8$', null]);
        else lines.push(['零表：各格 $Ṽ$ 都取 0，$δ$ 只剩 $r − R̄$', 'Ṽ(z) = 0']);
      } else {
        const t = pos - 1, a = NODES[t], b = NODES[t + 1], d = model.delta(t, V, Rb);
        lines.push([`第 ${pos} 步：从 $${a}$ 到 $${b}$，主奖励 ${REW[t]}，$δ_${pos} = r − R̄ + Ṽ(${b}) − Ṽ(${a})$`, `${REW[t]} − ${frac(Rb)} + ${par(V[b])} − ${par(V[a])} = ${frac(d)}`]);
        if (t === 2) lines.push(['到 $D$ 时看到灯亮右，智能体状态记为 $D_R$', null]);
        if (t === 7 && mode === 'ref') lines.push(['第 8 步到 $D$，下一盏灯不在记录内，$Ṽ(D)$ 取两种灯各半', '(11/4 + (−3/2))/2 = 5/8']);
        if (t === 2 && mode === 'ref' && Math.abs(Rb - RATE) < 1e-9) lines.push(['参考值下只有 $B → D$ 这一步的 $δ$ 不为 0：亮左时为 $+17/8$，亮右时为 $−17/8$，两种灯各半，期望为 0', null]);
        if (t === 6) lines.push(['$C → B$ 在 $o_L$ 交回之后，不属于刚结束的调用，同样扣一份 $R̄$', null]);
        const ci = model.inCall(t);
        if (ci >= 0 && pos < CALLS[ci].to) lines.push([`$o_L$ 到 $${b}$ 不交回，调用继续，下一动作仍由 $o_L$ 选`, `调用内已累计 Σδ = ${frac(d)}`]);
        CALLS.forEach((c, i) => {
          if (pos !== c.to) return;
          const r = model.call(i, V, Rb), ks = r.ds.map((_, k) => `δ_${c.from + k + 1}`).join(' + ');
          lines.push([`技能在 $${r.Zp}$ 交回，本次调用`, `(G, τ, Z′) = (${r.G}, ${r.tau}, ${r.Zp})`]);
          lines.push([`按调用写：SMDP 样本目标 $G − R̄τ + Ṽ(${r.Zp})$，调用内每个原始步各扣一份 $R̄$`, `${r.G} − ${frac(Rb)} × ${r.tau} + ${par(V[r.Zp])} = ${frac(r.target)}`]);
          lines.push([`逐步写：调用内各步 $δ$ 相加，中间的 $Ṽ$ 成对消去，得目标减去 $Ṽ(${r.z})$`, `${ks} = ${frac(r.sum)} = ${frac(r.target)} − ${par(V[r.z])}`]);
          lines.push(['技能间 SMDP 更新，只写被调用的一项', `q̂(${r.z}, o_L) ← 0 + 1/2 × (${frac(r.target)} − 0) = ${frac(r.q)}`]);
        });
        if (pos === 8) {
          const rr = model.record(V, Rb);
          lines.push(['整条记录八步，主奖励共 5', `Σ(r − R̄) = 5 − 8 × ${frac(Rb)} = ${frac(rr.sumR)}`]);
          lines.push(['八步 δ 之和，只剩首尾两格的 $Ṽ$', `Σδ = ${frac(rr.sumR)} + ${par(V.D)} − ${par(V.D_L)} = ${frac(rr.sum)}`]);
        }
      }
      setBox(lines, pos ? `计算过程　第 ${pos} 步` : '计算过程　出发前');
      ctx.redraw();
    }
    update();
  });
})();
