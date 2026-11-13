'use strict';
/* Cuadernitos v0.2 — contornos vectorizados para mallas de relieve cerradas. */

/*
 * BASE MAESTRA: ¡NO se rasteriza ni se reconstruye!
 * Se leen los triángulos originales del STL exacto proporcionado por el usuario.
 * La base original forma parte del sitio y se carga automáticamente, sin archivo del usuario.
 * SHA256 base_rosa(1).stl (original): d0c98f68...
 */
const ORIGINAL_BASE_SHA='d0c98f68e73411b20b275383263ea7c56c8e766b9c61ab5152ef7dc79e65733e';
let masterBase=null;
let topMaskCache=new Map();
function hexDigest(buf){return crypto.subtle.digest('SHA-256',buf).then(x=>Array.from(new Uint8Array(x),b=>b.toString(16).padStart(2,'0')).join(''));}

/*
 * La base original ya está empaquetada en assets/base_rosa_exact.b64.
 * Es una serialización SIN pérdida: vértices float32, normales originales,
 * índices delta y atributos de triángulos, comprimidos con gzip.
 * Se recuperan los bytes exactos del STL y se verifica el SHA-256.
 */
async function autoLoadMasterBase(){
 setBaseStatus('Cargando automáticamente tu base maestra…',false);
 try{
  if(!('DecompressionStream' in window))throw Error('Este navegador no puede descomprimir la base automáticamente; abrí la web en Chrome actualizado.');
  const response=await fetch('assets/base_rosa_exact.b64',{cache:'force-cache'});
  if(!response.ok)throw Error('No se encontró la base original alojada en la web (HTTP '+response.status+').');
  const base64=(await response.text()).replace(/\s+/g,'');
  const binary=atob(base64);
  const compressed=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)compressed[i]=binary.charCodeAt(i);
  const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const packed=await new Response(stream).arrayBuffer();
  const view=new DataView(packed);
  if(view.byteLength<94||view.getUint8(0)!==66||view.getUint8(1)!==83||view.getUint8(2)!==76||view.getUint8(3)!==49)
   throw Error('Formato de base inválido.');
  const nverts=view.getUint32(4,true),ntri=view.getUint32(8,true),nnorm=view.getUint16(12,true);
  if(nverts!==6530||ntri!==13056||nnorm!==773)throw Error('Datos de la base incompletos.');
  let pos=14;
  const header=new Uint8Array(packed,pos,80);pos+=80;
  const verts=new Uint8Array(packed,pos,nverts*12);pos+=nverts*12;
  const indices=new Uint16Array(ntri*3);
  let prev=0;
  for(let i=0;i<indices.length;i++){prev+=view.getInt16(pos,true);pos+=2;indices[i]=prev;}
  const normals=new Uint8Array(packed,pos,nnorm*12);pos+=nnorm*12;
  const normalIndices=new Uint16Array(ntri);
  for(let i=0;i<ntri;i++){normalIndices[i]=view.getUint16(pos,true);pos+=2;}
  const attributes=new Uint8Array(packed,pos,ntri*2);pos+=ntri*2;
  if(pos!==packed.byteLength)throw Error('La base contiene datos inesperados.');
  const raw=new ArrayBuffer(84+ntri*50),dst=new Uint8Array(raw),out=new DataView(raw);
  dst.set(header,0);out.setUint32(80,ntri,true);
  for(let i=0;i<ntri;i++){
   const off=84+i*50;
   dst.set(normals.subarray(normalIndices[i]*12,normalIndices[i]*12+12),off);
   for(let j=0;j<3;j++){
    const idx=indices[3*i+j];
    if(idx>=nverts)throw Error('Índice de la base fuera de rango.');
    dst.set(verts.subarray(idx*12,idx*12+12),off+12+j*12);
   }
   dst.set(attributes.subarray(2*i,2*i+2),off+48);
  }
  await loadMasterBase(raw,false);
  setBaseStatus('✓ Base original cargada automáticamente, con 8 ranuras tipo hongo',true);
 }catch(e){
  console.error('No se pudo cargar la base maestra',e);
  setBaseStatus('Error al cargar la base maestra: '+e.message,false);
  say('Error de carga automática. Actualizá con Ctrl + F5. '+e.message,true);
 }
}
function decodeOriginalStl(buf){
 const view=new DataView(buf);
 if(view.byteLength<84)throw Error('El STL está incompleto.');
 const n=view.getUint32(80,true);
 if(n!==13056||84+n*50!==view.byteLength)throw Error('El STL no tiene la cantidad de triángulos de la base oficial.');
 let xyz=new Float32Array(n*9);
 for(let i=0;i<n;i++){
  const offset=84+i*50+12;
  for(let j=0;j<9;j++)xyz[9*i+j]=view.getFloat32(offset+j*4,true);
 }
 return xyz;
}
function setBaseStatus(text,ok){
 const box=$('#base-status');if(box){box.textContent=text;box.className=ok?'base-status good':'base-status';}
}
async function loadMasterBase(buffer){
 const raw=buffer instanceof ArrayBuffer?buffer:buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
 const sha=await hexDigest(raw);
 if(sha!==ORIGINAL_BASE_SHA)throw Error('La base incorporada no coincide con el STL original.');
 const tris=decodeOriginalStl(raw);
 masterBase={bytes:new Uint8Array(raw.slice(0)),tris};
 topMaskCache.clear();
 setBaseStatus('✓ Base original verificada · 13.056 triángulos',true);
 invalidate();drawPreview();
 say('Base original cargada automáticamente. Elegí tu foto y generá la tapa.');
}
function topSurfaceMask(width,height){
 if(!masterBase)return null;
 const key=width+'x'+height;
 if(topMaskCache.has(key))return topMaskCache.get(key);
 const c=document.createElement('canvas');c.width=width;c.height=height;
 const ctx=c.getContext('2d',{willReadFrequently:true});
 ctx.fillStyle='white';
 let triangles=masterBase.tris;
 for(let k=0;k<triangles.length;k+=9){
  if(Math.abs(triangles[k+2]-1)>1e-5||Math.abs(triangles[k+5]-1)>1e-5||Math.abs(triangles[k+8]-1)>1e-5)continue;
  ctx.beginPath();
  ctx.moveTo(triangles[k]*width/W,triangles[k+1]*height/H);
  ctx.lineTo(triangles[k+3]*width/W,triangles[k+4]*height/H);
  ctx.lineTo(triangles[k+6]*width/W,triangles[k+7]*height/H);
  ctx.closePath();ctx.fill();
 }
 const rgba=ctx.getImageData(0,0,width,height).data;
 const inside=new Uint8Array(width*height);
 for(let i=0;i<inside.length;i++)inside[i]=rgba[4*i+3]>=230?1:0;
 const result={canvas:c,inside};
 topMaskCache.set(key,result);return result;
}

const W=155,H=216,CENTERS=Array.from({length:8},(_,i)=>20.5+i*25);
const $=s=>document.querySelector(s);
let source=null, quant=null, output=null, colors=['#F9C8D5','#D51C59','#1D1A1B','#F7C12C'], baseIndex=0;
const pal=$('#palette'),preview=$('#preview'),pctx=preview.getContext('2d',{willReadFrequently:true});
const fmt=n=>Number(n).toFixed(4).replace(/0+$/,'').replace(/\.$/,'');
function say(msg,error=false){let e=$('#message');e.textContent=msg;e.className=error?'error':'';}
function hex(r,g,b){return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase();}
function rgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}
function dist(a,b){const r=a[0]-b[0],g=a[1]-b[1],bl=a[2]-b[2];return (r*.35)**2+(g*.5)**2+(bl*.3)**2;}
function mushroom(x,y){for(const c of CENTERS){let dy=Math.abs(y-c);if(x<4.8&&dy<=1.7)return true;if(x>=4.8&&((x-4.8)**2+dy**2)<=4.8**2)return true;}return false;}
function example(){
 let c=document.createElement('canvas');c.width=420;c.height=580;let ctx=c.getContext('2d');
 ctx.fillStyle='#F6C5D5';ctx.fillRect(0,0,420,580);
 ctx.fillStyle='#D72960';ctx.beginPath();ctx.ellipse(220,290,124,148,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#FFF7EE';ctx.beginPath();ctx.ellipse(225,255,94,116,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#171717';ctx.beginPath();ctx.arc(193,248,13,0,7);ctx.arc(256,248,13,0,7);ctx.fill();
 ctx.beginPath();ctx.ellipse(225,304,20,14,0,0,7);ctx.fill();
 ctx.strokeStyle='#171717';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.arc(225,306,40,.5,2.55);ctx.stroke();
 ctx.fillStyle='#D72960';ctx.beginPath();ctx.ellipse(146,165,45,78,-.45,0,7);ctx.ellipse(304,165,45,78,.45,0,7);ctx.fill();
 ctx.fillStyle='#171717';ctx.beginPath();ctx.ellipse(146,165,22,52,-.45,0,7);ctx.ellipse(304,165,22,52,.45,0,7);ctx.fill();
 ctx.fillStyle='#F5C23A';ctx.beginPath();ctx.moveTo(270,371);ctx.lineTo(323,336);ctx.lineTo(325,430);ctx.lineTo(280,420);ctx.closePath();ctx.fill();
 source=c;$('#filename').textContent='Ilustración de ejemplo';reset();
}
function loadFile(file){if(!file)return;if(!/^image\/(png|jpeg|webp)$/.test(file.type)){say('Usá PNG, JPG o WebP.',true);return}
 let img=new Image(),url=URL.createObjectURL(file);
 img.onload=()=>{URL.revokeObjectURL(url);source=img;$('#filename').textContent=file.name;reset();};
 img.onerror=()=>{URL.revokeObjectURL(url);say('No pude abrir esa imagen.',true)};img.src=url;
}
function raster(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d',{willReadFrequently:true});
 ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
 if(source){let iw=source.naturalWidth||source.width,ih=source.naturalHeight||source.height;let sc=Math.min(width/iw,height/ih),dw=iw*sc,dh=ih*sc;
 ctx.drawImage(source,(width-dw)/2,(height-dh)/2,dw,dh);}
 return ctx.getImageData(0,0,width,height).data;
}
function quantize(n=4){
 if(!source)return;
 let w=124,h=173,data=raster(w,h),pts=[],hist=new Map();
 for(let i=0;i<data.length;i+=4){
  const a=[data[i],data[i+1],data[i+2]];
  if(i%12===0)pts.push(a);
  let key=a.map(v=>Math.round(v/24)*24).join(',');
  hist.set(key,(hist.get(key)||0)+1);
 }
 const freq=Array.from(hist.entries()).sort((a,b)=>b[1]-a[1]);
 let centers=[];
 for(let [key] of freq){
  let p=key.split(',').map(Number);
  if(centers.every(a=>dist(a,p)>450))centers.push(p);
  if(centers.length>=n)break;
 }
 while(centers.length<n){let p=pts[Math.floor(Math.random()*pts.length)]||[240,240,240];centers.push(p);}
 for(let it=0;it<12;it++){
  const sums=Array.from({length:n},()=>[0,0,0,0]);
  for(let p of pts){let k=nearest(p,centers);sums[k][0]+=p[0];sums[k][1]+=p[1];sums[k][2]+=p[2];sums[k][3]++;}
  for(let k=0;k<n;k++)if(sums[k][3])centers[k]=sums[k].slice(0,3).map(v=>v/sums[k][3]);
 }
 colors=centers.map(a=>hex(...a));
 const counts=Array(n).fill(0);
 for(let p of pts)counts[nearest(p,centers)]++;
 baseIndex=counts.indexOf(Math.max(...counts));
 renderPalette();drawPreview();say('Imagen procesada. Revisá la paleta y generá tus archivos cuando esté lista.');
}
function nearest(p,arr){let k=0,b=Infinity;for(let i=0;i<arr.length;i++){let d=dist(p,arr[i]);if(d<b){b=d;k=i;}}return k;}
function reset(){output=null;$('#download3mf').disabled=true;$('#downloadstls').disabled=true;quantize(Number($('#numcolors').value))}
function renderPalette(){pal.innerHTML='';$('#countlabel').textContent=colors.length+' colores';
 colors.forEach((c,i)=>{
 let row=document.createElement('div');row.className='pcolor';
 row.innerHTML='<input type="color" aria-label="Filamento '+(i+1)+'" value="'+c+'"><div><strong>Filamento '+(i+1)+'</strong><small>'+(i===baseIndex?'Base de la tapa':'Color de relieve')+' · '+c+'</small></div><label><input type="radio" name="base" '+(i===baseIndex?'checked':'')+'> Base</label>';
 let picker=row.querySelector('input[type=color]'),radio=row.querySelector('input[type=radio]');
 picker.oninput=()=>{colors[i]=picker.value.toUpperCase();row.querySelector('small').textContent=(i===baseIndex?'Base de la tapa':'Color de relieve')+' · '+colors[i];drawPreview();invalidate();};
 radio.onchange=()=>{baseIndex=i;renderPalette();drawPreview();invalidate();};pal.appendChild(row);
 });}
function invalidate(){output=null;$('#download3mf').disabled=true;$('#downloadstls').disabled=true}
function coloredGrid(step){
 const w=Math.round(W/step),h=Math.round(H/step);
 const dx=W/w,dy=H/h,raw=raster(w,h),centers=quant||colors.map(rgb);
 const labels=new Uint8Array(w*h);
 const mask=topSurfaceMask(w,h);
 if(!mask)throw Error('Primero tenés que cargar base_rosa(1).stl (solo una vez).');
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,j=i*4;
  labels[i]=mask.inside[i]?nearest([raw[j],raw[j+1],raw[j+2]],centers):255;
 }
 return {w,h,dx,dy,labels};
}
function drawPreview(){
 const c=preview,ctx=pctx,w=c.width,h=c.height;
 ctx.clearRect(0,0,w,h);
 if(!source){$('#placeholder').hidden=false;return;}
 $('#placeholder').hidden=true;
 const rr=raster(w,h),centers=quant||colors.map(rgb),image=ctx.createImageData(w,h);
 for(let i=0;i<w*h;i++){
  const j=i*4,shade=rgb(colors[nearest([rr[j],rr[j+1],rr[j+2]],centers)]);
  image.data[j]=shade[0];image.data[j+1]=shade[1];image.data[j+2]=shade[2];image.data[j+3]=255;
 }
 ctx.putImageData(image,0,0);
 if(masterBase){
  // Máscara exacta de la cara superior del STL: las ranuras no se aproximan.
  const mask=topSurfaceMask(w,h);
  ctx.globalCompositeOperation='destination-in';
  ctx.drawImage(mask.canvas,0,0);
  ctx.globalCompositeOperation='source-over';
 }
}

function stl(tris){let n=tris.length/9,ab=new ArrayBuffer(84+n*50),v=new DataView(ab);v.setUint32(80,n,true);let off=84;
 for(let j=0;j<n;j++){
  let k=j*9;
  let a=[tris[k],tris[k+1],tris[k+2]],b=[tris[k+3],tris[k+4],tris[k+5]],c=[tris[k+6],tris[k+7],tris[k+8]];
  let ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,L=Math.hypot(nx,ny,nz)||1;
  for(let t of [nx/L,ny/L,nz/L,...a,...b,...c]){v.setFloat32(off,t,true);off+=4;}off+=2;
 }return new Uint8Array(ab)}
function crcTable(){let out=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;out[n]=c>>>0;}return out}
const crcTab=crcTable();
function crc32(buf){let c=0xffffffff;for(let b of buf)c=crcTab[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function u16(v,n){v.push(n&255,(n>>>8)&255)}
function u32(v,n){u16(v,n&65535);u16(v,n>>>16)}
async function deflate(bytes){
 if(typeof CompressionStream!=='function')return {method:0,data:bytes};
 try{
  let stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  let b=new Uint8Array(await new Response(stream).arrayBuffer());
  return {method:8,data:b};
 }catch{return {method:0,data:bytes};}
}
async function makeZip(files){
 const enc=new TextEncoder(),out=[],dir=[],records=[];let offset=0;
 for(let [name,content] of files){
  let raw=typeof content==='string'?enc.encode(content):content,filename=enc.encode(name);
  let {method,data}=await deflate(raw),crc=crc32(raw),local=[];
  u32(local,0x04034b50);u16(local,20);u16(local,0);u16(local,method);u16(local,0);u16(local,0);u32(local,crc);
  u32(local,data.length);u32(local,raw.length);u16(local,filename.length);u16(local,0);
  let head=new Uint8Array(local.length+filename.length);head.set(local);head.set(filename,local.length);
  out.push(head,data);records.push({filename,method,crc,raw:raw.length,len:data.length,offset});
  offset+=head.length+data.length;
 }
 for(let r of records){
  let entry=[];u32(entry,0x02014b50);u16(entry,20);u16(entry,20);u16(entry,0);u16(entry,r.method);
  u16(entry,0);u16(entry,0);u32(entry,r.crc);u32(entry,r.len);u32(entry,r.raw);
  u16(entry,r.filename.length);u16(entry,0);u16(entry,0);u16(entry,0);u16(entry,0);u32(entry,0);u32(entry,r.offset);
  let b=new Uint8Array(entry.length+r.filename.length);b.set(entry);b.set(r.filename,entry.length);dir.push(b);
 }
 const directory=new Blob(dir),tail=[];u32(tail,0x06054b50);u16(tail,0);u16(tail,0);
 u16(tail,records.length);u16(tail,records.length);u32(tail,directory.size);u32(tail,offset);u16(tail,0);
 return new Blob([...out,...dir,new Uint8Array(tail)],{type:'application/zip'});
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function project3mf(parts){
 const ns='http://schemas.microsoft.com/3dmanufacturing/core/2015/02',pns='http://schemas.microsoft.com/3dmanufacturing/production/2015/06';
 const objects=parts.map((o,i)=>{
  // Compartir vértices baja drásticamente el tamaño del 3MF y evita duplicar caras.
  const vertices=[],triangles=[],indices=new Map(),xyz=o.tris;
  for(let t=0;t<xyz.length;t+=9){
   const ids=[];
   for(let j=0;j<9;j+=3){
    const x=xyz[t+j],y=xyz[t+j+1],z=xyz[t+j+2];
    const key=x+'|'+y+'|'+z;
    let id=indices.get(key);
    if(id===undefined){
     id=vertices.length;indices.set(key,id);
     vertices.push('<vertex x="'+x+'" y="'+y+'" z="'+z+'"/>');
    }
    ids.push(id);
   }
   triangles.push('<triangle v1="'+ids[0]+'" v2="'+ids[1]+'" v3="'+ids[2]+'"/>');
  }
  return '<object id="'+(i+1)+'" type="model"><mesh><vertices>'+vertices.join('')+'</vertices><triangles>'+triangles.join('')+'</triangles></mesh></object>';
 });
 const objId=parts.length+1,main='<?xml version="1.0" encoding="UTF-8"?>'+
  '<model xmlns="'+ns+'" xmlns:p="'+pns+'" requiredextensions="p" unit="millimeter" xml:lang="es-AR"><metadata name="Application">Cuadernitos 0.1</metadata><resources>'+
  '<object id="'+objId+'" type="model"><components>'+parts.map((_,i)=>'<component objectid="'+(i+1)+'"/>').join('')+'</components></object></resources>'+
  '<build><item objectid="'+objId+'" transform="1 0 0 0 1 0 0 0 1 50.5 20 0"/></build></model>';
 // Todos los volúmenes comparten coordenadas; cada pieza es un material lógico.
 const model='<?xml version="1.0" encoding="UTF-8"?>'+
  '<model xmlns="'+ns+'" unit="millimeter" xml:lang="es-AR"><resources>'+objects.join('')+'</resources></model>';
 // Usamos referencia a objeto de subarchivo, según el esquema 3MF de componentes.
 const fixedMain=main.replace('<model xmlns="'+ns+'" xmlns:p="'+pns+'" requiredextensions="p"', '<model xmlns="'+ns+'" xmlns:p="'+pns+'" requiredextensions="p"')
 .replaceAll(/<component objectid="(\d+)"\/>/g,(_,id)=>'<component objectid="'+id+'" p:path="/3D/Objects/object_1.model"/>');
 const cfg='<?xml version="1.0" encoding="UTF-8"?>'+
 '<config><object id="'+objId+'"><metadata key="name" value="Tapa A5 - Cuadernitos"/>'+
 '<metadata key="extruder" value="1"/>'+
 parts.map((part,i)=>'<part id="'+(i+1)+'" subtype="normal_part">'+
 '<metadata key="name" value="'+esc(part.name)+'"/>'+
 '<metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>'+
 '<metadata key="extruder" value="'+(i+1)+'"/><mesh_stat face_count="'+(part.tris.length/9)+'" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/></part>').join('')+
 '</object><plate><metadata key="plater_id" value="1"/><model_instance><metadata key="object_id" value="'+objId+'"/><metadata key="instance_id" value="0"/></model_instance></plate></config>';
 const filament=parts.map(x=>x.color);
 const settings=JSON.stringify({filament_colour:filament,filament_type:filament.map(()=>'PLA'),printer_model:'Bambu Lab A1',printer_settings_id:'Bambu Lab A1 0.4 nozzle',print_settings_id:'0.20mm Standard @BBL A1'});
 const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>';
 const rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="r1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>';
 const subrels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/Objects/object_1.model" Id="r1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>';
 return makeZip([
 ['[Content_Types].xml',types],['_rels/.rels',rels],['3D/3dmodel.model',fixedMain],
 ['3D/_rels/3dmodel.model.rels',subrels],['3D/Objects/object_1.model',model],
 ['Metadata/model_settings.config',cfg],['Metadata/project_settings.config',settings]
 ]).then(b=>new Blob([b],{type:'model/3mf'}));
}
function save(blob,name){let a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function generate(){
 if(!masterBase){say('La base maestra todavía no cargó. Actualizá la página si aparece un error de carga.',true);return;}
 if(!source){say('Primero elegí una imagen.',true);return;}
 const btn=$('#generate');btn.disabled=true;say('Montando los colores sobre la base STL original…');
 try{
  await new Promise(r=>setTimeout(r,30));
  const [{meshFor},{default:earcut}]=await Promise.all([import('./mesh.mjs'),import('./vendor/earcut.mjs')]);
  const grid=coloredGrid(Number($('#precision').value)),baseHeight=1,relief=Number($('#relief').value);
  // La base NO se toca. Los triángulos originales se pasan al 3MF y los bytes idénticos al STL.
  const parts=[{name:'base_rosa_STL_original',color:colors[baseIndex],tris:masterBase.tris,stlBytes:masterBase.bytes}];
  for(let k=0;k<colors.length;k++)if(k!==baseIndex){
   const tris=meshFor(grid,k,baseHeight,baseHeight+relief,earcut);
   if(tris.length)parts.push({name:'relieve_color_'+(k+1),color:colors[k],tris});
  }
  if(parts.length<2)throw Error('La imagen quedó de un solo color. Probá otra ilustración o cambiá la paleta.');
  const zip3mf=await project3mf(parts);
  output={parts,zip3mf,zipStls:null};
  $('#download3mf').disabled=false;$('#downloadstls').disabled=false;
  const n=parts.reduce((sum,p)=>sum+p.tris.length/9,0);
  say('¡Listo! Base STL ORIGINAL intacta + '+(parts.length-1)+' relieves. '+n.toLocaleString('es-AR')+' triángulos. Verificá el archivo en Bambu Studio.');
 }catch(e){say('No se pudo generar: '+(e.message||e),true);console.error(e);}
 finally{btn.disabled=false;}
}

autoLoadMasterBase();
$('#file').addEventListener('change',e=>loadFile(e.target.files[0]));
$('#demo').onclick=example;
$('#numcolors').onchange=()=>{invalidate();quantize(Number($('#numcolors').value));};
$('#precision').onchange=invalidate;$('#relief').onchange=invalidate;
$('#generate').onclick=generate;
$('#download3mf').onclick=()=>{if(output)save(output.zip3mf,'Cuadernitos_A5_multicolor.3mf');};
$('#downloadstls').onclick=async()=>{
 if(!output)return;
 say('Comprimiendo los STL...');
 if(!output.zipStls)output.zipStls=await makeZip(output.parts.map((o,i)=>[String(i+1).padStart(2,'0')+'_'+o.name+'.stl',(o.stlBytes||stl(o.tris))]));
 save(output.zipStls,'Cuadernitos_A5_partes_STL.zip');say('STL descargados. Importalos juntos como partes de un solo objeto en Bambu Studio.');
};
function updateOriginalPalette(){
 if(!source)return;let vals=raster(124,173),pts=colors.map(()=>[0,0,0,0]);
 for(let i=0;i<vals.length;i+=4){let k=nearest([vals[i],vals[i+1],vals[i+2]],colors.map(rgb));pts[k][0]+=vals[i];pts[k][1]+=vals[i+1];pts[k][2]+=vals[i+2];pts[k][3]++;}
 quant=pts.map((v,i)=>v[3]?v.slice(0,3).map(t=>t/v[3]):rgb(colors[i]));
}
const prevQuantize=quantize;
quantize=function(n){prevQuantize(n);quant=colors.map(rgb);drawPreview();};
example();