import * as THREE from 'three';
// Z-buffered software rendering of the exact same metric scene. Used when WebGL is unavailable.
export class CanvasRenderer {
 constructor(factory=()=>document.createElement('canvas')){this.domElement=factory();this.ctx=this.domElement.getContext('2d');this.surface=factory();this.sctx=this.surface.getContext('2d');this.shadowMap={};this.pixelRatio=1;this.width=1;this.height=1;}
 setPixelRatio(){this.pixelRatio=1;}
 setClearColor(color){this.clear=new THREE.Color(color);}
 setSize(w,h){this.width=Math.round(w);this.height=Math.round(h);this.domElement.width=this.width;this.domElement.height=this.height;this.surface.width=this.width;this.surface.height=this.height;if(this.domElement.style){this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';}this.image=this.sctx.createImageData(this.width,this.height);this.depth=new Float32Array(this.width*this.height);}
 render(scene,camera){
  if(!this.image)return;const ctx=this.ctx,w=this.width,h=this.height,rgba=this.image.data,depth=this.depth;rgba.fill(0);depth.fill(Infinity);ctx.clearRect(0,0,w,h);ctx.fillStyle='#'+(scene.background||this.clear||new THREE.Color(0xeeece3)).getHexString();ctx.fillRect(0,0,w,h);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const view=camera.matrixWorldInverse,proj=camera.projectionMatrix,lines=[],triangles=[];const isOrtho=camera.isOrthographicCamera;
  const screen=v=>{const p=v.clone().applyMatrix4(proj);return {x:(p.x*.5+.5)*w,y:(-.5*p.y+.5)*h,z:-v.z};};
  function clipPoly(poly,test){const result=[];if(!poly.length)return result;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=test(a),db=test(b);if(da>=0)result.push(a);if((da>=0)!==(db>=0))result.push(a.clone().lerp(b,da/(da-db)));}return result;}
  const light=new THREE.Vector3(-.36,.82,.43).normalize();
  const occluders=[];scene.traverseVisible(m=>{if(m.isMesh&&m.userData.component&&m.userData.component!=='slab'){const b=new THREE.Box3().setFromObject(m);if(b.max.y-b.min.y>.4)occluders.push({mesh:m,b});}});
  // A gentle contact shadow uses world-space distances to the existing walls.
  // It changes the finish only; the metric meshes and openings remain untouched.
  const ambient=(v,normal,mesh)=>{let a=0;for(const o of occluders){if(o.mesh===mesh||v.y>o.b.max.y+.12||v.y<o.b.min.y-.12)continue;const dx=Math.max(o.b.min.x-v.x,0,v.x-o.b.max.x),dz=Math.max(o.b.min.z-v.z,0,v.z-o.b.max.z),d=Math.hypot(dx,dz);if(d<1.5)a+=Math.exp(-d*2.5)*(normal.y>.5?.20:.055);}return 1-Math.min(.34,a);};
  scene.traverseVisible(m=>{
   if(m.isMesh){if(m.geometry.type==='PlaneGeometry')return;const g=m.geometry,pos=g.attributes.position,idx=g.index,mat=Array.isArray(m.material)?m.material[0]:m.material;if(!pos||!mat)return;const nTri=(idx?idx.count:pos.count)/3;
    for(let j=0;j<nTri;j++){let verts=[];for(let k=0;k<3;k++){const i=idx?idx.getX(j*3+k):j*3+k;verts.push(new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld));}
     const normal=new THREE.Vector3().crossVectors(verts[1].clone().sub(verts[0]),verts[2].clone().sub(verts[0])).normalize(),center=verts[0].clone().add(verts[1]).add(verts[2]).multiplyScalar(1/3);if(normal.dot(camera.position.clone().sub(center))<=0&&mat.side!==THREE.DoubleSide)continue;
     if(mat.clippingPlanes?.length)for(const p of mat.clippingPlanes)verts=clipPoly(verts,v=>p.distanceToPoint(v));if(verts.length<3)continue;const vv=clipPoly(verts.map(v=>v.clone().applyMatrix4(view)),v=>-camera.near-v.z);if(vv.length<3)continue;const pp=vv.map(v=>({...screen(v),ao:ambient(v.clone().applyMatrix4(camera.matrixWorld),normal,m)}));if(pp.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))continue;
     const shade=.64+Math.max(0,normal.dot(light))*.35+(normal.y>0?.05:0),color=mat.color.clone().multiplyScalar(shade),c=color.getRGB(new THREE.Color(),THREE.SRGBColorSpace),rgb=[Math.round(c.r*255),Math.round(c.g*255),Math.round(c.b*255)];for(let k=1;k<pp.length-1;k++)triangles.push({p:[pp[0],pp[k],pp[k+1]],rgb});
    }
   }else if(m.isLine){const g=m.geometry,pos=g.attributes.position;if(!pos)return;const step=m.isLineSegments?2:1;for(let i=0;i<pos.count-1;i+=step){const a=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld),b=new THREE.Vector3().fromBufferAttribute(pos,i+1).applyMatrix4(m.matrixWorld);if(m.material.clippingPlanes?.some(p=>p.distanceToPoint(a)<0||p.distanceToPoint(b)<0))continue;const va=a.applyMatrix4(view),vb=b.applyMatrix4(view);if(va.z>-camera.near||vb.z>-camera.near)continue;const col=m.material.color||new THREE.Color(0x9ba998),c=col.getRGB(new THREE.Color(),THREE.SRGBColorSpace);lines.push({p:[screen(va),screen(vb)],rgb:[c.r*255,c.g*255,c.b*255],opacity:m.material.opacity??1,grid:m.type==='GridHelper'});}}
  });
  // The background grid is drawn beneath the opaque metric geometry.
  ctx.lineWidth=.55;for(const l of lines){if(!l.grid)continue;ctx.globalAlpha=l.opacity*.60;ctx.strokeStyle=`rgb(${l.rgb.join(',')})`;ctx.beginPath();ctx.moveTo(l.p[0].x,l.p[0].y);ctx.lineTo(l.p[1].x,l.p[1].y);ctx.stroke();}ctx.globalAlpha=1;
  ctx.save();ctx.shadowColor='#29241b55';ctx.shadowBlur=16;ctx.shadowOffsetX=7;ctx.shadowOffsetY=11;scene.traverseVisible(m=>{if(!m.isMesh||m.userData.component!=='slab')return;const b=new THREE.Box3().setFromObject(m),corners=[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z]].map(([x,z])=>screen(new THREE.Vector3(x,b.min.y-.005,z).applyMatrix4(view)));ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='#6e655833';ctx.fill();});ctx.restore();for(const {p,rgb}of triangles)rasterTriangle(p[0],p[1],p[2],rgb);
  for(const l of lines)if(!l.grid)rasterLine(l);
  this.sctx.putImageData(this.image,0,0);ctx.drawImage(this.surface,0,0);
  function rasterTriangle(a,b,c,rgb){
   const area=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(area)<1e-7)return;const inv=1/area,minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(w-1,Math.ceil(Math.max(a.x,b.x,c.x))),minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(h-1,Math.ceil(Math.max(a.y,b.y,c.y)));if(minX>maxX||minY>maxY)return;
   const ax=(b.y-c.y)*inv,ay=(c.x-b.x)*inv,bx=(c.y-a.y)*inv,by=(a.x-c.x)*inv;const ia=1/a.z,ib=1/b.z,ic=1/c.z;
   for(let y=minY;y<=maxY;y++){let u=ax*(minX+.5-c.x)+ay*(y+.5-c.y),v=bx*(minX+.5-c.x)+by*(y+.5-c.y);for(let x=minX;x<=maxX;x++,u+=ax,v+=bx){const z0=1-u-v;if(u<-.00001||v<-.00001||z0<-.00001)continue;const z=isOrtho?u*a.z+v*b.z+z0*c.z:1/(u*ia+v*ib+z0*ic),at=y*w+x;if(z<depth[at]){depth[at]=z;const q=at*4;const ao=isOrtho?u*a.ao+v*b.ao+z0*c.ao:(u*a.ao*ia+v*b.ao*ib+z0*c.ao*ic)*z;rgba[q]=rgb[0]*ao;rgba[q+1]=rgb[1]*ao;rgba[q+2]=rgb[2]*ao;rgba[q+3]=255;}}}
  }
  function rasterLine(l){const [a,b]=l.p,len=Math.ceil(Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y)));if(len>12000)return;for(let i=0;i<=len;i++){const t=len?i/len:0,x=Math.round(a.x+(b.x-a.x)*t),y=Math.round(a.y+(b.y-a.y)*t);if(x<0||x>=w||y<0||y>=h)continue;const z=isOrtho?a.z+(b.z-a.z)*t:1/((1-t)/a.z+t/b.z),at=y*w+x;if(z>depth[at]+.025)continue;const q=at*4,op=l.opacity;rgba[q]=rgba[q]*(1-op)+l.rgb[0]*op;rgba[q+1]=rgba[q+1]*(1-op)+l.rgb[1]*op;rgba[q+2]=rgba[q+2]*(1-op)+l.rgb[2]*op;rgba[q+3]=255;}}
 }
}
