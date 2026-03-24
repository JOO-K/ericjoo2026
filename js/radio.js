// radio.js — compact spinning 3D globe radio picker

const STATIONS = [
  { name: 'KEXP',  city: 'Seattle',         lat:  47, lon: -122, url: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3' },
  { name: 'NPR',   city: 'Washington D.C.', lat:  39, lon:  -77, url: 'https://npr-ice.streamguys1.com/live.mp3'        },
  { name: 'Soma',  city: 'São Paulo',        lat: -23, lon:  -55, url: 'https://ice6.somafm.com/groovesalad-128-mp3'    },
  { name: 'NTS',   city: 'London',          lat:  52, lon:   -1, url: 'https://stream-relay-geo.ntslive.net/stream'     },
  { name: 'FIP',   city: 'Réunion',         lat: -21, lon:   55, url: 'https://icecast.radiofrance.fr/fip-midfi.mp3'   },
  { name: 'DI.FM', city: 'Tokyo',           lat:  35, lon:  135, url: 'https://stream.di.fm/industrial'               },
];

// ── globe dimensions ──────────────────────────────────────────────
const SIZE = 108;
const R    = 46;
const CX   = SIZE / 2;
const CY   = SIZE / 2;

// ── 3×3 rotation matrix helpers ───────────────────────────────────
function identity() { return [1,0,0, 0,1,0, 0,0,1]; }

function mulMat(a, b) {
  return [
    a[0]*b[0]+a[1]*b[3]+a[2]*b[6],  a[0]*b[1]+a[1]*b[4]+a[2]*b[7],  a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
    a[3]*b[0]+a[4]*b[3]+a[5]*b[6],  a[3]*b[1]+a[4]*b[4]+a[5]*b[7],  a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6],  a[6]*b[1]+a[7]*b[4]+a[8]*b[7],  a[6]*b[2]+a[7]*b[5]+a[8]*b[8],
  ];
}

function mRotX(a) { const c=Math.cos(a), s=Math.sin(a); return [1,0,0, 0,c,-s, 0,s,c]; }
function mRotY(a) { const c=Math.cos(a), s=Math.sin(a); return [c,0,s, 0,1,0, -s,0,c]; }

function applyMat(m, sx, sy, sz) {
  return {
    x: m[0]*sx + m[1]*sy + m[2]*sz,
    y: m[3]*sx + m[4]*sy + m[5]*sz,
    z: m[6]*sx + m[7]*sy + m[8]*sz,
  };
}

// Gram-Schmidt re-orthonormalization — prevents float drift over many frames
function orthonorm(m) {
  let r0 = [m[0],m[1],m[2]];
  let r1 = [m[3],m[4],m[5]];
  const n0 = Math.hypot(...r0);
  r0 = r0.map(v => v / n0);
  const d01 = r0[0]*r1[0] + r0[1]*r1[1] + r0[2]*r1[2];
  r1 = r1.map((v,i) => v - d01 * r0[i]);
  const n1 = Math.hypot(...r1);
  r1 = r1.map(v => v / n1);
  const r2 = [r0[1]*r1[2]-r0[2]*r1[1], r0[2]*r1[0]-r0[0]*r1[2], r0[0]*r1[1]-r0[1]*r1[0]];
  return [...r0, ...r1, ...r2];
}

// Returns a rotation matrix that places the given lat/lon at front-center (z = 1)
function rotMatToFront(lat, lon) {
  const lr = lat * Math.PI / 180;
  const lo = lon * Math.PI / 180;
  const sx = Math.cos(lr) * Math.cos(lo);
  const sy = Math.sin(lr);
  const sz = Math.cos(lr) * Math.sin(lo);
  const alpha = Math.atan2(-sx, sz);
  const beta  = Math.atan2(sy, Math.hypot(sx, sz));
  return mulMat(mRotX(beta), mRotY(alpha));
}

// ── wireframe sphere renderer ─────────────────────────────────────
function renderWireframe(ctx2, mat) {
  ctx2.clearRect(0, 0, SIZE, SIZE);

  function rot(sx, sy, sz) { return applyMat(mat, sx, sy, sz); }

  function drawCurve(pts, baseAlpha, lw) {
    ctx2.lineWidth = lw;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const z = (a.z + b.z) * 0.5;
      if (z <= 0) continue;
      ctx2.strokeStyle = `rgba(200,200,200,${Math.min(baseAlpha, z * baseAlpha * 1.6 + 0.04).toFixed(2)})`;
      ctx2.beginPath();
      ctx2.moveTo(CX + R * a.x, CY - R * a.y);
      ctx2.lineTo(CX + R * b.x, CY - R * b.y);
      ctx2.stroke();
    }
  }

  const STEPS = 120;

  // Latitude lines every 20°
  for (let latDeg = -80; latDeg <= 80; latDeg += 20) {
    const lr = latDeg * Math.PI / 180;
    const cosLat = Math.cos(lr), sinLat = Math.sin(lr);
    const isEquator = latDeg === 0;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const lo = (i / STEPS) * Math.PI * 2 - Math.PI;
      pts.push(rot(cosLat * Math.cos(lo), sinLat, cosLat * Math.sin(lo)));
    }
    drawCurve(pts, isEquator ? 0.55 : 0.30, isEquator ? 0.8 : 0.5);
  }

  // Longitude lines every 30°
  for (let lonDeg = 0; lonDeg < 360; lonDeg += 30) {
    const lo = lonDeg * Math.PI / 180;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const lr = (i / STEPS) * Math.PI - Math.PI * 0.5;
      pts.push(rot(Math.cos(lr) * Math.cos(lo), Math.sin(lr), Math.cos(lr) * Math.sin(lo)));
    }
    drawCurve(pts, 0.30, 0.5);
  }

  // Sphere outline
  ctx2.beginPath();
  ctx2.arc(CX, CY, R, 0, Math.PI * 2);
  ctx2.strokeStyle = 'rgba(200,200,200,0.28)';
  ctx2.lineWidth = 1;
  ctx2.stroke();
}

// ── project lat/lon → 3D point via matrix ─────────────────────────
function project(lat, lon, mat) {
  const lr = lat * Math.PI / 180;
  const lo = lon * Math.PI / 180;
  return applyMat(mat, Math.cos(lr) * Math.cos(lo), Math.sin(lr), Math.cos(lr) * Math.sin(lo));
}

const toScreen = (pt) => ({ sx: CX + R * pt.x, sy: CY - R * pt.y });

// ── main export ───────────────────────────────────────────────────
export function initRadioMode() {

  // ---- runtime state ----
  let radioActive = false;
  let activeIdx   = -1;
  let rotMat      = identity();
  let velX        = 0;   // angular velocity around X (up/down)
  let velY        = 0;   // angular velocity around Y (left/right)
  let phase       = 'idle';  // 'drag'|'coast'|'snap'|'idle'
  let snapIdx     = 0;
  let pulse       = 0;
  let rafId       = null;
  let dragging    = false;
  let lastDragX   = 0;
  let lastDragY   = 0;
  let normCounter = 0;

  // ---- DOM: radio button ----
  const radioBtn = document.createElement('div');
  radioBtn.id = 'radio-mode-toggle';
  Object.assign(radioBtn.style, {
    background: 'transparent', border: 'none',
    color: 'rgba(230,232,240,0.5)', fontSize: '9px',
    fontFamily: '"DM Mono", monospace', cursor: 'pointer',
    padding: '0', whiteSpace: 'nowrap',
    lineHeight: '1.2', transition: 'color 150ms ease',
    display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'center',
  });

  const _icoSpan = document.createElement('span');
  Object.assign(_icoSpan.style, {
    fontFamily: "'Material Symbols Outlined'",
    fontSize: '13px', lineHeight: '1', display: 'inline-block',
    fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    transform: 'translateY(0.4px)', pointerEvents: 'none',
  });
  _icoSpan.textContent = 'radio';

  const _txtSpan = document.createElement('span');
  _txtSpan.textContent = 'radio';
  _txtSpan.style.pointerEvents = 'none';

  radioBtn.appendChild(_icoSpan);
  radioBtn.appendChild(_txtSpan);
  const dimBtn    = () => { radioBtn.style.color = radioActive ? 'rgba(230,232,240,0.85)' : 'rgba(230,232,240,0.5)'; };
  const brightBtn = () => { radioBtn.style.color = radioActive ? 'rgba(230,232,240,1)'    : 'rgba(230,232,240,0.8)'; };

  // ---- DOM: globe wrapper (floats above the widget when active) ----
  const wrap = document.createElement('div');
  wrap.id = 'radio-globe-wrap';
  Object.assign(wrap.style, {
    position: 'fixed', left: '270px', bottom: '64px', zIndex: '900',
    display: 'none', flexDirection: 'column',
    alignItems: 'flex-start', gap: '4px',
  });

  const canvas = document.createElement('canvas');
  canvas.id    = 'radio-globe-canvas';
  canvas.width = canvas.height = SIZE;
  Object.assign(canvas.style, {
    display: 'block', cursor: 'grab',
    borderRadius: '50%', touchAction: 'none', userSelect: 'none',
    boxShadow: '0 0 0 1px rgba(230,232,240,0.18)',
  });

  const lbl = document.createElement('div');
  Object.assign(lbl.style, {
    fontSize: '8px', fontFamily: '"DM Mono", monospace',
    color: 'rgba(230,232,240,0.55)', textAlign: 'left',
    minHeight: '10px', letterSpacing: '0.03em',
  });

  wrap.appendChild(canvas);
  wrap.appendChild(lbl);

  // ---- widget ----
  const widget = document.createElement('div');
  widget.id = 'radio-widget';
  Object.assign(widget.style, {
    position: 'fixed', left: '270px', bottom: '16px', zIndex: '900',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 10px',
    height: '40px', boxSizing: 'border-box',
    background: 'rgba(14,17,26,0.45)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(230,232,240,0.14)',
    borderRadius: '10px',
    cursor: 'pointer',
    pointerEvents: 'auto', userSelect: 'none',
  });
  widget.appendChild(radioBtn);
  widget.addEventListener('mouseenter', brightBtn);
  widget.addEventListener('mouseleave', dimBtn);
  document.body.appendChild(widget);
  document.body.appendChild(wrap);

  const ctx2 = canvas.getContext('2d');

  // ---- render ----
  function renderFrame() {
    renderWireframe(ctx2, rotMat);

    ctx2.save();
    ctx2.beginPath();
    ctx2.arc(CX, CY, R, 0, Math.PI * 2);
    ctx2.clip();

    const sorted = STATIONS
      .map((s, i) => ({ s, i, pt: project(s.lat, s.lon, rotMat) }))
      .sort((a, b) => a.pt.z - b.pt.z);

    for (const { s, i, pt } of sorted) {
      if (pt.z < -0.1) continue;
      const { sx, sy } = toScreen(pt);
      const depth    = Math.max(0, pt.z);
      const isActive = i === activeIdx;

      if (isActive) {
        const ring = 6.5 + 2 * Math.sin(pulse * 0.09);
        ctx2.beginPath();
        ctx2.arc(sx, sy, ring, 0, Math.PI * 2);
        ctx2.strokeStyle = `rgba(255,255,255,${(0.28 * depth).toFixed(2)})`;
        ctx2.lineWidth   = 1;
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(255,255,255,${(0.4 + 0.6 * depth).toFixed(2)})`;
        ctx2.fill();
      } else {
        ctx2.beginPath();
        ctx2.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(230,232,240,${(0.2 + 0.6 * depth).toFixed(2)})`;
        ctx2.fill();
      }

      if (pt.z > 0.20) {
        ctx2.font         = `bold 6px "DM Mono", monospace`;
        ctx2.fillStyle    = `rgba(230,232,240,${(depth * 0.80).toFixed(2)})`;
        ctx2.textAlign    = 'center';
        ctx2.textBaseline = 'top';
        ctx2.fillText(s.name, sx, sy + 5.5);
      }
    }
    ctx2.restore();
  }

  // ---- RAF tick ----
  function tick() {
    pulse++;

    if (phase === 'coast') {
      rotMat = mulMat(mRotX(velX), mulMat(mRotY(velY), rotMat));
      velX *= 0.88;
      velY *= 0.88;
      if (Math.hypot(velX, velY) < 0.003) beginSnap();
    } else if (phase === 'snap') {
      const pt = project(STATIONS[snapIdx].lat, STATIONS[snapIdx].lon, rotMat);
      const dX =  Math.atan2(pt.y, pt.z) * 0.14;
      const dY = -Math.atan2(pt.x, pt.z) * 0.14;
      rotMat = mulMat(mRotX(dX), mulMat(mRotY(dY), rotMat));
      if (Math.abs(dX) < 0.001 && Math.abs(dY) < 0.001) {
        phase = 'idle';
        if (snapIdx !== activeIdx) { activeIdx = snapIdx; playStation(snapIdx); }
      }
    }

    // Re-orthonormalize every 60 frames to prevent float drift
    if (++normCounter >= 60) { rotMat = orthonorm(rotMat); normCounter = 0; }

    renderFrame();
    rafId = requestAnimationFrame(tick);
  }

  function beginSnap() {
    phase = 'snap';
    snapIdx = nearestFront();
  }

  function nearestFront() {
    let best = 0, bestZ = -Infinity;
    STATIONS.forEach((s, i) => {
      const z = project(s.lat, s.lon, rotMat).z;
      if (z > bestZ) { bestZ = z; best = i; }
    });
    return best;
  }

  // ---- mouse drag ----
  canvas.addEventListener('mousedown', e => {
    dragging = true;
    lastDragX = e.clientX; lastDragY = e.clientY;
    velX = 0; velY = 0; phase = 'drag';
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    velY = (e.clientX - lastDragX) * 0.014;
    velX = (e.clientY - lastDragY) * 0.014;
    rotMat = mulMat(mRotX(velX), mulMat(mRotY(velY), rotMat));
    lastDragX = e.clientX; lastDragY = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false; canvas.style.cursor = 'grab';
    if (phase === 'drag') phase = 'coast';
  });

  // ---- touch drag ----
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    dragging = true;
    lastDragX = e.touches[0].clientX; lastDragY = e.touches[0].clientY;
    velX = 0; velY = 0; phase = 'drag';
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!dragging) return;
    velY = (e.touches[0].clientX - lastDragX) * 0.014;
    velX = (e.touches[0].clientY - lastDragY) * 0.014;
    rotMat = mulMat(mRotX(velX), mulMat(mRotY(velY), rotMat));
    lastDragX = e.touches[0].clientX; lastDragY = e.touches[0].clientY;
  }, { passive: false });
  canvas.addEventListener('touchend', () => {
    dragging = false;
    if (phase === 'drag') phase = 'coast';
  });

  // ---- playback ----
  function playStation(idx) {
    const s = STATIONS[idx];
    lbl.textContent = `${s.name}  ·  ${s.city}`;
    window.__MUSIC_API?.setStream?.(s.url, `${s.name} · ${s.city}`);
  }

  // ---- toggle ----
  widget.addEventListener('click', () => {
    radioActive = !radioActive;
    _txtSpan.textContent = radioActive ? 'radio ✓' : 'radio';
    dimBtn();
    wrap.style.display = radioActive ? 'flex' : 'none';

    if (radioActive) {
      const somaIdx = STATIONS.findIndex(s => s.name === 'Soma');
      const s = STATIONS[somaIdx >= 0 ? somaIdx : 0];
      rotMat = rotMatToFront(s.lat, s.lon);
      activeIdx = somaIdx >= 0 ? somaIdx : 0;
      playStation(activeIdx);
      velY   = 0.006;
      velX   = 0;
      phase  = 'coast';
      rafId  = requestAnimationFrame(tick);
    } else {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      activeIdx = -1; lbl.textContent = '';
      window.__MUSIC_API?.stopStream?.();
    }
  });
}
