import {build} from 'esbuild';
import {readFile,writeFile,mkdir,cp,unlink} from 'node:fs/promises';
import {createBuilding,defaults,meshData} from './src/model.js';
import {makeGLB} from './src/export-glb.js';
import {planSVG} from './src/plan.js';
const base='src/photos/';
const names=[['c6578499-e27a-4115-93f8-deeebdff7ecf.jpeg','Façade d’entrée vue de l’extérieur'],['2cfb937f-88da-4a5c-9d42-b12563d6c71c.jpeg','Mur latéral avec deux ouvertures hautes'],['91ae6493-5792-4271-bc2c-e75437a487e2.jpeg','Petit local et côté du local principal'],['4f78e56f-4e05-4c7c-acbe-604d88dbbc60.jpeg','Volumes en retrait : accès et ouvertures existants'],['da06a334-e9b6-4828-acf3-f07d53fba252.jpeg','Pignon arrière et raidisseurs périphériques'],['876b45d1-4563-491d-8032-921f91ae037e.jpeg','Mur latéral contigu aux locaux'],['8f412748-5404-4b98-adfc-beb17537b8a8.jpeg','Vue intérieure vers l’entrée et la grande ouverture du local']];
const photos=[];for(const [file,caption]of names)photos.push({caption,src:'data:image/jpeg;base64,'+(await readFile(base+file)).toString('base64')});
const result=await build({entryPoints:['src/app.js'],bundle:true,minify:true,format:'iife',target:['es2020'],write:false,legalComments:'inline'});
const style=await readFile('src/style.css','utf8');let html=await readFile('src/shell.html','utf8');html=html.replace('__STYLE__',()=>style).replace('__STATE__',JSON.stringify({parameters:defaults})).replace('__PHOTOS__',JSON.stringify(photos)).replace('__APP__',()=>result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
for(const view of ['general','reverse','inside','block','plan','front','side']){const image=(await readFile('public/previews/'+view+'.png')).toString('base64');html=html.replaceAll('__PREVIEW_'+view.toUpperCase()+'__','data:image/png;base64,'+image);}
await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});for(const old of ['Edificio_24x18_Visor_3D.html','Edificio_estado_construido.glb','Edificio_planta_R02.svg'])await unlink('dist/'+old).catch(()=>{});await writeFile('dist/index.html',html);await writeFile('dist/Batiment_24x18_Visite_3D.html',html);
const building=createBuilding();const meshes=meshData(building);await writeFile('dist/Batiment_Etat_Existant.glb',new Uint8Array(makeGLB(meshes,defaults)));await writeFile('dist/Batiment_Plan_Architectural_FR.svg',planSVG(building));await writeFile('.model-geometry.json',JSON.stringify({parameters:defaults,meshes}));
console.log(JSON.stringify({htmlBytes:Buffer.byteLength(html),meshes:meshes.length,glbBytes:(await readFile('dist/Batiment_Etat_Existant.glb')).length,standalone:true,externalResources:false}));
