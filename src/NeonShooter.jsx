import { useState, useEffect, useRef, useCallback } from "react";
import { SP } from "./sprites.js";

// ── SPRITE DATA ─────────────────────────────────────────
// Sprites imported from sprites.js

// ── MODULE-LEVEL IMAGE CACHE ─────────────────────────────
const IMG_CACHE={};

// ── CONSTANTS ───────────────────────────────────────────
const W=900,H=580,HUD_H=110,PLAY_H=470;
const JR=88,JSR=34;
const L_DEF={x:105,y:PLAY_H-85},R_DEF={x:W-105,y:PLAY_H-85};
const GEM_PULL=42,GEM_MAG=180,GEM_SPD=420;

// ── HEROES ──────────────────────────────────────────────
const HEROES=[
  {id:'axiom', name:'AXIOM',  sub:'Augmented Enforcer', col:'#ff2222',hp:160,spd:160,startW:'rifle',  skill:'ENERGY SHIELD',skillCD:8, skillD:'2s invincibility + aura burst',       pass:'-20% damage taken'},
  {id:'raven', name:'RAVEN',  sub:'Ghost Operative',    col:'#44ff44',hp:95, spd:255,startW:'dual',   skill:'GHOST DASH',   skillCD:4, skillD:'Dash toward aim + trail',              pass:'+40% move speed'},
  {id:'glitch',name:'GL1TCH', sub:'Rogue AI Fragment',  col:'#00aaff',hp:115,spd:195,startW:'shotgun',skill:'SYSTEM WIPE',  skillCD:14,skillD:'EMP destroys all nearby enemies',     pass:'15% stun on hit'},
];

// ── WEAPONS ─────────────────────────────────────────────
const WD={
  pistol: {n:'PISTOL', key:'w_pistol',  col:'#aaaaff',blen:12,r:[3,4.5,6],  d:[28,36,46],  spr:.04},
  dual:   {n:'DUAL',   key:'w_dual',    col:'#ff6644',blen:9, r:[9,12,16],  d:[14,18,23],  spr:.09,dual:true},
  rifle:  {n:'RIFLE',  key:'w_rifle',   col:'#ffaa00',blen:11,r:[13,17,22], d:[12,15,20],  spr:.06},
  shotgun:{n:'SHOTGUN',key:'w_shotgun', col:'#ff3333',blen:8, r:[1.6,2.1,2.8],d:[19,24,31],spr:.4,pellets:[8,9,11]},
  sniper: {n:'SNIPER', key:'w_sniper',  col:'#88ccff',blen:18,r:[1.0,1.5,2.2],d:[90,120,155],spr:.008,pierce:[4,6,9]},
  plasma: {n:'PLASMA', key:'w_plasma',  col:'#cc44ff',blen:10,r:[4.5,6.5,9],d:[30,40,52],  spr:.07, aoe:[36,50,65]},
  rocket: {n:'ROCKET', key:'w_rocket',  col:'#ff8833',blen:14,r:[0.7,1.1,1.6],d:[85,110,140],spr:.03,aoe:[88,112,140]},
};

// ── ENEMIES ─────────────────────────────────────────────
const ET={
  trooper:{hp:65, spd:82, dmg:8, sz:14,sc:10,xp:1,key:'e_trooper',col:'#884422',eye:'#ff4400',loot:.12},
  hunter: {hp:32, spd:158,dmg:12,sz:11,sc:15,xp:1,key:'e_hunter', col:'#224488',eye:'#0088ff',loot:.08},
  prime:  {hp:360,spd:45, dmg:28,sz:24,sc:55,xp:4,key:'e_prime',  col:'#446644',eye:'#44ff44',loot:.28},
  rocket: {hp:55, spd:50, dmg:0, sz:13,sc:28,xp:2,key:'e_rocket', col:'#663322',eye:'#ff6622',ranged:true,fireRate:1.5,range:320,loot:.15},
  disrupt:{hp:110,spd:125,dmg:18,sz:15,sc:45,xp:3,key:'e_disrupt',col:'#882244',eye:'#ff2255',shield:true,loot:.12},
  elite:  {hp:180,spd:110,dmg:22,sz:17,sc:80,xp:5,key:'e_elite',  col:'#442266',eye:'#aa22ff',loot:.2},
  colossus:{hp:1900,spd:52,dmg:35,sz:38,sc:600,xp:25,key:'e_colossus',col:'#224466',eye:'#ffffff',ranged:true,fireRate:.7,range:420,loot:1,boss:true},
};

// ── BARREL TYPES ────────────────────────────────────────
const BONUSES=[
  {id:'hp',    n:'MEDPACK',  col:'#00aaff', icon:'➕', effect:(p,s)=>{p.hp=Math.min(p.maxHp,p.hp+45);}},
  {id:'speed', n:'PHASE AMP',col:'#2dff6e', icon:'💨', effect:(p,s)=>{s.spdMult+=0.15;}},
  {id:'dmg',   n:'OVERCLOCK',col:'#ffd60a', icon:'⚡', effect:(p,s)=>{s.dmgMult+=0.2;}},
  {id:'shield',n:'SHIELD',   col:'#00aaff', icon:'🛡', effect:(p,s)=>{p.invincible=3.5;p.skillActive=3.5;}},
  {id:'magnet',n:'VORTEX',   col:'#cc44ff', icon:'🔮', effect:(p,s)=>{s.magMult+=1.5;}},
  {id:'xp',    n:'XP SURGE', col:'#ffd60a', icon:'◆', effect:(p,s)=>{p.xp+=40;}},
];
const BTYPES={
  fire:    {col:'#ff4400',glow:'#ff8800',r:80, dur:5,  icon:'🔥',n:'FIRE',    dmgPS:18,slow:0,  stun:0  },
  oil:     {col:'#886600',glow:'#ffcc00',r:90, dur:8,  icon:'⚫',n:'OIL',     dmgPS:0, slow:.72,stun:0  },
  freeze:  {col:'#0088ff',glow:'#88eeff',r:75, dur:4,  icon:'❄',n:'CRYO',    dmgPS:4, slow:.88,stun:0  },
  electric:{col:'#ffff00',glow:'#00ffff',r:70, dur:2.5,icon:'⚡',n:'EMP',     dmgPS:12,slow:.2, stun:2.5},
  stun:    {col:'#cc00ff',glow:'#ff44ff',r:95, dur:3,  icon:'💜',n:'NEURAL',  dmgPS:6, slow:.5, stun:3.5},
};
const BARREL_CYCLE=['fire','oil','freeze','electric','stun'];

// ── PASSIVES ────────────────────────────────────────────
const PASSIVES=[
  {id:'hp',  n:'NEON CORE',   d:'+50 Max HP',         fx:'hp',  v:50},
  {id:'spd', n:'PHASE DRIVE', d:'+12% Move Speed',    fx:'spd', v:.12},
  {id:'dmg', n:'OVERCLOCK',   d:'+25% All Damage',    fx:'dmg', v:.25},
  {id:'cd',  n:'FAST CYCLE',  d:'-15% Cooldowns',     fx:'cd',  v:.15},
  {id:'pier',n:'RAILGUN MOD', d:'+1 Pierce',          fx:'pierce',v:1},
  {id:'mag', n:'GEM VORTEX',  d:'Gem magnet ×2',      fx:'mag', v:2},
  {id:'reg', n:'NANO MEND',   d:'Regen 3 HP / 5s',    fx:'regen',v:3},
  {id:'aoe', n:'WIDE BURST',  d:'AOE radius +25px',   fx:'area', v:25},
];
const XP_PER_LEVEL=[0,120,300,600];

// ── UTILS ────────────────────────────────────────────────
const d2=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const rnd=n=>Math.random()*n;
const rndI=n=>Math.floor(Math.random()*n);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ── LIGHTNING ────────────────────────────────────────────
function mkBolt(x1,y1,x2,y2,d,s){if(!d)return[{x:x1,y:y1},{x:x2,y:y2}];const mx=(x1+x2)/2+(Math.random()-.5)*s,my=(y1+y2)/2+(Math.random()-.5)*s;return[...mkBolt(x1,y1,mx,my,d-1,s*.62).slice(0,-1),...mkBolt(mx,my,x2,y2,d-1,s*.62)];}
function sBolt(ctx,p){if(!p||p.length<2)return;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.stroke();}

// ── WAVE ─────────────────────────────────────────────────
function genWave(wave){
  if(wave%5===0){const q=[{type:'colossus',delay:.5}];for(let i=0;i<6;i++)q.push({type:'trooper',delay:1+i*.4});return q;}
  const counts={trooper:Math.min(5+wave*3,28),hunter:wave>=3?Math.min((wave-2)*2,14):0,prime:wave>=5?Math.min(Math.floor((wave-4)*.9),8):0,rocket:wave>=6?Math.min(Math.floor((wave-5)*.8),6):0,disrupt:wave>=8?Math.min(wave-7,5):0,elite:wave>=10?Math.min(wave-9,4):0};
  let delay=0,q=[];Object.entries(counts).forEach(([type,cnt])=>{for(let i=0;i<cnt;i++){q.push({type,delay});delay+=.24+rnd(.44);}});
  return q.sort((a,b)=>a.delay-b.delay);
}
function spawnEnemy(G,type){
  const side=rndI(4);let x,y;const m=38;
  if(side===0){x=rnd(W);y=-m;}else if(side===1){x=W+m;y=rnd(H);}else if(side===2){x=rnd(W);y=H+m;}else{x=-m;y=rnd(H);}
  const E=ET[type];
  G.enemies.push({id:G.nid++,type,x,y,hp:E.hp,maxHp:E.hp,angle:0,fireTimer:rnd(2),stunned:0,slowed:0,frozen:0,shieldHP:E.shield?50:0,walkCycle:0,imgLoaded:false});
}

// ── BARRELS ──────────────────────────────────────────────
function spawnBarrels(G){
  G.barrels=[];
  // Random positions each wave — avoid center spawn area and edges
  const margin=60,cx=W/2,cy=PLAY_H/2,safeR=90;
  const positions=[];
  let attempts=0;
  while(positions.length<16&&attempts<200){
    attempts++;
    const x=margin+rnd(W-margin*2),y=margin+rnd(PLAY_H-margin*2);
    // Avoid center (player spawn) and existing barrels
    if(Math.hypot(x-cx,y-cy)<safeR)continue;
    if(positions.some(p=>Math.hypot(p[0]-x,p[1]-y)<80))continue;
    positions.push([x,y]);
  }
  // Shuffle barrel types
  const types=[...BARREL_CYCLE,...BARREL_CYCLE,...BARREL_CYCLE,...BARREL_CYCLE].slice(0,16).sort(()=>Math.random()-.5);
  positions.forEach(([x,y],i)=>G.barrels.push({x,y,type:types[i],active:false,life:0,zoneR:0,broken:false,pts:[]}));
}
function triggerBarrel(G,b){
  if(b.active||b.broken)return;
  const BT=BTYPES[b.type];
  b.active=true;b.life=BT.dur;b.zoneR=8;
  hitFX(G,b.x,b.y,BT.col,28);explode(G,b.x,b.y,42,BT.col);
  if(G.atmo)G.atmo.flash={col:BT.glow,life:0.32};
  if(b.type==='fire')G.barrels.forEach(b2=>{if(!b2.active&&!b2.broken&&b2.type==='oil'&&d2(b,b2)<110)setTimeout(()=>triggerBarrel(G,b2),350+Math.random()*300);});
}
function updateBarrels(G,dt){
  const p=G.player;const hero=HEROES.find(h=>h.id===G.hid);
  G.barrels.forEach(b=>{
    if(!b.active||b.broken)return;
    const BT=BTYPES[b.type];
    b.life-=dt;if(b.life<=0){b.broken=true;return;}
    b.zoneR=Math.min(BT.r,b.zoneR+BT.r*2.2*dt);
    // Add floating particles
    if(Math.random()<.25){const a=rnd(Math.PI*2),dist=rnd(b.zoneR*.7);b.pts.push({x:b.x+Math.cos(a)*dist,y:b.y+Math.sin(a)*dist,vx:(rnd(1)-.5)*25,vy:-18-rnd(55),life:.5+rnd(.8),col:BT.glow});}
    b.pts.forEach(pt=>{pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=55*dt;pt.life-=dt;});
    b.pts=b.pts.filter(pt=>pt.life>0);
    G.enemies.forEach(e=>{
      if(d2(b,e)>b.zoneR+ET[e.type].sz)return;
      if(BT.dmgPS>0)e.hp-=BT.dmgPS*dt;
      if(BT.slow>0)e.slowed=Math.max(e.slowed,.4);
      if(b.type==='freeze'){e.slowed=.95;e.frozen=Math.max(e.frozen,b.life*.5);}
      if(BT.stun>0&&Math.random()<.015)e.stunned=Math.max(e.stunned,BT.stun);
      if(b.type==='electric'&&Math.random()<.08&&G.atmo)G.atmo.lightning.push({pts:mkBolt(b.x,b.y,e.x,e.y,3,18),br:[],life:.1,ml:.1,col:'#00ffff'});
      if(e.hp<=0&&!e._dead){e._dead=true;}
    });
  });
}

// ── FX ───────────────────────────────────────────────────
function hitFX(G,x,y,col,n=8){
  for(let i=0;i<n;i++){const a=rnd(Math.PI*2),s=55+rnd(175);G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,sz:2+rnd(3),life:.4+rnd(.4)});}
  // Blood splatter on enemy hit
  for(let i=0;i<5;i++){const a=rnd(Math.PI*2),s=25+rnd(90);G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col:'#cc1111',sz:1.5+rnd(2.5),life:.3+rnd(.5),blood:true});}
}
function deathFX(G,x,y,sz){
  // Large blood burst
  for(let i=0;i<22;i++){const a=rnd(Math.PI*2),s=60+rnd(220);G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col:i<12?'#cc0000':'#880000',sz:2+rnd(5),life:.5+rnd(.8),blood:true});}
  // Persistent ground stain
  if(G.stains&&G.stains.length<120)G.stains.push({x:x+(rnd(1)-.5)*sz,y:y+(rnd(1)-.5)*sz*.5,rx:sz*.55+rnd(sz*.4),ry:sz*.25+rnd(sz*.2),rot:rnd(Math.PI),opacity:.55+rnd(.3)});
}
function explode(G,x,y,r,col){G.exps.push({x,y,r,col,life:r*.006,maxLife:r*.006});hitFX(G,x,y,col,20);}

// ── FIRE ─────────────────────────────────────────────────
function fireWeapon(G,wSlot,p,stats){
  const wd=WD[wSlot.id];const lv=wSlot.level-1;
  // Hitscan-feel: bullets travel 4x faster, shorter life
  const HITSCAN_MULT=4.2;
  const dmg=wd.d[lv]*stats.dmgMult;
  const pellets=wd.pellets?wd.pellets[lv]:1;
  const pierce=(wd.pierce?wd.pierce[lv]:0)+(stats.pierceAdd||0);
  const aoe=(wd.aoe?wd.aoe[lv]+(stats.aoeAdd||0):0);
  const offsets=wd.dual?[-9,9]:[0];
  offsets.forEach(off=>{
    const ox=Math.cos(p.angle+Math.PI/2)*off,oy=Math.sin(p.angle+Math.PI/2)*off;
    for(let pe=0;pe<pellets;pe++){
      const fa=p.angle+(Math.random()-.5)*wd.spr*2;const spd=(640+rnd(80))*HITSCAN_MULT;
      G.bullets.push({x:p.x+ox+Math.cos(p.angle)*16,y:p.y+oy+Math.sin(p.angle)*16,vx:Math.cos(fa)*spd,vy:Math.sin(fa)*spd,angle:fa,dmg,col:wd.col,len:wd.blen,pierce,aoe,pierced:[],life:1.4});
    }
  });
}
function getUpgrades(p){
  const c=[];const myW=p.weapons.map(w=>w.id);
  const upW=p.weapons.filter(w=>w.level<3);
  if(upW.length>0){const w=upW[rndI(upW.length)];c.push({type:'weapon_up',id:w.id,level:w.level+1,n:`↑ ${WD[w.id].n} LV${w.level+1}`,d:`Damage & fire rate up`,col:WD[w.id].col});}
  if(p.weapons.length<4){const avail=Object.keys(WD).filter(id=>!myW.includes(id));if(avail.length>0){const id=avail[rndI(avail.length)];c.push({type:'weapon_new',id,n:`+ ${WD[id].n}`,d:'Add new weapon',col:WD[id].col});}}
  const sh=[...PASSIVES].sort(()=>Math.random()-.5);
  while(c.length<3&&sh.length>0){const pp=sh.pop();c.push({type:'passive',...pp});}
  return c.slice(0,3);
}
function applyUpgrade(p,ch,stats){
  if(ch.type==='weapon_up'){const w=p.weapons.find(ww=>ww.id===ch.id);if(w)w.level=ch.level;}
  else if(ch.type==='weapon_new'){p.weapons.push({id:ch.id,level:1,fireT:0});}
  else{
    if(ch.fx==='hp'){p.maxHp+=ch.v;p.hp+=ch.v;}
    else if(ch.fx==='spd')stats.spdMult+=ch.v;
    else if(ch.fx==='dmg')stats.dmgMult+=ch.v;
    else if(ch.fx==='cd')stats.cdMult=Math.max(.35,stats.cdMult-ch.v);
    else if(ch.fx==='pierce')stats.pierceAdd++;
    else if(ch.fx==='mag')stats.magMult+=ch.v;
    else if(ch.fx==='area')stats.aoeAdd+=ch.v;
    else if(ch.fx==='regen')stats.regen+=ch.v;
  }
}

// ── MAIN ─────────────────────────────────────────────────
export default function NeonShooter(){
  // ── Start loading images immediately (sync, before any effects) ──
  if(Object.keys(IMG_CACHE).length===0){
    Object.entries(SP).forEach(([key,src])=>{
      const img=new Image();img.src=src;IMG_CACHE[key]=img;
    });
  }

  const [phase,setPhase]=useState('menu');
  const [ui,setUi]=useState({hp:160,maxHp:160,score:0,wave:1,kills:0,xp:0,xpNext:60,level:1,cdPct:0,waveMsg:'',boss:false,weapons:[]});
  const [heroSel,setHeroSel]=useState(null);
  const [upgrades,setUpgrades]=useState([]);
  const [imgs,setImgs]=useState({});  // loaded Image objects

  const cvs=useRef(null);
  const G=useRef(null);
  const raf=useRef(null);
  const keys=useRef({});
  const phaseR=useRef('menu');
  const imgsR=useRef({});

  // ── PRELOAD IMAGES (module-level cache, created immediately) ─────
  // IMG_CACHE is outside React — images start loading as soon as SP is defined
  useEffect(()=>{
    Object.entries(SP).forEach(([key,src])=>{
      if(!IMG_CACHE[key]){
        const img=new Image();
        img.src=src;
        IMG_CACHE[key]=img;
      }
    });
    imgsR.current=IMG_CACHE;
    // Keep polling until all loaded (for hero select screen)
    const poll=setInterval(()=>{
      const allLoaded=Object.values(IMG_CACHE).filter(img=>img.complete).length;
      console.log(`Images: ${allLoaded}/${Object.keys(IMG_CACHE).length} loaded`);
      if(allLoaded===Object.keys(IMG_CACHE).length){
        clearInterval(poll);
        setImgs({t:Date.now()});// trigger re-render of JSX
        console.log('All images loaded!');
      }
    },150);
    return()=>clearInterval(poll);
  },[]);

  const mkJoy=()=>({active:false,id:-1,baseX:0,baseY:0,stickX:0,stickY:0});

  // ── ATMOSPHERE + RAF ─────────────────────────────────────
  useEffect(()=>{
    const rain=[...Array(90).fill(null).map(()=>({x:rnd(W),y:rnd(H)-H,spd:260+rnd(200),len:16+rnd(42),op:.22+rnd(.42),w:1+rnd(.9),col:Math.random()>.5?'#00aaff':Math.random()>.5?'#8844ff':'#aabbff'})),...Array(30).fill(null).map(()=>({x:rnd(W),y:rnd(H)-H,spd:150+rnd(90),len:6+rnd(14),op:.06+rnd(.1),w:.5,col:'#6688aa'}))];
    const fog=Array(16).fill(null).map(()=>({x:rnd(W),y:rnd(H),rx:80+rnd(180),ry:18+rnd(55),dx:(rnd(1)-.5)*11,dy:(rnd(1)-.5)*4,op:.06+rnd(.12),col:['#0a0040','#001840','#06001a','#002020','#100028','#002808'][rndI(6)],ph:rnd(Math.PI*2)}));
    const bgT=Array(65).fill(null).map(()=>{const h=Math.random()>.5;return{x:rnd(W),y:rnd(H),len:12+rnd(110),h,col:['#00e5ff','#2dff6e','#bf5af2','#147aff','#ff4422','#ffaa00'][rndI(6)],op:.032+rnd(.072),dot:Math.random()>.4};});
    const atmo={rain,fog,bgT,lightning:[],lightT:1.2+rnd(1.5),t:0,splashes:[],splT:.06,flash:{col:'transparent',life:0}};

    const onKey=(e,v)=>{keys.current[e.code]=v;if(e.code==='Space'&&v)doSkill();};
    window.addEventListener('keydown',e=>onKey(e,true));
    window.addEventListener('keyup',e=>onKey(e,false));
    const onM=e=>{if(!cvs.current||!G.current?.mouse)return;const r=cvs.current.getBoundingClientRect();G.current.mouse={x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height),down:G.current.mouse.down};};
    const onMD=()=>{if(G.current?.mouse)G.current.mouse.down=true;};
    const onMU=()=>{if(G.current?.mouse)G.current.mouse.down=false;};
    window.addEventListener('mousemove',onM);window.addEventListener('mousedown',onMD);window.addEventListener('mouseup',onMU);

    const toC=t=>{if(!cvs.current)return{x:0,y:0};const r=cvs.current.getBoundingClientRect();return{x:(t.clientX-r.left)*(W/r.width),y:(t.clientY-r.top)*(H/r.height)};};
    const onTS=e=>{e.preventDefault();if(!G.current)return;Array.from(e.changedTouches).forEach(t=>{const{x,y}=toC(t);if(x<W/2){const bx=clamp(x,JR+10,W/2-JR-10),by=clamp(y,JR+10,H-JR-10);G.current.leftJoy={active:true,id:t.identifier,baseX:bx,baseY:by,stickX:x,stickY:y};}else{const bx=clamp(x,W/2+JR+10,W-JR-10),by=clamp(y,JR+10,H-JR-10);G.current.rightJoy={active:true,id:t.identifier,baseX:bx,baseY:by,stickX:x,stickY:y};}});};
    const onTM=e=>{e.preventDefault();if(!G.current)return;Array.from(e.changedTouches).forEach(t=>{const{x,y}=toC(t);if(G.current.leftJoy?.id===t.identifier){G.current.leftJoy.stickX=x;G.current.leftJoy.stickY=y;}else if(G.current.rightJoy?.id===t.identifier){G.current.rightJoy.stickX=x;G.current.rightJoy.stickY=y;}});};
    const onTE=e=>{e.preventDefault();if(!G.current)return;Array.from(e.changedTouches).forEach(t=>{if(G.current.leftJoy?.id===t.identifier)G.current.leftJoy=mkJoy();else if(G.current.rightJoy?.id===t.identifier)G.current.rightJoy=mkJoy();});};
    const canvas=cvs.current;
    if(canvas){canvas.addEventListener('touchstart',onTS,{passive:false});canvas.addEventListener('touchmove',onTM,{passive:false});canvas.addEventListener('touchend',onTE,{passive:false});canvas.addEventListener('touchcancel',onTE,{passive:false});}

    let prev=0;
    const loop=ts=>{const dt=Math.min((ts-prev)/1e3,.05);prev=ts;
      atmoTick(atmo,dt);
      if(G.current){G.current.atmo=atmo;}
      if(G.current&&phaseR.current==='playing')gameTick(dt);
      render(atmo);
      raf.current=requestAnimationFrame(loop);
    };
    raf.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener('keydown',e=>onKey(e,true));window.removeEventListener('keyup',e=>onKey(e,false));window.removeEventListener('mousemove',onM);window.removeEventListener('mousedown',onMD);window.removeEventListener('mouseup',onMU);if(canvas){canvas.removeEventListener('touchstart',onTS);canvas.removeEventListener('touchmove',onTM);canvas.removeEventListener('touchend',onTE);canvas.removeEventListener('touchcancel',onTE);}};
  },[]);

  function atmoTick(a,dt){
    a.t+=dt;
    a.rain.forEach(r=>{r.y+=r.spd*dt;if(r.y>H+r.len){r.y=-r.len;r.x=rnd(W);}});
    a.fog.forEach(f=>{f.x+=f.dx*dt;f.y+=f.dy*dt;f.ph+=dt*.22;if(f.x<-f.rx)f.x=W+f.rx;if(f.x>W+f.rx)f.x=-f.rx;});
    a.splT-=dt;if(a.splT<=0){a.splT=.04+rnd(.08);if(a.splashes.length<55)a.splashes.push({x:rnd(W),y:H-4-rnd(18),rx:.5,ry:.2,life:.32+rnd(.4),ml:.5,col:Math.random()>.5?'#00aaff':'#8844ff'});}
    a.splashes.forEach(s=>{s.rx+=50*dt;s.ry+=15*dt;s.life-=dt;});a.splashes=a.splashes.filter(s=>s.life>0);
    a.lightT-=dt;if(a.lightT<=0){const x1=rnd(W),pts=mkBolt(x1,-18,x1+(rnd(1)-.5)*200,H+18,6,100);const br=[];for(let b=0;b<3+rndI(3);b++){const idx=rndI(pts.length),pp=pts[idx];br.push(mkBolt(pp.x,pp.y,pp.x+(rnd(1)-.5)*125,pp.y+30+rnd(115),4,50));}const ml=.1+rnd(.14);a.lightning.push({pts,br,life:ml,ml,col:Math.random()>.4?'#8844ff':'#0088ff'});a.lightT=.28+rnd(1.4);}
    a.lightning=a.lightning.filter(l=>{l.life-=dt;return l.life>0;});
    if(a.flash.life>0)a.flash.life=Math.max(0,a.flash.life-dt*4);
  }

  function startGame(hid){
    const hero=HEROES.find(h=>h.id===hid);setHeroSel(hid);
    G.current={phase:'countdown',hid,
      player:{x:W/2,y:H/2,angle:-Math.PI/2,hp:hero.hp,maxHp:hero.hp,spd:hero.spd,weapons:[{id:hero.startW,level:1,fireT:0}],skillT:0,skillMaxT:hero.skillCD,invincible:0,skillActive:0,xp:0,xpNext:60,level:1,score:0,kills:0,regenT:0,walkCycle:0,isMoving:false},
      stats:{spdMult:1,dmgMult:1,cdMult:1,pierceAdd:0,magMult:1,aoeAdd:0,regen:0},
      enemies:[],bullets:[],eBullets:[],gems:[],parts:[],exps:[],barrels:[],drops:[],stains:[],
      wave:1,waveQ:[],spawnT:0,waveDone:false,waveMsg:'',waveMsgT:0,nid:1,
      mouse:{x:W/2,y:H/2,down:false},leftJoy:mkJoy(),rightJoy:mkJoy(),
      shake:{x:0,y:0,life:0,mag:0},atmo:null,
    };
    spawnBarrels(G.current);
    phaseR.current='playing';setPhase('playing');
    setTimeout(()=>{if(!G.current)return;G.current.phase='playing';G.current.waveQ=genWave(1);G.current.spawnT=0;G.current.waveMsg='WAVE 1';G.current.waveMsgT=2;},2200);
  }

  function doSkill(){
    if(phaseR.current!=='playing'||!G.current||G.current.phase!=='playing')return;
    const G2=G.current,p=G2.player;if(p.skillT>0)return;
    const hero=HEROES.find(h=>h.id===G2.hid);
    p.skillT=p.skillMaxT;
    if(hero.id==='axiom'){p.invincible=2.2;p.skillActive=p.invincible;G2.enemies.forEach(e=>{if(d2(p,e)<120){e.hp-=60;hitFX(G2,e.x,e.y,hero.col,10);}});explode(G2,p.x,p.y,120,hero.col);}
    else if(hero.id==='raven'){const rj=G2.rightJoy;const aimA=rj.active&&Math.hypot(rj.stickX-rj.baseX,rj.stickY-rj.baseY)>14?Math.atan2(rj.stickY-rj.baseY,rj.stickX-rj.baseX):p.angle;const dd=200;for(let i=0;i<8;i++)G2.parts.push({x:p.x-Math.cos(aimA)*i*22,y:p.y-Math.sin(aimA)*i*22,vx:0,vy:0,col:hero.col,sz:7,life:.8,trail:true});p.x=clamp(p.x+Math.cos(aimA)*dd,20,W-20);p.y=clamp(p.y+Math.sin(aimA)*dd,20,H-20);p.invincible=.4;p.skillActive=.4;G2.enemies.forEach(e=>{if(d2(p,e)<80)e.hp-=45;});}
    else{const r=190;G2.enemies.forEach(e=>{if(d2(p,e)<r){e.hp=0;hitFX(G2,e.x,e.y,hero.col,12);}});explode(G2,p.x,p.y,r,hero.col);p.skillActive=.6;}
  }

  function gameTick(dt){
    const G2=G.current;if(!G2||G2.phase!=='playing')return;
    const p=G2.player,stats=G2.stats;
    const hero=HEROES.find(h=>h.id===G2.hid);if(!hero)return;

    // Shake
    if(G2.shake.life>0){G2.shake.life-=dt;const m=G2.shake.life*G2.shake.mag;G2.shake.x=(rnd(1)-.5)*m;G2.shake.y=(rnd(1)-.5)*m;}else{G2.shake.x=0;G2.shake.y=0;}

    // Movement
    let mx=0,my=0;
    if(keys.current['KeyW']||keys.current['ArrowUp'])my-=1;
    if(keys.current['KeyS']||keys.current['ArrowDown'])my+=1;
    if(keys.current['KeyA']||keys.current['ArrowLeft'])mx-=1;
    if(keys.current['KeyD']||keys.current['ArrowRight'])mx+=1;
    const lj=G2.leftJoy;
    if(lj?.active){const jdx=lj.stickX-lj.baseX,jdy=lj.stickY-lj.baseY,jd=Math.hypot(jdx,jdy);if(jd>18){const ef=Math.min((jd-18)/(JR-18),1);mx=jdx/jd*ef;my=jdy/jd*ef;}}
    if(mx||my){const m=Math.hypot(mx,my)||1;mx/=m;my/=m;}
    const spd=p.spd*stats.spdMult;
    p.x=clamp(p.x+mx*spd*dt,16,W-16);p.y=clamp(p.y+my*spd*dt,16,H-16);
    p.isMoving=!!(mx||my);
    if(p.isMoving)p.walkCycle=(p.walkCycle||0)+9*dt;

    // Aim
    const rj=G2.rightJoy;let autoFire=false;
    if(rj?.active){const rdx=rj.stickX-rj.baseX,rdy=rj.stickY-rj.baseY,rd=Math.hypot(rdx,rdy);if(rd>18){const ta=Math.atan2(rdy,rdx);const diff=ta-p.angle;const wrap=((diff+Math.PI*3)%(Math.PI*2))-Math.PI;p.angle+=wrap*Math.min(1,dt*20);autoFire=true;}}
    else{const ta=ang(p,G2.mouse);const diff=ta-p.angle;const wrap=((diff+Math.PI*3)%(Math.PI*2))-Math.PI;p.angle+=wrap*Math.min(1,dt*20);if(G2.mouse.down)autoFire=true;}

    if(p.invincible>0)p.invincible-=dt;if(p.skillActive>0)p.skillActive-=dt;if(p.skillT>0)p.skillT-=dt;

    // Auto-fire all weapons
    if(autoFire){p.weapons.forEach(ws=>{ws.fireT-=dt;if(ws.fireT<=0){
          const wd=WD[ws.id];const rate=wd.r[ws.level-1]*stats.cdMult;
          fireWeapon(G2,ws,p,stats);ws.fireT=1/rate;
          // Recoil shake
          const kick=ws.id==='rocket'?8:ws.id==='shotgun'?5:ws.id==='sniper'?4:2;
          if(G2.shake.life<.14)G2.shake={x:0,y:0,life:.14,mag:kick};
          // Muzzle flash
          const mfx=p.x+Math.cos(p.angle)*22,mfy=p.y+Math.sin(p.angle)*22;
          const mfn=ws.id==='shotgun'?7:2;
          for(let i=0;i<mfn;i++){const a=p.angle+(rnd(1)-.5)*.7,s=70+rnd(110);G2.parts.push({x:mfx,y:mfy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col:i===0?'#ffffff':wd.col,sz:1.5+rnd(2.5),life:.06+rnd(.09)});}
        }});}
    else{p.weapons.forEach(ws=>{if(ws.fireT>0)ws.fireT-=dt;});}

    // Bullets
    G2.bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;});
    G2.eBullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;});
    G2.bullets=G2.bullets.filter(b=>b.life>0&&b.x>-20&&b.x<W+20&&b.y>-20&&b.y<H+20);if(G2.bullets.length>200)G2.bullets=G2.bullets.slice(-200);
    G2.eBullets=G2.eBullets.filter(b=>b.life>0&&b.x>-20&&b.x<W+20&&b.y>-20&&b.y<H+20);

    // Barrel hit
    G2.bullets.forEach(b=>{if(b.life<=0)return;G2.barrels.forEach(brl=>{if(!brl.active&&!brl.broken&&d2(b,brl)<22){triggerBarrel(G2,brl);b.life=0;}});});
    updateBarrels(G2,dt);

    // Bullet vs enemy
    G2.bullets.forEach(b=>{
      if(b.pierced&&b.pierced.length>b.pierce+1)return;
      for(let i=G2.enemies.length-1;i>=0;i--){
        const e=G2.enemies[i];if(b.pierced?.includes(e.id))continue;
        if(d2(b,e)<ET[e.type].sz+4){
          if(e.shieldHP>0){e.shieldHP=Math.max(0,e.shieldHP-b.dmg*.5);hitFX(G2,e.x,e.y,'#00aaff',4);}
          else{e.hp-=b.dmg;hitFX(G2,e.x,e.y,b.col,5);}
          if(hero.id==='glitch'&&Math.random()<.15)e.stunned=1.8;
          b.pierced=b.pierced||[];b.pierced.push(e.id);
          if(b.aoe){explode(G2,b.x,b.y,b.aoe,b.col);G2.enemies.forEach(e2=>{if(d2(b,e2)<b.aoe)e2.hp-=b.dmg*.5;});b.life=0;}
          else if(b.pierced.length>b.pierce)b.life=0;
          if(e.hp<=0){killEnemy(G2,e,p,hero);G2.enemies.splice(i,1);break;}
          else break;
        }
      }
    });

    // Enemy bullets vs player
    G2.eBullets.forEach(b=>{if(p.invincible>0)return;if(d2(b,p)<16){const def=hero.id==='axiom'?.8:1;p.hp=Math.max(0,p.hp-b.dmg*def);G2.shake={x:0,y:0,life:.35+b.dmg*.012,mag:8+b.dmg*.35};if(G2.atmo)G2.atmo.flash={col:'#ff2200',life:0.25};b.life=0;if(p.hp<=0){phaseR.current='gameover';setPhase('gameover');G2.phase='over';}}});

    // Enemy AI
    G2.enemies.slice().forEach(e=>{
      if(e.stunned>0){e.stunned-=dt;return;}
      if(e.frozen>0){e.frozen-=dt;e.slowed=1.0;return;}
      if(e.slowed>0)e.slowed-=dt;
      const espd=ET[e.type].spd*(e.slowed>0?1-Math.min(.95,e.slowed||0):.95+Math.random()*.1);
      const ea=ang(e,p);
      let sx=0,sy=0;
      G2.enemies.forEach(e2=>{if(e2!==e){const dd=d2(e,e2);if(dd<ET[e.type].sz*2.4&&dd>0){sx+=(e.x-e2.x)/dd;sy+=(e.y-e2.y)/dd;}}});
      const sm=Math.hypot(sx,sy)||1;
      e.x+=(Math.cos(ea)+sx/sm*.45)*espd*dt;e.y+=(Math.sin(ea)+sy/sm*.45)*espd*dt;
      e.angle=ea;e.walkCycle=(e.walkCycle||0)+espd*0.011*dt;
      if(ET[e.type].ranged){e.fireTimer-=dt;if(e.fireTimer<=0&&d2(e,p)<ET[e.type].range){e.fireTimer=1/ET[e.type].fireRate;const fa=ea+(rnd(1)-.5)*.22;G2.eBullets.push({x:e.x,y:e.y,vx:Math.cos(fa)*340,vy:Math.sin(fa)*340,angle:fa,dmg:ET[e.type].dmg,col:ET[e.type].eye,len:9,life:1.2});}}
      if(!ET[e.type].ranged&&d2(e,p)<ET[e.type].sz+13&&p.invincible<=0){const def=hero.id==='axiom'?.8:1;p.hp=Math.max(0,p.hp-ET[e.type].dmg*dt*1.8*def);G2.shake={x:0,y:0,life:.15,mag:4};if(G2.atmo&&Math.random()<.06)G2.atmo.flash={col:'#ff2200',life:.15};if(p.hp<=0){phaseR.current='gameover';setPhase('gameover');G2.phase='over';}}
    });

    // Gems
    G2.gems.forEach(gem=>{
      const dd=d2(gem,p),magR=GEM_MAG*stats.magMult;
      if(dd<GEM_PULL){p.xp+=gem.v;gem.collected=true;
        if(p.xp>=p.xpNext){p.xp-=p.xpNext;p.xpNext=Math.floor(p.xpNext*1.45);p.level++;const ch=getUpgrades(p);
          G2.phase='levelup';phaseR.current='levelup';
          // Use setTimeout 0 to ensure React batching completes
          setUpgrades(ch);
          setTimeout(()=>setPhase('levelup'),0);}
      }else if(dd<magR){const a2=ang(gem,p);const pull=Math.min(1,(magR-dd)/magR);gem.x+=Math.cos(a2)*GEM_SPD*pull*dt;gem.y+=Math.sin(a2)*GEM_SPD*pull*dt;}
      gem.life-=dt;
    });
    G2.gems=G2.gems.filter(g=>!g.collected&&g.life>0);if(G2.gems.length>150)G2.gems=G2.gems.slice(-150);
    G2.drops.forEach(d=>{
      if(d2(d,p)<26){
        if(d.bonus){
          d.bonus.effect(p,G2.stats);// apply bonus effect
          // Pickup flash
          if(G2.atmo)G2.atmo.flash={col:d.bonus.col,life:0.22};
        }else{
          p.hp=Math.min(p.maxHp,p.hp+d.amount);// HP drop
        }
        d.taken=true;
      }
    });
    G2.drops=G2.drops.filter(d=>!d.taken);
    if(stats.regen>0){p.regenT=(p.regenT||0)+dt;if(p.regenT>=5){p.regenT=0;p.hp=Math.min(p.maxHp,p.hp+stats.regen);}}
    G2.parts.forEach(pt=>{if(!pt.trail){pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=280*dt;}pt.life-=dt;});G2.parts=G2.parts.filter(pt=>pt.life>0);if(G2.parts.length>400)G2.parts=G2.parts.slice(-400);
    G2.exps.forEach(e=>{e.life-=dt;});G2.exps=G2.exps.filter(e=>e.life>0);

    // Wave
    if(G2.waveQ.length>0){
      G2.spawnT-=dt;
      let spawnsThisFrame=0;
      while(G2.waveQ.length>0&&G2.spawnT<=0&&spawnsThisFrame<3){
        const n=G2.waveQ.shift();spawnEnemy(G2,n.type);
        G2.spawnT=G2.waveQ.length>0?(G2.waveQ[0].delay-n.delay):.5;
        spawnsThisFrame++;
      }
    }
    if(!G2.waveDone&&G2.waveQ.length===0&&G2.enemies.length===0){
      G2.waveDone=true;const nw=G2.wave+1;G2.wave=nw;
      G2.waveMsg=nw%5===0?`⚠ BOSS WAVE ${nw}`:`WAVE ${nw}`;G2.waveMsgT=2.5;
      // Respawn barrels in new random positions each wave
      spawnBarrels(G2);
      setTimeout(()=>{if(!G2)return;G2.waveQ=genWave(nw);G2.spawnT=G2.waveQ[0]?.delay||0;G2.waveDone=false;},3000);
    }
    if(G2.waveMsgT>0){G2.waveMsgT-=dt;if(G2.waveMsgT<=0)G2.waveMsg='';}
    setUi({hp:Math.round(p.hp),maxHp:p.maxHp,score:p.score,wave:G2.wave,kills:p.kills,xp:p.xp,xpNext:p.xpNext,level:p.level,cdPct:Math.max(0,p.skillT/p.skillMaxT),waveMsg:G2.waveMsg,boss:G2.wave%5===0&&G2.waveQ.length>0,weapons:p.weapons.map(w=>({id:w.id,lv:w.level,col:WD[w.id].col,n:WD[w.id].n,key:WD[w.id].key}))});
  }

  function killEnemy(G2,e,p,hero){
    const E=ET[e.type];p.score+=E.sc;p.kills++;
    deathFX(G2,e.x,e.y,E.sz*2.8);// blood burst + stain
    // Death shake based on enemy size
    const dshake=E.boss?16:E.sz>.18*40?8:4;
    if(G2.shake.life<.2)G2.shake={x:0,y:0,life:.18+E.sz*.006,mag:dshake};
    // Bonus drop chance: boss=always, elite=60%, others=12%
    const bonusChance=E.boss?1:e.type==='elite'?.6:.12;
    if(Math.random()<bonusChance){
      const bonus=BONUSES[rndI(BONUSES.length)];
      G2.drops.push({x:e.x+(rnd(1)-.5)*20,y:e.y+(rnd(1)-.5)*20,amount:0,taken:false,bonus,bobPh:rnd(Math.PI*2)});
    }
    for(let i=0;i<Math.max(1,E.xp);i++)G2.gems.push({x:e.x+(rnd(1)-.5)*22,y:e.y+(rnd(1)-.5)*22,v:8,col:['#ffd60a','#00e5ff','#2dff6e'][rndI(3)],sz:5+rndI(3),life:8});
    if(Math.random()<E.loot)G2.drops.push({x:e.x,y:e.y,amount:20+rndI(20),taken:false});
  }
  function pickUpgrade(ch){
    if(!G.current)return;
    applyUpgrade(G.current.player,ch,G.current.stats);
    G.current.phase='playing';phaseR.current='playing';setPhase('playing');setUpgrades([]);
  }

  // ── DRAW JOYSTICK ──────────────────────────────────────
  function drawJoy(ctx,joy,defX,defY,col,label){
    if(!joy?.active){
      ctx.save();ctx.globalAlpha=.1;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.arc(defX,defY,JR,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.06;ctx.beginPath();ctx.moveTo(defX-22,defY);ctx.lineTo(defX+22,defY);ctx.moveTo(defX,defY-22);ctx.lineTo(defX,defY+22);ctx.stroke();ctx.fillStyle=col;ctx.globalAlpha=.08;ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(label,defX,defY+JR+14);ctx.restore();return;
    }
    const dx=joy.stickX-joy.baseX,dy=joy.stickY-joy.baseY,dist=Math.hypot(dx,dy),a=Math.atan2(dy,dx),cd=Math.min(dist,JR),sx=joy.baseX+Math.cos(a)*cd,sy=joy.baseY+Math.sin(a)*cd;
    ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.shadowColor=col;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(joy.baseX,joy.baseY,JR,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.52;ctx.fillStyle=col;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(sx,sy,JSR,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.88;ctx.fillStyle='#fff';ctx.shadowBlur=6;ctx.beginPath();ctx.arc(sx,sy,10,0,Math.PI*2);ctx.fill();ctx.restore();
  }


/* ══════════════════════════════════════════════════════
   DOOM-STYLE BOTTOM HUD
══════════════════════════════════════════════════════ */
function drawHUD(ctx,G2,t){
  const p=G2.player;if(!p)return;
  const hero=HEROES.find(h=>h.id===G2.hid);if(!hero)return;
  const y0=PLAY_H; // HUD starts here
  const W2=W,H2=HUD_H;
  const pulse=(Math.sin(t*2)+1)/2;

  // ── Background ──────────────────────────────────────
  ctx.save();
  // Dark metal base
  ctx.fillStyle='#080810';ctx.fillRect(0,y0,W2,H2);
  // Top border glow
  ctx.strokeStyle=hero.col;ctx.lineWidth=2;ctx.shadowColor=hero.col;ctx.shadowBlur=12;
  ctx.beginPath();ctx.moveTo(0,y0);ctx.lineTo(W2,y0);ctx.stroke();
  ctx.shadowBlur=0;
  // Subtle grid
  ctx.strokeStyle='rgba(0,200,255,.06)';ctx.lineWidth=1;
  for(let x=0;x<W2;x+=45){ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y0+H2);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(0,y0+H2/2);ctx.lineTo(W2,y0+H2/2);ctx.stroke();

  // ── SECTION: HP (left third) ─────────────────────────
  const hpX=10,hpY=y0+8,hpW=200,hpH=H2-16;
  // HP label
  ctx.fillStyle='#555566';ctx.font='bold 9px monospace';ctx.textAlign='left';ctx.letterSpacing='2px';
  ctx.fillText('INTEGRITY',hpX,hpY+10);
  // Big HP number
  const hpPct=p.hp/p.maxHp;
  const hpCol=hpPct>.5?'#2dff6e':hpPct>.25?'#ffd60a':'#ff2055';
  ctx.fillStyle=hpCol;ctx.shadowColor=hpCol;ctx.shadowBlur=hpPct<.3?18+pulse*12:6;
  ctx.font=`bold ${hpPct<.3?28:24}px monospace`;ctx.textAlign='left';
  ctx.fillText(Math.ceil(p.hp),hpX,hpY+42);
  ctx.fillStyle='#333';ctx.font='bold 11px monospace';ctx.shadowBlur=0;
  ctx.fillText('/'+p.maxHp,hpX+ctx.measureText(Math.ceil(p.hp)).width+4,hpY+42);
  // HP bar (chunked like Doom)
  const barW=hpW,barH=14;const barY=hpY+52;
  ctx.fillStyle='#111118';ctx.fillRect(hpX,barY,barW,barH);
  const chunks=10;const chunkW=(barW-chunks+1)/chunks;
  for(let i=0;i<chunks;i++){
    const filled=i/chunks<hpPct;
    const cx=hpX+i*(chunkW+1);
    if(filled){ctx.fillStyle=hpCol;ctx.shadowColor=hpCol;ctx.shadowBlur=6;}
    else{ctx.fillStyle='#1a1a24';ctx.shadowBlur=0;}
    ctx.fillRect(cx,barY,chunkW,barH);
  }
  ctx.shadowBlur=0;
  // Regen indicator
  if(G2.stats?.regen>0){ctx.fillStyle='#2dff6e';ctx.shadowColor='#2dff6e';ctx.shadowBlur=8;ctx.font='8px monospace';ctx.fillText('+ REGEN',hpX,barY+barH+12);}
  ctx.shadowBlur=0;

  // ── SECTION: FACE (center-left) ──────────────────────
  const faceX=230,faceY=y0+8,faceS=94;
  // Face frame
  ctx.fillStyle='#0d0d18';ctx.fillRect(faceX,faceY,faceS,faceS);
  ctx.strokeStyle=hero.col;ctx.lineWidth=2;ctx.shadowColor=hero.col;ctx.shadowBlur=8+pulse*4;
  ctx.strokeRect(faceX,faceY,faceS,faceS);ctx.shadowBlur=0;
  // Procedural face — reacts to HP
  drawFace(ctx,faceX+faceS/2,faceY+faceS/2,faceS*.42,hero,hpPct,t);

  // ── SECTION: WEAPON + PERKS (center) ─────────────────
  const wpX=338,wpY=y0+6;
  // Weapon image
  const wid=p.weapons?.[0]?.id;const wlv=p.weapons?.[0]?.level||1;
  if(wid&&WD[wid]){
    const wImg=IMG_CACHE[WD[wid].key];
    const wcol=WD[wid].col;
    ctx.fillStyle='#0d0d18';ctx.fillRect(wpX,wpY,160,36);
    ctx.strokeStyle=wcol;ctx.lineWidth=1;ctx.strokeRect(wpX,wpY,160,36);
    if(wImg&&wImg.complete){try{ctx.drawImage(wImg,wpX+4,wpY+4,152,28);}catch(e){}}
    // Level badge
    ctx.fillStyle=wcol;ctx.shadowColor=wcol;ctx.shadowBlur=8;
    ctx.font='bold 10px monospace';ctx.textAlign='right';
    ctx.fillText(`LV${wlv}`,wpX+156,wpY+34);ctx.shadowBlur=0;
    // Ammo bar (cosmetic, based on fire rate)
    ctx.fillStyle='#111118';ctx.fillRect(wpX,wpY+40,160,8);
    const ammoColor=wcol;ctx.fillStyle=ammoColor;ctx.shadowColor=ammoColor;ctx.shadowBlur=4;
    ctx.fillRect(wpX+1,wpY+41,Math.max(0,(1-Math.max(0,p.weapons[0].fireT||0)*WD[wid].r[wlv-1])*158),6);
    ctx.shadowBlur=0;
    // Extra weapon slots
    p.weapons?.slice(1).forEach((ws,i)=>{
      const wi2=WD[ws.id];if(!wi2)return;
      const ex=wpX+(i%2)*84,ey=wpY+54+(Math.floor(i/2)*18);
      ctx.fillStyle='#0d0d18';ctx.fillRect(ex,ey,80,14);
      ctx.strokeStyle=wi2.col+'88';ctx.lineWidth=1;ctx.strokeRect(ex,ey,80,14);
      const wImg2=IMG_CACHE[wi2.key];
      if(wImg2&&wImg2.complete){try{ctx.drawImage(wImg2,ex+2,ey+2,76,10);}catch(e){}}
    });
  }

  // ── SECTION: PERKS ───────────────────────────────────
  const pkX=514,pkY=y0+6;
  ctx.fillStyle='#444455';ctx.font='bold 8px monospace';ctx.textAlign='left';
  ctx.fillText('PERKS',pkX,pkY+10);
  const perks=p.skills||[];
  perks.slice(0,6).forEach((sk,i)=>{
    const px2=pkX+(i%3)*62,py2=pkY+14+Math.floor(i/3)*22;
    ctx.fillStyle='#0d0d18';ctx.fillRect(px2,py2,58,18);
    ctx.strokeStyle='#ffd60a44';ctx.lineWidth=1;ctx.strokeRect(px2,py2,58,18);
    ctx.fillStyle='#ffd60a';ctx.shadowColor='#ffd60a';ctx.shadowBlur=5;
    ctx.font='7px monospace';ctx.textAlign='left';
    ctx.fillText(sk.n?.substring(0,8)||'PERK',px2+3,py2+12);ctx.shadowBlur=0;
  });
  if(perks.length===0){ctx.fillStyle='#2a2a3a';ctx.font='8px monospace';ctx.fillText('NONE YET',pkX,pkY+32);}

  // ── SECTION: XP + LEVEL (right) ──────────────────────
  const xpX=710,xpY=y0+8;
  ctx.fillStyle='#555566';ctx.font='bold 9px monospace';ctx.textAlign='left';ctx.fillText('LEVEL',xpX,xpY+10);
  ctx.fillStyle='#ffd60a';ctx.shadowColor='#ffd60a';ctx.shadowBlur=10;
  ctx.font='bold 32px monospace';ctx.fillText(p.level||1,xpX,xpY+46);ctx.shadowBlur=0;
  // XP bar
  const xpBarW=160,xpBarY=xpY+52;
  ctx.fillStyle='#111118';ctx.fillRect(xpX,xpBarY,xpBarW,10);
  const xpPct=Math.min(1,(p.xp||0)/(p.xpNext||60));
  const xpG=ctx.createLinearGradient(xpX,0,xpX+xpBarW,0);
  xpG.addColorStop(0,'#886600');xpG.addColorStop(1,'#ffd60a');
  ctx.fillStyle=xpG;ctx.shadowColor='#ffd60a';ctx.shadowBlur=6;
  ctx.fillRect(xpX+1,xpBarY+1,Math.max(0,xpPct*(xpBarW-2)),8);
  ctx.shadowBlur=0;
  ctx.fillStyle='#555';ctx.font='8px monospace';ctx.textAlign='right';
  ctx.fillText(`${p.xp||0}/${p.xpNext||60}`,xpX+xpBarW,xpBarY+22);

  // ── SKILL CD indicator (right edge) ──────────────────
  const cdX=878,cdY=y0+8;
  const cdPct=Math.max(0,(p.skillT||0)/(p.skillMaxT||8));
  const cdReady=cdPct===0;
  // Arc indicator
  ctx.strokeStyle=cdReady?hero.col:'#333344';ctx.lineWidth=4;ctx.shadowColor=hero.col;ctx.shadowBlur=cdReady?14+pulse*8:0;
  ctx.beginPath();ctx.arc(cdX,cdY+46,18,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-cdPct),false);ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle=cdReady?hero.col:'#444455';ctx.font=`bold ${cdReady?9:8}px monospace`;ctx.textAlign='center';
  ctx.fillText(cdReady?'READY':Math.ceil((p.skillT||0))+'s',cdX,cdY+50);
  ctx.fillStyle='#333344';ctx.font='7px monospace';
  ctx.fillText(hero.skill?.substring(0,6)||'SKILL',cdX,cdY+64);

  ctx.restore();
}

/* ── DOOM FACE ─────────────────────────────────────── */
function drawFace(ctx,cx,cy,r,hero,hpPct,t){
  ctx.save();
  // Head shape
  const headCol=hero.id==='axiom'?'#1a2a1a':hero.id==='raven'?'#1a0a0a':'#0a1a2a';
  ctx.fillStyle=headCol;ctx.shadowColor=hero.col;ctx.shadowBlur=10;
  ctx.beginPath();ctx.ellipse(cx,cy,r*.65,r*.78,0,0,Math.PI*2);ctx.fill();
  // Helmet/hood
  ctx.fillStyle=hero.id==='axiom'?'#1a3020':hero.id==='raven'?'#1a0810':'#0a1020';
  ctx.shadowBlur=0;ctx.beginPath();ctx.arc(cx,cy-r*.18,r*.6,Math.PI,0,false);ctx.fill();
  // Visor/eyes — react to HP
  const eyeW=r*.25,eyeH=r*(hpPct<.25?.09:.13);
  const eyeY=cy-r*.08;
  // Expression: fine→normal, hurt→squint, critical→wide angry
  const ang=hpPct<.25?Math.PI*.12:0;
  ctx.fillStyle=hero.col;ctx.shadowColor=hero.col;ctx.shadowBlur=12+(1-hpPct)*8;
  // Left eye
  ctx.save();ctx.translate(cx-r*.22,eyeY);ctx.rotate(-ang);
  ctx.fillRect(-eyeW/2,-eyeH/2,eyeW,eyeH);ctx.restore();
  // Right eye
  ctx.save();ctx.translate(cx+r*.22,eyeY);ctx.rotate(ang);
  ctx.fillRect(-eyeW/2,-eyeH/2,eyeW,eyeH);ctx.restore();
  ctx.shadowBlur=0;
  // Mouth — grimace when hurt
  if(hpPct<.5){
    const grimace=((.5-hpPct)/.5);
    ctx.strokeStyle=hero.col+'88';ctx.lineWidth=2;ctx.lineCap='round';
    ctx.beginPath();
    if(grimace>.5){// grimace
      ctx.moveTo(cx-r*.2,cy+r*.3);ctx.quadraticCurveTo(cx,cy+r*.18,cx+r*.2,cy+r*.3);
    }else{// neutral
      ctx.moveTo(cx-r*.15,cy+r*.28);ctx.lineTo(cx+r*.15,cy+r*.28);
    }
    ctx.stroke();
  }
  // Damage flash — red overlay when low HP
  if(hpPct<.3){
    const flash=(Math.sin(t*8)+1)/2*(1-hpPct/.3)*.4;
    ctx.globalAlpha=flash;ctx.fillStyle='#ff0000';
    ctx.beginPath();ctx.ellipse(cx,cy,r*.65,r*.78,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
  ctx.restore();
}


  // ── RENDER ─────────────────────────────────────────────
  function render(atmo){
    const canvas=cvs.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');const G2=G.current;const t=atmo.t;
    const IM=IMG_CACHE; // module-level cache, always current
    // Ensure all images are loading
    if(Object.keys(IM).length===0){
      Object.entries(SP).forEach(([k,src])=>{
        const img=new Image();img.src=src;IM[k]=img;
      });
    }

    // ── BACKGROUND ──────────────────────────────────────
    if(IM.bg){try{ctx.drawImage(IM.bg,0,0,W,H);}catch(e){ctx.fillStyle='#020209';ctx.fillRect(0,0,W,H);}}
    else{ctx.fillStyle='#020209';ctx.fillRect(0,0,W,H);}
    // Dark overlay to improve contrast
    // Subtle neon atmosphere tint (no darkening)
    ctx.save();ctx.globalAlpha=.06;ctx.fillStyle='#000820';ctx.fillRect(0,0,W,H);ctx.restore();

    // ── FOG ─────────────────────────────────────────────
    ctx.save();atmo.fog.forEach(f=>{const q=Math.sin(f.ph)*.3+.78;ctx.globalAlpha=f.op*q*1.35;const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.rx);g.addColorStop(0,f.col+'ff');g.addColorStop(.6,f.col+'99');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(f.x,f.y,f.rx,f.ry,0,0,Math.PI*2);ctx.fill();});ctx.restore();
    // ── CIRCUIT TRACES ──────────────────────────────────
    ctx.save();atmo.bgT.forEach(t2=>{ctx.globalAlpha=t2.op;ctx.strokeStyle=t2.col;ctx.lineWidth=1;ctx.shadowColor=t2.col;ctx.shadowBlur=3;ctx.beginPath();ctx.moveTo(t2.x,t2.y);ctx.lineTo(t2.h?t2.x+t2.len:t2.x,t2.h?t2.y:t2.y+t2.len);ctx.stroke();if(t2.dot){ctx.globalAlpha=t2.op*3;ctx.fillStyle=t2.col;const ex=t2.h?t2.x+t2.len:t2.x,ey=t2.h?t2.y:t2.y+t2.len;ctx.fillRect(ex-2,ey-2,4,4);}});ctx.restore();
    // ── LIGHTNING ────────────────────────────────────────
    atmo.lightning.forEach(l=>{const a=l.life/l.ml;ctx.save();
      // Outer glow
      ctx.globalAlpha=a*.7;ctx.strokeStyle=l.col;ctx.lineWidth=14;ctx.shadowColor=l.col;ctx.shadowBlur=55;sBolt(ctx,l.pts);
      // Mid
      ctx.globalAlpha=a*.85;ctx.lineWidth=5;ctx.shadowBlur=22;sBolt(ctx,l.pts);
      // Branches
      ctx.globalAlpha=a*.5;ctx.lineWidth=2;l.br.forEach(b=>sBolt(ctx,b));
      // Core white
      ctx.globalAlpha=a*.95;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.shadowBlur=8;sBolt(ctx,l.pts);
    ctx.restore();});
    // ── RAIN ─────────────────────────────────────────────
    ctx.save();atmo.rain.forEach(r=>{ctx.globalAlpha=r.op*1.25;ctx.strokeStyle=r.col;ctx.lineWidth=r.w;ctx.shadowColor=r.col;ctx.shadowBlur=r.w>.9?5:0;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-r.w*.4,r.y+r.len);ctx.stroke();});ctx.restore();
    // ── WET GROUND ───────────────────────────────────────
    ctx.save();const rg=ctx.createLinearGradient(0,H-55,0,H);rg.addColorStop(0,'transparent');rg.addColorStop(1,'rgba(2,1,14,.72)');ctx.fillStyle=rg;ctx.globalAlpha=.38;ctx.fillRect(0,H-55,W,55);ctx.globalAlpha=.18;[W*.12,W*.32,W*.55,W*.75,W*.92].forEach((rx,i)=>{const cols=['#ff2055','#0088ff','#8844ff','#00cc88','#ffaa00'];const pg=ctx.createRadialGradient(rx,H-6,0,rx,H-6,85);pg.addColorStop(0,cols[i%4]);pg.addColorStop(1,'transparent');ctx.fillStyle=pg;ctx.fillRect(0,H-40,W,40);});atmo.splashes.forEach(s=>{const a=Math.max(0,s.life/s.ml);ctx.globalAlpha=a*.42;ctx.strokeStyle=s.col;ctx.lineWidth=.8;ctx.shadowColor=s.col;ctx.shadowBlur=4;ctx.beginPath();ctx.ellipse(s.x,s.y,s.rx,s.ry,0,0,Math.PI*2);ctx.stroke();});ctx.restore();
    // ── BORDER ───────────────────────────────────────────
    const bp=(Math.sin(t*1.5)+1)/2;ctx.save();ctx.strokeStyle=`rgba(0,170,255,${.2+bp*.12})`;ctx.lineWidth=2;ctx.shadowColor='#0088ff';ctx.shadowBlur=10+bp*5;ctx.strokeRect(1,1,W-2,H-2);ctx.restore();

    if(!G2)return;
    // ── BLOOD STAINS (persistent, on ground) ─────────────
    if(G2.stains?.length>0){ctx.save();G2.stains.forEach(s=>{ctx.globalAlpha=s.opacity*.7;ctx.fillStyle='#440000';ctx.shadowColor='#880000';ctx.shadowBlur=4;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot);ctx.beginPath();ctx.ellipse(0,0,s.rx,s.ry,0,0,Math.PI*2);ctx.fill();ctx.restore();});ctx.restore();}
    ctx.save();
    // Clip game world to play area (above HUD)
    ctx.beginPath();ctx.rect(0,0,W,PLAY_H);ctx.clip();
    ctx.translate(Math.round(G2.shake?.x||0),Math.round(G2.shake?.y||0));

    // ── BARREL ZONES + PROCEDURAL EFFECTS ───────────────────
    if(G2.barrels&&G2.barrels.length>0){
    const bt=atmo.t;
    G2.barrels.forEach(brl=>{
      const BT=BTYPES[brl.type];
      const bx=brl.x,by=brl.y;

      // ── Active zone effects ────────────────────────────
      if(brl.active&&brl.zoneR>0){
        const zp=(Math.sin(bt*6)+1)/2;
        const zr=brl.zoneR;
        ctx.save();

        if(brl.type==='fire'){
          // Ground scorch circle
          const scorch=ctx.createRadialGradient(bx,by,0,bx,by,zr);
          scorch.addColorStop(0,'rgba(80,20,0,.45)');scorch.addColorStop(.6,'rgba(40,8,0,.25)');scorch.addColorStop(1,'transparent');
          ctx.fillStyle=scorch;ctx.fillRect(bx-zr,by-zr,zr*2,zr*2);
          // Flame ring
          for(let i=0;i<16;i++){
            const a=i/16*Math.PI*2+bt*.8;const fr=zr*(.7+Math.sin(bt*4+i)*.18);
            const fx=bx+Math.cos(a)*fr,fy=by+Math.sin(a)*fr;
            const fh=12+Math.sin(bt*6+i*1.3)*7;const fw=6+Math.sin(bt*5+i*.9)*3;
            const flicker=(Math.sin(bt*12+i*2.1)+1)/2;
            const fg=ctx.createRadialGradient(fx,fy,0,fx,fy,fw+fh*.4);
            fg.addColorStop(0,`rgba(255,${180+Math.floor(flicker*60)},0,${.85+flicker*.15})`);
            fg.addColorStop(.4,`rgba(255,${80+Math.floor(flicker*40)},0,.6)`);
            fg.addColorStop(1,'transparent');
            ctx.fillStyle=fg;ctx.beginPath();ctx.ellipse(fx,fy-fh*.3,fw*.6,fh*.55,0,0,Math.PI*2);ctx.fill();
          }
          // Smoke particles from center
          for(let i=0;i<5;i++){
            const sa=(bt*.3+i*.4)%(Math.PI*2);const sr=zr*(.1+i*.06);
            const sx=bx+Math.cos(sa)*sr,sy=by+Math.sin(sa)*sr;
            const slife=(bt*.7+i*.2)%1;const sop=.25*(1-slife);
            const sr2=8+slife*20;
            ctx.globalAlpha=sop;ctx.fillStyle='#1a1a1a';ctx.shadowBlur=0;
            ctx.beginPath();ctx.arc(sx,sy-slife*25,sr2,0,Math.PI*2);ctx.fill();
          }
          ctx.globalAlpha=1;
          // Inner fire core
          const cg=ctx.createRadialGradient(bx,by,0,bx,by,zr*.35);
          cg.addColorStop(0,'rgba(255,220,80,.55)');cg.addColorStop(.5,'rgba(255,100,0,.3)');cg.addColorStop(1,'transparent');
          ctx.fillStyle=cg;ctx.beginPath();ctx.arc(bx,by,zr*.35,0,Math.PI*2);ctx.fill();

        }else if(brl.type==='oil'){
          // Oil slick — dark rainbow sheen
          const oilG=ctx.createRadialGradient(bx,by,0,bx,by,zr);
          oilG.addColorStop(0,'rgba(20,14,0,.7)');oilG.addColorStop(.7,'rgba(10,8,0,.45)');oilG.addColorStop(1,'transparent');
          ctx.fillStyle=oilG;ctx.beginPath();ctx.arc(bx,by,zr,0,Math.PI*2);ctx.fill();
          // Iridescent surface shimmer
          const shiftAngle=bt*.4;
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+shiftAngle;const r2=zr*(.3+i*.1);
            const hue=(bt*40+i*60)%360;
            ctx.globalAlpha=.15+Math.sin(bt*2+i)*(.08);
            ctx.strokeStyle=`hsl(${hue},80%,55%)`;ctx.lineWidth=3;ctx.shadowColor=`hsl(${hue},80%,55%)`;ctx.shadowBlur=5;
            ctx.beginPath();ctx.ellipse(bx,by,r2,r2*.4,a,0,Math.PI*2);ctx.stroke();
          }
          ctx.globalAlpha=1;ctx.shadowBlur=0;
          // Viscous edge drips
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2;const dripPh=(bt*.5+i*.7)%1;
            const dx=bx+Math.cos(a)*(zr*(.85+dripPh*.18)),dy=by+Math.sin(a)*(zr*(.85+dripPh*.18));
            ctx.globalAlpha=.5*(1-dripPh);ctx.fillStyle='#1a1000';
            ctx.beginPath();ctx.arc(dx,dy,3+dripPh*4,0,Math.PI*2);ctx.fill();
          }
          ctx.globalAlpha=1;

        }else if(brl.type==='freeze'){
          // Ice floor
          const iceG=ctx.createRadialGradient(bx,by,0,bx,by,zr);
          iceG.addColorStop(0,'rgba(120,200,255,.45)');iceG.addColorStop(.6,'rgba(60,140,220,.25)');iceG.addColorStop(1,'transparent');
          ctx.fillStyle=iceG;ctx.beginPath();ctx.arc(bx,by,zr,0,Math.PI*2);ctx.fill();
          // Ice crystal cracks radiating out
          for(let i=0;i<12;i++){
            const a=i/12*Math.PI*2;const crackLen=zr*(.4+Math.sin(i*2.3)*.3);
            ctx.strokeStyle='rgba(180,230,255,.55)';ctx.lineWidth=1.5;ctx.shadowColor='#88eeff';ctx.shadowBlur=6;
            ctx.beginPath();ctx.moveTo(bx,by);
            let cx=bx,cy=by;
            for(let s=0;s<4;s++){const jitter=(Math.random()-.5)*12;cx+=Math.cos(a+jitter*.04)*crackLen*.28;cy+=Math.sin(a+jitter*.04)*crackLen*.28;ctx.lineTo(cx,cy);}
            ctx.stroke();
          }
          // Snowflake/crystal particles
          for(let i=0;i<10;i++){
            const pa=(bt*.3+i*.63)%(Math.PI*2);const pr=zr*(.1+i*.08);
            const px=bx+Math.cos(pa)*pr,py=by+Math.sin(pa)*pr;
            const ps=3+Math.sin(bt*3+i)*1.5;
            ctx.globalAlpha=.7+Math.sin(bt*4+i)*.3;
            ctx.fillStyle='#ccefff';ctx.shadowColor='#88ddff';ctx.shadowBlur=8;
            ctx.beginPath();
            // 6-pointed crystal
            ctx.beginPath();
            for(let s=0;s<6;s++){const sa=s/6*Math.PI*2+bt*.5;ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(sa)*ps,py+Math.sin(sa)*ps);}
            ctx.strokeStyle='#aaddff';ctx.lineWidth=1;ctx.stroke();
            ctx.beginPath();ctx.arc(px,py,ps*.4,0,Math.PI*2);ctx.fill();
          }
          ctx.globalAlpha=1;ctx.shadowBlur=0;
          // Pulsing freeze ring
          const fring=zp;ctx.globalAlpha=.4+fring*.25;ctx.strokeStyle='#88ddff';ctx.lineWidth=2;ctx.shadowColor='#88ddff';ctx.shadowBlur=12;
          ctx.beginPath();ctx.arc(bx,by,zr*(.85+fring*.12),0,Math.PI*2);ctx.stroke();
          ctx.globalAlpha=1;

        }else if(brl.type==='electric'){
          // EMP base glow
          const empG=ctx.createRadialGradient(bx,by,0,bx,by,zr);
          empG.addColorStop(0,'rgba(255,255,120,.22)');empG.addColorStop(.5,'rgba(0,220,255,.12)');empG.addColorStop(1,'transparent');
          ctx.fillStyle=empG;ctx.beginPath();ctx.arc(bx,by,zr,0,Math.PI*2);ctx.fill();
          // Pulsing EMP rings
          for(let ring=0;ring<3;ring++){
            const rph=(bt*.9+ring*.33)%1;
            const rr=zr*rph;const rop=.6*(1-rph);
            ctx.globalAlpha=rop;ctx.strokeStyle='#00ffff';ctx.lineWidth=2;ctx.shadowColor='#00ffff';ctx.shadowBlur=14;
            ctx.beginPath();ctx.arc(bx,by,rr,0,Math.PI*2);ctx.stroke();
          }
          ctx.globalAlpha=1;ctx.shadowBlur=0;
          // Random chain lightning inside zone
          const numBolts=3+Math.floor(Math.sin(bt*4)*1.5);
          for(let b2=0;b2<numBolts;b2++){
            const a1=rnd(Math.PI*2),a2=rnd(Math.PI*2);
            const r1=rnd(zr*.8),r2=rnd(zr*.8);
            const lx1=bx+Math.cos(a1)*r1,ly1=by+Math.sin(a1)*r1;
            const lx2=bx+Math.cos(a2)*r2,ly2=by+Math.sin(a2)*r2;
            const lpts=mkBolt(lx1,ly1,lx2,ly2,3,18);
            const la=.4+Math.random()*.55;
            ctx.globalAlpha=la;ctx.strokeStyle=Math.random()>.5?'#00ffff':'#ffff00';ctx.lineWidth=1.5;ctx.shadowColor='#00ffff';ctx.shadowBlur=12;
            sBolt(ctx,lpts);
          }
          // Spark particles
          for(let s=0;s<6;s++){
            const sa=(bt*2.8+s*.85)%(Math.PI*2);const sr2=rnd(zr*.9);
            const sx=bx+Math.cos(sa)*sr2,sy=by+Math.sin(sa)*sr2;
            ctx.globalAlpha=Math.random()*.8;ctx.fillStyle=Math.random()>.5?'#ffff88':'#00ffff';ctx.shadowColor='#00ffff';ctx.shadowBlur=8;
            ctx.beginPath();ctx.arc(sx,sy,2,0,Math.PI*2);ctx.fill();
          }
          ctx.globalAlpha=1;ctx.shadowBlur=0;

        }else if(brl.type==='stun'){
          // Neural disruption — purple concentric waves
          const stunG=ctx.createRadialGradient(bx,by,0,bx,by,zr);
          stunG.addColorStop(0,'rgba(140,0,200,.3)');stunG.addColorStop(.5,'rgba(80,0,160,.15)');stunG.addColorStop(1,'transparent');
          ctx.fillStyle=stunG;ctx.beginPath();ctx.arc(bx,by,zr,0,Math.PI*2);ctx.fill();
          // Pulse rings
          for(let ring=0;ring<4;ring++){
            const rph=(bt*1.1+ring*.25)%1;
            const rr=zr*rph;const rop=.7*(1-rph);
            ctx.globalAlpha=rop;ctx.strokeStyle='#cc44ff';ctx.lineWidth=2.5;ctx.shadowColor='#cc44ff';ctx.shadowBlur=18;
            ctx.beginPath();ctx.arc(bx,by,rr,0,Math.PI*2);ctx.stroke();
          }
          ctx.globalAlpha=1;ctx.shadowBlur=0;
          // Spiral neural pattern
          ctx.strokeStyle='rgba(180,80,255,.45)';ctx.lineWidth=1;ctx.shadowColor='#cc44ff';ctx.shadowBlur=8;
          ctx.beginPath();
          for(let s=0;s<80;s++){
            const sa=s/80*Math.PI*6+bt;const sr3=s/80*zr*.85;
            const spx=bx+Math.cos(sa)*sr3,spy=by+Math.sin(sa)*sr3;
            s===0?ctx.moveTo(spx,spy):ctx.lineTo(spx,spy);
          }
          ctx.stroke();ctx.shadowBlur=0;
          // Floating orbs
          for(let o=0;o<5;o++){
            const oa=o/5*Math.PI*2+bt*1.5;const or2=zr*(.3+o*.1);
            const ox=bx+Math.cos(oa)*or2,oy=by+Math.sin(oa)*or2;
            const osz=(Math.sin(bt*3+o)+1)/2;
            ctx.globalAlpha=.6+osz*.3;ctx.fillStyle='#dd66ff';ctx.shadowColor='#cc44ff';ctx.shadowBlur=14+osz*8;
            ctx.beginPath();ctx.arc(ox,oy,3+osz*2,0,Math.PI*2);ctx.fill();
          }
          ctx.globalAlpha=1;ctx.shadowBlur=0;
        }

        // Zone particles (sparks/embers from updateBarrels)
        ctx.save();brl.pts.forEach(pt=>{ctx.globalAlpha=Math.max(0,pt.life*.9);ctx.fillStyle=pt.col;ctx.shadowColor=pt.col;ctx.shadowBlur=6;ctx.fillRect(Math.round(pt.x-2),Math.round(pt.y-2),4,4);});ctx.restore();
        ctx.restore();
      }// end active zone

      // ── Barrel body (if not broken) ───────────────────
      if(!brl.broken){
        const bp2=(Math.sin(bt*3+bx*.05)+1)/2;
        ctx.save();ctx.translate(bx,by);
        // Shadow
        ctx.globalAlpha=.38;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(3,7,18,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        // Metal body
        ctx.fillStyle='#1c1c28';ctx.beginPath();ctx.ellipse(0,0,16,21,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#2a2a3a';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,16,21,0,0,Math.PI*2);ctx.stroke();
        for(const by2 of [-9,-3,3,9]){ctx.fillStyle='#222232';ctx.fillRect(-16,by2,32,2.5);}
        // Glowing type-colored top
        ctx.fillStyle=BT.col;ctx.shadowColor=BT.col;ctx.shadowBlur=14+bp2*10;
        ctx.beginPath();ctx.ellipse(0,-19,11,5,0,0,Math.PI*2);ctx.fill();
        // Pulse ring
        ctx.globalAlpha=.4+bp2*.45;ctx.strokeStyle=BT.glow;ctx.lineWidth=1.5;ctx.shadowBlur=7;
        ctx.beginPath();ctx.arc(0,-19,11+bp2*5,0,Math.PI*2);ctx.stroke();
        // Icon
        ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.font='bold 13px serif';ctx.textAlign='center';ctx.fillText(BT.icon,0,-14);
        ctx.restore();
      }
    });
    }// end barrels


    // ── EXPLOSIONS ───────────────────────────────────────
    G2.exps?.forEach(e=>{const pct=1-e.life/e.maxLife;ctx.save();ctx.globalAlpha=(1-pct)*.82;ctx.fillStyle=e.col;ctx.shadowColor=e.col;ctx.shadowBlur=28;ctx.beginPath();ctx.arc(e.x,e.y,e.r*pct*2.4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=(1-pct)*.25;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(e.x,e.y,e.r*pct*1.3,0,Math.PI*2);ctx.fill();ctx.restore();});

    // ── XP GEMS ──────────────────────────────────────────
    G2.gems?.forEach(gem=>{const p2=(Math.sin(t*6+gem.x*.05)+1)/2;ctx.save();ctx.translate(gem.x,gem.y);ctx.rotate(t*2.5+gem.x);ctx.fillStyle=gem.col;ctx.shadowColor=gem.col;ctx.shadowBlur=12+p2*8;ctx.globalAlpha=.85+p2*.15;const s=gem.sz;ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.7,0);ctx.lineTo(0,s);ctx.lineTo(-s*.7,0);ctx.closePath();ctx.fill();ctx.restore();});

    // ── HP DROPS ─────────────────────────────────────────
    G2.drops?.forEach(drop=>{
      if(drop.taken)return;
      const p2=(Math.sin(t*5+(drop.bobPh||0))+1)/2;
      ctx.save();
      if(drop.bonus){
        // Bonus pickup — spinning hexagon with icon
        const bc=drop.bonus.col;
        ctx.translate(drop.x,drop.y-p2*4);// bob up/down
        ctx.rotate(t*.8);
        ctx.globalAlpha=.9+p2*.1;
        ctx.fillStyle=bc+'33';ctx.shadowColor=bc;ctx.shadowBlur=18+p2*10;
        // Hexagon
        ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ctx.lineTo(Math.cos(a)*13,Math.sin(a)*13);}
        ctx.closePath();ctx.fill();
        ctx.strokeStyle=bc;ctx.lineWidth=2;ctx.stroke();
        ctx.rotate(-t*.8);// un-rotate for icon
        ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 11px serif';ctx.textAlign='center';
        ctx.fillText(drop.bonus.icon,0,4);
        ctx.shadowBlur=0;ctx.globalAlpha=.75;ctx.fillStyle=bc;ctx.font='bold 6px monospace';
        ctx.fillText(drop.bonus.n,0,18);
      }else{
        // HP drop — cyan pulsing circle
        ctx.globalAlpha=.8+p2*.2;ctx.fillStyle='#00aaff';ctx.shadowColor='#00aaff';ctx.shadowBlur=14+p2*7;
        ctx.beginPath();ctx.arc(drop.x,drop.y,9,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 9px monospace';ctx.shadowBlur=0;
        ctx.fillText('+HP',drop.x,drop.y+3);
      }
      ctx.restore();
    });

    // ── ENEMY BULLETS ────────────────────────────────────
    G2.eBullets?.forEach(b=>{ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle=b.col;ctx.shadowColor=b.col;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();ctx.restore();});

    // ── ENEMIES ──────────────────────────────────────────
    G2.enemies?.forEach(e=>{
      const E=ET[e.type];const eImg=IM[E.key];
      const iw=E.boss?108:e.type==='elite'?82:70;
      const ih=E.boss?122:e.type==='elite'?105:86;
      const wk=e.walkCycle||0;const bob=Math.abs(Math.sin(wk))*2;

      ctx.save();ctx.translate(e.x,e.y);
      // Ground shadow
      ctx.globalAlpha=.45;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(3,E.sz*.55,E.sz*.9,E.sz*.32,0,0,Math.PI*2);ctx.fill();
      // Ground ring indicator
      ctx.globalAlpha=.7;ctx.strokeStyle=E.eye;ctx.lineWidth=1.5;ctx.shadowColor=E.eye;ctx.shadowBlur=8;
      ctx.beginPath();ctx.ellipse(0,E.sz*.5,E.sz*.6,E.sz*.22,0,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;ctx.shadowBlur=0;

      // Stun flash
      if(e.stunned>0){ctx.globalAlpha=Math.sin(t*25)>0?.5:.2;ctx.fillStyle='#00ffee';ctx.shadowColor='#00ffee';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,0,E.sz+5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=0;}
      // Frozen tint
      if(e.frozen>0){ctx.globalAlpha=.35;ctx.fillStyle='#88eeff';ctx.shadowColor='#00aaff';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,0,E.sz+3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=0;}

      ctx.rotate(e.angle+Math.PI/2);ctx.translate(0,-bob*.4);

      if(eImg){
        // Shadow under sprite
        ctx.globalAlpha=1;
        try{
          ctx.globalCompositeOperation='screen';
          ctx.shadowColor=E.eye||'#ff4400';ctx.shadowBlur=14;
          ctx.drawImage(eImg,-iw/2,-ih/2,iw,ih);
          ctx.shadowBlur=0;
          ctx.globalCompositeOperation='source-over';
        }catch(e){}
      }else if(IMG_CACHE[E.key]&&!IMG_CACHE[E.key].complete){
        // Still loading - show placeholder with enemy color
        ctx.fillStyle=E.col;ctx.shadowColor=E.col;ctx.shadowBlur=12;
        ctx.beginPath();ctx.arc(0,0,E.sz,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.font=`bold ${E.sz}px monospace`;ctx.textAlign='center';ctx.fillText('?',0,E.sz*.35);
      }else{
        ctx.fillStyle=E.col;ctx.shadowColor=E.col;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(0,0,E.sz,0,Math.PI*2);ctx.fill();
      }
      // Eye glow
      if(!e.stunned){
        const pp=(Math.sin(t*3+e.x*.008)+1)/2;
        ctx.globalAlpha=.6+pp*.3;ctx.fillStyle=E.eye;ctx.shadowColor=E.eye;ctx.shadowBlur=14+pp*10;
        ctx.beginPath();ctx.arc(0,E.boss?0:-ih*.28,E.boss?7:5,0,Math.PI*2);ctx.fill();
      }
      // HP bar
      ctx.rotate(-(e.angle+Math.PI/2));ctx.translate(0,bob*.4);
      const bw=E.sz*2.8,hpPct=e.hp/e.maxHp;
      ctx.globalAlpha=1;ctx.fillStyle='#0a0a14';ctx.fillRect(-bw/2,-E.sz-16,bw,4);
      ctx.fillStyle=hpPct>.5?'#44aaff':hpPct>.25?'#ffd60a':'#ff2055';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=4;
      ctx.fillRect(-bw/2,-E.sz-16,bw*hpPct,4);ctx.shadowBlur=0;
      if(e.shieldHP>0){ctx.fillStyle='#00aaff';ctx.fillRect(-bw/2,-E.sz-22,bw*(e.shieldHP/50),4);}
      ctx.restore();
    });
    }

    // ── PLAYER BULLETS ───────────────────────────────────
    G2.bullets?.forEach(b=>{
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);
      if(b.tracer){
        // Hitscan tracer: bright thin line with glow
        const alpha=Math.min(1,b.life*5);
        ctx.globalAlpha=alpha;
        ctx.strokeStyle=b.col;ctx.lineWidth=2.5;ctx.shadowColor=b.col;ctx.shadowBlur=16;
        ctx.beginPath();ctx.moveTo(0,-b.len*2);ctx.lineTo(0,b.len*0.5);ctx.stroke();
        // Bright core
        ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.shadowBlur=6;
        ctx.beginPath();ctx.moveTo(0,-b.len*2);ctx.lineTo(0,0);ctx.stroke();
      }else{
        ctx.fillStyle=b.col;ctx.shadowColor=b.col;ctx.shadowBlur=b.aoe?22:12;
        ctx.beginPath();ctx.ellipse(0,0,b.aoe?5:3,b.len/2,0,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    });

    // ── PLAYER ───────────────────────────────────────────
    if(G2.player){
      const hero=HEROES.find(h=>h.id===G2.hid);const p=G2.player;
      const hImg=IM[`h_${G2.hid}`];const IW=90,IH=122;
      const wk=p.walkCycle||0;const bob=p.isMoving?Math.abs(Math.sin(wk))*2:0;
      ctx.save();ctx.translate(p.x,p.y);
      // Ground shadow
      ctx.globalAlpha=.45;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(4,8,20,7,0,0,Math.PI*2);ctx.fill();
      // Hero color ring at feet
      ctx.globalAlpha=.8;ctx.strokeStyle=hero.col;ctx.lineWidth=2;ctx.shadowColor=hero.col;ctx.shadowBlur=14;
      ctx.beginPath();ctx.ellipse(0,16,14,5,0,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;ctx.shadowBlur=0;
      // Skill aura
      if(p.invincible>0||p.skillActive>0){const pa=(Math.sin(t*10)+1)/2;ctx.globalAlpha=.2+pa*.16;ctx.fillStyle=hero.col;ctx.shadowColor=hero.col;ctx.shadowBlur=28;ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=0;}
      ctx.rotate(p.angle-Math.PI/2);ctx.translate(0,-bob*.5);
      ctx.globalAlpha=1;ctx.shadowBlur=0; // no mask needed with screen blend
      if(hImg){
        try{
          // Screen blend: dark card background disappears, colored glow stays
          ctx.globalCompositeOperation='screen';
          ctx.shadowColor=hero.col;ctx.shadowBlur=22;
          ctx.drawImage(hImg,-IW/2,-IH/2,IW,IH);
          ctx.shadowBlur=0;
          ctx.globalCompositeOperation='source-over';
        }catch(e){}
      }
      else{ctx.fillStyle=hero.col;ctx.shadowColor=hero.col;ctx.shadowBlur=10;ctx.beginPath();ctx.ellipse(0,0,14,18,0,0,Math.PI*2);ctx.fill();}
      // Color rim glow
      ctx.globalAlpha=.25;ctx.strokeStyle=hero.col;ctx.lineWidth=2;ctx.shadowColor=hero.col;ctx.shadowBlur=10;ctx.beginPath();ctx.ellipse(0,0,IW*.42,IH*.42,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }

    // ── PARTICLES ────────────────────────────────────────
    ctx.save();G2.parts?.forEach(pt=>{
      const a=Math.max(0,Math.min(1,pt.life));
      ctx.globalAlpha=a;
      if(pt.blood){
        // Blood: flat dark red, no glow, splat shape
        ctx.fillStyle=pt.col;ctx.shadowBlur=0;
        ctx.beginPath();ctx.arc(Math.round(pt.x),Math.round(pt.y),pt.sz*.7,0,Math.PI*2);ctx.fill();
      }else{
        ctx.fillStyle=pt.col;ctx.shadowColor=pt.col;ctx.shadowBlur=10;
        ctx.fillRect(Math.round(pt.x-pt.sz/2),Math.round(pt.y-pt.sz/2),Math.ceil(pt.sz),Math.ceil(pt.sz));
      }
    });ctx.restore();

    // ── WAVE MSG ─────────────────────────────────────────
    if(G2.waveMsg){ctx.save();ctx.textAlign='center';const wc=G2.waveMsg.includes('BOSS')?'#ff2055':'#ffd60a';ctx.font=`bold 36px 'Share Tech Mono',monospace`;ctx.fillStyle=wc;ctx.shadowColor=wc;ctx.shadowBlur=30;ctx.globalAlpha=Math.min(1,G2.waveMsgT);ctx.fillText(G2.waveMsg,W/2,H*.42);ctx.restore();}

    ctx.restore(); // end shake

    // ── JOYSTICKS ────────────────────────────────────────
    if(G2.phase==='playing'||G2.phase==='levelup'){
      drawJoy(ctx,G2.leftJoy,L_DEF.x,L_DEF.y,'#00aaff','MOVE');
      drawJoy(ctx,G2.rightJoy,R_DEF.x,R_DEF.y,'#ff4422','AIM+FIRE');
    }

    // ── SCREEN FLASH ─────────────────────────────────────
    if(atmo.flash?.life>0){ctx.save();ctx.globalAlpha=atmo.flash.life*.45;ctx.fillStyle=atmo.flash.col;ctx.fillRect(0,0,W,H);ctx.restore();}
    // ── SCANLINES ────────────────────────────────────────
    ctx.save();ctx.fillStyle='rgba(0,0,0,.05)';for(let y=0;y<H;y+=2)ctx.fillRect(0,y,W,1);const vg=ctx.createRadialGradient(W/2,H/2,40,W/2,H/2,W*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,12,.65)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);ctx.restore();
  }

  // ── JSX ───────────────────────────────────────────────
  const mono="'Share Tech Mono',monospace";
  const glow=(c,b=14)=>({color:c,textShadow:`0 0 ${b}px ${c},0 0 ${b*2.5}px ${c}40`,fontFamily:mono});
  const pnl=(c,ex={})=>({background:'rgba(3,3,16,.94)',border:`1px solid ${c}33`,borderRadius:6,padding:'10px 14px',boxShadow:`0 0 18px ${c}18`,...ex});
  const Btn=({c,onClick,children,style={}})=>(<button onClick={onClick} style={{background:`${c}14`,border:`1px solid ${c}`,color:c,padding:'8px 18px',fontFamily:mono,letterSpacing:3,fontSize:11,cursor:'pointer',borderRadius:4,boxShadow:`0 0 12px ${c}28`,...style}} onMouseOver={e=>e.currentTarget.style.background=c+'28'} onMouseOut={e=>e.currentTarget.style.background=c+'14'}>{children}</button>);
  const Modal=({children})=>(<div style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',background:'rgba(2,1,14,.94)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:20,fontFamily:mono}}>{children}</div>);
  const hero=HEROES.find(h=>h.id===heroSel);const hcol=hero?.col||'#00aaff';

  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#020109',userSelect:'none',fontFamily:mono,touchAction:'none'}}>
      <div style={{marginBottom:6,...glow('#00aaff'),letterSpacing:8,fontSize:12}}>⚡ NEON SIEGE ⚡</div>
      <div style={{position:'relative',width:W,maxWidth:'100%'}}>
        <canvas ref={cvs} width={W} height={H+HUD_H} style={{display:'block',maxWidth:'100%',cursor:'crosshair',touchAction:'none'}}/>

        {/* HUD */}
        {(phase==='playing'||phase==='levelup')&&hero&&(
          <div style={{position:'absolute',top:0,left:0,width:'100%',pointerEvents:'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 12px',background:'rgba(2,1,14,.88)',borderBottom:`1px solid ${hcol}22`}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{...glow(hcol,8),fontSize:12,letterSpacing:4}}>{hero.name}</div>
                <div style={{width:140}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#555',marginBottom:2}}><span>HP</span><span style={{color:ui.hp/ui.maxHp<.3?'#ff2055':'#888'}}>{ui.hp}/{ui.maxHp}</span></div>
                  <div style={{background:'#0a0a16',borderRadius:3,height:8,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.max(0,ui.hp/ui.maxHp)*100}%`,background:`linear-gradient(90deg,${hcol}77,${hcol})`,transition:'width .2s',boxShadow:`0 0 8px ${hcol}`}}/></div>
                </div>
              </div>
              <div style={{pointerEvents:'auto'}}>
                <button onClick={doSkill} style={{background:ui.cdPct>0?'rgba(10,10,20,.8)':`${hcol}22`,border:`1.5px solid ${ui.cdPct>0?'#333':hcol}`,color:ui.cdPct>0?'#444':hcol,padding:'5px 14px',fontFamily:mono,fontSize:9,letterSpacing:2,cursor:'pointer',borderRadius:4,minWidth:110,position:'relative',overflow:'hidden'}}>
                  {ui.cdPct>0&&<div style={{position:'absolute',top:0,left:0,height:'100%',width:`${(1-ui.cdPct)*100}%`,background:`${hcol}18`}}/>}
                  <span style={{position:'relative',zIndex:1}}>{ui.cdPct>0?`CD ${Math.ceil(ui.cdPct*hero.skillCD)}s`:hero.skill}</span>
                </button>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{...glow(ui.boss?'#ff2055':'#ffd60a',8),fontSize:11,letterSpacing:3}}>WAVE {ui.wave}{ui.boss?' ⚠':''}</div>
                <div style={{color:'#555',fontSize:9}}>SCR <span style={{color:'#ddd'}}>{String(ui.score).padStart(6,'0')}</span></div>
              </div>
            </div>
        )}

        {phase==='menu'&&<Modal>
          <div style={{...glow('#00aaff'),fontSize:50,letterSpacing:10,marginBottom:4,textShadow:'0 0 44px #00aaff'}}>NEON</div>
          <div style={{...glow('#ff4422'),fontSize:50,letterSpacing:10,marginBottom:22}}>SIEGE</div>
          <div style={{color:'#2a2a3a',fontSize:9,letterSpacing:5,marginBottom:40}}>TOP-DOWN SURVIVAL · NEO-SHINJUKU · 2087</div>
          <Btn c='#00aaff' onClick={()=>setPhase('hero_select')} style={{letterSpacing:7,padding:'12px 48px',fontSize:12}}>▸ INITIATE</Btn>
          <div style={{marginTop:22,display:'flex',gap:20,fontSize:8,color:'#1a1a28',letterSpacing:2}}>
            <span>📱 LEFT JOY = MOVE</span><span>📱 RIGHT JOY = AIM+FIRE</span><span>🔥 SHOOT BARRELS</span><span>◆ COLLECT XP</span>
          </div>
        </Modal>}

        {phase==='hero_select'&&<Modal>
          <div style={{...glow('#00aaff'),fontSize:11,letterSpacing:8,marginBottom:4}}>SELECT OPERATIVE</div>
          <div style={{color:'#2a2a3a',fontSize:9,letterSpacing:4,marginBottom:20}}>CHOOSE YOUR LOADOUT</div>
          <div style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center'}}>
            {HEROES.map(h=>{
              const hImg=IMG_CACHE[`h_${h.id}`];
              return(<div key={h.id} onClick={()=>startGame(h.id)} style={{...pnl(h.col),width:210,cursor:'pointer',textAlign:'center',transition:'all .22s'}} onMouseOver={e=>e.currentTarget.style.boxShadow=`0 0 34px ${h.col}55`} onMouseOut={e=>e.currentTarget.style.boxShadow=`0 0 18px ${h.col}18`}>
                {hImg?<img src={SP[`h_${h.id}`]} style={{width:100,height:110,objectFit:'cover',borderRadius:4,border:`1px solid ${h.col}44`,boxShadow:`0 0 14px ${h.col}44`,marginBottom:8}}/>:<div style={{height:122,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}><div style={{width:60,height:80,background:h.col,borderRadius:4,opacity:.3}}/></div>}
                <div style={{...glow(h.col),fontSize:18,letterSpacing:4,marginBottom:2}}>{h.name}</div>
                <div style={{color:'#444',fontSize:8,letterSpacing:2,marginBottom:10}}>{h.sub}</div>
                <div style={{display:'flex',justifyContent:'space-around',marginBottom:8}}>
                  {[['HP',h.hp],['SPD',h.spd],['WPN',WD[h.startW].n]].map(([l,v])=>(<div key={l}><div style={{color:'#444',fontSize:7,marginBottom:1}}>{l}</div><div style={{color:h.col,fontSize:11,fontWeight:'bold'}}>{v}</div></div>))}
                </div>
                <div style={{color:h.col,fontSize:9,letterSpacing:2,marginBottom:2}}>⚡ {h.skill}</div>
                <div style={{color:'#555',fontSize:7,lineHeight:1.7,marginBottom:6}}>{h.skillD}</div>
                <div style={{marginTop:8,...pnl(h.col),fontSize:10,letterSpacing:3}}>SELECT</div>
              </div>);
            })}
          </div>
        </Modal>}

        {phase==='levelup'&&<Modal>
          <div style={{...glow('#ffd60a'),fontSize:12,letterSpacing:6,marginBottom:4}}>LEVEL UP // LV{ui.level}</div>
          <div style={{color:'#444',fontSize:9,letterSpacing:4,marginBottom:20}}>CHOOSE AN UPGRADE</div>
          <div style={{display:'flex',gap:14}}>
            {upgrades.map((up,i)=>(
              <div key={i} onClick={()=>pickUpgrade(up)} style={{...pnl(up.col||'#ffd60a'),width:190,cursor:'pointer',textAlign:'center',transition:'all .2s'}} onMouseOver={e=>e.currentTarget.style.boxShadow=`0 0 30px ${up.col||'#ffd60a'}50`} onMouseOut={e=>e.currentTarget.style.boxShadow=`0 0 18px ${up.col||'#ffd60a'}18`}>
                {up.type==='weapon_new'&&imgsR.current[WD[up.id]?.key]
                  ?<img src={SP[WD[up.id].key]} style={{width:70,height:24,objectFit:'cover',borderRadius:3,margin:'8px auto',display:'block',boxShadow:`0 0 10px ${up.col}88`}}/>
                  :<div style={{...glow(up.col||'#ffd60a'),fontSize:22,marginBottom:6}}>{up.type==='weapon_new'?'⊕':up.type==='weapon_up'?'↑':'◈'}</div>}
                <div style={{color:up.col||'#ffd60a',fontSize:10,letterSpacing:2,marginBottom:5}}>{up.n}</div>
                <div style={{color:'#666',fontSize:8,lineHeight:1.8,marginBottom:4}}>{up.d}</div>
                <div style={{color:'#555',fontSize:7,letterSpacing:1,marginBottom:10}}>{up.type==='weapon_new'?'NEW WEAPON':up.type==='weapon_up'?'UPGRADE':'PASSIVE'}</div>
                <div style={{...pnl(up.col||'#ffd60a'),fontSize:10,letterSpacing:3}}>INSTALL</div>
              </div>
            ))}
          </div>
        </Modal>}

        {phase==='gameover'&&<Modal>
          <div style={{...glow('#ff2055'),fontSize:13,letterSpacing:6,marginBottom:12}}>// SIGNAL LOST //</div>
          <div style={{display:'flex',gap:26,marginBottom:20,fontSize:11,letterSpacing:3}}>
            <span style={{color:'#555'}}>SCORE <span style={{color:'#ddd'}}>{ui.score.toLocaleString()}</span></span>
            <span style={{color:'#555'}}>WAVE <span style={{color:'#ddd'}}>{ui.wave}</span></span>
            <span style={{color:'#555'}}>KILLS <span style={{color:'#ddd'}}>{ui.kills}</span></span>
          </div>
          <Btn c='#ff2055' onClick={()=>{setPhase('hero_select');G.current=null;setHeroSel(null);}} style={{letterSpacing:6,padding:'10px 40px'}}>▸ RETRY</Btn>
        </Modal>}
      </div>
      <div style={{marginTop:6,fontSize:8,color:'#111',letterSpacing:2,textAlign:'center'}}>WASD+MOUSE — MOBILE: LEFT JOY MOVE · RIGHT JOY AIM&amp;FIRE — SPACE/BUTTON=SKILL · SHOOT BARRELS TO TRIGGER EFFECTS</div>
    </div>
  );
}
