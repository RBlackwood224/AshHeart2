'use strict';
// Menus (drawn at 480x270): title, slots, hero creation, pause, inventory, character, passives, skills, shops, bounties, stash, mine select
const UW = AH.UW, UH = AH.UH;
AH.UI = {};
const U = AH.UI;

GG.openMenu = function (type, p, data) {
  const m = Object.assign({ type, p, dev: p ? p.device : (data && data.dev) || null, sel: 0, t: 0 }, data || {});
  if (U.init[type]) U.init[type](this, m);
  if (this.menu) this.menus.push(this.menu);
  this.menu = m;
  AH.Audio.sfx('select');
};
GG.closeMenu = function () { this.menu = this.menus.pop() || null; AH.Audio.sfx('back'); };
GG.closeAllMenus = function () { this.menu = null; this.menus = []; };

U.init = {};
U.update = {};
U.draw = {};

// ---------- shared drawing ----------
U.bg = function (ctx, dim) {
  ctx.fillStyle = dim === false ? '#0a080d' : 'rgba(6,4,10,0.86)'; ctx.fillRect(0, 0, UW, UH);
};
U.title = function (ctx, s, y, col) { AH.text(ctx, UW / 2, y, s, col || '#ffb347', { align: 'center', scale: 2 }); };
U.list = function (ctx, items, sel, x, y, w, opt) {
  opt = opt || {};
  const lh = opt.lh || 16;
  U._lastList = { x, y: y - 4, w, lh, n: items.length, menu: AH.game && AH.game.menu };
  items.forEach((it, i) => {
    const yy = y + i * lh;
    const on = i === sel;
    const dis = it.disabled;
    if (on) AH.frame(ctx, x, yy - 4, w, lh - 1, { fill: '#2e2638', edge: '#c9a24a', hi: '#f2e3b3' });
    AH.text(ctx, x + 8, yy, it.label, dis ? '#4e4858' : on ? '#ffb347' : (it.col || '#cfc6b4'));
    if (it.right) AH.text(ctx, x + w - 8, yy, it.right, dis ? '#4e4858' : (it.rcol || '#8d8494'), { align: 'right' });
  });
};
U.hint = function (ctx, s) {
  // segments look like "BTN LABEL" separated by 3 spaces; translate only the label part
  const t = s.split('   ').map(seg => { if (AH.I18N && AH.LANG !== 'en' && AH.I18N[AH.LANG][seg]) return AH.tr(seg); const i = seg.indexOf(' '); return i < 0 ? seg : seg.slice(0, i) + ' ' + AH.tr(seg.slice(i + 1)); }).join('   ');
  AH.text(ctx, UW / 2, UH - 11, t, '#6a6274', { align: 'center' });
};
U.btnName = function (G, m, b) {
  // name the buttons of whatever the player is actually using right now
  const d = (m && m.dev) || (AH.Input.lastDevice && AH.Input.lastDevice()) || '';
  const kb1 = { a: 'ENTER', b: 'ESC', x: 'K', y: '1', lb: '2', rb: '3', start: 'ESC', select: 'TAB' };
  const kb2 = { a: 'NUM1', b: 'NUM2', x: 'NUM4', y: 'NUM5', lb: 'NUM7', rb: 'NUM8', start: 'NUMENTER', select: 'NUM+' };
  if (d === 'kb1') return kb1[b]; if (d === 'kb2') return kb2[b];
  return { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', start: 'START', select: 'SELECT' }[b];
};
U.nav = function (G, m, dt) {
  const I = AH.Input;
  const ids = m.dev ? [m.dev] : I.devices();
  let dir = { dx: 0, dy: 0 }, pressed = {};
  for (const id of ids) {
    const d = I.menuDir(id, dt); if (d.dx || d.dy) dir = d;
    let any = false;
    for (const b of AH.BTN) if (I.pressed(id, b)) { pressed[b] = true; any = true; }
    if (!m.dev && (d.dx || d.dy || any)) m.lastDev = id;
  }
  if (m.netInput) { const ni = m.netInput; m.netInput = null; if (ni.dx || ni.dy) dir = ni; Object.assign(pressed, ni.p || {}); }
  return { dx: dir.dx, dy: dir.dy, p: pressed };
};
// mouse over menu lists: hover selects, click picks, right click goes back
U.mouseList = function (G, m) {
  const M = AH.Mouse; if (!M || !M.active || AH.isTouch) return null;
  const L = U._lastList; const c = M.uiPos(); if (!c) return null;
  let hit = -1;
  if (L && L.menu === m && c.x >= L.x && c.x < L.x + L.w && c.y >= L.y && c.y < L.y + L.n * L.lh) hit = Math.floor((c.y - L.y) / L.lh);
  if (hit >= 0 && (M.moved || M.leftPressed)) m.sel = hit;
  M.moved = false;
  const res = { pick: M.leftPressed && hit >= 0, back: M.rightPressed };
  M.leftPressed = false; M.rightPressed = false;
  return res;
};
U.listUpdate = function (G, m, dt, items, onPick, onBack) {
  const n = U.nav(G, m, dt);
  const ms = U.mouseList(G, m);
  if (ms && ms.pick) n.p.a = true;
  if (ms && ms.back) n.p.b = true;
  if (n.dy) { m.sel = (m.sel + n.dy + items.length) % items.length; AH.Audio.sfx('move'); }
  if (n.p.a) { const it = items[m.sel]; if (it && !it.disabled) onPick(it, m.sel); else AH.Audio.sfx('error'); }
  if (n.p.b || n.p.start) { if (onBack) onBack(); }
  return n;
};
U.itemPanel = function (G, ctx, it, x, y, w, h, cls, compareWith) {
  AH.frame(ctx, x, y, w, h, it ? { fill: '#120e10', edge: AH.RARITY[it.rarity || 0].border, hi: AH.RARITY[it.rarity || 0].col } : {});
  if (!it) { AH.text(ctx, x + w / 2, y + h / 2 - 3, 'EMPTY', '#4e4858', { align: 'center' }); return; }
  const ic = AH.itemIcon(it);
  AH.drawSpr(ctx, ic, x + w - ic.w * 2 - 6, y + 6, false, 2);
  let yy = y + 6;
  const lines = AH.itemLines(it, cls);
  for (let i = 0; i < lines.length; i++) {
    const wrapW = i === 0 ? w - 40 : w - 12;
    for (const ln of AH.wrap(lines[i].t, wrapW)) { if (yy > y + h - 30) break; AH.text(ctx, x + 6, yy, ln, lines[i].c); yy += 9; }
    if (i === 1) yy += 3;
  }
  if (compareWith !== undefined && (it.kind === 'weapon' || it.kind === 'armor')) {
    yy = Math.max(yy + 4, y + h - 28);
    AH.rect(ctx, x + 6, yy - 3, w - 12, 1, '#3a3242');
    if (!compareWith) AH.text(ctx, x + 6, yy, 'NOTHING EQUIPPED', '#6f6880');
    else {
      AH.text(ctx, x + 6, yy, AH.tr('WORN: ' + compareWith.name).slice(0, 21), AH.RARITY[compareWith.rarity].col);
      let d = 0, lab = '';
      if (it.dmg && compareWith.dmg) { d = Math.round((it.dmg[0] + it.dmg[1]) / 2 - (compareWith.dmg[0] + compareWith.dmg[1]) / 2); lab = ' DAMAGE'; }
      else if (it.armor !== undefined) { d = (it.armor || 0) - (compareWith.armor || 0); lab = ' ARMOR'; }
      if (lab) AH.text(ctx, x + 6, yy + 10, (d >= 0 ? '+' : '') + d + lab, d > 0 ? '#8ae08e' : d < 0 ? '#ff8a8a' : '#a39bb0');
    }
  }
};

// ---------- TITLE ----------
U.init.title = function (G, m) { m.sel = 0; m.embers = []; };
U.titleItems = function () {
  const slots = AH.Save.load();
  return [
    { id: 'play', label: slots.length ? 'PLAY' : 'NEW HERO' },
    { id: 'online', label: 'ONLINE CO-OP' },
    { id: 'options', label: 'OPTIONS' },
    { id: 'help', label: 'HOW TO PLAY' },
  ];
};
U.update.title = function (G, m, dt) {
  m.t += dt; AH.TitleArt.update(dt, m.t + 3);
  if (m.fromSplash > 0) m.fromSplash -= dt;
  const items = U.titleItems();
  U.listUpdate(G, m, dt, items, it => {
    m.dev = null;
    const dev = m.lastDev || 'kb1';
    if (it.id === 'play') { if (AH.Save.load().length) G.openMenu('slots', null, { dev, purpose: 'start' }); else G.openMenu('create', null, { dev, purpose: 'start' }); }
    if (it.id === 'online') G.openMenu('online', null, { dev });
    if (it.id === 'options') G.openMenu('options', null, { dev });
    if (it.id === 'help') G.openMenu('help', null, { dev });
  });
};
U.draw.title = function (G, ctx, m) {
  const TA = AH.TitleArt;
  TA.drawScene(ctx, m.t + 3, 0.42);
  TA.drawLogo(ctx, TA.logoSmall, UW / 2, 16, m.t + 3);
  TA.ornament(ctx, UW / 2, 16 + TA.logoSmall.H + 2, 'THE MINES OF DUNMERE');
  const items = U.titleItems();
  AH.frame(ctx, UW / 2 - 84, 140, 168, items.length * 16 + 14, { fill: 'rgba(14,8,12,0.86)', edge: '#7a3020', hi: '#c8602a' });
  U.list(ctx, items, m.sel, UW / 2 - 76, 148, 152);
  AH.text(ctx, 4, UH - 10, 'V' + AH.VERSION, '#6a5a62');
  if (m.fromSplash > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, m.fromSplash / 0.6) + ')'; ctx.fillRect(0, 0, UW, UH); }
};

// ---------- SLOTS ----------
U.init.slots = function (G, m) { m.sel = 0; m.sub = null; };
U.slotItems = function (m) {
  const slots = AH.Save.load();
  const items = slots.map((s, i) => {
    const ch = s.ch;
    const taken = m.exclude && m.exclude.indexOf(i) >= 0;
    return { id: 'slot', i, label: ch.name + (ch.dead ? ' (FALLEN)' : '') + (ch.hardcore ? ' *' : ''), right: AH.CLASSES[ch.cls].name + ' LV' + ch.level + ' F' + ch.deepest, col: ch.dead ? '#6a3a3a' : AH.CLASSES[ch.cls].color, disabled: taken || ch.dead && m.purpose !== 'start' };
  });
  if (slots.length < AH.Save.MAX) items.push({ id: 'new', label: '+ NEW HERO', col: '#ffb347' });
  items.push({ id: 'import', label: 'IMPORT HERO FILE', col: '#8d8494' });
  return items;
};
U.update.slots = function (G, m, dt) {
  if (m.sub) {
    const subs = m.sub.items;
    U.listUpdate(G, m.sub, dt, subs, it => {
      const i = m.sub.slot; m.sub = null;
      if (it.id === 'play') U.pickSlot(G, m, i);
      if (it.id === 'export') AH.Save.exportSlot(i);
      if (it.id === 'delete') { G.openMenu('confirm', null, { dev: m.dev, text: 'DELETE THIS HERO FOREVER?', yes: () => { AH.Save.remove(i); } }); }
    }, () => { m.sub = null; AH.Audio.sfx('back'); });
    return;
  }
  const items = U.slotItems(m);
  U.listUpdate(G, m, dt, items, it => {
    if (it.id === 'new') G.openMenu('create', null, { dev: m.dev, purpose: m.purpose, onDone: m.onDone });
    else if (it.id === 'import') AH.Save.importFile((ok, msg) => { if (!ok) G.toast(null, msg, '#ff8a8a'); else AH.Audio.sfx('loot'); });
    else if (m.purpose === 'start') {
      const ch = AH.Save.load()[it.i].ch;
      m.sub = { slot: it.i, sel: 0, dev: m.dev, items: ch.dead ? [{ id: 'export', label: 'EXPORT' }, { id: 'delete', label: 'DELETE' }] : [{ id: 'play', label: 'PLAY' }, { id: 'export', label: 'EXPORT FILE' }, { id: 'delete', label: 'DELETE' }] };
    } else U.pickSlot(G, m, it.i);
  }, () => G.closeMenu());
};
U.pickSlot = function (G, m, i) {
  if (m.onDone) { G.closeAllMenus(); m.onDone(i); return; }
  G.closeAllMenus(); G.startSession(i, m.dev);
};
U.draw.slots = function (G, ctx, m) {
  U.bg(ctx, m.purpose === 'start' ? false : true);
  U.title(ctx, m.purpose === 'join' ? 'JOIN THE GAME' : 'CHOOSE YOUR HERO', 20);
  const items = U.slotItems(m);
  U.list(ctx, items, m.sel, 90, 56, 300, { lh: 18 });
  if (m.sub) { AH.frame(ctx, 330, 56 + m.sel * 18 - 6, 120, m.sub.items.length * 16 + 10); U.list(ctx, m.sub.items, m.sub.sel, 334, 56 + m.sel * 18, 112); }
  U.hint(ctx, U.btnName(G, m, 'a') + ' SELECT   ' + U.btnName(G, m, 'b') + ' BACK   * = PERMADEATH');
};

// ---------- CONFIRM ----------
// the rope out of the mine: climb one floor up (to reach a grave) or all the way to town
U.ropeItems = function (G, m) {
  const it = [];
  if (G.mode !== 'time' && G.floorNo > 1) it.push({ id: 'up', label: 'CLIMB UP ONE FLOOR', right: 'FLOOR ' + (G.floorNo - 1) });
  it.push({ id: 'town', label: G.mode === 'time' ? 'GIVE UP THE SPRINT' : 'RETURN TO DUNMERE' });
  it.push({ id: 'stay', label: 'STAY' });
  return it;
};
U.update.rope = function (G, m, dt) {
  U.listUpdate(G, m, dt, U.ropeItems(G, m), it => {
    G.closeMenu();
    if (it.id === 'up') { AH.Audio.sfx('stairs'); G.enterMine(G.floorNo - 1, G.mode); }
    if (it.id === 'town') { AH.Audio.sfx('stairs'); G.leaveMine('rope'); }
  }, () => G.closeMenu());
};
U.draw.rope = function (G, ctx, m) {
  const items = U.ropeItems(G, m);
  AH.frame(ctx, 130, 90, 220, 26 + items.length * 16, { fill: '#15121b', edge: '#c9a24a', hi: '#f2e3b3' });
  AH.text(ctx, UW / 2, 98, 'THE ROPE', '#f2e3b3', { align: 'center' });
  U.list(ctx, items, m.sel, 140, 116, 200);
};
U.update.confirm = function (G, m, dt) {
  const items = [{ label: 'YES' }, { label: 'NO' }];
  U.listUpdate(G, m, dt, items, (it, i) => { G.closeMenu(); if (i === 0 && m.yes) m.yes(); }, () => G.closeMenu());
};
U.draw.confirm = function (G, ctx, m) {
  AH.frame(ctx, 140, 100, 200, 70, { fill: '#15121b', edge: '#c9a24a', hi: '#f2e3b3' });
  AH.text(ctx, UW / 2, 110, m.text, '#f2e3b3', { align: 'center' });
  U.list(ctx, [{ label: 'YES' }, { label: 'NO' }], m.sel, 190, 130, 100);
};

// ---------- CREATE HERO ----------
U.NAMES = ['ALDRIC', 'SERA', 'RENN', 'MIRA', 'BRAN', 'ODA', 'KAEL', 'IVY', 'TOVA', 'GARR', 'ELKA', 'DUNN', 'VEX', 'NELL', 'ROWAN', 'ISLA'];
U.init.create = function (G, m) {
  m.step = 0; m.cls = 0; m.name = AH.rand.pick(U.NAMES); m.pet = 1; m.hc = 0; m.gridSel = 0; m.sel = 0;
  m.keyHandler = e => {
    if (G.menu !== m || m.step !== 1) return;
    if (document.activeElement && document.activeElement.id === 'nameInput') return;
    // typing on a keyboard: letters type, arrows + space use the grid, Enter confirms, Esc goes back
    m.kbTyping = true;
    if (U.NAME_CHAR.test(e.key) && m.name.length < 10) { if (!e.repeat) { m.name += e.key.toUpperCase(); AH.Audio.sfx('move'); } }
    else if (e.key === 'Backspace') { m.name = m.name.slice(0, -1); }
    else if (e.key === 'Enter') { if (m.name.length) { m.step = 2; m.sel = 0; AH.Audio.sfx('select'); m.skipA = true; } }
    else if (e.key === 'Escape') { m.step = 0; m.skipB = true; AH.Audio.sfx('back'); }
    else if (e.key.startsWith('Arrow')) {
      const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -10, ArrowDown: 10 }[e.key];
      m.gridSel = Math.abs(d) === 1 ? (m.gridSel + d + U.GRID.length) % U.GRID.length : AH.clamp(m.gridSel + d, 0, U.GRID.length - 1); AH.Audio.sfx('move');
    } else if (e.key === ' ') {
      const k = U.GRID[m.gridSel];
      if (k === 'DEL') m.name = m.name.slice(0, -1); else if (k === 'OK') { if (m.name.length) { m.step = 2; m.sel = 0; m.skipA = true; } } else if (m.name.length < 10) m.name += k;
      AH.Audio.sfx('select');
    }
    e.preventDefault();
  };
  window.addEventListener('keydown', m.keyHandler);
};
U.GRID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ÁÉÍÓÖŐÚÜŰ'.split('').concat(['DEL', 'OK']);
U.NAME_CHAR = /^[a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰàâçèêëîïôùûÀÂÇÈÊËÎÏÔÙÛ]$/;
// phones: a real text box so the native keyboard can be used
U.nameInput = function (G, m, show) {
  let el = document.getElementById('nameInput');
  if (!show) { if (el) { el.blur(); el.remove(); } return; }
  if (el) return;
  el = document.createElement('input');
  el.id = 'nameInput'; el.type = 'text'; el.maxLength = 10; el.value = m.name; el.autocomplete = 'off'; el.spellcheck = false;
  el.setAttribute('autocapitalize', 'characters');
  el.style.cssText = 'position:fixed;left:50%;top:46%;transform:translateX(-50%);width:60vw;max-width:340px;font:bold 22px monospace;text-align:center;text-transform:uppercase;background:#16101c;color:#ffb347;border:2px solid #c9a24a;padding:8px;z-index:50;outline:none;border-radius:0;';
  el.placeholder = AH.tr('NAME YOUR HERO');
  el.addEventListener('input', () => { const v = el.value.toUpperCase().split('').filter(c => U.NAME_CHAR.test(c)).join('').slice(0, 10); if (v !== el.value) el.value = v; m.name = v; });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (m.name.length) { m.step = 2; m.sel = 0; m.skipA = true; U.nameInput(G, m, false); } } });
  document.body.appendChild(el);
  // touching the stick or the buttons closes the phone keyboard instead of typing into it
  if (!U.nameBlurHooked) { U.nameBlurHooked = true; const t = document.getElementById('touch'); if (t) t.addEventListener('touchstart', () => { const e2 = document.getElementById('nameInput'); if (e2) e2.blur(); }, { passive: true }); }
};
U.update.create = function (G, m, dt) {
  const n = U.nav(G, m, dt);
  const clsKeys = ['paladin', 'rogue', 'wizard'], pets = ['canary', 'dog', 'rat'];
  if (m.skipA) { m.skipA = false; n.p.a = false; }
  if (m.skipB) { m.skipB = false; n.p.b = false; n.p.start = false; }
  if (m.step !== 1 || G.menu !== m) U.nameInput(G, m, false);
  if (m.step === 0) {
    if (n.dx) { m.cls = (m.cls + n.dx + 3) % 3; AH.Audio.sfx('move'); }
    if (n.p.a) { m.step = 1; AH.Audio.sfx('select'); }
    if (n.p.b || n.p.start) { window.removeEventListener('keydown', m.keyHandler); G.closeMenu(); }
  } else if (m.step === 1) {
    if (AH.isTouch) {
      // phones: the in-game letter grid; tap a letter or steer with the stick and press A
      const tp = AH.Mouse && AH.Mouse.tap; if (AH.Mouse) AH.Mouse.tap = null;
      if (tp) U.GRID.forEach((k, i) => {
        const cx = 102 + (i % 10) * 28, cy = 156 + Math.floor(i / 10) * 18;
        if (tp.x >= cx - 9 && tp.x < cx + (k.length > 1 ? 30 : 19) && tp.y >= cy - 6 && tp.y < cy + 12) { m.gridSel = i; n.p.a = true; }
      });
      if (n.p.start && m.name.length) { m.step = 2; m.sel = 0; AH.Audio.sfx('select'); return; }
    }
    // keyboard players type directly (handled in keyHandler); only gamepads and touch use the grid here
    if (m.kbTyping || (m.dev && m.dev.startsWith('kb')) || (m.lastDev && m.lastDev.startsWith('kb'))) return;
    const cols = 10;
    if (n.dx) { m.gridSel = (m.gridSel + n.dx + U.GRID.length) % U.GRID.length; AH.Audio.sfx('move'); }
    if (n.dy) { m.gridSel = AH.clamp(m.gridSel + n.dy * cols, 0, U.GRID.length - 1); AH.Audio.sfx('move'); }
    if (n.p.a) {
      const k = U.GRID[m.gridSel];
      if (k === 'DEL') m.name = m.name.slice(0, -1);
      else if (k === 'OK') { if (m.name.length) { m.step = 2; m.sel = 0; } }
      else if (m.name.length < 10) m.name += k;
      AH.Audio.sfx('select');
    }
    if (n.p.x) m.name = m.name.slice(0, -1);
    if (n.p.y) m.name = AH.rand.pick(U.NAMES);
    if (n.p.start && m.name.length) { m.step = 2; m.sel = 0; }
    if (n.p.b) { m.step = 0; AH.Audio.sfx('back'); }
  } else {
    const rows = 3;
    if (n.dy) { m.sel = (m.sel + n.dy + rows) % rows; AH.Audio.sfx('move'); }
    if (m.sel === 0 && n.dx) { m.pet = (m.pet + n.dx + 3) % 3; AH.Audio.sfx('move'); }
    if (m.sel === 1 && (n.dx || n.p.a)) { m.hc = 1 - m.hc; AH.Audio.sfx('move'); }
    else if (m.sel === 2 && n.p.a) {
      const ch = AH.newCharacter(clsKeys[m.cls], m.name || 'HERO', pets[m.pet], m.hc);
      const slots = AH.Save.load();
      if (slots.length >= AH.Save.MAX) { G.toast(null, 'ALL SLOTS ARE FULL', '#ff8a8a'); return; }
      slots.push({ ch, world: AH.Save.newWorld() }); AH.Save.store(slots);
      window.removeEventListener('keydown', m.keyHandler);
      const idx = slots.length - 1;
      if (m.onDone) { G.closeAllMenus(); m.onDone(idx); }
      else { G.closeAllMenus(); G.startSession(idx, m.dev); }
      return;
    }
    if (n.p.b || n.p.start) { m.step = 1; m.kbTyping = false; AH.Audio.sfx('back'); }
  }
};
U.draw.create = function (G, ctx, m) {
  U.bg(ctx, false);
  const clsKeys = ['paladin', 'rogue', 'wizard'];
  U.title(ctx, ['CHOOSE A CLASS', 'NAME YOUR HERO', 'COMPANION'][m.step], 14);
  if (!U.previews) U.previews = clsKeys.map(k => { const ch = AH.newCharacter(k, 'X', 'dog'); return new AH.Player(0, ch, null); });
  clsKeys.forEach((k, i) => {
    const x = 40 + i * 140, y = 44, on = i === m.cls;
    AH.frame(ctx, x, y, 120, 150, on ? { fill: '#211a28', edge: '#c9a24a', hi: '#f2e3b3' } : {});
    const p = U.previews[i];
    const s = p.spr[Math.floor(G.time * 3) % 2 * (on ? 1 : 0)];
    AH.drawSpr(ctx, s, x + 60 - s.w * 2, y + 10, false, 4);
    AH.text(ctx, x + 60, y + 104, AH.CLASSES[k].name, on ? AH.CLASSES[k].color : '#8d8494', { align: 'center' });
    AH.wrap(AH.CLASSES[k].desc, 108).forEach((l, j) => AH.text(ctx, x + 60, y + 116 + j * 9, l, '#6f6880', { align: 'center' }));
  });
  if (m.step >= 1) {
    AH.frame(ctx, 90, 120, 300, 140, { fill: '#120e14', edge: '#c9a24a', hi: '#f2e3b3' });
    if (m.step === 1) {
      AH.text(ctx, UW / 2, 128, m.name + (Math.floor(G.time * 2) % 2 ? '_' : ' '), '#ffb347', { align: 'center', scale: 2 });
      U.GRID.forEach((k, i) => {
        const cx = 102 + (i % 10) * 28, cy = 156 + Math.floor(i / 10) * 18;
        if (i === m.gridSel) AH.frame(ctx, cx - 4, cy - 4, k.length > 1 ? 30 : 18, 15, { fill: '#2e2638', edge: '#c9a24a', hi: '#f2e3b3' });
        AH.text(ctx, cx, cy, k, i === m.gridSel ? '#ffb347' : '#cfc6b4');
      });
      const kb = m.kbTyping || (m.dev && m.dev.startsWith('kb')) || (m.lastDev && m.lastDev.startsWith('kb'));
      if (AH.isTouch) AH.text(ctx, UW / 2, 244, 'TAP LETTERS   X: DELETE   Y: RANDOM   II: DONE', '#6a6274', { align: 'center' });
      else AH.text(ctx, UW / 2, 244, kb ? 'TYPE A NAME   ENTER: DONE   ESC: BACK' : 'PICK LETTERS   ' + U.btnName(G, m, 'y') + ' RANDOM', '#6a6274', { align: 'center' });
    } else {
      const pets = ['canary', 'dog', 'rat'];
      const rows = [{ label: 'COMPANION', right: '< ' + AH.PETS[pets[m.pet]].name + ' >' }, { label: 'PERMADEATH', right: m.hc ? 'ON - ONE LIFE ONLY' : 'OFF', rcol: m.hc ? '#ff6a5a' : '#8d8494' }, { label: 'BEGIN THE DESCENT', col: '#ffb347' }];
      U.list(ctx, rows, m.sel, 100, 132, 280, { lh: 17 });
      const s = AH.SPR[AH.PETS[pets[m.pet]].spr];
      AH.drawSpr(ctx, s, UW / 2 - s.w * 1.5, 200, false, 3);
      AH.wrap(AH.PETS[pets[m.pet]].desc, 270).forEach((l, j) => AH.text(ctx, UW / 2, 230 + j * 9, l, '#a39bb0', { align: 'center' }));
    }
  }
  if (!(m.step === 1 && (m.kbTyping || (m.dev && m.dev.startsWith('kb')) || (m.lastDev && m.lastDev.startsWith('kb'))))) U.hint(ctx, U.btnName(G, m, 'a') + ' CONFIRM   ' + U.btnName(G, m, 'b') + ' BACK');
};

// ---------- OPTIONS / HELP ----------
U.update.options = function (G, m, dt) {
  const o = AH.options;
  const n = U.nav(G, m, dt);
  const rows = 6;
  const ms = U.mouseList(G, m);
  if (ms && ms.pick) { if (m.sel === 1 || m.sel === 2) n.dx = (m.sel === 1 ? o.music : o.sfx) >= 1 ? -10 : 1; else n.p.a = true; }
  if (ms && ms.back) n.p.b = true;
  if (n.dy) { m.sel = (m.sel + n.dy + rows) % rows; AH.Audio.sfx('move'); }
  if (m.sel === 0 && (n.dx || n.p.a)) {
    const ids = AH.LANGS.map(l => l.id); const i = ids.indexOf(o.lang || 'en');
    o.lang = ids[(i + (n.dx || 1) + ids.length) % ids.length]; AH.setLang(o.lang); if (G.townMap) AH.renderTown(G.townMap); AH.Save.setOptions(o); AH.Audio.sfx('move');
  }
  if (m.sel === 1 && n.dx) o.music = AH.clamp(Math.round((o.music + n.dx * 0.1) * 10) / 10, 0, 1);
  if (m.sel === 2 && n.dx) o.sfx = AH.clamp(Math.round((o.sfx + n.dx * 0.1) * 10) / 10, 0, 1);
  if (m.sel === 3 && (n.dx || n.p.a)) o.shake = !o.shake;
  if (m.sel === 4 && n.p.a) AH.toggleFullscreen();
  if (m.sel === 5 && n.p.a || n.p.b || n.p.start) { AH.Save.setOptions(o); G.closeMenu(); }
  AH.Audio.setVol(o.music, o.sfx);
};
U.draw.options = function (G, ctx, m) {
  U.bg(ctx); U.title(ctx, 'OPTIONS', 30);
  const o = AH.options, bar = v => '#'.repeat(Math.round(v * 10)) + '-'.repeat(10 - Math.round(v * 10)) + ' ' + Math.round(v * 100) + '%';
  const ln = (AH.LANGS.find(l => l.id === (o.lang || 'en')) || AH.LANGS[0]).name;
  U.list(ctx, [{ label: 'LANGUAGE', right: '< ' + ln + ' >' }, { label: 'MUSIC', right: bar(o.music) }, { label: 'SOUND', right: bar(o.sfx) }, { label: 'SCREEN SHAKE', right: o.shake ? 'ON' : 'OFF' }, { label: 'FULLSCREEN' }, { label: 'BACK' }], m.sel, 120, 70, 240, { lh: 18 });
};
U.update.help = function (G, m, dt) { const n = U.nav(G, m, dt); if (n.p.a || n.p.b || n.p.start) G.closeMenu(); };
U.draw.help = function (G, ctx, m) {
  U.bg(ctx); U.title(ctx, 'HOW TO PLAY', 12);
  const L = [
    ['MOVE', 'STICK / WASD'], ['ATTACK / USE', 'A / J / LEFT CLICK'], ['HEAVY ATTACK', 'X / K / RIGHT CLICK'], ['DODGE ROLL', 'B / SPACE'],
    ['SKILLS', 'Y  LB  RB  /  1  2  3'], ['POTIONS', 'D-PAD UP & DOWN / Q & E'], ['INVENTORY', 'SELECT / TAB'], ['MENU', 'START / ESC'], ['MOUSE (PC)', 'LEFT: MOVE / ATTACK  RIGHT: HEAVY'], ['SHIFT + LEFT CLICK', 'ATTACK IN PLACE'],
  ];
  L.forEach(([a, b], i) => { AH.text(ctx, 60, 36 + i * 12, a, '#ffb347'); AH.text(ctx, 190, 36 + i * 12, b, '#cfc6b4'); });
  const tips = ['DIVE INTO THE MINE BELOW DUNMERE. EVERY 10TH FLOOR HIDES A BOSS. FLOOR 100 HIDES ASHHEART.', 'FROM FLOOR 6 IT IS DARK: KEEP TORCHES. LIFTS EVERY 5 FLOORS TAKE YOU BACK DOWN.', 'DYING PUTS OUT A LAMP OF DUNMERE AND MAY BIRTH A NEMESIS. KEEP THE TOWN HOPEFUL.', 'WHEN YOU DIE, YOUR GEAR STAYS IN YOUR GRAVE. GO BACK FOR IT. THE TOWN STASH IS ALWAYS SAFE.', 'NO FIGHTING IN DUNMERE. HIT THE GLITTERING ROCKS IN THE MINE FOR ORE AND CRYSTALS.', 'CO-OP: PRESS START ON ANOTHER PAD TO JOIN. STAY CLOSE FOR ONE SCREEN, WANDER OFF TO SPLIT.'];
  let y = 158; for (const t of tips) { for (const l of AH.wrap(t, 440)) { AH.text(ctx, UW / 2, y, l, '#a39bb0', { align: 'center' }); y += 9; } y += 2; }
};

// ---------- PAUSE ----------
U.pauseItems = function (G, m) {
  const it = [{ id: 'resume', label: 'RESUME' }, { id: 'inv', label: 'INVENTORY' }, { id: 'char', label: 'CHARACTER' }, { id: 'pass', label: 'PASSIVE TREE' }, { id: 'skills', label: 'SKILLS' }, { id: 'options', label: 'OPTIONS' }];
  if (m.p && m.p.pid > 0 && !m.p.remote && !G.net) it.push({ id: 'leave', label: 'LEAVE GAME' });
  if (!G.net || G.isHost) it.push({ id: 'quit', label: 'SAVE AND QUIT' });
  else it.push({ id: 'quit', label: 'DISCONNECT' });
  return it;
};
U.update.pause = function (G, m, dt) {
  U.listUpdate(G, m, dt, U.pauseItems(G, m), it => {
    if (it.id === 'resume') G.closeMenu();
    if (it.id === 'inv') { G.closeMenu(); G.openMenu('inv', m.p, { tab: 0 }); }
    if (it.id === 'char') { G.closeMenu(); G.openMenu('inv', m.p, { tab: 1 }); }
    if (it.id === 'pass') { G.closeMenu(); G.openMenu('inv', m.p, { tab: 2 }); }
    if (it.id === 'skills') { G.closeMenu(); G.openMenu('inv', m.p, { tab: 3 }); }
    if (it.id === 'options') G.openMenu('options', m.p);
    if (it.id === 'leave') { G.closeAllMenus(); G.removePlayer(m.p); }
    if (it.id === 'quit') { G.closeAllMenus(); G.quitToTitle(); }
  }, () => G.closeMenu());
};
U.draw.pause = function (G, ctx, m) {
  U.bg(ctx); U.title(ctx, 'PAUSED', 40);
  AH.text(ctx, UW / 2, 64, m.p ? m.p.ch.name + ' - ' + AH.CLASSES[m.p.ch.cls].name + ' LV ' + m.p.ch.level : '', '#8d8494', { align: 'center' });
  U.list(ctx, U.pauseItems(G, m), m.sel, 170, 88, 140);
};

// ---------- INVENTORY (tabs) ----------
U.TABS = ['INVENTORY', 'CHARACTER', 'PASSIVES', 'SKILLS', 'BESTIARY', 'SETS'];
U.EQ_POS = { head: [10, 46], amulet: [10, 72], chest: [10, 98], cloak: [10, 124], hands: [10, 150], weapon: [124, 46], off: [124, 72], ring1: [124, 98], ring2: [124, 124], feet: [124, 150] };
U.EQ_ORDER_L = ['head', 'amulet', 'chest', 'cloak', 'hands'], U.EQ_ORDER_R = ['weapon', 'off', 'ring1', 'ring2', 'feet'];
U.init.inv = function (G, m) {
  m.tab = m.tab || 0; m.area = 'bag'; m.i = 0; m.eq = 'weapon'; m.pnode = { paladin: 'p0', rogue: 'r0', wizard: 'm0' }[m.p.ch.cls]; m.ssel = 0; m.csel = 0; m.socket = null; m.bsel = 0;
};
U.invItem = function (m) { const ch = m.p.ch; return m.area === 'bag' ? ch.bag[m.i] : ch.equip[m.eq]; };
// mouse in the character screens: tabs, bag and gear slots, stats, passive nodes, skills, lists
U.invMouse = function (G, m, n) {
  const M = AH.Mouse; if (!M || !M.active || AH.isTouch || (AH.Mouse.player && AH.Mouse.player(G) !== m.p)) return false;
  const c = M.uiPos(); if (!c) return false;
  const click = M.leftPressed, rclick = M.rightPressed, mv = M.moved || click;
  // drag the passive tree around with the left button held
  if (m.tab === 2 && M.left && m.pcam) {
    if (m.dragFrom) { const dx = c.x - m.dragFrom.x, dy = c.y - m.dragFrom.y; if (Math.abs(dx) + Math.abs(dy) > 0) { m.pcam.x -= dx; m.pcam.y -= dy; m.pfree = true; if (Math.abs(dx) + Math.abs(dy) > 1) m.dragged = true; } }
    m.dragFrom = { x: c.x, y: c.y };
  } else { m.dragFrom = null; if (!M.left) m.wasDrag = m.dragged, m.dragged = false; }
  M.leftPressed = M.rightPressed = false; M.moved = false;
  const inR = (x, y, w, h) => c.x >= x && c.x < x + w && c.y >= y && c.y < y + h;
  if (rclick) { n.p.b = true; return false; }
  if (click && U._tabRects) { const t = U._tabRects.findIndex(r => inR(r.x, r.y, r.w, r.h)); if (t >= 0) { if (t !== m.tab) { m.tab = t; m.socket = null; AH.Audio.sfx('move'); } return true; } }
  if (!mv) return false;
  const ch = m.p.ch;
  if (m.tab === 0) {
    for (let i = 0; i < 40; i++) { const x = 162 + (i % 8) * 24, y = 36 + Math.floor(i / 8) * 24; if (inR(x, y, 22, 22)) { m.area = 'bag'; m.i = i; if (click) n.p.a = true; return false; } }
    for (const slot of AH.EQUIP_SLOTS) { const [sx, sy] = U.EQ_POS[slot]; if (inR(sx, sy + 2, 22, 22)) { m.area = 'eq'; m.eq = slot; if (click) n.p.a = true; return false; } }
  } else if (m.tab === 1) {
    for (let i = 0; i < 4; i++) if (inR(162, 36 + i * 26, 152, 24)) { m.csel = i; if (click) n.p.a = true; }
  } else if (m.tab === 2) {
    if (!inR(U.PT.x, U.PT.y, U.PT.w, U.PT.h) || !m.pcam) return false;
    const ox = U.PT.x + U.PT.w / 2 - m.pcam.x, oy = U.PT.y + U.PT.h / 2 - m.pcam.y;
    let best = null, bd = 1e9;
    for (const id in AH.PASSIVES) { const q = AH.PASSIVES[id], d = Math.hypot(q.x + ox - c.x, q.y + oy - c.y), r = q.t === 'key' ? 9 : q.t === 'notable' || q.t === 'heart' ? 8 : 6; if (d < r && d < bd) { bd = d; best = id; } }
    if (best) { if (best !== m.pnode) AH.Audio.sfx('move'); m.pnode = best; m.pfree = true; if (click) n.p.a = true; }
  } else if (m.tab === 3) {
    const known = Object.keys(ch.skills);
    known.forEach((id, i) => { if (inR(8, 26 + i * 28, 292, 28)) m.ssel = i; });
    if (click) for (let i = 0; i < 3; i++) if (inR(310, 40 + i * 30, 164, 28)) n.p[['y', 'x', 'a'][i]] = true;
  } else if (m.tab === 4 || m.tab === 5) {
    const all = m.tab === 4 ? Object.values(AH.CREATURES).reduce((a, b) => a.concat(b), []) : AH.SETS;
    const cur = m.tab === 4 ? m.bsel : (m.setSel || 0), start = AH.clamp(cur - 10, 0, all.length - 22);
    for (let i = 0; i < 22 && start + i < all.length; i++) if (inR(8, 39 + i * 10, 236, 10) && click) { if (m.tab === 4) m.bsel = start + i; else m.setSel = start + i; AH.Audio.sfx('move'); }
  }
  return false;
};
U.update.inv = function (G, m, dt) {
  const n = U.nav(G, m, dt), p = m.p, ch = p.ch;
  if (U.invMouse(G, m, n)) return;
  if (n.p.lb) { m.tab = (m.tab + U.TABS.length - 1) % U.TABS.length; AH.Audio.sfx('move'); m.socket = null; return; }
  if (n.p.rb) { m.tab = (m.tab + 1) % U.TABS.length; AH.Audio.sfx('move'); m.socket = null; return; }
  if (n.p.b || n.p.select || n.p.start) { if (m.socket) { m.socket = null; AH.Audio.sfx('back'); return; } G.closeMenu(); G.saveAll(); return; }
  if (m.tab === 0) {
    if (n.dx || n.dy) {
      AH.Audio.sfx('move');
      if (m.area === 'bag') {
        const col = m.i % 8, row = Math.floor(m.i / 8);
        if (n.dx < 0 && col === 0) { m.area = 'eq'; m.eq = U.EQ_ORDER_R[Math.min(4, row)]; }
        else if (n.dx) m.i = row * 8 + AH.clamp(col + n.dx, 0, 7);
        if (n.dy) m.i = AH.clamp(row + n.dy, 0, 4) * 8 + col;
      } else {
        const L = U.EQ_ORDER_L.indexOf(m.eq), Rr = U.EQ_ORDER_R.indexOf(m.eq);
        if (n.dy) { if (L >= 0) m.eq = U.EQ_ORDER_L[AH.clamp(L + n.dy, 0, 4)]; else m.eq = U.EQ_ORDER_R[AH.clamp(Rr + n.dy, 0, 4)]; }
        if (n.dx > 0) { if (L >= 0) m.eq = U.EQ_ORDER_R[L]; else { m.area = 'bag'; m.i = Rr * 8; } }
        if (n.dx < 0 && Rr >= 0) m.eq = U.EQ_ORDER_L[Rr];
      }
    }
    const it = U.invItem(m);
    if (n.p.a) {
      if (m.socket) {
        // insert rune into selected gear
        if (it && it.sockets && it.runes.length < it.sockets) {
          const r = ch.bag[m.socket.from];
          it.runes.push(r.rune); r.stack--; if (r.stack <= 0) ch.bag[m.socket.from] = null;
          m.socket = null; p.recalc(); AH.Audio.sfx('magic');
          const rw = AH.runewordOf(it);
          G.toast(p, rw ? 'RUNEWORD AWAKENS: ' + rw.name : 'RUNE SOCKETED', rw ? '#6fbf73' : '#9ec0ff');
          if (rw) AH.Audio.sfx('legend');
          G.onLocalEquip && G.onLocalEquip(p);
        } else AH.Audio.sfx('error');
        return;
      }
      if (!it) return;
      if (m.area === 'eq') p.unequip(G, m.eq);
      else if (it.kind === 'rune') { m.socket = { from: m.i }; G.toast(p, 'CHOOSE GEAR WITH A FREE SOCKET', '#9ec0ff'); }
      else p.useItem(G, m.i);
    }
    if (n.p.x && it && m.area === 'bag') {
      // drop
      if (G.scene === 'mine' || G.scene === 'town') { ch.bag[m.i] = null; G.dropItem(p.x, p.y, it, p.pid); AH.Audio.sfx('back'); }
    }
    if (n.p.y && m.area === 'bag') { U.sortBag(ch); AH.Audio.sfx('select'); }
  } else if (m.tab === 1) {
    const stats = ['str', 'dex', 'int', 'vit'];
    if (n.dy) { m.csel = (m.csel + n.dy + 4) % 4; AH.Audio.sfx('move'); }
    if (n.p.a) { if (ch.pts > 0) { ch.pts--; ch.base[stats[m.csel]]++; p.recalc(); AH.Audio.sfx('select'); G.onLocalEquip && G.onLocalEquip(p); } else AH.Audio.sfx('error'); }
  } else if (m.tab === 2) {
    if (n.dx || n.dy) {
      const cur = AH.PASSIVES[m.pnode]; let best = null, bd = 1e9;
      for (const id in AH.PASSIVES) {
        if (id === m.pnode) continue; const q = AH.PASSIVES[id];
        const dx = q.x - cur.x, dy = q.y - cur.y; const d = Math.hypot(dx, dy);
        const dot = (dx * n.dx + dy * n.dy) / (d * Math.hypot(n.dx, n.dy));
        if (dot < 0.5) continue;
        const score = d * (2 - dot);
        if (score < bd) { bd = score; best = id; }
      }
      if (best) { m.pnode = best; m.pfree = false; AH.Audio.sfx('move'); }
    }
    if (n.p.a) {
      const id = m.pnode;
      if (ch.passives.indexOf(id) >= 0) { AH.Audio.sfx('error'); return; }
      const adj = AH.passiveNeighbors(id).some(x => ch.passives.indexOf(x) >= 0);
      if (!adj) { G.toast(p, 'MUST CONNECT TO YOUR TREE', '#ff8a8a'); AH.Audio.sfx('error'); return; }
      if (ch.ppts <= 0) { G.toast(p, 'NO PASSIVE POINTS', '#ff8a8a'); AH.Audio.sfx('error'); return; }
      ch.ppts--; ch.passives.push(id); p.recalc(); AH.Audio.sfx('levelup');
      G.onLocalEquip && G.onLocalEquip(p);
    }
  } else if (m.tab === 3) {
    const known = Object.keys(ch.skills);
    if (n.dy) { m.ssel = (m.ssel + n.dy + known.length) % known.length; AH.Audio.sfx('move'); }
    const id = known[m.ssel];
    const assign = s => { const old = ch.slots.indexOf(id); if (old >= 0) ch.slots[old] = ch.slots[s]; ch.slots[s] = id; AH.Audio.sfx('select'); };
    if (n.p.y) assign(0); if (n.p.x) assign(1); if (n.p.a) assign(2);
  } else if (m.tab === 4) {
    const all = []; for (const b in AH.CREATURES) all.push(...AH.CREATURES[b]);
    if (n.dy) { m.bsel = AH.clamp(m.bsel + n.dy, 0, all.length - 1); AH.Audio.sfx('move'); }
  } else if (m.tab === 5) {
    if (n.dy) { m.setSel = AH.clamp((m.setSel || 0) + n.dy, 0, AH.SETS.length - 1); AH.Audio.sfx('move'); }
  }
};
U.sortBag = function (ch) {
  const items = ch.bag.filter(Boolean);
  const rank = it => ({ weapon: 0, armor: 1, rune: 2, tome: 3, cons: 4 }[it.kind] * 10 - (it.rarity || 0));
  items.sort((a, b) => rank(a) - rank(b));
  ch.bag = items.concat(new Array(40 - items.length).fill(null));
};
U.drawTabs = function (G, ctx, m) {
  let x = 4; U._tabRects = [];
  U.TABS.forEach((t, i) => {
    const w = AH.textW(t) + 12; U._tabRects.push({ x, y: 2, w, h: 14 });
    if (i === m.tab) { AH.frame(ctx, x, 2, w, 14, { fill: '#2e2638', edge: '#c9a24a', hi: '#f2e3b3' }); AH.text(ctx, x + 6, 5, t, '#ffb347'); }
    else { AH.frame(ctx, x, 2, w, 14); AH.text(ctx, x + 6, 5, t, '#8d8494'); }
    x += w + 2;
  });
  AH.text(ctx, x + 4, 5, U.btnName(G, m, 'lb') + '/' + U.btnName(G, m, 'rb'), '#4e4858');
  AH.coinIcon(ctx, UW - 50, 6); AH.text(ctx, UW - 42, 5, '' + m.p.ch.gold, '#f2c94c');
};
U.draw.inv = function (G, ctx, m) {
  U.bg(ctx);
  U.drawTabs(G, ctx, m);
  [U.drawInvTab, U.drawCharTab, U.drawPassiveTab, U.drawSkillTab, U.drawBestiary, U.drawSets][m.tab](G, ctx, m);
};
U.drawPaperdoll = function (G, ctx, m, x0, y0, interactive) {
  const p = m.p, ch = p.ch;
  AH.frame(ctx, x0, y0, 150, 160);
  AH.text(ctx, x0 + 75, y0 + 5, ch.name, '#f2e3b3', { align: 'center' });
  AH.text(ctx, x0 + 75, y0 + 14, AH.CLASSES[ch.cls].name + '  LV ' + ch.level, '#8d8494', { align: 'center' });
  const s = p.spr[0];
  AH.dither(ctx, x0 + 45, y0 + 132, 60, 6, '#2a2034', 0.6);
  AH.drawSpr(ctx, s, x0 + 75 - s.w * 2, y0 + 40, false, 4);
  for (const slot of AH.EQUIP_SLOTS) {
    const [sx, sy] = U.EQ_POS[slot]; const x = x0 + sx - 4, y = y0 + sy - 18;
    const it = ch.equip[slot];
    AH.slot(ctx, x, y, 22, it ? AH.RARITY[it.rarity].border : '#2c2634');
    if (it) AH.iconIn(ctx, AH.itemIcon(it), x, y, 22);
    else AH.text(ctx, x + 11, y + 8, AH.SLOT_LABEL[slot][0], '#2c2634', { align: 'center', shadow: null });
    if (interactive && m.area === 'eq' && m.eq === slot) AH.cursor(ctx, x, y, 22);
    if (it && it.cursed && it.identified) { ctx.fillStyle = '#e05a5a'; ctx.fillRect(x + 18, y + 2, 2, 2); }
  }
};
U.drawInvTab = function (G, ctx, m) {
  const p = m.p, ch = p.ch;
  U.drawPaperdoll(G, ctx, m, 4, 20, true);
  // stats summary
  AH.frame(ctx, 4, 184, 150, 82);
  const S = p.S, w = p.wbase(), wi = p.weapon();
  const avg = wi ? Math.round((wi.dmg[0] + wi.dmg[1]) / 2 * (1 + p.mainStat() * 0.03) * (1 + S.dmg / 100) + S.fire + S.frost) : 3;
  const rows = [['LIFE', Math.round(p.hp) + '/' + S.hp], ['MANA', Math.round(p.mp) + '/' + S.mp], ['DAMAGE', '' + avg], ['ARMOR', '' + S.armor], ['CRIT', Math.round(S.crit) + '%'], ['SPEED', (1 / p.atkTime()).toFixed(1) + '/S']];
  rows.forEach(([a, b], i) => { AH.text(ctx, 10, 190 + i * 12, a, '#6f6880'); AH.text(ctx, 148, 190 + i * 12, b, '#e9e2d0', { align: 'right' }); });
  // bag
  AH.frame(ctx, 158, 20, 200, 160);
  AH.text(ctx, 164, 25, m.socket ? 'SOCKET RUNE INTO...' : 'BACKPACK', m.socket ? '#9ec0ff' : '#f2e3b3');
  AH.text(ctx, 352, 25, ch.bag.filter(Boolean).length + '/40', '#8d8494', { align: 'right' });
  for (let i = 0; i < 40; i++) {
    const x = 162 + (i % 8) * 24, y = 36 + Math.floor(i / 8) * 24;
    const it = ch.bag[i];
    AH.slot(ctx, x, y, 22, it ? AH.RARITY[it.rarity || 0].border : '#2c2634', it ? '#17131d' : '#120f16');
    if (it) {
      AH.iconIn(ctx, AH.itemIcon(it), x, y, 22);
      if (it.stack > 1) AH.text(ctx, x + 21, y + 14, '' + it.stack, '#ffffff', { align: 'right' });
      if (it.unid) AH.text(ctx, x + 3, y + 2, '?', '#f2c94c');
      if ((it.kind === 'weapon' || it.kind === 'armor') && !p.canEquip(it)) { ctx.fillStyle = 'rgba(200,40,40,0.35)'; ctx.fillRect(x + 2, y + 2, 18, 18); }
    }
    if (m.area === 'bag' && m.i === i) AH.cursor(ctx, x, y, 22);
    if (m.socket && m.socket.from === i) AH.cursor(ctx, x, y, 22, '#9ec0ff');
  }
  // companion + hints
  AH.frame(ctx, 158, 184, 200, 82);
  const pt = G.pets.find(q => q.owner === p);
  if (pt) {
    const s = AH.SPR[AH.PETS[pt.kind].spr];
    AH.slot(ctx, 164, 190, 26, pt.active ? '#c9a24a' : '#3a3242');
    AH.drawSpr(ctx, s, 177 - s.w / 2, 203 - s.h / 2);
    AH.text(ctx, 196, 191, AH.PETS[pt.kind].name + (pt.active ? '' : ' (RESTING)'), '#f2e3b3');
    AH.wrap(AH.PETS[pt.kind].desc, 155).forEach((l, i) => AH.text(ctx, 196, 201 + i * 9, l, '#6f6880'));
  }
  const b = k => U.btnName(G, m, k);
  if (AH.Mouse && AH.Mouse.active && !AH.isTouch && (m.dev === 'kb1' || !m.dev)) {
    AH.text(ctx, 164, 228, 'CLICK: USE/EQUIP   ' + b('x') + ' DROP', '#6a6274');
    AH.text(ctx, 164, 238, b('y') + ' SORT   RIGHT CLICK / ESC: CLOSE', '#6a6274');
  } else {
    AH.text(ctx, 164, 228, b('a') + ' USE/EQUIP   ' + b('x') + ' DROP', '#6a6274');
    AH.text(ctx, 164, 238, b('y') + ' SORT   ' + b('b') + ' CLOSE', '#6a6274');
  }
  AH.text(ctx, 164, 248, 'PTS: ' + ch.pts + ' STAT  ' + ch.ppts + ' PASSIVE', ch.pts || ch.ppts ? '#f2c94c' : '#6a6274');
  // tooltip
  const it = U.invItem(m);
  const cmp = it && m.area === 'bag' && (it.kind === 'weapon' || it.kind === 'armor') ? (ch.equip[p.slotFor(it)] || null) : undefined;
  U.itemPanel(G, ctx, it, 362, 20, 114, 246, ch.cls, cmp);
};
U.drawCharTab = function (G, ctx, m) {
  const p = m.p, ch = p.ch, S = p.S;
  U.drawPaperdoll(G, ctx, m, 4, 20, false);
  AH.frame(ctx, 158, 20, 160, 246);
  AH.text(ctx, 164, 26, 'ATTRIBUTES', '#f2e3b3'); AH.text(ctx, 312, 26, ch.pts + ' PTS', ch.pts ? '#f2c94c' : '#6a6274', { align: 'right' });
  const stats = [['str', 'STRENGTH', 'MELEE DMG, HEAVY ARMOR'], ['dex', 'DEXTERITY', 'CRIT, BOWS, DAGGERS'], ['int', 'INTELLECT', 'SPELLS, MANA, STAVES'], ['vit', 'VITALITY', 'LIFE']];
  stats.forEach(([k, n, d], i) => {
    const y = 40 + i * 26, on = i === m.csel;
    if (on) AH.frame(ctx, 162, y - 4, 152, 24, { fill: '#2e2638', edge: '#c9a24a', hi: '#f2e3b3' });
    AH.text(ctx, 168, y, n, on ? '#ffb347' : '#cfc6b4');
    AH.text(ctx, 308, y, '' + Math.round(S[k]) + (ch.pts ? ' +' : ''), '#ffffff', { align: 'right' });
    AH.text(ctx, 168, y + 9, d, '#6f6880');
  });
  const rows = [['LIFE', S.hp], ['MANA', S.mp], ['ARMOR', S.armor], ['CRIT CHANCE', Math.round(S.crit) + '%'], ['ATTACK SPEED', '+' + Math.round(S.ias) + '%'], ['MOVE SPEED', '+' + Math.round(S.move) + '%'], ['BLOCK', Math.round(S.block) + '%'], ['MAGIC FIND', '+' + Math.round(S.mf) + '%'], ['GOLD FIND', '+' + Math.round(S.gold) + '%'], ['XP', ch.xp + '/' + AH.xpNeed(ch.level)]];
  rows.forEach(([a, b], i) => { AH.text(ctx, 168, 152 + i * 11, a, '#6f6880'); AH.text(ctx, 308, 152 + i * 11, '' + b, '#e9e2d0', { align: 'right' }); });
  AH.frame(ctx, 322, 20, 154, 246);
  AH.text(ctx, 328, 26, 'POWERS', '#f2e3b3');
  let y = 40;
  const pw = [...S.powers].map(id => AH.LEGEND_POWERS.find(x => x.id === id) || (AH.SET_POWERS[id] ? { lab: AH.SET_POWERS[id] } : null)).filter(Boolean);
  for (const x of pw) for (const l of AH.wrap(x.lab, 140)) { AH.text(ctx, 328, y, l, '#ffb347'); y += 9; }
  for (const rw of S.runewords) { AH.text(ctx, 328, y, 'RUNEWORD: ' + rw, '#6fbf73'); y += 9; }
  for (const k of S.keys) { const n = Object.values(AH.PASSIVES).find(q => q.fx.key === k); if (n) { AH.text(ctx, 328, y, n.name, '#f2c94c'); y += 9; } }
  if (y === 40) { AH.text(ctx, 328, y, 'NONE YET', '#4e4858'); y += 9; }
  y += 8;
  const rec = [['KILLS', ch.kills], ['DEATHS', ch.deaths], ['DEEPEST', ch.deepest], ['LIFTS', ch.lifts.length], ['DAY', G.world ? G.world.day : 1]];
  rec.forEach(([a, b]) => { AH.text(ctx, 328, y, a, '#6f6880'); AH.text(ctx, 470, y, '' + b, '#e9e2d0', { align: 'right' }); y += 11; });
  if (ch.hardcore) AH.text(ctx, 328, y + 6, 'PERMADEATH HERO', '#ff6a5a');
  U.hint(ctx, U.btnName(G, m, 'a') + ' SPEND POINT');
};
// the tree is bigger than the screen: a camera follows the selected point (or the mouse drag)
U.PT = { x: 0, y: 18, w: 340, h: 252 };
U.passiveCam = function (m) {
  const q = AH.PASSIVES[m.pnode];
  if (!m.pcam) m.pcam = { x: q.x, y: q.y };
  if (!m.pfree) { m.pcam.x += (q.x - m.pcam.x) * 0.2; m.pcam.y += (q.y - m.pcam.y) * 0.2; }
  const B = AH.TREE_BOUNDS;
  m.pcam.x = AH.clamp(m.pcam.x, B.x0 + U.PT.w / 2 - 40, B.x1 - U.PT.w / 2 + 40); m.pcam.y = AH.clamp(m.pcam.y, B.y0 + U.PT.h / 2 - 40, B.y1 - U.PT.h / 2 + 40);
  return { ox: Math.round(U.PT.x + U.PT.w / 2 - m.pcam.x), oy: Math.round(U.PT.y + U.PT.h / 2 - m.pcam.y) };
};
U.drawPassiveTab = function (G, ctx, m) {
  const p = m.p, ch = p.ch;
  const has = id => ch.passives.indexOf(id) >= 0;
  const { ox, oy } = U.passiveCam(m);
  ctx.save(); ctx.beginPath(); ctx.rect(U.PT.x, U.PT.y, U.PT.w, U.PT.h); ctx.clip();
  ctx.fillStyle = '#0a080d'; ctx.fillRect(U.PT.x, U.PT.y, U.PT.w, U.PT.h);
  // faint backdrop rings
  ctx.fillStyle = '#120f17';
  for (let a = 0; a < Math.PI * 2; a += 0.02) for (const r of [120, 260, 380]) ctx.fillRect(Math.round(520 + ox + Math.cos(a) * r), Math.round(400 + oy + Math.sin(a) * r), 1, 1);
  for (const [a, b] of AH.PASSIVE_LINKS) {
    const A = AH.PASSIVES[a], B = AH.PASSIVES[b];
    const lit = has(a) && has(b), half = has(a) || has(b);
    const n = Math.ceil(Math.hypot(B.x - A.x, B.y - A.y));
    ctx.fillStyle = lit ? '#ffb347' : half ? '#5a4a3a' : '#2e2836';
    for (let i = 0; i <= n; i += lit ? 1 : 2) { const t = i / n; ctx.fillRect(Math.round(AH.lerp(A.x, B.x, t)) + ox, Math.round(AH.lerp(A.y, B.y, t)) + oy, 2, 2); }
  }
  for (const id in AH.PASSIVES) {
    const q = AH.PASSIVES[id], on = has(id);
    const X = q.x + ox, Y = q.y + oy;
    if (X < -20 || Y < 0 || X > U.PT.w + 20 || Y > UH + 20) continue;
    const can = !on && AH.passiveNeighbors(id).some(x => has(x));
    const edge = on ? '#fff2d0' : can ? '#c9a24a' : '#5a5062', fill = on ? (q.t === 'key' ? '#ff6a4a' : '#ffb347') : q.t === 'key' ? '#3a1a1a' : '#2a2430';
    const r = q.t === 'key' ? 8 : q.t === 'notable' ? 6 : q.t === 'heart' ? 9 : q.t === 'start' ? 5 : 3;
    for (let j = -r - 1; j <= r + 1; j++) for (let i = -r - 1; i <= r + 1; i++) {
      const d = q.t === 'notable' || q.t === 'heart' ? Math.abs(i) + Math.abs(j) : Math.max(Math.abs(i), Math.abs(j)) * (q.t === 'key' ? 0.8 : 1);
      const dd = q.t === 'key' ? Math.hypot(i, j) : d;
      if (dd > r + 1) continue;
      ctx.fillStyle = dd > r ? AH.OUT : dd > r - 1 ? edge : fill; ctx.fillRect(X + i, Y + j, 1, 1);
    }
    if (can && Math.floor(G.time * 2) % 2) { ctx.fillStyle = '#ffd36a'; ctx.fillRect(X, Y, 1, 1); }
    if (q.t === 'key' || q.t === 'notable' || q.t === 'start') AH.text(ctx, X, Y + r + 4, q.name, on ? '#ffd36a' : q.t === 'key' ? '#ff8a6a' : '#8d8494', { align: 'center' });
    if (id === m.pnode) AH.cursor(ctx, X - r - 1, Y - r - 1, r * 2 + 3);
  }
  ctx.restore();
  AH.frame(ctx, 342, 20, 134, 246);
  AH.text(ctx, 348, 26, 'POINTS', '#8d8494'); AH.text(ctx, 470, 26, '' + ch.ppts, '#ffb347', { align: 'right' });
  const q = AH.PASSIVES[m.pnode];
  let y = 42;
  AH.text(ctx, 348, y, q.name || (q.t === 'small' ? 'PASSIVE' : ''), q.t === 'key' ? '#ff8a6a' : '#f2e3b3'); y += 10;
  AH.text(ctx, 348, y, { key: 'KEYSTONE', notable: 'NOTABLE', small: 'SMALL', start: 'CLASS START', heart: 'CENTER' }[q.t], '#6f6880'); y += 13;
  if (q.desc) for (const l of AH.wrap(q.desc, 122)) { AH.text(ctx, 348, y, l, '#ffb347'); y += 9; }
  for (const l of AH.passiveLabel(q.fx)) for (const ll of AH.wrap(l, 122)) { AH.text(ctx, 348, y, ll, '#9ec0ff'); y += 9; }
  y += 5;
  AH.text(ctx, 348, y, has(m.pnode) ? 'ALLOCATED' : AH.passiveNeighbors(m.pnode).some(x => has(x)) ? (AH.Mouse && AH.Mouse.active && !AH.isTouch ? 'CLICK TO TAKE' : U.btnName(G, m, 'a') + ' TO TAKE') : 'NOT CONNECTED', has(m.pnode) ? '#8ae08e' : '#a39bb0');
  // overview map of the whole tree with the visible window
  const B = AH.TREE_BOUNDS, mx = 348, my = 186, mw = 122, mh = 62, sc = Math.min(mw / (B.x1 - B.x0), mh / (B.y1 - B.y0));
  const MX = x => Math.round(mx + mw / 2 + (x - (B.x0 + B.x1) / 2) * sc), MY = y2 => Math.round(my + mh / 2 + (y2 - (B.y0 + B.y1) / 2) * sc);
  ctx.fillStyle = '#0a080d'; ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
  for (const id in AH.PASSIVES) { const n2 = AH.PASSIVES[id]; ctx.fillStyle = has(id) ? '#ffb347' : n2.t === 'key' ? '#7a3a2a' : '#3a3442'; ctx.fillRect(MX(n2.x), MY(n2.y), 1, 1); }
  ctx.fillStyle = '#c9a24a';
  const vx0 = MX(m.pcam.x - U.PT.w / 2), vy0 = MY(m.pcam.y - U.PT.h / 2), vx1 = MX(m.pcam.x + U.PT.w / 2), vy1 = MY(m.pcam.y + U.PT.h / 2);
  ctx.fillRect(vx0, vy0, vx1 - vx0, 1); ctx.fillRect(vx0, vy1, vx1 - vx0, 1); ctx.fillRect(vx0, vy0, 1, vy1 - vy0); ctx.fillRect(vx1, vy0, 1, vy1 - vy0 + 1);
  AH.text(ctx, 348, 254, 'RESPEC: TOWN SHRINE', '#6f6880');
};
U.drawSkillTab = function (G, ctx, m) {
  const p = m.p, ch = p.ch;
  const known = Object.keys(ch.skills);
  AH.frame(ctx, 4, 20, 300, 246);
  known.forEach((id, i) => {
    const sk = AH.SKILLS[id], y = 30 + i * 28, on = i === m.ssel;
    if (on) AH.frame(ctx, 8, y - 4, 292, 28, { fill: '#2e2638', edge: '#c9a24a', hi: '#f2e3b3' });
    AH.slot(ctx, 12, y - 2, 18, '#3a3242'); AH.iconIn(ctx, AH.ICON[sk.icon], 12, y - 2, 18);
    AH.text(ctx, 36, y, sk.name + ' ' + 'I'.repeat(Math.min(5, ch.skills[id])) + (ch.skills[id] > 5 ? '+' : ''), on ? '#ffb347' : '#cfc6b4');
    AH.wrap(sk.desc, 222).slice(0, 2).forEach((l, k) => AH.text(ctx, 36, y + 9 + k * 8, l, '#6f6880'));
    const sl = ch.slots.indexOf(id);
    if (sl >= 0) AH.text(ctx, 296, y, (m.dev === 'kb1' ? ['1', '2', '3'] : m.dev === 'kb2' ? ['N5', 'N7', 'N8'] : ['Y', 'LB', 'RB'])[sl], '#8ae08e', { align: 'right' });
    AH.text(ctx, 296, y + 9, sk.mp + ' MP', '#4a7bd1', { align: 'right' });
  });
  AH.frame(ctx, 308, 20, 168, 246);
  AH.text(ctx, 314, 26, 'SKILL SLOTS', '#f2e3b3');
  const slotKeys = m.dev === 'kb1' ? ['1', '2', '3'] : m.dev === 'kb2' ? ['N5', 'N7', 'N8'] : ['Y', 'LB', 'RB'];
  slotKeys.forEach((k, i) => {
    const id = ch.slots[i]; const y = 44 + i * 30;
    AH.slot(ctx, 314, y, 22, '#5a4e66'); if (id) AH.iconIn(ctx, AH.ICON[AH.SKILLS[id].icon], 314, y, 22);
    AH.text(ctx, 342, y + 3, k, '#ffb347'); AH.text(ctx, 342, y + 12, id ? AH.SKILLS[id].name : '-', '#cfc6b4');
  });
  const b = k => U.btnName(G, m, k);
  AH.wrap(AH.Mouse && AH.Mouse.active && !AH.isTouch ? 'PICK A SKILL, THEN CLICK A SLOT.' : 'PICK A SKILL, THEN PRESS ' + b('y') + ' / ' + b('x') + ' / ' + b('a') + ' TO PUT IT IN SLOT Y / LB / RB.', 156).forEach((l, i) => AH.text(ctx, 314, 150 + i * 9, l, '#6a6274'));
  AH.wrap('FIND TOMES IN THE MINE TO LEARN NEW SKILLS AND RAISE THEIR RANK.', 156).forEach((l, i) => AH.text(ctx, 314, 190 + i * 9, l, '#6a6274'));
};
U.drawBestiary = function (G, ctx, m) {
  const ch = m.p.ch;
  const all = []; for (const b in AH.CREATURES) for (const c of AH.CREATURES[b]) all.push({ c, b });
  const seen = all.filter(x => ch.bestiary[x.c.name]).length;
  AH.frame(ctx, 4, 20, 240, 246);
  AH.text(ctx, 10, 26, 'BESTIARY ' + seen + '/' + all.length, '#f2e3b3');
  const start = AH.clamp(m.bsel - 10, 0, all.length - 22);
  for (let i = 0; i < 22 && start + i < all.length; i++) {
    const { c } = all[start + i], k = ch.bestiary[c.name] || 0, on = start + i === m.bsel;
    AH.text(ctx, 14, 40 + i * 10, k ? c.name : '???', on ? '#ffb347' : k ? '#cfc6b4' : '#4e4858');
    if (k) AH.text(ctx, 236, 40 + i * 10, '' + k, '#8d8494', { align: 'right' });
  }
  const { c, b } = all[m.bsel]; const k = ch.bestiary[c.name];
  AH.frame(ctx, 248, 20, 228, 246);
  if (k) {
    const s = AH.creatureSprite(c);
    AH.drawSpr(ctx, s, 362 - s.w * 2, 60, false, 4); AH.drawSprEm(ctx, s, 362 - s.w * 2, 60, false, 4);
    AH.text(ctx, 362, 150, c.name, '#f2e3b3', { align: 'center' });
    AH.text(ctx, 362, 162, AH.BIOMES.find(x => x.id === b).name, '#6fd6e8', { align: 'center' });
    AH.text(ctx, 362, 176, 'SLAIN: ' + k, '#8d8494', { align: 'center' });
    const beh = { chase: 'HUNTS YOU DOWN', swarm: 'ATTACKS IN SWARMS', blob: 'HOPS AND SPLITS', spit: 'ATTACKS FROM AFAR', charge: 'CHARGES AT YOU', tank: 'SLOW BUT CRUSHING', summon: 'CALLS FOR HELP', explode: 'EXPLODES!', ghost: 'PASSES THROUGH WALLS', ambush: 'WAITS HIDDEN' }[c.ai];
    AH.text(ctx, 362, 190, beh || '', '#ff9a8a', { align: 'center' });
    if (c.undead) AH.text(ctx, 362, 202, 'UNDEAD', '#fff2b0', { align: 'center' });
  } else AH.text(ctx, 362, 140, 'NOT YET MET', '#4e4858', { align: 'center' });
  const legSeen = AH.LEGENDS.filter(L => ch.bestiary[L.name]).length;
  AH.text(ctx, 362, 240, 'LEGENDS SLAIN: ' + legSeen + '/' + AH.LEGENDS.length, '#ff9a3e', { align: 'center' });
};

U.drawSets = function (G, ctx, m) {
  const ch = m.p.ch, found = ch.setsFound || {}, sel = m.setSel || 0;
  const owned = id => (found[id] || []).length;
  const done = AH.SETS.filter(s => owned(s.id) >= s.pieces.length).length;
  AH.frame(ctx, 4, 20, 240, 246);
  AH.text(ctx, 10, 26, 'SETS ' + done + '/' + AH.SETS.length, '#5ee07a');
  const start = AH.clamp(sel - 10, 0, AH.SETS.length - 22);
  for (let i = 0; i < 22 && start + i < AH.SETS.length; i++) {
    const s = AH.SETS[start + i], k = owned(s.id), on = start + i === sel;
    AH.text(ctx, 14, 40 + i * 10, k ? s.name : '???', on ? '#ffb347' : k ? '#8ae08e' : '#4e4858');
    AH.text(ctx, 236, 40 + i * 10, k + '/' + s.pieces.length, k >= s.pieces.length ? '#5ee07a' : '#6f6880', { align: 'right' });
  }
  const s = AH.SETS[sel], k = owned(s.id);
  AH.frame(ctx, 248, 20, 228, 246, { fill: '#101a12', edge: '#2e9a4a', hi: '#5ee07a' });
  AH.text(ctx, 362, 28, k ? s.name : '???', '#5ee07a', { align: 'center' });
  if (s.cls) AH.text(ctx, 362, 38, AH.CLASSES[s.cls].name, AH.CLASSES[s.cls].color, { align: 'center' });
  AH.text(ctx, 362, 48, 'FOUND FROM FLOOR ' + s.minF, '#6f6880', { align: 'center' });
  s.pieces.forEach((b, i) => {
    const has = (found[s.id] || []).indexOf(b) >= 0, x = 262 + i * 42, y = 62;
    AH.slot(ctx, x, y, 30, has ? '#2e9a4a' : '#3a3242');
    const ic = AH.ICON[(AH.WEAPONS[b] || AH.ARMORS[b]).icon];
    if (ic) { if (has) AH.iconIn(ctx, ic, x, y, 30); else { ctx.globalAlpha = 0.25; AH.iconIn(ctx, ic, x, y, 30); ctx.globalAlpha = 1; } }
  });
  let y = 104;
  AH.text(ctx, 256, y, 'BONUSES', '#cfc6b4'); y += 12;
  const worn = AH.setBonuses(Object.values(ch.equip)).cnt[s.id] || 0;
  for (const n in s.b) for (const lab of AH.fxLabel(s.b[n])) {
    for (const l of AH.wrap('(' + n + ') ' + lab, 212)) { AH.text(ctx, 256, y, l, worn >= +n ? '#8ae08e' : '#6a8a70'); y += 9; }
    y += 2;
  }
  AH.text(ctx, 362, 252, 'WORN: ' + worn + '/' + s.pieces.length, worn ? '#5ee07a' : '#4e4858', { align: 'center' });
};

// ---------- GRAVE ----------
U.update.grave = function (G, m, dt) { m.t += dt; const n = U.nav(G, m, dt); if (m.t > 0.2 && (n.p.a || n.p.b || n.p.start || (AH.Mouse && AH.Mouse.leftPressed))) G.closeMenu(); };
U.draw.grave = function (G, ctx, m) {
  const g = m.g, x = UW / 2 - 110, y = 40, w = 220, h = 190;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, UW, UH);
  AH.frame(ctx, x, y, w, h, { fill: '#1a1820', edge: '#6a6478', hi: '#a8a2b4' });
  AH.drawGrave(ctx, UW / 2 - 0, y + 30, false);
  AH.text(ctx, UW / 2, y + 38, 'HERE LIES ' + g.name, '#f2e3b3', { align: 'center', scale: 1 });
  AH.text(ctx, UW / 2, y + 50, AH.CLASSES[g.cls].name + '  LV ' + g.lvl, AH.CLASSES[g.cls].color, { align: 'center' });
  const rows = [['FLOOR', '' + g.f], ['SLAIN BY', g.by || '?'], ['DAY', '' + g.day], ['LIFE', '' + g.hp], ['DAMAGE', g.dmg], ['ARMOR', '' + g.armor], ['CRIT', g.crit + '%'], ['WEAPON', '']];
  rows.forEach(([a, b], i) => { AH.text(ctx, x + 14, y + 66 + i * 12, a, '#8d8494'); AH.text(ctx, x + w - 14, y + 66 + i * 12, b, '#e9e2d0', { align: 'right' }); });
  AH.text(ctx, x + w - 14, y + 66 + 7 * 12 + 10, AH.tr(g.wpn).slice(0, 30), '#e9e2d0', { align: 'right' });
  AH.text(ctx, UW / 2, y + h - 12, '"REST NOW. THE LAMPS STILL BURN."', '#6f6880', { align: 'center' });
};

// ---------- SHOPS ----------
U.priceMul = function (G) { const t = G.world.trust; return t < 30 ? 1.3 : t > 80 ? 0.85 : 1; };
U.ensureStock = function (G, p) {
  const W = G.world;
  if (W.stockDay === W.day && W.stock) return W.stock;
  const rng = AH.mulberry(W.seed + W.day * 13);
  const f = Math.max(1, Math.max(...G.players.map(q => q.ch.deepest)) );
  const st = [];
  for (let i = 0; i < 10; i++) { const it = AH.genItem(rng, f, { mf: 30 }); if (it.rarity >= 3) it.rarity = 2, AH.nameItem(it, rng); st.push(it); }
  W.stock = st; W.stockDay = W.day; return st;
};
U.SHOP_CONS = ['potion', 'mana', 'torch', 'bomb', 'idscroll'];
U.init.smith = function (G, m) { m.mode = 'menu'; m.sel = 0; };
U.init.store = function (G, m) { m.mode = 'menu'; m.sel = 0; };
U.init.inn = function (G, m) { m.sel = 0; };
U.init.shrine = function (G, m) { m.sel = 0; };
U.shopMenus = {
  smith: [{ id: 'buy', label: 'BUY GEAR' }, { id: 'sell', label: 'SELL' }, { id: 'junk', label: 'SELL ALL PLAIN GEAR' }, { id: 'upgrade', label: 'UPGRADE (ORE + GOLD)' }, { id: 'reforge', label: 'REFORGE MAGIC' }, { id: 'socket', label: 'ADD SOCKET (CRYSTAL)' }, { id: 'unsocket', label: 'CLEAR SOCKETS' }, { id: 'ore', label: 'HAND IN ORE (BOUNTY)' }, { id: 'leave', label: 'LEAVE' }],
  store: [{ id: 'cons', label: 'BUY SUPPLIES' }, { id: 'sell', label: 'SELL' }, { id: 'junk', label: 'SELL ALL PLAIN GEAR' }, { id: 'pet', label: 'SWAP COMPANION (60G)' }, { id: 'leave', label: 'LEAVE' }],
};
U.smithCost = function (it, kind) {
  const t = it.tier || 0;
  if (kind === 'upgrade') return { ore: 4 + t * 3, gold: 40 * (t + 1) * (t + 1) };
  if (kind === 'reforge') return { ore: 2 + t * 2, gold: 30 + t * 30 };
  if (kind === 'socket') return { gem: 1, gold: 60 + t * 40 };
  return { gold: 20 };
};
U.smithRows = function (G, m) {
  const rows = U.withQuest(G, m.type, U.shopMenus[m.type]);
  if (m.type === 'smith' && m.p && !m.p.ch.equip.weapon) return [{ id: 'lend', label: 'BORROW PLAIN GEAR', right: 'FREE', col: '#f2c94c' }].concat(rows);
  return rows;
};
U.withQuest = function (G, giver, items) { const q = U.questRow ? U.questRow(G, giver) : null; return q ? [q].concat(items) : items; };
U.update.smith = U.update.store = function (G, m, dt) {
  const p = m.p, ch = p.ch;
  if (m.mode === 'menu') {
    U.listUpdate(G, m, dt, U.smithRows(G, m), it => {
      if (it.id === 'quest') { G.openMenu('quest', p, { qf: it.qf }); return; }
      if (it.id === 'lend') { G.lendGear(p); return; }
      if (it.id === 'leave') { G.closeMenu(); G.saveAll(); return; }
      if (it.id === 'ore') { const b = (G.world.active || []).find(b => b.type === 'gather' && !b.done); if (!b) { G.toast(p, 'NO ORE BOUNTY ACTIVE', '#a39bb0'); return; } if (p.countCons('ore') < b.need) { G.toast(p, 'YOU NEED ' + b.need + ' ORE', '#ff8a8a'); return; } p.takeCons('ore', b.need); b.done = true; G.banner('BOUNTY COMPLETE', '#f2c94c', b.text); return; }
      if (it.id === 'pet') { m.mode = 'pet'; m.i = 0; return; }
      if (it.id === 'junk') {
        let gold = 0, n = 0;
        ch.bag.forEach((x, i) => { if (x && (x.kind === 'weapon' || x.kind === 'armor') && (x.rarity || 0) === 0 && !x.loaner && !x.quest) { gold += AH.itemValue(x); n++; ch.bag[i] = null; } });
        if (!n) { G.toast(p, 'NO PLAIN GEAR TO SELL', '#a39bb0'); AH.Audio.sfx('error'); return; }
        ch.gold += gold; AH.Audio.sfx('coin'); G.toast(p, 'SOLD ' + n + ' ITEMS FOR ' + gold + 'G', '#f2c94c'); G.saveAll && G.saveAll(); return;
      }
      m.mode = it.id; m.i = 0;
    }, () => { G.closeMenu(); G.saveAll(); });
    return;
  }
  const n = U.nav(G, m, dt);
  if (n.p.b) { m.mode = 'menu'; AH.Audio.sfx('back'); return; }
  const list = U.shopList(G, m);
  if (n.dy) { m.i = AH.clamp(m.i + n.dy, 0, Math.max(0, list.length - 1)); AH.Audio.sfx('move'); }
  if (!n.p.a || !list.length) return;
  const row = list[m.i];
  const mul = U.priceMul(G);
  if (m.mode === 'buy') {
    const price = Math.round(AH.itemValue(row.item) * 4 * mul);
    if (ch.gold < price) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); AH.Audio.sfx('error'); return; }
    if (p.bagFree() < 0) { G.toast(p, 'BAG IS FULL', '#ff8a8a'); return; }
    ch.gold -= price; p.addItem(row.item); G.world.stock.splice(G.world.stock.indexOf(row.item), 1); AH.Audio.sfx('coin');
  } else if (m.mode === 'cons') {
    const c = AH.CONSUMABLES[row.k]; const price = Math.round(c.price * mul);
    if (ch.gold < price) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); AH.Audio.sfx('error'); return; }
    if (!p.addItem(AH.makeCons(row.k, 1))) { G.toast(p, 'BAG IS FULL', '#ff8a8a'); return; }
    ch.gold -= price; AH.Audio.sfx('coin');
  } else if (m.mode === 'sell') {
    const v = AH.itemValue(row.item);
    ch.bag[row.idx] = null; ch.gold += v; AH.Audio.sfx('coin'); m.i = Math.max(0, Math.min(m.i, list.length - 2));
  } else if (m.mode === 'pet') {
    if (ch.gold < 60) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); return; }
    if (ch.pet === row.k) return;
    ch.gold -= 60; ch.pet = row.k; const pt = G.pets.find(q => q.owner === p); if (pt) pt.kind = row.k; AH.Audio.sfx(row.k === 'dog' ? 'bark' : row.k === 'rat' ? 'squeak' : 'chirp'); m.mode = 'menu';
  } else {
    const it = row.item, cost = U.smithCost(it, m.mode);
    if (m.mode === 'upgrade' && it.tier >= 5) { G.toast(p, 'ALREADY ASHSTONE', '#a39bb0'); return; }
    if (m.mode === 'reforge' && (it.rarity === 0 || it.rarity >= 3)) { G.toast(p, it.rarity ? 'CANNOT REFORGE LEGENDS' : 'NOTHING TO REFORGE', '#a39bb0'); return; }
    if (m.mode === 'socket' && (it.sockets >= 3 || ['weapon', 'chest', 'head', 'off'].indexOf(it.slot) < 0)) { G.toast(p, 'NO ROOM FOR A SOCKET', '#a39bb0'); return; }
    if (m.mode === 'unsocket' && !it.runes.length) return;
    if (ch.gold < cost.gold || (cost.ore && p.countCons('ore') < cost.ore) || (cost.gem && p.countCons('gem') < cost.gem)) { G.toast(p, 'NEED ' + (cost.ore ? cost.ore + ' ORE + ' : '') + (cost.gem ? cost.gem + ' CRYSTAL + ' : '') + cost.gold + 'G', '#ff8a8a'); AH.Audio.sfx('error'); return; }
    ch.gold -= cost.gold; if (cost.ore) p.takeCons('ore', cost.ore); if (cost.gem) p.takeCons('gem', cost.gem);
    const rng = AH.rand;
    if (m.mode === 'upgrade') {
      const old = AH.MATERIALS[it.tier].mult, nw = AH.MATERIALS[it.tier + 1].mult; it.tier++; const k = nw / old;
      if (it.dmg) it.dmg = [Math.round(it.dmg[0] * k), Math.round(it.dmg[1] * k)]; if (it.armor) it.armor = Math.round(it.armor * k);
      it.ilvl += 17; const keep = it.name; AH.nameItem(it, rng); if (it.rarity >= 2) it.name = keep; delete it._icon;
      G.toast(p, 'FORGED INTO ' + AH.MATERIALS[it.tier].name + '!', '#f2c94c');
    } else if (m.mode === 'reforge') {
      const fresh = AH.genItem(rng, it.ilvl, { rarity: it.rarity, base: it.base }); it.affixes = fresh.affixes; it.bargain = fresh.bargain; AH.nameItem(it, rng); G.toast(p, 'REFORGED: ' + it.name, AH.RARITY[it.rarity].col);
    } else if (m.mode === 'socket') { it.sockets++; G.toast(p, 'SOCKET ADDED', '#9ec0ff'); }
    else if (m.mode === 'unsocket') { it.runes = []; G.toast(p, 'SOCKETS CLEARED', '#a39bb0'); }
    AH.Audio.sfx('heavy'); p.recalc(); G.onLocalEquip && G.onLocalEquip(p);
  }
};
U.shopList = function (G, m) {
  const p = m.p, ch = p.ch;
  if (m.mode === 'buy') return U.ensureStock(G, p).map(item => ({ item }));
  if (m.mode === 'cons') return U.SHOP_CONS.map(k => ({ k, item: AH.makeCons(k) }));
  if (m.mode === 'sell') return ch.bag.map((item, idx) => item ? { item, idx } : null).filter(Boolean);
  if (m.mode === 'pet') return ['canary', 'dog', 'rat'].map(k => ({ k }));
  // smith work: equipped + bag gear
  const rows = [];
  for (const s of AH.EQUIP_SLOTS) if (ch.equip[s]) rows.push({ item: ch.equip[s], eq: s });
  ch.bag.forEach((item, idx) => { if (item && (item.kind === 'weapon' || item.kind === 'armor')) rows.push({ item, idx }); });
  return rows;
};
U.draw.smith = U.draw.store = function (G, ctx, m) {
  U.bg(ctx);
  const npc = m.type === 'smith' ? AH.SPR.smith : AH.SPR.herbal;
  AH.frame(ctx, 4, 4, 130, 262);
  AH.drawSpr(ctx, npc, 69 - npc.w * 2, 20, false, 4);
  AH.text(ctx, 69, 96, m.type === 'smith' ? 'DORAN THE SMITH' : 'MERA, HERBALIST', '#f2e3b3', { align: 'center' });
  const say = m.type === 'smith' ? (G.world.trust < 30 ? 'TIMES ARE HARD. PRICES TOO.' : 'BRING ORE, I MAKE MIRACLES.') : (G.world.trust < 30 ? 'I MAY LEAVE TOWN SOON...' : 'POTIONS! TORCHES! FRESH TODAY!');
  AH.wrap('"' + say + '"', 118).forEach((l, i) => AH.text(ctx, 69, 108 + i * 9, l, '#a39bb0', { align: 'center' }));
  AH.coinIcon(ctx, 12, 250); AH.text(ctx, 20, 249, '' + m.p.ch.gold, '#f2c94c');
  AH.text(ctx, 126, 249, 'ORE ' + m.p.countCons('ore') + '  GEM ' + m.p.countCons('gem'), '#8d8494', { align: 'right' });
  if (m.mode === 'menu') { U.list(ctx, U.smithRows(G, m), m.sel, 150, 30, 220); return; }
  const list = U.shopList(G, m), mul = U.priceMul(G);
  AH.frame(ctx, 138, 4, 220, 262);
  AH.text(ctx, 144, 10, { buy: 'FOR SALE', cons: 'SUPPLIES', sell: 'SELL WHAT?', pet: 'COMPANIONS', upgrade: 'UPGRADE WHICH?', reforge: 'REFORGE WHICH?', socket: 'SOCKET WHICH?', unsocket: 'CLEAR WHICH?' }[m.mode], '#f2e3b3');
  const start = AH.clamp(m.i - 9, 0, Math.max(0, list.length - 20));
  list.slice(start, start + 20).forEach((row, j) => {
    const i = start + j, y = 26 + j * 12, on = i === m.i;
    if (on) AH.rect(ctx, 142, y - 2, 212, 11, '#2e2638');
    if (m.mode === 'pet') { AH.text(ctx, 148, y, AH.PETS[row.k].name + (m.p.ch.pet === row.k ? ' (YOURS)' : ''), on ? '#ffb347' : '#cfc6b4'); return; }
    const it = row.item;
    AH.text(ctx, 148, y, (row.eq ? '* ' : '') + AH.tr(it.unid ? 'UNKNOWN ' + it.typeName : it.name).slice(0, 24), on ? '#ffb347' : AH.RARITY[it.rarity || 0].col);
    let price = '';
    if (m.mode === 'buy') price = Math.round(AH.itemValue(it) * 4 * mul) + 'G';
    else if (m.mode === 'cons') price = Math.round(AH.CONSUMABLES[row.k].price * mul) + 'G';
    else if (m.mode === 'sell') price = AH.itemValue(it) + 'G';
    else { const c = U.smithCost(it, m.mode); price = (c.ore ? c.ore + 'O ' : '') + (c.gem ? c.gem + 'C ' : '') + c.gold + 'G'; }
    AH.text(ctx, 350, y, price, '#f2c94c', { align: 'right' });
  });
  const row = list[m.i];
  if (m.mode === 'pet' && row) { const s = AH.SPR[AH.PETS[row.k].spr]; AH.frame(ctx, 362, 4, 114, 262); AH.drawSpr(ctx, s, 419 - s.w * 1.5, 40, false, 3); AH.wrap(AH.PETS[row.k].desc, 100).forEach((l, i) => AH.text(ctx, 368, 90 + i * 9, l, '#a39bb0')); }
  else U.itemPanel(G, ctx, row && row.item, 362, 4, 114, 262, m.p.ch.cls, row && row.item && (m.mode === 'buy') ? (m.p.ch.equip[m.p.slotFor(row.item)] || null) : undefined);
  U.hint(ctx, U.btnName(G, m, 'a') + ' CHOOSE   ' + U.btnName(G, m, 'b') + ' BACK');
};

U.innItems = function (G, m) { return U.withQuest(G, 'inn', [{ id: 'rest', label: 'REST UNTIL MORNING', right: 'FREE' }, { id: 'rumor', label: 'BUY A DRINK, HEAR A RUMOR', right: '2G' }, { id: 'id', label: 'IDENTIFY RINGS', right: '25G' }, { id: 'save', label: 'SAVE' }, { id: 'leave', label: 'LEAVE' }]); };
U.update.inn = function (G, m, dt) {
  const p = m.p;
  U.listUpdate(G, m, dt, U.innItems(G, m), it => {
    if (it.id === 'quest') { G.openMenu('quest', p, { qf: it.qf }); return; }
    if (it.id === 'leave') { G.closeMenu(); return; }
    if (it.id === 'rest') { if (G.net && !G.isHost) { G.toast(p, 'ONLY THE HOST CAN END THE DAY', '#a39bb0'); return; } G.newDay(); G.players.forEach(q => { q.hp = q.S.hp; q.mp = q.S.mp; }); G.closeMenu(); G.banner('DAY ' + G.world.day, '#f2c94c', { clear: 'A CLEAR MORNING', rain: 'IT IS RAINING', fog: 'FOG ROLLS IN', snow: 'SNOW IS FALLING', storm: 'A STORM IS COMING' }[G.world.weather]); G.spawnVillagers(); G.townMood(); G.saveAll(); return; }
    if (it.id === 'rumor') { if (p.ch.gold < 2) return; p.ch.gold -= 2; AH.Audio.sfx('coin'); m.rumor = AH.rand.pick(AH.RUMORS); return; }
    if (it.id === 'id') { const rs = p.ch.bag.filter(b => b && b.unid); if (!rs.length) { G.toast(p, 'NOTHING TO IDENTIFY', '#a39bb0'); return; } if (p.ch.gold < 25) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); return; } p.ch.gold -= 25; rs.forEach(r => { r.unid = 0; r.identified = 1; }); AH.Audio.sfx('magic'); m.rumor = 'IDENTIFIED: ' + rs.map(r => r.name + (r.cursed ? ' (CURSED)' : '')).join(', '); return; }
    if (it.id === 'save') { G.saveAll(); G.toast(p, 'GAME SAVED', '#8ae08e'); }
  }, () => G.closeMenu());
};
U.draw.inn = function (G, ctx, m) {
  U.bg(ctx);
  AH.frame(ctx, 4, 4, 130, 262); const s = AH.SPR.keeper; AH.drawSpr(ctx, s, 69 - s.w * 2, 20, false, 4);
  AH.text(ctx, 69, 96, 'OLD TOM, INNKEEPER', '#f2e3b3', { align: 'center' });
  AH.wrap('"' + (m.rumor || 'SIT BY THE FIRE, HERO. YOU LOOK HALF DEAD.') + '"', 118).forEach((l, i) => AH.text(ctx, 69, 110 + i * 9, l, '#a39bb0', { align: 'center' }));
  U.list(ctx, U.innItems(G, m), m.sel, 150, 30, 300);
};
U.shrineItems = function (G, m) { const lv = m.p.ch.level; return U.withQuest(G, 'shrine', [{ id: 'respec', label: 'RESET PASSIVE TREE', right: (25 * lv) + 'G' }, { id: 'cleanse', label: 'LIFT A CURSE', right: '100G' }, { id: 'bless', label: 'BLESSING FOR THE NEXT DIVE', right: '40G' }, { id: 'pray', label: 'PRAY FOR DUNMERE', right: '50G' }, { id: 'leave', label: 'LEAVE' }]); };
U.update.shrine = function (G, m, dt) {
  const p = m.p, ch = p.ch;
  U.listUpdate(G, m, dt, U.shrineItems(G, m), it => {
    if (it.id === 'quest') { G.openMenu('quest', p, { qf: it.qf }); return; }
    if (it.id === 'leave') { G.closeMenu(); return; }
    const pay = n => { if (ch.gold < n) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); AH.Audio.sfx('error'); return false; } ch.gold -= n; AH.Audio.sfx('holy'); return true; };
    if (it.id === 'respec') { if (ch.passives.length <= 1) return; if (!pay(25 * ch.level)) return; ch.ppts += ch.passives.length - 1; ch.passives = [ch.passives[0]]; p.recalc(); m.say = 'YOUR PATH IS UNWRITTEN AGAIN.'; }
    if (it.id === 'cleanse') { const s = AH.EQUIP_SLOTS.find(s => ch.equip[s] && ch.equip[s].cursed); if (!s) { m.say = 'I SEE NO CURSE UPON YOU.'; return; } if (!pay(100)) return; ch.equip[s].cursed = 0; m.say = 'THE CURSE IS LIFTED.'; }
    if (it.id === 'bless') { if (!pay(40)) return; p.buffs.fury = 240; p.buffs.luck = 240; m.say = 'GO WITH LIGHT. FOR A WHILE.'; }
    if (it.id === 'pray') { if (!pay(50)) return; G.changeTrust(3, 'THE PRIEST LIGHTS A CANDLE'); m.say = 'THE TOWN THANKS YOU.'; }
    G.onLocalEquip && G.onLocalEquip(p);
  }, () => G.closeMenu());
};
U.draw.shrine = function (G, ctx, m) {
  U.bg(ctx);
  AH.frame(ctx, 4, 4, 130, 262); const s = AH.SPR.priest; AH.drawSpr(ctx, s, 69 - s.w * 2, 20, false, 4);
  AH.text(ctx, 69, 96, 'BROTHER ALVIN', '#f2e3b3', { align: 'center' });
  AH.wrap('"' + (m.say || 'THE LAMPS KEEP THE HEART ASLEEP. DO NOT LET THEM DIE.') + '"', 118).forEach((l, i) => AH.text(ctx, 69, 110 + i * 9, l, '#a39bb0', { align: 'center' }));
  U.list(ctx, U.shrineItems(G, m), m.sel, 150, 30, 300);
};

// ---------- BOUNTY BOARD ----------
U.bountyRows = function (G) {
  const W = G.world; const rows = [];
  for (const b of W.active || []) rows.push({ b, active: true });
  for (const b of W.bounties || []) rows.push({ b, active: false });
  return rows;
};
U.update.bounty = function (G, m, dt) {
  const W = G.world, p = m.p;
  const rows = U.bountyRows(G);
  const n = U.nav(G, m, dt);
  if (n.dy && rows.length) { m.sel = (m.sel + n.dy + rows.length) % rows.length; AH.Audio.sfx('move'); }
  if (n.p.b || n.p.start) { G.closeMenu(); return; }
  if (!n.p.a || !rows.length) return;
  if (G.net && !G.isHost) { G.toast(p, 'THE HOST TAKES BOUNTIES', '#a39bb0'); return; }
  const r = rows[m.sel];
  if (r.active) {
    if (r.b.done) {
      const gold = Math.round(r.b.reward);
      for (const q of G.players) { q.ch.gold += gold; if (q.remote) G.netEvent && G.netEvent('gold', q, gold); }
      G.changeTrust(r.b.trust, 'THE TOWN IS GRATEFUL');
      if (r.b.type === 'legend' || r.b.type === 'rescue') for (const q of G.players) { const it = AH.genItem(AH.rand, Math.max(5, q.ch.deepest), { rarity: AH.rand() < 0.3 ? 3 : 2 }); if (q.remote) G.netGive(q, it); else if (!q.addItem(it)) G.dropItem(q.x, q.y, it, q.pid); }
      W.active.splice(W.active.indexOf(r.b), 1); AH.Audio.sfx('legend');
      G.toast(p, 'REWARD: ' + gold + ' GOLD EACH', '#f2c94c');
    } else { G.toast(p, 'NOT DONE YET', '#a39bb0'); }
  } else {
    if ((W.active || []).length >= 3) { G.toast(p, 'MAX 3 BOUNTIES AT ONCE', '#ff8a8a'); AH.Audio.sfx('error'); return; }
    W.active = W.active || []; W.active.push(r.b); W.bounties.splice(W.bounties.indexOf(r.b), 1); AH.Audio.sfx('select');
  }
  m.sel = Math.min(m.sel, U.bountyRows(G).length - 1);
};
U.draw.bounty = function (G, ctx, m) {
  U.bg(ctx);
  U.title(ctx, 'BOUNTY BOARD', 10);
  const rows = U.bountyRows(G);
  AH.text(ctx, 30, 34, 'ACTIVE (' + (G.world.active || []).length + '/3)', '#8d8494');
  let y = 46, idx = 0;
  const draw = (r) => {
    const on = idx === m.sel, b = r.b;
    AH.frame(ctx, 26, y - 4, 428, 26, on ? { fill: '#2a2034', edge: '#c9a24a', hi: '#f2e3b3' } : { fill: '#1a1620' });
    const icon = { hunt: 'sword', legend: 'heavy', delve: 'torch', rescue: 'holy', gather: 'ore' }[b.type];
    AH.drawSpr(ctx, AH.ICON[icon], 32, y, false);
    AH.text(ctx, 50, y, b.text, on ? '#ffb347' : '#e9e2d0');
    let st = r.active ? (b.done ? 'DONE! CLAIM IT' : b.type === 'hunt' ? b.have + '/' + b.need : 'IN PROGRESS') : 'OFFER';
    AH.text(ctx, 50, y + 10, st, r.active ? (b.done ? '#8ae08e' : '#9ec0ff') : '#6f6880');
    AH.text(ctx, 448, y, Math.round(b.reward) + 'G', '#f2c94c', { align: 'right' });
    AH.text(ctx, 448, y + 10, '+' + b.trust + ' TRUST', '#ffb347', { align: 'right' });
    y += 30; idx++;
  };
  rows.filter(r => r.active).forEach(draw);
  y += 6; AH.text(ctx, 30, y - 4, 'POSTED TODAY', '#8d8494'); y += 8;
  rows.filter(r => !r.active).forEach(draw);
  U.hint(ctx, U.btnName(G, m, 'a') + ' ACCEPT / CLAIM   ' + U.btnName(G, m, 'b') + ' BACK');
};

// ---------- STASH ----------
U.init.stash = function (G, m) { m.side = 0; m.i = 0; };
U.update.stash = function (G, m, dt) {
  const n = U.nav(G, m, dt), ch = m.p.ch, st = G.world.stash;
  if (n.p.b || n.p.start) { G.closeMenu(); G.saveAll(); return; }
  if (n.dx) { const col = m.i % 8; if ((col === 7 && n.dx > 0 && m.side === 0) || (col === 0 && n.dx < 0 && m.side === 1)) { m.side = 1 - m.side; m.i = Math.floor(m.i / 8) * 8 + (m.side ? 0 : 7); } else m.i = Math.floor(m.i / 8) * 8 + AH.clamp(col + n.dx, 0, 7); AH.Audio.sfx('move'); }
  if (n.dy) { m.i = AH.clamp(m.i + n.dy * 8, 0, 39); AH.Audio.sfx('move'); }
  if (n.p.a) {
    const from = m.side ? st : ch.bag, to = m.side ? ch.bag : st;
    const it = from[m.i]; if (!it) return;
    const j = to.indexOf(null); if (j < 0) { G.toast(m.p, 'NO ROOM', '#ff8a8a'); return; }
    to[j] = it; from[m.i] = null; AH.Audio.sfx('pickup');
  }
};
U.draw.stash = function (G, ctx, m) {
  U.bg(ctx); U.title(ctx, 'STASH', 6);
  const grids = [['BACKPACK', m.p.ch.bag, 20], ['TOWN STASH (SHARED)', G.world.stash, 250]];
  grids.forEach(([name, arr, x0], side) => {
    AH.frame(ctx, x0 - 4, 26, 202, 136);
    AH.text(ctx, x0, 31, name, '#f2e3b3');
    for (let i = 0; i < 40; i++) {
      const x = x0 + (i % 8) * 24, y = 42 + Math.floor(i / 8) * 24, it = arr[i];
      AH.slot(ctx, x, y, 22, it ? AH.RARITY[it.rarity || 0].border : '#2c2634');
      if (it) { AH.iconIn(ctx, AH.itemIcon(it), x, y, 22); if (it.stack > 1) AH.text(ctx, x + 21, y + 14, '' + it.stack, '#fff', { align: 'right' }); }
      if (m.side === side && m.i === i) AH.cursor(ctx, x, y, 22);
    }
  });
  const it = (m.side ? G.world.stash : m.p.ch.bag)[m.i];
  if (it) { const L = AH.itemLines(it, m.p.ch.cls); L.slice(0, 8).forEach((l, i) => AH.text(ctx, 20, 172 + i * 10, l.t, l.c)); }
  U.hint(ctx, U.btnName(G, m, 'a') + ' MOVE ITEM   ' + U.btnName(G, m, 'b') + ' CLOSE');
};

// ---------- MINE SELECT ----------
U.mineItems = function (G, m) {
  const p = m.p, lifts = p.ch.lifts.slice().sort((a, b) => a - b);
  const items = [{ id: 'f', f: 1, label: 'FLOOR 1', right: 'THE BEGINNING' }];
  for (const f of lifts) items.push({ id: 'f', f, label: 'LIFT TO FLOOR ' + f, right: AH.biomeOf(f).name });
  items.push({ id: 'time', label: 'TIME ATTACK', right: 'DAILY SPRINT 1-10', rcol: '#9ec0ff' });
  items.push({ id: 'endless', label: 'ENDLESS DEPTHS', right: G.world.storyDone || p.ch.storyDone ? 'NO BOTTOM' : 'BEAT FLOOR 100', disabled: !(G.world.storyDone || p.ch.storyDone), rcol: '#d890ff' });
  items.push({ id: 'back', label: 'NOT YET' });
  return items;
};
U.update.minesel = function (G, m, dt) {
  if (G.net && !G.isHost) { const n = U.nav(G, m, dt); if (n.p.a || n.p.b) G.closeMenu(); return; }
  U.listUpdate(G, m, dt, U.mineItems(G, m), it => {
    if (it.id === 'back') { G.closeMenu(); return; }
    const noTorch = G.players.filter(q => !q.remote && q.countCons('torch') === 0 && (it.f || 1) >= 6);
    G.closeAllMenus(); G.saveAll();
    if (it.id === 'f') G.enterMine(it.f, 'story');
    if (it.id === 'time') G.enterMine(1, 'time');
    if (it.id === 'endless') G.enterMine(Math.max(101, G.players[0].ch.endlessBest ? 101 : 101), 'endless');
    if (noTorch.length) G.toast(null, 'NO SPARE TORCHES! THE STORE SELLS THEM.', '#ffb347');
  }, () => G.closeMenu());
};
U.draw.minesel = function (G, ctx, m) {
  U.bg(ctx); U.title(ctx, 'THE MINE', 16);
  if (G.net && !G.isHost) { AH.text(ctx, UW / 2, 120, 'THE HOST CHOOSES WHERE TO GO', '#a39bb0', { align: 'center' }); return; }
  const items = U.mineItems(G, m);
  U.list(ctx, items, m.sel, 80, 50, 320, { lh: 16 });
  const key = new Date().toISOString().slice(0, 10), best = m.p.ch.bestTimes[key];
  AH.text(ctx, UW / 2, 236, 'TODAY\'S BEST SPRINT: ' + (best ? AH.fmtTime(best) : '--'), '#6a6274', { align: 'center' });
};

// ---------- MERCHANT (in the mine) ----------
U.init.merchant = function (G, m) { m.i = 0; };
U.update.merchant = function (G, m, dt) {
  const n = U.nav(G, m, dt), st = m.npc.stock, p = m.p;
  if (n.p.b || n.p.start) { G.closeMenu(); return; }
  if (n.dy && st.length) { m.i = AH.clamp(m.i + n.dy, 0, st.length - 1); AH.Audio.sfx('move'); }
  if (n.p.a && st[m.i]) {
    const row = st[m.i];
    if (p.ch.gold < row.price) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); AH.Audio.sfx('error'); return; }
    if (!p.addItem(row.item)) { G.toast(p, 'BAG IS FULL', '#ff8a8a'); return; }
    p.ch.gold -= row.price; st.splice(m.i, 1); m.i = Math.max(0, Math.min(m.i, st.length - 1)); AH.Audio.sfx('coin');
  }
};
U.draw.merchant = function (G, ctx, m) {
  U.bg(ctx);
  AH.frame(ctx, 4, 4, 130, 262); AH.drawSpr(ctx, m.npc.spr, 69 - m.npc.spr.w * 2, 20, false, 4);
  AH.text(ctx, 69, 96, 'THE SHADOWLESS', '#d890ff', { align: 'center' });
  AH.wrap('"RARE GOODS FOR BRAVE DIGGERS. GOLD ONLY."', 118).forEach((l, i) => AH.text(ctx, 69, 110 + i * 9, l, '#a39bb0', { align: 'center' }));
  AH.coinIcon(ctx, 12, 250); AH.text(ctx, 20, 249, '' + m.p.ch.gold, '#f2c94c');
  AH.frame(ctx, 138, 4, 220, 262);
  m.npc.stock.forEach((row, i) => { const y = 14 + i * 12; if (i === m.i) AH.rect(ctx, 142, y - 2, 212, 11, '#2e2638'); AH.text(ctx, 148, y, AH.tr(row.item.unid ? 'UNKNOWN ' + row.item.typeName : row.item.name).slice(0, 24), i === m.i ? '#ffb347' : AH.RARITY[row.item.rarity || 0].col); AH.text(ctx, 350, y, row.price + 'G', '#f2c94c', { align: 'right' }); });
  const row = m.npc.stock[m.i];
  U.itemPanel(G, ctx, row && row.item, 362, 4, 114, 262, m.p.ch.cls, row && (row.item.kind === 'weapon' || row.item.kind === 'armor') ? (m.p.ch.equip[m.p.slotFor(row.item)] || null) : undefined);
};

// ---------- END SCREENS ----------
U.update.gameover = function (G, m, dt) { m.t += dt; const n = U.nav(G, m, dt); if (m.t > 2 && (n.p.a || n.p.start)) { G.closeAllMenus(); G.quitToTitle(true); } };
U.draw.gameover = function (G, ctx, m) {
  U.bg(ctx, false);
  AH.text(ctx, UW / 2, 90, 'HERE LIES ' + (G.gameOver ? G.gameOver.name : ''), '#ff6a5a', { align: 'center', scale: 2 });
  AH.text(ctx, UW / 2, 120, 'FELL ON FLOOR ' + (G.gameOver ? G.gameOver.floor : '?') + '. THE LAMPS FLICKER.', '#a39bb0', { align: 'center' });
  if (m.t > 2) AH.text(ctx, UW / 2, 180, 'PRESS ' + U.btnName(G, m, 'a'), '#6a6274', { align: 'center' });
};
U.update.victory = function (G, m, dt) { m.t += dt; const n = U.nav(G, m, dt); if (m.t > 2 && (n.p.a || n.p.start)) { G.closeAllMenus(); G.leaveMine('rope'); } };
U.draw.victory = function (G, ctx, m) {
  U.bg(ctx, false);
  for (let i = 0; i < 60; i++) { ctx.fillStyle = i % 2 ? '#ffd36a' : '#ff8a2e'; ctx.fillRect((i * 97 + m.t * 30) % UW, (i * 53 + m.t * 50) % UH, 1, 1); }
  AH.text(ctx, UW / 2, 70, 'THE HEART IS SILENCED', '#f2c94c', { align: 'center', scale: 2 });
  ['DUNMERE WILL SEE THE MORNING.', 'BUT BELOW THE HUNDREDTH FLOOR THERE IS NO BOTTOM...', 'ENDLESS DEPTHS UNLOCKED AT THE MINE ENTRANCE.'].forEach((l, i) => AH.text(ctx, UW / 2, 110 + i * 14, l, '#cfc6b4', { align: 'center' }));
  if (m.t > 2) AH.text(ctx, UW / 2, 200, 'PRESS ' + U.btnName(G, m, 'a'), '#6a6274', { align: 'center' });
};

// ---------- dispatcher ----------
U.tick = function (G, dt) {
  const m = G.menu; if (!m) return;
  m.t = (m.t || 0) + (U.update[m.type] === U.update.title ? 0 : dt);
  const f = U.update[m.type]; if (f) f(G, m, dt);
};
U.render = function (G, ctx) {
  ctx.clearRect(0, 0, UW, UH);
  const m = G.menu;
  if (!(m && m.type === 'online' && m.step === 'code')) { const ci = document.getElementById('codeInput'); if (ci) { ci.blur(); ci.remove(); } }
  if (!m) { U.nameInput(G, null, false); return; }
  AH.tooltipEquip = m.p ? Object.values(m.p.ch.equip) : [];
  if (!(m.type === 'create' && m.step === 1)) U.nameInput(G, m, false);
  const f = U.draw[m.type]; if (f) f(G, ctx, m);
  // toasts over menus too (for system messages)
  const sys = G.toasts.filter(t => t.pid < 0 || (m.p && t.pid === m.p.pid)).slice(-2);
  sys.forEach((t, i) => AH.text(ctx, UW / 2, UH - 30 + i * 10, AH.tr(t.msg).slice(0, 70), t.col, { align: 'center' }));
};
