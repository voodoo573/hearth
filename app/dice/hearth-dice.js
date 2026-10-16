/* HearthDice v0.6.0-app (Hearth 1.6.0 integration of Jenny's v0.5 prototype: worker pre-simulation, app-supplied totals) - animated 3D dice for Hearth. Requires three.min.js (r158, MIT) loaded first. */
(function(){
'use strict';
var T = window.THREE; if(!window.CANNON) throw new Error('HearthDice: load cannon-es.js first');
var THEMES = {
  tavern:   {name:'Tavern Night',     body:'#5a2e14', body2:'#2e170a', ink:'#f3c96b', edge:'#1a0d05'},
  oldmap:   {name:'Old Map',          body:'#e8d3a2', body2:'#c9ae74', ink:'#3a2410', edge:'#7a5a2a'},
  forest:   {name:'Elven Forest',     body:'#1f5a32', body2:'#0f3019', ink:'#e6f2c8', edge:'#082010'},
  arcane:   {name:'Arcane Tower',     body:'#3b2a8a', body2:'#1c1250', ink:'#d8c8ff', edge:'#0e0830'},
  infernal: {name:'Infernal',         body:'#8a1414', body2:'#3a0606', ink:'#ffb35a', edge:'#200202'},
  frost:    {name:'Frost',            body:'#cfe6f5', body2:'#8fb8d6', ink:'#0f2a4a', edge:'#5a7a96'},
  hoard:    {name:'Dragon Hoard',     body:'#c99a2a', body2:'#7a5410', ink:'#2a1400', edge:'#3a2405'},
  'scott-ultramarine': {name:"Scott's Ultramarine", body:'#16249a', body2:'#0b0c5a', ink:'#eef1f6', edge:'#c8d2e4', rim:'#c8d2e4'},
  'scott-marine': {name:"Scott's Royal Marine", body:'#0c2b4b', body2:'#05162a', ink:'#f5c518', edge:'#020a14', stripes:['#f5c518','#2e8b3a','#d0201c']}
};
var DIE = {d4:4,d6:6,d8:8,d10:10,d12:12,d20:20};
var state = {theme:'tavern', mode:'full', enabled:true, projectorMode:'off', speed:1, onProjector:null, bigOnDevice:true};
var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
var renderer=null, root=null, current=null, texCache={};

/* ---------- geometry ---------- */
function d10Geo(){
  var a=0.1, c=Math.cos(Math.PI/5), h=a*(1+c)/(1-c), v=[], f=[], i;
  for(i=0;i<10;i++){var ang=i*Math.PI/5; v.push([Math.cos(ang),Math.sin(ang),i%2?-a:a]);}
  v.push([0,0,h]); v.push([0,0,-h]);
  for(i=0;i<5;i++){var e=2*i; f.push([10,e,(e+1)%10],[10,(e+1)%10,(e+2)%10]);
    f.push([11,(e+2)%10,(e+1)%10],[11,(e+3)%10,(e+2)%10]);}
  var pos=[]; f.forEach(function(t){t.forEach(function(k){pos.push(v[k][0],v[k][1],v[k][2]);});});
  var g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); return g;
}
function baseGeo(type){
  switch(type){
    case 'd4': return new T.TetrahedronGeometry(1,0);
    case 'd6': return new T.BoxGeometry(1.2,1.2,1.2).toNonIndexed();
    case 'd8': return new T.OctahedronGeometry(1,0);
    case 'd10': return d10Geo();
    case 'd12': return new T.DodecahedronGeometry(1,0);
    case 'd20': return new T.IcosahedronGeometry(1,0);
  }
}
/* merge coplanar triangles into faces; returns [{n, c, pts:[Vector3 ordered]}] */
function facesOf(geo){
  var p=geo.attributes.position, faces=[], i, j;
  for(i=0;i<p.count;i+=3){
    var A=new T.Vector3().fromBufferAttribute(p,i),B=new T.Vector3().fromBufferAttribute(p,i+1),C=new T.Vector3().fromBufferAttribute(p,i+2);
    var n=new T.Vector3().subVectors(B,A).cross(new T.Vector3().subVectors(C,A)).normalize();
    var f=null; for(j=0;j<faces.length;j++) if(faces[j].n.dot(n)>0.999 && Math.abs(faces[j].n.dot(A)-faces[j].d)<1e-3){f=faces[j];break;}
    if(!f){f={n:n,d:n.dot(A),pts:[]};faces.push(f);}
    [A,B,C].forEach(function(q){ if(!f.pts.some(function(r){return r.distanceTo(q)<1e-4;})) f.pts.push(q); });
  }
  faces.forEach(function(f){
    f.c=new T.Vector3(); f.pts.forEach(function(q){f.c.add(q);}); f.c.divideScalar(f.pts.length);
    var ref=new T.Vector3().subVectors(f.pts[0],f.c).normalize(), ref2=new T.Vector3().crossVectors(f.n,ref);
    f.pts.sort(function(a,b){var da=a.clone().sub(f.c),db=b.clone().sub(f.c);return Math.atan2(da.dot(ref2),da.dot(ref))-Math.atan2(db.dot(ref2),db.dot(ref));});
    // numeral "up": toward farthest vertex (apex of d10 kite / triangle point); for squares toward an edge
    var far=f.pts[0], md=0; f.pts.forEach(function(q){var d=q.distanceTo(f.c); if(d>md+1e-4){md=d;far=q;}});
    var up = f.pts.length===4 && Math.abs(f.pts[0].distanceTo(f.c)-f.pts[1].distanceTo(f.c))<1e-3
      ? f.pts[0].clone().add(f.pts[1]).multiplyScalar(.5).sub(f.c) : far.clone().sub(f.c);
    if(f.pts.length===4 && md>0 && f.pts.length && Math.abs(f.pts[0].distanceTo(f.c)-f.pts[1].distanceTo(f.c))>=1e-3){
      // d10 kite: put numeral in the wide part, up toward apex
    }
    f.up=up.sub(f.n.clone().multiplyScalar(up.dot(f.n))).normalize();
    f.right=new T.Vector3().crossVectors(f.up,f.n).normalize();
    f.R=md;
  });
  return faces;
}
function labelsFor(type, tens){
  var n=DIE[type], L=[];
  for(var i=0;i<n;i++){
    if(type==='d10') L.push(tens ? (i===9?'00':String((i+1)*10)) : (i===9?'0':String(i+1)));
    else L.push(String(i+1));
  }
  return L; // face i shows L[i]; value(i) = i+1 (d10 '0' = 10; tens '00' = 0)
}
function engrave(x,bx,s,px,py,fs,th,rot){ // inked, inset numeral on colour canvas x and bump canvas bx
  [x,bx].forEach(function(c){ c.save(); c.translate(px,py); if(rot) c.rotate(rot); c.font='bold '+fs+'px Georgia, "Times New Roman", serif'; c.textAlign='center'; c.textBaseline='middle'; });
  x.fillStyle='rgba(0,0,0,.55)'; x.fillText(s,-1.5,-1.5);            // inner shadow (top-left wall of the engraving)
  x.fillStyle='rgba(255,255,255,.18)'; x.fillText(s,1.2,1.2);         // catch-light on the lower wall
  x.fillStyle=th.ink; x.fillText(s,0,0);                               // ink fill
  if(s==='6'||s==='9'){ x.fillRect(-fs*.22,fs*.42,fs*.44,4); bx.fillStyle='#000'; bx.fillRect(-fs*.22,fs*.42,fs*.44,4); }
  bx.fillStyle='#000'; bx.fillText(s,0,0);
  [x,bx].forEach(function(c){ c.restore(); });
}
function faceBg(x,bx,cx,cy,cell,th){
  var g=x.createRadialGradient(cx+cell*.42,cy+cell*.4,4,cx+cell/2,cy+cell/2,cell*.72);
  g.addColorStop(0,th.body); g.addColorStop(.75,th.body2); g.addColorStop(1,'#000'); x.fillStyle=g; x.fillRect(cx,cy,cell,cell);   // faux AO toward the edges
  var b=bx.createRadialGradient(cx+cell/2,cy+cell/2,cell*.25,cx+cell/2,cy+cell/2,cell*.7); b.addColorStop(0,'#fff'); b.addColorStop(1,'#999'); bx.fillStyle=b; bx.fillRect(cx,cy,cell,cell); // soft bevel falloff
}
function atlas(type, tens, theme){
  var key=type+(tens?'t':'')+'|'+theme; if(texCache[key]) return texCache[key];
  var th=THEMES[theme], L=labelsFor(type,tens), n=L.length, cols=Math.ceil(Math.sqrt(n)), cell=128;
  var cv=document.createElement('canvas'); cv.width=cv.height=cols*cell; var x=cv.getContext('2d');
  var bc=document.createElement('canvas'); bc.width=bc.height=cols*cell; var bx=bc.getContext('2d');
  for(var i=0;i<n;i++){
    var cx=(i%cols)*cell, cy=Math.floor(i/cols)*cell; faceBg(x,bx,cx,cy,cell,th);
    if(th.stripes){ th.stripes.forEach(function(s,k){x.fillStyle=s; x.fillRect(cx+cell*.2,cy+cell*(.74+k*.045),cell*.6,cell*.035);}); }
    if(th.rim){ x.strokeStyle=th.rim; x.lineWidth=3; x.beginPath(); x.arc(cx+cell/2,cy+cell/2,cell*.36,0,7); x.stroke(); }
    var s=L[i], fs = type==='d4'||type==='d20'||type==='d8' ? (s.length>1?40:50) : (type==='d10'? (s.length>1?40:54) : (s.length>1?54:66));
    var ty = cy+cell/2 + (type==='d10'?-cell*.06:0) + (type==='d4'||type==='d8'||type==='d20'?cell*.06:0);
    engrave(x,bx,s,cx+cell/2,ty,fs,th,0);
  }
  var t=new T.CanvasTexture(cv); t.colorSpace=T.SRGBColorSpace; t.anisotropy=4;
  var bt=new T.CanvasTexture(bc);
  return texCache[key]={tex:t,bump:bt,cols:cols};
}
/* ---------- die model: unique verts + faces, used by both physics and render ---------- */
var modelCache={};
function dieModel(type){
  if(modelCache[type]) return modelCache[type];
  var g0=baseGeo(type), faces=facesOf(g0); g0.dispose();
  var verts=[], idx=function(q){ for(var i=0;i<verts.length;i++) if(verts[i].distanceTo(q)<1e-4) return i; verts.push(q.clone()); return verts.length-1; };
  faces.forEach(function(f){ f.vi=f.pts.map(idx); });
  return modelCache[type]={faces:faces, verts:verts};
}
function d4Atlas(theme, perm){ // d4: numbers at the corners; result = number at the top vertex
  var th=THEMES[theme], L=labelsFor('d4'), md=dieModel('d4'), cell=128, cols=2;
  var cv=document.createElement('canvas'); cv.width=cv.height=cols*cell; var x=cv.getContext('2d');
  var bc=document.createElement('canvas'); bc.width=bc.height=cols*cell; var bx=bc.getContext('2d');
  md.faces.forEach(function(f,i){
    var cx=(i%cols)*cell, cy=Math.floor(i/cols)*cell; faceBg(x,bx,cx,cy,cell,th);
    if(th.stripes) th.stripes.forEach(function(s,k){x.fillStyle=s; x.fillRect(cx+cell*.3,cy+cell*(.5+k*.04),cell*.4,cell*.03);});
    f.vi.forEach(function(vi){
      var d=md.verts[vi].clone().sub(f.c), lx=d.dot(f.right)/f.R, ly=d.dot(f.up)/f.R;
      engrave(x,bx,L[perm[vi]],cx+(0.5+lx*0.52/2)*cell,cy+(0.5-ly*0.52/2)*cell,30,th,Math.atan2(lx,ly));
    });
  });
  var t=new T.CanvasTexture(cv); t.colorSpace=T.SRGBColorSpace; var bt=new T.CanvasTexture(bc); return {tex:t,bump:bt,cols:cols,own:true};
}
/* perm: face index -> label index (d4: vertex index -> label index) */
function buildDie(type, tens, theme, R, perm){
  var md=dieModel(type), faces=md.faces, n=faces.length, s=R*DSCALE[type];
  if(!perm){ perm=[]; for(var i=0;i<(type==='d4'?4:n);i++) perm.push(i); }
  var at = type==='d4' ? d4Atlas(theme,perm) : atlas(type,tens,theme), cols=at.cols, pos=[], uv=[], nor=[];
  faces.forEach(function(f,i){
    var cell = type==='d4' ? i : perm[i];
    var cu=(cell%cols)/cols, cvv=1-(Math.floor(cell/cols)+1)/cols, cs=1/cols;
    function puv(q){var d=q.clone().sub(f.c); return [cu+(0.5+d.dot(f.right)/(2*f.R))*cs, cvv+(0.5+d.dot(f.up)/(2*f.R))*cs];}
    function vtx(q,nr){ pos.push(q.x*s,q.y*s,q.z*s); nor.push(nr.x,nr.y,nr.z); var u=puv(q); uv.push(u[0],u[1]); }
    var bev=function(q){ return f.n.clone().multiplyScalar(0.72).add(q.clone().normalize().multiplyScalar(0.28)).normalize(); }; // rounded-edge shading
    for(var k=0;k<f.pts.length;k++){ var A=f.pts[k], B=f.pts[(k+1)%f.pts.length]; vtx(f.c,f.n); vtx(A,bev(A)); vtx(B,bev(B)); }
  });
  var g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new T.Float32BufferAttribute(nor,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  var m=new T.MeshPhysicalMaterial({map:at.tex, bumpMap:at.bump, bumpScale:1.2, roughness:.38, metalness:THEMES[theme].rim?.25:0, clearcoat:.6, clearcoatRoughness:.22});
  var mesh=new T.Mesh(g,m); mesh.userData={type:type,tens:tens,perm:perm,ownTex:at.own?at.tex:null,ownBump:at.own?at.bump:null};
  return mesh;
}
function faceIndexFor(type, tens, value){ if(tens) return value===0?9:value/10-1; return value-1; }
var UP=new T.Vector3(0,1,0);
function topIndex(type, q){ // face index facing up (d4: vertex index pointing up); returns [index, flatness]
  var md=dieModel(type), best=-9, bi=0;
  if(type==='d4'){
    md.verts.forEach(function(v,i){var y=v.clone().normalize().applyQuaternion(q).y; if(y>best){best=y;bi=i;}});
    var down=-9; md.faces.forEach(function(f){var y=-f.n.clone().applyQuaternion(q).y; if(y>down)down=y;});
    return [bi,down];
  }
  md.faces.forEach(function(f,i){var y=f.n.clone().applyQuaternion(q).y; if(y>best){best=y;bi=i;}});
  return [bi,best];
}
function landedLabelQ(type,tens,perm,q){ return labelsFor(type,tens)[perm[topIndex(type,q)[0]]]; }
function disposeMesh(m){ if(!m) return; m.geometry.dispose(); m.material.dispose(); if(m.userData.ownTex) m.userData.ownTex.dispose(); if(m.userData.ownBump) m.userData.ownBump.dispose(); if(m.parent) m.parent.remove(m); }

/* ---------- physics planner (cannon-es) ---------- */
var C=window.CANNON, FPS=60, SPEEDK=1.0, TILT=0.05, DENS=0.18;
function arenaFor(W,H,compact){
  var cam=new T.PerspectiveCamera(32,W/H,.1,100); cam.position.set(0,16,6.2); cam.lookAt(0,0,0.4); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  var ray=new T.Raycaster(), plane=new T.Plane(UP,0);
  function hit(nx,ny){ ray.setFromCamera(new T.Vector2(nx,ny),cam); var p=new T.Vector3(); ray.ray.intersectPlane(plane,p); return p; }
  var yb=compact?-0.92:-0.40, top=hit(0,0.86), bl=hit(-0.94,yb), edge=hit(-0.96,-1);
  // portrait table: dice enter below the bottom edge (zEdge) and settle between zTop and zBot (above the result text)
  return {cam:cam, hw:Math.min(Math.abs(bl.x),Math.abs(edge.x)), zTop:top.z, zBot:bl.z, zEdge:edge.z, compact:compact};
}
var ZONES=['BL','BR','LS','RS','BC','TL','TR'], lastZone=null, forcedZone=null;
function pickZone(rng){
  var w={BL:3,BR:3,LS:2,RS:2,BC:2,TL:0.6,TR:0.6}, tot=0, k;
  for(k in w){ if(k===lastZone) w[k]=0; tot+=w[k]; }
  var r=rng()*tot; for(k in w){ r-=w[k]; if(r<=0) return k; } return 'BL';
}
function planRoll(units, arena, big, rng, forceZone){
  rng=rng||Math.random;
  var hw=arena.hw, zT=arena.zTop, zB=arena.zBot, zE=arena.zEdge, depth=zB-zT, n=units.length;
  var R=Math.min(Math.min(hw*2,depth)*(arena.compact?0.3:big?0.2:0.16), Math.sqrt(2*hw*depth*DENS/(n*4.2)));
  var g=R*120, best=null, zone=forceZone||forcedZone||pickZone(rng); forcedZone=null; lastZone=zone;
  var clusterR=R*1.25*Math.sqrt(n), nearZ=zE+R*2.4+clusterR*2;
  for(var attempt=0; attempt<16; attempt++){
    var world=new C.World({gravity:new C.Vec3(0,-g,-g*TILT), allowSleep:true}); // tiny invisible tilt toward the top keeps the result text area clear
    world.broadphase=new C.SAPBroadphase(world); world.solver.iterations=14;
    var mDie=new C.Material('die'), mFelt=new C.Material('felt'), mWall=new C.Material('wall');
    world.addContactMaterial(new C.ContactMaterial(mDie,mFelt,{friction:0.42,restitution:0.24}));  // felt: dull
    world.addContactMaterial(new C.ContactMaterial(mDie,mWall,{friction:0.08,restitution:0.62})); // rail: lively
    world.addContactMaterial(new C.ContactMaterial(mDie,mDie,{friction:0.12,restitution:0.45}));
    var walls=[];
    function wall(mat,pos,axis,ang){ var b=new C.Body({mass:0,material:mat}); b.addShape(new C.Plane()); b.position.set(pos[0],pos[1],pos[2]); b.quaternion.setFromAxisAngle(new C.Vec3(axis[0],axis[1],axis[2]),ang); world.addBody(b); if(mat===mWall) walls.push(b); return b; }
    wall(mFelt,[0,0,0],[1,0,0],-Math.PI/2);
    wall(mWall,[-hw,0,0],[0,1,0],Math.PI/2); wall(mWall,[hw,0,0],[0,1,0],-Math.PI/2);
    wall(mWall,[0,0,zT],[0,1,0],0); wall(mWall,[0,0,nearZ],[0,1,0],Math.PI); wall(mWall,[0,R*16,0],[1,0,0],Math.PI/2);
    // throw origin + aim for this zone (diagonal, so dice usually hit a side wall)
    var sgn=(zone==='BR'||zone==='RS'||zone==='TR')?1:(zone==='BC'?(rng()<.5?-1:1):-1), o, tgt;
    if(zone==='BL'||zone==='BR'){ o=[sgn*(hw-R*1.4-clusterR*0.6), zE+R*0.9+clusterR]; tgt=[-sgn*hw, zT+depth*(0.35+rng()*0.3)]; }
    else if(zone==='LS'||zone==='RS'){ o=[sgn*(hw-R*1.3-clusterR*0.7), zB-depth*(0.05+rng()*0.2)]; tgt=[-sgn*hw, zT+depth*(0.1+rng()*0.35)]; }
    else if(zone==='BC'){ o=[(rng()-.5)*hw*0.5, zE+R*0.9+clusterR]; tgt=[-sgn*hw, zT+depth*(0.2+rng()*0.4)]; }
    else { o=[sgn*(hw-R*1.4-clusterR*0.6), zT+R*1.4+clusterR*0.7]; tgt=[-sgn*hw, zT+depth*(0.55+rng()*0.3)]; }
    var dx=tgt[0]-o[0], dz=tgt[1]-o[1], dist=Math.sqrt(dx*dx+dz*dz), ang=Math.atan2(dz,dx)+(rng()-.5)*0.35;
    var v0=Math.sqrt(2*0.42*g*dist)*SPEEDK*(1.05+rng()*0.35)*(zone[0]==='T'?0.8:1);
    var spinAxis=new T.Vector3(rng()-.5,rng()-.5,rng()-.5).normalize();
    var spreadT=Math.min(16,Math.round(n*1.4));
    var placed=[], bodies=units.map(function(u,i){
      var md=dieModel(u.t), s=R*DSCALE[u.t];
      var shape=new C.ConvexPolyhedron({vertices:md.verts.map(function(v){return new C.Vec3(v.x*s,v.y*s,v.z*s);}), faces:md.faces.map(function(f){return f.vi.slice();})});
      var b=new C.Body({mass:({d4:.7,d6:1,d8:.9,d10:.95,d12:1.05,d20:1.1})[u.t],material:mDie,linearDamping:0.06,angularDamping:0.3,sleepSpeedLimit:R*0.5,sleepTimeLimit:0.18});
      b.addShape(shape);
      // loose handful around the origin (rejection sampled, no initial overlap)
      var px,pz,tries=0; do{ var a=rng()*6.283, r=clusterR*Math.sqrt(rng()); px=o[0]+Math.cos(a)*r; pz=o[1]+Math.sin(a)*r; tries++; }
        while(tries<40 && placed.some(function(p){return (p[0]-px)*(p[0]-px)+(p[1]-pz)*(p[1]-pz)<(R*2.2)*(R*2.2);}));
      px=Math.max(-hw+R*1.2,Math.min(hw-R*1.2,px)); pz=Math.max(zT+R*1.2,Math.min(nearZ-R*1.2,pz)); placed.push([px,pz]);
      b.position.set(px, R*(1.2+rng()*1.6)+(tries>=40?R*2.4*(i%3):0), pz);
      var a2=ang+(rng()-.5)*0.3, vv=v0*(0.85+rng()*0.3);
      b.velocity.set(Math.cos(a2)*vv, R*(1+rng()*5), Math.sin(a2)*vv);
      var ax=spinAxis.clone().add(new T.Vector3(rng()-.5,rng()-.5,rng()-.5).multiplyScalar(0.8)).normalize(), w=vv/R*(0.5+rng()*0.5);
      b.angularVelocity.set(ax.x*w,ax.y*w,ax.z*w);
      b.quaternion.setFromEuler(rng()*6.28,rng()*6.28,rng()*6.28);
      b._spawn=i===0?0:Math.floor(rng()*spreadT); b._i=i; return b;
    });
    var impacts=[], f=0;
    world.addEventListener('beginContact',function(e){ var wb=walls.indexOf(e.bodyA)>=0?e.bodyA:(walls.indexOf(e.bodyB)>=0?e.bodyB:null); if(!wb) return; var d=wb===e.bodyA?e.bodyB:e.bodyA;
      if(d && d._i!=null && d.velocity.length()>R*6) impacts.push({f:f, speed:d.velocity.length()/R, i:d._i, side:walls.indexOf(wb)<2}); });
    var frames=[];
    function rec(){ var fr=new Float32Array(bodies.length*7); bodies.forEach(function(b,i){ fr.set([b.position.x,b.position.y,b.position.z,b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w],i*7); }); frames.push(fr); }
    function still(){ return bodies.every(function(b){return b.world && (b.sleepState===C.Body.SLEEPING || (b.velocity.length()<R*0.25 && b.angularVelocity.length()<0.25));}); }
    function run(maxF, minF){ var s0=f; for(; f<maxF; f++){ bodies.forEach(function(b){ if(b._spawn===f) world.addBody(b); }); world.step(1/(FPS*2)); world.step(1/(FPS*2)); rec(); if(f-s0>minF && still()) { f++; return true; } } return false; }
    function check(){
      var last=frames[frames.length-1], res={ok:true, worst:1, minGap:9, bad:{}, why:[], tops:[]};
      units.forEach(function(u,i){ var q=new T.Quaternion(last[i*7+3],last[i*7+4],last[i*7+5],last[i*7+6]); var ti=topIndex(u.t,q); res.tops.push(ti[0]);
        if(ti[1]<0.985){res.worst=Math.min(res.worst,ti[1]); res.bad[i]=1;}
        var x=last[i*7], z=last[i*7+2]; if(Math.abs(x)>hw-R*0.5||z<zT+R*0.5||z>zB-R*0.5){res.ok=false; res.why.push('bounds'); res.bounds=true;} });
      for(var i=0;i<n;i++)for(var j=i+1;j<n;j++){ var ddx=last[i*7]-last[j*7], ddz=last[i*7+2]-last[j*7+2], gp=Math.sqrt(ddx*ddx+ddz*ddz)/R; res.minGap=Math.min(res.minGap,gp); if(gp<1.2){res.bad[i]=1;res.bad[j]=1;} }
      if(n<3){ for(var c=0;c<n;c++){ if(Math.abs(last[c*7])>hw*0.72 || last[c*7+2]>zB-depth*0.12){res.ok=false;res.why.push('edge');res.bounds=true;} } }
      if(Object.keys(res.bad).length){res.ok=false; res.why.push('cocked/gap');}
      return res;
    }
    var settled=run(FPS*2.6, FPS*0.6), chk=check(), nudges=0;
    // gentle settle nudge: tap cocked/touching dice (like a table bump) instead of re-throwing
    while(!chk.ok && !chk.bounds && nudges<2){
      nudges++; Object.keys(chk.bad).forEach(function(k){ var b=bodies[k]; b.wakeUp();
        b.velocity.set((rng()-.5)*R*6, R*(4+rng()*3), (rng()-.5)*R*6); b.angularVelocity.set((rng()-.5)*8,(rng()-.5)*8,(rng()-.5)*8); });
      settled=run(f+FPS*0.7, 8); chk=check();
    }
    var why=chk.why.slice(); if(!settled){chk.ok=false; why.push('unsettled');}
    var W_=(HearthDice._why=HearthDice._why||[]); W_.push(why.join(",")); if(W_.length>80) W_.shift();
    var plan={zone:zone, nudges:nudges, impacts:impacts, sideHits:impacts.filter(function(m){return m.side;}).length, spawns:bodies.map(function(b){return b._spawn}), frames:frames, R:R, tops:chk.tops, ok:chk.ok, attempts:attempt+1, settle:frames.length/FPS, minGap:chk.minGap};
    world.bodies.slice().forEach(function(b){world.removeBody(b);});
    if(plan.ok) return plan;
    var score=(chk.bounds?0:1)+chk.minGap*Math.max(0,chk.worst)*0.1; if(!best || score>best.score){best=plan; best.score=score;}
  }
  return best;
}
function unitsOf(list){ var u=[]; list.forEach(function(d,i){ if(d.type==='d100'){u.push({d:i,t:'d10',tens:true,v:Math.floor((d.value%100)/10)*10});u.push({d:i,t:'d10',tens:false,v:(d.value%10)||10});} else u.push({d:i,t:d.type,tens:false,v:d.value}); }); return u; }
function permFor(u, top){ var n=u.t==='d4'?4:DIE[u.t], p=[]; for(var i=0;i<n;i++) p.push(i); var tg=faceIndexFor(u.t,u.tens,u.v); var a=p[top]; p[top]=p[tg]; p[tg]=a; return p; }
var shadowTex=null;
function getShadowTex(){ if(shadowTex) return shadowTex; var c=document.createElement('canvas'); c.width=c.height=64; var x=c.getContext('2d'); var g=x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(0,0,0,.9)'); g.addColorStop(.3,'rgba(0,0,0,.55)'); g.addColorStop(.6,'rgba(0,0,0,.18)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,64,64); return shadowTex=new T.CanvasTexture(c); }
function tableTex(theme){ var th=THEMES[theme], c=document.createElement('canvas'); c.width=c.height=256; var x=c.getContext('2d');
  x.fillStyle=th.body2; x.fillRect(0,0,256,256); x.globalAlpha=.06; for(var i=0;i<1400;i++){x.fillStyle=Math.random()<.5?'#000':'#fff'; x.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1);} x.globalAlpha=1;
  var g=x.createRadialGradient(128,128,40,128,128,180); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.55)'); x.fillStyle=g; x.fillRect(0,0,256,256);
  var t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t; }

/* ---------- DOM ---------- */
if(typeof document!=='undefined'){ var css=document.createElement('style');
css.textContent='@keyframes hdin{from{opacity:0}to{opacity:1}}.hd-ov{animation:hdin .25s;position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;background:rgba(0,0,0,0);transition:background .25s,opacity .35s;font-family:Georgia,serif;-webkit-tap-highlight-color:transparent}'+
'.hd-ov.compact{inset:auto 12px calc(12px + env(safe-area-inset-bottom)) auto;width:150px;height:170px;border-radius:16px;background:rgba(10,8,6,.55)!important;box-shadow:0 6px 24px rgba(0,0,0,.5)}'+
'.hd-ov canvas{position:absolute;inset:0}.hd-ov.compact{height:auto;min-height:150px;justify-content:flex-start}.hd-ov.compact canvas{position:relative}.hd-txt{position:absolute;left:0;right:0;bottom:calc(9vh + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;padding:0 14px;text-align:center;pointer-events:none}.hd-txt button{pointer-events:auto}.hd-ov.compact .hd-txt{position:relative;bottom:auto;padding:0 6px 8px}.hd-bd{color:#f1e4c8;font:600 min(3.6vmin,17px)/1.35 system-ui,sans-serif;margin-top:6px;text-shadow:0 1px 3px #000;max-width:900px;opacity:0;transition:opacity .4s}.hd-txt.on .hd-bd{opacity:.95}.hd-ov.compact .hd-bd{font-size:10px;margin-top:2px}.hd-vals{position:absolute;inset:0;pointer-events:none}.hd-chip{position:absolute;transform:translate(-50%,-50%);background:rgba(10,8,6,.8);color:#fff;font:700 12px system-ui;padding:1px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.3)}.hd-ov.compact .hd-chip{font-size:9px;padding:0 3px}'+
'.hd-num{font-size:min(18vmin,120px);font-weight:bold;color:#fff;text-shadow:0 0 18px rgba(0,0,0,.9),0 2px 0 #000;opacity:0;transform:scale(.6);transition:opacity .25s,transform .35s cubic-bezier(.2,1.6,.4,1);line-height:1}'+
'.hd-ov.compact .hd-num{font-size:28px}.hd-num.on{opacity:1;transform:scale(1)}.hd-lbl{color:#eee;font-size:min(4vmin,22px);opacity:.85;margin-top:4px;text-shadow:0 1px 3px #000}.hd-ov.compact .hd-lbl{display:none}'+
'.hd-flash{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .6s}.hd-n20 .hd-flash{background:radial-gradient(circle,rgba(255,215,90,.85),rgba(255,170,0,.25) 45%,transparent 75%)}'+
'.hd-n1 .hd-flash{background:radial-gradient(circle,rgba(200,10,10,.55),rgba(80,0,0,.5) 60%,rgba(20,0,0,.6))}.hd-n20 .hd-num{color:#ffd55a;text-shadow:0 0 30px #ffb000,0 0 60px #ff9000,0 2px 0 #000}.hd-n1 .hd-num{color:#ff4a3a;text-shadow:0 0 24px #900,0 2px 0 #000}'+
'.hd-crack{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity .15s}.hd-shake{animation:hdshake .45s}@keyframes hdshake{20%{transform:translate(-10px,6px)}40%{transform:translate(9px,-7px)}60%{transform:translate(-6px,-4px)}80%{transform:translate(4px,5px)}}'+
'.hd-proj{margin-top:14px;padding:10px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.5);background:rgba(20,16,10,.8);color:#fff;font:600 15px system-ui,sans-serif;opacity:0;transition:opacity .3s}.hd-proj.on{opacity:1}.hd-ov.compact .hd-proj{font-size:11px;padding:5px 8px;margin-top:6px}'+
'.hd-toast{position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:99999;background:rgba(10,8,6,.85);color:#fff;font:bold 44px Georgia,serif;padding:10px 26px;border-radius:14px;transition:opacity .3s}';
document.head.appendChild(css); }

function ensureRenderer(){
  if(renderer) return;
  renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); renderer.outputColorSpace=T.SRGBColorSpace;
  root={scene:new T.Scene(), cam:new T.PerspectiveCamera(32,1,.1,50)};
  root.cam.position.set(0,0,7.5);
  root.scene.add(new T.HemisphereLight(0xbfd0ff,0x2a1a0e,0.55));            // cool room fill
  var lamp=new T.SpotLight(0xffd9a0,2.8,0,0.95,0.65,0); lamp.position.set(-3.5,15,-5); lamp.target.position.set(0.5,0,1); root.scene.add(lamp); root.scene.add(lamp.target); // warm tabletop lamp, upper-left
  var d=new T.DirectionalLight(0xfff0dd,0.7); d.position.set(3,6,8); root.scene.add(d); // soft front fill so numerals stay readable
  root.key=new T.PointLight(0xffd070,0,12); root.key.position.set(0,6,2); root.scene.add(root.key);
}

function crackSVG(){
  return '<svg class="hd-crack" viewBox="0 0 100 100" preserveAspectRatio="none"><g stroke="#ffdddd" stroke-width=".45" fill="none" opacity=".9">'+
  '<path d="M50 50 L38 36 L33 22 L22 12 L18 0"/><path d="M50 50 L64 42 L78 44 L90 33 L100 30"/><path d="M50 50 L46 66 L54 78 L50 92 L54 100"/><path d="M50 50 L33 58 L20 56 L8 66 L0 64"/><path d="M38 36 L28 40"/><path d="M78 44 L82 56"/><path d="M54 78 L64 84"/></g></svg>';
}

function fireProjector(info){
  var msg={type:'hearth-dice-projector', roll:info};
  try{ if(state.onProjector) state.onProjector(info); }catch(e){ console.error(e); }
  try{ window.postMessage(msg,'*'); }catch(e){}
  try{ new BroadcastChannel('hearth-dice').postMessage(msg); }catch(e){}
  HearthDice._projected.push(info);
}

function parseDice(s){ s=String(s||'d20').toLowerCase(); if(s==='d100'||s==='d%') return 'd100'; if(DIE[s]) return s; throw new Error('HearthDice: unknown dice '+s); }

var DSCALE={d4:1.25,d6:1,d8:1.05,d10:1,d12:1.05,d20:1.05};
function normPool(opts){
  // returns [{type, value}] in throw order
  var list=[];
  if(Array.isArray(opts.dice)){
    opts.dice.forEach(function(g){ if(typeof g==='string') g={type:g,count:1}; var t=parseDice(g.type||g.dice); for(var i=0;i<(g.count||1);i++) list.push({type:t,group:g.label||null}); });
  } else list.push({type:parseDice(opts.dice)});
  var res = opts.results || (opts.result!=null?[opts.result]:[]);
  list.forEach(function(d,i){ var max=d.type==='d100'?100:DIE[d.type];
    var v=res[i]==null?1+Math.floor(Math.random()*max):(res[i]|0);
    if(v<1||v>max) throw new Error('HearthDice: result '+v+' out of range for '+d.type); d.value=v; });
  return list;
}
function groupsOf(list){ var g=[],m={}; list.forEach(function(d){var k=d.type+(d.group?'|'+d.group:''); if(!m[k]){m[k]={type:d.type,label:d.group,vals:[]};g.push(m[k]);} m[k].vals.push(d.value);}); return g; }
function breakdown(list){ return groupsOf(list).map(function(g){var s=g.vals.reduce(function(a,b){return a+b},0); return g.vals.length+g.type+(g.label?' '+g.label:'')+': '+(g.vals.length>1?g.vals.join('+')+' = ':'')+s;}).join('   ·   '); }

function roll(opts){
  opts=opts||{}; var list;
  try{ list=normPool(opts); }catch(e){ return Promise.reject(e); }
  var single=list.length===1, type=single?list[0].type:'pool', arr=Array.isArray(opts.dice);
  var total=list.reduce(function(a,d){return a+d.value},0), result=single?list[0].value:total;
  var crit = opts.crit || (single&&type==='d20' ? (result===20?'nat20':result===1?'nat1':null) : null);
  var big = opts.big!=null ? !!opts.big : !!(crit || opts.deathSave || opts.boss);
  var mode = opts.mode || (big && state.bigOnDevice ? 'full' : state.mode);
  var info={dice:single&&!arr?type:opts.dice,result:result,total:total,values:list.map(function(d){return d.value}),breakdown:breakdown(list),crit:crit,big:big,label:opts.label||'',deathSave:!!opts.deathSave,boss:!!opts.boss,ts:Date.now()};
  // projector: only ever on user choice
  var proj = opts.projector===true || (opts.projector!==false && state.projectorMode==='important' && big);
  var offerBtn = !proj && opts.projector!==false && (state.projectorMode==='ask' || (state.projectorMode==='important' && !big));
  var shown = opts.total!=null ? opts.total : total, bdText = opts.breakdown || info.breakdown;
  if(current) current.finish(true);
  var anim = state.enabled ? (reduced&&reduced.matches || opts.reducedMotion ? 'reduced' : 'full') : 'off';
  if(proj) fireProjector(info);
  return new Promise(function(resolve){
    var done=false, sp=state.speed*(opts.speed||1);
    var resolveOut=function(extra){ if(done) return; done=true; current=null; resolve(Object.assign(info,extra||{})); };
    var labelsFromValues=list.map(function(d){ return d.type==='d100'?[d.value===100||d.value<10?'00':String(Math.floor((d.value%100)/10)*10),String(d.value%10)]:[d.type==='d10'&&d.value===10?'0':String(d.value)]; });
    if(anim==='off'){
      var t=document.createElement('div'); t.className='hd-toast'; t.textContent=(info.label?info.label+': ':'')+shown; if(!single||opts.breakdown){ var tb=document.createElement('div'); tb.style.cssText='font:14px system-ui;opacity:.85;margin-top:4px'; tb.textContent=bdText; t.appendChild(tb); } document.body.appendChild(t);
      var fin=function(){t.remove();resolveOut({landed:arr?labelsFromValues:labelsFromValues[0],projected:proj});};
      var tm=setTimeout(function(){t.style.opacity=0;setTimeout(fin,300/sp);},(single?1400:2600)/sp);
      current={finish:function(){clearTimeout(tm);fin();}};
      return;
    }
    ensureRenderer();
    var compact=mode==='compact';
    var ov=document.createElement('div'); ov.className='hd-ov'+(compact?' compact':'')+(big&&!compact?' big':'')+(crit==='nat20'?' hd-n20':crit==='nat1'?' hd-n1':'');
    var fl=document.createElement('div'); fl.className='hd-flash'; ov.appendChild(fl);
    if(crit==='nat1'&&!compact) ov.insertAdjacentHTML('beforeend',crackSVG());
    var cv=renderer.domElement; ov.appendChild(cv);
    var vals=document.createElement('div'); vals.className='hd-vals'; ov.appendChild(vals);
    var txt=document.createElement('div'); txt.className='hd-txt'; ov.appendChild(txt);
    var num=document.createElement('div'); num.className='hd-num'; num.textContent=shown; txt.appendChild(num);
    var lbl=document.createElement('div'); lbl.className='hd-lbl'; lbl.textContent=(info.label||'')+(crit==='nat20'?'  Natural 20!':crit==='nat1'?'  Natural 1':''); txt.appendChild(lbl);
    if(!single||opts.breakdown){ var bd=document.createElement('div'); bd.className='hd-bd'; bd.textContent=bdText; txt.appendChild(bd); }
    var btn=null;
    if(offerBtn){ btn=document.createElement('button'); btn.className='hd-proj'; btn.textContent='Show on big screen'; txt.appendChild(btn);
      btn.addEventListener('click',function(e){e.stopPropagation(); if(!info.projected){fireProjector(info); info.projected=true; btn.textContent='Sent to big screen ✓'; hold+=1500/sp;}}); }
    document.body.appendChild(ov);
    var W=compact?150:innerWidth, Hc=compact?120:innerHeight;
    renderer.setSize(W,Hc,false); cv.style.width=W+'px'; cv.style.height=Hc+'px';
    if(!compact) ov.style.background='rgba(0,0,0,'+(big?0.55:0.3)+')';
    // plan with physics, then remap faces so the resting face = result
    var arena=arenaFor(W,Hc,compact), cam=arena.cam, units=unitsOf(list);
    var early=false, cancelled=false, meshesReady=false, hold=0;
    ov.addEventListener('click',function(){ if(!meshesReady) early=true; });
    current={ov:ov, finish:function(){ if(meshesReady) return; cancelled=true; if(cv.parentNode) cv.parentNode.removeChild(cv); ov.remove(); resolveOut({landed:arr?labelsFromValues:labelsFromValues[0],projected:!!(proj||info.projected),physics:{ok:false,cancelled:true}}); }};
    planAsync(units, W, Hc, compact, big && !compact).then(function(plan){
    if(cancelled) return; meshesReady=true;
    var R=plan.R, frames=plan.frames, NF=frames.length;
    var tab=new T.Mesh(new T.PlaneGeometry(arena.hw*6,(arena.zEdge-arena.zTop)*3), new T.MeshBasicMaterial({map:tableTex(state.theme),transparent:true,opacity:compact?0.9:0.6}));
    tab.rotation.x=-Math.PI/2; tab.position.set(0,-0.001,(arena.zTop+arena.zEdge)/2); root.scene.add(tab);
    var meshes=units.map(function(u,i){
      var m=buildDie(u.t,u.tens,state.theme,R,permFor(u,plan.tops[i])); m.userData.unit=u;
      var sh=new T.Mesh(new T.PlaneGeometry(R*2.4,R*2.4),new T.MeshBasicMaterial({map:getShadowTex(),transparent:true,depthWrite:false}));
      sh.rotation.x=-Math.PI/2; sh.position.y=0.002; m.userData.shadow=sh; root.scene.add(sh);
      root.scene.add(m); return m;
    });
    hold=(single?(big?1900:1400):2300)/sp; var t0=performance.now(), landed=false, raf, faded=false, t0land=0, warm=false, fiPrev=0, fiPrevS=-1, shakeAt=-1e9, shakeAmp=0, camBase=cam.position.clone(), qa=new T.Quaternion(), qb=new T.Quaternion();
    function place(obj,i,fi){ // interpolated pose of die i at fractional frame fi
      fi=Math.max(0,fi); var a=Math.min(NF-1,Math.floor(fi)), b=Math.min(NF-1,a+1), k=fi-a; if(a>=NF-1) k=0;
      var A=frames[a], B=frames[b], o=i*7;
      obj.position.set(A[o]+(B[o]-A[o])*k, A[o+1]+(B[o+1]-A[o+1])*k, A[o+2]+(B[o+2]-A[o+2])*k);
      qa.set(A[o+3],A[o+4],A[o+5],A[o+6]); qb.set(B[o+3],B[o+4],B[o+5],B[o+6]); obj.quaternion.copy(qa).slerp(qb,k);
    }
    function pose(fi){
      meshes.forEach(function(m,i){
        place(m,i,fi);
        var sh=m.userData.shadow, h=Math.max(0,m.position.y-R); sh.position.x=m.position.x+R*0.18+h*0.35; sh.position.z=m.position.z+R*0.22+h*0.45; // AO contact shadow, cast away from the lamp
        sh.material.opacity=Math.max(0.05,0.8-h/(R*5)); sh.scale.setScalar(1+h/(R*4));
        m.visible = fi>=plan.spawns[i]; sh.visible=m.visible;
      });
    }
    function frame(now){
      if(!warm){ warm=true; pose(0); renderer.render(root.scene,cam); t0=early?-1e9:performance.now(); raf=requestAnimationFrame(frame); return; } // compile shaders before the clock starts
      var fi = anim==="reduced" ? NF-1 : Math.max(0,Math.min(NF-1,(now-t0)/1000*FPS*sp));
      if(anim!=="reduced" && t0>-1e8){ fi=Math.min(fi, fiPrev+2*sp); t0=Math.max(t0, now-fi/(FPS*sp)*1000); } fiPrev=fi; // never skip more than 2 sim frames per drawn frame
      pose(fi);
      root.key.intensity = crit==='nat20' && fi>=NF-1 ? 30 : 0;
      if(big && anim==='full'){ plan.impacts.forEach(function(im){ if(im.f>fiPrevS && im.f<=fi && im.speed>14){ shakeAt=now; shakeAmp=Math.min(1,im.speed/40)*R*0.09; } }); }
      fiPrevS=fi;
      var sk=Math.max(0,1-(now-shakeAt)/160); cam.position.set(camBase.x+(Math.random()-.5)*shakeAmp*sk*2, camBase.y, camBase.z+(Math.random()-.5)*shakeAmp*sk*2);
      renderer.render(root.scene,cam);
      if(fi>=NF-1 && !landed){
        landed=true; num.classList.add('on'); txt.classList.add('on'); if(btn) btn.classList.add('on');
        if(!single) showVals();
        if(crit && !compact){ fl.style.opacity=1; setTimeout(function(){fl.style.opacity=crit==='nat1'?.6:0;},500/sp);
          var ck=ov.querySelector('.hd-crack'); if(ck) ck.style.opacity=1;
          if(anim==='full'&&big){ov.classList.add('hd-shake');} }
        if(anim==='reduced'){ ov.style.opacity=0; ov.style.transition='opacity .3s'; requestAnimationFrame(function(){ov.style.opacity=1;}); }
        t0land=now;
      }
      if(landed && now-t0land>hold && !faded){ faded=true; ov.style.opacity=0; setTimeout(function(){finish();},350/sp); return; }
      raf=requestAnimationFrame(frame);
    }
    function showVals(){
      var seen={}; meshes.forEach(function(m){ var u=m.userData.unit; if(seen[u.d]) return; seen[u.d]=1;
        var p=m.position.clone(); p.z+=R*1.5; p.y=0; p.project(cam);
        var ch=document.createElement('span'); ch.className='hd-chip'; ch.textContent=list[u.d].value;
        ch.style.left=((p.x+1)/2*W)+'px'; ch.style.top=((1-p.y)/2*Hc)+'px'; vals.appendChild(ch); }); }
    function finish(){
      cancelAnimationFrame(raf); pose(NF-1);
      var lab=[], k=0; list.forEach(function(d){ var n=d.type==='d100'?2:1, l=[]; for(var j=0;j<n;j++,k++){var m=meshes[k];l.push(landedLabelQ(m.userData.type,m.userData.tens,m.userData.perm,m.quaternion));} lab.push(l); });
      var stats={landed:arr?lab:lab[0], projected:!!(proj||info.projected), physics:{ok:plan.ok,attempts:plan.attempts,settleSec:+plan.settle.toFixed(2),minGapR:+plan.minGap.toFixed(2)}, dieCount:meshes.length};
      meshes.forEach(function(m){ var sh=m.userData.shadow; sh.geometry.dispose(); sh.material.dispose(); root.scene.remove(sh); disposeMesh(m); });
      tab.geometry.dispose(); tab.material.map.dispose(); tab.material.dispose(); root.scene.remove(tab);
      if(cv.parentNode) cv.parentNode.removeChild(cv); ov.remove();
      resolveOut(stats);
    }
    ov.addEventListener('click',function(){ if(!landed){ t0=-1e9; } else finish(); });
    current={finish:finish, ov:ov, meshes:meshes};
    raf=requestAnimationFrame(frame);
    }).catch(function(e){ console.error('HearthDice plan failed', e); if(!cancelled){ cancelled=true; if(cv.parentNode) cv.parentNode.removeChild(cv); ov.remove(); resolveOut({landed:arr?labelsFromValues:labelsFromValues[0],projected:!!proj,physics:{ok:false,error:String(e)}}); } });
  });
}

/* ---------- v0.6 (Hearth 1.6.0): pre-simulate pools in a Web Worker ---------- */
var worker=null, workerBad=false, wseq=0, wwait={}, WORKER_MIN=3;
function getWorker(){
  if(worker||workerBad||typeof Worker==='undefined'||!window.HearthDice||!HearthDice.workerUrl) return worker;
  try{
    worker=new Worker(HearthDice.workerUrl);
    worker.onmessage=function(e){ var m=e.data, w=wwait[m.id]; if(!w) return; delete wwait[m.id]; clearTimeout(w.t);
      if(m.error){ w.fallback(); return; }
      var buf=new Float32Array(m.buf), fr=[]; for(var i=0;i<m.nf;i++) fr.push(buf.subarray(i*m.stride,(i+1)*m.stride));
      m.plan.frames=fr; HearthDice._lastPlanVia='worker'; w.res(m.plan); };
    worker.onerror=function(){ workerBad=true; worker=null; Object.keys(wwait).forEach(function(k){ var w=wwait[k]; delete wwait[k]; clearTimeout(w.t); w.fallback(); }); };
  }catch(e){ workerBad=true; worker=null; }
  return worker;
}
function planAsync(units,W,H,compact,big){
  var zone=forcedZone||pickZone(Math.random); forcedZone=null; lastZone=zone;
  var syncPlan=function(){ HearthDice._lastPlanVia='sync'; return planRoll(units, arenaFor(W,H,compact), big, null, zone); };
  var w=(units.length>=WORKER_MIN && HearthDice.useWorker!==false)?getWorker():null;
  if(!w) return new Promise(function(res){ res(syncPlan()); });
  return new Promise(function(res){ var id=++wseq, fb=function(){ res(syncPlan()); };
    wwait[id]={res:res, fallback:fb, t:setTimeout(function(){ if(wwait[id]){ delete wwait[id]; fb(); } },6000)};
    w.postMessage({id:id, units:units, W:W, H:H, compact:compact, big:big, zone:zone}); });
}

function clearTex(){ Object.keys(texCache).forEach(function(k){texCache[k].tex.dispose(); if(texCache[k].bump) texCache[k].bump.dispose();}); texCache={}; }
window.HearthDice = {
  version:'0.6.0-app', workerUrl:null, useWorker:true, _lastPlanVia:null,
  _planRaw:function(o){ return planRoll(o.units, arenaFor(o.W,o.H,o.compact), !!o.big, null, o.zone); }, themes:THEMES, _projected:[],
  roll:roll,
  setTheme:function(id){ if(!THEMES[id]) throw new Error('unknown theme '+id); if(id!==state.theme){clearTex(); state.theme=id;} },
  setMode:function(m){ if(m!=='full'&&m!=='compact') throw new Error('mode must be full|compact'); state.mode=m; },
  setEnabled:function(b){ state.enabled=!!b; },
  setSpeed:function(s){ state.speed=s>0?s:1; },
  setBigOnDevice:function(b){ state.bigOnDevice=!!b; },
  setProjectorMode:function(m){ if(['off','ask','important'].indexOf(m)<0) throw new Error('projector mode off|ask|important'); state.projectorMode=m; },
  onProjector:function(cb){ state.onProjector=cb; },
  getState:function(){ return Object.assign({},state,{onProjector:!!state.onProjector,reducedMotion:!!(reduced&&reduced.matches)}); },
  skip:function(){ if(current) current.finish(); },
  dispose:function(){ if(current) current.finish(); clearTex(); if(renderer){renderer.dispose(); renderer.forceContextLoss(); renderer=null; root=null;} },
  _forceZone:function(z){ if(ZONES.indexOf(z)<0) throw new Error('zone '+ZONES.join('|')); forcedZone=z; },
  _setThrow:function(k,t,d){ SPEEDK=k; if(t!=null) TILT=t; if(d!=null) DENS=d; },
  // test helper: run the physics planner + face remap without rendering; returns landed labels per die
  _plan:function(o){ var list=normPool(o), units=unitsOf(list), ar=arenaFor(o.w||412,o.h||860,o.mode==='compact'), pl=planRoll(units,ar,!!o.big);
    var lab=units.map(function(u,i){ var f=pl.frames[pl.frames.length-1], q=new THREE.Quaternion(f[i*7+3],f[i*7+4],f[i*7+5],f[i*7+6]); return landedLabelQ(u.t,u.tens,permFor(u,pl.tops[i]),q); });
    return {zone:pl.zone, sideHits:pl.sideHits, nudges:pl.nudges, values:list.map(function(d){return d.value}), types:list.map(function(d){return d.type}), labels:lab, ok:pl.ok, attempts:pl.attempts, settle:pl.settle, minGap:pl.minGap}; }
};
})();
