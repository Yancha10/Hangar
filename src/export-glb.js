// A standards-compliant binary glTF 2.0 export in metres, generated from the actual viewer meshes.
export function makeGLB(meshes,parameters){
 const buffers=[],views=[],accessors=[],materials=[],primitives=[],nodes=[];let length=0;
 function append(array,target){while(length%4){buffers.push(new Uint8Array(1));length++;}const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);const id=views.length;views.push({buffer:0,byteOffset:length,byteLength:bytes.byteLength,target});buffers.push(bytes);length+=bytes.byteLength;return id;}
 for(const mesh of meshes){
  const pos=new Float32Array(mesh.positions),normal=new Float32Array(mesh.normals);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<pos.length;i++){const j=i%3;min[j]=Math.min(min[j],pos[i]);max[j]=Math.max(max[j],pos[i]);}
  const a=accessors.length;accessors.push({bufferView:append(pos,34962),componentType:5126,count:pos.length/3,type:'VEC3',min,max});const attrs={POSITION:a};
  if(normal.length){attrs.NORMAL=accessors.length;accessors.push({bufferView:append(normal,34962),componentType:5126,count:normal.length/3,type:'VEC3'});}
  const primitive={attributes:attrs,material:materials.length,mode:4};
  if(mesh.indices){const idx=new Uint32Array(mesh.indices);primitive.indices=accessors.length;accessors.push({bufferView:append(idx,34963),componentType:5125,count:idx.length,type:'SCALAR'});}
  materials.push({name:mesh.component,pbrMetallicRoughness:{baseColorFactor:[...mesh.color,1],metallicFactor:0,roughnessFactor:.97},doubleSided:false});
  const index=primitives.length;primitives.push({name:mesh.name,primitives:[primitive]});nodes.push({name:mesh.name,mesh:index,extras:{component:mesh.component,unobservedClosure:mesh.unseen}});
 }
 const doc={asset:{version:'2.0',generator:'Bâtiment 24x18 - reconstruction photographique'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes:primitives,materials,buffers:[{byteLength:length}],bufferViews:views,accessors,extras:{units:'metres',parameters,warning:'Dimensions secondaires estimées à partir des photographies, sans relevé complet sur place'}};
 let json=new TextEncoder().encode(JSON.stringify(doc));const jl=(json.length+3)&~3,bl=(length+3)&~3;const out=new ArrayBuffer(12+8+jl+8+bl),dv=new DataView(out);dv.setUint32(0,0x46546C67,true);dv.setUint32(4,2,true);dv.setUint32(8,out.byteLength,true);dv.setUint32(12,jl,true);dv.setUint32(16,0x4E4F534A,true);new Uint8Array(out,20,jl).fill(32);new Uint8Array(out,20,json.length).set(json);dv.setUint32(20+jl,bl,true);dv.setUint32(24+jl,0x004E4942,true);let offset=28+jl;for(const bytes of buffers){new Uint8Array(out,offset,bytes.length).set(bytes);offset+=bytes.length;}return out;
}
