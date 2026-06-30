/* ============================================================
   battle.js — classic menu-driven, turn-based battle engine
   ============================================================ */

const Battle = {
  active: false,
  party: [],          // refs to Game.party (all four; dead ones skip)
  enemies: [],        // enemy instances for this fight
  order: [],          // turn order for the current round
  turn: 0,            // index into order
  actor: null,        // current acting combatant
  state: 'intro',     // intro|menu|spell|item|target|anim|msg|victory|defeat|flee
  cursor: 0,
  subCursor: 0,
  targetIdx: 0,
  menu: ['Fight', 'Magic', 'Item', 'Run'],
  msgQueue: [],
  msg: '',
  timer: 0,
  flashT: 0,
  floaters: [],       // {x,y,t,text,color}
  spellFx: null,      // {color, t, target}
  pending: null,      // queued action resolution
  isBoss: false,
  onEnd: null,        // callback(result) -> 'win'|'lose'|'flee'

  /* ---------- setup ---------- */
  start(formation, isBoss, onEnd) {
    this.active = true;
    this.party = Game.party;
    this.isBoss = !!isBoss;
    this.onEnd = onEnd;
    this.floaters = [];
    this.spellFx = null;
    this.msgQueue = [];
    this.enemies = [];

    // Build enemy instances, lay them out on the left.
    const n = formation.length;
    formation.forEach((key, i) => {
      const d = DATA.ENEMIES[key];
      const inst = Object.assign({}, d, {
        key, hp: d.hp, maxhp: d.hp, alive: true, flash: 0,
        label: this.enemyLabel(formation, key, i),
      });
      // position
      const big = d.spr === 'garland';
      const cols = big ? 1 : Math.min(3, n);
      const sprW = (DATA.ENEMY_SPR[d.spr].w) * 2;
      inst.scale = big ? 3 : 2;
      const sw = DATA.ENEMY_SPR[d.spr].w * inst.scale;
      inst.x = 24 + (i % 3) * 6 + ((i % 3)) * 4;
      inst.y = 30 + Math.floor(i / 3) * 46 + (i % 2) * 8;
      // spread them vertically/horizontally
      inst.x = big ? 56 : 18 + (i % 2) * 14;
      inst.y = big ? 36 : 26 + i * 40;
      this.enemies.push(inst);
    });

    this.state = 'intro';
    this.timer = 0.7;
    this.queueMsg(this.isBoss ? 'Garland blocks your path!' : 'Monsters appear!');
  },

  enemyLabel(formation, key, i) {
    const d = DATA.ENEMIES[key];
    const count = formation.filter(k => k === key).length;
    if (count === 1) return d.name;
    const order = 'ABCDEFGH';
    let seen = 0;
    for (let j = 0; j <= i; j++) if (formation[j] === key) seen++;
    return d.name + ' ' + order[seen - 1];
  },

  /* ---------- round / turn order ---------- */
  buildOrder() {
    const combatants = [];
    this.party.forEach(p => { if (p.alive) combatants.push({ side: 'hero', ref: p }); });
    this.enemies.forEach(e => { if (e.alive) combatants.push({ side: 'enemy', ref: e }); });
    // sort by agility with random jitter
    combatants.forEach(c => { c._roll = (c.ref.agi || 0) + Math.random() * 8; });
    combatants.sort((a, b) => b._roll - a._roll);
    this.order = combatants;
    this.turn = 0;
  },

  nextTurn() {
    // remove dead / advance
    while (this.turn < this.order.length) {
      const c = this.order[this.turn];
      const alive = c.side === 'hero' ? c.ref.alive : c.ref.alive;
      if (alive) break;
      this.turn++;
    }

    if (this.checkEnd()) return;

    if (this.turn >= this.order.length) {
      this.buildOrder();
      if (this.checkEnd()) return;
    }

    this.actor = this.order[this.turn];
    if (this.actor.side === 'hero') {
      this.cursor = 0;
      this.state = 'menu';
    } else {
      this.enemyAct(this.actor.ref);
    }
  },

  checkEnd() {
    const heroesAlive = this.party.some(p => p.alive);
    const enemiesAlive = this.enemies.some(e => e.alive);
    if (!heroesAlive) { this.state = 'defeat'; this.timer = 0.5; this.queueMsg('The party has fallen...'); return true; }
    if (!enemiesAlive) { this.victory(); return true; }
    return false;
  },

  /* ---------- player command resolution ---------- */
  aliveEnemies() { return this.enemies.filter(e => e.alive); },
  aliveHeroes() { return this.party.filter(p => p.alive); },

  chooseCommand() {
    const cmd = this.menu[this.cursor];
    if (cmd === 'Fight') {
      this.pending = { type: 'fight' };
      this.beginTargetEnemy();
    } else if (cmd === 'Magic') {
      const sp = this.actor.ref.spells;
      if (!sp || sp.length === 0) { this.queueMsg(this.actor.ref.name + ' knows no magic!'); this.flushToMenu(); return; }
      this.state = 'spell'; this.subCursor = 0;
    } else if (cmd === 'Item') {
      if (this.totalItems() === 0) { this.queueMsg('No items to use!'); this.flushToMenu(); return; }
      this.state = 'item'; this.subCursor = 0;
    } else if (cmd === 'Run') {
      this.attemptRun();
    }
  },

  totalItems() { return Object.values(Game.inv).reduce((a, b) => a + b, 0); },
  invList() { return Object.keys(DATA.ITEMS).filter(k => (Game.inv[k] || 0) > 0); },

  beginTargetEnemy() {
    const alive = this.aliveEnemies();
    this.targetIdx = this.enemies.indexOf(alive[0]);
    this.state = 'target';
    this.targetSide = 'enemy';
  },
  beginTargetHero() {
    this.targetIdx = this.party.indexOf(this.aliveHeroes()[0]);
    this.state = 'target';
    this.targetSide = 'hero';
  },

  confirmTarget() {
    const p = this.pending;
    if (p.type === 'fight') {
      const tgt = this.enemies[this.targetIdx];
      this.heroAttack(this.actor.ref, tgt);
    } else if (p.type === 'spell') {
      this.castSpell(this.actor.ref, p.spell, this.targetIdx);
    } else if (p.type === 'item') {
      this.useItem(p.item, this.targetIdx);
    }
  },

  /* ---------- combat math ---------- */
  rand(a, b) { return a + Math.random() * (b - a); },

  heroDef(p) { return Math.floor(p.vit * 0.8) + Math.floor(p.level / 2); },

  heroAttack(p, tgt) {
    if (!tgt.alive) { tgt = this.aliveEnemies()[0]; if (!tgt) { this.afterAction(); return; } }
    const atk = p.str + Math.floor(p.level * 0.7);
    let dmg = Math.max(1, Math.round((atk * 2 - tgt.def) * this.rand(0.85, 1.15)));
    const crit = Math.random() < 0.0625;
    if (crit) dmg = Math.round(dmg * 1.8);
    tgt.hp -= dmg; tgt.flash = 0.4;
    this.addFloater(tgt.x + 16, tgt.y + 6, dmg, crit ? '#ffe060' : '#ffffff');
    this.queueMsg(p.name + ' attacks ' + tgt.label + (crit ? ' — critical! ' : ' for ') + dmg + (crit ? ' (' + dmg + ')' : ' damage.'));
    if (tgt.hp <= 0) { tgt.alive = false; this.queueMsg(tgt.label + ' is defeated!'); }
    this.startAnim();
  },

  castSpell(p, spellKey, targetIdx) {
    const sp = DATA.SPELLS[spellKey];
    if (p.mp < sp.mp) { this.queueMsg('Not enough MP!'); this.flushToMenu(); return; }
    p.mp -= sp.mp;
    const power = sp.power + Math.floor(p.int * 0.9);

    if (sp.kind === 'attack') {
      const tgt = this.enemies[targetIdx];
      if (!tgt || !tgt.alive) { this.afterAction(); return; }
      let dmg = Math.max(1, Math.round(power * this.rand(0.9, 1.12)));
      tgt.hp -= dmg; tgt.flash = 0.4;
      this.spellFx = { color: sp.color, t: 0.55, x: tgt.x + 16, y: tgt.y + 16, kind: 'hit' };
      this.addFloater(tgt.x + 16, tgt.y + 6, dmg, sp.color);
      this.queueMsg(p.name + ' casts ' + sp.name + '! ' + tgt.label + ' takes ' + dmg + '.');
      if (tgt.hp <= 0) { tgt.alive = false; this.queueMsg(tgt.label + ' is defeated!'); }
    } else if (sp.kind === 'heal') {
      const tgt = this.party[targetIdx];
      const heal = Math.round(power * this.rand(0.95, 1.1));
      const before = tgt.hp;
      tgt.hp = Math.min(tgt.maxhp, tgt.hp + heal);
      this.spellFx = { color: sp.color, t: 0.5, x: 200, y: 150, kind: 'heal' };
      this.addFloater(200, 150 - targetIdx * 14, '+' + (tgt.hp - before), '#7affaf');
      this.queueMsg(p.name + ' casts ' + sp.name + '. ' + tgt.name + ' recovers ' + (tgt.hp - before) + ' HP.');
    } else if (sp.kind === 'healAll') {
      const heal = Math.round(power * this.rand(0.95, 1.1));
      this.aliveHeroes().forEach(h => { h.hp = Math.min(h.maxhp, h.hp + heal); });
      this.spellFx = { color: sp.color, t: 0.6, x: 200, y: 150, kind: 'healAll' };
      this.queueMsg(p.name + ' casts ' + sp.name + '! The party recovers ' + heal + ' HP.');
    } else if (sp.kind === 'revive') {
      const tgt = this.party[targetIdx];
      if (tgt.alive) { this.queueMsg(tgt.name + ' is already conscious.'); }
      else {
        tgt.alive = true;
        tgt.hp = Math.max(1, Math.round(tgt.maxhp * sp.power));
        this.queueMsg(p.name + ' casts ' + sp.name + '! ' + tgt.name + ' is revived!');
      }
    }
    this.startAnim();
  },

  useItem(itemKey, targetIdx) {
    const it = DATA.ITEMS[itemKey];
    if ((Game.inv[itemKey] || 0) <= 0) { this.flushToMenu(); return; }
    const tgt = this.party[targetIdx];
    if (it.use === 'revive') {
      if (tgt.alive) { this.queueMsg(tgt.name + ' is already conscious.'); this.flushToMenu(); return; }
      tgt.alive = true; tgt.hp = Math.max(1, Math.round(tgt.maxhp * it.power));
      this.queueMsg(tgt.name + ' is revived with the ' + it.name + '!');
    } else if (it.use === 'heal') {
      if (!tgt.alive) { this.queueMsg("Can't use that on a fallen ally."); this.flushToMenu(); return; }
      const before = tgt.hp; tgt.hp = Math.min(tgt.maxhp, tgt.hp + it.power);
      this.addFloater(200, 150 - targetIdx * 14, '+' + (tgt.hp - before), '#7affaf');
      this.queueMsg(tgt.name + ' uses ' + it.name + ' (+' + (tgt.hp - before) + ' HP).');
    } else if (it.use === 'mp') {
      if (!tgt.alive) { this.queueMsg("Can't use that on a fallen ally."); this.flushToMenu(); return; }
      const before = tgt.mp; tgt.mp = Math.min(tgt.maxmp, tgt.mp + it.power);
      this.addFloater(200, 150 - targetIdx * 14, '+' + (tgt.mp - before), '#7ad8ff');
      this.queueMsg(tgt.name + ' uses ' + it.name + ' (+' + (tgt.mp - before) + ' MP).');
    }
    Game.inv[itemKey]--;
    this.startAnim();
  },

  attemptRun() {
    if (this.isBoss) { this.queueMsg("You can't escape this battle!"); this.flushToMenu(); return; }
    const heroAgi = this.aliveHeroes().reduce((a, h) => a + h.agi, 0) / this.aliveHeroes().length;
    const enAgi = this.aliveEnemies().reduce((a, e) => a + e.agi, 0) / this.aliveEnemies().length;
    const chance = 0.45 + (heroAgi - enAgi) * 0.03;
    if (Math.random() < chance) {
      this.state = 'flee'; this.timer = 1.0; this.queueMsg('The party fled!');
    } else {
      this.queueMsg("Couldn't escape!");
      this.startAnim();   // wasted turn
    }
  },

  /* ---------- enemy AI ---------- */
  enemyAct(e) {
    const heroes = this.aliveHeroes();
    if (heroes.length === 0) { this.checkEnd(); return; }
    // weighted random: prefer lower-HP heroes a little
    const tgt = heroes[(Math.random() * heroes.length) | 0];

    if (e.spell && Math.random() < (e.boss ? 0.4 : 0.3)) {
      let dmg = Math.max(1, Math.round((e.spell.power + e.atk * 0.5 - this.heroDef(tgt) * 0.5) * this.rand(0.9, 1.1)));
      tgt.hp -= dmg;
      this.spellFx = { color: e.spell.color, t: 0.5, x: 200, y: 150, kind: 'hit' };
      this.addFloater(205, 150, dmg, e.spell.color);
      this.queueMsg(e.label + ' casts ' + e.spell.name + '! ' + tgt.name + ' takes ' + dmg + '.');
      this.flashHero = tgt;
    } else {
      let dmg = Math.max(1, Math.round((e.atk * 2 - this.heroDef(tgt)) * this.rand(0.85, 1.15)));
      const crit = Math.random() < 0.05;
      if (crit) dmg = Math.round(dmg * 1.6);
      tgt.hp -= dmg;
      this.addFloater(205, 150, dmg, crit ? '#ffe060' : '#ff8a8a');
      this.queueMsg(e.label + ' attacks ' + tgt.name + ' for ' + dmg + (crit ? ' (critical!)' : '') + '.');
      this.flashHero = tgt;
    }
    if (tgt.hp <= 0) { tgt.hp = 0; tgt.alive = false; this.queueMsg(tgt.name + ' has fallen!'); }
    this.startAnim();
  },

  /* ---------- flow control ---------- */
  startAnim() { this.state = 'anim'; this.timer = 0.35; },
  afterAction() {
    // advance after messages are read
    this.turn++;
    this.nextTurn();
  },
  flushToMenu() {
    // a non-action choice: show queued messages then return to this hero's menu
    this._returnMenu = true;
    this.state = 'anim'; this.timer = 0.1;
  },

  queueMsg(m) { this.msgQueue.push(m); },

  /* ---------- victory / rewards ---------- */
  victory() {
    this.state = 'victory';
    let xp = 0, gil = 0;
    this.enemies.forEach(e => { xp += e.xp; gil += e.gil; });
    this._reward = { xp, gil };
    Game.gil += gil;
    this.queueMsg('Victory!');
    this.queueMsg('Gained ' + xp + ' EXP and ' + gil + ' Gil.');
    // distribute XP and handle level-ups
    this.aliveHeroes().forEach(h => {
      const ups = Game.gainXP(h, xp);
      ups.forEach(lv => this.queueMsg(h.name + ' reached Level ' + lv + '!'));
    });
    if (this.isBoss) this.queueMsg('The crystal of Eldoria is restored!');
    this.timer = 0.4;
  },

  /* ---------- floaters ---------- */
  addFloater(x, y, text, color) { this.floaters.push({ x, y, t: 1.0, text: '' + text, color }); },

  /* ---------- input ---------- */
  isMsgWaiting() {
    if (this.msgQueue.length === 0) return false;
    if (['intro', 'anim', 'victory', 'defeat', 'flee'].indexOf(this.state) >= 0) return this.timer <= 0;
    return false;
  },

  input(k) {
    // any time a message is on screen waiting, confirm/cancel advances it
    if (this.isMsgWaiting()) {
      if (k === 'confirm' || k === 'cancel') this.advanceMsg();
      return;
    }
    // during an action/intro animation (timer still running) ignore input
    if (['intro', 'anim', 'victory', 'defeat', 'flee'].indexOf(this.state) >= 0) return;
    switch (this.state) {
      case 'menu':
        if (k === 'up') this.cursor = (this.cursor + this.menu.length - 1) % this.menu.length;
        else if (k === 'down') this.cursor = (this.cursor + 1) % this.menu.length;
        else if (k === 'confirm') this.chooseCommand();
        break;
      case 'spell': {
        const sp = this.actor.ref.spells;
        if (k === 'up') this.subCursor = (this.subCursor + sp.length - 1) % sp.length;
        else if (k === 'down') this.subCursor = (this.subCursor + 1) % sp.length;
        else if (k === 'cancel') this.state = 'menu';
        else if (k === 'confirm') {
          const spell = DATA.SPELLS[sp[this.subCursor]];
          this.pending = { type: 'spell', spell: sp[this.subCursor] };
          if (spell.kind === 'attack') this.beginTargetEnemy();
          else if (spell.kind === 'healAll') { this.targetIdx = 0; this.castSpell(this.actor.ref, sp[this.subCursor], 0); }
          else this.beginTargetHero();
        }
        break;
      }
      case 'item': {
        const list = this.invList();
        if (k === 'up') this.subCursor = (this.subCursor + list.length - 1) % list.length;
        else if (k === 'down') this.subCursor = (this.subCursor + 1) % list.length;
        else if (k === 'cancel') this.state = 'menu';
        else if (k === 'confirm') {
          this.pending = { type: 'item', item: list[this.subCursor] };
          this.beginTargetHero();
        }
        break;
      }
      case 'target': {
        if (this.targetSide === 'enemy') {
          const alive = this.aliveEnemies();
          let i = alive.indexOf(this.enemies[this.targetIdx]);
          if (k === 'up' || k === 'left') i = (i + alive.length - 1) % alive.length;
          else if (k === 'down' || k === 'right') i = (i + 1) % alive.length;
          this.targetIdx = this.enemies.indexOf(alive[i]);
        } else {
          const alive = this.aliveHeroes();
          // for revive, allow targeting fallen allies too
          const pool = (this.pending.type === 'item' && DATA.ITEMS[this.pending.item].use === 'revive') ||
                       (this.pending.type === 'spell' && DATA.SPELLS[this.pending.spell].kind === 'revive')
                       ? this.party : alive;
          let i = pool.indexOf(this.party[this.targetIdx]);
          if (i < 0) i = 0;
          if (k === 'up' || k === 'left') i = (i + pool.length - 1) % pool.length;
          else if (k === 'down' || k === 'right') i = (i + 1) % pool.length;
          this.targetIdx = this.party.indexOf(pool[i]);
        }
        if (k === 'cancel') this.state = 'menu';
        else if (k === 'confirm') this.confirmTarget();
        break;
      }
    }
  },

  advanceMsg() {
    this.msg = '';
    if (this.msgQueue.length > 0) this.msgQueue.shift();
    if (this.msgQueue.length === 0) {
      this.resolvePostMessage();
    }
  },

  resolvePostMessage() {
    if (this.state === 'intro') { this.state = 'anim'; this.buildOrder(); this.nextTurn(); return; }
    if (this.state === 'victory') { this.endBattle('win'); return; }
    if (this.state === 'defeat') { this.endBattle('lose'); return; }
    if (this.state === 'flee') { this.endBattle('flee'); return; }
    if (this._returnMenu) { this._returnMenu = false; this.state = 'menu'; return; }
    this.afterAction();
  },

  endBattle(result) {
    this.active = false;
    if (this.onEnd) this.onEnd(result);
  },

  /* ---------- update / render ---------- */
  update(dt) {
    if (!this.active) return;
    this.flashT += dt;
    this.enemies.forEach(e => { if (e.flash > 0) e.flash -= dt; });
    if (this.spellFx) { this.spellFx.t -= dt; if (this.spellFx.t <= 0) this.spellFx = null; }
    this.floaters.forEach(f => { f.t -= dt * 1.4; f.y -= dt * 18; });
    this.floaters = this.floaters.filter(f => f.t > 0);

    if (this.state === 'intro') {
      if (this.timer > 0) this.timer -= dt;
      return;
    }
    if (this.state === 'anim' || this.state === 'victory' || this.state === 'defeat' || this.state === 'flee') {
      if (this.timer > 0) { this.timer -= dt; }
      // once timer elapsed, messages become visible & wait for input
    }
  },

  render(ctx) {
    // background gradient
    const g = ctx.createLinearGradient(0, 0, 0, 224);
    g.addColorStop(0, '#241038'); g.addColorStop(0.6, '#120a24'); g.addColorStop(1, '#060410');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 224);
    // ground band
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(0, 150, 256, 74);
    ctx.fillStyle = '#3a2818'; ctx.fillRect(0, 150, 256, 3);

    // enemies
    this.enemies.forEach((e, i) => {
      if (!e.alive) return;
      const s = DATA.ENEMY_SPR[e.spr];
      const blink = e.flash > 0 && (Math.floor(this.flashT * 30) % 2);
      if (!blink) GFX.drawSprite(ctx, s, e.x, e.y, e.scale);
    });

    // target arrow on enemy
    if (this.state === 'target' && this.targetSide === 'enemy') {
      const e = this.enemies[this.targetIdx];
      if (e) {
        const bob = (Math.floor(this.flashT * 6) % 2);
        ctx.fillStyle = '#f8d038';
        const ax = e.x + DATA.ENEMY_SPR[e.spr].w * e.scale + 2;
        const ay = e.y + 8 + bob;
        ctx.beginPath(); ctx.moveTo(ax + 8, ay); ctx.lineTo(ax, ay + 4); ctx.lineTo(ax + 8, ay + 8); ctx.closePath(); ctx.fill();
      }
    }

    // spell fx
    if (this.spellFx) this.renderSpellFx(ctx);

    // floaters
    this.floaters.forEach(f => {
      ctx.globalAlpha = Math.min(1, f.t);
      GFX.text(ctx, f.text, f.x - ('' + f.text).length * 3, f.y, '#000', 8);
      GFX.text(ctx, f.text, f.x - ('' + f.text).length * 3 - 1, f.y - 1, f.color, 8);
      ctx.globalAlpha = 1;
    });

    // ---- bottom UI ----
    this.renderPartyStatus(ctx);

    if (this.state === 'menu') this.renderCommandMenu(ctx);
    else if (this.state === 'spell') this.renderSpellMenu(ctx);
    else if (this.state === 'item') this.renderItemMenu(ctx);
    else if (this.state === 'target' && this.targetSide === 'hero') this.renderHeroArrow(ctx);

    // message window
    if (this.msgQueue.length > 0 && this.timer <= 0) {
      GFX.window(ctx, 6, 150, 244, 40);
      this.wrapText(ctx, this.msgQueue[0], 14, 158, 232, '#fff');
      // blinking prompt
      if (Math.floor(this.flashT * 2) % 2) GFX.text(ctx, '▼', 236, 178, '#f8d038', 8);
    }
  },

  renderSpellFx(ctx) {
    const fx = this.spellFx;
    const a = fx.t;
    if (fx.kind === 'heal' || fx.kind === 'healAll') {
      ctx.globalAlpha = Math.min(1, a * 1.5);
      const xs = fx.kind === 'healAll' ? [180, 205, 230, 205] : [fx.x];
      xs.forEach((x, idx) => {
        for (let s = 0; s < 6; s++) {
          ctx.fillStyle = fx.color;
          const yy = 140 + ((this.flashT * 60 + s * 10) % 40) - 20;
          ctx.fillRect(x - 12 + s * 4, yy, 2, 2);
        }
      });
      ctx.globalAlpha = 1;
    } else {
      // burst on target
      ctx.globalAlpha = Math.min(1, a * 1.8);
      ctx.fillStyle = fx.color;
      const r = (0.55 - a) * 60;
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        ctx.fillRect(fx.x + Math.cos(ang) * r - 1, fx.y + Math.sin(ang) * r - 1, 3, 3);
      }
      ctx.fillRect(fx.x - 3, fx.y - 3, 6, 6);
      ctx.globalAlpha = 1;
    }
  },

  renderPartyStatus(ctx) {
    GFX.window(ctx, 132, 150, 118, 70);
    this.party.forEach((p, i) => {
      const y = 156 + i * 15;
      const active = this.actor && this.actor.ref === p && (this.state === 'menu' || this.state === 'spell' || this.state === 'item' || this.state === 'target');
      const color = !p.alive ? '#ff5a5a' : active ? '#f8d038' : '#fff';
      GFX.text(ctx, p.name.slice(0, 6), 138, y, color, 7);
      const hpc = !p.alive ? '#ff5a5a' : (p.hp / p.maxhp < 0.25 ? '#ff8a40' : '#7affaf');
      GFX.text(ctx, (p.alive ? p.hp : 'KO'), 196, y, hpc, 7);
      GFX.text(ctx, '' + p.mp, 230, y, '#7ad8ff', 7);
    });
    GFX.text(ctx, 'HP', 196, 150, '#9aa', 6);
    GFX.text(ctx, 'MP', 230, 150, '#9aa', 6);
  },

  renderCommandMenu(ctx) {
    GFX.window(ctx, 6, 150, 78, 70);
    GFX.text(ctx, this.actor.ref.name.slice(0, 7), 12, 154, '#f8d038', 7);
    this.menu.forEach((m, i) => {
      const y = 168 + i * 12;
      if (i === this.cursor) GFX.text(ctx, '▶', 10, y, '#f8d038', 8);
      GFX.text(ctx, m, 20, y, '#fff', 8);
    });
  },

  renderSpellMenu(ctx) {
    const sp = this.actor.ref.spells;
    GFX.window(ctx, 6, 150, 120, 70);
    GFX.text(ctx, 'MAGIC', 12, 153, '#f8d038', 7);
    sp.forEach((key, i) => {
      const s = DATA.SPELLS[key];
      const y = 164 + i * 11;
      if (y > 212) return;
      if (i === this.subCursor) GFX.text(ctx, '▶', 10, y, '#f8d038', 7);
      const canCast = this.actor.ref.mp >= s.mp;
      GFX.text(ctx, s.name, 20, y, canCast ? '#fff' : '#888', 7);
      GFX.text(ctx, s.mp + '', 104, y, canCast ? '#7ad8ff' : '#666', 7);
    });
  },

  renderItemMenu(ctx) {
    const list = this.invList();
    GFX.window(ctx, 6, 150, 120, 70);
    GFX.text(ctx, 'ITEMS', 12, 153, '#f8d038', 7);
    list.forEach((key, i) => {
      const it = DATA.ITEMS[key];
      const y = 164 + i * 11;
      if (i === this.subCursor) GFX.text(ctx, '▶', 10, y, '#f8d038', 7);
      GFX.text(ctx, it.name, 20, y, '#fff', 7);
      GFX.text(ctx, 'x' + Game.inv[key], 100, y, '#aaffaf', 7);
    });
  },

  renderHeroArrow(ctx) {
    const p = this.party[this.targetIdx];
    const i = this.party.indexOf(p);
    const bob = (Math.floor(this.flashT * 6) % 2);
    ctx.fillStyle = '#f8d038';
    const ax = 128 + bob, ay = 158 + i * 15;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 6, ay + 3); ctx.lineTo(ax, ay + 6); ctx.closePath(); ctx.fill();
  },

  wrapText(ctx, text, x, y, maxW, color) {
    ctx.font = "8px 'Press Start 2P', monospace";
    const words = text.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        GFX.text(ctx, line, x, yy, color, 8); line = w; yy += 11;
      } else line = test;
    }
    if (line) GFX.text(ctx, line, x, yy, color, 8);
  },
};
