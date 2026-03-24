// games.js — ASCII arcade: Pong · Snake · Brick Breaker

const BG   = '#080810';
const FG   = '#e6e8f0';
const DIM  = 'rgba(230,232,240,0.28)';
const FONT = '"DM Mono", monospace';
const GOLD = 'rgba(255,210,70,0.9)';
const CYAN = 'rgba(100,210,255,0.9)';
const RED  = 'rgba(255,80,80,0.9)';
const PURP = 'rgba(200,80,255,0.9)';

// ── Asteroid shapes ───────────────────────────────────────────────
const ASTEROID_SHAPES = [
  { rows: ['   @@@@@   ',' @@@@@@@@@ ','@@@@@@@@@@@','@@@@@@@@@@@',' @@@@@@@@@ ','  @@@@@@@  ','   @@@@@   '], r: 52 },
  { rows: ['    ###    ','  #######  ',' ######### ','###########',' ######### ','  #######  ','    ###    ','    ###    ','     #     '], r: 58 },
  { rows: ['  %%%%%    ',' %%%%%%%%  ','%%%%%%%%%%',' %%%%%%%%%','  %%%%%%  ','   %%%%   ','    %%    '], r: 50 },
  { rows: ['    **     ','  ******   ',' ********* ','***********',' ********* ','  ******   ','    **     '], r: 52 },
];

// ── High scores (localStorage) ───────────────────────────────────
const HS = {
  _k: 'ej_hiscores_v1',
  load()  { try { return JSON.parse(localStorage.getItem(this._k)) || {pong:[],snake:[],brkr:[]}; } catch { return {pong:[],snake:[],brkr:[]}; } },
  save(d) { try { localStorage.setItem(this._k, JSON.stringify(d)); } catch {} },
  add(game, name, score) {
    const d = this.load();
    if (!d[game]) d[game] = [];
    const n = (name.toUpperCase() + '_____').slice(0,5);
    d[game].push({ n, s: Math.round(score) });
    d[game].sort((a,b) => b.s - a.s);
    d[game] = d[game].slice(0,10);
    this.save(d);
    return d[game];
  },
  get(game) { return (this.load()[game] || []); },
};

// ── Brick level definitions ───────────────────────────────────────
const THEMES = {
  elephant: {
    brickColor: (hp,max) => `rgba(170,205,230,${(0.32 + hp/max*0.68).toFixed(2)})`,
    ironColor:  'rgba(140,175,210,0.2)',
    ironChar:   '═══',
    puW: GOLD, puS: CYAN,
    titleColor: 'rgba(170,205,230,0.9)',
  },
  mandrill: {
    brickColor: (hp,max) => `rgba(245,185,80,${(0.32 + hp/max*0.68).toFixed(2)})`,
    ironColor:  'rgba(210,145,55,0.2)',
    ironChar:   '▪▪▪',
    puW: 'rgba(255,120,80,0.9)', puS: 'rgba(110,230,130,0.9)',
    titleColor: 'rgba(245,185,80,0.9)',
  },
  horse: {
    brickColor: (hp,max) => `rgba(215,205,255,${(0.32 + hp/max*0.68).toFixed(2)})`,
    ironColor:  'rgba(175,165,235,0.2)',
    ironChar:   '╬╬╬',
    puW: 'rgba(200,145,255,0.9)', puS: 'rgba(90,230,255,0.9)',
    titleColor: 'rgba(215,205,255,0.9)',
  },
};

const ELEPHANT_MAP_1 = [
  [ 0,  0,  0,  1,  1,  1,  1,  1,  1,  0,  0,  0],
  [ 0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0],
  [ 0,  1,  1,  1, 'W', 1,  1, 'W', 1,  1,  1,  0],
  [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
  [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
  [ 0,  1,  1,  1, 'S', 1,  1, 'S', 1,  1,  1,  0],
  [ 0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0],
  [ 0,  0,  0,  1,  1,  1,  1,  1,  1,  0,  0,  0],
];
const ELEPHANT_MAP_2 = [
  [ 0,  0, 'U','U', 1,  1,  1,  1, 'U','U', 0,  0],
  [ 0, 'U', 1,  1,  1,  1,  1,  1,  1,  1, 'U', 0],
  ['U', 1,  1, 'W', 1,  2,  2,  1, 'W', 1,  1, 'U'],
  [ 1,  1,  2,  1,  1,  1,  1,  1,  1,  2,  1,  1],
  [ 1,  1,  1,  1,  1,  2,  2,  1,  1,  1,  1,  1],
  [ 0, 'U', 1,  1,  1, 'S','S', 1,  1,  1, 'U', 0],
  [ 0,  0, 'U', 1,  1,  1,  1,  1,  1, 'U', 0,  0],
  [ 0,  0,  0, 'U','U', 0,  0, 'U','U', 0,  0,  0],
];
const MANDRILL_MAP = [
  [ 0, 'U', 1,  2,  1,  2,  2,  1,  2,  1, 'U', 0],
  ['U', 2,  1,  1,  2,  1,  1,  2,  1,  1,  2, 'U'],
  [ 1,  1,  2, 'W', 1,  2,  2,  1, 'W', 2,  1,  1],
  [ 2,  1,  1,  2,  3,  1,  1,  3,  2,  1,  1,  2],
  [ 1,  2,  3,  1,  1,  3,  3,  1,  1,  3,  2,  1],
  [ 2,  1,  1,  2, 'S', 1,  1, 'S', 2,  1,  1,  2],
  [ 1,  2,  1,  1,  2,  2,  2,  2,  1,  1,  2,  1],
  ['U', 1,  2,  2,  1,  1,  1,  1,  2,  2,  1, 'U'],
];
const HORSE_MAP_1 = [
  ['U', 2,  3, 'U', 0,  0,  0,  0, 'U', 3,  2, 'U'],
  [ 2,  3,  2,  3, 'U', 0,  0, 'U', 3,  2,  3,  2],
  [ 3,  2, 'U', 2,  3, 'U','U', 3,  2, 'U', 2,  3],
  ['U', 3,  2, 'U', 2,  3,  3,  2, 'U', 2,  3, 'U'],
  [ 2, 'U', 3,  2, 'W', 2,  2, 'W', 2,  3, 'U', 2],
  [ 3,  2,  2,  3,  2, 'U','U', 2,  3,  2,  2,  3],
  ['U', 3, 'U', 2,  3,  2,  2,  3,  2, 'U', 3, 'U'],
  [ 2,  2,  3, 'U', 2,  3,  3,  2, 'U', 3,  2,  2],
];
const HORSE_MAP_2 = [
  ['U','U', 3, 'U', 3,  3,  3,  3, 'U', 3, 'U','U'],
  ['U', 3, 'U', 3,  3, 'U','U', 3,  3, 'U', 3, 'U'],
  [ 3, 'U', 3,  3, 'S', 3,  3, 'S', 3,  3, 'U', 3],
  ['U', 3,  3, 'U', 3,  3,  3,  3, 'U', 3,  3, 'U'],
  [ 3,  3, 'U', 3,  3, 'W','W', 3,  3, 'U', 3,  3],
  ['U', 3,  3,  3, 'U', 3,  3, 'U', 3,  3,  3, 'U'],
  [ 3, 'U', 3, 'U', 3,  3,  3,  3, 'U', 3, 'U', 3],
  ['U', 3, 'U', 3,  3, 'U','U', 3,  3, 'U', 3, 'U'],
  ['U','U', 3,  3,  3,  3,  3,  3,  3,  3, 'U','U'],
];

const BRICK_LEVELS = [
  { id:1, label:'I   elephant',   theme:'elephant', map:ELEPHANT_MAP_1, paddleW:155, speed:5.5,  mult:1   },
  { id:2, label:'II  elephant',   theme:'elephant', map:ELEPHANT_MAP_2, paddleW:130, speed:6.5,  mult:1.5 },
  { id:3, label:'III mandrill',   theme:'mandrill', map:MANDRILL_MAP,   paddleW:110, speed:7.8,  mult:2   },
  { id:4, label:'IV  horse',      theme:'horse',    map:HORSE_MAP_1,    paddleW:90,  speed:9.5,  mult:3   },
  { id:5, label:'V   horse',      theme:'horse',    map:HORSE_MAP_2,    paddleW:75,  speed:11.5, mult:4   },
];

// ── Helpers ───────────────────────────────────────────────────────
function clearBg(ctx) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawHints(ctx, text) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.save();
  ctx.font = `9px ${FONT}`; ctx.fillStyle = DIM;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText(text, cw / 2, ch - 52); // above close btn area
  ctx.restore();
}

function drawNameEntry(ctx, buffer, finalScore, gameLabel) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = FG; ctx.font = `14px ${FONT}`;
  ctx.fillText(`${gameLabel} cleared!`, cw/2, ch/2 - 80);
  ctx.fillStyle = GOLD; ctx.font = `11px ${FONT}`;
  ctx.fillText(`score: ${finalScore}`, cw/2, ch/2 - 56);
  ctx.fillStyle = DIM; ctx.font = `9px ${FONT}`;
  ctx.fillText('enter your name for the leaderboard (5 chars)', cw/2, ch/2 - 28);
  // slots
  const slotW = 26, gap = 8, totalW = 5*slotW + 4*gap;
  const sx = cw/2 - totalW/2;
  for (let i = 0; i < 5; i++) {
    const x = sx + i*(slotW+gap);
    ctx.strokeStyle = i < buffer.length ? FG : 'rgba(230,232,240,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, ch/2 - 8, slotW, 22);
    if (i < buffer.length) {
      ctx.fillStyle = FG; ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(buffer[i], x + slotW/2, ch/2 + 4);
    }
  }
  ctx.fillStyle = DIM; ctx.font = `9px ${FONT}`;
  ctx.fillText('ENTER to confirm  ·  BACKSPACE to delete', cw/2, ch/2 + 36);
  ctx.restore();
}

// ── PONG ─────────────────────────────────────────────────────────
class PongGame {
  constructor(ctx, canvas) {
    this.ctx = ctx; this.canvas = canvas;
    this.rafId = null; this.running = false;
    this.difficulty = 5; this.showDiffSelect = true;
    this.score = [0,0];
    this.paddleH = 80; this.paddleW = 10;
    this._upHeld = false; this._downHeld = false;
    this.mouseX = canvas.width/2; this.mouseY = canvas.height/2;
    this.asteroids = []; this.comets = [];
    this._cometTimer = 0; this._cometInterval = 500 + Math.random()*400;
    this._enteringName = false; this._nameBuffer = '';
    this._finalScore = 0;
  }

  start() {
    this.running = true; this.showDiffSelect = true; this.score = [0,0];
    this._enteringName = false; this._nameBuffer = '';
    this._bindKeys(); this._loop();
  }
  stop() { this.running = false; cancelAnimationFrame(this.rafId); this._unbindKeys(); }

  _initAsteroids() {
    const cw = this.canvas.width, ch = this.canvas.height;
    const count = this.difficulty <= 6 ? 2 : 3;
    this.asteroids = Array.from({length: count}, (_,i) => {
      const angle = Math.random()*Math.PI*2, spd = 0.6+Math.random()*0.7;
      const shape = ASTEROID_SHAPES[i % ASTEROID_SHAPES.length];
      return { x: cw*0.25+Math.random()*cw*0.5, y: ch*0.1+Math.random()*ch*0.8,
               dx: Math.cos(angle)*spd, dy: Math.sin(angle)*spd, r: shape.r, shapeIdx: i%4 };
    });
  }

  _reset() {
    const cw = this.canvas.width, ch = this.canvas.height;
    this.px = 28; this.py = ch/2 - this.paddleH/2;
    this.cx = cw - 28 - this.paddleW; this.cy = ch/2 - this.paddleH/2;
    const angle = (Math.random()*0.5-0.25) + (Math.random()>0.5?0:Math.PI);
    const spd = 4.5 + this.difficulty*0.75;
    this.bx = cw/2; this.by = ch/2;
    this.bdx = Math.cos(angle)*spd; this.bdy = Math.sin(angle)*spd;
    this._initAsteroids();
  }

  _bindKeys() {
    this._onKey = (e) => {
      if (this._enteringName) { this._handleNameKey(e); return; }
      if (e.key==='ArrowUp')   { this._upHeld   = true; e.preventDefault(); }
      if (e.key==='ArrowDown') { this._downHeld  = true; e.preventDefault(); }
      if (this.showDiffSelect) {
        const n = e.key==='0' ? 10 : parseInt(e.key);
        if (n>=1 && n<=10) { this.difficulty = n; this._startMatch(); }
        if (e.key==='Enter') this._startMatch();
      }
    };
    this._onKeyUp = (e) => {
      if (e.key==='ArrowUp')   this._upHeld   = false;
      if (e.key==='ArrowDown') this._downHeld = false;
    };
    this._onMouse = (e) => { this.mouseY = e.clientY; this.mouseX = e.clientX; };
    this._onClick = (e) => {
      if (this._enteringName || !this.showDiffSelect) return;
      const cw = this.canvas.width, ch = this.canvas.height;
      for (let i=1; i<=10; i++) {
        const x = cw/2-135+(i-1)*28;
        if (Math.abs(e.clientX-x)<14 && Math.abs(e.clientY-(ch/2-14))<14) {
          this.difficulty = i; this._startMatch(); return;
        }
      }
      this._startMatch();
    };
    window.addEventListener('keydown',   this._onKey);
    window.addEventListener('keyup',     this._onKeyUp);
    window.addEventListener('mousemove', this._onMouse);
    this._clickTimer = setTimeout(() => window.addEventListener('click', this._onClick), 120);
  }

  _unbindKeys() {
    clearTimeout(this._clickTimer);
    window.removeEventListener('keydown',   this._onKey);
    window.removeEventListener('keyup',     this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouse);
    window.removeEventListener('click',     this._onClick);
  }

  _handleNameKey(e) {
    if (e.key==='Backspace') { this._nameBuffer = this._nameBuffer.slice(0,-1); return; }
    if (e.key==='Enter' && this._nameBuffer.length>0) {
      HS.add('pong', this._nameBuffer, this._finalScore);
      this._enteringName = false;
      window._refreshScoresPanel && window._refreshScoresPanel();
      return;
    }
    if (this._nameBuffer.length < 5 && /^[a-zA-Z0-9]$/.test(e.key)) {
      this._nameBuffer += e.key.toUpperCase();
      if (this._nameBuffer.length === 5) { /* auto-confirm on 5th char via Enter */ }
    }
  }

  _startMatch() { this.showDiffSelect = false; this._reset(); }

  _update() {
    if (this.showDiffSelect || this._enteringName) return;
    const cw = this.canvas.width, ch = this.canvas.height;
    const kd = (this._upHeld?-1:0)+(this._downHeld?1:0);
    this.py += kd!==0 ? kd*9 : (this.mouseY-this.paddleH/2-this.py)*0.22;
    this.py = Math.max(0, Math.min(ch-this.paddleH, this.py));
    const cpuSpd = 2.0+this.difficulty*0.72;
    this.cy += Math.sign((this.by-this.paddleH/2)-this.cy)*Math.min(Math.abs((this.by-this.paddleH/2)-this.cy),cpuSpd);
    this.cy = Math.max(0, Math.min(ch-this.paddleH, this.cy));
    // asteroids
    for (const a of this.asteroids) {
      a.x+=a.dx; a.y+=a.dy;
      if (a.x-a.r<90||a.x+a.r>cw-90) a.dx*=-1;
      if (a.y-a.r<0||a.y+a.r>ch)     a.dy*=-1;
      const d=Math.hypot(this.bx-a.x,this.by-a.y);
      if (d<a.r+7) {
        const nx=(this.bx-a.x)/d, ny=(this.by-a.y)/d;
        const dot=this.bdx*nx+this.bdy*ny;
        this.bdx-=2*dot*nx; this.bdy-=2*dot*ny;
        this.bx=a.x+nx*(a.r+8); this.by=a.y+ny*(a.r+8);
      }
    }
    // comets
    this._cometTimer++;
    if (this._cometTimer>=this._cometInterval) {
      this._cometTimer=0; this._cometInterval=500+Math.random()*600;
      const fl=Math.random()>0.5, spd=10+Math.random()*6;
      this.comets.push({x:fl?-50:cw+50,y:ch*0.08+Math.random()*ch*0.84,dx:fl?spd:-spd,dy:(Math.random()-0.5)*4});
    }
    for (let i=this.comets.length-1;i>=0;i--) {
      const c=this.comets[i]; c.x+=c.dx; c.y+=c.dy;
      if (c.x<-100||c.x>cw+100){this.comets.splice(i,1);continue;}
      if (Math.hypot(this.bx-c.x,this.by-c.y)<18){
        this.bdx=c.dx*0.55+(Math.random()-0.5)*5;
        this.bdy=c.dy+(Math.random()-0.5)*7;
        this.comets.splice(i,1);
      }
    }
    // ball
    this.bx+=this.bdx; this.by+=this.bdy;
    if (this.by<=4||this.by>=ch-4){this.bdy*=-1;this.by=Math.max(4,Math.min(ch-4,this.by));}
    // player paddle
    if (this.bx-6<=this.px+this.paddleW&&this.bx+6>=this.px&&this.by>=this.py&&this.by<=this.py+this.paddleH&&this.bdx<0) {
      const hit=(this.by-this.py)/this.paddleH-0.5;
      const cap=8+this.difficulty*0.9, spd=Math.min(cap,Math.hypot(this.bdx,this.bdy)*1.05);
      const ang=hit*(Math.PI*0.55);
      this.bdx=Math.abs(Math.cos(ang))*spd; this.bdy=Math.sin(ang)*spd;
      this.bx=this.px+this.paddleW+8;
    }
    // cpu paddle
    if (this.bx+6>=this.cx&&this.bx-6<=this.cx+this.paddleW&&this.by>=this.cy&&this.by<=this.cy+this.paddleH&&this.bdx>0) {
      const hit=(this.by-this.cy)/this.paddleH-0.5;
      const cap=8+this.difficulty*0.9, spd=Math.min(cap,Math.hypot(this.bdx,this.bdy)*1.05);
      const ang=hit*(Math.PI*0.55);
      this.bdx=-Math.abs(Math.cos(ang))*spd; this.bdy=Math.sin(ang)*spd;
      this.bx=this.cx-8;
    }
    if (this.bx<-20) { this.score[1]++; this._reset(); }
    if (this.bx>cw+20) {
      this.score[0]++;
      if (this.score[0]>=7) {
        this._finalScore = this.difficulty*150;
        this._enteringName = true; this._nameBuffer = '';
      } else {
        this._reset();
      }
    }
  }

  _draw() {
    const ctx=this.ctx, cw=ctx.canvas.width, ch=ctx.canvas.height;
    clearBg(ctx);

    if (this._enteringName) {
      drawNameEntry(ctx, this._nameBuffer, this._finalScore, 'PONG');
      return;
    }

    if (this.showDiffSelect) {
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle=FG; ctx.font=`14px ${FONT}`;
      ctx.fillText('PONG', cw/2, ch/2-88);
      ctx.font=`9px ${FONT}`; ctx.fillStyle=DIM;
      ctx.fillText('select difficulty  ·  1–9, 0=10  ·  first to 7 wins', cw/2, ch/2-60);
      for (let i=1;i<=10;i++) {
        const x=cw/2-135+(i-1)*28;
        const isHov=Math.abs(this.mouseX-x)<13&&Math.abs(this.mouseY-(ch/2-18))<14;
        const isSel=i===this.difficulty;
        ctx.fillStyle = isSel ? FG : isHov ? 'rgba(230,232,240,0.72)' : DIM;
        ctx.font = (isSel||isHov) ? `bold 13px ${FONT}` : `10px ${FONT}`;
        ctx.fillText(String(i), x, ch/2-18);
        if (isSel) {
          ctx.fillStyle=GOLD; ctx.font=`7px ${FONT}`;
          ctx.fillText('●', x, ch/2-4);
        }
      }
      ctx.fillStyle=FG; ctx.font=`9px ${FONT}`;
      ctx.fillText(`[ lv.${this.difficulty} selected ]  click or ENTER to start`, cw/2, ch/2+18);
      ctx.fillStyle='rgba(230,232,240,0.32)'; ctx.font=`8px ${FONT}`;
      ctx.fillText('higher level = faster ball + more asteroids', cw/2, ch/2+40);
      drawHints(ctx,'↑ ↓  mouse or arrow keys · ESC close');
      return;
    }

    ctx.setLineDash([5,9]); ctx.strokeStyle=DIM; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cw/2,0); ctx.lineTo(cw/2,ch); ctx.stroke();
    ctx.setLineDash([]);

    // score — bottom-left, clear of close btn (bottom-right)
    ctx.textAlign='left'; ctx.textBaseline='bottom';
    ctx.fillStyle=FG; ctx.font=`13px ${FONT}`;
    ctx.fillText(`${this.score[0]}  –  ${this.score[1]}`, 20, ch-52);
    ctx.fillStyle=DIM; ctx.font=`8px ${FONT}`;
    ctx.fillText(`you  ·  cpu lv.${this.difficulty}  ·  first to 7`, 20, ch-38);

    // asteroids
    ctx.textAlign='center'; ctx.textBaseline='middle';
    for (const a of this.asteroids) {
      const shape=ASTEROID_SHAPES[a.shapeIdx];
      const fs=14, lineH=fs*1.25, totalH=shape.rows.length*lineH;
      ctx.font=`${fs}px ${FONT}`; ctx.fillStyle='rgba(230,232,240,0.4)';
      for (let i=0;i<shape.rows.length;i++)
        ctx.fillText(shape.rows[i], a.x, a.y-totalH/2+(i+0.5)*lineH);
    }
    // comets
    for (const c of this.comets) {
      for (let t=4;t>=0;t--) {
        ctx.fillStyle=`rgba(255,200,60,${0.75-t*0.15})`;
        ctx.font=`${11-t}px ${FONT}`;
        ctx.fillText(t===0?'*':'.', c.x-c.dx*t*0.35, c.y-c.dy*t*0.35);
      }
    }
    // paddles
    const segH=14, nSegs=Math.ceil(this.paddleH/segH);
    ctx.fillStyle=FG; ctx.font=`bold 14px ${FONT}`;
    ctx.textBaseline='top'; ctx.textAlign='left';
    for (let i=0;i<nSegs;i++) {
      ctx.fillText('|',this.px,this.py+i*segH);
      ctx.fillText('|',this.cx,this.cy+i*segH);
    }
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`14px ${FONT}`; ctx.fillStyle=FG;
    ctx.fillText('o',this.bx,this.by);

    if (this.score[0]>=7||this.score[1]>=7) {
      ctx.fillStyle=FG; ctx.font=`13px ${FONT}`;
      ctx.fillText(this.score[0]>=7?'you win':'cpu wins', cw/2, ch/2-16);
    }

    drawHints(ctx,'↑ ↓  arrow keys or mouse · ESC close');
  }

  _loop() {
    if (!this.running) return;
    this._update(); this._draw();
    this.rafId = requestAnimationFrame(()=>this._loop());
  }
}

// ── SNAKE ────────────────────────────────────────────────────────
const MONKEY_SPRITE = ['ωω','()','Jl'];
const BOSS_SPRITE   = ['▓▓▓','▓Ö▓','▓▓▓'];
const RANGER_CHAR   = 'Ψ';

class SnakeGame {
  constructor(ctx,canvas) {
    this.ctx=ctx; this.canvas=canvas;
    this.rafId=null; this.running=false;
    this.CELL=22; this.difficulty=2; this.showDiffSelect=true;
    this._mx=0; this._my=0;
    this._enteringName=false; this._nameBuffer=''; this._finalScore=0;
  }

  start() {
    this.running=true; this.showDiffSelect=true;
    this._enteringName=false; this._nameBuffer='';
    this._bindKeys(); this._lastTick=0; this._loop();
  }
  stop() { this.running=false; cancelAnimationFrame(this.rafId); this._unbindKeys(); }

  _startMatch() { this.showDiffSelect=false; this._reset(); }

  _reset() {
    const cols=Math.floor(this.canvas.width/this.CELL);
    const rows=Math.floor(this.canvas.height/this.CELL);
    this.cols=cols; this.rows=rows;
    const cx=Math.floor(cols/2), cy=Math.floor(rows/2);
    this.snake=[{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];
    this.dir={x:1,y:0}; this.nextDir={x:1,y:0};
    this.score=0; this.dead=false; this._deathMsg='';
    this._monkeyCounter=0; this._bossCounter=0; this._bulletCounter=0;
    this._rangerFireCounter=0;
    const D=this.difficulty;
    this.speed=D===1?135:D===2?110:85;
    this._monkeyEvery=D===1?6:D===2?5:4;
    const mCount=D===1?1:D===2?2:3;
    this.monkeys=[{x:1,y:1},{x:cols-3,y:rows-4},{x:cols-3,y:1}].slice(0,mCount);
    this.boss=null;
    this.rangers=[];
    this.bullets=[];
    this._placeFood();
  }

  _monkeyCells(m) {
    const c=[];
    for (let r=0;r<=2;r++) for (let cc=0;cc<=1;cc++) c.push(`${m.x+cc},${m.y+r}`);
    return c;
  }
  _bossCells(b) {
    const c=[];
    for (let r=0;r<=2;r++) for (let cc=0;cc<=2;cc++) c.push(`${b.x+cc},${b.y+r}`);
    return c;
  }

  _placeFood() {
    const occ=new Set([
      ...this.snake.map(s=>`${s.x},${s.y}`),
      ...this.monkeys.flatMap(m=>this._monkeyCells(m)),
      ...(this.boss?this._bossCells(this.boss):[]),
      ...this.rangers.map(r=>`${r.x},${r.y}`),
    ]);
    let fx,fy;
    do { fx=Math.floor(Math.random()*this.cols); fy=Math.floor(Math.random()*this.rows); }
    while (occ.has(`${fx},${fy}`));
    this.food={x:fx,y:fy};
  }

  _bindKeys() {
    const dirs={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
    this._onKey=(e)=>{
      if (this._enteringName){this._handleNameKey(e);return;}
      if (this.showDiffSelect){
        if (e.key==='1'){this.difficulty=1;this._startMatch();}
        if (e.key==='2'){this.difficulty=2;this._startMatch();}
        if (e.key==='3'){this.difficulty=3;this._startMatch();}
        if (e.key==='Enter') this._startMatch();
        return;
      }
      if (dirs[e.key]){e.preventDefault();const d=dirs[e.key];if(d.x!==-this.dir.x||d.y!==-this.dir.y)this.nextDir=d;}
      if (this.dead&&e.key==='Enter') this._reset();
    };
    this._onClick=(e)=>{
      if(this._enteringName||!this.showDiffSelect) return;
      const cw=this.canvas.width,ch=this.canvas.height,sx=cw/2-60;
      for(let i=0;i<3;i++){
        const x=sx+i*64;
        if(Math.abs(e.clientX-x)<30&&Math.abs(e.clientY-(ch/2-14))<16){this.difficulty=i+1;this._startMatch();return;}
      }
      this._startMatch();
    };
    this._onMouse=(e)=>{this._mx=e.clientX;this._my=e.clientY;};
    window.addEventListener('keydown',this._onKey);
    window.addEventListener('mousemove',this._onMouse);
    this._clickTimer=setTimeout(()=>window.addEventListener('click',this._onClick),120);
  }
  _unbindKeys(){
    clearTimeout(this._clickTimer);
    window.removeEventListener('keydown',this._onKey);
    window.removeEventListener('mousemove',this._onMouse);
    window.removeEventListener('click',this._onClick);
  }

  _handleNameKey(e) {
    if (e.key==='Backspace'){this._nameBuffer=this._nameBuffer.slice(0,-1);return;}
    if (e.key==='Enter'&&this._nameBuffer.length>0){
      HS.add('snake',this._nameBuffer,this._finalScore);
      this._enteringName=false;
      window._refreshScoresPanel&&window._refreshScoresPanel();
      return;
    }
    if (this._nameBuffer.length<5&&/^[a-zA-Z0-9]$/.test(e.key))
      this._nameBuffer+=e.key.toUpperCase();
  }

  _spawnBoss() {
    if (this.boss) return;
    const snakeSet=new Set(this.snake.map(s=>`${s.x},${s.y}`));
    const candidates=[
      {x:1,y:this.rows-5},{x:this.cols-4,y:1},
      {x:Math.floor(this.cols/2)-1,y:1},
    ];
    for (const c of candidates) {
      if (c.x>=0&&c.x+2<this.cols&&c.y>=0&&c.y+2<this.rows) {
        let ok=true;
        for (let r=0;r<=2;r++) for (let cc=0;cc<=2;cc++)
          if (snakeSet.has(`${c.x+cc},${c.y+r}`)) ok=false;
        if (ok){this.boss={x:c.x,y:c.y,counter:0};return;}
      }
    }
    this.boss={x:1,y:1,counter:0};
  }

  _spawnRanger() {
    const existing=this.rangers.length;
    if (existing>=2) return;
    const corners=[{x:1,y:1},{x:this.cols-2,y:this.rows-2}];
    const c=corners[existing%corners.length];
    this.rangers.push({x:c.x,y:c.y,counter:0,fireCounter:0});
  }

  _moveBoss() {
    if (!this.boss) return;
    this.boss.counter++;
    if (this.boss.counter < 8) return;
    this.boss.counter=0;
    const head=this.snake[0];
    const snakeSet=new Set(this.snake.map(s=>`${s.x},${s.y}`));
    const dx=Math.sign(head.x-(this.boss.x+1)), dy=Math.sign(head.y-(this.boss.y+1));
    const useH=Math.abs(head.x-this.boss.x)>=Math.abs(head.y-this.boss.y);
    const tries=useH?[{x:dx,y:0},{x:0,y:dy},{x:0,y:-dy},{x:-dx,y:0}]
                    :[{x:0,y:dy},{x:dx,y:0},{x:-dx,y:0},{x:0,y:-dy}];
    for (const step of tries) {
      const nx=this.boss.x+step.x,ny=this.boss.y+step.y;
      if (nx<0||nx+2>=this.cols||ny<0||ny+2>=this.rows) continue;
      let blocked=false;
      for (let r=0;r<=2&&!blocked;r++) for (let cc=0;cc<=2&&!blocked;cc++)
        if (snakeSet.has(`${nx+cc},${ny+r}`)) blocked=true;
      if (!blocked){this.boss.x=nx;this.boss.y=ny;return;}
    }
  }

  _moveRangers() {
    const head=this.snake[0];
    const snakeSet=new Set(this.snake.map(s=>`${s.x},${s.y}`));
    for (const r of this.rangers) {
      r.counter++;
      if (r.counter>=12) {
        r.counter=0;
        const dx=Math.sign(head.x-r.x), dy=Math.sign(head.y-r.y);
        const useH=Math.abs(head.x-r.x)>=Math.abs(head.y-r.y);
        const tries=useH?[{x:dx,y:0},{x:0,y:dy}]:[{x:0,y:dy},{x:dx,y:0}];
        for (const step of tries){
          const nx=r.x+step.x,ny=r.y+step.y;
          if (nx>=0&&nx<this.cols&&ny>=0&&ny<this.rows&&!snakeSet.has(`${nx},${ny}`)){r.x=nx;r.y=ny;break;}
        }
      }
      // fire
      r.fireCounter++;
      if (r.fireCounter>=20) {
        r.fireCounter=0;
        const fdx=Math.sign(head.x-r.x), fdy=Math.sign(head.y-r.y);
        if (fdx!==0||fdy!==0)
          this.bullets.push({x:r.x,y:r.y,dx:fdx,dy:fdy,counter:0});
      }
    }
  }

  _moveBullets() {
    this._bulletCounter++;
    if (this._bulletCounter<3) return;
    this._bulletCounter=0;
    const head=this.snake[0];
    for (let i=this.bullets.length-1;i>=0;i--){
      const b=this.bullets[i];
      b.x+=b.dx; b.y+=b.dy;
      if (b.x<0||b.x>=this.cols||b.y<0||b.y>=this.rows){this.bullets.splice(i,1);continue;}
      if (b.x===head.x&&b.y===head.y){this.dead=true;this._deathMsg='hit by a projectile';return;}
    }
  }

  _moveMonkeys() {
    const head=this.snake[0];
    const snakeSet=new Set(this.snake.map(s=>`${s.x},${s.y}`));
    for (const m of this.monkeys) {
      const dx=Math.sign(head.x-(m.x+1)),dy=Math.sign(head.y-(m.y+1));
      const useH=Math.abs(head.x-m.x)>=Math.abs(head.y-m.y);
      const tries=useH?[{x:dx,y:0},{x:0,y:dy},{x:0,y:-dy},{x:-dx,y:0}]
                      :[{x:0,y:dy},{x:dx,y:0},{x:-dx,y:0},{x:0,y:-dy}];
      for (const step of tries){
        if (!step.x&&!step.y) continue;
        const nx=m.x+step.x,ny=m.y+step.y;
        if (nx<0||nx+1>=this.cols||ny<0||ny+2>=this.rows) continue;
        let blocked=false;
        for (let r=0;r<=2&&!blocked;r++) for (let c=0;c<=1&&!blocked;c++)
          if (snakeSet.has(`${nx+c},${ny+r}`)) blocked=true;
        if (!blocked){m.x=nx;m.y=ny;break;}
      }
    }
  }

  _tick() {
    if (this.dead) return;
    this.dir=this.nextDir;
    const head={x:this.snake[0].x+this.dir.x,y:this.snake[0].y+this.dir.y};
    if (head.x<0||head.x>=this.cols||head.y<0||head.y>=this.rows||
        this.snake.some(s=>s.x===head.x&&s.y===head.y)){
      this.dead=true; this._deathMsg='crashed'; return;
    }
    this.snake.unshift(head);
    if (head.x===this.food.x&&head.y===this.food.y){
      this.score++;
      this.speed=Math.max(45,this.speed-2);
      // spawn boss at 5
      if (this.score===5) this._spawnBoss();
      // spawn ranged at 10, 20
      if (this.score===10||this.score===20) this._spawnRanger();
      // win at 50
      if (this.score>=50){
        const D=this.difficulty;
        this._finalScore=50*(D===1?10:D===2?15:20);
        this._enteringName=true; this._nameBuffer=''; return;
      }
      this._placeFood();
    } else {
      this.snake.pop();
    }

    // monkey move
    this._monkeyCounter++;
    if (this._monkeyCounter>=this._monkeyEvery){
      this._monkeyCounter=0;
      this._moveMonkeys();
      const hk=`${this.snake[0].x},${this.snake[0].y}`;
      if (this.monkeys.some(m=>this._monkeyCells(m).includes(hk))){
        this.dead=true; this._deathMsg='caught by a monkey'; return;
      }
    }
    // boss move
    if (this.boss) {
      this._moveBoss();
      const hk=`${this.snake[0].x},${this.snake[0].y}`;
      if (this._bossCells(this.boss).includes(hk)){
        this.dead=true; this._deathMsg='crushed by the boss'; return;
      }
    }
    // rangers + bullets
    if (this.rangers.length>0) {
      this._moveRangers();
      if (this.dead) return;
      this._moveBullets();
      if (this.dead) return;
    }
  }

  _draw() {
    const ctx=this.ctx, cw=ctx.canvas.width, ch=ctx.canvas.height, C=this.CELL;
    clearBg(ctx);

    if (this._enteringName){
      drawNameEntry(ctx,this._nameBuffer,this._finalScore,'SNAKE');
      return;
    }

    if (this.showDiffSelect){
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle=FG; ctx.font=`14px ${FONT}`;
      ctx.fillText('SNAKE',cw/2,ch/2-72);
      ctx.font=`9px ${FONT}`; ctx.fillStyle=DIM;
      ctx.fillText('select difficulty  ·  click or press 1 / 2 / 3',cw/2,ch/2-46);
      const labels=['easy','med','hard'];
      const descs=['1 monkey · slow','2 monkeys · mid','3 monkeys · fast'];
      const sx=cw/2-60;
      for (let i=0;i<3;i++){
        const x=sx+i*64;
        const isHov=Math.abs(this._mx-x)<30&&Math.abs(this._my-(ch/2-14))<16;
        const isSel=this.difficulty===i+1;
        ctx.fillStyle=isSel?FG:isHov?'rgba(230,232,240,0.72)':DIM;
        ctx.font=(isSel||isHov)?`bold 12px ${FONT}`:`10px ${FONT}`;
        ctx.fillText(labels[i],x,ch/2-14);
        if(isSel){ctx.fillStyle=GOLD;ctx.font=`7px ${FONT}`;ctx.fillText('●',x,ch/2-2);}
        ctx.font=`8px ${FONT}`; ctx.fillStyle='rgba(230,232,240,0.32)';
        ctx.fillText(descs[i],x,ch/2+10);
      }
      ctx.fillStyle=FG; ctx.font=`9px ${FONT}`;
      ctx.fillText('click anywhere or ENTER to start',cw/2,ch/2+34);
      ctx.fillStyle='rgba(230,232,240,0.32)'; ctx.font=`8px ${FONT}`;
      ctx.fillText('boss spawns at 5 pts · ranged enemy at 10 · win at 50',cw/2,ch/2+54);
      drawHints(ctx,'↑ ↓ ← →  arrow keys · ESC close');
      return;
    }

    // faint grid
    ctx.fillStyle='rgba(230,232,240,0.03)';
    for (let x=0;x<this.cols;x++) for (let y=0;y<this.rows;y++)
      ctx.fillRect(x*C+C/2-1,y*C+C/2-1,2,2);

    ctx.textAlign='center'; ctx.textBaseline='middle';
    // food
    ctx.font=`${C*0.75}px ${FONT}`; ctx.fillStyle=FG;
    ctx.fillText('*',this.food.x*C+C/2,this.food.y*C+C/2);
    // snake
    for (let i=0;i<this.snake.length;i++){
      const s=this.snake[i]; const isHead=i===0;
      const fade=Math.max(0.18,1-i*0.028);
      ctx.fillStyle=isHead?FG:`rgba(230,232,240,${fade.toFixed(2)})`;
      ctx.font=`${C*(isHead?0.85:0.65)}px ${FONT}`;
      let sym=isHead?(this.dir.x===1?'>':this.dir.x===-1?'<':this.dir.y===-1?'^':'v'):(i%2===0?'#':'+');
      ctx.fillText(sym,s.x*C+C/2,s.y*C+C/2);
    }
    // monkeys
    ctx.fillStyle='rgba(255,155,50,0.9)'; ctx.textAlign='center'; ctx.textBaseline='middle';
    for (const m of this.monkeys){
      const px=m.x*C+C, topY=m.y*C+C*0.5;
      for (let i=0;i<MONKEY_SPRITE.length;i++){
        ctx.font=`${Math.floor(C*(i===0?0.8:0.72))}px ${FONT}`;
        ctx.fillText(MONKEY_SPRITE[i],px,topY+i*C);
      }
    }
    // boss
    if (this.boss){
      const px=this.boss.x*C+C*1.5, topY=this.boss.y*C+C*0.5;
      ctx.fillStyle=RED; ctx.textAlign='center'; ctx.textBaseline='middle';
      for (let i=0;i<BOSS_SPRITE.length;i++){
        ctx.font=`${Math.floor(C*0.8)}px ${FONT}`;
        ctx.fillText(BOSS_SPRITE[i],px,topY+i*C);
      }
    }
    // rangers
    for (const r of this.rangers){
      ctx.fillStyle=PURP; ctx.font=`${Math.floor(C*0.85)}px ${FONT}`;
      ctx.fillText(RANGER_CHAR,r.x*C+C/2,r.y*C+C/2);
    }
    // bullets
    const bChars={1:{0:'→'},[-1]:{0:'←'},0:{1:'↓',[-1]:'↑'}};
    for (const b of this.bullets){
      ctx.fillStyle='rgba(200,80,255,0.7)'; ctx.font=`${Math.floor(C*0.6)}px ${FONT}`;
      const ch_sym=(bChars[b.dx]&&bChars[b.dx][b.dy])||'·';
      ctx.fillText(ch_sym,b.x*C+C/2,b.y*C+C/2);
    }

    // HUD — top-left (safe inside full-screen overlay)
    ctx.font=`9px ${FONT}`; ctx.fillStyle=DIM;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(`score: ${this.score} / 50`,14,14);
    ctx.textAlign='right'; ctx.fillStyle='rgba(255,155,50,0.6)';
    ctx.fillText('ωω monkeys',cw-14,14);
    if (this.boss){ctx.fillStyle=RED; ctx.fillText('▓ boss',cw-14,28);}
    if (this.rangers.length){ctx.fillStyle=PURP; ctx.fillText('Ψ ranged',cw-14,this.boss?42:28);}

    // speed indicator
    const maxSpd=this.difficulty===1?135:this.difficulty===2?110:85;
    const minSpd=45, spd=Math.round((1-(this.speed-minSpd)/(maxSpd-minSpd))*100);
    ctx.fillStyle=DIM; ctx.textAlign='left'; ctx.font=`7px ${FONT}`;
    ctx.fillText(`speed: ${spd}%`,14,28);

    if (this.dead){
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle=FG; ctx.font=`13px ${FONT}`;
      ctx.fillText(`game over · ${this._deathMsg}`,cw/2,ch/2-16);
      ctx.font=`9px ${FONT}`; ctx.fillStyle=DIM;
      ctx.fillText(`score: ${this.score}  ·  ENTER to restart`,cw/2,ch/2+10);
    }
    drawHints(ctx,'↑ ↓ ← →  arrow keys · ESC close');
  }

  _loop(ts=0){
    if (!this.running) return;
    if (!this.showDiffSelect&&!this._enteringName&&ts-this._lastTick>=this.speed){this._tick();this._lastTick=ts;}
    this._draw();
    this.rafId=requestAnimationFrame(t=>this._loop(t));
  }
}

// ── BRICK BREAKER ────────────────────────────────────────────────
class BrickGame {
  constructor(ctx,canvas){
    this.ctx=ctx; this.canvas=canvas;
    this.rafId=null; this.running=false;
    this._leftHeld=false; this._rightHeld=false;
    this.mouseX=canvas.width/2;
    this.level=1; this.showLevelSelect=true;
    this._mx=0; this._my=0;
    this._enteringName=false; this._nameBuffer=''; this._finalScore=0;
  }

  start(){this.running=true;this.showLevelSelect=true;this._enteringName=false;this._nameBuffer='';this._bindKeys();this._loop();}
  stop(){this.running=false;cancelAnimationFrame(this.rafId);this._unbindKeys();}
  _startMatch(){this.showLevelSelect=false;this._reset();}

  _reset(){
    const cw=this.canvas.width, ch=this.canvas.height;
    const lv=BRICK_LEVELS[this.level-1];
    const theme=THEMES[lv.theme];
    this._theme=theme;
    this.basePaddleW=lv.paddleW; this.paddleW=lv.paddleW; this.paddleH=10;
    this.paddleX=cw/2-this.paddleW/2; this.paddleY=ch-55;
    this.ballR=6; this.ballX=cw/2; this.ballY=this.paddleY-40;
    this.baseSpeed=lv.speed;
    this.ballDX=this.baseSpeed*(Math.random()>0.5?1:-1);
    this.ballDY=-this.baseSpeed;
    this.score=0; this.lives=3; this.dead=false; this.won=false;
    this.mouseX=cw/2;
    this.wideTimer=0; this.slowTimer=0; this.fallingPowerups=[];

    const map=lv.map;
    const COLS=map[0].length, ROWS=map.length;
    this.brickCols=COLS; this.brickRows=ROWS;
    const mapW=Math.min(cw*0.8,880);
    this.brickW=Math.floor(mapW/COLS);
    this.brickH=Math.max(17,Math.floor(ch*0.50/ROWS));
    this.brickOffX=Math.floor((cw-COLS*this.brickW)/2);
    this.brickOffY=28;

    this.bricks=[];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++){
      const v=map[r][c];
      if (v===0) continue;
      if (v==='U') this.bricks.push({r,c,hp:-1,maxHp:-1,type:'U',alive:true});
      else if (v==='W'||v==='S') this.bricks.push({r,c,hp:1,maxHp:1,type:v,alive:true});
      else this.bricks.push({r,c,hp:v,maxHp:v,type:'N',alive:true});
    }
  }

  _bindKeys(){
    this._onKey=(e)=>{
      if (this._enteringName){this._handleNameKey(e);return;}
      if (this.showLevelSelect){
        const n=parseInt(e.key);
        if (n>=1&&n<=5){this.level=n;this._startMatch();}
        if (e.key==='Enter') this._startMatch();
        return;
      }
      if (e.key==='ArrowLeft'){this._leftHeld=true;e.preventDefault();}
      if (e.key==='ArrowRight'){this._rightHeld=true;e.preventDefault();}
      if ((this.dead||this.won)&&e.key==='Enter') this._reset();
    };
    this._onKeyUp=(e)=>{
      if (e.key==='ArrowLeft') this._leftHeld=false;
      if (e.key==='ArrowRight') this._rightHeld=false;
    };
    this._onMouse=(e)=>{this.mouseX=e.clientX;this._mx=e.clientX;this._my=e.clientY;};
    this._onClick=(e)=>{
      if (this._enteringName||!this.showLevelSelect) return;
      const cw=this.canvas.width,ch=this.canvas.height;
      const sx=cw/2-160;
      for (let i=0;i<5;i++){
        const x=sx+i*80;
        if (Math.abs(e.clientX-x)<36&&Math.abs(e.clientY-(ch/2-14))<18){this.level=i+1;this._startMatch();return;}
      }
      this._startMatch();
    };
    window.addEventListener('keydown',this._onKey);
    window.addEventListener('keyup',this._onKeyUp);
    window.addEventListener('mousemove',this._onMouse);
    this._clickTimer=setTimeout(()=>window.addEventListener('click',this._onClick),120);
  }
  _unbindKeys(){
    clearTimeout(this._clickTimer);
    window.removeEventListener('keydown',this._onKey);
    window.removeEventListener('keyup',this._onKeyUp);
    window.removeEventListener('mousemove',this._onMouse);
    window.removeEventListener('click',this._onClick);
  }

  _handleNameKey(e){
    if (e.key==='Backspace'){this._nameBuffer=this._nameBuffer.slice(0,-1);return;}
    if (e.key==='Enter'&&this._nameBuffer.length>0){
      HS.add('brkr',this._nameBuffer,this._finalScore);
      this._enteringName=false;
      window._refreshScoresPanel&&window._refreshScoresPanel();
      return;
    }
    if (this._nameBuffer.length<5&&/^[a-zA-Z0-9]$/.test(e.key))
      this._nameBuffer+=e.key.toUpperCase();
  }

  _update(){
    if (this.showLevelSelect||this._enteringName||this.dead||this.won) return;
    const cw=this.canvas.width, ch=this.canvas.height;
    // paddle
    const kd=(this._leftHeld?-1:0)+(this._rightHeld?1:0);
    this.paddleX+=kd!==0?kd*10:(this.mouseX-this.paddleW/2-this.paddleX)*0.28;
    this.paddleX=Math.max(0,Math.min(cw-this.paddleW,this.paddleX));
    // powerup timers
    if (this.wideTimer>0){
      this.wideTimer--; this.paddleW=this.basePaddleW+72;
      if (this.wideTimer<=0) this.paddleW=this.basePaddleW;
    }
    if (this.slowTimer>0){
      this.slowTimer--;
      const tgt=this.baseSpeed*0.5, cur=Math.hypot(this.ballDX,this.ballDY);
      if (cur>tgt+0.1){this.ballDX*=tgt/cur;this.ballDY*=tgt/cur;}
      if (this.slowTimer<=0){const c2=Math.hypot(this.ballDX,this.ballDY);if(c2>0.1){this.ballDX*=this.baseSpeed/c2;this.ballDY*=this.baseSpeed/c2;}}
    }
    // falling powerups
    for (let i=this.fallingPowerups.length-1;i>=0;i--){
      const p=this.fallingPowerups[i]; p.y+=2.5;
      if (p.y>ch){this.fallingPowerups.splice(i,1);continue;}
      if (p.y+8>=this.paddleY&&p.y-8<=this.paddleY+this.paddleH&&p.x>=this.paddleX&&p.x<=this.paddleX+this.paddleW){
        if (p.type==='W') this.wideTimer=600;
        if (p.type==='S') this.slowTimer=480;
        this.fallingPowerups.splice(i,1);
      }
    }
    // ball
    this.ballX+=this.ballDX; this.ballY+=this.ballDY;
    if (this.ballX<=this.ballR) this.ballDX=Math.abs(this.ballDX);
    if (this.ballX>=cw-this.ballR) this.ballDX=-Math.abs(this.ballDX);
    if (this.ballY<=this.ballR) this.ballDY=Math.abs(this.ballDY);
    // paddle bounce
    if (this.ballY+this.ballR>=this.paddleY&&this.ballY-this.ballR<=this.paddleY+this.paddleH&&
        this.ballX>=this.paddleX&&this.ballX<=this.paddleX+this.paddleW&&this.ballDY>0){
      const hit=(this.ballX-this.paddleX)/this.paddleW-0.5;
      const spd=Math.hypot(this.ballDX,this.ballDY);
      const ang=hit*(Math.PI*0.6);
      this.ballDX=Math.sin(ang)*spd;
      this.ballDY=-Math.max(2,Math.abs(Math.cos(ang)*spd));
      this.ballY=this.paddleY-this.ballR-1;
    }
    if (this.ballY>ch+20){
      this.lives--;
      if (this.lives<=0){this.dead=true;return;}
      this.ballX=cw/2; this.ballY=this.paddleY-40;
      this.ballDX=this.baseSpeed*(Math.random()>0.5?1:-1); this.ballDY=-this.baseSpeed;
    }
    // brick collisions
    for (const b of this.bricks){
      if (!b.alive) continue;
      const bx=this.brickOffX+b.c*this.brickW, by=this.brickOffY+b.r*this.brickH;
      const bx2=bx+this.brickW, by2=by+this.brickH;
      const cpx=Math.max(bx,Math.min(this.ballX,bx2)), cpy=Math.max(by,Math.min(this.ballY,by2));
      if (Math.hypot(this.ballX-cpx,this.ballY-cpy)>this.ballR) continue;
      const ovL=this.ballX+this.ballR-bx, ovR=bx2-(this.ballX-this.ballR);
      const ovT=this.ballY+this.ballR-by, ovB=by2-(this.ballY-this.ballR);
      if (Math.min(ovL,ovR)<Math.min(ovT,ovB)) this.ballDX*=-1; else this.ballDY*=-1;
      if (b.type==='U') break;
      b.hp--;
      if (b.hp<=0){
        b.alive=false; this.score+=b.maxHp;
        if (b.type==='W'||b.type==='S')
          this.fallingPowerups.push({x:bx+this.brickW/2,y:by+this.brickH/2,type:b.type});
      }
      break;
    }
    if (this.bricks.filter(b=>b.type!=='U').every(b=>!b.alive)){
      this.won=true;
      const lv=BRICK_LEVELS[this.level-1];
      this._finalScore=Math.round(this.score*lv.mult*10);
      this._enteringName=true; this._nameBuffer='';
    }
  }

  _draw(){
    const ctx=this.ctx, cw=ctx.canvas.width, ch=ctx.canvas.height;
    clearBg(ctx);

    if (this._enteringName){
      drawNameEntry(ctx,this._nameBuffer,this._finalScore,`BRICK LV.${this.level}`);
      return;
    }

    if (this.showLevelSelect){
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle=FG; ctx.font=`14px ${FONT}`;
      ctx.fillText('BRICK BREAKER',cw/2,ch/2-80);
      ctx.font=`9px ${FONT}`; ctx.fillStyle=DIM;
      ctx.fillText('select level  ·  click or press 1–5',cw/2,ch/2-52);
      const sx=cw/2-160;
      for (let i=0;i<5;i++){
        const x=sx+i*80;
        const lv=BRICK_LEVELS[i];
        const theme=THEMES[lv.theme];
        const isHov=Math.abs(this._mx-x)<36&&Math.abs(this._my-(ch/2-14))<18;
        const isSel=this.level===i+1;
        ctx.fillStyle=isSel?theme.titleColor:isHov?'rgba(230,232,240,0.72)':DIM;
        ctx.font=(isSel||isHov)?`bold 11px ${FONT}`:`9px ${FONT}`;
        ctx.fillText(String(i+1),x,ch/2-22);
        if (isSel){ctx.fillStyle=GOLD;ctx.font=`7px ${FONT}`;ctx.fillText('●',x,ch/2-8);}
        ctx.fillStyle=isSel?theme.titleColor:'rgba(230,232,240,0.35)';
        ctx.font=`7px ${FONT}`;
        ctx.fillText(lv.label,x,ch/2+8);
        ctx.fillStyle='rgba(230,232,240,0.22)';
        ctx.fillText(`×${lv.mult}`,x,ch/2+22);
      }
      ctx.fillStyle=FG; ctx.font=`9px ${FONT}`;
      ctx.fillText('click anywhere or ENTER to start',cw/2,ch/2+46);
      drawHints(ctx,'← →  arrow keys or mouse · ESC close');
      return;
    }

    const theme=this._theme||THEMES.elephant;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    // bricks
    for (const b of this.bricks){
      if (!b.alive) continue;
      const bx=this.brickOffX+b.c*this.brickW+this.brickW/2;
      const by=this.brickOffY+b.r*this.brickH+this.brickH/2;
      const fs=Math.max(8,Math.floor(this.brickH*0.62));
      ctx.font=`${fs}px ${FONT}`;
      if (b.type==='U'){
        ctx.fillStyle=theme.ironColor; ctx.fillText(theme.ironChar,bx,by);
      } else if (b.type==='W'){
        ctx.fillStyle=theme.puW; ctx.fillText('[W]',bx,by);
      } else if (b.type==='S'){
        ctx.fillStyle=theme.puS; ctx.fillText('[S]',bx,by);
      } else {
        ctx.fillStyle=theme.brickColor(b.hp,b.maxHp);
        ctx.fillText(b.hp>=3?'▓▓▓':b.hp>=2?'▒▒▒':'░░░',bx,by);
      }
    }
    // falling powerups
    for (const p of this.fallingPowerups){
      ctx.font=`10px ${FONT}`;
      ctx.fillStyle=p.type==='W'?theme.puW:theme.puS;
      ctx.fillText(p.type==='W'?'[W]':'[S]',p.x,p.y);
    }
    // paddle
    ctx.font=`11px ${FONT}`;
    ctx.fillStyle=this.wideTimer>0?theme.puW:FG;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText('▬'.repeat(Math.max(1,Math.floor(this.paddleW/9))),this.paddleX,this.paddleY);
    // ball
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`${this.ballR*2.2}px ${FONT}`;
    ctx.fillStyle=this.slowTimer>0?theme.puS:FG;
    ctx.fillText('o',this.ballX,this.ballY);
    // HUD (top area — safe inside overlay)
    ctx.font=`9px ${FONT}`; ctx.fillStyle=DIM;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(`score: ${this.score}`,14,14);
    ctx.textAlign='right';
    ctx.fillText(`lives: ${'o '.repeat(this.lives).trim()}`,cw-14,14);
    // theme label + level
    const lv=BRICK_LEVELS[this.level-1];
    ctx.fillStyle=theme.titleColor; ctx.font=`8px ${FONT}`;
    ctx.fillText(`lv.${this.level}  ${lv.label}  ×${lv.mult}`,cw-14,28);
    // powerup timers
    let puy=30;
    if (this.wideTimer>0){ctx.fillStyle=theme.puW;ctx.textAlign='left';ctx.fillText(`[W] wide  ${Math.ceil(this.wideTimer/60)}s`,14,puy);puy+=14;}
    if (this.slowTimer>0){ctx.fillStyle=theme.puS;ctx.textAlign='left';ctx.fillText(`[S] slow  ${Math.ceil(this.slowTimer/60)}s`,14,puy);}

    if (this.dead){
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle=FG; ctx.font=`13px ${FONT}`;
      ctx.fillText('game over',cw/2,ch/2-16);
      ctx.font=`9px ${FONT}`; ctx.fillStyle=DIM;
      ctx.fillText(`score: ${this.score}  ·  ENTER to restart`,cw/2,ch/2+10);
    }
    drawHints(ctx,'← →  arrow keys or mouse · ESC close');
  }

  _loop(){
    if (!this.running) return;
    this._update(); this._draw();
    this.rafId=requestAnimationFrame(()=>this._loop());
  }
}

// ── Scores panel builder ──────────────────────────────────────────
function buildScoresPanel() {
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    display:'none', flexDirection:'column', gap:'6px',
    marginBottom:'0', padding:'10px 12px',
    background:'rgba(14,17,26,0.92)',
    backdropFilter:'blur(8px)',
    border:'1px solid rgba(230,232,240,0.13)',
    borderRadius:'8px',
    minWidth:'160px',
    maxHeight:'260px',
    overflowY:'auto',
  });

  function refresh() {
    panel.innerHTML='';
    const games=[{key:'pong',label:'PONG'},{key:'snake',label:'SNAKE'},{key:'brkr',label:'BRKR'}];
    for (const g of games) {
      const scores=HS.get(g.key);
      const head=document.createElement('div');
      Object.assign(head.style,{fontSize:'7px',fontFamily:'"DM Mono",monospace',
        color:'rgba(230,232,240,0.55)',marginTop:'4px',marginBottom:'2px',letterSpacing:'1px'});
      head.textContent=g.label;
      panel.appendChild(head);
      if (scores.length===0){
        const empty=document.createElement('div');
        Object.assign(empty.style,{fontSize:'7px',fontFamily:'"DM Mono",monospace',color:'rgba(230,232,240,0.22)'});
        empty.textContent='no scores yet';
        panel.appendChild(empty);
      } else {
        scores.slice(0,5).forEach((sc,i)=>{
          const row=document.createElement('div');
          Object.assign(row.style,{fontSize:'7px',fontFamily:'"DM Mono",monospace',
            color:'rgba(230,232,240,0.65)',display:'flex',justifyContent:'space-between',gap:'12px'});
          row.innerHTML=`<span>${i+1}. ${sc.n}</span><span>${sc.s}</span>`;
          panel.appendChild(row);
        });
      }
    }
  }
  refresh();
  window._refreshScoresPanel = refresh;
  return {panel, refresh};
}

// ── initGamesMode ────────────────────────────────────────────────
export function initGamesMode() {
  const drawContainer = document.getElementById('draw-mode-container');
  if (!drawContainer) return;

  // ── game menu + play button ──────────────────────────────────
  let gameMenuOpen = false;
  const gameMenu = document.createElement('div');
  Object.assign(gameMenu.style,{
    display:'none', flexDirection:'column', gap:'3px',
    padding:'7px 10px',
    background:'rgba(14,17,26,0.88)',
    backdropFilter:'blur(6px)',
    border:'1px solid rgba(230,232,240,0.13)',
    borderRadius:'8px',
  });
  const GAMES=[{id:'pong',label:'pong'},{id:'snake',label:'snake'},{id:'brkr',label:'brkr'}];
  for (const g of GAMES){
    const btn=document.createElement('div');
    btn.className='game-menu-btn'; btn.textContent=g.label;
    btn.addEventListener('click',()=>startGame(g.id));
    gameMenu.appendChild(btn);
  }
  const gHints=document.createElement('div');
  Object.assign(gHints.style,{marginTop:'5px',paddingTop:'5px',
    borderTop:'1px solid rgba(230,232,240,0.08)',
    fontSize:'7px',fontFamily:FONT,color:'rgba(230,232,240,0.22)',
    textAlign:'right',lineHeight:'1.5',whiteSpace:'nowrap'});
  gHints.innerHTML='↑ ↓ ← →&nbsp; arrow keys<br>ESC&nbsp; close';
  gameMenu.appendChild(gHints);
  drawContainer.appendChild(gameMenu);

  const playBtn=document.createElement('div');
  playBtn.id='play-mode-toggle'; playBtn.textContent='play';
  playBtn.style.display='none';
  drawContainer.appendChild(playBtn);
  playBtn.addEventListener('click',()=>{
    if (scoresOpen){scoresOpen=false;scoresPanel.style.display='none';scoresBtn.textContent='scores';}
    gameMenuOpen=!gameMenuOpen;
    playBtn.textContent=gameMenuOpen?'play ✓':'play';
    gameMenu.style.display=gameMenuOpen?'flex':'none';
  });

  // ── scores panel + button ────────────────────────────────────
  let scoresOpen=false;
  const {panel:scoresPanel}=buildScoresPanel();
  drawContainer.appendChild(scoresPanel);

  const scoresBtn=document.createElement('div');
  scoresBtn.id='scores-mode-toggle'; scoresBtn.textContent='scores';
  scoresBtn.style.display='none';
  drawContainer.appendChild(scoresBtn);
  scoresBtn.addEventListener('click',()=>{
    if (gameMenuOpen){gameMenuOpen=false;gameMenu.style.display='none';playBtn.textContent='play';}
    scoresOpen=!scoresOpen;
    scoresBtn.textContent=scoresOpen?'scores ✓':'scores';
    scoresPanel.style.display=scoresOpen?'flex':'none';
  });

  // ── fullscreen overlay (canvas pointer-events:none, close btn bottom-LEFT) ──
  const overlay=document.createElement('div');
  overlay.id='game-overlay';
  Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'99999',display:'none',background:BG});

  const gameCanvas=document.createElement('canvas');
  gameCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
  overlay.appendChild(gameCanvas);

  const closeBtn=document.createElement('button');
  closeBtn.id='game-close-btn'; closeBtn.textContent='× close';
  Object.assign(closeBtn.style,{
    position:'absolute',bottom:'20px',left:'20px',zIndex:'10',
    background:'transparent',border:'none',cursor:'pointer',
    fontFamily:FONT,fontSize:'9px',color:'rgba(230,232,240,0.5)',pointerEvents:'auto',
  });
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  let activeGame=null;
  function stopGame(){activeGame?.stop();activeGame=null;overlay.style.display='none';}
  closeBtn.addEventListener('click',(e)=>{e.stopPropagation();stopGame();});
  window.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&overlay.style.display!=='none')stopGame();});

  function startGame(id){
    gameMenuOpen=false; gameMenu.style.display='none'; playBtn.textContent='play';
    overlay.style.display='block';
    gameCanvas.width=window.innerWidth; gameCanvas.height=window.innerHeight;
    const ctx=gameCanvas.getContext('2d');
    activeGame?.stop();
    if (id==='pong')  activeGame=new PongGame(ctx,gameCanvas);
    if (id==='snake') activeGame=new SnakeGame(ctx,gameCanvas);
    if (id==='brkr')  activeGame=new BrickGame(ctx,gameCanvas);
    activeGame.start();
  }
}
