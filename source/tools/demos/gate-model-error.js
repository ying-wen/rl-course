/* 第 12 章：一步模型误差在多步预测中累加。对应 12.3 节“共享通过率的模型”：真实通过率 p = .8，模型 p̂（校准记录 9/10 给 .9），
 * 通过最后一道门得 4。始终前进时 v_h = 4p^h，误差 e_h = (p̂ − p)v_{h−1} + p̂ e_{h−1}，e_h = 4(p̂^h − p^h) ≤ 4h|p̂ − p|。
 * p̂ = .9：e_h = .400、.680、.868、.986；本门一项 .4、.32、.256、.2048，传回一项 0、.36、.612、.7812。
 * 起点最优为 max{1, 4p^H}：H = 7 到 13 时模型选前进、真实应退出；H = 8 时真实回报 4(.8)^8 = .671。 */
(() => {
  const P = 0.8, B = 4;
  const model = {
    P, B,
    errors(ph, H, p = P) {
      const out = []; let e = 0;
      for (let h = 1; h <= H; h++) { const own = (ph - p) * B * p ** (h - 1), prop = ph * e; e = own + prop; out.push({ h, own, prop, e, bound: 4 * h * Math.abs(ph - p) }); }
      return out;
    },
    arrival(q, H) { return Array.from({ length: H + 1 }, (_, j) => q ** j); },
    forward(q, H) { return B * q ** H > 1; },
    wrongRange(ph, p = P, Hmax = 30) { const r = []; for (let H = 1; H <= Hmax; H++) if (model.forward(ph, H) !== model.forward(p, H)) r.push(H); return r; },
    /* 按模型的首动作在真实走廊中执行的回报。 */
    realReturn(ph, H, p = P) { return model.forward(ph, H) ? B * p ** H : 1; },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('gate-model-error', (ctx) => {
    const { el, fmt } = ctx;
    let ph = 0.9, H = 4;
    const f3 = (x) => fmt(x, 3), HM = 16;
    const pS = ctx.slider({ label: '模型的通过率 p̂', min: 0.6, max: 0.99, step: 0.01, value: ph, format: (x) => fmt(x, 2), oninput: (x) => { ph = x; ctx.redraw(); show(); } });
    const hS = ctx.slider({ label: '门数 H', min: 1, max: HM, step: 1, value: H, oninput: (x) => { H = x; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(pS.node, hS.node), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);

    ctx.canvas({
      parent: left, aspect: 0.8, maxHeight: 290, minHeight: 210, label: '剩余门数 h 处的价值误差及其两项分解',
      draw(G, w, h) {
        const C = ctx.colors(), es = model.errors(ph, H);
        const ys = es.flatMap((e) => [e.e, e.own, e.prop]), lo = Math.min(0, ...ys) * 1.1, hi = Math.max(0.2, ...es.map((e) => Math.max(e.own, 0) + Math.max(e.prop, 0)), ...es.map((e) => e.e)) * 1.12;
        const bound = es.map((e) => [e.h, e.bound]);
        const Pp = ctx.plot(G, w, h, { series: [{ data: bound, color: C.series[2], width: 1.5, dash: [5, 4] }], xmin: 0.4, xmax: H + 0.6, ymin: lo, ymax: hi, xticks: Math.min(H, 8), xlabel: '剩余门数 h', ylabel: '价值误差 e_h', pad: { l: 44 }, hlines: [{ y: 0, color: C.rule }] });
        const bw = Math.min(30, (Pp.X(1) - Pp.X(0)) * 0.6);
        es.forEach((e) => {
          const x = Pp.X(e.h) - bw / 2; let base = 0;
          [[e.own, C.series[1]], [e.prop, C.series[3]]].forEach(([v, col]) => { const y0 = Pp.Y(base), y1 = Pp.Y(base + v); G.fillStyle = col; G.fillRect(x, Math.min(y0, y1), bw, Math.abs(y1 - y0)); base += v; });
          G.fillStyle = C.ink; G.beginPath(); G.arc(Pp.X(e.h), Pp.Y(e.e), 3, 0, 7); G.fill();
        });
      },
    });
    left.append(ctx.legend([['var(--d2)', '本门通过率估错'], ['var(--d4)', '后面各门传回'], ['var(--d3)', '界 4h|p̂ − p|']]));

    ctx.canvas({
      parent: right, aspect: 0.8, maxHeight: 290, minHeight: 210, label: '始终前进的期望回报随门数的变化，真实与模型',
      draw(G, w, h) {
        const C = ctx.colors(), tr = [], md = [];
        for (let k = 1; k <= HM; k++) { tr.push([k, B * P ** k]); md.push([k, B * ph ** k]); }
        /* 先按 plot 的默认边距（左 40、右 10、上 10、下 30）画红区，再画坐标与曲线。 */
        const xs = (x) => 40 + ((x - 1) / (HM - 1)) * (w - 50);
        G.fillStyle = ctx.mix(C.surface, C.series[2], 0.25);
        model.wrongRange(ph).filter((k) => k <= HM).forEach((k) => { const a = xs(Math.max(1, k - 0.5)), b = xs(Math.min(HM, k + 0.5)); G.fillRect(a, 10, b - a, h - 40); });
        const Pp = ctx.plot(G, w, h, { series: [{ data: tr, color: C.series[0], width: 2.2 }, { data: md, color: C.series[1], width: 2.2 }], xmin: 1, xmax: HM, ymin: 0, ymax: 4, xlabel: '门数 H', ylabel: '始终前进的回报', pad: { l: 40, r: 10, t: 10, b: 30 }, hlines: [{ y: 1, color: C.ink, label: '立即退出 1' }] });
        G.save(); G.strokeStyle = C.muted; G.setLineDash([2, 3]); G.beginPath(); G.moveTo(Pp.X(H), Pp.P.t); G.lineTo(Pp.X(H), h - Pp.P.b); G.stroke(); G.restore();
      },
    });
    right.append(ctx.legend([['var(--d1)', '真实 4p^H，p = .8'], ['var(--d2)', '模型 4p̂^H'], ['var(--d3)', '红区：两者首动作相反']]));

    function show() {
      const es = model.errors(ph, H), eH = es[H - 1], wr = model.wrongRange(ph), mf = model.forward(ph, H), tf = model.forward(P, H);
      const rng = wr.length ? (wr.length > 1 ? `H = ${wr[0]} 到 ${wr[wr.length - 1]}` : `H = ${wr[0]}`) : '无';
      read.innerHTML = `p̂ = ${fmt(ph, 2)}、H = ${H}：e_H = <b>${f3(eH.e)}</b>（界 ${f3(eH.bound)}），其中传回部分占 ${fmt((100 * eH.prop) / eH.e || 0, 0)}%` +
        `<br>模型${mf ? '选前进' : '选退出'}、真实${tf ? '应前进' : '应退出'}；按模型行动的真实回报 <b>${f3(model.realReturn(ph, H))}</b>；首动作相反的门数：${rng}`;
      const lines = [['始终前进，还剩 h 道门的真实价值', 'v_0 = 4,　v_h = p v_{h−1} = 4p^h']];
      es.slice(0, 6).forEach((e) => lines.push([`h = ${e.h}`, `e_${e.h} = (${fmt(ph, 2)} − .8)·${f3(B * P ** (e.h - 1))} + ${fmt(ph, 2)}·${f3(e.prop / ph)} = ${f3(e.own)} + ${f3(e.prop)} = ${f3(e.e)}`]));
      if (H > 6) lines.push(['…', '']);
      lines.push(['闭式与上界', { html: ctx.m(`e_${H} = 4(${fmt(ph, 2)}^{${H}} − .8^{${H}}) = `) + `<b>${f3(eH.e)}</b>` + ctx.m(` ≤ 4·${H}·${fmt(Math.abs(ph - P), 2)} = ${f3(eH.bound)}`) }]);
      lines.push(['首动作的门槛：前进胜过退出当且仅当 $4q^H > 1$', `模型 4·${fmt(ph, 2)}^{${H}} = ${f3(B * ph ** H)},　真实 4·.8^{${H}} = ${f3(B * P ** H)}`]);
      stepsBox.set(lines, '计算过程　误差逐门累加');
    }
    show();
  });
})();
