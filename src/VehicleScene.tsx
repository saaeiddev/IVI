import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as THREE from 'three';
import { useSim, type Panel, type View } from './simulation';
import { translate } from './translations';

const ASSET=`${import.meta.env.BASE_URL}assets/vehicle.glb`;
const wheelNodes=['WheelFrontL','WheelFrontR','WheelRearL','WheelRearR'];
type Controls=React.ElementRef<typeof OrbitControls>;
interface SceneProps { onReady:()=>void; onSelect:(panel:Panel)=>void; resetNonce:number }
interface ModelProps { onReady:()=>void; onSelect:(panel:Panel)=>void }

function StudioEnvironment(){
 const {gl,scene}=useThree();
 useEffect(()=>{
  const pmrem=new THREE.PMREMGenerator(gl);
  const studio=new RoomEnvironment();
  const texture=pmrem.fromScene(studio,.03).texture;
  const old=scene.environment;
  scene.environment=texture;
  studio.dispose();
  pmrem.dispose();
  return()=>{scene.environment=old;texture.dispose()};
 },[gl,scene]);
 return <><ambientLight intensity={1.2}/><hemisphereLight args={['#dbefff','#0a1020',1.35]}/>
 <directionalLight color="#ffffff" position={[5,8,6]} intensity={4.6} castShadow shadow-mapSize={[1024,1024]} shadow-bias={-.00018}/>
 <directionalLight color="#57adff" position={[-6,5,-4]} intensity={3.6}/>
 <directionalLight color="#d1e9ff" position={[0,7,-7]} intensity={2.8}/></>;
}
function CameraRig({view,wheel,resetNonce}:{view:View;wheel:number;resetNonce:number}){
 const {camera}=useThree();
 const controls=useRef<Controls>(null);
 const moving=useRef(false);
 const destination=useRef({position:new THREE.Vector3(6,3.3,7.2),target:new THREE.Vector3(0,.85,0)});
 useEffect(()=>{
  const poses:Record<View,{pos:number[];target:number[]}> = {
   exterior:{pos:[6,3.3,7.2],target:[0,.85,0]},
   interior:{pos:[.15,1.75,-.13],target:[0,1.25,2.6]},
   engine:{pos:[3.35,3.7,4.4],target:[0,1.0,1.65]},
   brakes:{pos:[wheel%2===0?3.1:-3.1,1.65,wheel<2?2.75:-2.75],target:[wheel%2===0?1.07:-1.07,.48,wheel<2?1.52:-1.53]}
  };
  const pose=poses[view];
  destination.current={position:new THREE.Vector3(...pose.pos as [number,number,number]),target:new THREE.Vector3(...pose.target as [number,number,number])};
  moving.current=true;
 },[view,wheel,resetNonce]);
 useFrame((_,delta)=>{
  if(!moving.current||!controls.current)return;
  const factor=1-Math.exp(-Math.min(delta,.05)*4.2);
  camera.position.lerp(destination.current.position,factor);
  controls.current.target.lerp(destination.current.target,factor);
  controls.current.update();
  if(camera.position.distanceTo(destination.current.position)<.025&&controls.current.target.distanceTo(destination.current.target)<.025)moving.current=false;
 });
 return <OrbitControls ref={controls} makeDefault target={[0,.85,0]} enableDamping dampingFactor={.075}
  minDistance={view==='interior'?.25:1.2} maxDistance={15} maxPolarAngle={Math.PI/2.02}
  enablePan={view!=='interior'} rotateSpeed={.72} zoomSpeed={.8}
  onStart={()=>{moving.current=false}}/>;
}
function findPanel(name:string):Panel|null {
 if(/Wheel.*Brake|BrakeDisc|BrakePad/i.test(name))return 'brakes';
 if(/Wheel|Tire|Rim/i.test(name))return 'tires';
 if(/Engine|Hood/i.test(name))return 'engine';
 if(/Door|Hatch|RearPanels/i.test(name))return 'doors';
 if(/Headlight|Taillight|Turnsignal/i.test(name))return 'lighting';
 if(/Steering|Axles/i.test(name))return 'suspension';
 return null;
}
function CarModel({onReady,onSelect}:ModelProps){
 const {scene}=useGLTF(ASSET);
 const readyCallback=useRef(onReady);
 readyCallback.current=onReady;
 const initialTransforms=useMemo(()=>{
  const map=new Map<string,{position:THREE.Vector3;rotation:THREE.Euler}>();
  scene.traverse(obj=>map.set(obj.uuid,{position:obj.position.clone(),rotation:obj.rotation.clone()}));
  return map;
 },[scene]);
 const doors=useSim(s=>s.doors);
 const lights=useSim(s=>s.lights);
 const padWear=useSim(s=>s.padWear);
 const showHotspots=useSim(s=>s.showHotspots);
 const language=useSim(s=>s.language);
 const setWheel=useSim(s=>s.setWheel);
 const setView=useSim(s=>s.setView);
 const actualLights=useRef<Map<string,THREE.Material[]>>(new Map());
 useEffect(()=>{
  // Clone only affected materials. Preserve authored PBR materials, UVs and texture maps.
  const map=new Map<string,THREE.Material[]>();
  scene.traverse(object=>{
   if(!(object instanceof THREE.Mesh))return;
   const name=object.name;
   if(!/BodyHeadlights|BodyTaillights$|BodyTurnsignalsRear|BrakePad/i.test(name))return;
   const source=Array.isArray(object.material)?object.material:[object.material];
   const cloned=source.map(mat=>mat.clone());
   object.material=Array.isArray(object.material)?cloned:cloned[0];
   map.set(name,cloned);
  });
  actualLights.current=map;
  readyCallback.current();
  return()=>{clonedMaterials(map).forEach(m=>m.dispose())};
 },[scene]);
 useEffect(()=>{
  actualLights.current.forEach((mats,name)=>{
   const signal=lights.hazards||lights.leftSignal||lights.rightSignal;
   const on=/Headlight/.test(name)?lights.headlights:/Taillight/.test(name)?useSim.getState().brake>.05:/Turnsignal/.test(name)?signal:false;
   mats.forEach(m=>{
    if(!('emissive' in m))return;
    const mat=m as THREE.MeshStandardMaterial;
    mat.emissive.set(/Turnsignal/.test(name)?'#ff9c39':/Headlight/.test(name)?'#deefff':'#ff294d');
    mat.emissiveIntensity=on?2.8:.06;
    mat.needsUpdate=true;
   });
  });
 },[lights,scene]);
 useEffect(()=>{
  actualLights.current.forEach((mats,name)=>{if(!/BrakePad/.test(name))return;mats.forEach(m=>{if('emissive' in m){const material=m as THREE.MeshStandardMaterial;material.emissive.set('#fa603d');material.emissiveIntensity=padWear>=80?.75:0;}})});
 },[padWear]);
 useFrame((state,delta)=>{
  const s=useSim.getState();
  const smooth=(obj:THREE.Object3D,axis:'x'|'y'|'z',change:number,speed=6)=>{
   const original=initialTransforms.get(obj.uuid);
   if(!original)return;
   obj.rotation[axis]=THREE.MathUtils.damp(obj.rotation[axis],original.rotation[axis]+change,speed,delta);
  };
  const animatePivot=(name:string,axis:'x'|'y'|'z',angle:number)=>{const node=scene.getObjectByName(name);if(node)smooth(node,axis,angle)};
  animatePivot('BodyDoorLColor1','z',doors.left?.86:0);
  animatePivot('BodyDoorRColor1','z',doors.right?-.86:0);
  animatePivot('BodyHood','x',doors.hood?-.87:0);
  animatePivot('BodyRearPanelsColor1','x',doors.hatch?.91:0);
  animatePivot('InteriorSteeringCylinder','z',s.steering*.38);
  wheelNodes.forEach((name,i)=>{
   const group=scene.getObjectByName(name);
   if(!group)return;
   if(i<2)smooth(group,'z',s.steering*.17);
   group.children.forEach(child=>{
    const original=initialTransforms.get(child.uuid);
    if(!original)return;
    if(/BrakePad/i.test(child.name)){
     const signed=i%2===0?1:-1;
     child.position.x=THREE.MathUtils.damp(child.position.x,original.position.x+signed*s.brake*.009,10,delta);
    }else{
     child.rotation.x=original.rotation.x+s.wheelAngle;
    }
   });
  });
  // Model-backed material illumination, including the blinking indicator cycle.
  actualLights.current.forEach((mats,name)=>{
   if(!/Taillight|Turnsignal/i.test(name))return;
   const pulse=Math.sin(state.clock.elapsedTime*8)>0;
   const on=/Taillight/.test(name)?s.brake>.04:/Turnsignal/.test(name)?pulse&&(s.lights.hazards||s.lights.leftSignal||s.lights.rightSignal):false;
   mats.forEach(m=>{if('emissiveIntensity' in m)(m as THREE.MeshStandardMaterial).emissiveIntensity=on?3.5:.04;});
  });
 });
 const onCarClick=(event:ThreeEvent<MouseEvent>)=>{
  if(event.delta>4)return; // Ignore orbital drags.
  let node:THREE.Object3D|null=event.object;
  let panel:Panel|null=null;
  while(node&&node!==scene){panel=findPanel(node.name);if(panel)break;node=node.parent;}
  if(!panel)return;
  event.stopPropagation();
  if(panel==='brakes'||panel==='tires'){
   const name=node?.name??'';
   const match=name.match(/Wheel(Front|Rear)(L|R)/i);
   const idx=match?(match[1]==='Front'?0:2)+(match[2]==='L'?0:1):0;
   setWheel(idx);onSelect(panel);
  } else {onSelect(panel);if(panel==='engine')setView('engine');}
 };
 const hotspot=(label:string,position:[number,number,number],panel:Panel,wheel?:number)=>
  <Html key={label} position={position} center distanceFactor={8} zIndexRange={[20,0]} style={{pointerEvents:'auto'}}>
   <button type="button" className="model-hotspot" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();if(wheel!==undefined){setWheel(wheel);onSelect(panel);}else{onSelect(panel);if(panel==='engine')setView('engine');}}}>
    <span className="hotspot-pin"/> {translate(language,label)}
   </button>
  </Html>;
 // The source GLB already rotates its root BodyUnderside node by -90 degrees
 // around X to turn its authored Z-up geometry into glTF Y-up coordinates.
 // Never rotate the entire imported scene again: that would stand the car
 // on its nose and push it through the showroom floor.
 return <group onClick={onCarClick}>
  <primitive object={scene} dispose={null}/>
  {showHotspots&&<group rotation={[-Math.PI/2,0,0]}>
   {hotspot('engine',[0,-1.75,1.15],'engine')}
   {hotspot('frontLeft',[1.1,-1.58,.71],'brakes',0)}
   {hotspot('frontRight',[-1.1,-1.58,.71],'brakes',1)}
   {hotspot('rearLeft',[1.1,1.44,.71],'tires',2)}
   {hotspot('battery',[-.65,-.55,1.42],'battery')}
   {hotspot('doors',[1.3,-.4,1.38],'doors')}
  </group>}
 </group>;
}
function clonedMaterials(map:Map<string,THREE.Material[]>) {return Array.from(map.values()).flat();}
function Ground(){return <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.045,0]}>
 <planeGeometry args={[28,28]}/><meshStandardMaterial color="#080e18" roughness={1} metalness={0}/>
 </mesh>}
function Loader(){const {progress}=useProgress();const language=useSim(s=>s.language);return <Html center><div className="scene-loader">
 <div className="loader-ring"/><strong>{translate(language,'loadTitle')}</strong><span>{Math.round(progress)}%</span></div></Html>}
class ModelBoundary extends React.Component<{children:React.ReactNode;onError:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){this.props.onError();}
 render(){return this.state.failed?null:this.props.children;}
}
export default function VehicleScene({onReady,onSelect,resetNonce}:SceneProps){
 const view=useSim(s=>s.view),wheel=useSim(s=>s.wheel),language=useSim(s=>s.language),graphics=useSim(s=>s.graphics);
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[supported,setSupported]=useState(true);
 useEffect(()=>{try{const canvas=document.createElement('canvas');setSupported(Boolean(canvas.getContext('webgl2')||canvas.getContext('webgl')))}catch{setSupported(false)}},[]);
 const quality=graphics==='high'?2:graphics==='balanced'?1:typeof window!=='undefined'&&window.innerWidth<700?1:1.6;
 return <div className="vehicle-canvas">
  {supported&&!error?<Canvas shadows={graphics!=='balanced'} dpr={[1,quality]} camera={{position:[6,3.3,7.2],fov:39,near:.05,far:130}} gl={{alpha:true,antialias:graphics!=='balanced',powerPreference:'high-performance'}} frameloop="always">
   <StudioEnvironment/><Ground/><CameraRig view={view} wheel={wheel} resetNonce={resetNonce}/>
   <Suspense fallback={<Loader/>}>
    <ModelBoundary onError={()=>setError(true)}><CarModel onReady={()=>{setReady(true);onReady()}} onSelect={onSelect}/></ModelBoundary>
   </Suspense>
  </Canvas>:<div className="scene-error" role="alert"><strong>{translate(language,supported?'loadError':'webglError')}</strong>
   {supported&&<button className="button-main" type="button" onClick={()=>window.location.reload()}>{translate(language,'retry')}</button>}</div>}
  {!ready&&!error&&supported&&<div className="viewer-wait">{translate(language,'loadDesc')}</div>}
  <div className="viewer-vignette" aria-hidden="true"/>
 </div>;
}
