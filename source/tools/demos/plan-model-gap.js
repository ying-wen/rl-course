/* 第 8 章：规划把估值推向模型的不动点，真实转移才移动这个不动点（8.2 节“规划更新是学到模型上的 DP 回溯”）。
 * 从 S7 走泥路、在模型中坚持向上：W_{k+1} = .9p̂ + .9(1 − p̂)W_k，不动点 .9p̂/[1 − .9(1 − p̂)]。
 * 正文：p̂ = .2 时 W4 = .470097、W8 = .596430、W16 = .639504，不动点 .642857；干路 .9^5 = .59049；
 * 再记六次打滑，p̂ = 2/16，不动点 .529412，与真实泥路 9/19 = .473684 差 .055728。 */
(() => {
  const G = 0.9, DRY = G ** 5, TRUE_P = 0.1;
  const next = (W, ph) => G * ph + G * (1 - ph) * W;
  const fixed = (ph) => (G * ph) / (1 - G * (1 - ph));
  const TRUE = fixed(TRUE_P); // = 9/19
  function iterate(ph, K, W0 = 0) { const out = [W0]; for (let k = 0; k < K; k++) out.push(next(out[k], ph)); return out; }
  const model = { G, DRY, TRUE_P, TRUE, next, fixed, iterate };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  RLDemo.register('plan-model-gap', (ctx) => {
    const { el, fmt } = ctx, KMAX = 48;
    let nG = 2, nS = 8, hist = [], marks = [];
    const ph = () => nG / (nG + nS);
    function reset() { anim.stop(); nG = 2; nS = 8; gS.value = nG; sS.value = nS; hist = [{ W: 0, q: fixed(ph()) }]; marks = []; ctx.redraw(); show(); }
    function plan() {
      if (hist.length > KMAX) return false;
      const W = hist[hist.length - 1].W; hist.push({ W: next(W, ph()), q: fixed(ph()) }); ctx.redraw(); show();
      return hist.length <= KMAX;
    }
    function counts() { hist[hist.length - 1].q = fixed(ph()); marks.push(hist.length - 1); ctx.redraw(); show(); }
    const gS = ctx.slider({ label: '真实试验中到 G 的次数', min: 0, max: 10, step: 1, value: nG, oninput: (x) => { nG = x; if (nG + nS === 0) { nS = 1; sS.value = 1; } counts(); } });
    const sS = ctx.slider({ label: '真实试验中打滑的次数', min: 0, max: 40, step: 1, value: nS, oninput: (x) => { nS = x; if (nG + nS === 0) { nG = 1; gS.value = 1; } counts(); } });
    const oneBtn = ctx.button('规划一次（期望更新）', () => { anim.stop(); plan(); }, true);
    const runBtn = ctx.button('连续规划', () => (anim.running ? anim.stop() : anim.start()));
    const slipBtn = ctx.button('再记 6 次真实打滑', () => { nS = Math.min(40, nS + 6); sS.value = nS; counts(); });
    const resetBtn = ctx.button('重置', reset);
    let acc = 0;
    const anim = ctx.loop((dt) => { acc += dt * (ctx.reduced() ? 2 : 10); let go = true; while (acc >= 1 && go) { acc -= 1; go = plan(); } return go; });
    anim.onstop = () => (runBtn.textContent = '连续规划');
    const _st = anim.start; anim.start = () => { runBtn.textContent = '暂停'; _st(); };

    const read = ctx.readout(), stepsBox = ctx.steps(), box = el('div');
    ctx.stage.append(box, ctx.row(oneBtn, runBtn, slipBtn, resetBtn), ctx.row(gS.node, sS.node), read, stepsBox.node);
    /* W_k（实线）与当时模型的不动点 q̂（虚线），两条水平参照线：干路 .59049 与真实泥路 .473684 */
    ctx.canvas({
      parent: box, aspect: 0.5, maxHeight: 320, minHeight: 220, label: 'S7 泥路估值随规划次数的变化，以及模型不动点与真实值',
      draw(Gc, w, h) {
        const C = ctx.colors();
        const P = ctx.plot(Gc, w, h, {
          series: [
            { data: hist.map((s, i) => [i, s.q]), color: C.series[1], dash: [6, 4], width: 1.8 },
            { data: hist.map((s, i) => [i, s.W]), color: C.series[0], width: 2.6 },
          ],
          xmin: 0, xmax: KMAX, ymin: 0, ymax: 0.9, xlabel: '规划（期望更新）次数 k', ylabel: 'W_k',
          hlines: [{ y: DRY, label: '干路 .59049', color: C.ink }, { y: TRUE, label: '真实泥路 .473684', color: C.series[2] }],
        });
        Gc.fillStyle = C.series[0];
        const last = hist.length - 1; Gc.beginPath(); Gc.arc(P.X(last), P.Y(hist[last].W), 4.5, 0, 7); Gc.fill();
        Gc.strokeStyle = C.series[1]; Gc.lineWidth = 1;
        for (const k of marks) { Gc.beginPath(); Gc.moveTo(P.X(k), P.Y(0.9)); Gc.lineTo(P.X(k), P.Y(0)); Gc.stroke(); }
      },
    });
    box.append(ctx.legend([['var(--d1)', '规划估值 W_k'], ['var(--d2)', '模型不动点 q̂'], ['var(--ink)', '干路'], ['var(--d3)', '真实泥路'], ['var(--d2)', '竖线：计数改变']]));

    const f6 = (x) => fmt(x, 6);
    function show() {
      const k = hist.length - 1, W = hist[k].W, p = ph(), q = fixed(p), prevW = k ? hist[k - 1].W : null, pPrev = k ? hist[k - 1] : null;
      const choice = W > DRY ? '泥路' : '干路';
      read.innerHTML = `p̂ = ${nG}/${nG + nS} = <b>${fmt(p, 4)}</b>　W<sub>${k}</sub> = <b>${f6(W)}</b>　模型不动点 <b>${f6(q)}</b>　规划后选 <b>${choice}</b>` +
        `<br><span class="demo-note">规划只缩小 W 到不动点的距离；不动点与真实值 .473684 的距离只随计数改变。</span>`;
      const L = [['模型由计数得到', `p̂ = C(S4,↑,G)/C(S4,↑) = ${nG}/${nG + nS} = ${fmt(p, 4)}`]];
      if (k && pPrev) L.push(['一次期望更新', { html: ctx.m(`W_{${k}} = .9p̂ + .9(1 − p̂)W_{${k - 1}} = .9×${fmt(p, 4)} + ${fmt(G * (1 - p), 4)}×${f6(prevW)} = `) + `<b>${f6(W)}</b>` }]);
      else L.push(['初值', 'W_0 = 0']);
      L.push(['不动点，每次更新把差距乘以 $.9(1−p̂)$', `q̂ = .9p̂ / [1 − .9(1 − p̂)] = ${f6(q)}，q̂ − W_{${k}} = ${f6(q - W)}`]);
      L.push(['规划无法缩小的差距', { html: ctx.m(`q̂ − v_{真} = ${f6(q)} − ${f6(TRUE)} = `) + `<b>${f6(q - TRUE)}</b>` }]);
      L.push(['决策', `W_{${k}} = ${f6(W)} ${W > DRY ? '>' : '≤'} .9^5 = ${f6(DRY)}，选${choice}`]);
      stepsBox.set(L, `计算过程　第 ${k} 次规划后`);
    }
    reset();
  });
})();
