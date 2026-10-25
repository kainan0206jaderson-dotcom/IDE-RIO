import { loadImage } from '../lib/store.js';
import { makeCanvas } from '../lib/util.js';
const SVG_OK=new Set(['svg','g','path','circle','rect','ellipse','line','polyline','polygon']);
const ATTR_OK=/^(d|cx|cy|r|rx|ry|x|y|x1|y1|x2|y2|width|height|points|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|stroke-miterlimit|transform|opacity|fill-opacity|stroke-opacity|fill-rule|clip-rule|viewBox|xmlns)$/;
function cleanSVG(src,vb){try{if(typeof src!=='string'||src.length>30000)return null;const doc=new DOMParser().parseFromString(src.trim(),'image/svg+xml');const root=doc.documentElement;if(!root||root.nodeName!=='svg'||doc.querySelector('parsererror'))return null;
  const fixAttrs=el=>[...el.attributes].forEach(a=>{if(!ATTR_OK.test(a.name)||/url\(|javascript:|data:/i.test(a.value))el.removeAttribute(a.name);});
  const walk=el=>{[...el.children].forEach(c=>{if(!SVG_OK.has(c.nodeName)){c.remove();return;}fixAttrs(c);walk(c);});};fixAttrs(root);walk(root);
  root.removeAttribute('width');root.removeAttribute('height');if(!root.getAttribute('viewBox'))root.setAttribute('viewBox',vb);root.setAttribute('xmlns','http://www.w3.org/2000/svg');
  if(!root.querySelector('path,circle,rect,ellipse,line,polyline,polygon'))return null;return new XMLSerializer().serializeToString(root);}catch(e){return null;}}
const colorize=(svg,map)=>String(svg).replace(/(fill|stroke)=(["'])C([1-5])\2/g,(m,a,q,n)=>`${a}="${map[n-1]||map[0]}"`);
function sizeSVG(svg,px){if(!/xmlns=/.test(svg))svg=String(svg).replace(/<svg\b/,'<svg xmlns="http://www.w3.org/2000/svg"');const m=/viewBox=["']([^"']+)["']/.exec(svg);let w=100,h=100;if(m){const v=m[1].trim().split(/[\s,]+/).map(Number);w=v[2]||100;h=v[3]||100;}const sc=px/Math.max(w,h);return svg.replace(/<svg\b/,`<svg width="${Math.round(w*sc)}" height="${Math.round(h*sc)}"`);}
const svgImg=(svg,map,px)=>svg?loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sizeSVG(colorize(svg,map),px))).catch(()=>null):Promise.resolve(null);
function tintImg(img,col){const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;return makeCanvas(w,h,g=>{g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,w,h);});}
/* local generator (used when the AI is not available) */

export { cleanSVG, colorize, sizeSVG, svgImg, tintImg };
