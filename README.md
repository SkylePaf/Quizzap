# Quizzap

> The easy way to make quizz for others to do.

**Quizz maker · Quizz manager · Quizz importer**  
Built entirely in vanilla HTML/CSS/JS - no framework, no engine.

[▶ Use Online](https://skylepaf.github.io/Quizzap/web_browser/index.html)

*Data will be save in the browser localstorage.*

---

## Screenshots

| Main Menu | Gameplay — World 2 |
|---|---|
| ![menu](screenshots/main_menu.png) | ![world2](screenshots/lvlshowcase1.png) |

| Gameplay - World 7 | Gameplay - World 6 |
|---|---|
| ![world5](screenshots/lvlshowcase3.png) | ![world8](screenshots/lvlshowcase2.png) |

---

## Gameplay

You control circles on a grid full of squares. Goal: eat every harmless squares without dying to the slightly more harmfull ones.

- Move your character with the keyboard
- Sprint to outrun enemies
- Collect **powerups** to survive the chaos of later worlds
- Each world introduces new enemy behaviors and a different grids each different than another

---

## Features

- **8 worlds × 5 levels** — 40 hand-crafted levels
- **8 distinct enemy types** — each world brings a new AI behavior
- **4 powerups** — Laser, Explosion, Teleportation, Wall Protection
- **Dynamic grid scaling** — grid size grows, shrinks to give a new experience each lvls
- **Performance tracking** — personal best recorded per level and more
- **Accessibility settings** — Light Mode, independent Music/SFX volume sliders and controls
- **Adaptive resolution** — zoom factor auto-calculated to fit any screen

---

## Architecture

No game engine. No framework. Everything built from scratch:

```
├── index.html          # game shell — one HTML table = the entire grid
├── main.js             # game loop, grid generation, input, scoring
├── enemiesScript.js    # 8 enemy AIs, movement patterns, collision
├── bonusScript.js      # 4 powerup systems (laser, teleport, explosion...)
└── levelsData.json     # all 40 levels defined as pure data
```

The grid is an HTML `<table>`. Every cell = one square. Movement, collision and rendering are handled entirely in vanilla JS.

Levels are **fully data-driven** — a new level is just a JSON entry:

```json
"lvl1": {
    "gameMap": {
        "size": 9,
        "gameScale": [1, 16]
    },
    "player": {
        "pos": { "x": 3, "y": 3 },
        "size": 1,
        "color": 0
    },
    "gameMapHazards": {}
}
```

Adding a world = adding a dictionary in the JSON. The engine does the rest.

---

## Controls

| Action | Keys |
|--------|------|
| Move | Z-Q-S-D |
| Sprint | SHIFT or Right Click |
| Laser bonus | SHIFT + CTRL |
| Other bonuses | Left Click |
| Pause menu | ESCAPE |

---

## Stack

`HTML` `CSS` `JavaScript` — zero dependencies, runs in any browser.  

Packaged as a desktop app with [Electron](https://www.electronjs.org/).  
To package, go in `/web_app(Electron)` then :  
```bash
npm install
npm run build
```
*The exe file should be in /web_app(Electron)/dist/ .*
---

## Credits

Sound effects adapted from **Undertale** (Toby Fox) and **Driverhead**.  
Code, level design and visuals by **SkylePaf**.
