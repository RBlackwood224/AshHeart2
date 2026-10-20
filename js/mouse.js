'use strict';
// Diablo-style mouse control for the keyboard player on PC:
// left click ground = walk there (hold to steer), left click a foe = walk up and strike (hold to keep attacking),
// left click a chest/door/stairs/NPC = walk there and use it, right click = heavy attack toward the cursor.
AH.Mouse = (function () {
  const M = { sx: 0, sy: 0, left: false, right: false, leftPressed: false, rightPressed: false, active: false, lastMove: 0, over: false };
  const canvasPos = () => { const v = AH.getView ? AH.getView() : null; if (!v) return null; return { x: (M.sx - v.x) / v.w, y: (M.sy - v.y) / v.h }; };
  window.addEventListener('mousemove', e => { const d = window.devicePixelRatio || 1; M.sx = e.clientX * d; M.sy = e.clientY * d; M.lastMove = performance.now(); M.moved = true; if (!AH.isTouch) M.active = true; });
  window.addEventListener('mousedown', e => {
    if (AH.isTouch || e.target && e.target.closest && e.target.closest('#btns,#stickzone,#top,#fs')) return;
    const d = window.devicePixelRatio || 1; M.sx = e.clientX * d; M.sy = e.clientY * d; M.active = true;
    if (e.button === 0) { M.left = true; M.leftPressed = true; AH.mouseClick = true; }
    if (e.button === 2) { M.right = true; M.rightPressed = true; }
    AH.Audio && AH.Audio.unlock && AH.Audio.unlock();
  });
  window.addEventListener('mouseup', e => { if (e.button === 0) M.left = false; if (e.button === 2) M.right = false; });
  window.addEventListener('contextmenu', e => { if (!AH.isTouch) e.preventDefault(); });
  window.addEventListener('blur', () => { M.left = M.right = false; });
  window.addEventListener('keydown', () => { /* keyboard use keeps mouse goals until movement keys are pressed */ });

  M.uiPos = function () { const c = canvasPos(); return c ? { x: c.x * AH.UW, y: c.y * AH.UH } : null; };
  // the player the mouse drives: the local keyboard player (kb1), or the only local player if it uses the keyboard
  M.player = function (G) {
    if (!M.active || AH.isTouch) return null;
    return G.players.find(p => !p.remote && p.device === 'kb1') || null;
  };
  // world coordinates of the cursor inside the view that shows player p
  M.world = function (G, p) {
    const c = canvasPos(); if (!c || !AH.R || !AH.R.views) return null;
    const cx = c.x * AH.W, cy = c.y * AH.H;
    let v = AH.R.views.find(v => cx >= v.x && cy >= v.y && cx < v.x + v.w && cy < v.y + v.h && v.players.indexOf(p) >= 0);
    if (!v) v = AH.R.views.find(v => v.players.indexOf(p) >= 0); if (!v) return null;
    return { x: v.camX + (cx - v.x), y: v.camY + (cy - v.y), v };
  };
  M.enemyAt = function (G, x, y) {
    let best = null, bd = 1e9;
    for (const e of G.enemies) {
      if (e.dead || e.hidden) continue;
      const h = e.spr.h * e.scale, w = e.spr.w * e.scale, fy = e.fly ? -6 : 0;
      const ex = e.x, ey = e.y - h / 2 + fy;
      const dx = Math.abs(x - ex), dy = Math.abs(y - ey);
      if (dx < w / 2 + 3 && dy < h / 2 + 4) { const d = dx + dy; if (d < bd) { bd = d; best = e; } }
    }
    return best;
  };
  M.interactAt = function (G, x, y) { return G.findInteract({ x, y }); };

  // per-frame: turn mouse state into goals on the player
  M.tick = function (G, dt) {
    const p = M.player(G);
    M.hover = null; M.hoverInter = null;
    if (G.menu) { M.leftPressed = M.rightPressed = false; return; }
    if (!p || G.scene === 'title' || !G.map) { M.leftPressed = M.rightPressed = false; return; }
    const w = M.world(G, p); if (!w) return;
    M.cur = w;
    const e = M.enemyAt(G, w.x, w.y);
    M.hover = e;
    const it = e ? null : M.interactAt(G, w.x, w.y);
    M.hoverInter = it;
    if (M.leftPressed) {
      M.leftPressed = false;
      p.mTarget = e || null; p.mInter = it || null; p.mDest = (!e && !it) ? { x: w.x, y: w.y } : null; p.mPath = null; p.mPathT = 0;
      p.mHold = true;
    }
    if (!M.left) p.mHold = false;
    if (M.left && !p.mTarget && !p.mInter) { if (!p.mDest || Math.hypot(p.mDest.x - w.x, p.mDest.y - w.y) > 12) { p.mDest = { x: w.x, y: w.y }; p.mPath = null; } }
    if (M.rightPressed) { M.rightPressed = false; p.mHeavy = Math.atan2(w.y - (p.y - 6), w.x - p.x); }
    p.mCursor = w;
  };

  // pixel-art cursor in the UI layer
  M.drawCursor = function (G, ctx) {
    if (!M.active || AH.isTouch) return;
    const c = canvasPos(); if (!c || c.x < 0 || c.y < 0 || c.x > 1 || c.y > 1) return;
    const x = Math.round(c.x * AH.UW), y = Math.round(c.y * AH.UH);
    const R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); };
    if (M.hover && !G.menu) {
      // sword cursor + enemy name and life at the top of the screen
      for (let k = 0; k < 7; k++) { R(k, k, 2, 2, AH.OUT); }
      for (let k = 0; k < 6; k++) R(k, k, 1, 1, '#eef2f8');
      R(4, 7, 4, 1, '#c8a03a'); R(7, 4, 1, 4, '#c8a03a');
      const e = M.hover, nm = e.name;
      const col = e.boss ? '#ff6a5a' : e.legend ? '#ff9a3e' : e.elite ? '#f2d36a' : '#e9e2d0';
      if (!(e.boss || e.legend)) {
        const tw = Math.max(80, AH.textW(nm) + 12), X = Math.round(AH.UW / 2 - tw / 2);
        AH.frame(ctx, X, 50, tw, 20, { fill: '#120e10', edge: '#5a2a2a', hi: '#8a3a3a' });
        AH.bar(ctx, X + 4, 63, tw - 8, 3, e.hp / e.maxHp, '#d43c3c', '#2a1416', '#ff8a8a');
        AH.text(ctx, AH.UW / 2, 53, nm, col, { align: 'center' });
      }
    } else if (M.hoverInter && !G.menu) {
      R(0, 0, 2, 9, AH.OUT); R(0, 0, 7, 2, AH.OUT); R(1, 1, 1, 7, '#ffd36a'); R(1, 1, 5, 1, '#ffd36a'); R(2, 2, 4, 4, '#ffd36a'); R(5, 5, 3, 3, AH.OUT); R(5, 5, 2, 2, '#ffd36a');
    } else {
      // gauntlet-ish arrow
      const g = ['#.......', '##......', '#o#.....', '#oo#....', '#ooo#...', '#oooo#..', '#ooooo#.', '#oo####.', '#o#.....', '##......'];
      g.forEach((r, j) => r.split('').forEach((ch, i) => { if (ch === '#') R(i, j, 1, 1, AH.OUT); else if (ch === 'o') R(i, j, 1, 1, j < 3 ? '#fff2d0' : '#c8b8a0'); }));
    }
  };
  return M;
})();
