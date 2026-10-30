// ASHHEART leaderboard robot. Runs on GitHub when someone opens an issue with a result code.
// No packages needed: plain Node 20.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'board', 'data.json');
const OWNERS = path.join(ROOT, 'board', 'owners.json');
const RUN_TIME = 45 * 60;
const DAY = 864e5;
const SEASON_START = Date.UTC(2026, 9, 26), SEASON_LEN = 56 * DAY;
const CLASSES = ['paladin', 'rogue', 'wizard', 'necro', 'barb', 'priest'];

// ---- the same little hash the game uses ----
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const sum = s => (hashStr('dunmere' + s + 'canary') % 60466176).toString(36).toUpperCase().padStart(5, '0');

// ---- rude names (same list as the game) ----
const SUB = ['fasz', 'geci', 'kurva', 'picsa', 'pina', 'buzi', 'csicska', 'kocsog', 'bazdmeg', 'bazmeg', 'baszd', 'baszo', 'baszni', 'szopj', 'szopo', 'seggfej', 'segglyuk', 'nyomorek', 'kurvany', 'ribanc', 'cigo', 'zsido',
  'fuck', 'fuk', 'shit', 'cunt', 'dick', 'cock', 'pussy', 'bitch', 'whore', 'slut', 'nigg', 'nigga', 'fagg', 'rape', 'penis', 'porn', 'wank', 'twat', 'retard', 'hitler', 'nazi', 'jizz', 'boob', 'tits', 'anus', 'dildo', 'kkk',
  'merde', 'putain', 'pute', 'salope', 'connard', 'encule', 'nique', 'batard', 'couille', 'branl'];
const WORD = ['pd', 'ass', 'anal', 'sex', 'cul', 'bite', 'con', 'conne', 'chatte', 'szar', 'szaros', 'segg', 'fos', 'hugy', 'pisa', 'kaka', 'cum', 'tit', 'fag', 'hoe', 'nig'];
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/0/g, 'o').replace(/1/g, 'i').replace(/!/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/@/g, 'a').replace(/5/g, 's').replace(/\$/g, 's').replace(/7/g, 't').replace(/8/g, 'b').replace(/9/g, 'g');
function badName(s) {
  const f = fold(s);
  const flat = f.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1'), flat2 = f.replace(/[^a-z]/g, '');
  if (SUB.some(w => { const c = w.replace(/(.)\1+/g, '$1'); return (c.length >= 3 && flat.indexOf(c) >= 0) || flat2.indexOf(w) >= 0; })) return true;
  const words = f.split(/[^a-z]+/).filter(Boolean);
  if (words.some(w => WORD.indexOf(w) >= 0 || WORD.indexOf(w.replace(/(.)\1+/g, '$1')) >= 0)) return true;
  return WORD.indexOf(flat) >= 0;
}
const NAME_RX = /^[A-Z0-9ÁÉÍÓÖŐÚÜŰÀÂÇÈÊËÎÏÔÙÛ ]{1,12}$/;
const cleanName = s => String(s || '').toUpperCase().trim();

// ---- weeks and seasons ----
function weekKey(t) {
  const d = new Date(t), x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return x.getUTCFullYear() + '-W' + String(Math.ceil(((x - y0) / DAY + 1) / 7)).padStart(2, '0');
}
const seasonAt = t => t < SEASON_START ? 0 : Math.floor((t - SEASON_START) / SEASON_LEN) + 1;
function seasonOfWeek(key) {
  const y = +key.slice(0, 4), w = +key.slice(6), jan4 = Date.UTC(y, 0, 4), day = new Date(jan4).getUTCDay() || 7;
  return seasonAt(jan4 - (day - 1) * DAY + (w - 1) * 7 * DAY + 3 * DAY);
}

// ---- GitHub ----
const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const issue = ev.issue, login = issue.user && issue.user.login;
const api = (url, method, body) => fetch('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + url, {
  method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body && JSON.stringify(body),
});
async function reply(text, close) {
  await api('/issues/' + issue.number + '/comments', 'POST', { body: text });
  if (close) await api('/issues/' + issue.number, 'PATCH', { state: 'closed' });
}

function check() {
  const m = /(AH[WS]1)\.([A-Za-z0-9_-]+)\.([0-9A-Z]{5})/.exec(issue.body || '');
  if (!m) return { err: 'No result code found. Copy the whole code from the game, please.' };
  if (sum(m[2]) !== m[3]) return { err: 'The code is broken or was changed.' };
  let r;
  try { r = JSON.parse(Buffer.from(m[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch (e) { return { err: 'The code cannot be read.' }; }
  const now = Date.now();
  if (m[1] === 'AHW1') {
    if (r.k !== 'w') return { err: 'Not a weekly result.' };
    const okWeek = r.wk === weekKey(now) || r.wk === weekKey(now - 2 * DAY);
    if (!okWeek) return { err: 'This result belongs to an older week.' };
    if (!Array.isArray(r.pl) || !r.pl.length || r.pl.length > 3) return { err: 'Players are missing.' };
    for (const p of r.pl) {
      p.n = cleanName(p.n); p.h = cleanName(p.h);
      if (!NAME_RX.test(p.n) || !NAME_RX.test(p.h)) return { err: 'A name has letters the game does not allow.' };
      if (badName(p.n) || badName(p.h)) return { err: 'A name is not allowed.' };
      if (CLASSES.indexOf(p.c) < 0 || !(p.l >= 1 && p.l <= 99)) return { err: 'A hero looks wrong.' };
    }
    const f = r.f | 0, t = Math.round(r.t), kills = r.kills | 0;
    if (!(f >= 1 && f <= 200) || !(t >= 5 && t <= RUN_TIME + kills * 3 + 60)) return { err: 'The floor or the time looks impossible.' };
    const lv = Math.max(...r.pl.map(p => p.l));
    if (f > lv * 3 + 6 || (f > 10 && kills < 1)) return { err: 'That result does not look possible.' };
    return { kind: 'w', r: { wk: r.wk, f, t, kills, pl: r.pl.map(p => ({ p: p.n, h: p.h, c: p.c, l: p.l | 0 })), d: now } };
  }
  if (r.k !== 's') return { err: 'Not a season result.' };
  const sn = seasonAt(now);
  if (!(r.s === sn || r.s === seasonAt(now - 7 * DAY))) return { err: 'This hero belongs to another season.' };
  r.p = cleanName(r.p); r.h = cleanName(r.h);
  if (!NAME_RX.test(r.p) || !NAME_RX.test(r.h) || badName(r.p) || badName(r.h)) return { err: 'A name is not allowed.' };
  if (CLASSES.indexOf(r.c) < 0 || !(r.l >= 1 && r.l <= 99) || !(r.f >= 0 && r.f <= 400) || r.f > r.l * 4 + 12) return { err: 'That hero does not look possible.' };
  return { kind: 's', r: { s: r.s, p: r.p, h: r.h, c: r.c, l: r.l | 0, f: r.f | 0, df: Math.max(0, Math.min(6, r.df | 0)), id: String(r.id || '').slice(0, 20), d: now } };
}

function load(file, def) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return def; } }
const better = (a, b) => a.f > b.f || (a.f === b.f && a.t < b.t);
const rank = list => list.sort((a, b) => b.f - a.f || a.t - b.t);

function seasonPoints(data, n) {
  const pts = {}, P = [10, 8, 6, 5, 4, 3, 2, 1];
  for (const wk in data.weeks) {
    if (seasonOfWeek(wk) !== n) continue;
    const w = data.weeks[wk];
    (w.solo || []).slice(0, 8).forEach((e, i) => { pts[e.p] = (pts[e.p] || 0) + P[i]; });
    (w.team || []).slice(0, 8).forEach((e, i) => { for (const x of e.pl) pts[x.p] = (pts[x.p] || 0) + P[i]; });
  }
  return Object.keys(pts).map(p => ({ p, pts: pts[p] })).sort((a, b) => b.pts - a.pts);
}

(async () => {
  const res = check();
  if (res.err) { await reply('Sorry, this result was not added: ' + res.err, true); return; }
  const data = load(DATA, { v: 1, weeks: {}, seasons: {} });
  data.weeks = data.weeks || {}; data.seasons = data.seasons || {};
  const owners = load(OWNERS, {});
  const names = res.kind === 'w' ? res.r.pl.map(p => p.p) : [res.r.p];
  for (const n of names) if (owners[n] && owners[n] !== login) { await reply('Sorry: the player name ' + n + ' already belongs to another GitHub account.', true); return; }
  for (const n of names) owners[n] = login;
  let msg;
  if (res.kind === 'w') {
    const r = res.r, w = data.weeks[r.wk] = data.weeks[r.wk] || { solo: [], team: [] };
    if (r.pl.length === 1) {
      const e = { p: r.pl[0].p, h: r.pl[0].h, c: r.pl[0].c, l: r.pl[0].l, f: r.f, t: r.t, d: r.d };
      const i = w.solo.findIndex(x => x.p === e.p);
      if (i >= 0 && !better(e, w.solo[i])) msg = 'Thanks! Your earlier result this week is better, so it stays.';
      else { if (i >= 0) w.solo.splice(i, 1); w.solo.push(e); rank(w.solo); w.solo = w.solo.slice(0, 100); msg = 'Added! ' + e.p + ' is number ' + (w.solo.indexOf(e) + 1) + ' this week (floor ' + e.f + ').'; }
    } else {
      const key = r.pl.map(p => p.p).sort().join('+');
      const e = { pl: r.pl, f: r.f, t: r.t, d: r.d, key };
      const i = w.team.findIndex(x => x.key === key);
      if (i >= 0 && !better(e, w.team[i])) msg = 'Thanks! Your team already has a better result this week.';
      else { if (i >= 0) w.team.splice(i, 1); w.team.push(e); rank(w.team); w.team = w.team.slice(0, 100); msg = 'Added! Your team is number ' + (w.team.indexOf(e) + 1) + ' this week (floor ' + e.f + ').'; }
    }
    // keep the last 20 weeks
    const keys = Object.keys(data.weeks).sort(); while (keys.length > 20) delete data.weeks[keys.shift()];
  } else {
    const r = res.r, s = data.seasons[r.s] = data.seasons[r.s] || { heroes: [], points: [], shaft: 0 };
    // the same hero (same id, same GitHub account) keeps one row, even if the player name changed
    const i = s.heroes.findIndex(x => x.id === r.id && (x.p === r.p || owners[x.p] === login));
    if (i >= 0 && s.heroes[i].f >= r.f && s.heroes[i].l >= r.l) msg = 'Thanks! Nothing new since the last time.';
    else { if (i >= 0) s.heroes.splice(i, 1); s.heroes.push(r); s.heroes.sort((a, b) => b.f - a.f || b.l - a.l); msg = 'Added! ' + r.h + ' reached floor ' + r.f + ' this season.'; }
    s.shaft = s.heroes.reduce((a, h) => a + h.f, 0);
    msg += ' The shared shaft is now ' + s.shaft + ' floors deep.';
  }
  // season points from the weekly tables
  const sn = seasonAt(Date.now());
  if (sn) { const s = data.seasons[sn] = data.seasons[sn] || { heroes: [], points: [], shaft: 0 }; s.points = seasonPoints(data, sn); }
  data.updated = new Date().toISOString();
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(data));
  fs.writeFileSync(OWNERS, JSON.stringify(owners, null, 1));
  await reply(msg, true);
})().catch(async e => { console.error(e); try { await reply('Something went wrong on the board robot. Please try again later.', false); } catch (x) { /* ignore */ } process.exit(1); });
