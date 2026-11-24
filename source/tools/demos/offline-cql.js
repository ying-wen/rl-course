/* 第 12 章：CQL 的正则强度 κ。对应 12.2 节“CQL 的代价”：走廊 350 条转移，表格版算法 12.1，
 * 步长 .2、目标每 20 步同步、全批训练 10^4 步，初值各状态（退出 1，前进 5）。
 * κ = .25 时学得 (.559,.718) (.757,.787) (.604,.883) (1.005,−2.877)，贪心为前进、前进、前进、退出，两个世界都得 .8^3 = .512。
 * κ = 0 是普通贪心（1.6384 / 0）；κ 越大，正则越把已见门的估值推向记录中常见的前进。 */
(() => {
  /* 记录：[状态, 动作(0 退出 / 1 前进), 条数, 奖励, 后继(−1 为终止)]。 */
  const REC = [[0, 0, 25, 1, -1], [0, 1, 100, 0, 1], [0, 1, 25, 0, -1], [1, 0, 25, 1, -1], [1, 1, 60, 0, 2], [1, 1, 15, 0, -1], [2, 0, 10, 1, -1], [2, 1, 40, 0, 3], [2, 1, 10, 0, -1], [3, 0, 40, 1, -1]];
  const NTOT = 350, P = 0.8;
  const model = {
    REC,
    /* 可分段运行的训练器：run(n) 再走 n 步，Q[2s + a] 为当前估值。 */
    trainer(kappa, steps = 10000, lr = 0.2, sync = 20) {
      const Q = new Float64Array([1, 5, 1, 5, 1, 5, 1, 5]), T = Float64Array.from(Q), G = new Float64Array(8);
      const S = REC.map((r) => r[0]), A = REC.map((r) => r[1]), W = REC.map((r) => r[2] / NTOT), R = REC.map((r) => r[3]), SP = REC.map((r) => r[4]);
      let k = 0;
      return {
        Q, get done() { return k >= steps; },
        run(n) {
          for (const end = Math.min(steps, k + n); k < end; k++) {
            G.fill(0);
            for (let i = 0; i < S.length; i++) {
              const s = 2 * S[i], j = s + A[i], w = W[i], sp = SP[i];
              const y = R[i] + (sp >= 0 ? Math.max(T[2 * sp], T[2 * sp + 1]) : 0);
              const q0 = Q[s], q1 = Q[s + 1], mx = q0 > q1 ? q0 : q1, e0 = Math.exp(q0 - mx), e1 = Math.exp(q1 - mx), kz = (kappa * w) / (e0 + e1);
              G[j] += w * (Q[j] - y) - kappa * w; G[s] += kz * e0; G[s + 1] += kz * e1;
            }
            for (let j = 0; j < 8; j++) Q[j] -= lr * G[j];
            if ((k + 1) % sync === 0) T.set(Q);
          }
          return this;
        },
      };
    },
    train(kappa, steps = 10000, lr = 0.2, sync = 20) { return model.trainer(kappa, steps, lr, sync).run(steps).Q; },
    policy(Q) { return [0, 1, 2, 3].map((s) => (Q[2 * s + 1] > Q[2 * s] ? 1 : 0)); },
    trueReturn(act, B) { let pr = 1; for (let i = 0; i < 4; i++) { if (!act[i]) return pr; pr *= P; } return pr * B; },
    KAPPAS: [0, 0.01, 0.02, 0.03, 0.05, 0.075, 0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2],
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('offline-cql', (ctx) => {
    const { el, fmt } = ctx, K = model.KAPPAS;
    let ki = K.indexOf(0.25);
    const cache = new Map(), f3 = (x) => fmt(x, 3);
    const get = (k) => { if (!cache.has(k)) cache.set(k, model.train(k)); return cache.get(k); };
    const CHUNK = 2500;
    const kS = ctx.slider({ label: '正则系数 κ', min: 0, max: K.length - 1, step: 1, value: ki, format: (i) => fmt(K[i], K[i] < 0.1 && K[i] > 0 ? 3 : 2), oninput: (i) => { ki = i; ctx.redraw(); show(); } });
    const read = ctx.readout(), stepsBox = ctx.steps();
    const left = el('div'), right = el('div');
    ctx.stage.append(ctx.row(kS.node), el('div', { class: 'demo-grid2' }, left, right), read, stepsBox.node);

    /* 各 κ 的训练分帧完成，每帧 2500 步。 */
    let pending = K.filter((k) => k !== K[ki]), cur = null;
    const job = ctx.loop(() => {
      if (!cur) { const k = pending.shift(); if (k == null) return false; if (cache.has(k)) return true; cur = { k, t: model.trainer(k) }; }
      cur.t.run(CHUNK);
      if (cur.t.done) { cache.set(cur.k, cur.t.Q); cur = null; ctx.redraw(); }
      return pending.length > 0 || cur != null;
    });
    job.start();

    ctx.canvas({
      parent: left, aspect: 0.8, maxHeight: 280, minHeight: 200, label: '四道门退出与前进的 CQL 估值',
      draw(G, w, h) {
        const C = ctx.colors(), Q = get(K[ki]), act = model.policy(Q);
        const Pp = ctx.plot(G, w, h, { series: [], xmin: 0, xmax: 4, ymin: -3.5, ymax: 5.2, xticks: 0, xlabel: '', ylabel: '估值', pad: { l: 40, b: 26 }, hlines: [{ y: 0, color: C.rule }] });
        const bw = (Pp.X(1) - Pp.X(0)) * 0.3;
        for (let s = 0; s < 4; s++) {
          const xc = Pp.X(s + 0.5);
          [[0, C.series[3], -bw - 1], [1, s === 3 ? C.series[2] : C.series[0], 1]].forEach(([a, col, dx]) => {
            const v = Math.max(-3.5, Q[2 * s + a]), y0 = Pp.Y(0), y1 = Pp.Y(v);
            G.fillStyle = act[s] === a ? col : ctx.mix(C.surface, col, 0.4); G.fillRect(xc + dx, Math.min(y0, y1), bw, Math.max(1.5, Math.abs(y1 - y0)));
            G.strokeStyle = ctx.mix(C.surface, col, 0.8); G.lineWidth = 1; G.setLineDash([3, 3]); G.strokeRect(xc + dx, Math.min(y0, Pp.Y(a ? 5 : 1)), bw, Math.abs(Pp.Y(a ? 5 : 1) - y0)); G.setLineDash([]);
          });
          G.fillStyle = C.ink; G.font = ctx.font(11.5, 600); G.textAlign = 'center'; G.textBaseline = 'top'; G.fillText(`x${'₀₁₂₃'[s]}`, xc, h - Pp.P.b + 6);
        }
      },
    });
    left.append(ctx.legend([['var(--d4)', '退出'], ['var(--d1)', '前进'], ['var(--d3)', '末门前进（无记录）'], ['var(--muted)', '虚框：训练前 (1, 5)；实色为贪心动作']]));

    ctx.canvas({
      parent: right, aspect: 0.8, maxHeight: 280, minHeight: 200, label: '起点回报随正则系数的变化',
      draw(G, w, h) {
        const C = ctx.colors(), w1 = [], w2 = [];
        K.forEach((k, i) => { if (!cache.has(k)) return; const a = model.policy(cache.get(k)); w1.push([i, model.trueReturn(a, 4)]); w2.push([i, model.trueReturn(a, 0)]); });
        const Pp = ctx.plot(G, w, h, { series: [{ data: w2, color: C.series[2], width: 2.2 }, { data: w1, color: C.series[0], width: 2.2, dash: [6, 3] }], xmin: 0, xmax: K.length - 1, ymin: -0.1, ymax: 1.9, xticks: 0, xlabel: 'κ（0 到 2，非等距）', ylabel: '起点回报', pad: { l: 40 } });
        G.fillStyle = C.muted; G.font = ctx.font(11); G.textAlign = 'center'; G.textBaseline = 'top';
        [0, 0.1, 0.25, 0.5, 1, 2].forEach((k) => G.fillText(String(k).replace('0.', '.'), Pp.X(K.indexOf(k)), h - Pp.P.b + 6));
        G.save(); G.strokeStyle = C.ink; G.setLineDash([2, 3]); G.beginPath(); G.moveTo(Pp.X(ki), Pp.P.t); G.lineTo(Pp.X(ki), h - Pp.P.b); G.stroke(); G.restore();
      },
    });
    right.append(ctx.legend([['var(--d1)', '世界一：末门奖 4'], ['var(--d3)', '世界二：末门奖 0']]));

    function show() {
      const k = K[ki], Q = get(k), act = model.policy(Q), r1 = model.trueReturn(act, 4), r2 = model.trueReturn(act, 0);
      read.innerHTML = `κ = ${k}：贪心动作 ${act.map((a) => (a ? '前' : '退')).join(' ')}；起点回报 世界一 <b>${fmt(r1, 4)}</b>，世界二 <b>${fmt(r2, 4)}</b>，较差者 <b>${fmt(Math.min(r1, r2), 4)}</b>`;
      const sm = (s) => { const a = Q[2 * s], b = Q[2 * s + 1], mx = Math.max(a, b); return Math.exp(b - mx) / (Math.exp(a - mx) + Math.exp(b - mx)); };
      stepsBox.set([
        ['每条记录的损失：TD 回归加正则', '½(Q(s,a) − y)^2 + κ[log Σ_{a\'} e^{Q(s,a\')} − Q(s,a)]'],
        ['正则对 $Q(s,a)$ 的梯度', 'κ[softmax(Q(s,·))_a − b_D(a|s)]'],
        ['经验动作频率 $b_D$(前进)', 'x_0: 125/150,　x_1: 75/100,　x_2: 50/60,　x_3: 0/40'],
        ['训练后 $x_2$', `Q = (${f3(Q[4])}, ${f3(Q[5])})，softmax(前进) = ${f3(sm(2))}，b_D = .833`],
        ['训练后 $x_3$：前进只有正则、没有 TD 项', `Q = (${f3(Q[6])}, ${f3(Q[7])})，正则梯度 κ(${f3(sm(3))} − 0) ≥ 0`],
        ['放回真实走廊', { html: ctx.m('J = ') + `<b>${fmt(r1, 4)}</b>` + ctx.m('（B = 4），') + `<b>${fmt(r2, 4)}</b>` + ctx.m('（B = 0）') }],
      ], `计算过程　κ = ${k}，训练 10⁴ 步`);
    }
    show();
  });
})();
