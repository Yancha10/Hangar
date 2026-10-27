// Optional preview generator. Pass a canvas implementation through CANVAS_MODULE.
// The shipped previews are renders of the same metric model as the live viewer.
import * as THREE from 'three';
import {createBuilding} from '../src/model.js';
import {CanvasRenderer} from '../src/canvas-renderer.js';
import {drawPlanCanvas} from '../src/plan.js';
import {mkdir,writeFile} from 'node:fs/promises';
const {createCanvas,GlobalFonts}=await import(process.env.CANVAS_MODULE||'@napi-rs/canvas');
if(process.env.PREVIEW_FONT)GlobalFonts.registerFromPath(process.env.PREVIEW_FONT,'Arial');
await mkdir('public/previews',{recursive:true});
const building=createBuilding(),scene=new THREE.Scene();scene.background=new THREE.Color(0xeeece3);scene.add(building.root);
const renderer=new CanvasRenderer(()=>createCanvas(1,1));renderer.setSize(720,460);
const cameras={general:[[25.2,22.8,27.6],[0,1,0]],reverse:[[-21.6,19.2,-26.4],[0,1,0]],inside:[[3.24,2.25,-8.16],[-1.8,1.7,8.4]],block:[[3.3,6.4,2.65],[-5.64,1.3,8.78]],front:[[0,2.4,55],[0,2.4,12]],side:[[55,2.2,0],[9,2.2,0]]};
for(const [view,[pos,target]]of Object.entries(cameras)){
 const ortho=['front','side'].includes(view),aspect=720/460,span=view==='side'?28:22;
 const camera=ortho?new THREE.OrthographicCamera(-span/2,span/2,span/aspect/2,-span/aspect/2,.05,250):new THREE.PerspectiveCamera(42,aspect,.05,250);
 camera.position.set(...pos);camera.lookAt(new THREE.Vector3(...target));renderer.render(scene,camera);await writeFile('public/previews/'+view+'.png',renderer.domElement.toBuffer('image/png'));
}
const plan=createCanvas(650,800);drawPlanCanvas(plan,building,{dimensions:false,labels:false});await writeFile('public/previews/plan.png',plan.toBuffer('image/png'));
console.log('Sept vues calculées à partir de la géométrie existante.');
