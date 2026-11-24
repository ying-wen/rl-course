/* 第 1 章：回报的递推 G_t = R_{t+1} + γG_{t+1}，从回合末尾往前逐步回推，并画各步权重 γ^k。
 * 对应 1.3 节“回报与目标”“回报的递推”：冰面右路 (0, 4)；连续六步的左路 (1,…,1) 与右路 (0,4,0,4,0,4)；
 * 1.2 节的按钮每步得 10（这里截成 20 步）。 */
(() => {
  const PRESETS = {
    right: { label: '冰面右路', r: [0, 4], gamma: 0.9, ymax: 5 },
    left6: { label: '左路六步', r: [1, 1, 1, 1, 1, 1], gamma: 0.3, ymax: 5 },
    right6: { label: '右路六步', r: [0, 4, 0, 4, 0, 4], gamma: 0.3, ymax: 5 },
    button: { label: '按钮 20 步', r: Array(20).fill(10), gamma: 0.9, ymax: 10 },
  };
  const model = {
    PRESETS,
    /* r[t] 是 R_{t+1}（t = 0…T−1）；返回 G[0…T]，约定 G[T] = 0。 */
    returns(r, g) {
      const T = r.length, G = new Array(T + 1).fill(0);
      for (let t = T - 1; t >= 0; t--) G[t] = r[t] + g * G[t + 1];
      return G;
    },
    /* 按定义直接求和：G_t = Σ_k γ^k R_{t+k+1}。 */
    direct(r, g, t = 0) {
      let s = 0;
      for (let k = 0; t + k < r.length; k++) s += g ** k * r[t + k];
      return s;
    },
    weightSum(g, n) { let s = 0; for (let k = 0; k < n; k++) s += g ** k; return s; },
    /* 权重 γ^k 第一次低于 eps 的 k。 */
    horizon(g, eps = 0.1) {
      if (g <= eps) return 1;
      if (g >= 1) return Infinity;
      return Math.floor(Math.log(eps) / Math.log(g)) + 1;
    },
  };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  /* 课程数字写法：.9、3.6、−.25；最多 d 位小数，去掉末尾的 0。 */
  const num = (x, d = 3) => {
    if (!Number.isFinite(x)) return '∞';
    let s = x.toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace(/^(-?)0\./, '$1.').replace('-', '−');
  };

  RLDemo.register('return-recursion', (ctx) => {
    const { el } = ctx;
    let key = 'right', r = PRESETS[key].r.slice(), gamma = PRESETS[key].gamma, ymax = PRESETS[key].ymax;
    let c = r.length; // 已知 G_c…G_T；c = T 时只知道 G_T = 0

    const preset = ctx.segmented(Object.entries(PRESETS).map(([k, p]) => [k, p.label]), key, (k) => {
      key = k; r = PRESETS[k].r.slice(); ymax = PRESETS[k].ymax; gamma = PRESETS[k].gamma; gs.value = gamma;
      c = r.length; auto.stop(); update();
    }, '奖励序列');
    preset.node.querySelectorAll('button').forEach((b) => { b.style.padding = '.5em .6em'; b.style.whiteSpace = 'nowrap'; });
    const gs = ctx.slider({ label: '折扣 γ', min: 0, max: 1, step: 0.01, value: gamma, format: (x) => num(x, 2), oninput: (x) => { gamma = x; update(); } });
    const back = () => { if (c > 0) c -= 1; update(); return c > 0; };
    const stepBtn = ctx.button('回推一步', () => { auto.stop(); back(); }, true);
    const autoBtn = ctx.button('连续', () => (auto.running ? auto.stop() : (c === 0 && (c = r.length), auto.start())));
    const resetBtn = ctx.button('从末尾重来', () => { auto.stop(); c = r.length; update(); });
    let acc = 0;
    const auto = ctx.loop((dt) => {
      acc += dt;
      const gap = Math.max(0.25, Math.min(0.7, 6 / r.length)) * (ctx.reduced() ? 2.5 : 1);
      if (acc < gap) return true;
      acc = 0;
      return back();
    });
    const _start = auto.start;
    auto.start = () => { autoBtn.textContent = '暂停'; acc = 0; _start(); };
    auto.onstop = () => (autoBtn.textContent = '连续');

    const read = ctx.readout();
    const stepsBox = ctx.steps();
    const top = el('div'), bottom = el('div');
    ctx.stage.append(ctx.row(preset.node), ctx.row(gs.node), top, ctx.row(stepBtn, autoBtn, resetBtn), read, bottom, stepsBox.node);

    /* 上图：节点 t = 0…T 上是回报 G_t 的方框，相邻节点之间的柱是奖励 R_{t+1}；
     * 浅色柱是 R_{t+1}，深色部分是它对 G_0 的贡献 γ^t R_{t+1}。 */
    let lay = null;
    const cv = ctx.canvas({
      parent: top, aspect: 0.42, maxHeight: 300, minHeight: 230, label: '奖励序列与从末尾回推的回报',
      draw(g, w, h) {
        const C = ctx.colors(), T = r.length, G = model.returns(r, gamma);
        const L = 44, R = 12, sp = (w - L - R) / (T + 1);
        const nodeX = (t) => L + sp * (t + 0.5), barX = (t) => L + sp * (t + 1);
        const ymin = -ymax / 5, top0 = 16, bot0 = h * 0.56;
        const Y = (y) => top0 + (1 - (y - ymin) / (ymax - ymin)) * (bot0 - top0);
        lay = { barX, sp, Y, ymin, top0, bot0, T };
        // 纵轴刻度
        g.font = ctx.font(11); g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.strokeStyle = C.line; g.lineWidth = 1;
        for (const v of [0, ymax / 2, ymax]) {
          g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - R, Y(v)); g.stroke();
          g.fillText(num(v), L - 6, Y(v));
        }
        g.save(); g.translate(9, (top0 + bot0) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center';
        g.fillText('奖励', 0, 0); g.restore();
        const bw = Math.min(34, sp * 0.62);
        for (let t = 0; t < T; t++) {
          const x = barX(t), v = r[t], cvv = gamma ** t * v;
          g.fillStyle = C.accentSoft; g.fillRect(x - bw / 2, Math.min(Y(0), Y(v)), bw, Math.abs(Y(v) - Y(0)));
          g.fillStyle = C.accent; g.fillRect(x - bw / 2 + 3, Math.min(Y(0), Y(cvv)), bw - 6, Math.abs(Y(cvv) - Y(0)));
          if (t === c) { g.strokeStyle = C.series[2]; g.lineWidth = 2; g.strokeRect(x - bw / 2 - 2, Math.min(Y(0), Y(v)) - 2, bw + 4, Math.abs(Y(v) - Y(0)) + 4); }
          g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'bottom';
          if (sp >= 20) { g.font = ctx.font(11, 600, true); g.fillText(num(v), x, Math.min(Y(0), Y(v)) - 3); }
          if (sp >= 26 || t % 5 === 0 || t === T - 1) {
            g.font = ctx.font(11); g.fillStyle = C.muted; g.textBaseline = 'top';
            g.fillText('R' + sub(t + 1), x, Y(ymin) + 3);
          }
        }
        g.strokeStyle = C.rule; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(w - R, Y(0)); g.stroke();
        // 回报方框
        const by = h * 0.76, bh = Math.min(34, h * 0.14), boxW = Math.min(64, sp * 0.92);
        const showNum = (t) => sp >= 30 || t === c || t === 0 || t === T;
        for (let t = 0; t <= T; t++) {
          const x = nodeX(t), known = t >= c;
          g.fillStyle = t === c && c < T ? C.accentSoft : known ? C.tint : C.surface;
          g.strokeStyle = t === c ? C.series[2] : C.rule; g.lineWidth = t === c ? 2 : 1;
          g.fillRect(x - boxW / 2, by, boxW, bh); g.strokeRect(x - boxW / 2, by, boxW, bh);
          g.textAlign = 'center'; g.textBaseline = 'middle';
          if (known && showNum(t)) { g.fillStyle = C.ink; g.font = ctx.font(Math.min(13, boxW / 4.2), 600, true); g.fillText(num(G[t], 3), x, by + bh / 2); }
          else if (!known && showNum(t)) { g.fillStyle = C.faint || C.muted; g.font = ctx.font(12); g.fillText('?', x, by + bh / 2); }
          if (sp >= 26 || t % 5 === 0 || t === T) {
            g.fillStyle = C.muted; g.font = ctx.font(11); g.textBaseline = 'top';
            g.fillText('G' + sub(t), x, by + bh + 4);
          }
        }
        // 本步的箭头：G_{c+1} ——×γ, +R_{c+1}——> G_c
        if (c < T) {
          const x1 = nodeX(c + 1) - boxW / 2, x0 = nodeX(c) + boxW / 2, yy = by - 9;
          g.strokeStyle = C.series[2]; g.fillStyle = C.series[2]; g.lineWidth = 1.8;
          g.beginPath(); g.moveTo(x1, yy); g.lineTo(x0 + 4, yy); g.stroke();
          g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + 7, yy - 4); g.lineTo(x0 + 7, yy + 4); g.closePath(); g.fill();
          if (sp >= 44) { g.font = ctx.font(11, 600); g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('×γ +R' + sub(c + 1), (x0 + x1) / 2, yy - 2); }
        }
      },
    });
    cv.cv.style.cursor = 'pointer';
    cv.cv.addEventListener('click', (e) => {
      if (!lay) return;
      const b = cv.cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      if (y < lay.top0 - 8 || y > lay.bot0 + 8) return;
      const t = Math.round((x - lay.barX(0)) / lay.sp);
      if (t < 0 || t >= lay.T) return;
      const v = lay.ymin + (1 - (y - lay.top0) / (lay.bot0 - lay.top0)) * (ymax - lay.ymin);
      r[t] = Math.max(Math.round(lay.ymin), Math.min(ymax, Math.round(v)));
      c = r.length; auto.stop(); update();
    });

    /* 下图：权重 γ^k 随 k 的变化，与 γ = .5、.99 对照；虚横线是 .1。 */
    ctx.canvas({
      parent: bottom, aspect: 0.32, maxHeight: 220, minHeight: 170, label: '各步折扣权重 γ 的 k 次方',
      draw(g, w, h) {
        const C = ctx.colors(), K = 40;
        const line = (gg) => Array.from({ length: K + 1 }, (_, k) => [k, gg ** k]);
        const P = ctx.plot(g, w, h, {
          series: [
            { data: line(0.99), color: C.muted, dash: [5, 4], width: 1.2 },
            { data: line(0.5), color: C.muted, dash: [2, 3], width: 1.2 },
            { data: line(gamma), color: C.accent, width: 2.2 },
          ],
          xmin: 0, xmax: K, ymin: 0, ymax: 1, xlabel: '晚到的步数 k', ylabel: '权重', xticks: 4, yticks: 2, pad: { l: 40, b: 32 },
          hlines: [{ y: 0.1, color: C.muted, label: '.1' }],
        });
        // 本序列用到的 k = 0…T−1 画实心点
        g.fillStyle = C.accent;
        for (let k = 0; k < Math.min(r.length, K + 1); k++) { g.beginPath(); g.arc(P.X(k), P.Y(gamma ** k), 3, 0, 7); g.fill(); }
        const H = model.horizon(gamma);
        if (Number.isFinite(H) && H <= K) {
          g.strokeStyle = C.series[2]; g.setLineDash([3, 3]); g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(P.X(H), P.Y(0)); g.lineTo(P.X(H), P.Y(1)); g.stroke(); g.setLineDash([]);
          g.fillStyle = C.series[2]; g.font = ctx.font(11, 600); g.textAlign = H > K * 0.7 ? 'right' : 'left'; g.textBaseline = 'top';
          g.fillText(`k = ${H}`, P.X(H) + (H > K * 0.7 ? -4 : 4), P.Y(1) + 2);
        }
      },
    });
    bottom.append(ctx.legend([['var(--accent)', 'γᵏ（当前 γ，实心点是本序列用到的 k）'], ['var(--muted)', 'γ = .99（长虚线）与 γ = .5（短虚线）'], ['var(--d3)', '权重第一次低于 .1 的 k']]));

    function sub(n) { return String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]); }

    function update() {
      const T = r.length, G = model.returns(r, gamma), D = model.direct(r, gamma, 0), H = model.horizon(gamma);
      read.innerHTML = (c === 0
        ? `回推完成：G<sub>0</sub> = <b>${num(G[0])}</b>，与按定义直接求和的 ${num(D)} 相同。`
        : `已知 G<sub>${c}</sub>…G<sub>${T}</sub>，还差 ${c} 步回到 G<sub>0</sub>（直接求和 G<sub>0</sub> = ${num(D)}）。`) +
        `<br>前 ${T} 步的权重和 Σγ<sup>k</sup> = <b>${num(model.weightSum(gamma, T))}</b>` +
        (gamma < 1 ? `；无限步时为 1/(1−γ) = <b>${num(1 / (1 - gamma), 2)}</b>` : '；γ = 1 时无限步的权重和发散') +
        `；权重 γ<sup>k</sup> 第一次低于 .1：<b>${Number.isFinite(H) ? 'k = ' + H : '不会'}</b>。` +
        '<br><span class="demo-note">点上图奖励柱所在的列，可把这一步的奖励改成点击高度处的整数。</span>';
      showSteps(G);
      ctx.redraw();
    }

    function showSteps(G) {
      const T = r.length, gm = num(gamma, 2), lines = [];
      lines.push([`回合在 $T$ = ${T} 终止，约定`, `G_{${T}} = 0`]);
      lines.push(['递推（对每条轨迹逐点成立）', 'G_t = R_{t+1} + γG_{t+1}']);
      const done = [];
      for (let t = T - 1; t >= c; t--) done.push(t);
      const shown = done.slice(-3);
      if (done.length > shown.length) lines.push([`（前 ${done.length - shown.length} 步已算完，从略）`, null]);
      for (const t of shown) {
        lines.push([`$t$ = ${t}`, { html: ctx.m(`G_{${t}} = R_{${t + 1}} + γG_{${t + 1}} = ${num(r[t])} + ${gm}×${num(G[t + 1])} = `) + `<b>${num(G[t])}</b>` }]);
      }
      if (c === T) lines.push(['点“回推一步”，从 $G_{' + T + '}$ 往前算 $G_{' + (T - 1) + '}$', null]);
      if (c === 0) {
        const term = (k) => (k === 0 ? num(r[0]) : `${gm}^{${k}}×${num(r[k])}`.replace('^{1}', ''));
        const terms = T <= 6 ? r.map((_, k) => term(k)).join(' + ') : `${term(0)} + ${term(1)} + ${term(2)} + … + ${term(T - 1)}`;
        lines.push(['按定义直接求和核对', { html: ctx.m(`G_0 = Σ_{k=0}^{${T - 1}} γ^k R_{k+1} = ${terms} = `) + `<b>${num(model.direct(r, gamma, 0))}</b>` }]);
      }
      stepsBox.set(lines, c < T ? `计算过程　回推到 G${sub(c)}` : '计算过程');
    }
    update();
  });
})();
