# CLAUDE.md — Eric Joo Portfolio

## Project
Personal portfolio site. GitHub repo: https://github.com/JOO-K/ericjoo2026
Deployed via GitHub Pages at: https://joo-k.github.io/ericjoo2026

## Stack
- Vanilla HTML/CSS/JS (ES modules)
- No build step, no framework
- jQuery for component loading (partLoader.js)

## Key Files
- `index.html` — main page
- `js/app.js` — boots everything, initializes draw studio, radio, clock, music
- `js/drawstudio.js` — full-screen drawing overlay (see below)
- `js/music.js` — DJ scrub disk music player
- `js/radio.js` — radio toggle button (fixed top-right, glass style)
- `js/games.js` — play/scores buttons hidden (`display: none`)
- `css/style.css` — main styles, `#draw-mode-container` at `top:20px, right:20px`
- `css/navigation.css` — nav wrapper, logo-container has `padding-left: 35px`

## Draw Studio (`js/drawstudio.js`)
Full-screen drawing overlay triggered by the "draw" button (top-right nav).

### Architecture
- Three canvases: `staticCanvas` (offscreen pixel drawing), `canvas` (display, rAF composite), `uiCanvas` (selection marquee + warp preview, pointer-events none)
- `requestAnimationFrame` loop: bg noise → static layer → animated cells → swarm/flock/mold/drift particles → UI overlay

### Tools
**DRAW:** brush, scratch, spray, circuit, ink
**FX:** glitch, smear, warp, eraser
**CELL:** ascii, flow, trace, swarm, flock, mold, drift, spiral
**SELECTION:** select, move (+ invert/commit buttons)

### Particle Systems (in renderFrame)
- `swarmParts` — noise flow field, chaotic
- `flockParts` — boids (separation/alignment/cohesion), up to 120 particles
- `moldParts` — physarum slime mold branching, up to 300 agents
- `driftParts` — slow calm noise flow field, fades over time

### Gallery (localStorage, local only)
- Key: `ericjoo_drawings`, max 30 items, 800px JPEG
- Toggle via "gallery" button in top bar
- Opens by default when studio opens
- Transparent floating panel, `right: 20px, top: 90px`
- Admin delete (X on image left): set `localStorage.ericjoo_admin = 'ej2025'` in console once
- Firebase integration was built but NOT active — gallery is localStorage only for now

### Toolbar Positioning
- `position: absolute` inside `position: fixed; inset: 0` overlay
- `left: 35px` (matches nav `padding-left: 35px`), `top: 121px`, `width: 130px`, `height: auto`
- `maxHeight: calc(100vh - 140px)` with `overflowY: auto`

### Selection System
- Flat variables: `selX, selY, selW, selH, selActive, selDragging, selMoving, selImage, selOffX, selOffY`
- `selNorm()` always returns positive `{x,y,w,h}` — critical for invert to work correctly
- Invert: reads `sCtx.getImageData` at normalized bounds, inverts RGB, puts back

### Top Bar Buttons
undo · clear · save · gallery · × close

## Firebase (ready but inactive)
Config is set up for project `ericjoo2026`. Files exist:
- `admin.html` — admin panel (email/password login via Firebase Auth)
- `firestore.rules` — public read/create, auth-only delete
- `functions/` — Cloudflare Pages Functions (built but not used)

To activate Firebase gallery:
1. Finish Firebase Auth setup (console.firebase.google.com)
2. Add Firestore security rules from `firestore.rules`
3. Re-add Firebase CDN scripts to `index.html` and update `drawstudio.js` gallery functions

## To Push Changes
```
cd "C:\Users\ericd\WEBDEV\ericjooportfolio-main\ericjooportfolio-main"
git add .
git commit -m "your message"
git push
```

## Admin Gallery Access (local)
Open browser console on the site and run once:
```js
localStorage.setItem('ericjoo_admin', 'ej2025')
```
Then refresh — X delete buttons appear on gallery image hover.
