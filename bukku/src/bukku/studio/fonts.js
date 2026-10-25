const FONTS_D=['Gloock','Fraunces','Playfair Display','DM Serif Display','Abril Fatface','Instrument Serif','Young Serif','Cormorant Garamond','Bebas Neue','Anton','Archivo Black','Big Shoulders Display','Space Grotesk','Syne','Unbounded','Bricolage Grotesque','Righteous','Bungee','Shrikhand','Rubik Mono One'];
const FONTS_B=['Inter','DM Sans','Work Sans','Manrope','IBM Plex Sans','Karla','Outfit','Libre Franklin','Nunito','Source Serif 4','Lora','Space Mono','Instrument Sans'];
const FONT_BOLD=new Set(['Fraunces','Playfair Display','Cormorant Garamond','Big Shoulders Display','Space Grotesk','Syne','Unbounded','Bricolage Grotesque',...FONTS_B]);
const fontReq=new Map();
function loadFont(f){if(!f)return Promise.resolve();if(fontReq.has(f))return fontReq.get(f);const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family='+f.replace(/ /g,'+')+(FONT_BOLD.has(f)?':wght@400;700':'')+'&display=swap';
  const p=new Promise(res=>{const done=()=>Promise.race([Promise.all([document.fonts.load(`400 40px "${f}"`),FONT_BOLD.has(f)?document.fonts.load(`700 40px "${f}"`):0]),new Promise(r=>setTimeout(r,3500))]).then(res,res);l.onload=done;l.onerror=()=>res();setTimeout(res,7000);});document.head.append(l);fontReq.set(f,p);return p;}

export { FONTS_B, FONTS_D, FONT_BOLD, loadFont };
