'use strict';
// ASHHEART — core helpers
const AH = window.AH = {};
AH.W = 320; AH.H = 180;       // world resolution
AH.UW = 480; AH.UH = 270;     // menu resolution
AH.T = 16;                    // tile size
AH.VERSION = '0.1.0';

AH.mulberry = function (seed) {
  let a = (seed >>> 0) || 1;
  const f = function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.weighted = (items, wkey) => {
    let tot = 0; for (const it of items) tot += it[wkey];
    let r = f() * tot;
    for (const it of items) { r -= it[wkey]; if (r <= 0) return it; }
    return items[items.length - 1];
  };
  return f;
};
AH.rand = AH.mulberry((Date.now() ^ 0x5eed) >>> 0);
AH.hashStr = function (s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

AH.hx = function (h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
};
AH.toHex = function (c) { return '#' + c.map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join(''); };
AH.shade = function (h, f) { const c = AH.hx(h); return AH.toHex(c.map(v => v * f)); };
AH.mix = function (h1, h2, t) { const a = AH.hx(h1), b = AH.hx(h2); return AH.toHex(a.map((v, i) => v + (b[i] - v) * t)); };
AH.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
AH.lerp = (a, b, t) => a + (b - a) * t;
AH.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
AH.dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
AH.angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
AH.BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
AH.uid = (() => { let n = 1; return () => n++; })();
AH.fmt = n => String(Math.floor(n));
AH.cap = s => s.charAt(0).toUpperCase() + s.slice(1);
AH.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

AH.makeCanvas = function (w, h, readback) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', readback ? { willReadFrequently: true } : undefined); x.imageSmoothingEnabled = false;
  return c;
};
