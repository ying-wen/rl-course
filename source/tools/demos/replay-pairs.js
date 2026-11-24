/* 第 10 章：均匀回放打散同批记录。对应 10.2 节“均匀回放把同批两条记录同区的概率从 6/7 降到 1/2”：
 * 2n 条记录按时间排列，前 n 条来自区域 A、后 n 条来自区域 B，批量为 B。
 * 连续取样：在 2n−B+1 个相邻窗口中等概率取一个，全批同区的窗口有 2(n−B+1) 个；
 * 均匀有放回：全批同区的概率为 2·(1/2)^B。n = 4、B = 2 时分别为 6/7 与 1/2。 */
(() => {
  const model = {
    consecutive(n, B) { const win = 2 * n - B + 1; return { win, same: 2 * Math.max(0, n - B + 1), p: (2 * Math.max(0, n - B + 1)) / win }; },
    uniform(B) { return 2 * 0.5 ** B; },
    /* 逐一枚举，供测试核对。 */
    enumerate(n, B) {
      const reg = (i) => (i < n ? 0 : 1);
      let cs = 0, cw = 0;
      for (let s = 0; s + B <= 2 * n; s++) { cw++; let ok = true; for (let k = 1; k < B; k++) if (reg(s + k) !== reg(s)) ok = false; if (ok) cs++; }
      let us = 0, ut = 0;
      const idx = new Array(B).fill(0);
      for (;;) {
        ut++; if (idx.every((i) => reg(i) === reg(idx[0]))) us++;
        let k = 0; while (k < B && ++idx[k] === 2 * n) { idx[k] = 0; k++; }
        if (k === B) break;
      }
      return { consecutive: cs / cw, uniform: us / ut, windows: cw, pairs: ut };
    },
    sample(n, B, mode, rng) {
      if (mode === 'seq') { const s = Math.floor(rng() * (2 * n - B + 1)); return Array.from({ length: B }, (_, k) => s + k); }
      return Array.from({ length: B }, () => Math.floor(rng() * 2 * n));
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('replay-pairs', (ctx) => {
    const { el, fmt } = ctx;
    let n = 4, B = 2, seed = 1, rng = ctx.rng(1);
    const tally = { seq: { same: 0, all: 0, last: [] }, uni: { same: 0, all: 0, last: [] } };
    const reset = () => { for (const k of ['seq', 'uni']) Object.assign(tally[k], { same: 0, all: 0, last: [] }); rng = ctx.rng(++seed); };
    const nS = ctx.slider({ label: '每区记录数 n', min: 2, max: 16, step: 1, value: n, oninput: (x) => { n = x; if (B > 2 * n) { B = 2 * n; bS.value = B; } reset(); ctx.redraw(); show(); } });
    const bS = ctx.slider({ label: '批量 B', min: 2, max: 6, step: 1, value: B, oninput: (x) => { B = Math.min(x, 2 * n); reset(); ctx.redraw(); show(); } });
    const draw = (k) => {
      for (let i = 0; i < k; i++) for (const m of ['seq', 'uni']) {
        const b = model.sample(n, B, m, rng), t = tally[m], r0 = b[0] < n;
        t.all++; if (b.every((j) => (j < n) === r0)) t.same++; t.last = b;
      }
      ctx.redraw(); show();
    };
    const one = ctx.button('各抽一批', () => draw(1), true);
    const many = ctx.button('各抽 200 批', () => draw(200));
    const clr = ctx.button('清零', () => { reset(); ctx.redraw(); show(); });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(nS.node, bS.node), ctx.row(one, many, clr), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);

    ctx.canvas({
      parent: left, aspect: 0.75, maxHeight: 260, minHeight: 190, label: '按时间排列的记录与两种取法最近抽到的一批',
      draw(G, w, h) {
        const C = ctx.colors(), N = 2 * n, padL = 8, cw = (w - 2 * padL) / N, ch = Math.min(28, cw * 1.6);
        const rows = [['seq', '按时间连续取样', h * 0.18], ['uni', '均匀有放回抽样', h * 0.6]];
        G.font = ctx.font(12, 600); G.textBaseline = 'bottom'; G.textAlign = 'left';
        for (const [m, title, y] of rows) {
          G.fillStyle = C.ink; G.fillText(title, padL, y - 6);
          for (let i = 0; i < N; i++) {
            G.fillStyle = ctx.mix(C.surface, i < n ? C.series[3] : C.series[1], 0.55);
            G.fillRect(padL + i * cw + 1, y, cw - 2, ch);
          }
          const cnt = {};
          tally[m].last.forEach((j) => {
            const c = (cnt[j] = (cnt[j] || 0) + 1);
            G.strokeStyle = C.ink; G.lineWidth = 2.2; G.strokeRect(padL + j * cw + 1, y, cw - 2, ch);
            G.fillStyle = C.ink; G.beginPath(); G.arc(padL + (j + 0.5) * cw, y + ch + 6 + (c - 1) * 7, 2.6, 0, 7); G.fill();
          });
          const t = tally[m];
          G.font = ctx.font(11.5); G.fillStyle = C.muted; G.textBaseline = 'top';
          G.fillText(t.all ? `已抽 ${t.all} 批，全批同区 ${fmt(t.same / t.all, 3)}` : '尚未抽样', padL, y + ch + 22);
          G.font = ctx.font(12, 600); G.textBaseline = 'bottom';
        }
      },
    });
    left.append(ctx.legend([['var(--d4)', '区域 A'], ['var(--d2)', '区域 B'], ['var(--ink)', '黑框与圆点：最近一批（重复抽到叠点）']]));

    ctx.canvas({
      parent: right, aspect: 0.75, maxHeight: 260, minHeight: 190, label: '全批同区的概率随每区记录数的变化',
      draw(G, w, h) {
        const C = ctx.colors(), sq = [], un = [];
        for (let k = Math.max(2, Math.ceil(B / 2)); k <= 16; k++) { sq.push([k, model.consecutive(k, B).p]); un.push([k, model.uniform(B)]); }
        const P = ctx.plot(G, w, h, {
          series: [{ data: sq, color: C.series[2], width: 2.2 }, { data: un, color: C.series[0], width: 2.2 }],
          xmin: 2, xmax: 16, ymin: 0, ymax: 1, xlabel: '每区记录数 n', ylabel: '全批同区的概率', pad: { l: 40 },
        });
        [[model.consecutive(n, B).p, C.series[2]], [model.uniform(B), C.series[0]]].forEach(([y, c]) => { G.fillStyle = c; G.beginPath(); G.arc(P.X(n), P.Y(y), 5, 0, 7); G.fill(); });
      },
    });
    right.append(ctx.legend([['var(--d3)', '连续取样'], ['var(--d1)', '均匀有放回']]));

    function show() {
      const c = model.consecutive(n, B), u = model.uniform(B);
      read.innerHTML = `n = ${n}、B = ${B}：连续取样全批同区 <b>${c.same}/${c.win} = ${fmt(c.p, 3)}</b>，均匀有放回 <b>${fmt(u, 3)}</b>；两种取法每批平均都含 ${fmt(B / 2, 1)} 条 A`;
      stepsBox.set([
        ['连续取样：起点在 $2n − B + 1$ 个位置中等概率选', `窗口数 2·${n} − ${B} + 1 = ${c.win}`],
        ['全批落在同一区的窗口', `2(n − B + 1) = 2(${n} − ${B} + 1) = ${c.same}`],
        ['连续取样的同区概率', { html: ctx.m(`${c.same}/${c.win} = `) + `<b>${fmt(c.p, 4)}</b>` }],
        ['均匀有放回：每条独立，落在 A 或 B 各占一半', { html: ctx.m(`2·(1/2)^{${B}} = `) + `<b>${fmt(u, 4)}</b>` }],
      ], '计算过程　全批同区的概率');
    }
    show();
  });
})();
