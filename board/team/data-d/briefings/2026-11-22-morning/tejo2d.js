/* tejo2d.js: the backup presenter (data.d@PrompTugal.dinis, 22 Nov 2026). When the 3D presenters library cannot draw
 * on a device (no WebGL, a module that will not load, a shader the GPU refuses), Tejo is drawn here with the plain 2D
 * canvas, which every browser has. Same contract as the library's show: { t, duration, playing, play, pause, seek,
 * renderAt, resize }. Same inputs: the mouth cues (shapes A to H, X) and the gesture cues of the briefing's plan.
 * Every frame is a pure function of t. A synthetic presenter drawn by code; no real person. Code Apache-2.0. */
const OPEN = { A: 0.06, B: 0.22, C: 0.5, D: 0.75, E: 0.38, F: 0.18, G: 0.12, H: 0.42, X: 0 };
const ARM = new Set(['wave', 'present', 'count', 'openPalms', 'shrug', 'think', 'point']);

export function mount2D(el, { duration, mouth, cues }) {
  el.innerHTML = '';
  const box = document.createElement('div'); box.style.cssText = 'position:relative;width:100%;height:100%';
  const cv = document.createElement('canvas'); cv.style.cssText = 'display:block;width:100%;height:100%';
  const label = document.createElement('div'); label.textContent = '1 synthetic presenter · made by code, no real person · 2D';
  label.style.cssText = 'position:absolute;left:8px;top:6px;color:#fff;background:#000a;padding:2px 6px;font:700 11px ui-monospace,Menlo,monospace';
  box.append(cv, label); el.appendChild(box);
  const g = cv.getContext('2d');
  const gest = cues.filter((c) => ARM.has(c.do)).map((c) => ({ t: c.t, end: c.t + (c.dur || 2), wave: c.do === 'wave', both: c.do === 'openPalms' || c.do === 'shrug' }));
  const nods = cues.filter((c) => c.do === 'nod').map((c) => c.t), glitches = cues.filter((c) => c.do === 'glitch' || c.do === 'scanSweep').map((c) => [c.t, c.t + (c.dur || 1)]);
  let W = 1, H = 1, dpr = 1;
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = Math.max(1, box.clientWidth); H = Math.max(1, box.clientHeight); cv.width = W * dpr; cv.height = H * dpr; };
  const mouthAt = (t) => { let lo = 0, hi = mouth.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (mouth[m].end < t) lo = m + 1; else if (mouth[m].start > t) hi = m - 1; else return OPEN[mouth[m].value] ?? 0.3; } return 0; };
  const blinkAt = (t) => { const p = (t * 0.37 + 0.13) % 1; return p < 0.035 ? Math.sin(p / 0.035 * Math.PI) : 0; };
  const env = (t, a, b) => (t < a || t > b) ? 0 : Math.sin(Math.min(1, (t - a) / 0.35, (b - t) / 0.35) * Math.PI / 2);

  function renderAt(t) {
    t = Math.max(0, Math.min(duration, t)); show.t = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the room: navy, a floor grid, the projector's cone of light
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b2238'); bg.addColorStop(1, '#050d17'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const fy = H * 0.86; g.strokeStyle = 'rgba(111,227,255,.18)'; g.lineWidth = 1;
    for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(W / 2 + i * W * 0.03, fy); g.lineTo(W / 2 + i * W * 0.16, H); g.stroke(); }
    for (let k = 0; k < 6; k++) { const y = fy + (H - fy) * (k / 6) ** 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const cone = g.createLinearGradient(0, fy, 0, H * 0.1); cone.addColorStop(0, 'rgba(111,227,255,.22)'); cone.addColorStop(1, 'rgba(111,227,255,0)');
    g.fillStyle = cone; g.beginPath(); g.moveTo(W / 2 - W * 0.05, fy); g.lineTo(W / 2 - W * 0.2, H * 0.08); g.lineTo(W / 2 + W * 0.2, H * 0.08); g.lineTo(W / 2 + W * 0.05, fy); g.fill();
    // arrival: built from the floor up over the first two seconds
    const built = Math.min(1, Math.max(0, (t - 0.15) / 1.8));
    const s = Math.min(W / 3.4, H * 0.76 / 4.2), cx = W / 2, base = fy;
    const nod = nods.reduce((a, n) => a + (t > n && t < n + 0.6 ? Math.sin((t - n) / 0.6 * Math.PI) * 0.06 : 0), 0);
    const sway = Math.sin(t * 1.3) * 0.02, breathe = Math.sin(t * 2.1) * 0.012;
    const gl = glitches.some(([a, b]) => t > a && t < b);
    g.save(); g.beginPath(); g.rect(0, base - s * 4.2 * built, W, s * 4.2 * built + 2); g.clip();
    g.globalAlpha = 0.82 + Math.sin(t * 23) * 0.04 + (gl ? Math.sin(t * 70) * 0.15 : 0);
    g.translate(cx + (gl ? Math.sin(t * 90) * s * 0.05 : 0), base); g.rotate(sway);
    const line = '#bff7ff', fill = 'rgba(58,143,255,.55)', light = 'rgba(159,232,255,.75)';
    g.lineWidth = Math.max(1.5, s * 0.03); g.strokeStyle = line; g.lineJoin = 'round'; g.lineCap = 'round';
    const shape = (pts, f) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)); g.closePath(); g.fillStyle = f; g.fill(); g.stroke(); };
    // legs and body (units: s; 0 is the floor, up is negative)
    shape([[-0.32, 0], [-0.08, 0], [-0.04, -1.5], [-0.36, -1.5]], fill); shape([[0.08, 0], [0.32, 0], [0.36, -1.5], [0.04, -1.5]], fill);
    const chest = -2.9 - breathe;
    shape([[-0.55, -1.45], [0.55, -1.45], [0.62, chest], [-0.62, chest]], fill);
    shape([[-0.14, chest], [0.14, chest], [0, chest + 0.55]], 'rgba(232,253,255,.8)');            // shirt
    shape([[-0.05, chest + 0.08], [0.05, chest + 0.08], [0.07, chest + 0.75], [0, chest + 0.85], [-0.07, chest + 0.75]], 'rgba(27,109,255,.9)'); // tie
    // arms: the right one rises for each gesture, both for open palms; a wave swings the forearm
    const arm = (side, up, wv) => { const sx = side * 0.6, a = side * (0.12 + up * 1.9), fx = sx + Math.sin(a) * 0.95, fyy = chest + 0.1 + Math.cos(a) * 0.95, b = a + side * (up * 0.9 + wv);
      const hx = fx + Math.sin(b) * 0.85, hy = fyy + Math.cos(b) * 0.85 * (up > 0.3 ? -1 : 1);
      g.lineWidth = s * 0.2; g.strokeStyle = fill; g.beginPath(); g.moveTo(sx * s, (chest + 0.1) * s); g.lineTo(fx * s, fyy * s); g.lineTo(hx * s, hy * s); g.stroke();
      g.lineWidth = Math.max(1.5, s * 0.03); g.strokeStyle = line; g.stroke(); g.beginPath(); g.arc(hx * s, hy * s, s * 0.1, 0, 6.29); g.fillStyle = light; g.fill(); g.stroke(); };
    let up = 0, upL = 0, wv = 0; for (const x of gest) { const e = env(t, x.t, x.end); up = Math.max(up, e); if (x.both) upL = Math.max(upL, e); if (x.wave) wv = Math.sin(t * 9) * 0.5 * e; }
    arm(-1, upL * 0.6, 0); arm(1, up * 0.75, wv);
    // head
    g.save(); g.translate(0, (chest - 0.15) * s); g.rotate(nod * 0.5);
    g.fillStyle = fill; g.fillRect(-0.12 * s, -0.25 * s, 0.24 * s, 0.3 * s);
    g.beginPath(); g.ellipse(0, -0.62 * s, 0.36 * s, 0.44 * s, 0, 0, 6.29); g.fillStyle = light; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -0.88 * s, 0.37 * s, 0.2 * s, 0, Math.PI, 0); g.fillStyle = 'rgba(200,246,255,.9)'; g.fill(); g.stroke();   // hair
    const bl = blinkAt(t);
    for (const ex of [-0.13, 0.13]) { g.beginPath(); g.ellipse(ex * s, -0.66 * s, 0.05 * s, Math.max(0.006, 0.06 * (1 - bl)) * s, 0, 0, 6.29); g.fillStyle = '#063a6a'; g.fill(); }
    const mo = mouthAt(t);
    g.beginPath(); g.ellipse(0, -0.42 * s, (0.11 + mo * 0.02) * s, Math.max(0.012, mo * 0.09) * s, 0, 0, 6.29); g.fillStyle = mo > 0.05 ? '#0a2a4a' : line; g.fill();
    g.restore(); g.restore();
    // scan lines over everything, as a hologram has
    g.globalAlpha = 1; g.fillStyle = 'rgba(5,16,26,.18)'; for (let y = (t * 30) % 4; y < H; y += 4) g.fillRect(0, y, W, 1.2);
    return t;
  }
  let raf = 0, t0 = 0, from = 0;
  const tick = () => { const t = from + (performance.now() - t0) / 1000; renderAt(t); if (t >= duration) { show.pause(); return; } raf = requestAnimationFrame(tick); };
  const show = { t: 0, duration, playing: false, renderAt, resize, kind: '2d',
    play() { if (show.playing) return; show.playing = true; from = show.t; t0 = performance.now(); raf = requestAnimationFrame(tick); },
    pause() { show.playing = false; cancelAnimationFrame(raf); },
    seek(t) { renderAt(t); from = show.t; t0 = performance.now(); } };
  resize(); renderAt(0);
  return show;
}
