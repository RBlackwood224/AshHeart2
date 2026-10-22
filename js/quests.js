'use strict';
// Story quest chains given by the townsfolk, plus villager chatter that reacts to the world
(function () {
  // step types: find (pick up a relic on a floor), kill (n of a creature), reach (a floor), hunt (a named foe on a floor)
  AH.QUESTS = [
    {
      id: 'ledger', giver: 'smith', name: "THE FOREMAN'S LEDGER", unlock: 3,
      steps: [
        { type: 'find', floor: 5, item: "SKARN'S LEDGER", ask: 'SKARN WAS MY FRIEND. HIS LEDGER WAS LOST ON THE FIFTH FLOOR. FIND IT FOR ME.', goal: "FIND SKARN'S LEDGER ON FLOOR 5", done: 'HE WROTE OF A WARM STONE THAT BEAT LIKE A HEART... SO IT IS TRUE.' },
        { type: 'kill', target: 'BONE WALKER', n: 12, ask: 'HIS CREW STILL WALKS DOWN THERE. GIVE THEM REST.', goal: 'PUT 12 BONE WALKERS TO REST', done: 'THANK YOU. NOW THEY CAN SLEEP.' },
        { type: 'hunt', floor: 12, foe: { name: "FOREMAN'S SHADE", title: 'WHO WEARS SKARN\'S FACE', spr: 'skel', pal: { b: '#9ac8d8', r: '#5a8aa0' }, ai: 'tank', abil: ['summon'] }, ask: "SOMETHING WEARS SKARN'S FACE ON THE TWELFTH FLOOR. END IT.", goal: "DESTROY THE FOREMAN'S SHADE ON FLOOR 12", done: 'IT IS DONE. TAKE HIS HAMMER. HE WOULD HAVE WANTED THAT.' },
      ],
      reward: { gold: 300, trust: 8, item: 'skarnhammer' },
    },
    {
      id: 'shift', giver: 'inn', name: 'THE LOST SHIFT', unlock: 6,
      steps: [
        { type: 'reach', floor: 10, ask: 'THE NIGHT SHIFT NEVER CAME HOME. REACH THE TENTH FLOOR AND LOOK FOR SIGNS.', goal: 'REACH FLOOR 10', done: 'TEN FLOORS... AND NOT ONE OF THEM. KEEP LOOKING.' },
        { type: 'find', floor: 14, item: 'STRIPED HELMET', ask: 'MY SON WORE A HELMET WITH A RED STRIPE. FLOOR 14, THEY SAY.', goal: 'FIND THE STRIPED HELMET ON FLOOR 14', done: 'THAT IS HIS. THEN WHERE IS HE?' },
        { type: 'hunt', floor: 18, foe: { name: 'THE TUNNEL MAW', title: 'THAT SWALLOWED THE SHIFT', spr: 'worm', pal: { p: '#c87a6a', P: '#8a4a3a' }, ai: 'charge', abil: ['enrage'] }, ask: 'A WORM AS BIG AS A WAGON NESTS ON FLOOR 18. IT TOOK THEM.', goal: 'SLAY THE TUNNEL MAW ON FLOOR 18', done: 'THEN IT IS OVER. YOUR DRINKS ARE ON THE HOUSE. FOREVER.' },
      ],
      reward: { gold: 400, trust: 10, item: 'tankard' },
    },
    {
      id: 'warden', giver: 'shrine', name: "THE PRIEST'S SECRET", unlock: 15,
      steps: [
        { type: 'find', floor: 20, item: 'BLACK CANDLE', ask: 'BEFORE THE LAMPS, WE BURNED BLACK CANDLES. ONE STILL STANDS ON FLOOR 20. BRING IT.', goal: 'BRING THE BLACK CANDLE FROM FLOOR 20', done: 'YOU SHOULD NOT HAVE TOUCHED IT BARE-HANDED. NO MATTER.' },
        { type: 'kill', target: 'GRAVE CALLER', n: 5, ask: 'THE CANDLE CALLS THEM. FIVE GRAVE CALLERS STILL KEEP THE OLD RITES.', goal: 'SLAY 5 GRAVE CALLERS', done: 'GOOD. THE CHORUS IS QUIETER NOW.' },
        { type: 'reach', floor: 40, ask: 'NOW YOU MUST KNOW THE TRUTH. GO TO THE FORTIETH FLOOR, THEN COME BACK TO ME.', goal: 'REACH FLOOR 40', done: 'WE DID NOT DIG TOO DEEP. WE WERE SENT. THE HEART IS A PRISON, AND WE ARE ITS WARDENS.' },
        { type: 'hunt', floor: 45, foe: { name: "VESSA'S ECHO", title: 'WHO PRAYED TO THE HEART', spr: 'cultist', pal: { p: '#c8a0ff', P: '#7a5aa0', e: '#ffffff' }, ai: 'summon', abil: ['nova', 'summon'] }, ask: "VESSA PRAYED TO IT. HER ECHO WAITS ON FLOOR 45. SILENCE HER.", goal: "SILENCE VESSA'S ECHO ON FLOOR 45", done: 'FORGIVE ME FOR NOT TELLING YOU SOONER.' },
      ],
      reward: { gold: 900, trust: 15, item: 'wardenseal' },
    },
    {
      id: 'cure', giver: 'store', name: "MERA'S CURE", unlock: 25,
      steps: [
        { type: 'find', floor: 28, item: 'GLOWCAP SPORES', ask: 'THE TOWN COUGHS ASH. I NEED GLOWCAP SPORES FROM FLOOR 28.', goal: 'GATHER GLOWCAP SPORES ON FLOOR 28', done: 'YES! THIS WILL HELP THE CHILDREN.' },
        { type: 'kill', target: 'ICE WISP', n: 8, ask: 'THE CURE MUST BE KEPT COLD. BRING ME THE CORES OF 8 ICE WISPS.', goal: 'SLAY 8 ICE WISPS', done: 'COLD AS A GRAVE. PERFECT.' },
        { type: 'hunt', floor: 66, foe: { name: 'THE ASHMOTHER', title: 'WHO BREATHES THE SICKNESS', spr: 'spider', pal: { K: '#5a4a52', k: '#8a7a80', e: '#ff8a2e' }, ai: 'spit', abil: ['summon', 'spit3'] }, ask: 'THE SICKNESS COMES FROM SOMETHING ON FLOOR 66. KILL IT AND THE AIR WILL CLEAR.', goal: 'SLAY THE ASHMOTHER ON FLOOR 66', done: 'THE TOWN BREATHES AGAIN. THANK YOU, HERO.' },
      ],
      reward: { gold: 1500, trust: 15, item: 'ashveil' },
    },
  ];
  AH.QUEST_UNIQUES = {
    skarnhammer: { name: "SKARN'S HAMMER", base: 'mace', power: 'triple', affixes: [['str', 8], ['dmg', 20]] },
    tankard: { name: "TOM'S LUCKY TANKARD", base: 'amulet', power: 'goldheal', affixes: [['mf', 40], ['hp', 40]] },
    wardenseal: { name: "WARDEN'S SEAL", base: 'ring', power: 'mend', affixes: [['res', 10], ['spell', 20], ['vit', 10]] },
    ashveil: { name: "ASHMOTHER'S VEIL", base: 'cloak', power: 'souleater', affixes: [['move', 12], ['res', 12], ['hp', 80]] },
  };
  AH.questDef = id => AH.QUESTS.find(q => q.id === id);

  const GG = AH.Game.prototype;
  GG.qstate = function () { const W = this.world; if (!W) return {}; W.quests = W.quests || {}; return W.quests; };
  // the quest a keeper has for us right now: {q, st, mode: 'offer'|'active'|'turnin'}
  GG.questFor = function (giver) {
    const QS = this.qstate(), deepest = Math.max(0, ...this.players.map(p => p.ch.deepest || 0));
    for (const q of AH.QUESTS) {
      if (q.giver !== giver) continue;
      const st = QS[q.id];
      if (st && st.done) continue;
      if (!st) { if (deepest >= q.unlock) return { q, st: null, mode: 'offer' }; continue; }
      return { q, st, mode: st.ready ? 'turnin' : 'active' };
    }
    return null;
  };
  GG.activeQuests = function () {
    const QS = this.qstate(), out = [];
    for (const q of AH.QUESTS) { const st = QS[q.id]; if (st && !st.done) out.push({ q, st, step: q.steps[st.s] }); }
    return out;
  };
  GG.acceptQuest = function (q) {
    const QS = this.qstate(); QS[q.id] = { s: 0, prog: 0, ready: false, done: false };
    this.banner(q.name, '#c8a0ff', q.steps[0].goal); AH.Audio.sfx('select');
    this.checkReachQuests();
  };
  GG.questStepDone = function (q, st) {
    if (st.ready) return;
    st.ready = true; AH.Audio.sfx('levelup');
    this.banner('QUEST UPDATED', '#c8a0ff', 'RETURN TO DUNMERE');
  };
  GG.turnInQuest = function (q, p) {
    const st = this.qstate()[q.id]; if (!st || !st.ready) return;
    const step = q.steps[st.s];
    for (const pl of this.players) pl.gainXp(this, 40 + (step.floor || 10) * 12);
    st.s++; st.prog = 0; st.ready = false;
    if (st.s >= q.steps.length) {
      st.done = true;
      const R = q.reward;
      for (const pl of this.players) { pl.ch.gold += Math.round(R.gold / this.players.length); }
      this.changeTrust(R.trust, 'THE TOWN IS GRATEFUL');
      if (R.item) { const it = AH.makeQuestUnique(R.item, Math.max(10, step.floor || 10)); if (!p.addItem(it)) this.dropItem(p.x, p.y + 8, it, p.pid); }
      this.banner('QUEST COMPLETE', '#f2c94c', q.name);
      AH.Audio.sfx('legend');
      this.deed('quest', q.name);
    } else { this.banner(q.name, '#c8a0ff', q.steps[st.s].goal); this.checkReachQuests(); }
  };
  AH.makeQuestUnique = function (id, floor) {
    const U = AH.QUEST_UNIQUES[id];
    const it = AH.genItem(AH.rand, floor + 4, { rarity: 3, base: U.base, noSet: true });
    it.rarity = 4; it.name = U.name; it.legend = U.power; delete it.bargain; delete it.unid; delete it.cursed;
    for (const [k, v] of U.affixes) it.affixes.push({ k, v: Math.round(v * (1 + floor / 60)) });
    it.sockets = Math.max(it.sockets || 0, 1);
    return it;
  };
  // events from the game
  GG.questEvent = function (kind, a) {
    const QS = this.qstate();
    for (const q of AH.QUESTS) {
      const st = QS[q.id]; if (!st || st.done || st.ready) continue;
      const step = q.steps[st.s];
      if (kind === 'kill' && step.type === 'kill' && a.def && a.def.name === step.target) {
        st.prog++; if (st.prog >= step.n) this.questStepDone(q, st);
        else if (st.prog % Math.max(1, Math.floor(step.n / 4)) === 0) this.toast(null, AH.tr(step.goal) + ' (' + st.prog + '/' + step.n + ')', '#c8a0ff');
      }
      if (kind === 'kill' && step.type === 'hunt' && a.questFoe === q.id) this.questStepDone(q, st);
      if (kind === 'pickup' && step.type === 'find' && a === q.id) this.questStepDone(q, st);
    }
  };
  GG.checkReachQuests = function () {
    const QS = this.qstate(), deepest = Math.max(0, ...this.players.map(p => p.ch.deepest || 0), this.floorNo || 0);
    for (const q of AH.QUESTS) { const st = QS[q.id]; if (!st || st.done || st.ready) continue; const step = q.steps[st.s]; if (step.type === 'reach' && deepest >= step.floor) this.questStepDone(q, st); }
  };
  // place quest relics and foes when a floor is entered
  GG.questFloor = function (rng) {
    if (this.mode === 'time') return;
    const QS = this.qstate(), m = this.map, f = this.floorNo;
    for (const q of AH.QUESTS) {
      const st = QS[q.id]; if (!st || st.done || st.ready) continue;
      const step = q.steps[st.s];
      if (step.floor !== f) continue;
      const rooms = m.rooms.filter(r => r !== m.startRoom); const r = rooms.length ? rooms[rooms.length - 1] : m.startRoom;
      const pos = m.randomFloorIn(r, AH.rand);
      if (step.type === 'find') m.props.push({ type: 'qitem', x: pos.x, y: pos.y, quest: q.id, item: step.item });
      if (step.type === 'hunt') {
        const e = AH.spawnLegend(this, Object.assign({ minF: 1, drop: null }, step.foe), pos.x, pos.y, {});
        e.questFoe = q.id; e.aggro = false;
      }
    }
    this.checkReachQuests();
  };

  // ---------- world deeds and villager chatter ----------
  GG.deed = function (kind, name) { const W = this.world; if (!W) return; W.deeds = W.deeds || []; W.deeds.push({ k: kind, n: name, d: W.day }); if (W.deeds.length > 12) W.deeds.shift(); };
  GG.villagerLine = function (n) {
    const W = this.world, h = W.hour, opts = [];
    const recent = (W.deeds || []).filter(d => W.day - d.d <= 3);
    for (const d of recent) {
      if (d.k === 'legend') opts.push('THEY SAY YOU SLEW ' + d.n + '!', 'WAS ' + d.n + ' AS BIG AS THEY SAY?');
      if (d.k === 'nemesis') opts.push('YOU FINALLY GOT ' + d.n + '. GOOD.');
      if (d.k === 'quest') opts.push('EVERYONE IS TALKING ABOUT ' + d.n + '.');
      if (d.k === 'deep') opts.push('FLOOR ' + d.n + '? NOBODY HAS BEEN THAT DEEP IN YEARS.');
      if (d.k === 'boss') opts.push('THE GROUND STOPPED SHAKING WHEN YOU KILLED ' + d.n + '.');
    }
    const wx = W.weather;
    if (wx === 'rain') opts.push('THIS RAIN GETS INTO THE BONES.', 'AT LEAST THE MINE IS DRY.');
    if (wx === 'snow') opts.push('SNOW IN DUNMERE. THE OLD ONES SAY IT IS A BAD SIGN.', 'MY HANDS ARE FROZEN.');
    if (wx === 'storm') opts.push('STAY INSIDE. THE STORM IS ANGRY TONIGHT.', 'THE THUNDER SOUNDS LIKE A HEARTBEAT.');
    if (wx === 'fog') opts.push('I CANNOT SEE MY OWN FEET IN THIS FOG.');
    if (h >= 20 || h < 5) opts.push('IT IS LATE, HERO. EVEN HEROES SLEEP.', 'DO YOU HEAR IT TOO? THE BEATING UNDER THE STREETS?');
    if (h >= 5 && h < 9) opts.push('GOOD MORNING. THE BAKER HAS FRESH BREAD.');
    if (W.trust < 30) opts.push('WHY SHOULD WE TRUST YOU? THE LAMPS KEEP GOING OUT.', 'MY FAMILY IS LEAVING DUNMERE NEXT WEEK.');
    else if (W.trust > 75) opts.push('THE CHILDREN PLAY HEROES NOW. GUESS WHO THEY PRETEND TO BE.', 'DUNMERE HAS NOT FELT THIS SAFE IN YEARS.');
    const lamps = this.lampsLit();
    if (lamps <= 3) opts.push('ONLY ' + lamps + ' LAMPS STILL BURN. I AM AFRAID.');
    const aq = this.activeQuests();
    if (aq.length) opts.push('I HEARD YOU ARE HELPING WITH ' + AH.rand.pick(aq).q.name + '.');
    opts.push(AH.RUMORS[n.line % AH.RUMORS.length]);
    return AH.rand.pick(opts);
  };

  // ---------- quest dialog ----------
  const U = AH.UI;
  U.questRow = function (G, giver) {
    const qf = G.questFor(giver); if (!qf) return null;
    return { id: 'quest', qf, label: (qf.mode === 'offer' ? '! ' : qf.mode === 'turnin' ? '? ' : '') + AH.tr(qf.q.name), col: qf.mode === 'active' ? '#8a7aa0' : '#c8a0ff' };
  };
  U.init.quest = function (G, m) { m.sel = 0; };
  U.questItems = function (G, m) {
    const qf = m.qf;
    if (qf.mode === 'offer') return [{ id: 'accept', label: 'ACCEPT' }, { id: 'close', label: 'NOT NOW' }];
    if (qf.mode === 'turnin') return [{ id: 'turnin', label: 'TELL THEM WHAT HAPPENED' }];
    return [{ id: 'close', label: 'CLOSE' }];
  };
  U.update.quest = function (G, m, dt) {
    U.listUpdate(G, m, dt, U.questItems(G, m), it => {
      if (it.id === 'accept') { if (G.net && !G.isHost) { G.toast(m.p, 'THE HOST TAKES BOUNTIES', '#a39bb0'); return; } G.acceptQuest(m.qf.q); G.closeMenu(); return; }
      if (it.id === 'turnin') { G.turnInQuest(m.qf.q, m.p); G.closeMenu(); return; }
      G.closeMenu();
    }, () => G.closeMenu());
  };
  U.draw.quest = function (G, ctx, m) {
    const qf = m.qf, q = qf.q, st = G.qstate()[q.id];
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, AH.UW, AH.UH);
    const x = 60, y = 40, w = 360, h = 190;
    AH.frame(ctx, x, y, w, h, { fill: '#16101c', edge: '#7a5aa0', hi: '#c8a0ff' });
    const spr = AH.SPR[{ smith: 'smith', store: 'herbal', inn: 'keeper', shrine: 'priest' }[q.giver]];
    if (spr) AH.drawSpr(ctx, spr, x + 12, y + 14, false, 3);
    AH.text(ctx, x + 70, y + 10, q.name, '#c8a0ff', { scale: 1 });
    const stepIdx = qf.mode === 'offer' ? 0 : st.s;
    const step = q.steps[stepIdx];
    AH.text(ctx, x + 70, y + 22, (stepIdx + 1) + '/' + q.steps.length, '#6f6880');
    let say = qf.mode === 'turnin' ? step.done : step.ask;
    let yy = y + 40;
    for (const l of AH.wrap('"' + say + '"', 270)) { AH.text(ctx, x + 70, yy, l, '#e9e2d0'); yy += 10; }
    yy += 8;
    if (qf.mode !== 'turnin') {
      AH.text(ctx, x + 70, yy, 'OBJECTIVE', '#8d8494'); yy += 11;
      for (const l of AH.wrap(AH.tr(step.goal) + (step.type === 'kill' && st ? ' (' + st.prog + '/' + step.n + ')' : ''), 270)) { AH.text(ctx, x + 70, yy, l, '#ffb347'); yy += 10; }
    } else if (stepIdx === q.steps.length - 1) {
      AH.text(ctx, x + 70, yy, 'REWARD', '#8d8494'); yy += 11;
      AH.text(ctx, x + 70, yy, q.reward.gold + 'G  +' + q.reward.trust + ' TRUST', '#f2c94c'); yy += 10;
      AH.text(ctx, x + 70, yy, AH.QUEST_UNIQUES[q.reward.item].name, '#d890ff');
    }
    U.list(ctx, U.questItems(G, m), m.sel, x + 70, y + h - 40, 220);
  };

  AH.addI18n(`QUEST UPDATED|QUÊTE MISE À JOUR|KÜLDETÉS FRISSÜLT
RETURN TO DUNMERE|RETOURNE À DUNMERE|TÉRJ VISSZA DUNMERE-BE
QUEST COMPLETE|QUÊTE ACCOMPLIE|KÜLDETÉS TELJESÍTVE
ACCEPT|ACCEPTER|ELFOGADOM
NOT NOW|PAS MAINTENANT|MOST NEM
TELL THEM WHAT HAPPENED|RACONTER CE QUI S'EST PASSÉ|ELMESÉLED, MI TÖRTÉNT
OBJECTIVE|OBJECTIF|FELADAT
REWARD|RÉCOMPENSE|JUTALOM
TAKE|PRENDRE|FELVESZ
{0}G  +{1} TRUST|{0}G  +{1} CONFIANCE|{0}G  +{1} BIZALOM
THE FOREMAN'S LEDGER|LE REGISTRE DU CONTREMAÎTRE|A MŰVEZETŐ NAPLÓJA
THE LOST SHIFT|L'ÉQUIPE DISPARUE|AZ ELTŰNT MŰSZAK
THE PRIEST'S SECRET|LE SECRET DU PRÊTRE|A PAP TITKA
MERA'S CURE|LE REMÈDE DE MERA|MERA GYÓGYSZERE
SKARN'S LEDGER|REGISTRE DE SKARN|SKARN NAPLÓJA
STRIPED HELMET|CASQUE RAYÉ|CSÍKOS SISAK
BLACK CANDLE|BOUGIE NOIRE|FEKETE GYERTYA
GLOWCAP SPORES|SPORES DE LUISECHAPEAU|FÉNYGOMBA-SPÓRÁK
FOREMAN'S SHADE|OMBRE DU CONTREMAÎTRE|A MŰVEZETŐ ÁRNYA
WHO WEARS SKARN'S FACE|QUI PORTE LE VISAGE DE SKARN|AKI SKARN ARCÁT VISELI
THE TUNNEL MAW|LA GUEULE DU TUNNEL|AZ ALAGÚTTOROK
THAT SWALLOWED THE SHIFT|QUI A AVALÉ L'ÉQUIPE|AMI ELNYELTE A MŰSZAKOT
VESSA'S ECHO|ÉCHO DE VESSA|VESSA VISSZHANGJA
WHO PRAYED TO THE HEART|QUI PRIAIT LE CŒUR|AKI A SZÍVHEZ IMÁDKOZOTT
THE ASHMOTHER|LA MÈRE-CENDRE|A HAMUANYA
WHO BREATHES THE SICKNESS|QUI EXHALE LA MALADIE|AKI A KÓRT LEHELI
SKARN'S HAMMER|MARTEAU DE SKARN|SKARN KALAPÁCSA
TOM'S LUCKY TANKARD|CHOPE PORTE-BONHEUR DE TOM|TOM SZERENCSEKORSÓJA
WARDEN'S SEAL|SCEAU DU GARDIEN|AZ ŐRZŐ PECSÉTJE
ASHMOTHER'S VEIL|VOILE DE LA MÈRE-CENDRE|A HAMUANYA FÁTYLA
SKARN WAS MY FRIEND. HIS LEDGER WAS LOST ON THE FIFTH FLOOR. FIND IT FOR ME.|SKARN ÉTAIT MON AMI. SON REGISTRE S'EST PERDU AU CINQUIÈME ÉTAGE. RETROUVE-LE POUR MOI.|SKARN A BARÁTOM VOLT. A NAPLÓJA AZ ÖTÖDIK SZINTEN VESZETT EL. KERESD MEG NEKEM.
FIND SKARN'S LEDGER ON FLOOR 5|TROUVE LE REGISTRE DE SKARN À L'ÉTAGE 5|KERESD MEG SKARN NAPLÓJÁT AZ 5. SZINTEN
HE WROTE OF A WARM STONE THAT BEAT LIKE A HEART... SO IT IS TRUE.|IL PARLE D'UNE PIERRE CHAUDE QUI BATTAIT COMME UN CŒUR... C'EST DONC VRAI.|EGY MELEG KŐRŐL ÍR, AMI ÚGY DOBOGOTT, MINT EGY SZÍV... HÁT IGAZ.
HIS CREW STILL WALKS DOWN THERE. GIVE THEM REST.|SON ÉQUIPE ERRE ENCORE LÀ-DESSOUS. OFFRE-LEUR LE REPOS.|A CSAPATA MÉG MINDIG ODALENT JÁR. ADJ NEKIK NYUGALMAT.
PUT 12 BONE WALKERS TO REST|DONNE LE REPOS À 12 MARCHEURS D'OS|NYUGTASS MEG 12 CSONTJÁRÓT
THANK YOU. NOW THEY CAN SLEEP.|MERCI. MAINTENANT ILS PEUVENT DORMIR.|KÖSZÖNÖM. MOST MÁR ALUDHATNAK.
SOMETHING WEARS SKARN'S FACE ON THE TWELFTH FLOOR. END IT.|QUELQUE CHOSE PORTE LE VISAGE DE SKARN AU DOUZIÈME ÉTAGE. ACHÈVE-LE.|VALAMI SKARN ARCÁT VISELI A TIZENKETTEDIK SZINTEN. VÉGEZZ VELE.
DESTROY THE FOREMAN'S SHADE ON FLOOR 12|DÉTRUIS L'OMBRE DU CONTREMAÎTRE À L'ÉTAGE 12|PUSZTÍTSD EL A MŰVEZETŐ ÁRNYÁT A 12. SZINTEN
IT IS DONE. TAKE HIS HAMMER. HE WOULD HAVE WANTED THAT.|C'EST FINI. PRENDS SON MARTEAU. IL L'AURAIT VOULU.|VÉGE. VEDD EL A KALAPÁCSÁT. Ő IS EZT AKARTA VOLNA.
THE NIGHT SHIFT NEVER CAME HOME. REACH THE TENTH FLOOR AND LOOK FOR SIGNS.|L'ÉQUIPE DE NUIT N'EST JAMAIS RENTRÉE. ATTEINS LE DIXIÈME ÉTAGE ET CHERCHE DES INDICES.|AZ ÉJSZAKAI MŰSZAK SOSEM JÖTT HAZA. JUSS LE A TIZEDIK SZINTRE, ÉS KERESS NYOMOKAT.
REACH FLOOR 10|ATTEINS L'ÉTAGE 10|ÉRD EL A 10. SZINTET
TEN FLOORS... AND NOT ONE OF THEM. KEEP LOOKING.|DIX ÉTAGES... ET AUCUN D'EUX. CONTINUE À CHERCHER.|TÍZ SZINT... ÉS EGYIKÜK SEM. KERESS TOVÁBB.
MY SON WORE A HELMET WITH A RED STRIPE. FLOOR 14, THEY SAY.|MON FILS PORTAIT UN CASQUE À BANDE ROUGE. ÉTAGE 14, DIT-ON.|A FIAM PIROS CSÍKOS SISAKOT HORDOTT. A 14. SZINTEN, AZT MONDJÁK.
FIND THE STRIPED HELMET ON FLOOR 14|TROUVE LE CASQUE RAYÉ À L'ÉTAGE 14|KERESD MEG A CSÍKOS SISAKOT A 14. SZINTEN
THAT IS HIS. THEN WHERE IS HE?|C'EST LE SIEN. ALORS OÙ EST-IL ?|EZ AZ ÖVÉ. AKKOR HOL VAN Ő?
A WORM AS BIG AS A WAGON NESTS ON FLOOR 18. IT TOOK THEM.|UN VER GROS COMME UN CHARIOT NICHE À L'ÉTAGE 18. C'EST LUI QUI LES A PRIS.|EGY SZEKÉRNYI FÉREG FÉSZKEL A 18. SZINTEN. Ő VITTE EL ŐKET.
SLAY THE TUNNEL MAW ON FLOOR 18|TUE LA GUEULE DU TUNNEL À L'ÉTAGE 18|ÖLD MEG AZ ALAGÚTTORKOT A 18. SZINTEN
THEN IT IS OVER. YOUR DRINKS ARE ON THE HOUSE. FOREVER.|ALORS C'EST FINI. TES VERRES SONT OFFERTS. POUR TOUJOURS.|AKKOR VÉGE. AZ ITALOD INGYEN VAN. ÖRÖKRE.
BEFORE THE LAMPS, WE BURNED BLACK CANDLES. ONE STILL STANDS ON FLOOR 20. BRING IT.|AVANT LES LAMPES, NOUS BRÛLIONS DES BOUGIES NOIRES. L'UNE D'ELLES EST ENCORE À L'ÉTAGE 20. RAPPORTE-LA.|A LÁMPÁK ELŐTT FEKETE GYERTYÁKAT ÉGETTÜNK. EGY MÉG ÁLL A 20. SZINTEN. HOZD EL.
BRING THE BLACK CANDLE FROM FLOOR 20|RAPPORTE LA BOUGIE NOIRE DE L'ÉTAGE 20|HOZD EL A FEKETE GYERTYÁT A 20. SZINTRŐL
YOU SHOULD NOT HAVE TOUCHED IT BARE-HANDED. NO MATTER.|TU N'AURAIS PAS DÛ LA TOUCHER À MAINS NUES. PEU IMPORTE.|NEM KELLETT VOLNA PUSZTA KÉZZEL MEGÉRINTENED. MINDEGY.
THE CANDLE CALLS THEM. FIVE GRAVE CALLERS STILL KEEP THE OLD RITES.|LA BOUGIE LES APPELLE. CINQ INVOCATEURS DES TOMBES PERPÉTUENT LES VIEUX RITES.|A GYERTYA HÍVJA ŐKET. ÖT HALOTTIDÉZŐ MÉG MINDIG ŐRZI A RÉGI SZERTARTÁSOKAT.
SLAY 5 GRAVE CALLERS|TUE 5 INVOCATEURS DES TOMBES|ÖLJ MEG 5 HALOTTIDÉZŐT
GOOD. THE CHORUS IS QUIETER NOW.|BIEN. LE CHŒUR EST PLUS DISCRET MAINTENANT.|JÓ. A KÓRUS MOST MÁR CSENDESEBB.
NOW YOU MUST KNOW THE TRUTH. GO TO THE FORTIETH FLOOR, THEN COME BACK TO ME.|TU DOIS MAINTENANT CONNAÎTRE LA VÉRITÉ. VA AU QUARANTIÈME ÉTAGE, PUIS REVIENS ME VOIR.|MOST MEG KELL TUDNOD AZ IGAZSÁGOT. JUSS EL A NEGYVENEDIK SZINTRE, AZTÁN GYERE VISSZA HOZZÁM.
REACH FLOOR 40|ATTEINS L'ÉTAGE 40|ÉRD EL A 40. SZINTET
WE DID NOT DIG TOO DEEP. WE WERE SENT. THE HEART IS A PRISON, AND WE ARE ITS WARDENS.|NOUS N'AVONS PAS CREUSÉ TROP PROFOND. ON NOUS A ENVOYÉS. LE CŒUR EST UNE PRISON, ET NOUS EN SOMMES LES GARDIENS.|NEM ÁSTUNK TÚL MÉLYRE. MINKET KÜLDTEK. A SZÍV EGY BÖRTÖN, ÉS MI VAGYUNK AZ ŐRZŐI.
VESSA PRAYED TO IT. HER ECHO WAITS ON FLOOR 45. SILENCE HER.|VESSA LE PRIAIT. SON ÉCHO ATTEND À L'ÉTAGE 45. FAIS-LA TAIRE.|VESSA HOZZÁ IMÁDKOZOTT. A VISSZHANGJA A 45. SZINTEN VÁR. NÉMÍTSD EL.
SILENCE VESSA'S ECHO ON FLOOR 45|FAIS TAIRE L'ÉCHO DE VESSA À L'ÉTAGE 45|NÉMÍTSD EL VESSA VISSZHANGJÁT A 45. SZINTEN
FORGIVE ME FOR NOT TELLING YOU SOONER.|PARDONNE-MOI DE NE PAS TE L'AVOIR DIT PLUS TÔT.|BOCSÁSS MEG, HOGY NEM MONDTAM EL HAMARABB.
THE TOWN COUGHS ASH. I NEED GLOWCAP SPORES FROM FLOOR 28.|LA VILLE TOUSSE DE LA CENDRE. IL ME FAUT DES SPORES DE LUISECHAPEAU DE L'ÉTAGE 28.|A VÁROS HAMUT KÖHÖG. FÉNYGOMBA-SPÓRÁK KELLENEK A 28. SZINTRŐL.
GATHER GLOWCAP SPORES ON FLOOR 28|RÉCOLTE DES SPORES DE LUISECHAPEAU À L'ÉTAGE 28|GYŰJTS FÉNYGOMBA-SPÓRÁKAT A 28. SZINTEN
YES! THIS WILL HELP THE CHILDREN.|OUI ! CELA VA AIDER LES ENFANTS.|IGEN! EZ SEGÍT MAJD A GYEREKEKEN.
THE CURE MUST BE KEPT COLD. BRING ME THE CORES OF 8 ICE WISPS.|LE REMÈDE DOIT RESTER FROID. APPORTE-MOI LES CŒURS DE 8 FOLLETS DE GLACE.|A GYÓGYSZERT HIDEGEN KELL TARTANI. HOZD EL 8 JÉGLIDÉRC MAGJÁT.
SLAY 8 ICE WISPS|TUE 8 FOLLETS DE GLACE|ÖLJ MEG 8 JÉGLIDÉRCET
COLD AS A GRAVE. PERFECT.|FROID COMME UNE TOMBE. PARFAIT.|HIDEG, MINT A SÍR. TÖKÉLETES.
THE SICKNESS COMES FROM SOMETHING ON FLOOR 66. KILL IT AND THE AIR WILL CLEAR.|LA MALADIE VIENT DE QUELQUE CHOSE À L'ÉTAGE 66. TUE-LE ET L'AIR S'ÉCLAIRCIRA.|A KÓR VALAMITŐL JÖN A 66. SZINTEN. ÖLD MEG, ÉS KITISZTUL A LEVEGŐ.
SLAY THE ASHMOTHER ON FLOOR 66|TUE LA MÈRE-CENDRE À L'ÉTAGE 66|ÖLD MEG A HAMUANYÁT A 66. SZINTEN
THE TOWN BREATHES AGAIN. THANK YOU, HERO.|LA VILLE RESPIRE À NOUVEAU. MERCI, HÉROS.|A VÁROS ÚJRA LÉLEGZIK. KÖSZÖNÖM, HŐS.
THEY SAY YOU SLEW {0}!|ON DIT QUE TU AS TERRASSÉ {0} !|AZT MONDJÁK, LEGYŐZTED: {0}!
WAS {0} AS BIG AS THEY SAY?|{0} ÉTAIT-IL AUSSI GROS QU'ON LE DIT ?|TÉNYLEG AKKORA VOLT {0}, MINT MONDJÁK?
YOU FINALLY GOT {0}. GOOD.|TU AS ENFIN EU {0}. TANT MIEUX.|VÉGRE ELKAPTAD: {0}. HELYES.
EVERYONE IS TALKING ABOUT {0}.|TOUT LE MONDE PARLE DE : {0}.|MINDENKI ERRŐL BESZÉL: {0}.
FLOOR {0}? NOBODY HAS BEEN THAT DEEP IN YEARS.|L'ÉTAGE {0} ? PERSONNE N'EST DESCENDU SI BAS DEPUIS DES ANNÉES.|A(Z) {0}. SZINT? ÉVEK ÓTA SENKI SEM JÁRT ILYEN MÉLYEN.
THE GROUND STOPPED SHAKING WHEN YOU KILLED {0}.|LE SOL A CESSÉ DE TREMBLER QUAND TU AS TUÉ {0}.|A FÖLD ABBAHAGYTA A REMEGÉST, AMIKOR MEGÖLTED: {0}.
ONLY {0} LAMPS STILL BURN. I AM AFRAID.|SEULEMENT {0} LAMPES BRÛLENT ENCORE. J'AI PEUR.|MÁR CSAK {0} LÁMPA ÉG. FÉLEK.
I HEARD YOU ARE HELPING WITH {0}.|IL PARAÎT QUE TU AIDES POUR : {0}.|HALLOTTAM, SEGÍTESZ EBBEN: {0}.
THIS RAIN GETS INTO THE BONES.|CETTE PLUIE TRANSPERCE LES OS.|EZ AZ ESŐ CSONTIG HATOL.
AT LEAST THE MINE IS DRY.|AU MOINS LA MINE EST SÈCHE.|LEGALÁBB A BÁNYA SZÁRAZ.
SNOW IN DUNMERE. THE OLD ONES SAY IT IS A BAD SIGN.|DE LA NEIGE À DUNMERE. LES ANCIENS DISENT QUE C'EST UN MAUVAIS SIGNE.|HÓ DUNMERE-BEN. AZ ÖREGEK SZERINT EZ ROSSZ JEL.
MY HANDS ARE FROZEN.|J'AI LES MAINS GELÉES.|ÁTFAGYTAK A KEZEIM.
STAY INSIDE. THE STORM IS ANGRY TONIGHT.|RESTE À L'ABRI. L'ORAGE EST FURIEUX CE SOIR.|MARADJ BENT. DÜHÖS MA ÉJJEL A VIHAR.
THE THUNDER SOUNDS LIKE A HEARTBEAT.|LE TONNERRE RESSEMBLE À UN BATTEMENT DE CŒUR.|A MENNYDÖRGÉS OLYAN, MINT A SZÍVDOBOGÁS.
I CANNOT SEE MY OWN FEET IN THIS FOG.|JE NE VOIS MÊME PAS MES PIEDS DANS CE BROUILLARD.|EBBEN A KÖDBEN A SAJÁT LÁBAMAT SEM LÁTOM.
IT IS LATE, HERO. EVEN HEROES SLEEP.|IL EST TARD, HÉROS. MÊME LES HÉROS DORMENT.|KÉSŐ VAN, HŐS. MÉG A HŐSÖK IS ALSZANAK.
DO YOU HEAR IT TOO? THE BEATING UNDER THE STREETS?|TU L'ENTENDS AUSSI ? LE BATTEMENT SOUS LES RUES ?|TE IS HALLOD? A DOBOGÁST AZ UTCÁK ALATT?
GOOD MORNING. THE BAKER HAS FRESH BREAD.|BONJOUR. LE BOULANGER A DU PAIN FRAIS.|JÓ REGGELT. A PÉKNÉL FRISS KENYÉR VAN.
WHY SHOULD WE TRUST YOU? THE LAMPS KEEP GOING OUT.|POURQUOI TE FAIRE CONFIANCE ? LES LAMPES N'ARRÊTENT PAS DE S'ÉTEINDRE.|MIÉRT BÍZNÁNK BENNED? A LÁMPÁK SORRA KIALSZANAK.
MY FAMILY IS LEAVING DUNMERE NEXT WEEK.|MA FAMILLE QUITTE DUNMERE LA SEMAINE PROCHAINE.|A CSALÁDOM JÖVŐ HÉTEN ELHAGYJA DUNMERE-T.
THE CHILDREN PLAY HEROES NOW. GUESS WHO THEY PRETEND TO BE.|LES ENFANTS JOUENT AUX HÉROS. DEVINE QUI ILS IMITENT.|A GYEREKEK MOST HŐSÖSDIT JÁTSZANAK. TALÁLD KI, KINEK TETTETIK MAGUKAT.
DUNMERE HAS NOT FELT THIS SAFE IN YEARS.|DUNMERE NE S'EST PAS SENTIE AUSSI SÛRE DEPUIS DES ANNÉES.|DUNMERE ÉVEK ÓTA NEM ÉREZTE MAGÁT ILYEN BIZTONSÁGBAN.`);
})();
