/* GreenWave city view: an isometric corridor of three junctions, drawn on a canvas from the live junction states.
   GWCity.mount(element, options) -> { setState(id, state), addMover(m), setView('3d'|'top'), zoom(dir), recenter() } */
window.GWCity = (function () {
  const CSS = `
.gwc{position:relative;border-radius:22px;background:#fff;border:1px solid #e6e3ee;overflow:hidden;font-family:inherit;user-select:none}
.gwc-h{display:flex;align-items:center;gap:14px;padding:16px 22px;border-bottom:1px solid #edf0ee}
.gwc-h h3{margin:0;font-size:22px;font-weight:800;color:#1b2a22}.gwc-h .sub{color:#7a8580;font-size:14px}
.gwc-tg{margin-left:auto;display:flex;background:#eef1ef;border-radius:12px;padding:4px}
.gwc-tg button{border:0;background:transparent;padding:8px 14px;border-radius:9px;font:inherit;font-size:13px;color:#53605a;cursor:pointer}
.gwc-tg button.on{background:#fff;color:#1b6b45;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.gwc-c{position:relative;background:#eef2ef;height:460px;cursor:grab}.gwc-c canvas{display:block;width:100%;height:100%}
.gwc-badge{position:absolute;left:18px;top:18px;background:#fff;border:1px solid #e3e8e5;border-radius:12px;padding:10px 16px;font-size:14px;color:#2b3a33;display:flex;gap:10px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.gwc-badge i{width:8px;height:8px;border-radius:50%;background:#1f9d55;display:inline-block}
.gwc-leg{position:absolute;left:18px;bottom:18px;background:#fff;border:1px solid #e3e8e5;border-radius:12px;padding:10px 16px;font-size:13px;color:#2b3a33;display:flex;gap:18px}
.gwc-leg i{display:inline-block;width:18px;height:7px;border-radius:4px;margin-right:7px;vertical-align:middle}
.gwc-n{position:absolute;right:26px;top:16px;text-align:center;color:#4b5a52;font-size:13px;font-family:ui-monospace,Menlo,monospace}
.gwc-z{position:absolute;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px}
.gwc-z button{width:40px;height:40px;border-radius:10px;border:1px solid #e3e8e5;background:#fff;font-size:20px;color:#2b3a33;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.gwc-card{position:absolute;transform:translate(-50%,-100%);background:#fff;border:1px solid #e3e8e5;border-radius:12px;padding:10px 16px 12px;min-width:120px;box-shadow:0 4px 14px rgba(0,0,0,.08);cursor:pointer;transition:background .2s,border-color .2s}
.gwc-card small{display:block;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.1em;color:#8a948f}
.gwc-card b{display:block;font-size:17px;color:#1b2a22;margin-top:4px;white-space:nowrap}
.gwc-card:after{content:"";position:absolute;left:50%;bottom:-7px;width:12px;height:12px;background:inherit;border-right:1px solid #e3e8e5;border-bottom:1px solid #e3e8e5;transform:translateX(-50%) rotate(45deg)}
.gwc-card.sel{background:#e8f6ee;border-color:#1f9d55}.gwc-card.sel:after{border-color:#1f9d55}
.gwc-card.amb{background:#fde8e4;border-color:#e8553e}.gwc-card.amb:after{border-color:#e8553e}
.gwc-f{display:flex;align-items:center;gap:14px;padding:14px 22px;border-top:1px solid #edf0ee;font-size:14px;color:#3a4a42;min-height:48px}
.gwc-f .why{flex:1;line-height:1.4}.gwc-f .why b{color:#1b2a22}
.gwc-f .tag{font-family:ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:.1em;color:#1f9d55}.gwc-f .tag.sim{color:#7a8580}
@media(max-width:700px){.gwc-c{height:360px}.gwc-h h3{font-size:18px}.gwc-leg{display:none}}`;
  if (!document.getElementById('gwc-style')) { const s = document.createElement('style'); s.id = 'gwc-style'; s.textContent = CSS; document.head.appendChild(s); }

  const L = 16, RW = 1.6, PLATE = { x0: -L - 10, x1: L + 10, y0: -11, y1: 11 };
  const C = { road: '#6f7d77', roadDark: '#5f6c66', line: '#f6f8f6', walk: '#eceeea', walkSide: '#cfd4d0', lawn: '#cfe5cf', ground: '#e9eeea', groundSide: '#cbd3cd',
    green: '#1f9d55', amber: '#e0a63a', red: '#e8553e', trunk: '#8b6b4a', leaf: '#3f9c6a', leafDk: '#2f7d52' };
  const BPAL = [['#dbf1ef', '#c1e3e0', '#a8d2ce'], ['#e4f2e7', '#c8e3cf', '#afd3b9'], ['#f6f8f6', '#dfe6e2', '#c8d2cc'], ['#dcefe9', '#c2e0d7', '#aacfc4'], ['#e9f4ef', '#d0e6db', '#b8d6c8']];
  const CARS = ['#f4f6f5', '#d9dee0', '#4f7fb5', '#2e3a44', '#b7c3c9', '#ffffff'];

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function buildWorld(js) {
    const r = rng(7), xs = js.map(j => j.x);
    const cols = [[PLATE.x0 + 0.8, xs[0] - RW - 1.1], [xs[0] + RW + 1.1, xs[1] - RW - 1.1], [xs[1] + RW + 1.1, xs[2] - RW - 1.1], [xs[2] + RW + 1.1, PLATE.x1 - 0.8]];
    const rows = [[PLATE.y0 + 0.8, -RW - 1.1], [RW + 1.1, PLATE.y1 - 0.8]];
    const blocks = [], buildings = [], trees = [];
    cols.forEach((cx, ci) => rows.forEach((ry, ri) => {
      const b = { x0: cx[0], x1: cx[1], y0: ry[0], y1: ry[1] }; blocks.push(b);
      const w = b.x1 - b.x0, h = b.y1 - b.y0, n = Math.max(2, Math.round(w / 3.4));
      for (let i = 0; i < n; i++) {
        const bw = 1.8 + r() * 1.6, bd = 1.8 + r() * 2.2, bh = 1.4 + r() * 4.2;
        const x0 = b.x0 + 0.9 + (w - 1.8 - bw) * (n === 1 ? .5 : i / (n - 1)), y0 = b.y0 + 0.9 + r() * Math.max(0, h - 1.8 - bd);
        const hosp = ci === 3 && ri === 0 && i === 0;
        buildings.push({ x0, y0, x1: x0 + bw, y1: y0 + bd, h: hosp ? 3.2 : bh, pal: BPAL[Math.floor(r() * BPAL.length)], hosp });
      }
      const nt = 2 + Math.floor(r() * 3);
      for (let i = 0; i < nt; i++) trees.push({ x: b.x0 + 0.4 + r() * (w - 0.8), y: ri === 0 ? b.y1 - 0.35 : b.y0 + 0.35, s: 0.45 + r() * 0.25 });
      if (ci === 1 || ci === 2) for (let i = 0; i < 2; i++) trees.push({ x: ri === 0 ? b.x0 + 0.35 : b.x1 - 0.35, y: b.y0 + 0.6 + r() * (h - 1.2), s: 0.45 + r() * 0.2 });
    }));
    return { blocks, buildings, trees };
  }

  function mount(el, opt) {
    const js = (opt.junctions || []).slice(0, 3).map((j, i) => Object.assign({ x: (i - 1) * L }, j));
    const byId = {}; js.forEach(j => byId[j.id] = j);
    el.classList.add('gwc');
    el.innerHTML = `<div class="gwc-h"><h3>${opt.title || 'Corridor'}</h3><span class="sub">${opt.sub || ''}</span><div class="gwc-tg"><button class="on" data-v="3d">3D view</button><button data-v="top">Top view</button></div></div>
<div class="gwc-c"><canvas></canvas><div class="gwc-badge"><i></i><span class="bt">Adaptive control · demo</span></div>
<div class="gwc-n">N<br><svg width="18" height="30" viewBox="0 0 18 30"><path d="M9 2 L14 26 L9 20 L4 26 Z" fill="#4b5a52"/></svg></div>
<div class="gwc-leg"><span><i style="background:#1f9d55"></i>Green corridor</span><span><i style="background:#e0a63a"></i>Queued vehicles</span></div>
<div class="gwc-z"><button data-z="1">+</button><button data-z="-1">−</button><button data-z="0">⌖</button></div></div>
<div class="gwc-f"><div class="why">Select a junction to see why its signal changed</div><span class="tag sim">SIMULATED</span></div>`;
    const canvas = el.querySelector('canvas'), wrap = el.querySelector('.gwc-c'), g = canvas.getContext('2d');
    const cards = js.map(j => { const c = document.createElement('div'); c.className = 'gwc-card'; c.innerHTML = `<small>${j.code}</small><b>${j.name}</b>`; c.onclick = () => select(j.id); wrap.appendChild(c); return c; });
    const world = buildWorld(js);
    const state = {}, movers = []; let selected = null;
    // simulated timing for junctions without a controller
    const simT0 = Date.now();
    function simState(j) { const t = (Date.now() - simT0) / 1000, cyc = 44, k = t % cyc, ew = k < 24; const q = { N: ew ? 2 + Math.floor(k / 6) : 0, S: ew ? 1 + Math.floor(k / 8) : 0, E: ew ? 0 : 1 + Math.floor((k - 24) / 5), W: ew ? 0 : 2 + Math.floor((k - 24) / 7) }; return { phase: ew ? 'EW' : 'NS', amber: ew ? k > 21.5 : k > cyc - 2.5, q, tPhase: Math.round(ew ? k : k - 24), sim: true, why: 'simulated timing, no controller attached yet' }; }
    function stOf(id) { return state[id] || simState(byId[id]); }

    // camera
    let view = { a: Math.PI / 4, t: 0.5 }, target = { a: Math.PI / 4, t: 0.5 }, S = 1.18, pan = { x: 0, y: 0 }, W = 0, H = 0, dpr = 1;
    function fit() { const r = wrap.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = Math.round(r.width); H = Math.round(r.height); canvas.width = W * dpr; canvas.height = H * dpr; }
    function P(x, y, z) { const ca = Math.cos(view.a), sa = Math.sin(view.a); const sc = S * Math.min(W / 78, H / 44) * (1 + (1 - view.t) * 0.55); return [W / 2 + pan.x + (x * ca - y * sa) * sc, H / 2 + 12 + pan.y + ((x * sa + y * ca) * view.t - z * (1 - view.t) * 1.9) * sc]; }
    function depth(x, y) { return x * Math.sin(view.a) + y * Math.cos(view.a); }
    function poly(pts, fill, stroke, lw) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); } }
    function box(x0, y0, x1, y1, z0, z1, pal) { poly([P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], pal[1]); poly([P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)], pal[2]); poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], pal[0]); }
    function rect(x0, y0, x1, y1, fill, z) { z = z || 0; poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], fill); }
    function line(ax, ay, bx, by, col, w, z) { const a = P(ax, ay, z || 0), b = P(bx, by, z || 0); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    function dashes(ax, ay, bx, by, len, gap, col, w) { const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d; for (let s = 0; s < d; s += len + gap) { const e = Math.min(d, s + len); line(ax + ux * s, ay + uy * s, ax + ux * e, ay + uy * e, col, w); } }
    const lightOf = (st, ax) => st.preempt ? (st.phase === ax ? C.green : C.red) : st.phase === ax ? (st.amber ? C.amber : C.green) : C.red;

    function drawGround() {
      const sc = (P(1, 0, 0)[0] - P(0, 0, 0)[0]);
      box(PLATE.x0, PLATE.y0, PLATE.x1, PLATE.y1, -0.5, 0, [C.ground, C.groundSide, '#bfc8c2']);
      world.blocks.forEach(b => { rect(b.x0 - 0.45, b.y0 - 0.45, b.x1 + 0.45, b.y1 + 0.45, C.walk, 0.02); rect(b.x0, b.y0, b.x1, b.y1, C.lawn, 0.03); });
      rect(PLATE.x0 + 0.3, -RW, PLATE.x1 - 0.3, RW, C.road, 0.04);
      js.forEach(j => rect(j.x - RW, PLATE.y0 + 0.3, j.x + RW, PLATE.y1 - 0.3, C.road, 0.04));
      // corridor centre dashes between junctions, cross-road dashes
      const segs = [[PLATE.x0 + 0.3, js[0].x - RW - 2.6], [js[0].x + RW + 2.6, js[1].x - RW - 2.6], [js[1].x + RW + 2.6, js[2].x - RW - 2.6], [js[2].x + RW + 2.6, PLATE.x1 - 0.3]];
      segs.forEach(s => dashes(s[0], 0, s[1], 0, 1.1, 0.9, C.line, Math.max(1, 0.07 * Math.abs(sc))));
      js.forEach(j => { dashes(j.x, PLATE.y0 + 0.3, j.x, -RW - 2.6, 1.1, 0.9, C.line, Math.max(1, 0.07 * Math.abs(sc))); dashes(j.x, RW + 2.6, j.x, PLATE.y1 - 0.3, 1.1, 0.9, C.line, Math.max(1, 0.07 * Math.abs(sc))); });
      // zebra crossings and stop lines
      js.forEach(j => {
        for (let k = -RW + 0.25; k < RW; k += 0.5) { rect(j.x - RW - 2.2, k, j.x - RW - 1.4, k + 0.28, C.line, 0.05); rect(j.x + RW + 1.4, k, j.x + RW + 2.2, k + 0.28, C.line, 0.05); rect(k, -RW - 2.2, k + 0.28, -RW - 1.4, C.line, 0.05); rect(j.x + k, -RW - 2.2, j.x + k + 0.28, -RW - 1.4, C.line, 0.05); rect(j.x + k, RW + 1.4, j.x + k + 0.28, RW + 2.2, C.line, 0.05); }
        const st = stOf(j.id); if (st.preempt) { g.save(); g.globalAlpha = 0.35 + 0.25 * Math.sin(Date.now() / 120); rect(j.x - RW - 1.3, -RW - 1.3, j.x + RW + 1.3, RW + 1.3, C.red, 0.06); g.restore(); }
      });
      // the green corridor line
      const t = Date.now() / 1000; g.save(); g.lineCap = 'round';
      const a = P(js[0].x - RW - 4, 0, 0.07), b = P(js[2].x + RW + 4, 0, 0.07);
      g.strokeStyle = 'rgba(31,157,85,.22)'; g.lineWidth = Math.max(3, 0.32 * Math.abs(sc)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.strokeStyle = C.green; g.lineWidth = Math.max(1.5, 0.09 * Math.abs(sc)); g.setLineDash([Math.abs(sc) * 0.9, Math.abs(sc) * 0.6]); g.lineDashOffset = -(t * Math.abs(sc) * 2.2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
    }

    function carItems(now) {
      const items = [];
      const car = (x, y, along, col, kind) => items.push({ d: depth(x, y) + 0.01, draw: () => drawCar(x, y, along, col, kind) });
      js.forEach(j => {
        const st = stOf(j.id), q = st.q || {};
        const queued = (ap, n) => { n = Math.min(7, n | 0); for (let i = 0; i < n; i++) { const o = RW + 1.1 + i * 1.55; if (ap === 'N') car(j.x + 0.75, -o, 'y', C.amber); if (ap === 'S') car(j.x - 0.75, o, 'y', C.amber); if (ap === 'E') car(j.x + o, 0.75, 'x', C.amber); if (ap === 'W') car(j.x - o, -0.75, 'x', C.amber); } };
        const flowing = (ax) => { const n = Math.max(1, Math.min(3, Math.max(q[ax === 'EW' ? 'E' : 'N'] | 0, q[ax === 'EW' ? 'W' : 'S'] | 0))); for (let i = 0; i < n; i++) { const k = ((now / 1000) / 3.2 + i / n + j.x) % 1, s = -8 + 16 * k; if (ax === 'EW') { car(j.x + s, -0.75, 'x', CARS[(i + 1) % CARS.length]); car(j.x - s, 0.75, 'x', CARS[(i + 3) % CARS.length]); } else { car(j.x + 0.75, s, 'y', CARS[(i + 2) % CARS.length]); car(j.x - 0.75, -s, 'y', CARS[(i + 4) % CARS.length]); } } };
        const green = st.amber ? null : st.phase;
        if (green === 'EW') { flowing('EW'); queued('N', q.N); queued('S', q.S); } else if (green === 'NS') { flowing('NS'); queued('E', q.E); queued('W', q.W); } else { ['N', 'S', 'E', 'W'].forEach(k => queued(k, q[k])); }
      });
      for (let i = movers.length - 1; i >= 0; i--) {
        const m = movers[i], k = (now - m.t0) / m.eta; if (k > 1.04 || !byId[m.from] || !byId[m.to]) { movers.splice(i, 1); continue; }
        const fx = byId[m.from].x, tx = byId[m.to].x, dir = Math.sign(tx - fx) || 1, x0 = fx + dir * (RW + 1.2), x1 = tx - dir * (RW + 1.2), lead = x0 + (x1 - x0) * Math.min(1, k), y = dir > 0 ? -0.75 : 0.75;
        if (m.kind === 'amb') car(lead, y, 'x', '#ffffff', 'amb');
        else for (let c = 0; c < Math.min(6, m.count || 3); c++) car(lead - dir * c * 1.55, y, 'x', CARS[(c + 2) % CARS.length]);
      }
      return items;
    }
    function drawCar(x, y, along, col, kind) {
      const l = 0.62, w = 0.34, h = 0.42; const x0 = along === 'x' ? x - l : x - w, x1 = along === 'x' ? x + l : x + w, y0 = along === 'x' ? y - w : y - l, y1 = along === 'x' ? y + w : y + l;
      const side = shade(col, -18), front = shade(col, -8);
      box(x0, y0, x1, y1, 0.05, h, [col, front, side]);
      if (kind === 'amb') { const on = Math.floor(Date.now() / 160) % 2; box(x - 0.18, y - 0.14, x + 0.18, y + 0.14, h, h + 0.22, on ? ['#ff5a45', '#d9382a', '#b32a1f'] : ['#4f8cff', '#2b63d9', '#1f4cb0']); const p = P(x, y, 0); g.save(); g.globalAlpha = 0.25 + 0.2 * on; g.fillStyle = C.red; g.beginPath(); g.ellipse(p[0], p[1], 20, 11, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      else { const t = along === 'x' ? [x - l * 0.35, y0 + 0.04, x + l * 0.35, y1 - 0.04] : [x0 + 0.04, y - l * 0.35, x1 - 0.04, y + l * 0.35]; rect(t[0], t[1], t[2], t[3], 'rgba(40,60,80,.35)', h + 0.005); }
    }
    function shade(hex, d) { const n = parseInt(hex.slice(1), 16); const c = v => Math.max(0, Math.min(255, v + d)); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => c(v).toString(16).padStart(2, '0')).join(''); }

    function drawSignal(j, st) {
      const heads = [[j.x + RW + 0.45, RW + 0.45, 'EW'], [j.x - RW - 0.45, -RW - 0.45, 'NS']];
      heads.forEach(([x, y, ax]) => { box(x - 0.06, y - 0.06, x + 0.06, y + 0.06, 0, 1.9, ['#8f9a95', '#737e79', '#5f6965']); box(x - 0.16, y - 0.16, x + 0.16, y + 0.16, 1.9, 2.4, ['#2f3a36', '#242c29', '#1b2220']); const p = P(x, y, 2.45); g.fillStyle = lightOf(st, ax); g.beginPath(); g.arc(p[0], p[1], Math.max(2.5, 0.12 * Math.abs(P(1, 0, 0)[0] - P(0, 0, 0)[0])), 0, Math.PI * 2); g.fill(); });
    }
    function drawTree(t) { const sc = Math.abs(P(1, 0, 0)[0] - P(0, 0, 0)[0]); box(t.x - 0.07, t.y - 0.07, t.x + 0.07, t.y + 0.07, 0, 0.6, [C.trunk, '#7a5c3e', '#654b32']); const p = P(t.x, t.y, 0.6 + t.s * 0.9); g.fillStyle = C.leafDk; g.beginPath(); g.arc(p[0] + sc * 0.05, p[1] + sc * 0.05, t.s * sc, 0, Math.PI * 2); g.fill(); g.fillStyle = C.leaf; g.beginPath(); g.arc(p[0], p[1], t.s * sc * 0.92, 0, Math.PI * 2); g.fill(); }
    function drawBuilding(b) { box(b.x0, b.y0, b.x1, b.y1, 0.03, b.h, b.pal); const sc = Math.abs(P(1, 0, 0)[0] - P(0, 0, 0)[0]); if (view.t < 0.9) { g.fillStyle = 'rgba(255,255,255,.45)'; for (let z = 0.6; z < b.h - 0.3; z += 0.7) for (let k = 0.3; k < b.y1 - b.y0 - 0.25; k += 0.6) { const p = P(b.x1, b.y0 + k, z); g.fillRect(p[0] - sc * 0.03, p[1] - sc * 0.12, sc * 0.16, sc * 0.2 * (1 - view.t) * 2); } }
      if (b.hosp) { const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; rect(cx - 0.5, cy - 0.16, cx + 0.5, cy + 0.16, C.red, b.h + 0.01); rect(cx - 0.16, cy - 0.5, cx + 0.16, cy + 0.5, C.red, b.h + 0.01); } }

    function render() {
      if (!W) fit();
      view.a += (target.a - view.a) * 0.12; view.t += (target.t - view.t) * 0.12;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      drawGround();
      const now = Date.now(); const items = [];
      world.buildings.forEach(b => items.push({ d: depth((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2), draw: () => drawBuilding(b) }));
      world.trees.forEach(t => items.push({ d: depth(t.x, t.y), draw: () => drawTree(t) }));
      js.forEach(j => { const st = stOf(j.id); items.push({ d: depth(j.x + RW + 0.45, RW + 0.45), draw: () => drawSignal(j, st) }); });
      items.push(...carItems(now));
      items.sort((a, b) => a.d - b.d).forEach(i => i.draw());
      js.forEach((j, i) => { const p = P(j.x, -RW - 0.6, 2.6); cards[i].style.left = p[0] + 'px'; cards[i].style.top = (p[1] - 10) + 'px'; const st = stOf(j.id); cards[i].classList.toggle('amb', !!st.preempt); cards[i].classList.toggle('sel', selected === j.id); });
      requestAnimationFrame(render);
    }

    function select(id) { selected = id; const j = byId[id], st = stOf(id); const f = el.querySelector('.gwc-f .why'), tag = el.querySelector('.gwc-f .tag'); const q = st.q || {};
      f.innerHTML = `<b>${j.code} ${j.name}</b> · ${st.phase} ${st.amber ? 'amber' : 'green'} for ${st.tPhase | 0} s · queues N ${q.N | 0} · S ${q.S | 0} · E ${q.E | 0} · W ${q.W | 0}<br>${st.why || (st.preempt ? 'ambulance priority in force' : 'waiting for the first decision')}`;
      tag.textContent = st.sim ? 'SIMULATED' : (st.cam ? 'LIVE · CAMERA' : 'LIVE'); tag.classList.toggle('sim', !!st.sim); }
    el.querySelectorAll('.gwc-tg button').forEach(b => b.onclick = () => { el.querySelectorAll('.gwc-tg button').forEach(x => x.classList.remove('on')); b.classList.add('on'); target = b.dataset.v === 'top' ? { a: 0, t: 1 } : { a: Math.PI / 4, t: 0.5 }; });
    el.querySelectorAll('.gwc-z button').forEach(b => b.onclick = () => { const z = +b.dataset.z; if (z === 0) { S = 1.18; pan = { x: 0, y: 0 }; } else S = Math.max(0.6, Math.min(2.6, S * (z > 0 ? 1.25 : 0.8))); });
    let drag = null; wrap.addEventListener('pointerdown', e => { if (e.target.closest('button,.gwc-card')) return; drag = { x: e.clientX - pan.x, y: e.clientY - pan.y }; wrap.setPointerCapture(e.pointerId); wrap.style.cursor = 'grabbing'; });
    wrap.addEventListener('pointermove', e => { if (drag) pan = { x: e.clientX - drag.x, y: e.clientY - drag.y }; }); wrap.addEventListener('pointerup', () => { drag = null; wrap.style.cursor = 'grab'; });
    wrap.addEventListener('wheel', e => { e.preventDefault(); S = Math.max(0.6, Math.min(2.6, S * (e.deltaY < 0 ? 1.1 : 0.9))); }, { passive: false });
    new ResizeObserver(fit).observe(wrap); fit(); requestAnimationFrame(render);
    setInterval(() => { if (selected) select(selected); }, 1000);

    return {
      setState(id, st) { if (!byId[id]) return; state[id] = st; const anyLive = Object.keys(state).length; el.querySelector('.bt').textContent = (st.mode === 'fixed' ? 'Fixed timer' : 'Adaptive control') + (anyLive ? ' · live' : ' · demo'); if (selected === id) select(id); },
      addMover(m) { movers.push(Object.assign({ t0: Date.now() }, m)); },
      setView(v) { el.querySelector(`.gwc-tg button[data-v="${v}"]`).click(); },
      select
    };
  }
  return { mount };
})();
