'use strict';
// Game data: classes, skills, biomes, creatures, legendaries, events, lore
AH.CLASSES = {
  paladin: {
    name: 'PALADIN', color: '#ff9a8a', stat: 'str', base: { str: 8, dex: 4, int: 3, vit: 7 }, hp: 46, mp: 24, speed: 1.0,
    look: { head: 'helm', torso: 'plate', legs: 'pants' }, start: { weapon: 'sword', off: 'shield' },
    skills: ['smite', 'aegis', 'consecrate'], desc: 'HOLY KNIGHT. TOUGH, BLOCKS WITH SHIELDS, PUNISHES THE UNDEAD.',
  },
  rogue: {
    name: 'ROGUE', color: '#8ae08e', stat: 'dex', base: { str: 4, dex: 9, int: 4, vit: 5 }, hp: 45, mp: 26, speed: 1.12,
    look: { head: 'hood', torso: 'leather', legs: 'pants' }, start: { weapon: 'dagger', off: null },
    skills: ['shadowstep', 'knives', 'smoke'], desc: 'FAST AND DEADLY. CRITICAL HITS AND BACKSTABS.',
  },
  wizard: {
    name: 'WIZARD', color: '#9ec0ff', stat: 'int', base: { str: 3, dex: 4, int: 10, vit: 5 }, hp: 40, mp: 40, speed: 1.0,
    look: { head: 'beard', torso: 'robe', legs: 'robe' }, start: { weapon: 'staff', off: null },
    skills: ['firebolt', 'frostnova', 'chain'], desc: 'MASTER OF FIRE, FROST AND STORM. FRAGILE BUT FIERCE.',
  },
};

// skills: mp cost, cooldown (s), icon
AH.SKILLS = {
  smite: { name: 'HOLY SMITE', mp: 10, cd: 4, icon: 'sun', desc: 'HOLY BLAST AROUND YOU. DOUBLE VS UNDEAD.' },
  aegis: { name: 'AEGIS', mp: 14, cd: 16, icon: 'aegis', desc: 'TAKE 50% LESS DAMAGE FOR 6 SECONDS.' },
  consecrate: { name: 'CONSECRATE', mp: 16, cd: 12, icon: 'holy', desc: 'HOLY GROUND: BURNS FOES, HEALS ALLIES.' },
  shadowstep: { name: 'SHADOWSTEP', mp: 8, cd: 5, icon: 'step', desc: 'BLINK BEHIND A FOE. NEXT HIT CRITS.' },
  knives: { name: 'FAN OF KNIVES', mp: 10, cd: 5, icon: 'knives', desc: 'THROW 8 KNIVES IN A RING.' },
  smoke: { name: 'SMOKE BOMB', mp: 12, cd: 14, icon: 'smoke', desc: 'FOES LOSE YOU AND SLOW DOWN.' },
  firebolt: { name: 'FIREBOLT', mp: 7, cd: 1.0, icon: 'flame', desc: 'EXPLODING FIRE BOLT.' },
  frostnova: { name: 'FROST NOVA', mp: 12, cd: 7, icon: 'frost', desc: 'FREEZE NEARBY FOES.' },
  chain: { name: 'CHAIN LIGHTNING', mp: 14, cd: 3, icon: 'bolt', desc: 'LIGHTNING JUMPS BETWEEN FOES.' },
  whirl: { name: 'WHIRLWIND', mp: 14, cd: 8, icon: 'heavy', desc: 'SPIN AND HIT EVERYTHING AROUND.' },
  mend: { name: 'MEND', mp: 18, cd: 20, icon: 'potion', desc: 'HEAL 35% OF YOUR LIFE.' },
  spiritwolf: { name: 'SPIRIT WOLF', mp: 20, cd: 30, icon: 'step', desc: 'SUMMON A GHOST WOLF FOR 20 SECONDS.' },
};

// ---------------- biomes ----------------
AH.BIOMES = [
  { id: 'stone', name: 'STONE HALLS', floor: ['#17131b', '#2c2634', '#3c3546', '#4f475b', '#5e5669'], brick: ['#0e0b12', '#2c2532', '#3c3344', '#52485c', '#362e3e'], tint: [1.0, 0.92, 0.8], ambient: 0.24, deco: 'rubble', hazard: null },
  { id: 'moss', name: 'MOSSY CAVERNS', floor: ['#121a12', '#22302a', '#2e4034', '#3e5444', '#4e6a4a'], brick: ['#0a100a', '#1e2a1e', '#2a3a2a', '#3e5a3a', '#24321e'], tint: [0.85, 1.0, 0.8], ambient: 0.22, deco: 'moss', hazard: 'water' },
  { id: 'crystal', name: 'CRYSTAL DEPTHS', floor: ['#121820', '#22303a', '#2e3e4a', '#3e5260', '#4a6070'], brick: ['#0a0e12', '#1e2a34', '#2a3a46', '#3e5262', '#24323e'], tint: [0.8, 0.95, 1.1], ambient: 0.24, deco: 'crystal', hazard: null },
  { id: 'fungal', name: 'FUNGAL GROTTO', floor: ['#1a1220', '#2e2236', '#3e2e48', '#523e5e', '#6a4e74'], brick: ['#100a14', '#2a1e30', '#3a2a42', '#54405e', '#322438'], tint: [1.0, 0.85, 1.05], ambient: 0.23, deco: 'shroom', hazard: 'gas' },
  { id: 'sunken', ruins: 1, name: 'SUNKEN RUINS', floor: ['#0e1620', '#1a2a3a', '#24384a', '#32485e', '#3e5a70'], brick: ['#08101a', '#16263a', '#20344a', '#344c66', '#1c2e42'], tint: [0.75, 0.9, 1.1], ambient: 0.23, deco: 'rubble', hazard: 'water' },
  { id: 'bone', ruins: 1, name: 'BONE CATACOMBS', floor: ['#1a1814', '#2e2a24', '#3e3a32', '#524c42', '#6a6254'], brick: ['#100e0a', '#2a261e', '#3a342a', '#5a5242', '#322c22'], tint: [1.0, 0.95, 0.85], ambient: 0.23, deco: 'bones', hazard: null },
  { id: 'frozen', name: 'FROZEN DEEP', floor: ['#141a22', '#2a3442', '#3a4858', '#506276', '#6a7e94'], brick: ['#0c1018', '#24303e', '#344456', '#56708a', '#2e3c4c'], tint: [0.85, 0.95, 1.15], ambient: 0.22, deco: 'ice', hazard: 'ice' },
  { id: 'magma', name: 'MAGMA VEINS', floor: ['#1a0e0c', '#2e1a16', '#3e2420', '#52302a', '#6a3e32'], brick: ['#100806', '#2a1612', '#3a201a', '#5a3026', '#321c16'], tint: [1.15, 0.8, 0.6], ambient: 0.24, deco: 'rubble', hazard: 'lava' },
  { id: 'shadow', name: 'SHADOW RIFT', floor: ['#0e0c14', '#1c1828', '#262036', '#342c4a', '#443a5e'], brick: ['#06040a', '#16121e', '#201a2c', '#3a2e50', '#1c1626'], tint: [0.9, 0.8, 1.15], ambient: 0.21, deco: 'crystal', hazard: 'void' },
  { id: 'ashen', ruins: 1, name: 'ASHEN HEART', floor: ['#160c0a', '#2a1814', '#3a221c', '#4e2e24', '#66402e'], brick: ['#0c0604', '#24120e', '#341a14', '#5a2a1c', '#2c1610'], tint: [1.2, 0.75, 0.55], ambient: 0.23, deco: 'ember', hazard: 'lava' },
];
AH.biomeOf = f => AH.BIOMES[Math.min(9, Math.floor((Math.max(1, f) - 1) / 10)) % 10];

// creature definitions: base sprite, palette override, ai, hp, dmg, speed
const C = (name, spr, pal, ai, hp, dmg, spd, extra) => Object.assign({ name, spr, pal, ai, hp, dmg, spd }, extra || {});
AH.CREATURES = {
  stone: [
    C('CAVE RAT', 'rat', {}, 'swarm', 8, 3, 1.5, { xp: 3 }),
    C('BONE WALKER', 'skel', {}, 'chase', 18, 5, 0.75, { undead: 1, xp: 6 }),
    C('PALE SLIME', 'slime', { g: '#c8c0b0', G: '#8a8478', h: '#ffffff', D: '#5a5446' }, 'blob', 16, 4, 0.9, { split: 1, xp: 5 }),
    C('CAVE BAT', 'bat', {}, 'swarm', 9, 3, 1.6, { fly: 1, xp: 4 }),
    C('TUNNEL GOBLIN', 'goblin', {}, 'chase', 14, 5, 1.1, { xp: 6 }),
    C('DUST SPIDER', 'spider', { K: '#6a5a4a', k: '#3a2e24' }, 'ambush', 15, 6, 1.2, { xp: 7 }),
    C('GRAVEL GOLEM', 'golem', {}, 'tank', 50, 10, 0.5, { xp: 16, minF: 6 }),
  ],
  moss: [
    C('MOSS SLIME', 'slime', {}, 'blob', 26, 7, 0.9, { split: 1, xp: 8 }),
    C('BOG SPIDER', 'spider', { K: '#3e6a3a', k: '#1e3a1e', e: '#c8ff4a' }, 'spit', 24, 6, 1.0, { proj: '#9ad84a', poison: 1, xp: 10 }),
    C('MUSHROOM MAN', 'shroom', { r: '#8a6a3a', R: '#5a4424' }, 'spit', 30, 7, 0.7, { proj: '#c8e07a', xp: 10 }),
    C('MOSS SHAMAN', 'cultist', { p: '#3a5a2a', P: '#24381a' }, 'summon', 34, 6, 0.8, { minion: 'MOSS SLIME', xp: 16 }),
    C('SWAMP BAT', 'bat', { p: '#4a6a3a', P: '#2a3a24' }, 'swarm', 16, 6, 1.6, { fly: 1, xp: 7 }),
    C('ROTTEN DEAD', 'skel', { b: '#a8b48a', B: '#6a7a5a' }, 'chase', 36, 9, 0.8, { undead: 1, xp: 10 }),
    C('GRUB WORM', 'worm', { p: '#c8c07a', P: '#8a845a' }, 'ambush', 40, 10, 0.9, { xp: 12 }),
  ],
  crystal: [
    C('CRYSTAL SLIME', 'slime', { g: '#6fd6e8', G: '#3fa6c0', h: '#ffffff', D: '#2a6a7a' }, 'blob', 44, 10, 1.0, { split: 1, xp: 12 }),
    C('SHARD GOLEM', 'golem', { s: '#4fbcd8', S: '#2a7a96', d: '#1a4a5a', e: '#ffffff' }, 'tank', 110, 18, 0.5, { xp: 30 }),
    C('PRISM EYE', 'eye', { r: '#6fd6e8', v: '#3fa6c0' }, 'spit', 40, 11, 0.6, { fly: 1, proj: '#9ef0ff', xp: 16 }),
    C('GLASS SPIDER', 'spider', { K: '#9ef0ff', k: '#3fa6c0' }, 'ambush', 42, 12, 1.4, { xp: 15 }),
    C('CRYSTAL BAT', 'bat', { p: '#6fd6e8', P: '#2a7a96' }, 'swarm', 26, 9, 1.7, { fly: 1, xp: 10 }),
    C('GEODE CRAB', 'crab', { o: '#7a8aa8', O: '#4a5a7a' }, 'charge', 60, 14, 0.8, { xp: 18 }),
    C('LIGHT WISP', 'ghost', { w: '#c8f8ff', W: '#6fd6e8' }, 'ghost', 34, 10, 1.0, { fly: 1, xp: 14 }),
  ],
  fungal: [
    C('SPORE BOMB', 'shroom', { r: '#c84ac8', R: '#8a2a8a' }, 'explode', 30, 26, 1.3, { xp: 14 }),
    C('FUNGAL GOBLIN', 'goblin', { g: '#a87ac8', G: '#6a4a8a' }, 'chase', 62, 15, 1.15, { xp: 18 }),
    C('ROT WORM', 'worm', { p: '#8a5a7a', P: '#5a3a4a' }, 'ambush', 80, 18, 1.0, { xp: 22 }),
    C('VIOLET SLIME', 'slime', { g: '#a85ad8', G: '#6a3a9a', h: '#e8c8ff', D: '#3a1a5a' }, 'blob', 60, 14, 1.0, { split: 1, xp: 18 }),
    C('MYCELIUM EYE', 'eye', { r: '#c84ac8', w: '#d8c8e0' }, 'spit', 54, 14, 0.6, { fly: 1, proj: '#e07ae0', xp: 20 }),
    C('CAP CRAB', 'crab', { o: '#c8484a', O: '#8a2a30' }, 'charge', 76, 18, 0.8, { xp: 22 }),
    C('SPORE BAT', 'bat', { p: '#8a4a8a', P: '#5a2a5a' }, 'swarm', 36, 12, 1.7, { fly: 1, xp: 14 }),
  ],
  sunken: [
    C('DROWNED DEAD', 'skel', { b: '#8ab4c8', B: '#5a7a96' }, 'chase', 90, 20, 0.85, { undead: 1, xp: 26 }),
    C('TIDE CRAB', 'crab', { o: '#3a8aa8', O: '#1e5a7a' }, 'charge', 100, 22, 0.9, { xp: 28 }),
    C('EEL WORM', 'worm', { p: '#4a7a9a', P: '#2a4a6a' }, 'ambush', 110, 24, 1.1, { xp: 30 }),
    C('WATER SLIME', 'slime', { g: '#4a8ad8', G: '#2a5aa8', h: '#c8e8ff', D: '#1a3a6a' }, 'blob', 80, 18, 1.0, { split: 1, xp: 24 }),
    C('SUNKEN GHOST', 'ghost', { w: '#a8d8e8', W: '#5a8aa8' }, 'ghost', 70, 20, 1.0, { fly: 1, xp: 26 }),
    C('CORAL GOLEM', 'golem', { s: '#d87a7a', S: '#a84a5a', d: '#6a2a3a' }, 'tank', 220, 34, 0.5, { xp: 50 }),
    C('ABYSS EYE', 'eye', { r: '#2a6ad8', w: '#c8d8e8' }, 'spit', 70, 20, 0.6, { fly: 1, proj: '#4a8ad8', xp: 26 }),
  ],
  bone: [
    C('BONE KNIGHT', 'skel', { r: '#9aa4b8', b: '#f2ecd8' }, 'tank', 200, 32, 0.65, { undead: 1, xp: 44 }),
    C('BONE ARCHER', 'skel', { r: '#6b4a2a' }, 'spit', 110, 26, 0.8, { undead: 1, proj: '#e2dcc8', xp: 34 }),
    C('GRAVE GHOST', 'ghost', {}, 'ghost', 100, 26, 1.0, { fly: 1, undead: 1, xp: 34 }),
    C('BONE SPIDER', 'spider', { K: '#e2dcc8', k: '#a8a08c' }, 'ambush', 120, 28, 1.3, { undead: 1, xp: 36 }),
    C('GHOUL HOUND', 'wolf', { d: '#8a8a6a', D: '#5a5a42', l: '#b4b48a' }, 'charge', 130, 30, 1.2, { undead: 1, xp: 38 }),
    C('NECROMANCER', 'cultist', { p: '#3a3a3a', P: '#1e1e1e', e: '#6fff8a' }, 'summon', 140, 24, 0.8, { minion: 'BONE WALKER', xp: 50 }),
    C('CRYPT BAT', 'bat', { p: '#5a5a5a', P: '#2e2e2e' }, 'swarm', 70, 22, 1.8, { fly: 1, xp: 26 }),
  ],
  frozen: [
    C('FROST WOLF', 'wolf', { d: '#c8d8e8', D: '#7a8aa8', l: '#ffffff', k: '#4a8ad8' }, 'charge', 170, 36, 1.3, { frost: 1, xp: 44 }),
    C('ICE GOLEM', 'golem', { s: '#c8e8ff', S: '#7aa8d8', d: '#3a5a8a', e: '#4a8ad8' }, 'tank', 340, 50, 0.45, { frost: 1, xp: 70 }),
    C('FROZEN DEAD', 'skel', { b: '#c8e8ff', B: '#7aa8d8' }, 'chase', 180, 38, 0.8, { undead: 1, frost: 1, xp: 44 }),
    C('SNOW SLIME', 'slime', { g: '#e8f0ff', G: '#a8b8d8', h: '#ffffff', D: '#6a7a9a' }, 'blob', 150, 32, 1.0, { split: 1, frost: 1, xp: 40 }),
    C('ICE WISP', 'ghost', { w: '#e8f8ff', W: '#7ac8f8' }, 'spit', 130, 34, 1.0, { fly: 1, proj: '#9ef0ff', frost: 1, xp: 42 }),
    C('RIME SPIDER', 'spider', { K: '#a8c8e8', k: '#5a7a9a' }, 'ambush', 160, 38, 1.3, { frost: 1, xp: 44 }),
    C('SNOW BAT', 'bat', { p: '#c8d8e8', P: '#7a8aa8' }, 'swarm', 100, 28, 1.8, { fly: 1, xp: 34 }),
  ],
  magma: [
    C('MAGMA SLIME', 'slime', { g: '#ff8a2e', G: '#c84a1a', h: '#fff2b0', D: '#5a1a0a' }, 'blob', 220, 44, 1.0, { split: 1, fire: 1, xp: 54 }),
    C('FIRE IMP', 'imp', {}, 'spit', 190, 44, 1.2, { fly: 1, proj: '#ffb347', fire: 1, xp: 54 }),
    C('EMBER GOLEM', 'golem', { s: '#5a3a2a', S: '#3a2418', d: '#c84a1a', e: '#ffb347' }, 'tank', 480, 66, 0.45, { fire: 1, xp: 90 }),
    C('LAVA WORM', 'worm', { p: '#ff8a2e', P: '#c84a1a', m: '#3a0a04' }, 'ambush', 260, 50, 1.1, { fire: 1, xp: 60 }),
    C('CINDER BAT', 'bat', { p: '#c84a1a', P: '#5a1a0a', e: '#ffe04a' }, 'swarm', 140, 36, 1.9, { fly: 1, fire: 1, xp: 44 }),
    C('ASH CRAB', 'crab', { o: '#5a5258', O: '#3a3438' }, 'charge', 260, 50, 0.9, { xp: 60 }),
    C('FLAME EYE', 'eye', { r: '#ff8a2e', w: '#ffd8a8' }, 'spit', 200, 46, 0.6, { fly: 1, proj: '#ff8a2e', fire: 1, xp: 56 }),
  ],
  shadow: [
    C('VOID GHOST', 'ghost', { w: '#4a3a6a', W: '#2a1e44', e: '#c8a0ff', k: '#c8a0ff' }, 'ghost', 260, 56, 1.1, { fly: 1, xp: 70 }),
    C('SHADOW WOLF', 'wolf', { d: '#2a2438', D: '#16121e', l: '#4a3e5e', k: '#c8a0ff' }, 'charge', 300, 60, 1.4, { xp: 74 }),
    C('VOID EYE', 'eye', { r: '#a05aff', w: '#3a2e4a', v: '#6a3aa8' }, 'spit', 260, 56, 0.7, { fly: 1, proj: '#c8a0ff', xp: 70 }),
    C('SHADE SPIDER', 'spider', { K: '#3a2e4a', k: '#16121e', e: '#c8a0ff' }, 'ambush', 300, 62, 1.4, { xp: 74 }),
    C('ABYSS CULTIST', 'cultist', { p: '#2a1a3a', P: '#14081e', e: '#c8a0ff' }, 'summon', 320, 50, 0.8, { minion: 'NIGHT IMP', xp: 90 }),
    C('NIGHT IMP', 'imp', { r: '#4a2a6a', R: '#2a1444', y: '#c8a0ff' }, 'swarm', 180, 44, 1.6, { fly: 1, xp: 54 }),
    C('HOLLOW GOLEM', 'golem', { s: '#3a2e4a', S: '#24183a', d: '#14081e', e: '#c8a0ff' }, 'tank', 600, 84, 0.45, { xp: 120 }),
  ],
  ashen: [
    C('ASHEN KNIGHT', 'skel', { b: '#5a5258', B: '#3a3438', e: '#ff8a2e', r: '#c84a1a' }, 'tank', 520, 84, 0.7, { undead: 1, fire: 1, xp: 110 }),
    C('EMBER CULTIST', 'cultist', { p: '#5a1a12', P: '#3a0e0a', e: '#ffb347' }, 'summon', 440, 70, 0.8, { minion: 'HELL IMP', fire: 1, xp: 120 }),
    C('ASH WRAITH', 'ghost', { w: '#8a8088', W: '#5a5258', e: '#ff8a2e', k: '#ff8a2e' }, 'ghost', 400, 76, 1.1, { fly: 1, undead: 1, xp: 100 }),
    C('CINDER GOLEM', 'golem', { s: '#4a3a32', S: '#2e241e', d: '#ff8a2e', e: '#fff2b0' }, 'tank', 800, 110, 0.45, { fire: 1, xp: 160 }),
    C('HELL IMP', 'imp', { r: '#e0402a', R: '#8a1a10' }, 'spit', 320, 70, 1.3, { fly: 1, proj: '#ff5a2e', fire: 1, xp: 90 }),
    C('BURNING SKULL', 'bat', { p: '#e2dcc8', P: '#ff8a2e', e: '#ff3b1f' }, 'explode', 220, 120, 1.7, { fly: 1, fire: 1, xp: 80 }),
    C('ASH WORM', 'worm', { p: '#5a5258', P: '#3a3438', m: '#ff3b1f' }, 'ambush', 460, 80, 1.1, { fire: 1, xp: 110 }),
  ],
};

// elite affixes
AH.ELITE_AFFIX = [
  { id: 'fast', name: 'SWIFT', desc: 'moves fast' },
  { id: 'vampiric', name: 'VAMPIRIC', desc: 'heals on hit' },
  { id: 'explosive', name: 'EXPLOSIVE', desc: 'explodes on death' },
  { id: 'shielded', name: 'SHIELDED', desc: 'periodic shield' },
  { id: 'frenzied', name: 'FRENZIED', desc: 'attacks faster' },
  { id: 'spectral', name: 'SPECTRAL', desc: 'blinks around' },
  { id: 'burning', name: 'BURNING', desc: 'leaves fire' },
  { id: 'frost', name: 'FROZEN', desc: 'hits slow you' },
  { id: 'splitting', name: 'SPLITTING', desc: 'splits on death' },
  { id: 'giant', name: 'GIANT', desc: 'huge and tough' },
];

// legendary creatures (named, rare, also bounty targets)
AH.LEGENDS = [
  { name: 'GRIMTOOTH', title: 'THE PALE HUNGER', spr: 'wolf', pal: { d: '#e8e2d8', D: '#a8a294', l: '#ffffff', k: '#ff3b1f' }, ai: 'charge', minF: 7, abil: ['enrage', 'howl'], drop: 'FANG OF GRIMTOOTH' },
  { name: 'OLD MOTHER MIRE', title: 'OF THE DEEP BOG', spr: 'slime', pal: { g: '#4a8a3a', G: '#2a5a24', h: '#c8ff8a' }, ai: 'blob', minF: 8, abil: ['split', 'spit3'], drop: 'MIRE HEART' },
  { name: 'THE GLASS WIDOW', title: 'WEAVER OF SHARDS', spr: 'spider', pal: { K: '#c8f8ff', k: '#6fd6e8', e: '#ff3b1f' }, ai: 'spit', minF: 18, abil: ['summon', 'spit3'], drop: 'WIDOW\'S KISS' },
  { name: 'SKARN', title: 'THE UNBURIED', spr: 'skel', pal: { b: '#f2ecd8', r: '#c8a060' }, ai: 'tank', minF: 12, abil: ['summon', 'nova'], drop: 'SKARN\'S CROWN' },
  { name: 'CAP\'N BRINECLAW', title: 'TERROR OF THE TIDE', spr: 'crab', pal: { o: '#d84a3a', O: '#8a2a20' }, ai: 'charge', minF: 30, abil: ['nova', 'enrage'], drop: 'BRINECLAW' },
  { name: 'THE THOUSAND EYES', title: 'WATCHER BELOW', spr: 'eye', pal: { r: '#ffb347', w: '#fff2d8' }, ai: 'spit', minF: 22, abil: ['spit3', 'blink'], drop: 'ALL-SEEING ORB' },
  { name: 'THE HOLLOW KING', title: 'WHO WAS NEVER BURIED', spr: 'ghost', pal: { w: '#e8d8a8', W: '#a8945a', e: '#ff3b1f', k: '#ff3b1f' }, ai: 'ghost', minF: 40, abil: ['blink', 'nova'], drop: 'HOLLOW CROWN' },
  { name: 'GORVAK', title: 'STONEHEART', spr: 'golem', pal: { s: '#8a7a6a', S: '#5a4e42', e: '#ff8a2e' }, ai: 'tank', minF: 15, abil: ['nova', 'enrage'], drop: 'STONEHEART' },
  { name: 'MOTHER OF SPORES', title: 'THE BLOOMING ROT', spr: 'shroom', pal: { r: '#e07ae0', R: '#8a2a8a', w: '#fff2ff' }, ai: 'summon', minF: 32, abil: ['summon', 'nova'], drop: 'SPOREBLOOM' },
  { name: 'CINDERJAW', title: 'THE BURROWING FLAME', spr: 'worm', pal: { p: '#ffb347', P: '#c84a1a', m: '#3a0a04' }, ai: 'ambush', minF: 70, abil: ['spit3', 'enrage'], drop: 'CINDERJAW TOOTH' },
  { name: 'THE LANTERN THIEF', title: 'EATER OF LIGHT', spr: 'imp', pal: { r: '#2a2438', R: '#16121e', y: '#ffe04a' }, ai: 'spit', minF: 10, abil: ['blink', 'steal'], drop: 'STOLEN LANTERN' },
  { name: 'VESSA', title: 'THE ASH PRIESTESS', spr: 'cultist', pal: { p: '#8a1a12', P: '#4a0e0a', e: '#ffb347' }, ai: 'summon', minF: 80, abil: ['summon', 'nova'], drop: 'VESSA\'S PRAYER' },
];
// boss per biome (floors 10,20,...,90). 100 = ASHHEART
AH.BOSSES = ['SKARN', 'OLD MOTHER MIRE', 'THE GLASS WIDOW', 'MOTHER OF SPORES', 'CAP\'N BRINECLAW', 'THE HOLLOW KING', 'GRIMTOOTH', 'CINDERJAW', 'THE THOUSAND EYES'];

// nemesis titles
AH.NEMESIS_TITLES = ['THE BUTCHER', 'HERO-EATER', 'THE GRUDGE', 'BONEBREAKER', 'WHO REMEMBERS', 'THE PATIENT', 'DOOM OF', 'SKULLTAKER', 'THE VICTOR', 'NIGHTMARE OF'];

// floor events
AH.EVENTS = [
  { id: 'dark', name: 'THE DARK FLOOR', msg: 'NO LIGHT REACHES THIS FLOOR.', w: 10 },
  { id: 'flooded', name: 'FLOODED', msg: 'THE WATER IS RISING. IT SLOWS YOU DOWN.', w: 8 },
  { id: 'goldrat', name: 'GOLDEN RAT', msg: 'SOMETHING SHINY SCURRIES AWAY...', w: 8 },
  { id: 'merchant', name: 'WANDERING MERCHANT', msg: 'A MERCHANT HAS SET UP SHOP DOWN HERE.', w: 6 },
  { id: 'shrine', name: 'ANCIENT SHRINE', msg: 'AN OLD SHRINE HUMS WITH POWER.', w: 8 },
  { id: 'ambush', name: 'AMBUSH', msg: 'YOU ARE SURROUNDED!', w: 7 },
  { id: 'collapse', name: 'COLLAPSE', msg: 'THE CEILING IS COMING DOWN! REACH THE STAIRS!', w: 5 },
  { id: 'vault', name: 'TREASURE VAULT', msg: 'A VAULT FULL OF CHESTS. SOME MAY BITE.', w: 6 },
  { id: 'gas', name: 'FOUL AIR', msg: 'POISON GAS SEEPS FROM THE CRACKS.', w: 5 },
  { id: 'horde', name: 'HORDE', msg: 'THE FLOOR IS CRAWLING WITH THEM.', w: 6 },
];

AH.LORE = [
  'WE DUG TOO DEEP. THE STONE GREW WARM, THEN IT STARTED TO BEAT.',
  'THE HEART OF ASH SLEEPS BENEATH DUNMERE. EVERY LAMP WE LIGHT KEEPS IT DREAMING.',
  'THE CANARIES STOPPED SINGING ON THE NINTH DAY. WE SHOULD HAVE LISTENED.',
  'SKARN WAS OUR FOREMAN. NOW HE COMMANDS THE BONES.',
  'THE CRYSTALS REMEMBER LIGHT. BREAK ONE AND YOU WILL HEAR IT SCREAM.',
  'DO NOT TRUST THE CHESTS ON THE FORTIETH FLOOR. SOME OF THEM ARE HUNGRY.',
  'THE MERCHANT WHO WALKS THE DEPTHS HAS NO SHADOW. HE STILL TAKES GOLD.',
  'ASH FALLS UPWARD IN THE DEEPEST HALLS. THAT IS HOW YOU KNOW YOU ARE CLOSE.',
  'THREE HEROES WENT DOWN. ONE CAME BACK, AND HE WAS NOT ALONE.',
  'THE RUNES ARE OLDER THAN THE MINE. KA BURNS, VOR DRINKS, ISA SLEEPS.',
  'IF THE LAMPS OF DUNMERE GO OUT, THE HEART WILL WAKE.',
  'THE DOG FOUND A BONE THAT WAS NOT A BONE. IT WAS A KEY.',
  'THE LANTERN THIEF CANNOT ABIDE A FULL TORCH. KEEP YOURS BURNING.',
  'VESSA PRAYED TO THE HEART AND THE HEART ANSWERED.',
  'BELOW THE HUNDREDTH FLOOR THERE IS NO BOTTOM. ONLY DEEPER.',
];

AH.RUMORS = [
  'THEY SAY A GOLDEN RAT LIVES IN THE MINE. CATCH IT AND YOU ARE RICH.',
  'MY DOG ONCE DUG UP A RING ON THE THIRD FLOOR. NEVER TOOK IT OFF.',
  'THE SMITH CAN MAKE YOUR OLD BLADE BETTER. COSTS ORE, THOUGH.',
  'SOME WALLS DOWN THERE ARE HOLLOW. RATS CAN SMELL IT.',
  'IF YOU HEAR THE CANARY GO QUIET, RUN.',
  'RUNES IN THE RIGHT ORDER SING A SONG OF POWER. KA, VOR, MOR... OR SO I HEARD.',
  'DRINK A MURKY POTION? ONLY IF YOU FEEL LUCKY.',
  'THE BOUNTY BOARD PAYS WELL FOR NAMED BEASTS.',
  'THE SHRINE PRIEST CAN LIFT A CURSE. FOR A PRICE.',
  'EVERY TENTH FLOOR SOMETHING BIG WAITS.',
  'A LIFT CAN TAKE YOU BACK DOWN TO ANY FIFTH FLOOR YOU REACHED.',
  'THE THING THAT KILLS YOU REMEMBERS YOU. IT GETS STRONGER.',
];
AH.WORRY = ['THE BAKER LOOKS WORRIED...', 'THE SMITH IS PACKING HIS TOOLS...', 'SOMEONE BOARDED UP THEIR WINDOWS.', 'FEWER CHILDREN PLAY IN THE STREETS.', 'THE INNKEEPER WATERS DOWN THE ALE.'];
AH.HAPPY = ['THE TOWN CHEERS AS YOU PASS.', 'NEW FAMILIES ARRIVED IN DUNMERE!', 'THE BELLS RING FOR THE HEROES.', 'THE BAKER SAVED YOU A PIE.'];
