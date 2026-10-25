import { clamp, hexRgb, makeCanvas } from '../lib/util.js';
const slugify=s=>String(s||'marca').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'marca';
const hashStr=s=>{let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
/* color */
const toHex=(r,g,b)=>'#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
function hsl2hex(h,s,l){h=(((h%360)+360)%360)/360;const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1));};return toHex(f(0)*255,f(8)*255,f(4)*255);}
function hex2hsl(hex){const [r,g,b]=hexRgb(hex).map(v=>v/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0;const l=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;}return [h,s,l];}
const luma=hex=>{const [r,g,b]=hexRgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;};
const shadeHex=(hex,amt)=>{const [h,s,l]=hex2hsl(hex);return hsl2hex(h,s,clamp(l+amt,0,1));};
function cmyk(hex){const [r,g,b]=hexRgb(hex).map(v=>v/255);const k=1-Math.max(r,g,b);if(k>=1)return [0,0,0,100];return [(1-r-k)/(1-k),(1-g-k)/(1-k),(1-b-k)/(1-k),k].map(v=>Math.round(v*100));}
function harmonyPalette(hue,st){const sat=.22+st.sat/100*.58;const L=st.fut>60?[.18,.5,.6,.93,.08]:[.33,.55,.66,.93,.14];const off=st.geo>55?[180,30]:[35,-28];
  return [hsl2hex(hue,sat,L[0]),hsl2hex(hue+off[0],sat*.85,L[1]),hsl2hex(hue+off[1],Math.min(.92,sat+.15),L[2]),hsl2hex(hue+20,.25,L[3]),hsl2hex(hue,.3,L[4])];}
function rolesOf(b){const P=b.palette.map(c=>c.hex);const s=[...P].sort((a,c)=>luma(a)-luma(c));return {P,primary:P[0],second:P[1],accent:P[2],light:luma(s[4])>.5?s[4]:'#f6f1e9',dark:luma(s[0])<.1?s[0]:'#211a16'};}
const inkOn=(bg,R_)=>luma(bg)>.3?R_.dark:R_.light;
function paletteFromImage(cv,n=4){const s=64;const t=makeCanvas(s,s,g=>g.drawImage(cv,0,0,s,s));const d=t.getContext('2d').getImageData(0,0,s,s).data;const bk=new Map();
  for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;const k=(d[i]>>4)<<8|(d[i+1]>>4)<<4|(d[i+2]>>4);const o=bk.get(k)||{n:0,r:0,g:0,b:0};o.n++;o.r+=d[i];o.g+=d[i+1];o.b+=d[i+2];bk.set(k,o);}
  const arr=[...bk.values()].sort((a,b)=>b.n-a.n).map(o=>[o.r/o.n,o.g/o.n,o.b/o.n]);const out=[];for(const c of arr){if(out.every(o=>Math.hypot(o[0]-c[0],o[1]-c[1],o[2]-c[2])>52))out.push(c);if(out.length>=n)break;}return out.map(c=>toHex(...c));}
/* svg */

export { cmyk, harmonyPalette, hashStr, hex2hsl, hsl2hex, inkOn, luma, paletteFromImage, rolesOf, shadeHex, slugify };
