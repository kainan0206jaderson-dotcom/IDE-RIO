import * as THREE from 'three';
const C={brown:'#8E412E',petal:'#E6CEBC',sage:'#A2A182',linen:'#F4ECE2',cinnamon:'#BA6F4D',ink:'#2A1912',wood:'#8a5636',woodDark:'#5b3322',leaf:'#66704a',leaf2:'#7d8858'};
const FH='Caveat',FU='"Architects Daughter"',FP='"Reenie Beanie"';
const $=s=>document.querySelector(s);
const TOUCH=matchMedia('(pointer: coarse)').matches||(navigator.maxTouchPoints>0&&matchMedia('(hover: none)').matches);
const LOW=TOUCH||Math.min(innerWidth,innerHeight)<600||/[?&]low\b/.test(location.search);
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const D2R=Math.PI/180,V3=THREE.Vector3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
let seed=11;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const R=(a,b)=>a+(b-a)*rnd();
const buzz=(ms=12)=>{try{navigator.vibrate?.(ms);}catch(e){}};
function makeCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(draw)draw(g,w,h);return c;}
function speckle(g,w,h,color,n,s=1.4){g.fillStyle=color;for(let i=0;i<n;i++)g.fillRect(rnd()*w,rnd()*h,.4+rnd()*s,.4+rnd()*s);}
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function paper(g,w,h,base=C.linen,vig=.1){g.fillStyle=base;g.fillRect(0,0,w,h);speckle(g,w,h,'rgba(120,80,50,.05)',w*h/160,1.6);speckle(g,w,h,'rgba(255,255,255,.18)',w*h/400,1.2);
  const gr=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.8);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,`rgba(110,70,40,${vig})`);g.fillStyle=gr;g.fillRect(0,0,w,h);}
function wrapText(g,text,x,y,maxW,lh){const words=text.split(' ');let line='';for(const w of words){const t=line?line+' '+w:w;if(g.measureText(t).width>maxW&&line){g.fillText(line,x,y);line=w;y+=lh;}else line=t;}if(line)g.fillText(line,x,y);return y;}

/* ================= brand: BUKKU ================= */
function hexRgb(h){const m=/^#?([0-9a-f]{6})$/i.exec(String(h).trim());const n=m?parseInt(m[1],16):0;return [n>>16&255,n>>8&255,n&255];}
function artCanvas(w,h,pal,kind=0,bg=C.linen){return makeCanvas(w,h,(g)=>{paper(g,w,h,bg,.06);
  if(kind===0){g.fillStyle=pal[0];g.beginPath();g.arc(w*.5,h*.62,w*.34,Math.PI,0);g.lineTo(w*.84,h*.95);g.lineTo(w*.16,h*.95);g.fill();g.fillStyle=pal[1];g.beginPath();g.arc(w*.68,h*.3,w*.12,0,7);g.fill();g.fillStyle=pal[2];g.fillRect(w*.1,h*.78,w*.8,h*.05);
    g.strokeStyle=pal[3];g.lineWidth=w*.012;for(let i=0;i<5;i++){g.beginPath();g.arc(w*.5,h*.62,w*(.1+i*.05),Math.PI,0);g.stroke();}}
  else if(kind===1){for(let i=0;i<6;i++){g.fillStyle=pal[i%pal.length];g.globalAlpha=.85;g.beginPath();g.ellipse(R(.2,.8)*w,R(.2,.8)*h,R(.08,.22)*w,R(.06,.18)*h,R(0,3),0,7);g.fill();}g.globalAlpha=1;}
  else{g.fillStyle=pal[0];g.fillRect(0,h*.55,w,h*.45);g.fillStyle=pal[1];g.beginPath();g.arc(w*.3,h*.55,w*.18,Math.PI,0);g.fill();g.fillStyle=pal[2];g.fillRect(w*.58,h*.25,w*.16,h*.3);g.fillStyle=pal[3];g.beginPath();g.arc(w*.66,h*.25,w*.08,Math.PI,0);g.fill();}});}

export { $, C, D2R, FH, FP, FU, LOW, R, REDUCED, TOUCH, V3, artCanvas, buzz, clamp, ease, hexRgb, lerp, makeCanvas, paper, rnd, roundRect, speckle, wrapText };
