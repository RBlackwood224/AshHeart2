'use strict';
// Sprite grids. Humanoids are composed from head + torso + legs + held items so equipment is visible.
AH.SPR = {};

// ---- humanoid parts (14 wide) ----
AH.HEADS = {
  helm: ["......pp......", ".....pPpp.....", "....WWWWw.....", "...WWwwwwk....", "...Wvvvvvk....", "...wwwwwkk....", "....wwkkk....."],
  greathelm: ["....gWWWg.....", "...WWWWwwk....", "...WWwwwwk....", "...Wvvvvvk....", "...WwwvwwK....", "...wwwwwkk....", "....wwkkk....."],
  hood: ["....hhhh......", "...hhhhhH.....", "..hhHHHHhH....", "..hHffffHH....", "..hHfefeHH....", "..hHFffFHH....", "...HHHHHH....."],
  hat: [".......q......", "......qU......", ".....qUuu.....", "....qUUuuu....", "..qqUUUuuuuq..", "...qfffffF....", "...qfefeFF...."],
  crown: ["...g.g.g......", "...ggggggg....", "...grgggrg....", "...hffffh.....", "...fefeFf.....", "...fFffFf.....", "....ffff......"],
  bare: ["..............", "....hhhh......", "...hhhhhh.....", "...hffffh.....", "...fefeFf.....", "...fFffFf.....", "....ffff......"],
  beard: [".......q......", "......qU......", ".....qUuu.....", "....qUUuuu....", "..qqUUUuuuuq..", "...qfefeFF....", "...xxxxxxX...."],
};
AH.TORSOS = {
  plate: ["...aammmmn....", "..aattcttnn...", "..fatcccTnf...", "...attctTn....", "...mTttTTn....", "...ngggggn....", "...mtttTTn...."],
  leather: ["...aammmmn....", "..aammmmmnn...", "..fammmmmnf...", "...ammmmmn....", "...mmmmmmn....", "...ngggggn....", "...mmmmmmn...."],
  robe: ["...xaaaaXn....", "..aaxxxXaan...", "..faaxXaaaf...", "...aaagaan....", "...maagaan....", "...ngggggn....", "...maagaan...."],
};
AH.LEGS = {
  pants: [
    ["...tTTtTTT....", "...llL.lLL....", "...llL.lLL....", "...lLL.lLL....", "..bbbB.bbbB...", "..BBBB.BBBB..."],
    ["...tTTtTTT....", "...llL..lLL...", "..llL...lLL...", "..lLL....lL...", ".bbbB....bbB..", ".BBBB....BBB.."],
    ["...tTTtTTT....", "...llL..lLL...", "...llL...lLL..", "...lL....lLL..", "...bbB...bbbB.", "...BBB...BBBB."],
  ],
  robe: [
    ["...aamaamn....", "...aamaamnn...", "..aaamaammn...", "..aaamaammn...", "..nnnnnnnnn...", "...bb...bb...."],
    ["...aamaamn....", "...aamaamnn...", "..aaamaammn...", "..aaamaammnn..", "..nnnnnnnnnn..", "..bb.....bb..."],
    ["...aamaamn....", "..aaamaamn....", "..aaamaammn...", "..aaamaammnn..", "..nnnnnnnnnn..", "...bb.....bb.."],
  ],
};
// held items: grid + grip anchor
AH.HELD = {
  sword: { g: [".s.", ".sS", ".sS", ".sS", ".sS", ".sS", ".sS", "gGg", ".b.", ".b."], ax: 1, ay: 8 },
  greatsword: { g: [".s.", "sSS", "sSS", "sSS", "sSS", "sSS", "sSS", "sSS", "sSS", "gGGg", ".bb.", ".bb.", ".BB."], ax: 1, ay: 10 },
  axe: { g: ["ss..", "sSSb", "sSSb", "ss.b", "...b", "...b", "...b", "...b", "...B"], ax: 3, ay: 6 },
  mace: { g: [".k.", "kKk", "KkK", ".k.", ".b.", ".b.", ".b.", ".b.", ".B."], ax: 1, ay: 6 },
  dagger: { g: [".s", "sS", "sS", "sS", "gg", ".b"], ax: 1, ay: 5 },
  bow: { g: ["bb..", "w.b.", "w..b", "w..b", "w..b", "w..b", "w..b", "w.b.", "bb.."], ax: 3, ay: 4 },
  staff: { g: [".c.", "cCc", ".c.", ".b.", ".b.", ".b.", ".b.", ".b.", ".b.", ".b.", ".B."], ax: 1, ay: 7 },
  shield: { g: ["hhh", "hgH", "hHH", "hhH", ".h."], ax: 2, ay: 1 },
  tome: { g: ["ppp", "pwp", "pwP", "PPP"], ax: 2, ay: 1 },
};
AH.HELD_PAL = {
  s: '#eef2f8', S: '#9aa4b8', g: '#e8c25a', G: '#a8823a', b: '#6b4a2a', B: '#4a3020', k: '#8f8aa0', K: '#5d586e',
  w: '#e9e2d0', c: '#6fd6e8', C: '#3fa6c0', h: '#7a5232', H: '#4e3420', p: '#8a3a7a', P: '#5a2050',
};

// compose a humanoid grid; returns sprite. look: {head, torso, legs, held, off, pal}
AH.composeHumanoid = function (look, frame) {
  const rows = [];
  const head = AH.HEADS[look.head] || AH.HEADS.bare;
  const torso = AH.TORSOS[look.torso] || AH.TORSOS.leather;
  const legs = (AH.LEGS[look.legs] || AH.LEGS.pants)[frame || 0];
  for (const r of head) rows.push(r.split(''));
  for (const r of torso) rows.push(r.split(''));
  for (const r of legs) rows.push(r.split(''));
  // widen to allow held items
  const W = 18, OX = 2; // shift body right by 2 so off-hand fits
  const out = rows.map(r => { const a = new Array(W).fill('.'); r.forEach((c, i) => { if (c !== '.') a[i + OX] = c; }); return a; });
  const pal = Object.assign({}, look.pal);
  const place = (key, hx, hy) => {
    const it = AH.HELD[key]; if (!it) return;
    const ip = look.heldPal || {};
    it.g.forEach((r, j) => r.split('').forEach((c, i) => {
      if (c === '.') return;
      const X = hx - it.ax + i, Y = hy - it.ay + j;
      if (Y < 0 || Y >= out.length || X < 0 || X >= W) return;
      const k = 'H' + c; out[Y][X] = k; pal[k] = ip[c] || AH.HELD_PAL[c];
    }));
  };
  if (look.off) place(look.off, OX + 2, 10);
  if (look.held) place(look.held, OX + 11, 9);
  // multi-char keys: re-map to single chars
  const map = {}; let code = 0x100;
  const grid = out.map(r => r.map(c => {
    if (c.length === 1) return c;
    if (!map[c]) { map[c] = String.fromCharCode(code++); pal[map[c]] = pal[c]; }
    return map[c];
  }).join(''));
  // add head-room: held weapons can stick above
  return AH.sprite(grid, pal, { emissive: look.emissive || '' });
};

// ---- class base palettes ----
AH.CLASS_PAL = {
  paladin: { p: '#d4453c', P: '#8c2a30', W: '#dcd8e4', w: '#a19cb2', k: '#625c74', K: '#4a4458', v: '#120e16', a: '#c4c0cf', m: '#8f8aa0', n: '#5d586e', t: '#b0343c', T: '#742430', c: '#f2e3b3', g: '#e8c25a', l: '#4a4256', L: '#302a3c', b: '#5a3c26', B: '#3a261a', f: '#e0b088', F: '#b07c5a', e: '#120e16', h: '#6a3a20', H: '#4a2814', x: '#e2dccc', X: '#a8a294', q: '#3a3242', U: '#5a5062', u: '#7a708a', r: '#d4453c' },
  rogue: { p: '#467a50', P: '#2a4a32', W: '#6f8a72', w: '#4a6a50', k: '#2a3a2c', K: '#1c2a1e', v: '#120e16', h: '#467a50', H: '#2a4a32', f: '#d0a070', F: '#8a6040', e: '#120e16', a: '#8a6440', m: '#6b4a2e', n: '#4a3020', t: '#3a4a3a', T: '#24302a', c: '#c9a24a', g: '#c9a24a', l: '#3a3448', L: '#24202e', b: '#4a3424', B: '#2e2018', x: '#e2dccc', X: '#a8a294', q: '#2a4a32', U: '#467a50', u: '#5e9a68', r: '#d4453c' },
  wizard: { p: '#5868c8', P: '#3d4fa8', W: '#8a96d8', w: '#5c6ed0', k: '#26327a', K: '#1a2258', v: '#120e16', q: '#26327a', U: '#3d4fa8', u: '#5c6ed0', f: '#e0b088', F: '#b07c5a', e: '#120e16', x: '#e2dccc', X: '#a8a294', a: '#4a5ab8', m: '#34408f', n: '#222a66', t: '#e8c25a', T: '#a8823a', c: '#f2e3b3', g: '#e8c25a', l: '#2e2838', L: '#1c1824', b: '#6b4a2a', B: '#4a3020', h: '#c8c0b0', H: '#8a8478', r: '#d4453c' },
};

// ---- creatures ----
const G = AH.SPR;
G.skel = AH.sprite(["...bbbb....", "..bbbbbB...", "..bekbeB...", "..bbbbbB...", "...bkkB....", "....bB.....", "..bbbbbB.r.", ".b.bkbkB.r.", ".b.bbbbB.r.", ".B.bkbkB.r.", ".b..bbB..r.", "b...bB...rr", "...bBBb....", "...b..B....", "...b..B....", "...B..B....", "...b..b....", "..bb..bb..."],
  { b: '#e2dcc8', B: '#a8a08c', k: '#2a2430', e: '#ff3b1f', r: '#8a6a4a' }, { emissive: 'e' });
G.slime = AH.sprite(["....gggg....", "..gghhggg...", ".gghhgggggG.", ".ggkgggkggG.", "gggkgggkgggG", "gggggggggGGG", "GggggggggGGD", ".GGGGGGGGGD.", "..DDDDDDDD.."],
  { g: '#6fd65a', G: '#3f9a34', h: '#d0ffb8', D: '#2a6a24', k: '#0e1a0c' });
G.bat = AH.sprite(["P.........P", "PP..P.P..PP", "PpP.ppp.PpP", ".PppepeppP.", "..PP.p.PP.."], { p: '#6a4a7a', P: '#3a2448', e: '#ff3b1f' }, { emissive: 'e' });
// second wing frame: wings swept down
G.bat2 = AH.sprite(["...........", "....P.P....", "..PPpppPP..", ".PppepeppP.", "PPpP.p.PpPP"], { p: '#6a4a7a', P: '#3a2448', e: '#ff3b1f' }, { emissive: 'e' });
G.spider = AH.sprite(["k..........k", ".k..kKKk..k.", "..kkKKKKkk..", "kkkKeKKeKkkk", "..kkKKKKkk..", ".k..kkkk..k.", "k....kk....k"], { k: '#2a2430', K: '#4a3a52', e: '#ff3b1f' }, { emissive: 'e' });
G.goblin = AH.sprite(["..g....g..", "..gggggg..", ".gGeggeGg.", "..gggggg..", "...gkkg...", "..cccccC..", ".gccccccg.", ".g.cccC.g.", "...cccC...", "...cc.CC..", "...gg.gg..", "..GG..GG.."], { g: '#7aa84a', G: '#4a6a2a', e: '#ffe04a', c: '#7a5634', C: '#4e3420', k: '#2a1a10' }, { emissive: 'e' });
G.ghost = AH.sprite(["...wwww...", "..wwwwwW..", ".wwewwewW.", ".wwewwewW.", ".wwwwwwwW.", ".wwwkkwwW.", ".wwwwwwwW.", ".wwwwwwwWW", "wwwwwwwwWW", "wwwwwwwWW.", "w.ww.wwW..", "...w..W..."], { w: '#cfdcec', W: '#8a9ab4', e: '#3a4a7a', k: '#3a4a7a' });
G.golem = AH.sprite(["....ssss......", "...sSSSSs.....", "...seSSeS.....", "..ssSSSSSs....", "sssSSSSSSSsss.", "sSdSSSSSSSdSs.", "sS.dSSSSSd.Ss.", "ss.dSSSSSd.ss.", "...dSSSSSd....", "...dSS.SSd....", "..ssS...Sss...", "..sss...sss..."], { s: '#7a7088', S: '#5a5266', d: '#3a3442', e: '#6fd6e8' }, { emissive: 'e' });
G.worm = AH.sprite(["....pppp....", "...pmmmmp...", "..ptmmmmtp..", "..pmmmmmmp..", "...pmmmmp...", "...PppppP...", "....PppP....", "....pPPp....", "...PppppP...", "..PPPPPPPP.."], { p: '#d48a9a', P: '#9a5a6a', m: '#3a1418', t: '#f2e3b3' });
G.shroom = AH.sprite(["...rrrr...", ".rrwrrwrr.", "rrrrrrrrRR", "rwrrrwrrRR", "RRRRRRRRRR", "...bbbb...", "...bkbk...", "...bbbb...", "..bbbbbb..", "..b.bb.b..", "...b..b..."], { r: '#c8484a', R: '#8a2a30', w: '#f2e3d3', b: '#d8c8a8', k: '#2a2430' });
G.eye = AH.sprite(["...wwww...", ".wwwvwwww.", ".wwrrrrww.", "wwrrkkrrww", "wwrrkkrrvw", ".wwrrrrww.", ".wwwwvwww.", "...wwww...", "..v.v..v..", "...v...v.."], { w: '#e8e2d8', v: '#c84a4a', r: '#d4453c', k: '#120e16' }, { emissive: 'r' });
G.imp = AH.sprite(["..h....h..", "..rrrrrr..", ".rRyrryRr.", "..rrrrrr..", "k..rRRr..k", "kk.rrrr.kk", ".kkrrrrkk.", "...rRRr...", "...r..r...", "..rr..rr.."], { r: '#c8383a', R: '#8a2028', y: '#ffe04a', h: '#2a2430', k: '#4a1a20' }, { emissive: 'y' });
G.cultist = AH.sprite(["...pppp...", "..pppppP..", "..pkkkkP..", "..pkekeP..", "..pkkkkP..", "..ppppppP.", ".fppppppPf", "..ppppppP.", "..ppggppP.", "..ppppppP.", "..pppppppP", ".pppppppPP", ".PPPPPPPP."], { p: '#5a2a6a', P: '#3a1a48', k: '#120e16', e: '#ff3b1f', f: '#c89868', g: '#e8c25a' }, { emissive: 'e' });
G.crab = AH.sprite([".oo........oo.", "oOo.e....e.oOo", "oo..o....o..oo", "..oooooooooo..", ".oOooooooooOo.", "..oOOOOOOOOo..", ".o.o.o..o.o.o."], { o: '#e07a3a', O: '#a84a20', e: '#120e16' });
G.wolf = AH.sprite(["........DD...", ".......Dlld..", "D......dlkdn.", "dD....dlddD..", ".dllllldD....", ".dddddddD....", ".dD.d.dD.....", ".DD.D.DD....."], { d: '#7a7488', D: '#4e4a5a', l: '#a8a2b4', k: '#ff3b1f', n: '#1a1620' }, { emissive: 'k' });
G.rat = AH.sprite([".....pR...", "..rrrrrkR.", ".rrrrrrrrp", "p.R..R.R..", "pp........"], { r: '#8e8898', R: '#5e5868', p: '#e8a0b0', k: '#ff3b1f' }, { emissive: 'k' });
G.mimic = AH.sprite([".BBBBBBBBBBBB.", "BbtbtbtbtbtbbB", "BkkkkkkkkkkkkB", "BktttttttttkkB", "GggggggggggggG", "BbbbbbGGbbbbbB", "BbbbbbgYbbbbbB", "BBBBBBBBBBBBBB"], { B: '#4e3420', b: '#8a6038', t: '#f2e3b3', k: '#3a0e12', G: '#a8823a', g: '#e8c25a', Y: '#fff2a8' });
G.heart = AH.sprite(["....rr...rr....", "...rRRr.rRRr...", "..rRyyRrRyyRr..", "..rRyEEyEEyRr..", "..rRyEEEEEyRr..", "...rRyEEEyRr...", "....rRyEyRr....", ".....rRyRr.....", "......rRr......", ".......r......."], { r: '#5a1a12', R: '#c8481a', y: '#ff8a2e', E: '#fff2b0' }, { emissive: 'yE' });

// ---- companions ----
G.dog = AH.sprite(["........DD...", ".......Dlld..", "D......dlkdn.", "dD...cclddD..", ".dllllldD....", ".dddddddD....", ".dD.d.dD.....", ".DD.D.DD....."], { d: '#9a6436', D: '#6a4024', l: '#c48c56', k: '#120e16', n: '#2a1a10', c: '#c23b3b' });
G.pet_rat = AH.sprite([".....pR...", "..rrrrrkR.", ".rrrrrrrrp", "p.R..R.R..", "pp........"], { r: '#f2f0f4', R: '#b4aec2', p: '#f0a8b8', k: '#c8304a' });
G.canary = AH.sprite(["..yy..", ".yykyo", "yyyyy.", "YyyY..", ".Y.Y.."], { y: '#f8d83c', Y: '#c9a020', o: '#f08a24', k: '#120e16' });

// ---- npcs ----
AH.villager = function (hair, shirt, shirtD, apron) {
  return AH.sprite(["...hhhh...", "..hhhhhh..", "..hffffh..", "..fkffkf..", "..ffFFff..", "...ffff...", "..sssssS..", ".ssaaasSS.", ".fsaaasSf.", ".fsaaasSf.", "..saaasS..", "..ppppPP..", "..pp..PP..", "..pp..PP..", "..bb..bb..", ".bbb..bbb."],
    { h: hair, f: '#d8a878', F: '#a87850', k: '#120e16', s: shirt, S: shirtD, p: '#3a3448', P: '#24202e', b: '#4a3424', a: apron || shirt });
};
G.smith = AH.villager('#2a1a10', '#8a5a3a', '#5a3a24', '#3a3030');
G.herbal = AH.villager('#c8a060', '#5a7a3a', '#3a5224');
G.keeper = AH.villager('#8a8478', '#7a3a3a', '#4a2424', '#c8c0b0');
G.priest = AH.villager('#e2dccc', '#c8c0b0', '#8a8478');
G.vill1 = AH.villager('#6a3a20', '#7a3a5a', '#4a2438');
G.vill2 = AH.villager('#3a2a1a', '#4a5a7a', '#2e3a52');
G.vill3 = AH.villager('#c87a3a', '#8a7a3a', '#5a4e24');
G.miner = AH.villager('#3a2a1a', '#6a5a3a', '#4a3e24', '#5a3c22');

// ---- props ----
G.chest = AH.sprite([".BBBBBBBBBBBB.", "BbbbbbbbbbbbbB", "BbBbbbbbbbbBbB", "GggggggggggggG", "BbbbbbGGbbbbbB", "BbbbbbgYbbbbbB", "BbBbbbbbbbbBbB", "BbbbbbbbbbbbbB", "BBBBBBBBBBBBBB"], { B: '#4e3420', b: '#8a6038', G: '#a8823a', g: '#e8c25a', Y: '#fff2a8' });
G.chestOpen = AH.sprite([".BBBBBBBBBBBB.", "BkkkkkkkkkkkkB", "BkyykkkkkyykkB", "GggggggggggggG", "BbbbbbGGbbbbbB", "BbbbbbgYbbbbbB", "BbBbbbbbbbbBbB", "BBBBBBBBBBBBBB"], { B: '#4e3420', b: '#8a6038', G: '#a8823a', g: '#e8c25a', Y: '#fff2a8', k: '#1a1216', y: '#e8c25a' });
G.stairs = AH.sprite(["kkkkkkkkkkkkkk", "kSSSSSSSSSSSSk", "kssssssssssssk", "kkSSSSSSSSSSkk", "kkssssssssssk.", ".kkSSSSSSSSkk.", ".kksssssssskk.", "..kkSSSSSSkk..", "..kkkkkkkkkk.."], { k: '#06040a', S: '#5a5266', s: '#3a3442' });
G.rope = AH.sprite(["..bb..", ".b..b.", ".b..b.", "..bb..", "..b...", "...b..", "..b...", "...b..", "..b...", "gggggg"], { b: '#c8a060', g: '#6b4a2a' });
G.lift = AH.sprite(["BBBBBBBBBBBBBB", "B.....bb.....B", "B.....bb.....B", "BkkkkkkkkkkkkB", "BkggggggggggkB", "BkgkkkkkkkkgkB", "BkggggggggggkB", "BBBBBBBBBBBBBB"], { B: '#6b4a2e', b: '#8a8478', k: '#2a2430', g: '#a8823a' });
G.tablet = AH.sprite(["..KKKKKK..", ".KkkkkkkK.", ".KkcckckK.", ".KkkckkkK.", ".KkcckckK.", ".KkkkkkkK.", "KKKKKKKKKK"], { K: '#3a3442', k: '#5a5266', c: '#6fd6e8' }, { emissive: 'c' });
G.shrine = AH.sprite(["....yy....", "...yEEy...", "....yy....", "..KKKKKK..", "..KkkkkK..", "...KkkK...", "...KkkK...", "..KKKKKK..", ".KKKKKKKK."], { y: '#ffb347', E: '#fff2b0', K: '#5a5266', k: '#7a7088' }, { emissive: 'yE' });
G.board = AH.sprite(["bbbbbbbbbbbbbb", "bwwwwbwwwwbwwb", "bwkkwbwrrwbwkb", "bwkwwbwkkwbwwb", "bwwwwbwwwwbwkb", "bbbbbbbbbbbbbb", "..b........b..", "..b........b..", "..B........B.."], { b: '#6b4a2e', B: '#4e3420', w: '#e9e2d0', k: '#5a5266', r: '#c8383a' });
G.digspot = AH.sprite(["..k.k..", ".kKkKk.", "k.KkK.k", ".kkkkk."], { k: '#2a2430', K: '#5a4e3a' });
G.crack = AH.sprite(["..k...", "..kk..", "...k..", "..kk..", ".k....", ".kk...", "..k..."], { k: '#06040a' });
G.bones = AH.sprite(["c.....c", ".ccccc.", "c.....c"], { c: '#d6cfbb' });
G.rubble = AH.sprite(["..kk.", ".kKKk", "kKkkk"], { k: '#4c4458', K: '#6a6276' });
G.torchWall = AH.sprite(["..E..", ".yEy.", ".yEy.", "..Y..", ".bgb.", "..b..", "..b..", "..B.."], { y: '#ffb347', E: '#fff2b0', Y: '#e0702a', b: '#5a3c22', g: '#a8823a', B: '#3a261a' }, { emissive: 'yEY' });
G.coin = AH.sprite([".gg.", "gGgg", "gggG", ".gg."], { g: '#e8c25a', G: '#fff2a8' }, { emissive: 'G' });
G.ore = AH.sprite([".KK.", "KkcK", "KckK", ".KK."], { K: '#3a3442', k: '#5a5266', c: '#c8a060' });
G.gem = AH.sprite([".c.", "cCc", ".c."], { c: '#6fd6e8', C: '#ffffff' }, { emissive: 'cC' });
G.potionDrop = AH.sprite([".b.", "www", "ooo", "ooO"], { b: '#8a6038', w: '#dfe6f0', o: '#c8383a', O: '#7a1e24' });
G.miner_npc = G.miner;

// ---- icons (items) ----
const S = {
  s: '#eef2f8', S: '#9aa4b8', b: '#6b4a2a', B: '#4a3020', g: '#e8c25a', G: '#a8823a', E: '#fff2b0', y: '#ffb347', Y: '#e0702a',
  i: '#ff3b1f', w: '#f2e3b3', r: '#d4453c', R: '#8c2a30', W: '#dcd8e4', k: '#2a2430', K: '#5a5262', v: '#120e16', a: '#c4c0cf',
  m: '#8f8aa0', n: '#5d586e', p: '#8a3a7a', P: '#5a2050', c: '#6fd6e8', C: '#3fa6c0', h: '#d0ffd8', e: '#6fbf73', q: '#4a7bd1',
  Q: '#2a4a8a', x: '#9ec0ff', o: '#c8383a', O: '#7a1e24', l: '#ff8a8a',
};
AH.ICON_GRIDS = {
  sword: ["..........s.", ".........sS.", "........sSS.", ".......sSS..", "......sSS...", ".....sSS....", "..G.sSS.....", "...GSS......", "...bG.......", "..b..G......", ".b..........", "bb.........."],
  greatsword: ["..........ss", ".........sSS", "........sSS.", ".......sSS..", "......sSS...", ".....sSS....", "....sSS.....", ".G.sSS......", "..GSS.......", "..bG........", ".b..G.......", "b..........."],
  axe: ["......SSs...", ".....bSsss..", ".....bSssss.", ".....bSsss..", ".....bSS....", ".....b......", ".....b......", ".....b......", ".....b......", ".....b......", ".....B......", "....BB......"],
  mace: ["....mKm.....", "...mKmKm....", "...KmmmK....", "....mKm.....", ".....b......", ".....b......", ".....b......", ".....b......", ".....B......", "....BB......"],
  bow: ["..wbb.....", "..w.Gb....", "..w..b....", "..w...b...", "..w...b...", "..w...b...", "..w...b...", "..w..b....", "..w.Gb....", "..wbb....."],
  staff: ["....CcC.....", "...CchcC....", "....CcC.....", ".....b......", ".....b......", ".....b......", ".....b......", ".....b......", ".....b......", ".....B......", ".....B......"],
  dagger: ["......s.....", ".....sS.....", ".....sS.....", ".....sS.....", ".....sS.....", "...gggggG...", ".....bb.....", ".....bb.....", ".....BB....."],
  helm: [".....rr.....", "....rRRr....", "...WWWWaa...", "..WWWWaaam..", "..Wvvvvvvm..", "..aWa..aam..", "..aaaaaamm..", "..amamamam..", "...aaaamm..."],
  hood: ["....eeee....", "...eeeeee...", "..eeQQQQee..", "..eQffffQe..", "..eQfvfvQe..", "..eQQQQQQe..", "...eeeeee..."],
  hat: [".....q......", "....qQ......", "...qQQq.....", "...qQQqq....", "..qQQQQqq...", "qqqqqqqqqqq.", "............"],
  chest: ["..mm....mm..", ".maammmmaam.", ".maaammaaam.", ".mmaammaamm.", "..mmammamm..", "..nmmmmmmn..", "..nmmggmmn..", "..nnmmmmnn..", "...nnnnnn..."],
  leather: ["..bb....bb..", ".bGGbbbbGGb.", ".bGbbbbbbGb.", ".bbbbbbbbbb.", "..bbbbbbbb..", "..BbggggbB..", "..Bbbbbbbb..", "..BBbbbbBB..", "...BBBBBB..."],
  robe: ["...qqqqq....", "..qQgggQq...", "..qQQgQQq...", "..qQQgQQq...", "..qQQgQQq...", ".qQQQgQQQq..", ".qQQQgQQQq..", "qQQQQgQQQQq."],
  boot: ["...bbbb.....", "...gggg.....", "...bBBb.....", "...bBBb.....", "...bBBb.....", "...bBBbbb...", "...bBBBBbb..", "...BBBBBBB.."],
  glove: ["..b.b.b.....", "..b.b.b.b...", "..bbbbbbb...", "..bBBBbbb...", "..bBBBbb....", "..bbbbbb....", "..gggggg...."],
  cloak: ["....pppp....", "...pPPPPp...", "..pPppppPp..", "..pPppppPp..", "..pPppppPp..", ".pPpppppPPp.", ".pPPPPPPPPp."],
  ring: [".....rr.....", "....rlRr....", ".....rr.....", "....gGGg....", "...g....g...", "...G....G...", "...g....G...", "....gGGG...."],
  amulet: ["..g......g..", "...g....g...", "....g..g....", ".....gg.....", "....eeee....", "...eehee....", "...eeeeee...", "....eeee....", ".....ee....."],
  shield: ["..bbbbbbb...", "..bBBgBBb...", "..bBBgBBb...", "..bgggggb...", "..bBBgBBb...", "...bBgBb....", "....bgb.....", ".....b......"],
  tome: ["..PPPPPPP...", "..PppppppW..", "..PpgggppW..", "..PpgPgppW..", "..PpgggppW..", "..PppppppW..", "..PppppppW..", "..PPPPPPPW..", "...WWWWWW..."],
  potion: [".....bb.....", "....wwww....", ".....ww.....", "....oooo....", "...oOlooo...", "..oolooooo..", "..oooooOoo..", "..oOooooOo..", "...OOOOOO..."],
  mana: [".....bb.....", "....wwww....", ".....ww.....", "....qqqq....", "...qQxqqq...", "..qqxqqqqq..", "..qqqqqqQq..", "..qQqqqqQq..", "...QQQQQQ..."],
  murky: [".....bb.....", "....wwww....", ".....ww.....", "....eeee....", "...ePeeee...", "..eePeepee..", "..eeeeeeee..", "..ePeepeee..", "...PPPPPP..."],
  torch: [".....y......", "....yEy.....", "....yEy.....", ".....Y......", "....bgb.....", ".....b......", ".....b......", ".....b......", ".....B......"],
  ore: ["............", "....KKK.....", "...KkkgK....", "..KkGgkKK...", "..KkkkkgK...", "..KkgkkkK...", "...KKKKKK..."],
  gem: ["....cc......", "...cCCc.....", "..cCwwCc....", "..cCCCCc....", "...cCCc.....", "....cc......"],
  bomb: [".......y....", "......b.....", ".....b......", "...kkkk.....", "..kKKkkk....", "..kKkkkk....", "..kkkkkk....", "...kkkk....."],
  key: ["...ggg......", "..g...g.....", "..g...g.....", "...ggg......", "....g.......", "....gg......", "....g.......", "....gg......"],
  scroll: ["..wwwwwww...", ".wWwwwwwwW..", "..wkkkkkw...", "..wwwwwww...", "..wkkkkw....", "..wwwwwww...", ".wWwwwwwwW.."],
  heavy: ["........yy..", "......yyE...", ".....yE.....", "....yE......", "...yE....s..", "..yE....sS..", "..yE...sS...", "..yE..sS....", "...y.sS.....", "....GG......", "...b..G....."],
  dodge: ["..ww........", "....wwww....", "........ww..", ".wwwww......", "......wwww..", "..www.......", "......www..."],
  flame: [".....y......", "....yy......", "....yEy.....", "...yEEy.y...", "...yEEEyy...", "..yYEEEEy...", "..yYEEEYy...", "...YYYYY...."],
  frost: ["....x.......", ".x..x..x....", "..x.x.x.....", "...xxx......", "xxxxwxxxx...", "...xxx......", "..x.x.x.....", ".x..x..x....", "....x......."],
  bolt: [".......yy...", "......yy....", ".....yy.....", "....yyyyy...", ".......yy...", "......yy....", ".....yy.....", "....y......."],
  sun: ["....y..y....", ".y...yy...y.", "...yEEEEy...", "..yEEwwEEy..", "y.yEwwwwEy.y", "..yEEwwEEy..", "...yEEEEy...", ".y...yy...y."],
  aegis: ["..QQQQQQQ...", "..QqqgqqQ...", "..QqqgqqQ...", "..QgggggQ...", "..QqqgqqQ...", "...QqgqQ....", "....QgQ.....", ".....Q......"],
  smoke: ["...KKK......", "..KmmmK.KK..", ".KmmmmmKmmK.", ".KmmmmmmmmK.", "..KmmmmmmK..", "...KKKKKK..."],
  knives: ["s....s....s.", ".s...s...s..", "..s..s..s...", "...........", "..s..s..s...", ".s...s...s..", "s....s....s."],
  step: ["........eee.", "..P....eKKe.", ".PP...pKwKw.", "PPP..pp.KK..", ".PPpp..eKKKe", "PP.p..KKKKK.", ".P....KK.KK.", ".....KK...KK"],
  holy: [".....w......", ".....w......", "..wwwwwww...", ".....w......", ".....w......", ".....w......", "....www....."],
};
AH.ICON = {};
for (const k in AH.ICON_GRIDS) AH.ICON[k] = AH.sprite(AH.ICON_GRIDS[k], S);
// one lump icon per ore, recoloured
for (const [k, c] of Object.entries({ coal: ['#2a2630', '#4a4652', '#8a8a96'], iron: ['#5a5a6a', '#9a9aac', '#e0e0ec'], silver: ['#8a8aa0', '#e4e4f2', '#ffffff'], goldore: ['#8a6a3a', '#f2d060', '#fff4c0'], mithril: ['#3a7a78', '#8af0e0', '#e8fff8'] }))
  AH.ICON[k] = AH.sprite(AH.ICON_GRIDS.ore, Object.assign({}, S, { k: c[0], G: c[1], g: c[2] }));
AH.iconRecolor = function (name, map) {
  const pal = Object.assign({}, S, map); return AH.sprite(AH.ICON_GRIDS[name], pal);
};
AH.runeIcon = function (col, glyph) {
  const base = ["..KKKKKK..", ".KkkkkkkK.", ".KkkkkkkK.", ".KkkkkkkK.", ".KkkkkkkK.", ".KkkkkkkK.", ".KkkkkkkK.", ".KkkkkkkK.", "..KKKKKK.."].map(r => r.split(''));
  for (const [x, y] of glyph) base[y][x] = 'Z';
  return AH.sprite(base.map(r => r.join('')), Object.assign({}, S, { Z: col }), { emissive: 'Z' });
};
