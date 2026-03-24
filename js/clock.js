// clock.js — ClockSource (canvas mask) + settings panel + alarm + nature sounds

/* ================================================================
   ClockSource — renders a clock onto an offscreen canvas each RAF
   White text on black bg → bright pixels pass the silhouette threshold
   ================================================================ */
export class ClockSource {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._ctx = this.canvas.getContext('2d');

    // Settings (set these before start())
    this.timezone  = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.use12hr   = true;
    this.fontIdx   = 0;
    this.FONTS = [
      '"DM Mono", monospace',
      'Georgia, serif',
      '"Courier New", Courier, monospace',
      '"Times New Roman", Times, serif',
      '"Arial Narrow", Arial, sans-serif',
    ];

    this.alarmEnabled = false;
    this.alarmTime    = '07:00';  // HH:MM 24-hr string
    this.alarmSound   = 'rain';
    this._alarmFired  = false;
    this._alarmAudio  = null;

    this._running = false;
    this._rafId   = null;

    this._onResize = () => {
      this.canvas.width  = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', this._onResize);
  }

  start() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      if (!this._running) return;
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this.stopAlarm();
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
  }

  cycleFont() { this.fontIdx = (this.fontIdx + 1) % this.FONTS.length; }

  resetAlarm() { this._alarmFired = false; this.stopAlarm(); }

  // ---- rendering ----
  _getNow() {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: this.timezone,
        hour: 'numeric', minute: '2-digit', second: '2-digit',
        hour12: this.use12hr,
      }).formatToParts(now);
      const get = (t) => parts.find(p => p.type === t)?.value ?? '';
      // Also grab 24-hr hours for alarm matching
      const p24 = new Intl.DateTimeFormat('en-US', {
        timeZone: this.timezone,
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(now);
      const get24 = (t) => p24.find(p => p.type === t)?.value ?? '00';
      return {
        hour: get('hour'),
        minute: get('minute'),
        second: get('second'),
        ampm: get('dayPeriod'),
        hour24: get24('hour'),
        minute24: get24('minute'),
      };
    } catch {
      return { hour: '12', minute: '00', second: '00', ampm: 'AM', hour24: '00', minute24: '00' };
    }
  }

  _render() {
    const { canvas, _ctx: ctx } = this;
    const W = canvas.width;
    const H = canvas.height;

    // White background — bright pixels = silhouette area; clock digits (black) punch through
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const t = this._getNow();
    const font = this.FONTS[this.fontIdx];

    // Main time — larger, centered, with AM/PM inline when 12hr
    const mainSize = Math.min(W * 0.28, H * 0.38);
    ctx.fillStyle    = '#000000';
    ctx.font         = `bold ${mainSize}px ${font}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const timeStr = this.use12hr
      ? `${t.hour}:${t.minute} ${t.ampm}`
      : `${t.hour}:${t.minute}`;
    ctx.fillText(timeStr, W / 2, H / 2);

    // Alarm check (compare 24-hr H:M)
    if (this.alarmEnabled && !this._alarmFired) {
      const [aH, aM] = this.alarmTime.split(':');
      if (t.hour24 === aH && t.minute24 === aM) {
        this._alarmFired = true;
        this.playAlarm();
        this.onAlarmFire?.();
      }
    }
  }

  // ---- alarm sounds ----
  playAlarm(sound = this.alarmSound) {
    this.stopAlarm();
    this._alarmAudio = _createNatureSound(sound);
  }

  stopAlarm() {
    if (this._alarmAudio) {
      try { this._alarmAudio.stop(); } catch {}
      this._alarmAudio = null;
    }
  }
}

/* ================================================================
   Nature sound synthesis
   ================================================================ */
function _createNatureSound(type) {
  let ac;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return { stop() {} }; }

  if (type === 'rain') {
    const len = ac.sampleRate * 4;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src = ac.createBufferSource();
    src.buffer = buf; src.loop = true;

    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;

    const gain = ac.createGain();
    gain.gain.value = 0.25;

    src.connect(lp); lp.connect(gain); gain.connect(ac.destination);
    src.start();
    return { stop() { try { src.stop(); ac.close(); } catch {} } };
  }

  if (type === 'birds') {
    const freqs = [660, 880, 1100, 1320, 1760];
    let alive = true;
    const chirp = () => {
      if (!alive || ac.state === 'closed') return;
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
      gain.gain.setValueAtTime(0, ac.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + 0.5);
    };
    chirp();
    // Use recursive setTimeout for varied intervals
    let _birdTimer = null;
    const scheduleNext = () => {
      _birdTimer = setTimeout(() => {
        if (!alive) return;
        chirp();
        scheduleNext();
      }, 350 + Math.random() * 550);
    };
    scheduleNext();
    return { stop() { alive = false; clearTimeout(_birdTimer); try { ac.close(); } catch {} } };
  }

  if (type === 'chime') {
    let alive = true;
    const scale = [523.25, 659.25, 783.99, 1046.5];
    const ring = () => {
      if (!alive || ac.state === 'closed') return;
      scale.forEach((f, i) => {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        const t = ac.currentTime + i * 0.22;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.8);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(t); osc.stop(t + 3);
      });
    };
    ring();
    const iv = setInterval(() => { if (!alive) { clearInterval(iv); return; } ring(); }, 4200);
    return { stop() { alive = false; clearInterval(iv); try { ac.close(); } catch {} } };
  }

  return { stop() {} };
}

/* ================================================================
   initClockMode — inserts clock button above draw button on desktop
   getSharedPlaylist: () => sharedPlaylist
   ================================================================ */
export function initClockMode(getSharedPlaylist) {
  if (window.innerWidth <= 1300) return;

  const container = document.getElementById('draw-mode-container');
  const drawToggle = document.getElementById('draw-mode-toggle');
  if (!container || !drawToggle) return;

  // ---- persistent settings ----
  const settings = {
    timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
    use12hr:      true,
    fontIdx:      0,
    alarmEnabled: false,
    alarmTime:    '07:00',
    alarmSound:   'rain',
  };

  let clockActive = false;
  let clockSource = null;
  let _savedState = null;

  // ---- helpers ----
  const btnStyle = (el) => Object.assign(el.style, {
    background: 'transparent', border: 'none',
    color: 'rgba(230,232,240,0.5)', fontSize: '9px',
    fontFamily: '"DM Mono", monospace', cursor: 'pointer',
    padding: '0', textAlign: 'right', whiteSpace: 'nowrap',
    lineHeight: '1.2', transition: 'color 150ms ease',
    alignSelf: 'flex-end',
  });
  const hoverOn  = (el) => el.addEventListener('mouseenter', () => el.style.color = 'rgba(230,232,240,0.85)');
  const hoverOff = (el) => el.addEventListener('mouseleave', () => el.style.color = el._dim || 'rgba(230,232,240,0.5)');

  // ---- clock toggle button ----
  const clockBtn = document.createElement('div');
  clockBtn.id = 'clock-mode-toggle';
  clockBtn.textContent = 'clock';
  clockBtn.title = 'Clock mode';
  btnStyle(clockBtn);
  hoverOn(clockBtn); hoverOff(clockBtn);

  // ---- settings panel (hidden by default) ----
  const panel = _buildPanel(settings, () => {
    if (clockSource) _applySettings(clockSource, settings);
  });

  // Insert: [clockBtn][panel][drawToggle][drawControls]
  container.insertBefore(panel, drawToggle);
  container.insertBefore(clockBtn, panel);

  // ---- toggle logic ----
  clockBtn.addEventListener('click', () => {
    clockActive = !clockActive;
    clockBtn.textContent = clockActive ? 'clock ✓' : 'clock';
    clockBtn.style.color = clockActive ? 'rgba(230,232,240,0.85)' : 'rgba(230,232,240,0.5)';
    panel.style.display  = clockActive ? 'flex' : 'none';

    const pl = getSharedPlaylist();
    if (!pl) return;

    if (clockActive) {
      // Save current video state
      _savedState = {
        vidEl: pl.vidEl, vidW: pl.vidW, vidH: pl.vidH, loaded: pl.loaded,
      };
      // Try to pause existing video cleanly
      try { pl.vidEl?.pause?.(); } catch {}

      // Create + start ClockSource
      clockSource = new ClockSource();
      _applySettings(clockSource, settings);
      clockSource.onAlarmFire = () => panel._showStopBtn?.();
      clockSource.start();
      window.__clockSource = clockSource;

      // Inject canvas as mask source
      pl.vidEl   = clockSource.canvas;
      pl.vidW    = clockSource.canvas.width;
      pl.vidH    = clockSource.canvas.height;
      pl.loaded  = true;
      pl.maskData = null;

    } else {
      // Stop clock
      if (clockSource) { clockSource.dispose(); clockSource = null; }
      window.__clockSource = null;

      // Restore original video
      if (_savedState && pl) {
        pl.vidEl   = _savedState.vidEl;
        pl.vidW    = _savedState.vidW;
        pl.vidH    = _savedState.vidH;
        pl.loaded  = _savedState.loaded;
        pl.maskData = null;
        try { _savedState.vidEl?.play?.(); } catch {}
        _savedState = null;
      }
    }
  });

  // Respond to window resize — update canvas size in playlist
  window.addEventListener('resize', () => {
    if (!clockActive || !clockSource) return;
    const pl = getSharedPlaylist();
    if (pl && pl.vidEl === clockSource.canvas) {
      pl.vidW  = clockSource.canvas.width;
      pl.vidH  = clockSource.canvas.height;
      pl.maskData = null;
    }
  });
}

// Apply settings object to a ClockSource instance
function _applySettings(src, s) {
  src.timezone     = s.timezone;
  src.use12hr      = s.use12hr;
  src.fontIdx      = s.fontIdx;
  src.alarmEnabled = s.alarmEnabled;
  src.alarmTime    = s.alarmTime;
  src.alarmSound   = s.alarmSound;
  src.resetAlarm();
}

/* ================================================================
   Settings panel DOM builder
   ================================================================ */
function _buildPanel(settings, onChange) {
  const panel = document.createElement('div');
  panel.id = 'clock-settings-panel';
  Object.assign(panel.style, {
    display: 'none',   // shown when clock active
    flexDirection: 'column',
    gap: '5px',
    alignItems: 'flex-end',
    paddingBottom: '4px',
  });

  const row = (children) => {
    const r = document.createElement('div');
    Object.assign(r.style, { display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' });
    children.forEach(c => r.appendChild(c));
    return r;
  };

  const label = (text) => {
    const l = document.createElement('span');
    l.textContent = text;
    Object.assign(l.style, {
      fontSize: '8px', fontFamily: '"DM Mono", monospace',
      color: 'rgba(230,232,240,0.4)', whiteSpace: 'nowrap',
    });
    return l;
  };

  const textInput = (val, w = '90px') => {
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = val;
    Object.assign(inp.style, {
      background: 'rgba(14,17,26,0.7)', border: '1px solid rgba(230,232,240,0.2)',
      borderRadius: '4px', color: 'rgba(230,232,240,0.8)',
      fontSize: '8px', fontFamily: '"DM Mono", monospace',
      padding: '2px 5px', width: w, outline: 'none',
    });
    return inp;
  };

  const smallBtn = (text, onClick) => {
    const b = document.createElement('div');
    b.textContent = text;
    Object.assign(b.style, {
      fontSize: '8px', fontFamily: '"DM Mono", monospace',
      color: 'rgba(230,232,240,0.5)', cursor: 'pointer',
      transition: 'color 150ms ease', whiteSpace: 'nowrap',
    });
    b.addEventListener('mouseenter', () => b.style.color = 'rgba(230,232,240,0.9)');
    b.addEventListener('mouseleave', () => b.style.color = 'rgba(230,232,240,0.5)');
    b.addEventListener('click', onClick);
    return b;
  };

  // Timezone row
  const tzInput = textInput(settings.timezone, '120px');
  tzInput.addEventListener('change', () => { settings.timezone = tzInput.value.trim(); onChange(); });
  panel.appendChild(row([label('tz'), tzInput]));

  // 12hr toggle
  const hrToggle = smallBtn(settings.use12hr ? '12hr' : '24hr', () => {
    settings.use12hr = !settings.use12hr;
    hrToggle.textContent = settings.use12hr ? '12hr' : '24hr';
    onChange();
  });
  panel.appendChild(row([hrToggle]));

  // Font cycle
  const fontNames = ['DM Mono', 'Georgia', 'Courier', 'Times', 'Arial N.'];
  const fontBtn = smallBtn(`font: ${fontNames[settings.fontIdx]}`, () => {
    settings.fontIdx = (settings.fontIdx + 1) % fontNames.length;
    fontBtn.textContent = `font: ${fontNames[settings.fontIdx]}`;
    onChange();
  });
  panel.appendChild(row([fontBtn]));

  // Alarm enable
  const alarmToggle = smallBtn(settings.alarmEnabled ? 'alarm: on' : 'alarm: off', () => {
    settings.alarmEnabled = !settings.alarmEnabled;
    alarmToggle.textContent = settings.alarmEnabled ? 'alarm: on' : 'alarm: off';
    timeRow.style.display  = settings.alarmEnabled ? 'flex' : 'none';
    soundRow.style.display = settings.alarmEnabled ? 'flex' : 'none';
    onChange();
  });
  panel.appendChild(row([alarmToggle]));

  // Alarm time — 12hr input + AM/PM toggle, stored internally as 24hr HH:MM
  const _to12 = (h24mm) => {
    const [h, m] = h24mm.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return { display: `${h12}:${String(m).padStart(2,'0')}`, ampm };
  };
  const _to24 = (h12str, ampm) => {
    const [h, m] = h12str.split(':').map(Number);
    let h24 = h % 12;
    if (ampm === 'PM') h24 += 12;
    return `${String(h24).padStart(2,'0')}:${String(m || 0).padStart(2,'0')}`;
  };

  const init12 = _to12(settings.alarmTime);
  const timeInp = textInput(init12.display, '42px');
  timeInp.placeholder = '7:00';
  timeInp.title = '12-hour format H:MM';

  let _alarmAmpm = init12.ampm;
  const ampmBtn = smallBtn(_alarmAmpm, () => {
    _alarmAmpm = _alarmAmpm === 'AM' ? 'PM' : 'AM';
    ampmBtn.textContent = _alarmAmpm;
    settings.alarmTime = _to24(timeInp.value.trim(), _alarmAmpm);
    onChange();
  });

  timeInp.addEventListener('change', () => {
    settings.alarmTime = _to24(timeInp.value.trim(), _alarmAmpm);
    onChange();
  });

  const timeRow = row([label('time'), timeInp, ampmBtn]);
  timeRow.style.display = settings.alarmEnabled ? 'flex' : 'none';
  panel.appendChild(timeRow);

  // Sound selector + test
  const SOUNDS = ['rain', 'birds', 'chime'];
  let soundIdx = SOUNDS.indexOf(settings.alarmSound);
  const soundBtn  = smallBtn(`♪ ${settings.alarmSound}`, () => {
    soundIdx = (soundIdx + 1) % SOUNDS.length;
    settings.alarmSound = SOUNDS[soundIdx];
    soundBtn.textContent = `♪ ${settings.alarmSound}`;
    onChange();
  });
  let _testAudio = null;
  const testBtn = smallBtn('test', () => {
    if (_testAudio) { try { _testAudio.stop(); } catch {} _testAudio = null; }
    _testAudio = _createNatureSound(settings.alarmSound);
    setTimeout(() => { if (_testAudio) { try { _testAudio.stop(); } catch {} _testAudio = null; } }, 4000);
  });
  const soundRow = row([soundBtn, testBtn]);
  soundRow.style.display = settings.alarmEnabled ? 'flex' : 'none';
  panel.appendChild(soundRow);

  // Stop alarm button (only visible when alarm fires)
  const stopBtn = smallBtn('stop alarm', () => {
    if (window.__clockSource) window.__clockSource.stopAlarm();
    stopRow.style.display = 'none';
  });
  const stopRow = row([stopBtn]);
  stopRow.style.display = 'none';
  panel.appendChild(stopRow);

  // Expose a way for ClockSource to reveal the stop button
  panel._showStopBtn = () => { stopRow.style.display = 'flex'; };

  return panel;
}
