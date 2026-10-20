'use strict';
// Epic title: painted pixel backdrop (volcanic mountain with the Heart of Ash), animated logo, splash screen
(function () {
  const UW = 480, UH = 270;
  const TA = AH.TitleArt = {};
  const bay = (x, y) => AH.BAYER[(y & 3) * 4 + (x & 3)];

  function backdrop() {
    const c = AH.makeCanvas(UW, UH), x = c.getContext('2d');
    const em = AH.makeCanvas(UW, UH), ex = em.getContext('2d');
    const rnd = AH.mulberry(1337);
    const px = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
    const epx = (X, Y, col) => { ex.fillStyle = col; ex.fillRect(X, Y, 1, 1); };
    // sky: dithered bands from night violet down to a burning horizon
    const sky = ['#07050c', '#0c0712', '#140a18', '#1e0c1a', '#2c0f1a', '#401418', '#5a1a16', '#7a2614', '#9a3a16'];
    const HZ = 190;
    for (let y = 0; y < HZ; y++) {
      const t = Math.pow(y / HZ, 1.35) * (sky.length - 1), a = Math.floor(t), f = t - a;
      for (let X = 0; X < UW; X++) px(X, y, bay(X, y) < f ? sky[Math.min(a + 1, sky.length - 1)] : sky[a]);
    }
    // stars in the upper sky
    for (let k = 0; k < 140; k++) { const X = rnd.int(0, UW - 1), Y = rnd.int(0, 70); px(X, Y, rnd() < 0.2 ? '#f2e3d0' : rnd() < 0.5 ? '#8a7a9a' : '#4a3e5a'); }
    // blood moon
    const MX = 418, MY = 112, MR = 30;
    for (let j = -MR - 10; j <= MR + 10; j++) for (let i = -MR - 10; i <= MR + 10; i++) {
      const d = Math.hypot(i, j);
      if (d <= MR) {
        let col = '#e8b088';
        const sh = (i + j * 0.4) / MR; // lit from lower left by the fire
        if (sh > 0.35) col = '#c8866a'; if (sh > 0.62) col = '#9a5a4e';
        if (d > MR - 1.2) col = '#f2c8a0';
        px(MX + i, MY + j, col);
      } else if (d < MR + 10 && bay(MX + i, MY + j) < (1 - (d - MR) / 10) * 0.45) px(MX + i, MY + j, '#5a2a2a');
    }
    for (const [cx, cy, r] of [[-8, -6, 5], [7, 4, 4], [-2, 10, 3], [10, -10, 3], [-12, 8, 2]]) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (Math.hypot(i, j) <= r) { const X = MX + cx + i, Y = MY + cy + j; if (Math.hypot(X - MX, Y - MY) < MR - 1) px(X, Y, Math.hypot(i - 1, j - 1) < r - 1 ? '#b87a62' : '#a0685a'); }
    // cloud banks, underlit by the fire
    const cloud = (cx, cy, w, h) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const d = Math.abs(i - w / 2) / (w / 2) + Math.abs(j - h / 2) / (h / 2) * 0.9 + Math.sin(i * 0.31 + cy) * 0.12;
        if (d > 1) continue;
        const X = Math.round(cx - w / 2 + i), Y = cy + j;
        if (bay(X, Y) > (1 - d) * 1.6) continue;
        px(X, Y, j > h * 0.62 ? (j > h * 0.82 ? '#8a3420' : '#5a2020') : j < h * 0.25 ? '#2a1424' : '#3a1824');
      }
    };
    for (const [cx, cy, w, h] of [[80, 22, 150, 14], [250, 10, 190, 12], [430, 70, 140, 12], [140, 82, 120, 10], [330, 96, 170, 12], [40, 110, 110, 9]]) cloud(cx, cy, w, h);
    // far ranges
    const range = (base, amp, col, rim, seed) => {
      const r2 = AH.mulberry(seed); let h = base, v = 0;
      for (let X = 0; X < UW; X++) {
        v += (r2() - 0.5) * 1.6; v *= 0.86; h += v; h = AH.clamp(h, base - amp, base + amp * 0.4);
        const Y = Math.round(h);
        for (let y = Y; y < UH; y++) px(X, y, col);
        px(X, Y, rim); if (v < 0) px(X, Y + 1, rim);
      }
    };
    range(150, 34, '#2a0e16', '#4a1a1c', 4);
    range(168, 22, '#1c0a12', '#3a1418', 8);
    // the great mountain: a broken volcanic peak, the Heart beneath it
    const PX = 250, PY = 62, base = 230;
    const half = Y => { const t = (Y - PY) / (base - PY); return 18 + t * 150 + Math.sin(Y * 0.21) * 4 + Math.sin(Y * 0.07) * 7; };
    for (let Y = PY; Y < UH; Y++) {
      const hw = half(Math.min(Y, base)) + (Y > base ? (Y - base) * 2 : 0);
      for (let X = Math.round(PX - hw); X <= Math.round(PX + hw * 0.92); X++) {
        if (X < 0 || X >= UW) continue;
        const edgeL = X - (PX - hw), edgeR = (PX + hw * 0.92) - X;
        let col = '#120710';
        if (edgeL < 2) col = '#5a2218'; else if (edgeL < 5 && bay(X, Y) < 0.5) col = '#3a1414';
        else if (edgeR < 2) col = '#2a1018';
        else if (((X * 7 + Y * 13) % 23) === 0) col = '#1e0c14';
        px(X, Y, col);
      }
    }
    // rock strata catching the lava light
    for (let k = 0; k < 26; k++) {
      let X = PX + rnd.int(-120, 110), Y = rnd.int(PY + 30, base - 4); const len = rnd.int(8, 26);
      for (let q = 0; q < len; q++) { const hw = half(Y); if (X > PX - hw + 3 && X < PX + hw * 0.9 - 3) px(X, Y, q % 3 ? '#2a1218' : '#3a1a1c'); X++; if (rnd() < 0.3) Y++; }
    }
    // crater rim (jagged) + glow
    for (let i = -22; i <= 22; i++) { const h = Math.round(Math.abs(Math.sin(i * 0.9)) * 4 + (Math.abs(i) > 15 ? 3 : 0)); for (let j = 0; j < h; j++) px(PX + i, PY - j + 2, '#1a0a10'); px(PX + i, PY - h + 2, '#6a2a1a'); }
    for (let i = -16; i <= 16; i++) for (let j = 0; j < 4; j++) if (bay(PX + i, PY + j) < 0.8 - j * 0.2) epx(PX + i, PY + j + 1, j < 2 ? '#ffd36a' : '#ff6a1a');
    // lava cracks running down the mountain (emissive)
    TA.cracks = [];
    for (let k = 0; k < 9; k++) {
      let X = PX + rnd.int(-14, 14), Y = PY + 4; const dir = rnd() < 0.5 ? -1 : 1; const len = rnd.int(40, 140);
      for (let s = 0; s < len; s++) {
        Y += 1; X += rnd() < 0.35 ? dir * (rnd() < 0.7 ? 1 : 0) : rnd() < 0.15 ? -dir : 0;
        if (Y >= base + 10) break;
        epx(X, Y, '#ff6a1a'); if (s % 3 === 0) epx(X + 1, Y, '#c8401a'); if (rnd() < 0.08) epx(X, Y, '#ffd36a');
        px(X, Y, '#3a1010');
        if (rnd() < 0.04) { // branch
          let bx = X, by = Y; for (let q = 0; q < 12; q++) { by++; bx += rnd() < 0.5 ? -dir : 0; epx(bx, by, '#c8401a'); px(bx, by, '#2a0c0c'); }
        }
      }
    }
    // the mine mouth at the foot of the mountain
    const MMX = 252, MMY = 214;
    for (let j = 0; j < 30; j++) for (let i = -18; i <= 18; i++) {
      if ((i / 18) ** 2 + ((j - 30) / 30) ** 2 >= 1) continue;
      const d = (i / 18) ** 2 + ((j - 30) / 30) ** 2;
      px(MMX + i, MMY + j, '#050204');
      epx(MMX + i, MMY + j, d < 0.25 ? '#ffd36a' : d < 0.5 ? '#ff8a2e' : d < 0.75 ? '#c8401a' : '#5a1a10');
    }
    for (const sx of [-20, 17]) { for (let j = -2; j < 30; j++) { px(MMX + sx, MMY + j, '#4a2a18'); px(MMX + sx + 1, MMY + j, '#6b4a2e'); px(MMX + sx + 2, MMY + j, '#3a2014'); } }
    for (let i = -23; i <= 22; i++) { px(MMX + i, MMY - 4, '#86603c'); px(MMX + i, MMY - 3, '#5a3c22'); px(MMX + i, MMY - 2, '#3a2014'); }
    // rails out of the mine
    for (let j = 0; j < 30; j++) { const w = 6 + j * 0.9; px(Math.round(MMX - w), MMY + 30 + j, '#7a6a72'); px(Math.round(MMX + w), MMY + 30 + j, '#7a6a72'); if (j % 4 === 0) for (let i = -w; i <= w; i++) px(Math.round(MMX + i), MMY + 30 + j, '#3a2418'); }
    // Dunmere in the valley (right): silhouetted roofs, lit windows
    TA.windows = [];
    for (let k = 0; k < 13; k++) {
      const hx = 318 + k * 13 + rnd.int(-3, 3), hw = rnd.int(9, 14), hy = 216 + rnd.int(-6, 6) + Math.round(k * 0.6), hh = rnd.int(10, 16);
      for (let j = 0; j < hh + 30; j++) for (let i = 0; i < hw; i++) px(hx + i, hy + j, '#0e070c');
      for (let j = 0; j < 6; j++) for (let i = j; i < hw - j; i++) px(hx + i, hy - 6 + j, '#0e070c');
      for (let i = 2; i < hw - 2; i++) px(hx + i, hy - 6 + Math.min(i, hw - i - 1) * 0, '#0e070c');
      if (rnd() < 0.8) { const wx = hx + rnd.int(2, hw - 4), wy = hy + rnd.int(3, 7); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { px(wx + i, wy + j, '#2a1a10'); epx(wx + i, wy + j, j ? '#e8a040' : '#ffd36a'); } TA.windows.push([wx, wy]); }
    }
    // church spire
    for (let j = 0; j < 22; j++) for (let i = -Math.floor(j / 4); i <= Math.floor(j / 4); i++) px(372 + i, 194 + j, '#0e070c');
    epx(372, 206, '#ffd36a');
    // foreground cliff (left) where the heroes stand
    // flat top where the heroes stand, then the rock falls away into the valley
    const cliffTop = X => Math.round(206 - Math.sin(X * 0.05) * 3 - Math.sin(X * 0.23) * 1.5 + (X > 150 ? Math.pow(X - 150, 1.35) * 0.55 : 0));
    for (let X = 0; X < 250; X++) {
      const T0 = cliffTop(X); if (T0 >= UH) continue;
      for (let Y = T0; Y < UH; Y++) {
        const d = Y - T0;
        let col = '#0e070c';
        if (d < 1) col = '#8a3a22'; else if (d < 3 && bay(X, Y) < 0.6) col = '#4a1a16';
        else if (((X * 5 + Y * 3) % 17) === 0 && d > 6) col = '#1e0e14';
        else if (((X * 3 + Y * 7) % 41) < 3 && d > 8) col = '#160a10';
        // rock faces catching the fire light on the slope
        if (X > 150 && d > 2 && d < 9 && bay(X, Y) < 0.5 - d * 0.05) col = '#3a1612';
        px(X, Y, col);
      }
    }
    // a few rocks and cracks on the cliff body
    for (let k = 0; k < 16; k++) { const X = rnd.int(4, 200), Y = cliffTop(X) + rnd.int(10, 50); if (Y >= UH) continue; for (let q = 0; q < rnd.int(5, 12); q++) px(X + q, Y + Math.round(Math.sin(q) * 1), '#22101a'); px(X, Y - 1, '#4a1a16'); }
    TA.cliffTop = cliffTop;
    // foreground trees (right), black against the glow
    const tree = (tx, ty, h) => {
      for (let j = 0; j < h; j++) { const w = Math.max(1, Math.round((j / h) * h * 0.32)); for (let i = -w; i <= w; i++) if (bay(tx + i, ty + j) < 0.92 || Math.abs(i) < w - 1) px(tx + i, ty + j, '#050306'); if (j % 5 === 4) { px(tx - w - 1, ty + j, '#050306'); px(tx + w + 1, ty + j, '#050306'); } }
      for (let j = 0; j < 8; j++) { px(tx, ty + h + j, '#050306'); px(tx + 1, ty + h + j, '#050306'); }
    };
    for (const [tx, ty, h] of [[452, 170, 70], [470, 186, 60], [430, 196, 52], [414, 214, 44], [474, 140, 90]]) tree(tx, ty, h);
    for (let X = 300; X < UW; X++) for (let Y = 252 + Math.round(Math.sin(X * 0.07) * 3); Y < UH; Y++) px(X, Y, '#050306');
    TA.bg = c; TA.bgEm = em;
    TA.MMX = MMX; TA.MMY = MMY; TA.PX = PX; TA.PY = PY;
  }

  // three heroes on the cliff, painted as silhouettes rim-lit by the burning mountain (drawn live: capes move in the wind)
  const HW = 200, HH = 90;
  const hc = () => { if (!TA.hcan) { TA.hcan = AH.makeCanvas(HW, HH, true); } return TA.hcan; };
  function poly(x, pts) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.closePath(); x.fill(); }
  function line(x, x0, y0, x1, y1, w) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let s = 0; s <= n; s++) x.fillRect(Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n), w || 1, w || 1); }
  function figure(x, X, B, kind, t, ph) {
    x.fillStyle = '#000';
    const wv = k => Math.round(Math.sin(t * 3 + ph + k) * 2);
    // cape streaming to the left
    poly(x, [[X + 1, B - 25], [X + 4, B - 25], [X + 2, B - 7], [X - 4 + wv(0), B - 4], [X - 7 + wv(1), B - 11 + wv(2) * 0.5], [X - 2, B - 22]]);
    // legs (stance)
    x.fillRect(X + 1, B - 12, 3, 12); x.fillRect(X + 6, B - 11, 3, 10); x.fillRect(X + 7, B - 2, 4, 2); x.fillRect(X, B - 1, 4, 1);
    // torso + arms
    poly(x, [[X, B - 25], [X + 10, B - 25], [X + 9, B - 12], [X + 1, B - 12]]);
    x.fillRect(X - 1, B - 25, 12, 3);
    // head
    x.fillRect(X + 2, B - 31, 6, 6);
    if (kind === 'paladin') {
      x.fillRect(X + 1, B - 32, 8, 3); line(x, X + 5, B - 33, X - 2 + wv(3), B - 36, 1); line(x, X + 5, B - 34, X - 3 + wv(3), B - 37, 1); // plume
      x.fillRect(X + 8, B - 22, 3, 3); line(x, X + 10, B - 21, X + 22, B - 45, 2); x.fillRect(X + 7, B - 24, 7, 2); // raised sword + guard
      poly(x, [[X - 2, B - 23], [X + 2, B - 23], [X + 2, B - 16], [X, B - 13], [X - 2, B - 16]]); // shield on back
    } else if (kind === 'wizard') {
      poly(x, [[X - 2, B - 30], [X + 12, B - 30], [X + 7, B - 34], [X + 3 + wv(4), B - 46], [X + 4, B - 34]]); // pointed hat
      x.fillRect(X + 10, B - 22, 2, 3); line(x, X + 12, B - 40, X + 12, B, 2); // staff
    } else {
      poly(x, [[X + 1, B - 32], [X + 8, B - 32], [X + 9, B - 26], [X - 4 + wv(5), B - 27]]); // hood
      x.fillRect(X + 9, B - 21, 4, 2);
      for (let k = -14; k <= 14; k++) { const xx = X + 15 + Math.round(4 * Math.cos(k / 14 * 1.3)), yy = B - 20 + k; x.fillRect(xx, yy, 1, 1); } // bow
      line(x, X + 16, B - 34, X + 16, B - 6, 1);
      x.fillRect(X - 1, B - 27, 2, 8); // quiver
    }
  }
  function pet(x, X, B, kind, t) {
    x.fillStyle = '#000';
    if (kind === 'dog') { x.fillRect(X, B - 6, 10, 4); x.fillRect(X + 8, B - 9, 4, 4); x.fillRect(X + 11, B - 7, 2, 2); x.fillRect(X + 9, B - 10, 1, 1); x.fillRect(X, B - 2, 2, 2); x.fillRect(X + 7, B - 2, 2, 2); line(x, X, B - 6, X - 3, B - 8 - (Math.floor(t * 6) % 2), 1); }
    else if (kind === 'rat') { x.fillRect(X, B - 3, 6, 3); x.fillRect(X + 5, B - 4, 3, 3); line(x, X, B - 1, X - 5, B - 2, 1); }
    else { const f = Math.floor(t * 10) % 2; const cx = X + Math.round(Math.cos(t * 1.5) * 14), cy = B - 52 + Math.round(Math.sin(t * 3) * 3); x.fillRect(cx, cy, 4, 3); x.fillRect(cx + 3, cy - 1, 2, 2); x.fillRect(cx - 2, cy - 1 - f * 2, 3, 2); }
  }
  TA.drawHeroes = function (ctx, t) {
    const c = hc(), x = c.getContext('2d');
    x.clearRect(0, 0, HW, HH);
    const base = X => TA.cliffTop(X) ;
    const OY = 206 - HH + 8; // canvas placed so its bottom sits just under the cliff line
    const figs = [['rogue', 'rat', 34, 0], ['paladin', 'dog', 76, 1.7], ['wizard', 'canary', 120, 3.1]];
    for (const [k, pk, X, ph] of figs) {
      figure(x, X, base(X + 5) - OY + 1, k, t, ph);
      if (pk === 'canary') pet(x, X + 4, base(X) - OY, pk, t);
      else pet(x, X + 20, base(X + 24) - OY + 1, pk, t);
    }
    // rim light from the mountain (to the right)
    const img = x.getImageData(0, 0, HW, HH), d = img.data;
    const on = (i, j) => i >= 0 && j >= 0 && i < HW && j < HH && d[(j * HW + i) * 4 + 3] > 0;
    const b = TA.beat(t);
    const rim = AH.hx(AH.mix('#c8602a', '#ffb060', b)), rim2 = AH.hx('#5a2014');
    const out = x.createImageData(HW, HH), o = out.data;
    for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) {
      if (!on(i, j)) continue;
      const k = (j * HW + i) * 4;
      let col = [8, 4, 8];
      if (!on(i + 1, j)) col = rim; else if (!on(i + 2, j) || !on(i, j - 1)) col = rim2;
      o[k] = col[0]; o[k + 1] = col[1]; o[k + 2] = col[2]; o[k + 3] = 255;
    }
    x.putImageData(out, 0, 0);
    ctx.drawImage(c, 0, OY);
    // wizard's crystal and the paladin's blade catch the light
    const wy = base(125) + 1 - 40;
    ctx.fillStyle = Math.floor(t * 4) % 2 ? '#9ef0ff' : '#6fd6e8'; ctx.fillRect(132, wy - 2, 2, 3); ctx.fillStyle = 'rgba(110,214,232,0.3)'; ctx.fillRect(131, wy - 5, 4, 9); ctx.fillRect(129, wy - 2, 8, 3);
  };

  // ASHHEART logo: molten gradient letters, beveled, cracked, outlined
  function logo(scale) {
    const word = 'ASHHEART';
    const tw = AH.textW(word, scale), th = 7 * scale, pad = 4;
    const W = tw + pad * 2, H = th + pad * 2 + 4;
    const m = AH.makeCanvas(W, H, true), mx = m.getContext('2d');
    AH.text(mx, pad, pad, word, '#ffffff', { scale, shadow: null });
    const md = mx.getImageData(0, 0, W, H).data;
    const on = (i, j) => i >= 0 && j >= 0 && i < W && j < H && md[(j * W + i) * 4 + 3] > 0;
    const c = AH.makeCanvas(W, H), x = c.getContext('2d');
    const grad = ['#fff6c8', '#ffe08a', '#ffc24a', '#ff9a2e', '#f2701e', '#d04a18', '#a83016', '#7a1e12'];
    const pts = [];
    const rnd = AH.mulberry(scale * 31);
    const cracks = new Set();
    for (let k = 0; k < 10 * scale; k++) { let i = rnd.int(0, W - 1), j = rnd.int(pad, pad + th); for (let q = 0; q < scale * 2; q++) { cracks.add(j * W + i); i += rnd.int(-1, 1); j += 1; } }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (on(i, j)) {
        const t = AH.clamp((j - pad) / th, 0, 0.999);
        let col = grad[Math.floor(t * grad.length)];
        if (bay(i, j) < (t * grad.length) % 1 * 0.5 && t < 0.98) col = grad[Math.min(grad.length - 1, Math.floor(t * grad.length) + 1)];
        if (!on(i, j - 1) || !on(i, j - 2)) col = '#fffbe8';
        else if (!on(i - 1, j)) col = AH.mix(col, '#ffffff', 0.35);
        else if (!on(i + 1, j) || !on(i, j + 1)) col = AH.mix(col, '#3a0a08', 0.45);
        if (cracks.has(j * W + i) && on(i, j - 2) && on(i, j + 2)) col = '#4a120c';
        x.fillStyle = col; x.fillRect(i, j, 1, 1); pts.push(i, j);
      } else {
        // 2px outline + drop shadow
        let n = false; for (let a = -2; a <= 2 && !n; a++) for (let b = -2; b <= 2; b++) if (Math.abs(a) + Math.abs(b) <= 3 && on(i + a, j + b)) { n = true; break; }
        if (n) { x.fillStyle = '#12040a'; x.fillRect(i, j, 1, 1); }
        else if (on(i - 3, j - 4) || on(i - 2, j - 4)) { x.fillStyle = '#2a0808'; x.fillRect(i, j, 1, 1); }
      }
    }
    return { c, W, H, pts };
  }

  TA.init = function () {
    if (TA.bg) return;
    backdrop();
    TA.logoBig = logo(6); TA.logoSmall = logo(4);
    TA.embers = []; TA.ash = []; TA.bolt = null; TA.boltT = 3;
  };

  // heartbeat curve: two beats then rest (period 1.6s)
  TA.beat = function (t) { const p = t % 1.6; return Math.max(Math.exp(-((p - 0.08) ** 2) / 0.004), 0.7 * Math.exp(-((p - 0.32) ** 2) / 0.004)); };

  TA.update = function (dt, t) {
    TA.init();
    if (Math.random() < dt * 40) TA.embers.push({ x: TA.PX + (Math.random() - 0.5) * 40, y: TA.PY + 4, vx: (Math.random() - 0.5) * 16, vy: -14 - Math.random() * 24, life: 3 + Math.random() * 4, c: Math.random() < 0.4 ? '#ffd36a' : '#ff6a1a' });
    if (Math.random() < dt * 25) TA.embers.push({ x: Math.random() * UW, y: UH + 2, vx: (Math.random() - 0.5) * 8, vy: -16 - Math.random() * 20, life: 8, c: Math.random() < 0.5 ? '#ff8a2e' : '#c8401a' });
    if (Math.random() < dt * 30) TA.ash.push({ x: Math.random() * (UW + 60) - 30, y: -2, vx: 6 + Math.random() * 6, vy: 10 + Math.random() * 10, life: 20, c: Math.random() < 0.5 ? '#5a4a52' : '#3a3038' });
    for (const e of TA.embers) { e.x += (e.vx + Math.sin(t * 2 + e.y * 0.05) * 6) * dt; e.y += e.vy * dt; e.life -= dt; }
    for (const a of TA.ash) { a.x += (a.vx + Math.sin(t + a.y * 0.1) * 5) * dt; a.y += a.vy * dt; a.life -= dt; }
    TA.embers = TA.embers.filter(e => e.life > 0 && e.y > -4);
    TA.ash = TA.ash.filter(a => a.life > 0 && a.y < UH);
    TA.boltT -= dt;
    if (TA.boltT <= 0) {
      TA.boltT = 4 + Math.random() * 6;
      const pts = []; let bx = 40 + Math.random() * 400, by = 0;
      while (by < 120 + Math.random() * 40) { pts.push([bx, by]); bx += (Math.random() - 0.5) * 18; by += 4 + Math.random() * 8; }
      TA.bolt = { pts, life: 0.35 };
      if (AH.Audio && AH.Audio.sfx) try { AH.Audio.sfx('thunder'); } catch (e) { }
    }
    if (TA.bolt) { TA.bolt.life -= dt; if (TA.bolt.life <= 0) TA.bolt = null; }
  };

  TA.drawScene = function (ctx, t, dim) {
    TA.init();
    ctx.drawImage(TA.bg, 0, 0);
    const b = TA.beat(t);
    // heart glow behind the mountain face
    const hx = TA.PX - 2, hy = 150, R = 46 + b * 10;
    for (let j = -R; j <= R; j += 1) for (let i = -R; i <= R; i += 1) {
      const d = Math.hypot(i, j * 1.15) / R; if (d > 1) continue;
      const X = hx + i, Y = hy + j;
      if (bay(X, Y) < (1 - d) * (0.28 + b * 0.32)) { ctx.fillStyle = d < 0.3 ? '#ff6a1a' : d < 0.6 ? '#a8301a' : '#5a1414'; ctx.fillRect(X, Y, 1, 1); }
    }
    ctx.globalAlpha = 0.55 + b * 0.45; ctx.drawImage(TA.bgEm, 0, 0); ctx.globalAlpha = 1;
    // the heart itself, faintly visible inside the rock
    const hs = AH.SPR.heart;
    if (hs) { ctx.globalAlpha = 0.35 + b * 0.65; AH.drawSprEm(ctx, hs, hx - hs.w * 2.5, hy - hs.h * 2.5, false, 5); ctx.globalAlpha = 1; }
    // lightning
    if (TA.bolt) {
      ctx.fillStyle = 'rgba(255,230,220,' + (0.12 * TA.bolt.life / 0.35) + ')'; ctx.fillRect(0, 0, UW, 190);
      ctx.fillStyle = '#fff2e8';
      const p = TA.bolt.pts;
      for (let k = 1; k < p.length; k++) { const [x0, y0] = p[k - 1], [x1, y1] = p[k]; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let s = 0; s <= n; s++) ctx.fillRect(Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n), 1, 1); }
    }
    // window flicker in the town
    for (let k = 0; k < TA.windows.length; k++) if (Math.sin(t * 3 + k * 7) > 0.97) { const [wx, wy] = TA.windows[k]; ctx.fillStyle = '#2a1a10'; ctx.fillRect(wx, wy, 2, 2); }
    TA.drawHeroes(ctx, t);
    // bats crossing the moon
    for (let k = 0; k < 5; k++) {
      const ph = (t * 0.05 + k * 0.21) % 1, bx = Math.round(500 - ph * 560 + k * 9), by = Math.round(96 + Math.sin(ph * 9 + k) * 14 + k * 5), f = Math.floor(t * 8 + k) % 2;
      ctx.fillStyle = '#0a0508'; ctx.fillRect(bx, by, 2, 1); ctx.fillRect(bx - 2, by - f, 2, 1); ctx.fillRect(bx + 2, by - f, 2, 1); ctx.fillRect(bx - 3, by - f * 2 + 1, 1, 1); ctx.fillRect(bx + 4, by - f * 2 + 1, 1, 1);
    }
    for (const a of TA.ash) { ctx.fillStyle = a.c; ctx.fillRect(Math.round(a.x), Math.round(a.y), 1, 1); }
    for (const e of TA.embers) { ctx.fillStyle = e.c; ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1); if (e.life > 2 && e.c === '#ffd36a') ctx.fillRect(Math.round(e.x), Math.round(e.y) + 1, 1, 1); }
    if (dim) { ctx.fillStyle = 'rgba(6,3,8,' + dim + ')'; ctx.fillRect(0, 0, UW, UH); }
  };

  TA.drawLogo = function (ctx, L, cx, y, t) {
    const X = Math.round(cx - L.W / 2);
    ctx.drawImage(L.c, X, y);
    // molten shimmer sweeping across
    const sweep = ((t * 90) % (L.W + 160)) - 80;
    ctx.fillStyle = 'rgba(255,250,220,0.55)';
    const p = L.pts;
    for (let k = 0; k < p.length; k += 2) { const d = p[k] - p[k + 1] * 0.5 - sweep; if (d > 0 && d < 6) ctx.fillRect(X + p[k], y + p[k + 1], 1, 1); }
    // drips of fire under the letters
    ctx.fillStyle = '#ff8a2e';
    for (let k = 0; k < 7; k++) { const dx = (k * 53 + 17) % L.W, ph = (t * 0.7 + k * 0.37) % 1; if (ph < 0.6) ctx.fillRect(X + dx, y + L.H - 6 + Math.floor(ph * 14), 1, 2); }
  };

  // ---------- splash screen ----------
  const U = AH.UI;
  U.init.splash = function (G, m) { m.t = 0; m.go = -1; TA.init(); };
  U.update.splash = function (G, m, dt) {
    m.t += dt; TA.update(dt, m.t);
    const n = U.nav(G, m, dt);
    const any = Object.keys(n.p).length > 0 || AH.splashTap;
    AH.splashTap = false;
    if (m.t > 2.4 && any && m.go < 0) { m.go = 0; AH.Audio.sfx('select'); }
    if (m.t > 0.4 && m.t < 2.4 && any) m.t = 2.4; // skip the intro
    if (m.go >= 0) { m.go += dt; if (m.go > 0.45) { G.closeAllMenus(); G.openMenu('title', null); G.menu.fromSplash = 0.6; G.menu.lastDev = m.lastDev; } }
    if (!m.boom && m.t > 1.55) { m.boom = 1; G.shakeA = 0; try { AH.Audio.sfx('boom'); } catch (e) { } }
  };
  U.draw.splash = function (G, ctx, m) {
    const t = m.t;
    let sx = 0, sy = 0;
    if (t > 1.55 && t < 1.95) { const k = (1.95 - t) * 10; sx = Math.round((Math.random() - 0.5) * k); sy = Math.round((Math.random() - 0.5) * k); }
    ctx.save(); ctx.translate(sx, sy);
    TA.drawScene(ctx, t, 0);
    // logo slams down from above
    const L = TA.logoBig;
    const k = AH.clamp((t - 1.1) / 0.45, 0, 1), ease = k * k;
    if (t > 1.1) {
      const y = Math.round(-L.H + (28 + L.H) * ease);
      TA.drawLogo(ctx, L, UW / 2, y, t);
      if (t > 1.7) { const a = Math.min(1, (t - 1.7) * 2); ctx.globalAlpha = a; ornament(ctx, UW / 2, 28 + L.H + 4, 'THE MINES OF DUNMERE'); ctx.globalAlpha = 1; }
    }
    ctx.restore();
    if (t > 1.55 && t < 1.8) { ctx.fillStyle = 'rgba(255,220,160,' + ((1.8 - t) * 2.4) + ')'; ctx.fillRect(0, 0, UW, UH); }
    if (t > 2.4 && m.go < 0 && Math.floor(t * 1.6) % 2 === 0) AH.text(ctx, UW / 2, 252, AH.isTouch ? 'TAP TO BEGIN' : 'PRESS ANY BUTTON', '#f2e3b3', { align: 'center' });
    // fade in from black, fade out on start
    let fade = t < 1.0 ? 1 - t : 0;
    if (m.go >= 0) fade = m.go / 0.45;
    if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, fade) + ')'; ctx.fillRect(0, 0, UW, UH); }
  };
  function ornament(ctx, cx, y, label) {
    const w = AH.textW(label);
    AH.text(ctx, cx, y, label, '#f2d3a0', { align: 'center' });
    ctx.fillStyle = '#c8602a';
    for (const s of [-1, 1]) {
      const x0 = cx + s * (w / 2 + 8);
      for (let i = 0; i < 40; i++) { if (i % 6 === 5) continue; ctx.fillRect(Math.round(x0 + s * i), y + 3, 1, 1); }
      ctx.fillStyle = '#ffd36a'; ctx.fillRect(Math.round(x0) - 1, y + 2, 3, 3); ctx.fillStyle = '#c8602a';
    }
  }
  TA.ornament = ornament;
  window.addEventListener('pointerdown', () => { AH.splashTap = true; });
})();
