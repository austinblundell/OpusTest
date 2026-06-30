/* ============================================================
   game.js — main state machine, input, loop, towns & saves
   ============================================================ */

const Game = {
  canvas: null, ctx: null,
  state: 'title',          // title | world | town | battle | gameover | ending
  party: [],
  gil: 100,
  inv: { POTION: 3, HIPOTION: 0, ETHER: 0, PHOENIX: 1 },
  bossDefeated: false,
  lastTime: 0,

  // town menu
  townCursor: 0,
  townMode: 'main',        // main | shop
  shopCursor: 0,
  shopMsg: '',

  /* ---------- boot ---------- */
  boot() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    World.init();
    this.bindInput();
    this.bindButtons();
    // Continue available?
    document.getElementById('btn-continue').style.opacity = localStorage.getItem('eldoria-save') ? '1' : '0.4';
    requestAnimationFrame(t => this.loop(t));
  },

  bindButtons() {
    document.getElementById('btn-new').onclick = () => this.newGame();
    document.getElementById('btn-continue').onclick = () => this.continueGame();
    document.getElementById('btn-retry').onclick = () => this.reviveAtTown();
    document.getElementById('btn-end').onclick = () => location.reload();
  },

  /* ---------- party creation ---------- */
  freshParty() {
    return DATA.PARTY.map(def => {
      const p = {
        id: def.id, name: def.name, cls: def.cls, spr: def.spr,
        level: 1, xp: 0,
        maxhp: def.hp, hp: def.hp, maxmp: def.mp, mp: def.mp,
        str: def.str, vit: def.vit, agi: def.agi, int: def.int,
        grow: def.grow, spells: def.spells.slice(), weapon: def.weapon,
        alive: true,
      };
      return p;
    });
  },

  xpForNext(level) { return Math.floor(28 * Math.pow(level, 1.6)) + 16; },

  gainXP(p, xp) {
    const levelUps = [];
    p.xp += xp;
    while (p.level < 50 && p.xp >= this.xpForNext(p.level)) {
      p.xp -= this.xpForNext(p.level);
      p.level++;
      const g = p.grow;
      p.maxhp += g.hp; p.maxmp += g.mp;
      p.str += g.str; p.vit += g.vit; p.agi += g.agi; p.int += g.int;
      p.hp = p.maxhp; p.mp = p.maxmp;       // full restore on level up
      levelUps.push(p.level);
    }
    return levelUps;
  },

  newGame() {
    this.party = this.freshParty();
    this.gil = 100;
    this.inv = { POTION: 3, HIPOTION: 0, ETHER: 0, PHOENIX: 1 };
    this.bossDefeated = false;
    World.init();
    this.hideOverlays();
    this.state = 'world';
    this.showMessage('Eldoria\'s crystal has gone dark. Seek Garland at the eastern castle and restore the light!', 4500);
  },

  continueGame() {
    const raw = localStorage.getItem('eldoria-save');
    if (!raw) { this.newGame(); return; }
    try {
      const s = JSON.parse(raw);
      this.party = s.party; this.gil = s.gil; this.inv = s.inv;
      this.bossDefeated = s.bossDefeated || false;
      World.px = s.px; World.py = s.py;
      this.party.forEach(p => { if (p.grow == null) { const d = DATA.PARTY.find(x => x.id === p.id); p.grow = d.grow; p.spells = d.spells; p.spr = d.spr; } });
      this.hideOverlays();
      this.state = 'world';
      this.showMessage('Welcome back, heroes.', 1500);
    } catch (e) { this.newGame(); }
  },

  save() {
    const s = {
      party: this.party, gil: this.gil, inv: this.inv,
      bossDefeated: this.bossDefeated, px: World.px, py: World.py,
    };
    try { localStorage.setItem('eldoria-save', JSON.stringify(s)); } catch (e) {}
  },

  /* ---------- overlays / messages ---------- */
  hideOverlays() {
    ['title', 'gameover', 'ending', 'msgbox'].forEach(id => document.getElementById(id).classList.add('hidden'));
  },
  showMessage(text, ms) {
    const box = document.getElementById('msgbox');
    box.textContent = text;
    box.classList.remove('hidden');
    clearTimeout(this._msgT);
    if (ms) this._msgT = setTimeout(() => box.classList.add('hidden'), ms);
  },
  hideMessage() { document.getElementById('msgbox').classList.add('hidden'); },

  /* ---------- input ---------- */
  bindInput() {
    const map = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
      Enter: 'confirm', ' ': 'confirm', z: 'confirm', Z: 'confirm',
      Escape: 'cancel', x: 'cancel', X: 'cancel',
    };
    window.addEventListener('keydown', e => {
      const k = map[e.key];
      if (!k) return;
      e.preventDefault();
      this.handleInput(k);
    });
    // touch buttons
    document.querySelectorAll('#touch [data-key]').forEach(btn => {
      const fire = (ev) => {
        ev.preventDefault();
        const k = map[btn.dataset.key];
        if (k) this.handleInput(k);
      };
      btn.addEventListener('touchstart', fire, { passive: false });
      btn.addEventListener('mousedown', fire);
    });
  },

  handleInput(k) {
    switch (this.state) {
      case 'world': this.worldInput(k); break;
      case 'town': this.townInput(k); break;
      case 'battle': Battle.input(k); break;
      default: break;
    }
  },

  worldInput(k) {
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    if (dirs[k]) {
      this.hideMessage();
      const [dx, dy] = dirs[k];
      const ev = World.tryMove(dx, dy);
      if (ev === 'encounter') this.startBattle(World.rollEncounter(), false);
      else if (ev === 'town') this.enterTown();
      else if (ev === 'castle') this.enterCastle();
    } else if (k === 'confirm' || k === 'cancel') {
      // quick save with confirm in field
      if (k === 'confirm') { this.save(); this.showMessage('Game saved.', 1200); }
    }
  },

  /* ---------- towns ---------- */
  enterTown() {
    this.state = 'town';
    this.townMode = 'main';
    this.townCursor = 0;
    this.shopMsg = '';
  },

  townInput(k) {
    if (this.townMode === 'main') {
      const opts = ['Rest (restore party)', 'Shop', 'Save & leave', 'Leave'];
      if (k === 'up') this.townCursor = (this.townCursor + opts.length - 1) % opts.length;
      else if (k === 'down') this.townCursor = (this.townCursor + 1) % opts.length;
      else if (k === 'cancel') this.leaveTown();
      else if (k === 'confirm') {
        if (this.townCursor === 0) { this.restParty(); this.shopMsg = 'The party is fully restored!'; }
        else if (this.townCursor === 1) { this.townMode = 'shop'; this.shopCursor = 0; }
        else if (this.townCursor === 2) { this.save(); this.leaveTown(); }
        else this.leaveTown();
      }
    } else { // shop
      const stock = DATA.SHOP_STOCK;
      if (k === 'up') this.shopCursor = (this.shopCursor + stock.length - 1) % stock.length;
      else if (k === 'down') this.shopCursor = (this.shopCursor + 1) % stock.length;
      else if (k === 'cancel') { this.townMode = 'main'; this.shopMsg = ''; }
      else if (k === 'confirm') this.buy(stock[this.shopCursor]);
    }
  },

  restParty() {
    this.party.forEach(p => { p.alive = true; p.hp = p.maxhp; p.mp = p.maxmp; });
  },

  buy(key) {
    const it = DATA.ITEMS[key];
    if (this.gil < it.price) { this.shopMsg = 'Not enough Gil!'; return; }
    this.gil -= it.price;
    this.inv[key] = (this.inv[key] || 0) + 1;
    this.shopMsg = 'Bought ' + it.name + '!';
  },

  leaveTown() {
    this.state = 'world';
    // step off the town tile so we don't immediately re-enter
    const moves = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of moves) {
      const t = World.tileAt(World.px + dx, World.py + dy);
      if (t.walk && !t.town && !t.castle) { World.px += dx; World.py += dy; break; }
    }
  },

  /* ---------- castle / boss ---------- */
  enterCastle() {
    if (this.bossDefeated) {
      this.showMessage('The castle stands quiet. The crystal shines once more.', 2500);
      return;
    }
    this.startBattle(['garland'], true);
  },

  /* ---------- battles ---------- */
  startBattle(formation, isBoss) {
    this.state = 'battle';
    this.hideMessage();
    Battle.start(formation, isBoss, (result) => this.endBattle(result, isBoss));
  },

  endBattle(result, isBoss) {
    if (result === 'win') {
      if (isBoss) {
        this.bossDefeated = true;
        this.save();
        this.showEnding();
        return;
      }
      this.state = 'world';
      this.save();
    } else if (result === 'flee') {
      this.state = 'world';
    } else { // lose
      this.state = 'gameover';
      document.getElementById('gameover').classList.remove('hidden');
    }
  },

  reviveAtTown() {
    document.getElementById('gameover').classList.add('hidden');
    this.restParty();
    // send party back to the starting town area
    World.init();
    this.state = 'world';
    this.showMessage('You awaken safely back at the village...', 2000);
  },

  showEnding() {
    this.state = 'ending';
    const el = document.querySelector('#ending .end-text');
    el.innerHTML =
      'Garland is vanquished!<br/><br/>' +
      'The Crystal of Eldoria blazes with light,<br/>' +
      'and peace returns to the realm.<br/><br/>' +
      'Aldric, Lyra, Morgan and Finn<br/>are remembered as heroes.<br/><br/>' +
      '— THE END —';
    document.getElementById('ending').classList.remove('hidden');
  },

  /* ---------- main loop ---------- */
  loop(t) {
    const dt = Math.min(0.05, (t - this.lastTime) / 1000 || 0);
    this.lastTime = t;

    World.update(dt);
    if (this.state === 'battle') Battle.update(dt);

    this.render();
    requestAnimationFrame(tt => this.loop(tt));
  },

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 256, 224);

    if (this.state === 'battle') { Battle.render(ctx); return; }
    if (this.state === 'title' || this.state === 'gameover' || this.state === 'ending') {
      ctx.fillStyle = '#04040f'; ctx.fillRect(0, 0, 256, 224);
      return;
    }

    // world / town share the overworld view in the background
    World.render(ctx);
    this.renderFieldHUD(ctx);
    if (this.state === 'town') this.renderTown(ctx);
  },

  renderFieldHUD(ctx) {
    // small gil + location bar
    GFX.window(ctx, 4, 4, 86, 22);
    GFX.text(ctx, 'GIL ' + this.gil, 10, 11, '#f8d038', 7);
    if (this.bossDefeated) GFX.text(ctx, '★', 80, 11, '#f8d038', 8);
  },

  renderTown(ctx) {
    // dim
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, 256, 224);
    GFX.textC(ctx, 'ELDORIA VILLAGE', 128, 14, '#f8d038', 10);

    if (this.townMode === 'main') {
      GFX.window(ctx, 60, 40, 136, 96);
      const opts = ['Rest (restore party)', 'Shop', 'Save & leave', 'Leave'];
      opts.forEach((o, i) => {
        const y = 52 + i * 18;
        if (i === this.townCursor) GFX.text(ctx, '▶', 66, y, '#f8d038', 8);
        GFX.text(ctx, o, 78, y, '#fff', 7);
      });
      if (this.shopMsg) GFX.textC(ctx, this.shopMsg, 128, 150, '#7affaf', 7);
      this.renderPartyMini(ctx);
    } else {
      GFX.window(ctx, 30, 36, 196, 150);
      GFX.text(ctx, 'SHOP', 40, 42, '#f8d038', 8);
      GFX.text(ctx, 'GIL ' + this.gil, 150, 42, '#f8d038', 7);
      DATA.SHOP_STOCK.forEach((key, i) => {
        const it = DATA.ITEMS[key];
        const y = 60 + i * 20;
        if (i === this.shopCursor) GFX.text(ctx, '▶', 38, y, '#f8d038', 8);
        GFX.text(ctx, it.name, 50, y, '#fff', 7);
        GFX.text(ctx, it.price + 'G', 180, y, '#f8d038', 7);
        GFX.text(ctx, it.desc, 50, y + 9, '#9aa', 6);
        GFX.text(ctx, 'x' + (this.inv[key] || 0), 150, y, '#aaffaf', 6);
      });
      GFX.text(ctx, 'Enter=Buy  Esc=Back', 50, 168, '#9aa', 6);
      if (this.shopMsg) GFX.textC(ctx, this.shopMsg, 128, 156, '#7affaf', 7);
    }
  },

  renderPartyMini(ctx) {
    this.party.forEach((p, i) => {
      const y = 150 + i * 16;
      GFX.text(ctx, p.name + ' Lv' + p.level, 16, y, p.alive ? '#fff' : '#ff5a5a', 6);
      GFX.text(ctx, 'HP ' + p.hp + '/' + p.maxhp, 130, y, '#7affaf', 6);
    });
  },
};

window.addEventListener('load', () => Game.boot());
