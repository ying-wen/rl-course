/* 第 18 章：观测混叠的预测代价。仓库路口 J，每趟在 J 向左，预测下一步是否到 B（Y = 1 当且仅当出发时见左指示）。
 * 对应 18.1 节“两种状态上的一次预测更新”：分组表按指示保存 (p_L, p_R)，单表只保存 p_J，
 * 都从 1/2 出发，p ← p + α(Y − p)。前两趟按八步记录取左、右指示，之后由种子抽取。 */
(() => {
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
  const errGroup = (pL, pR) => ((1 - pL) ** 2 + pR ** 2) / 2; // 左指示时 Y = 1，右指示时 Y = 0，各占一半
  const errSingle = (p) => (p - 0.5) ** 2 + 0.25;
  const model = {
    errGroup, errSingle,
    /* 指示序列：前两趟按记录为左、右，其余由 R()（[0,1) 均匀）决定。 */
    lights(n, R) {
      const out = [];
      for (let k = 0; k < n; k++) out.push(k === 0 ? 'L' : k === 1 ? 'R' : R() < 0.5 ? 'L' : 'R');
      return out;
    },
    /* rule：'half' 常步长 1/2；'inv' 步长 1/n，n 为该表项被读到的次数。
     * 返回第 0 项为初值、第 k 项为第 k 趟更新后的记录。 */
    run(lights, rule) {
      let pL = 0.5, pR = 0.5, pJ = 0.5, nL = 0, nR = 0, nJ = 0;
      const out = [{ k: 0, pL, pR, pJ, eG: errGroup(pL, pR), eS: errSingle(pJ) }];
      lights.forEach((m, i) => {
        const Y = m === 'L' ? 1 : 0, before = { pL, pR, pJ };
        let aG, aS;
        if (m === 'L') { nL += 1; aG = rule === 'half' ? 0.5 : 1 / nL; pL += aG * (Y - pL); }
        else { nR += 1; aG = rule === 'half' ? 0.5 : 1 / nR; pR += aG * (Y - pR); }
        nJ += 1; aS = rule === 'half' ? 0.5 : 1 / nJ; pJ += aS * (Y - pJ);
        out.push({ k: i + 1, light: m, Y, before, aG, aS, nG: m === 'L' ? nL : nR, nJ, pL, pR, pJ, eG: errGroup(pL, pR), eS: errSingle(pJ) });
      });
      return out;
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, d = 4) => {
    if (!Number.isFinite(x)) return '—';
    let s = (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace(/^(-?)0\./, '$1.').replace('-', '−');
  };
  /* 分母不超过 4096 的有理数写成分数，其余写小数。 */
  const frac = (x) => {
    if (Math.abs(x) < 1e-12) return '0';
    if (Math.abs(x - 1) < 1e-12) return '1';
    for (let d = 2; d <= 4096; d++) {
      const a = Math.round(x * d);
      if (Math.abs(x * d - a) < 1e-9 * d) return `${a}/${d}`.replace('-', '−');
    }
    return num(x);
  };
  const LAMP = { L: '左指示', R: '右指示' };
  const MAXK = 400;

  RLDemo.register('ch18-aliasing', (ctx) => {
    const { el } = ctx;
    let rule = 'half', seed = 18, view = 'err', R = ctx.rng(seed), lights = [], rec = model.run([], rule);
    const extend = (n) => {
      const more = Math.min(n, MAXK - lights.length);
      for (let i = 0; i < more; i++) { const k = lights.length; lights.push(k === 0 ? 'L' : k === 1 ? 'R' : R() < 0.5 ? 'L' : 'R'); }
      rec = model.run(lights, rule); update();
    };
    const reset = () => { R = ctx.rng(seed); lights = []; rec = model.run([], rule); update(); };
    const ruleSeg = ctx.segmented([['half', '常步长 1/2'], ['inv', '步长 1/n']], rule, (v) => { rule = v; rec = model.run(lights, rule); update(); }, '步长');
    const viewSeg = ctx.segmented([['err', '期望平方误差'], ['pred', '预报']], view, (v) => { view = v; ctx.redraw(); }, '下图显示');
    const b1 = ctx.button('走一趟', () => extend(1), true);
    const b20 = ctx.button('走 20 趟', () => extend(20));
    const b0 = ctx.button('重来', reset);
    const bs = ctx.button('换种子', () => { seed += 1; reset(); });
    const read = ctx.readout();
    const box = ctx.steps();
    /* 阅读稿正文对 li 两端对齐，计算过程里改为左对齐。 */
    const setBox = (lines, title) => { box.set(lines, title); box.node.querySelectorAll('li').forEach((li) => { li.style.textAlign = 'left'; }); };
    const top = el('div'), bottom = el('div', { class: 'demo-grid2' }), pane = el('div');
    ctx.stage.append(ctx.row(ruleSeg.node, viewSeg.node), ctx.row(b1, b20, b0, bs), top, read, bottom);
    bottom.append(pane, box.node);

    /* 上图：仓库到路口的一趟，以及两张表的当前表项（浅色是本趟更新前的值）。 */
    ctx.canvas({
      parent: top, aspect: 0.5, maxHeight: 250, minHeight: 215, label: '路口 J 的一趟与两张预测表',
      draw(g, W, H) {
        const C = ctx.colors(), last = rec[rec.length - 1], k = last.k;
        const node = (x, y, t, hi) => {
          g.beginPath(); g.arc(x, y, 13, 0, 7); g.fillStyle = C.bg; g.fill();
          g.strokeStyle = hi ? C.accent : C.ink; g.lineWidth = hi ? 2 : 1.2; g.stroke();
          g.fillStyle = C.ink; g.font = ctx.font(12.5, 600); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y);
        };
        const arrow = (x0, y0, x1, y1, on, label, below) => {
          const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
          const a = [x0 + ux * 15, y0 + uy * 15], b = [x1 - ux * 16, y1 - uy * 16];
          g.strokeStyle = on ? C.series[2] : C.rule; g.fillStyle = g.strokeStyle; g.lineWidth = on ? 2.4 : 1.3;
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
          g.beginPath(); g.moveTo(b[0] + ux * 5, b[1] + uy * 5); g.lineTo(b[0] - ux * 3 - uy * 4, b[1] - uy * 3 + ux * 4); g.lineTo(b[0] - ux * 3 + uy * 4, b[1] - uy * 3 - ux * 4); g.closePath(); g.fill();
          if (label) {
            g.font = ctx.font(11, on ? 600 : 400); g.fillStyle = on ? C.ink : C.muted; g.textAlign = 'center';
            g.textBaseline = below ? 'top' : 'bottom'; g.fillText(label, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (below ? 5 : -5));
          }
        };
        const my = 40, xD = Math.max(30, W * 0.09), xJ = W * 0.42, xB = W * 0.8;
        arrow(xD, my, xJ, my, k > 0, '', false);
        const narrow = W < 480; // 窄屏只标 Y，“总向左”并入路口说明
        arrow(xJ, my, xB, my - 24, k > 0 && last.light === 'L', narrow ? 'Y = 1' : '向左 → B，Y = 1', false);
        arrow(xJ, my, xB, my + 24, k > 0 && last.light === 'R', narrow ? 'Y = 0' : '向左 → W，Y = 0', true);
        node(xD, my, 'D', false); node(xJ, my, 'J', k > 0); node(xB, my - 24, 'B', k > 0 && last.light === 'L'); node(xB, my + 24, 'W', k > 0 && last.light === 'R');
        // 仓库的指示灯
        g.font = ctx.font(11.5, 600); g.textAlign = 'center'; g.textBaseline = 'top';
        g.fillStyle = k > 0 ? C.accent : C.muted;
        g.fillText(k > 0 ? `第 ${k} 趟：${LAMP[last.light]}` : '尚未出发', Math.max(xD + 10, 62), my + 18);
        g.fillStyle = C.muted; g.font = ctx.font(narrow ? 10.5 : 11); g.fillText(narrow ? '看不见指示，总向左' : '到 J 时看不见指示', (xD + xJ) / 2 - (narrow ? 8 : 0), my - (narrow ? 27 : 22));

        // 表项条
        const rows = [
          ['分组表 p_L（左指示）', 'pL', C.series[3], last.light === 'L'],
          ['分组表 p_R（右指示）', 'pR', C.series[3], last.light === 'R'],
          ['单表 p_J', 'pJ', C.series[2], k > 0],
        ];
        const Lw = Math.min(150, W * 0.38), Rm = 46, bw = W - Lw - Rm, y0 = 96, rh = (H - y0 - 24) / 3;
        const X = (v) => Lw + v * bw;
        g.strokeStyle = C.line; g.lineWidth = 1;
        [0, 0.5, 1].forEach((v) => { g.beginPath(); g.moveTo(X(v), y0 - 6); g.lineTo(X(v), y0 + 3 * rh - 4); g.stroke(); });
        g.font = ctx.font(10.5); g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'top';
        ['0', '1/2', '1'].forEach((t, i) => g.fillText(t, X(i / 2), y0 + 3 * rh));
        rows.forEach(([lab, key, col, hit], i) => {
          const y = y0 + i * rh, bh = Math.min(14, rh * 0.42), v = last[key], v0 = k > 0 ? last.before[key] : v;
          g.font = ctx.font(11.5, hit ? 600 : 400); g.fillStyle = hit ? C.ink : C.soft; g.textAlign = 'left'; g.textBaseline = 'middle';
          subText(g, lab, 0, y + bh / 2);
          g.globalAlpha = 0.28; g.fillStyle = col; g.fillRect(X(0), y, Math.max(0, v0 * bw), bh); g.globalAlpha = 1;
          g.fillStyle = col; g.fillRect(X(0), y + bh * 0.25, Math.max(0, v * bw), bh * 0.5);
          if (hit) { g.strokeStyle = C.accent; g.lineWidth = 1.5; g.strokeRect(X(0) - 2, y - 2, bw + 4, bh + 4); }
          g.font = ctx.font(11.5, 600, true); g.fillStyle = C.ink; g.textAlign = 'left';
          g.fillText(frac(v), X(1) + 6, y + bh / 2);
        });
      },
    });

    /* 下图：每趟后两个学习器的期望平方误差，或三项预报。 */
    ctx.canvas({
      parent: pane, aspect: 0.72, maxHeight: 280, minHeight: 210, label: '各趟之后的期望平方误差或预报',
      draw(g, W, H) {
        const C = ctx.colors(), n = Math.max(20, rec.length - 1);
        let series, hl, ymax;
        if (view === 'err') {
          series = [
            { data: rec.map((r) => [r.k, r.eS]), color: C.series[2], width: 2 },
            { data: rec.map((r) => [r.k, r.eG]), color: C.series[3], width: 2 },
          ];
          hl = [{ y: 0.25, color: C.muted, label: '只读位置的下限 1/4' }];
          if (rule === 'half') hl.push({ y: 1 / 3, color: C.faint, label: '单表长期平均 1/3' });
          ymax = 0.55;
        } else {
          series = [
            { data: rec.map((r) => [r.k, r.pL]), color: C.series[3], width: 2 },
            { data: rec.map((r) => [r.k, r.pR]), color: C.series[3], width: 2, dash: [5, 4] },
            { data: rec.map((r) => [r.k, r.pJ]), color: C.series[2], width: 2 },
          ];
          hl = [{ y: 0.5, color: C.muted, label: '1/2' }];
          ymax = 1.05;
        }
        const P = ctx.plot(g, W, H, { series, xmin: 0, xmax: n, ymin: 0, ymax, xlabel: '第几趟之后', ylabel: view === 'err' ? '期望平方误差' : '预报', xticks: 4, yticks: view === 'err' ? 5 : 4, hlines: hl, pad: { l: 50 } });
        const last = rec[rec.length - 1];
        if (rec.length > 1) {
          g.fillStyle = C.series[2]; g.beginPath(); g.arc(P.X(last.k), P.Y(view === 'err' ? last.eS : last.pJ), 3.5, 0, 7); g.fill();
        }
      },
    });
    pane.append(ctx.legend([['var(--d3)', ['单表 p', el('sub', { text: 'J' })]], ['var(--d4)', ['分组表（预报图中虚线为 p', el('sub', { text: 'R' }), '）']]]));

    function update() {
      const last = rec[rec.length - 1], k = last.k, lines = [];
      if (k === 0) {
        read.textContent = `两个学习器都从 1/2 出发。前两趟按八步记录取左、右指示，之后的指示由种子 ${seed} 抽取。`;
        lines.push(['初值', `p_L = p_R = p_J = 1/2`]);
        lines.push(['分组表下一趟的期望误差', `(1/2)[(1 − p_L)^2 + p_R^2] = ${frac(last.eG)}`]);
        lines.push(['单表下一趟的期望误差', `(p_J − 1/2)^2 + 1/4 = ${frac(last.eS)}`]);
        setBox(lines, '计算过程　出发前');
        ctx.redraw();
        return;
      }
      const nL = lights.slice(0, k).filter((m) => m === 'L').length;
      read.textContent = `第 ${k} 趟：仓库见${LAMP[last.light]}，在 J 向左，到 ${last.Y ? 'B' : 'W'}，Y = ${last.Y}。` +
        `${k} 趟中左指示 ${nL} 次、右指示 ${k - nL} 次${k <= 2 ? '（按八步记录）' : `（种子 ${seed}）`}。`;
      const key = last.light === 'L' ? 'p_L' : 'p_R', other = last.light === 'L' ? 'p_R' : 'p_L';
      const b = last.before, vG = last.light === 'L' ? [b.pL, last.pL] : [b.pR, last.pR];
      const aG = rule === 'half' ? '1/2' : `1/${last.nG}`, aS = rule === 'half' ? '1/2' : `1/${last.nJ}`;
      lines.push([`仓库见${LAMP[last.light]}，向左后实见`, `Y = ${last.Y}`]);
      lines.push([`分组表只读 $${key}$，$${other}$ 不动`, `${key} ← ${frac(vG[0])} + ${aG}×(${last.Y} − ${frac(vG[0])}) = ${frac(vG[1])}`]);
      lines.push(['单表只有一项', `p_J ← ${frac(b.pJ)} + ${aS}×(${last.Y} − ${frac(b.pJ)}) = ${frac(last.pJ)}`]);
      lines.push(['分组表下一趟的期望误差', `(1/2)[(1 − ${frac(last.pL)})^2 + (${frac(last.pR)})^2] = ${frac(last.eG)}`]);
      lines.push(['单表下一趟的期望误差', `(${frac(last.pJ)} − 1/2)^2 + 1/4 = ${frac(last.eS)}`]);
      if (k >= 20) {
        const tail = rec.slice(Math.max(1, rec.length - Math.min(200, k))), mS = tail.reduce((s, r) => s + r.eS, 0) / tail.length;
        lines.push([`单表最近 ${tail.length} 趟的平均期望误差，每趟都不低于 1/4${rule === 'half' ? '；常步长 1/2 时长期平均为 1/3' : ''}`, num(mS, 3)]);
      }
      if (k >= MAXK) lines.push(['已到演示上限', `${MAXK} 趟`]);
      setBox(lines, `计算过程　第 ${k} 趟`);
      ctx.redraw();
    }
    update();
  });
})();
