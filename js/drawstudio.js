// drawstudio.js — v7
// DRAW : brush · neon · scratch · forge · spray · circuit · prism · ink
// FX   : glitch · smear · warp · fill · eraser · select · move
// CELL : ascii · flow · trace · sigil · swarm
// MATH : wave · spiral · lissa · sym×6
// GALLERY: save drawings → right-side panel, localStorage

const DS_BG     = '#0e111a';
const DS_FG     = 'rgba(230,232,240,0.5)';
const DS_BRIGHT = 'rgba(230,232,240,0.9)';
const DS_GLASS  = 'rgba(14,17,26,0.85)';
const DS_BORDER = '1px solid rgba(230,232,240,0.14)';
const DS_FONT   = '"DM Mono", monospace';
const DS_ICONS  = "'Material Symbols Outlined'";
const GALLERY_KEY = 'ericjoo_drawings';

const ASCII_CHARS = '▓▒░│─┼╬×+○◎*◆■▪┤├┬┴╔╗╚╝═║╠#@.XO><^~';
const DIR_CHARS   = ['─','╲','│','╱','─','╲','│','╱'];
const CELL_W = 10, CELL_H = 14;

const PALETTE = [
  '#000000','#111318','#1a2233','#334455',
  '#667788','#aabbcc','#e6e8f0','#ffffff',
  '#3a1a0a','#6b2d0e','#aa4400','#ff6600',
  '#ff8800','#ffaa00','#ffdd00','#aacc00',
  '#2a0a1a','#6b0e2d','#cc0044','#ff2266',
  '#ff4466','#ff88aa','#ffccdd','#ffeeee',
  '#0a1a2a','#0e2d6b','#0044cc','#2266ff',
  '#00ccff','#00ffcc','#44ffaa','#39ff14',
  '#1a0a3a','#3a0e6b','#7700cc','#aa44ff',
  '#cc00aa','#ff44cc','#88ffcc','#ccffee',
];
const SIZES = [{label:'xs',val:3},{label:'s',val:7},{label:'m',val:14},{label:'l',val:24},{label:'xl',val:40}];

const mk  = (tag,sty={}) => { const el=document.createElement(tag); Object.assign(el.style,sty); return el; };
const div = (sty={}) => mk('div',sty);
const lerp = (a,b,t) => a*(1-t)+b*t;
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

function glassPanel(extra={}) {
  return div({ background:DS_GLASS, backdropFilter:'blur(10px)', border:DS_BORDER,
    borderRadius:'10px', padding:'8px', boxSizing:'border-box', ...extra });
}
function secLabel(text) {
  const el=div({ fontFamily:DS_FONT, fontSize:'6.5px', color:'rgba(230,232,240,0.25)',
    letterSpacing:'0.1em', marginBottom:'4px', userSelect:'none' });
  el.textContent=text; return el;
}
function hairline() { return div({height:'1px',background:'rgba(230,232,240,0.06)',margin:'5px 0'}); }

function _h(n){return((Math.sin(n*127.1+n*311.7)%1)+1)%1;}
function noise2(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=_h(ix+iy*57),b=_h(ix+1+iy*57),c=_h(ix+(iy+1)*57),d=_h(ix+1+(iy+1)*57);
  return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v;
}
function charByNoise(x,y){return ASCII_CHARS[Math.floor(noise2(x,y)*ASCII_CHARS.length)%ASCII_CHARS.length];}
function hexToRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}

function floodFill(ctx,sx,sy,hex){
  const{width:w,height:h}=ctx.canvas;sx=Math.round(sx);sy=Math.round(sy);
  if(sx<0||sx>=w||sy<0||sy>=h)return;
  const img=ctx.getImageData(0,0,w,h),data=img.data;
  const[fr,fg,fb]=hexToRgb(hex),base=(sy*w+sx)*4;
  const[tr,tg,tb,ta]=[data[base],data[base+1],data[base+2],data[base+3]];
  if(tr===fr&&tg===fg&&tb===fb&&ta===255)return;
  const match=i=>data[i]===tr&&data[i+1]===tg&&data[i+2]===tb&&data[i+3]===ta;
  const paint=i=>{data[i]=fr;data[i+1]=fg;data[i+2]=fb;data[i+3]=255;};
  const vis=new Uint8Array(w*h),q=[sy*w+sx];vis[sy*w+sx]=1;
  while(q.length){
    const idx=q.pop();if(!match(idx*4))continue;paint(idx*4);
    const x=idx%w,y=(idx/w)|0;
    for(const n of[idx-1,idx+1,idx-w,idx+w])
      if(n>=0&&n<w*h&&!vis[n]&&((n===idx-1&&x>0)||(n===idx+1&&x<w-1)||n===idx-w||n===idx+w))
        {vis[n]=1;q.push(n);}
  }
  ctx.putImageData(img,0,0);
}
function lineCells(x0,y0,x1,y1,anim,color,cells){
  let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;
  for(;;){
    cells.set(`${x0},${y0}`,{col:x0,row:y0,char:charByNoise(x0*.3,y0*.3),color,anim,
      t0:performance.now(),phase:noise2(x0,y0)*Math.PI*2,extra:{}});
    if(x0===x1&&y0===y1)break;
    const e2=2*err;if(e2>-dy){err-=dy;x0+=sx;}if(e2<dx){err+=dx;y0+=sy;}
  }
}

/* ── Gallery helpers ── */
function galleryLoad(){try{return JSON.parse(localStorage.getItem(GALLERY_KEY)||'[]');}catch{return[];}}
function gallerySave(arr){try{localStorage.setItem(GALLERY_KEY,JSON.stringify(arr));}catch{}}

export function initDrawStudio(){
  if(document.getElementById('draw-studio-overlay'))
    return{open(){document.getElementById('draw-studio-overlay').style.display='block';}};

  let activeTool='brush',brushSize=14,activeColor='#e6e8f0';
  let isDrawing=false,lastX=0,lastY=0,loopTimer=null,rafId=null;
  let undoStack=[];
  const MAX_UNDO=20;

  // selection state
  let selX=0,selY=0,selW=0,selH=0,selActive=false,selDragging=false;
  let selImage=null,selMoving=false,selOffX=0,selOffY=0;

  const cells=new Map();
  const cellKey=(c,r)=>`${c},${r}`;
  const pixToCell=(x,y)=>({col:Math.floor(x/CELL_W),row:Math.floor(y/CELL_H)});
  function setCell(col,row,anim,color,extra={}){
    cells.set(cellKey(col,row),{col,row,char:charByNoise(col*.31,row*.29),
      color,anim,t0:performance.now(),phase:noise2(col*1.3,row*1.7)*Math.PI*2,extra});
  }
  function paintRadius(cx,cy,anim,r){
    const cr=Math.ceil(r/CELL_W)+1,{col:cc,row:rc}=pixToCell(cx,cy);
    for(let dc=-cr;dc<=cr;dc++) for(let dr=-cr;dr<=cr;dr++){
      const px=(cc+dc)*CELL_W+CELL_W/2,py=(rc+dr)*CELL_H+CELL_H/2;
      if(Math.hypot(px-cx,py-cy)<=r)setCell(cc+dc,rc+dr,anim,activeColor);
    }
  }
  function eraseRadius(cx,cy,r){
    const cr=Math.ceil(r/CELL_W)+1,{col:cc,row:rc}=pixToCell(cx,cy);
    for(let dc=-cr;dc<=cr;dc++) for(let dr=-cr;dr<=cr;dr++) cells.delete(cellKey(cc+dc,rc+dr));
  }
  let swarmParts=[];
  function spawnSwarm(cx,cy){
    for(let i=0;i<10&&swarmParts.length<200;i++)
      swarmParts.push({x:cx+(Math.random()-.5)*30,y:cy+(Math.random()-.5)*30,
        vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,life:.7+Math.random()*.5,color:activeColor});
  }

  // flock — boids (separation + alignment + cohesion)
  let flockParts=[];
  function spawnFlock(cx,cy){
    for(let i=0;i<8&&flockParts.length<120;i++){
      const a=Math.random()*Math.PI*2,spd=.8+Math.random()*1.4;
      flockParts.push({x:cx+(Math.random()-.5)*24,y:cy+(Math.random()-.5)*24,
        vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,color:activeColor});
    }
  }

  // mold — physarum-style branching tendrils
  let moldParts=[];
  function spawnMold(cx,cy){
    for(let i=0;i<14&&moldParts.length<300;i++)
      moldParts.push({x:cx+(Math.random()-.5)*20,y:cy+(Math.random()-.5)*20,
        angle:Math.random()*Math.PI*2,color:activeColor});
  }

  // drift — slow noise flow field, calm version of swarm
  let driftParts=[];
  function spawnDrift(cx,cy){
    for(let i=0;i<18&&driftParts.length<400;i++)
      driftParts.push({x:cx+(Math.random()-.5)*brushSize*2.2,y:cy+(Math.random()-.5)*brushSize*2.2,
        life:.5+Math.random()*.8,color:activeColor});
  }

  let warpPrev=null;

  /* ── overlay ── */
  const overlay=div({position:'fixed',inset:'0',zIndex:'99998',background:DS_BG,display:'none'});
  overlay.id='draw-studio-overlay';
  let W=window.innerWidth,H=window.innerHeight;

  const staticCanvas=document.createElement('canvas');
  staticCanvas.width=W;staticCanvas.height=H;
  const sCtx=staticCanvas.getContext('2d',{willReadFrequently:true});

  // UI canvas for selection marquee + warp preview
  const uiCanvas=document.createElement('canvas');
  uiCanvas.width=W;uiCanvas.height=H;
  Object.assign(uiCanvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
  const uCtx=uiCanvas.getContext('2d');

  const canvas=document.createElement('canvas');
  canvas.width=W;canvas.height=H;
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',
    display:'block',touchAction:'none',cursor:'crosshair'});
  const ctx=canvas.getContext('2d');
  overlay.appendChild(canvas);
  overlay.appendChild(uiCanvas);

  /* ── undo ── */
  function saveUndo(){
    if(undoStack.length>=MAX_UNDO)undoStack.shift();
    undoStack.push({img:sCtx.getImageData(0,0,staticCanvas.width,staticCanvas.height),snap:new Map(cells)});
  }
  function undo(){
    if(!undoStack.length)return;
    const{img,snap}=undoStack.pop();
    sCtx.putImageData(img,0,0);cells.clear();snap.forEach((v,k)=>cells.set(k,v));
  }

  /* ── rAF render ── */
  function renderFrame(ts){
    const t=ts*.001,cols=Math.ceil(canvas.width/CELL_W),rows=Math.ceil(canvas.height/CELL_H);
    ctx.fillStyle=DS_BG;ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.save();ctx.font=`9px ${DS_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
    for(let row=0;row<rows;row+=2) for(let col=0;col<cols;col+=2){
      const n=noise2(col*.11+t*.07,row*.11+t*.045);
      if(n>.68){ctx.globalAlpha=(n-.68)*.22;ctx.fillStyle='#aabbcc';
        ctx.fillText(charByNoise(col*.38+t*.18,row*.38+t*.12),col*CELL_W+CELL_W/2,row*CELL_H+CELL_H/2);}
    }
    ctx.restore();
    ctx.drawImage(staticCanvas,0,0);
    if(selActive&&selImage&&selMoving)
      ctx.putImageData(selImage,Math.round(selX),Math.round(selY));
    ctx.save();ctx.font=`${Math.round(CELL_H*.75)}px ${DS_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
    for(const cell of cells.values()){
      const age=(ts-cell.t0)*.001,cx=cell.col*CELL_W+CELL_W/2,cy=cell.row*CELL_H+CELL_H/2;
      let alpha=1,char=cell.char;
      switch(cell.anim){
        case 'cycle': char=charByNoise(cell.col*.14+t*.45,cell.row*.14+t*.28);alpha=.75+Math.sin(t*1.4+cell.phase)*.25;break;
        case 'flow':{ const a=noise2(cell.col*.07+t*.18,cell.row*.07+t*.13)*Math.PI*4;char=ASCII_CHARS[Math.abs(Math.floor(a/Math.PI*8))%ASCII_CHARS.length];alpha=.65+Math.sin(t*.9+cell.phase)*.35;break;}
        case 'trace': alpha=.8+Math.sin(t*2+cell.phase)*.2;break;
        case 'pulse': alpha=Math.max(.05,.5+Math.sin(t*2.5+cell.phase)*.5);break;
        case 'wave':{ const dist=Math.hypot(cell.col-(cell.extra.cx||0),cell.row-(cell.extra.cy||0));alpha=Math.max(0,Math.sin(dist*.55-t*3.2+cell.phase)*.65+.35);char=charByNoise(cell.col*.2+t*.3,cell.row*.2+dist*.1);break;}
        case 'chaos': char=charByNoise(cell.col*.22+t*5,cell.row*.22+age*3+t*2.5);alpha=.35+noise2(cell.col*.5+t*7,cell.row*.5+t*3)*.65;break;
        case 'lissa': alpha=.55+Math.sin(t*1.9+cell.phase)*.45;char=charByNoise(cell.col*.18+t*.22,cell.row*.18+t*.17);break;
        case 'swarm': alpha=Math.max(0,cell.extra.life||.8)*(.5+Math.sin(t*3+cell.phase)*.5);char=charByNoise(cell.col*.3+t*.4,cell.row*.3+t*.35);break;
        case 'sigil': alpha=.6+Math.sin(t*1.3+cell.phase)*.4;char=charByNoise(cell.col*.2+t*.15,cell.row*.2+t*.12);break;
        case 'spiral':alpha=.55+Math.sin(t*1.7+cell.phase)*.45;char=charByNoise(cell.col*.19+t*.2,cell.row*.19+t*.18);break;
      }
      if(alpha<.02)continue;ctx.globalAlpha=Math.min(1,alpha);ctx.fillStyle=cell.color;ctx.fillText(char,cx,cy);
    }
    ctx.restore();
    if(swarmParts.length){
      swarmParts=swarmParts.filter(p=>p.life>.02);
      for(const p of swarmParts){
        p.life-=.006;const a=noise2(p.x*.003+t*.25,p.y*.003+t*.18)*Math.PI*4;
        p.vx=p.vx*.88+Math.cos(a)*.7;p.vy=p.vy*.88+Math.sin(a)*.7;p.x+=p.vx;p.y+=p.vy;
        const{col,row}=pixToCell(p.x,p.y);
        if(col>=0&&row>=0&&col<cols&&row<rows)setCell(col,row,'swarm',p.color,{life:p.life});
      }
    }
    if(flockParts.length){
      const perc=42,maxSpd=2.2,W2=canvas.width,H2=canvas.height;
      for(const p of flockParts){
        let sx=0,sy=0,ax=0,ay=0,cx2=0,cy2=0,n=0;
        for(const o of flockParts){
          if(o===p)continue;
          const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy);
          if(d<perc&&d>0){
            if(d<14){sx+=dx/d;sy+=dy/d;}
            ax+=o.vx;ay+=o.vy;cx2+=o.x;cy2+=o.y;n++;
          }
        }
        if(n){
          const al=Math.hypot(ax,ay)||1;p.vx+=(ax/al)*0.06;p.vy+=(ay/al)*0.06;
          const cdx=cx2/n-p.x,cdy=cy2/n-p.y,cl=Math.hypot(cdx,cdy)||1;
          p.vx+=(cdx/cl)*0.03;p.vy+=(cdy/cl)*0.03;
          p.vx+=sx*0.09;p.vy+=sy*0.09;
        }else{const ra=noise2(p.x*.004+t*.1,p.y*.004+t*.08)*Math.PI*4;p.vx+=Math.cos(ra)*.2;p.vy+=Math.sin(ra)*.2;}
        const spd=Math.hypot(p.vx,p.vy)||1;
        if(spd>maxSpd){p.vx=p.vx/spd*maxSpd;p.vy=p.vy/spd*maxSpd;}
        p.x=(p.x+p.vx+W2)%W2;p.y=(p.y+p.vy+H2)%H2;
        const{col,row}=pixToCell(p.x,p.y);
        if(col>=0&&row>=0&&col<cols&&row<rows)setCell(col,row,'chaos',p.color);
      }
    }
    if(moldParts.length){
      const sa=Math.PI/4,sd=11;
      for(const p of moldParts){
        const sense=a=>{const{col,row}=pixToCell(p.x+Math.cos(a)*sd,p.y+Math.sin(a)*sd);return cells.has(cellKey(col,row))?1:0;};
        const fl2=sense(p.angle-sa),fc=sense(p.angle),fr2=sense(p.angle+sa);
        if(fc>=fl2&&fc>=fr2){}
        else if(fl2>fr2)p.angle-=sa*.55;
        else if(fr2>fl2)p.angle+=sa*.55;
        else p.angle+=(Math.random()-.5)*sa*1.2;
        p.angle+=noise2(p.x*.012+t*.04,p.y*.012+t*.03)*.18-.09;
        p.x+=Math.cos(p.angle)*1.3;p.y+=Math.sin(p.angle)*1.3;
        if(p.x<0||p.x>canvas.width||p.y<0||p.y>canvas.height){p.angle+=Math.PI*(.5+Math.random());p.x=clamp(p.x,2,canvas.width-2);p.y=clamp(p.y,2,canvas.height-2);}
        const{col,row}=pixToCell(p.x,p.y);
        if(col>=0&&row>=0&&col<cols&&row<rows)setCell(col,row,'trace',p.color);
      }
    }
    if(driftParts.length){
      driftParts=driftParts.filter(p=>p.life>.01);
      for(const p of driftParts){
        p.life-=.002;
        const a=noise2(p.x*.006+t*.05,p.y*.006+t*.04)*Math.PI*4;
        p.x+=Math.cos(a)*.9;p.y+=Math.sin(a)*.9;
        const{col,row}=pixToCell(p.x,p.y);
        if(col>=0&&row>=0&&col<cols&&row<rows)setCell(col,row,'flow',p.color);
      }
    }
    // UI overlay
    uCtx.clearRect(0,0,uiCanvas.width,uiCanvas.height);
    if(selActive){
      const sx=Math.min(selX,selX+selW),sy=Math.min(selY,selY+selH);
      const sw=Math.abs(selW),sh=Math.abs(selH);
      if(sw>1&&sh>1){
        uCtx.save();
        uCtx.strokeStyle='rgba(0,200,255,.9)';uCtx.lineWidth=1;
        uCtx.setLineDash([4,4]);uCtx.lineDashOffset=-(ts*.022%8);
        uCtx.strokeRect(sx+.5,sy+.5,sw,sh);
        uCtx.fillStyle='rgba(0,200,255,.04)';uCtx.fillRect(sx,sy,sw,sh);
        uCtx.setLineDash([]);uCtx.fillStyle='rgba(0,200,255,.85)';
        for(const[hx,hy]of[[sx,sy],[sx+sw,sy],[sx,sy+sh],[sx+sw,sy+sh]])uCtx.fillRect(hx-3,hy-3,6,6);
        uCtx.restore();
      }
    }
    if(activeTool==='warp'&&warpPrev){
      const r=brushSize*1.8;
      uCtx.save();uCtx.beginPath();uCtx.arc(warpPrev.x,warpPrev.y,r,0,Math.PI*2);
      uCtx.strokeStyle='rgba(0,200,255,.6)';uCtx.lineWidth=1;uCtx.setLineDash([3,3]);uCtx.stroke();
      uCtx.setLineDash([]);uCtx.strokeStyle='rgba(0,200,255,.3)';uCtx.lineWidth=.5;
      uCtx.beginPath();uCtx.moveTo(warpPrev.x-r,warpPrev.y);uCtx.lineTo(warpPrev.x+r,warpPrev.y);uCtx.stroke();
      uCtx.beginPath();uCtx.moveTo(warpPrev.x,warpPrev.y-r);uCtx.lineTo(warpPrev.x,warpPrev.y+r);uCtx.stroke();
      uCtx.restore();
    }
    rafId=requestAnimationFrame(renderFrame);
  }

  /* ═══════════════════════════════ PIXEL TOOLS ═══════════════════════════════ */
  function doStroke(x1,y1,x2,y2){
    sCtx.save();sCtx.strokeStyle=activeColor;sCtx.lineWidth=brushSize;
    sCtx.lineCap='round';sCtx.lineJoin='round';
    sCtx.beginPath();sCtx.moveTo(x1,y1);sCtx.lineTo(x2,y2);sCtx.stroke();sCtx.restore();
  }
  function doNeon(x1,y1,x2,y2){
    sCtx.save();sCtx.shadowBlur=brushSize*5;sCtx.shadowColor=activeColor;
    sCtx.strokeStyle=activeColor;sCtx.lineWidth=brushSize*.55;sCtx.lineCap='round';sCtx.lineJoin='round';
    sCtx.beginPath();sCtx.moveTo(x1,y1);sCtx.lineTo(x2,y2);sCtx.stroke();
    sCtx.shadowBlur=brushSize*1.5;sCtx.strokeStyle='#ffffff';sCtx.lineWidth=Math.max(.5,brushSize*.12);
    sCtx.beginPath();sCtx.moveTo(x1,y1);sCtx.lineTo(x2,y2);sCtx.stroke();sCtx.restore();
  }
  function doSpray(x,y){
    const r=brushSize*1.8;sCtx.save();sCtx.fillStyle=activeColor;
    for(let i=0;i<35;i++){const a=Math.random()*Math.PI*2,d=Math.random()*r;sCtx.fillRect(x+Math.cos(a)*d,y+Math.sin(a)*d,1.5,1.5);}
    sCtx.restore();
  }
  function doEraser(x,y){
    sCtx.save();sCtx.globalCompositeOperation='destination-out';
    sCtx.beginPath();sCtx.arc(x,y,brushSize,0,Math.PI*2);sCtx.fill();sCtx.restore();
    eraseRadius(x,y,brushSize);
  }
  function doCircuit(x1,y1,x2,y2){
    if(Math.hypot(x2-x1,y2-y1)<2)return;
    const lw=Math.max(1,brushSize*.18),dotR=Math.max(1.5,brushSize*.14);
    const flip=noise2(x1*.03,y1*.03)>.5;
    sCtx.save();sCtx.strokeStyle=activeColor;sCtx.lineWidth=lw;sCtx.lineCap='square';sCtx.globalAlpha=.92;
    sCtx.beginPath();sCtx.moveTo(x1,y1);
    if(flip){sCtx.lineTo(x2,y1);sCtx.lineTo(x2,y2);}else{sCtx.lineTo(x1,y2);sCtx.lineTo(x2,y2);}
    sCtx.stroke();sCtx.fillStyle=activeColor;
    for(const[cx,cy]of[[x1,y1],[x2,y2]]){sCtx.beginPath();sCtx.arc(cx,cy,dotR,0,Math.PI*2);sCtx.fill();}
    sCtx.restore();
  }
  function doGlitch(x,y){
    const t=performance.now()*.001,bandH=Math.max(1,Math.round(brushSize*.35));
    const cRow=Math.floor(y/CELL_H);
    for(let dr=-bandH;dr<=bandH;dr++){
      const row=cRow+dr,intensity=1-Math.abs(dr)/bandH;
      const shift=Math.round((noise2(row*.4+t*3,t*2.5)-.5)*brushSize*1.4*intensity/CELL_W);
      if(Math.abs(shift)<1)continue;
      const toMove=[];for(const[k,c]of cells)if(c.row===row)toMove.push([k,c]);
      for(const[k]of toMove)cells.delete(k);
      for(const[,c]of toMove)cells.set(cellKey(c.col+shift,c.row),{...c,col:c.col+shift,anim:'chaos'});
    }
    const ph=Math.max(2,Math.round(brushSize*.5));
    for(let dy=-ph;dy<=ph;dy++){
      const ry=Math.round(y)+dy;if(ry<0||ry>=staticCanvas.height)continue;
      const intensity=1-Math.abs(dy)/ph;
      const sp=Math.round((noise2(ry*.05+t*3,t*2)-.5)*brushSize*intensity);
      if(Math.abs(sp)<1)continue;
      const row=sCtx.getImageData(0,ry,staticCanvas.width,1),data=row.data;
      const s=new Uint8ClampedArray(data.length);
      for(let i=0;i<staticCanvas.width;i++){
        const src=((i-sp+staticCanvas.width)%staticCanvas.width)*4,dst=i*4;
        s[dst]=data[src];s[dst+1]=data[src+1];s[dst+2]=data[src+2];s[dst+3]=data[src+3];
      }
      sCtx.putImageData(new ImageData(s,staticCanvas.width,1),0,ry);
    }
  }
  function doSmear(x,y){
    const r=Math.round(brushSize);if(Math.hypot(x-lastX,y-lastY)<1||r<3)return;
    const sx0=Math.max(0,Math.round(lastX-r)),sy0=Math.max(0,Math.round(lastY-r));
    const dx0=Math.max(0,Math.round(x-r)),dy0=Math.max(0,Math.round(y-r));
    const sw=Math.min(r*2,staticCanvas.width-sx0),sh=Math.min(r*2,staticCanvas.height-sy0);
    const dw=Math.min(r*2,staticCanvas.width-dx0),dh=Math.min(r*2,staticCanvas.height-dy0);
    if(sw<2||sh<2||dw<2||dh<2)return;
    try{
      const srcD=sCtx.getImageData(sx0,sy0,sw,sh),dstD=sCtx.getImageData(dx0,dy0,dw,dh);
      const mW=Math.min(sw,dw),mH=Math.min(sh,dh);
      for(let py=0;py<mH;py++) for(let px=0;px<mW;px++){
        const dist=Math.hypot(px-r,py-r);if(dist>=r)continue;
        const a=Math.pow(1-dist/r,.5)*.72,i=(py*dw+px)*4,si=(py*sw+px)*4;
        dstD.data[i]=lerp(dstD.data[i],srcD.data[si],a);dstD.data[i+1]=lerp(dstD.data[i+1],srcD.data[si+1],a);
        dstD.data[i+2]=lerp(dstD.data[i+2],srcD.data[si+2],a);dstD.data[i+3]=Math.max(dstD.data[i+3],srcD.data[si+3]*a);
      }
      sCtx.putImageData(dstD,dx0,dy0);
    }catch{}
  }
  function doWarp(x,y){
    const r=Math.round(brushSize*1.8);
    const x0=Math.max(0,Math.round(x-r)),y0=Math.max(0,Math.round(y-r));
    const w=Math.min(r*2,staticCanvas.width-x0),h=Math.min(r*2,staticCanvas.height-y0);
    if(w<4||h<4)return;
    const src=sCtx.getImageData(x0,y0,w,h),dst=new ImageData(w,h);
    const relx=x-x0,rely=y-y0;
    for(let py=0;py<h;py++) for(let px=0;px<w;px++){
      const dx=px-relx,dy=py-rely,dist=Math.hypot(dx,dy);
      if(dist>=r){const i=(py*w+px)*4;dst.data[i]=src.data[i];dst.data[i+1]=src.data[i+1];dst.data[i+2]=src.data[i+2];dst.data[i+3]=src.data[i+3];continue;}
      const push=(1-(dist/r)*(dist/r))*.28;
      const spx=clamp(Math.round(px-dx*push),0,w-1),spy=clamp(Math.round(py-dy*push),0,h-1);
      const i=(py*w+px)*4,si=(spy*w+spx)*4;
      dst.data[i]=src.data[si];dst.data[i+1]=src.data[si+1];dst.data[i+2]=src.data[si+2];dst.data[i+3]=src.data[si+3];
    }
    sCtx.putImageData(dst,x0,y0);
  }
  function doScratch(x1,y1,x2,y2){
    if(Math.hypot(x2-x1,y2-y1)<.5)return;
    const angle=Math.atan2(y2-y1,x2-x1),perp=angle+Math.PI/2;
    const pc=Math.cos(perp),ps=Math.sin(perp),numLines=Math.max(4,Math.floor(brushSize*.55)),spread=brushSize*.9;
    sCtx.save();sCtx.lineCap='butt';
    for(let i=0;i<numLines;i++){
      const t=(i/(numLines-1))-.5,offset=t*spread;
      const n=noise2(x1*.04+i*3.1,y1*.04+i*7.3);
      const nx1=x1+pc*offset,ny1=y1+ps*offset,nx2=x2+pc*offset,ny2=y2+ps*offset;
      sCtx.globalAlpha=.45+n*.35;
      sCtx.strokeStyle=`hsl(215,8%,${clamp(Math.round(n*22+4),4,26)}%)`;
      sCtx.lineWidth=.4+n*1.1;
      sCtx.beginPath();sCtx.moveTo(nx1,ny1);sCtx.lineTo(nx2,ny2);sCtx.stroke();
      if(n>.64){
        sCtx.globalAlpha=clamp((n-.64)*2.5,0,1)*.75;
        sCtx.strokeStyle=`rgb(${160+Math.round((n-.64)*200)},${165+Math.round((n-.64)*190)},${175+Math.round((n-.64)*180)})`;
        sCtx.lineWidth=.2+n*.3;
        sCtx.beginPath();sCtx.moveTo(nx1,ny1);sCtx.lineTo(nx2,ny2);sCtx.stroke();
      }
    }
    const grainCount=Math.floor(Math.hypot(x2-x1,y2-y1)*brushSize*.04);
    for(let g=0;g<grainCount;g++){
      const gt=Math.random(),n=noise2(g*7.1,gt*13.3);
      sCtx.globalAlpha=n*.2;sCtx.fillStyle='rgba(180,185,195,1)';
      const gx=x1+(x2-x1)*gt+(Math.random()-.5)*spread*.8,gy=y1+(y2-y1)*gt+(Math.random()-.5)*spread*.8;
      sCtx.fillRect(gx,gy,.8,.8);
    }
    sCtx.restore();
  }
  function doForge(x1,y1,x2,y2){
    if(Math.hypot(x2-x1,y2-y1)<.5)return;
    const dist=Math.hypot(x2-x1,y2-y1),angle=Math.atan2(y2-y1,x2-x1),perp=angle+Math.PI/2;
    const pc=Math.cos(perp),ps=Math.sin(perp);
    sCtx.save();sCtx.lineCap='round';sCtx.lineJoin='round';
    for(let p=0;p<4;p++){
      const n=noise2(x1*.022+p*4.3,y1*.022+p*2.7);
      sCtx.globalAlpha=.38+n*.18;sCtx.strokeStyle=`hsl(215,6%,${5+Math.round(n*9)}%)`;
      sCtx.lineWidth=brushSize*.5+n*brushSize*.35;
      sCtx.beginPath();sCtx.moveTo(x1+pc*(n-.5)*brushSize*.28,y1+ps*(n-.5)*brushSize*.28);
      sCtx.lineTo(x2+pc*(n-.5)*brushSize*.28,y2+ps*(n-.5)*brushSize*.28);sCtx.stroke();
    }
    const patchCount=Math.ceil(dist/12);
    const[fr,fg,fb]=hexToRgb(activeColor);
    for(let i=0;i<patchCount;i++){
      const t=i/patchCount,n=noise2(i*5.1,x1*.03);
      const px=x1+(x2-x1)*t+(Math.random()-.5)*brushSize*.4,py=y1+(y2-y1)*t+(Math.random()-.5)*brushSize*.4;
      sCtx.globalAlpha=.08+n*.12;
      sCtx.fillStyle=`rgb(${clamp(fr+Math.round(n*40-20),0,255)},${clamp(fg+Math.round(n*20-10),0,255)},${clamp(fb+Math.round(n*10-5),0,255)})`;
      sCtx.beginPath();sCtx.arc(px,py,brushSize*.18+n*brushSize*.15,0,Math.PI*2);sCtx.fill();
    }
    sCtx.shadowBlur=brushSize*.9;sCtx.shadowColor=activeColor;sCtx.globalAlpha=.28;sCtx.strokeStyle=activeColor;
    sCtx.lineWidth=Math.max(.6,brushSize*.07);
    sCtx.beginPath();sCtx.moveTo(x1,y1);sCtx.lineTo(x2,y2);sCtx.stroke();
    sCtx.shadowBlur=0;sCtx.globalAlpha=.45;sCtx.strokeStyle='rgba(160,170,180,.7)';sCtx.lineWidth=Math.max(.4,brushSize*.05);
    sCtx.beginPath();sCtx.moveTo(x1,y1);sCtx.lineTo(x2,y2);sCtx.stroke();
    const pitCount=Math.ceil(dist/(brushSize*.6));
    for(let i=0;i<pitCount;i++){
      const gt=(i+.5)/pitCount;
      const hx=x1+(x2-x1)*gt+(noise2(i*5.1,x1*.03)-.5)*brushSize*.35;
      const hy=y1+(y2-y1)*gt+(noise2(y1*.03,i*5.7)-.5)*brushSize*.35;
      const pr=brushSize*.04+noise2(hx*.1,hy*.1)*brushSize*.08;
      sCtx.globalAlpha=.5;sCtx.fillStyle='rgba(0,0,0,.8)';sCtx.beginPath();sCtx.arc(hx,hy,pr,0,Math.PI*2);sCtx.fill();
      sCtx.globalAlpha=.3;sCtx.strokeStyle='rgba(200,210,220,.6)';sCtx.lineWidth=.4;
      sCtx.beginPath();sCtx.arc(hx,hy,pr,0,Math.PI*2);sCtx.stroke();
    }
    sCtx.restore();
  }
  function doPrism(x1,y1,x2,y2){
    if(Math.hypot(x2-x1,y2-y1)<.5)return;
    const angle=Math.atan2(y2-y1,x2-x1),perp=angle+Math.PI/2;
    const pc=Math.cos(perp),ps=Math.sin(perp),lw=Math.max(1,brushSize*.35);
    const splits=[[-1.5,'rgba(255,60,80,.5)'],[-.5,'rgba(255,255,80,.4)'],[0,'rgba(255,255,255,.65)'],
                  [.5,'rgba(80,200,255,.4)'],[1.5,'rgba(140,80,255,.5)']];
    sCtx.save();sCtx.lineCap='round';sCtx.lineJoin='round';sCtx.lineWidth=lw;
    for(const[off,col]of splits){
      const ox=pc*off*brushSize*.38,oy=ps*off*brushSize*.38;
      sCtx.strokeStyle=col;sCtx.shadowBlur=brushSize*.7;sCtx.shadowColor=col;
      sCtx.beginPath();sCtx.moveTo(x1+ox,y1+oy);sCtx.lineTo(x2+ox,y2+oy);sCtx.stroke();
    }
    sCtx.restore();
  }
  function doInkSpread(cx,cy){
    const[fr,fg,fb]=hexToRgb(activeColor),r=Math.round(brushSize*.8);
    const x0=Math.max(0,cx-r),y0=Math.max(0,cy-r);
    const sw=Math.min(r*2,staticCanvas.width-x0),sh=Math.min(r*2,staticCanvas.height-y0);
    if(sw<1||sh<1)return;
    const img=sCtx.getImageData(x0,y0,sw,sh),data=img.data;
    for(let py=0;py<sh;py++) for(let px=0;px<sw;px++){
      const dist=Math.hypot(px+x0-cx,py+y0-cy);if(dist>r)continue;
      const i=(py*sw+px)*4,alpha=Math.pow(1-dist/r,1.5);
      data[i]=lerp(data[i],fr,alpha*.9);data[i+1]=lerp(data[i+1],fg,alpha*.9);
      data[i+2]=lerp(data[i+2],fb,alpha*.9);data[i+3]=clamp(data[i+3]+alpha*200,0,255);
    }
    sCtx.putImageData(img,x0,y0);
    for(let step=0;step<5;step++){
      const img2=sCtx.getImageData(x0,y0,sw,sh),d2=img2.data,out=new Uint8ClampedArray(d2.length);
      for(let py=1;py<sh-1;py++) for(let px=1;px<sw-1;px++){
        const dist=Math.hypot(px+x0-cx,py+y0-cy);if(dist>r*1.4)continue;
        const i=(py*sw+px)*4,n=noise2((px+x0)*.08,(py+y0)*.08+step*.3);
        const nb=n>.5?[-1,0,1,0,0,-1,0,1]:[-1,-1,1,-1,-1,1,1,1];
        let ra=0,ga=0,ba=0,aa=0;
        for(let k=0;k<nb.length;k+=2){const ni=((py+nb[k+1])*sw+(px+nb[k]))*4;ra+=d2[ni];ga+=d2[ni+1];ba+=d2[ni+2];aa+=d2[ni+3];}
        const bl=.3+n*.2;
        out[i]=lerp(d2[i],ra/4,bl);out[i+1]=lerp(d2[i+1],ga/4,bl);
        out[i+2]=lerp(d2[i+2],ba/4,bl);out[i+3]=lerp(d2[i+3],aa/4,bl*.6);
        if(out[i+3]===0){out[i]=d2[i];out[i+1]=d2[i+1];out[i+2]=d2[i+2];}
      }
      for(let i=0;i<d2.length;i+=4)if(out[i+3]>0){d2[i]=out[i];d2[i+1]=out[i+1];d2[i+2]=out[i+2];d2[i+3]=out[i+3];}
      sCtx.putImageData(img2,x0,y0);
    }
  }

  /* ═══════════════════════════════ SELECTION ═══════════════════════════════ */
  function selNorm(){
    // normalize: return {x,y,w,h} always positive
    return {x:Math.round(Math.min(selX,selX+selW)),y:Math.round(Math.min(selY,selY+selH)),
            w:Math.abs(Math.round(selW)),h:Math.abs(Math.round(selH))};
  }
  function commitSel(){
    if(selImage){
      const{x,y}=selNorm();sCtx.putImageData(selImage,x,y);selImage=null;
    }
    selActive=false;selMoving=false;selDragging=false;selW=0;selH=0;
  }
  function liftSel(){
    const{x,y,w,h}=selNorm();if(w<2||h<2)return;
    selImage=sCtx.getImageData(x,y,w,h);
    sCtx.save();sCtx.globalCompositeOperation='destination-out';sCtx.fillRect(x,y,w,h);sCtx.restore();
    selX=x;selY=y;selW=w;selH=h;selMoving=true;
  }
  function doInvertSel(){
    if(!selActive)return;
    const{x,y,w,h}=selNorm();if(w<2||h<2)return;
    saveUndo();
    // invert directly on static canvas (no need to commit first)
    const img=sCtx.getImageData(x,y,w,h),data=img.data;
    for(let i=0;i<data.length;i+=4){data[i]=255-data[i];data[i+1]=255-data[i+1];data[i+2]=255-data[i+2];}
    sCtx.putImageData(img,x,y);
  }
  function inSelBounds(x,y){
    if(!selActive)return false;
    const{x:sx,y:sy,w,h}=selNorm();
    return x>=sx&&x<=sx+w&&y>=sy&&y<=sy+h;
  }

  /* ═══════════════════════════════ CELL TOOLS ═══════════════════════════════ */
  function doTrace(x,y){
    if(Math.hypot(x-lastX,y-lastY)<1)return;
    const{col,row}=pixToCell(x,y);
    const deg=((Math.atan2(y-lastY,x-lastX)*180/Math.PI)+360)%360;
    cells.set(cellKey(col,row),{col,row,char:DIR_CHARS[Math.round(deg/45)%8],color:activeColor,
      anim:'trace',t0:performance.now(),phase:noise2(col,row)*Math.PI*2,extra:{}});
  }
  function doSigil(cx,cy){
    const{col:cc,row:rc}=pixToCell(cx,cy),seed=noise2(cx*.04,cy*.04),sides=3+Math.floor(seed*5),R=Math.ceil(brushSize*1.4/CELL_W);
    for(let i=0;i<64;i++){const a=i/64*Math.PI*2;lineCells(cc,rc,cc+Math.round(Math.cos(a)*R),rc+Math.round(Math.sin(a)*R),'sigil',activeColor,cells);}
    for(let i=0;i<=sides;i++){
      const a0=i/sides*Math.PI*2-Math.PI/2,a1=(i+1)/sides*Math.PI*2-Math.PI/2;
      lineCells(cc+Math.round(Math.cos(a0)*R),rc+Math.round(Math.sin(a0)*R),
                cc+Math.round(Math.cos(a1)*R),rc+Math.round(Math.sin(a1)*R),'sigil',activeColor,cells);}
    const skip=Math.max(2,Math.floor(sides/2));
    for(let i=0;i<sides;i++){
      const a0=i*skip/sides*Math.PI*2-Math.PI/2,a1=(i+1)*skip/sides*Math.PI*2-Math.PI/2;
      lineCells(cc+Math.round(Math.cos(a0)*R),rc+Math.round(Math.sin(a0)*R),
                cc+Math.round(Math.cos(a1)*R),rc+Math.round(Math.sin(a1)*R),'sigil',activeColor,cells);}
    cells.set(cellKey(cc,rc),{col:cc,row:rc,char:ASCII_CHARS[Math.floor(seed*ASCII_CHARS.length)%ASCII_CHARS.length],
      color:activeColor,anim:'pulse',t0:performance.now(),phase:0,extra:{}});
  }

  /* ═══════════════════════════════ MATH TOOLS ═══════════════════════════════ */
  function doWave(cx,cy){
    const{col:cc,row:rc}=pixToCell(cx,cy),R=Math.ceil(brushSize*2.2/CELL_W);
    for(let dc=-R;dc<=R;dc++) for(let dr=-R;dr<=R;dr++)
      if(Math.hypot(dc,dr)<=R)setCell(cc+dc,rc+dr,'wave',activeColor,{cx:cc,cy:rc});
  }
  function doSpiral(cx,cy){
    const{col:cc,row:rc}=pixToCell(cx,cy),g=Math.PI*(3-Math.sqrt(5)),R=Math.round(brushSize*2.2/CELL_W),n=R*R*3;
    for(let i=0;i<n;i++){const r=Math.sqrt(i/n)*R,a=i*g;
      setCell(cc+Math.round(Math.cos(a)*r),rc+Math.round(Math.sin(a)*r*(CELL_W/CELL_H)),'spiral',activeColor,{phase:a});}
  }
  function doLissajous(cx,cy){
    const seed=noise2(cx*.02,cy*.02),a=1+Math.floor(seed*4),b=1+Math.floor(noise2(cx*.02+7,cy*.02)*4);
    const delta=noise2(cx*.015,cy*.015+3)*Math.PI,R=Math.round(brushSize*2.4/CELL_W);
    const{col:cc,row:rc}=pixToCell(cx,cy);
    for(let i=0;i<400;i++){const ang=i/400*Math.PI*2;
      setCell(cc+Math.round(Math.sin(a*ang+delta)*R),rc+Math.round(Math.sin(b*ang)*R*(CELL_W/CELL_H)),'lissa',activeColor,{phase:ang});}
  }
  function doSym(x1,y1,x2,y2){
    const cx=staticCanvas.width/2,cy=staticCanvas.height/2,tx1=x1-cx,ty1=y1-cy,tx2=x2-cx,ty2=y2-cy;
    sCtx.save();sCtx.lineCap='round';sCtx.lineJoin='round';
    for(let pass=0;pass<2;pass++){
      sCtx.strokeStyle=pass===0?activeColor:'rgba(255,255,255,.5)';
      sCtx.lineWidth=pass===0?brushSize*.5:Math.max(.4,brushSize*.07);
      sCtx.shadowBlur=pass===0?brushSize*3:0;sCtx.shadowColor=activeColor;
      for(let i=0;i<6;i++){
        const a=i/6*Math.PI*2,cos=Math.cos(a),sin=Math.sin(a);
        sCtx.beginPath();sCtx.moveTo(cx+tx1*cos-ty1*sin,cy+tx1*sin+ty1*cos);sCtx.lineTo(cx+tx2*cos-ty2*sin,cy+tx2*sin+ty2*cos);sCtx.stroke();
        sCtx.beginPath();sCtx.moveTo(cx-tx1*cos-ty1*sin,cy+tx1*sin-ty1*cos);sCtx.lineTo(cx-tx2*cos-ty2*sin,cy+tx2*sin-ty2*cos);sCtx.stroke();
      }
    }
    sCtx.restore();
  }

  /* ═══════════════════════════════ DISPATCH ═══════════════════════════════ */
  let mathThresh=0;
  function onDown(x,y){
    mathThresh=0;
    if(activeTool==='select'){
      if(selActive&&inSelBounds(x,y)){liftSel();selOffX=x-selX;selOffY=y-selY;}
      else{commitSel();selX=x;selY=y;selW=0;selH=0;selActive=true;selDragging=true;}
      return;
    }
    if(activeTool==='move'){if(selActive&&!selMoving)liftSel();selOffX=x-selX;selOffY=y-selY;return;}
    switch(activeTool){
      case 'brush':   saveUndo();doStroke(x,y,x,y);break;
      case 'neon':    saveUndo();doNeon(x,y,x,y);break;
      case 'scratch': saveUndo();break;
      case 'forge':   saveUndo();break;
      case 'spray':   saveUndo();doSpray(x,y);break;
      case 'circuit': saveUndo();break;
      case 'prism':   saveUndo();break;
      case 'ink':     saveUndo();doInkSpread(x,y);break;
      case 'glitch':  saveUndo();doGlitch(x,y);break;
      case 'smear':   saveUndo();break;
      case 'warp':    saveUndo();warpPrev={x,y};doWarp(x,y);break;
      case 'fill':    saveUndo();floodFill(sCtx,x,y,activeColor);break;
      case 'eraser':  saveUndo();doEraser(x,y);break;
      case 'ascii':   saveUndo();paintRadius(x,y,'cycle',brushSize*.8);break;
      case 'flow':    saveUndo();paintRadius(x,y,'flow',brushSize*.8);break;
      case 'trace':   saveUndo();break;
      case 'sigil':   saveUndo();doSigil(x,y);break;
      case 'swarm':   saveUndo();spawnSwarm(x,y);break;
      case 'flock':   saveUndo();spawnFlock(x,y);break;
      case 'mold':    saveUndo();spawnMold(x,y);break;
      case 'drift':   saveUndo();spawnDrift(x,y);break;
      case 'wave':    saveUndo();doWave(x,y);break;
      case 'spiral':  saveUndo();doSpiral(x,y);break;
      case 'lissa':   saveUndo();doLissajous(x,y);break;
      case 'sym':     saveUndo();break;
    }
  }
  function onMove(x,y){
    const d=Math.hypot(x-lastX,y-lastY);
    if(activeTool==='select'){
      if(selDragging){selW=x-selX;selH=y-selY;}
      else if(selMoving&&selImage){selX=x-selOffX;selY=y-selOffY;}
      lastX=x;lastY=y;return;
    }
    if(activeTool==='move'&&selImage){selX=x-selOffX;selY=y-selOffY;lastX=x;lastY=y;return;}
    if(activeTool==='warp')warpPrev={x,y};
    switch(activeTool){
      case 'brush':   doStroke(lastX,lastY,x,y);break;
      case 'neon':    doNeon(lastX,lastY,x,y);break;
      case 'scratch': doScratch(lastX,lastY,x,y);break;
      case 'forge':   doForge(lastX,lastY,x,y);break;
      case 'prism':   doPrism(lastX,lastY,x,y);break;
      case 'spray':   doSpray(x,y);break;
      case 'eraser':  doEraser(x,y);break;
      case 'circuit': doCircuit(lastX,lastY,x,y);break;
      case 'glitch':  doGlitch(x,y);break;
      case 'smear':   doSmear(x,y);break;
      case 'warp':    doWarp(x,y);break;
      case 'ascii':   paintRadius(x,y,'cycle',brushSize*.8);break;
      case 'flow':    paintRadius(x,y,'flow',brushSize*.8);break;
      case 'trace':   doTrace(x,y);break;
      case 'swarm':   spawnSwarm(x,y);break;
      case 'flock':   spawnFlock(x,y);break;
      case 'mold':    spawnMold(x,y);break;
      case 'drift':   spawnDrift(x,y);break;
      case 'sym':     doSym(lastX,lastY,x,y);break;
      case 'wave':    {mathThresh+=d;if(mathThresh>brushSize*1.5){doWave(x,y);mathThresh=0;}break;}
      case 'spiral':  {mathThresh+=d;if(mathThresh>brushSize*3){doSpiral(x,y);mathThresh=0;}break;}
      case 'lissa':   {mathThresh+=d;if(mathThresh>brushSize*3){doLissajous(x,y);mathThresh=0;}break;}
      case 'sigil':   {mathThresh+=d;if(mathThresh>brushSize*2.5){doSigil(x,y);mathThresh=0;}break;}
      case 'ink':     {mathThresh+=d;if(mathThresh>brushSize*1.5){doInkSpread(x,y);mathThresh=0;}break;}
    }
    lastX=x;lastY=y;
  }

  canvas.addEventListener('pointerdown',e=>{
    e.preventDefault();const r=canvas.getBoundingClientRect();
    const x=e.clientX-r.left,y=e.clientY-r.top;
    isDrawing=true;lastX=x;lastY=y;onDown(x,y);
    if(activeTool==='spray')loopTimer=setInterval(()=>doSpray(lastX,lastY),28);
  },{passive:false});
  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
    if(activeTool==='warp')warpPrev={x,y};
    if(!isDrawing){lastX=x;lastY=y;return;}
    e.preventDefault();onMove(x,y);
  },{passive:false});
  function stopDraw(){isDrawing=false;if(loopTimer){clearInterval(loopTimer);loopTimer=null;}}
  canvas.addEventListener('pointerup',e=>{
    stopDraw();
    if(activeTool==='select'){selDragging=false;if(Math.abs(selW)<4&&Math.abs(selH)<4)selActive=false;}
    if(activeTool==='warp')warpPrev=null;
  });
  canvas.addEventListener('pointerleave',()=>{stopDraw();warpPrev=null;});

  /* ═══════════════════════════════ GALLERY ═══════════════════════════════ */
  // Transparent floating column — no panel background, images + text directly visible
  const galleryPanel=div({
    position:'fixed',right:'20px',top:'90px',
    width:'210px',maxHeight:'calc(100vh - 110px)',
    zIndex:'100000',display:'none',flexDirection:'column',gap:'7px',
    overflowY:'auto',overflowX:'hidden',scrollbarWidth:'none',
    pointerEvents:'auto',fontFamily:DS_FONT,
  });
  galleryPanel.id='ds-gallery-panel';
  let galleryOpen=false;

  function toggleGallery(force){
    galleryOpen=force!==undefined?force:!galleryOpen;
    if(galleryOpen){
      galleryPanel.style.display='flex';
      renderGalleryItems();
    }else{
      galleryPanel.style.display='none';
    }
  }

  // Empty state
  const galEmpty=div({
    textAlign:'right',padding:'10px 0',color:'rgba(230,232,240,0.2)',
    fontSize:'7.5px',lineHeight:'1.8',fontFamily:DS_FONT,
  });
  galEmpty.innerHTML='no drawings yet<br>save one from the studio';

  function isAdmin(){return localStorage.getItem('ericjoo_admin')==='ej2025';}
  let adminCached=false;
  async function checkAdminStatus(){adminCached=isAdmin();}

  async function renderGalleryItems(){
    await checkAdminStatus();
    galleryPanel.innerHTML='';
    const items=await galleryLoad();
    if(!items.length){galleryPanel.appendChild(galEmpty);return;}
    for(const item of items){
      const wrap=div({position:'relative',borderRadius:'5px',overflow:'hidden',
        border:'1px solid rgba(230,232,240,0.1)',cursor:'pointer',
        transition:'border-color 120ms',flexShrink:'0'});
      const img=mk('img',{width:'100%',display:'block'});
      img.src=item.dataUrl;
      const footer=div({
        padding:'3px 0',fontSize:'6.5px',color:'rgba(230,232,240,0.35)',
        textAlign:'right',userSelect:'none',fontFamily:DS_FONT,letterSpacing:'.04em',
      });
      footer.textContent=new Date(item.ts).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      wrap.addEventListener('mouseenter',()=>wrap.style.borderColor='rgba(230,232,240,0.3)');
      wrap.addEventListener('mouseleave',()=>wrap.style.borderColor='rgba(230,232,240,0.1)');
      if(adminCached){
        const del=div({
          position:'absolute',top:'3px',left:'3px',
          background:'rgba(0,0,0,0.65)',color:'rgba(230,232,240,0.5)',
          fontSize:'8px',padding:'1px 5px',borderRadius:'3px',cursor:'pointer',
          border:'1px solid rgba(230,232,240,0.1)',userSelect:'none',display:'none',
        });
        del.textContent='×';
        del.addEventListener('click',e=>{
          e.stopPropagation();
          const arr=galleryLoad().filter(d=>d.id!==item.id);
          gallerySave(arr);renderGalleryItems();
        });
        wrap.addEventListener('mouseenter',()=>del.style.display='block');
        wrap.addEventListener('mouseleave',()=>del.style.display='none');
        wrap.appendChild(del);
      }
      img.addEventListener('click',()=>{
        const prev=div({position:'fixed',inset:'0',zIndex:'100002',background:'rgba(0,0,0,0.92)',
          display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'});
        const big=mk('img',{maxWidth:'90vw',maxHeight:'90vh',borderRadius:'6px',border:'1px solid rgba(230,232,240,0.14)'});
        big.src=item.dataUrl;prev.appendChild(big);
        prev.addEventListener('click',()=>prev.remove());
        document.body.appendChild(prev);
      });
      wrap.appendChild(img);
      galleryPanel.appendChild(wrap);
      galleryPanel.appendChild(footer);
    }
  }

  function saveToGallery(){
    const tmp=document.createElement('canvas');
    tmp.width=canvas.width;tmp.height=canvas.height;
    tmp.getContext('2d').drawImage(canvas,0,0);
    const scale=Math.min(1,800/tmp.width);
    const out=document.createElement('canvas');
    out.width=Math.round(tmp.width*scale);out.height=Math.round(tmp.height*scale);
    out.getContext('2d').drawImage(tmp,0,0,out.width,out.height);
    const dataUrl=out.toDataURL('image/jpeg',0.82);
    const arr=galleryLoad();
    arr.unshift({id:Date.now(),ts:Date.now(),dataUrl});
    while(arr.length>30)arr.pop();
    gallerySave(arr);
    toggleGallery(true);
  }

  document.body.appendChild(galleryPanel);

/* ═══════════════════════════════ TOOLBAR ═══════════════════════════════
     position: absolute inside the overlay (which is fixed inset:0)
     top/bottom anchor keeps it within viewport regardless of screen size
  ═══════════════════════════════════════════════════════════════════════ */
  const toolbar=glassPanel({
    position:'absolute',
    left:'35px',top:'121px',
    width:'130px',height:'auto',
    maxHeight:'calc(100vh - 140px)',
    display:'flex',flexDirection:'column',
    zIndex:'2',pointerEvents:'auto',
    overflowY:'auto',overflowX:'hidden',
    scrollbarWidth:'none',
  });
  toolbar.id='ds-toolbar';

  // inject scrollbar-hide CSS once
  if(!document.getElementById('ds-style')){
    const st=document.createElement('style');st.id='ds-style';
    st.textContent='#ds-toolbar::-webkit-scrollbar,#ds-gallery-panel::-webkit-scrollbar{display:none}';
    document.head.appendChild(st);
  }

  function iconSpan(name){
    const s=mk('span',{fontFamily:DS_ICONS,fontSize:'11px',lineHeight:'1',
      fontVariationSettings:"'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 20",
      display:'flex',alignItems:'center',pointerEvents:'none',flexShrink:'0'});
    s.textContent=name;return s;
  }
  function toolBtn(label,icon){
    const b=div({fontFamily:DS_FONT,fontSize:'7.5px',color:DS_FG,cursor:'pointer',
      padding:'3px 2px',borderRadius:'5px',border:'1px solid transparent',
      display:'flex',alignItems:'center',justifyContent:'center',gap:'3px',
      transition:'background 80ms,color 80ms,border-color 80ms',
      userSelect:'none',overflow:'hidden',boxSizing:'border-box',minHeight:'19px',minWidth:'0'});
    if(icon)b.appendChild(iconSpan(icon));
    const t=mk('span',{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:'0'});
    t.textContent=label;b.appendChild(t);return b;
  }
  function setActive(b,on){
    b.style.background =on?'rgba(230,232,240,0.09)':'transparent';
    b.style.color      =on?DS_BRIGHT:DS_FG;
    b.style.borderColor=on?'rgba(230,232,240,0.22)':'transparent';
  }

  const toolSections=[
    {label:'DRAW',tools:[
      {id:'brush',   label:'brush',   icon:'brush'},
      {id:'scratch', label:'scratch', icon:'texture'},
      {id:'spray',   label:'spray',   icon:'scatter_plot'},
      {id:'circuit', label:'circuit', icon:'developer_board'},
      {id:'ink',     label:'ink',     icon:'ink_highlighter'},
    ]},
    {label:'FX',tools:[
      {id:'glitch',  label:'glitch',  icon:'grain'},
      {id:'smear',   label:'smear',   icon:'swipe'},
      {id:'warp',    label:'warp',    icon:'motion_blur'},
      {id:'eraser',  label:'eraser',  icon:'ink_eraser'},
    ]},
    {label:'CELL',tools:[
      {id:'ascii',   label:'ascii'},  {id:'flow',    label:'flow'},
      {id:'trace',   label:'trace'},  {id:'swarm',   label:'swarm'},
      {id:'flock',   label:'flock'},  {id:'mold',    label:'mold'},
      {id:'drift',   label:'drift'},  {id:'spiral',  label:'spiral'},
    ]},
    {label:'SELECTION',tools:[
      {id:'select',  label:'select',  icon:'crop_free'},
      {id:'move',    label:'move',    icon:'open_with'},
    ]},
  ];

  const toolBtns={};
  function setTool(id){
    activeTool=id;
    canvas.style.cursor=id==='fill'?'cell':id==='select'||id==='move'?'default':'crosshair';
    if(id!=='select'&&id!=='move'&&selActive)commitSel();
    toolSections.forEach(({tools})=>tools.forEach(({id:tid})=>{if(toolBtns[tid])setActive(toolBtns[tid],tid===id);}));
  }

  for(const{label:sl,tools}of toolSections){
    toolbar.appendChild(secLabel(sl));
    const grid=div({display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px',marginBottom:'1px',minWidth:'0',width:'100%'});
    for(const{id,label,icon}of tools){
      const b=toolBtn(label,icon||null);
      b.addEventListener('click',()=>setTool(id));
      b.addEventListener('mouseenter',()=>{if(activeTool!==id)b.style.color=DS_BRIGHT;});
      b.addEventListener('mouseleave',()=>{if(activeTool!==id){b.style.color=DS_FG;setActive(b,false);}});
      toolBtns[id]=b;grid.appendChild(b);
    }
    toolbar.appendChild(grid);toolbar.appendChild(hairline());
  }

  // Selection actions
  toolbar.appendChild(secLabel('SELECTION'));
  const selActGrid=div({display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px',marginBottom:'1px',minWidth:'0',width:'100%'});
  const invBtn=toolBtn('invert','invert_colors');
  invBtn.title='Invert selection colors';
  invBtn.addEventListener('click',doInvertSel);
  const commitBtn=toolBtn('commit','check');
  commitBtn.addEventListener('click',commitSel);
  selActGrid.appendChild(invBtn);selActGrid.appendChild(commitBtn);
  toolbar.appendChild(selActGrid);
  toolbar.appendChild(hairline());

  // Sizes
  toolbar.appendChild(secLabel('SIZE'));
  const sizeRow=div({display:'flex',flexWrap:'wrap',gap:'2px',marginBottom:'2px'});
  const sizeBtns={};
  function setSize(val){brushSize=val;SIZES.forEach(({val:v})=>setActive(sizeBtns[v],v===val));}
  for(const{label,val}of SIZES){
    const b=toolBtn(label);b.style.padding='2px 3px';b.style.fontSize='7px';
    b.addEventListener('click',()=>setSize(val));
    b.addEventListener('mouseenter',()=>{if(brushSize!==val)b.style.color=DS_BRIGHT;});
    b.addEventListener('mouseleave',()=>{if(brushSize!==val){b.style.color=DS_FG;setActive(b,false);}});
    sizeBtns[val]=b;sizeRow.appendChild(b);
  }
  toolbar.appendChild(sizeRow);toolbar.appendChild(hairline());

  // Color grid
  toolbar.appendChild(secLabel('COLOR'));
  const swatchWrap=div({borderRadius:'6px',overflow:'hidden',border:DS_BORDER,marginBottom:'5px'});
  const swatchGrid=div({display:'grid',gridTemplateColumns:'repeat(4,1fr)'});
  const swatches=[];let customPicker=null;
  function setColor(hex){
    activeColor=hex;
    swatches.forEach(s=>{
      s.style.outline=s.dataset.color===hex?'2px solid rgba(255,255,255,0.8)':'none';
      s.style.position='relative';s.style.zIndex=s.dataset.color===hex?'1':'0';
    });
    if(customPicker)customPicker.value=hex;
  }
  for(const hex of PALETTE){
    const s=div({height:'11px',background:hex,cursor:'pointer',transition:'filter 50ms',boxSizing:'border-box'});
    s.dataset.color=hex;
    s.addEventListener('click',()=>setColor(hex));
    s.addEventListener('mouseenter',()=>s.style.filter='brightness(1.4)');
    s.addEventListener('mouseleave',()=>s.style.filter='');
    swatches.push(s);swatchGrid.appendChild(s);
  }
  swatchWrap.appendChild(swatchGrid);toolbar.appendChild(swatchWrap);

  customPicker=document.createElement('input');customPicker.type='color';customPicker.value='#e6e8f0';
  Object.assign(customPicker.style,{width:'100%',height:'18px',border:DS_BORDER,borderRadius:'4px',
    cursor:'pointer',background:'transparent',padding:'0 2px',boxSizing:'border-box',display:'block'});
  customPicker.addEventListener('input',()=>{activeColor=customPicker.value;swatches.forEach(s=>s.style.outline='none');});
  toolbar.appendChild(customPicker);
  overlay.appendChild(toolbar);

  /* ── top bar ── */
  const topBar=glassPanel({position:'absolute',top:'50px',right:'20px',
    display:'flex',gap:'8px',alignItems:'center',zIndex:'2',pointerEvents:'auto',padding:'6px 10px'});
  function ctrlBtn(label){
    const b=div({fontFamily:DS_FONT,fontSize:'8px',color:DS_FG,cursor:'pointer',
      whiteSpace:'nowrap',transition:'color 80ms',userSelect:'none'});
    b.textContent=label;
    b.addEventListener('mouseenter',()=>b.style.color=DS_BRIGHT);
    b.addEventListener('mouseleave',()=>b.style.color=DS_FG);
    return b;
  }
  const sep=()=>div({width:'1px',height:'9px',background:'rgba(230,232,240,0.12)',flexShrink:'0'});
  const undoBtn=ctrlBtn('undo'),clearBtn=ctrlBtn('clear'),saveBtn=ctrlBtn('save'),
        galBtn=ctrlBtn('gallery'),closeBtn=ctrlBtn('× close');
  undoBtn.addEventListener('click',undo);
  clearBtn.addEventListener('click',()=>{saveUndo();sCtx.clearRect(0,0,staticCanvas.width,staticCanvas.height);cells.clear();swarmParts=[];flockParts=[];moldParts=[];driftParts=[];commitSel();});
  saveBtn.addEventListener('click',saveToGallery);
  galBtn.addEventListener('click',()=>toggleGallery());
  closeBtn.addEventListener('click',()=>{overlay.style.display='none';});
  [undoBtn,sep(),clearBtn,sep(),saveBtn,sep(),galBtn,sep(),closeBtn].forEach(el=>topBar.appendChild(el));
  overlay.appendChild(topBar);

  window.addEventListener('keydown',e=>{
    if(overlay.style.display==='none')return;
    if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}
    if(e.key==='Escape'){
      if(selActive){commitSel();return;}
      overlay.style.display='none';
    }
    if((e.key==='Delete'||e.key==='Backspace')&&selActive){
      saveUndo();const{x,y,w,h}=selNorm();
      sCtx.save();sCtx.globalCompositeOperation='destination-out';sCtx.fillRect(x,y,w,h);sCtx.restore();
      commitSel();
    }
  });
  window.addEventListener('resize',()=>{
    if(overlay.style.display==='none')return;
    const saved=sCtx.getImageData(0,0,staticCanvas.width,staticCanvas.height);
    W=window.innerWidth;H=window.innerHeight;
    canvas.width=W;canvas.height=H;staticCanvas.width=W;staticCanvas.height=H;uiCanvas.width=W;uiCanvas.height=H;
    sCtx.putImageData(saved,0,0);
  });

  document.body.appendChild(overlay);
  setTool('brush');setSize(14);setColor('#e6e8f0');

  return{
    open(){
      overlay.style.display='block';
      if(!rafId)rafId=requestAnimationFrame(renderFrame);
      toggleGallery(true);
    }
  };
}
