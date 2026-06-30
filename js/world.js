/* ============================================================
   world.js — shared pixel-graphics helpers + overworld engine
   ============================================================ */

/* ---------- GFX: low-level pixel sprite renderer ---------- */
const GFX = {
  // Draw a string-row sprite. Rows shorter than spr.w are padded so a
  // miscounted row can never crash the game.
  drawSprite(ctx, sprite, x, y, scale, flip) {
    const pal = DATA.PAL;
    const w = sprite.w;
    for (let row = 0; row < sprite.rows.length; row++) {
      const line = sprite.rows[row];
      for (let col = 0; col < w; col++) {
        const ch = col < line.length ? line[col] : '.';
        const color = pal[ch];
        if (!color) continue;
        const dx = flip ? (w - 1 - col) : col;
        ctx.fillStyle = color;
        ctx.fillRect(x + dx * scale, y + row * scale, scale, scale);
      }
    }
  },

  // Crisp pixel text helper using a small built-in style.
  text(ctx, str, x, y, color, size) {
    size = size || 8;
    ctx.fillStyle = color || '#fff';
    ctx.font = size + "px 'Press Start 2P', monospace";
    ctx.textBaseline = 'top';
    ctx.fillText(str, x, y);
  },

  textC(ctx, str, cx, y, color, size) {
    size = size || 8;
    ctx.fillStyle = color || '#fff';
    ctx.font = size + "px 'Press Start 2P', monospace";
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText(str, cx, y);
    ctx.textAlign = 'left';
  },

  // A classic blue FF window with white border.
  window(ctx, x, y, w, h) {
    ctx.fillStyle = '#0a0e4a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1822a8';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = '#0a0e4a';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.strokeStyle = '#f8f8ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  },
};

/* ---------- World / overworld engine ---------- */
const World = {
  TS: 16,                 // tile size in canvas px
  map: DATA.MAP,
  W: DATA.MAP[0].length,
  H: DATA.MAP.length,
  px: 0, py: 0,           // player tile position
  dir: 'down',
  animT: 0,               // animation timer for waves / player bob
  step: 0,                // walk-cycle frame

  init() {
    // Find start tile 'S'
    for (let y = 0; y < this.H; y++) {
      const x = this.map[y].indexOf('S');
      if (x >= 0) { this.px = x; this.py = y; break; }
    }
  },

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return DATA.TILES['~'];
    let ch = this.map[y][x];
    if (ch === 'S') ch = 'R';
    return DATA.TILES[ch] || DATA.TILES['.'];
  },

  rawAt(x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return '~';
    return this.map[y][x];
  },

  /* Attempt to move; returns an event string:
     'move' | 'blocked' | 'encounter' | 'town' | 'castle' */
  tryMove(dx, dy) {
    const dirs = { '-1,0': 'left', '1,0': 'right', '0,-1': 'up', '0,1': 'down' };
    this.dir = dirs[dx + ',' + dy] || this.dir;
    const nx = this.px + dx, ny = this.py + dy;
    const t = this.tileAt(nx, ny);
    if (!t.walk) return 'blocked';

    this.px = nx; this.py = ny;
    this.step = (this.step + 1) % 4;

    if (t.town) return 'town';
    if (t.castle) return 'castle';

    if (t.enc > 0 && Math.random() < t.enc) return 'encounter';
    return 'move';
  },

  // pick a random formation appropriate to current tile difficulty
  rollEncounter() {
    const t = this.tileAt(this.px, this.py);
    // forests / further tiles get harder pools
    const hard = t.name === 'forest' || this.px > 18 || this.py > 14;
    const pool = hard ? DATA.ENCOUNTERS.slice(2) : DATA.ENCOUNTERS.slice(0, 7);
    return pool[(Math.random() * pool.length) | 0].slice();
  },

  update(dt) { this.animT += dt; },

  render(ctx) {
    const TS = this.TS;
    const viewW = 256, viewH = 224;
    const tilesX = Math.ceil(viewW / TS), tilesY = Math.ceil(viewH / TS);

    // Camera centres on player but clamps to map edges.
    let camX = this.px - (tilesX >> 1);
    let camY = this.py - (tilesY >> 1);
    camX = Math.max(0, Math.min(camX, this.W - tilesX));
    camY = Math.max(0, Math.min(camY, this.H - tilesY));

    ctx.fillStyle = '#1a4fc0';
    ctx.fillRect(0, 0, viewW, viewH);

    for (let ry = 0; ry <= tilesY; ry++) {
      for (let rx = 0; rx <= tilesX; rx++) {
        const mx = camX + rx, my = camY + ry;
        const sx = rx * TS, sy = ry * TS;
        this.drawTile(ctx, this.rawAt(mx, my), sx, sy, mx, my);
      }
    }

    // Player sprite (drawn at its screen position)
    const psx = (this.px - camX) * TS;
    const psy = (this.py - camY) * TS;
    this.drawPlayer(ctx, psx, psy);
  },

  drawTile(ctx, ch, x, y, mx, my) {
    const TS = this.TS;
    if (ch === 'S') ch = 'R';
    const t = DATA.TILES[ch] || DATA.TILES['.'];

    // base gradient-ish two-tone
    ctx.fillStyle = t.bot; ctx.fillRect(x, y, TS, TS);
    ctx.fillStyle = t.top; ctx.fillRect(x, y, TS, TS - 5);

    const wave = Math.floor(this.animT * 3) % 2;
    switch (t.name) {
      case 'water': {
        ctx.fillStyle = '#6aa0ff';
        ctx.fillRect(x + 2 + wave * 2, y + 4, 5, 1);
        ctx.fillRect(x + 9 - wave * 2, y + 10, 5, 1);
        break;
      }
      case 'forest': {
        ctx.fillStyle = '#1f6a28';
        ctx.fillRect(x + 3, y + 4, 4, 6); ctx.fillRect(x + 9, y + 6, 4, 6);
        ctx.fillStyle = '#2f8f3a';
        ctx.fillRect(x + 4, y + 3, 4, 4); ctx.fillRect(x + 10, y + 5, 3, 3);
        ctx.fillStyle = '#5e3c1c';
        ctx.fillRect(x + 4, y + 10, 2, 3); ctx.fillRect(x + 10, y + 11, 2, 3);
        break;
      }
      case 'grass': case 'field': {
        ctx.fillStyle = t.bot;
        ctx.fillRect(x + 3, y + 6, 2, 1); ctx.fillRect(x + 9, y + 3, 2, 1);
        ctx.fillRect(x + 12, y + 9, 2, 1);
        break;
      }
      case 'mountain': {
        ctx.fillStyle = '#6a5a3a';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 15, y + 15); ctx.lineTo(x + 1, y + 15);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8e8f0';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 11, y + 7); ctx.lineTo(x + 5, y + 7);
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'road': case 'bridge': {
        ctx.fillStyle = t.bot;
        ctx.fillRect(x, y + 5, TS, 1); ctx.fillRect(x, y + 11, TS, 1);
        if (t.name === 'bridge') {
          ctx.fillStyle = '#5e3c1c';
          ctx.fillRect(x, y, 2, TS); ctx.fillRect(x + 14, y, 2, TS);
        }
        break;
      }
      case 'town': this.drawTown(ctx, x, y); break;
      case 'castle': this.drawCastle(ctx, x, y); break;
    }
  },

  drawTown(ctx, x, y) {
    // ground
    ctx.fillStyle = '#a98850'; ctx.fillRect(x, y, 16, 16);
    // house
    ctx.fillStyle = '#b5663a'; ctx.fillRect(x + 3, y + 7, 10, 7);
    ctx.fillStyle = '#7a3a1a';
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 7); ctx.lineTo(x + 8, y + 2); ctx.lineTo(x + 14, y + 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x + 7, y + 10, 3, 4);
    ctx.fillStyle = '#f8d038'; ctx.fillRect(x + 4, y + 9, 2, 2);
  },

  drawCastle(ctx, x, y) {
    ctx.fillStyle = '#6a7080'; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#9aa0b0'; ctx.fillRect(x + 2, y + 5, 12, 10);
    ctx.fillStyle = '#c4ccd6';
    ctx.fillRect(x + 2, y + 3, 2, 3); ctx.fillRect(x + 7, y + 3, 2, 3); ctx.fillRect(x + 12, y + 3, 2, 3);
    ctx.fillStyle = '#2a2a3e'; ctx.fillRect(x + 6, y + 9, 4, 6);
    ctx.fillStyle = '#e23b3b'; ctx.fillRect(x + 7, y + 1, 1, 3);
  },

  drawPlayer(ctx, x, y) {
    const bob = (Math.floor(this.animT * 6) % 2) ? 1 : 0;
    const yy = y + bob;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 4, y + 14, 8, 2);
    // simple hero: blue tunic knight leading the party
    const s = 1;
    const facingLeft = this.dir === 'left';
    // body
    ctx.fillStyle = '#2230c8'; ctx.fillRect(x + 4, yy + 7, 8, 6);
    // head
    ctx.fillStyle = '#f3c19a'; ctx.fillRect(x + 5, yy + 2, 6, 5);
    // helmet
    ctx.fillStyle = '#c4ccd6'; ctx.fillRect(x + 4, yy + 1, 8, 3);
    // eyes by direction
    ctx.fillStyle = '#0a0a12';
    if (this.dir === 'down') { ctx.fillRect(x + 6, yy + 4, 1, 1); ctx.fillRect(x + 9, yy + 4, 1, 1); }
    else if (this.dir === 'up') { /* back of head */ }
    else { const ex = facingLeft ? x + 6 : x + 9; ctx.fillRect(ex, yy + 4, 1, 1); }
    // legs (walk cycle)
    ctx.fillStyle = '#1a2f8c';
    const off = (this.step % 2) ? 1 : 0;
    ctx.fillRect(x + 5, yy + 13, 2, 2 + off);
    ctx.fillRect(x + 9, yy + 13, 2, 2 + (1 - off));
  },
};
