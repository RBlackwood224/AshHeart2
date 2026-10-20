'use strict';
// Input devices: two keyboard layouts, gamepads, touch. Each device yields the same logical pad.
AH.BTN = ['a', 'b', 'x', 'y', 'lb', 'rb', 'up', 'down', 'left', 'right', 'start', 'select'];
AH.Input = (function () {
  const keys = {};
  const KB = {
    kb1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      a: ['KeyJ', 'Space', 'Enter'], b: ['KeyL', 'ShiftLeft', 'Backspace'], x: ['KeyK'], y: ['KeyI'], lb: ['KeyU'], rb: ['KeyO'],
      pot: ['KeyQ'], mana: ['KeyR'], start: ['Escape'], select: ['Tab', 'KeyB'] },
    kb2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      a: ['Numpad1', 'Period'], b: ['Numpad2', 'Slash'], x: ['Numpad4', 'Comma'], y: ['Numpad5', 'Semicolon'], lb: ['Numpad7', 'KeyM'], rb: ['Numpad8', 'Quote'],
      pot: ['Numpad0', 'KeyN'], mana: ['NumpadDecimal', 'KeyH'], start: ['NumpadEnter', 'Backslash'], select: ['NumpadAdd', 'BracketRight'] },
  };
  const dev = {}; // id -> {cur, prev, ax, ay, rep}
  const mk = id => (dev[id] = dev[id] || { id, cur: {}, prev: {}, ax: 0, ay: 0, rep: { t: 0, dx: 0, dy: 0 }, lastActive: 0 });
  mk('kb1'); mk('kb2');
  const touch = { active: false, ax: 0, ay: 0, btn: {} };

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].indexOf(e.code) >= 0) e.preventDefault();
    AH.Audio && AH.Audio.unlock();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
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
      d.cur.pot = any(m.pot); d.cur.mana = any(m.mana);
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
      if (ax || ay || Object.values(d.cur).some(v => v)) d.lastActive = now;
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
    if (d.ax < -0.5 || d.cur.left) dx = -1; else if (d.ax > 0.5 || d.cur.right) dx = 1;
    if (d.ay < -0.5 || d.cur.up) dy = -1; else if (d.ay > 0.5 || d.cur.down) dy = 1;
    const r = d.rep;
    if (dx !== r.dx || dy !== r.dy) { r.dx = dx; r.dy = dy; r.t = 0.28; return { dx, dy }; }
    if (!dx && !dy) return { dx: 0, dy: 0 };
    r.t -= dt;
    if (r.t <= 0) { r.t = 0.085; return { dx, dy }; }
    return { dx: 0, dy: 0 };
  }
  function devices() { return Object.keys(dev); }
  function anyPressed(b) { for (const id in dev) if (pressed(id, b)) return id; return null; }

  // ---------- touch controls ----------
  function setupTouch() {
    const root = document.getElementById('touch');
    if (!root) return;
    root.style.display = 'block';
    touch.active = true; mk('touch');
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
  return { poll, pressed, held, axis, menuDir, devices, anyPressed, setupTouch, dev, keys, touch };
})();
