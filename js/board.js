'use strict';
// The leaderboard. The game only reads it (board/data.json next to the game on its website).
// Results go in through a GitHub issue: a small robot (the GitHub Action in the repository) checks them and writes the board.
(function () {
  const U = AH.UI;
  const B = AH.Board = { data: null, status: 'idle', t: 0 };
  // where the game lives: USER.github.io/REPO/
  B.repo = function () {
    const h = location.hostname || '';
    if (!/\.github\.io$/i.test(h)) return null;
    const owner = h.split('.')[0], repo = (location.pathname.split('/')[1] || '').trim();
    return repo ? { owner, repo } : null;
  };
  B.load = function (force) {
    if (B.status === 'loading' || (!force && B.data && Date.now() - B.t < 120000)) return;
    if (!location.protocol.startsWith('http')) { B.status = 'offline'; return; }
    B.status = 'loading';
    // the freshest copy lives in the repository itself (the website copy can lag a few minutes behind)
    const R = B.repo(), q = '?_=' + Math.floor(Date.now() / 60000);
    const urls = (R ? ['main', 'master'].map(br => 'https://raw.githubusercontent.com/' + R.owner + '/' + R.repo + '/' + br + '/board/data.json' + q) : []).concat(['board/data.json' + q]);
    const next = i => {
      if (i >= urls.length) { B.status = B.data ? 'ok' : 'none'; return; }
      fetch(urls[i], { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => { B.data = d; B.status = 'ok'; B.t = Date.now(); if (AH.game) for (const p of AH.game.players) p.recalc && p.recalc(); })
        .catch(() => next(i + 1));
    };
    next(0);
  };
  B.mine = n => { const o = AH.options || {}; const up = String(n || '').toUpperCase(); return !!up && (up === String(o.nick || '').toUpperCase() || (o.nicks || []).some(x => x && String(x).toUpperCase() === up)); };
  const better = (a, b) => a.f > b.f || (a.f === b.f && a.t < b.t);
  B.placeFor = function (res) {
    const d = B.data; if (!d || !d.weeks || !d.weeks[res.wk]) return null;
    const list = d.weeks[res.wk][res.pl.length > 1 ? 'team' : 'solo'] || [];
    return 1 + list.filter(e => better(e, res) && !(res.pl.length === 1 && e.p === res.pl[0].n)).length;
  };

  // ---------- sending a result: a real link the player clicks (browsers block pop-ups from games) ----------
  B.submit = function (G, m, code) {
    const R = B.repo();
    const b = AH.Box.box('SUBMIT TO THE LEADERBOARD');
    if (!R) {
      AH.Box.note(b, 'THE LEADERBOARD WORKS WHEN THE GAME RUNS FROM ITS GITHUB WEBSITE. HERE IS YOUR RESULT CODE:');
      codeArea(b, code);
    } else {
      AH.Box.note(b, '1. CLICK THE BUTTON. GITHUB OPENS WITH EVERYTHING FILLED IN.', '#f2e3b3');
      AH.Box.note(b, '2. PRESS "SUBMIT NEW ISSUE" (YOU NEED A FREE GITHUB ACCOUNT).', '#f2e3b3');
      AH.Box.note(b, '3. ABOUT A MINUTE LATER YOUR RESULT IS ON THE BOARD.', '#f2e3b3');
      const body = 'ASHHEART RESULT\n\n```\n' + code + '\n```\n\n(do not edit the code)';
      const url = 'https://github.com/' + R.owner + '/' + R.repo + '/issues/new?title=' + encodeURIComponent('ASHHEART RESULT') + '&body=' + encodeURIComponent(body);
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = AH.tr('OPEN GITHUB AND SEND'); a.style.cssText = AH.Box.css.btn + 'text-decoration:none;font-size:16px;';
      b.appendChild(a);
      codeArea(b, code, true);
    }
    const row = document.createElement('div'); b.appendChild(row);
    row.appendChild(AH.Box.btn('CLOSE', () => { m.boxDone = true; }));
    m.box = true;
  };
  B.showCode = function (G, m, code) {
    const b = AH.Box.box('RESULT CODE');
    codeArea(b, code);
    b.appendChild(AH.Box.btn('CLOSE', () => { m.boxDone = true; }));
    m.box = true;
  };
  function codeArea(b, code, small) {
    const ta = document.createElement('textarea'); ta.readOnly = true; ta.value = code;
    ta.style.cssText = 'width:min(86vw,560px);height:' + (small ? 50 : 80) + 'px;background:#0c0a10;color:#cfc6b4;border:1px solid #5a4e66;font:11px monospace;user-select:text;-webkit-user-select:text;word-break:break-all;';
    b.appendChild(ta);
    b.appendChild(AH.Box.btn('COPY', () => { ta.select(); try { navigator.clipboard.writeText(code); } catch (e) { document.execCommand('copy'); } }));
  }
  // a menu that has a code box open waits for it to close
  B.boxWait = function (G, m, dt) {
    if (!m.box) return false;
    const n = U.nav(G, m, dt);
    if (m.boxDone || n.p.b || n.p.start) { AH.Box.close(); m.box = false; m.boxDone = false; }
    return true;
  };

  // the season progress of a seasonal hero
  B.seasonCode = function (p) {
    const c = AH.Season && AH.Season.now(); if (!c || p.ch.season !== c.n) return null;
    const o = AH.options;
    const res = { k: 's', s: c.n, v: AH.VERSION, p: o.nick || 'P1', h: p.ch.name, c: p.ch.cls, l: p.ch.level, f: p.ch.deepest || 0, df: p.ch.diff || 0, id: p.ch.created, d: Date.now() };
    return AH.Weekly.code(res).replace(/^AHW1/, 'AHS1');
  };

  // ---------- the board menu ----------
  B.TABS = ['THIS WEEK', 'TEAMS', 'SEASON', 'SEASON HEROES'];
  U.init.board = function (G, m) { m.tab = m.tab || 0; m.scroll = 0; m.cls = -1; B.load(true); };
  U.update.board = function (G, m, dt) {
    const n = U.nav(G, m, dt);
    const kb = ((m.dev || m.lastDev || 'kb1') + '').startsWith('kb');
    if (kb && (n.p.pot || n.p.mana)) { n.p.lb = n.p.pot; n.p.rb = n.p.mana; }
    const M = AH.Mouse; let pt = null;
    if (M && M.tap) { pt = M.tap; M.tap = null; } else if (M && M.active && !AH.isTouch && M.leftPressed) { pt = M.uiPos(); M.leftPressed = false; }
    if (M && M.rightPressed) { M.rightPressed = false; n.p.b = true; }
    if (pt && pt.y >= 30 && pt.y < 46) for (let i = 0; i < B.TABS.length; i++) if (pt.x >= 20 + i * 112 && pt.x < 128 + i * 112) { m.tab = i; m.scroll = 0; AH.Audio.sfx('move'); }
    if (n.p.lb || n.p.rb || n.dx) { m.tab = (m.tab + (n.p.rb || n.dx > 0 ? 1 : -1) + B.TABS.length) % B.TABS.length; m.scroll = 0; AH.Audio.sfx('move'); }
    if (n.dy) m.scroll = Math.max(0, m.scroll + n.dy);
    if (n.p.y) { m.cls = m.cls + 1 >= AH.CLASS_KEYS.length ? -1 : m.cls + 1; m.scroll = 0; AH.Audio.sfx('move'); }
    if (n.p.x && m.p && !m.p.remote) { const code = B.seasonCode(m.p); if (code) B.submit(G, m, code); }
    if (n.p.a) B.load(true);
    if (n.p.b || n.p.start) G.closeMenu();
  };
  B.rows = function (m) {
    const d = B.data; if (!d) return [];
    const c = AH.Season && AH.Season.now();
    const cf = m.cls >= 0 ? AH.CLASS_KEYS[m.cls] : null;
    const wk = (d.weeks || {})[AH.Weekly.key()] || {};
    if (m.tab === 0) return (wk.solo || []).filter(e => !cf || e.c === cf).map((e, i) => ({ me: B.mine(e.p), cols: [e.p, e.h, AH.tr(AH.CLASSES[e.c] ? AH.CLASSES[e.c].name : e.c), '' + e.l, AH.tr('FLOOR') + ' ' + e.f, AH.fmtTime(e.t).split('.')[0]] }));
    if (m.tab === 1) return (wk.team || []).filter(e => !cf || e.pl.some(x => x.c === cf)).map(e => ({ me: e.pl.some(x => B.mine(x.p)), cols: [e.pl.map(x => x.p).join(' + '), e.pl.map(x => x.h).join(' & '), '', '', AH.tr('FLOOR') + ' ' + e.f, AH.fmtTime(e.t).split('.')[0]] }));
    const s = c && d.seasons ? d.seasons[c.n] || {} : {};
    if (m.tab === 2) return (s.points || []).map(e => ({ me: B.mine(e.p), cols: [e.p, '', '', '', e.pts + ' ' + AH.tr('POINTS'), ''] }));
    return (s.heroes || []).filter(e => !cf || e.c === cf).map(e => ({ me: B.mine(e.p), cols: [e.p, e.h, AH.tr(AH.CLASSES[e.c] ? AH.CLASSES[e.c].name : e.c), '' + e.l, AH.tr('FLOOR') + ' ' + e.f, AH.tr((AH.DIFFS[e.df] || AH.DIFFS[0]).name)] }));
  };
  U.draw.board = function (G, ctx, m) {
    U.bg(ctx); U.title(ctx, 'LEADERBOARD', 8);
    B.TABS.forEach((t, i) => { const x = 20 + i * 112, on = i === m.tab; AH.frame(ctx, x, 30, 108, 15, on ? { fill: '#2e2638', edge: '#c9a24a', hi: '#f2e3b3' } : { fill: '#120e14' }); AH.text(ctx, x + 54, 34, t, on ? '#ffb347' : '#8d8494', { align: 'center', maxW: 104 }); });
    const c = AH.Season && AH.Season.now();
    let sub = m.tab < 2 ? AH.tr('WEEK') + ' ' + AH.Weekly.key().slice(6) + ' - ' + AH.tr('ENDS IN') + ' ' + AH.Weekly.fmtLeft(AH.Weekly.endsIn()) : c ? AH.tr('SEASON') + ' ' + c.n + ': ' + AH.tr(c.theme.name) + ' - ' + AH.Season.leftText() : 'NO SEASON YET';
    if (m.cls >= 0 && m.tab !== 2) sub += '   ' + AH.tr('ONLY') + ' ' + AH.tr(AH.CLASSES[AH.CLASS_KEYS[m.cls]].name);
    AH.text(ctx, AH.UW / 2, 50, sub, '#8d8494', { align: 'center' });
    AH.frame(ctx, 14, 60, 452, m.tab >= 2 ? 156 : 180, { fill: '#100c14' });
    if (B.status !== 'ok' || !B.data) {
      const msg = { loading: 'LOADING...', offline: 'THE LEADERBOARD WORKS WHEN THE GAME RUNS FROM ITS WEBSITE.', none: 'NO LEADERBOARD YET - OR NO INTERNET.', idle: 'LOADING...' }[B.status] || 'LOADING...';
      AH.wrap(msg, 420).forEach((l, i) => AH.text(ctx, AH.UW / 2, 120 + i * 10, l, '#a39bb0', { align: 'center' }));
    } else {
      const rows = B.rows(m), per = m.tab >= 2 ? 12 : 14;
      m.scroll = Math.min(m.scroll, Math.max(0, rows.length - per));
      const X = [20, 40, 140, 240, 300, 340, 420];
      if (!rows.length) AH.text(ctx, AH.UW / 2, 120, 'NOBODY YET. BE THE FIRST!', '#a39bb0', { align: 'center' });
      rows.slice(m.scroll, m.scroll + per).forEach((r, j) => {
        const i = j + m.scroll, y = 66 + j * 12;
        if (r.me) AH.rect(ctx, 16, y - 2, 448, 11, '#2e2638');
        const col = i === 0 ? '#ffd36a' : i === 1 ? '#d8d8e0' : i === 2 ? '#e0a070' : r.me ? '#ffb347' : '#cfc6b4';
        AH.text(ctx, X[0], y, (i + 1) + '.', col);
        r.cols.forEach((v, k) => { if (v) AH.text(ctx, X[k + 1], y, v, k === 0 ? col : '#a39bb0', { maxW: (X[k + 2] || 460) - X[k + 1] - 4 }); });
      });
      // my own place when I am below the visible part
      const mineAt = rows.findIndex(r => r.me);
      if (mineAt >= m.scroll + per) AH.text(ctx, AH.UW / 2, 66 + per * 12, AH.tr('YOUR PLACE') + ': ' + (mineAt + 1) + '. ' + rows[mineAt].cols.join(' '), '#ffb347', { align: 'center', maxW: 440 });
    }
    if (m.tab >= 2 && c) {
      // the shared shaft
      const sh = AH.Season.shaft(), M = AH.Season.MILES, top = M[M.length - 1].d;
      AH.text(ctx, 20, 222, AH.tr('THE SHARED SHAFT') + ': ' + sh + ' ' + AH.tr('FLOORS'), c.theme.col);
      AH.rect(ctx, 20, 232, 440, 6, '#2a2430'); AH.rect(ctx, 20, 232, Math.round(440 * Math.min(1, sh / top)), 6, c.theme.col);
      M.forEach(ms => { const x = 20 + Math.round(440 * ms.d / top); AH.rect(ctx, x - 1, 229, 2, 12, sh >= ms.d ? '#f2e3b3' : '#5a4e66'); });
      const next = M.find(ms => sh < ms.d);
      AH.text(ctx, 20, 243, next ? AH.tr('NEXT') + ' (' + next.d + '): ' + AH.tr(next.lab) : 'EVERY MILESTONE REACHED!', '#a39bb0', { maxW: 440 });
    }
    const dev = m.dev || m.lastDev || 'kb1', kb = dev.startsWith('kb');
    const seasonal = m.p && AH.Season && AH.Season.active(m.p.ch);
    U.hint(ctx, (kb ? AH.Input.label(dev, 'pot') + '/' + AH.Input.label(dev, 'mana') : U.btnName(G, m, 'lb') + '/' + U.btnName(G, m, 'rb')) + ' TABS   ' + U.btnName(G, m, 'y') + ' CLASS   ' + (seasonal ? U.btnName(G, m, 'x') + ' SUBMIT MY HERO   ' : '') + U.btnName(G, m, 'a') + ' REFRESH   ' + U.btnName(G, m, 'b') + ' BACK');
  };
  // read the board early so the shared shaft and places are known
  setTimeout(() => B.load(), 1500);
  // menus that open a code box wait for it to close
  for (const k of ['wkresult', 'board']) {
    const orig = U.update[k];
    U.update[k] = function (G, m, dt) { if (B.boxWait(G, m, dt)) return; orig(G, m, dt); };
  }
})();

AH.addI18n(`
OPEN GITHUB AND SEND|OUVRIR GITHUB ET ENVOYER|GITHUB MEGNYITÁSA ÉS KÜLDÉS
1. CLICK THE BUTTON. GITHUB OPENS WITH EVERYTHING FILLED IN.|1. CLIQUE SUR LE BOUTON. GITHUB S'OUVRE AVEC TOUT DÉJÀ REMPLI.|1. KATTINTS A GOMBRA. A GITHUB MINDENT KITÖLTVE NYÍLIK MEG.
2. PRESS "SUBMIT NEW ISSUE" (YOU NEED A FREE GITHUB ACCOUNT).|2. APPUIE SUR "SUBMIT NEW ISSUE" (IL FAUT UN COMPTE GITHUB GRATUIT).|2. NYOMD MEG A "SUBMIT NEW ISSUE" GOMBOT (INGYENES GITHUB-FIÓK KELL).
3. ABOUT A MINUTE LATER YOUR RESULT IS ON THE BOARD.|3. ENVIRON UNE MINUTE PLUS TARD, TON RÉSULTAT EST AU CLASSEMENT.|3. KB. EGY PERC MÚLVA OTT AZ EREDMÉNYED A RANGSORBAN.
THE LEADERBOARD WORKS WHEN THE GAME RUNS FROM ITS GITHUB WEBSITE. HERE IS YOUR RESULT CODE:|LE CLASSEMENT MARCHE QUAND LE JEU TOURNE DEPUIS SON SITE GITHUB. VOICI TON CODE :|A RANGSOR AKKOR MŰKÖDIK, HA A JÁTÉK A GITHUBOS WEBOLDALÁRÓL FUT. ITT AZ EREDMÉNYKÓDOD:
RESULT CODE|CODE DU RÉSULTAT|EREDMÉNYKÓD
THIS WEEK|CETTE SEMAINE|EZ A HÉT
TEAMS|ÉQUIPES|CSAPATOK
SEASON HEROES|HÉROS DE SAISON|SZEZON HŐSEI
POINTS|POINTS|PONT
ONLY|SEULEMENT|CSAK
NO SEASON YET|PAS ENCORE DE SAISON|MÉG NINCS SZEZON
LOADING...|CHARGEMENT...|BETÖLTÉS...
THE LEADERBOARD WORKS WHEN THE GAME RUNS FROM ITS WEBSITE.|LE CLASSEMENT MARCHE QUAND LE JEU TOURNE DEPUIS SON SITE.|A RANGSOR AKKOR MŰKÖDIK, HA A JÁTÉK A WEBOLDALÁRÓL FUT.
NO LEADERBOARD YET - OR NO INTERNET.|PAS ENCORE DE CLASSEMENT - OU PAS D'INTERNET.|MÉG NINCS RANGSOR - VAGY NINCS INTERNET.
NOBODY YET. BE THE FIRST!|PERSONNE ENCORE. SOIS LE PREMIER !|MÉG SENKI. LEGYÉL TE AZ ELSŐ!
YOUR PLACE|TA PLACE|A HELYED
THE SHARED SHAFT|LE PUITS COMMUN|A KÖZÖS AKNA
FLOORS|ÉTAGES|SZINT
NEXT|SUIVANT|KÖVETKEZŐ
EVERY MILESTONE REACHED!|TOUS LES PALIERS ATTEINTS !|MINDEN MÉRFÖLDKŐ MEGVAN!
CLASS|CLASSE|KASZT
SUBMIT MY HERO|ENVOYER MON HÉROS|HŐSÖM BEKÜLDÉSE
REFRESH|ACTUALISER|FRISSÍTÉS
`);
