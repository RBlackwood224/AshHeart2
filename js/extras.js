'use strict';
// Names (typing + the rude-word filter), hero save codes and the QR code that carries a hero to a phone.
(function () {
  const U = AH.UI;

  // ---------- rude-word filter (Hungarian, English, French) ----------
  // letters are folded (accents off, 0->o, 1->i, 4->a ...) and joiners are dropped before matching
  const SUB = ['fasz', 'geci', 'kurva', 'picsa', 'pina', 'buzi', 'csicska', 'kocsog', 'bazdmeg', 'bazmeg', 'baszd', 'baszo', 'baszni', 'szopj', 'szopo', 'seggfej', 'segglyuk', 'nyomorek', 'kurvany', 'ribanc', 'cigo', 'zsido',
    'fuck', 'fuk', 'shit', 'cunt', 'dick', 'cock', 'pussy', 'bitch', 'whore', 'slut', 'nigg', 'nigga', 'fagg', 'rape', 'penis', 'porn', 'wank', 'twat', 'retard', 'hitler', 'nazi', 'jizz', 'boob', 'tits', 'anus', 'dildo', 'kkk',
    'merde', 'putain', 'pute', 'salope', 'connard', 'encule', 'nique', 'batard', 'couille', 'branl'];
  const WORD = ['pd', 'ass', 'anal', 'sex', 'cul', 'bite', 'con', 'conne', 'chatte', 'szar', 'szaros', 'segg', 'fos', 'hugy', 'pisa', 'kaka', 'cum', 'tit', 'fag', 'hoe', 'nig'];
  const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/!/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/@/g, 'a').replace(/5/g, 's').replace(/\$/g, 's').replace(/7/g, 't').replace(/8/g, 'b').replace(/9/g, 'g');
  AH.badName = function (s) {
    const f = fold(s);
    const flat = f.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
    const flat2 = f.replace(/[^a-z]/g, '');
    if (SUB.some(w => { const c = w.replace(/(.)\1+/g, '$1'); return (c.length >= 3 && flat.indexOf(c) >= 0) || flat2.indexOf(w) >= 0; })) return true;
    const words = f.split(/[^a-z]+/).filter(Boolean);
    if (words.some(w => WORD.indexOf(w) >= 0 || WORD.indexOf(w.replace(/(.)\1+/g, '$1')) >= 0)) return true;
    if (WORD.indexOf(flat) >= 0) return true;
    return false;
  };

  // ---------- a small typing menu: keyboard types, controllers use a letter grid, phones get their own keyboard ----------
  U.askName = function (G, m, title, init, cb, opt) {
    G.openMenu('textin', m && m.p, Object.assign({ dev: m && m.dev, title, value: init || '', cb, max: 12 }, opt || {}));
  };
  U.init.textin = function (G, m) {
    m.gridSel = 0; m.err = '';
    m.keyHandler = e => {
      if (G.menu !== m) return;
      if (document.activeElement && document.activeElement.id === 'textInput') return;
      m.kb = true;
      if (U.NAME_CHAR.test(e.key) && m.value.length < m.max) { if (!e.repeat) { m.value += e.key.toUpperCase(); m.err = ''; AH.Audio.sfx('move'); } }
      else if (e.key === ' ' && m.value.length && m.value.length < m.max && !m.value.endsWith(' ')) m.value += ' ';
      else if (e.key === 'Backspace') m.value = m.value.slice(0, -1);
      else if (e.key === 'Enter') U.textDone(G, m);
      else if (e.key === 'Escape') U.textClose(G, m);
      e.preventDefault();
    };
    window.addEventListener('keydown', m.keyHandler);
    m.skip = 0.2;
  };
  U.textClose = function (G, m) { window.removeEventListener('keydown', m.keyHandler); U.textInput(m, false); if (G.menu === m) G.closeMenu(); };
  U.textDone = function (G, m) {
    const v = m.value.trim();
    if (!v.length) { m.err = 'TYPE SOMETHING FIRST'; AH.Audio.sfx('error'); return; }
    if (AH.badName(v)) { m.err = 'THIS NAME CANNOT BE USED'; AH.Audio.sfx('error'); return; }
    U.textClose(G, m); if (m.cb) m.cb(v); AH.Audio.sfx('select');
  };
  U.textInput = function (m, show) {
    let el = document.getElementById('textInput');
    if (!show) { if (el) { el.blur(); el.remove(); } return; }
    if (el) return;
    el = document.createElement('input'); el.id = 'textInput'; el.type = 'text'; el.maxLength = m.max; el.value = m.value; el.autocomplete = 'off'; el.spellcheck = false;
    el.setAttribute('autocapitalize', 'characters');
    el.style.cssText = 'position:fixed;left:50%;top:40%;transform:translateX(-50%);width:60vw;max-width:340px;font:bold 22px monospace;text-align:center;text-transform:uppercase;background:#16101c;color:#ffb347;border:2px solid #c9a24a;padding:8px;z-index:50;outline:none;border-radius:0;user-select:text;-webkit-user-select:text;';
    el.addEventListener('input', () => { const v = el.value.toUpperCase().split('').filter(c => c === ' ' || U.NAME_CHAR.test(c)).join('').slice(0, m.max); if (v !== el.value) el.value = v; m.value = v; m.err = ''; });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); U.textDone(AH.game, m); } });
    document.body.appendChild(el);
  };
  U.update.textin = function (G, m, dt) {
    const n = U.nav(G, m, dt);
    if (m.skip > 0) { m.skip -= dt; return; }
    if (AH.isTouch) { U.textInput(m, true); if (n.p.b) U.textClose(G, m); if (n.p.start) U.textDone(G, m); return; }
    const kb = m.kb || (m.dev && m.dev.startsWith('kb')) || (m.lastDev && m.lastDev.startsWith('kb'));
    if (kb) return;
    const L = U.GRID.length;
    if (n.dx) { m.gridSel = (m.gridSel + n.dx + L) % L; AH.Audio.sfx('move'); }
    if (n.dy) { m.gridSel = AH.clamp(m.gridSel + n.dy * 10, 0, L - 1); AH.Audio.sfx('move'); }
    if (n.p.a) { const k = U.GRID[m.gridSel]; if (k === 'DEL') m.value = m.value.slice(0, -1); else if (k === 'OK') U.textDone(G, m); else if (m.value.length < m.max) { m.value += k; m.err = ''; } AH.Audio.sfx('select'); }
    if (n.p.x) m.value = m.value.slice(0, -1);
    if (n.p.start) U.textDone(G, m);
    if (n.p.b) U.textClose(G, m);
  };
  U.draw.textin = function (G, ctx, m) {
    U.bg(ctx); U.title(ctx, m.title, 30);
    AH.frame(ctx, 40, 60, 400, 150, { fill: '#120e14', edge: '#c9a24a', hi: '#f2e3b3' });
    AH.text(ctx, UWc() / 2, 72, m.value + (Math.floor(G.time * 2) % 2 ? '_' : ' '), '#ffb347', { align: 'center', scale: 2 });
    const kb = m.kb || (m.dev && m.dev.startsWith('kb')) || (m.lastDev && m.lastDev.startsWith('kb'));
    if (!kb && !AH.isTouch) U.GRID.forEach((k, i) => {
      const cx = 102 + (i % 10) * 28, cy = 100 + Math.floor(i / 10) * 17;
      if (i === m.gridSel) AH.frame(ctx, cx - 4, cy - 4, k.length > 1 ? 30 : 18, 15, { fill: '#2e2638', edge: '#c9a24a', hi: '#f2e3b3' });
      AH.text(ctx, cx, cy, k, i === m.gridSel ? '#ffb347' : '#cfc6b4');
    });
    if (m.err) AH.text(ctx, UWc() / 2, 190, m.err, '#ff6a5a', { align: 'center' });
    if (m.note) AH.wrap(m.note, 390).forEach((l, i) => AH.text(ctx, UWc() / 2, 218 + i * 10, l, '#a39bb0', { align: 'center' }));
    U.hint(ctx, kb ? 'TYPE   ENTER: DONE   ESC: BACK' : AH.isTouch ? 'II: DONE   B: BACK' : U.btnName(G, m, 'a') + ' LETTER   START: DONE   ' + U.btnName(G, m, 'b') + ' BACK');
  };
  const UWc = () => AH.UW;

  // ---------- hero save codes ----------
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
  const pipe = async (bytes, stream) => { const r = new Blob([bytes]).stream().pipeThrough(stream); return new Uint8Array(await new Response(r).arrayBuffer()); };
  const sum = s => (AH.hashStr('ash' + s + 'heart') % 1679616).toString(36).toUpperCase().padStart(4, '0');
  // the slot without what the town rebuilds by itself
  const slim = slot => {
    const s = JSON.parse(JSON.stringify(slot));
    if (s.world) { delete s.world.stock; delete s.world.bounties; delete s.world.stockDay; delete s.world.bountyDay; }
    return s;
  };
  AH.heroCode = async function (slot, noStash) {
    const s = slim(slot); if (noStash && s.world) s.world.stash = new Array(40).fill(null);
    const json = JSON.stringify({ ashheart: 2, slot: s });
    let body, tag;
    if (typeof CompressionStream !== 'undefined') { body = b64(await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw'))); tag = 'ASH1'; }
    else { body = b64(new TextEncoder().encode(json)); tag = 'ASH0'; }
    return tag + '.' + body + '.' + sum(body);
  };
  AH.readHeroCode = async function (code) {
    code = String(code || '').replace(/\s+/g, '');
    const h = code.indexOf('#h='); if (h >= 0) code = decodeURIComponent(code.slice(h + 3));
    const p = code.split('.');
    if (p.length !== 3 || (p[0] !== 'ASH1' && p[0] !== 'ASH0')) throw new Error('NOT A HERO CODE');
    if (sum(p[1]) !== p[2]) throw new Error('THE CODE IS BROKEN OR INCOMPLETE');
    let bytes = unb64(p[1]);
    if (p[0] === 'ASH1') { if (typeof DecompressionStream === 'undefined') throw new Error('THIS BROWSER IS TOO OLD FOR CODES'); bytes = await pipe(bytes, new DecompressionStream('deflate-raw')); }
    const d = JSON.parse(new TextDecoder().decode(bytes));
    if (!d || !d.slot || !d.slot.ch || !d.slot.ch.cls) throw new Error('NOT A HERO CODE');
    return d.slot;
  };
  AH.addHeroSlot = function (slot) {
    const slots = AH.Save.load();
    if (slot.world && !slot.world.stash) slot.world.stash = new Array(40).fill(null);
    const i = slots.findIndex(s => s && s.ch && s.ch.created === slot.ch.created);
    if (i >= 0) { slots[i] = slot; AH.Save.store(slots); return 'HERO UPDATED'; }
    if (slots.length >= AH.Save.MAX) return null;
    slots.push(slot); AH.Save.store(slots); return 'HERO ADDED';
  };

  // ---------- the code window (a real page box so the code can be copied, pasted and scanned) ----------
  const css = 'position:fixed;inset:0;z-index:60;background:rgba(6,4,10,0.92);display:flex;align-items:center;justify-content:center;font:bold 13px monospace;color:#e9e2d0;';
  const boxCss = 'background:#15121b;border:2px solid #c9a24a;padding:14px;max-width:min(92vw,720px);max-height:92vh;overflow:auto;display:flex;flex-direction:column;gap:10px;align-items:center;box-sizing:border-box;';
  const btnCss = 'font:bold 14px monospace;background:#2e2638;color:#ffb347;border:2px solid #c9a24a;padding:8px 14px;cursor:pointer;';
  function closeBox() { const el = document.getElementById('codeBox'); if (el) el.remove(); }
  AH.codeBoxOpen = () => !!document.getElementById('codeBox');
  function box(title) {
    closeBox();
    const wrap = document.createElement('div'); wrap.id = 'codeBox'; wrap.style.cssText = css;
    const b = document.createElement('div'); b.style.cssText = boxCss; wrap.appendChild(b);
    const t = document.createElement('div'); t.textContent = AH.tr(title); t.style.cssText = 'color:#ffb347;font-size:18px;'; b.appendChild(t);
    wrap.addEventListener('keydown', e => e.stopPropagation());
    document.body.appendChild(wrap);
    return b;
  }
  const mkBtn = (label, fn) => { const x = document.createElement('button'); x.textContent = AH.tr(label); x.style.cssText = btnCss; x.onclick = fn; return x; };
  const note = (b, s, col) => { const d = document.createElement('div'); d.textContent = AH.tr(s); d.style.cssText = 'color:' + (col || '#a39bb0') + ';text-align:center;max-width:620px;'; b.appendChild(d); return d; };

  AH.Box = { box, close: closeBox, btn: mkBtn, note, css: { btn: btnCss } };
  U.init.savecode = function (G, m) {
    const slot = AH.Save.load()[m.slot]; if (!slot) { m.done = true; return; }
    const b = box('HERO SAVE CODE');
    note(b, slot.ch.name + ' - ' + AH.CLASSES[slot.ch.cls].name + ' LV ' + slot.ch.level, '#f2e3b3');
    const ta = document.createElement('textarea'); ta.readOnly = true; ta.value = '...';
    ta.style.cssText = 'width:min(86vw,640px);height:90px;background:#0c0a10;color:#cfc6b4;border:1px solid #5a4e66;font:11px monospace;user-select:text;-webkit-user-select:text;word-break:break-all;';
    b.appendChild(ta);
    const msg = note(b, 'COPY THE CODE AND KEEP IT SAFE. ON ANOTHER DEVICE: PLAY > LOAD HERO FROM CODE.');
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;'; b.appendChild(row);
    row.appendChild(mkBtn('COPY', () => { ta.select(); try { navigator.clipboard.writeText(ta.value).then(() => { msg.textContent = AH.tr('COPIED!'); msg.style.color = '#8ae08e'; }, () => document.execCommand('copy')); } catch (e) { document.execCommand('copy'); } }));
    row.appendChild(mkBtn('CLOSE', () => { m.done = true; }));
    const qrWrap = document.createElement('div'); qrWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;'; b.appendChild(qrWrap);
    AH.heroCode(slot).then(async code => {
      ta.value = code;
      const base = location.protocol.startsWith('http') ? location.origin + location.pathname : '';
      let url = base + '#h=' + code, part = false;
      if (url.length > 2900) { url = base + '#h=' + await AH.heroCode(slot, true); part = true; }
      if (base && url.length <= 2900) {
        const c = AH.QR.canvas(url); if (c) { c.style.cssText = 'width:min(70vw,300px);height:auto;image-rendering:pixelated;'; qrWrap.appendChild(c); note(qrWrap, part ? 'SCAN WITH A PHONE. THE QR CODE CARRIES THE HERO WITHOUT THE TOWN STASH (TOO BIG). THE TEXT CODE CARRIES EVERYTHING.' : 'SCAN WITH A PHONE TO OPEN THE GAME WITH THIS HERO.'); }
      } else note(qrWrap, base ? 'THIS HERO IS TOO BIG FOR A QR CODE. COPY THE TEXT CODE INSTEAD.' : 'THE QR CODE WORKS WHEN THE GAME RUNS FROM ITS WEBSITE.');
    }).catch(() => { ta.value = AH.tr('SOMETHING WENT WRONG'); });
  };
  U.update.savecode = function (G, m, dt) {
    const n = U.nav(G, m, dt);
    if (m.done || n.p.b || n.p.start) { closeBox(); G.closeMenu(); }
  };
  U.draw.savecode = function (G, ctx) { U.bg(ctx); };

  U.init.loadcode = function (G, m) {
    const b = box('LOAD HERO FROM CODE');
    note(b, 'PASTE A HERO CODE (OR THE LINK FROM A QR CODE) BELOW.');
    const ta = document.createElement('textarea'); ta.value = m.code || '';
    ta.style.cssText = 'width:min(86vw,640px);height:110px;background:#0c0a10;color:#ffb347;border:1px solid #c9a24a;font:11px monospace;user-select:text;-webkit-user-select:text;word-break:break-all;';
    b.appendChild(ta);
    const msg = note(b, '');
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;'; b.appendChild(row);
    row.appendChild(mkBtn('LOAD', () => {
      AH.readHeroCode(ta.value).then(slot => {
        if (!slot.world) slot.world = AH.Save.newWorld();
        const r = AH.addHeroSlot(slot);
        if (!r) { msg.textContent = AH.tr('ALL SLOTS ARE FULL'); msg.style.color = '#ff8a8a'; return; }
        AH.Audio.sfx('loot'); G.toast(null, AH.tr(r) + ': ' + slot.ch.name, '#8ae08e'); m.done = true;
      }).catch(e => { msg.textContent = AH.tr(e.message && /^[A-Z ]+$/.test(e.message) ? e.message : 'NOT A HERO CODE'); msg.style.color = '#ff8a8a'; AH.Audio.sfx('error'); });
    }));
    row.appendChild(mkBtn('CANCEL', () => { m.done = true; }));
    if (!m.code) setTimeout(() => ta.focus(), 50);
  };
  U.update.loadcode = function (G, m, dt) {
    const n = U.nav(G, m, dt);
    if (m.done || n.p.start) { closeBox(); G.closeMenu(); if (location.hash.indexOf('h=') >= 0) history.replaceState(null, '', location.pathname); }
  };
  U.draw.loadcode = function (G, ctx) { U.bg(ctx); };

  // a link from a QR code: offer the hero right away
  AH.checkHeroLink = function (G) {
    const h = location.hash; if (h.indexOf('#h=') !== 0) return;
    G.openMenu('loadcode', null, { code: decodeURIComponent(h.slice(3)) });
  };
})();

AH.addI18n(`
TYPE SOMETHING FIRST|ÉCRIS QUELQUE CHOSE D'ABORD|ELŐBB ÍRJ BE VALAMIT
THIS NAME CANNOT BE USED|CE NOM NE PEUT PAS ÊTRE UTILISÉ|EZ A NÉV NEM HASZNÁLHATÓ
TYPE   ENTER: DONE   ESC: BACK|TAPE   ENTRÉE : OK   ÉCHAP : RETOUR|ÍRJ   ENTER: KÉSZ   ESC: VISSZA
II: DONE   B: BACK|II : OK   B : RETOUR|II: KÉSZ   B: VISSZA
LETTER|LETTRE|BETŰ
START: DONE|START : OK|START: KÉSZ
HERO SAVE CODE|CODE DE SAUVEGARDE DU HÉROS|HŐS MENTÉSI KÓDJA
COPY THE CODE AND KEEP IT SAFE. ON ANOTHER DEVICE: PLAY > LOAD HERO FROM CODE.|COPIE LE CODE ET GARDE-LE BIEN. SUR UN AUTRE APPAREIL : JOUER > CHARGER UN HÉROS PAR CODE.|MÁSOLD KI A KÓDOT ÉS ŐRIZD MEG. MÁSIK ESZKÖZÖN: JÁTÉK > HŐS BETÖLTÉSE KÓDBÓL.
COPY|COPIER|MÁSOLÁS
COPIED!|COPIÉ !|KIMÁSOLVA!
CLOSE|FERMER|BEZÁRÁS
CANCEL|ANNULER|MÉGSE
LOAD|CHARGER|BETÖLTÉS
LOAD HERO FROM CODE|CHARGER UN HÉROS PAR CODE|HŐS BETÖLTÉSE KÓDBÓL
PASTE A HERO CODE (OR THE LINK FROM A QR CODE) BELOW.|COLLE UN CODE DE HÉROS (OU LE LIEN D'UN QR CODE) CI-DESSOUS.|ILLESZD BE A HŐS KÓDJÁT (VAGY A QR-KÓD LINKJÉT) IDE.
NOT A HERO CODE|CE N'EST PAS UN CODE DE HÉROS|EZ NEM HŐSKÓD
THE CODE IS BROKEN OR INCOMPLETE|LE CODE EST ABÎMÉ OU INCOMPLET|A KÓD SÉRÜLT VAGY HIÁNYOS
THIS BROWSER IS TOO OLD FOR CODES|CE NAVIGATEUR EST TROP ANCIEN POUR LES CODES|EZ A BÖNGÉSZŐ TÚL RÉGI A KÓDOKHOZ
HERO UPDATED|HÉROS MIS À JOUR|HŐS FRISSÍTVE
HERO ADDED|HÉROS AJOUTÉ|HŐS HOZZÁADVA
SOMETHING WENT WRONG|QUELQUE CHOSE S'EST MAL PASSÉ|VALAMI HIBA TÖRTÉNT
SCAN WITH A PHONE TO OPEN THE GAME WITH THIS HERO.|SCANNE AVEC UN TÉLÉPHONE POUR OUVRIR LE JEU AVEC CE HÉROS.|OLVASD BE TELEFONNAL, ÉS A JÁTÉK EZZEL A HŐSSEL NYÍLIK MEG.
SCAN WITH A PHONE. THE QR CODE CARRIES THE HERO WITHOUT THE TOWN STASH (TOO BIG). THE TEXT CODE CARRIES EVERYTHING.|SCANNE AVEC UN TÉLÉPHONE. LE QR CODE TRANSPORTE LE HÉROS SANS LE COFFRE (TROP GROS). LE CODE TEXTE TRANSPORTE TOUT.|OLVASD BE TELEFONNAL. A QR-KÓD A VÁROSI LÁDA NÉLKÜL VISZI A HŐST (TÚL NAGY). A SZÖVEGES KÓD MINDENT VISZ.
THIS HERO IS TOO BIG FOR A QR CODE. COPY THE TEXT CODE INSTEAD.|CE HÉROS EST TROP GROS POUR UN QR CODE. COPIE PLUTÔT LE CODE TEXTE.|EZ A HŐS TÚL NAGY A QR-KÓDHOZ. MÁSOLD KI A SZÖVEGES KÓDOT.
THE QR CODE WORKS WHEN THE GAME RUNS FROM ITS WEBSITE.|LE QR CODE MARCHE QUAND LE JEU TOURNE DEPUIS SON SITE.|A QR-KÓD AKKOR MŰKÖDIK, HA A JÁTÉK A WEBOLDALÁRÓL FUT.
SAVE CODE|CODE DE SAUVEGARDE|MENTÉSI KÓD
`);
