# Final Fantasy: Crystals of Eldoria

A classic NES-style, turn-based JRPG that runs entirely in the browser — no
build step, no dependencies. Pure HTML5 Canvas + vanilla JavaScript, served as
static files on GitHub Pages.

▶ **Play:** https://austinblundell.github.io/OpusTest/

## The game

Eldoria's crystal has gone dark. Lead a party of four heroes — **Aldric** the
Knight, **Lyra** the White Mage, **Morgan** the Black Mage, and **Finn** the
Thief — across the overworld, grind through random encounters, and storm the
eastern castle to defeat **Garland** and restore the light.

### Features

- **Tile-based overworld** with a hand-authored map: grass, forests, mountains,
  rivers, bridges, roads, a village, and a castle. Camera follows the party.
- **Random encounters** in grass and forest tiles (forests and the far east are
  more dangerous).
- **Classic menu battle system** — Fight / Magic / Item / Run, turn order by
  agility, critical hits, target selection, animated spell effects and floating
  damage numbers.
- **Four character classes** with distinct stats and spell lists.
- **Magic & items** — Fire/Blizzard/Thunder/-ara tiers, Cure/Cura/Curaga, Life,
  Potions, Ethers, Phoenix Downs.
- **Leveling** — earn EXP and Gil, level up with full restores and growing stats.
- **Village** — rest to heal, buy items at the shop, and save your progress.
- **Save/continue** via `localStorage`.
- **Boss fight & ending.**
- **Mobile support** — on-screen D-pad and A/B buttons appear on touch devices.

## Controls

| Action             | Keyboard                       | Touch  |
|--------------------|--------------------------------|--------|
| Move / navigate    | Arrow keys or **WASD**         | D-pad  |
| Confirm            | **Enter** / **Space** / **Z**  | **A**  |
| Cancel / back      | **Esc** / **X**                | **B**  |
| Quick save (field) | **Enter**                      | **A**  |

## Project layout

```
index.html        # page shell, screen, overlays, touch controls
css/style.css     # NES-JRPG presentation, pixel scaling, responsive layout
js/data.js        # palettes, pixel-art sprites, party/enemy/spell/item data, map
js/world.js       # shared pixel renderer (GFX) + overworld engine
js/battle.js      # turn-based battle state machine
js/game.js        # main loop, state machine, towns, save/load
```

No frameworks, no bundler — open `index.html` directly or serve the folder with
any static file server.

## Deploying to GitHub Pages

The repo includes `.github/workflows/deploy.yml`, which publishes the site on
every push. **One-time setup:** in the repository's **Settings → Pages**, set
**Source** to **GitHub Actions**. After that, pushes automatically deploy to
`https://austinblundell.github.io/OpusTest/`.

(Alternatively, set Pages **Source** to "Deploy from a branch", pick the branch
and the `/ (root)` folder — the site lives at the repository root.)

---

*A browser homage to the 8-bit Final Fantasy era. Not affiliated with Square Enix.*
