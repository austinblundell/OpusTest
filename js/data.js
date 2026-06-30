/* ============================================================
   data.js — palettes, pixel-art sprites, and game content
   (party, enemies, spells, items, overworld map)
   Everything hangs off the global `DATA` object.
   ============================================================ */

const DATA = {};

/* ---------- Colour palette (single-char keys) ---------- */
DATA.PAL = {
  '.': null,          // transparent
  k: '#0a0a12',       // near-black outline
  w: '#ffffff',
  e: '#e8e8f0',       // egg white
  r: '#e23b3b',       // red
  R: '#8c1c1c',       // dark red
  b: '#3a6ff0',       // blue
  B: '#1a2f8c',       // dark blue
  c: '#5fd8e8',       // cyan
  g: '#46c24a',       // green
  G: '#1f7a32',       // dark green
  y: '#f8d038',       // gold/yellow
  o: '#f08a26',       // orange
  n: '#a9743a',       // brown
  N: '#5e3c1c',       // dark brown
  s: '#f3c19a',       // skin
  S: '#c98a5e',       // skin shadow
  p: '#a85adf',       // purple
  P: '#5a2c8c',       // dark purple
  l: '#c4ccd6',       // light steel
  d: '#6a7385',       // dark steel
  m: '#f59ec8',       // pink
  t: '#2a2a3e',       // shadow/cloth dark
  f: '#f8f0d8',       // bone / parchment
};

/* helper to build a sprite object */
function spr(w, rows) { return { w, h: rows.length, rows }; }

/* ============================================================
   HERO BATTLE SPRITES  (16x16, facing left)
   ============================================================ */
DATA.HERO_SPR = {
  knight: spr(16, [
    '......llll......',
    '.....lbbbbl.....',
    '....llllll l....',
    '....lsssssl.....',
    '....lskskssl....',
    '....lssssssl....',
    '...lllllllll....',
    '..lldllllldll...',
    '.l.dllllllld.l..',
    'l..ldllllldl..l.',
    '...lldllldll....',
    '....llllllll....',
    '....ll....ll....',
    '....dd....dd....',
    '...ldd....ddl...',
    '...ll......ll...',
  ]),
  white: spr(16, [
    '......eeee......',
    '.....errrre.....',
    '....eeeeeeee....',
    '.....esssse.....',
    '.....sksks s....',
    '.....ssssss.....',
    '....eeeeeeee....',
    '...eerrrrree....',
    '..ee eeeeee ee..',
    '.ee.eeeeeeee.ee.',
    '....eeeeeeee....',
    '....eeeeeeee....',
    '....eeeeeeee....',
    '....eeeeeeee....',
    '...eeee..eeee...',
    '...eee....eee...',
  ]),
  black: spr(16, [
    '......tttt......',
    '.....ttttttt....',
    '....tttttttt....',
    '...ttttttttt....',
    '..ttttttttt.....',
    '....tttttt......',
    '....tsssst......',
    '....tyckyt......',  // glowing eyes
    '....tssss t.....',
    '...ttttttttt....',
    '..ttttttttttt...',
    '..tttPtttPttt...',
    '..tttttttttt....',
    '...tttttttt.....',
    '...tttt tttt....',
    '...ttt...ttt....',
  ]),
  thief: spr(16, [
    '.....GGGG.......',
    '....GggggG......',
    '...GgggggG......',
    '...Gsssss.......',
    '...Gsksks.......',
    '...Gssssss......',
    '..GGGGGGGG......',
    '.G.GGnGGGG.l....',
    'G..GGnnGGGdl....',
    '...GGGGGGG.l....',
    '...nGGGGGn......',
    '...nGGGGGn......',
    '...GGG.GGG......',
    '...GG...GG......',
    '..nGG...GGn.....',
    '..nn.....nn.....',
  ]),
};

/* ============================================================
   ENEMY SPRITES
   ============================================================ */
DATA.ENEMY_SPR = {
  goblin: spr(16, [
    '................',
    '....G......G....',
    '....GG....GG....',
    '....GGGGGGGG....',
    '...GGGGGGGGGG...',
    '...GrGGGGGGrG...',  // red eyes
    '...GGGwwwwGGG...',
    '...GGwwwwwwGG...',
    '....GGGGGGGG....',
    '...nGGGGGGGGn...',
    '..nnGGGGGGGGnn..',
    '....GGG..GGG....',
    '....GG....GG....',
    '....GG....GG....',
    '...GGG....GGG...',
    '................',
  ]),
  wolf: spr(20, [
    '....................',
    '..d.................',
    '.ddd...........d....',
    '.dddd.........ddd...',
    '..ddddddddddddddd...',
    '.dryddddddddddddd...',  // eye
    '.dddddddddddddddd...',
    '..dddddddddddddd....',
    '..k.dddddddddddd....',
    '....ddddddddddddd...',
    '....dd...dd...dd....',
    '....dd...dd...dd....',
    '....kk...kk...kk....',
    '....................',
    '....................',
    '....................',
  ]),
  imp: spr(16, [
    '...p........p...',
    '...pp......pp...',
    '....pp....pp....',
    '....pppppppp....',
    '...ppppppppp p..',
    '...pyppppppyp...',  // eyes
    '...ppwwwwwwpp...',
    '....pppppppp....',
    '.PP.pppppppp.PP.',
    'PPPPpppppppPPPP.',
    '.PP.pppppppp.PP.',
    '....pppppppp....',
    '....pppp pppp....',
    '....ppp...ppp...',
    '...ppp.....pp...',
    '................',
  ]),
  skeleton: spr(16, [
    '.....ffff.......',
    '....ffffff......',
    '....fkffkf......',  // eye sockets
    '....ffffff......',
    '.....fkkf.......',
    '....ffffff......',
    '...f.ffff.f.....',
    '..ff.ffff.ff....',
    '..f..ffff..f....',
    '.....ffff.......',
    '....f.ff.f......',
    '....f.ff.f......',
    '....f.ff.f......',
    '...ff.ff.ff.....',
    '..ff..ff..ff....',
    '................',
  ]),
  ogre: spr(20, [
    '......GGGGGG.........',
    '.....GGGGGGGG........',
    '....GGGGGGGGGG.......',
    '....GrGGGGGGrG.......',
    '....GGGGwwGGGG.......',
    '....GGwwwwwwGG.......',
    '...GGGGGGGGGGGG......',
    '..nGGGGGGGGGGGGn.....',
    '.nnGGGGGGGGGGGGnn....',
    '.n.GGGGGGGGGGGG.n....',
    '...GGGGGGGGGGGG......',
    '...GGGGGGGGGGGG......',
    '...GGGGG..GGGGG......',
    '...GGGG....GGGG......',
    '..nGGG......GGGn.....',
    '..nn..........nn....',
  ]),
  garland: spr(28, [
    '.........kkkkkkkkkk..........',
    '........kllllllllllk........',
    '.......klllbbbbllllk........',
    '......kllllbbbbbllllk.......',
    '......kllrlllllrllllk.......',  // red eyes
    '......klllllllllllllk.......',
    '......kkllllllllllkkk.......',
    '....kkllllldlllllllllkk.....',
    '...kllllllldlllllllllllk....',
    '..klllrrlllldlllllrrllllk...',
    '..kllrrrrllldllrrrrllllk....',
    '..klllllllllllllllllllk.....',
    '...klllllllldllllllllk......',
    '....kllllllldlllllllk.......',
    '.....kdddlllllllldddk.......',
    '.....kddd.kllllk.dddk.......',
    '....kddd..klllk..dddk.......',
    '....kdd...kllk...ddk........',
    '...kdd...kdllk...kddk.......',
    '...kk....kk..kk...kk........',
  ]),
};

/* ============================================================
   OVERWORLD TILE COLOURS
   drawn procedurally in world.js
   ============================================================ */
DATA.TILES = {
  '.': { name: 'grass',    walk: true,  enc: 0.10, top: '#5fbf4a', bot: '#3f9f34' },
  ',': { name: 'field',    walk: true,  enc: 0.06, top: '#8fd05a', bot: '#6fb83a' },
  'T': { name: 'forest',   walk: true,  enc: 0.16, top: '#2f8f3a', bot: '#1f6a28' },
  '^': { name: 'mountain', walk: false, enc: 0,    top: '#9a8a6a', bot: '#6a5a3a' },
  '~': { name: 'water',    walk: false, enc: 0,    top: '#3a7ff0', bot: '#1a4fc0' },
  '#': { name: 'wall',     walk: false, enc: 0,    top: '#7a7a8a', bot: '#4a4a5a' },
  'R': { name: 'road',     walk: true,  enc: 0,    top: '#caa86a', bot: '#a98850' },
  'B': { name: 'bridge',   walk: true,  enc: 0,    top: '#b5894a', bot: '#85602a' },
  'O': { name: 'town',     walk: true,  enc: 0,    town: true,  top: '#caa86a', bot: '#a98850' },
  'C': { name: 'castle',   walk: true,  enc: 0,    castle: true,top: '#9aa0b0', bot: '#6a7080' },
};

/* Overworld map. Player starts at 'S' (treated as road). */
DATA.MAP = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~^^^^^TT.....,,,,......TTT^^^^~',
  '~^^...TT..,,,,,,,,,,.....TT^^^~',
  '~^...........O.......,,....^^~~',
  '~....,,,...RRRRR..,,,,,,....T~~',
  '~..,,,,,,..R...R....,,,,...TT~~',
  '~..,,,...RRR...RRR....,,...T..~',
  '~....TT..R.......R..,,,....TT.~',
  '~..TTTT..R...S...R..TTT....TT.~',
  '~..TTT...R.......R..TTTT....T.~',
  '~...T....RRR...RRR....TT......~',
  '~........,,R...R,,......,,....~',
  '~..^^.....,RRRRR,....~~~~~....~',
  '~.^^^^...,,,,.,,,...~~~~~~~...~',
  '~.^^^....,,....,,..BBBBBBB....~',
  '~..^.....,,,..,,,..~~~~~~~....~',
  '~........TTT...,,,....TTT.....~',
  '~...,,,..TTT....,,...TTTT..^^.~',
  '~..,,,,,..T......,,...TT..^^^^~',
  '~..,,,......,,,...,,.....C^^^^~',
  '~...,,....,,,,,....,,...^^^^^^~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
];

/* ============================================================
   SPELLS
   kind: 'attack' (damage one enemy), 'heal' (heal one ally),
         'healAll', 'revive'
   ============================================================ */
DATA.SPELLS = {
  FIRE:    { name: 'Fire',    mp: 5,  kind: 'attack', power: 18, color: '#ff7a26', el: 'fire'  },
  BLIZZARD:{ name: 'Blizzard',mp: 5,  kind: 'attack', power: 18, color: '#7ad8ff', el: 'ice'   },
  THUNDER: { name: 'Thunder', mp: 5,  kind: 'attack', power: 18, color: '#fff060', el: 'bolt'  },
  FIRE2:   { name: 'Fira',    mp: 15, kind: 'attack', power: 42, color: '#ff5a18', el: 'fire'  },
  THUNDER2:{ name: 'Thundara',mp: 15, kind: 'attack', power: 42, color: '#fff060', el: 'bolt'  },
  CURE:    { name: 'Cure',    mp: 4,  kind: 'heal',    power: 40, color: '#7affaf' },
  CURE2:   { name: 'Cura',    mp: 10, kind: 'heal',    power: 100,color: '#7affaf' },
  CUREALL: { name: 'Curaga',  mp: 20, kind: 'healAll', power: 90, color: '#aaffd0' },
  LIFE:    { name: 'Life',    mp: 18, kind: 'revive',  power: 0.5,color: '#fff0a0' },
};

/* ============================================================
   ITEMS  (shop + inventory)
   ============================================================ */
DATA.ITEMS = {
  POTION:  { name: 'Potion',       price: 40,  use: 'heal',    power: 60,  desc: 'Restore 60 HP'  },
  HIPOTION:{ name: 'Hi-Potion',    price: 150, use: 'heal',    power: 180, desc: 'Restore 180 HP' },
  ETHER:   { name: 'Ether',        price: 200, use: 'mp',      power: 40,  desc: 'Restore 40 MP'  },
  PHOENIX: { name: 'Phoenix Down', price: 120, use: 'revive',  power: 0.5, desc: 'Revive an ally' },
};

DATA.SHOP_STOCK = ['POTION', 'HIPOTION', 'ETHER', 'PHOENIX'];

/* ============================================================
   PARTY DEFINITIONS  (starting stats + growth per level)
   stats: str (attack), vit (defense+hp), agi (turn order),
          int (magic), and hp/mp growth.
   ============================================================ */
DATA.PARTY = [
  {
    id: 'aldric', name: 'Aldric', cls: 'Knight', spr: 'knight',
    hp: 90, mp: 0,  str: 14, vit: 12, agi: 8,  int: 4,
    grow: { hp: 16, mp: 0,  str: 3, vit: 3, agi: 1, int: 0 },
    spells: [], weapon: 'Broadsword',
  },
  {
    id: 'lyra', name: 'Lyra', cls: 'W.Mage', spr: 'white',
    hp: 56, mp: 22, str: 7,  vit: 7,  agi: 10, int: 13,
    grow: { hp: 9,  mp: 6,  str: 1, vit: 2, agi: 2, int: 3 },
    spells: ['CURE', 'CURE2', 'CUREALL', 'LIFE'], weapon: 'Staff',
  },
  {
    id: 'morgan', name: 'Morgan', cls: 'B.Mage', spr: 'black',
    hp: 50, mp: 24, str: 6,  vit: 6,  agi: 9,  int: 14,
    grow: { hp: 8,  mp: 7,  str: 1, vit: 1, agi: 2, int: 3 },
    spells: ['FIRE', 'BLIZZARD', 'THUNDER', 'FIRE2', 'THUNDER2'], weapon: 'Rod',
  },
  {
    id: 'finn', name: 'Finn', cls: 'Thief', spr: 'thief',
    hp: 72, mp: 8,  str: 11, vit: 9,  agi: 15, int: 6,
    grow: { hp: 12, mp: 2,  str: 2, vit: 2, agi: 3, int: 1 },
    spells: ['FIRE'], weapon: 'Daggers',
  },
];

/* ============================================================
   ENEMY DEFINITIONS
   ============================================================ */
DATA.ENEMIES = {
  goblin:   { name: 'Goblin',   spr: 'goblin',   hp: 20,  atk: 9,  def: 3,  agi: 6,  xp: 7,   gil: 8  },
  wolf:     { name: 'Dire Wolf', spr: 'wolf',    hp: 26,  atk: 12, def: 4,  agi: 14, xp: 10,  gil: 9  },
  imp:      { name: 'Imp',      spr: 'imp',      hp: 18,  atk: 8,  def: 2,  agi: 9,  xp: 8,   gil: 12, spell: { power: 14, color: '#a85adf', name: 'Dark' } },
  skeleton: { name: 'Skeleton', spr: 'skeleton', hp: 34,  atk: 14, def: 6,  agi: 8,  xp: 16,  gil: 16 },
  ogre:     { name: 'Ogre',     spr: 'ogre',     hp: 72,  atk: 22, def: 9,  agi: 5,  xp: 36,  gil: 48 },
  garland:  { name: 'Garland',  spr: 'garland',  hp: 360, atk: 30, def: 13, agi: 11, xp: 0,   gil: 0, boss: true, spell: { power: 36, color: '#e23b3b', name: 'Crush' } },
};

/* Encounter tables keyed loosely by region difficulty.
   Each entry is a list of possible enemy formations. */
DATA.ENCOUNTERS = [
  ['goblin'], ['goblin', 'goblin'], ['wolf'], ['imp'],
  ['goblin', 'imp'], ['wolf', 'wolf'], ['skeleton'],
  ['goblin', 'goblin', 'wolf'], ['skeleton', 'imp'], ['ogre'],
];
