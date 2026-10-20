'use strict';
// Saves live in this browser (localStorage). Export/import moves a hero between devices.
AH.Save = (function () {
  const KEY = 'ashheart.v1.slots', OPT = 'ashheart.v1.options';
  const MAX = 6;
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(s) ? s : []; } catch (e) { return []; }
  }
  function store(slots) { try { localStorage.setItem(KEY, JSON.stringify(slots)); return true; } catch (e) { return false; } }
  function put(i, data) { const s = load(); s[i] = data; return store(s); }
  function remove(i) { const s = load(); s.splice(i, 1); store(s); }
  function newWorld() {
    return { seed: (Math.random() * 1e9) >>> 0, day: 1, hour: 8, weather: 'clear', trust: 60, pop: 40, bounties: [], active: [], bountyDay: 0, stash: new Array(40).fill(null), nemeses: [], visits: 0, storyDone: false, seenIntro: false, rescue: null };
  }
  function exportSlot(i) {
    const s = load()[i]; if (!s) return;
    const blob = new Blob([JSON.stringify({ ashheart: 1, v: AH.VERSION, slot: s })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'ashheart-' + (s.ch.name || 'hero').toLowerCase().replace(/[^a-z0-9]/g, '') + '.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function importFile(cb) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (!d || !d.ashheart || !d.slot || !d.slot.ch) throw new Error('bad');
          const s = load(); if (s.length >= MAX) { cb(false, 'ALL SLOTS ARE FULL'); return; }
          s.push(d.slot); store(s); cb(true);
        } catch (e) { cb(false, 'NOT AN ASHHEART SAVE'); }
      };
      r.readAsText(f);
    };
    inp.click();
  }
  function options() { try { return Object.assign({ music: 0.5, sfx: 0.6, shake: true }, JSON.parse(localStorage.getItem(OPT) || '{}')); } catch (e) { return { music: 0.5, sfx: 0.6, shake: true }; } }
  function setOptions(o) { try { localStorage.setItem(OPT, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  return { load, store, put, remove, newWorld, exportSlot, importFile, options, setOptions, MAX };
})();
