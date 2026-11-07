'use strict';
// Cleared floors: the town trusts the hero who makes the mine safe, not the one who runs past everything.
// Every floor counts the monsters that were there when you arrived. Leave it mostly cleared and Dunmere hears of it;
// rush past and the monsters you left behind become the town's worry.
(function () {
  const GP = AH.Game.prototype;
  const TRIP_CAP = 8;   // most trust one trip down can earn by clearing
  const NEAR = 10;      // only floors near your deepest count (no farming floor 1 forever)
  const counts = e => !e.sobj && !e.minion && !e.goldrat && !e.raider && !e.dead;

  // judge the floor you are leaving
  GP.judgeFloor = function () {
    if (this.scene !== 'mine' || this.isRun() || !this.clearTotal || !this.world) return;
    // monsters you killed, and thieves that ran off, both count as dealt with
    const list = this.clearList || [], total = this.clearTotal, pct = list.filter(e => e.cleared || e.gone).length / total;
    this.clearTotal = 0;
    const deepest = Math.max(...this.players.map(p => p.ch.deepest || 0));
    if (this.floorNo < deepest - NEAR) return;
    const W = this.world;
    if (pct < 0.3) { W.rushed = (W.rushed || 0) + 1; return; }
    if (pct < 0.8) return;
    const full = pct >= 1 && list.filter(e => e.elite).every(e => e.cleared || e.gone);
    let gain = full ? 2 : 1;
    gain = Math.min(gain, TRIP_CAP - (this.tripClean || 0));
    if (gain <= 0) return;
    this.tripClean = (this.tripClean || 0) + gain;
    if (full) { this.banner('FLOOR CLEANSED!', '#f2c94c', 'DUNMERE WILL HEAR OF IT'); AH.Audio.sfx('achieve'); }
    this.toast(null, (full ? '' : AH.tr('THE TOWN HEARS OF YOUR WORK') + '  ') + '+' + gain + ' ' + AH.tr('TRUST'), '#8ae08e');
    this.changeTrust(gain);
  };

  const _enter = GP.enterMine;
  GP.enterMine = function (floor, mode) {
    if (this.scene === 'mine') this.judgeFloor(); else this.tripClean = 0;
    _enter.call(this, floor, mode);
    // count what lives here now (later ambushes and summons are extra)
    const list = this.enemies.filter(counts);
    this.clearList = list; this.clearTotal = list.length; this.clearKills = 0;
    for (const e of list) e.countClear = true;
  };
  const _killed = GP.onEnemyKilled;
  GP.onEnemyKilled = function (e, by) {
    if (e && e.countClear && !e.cleared) { e.cleared = true; this.clearKills = (this.clearKills || 0) + 1; }
    _killed.call(this, e, by);
  };
  const _leave = GP.leaveMine;
  GP.leaveMine = function (why) {
    if (why !== 'death') this.judgeFloor();
    const W = this.world;
    _leave.call(this, why);
    // every three floors you ran past, their monsters climb towards the town
    if (W && W.rushed >= 3) {
      const n = Math.floor(W.rushed / 3); W.rushed -= n * 3;
      this.changeTrust(-n, 'MONSTERS ROAM THE UPPER SHAFTS');
    }
  };
})();

AH.addI18n(`
CLEARED {0}%|NETTOYÉ {0}%|TISZTÍTVA {0}%
FLOOR CLEANSED!|ÉTAGE NETTOYÉ !|SZINT MEGTISZTÍTVA!
DUNMERE WILL HEAR OF IT|DUNMERE EN ENTENDRA PARLER|DUNMERE HALLANI FOG RÓLA
THE TOWN HEARS OF YOUR WORK|LA VILLE ENTEND PARLER DE TON TRAVAIL|A VÁROS HALL A MUNKÁDRÓL
MONSTERS ROAM THE UPPER SHAFTS|DES MONSTRES RÔDENT DANS LES PUITS DU HAUT|SZÖRNYEK JÁRNAK A FELSŐ TÁRNÁKBAN
`);
