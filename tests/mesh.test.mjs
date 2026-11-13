import assert from 'node:assert/strict';
import {meshFor} from '../mesh.mjs';
import earcut from '../vendor/earcut.mjs';

function gridFrom(pattern) {
 const h=pattern.length,w=pattern[0].length;
 const labels=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)labels[y*w+x]=pattern[y][x]==='#'?1:0;
 return {w,h,dx:.25,dy:.25,labels};
}
function testMesh(name,pattern) {
 const mesh=meshFor(gridFrom(pattern),1,1,1.4,earcut);
 assert(mesh.length>0, name+' mesh is empty');
 assert(mesh.length%9===0,'triangle triples');
 const counts=new Map();
 let top=0,bottom=0,sides=0;
 for(let i=0;i<mesh.length;i+=9){
  const vertices=[];
  for(let j=0;j<9;j+=3){
   const x=mesh[i+j],y=mesh[i+j+1],z=mesh[i+j+2];
   assert(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z),'finite coordinates');
   vertices.push([x,y,z]);
  }
  const [a,b,c]=vertices;
  const cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const allTop=vertices.every(v=>Math.abs(v[2]-1.4)<1e-5);
  const allBot=vertices.every(v=>Math.abs(v[2]-1)<1e-5);
  if(allTop){assert(cross>1e-10,name+' top triangles must face +Z');top++}
  else if(allBot){assert(cross<-1e-10,name+' bottom triangles must face -Z');bottom++}
  else sides++;
  const keys=vertices.map(v=>v.map(q=>Math.round(q*1e5)).join(','));
  for(let j=0;j<3;j++){
   const pair=[keys[j],keys[(j+1)%3]].sort().join('|');
   counts.set(pair,(counts.get(pair)||0)+1);
  }
 }
 const bad=[...counts.values()].filter(x=>x!==2);
 assert.equal(bad.length,0,name+': '+bad.length+' non-manifold edges '+JSON.stringify([...counts.entries()].filter(([,n])=>n!==2).slice(0,8)));
 assert.equal(top,bottom,'top and bottom triangle count');
 console.log('OK:',name,'triangles',mesh.length/9,'unique edges',counts.size);
}
testMesh('single pixel',['.','.','#','.']);
testMesh('rectangle',[
 '........','..####..','..####..','..####..','........']);
testMesh('ring (hole)',[
 '..........','.########.','.########.','.##....##.','.##....##.','.##....##.','.########.','.########.','..........'
]);
testMesh('two separated islands',[
 '..........','.###......','.###......','..........','......###.','......###.','..........'
]);
testMesh('diagonal touch',[
 '.......','.#.....','..#....','.......'
]);
testMesh('letter-like outline',[
 '................','..############..','..##........##..','..##........##..','..############..','..##............','..##............','..##............','................'
]);
testMesh('checkerboard',Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(x+y)%2?'#':'.').join('')));
