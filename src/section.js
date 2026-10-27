import * as THREE from 'three';
// Convex cross-sections of the actual box / gable meshes, with no invented infill across openings.
export function sectionCaps(root,height,visibility){
 const group=new THREE.Group();group.name='Surfaces de coupe';root.updateMatrixWorld(true);
 root.traverse(m=>{if(!m.isMesh||!visibility[m.userData.component]||m.userData.component==='slab')return;const pos=m.geometry.attributes.position,idx=m.geometry.index,n=(idx?idx.count:pos.count)/3;const points=[];
  for(let i=0;i<n;i++){const v=[];for(let k=0;k<3;k++)v.push(new THREE.Vector3().fromBufferAttribute(pos,idx?idx.getX(i*3+k):i*3+k).applyMatrix4(m.matrixWorld));for(let k=0;k<3;k++){const a=v[k],b=v[(k+1)%3];if((a.y<height&&b.y>height)||(a.y>height&&b.y<height)){const t=(height-a.y)/(b.y-a.y);points.push([a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t]);}}}
  const pts=[...new Map(points.map(v=>[v.map(x=>x.toFixed(6)).join(','),v])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(pts.length<3)return;const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const low=[],up=[];for(const q of pts){while(low.length>1&&cross(low.at(-2),low.at(-1),q)<=1e-8)low.pop();low.push(q);}for(const q of pts.slice().reverse()){while(up.length>1&&cross(up.at(-2),up.at(-1),q)<=1e-8)up.pop();up.push(q);}low.pop();up.pop();const hull=low.concat(up),out=[];
  for(let i=1;i<hull.length-1;i++)for(const q of [hull[0],hull[i+1],hull[i]])out.push(q[0],height+.001,q[1]);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(out,3));geometry.computeVertexNormals();const cap=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x9b8d76,roughness:1}));cap.userData={component:m.userData.component};group.add(cap);
 });return group;
}
