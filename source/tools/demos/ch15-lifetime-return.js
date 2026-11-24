/* 第 15 章：仓库里两个只在询问时刻上不同的学习器，同一条 lifetime 上的累计奖励、期望全程回报 J_T 与遗憾分解。
 * 对应 15.1 节“仓库中的两个学习器”与 15.3 节“全程回报的分解”：
 * 指示左右交替时 16 步累计甲 20、乙 13；期望 J_T 在 T=2,3,4,8,16,40 为甲 0,4,4,8,20,52，乙 2,5/2,5/2,5,14,46；
 * J°_T = 4⌊(T+1)/3⌋，r* = 4/3；T=16 时遗憾甲 4/3、乙 22/3，边界项 4/3，学习代价甲 0、乙 6；总向左 J_16 = 331/32。 */
(() => {
  const D = 0, J = 1, B = 2, W = 3, C = 4;
  const RSTAR = 4 / 3;
  /* askTrip：第几趟在转角询问；0 表示一开始就知道灯义，Infinity 表示从不询问（总向左）。 */
  const init = (askTrip) => ({ pos: D, light: 0, learned: askTrip === 0, trip: 0 });
  /* 一步。light 取 0（左）或 1（右）；newLight 只在仓库出发时用到。返回 {r, s, kind}。 */
  function step(s, askTrip, newLight) {
    const n = { ...s };
    switch (s.pos) {
      case D: n.pos = J; n.trip = s.trip + 1; n.light = newLight; return { r: 0, s: n, kind: 'depart' };
      case J:
        if (!s.learned && s.trip === askTrip) { n.learned = true; return { r: 0, s: n, kind: 'ask' }; }
        if ((s.learned ? s.light : 0) === s.light) { n.pos = B; return { r: 4, s: n, kind: 'deliver' }; }
        n.pos = W; return { r: 0, s: n, kind: 'wrong' };
      case W: n.pos = C; return { r: 1, s: n, kind: 'detour' };
      case C: n.pos = B; return { r: 0, s: n, kind: 'detour' };
      default: n.pos = D; return { r: 0, s: n, kind: 'back' };
    }
  }
  /* 一条样本路径：lightOf(k) 给第 k 趟的灯。cum[t] 是前 t 步的累计奖励，kinds[t-1] 是第 t 步的类别。 */
  function path(askTrip, lightOf, T) {
    let s = init(askTrip), tot = 0;
    const cum = [0], kinds = [], rew = [];
    for (let t = 0; t < T; t++) {
      const q = step(s, askTrip, s.pos === D ? lightOf(s.trip + 1) : 0);
      tot += q.r; cum.push(tot); kinds.push(q.kind); rew.push(q.r); s = q.s;
    }
    return { cum, kinds, rew };
  }
  /* 期望全程回报：对每趟左右各半的灯，按 (位置, 灯, 是否已学会, 趟次) 的分布向前推。J[T] 为前 T 步的期望奖励和。 */
  function expected(askTrip, T) {
    const key = (s) => `${s.pos}|${s.light}|${s.learned ? 1 : 0}|${Math.min(s.trip, 99)}`;
    let dist = new Map([[key(init(askTrip)), [init(askTrip), 1]]]);
    const Jt = [0];
    let tot = 0;
    for (let t = 0; t < T; t++) {
      const nd = new Map();
      for (const [s, p] of dist.values()) {
        const outs = s.pos === D ? [[0, 0.5], [1, 0.5]] : [[0, 1]];
        for (const [lt, pl] of outs) {
          const q = step(s, askTrip, lt), w = p * pl;
          tot += w * q.r;
          const k = key(q.s), cur = nd.get(k);
          if (cur) cur[1] += w; else nd.set(k, [q.s, w]);
        }
      }
      dist = nd; Jt.push(tot);
    }
    return Jt;
  }
  const jOpt = (T) => 4 * Math.floor((T + 1) / 3);
  const alternating = (k) => (k % 2 === 1 ? 0 : 1);
  const model = { D, J, B, W, C, RSTAR, init, step, path, expected, jOpt, alternating };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  /* 分母为 3·2^k（k ≤ 10）以内的数写成分数。 */
  const frac = (x) => {
    if (Math.abs(x) < 1e-9) return '0';
    for (const q of [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048, 3072]) {
      const p = Math.round(x * q);
      if (Math.abs(x * q - p) < 1e-7) return q === 1 ? String(p).replace('-', '−') : `${p < 0 ? '−' : ''}${Math.abs(p)}/${q}`;
    }
    return x.toFixed(2).replace('-', '−');
  };
  const dec = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? '' : `≈${x.toFixed(2).replace('-', '−')}`);
  const TMAX = 40;
  const ASK = [['1', '第 1 趟'], ['2', '第 2 趟'], ['3', '第 3 趟'], ['4', '第 4 趟'], ['never', '不问']];
  const toTrip = (v) => (v === 'never' ? Infinity : +v);
  const tripText = (a) => (a === Infinity ? '从不询问（总向左）' : `第 ${a} 趟询问`);

  RLDemo.register('ch15-lifetime-return', (ctx) => {
    const { el } = ctx;
    let askA = 1, askB = 3, T = 16, lights = 'alt', seed = 1, view = 'J';
    let lightSeq = [], EA, EB, PA, PB;
    const EO = Array.from({ length: TMAX + 1 }, (_, t) => jOpt(t));

    function makeLights() {
      if (lights === 'alt') { lightSeq = Array.from({ length: TMAX + 2 }, (_, i) => alternating(i)); return; }
      const rnd = ctx.rng(seed);
      lightSeq = Array.from({ length: TMAX + 2 }, () => (rnd() < 0.5 ? 0 : 1));
    }
    function recompute() {
      EA = expected(askA, TMAX); EB = expected(askB, TMAX);
      PA = path(askA, (k) => lightSeq[k], TMAX); PB = path(askB, (k) => lightSeq[k], TMAX);
    }

    const segA = ctx.segmented(ASK, '1', (v) => { askA = toTrip(v); recompute(); update(); }, '甲在第几趟询问');
    const segB = ctx.segmented(ASK, '3', (v) => { askB = toTrip(v); recompute(); update(); }, '乙在第几趟询问');
    const segL = ctx.segmented([['alt', '左右交替'], ['rand', '随机']], 'alt', (v) => { lights = v; makeLights(); recompute(); update(); }, '样本路径上的灯');
    const reseed = ctx.button('换一组灯', () => { seed += 1; lights = 'rand'; segL.set('rand'); makeLights(); recompute(); update(); });
    const tS = ctx.slider({ label: 'lifetime T', min: 1, max: TMAX, step: 1, value: T, format: (x) => String(x), oninput: (x) => { T = x; update(); } });
    const segV = ctx.segmented([['J', '期望全程回报'], ['R', '遗憾']], 'J', (v) => { view = v; update(); }, '下图纵轴');
    const lab = (t) => el('span', { class: 'demo-note', text: t, style: 'margin:0' });

    const pathBox = el('div'), plotBox = el('div');
    const read = ctx.readout();
    const box = ctx.steps('lifetime T 处的分解');
    ctx.stage.append(
      ctx.row(lab('甲'), segA.node), ctx.row(lab('乙'), segB.node),
      ctx.row(lab('灯'), segL.node, reseed),
      pathBox,
      ctx.legend([['var(--d2)', '询问'], ['var(--d4)', '交货 +4'], ['var(--warn)', '走反后的绕行（含 +1）'], ['var(--line)', '出发、回仓']]),
      ctx.row(tS.node, segV.node), plotBox, read, box.node);

    /* 上图：两行逐步格，每格一步，右端是到 T 步的累计。 */
    ctx.canvas({
      parent: pathBox, aspect: 0.2, maxHeight: 150, minHeight: 118,
      label: '样本路径：甲、乙逐步的动作类别与累计奖励，灯序列见上方的选择',
      draw(g, w, h) {
        const Cc = ctx.colors();
        const L = 30, R = 46, top = 20, rowH = Math.min(30, (h - top - 18) / 2);
        const cw = (w - L - R) / TMAX;
        g.font = ctx.font(11); g.textBaseline = 'middle';
        // 灯：每趟出发那一步标出左右
        g.fillStyle = Cc.muted; g.textAlign = 'right'; g.fillText('灯', L - 6, top / 2 + 1);
        const colorOf = (k) => (k === 'ask' ? Cc.series[1] : k === 'deliver' ? Cc.series[3] : k === 'wrong' || k === 'detour' ? Cc.warn : Cc.line);
        [[PA, '甲'], [PB, '乙']].forEach(([P, name], row) => {
          const y = top + row * (rowH + 4);
          g.fillStyle = Cc.ink; g.textAlign = 'right'; g.font = ctx.font(12, 600); g.fillText(name, L - 6, y + rowH / 2);
          for (let t = 0; t < TMAX; t++) {
            const x = L + t * cw;
            g.globalAlpha = t < T ? (P.kinds[t] === 'wrong' || P.kinds[t] === 'detour' ? 0.45 : 1) : 0.18;
            g.fillStyle = colorOf(P.kinds[t]);
            g.fillRect(x + 0.5, y, Math.max(1, cw - 1), rowH);
            g.globalAlpha = 1;
          }
          g.fillStyle = Cc.ink; g.textAlign = 'left'; g.font = ctx.font(12, 700, true);
          g.fillText(String(P.cum[T]), w - R + 6, y + rowH / 2);
        });
        // 每趟出发的一步上方写灯
        g.font = ctx.font(cw >= 11 ? 10 : 8, 600); g.textAlign = 'center';
        let trip = 0;
        const s0 = PA.kinds; // 用甲的出发格标灯：灯属于趟，两者同一趟的灯相同
        for (let t = 0; t < TMAX; t++) {
          if (s0[t] !== 'depart') continue;
          trip += 1;
          g.fillStyle = t < T ? Cc.soft : Cc.faint;
          g.fillText(lightSeq[trip] ? '右' : '左', L + (t + 0.5) * cw, top / 2 + 1);
        }
        // T 处竖线
        const xT = L + T * cw;
        g.strokeStyle = Cc.accent; g.lineWidth = 1.5; g.beginPath(); g.moveTo(xT, top - 4); g.lineTo(xT, top + 2 * rowH + 8); g.stroke();
        g.fillStyle = Cc.muted; g.font = ctx.font(10); g.textAlign = 'center'; g.textBaseline = 'top';
        for (const t of [10, 20, 30, 40]) g.fillText(String(t), L + (t - 0.5) * cw, top + 2 * rowH + 8);
      },
    });

    /* 下图：期望全程回报（或遗憾）随 lifetime 的变化。 */
    ctx.canvas({
      parent: plotBox, aspect: 0.56, maxHeight: 340, minHeight: 220,
      label: '期望全程回报或遗憾随 lifetime T 的变化：甲、乙、从头随灯的参照台阶与直线 T·r*',
      draw(g, w, h) {
        const Cc = ctx.colors();
        const xs = Array.from({ length: TMAX + 1 }, (_, t) => t);
        const stair = (arr) => { const out = []; arr.forEach((y, t) => { if (t) out.push([t, arr[t - 1]]); out.push([t, y]); }); return out; };
        let series, ymin, ymax;
        if (view === 'J') {
          series = [
            { data: xs.map((t) => [t, RSTAR * t]), color: Cc.muted, dash: [5, 4], width: 1.2 },
            { data: stair(EO), color: Cc.faint, width: 3 },
            { data: stair(EB), color: Cc.series[1], width: 2, dash: [6, 3] },
            { data: stair(EA), color: Cc.series[3], width: 2.2 },
          ];
          ymin = 0; ymax = 56;
        } else {
          const reg = (arr) => stair(arr.map((y, t) => RSTAR * t - y));
          series = [
            { data: reg(EO), color: Cc.faint, width: 3 },
            { data: reg(EB), color: Cc.series[1], width: 2, dash: [6, 3] },
            { data: reg(EA), color: Cc.series[3], width: 2.2 },
          ];
          const all = [EA, EB, EO].flatMap((a) => a.map((y, t) => RSTAR * t - y));
          ymin = Math.min(-2, Math.floor(Math.min(...all))); ymax = Math.max(10, Math.ceil(Math.max(...all)) + 1);
        }
        const P = ctx.plot(g, w, h, {
          series, xmin: 0, xmax: TMAX, ymin, ymax, xticks: 4, yticks: 5, pad: { l: 40, b: 32, r: 12 },
          xlabel: 'lifetime T（原始步）', ylabel: view === 'J' ? '期望全程回报' : '遗憾',
          hlines: view === 'R' ? [{ y: 0, color: Cc.line }] : [],
        });
        g.strokeStyle = Cc.accent; g.lineWidth = 1; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(P.X(T), P.P.t); g.lineTo(P.X(T), h - P.P.b); g.stroke(); g.setLineDash([]);
        const yA = view === 'J' ? EA[T] : RSTAR * T - EA[T], yB = view === 'J' ? EB[T] : RSTAR * T - EB[T];
        for (const [y, c] of [[yA, Cc.series[3]], [yB, Cc.series[1]]]) {
          g.fillStyle = c; g.beginPath(); g.arc(P.X(T), P.Y(y), 4, 0, 2 * Math.PI); g.fill();
        }
      },
    });
    plotBox.append(ctx.legend([['var(--d4)', '甲（期望）'], ['var(--d2)', '乙（期望）'], ['var(--faint)', '从头随灯 J°'], ['var(--muted)', 'T·r*，r* = 4/3']]));

    function update() {
      const jo = EO[T], ts = RSTAR * T, bd = ts - jo;
      const a = EA[T], b = EB[T];
      read.innerHTML = `T = <b>${T}</b>　期望全程回报：甲 <b>${frac(a)}</b>，乙 <b>${frac(b)}</b>，差 <b>${frac(a - b)}</b>` +
        `<br>这一组灯下的一次运行：甲 <b>${PA.cum[T]}</b>，乙 <b>${PB.cum[T]}</b>（${lights === 'alt' ? '指示左、右、左、右……' : '随机灯，种子 ' + seed}）`;
      box.set([
        ['从头随灯的参照台阶与直线', `J°_T = 4⌊(T+1)/3⌋ = ${frac(jo)},　T·r* = 4T/3 = ${frac(ts)}`],
        ['边界项只看 T，与学习器无关', `T·r* - J°_T = ${frac(bd)}`],
        [`甲${tripText(askA)}：学习代价与遗憾`, { html: ctx.m(`J°_T - J_T = ${frac(jo - a)},　T·r* - J_T = ${frac(ts - a)}`) + ` <span class="demo-note">${dec(ts - a)}</span>` }],
        [`乙${tripText(askB)}：学习代价与遗憾`, { html: ctx.m(`J°_T - J_T = ${frac(jo - b)},　T·r* - J_T = ${frac(ts - b)}`) + ` <span class="demo-note">${dec(ts - b)}</span>` }],
        ['边界项相同，遗憾之差等于全程回报之差', `(T·r* - J_T(乙)) - (T·r* - J_T(甲)) = ${frac(a - b)}`],
      ]);
      ctx.redraw();
    }

    makeLights(); recompute(); update();
  });
})();
