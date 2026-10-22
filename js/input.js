'use strict';
// Input devices: two keyboard layouts, gamepads, touch. Each device yields the same logical pad.
AH.BTN = ['a', 'b', 'x', 'y', 'lb', 'rb', 'up', 'down', 'left', 'right', 'start', 'select'];
AH.Input = (function () {
  const keys = {};
  const KB = {
    kb1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      a: ['KeyJ'], b: ['KeyL'], x: ['KeyK'], y: ['KeyI', 'Digit1'], lb: ['KeyU', 'Digit2'], rb: ['KeyO', 'Digit3'],
      pot: ['KeyQ'], mana: ['KeyE', 'KeyR'], start: ['Escape'], select: ['Tab', 'KeyB'], dodge: ['Space'] },
    kb2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      a: ['Numpad1', 'Period'], b: ['Numpad2', 'Slash'], x: ['Numpad4', 'Comma'], y: ['Numpad5', 'Semicolon'], lb: ['Numpad7', 'KeyM'], rb: ['Numpad8', 'Quote'],
      pot: ['Numpad0', 'KeyN'], mana: ['NumpadDecimal', 'KeyH'], start: ['NumpadEnter', 'Backslash'], select: ['NumpadAdd', 'BracketRight'] },
  };
  const dev = {}; // id -> {cur, prev, ax, ay, rep}
  const mk = id => (dev[id] = dev[id] || { id, cur: {}, prev: {}, ax: 0, ay: 0, rep: { t: 0, dx: 0, dy: 0 }, lastActive: 0 });
  mk('kb1'); mk('kb2');
  const touch = { active: false, ax: 0, ay: 0, btn: {} };
  let hidePad = null; // set by setupTouch: hides the on-screen pad when a mouse, keyboard or controller is used

  const menuKeys = {}; // keys that went down while a menu was open (so Esc that opened the pause menu doesn't also close it)
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (AH.game && (AH.game.menu || AH.game.scene === 'title')) menuKeys[e.code] = true;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].indexOf(e.code) >= 0) e.preventDefault();
    AH.Audio && AH.Audio.unlock();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; menuKeys[e.code] = false; });
  // a key press that never reached the page (the browser kept Esc to leave fullscreen): replay it briefly
  AH.tapKey = function (code) {
    keys[code] = true; if (AH.game && (AH.game.menu || AH.game.scene === 'title')) menuKeys[code] = true;
    setTimeout(() => { keys[code] = false; menuKeys[code] = false; }, 90);
  };
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function any(list) { for (const k of list) if (keys[k]) return true; return false; }

  function poll() {
    const now = performance.now();
    for (const id of ['kb1', 'kb2']) {
      const d = mk(id), m = KB[id];
      d.prev = d.cur; d.cur = {};
      d.ax = (any(m.right) ? 1 : 0) - (any(m.left) ? 1 : 0);
      d.ay = (any(m.down) ? 1 : 0) - (any(m.up) ? 1 : 0);
      for (const b of ['a', 'b', 'x', 'y', 'lb', 'rb', 'start', 'select']) d.cur[b] = any(m[b]);
      d.cur.up = any(m.up); d.cur.down = any(m.down); d.cur.left = any(m.left); d.cur.right = any(m.right);
      d.cur.pot = any(m.pot); d.cur.mana = any(m.mana); d.cur.dodge = m.dodge ? any(m.dodge) : false;
      // Enter / Backspace confirm and go back in menus only, never attack in the game
      if (id === 'kb1' && AH.game && (AH.game.menu || AH.game.scene === 'title')) { if (menuKeys.Enter || menuKeys.NumpadEnter) d.cur.a = true; if (menuKeys.Backspace || menuKeys.Escape) d.cur.b = true; }
      if (d.ax || d.ay || Object.values(d.cur).some(v => v)) d.lastActive = now;
    }
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i]; if (!p) continue;
      const d = mk('gp' + i);
      d.prev = d.cur; d.cur = {};
      const B = n => !!(p.buttons[n] && p.buttons[n].pressed);
      let ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) < 0.28) { ax = 0; ay = 0; }
      d.cur.a = B(0); d.cur.b = B(1); d.cur.x = B(2); d.cur.y = B(3); d.cur.lb = B(4); d.cur.rb = B(5);
      d.cur.select = B(8); d.cur.start = B(9);
      d.cur.up = B(12); d.cur.down = B(13); d.cur.left = B(14); d.cur.right = B(15);
      d.cur.pot = d.cur.up || B(6); d.cur.mana = d.cur.down || B(7);
      if (d.cur.left) ax = -1; if (d.cur.right) ax = 1;
      d.ax = ax; d.ay = ay;
      d.stickUp = ay < -0.6; d.stickDown = ay > 0.6; d.stickLeft = ax < -0.6; d.stickRight = ax > 0.6;
      if (ax || ay || Object.values(d.cur).some(v => v)) { d.lastActive = now; if (hidePad && AH.isTouch) hidePad(); }
    }
    if (touch.active) {
      const d = mk('touch');
      d.prev = d.cur; d.cur = Object.assign({}, touch.btn);
      d.ax = touch.ax; d.ay = touch.ay;
      d.cur.pot = touch.btn.pot; d.cur.mana = touch.btn.mana;
      if (d.ax || d.ay || Object.values(d.cur).some(v => v)) d.lastActive = now;
    }
  }
  const pressed = (id, b) => { const d = dev[id]; return !!(d && d.cur[b] && !d.prev[b]); };
  const held = (id, b) => { const d = dev[id]; return !!(d && d.cur[b]); };
  const axis = id => { const d = dev[id]; return d ? { x: d.ax, y: d.ay } : { x: 0, y: 0 }; };
  // menu direction with key repeat
  function menuDir(id, dt) {
    const d = dev[id]; if (!d) return { dx: 0, dy: 0 };
    let dx = 0, dy = 0;
    // in menus the first keyboard also answers to the arrow keys
    const arr = id === 'kb1' ? { l: keys.ArrowLeft, r: keys.ArrowRight, u: keys.ArrowUp, d: keys.ArrowDown } : {};
    if (d.ax < -0.5 || d.cur.left || arr.l) dx = -1; else if (d.ax > 0.5 || d.cur.right || arr.r) dx = 1;
    if (d.ay < -0.5 || d.cur.up || arr.u) dy = -1; else if (d.ay > 0.5 || d.cur.down || arr.d) dy = 1;
    const r = d.rep;
    if (dx !== r.dx || dy !== r.dy) { r.dx = dx; r.dy = dy; r.t = 0.28; return { dx, dy }; }
    if (!dx && !dy) return { dx: 0, dy: 0 };
    r.t -= dt;
    if (r.t <= 0) { r.t = 0.085; return { dx, dy }; }
    return { dx: 0, dy: 0 };
  }
  function devices() { return Object.keys(dev); }
  // controller rumble (where the browser supports it)
  function rumble(id, strength, ms) {
    try {
      if (!id || !id.startsWith('gp') || AH.options.shake === false) return;
      const pad = (navigator.getGamepads ? navigator.getGamepads() : [])[+id.slice(2)];
      const a = pad && pad.vibrationActuator; if (!a || !a.playEffect) return;
      a.playEffect('dual-rumble', { duration: ms || 150, strongMagnitude: Math.min(1, strength), weakMagnitude: Math.min(1, strength * 0.7) });
    } catch (e) { /* no rumble */ }
  }
  // the device the person touched last (mouse movement counts as the first keyboard)
  function lastDevice() {
    let best = null, bt = -1;
    for (const id in dev) if (dev[id].lastActive > bt) { bt = dev[id].lastActive; best = id; }
    if (AH.Mouse && AH.Mouse.lastMove && AH.Mouse.lastMove > bt && !AH.isTouch) best = 'kb1';
    if (AH.isTouch && (!best || bt <= 0)) best = 'touch';
    return best;
  }
  function anyPressed(b) { for (const id in dev) if (pressed(id, b)) return id; return null; }

  // ---------- touch controls ----------
  function setupTouch() {
    const root = document.getElementById('touch');
    if (!root) return;
    root.style.display = 'block';
    touch.active = true; mk('touch');
    // a real mouse or keyboard on a touch-capable laptop hides the on-screen pad; touching the screen brings it back
    const toPc = hidePad = () => { if (!AH.isTouch) return; AH.isTouch = false; root.style.display = 'none'; const fs = document.getElementById('fs'); if (fs) fs.style.display = 'none'; };
    window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && (Math.abs(e.movementX) + Math.abs(e.movementY)) > 0) toPc(); });
    window.addEventListener('keydown', toPc);
    window.addEventListener('touchstart', () => { if (AH.isTouch) return; AH.isTouch = true; root.style.display = 'block'; }, { passive: true });
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let sid = null, ox = 0, oy = 0;
    const zone = document.getElementById('stickzone');
    zone.addEventListener('pointerdown', e => {
      sid = e.pointerId; ox = e.clientX; oy = e.clientY; zone.setPointerCapture(e.pointerId);
      stick.style.left = (ox - 55) + 'px'; stick.style.top = (oy - 55) + 'px'; stick.style.opacity = 1;
      knob.style.transform = 'translate(0px,0px)';
      AH.Audio && AH.Audio.unlock();
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== sid) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy), m = 45;
      if (l > m) { dx = dx / l * m; dy = dy / l * m; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      touch.ax = Math.abs(dx) > 8 ? dx / m : 0; touch.ay = Math.abs(dy) > 8 ? dy / m : 0;
    });
    const end = e => { if (e.pointerId !== sid) return; sid = null; touch.ax = 0; touch.ay = 0; stick.style.opacity = 0.35; knob.style.transform = 'translate(0px,0px)'; };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    root.querySelectorAll('[data-btn]').forEach(el => {
      const b = el.getAttribute('data-btn');
      const on = e => { e.preventDefault(); touch.btn[b] = true; el.classList.add('on'); AH.Audio && AH.Audio.unlock(); };
      const off = e => { e.preventDefault(); touch.btn[b] = false; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
      el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
    });
  }
  return { poll, pressed, held, axis, menuDir, devices, lastDevice, rumble, anyPressed, setupTouch, dev, keys, touch };
})();
