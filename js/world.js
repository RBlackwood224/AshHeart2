'use strict';
// World maps: tile grid, mine floor generator, town layout, pre-rendering
const T = AH.T;
AH.TILE = { WALL: 0, FLOOR: 1, WATER: 2, LAVA: 3, ICE: 4, SECRET: 5, GRASS: 7, ROAD: 8, BUILD: 9, VOID: 6, TREE: 10, ROCK: 11 };
AH.solidTile = t => t === 0 || t === 5 || t === 9 || t === 10 || t === 11;
// walls for drawing purposes (ore rocks block movement but are not walls)
AH.wallTile = t => t === 0 || t === 5 || t === 9 || t === 10;

// ---------- procedural tile textures ----------
AH.texCache = {};
function texFloor(pal, seed, ts) {
  const rnd = AH.mulberry(seed);
  const c = AH.makeCanvas(ts, ts), x = c.getContext('2d');
  const [M, D, Mi, L, S] = pal;
  const img = x.createImageData(ts, ts), px = img.data;
  const put = (i, j, col) => { const h = AH.hx(col), o = (j * ts + i) * 4; px[o] = h[0]; px[o + 1] = h[1]; px[o + 2] = h[2]; px[o + 3] = 255; };
  const lay = rnd();
  let stones;
  if (lay < 0.4) stones = [[0, 0, ts, ts]];
  else if (lay < 0.7) { const k = rnd.int(6, 10); stones = [[0, 0, ts, k], [0, k, ts, ts - k]]; }
  else if (lay < 0.88) { const k = rnd.int(6, 10); stones = [[0, 0, k, ts], [k, 0, ts - k, ts]]; }
  else stones = [[0, 0, 8, 8], [8, 0, 8, 8], [0, 8, 8, 8], [8, 8, 8, 8]];
  for (const [a, b, sw, sh] of stones) {
    const vary = rnd() < 0.25 ? D : Mi;
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      const X = a + i, Y = b + j; let col;
      if (i === 0 || j === 0) col = M;
      else if (j === 1 && i < sw - 1) col = L;
      else if (i === 1 && j < sh - 1) col = AH.mix(vary, L, 0.5);
      else if (j === sh - 1 || i === sw - 1) col = D;
      else { col = vary; if (rnd() < 0.015) col = D; }
      put(X, Y, col);
    }
  }
  if (rnd() < 0.25) { let cx = rnd.int(3, ts - 4), cy = rnd.int(2, 5); for (let k = 0; k < rnd.int(3, 7); k++) { if (cx > 0 && cx < ts && cy < ts) put(cx, cy, M); cx += rnd.int(-1, 1); cy++; } }
  x.putImageData(img, 0, 0);
  return c;
}
function texBrick(pal, seed) {
  const rnd = AH.mulberry(seed);
  const c = AH.makeCanvas(T, 12), x = c.getContext('2d');
  const [M, D, Mi, L, A] = pal;
  const bw = 8, bh = 4;
  for (let row = 0; row < 3; row++) {
    const off = (row % 2) * 4;
    for (let bx = -bw; bx < T; bx += bw) {
      const base = rnd.pick([Mi, Mi, A, Mi, D]);
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
        const X = bx + off + i, Y = row * bh + j; if (X < 0 || X >= T) continue;
        let col = base;
        if (j === bh - 1 || i === bw - 1) col = M; else if (j === 0) col = L; else if (j === bh - 2 && rnd() < 0.6) col = D;
        x.fillStyle = col; x.fillRect(X, Y, 1, 1);
      }
    }
  }
  return c;
}
function texTop(seed, base) {
  const rnd = AH.mulberry(seed);
  const c = AH.makeCanvas(T, T), x = c.getContext('2d');
  x.fillStyle = base || '#100d14'; x.fillRect(0, 0, T, T);
  x.fillStyle = '#1c1822';
  for (let i = 0; i < 10; i++) x.fillRect(rnd.int(0, 15), rnd.int(0, 15), 1, 1);
  return c;
}

AH.FLOOR_GRIDS = [
 ["................","................","...cb...........","...bd.......c...","............b...","................","........cc......","........bb......","................","..c.............","..b.........cb..",".............d..","................","......c.........","......b.........","................"],
 ["................","......d.........",".......d........",".......d........","......dd....c...",".....d......b...",".....d..........","................","..........cb....","..........bd....","................","...c............","...b............","................","........c.......","................"],
 ["................","..ccccc.........",".caaaaab........",".caaaaab..cc....",".caaaaab..ab....","..bbbbb.........","................","........ccccc...",".......caaaaab..",".......caaaaab..",".......caaaaab..","........bbbbb...","..cb............","..bd............","................","................"],
 ["................",".c..b...c.......","......c....b....","..b.......c.....","........b....c..","....c...........",".b.....c...b....","................","...c......b.....","........c.....c.",".b...b..........","......c....b....","..c.........c...","........b.......","....c......c....","................"],
 ["................","................","................","................","................","................","................","................","................","................","................","................","................","................","................","................"],
 ["................","................","..........c.....",".........cab....","..........b.....","................","................","................","................","...cb...........","...bd...........","................","................","................","................","................"],
];
AH.ROCK_GRIDS = [
 ["cccccdccccccccdc","caaaabdcaaaaaabd","caaaaabcaaaaaabd","caaaaabcaaaaaabd","cbaaabbdcaaaaabd","dbbbbbdccbaaabbd","ccccdccaabbbbbdc","caaabcaaaaabdccc","caaabcaaaaabdcaa","cbaabdcaaaabdcaa","dbbbddcbbbbbddbb","dddddddddddddddd"],
 ["ccccccccdccccccc","caaaaaabdcaaaaab","caaaaaaabcaaaaab","cbaaaaaabcaaaabb","dbbaaaabbdbbbbbd","ccdbbbbbdcccccdc","caacccdcaaaaabcc","caaaaabcaaaaabca","cbaaaabcaaaaabca","dbbaabbdbaaabbdb","ddbbbbddbbbbbddb","dddddddddddddddd"],
];
function gridTex(grid, map, w, h) {
  const c = AH.makeCanvas(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = grid[j][i]; x.fillStyle = map[ch] || map['.']; x.fillRect(i, j, 1, 1); }
  return c;
}
function texCave(pal, seed) {
  const [M, D, Mi, L, S] = pal;
  const g = AH.FLOOR_GRIDS[seed % AH.FLOOR_GRIDS.length];
  const rot = Math.floor(seed / 7) % 2 ? g.map(r => r.split('').reverse().join('')) : g;
  return gridTex(rot, { '.': Mi, a: AH.mix(Mi, L, 0.35), c: L, b: D, d: M }, T, T);
}
function texRock(pal, seed) {
  const [M, D, Mi, L, A] = pal;
  const g = AH.ROCK_GRIDS[seed % 2];
  const rot = Math.floor(seed / 3) % 2 ? g.map(r => r.split('').reverse().join('')) : g;
  return gridTex(rot, { '.': Mi, a: Mi, c: L, b: D, d: M }, T, 12);
}

// ---------- map object ----------
AH.Map = function (w, h) {
  this.w = w; this.h = h;
  this.t = new Uint8Array(w * h);
  this.seen = new Uint8Array(w * h);
  this.props = []; this.lights = []; this.spawns = []; this.rooms = [];
};
AH.Map.prototype.get = function (x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.t[y * this.w + x]; };
AH.Map.prototype.set = function (x, y, v) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.t[y * this.w + x] = v; };
AH.Map.prototype.solidAt = function (px, py) { return AH.solidTile(this.get(Math.floor(px / T), Math.floor(py / T))); };
AH.Map.prototype.tileAt = function (px, py) { return this.get(Math.floor(px / T), Math.floor(py / T)); };
// circle-ish collision box test
AH.Map.prototype.blocked = function (x, y, r) {
  return this.solidAt(x - r, y - r * 0.6) || this.solidAt(x + r, y - r * 0.6) || this.solidAt(x - r, y + r * 0.4) || this.solidAt(x + r, y + r * 0.4);
};
AH.Map.prototype.los = function (x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) { const t = i / n; if (this.solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
  return true;
};
// grid path (BFS, 8-way without corner cutting), returns world waypoints or null
AH.Map.prototype.path = function (x0, y0, x1, y1, maxN) {
  const W = this.w, H = this.h, sx = Math.floor(x0 / T), sy = Math.floor(y0 / T);
  let tx = Math.floor(x1 / T), ty = Math.floor(y1 / T);
  if (AH.solidTile(this.get(tx, ty))) { // aim at the nearest open tile
    let best = null, bd = 1e9; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!AH.solidTile(this.get(tx + i, ty + j))) { const d = i * i + j * j; if (d < bd) { bd = d; best = [tx + i, ty + j]; } }
    if (!best) return null; tx = best[0]; ty = best[1];
  }
  const prev = new Int32Array(W * H).fill(-1), start = sy * W + sx, goal = ty * W + tx;
  const q = [start]; prev[start] = start; let n = 0;
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (q.length && n < (maxN || 6000)) {
    const c = q.shift(); n++; if (c === goal) break;
    const cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of D) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx; if (prev[k] >= 0 || AH.solidTile(this.t[k])) continue;
      if (dx && dy && (AH.solidTile(this.get(cx + dx, cy)) || AH.solidTile(this.get(cx, cy + dy)))) continue;
      prev[k] = c; q.push(k);
    }
  }
  if (prev[goal] < 0) return null;
  const pts = []; let c = goal; while (c !== start) { pts.push({ x: (c % W) * T + 8, y: ((c / W) | 0) * T + 10 }); c = prev[c]; }
  pts.reverse(); if (pts.length) pts[pts.length - 1] = { x: x1, y: y1 };
  return pts;
};
AH.Map.prototype.randomFloorIn = function (room, rng) {
  for (let k = 0; k < 40; k++) {
    const x = rng.int(room.x + 1, room.x + room.w - 2), y = rng.int(room.y + 1, room.y + room.h - 2);
    if (this.get(x, y) === 1) return { x: x * T + 8, y: y * T + 10 };
  }
  return { x: (room.x + (room.w >> 1)) * T + 8, y: (room.y + (room.h >> 1)) * T + 10 };
};

// ---------- mine floor generator ----------
AH.genFloor = function (seed, floor, event) {
  const rng = AH.mulberry(seed);
  const biome = AH.biomeOf(floor);
  const big = Math.min(16, Math.floor(floor / 8));
  const W = 50 + big, H = 36 + Math.floor(big * 0.7);
  const m = new AH.Map(W, H);
  m.floor = floor; m.biome = biome; m.seed = seed; m.event = event;
  const isBoss = floor % 10 === 0;
  const rooms = [];
  const tries = isBoss ? 0 : 70;
  const overlap = (a, b) => a.x - 2 < b.x + b.w && a.x + a.w + 2 > b.x && a.y - 2 < b.y + b.h && a.y + a.h + 2 > b.y;
  if (isBoss) {
    rooms.push({ x: 3, y: H - 10, w: 8, h: 6 });
    rooms.push({ x: Math.floor(W / 2) - 11, y: 4, w: 22, h: 16, arena: 1 });
    rooms.push({ x: W - 12, y: H - 10, w: 8, h: 6 });
  } else {
    for (let i = 0; i < tries && rooms.length < 14; i++) {
      const r = { x: rng.int(2, W - 16), y: rng.int(2, H - 12), w: rng.int(6, 14), h: rng.int(5, 10) };
      if (r.x + r.w >= W - 2 || r.y + r.h >= H - 2) continue;
      if (rooms.some(o => overlap(r, o))) continue;
      rooms.push(r);
    }
  }
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) m.set(x, y, 1);
  const center = r => ({ x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) });
  const carve = (a, b, wide) => {
    let x = a.x, y = a.y;
    const horizFirst = rng() < 0.5;
    const step = (tx, ty) => {
      while (x !== tx) { x += Math.sign(tx - x); for (let k = 0; k < wide; k++) if (m.get(x, y + k) === 0) m.set(x, y + k, 1); }
      while (y !== ty) { y += Math.sign(ty - y); for (let k = 0; k < wide; k++) if (m.get(x + k, y) === 0) m.set(x + k, y, 1); }
    };
    if (horizFirst) { step(b.x, y); step(x, b.y); } else { step(x, b.y); step(b.x, y); }
  };
  const order = rooms.slice().sort((a, b) => a.x - b.x);
  for (let i = 1; i < order.length; i++) carve(center(order[i - 1]), center(order[i]), rng() < 0.3 ? 3 : 2);
  for (let i = 0; i < Math.min(3, rooms.length - 2); i++) carve(center(rng.pick(rooms)), center(rng.pick(rooms)), 2);
  // distances from spawn room via BFS
  const start = isBoss ? rooms[0] : rooms[0];
  const bfs = (sx, sy) => {
    const dist = new Int32Array(W * H).fill(-1); const q = [sx + sy * W]; dist[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const p = q[qi], px = p % W, py = (p / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy, n = nx + ny * W;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || dist[n] >= 0 || AH.solidTile(m.t[n])) continue;
        dist[n] = dist[p] + 1; q.push(n);
      }
    }
    return dist;
  };
  const sc = center(start);
  const dist = bfs(sc.x, sc.y);
  let stairsRoom = rooms[rooms.length - 1], best = -1;
  if (!isBoss) for (const r of rooms) { const c = center(r); const d = dist[c.x + c.y * W]; if (d > best) { best = d; stairsRoom = r; } }
  m.rooms = rooms; m.startRoom = start; m.stairsRoom = stairsRoom;
  m.spawn = { x: sc.x * T + 8, y: sc.y * T + 12 };
  const stc = center(stairsRoom);
  m.stairs = { x: stc.x * T + 8, y: stc.y * T + 8, locked: isBoss };
  m.rope = { x: (start.x + 1) * T + 8, y: (start.y + 1) * T + 6 };
  // secret room
  if (!isBoss && rng() < 0.55) {
    for (let k = 0; k < 60; k++) {
      const r = { x: rng.int(2, W - 10), y: rng.int(2, H - 9), w: rng.int(4, 6), h: rng.int(4, 5) };
      if (r.x + r.w >= W - 1 || r.y + r.h >= H - 1) continue;
      let clear = true;
      for (let y = r.y - 2; y < r.y + r.h + 2 && clear; y++) for (let x = r.x - 2; x < r.x + r.w + 2; x++) if (m.get(x, y) !== 0) { clear = false; break; }
      if (!clear) continue;
      // find a tunnel direction to existing floor within 6 tiles
      const c = center(r); let done = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let x = dx > 0 ? r.x + r.w : dx < 0 ? r.x - 1 : c.x, y = dy > 0 ? r.y + r.h : dy < 0 ? r.y - 1 : c.y;
        const path = [];
        for (let s = 0; s < 6; s++) { if (m.get(x, y) === 1) { done = true; break; } path.push([x, y]); x += dx; y += dy; }
        if (done && path.length >= 1) {
          for (let y2 = r.y; y2 < r.y + r.h; y2++) for (let x2 = r.x; x2 < r.x + r.w; x2++) m.set(x2, y2, 1);
          path.forEach(([px, py], i) => m.set(px, py, i === path.length - 1 ? AH.TILE.SECRET : 1));
          m.secret = { room: r, wall: path[path.length - 1], path: path.slice(0, -1), found: false };
          m.props.push({ type: 'chest', x: c.x * T + 8, y: c.y * T + 10, secret: 1, rare: 1 });
          if (rng() < 0.6) m.props.push({ type: 'tablet', x: c.x * T + 8 - 24, y: c.y * T + 10, lore: rng.int(0, AH.LORE.length - 1), secret: 1 });
          break;
        }
        done = false;
      }
      if (m.secret) break;
    }
  }
  // hazards
  const haz = event === 'flooded' ? 'water' : biome.hazard;
  if ((haz === 'water' || haz === 'lava' || haz === 'ice') && !isBoss) {
    const n = haz === 'water' && event === 'flooded' ? 10 : rng.int(2, 5);
    for (let i = 0; i < n; i++) {
      const r = rng.pick(rooms); if (r === start || r === stairsRoom) continue;
      const cx = rng.int(r.x + 1, r.x + r.w - 2), cy = rng.int(r.y + 1, r.y + r.h - 2), rad = rng.range(1.2, 3.2);
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        if (Math.hypot(x - cx, (y - cy) * 1.3) < rad + rng() * 0.8 && m.get(x, y) === 1) m.set(x, y, haz === 'water' ? 2 : haz === 'lava' ? 3 : 4);
      }
    }
  }
  // wall torches & decor
  const isFace = (x, y) => m.get(x, y) === 0 && m.get(x, y + 1) === 1;
  let torches = 0;
  for (let k = 0; k < 400 && torches < 8 + big; k++) {
    const x = rng.int(1, W - 2), y = rng.int(1, H - 2);
    if (!isFace(x, y)) continue;
    if (m.lights.some(l => Math.abs(l.tx - x) < 6 && Math.abs(l.ty - y) < 5)) continue;
    m.lights.push({ tx: x, ty: y, x: x * T + 8, y: y * T + 6, r: 70, i: event === 'dark' ? 0.3 : 0.85, tint: [1.0, 0.72, 0.42], flicker: 1 });
    m.props.push({ type: 'torchWall', x: x * T + 5, y: y * T + 2 });
    torches++;
  }
  if (biome.deco === 'crystal') for (let k = 0; k < 400 && m.lights.length < 22; k++) {
    const x = rng.int(1, W - 2), y = rng.int(1, H - 2);
    if (!isFace(x, y)) continue;
    m.props.push({ type: 'crystal', x: x * T + rng.int(2, 8), y: y * T + 14, seed: rng.int(0, 9999) });
    m.lights.push({ tx: x, ty: y, x: x * T + 8, y: y * T + 12, r: 30, i: 0.5, tint: biome.id === 'shadow' ? [0.9, 0.6, 1.2] : [0.6, 0.95, 1.15] });
  }
  // floor decor
  const decoKinds = { rubble: ['rubble', 'bones'], moss: ['rubble', 'moss'], crystal: ['rubble'], shroom: ['shroomS', 'rubble'], bones: ['bones', 'bones', 'rubble'], ice: ['rubble'], ember: ['bones', 'rubble'] }[biome.deco] || ['rubble'];
  for (let k = 0; k < 30 + big * 2; k++) {
    const r = rng.pick(rooms); const p = m.randomFloorIn(r, rng);
    m.props.push({ type: 'deco', kind: rng.pick(decoKinds), x: p.x + rng.int(-6, 6), y: p.y + rng.int(-6, 6) });
  }
  // dig spots, chests
  for (let k = 0; k < rng.int(3, 5); k++) { const p = m.randomFloorIn(rng.pick(rooms), rng); m.props.push({ type: 'dig', x: p.x, y: p.y }); }
  const nChest = isBoss ? 0 : rng.int(1, 3);
  for (let k = 0; k < nChest; k++) {
    const r = rng.pick(rooms); if (r === start) continue;
    const p = m.randomFloorIn(r, rng);
    m.props.push({ type: 'chest', x: p.x, y: p.y, mimic: floor >= 18 && rng() < 0.15 });
  }
  if (!isBoss && rng() < 0.15) { const p = m.randomFloorIn(rng.pick(rooms), rng); m.props.push({ type: 'tablet', x: p.x, y: p.y, lore: rng.int(0, AH.LORE.length - 1) }); }
  if (event === 'vault') {
    const r = rooms.filter(x => x !== start && x !== stairsRoom).sort((a, b) => b.w * b.h - a.w * a.h)[0];
    if (r) for (let k = 0; k < 5; k++) { const p = m.randomFloorIn(r, rng); m.props.push({ type: 'chest', x: p.x, y: p.y, mimic: rng() < 0.35, rare: rng() < 0.4 }); }
  }
  if (event === 'shrine' || (!isBoss && rng() < 0.08)) { const r = rng.pick(rooms.filter(x => x !== start)) || start; const p = m.randomFloorIn(r, rng); m.props.push({ type: 'shrine', x: p.x, y: p.y, used: false }); }
  // ore rocks: free-standing boulders in the rooms, broken with any attack
  m.veins = [];
  if (!isBoss) {
    const free = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (m.get(x + i, y + j) !== 1) return false; return true; };
    const want = 7 + (floor % 5) + (floor > 20 ? 2 : 0);
    for (let k = 0; k < 600 && m.veins.length < want; k++) {
      const r = rng.pick(rooms); if (r === start) continue;
      const x = rng.int(r.x + 1, r.x + r.w - 2), y = rng.int(r.y + 1, r.y + r.h - 2);
      if (!free(x, y)) continue;
      const cx = x * T + 8, cy = y * T + 8;
      if (Math.hypot(cx - m.stairs.x, cy - m.stairs.y) < 32 || Math.hypot(cx - m.rope.x, cy - m.rope.y) < 32) continue;
      if (m.props.some(p => Math.abs(p.x - cx) < 20 && Math.abs(p.y - cy) < 20) || m.veins.some(v => Math.abs(v.tx - x) < 3 && Math.abs(v.ty - y) < 3)) continue;
      const gem = biome.id === 'crystal' || (floor >= 6 && rng() < 0.18);
      const ore = gem ? 'gem' : AH.oreForFloor(floor, rng());
      const hard = gem ? 4 : ({ coal: 2, ore: 3, iron: 3, silver: 4, goldore: 4, mithril: 5 })[ore];
      m.veins.push({ tx: x, ty: y, x: cx, y: y * T + 14, hp: hard, max: hard, gem, ore, seed: rng.int(0, 999) });
      m.set(x, y, AH.TILE.ROCK);
    }
  }
  // enemy spawns per room
  if (!isBoss) for (const r of rooms) {
    if (r === start) continue;
    let n = Math.round((r.w * r.h) / (floor > 10 ? 18 : 22) + rng() * 2);
    if (event === 'horde') n = Math.round(n * 1.8);
    if (floor <= 5) n = Math.round(n * 0.4);
    for (let k = 0; k < n; k++) m.spawns.push(Object.assign(m.randomFloorIn(r, rng), { room: r, critter: floor <= 5 }));
  }
  if (event === 'ambush') for (let k = 0; k < 6; k++) { const a = rng() * Math.PI * 2; m.spawns.push({ x: m.spawn.x + Math.cos(a) * 60, y: m.spawn.y + Math.sin(a) * 50, ambush: 1, room: start }); }
  m.arena = isBoss ? rooms[1] : null;
  // lifts every 5th floor: shown at spawn
  m.hasLift = floor % 5 === 0;
  return m;
};

// ---------- prerender ----------
// until the cracked wall is broken, the room behind it stays solid rock: nothing of it shows on screen or map
AH.secretNear = function (m, px, py) {
  const s = m.secret; if (!s || s.found) return false;
  const i = Math.floor(px / T), j = Math.floor(py / T), r = s.room;
  return i >= r.x - 1 && i <= r.x + r.w && j >= r.y - 1 && j <= r.y + r.h;
};
AH.secretHidden = function (m, i, j) {
  const s = m.secret; if (!s || s.found) return false;
  const r = s.room; if (i >= r.x && i < r.x + r.w && j >= r.y && j < r.y + r.h) return true;
  return !!(s.path && s.path.some(([x, y]) => x === i && y === j));
};
AH.renderMap = function (m0) {
  // draw from a view of the map in which the hidden room is rock (the real map is untouched)
  const m = m0.secret && !m0.secret.found ? Object.assign(Object.create(m0), { get: (i, j) => AH.secretHidden(m0, i, j) ? 0 : m0.get(i, j) }) : m0;
  const W = m.w * T, H = m.h * T;
  const c = AH.makeCanvas(W, H), x = c.getContext('2d');
  const em = AH.makeCanvas(W, H), ex = em.getContext('2d');
  const b = m.biome || AH.BIOMES[0];
  const key = b.id;
  if (!AH.texCache[key]) {
    AH.texCache[key] = {
      floor: Array.from({ length: 12 }, (_, i) => b.ruins ? texFloor(b.floor, 100 + i * 7, T) : texCave(b.floor, i < 6 ? i : 4 + (i % 2) + 7 * (i % 3))),
      brick: Array.from({ length: 6 }, (_, i) => b.ruins ? texBrick(b.brick, 300 + i * 13) : texRock(b.brick, i)),
      top: Array.from({ length: 4 }, (_, i) => texTop(500 + i, AH.mix(b.brick[0], b.brick[1], 0.35))),
    };
  }
  const tx = AH.texCache[key];
  const rnd = AH.mulberry(m.seed || 1);
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
    const t = m.get(i, j), X = i * T, Y = j * T;
    if (t === 0 || t === 5) {
      x.drawImage(tx.top[(i * 7 + j * 3) & 3], X, Y);
      if (!AH.wallTile(m.get(i, j + 1))) {
        x.drawImage(tx.brick[(i * 5 + j * 11) % 6], X, Y + 4);
        x.fillStyle = AH.shade(b.brick[3], 1.15); x.fillRect(X, Y + 4, T, 1);
        if (t === 5) { // secret wall: a deep, jagged crack with loose stones at its foot
          const pts = [[8, 4], [7, 5], [7, 6], [6, 7], [7, 8], [8, 9], [9, 10], [8, 11], [7, 12], [6, 13], [7, 14], [8, 15], [9, 13], [10, 12], [5, 10], [4, 11], [11, 8], [12, 7]];
          for (const [cx, cy] of pts) { x.fillStyle = '#050307'; x.fillRect(X + cx, Y + cy, 1, 1); x.fillStyle = AH.shade(b.brick[3], 1.3); x.fillRect(X + cx + 1, Y + cy, 1, 1); }
          x.fillStyle = '#050307'; x.fillRect(X + 7, Y + 9, 2, 3);
          x.fillStyle = b.brick[2]; x.fillRect(X + 2, Y + 15, 3, 1); x.fillRect(X + 11, Y + 15, 2, 1); x.fillRect(X + 13, Y + 14, 1, 1);
        }
      }
      if (t === 5 && AH.wallTile(m.get(i, j + 1))) { // a cracked side wall: split rock seen from above
        const pts = [[3, 2], [4, 3], [5, 4], [6, 5], [7, 6], [8, 7], [9, 7], [10, 8], [11, 9], [12, 10], [7, 7], [6, 8], [5, 9], [9, 6], [10, 5], [11, 4], [8, 9], [8, 10], [9, 11], [10, 12]];
        for (const [cx, cy] of pts) { x.fillStyle = '#050307'; x.fillRect(X + cx, Y + cy, 1, 1); x.fillStyle = AH.shade(b.brick[3], 1.3); x.fillRect(X + cx, Y + cy - 1, 1, 1); }
        x.fillStyle = '#050307'; x.fillRect(X + 7, Y + 6, 3, 2);
      }
      // side edges
      if (!AH.wallTile(m.get(i - 1, j))) { x.fillStyle = '#07050a'; x.fillRect(X, Y, 1, T); }
      if (!AH.wallTile(m.get(i + 1, j))) { x.fillStyle = '#07050a'; x.fillRect(X + T - 1, Y, 1, T); }
      if (!AH.wallTile(m.get(i, j - 1))) { x.fillStyle = AH.shade(b.brick[3], 0.9); x.fillRect(X, Y, T, 1); }
    } else {
      { const r = AH.mulberry(((m0.seed || 1) + i * 92821 + j * 68917) >>> 0)(); x.drawImage(tx.floor[r < 0.45 ? 4 : r < 0.6 ? 0 : r < 0.7 ? 5 : ((r * 100) | 0) % tx.floor.length], X, Y); }
      if (t === 2) { // water
        x.fillStyle = '#1e3a5a'; x.fillRect(X, Y, T, T);
        x.fillStyle = '#2a4a6e'; for (let k = 0; k < 6; k++) x.fillRect(X + ((i * 5 + k * 3) % 14), Y + ((j * 3 + k * 5) % 14), 3, 1);
        if (m.get(i, j - 1) !== 2) { x.fillStyle = '#5a7a9a'; x.fillRect(X, Y, T, 1); }
      } else if (t === 3) { // lava
        ex.fillStyle = '#c84a1a'; ex.fillRect(X, Y, T, T);
        ex.fillStyle = '#ff8a2e'; for (let k = 0; k < 7; k++) ex.fillRect(X + ((i * 7 + k * 5) % 14), Y + ((j * 5 + k * 3) % 14), 2, 1);
        ex.fillStyle = '#ffd36a'; ex.fillRect(X + ((i * 3) % 12) + 2, Y + ((j * 7) % 12) + 2, 1, 1);
        if (m.get(i, j - 1) !== 3) { ex.fillStyle = '#5a1a0a'; ex.fillRect(X, Y, T, 1); }
        x.fillStyle = '#c84a1a'; x.fillRect(X, Y, T, T);
      } else if (t === 4) { // ice
        x.globalAlpha = 0.55; x.fillStyle = '#a8c8e8'; x.fillRect(X, Y, T, T); x.globalAlpha = 1;
        x.fillStyle = '#e8f4ff'; x.fillRect(X + (i * 3) % 10 + 2, Y + (j * 5) % 10 + 2, 3, 1);
      }
      // shadow below walls
      if (AH.wallTile(m.get(i, j - 1))) {
        x.fillStyle = 'rgba(0,0,0,0.45)';
        for (let k = 0; k < 4; k++) for (let q = 0; q < T; q++) if (AH.BAYER[(k & 3) * 4 + ((X + q) & 3)] < 0.7 - k * 0.17) x.fillRect(X + q, Y + k, 1, 1);
      }
    }
  }
  // --- biome dressing: things on the wall faces and on the floor
  let dr; // seeded per tile, so opening a secret room never reshuffles the rest of the floor
  const P = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
  const R = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const E = (X, Y, w, h, col) => { ex.fillStyle = col; ex.fillRect(X, Y, w, h); };
  const isFace = (i, j) => AH.wallTile(m.get(i, j)) && m.get(i, j) !== 5 && !AH.wallTile(m.get(i, j + 1));
  const isOpen = (i, j) => m.get(i, j) === 1 && !AH.wallTile(m.get(i, j - 1)) && !m.props.some(p => Math.abs(p.x - i * T - 8) < 14 && Math.abs(p.y - j * T - 8) < 14);
  const id = b.id;
  for (let j = 1; j < m.h - 1; j++) for (let i = 1; i < m.w - 1; i++) {
    dr = AH.mulberry(((m0.seed || 1) * 7 + 3 + i * 7919 + j * 104729) >>> 0);
    const X = i * T, Y = j * T + 4;
    if (isFace(i, j) && dr() < 0.22) {
      const k = dr();
      if (k < 0.25 && (id === 'stone' || id === 'moss' || id === 'crystal' || id === 'fungal')) { // timber support
        R(X + 2, Y, 3, 12, '#4e3420'); R(X + 11, Y, 3, 12, '#4e3420'); R(X + 1, Y, 14, 3, '#6b4a2e'); R(X + 1, Y, 14, 1, '#86603c'); R(X + 2, Y + 3, 1, 9, '#6b4a2e'); R(X + 11, Y + 3, 1, 9, '#6b4a2e');
      } else if (id === 'moss') { for (let q = 0; q < 4; q++) { const vx = X + dr.int(1, 14), len = dr.int(3, 11); for (let y2 = 0; y2 < len; y2++) P(vx + (y2 % 4 === 3 ? 1 : 0), Y + y2, y2 % 3 ? '#2e5a2a' : '#4e8a3e'); } R(X + dr.int(0, 8), Y, dr.int(4, 8), 2, '#3e6a32'); }
      else if (id === 'crystal' || id === 'shadow' && k < 0.6) {
        const cols = id === 'shadow' ? ['#4a2a6a', '#8a5ac8', '#d8b0ff'] : ['#2a7a96', '#4fbcd8', '#9ef0ff'];
        const cx = X + dr.int(3, 10); for (let q = 0; q < 3; q++) { const hh = dr.int(3, 7), xx = cx + q * 2 - 2; E(xx, Y + 9 - hh, 1, hh, cols[1]); E(xx + 1, Y + 9 - hh, 1, hh, cols[0]); E(xx, Y + 9 - hh, 1, 1, cols[2]); R(xx, Y + 9 - hh, 2, hh, cols[0]); }
      } else if (id === 'fungal') { for (let q = 0; q < 3; q++) { const fx = X + dr.int(1, 12), fy = Y + dr.int(2, 10), col = dr.pick(['#e070c0', '#c8a0ff', '#70e0c0']); R(fx, fy + 1, 1, 2, '#c8b8a8'); E(fx - 1, fy, 3, 1, col); R(fx - 1, fy, 3, 1, AH.shade(col, 0.6)); } }
      else if (id === 'sunken') { for (let q = 0; q < 3; q++) { const sx2 = X + dr.int(1, 14); R(sx2, Y, 1, dr.int(4, 12), '#2a4a5a'); } R(X + dr.int(0, 10), Y + 9, 6, 3, '#2e5a4a'); }
      else if (id === 'bone') { // skull niche
        R(X + 4, Y + 2, 8, 8, '#0c0a08'); R(X + 5, Y + 4, 6, 5, '#d8d0b8'); R(X + 6, Y + 5, 1, 2, '#1a1612'); R(X + 9, Y + 5, 1, 2, '#1a1612'); R(X + 7, Y + 8, 2, 1, '#9a907a'); R(X + 5, Y + 4, 6, 1, '#f2ead0');
      } else if (id === 'frozen') { for (let q = 0; q < 5; q++) { const ix = X + dr.int(0, 15), len = dr.int(2, 8); for (let y2 = 0; y2 < len; y2++) P(ix, Y + y2, y2 < len - 1 ? '#c8e8ff' : '#ffffff'); if (len > 4) P(ix + 1, Y, '#a8c8e8'); } R(X, Y, 16, 2, '#dfefff'); }
      else if (id === 'magma' || id === 'ashen') { let cx = X + dr.int(3, 12), cy = Y; for (let q = 0; q < 11; q++) { E(cx, cy, 1, 1, q % 4 ? '#ff6a1a' : '#ffd36a'); R(cx, cy, 1, 1, '#3a1008'); cy++; cx += dr.int(-1, 1); } if (id === 'ashen' && k > 0.7) { for (let q = 0; q < 10; q++) P(X + 8 + (q % 2), Y + q, q % 2 ? '#5a5462' : '#8a8494'); } }
      else if (id === 'shadow') { const rx = X + 5, ry = Y + 2; E(rx, ry, 1, 7, '#8a5ac8'); E(rx + 1, ry + 3, 4, 1, '#8a5ac8'); E(rx + 5, ry, 1, 7, '#8a5ac8'); }
      else if (id === 'stone' && k < 0.6) { R(X + 6, Y + 3, 2, 2, '#1a1418'); R(X + 6, Y + 3, 1, 1, '#c8a060'); /* lantern hook */ R(X + 7, Y + 5, 1, 3, '#3a3036'); }
    }
    if (isOpen(i, j) && dr() < 0.05) {
      const X2 = X + dr.int(2, 10), Y2 = j * T + dr.int(4, 12), k = dr();
      if (id === 'stone' || (id === 'moss' && k < 0.3)) {
        if (k < 0.35) { R(X2, Y2, 8, 6, '#0c0a0e'); R(X2 + 1, Y2 + 1, 6, 4, '#6b4a2e'); R(X2 + 1, Y2 + 1, 6, 1, '#86603c'); R(X2 + 1, Y2 + 3, 6, 1, '#4e3420'); } // crate
        else if (k < 0.6) { R(X2, Y2 + 2, 7, 1, '#6b4a2e'); R(X2 + 5, Y2, 1, 4, '#8a8298'); R(X2 + 4, Y2, 3, 1, '#b4b0c0'); } // pickaxe
        else { R(X2, Y2, 9, 5, '#0c0a0e'); R(X2 + 1, Y2 + 1, 7, 3, '#4a4458'); R(X2 + 1, Y2 + 1, 7, 1, '#7a7088'); R(X2 + 1, Y2 + 4, 2, 2, '#1a1620'); R(X2 + 6, Y2 + 4, 2, 2, '#1a1620'); } // wrecked cart
      } else if (id === 'bone' || id === 'ashen') { R(X2, Y2 + 2, 6, 1, '#c8c0a8'); R(X2 + 1, Y2, 1, 4, '#c8c0a8'); R(X2 + 4, Y2 + 1, 3, 3, '#d8d0b8'); R(X2 + 5, Y2 + 2, 1, 1, '#1a1612'); }
      else if (id === 'moss') { for (let q = 0; q < 5; q++) { P(X2 + q * 2, Y2 + 2 - (q % 2), '#4e8a3e'); P(X2 + q * 2, Y2 + 3, '#2e5a2a'); } }
      else if (id === 'fungal') { const col = dr.pick(['#e070c0', '#c8a0ff']); R(X2 + 2, Y2 + 2, 1, 3, '#c8b8a8'); E(X2, Y2, 5, 2, col); R(X2, Y2, 5, 2, AH.shade(col, 0.6)); E(X2 + 1, Y2, 1, 1, '#ffffff'); }
      else if (id === 'frozen') { R(X2, Y2 + 2, 9, 2, '#c8dcf0'); R(X2 + 2, Y2 + 1, 5, 1, '#e8f4ff'); }
      else if (id === 'sunken') { R(X2, Y2, 4, 6, '#0c0a0e'); R(X2 + 1, Y2 + 1, 2, 5, '#6a7a8a'); R(X2 + 1, Y2 + 1, 2, 1, '#9aaaba'); R(X2 + 4, Y2 + 4, 4, 2, '#5a6a7a'); }
      else if (id === 'magma') { R(X2, Y2 + 2, 5, 3, '#1a1014'); R(X2 + 1, Y2 + 1, 2, 1, '#3a2a34'); E(X2 + 3, Y2 + 3, 1, 1, '#ff8a2e'); }
      else if (id === 'crystal' || id === 'shadow') { const cols = id === 'shadow' ? ['#4a2a6a', '#8a5ac8'] : ['#2a7a96', '#4fbcd8']; E(X2, Y2, 1, 4, cols[1]); E(X2 + 2, Y2 + 1, 1, 3, cols[1]); R(X2 + 1, Y2 + 1, 1, 3, cols[0]); }
    }
  }
  // static crystals
  for (const p of m.props) if (p.type === 'crystal') {
    const r2 = AH.mulberry(p.seed);
    const shards = [[0, 6], [2, 9], [4, 7], [6, 5]];
    const cols = m.biome.id === 'shadow' ? ['#4a2a6a', '#8a5ac8', '#d8b0ff', '#ffffff'] : ['#2a7a96', '#4fbcd8', '#9ef0ff', '#ffffff'];
    for (const [dx, hh] of shards.slice(0, r2.int(2, 4))) {
      const hgt = hh + r2.int(-2, 1);
      ex.fillStyle = cols[1]; ex.fillRect(p.x + dx, p.y - hgt, 1, hgt);
      ex.fillStyle = cols[0]; ex.fillRect(p.x + dx + 1, p.y - hgt, 1, hgt);
      ex.fillStyle = cols[2]; ex.fillRect(p.x + dx, p.y - hgt, 1, 1);
    }
  }
  m0.canvas = c; m0.emCanvas = em;
  return c;
};

// ---------- town ----------
// Dunmere: one long street. Shops face the street from the north, the mine opens on the east end.
AH.TOWN_BASE = 11; // first street row (building fronts end here)
AH.genTown = function () {
  const W = 60, H = 21, B = AH.TOWN_BASE;
  const m = new AH.Map(W, H);
  m.town = true;
  m.t.fill(AH.TILE.TREE);
  for (let y = B; y < 17; y++) for (let x = 1; x < W - 1; x++) m.set(x, y, AH.TILE.ROAD);
  for (let y = 17; y < 19; y++) for (let x = 1; x < W - 1; x++) m.set(x, y, AH.TILE.GRASS);
  m.buildings = [
    { id: 'house1', x: 1, w: 4, h: 4, roof: ['#56607e', '#343a52', '#7a84a4'], wall: 'planks' },
    { id: 'smith', name: 'SMITH', x: 6, w: 7, h: 5, roof: ['#9a4234', '#5e2820', '#c05a44'], wall: 'stone', door: { x: 11, y: B }, npc: 'smith' },
    { id: 'store', name: 'STORE', x: 14, w: 5, h: 5, roof: ['#56607e', '#343a52', '#7a84a4'], wall: 'planks', door: { x: 17, y: B }, npc: 'herbal' },
    { id: 'inn', name: 'INN', x: 21, w: 7, h: 6, roof: ['#9a4234', '#5e2820', '#c05a44'], wall: 'inn', door: { x: 24, y: B }, npc: 'keeper' },
    { id: 'shrine', name: 'SHRINE', x: 30, w: 5, h: 6, roof: ['#6a6a7a', '#3a3a4a', '#9a9aaa'], wall: 'marble', door: { x: 32, y: B }, npc: 'priest' },
    { id: 'house2', x: 37, w: 4, h: 4, roof: ['#7a5a3a', '#4a3424', '#9a7a5a'], wall: 'timber' },
    { id: 'house3', x: 42, w: 5, h: 4, roof: ['#9a4234', '#5e2820', '#c05a44'], wall: 'stone' },
  ];
  for (const b of m.buildings) b.y = B - b.h;
  // mine entrance on the east end
  m.mine = { x: 54 * T, y: B * T + 4 };
  // plaza props (solid well)
  m.well = { x: 26 * T + 8, y: 14 * T + 12 }; m.set(26, 14, AH.TILE.BUILD);
  m.board = { x: 29 * T + 4, y: 12 * T + 6 };
  m.stash = { x: 36 * T + 2, y: 12 * T + 6 };
  m.lamps = [[5.5, 11], [13.5, 11], [20, 11], [41.5, 11], [48.3, 11], [10, 16], [30, 16], [44, 16]].map(([x, y]) => ({ x: Math.round(x * T + 7), y: y * T + 6 }));
  const rng = AH.mulberry(77);
  m.trees = [];
  for (let x = 1; x < W - 1; x += 2) m.trees.push({ x: x * T + rng.int(0, 12), y: 19 * T + rng.int(6, 12), s: rng.int(0, 2) });
  for (let x = 2; x < W - 1; x += 2) m.trees.push({ x: x * T + rng.int(0, 12), y: 20 * T + rng.int(6, 16), s: rng.int(0, 2) });
  m.trees.sort((a, b) => a.y - b.y);
  m.spawn = { x: 24 * T + 8, y: 14 * T + 8 };
  m.mineSpawn = { x: 54 * T + 8, y: (B + 1) * T + 8 };
  return m;
};

AH.renderTown = function (m) {
  const W = m.w * T, H = m.h * T, B = AH.TOWN_BASE * T;
  const c = AH.makeCanvas(W, H), x = c.getContext('2d');
  const em = AH.makeCanvas(W, H), ex = em.getContext('2d');
  const rnd = AH.mulberry(11);
  const px = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
  const rect = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const erect = (X, Y, w, h, col) => { ex.fillStyle = col; ex.fillRect(X, Y, w, h); };
  const bay = (X, Y) => AH.BAYER[(Y & 3) * 4 + (X & 3)];
  // --- backdrop: sky stays transparent (drawn live), mountains + town wall
  for (const [base, col, seed] of [[52, '#2c2a3c', 3], [74, '#221f2e', 9]]) {
    const r2 = AH.mulberry(seed); let h = base;
    for (let X = 0; X < W; X++) { h += r2.pick([-1, 0, 0, 0, 1]); h = AH.clamp(h, base - 16, base + 8); rect(X, h, 1, B - h, col); if (r2() < 0.5) px(X, h, AH.shade(col, 1.3)); }
  }
  // distant rooftops
  for (let X = 0; X < W; X += rnd.int(18, 30)) {
    const w = rnd.int(14, 22), h = rnd.int(10, 18), Y = 96 - h;
    rect(X, Y, w, B - Y, '#1a1724');
    for (let j = 0; j < 6; j++) rect(X - 1 + j, Y - j, w + 2 - j * 2, 1, '#241f30');
    if (rnd() < 0.6) { rect(X + 4, Y + 5, 2, 2, '#1e1a26'); erect(X + 4, Y + 5, 2, 2, '#c89048'); }
  }
  // stone town wall behind the buildings
  const STONE = ['#1c1822', '#4a4252', '#5c5466', '#746a7e', '#544c5e'];
  const bricks = (X0, Y0, w, h, pal, bw, bh) => {
    for (let row = 0; row * bh < h; row++) for (let bx = -bw; bx < w; bx += bw) {
      const base = rnd.pick([pal[2], pal[2], pal[4], pal[2], pal[1]]);
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
        const X = bx + (row % 2) * (bw >> 1) + i, Y = row * bh + j; if (X < 0 || X >= w || Y >= h) continue;
        let col = (j === bh - 1 || i === bw - 1) ? pal[0] : j === 0 ? pal[3] : j === bh - 2 ? pal[1] : base;
        if (col === base && rnd() < 0.05) col = pal[1];
        px(X0 + X, Y0 + Y, col);
      }
    }
  };
  bricks(0, 112, W, B - 112, ['#14111a', '#2c2834', '#363040', '#423b4c', '#322c3a'], 12, 6);
  rect(0, 110, W, 3, '#4a4252'); rect(0, 110, W, 1, '#5c5466');
  // ivy / bushes along the wall
  for (let X = 0; X < W; X += rnd.int(6, 14)) for (let k = 0; k < 14; k++) { const a = rnd.int(-5, 5), b2 = rnd.int(0, 10); px(X + a, B - 2 - b2 + Math.abs(a) / 2, rnd.pick(['#1e3a1e', '#2e5a2a', '#24461f'])); }
  // --- street: cobblestones
  const CB = ['#24202a', '#38323f', '#443e4e', '#565062', '#625c6e'];
  const cobble = (X0, Y0, w, h, ts) => {
    for (let ty = 0; ty < h; ty += ts) {
      const off = ((ty / ts) % 2) * (ts >> 1);
      for (let tx = -ts; tx < w; tx += ts) {
        const sx = tx + off, lay = rnd();
        const st = lay < 0.45 ? [[0, 0, ts, ts]] : lay < 0.75 ? (k => [[0, 0, ts, k], [0, k, ts, ts - k]])(rnd.int(4, 6)) : lay < 0.9 ? (k => [[0, 0, k, ts], [k, 0, ts - k, ts]])(rnd.int(4, 6)) : [[0, 0, ts >> 1, ts >> 1], [ts >> 1, 0, ts >> 1, ts >> 1], [0, ts >> 1, ts >> 1, ts >> 1], [ts >> 1, ts >> 1, ts >> 1, ts >> 1]];
        for (const [a, b2, sw, sh] of st) {
          const vary = rnd.pick([CB[2], CB[2], CB[2], CB[1], CB[4]]);
          for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
            const X = sx + a + i, Y = ty + b2 + j; if (X < 0 || X >= w || Y >= h) continue;
            let col = (i === 0 || j === 0) ? CB[0] : (j === 1 && i < sw - 1) ? CB[3] : (j === sh - 1 || i === sw - 1) ? CB[1] : vary;
            if (col === vary) { const r = rnd(); if (r < 0.04) col = CB[4]; else if (r < 0.07) col = CB[1]; }
            px(X0 + X, Y0 + Y, col);
          }
        }
      }
    }
  };
  cobble(0, B, W, 6 * T, 10);
  // shade under the building row + curb
  rect(0, B, W, 2, '#1a161e'); x.fillStyle = 'rgba(10,8,14,0.35)'; x.fillRect(0, B + 2, W, 4); x.fillStyle = 'rgba(10,8,14,0.18)'; x.fillRect(0, B + 6, W, 4);
  // puddles
  m.puddles = [];
  for (let k = 0; k < 14; k++) {
    const pxx = rnd.int(20, W - 20), py = rnd.int(B + 22, B + 6 * T - 8), w = rnd.int(14, 34);
    for (let j = 0; j < 4; j++) { const ww = Math.round(w - Math.abs(j - 1.5) * 6); rect(pxx - (ww >> 1), py + j, ww, 1, j % 2 ? '#34405a' : '#3e4a64'); }
    rect(pxx - 3, py + 1, 6, 1, '#8a8aa0');
    m.puddles.push({ x: pxx, y: py, w });
  }
  // mine-cart rails from the mine down the street
  for (let Y = B; Y < 17 * T; Y += 5) rect(54 * T - 2, Y, 21, 2, '#4a3424');
  rect(54 * T - 1, B, 1, 6 * T, '#8a8298'); rect(54 * T + 17, B, 1, 6 * T, '#8a8298');
  // --- grass verge + low fence
  rect(0, 17 * T, W, H - 17 * T, '#2e4a26');
  for (let k = 0; k < W * 3; k++) { const X = rnd.int(0, W), Y = rnd.int(17 * T, 19 * T); px(X, Y, '#4a7a3a'); px(X - 1, Y + 1, '#4a7a3a'); px(X + 1, Y + 1, '#4a7a3a'); px(X, Y + 1, '#24401e'); }
  for (let k = 0; k < 40; k++) { const X = rnd.int(0, W), Y = rnd.int(17 * T + 2, 19 * T); px(X, Y, rnd.pick(['#f2d36a', '#e8a0b0', '#c8d8ff'])); }
  rect(0, 17 * T - 1, W, 2, '#2a2430'); rect(0, 17 * T - 1, W, 1, '#4a4252');
  for (let X = 4; X < W; X += 8) { rect(X, 19 * T - 6, 2, 9, '#5a3c22'); rect(X, 19 * T - 6, 2, 1, '#86603c'); }
  rect(0, 19 * T - 4, W, 1, '#6b4a2e'); rect(0, 19 * T, W, 1, '#5a3c22');
  // --- building helpers
  const roof = (bx, by, bw, bh, cols) => {
    const cx = bx + bw / 2;
    for (let j = 0; j < bh; j++) {
      const half = Math.floor((bw / 2 + 2) * (j + 1) / bh);
      for (let i = -half; i < half; i++) {
        const X = Math.floor(cx + i); let col = cols[0];
        if (j % 4 === 3) col = cols[1]; else if (((X + Math.floor(j / 4) * 3) % 6) === 0) col = cols[1];
        if (i === -half || i === half - 1) col = AH.OUT;
        if (i >= -1 && i <= 0 && j < 2) col = cols[2];
        px(X, by + j, col);
      }
    }
    rect(bx - 3, by + bh, bw + 6, 2, cols[1]); rect(bx - 3, by + bh, bw + 6, 1, cols[2]); rect(bx - 3, by + bh + 2, bw + 6, 1, AH.OUT);
  };
  const planks = (X0, Y0, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = i % 6; let col = k === 5 ? '#4e3420' : k === 0 ? '#86603c' : (j % 14 === 13 ? '#4e3420' : '#6b4a2e'); if (rnd() < 0.03) col = '#4e3420'; px(X0 + i, Y0 + j, col); } };
  const timber = (X0, Y0, w, h) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(X0 + i, Y0 + j, ((X0 + i) * 7 + (Y0 + j) * 3) % 11 ? '#b8a888' : '#a8987a');
    const Bm = '#3a261a'; rect(X0, Y0, w, 2, Bm); rect(X0, Y0 + h - 2, w, 2, Bm);
    for (let i = 0; i < w; i += 14) rect(X0 + i, Y0, 2, h, Bm);
    rect(X0 + w - 2, Y0, 2, h, Bm);
    for (let i = 0; i + 14 <= w - 2; i += 14) for (let k = 0; k < 12; k++) rect(X0 + i + 2 + k, Y0 + 2 + Math.floor(k * (h - 4) / 12), 1, 1, Bm);
  };
  m.windows = [];
  const win = (X, Y, w, h) => {
    rect(X - 1, Y - 1, w + 2, h + 2, AH.OUT); rect(X, Y, w, h, '#1e1a26'); rect(X, Y, w, 1, '#2a2634');
    erect(X, Y, w, h, '#ffc860'); erect(X, Y, w, 2, '#ffe6a0');
    erect(X + (w >> 1), Y, 1, h, '#3a261a'); erect(X, Y + (h >> 1), w, 1, '#3a261a');
    rect(X + (w >> 1), Y, 1, h, '#3a261a'); rect(X, Y + (h >> 1), w, 1, '#3a261a');
    rect(X - 1, Y + h, w + 2, 2, '#5a4a3a'); rect(X - 1, Y + h, w + 2, 1, '#7a6a5a');
    m.windows.push({ x: X + w / 2, y: Y + h / 2 + 8 });
  };
  const door = (X, Y, w, h, lit) => {
    rect(X - 1, Y - 1, w + 2, h + 1, AH.OUT); rect(X, Y, w, h, '#3a2418');
    for (let k = 2; k < w; k += 4) rect(X + k, Y, 1, h, '#4e3020');
    px(X + w - 3, Y + (h >> 1), '#e8c25a');
    if (lit) { erect(X, Y, w, h, '#ffc860'); erect(X, Y, w, 3, '#ffe6a0'); for (let k = 2; k < w; k += 4) erect(X + k, Y + 3, 1, h - 3, '#e8a848'); }
    rect(X - 2, Y + h, w + 4, 1, '#2a2430');
  };
  const sign = (cx, Y, label) => {
    const w = AH.textW(label) + 6, X = Math.round(cx - w / 2);
    rect(X + 3, Y - 4, 1, 4, '#2a1c12'); rect(X + w - 4, Y - 4, 1, 4, '#2a1c12');
    rect(X - 1, Y - 1, w + 2, 11, AH.OUT); rect(X, Y, w, 9, '#6b4a2e'); rect(X, Y, w, 1, '#86603c'); rect(X, Y + 8, w, 1, '#4e3420');
    AH.text(x, X + 3, Y + 1, label, '#f2e3b3', { shadow: '#3a261a' });
  };
  for (const b of m.buildings) {
    const X = b.x * T, w = b.w * T, h = b.h * T, Y = B - h;
    const roofH = Math.round(h * 0.36), wy = Y + roofH + 3, wh = B - wy;
    // drop shadow on the wall behind
    rect(X + w, Y + roofH, 4, B - Y - roofH, 'rgba(0,0,0,0.35)');
    if (b.wall === 'stone' || b.wall === 'marble') bricks(X + 2, wy, w - 4, wh, b.wall === 'stone' ? STONE : ['#4a4a5a', '#8a8a9c', '#a2a2b2', '#c0c0cc', '#9696a8'], 10, 5);
    else if (b.wall === 'planks') planks(X + 2, wy, w - 4, wh);
    else if (b.wall === 'timber') timber(X + 2, wy, w - 4, wh);
    else if (b.wall === 'inn') { const th = Math.round(wh * 0.45); timber(X + 2, wy, w - 4, th); bricks(X + 2, wy + th, w - 4, wh - th, STONE, 10, 5); rect(X + 1, wy + th - 1, w - 2, 2, '#3a261a'); }
    rect(X + 1, wy, 1, wh, AH.OUT); rect(X + w - 2, wy, 1, wh, AH.OUT);
    roof(X, Y, w, roofH, b.roof);
    const dX = b.door ? b.door.x * T : -999;
    if (false) {
    }
    if (b.id.startsWith('house')) {
      win(X + 9, wy + 8, 8, 9); if (w >= 80) win(X + 30, wy + 8, 8, 9);
      door(X + w - 22, B - 20, 12, 20, false);
    }
    if (b.id === 'smith') {
      // open forge on the left
      const fx = X + 10, fy = B - 28;
      rect(fx - 1, fy - 1, 26, 29, AH.OUT); rect(fx, fy, 24, 28, '#2a1410');
      for (let j = 0; j < 26; j++) for (let i = 0; i < 22; i++) { const t2 = j / 26; let col = t2 > 0.75 ? '#ffd36a' : t2 > 0.45 ? '#ff8a2e' : t2 > 0.2 ? '#c84a1a' : '#5a1e10'; if (bay(i, j) < 0.25 && t2 > 0.2) col = '#ffb347'; erect(fx + 1 + i, fy + 1 + j, 1, 1, col); px(fx + 1 + i, fy + 1 + j, t2 > 0.45 ? '#7a2a14' : '#3a1810'); }
      rect(fx - 2, fy - 3, 28, 3, '#5a3c22'); rect(fx - 2, fy - 3, 28, 1, '#86603c');
      m.forge = { x: fx + 12, y: fy + 20 };
      // anvil + barrel
      rect(fx + 30, B - 10, 14, 4, '#4a4458'); rect(fx + 33, B - 6, 8, 6, '#2e2a36'); rect(fx + 30, B - 10, 14, 1, '#7a7088');
      rect(fx + 48, B - 13, 10, 13, AH.OUT); rect(fx + 49, B - 12, 8, 12, '#6b4a2e'); rect(fx + 49, B - 9, 8, 1, '#3a3442'); rect(fx + 49, B - 4, 8, 1, '#3a3442');
      // chimney
      rect(X + w - 30, Y - 14, 10, roofH + 4, '#3a3442'); rect(X + w - 31, Y - 16, 12, 3, '#2a2430'); rect(X + w - 30, Y - 14, 1, roofH + 4, '#4c4556');
      m.chimney = { x: X + w - 26, y: Y - 16 };
      door(dX + 2, B - 22, 12, 22, false);
      sign(X + w / 2, wy + 3, b.name);
    }
    if (b.id === 'store') {
      win(X + 12, wy + 6, 8, 9); win(X + w - 20, wy + 6, 8, 9);
      // striped awning
      const ay = wy + 24;
      for (let i = 0; i < w - 4; i++) { const col = (i >> 2) % 2 ? '#a8323a' : '#e8dcc4'; rect(X + 2 + i, ay, 1, 3, col); if (i % 4 === 2) px(X + 2 + i, ay + 3, '#7a2028'); }
      rect(X + 2, ay - 1, w - 4, 1, AH.OUT);
      // display window with potions
      const sx = X + 8, sy = ay + 8;
      rect(sx - 1, sy - 1, 26, 14, AH.OUT); rect(sx, sy, 24, 12, '#2a2230'); erect(sx, sy, 24, 12, '#ffc860');
      for (const [k, col] of [[3, '#d4453c'], [8, '#6fbf73'], [13, '#4a7bd1'], [18, '#e8c25a']]) { rect(sx + k, sy + 6, 3, 5, col); erect(sx + k, sy + 6, 3, 5, col); rect(sx + k + 1, sy + 4, 1, 2, '#c8c0d0'); }
      rect(sx - 1, sy + 12, 26, 2, '#5a4a3a');
      m.windows.push({ x: sx + 12, y: sy + 14 });
      door(dX + 2, B - 22, 12, 22, true);
      sign(X + w / 2, Y + roofH - 8, b.name);
    }
    if (b.id === 'inn') {
      for (let k = 0; k < 4; k++) win(X + 10 + Math.round(k * (w - 28) / 3), wy + 7, 8, 8);
      win(X + 12, B - 26, 10, 11); win(X + w - 22, B - 26, 10, 11);
      door(dX - 2, B - 26, 20, 26, true);
      m.windows.push({ x: dX + 8, y: B - 6 });
      sign(X + w / 2, Y + roofH - 10, b.name);
      // hanging tankard sign
      const hx2 = X + w + 2, hy = wy + 18;
      rect(X + w - 6, hy - 4, 14, 1, '#2a1c12'); rect(hx2 + 4, hy - 3, 1, 3, '#2a1c12');
      rect(hx2 - 1, hy, 12, 11, AH.OUT); rect(hx2, hy + 1, 10, 9, '#6b4a2e');
      rect(hx2 + 2, hy + 2, 5, 6, '#e8c25a'); rect(hx2 + 7, hy + 3, 1, 3, '#e8c25a'); rect(hx2 + 2, hy + 2, 5, 1, '#fff2d0');
    }
    if (b.id === 'shrine') {
      // bell tower
      const tx = X + w / 2 - 7;
      rect(tx, Y - 22, 14, 24, '#a8a8b8'); rect(tx, Y - 22, 1, 24, AH.OUT); rect(tx + 13, Y - 22, 1, 24, AH.OUT);
      rect(tx + 4, Y - 16, 6, 8, '#2a2430'); rect(tx + 6, Y - 14, 2, 4, '#e8c25a');
      for (let j = 0; j < 10; j++) rect(tx + 7 - j, Y - 32 + j, j * 2 + 1, 1, j === 9 ? '#3a3a4a' : '#6a6a7a');
      erect(tx + 6, Y - 37, 2, 5, '#ffb347'); erect(tx + 6, Y - 36, 1, 3, '#fff2b0');
      // round stained glass
      const gx = X + w / 2, gy = wy + 12;
      for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) { const d = Math.hypot(i, j); if (d > 7.5) continue; if (d > 6) { px(gx + i, gy + j, AH.OUT); continue; } const col = (i === 0 || j === 0) ? '#3a2a4a' : ['#d4453c', '#4a7bd1', '#e8c25a', '#6fbf73'][(i > 0) * 2 + (j > 0)]; px(gx + i, gy + j, AH.shade(col, 0.5)); erect(gx + i, gy + j, 1, 1, col); }
      m.windows.push({ x: gx, y: gy + 10 });
      // arched door
      const ax = dX + 1, ay2 = B - 24;
      rect(ax - 1, ay2 + 3, 16, 21, AH.OUT); rect(ax + 2, ay2, 10, 3, AH.OUT); rect(ax, ay2 + 3, 14, 21, '#3a2a4a'); rect(ax + 3, ay2 + 1, 8, 3, '#3a2a4a');
      erect(ax, ay2 + 3, 14, 21, '#c8a0ff'); erect(ax + 3, ay2 + 1, 8, 3, '#c8a0ff'); erect(ax + 6, ay2 + 3, 2, 21, '#7a5aa0');
      rect(ax + 6, ay2 + 3, 2, 21, '#2a1c38');
      m.windows.push({ x: ax + 7, y: B - 4 });
      sign(X + w / 2, Y + roofH - 6, b.name);
    }
  }
  // --- mine: rocky hill with a timbered mouth
  const MX = 50 * T, MW = 10 * T, MY = 3 * T, MH = B - MY;
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const d = ((i - MW / 2) / (MW / 2)) ** 2 + ((j - MH) / MH) ** 2; if (d >= 1) continue;
    let col = ((MX + i) * 3 + (MY + j) * 5) % 7 ? '#3a3442' : '#2c2834';
    if (d > 0.86) col = '#24202c'; else if (rnd() < 0.04) col = '#4c4556'; else if (j < MH * 0.3 && rnd() < 0.1) col = '#463e50';
    px(MX + i, MY + j, col);
  }
  for (let k = 0; k < 30; k++) { const a = rnd.int(MX + 20, MX + MW - 20), b2 = rnd.int(MY + 30, B - 10); rect(a, b2, rnd.int(3, 6), 2, '#2a2532'); rect(a, b2, 2, 1, '#544c5e'); }
  const ex0 = 54 * T + 8, ew = 34, eh = 40;
  for (let j = 0; j < eh; j++) for (let i = 0; i < ew; i++) if (((i - ew / 2) / (ew / 2)) ** 2 + ((j - eh) / eh) ** 2 < 1) px(ex0 - ew / 2 + i, B - eh + j, j > eh - 10 ? '#0a080e' : '#050408');
  rect(ex0 - 21, B - 36, 5, 36, '#6b4a2e'); rect(ex0 + 16, B - 36, 5, 36, '#6b4a2e'); rect(ex0 - 21, B - 36, 1, 36, '#86603c'); rect(ex0 + 16, B - 36, 1, 36, '#86603c');
  rect(ex0 - 24, B - 41, 48, 6, '#5a3c22'); rect(ex0 - 24, B - 41, 48, 1, '#86603c'); rect(ex0 - 24, B - 36, 48, 1, AH.OUT);
  sign(ex0, B - 56, 'MINE');
  // lantern by the mine mouth
  rect(ex0 + 24, B - 26, 2, 26, '#1a1620'); rect(ex0 + 21, B - 32, 8, 7, AH.OUT); rect(ex0 + 22, B - 31, 6, 5, '#5a4a2a'); erect(ex0 + 22, B - 31, 6, 5, '#ffd36a');
  m.windows.push({ x: ex0 + 25, y: B - 20 });
  // mine cart
  const cx2 = ex0 - 2, cy2 = B + 26;
  rect(cx2 - 11, cy2 - 9, 22, 10, AH.OUT); rect(cx2 - 10, cy2 - 8, 20, 8, '#5a5468'); rect(cx2 - 10, cy2 - 8, 20, 1, '#7a7088');
  for (let k = 0; k < 6; k++) rect(cx2 - 8 + k * 3, cy2 - 11 + (k % 2), 3, 3, k % 2 ? '#8a6a3a' : '#c8a060');
  rect(cx2 - 8, cy2, 4, 3, '#1a1620'); rect(cx2 + 4, cy2, 4, 3, '#1a1620');
  // --- trees on the south edge
  for (const t of m.trees) {
    const r = 9 + t.s * 2;
    rect(t.x - r + 2, t.y - 1, r * 2 - 4, 3, 'rgba(0,0,0,0.35)');
    rect(t.x - 1, t.y - 9, 3, 9, '#4a3020'); rect(t.x - 1, t.y - 9, 1, 9, '#5e3e28');
    const cols = ['#142a16', '#1e3a1e', '#2e5a2a', '#3e7a36', '#5a9a46'];
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j * 1.15) / r; if (d > 1) continue;
      let k = d > 0.88 ? 0 : (i + j < -r * 0.6 ? 4 : i + j < 0 ? 3 : i + j < r * 0.7 ? 2 : 1);
      if (bay(i + 64, j + 64) < 0.25) k = Math.max(0, k - 1);
      px(t.x + i, t.y - 10 - r + j, cols[k]);
    }
  }
  // --- board, stash, well
  AH.drawSpr(x, AH.SPR.board, m.board.x - 8, m.board.y - 12);
  AH.drawSpr(x, AH.SPR.chest, m.stash.x - 8, m.stash.y - 10);
  const wl = m.well;
  rect(wl.x - 10, wl.y - 14, 20, 15, AH.OUT); bricks(wl.x - 9, wl.y - 13, 18, 13, STONE, 6, 4); rect(wl.x - 7, wl.y - 13, 14, 4, '#1e3a5a'); rect(wl.x - 6, wl.y - 12, 6, 1, '#3e6a8a');
  rect(wl.x - 9, wl.y - 26, 2, 13, '#6b4a2e'); rect(wl.x + 7, wl.y - 26, 2, 13, '#6b4a2e');
  for (let j = 0; j < 5; j++) rect(wl.x - 11 + j, wl.y - 30 + j, 22 - j * 2, 1, j === 4 ? '#5e2820' : '#9a4234');
  rect(wl.x - 1, wl.y - 24, 1, 8, '#a8a0b0'); rect(wl.x - 2, wl.y - 17, 3, 3, '#6b4a2e');
  m.canvas = c; m.emCanvas = em;
};
