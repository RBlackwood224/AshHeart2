'use strict';
// Combat: melee, projectiles, zones, explosions, skills, effects, loot
AH.fx = {
  num(G, x, y, t, col, big) { G.fx.push({ k: 'num', x, y, t: String(t), col, life: big ? 0.9 : 0.7, vy: -28, big }); },
  spark(G, x, y, col, n) { for (let i = 0; i < n; i++) G.fx.push({ k: 'px', x, y, vx: AH.rand.range(-40, 40), vy: AH.rand.range(-60, 10), col, life: AH.rand.range(0.2, 0.45), g: 120 }); },
  dust(G, x, y, col, n) { for (let i = 0; i < (n || 6); i++) G.fx.push({ k: 'px', x: x + AH.rand.range(-4, 4), y, vx: AH.rand.range(-25, 25), vy: AH.rand.range(-18, -4), col: col || '#6a6276', life: AH.rand.range(0.25, 0.5), g: 40 }); },
  puff(G, x, y, col) { for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; G.fx.push({ k: 'px', x, y, vx: Math.cos(a) * 35, vy: Math.sin(a) * 35, col, life: 0.35, g: 0, em: 1 }); } },
  ring(G, x, y, col, r) { G.fx.push({ k: 'ring', x, y, col, r0: 2, r1: r, life: 0.35, max: 0.35, em: 1 }); },
  burst(G, x, y, spr, sc) {
    const cols = Object.values(spr.pal);
    for (let i = 0; i < 14; i++) G.fx.push({ k: 'px', x: x + AH.rand.range(-5, 5), y: y + AH.rand.range(-5, 5), vx: AH.rand.range(-60, 60), vy: AH.rand.range(-80, -10), col: AH.rand.pick(cols), life: AH.rand.range(0.3, 0.7), g: 160 });
  },
  bolt(G, x0, y0, x1, y1) { G.fx.push({ k: 'bolt', x0, y0, x1, y1, life: 0.18, em: 1, seed: Math.random() * 1e6 }); },
  arc(G, p, r, a, arc, heavy) { G.fx.push({ k: 'arc', x: p.x, y: p.y - 9, r, a, arc, life: 0.14, max: 0.14, heavy, em: 1 }); },
};

const GP = AH.Game.prototype;
GP.dmgOpt = function (p, roll, extra) { return Object.assign({ crit: roll.crit, frost: roll.frost, freeze: roll.freeze }, extra || {}); };
GP.applyHitEffects = function (p, e, roll, dealt) {
  if (dealt <= 0) return;
  const S = p.S;
  if (S.loh) p.heal(null, S.loh * S.lohMult);
  if (roll.crit) { AH.Audio.sfx('crit'); this.shake(1); if (S.powers.has('chaincrit')) this.chainLightning(p, e, p.rollDamage(0.6, { noCrit: true }).dmg, 3); }
  else AH.Audio.sfx('hit');
  if (roll.fire && Math.random() < 0.25) { e.burnT = 2; e.burnDmg = S.fire * 0.4 + 1; e.burnBy = p; }
  AH.fx.spark(this, e.x, e.y - 8, roll.fire ? '#ffb347' : roll.frost ? '#9ef0ff' : '#ffffff', 4);
};
GP.meleeSwing = function (p, mult, range, arc, heavy) {
  AH.fx.arc(this, p, range, p.aim, arc, heavy);
  let hits = 0;
  const reachOf = e => range + e.r;
  for (const e of this.enemies) {
    if (e.dead || e.hidden || p.hitList.has(e.id)) continue;
    const dx = e.x - p.x, dy = (e.y - 4) - (p.y - 6), d = Math.hypot(dx, dy);
    if (d > reachOf(e)) continue;
    let da = Math.atan2(dy, dx) - p.aim; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) > arc / 2 && d > 9) continue;
    p.hitList.add(e.id);
    let m = mult;
    if (p.S.powers.has('triple') && p.hitCount % 4 === 0) m *= 3;
    const roll = p.rollDamage(m);
    const dealt = e.hurt(this, roll.dmg, p, this.dmgOpt(p, roll, { knock: heavy ? 140 : 50, stun: p.wbase().undead && heavy ? 0.6 : 0 }));
    this.applyHitEffects(p, e, roll, dealt); hits++;
  }
  // ore veins and secret walls
  const tx = Math.floor((p.x + Math.cos(p.aim) * 14) / AH.T), ty = Math.floor((p.y - 4 + Math.sin(p.aim) * 14) / AH.T);
  if (this.map && !this.map.town) {
    for (const [ox, oy] of [[0, 0], [0, -1], [0, 1], [1, 0], [-1, 0]]) {
      const X = tx + ox, Y = ty + oy;
      const v = (this.map.veins || []).find(v => v.tx === X && v.ty === Y && v.hp > 0);
      if (v) { this.mineVein(p, v); break; }
      if (this.map.get(X, Y) === AH.TILE.SECRET) { this.breakSecret(X, Y, p); break; }
    }
  }
  // chests can be smashed too
  return hits;
};
GP.mineVein = function (p, v) {
  v.hp--; v.hitT = 0.18; AH.Audio.sfx('pick'); AH.fx.spark(this, v.x, v.y - 4, v.gem ? '#6fd6e8' : (AH.ORE_COLORS[v.ore || 'ore'] || [0, 0, '#d8a048'])[2], 10); AH.fx.dust(this, v.x, v.y - 2, '#6a6276', 6); this.shake(2);
  if (this.world) this.world.tipVein = 1;
  if (v.hp <= 0) {
    const n = 1 + (Math.random() < 0.45 ? 1 : 0) + (Math.random() < 0.12 ? 1 : 0);
    AH.Audio.sfx('crumble'); this.shake(3); AH.fx.dust(this, v.x, v.y, '#8a8296', 16); this.rumble && this.rumble(p, 0.4, 120);
    this.dropItem(v.x, v.y + 6, AH.makeCons(v.gem ? 'gem' : (v.ore || 'ore'), v.ore === 'coal' ? n + 1 : n), p.pid);
    if (Math.random() < 0.06) this.dropItem(v.x, v.y + 6, AH.genRune(AH.rand, this.floorNo), p.pid);
    this.map.set(v.tx, v.ty, AH.TILE.FLOOR);
    for (let k = 0; k < 8; k++) this.fx.push({ k: 'px', x: v.x + (Math.random() - 0.5) * 12, y: v.y - 6 - Math.random() * 6, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, col: Math.random() < 0.5 ? this.map.biome.brick[3] : (v.gem ? '#6fd6e8' : (AH.ORE_COLORS[v.ore || 'ore'] || [0, 0, '#d8a048'])[2]), life: 0.6 });
  }
};
GP.breakSecret = function (X, Y, p) {
  this.map.set(X, Y, AH.TILE.FLOOR);
  AH.Audio.sfx('break'); this.shake(4);
  AH.fx.dust(this, X * AH.T + 8, Y * AH.T + 12, '#6a6276', 20);
  const x = this.map.canvas.getContext('2d');
  x.fillStyle = this.map.biome.floor[2]; x.fillRect(X * AH.T, Y * AH.T, AH.T, AH.T);
  x.fillStyle = this.map.biome.floor[0]; x.fillRect(X * AH.T, Y * AH.T, AH.T, 1);
  if (this.map.secret) this.map.secret.found = true;
  this.banner('A SECRET PASSAGE!', '#f2d36a');
};

GP.shoot = function (p, kind, mult, heavy, spread) {
  const a = p.aim + (spread || 0);
  const roll = p.rollDamage(mult);
  const sp = kind === 'arrow' ? 230 : kind === 'wave' ? 150 : 175;
  const col = kind === 'arrow' ? '#e9e2d0' : kind === 'wave' ? '#ffd36a' : (p.weapon() && p.weapon().rarity >= 3 ? '#ffb347' : '#6fd6e8');
  if (kind === 'magic') roll.dmg = roll.dmg * 0.7 + p.spellPower(2) * 0.35 * mult;
  this.projs.push({ k: kind, x: p.x + Math.cos(a) * 6, y: p.y - 9 + Math.sin(a) * 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a, owner: p, roll, dmg: roll.dmg, life: kind === 'wave' ? 0.35 : 0.9, pierce: heavy ? 4 : 0, hit: new Set(), col, r: heavy ? 5 : 3, heavy, light: kind === 'magic' });
  AH.Audio.sfx(kind === 'arrow' ? 'shoot' : 'magic');
};
GP.enemyShoot = function (e, a, col, spdMul) {
  const sp = 95 * (spdMul || 1);
  this.projs.push({ k: 'spit', x: e.x, y: e.y - e.spr.h * e.scale / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a, owner: e, dmg: e.dmg * 0.8, life: 2.6, col, r: 3, enemy: true, light: true });
};
GP.updateProjs = function (dt) {
  for (const pr of this.projs) {
    pr.life -= dt;
    if (pr.homing && pr.target && !pr.target.dead) { const a = Math.atan2(pr.target.y - 6 - pr.y, pr.target.x - pr.x); pr.vx = AH.lerp(pr.vx, Math.cos(a) * 160, dt * 4); pr.vy = AH.lerp(pr.vy, Math.sin(a) * 160, dt * 4); }
    if (pr.bomb) {
      const nx = pr.x + pr.vx * dt, ny = pr.y + pr.vy * dt;
      if (!this.map.solidAt(nx, ny + 4)) { pr.x = nx; pr.y = ny; } else { pr.vx = pr.vy = 0; }
      pr.vx *= 0.94; pr.vy *= 0.94;
      if (pr.life <= 0 && !pr.exploded) {
        pr.exploded = true; this.explosion(pr.x, pr.y, 34, pr.dmg, 'player', false, pr.owner);
        const tx = Math.floor(pr.x / AH.T), ty = Math.floor(pr.y / AH.T);
        for (let j = -2; j <= 1; j++) for (let i = -1; i <= 1; i++) if (this.map.get(tx + i, ty + j) === AH.TILE.SECRET) this.breakSecret(tx + i, ty + j, pr.owner);
      }
      continue;
    }
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (this.map.solidAt(pr.x, pr.y + 6)) {
      if (!pr.enemy && pr.owner && pr.owner.ch && this.map.veins) { const tx = Math.floor(pr.x / AH.T), ty = Math.floor((pr.y + 6) / AH.T); const v = this.map.veins.find(v => v.hp > 0 && v.tx === tx && v.ty === ty); if (v) this.mineVein(pr.owner, v); }
      pr.life = 0; if (pr.k === 'fire') this.explosion(pr.x, pr.y, 26, pr.dmg, 'player', false, pr.owner); AH.fx.spark(this, pr.x, pr.y, pr.col, 3); continue; }
    if (pr.enemy) {
      for (const p of this.players) {
        if (p.dead) continue;
        if (Math.abs(p.x - pr.x) < 6 && Math.abs(p.y - 8 - pr.y) < 9) { p.hurt(this, pr.dmg, pr.owner); pr.life = 0; AH.fx.spark(this, pr.x, pr.y, pr.col, 4); break; }
      }
    } else {
      for (const e of this.enemies) {
        if (e.dead || e.hidden || pr.hit.has(e.id)) continue;
        const h = e.spr.h * e.scale;
        if (Math.abs(e.x - pr.x) < e.r + pr.r && pr.y > e.y - h - 2 && pr.y < e.y + 3) {
          pr.hit.add(e.id);
          if (pr.k === 'fire') { this.explosion(pr.x, pr.y, 26, pr.dmg, 'player', false, pr.owner); pr.life = 0; break; }
          const roll = pr.roll || { dmg: pr.dmg, crit: false };
          const dealt = e.hurt(this, pr.dmg, pr.owner, this.dmgOpt(pr.owner, roll, { knock: pr.heavy ? 90 : 30 }));
          if (pr.owner && pr.owner.S) this.applyHitEffects(pr.owner, e, roll, dealt);
          if (pr.pierce > 0) pr.pierce--; else { pr.life = 0; break; }
        }
      }
    }
  }
  this.projs = this.projs.filter(p => p.life > 0);
};

GP.addZone = function (z) { z.tick = 0; this.zones.push(z); };
GP.updateZones = function (dt) {
  for (const z of this.zones) {
    z.t -= dt; z.tick -= dt;
    if (z.tick > 0) continue;
    z.tick = 0.4;
    if (z.kind === 'fire' || z.kind === 'holy') {
      for (const e of this.enemies) if (!e.dead && !e.hidden && AH.dist(e, z) < z.r + e.r) e.hurt(this, z.dps * 0.4 * (z.kind === 'holy' && e.undead ? 2 : 1), z.owner, { color: z.kind === 'holy' ? '#fff2b0' : '#ffb347', silent: false });
      if (z.kind === 'holy') for (const p of this.players) if (!p.dead && AH.dist(p, z) < z.r) p.heal(this, p.S.hp * 0.015);
    } else if (z.kind === 'efire' || z.kind === 'gas') {
      for (const p of this.players) if (!p.dead && AH.dist(p, z) < z.r) p.hurt(this, z.dps * 0.4, null, z.kind === 'gas');
    } else if (z.kind === 'smoke') {
      for (const e of this.enemies) if (!e.dead && AH.dist(e, z) < z.r) e.slowT = 1;
    }
  }
  this.zones = this.zones.filter(z => z.t > 0);
};
GP.explosion = function (x, y, r, dmg, side, telegraphed, owner) {
  AH.Audio.sfx('boom'); this.shake(4);
  this.fx.push({ k: 'boom', x, y, r, life: 0.3, max: 0.3, em: 1 });
  this.flashLights.push({ x, y, r: r * 2.5, i: 1, tint: [1.2, 0.8, 0.5], life: 0.25 });
  if (side === 'enemy') { for (const p of this.players) if (!p.dead && AH.dist(p, { x, y }) < r + 4) p.hurt(this, dmg, null); }
  else for (const e of this.enemies) if (!e.dead && !e.hidden && AH.dist(e, { x, y }) < r + e.r) { const d = e.hurt(this, dmg, owner, { knock: 80, color: '#ffb347' }); }
};
GP.telegraph = function (x, y, r, t, cb) { this.fx.push({ k: 'tele', x, y, r, life: t, max: t, cb }); AH.Audio.sfx('warn'); };
GP.nova = function (p, x, y, r, dmg, kind) {
  AH.Audio.sfx(kind === 'frost' ? 'frost' : 'holy');
  this.fx.push({ k: 'ring', x, y: y - 6, col: kind === 'frost' ? '#9ef0ff' : '#fff2b0', r0: 4, r1: r, life: 0.35, max: 0.35, em: 1 });
  for (const e of this.enemies) if (!e.dead && !e.hidden && AH.dist(e, { x, y }) < r + e.r) {
    const roll = { dmg, crit: false };
    let d = dmg * (kind === 'holy' && e.undead ? 2 : 1);
    e.hurt(this, d, p, { freeze: kind === 'frost' ? 100 : 0, color: kind === 'frost' ? '#9ef0ff' : '#fff2b0', knock: kind === 'holy' ? 60 : 0 });
  }
};
GP.chainLightning = function (p, first, dmg, jumps) {
  let cur = first, prev = { x: p.x, y: p.y - 10 }; const hit = new Set();
  AH.Audio.sfx('zap');
  for (let j = 0; j <= jumps && cur; j++) {
    AH.fx.bolt(this, prev.x, prev.y, cur.x, cur.y - 6);
    this.flashLights.push({ x: cur.x, y: cur.y, r: 40, i: 0.8, tint: [0.9, 0.9, 1.3], life: 0.15 });
    cur.hurt(this, dmg, p, { color: '#ffe04a' }); hit.add(cur.id);
    prev = { x: cur.x, y: cur.y - 6 };
    let best = null, bd = 80;
    for (const e of this.enemies) { if (e.dead || e.hidden || hit.has(e.id)) continue; const d = AH.dist(e, cur); if (d < bd) { bd = d; best = e; } }
    cur = best; dmg *= 0.85;
  }
};
GP.nearestEnemy = function (p, maxD) {
  let best = null, bd = maxD || 200;
  for (const e of this.enemies) { if (e.dead || e.hidden) continue; const d = AH.dist(e, p); if (d < bd) { bd = d; best = e; } }
  return best;
};
GP.castSkill = function (p, id, rm) {
  const sp = b => p.spellPower(b) * rm;
  switch (id) {
    case 'smite': this.nova(p, p.x, p.y, 44, (p.rollDamage(1.4, { noCrit: true }).dmg + sp(4)) * 0.8, 'holy'); this.flashLights.push({ x: p.x, y: p.y, r: 90, i: 1, tint: [1.1, 1.05, 0.8], life: 0.3 }); break;
    case 'aegis': p.buffs.aegis = 6; AH.Audio.sfx('holy'); AH.fx.ring(this, p.x, p.y - 8, '#9ec0ff', 20); break;
    case 'consecrate': this.addZone({ kind: 'holy', x: p.x, y: p.y, r: 40, t: 5, dps: sp(6) + p.rollDamage(0.5, { noCrit: true }).dmg, owner: p }); AH.Audio.sfx('holy'); break;
    case 'shadowstep': {
      const e = this.nearestEnemy(p, 120);
      if (!e) { p.skillCd[id] = 0.5; this.toast(p, 'NO TARGET', '#a39bb0'); p.mp += p.manaCost(AH.SKILLS[id].mp); return; }
      const nx = e.x - e.face * 12, ny = e.y;
      AH.fx.puff(this, p.x, p.y - 8, '#4a3e5e');
      if (!this.map.blocked(nx, ny, 4)) { p.x = nx; p.y = ny; } else { p.x = e.x; p.y = e.y + 8; }
      p.face = e.x > p.x ? 1 : -1; p.aim = Math.atan2(e.y - p.y, e.x - p.x);
      p.nextCrit = true; p.inv = 0.4; AH.Audio.sfx('dodge'); AH.fx.puff(this, p.x, p.y - 8, '#4a3e5e');
      break;
    }
    case 'knives':
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; const roll = p.rollDamage(0.55 * rm); this.projs.push({ k: 'knife', x: p.x, y: p.y - 9, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, a, owner: p, roll, dmg: roll.dmg, life: 0.5, pierce: 1, hit: new Set(), col: '#dfe6f0', r: 3 }); }
      AH.Audio.sfx('swing'); break;
    case 'smoke': this.addZone({ kind: 'smoke', x: p.x, y: p.y, r: 46, t: 4 }); p.buffs.smoke = 3; for (const e of this.enemies) if (AH.dist(e, p) < 120) e.aggro = false; AH.Audio.sfx('dodge'); break;
    case 'firebolt': {
      const t = this.nearestEnemy(p, 160);
      const a = p.aim;
      this.projs.push({ k: 'fire', x: p.x + Math.cos(a) * 6, y: p.y - 10, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, a, owner: p, dmg: sp(9), life: 1.4, hit: new Set(), col: '#ffb347', r: 4, light: true, homing: !!t, target: t });
      AH.Audio.sfx('magic'); break;
    }
    case 'frostnova': this.nova(p, p.x, p.y, 54, sp(5), 'frost'); break;
    case 'chain': { const e = this.nearestEnemy(p, 130); if (!e) { p.skillCd[id] = 0.3; p.mp += p.manaCost(AH.SKILLS[id].mp); return; } this.chainLightning(p, e, sp(8), 4); break; }
    case 'whirl': p.whirl = 1.2; p.whirlTick = 0; AH.Audio.sfx('heavy'); break;
    case 'mend': p.heal(this, p.S.hp * 0.35 * rm); AH.Audio.sfx('holy'); AH.fx.ring(this, p.x, p.y - 8, '#8ae08e', 22); break;
    case 'spiritwolf': this.summonAlly(p, 20 * rm); break;
  }
};
GP.summonAlly = function (p, t) {
  this.allies.push({ kind: 'wolf', owner: p, x: p.x + 10, y: p.y, t, atk: 0, face: 1, spr: AH.recolor(AH.SPR.wolf, { d: '#9ad8f8', D: '#5a9ac8', l: '#e8f8ff', k: '#ffffff' }) });
  AH.Audio.sfx('magic');
};

// ---------- loot ----------
GP.dropItem = function (x, y, item, owner) {
  const a = Math.random() * Math.PI * 2;
  this.drops.push({ id: AH.uid(), x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 18 - 10, z: 0, vz: 50, item, owner: owner === undefined ? -1 : owner, t: 0 });
  if (item.rarity >= 3 && owner !== undefined) { AH.Audio.sfx('legend'); }
};
GP.dropGold = function (x, y, n, owner) {
  this.drops.push({ id: AH.uid(), x, y, vx: AH.rand.range(-25, 25), vy: AH.rand.range(-20, 10), z: 0, vz: 40, gold: Math.max(1, Math.round(n)), owner, t: 0 });
};
GP.rollLoot = function (x, y, src, p) {
  const f = this.floorNo, rng = AH.rand, mf = p.S.mf + (p.buffs.luck > 0 ? 100 : 0);
  const legendary = src && (src.legend || src.boss || src.nemesis);
  const elite = src && src.elite;
  let goldN = (1 + f * 0.45) * (1 + p.S.gold / 100) * rng.range(0.6, 1.4);
  if (rng() < (legendary ? 1 : elite ? 0.9 : 0.45)) this.dropGold(x, y, goldN * (legendary ? 12 : elite ? 4 : 1), p.pid);
  const early = f <= 10;
  let itemChance = legendary ? 1 : elite ? (early ? 0.4 : 0.65) : (early ? 0.05 : 0.09);
  if (src && src.minion) itemChance *= 0.3;
  const n = legendary ? (early ? 2 : 3) : elite ? 1 + (rng() < 0.3 ? 1 : 0) : 1;
  for (let k = 0; k < n; k++) if (rng() < itemChance) {
    const it = AH.genItem(rng, f, { mf: mf + (elite ? 60 : 0) + (legendary ? 150 : 0), rarity: legendary && k === 0 ? (f < 10 ? 2 : 3) : undefined });
    this.dropItem(x, y, it, p.pid);
  }
  if (legendary && src.legend && src.legend.drop) this.dropItem(x, y, f >= 10 ? AH.genMythic(rng, f, src.legend) : AH.genItem(rng, f, { rarity: 2 }), p.pid);
  const r = rng();
  if (r < 0.035) this.dropItem(x, y, AH.makeCons('potion'), p.pid);
  else if (r < 0.08) this.dropItem(x, y, AH.makeCons(p.ch.cls === 'wizard' ? 'mana' : 'torch'), p.pid);
  else if (r < 0.095) this.dropItem(x, y, AH.makeCons('murky'), p.pid);
  else if (r < 0.105 + (elite ? 0.1 : 0)) this.dropItem(x, y, AH.genRune(rng, f), p.pid);
  else if (r < 0.11 + (legendary ? 0.5 : 0)) { const sk = rng.pick(Object.keys(AH.SKILLS)); this.dropItem(x, y, AH.makeTome(sk), p.pid); }
};
GP.updateDrops = function (dt) {
  for (const d of this.drops) {
    d.t += dt;
    if (d.vz || d.z > 0) { d.z += d.vz * dt; d.vz -= 220 * dt; if (d.z <= 0) { d.z = 0; d.vz = d.vz < -20 ? -d.vz * 0.35 : 0; } }
    if (d.vx || d.vy) { this.moveEntity(d, d.vx * dt, d.vy * dt, 2); d.vx *= 0.9; d.vy *= 0.9; if (Math.abs(d.vx) + Math.abs(d.vy) < 2) d.vx = d.vy = 0; }
    if (d.t < 0.4) continue;
    for (const p of this.players) {
      if (p.dead || p.remote && !this.isHost) continue;
      if (d.owner >= 0 && d.owner !== p.pid) continue;
      const dist = AH.dist(p, d);
      // something you threw away stays on the ground until you walk off and come back for it
      if (d.dropper === p.pid) { if (dist > 22) d.dropper = undefined; else continue; }
      // gold magnet
      if (d.gold && dist < 26) { d.x = AH.lerp(d.x, p.x, dt * 8); d.y = AH.lerp(d.y, p.y, dt * 8); }
      if (dist < 9) this.pickup(p, d);
    }
  }
  this.drops = this.drops.filter(d => !d.taken);
};
GP.pickup = function (p, d) {
  if (d.taken) return;
  if (d.gold) {
    d.taken = true; p.ch.gold += d.gold; AH.Audio.sfx('coin');
    AH.fx.num(this, p.x, p.y - 26, '+' + d.gold + 'G', '#f2c94c');
    if (p.S.powers.has('goldheal')) p.heal(this, 2 + d.gold * 0.1);
    this.netEvent && this.netEvent('gold', p, d.gold);
    return;
  }
  if (p.remote) { d.taken = true; this.netGive(p, d.item); return; }
  const it = d.item;
  if (!p.addItem(it)) { if (!d.fullMsg) { this.toast(p, 'BAG IS FULL', '#ff8a8a'); d.fullMsg = true; } return; }
  d.taken = true;
  AH.Audio.sfx(it.rarity >= 3 ? 'legend' : it.rarity >= 1 ? 'loot' : it.kind === 'cons' && AH.ORE_COLORS[it.cons] || it.cons === 'gem' ? 'ore' : 'pickup');
  const name = it.unid ? 'UNKNOWN ' + it.typeName : it.name + (it.stack > 1 ? ' X' + it.stack : '');
  this.toast(p, name, AH.RARITY[it.rarity || 0].col);
  if (this.bountyEvent) this.bountyEvent('item', it, p);
};
GP.spawnBomb = function (p) {
  this.projs.push({ k: 'bomb', x: p.x, y: p.y - 4, vx: Math.cos(p.aim) * 60, vy: Math.sin(p.aim) * 60, owner: p, dmg: 30 + this.floorNo * 6, life: 1.2, hit: new Set(), col: '#2a2430', r: 2, bomb: true });
};
