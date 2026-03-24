// middleui.js — Lower-left micro-toolbar (💿 Vinyl + ⬆︎ Upload MP3)
// - Buttons FIXED at lower-left (beside the music player column)
// - Vinyl toggles above the visualizer/player (aligned to 18px left rail), hidden by default
// - Playlist is independent of vinyl visibility; shows ONLY AFTER first upload, placed above
//   where the vinyl would be, not inside it.
//
// Requires window.__MUSIC_API with:
//  addFiles(files[]), setTrackIndex(i), removeAt(i), getPlaylist(),
//  (optionally) getCurrentIndex(), on(event, fn), off(event, fn),
//  isReady, isPlaying, seekTo(t), play(), currentTime, duration

const mk = (tag, style = {}) => { const el = document.createElement(tag); Object.assign(el.style, style); return el; };
const clamp = (v,a,b)=> Math.min(b, Math.max(a, v));

/* layout tokens (match music.js) */
const LEFT_PAD   = 18;   // music left rail
const PLAYER_W   = 240;  // music.js SIZE.W
const BOTTOM_GAP = 16;   // music.js bottom gap

/* globals */
let _vinylPanel = null;      // Node after build (independent)
let _playlistPanel = null;   // Node AFTER first upload (independent)
let _showPlaylist = false;   // toggled on first upload

let _lastActiveIdx = -1;     // for index-based highlight
let _lastDomTitle  = '';     // for DOM-title fallback highlight
let _resumeWanted  = false;  // set true if we should auto-resume after playlist change

/* ---------------- helpers ---------------- */

function joystickBoxSize() {
  const j = document.getElementById('fx-joystick');
  if (!j) return 160;
  const w = j.getBoundingClientRect().width;
  return Math.max(120, Math.min(280, Math.round(w)));
}

// Where the bottom edge of the vinyl SHOULD be (independent of its visibility)
function vinylBottomAnchorPx() {
  const music = document.getElementById('music-host');
  if (!music) return BOTTOM_GAP + 56; // fallback if player missing
  const r = music.getBoundingClientRect();
  const gapAbovePlayer = 10;
  return Math.max(BOTTOM_GAP, Math.round(window.innerHeight - r.top + gapAbovePlayer));
}

/* Read the current scrolling title text from the music UI (fallback highlight) */
function readTitleFromDOM() {
  const host = document.getElementById('music-host');
  if (!host) return '';
  const els = host.querySelectorAll('*');
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs && cs.animationName && cs.animationName.includes('music-marquee')) {
      const txt = (el.textContent || '').trim();
      if (txt) return txt;
    }
  }
  return '';
}

/* ---------------- Vinyl panel ---------------- */

function buildVinylPanel() {
  const size = joystickBoxSize();
  const W=size, H=size, cx=W/2, cy=H/2;

  const panel = mk('div', {
    position:'fixed', left:`${LEFT_PAD}px`, zIndex:'910',
    padding:'0', background:'transparent',
    width:`${W}px`, height:`${H}px`,
    display:'none' // hidden until toggled
  });

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('width',W); svg.setAttribute('height',H);
  Object.assign(svg.style,{ position:'absolute', left:0, top:0 });
  panel.appendChild(svg);

  // rotating group
  const disc = document.createElementNS(svgNS,'g');
  disc.setAttribute('transform', `rotate(0 ${cx} ${cy})`);
  svg.appendChild(disc);

  const R_OUT = size*0.48;

  // outer ring (white stroke only)
  const ring = document.createElementNS(svgNS,'circle');
  ring.setAttribute('cx',cx); ring.setAttribute('cy',cy); ring.setAttribute('r', R_OUT);
  ring.setAttribute('fill','none'); ring.setAttribute('stroke','#e6e8f0'); ring.setAttribute('stroke-width','1');
  disc.appendChild(ring);

  // off-center dot to show spin
  const DOT_R = Math.max(3, Math.round(size*0.016));
  const DOT_OFFSET_R = size*0.22;
  const dot = document.createElementNS(svgNS,'circle');
  dot.setAttribute('cx', cx + DOT_OFFSET_R); dot.setAttribute('cy', cy); dot.setAttribute('r', DOT_R);
  dot.setAttribute('fill','#e6e8f0');
  disc.appendChild(dot);

  // simple right-side arm (progress)
  const arm = document.createElementNS(svgNS,'g'); svg.appendChild(arm);
  const armLine = document.createElementNS(svgNS,'line');
  armLine.setAttribute('stroke','#e6e8f0'); armLine.setAttribute('stroke-width','2');
  const needle = document.createElementNS(svgNS,'line');
  needle.setAttribute('stroke','#e6e8f0'); needle.setAttribute('stroke-width','2');
  arm.appendChild(armLine); arm.appendChild(needle);
  const R_INNER = size*0.16;

  function setArmProgress01(t) {
    const Rg = R_OUT - (R_OUT - R_INNER) * clamp(t, 0, 1);
    const xOuter = cx + R_OUT, y = cy;
    const xNeedle = cx + Rg;
    armLine.setAttribute('x1', xOuter); armLine.setAttribute('y1', y);
    armLine.setAttribute('x2', xNeedle); armLine.setAttribute('y2', y);
    needle.setAttribute('x1', xNeedle); needle.setAttribute('y1', y);
    needle.setAttribute('x2', xNeedle - Math.max(8, size*0.04)); needle.setAttribute('y2', y);
  }

  // slow auto spin while playing (visual only)
  const VISUAL_RPM = 5.0;
  let visualDeg = 0, lastTS = performance.now();
  (function spinLoop(){
    const now = performance.now();
    const dt = (now - lastTS)/1000; lastTS=now;
    const API = window.__MUSIC_API || {};
    if (panel.style.display !== 'none' && API && API.isPlaying) {
      const degPerSec = (VISUAL_RPM/60)*360;
      visualDeg = (visualDeg + degPerSec*dt) % 360;
      disc.setAttribute('transform', `rotate(${visualDeg} ${cx} ${cy})`);
    }
    requestAnimationFrame(spinLoop);
  })();

  // progress polling for arm
  (function pollProgress(){
    const API = window.__MUSIC_API || {};
    const dur = API?.duration || 0, cur = API?.currentTime || 0;
    const t = dur > 0 ? (cur/dur) : 0;
    setArmProgress01(t);
    requestAnimationFrame(pollProgress);
  })();

  // scrubbing with vinyl rotation (audible forward/back)
  const SEC_PER_TURN_DRAG = 2.0;
  const SCRUB_MIN = 0.03, SCRUB_MAX = 0.12;

  let dragging=false, lastAng=0, accum=0;
  function angleAt(e){
    const rect=svg.getBoundingClientRect();
    const ax=e.clientX-(rect.left+cx); const ay=e.clientY-(rect.top+cy);
    return Math.atan2(ay, ax);
  }
  function doSeek(deltaSec){
    const API = window.__MUSIC_API || {};
    if (!API?.seekTo || API.currentTime==null) return;
    let t = (API.currentTime||0) + deltaSec;
    const dur=API.duration||1e9;
    t = clamp(t, 0, dur);
    API.seekTo(t);
  }
  (function scrubLoop(){
    if (panel.style.display !== 'none' && dragging && Math.abs(accum)>0.0001){
      const abs = Math.abs(accum);
      const step = Math.sign(accum) * clamp(abs*0.6, SCRUB_MIN, SCRUB_MAX);
      doSeek(step);
      accum -= step;
    }
    requestAnimationFrame(scrubLoop);
  })();

  svg.addEventListener('pointerdown', (e)=>{
    const API = window.__MUSIC_API||{};
    if (!API?.isReady) return;
    e.preventDefault();
    dragging=true;
    lastAng = angleAt(e);
    if (!API.isPlaying && API.play) API.play(); // audible while scrubbing
  });
  window.addEventListener('pointermove', (e)=>{
    if (!dragging || panel.style.display === 'none') return;
    const a = angleAt(e);
    let d = a - lastAng;
    if (d > Math.PI) d -= Math.PI*2; else if (d < -Math.PI) d += Math.PI*2;
    lastAng = a;
    visualDeg = (visualDeg + (d*180/Math.PI))%360;
    disc.setAttribute('transform', `rotate(${visualDeg} ${cx} ${cy})`);
    accum += d * (SEC_PER_TURN_DRAG / (Math.PI*2));
  }, {passive:true});
  window.addEventListener('pointerup', ()=> (dragging=false));

  return panel;
}

/* ---------------- Playlist panel (built on first upload) ---------------- */

function buildPlaylistPanel() {
  const panel = mk('div', {
    position:'fixed',
    left:`${LEFT_PAD}px`,
    width:`${PLAYER_W}px`,
    background:'rgba(14,17,26,0.55)',
    border:'0px solid rgba(230,232,240,0.14)',
    borderRadius:'10px',
    backdropFilter:'blur(6px)',
    WebkitBackdropFilter:'blur(6px)',
    color:'#e6e8f0',
    fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
    fontSize:'12px',
    display:'none',
    zIndex:'910',
    overflow:'hidden',
  });

  const list = mk('div', {
    maxHeight:'160px',
    overflowY:'auto',
    padding:'6px',
  });
  // hide scrollbar (Firefox + WebKit)
  list.style.scrollbarWidth = 'none';
  list.style.msOverflowStyle = 'none';
  const hideCss = document.createElement('style');
  hideCss.textContent = `#playlist-list::-webkit-scrollbar { display: none; }`;
  document.head.appendChild(hideCss);

  list.id = 'playlist-list';
  panel.appendChild(list);
  return panel;
}

function renderPlaylist() {
  if (!_playlistPanel) return;
  const list = _playlistPanel.querySelector('#playlist-list');
  if (!list) return;

  const API = window.__MUSIC_API;
  if (!API?.getPlaylist) return;

  const items = API.getPlaylist() || [];
  list.innerHTML = '';

  if (!_showPlaylist || !items.length) {
    _playlistPanel.style.display = 'none';
    return;
  }

  items.forEach(({ id, title }, idx) => {
    const row = mk('div', {
      display:'grid',
      gridTemplateColumns:'1fr 18px',
      alignItems:'center',
      gap:'6px',
      padding:'4px 6px',
      borderRadius:'6px',
      cursor:'pointer',
      userSelect:'none'
    });
    row.dataset.idx = String(idx);

    // row click -> play (ignore clicks on the X)
    row.addEventListener('click', (e)=>{
      const tgt = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
      if (tgt && tgt.closest && tgt.closest('[data-x="1"]')) return; // it's the X
      API.setTrackIndex?.(idx);
      // optimistic highlight
      _lastActiveIdx = idx;
      highlightRows(list, idx, '');
      // ensure playing
      if (API.play) API.play();
    });

    const tt = mk('div', { overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' });
    tt.textContent = title || `track ${idx+1}`;
    row.appendChild(tt);

    const x = mk('div', {
      width:'18px', height:'18px', borderRadius:'5px',
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'rgba(230,232,240,0.75)',
      border:'1px solid rgba(230,232,240,0.25)',
      opacity:'0', transition:'opacity 120ms ease'
    });
    x.textContent = '×';
    x.setAttribute('data-x','1');
    x.title = 'Remove';

    x.addEventListener('click', (e)=>{
  e.stopPropagation();
  const API = window.__MUSIC_API || {};
  if (!API.removeAt) return;

  const wasPlaying = !!API.isPlaying;
  const curIdx = (API.getCurrentIndex ? API.getCurrentIndex() : _lastActiveIdx) ?? -1;
  const savedTime = API.currentTime || 0;

  // remove the clicked track
  API.removeAt(idx);

  // after music.js updates its playlist, fix up index/time and resume
  setTimeout(()=>{
    const pl = API.getPlaylist ? (API.getPlaylist() || []) : [];
    if (!pl.length) { renderPlaylist(); return; }

    if (idx === curIdx) {
      // deleted the one that was playing → jump to next sensible track
      let nextIdx = Math.min(curIdx, pl.length - 1);
      API.setTrackIndex?.(nextIdx);
      if (wasPlaying && API.play) API.play(); // start from 0 on the new track
    } else if (idx < curIdx) {
      // deleted a track BEFORE the current → current shifts left by 1
      const newIdx = Math.max(0, curIdx - 1);
      API.setTrackIndex?.(newIdx);
      // restore playhead to where it was
      if (API.seekTo) API.seekTo(savedTime);
      if (wasPlaying && API.play) API.play();
    } else {
      // deleted a track AFTER the current → nothing to do
      if (wasPlaying && API.play) API.play();
    }

    renderPlaylist();
  }, 0);
});


    row.appendChild(x);

    row.addEventListener('mouseenter', ()=> x.style.opacity = '1');
    row.addEventListener('mouseleave', ()=> x.style.opacity = '0');

    list.appendChild(row);
  });

  // highlight: prefer index; fallback to DOM marquee title
  const idx = readActiveIndex();
  const domTitle = readTitleFromDOM();
  highlightRows(list, idx, domTitle);

  _playlistPanel.style.display = 'block';
}

function readActiveIndex() {
  const API = window.__MUSIC_API || {};
  try {
    const idx = API.getCurrentIndex ? API.getCurrentIndex() : -1;
    return (typeof idx === 'number' && idx >= 0) ? idx : -1;
  } catch {
    return -1;
  }
}

function highlightRows(listEl, activeIdx, activeTitle) {
  const rows = Array.from(listEl.children);
  rows.forEach((row, i) => {
    const name = row.firstChild?.textContent || '';
    const isActive = (activeIdx >= 0 ? i === activeIdx : (!!activeTitle && name === activeTitle));
    row.style.color = isActive ? '#39ff14' : '#e6e8f0';
    row.style.fontWeight = isActive ? '700' : '500';
  });
}

/* ---------------- Positioning (independent of vinyl visibility) ---------------- */


function placeVinyl() {
  if (!_vinylPanel) return;
  const size = joystickBoxSize();
  _vinylPanel.style.width  = size + 'px';
  _vinylPanel.style.height = size + 'px';
  _vinylPanel.style.left   = LEFT_PAD + 'px';
  _vinylPanel.style.bottom = vinylBottomAnchorPx() + 'px';
}

/* Place playlist ABOVE where the vinyl would be, using anchors only */
function placePlaylist() {
  if (!_playlistPanel) return;
  const vSize = joystickBoxSize();
  const playlistBottom = vinylBottomAnchorPx() + vSize + 10; // 10px above vinyl
  _playlistPanel.style.left = LEFT_PAD + 'px';
  _playlistPanel.style.bottom = playlistBottom + 'px';
  _playlistPanel.style.width = PLAYER_W + 'px';

  // Ensure stays on-screen vertically on tiny viewports
  const maxBottom = window.innerHeight - 6; // 6px from top
  if (playlistBottom > maxBottom) {
    _playlistPanel.style.bottom = Math.max(BOTTOM_GAP, maxBottom) + 'px';
  }
}

/* ---------------- Init ---------------- */

export function initMiddleUI(){
  if (window.__MIDDLE_UI) return; // already initialized

  // vinyl panel (hidden by default, toggled by music player button)
  _vinylPanel = buildVinylPanel();
  if (_vinylPanel instanceof Node) document.body.appendChild(_vinylPanel);
  placeVinyl();
  placePlaylist();

  // expose toggle so the music player button can drive it
  window.__MIDDLE_UI = {
    toggleVinyl() {
      if (!(_vinylPanel instanceof Node)) return;
      const on = _vinylPanel.style.display !== 'none';
      _vinylPanel.style.display = on ? 'none' : 'block';
      placeVinyl();
      placePlaylist();
    }
  };

  // MUSIC API hooks
  const API = window.__MUSIC_API;
  if (API && API.on) {
    API.on('playlistchange', ()=>{
      // show playlist as soon as any tracks are added (via music player upload)
      _showPlaylist = true;
      if (!_playlistPanel) {
        _playlistPanel = buildPlaylistPanel();
        if (_playlistPanel instanceof Node) document.body.appendChild(_playlistPanel);
      }
      renderPlaylist();
      placePlaylist();
      if (_resumeWanted && API.play) { API.play(); _resumeWanted = false; }
    });
    API.on('titlechange', ()=>{ if (_showPlaylist) renderPlaylist(); });
    API.on('state',       ()=>{ if (_showPlaylist) renderPlaylist(); });
    API.on('trackindex',  (idx)=>{
      if (typeof idx === 'number') { _lastActiveIdx = idx; if (_showPlaylist) renderPlaylist(); }
    });
  }

  (function pollActivity(){
    const idx = readActiveIndex();
    if (typeof idx === 'number' && idx !== _lastActiveIdx) {
      _lastActiveIdx = idx;
      if (_showPlaylist) renderPlaylist();
    }
    const titleNow = readTitleFromDOM();
    if (titleNow && titleNow !== _lastDomTitle) {
      _lastDomTitle = titleNow;
      if (_showPlaylist) renderPlaylist();
    }
    requestAnimationFrame(pollActivity);
  })();

  window.addEventListener('resize', ()=>{ placeVinyl(); placePlaylist(); }, { passive:true });

  const music = document.getElementById('music-host');
  if (music && 'ResizeObserver' in window) {
    const ro = new ResizeObserver(()=>{ placeVinyl(); placePlaylist(); });
    ro.observe(music);
  }
}

export default initMiddleUI;
