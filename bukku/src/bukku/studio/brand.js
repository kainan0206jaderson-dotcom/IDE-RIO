import { harmonyPalette, hashStr, hex2hsl, hsl2hex, luma } from './color.js';
import { FONTS_B, FONTS_D, FONT_BOLD } from './fonts.js';
import { clamp } from '../lib/util.js';
import { cleanSVG } from './svg.js';
const APPS=[['identidade',[['icones','ícones'],['padrao','padrão gráfico'],['voz','voz e slogans']]],['produto',[['embalagem','embalagem'],['camiseta','camiseta'],['sacola','sacola']]],['comunicação',[['social','post social'],['foto','direção de foto']]],['impresso e ambiente',[['papelaria','papelaria'],['fachada','fachada']]]];
const ALL_APPS=APPS.flatMap(g=>g[1].map(a=>a[0]));
const CORE=['capa','logo','lockup','paleta','tipografia'];
const PANEL_INFO={capa:['capa',2],logo:['símbolo e logotipo',1],lockup:['assinaturas',1],paleta:['paleta',2],tipografia:['tipografia',1],icones:['ícones',1],padrao:['padrão gráfico',1],voz:['voz da marca',1],embalagem:['embalagem',1],camiseta:['camiseta',1],sacola:['sacola',1],social:['post social',1],foto:['direção de foto',1],papelaria:['papelaria',1],fachada:['fachada',2]};
const ORDER=['capa','logo','paleta','lockup','tipografia','padrao','icones','voz','foto','social','camiseta','embalagem','sacola','fachada','papelaria'];
const PANEL_SIZE=k=>PANEL_INFO[k][1]===2?[1240,600]:[600,600];
const kitKinds=b=>{const apps=b.apps&&b.apps.length?b.apps:ALL_APPS;return ORDER.filter(k=>CORE.includes(k)||apps.includes(k));};
const SYM_TPL=[
  st=>`<svg viewBox="0 0 100 100"><path d="M10 72 H90 V82 H10 Z" fill="C1"/>${[...Array(7)].map((_,i)=>{const a=Math.PI+(i+1)*Math.PI/8,r2=36+(i%2?0:9);return `<line x1="${(50+Math.cos(a)*17).toFixed(1)}" y1="${(64+Math.sin(a)*17).toFixed(1)}" x2="${(50+Math.cos(a)*r2).toFixed(1)}" y2="${(64+Math.sin(a)*r2).toFixed(1)}" stroke="C1" stroke-width="7" stroke-linecap="${st.geo>50?'butt':'round'}"/>`;}).join('')}<circle cx="50" cy="64" r="10" fill="C3"/></svg>`,
  ()=>`<svg viewBox="0 0 100 100"><path d="M20 88 V48 A30 30 0 0 1 80 48 V88 Z" fill="C1"/><path d="M36 88 V52 A14 14 0 0 1 64 52 V88 Z" fill="C3"/><circle cx="76" cy="20" r="8" fill="C2"/></svg>`,
  st=>`<svg viewBox="0 0 100 100"><rect x="14" y="14" width="72" height="72" rx="${st.geo>50?4:22}" fill="C1"/><path d="M14 86 L86 14 L86 86 Z" fill="C2"/><circle cx="36" cy="38" r="10" fill="C4"/></svg>`,
  ()=>`<svg viewBox="0 0 100 100"><path d="M50 8 C74 30 84 50 84 64 A34 34 0 0 1 16 64 C16 50 26 30 50 8 Z" fill="C1"/><path d="M50 40 C58 50 62 58 62 66 A12 12 0 0 1 38 66 C38 58 42 50 50 40 Z" fill="C4"/></svg>`];
const PAT_TPL=[()=>`<svg viewBox="0 0 40 40"><circle cx="10" cy="10" r="4" fill="C1"/><circle cx="30" cy="30" r="4" fill="C3"/></svg>`,()=>`<svg viewBox="0 0 40 40"><path d="M0 40 A20 20 0 0 1 40 40" fill="none" stroke="C1" stroke-width="4"/><path d="M10 40 A10 10 0 0 1 30 40 Z" fill="C3"/></svg>`,
  ()=>`<svg viewBox="0 0 40 40"><path d="M0 0 H20 V20 H0 Z M20 20 H40 V40 H20 Z" fill="C1"/></svg>`,()=>`<svg viewBox="0 0 40 40"><path d="M0 20 L20 0 M0 40 L40 0 M20 40 L40 20" stroke="C1" stroke-width="5"/></svg>`];
const ICON_SET=[['estrela','<svg viewBox="0 0 24 24"><path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.7 6.4 20l1.5-6.3L3 9.5 9.4 9z" fill="none" stroke="C1" stroke-width="2" stroke-linejoin="round"/></svg>'],
  ['folha','<svg viewBox="0 0 24 24"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15zM5 19l8-8" fill="none" stroke="C1" stroke-width="2" stroke-linecap="round"/></svg>'],
  ['seta','<svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="C1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
  ['cuidado','<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="none" stroke="C1" stroke-width="2" stroke-linejoin="round"/></svg>'],
  ['local','<svg viewBox="0 0 24 24"><path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z" fill="none" stroke="C1" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="none" stroke="C1" stroke-width="2"/></svg>'],
  ['brilho','<svg viewBox="0 0 24 24"><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" fill="none" stroke="C1" stroke-width="2" stroke-linecap="round"/></svg>']];
function localBrand(inp){const st=inp.style;const h=hashStr((inp.name||'marca')+'|'+(inp.briefing||''));const hue=h%360;
  let cols=(inp.colors.length?[...inp.colors]:harmonyPalette(hue,st).slice(0,4)).slice(0,5);const [h0]=hex2hsl(cols[0]);
  if(!cols.some(c=>luma(c)<.06)){if(cols.length>=5)cols[4]=hsl2hex(h0,.25,.1);else cols.push(hsl2hex(h0,.25,.1));}
  if(!cols.some(c=>luma(c)>.6)){if(cols.length>=5)cols[3]=hsl2hex(h0+20,.22,.93);else cols.push(hsl2hex(h0+20,.22,.93));}
  while(cols.length<5)cols.push(hsl2hex(h0+180,.5,.55));let mid=0;
  const pal=cols.slice(0,5).map((hex,i)=>{const l=luma(hex);const name=i===0?'Principal':l>.6?'Claro':l<.06?'Escuro':['Apoio','Acento','Destaque'][Math.min(2,mid++)];return {name,hex:hex.toLowerCase(),role:name.toLowerCase()};});
  const dPool=st.fut>60?[8,11,12,13,14,15]:st.fun>60?[16,17,18,4,9]:[0,1,2,3,5,6,7];const display=FONTS_D[dPool[h%dPool.length]];const bPool=st.geo>55?[0,1,4,6,12]:[2,3,5,9,10];const body=FONTS_B[bPool[(h>>>5)%bPool.length]];
  const name=(inp.name||'Marca').slice(0,40);const first=(inp.briefing||'').split(/[,.;]/)[0].trim();
  return {name,tagline:first?first.charAt(0).toUpperCase()+first.slice(1,70):'Feito com intenção.',
    concept:(inp.briefing?inp.briefing.trim().replace(/\.?$/,'. '):'')+'A identidade traduz isso em formas '+(st.geo>50?'geométricas':'orgânicas')+', cores '+(st.sat>50?'vivas':'contidas')+' e um tom '+(st.fun>50?'leve e próximo':'firme e confiável')+'.',
    keywords:[st.fut>50?'contemporâneo':'atemporal',st.sat>50?'vibrante':'sóbrio',st.geo>50?'preciso':'orgânico',st.fun>50?'divertido':'sério'],
    palette:pal,fonts:{display,body},wordmark:{case:st.fun>65?'lower':st.fut>60?'upper':'title',tracking:st.fut>60?8:0,weight:FONT_BOLD.has(display)?700:400,style:st.fun>55&&st.geo<55?'recortado':'tipografia'},
    symbol:SYM_TPL[h%SYM_TPL.length](st),pattern:PAT_TPL[(h>>>3)%PAT_TPL.length](),icons:ICON_SET.map(([n,svg])=>({name:n,svg})),
    voice:{headline:st.fun>50?'Bora fazer junto?':'Feito para durar.',slogans:['Do jeito certo.','Com calma e cuidado.','Sempre por perto.'],cta:'Conheça a '+name},
    photo:'Luz natural, texturas reais e as cores da marca em cena.',applications:{social:'Tem novidade chegando.',packaging:name,signage:name},ai:false};}
function normalizeBrand(r,inp){const base=localBrand(inp);if(!r||typeof r!=='object')return base;const o={...base,fonts:{...base.fonts},ai:true};const str=(v,n,d)=>typeof v==='string'&&v.trim()?v.trim().slice(0,n):d;
  o.name=str(r.name,40,base.name);o.tagline=str(r.tagline,90,base.tagline);o.concept=str(r.concept,600,base.concept);
  if(Array.isArray(r.keywords)){const k=r.keywords.filter(x=>typeof x==='string'&&x.trim()).slice(0,5).map(x=>x.slice(0,24));if(k.length)o.keywords=k;}
  if(Array.isArray(r.palette)){const p=r.palette.filter(c=>c&&/^#[0-9a-f]{6}$/i.test(String(c.hex).trim())).slice(0,5).map((c,i)=>({name:str(c.name,20,base.palette[i].name),hex:String(c.hex).trim().toLowerCase(),role:str(c.role,24,'')}));while(p.length<5)p.push(base.palette[p.length]);o.palette=p;}
  if(r.fonts){if(FONTS_D.includes(r.fonts.display))o.fonts.display=r.fonts.display;if(FONTS_B.includes(r.fonts.body))o.fonts.body=r.fonts.body;}
  if(r.wordmark){o.wordmark={case:['upper','lower','title'].includes(r.wordmark.case)?r.wordmark.case:base.wordmark.case,tracking:clamp(+r.wordmark.tracking||0,-4,24),weight:+r.wordmark.weight===700&&FONT_BOLD.has(o.fonts.display)?700:400,style:['recortado','tipografia'].includes(r.wordmark.style)?r.wordmark.style:base.wordmark.style};}
  const sym=cleanSVG(r.symbol,'0 0 100 100');if(sym)o.symbol=sym;const pat=cleanSVG(r.pattern,'0 0 40 40');if(pat)o.pattern=pat;
  if(Array.isArray(r.icons)){const ic=r.icons.map(i=>({name:str(i&&i.name,20,'ícone'),svg:cleanSVG(i&&i.svg,'0 0 24 24')})).filter(i=>i.svg).slice(0,6);if(ic.length>=3)o.icons=ic;}
  if(r.voice&&typeof r.voice==='object'){const sl=Array.isArray(r.voice.slogans)?r.voice.slogans.filter(x=>typeof x==='string'&&x.trim()).slice(0,3).map(x=>x.slice(0,70)):[];o.voice={headline:str(r.voice.headline,80,base.voice.headline),slogans:sl.length?sl:base.voice.slogans,cta:str(r.voice.cta,40,base.voice.cta)};}
  o.photo=str(r.photo,200,base.photo);if(r.applications&&typeof r.applications==='object')o.applications={social:str(r.applications.social,80,base.applications.social),packaging:str(r.applications.packaging,40,base.applications.packaging),signage:str(r.applications.signage,30,base.applications.signage)};
  return o;}
function buildPrompt(inp,refine,prev,nImgs,files={},kinds=null){const st=inp.style;const apps=inp.apps.length?inp.apps:ALL_APPS;const L=[
  'Você é diretor de arte sênior de um estúdio de branding brasileiro. Crie uma identidade visual completa, coerente, original e profissional.',
  `MARCA: ${inp.name}`,`BRIEFING: ${inp.briefing||'(livre: invente um conceito coerente com o nome)'}`,
  inp.colors.length?`CORES DO CLIENTE (use como base da paleta, nesta ordem): ${inp.colors.join(', ')}`:'CORES: escolha uma paleta harmônica e memorável.',
  `ESTILO de 0 a 100: atemporal→futurista ${st.fut}; contido→saturado ${st.sat}; orgânico→geométrico ${st.geo}; sério→divertido ${st.fun}.`,`PEÇAS DO KIT: ${apps.join(', ')}.`];
  if(nImgs){const ks=(kinds||['symbol','wordmark','ref'].filter(k=>inp.imgs&&(inp.imgs[k]||files[k]))).slice(0,nImgs);
    const role={symbol:'o SÍMBOLO que o cliente já tem. Ele é definitivo: o kit usa esta imagem como símbolo',wordmark:'o LOGOTIPO que o cliente já tem. Ele é definitivo: o kit usa esta imagem como logotipo',ref:'uma REFERÊNCIA de clima. Ela NÃO é o símbolo nem o logotipo da marca: use só a atmosfera (cores, textura, tom), nunca copie a forma nem descreva a referência como se fosse a marca'};
    L.push('IMAGENS ANEXADAS, na ordem: '+ks.map((k,i)=>`imagem ${i+1}: ${role[k]}`).join('; ')+'.');}
  if(slugifyName(inp.name)==='bukku')L.push('ESTA MARCA JÁ TEM IDENTIDADE: o símbolo é uma mão segurando um lápis, em traço de pincel, estilo desenho de criança; o logotipo é o lettering BUKKU com letras recortadas à mão, de tamanhos, alturas e inclinações diferentes, tudo em preto; a assinatura é "Rabisque sem medo.". Descreva exatamente isso no conceito e não invente outro símbolo.');
  if(refine&&prev){const p={...prev};delete p.ai;delete p.user;delete p.apps;L.push('VERSÃO ATUAL (JSON):',JSON.stringify(p).slice(0,60000),`PEDIDO DE AJUSTE: ${refine}`,'Mude somente o que o pedido exige e mantenha todo o resto igual.');}
  L.push('REGRAS:','- Textos em português do Brasil, curtos e com personalidade.',`- fonts.display: exatamente uma destas: ${FONTS_D.join(', ')}.`,`- fonts.body: exatamente uma destas: ${FONTS_B.join(', ')}.`,
    '- SVGs só com <svg>, <g>, <path>, <circle>, <rect>, <ellipse>, <line>, <polyline>, <polygon>. Sem texto, imagens, gradientes ou CSS.',
    '- Cores dos SVGs: só os tokens C1 a C5 (fill="C1", stroke="C2"), que são as 5 cores da paleta na ordem; use "none" quando não houver preenchimento.',
    '- symbol: viewBox "0 0 100 100"; símbolo original, simples, forte e legível pequeno, que traduza o conceito. Não copie marcas existentes nem a imagem de referência.','- concept: descreva só o que de fato existe no símbolo e no logotipo da marca (o enviado pelo cliente ou o SVG que você devolver). Nunca descreva um elemento que não está desenhado.','- wordmark.style: "recortado" para letras recortadas à mão, de tamanhos e inclinações diferentes; "tipografia" para o nome composto na fonte de títulos.',
    '- pattern: viewBox "0 0 40 40"; módulo que se repete sem emenda nas bordas.','- icons: 6 ícones de linha no mesmo estilo; viewBox "0 0 24 24"; stroke="C1" stroke-width="2" fill="none".',
    '- palette: 5 cores HEX (#rrggbb) na ordem: principal, apoio, acento, neutra clara, neutra escura.','Responda somente com este JSON:',
    '{"name":"","tagline":"","concept":"2 ou 3 frases","keywords":["","","",""],"palette":[{"name":"","hex":"#000000","role":""}],"fonts":{"display":"","body":""},"wordmark":{"case":"upper|lower|title","tracking":0,"weight":400,"style":"recortado|tipografia"},"symbol":"<svg viewBox=\\"0 0 100 100\\">...</svg>","pattern":"<svg viewBox=\\"0 0 40 40\\">...</svg>","icons":[{"name":"","svg":"<svg viewBox=\\"0 0 24 24\\">...</svg>"}],"voice":{"headline":"","slogans":["","",""],"cta":""},"photo":"direção de fotografia em 1 frase","applications":{"social":"","packaging":"","signage":""}}');
  return L.join('\n');}
/* prepared assets per brand */

const slugifyName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
/** Símbolo base, usado quando o gerado não renderiza ou sai vazio. */
const localSymbol=b=>SYM_TPL[hashStr(String(b.name||'marca'))%SYM_TPL.length]({geo:50,sat:50,fut:50,fun:50});

export { localSymbol, APPS, PANEL_INFO, PANEL_SIZE, buildPrompt, kitKinds, localBrand, normalizeBrand };
