import { $, C, D2R, FH, FP, FU, LOW, R, REDUCED, TOUCH, V3, artCanvas, buzz, clamp, ease, hexRgb, lerp, makeCanvas, paper, rnd, roundRect, speckle, wrapText } from './lib/util.js';
import { LOGO, brandMark, stampLogo } from './brand/mark.js';
import { Store, canvasBlob, custom, delDoc, dropImage, imgURL, initStore, listDocs, loadImage, putDoc, putImage } from './lib/store.js';
import { setNotify } from './lib/store.js';
import { bodyFont, cover, dispFont, drawPanel, lines, prepare, symDraw, tile, wordmark } from './studio/panels.js';
import { APPS, PANEL_INFO, PANEL_SIZE, buildPrompt, kitKinds, localBrand, normalizeBrand } from './studio/brand.js';
import { cmyk, harmonyPalette, hsl2hex, inkOn, luma, paletteFromImage, rolesOf, slugify } from './studio/color.js';
import { colorize, sizeSVG } from './studio/svg.js';
import { freeAIReachable, getKey, setKey, textJSON } from './studio/ai.js';
import { loadPhotos } from './studio/imagery.js';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import samsonImg from "./assets/samson.jpg";
import narutoImg from "./assets/naruto.jpg";
import gradImg from "./assets/grad.jpg";
import paletteImg from "./assets/palette.jpg";

export default async function start(){
/* ================= base ================= */
setNotify((h,m)=>toast(h,m));
try{await Promise.race([Promise.all(['700 48px Caveat','500 32px Caveat','24px "Architects Daughter"','32px "Reenie Beanie"','64px Gloock','700 24px "Instrument Sans"','800 80px "Bricolage Grotesque"'].map(f=>document.fonts.load(f))),new Promise(r=>setTimeout(r,3000))]);}catch(e){}
const url=m=>typeof m==='string'?m:m.src; // Next entrega { src }, o esbuild do Artifact entrega a URL
const IMG={samson:url(samsonImg),naruto:url(narutoImg),grad:url(gradImg),palette:url(paletteImg)};

const canvas=$('#gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,LOW?1.5:2));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.92;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const ANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const scene=new THREE.Scene();scene.background=new THREE.Color('#2a1a12');
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(renderer),.04).texture;
const EXPLORE_FOV=()=>{const a=innerWidth/innerHeight;return a<1?clamp(2*Math.atan(Math.tan(37*D2R)/a)/D2R,60,92):66;};
const DESK_FOV=36;
const camera=new THREE.PerspectiveCamera(EXPLORE_FOV(),innerWidth/innerHeight,.03,60);scene.add(camera);

/* ================= canvas helpers ================= */
function tex(c,{rep=[1,1],srgb=true}={}){const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);t.anisotropy=ANISO;return t;}
function shade(hex,amt){const c=new THREE.Color(hex);const hsl={};c.getHSL(hsl);c.setHSL(hsl.h,clamp(hsl.s*(1+amt*.3),0,1),clamp(hsl.l+amt,0,1));return '#'+c.getHexString();}

/* ================= textures ================= */
function woodCanvas(w,h,base,planks){return makeCanvas(w,h,(g)=>{const pw=w/planks;
  for(let i=0;i<planks;i++){let y=-rnd()*400;while(y<h){const L=R(260,620);g.fillStyle=shade(base,R(-.05,.04));g.fillRect(i*pw,y,pw,L);
      for(let k=0;k<22;k++){g.strokeStyle=`rgba(${rnd()<.5?'60,30,15':'255,230,200'},${R(.03,.08)})`;g.lineWidth=R(.6,2.2);g.beginPath();const x0=i*pw+R(2,pw-2);g.moveTo(x0,y);for(let s=0;s<=8;s++)g.lineTo(x0+Math.sin(s*.9+k)*R(.5,3),y+L*s/8);g.stroke();}
      g.fillStyle='rgba(40,20,10,.5)';g.fillRect(i*pw,y,pw,2);y+=L;}
    g.fillStyle='rgba(40,20,10,.45)';g.fillRect(i*pw,0,2,h);}});}
const floorTex=tex(woodCanvas(1024,1024,'#94603f',8),{rep:[3.6,3]});
const deskWoodTex=tex(makeCanvas(1024,256,(g,w,h)=>{g.fillStyle='#a06c48';g.fillRect(0,0,w,h);for(let k=0;k<90;k++){g.strokeStyle=`rgba(${rnd()<.6?'70,35,15':'255,225,190'},${R(.03,.09)})`;g.lineWidth=R(.5,2);g.beginPath();let y=R(0,h);g.moveTo(0,y);for(let x=0;x<=w;x+=32)g.lineTo(x,y+Math.sin(x*.01+k)*R(1,4));g.stroke();}}),{rep:[4,1]});
const plasterTex=tex(makeCanvas(512,512,(g,w,h)=>{g.fillStyle='#eadccb';g.fillRect(0,0,w,h);speckle(g,w,h,'rgba(140,100,70,.06)',9000,2.2);speckle(g,w,h,'rgba(255,255,255,.2)',4000,2);}),{rep:[3,2]});
const hallTex=tex(makeCanvas(256,256,(g,w,h)=>{g.fillStyle='#d4b6a0';g.fillRect(0,0,w,h);speckle(g,w,h,'rgba(110,60,40,.07)',3000,2);}),{rep:[2,2]});
const wainCanvas=makeCanvas(512,256,(g,w,h)=>{g.fillStyle='#9d9c7e';g.fillRect(0,0,w,h);speckle(g,w,h,'rgba(60,60,40,.05)',3000);for(let x=0;x<w;x+=128){g.fillStyle='rgba(50,48,35,.2)';g.fillRect(x,0,3,h);g.fillStyle='rgba(255,255,240,.15)';g.fillRect(x+3,0,2,h);g.strokeStyle='rgba(50,48,35,.16)';g.lineWidth=2;g.strokeRect(x+22,30,84,h-60);}});
const corkTex=tex(makeCanvas(512,512,(g,w,h)=>{g.fillStyle='#bf9067';g.fillRect(0,0,w,h);speckle(g,w,h,'rgba(90,50,25,.35)',16000,2.4);speckle(g,w,h,'rgba(240,210,170,.3)',9000,2);}),{rep:[2,1.2]});
const rugTex=tex(makeCanvas(1024,720,(g,w,h)=>{g.fillStyle='#e0c7b4';g.fillRect(0,0,w,h);speckle(g,w,h,'rgba(120,70,50,.08)',30000,2);g.strokeStyle=C.brown;g.lineWidth=34;g.strokeRect(40,40,w-80,h-80);g.strokeStyle=C.cinnamon;g.lineWidth=6;g.strokeRect(82,82,w-164,h-164);
  g.fillStyle=C.sage;for(let i=0;i<9;i++){const x=150+i*(w-300)/8;g.beginPath();g.moveTo(x,h/2-60);g.lineTo(x+34,h/2);g.lineTo(x,h/2+60);g.lineTo(x-34,h/2);g.closePath();g.fill();}
  g.fillStyle=C.cinnamon;for(let i=0;i<8;i++){g.beginPath();g.arc(150+(i+.5)*(w-300)/8,h/2,10,0,7);g.fill();}speckle(g,w,h,'rgba(255,255,255,.1)',12000,1.5);}));
const outsideTex=tex(makeCanvas(1024,640,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#cfccbc');gr.addColorStop(.55,'#eadccb');gr.addColorStop(1,'#e2c8b0');g.fillStyle=gr;g.fillRect(0,0,w,h);
  const sun=g.createRadialGradient(w*.62,h*.35,10,w*.62,h*.35,240);sun.addColorStop(0,'rgba(250,240,222,.9)');sun.addColorStop(1,'rgba(250,240,222,0)');g.fillStyle=sun;g.fillRect(0,0,w,h);
  g.fillStyle='#aaa88f';g.beginPath();g.moveTo(0,h*.62);for(let x=0;x<=w;x+=40)g.lineTo(x,h*.6-Math.sin(x*.006)*40-Math.sin(x*.02)*10);g.lineTo(w,h);g.lineTo(0,h);g.fill();
  g.fillStyle='#868c6c';for(let i=0;i<14;i++){const x=R(0,w),y=h*R(.62,.75),r=R(40,90);g.beginPath();g.arc(x,y,r,0,7);g.arc(x+r*.6,y+10,r*.8,0,7);g.fill();}
  g.fillStyle='#a8694b';g.fillRect(w*.08,h*.66,180,110);g.fillStyle='#7f3b2b';g.beginPath();g.moveTo(w*.08-14,h*.66);g.lineTo(w*.08+90,h*.56);g.lineTo(w*.08+194,h*.66);g.fill();
  g.fillStyle='#737a58';for(let i=0;i<8;i++){g.beginPath();g.arc(R(0,w),h*R(.78,.95),R(60,120),0,7);g.fill();}}));
outsideTex.wrapS=outsideTex.wrapT=THREE.ClampToEdgeWrapping;
/* ================= materials (matte) ================= */
const sm=(o)=>new THREE.MeshStandardMaterial(Object.assign({roughness:.85,metalness:0},o));
const M={plaster:sm({map:plasterTex,roughness:1}),hall:sm({map:hallTex,roughness:1}),floor:sm({map:floorTex,roughness:.78}),deskWood:sm({map:deskWoodTex,roughness:.74}),
  trim:sm({color:C.brown,roughness:.75}),wood:sm({color:C.wood,roughness:.75}),woodDark:sm({color:C.woodDark,roughness:.72}),sage:sm({color:C.sage}),linen:sm({color:C.linen,roughness:1}),
  fabric:sm({color:'#ad6849',roughness:1}),brass:sm({color:'#b08650',roughness:.45,metalness:.7}),black:sm({color:'#2b1f19',roughness:.6}),ceramic:sm({color:'#ebe1d4',roughness:.45}),
  terracotta:sm({color:'#b0684a',roughness:.92}),soil:sm({color:'#3a2618',roughness:1}),cork:sm({map:corkTex,roughness:1}),rug:sm({map:rugTex,roughness:1}),
  glass:sm({color:'#fff6ea',roughness:.08,transparent:true,opacity:.08}),leaf:sm({color:C.leaf,roughness:.8,side:THREE.DoubleSide}),leaf2:sm({color:C.leaf2,roughness:.8,side:THREE.DoubleSide}),steel:sm({color:'#9a948c',roughness:.4,metalness:.75})};
const colliders=[];const addCol=(x0,x1,z0,z1)=>colliders.push([Math.min(x0,x1),Math.max(x0,x1),Math.min(z0,z1),Math.max(z0,z1)]);
function box(w,h,d,mat,x,y,z,{parent=scene,cast=true,recv=true,ry=0,rounded=0}={}){const geo=rounded?new RoundedBoxGeometry(w,h,d,3,rounded):new THREE.BoxGeometry(w,h,d);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=cast;m.receiveShadow=recv;parent.add(m);return m;}
function cyl(rt,rb,h,mat,x,y,z,{parent=scene,seg=24,cast=true,open=false}={}){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg,1,open),mat);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}
function rod(a,b,r,mat,parent=scene){const A=new V3(...a),B=new V3(...b);const d=B.clone().sub(A);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),10),mat);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new V3(0,1,0),d.normalize());m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const interact=[];const lamps={};
function makeInteractive(obj,action,label,extra={}){obj.traverse(o=>{if(o.isMesh){o.userData.action=action;o.userData.label=label;Object.assign(o.userData,extra);interact.push(o);}});}
function frame(w,h,t,d,mat,parent,z=0){box(w+2*t,t,d,mat,0,h/2+t/2,z,{parent,cast:false});box(w+2*t,t,d,mat,0,-h/2-t/2,z,{parent,cast:false});box(t,h,d,mat,-w/2-t/2,0,z,{parent,cast:false});box(t,h,d,mat,w/2+t/2,0,z,{parent,cast:false});}

/* ================= room ================= */
const RX=3.5,RZ=3,RH=3,T=.12;
const deskTop=.78,deskZ0=-2.94,deskZ1=-2.12,deskZc=(deskZ0+deskZ1)/2;
function wall(w,h,d,x,y,z,mat=M.plaster,collide=true){const m=box(w,h,d,mat,x,y,z);if(collide&&y-h/2<1.4)addCol(x-w/2,x+w/2,z-d/2,z+d/2);return m;}
wall(2*RX+2*T,RH,T,0,RH/2,-RZ-T/2);wall(T,RH,2*RZ,-RX-T/2,RH/2,0);
const WZ0=-1.25,WZ1=.65,WY0=1.0,WY1=2.4;
wall(T,RH,WZ0+RZ,RX+T/2,RH/2,(-RZ+WZ0)/2);wall(T,RH,RZ-WZ1,RX+T/2,RH/2,(WZ1+RZ)/2);wall(T,WY0,WZ1-WZ0,RX+T/2,WY0/2,(WZ0+WZ1)/2);wall(T,RH-WY1,WZ1-WZ0,RX+T/2,(RH+WY1)/2,(WZ0+WZ1)/2,M.plaster,false);
const DX=.55,DY=2.2;
wall(RX-DX+T,RH,T,-(RX+DX+T)/2,RH/2,RZ+T/2);wall(RX-DX+T,RH,T,(RX+DX+T)/2,RH/2,RZ+T/2);wall(2*DX,RH-DY,T,0,(RH+DY)/2,RZ+T/2,M.plaster,false);
{const f=new THREE.Mesh(new THREE.PlaneGeometry(2*RX,2*RZ),M.floor);f.rotation.x=-Math.PI/2;f.receiveShadow=true;scene.add(f);
 const c=new THREE.Mesh(new THREE.PlaneGeometry(2*RX,2*RZ),sm({color:'#e9ddce',roughness:1}));c.rotation.x=Math.PI/2;c.position.y=RH;scene.add(c);}
for(const x of [-2.3,0,2.3])box(.16,.14,2*RZ,M.woodDark,x,RH-.07,0,{cast:false});
function wainRun(len,x,z,ry){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);const t=tex(wainCanvas,{rep:[len/1.1,1]});
  box(len,.92,.025,sm({map:t}),0,.46,0,{parent:g,cast:false});box(len,.11,.035,M.trim,0,.055,.01,{parent:g,cast:false});box(len,.035,.05,M.trim,0,.93,.01,{parent:g,cast:false});}
wainRun(2*RX,0,-RZ+.013,0);wainRun(2*RZ,-RX+.013,0,Math.PI/2);wainRun(2*RZ,RX-.013,0,-Math.PI/2);wainRun(RX-DX,-(RX+DX)/2,RZ-.013,Math.PI);wainRun(RX-DX,(RX+DX)/2,RZ-.013,Math.PI);
for(const [len,x,z,ry] of [[2*RX,0,-RZ+.03,0],[2*RZ,-RX+.03,0,Math.PI/2],[2*RZ,RX-.03,0,-Math.PI/2],[2*RX,0,RZ-.03,Math.PI]]){const g=new THREE.Group();g.position.set(x,RH-.05,z);g.rotation.y=ry;scene.add(g);box(len,.1,.06,M.linen,0,0,0,{parent:g,cast:false});}
box(.1,DY+.06,T+.06,M.trim,-DX-.05,(DY+.06)/2,RZ+T/2);box(.1,DY+.06,T+.06,M.trim,DX+.05,(DY+.06)/2,RZ+T/2);box(2*DX+.2,.1,T+.06,M.trim,0,DY+.05,RZ+T/2);
{const piv=new THREE.Group();piv.position.set(-DX-.02,0,RZ-.04);piv.rotation.y=Math.PI-.06;scene.add(piv);box(1.06,2.16,.045,M.sage,.53,1.08,0,{parent:piv});
  for(const yy of [1.55,.55])box(.8,.8,.012,M.sage,.53,yy,.028,{parent:piv,cast:false});const k=new THREE.Mesh(new THREE.SphereGeometry(.03,16,12),M.brass);k.position.set(.95,1.0,.05);piv.add(k);addCol(-DX-1.1,-DX,RZ-.15,RZ);}
const HX=.95,HZ1=5.3;
{const hf=new THREE.Mesh(new THREE.PlaneGeometry(2*HX,HZ1-RZ),M.floor);hf.rotation.x=-Math.PI/2;hf.position.set(0,0,(RZ+HZ1)/2);hf.receiveShadow=true;scene.add(hf);
  const hc=new THREE.Mesh(new THREE.PlaneGeometry(2*HX,HZ1-RZ),sm({color:'#e2d1c0',roughness:1}));hc.rotation.x=Math.PI/2;hc.position.set(0,RH,(RZ+HZ1)/2);scene.add(hc);
  wall(T,RH,HZ1-RZ,-HX-T/2,RH/2,(RZ+HZ1)/2,M.hall);wall(T,RH,HZ1-RZ,HX+T/2,RH/2,(RZ+HZ1)/2,M.hall);wall(2*HX+2*T,RH,T,0,RH/2,HZ1+T/2,M.hall);
  const run=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.9),M.rug);run.rotation.x=-Math.PI/2;run.position.set(0,.004,4.2);run.receiveShadow=true;scene.add(run);
  box(.12,.22,.06,M.brass,HX-.03,2.05,4.4);cyl(.07,.1,.16,sm({color:C.petal,emissive:'#ffb878',emissiveIntensity:.5,roughness:1}),HX-.12,2.12,4.4,{cast:false});
  const sl=new THREE.PointLight('#ffc792',1.8,5,2);sl.position.set(HX-.2,2.0,4.4);scene.add(sl);}

/* ================= posters (changeable) ================= */
const texLoader=new THREE.TextureLoader();
function imgTex(url){const t=texLoader.load(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=ANISO;return t;}
const posters={};
function poster(key,label,src,aspect,h,{x,y,z,ry=0,style='frame'}){
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;scene.add(g);const w=h*aspect;
  if(style==='ornate'){frame(w,h,.09,.06,sm({color:'#86582f',roughness:.55,metalness:.3}),g,.03);frame(w,h,.025,.07,M.woodDark,g,.035);}
  if(style==='frame'){frame(w+.14,h+.14,.03,.035,M.black,g,.018);const mt=new THREE.Mesh(new THREE.PlaneGeometry(w+.14,h+.14),M.linen);mt.position.z=.006;g.add(mt);}
  if(style==='wood')frame(w,h,.035,.035,M.wood,g,0);
  const orig=typeof src==='string'?imgTex(src):tex(src);if(typeof src!=='string'){orig.wrapS=orig.wrapT=THREE.ClampToEdgeWrapping;}
  const pic=new THREE.Mesh(new THREE.PlaneGeometry(w,h),sm({map:orig,roughness:.9}));pic.position.z=style==='ornate'?.03:.01;pic.receiveShadow=true;g.add(pic);
  if(style==='tape'){const tm=sm({color:'#efe0c8',transparent:true,opacity:.85,roughness:1});for(const [sx,sy] of [[-1,1],[1,1],[-1,-1],[1,-1]]){const tp=new THREE.Mesh(new THREE.PlaneGeometry(.12,.04),tm);tp.position.set(sx*(w/2-.02),sy*(h/2-.015),.014);tp.rotation.z=sx*sy*.7+R(-.15,.15);g.add(tp);}}
  posters[key]={key,label,pic,orig,aspect,current:null};makeInteractive(pic,'poster',label,{key});return g;}
poster('samson','Quadro da sala',IMG.samson,640/960,1.12,{x:-RX+.02,y:1.62,z:1.55,ry:Math.PI/2,style:'ornate'});
{const bar=box(.5,.03,.05,M.brass,0,0,0,{cast:false});bar.position.set(-RX+.08,2.3,1.55);bar.rotation.y=Math.PI/2;const pl=new THREE.SpotLight('#ffd9b0',1.6,2.2,.7,.95,2);pl.position.set(-RX+.25,2.32,1.55);pl.target.position.set(-RX,1.5,1.55);scene.add(pl,pl.target);}
poster('naruto','Pôster da mesa',IMG.naruto,560/995,1.0,{x:-1.95,y:1.82,z:-RZ+.01,style:'tape'});
poster('grad','Pôster emoldurado',IMG.grad,560/996,1.0,{x:1.95,y:1.82,z:-RZ+.02,style:'frame'});
poster('hall','Quadro do corredor',artCanvas(420,560,[C.cinnamon,C.sage,C.brown,C.petal],0),.75,.56,{x:-HX+.02,y:1.6,z:4.25,ry:Math.PI/2,style:'wood'});
poster('nook','Quadro da escrivaninha',artCanvas(400,500,[C.sage,C.brown,C.cinnamon,C.petal],2),.8,.5,{x:RX-.02,y:1.55,z:2.25,ry:-Math.PI/2,style:'wood'});

/* ================= cork board ================= */
{const g=new THREE.Group();g.position.set(0,1.86,-RZ+.03);scene.add(g);box(1.8,.98,.03,M.cork,0,0,0,{parent:g,cast:false});frame(1.8,.98,.04,.05,M.wood,g,.005);
  const items=[
    {tex:tex(makeCanvas(460,330,(gg,w,h)=>{paper(gg,w,h,'#F3EADC',.05);stampLogo(gg,LOGO.stack,w/2,h/2,w*.9);})),w:.32,h:.23,x:-.58,y:.26,r:.02},
    {tex:imgTex(IMG.palette),w:.3,h:.3*1309/1080,x:-.2,y:.0,r:-.04},
    {tex:tex(makeCanvas(360,300,(gg,w,h)=>{paper(gg,w,h,'#fbf5ea',.04);gg.fillStyle=C.ink;gg.font=`700 40px ${FH}`;gg.fillText('referências',24,52);gg.font=`36px ${FP}`;['papel kraft','barro cozido','luz de fim de tarde','folhas secas','tipografia de livro'].forEach((t,i)=>gg.fillText('— '+t,30,100+i*38));})),w:.3,h:.25,x:.22,y:.24,r:-.06},
    {tex:tex(makeCanvas(400,160,(gg,w,h)=>{paper(gg,w,h,'#fbf5ea',.03);[C.brown,C.petal,C.sage,C.linen,C.cinnamon].forEach((c,i)=>{gg.fillStyle=c;gg.fillRect(16+i*74,16,66,100);});gg.fillStyle=C.ink;gg.font=`26px ${FU}`;gg.fillText('paleta do escritório',18,148);})),w:.36,h:.144,x:-.58,y:-.25,r:.03},
    {tex:tex(artCanvas(300,300,[C.sage,C.cinnamon,C.brown,C.petal],1)),w:.22,h:.22,x:.62,y:.18,r:.08},
    {tex:tex(makeCanvas(300,360,(gg,w,h)=>{gg.fillStyle='#fbf5ea';gg.fillRect(0,0,w,h);gg.drawImage(artCanvas(260,260,[C.cinnamon,C.petal,C.brown,C.sage],2),20,20);gg.fillStyle=C.ink;gg.font=`700 34px ${FH}`;gg.fillText('ateliê, 2026',30,330);})),w:.22,h:.264,x:.36,y:-.18,r:-.07},
    {tex:tex(makeCanvas(256,256,(gg,w,h)=>{paper(gg,w,h,'#f0dfb0',.02);gg.fillStyle=C.ink;gg.font=`700 44px ${FH}`;['menos','texto,','mais','ideia.'].forEach((t,i)=>gg.fillText(t,30,70+i*50));})),w:.16,h:.16,x:.72,y:-.26,r:.1},
  ];
  items.forEach((it,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(it.w,it.h),sm({map:it.tex,roughness:1}));m.position.set(it.x,it.y,.02+i*.002);m.rotation.z=it.r;m.receiveShadow=true;g.add(m);
    const pin=new THREE.Mesh(new THREE.SphereGeometry(.012,12,8),sm({color:[C.brown,C.sage,C.cinnamon][i%3],roughness:.4}));pin.position.set(it.x,it.y+it.h*.44,.04+i*.002);pin.castShadow=true;g.add(pin);});}

/* ================= back desk ================= */
box(2*RX-.02,.05,deskZ1-deskZ0,M.deskWood,0,deskTop-.025,deskZc);addCol(-RX,RX,deskZ0,deskZ1);
for(const x of [-RX+.32,RX-.32]){box(.6,deskTop-.05,.74,M.sage,x,(deskTop-.05)/2,deskZc+.02);for(let k=0;k<3;k++){const y=.14+k*.23;box(.54,.2,.01,sm({color:shade(C.sage,.03)}),x,y,deskZ1+.025,{cast:false});box(.12,.022,.03,M.brass,x,y+.04,deskZ1+.04,{cast:false});}}
for(const x of [-1.25,1.25]){box(.05,deskTop-.05,.06,M.woodDark,x,(deskTop-.05)/2,deskZ1-.06);box(.05,deskTop-.05,.06,M.woodDark,x,(deskTop-.05)/2,deskZ0+.06);box(.05,.05,.7,M.woodDark,x,.12,deskZc);}
function mug(x,y,z,col,parent=scene){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);const mat=sm({color:col,roughness:.45});g.userData.mat=mat;g.userData.body=cyl(.042,.038,.1,mat,0,.05,0,{parent:g,seg:40});
  const h=new THREE.Mesh(new THREE.TorusGeometry(.028,.008,8,16,Math.PI),mat);h.position.set(.045,.05,0);h.rotation.z=-Math.PI/2;g.add(h);g.userData.handle=h;g.userData.coffee=cyl(.038,.038,.002,sm({color:'#3b2114',roughness:.25}),0,.09,0,{parent:g,cast:false});return g;}
function pencilCup(x,z){const g=new THREE.Group();g.position.set(x,deskTop,z);scene.add(g);cyl(.05,.045,.12,M.terracotta,0,.06,0,{parent:g});const cols=[C.brown,C.sage,'#2b1f19',C.cinnamon,'#c9a43f',C.petal];
  for(let i=0;i<9;i++){const p=new THREE.Group();p.position.set(R(-.025,.025),.06,R(-.025,.025));p.rotation.set(R(-.25,.25),0,R(-.25,.25));g.add(p);cyl(.004,.004,.18,sm({color:cols[i%6]}),0,.09,0,{parent:p,seg:6});const tip=new THREE.Mesh(new THREE.ConeGeometry(.004,.018,6),sm({color:'#d9bd95'}));tip.position.y=.189;p.add(tip);}}
function paperStack(x,z,n,w,d,ry){for(let i=0;i<n;i++)box(w,.0016,d,i===n-1?sm({map:tex(artCanvas(256,360,[C.cinnamon,C.sage,C.brown,C.petal],i%3,'#fbf5ea')),roughness:1}):M.linen,x+R(-.006,.006),deskTop+.0008+i*.0017,z+R(-.006,.006),{ry:ry+R(-.04,.04),cast:i===0});}
function pencil(x,z,ry,col){const p=cyl(.004,.004,.17,sm({color:col}),x,deskTop+.004,z,{seg:6});p.rotation.z=Math.PI/2;p.rotation.y=ry;}
function paintPalette(x,z){const s=new THREE.Shape();s.ellipse(0,0,.13,.09,0,Math.PI*2);const hole=new THREE.Path();hole.absarc(-.07,.02,.018,0,Math.PI*2,true);s.holes.push(hole);
  const m=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:.006,bevelEnabled:false}),sm({color:'#c2966a',roughness:.6}));m.rotation.x=-Math.PI/2;m.position.set(x,deskTop,z);m.castShadow=m.receiveShadow=true;scene.add(m);
  [C.brown,C.sage,C.cinnamon,'#2b1f19',C.petal,'#c9a43f'].forEach((c,i)=>{const b=new THREE.Mesh(new THREE.SphereGeometry(.016,12,8),sm({color:c,roughness:.35}));b.scale.y=.35;const a=i/6*Math.PI*1.4-.2;b.position.set(x+Math.cos(a)*.08+.01,deskTop+.008,z-Math.sin(a)*.05);scene.add(b);});}
mug(-2.65,deskTop,-2.35,C.sage);pencilCup(-1.2,-2.8);pencilCup(2.9,-2.8);
paperStack(-1.85,-2.55,8,.21,.297,.15);paperStack(2.35,-2.6,5,.3,.42,-.1);
pencil(-1.45,-2.35,.6,C.brown);pencil(1.35,-2.62,-.4,'#2b1f19');pencil(1.2,-2.25,1.2,C.sage);paintPalette(1.75,-2.4);
box(.3,.003,.03,sm({color:'#d2bf9c'}),-2.2,deskTop+.0015,-2.3,{ry:-.3,cast:false});
cyl(.025,.03,.06,sm({color:'#2b1f19',roughness:.2}),2.05,deskTop+.03,-2.8);
function bookStack(x,z,n){let y=deskTop;for(let i=0;i<n;i++){const h=R(.025,.045);box(R(.16,.22),h,R(.22,.28),sm({color:[C.brown,C.sage,C.cinnamon,C.petal,'#5b3322'][i%5]}),x+R(-.02,.02),y+h/2,z,{ry:R(-.2,.2)});y+=h;}}
bookStack(-2.95,-2.6,4);bookStack(3.0,-2.5,3);
{const g=new THREE.Group();g.position.set(-1.62,deskTop,-2.82);g.rotation.y=.35;scene.add(g);cyl(.07,.08,.025,M.black,0,.012,0,{parent:g});
  rod([0,.02,0],[.12,.42,.1],.008,M.black,g);rod([.12,.42,.1],[.34,.56,.22],.008,M.black,g);const head=cyl(.035,.085,.13,sm({color:C.brown,side:THREE.DoubleSide}),.36,.53,.24,{parent:g,open:true});head.rotation.set(.5,0,.7);}
const taskLight=new THREE.SpotLight('#ffdcb5',1.1,4,.9,1,2);taskLight.position.set(-.5,deskTop+1.25,-2.3);taskLight.target.position.set(.1,deskTop,-2.5);taskLight.castShadow=true;taskLight.shadow.mapSize.set(LOW?512:1024,LOW?512:1024);taskLight.shadow.bias=-.0004;taskLight.shadow.normalBias=.004;scene.add(taskLight,taskLight.target);
for(const x of [-2.6,2.6]){cyl(.004,.004,.85,M.black,x,RH-.425,deskZc,{seg:6,cast:false});cyl(.05,.2,.18,sm({color:C.cinnamon,side:THREE.DoubleSide}),x,RH-.94,deskZc,{open:true,cast:false});
  const b=new THREE.Mesh(new THREE.SphereGeometry(.04,12,8),sm({color:'#fff',emissive:'#ffd2a0',emissiveIntensity:1.2}));b.position.set(x,RH-1.0,deskZc);scene.add(b);const p=new THREE.PointLight('#ffcb98',1.7,4.5,2);p.position.set(x,RH-1.08,deskZc);scene.add(p);}
function chair(x,z,ry,cushion=C.petal){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);box(.44,.05,.42,M.wood,0,.45,0,{parent:g,rounded:.012});box(.4,.04,.38,sm({color:cushion,roughness:1}),0,.49,0,{parent:g,rounded:.015});
  for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]])cyl(.016,.014,.45,M.wood,sx*.19,.225,sz*.18,{parent:g,seg:10});box(.44,.32,.035,M.wood,0,.82,.2,{parent:g,rounded:.012});for(const sx of [-1,1])cyl(.016,.016,.4,M.wood,sx*.19,.66,.2,{parent:g,seg:10});addCol(x-.26,x+.26,z-.26,z+.26);}
chair(1.9,-1.85,-.5);

/* ================= bookshelf ================= */
{const sx=-RX+.18,z0=-1.95,z1=.35,H=2.36,D=.34;const g=new THREE.Group();scene.add(g);
  box(D,H,.04,M.woodDark,sx,H/2,z0,{parent:g});box(D,H,.04,M.woodDark,sx,H/2,z1,{parent:g});box(.02,H,z1-z0,M.wood,-RX+.01,H/2,(z0+z1)/2,{parent:g,cast:false});
  const levels=[.06,.52,.98,1.44,1.9,H-.02];levels.forEach(y=>box(D,.035,z1-z0,M.woodDark,sx,y,(z0+z1)/2,{parent:g}));box(.02,H,.04,M.woodDark,sx,H/2,(z0+z1)/2,{parent:g});
  const cols=[C.brown,C.cinnamon,C.sage,C.petal,C.linen,'#5b2e20','#6e6c52','#d2b196','#3b2a22','#bf8460','#77857f'];
  const N=400;const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),sm({roughness:.9}),N);inst.castShadow=inst.receiveShadow=true;const mtx=new THREE.Matrix4(),q=new THREE.Quaternion(),col=new THREE.Color();let n=0;
  for(let l=0;l<5;l++){const yb=levels[l]+.018;let z=z0+.03;
    while(z<z1-.06&&n<N){if(Math.abs(z-(z0+z1)/2)<.03){z+=.04;continue;}
      if(rnd()<.06){if(rnd()<.5){cyl(.05,.04,.09,M.terracotta,sx+.02,yb+.045,z+.07,{parent:g});const pl=new THREE.Mesh(new THREE.IcosahedronGeometry(.07,1),M.leaf);pl.position.set(sx+.02,yb+.14,z+.07);pl.scale.set(1,.8,1);pl.castShadow=true;g.add(pl);}else cyl(.035,.05,.16,M.ceramic,sx+.02,yb+.08,z+.07,{parent:g});z+=.16;continue;}
      if(rnd()<.07){let y=yb;const k=2+(rnd()*3|0);for(let i=0;i<k;i++){const h=R(.025,.04);mtx.compose(new V3(sx+.02,y+h/2,z+.1),q.setFromEuler(new THREE.Euler(0,R(-.1,.1),0)),new V3(R(.18,.24),h,R(.14,.2)));inst.setMatrixAt(n,mtx);inst.setColorAt(n,col.set(cols[(rnd()*cols.length)|0]));n++;y+=h;}z+=.24;continue;}
      const t=R(.022,.055),h=R(.2,.36),d=R(.18,.26);mtx.compose(new V3(sx+.15-d/2,yb+h/2,z+t/2),q.identity(),new V3(d,h,t));inst.setMatrixAt(n,mtx);inst.setColorAt(n,col.set(shade(cols[(rnd()*cols.length)|0],R(-.06,.03))));n++;z+=t+R(0,.004);}}
  inst.count=n;g.add(inst);addCol(-RX,-RX+.36,z0-.02,z1+.02);}

/* ================= window + light ================= */
{const zc=(WZ0+WZ1)/2,ww=WZ1-WZ0,wh=WY1-WY0,yc=(WY0+WY1)/2;const g=new THREE.Group();g.position.set(RX,yc,zc);g.rotation.y=-Math.PI/2;scene.add(g);
  box(ww+.16,.08,.22,M.trim,0,wh/2+.04,0,{parent:g});box(ww+.24,.05,.3,M.linen,0,-wh/2-.025,.04,{parent:g});box(.08,wh,.22,M.trim,-ww/2-.04,0,0,{parent:g});box(.08,wh,.22,M.trim,ww/2+.04,0,0,{parent:g});
  box(.045,wh,.06,M.trim,0,0,-.02,{parent:g});box(ww,.045,.06,M.trim,0,wh*.18,-.02,{parent:g});const gl=new THREE.Mesh(new THREE.PlaneGeometry(ww,wh),M.glass);gl.position.z=-.02;g.add(gl);
  const out=new THREE.Mesh(new THREE.PlaneGeometry(9,5.6),new THREE.MeshBasicMaterial({map:outsideTex,color:'#e9e1d6'}));out.position.set(-.3,.35,-3.2);g.add(out);
  const cg=new THREE.PlaneGeometry(.55,wh+.55,24,1);const pos=cg.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getX(i)*38)*.025);cg.computeVertexNormals();
  const cm=sm({color:C.petal,roughness:1,side:THREE.DoubleSide,transparent:true,opacity:.92});for(const s of [-1,1]){const c=new THREE.Mesh(cg,cm);c.position.set(s*(ww/2+.22),.05,.16);c.castShadow=true;g.add(c);}
  const rodm=cyl(.012,.012,ww+1.2,M.brass,0,wh/2+.32,.16,{parent:g,cast:false});rodm.rotation.z=Math.PI/2;
  cyl(.06,.05,.1,M.terracotta,.5,-wh/2+.05,.08,{parent:g});for(let i=0;i<7;i++){const l=new THREE.Mesh(new THREE.ConeGeometry(.012,R(.14,.24),4),M.leaf2);l.position.set(.5+R(-.03,.03),-wh/2+.17,.08+R(-.03,.03));l.rotation.set(R(-.4,.4),0,R(-.4,.4));l.castShadow=true;g.add(l);}}
const sun=new THREE.DirectionalLight('#ffdcb8',1.7);sun.position.set(9.5,6.2,1.6);sun.target.position.set(1.0,0,-.6);sun.castShadow=true;sun.shadow.mapSize.set(LOW?1024:2048,LOW?1024:2048);
Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:22});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;scene.add(sun,sun.target);
scene.add(new THREE.HemisphereLight('#f3e4d2','#6b3b2a',.62));
{const fill=new THREE.PointLight('#ffe6cc',1.3,10,2);fill.position.set(0,2.6,.6);scene.add(fill);}
let dust;{const n=LOW?90:180;const g=new THREE.BufferGeometry();const p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=R(.6,3.4);p[i*3+1]=R(.2,2.6);p[i*3+2]=R(-1.6,.9);}g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const sprite=tex(makeCanvas(32,32,(gg)=>{const r=gg.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,'rgba(255,240,215,1)');r.addColorStop(1,'rgba(255,240,215,0)');gg.fillStyle=r;gg.fillRect(0,0,32,32);}));
  dust=new THREE.Points(g,new THREE.PointsMaterial({size:.012,map:sprite,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending,color:'#fff0d8'}));scene.add(dust);}

/* ================= plants ================= */
function bigPlant(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g);cyl(.2,.15,.36,M.terracotta,0,.18,0,{parent:g,seg:28});cyl(.19,.19,.01,M.soil,0,.35,0,{parent:g,cast:false});
  const ls=new THREE.Shape();ls.moveTo(0,0);ls.bezierCurveTo(.13,.08,.16,.3,0,.46);ls.bezierCurveTo(-.16,.3,-.13,.08,0,0);const lg=new THREE.ShapeGeometry(ls,10);
  for(let i=0;i<13;i++){const a=i/13*Math.PI*2+R(-.2,.2),hgt=R(.7,1.35),lean=R(.25,.6);const stem=cyl(.008,.01,hgt,M.leaf2,0,0,0,{parent:g,seg:5});stem.position.set(Math.cos(a)*lean*hgt*.25,.35+hgt/2,Math.sin(a)*lean*hgt*.25);stem.rotation.set(Math.sin(a)*lean*.6,0,-Math.cos(a)*lean*.6);
    const leaf=new THREE.Mesh(lg,i%2?M.leaf:M.leaf2);leaf.position.set(Math.cos(a)*lean*hgt*.5,.35+hgt,Math.sin(a)*lean*hgt*.5);leaf.rotation.set(-Math.PI/2+R(.3,.9),-a+Math.PI/2,0,'YXZ');leaf.scale.setScalar(R(.8,1.25));leaf.castShadow=true;g.add(leaf);}
  addCol(x-.24*s,x+.24*s,z-.24*s,z+.24*s);}
bigPlant(3.05,-1.75,1.05);bigPlant(-.62,4.95,.8);bigPlant(-3.05,.85,.7);

/* ================= reading corner ================= */
{const g=new THREE.Group();g.position.set(-2.55,0,2.1);g.rotation.y=2.3;scene.add(g);
  box(.82,.22,.78,M.fabric,0,.24,0,{parent:g,rounded:.05});box(.68,.14,.62,sm({color:'#b97253',roughness:1}),0,.42,-.03,{parent:g,rounded:.05});box(.82,.56,.18,M.fabric,0,.6,.32,{parent:g,rounded:.06});
  for(const s of [-1,1])box(.14,.34,.78,M.fabric,s*.38,.46,0,{parent:g,rounded:.05});box(.42,.3,.12,sm({color:C.sage,roughness:1}),.1,.56,.18,{parent:g,rounded:.05}).rotation.z=.2;
  for(const [x,z] of [[-.34,-.32],[.34,-.32],[-.34,.32],[.34,.32]])cyl(.02,.015,.13,M.woodDark,x,.065,z,{parent:g,seg:8});addCol(-3.05,-2.05,1.6,2.6);
  cyl(.24,.24,.03,M.wood,-1.78,.52,2.62);cyl(.025,.025,.5,M.woodDark,-1.78,.26,2.62,{seg:10});cyl(.16,.18,.02,M.woodDark,-1.78,.01,2.62);addCol(-2.02,-1.54,2.38,2.86);
  mug(-1.72,.535,2.58,C.cinnamon);{let y=.535;for(let i=0;i<3;i++){box(.18,.035,.24,sm({color:[C.sage,C.brown,C.petal][i]}),-1.86,y+.0175,2.66,{ry:R(-.3,.3)});y+=.035;}}
  const fl=new THREE.Group();fl.position.set(-3.1,0,2.65);scene.add(fl);cyl(.15,.17,.03,M.black,0,.015,0,{parent:fl});cyl(.012,.012,1.5,M.brass,0,.76,0,{parent:fl,seg:8});
  const fshade=cyl(.15,.22,.3,sm({color:C.linen,emissive:'#ffb26a',emissiveIntensity:.35,roughness:1,side:THREE.DoubleSide}),0,1.58,0,{parent:fl,open:true,cast:false});
  const flight=new THREE.PointLight('#ffc28a',1.5,4,2);flight.position.set(-3.1,1.45,2.65);scene.add(flight);addCol(-3.28,-2.92,2.47,2.83);
  makeInteractive(fl,'lamp','Luminária',{lamp:'floor'});lamps.floor={light:flight,shade:fshade,on:true,base:1.5,em:.35};}
{const rug=new THREE.Mesh(new THREE.PlaneGeometry(3.1,2.15),M.rug);rug.rotation.x=-Math.PI/2;rug.position.set(-.2,.004,.55);rug.receiveShadow=true;scene.add(rug);}

/* ================= easel (A-frame, paintable) ================= */
const easelCanvas=makeCanvas(500,625);const easelTex=tex(easelCanvas);easelTex.wrapS=easelTex.wrapT=THREE.ClampToEdgeWrapping;
function paintEasel(img){const g=easelCanvas.getContext('2d');g.fillStyle='#f6eee2';g.fillRect(0,0,500,625);speckle(g,500,625,'rgba(120,80,50,.05)',2500,1.4);
  if(img)g.drawImage(img,0,0,500,625);else{g.fillStyle='rgba(42,25,18,.5)';g.font=`700 48px ${FH}`;g.textAlign='center';g.fillText('tela em branco',250,300);g.font=`28px ${FU}`;g.fillText('use para pintar',250,348);g.textAlign='left';}easelTex.needsUpdate=true;}
paintEasel(null);
const EASEL={x:2.45,z:-.05,ry:-1.15};
{const g=new THREE.Group();g.position.set(EASEL.x,0,EASEL.z);g.rotation.y=EASEL.ry;scene.add(g);
  for(const s of [-1,1])rod([s*.34,0,.14],[s*.05,1.92,-.05],.018,M.wood,g);
  rod([0,.7,.03],[0,2.02,-.07],.016,M.wood,g);rod([0,1.86,-.06],[0,0,-.62],.016,M.wood,g);rod([-.27,.42,.11],[.27,.42,.11],.012,M.wood,g);rod([0,.6,-.04],[0,.52,-.38],.01,M.woodDark,g);
  const tray=box(.82,.03,.08,M.wood,0,.8,.085,{parent:g});box(.82,.03,.012,M.wood,0,.825,.125,{parent:g});
  const tilt=Math.atan2(.19,1.92);
  const cv=new THREE.Mesh(new THREE.BoxGeometry(.7,.875,.028),[M.linen,M.linen,M.linen,M.linen,sm({map:easelTex,roughness:1}),sm({color:'#d8c3a5'})]);
  cv.position.set(0,.83+.4375*Math.cos(tilt),.08-.4375*Math.sin(tilt));cv.rotation.x=-tilt;cv.castShadow=true;cv.receiveShadow=true;g.add(cv);
  const cl=box(.12,.04,.06,M.wood,0,1.72,-.01,{parent:g});cl.rotation.x=-tilt;
  cyl(.17,.17,.03,M.wood,.58,.5,.3,{parent:g});for(const a of [0,2.1,4.2])rod([.58+Math.cos(a)*.13,0,.3+Math.sin(a)*.13],[.58+Math.cos(a)*.08,.49,.3+Math.sin(a)*.08],.012,M.woodDark,g);
  cyl(.04,.035,.1,M.ceramic,.53,.565,.27,{parent:g});for(let i=0;i<4;i++)rod([.53,.56,.27],[.53+R(-.04,.04),.76,.27+R(-.04,.04)],.004,M.woodDark,g);
  makeInteractive(cv,'easel','Cavalete');makeInteractive(tray,'easel','Cavalete');addCol(EASEL.x-.5,EASEL.x+.5,EASEL.z-.5,EASEL.z+.5);}

/* ================= writing desk + abajur ================= */
{const x=RX-.32,z=2.25;const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  box(.6,.04,1.25,M.deskWood,0,.76,0,{parent:g,rounded:.01});box(.5,.12,1.1,M.wood,0,.68,0,{parent:g});box(.01,.08,.5,M.brass,-.256,.68,0,{parent:g,cast:false});
  for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const l=cyl(.02,.014,.74,M.woodDark,sx*.26,.37,sz*.58,{parent:g,seg:10});l.rotation.set(sz*.04,0,-sx*.04);}addCol(x-.32,x+.32,z-.64,z+.64);
  const nb=new THREE.Mesh(new THREE.PlaneGeometry(.36,.25),sm({map:tex(makeCanvas(720,500,(gg,w,h)=>{paper(gg,w,h,'#fbf5ea',.05);gg.fillStyle='rgba(0,0,0,.08)';gg.fillRect(w/2-2,0,4,h);gg.fillStyle=C.ink;gg.font=`700 46px ${FH}`;gg.fillText('ideias soltas',40,74);
    gg.font=`40px ${FP}`;['logo: livro aberto','paleta: terra + sálvia','escrita de caneta','menos perguntas!'].forEach((t,i)=>gg.fillText(t,40,140+i*48));gg.strokeStyle=C.cinnamon;gg.lineWidth=3;gg.beginPath();gg.arc(540,180,70,0,7);gg.stroke();})),roughness:1}));
  nb.rotation.x=-Math.PI/2;nb.rotation.z=1.75;nb.position.set(-.05,.782,-.05);nb.receiveShadow=true;g.add(nb);
  const pen=cyl(.005,.005,.15,M.black,-.02,.787,.18,{parent:g,seg:6});pen.rotation.z=Math.PI/2;pen.rotation.y=.5;
  {let y=.78;for(let i=0;i<4;i++){box(.17,.03,.24,sm({color:[C.brown,C.petal,C.sage,C.cinnamon][i]}),.12,y+.015,-.44,{parent:g,ry:R(-.2,.2)});y+=.03;}}
  const lamp=new THREE.Group();lamp.position.set(.12,.78,.42);g.add(lamp);cyl(.07,.085,.03,M.brass,0,.015,0,{parent:lamp});const body=new THREE.Mesh(new THREE.SphereGeometry(.075,24,16),sm({color:C.sage,roughness:.5}));body.position.y=.1;body.scale.y=1.15;body.castShadow=true;lamp.add(body);
  cyl(.008,.008,.16,M.brass,0,.24,0,{parent:lamp,seg:8});const shadeM=cyl(.1,.16,.18,sm({color:C.linen,emissive:'#ffb26a',emissiveIntensity:.4,roughness:1,side:THREE.DoubleSide}),0,.36,0,{parent:lamp,open:true,cast:false});
  const ll=new THREE.PointLight('#ffbf86',1.7,3.5,2);ll.position.set(x+.12,1.08,z+.42);scene.add(ll);
  makeInteractive(lamp,'lamp','Abajur',{lamp:'abajur'});lamps.abajur={light:ll,shade:shadeM,on:true,base:1.7,em:.4};
  chair(x-.62,z,Math.PI/2+.15,C.sage);}

/* ================= coffee corner ================= */
const coffee={busy:false,holding:false,t:0};
{const g=new THREE.Group();g.position.set(1.55,0,RZ-.22);g.rotation.y=Math.PI;scene.add(g);
  box(1.15,.86,.42,M.sage,0,.43,0,{parent:g});box(1.2,.04,.46,M.deskWood,0,.88,0,{parent:g,rounded:.01});
  for(const s of [-1,1]){box(.54,.74,.01,sm({color:shade(C.sage,.03)}),s*.285,.44,-.215,{parent:g,cast:false});box(.02,.14,.02,M.brass,s*.04,.55,-.225,{parent:g,cast:false});}
  const m=new THREE.Group();m.position.set(-.2,.9,.02);g.add(m);
  box(.3,.32,.3,sm({color:C.brown,roughness:.6}),0,.16,0,{parent:m,rounded:.03});box(.3,.04,.3,M.steel,0,.34,0,{parent:m,rounded:.01});
  box(.24,.02,.12,M.steel,0,.012,-.18,{parent:m});cyl(.035,.035,.04,M.steel,0,.25,-.17,{parent:m});cyl(.03,.026,.03,M.black,0,.215,-.17,{parent:m});box(.02,.02,.12,M.black,0,.215,-.25,{parent:m});
  const led=new THREE.Mesh(new THREE.SphereGeometry(.01,8,6),sm({color:'#ffcf8a',emissive:'#ffb060',emissiveIntensity:.6}));led.position.set(.1,.27,-.151);m.add(led);
  for(const a of [-.06,.06]){const d=cyl(.018,.018,.012,M.steel,a+.05,.2,-.152,{parent:m});d.rotation.x=Math.PI/2;}
  const cupSpot=mug(0,.025,-.17,C.linen,m);cupSpot.visible=false;cupSpot.scale.setScalar(.85);
  cyl(.05,.06,.18,M.black,.12,.99,.05,{parent:g});cyl(.06,.035,.1,sm({color:'#d9c6ad',transparent:true,opacity:.6,roughness:.15}),.12,1.13,.05,{parent:g});
  cyl(.06,.06,.16,sm({color:'#cfb89a',roughness:.45}),.3,.98,.04,{parent:g});cyl(.063,.063,.02,M.wood,.3,1.07,.04,{parent:g});
  coffee.counterMug=mug(.46,.9,-.1,C.cinnamon,g);[C.petal,C.sage].forEach((c,i)=>mug(.46,.9,.01+i*.11,c,g));
  const sf=new THREE.Group();sf.position.set(0,1.55,.2);sf.rotation.y=Math.PI;g.add(sf);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(.4,.26),sm({map:tex(makeCanvas(400,260,(gg,w,h)=>{gg.fillStyle='#2e231d';gg.fillRect(0,0,w,h);speckle(gg,w,h,'rgba(255,255,255,.05)',3000,1.5);gg.fillStyle='#efe3d2';gg.font=`700 70px ${FH}`;gg.textAlign='center';gg.fillText('café',w/2,110);gg.font=`36px ${FP}`;gg.fillText('pegue o seu e volte a criar',w/2,185);})),roughness:1}));
  sign.position.z=.006;sf.add(sign);frame(.4,.26,.02,.02,M.wood,sf,0);
  const steamTex=tex(makeCanvas(64,64,(gg)=>{const r=gg.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');gg.fillStyle=r;gg.fillRect(0,0,64,64);}));
  const steam=[];for(let i=0;i<6;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:steamTex,transparent:true,opacity:0,depthWrite:false}));s.scale.setScalar(.06);m.add(s);steam.push(s);}
  coffee.machine={m,cupSpot,led,steam,steamTex};makeInteractive(m,'coffee','Cafeteira');addCol(.9,2.2,RZ-.48,RZ);}
const heldMug=mug(.26,-.3,-.55,C.cinnamon,camera);heldMug.visible=false;heldMug.rotation.y=-.5;heldMug.userData.coffee.position.y=.088;heldMug.traverse(o=>{o.castShadow=false;});
const deskMug=mug(0,deskTop,-2.32,C.cinnamon);deskMug.visible=false;deskMug.userData.coffee.position.y=.088;
const heldSteam=[];for(let i=0;i<4;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:coffee.machine.steamTex,transparent:true,opacity:0,depthWrite:false}));s.scale.setScalar(.05);heldMug.add(s);heldSteam.push(s);}

const deskHit=new THREE.Mesh(new THREE.BoxGeometry(2*RX,.06,deskZ1-deskZ0),new THREE.MeshBasicMaterial({visible:false}));deskHit.position.set(0,deskTop,deskZc);scene.add(deskHit);deskHit.userData.action='desk';deskHit.userData.label='Mesa de projetos';interact.push(deskHit);

/* ================= sketchbooks ================= */
const BW=.21,BH=.28,NS=8,ST=.0012,CT=.0035,BT=.0035,PW=BW-.006,PH=BH-.012,SEG=18;
const EXAMPLE={id:'exemplo',title:'Café Brasa',sub:'torrefação artesanal',example:true,cover:C.brown,coverInk:C.linen,
  concept:'Torrefação pequena, fogo lento e conversa longa. A marca precisa cheirar a café recém-moído e ter o calor de uma brasa acesa.',keys:['artesanal','quente','ritual','terroso'],
  pal:[['Brasa','#8E412E'],['Grão','#3B2419'],['Crema','#E6CEBC'],['Papel','#F4ECE2'],['Canela','#BA6F4D']]};
const BLANK={id:'novo',title:'Novo projeto',blank:true,cover:'#d4b89e',coverInk:C.brown};
let userProjects=[];
const PAGE_RES=LOW?[512,683]:[768,1024];
const fmtDate=ts=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(ts));
function coverCanvas(p){const [w,h]=PAGE_RES;return makeCanvas(w,h,(g)=>{const s=w/768;g.fillStyle=p.cover;g.fillRect(0,0,w,h);speckle(g,w,h,'rgba(0,0,0,.06)',w*h/90,2);speckle(g,w,h,'rgba(255,255,255,.07)',w*h/200,2);
  if(p.blank||p.user){stampLogo(g,LOGO.mark,w/2,240*s,300*s);g.fillStyle='#f6eee2';roundRect(g,110*s,500*s,548*s,280*s,14*s);g.fill();g.strokeStyle='rgba(142,65,46,.35)';g.lineWidth=3*s;g.stroke();
    g.strokeStyle='rgba(142,65,46,.18)';g.lineWidth=2*s;for(let i=0;i<3;i++){g.beginPath();g.moveTo(150*s,(650+i*40)*s);g.lineTo(618*s,(650+i*40)*s);g.stroke();}
    g.fillStyle=C.brown;g.textAlign='center';g.font=`700 ${(p.title.length>16?60:80)*s}px ${FH}`;g.fillText(p.title,w/2,620*s);
    g.font=`${38*s}px ${FP}`;g.fillStyle='rgba(42,25,18,.6)';g.fillText(p.blank?'comece um projeto aqui':'desde '+fmtDate(p.created),w/2,745*s);g.textAlign='left';}
  else{const pc=p.pal.map(c=>c[1]);for(let i=6;i>=0;i--){g.fillStyle=i%2?shade(p.cover,.06):shade(p.cover,-.04);g.beginPath();g.arc(w*.62,h*.38,(60+i*40)*s,0,7);g.fill();}g.fillStyle=pc[4];g.beginPath();g.arc(w*.62,h*.38,58*s,0,7);g.fill();
    g.fillStyle=p.coverInk;g.font=`${92*s}px Gloock`;wrapText(g,p.title,64*s,h-220*s,w-120*s,96*s);g.font=`700 ${50*s}px ${FH}`;g.fillText(p.sub,68*s,h-90*s);}
  g.fillStyle='rgba(30,15,10,.32)';g.fillRect(w-70*s,0,22*s,h);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(w-70*s,0,4*s,h);});}
const endTex=tex(makeCanvas(PAGE_RES[0],PAGE_RES[1],(g,w,h)=>{paper(g,w,h,C.petal,.05);g.globalAlpha=.16;const st=150*w/768;for(let y=0,r=0;y<h+st;y+=st,r++)for(let x=(r%2)*st/2-st/2;x<w+st;x+=st)stampLogo(g,LOGO.markBrown,x+st/2,y+st/2,st*.8);g.globalAlpha=1;}));
const blankPageTex=tex(makeCanvas(256,341,(g,w,h)=>paper(g,w,h,'#f6efe4',.06)));
function dotGrid(g,w,h){g.fillStyle='rgba(142,65,46,.2)';const sp=32*w/768;for(let y=sp*2;y<h-sp;y+=sp)for(let x=sp*1.5;x<w-sp;x+=sp){g.beginPath();g.arc(x,y,1.5*w/768,0,7);g.fill();}}
function pageCanvas(p,k){const [w,h]=PAGE_RES;const s=w/768;return makeCanvas(w,h,(g)=>{paper(g,w,h,'#f6efe4',.06);const left=k%2===1;
  g.fillStyle='rgba(42,25,18,.45)';g.font=`${22*s}px ${FU}`;g.textAlign=left?'left':'right';g.fillText(String(k+1),left?48*s:w-48*s,h-40*s);g.textAlign='left';
  if(p.blank||p.user){dotGrid(g,w,h);if(k===0){stampLogo(g,LOGO.stack,w/2,240*s,w*.6);g.textAlign='center';
      if(p.blank){g.fillStyle=C.cinnamon;g.font=`700 ${72*s}px ${FH}`;g.fillText('comece aqui.',w/2,480*s);g.fillStyle='rgba(42,25,18,.6)';g.font=`${28*s}px ${FU}`;g.fillText('Este caderno guarda o seu próximo projeto.',w/2,540*s);}
      else{g.fillStyle=C.ink;g.font=`700 ${84*s}px ${FH}`;wrapText(g,p.title,w/2,500*s,w-140*s,84*s);g.fillStyle='rgba(42,25,18,.6)';g.font=`${40*s}px ${FP}`;g.fillText('aberto em '+fmtDate(p.created),w/2,640*s);}g.textAlign='left';}return;}
  const pc=p.pal.map(c=>c[1]);const M0=64*s;const label=(t)=>{g.fillStyle=pc[0];g.font=`700 ${46*s}px ${FH}`;g.fillText(t,M0,98*s);g.strokeStyle='rgba(42,25,18,.25)';g.lineWidth=2*s;g.beginPath();g.moveTo(M0,114*s);for(let x=M0;x<w-M0;x+=18*s)g.lineTo(x,114*s+Math.sin(x)*1.2*s);g.stroke();};
  switch(k){
    case 0:{brandMark(g,M0,140*s,1.6*s,pc[0],pc[4],p.title);g.fillStyle=C.ink;g.font=`${88*s}px Gloock`;wrapText(g,p.title,M0,400*s,w-2*M0,92*s);g.fillStyle=pc[4];g.font=`700 ${56*s}px ${FH}`;g.fillText(p.sub,M0,510*s);
      g.fillStyle='rgba(42,25,18,.6)';g.font=`${26*s}px ${FU}`;g.fillText('brand book · exemplo',M0,h-120*s);g.fillStyle=pc[0];g.fillRect(M0,h-100*s,120*s,4*s);break;}
    case 1:{label('Conceito');g.fillStyle=C.ink;g.font=`500 ${42*s}px ${FH}`;const y=wrapText(g,p.concept,M0,190*s,w-2*M0,52*s);let x=M0,yy=y+90*s;g.font=`${24*s}px ${FU}`;
      p.keys.forEach((kk,i)=>{const tw=g.measureText(kk).width+36*s;if(x+tw>w-M0){x=M0;yy+=58*s;}g.strokeStyle=pc[i%2?4:0];g.lineWidth=2.5*s;roundRect(g,x,yy-32*s,tw,46*s,22*s);g.stroke();g.fillStyle=C.ink;g.fillText(kk,x+18*s,yy);x+=tw+12*s;});break;}
    case 2:{label('Paleta');const bh=(h-260*s)/5;p.pal.forEach(([n,c],i)=>{g.fillStyle=c;g.fillRect(M0,140*s+i*bh,w-2*M0,bh-8*s);const lum=new THREE.Color(c).getHSL({}).l;g.fillStyle=lum>.6?'rgba(42,25,18,.85)':'rgba(255,248,240,.92)';
      g.font=`700 ${48*s}px ${FH}`;g.fillText(n,M0+28*s,140*s+i*bh+bh*.5);g.font=`${22*s}px ${FU}`;g.fillText('HEX '+c.toUpperCase(),M0+30*s,140*s+i*bh+bh*.5+34*s);});break;}
    case 3:{label('Tipografia');g.fillStyle=C.ink;g.font=`${300*s}px Gloock`;g.fillText('Aa',M0-8*s,450*s);g.font=`${24*s}px ${FU}`;g.fillStyle=pc[0];g.fillText('títulos: Gloock',M0,510*s);g.fillText('apoio: Caveat',M0,690*s);
      g.fillStyle=C.ink;g.font=`${44*s}px Gloock`;g.fillText('Ideias viram marca',M0,570*s);g.font=`500 ${42*s}px ${FH}`;wrapText(g,'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789',M0,750*s,w-2*M0,44*s);break;}
    case 4:{label('Logo');g.strokeStyle='rgba(42,25,18,.15)';g.lineWidth=1.5*s;for(let i=1;i<6;i++){g.beginPath();g.arc(w/2,400*s,i*48*s,0,7);g.stroke();}
      brandMark(g,w/2-150*s,300*s,2.5*s,pc[0],pc[4],p.title);[[pc[0],pc[3]],[pc[3],pc[0]],[pc[4],pc[3]]].forEach(([bg,fg],i)=>{const x=M0+i*((w-2*M0)/3),bw=(w-2*M0)/3-14*s;g.fillStyle=bg;g.fillRect(x,740*s,bw,170*s);brandMark(g,x+bw/2-60*s,785*s,1*s,fg,fg===pc[3]?pc[4]:pc[0],p.title);});break;}
    case 5:{label('Moodboard');const cells=[[0,0,2,2],[2,0,1,1],[2,1,1,1],[0,2,1,1],[1,2,2,1]];const cw=(w-2*M0)/3,ch=(h-270*s)/3;
      cells.forEach(([cx,cy,sw,sh],i)=>{const x=M0+cx*cw+6*s,y=140*s+cy*ch+6*s,ww=sw*cw-12*s,hh=sh*ch-12*s;g.drawImage(artCanvas(Math.round(ww),Math.round(hh),[pc[i%5],pc[(i+1)%5],pc[(i+3)%5],pc[(i+2)%5]],i%3,pc[(i+3)%5]),x,y);
        g.fillStyle='rgba(239,224,200,.85)';g.save();g.translate(x+ww/2,y);g.rotate(R(-.2,.2));g.fillRect(-36*s,-12*s,72*s,24*s);g.restore();});break;}
    case 6:{label('Padrão');const tile=60*s;for(let y=140*s;y<h-100*s;y+=tile)for(let x=M0;x<w-M0;x+=tile){const i=Math.round((x+y)/tile);g.fillStyle=pc[i%2?0:4];g.beginPath();if(i%3===0){g.arc(x+tile/2,y+tile*.8,tile*.38,Math.PI,0);g.fill();}else if(i%3===1){g.arc(x+tile/2,y+tile/2,tile*.16,0,7);g.fill();}else{g.fillStyle=pc[2];g.fillRect(x+tile*.2,y+tile*.45,tile*.6,tile*.1);}}break;}
    case 7:{label('Aplicações');g.lineWidth=4*s;g.strokeStyle=C.ink;g.fillStyle=pc[0];roundRect(g,M0+20*s,180*s,180*s,230*s,18*s);g.fill();g.stroke();brandMark(g,M0+50*s,255*s,1*s,pc[3],pc[4],p.title);
      g.fillStyle=pc[3];g.fillRect(w/2+20*s,170*s,250*s,300*s);g.strokeRect(w/2+20*s,170*s,250*s,300*s);brandMark(g,w/2+80*s,280*s,1.1*s,pc[0],pc[4],p.title);
      g.fillStyle=pc[4];g.fillRect(M0+20*s,560*s,w-2*M0-40*s,200*s);g.strokeRect(M0+20*s,560*s,w-2*M0-40*s,200*s);g.fillStyle=pc[3];g.font=`${54*s}px Gloock`;g.fillText(p.title,M0+60*s,680*s);
      g.fillStyle=C.ink;g.font=`${44*s}px ${FP}`;g.fillText('copo · sacola · cartão',M0+20*s,830*s);break;}
    default:{dotGrid(g,w,h);g.fillStyle=C.ink;g.font=`700 ${46*s}px ${FH}`;if(k%2===0){g.fillText('esboços',M0,120*s);g.strokeStyle=pc[0];g.lineWidth=3*s;g.globalAlpha=.7;for(let i=0;i<5;i++){g.beginPath();g.arc(R(.3,.7)*w,R(.3,.7)*h,R(60,160)*s,R(0,3),R(3,6.3));g.stroke();}g.globalAlpha=1;}
      else{g.fillText('notas',M0,120*s);g.font=`${44*s}px ${FP}`;['testar a paleta impressa','pedir amostras de papel','versão do logo em uma cor','fotos com luz natural'].forEach((t,i)=>g.fillText('• '+t,M0,210*s+i*60*s));}}
  }});}
function sheetGeometry(){const g=new THREE.BufferGeometry();const n=(SEG+1)*2;g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));const uv=new Float32Array(n*2);const idx=[];
  for(let j=0;j<=SEG;j++){uv[j*4]=j/SEG;uv[j*4+1]=1;uv[j*4+2]=j/SEG;uv[j*4+3]=0;if(j<SEG){const a=j*2,b=j*2+1,c=(j+1)*2,d=(j+1)*2+1;idx.push(a,b,c,c,b,d);}}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(idx);bendSheet(g,0,1);return g;}
function bendSheet(geo,angle,dir){const pos=geo.attributes.position.array;const lag=Math.sin(angle)*.85*dir;let px=.002,py=0;const dx=PW/SEG;
  for(let j=0;j<=SEG;j++){pos[j*6]=px;pos[j*6+1]=py;pos[j*6+2]=-PH/2;pos[j*6+3]=px;pos[j*6+4]=py;pos[j*6+5]=PH/2;const a=angle-lag*((j+.5)/SEG);px+=Math.cos(a)*dx;py+=Math.sin(a)*dx;}
  geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();}
const books=[];let sel=0;let mode='intro';
class Book{
  constructor(p,i){this.p=p;this.i=i;this.root=new THREE.Group();scene.add(this.root);this.disp=[];
    const edge=sm({color:shade(p.cover,-.05)});this.coverTex=tex(coverCanvas(p));const coverMat=sm({map:this.coverTex,roughness:.95});const inside=sm({map:endTex,roughness:1});this.disp.push(edge,coverMat,inside,this.coverTex);
    const bg=new THREE.BoxGeometry(BW,BT,BH).translate(BW/2,BT/2,0);this.back=new THREE.Mesh(bg,[edge,edge,inside,edge,edge,edge]);this.back.castShadow=this.back.receiveShadow=true;this.root.add(this.back);
    this.pivot=new THREE.Group();this.root.add(this.pivot);const cg=new THREE.BoxGeometry(BW,CT,BH).translate(BW/2,CT/2,0);this.cover=new THREE.Mesh(cg,[edge,edge,coverMat,inside,edge,edge]);this.cover.castShadow=this.cover.receiveShadow=true;this.pivot.add(this.cover);
    this.spine=new THREE.Mesh(new THREE.BoxGeometry(.006,1,BH),edge);this.spine.position.x=-.002;this.root.add(this.spine);this.disp.push(bg,cg,this.spine.geometry);
    this.sheets=[];for(let k=0;k<NS;k++){const geo=sheetGeometry();const fm=sm({map:blankPageTex,roughness:1,envMapIntensity:.15}),bm=sm({map:blankPageTex,roughness:1,side:THREE.BackSide,envMapIntensity:.15});
      const f=new THREE.Mesh(geo,fm),b=new THREE.Mesh(geo,bm);f.castShadow=true;f.receiveShadow=b.receiveShadow=true;const pv=new THREE.Group();pv.add(f,b);this.root.add(pv);this.sheets.push({pv,geo,f,b,a:0,t:0,dir:1});this.disp.push(geo,fm,bm);}
    this.coverA=0;this.coverT=0;this.lift=0;this.liftT=0;this.spread=0;this.texReady=false;this.pageTex=[];this.tok=0;this.rest=R(-.06,.06);this.root.traverse(o=>{if(o.isMesh)o.userData.book=i;});this.layout();
    const cref=custom['cover-'+p.id];if(cref)this.applyCustomCover(cref);else if(p.brand){brandCover(p).then(c=>{if(!c)return;this.coverTex.image=c;this.coverTex.needsUpdate=true;}).catch(()=>{});}}
  applyCustomCover(ref){loadImage(imgURL(ref)).then(img=>{this.coverTex.image=coverFromImage(img);this.coverTex.needsUpdate=true;}).catch(()=>{});}
  async restoreCover(){this.coverTex.image=this.p.brand?await brandCover(this.p):coverCanvas(this.p);this.coverTex.needsUpdate=true;}
  get open(){return this.coverT>0;}
  ensurePages(){if(this.texReady)return;this.texReady=true;this.pageTex=[];
    if(this.p.brand){const tok=++this.tok;(async()=>{for(let k=0;k<NS;k++){const rc=await brandPage(this.p,2*k),vc=await brandPage(this.p,2*k+1);if(!this.texReady||tok!==this.tok)return;const s=this.sheets[k];const rt=tex(rc),vt=tex(vc);vt.repeat.x=-1;vt.offset.x=1;s.f.material.map=rt;s.b.material.map=vt;s.f.material.needsUpdate=s.b.material.needsUpdate=true;this.pageTex.push(rt,vt);}})().catch(()=>{});return;}
    for(let k=0;k<NS;k++){const s=this.sheets[k];const rt=tex(pageCanvas(this.p,2*k)),vt=tex(pageCanvas(this.p,2*k+1));vt.repeat.x=-1;vt.offset.x=1;
    s.f.material.map=rt;s.b.material.map=vt;s.f.material.needsUpdate=s.b.material.needsUpdate=true;this.pageTex.push(rt,vt);}}
  dropPages(){if(!this.texReady)return;this.texReady=false;this.tok++;this.sheets.forEach(s=>{s.f.material.map=blankPageTex;s.b.material.map=blankPageTex;s.f.material.needsUpdate=s.b.material.needsUpdate=true;});this.pageTex.forEach(t=>t.dispose());this.pageTex=[];}
  dispose(){this.dropPages();scene.remove(this.root);this.disp.forEach(d=>d.dispose&&d.dispose());}
  layout(){const p=this.coverA/Math.PI;this.pivot.position.y=lerp(BT+NS*ST+.0008,CT,p);this.pivot.rotation.z=this.coverA;this.spine.scale.y=BT+NS*ST+CT;this.spine.position.y=this.spine.scale.y/2;
    this.sheets.forEach((s,k)=>{const q=s.a/Math.PI;s.pv.position.y=lerp(BT+.0004+(NS-1-k)*ST,CT+.0004+k*ST,q)+Math.sin(s.a)*.002;});}
  update(dt){const k=1-Math.exp(-dt*(REDUCED?20:5.5));let ch=false;if(Math.abs(this.coverT-this.coverA)>1e-4){this.coverA+=(this.coverT-this.coverA)*k;ch=true;}
    for(const s of this.sheets){const d=s.t-s.a;if(Math.abs(d)>1e-4){s.dir=Math.sign(d);s.a+=d*k*1.1;if(Math.abs(s.t-s.a)<1e-3)s.a=s.t;bendSheet(s.geo,s.a,s.dir);ch=true;}}
    this.lift+=(this.liftT-this.lift)*(1-Math.exp(-dt*6));this.root.position.y=deskTop+this.lift;const tr=(sel===this.i&&mode!=='explore')?0:this.rest;this.root.rotation.y+=(tr-this.root.rotation.y)*(1-Math.exp(-dt*5));if(ch)this.layout();}
}
const SPACING=.31;
function bookList(){return [EXAMPLE,...userProjects.map(u=>({id:u.id,title:u.title,created:u.created,user:true,brand:u.brand||null,cover:u.brand?u.brand.palette[0].hex:'#d4b89e',coverInk:C.brown})),BLANK];}
function buildBooks(selId){books.forEach(b=>b.dispose());books.length=0;const list=bookList();const n=list.length;const x0=-((n-1)*SPACING+BW)/2;
  list.forEach((p,i)=>{const b=new Book(p,i);b.root.position.set(x0+i*SPACING,deskTop,-2.5);b.root.rotation.y=b.rest;books.push(b);});
  const idx=selId?list.findIndex(p=>p.id===selId):-1;sel=idx>=0?idx:n-1;let mx=x0+(n-1)*SPACING+BW+.2;if(mx>1.05)mx=x0-.18;deskMug.position.x=mx;}
buildBooks();

/* ================= state & controls ================= */
const player={pos:new V3(0,1.62,4.75),yaw:0,pitch:-.03,vel:new V3()};
const keys=new Set();let locked=false,deskLock=false,bobT=0,walk=null;
camera.position.copy(player.pos);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
const typing=e=>/INPUT|TEXTAREA/.test((e.target&&e.target.tagName)||'');
addEventListener('keydown',e=>{if(typing(e))return;
  if(mode==='paint'){if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();e.shiftKey?redo():undo();}if(e.code==='Escape')closePaint();return;}
  if(!$('#gallery').classList.contains('is-hidden')){if(e.code==='Escape')closeGallery(true);return;}
  if(mode==='menu'){if(e.code==='Escape')closePosterMenu();return;}
  if(mode==='studio'){if(e.code==='Escape')closeStudio();return;}
  keys.add(e.code);
  if(mode==='explore'&&(e.code==='KeyE'||e.code==='Enter')){const hit=pick(innerWidth/2,innerHeight/2,interact,3.6);if(hit)doAction(hit);}
  if(mode==='desk'){if(e.code==='ArrowRight'){e.preventDefault();next();}if(e.code==='ArrowLeft'){e.preventDefault();prev();}if(e.code==='Enter'||e.code==='Space'){e.preventDefault();mainAction();}if(e.code==='Escape'||e.code==='Backspace')exitDesk();}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;});
document.addEventListener('mousemove',e=>{if(locked&&mode==='explore'){player.yaw-=e.movementX*.0022;player.pitch=clamp(player.pitch-e.movementY*.0022,-1.3,1.3);}});
const ptrs=new Map();let joyId=null,joyOrigin=null,joyVec={x:0,y:0};const joyEl=$('#joy'),joyKnob=joyEl.querySelector('i');
canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()});
  if(mode==='explore'&&e.pointerType==='touch'&&e.clientX<innerWidth*.45&&joyId===null){joyId=e.pointerId;joyOrigin={x:e.clientX,y:e.clientY};joyEl.style.left=e.clientX+'px';joyEl.style.top=e.clientY+'px';joyEl.classList.remove('is-hidden');$('#joyHome').classList.add('is-hidden');}
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}});
let pinch0=null,lastTap=0,panned=false;
canvas.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(mode==='desk'&&books[sel]&&books[sel].open){if(ptrs.size>=2){const [a,c]=[...ptrs.values()];const dist=Math.hypot(a.x-c.x,a.y-c.y);if(!pinch0)pinch0={dist,zoom:DV.zoom};DV.zoom=clamp(pinch0.zoom*dist/pinch0.dist,.6,2.4);panned=true;return;}
    if(Math.hypot(e.clientX-p.sx,e.clientY-p.sy)>12&&performance.now()-p.t>140){DV.pan.x=clamp(DV.pan.x+dx*DV.wpp,-.32,.32);DV.pan.z=clamp(DV.pan.z+dy*DV.wpp,-.22,.22);panned=true;}return;}
  if(e.pointerId===joyId){let vx=e.clientX-joyOrigin.x,vy=e.clientY-joyOrigin.y;const L=Math.hypot(vx,vy),m=50;if(L>m){vx*=m/L;vy*=m/L;}joyVec={x:vx/m,y:vy/m};joyKnob.style.transform=`translate(${vx}px,${vy}px)`;return;}
  if(mode==='explore'&&!locked){const k=e.pointerType==='touch'?.005:.0032;player.yaw-=dx*k;player.pitch=clamp(player.pitch-dy*k,-1.3,1.3);}});
function endPtr(e){const p=ptrs.get(e.pointerId);ptrs.delete(e.pointerId);if(!p)return;
  if(e.pointerId===joyId){joyId=null;joyVec={x:0,y:0};joyKnob.style.transform='';joyEl.classList.add('is-hidden');if(mode==='explore'&&TOUCH)$('#joyHome').classList.remove('is-hidden');return;}
  const moved=Math.hypot(e.clientX-p.sx,e.clientY-p.sy),dt=performance.now()-p.t;
  if(mode==='desk'){if(ptrs.size<2)pinch0=null;const wasPan=panned;if(!ptrs.size)panned=false;const open=books[sel]&&books[sel].open;
    if(Math.abs(e.clientX-p.sx)>50&&dt<(open?300:700)&&!pinch0){(e.clientX<p.sx?next:prev)();return;}
    if(open&&moved<10&&!wasPan){const now=performance.now();if(now-lastTap<320){resetView();lastTap=0;return;}lastTap=now;}
    if(moved<10&&!wasPan)deskClick(e.clientX,e.clientY);return;}
  if(mode==='explore'&&moved<10&&dt<500){if(!TOUCH&&!locked)tryLock();const hit=locked?pick(innerWidth/2,innerHeight/2):pick(e.clientX,e.clientY);if(hit)doAction(hit);}}
canvas.addEventListener('wheel',e=>{if(mode==='desk'&&books[sel]&&books[sel].open){e.preventDefault();DV.zoom=clamp(DV.zoom*(e.deltaY<0?1.1:.9),.6,2.4);}},{passive:false});
canvas.addEventListener('pointerup',endPtr);canvas.addEventListener('pointercancel',endPtr);
canvas.addEventListener('mousedown',()=>{if(locked&&mode==='explore'){const hit=pick(innerWidth/2,innerHeight/2);if(hit)doAction(hit);}});
$('#actBtn').addEventListener('click',()=>{const hit=pick(innerWidth/2,innerHeight/2,interact,3.6);if(hit){buzz();doAction(hit);}});
function tryLock(){try{const r=canvas.requestPointerLock&&canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(e){}}
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function pick(x,y,list=interact,maxD=4.2){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);ray.far=maxD;const h=ray.intersectObjects(list,false);return h.length?h[0].object:null;}
function releaseLock(){if(locked&&document.exitPointerLock)document.exitPointerLock();}
function doAction(o){const a=o.userData.action;
  if(a==='lamp'){const L=lamps[o.userData.lamp];L.on=!L.on;buzz(8);}
  else if(a==='desk'&&player.pos.z<1.5)enterDesk();
  else if(a==='easel')openPaint();
  else if(a==='coffee')openCoffeeMenu();
  else if(a==='poster')openPosterMenu(o.userData.key);}
function collide(p){const r=.28;for(const [x0,x1,z0,z1] of colliders){const cx=clamp(p.x,x0,x1),cz=clamp(p.z,z0,z1);const dx=p.x-cx,dz=p.z-cz;const d2=dx*dx+dz*dz;
  if(d2<r*r){if(d2>1e-9){const d=Math.sqrt(d2);p.x=cx+dx/d*r;p.z=cz+dz/d*r;}else{const pen=[p.x-x0,x1-p.x,p.z-z0,z1-p.z];const m=Math.min(...pen);if(m===pen[0])p.x=x0-r;else if(m===pen[1])p.x=x1+r;else if(m===pen[2])p.z=z0-r;else p.z=z1+r;}}}}

/* ================= coffee ================= */
function brewCoffee(){if(coffee.busy)return;if(coffee.holding){toast('Já está servido','Leve o café até a mesa de projetos.');return;}coffee.busy=true;coffee.t=0;const cs=coffee.machine.cupSpot;cs.visible=true;cs.userData.coffee.position.y=.02;buzz(20);showLabel('<b>Cafeteira</b> preparando…');}
function updateCoffee(dt){const mc=coffee.machine;const t=performance.now()/1000;
  if(coffee.busy){coffee.t+=dt;const k=Math.min(1,coffee.t/2.6);mc.cupSpot.userData.coffee.position.y=.02+k*.068;mc.led.material.emissiveIntensity=.6+Math.sin(t*12)*.5;
    if(coffee.t>2.9){coffee.busy=false;coffee.holding=true;mc.cupSpot.visible=false;mc.led.material.emissiveIntensity=.6;heldMug.visible=true;$('#holding').classList.remove('is-hidden');$('#label').classList.add('is-hidden');buzz([10,40,10]);toast('Café pronto','Ele vai com você até a mesa.');}}
  mc.steam.forEach((s,i)=>{const ph=(t*.6+i/6)%1;s.position.set(Math.sin(i*3+t)*.012,.12+ph*.22,-.17);s.material.opacity=coffee.busy?(1-ph)*.5:0;s.scale.setScalar(.04+ph*.06);});
  const host=heldMug.visible?heldMug:(deskMug.visible?deskMug:null);if(host){heldSteam.forEach((s,i)=>{if(s.parent!==host)host.add(s);const ph=(t*.5+i/4)%1;s.position.set(Math.sin(i*2+t*1.3)*.01,.11+ph*.16,0);s.material.opacity=(1-ph)*.32;s.scale.setScalar(.03+ph*.05);});}}

/* ================= camera transitions ================= */
let tw=null;
function tweenCam(toPos,toQuat,toFov,dur,done,arc=0){tw={fromPos:camera.position.clone(),fromQ:camera.quaternion.clone(),fromFov:camera.fov,toPos,toQuat,toFov,t:0,dur:REDUCED?.35:dur,done,arc};}
const _m=new THREE.Matrix4(),UPZ=new V3(0,0,-1);
const DV={single:false,side:'right',pan:{x:0,z:0},zoom:1,wpp:.001,hinted:false};
const isSingle=()=>DV.single;
function deskCam(){const b=books[sel];const aspect=camera.aspect;const vf=DESK_FOV*D2R,hf=2*Math.atan(Math.tan(vf/2)*aspect);const open=b.open;const portrait=aspect<.85;const single=open&&DV.single;
  let cx=b.root.position.x+(open?(single?(DV.side==='right'?BW*.5:-BW*.5):0):BW/2);let cz=b.root.position.z;const needW=open?(single?BW+.05:2*BW+.12):(portrait?BW+.12:BW+.5),needH=open&&single?BH+(portrait?.42:.2):BH+(portrait?.42:.32);
  let d=Math.max((needW/2)/Math.tan(hf/2),(needH/2)/Math.tan(vf/2))/DV.zoom;if(open){cx+=DV.pan.x;cz+=DV.pan.z;}DV.wpp=2*d*Math.tan(hf/2)/innerWidth;const tilt=.14;const ty=deskTop+b.liftT;const eye=new V3(cx,ty+d*Math.cos(tilt),cz+d*Math.sin(tilt)+.012);const target=new V3(cx,ty,cz-.012);
  _m.lookAt(eye,target,UPZ);return {eye,q:new THREE.Quaternion().setFromRotationMatrix(_m)};}
function enterDesk(){if(mode!=='explore')return;mode='toDesk';releaseLock();setHUD('none');keys.clear();joyVec={x:0,y:0};
  if(coffee.holding){coffee.holding=false;heldMug.visible=false;deskMug.visible=true;$('#holding').classList.add('is-hidden');}
  books.forEach((b,i)=>b.liftT=i===sel?.03:0);const {eye,q}=deskCam();tweenCam(eye,q,DESK_FOV,1.7,()=>{mode='desk';setHUD('desk');refreshDesk();},.12);}
function exitDesk(){if(mode!=='desk')return;hideNameForm();closeBook(books[sel]);books.forEach(b=>b.liftT=0);mode='toRoom';setHUD('none');
  const x=clamp(camera.position.x,-2.6,2.6);const pos=new V3(x,1.62,-1.0);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.28,0,0,'YXZ'));
  tweenCam(pos,q,EXPLORE_FOV(),1.3,()=>{player.pos.copy(pos);player.yaw=0;player.pitch=-.28;player.vel.set(0,0,0);deskLock=true;mode='explore';setHUD('explore');});}

/* ================= desk actions ================= */
function resetView(){DV.pan.x=0;DV.pan.z=0;DV.zoom=1;}
function openBook(b){b.ensurePages();b.coverT=Math.PI;b.spread=0;b.liftT=.05;DV.single=camera.aspect<.85;DV.side='right';resetView();
  if(TOUCH&&!DV.hinted){DV.hinted=true;setTimeout(()=>toast('Dica','Arraste para mover a câmera, use dois dedos para aproximar e toque duas vezes para voltar.'),900);}}
function closeBook(b){b.coverT=0;b.spread=0;b.sheets.forEach(s=>s.t=0);b.liftT=.03;resetView();}
function select(i){if(i<0||i>=books.length||i===sel)return;hideNameForm();const old=books[sel];if(old.open)closeBook(old);old.liftT=0;setTimeout(()=>{if(!old.open&&sel!==old.i)old.dropPages();},1500);sel=i;books[sel].liftT=.03;buzz(6);refreshDesk();}
function next(){const b=books[sel];if(b.open){resetView();if(isSingle()&&DV.side==='left'){DV.side='right';buzz(4);refreshDesk();return;}if(b.spread<NS){b.sheets[b.spread].t=Math.PI;b.spread++;DV.side='left';buzz(6);refreshDesk();}}else select(sel+1);}
function prev(){const b=books[sel];if(b.open){resetView();if(isSingle()&&DV.side==='right'&&b.spread>0){DV.side='left';buzz(4);refreshDesk();return;}if(b.spread>0){b.spread--;b.sheets[b.spread].t=0;DV.side='right';buzz(6);refreshDesk();}else{closeBook(b);refreshDesk();}}else select(sel-1);}
function mainAction(){const b=books[sel];if(b.p.blank&&!b.open){openStudio(null);return;}if(b.open)closeBook(b);else openBook(b);refreshDesk();}
function deskClick(x,y){const ms=[];books.forEach(b=>b.root.traverse(o=>{if(o.isMesh)ms.push(o);}));const hit=pick(x,y,ms,5);if(!hit)return;const i=hit.userData.book;
  if(i===sel){if(!books[sel].open)mainAction();else if(!isSingle())(ndc.x>0?next:prev)();}else select(i);}
function showNameForm(){}
function hideNameForm(){}
const ICON={open:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5V5a2 2 0 0 1 2-2h14v18H6.5A2.5 2.5 0 0 1 4 18.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'};
function refreshDesk(){const b=books[sel],p=b.p;$('#projTitle').textContent=p.title;const pages=NS*2;const meta=$('#projMeta');meta.textContent='';
  if(b.open){const l=b.spread*2,r=l+1;if(isSingle()){const pg=b.spread===0?1:b.spread===NS?pages:(DV.side==='left'?l:r);meta.textContent=`página ${pg} de ${pages}`;}else meta.textContent=b.spread===0?`página 1 de ${pages}`:(b.spread===NS?`página ${pages} de ${pages}`:`páginas ${l}–${r} de ${pages}`);}
  else if(p.blank)meta.textContent='caderno em branco';else if(p.user)meta.textContent=(p.brand?'brand book · ':'')+'aberto em '+fmtDate(p.created);
  else{meta.textContent=`${pages} páginas`;const t=document.createElement('span');t.className='tag';t.textContent='exemplo';meta.prepend(t);}
  $('#btnStudio').hidden=!p.user;
  $('#btnMain').innerHTML=b.open?ICON.close+'Fechar':(p.blank?ICON.plus+'Começar projeto':ICON.open+'Abrir');
  $('#btnPrev').disabled=!b.open&&sel===0;$('#btnNext').disabled=b.open?(b.spread>=NS&&(!isSingle()||DV.side==='right'||true)):sel===books.length-1;
  $('#btnCover').hidden=b.open;const bv=$('#btnView');bv.hidden=!b.open;bv.setAttribute('aria-label',isSingle()?'Ver as duas páginas':'Ver uma página de perto');bv.classList.toggle('on',!isSingle());
  $('#btnPrev').setAttribute('aria-label',b.open?'Página anterior':'Caderno anterior');$('#btnNext').setAttribute('aria-label',b.open?'Próxima página':'Próximo caderno');
  $('#dots').innerHTML=books.map((_,i)=>`<i class="${i===sel?'on':''}"></i>`).join('');}
$('#btnPrev').onclick=prev;$('#btnNext').onclick=next;$('#btnMain').onclick=mainAction;$('#btnBack').onclick=exitDesk;$('#btnView').onclick=()=>{const b=books[sel];if(!b.open)return;DV.single=!DV.single;if(DV.single)DV.side=b.spread===0?'right':(b.spread===NS?'left':DV.side);resetView();buzz(5);refreshDesk();};
$('#btnStudio').onclick=()=>{const p=books[sel].p;if(p.user)openStudio(p.id);};
let toastT;function toast(h,t){const el=$('#toast');el.textContent='';const s=document.createElement('span');s.className='h';s.textContent=h;el.append(s,document.createTextNode(t));el.classList.remove('is-hidden');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.add('is-hidden'),3600);}

/* ================= posters: change image ================= */
let MENU=null;
function openMenu(m){MENU=m;releaseLock();m.back=mode==='desk'?'desk':'explore';mode='menu';setHUD('none');$('#pmTitle').textContent=m.title;$('#pmDesc').textContent=m.desc;const a=$('#pmAct');a.hidden=!m.act;if(m.act){a.textContent=m.act.label;a.disabled=!!m.act.disabled;}
  $('#pmChange').textContent=m.changeLabel||'Trocar imagem';$('#pmPaste').textContent='ou toque aqui e cole uma imagem';$('#pmReset').disabled=!m.hasCurrent;$('#posterMenu').classList.remove('is-hidden');}
function closeMenu(){$('#posterMenu').classList.add('is-hidden');if(mode==='menu'){const b=(MENU&&MENU.back)||'explore';mode=b;setHUD(b);if(b==='desk')refreshDesk();}}
const closePosterMenu=closeMenu;
$('#pmCancel').onclick=closeMenu;$('#pmChange').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#pmFile').click();}});$('#pmAct').onclick=()=>{const m=MENU;closeMenu();if(m&&m.act)m.act.fn();};
function coverCrop(img,aspect,maxL=1280){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;let sw=iw,sh=iw/aspect;if(sh>ih){sh=ih;sw=ih*aspect;}const w=aspect>=1?maxL:Math.round(maxL*aspect),h=Math.round(w/aspect);
  return makeCanvas(w,h,g=>g.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,0,0,w,h));}
function applyPoster(key,cv){const P=posters[key];const t=tex(cv);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;const old=P.pic.material.map;P.pic.material.map=t;P.pic.material.needsUpdate=true;if(old&&old!==P.orig)old.dispose();}
async function pickedFile(f){if(!f||!MENU)return;if(f.type&&!/^image\//.test(f.type)){toast('Isso não é uma imagem','Escolha um arquivo JPG, PNG ou WEBP.');return;}const m=MENU;closeMenu();
  try{const url=URL.createObjectURL(f);const img=await loadImage(url);URL.revokeObjectURL(url);await m.pick(img);}catch(err){toast('A imagem não abriu','Use um arquivo JPG, PNG ou WEBP.');}}
$('#pmFile').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];pickedFile(f);e.target.value='';});
const imgFromClipboard=cd=>{if(!cd)return null;for(const it of cd.items||[]){if(it.kind==='file'&&/^image\//.test(it.type))return it.getAsFile();}return (cd.files&&cd.files[0])||null;};
document.addEventListener('paste',e=>{if(mode!=='menu')return;const f=imgFromClipboard(e.clipboardData);e.preventDefault();if(f)pickedFile(f);else toast('Nada para colar','Copie uma imagem primeiro e cole de novo.');});
$('#pmPaste').addEventListener('beforeinput',e=>{if(e.inputType!=='insertFromPaste')e.preventDefault();});
$('#pmPaste').addEventListener('input',()=>{$('#pmPaste').textContent='ou toque aqui e cole uma imagem';});
['dragenter','dragover'].forEach(t=>$('#posterMenu').addEventListener(t,e=>{e.preventDefault();$('#posterMenu').classList.add('drag');}));
['dragleave','drop'].forEach(t=>$('#posterMenu').addEventListener(t,e=>{e.preventDefault();$('#posterMenu').classList.remove('drag');if(t==='drop')pickedFile(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]);}));
$('#pmReset').onclick=async()=>{const m=MENU;closeMenu();if(m&&m.reset)await m.reset();};
function fitCanvas(cv,max){const w=cv.width,h=cv.height,sc=Math.min(1,max/Math.max(w,h));if(sc>=1)return cv;return makeCanvas(Math.round(w*sc),Math.round(h*sc),g=>g.drawImage(cv,0,0,w*sc,h*sc));}
async function saveCustomImage(kind,key,cv,curRef,setRef){const small=fitCanvas(cv,Store.cloud&&Store.assets?1280:820);const blob=await canvasBlob(small,'image/jpeg',Store.cloud&&Store.assets?.86:.78);const ref=await putImage(blob);if(await putDoc(kind,key,{asset:ref,updated:Date.now()})){if(curRef&&curRef!==ref)dropImage(curRef);setRef(ref);return true;}return false;}
function openPosterMenu(key){const P=posters[key];openMenu({title:P.label,desc:'Escolha uma imagem do seu dispositivo. Ela é recortada no formato do quadro.',hasCurrent:!!P.current,
  pick:async img=>{const cv=coverCrop(img,P.aspect);applyPoster(key,cv);if(await saveCustomImage('posters',key,cv,P.current,r=>P.current=r))toast('Quadro trocado','A nova imagem fica salva no seu escritório.');},
  reset:async()=>{const ref=P.current;const old=P.pic.material.map;P.pic.material.map=P.orig;P.pic.material.needsUpdate=true;if(old!==P.orig)old.dispose();P.current=null;await delDoc('posters',P.key);dropImage(ref);toast('Original de volta','O quadro voltou à imagem de antes.');}});}
/* mug print */
const MUG_PRINT_BG='#efe6da';
function mugCanvas(img){return makeCanvas(1024,388,g=>{g.fillStyle=MUG_PRINT_BG;g.fillRect(0,0,1024,388);speckle(g,1024,388,'rgba(120,90,60,.04)',3000,1.2);const w=470,h=320;cover(g,img,(1024-w)/2,(388-h)/2,w,h);});}
const mugTargets=()=>[coffee.counterMug,heldMug,deskMug,coffee.machine.cupSpot].filter(Boolean);
let mugTex=null;
function applyMug(src){const targets=mugTargets();if(mugTex){mugTex.dispose();mugTex=null;}
  if(!src){targets.forEach(m=>{m.userData.body.material=m.userData.mat;m.userData.handle.material=m.userData.mat;});return;}
  mugTex=tex(src);mugTex.wrapS=THREE.RepeatWrapping;mugTex.wrapT=THREE.ClampToEdgeWrapping;mugTex.offset.x=.5;
  const side=sm({map:mugTex,roughness:.38}),cap=sm({color:MUG_PRINT_BG,roughness:.38});targets.forEach(m=>{m.userData.body.material=[side,cap,cap];m.userData.handle.material=cap;});}
function openCoffeeMenu(){openMenu({title:'Cafeteira',desc:'Pegue um café ou estampe a sua caneca com uma imagem sua.',act:{label:coffee.holding?'Você já está com café':'Pegar café',disabled:coffee.holding||coffee.busy,fn:brewCoffee},changeLabel:'Estampar caneca',hasCurrent:!!custom.mug,
  pick:async img=>{const cv=mugCanvas(img);applyMug(cv);if(await saveCustomImage('custom','mug',cv,custom.mug,r=>custom.mug=r))toast('Caneca estampada','A estampa aparece no balcão, na sua mão e na mesa.');},
  reset:async()=>{const ref=custom.mug;applyMug(null);delete custom.mug;await delDoc('custom','mug');dropImage(ref);toast('Caneca original','A caneca voltou à cor de antes.');}});}
/* sketchbook cover */
function coverFromImage(img){const [w,h]=PAGE_RES;const s=w/768;return makeCanvas(w,h,g=>{cover(g,img,0,0,w,h);g.fillStyle='rgba(30,15,10,.32)';g.fillRect(w-70*s,0,22*s,h);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(w-70*s,0,4*s,h);});}
function openCoverMenu(){const b=books[sel];if(!b)return;const key='cover-'+b.p.id;openMenu({title:'Capa do caderno',desc:'Use uma foto sua ou uma imagem baixada. Ela é recortada no formato da capa.',changeLabel:'Trocar capa',hasCurrent:!!custom[key],
  pick:async img=>{const cv=coverFromImage(coverCrop(img,BW/BH,1400));b.coverTex.image=cv;b.coverTex.needsUpdate=true;if(await saveCustomImage('custom',key,cv,custom[key],r=>custom[key]=r))toast('Capa trocada',`O caderno “${b.p.title}” ganhou capa nova.`);},
  reset:async()=>{const ref=custom[key];delete custom[key];await b.restoreCover();await delDoc('custom',key);dropImage(ref);toast('Capa original','O caderno voltou à capa de antes.');}});}
$('#btnCover').onclick=openCoverMenu;
/* BUKKU gallery: works on any device, no file picker needed */
const READY=[[C.brown,C.cinnamon,C.sage,C.petal,0],[C.sage,C.petal,C.brown,C.cinnamon,1],[C.cinnamon,C.linen,C.brown,C.sage,2],[C.petal,C.brown,C.sage,C.cinnamon,0],[C.brown,C.sage,C.petal,C.linen,1],[C.sage,C.cinnamon,C.petal,C.brown,2]];
function readyPrint(i){if(i<READY.length){const r=READY[i];return artCanvas(800,800,r.slice(0,4),r[4],i%2?C.linen:'#efe3d2');}
  if(i===READY.length)return makeCanvas(800,800,g=>{paper(g,800,800,'#F3EADC',.05);stampLogo(g,LOGO.stack,400,400,640);});
  return makeCanvas(800,800,g=>{g.fillStyle=i%2?C.brown:C.sage;g.fillRect(0,0,800,800);g.globalAlpha=.9;const lg=LOGO.markBrown;for(let y=0,r=0;y<900;y+=150,r++)for(let x=(r%2)*75-75;x<900;x+=150)stampLogo(g,i%2?LOGO.mark:lg,x+75,y+75,130);});}
let galPick=null,galBack=null;
function galleryGroups(){const groups=[];const seen=new Set();
  const pts=paintings.filter(p=>p.asset).map((p,i)=>({label:'tela '+(i+1),src:imgURL(p.asset)}));groups.push(['suas pinturas',pts,'Pinte no cavalete do escritório e as telas aparecem aqui.']);
  const used=[];const addRef=(r,l)=>{if(r&&!seen.has(r)){seen.add(r);used.push({label:l,src:imgURL(r)});}};Object.entries(custom).forEach(([k,r])=>addRef(r,k==='mug'?'caneca':'capa'));Object.values(posters).forEach(P=>addRef(P.current,'quadro'));
  userProjects.forEach(u=>{const im=u.inputs&&u.inputs.imgs;if(im)Object.values(im).forEach(r=>addRef(r,u.title));});groups.push(['imagens que você já usou',used,'Imagens que você enviar, inclusive pelo computador, aparecem aqui em todos os aparelhos.']);
  const br=[];userProjects.filter(u=>u.brand).forEach(u=>['capa','logo','padrao','social'].forEach(k=>{if(k==='capa'||kitKinds(u.brand).includes(k))br.push({label:u.title+' · '+PANEL_INFO[k][0],make:async()=>{const [W,H]=PANEL_SIZE(k);const c=makeCanvas(W,H);await drawPanel(k,u.brand,c);return c;}});}));
  groups.push(['das suas marcas',br,'Gere uma marca no estúdio e as peças aparecem aqui.']);
  groups.push(['estampas prontas',[...Array(READY.length+3)].map((_,i)=>({label:'estampa '+(i+1),make:async()=>readyPrint(i)})),'']);return groups;}
function openGallery(pick,back){galPick=pick;galBack=back;const body=$('#galBody');body.textContent='';
  for(const [title,items,empty] of galleryGroups()){const h=document.createElement('p');h.className='gal-g';h.textContent=title;body.append(h);
    if(!items.length){const e=document.createElement('p');e.className='gal-empty';e.textContent=empty;body.append(e);continue;}
    const grid=document.createElement('div');grid.className='gal-grid';body.append(grid);
    items.forEach(it=>{const b=document.createElement('button');b.type='button';b.className='gt';b.setAttribute('aria-label','Usar '+it.label);let ready=null;
      if(it.src){const im=document.createElement('img');im.alt='';im.width=100;im.height=100;im.loading='lazy';im.src=it.src;b.append(im);ready=()=>loadImage(it.src);}
      else{const p=it.make();ready=()=>p;p.then(c=>{const t=makeCanvas(200,200,g=>cover(g,c,0,0,200,200));b.prepend(t);}).catch(()=>{});}
      const sp=document.createElement('span');sp.textContent=it.label;b.append(sp);
      b.onclick=async()=>{try{const img=await ready();const fn=galPick;closeGallery(false);if(fn)await fn(img);}catch(e){toast('Não deu para usar essa imagem','Escolha outra da galeria.');}};grid.append(b);});}
  $('#gallery').classList.remove('is-hidden');}
function closeGallery(restore=true){$('#gallery').classList.add('is-hidden');const back=galBack;galPick=null;galBack=null;if(restore&&back)back();}
$('#galClose').onclick=()=>closeGallery(true);
$('#pmGal').onclick=()=>{const m=MENU;if(!m)return;$('#posterMenu').classList.add('is-hidden');openGallery(async img=>{closeMenu();await m.pick(img);},()=>{$('#posterMenu').classList.remove('is-hidden');});};
async function setSlotFromImage(slot,img){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;const max=slot==='ref'?900:600;const sc=Math.min(1,max/Math.max(iw,ih));const w=Math.round(iw*sc),h=Math.round(ih*sc);
  const cv=makeCanvas(w,h,g=>g.drawImage(img,0,0,w,h));const blob=slot==='ref'?await canvasBlob(cv,'image/jpeg',.8):await canvasBlob(cv,'image/png');STU.files[slot]={blob,cv};STU.inp.imgs[slot]=null;setSlot(slot,cv.toDataURL());renderColors();}
document.querySelectorAll('[data-gal]').forEach(b=>b.onclick=()=>{const slot=b.dataset.gal;openGallery(img=>setSlotFromImage(slot,img),null);});

/* ================= painting studio ================= */
const PW_=1000,PH_=1250;const pc=$('#pc'),ps=$('#ps');const px=pc.getContext('2d'),pxs=ps.getContext('2d');
const TOOLS={lapis:{w:.45,a:.82,grain:true},caneta:{w:1,a:1},pincel:{w:2.2,a:.92,speed:true},marcador:{w:3.2,a:.38,cap:'square',multiply:true},borracha:{w:3,a:1,erase:true}};
const SW=['#2A1912','#8E412E','#BA6F4D','#E6CEBC','#A2A182','#F4ECE2','#4F6A73','#C9A43F','#5F5E46','#D9774B','#ffffff'];
let tool='caneta',pcolor=SW[0],psize=8;let paintings=[],curP=null,pDirty=false,undoS=[],redoS=[],stroke=null;
{const sw=$('#swatches');SW.forEach(c=>{const b=document.createElement('button');b.className='sw'+(c===pcolor?' on':'');b.style.background=c;b.setAttribute('aria-label','Cor '+c);b.onclick=()=>{pcolor=c;sw.querySelectorAll('.sw').forEach(x=>x.classList.toggle('on',x===b));buzz(5);};sw.append(b);});
  const cu=document.createElement('label');cu.className='sw custom';cu.title='Outra cor';const ci=document.createElement('input');ci.type='color';ci.id='pColor';ci.value='#8E412E';ci.setAttribute('aria-label','Escolher outra cor');ci.oninput=()=>{pcolor=ci.value;sw.querySelectorAll('.sw').forEach(x=>x.classList.toggle('on',x===cu));};cu.append(ci);sw.append(cu);}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('on',x===b));buzz(5);});
$('#pSize').oninput=e=>{psize=+e.target.value;};
function fitBoard(){const bd=$('#board');const r=bd.getBoundingClientRect();const aw=r.width-28,ah=r.height-28;let w=aw,h=w*PH_/PW_;if(h>ah){h=ah;w=h*PW_/PH_;}const st=$('#stack');st.style.width=Math.max(120,w)+'px';st.style.height=Math.max(150,h)+'px';}
function setState(t){$('#paintState').textContent=t;}
function snapshot(){undoS.push(px.getImageData(0,0,PW_,PH_));if(undoS.length>12)undoS.shift();redoS.length=0;syncUndo();}
function undo(){if(!undoS.length)return;redoS.push(px.getImageData(0,0,PW_,PH_));px.putImageData(undoS.pop(),0,0);markDirty();syncUndo();}
function redo(){if(!redoS.length)return;undoS.push(px.getImageData(0,0,PW_,PH_));px.putImageData(redoS.pop(),0,0);markDirty();syncUndo();}
function syncUndo(){$('#pUndo').disabled=!undoS.length;$('#pRedo').disabled=!redoS.length;}
function markDirty(){pDirty=true;setState('alterações não salvas');}
function ppos(e){const r=ps.getBoundingClientRect();const pr=e.pointerType==='pen'?(e.pressure||.5):.5;return{x:(e.clientX-r.left)/r.width*PW_,y:(e.clientY-r.top)/r.height*PH_,p:pr,t:performance.now()};}
function seg(ctx,a,b,T,w){ctx.lineCap=T.cap==='square'?'square':'round';ctx.lineJoin='round';ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(a.mx!=null?a.mx:a.x,a.my!=null?a.my:a.y);ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);ctx.stroke();b.mx=(a.x+b.x)/2;b.my=(a.y+b.y)/2;
  if(T.grain){ctx.save();ctx.globalAlpha=.25;for(let i=0;i<w*1.5;i++){const t=Math.random();ctx.fillRect(lerp(a.x,b.x,t)+(Math.random()-.5)*w*1.6,lerp(a.y,b.y,t)+(Math.random()-.5)*w*1.6,1.2,1.2);}ctx.restore();}}
ps.addEventListener('pointerdown',e=>{if(mode!=='paint')return;e.preventDefault();try{ps.setPointerCapture(e.pointerId);}catch(_){}if(stroke)return;snapshot();const T=TOOLS[tool];const p=ppos(e);stroke={T,last:p,id:e.pointerId};
  const ctx=T.erase?px:pxs;ctx.save();if(T.erase)ctx.globalCompositeOperation='destination-out';ctx.fillStyle=pcolor;ps.style.opacity=T.erase?1:T.a;
  const w=Math.max(1,psize*T.w*(.5+p.p));ctx.beginPath();ctx.arc(p.x,p.y,w/2,0,7);ctx.fill();ctx.restore();});
ps.addEventListener('pointermove',e=>{if(!stroke||e.pointerId!==stroke.id)return;const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];const T=stroke.T;const ctx=T.erase?px:pxs;ctx.save();if(T.erase)ctx.globalCompositeOperation='destination-out';ctx.strokeStyle=pcolor;ctx.fillStyle=pcolor;
  for(const ev of (evs.length?evs:[e])){const p=ppos(ev);const a=stroke.last;const dist=Math.hypot(p.x-a.x,p.y-a.y);if(dist<.8)continue;let w=psize*T.w*(.5+p.p);if(T.speed){const v=dist/Math.max(1,p.t-a.t);w*=clamp(1.35-v*.25,.45,1.35);}seg(ctx,a,p,T,Math.max(1,w));stroke.last=p;}ctx.restore();});
function endStroke(e){if(!stroke||e.pointerId!==stroke.id)return;const T=stroke.T;if(!T.erase){px.save();px.globalAlpha=T.a;if(T.multiply)px.globalCompositeOperation='multiply';px.drawImage(ps,0,0);px.restore();pxs.clearRect(0,0,PW_,PH_);ps.style.opacity=1;}stroke=null;markDirty();}
ps.addEventListener('pointerup',endStroke);ps.addEventListener('pointercancel',endStroke);
$('#pUndo').onclick=undo;$('#pRedo').onclick=redo;
let clearArmed=false;$('#pClear').onclick=()=>{if(!clearArmed){clearArmed=true;$('#pClear').textContent='Limpar mesmo?';setTimeout(()=>{clearArmed=false;$('#pClear').textContent='Limpar';},2500);return;}clearArmed=false;$('#pClear').textContent='Limpar';snapshot();px.clearRect(0,0,PW_,PH_);markDirty();};
function renderPageList(){const l=$('#pageList');l.textContent='';paintings.forEach((p,i)=>{const b=document.createElement('button');b.className='thumb'+(curP&&p.id===curP.id?' on':'');b.setAttribute('aria-label','Abrir tela '+(i+1));
  if(p.asset){const im=document.createElement('img');im.alt='';im.width=80;im.height=100;im.src=imgURL(p.asset);b.append(im);}const em=document.createElement('em');em.textContent=String(i+1);b.append(em);b.onclick=()=>switchPainting(p.id);l.append(b);});}
async function loadPaintingToCanvas(p){px.clearRect(0,0,PW_,PH_);if(p&&p.asset){try{const img=await loadImage(imgURL(p.asset));px.drawImage(img,0,0,PW_,PH_);}catch(e){}}undoS=[];redoS=[];syncUndo();pDirty=false;setState(p&&p.asset?'salva':'tela nova');$('#paintName').textContent='Tela '+(paintings.indexOf(p)+1);}
let saving=null;
async function savePainting(){if(!curP)return;if(saving)return saving;saving=(async()=>{$('#pSave').disabled=true;setState('salvando…');const target=curP;
  try{let blob=await canvasBlob(pc,'image/webp',.9);if(!blob||blob.type!=='image/webp')blob=await canvasBlob(pc,'image/png');const ref=await putImage(blob);const prev=target.asset;const doc={asset:ref,updated:Date.now(),order:target.order||0};
    if(await putDoc('paintings',target.id,doc)){target.asset=ref;if(prev&&prev!==ref)dropImage(prev);if(target===curP){pDirty=false;setState('salva');}renderPageList();updateEaselFrom(target);buzz([8,30,8]);}else setState('não salva');}
  catch(e){setState('não salva');}finally{$('#pSave').disabled=false;saving=null;}})();return saving;}
async function updateEaselFrom(p){if(!p||!p.asset){paintEasel(null);return;}try{paintEasel(await loadImage(imgURL(p.asset)));}catch(e){paintEasel(null);}}
async function switchPainting(id){if(curP&&curP.id===id)return;if(curP&&pDirty)await savePainting();curP=paintings.find(p=>p.id===id);renderPageList();await loadPaintingToCanvas(curP);}
$('#pSave').onclick=savePainting;
$('#pNew').onclick=async()=>{if(curP&&pDirty)await savePainting();const p={id:'t'+Date.now().toString(36),asset:null,order:paintings.length?Math.max(...paintings.map(x=>x.order||0))+1:0};paintings.push(p);curP=p;renderPageList();await loadPaintingToCanvas(p);buzz(8);};
let delArmed=false;const delLbl=()=>$('#pDel').querySelector('span');
$('#pDel').onclick=async()=>{if(!curP)return;if(!delArmed){delArmed=true;delLbl().textContent='Confirmar exclusão';$('#pDel').setAttribute('aria-label','Confirmar exclusão');setTimeout(()=>{delArmed=false;delLbl().textContent='Excluir tela';$('#pDel').setAttribute('aria-label','Excluir tela');},2600);return;}
  delArmed=false;delLbl().textContent='Excluir tela';const p=curP;paintings=paintings.filter(x=>x!==p);if(p.asset){await delDoc('paintings',p.id);dropImage(p.asset);}
  if(!paintings.length)paintings.push({id:'t'+Date.now().toString(36),asset:null,order:0});curP=paintings[paintings.length-1];renderPageList();await loadPaintingToCanvas(curP);updateEaselFrom(curP);toast('Tela excluída','A pintura saiu do ateliê.');};
async function openPaint(){releaseLock();mode='paint';setHUD('none');$('#paint').classList.remove('is-hidden');requestAnimationFrame(fitBoard);setTimeout(fitBoard,120);
  if(!paintings.length)paintings.push({id:'t'+Date.now().toString(36),asset:null,order:0});if(!curP)curP=paintings[paintings.length-1];renderPageList();await loadPaintingToCanvas(curP);}
async function closePaint(){if(pDirty)await savePainting();$('#paint').classList.add('is-hidden');mode='explore';setHUD('explore');}
$('#pClose').onclick=closePaint;

/* ================= brand studio (phase 2) ================= */
const KNOBS=['fut','sat','geo','fun','tex','mov'];
const STU={proj:null,inp:null,brand:null,gens:[],busy:false,ctl:null,files:{},canv:{}};
const blankInputs=()=>({name:'',briefing:'',colors:[],style:{fut:50,sat:50,geo:50,fun:50,tex:50,mov:50},apps:[],quality:'default',imgs:{symbol:null,wordmark:null,ref:null}});
function setSlot(s,url){const el=document.querySelector(`.slot[data-slot="${s}"]`);el.style.backgroundImage=url?`url("${url}")`:'';el.classList.toggle('has',!!url);}
function renderColors(){const box=$('#fColors');box.textContent='';const cs=STU.inp.colors;
  if(!cs.length){const s=document.createElement('span');s.className='swauto';s.textContent='a IA escolhe as cores';box.append(s);}
  cs.forEach((c,i)=>{const w=document.createElement('label');w.className='swc';w.style.background=c;const inp=document.createElement('input');inp.type='color';inp.value=c;inp.setAttribute('aria-label','Cor '+(i+1));const em=document.createElement('em');em.textContent=c.toUpperCase();
    inp.oninput=()=>{cs[i]=inp.value;w.style.background=inp.value;em.textContent=inp.value.toUpperCase();};const x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label','Remover cor '+(i+1));x.onclick=e=>{e.preventDefault();cs.splice(i,1);renderColors();};w.append(inp,x,em);box.append(w);});
  $('#cAdd').disabled=cs.length>=5;$('#cAuto').classList.toggle('on',!cs.length);$('#cImg').hidden=!(STU.files.ref||STU.files.symbol||STU.inp.imgs.ref||STU.inp.imgs.symbol);}
function renderApps(){const box=$('#fApps');box.textContent='';APPS.forEach(([gname,items])=>{const h=document.createElement('p');h.className='grp';h.textContent=gname;const c=document.createElement('div');c.className='chips';
  items.forEach(([k,l])=>{const on=STU.inp.apps.includes(k);const b=document.createElement('button');b.type='button';b.className='chip-t'+(on?' on':'');b.textContent=l;b.setAttribute('aria-pressed',String(on));b.onclick=()=>{const a=STU.inp.apps;const i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k);renderApps();};c.append(b);});box.append(h,c);});}
function fillForm(){const i=STU.inp;$('#fName').value=i.name||'';$('#fBrief').value=i.briefing||'';KNOBS.forEach(k=>$('#s_'+k).value=i.style[k]??50);renderColors();renderApps();
  document.querySelectorAll('#fQual button').forEach(b=>b.classList.toggle('on',b.dataset.q===i.quality));['symbol','wordmark','ref'].forEach(s=>setSlot(s,i.imgs[s]?imgURL(i.imgs[s]):null));}
function readForm(){const i=STU.inp;i.name=$('#fName').value.trim();i.briefing=$('#fBrief').value.trim();KNOBS.forEach(k=>i.style[k]=+$('#s_'+k).value);}
document.querySelectorAll('#fQual button').forEach(b=>b.onclick=()=>{STU.inp.quality=b.dataset.q;document.querySelectorAll('#fQual button').forEach(x=>x.classList.toggle('on',x===b));});
document.querySelectorAll('#stForm input[type=file]').forEach(inp=>inp.addEventListener('change',async()=>{const f=inp.files&&inp.files[0];inp.value='';if(!f)return;const slot=inp.dataset.slot;
  try{const url=URL.createObjectURL(f);const img=await loadImage(url);URL.revokeObjectURL(url);const max=slot==='ref'?900:600;const sc=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const w=Math.round(img.naturalWidth*sc),h=Math.round(img.naturalHeight*sc);
    const cv=makeCanvas(w,h,g=>g.drawImage(img,0,0,w,h));const blob=slot==='ref'?await canvasBlob(cv,'image/jpeg',.8):await canvasBlob(cv,'image/png');STU.files[slot]={blob,cv};STU.inp.imgs[slot]=null;setSlot(slot,cv.toDataURL());renderColors();}
  catch(e){toast('A imagem não abriu','Use um arquivo JPG, PNG ou WEBP.');}}));
document.querySelectorAll('.drop .x').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const s=x.parentElement.dataset.slot;delete STU.files[s];STU.inp.imgs[s]=null;setSlot(s,null);renderColors();}));
const BRIEFS=['uma padaria de bairro com fornada de madrugada e cheiro de café','um estúdio de cerâmica que dá aulas aos sábados','bicicletas urbanas montadas à mão em oficina pequena','uma livraria com café e saraus às quintas','chás brasileiros de ervas do cerrado','um festival de música independente no litoral','uma loja de plantas para quem mora em apartamento','uma escola de surfe para iniciantes, leve e acolhedora'];
$('#sBrief').onclick=async()=>{const btn=$('#sBrief');btn.disabled=true;readForm();try{const sm=await getSample();let t=null;
  if(sm){try{const r=await sm.s.json(`Invente um briefing original e curto (até 120 caracteres, em português do Brasil) para uma marca${STU.inp.name?` chamada "${STU.inp.name}"`:''}: o que é, para quem e a sensação. Responda só com JSON {"briefing":"..."}`,{modelTier:'quick',cache:false});t=r&&typeof r.briefing==='string'?r.briefing.slice(0,200):null;}catch(e){}}
  $('#fBrief').value=t||BRIEFS[(Math.random()*BRIEFS.length)|0];}finally{btn.disabled=false;}};
$('#sColors').onclick=()=>{readForm();STU.inp.colors=harmonyPalette(Math.random()*360,STU.inp.style).slice(0,4);renderColors();buzz(6);};
$('#cAdd').onclick=()=>{if(STU.inp.colors.length>=5)return;STU.inp.colors.push(hsl2hex(Math.random()*360,.5,.5));renderColors();};
$('#cAuto').onclick=()=>{STU.inp.colors=[];renderColors();};
$('#cImg').onclick=async()=>{let cv=(STU.files.ref||STU.files.symbol||{}).cv;if(!cv){const ref=STU.inp.imgs.ref||STU.inp.imgs.symbol;if(ref){try{cv=await loadImage(imgURL(ref));}catch(e){}}}if(!cv)return;STU.inp.colors=paletteFromImage(cv,4);renderColors();buzz(6);};
$('#sStyle').onclick=()=>{KNOBS.forEach(k=>$('#s_'+k).value=Math.round(10+Math.random()*80));buzz(6);};
/* AI + capabilities */
let sampleP=null;const getSample=()=>sampleP||(sampleP=(async()=>{try{if(!window.claude||!claude.use)return null;const s=await claude.use('sample');if(!s)return null;let lim=null;try{lim=await s.limits();}catch(e){}return {s,lim};}catch(e){return null;}})());
let dlP=null;const getDl=()=>dlP||(dlP=(async()=>{try{return window.claude&&claude.use?await claude.use('downloads'):null;}catch(e){return null;}})());
async function collectImages(lim){if(!lim||!lim.images)return [];const out=[];out.kinds=[];for(const k of ['symbol','wordmark','ref']){if(out.length>=lim.images.maxCount)break;if(STU.files[k]){out.push(STU.files[k].blob);out.kinds.push(k);}else if(STU.inp.imgs[k]){try{out.push(await (await fetch(imgURL(STU.inp.imgs[k]))).blob());out.kinds.push(k);}catch(e){}}}return out;}
async function uploadSlots(){for(const k of ['symbol','wordmark','ref']){const f=STU.files[k];if(f&&!STU.inp.imgs[k]){STU.inp.imgs[k]=await putImage(f.blob);}}}
async function saveFile(name,data){const dl=await getDl();if(!dl){try{const blob=data instanceof Blob?data:new Blob([data],{type:/\.svg$/.test(name)?'image/svg+xml':/\.json$/.test(name)?'application/json':'text/plain'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);return true;}catch(e){toast('Não deu para salvar','Tente de novo em instantes.');return false;}}
  try{await dl.save({filename:name,data});return true;}catch(e){if(e&&e.code==='declined')return false;toast('Não deu para salvar',e&&e.code==='too_large'?'O arquivo ficou grande demais.':'Tente de novo em instantes.');return false;}}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.append(s);});}
/* board */
async function renderBoard(){const b=STU.brand;const grid=$('#stGrid');grid.textContent='';grid.style.gridAutoFlow='dense';$('#stEmpty').hidden=!!b||STU.busy;$('#stKitH').hidden=!b;$('#stRefine').hidden=!b;$('#stZip').disabled=$('#stPdf').disabled=!b;STU.canv={};renderGens();if(!b)return;
  $('#stKitT').textContent=b.name;$('#stKitS').textContent=(b.ai?'gerado com IA'+(b.engine?' ('+b.engine+')':''):'versão base, sem IA')+' · '+b.fonts.display+' + '+b.fonts.body;
  for(const k of kitKinds(b)){const [W,H]=PANEL_SIZE(k);const card=document.createElement('figure');card.className='panel'+(W>H?' w2':'');card.style.margin='0';const c=document.createElement('canvas');c.width=W;c.height=H;c.setAttribute('role','img');c.setAttribute('aria-label',PANEL_INFO[k][0]+' da marca '+b.name);
    const lb=document.createElement('span');lb.className='lbl2';lb.textContent=PANEL_INFO[k][0];const ex=document.createElement('button');ex.type='button';ex.className='ext';ex.textContent='extrair';ex.setAttribute('aria-label','Extrair '+PANEL_INFO[k][0]);ex.onclick=()=>extract(k);card.append(c,lb,ex);grid.append(card);STU.canv[k]=c;}
  for(const k of Object.keys(STU.canv)){try{await drawPanel(k,b,STU.canv[k]);}catch(e){console.warn('painel',k,e);}}
  shootWorld(b);}
/* mundo da marca: fotos da IA gratuita chegam aos poucos e os painéis se redesenham */
async function shootWorld(b){if(!await freeAIReachable()||STU.brand!==b)return;const jobs=[['mundo','mundo',1],getKey()?['foto','foto',4]:['foto','collage',1],['prancha','prancha',1]].filter(([k])=>STU.canv[k]);if(!jobs.length)return;
  const total=jobs.reduce((a,j)=>a+j[2],0);let got=0,failed=0;const st=$('#stKitW');const show=()=>{if(STU.brand!==b)return;st.hidden=got+failed>=total;st.textContent=`fotografando o mundo da marca · ${got}/${total}`+(getKey()?'':' · a IA gratuita sem chave faz uma foto a cada 45 s');};show();
  await Promise.all(jobs.map(([k,kind,n])=>loadPhotos(b,kind,n,async()=>{got++;show();if(STU.brand===b&&STU.canv[k]){try{await drawPanel(k,b,STU.canv[k]);}catch(e){}}}).then(rs=>{failed+=rs.filter(r=>r.status==='rejected').length;show();})));
  if(failed&&STU.brand===b)toast('Algumas fotos não vieram','O serviço gratuito está cheio. Abra o projeto de novo daqui a pouco para completar.');}
function renderGens(){const box=$('#stGens');box.textContent='';if(STU.gens.length<2&&!(STU.gens.length===1&&STU.gens[0].brand!==STU.brand))return;
  STU.gens.forEach((gn,i)=>{const b=document.createElement('button');b.type='button';b.className='gthumb'+(gn.brand===STU.brand?' on':'');b.setAttribute('aria-label','Voltar para a geração '+(STU.gens.length-i));
    if(gn.thumb){const im=document.createElement('img');im.alt='';im.width=150;im.height=72;im.src=gn.thumb;b.append(im);}const sp=document.createElement('span');sp.textContent=`${gn.brand.name} · ${new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(gn.at))}`;b.append(sp);
    b.onclick=async()=>{if(STU.busy)return;STU.brand=gn.brand;STU.inp=JSON.parse(JSON.stringify(gn.inputs));if(!STU.inp.imgs)STU.inp.imgs={symbol:null,wordmark:null,ref:null};STU.files={};fillForm();await renderBoard();saveProject();};box.append(b);});}
async function saveProject(){const inp=STU.inp;if(!STU.proj){STU.proj={id:'p'+Date.now().toString(36),title:inp.name||'Projeto',created:Date.now()};userProjects.push(STU.proj);}
  const P_=STU.proj;P_.title=(STU.brand&&STU.brand.name)||inp.name||P_.title;P_.inputs=JSON.parse(JSON.stringify(inp));P_.brand=STU.brand;P_.gens=STU.gens.slice(0,4);
  const doc={title:P_.title,created:P_.created,inputs:P_.inputs,brand:P_.brand,gens:P_.gens};let ok=await putDoc('projects',P_.id,doc);if(!ok&&doc.gens.length>1){doc.gens=doc.gens.slice(0,1);P_.gens=doc.gens;ok=await putDoc('projects',P_.id,doc);}
  $('#stProj').textContent=P_.title;$('#stState').textContent=ok?'salvo no caderno':'não salvo';return ok;}
async function generate(refine){if(STU.busy)return;readForm();const inp=STU.inp;if(!inp.name){toast('Falta o nome','Dê um nome para a marca antes de gerar.');$('#fName').focus();return;}
  STU.busy=true;const btn=$('#stGen');btn.disabled=true;$('#stProg').hidden=false;$('#stProgT').textContent=refine?'ajustando':'pensando';$('#stEmpty').hidden=true;const ctl=STU.ctl=new AbortController();let brand=null;
  try{await uploadSlots();const sm=await getSample();
    if(sm){const imgs=await collectImages(sm.lim);const opts={modelTier:inp.quality,signal:ctl.signal,cache:false,onText:({text})=>{$('#stProgT').textContent=`escrevendo a marca · ${(text.length/1000).toFixed(1)}k`;}};if(imgs.length)opts.images=imgs;
      try{const raw=await sm.s.json(buildPrompt(inp,refine,STU.brand,imgs.length,STU.files,imgs.kinds),opts);brand=normalizeBrand(raw,inp);}
      catch(e){const c=e&&e.code;if(c==='cancelled')return;
        if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(c)){sampleP=Promise.resolve(null);toast('IA indisponível','Fiz uma versão base sem IA. Você pode gerar de novo depois.');}
        else if(c==='rate_limited'){toast('Muitos pedidos seguidos','Espere um pouco e gere de novo.');return;}
        else if(c==='invalid_json'||c==='empty_completion'){toast('Resposta incompleta','Gere de novo. Se repetir, use a qualidade Rápida.');return;}
        else if(c==='refused'){toast('Pedido recusado','Reescreva o briefing e tente de novo.');return;}
        else if(c==='image_rejected'||c==='images_unavailable'){toast('Imagem não aceita','Troque a imagem ou gere sem ela.');return;}
        else{toast('A IA não respondeu','Tente de novo em instantes.');return;}}}
    if(!brand&&await freeAIReachable()){const t0=Date.now();let until=0;const tick=setInterval(()=>{const w=Math.ceil((until-Date.now())/1000);$('#stProgT').textContent=w>0?`na fila da IA gratuita · ${w}s`:`${refine?'ajustando':'escrevendo a marca'} com IA gratuita · ${Math.round((Date.now()-t0)/1000)}s`;},1000);
      try{const raw=await textJSON(buildPrompt(inp,refine,STU.brand,0),{quality:inp.quality,signal:ctl.signal,onPhase:(m,w)=>{STU.engine='Pollinations · '+m;until=w?Date.now()+w:0;}});brand=normalizeBrand(raw,inp);brand.engine=STU.engine;}
      catch(e){const c=e&&e.code;if(c==='cancelled')return;
        if(c==='bad_key')toast('Chave recusada','A chave da Pollinations não vale. Apague ou troque em "IA" na ficha.');
        else if(c==='rate_limited')toast('IA gratuita cheia','Fiz uma versão base. Gere de novo em um minuto.');
        else toast('A IA gratuita não respondeu','Fiz uma versão base. Gere de novo em instantes.');}
      finally{clearInterval(tick);}}
    if(sm&&brand&&!brand.engine)brand.engine='Claude';
    if(!brand){if(refine&&STU.brand){toast('Ajuste precisa da IA','Sem a IA, só dá para gerar uma versão base nova.');}brand=localBrand(inp);}
    brand.apps=[...inp.apps];brand.user={...inp.imgs};if(getKey()&&await freeAIReachable())brand.prancha=true;STU.brand=brand;await renderBoard();
    const thumb=STU.canv.capa?makeCanvas(300,145,g=>g.drawImage(STU.canv.capa,0,0,300,145)).toDataURL('image/jpeg',.7):'';STU.gens.unshift({brand,inputs:JSON.parse(JSON.stringify(inp)),at:Date.now(),thumb});STU.gens=STU.gens.slice(0,4);renderGens();
    await saveProject();buzz([8,30,8]);if(refine)$('#fRefine').value='';if(innerWidth<760)$('#stBoard').scrollIntoView({behavior:REDUCED?'auto':'smooth'});}
  finally{STU.busy=false;btn.disabled=false;$('#stProg').hidden=true;if(!STU.brand)$('#stEmpty').hidden=false;}}
$('#stForm').addEventListener('submit',e=>{e.preventDefault();generate(null);});
$('#stRefine').addEventListener('submit',e=>{e.preventDefault();const t=$('#fRefine').value.trim();if(t&&STU.brand)generate(t);});
$('#stStop').onclick=()=>{if(STU.ctl)STU.ctl.abort();};
/* qual IA o estúdio está usando, e a chave opcional da Pollinations */
async function showEngine(){const el=$('#fEngine');const sm=await getSample();if(sm){el.textContent='IA: Claude, pelo claude.ai.';return;}
  const ok=await freeAIReachable();el.textContent=ok?(getKey()?'IA: gratuita, Pollinations com a sua chave.':'IA: gratuita, Pollinations sem cadastro. Texto, símbolo e fotos do mundo da marca.'):'IA: offline. O estúdio gera a versão base no próprio navegador.';}
$('#fKey').value=getKey();$('#fKeySave').onclick=()=>{setKey($('#fKey').value);toast($('#fKey').value.trim()?'Chave salva':'Chave apagada',$('#fKey').value.trim()?'As próximas gerações usam os modelos da sua conta Pollinations.':'O estúdio volta para a IA gratuita sem cadastro.');showEngine();};
showEngine();
/* extract & export */
const innerSVG=s=>String(s).replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
function iconSprite(b,col){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${b.icons.length*32} 24">${b.icons.map((ic,i)=>`<g transform="translate(${i*32} 0)">${innerSVG(colorize(ic.svg,[col,col,col,col,col]))}</g>`).join('')}</svg>`;}
async function extract(k){const b=STU.brand;if(!b)return;const slug=slugify(b.name);const P=b.palette.map(c=>c.hex);
  if(k==='logo'||k==='lockup'){const A=await prepare(b);if(A.symSource==='gerado'){await saveFile(slug+'-simbolo.svg',sizeSVG(colorize(b.symbol,P),1000));return;}const cv=makeCanvas(1000,1000,g=>symDraw(g,A,'pos',0,0,1000));await saveFile(slug+'-simbolo.png',await canvasBlob(cv,'image/png'));return;}
  if(k==='padrao'){await saveFile(slug+'-padrao.svg',sizeSVG(colorize(b.pattern,P),400));return;}
  if(k==='icones'){await saveFile(slug+'-icones.svg',iconSprite(b,rolesOf(b).dark));return;}
  if(k==='paleta'){await saveFile(slug+'-paleta.json',JSON.stringify(b.palette.map(c=>({nome:c.name,funcao:c.role,hex:c.hex,rgb:hexRgb(c.hex),cmyk:cmyk(c.hex)})),null,2));return;}
  const blob=await canvasBlob(STU.canv[k],'image/png');await saveFile(`${slug}-${k}.png`,blob);}
function packBoard(kinds){const unit=600,gap=20,cols=3;const occ=[];const place=[];const free=(r,c,s)=>{for(let i=0;i<s;i++){if(c+i>=cols||(occ[r]&&occ[r][c+i]))return false;}return true;};
  kinds.forEach(k=>{const s=PANEL_INFO[k][1];for(let r=0;;r++){let done=false;for(let c=0;c<cols;c++){if(free(r,c,s)){occ[r]=occ[r]||[];for(let i=0;i<s;i++)occ[r][c+i]=1;place.push([k,r,c,s]);done=true;break;}}if(done)break;}});
  const rows=occ.length;const W=cols*unit+(cols+1)*gap,H=rows*unit+(rows+1)*gap;return makeCanvas(W,H,g=>{g.fillStyle='#efe3d2';g.fillRect(0,0,W,H);place.forEach(([k,r,c,s])=>{const cv=STU.canv[k];if(cv)g.drawImage(cv,gap+c*(unit+gap),gap+r*(unit+gap),s*unit+(s-1)*gap,unit);});});}
/* PNG codificado de forma síncrona: toBlob às vezes não chama de volta enquanto a cena 3D ocupa a GPU */
function pngBytes(cv){const u=cv.toDataURL('image/png');const bin=atob(u.slice(u.indexOf(',')+1));const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
async function zipKit(){const b=STU.brand;if(!b)return;const btn=$('#stZip');btn.disabled=true;
  try{const JSZip=(await import('jszip')).default;const A=await prepare(b);const z=new JSZip();const P=b.palette.map(c=>c.hex);const R_=A.R;const slug=slugify(b.name);const man=[];
    const add=(path,data,o)=>{z.file(path,data);man.push({arquivo:path,...o});};const png=async cv=>pngBytes(cv);const mono=h=>[h,h,h,h,h];
    if(A.symSource==='gerado'){add('logos/simbolo.svg',sizeSVG(colorize(b.symbol,P),1000),{formato:'SVG',dimensoes:'vetor',transparencia:true,descricao:'Símbolo principal em cores'});
    add('logos/simbolo-claro.svg',sizeSVG(colorize(b.symbol,mono(R_.light)),1000),{formato:'SVG',dimensoes:'vetor',transparencia:true,descricao:'Símbolo em cor única clara, para fundos escuros'});
    add('logos/simbolo-escuro.svg',sizeSVG(colorize(b.symbol,mono(R_.dark)),1000),{formato:'SVG',dimensoes:'vetor',transparencia:true,descricao:'Símbolo em cor única escura, para fundos claros'});}
    if(A.pos){const cv=makeCanvas(1000,1000,g=>symDraw(g,A,'pos',0,0,1000));add('logos/simbolo.png',await png(cv),{formato:'PNG',dimensoes:'1000x1000',transparencia:true,descricao:'Símbolo em PNG'});
      for(const [v,n,d] of [['light','claro','para fundos escuros'],['dark','escuro','para fundos claros']]){const c2=makeCanvas(1000,1000,g=>symDraw(g,A,v,0,0,1000));add(`logos/simbolo-${n}.png`,await png(c2),{formato:'PNG',dimensoes:'1000x1000',transparencia:true,descricao:'Símbolo '+d});}}
    {const c3=makeCanvas(1600,520);wordmark(c3.getContext('2d'),b,800,400,1500,300,R_.dark,'center');add('logos/logotipo.png',await png(c3),{formato:'PNG',dimensoes:'1600x520',transparencia:true,descricao:'Logotipo'});}
    add('patterns/padrao.svg',sizeSVG(colorize(b.pattern,P),400),{formato:'SVG',dimensoes:'vetor',transparencia:true,descricao:'Módulo do padrão contínuo'});
    b.icons.forEach((ic,i)=>add(`icons/${String(i+1).padStart(2,'0')}-${slugify(ic.name)}.svg`,sizeSVG(colorize(ic.svg,mono(R_.dark)),240),{formato:'SVG',dimensoes:'vetor',transparencia:true,descricao:'Ícone: '+ic.name}));
    add('colors/paleta.json',JSON.stringify(b.palette.map(c=>({nome:c.name,funcao:c.role,hex:c.hex,rgb:hexRgb(c.hex),cmyk:cmyk(c.hex)})),null,2),{formato:'JSON',descricao:'Paleta com HEX, RGB e CMYK'});
    add('typography/fontes.txt',`Títulos: ${b.fonts.display}\nhttps://fonts.google.com/specimen/${b.fonts.display.replace(/ /g,'+')}\n\nTexto: ${b.fonts.body}\nhttps://fonts.google.com/specimen/${b.fonts.body.replace(/ /g,'+')}\n\nAmbas com licença aberta do Google Fonts.`,{formato:'TXT',descricao:'Famílias tipográficas e links'});
    for(const k of Object.keys(STU.canv)){const cv=STU.canv[k];const folder=['capa','logo','lockup','paleta','tipografia','padrao','icones','voz'].includes(k)?'brand-assets':k==='foto'||k==='mundo'?'moodboards':'applications';add(`${folder}/${k}.png`,await png(cv),{formato:'PNG',dimensoes:`${cv.width}x${cv.height}`,transparencia:false,descricao:'Página de identidade: '+PANEL_INFO[k][0]});}
    const board=packBoard(Object.keys(STU.canv));add('moodboards/prancha.png',await png(board),{formato:'PNG',dimensoes:`${board.width}x${board.height}`,transparencia:false,descricao:'Prancha com todas as páginas do kit'});
    add('documentation/conceito.txt',`${b.name}\n${b.tagline}\n\n${b.concept}\n\nPalavras-chave: ${b.keywords.join(', ')}\nFotografia: ${b.photo}\nVoz: ${b.voice.headline} / ${b.voice.slogans.join(' / ')}`,{formato:'TXT',descricao:'Conceito e voz da marca'});
    z.file('documentation/manifest.json',JSON.stringify({marca:b.name,gerado_em:new Date().toISOString(),origem:b.ai?'BUKKU + IA':'BUKKU (versão base)',arquivos:man},null,2));
    const blob=await z.generateAsync({type:'blob'});if(await saveFile(slug+'-kit-de-marca.zip',blob))toast('Kit salvo','Logos, padrão, ícones, cores, tipografia e manifesto em pastas.');}
  catch(e){toast('Não deu para montar o ZIP','Tente de novo em instantes.');}finally{btn.disabled=false;}}
async function pdfBook(){const b=STU.brand;if(!b)return;const btn=$('#stPdf');btn.disabled=true;
  try{const PDFLib=await import('pdf-lib');const doc=await PDFLib.PDFDocument.create();
    const addCv=async cv=>{const bytes=pngBytes(cv);const im=await doc.embedPng(bytes);const pg=doc.addPage([cv.width*.6,cv.height*.6]);pg.drawImage(im,{x:0,y:0,width:cv.width*.6,height:cv.height*.6});};
    const ks=Object.keys(STU.canv);if(STU.canv.capa)await addCv(STU.canv.capa);await addCv(await brandPage({brand:b},1));for(const k of ks)if(k!=='capa')await addCv(STU.canv[k]);
    doc.setTitle(b.name+' · brand book');const bytes=await doc.save();if(await saveFile(slugify(b.name)+'-brand-book.pdf',new Blob([bytes],{type:'application/pdf'})))toast('Brand book salvo','Uma página por peça do kit.');}
  catch(e){toast('Não deu para montar o PDF','Tente de novo em instantes.');}finally{btn.disabled=false;}}
$('#stZip').onclick=zipKit;$('#stPdf').onclick=pdfBook;
/* sketchbook pages from the brand */
const kitPages=b=>{const list=['capa','conceito',...kitKinds(b).filter(k=>k!=='capa')];while(list.length<NS*2)list.push('notas');return list.slice(0,NS*2);};
async function brandCover(p){const b=p.brand;const A=await prepare(b);const [w,h]=PAGE_RES;const s=w/768;const c=makeCanvas(w,h);const g=c.getContext('2d');g.fillStyle=A.R.primary;g.fillRect(0,0,w,h);tile(g,A.patLight,0,0,w,h,140*s,.12);
  const v=luma(A.R.primary)>.3?'dark':'light';symDraw(g,A,v,w/2-170*s,200*s,340*s);wordmark(g,b,w/2,760*s,w-180*s,110*s,inkOn(A.R.primary,A.R),'center');g.font=bodyFont(b,28*s);g.fillStyle=inkOn(A.R.primary,A.R);g.textAlign='center';g.globalAlpha=.8;g.fillText('brand book',w/2,830*s);g.globalAlpha=1;g.textAlign='left';
  g.fillStyle='rgba(30,15,10,.32)';g.fillRect(w-70*s,0,22*s,h);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(w-70*s,0,4*s,h);return c;}
async function brandPage(p,k){const b=p.brand;const kind=kitPages(b)[k];const [w,h]=PAGE_RES;const s=w/768;const c=makeCanvas(w,h);const g=c.getContext('2d');paper(g,w,h,'#f6efe4',.06);const left=k%2===1;const M0=64*s;
  g.fillStyle='rgba(42,25,18,.45)';g.font=`${22*s}px ${FU}`;g.textAlign=left?'left':'right';g.fillText(String(k+1),left?48*s:w-48*s,h-40*s);g.textAlign='left';
  const head=t=>{g.fillStyle=C.ink;g.font=`700 ${48*s}px ${FH}`;g.fillText(t,M0,100*s);g.strokeStyle='rgba(42,25,18,.25)';g.lineWidth=2*s;g.beginPath();g.moveTo(M0,116*s);g.lineTo(w-M0,116*s);g.stroke();};
  if(kind==='notas'){dotGrid(g,w,h);g.fillStyle=C.ink;g.font=`700 ${46*s}px ${FH}`;g.fillText('notas',M0,120*s);return c;}
  const A=await prepare(b);
  if(kind==='conceito'){head('Conceito');g.fillStyle=C.ink;g.font=dispFont(b,58*s,400);let y=wrapText(g,b.tagline,M0,210*s,w-2*M0,64*s);g.font=`500 ${40*s}px ${FH}`;y=wrapText(g,b.concept,M0,y+84*s,w-2*M0,48*s);let x=M0,yy=y+92*s;g.font=`${24*s}px ${FU}`;
    b.keywords.forEach((kk,i)=>{const tw=g.measureText(kk).width+36*s;if(x+tw>w-M0){x=M0;yy+=58*s;}g.strokeStyle=b.palette[i%3].hex;g.lineWidth=2.5*s;roundRect(g,x,yy-32*s,tw,46*s,22*s);g.stroke();g.fillStyle=C.ink;g.fillText(kk,x+18*s,yy);x+=tw+12*s;});return c;}
  head(PANEL_INFO[kind][0].replace(/^./,m=>m.toUpperCase()));const [W,H]=PANEL_SIZE(kind);const pc_=makeCanvas(W,H);await drawPanel(kind,b,pc_);const dw=w-2*M0,dh=dw*H/W,y0=160*s;
  g.save();g.shadowColor='rgba(42,25,18,.25)';g.shadowBlur=18*s;g.shadowOffsetY=6*s;g.drawImage(pc_,M0,y0,dw,dh);g.restore();
  const cap={logo:'Respeite a área de respiro: no mínimo a altura do símbolo em volta.',lockup:'Use a versão que der mais contraste com o fundo.',paleta:b.palette.map(x=>`${x.name} ${x.hex}`).join(' · '),tipografia:`Títulos em ${b.fonts.display}, textos em ${b.fonts.body}.`,voz:b.voice.slogans.join(' · '),foto:b.photo}[kind]||b.tagline;
  g.fillStyle='rgba(42,25,18,.72)';g.font=`${38*s}px ${FP}`;wrapText(g,cap,M0,y0+dh+70*s,dw,44*s);return c;}
/* open / close */
async function openStudio(projId){releaseLock();mode='studio';setHUD('none');const u=projId?userProjects.find(p=>p.id===projId):null;STU.proj=u||null;STU.files={};
  STU.inp=u&&u.inputs?JSON.parse(JSON.stringify(u.inputs)):blankInputs();if(!STU.inp.imgs)STU.inp.imgs={symbol:null,wordmark:null,ref:null};if(!STU.inp.style)STU.inp.style={fut:50,sat:50,geo:50,fun:50};if(!Array.isArray(STU.inp.colors))STU.inp.colors=[];if(!Array.isArray(STU.inp.apps))STU.inp.apps=[];
  if(u&&!u.inputs)STU.inp.name=u.title;STU.brand=u&&u.brand||null;STU.gens=u&&Array.isArray(u.gens)?u.gens:[];if(STU.brand&&STU.gens[0])STU.gens[0].brand=STU.brand;
  fillForm();$('#stProj').textContent=u?u.title:'Novo projeto';$('#stState').textContent=u?'salvo no caderno':'';$('#studio').classList.remove('is-hidden');$('.st-form').scrollTop=0;$('#stBoard').scrollTop=0;await renderBoard();if(!u&&!TOUCH)setTimeout(()=>$('#fName').focus(),150);}
function closeStudio(){if(STU.busy&&STU.ctl)STU.ctl.abort();$('#studio').classList.add('is-hidden');const id=STU.proj&&STU.proj.id;mode='desk';if(id){buildBooks(id);books[sel].liftT=.03;}setHUD('desk');refreshDesk();
  if(id&&STU.brand)toast('Brand book no caderno',`“${STU.proj.title}” está na mesa. Um caderno novo em branco espera o próximo projeto.`);}
$('#stClose').onclick=closeStudio;

/* ================= HUD ================= */
const hintText=TOUCH?'<span>esquerda: andar</span><span>direita: olhar</span><span>mire e toque em usar</span>':'<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> andar</span><span>clique e mova o mouse para olhar</span><span><kbd>E</kbd> usar</span><span><kbd>Shift</kbd> correr</span>';
let hintShown=0;
function showLabel(html){const l=$('#label');l.innerHTML=html;l.classList.remove('is-hidden');}
function setHUD(s){const show=(id,v)=>$(id).classList.toggle('is-hidden',!v);show('#cross',s==='explore');show('#brandFloat',s==='explore');show('#label',false);
  show('#joyHome',s==='explore'&&TOUCH);show('#actBtn',false);show('#holding',s==='explore'&&coffee.holding);['#deskTopbar','#projHead','#dock','#dots'].forEach(id=>show(id,s==='desk'));
  if(s==='explore'){const h=$('#hint');h.innerHTML=hintText;h.classList.remove('is-hidden');hintShown=performance.now();}else $('#hint').classList.add('is-hidden');}
function labelFor(o){const a=o.userData.action,act=TOUCH?'toque em usar':'clique ou E';
  if(a==='desk')return '<b>Mesa de projetos</b> aproxime-se';if(a==='lamp'){const L=lamps[o.userData.lamp];return `<b>${o.userData.label}</b> ${act} para ${L.on?'apagar':'acender'}`;}
  if(a==='easel')return `<b>Cavalete</b> ${act} para pintar`;if(a==='coffee')return `<b>Cafeteira</b> ${act} para café ou caneca`;
  if(a==='poster')return `<b>${o.userData.label}</b> ${act} para trocar a imagem`;return '';}
function actFor(o){const a=o.userData.action;return a==='lamp'?(lamps[o.userData.lamp].on?'Apagar':'Acender'):a==='easel'?'Pintar':a==='coffee'?'Café':a==='poster'?'Trocar':'Usar';}

/* ================= crumpled paper intro (raw WebGL, no deps) =================
   A sheet is wrapped onto a sphere with an isometric "exponential map" (it curls toward the viewer, printed
   side inward), plus a straight-crease displacement field. Opening = the sphere radius goes to infinity while
   lobes open at different speeds; a weaker copy of the same creases stays on the flat sheet. */
function PaperIntro(canvas){
  const gl=canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:false});
  if(!gl)return null;
  let s=0xc0ffee;const rr=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const R=(a,b)=>a+(b-a)*rr(),cl=(v,a,b)=>Math.max(a,Math.min(b,v)),sm=(a,b,x)=>{const t=cl((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const VS=`attribute vec3 aP;attribute vec3 aN;attribute vec2 aU;uniform mat4 uM;uniform mat4 uV;uniform mat4 uPj;varying vec3 vN;varying vec2 vU;varying vec3 vW;
    void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=mat3(uM)*aN;vU=aU;gl_Position=uPj*uV*w;}`;
  const FS=`precision highp float;uniform sampler2D tF;uniform sampler2D tB;uniform vec3 uL;uniform float uA;uniform float uK;uniform vec3 uCam;varying vec3 vN;varying vec2 vU;varying vec3 vW;
    void main(){vec3 n=normalize(vN);vec4 c;if(gl_FrontFacing){c=texture2D(tF,vU);}else{c=texture2D(tB,vU);n=-n;}
      float dif=max(dot(n,uL),0.);float wrap=max(dot(n,uL)*.5+.5,0.);
      vec3 v=normalize(uCam-vW);vec3 h=normalize(uL+v);float sp=pow(max(dot(n,h),0.),18.)*.06;
      float back=mix(1.,.86+.14*smoothstep(-.4,.9,n.z),uK);
      float lit=(.50+.44*dif+.10*wrap)*back;
      gl_FragColor=vec4((c.rgb*lit+sp)*uA,uA);}`;
  function sh(t,src){const o=gl.createShader(t);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o;}
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return null;gl.useProgram(pr);
  const U={};['uM','uV','uPj','tF','tB','uL','uA','uK','uCam'].forEach(k=>U[k]=gl.getUniformLocation(pr,k));
  const A={P:gl.getAttribLocation(pr,'aP'),N:gl.getAttribLocation(pr,'aN'),U:gl.getAttribLocation(pr,'aU')};
  const bP=gl.createBuffer(),bN=gl.createBuffer(),bU=gl.createBuffer(),bI=gl.createBuffer();
  const ext=gl.getExtension('OES_element_index_uint');
  function texOf(c){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}

  /* ---- crease field: straight mountain/valley segments, like a sheet that was really balled up ---- */
  function creaseField(W,H,n,{amp=[.5,1.4],len=[60,260],wid=[14,46],seed=1}){const sv=s;s=seed;const L=[];
    for(let i=0;i<n;i++){const a=R(0,Math.PI);L.push({cx:R(-.6,.6)*W,cy:R(-.6,.6)*H,dx:Math.cos(a),dy:Math.sin(a),hl:R(len[0],len[1]),w:R(wid[0],wid[1]),a:R(amp[0],amp[1])*(rr()<.5?-1:1)});}
    // a few long folds that cross the whole sheet
    for(let i=0;i<4;i++){const a=R(0,Math.PI);L.push({cx:R(-.25,.25)*W,cy:R(-.25,.25)*H,dx:Math.cos(a),dy:Math.sin(a),hl:2*Math.max(W,H),w:R(40,80),a:R(.8,1.3)*(rr()<.5?-1:1)});}
    s=sv;return (x,y)=>{let h=0;for(const c of L){const px=x-c.cx,py=y-c.cy;const al=px*c.dx+py*c.dy,pe=-px*c.dy+py*c.dx;const t=1-Math.abs(pe)/c.w;if(t<=0)continue;const f=sm(c.hl,c.hl*.55,Math.abs(al));if(f<=0)continue;h+=c.a*t*f;}return h;};}

  const M={};
  function build(W,H,front,back){M.W=W;M.H=H;const step=Math.max(4,Math.sqrt(W*H/9000));const nx=Math.round(W/step),ny=Math.round(H/step);M.nx=nx;M.ny=ny;
    const N=(nx+1)*(ny+1);const fl=new Float32Array(N*2),uv=new Float32Array(N*2),h1=new Float32Array(N),h2=new Float32Array(N),ph=new Float32Array(N);
    const fine=creaseField(W,H,64,{amp:[.35,1.1],len:[50,240],wid:[8,26],seed:7}),big=creaseField(W,H,130,{amp:[.5,1.2],len:[40,170],wid:[14,40],seed:21});
    let m1=0;for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const k=j*(nx+1)+i;const u=i/nx,v=j/ny;const x=(u-.5)*W,y=(v-.5)*H;fl[k*2]=x;fl[k*2+1]=y;uv[k*2]=u;uv[k*2+1]=v;
      h1[k]=fine(x,y);h2[k]=big(x,y);m1=Math.max(m1,Math.abs(h1[k]));ph[k]=Math.atan2(y,x);}
    // per-vertex angular stretch so every edge reaches the far pole when balled (a closed ball, printed side in)
    const sc=new Float32Array(N);for(let k=0;k<N;k++){const c=Math.abs(Math.cos(ph[k])),sn=Math.abs(Math.sin(ph[k]));const de=Math.min(c>1e-6?W/2/c:1e9,sn>1e-6?H/2/sn:1e9);sc[k]=de;}
    for(let k=0;k<N;k++)h1[k]/=m1||1;
    const idx=new (ext?Uint32Array:Uint16Array)(nx*ny*6);let o=0;for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;idx[o++]=a;idx[o++]=b;idx[o++]=d;idx[o++]=a;idx[o++]=d;idx[o++]=c;}
    Object.assign(M,{N,fl,uv,h1,h2,ph,sc,pos:new Float32Array(N*3),nor:new Float32Array(N*3),count:o,itype:ext?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT});
    M.dmax=Math.hypot(W/2,H/2);M.R0=M.dmax*.23;
    gl.bindBuffer(gl.ARRAY_BUFFER,bU);gl.bufferData(gl.ARRAY_BUFFER,uv,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bI);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);
    if(M.tF){gl.deleteTexture(M.tF);gl.deleteTexture(M.tB);}M.tF=texOf(front);M.tB=texOf(back);}

  /* k: 0 flat … 1 ball. lobe: how uneven the opening is. res: residual crease depth (px) */
  function shape(k,{lobe=1,res=3.6,seedPh=0}={}){const {N,fl,h1,h2,ph,sc,pos,R0}=M;const kk=cl(k,0,1);
    for(let i=0;i<N;i++){const x=fl[i*2],y=fl[i*2+1],d=Math.hypot(x,y);const p=ph[i];
      const v=(.55*Math.sin(3*p+1.3+seedPh)+.35*Math.sin(5*p+.4-seedPh)+.25*Math.sin(2*p+2.1))*lobe;
      const ki=cl(kk+v*kk*(1-kk)*1.25+(d/M.dmax-.5)*kk*(1-kk)*.5,0,1);
      let X=x,Y=y,Z=0,nx=0,ny=0,nz=-1,dmp=1;
      if(ki>1e-4&&d>1e-3){const Rt=R0/ki,sp=.96*Math.PI*R0/sc[i],th=d/Rt*(1+(sp-1)*ki*ki*(3-2*ki)),st=Math.sin(th),ct=Math.cos(th),dx=x/d,dy=y/d;const rf=1-.34*ki*ki*sm(.55,1,d/sc[i]);X=st*Rt*dx*rf;Y=st*Rt*dy*rf;Z=Rt*(1-ct*rf);nx=st*dx;ny=st*dy;nz=-ct;dmp=.4+.6*Math.min(1,Math.abs(st)*1.5);}
      const disp=h2[i]*R0*.21*dmp*Math.pow(ki,1.1)+h1[i]*res*(1+ki*2.5);
      // edges of a flattened sheet are never perfectly straight
      const ew=h1[i]*1.2*(1-ki);
      pos[i*3]=X+nx*disp+ew;pos[i*3+1]=Y+ny*disp-ew*.7;pos[i*3+2]=Z+nz*disp-kk*R0;}
    // normals from the grid
    const {nx:gx,ny:gy,nor}=M;const P=pos;const at=(i,j)=>(cl(j,0,gy)*(gx+1)+cl(i,0,gx))*3;
    for(let j=0;j<=gy;j++)for(let i=0;i<=gx;i++){const a=at(i+1,j),b=at(i-1,j),c=at(i,j+1),d=at(i,j-1);
      const ux=P[a]-P[b],uy=P[a+1]-P[b+1],uz=P[a+2]-P[b+2],vx=P[c]-P[d],vy=P[c+1]-P[d+1],vz=P[c+2]-P[d+2];
      let qx=uy*vz-uz*vy,qy=uz*vx-ux*vz,qz=ux*vy-uy*vx;const l=Math.hypot(qx,qy,qz)||1;const k=(j*(gx+1)+i)*3;nor[k]=qx/l;nor[k+1]=qy/l;nor[k+2]=qz/l;}}

  const mul=(a,b)=>{const o=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+j]*b[i*4+k];o[i*4+j]=v;}return o;};
  const ident=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  const rotX=a=>{const c=Math.cos(a),s_=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s_,0,0,-s_,c,0,0,0,0,1]);};
  const rotY=a=>{const c=Math.cos(a),s_=Math.sin(a);return new Float32Array([c,0,-s_,0,0,1,0,0,s_,0,c,0,0,0,0,1]);};
  const rotZ=a=>{const c=Math.cos(a),s_=Math.sin(a);return new Float32Array([c,s_,0,0,-s_,c,0,0,0,0,1,0,0,0,0,1]);};
  const trs=(x,y,z,sc=1)=>new Float32Array([sc,0,0,0,0,sc,0,0,0,0,sc,0,x,y,z,1]);
  const V={dpr:1,cx:0,cy:0};
  function view(cw,ch,dpr,cx,cy){V.cw=cw;V.ch=ch;V.dpr=dpr;V.cx=cx;V.cy=cy;canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    const fov=28*Math.PI/180,f=1/Math.tan(fov/2),D=(ch/2)*f,near=D*.2,far=D*4,a=cw/ch;V.D=D;
    gl.uniformMatrix4fv(U.uPj,false,new Float32Array([f/a,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]));
    gl.uniformMatrix4fv(U.uV,false,trs(0,0,-D));gl.uniform3fv(U.uCam,[0,0,D]);}
  /* T: {x,y,z, rx,ry,rz, s} offsets in px/radians relative to the sheet's resting spot */
  function draw(T={},alpha=1,k=0){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(alpha<=0)return;
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    let m=trs(V.cx+(T.x||0),V.cy+(T.y||0),T.z||0,T.s??1);m=mul(m,rotZ(T.rz||0));m=mul(m,rotY(T.ry||0));m=mul(m,rotX(T.rx||0));
    gl.uniformMatrix4fv(U.uM,false,m);const L=[-.38,.5,.78],l=Math.hypot(...L);gl.uniform3fv(U.uL,L.map(v=>v/l));gl.uniform1f(U.uA,alpha);gl.uniform1f(U.uK,k);
    gl.bindBuffer(gl.ARRAY_BUFFER,bP);gl.bufferData(gl.ARRAY_BUFFER,M.pos,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(A.P);gl.vertexAttribPointer(A.P,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,bN);gl.bufferData(gl.ARRAY_BUFFER,M.nor,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(A.N);gl.vertexAttribPointer(A.N,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,bU);gl.enableVertexAttribArray(A.U);gl.vertexAttribPointer(A.U,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,M.tF);gl.uniform1i(U.tF,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,M.tB);gl.uniform1i(U.tB,1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bI);gl.drawElements(gl.TRIANGLES,M.count,M.itype,0);}
  function dispose(){try{gl.getExtension('WEBGL_lose_context')?.loseContext();}catch(e){}}
  return {build,shape,view,draw,dispose,M,V};
}

/* ================= intro ================= */
const introEl=$('#intro');
const PI_={p:null,st:{k:1,res:3.6,T:{},a:1},tilt:{x:0,y:0,tx:0,ty:0},size:'',idle:0,lobe:1};
function piPaper(w,h,base,fib){return makeCanvas(w,h,g=>{g.fillStyle=base;g.fillRect(0,0,w,h);const n=w*h/70;for(let i=0;i<n;i++){g.fillStyle=`rgba(${rnd()<.5?'120,96,72':'255,255,255'},${rnd()*fib})`;g.fillRect(rnd()*w,rnd()*h,.5+rnd()*2.6,.4+rnd()*1.1);}
  const v=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(120,96,70,.07)');g.fillStyle=v;g.fillRect(0,0,w,h);});}
function piTextures(){const sr=$('#sheet').getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),W=Math.round(sr.width*dpr),H=Math.round(sr.height*dpr);
  const front=piPaper(W,H,'#F5F2EB',.07),g=front.getContext('2d');g.imageSmoothingQuality='high';
  const place=(el,fn)=>{const r=el.getBoundingClientRect();fn((r.left-sr.left)*dpr,(r.top-sr.top)*dpr,r.width*dpr,r.height*dpr,getComputedStyle(el));};
  place($('#sheet .mark'),(x,y,w,h)=>g.drawImage(LOGO.introMark,x,y,w,h));
  place($('#sheet .name img'),(x,y,w,h)=>g.drawImage(LOGO.introWord,x,y,w,h));
  place($('#sheet .tag'),(x,y,w,h,cs)=>{g.font=`700 ${parseFloat(cs.fontSize)*dpr}px Caveat, cursive`;g.fillStyle=cs.color;g.textAlign='center';g.textBaseline='middle';const ls=lines(g,$('#sheet .tag').textContent,w+2*dpr);const lh=h/ls.length;ls.forEach((l,i)=>g.fillText(l,x+w/2,y+lh*(i+.5)));});
  const back=piPaper(W,H,'#F1EDE5',.06);{const b=back.getContext('2d');b.globalAlpha=.05;b.drawImage(front,0,0);}
  return {front,back,w:sr.width,h:sr.height,dpr};}
function piLayout(){const P=PI_.p;const ir=introEl.getBoundingClientRect(),sr=$('#sheet').getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);
  P.view(ir.width,ir.height,dpr,(sr.left+sr.width/2)-(ir.left+ir.width/2),-((sr.top+sr.height/2)-(ir.top+ir.height/2)));
  const key=Math.round(sr.width)+'x'+Math.round(sr.height)+'@'+dpr;if(key!==PI_.size){PI_.size=key;const t=piTextures();P.build(t.w,t.h,t.front,t.back);}}
function piRender(){const P=PI_.p,st=PI_.st,tl=PI_.tilt;P.shape(st.k,{res:st.res,lobe:PI_.lobe});const T=st.T;P.draw({...T,rx:(T.rx||0)+tl.y,ry:(T.ry||0)+tl.x},st.a,st.k);}
function piIdle(){cancelAnimationFrame(PI_.idle);if(REDUCED||!PI_.p)return;const tl=PI_.tilt;let last=0;
  const step=now=>{if(introEl.classList.contains('is-hidden'))return;PI_.idle=requestAnimationFrame(step);const dx=tl.tx-tl.x,dy=tl.ty-tl.y;if(Math.abs(dx)+Math.abs(dy)<1e-4&&now-last<2000)return;
    tl.x+=dx*.08;tl.y+=dy*.08;last=now;piRender();};PI_.idle=requestAnimationFrame(step);}
introEl.addEventListener('pointermove',e=>{if(TOUCH)return;PI_.tilt.tx=(e.clientX/innerWidth-.5)*.07;PI_.tilt.ty=(e.clientY/innerHeight-.5)*.06;});
introEl.addEventListener('pointerleave',()=>{PI_.tilt.tx=PI_.tilt.ty=0;});
let piRsz=0;addEventListener('resize',()=>{if(!PI_.p||introEl.classList.contains('is-hidden'))return;clearTimeout(piRsz);piRsz=setTimeout(()=>{piLayout();piRender();},120);});
const easeOutBack=t=>{const c1=1.5,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};
function pbRun(dur,fn){return new Promise(res=>{const t0=performance.now();const step=now=>{const t=Math.min(1,(now-t0)/dur);fn(t);if(t<1)requestAnimationFrame(step);else res();};requestAnimationFrame(step);});}
async function introIn(){const ready=()=>introEl.classList.add('ready');
  try{await Promise.all([...document.querySelectorAll('#sheet img')].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(r));
    PI_.p=PaperIntro($('#introCv'));if(!PI_.p){ready();return;}
    introEl.classList.add('gl');piLayout();const st=PI_.st;
    if(REDUCED){st.k=0;st.T={};piRender();ready();return;}
    const H0=innerHeight;
    // 1. the paper ball is tossed onto the table and bounces once
    await pbRun(820,t=>{st.k=1;const fall=Math.pow(1-t,2)*Math.abs(Math.cos(t*Math.PI*1.25));st.T={y:H0*.62*fall,x:-90*(1-t),rz:lerp(2.6,.5,ease(t)),rx:lerp(-1.6,.6,ease(t)),ry:lerp(1.1,-.5,ease(t)),s:1};piRender();});
    // 2. it settles and rolls to face us
    await pbRun(380,t=>{const e=ease(t);st.T={y:Math.sin(t*Math.PI)*6,rz:lerp(.5,.42,e),rx:lerp(.6,.55,e),ry:lerp(-.5,-.45,e),s:1-.04*Math.sin(t*Math.PI)};piRender();});
    // 3. it opens: lobes peel at different speeds, creases soften but stay
    await pbRun(1900,t=>{const e=1-Math.pow(1-t,3.2);st.k=1-e;st.res=3.6+2.6*(1-t);st.T={z:Math.sin(Math.PI*Math.min(1,e*1.1))*70,rz:.42*(1-e)-.02*Math.sin(t*Math.PI),rx:.55*Math.pow(1-e,1.6)+.04*Math.sin(t*Math.PI),ry:-.45*Math.pow(1-e,1.6)};piRender();});
    // 4. it relaxes on the table
    await pbRun(520,t=>{st.k=0;st.res=lerp(3.6+.0,3.6,t);st.T={rx:Math.sin(t*Math.PI*2)*.015*(1-t)};piRender();});
    st.T={};ready();piIdle();}
  catch(e){console.warn(e);introEl.classList.remove('gl');ready();}}
introIn();
$('#btnEnter').onclick=async()=>{buzz(15);$('#btnEnter').disabled=true;mode='walkin';walk={t:0,from:player.pos.clone(),to:new V3(0,1.62,2.25)};if(!TOUCH)setTimeout(tryLock,50);
  const end=()=>{introEl.classList.add('is-hidden');cancelAnimationFrame(PI_.idle);if(PI_.p){PI_.p.dispose();PI_.p=null;}};
  if(REDUCED||!PI_.p||!introEl.classList.contains('gl')){end();return;}
  cancelAnimationFrame(PI_.idle);introEl.style.background='transparent';introEl.classList.remove('ready');const st=PI_.st;
  // crumple it back into a ball…
  await pbRun(520,t=>{const e=t*t*(3-2*t);st.k=e;st.res=3.6+2*e;st.T={rz:e*.8,z:Math.sin(Math.PI*t)*50,s:1-.08*e};piRender();});
  // …and toss it away
  await pbRun(620,t=>{const e=t*t;st.T={rz:.8+e*5,rx:e*2.4,x:e*innerWidth*.42,y:Math.sin(t*Math.PI)*140-e*innerHeight*.95,s:.92-.3*e};st.a=1-Math.max(0,(t-.7)/.3);piRender();});
  end();};

/* ================= loop ================= */
const clock=new THREE.Clock();let hoverT=0,elapsed=0;
function loop(){const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
  if(mode==='walkin'&&walk){walk.t+=dt/(REDUCED?.3:2.2);const k=ease(Math.min(1,walk.t));player.pos.lerpVectors(walk.from,walk.to,k);bobT+=dt*7*(1-Math.abs(k-.5)*1.4);
    camera.position.set(player.pos.x,player.pos.y+(REDUCED?0:Math.sin(bobT*2)*.02),player.pos.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');if(walk.t>=1){walk=null;mode='explore';setHUD('explore');}}
  if(mode==='explore'){const f=new V3(-Math.sin(player.yaw),0,-Math.cos(player.yaw)),r=new V3(Math.cos(player.yaw),0,-Math.sin(player.yaw));let mx=0,mz=0;
    if(keys.has('KeyW')||keys.has('ArrowUp'))mz+=1;if(keys.has('KeyS')||keys.has('ArrowDown'))mz-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))mx+=1;if(keys.has('KeyA')||keys.has('ArrowLeft'))mx-=1;
    mx+=joyVec.x;mz-=joyVec.y;const L=Math.hypot(mx,mz);if(L>1){mx/=L;mz/=L;}const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?3.3:1.9;
    const target=f.multiplyScalar(mz*speed).add(r.multiplyScalar(mx*speed));player.vel.lerp(target,1-Math.exp(-dt*9));player.pos.addScaledVector(player.vel,dt);collide(player.pos);
    const sp=player.vel.length();if(sp>.1)bobT+=dt*sp*4.2;if(hintShown&&sp>.3&&performance.now()-hintShown>5000){$('#hint').classList.add('is-hidden');hintShown=0;}
    const bob=REDUCED?0:Math.sin(bobT*2)*.02*Math.min(1,sp/1.9);camera.position.set(player.pos.x,player.pos.y+bob,player.pos.z);camera.rotation.set(player.pitch,player.yaw,Math.sin(bobT)*.004*Math.min(1,sp),'YXZ');
    if(deskLock&&player.pos.z>-.85)deskLock=false;if(!deskLock&&player.pos.z<-1.32&&player.pos.z>deskZ1-.2)enterDesk();
    hoverT-=dt;if(hoverT<=0&&mode==='explore'){hoverT=.12;const hit=pick(innerWidth/2,innerHeight/2,interact,3.6);const cr=$('#cross'),ab=$('#actBtn');
      if(coffee.busy){}else if(hit){showLabel(labelFor(hit));cr.classList.add('hot');if(TOUCH&&hit.userData.action!=='desk'){ab.textContent=actFor(hit);ab.classList.remove('is-hidden');}else ab.classList.add('is-hidden');}
      else{$('#label').classList.add('is-hidden');cr.classList.remove('hot');ab.classList.add('is-hidden');}}
    if(heldMug.visible){heldMug.position.y=-.3+Math.sin(bobT*2)*.008;heldMug.position.x=camera.aspect<1?.13:.26;}}
  if(tw){tw.t+=dt/tw.dur;const k=ease(Math.min(1,tw.t));camera.position.lerpVectors(tw.fromPos,tw.toPos,k);camera.position.y+=Math.sin(k*Math.PI)*tw.arc;camera.quaternion.slerpQuaternions(tw.fromQ,tw.toQuat,k);camera.fov=lerp(tw.fromFov,tw.toFov,k);camera.updateProjectionMatrix();if(tw.t>=1){const d=tw.done;tw=null;if(d)d();}}
  else if(mode==='desk'){const {eye,q}=deskCam();const k=1-Math.exp(-dt*4);camera.position.lerp(eye,k);camera.quaternion.slerp(q,k);}
  for(const L of Object.values(lamps)){const tg=L.on?L.base:0;L.light.intensity+=(tg-L.light.intensity)*(1-Math.exp(-dt*8));L.shade.material.emissiveIntensity=L.light.intensity/L.base*L.em;}
  books.forEach(b=>b.update(dt));updateCoffee(dt);
  if(!REDUCED&&mode!=='paint'){const p=dust.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)+dt*.02*(1+Math.sin(i));if(y>2.7)y=.15;p.setY(i,y);p.setX(i,p.getX(i)+Math.sin(elapsed*.3+i)*dt*.01);}p.needsUpdate=true;}
  if(!((mode==='paint'||mode==='studio')&&LOW))renderer.render(scene,camera);requestAnimationFrame(loop);}
function resize(){camera.aspect=innerWidth/innerHeight;if(['explore','intro','walkin','menu','paint'].includes(mode))camera.fov=EXPLORE_FOV();camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);if(mode==='paint')fitBoard();}
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,250));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='paint'&&pDirty)savePainting();});
scene.traverse(o=>{if(o.isMesh){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if('envMapIntensity' in m&&m.envMapIntensity===1)m.envMapIntensity=.32;});}});
requestAnimationFrame(()=>{loop();$('#loadTxt').textContent='';$('#btnEnter').disabled=false;});

/* ================= load saved data (non-blocking) ================= */
(async()=>{await initStore();
  const [projs,pts,posts]=await Promise.all([listDocs('projects'),listDocs('paintings'),listDocs('posters')]);
  userProjects=projs.filter(p=>p&&p.title).map(p=>JSON.parse(JSON.stringify(p))).sort((a,b)=>(a.created||0)-(b.created||0));if(userProjects.length&&mode!=='desk'&&mode!=='toDesk')buildBooks();
  paintings=pts.filter(p=>p&&p.id).sort((a,b)=>(a.order||0)-(b.order||0));if(paintings.length){curP=paintings[paintings.length-1];updateEaselFrom(curP);}
  const cust=await listDocs('custom');cust.forEach(d=>{if(d&&d.id&&d.asset)custom[d.id]=d.asset;});
  if(custom.mug){loadImage(imgURL(custom.mug)).then(applyMug).catch(()=>{});}
  books.forEach(b=>{const r=custom['cover-'+b.p.id];if(r)b.applyCustomCover(r);});
  for(const d of posts){const P=posters[d.id];if(!P||!d.asset)continue;try{const img=await loadImage(imgURL(d.asset));applyPoster(d.id,coverCrop(img,P.aspect));P.current=d.asset;}catch(e){}}
})();
window.__ideario={openCoffeeMenu,openCoverMenu,camera,get sel(){return sel},enterDesk,exitDesk,next,prev,mainAction,select,player,get mode(){return mode},set mode(v){mode=v},setHUD,books,openPaint,brewCoffee,openPosterMenu,showNameForm};
/* gancho de teste: ?debug expõe o estúdio para os testes automáticos */
if(/[?&]debug\b/.test(location.search))window.__bukku={openStudio,generate,STU,drawPanel,prepare};
}
