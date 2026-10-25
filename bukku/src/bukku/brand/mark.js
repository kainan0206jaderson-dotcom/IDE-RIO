import { R } from '../lib/util.js';
/* ================= BUKKU brand: hand-cut wordmark + brush-line symbol ================= */
/* Everything is drawn as clean geometry, then "printed": blurred alpha + low/high-frequency noise
   + threshold gives the irregular ink edge, and a sparse speckle knocks small paper holes into the ink. */
const BK=(()=>{
  let s=0x5eed;const rr=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const cv=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};
  /* value noise */
  const P=new Uint8Array(512);{const p=[...Array(256).keys()];for(let i=255;i>0;i--){const j=Math.floor(rr()*(i+1));[p[i],p[j]]=[p[j],p[i]];}for(let i=0;i<512;i++)P[i]=p[i&255];}
  const fade=t=>t*t*(3-2*t);
  function vn(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const h=(a,b)=>P[(P[a&255]+b)&511]/255;
    const a=h(xi,yi),b=h(xi+1,yi),c=h(xi,yi+1),d=h(xi+1,yi+1);const u=fade(xf),v=fade(yf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
  function blurA(a,w,h,r){if(r<1)return a;const t=new Float32Array(a.length),o=new Float32Array(a.length);const R=Math.round(r),n=2*R+1;
    for(let pass=0;pass<2;pass++){const src=pass?o:a;
      for(let y=0;y<h;y++){let acc=0;const row=y*w;for(let x=-R;x<=R;x++)acc+=src[row+Math.min(w-1,Math.max(0,x))];for(let x=0;x<w;x++){t[row+x]=acc/n;acc+=src[row+Math.min(w-1,x+R+1)]-src[row+Math.max(0,x-R)];}}
      for(let x=0;x<w;x++){let acc=0;for(let y=-R;y<=R;y++)acc+=t[Math.min(h-1,Math.max(0,y))*w+x];for(let y=0;y<h;y++){o[y*w+x]=acc/n;acc+=t[Math.min(h-1,y+R+1)*w+x]-t[Math.max(0,y-R)*w+x];}}}
    return o;}
  /* print: turn a clean silhouette into an inked, slightly ragged one */
  function print(src,{ink='#111111',blur=.006,edge=.16,f1=.012,f2=.07,holes=.012,holeF=.11}={}){
    const w=src.width,h=src.height,g=src.getContext('2d');const id=g.getImageData(0,0,w,h),d=id.data;const a=new Float32Array(w*h);
    for(let i=0;i<w*h;i++)a[i]=d[i*4+3]/255;const S=Math.max(w,h);const b=blurA(a,w,h,blur*S);
    const out=cv(w,h),og=out.getContext('2d'),od=og.createImageData(w,h),q=od.data;const m=/^#?(..)(..)(..)$/.exec(ink);const r=parseInt(m[1],16),gg=parseInt(m[2],16),bb=parseInt(m[3],16);
    const k1=f1*1000/S,k2=f2*1000/S,k3=holeF*1000/S;const ox=rr()*99,oy=rr()*99;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let v=b[i];if(v<=.02&&a[i]===0){continue;}
      v+=((vn(x*k1+ox,y*k1+oy)-.5)*.7+(vn(x*k2+oy,y*k2+ox)-.5)*.3)*edge;
      let al=Math.min(1,Math.max(0,(v-.46)/.08));
      if(al>0&&holes>0){const hn=vn(x*k3+ox*2,y*k3+oy*2);if(hn>1-holes*9){al*=Math.max(.0,1-(hn-(1-holes*9))/(holes*4));}}
      if(al>0){const j=i*4;q[j]=r;q[j+1]=gg;q[j+2]=bb;q[j+3]=Math.round(al*255);}}
    og.putImageData(od,0,0);return out;}

  /* ---------- wordmark: B u K k U, each letter its own size, baseline and lean (Picnic-like rhythm) ---------- */
  // letter geometry in a 100-unit cap box; each returns a Path2D (nonzero) and an optional "cut" Path2D (counters)
  const L={
    B(){const p=new Path2D(),c=new Path2D();
      p.moveTo(2,4);p.lineTo(36,0);p.lineTo(38,100);p.lineTo(0,98);p.closePath();
      p.moveTo(26,1);p.bezierCurveTo(56,-2,74,6,74,25);p.bezierCurveTo(74,40,64,47,56,49);p.lineTo(26,50);p.closePath();
      p.moveTo(26,46);p.lineTo(58,46);p.bezierCurveTo(78,48,86,60,85,74);p.bezierCurveTo(84,92,70,101,44,101);p.lineTo(26,100);p.closePath();
      c.ellipse(46,25,8,7.5,-.2,0,7);c.ellipse(51,74,9.5,8,.15,0,7);return [p,c];},
    u(){const p=new Path2D(),c=new Path2D();
      p.moveTo(0,2);p.lineTo(24,0);p.lineTo(24,46);p.quadraticCurveTo(25,60,34,60);p.quadraticCurveTo(43,60,44,46);p.lineTo(43,1);p.lineTo(68,3);p.lineTo(70,100);p.lineTo(48,99);p.lineTo(47,90);
      p.bezierCurveTo(40,99,30,102,22,101);p.bezierCurveTo(6,99,0,86,0,70);p.closePath();return [p,c];},
    K(){const p=new Path2D(),c=new Path2D();
      p.moveTo(0,2);p.lineTo(32,0);p.lineTo(33,100);p.lineTo(1,99);p.closePath();
      p.moveTo(24,52);p.lineTo(60,0);p.lineTo(94,2);p.lineTo(46,62);p.closePath();
      p.moveTo(30,40);p.lineTo(54,38);p.lineTo(96,99);p.lineTo(58,100);p.closePath();return [p,c];},
    k(){const p=new Path2D(),c=new Path2D();
      p.moveTo(0,0);p.lineTo(34,3);p.lineTo(33,100);p.lineTo(3,98);p.closePath();
      p.moveTo(26,50);p.bezierCurveTo(44,34,58,16,66,0);p.lineTo(98,4);p.bezierCurveTo(84,30,66,50,46,64);p.closePath();
      p.moveTo(32,44);p.lineTo(58,42);p.bezierCurveTo(70,64,82,84,92,100);p.lineTo(58,101);p.closePath();
      return [p,c];},
    U(){const p=new Path2D(),c=new Path2D();
      p.moveTo(2,6);p.bezierCurveTo(14,0,28,0,40,4);p.lineTo(40,52);p.bezierCurveTo(40,70,46,76,54,76);p.bezierCurveTo(63,76,68,68,68,52);p.lineTo(68,4);
      p.bezierCurveTo(80,0,94,0,106,6);p.lineTo(106,56);p.bezierCurveTo(106,86,84,104,54,104);p.bezierCurveTo(22,104,2,86,2,56);p.closePath();return [p,c];},
  };
  // [glyph, x, top, scale(height/100), rotation]
  const LAYOUT=[['B',0,14,1.04,-.07],['u',88,60,.6,.05],['K',140,0,.6,-.06],['k',204,56,.6,.1],['U',268,8,.98,.06]];
  function wordmark(h=240,ink='#111111'){const S=h/124,W=Math.ceil(392*S),H=Math.ceil(h+20*S);const c=cv(W,H),g=c.getContext('2d');g.fillStyle='#000';
    for(const [k,x,y,sc,rot] of LAYOUT){const [p,cut]=L[k]();g.save();g.translate((x+10)*S,(y+8)*S);g.scale(sc*S,sc*S);g.translate(50,50);g.rotate(rot);g.translate(-50,-50);
      g.fill(p);g.globalCompositeOperation='destination-out';g.fill(cut);g.restore();}
    return print(c,{ink,blur:.006,edge:.3,f1:.007,f2:.05,holes:.0055,holeF:.09});}

  /* ---------- symbol: a running open book, drawn with a loose brush line ---------- */
  function cr(pts,steps=10){const o=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    for(let k=0;k<steps;k++){const t=k/steps,t2=t*t,t3=t2*t;o.push([.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}
    o.push(pts[pts.length-1]);return o;}
  function brush(g,pts,w,{taper=.25,wob=.22,closed=false}={}){const P=cr(pts,12);const n=P.length;const L_=[],R_=[];const off=rr()*50;
    let len=0;const acc=[0];for(let i=1;i<n;i++){len+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);acc.push(len);}
    for(let i=0;i<n;i++){const a=P[Math.max(0,i-1)],b=P[Math.min(n-1,i+1)];let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;const t=acc[i]/(len||1);
      const tr=(vn(acc[i]*.05+off*3,off)-.5)*2.6+(vn(acc[i]*.21+off,off*2)-.5)*1.1;P[i]=[P[i][0]-dy*tr,P[i][1]+dx*tr];
      const end=closed?1:Math.min(1,Math.min(t,1-t)/.12);const ww=w*(1+(vn(acc[i]*.035+off,off)-.5)*2*wob)*(1-taper+taper*Math.sqrt(end))*.5;
      L_.push([P[i][0]-dy*ww,P[i][1]+dx*ww]);R_.push([P[i][0]+dy*ww,P[i][1]-dx*ww]);}
    g.beginPath();g.moveTo(L_[0][0],L_[0][1]);for(const p of L_)g.lineTo(p[0],p[1]);for(let i=n-1;i>=0;i--)g.lineTo(R_[i][0],R_[i][1]);g.closePath();g.fill();
    const cap=(p,ww)=>{g.beginPath();g.arc(p[0],p[1],ww,0,7);g.fill();};cap(P[0],w*.5*(1-taper*.6));cap(P[n-1],w*.5*(1-taper*.6));}
  // a hand holding a pencil in a writing grip, with a doodle coming out of the tip (drawing box 460x420)
  const d0=[210,-270],dl=Math.hypot(...d0),D=[d0[0]/dl,d0[1]/dl],Nn=[-D[1],D[0]];
  const pp=(t,o)=>[118+D[0]*t+Nn[0]*o,334+D[1]*t+Nn[1]*o];
  // child-drawing hand: rounded palm, sausage fingers, clear thumb, a sleeve cuff; only the outer outline is inked
  const capsule=(a,b,r,n=28)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l,an=Math.atan2(uy,ux),o=[];
    for(let i=0;i<=n;i++){const t=an-Math.PI/2+Math.PI*i/n;o.push([b[0]+Math.cos(t)*r,b[1]+Math.sin(t)*r]);}for(let i=0;i<=n;i++){const t=an+Math.PI/2+Math.PI*i/n;o.push([a[0]+Math.cos(t)*r,a[1]+Math.sin(t)*r]);}return o;};
  const ell=(cx,cy,rx,ry,rot=0,n=40)=>{const o=[];for(let i=0;i<n;i++){const t=i/n*Math.PI*2,x=Math.cos(t)*rx,y=Math.sin(t)*ry;o.push([cx+x*Math.cos(rot)-y*Math.sin(rot),cy+x*Math.sin(rot)+y*Math.cos(rot)]);}return o;};
  const SHAPES=[
    ell(338,214,80,68,-.15),                        // palm / back of the hand
    capsule([300,166],pp(164,-22),18),               // index finger lying on the pencil
    capsule([318,226],pp(150,27),16),                // thumb pressing from below
    capsule([262,258],[372,256],15),capsule([276,286],[378,284],15),capsule([294,312],[380,308],14), // three curled fingers, stacked
    [[392,164],[458,170],[460,272],[392,272]],       // wrist
  ];
  const PENCIL=[
    {p:[pp(46,-14),pp(300,-14)],w:9,t:.1},{p:[pp(46,14),pp(300,14)],w:9,t:.1},
    {p:[pp(300,-14),pp(306,0),pp(300,14)],w:9,t:.1},
    {p:[pp(272,-14),pp(274,14)],w:7,t:.2},{p:[pp(282,-14),pp(284,14)],w:7,t:.2},
    {p:[pp(46,-14),pp(4,-1)],w:9,t:.15},{p:[pp(46,14),pp(4,1)],w:9,t:.15},
    {p:[pp(16,-3),pp(2,0),pp(16,3)],w:12,t:0}];
  const DETAIL=[
    {p:[pp(172,-30),pp(182,-35),pp(188,-27)],w:6,t:.4},           // fingernail
    {p:[pp(168,40),[250,244],[300,242]],w:8,t:.3},                  // under the thumb
    {p:[[258,272],[296,271],[330,270]],w:8,t:.35},{p:[[272,299],[310,298],[340,297]],w:8,t:.35}, // folds between fingers
    {p:[[256,250],[262,262]],w:6,t:.5},{p:[[270,278],[276,290]],w:6,t:.5},{p:[[288,304],[294,316]],w:6,t:.5}, // fingertip nails
    {p:[[348,172],[358,186]],w:6,t:.5},{p:[[370,170],[378,184]],w:6,t:.5}, // knuckles
    {p:[[426,156],[420,206],[424,252],[422,286]],w:10},{p:[[442,158],[438,220],[442,286]],w:7,t:.3}, // cuff
    {p:[[112,346],[86,360],[60,352],[48,370],[70,392],[112,388],[150,396],[186,384]],w:8,t:.4}, // doodle
  ];
  const poly=(g,pts)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();};
  function symbol(h=420,ink='#111111'){const S=h/420,W=482*S,H=420*S,c=cv(W,H),g=c.getContext('2d');g.fillStyle='#000';g.scale(S,S);
    const sv=s;s=0xb00c;const br=(st)=>brush(g,st.p,st.w*1.15,{taper:st.t??.22,wob:.3});
    PENCIL.forEach(br);
    g.save();g.globalCompositeOperation='destination-out';for(const sh of SHAPES){poly(g,sh);g.fill();}g.restore();
    // outline layer: stroke every shape, then knock the insides out so only the union's silhouette stays
    const L=cv(W,H),lg=L.getContext('2d');lg.fillStyle='#000';lg.scale(S,S);
    for(const sh of SHAPES)brush(lg,[...sh,sh[0],sh[1]],21,{taper:0,wob:.25,closed:true});
    lg.save();lg.globalCompositeOperation='destination-out';for(const sh of SHAPES){poly(lg,sh);lg.fill();}lg.restore();
    g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(L,0,0);g.restore();
    DETAIL.forEach(br);s=sv;
    return print(c,{ink,blur:.004,edge:.42,f1:.03,f2:.16,holes:.004,holeF:.2});}
  function stack(h=520,ink='#111111'){const sy=symbol(h*.62,ink),wm=wordmark(h*.36,ink);const W=Math.max(sy.width,wm.width)+20,H=sy.height+wm.height-h*.02;const c=cv(W,H),g=c.getContext('2d');
    g.drawImage(sy,(W-sy.width)/2,0);g.drawImage(wm,(W-wm.width)/2,sy.height-h*.02);return c;}
  return {wordmark,symbol,stack,print,vn};
})();
const LOGO_K='#111111';
const LOGO=(()=>{const mark=BK.symbol(420,LOGO_K);return {introMark:BK.symbol(620,LOGO_K),introWord:BK.wordmark(330,LOGO_K),stack:BK.stack(560,LOGO_K),inline:BK.wordmark(92,LOGO_K),mark,markBrown:mark};})();
document.querySelectorAll('img[data-logo]').forEach(im=>{const c=LOGO[im.dataset.logo];im.src=c.toDataURL();im.width=c.width;im.height=c.height;});
function stampLogo(g,logo,cx,cy,width){g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const sc=width/logo.width;const w=logo.width*sc,h=logo.height*sc;g.drawImage(logo,cx-w/2,cy-h/2,w,h);g.restore();}
function brandMark(g,x,y,s,col,acc,title){g.save();g.translate(x,y);g.fillStyle=col;g.beginPath();g.arc(60*s,40*s,40*s,0,7);g.fill();g.fillStyle=acc;g.beginPath();g.arc(88*s,14*s,10*s,0,7);g.fill();
  g.fillStyle='#F4ECE2';g.font=`${48*s}px Gloock`;g.textAlign='center';g.fillText((title||'·')[0],60*s,57*s);g.restore();g.textAlign='left';}

function raggedClip(n=14,amp=1.1){const p=[];for(let i=0;i<=n;i++)p.push(`${i/n*100}% ${R(0,amp)}%`);for(let i=1;i<=n;i++)p.push(`${100-R(0,amp*.8)}% ${i/n*100}%`);for(let i=n-1;i>=0;i--)p.push(`${i/n*100}% ${100-R(0,amp)}%`);for(let i=n-1;i>0;i--)p.push(`${R(0,amp*.8)}% ${i/n*100}%`);return `polygon(${p.join(',')})`;}

export { LOGO, brandMark, stampLogo };
