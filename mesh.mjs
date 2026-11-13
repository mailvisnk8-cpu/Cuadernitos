/**
 * Construcción de sólidos cerrados a partir de máscaras de píxeles.
 * Una sola frontera consistente alimenta tapas superior/inferior y paredes:
 * evita "T-junctions" entre superficies de distinta granularidad.
 * Los huecos internos también reciben paredes.
 */
export function meshFor(grid, which, z0, z1, earcut) {
  if (!(z1 > z0)) throw new Error("La altura del relieve debe ser positiva.");
  if (typeof earcut !== "function") throw new Error("Falta el triangulador.");
  const {w,h,dx,dy,labels}=grid;
  const present=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&labels[y*w+x]===which;
  const encoded=(x,y)=>y*(w+1)+x;
  const from= [],to=[],direction=[], adjacency=new Map();
  function edge(ax,ay,bx,by,d){
    const a=encoded(ax,ay),b=encoded(bx,by),id=from.length;
    from.push(a);to.push(b);direction.push(d);
    let list=adjacency.get(a);
    if(!list){list=[];adjacency.set(a,list);}
    list.push(id);
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(!present(x,y))continue;
    // El interior de cada celda está a la izquierda de estas aristas.
    if(!present(x,y-1))edge(x,y,x+1,y,0);
    if(!present(x+1,y))edge(x+1,y,x+1,y+1,1);
    if(!present(x,y+1))edge(x+1,y+1,x,y+1,2);
    if(!present(x-1,y))edge(x,y+1,x,y,3);
  }
  if(from.length===0)return new Float32Array(0);
  const used=new Uint8Array(from.length),loops=[];
  const xy=id=>[id%(w+1),Math.floor(id/(w+1))];
  for(let seed=0;seed<from.length;seed++){
    if(used[seed])continue;
    let e=seed,ring=[],guard=0;
    const start=from[seed];
    while(true){
      if(used[e])throw new Error("Contorno no manifold: arista repetida.");
      used[e]=1;
      ring.push(xy(from[e]));
      const dest=to[e];
      if(dest===start)break;
      const candidates=(adjacency.get(dest)||[]).filter(id=>!used[id]);
      if(candidates.length===0)throw new Error("Contorno abierto: faltan aristas.");
      // En las diagonales que se tocan en un vértice preferimos
      // girar a la derecha: así cada isla conserva su propio lazo.
      const previous=direction[e];
      const order=[(previous+1)%4,previous,(previous+3)%4,(previous+2)%4];
      candidates.sort((a,b)=>order.indexOf(direction[a])-order.indexOf(direction[b]));
      e=candidates[0];
      if(++guard>from.length)throw new Error("Contorno infinito.");
    }
    // Quitamos TODOS los puntos colineales, incluyendo esquinas redundantes.
    let reduced=ring;
    if(reduced.length>3){
      const simplified=[];
      for(let i=0;i<reduced.length;i++){
        const a=reduced[(i+reduced.length-1)%reduced.length];
        const b=reduced[i],c=reduced[(i+1)%reduced.length];
        const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
        if(cross!==0)simplified.push(b);
      }
      reduced=simplified;
    }
    if(reduced.length<3)throw new Error("Contorno inválido (menos de tres puntos).");
    let area=0;
    for(let i=0;i<reduced.length;i++){
      const p=reduced[i],q=reduced[(i+1)%reduced.length];
      area+=p[0]*q[1]-q[0]*p[1];
    }
    if(!area)throw new Error("Contorno sin área.");
    loops.push({points:reduced,area:area/2});
  }
  // Dos islas que se tocan solo por una esquina comparten una arista
  // vertical en 3D (4 caras): Bambu lo marca no-manifold. Separa
  // mínimamente esas esquinas, preservando las áreas y los detalles.
  const sharedCorners=new Map();
  for(const loop of loops){
    for(let i=0;i<loop.points.length;i++){
      const p=loop.points[i],key=p[0]+','+p[1];
      let list=sharedCorners.get(key);
      if(!list){list=[];sharedCorners.set(key,list);}
      list.push({loop,i});
    }
  }
  for(const uses of sharedCorners.values()){
    if(uses.length<2)continue;
    for(const {loop,i} of uses){
      const ring=loop.points,p=ring[i];
      const prev=ring[(i+ring.length-1)%ring.length];
      const next=ring[(i+1)%ring.length];
      let vx=prev[0]+next[0]-2*p[0],vy=prev[1]+next[1]-2*p[1];
      let mag=Math.hypot(vx,vy);
      if(mag<1e-8)continue;
      // 0,04 px: en la definición por defecto son ~0,02 mm.
      const eps=.04;
      p[0]+=eps*vx/mag;p[1]+=eps*vy/mag;
    }
  }
  const exterior=loops.filter(r=>r.area>0);
  const holes=loops.filter(r=>r.area<0);
  if(!exterior.length)throw new Error("No se encontró un contorno exterior.");
  function contains(p,ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a[1]>p[1])!==(b[1]>p[1]) &&
          p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])
        inside=!inside;
    }
    return inside;
  }
  for(const hole of holes){
    const p=hole.points[0];
    const parents=exterior.filter(ext=>contains(p,ext.points));
    if(!parents.length)throw new Error("Agujero sin contorno exterior.");
    parents.sort((a,b)=>Math.abs(a.area)-Math.abs(b.area));
    (parents[0].holes??=[]).push(hole);
  }
  const result=[];
  const triangle=(a,b,c)=>result.push(...a,...b,...c);
  const quad=(a,b,c,d)=>{triangle(a,b,c);triangle(a,c,d)};
  for(const outer of exterior){
    const rings=[outer,...(outer.holes||[])],coords=[],holeOffsets=[];
    for(let i=0;i<rings.length;i++){
      const ring=rings[i].points;
      if(i)holeOffsets.push(coords.length/2);
      for(const p of ring)coords.push(p[0]*dx,p[1]*dy);
    }
    const top=earcut(coords,holeOffsets,2);
    if(top.length===0)throw new Error("No se pudo triangular un contorno.");
    for(let i=0;i<top.length;i+=3){
      const a=top[i],b=top[i+1],c=top[i+2];
      const ax=coords[2*a],ay=coords[2*a+1],
       bx=coords[2*b],by=coords[2*b+1],
       cx=coords[2*c],cy=coords[2*c+1];
      const winding=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
      if(Math.abs(winding)<1e-10)continue;
      if(winding>0){
        triangle([ax,ay,z1],[bx,by,z1],[cx,cy,z1]);
        triangle([cx,cy,z0],[bx,by,z0],[ax,ay,z0]);
      }else{
        triangle([cx,cy,z1],[bx,by,z1],[ax,ay,z1]);
        triangle([ax,ay,z0],[bx,by,z0],[cx,cy,z0]);
      }
    }
    for(const r of rings){
      for(let i=0;i<r.points.length;i++){
        const a=r.points[i],b=r.points[(i+1)%r.points.length];
        const ax=a[0]*dx,ay=a[1]*dy,bx=b[0]*dx,by=b[1]*dy;
        // Normales hacia el exterior: derecha del sentido del contorno.
        quad([ax,ay,z0],[bx,by,z0],[bx,by,z1],[ax,ay,z1]);
      }
    }
  }
  return new Float32Array(result);
}
