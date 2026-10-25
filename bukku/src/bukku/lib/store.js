/* ================= storage (cloud db + assets; browser fallback) ================= */
let notify=()=>{};
export const setNotify=f=>{notify=f;};
const Store={cloud:false,assets:null,base:null};
const custom={};
const LS={get(k,d){try{const v=localStorage.getItem('ideario.'+k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem('ideario.'+k,JSON.stringify(v));return true;}catch(e){return false;}}};
async function initStore(){try{if(!window.claude?.use)return;const [db,user]=await Promise.all([claude.use('db'),claude.use('user')]);const uid=user?await user.id():null;
  if(db&&uid){Store.base=db.doc('data/users/'+uid+'/office');Store.cloud=true;Store.assets=await claude.use('assets');}}catch(e){Store.cloud=false;}}
async function listDocs(kind){if(Store.cloud){try{const s=await Store.base.collection(kind).get();return s.docs.map(d=>({id:d.id,...d.data()}));}catch(e){}}return LS.get(kind,[]);}
async function putDoc(kind,id,data){if(Store.cloud){try{await Store.base.collection(kind).doc(id).set(data);return true;}catch(e){notify('Não deu para salvar','O armazenamento recusou a gravação. Tente de novo em instantes.');return false;}}
  const l=LS.get(kind,[]).filter(d=>d.id!==id);l.push({id,...data});if(!LS.set(kind,l)){notify('Espaço cheio','O navegador não tem mais espaço para guardar isto.');return false;}return true;}
async function delDoc(kind,id){if(Store.cloud){try{await Store.base.collection(kind).doc(id).delete();}catch(e){}return;}LS.set(kind,LS.get(kind,[]).filter(d=>d.id!==id));}
function blobToDataURL(b){return new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b);});}
async function putImage(blob){if(Store.cloud&&Store.assets){try{const r=await Store.assets.upload(blob);return r.id;}catch(e){}}return await blobToDataURL(blob);}
async function dropImage(ref){if(ref&&!ref.startsWith('data:')&&Store.assets){try{await Store.assets.delete(ref);}catch(e){}}}
const imgURL=ref=>!ref?null:ref.startsWith('data:')?ref:'/_blob/'+ref;
function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
function canvasBlob(c,type,q){return new Promise(r=>c.toBlob(b=>r(b),type,q));}

export { Store, canvasBlob, custom, delDoc, dropImage, imgURL, initStore, listDocs, loadImage, putDoc, putImage };
