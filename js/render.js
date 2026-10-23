'use strict';
// Rendering: cameras, dynamic split screen, dithered lighting, weather, HUD
const RW = AH.W, RH = AH.H;
AH.Render = function (canvas) {
  this.c = canvas; this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
  this.L = new Float32Array(RW * RH); this.LR = new Float32Array(RW * RH); this.LG = new Float32Array(RW * RH); this.LB = new Float32Array(RW * RH);
  this.cams = {}; this.views = [];
};
const R = AH.Render.prototype;

R.computeViews = function (G) {
  const locals = G.players.filter(p => !p.remote);
  const alive = locals.filter(p => !p.dead);
  const track = alive.length ? alive : locals;
  if (!track.length) return [];
  const mapW = G.map.w * AH.T, mapH = G.map.h * AH.T;
  const fitView = (x, y, w, h, cx, cy) => {
    let camX = cx - w / 2, camY = G.scene === 'town' ? cy - Math.min(h * 0.78, h - 40) : cy - h / 2 - 8;
    camX = mapW <= w ? (mapW - w) / 2 : AH.clamp(camX, 0, mapW - w);
    camY = mapH <= h ? (mapH - h) / 2 : AH.clamp(camY, 0, mapH - h);
    return { x, y, w, h, camX, camY };
  };
  if (track.length === 1 || locals.length === 1) {
    const p = track[0];
    return [Object.assign(fitView(0, 0, RW, RH, p.x, p.y), { players: locals, main: p })];
  }
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const p of track) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const together = (maxX - minX) < RW - 90 && (maxY - minY) < RH - 70;
  if (together) return [Object.assign(fitView(0, 0, RW, RH, (minX + maxX) / 2, (minY + maxY) / 2), { players: locals, main: track[0] })];
  if (locals.length === 2) {
    return [Object.assign(fitView(0, 0, 159, RH, locals[0].x, locals[0].y), { players: [locals[0]], main: locals[0], split: 1 }),
      Object.assign(fitView(161, 0, 159, RH, locals[1].x, locals[1].y), { players: [locals[1]], main: locals[1], split: 1 })];
  }
  return [Object.assign(fitView(0, 0, 159, RH, locals[0].x, locals[0].y), { players: [locals[0]], main: locals[0], split: 1 }),
    Object.assign(fitView(161, 0, 159, 89, locals[1].x, locals[1].y), { players: [locals[1]], main: locals[1], split: 1 }),
    Object.assign(fitView(161, 91, 159, 89, locals[2].x, locals[2].y), { players: [locals[2]], main: locals[2], split: 1 })];
};

R.draw = function (G) {
  const ctx = this.ctx;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, RW, RH);
  if (!G.map || G.scene === 'title') return;
  const views = this.computeViews(G);
  this.views = views;
  // smooth cameras per view slot
  views.forEach((v, i) => {
    const key = (v.split ? 's' : 'u') + i + views.length;
    const c = this.cams[key];
    // same smoothing at 60, 144 or 240 Hz
    const k = 1 - Math.pow(0.82, Math.min(3, (G.dt || 1 / 60) * 60));
    if (c && c.scene === G.scene && c.floor === G.floorNo) { v.camX = AH.lerp(c.x, v.camX, k); v.camY = AH.lerp(c.y, v.camY, k); }
    this.cams[key] = { x: v.camX, y: v.camY, scene: G.scene, floor: G.floorNo };
  });
  this.views = views;
  const sh = G.shakeA ? (Math.random() - 0.5) * G.shakeA * 2 : 0, sv = G.shakeA ? (Math.random() - 0.5) * G.shakeA * 2 : 0;
  for (const v of views) {
    // pixel-snap the camera relative to the hero it follows, so the hero never wobbles a pixel back and forth
    const snap = (cam, at, lo, hi) => {
      if (!at || hi <= lo || cam < lo + 0.5 || cam > hi - 0.5) return Math.round(cam);
      return AH.clamp(Math.round(at) - Math.round(at - cam), lo, hi);
    };
    const mw = G.map.w * AH.T, mh = G.map.h * AH.T;
    v.camX = snap(v.camX, v.main && v.main.x, 0, mw - v.w) + Math.round(sh);
    v.camY = snap(v.camY, v.main && v.main.y, 0, mh - v.h) + Math.round(sv);
    this.drawWorld(G, v);
    this.applyLight(G, v);
    this.drawEmissive(G, v);
    if (G.scene === 'town') this.drawWeather(G, v);
    this.drawViewHud(G, v, views);
  }
  if (views.length > 1) {
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(159, 0, 2, RH);
    if (views.length === 3) ctx.fillRect(161, 89, 159, 2);
  }
  this.drawGlobalHud(G, views);
};

R.inView = function (v, x, y, m) { m = m || 24; return x > v.camX - m && x < v.camX + v.w + m && y > v.camY - m && y < v.camY + v.h + m * 2; };

R.drawWorld = function (G, v) {
  const ctx = this.ctx, m = G.map;
  ctx.save(); ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip();
  ctx.translate(v.x - v.camX, v.y - v.camY);
  if (G.scene === 'town' && v.camY < 112) this.drawSky(G, v);
  ctx.drawImage(m.canvas, v.camX, v.camY, v.w, v.h, v.camX, v.camY, v.w, v.h);
  if (G.scene === 'mine') {
    ctx.drawImage(m.emCanvas, v.camX, v.camY, v.w, v.h, v.camX, v.camY, v.w, v.h);
    // water shimmer
    if (m.biome.hazard === 'water' || G.event === 'flooded') {
      const t = Math.floor(G.time * 4);
      ctx.fillStyle = '#4a6a8e';
      const tx0 = Math.floor(v.camX / AH.T), ty0 = Math.floor(v.camY / AH.T);
      for (let j = ty0; j < ty0 + v.h / AH.T + 2; j++) for (let i = tx0; i < tx0 + v.w / AH.T + 2; i++) if (m.get(i, j) === 2) ctx.fillRect(i * AH.T + ((i * 7 + j * 3 + t) % 13), j * AH.T + ((i * 3 + j * 5 + t * 2) % 13), 2, 1);
    }
  }
  // zones
  for (const z of G.zones) {
    if (!this.inView(v, z.x, z.y, z.r)) continue;
    const col = { fire: '#c84a1a', efire: '#c84a1a', holy: '#f2e3b3', gas: '#6a9a3a', smoke: '#5a5262' }[z.kind];
    ctx.fillStyle = col;
    const r = z.r, a = Math.min(1, z.t) * (z.kind === 'smoke' ? 0.6 : 0.45);
    for (let j = -r; j <= r; j += 1) for (let i = -r; i <= r; i += 1) {
      if (i * i + j * j * 1.6 > r * r) continue;
      const X = Math.round(z.x + i), Y = Math.round(z.y + j * 0.7);
      if (AH.BAYER[(Y & 3) * 4 + (X & 3)] < a * (1 - Math.hypot(i, j) / r * 0.5)) ctx.fillRect(X, Y, 1, 1);
    }
  }
  // props
  if (G.scene === 'mine') this.drawMineProps(G, v);
  // telegraphs
  for (const f of G.fx) if (f.k === 'tele') {
    const k = 1 - f.life / f.max; ctx.fillStyle = '#ff3b1f';
    for (let a = 0; a < Math.PI * 2; a += 0.08) ctx.fillRect(Math.round(f.x + Math.cos(a) * f.r), Math.round(f.y + Math.sin(a) * f.r * 0.7), 1, 1);
    for (let a = 0; a < Math.PI * 2; a += 0.12) ctx.fillRect(Math.round(f.x + Math.cos(a) * f.r * k), Math.round(f.y + Math.sin(a) * f.r * 0.7 * k), 1, 1);
  }
  // drops
  for (const d of G.drops) {
    if (!this.inView(v, d.x, d.y)) continue;
    const mine = d.owner < 0 || v.players.some(p => p.pid === d.owner) || (G.players.length === 1);
    if (!mine && G.net) continue;
    const y = Math.round(d.y - d.z - 2 + Math.sin(d.t * 3) * 1);
    if (d.gold) { AH.drawSpr(ctx, AH.SPR.coin, d.x - 3, y - 3); continue; }
    const ic = AH.itemIcon(d.item);
    if (d.item.rarity >= 2 && !d.z) { ctx.fillStyle = AH.RARITY[d.item.rarity].border; for (let k = 0; k < 18; k += 2) ctx.fillRect(Math.round(d.x), y - 8 - k, 1, 1); }
    AH.drawSpr(ctx, ic, Math.round(d.x - ic.w / 2), y - ic.h + 2);
    if (G.players.length > 1 && d.owner >= 0) { ctx.fillStyle = AH.PLAYER_COLORS[d.owner]; ctx.fillRect(Math.round(d.x) - 1, y + 2, 3, 1); }
  }
  // dying creatures: white flash, then they sink and crumble into ash
  for (const f of G.fx) if (f.k === 'corpse' && this.inView(v, f.x, f.y, 40)) {
    const k = 1 - f.life / f.max, s = f.spr, sc = f.sc || 1;
    const w = s.w * sc, h = Math.max(1, Math.round(s.h * sc * (1 - k * 0.8)));
    const x = Math.round(f.x - w / 2), y = Math.round(f.y - h + 2 + (f.fly ? -6 + k * 6 : 0));
    if (k < 0.15) AH.drawFlash(ctx, s, x, y, f.face < 0, sc);
    else { ctx.globalAlpha = 1 - k; ctx.drawImage(f.face < 0 ? s.cf : s.c, 0, 0, s.w, Math.max(1, Math.round(s.h * (1 - k * 0.8))), x, y, w, h); ctx.globalAlpha = 1; }
    if (Math.random() < 0.4) G.fx.push({ k: 'px', x: f.x + (Math.random() - 0.5) * w, y: y + Math.random() * h, vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 14, col: Math.random() < 0.5 ? '#5a5060' : '#8a7a7a', life: 0.5 });
  }
  // the fallen stay where they fell, and slowly turn to ash
  if (G.corpses) for (const c of G.corpses) if (this.inView(v, c.x, c.y, 30)) {
    const d = AH.deadSprite(c.spr), sc = c.sc || 1, w = Math.round(d.w * sc), h = Math.round(d.h * sc);
    ctx.globalAlpha = Math.min(1, c.t / 4) * 0.95;
    ctx.drawImage(c.face < 0 ? d.cf : d.c, Math.round(c.x - w / 2), Math.round(c.y - h + 3), w, h);
    ctx.globalAlpha = 1;
  }
  // sortable actors
  const list = [];
  if (G.scene === 'mine') for (const pr of m.props) if (pr.type === 'grave' && this.inView(v, pr.x, pr.y)) list.push({ y: pr.y, d: () => AH.drawGrave(ctx, pr.x, pr.y, false) });
  if (G.scene === 'mine') for (const pr of m.props) if (pr.type === 'qitem' && !pr.taken && this.inView(v, pr.x, pr.y)) list.push({ y: pr.y, d: () => {
    const b = Math.round(Math.sin(G.time * 3) * 1.5);
    ctx.fillStyle = 'rgba(200,160,255,0.25)'; ctx.fillRect(pr.x - 6, pr.y - 2, 12, 3);
    ctx.fillStyle = AH.OUT; ctx.fillRect(pr.x - 5, pr.y - 12 + b, 10, 9); ctx.fillStyle = '#e8dcc4'; ctx.fillRect(pr.x - 4, pr.y - 11 + b, 8, 7); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(pr.x - 3, pr.y - 9 + b, 6, 1); ctx.fillRect(pr.x - 3, pr.y - 7 + b, 4, 1);
    if (Math.floor(G.time * 4) % 2) { ctx.fillStyle = '#e8d0ff'; ctx.fillRect(pr.x + 4, pr.y - 15 + b, 1, 1); ctx.fillRect(pr.x - 6, pr.y - 10 + b, 1, 1); }
  } });
  if (G.scene === 'mine') for (const vn of m.veins || []) if (vn.hp > 0 && this.inView(v, vn.x, vn.y)) list.push({ y: vn.y - 2, d: () => this.drawOreRock(ctx, G, vn) });
  for (const p of G.players) list.push({ y: p.y, d: () => p.draw(ctx, G) });
  for (const e of G.enemies) if (this.inView(v, e.x, e.y, 40)) list.push({ y: e.y, d: () => e.draw(ctx, G) });
  for (const pt of G.pets) if (pt.active) list.push({ y: pt.y + (pt.kind === 'canary' ? 30 : 0), d: () => this.drawPet(G, pt) });
  for (const a of G.allies) list.push({ y: a.y, d: () => {
    if (a.kind !== 'minion') { AH.drawSpr(ctx, a.spr, a.x - a.spr.w / 2, a.y - a.spr.h + 2, a.face < 0); return; }
    if (a.t < 3 && Math.floor(G.time * 10) % 2) return;
    const s = AH.minionFrame(a, G);
    // same motion as the living creature: hop while walking, bob while flying, lunge on a hit
    const moving = a._px !== undefined && Math.hypot(a.x - a._px, a.y - a._py) > 0.02; a._px = a.x; a._py = a.y;
    const lx = a.lunge > 0 ? a.face * 2 : 0, bob = !a.fly && moving && Math.floor(G.time * 8 + a.id) % 2 ? -1 : 0, fy = a.fly ? Math.round(Math.sin(G.time * 5 + a.id) * 2 - 6) : 0;
    const x = Math.round(a.x - s.w / 2) + lx, y = Math.round(a.y - s.h + 2) + bob + fy;
    a._dx = x; a._dy = y; a._s = s;
    ctx.fillStyle = 'rgba(6,4,10,0.5)'; ctx.fillRect(Math.round(a.x - s.w / 3), Math.round(a.y), Math.round(s.w / 1.5), 2);
    if (a.rise > 0) { const k = 1 - a.rise / 0.5, hh = Math.max(1, Math.round(s.h * k)); ctx.drawImage(a.face < 0 ? s.cf : s.c, 0, 0, s.w, hh, x, y + s.h - hh, s.w, hh); return; }
    if (a.flash > 0) AH.drawFlash(ctx, s, x, y, a.face < 0); else AH.drawSpr(ctx, s, x, y, a.face < 0);
    if (a.hp < a.maxHp) AH.bar(ctx, Math.round(a.x) - 5, y - 3, 10, 1, a.hp / a.maxHp, '#8ae08e', '#142014');
  } });
  for (const n of G.npcs) if (this.inView(v, n.x, n.y)) list.push({ y: n.y, d: () => { const bob = (!n.fixed && n.wa !== null && Math.floor(G.time * 4) % 2) ? -1 : 0; AH.drawSpr(ctx, n.spr, n.x - n.spr.w / 2, n.y - n.spr.h + 2 + bob, n.face < 0); if (n.kind === 'lost' && Math.floor(G.time * 2) % 2) AH.text(ctx, n.x, n.y - 24, '!', '#f2c94c', { align: 'center' });
    if (n.say && n.sayUntil > G.time) this.bubbles.push(n); } });
  if (G.scene === 'town') {
    // lamp posts
    const lit = G.lampsLit();
    G.map.lamps.forEach((l, i) => list.push({ y: l.y + 12, d: () => this.drawLamp(ctx, l, i, i < lit, G.time, false, 1 - this.ambientOf(G)) }));
  }
  this.bubbles = [];
  list.sort((a, b) => a.y - b.y);
  for (const it of list) it.d();
  // speech bubbles over villagers
  for (const n of this.bubbles) {
    const lines = AH.wrap(n.say, 120).slice(0, 4), w = Math.max(...lines.map(l => AH.textW(l))) + 8, h = lines.length * 8 + 5;
    const bx = Math.round(n.x - w / 2), by = Math.round(n.y - 36 - h);
    ctx.fillStyle = AH.OUT; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2); ctx.fillStyle = '#f2e8d4'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#f2e8d4'; ctx.fillRect(Math.round(n.x) - 1, by + h, 3, 2); ctx.fillRect(Math.round(n.x), by + h + 2, 1, 1);
    lines.forEach((l, i) => AH.text(ctx, bx + 4, by + 3 + i * 8, l, '#2a2028', { shadow: null }));
  }
  // projectiles (dark parts)
  for (const pr of G.projs) {
    if (!this.inView(v, pr.x, pr.y)) continue;
    if (pr.k === 'arrow') { ctx.fillStyle = '#6b4a2a'; const dx = Math.cos(pr.a), dy = Math.sin(pr.a); for (let k = 0; k < 6; k++) ctx.fillRect(Math.round(pr.x - dx * k), Math.round(pr.y - dy * k), 1, 1); ctx.fillStyle = '#e9e2d0'; ctx.fillRect(Math.round(pr.x), Math.round(pr.y), 1, 1); }
    else if (pr.k === 'knife') { ctx.fillStyle = '#dfe6f0'; ctx.fillRect(Math.round(pr.x), Math.round(pr.y), 2, 2); }
    else if (pr.k === 'bomb') { ctx.fillStyle = AH.OUT; ctx.fillRect(Math.round(pr.x) - 3, Math.round(pr.y) - 3, 6, 6); ctx.fillStyle = '#2a2430'; ctx.fillRect(Math.round(pr.x) - 2, Math.round(pr.y) - 2, 4, 4); ctx.fillStyle = Math.floor(G.time * 10) % 2 ? '#ffd36a' : '#ff3b1f'; ctx.fillRect(Math.round(pr.x) + 1, Math.round(pr.y) - 4, 1, 1); }
  }
  // smoke puffs
  for (const f of G.fx) if (f.k === 'smoke') {
    const k = 1 - f.life / f.max, r = Math.round(f.r * (1 + k * 1.6)), cx = Math.round(f.x + f.vx * k), cy = Math.round(f.y + f.vy * k - k * 6);
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j) / r; if (d > 1) continue; if (AH.BAYER[((cy + j) & 3) * 4 + ((cx + i) & 3)] < (1 - k) * (1.1 - d * 0.6)) { ctx.fillStyle = d < 0.5 ? '#c8c4d0' : '#8a8494'; ctx.fillRect(cx + i, cy + j, 1, 1); } }
  }
  for (const f of G.fx) if (f.k === 'px' && !f.em) { ctx.fillStyle = f.col; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); }
  ctx.restore();
};
R.drawMineProps = function (G, v) {
  const ctx = this.ctx, m = G.map;
  if (this.inView(v, m.stairs.x, m.stairs.y)) {
    AH.drawSpr(ctx, AH.SPR.stairs, m.stairs.x - 8, m.stairs.y - 5);
    if (m.stairs.locked) { ctx.fillStyle = '#5a1a12'; ctx.fillRect(m.stairs.x - 6, m.stairs.y - 1, 12, 1); ctx.fillRect(m.stairs.x - 6, m.stairs.y + 2, 12, 1); }
  }
  if (this.inView(v, m.rope.x, m.rope.y)) AH.drawSpr(ctx, m.hasLift ? AH.SPR.lift : AH.SPR.rope, m.rope.x - (m.hasLift ? 8 : 4), m.rope.y - (m.hasLift ? 2 : 6));
  const hid = m.secret && !m.secret.found;
  for (const p of m.props) {
    if (!this.inView(v, p.x, p.y) || (hid && (p.secret || AH.secretNear(m, p.x, p.y + 8)))) continue;
    switch (p.type) {
      case 'chest': AH.drawSpr(ctx, p.open ? AH.SPR.chestOpen : AH.SPR.chest, p.x - 8, p.y - 9); break;
      case 'tablet': AH.drawSpr(ctx, AH.SPR.tablet, p.x - 6, p.y - 8); break;
      case 'shrine': AH.drawSpr(ctx, AH.SPR.shrine, p.x - 6, p.y - 11); if (p.used) { ctx.fillStyle = '#3a3442'; ctx.fillRect(p.x - 2, p.y - 11, 5, 3); } break;
      case 'dig': if (!p.dug) { if (G.pets.some(pt => pt.kind === 'dog' && pt.active) || Math.floor(G.time * 2 + p.x) % 7 === 0) AH.drawSpr(ctx, AH.SPR.digspot, p.x - 4, p.y - 3); } else { ctx.fillStyle = '#1a1620'; ctx.fillRect(p.x - 3, p.y - 1, 6, 2); } break;
      case 'deco': {
        const s = p.kind === 'bones' ? AH.SPR.bones : AH.SPR.rubble;
        if (p.kind === 'moss') { ctx.fillStyle = '#3e6a3a'; ctx.fillRect(p.x - 3, p.y, 6, 1); ctx.fillRect(p.x - 1, p.y - 1, 3, 1); }
        else if (p.kind === 'shroomS') { ctx.fillStyle = '#c84ac8'; ctx.fillRect(p.x - 1, p.y - 3, 3, 1); ctx.fillStyle = '#d8c8a8'; ctx.fillRect(p.x, p.y - 2, 1, 2); }
        else AH.drawSpr(ctx, s, p.x - 3, p.y - 2);
        break;
      }
      case 'torchWall': ctx.fillStyle = '#5a3c22'; ctx.fillRect(p.x + 2, p.y + 5, 2, 7); ctx.fillStyle = '#3a261a'; ctx.fillRect(p.x + 1, p.y + 4, 4, 2); break;
    }
  }
  // sniffed secret wall marker
  if (m.secret && m.secret.sniffed && !m.secret.found) { const x = m.secret.wall[0] * AH.T + 8, y = m.secret.wall[1] * AH.T + 6; if (Math.floor(G.time * 3) % 2) { ctx.fillStyle = '#f2c94c'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } }
};
R.drawPet = function (G, pt) {
  const ctx = this.ctx;
  const s = AH.SPR[AH.PETS[pt.kind].spr];
  const bob = pt.moving && Math.floor(G.time * 8) % 2 ? -1 : 0;
  if (pt.kind === 'canary') { const fl = Math.floor(G.time * 10) % 2; AH.drawSpr(ctx, s, pt.x - 3, pt.y - 3 + fl, pt.face < 0); if (pt.chirp > 0) AH.text(ctx, pt.x + 4, pt.y - 10, '!', '#f8d83c'); return; }
  AH.drawSpr(ctx, s, pt.x - s.w / 2, pt.y - s.h + 2 + bob, pt.face < 0);
};

// ---------- lighting ----------
// live sky behind the town (day blue -> dusk -> night)
R.drawSky = function (G, v) {
  const ctx = this.ctx, a = this.ambientOf(G), h = G.world.hour;
  const day = ['#5a86c0', '#6e98cc', '#86acd8', '#a0c0e0', '#bcd2e8', '#d4e0ec'];
  const dusk = ['#2a2a50', '#3e3460', '#5a4068', '#86506a', '#c06a5a', '#e89a5a'];
  const night = ['#0e0e1c', '#141428', '#1a1a30', '#22203a', '#2a2642', '#322c48'];
  const isDusk = (h > 17 && h < 21) || (h > 5 && h < 8);
  const t = AH.clamp((a - 0.3) / 0.7, 0, 1);
  const top = 0, bot = 112, n = 6;
  for (let i = 0; i < n; i++) {
    let col;
    if (isDusk) col = t > 0.5 ? AH.mix(dusk[i], day[i], (t - 0.5) * 2) : AH.mix(night[i], dusk[i], t * 2);
    else col = AH.mix(night[i], day[i], t);
    ctx.fillStyle = col;
    ctx.fillRect(v.camX, top + Math.floor(i * (bot - top) / n), v.w, Math.ceil((bot - top) / n) + 1);
  }
  if (t < 0.4) { // stars
    ctx.fillStyle = '#e8e4ff';
    for (let k = 0; k < 60; k++) { const sx = (k * 97) % (G.map.w * AH.T), sy = (k * 53) % 70; if (sx >= v.camX && sx < v.camX + v.w && (Math.floor(G.time * 2 + k) % 9)) ctx.fillRect(sx, sy, 1, 1); }
    ctx.fillStyle = '#f2ecd0'; const mx = 40 * AH.T; ctx.fillRect(mx, 12, 8, 8); ctx.fillStyle = night[1]; ctx.fillRect(mx + 3, 11, 7, 7);
  }
};
R.ambientOf = function (G) {
  if (G.scene === 'town') {
    const h = G.world.hour;
    let a = h < 5 ? 0.3 : h < 8 ? AH.lerp(0.3, 1, (h - 5) / 3) : h < 18 ? 1 : h < 21 ? AH.lerp(1, 0.32, (h - 18) / 3) : 0.3;
    const w = G.world.weather;
    if (w === 'rain') a *= 0.82; else if (w === 'fog') a *= 0.86; else if (w === 'storm') a *= 0.68; else if (w === 'snow') a *= 0.92;
    if (G.lightning > 0) a = Math.min(1, a + 0.7);
    return a;
  }
  if (G.floorNo <= 5) return 0.82;
  if (G.event === 'dark') return 0.015;
  return G.map.biome.ambient;
};
R.collectLights = function (G, v) {
  const L = [];
  const add = (x, y, r, i, tint, st) => { if (x + r > v.camX && x - r < v.camX + v.w && y + r > v.camY && y - r < v.camY + v.h) L.push([x, y, r, i, tint, st]); };
  const warm = [1.0, 0.86, 0.66];
  for (const p of G.players) {
    if (p.remote && G.isHost === false) { /* still light */ }
    const torchK = G.scene === 'mine' && G.floorNo >= 6 ? (0.35 + 0.65 * Math.min(1, p.torch / 40)) : 1;
    const r = (G.scene === 'town' ? 70 : 112) * torchK * (1 + p.S.light / 100) * (p.dead ? 0.4 : 1);
    add(p.x, p.y - 8, r, 1.0, warm);
  }
  for (const l of G.map.lights) { if (G.scene === 'mine' && AH.secretNear(G.map, l.x, l.y + 8)) continue; const f = l.flicker ? 0.9 + Math.sin(G.time * 13 + l.x) * 0.06 + Math.sin(G.time * 7.3 + l.y) * 0.05 : 1; add(l.x, l.y, l.r * f, l.i, l.tint, l.r); }
  if (G.scene === 'mine' && G.map.lavaLights) for (const l of G.map.lavaLights) add(l.x, l.y, 30, 0.55, [1.25, 0.6, 0.35], 30);
  for (const pr of G.projs) if (pr.light || pr.enemy) add(pr.x, pr.y, pr.k === 'fire' ? 40 : 24, 0.7, pr.k === 'fire' ? [1.2, 0.7, 0.4] : [0.8, 0.95, 1.2]);
  for (const f of G.flashLights) add(f.x, f.y, f.r, f.i * (f.life / 0.25), f.tint);
  for (const a of G.allies) if (a.kind === 'minion' && !a.dead) add(a.x, a.y - 6, 26, 0.3, [0.7, 1.2, 0.7]);
  for (const z of G.zones) if (z.kind === 'fire' || z.kind === 'efire' || z.kind === 'holy') add(z.x, z.y, z.r * 1.6, 0.5, z.kind === 'holy' ? [1.1, 1.05, 0.85] : [1.2, 0.7, 0.4]);
  for (const e of G.enemies) if ((e.legend || e.boss || e.nemesis) && !e.dead && !e.hidden) add(e.x, e.y - 10, 96, 0.7, [1.25, 0.7, 0.55]);
  if (G.scene === 'town') {
    const night = 1 - this.ambientOf(G);
    if (night > 0.15) {
      for (const w of G.map.windows) add(w.x, w.y, 34, 0.55 * night, [1.0, 0.78, 0.48], 34);
      const lit = G.lampsLit();
      G.map.lamps.forEach((l, i) => { if (i < lit) add(l.x + 1, l.y - 16, 62 + Math.sin(G.time * 9 + i * 3) * 3, 0.9 * night + 0.1, [1.0, 0.8, 0.5], 66); });
    }
    if (G.map.forge) add(G.map.forge.x, G.map.forge.y, 56, 0.9, [1.0, 0.62, 0.32], 56);
  }
  if (G.scene === 'mine') for (const vn of G.map.veins || []) if (vn.hp > 0) if (vn.ore !== 'coal') add(vn.x, vn.y - 8, vn.gem ? 30 : 22, vn.gem ? 0.5 : 0.3, vn.gem ? [0.7, 1.05, 1.3] : [1.25, 0.95, 0.55], vn.gem ? 30 : 22);
  if (G.scene === 'mine' && G.map.biome.id === 'ashen') add(v.camX + v.w / 2, v.camY - 40, 220, 0.18, [1.3, 0.6, 0.4]);
  return L;
};
AH.fancyOn = () => AH.options && (AH.options.fancy === undefined ? !AH.isTouch : !!AH.options.fancy);
R.applyLight = function (G, v) {
  const amb = this.ambientOf(G);
  if (amb >= 0.995) return;
  if (AH.fancyOn()) return this.applyLightFancy(G, v, amb);
  const ctx = this.ctx;
  const W = v.w, H = v.h;
  const Ls = this.L, LR = this.LR, LG = this.LG, LB = this.LB;
  const n = W * H;
  const ambTint = G.scene === 'town' ? [0.82, 0.88, 1.08] : G.map.biome.tint;
  for (let i = 0; i < n; i++) { Ls[i] = amb; LR[i] = amb * ambTint[0]; LG[i] = amb * ambTint[1]; LB[i] = amb * ambTint[2]; }
  const lights = this.collectLights(G, v);
  for (const [lx, ly, r, inten, tint] of lights) {
    const cx = lx - v.camX, cy = ly - v.camY;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    const ir = 1 / r;
    for (let y = y0; y <= y1; y++) {
      const dy = (y - cy) * 1.15, row = y * W;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx; const d = Math.sqrt(dx * dx + dy * dy) * ir;
        if (d >= 1) continue;
        const f = 1 - d; const val = inten * f * Math.sqrt(f) ;
        const o = row + x; Ls[o] += val; LR[o] += val * tint[0]; LG[o] += val * tint[1]; LB[o] += val * tint[2];
      }
    }
  }
  const img = ctx.getImageData(v.x, v.y, W, H), px = img.data;
  const steps = 6;
  const dk0 = 6, dk1 = 5, dk2 = 12;
  for (let y = 0; y < H; y++) {
    const by = ((y + v.y) & 3) * 4;
    for (let x = 0; x < W; x++) {
      const o = y * W + x, p4 = o * 4;
      const s = Ls[o];
      let tot = s > 1 ? 1 : s;
      let b = Math.round(tot * steps);
      const f = b >= steps ? 1 : b / steps;
      const inv = s > 0.0001 ? 1 / s : 0;
      let tr = LR[o] * inv, tg = LG[o] * inv, tb = LB[o] * inv;
      if (s > 1.2) { const k = Math.min(1, (s - 1.2) * 0.5); tr += (1 - tr) * k * 0.3; tg += (1 - tg) * k * 0.3; tb += (1 - tb) * k * 0.3; }
      let r = px[p4] * tr, g = px[p4 + 1] * tg, bb = px[p4 + 2] * tb;
      if (r > 255) r = 255; if (g > 255) g = 255; if (bb > 255) bb = 255;
      px[p4] = dk0 + (r - dk0) * f; px[p4 + 1] = dk1 + (g - dk1) * f; px[p4 + 2] = dk2 + (bb - dk2) * f;
    }
  }
  ctx.putImageData(img, v.x, v.y);
};

// "Spectacular lights": normals from the pixel art, walls that cut the light, actors that cast shadows, smooth falloff
R.applyLightFancy = function (G, v, amb) {
  const ctx = this.ctx, W = v.w, H = v.h, n = W * H;
  const tint = G.scene === 'town' ? [0.82, 0.88, 1.08] : G.map.biome.tint;
  const img = ctx.getImageData(v.x, v.y, W, H), px = img.data;
  if (!this.fz || this.fz.n !== n) this.fz = { n, hgt: new Float32Array(n), NX: new Float32Array(n), NY: new Float32Array(n), NZ: new Float32Array(n), R: new Float32Array(n), G: new Float32Array(n), B: new Float32Array(n), sh: new Map(), mapRef: null };
  const F = this.fz, hgt = F.hgt, NX = F.NX, NY = F.NY, NZ = F.NZ, LR = F.R, LG = F.G, LB = F.B;
  if (F.mapRef !== G.map) { F.mapRef = G.map; F.sh.clear(); }
  for (let i = 0; i < n; i++) { const p4 = i * 4; hgt[i] = (px[p4] * 0.3 + px[p4 + 1] * 0.55 + px[p4 + 2] * 0.15) * (1 / 255); }
  for (let i = 0; i < n; i++) {
    const nx = -(hgt[i < n - 1 ? i + 1 : i] - hgt[i > 0 ? i - 1 : i]) * 2.2, ny = -(hgt[i < n - W ? i + W : i] - hgt[i >= W ? i - W : i]) * 2.2;
    const nl = 1 / Math.sqrt(nx * nx + ny * ny + 1); NX[i] = nx * nl; NY[i] = ny * nl; NZ[i] = nl;
  }
  const a0 = amb * 1.15; for (let i = 0; i < n; i++) { LR[i] = a0 * tint[0]; LG[i] = a0 * tint[1]; LB[i] = a0 * tint[2]; }
  const T = AH.T, map = G.map;
  const wall = (wx, wy) => AH.wallTile(map.get(Math.floor(wx / T), Math.floor(wy / T)));
  const actors = []; for (const p of G.players) if (!p.dead) actors.push(p); for (const e of G.enemies) if (!e.dead && !e.hidden && e.r) actors.push(e);
  const lights = this.collectLights(G, v);
  let built = false;
  for (const [lx, ly, r, inten, tn, st] of lights) {
    if (inten < 0.04) continue;
    const cx = lx - v.camX, cy = ly - v.camY;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    // wall shadows only for lights that stay put (torches, crystals, lava, lamps); built once per map
    let sm = null;
    if (st && st <= 120) {
      const key = (lx | 0) + ',' + (ly | 0); sm = F.sh.get(key);
      if (!sm && !built) {
        // one mask per frame, on a 2px grid, so entering a floor never stutters
        built = true;
        const R0 = Math.ceil(st * 1.15), S = R0 + 1; sm = new Uint8Array(S * S);
        for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
          const wx = lx - R0 + i * 2, wy = ly - R0 + j * 2; if (wall(wx, wy + 2)) { sm[j * S + i] = 255; continue; }
          const dist = Math.hypot(lx - wx, ly - wy); if (dist > R0) { sm[j * S + i] = 255; continue; }
          const steps = Math.ceil(dist / 4); let lit = 255;
          for (let s = 1; s < steps; s++) { const t = s / steps; if (wall(wx + (lx - wx) * t, wy + (ly - wy) * t)) { lit = 40; break; } }
          sm[j * S + i] = lit;
        }
        sm.R0 = R0; sm.S = S; F.sh.set(key, sm);
      }
    }
    const casters = sm ? actors.filter(a => { const d = Math.hypot(a.x - lx, a.y - ly); return d < r && d > 8; }) : [];
    const ir = 1 / r;
    for (let y = y0; y <= y1; y++) {
      const dy = (y - cy) * 1.15, row = y * W;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, d = Math.sqrt(dx * dx + dy * dy) * ir; if (d >= 1) continue;
        const o = row + x;
        const lx3 = cx - x, ly3 = cy - y, ll = 1 / Math.sqrt(lx3 * lx3 + ly3 * ly3 + 196);
        let ndl = (NX[o] * lx3 + NY[o] * ly3 + NZ[o] * 14) * ll; if (ndl < 0) ndl = 0;
        let sh = 1;
        if (sm) {
          const wx = x + v.camX, wy = y + v.camY, i2 = (wx - lx + sm.R0 + 1) >> 1, j2 = (wy - ly + sm.R0 + 1) >> 1;
          if (i2 >= 0 && j2 >= 0 && i2 < sm.S && j2 < sm.S) sh = sm[j2 * sm.S + i2] / 255;
          for (const a of casters) {
            const vx = lx - wx, vy = ly - wy, len2 = vx * vx + vy * vy; const t = ((a.x - wx) * vx + (a.y - 4 - wy) * vy) / len2;
            if (t <= 0.02 || t >= 1) continue;
            const qx = wx + vx * t - a.x, qy = wy + vy * t - (a.y - 4), dd = Math.sqrt(qx * qx + qy * qy), rr = (a.r || 4) * 0.8 + 1;
            if (dd < rr + 2) { const k = 0.3 + 0.7 * Math.max(0, (dd - rr) / 2); if (k < sh) sh = k; }
          }
        }
        const f = 1 - d, val = inten * f * Math.sqrt(f) * (0.4 + 1.0 * ndl) * sh * 1.5;
        LR[o] += val * tn[0]; LG[o] += val * tn[1]; LB[o] += val * tn[2];
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const p4 = i * 4;
    let a = LR[i], b = LG[i], c = LB[i]; if (a > 1.7) a = 1.7; if (b > 1.7) b = 1.7; if (c > 1.7) c = 1.7;
    a = ((a * 8 + 0.5) | 0) / 8; b = ((b * 8 + 0.5) | 0) / 8; c = ((c * 8 + 0.5) | 0) / 8;
    const r = px[p4] * a, g = px[p4 + 1] * b, bb = px[p4 + 2] * c;
    px[p4] = r > 255 ? 255 : r; px[p4 + 1] = g > 255 ? 255 : g; px[p4 + 2] = bb > 255 ? 255 : bb;
  }
  ctx.putImageData(img, v.x, v.y);
};
// glow on the final screen: bright pixels bleed light (cheap: tiny canvases scaled up smoothly)
R.bloom = function (sctx, world, view) {
  if (!this.bl) { const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }; this.bl = { a: mk(80, 45), b: mk(40, 23), c: mk(20, 12), vg: null }; }
  const B = this.bl, a = B.a.getContext('2d'), b = B.b.getContext('2d'), c = B.c.getContext('2d');
  a.globalCompositeOperation = 'copy'; a.filter = 'brightness(0.6) contrast(4) saturate(1.5)'; a.imageSmoothingEnabled = true; a.drawImage(world, 0, 0, 80, 45);
  b.globalCompositeOperation = 'copy'; b.imageSmoothingEnabled = true; b.drawImage(B.a, 0, 0, 40, 23);
  c.globalCompositeOperation = 'copy'; c.imageSmoothingEnabled = true; c.drawImage(B.b, 0, 0, 20, 12);
  sctx.save(); sctx.globalCompositeOperation = 'lighter'; sctx.imageSmoothingEnabled = true;
  sctx.globalAlpha = 0.5; sctx.drawImage(B.b, view.x, view.y, view.w, view.h);
  sctx.globalAlpha = 0.55; sctx.drawImage(B.c, view.x, view.y, view.w, view.h);
  sctx.restore();
  // vignette
  if (!B.vg || B.vgW !== view.w) { B.vgW = view.w; const v2 = document.createElement('canvas'); v2.width = 160; v2.height = 90; const x = v2.getContext('2d');
    const g = x.createRadialGradient(80, 45, 28, 80, 45, 95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); x.fillStyle = g; x.fillRect(0, 0, 160, 90); B.vg = v2; }
  sctx.save(); sctx.imageSmoothingEnabled = true; sctx.drawImage(B.vg, view.x, view.y, view.w, view.h); sctx.restore();
};

// a servant's current frame: bats keep flapping their wings after death too
AH.minionFrame = function (a, G) {
  const base = a.def ? a.def.spr : a.base;
  if (base === 'bat') {
    if (!a.spr2) a.spr2 = AH.raisedSprite(AH.creatureSprite({ spr: 'bat2', pal: (a.def && a.def.pal) || a.pal || {} }));
    if (Math.floor(G.time * 11 + a.id * 3) % 2) return a.spr2;
  }
  return a.spr;
};
R.drawEmissive = function (G, v) {
  const ctx = this.ctx, m = G.map;
  ctx.save(); ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip();
  ctx.translate(v.x - v.camX, v.y - v.camY);
  if (G.scene === 'mine') ctx.drawImage(m.emCanvas, v.camX, v.camY, v.w, v.h, v.camX, v.camY, v.w, v.h);
  else {
    const night = 1 - this.ambientOf(G);
    if (night > 0.2) { ctx.globalAlpha = Math.min(1, night * 1.4); ctx.drawImage(m.emCanvas, v.camX, v.camY, v.w, v.h, v.camX, v.camY, v.w, v.h); ctx.globalAlpha = 1; }
    if (G.map.forge) { const f = G.map.forge; ctx.fillStyle = Math.floor(G.time * 8) % 2 ? '#ffd36a' : '#ff8a2e'; ctx.fillRect(f.x - 3, f.y - 2, 2, 2); ctx.fillRect(f.x + 2, f.y - 4, 1, 2); }
    const lit = G.lampsLit();
    G.map.lamps.forEach((l, i) => { if (i < lit) this.drawLamp(ctx, l, i, true, G.time, true, night); });
    // chimney smoke
    if (G.map.chimney) { ctx.fillStyle = '#5a5468'; for (let k = 0; k < 6; k++) { const t = (G.time * 0.6 + k / 6) % 1; ctx.fillRect(Math.round(G.map.chimney.x + Math.sin(t * 6 + k) * 2), Math.round(G.map.chimney.y - t * 30), 2, 2); } }
  }
  // wall torch flames
  if (G.scene === 'mine') for (const p of m.props) if (p.type === 'torchWall' && this.inView(v, p.x, p.y) && !AH.secretNear(m, p.x, p.y + 8)) {
    const fl = Math.floor(G.time * 10 + p.x) % 3;
    ctx.fillStyle = '#ff8a2e'; ctx.fillRect(p.x + 1, p.y + 1 - fl % 2, 4, 3);
    ctx.fillStyle = '#ffd36a'; ctx.fillRect(p.x + 2, p.y + 1, 2, 3);
    ctx.fillStyle = '#fff2b0'; ctx.fillRect(p.x + 2, p.y + 3, 1, 1);
    if (fl === 0) { ctx.fillStyle = '#e0702a'; ctx.fillRect(p.x + 3, p.y - 1, 1, 1); }
  }
  for (const e of G.enemies) if (this.inView(v, e.x, e.y, 40)) e.drawEm(ctx, G);
  for (const a of G.allies) if (a.kind === 'minion' && !(a.rise > 0) && a._s && this.inView(v, a.x, a.y, 30) && !(a.t < 3 && Math.floor(G.time * 10) % 2)) AH.drawSprEm(ctx, a._s, a._dx, a._dy, a.face < 0);
  if (G.scene === 'mine') for (const p of m.props) if (p.type === 'tablet' && !(p.secret && m.secret && !m.secret.found) && this.inView(v, p.x, p.y)) AH.drawSprEm(ctx, AH.SPR.tablet, p.x - 6, p.y - 8);
  // ore glints so rocks catch the eye even in the dark
  if (G.scene === 'mine') (m.veins || []).forEach((vn, i) => {
    if (vn.hp <= 0 || !this.inView(v, vn.x, vn.y)) return;
    const X = vn.x - 7, Y = vn.y - 13, ph = (G.time * 0.7 + i * 0.37) % 1.6;
    const pts = vn.gem ? [[3, 1], [9, 0], [12, 4], [6, 5]] : [[3, 5], [9, 3], [11, 8], [5, 9]], q = pts[(Math.floor(G.time * 0.7 + i * 0.37)) % 4];
    if (ph < 0.35) {
      const r = ph < 0.12 || ph > 0.24 ? 1 : 2, gx = X + q[0], gy = Y + q[1];
      ctx.fillStyle = '#ffffff'; ctx.fillRect(gx, gy, 1, 1);
      ctx.fillStyle = vn.gem ? '#bff4ff' : (AH.ORE_COLORS[vn.ore] || [0, 0, 0, '#fff0b8'])[3]; for (let d = 1; d <= r; d++) { ctx.fillRect(gx - d, gy, 1, 1); ctx.fillRect(gx + d, gy, 1, 1); ctx.fillRect(gx, gy - d, 1, 1); ctx.fillRect(gx, gy + d, 1, 1); }
    }
    if (vn.gem) { ctx.fillStyle = '#6fd6e8'; ctx.fillRect(X + 4, Y + 1, 1, 2); ctx.fillRect(X + 9, Y, 1, 2); }
  });
  // glowing projectiles
  for (const pr of G.projs) {
    if (!this.inView(v, pr.x, pr.y)) continue;
    if (pr.k === 'magic' || pr.k === 'spit' || pr.k === 'fire' || pr.k === 'wave') {
      const r = pr.k === 'fire' ? 3 : pr.heavy ? 3 : 2;
      ctx.fillStyle = pr.col; ctx.fillRect(Math.round(pr.x) - r, Math.round(pr.y) - r + 1, r * 2, r * 2 - 2); ctx.fillRect(Math.round(pr.x) - r + 1, Math.round(pr.y) - r, r * 2 - 2, r * 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(pr.x) - 1, Math.round(pr.y) - 1, 2, 2);
      if (Math.random() < 0.5) G.fx.push({ k: 'px', x: pr.x, y: pr.y, vx: 0, vy: 0, col: pr.col, life: 0.15, em: 1 });
    }
  }
  // fx
  for (const f of G.fx) {
    if (f.k === 'px' && f.em) { ctx.fillStyle = f.col; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); }
    else if (f.k === 'ring') { const k = 1 - f.life / f.max; const r = AH.lerp(f.r0, f.r1, k); ctx.fillStyle = f.col; for (let a = 0; a < Math.PI * 2; a += 1 / Math.max(4, r)) ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r * 0.7), 1, 1); }
    else if (f.k === 'boom') { const k = 1 - f.life / f.max; const r = f.r * (0.4 + k * 0.6); for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j) / r; if (d > 1) continue; if (AH.BAYER[((Math.round(f.y + j)) & 3) * 4 + ((Math.round(f.x + i)) & 3)] < (1 - d) * (1 - k) * 1.3) { ctx.fillStyle = d < 0.3 ? '#fff2b0' : d < 0.6 ? '#ffb347' : '#c84a1a'; ctx.fillRect(Math.round(f.x + i), Math.round(f.y + j * 0.7), 1, 1); } } }
    else if (f.k === 'bolt') { const rng = AH.mulberry(f.seed | 0); let x = f.x0, y = f.y0; const n = 8; ctx.fillStyle = '#ffe04a'; for (let i = 1; i <= n; i++) { const nx = AH.lerp(f.x0, f.x1, i / n) + (i < n ? rng.range(-4, 4) : 0), ny = AH.lerp(f.y0, f.y1, i / n) + (i < n ? rng.range(-4, 4) : 0); const st = Math.ceil(Math.hypot(nx - x, ny - y)); for (let s = 0; s < st; s++) ctx.fillRect(Math.round(AH.lerp(x, nx, s / st)), Math.round(AH.lerp(y, ny, s / st)), 1, 1); x = nx; y = ny; } }
    else if (f.k === 'arc') {
      const cols = f.heavy ? ['#fff2d0', '#ffd36a', '#ffb347', '#e0702a'] : ['#ffffff', '#cfd6e4', '#8a92a8'];
      const k = 1 - f.life / f.max;
      AH.arc(ctx, f.x, f.y, f.r * (0.7 + k * 0.3), f.a - f.arc / 2, f.a - f.arc / 2 + f.arc * Math.min(1, k * 1.6 + 0.3), cols);
    }
  }
  // numbers
  for (const f of G.fx) if (f.k === 'num') { if (f.life < 0.2 && Math.floor(f.life * 30) % 2) continue; AH.text(ctx, f.x, f.y, f.t, f.col, { align: 'center' }); }
  // names over legends
  for (const e of G.enemies) if ((e.legend || e.nemesis) && !e.boss && !e.dead && !e.hidden && this.inView(v, e.x, e.y)) AH.text(ctx, e.x, e._dy - 12, e.name, e.nemesis ? '#e05a5a' : '#ff9a3e', { align: 'center' });
  // interact prompts
  for (const p of v.players) {
    const it = p.interactable;
    if (!it || !it.label || p.dead) continue;
    const key = p.device === 'kb1' ? 'J' : p.device === 'kb2' ? 'N1' : 'A';
    const label = it.label, kw = AH.textW(key), tw = AH.textW(label) + kw + 12;
    const x = Math.round(it.x - tw / 2), y = Math.round(it.y - 34);
    AH.frame(ctx, x, y, tw, 12, { fill: '#15121b', edge: '#c9a24a', hi: '#f2e3b3' });
    AH.text(ctx, x + 4, y + 3, key, '#ffb347'); AH.text(ctx, x + 8 + kw, y + 3, label, '#f2e3b3');
  }
  ctx.restore();
};

R.drawWeather = function (G, v) {
  const ctx = this.ctx, w = G.world.weather;
  ctx.save(); ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip();
  if (w === 'rain' || w === 'storm') {
    const n = w === 'storm' ? 140 : 90;
    const t = G.time;
    for (let i = 0; i < n; i++) {
      const sx = (i * 73.13 + t * 40) % v.w, sy = (i * 41.7 + t * (210 + (i % 5) * 20)) % (v.h + 10) - 5;
      ctx.fillStyle = i % 3 ? 'rgba(160,180,216,0.55)' : 'rgba(200,214,240,0.7)';
      ctx.fillRect(Math.round(v.x + sx), Math.round(v.y + sy), 1, 3);
    }
    for (let i = 0; i < 14; i++) { const sx = (i * 97.3 + Math.floor(t * 6) * 31) % v.w, sy = (i * 53.1 + Math.floor(t * 6) * 17) % v.h; ctx.fillStyle = 'rgba(180,196,230,0.6)'; ctx.fillRect(Math.round(v.x + sx) - 1, Math.round(v.y + sy), 3, 1); }
  } else if (w === 'snow') {
    for (let i = 0; i < 80; i++) {
      const sx = (i * 61.7 + Math.sin(G.time + i) * 10 + G.time * 8) % v.w, sy = (i * 37.3 + G.time * (22 + (i % 4) * 6)) % v.h;
      ctx.fillStyle = i % 4 ? '#e8f0ff' : '#ffffff'; ctx.fillRect(Math.round(v.x + sx), Math.round(v.y + sy), i % 5 ? 1 : 2, i % 5 ? 1 : 2);
    }
  } else if (w === 'fog') {
    // soft drifting fog banks
    ctx.fillStyle = 'rgba(150,156,180,0.16)'; ctx.fillRect(v.x, v.y, v.w, v.h);
    for (let k = 0; k < 7; k++) {
      const by = v.y + ((k * 29 + v.camY * 0.2) % v.h), bw = 90 + (k * 37) % 80;
      const bx = v.x + ((k * 83 + G.time * (6 + k)) % (v.w + bw)) - bw;
      ctx.fillStyle = 'rgba(170,176,196,0.13)';
      for (let j = 0; j < 4; j++) ctx.fillRect(Math.round(bx + j * 6), Math.round(by + j * 3), bw - j * 12, 12 - j * 3);
    }
  }
  if (G.lightning > 0.15) { ctx.fillStyle = 'rgba(230,236,255,0.35)'; ctx.fillRect(v.x, v.y, v.w, v.h); }
  ctx.restore();
};

// ---------- HUD ----------
R.playerPanel = function (G, p, x, y, compact) {
  const ctx = this.ctx;
  const w = compact ? 76 : 106, h = compact ? 22 : 30;
  AH.frame(ctx, x, y, w, h, { edge: compact ? p.color : '#5a4e66' });
  if (!compact) {
    AH.slot(ctx, x + 2, y + 2, 26, '#c9a24a', '#1d1824');
    ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 4, 22, 22); ctx.clip();
    AH.drawSpr(ctx, p.portrait, x + 15 - p.portrait.w / 2, y + 5, false); ctx.restore();
    AH.text(ctx, x + 31, y + 3, p.ch.name.slice(0, 7), '#f2e3b3');
    AH.text(ctx, x + w - 4, y + 3, 'LV' + p.ch.level, '#8d8494', { align: 'right' });
    AH.bar(ctx, x + 31, y + 13, w - 35, 4, p.hp / p.S.hp, '#d43c3c', '#3a1416', '#ff8a8a');
    AH.bar(ctx, x + 31, y + 20, w - 35, 3, p.mp / p.S.mp, '#4a7bd1', '#141a2a', '#9ec0ff');
    AH.bar(ctx, x + 31, y + 26, w - 35, 1, p.ch.xp / AH.xpNeed(p.ch.level), '#e8c25a', '#2a2214');
  } else {
    AH.text(ctx, x + 4, y + 3, p.ch.name.slice(0, 7), p.color);
    AH.text(ctx, x + w - 4, y + 3, '' + p.ch.level, '#8d8494', { align: 'right' });
    AH.bar(ctx, x + 4, y + 13, w - 8, 3, p.hp / p.S.hp, '#d43c3c', '#3a1416', '#ff8a8a');
    AH.bar(ctx, x + 4, y + 18, w - 8, 1, p.mp / p.S.mp, '#4a7bd1', '#141a2a');
  }
  if (p.dead) AH.text(ctx, x + w / 2, y + h / 2 - 3, 'DOWN', '#ff6a5a', { align: 'center' });
  return h;
};
R.miniBar = function (G, p, x, y) {
  const ctx = this.ctx;
  const ids = p.ch.slots;
  for (let i = 0; i < 3; i++) {
    const id = ids[i]; const sx = x + i * 13;
    AH.slot(ctx, sx, y, 12, '#3a3242');
    if (!id) continue;
    AH.drawSpr(ctx, AH.ICON[AH.SKILLS[id].icon], sx - 1, y - 1, false);
    const cd = p.skillCd[id] || 0;
    if (cd > 0) { ctx.fillStyle = 'rgba(8,6,12,0.7)'; ctx.fillRect(sx + 2, y + 2, 8, Math.ceil(8 * cd / AH.SKILLS[id].cd)); }
  }
  AH.text(ctx, x + 41, y + 3, '' + p.countCons('potion'), '#ff8a8a');
};
R.drawViewHud = function (G, v, views) {
  const ctx = this.ctx;
  if (v.split) {
    const p = v.main;
    this.playerPanel(G, p, v.x + 2, v.y + 2, true);
    this.miniBar(G, p, v.x + 2, v.y + 26);
    if (G.scene === 'mine' && G.floorNo >= 6) this.torchGauge(G, p, v.x + 2, v.y + 40);
    // arrows to others
    for (const o of G.players) {
      if (o === p || o.remote) continue;
      const ox = o.x - v.camX, oy = o.y - 8 - v.camY;
      if (ox > 0 && ox < v.w && oy > 0 && oy < v.h) continue;
      const cx = v.w / 2, cy = v.h / 2, a = Math.atan2(oy - cy, ox - cx);
      const ex = AH.clamp(cx + Math.cos(a) * 1000, 10, v.w - 10), ey = AH.clamp(cy + Math.sin(a) * 1000, 12, v.h - 12);
      const tt = Math.min(Math.abs((v.w / 2 - 10) / Math.cos(a) || 1e9), Math.abs((v.h / 2 - 12) / Math.sin(a) || 1e9));
      const ax = v.x + cx + Math.cos(a) * tt, ay = v.y + cy + Math.sin(a) * tt;
      this.arrow(ax, ay, a, o.color);
      const dm = Math.round(AH.dist(o, p) / AH.T);
      const lx = AH.clamp(ax - Math.cos(a) * 14, v.x + 12, v.x + v.w - 12), ly = AH.clamp(ay - Math.sin(a) * 12, v.y + 4, v.y + v.h - 16);
      AH.text(ctx, lx, ly - 4, 'P' + (o.pid + 1), o.color, { align: 'center' });
      AH.text(ctx, lx, ly + 4, dm + 'M', '#a39bb0', { align: 'center' });
    }
    this.drawToasts(G, v, p.pid);
  } else {
    const locals = v.players;
    if (locals.length === 1 && !G.net) {
      const p = locals[0];
      this.playerPanel(G, p, v.x + 2, v.y + 2, false);
      if (G.scene === 'mine' && G.floorNo >= 6) this.torchGauge(G, p, v.x + 2, v.y + 34);
      this.petPanel(G, p, v.x + 2, v.y + (G.scene === 'mine' && G.floorNo >= 6 ? 44 : 34));
      this.hotbar(G, p);
    } else {
      let y = v.y + 2;
      const all = G.net ? G.players : locals;
      for (const p of all) {
        if (p.remote) { this.playerPanel(G, p, v.x + 2, y, true); y += 24; continue; }
        this.playerPanel(G, p, v.x + 2, y, true); this.miniBar(G, p, v.x + 80, y + 4);
        y += 24;
      }
      if (G.scene === 'mine' && G.floorNo >= 6) for (const p of locals) { this.torchGauge(G, p, v.x + 2, y); y += 8; }
      if (G.net && locals.length === 1) this.hotbar(G, locals[0]);
    }
    if (G.scene === 'mine' && views.length === 1) this.minimap(G, v);
    this.drawToasts(G, v, null);
  }
};
R.torchGauge = function (G, p, x, y) {
  const ctx = this.ctx;
  AH.drawSpr(ctx, AH.ICON.torch, x - 2, y - 3);
  AH.bar(ctx, x + 12, y + 2, 34, 2, p.torch / 100, p.torch < 25 ? '#e05a3a' : '#ffb347', '#2a1a10');
  AH.text(ctx, x + 50, y, '' + p.countCons('torch'), '#cfc6b4');
};
R.petPanel = function (G, p, x, y) {
  return; // the companion is right there on screen, no label needed
  const pt = G.pets.find(q => q.owner === p); if (!pt || !pt.active) return;
  const ctx = this.ctx;
  const s = AH.SPR[AH.PETS[pt.kind].spr];
  AH.frame(ctx, x, y, 64, 13);
  AH.drawSpr(ctx, s, x + 3, y + (13 - s.h) / 2 | 0);
  AH.text(ctx, x + 19, y + 3, AH.PETS[pt.kind].name, '#cfc6b4');
};
R.arrow = function (x, y, a, col) {
  const ctx = this.ctx;
  for (let i = 0; i < 8; i++) for (let j = -i; j <= i; j++) {
    const px = Math.round(x - Math.cos(a) * (8 - i) * 1 + Math.cos(a + Math.PI / 2) * j * 0.5), py = Math.round(y - Math.sin(a) * (8 - i) + Math.sin(a + Math.PI / 2) * j * 0.5);
    ctx.fillStyle = Math.abs(j) === i ? AH.OUT : col; ctx.fillRect(px, py, 1, 1);
  }
};
// Dunmere street lamp: stone foot, iron post, curled bracket and a hanging glass lantern with a living flame
R.drawLamp = function (ctx, l, i, lit, t, emissive, night) {
  const x = Math.round(l.x), g = Math.round(l.y + 12);
  const R2 = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, g + b, w, h); };
  const lx = x + 6, ly = g - 31; // lantern top-left
  const fl = Math.sin(t * 11 + i * 2.3) + Math.sin(t * 17 + i) * 0.5;
  if (!emissive) {
    R2(-3, -1, 8, 2, 'rgba(0,0,0,0.35)');
    R2(-3, -4, 8, 4, AH.OUT); R2(-2, -4, 6, 3, '#4a4252'); R2(-2, -4, 6, 1, '#6a6278');
    R2(-1, -30, 4, 27, AH.OUT); R2(0, -30, 2, 27, '#2e2836'); R2(0, -30, 1, 27, '#4a4252');
    R2(-1, -18, 4, 2, '#4a4252');
    // curled bracket reaching right
    R2(0, -33, 2, 3, '#2e2836'); R2(1, -34, 8, 2, AH.OUT); R2(1, -34, 7, 1, '#4a4252'); R2(8, -33, 1, 2, '#2e2836'); R2(-1, -35, 2, 2, '#2e2836'); R2(-2, -34, 1, 1, '#4a4252');
    // lantern: roof, cage, glass
    ctx.fillStyle = AH.OUT; ctx.fillRect(lx - 1, ly - 1, 9, 12);
    for (let j = 0; j < 3; j++) { ctx.fillStyle = j ? '#2e2836' : '#4a4252'; ctx.fillRect(lx + 2 - j, ly - 3 + j, 3 + j * 2, 1); }
    ctx.fillStyle = '#2e2836'; ctx.fillRect(lx, ly, 7, 10);
    ctx.fillStyle = lit ? '#e8a040' : '#2a2a38'; ctx.fillRect(lx + 1, ly + 1, 5, 7);
    if (lit) { ctx.fillStyle = '#ffd36a'; ctx.fillRect(lx + 2, ly + 2 + (fl > 0.6 ? 1 : 0), 3, 5 - (fl > 0.6 ? 1 : 0)); ctx.fillStyle = '#fff6d0'; ctx.fillRect(lx + 3, ly + 4 + (fl > 0.2 ? 0 : 1), 1, 2); }
    else { ctx.fillStyle = '#4a4a5c'; ctx.fillRect(lx + 1, ly + 1, 1, 3); ctx.fillStyle = '#1a1620'; ctx.fillRect(lx + 4, ly + 5, 2, 1); ctx.fillRect(lx + 3, ly + 6, 1, 1); }
    ctx.fillStyle = '#2e2836'; ctx.fillRect(lx + 3, ly + 1, 1, 7);
    ctx.fillStyle = '#4a4252'; ctx.fillRect(lx - 1, ly + 10, 9, 1);
    ctx.fillStyle = '#2e2836'; ctx.fillRect(lx + 3, ly + 11, 1, 2);
    // cold, dead lamps smoke a little
    if (!lit && Math.floor(t * 2 + i) % 3 === 0) { ctx.fillStyle = '#4a4458'; ctx.fillRect(lx + 3 + Math.round(Math.sin(t * 2 + i)), ly - 5 - Math.floor((t * 6 + i * 5) % 6), 1, 1); }
    return;
  }
  // glow pass: bright glass, soft halo and moths at night
  const k = 0.75 + fl * 0.08;
  ctx.fillStyle = '#ffd36a'; ctx.fillRect(lx + 1, ly + 1, 5, 7);
  ctx.fillStyle = '#fff6d0'; ctx.fillRect(lx + 2, ly + 3 + (fl > 0.6 ? 1 : 0), 3, 4 - (fl > 0.6 ? 1 : 0));
  ctx.fillStyle = '#2e2836'; ctx.fillRect(lx + 3, ly + 1, 1, 2);
  if (night > 0.15) {
    const cx = lx + 3, cy = ly + 5, R = 11;
    for (let j = -R; j <= R; j++) for (let q = -R; q <= R; q++) {
      const d = Math.hypot(q, j) / R; if (d > 1 || (Math.abs(q) < 4 && Math.abs(j) < 5)) continue;
      if (AH.BAYER[((cy + j) & 3) * 4 + ((cx + q) & 3)] < (1 - d) * 0.42 * k * night) { ctx.fillStyle = d < 0.55 ? '#c8862e' : '#7a4a1e'; ctx.fillRect(cx + q, cy + j, 1, 1); }
    }
    // light spilling on the cobbles under the lamp
    for (let q = -9; q <= 9; q++) for (let j = 0; j < 4; j++) if (AH.BAYER[((g + j) & 3) * 4 + ((x + q) & 3)] < (1 - Math.abs(q) / 10) * 0.3 * night) { ctx.fillStyle = '#6a4a26'; ctx.fillRect(x + 4 + q, g - 1 + j, 1, 1); }
    for (let mth = 0; mth < 2; mth++) {
      const a = t * (2.6 + mth) + i * 1.7 + mth * 3;
      ctx.fillStyle = '#f2e3c0'; ctx.fillRect(Math.round(cx + Math.cos(a) * (6 + mth * 2)), Math.round(cy + Math.sin(a * 1.3) * 5), 1, 1);
    }
  }
};
// free-standing ore boulder: stone tinted by the biome, ore nuggets or crystal shards, cracks per blow
R.drawOreRock = function (ctx, G, vn) {
  if (vn.hitT > 0) vn.hitT -= 1 / 60;
  const b = G.map.biome.brick, sh = vn.hitT > 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  const X = vn.x - 7 + sh, Y = vn.y - 13;
  const R2 = (a, c, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(X + a, Y + c, w, h); };
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(vn.x - 7, vn.y - 1, 15, 2);
  const shape = ['....######....', '..##########..', '.############.', '##############', '##############', '##############', '.############.', '.############.', '..##########..', '...########...', '....######....'];
  const lite = AH.mix(b[3], '#9a92a4', 0.35), mid = AH.mix(b[2], '#6a6274', 0.3), dark = AH.mix(b[1], '#2a2432', 0.3);
  shape.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') {
    const edge = row[i - 1] !== '#' || row[i + 1] !== '#' || !shape[j - 1] || shape[j - 1][i] !== '#' || !shape[j + 1] || shape[j + 1][i] !== '#';
    R2(i, j + 2, 1, 1, edge ? AH.OUT : (j < 4 && i < 9) ? lite : (j > 7 || i > 10) ? dark : mid);
  } });
  R2(4, 4, 3, 1, AH.mix(lite, '#ffffff', 0.25));
  if (vn.gem) {
    // crystal shards growing out of the top
    const cr = [[3, -1, 2, 5], [7, -3, 2, 7], [10, 0, 2, 4]];
    for (const [a, c, w, h] of cr) { R2(a - 1, c - 1, w + 2, h + 1, AH.OUT); R2(a, c, w, h, '#2a96b8'); R2(a, c, 1, h, '#6fd6e8'); R2(a, c, 1, 1, '#e8fbff'); }
  } else {
    const oc = AH.ORE_COLORS[vn.ore || 'goldore'] || AH.ORE_COLORS.goldore;
    const nug = vn.ore === 'coal' ? [[3, 4, 4, 3], [8, 5, 4, 3], [4, 8, 3, 3], [9, 9, 3, 2]] : [[3, 5, 3, 2], [8, 4, 3, 3], [5, 9, 3, 2], [10, 8, 2, 2]];
    for (const [a, c, w, h] of nug) { R2(a, c, w, h, oc[0]); R2(a, c, w - 1, h - 1, oc[1]); R2(a, c, w - 2 || 1, 1, oc[2]); R2(a, c, 1, 1, oc[3]); }
  }
  // cracks spread with every blow
  const dmg = (vn.max || 3) - vn.hp;
  if (dmg >= 1) { R2(7, 3, 1, 2, AH.OUT); R2(6, 5, 1, 2, AH.OUT); R2(7, 7, 1, 1, AH.OUT); }
  if (dmg >= 2) { R2(8, 8, 1, 2, AH.OUT); R2(3, 7, 3, 1, AH.OUT); R2(11, 5, 1, 2, AH.OUT); }
  if (dmg >= 3) { R2(2, 4, 1, 2, AH.OUT); R2(9, 11, 2, 1, AH.OUT); R2(12, 9, 1, 2, AH.OUT); }
};
R.hotbar = function (G, p) {
  const ctx = this.ctx;
  // key names for the device this hero uses
  const KL = p.device === 'kb1' ? { a: 'J', x: 'K', b: 'SPC', y: '1', lb: '2', rb: '3', pot: 'Q', mana: 'E' }
    : p.device === 'kb2' ? { a: 'N1', x: 'N4', b: 'N2', y: 'N5', lb: 'N7', rb: 'N8', pot: 'N0', mana: 'N.' }
    : { a: 'A', x: 'X', b: 'B', y: 'Y', lb: 'LB', rb: 'RB', pot: '^', mana: '_' };
  const items = [
    { k: KL.a, ic: AH.itemIcon(p.weapon() || { kind: 'cons', icon: 'dodge' }) },
    { k: KL.x, ic: AH.ICON.heavy },
    { k: KL.b, ic: AH.ICON.dodge, cd: p.cd.dodge / 0.85 },
  ];
  ['y', 'lb', 'rb'].forEach((k, i) => { if (p.ch.slots[i]) items.push({ k: KL[k], sk: p.ch.slots[i] }); });
  items.push({ k: KL.pot, ic: AH.ICON.potion, n: p.countCons('potion') });
  if (AH.isCaster(p.ch.cls) || p.countCons('mana')) items.push({ k: KL.mana, ic: AH.ICON.mana, n: p.countCons('mana') });
  const S = 18, Gp = 2, x0 = Math.floor((RW - (items.length * S + (items.length - 1) * Gp)) / 2), y = RH - 30;
  items.forEach((it, i) => {
    const x = x0 + i * (S + Gp);
    AH.slot(ctx, x, y, S, '#5a4e66');
    let ic = it.ic, cd = it.cd || 0;
    if (it.sk) { ic = AH.ICON[AH.SKILLS[it.sk].icon]; cd = (p.skillCd[it.sk] || 0) / AH.SKILLS[it.sk].cd; if (p.mp < p.manaCost(AH.SKILLS[it.sk].mp)) { ctx.fillStyle = '#141a2a'; ctx.fillRect(x + 2, y + 2, S - 4, S - 4); } }
    if (ic) AH.iconIn(ctx, ic, x, y, S);
    if (cd > 0) { ctx.fillStyle = 'rgba(8,6,12,0.72)'; ctx.fillRect(x + 2, y + 2, S - 4, Math.ceil((S - 4) * Math.min(1, cd))); }
    if (it.n !== undefined) AH.text(ctx, x + S - 2, y + S - 8, '' + it.n, '#ffffff', { align: 'right' });
    if (!AH.isTouch) AH.text(ctx, x + S / 2, y + S + 3, it.k, '#cfc6b4', { align: 'center' });
  });
};
R.minimap = function (G, v) {
  const ctx = this.ctx, m = G.map;
  const mw = 56, mh = 40, x = v.x + v.w - mw - 3, y = v.y + 3;
  AH.frame(ctx, x - 2, y - 2, mw + 4, mh + 4, { fill: '#0c0a10' });
  const sx = mw / m.w, sy = mh / m.h;
  // reveal around players
  for (const p of G.players) {
    const tx = Math.floor(p.x / AH.T), ty = Math.floor(p.y / AH.T);
    for (let j = -6; j <= 6; j++) for (let i = -8; i <= 8; i++) { const X = tx + i, Y = ty + j; if (X >= 0 && Y >= 0 && X < m.w && Y < m.h) m.seen[Y * m.w + X] = 1; }
  }
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
    if (!m.seen[j * m.w + i]) continue;
    const t = m.get(i, j); if (AH.solidTile(t) || AH.secretHidden(m, i, j)) continue;
    ctx.fillStyle = t === 2 ? '#2a4a6e' : t === 3 ? '#a83a1a' : '#4a4256';
    ctx.fillRect(x + Math.floor(i * sx), y + Math.floor(j * sy), Math.ceil(sx), Math.ceil(sy));
  }
  const dot = (wx, wy, col) => { ctx.fillStyle = col; ctx.fillRect(x + Math.floor(wx / AH.T * sx) - 1, y + Math.floor(wy / AH.T * sy) - 1, 2, 2); };
  if (m.seen[Math.floor(m.stairs.y / AH.T) * m.w + Math.floor(m.stairs.x / AH.T)]) dot(m.stairs.x, m.stairs.y, '#6fd6e8');
  dot(m.rope.x, m.rope.y, '#c8a060');
  for (const e of G.enemies) if ((e.legend || e.boss || e.nemesis) && !e.dead) dot(e.x, e.y, '#ff9a3e');
  for (const pr of m.props) if (pr.type === 'grave' && pr.g.items && G.players.some(p => p.ch.created === pr.g.owner) && Math.floor(G.time * 3) % 2) dot(pr.x, pr.y, '#ff5a5a');
  for (const p of G.players) dot(p.x, p.y, p.color);
};
R.drawToasts = function (G, v, pid) {
  const ctx = this.ctx;
  const list = G.toasts.filter(t => pid === null ? true : (t.pid === pid || t.pid < 0)).slice(-4);
  let y = v.y + v.h - (v.split ? 14 : 44) - (list.length - 1) * 10;
  for (const t of list) {
    const msg = (pid === null && t.pid >= 0 && G.players.length > 1 ? 'P' + (t.pid + 1) + ': ' : '') + t.msg;
    const lines = AH.wrap(msg, v.w - 20);
    for (const ln of lines.slice(0, 2)) {
      if (t.t < 0.4 && Math.floor(t.t * 20) % 2) { y += 10; continue; }
      AH.text(ctx, v.x + 6, y, ln, t.col);
      y += 10;
    }
  }
};
R.drawGlobalHud = function (G, views) {
  const ctx = this.ctx;
  if (G.scene === 'mine') {
    const fx = RW / 2;
    if (views.length === 1) {
      AH.text(ctx, fx, 3, (G.mode === 'endless' ? 'DEPTH ' : 'FLOOR ') + G.floorNo, '#ffb347', { align: 'center' });
      AH.text(ctx, fx, 12, G.map.biome.name, '#6fd6e8', { align: 'center' });
    } else AH.text(ctx, fx, RH - 9, 'F' + G.floorNo, '#ffb347', { align: 'center' });
    if (G.mode === 'time') AH.text(ctx, fx, 22, AH.fmtTime(G.runTimer || 0), '#f2e3b3', { align: 'center' });
    if (G.event === 'collapse' && G.collapseT > 0) AH.text(ctx, fx, 22, 'COLLAPSE ' + Math.ceil(G.collapseT), '#ff8a8a', { align: 'center' });
    // quest tracker under the minimap
    if (views.length === 1 && G.activeQuests) {
      let ty = 64;
      for (const a of G.activeQuests().slice(0, 2)) {
        const txt = a.st.ready ? AH.tr('RETURN TO DUNMERE') : AH.tr(a.step.goal) + (a.step.type === 'kill' ? ' (' + a.st.prog + '/' + a.step.n + ')' : '');
        for (const l of AH.wrap(txt, 96).slice(0, 3)) { AH.text(ctx, RW - 4, ty, l, a.st.ready ? '#f2c94c' : '#c8a0ff', { align: 'right' }); ty += 8; }
        ty += 3;
      }
    }
    // cinematic intro card for bosses and legends
    if (G.bossIntro && G.bossIntro.t > 0) {
      const bi = G.bossIntro, k = Math.min(1, (2.6 - bi.t) * 4, bi.t * 3), bar = Math.round(22 * k);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, RW, bar); ctx.fillRect(0, RH - bar, RW, bar);
      if (k > 0.6) {
        AH.text(ctx, RW / 2, RH / 2 - 30, bi.name, bi.col, { align: 'center', scale: 2 });
        if (bi.title) AH.text(ctx, RW / 2, RH / 2 - 12, bi.title, '#cfc6b4', { align: 'center' });
        ctx.fillStyle = bi.col; const w = Math.round(AH.textW(bi.name, 2) * k); ctx.fillRect(Math.round(RW / 2 - w / 2), RH / 2 - 15, w, 1);
      }
    }
    // boss bar
    const boss = G.enemies.find(e => (e.boss || e.legend) && !e.dead && e.aggro && !e.hidden);
    if (boss) {
      const w = 160, x = (RW - w) / 2, y = 34;
      AH.text(ctx, RW / 2, y - 9, boss.name, boss.boss ? '#ff6a5a' : '#ff9a3e', { align: 'center' });
      AH.bar(ctx, x, y, w, 4, boss.hp / boss.maxHp, boss.boss ? '#d43c3c' : '#ff8a2e', '#2a1416', '#ff8a8a');
    }
  } else if (G.scene === 'town') {
    const W = G.world, h = Math.floor(W.hour), mm = Math.floor((W.hour % 1) * 60);
    const x = views.length === 1 && G.players.filter(p => !p.remote).length === 1 && !G.net ? RW - 92 : RW - 92;
    AH.frame(ctx, x, 2, 90, 44);
    AH.text(ctx, x + 4, 5, 'DAY ' + W.day, '#f2e3b3');
    AH.text(ctx, x + 86, 5, String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), '#cfc6b4', { align: 'right' });
    AH.text(ctx, x + 4, 14, { clear: 'CLEAR', rain: 'RAIN', fog: 'FOG', snow: 'SNOW', storm: 'STORM' }[W.weather], '#9fb4d8');
    // lamps of Dunmere
    const lit = G.lampsLit();
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i < lit ? '#ffd36a' : '#2a2430'; ctx.fillRect(x + 48 + i * 5, 15, 3, 4); ctx.fillStyle = AH.OUT; ctx.fillRect(x + 48 + i * 5, 19, 3, 1); }
    AH.text(ctx, x + 4, 24, 'TRUST', '#f2e3b3'); AH.text(ctx, x + 86, 24, '' + Math.round(W.trust), '#ffb347', { align: 'right' });
    AH.bar(ctx, x + 4, 32, 82, 2, AH.clamp(W.trust / 100, 0, 1), '#ffb347', '#2a2214', '#ffe0a0');
    AH.text(ctx, x + 4, 36, 'POP', '#f2e3b3'); AH.text(ctx, x + 86, 36, '' + W.pop, '#6fbf73', { align: 'right' });
    const pw = AH.textW(AH.tr('POP')) + 8;
    AH.bar(ctx, x + pw, 38, 66 - pw, 2, AH.clamp(W.pop / 80, 0, 1), '#6fbf73', '#142014', '#b8ffb0');
  }
  // gold (main local player)
  const p0 = G.players.find(p => !p.remote);
  if (p0 && views.length === 1) { AH.coinIcon(ctx, 3, RH - 9); AH.text(ctx, 10, RH - 10, '' + p0.ch.gold, '#f2c94c'); }
  // banners
  let by = 46;
  for (const b of G.banners) {
    if (b.t < 0.4 && Math.floor(b.t * 20) % 2) { by += 22; continue; }
    const lines = AH.wrap(b.sub, 280);
    const w = Math.max(AH.textW(b.msg), ...lines.map(l => AH.textW(l))) + 16, h = 14 + lines.length * 9;
    AH.frame(ctx, Math.floor(RW / 2 - w / 2), by, w, h, { fill: '#120e10', edge: AH.shade(b.col, 0.7), hi: b.col });
    AH.text(ctx, RW / 2, by + 4, b.msg, b.col, { align: 'center' });
    lines.forEach((l, i) => AH.text(ctx, RW / 2, by + 13 + i * 9, l, '#cfc6b4', { align: 'center' }));
    by += h + 3;
  }
  // join hint
  if (G.players.filter(p => !p.remote).length < 3 && !G.menu && !G.net && G.scene === 'town' && !AH.isTouch && G.time % 20 < 5) {
    // name the join button of a device that is not playing yet
    const used = G.players.filter(p => !p.remote).map(p => p.device);
    const pad = AH.Input.devices().find(id => id.startsWith('gp') && used.indexOf(id) < 0);
    const key = pad ? 'START' : used.indexOf('kb2') < 0 ? 'NUMENTER' : 'START';
    AH.text(ctx, RW - 4, 50, 'P' + (G.players.length + 1) + ': ' + key + ' TO JOIN', '#4e4858', { align: 'right' });
  }
};
