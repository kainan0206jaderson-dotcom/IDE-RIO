import { cmyk, inkOn, luma, rolesOf, shadeHex, slugify } from './color.js';
import { loadFont } from './fonts.js';
import { svgImg, tintImg } from './svg.js';
import { imgURL, loadImage } from '../lib/store.js';
import { artCanvas, hexRgb, roundRect } from '../lib/util.js';
const prepCache=new WeakMap();
function prepare(b){if(prepCache.has(b))return prepCache.get(b);const pr=(async()=>{const R_=rolesOf(b);const P=R_.P;await Promise.all([loadFont(b.fonts.display),loadFont(b.fonts.body)]);const mono=h=>[h,h,h,h,h];
  let [pos,light,dark,pat,patLight,...icons]=await Promise.all([svgImg(b.symbol,P,1000),svgImg(b.symbol,mono(R_.light),1000),svgImg(b.symbol,mono(R_.dark),1000),svgImg(b.pattern,P,400),svgImg(b.pattern,mono(R_.light),400),...b.icons.map(i=>svgImg(i.svg,[R_.dark,R_.primary,R_.accent,R_.light,R_.dark],240))]);
  const u=b.user||{};const [uSym,uWord,uRef]=await Promise.all(['symbol','wordmark','ref'].map(k=>u[k]?loadImage(imgURL(u[k])).catch(()=>null):null));
  if(uSym){pos=uSym;light=tintImg(uSym,R_.light);dark=tintImg(uSym,R_.dark);}
  return {R:R_,P,pos,light,dark,pat,patLight,icons,uWord,uRef};})();prepCache.set(b,pr);return pr;}
const wmText=b=>b.wordmark.case==='upper'?b.name.toUpperCase():b.wordmark.case==='lower'?b.name.toLowerCase():b.name;
const dispFont=(b,px,w)=>`${w||b.wordmark.weight||400} ${px}px "${b.fonts.display}", Georgia, serif`;
const bodyFont=(b,px,w=400)=>`${w} ${px}px "${b.fonts.body}", system-ui, sans-serif`;
function drawTracked(g,text,x,y,sp,align){const ch=[...text];const ws=ch.map(c=>g.measureText(c).width);const tot=ws.reduce((a,c)=>a+c,0)+sp*(ch.length-1);let cx=align==='center'?x-tot/2:align==='right'?x-tot:x;g.textAlign='left';ch.forEach((c,i)=>{g.fillText(c,cx,y);cx+=ws[i]+sp;});return tot;}
function wordmark(g,b,x,y,maxW,px,color,align='left'){const t=wmText(b);let size=px;for(let i=0;i<40;i++){g.font=dispFont(b,size);const sp=size*b.wordmark.tracking/100;const w=[...t].reduce((a,c)=>a+g.measureText(c).width,0)+sp*([...t].length-1);if(w<=maxW)break;size*=.93;}
  g.fillStyle=color;g.textBaseline='alphabetic';return drawTracked(g,t,x,y,size*b.wordmark.tracking/100,align);}
function lines(g,text,maxW,max=99){const out=[];let line='';for(const w of String(text).split(/\s+/)){const t=line?line+' '+w:w;if(g.measureText(t).width>maxW&&line){out.push(line);line=w;}else line=t;}if(line)out.push(line);return out.slice(0,max);}
function symDraw(g,A,v,x,y,s){const img=A[v];if(!img)return;const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;const ar=iw/ih||1;let w=s,h=s;if(ar>1)h=s/ar;else w=s*ar;g.drawImage(img,x+(s-w)/2,y+(s-h)/2,w,h);}
function tile(g,img,x,y,w,h,size,alpha=1){if(!img)return;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.globalAlpha=alpha;for(let yy=y;yy<y+h;yy+=size)for(let xx=x;xx<x+w;xx+=size)g.drawImage(img,xx,yy,size,size);g.restore();}
function cover(g,img,x,y,w,h){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;const s=Math.max(w/iw,h/ih);g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.drawImage(img,x+(w-iw*s)/2,y+(h-ih*s)/2,iw*s,ih*s);g.restore();}
async function drawPanel(k,b,c){const A=await prepare(b);const W=c.width,H=c.height,g=c.getContext('2d'),R_=A.R;g.save();g.clearRect(0,0,W,H);g.textBaseline='alphabetic';
  const bg=col=>{g.fillStyle=col;g.fillRect(0,0,W,H);};const txt=(t,x,y,font,col,align='left',a=1)=>{g.font=font;g.fillStyle=col;g.textAlign=align;g.globalAlpha=a;g.fillText(t,x,y);g.globalAlpha=1;g.textAlign='left';};
  const varOn=bgc=>luma(bgc)>.3?'dark':'light';const shadow=(on)=>{if(on){g.shadowColor='rgba(0,0,0,.22)';g.shadowBlur=24;g.shadowOffsetY=10;}else{g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;}};
  switch(k){
    case 'capa':{bg(R_.primary);tile(g,A.patLight,0,0,W,H,120,.06);const ik=inkOn(R_.primary,R_);symDraw(g,A,varOn(R_.primary),90,H/2-130,230);wordmark(g,b,370,H/2+30,W-440,150,ik);
      g.font=bodyFont(b,30);g.fillStyle=ik;g.globalAlpha=.85;lines(g,b.tagline,W-450,2).forEach((l,i)=>g.fillText(l,374,H/2+92+i*38));g.globalAlpha=1;break;}
    case 'logo':{bg(R_.light);g.strokeStyle=R_.dark;g.globalAlpha=.08;g.lineWidth=1;for(let i=40;i<W;i+=40){g.beginPath();g.moveTo(i,0);g.lineTo(i,H);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(W,i);g.stroke();}g.globalAlpha=1;
      symDraw(g,A,'pos',W/2-130,70,260);if(A.uWord){const iw=A.uWord.naturalWidth,ih=A.uWord.naturalHeight;const s=Math.min(440/iw,120/ih);g.drawImage(A.uWord,W/2-iw*s/2,400,iw*s,ih*s);}else wordmark(g,b,W/2,470,480,84,R_.dark,'center');
      txt('área de respiro = altura do símbolo',W/2,560,bodyFont(b,16),R_.dark,'center',.55);break;}
    case 'lockup':{bg(R_.dark);symDraw(g,A,'light',50,110,130);wordmark(g,b,200,215,350,80,R_.light);
      [[R_.light,'pos'],[R_.primary,varOn(R_.primary)],[R_.accent,varOn(R_.accent)]].forEach(([c_,v],i)=>{const x=40+i*180;g.fillStyle=c_;g.fillRect(x,330,160,200);symDraw(g,A,v,x+30,370,100);txt(['positivo','sobre a cor','sobre o acento'][i],x+80,512,bodyFont(b,14),inkOn(c_,R_),'center',.8);});break;}
    case 'paleta':{const cw=W/5;b.palette.forEach((p,i)=>{g.fillStyle=p.hex;g.fillRect(i*cw,0,cw+1,H);const ik=inkOn(p.hex,R_);const x=i*cw+24;txt(p.name,x,H-150,dispFont(b,40,400),ik);const rgb=hexRgb(p.hex),cm=cmyk(p.hex);
      txt(p.hex.toUpperCase(),x,H-104,bodyFont(b,18,700),ik);txt('RGB '+rgb.join(' '),x,H-78,bodyFont(b,15),ik,'left',.85);txt('CMYK '+cm.join(' '),x,H-54,bodyFont(b,15),ik,'left',.85);if(p.role)txt(p.role,x,44,bodyFont(b,14),ik,'left',.7);});break;}
    case 'tipografia':{bg(R_.light);txt('Aa',36,300,dispFont(b,280),R_.dark);txt('títulos',380,120,bodyFont(b,15),R_.primary);txt(b.fonts.display,380,152,bodyFont(b,22,700),R_.dark);txt('texto',380,210,bodyFont(b,15),R_.primary);txt(b.fonts.body,380,242,bodyFont(b,22,700),R_.dark);
      g.font=dispFont(b,40);g.fillStyle=R_.dark;lines(g,b.tagline,520,2).forEach((l,i)=>g.fillText(l,40,390+i*46));g.font=bodyFont(b,19);g.globalAlpha=.75;lines(g,'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !?&',520,3).forEach((l,i)=>g.fillText(l,40,500+i*28));g.globalAlpha=1;break;}
    case 'padrao':{bg(R_.light);tile(g,A.pat,0,0,W,H,100);break;}
    case 'icones':{bg(R_.light);A.icons.slice(0,6).forEach((im,i)=>{const cx=110+(i%3)*190,cy=150+Math.floor(i/3)*220;if(im)g.drawImage(im,cx-55,cy-55,110,110);txt(b.icons[i].name,cx,cy+95,bodyFont(b,17),R_.dark,'center',.7);});break;}
    case 'voz':{bg(R_.accent);const ik=inkOn(R_.accent,R_);g.font=dispFont(b,66);g.fillStyle=ik;const hl=lines(g,b.voice.headline,520,3);hl.forEach((l,i)=>g.fillText(l,40,130+i*74));let y=150+hl.length*74;b.voice.slogans.forEach(s_=>{txt('— '+s_,40,y,bodyFont(b,24),ik,'left',.9);y+=40;});
      g.fillStyle=ik;g.globalAlpha=.9;roundRect(g,40,H-110,Math.min(520,g.measureText(b.voice.cta).width+300),56,28);g.fill();g.globalAlpha=1;txt(b.voice.cta,64,H-73,bodyFont(b,22,700),R_.accent);break;}
    case 'foto':{if(A.uRef)cover(g,A.uRef,0,0,W,H);else g.drawImage(artCanvas(W,H,[R_.primary,R_.accent,R_.second,R_.light],1,shadeHex(R_.light,-.05)),0,0);
      const gr=g.createLinearGradient(0,H*.45,0,H);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(20,14,10,.78)');g.fillStyle=gr;g.fillRect(0,0,W,H);g.font=bodyFont(b,24);g.fillStyle='#fbf6ef';const ls=lines(g,b.photo,W-80,4);ls.forEach((l,i)=>g.fillText(l,40,H-40-(ls.length-1-i)*32));break;}
    case 'social':{bg(shadeHex(R_.light,-.04));shadow(true);g.fillStyle=R_.primary;roundRect(g,100,70,400,400,18);g.fill();shadow(false);g.save();roundRect(g,100,70,400,400,18);g.clip();tile(g,A.patLight,100,70,400,400,80,.12);g.restore();
      const ik=inkOn(R_.primary,R_);symDraw(g,A,varOn(R_.primary),130,100,70);g.font=dispFont(b,48);g.fillStyle=ik;const ls=lines(g,b.applications.social,340,4);ls.forEach((l,i)=>g.fillText(l,130,320-(ls.length-1)*26+i*54));
      txt('@'+slugify(b.name).replace(/-/g,''),100,520,bodyFont(b,20,700),R_.dark);txt('♥ 1.204   ✦ salvar',500,520,bodyFont(b,16),R_.dark,'right',.6);break;}
    case 'camiseta':{bg(shadeHex(R_.light,-.03));const tee=new Path2D('M205 120 L255 98 Q300 138 345 98 L395 120 L480 190 L440 245 L405 222 L405 505 L195 505 L195 222 L160 245 L120 190 Z');shadow(true);g.fillStyle=R_.primary;g.fill(tee);shadow(false);
      g.strokeStyle='rgba(0,0,0,.12)';g.lineWidth=3;g.beginPath();g.moveTo(255,98);g.quadraticCurveTo(300,150,345,98);g.stroke();symDraw(g,A,varOn(R_.primary),255,200,90);g.save();g.translate(0,0);wordmark(g,b,300,345,170,34,inkOn(R_.primary,R_),'center');g.restore();break;}
    case 'embalagem':{bg(R_.second);const top=[[300,110],[460,190],[300,270],[140,190]],lf=[[140,190],[300,270],[300,470],[140,390]],rt=[[300,270],[460,190],[460,390],[300,470]];const poly=(pts,col)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=col;g.fill();};
      shadow(true);poly([[140,190],[300,110],[460,190],[460,390],[300,470],[140,390]],R_.dark);shadow(false);poly(top,shadeHex(R_.light,-.02));poly(lf,R_.primary);g.save();g.beginPath();lf.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();tile(g,A.patLight,140,190,160,280,60,.25);g.restore();poly(rt,R_.dark);
      g.save();g.setTransform(1.6,-.8,0,2,300,270);symDraw(g,A,'light',25,12,50);g.font=bodyFont(b,9,700);g.fillStyle=R_.light;g.textAlign='center';g.fillText(String(b.applications.packaging).slice(0,22),50,78);g.restore();break;}
    case 'sacola':{bg(shadeHex(R_.light,-.03));g.strokeStyle=R_.dark;g.lineWidth=10;g.beginPath();g.arc(300,200,62,Math.PI,0);g.stroke();shadow(true);g.fillStyle=R_.primary;g.fillRect(180,195,240,310);shadow(false);
      symDraw(g,A,varOn(R_.primary),240,265,120);wordmark(g,b,300,460,190,36,inkOn(R_.primary,R_),'center');break;}
    case 'papelaria':{bg(shadeHex(R_.light,-.06));const card=(x,y,rot,col,fn)=>{g.save();g.translate(x,y);g.rotate(rot);shadow(true);g.fillStyle=col;g.fillRect(-170,-100,340,200);shadow(false);fn();g.restore();};
      card(290,220,-.1,R_.light,()=>{wordmark(g,b,-140,-30,280,40,R_.dark);txt('seu nome · cargo',-140,30,bodyFont(b,16,700),R_.dark);txt('contato da marca',-140,56,bodyFont(b,14),R_.dark,'left',.7);});
      card(320,390,.08,R_.primary,()=>{symDraw(g,A,varOn(R_.primary),-50,-60,100);});break;}
    case 'fachada':{bg(shadeHex(R_.light,.02));g.fillStyle=shadeHex(R_.light,-.07);g.fillRect(0,120,W,480);g.fillStyle=R_.dark;g.fillRect(240,150,760,120);wordmark(g,b,620,238,680,80,R_.light,'center');
      const aw=14;for(let i=0;i<aw;i++){g.fillStyle=i%2?R_.light:R_.primary;g.beginPath();const x=220+i*(800/aw);g.moveTo(x,285);g.lineTo(x+800/aw,285);g.lineTo(x+800/aw,330);g.arc(x+400/aw,330,400/aw,0,Math.PI);g.closePath();g.fill();}
      g.fillStyle=R_.dark;g.globalAlpha=.85;g.fillRect(260,370,330,200);g.globalAlpha=1;g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.moveTo(300,370);g.lineTo(380,370);g.lineTo(300,470);g.fill();symDraw(g,A,'light',360,410,120);
      g.fillStyle=R_.primary;g.fillRect(640,370,170,230);g.fillStyle=R_.accent;g.beginPath();g.arc(790,490,8,0,7);g.fill();tile(g,A.pat,0,575,W,25,25);txt(String(b.applications.signage||b.name).slice(0,30),880,560,bodyFont(b,18,700),R_.dark,'left',.7);break;}
  }
  g.restore();}
/* studio state & form */

export { bodyFont, cover, dispFont, drawPanel, lines, prepare, symDraw, tile, wordmark };
