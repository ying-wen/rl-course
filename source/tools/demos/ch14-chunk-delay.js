/* 第 14 章：推断时延 ℓ 与控制周期 Δt 折合 d=⌈ℓ/Δt⌉ 步，三种执行方式在时间轴上的排布。
 * 对应 14.1 节“改问题还是改执行”：76 ms / 20 ms → d=4，增广多 4·dim A 维，RTC 冻结 4 步前缀，反应至少 dΔt=80 ms；
 * 论文含引导约 97 ms、局域网再加 10–20 ms → 约 6 步；“时延与增广状态”中 10 ms 周期、100 ms 时延 → d=10（11-22 起时延步数统一记 d），7 维命令多 70 维。
 * 同步执行等推断完再动；RTC 在执行旧块时生成新块，时延超过旧块的剩余长度（s+d>H）就停顿。H、s 的默认值只为演示。 */
(() => {
  const steps = (ell, dt) => Math.ceil(ell / dt - 1e-9);
  /* 排出 N 步的时间表。mode: 'sync' | 'rtc' | 'aug'。
   * 返回 inf：[{start, ready, chunk}]；exec：[{t, chunk, kind}]，kind 为 'run' | 'warm' | 'idle'；
   * frozen：RTC 中各块的冻结区间 [start, ready−1]。 */
  function schedule(mode, d, H, s, N) {
    const inf = [], exec = [], frozen = [];
    if (mode === 'aug') {
      for (let i = 0; i < N; i++) inf.push({ start: i, ready: i + d, chunk: i });
      for (let t = 0; t < N; t++) exec.push(t < d ? { t, chunk: -1, kind: 'warm' } : { t, chunk: t - d, kind: 'run' });
      return { inf, exec, frozen };
    }
    if (mode === 'sync') {
      const se = Math.min(s, H);
      let t0 = 0, k = 0;
      while (t0 < N) {
        inf.push({ start: t0, ready: t0 + d, chunk: k });
        for (let t = t0; t < Math.min(N, t0 + d); t++) exec.push({ t, chunk: -1, kind: k === 0 ? 'warm' : 'idle' });
        for (let t = t0 + d; t < Math.min(N, t0 + d + se); t++) exec.push({ t, chunk: k, kind: 'run' });
        t0 += d + se; k += 1;
      }
      return { inf, exec, frozen };
    }
    // RTC：单个推断引擎；第 k 块用 start_k 时刻的观测，覆盖 [start_k, start_k+H−1]，ready_k 之前的部分冻结为旧块的命令。
    let start = 0, k = 0;
    while (start < N) {
      const ready = start + d;
      inf.push({ start, ready, chunk: k });
      if (k > 0) {
        const prev = inf[k - 1];
        const hi = Math.min(ready - 1, prev.start + H - 1);
        if (hi >= start) frozen.push({ chunk: k, from: start, to: hi });
      }
      start = Math.max(start + s, ready); k += 1;
    }
    for (let t = 0; t < N; t++) {
      let best = -1;
      for (let j = inf.length - 1; j >= 0; j--) {
        const c = inf[j];
        if (c.ready <= t && c.start <= t && t <= c.start + H - 1) { best = j; break; }
      }
      if (best >= 0) exec.push({ t, chunk: best, kind: 'run' });
      else exec.push({ t, chunk: -1, kind: t < inf[0].ready ? 'warm' : 'idle' });
    }
    return { inf, exec, frozen };
  }
  /* 稳态里动的步数占比（去掉开头的等待）。 */
  function duty(mode, d, H, s, N = 2400) {
    const { exec } = schedule(mode, d, H, s, N);
    const tail = exec.filter((e) => e.kind !== 'warm');
    return tail.filter((e) => e.kind === 'run').length / tail.length;
  }
  /* 一次新读数最早、最晚在第几步之后才影响命令（以 Δt 计）。 */
  function reaction(mode, d, H, s) {
    if (mode === 'aug') return [d, d];
    const se = mode === 'sync' ? Math.min(s, H) : s;
    const gap = mode === 'sync' ? se + d : Math.max(s, d);
    return [d, gap - 1 + d];
  }
  const model = { steps, schedule, duty, reaction };
  if (typeof module === 'object' && module.exports) { module.exports = model; return; }

  const num = (x, dgt = 2) => {
    let t = x.toFixed(dgt);
    if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '');
    return t.replace(/^0\./, '.');
  };
  const PRESETS = {
    rtc76: { ell: 76, dt: 20, label: '76/20' },
    rtc107: { ell: 107, dt: 20, label: '97+10/20' },
    aug100: { ell: 100, dt: 10, label: '100/10' },
  };
  const W = 30;

  RLDemo.register('ch14-chunk-delay', (ctx) => {
    const { el } = ctx;
    let ell = 76, dt = 20, H = 12, s = 5, dimA = 7, mode = 'rtc', preset = 'rtc76';

    const segP = ctx.segmented(Object.entries(PRESETS).map(([k, v]) => [k, v.label]), preset, (v) => {
      preset = v; ell = PRESETS[v].ell; dt = PRESETS[v].dt; ellS.value = ell; dtS.value = dt; update();
    }, '时延与控制周期');
    const segM = ctx.segmented([['sync', '同步执行'], ['rtc', '改执行：RTC'], ['aug', '改问题：增广']], mode, (v) => { mode = v; update(); }, '执行方式');
    const ellS = ctx.slider({ label: '推断时延 ℓ', min: 5, max: 300, step: 1, value: ell, format: (x) => x + ' ms', oninput: (x) => { ell = x; preset = ''; segP.set(''); update(); } });
    const dtS = ctx.slider({ label: '控制周期 Δt', min: 5, max: 50, step: 1, value: dt, format: (x) => x + ' ms', oninput: (x) => { dt = x; preset = ''; segP.set(''); update(); } });
    const hS = ctx.slider({ label: '块长 H', min: 4, max: 30, step: 1, value: H, format: String, oninput: (x) => { H = x; update(); } });
    const sS = ctx.slider({ label: '每隔 s 步重算', min: 1, max: 30, step: 1, value: s, format: String, oninput: (x) => { s = x; update(); } });
    const aS = ctx.slider({ label: '命令维数', min: 1, max: 14, step: 1, value: dimA, format: String, oninput: (x) => { dimA = x; update(); } });
    const tlBox = el('div');
    const read = ctx.readout();
    const box = ctx.steps('这组参数下');
    ctx.stage.append(ctx.row(el('span', { class: 'demo-note', text: '预设 ℓ/Δt（ms）', style: 'margin:0' }), segP.node), ctx.row(ellS.node, dtS.node), ctx.row(segM.node), ctx.row(hS.node, sS.node, aS.node), tlBox,
      ctx.legend([['var(--d4)', '推断条（圆点为读数时刻）与它产出的命令同色'], ['var(--line)', '等第一次推断'], ['var(--warn)', '停顿'], ['var(--muted)', '框：冻结前缀']]),
      read, box.node);

    let S = null, d = 4;
    ctx.canvas({
      parent: tlBox, aspect: 0.27, maxHeight: 240, minHeight: 170,
      label: '时间轴：上方是推断条，下方是每个控制步执行的命令；颜色区分动作块，红色为停顿，框线为冻结前缀',
      draw(g, w, h) {
        const Cc = ctx.colors();
        const L = 44, R = 8, cw = (w - L - R) / W;
        const lanes = mode === 'aug' ? Math.min(d, 8) : 1;
        const execH = 32, laneH = Math.max(6, Math.min(18, (h - 92 - execH + 34) / lanes - 3));
        const used = lanes * (laneH + 3) + 16 + execH + 30, top = 6 + Math.max(0, (h - 6 - used) / 2);
        const execY = top + lanes * (laneH + 3) + 16;
        const col = (k) => Cc.series[[3, 1, 4, 0][((k % 4) + 4) % 4]];
        g.font = ctx.font(11); g.textBaseline = 'middle'; g.textAlign = 'right'; g.fillStyle = Cc.muted;
        g.fillText('推断', L - 6, top + (lanes * (laneH + 3)) / 2);
        g.fillText('执行', L - 6, execY + execH / 2);
        // 推断条
        for (const c of S.inf) {
          if (c.start >= W) break;
          const lane = mode === 'aug' ? c.chunk % d : 0;
          if (lane >= lanes) continue;
          const y = top + lane * (laneH + 3);
          const x0 = L + c.start * cw, x1 = L + Math.min(W, c.ready) * cw;
          g.fillStyle = col(c.chunk); g.globalAlpha = 0.85;
          g.fillRect(x0 + 1, y, Math.max(2, x1 - x0 - 2), laneH);
          g.globalAlpha = 1;
          // 读数时刻
          g.fillStyle = Cc.ink; g.beginPath(); g.arc(x0 + 1, y + laneH / 2, 2.4, 0, 2 * Math.PI); g.fill();
        }
        if (mode === 'aug' && d > lanes) {
          g.fillStyle = Cc.muted; g.textAlign = 'left'; g.font = ctx.font(10);
          g.fillText(`只画出 ${lanes} 条，同时在跑 ${d} 条`, L + 2, top + lanes * (laneH + 3) + 6);
        }
        // 执行格
        for (const e of S.exec) {
          if (e.t >= W) break;
          const x = L + e.t * cw;
          if (e.kind === 'run') { g.fillStyle = col(e.chunk); g.globalAlpha = 0.55; }
          else if (e.kind === 'idle') { g.fillStyle = Cc.warn; g.globalAlpha = 0.7; }
          else { g.fillStyle = Cc.line; g.globalAlpha = 1; }
          g.fillRect(x + 0.5, execY, Math.max(1, cw - 1), execH);
          g.globalAlpha = 1;
        }
        // 冻结前缀：框在执行行上，框色取新块
        for (const f of S.frozen) {
          if (f.from >= W) break;
          const x0 = L + f.from * cw, x1 = L + Math.min(W, f.to + 1) * cw;
          g.strokeStyle = col(f.chunk); g.lineWidth = 2;
          g.strokeRect(x0 + 1, execY - 4, x1 - x0 - 2, execH + 8);
        }
        // 刻度
        g.fillStyle = Cc.muted; g.font = ctx.font(10); g.textAlign = 'center'; g.textBaseline = 'top';
        for (let t = 0; t <= W; t += 5) g.fillText(String(t), L + t * cw, execY + execH + 8);
        g.textAlign = 'right'; g.fillText('控制步', w - R, execY + execH + 20);
      },
    });

    function update() {
      d = steps(ell, dt);
      S = model.schedule(mode, d, H, s, W + d + 2);
      const du = model.duty(mode, d, H, s), [r0, r1] = model.reaction(mode, d, H, s);
      const gap = Math.max(s, d), okRTC = gap + d <= H;
      read.innerHTML = `d = <b>${d}</b> 步　动的步数占比 <b>${num(du * 100, 1)}%</b>　对新读数的反应 <b>${r0 * dt}</b>${r1 > r0 ? `–${r1 * dt}` : ''} ms` +
        (mode === 'aug' ? `　状态多 <b>${d * dimA}</b> 维，同时在跑 <b>${d}</b> 次推断` : '') +
        (mode === 'rtc' && !okRTC ? `<br><span style="color:var(--warn)">${gap === s ? 's' : 'd'} + d = ${gap + d} > H = ${H}：旧块在新块就绪前用完，每块停顿 ${gap + d - H} 步。</span>` : '');
      const L = [[`推断折合的控制步数`, `d = ⌈ℓ/Δt⌉ = ⌈${ell}/${dt}⌉ = ⌈${num(ell / dt, 2)}⌉ = ${d}`]];
      if (mode === 'aug') {
        L.push(['把推断期间已定的命令并进状态', `x_i = (s_i, a_i, …, a_{i+${d - 1}})`]);
        L.push(['状态多出的维数', `d·dim A = ${d}×${dimA} = ${d * dimA}`]);
        L.push(['每步都要出新命令，推断流水进行', `同时在跑 ${d} 次，每 Δt = ${dt} ms 启动一次`]);
      } else if (mode === 'rtc') {
        L.push(['新块的前 d 步与旧块相同（冻结前缀）', `冻结 ${d} 步，后 ${Math.max(0, H - d)} 步重新生成`]);
        L.push([s >= d ? '旧块要撑到新块就绪' : '引擎忙，实际每 d 步才能重算一次；旧块要撑到新块就绪', `max(s, d) + d = ${gap} + ${d} = ${gap + d} ${okRTC ? '≤' : '>'} H = ${H}`]);
        L.push([okRTC ? '不停顿，每块推断一次，状态不变' : '每块停顿的步数', okRTC ? `每 ${gap} 步推断一次` : `max(s, d) + d − H = ${gap + d - H}`]);
      } else {
        L.push(['等推断完再动，每轮动 s 步', `s/(s + d) = ${Math.min(s, H)}/(${Math.min(s, H)} + ${d}) = ${num(Math.min(s, H) / (Math.min(s, H) + d), 3)}`]);
      }
      L.push(['对新读数的反应至少', `dΔt = ${d}×${dt} = ${d * dt} ms`]);
      box.set(L);
      ctx.redraw();
    }
    update();
  });
})();
