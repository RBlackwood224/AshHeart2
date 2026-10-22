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
  if (S.loh) p.heal(null, S.loh * S.lohMult * Math.min(1, p.atkTime() / 0.45)); // fast weapons heal less per hit
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
    if (p.S.powers.has('triple') && p.hitCount % 4 === 0) m *= 2;
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
  const col = kind === 'arrow' ? '#e9e2d0' : kind === 'wave' ? '#ffd36a' : (p.weapon() && p.weapon().rarity >= 3 ? '#ffb347' : p.ch && p.ch.cls === 'necro' ? '#8aff7a' : '#6fd6e8');
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
      if (pr.life > 0) for (const a of this.allies) {
        if (a.kind !== 'minion' || a.dead) continue;
        if (Math.abs(a.x - pr.x) < 6 && Math.abs(a.y - 6 - pr.y) < 8) { a.hurt(this, pr.dmg, pr.owner); pr.life = 0; AH.fx.spark(this, pr.x, pr.y, pr.col, 4); break; }
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
  if (side === 'enemy') { for (const p of this.players) if (!p.dead && AH.dist(p, { x, y }) < r + 4) p.hurt(this, dmg, null); for (const a of this.allies) if (a.kind === 'minion' && !a.dead && AH.dist(a, { x, y }) < r + 4) a.hurt(this, dmg, null); }
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
    case 'raise': {
      const c = this.nearestCorpse(p, 120, true);
      if (!c) { this.toast(p, 'NO CORPSE NEARBY', '#a39bb0'); return false; }
      this.raiseMinion(p, c, rm); break;
    }
    case 'curse': {
      const e = this.nearestEnemy(p, 150);
      if (!e) { this.toast(p, 'NO TARGET', '#a39bb0'); return false; }
      this.curseArea(p, e.x, e.y, 46, 0.25 * (1 + p.S.curse / 100) * rm, 7);
      break;
    }
    case 'boneburst': {
      // the corpse with the most foes around it; with none left, a servant gives itself
      let best = null, bs = -1;
      for (const c of this.corpses) { if (c.used || AH.dist(c, p) > 140) continue; let n = 0; for (const e of this.enemies) if (!e.dead && AH.dist(e, c) < 44) n++; if (n > bs) { bs = n; best = c; } }
      let mult = 1;
      if (!best) { best = this.allies.filter(a => a.kind === 'minion' && a.owner === p && !a.dead).sort((a, b) => a.t - b.t)[0]; mult = 1.5; if (best) { best.dead = true; } }
      if (!best) { this.toast(p, 'NO CORPSE NEARBY', '#a39bb0'); return false; }
      const dmg = (p.spellPower(8) * rm + Math.min(best.maxHp || 0, p.S.hp * 2) * 0.12) * mult;
      this.boneBurst(p, best.x, best.y, dmg);
      if (best.id !== undefined && this.corpses.indexOf(best) >= 0) this.useCorpse(best);
      break;
    }
  }
};

// ---------- the dead ----------
// a fallen creature: dark, lying on its side (wide ones on their backs)
AH.deadSprite = function (s) {
  if (s._dead) return s._dead;
  const wide = s.w > s.h * 1.1, c = document.createElement('canvas');
  c.width = wide ? s.w : s.h; c.height = wide ? s.h : s.w;
  const x = c.getContext('2d');
  if (wide) { x.translate(0, s.h); x.scale(1, -1); x.drawImage(s.c, 0, 0); }
  else { x.translate(s.h, 0); x.rotate(Math.PI / 2); x.drawImage(s.c, 0, 0); }
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(24,14,20,0.5)'; x.fillRect(0, 0, c.width, c.height);
  const cf = document.createElement('canvas'); cf.width = c.width; cf.height = c.height; const y = cf.getContext('2d'); y.translate(c.width, 0); y.scale(-1, 1); y.drawImage(c, 0, 0);
  Object.defineProperty(s, '_dead', { value: { c, cf, w: c.width, h: c.height }, enumerable: false });
  return s._dead;
};
// a risen servant: the same creature, bleached to bone with a green glow in its eyes
AH.raisedSprite = function (s) {
  if (s._raised) return s._raised;
  const pal = {}, em = (s.opt && s.opt.emissive) || '';
  for (const k in s.pal) {
    const h = s.pal[k]; if (typeof h !== 'string' || h[0] !== '#') { pal[k] = h; continue; }
    const n = parseInt(h.slice(1), 16), L = (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.55 + (n & 255) * 0.15) / 255;
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    pal[k] = em.indexOf(k) >= 0 ? '#8aff7a' : '#' + c(40 + L * 170) + c(52 + L * 190) + c(44 + L * 150);
  }
  const r = AH.sprite(s.grid, pal, { emissive: em });
  Object.defineProperty(s, '_raised', { value: r, enumerable: false });
  return r;
};
GP.addCorpse = function (e) {
  if (this.scene !== 'mine' || e.gone) return;
  this.corpses.push({ id: e.id, x: e.x, y: e.y, spr: e.spr, sc: Math.min(e.scale || 1, 2.5), face: e.face, t: 30, max: 30, maxHp: e.maxHp, big: e.isBig(), def: e.def });
  if (this.corpses.length > 40) this.corpses.shift();
};
GP.updateCorpses = function (dt) {
  if (!this.corpses || !this.corpses.length) return;
  for (const c of this.corpses) c.t -= dt;
  this.corpses = this.corpses.filter(c => c.t > 0 && !c.used);
};
GP.useCorpse = function (c) { c.used = true; AH.fx.dust(this, c.x, c.y, '#8a7a7a', 10); };
GP.nearestCorpse = function (p, maxD, raisable) {
  let best = null, bd = maxD;
  for (const c of this.corpses) { if (c.used || (raisable && c.big)) continue; const d = AH.dist(c, p); if (d < bd) { bd = d; best = c; } }
  return best;
};
GP.curseArea = function (p, x, y, r, amt, t, quiet) {
  if (!quiet) { AH.Audio.sfx('magic'); this.fx.push({ k: 'ring', x, y: y - 6, col: '#8aff7a', r0: 4, r1: r, life: 0.45, max: 0.45, em: 1 }); this.flashLights.push({ x, y, r: r * 1.6, i: 0.7, tint: [0.7, 1.2, 0.7], life: 0.3 }); }
  for (const e of this.enemies) if (!e.dead && !e.hidden && AH.dist(e, { x, y }) < r + e.r) {
    e.curseT = t; e.curseAmt = Math.max(e.curseAmt || 0, amt); e.curseBy = p; e.curseDot = p.spellPower(2) * 0.35 * (1 + p.S.curse / 100); e.aggro = true;
  }
};
GP.boneBurst = function (p, x, y, dmg) {
  AH.Audio.sfx('boom'); this.shake(3);
  this.fx.push({ k: 'ring', x, y: y - 4, col: '#e2dcc8', r0: 3, r1: 42, life: 0.3, max: 0.3, em: 1 });
  this.flashLights.push({ x, y, r: 70, i: 0.9, tint: [0.9, 1.2, 0.8], life: 0.25 });
  for (let k = 0; k < 18; k++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 90; this.fx.push({ k: 'px', x, y: y - 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, col: Math.random() < 0.7 ? '#e2dcc8' : '#8a2a30', life: 0.45, g: 160 }); }
  for (const e of this.enemies) if (!e.dead && !e.hidden && AH.dist(e, { x, y }) < 42 + e.r) e.hurt(this, dmg, p, { knock: 90, color: '#e2dcc8' });
};
GP.raiseMinion = function (p, c, rm) {
  const mine = this.allies.filter(a => a.kind === 'minion' && a.owner === p && !a.dead);
  if (mine.length >= p.S.maxMinions) { const old = mine.sort((a, b) => a.t - b.t)[0]; old.dead = true; AH.fx.puff(this, old.x, old.y - 6, '#8a8478'); }
  const S = p.S, army = S.keys.has('army') ? 0.75 : 1;
  const hp = Math.round(S.hp * 0.33 * (1 + S.minionHp / 100) * army * rm);
  const spr = AH.raisedSprite(c.spr), m = {
    kind: 'minion', id: AH.uid(), owner: p, x: c.x, y: c.y, t: 22, atk: 0.4, face: c.face, spr, sc: 1, r: 4, hp, maxHp: hp, buffs: {}, flash: 0, rise: 0.5,
    fly: !!(c.def && c.def.fly), def: c.def,
    hurt(G, dmg, src) {
      if (this.dead) return 0;
      const fl = Math.max(1, G.floorNo || 1), o = this.owner.S;
      let d = dmg * (1 - (o.armor * 0.5) / (o.armor * 0.5 + 40 + fl * 9)) * (1 - Math.min(50, o.res) / 100);
      d = Math.max(1, Math.round(d)); this.hp -= d; this.flash = 0.1;
      AH.fx.num(G, this.x, this.y - this.spr.h, '-' + d, '#c8b4a0');
      if (this.hp <= 0) { this.dead = true; AH.fx.burst(G, this.x, this.y - 4, this.spr, 1); AH.Audio.sfx('break'); }
      return d;
    },
  };
  this.allies.push(m); this.useCorpse(c);
  AH.Audio.sfx('magic'); AH.fx.puff(this, c.x, c.y - 4, '#8aff7a');
  this.flashLights.push({ x: c.x, y: c.y, r: 50, i: 0.8, tint: [0.7, 1.25, 0.7], life: 0.3 });
};
GP.updateMinion = function (a, dt) {
  a.t -= dt; a.atk -= dt; if (a.flash > 0) a.flash -= dt; if (a.rise > 0) { a.rise -= dt; return; }
  if (a.owner.dead || this.scene !== 'mine') a.t = Math.min(a.t, 0.01);
  if (a.t <= 0) { AH.fx.dust(this, a.x, a.y, '#8a8478', 8); return; }
  // stay near the master; fight what is near him
  const foe = AH.dist(a, a.owner) < 150 ? this.nearestEnemy(a, 110) : null;
  const spd = 78;
  if (foe) {
    const d = AH.dist(a, foe), reach = 8 + foe.r;
    if (d > reach) { const an = Math.atan2(foe.y - a.y, foe.x - a.x); this.moveEntity(a, Math.cos(an) * spd * dt, Math.sin(an) * spd * dt, 3, a.fly); a.face = Math.cos(an) > 0 ? 1 : -1; a.walk = (a.walk || 0) + dt; }
    else if (a.atk <= 0) {
      a.atk = 0.8; a.lunge = 0.12; a.face = foe.x >= a.x ? 1 : -1;
      const dealt = foe.hurt(this, a.owner.minionPower() * (0.85 + Math.random() * 0.3), a.owner, { color: '#c8f0b0', knock: 30 });
      if (dealt > 0 && a.owner.S.loh) a.owner.heal(null, a.owner.S.loh * 0.25);
      AH.Audio.sfx('hit');
    }
  } else if (AH.dist(a, a.owner) > 26) { const an = Math.atan2(a.owner.y - a.y, a.owner.x - a.x); this.moveEntity(a, Math.cos(an) * spd * 1.1 * dt, Math.sin(an) * spd * 1.1 * dt, 3, a.fly); a.face = Math.cos(an) > 0 ? 1 : -1; a.walk = (a.walk || 0) + dt; }
  if (a.lunge > 0) a.lunge -= dt;
  // left far behind: crawl back out of the dark next to the master
  if (AH.dist(a, a.owner) > 260) { a.x = a.owner.x + AH.rand.range(-12, 12); a.y = a.owner.y + 6; }
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
  else if (r < 0.08) this.dropItem(x, y, AH.makeCons(AH.isCaster(p.ch.cls) ? 'mana' : 'torch'), p.pid);
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
