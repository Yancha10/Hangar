import * as THREE from 'three';

export const defaults = {
  width:18,depth:24,eave:4,ridge:5,wall:.22,slab:.14,
  entranceWidth:5.36,entranceHeight:3.70,entranceCenter:.4944,
  frontWindowWidth:1.4,frontWindowHeight:.58,frontWindowSill:3.13,
  blockWidth:5.6,blockStart:1.45,blockEnd:5.65,blockHeight:3.05,
  smallWidth:3.45,smallHeight:2.65,
  mainDoorWidth:.95,mainDoorHeight:2.12,
  internalWall:.15,
};

export const descriptions = {
  front:{title:'Façade d’entrée',status:'Forme observée · ouvertures estimées',text:'Pignon à deux rampants avec une entrée centrale et deux ouvertures hautes. Les proportions des ouvertures sont déduites de la photographie de façade ; leurs dimensions restent à relever.',photo:0},
  rear:{title:'Pignon arrière',status:'Forme observée',text:'Pignon arrière à deux rampants avec des raidisseurs verticaux visibles. Aucune ouverture n’apparaît sur les photographies disponibles.',photo:4},
  left:{title:'Mur latéral contigu aux locaux',status:'Mur observé · épaisseur estimée',text:'Mur longitudinal contigu aux locaux intérieurs. Les photographies ne permettent pas de confirmer tous les raccords ni l’épaisseur réelle.',photo:5},
  right:{title:'Mur latéral avec ouvertures hautes',status:'Ouvertures observées · position estimée',text:'Les deux ouvertures hautes visibles sont reproduites. Leur position le long du mur est estimée en perspective, sans chaîne de cotes relevée sur place.',photo:1},
  block:{title:'Local principal',status:'Volume observé · dimensions estimées',text:'Volume le plus haut et le plus saillant : accès et petite ouverture sur le côté donnant sur le plateau, ouverture plus grande sur la face tournée vers le fond. Le retrait du petit local est conservé. Intérieur non documenté.',photo:3},
  small:{title:'Petit local en retrait',status:'Volume observé · dimensions estimées',text:'Volume moins haut, placé près de la façade et en retrait du local principal. L’accès visible entre les deux volumes est reproduit. Usage et intérieur non documentés.',photo:2},
  slab:{title:'Dallage existant',status:'Surface observée · épaisseur indicative',text:'Dallage continu visible. L’emprise est fixée à 24 × 18 m en considérant les dimensions comme extérieures. L’épaisseur du dallage est une hypothèse de représentation.',photo:6},
  columns:{title:'Raidisseurs périphériques',status:'Éléments observés · section estimée',text:'Bandes verticales en béton visibles sur les murs. Leur géométrie est distinguée ; leur section, leur espacement exact et leur rôle structurel ne sont pas vérifiés.',photo:4},
};

export function createBuilding(input={}) {
 const p={...defaults,...input};
 const root=new THREE.Group();root.name='Bâtiment existant';root.position.set(-p.width/2,0,p.depth/2);
 const groups={};for(const key of Object.keys(descriptions)){groups[key]=new THREE.Group();groups[key].name=descriptions[key].title;groups[key].userData={component:key};root.add(groups[key]);}
 const mats={
  plaster:new THREE.MeshStandardMaterial({color:0xb2a58d,roughness:.96,metalness:0}),
  raw:new THREE.MeshStandardMaterial({color:0xa49780,roughness:1,metalness:0}),
  concrete:new THREE.MeshStandardMaterial({color:0xa59d8c,roughness:1,metalness:0}),
  floor:new THREE.MeshStandardMaterial({color:0xe3e1d4,roughness:.99,metalness:0}),
 };
 function addMesh(g,geo,mat,name,unseen=false){const m=new THREE.Mesh(geo,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;m.userData={component:g,unseen};groups[g].add(m);return m;}
 function box(g,x0,x1,z0,z1,y0,y1,mat,name,unseen=false){const m=addMesh(g,new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0,Math.max(1,Math.ceil((x1-x0)/1.0)),Math.max(1,Math.ceil((y1-y0)/1.0)),Math.max(1,Math.ceil((z1-z0)/1.0))),mat,name,unseen);m.position.set((x0+x1)/2,(y0+y1)/2,-(z0+z1)/2);return m;}
 // Each planar wall is split around real openings, leaving physically open voids.
 function wall(g,axis,fixed,a0,a1,h,t,holes=[],mat=mats.plaster,name='Mur',unseen=false){
  let cuts=[a0,a1];for(const q of holes)cuts.push(Math.max(a0,q[0]),Math.min(a1,q[1]));cuts=[...new Set(cuts)].sort((a,b)=>a-b);
  for(let i=0;i<cuts.length-1;i++){const l=cuts[i],r=cuts[i+1];if(r-l<.001)continue;let bands=[[0,h]];for(const q of holes){if((l+r)/2>q[0]&&(l+r)/2<q[1]){bands=bands.flatMap(([b,u])=>[[b,Math.min(u,q[2])],[Math.max(b,q[3]),u]]).filter(([b,u])=>u-b>.001);}}
   for(const [b,u]of bands){if(axis==='x')box(g,l,r,fixed,fixed+t,b,u,mat,name,unseen);else box(g,fixed,fixed+t,l,r,b,u,mat,name,unseen);}
  }
 }
 function gable(g,z,mat){const shape=new THREE.Shape();shape.moveTo(0,p.eave);shape.lineTo(p.width,p.eave);shape.lineTo(p.width/2,p.ridge);shape.closePath();const geom=new THREE.ExtrudeGeometry(shape,{depth:p.wall,bevelEnabled:false,steps:1});const m=addMesh(g,geom,mat,'Couronnement à deux rampants');m.position.z=-z-p.wall;return m;}
 const ec=p.width*p.entranceCenter, ew=p.entranceWidth;
 const frontHoles=[[ec-ew/2,ec+ew/2,0,p.entranceHeight],...[.201,.774].map(f=>[p.width*f-p.frontWindowWidth/2,p.width*f+p.frontWindowWidth/2,p.frontWindowSill,p.frontWindowSill+p.frontWindowHeight])];
 wall('front','x',0,0,p.width,p.eave,p.wall,frontHoles);gable('front',0,mats.plaster);
 wall('rear','x',p.depth-p.wall,0,p.width,p.eave,p.wall,[],mats.raw);gable('rear',p.depth-p.wall,mats.raw);
 wall('left','z',0,p.wall,p.depth-p.wall,p.eave,p.wall);
 const rh=[.275,.535].map(t=>[p.depth*t-.65,p.depth*t+.65,3.18,3.80]);
 wall('right','z',p.width-p.wall,p.wall,p.depth-p.wall,p.eave,p.wall,rh);
 box('slab',0,p.width,0,p.depth,-p.slab,0,mats.floor,'Dallage continu');
 // Existing vertical wall bands: indicative sections and positions, without invented beams.
 const col=.30,pro=.10;
 for(const x of [0,p.width/3,2*p.width/3,p.width-col]){box('columns',Math.min(x,p.width-col),Math.min(x,p.width-col)+col,p.depth-p.wall-pro,p.depth-p.wall,.01,p.eave,mats.concrete,'Raidisseur du pignon');}
 for(const z of [p.depth*.25,p.depth*.5,p.depth*.75]){
  box('columns',p.wall,p.wall+pro,z-col/2,z+col/2,.01,p.eave,mats.concrete,'Raidisseur latéral gauche');
  // A pilaster cannot cross an observed opening. Right ones shifted off the window axis.
  const rz=z-p.depth*.05;box('columns',p.width-p.wall-pro,p.width-p.wall,rz-col/2,rz+col/2,.01,p.eave,mats.concrete,'Raidisseur latéral droit');
 }
 for(const x of [ec-ew/2-col,ec+ew/2])box('columns',x,x+col,p.wall,p.wall+pro,.01,p.eave,mats.concrete,'Jambage renforcé de l’entrée');
 // Main enclosure: long side faces the hall; larger opening is in its end wall.
 const t=p.internalWall,x0=p.wall,x1=Math.min(p.blockWidth,ec-ew/2-.25),z0=p.blockStart,z1=p.blockEnd;
 const doorZ=z0+.85,smallWinZ=z1-1.2;
 wall('block','z',x1-t,z0,z1,p.blockHeight,t,[[doorZ-.475,doorZ+.475,0,p.mainDoorHeight],[smallWinZ-.31,smallWinZ+.31,1.15,1.78]],mats.plaster,'Côté avec accès et petite ouverture');
 wall('block','x',z1-t,x0,x1,p.blockHeight,t,[[(x0+x1)/2-.68,(x0+x1)/2+.68,1.10,2.38]],mats.plaster,'Face intérieure avec grande ouverture');
 wall('block','x',z0,x0,x1,p.blockHeight,t,[],mats.plaster,'Fermeture non visible du local principal',true);
 // Its left closure is the existing perimeter wall, not an extra duplicate wall.
 const sx=Math.min(p.smallWidth,x1-.4),sz0=p.wall,sz1=z0;
 wall('small','z',sx-t,sz0,sz1,p.smallHeight,t,[[sz0+.20,Math.min(sz1-.12,sz0+1.05),0,2.05]],mats.plaster,'Côté du petit local avec accès');
 // The common closure is already represented by the main enclosure: no duplicate partition.
 root.userData={parameters:p,units:'metres',source:'7 photographies fournies ; dimensions générales fournies ; dimensions secondaires estimées'};
 root.updateMatrixWorld(true);
 return {root,groups,materials:mats,parameters:p};
}

export function meshData(building){
 const result=[];building.root.updateMatrixWorld(true);
 building.root.traverse(m=>{if(!m.isMesh)return;const geo=m.geometry.clone();geo.applyMatrix4(m.matrixWorld);const pos=geo.attributes.position.array;result.push({name:m.name,component:m.userData.component,unseen:m.userData.unseen,positions:Array.from(pos),normals:Array.from(geo.attributes.normal?.array||[]),indices:geo.index?Array.from(geo.index.array):null,color:m.material.color.toArray()});geo.dispose();});return result;
}
