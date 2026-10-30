'use strict';
// Boot, main loop, scaling, device handling, saving
(function () {
  // all game files must come from the same version: a half-updated browser cache breaks menus silently
  const parts = { util: AH.px, data: AH.usesRage, input: AH.Input && AH.Input.label, items: AH.CONS_CAP, player: AH.autoTargetOn, ui: AH.UI && AH.UI.optRows, i18n2: AH.I18N && AH.I18N.hu && AH.I18N.hu['YOUR MANA IS FULL'], rules: AH.RULES, qr: AH.QR, extras: AH.heroCode, weekly: AH.Weekly, season: AH.Season, board: AH.Board, craft: AH.GEMS, priest: AH.SKILLS && AH.SKILLS.healray, town: AH.RESIDENTS, secrets: AH.SPR && AH.SPR.sheep };
  const stale = Object.keys(parts).filter(k => !parts[k]);
  if (stale.length) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99;padding:14px;background:#7a1a12;color:#fff2b0;font:16px sans-serif;text-align:center';
    d.textContent = 'Some game files are an older version (' + stale.join(', ') + '). Press Ctrl+F5 to reload. / Néhány játékfájl régebbi verzió. Nyomj Ctrl+F5-öt! / Fichiers anciens : appuie sur Ctrl+F5.';
    document.body.appendChild(d);
  }
  AH.options = AH.Save.options();
  AH.Input.applyBinds();
  if (!AH.options.lang) { const nl = (navigator.language || 'en').slice(0, 2); AH.options.lang = nl === 'hu' || nl === 'fr' ? nl : 'en'; }
  AH.setLang(AH.options.lang);
  AH.Audio.setVol(AH.options.music, AH.options.sfx);
  const G = AH.game = new AH.Game();
  const screen = document.getElementById('screen');
  const sctx = screen.getContext('2d');
  const world = AH.makeCanvas(AH.W, AH.H, true);
  const ui = AH.makeCanvas(AH.UW, AH.UH);
  const uctx = ui.getContext('2d');
  const R = new AH.Render(world); AH.R = R;
  // smooth motion (PC): the world is drawn with 3 canvas pixels per art pixel, so the camera and the
  // moving things can step a third of an art pixel. Art pixels still map to whole screen pixels, so it stays sharp.
  AH.smoothOn = () => AH.options && (AH.options.smooth === undefined ? !AH.isTouch : !!AH.options.smooth);
  function syncSS() {
    const ss = AH.smoothOn() ? Math.min(3, AH.ssCap || 3) : 1;
    if (AH.SS === ss && world.width === AH.W * ss) return;
    AH.SS = ss; world.width = AH.W * ss; world.height = AH.H * ss;
    R.ctx.imageSmoothingEnabled = false; R.cams = {};
  }
  syncSS();
  AH.renderer = R;

  // host: forward sounds to guests
  const origSfx = AH.Audio.sfx;
  AH.Audio.sfx = function (name) {
    origSfx(name);
    if (G.net && G.isHost && G.net.conns && G.net.conns.length && G.net.sfxQ.indexOf(name) < 0 && G.net.sfxQ.length < 12) G.net.sfxQ.push(name);
  };

  AH.addLavaLights = function (m) {
    m.lavaLights = [];
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.get(i, j) === AH.TILE.LAVA && (i + j * 3) % 4 === 0) m.lavaLights.push({ x: i * AH.T + 8, y: j * AH.T + 8 });
  };
  const origEnter = GG.enterMine;
  GG.enterMine = function (f, mode) { origEnter.call(this, f, mode); AH.addLavaLights(this.map); };

  // ---------- pads ----------
  GG.padFor = function (p) {
    if (p.remote) return p.pad || AH.Net.emptyPad();
    const id = p.device;
    const I = AH.Input;
    const ax = I.axis(id);
    return { ax: ax.x, ay: ax.y, pressed: b => I.pressed(id, b), held: b => I.held(id, b) };
  };

  // ---------- saving ----------
  GG.savePlayer = function (p) {
    if (p.remote || p.slotIdx === undefined || p.slotIdx < 0) return;
    const slots = AH.Save.load(); const s = slots[p.slotIdx]; if (!s) return;
    s.ch = p.ch;
    if (p === this.players[0] && this.isHost && this.world) s.world = this.world;
    if (!this.isHost && this.world) { s.world = s.world || AH.Save.newWorld(); s.world.stash = this.world.stash; s.world.stock = this.world.stock; s.world.stockDay = this.world.stockDay; }
    AH.Save.store(slots);
  };
  GG.saveAll = function () { for (const p of this.players) this.savePlayer(p); };
  GG.quitToTitle = function (noSave) {
    if (!noSave) this.saveAll();
    if (this.net) { this.net.close(); this.net = null; }
    this.isHost = true;
    this.players = []; this.pets = []; this.map = null; this.scene = 'title'; this.slotsUsed = [];
    this.resetActors(); this.closeAllMenus(); this.townMap = null; this.world = null;
    this.openMenu('title', null);
    AH.Audio.music('title');
  };
  setInterval(() => { if (G.scene !== 'title') G.saveAll(); }, 30000);
  window.addEventListener('beforeunload', () => { if (G.scene !== 'title') G.saveAll(); });

  // Esc in fullscreen: Chrome and Edge let the game keep Esc (hold it to leave fullscreen).
  // Firefox always takes Esc to leave fullscreen, so there that press still counts as Esc for the game,
  // and the game says once that F11 fullscreen keeps Esc for the game.
  let fsByUs = false;
  AH.toggleFullscreen = function () {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      const p = (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
      const lock = () => { try { if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['Escape']).catch(() => {}); } catch (e) { /* ignore */ } };
      if (p && p.then) p.then(lock).catch(() => {}); else lock();
      try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ }
    } else { fsByUs = true; (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
  };
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) return;
    try { if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock(); } catch (e) { /* ignore */ }
    if (fsByUs) { fsByUs = false; return; }
    if (AH.isTouch || (navigator.keyboard && navigator.keyboard.lock)) return;
    const G = AH.game;
    if (G && G.menu && G.menu.type !== 'title' && G.menu.type !== 'options') AH.tapKey('Escape');
    if (G && !AH._fsHint) { AH._fsHint = true; G.toast(null, 'TIP: F11 FULLSCREEN KEEPS ESC FOR THE GAME', '#f2c94c'); }
  });

  // ---------- scaling ----------
  let view = { x: 0, y: 0, w: AH.W, h: AH.H };
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    screen.width = Math.floor(W * dpr); screen.height = Math.floor(H * dpr);
    screen.style.width = W + 'px'; screen.style.height = H + 'px';
    let s = Math.min(screen.width / AH.W, screen.height / AH.H);
    if (!AH.isTouch && s >= 2) s = Math.floor(s);
    const w = Math.floor(AH.W * s), h = Math.floor(AH.H * s);
    view = { x: Math.floor((screen.width - w) / 2), y: Math.floor((screen.height - h) / 2), w, h };
    sctx.imageSmoothingEnabled = false;
    document.getElementById('rotate').style.display = AH.isTouch && H > W ? 'flex' : 'none';
  }
  window.addEventListener('resize', resize); resize();
  AH.getView = () => view; AH.screenCanvas = screen;

  // ---------- local device handling ----------
  function deviceInUse(id) { return G.players.some(p => !p.remote && p.device === id); }
  function handleDevices() {
    const I = AH.Input;
    if (G.scene === 'title' || G.menu) return;
    for (const p of G.players) {
      if (p.remote || !p.device) continue;
      if (I.pressed(p.device, 'start')) { G.openMenu('pause', p); return; }
      if (I.pressed(p.device, 'select')) { G.openMenu('inv', p, { tab: 0 }); return; }
    }
    // local join (not while online as a guest)
    if (G.net && !G.isHost) return;
    if (G.players.filter(p => !p.remote).length >= 3 || G.players.length >= 3) return;
    for (const id of I.devices()) {
      if (deviceInUse(id) || id === 'touch') continue;
      if (I.pressed(id, 'start')) {
        const used = G.players.filter(p => !p.remote).map(p => p.slotIdx);
        G.openMenu('slots', null, { dev: id, purpose: 'join', exclude: used, onDone: idx => {
          const s = AH.Save.load()[idx];
          if (!s || s.ch.dead) return;
          if (used.indexOf(idx) >= 0) { G.toast(null, 'THAT HERO IS ALREADY PLAYING', '#ff8a8a'); return; }
          const p = G.addLocalPlayer(idx, s.ch, id);
          G.toast(null, s.ch.name + ' JOINS!', '#8ae08e'); AH.Audio.sfx('levelup');
          if (G.net && G.isHost) G.net.sendRoster();
        } });
        return;
      }
    }
  }

  // ---------- F3: performance meter (frame rate, frame times, smooth-motion level) ----------
  const PF = AH.PF = { on: false, times: [], draws: [], last: 0 };
  window.addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); PF.on = !PF.on; } });
  function perfHud(now, drawMs) {
    if (PF.last) { PF.times.push(now - PF.last); PF.draws.push(drawMs); }
    PF.last = now;
    if (PF.ph) { PF.pa = PF.pa || [0, 0, 0, 0]; PF.ph.forEach((v, i) => { PF.pa[i] += (v - PF.pa[i]) * 0.05; }); }
    if (PF.times.length > 120) { PF.times.shift(); PF.draws.shift(); }
    if (!PF.on || !PF.times.length) return;
    const avg = PF.times.reduce((a, b) => a + b, 0) / PF.times.length, worst = Math.max(...PF.times);
    const dAvg = PF.draws.reduce((a, b) => a + b, 0) / PF.draws.length;
    const late = PF.times.filter(t => t > avg * 1.5).length;
    const ua = navigator.userAgent, br = /Firefox\//.test(ua) ? 'Firefox' : /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '?';
    const lines = [
      'FPS ' + (1000 / avg).toFixed(0) + '   frame ' + avg.toFixed(1) + ' ms   worst ' + worst.toFixed(1) + ' ms',
      'late frames (2 s): ' + late + '   draw ' + dAvg.toFixed(1) + ' ms',
      'update ' + PF.pa[0].toFixed(1) + '  ui ' + PF.pa[2].toFixed(1) + '  output ' + PF.pa[3].toFixed(1) + ' ms   busy ' + (PF.pa[0] + PF.pa[1] + PF.pa[2] + PF.pa[3]).toFixed(1),
      'smooth x' + AH.SS + (AH.ssCap ? ' (stepped down)' : '') + '   lights ' + (AH.fancyOn() ? 'fancy' : 'simple') + '   ' + br,
      'screen ' + view.w + 'x' + view.h + '   dpr ' + (window.devicePixelRatio || 1),
    ];
    const fs = Math.max(12, Math.round(screen.height / 60));
    sctx.save(); sctx.font = fs + 'px monospace'; sctx.textBaseline = 'top';
    sctx.fillStyle = 'rgba(0,0,0,0.7)'; sctx.fillRect(view.x + 4, view.y + 4, fs * 34, fs * 1.3 * lines.length + 8);
    sctx.fillStyle = '#9fff9f'; lines.forEach((l, i) => sctx.fillText(l, view.x + 10, view.y + 8 + i * fs * 1.3));
    // frame-time graph: one bar per frame, red when late
    const gx = view.x + 10, gy = view.y + 12 + fs * 1.3 * lines.length, gh = fs * 2;
    sctx.fillStyle = 'rgba(0,0,0,0.7)'; sctx.fillRect(gx - 6, gy - 2, 120 * 3 + 12, gh + 6);
    PF.times.forEach((t, i) => { const h = Math.min(gh, t / 50 * gh); sctx.fillStyle = t > avg * 1.5 ? '#ff5a5a' : '#9fff9f'; sctx.fillRect(gx + i * 3, gy + gh - h, 2, h); });
    sctx.restore();
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;
    // steady frame pacing: browsers (Firefox above all) hand out slightly uneven timestamps even when
    // the screen refreshes like clockwork; within 25% of the usual frame time, use the usual frame time
    if (!frame.avg) frame.avg = dt;
    if (Math.abs(dt - frame.avg) < frame.avg * 0.25) { frame.avg += (dt - frame.avg) * 0.05; dt = frame.avg; }
    else frame.avg += (dt - frame.avg) * 0.2;
    syncSS();
    AH.Input.poll();
    // each step guarded on its own: one faulty piece must never freeze the whole game
    const safe = f => { try { f(); } catch (e) { if (AH.lastError !== String(e && e.stack || e)) console.error(e); AH.lastError = String(e && e.stack || e); } };
    safe(() => { if (!G.menu && G.scene === 'title') G.openMenu('title', null); if (G.menu && G.menu.type === 'title' && !AH._linkChecked && AH.checkHeroLink) { AH._linkChecked = 1; AH.checkHeroLink(G); } if (G.menu) AH.UI.tick(G, dt); else handleDevices(); });
    safe(() => { if (AH.Mouse) AH.Mouse.tick(G, dt); });
    const tu = performance.now();
    safe(() => { if (G.net && !G.isHost) G.guestUpdate(dt); else G.update(dt); });
    const td = performance.now(), updMs = td - tu;
    safe(() => R.draw(G));
    const drawMs = performance.now() - td;
    // a slow machine steps smooth motion down instead of losing frames: 3 -> 2 quickly, 2 -> 1 only when really slow
    if (AH.SS > 1 && G.scene === 'mine') {
      const ms = performance.now() - tu; frame.dAvg = frame.dAvg === undefined ? ms : frame.dAvg + (ms - frame.dAvg) * 0.02;
      frame.dN = (frame.dN || 0) + 1;
      if (frame.dN > 90 && frame.dAvg > (AH.SS === 3 ? 12 : 15)) { AH.ssCap = AH.SS - 1; frame.dAvg = undefined; frame.dN = 0; }
    }
    const tui = performance.now();
    safe(() => AH.UI.render(G, uctx));
    const tout = performance.now(), uiMs = tout - tui;
    safe(() => { if (AH.Mouse) AH.Mouse.drawCursor(G, uctx); });
    sctx.fillStyle = '#000'; sctx.fillRect(0, 0, screen.width, screen.height);
    sctx.imageSmoothingEnabled = false;
    if (G.scene !== 'title' || !G.menu) { if (G.scene !== 'title' && AH.fancyOn && AH.fancyOn()) safe(() => R.bloom(R.ctx, world, { x: 0, y: 0, w: world.width, h: world.height })); sctx.drawImage(world, view.x, view.y, view.w, view.h); }
    sctx.drawImage(ui, view.x, view.y, view.w, view.h);
    PF.ph = [updMs, drawMs, uiMs, performance.now() - tout];
    perfHud(now, drawMs);
    requestAnimationFrame(frame);
  }
  if (AH.isTouch) { AH.Input.setupTouch(); document.getElementById('fs').style.display = 'block'; }
  document.getElementById('fs').addEventListener('click', () => AH.toggleFullscreen());
  G.openMenu('splash', null);
  AH.Audio.music('title');
  requestAnimationFrame(frame);
})();
