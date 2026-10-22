'use strict';
// Boot, main loop, scaling, device handling, saving
(function () {
  AH.options = AH.Save.options();
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

  AH.toggleFullscreen = function () {
    const el = document.documentElement;
    if (!document.fullscreenElement) { (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ } }
    else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  };

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

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;
    AH.Input.poll();
    try {
      if (!G.menu && G.scene === 'title') G.openMenu('title', null);
      if (G.menu) AH.UI.tick(G, dt);
      else handleDevices();
      if (AH.Mouse) AH.Mouse.tick(G, dt);
      if (G.net && !G.isHost) G.guestUpdate(dt); else G.update(dt);
      if (G.menu && G.net && G.isHost) { /* online host keeps simulating under menus */ }
      R.draw(G);
      AH.UI.render(G, uctx);
      if (AH.Mouse) AH.Mouse.drawCursor(G, uctx);
    } catch (e) { console.error(e); AH.lastError = String(e && e.stack || e); }
    sctx.fillStyle = '#000'; sctx.fillRect(0, 0, screen.width, screen.height);
    sctx.imageSmoothingEnabled = false;
    if (G.scene !== 'title' || !G.menu) { sctx.drawImage(world, view.x, view.y, view.w, view.h); if (G.scene !== 'title' && AH.fancyOn && AH.fancyOn()) R.bloom(sctx, world, view); }
    sctx.drawImage(ui, view.x, view.y, view.w, view.h);
    requestAnimationFrame(frame);
  }
  if (AH.isTouch) { AH.Input.setupTouch(); document.getElementById('fs').style.display = 'block'; }
  document.getElementById('fs').addEventListener('click', () => AH.toggleFullscreen());
  G.openMenu('splash', null);
  AH.Audio.music('title');
  requestAnimationFrame(frame);
})();
