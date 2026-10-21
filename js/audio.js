'use strict';
// Synth sound effects + optional music files (music/town.mp3, music/mine.mp3, music/boss.mp3, music/title.mp3)
AH.Audio = (function () {
  let ctx = null, master = null, unlocked = false;
  let musicVol = 0.5, sfxVol = 0.6;
  const tracks = {};
  let current = null, playing = null;
  // ears hear volume logarithmically, and the songs are mastered loud: 10% on the slider is really quiet
  const curve = v => Math.max(0, Math.min(1, v * v * 0.45));
  // the mine rotates through up to three tracks: music/mine.mp3, mine2.mp3, mine3.mp3
  const PLAYLISTS = { mine: ['mine', 'mine2', 'mine3'] };
  function unlock() {
    if (unlocked) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = sfxVol; master.connect(ctx.destination);
      unlocked = true;
      const pl = playing && tracks[playing]; if (pl) pl.play().catch(() => {});
    } catch (e) { /* no audio */ }
  }
  function tone(type, f0, f1, dur, vol, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, hp, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const lastT = {};
  function sfx(name) {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (lastT[name] && now - lastT[name] < 0.04) return;
    lastT[name] = now;
    switch (name) {
      case 'swing': noise(0.08, 0.18, 2500); break;
      case 'heavy': noise(0.16, 0.25, 900); tone('sawtooth', 160, 60, 0.18, 0.08); break;
      case 'hit': tone('square', 220, 90, 0.08, 0.12); noise(0.05, 0.15, 1500); break;
      case 'crit': tone('square', 520, 180, 0.12, 0.14); noise(0.07, 0.2, 2000); break;
      case 'hurt': tone('sawtooth', 180, 70, 0.2, 0.18); break;
      case 'kill': tone('square', 300, 50, 0.22, 0.12); noise(0.12, 0.12, 600); break;
      case 'coin': tone('square', 1320, 0, 0.06, 0.08); tone('square', 1760, 0, 0.08, 0.07, 0.05); break;
      case 'pickup': tone('triangle', 660, 990, 0.1, 0.12); break;
      case 'loot': tone('triangle', 520, 0, 0.08, 0.12); tone('triangle', 780, 0, 0.1, 0.1, 0.07); tone('triangle', 1040, 0, 0.14, 0.1, 0.14); break;
      case 'legend': [523, 659, 784, 1047, 1319].forEach((f, i) => tone('square', f, 0, 0.18, 0.08, i * 0.08)); break;
      case 'dodge': noise(0.12, 0.12, 3000); break;
      case 'shoot': tone('triangle', 900, 300, 0.1, 0.1); break;
      case 'magic': tone('sine', 400, 1200, 0.15, 0.12); tone('triangle', 800, 1600, 0.12, 0.06); break;
      case 'boom': noise(0.4, 0.35, 200); tone('sine', 90, 30, 0.4, 0.3); break;
      case 'frost': tone('sine', 1800, 600, 0.3, 0.08); noise(0.2, 0.08, 4000); break;
      case 'zap': noise(0.1, 0.2, 3500); tone('square', 1200, 200, 0.1, 0.08); break;
      case 'holy': [392, 494, 587].forEach((f, i) => tone('sine', f, 0, 0.4, 0.08, i * 0.03)); break;
      case 'chirp': tone('sine', 2400, 3200, 0.06, 0.08); tone('sine', 2600, 3400, 0.06, 0.08, 0.09); break;
      case 'bark': tone('sawtooth', 300, 150, 0.08, 0.12); tone('sawtooth', 280, 140, 0.08, 0.1, 0.12); break;
      case 'squeak': tone('sine', 1800, 2400, 0.05, 0.06); break;
      case 'door': tone('triangle', 120, 80, 0.15, 0.15); noise(0.1, 0.06, 400); break;
      case 'stairs': [440, 330, 247, 196].forEach((f, i) => tone('triangle', f, 0, 0.12, 0.1, i * 0.08)); break;
      case 'levelup': [392, 523, 659, 784].forEach((f, i) => tone('square', f, 0, 0.2, 0.08, i * 0.1)); break;
      case 'select': tone('square', 880, 0, 0.04, 0.06); break;
      case 'move': tone('square', 660, 0, 0.03, 0.04); break;
      case 'back': tone('square', 440, 330, 0.06, 0.06); break;
      case 'error': tone('square', 160, 120, 0.15, 0.1); break;
      case 'drink': tone('sine', 300, 600, 0.2, 0.1); tone('sine', 400, 700, 0.15, 0.08, 0.15); break;
      case 'block': tone('square', 900, 700, 0.06, 0.1); noise(0.04, 0.1, 3000); break;
      case 'warn': tone('square', 220, 0, 0.3, 0.1); tone('square', 208, 0, 0.3, 0.1, 0.32); break;
      case 'thunder': noise(1.2, 0.3, 80); break;
      case 'dig': noise(0.08, 0.15, 500); noise(0.08, 0.15, 500, 0.14); break;
      case 'break': noise(0.3, 0.3, 300); tone('square', 120, 40, 0.3, 0.12); break;
    }
  }
  function loadTrack(name, loop) {
    if (tracks[name] !== undefined) return;
    const a = new Audio(); a.loop = loop !== false; a.volume = curve(musicVol); a.preload = 'auto';
    tracks[name] = a;
    a.addEventListener('error', () => { tracks[name] = null; if (playing === name) playListNext(); });
    a.addEventListener('ended', () => { if (playing === name && PLAYLISTS[current]) playListNext(); });
    a.src = 'music/' + name + '.mp3';
  }
  let listIdx = 0, listTries = 0;
  function playListNext() { listIdx++; listTries++; playListAt(); }
  function playListAt() {
    const list = PLAYLISTS[current]; if (!list) return;
    if (listTries > list.length) { playing = null; return; }
    const t = list[listIdx % list.length];
    loadTrack(t, false);
    const a = tracks[t];
    if (!a) { playListNext(); return; }
    playing = t; listTries = 0;
    if (unlocked) { a.currentTime = 0; a.play().catch(() => {}); }
  }
  function music(name) {
    if (current === name) return;
    for (const k in tracks) if (tracks[k]) { tracks[k].pause(); }
    current = name; playing = null;
    if (!name) return;
    if (PLAYLISTS[name]) { listIdx = Math.floor(Math.random() * PLAYLISTS[name].length); listTries = 0; playListAt(); return; }
    loadTrack(name);
    const a = tracks[name];
    playing = name;
    if (a && unlocked) { a.currentTime = 0; a.play().catch(() => {}); }
  }
  function setVol(m, s) {
    musicVol = m; sfxVol = s;
    for (const k in tracks) if (tracks[k]) tracks[k].volume = curve(m);
    if (master) master.gain.value = s;
  }
  // phones only allow sound after a tap: any first touch, click or key starts the music, also on the splash screen
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) window.addEventListener(ev, () => {
    unlock();
    const pl = playing && tracks[playing]; if (pl && pl.paused && unlocked) pl.play().catch(() => {});
  }, { passive: true });
  return { unlock, sfx, music, setVol, get musicVol() { return musicVol; }, get sfxVol() { return sfxVol; } };
})();
