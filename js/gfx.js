'use strict';
// Pixel sprite compiler, pixel font and UI primitives
AH.OUT = '#0c0910';

// grid: array of strings; pal: {char: '#hex'}; emissive: string of chars that glow
AH.sprite = function (grid, pal, opt) {
  opt = opt || {};
  const h = grid.length, w = Math.max(...grid.map(r => r.length));
  const pad = opt.outline === false ? 0 : 1;
  const W = w + pad * 2, H = h + pad * 2;
  const mk = (flip) => {
    const c = AH.makeCanvas(W, H), x = c.getContext('2d');
    const em = AH.makeCanvas(W, H), ex = em.getContext('2d');
    const solid = new Uint8Array(W * H);
    let hasEm = false;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = grid[j][i];
      if (ch && pal[ch]) solid[(j + pad) * W + (flip ? (w - 1 - i) : i) + pad] = 1;
    }
    if (pad) {
      x.fillStyle = opt.outlineColor || AH.OUT;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        if (solid[j * W + i]) continue;
        if ((i > 0 && solid[j * W + i - 1]) || (i < W - 1 && solid[j * W + i + 1]) ||
            (j > 0 && solid[(j - 1) * W + i]) || (j < H - 1 && solid[(j + 1) * W + i])) x.fillRect(i, j, 1, 1);
      }
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = grid[j][i]; if (!ch || !pal[ch]) continue;
      const X = (flip ? (w - 1 - i) : i) + pad, Y = j + pad;
      x.fillStyle = pal[ch]; x.fillRect(X, Y, 1, 1);
      if (opt.emissive && opt.emissive.indexOf(ch) >= 0) { ex.fillStyle = pal[ch]; ex.fillRect(X, Y, 1, 1); hasEm = true; }
    }
    return { c, em: hasEm ? em : null };
  };
  const r = mk(false), l = mk(true);
  return { w: W, h: H, c: r.c, em: r.em, cf: l.c, emf: l.em, grid, pal, opt };
};
AH.recolor = function (s, map) {
  return AH.sprite(s.grid, Object.assign({}, s.pal, map), s.opt);
};

AH.drawSpr = function (ctx, s, x, y, flip, scale) {
  scale = scale || 1;
  ctx.drawImage(flip ? s.cf : s.c, Math.round(x), Math.round(y), s.w * scale, s.h * scale);
};
AH.drawSprEm = function (ctx, s, x, y, flip, scale) {
  const e = flip ? s.emf : s.em; if (!e) return;
  scale = scale || 1;
  ctx.drawImage(e, Math.round(x), Math.round(y), s.w * scale, s.h * scale);
};
// draw a white silhouette flash version
AH.flashCache = new WeakMap();
// gravestone: rounded slab with a carved cross, moss and a dirt mound
AH.drawGrave = function (ctx, x, y, fresh) {
  x = Math.round(x); y = Math.round(y);
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  R(-8, -1, 16, 3, fresh ? '#3a2a1e' : '#2a2620'); R(-7, -2, 14, 1, fresh ? '#5a4030' : '#3a3428');
  R(-6, -16, 12, 15, AH.OUT); R(-5, -18, 10, 2, AH.OUT); R(-3, -19, 6, 1, AH.OUT);
  R(-5, -16, 10, 14, '#8a8494'); R(-4, -18, 8, 2, '#8a8494'); R(-2, -18, 4, 1, '#a8a2b4');
  R(-5, -16, 1, 14, '#a8a2b4'); R(4, -16, 1, 14, '#5d586e'); R(-5, -3, 10, 1, '#5d586e');
  R(-1, -15, 2, 9, '#4a4458'); R(-3, -13, 6, 2, '#4a4458');
  if (!fresh) { R(-5, -5, 3, 2, '#4e6a3a'); R(2, -9, 2, 1, '#4e6a3a'); R(3, -3, 2, 1, '#3e5a2e'); }
  else { R(-6, -1, 3, 1, '#6b4a2e'); R(3, 0, 2, 1, '#6b4a2e'); }
};
AH.tintCache = new Map();
AH.drawTint = function (ctx, s, x, y, flip, scale, col) {
  const key = col; let m = AH.tintCache.get(s); if (!m) { m = {}; AH.tintCache.set(s, m); }
  let f = m[key];
  if (!f) {
    const mk = src => { const c = AH.makeCanvas(s.w, s.h), x2 = c.getContext('2d'); x2.drawImage(src, 0, 0); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = col; x2.fillRect(0, 0, s.w, s.h); return c; };
    f = m[key] = { c: mk(s.c), cf: mk(s.cf) };
  }
  scale = scale || 1;
  ctx.drawImage(flip ? f.cf : f.c, Math.round(x), Math.round(y), s.w * scale, s.h * scale);
};
AH.drawFlash = function (ctx, s, x, y, flip, scale) {
  let f = AH.flashCache.get(s);
  if (!f) {
    const mk = src => { const c = AH.makeCanvas(s.w, s.h), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, s.w, s.h); return c; };
    f = { c: mk(s.c), cf: mk(s.cf) }; AH.flashCache.set(s, f);
  }
  scale = scale || 1;
  ctx.drawImage(flip ? f.cf : f.c, Math.round(x), Math.round(y), s.w * scale, s.h * scale);
};
// 90° rotated copy (pixel perfect)
AH.rotSpr = function (s, quarter) {
  const mk = src => {
    const odd = quarter % 2 === 1;
    const c = AH.makeCanvas(odd ? s.h : s.w, odd ? s.w : s.h), x = c.getContext('2d');
    x.translate(c.width / 2, c.height / 2); x.rotate(quarter * Math.PI / 2); x.drawImage(src, -s.w / 2, -s.h / 2);
    return c;
  };
  const c = mk(s.c), cf = mk(s.cf);
  return { w: c.width, h: c.height, c, cf, em: null, emf: null };
};

// ---------------- font 5x7 ----------------
AH.FONT = {
 'A': [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
 'B': ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
 'C': [" ### ", "#   #", "#    ", "#    ", "#    ", "#   #", " ### "],
 'D': ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
 'E': ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
 'F': ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
 'G': [" ### ", "#   #", "#    ", "# ###", "#   #", "#   #", " ####"],
 'H': ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
 'I': ["###", " # ", " # ", " # ", " # ", " # ", "###"],
 'J': ["  ###", "   # ", "   # ", "   # ", "   # ", "#  # ", " ##  "],
 'K': ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
 'L': ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
 'M': ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
 'N': ["#   #", "##  #", "# # #", "#  ##", "#   #", "#   #", "#   #"],
 'O': [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
 'P': ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
 'Q': [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
 'R': ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
 'S': [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
 'T': ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
 'U': ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
 'V': ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
 'W': ["#   #", "#   #", "#   #", "# # #", "# # #", "# # #", " # # "],
 'X': ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
 'Y': ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
 'Z': ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"],
 '0': [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
 '1': [" # ", "## ", " # ", " # ", " # ", " # ", "###"],
 '2': [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
 '3': ["#####", "   # ", "  #  ", "   # ", "    #", "#   #", " ### "],
 '4': ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
 '5': ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
 '6': ["  ## ", " #   ", "#    ", "#### ", "#   #", "#   #", " ### "],
 '7': ["#####", "    #", "   # ", "  #  ", " #   ", " #   ", " #   "],
 '8': [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
 '9': [" ### ", "#   #", "#   #", " ####", "    #", "   # ", " ##  "],
 '.': [" ", " ", " ", " ", " ", " ", "#"],
 ',': ["  ", "  ", "  ", "  ", "  ", " #", "# "],
 ':': [" ", "#", " ", " ", " ", "#", " "],
 ';': [" ", "#", " ", " ", " ", "#", "#"],
 '!': ["#", "#", "#", "#", "#", " ", "#"],
 '?': [" ### ", "#   #", "    #", "   # ", "  #  ", "     ", "  #  "],
 '-': ["   ", "   ", "   ", "###", "   ", "   ", "   "],
 '+': ["     ", "  #  ", "  #  ", "#####", "  #  ", "  #  ", "     "],
 '/': ["    #", "   # ", "   # ", "  #  ", " #   ", " #   ", "#    "],
 '%': ["##  #", "## # ", "   # ", "  #  ", " #   ", " # ##", "#  ##"],
 "'": ["#", "#", " ", " ", " ", " ", " "],
 '"': ["# #", "# #", "   ", "   ", "   ", "   ", "   "],
 '(': [" #", "# ", "# ", "# ", "# ", "# ", " #"],
 ')': ["# ", " #", " #", " #", " #", " #", "# "],
 '>': ["#  ", " # ", "  #", "  #", "  #", " # ", "#  "],
 '<': ["  #", " # ", "#  ", "#  ", "#  ", " # ", "  #"],
 '[': ["##", "# ", "# ", "# ", "# ", "# ", "##"],
 ']': ["##", " #", " #", " #", " #", " #", "##"],
 '=': ["   ", "   ", "###", "   ", "###", "   ", "   "],
 '*': ["     ", "# # #", " ### ", "#####", " ### ", "# # #", "     "],
 '#': [" # # ", "#####", " # # ", " # # ", "#####", " # # ", "     "],
 '^': ["  #  ", " ### ", "# # #", "  #  ", "  #  ", "  #  ", "  #  "],
 '_': ["  #  ", "  #  ", "  #  ", "  #  ", "# # #", " ### ", "  #  "],
 '~': ["     ", "     ", " #  #", "# ## ", "     ", "     ", "     "],
 '&': [" ##  ", "#  # ", " ##  ", " ## #", "#  # ", "#  # ", " ## #"],
 '@': [" ### ", "#   #", "# ###", "# # #", "# ###", "#    ", " ####"],
 '$': ["  #  ", " ####", "# #  ", " ### ", "  # #", "#### ", "  #  "],
 'Ç': [" ### ", "#   #", "#    ", "#    ", "#   #", " ### ", "  #  "],
 'Œ': [" ####", "# #  ", "# #  ", "# ###", "# #  ", "# #  ", " ####"],
 'Ÿ': [" # # ", "     ", "#   #", " # # ", "  #  ", "  #  ", "  #  "],
 '„': ["   ", "   ", "   ", "   ", "   ", "# #", "# #"],
 '”': ["# #", "# #", "   ", "   ", "   ", "   ", "   "],
 '«': ["     ", "     ", " # # ", "# #  ", " # # ", "     ", "     "],
 '»': ["     ", "     ", "# #  ", " # # ", "# #  ", "     ", "     "],
 '’': ["#", "#", " ", " ", " ", " ", " "],
};
// accented capitals: two accent rows above the normal 7-row letter
(function () {
  const F = AH.FONT;
  const A5 = { acute: ['   # ', '  #  '], grave: [' #   ', '  #  '], circ: ['  #  ', ' # # '], uml: ['     ', ' # # '], dbl: ['  # #', ' # # '] };
  const A3 = { acute: ['  #', ' # '], grave: ['#  ', ' # '], circ: [' # ', '# #'], uml: ['   ', '# #'] };
  const map = { 'Á': ['A', 'acute'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'É': ['E', 'acute'], 'È': ['E', 'grave'], 'Ê': ['E', 'circ'], 'Ë': ['E', 'uml'], 'Í': ['I', 'acute'], 'Î': ['I', 'circ'], 'Ï': ['I', 'uml'], 'Ó': ['O', 'acute'], 'Ö': ['O', 'uml'], 'Ő': ['O', 'dbl'], 'Ô': ['O', 'circ'], 'Ú': ['U', 'acute'], 'Ü': ['U', 'uml'], 'Ű': ['U', 'dbl'], 'Ù': ['U', 'grave'], 'Û': ['U', 'circ'] };
  for (const ch in map) {
    const base = F[map[ch][0]], w = base[0].length;
    const acc = (w >= 5 ? A5 : A3)[map[ch][1]].map(r => (r + '     ').slice(0, w));
    F[ch] = acc.concat(base);
  }
})();
AH.glyphCache = {};
AH.glyph = function (ch, color) {
  const key = ch + color;
  let g = AH.glyphCache[key];
  if (g) return g;
  const rows = AH.FONT[ch]; if (!rows) return null;
  const w = rows[0].length, h = rows.length, c = AH.makeCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = color;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (rows[j][i] === '#') x.fillRect(i, j, 1, 1);
  g = { c, w, h, up: h > 7 ? h - 7 : 0 }; AH.glyphCache[key] = g; return g;
};
AH.textW = function (s, scale) {
  scale = scale || 1; let w = 0;
  for (const ch of AH.tr(String(s)).toUpperCase()) {
    if (ch === ' ') { w += 3; continue; }
    const r = AH.FONT[ch]; w += (r ? r[0].length : 3) + 1;
  }
  return Math.max(0, w - 1) * scale;
};
// opt: {shadow:color|null, scale, align:'left'|'center'|'right'}
AH.text = function (ctx, x, y, s, color, opt) {
  opt = opt || {};
  const scale = opt.scale || 1;
  s = AH.tr(String(s)).toUpperCase();
  // opt.maxW: shorten the text to fit its box instead of spilling out
  if (opt.maxW && AH.textW(s, scale) > opt.maxW) { while (s.length > 1 && AH.textW(s + '.', scale) > opt.maxW) s = s.slice(0, -1); s = s.trimEnd() + '.'; }
  if (opt.align === 'center') x -= Math.floor(AH.textW(s, scale) / 2);
  else if (opt.align === 'right') x -= AH.textW(s, scale);
  x = Math.round(x); y = Math.round(y);
  const sh = opt.shadow === undefined ? AH.OUT : opt.shadow;
  const pass = (col, ox, oy) => {
    let cx = x;
    for (const ch of s) {
      if (ch === ' ') { cx += 3 * scale; continue; }
      const g = AH.glyph(ch, col);
      if (!g) { cx += 4 * scale; continue; }
      ctx.drawImage(g.c, cx + ox, y + oy - g.up * scale, g.w * scale, g.h * scale);
      cx += (g.w + 1) * scale;
    }
    return cx;
  };
  if (sh) pass(sh, scale, scale);
  return pass(color, 0, 0);
};
// word-wrap into lines of max pixel width
AH.wrap = function (s, maxW) {
  const words = AH.tr(String(s)).toUpperCase().split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (AH.textW(t) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
};

// ---------------- UI primitives ----------------
AH.rect = function (ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
AH.frame = function (ctx, x, y, w, h, st) {
  st = st || {};
  const fill = st.fill || '#15121b', edge = st.edge || '#5a4e66', hi = st.hi || '#8a7a94';
  AH.rect(ctx, x, y, w, h, '#07060a');
  AH.rect(ctx, x + 1, y + 1, w - 2, h - 2, edge);
  AH.rect(ctx, x + 2, y + 2, w - 4, h - 4, fill);
  AH.rect(ctx, x + 2, y + 1, w - 4, 1, hi);
  ctx.clearRect(x, y, 1, 1); ctx.clearRect(x + w - 1, y, 1, 1); ctx.clearRect(x, y + h - 1, 1, 1); ctx.clearRect(x + w - 1, y + h - 1, 1, 1);
};
AH.bar = function (ctx, x, y, w, h, frac, col, back, hi) {
  frac = AH.clamp(frac, 0, 1);
  AH.rect(ctx, x - 1, y - 1, w + 2, h + 2, AH.OUT);
  AH.rect(ctx, x, y, w, h, back);
  const fw = Math.round(w * frac);
  if (fw > 0) { AH.rect(ctx, x, y, fw, h, col); if (hi) AH.rect(ctx, x, y, fw, 1, hi); }
  if (h > 2) for (let i = x + 6; i < x + w; i += 6) AH.rect(ctx, i, y + h - 1, 1, 1, AH.OUT);
};
AH.slot = function (ctx, x, y, s, border, fill) {
  AH.rect(ctx, x, y, s, s, AH.OUT);
  AH.rect(ctx, x + 1, y + 1, s - 2, s - 2, border || '#5a4e66');
  AH.rect(ctx, x + 2, y + 2, s - 4, s - 4, fill || '#17131d');
  AH.rect(ctx, x + 2, y + 2, s - 4, 1, '#08060c');
  AH.rect(ctx, x + 2, y + 2, 1, s - 4, '#08060c');
};
AH.iconIn = function (ctx, spr, x, y, s, scale) {
  scale = scale || 1;
  AH.drawSpr(ctx, spr, x + Math.floor((s - spr.w * scale) / 2), y + Math.floor((s - spr.h * scale) / 2), false, scale);
};
// little socket pips in the corner of an item slot: dark when empty, rune-coloured when filled
AH.socketPips = function (ctx, it, x, y, s) {
  if (!it || !it.sockets) return;
  for (let i = 0; i < it.sockets; i++) {
    const r = it.runes && it.runes[i], px = x + 2 + i * 4, py = y + s - 5;
    ctx.fillStyle = '#07060a'; ctx.fillRect(px - 1, py - 1, 4, 4);
    ctx.fillStyle = r ? AH.RUNES[r].col : '#3a3442'; ctx.fillRect(px, py, 2, 2);
  }
};
AH.cursor = function (ctx, x, y, s, col) {
  col = col || '#fff2b0';
  const L = 4;
  for (const [cx, cy, dx, dy] of [[x - 2, y - 2, 1, 1], [x + s + 1, y - 2, -1, 1], [x - 2, y + s + 1, 1, -1], [x + s + 1, y + s + 1, -1, -1]]) {
    for (let k = 0; k < L; k++) { AH.rect(ctx, cx + dx * k, cy, 1, 1, col); AH.rect(ctx, cx, cy + dy * k, 1, 1, col); }
  }
};
AH.coinIcon = function (ctx, x, y) {
  AH.rect(ctx, x + 1, y, 3, 1, '#a8823a'); AH.rect(ctx, x, y + 1, 5, 3, '#e8c25a');
  AH.rect(ctx, x + 1, y + 4, 3, 1, '#a8823a'); AH.rect(ctx, x + 1, y + 1, 1, 1, '#fff2a8');
};
// dithered fill (t = coverage 0..1)
AH.dither = function (ctx, x, y, w, h, col, t) {
  ctx.fillStyle = col;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j;
    if (AH.BAYER[(Y & 3) * 4 + (X & 3)] < t) ctx.fillRect(X, Y, 1, 1);
  }
};
// pixel arc (attack swoosh)
AH.arc = function (ctx, cx, cy, r, a0, a1, cols) {
  for (let a = a0; a <= a1; a += 0.06) {
    for (let k = 0; k < cols.length; k++) {
      const rr = r - k;
      ctx.fillStyle = cols[k];
      ctx.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 1, 1);
    }
  }
};
